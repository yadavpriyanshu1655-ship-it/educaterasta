from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.subjects import router as subjects_router
from backend.app.api.v1.topics import router as topics_router
from backend.app.api.v1.study_sessions import router as study_sessions_router
from backend.app.api.v1.exams import router as exams_router
from backend.app.api.v1.dashboard import router as dashboard_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.planner import router as planner_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(subjects_router, prefix="/subjects", tags=["Subjects"])
api_router.include_router(topics_router, prefix="/topics", tags=["Topics"])
api_router.include_router(study_sessions_router, prefix="/study-sessions", tags=["Study Sessions"])
api_router.include_router(exams_router, prefix="/exams", tags=["Examinations"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(planner_router, prefix="/planner", tags=["Intelligent Scheduling"])
