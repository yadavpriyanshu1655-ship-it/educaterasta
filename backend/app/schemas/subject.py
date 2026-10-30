from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from backend.app.schemas.topic import TopicResponse


class SubjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Subject name")
    description: Optional[str] = Field(None, description="Optional subject overview")
    color: Optional[str] = Field("#3b82f6", max_length=30, description="Hex color identifier")


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=30)


class SubjectResponse(SubjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    topic_count: int = 0
    completed_topic_count: int = 0
    progress_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class SubjectDetailResponse(SubjectResponse):
    topics: List[TopicResponse] = Field(default_factory=list)

