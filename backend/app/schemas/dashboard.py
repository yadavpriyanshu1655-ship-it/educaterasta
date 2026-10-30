from typing import List, Optional
from pydantic import BaseModel
from backend.app.schemas.study_session import StudySessionResponse
from backend.app.schemas.exam import ExamResponse


class SubjectProgressSummary(BaseModel):
    subject_id: int
    subject_name: str
    color: Optional[str]
    total_topics: int
    completed_topics: int
    in_progress_topics: int
    not_started_topics: int
    progress_percentage: float


class DashboardSummary(BaseModel):
    total_subjects: int
    total_topics: int
    completed_topics: int
    overall_syllabus_progress: float
    total_study_sessions: int
    completed_study_sessions: int
    pending_study_sessions: int
    missed_study_sessions: int
    total_planned_minutes: int
    total_actual_minutes: int
    todays_sessions: List[StudySessionResponse]
    upcoming_exams: List[ExamResponse]
    subject_progress: List[SubjectProgressSummary]
    recent_activity: List[StudySessionResponse]

