from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="not_started")  # not_started, in_progress, completed
    priority = Column(String(20), nullable=False, default="medium")     # low, medium, high
    estimated_duration_minutes = Column(Integer, nullable=False, default=60)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    subject = relationship("Subject", back_populates="topics")
    study_sessions = relationship("StudySession", back_populates="topic")

