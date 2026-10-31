from datetime import date, datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict


class StudyPreferenceBase(BaseModel):
    daily_target_hours: float = Field(3.0, gt=0, le=16, description="Daily maximum study hours (0.5 to 16)")
    preferred_start_time: str = Field("09:00", description="Earliest study start time (HH:MM)")
    preferred_end_time: str = Field("21:00", description="Latest study end time (HH:MM)")
    max_session_duration_minutes: int = Field(60, ge=15, le=240, description="Maximum length of a single session (min)")
    break_duration_minutes: int = Field(15, ge=0, le=60, description="Rest period between consecutive study sessions (min)")
    available_days: str = Field("mon,tue,wed,thu,fri,sat,sun", description="Comma-separated active study days")
    exam_survival_mode: bool = Field(False, description="Emergency exam preparation mode prioritizing exam topics")


class StudyPreferenceUpdate(BaseModel):
    daily_target_hours: Optional[float] = Field(None, gt=0, le=16)
    preferred_start_time: Optional[str] = None
    preferred_end_time: Optional[str] = None
    max_session_duration_minutes: Optional[int] = Field(None, ge=15, le=240)
    break_duration_minutes: Optional[int] = Field(None, ge=0, le=60)
    available_days: Optional[str] = None
    exam_survival_mode: Optional[bool] = None


class StudyPreferenceResponse(StudyPreferenceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnavailableBlockBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, description="Block label (e.g. School, Job, Gym)")
    day_of_week: str = Field("all", description="mon, tue, wed, thu, fri, sat, sun, or all")
    start_time: str = Field(..., description="Blocked start time (HH:MM)")
    end_time: str = Field(..., description="Blocked end time (HH:MM)")


class UnavailableBlockCreate(UnavailableBlockBase):
    pass


class UnavailableBlockResponse(UnavailableBlockBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScheduleHistoryResponse(BaseModel):
    id: int
    action: str
    summary: str
    sessions_created: int
    exam_survival_mode: bool
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Intelligent Scheduling Request & Response Models ---

class PlanGenerateRequest(BaseModel):
    start_date: Optional[date] = Field(None, description="Plan start date (defaults to today)")
    end_date: Optional[date] = Field(None, description="Plan end date (defaults to start_date + 6 days)")
    subject_ids: Optional[List[int]] = Field(None, description="Optional filter for specific subjects")
    exam_survival_mode: Optional[bool] = Field(None, description="Override stored exam survival mode setting")
    daily_target_hours: Optional[float] = Field(None, gt=0, le=16)
    preferred_start_time: Optional[str] = None
    preferred_end_time: Optional[str] = None
    max_session_duration_minutes: Optional[int] = Field(None, ge=15, le=240)
    break_duration_minutes: Optional[int] = Field(None, ge=0, le=60)


class ProposedSession(BaseModel):
    subject_id: int
    subject_name: str
    subject_color: Optional[str] = None
    topic_id: Optional[int] = None
    topic_title: Optional[str] = None
    title: str
    scheduled_date: date
    start_time: str
    end_time: str
    planned_duration_minutes: int
    priority_score: float
    reason: str


class UnscheduledTask(BaseModel):
    topic_id: int
    topic_title: str
    subject_id: int
    subject_name: str
    estimated_duration_minutes: int
    reason: str
    conflict_type: str  # "capacity_exceeded", "before_exam_deadline", "no_available_days", "window_too_short"


class DailyWorkload(BaseModel):
    date: date
    day_name: str
    total_planned_minutes: int
    capacity_minutes: int
    sessions_count: int
    is_available: bool


class GeneratedPlanResponse(BaseModel):
    start_date: date
    end_date: date
    exam_survival_mode: bool
    total_proposed_sessions: int
    total_planned_minutes: int
    proposed_sessions: List[ProposedSession]
    unscheduled_tasks: List[UnscheduledTask]
    daily_workloads: List[DailyWorkload]
    explanations: List[str]


PlanConfirmMode = Literal["append", "replace_pending"]


class ConfirmPlanRequest(BaseModel):
    sessions: List[ProposedSession]
    mode: PlanConfirmMode = Field("replace_pending", description="replace_pending clears pending sessions in date range; append adds to them")
    action_summary: Optional[str] = None
    exam_survival_mode: bool = False


class RecoverMissedRequest(BaseModel):
    lookback_days: int = Field(14, ge=1, le=60, description="How far back to check for missed or overdue sessions")
    target_start_date: Optional[date] = Field(None, description="Earliest date to schedule recovery sessions (defaults to today)")
    target_end_date: Optional[date] = Field(None, description="Latest date for recovery slots (defaults to target_start_date + 6 days)")
    exam_survival_mode: Optional[bool] = None


class RecoverMissedResponse(BaseModel):
    missed_sessions_detected: int
    recovered_sessions: List[ProposedSession]
    unrecoverable_tasks: List[UnscheduledTask]
    summary: str

