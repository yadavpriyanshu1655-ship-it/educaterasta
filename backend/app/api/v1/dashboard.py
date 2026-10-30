from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.schemas.dashboard import DashboardSummary
from backend.app.services.study_service import get_dashboard_summary_data

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary, summary="Retrieve aggregated dashboard KPIs and overview")
def get_dashboard_summary(db: Session = Depends(get_db)):
    return get_dashboard_summary_data(db)

