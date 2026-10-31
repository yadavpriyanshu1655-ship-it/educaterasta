# EDUCATERASTA - Architecture & Technical Specification

## 1. Executive Overview
**EDUCATERASTA** is an AI-powered personalized study planning platform designed to adapt to a learner's pace, syllabus requirements, strengths, and weaknesses.

This document describes the foundational baseline established in **Phase 00**, the core study planning capabilities implemented in **Phase 01**, and the intelligent constraint-aware scheduling engine delivered in **Phase 02**.

---

## 2. Technology Stack

### Frontend
- **Framework**: [React 18](https://react.dev) with [TypeScript](https://www.typescriptlang.org)
- **Bundler & Dev Server**: [Vite 5](https://vitejs.dev)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com) + PostCSS + Autoprefixer
- **Navigation**: Client-side hash-based routing with browser history support
- **Testing**: [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com) (Python 3.14 compatible)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org)
- **ORM & Data Layer**: [SQLAlchemy 2.0](https://www.sqlalchemy.org)
- **Schema Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev) & `pydantic-settings`
- **Database**: [SQLite](https://www.sqlite.org) (with `PRAGMA foreign_keys = ON` connection listeners)
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org)
- **Testing**: [Pytest](https://docs.pytest.org) + `pytest-asyncio` + `httpx`

---

## 3. Data Model Architecture (Phase 01 & Phase 02)

```mermaid
erDiagram
    SUBJECT ||--o{ TOPIC : "contains"
    SUBJECT ||--o{ STUDY_SESSION : "associated with"
    SUBJECT ||--o{ EXAM : "scheduled for"
    TOPIC ||--o{ STUDY_SESSION : "optionally references"

    SUBJECT {
        int id PK
        string name UK
        string description
        string color
        datetime created_at
        datetime updated_at
    }

    TOPIC {
        int id PK
        int subject_id FK
        string title
        string description
        string status "not_started | in_progress | completed"
        string priority "low | medium | high"
        int estimated_duration_minutes
        datetime created_at
        datetime updated_at
    }

    STUDY_SESSION {
        int id PK
        int subject_id FK
        int topic_id FK "optional"
        string title
        date scheduled_date
        string start_time "HH:MM"
        int planned_duration_minutes
        int actual_duration_minutes "optional"
        string status "pending | completed | missed"
        string notes
        datetime created_at
        datetime updated_at
    }

    EXAM {
        int id PK
        int subject_id FK
        string title
        date exam_date
        string notes
        datetime created_at
        datetime updated_at
    }

    STUDY_PREFERENCE {
        int id PK
        float daily_target_hours
        string preferred_start_time "HH:MM"
        string preferred_end_time "HH:MM"
        int max_session_duration_minutes
        int break_duration_minutes
        string available_days "comma-separated"
        bool exam_survival_mode
        datetime created_at
        datetime updated_at
    }

    UNAVAILABLE_BLOCK {
        int id PK
        string title
        string day_of_week "optional"
        date specific_date "optional"
        string start_time "HH:MM"
        string end_time "HH:MM"
        datetime created_at
        datetime updated_at
    }

    SCHEDULE_HISTORY {
        int id PK
        string action
        string summary
        int sessions_created
        bool exam_survival_mode
        string details "JSON"
        datetime created_at
    }
```

---

## 4. Phase 02 Scheduling Engine Architecture

### A. Deterministic Priority Engine
The scheduling engine uses a modular, explainable mathematical scoring formula:

$$S(T) = S_{\text{base}} + S_{\text{exam}} + S_{\text{status}} + S_{\text{missed}}$$

1. **Base Priority ($S_{\text{base}}$)**:
   - `high`: 50 points
   - `medium`: 30 points
   - `low`: 15 points
2. **Exam Urgency ($S_{\text{exam}}$)**:
   - Distance to nearest upcoming examination for the topic's subject:
     - $\le 3\text{ days}$: 40 points
     - $4 - 7\text{ days}$: 25 points
     - $8 - 14\text{ days}$: 15 points
     - $> 14\text{ days}$: 5 points
   - When **Exam Survival Mode** is active:
     - $S_{\text{exam}} \leftarrow S_{\text{exam}} \times 2.0 + 30$
     - Topics without upcoming exams receive a priority penalty of $-40$ to avoid crowding out critical exam prep.
3. **Continuity & Progress ($S_{\text{status}}$)**:
   - `in_progress`: +10 points (encourages finishing partially completed topics before starting new ones).
4. **Missed Workload Urgency ($S_{\text{missed}}$)**:
   - If an overdue session exists for the topic: +15 points.

Every recommendation includes a human-readable explanation stored directly in the response payload.

### B. Constraint Satisfaction & Non-Overlapping Slot Allocation
1. **Daily Workload Capacity**:
   - The engine enforces $\sum \text{planned\_duration} \le \text{daily\_target\_hours} \times 60$.
2. **Permitted Time Windows**:
   - Sessions are allocated only between `preferred_start_time` and `preferred_end_time`.
3. **Unavailable & Fixed Commitments**:
   - Time intervals matching `UnavailableBlock` entries or existing completed study sessions are subtracted via `subtract_intervals()`.
4. **Buffer & Rest Periods**:
   - An interval of `break_duration_minutes` is enforced immediately following every study block.
5. **No Blind Deletions**:
   - The engine provides interactive preview endpoints (`/planner/generate`, `/planner/preview-reschedule`, `/planner/recover-missed`).
   - Confirmation offers `replace_pending` (replaces only uncompleted, non-past sessions in the target date range) or `append` mode, strictly preserving all user-logged `completed` sessions.

---

## 5. Directory Layout

```text
educaterasta/
├── .env.example                     # Environment variable blueprint
├── .gitignore                       # Repository exclusion rules
├── README.md                        # Quickstart and operations guide
├── docs/
│   └── architecture.md              # System design and specifications
├── backend/
│   ├── alembic/                     # Database migrations
│   │   └── versions/                # Versioned DDL migration scripts (Phase 01 & 02)
│   ├── alembic.ini                  # Alembic migration configuration
│   ├── requirements.txt             # Core backend dependencies
│   ├── requirements-dev.txt         # Dev and test dependencies
│   ├── app/
│   │   ├── api/                     # Versioned routing and dependency injection
│   │   │   ├── deps.py              # Reusable dependencies (e.g. DB session)
│   │   │   └── v1/                  # REST API endpoints (subjects, topics, sessions, exams, planner, dashboard, analytics)
│   │   ├── core/
│   │   │   ├── config.py            # Environment-driven settings
│   │   │   └── database.py          # SQLAlchemy engine, session maker, Base, foreign key pragma
│   │   ├── models/                  # Declarative SQLAlchemy models (Subject, Topic, StudySession, Exam, StudyPreference, UnavailableBlock, ScheduleHistory)
│   │   ├── schemas/                 # Pydantic request/response schemas (study schemas + planner engine schemas)
│   │   ├── services/                # Business logic, scheduling engine (scheduling_engine.py, study_service.py)
│   │   └── main.py                  # FastAPI application entrypoint & middleware
│   └── tests/
│       ├── conftest.py              # In-memory SQLite test database fixture & client
│       ├── test_health.py           # Health check test suite
│       ├── test_study_planner.py    # Phase 01 CRUD and progress calculation tests
│       └── test_scheduling_engine.py# Phase 02 Intelligent scheduling & recovery algorithm tests
└── frontend/
    ├── index.html                   # HTML entry point
    ├── package.json                 # Node manifest and script triggers
    ├── vite.config.ts               # Vite server proxy and Vitest configuration
    ├── tailwind.config.js           # Tailwind utility extensions
    ├── postcss.config.js            # PostCSS plugin registration
    ├── tsconfig.json                # TypeScript composite configuration
    └── src/
        ├── components/              # Modular UI (PlanGeneratorModal, MissedRecoveryModal, Sidebar, Modal, StatCard, ProgressBar, Badge, EmptyState)
        ├── pages/                   # SaaS Views (Dashboard, Subjects, Syllabus, Planner, Exams, Analytics, Settings)
        ├── services/                # Centralized typed HTTP API service (api.ts)
        ├── types/                   # TypeScript interfaces and literal unions
        ├── App.tsx                  # Root application component with tab/hash router
        ├── App.test.tsx             # Component testing with Vitest & RTL
        └── main.tsx                 # React DOM mount point
```
