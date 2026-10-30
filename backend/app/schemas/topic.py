from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

TopicStatus = Literal["not_started", "in_progress", "completed"]
TopicPriority = Literal["low", "medium", "high"]


class TopicBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Title of the topic")
    description: Optional[str] = Field(None, description="Optional description of the topic")
    status: TopicStatus = Field("not_started", description="Status: not_started, in_progress, completed")
    priority: TopicPriority = Field("medium", description="Priority: low, medium, high")
    estimated_duration_minutes: int = Field(60, gt=0, description="Estimated study duration in minutes (positive)")


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[TopicStatus] = None
    priority: Optional[TopicPriority] = None
    estimated_duration_minutes: Optional[int] = Field(None, gt=0)


class TopicResponse(TopicBase):
    id: int
    subject_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

