# IntelliML Platform - Project Instructions

## Overview
IntelliML is a voice-controlled AutoML and analytics platform. It allows users to upload datasets, perform automated EDA, clean data, and train machine learning models using natural language or a visual interface.

## Tech Stack
- **Frontend:** Next.js (TypeScript), TailwindCSS, Lucide Icons.
- **Backend:** FastAPI (Python 3.9+), SQLModel (SQLite), Pandas, Scikit-learn.
- **AI/LLM:** Groq API (Llama 3 for NLU, Whisper for Voice-to-Text).
- **Styling:** Custom "Glassmorphism" UI with a warm/earthy color palette.

## Architecture & Data Flow
### 1. Hybrid Storage Strategy
- **Relational (SQLite):** Stores `User` accounts and session metadata.
- **In-Memory (`DataService`):** Stores active `DataFrames`. All data operations happen in RAM for speed.
- **Filesystem (`MODEL_CACHE_DIR`):** Stores trained `.joblib` models and their JSON metadata.

### 2. Frontend-Backend Communication
- **Proxy Pattern:** All frontend requests go through `frontend/app/api/proxy/[...path]/route.ts`.
- **Streaming:** The proxy uses `duplex: 'half'` to stream large file uploads directly to the backend, avoiding Serverless Function body limits (Netlify 6MB / Vercel 4.5MB).
- **Session Isolation:** `session_id` is passed as a query parameter or header to ensure users only access their own data in the singleton `DataService`.

## Core Conventions
### Backend (Python)
- **Service Pattern:** Business logic lives in `app/services/` (e.g., `DataService`, `MLService`).
- **Endpoints:** Use `app/api/` for routers. Keep routers thin; delegate logic to services.
- **Error Handling:** Use custom exceptions from `app/core/exceptions.py` to ensure consistent JSON error responses.
- **Data Integrity:** `DataService.get_dataset_info` must return `rows` as an integer and `preview` as a list of dictionaries (`records`).

### Frontend (React/Next.js)
- **Components:** Modularized in `components/`. Specific domains have subfolders (e.g., `components/data/`, `components/ml/`).
- **State Management:** Use `datasetInfo`, `analysisResults`, and `trainingResults` states in `page.tsx` as the primary data flow.
- **Formatting:** Use `lib/api.ts` for all fetch calls to ensure correct proxy routing.

## Development Workflows
### Adding a New Feature
1. **Research:** Check `backend/app/services/` for existing logic that can be extended.
2. **Implementation:**
   - Create/Update Service.
   - Add/Update FastAPI Router.
   - Update Frontend Component.
3. **Verification:** Test with `titanic.csv` or similar small datasets. Ensure types match between `DataService` and the UI.

### Critical Constraints
- **Python 3.9 Compatibility:** Avoid features from 3.10+ (like `|` for types or `match` statements) unless verified.
- **No Hardcoded /tmp:** Always use `settings.MODEL_CACHE_DIR` for file persistence to avoid permission issues on macOS/Linux.
- **Memory Efficiency:** Do not read file contents multiple times. Pass bytes directly to `DataService`.

## Documentation
- **API Docs:** Available at `http://localhost:8010/docs` when the backend is running.
- **DFD Level:** Level 1 (Overview of services and data stores).
- **ER Model:** Hybrid (SQL for Auth, Filesystem for ML, Memory for Data).
