# EDUCATERASTA

> **AI-Powered Personalized Study Planning Platform**

Educaterasta is an intelligent study planning platform designed to generate, adapt, and track personalized study schedules according to student goals, syllabus complexity, strengths, and available study hours.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, TypeScript, Tailwind CSS 3 |
| **Backend** | Python 3.14+, FastAPI, Uvicorn, SQLAlchemy 2.0, Alembic |
| **Database** | SQLite (development baseline with foreign key cascading) |
| **Testing** | Pytest, Vitest, React Testing Library, JSDOM |

---

## Project Structure

```text
educaterasta/
├── backend/                         # FastAPI backend application
│   ├── alembic/                     # Database migrations
│   │   └── versions/                # Migration scripts (571d6a46cceb_create_study_planner_tables.py)
│   ├── alembic.ini                  # Alembic configuration
│   ├── app/                         # Application source code
│   │   ├── api/v1/                  # Endpoints (subjects, topics, study-sessions, exams, dashboard, analytics)
│   │   ├── core/                    # Config & database connections (PRAGMA foreign_keys=ON)
│   │   ├── models/                  # SQLAlchemy ORM models (Subject, Topic, StudySession, Exam)
│   │   ├── schemas/                 # Pydantic schemas for requests and responses
│   │   ├── services/                # Business logic & progress calculations (study_service.py)
│   │   └── main.py                  # App entry point & CORS configuration
│   ├── tests/                       # Pytest test suite (health & study planner CRUD tests)
│   ├── requirements.txt             # Core dependencies
│   └── requirements-dev.txt         # Development & test dependencies
├── frontend/                        # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/              # Reusable UI (Sidebar, Modal, ProgressBar, StatCard, Badge, ConfirmDialog)
│   │   ├── pages/                   # SaaS Views (Dashboard, Subjects, Syllabus, Planner, Exams, Analytics, Settings)
│   │   ├── services/                # Centralized typed API client (api.ts)
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── App.tsx                  # Root application component with tab/hash routing
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
- **Interactive OpenAPI Docs (Swagger)**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/api/v1/health`

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

## API Endpoints Reference

### Subjects & Topics
- `GET /api/v1/subjects` &mdash; List subjects with progress metrics and topic counts
- `POST /api/v1/subjects` &mdash; Create subject
- `GET /api/v1/subjects/{subject_id}` &mdash; Subject detail with topic hierarchy
- `PATCH /api/v1/subjects/{subject_id}` &mdash; Update subject
- `DELETE /api/v1/subjects/{subject_id}` &mdash; Delete subject (cascades child topics & sessions)
- `GET /api/v1/subjects/{subject_id}/topics` &mdash; List topics for a subject
- `POST /api/v1/subjects/{subject_id}/topics` &mdash; Create topic under subject
- `PATCH /api/v1/topics/{topic_id}` &mdash; Update topic details or status
- `DELETE /api/v1/topics/{topic_id}` &mdash; Delete topic

### Study Sessions
- `GET /api/v1/study-sessions` &mdash; List sessions (filterable by date, status, subject)
- `POST /api/v1/study-sessions` &mdash; Schedule study session
- `GET /api/v1/study-sessions/{session_id}` &mdash; Get session details
- `PATCH /api/v1/study-sessions/{session_id}` &mdash; Update session (record actual time, mark complete)
- `DELETE /api/v1/study-sessions/{session_id}` &mdash; Delete session

### Examinations
- `GET /api/v1/exams` &mdash; List examinations with automatic days remaining calculation
- `POST /api/v1/exams` &mdash; Register exam
- `PATCH /api/v1/exams/{exam_id}` &mdash; Update exam
- `DELETE /api/v1/exams/{exam_id}` &mdash; Delete exam

### Dashboard & Analytics
- `GET /api/v1/dashboard/summary` &mdash; Real-time KPIs, today's schedule, upcoming exams, progress
- `GET /api/v1/analytics/overview` &mdash; Session completion distributions, time spent, priority breakdown

---

## Running Tests

### Backend Tests (Pytest)

Run the backend test suite (10 tests covering health, empty state, CRUD, validations, and progress algorithms):

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
- [x] **Phase 01**: Core Study Planner (Subject/Topic syllabus management, study sessions, exams, real analytics dashboard, SQLite persistence, Alembic migrations)
- [ ] **Phase 02**: Adaptive Study Rescheduling & Goal Setting
- [ ] **Phase 03**: Diagnostic Assessment Engine
- [ ] **Phase 04**: AI Study Schedule Generator
- [ ] **Phase 05**: Daily Task Execution & Progress Tracking
- [ ] **Phase 06**: Adaptive Re-planning Engine
- [ ] **Phase 07**: Analytics & Insights Dashboard
- [ ] **Phase 08**: Production Hardening & Multi-User Deployment
