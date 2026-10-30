from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ExamBase(BaseModel):
    subject_id: int = Field(..., gt=0, description="Associated subject ID")
    title: str = Field(..., min_length=1, max_length=200, description="Exam title")
    exam_date: date = Field(..., description="Date of the examination (YYYY-MM-DD)")
    notes: Optional[str] = Field(None, description="Optional exam notes or syllabus instructions")


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    subject_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    exam_date: Optional[date] = None
    notes: Optional[str] = None


class ExamResponse(ExamBase):
    id: int
    created_at: datetime
    updated_at: datetime
    subject_name: Optional[str] = None
    subject_color: Optional[str] = None
    days_remaining: int = 0
    is_today: bool = False
    is_past: bool = False

    model_config = ConfigDict(from_attributes=True)

