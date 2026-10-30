# EDUCATERASTA - Architecture & Technical Specification

## 1. Executive Overview
**EDUCATERASTA** is an AI-powered personalized study planning platform designed to adapt to a learner's pace, syllabus requirements, strengths, and weaknesses.

This document describes the foundational baseline established in **Phase 00** and outlines the technical roadmap for subsequent phases.

---

## 2. Technology Stack

### Frontend
- **Framework**: [React 18](https://react.dev) with [TypeScript](https://www.typescriptlang.org)
- **Bundler & Dev Server**: [Vite 5](https://vitejs.dev)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com) + PostCSS + Autoprefixer
- **Testing**: [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com) (Python 3.14 compatible)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org)
- **ORM & Data Layer**: [SQLAlchemy 2.0](https://www.sqlalchemy.org)
- **Schema Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev) & `pydantic-settings`
- **Database**: [SQLite](https://www.sqlite.org) (initial/development target)
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org)
- **Testing**: [Pytest](https://docs.pytest.org) + `pytest-asyncio` + `httpx`

---

## 3. Directory Layout

```text
educaterasta/
├── .env.example                     # Environment variable blueprint
├── .gitignore                       # Repository exclusion rules
├── README.md                        # Quickstart and operations guide
├── docs/
│   └── architecture.md              # System design and specifications
├── backend/
│   ├── alembic/                     # Database migrations
│   ├── alembic.ini                  # Alembic migration configuration
│   ├── requirements.txt             # Core backend dependencies
│   ├── requirements-dev.txt         # Dev and test dependencies
│   ├── app/
│   │   ├── api/                     # Versioned routing and dependency injection
│   │   │   ├── deps.py              # Reusable dependencies (e.g. DB session)
│   │   │   └── v1/
│   │   │       ├── health.py        # Health-check endpoint
│   │   │       └── router.py        # API router aggregation
│   │   ├── core/
│   │   │   ├── config.py            # Environment-driven settings
│   │   │   └── database.py          # SQLAlchemy engine, session maker, Base
│   │   ├── models/                  # Declarative SQLAlchemy models
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   └── main.py                  # FastAPI application entrypoint & middleware
│   └── tests/
│       ├── conftest.py              # Test client and isolated DB fixtures
│       └── test_health.py           # Endpoint integration tests
└── frontend/
    ├── index.html                   # HTML entry point
    ├── package.json                 # Node manifest and script triggers
    ├── vite.config.ts               # Vite server proxy and Vitest configuration
    ├── tailwind.config.js           # Tailwind utility extensions
    ├── postcss.config.js            # PostCSS plugin registration
    ├── tsconfig.json                # TypeScript composite configuration
    ├── tsconfig.app.json            # Application TypeScript settings
    ├── tsconfig.node.json           # Tooling TypeScript settings
    └── src/
        ├── App.tsx                  # Root status interface
        ├── App.test.tsx             # Component testing with Vitest & RTL
        ├── main.tsx                 # React DOM mount point
        ├── index.css                # Tailwind directives
        ├── vite-env.d.ts            # Client environment types
        └── test/
            └── setup.ts             # Test setup file
```

---

## 4. Architectural Patterns & Decisions

1. **Decoupled API-First Architecture**:
   - The frontend communicates with the backend exclusively through HTTP REST endpoints under `/api/v1`.
   - In development, Vite's reverse proxy routes `/api` directly to `http://localhost:8000`, eliminating cross-origin issues during local workflows.
2. **Database Agnosticism**:
   - SQLite is configured out of the box for zero-setup local onboarding.
   - Database operations use SQLAlchemy 2.0 ORM and Alembic migrations, permitting seamless migration to PostgreSQL in later phases.
3. **Environment Isolation**:
   - Secret keys and runtime configurations are managed via `.env` files parsed strictly by `pydantic-settings`.
   - In-memory SQLite (`sqlite:///:memory:`) is enforced in Pytest fixtures (`conftest.py`) to guarantee tests do not pollute or depend on persistent development databases.
4. **Resilient Testing**:
   - Backend: Unit and integration tests run via `pytest`.
   - Frontend: Unit and DOM component tests run via `vitest` with `jsdom` and React Testing Library.

