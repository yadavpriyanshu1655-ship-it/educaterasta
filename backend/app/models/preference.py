from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, func
from backend.app.core.database import Base


class StudyPreference(Base):
    __tablename__ = "study_preferences"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    daily_target_hours = Column(Float, nullable=False, default=3.0)
    preferred_start_time = Column(String(10), nullable=False, default="09:00")
    preferred_end_time = Column(String(10), nullable=False, default="21:00")
    max_session_duration_minutes = Column(Integer, nullable=False, default=60)
    break_duration_minutes = Column(Integer, nullable=False, default=15)
    available_days = Column(String(50), nullable=False, default="mon,tue,wed,thu,fri,sat,sun")
    exam_survival_mode = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UnavailableBlock(Base):
    __tablename__ = "unavailable_blocks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    day_of_week = Column(String(20), nullable=False, default="all")  # mon, tue, wed, thu, fri, sat, sun, all
    start_time = Column(String(10), nullable=False)  # "10:00"
    end_time = Column(String(10), nullable=False)    # "13:00"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ScheduleHistory(Base):
    __tablename__ = "schedule_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    action = Column(String(50), nullable=False)  # generate_plan, recover_missed, reschedule, confirm_plan
    summary = Column(Text, nullable=False)
    sessions_created = Column(Integer, nullable=False, default=0)
    exam_survival_mode = Column(Boolean, nullable=False, default=False)
    details = Column(Text, nullable=True)  # JSON formatted metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

