# IntelliML Platform

IntelliML is an end-to-end AI-assisted analytics and AutoML platform.
It supports dataset upload, cleaning, EDA, feature engineering, training, SHAP-style explanations, what-if simulation, chat/voice assistant workflows, account management, and an admin dashboard.

## Current Highlights

- Full-stack app: `Next.js (frontend)` + `FastAPI (backend)`
- Auth system with JWT login/signup and account center
- Admin dashboard with user management and admin role controls
- Admin accounts restricted to admin-only endpoints
- Data pipeline tabs: Upload -> Cleaning -> EDA -> Feature Engineering -> Train -> Results -> Simulate -> AI Assistant
- What-If Simulation screen integrated with model schema/prediction APIs
- Responsive navigation and mobile-friendly workflow screens
- Frontend API proxy to reduce direct CORS/network issues

## Tech Stack

### Frontend (`/frontend`)
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- Recharts
- API proxy route: `frontend/app/api/proxy/[...path]/route.ts`

### Backend (`/backend`)
- FastAPI
- SQLModel / SQLite
- scikit-learn, XGBoost, LightGBM, SHAP
- Groq integration for assistant and voice-related flows

## Repository Structure

```text
IntelliML-Platform/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin.py
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   ├── analysis.py
│   │   │   ├── models.py
│   │   │   ├── explanations.py
│   │   │   ├── data/
│   │   │   └── voice/
│   │   ├── core/
│   │   ├── models/
│   │   └── services/
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── app/
│   ├── components/
│   ├── context/
│   └── lib/
└── ml_engine/
```

## Ports and Runtime Flow

- Frontend dev server: `http://localhost:3000`
- Backend API server: `http://127.0.0.1:8010`
- Frontend code calls `'/api/proxy/*'` (same-origin).
- Next.js proxy forwards to backend URL:
  - `API_URL` env var if set
  - else `NEXT_PUBLIC_API_URL` if set
  - else fallback `http://127.0.0.1:8010`

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.9+
- `pip`
- Optional but recommended: virtualenv (`python -m venv`)

## Detailed Local Setup

### 1. Clone

```bash
git clone git@github.com:Theani7/IntelliML-Platform.git
cd IntelliML-Platform
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
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

Run backend:

```bash
python run.py
```

Expected:
- API root: `http://127.0.0.1:8010/`
- Swagger docs: `http://127.0.0.1:8010/docs`

### 3. Frontend Setup

Open a new terminal:

```bash
cd IntelliML-Platform/frontend
npm install
```

Create `frontend/.env.local` (recommended):

```env
# Usually keep this default for local
API_URL=http://127.0.0.1:8010

# Optional fallback key if needed
# NEXT_PUBLIC_INTELLIML_API_KEY=YOUR_INTERNAL_API_KEY
```

Run frontend:

```bash
npm run dev
```

Open:
- `http://localhost:3000`

## First Login and Admin Access

Default admin account is auto-created by backend startup logic:

- Username: `admin`
- Password: `admin123`

Important behavior:
- Admin users are restricted to admin dashboard endpoints only.
- Normal users can access the full analytics workflow.
- Maximum admin count is limited in backend admin store logic.

## How to Run (Quick Commands)

### Start both services

Terminal 1:

```bash
cd backend
source venv/bin/activate
python run.py
```

Terminal 2:

```bash
cd frontend
npm run dev
```

### Stop services
- Use `Ctrl + C` in both terminals.

## API Surface (High Level)

- Auth: `/api/auth/*`
- Data workflow: `/api/data/*`
- Models: `/api/models/*`
- Explanations: `/api/explanations/*`
- Chat assistant: `/api/chat/*`
- Voice: `/api/voice/*`
- Admin: `/api/admin/*`

Use Swagger for exact request/response contracts:
- `http://127.0.0.1:8010/docs`

## Build, Lint, and Type Check

From `frontend/`:

```bash
npm run lint
npx tsc --noEmit
```

Production build (network required for Google Fonts unless font strategy is changed):

```bash
npm run build
npm run start
```

## Troubleshooting

### 1) "Failed to fetch" in frontend

Common causes:
- Backend not running on `127.0.0.1:8010`
- Wrong proxy target (`API_URL`)
- Auth token missing/expired

Checks:
- Open `http://127.0.0.1:8010/health`
- Confirm frontend proxy file exists at:
  `frontend/app/api/proxy/[...path]/route.ts`

### 2) Upload fails / connection error

- Confirm backend is running.
- Confirm upload endpoint is reachable via proxy.
- Check browser console network tab for `/api/proxy/api/data/upload`.

### 3) Hydration mismatch warnings

Typical causes:
- Dynamic/random values rendered during SSR and CSR differently
- Time/date or random style values not stabilized

Fix approach:
- Move unstable values to client-only effect/memo with stable initial render.

### 4) Login works but session looks inconsistent after refresh

- Ensure token is persisted in localStorage and `/api/auth/me` is checked on app init.
- Ensure guarded routes wait for auth bootstrap before rendering protected layout.

### 5) `next build` fails to fetch Google fonts

If your environment blocks external network, `next/font/google` fetch can fail.
Use one of:
- Enable outbound network during build
- Switch to local fonts (`next/font/local`) for fully offline builds

## Data and Local Files

Runtime-generated local files include:
- `backend/intellijml.db`
- `backend/admins.json`
- `backend/experiments.json`
- caches/logs in backend

These are local runtime artifacts and should not be committed.

## Security Notes

- Do not commit real API keys.
- Keep `JWT_SECRET_KEY` stable and private.
- Rotate secrets immediately if exposed.
- Restrict admin credentials in non-local environments.

## Deployment Notes (Short)

- Run backend behind a production ASGI server.
- Set `API_URL` in frontend runtime env to backend origin.
- Use strong secrets and HTTPS.
- Replace default admin credentials immediately.

## Recent Project Changes Reflected in This README

- Admin dashboard and role-management flow
- JWT auth, signup/login/account management
- What-If Simulation integration
- Responsive navigation/workflow updates
- Next.js proxy-based API calling strategy
- Backend modular router split (`api/data/` and `api/voice/` packages)

---
If any command here fails on your machine, share the exact terminal output and I will update the setup steps to match your environment.
