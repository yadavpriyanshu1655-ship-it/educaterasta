from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class RevisionPlanBase(BaseModel):
    topic_id: int


class RevisionPlanCreate(RevisionPlanBase):
    pass


class RevisionPlanResponse(BaseModel):
    id: int
    topic_id: int
    subject_id: int
    topic_title: str
    subject_name: str
    subject_color: Optional[str] = None
    current_interval_days: int
    last_revision_at: Optional[datetime] = None
    next_revision_at: datetime
    revision_count: int
    consecutive_successes: int
    consecutive_failures: int
    risk_score: float
    risk_category: str  # Low, Moderate, High, Critical
    status: str         # scheduled, due, overdue, completed, snoozed
    is_due: bool
    is_overdue: bool
    days_until_due: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RevisionPlanDetailResponse(RevisionPlanResponse):
    topic_description: Optional[str] = None
    topic_status: str
    topic_priority: str
    recent_mistakes: List[Dict[str, Any]] = Field(default_factory=list)
    sample_questions: List[Dict[str, Any]] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    mastery_score: Optional[float] = None


class RevisionAttemptCreate(BaseModel):
    confidence_rating: int = Field(..., ge=1, le=5)  # 1 to 5 scale
    duration_minutes: int = Field(default=15, ge=1, le=240)
    quiz_accuracy: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    self_assessment: Optional[str] = None
    notes: Optional[str] = None


class RevisionAttemptResponse(BaseModel):
    id: int
    revision_plan_id: int
    topic_id: int
    topic_title: Optional[str] = None
    subject_name: Optional[str] = None
    started_at: datetime
    completed_at: datetime
    duration_minutes: int
    confidence_rating: int
    quiz_accuracy: Optional[float] = None
    self_assessment: Optional[str] = None
    notes: Optional[str] = None
    result: str  # success, partial, failed
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RevisionSnoozeInput(BaseModel):
    snooze_days: int = Field(default=1, ge=1, le=30)
    reason: Optional[str] = Field(default="Postponed by student")


class RevisionSkipInput(BaseModel):
    reason: str = Field(..., min_length=2, max_length=255)


class RevisionEventResponse(BaseModel):
    id: int
    revision_plan_id: int
    event_type: str
    previous_due_date: Optional[datetime] = None
    new_due_date: Optional[datetime] = None
    reason: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RevisionOverviewMetrics(BaseModel):
    total_plans: int
    due_today: int
    overdue_count: int
    completed_total: int
    average_confidence: float
    retention_rate_percentage: float
    risk_distribution: Dict[str, int]


class ForgettingRiskItem(BaseModel):
    topic_id: int
    topic_title: str
    subject_name: str
    subject_color: Optional[str] = None
    risk_score: float
    risk_category: str  # Low, Moderate, High, Critical
    current_interval_days: int
    days_since_last_revision: int
    consecutive_failures: int
    reason: str
    recommended_action: str
    suggested_revision_date: datetime


class ScheduleRevisionAsSessionInput(BaseModel):
    scheduled_date: date
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    duration_minutes: int = Field(default=30, ge=10, le=240)
