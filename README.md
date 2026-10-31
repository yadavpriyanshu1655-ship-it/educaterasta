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
│   │   └── versions/                # Migrations: Phase 01 baseline, Phase 02 scheduling, Phase 03 quiz tables
│   ├── alembic.ini                  # Alembic configuration
│   ├── app/                         # Application source code
│   │   ├── api/v1/                  # Endpoints (subjects, topics, study-sessions, exams, planner, quizzes, questions, attempts, analytics)
│   │   ├── core/                    # Config & database connections (PRAGMA foreign_keys=ON)
│   │   ├── models/                  # SQLAlchemy models (Subject, Topic, StudySession, Exam, StudyPreference, Quiz, Question, QuizAttempt, TopicPerformance, TopicPrerequisite)
│   │   ├── schemas/                 # Pydantic schemas for requests and sanitized responses
│   │   ├── services/                # Engine algorithms (quiz_service.py, scheduling_engine.py, study_service.py)
│   │   └── main.py                  # App entry point & CORS configuration
│   ├── tests/                       # Pytest test suite (22 tests: health, study planner, scheduling engine, quiz engine)
│   ├── requirements.txt             # Core dependencies
│   └── requirements-dev.txt         # Development & test dependencies
├── frontend/                        # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/              # Reusable UI (QuizResultModal, PlanGeneratorModal, MissedRecoveryModal, Sidebar, Modal, ProgressBar, StatCard, Badge)
│   │   ├── pages/                   # SaaS Views (Dashboard, Subjects, Syllabus, Planner, Quizzes, WeakTopics, Exams, Analytics, Settings)
│   │   ├── services/                # Centralized typed API client (api.ts)
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── App.tsx                  # Root application component with tab/hash routing
│   │   ├── App.test.tsx             # RTL component tests (8 tests: Dashboard, Subjects, Planner, Settings, Quizzes & Weak Topics)
│   │   └── main.tsx                 # DOM mounting point
│   ├── package.json                 # Node dependencies and scripts
│   ├── vite.config.ts               # Vite & Vitest configuration
│   └── tailwind.config.js           # Tailwind CSS configuration
├── docs/                            # Architectural & technical documentation (architecture.md)
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

### Quizzes & Assessment Engine (Phase 03)
- `GET /api/v1/quizzes` &mdash; List quizzes with subject filters, difficulty, and question counts
- `POST /api/v1/quizzes` &mdash; Create customized quiz for specific subjects and syllabus topics
- `GET /api/v1/quizzes/{id}` &mdash; Quiz details with assigned topic list
- `PUT /api/v1/quizzes/{id}` &mdash; Update quiz parameters, passing percentage, and draft/published status
- `DELETE /api/v1/quizzes/{id}` &mdash; Delete quiz and cascade attempt associations
- `POST /api/v1/quizzes/{id}/start` &mdash; Start quiz attempt (strictly returns sanitized questions without answer keys)
- `GET /api/v1/quizzes/adaptive/next-question` &mdash; Dynamically pick next practice question matching real-time mastery

### Question Bank Management (Phase 03)
- `GET /api/v1/questions` &mdash; List questions in bank with topic, difficulty, and search filters
- `POST /api/v1/questions` &mdash; Create question (Single choice, Multiple select, True/False, Short answer)
- `GET /api/v1/questions/{id}` &mdash; Question authoring detail view with correct answer and explanation
- `PUT /api/v1/questions/{id}` &mdash; Update question text, options, marks, or explanation
- `DELETE /api/v1/questions/{id}` &mdash; Delete question from question bank

### Quiz Attempts & Evaluation (Phase 03)
- `GET /api/v1/attempts` &mdash; List user's past quiz attempts with scores and timestamps
- `GET /api/v1/attempts/{id}` &mdash; Fetch attempt progress (resumes active quiz state or returns results if completed)
- `POST /api/v1/attempts/{id}/answers` &mdash; Auto-save individual question answer during active attempt
- `POST /api/v1/attempts/{id}/submit` &mdash; Submit attempt, trigger evaluation with negative marking, mistake categorization, and update cumulative topic performance
- `GET /api/v1/attempts/{id}/results` &mdash; Post-submission score report, topic breakdowns, mistake review, and study recommendations

### Diagnostic Analytics & Topic Prerequisites (Phase 03)
- `GET /api/v1/analytics/topic-performance` &mdash; Detailed cumulative topic performance records
- `GET /api/v1/analytics/weak-topics` &mdash; Automated weak topic detection with confidence levels, reasons, and unmet prerequisite warnings
- `GET /api/v1/analytics/mistakes` &mdash; Mistake analysis log with repeated error identification and suggested remedies
- `GET /api/v1/analytics/recommendations` &mdash; Actionable practice recommendations tailored to syllabus weaknesses
- `GET /api/v1/topics/{id}/prerequisites` &mdash; Inspect topic prerequisites and dependent topics
- `POST /api/v1/topics/{id}/prerequisites` &mdash; Add topic dependency (enforces cycle prevention via DFS DAG check)
- `DELETE /api/v1/topics/{id}/prerequisites/{prereq_id}` &mdash; Remove prerequisite dependency

### Intelligent Scheduling Engine (Phase 02)
- `POST /api/v1/planner/generate` &mdash; Generate a constraint-aware study plan with priority explanations and capacity checks
- `POST /api/v1/planner/preview-reschedule` &mdash; Preview rescheduling changes without persisting
- `POST /api/v1/planner/confirm-plan` &mdash; Confirm and apply proposed plan (`replace_pending` or `append`), preserving completed sessions
- `POST /api/v1/planner/recover-missed` &mdash; Scan for missed study sessions and find feasible recovery slots before deadlines
- `GET /api/v1/planner/preferences` &mdash; Get study availability, daily capacity, and Exam Survival Mode settings
- `PUT /api/v1/planner/preferences` &mdash; Update study availability preferences
- `GET /api/v1/planner/unavailable-blocks` &mdash; List recurring or specific unavailable time commitments
- `POST /api/v1/planner/unavailable-blocks` &mdash; Add unavailable time block
- `DELETE /api/v1/planner/unavailable-blocks/{id}` &mdash; Remove unavailable time block
- `GET /api/v1/planner/history` &mdash; View schedule generation and recovery audit log

### Subjects & Topics (Phase 01)
- `GET /api/v1/subjects` &mdash; List subjects with progress metrics and topic counts
- `POST /api/v1/subjects` &mdash; Create subject
- `GET /api/v1/subjects/{subject_id}` &mdash; Subject detail with topic hierarchy
- `PATCH /api/v1/subjects/{subject_id}` &mdash; Update subject
- `DELETE /api/v1/subjects/{subject_id}` &mdash; Delete subject (cascades child topics & sessions)
- `GET /api/v1/subjects/{subject_id}/topics` &mdash; List topics for a subject
- `POST /api/v1/subjects/{subject_id}/topics` &mdash; Create topic under subject
- `PATCH /api/v1/topics/{topic_id}` &mdash; Update topic details or status
- `DELETE /api/v1/topics/{topic_id}` &mdash; Delete topic

### Study Sessions (Phase 01)
- `GET /api/v1/study-sessions` &mdash; List sessions (filterable by date range, status, subject)
- `POST /api/v1/study-sessions` &mdash; Schedule study session
- `GET /api/v1/study-sessions/{session_id}` &mdash; Get session details
- `PATCH /api/v1/study-sessions/{session_id}` &mdash; Update session (record actual time, mark complete)
- `DELETE /api/v1/study-sessions/{session_id}` &mdash; Delete session

### Examinations (Phase 01)
- `GET /api/v1/exams` &mdash; List examinations with automatic days remaining calculation
- `POST /api/v1/exams` &mdash; Register exam
- `PATCH /api/v1/exams/{exam_id}` &mdash; Update exam
- `DELETE /api/v1/exams/{exam_id}` &mdash; Delete exam

### Dashboard & Analytics (Phase 01)
- `GET /api/v1/dashboard/summary` &mdash; Real-time KPIs, today's schedule, upcoming exams, progress
- `GET /api/v1/analytics/overview` &mdash; Session completion distributions, time spent, priority breakdown

---

## Running Tests

### Backend Tests (Pytest)

Run the backend test suite (22 tests covering health check, study planner CRUD, scheduling algorithms, and the Phase 03 quiz assessment engine):

```bash
python3 -m pytest backend/tests -v
```

### Frontend Tests (Vitest & React Testing Library)

Run the frontend test suite (8 tests covering Dashboard, Subjects, Planner daily/weekly timelines, Settings, Quiz Taking & Public Security Sanitization, and Weak Topics Diagnosis):

```bash
cd frontend
npm run test -- --run
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
- [x] **Phase 02**: Intelligent Scheduling Engine (Constraint-aware schedule generation, dynamic rule-based priority engine, automatic rescheduling, missed session recovery, Exam Survival Mode, daily & weekly views, availability configuration & audit history)
- [x] **Phase 03**: Diagnostic Assessment & Adaptive Quizzes (Question bank with multi-question types, timed quiz runner, public security sanitization, negative marking, diagnostic weak topic detection, mistake analysis with repeated errors, topic prerequisite DAG cycle prevention, and adaptive difficulty practice)
- [ ] **Phase 04**: AI Study Copilot & Habit Personalization
- [ ] **Phase 05**: Multi-User Authentication & Cloud Synchronization (PostgreSQL)
- [ ] **Phase 06**: Production Hardening, Rate Limiting & Enterprise Security
