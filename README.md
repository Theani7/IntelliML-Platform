# IntelliML Platform

IntelliML is an end-to-end AI-assisted analytics and AutoML platform that enables users to upload datasets, clean and explore data, engineer features, train machine learning models, interpret results with SHAP explanations, simulate what-if scenarios, and interact with an AI-powered chat and voice assistant -- all from a unified web interface.

## Features

### Data Pipeline
- **Dataset Upload** -- Support for CSV, Excel, and JSON file formats with drag-and-drop
- **Data Cleaning** -- 10 cleaning operations (drop, fill, rename, cast, encode, outlier removal, scaling, etc.) with undo/redo history
- **Exploratory Data Analysis (EDA)** -- Comprehensive statistical analysis with AI-generated insights, correlation heatmaps, distribution charts, missing value analysis, and PDF report export
- **Feature Engineering** -- Polynomial features, log transforms, interaction terms, and binning
- **Outlier Detection** -- IQR and Z-score methods with interactive removal
- **Model Training** -- Multi-model training with cross-validation, hyperparameter tuning, and real-time WebSocket progress updates
- **Model Results** -- Side-by-side model comparison, learning curves, and performance metrics
- **What-If Simulation** -- Interactive prediction interface with per-prediction SHAP explanations

### AI Assistant
- **Chat Interface** -- Natural language queries about your data with auto-generated visualizations (correlation heatmaps, histograms, scatter plots)
- **Voice Assistant** -- Speech-to-text powered by Groq Whisper, intent parsing, text-to-speech responses, and quick-command mode
- **Markdown Rendering** -- Rich formatted responses in chat

### Authentication & Admin
- **JWT Auth** -- Secure login/signup with bcrypt password hashing, profile management, and password change
- **Admin Dashboard** -- User management (activate/deactivate, promote/demote), system overview, analytics, audit logs, and administrative actions (force logout, clear sessions, clear stuck jobs)
- **Role-Based Access** -- Admin accounts restricted to admin-only endpoints; normal users access the full analytics workflow

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Landing /   │  │  Data Pipeline│  │  AI Assistant       │ │
│  │  Auth Pages  │  │  Tabs (SPA)  │  │  (Chat + Voice)     │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         └────────────────┼──────────────────────┘            │
│                    /api/proxy/*                               │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTP/WebSocket
┌────────────────────────┼─────────────────────────────────────┐
│                       Backend (FastAPI)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Auth API    │  │  Data API    │  │  ML Engine          │ │
│  │  /api/auth/* │  │  /api/data/* │  │  backend/app/ml/    │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Models API  │  │  Chat API    │  │  Voice API          │ │
│  │ /api/models/*│  │  /api/chat/* │  │  /api/voice/*       │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │  Admin API   │  │  SQLite DB   │                          │
│  │ /api/admin/* │  │  + JSON Store│                          │
│  └─────────────┘  └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### ML Engine Structure

```
backend/app/ml/
├── engines/
│   ├── model_trainer.py    # Trains all models, handles CV, tuning, job management
│   ├── explainer.py        # SHAP-based model explanations
│   └── data_analyzer.py    # Statistical analysis and AI insight generation
└── servers/
    ├── linear_models.py    # Logistic/Linear Regression, Ridge, Lasso
    ├── tree_models.py      # Random Forest, Decision Tree
    ├── boosting_models.py  # XGBoost, LightGBM, CatBoost
    └── neural_models.py    # MLP Classifier/Regressor
```

### Supported Model Types

| Category | Models | Task Types |
|---|---|---|
| Linear | Linear Regression, Ridge, Lasso, Logistic Regression | Regression, Classification |
| Tree | Decision Tree, Random Forest | Regression, Classification |
| Boosting | XGBoost, LightGBM, CatBoost | Regression, Classification |
| Neural | MLP Regressor, MLP Classifier | Regression, Classification |

## Tech Stack

### Frontend (`/frontend`)

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 (App Router) | React framework, SSR, API proxy |
| TypeScript | 5 | Type-safe frontend code |
| Tailwind CSS | 4 | Utility-first styling |
| Recharts | 2.15+ | Data visualization |
| Chart.js + react-chartjs-2 | 4.5+ | Additional charting |
| D3.js | 7.9+ | Custom visualizations |
| Tremor | 3.18+ | UI components |

### Backend (`/backend`)

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.136+ | REST API framework |
| SQLModel | 0.0.22+ | ORM and database models |
| SQLite | -- | User data persistence |
| scikit-learn | 1.8+ | Core ML algorithms |
| XGBoost | -- | Gradient boosting |
| LightGBM | -- | Gradient boosting |
| SHAP | -- | Model interpretability |
| Groq | -- | LLM and Whisper API |
| Pandas/NumPy | -- | Data manipulation |
| Matplotlib/Seaborn/Plotly | -- | Visualization |
| ReportLab | -- | PDF report generation |

## Repository Structure

```
IntelliML-Platform/
├── .github/workflows/ci.yml          # CI: backend tests + lint, frontend tests + lint + build
├── main.py                           # Root placeholder entry point
├── model_comparison.ipynb            # Jupyter notebook for model analysis
├── render.yaml                       # Render deployment configuration
│
├── backend/
│   ├── app/
│   │   ├── api/                      # API route handlers
│   │   │   ├── admin.py              # Admin dashboard endpoints
│   │   │   ├── auth.py               # Authentication endpoints
│   │   │   ├── chat.py               # AI chat assistant
│   │   │   ├── analysis.py           # Data analysis endpoints
│   │   │   ├── models.py             # Model training and prediction
│   │   │   ├── explanations.py       # SHAP explanation endpoints
│   │   │   ├── data/                 # Data pipeline package
│   │   │   │   ├── upload.py         # File upload and session management
│   │   │   │   ├── cleaning.py       # Data cleaning operations + undo/redo
│   │   │   │   ├── eda.py            # EDA and PDF report generation
│   │   │   │   ├── features.py       # Feature engineering
│   │   │   │   ├── outliers.py       # Outlier detection and removal
│   │   │   │   ├── training.py       # Model training endpoints
│   │   │   │   ├── simulate.py       # What-if simulation
│   │   │   │   └── ws_training.py    # WebSocket training progress
│   │   │   └── voice/                # Voice assistant package
│   │   │       ├── transcription.py  # Speech-to-text
│   │   │       ├── commands.py       # Voice command processing
│   │   │       └── intents.py        # Intent definitions
│   │   ├── core/                     # Core utilities
│   │   │   ├── admin_audit.py        # Admin action audit logging
│   │   │   ├── admin_store.py        # Admin user store
│   │   │   ├── auth_utils.py         # JWT and password utilities
│   │   │   ├── cache.py              # Result caching
│   │   │   ├── cors.py               # CORS middleware
│   │   │   ├── db_utils.py           # Database session management
│   │   │   ├── errors.py             # Custom exceptions
│   │   │   ├── exceptions.py         # Exception handlers
│   │   │   ├── groq_client.py        # Groq API client
│   │   │   ├── lifespan.py           # App lifecycle hooks
│   │   │   ├── model_store.py        # Model persistence
│   │   │   └── routers.py            # Router registration
│   │   ├── ml/                       # ML engine (see Architecture)
│   │   ├── models/
│   │   │   └── user.py               # User database model + Pydantic schemas
│   │   ├── services/                 # Business logic layer
│   │   │   ├── analysis_service.py   # Data analysis
│   │   │   ├── data_chat_service.py  # AI chat service
│   │   │   ├── data_service.py       # Data processing
│   │   │   ├── explanation_service.py # SHAP explanations
│   │   │   ├── ml_service.py         # ML job management
│   │   │   ├── nlu/                  # NLU sub-package
│   │   │   │   ├── parser.py         # Intent parser
│   │   │   │   ├── handlers.py       # Intent handlers
│   │   │   │   └── service.py        # NLU service
│   │   │   ├── nlu_service.py        # NLU service wrapper
│   │   │   ├── tts_service.py        # Text-to-speech (gTTS)
│   │   │   └── voice_service.py      # Voice transcription (Groq Whisper)
│   │   └── utils/
│   │       └── pdf_generator.py      # EDA PDF report generation
│   ├── requirements.txt              # Python dependencies
│   ├── runtime.txt                   # Python 3.11
│   ├── run.py                        # Development server launcher
│   └── Procfile                      # Production process definition
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── page.tsx                  # Main SPA page (tab-based navigation)
│   │   ├── globals.css               # Global styles
│   │   └── api/proxy/[...path]/      # API proxy route handler
│   ├── components/
│   │   ├── auth/                     # Login and signup pages
│   │   ├── admin/                    # Admin dashboard
│   │   ├── analysis/                 # AI insights and data stats
│   │   ├── charts/                   # Chart components (heatmap, box plot, etc.)
│   │   ├── chat/                     # Data chat and voice chat
│   │   ├── data/                     # Upload, cleaning, features, outliers
│   │   ├── explanations/             # SHAP visualization plots
│   │   ├── landing/                  # Landing page components
│   │   ├── layout/                   # Header, sidebar, navigation
│   │   ├── ml/                       # Experiment leaderboard
│   │   ├── models/                   # Training, comparison, simulation, batch predict
│   │   ├── ui/                       # Reusable UI components
│   │   └── voice/                    # Voice button and waveform
│   ├── context/                      # React contexts (Auth, Toast)
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # API client, utilities, preferences
│   ├── public/                       # Static assets
│   ├── package.json                  # Node dependencies and scripts
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── next.config.ts                # Next.js configuration
│   ├── vitest.config.ts              # Test configuration
│   └── eslint.config.mjs             # Linting configuration
```

## Ports and Runtime Flow

| Service | URL | Description |
|---|---|---|
| Frontend dev server | `http://localhost:3000` | Next.js development server |
| Backend API server | `http://127.0.0.1:8010` | FastAPI application |
| API Swagger docs | `http://127.0.0.1:8010/docs` | Interactive API documentation |
| API ReDoc | `http://127.0.0.1:8010/redoc` | Alternative API docs |

### API Proxy Resolution

The frontend uses a proxy strategy to avoid CORS issues. All API calls go through `/api/proxy/*` and are forwarded to the backend. The proxy resolves the backend URL in this order:

1. `API_URL` environment variable
2. `NEXT_PUBLIC_API_URL` environment variable
3. `NEXT_PUBLIC_BACKEND_URL` environment variable
4. Fallback: `http://127.0.0.1:8010`

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Frontend runtime |
| npm | 9+ | Package manager |
| Python | 3.9+ (3.11 recommended) | Backend runtime |
| pip | -- | Python package manager |
| virtualenv | -- | Python virtual environments |
| Groq API Key | -- | Required for AI assistant and voice features |

## Getting Started

### 1. Clone the Repository

```bash
git clone git@github.com:Theani7/IntelliML-Platform.git
cd IntelliML-Platform
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

Create `backend/.env`:

```env
# Required for AI assistant and voice features
GROQ_API_KEY=YOUR_GROQ_API_KEY

# Optional model overrides
LLM_MODEL=llama-3.3-70b-versatile
WHISPER_MODEL=whisper-large-v3

# Optional fallback API key auth (JWT is primary)
INTELLIML_API_KEY=YOUR_INTERNAL_API_KEY

# Recommended for stable auth across restarts
JWT_SECRET_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET

# Optional allowlists
# ADMIN_USERNAMES=admin
# ADMIN_EMAILS=admin@example.com
```

Start the backend:

```bash
python run.py
```

Expected output:
- API root: `http://127.0.0.1:8010/`
- Swagger docs: `http://127.0.0.1:8010/docs`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (recommended):

```env
# Usually keep this default for local
API_URL=http://127.0.0.1:8010
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## First Login and Admin Access

A default admin account is auto-created on backend startup:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

Important behavior:
- Admin users are restricted to admin dashboard endpoints only
- Normal users can access the full analytics workflow
- Maximum admin count is limited in backend admin store logic
- **Change default credentials immediately in production**

## API Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a new user account |
| POST | `/api/auth/login` | Authenticate and receive JWT token |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update user profile |
| POST | `/api/auth/change-password` | Change account password |

### Data Pipeline (`/api/data`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/data/upload` | Upload CSV/Excel/JSON dataset |
| GET | `/api/data/info` | Get current dataset information |
| GET | `/api/data/columns` | List dataset columns |
| GET | `/api/data/test-data` | Verify data is loaded |
| POST | `/api/data/reset` | Reset data session |
| POST | `/api/data/clean` | Apply cleaning operations (supports undo/redo) |
| GET | `/api/data/quality` | Data quality analysis with AI recommendations |
| GET | `/api/data/analyze` | Full EDA with stats, charts, and AI insights |
| GET | `/api/data/report` | Download EDA report as PDF |
| POST | `/api/data/engineer` | Create engineered features |
| POST | `/api/data/outliers/detect` | Detect outliers (IQR/Z-score) |
| POST | `/api/data/outliers/remove` | Remove detected outliers |
| POST | `/api/data/train` | Train ML models |
| GET | `/api/data/explain/{job_id}` | Get feature importance explanations |
| GET | `/api/data/models` | List all trained model jobs |
| GET | `/api/data/simulate/schema/{job_id}` | Get what-if simulation form schema |
| POST | `/api/data/simulate/predict/{job_id}` | What-if prediction with SHAP |
| WS | `/api/data/ws/train` | WebSocket: real-time training progress |

### Models (`/api/models`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/models/train` | Train ML models (alternative endpoint) |
| GET | `/api/models/status/{job_id}` | Get training job status |
| GET | `/api/models/results/{job_id}` | Get training results |
| GET | `/api/models/experiments` | Get past experiments (user-filtered) |
| GET | `/api/models/export/{job_id}` | Export best model as `.joblib` |
| GET | `/api/models/learning-curves/{job_id}` | Compute learning curves |
| POST | `/api/models/predict/{job_id}` | Single prediction |
| POST | `/api/models/explain/{job_id}` | SHAP explanation for a prediction |
| POST | `/api/models/predict-batch/{job_id}` | Batch prediction from CSV upload |

### Explanations (`/api/explanations`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/explanations/shap/{job_id}` | Get SHAP explanations for trained model |

### Chat Assistant (`/api/chat`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/message` | Send message to AI assistant |
| GET | `/api/chat/suggestions` | Get AI-suggested visualizations |
| POST | `/api/chat/clear` | Clear chat history |

### Voice Assistant (`/api/voice`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/voice/health` | Voice service health check |
| POST | `/api/voice/transcribe` | Transcribe audio to text |
| POST | `/api/voice/parse-intent` | Transcribe and parse intent in one step |
| POST | `/api/voice/process` | Full pipeline: audio to TTS response |
| POST | `/api/voice/execute` | Execute voice command (no TTS) |
| POST | `/api/voice/process-text` | Process text command (no audio) |
| POST | `/api/voice/quick-command` | Optimized fast voice command |
| GET | `/api/voice/supported-intents` | List supported intents with examples |

### Admin (`/api/admin`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/overview` | System overview and statistics |
| GET | `/api/admin/analytics` | Platform analytics (7-day trends) |
| GET | `/api/admin/system-health` | System health and runtime metrics |
| GET | `/api/admin/audit` | Admin audit event log |
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users/{user_id}/status` | Activate/deactivate user |
| POST | `/api/admin/users/{user_id}/admin-role` | Promote/demote admin |
| POST | `/api/admin/actions/reset-password` | Force reset user password |
| POST | `/api/admin/actions/force-logout` | Force logout user |
| POST | `/api/admin/actions/clear-user-session` | Clear user data session |
| POST | `/api/admin/actions/clear-stuck-jobs` | Clear stuck ML training jobs |

## Development Commands

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint check
npm run lint

# Run tests
npm run test

# Type check
npx tsc --noEmit
```

### Backend

```bash
cd backend
source venv/bin/activate

# Start development server (with hot reload)
python run.py

# Run tests
pytest

# Lint with Ruff
ruff check .

# Format with Ruff
ruff format .
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and PR:

| Stage | Language | Tools |
|---|---|---|
| Backend Tests | Python 3.11 | pytest |
| Backend Lint | Python 3.11 | Ruff |
| Frontend Tests | Node 24 | Vitest |
| Frontend Lint | Node 24 | ESLint |
| Frontend Build | Node 24 | Next.js build |

## Deployment

### Render (Backend)

The `render.yaml` file configures backend deployment:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Render will auto-detect `render.yaml`
4. Required environment variables:
   - `GROQ_API_KEY` -- your Groq API key
   - `JWT_SECRET_KEY` -- auto-generated by Render

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set environment variable:
   - `API_URL` -- your deployed backend URL
3. Deploy

### Heroku Alternative

- Backend: Deploy with the `Procfile` provided
- Frontend: Deploy as a static site or use a Node.js dyno
- Ensure `API_URL` points to the backend origin
- Use HTTPS and strong secrets in production

## Troubleshooting

### "Failed to fetch" in frontend

**Common causes:**
- Backend not running on `127.0.0.1:8010`
- Wrong proxy target (`API_URL` in `.env.local`)
- Auth token missing or expired

**Checks:**
- Open `http://127.0.0.1:8010/health` -- should return `{"status": "ok"}`
- Confirm proxy file exists at `frontend/app/api/proxy/[...path]/route.ts`
- Check browser console network tab for `/api/proxy/*` requests

### Upload fails / connection error

- Confirm backend is running
- Confirm upload endpoint is reachable via proxy
- Check browser console network tab for `/api/proxy/api/data/upload`
- Verify file size is under the 50MB limit

### Hydration mismatch warnings

**Typical causes:**
- Dynamic/random values rendered differently during SSR and CSR
- Time/date or random style values not stabilized

**Fix approach:**
- Move unstable values to client-only effects with stable initial render

### Login works but session inconsistent after refresh

- Ensure token is persisted in `localStorage`
- Ensure `/api/auth/me` is checked on app initialization
- Ensure guarded routes wait for auth bootstrap before rendering protected layout

### `next build` fails to fetch Google Fonts

If your environment blocks external network, `next/font/google` fetch can fail. Use one of:
- Enable outbound network during build
- Switch to local fonts (`next/font/local`) for fully offline builds

## Data and Local Files

The following are runtime-generated local artifacts and should **not** be committed:

| File/Directory | Purpose |
|---|---|
| `backend/intellijml.db` | SQLite database for user accounts |
| `backend/admins.json` | Admin user store |
| `backend/experiments.json` | Training experiment history |
| `backend/data_cache/` | Cached analysis results |
| `backend/model_cache/` | Cached model artifacts |
| `backend/uploads/` | Uploaded dataset files |
| `backend/*.log` | Application logs |

These are excluded via `.gitignore`.

## Security Notes

- **Never commit real API keys** or secrets
- Keep `JWT_SECRET_KEY` stable and private -- rotate immediately if exposed
- Change default admin credentials (`admin`/`admin123`) before deploying to any non-local environment
- Use HTTPS in production
- Restrict admin credentials and limit admin count in non-local environments
- The `.env`, `.env.local`, and all `*.env.*` files are gitignored

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Frontend: ESLint + TypeScript strict mode
- Backend: Ruff for linting and formatting
- Run `npm run lint` and `ruff check .` before committing
- Write tests for new features (Vitest for frontend, pytest for backend)

---

If any command fails on your machine, share the exact terminal output and the setup steps will be updated to match your environment.
