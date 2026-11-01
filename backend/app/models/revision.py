from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class RevisionPlan(Base):
    __tablename__ = "revision_plans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    topic_id = Column(
        Integer,
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    current_interval_days = Column(Integer, nullable=False, default=1)
    last_revision_at = Column(DateTime(timezone=True), nullable=True)
    next_revision_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revision_count = Column(Integer, nullable=False, default=0)
    consecutive_successes = Column(Integer, nullable=False, default=0)
    consecutive_failures = Column(Integer, nullable=False, default=0)
    risk_score = Column(Float, nullable=False, default=0.2)
    risk_category = Column(String(20), nullable=False, default="Low")  # Low, Moderate, High, Critical
    status = Column(String(20), nullable=False, default="scheduled")   # scheduled, due, overdue, completed, snoozed
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    topic = relationship("Topic", back_populates="revision_plan")
    subject = relationship("Subject", back_populates="revision_plans")
    attempts = relationship(
        "RevisionAttempt",
        back_populates="revision_plan",
        cascade="all, delete-orphan",
        order_by="desc(RevisionAttempt.completed_at)",
    )
    events = relationship(
        "RevisionEvent",
        back_populates="revision_plan",
        cascade="all, delete-orphan",
        order_by="desc(RevisionEvent.created_at)",
    )


class RevisionAttempt(Base):
    __tablename__ = "revision_attempts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    revision_plan_id = Column(
        Integer,
        ForeignKey("revision_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id = Column(
        Integer,
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=15)
    confidence_rating = Column(Integer, nullable=False)  # 1 to 5 scale
    quiz_accuracy = Column(Float, nullable=True)
    self_assessment = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    result = Column(String(20), nullable=False, default="success")  # success, partial, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    revision_plan = relationship("RevisionPlan", back_populates="attempts")
    topic = relationship("Topic")


class RevisionEvent(Base):
    __tablename__ = "revision_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    revision_plan_id = Column(
        Integer,
        ForeignKey("revision_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(String(30), nullable=False)  # created, completed, snoozed, skipped, rescheduled, auto_generated
    previous_due_date = Column(DateTime(timezone=True), nullable=True)
    new_due_date = Column(DateTime(timezone=True), nullable=True)
    reason = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    revision_plan = relationship("RevisionPlan", back_populates="events")
