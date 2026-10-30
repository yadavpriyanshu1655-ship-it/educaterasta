from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.schemas.analytics import AnalyticsOverview
from backend.app.services.study_service import get_analytics_overview_data

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverview, summary="Retrieve study analytics and syllabus progress metrics")
def get_analytics_overview(db: Session = Depends(get_db)):
    return get_analytics_overview_data(db)

