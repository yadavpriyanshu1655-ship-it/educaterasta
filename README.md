# EDUCATERASTA

> **AI-Powered Personalized Study Planning Platform**

Educaterasta is an intelligent study planning platform designed to generate, adapt, and track personalized study schedules according to student goals, syllabus complexity, strengths, and available study hours.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, TypeScript, Tailwind CSS 3 |
| **Backend** | Python 3.14+, FastAPI, Uvicorn, SQLAlchemy 2.0, Alembic |
| **Database** | SQLite (development baseline) |
| **Testing** | Pytest, Vitest, React Testing Library, JSDOM |

---

## Project Structure

```text
educaterasta/
├── backend/                         # FastAPI backend application
│   ├── alembic/                     # Database migrations
│   ├── alembic.ini                  # Alembic configuration
│   ├── app/                         # Application source code
│   │   ├── api/v1/                  # API endpoints (/health, etc.)
│   │   ├── core/                    # Config & database connections
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   ├── schemas/                 # Pydantic schemas
│   │   └── main.py                  # App entry point & CORS configuration
│   ├── tests/                       # Pytest test suite
│   ├── requirements.txt             # Core dependencies
│   └── requirements-dev.txt         # Development & test dependencies
├── frontend/                        # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx                  # Root application component
│   │   ├── App.test.tsx             # RTL component tests
│   │   └── main.tsx                 # DOM mounting point
│   ├── package.json                 # Node dependencies and scripts
│   ├── vite.config.ts               # Vite & Vitest configuration
│   └── tailwind.config.js           # Tailwind CSS configuration
├── docs/                            # Architectural & technical documentation
├── .env.example                     # Environment template
└── .gitignore                       # Repository ignore rules
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** (tested on Python 3.14)
- **Node.js 18+** (tested on Node.js 24)
- **npm 9+**

### 1. Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

### 2. Backend Setup & Run

Navigate to the `backend` directory, create/activate your virtual environment, and install dependencies:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
```

Run database migrations:

```bash
python3 -m alembic upgrade head
```

Start the FastAPI development server:

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be accessible at:
- **API Root**: `http://localhost:8000/`
- **Health Check**: `http://localhost:8000/api/v1/health`
- **Interactive OpenAPI Docs (Swagger)**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 3. Frontend Setup & Run

In a separate terminal, navigate to the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend will be accessible at `http://localhost:5173/`.

---

## Running Tests

### Backend Tests (Pytest)

Run the backend test suite from the repository root:

```bash
python3 -m pytest backend/tests -v
```

### Frontend Tests (Vitest & React Testing Library)

Run the frontend test suite:

```bash
cd frontend
npm run test
```

### Frontend Production Build Check

Verify TypeScript compilation and Vite production bundling:

```bash
cd frontend
npm run build
```

---

## Implementation Roadmap

- [x] **Phase 00**: Foundation & Baseline Setup (FastAPI, SQLite, React+Vite+TS, Tailwind CSS, health endpoints, CI-ready testing)
- [ ] **Phase 01**: User Authentication & Profiles
- [ ] **Phase 02**: Study Goal & Syllabus Ingestion
- [ ] **Phase 03**: Diagnostic Assessment Engine
- [ ] **Phase 04**: AI Study Schedule Generator
- [ ] **Phase 05**: Daily Task Execution & Progress Tracking
- [ ] **Phase 06**: Adaptive Re-planning Engine
- [ ] **Phase 07**: Analytics & Insights Dashboard
- [ ] **Phase 08**: Production Hardening & Deployment
