"""
WebSocket endpoint for real-time training progress.
Delegates to ModelTrainer from ml_engine for comprehensive model training.
"""

from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
import logging
import uuid
import sys
import os

from app.api.data import router
from app.core.model_store import model_store

logger = logging.getLogger(__name__)


@router.websocket("/ws/train")
async def ws_train(websocket: WebSocket, session_id: str = "default", api_key: str = ""):
    """
    WebSocket endpoint for model training with real-time progress.
    Now requires an api_key either as a query param or initially sent.
    """
    await websocket.accept()
    
    # 1. Verify API Key
    from app.config import settings
    if api_key != settings.INTELLIML_API_KEY:
        logger.warning(f"Unauthorized WebSocket attempt for session {session_id}")
        await websocket.send_json({"type": "error", "message": "Unauthorized: Invalid API Key"})
        await websocket.close()
        return

    logger.info(f"WebSocket training session '{session_id}' authorized")

    # Queue for thread→async progress messages
    progress_queue = asyncio.Queue()

    try:
        raw = await websocket.receive_text()
        request = json.loads(raw)
        target_column = request.get("target_column")
        test_size = request.get("test_size", 0.2)
        cv_folds = request.get("cv_folds", 3)
        enable_tuning = request.get("enable_tuning", False)

        if not target_column:
            await websocket.send_json({"type": "error", "message": "target_column is required"})
            await websocket.close()
            return

        from app.api.data import get_current_dataset
        state = get_current_dataset(session_id)
        df = state.get("df")

        if df is None:
            await websocket.send_json({"type": "error", "message": "No dataset loaded for this session."})
            await websocket.close()
            return

        if target_column not in df.columns:
            await websocket.send_json({"type": "error", "message": f"Column '{target_column}' not found"})
            await websocket.close()
            return

        # ---- Setup ModelTrainer ----
        ml_engine_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            'ml_engine'
        )
        if os.path.dirname(ml_engine_path) not in sys.path:
            sys.path.insert(0, os.path.dirname(ml_engine_path))

        try:
            from ml_engine.engines.model_trainer import ModelTrainer
        except ImportError as ie:
            logger.error(f"Cannot import ModelTrainer: {ie}")
            await websocket.send_json({"type": "error", "message": f"ML Engine not available: {ie}"})
            await websocket.close()
            return

        trainer = ModelTrainer()

        # Progress callback (runs in worker thread → puts into async queue)
        loop = asyncio.get_event_loop()

        def on_progress(step: int, total_steps: int, message: str):
            loop.call_soon_threadsafe(
                progress_queue.put_nowait,
                {"type": "progress", "step": step, "total_steps": total_steps,
                 "message": message, "percent": int((step / total_steps) * 100)}
            )

        # ---- Run training in a thread (it uses ThreadPool internally too) ----
        import concurrent.futures

        async def drain_progress():
            """Send queued progress messages to the client"""
            while True:
                try:
                    msg = progress_queue.get_nowait()
                    await websocket.send_json(msg)
                except asyncio.QueueEmpty:
                    break

        # Start training in background thread
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = loop.run_in_executor(pool, lambda: trainer.train_all(
                df, 
                target_column, 
                test_size=test_size,
                cv_folds=cv_folds,
                enable_tuning=enable_tuning,
                on_progress=on_progress
            ))

            # Poll for progress while training runs
            while not future.done():
                await drain_progress()
                await asyncio.sleep(0.1)

            # Drain any remaining progress
            await drain_progress()

            # Get result
            engine_results = future.result()

        results = engine_results['results']
        best_model = engine_results['best_model']
        problem_type = engine_results['problem_type']
        feature_names = engine_results.get('feature_names', [])

        # ---- Persist models ----
        job_id = str(uuid.uuid4())

        # Persist best model
        best_server = trainer.get_best_model_server()
        if best_server and best_server.trained_model:
            try:
                # Take up to 100 rows of background data for SHAP
                x_sample = getattr(trainer, 'X_train', None)
                if x_sample is not None and hasattr(x_sample, 'shape') and x_sample.shape[0] > 0:
                    x_sample = x_sample[:min(100, x_sample.shape[0])]
                
                model_store.save_best_model(job_id, best_model["model_name"], best_server.trained_model, {
                    "target_column": target_column,
                    "feature_names": feature_names,
                    "model_type": problem_type,
                    "metrics": best_model.get("metrics", {}),
                    "score": best_model.get("test_score", 0),
                }, X_sample=x_sample)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to save best model: {e}")

        # Persist all individual models
        all_models = trainer.get_trained_models()
        for model_name_key, model_obj in all_models.items():
            try:
                matching = [r for r in results if r["model_name"] == model_name_key]
                meta = {
                    "target_column": target_column,
                    "feature_names": feature_names,
                    "model_type": problem_type,
                }
                if matching:
                    meta["metrics"] = matching[0]["metrics"]
                    meta["score"] = matching[0]["test_score"]
                model_store.save_model(job_id, model_name_key, model_obj, meta)
            except Exception:
                pass

        # ---- Send final result ----
        results.sort(key=lambda x: x["test_score"], reverse=True)
        
        # ---- Register job in memory cache for ExplanationService ----
        import time
        from app.services.ml_service import ml_service
        ml_service.jobs[job_id] = {
            "id": job_id,
            "target_column": target_column,
            "status": "completed",
            "results": {
                "results": results,
                "best_model": results[0] if results else None,
                "feature_names": feature_names,
            },
            "trainer": trainer,
            "created_at": time.time()
        }

        await websocket.send_json({
            "type": "result",
            "data": {
                "job_id": job_id,
                "target_column": target_column,
                "results": results,
                "best_model": results[0] if results else None,
                "model_type": problem_type,
                "feature_names": feature_names,
            }
        })

    except WebSocketDisconnect:
        logger.info("WebSocket training connection closed by client")
    except json.JSONDecodeError:
        await websocket.send_json({"type": "error", "message": "Invalid JSON"})
    except Exception as e:
        logger.error(f"WebSocket training error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
