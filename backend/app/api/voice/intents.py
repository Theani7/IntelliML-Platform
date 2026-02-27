"""
Supported Intents Endpoint
Returns list of supported voice intents and example commands.
"""

from app.api.voice import router


@router.get("/supported-intents")
async def get_supported_intents():
    """
    Get list of supported voice intents and example commands

    Returns:
        {
            "intents": [...],
            "examples": {...}
        }
    """
    return {
        "intents": [
            {
                "name": "ANALYZE_DATA",
                "description": "Explore and analyze uploaded data",
                "examples": [
                    "analyze my data",
                    "show me statistics",
                    "explore the dataset"
                ]
            },
            {
                "name": "TRAIN_MODEL",
                "description": "Train a machine learning model",
                "examples": [
                    "train a model to predict sales",
                    "build a model for price prediction",
                    "create a random forest model"
                ]
            },
            {
                "name": "EXPLAIN_MODEL",
                "description": "Explain model predictions and features",
                "examples": [
                    "explain the model",
                    "why did it predict that",
                    "show feature importance"
                ]
            },
            {
                "name": "PREDICT",
                "description": "Make predictions with trained model",
                "examples": [
                    "make a prediction",
                    "predict the outcome",
                    "what will happen"
                ]
            },
            {
                "name": "VIEW_RESULTS",
                "description": "View previous results and models",
                "examples": [
                    "show results",
                    "what are the results",
                    "display outcomes"
                ]
            },
            {
                "name": "COMPARE_MODELS",
                "description": "Compare different models",
                "examples": [
                    "compare models",
                    "which model is best",
                    "show model comparison"
                ]
            },
            {
                "name": "UPLOAD_DATA",
                "description": "Upload or load dataset",
                "examples": [
                    "upload data",
                    "load dataset",
                    "import file"
                ]
            },
            {
                "name": "HELP",
                "description": "Get help and guidance",
                "examples": [
                    "help",
                    "what can you do",
                    "how do I use this"
                ]
            }
        ],
        "supported_formats": [".webm", ".wav", ".mp3", ".m4a", ".ogg", ".flac"],
        "max_audio_size_mb": 25
    }
