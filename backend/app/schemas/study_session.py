from datetime import date, datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

SessionStatus = Literal["pending", "completed", "missed"]


class StudySessionBase(BaseModel):
    subject_id: int = Field(..., gt=0, description="Associated subject ID")
    topic_id: Optional[int] = Field(None, gt=0, description="Optional associated topic ID")
    title: str = Field(..., min_length=1, max_length=200, description="Session goal or title")
    scheduled_date: date = Field(..., description="Date of the session (YYYY-MM-DD)")
    start_time: Optional[str] = Field(None, max_length=10, description="Start time (e.g. '09:00')")
    planned_duration_minutes: int = Field(..., gt=0, description="Planned study duration in minutes (> 0)")
    actual_duration_minutes: Optional[int] = Field(None, ge=0, description="Actual recorded duration (>= 0)")
    status: SessionStatus = Field("pending", description="Status: pending, completed, missed")
    notes: Optional[str] = Field(None, description="Session notes or reflections")


class StudySessionCreate(StudySessionBase):
    pass


class StudySessionUpdate(BaseModel):
    subject_id: Optional[int] = Field(None, gt=0)
    topic_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    scheduled_date: Optional[date] = None
    start_time: Optional[str] = Field(None, max_length=10)
    planned_duration_minutes: Optional[int] = Field(None, gt=0)
    actual_duration_minutes: Optional[int] = Field(None, ge=0)
    status: Optional[SessionStatus] = None
    notes: Optional[str] = None


class StudySessionResponse(StudySessionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    subject_name: Optional[str] = None
    subject_color: Optional[str] = None
    topic_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

