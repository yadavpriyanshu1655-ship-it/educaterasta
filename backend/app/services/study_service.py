from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.study_session import StudySession
from backend.app.models.exam import Exam
from backend.app.schemas.subject import SubjectResponse, SubjectDetailResponse
from backend.app.schemas.topic import TopicResponse
from backend.app.schemas.study_session import StudySessionResponse
from backend.app.schemas.exam import ExamResponse
from backend.app.schemas.dashboard import DashboardSummary, SubjectProgressSummary
from backend.app.schemas.analytics import AnalyticsOverview, SessionStatusBreakdown, StudyTimeMetrics


def calculate_progress_percentage(completed: int, total: int) -> float:
    """Calculates completion percentage rounded to 1 decimal place; returns 0.0 if total is 0."""
    if total <= 0:
        return 0.0
    return round((completed / total) * 100.0, 1)


def format_subject_response(subject: Subject, db: Session) -> SubjectResponse:
    """Calculates subject topic counts and progress percentage."""
    topics = db.query(Topic).filter(Topic.subject_id == subject.id).all()
    total_topics = len(topics)
    completed_topics = sum(1 for t in topics if t.status == "completed")
    progress = calculate_progress_percentage(completed_topics, total_topics)

    return SubjectResponse(
        id=subject.id,
        name=subject.name,
        description=subject.description,
        color=subject.color or "#3b82f6",
        created_at=subject.created_at,
        updated_at=subject.updated_at,
        topic_count=total_topics,
        completed_topic_count=completed_topics,
        progress_percentage=progress,
    )


def format_subject_detail_response(subject: Subject, db: Session) -> SubjectDetailResponse:
    """Formats full subject details including all topics and progress metrics."""
    base_res = format_subject_response(subject, db)
    topics = db.query(Topic).filter(Topic.subject_id == subject.id).order_by(Topic.id.asc()).all()
    topic_responses = [TopicResponse.model_validate(t) for t in topics]

    return SubjectDetailResponse(
        id=base_res.id,
        name=base_res.name,
        description=base_res.description,
        color=base_res.color,
        created_at=base_res.created_at,
        updated_at=base_res.updated_at,
        topic_count=base_res.topic_count,
        completed_topic_count=base_res.completed_topic_count,
        progress_percentage=base_res.progress_percentage,
        topics=topic_responses,
    )


def format_study_session_response(session: StudySession) -> StudySessionResponse:
    """Enriches study session response with subject and topic names."""
    subject_name = session.subject.name if session.subject else None
    subject_color = session.subject.color if session.subject else "#3b82f6"
    topic_title = session.topic.title if session.topic else None

    return StudySessionResponse(
        id=session.id,
        subject_id=session.subject_id,
        topic_id=session.topic_id,
        title=session.title,
        scheduled_date=session.scheduled_date,
        start_time=session.start_time,
        planned_duration_minutes=session.planned_duration_minutes,
        actual_duration_minutes=session.actual_duration_minutes,
        status=session.status,
        notes=session.notes,
        created_at=session.created_at,
        updated_at=session.updated_at,
        subject_name=subject_name,
        subject_color=subject_color,
        topic_title=topic_title,
    )


def format_exam_response(exam: Exam, reference_date: Optional[date] = None) -> ExamResponse:
    """Enriches exam response with days remaining and date status flags."""
    today = reference_date or date.today()
    days_remaining = (exam.exam_date - today).days
    is_today = (days_remaining == 0)
    is_past = (days_remaining < 0)

    subject_name = exam.subject.name if exam.subject else None
    subject_color = exam.subject.color if exam.subject else "#3b82f6"

    return ExamResponse(
        id=exam.id,
        subject_id=exam.subject_id,
        title=exam.title,
        exam_date=exam.exam_date,
        notes=exam.notes,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        subject_name=subject_name,
        subject_color=subject_color,
        days_remaining=days_remaining,
        is_today=is_today,
        is_past=is_past,
    )


def get_dashboard_summary_data(db: Session, today: Optional[date] = None) -> DashboardSummary:
    """Aggregates all core KPIs for the main dashboard view."""
    current_date = today or date.today()

    subjects = db.query(Subject).all()
    total_subjects = len(subjects)

    topics = db.query(Topic).all()
    total_topics = len(topics)
    completed_topics = sum(1 for t in topics if t.status == "completed")
    overall_syllabus_progress = calculate_progress_percentage(completed_topics, total_topics)

    sessions = db.query(StudySession).all()
    total_study_sessions = len(sessions)
    completed_study_sessions = sum(1 for s in sessions if s.status == "completed")
    pending_study_sessions = sum(1 for s in sessions if s.status == "pending")
    missed_study_sessions = sum(1 for s in sessions if s.status == "missed")

    total_planned_minutes = sum(s.planned_duration_minutes for s in sessions if s.planned_duration_minutes)
    total_actual_minutes = sum(
        s.actual_duration_minutes for s in sessions if s.status == "completed" and s.actual_duration_minutes is not None
    )

    # Today's sessions
    todays_raw_sessions = (
        db.query(StudySession)
        .filter(StudySession.scheduled_date == current_date)
        .order_by(StudySession.start_time.asc())
        .all()
    )
    todays_sessions = [format_study_session_response(s) for s in todays_raw_sessions]

    # Upcoming examinations (exam_date >= current_date)
    upcoming_raw_exams = (
        db.query(Exam)
        .filter(Exam.exam_date >= current_date)
        .order_by(Exam.exam_date.asc())
        .limit(5)
        .all()
    )
    upcoming_exams = [format_exam_response(e, current_date) for e in upcoming_raw_exams]

    # Subject-wise progress summary
    subject_progress_list: List[SubjectProgressSummary] = []
    for s in subjects:
        sub_topics = [t for t in topics if t.subject_id == s.id]
        total_sub_topics = len(sub_topics)
        sub_completed = sum(1 for t in sub_topics if t.status == "completed")
        sub_in_progress = sum(1 for t in sub_topics if t.status == "in_progress")
        sub_not_started = sum(1 for t in sub_topics if t.status == "not_started")
        progress = calculate_progress_percentage(sub_completed, total_sub_topics)

        subject_progress_list.append(
            SubjectProgressSummary(
                subject_id=s.id,
                subject_name=s.name,
                color=s.color or "#3b82f6",
                total_topics=total_sub_topics,
                completed_topics=sub_completed,
                in_progress_topics=sub_in_progress,
                not_started_topics=sub_not_started,
                progress_percentage=progress,
            )
        )

    # Recent study activity (last 5 sessions created or updated)
    recent_raw = (
        db.query(StudySession)
        .order_by(StudySession.updated_at.desc(), StudySession.id.desc())
        .limit(5)
        .all()
    )
    recent_activity = [format_study_session_response(s) for s in recent_raw]

    return DashboardSummary(
        total_subjects=total_subjects,
        total_topics=total_topics,
        completed_topics=completed_topics,
        overall_syllabus_progress=overall_syllabus_progress,
        total_study_sessions=total_study_sessions,
        completed_study_sessions=completed_study_sessions,
        pending_study_sessions=pending_study_sessions,
        missed_study_sessions=missed_study_sessions,
        total_planned_minutes=total_planned_minutes,
        total_actual_minutes=total_actual_minutes,
        todays_sessions=todays_sessions,
        upcoming_exams=upcoming_exams,
        subject_progress=subject_progress_list,
        recent_activity=recent_activity,
    )


def get_analytics_overview_data(db: Session, today: Optional[date] = None) -> AnalyticsOverview:
    """Aggregates analytics: completion rate, session status, time comparisons, and exam countdowns."""
    current_date = today or date.today()

    topics = db.query(Topic).all()
    total_topics = len(topics)
    completed_topics = sum(1 for t in topics if t.status == "completed")
    overall_rate = calculate_progress_percentage(completed_topics, total_topics)

    sessions = db.query(StudySession).all()
    completed_sessions = sum(1 for s in sessions if s.status == "completed")
    pending_sessions = sum(1 for s in sessions if s.status == "pending")
    missed_sessions = sum(1 for s in sessions if s.status == "missed")

    total_planned = sum(s.planned_duration_minutes for s in sessions if s.planned_duration_minutes)
    total_actual = sum(
        s.actual_duration_minutes for s in sessions if s.status == "completed" and s.actual_duration_minutes is not None
    )

    # Priority distribution across all topics
    priority_distribution: Dict[str, int] = {
        "high": sum(1 for t in topics if t.priority == "high"),
        "medium": sum(1 for t in topics if t.priority == "medium"),
        "low": sum(1 for t in topics if t.priority == "low"),
    }

    # Upcoming exams
    upcoming_raw_exams = (
        db.query(Exam)
        .filter(Exam.exam_date >= current_date)
        .order_by(Exam.exam_date.asc())
        .all()
    )
    upcoming_exams = [format_exam_response(e, current_date) for e in upcoming_raw_exams]

    # Subject completion rates
    subjects = db.query(Subject).all()
    subject_completion_rates: List[SubjectProgressSummary] = []
    for s in subjects:
        sub_topics = [t for t in topics if t.subject_id == s.id]
        total_sub_topics = len(sub_topics)
        sub_completed = sum(1 for t in sub_topics if t.status == "completed")
        sub_in_progress = sum(1 for t in sub_topics if t.status == "in_progress")
        sub_not_started = sum(1 for t in sub_topics if t.status == "not_started")
        progress = calculate_progress_percentage(sub_completed, total_sub_topics)

        subject_completion_rates.append(
            SubjectProgressSummary(
                subject_id=s.id,
                subject_name=s.name,
                color=s.color or "#3b82f6",
                total_topics=total_sub_topics,
                completed_topics=sub_completed,
                in_progress_topics=sub_in_progress,
                not_started_topics=sub_not_started,
                progress_percentage=progress,
            )
        )

    return AnalyticsOverview(
        overall_completion_rate=overall_rate,
        sessions_breakdown=SessionStatusBreakdown(
            completed=completed_sessions,
            pending=pending_sessions,
            missed=missed_sessions,
            total=len(sessions),
        ),
        time_metrics=StudyTimeMetrics(
            total_planned_minutes=total_planned,
            total_actual_minutes=total_actual,
            total_planned_hours=round(total_planned / 60.0, 1),
            total_actual_hours=round(total_actual / 60.0, 1),
        ),
        subject_completion_rates=subject_completion_rates,
        upcoming_exams_count=len(upcoming_exams),
        upcoming_exams=upcoming_exams,
        priority_distribution=priority_distribution,
    )

