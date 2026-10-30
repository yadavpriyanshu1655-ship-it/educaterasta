from typing import List, Dict
from pydantic import BaseModel
from backend.app.schemas.dashboard import SubjectProgressSummary
from backend.app.schemas.exam import ExamResponse


class SessionStatusBreakdown(BaseModel):
    completed: int
    pending: int
    missed: int
    total: int


class StudyTimeMetrics(BaseModel):
    total_planned_minutes: int
    total_actual_minutes: int
    total_planned_hours: float
    total_actual_hours: float


class AnalyticsOverview(BaseModel):
    overall_completion_rate: float
    sessions_breakdown: SessionStatusBreakdown
    time_metrics: StudyTimeMetrics
    subject_completion_rates: List[SubjectProgressSummary]
    upcoming_exams_count: int
    upcoming_exams: List[ExamResponse]
    priority_distribution: Dict[str, int]

