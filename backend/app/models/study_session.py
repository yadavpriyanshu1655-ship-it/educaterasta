from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id = Column(
        Integer,
        ForeignKey("topics.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title = Column(String(200), nullable=False)
    scheduled_date = Column(Date, nullable=False, index=True)
    start_time = Column(String(10), nullable=True)  # e.g., "09:30"
    planned_duration_minutes = Column(Integer, nullable=False)
    actual_duration_minutes = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # pending, completed, missed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    subject = relationship("Subject", back_populates="study_sessions")
    topic = relationship("Topic", back_populates="study_sessions")

