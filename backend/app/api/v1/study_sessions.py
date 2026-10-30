from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.study_session import StudySession
from backend.app.schemas.study_session import StudySessionCreate, StudySessionUpdate, StudySessionResponse
from backend.app.services.study_service import format_study_session_response

router = APIRouter()


@router.get("", response_model=List[StudySessionResponse], summary="List study sessions with optional filters")
def list_study_sessions(
    scheduled_date: Optional[date] = Query(None, description="Filter by scheduled date"),
    start_date: Optional[date] = Query(None, description="Filter from start date"),
    end_date: Optional[date] = Query(None, description="Filter to end date"),
    status: Optional[str] = Query(None, description="Filter by status (pending, completed, missed)"),
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    db: Session = Depends(get_db),
):
    query = db.query(StudySession)

    if scheduled_date is not None:
        query = query.filter(StudySession.scheduled_date == scheduled_date)
    if start_date is not None:
        query = query.filter(StudySession.scheduled_date >= start_date)
    if end_date is not None:
        query = query.filter(StudySession.scheduled_date <= end_date)
    if status is not None:
        query = query.filter(StudySession.status == status)
    if subject_id is not None:
        query = query.filter(StudySession.subject_id == subject_id)

    sessions = query.order_by(StudySession.scheduled_date.asc(), StudySession.start_time.asc()).all()
    return [format_study_session_response(s) for s in sessions]


@router.post(
    "",
    response_model=StudySessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new study session",
)
def create_study_session(payload: StudySessionCreate, db: Session = Depends(get_db)):
    # Verify subject exists
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {payload.subject_id} not found",
        )

    # If topic_id provided, verify topic exists and belongs to subject
    if payload.topic_id is not None:
        topic = db.query(Topic).filter(Topic.id == payload.topic_id).first()
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Topic with ID {payload.topic_id} not found",
            )
        if topic.subject_id != payload.subject_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Topic ID {payload.topic_id} does not belong to subject ID {payload.subject_id}",
            )

    session = StudySession(
        subject_id=payload.subject_id,
        topic_id=payload.topic_id,
        title=payload.title,
        scheduled_date=payload.scheduled_date,
        start_time=payload.start_time,
        planned_duration_minutes=payload.planned_duration_minutes,
        actual_duration_minutes=payload.actual_duration_minutes,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return format_study_session_response(session)


@router.get("/{session_id}", response_model=StudySessionResponse, summary="Get study session details")
def get_study_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study session with ID {session_id} not found",
        )
    return format_study_session_response(session)


@router.patch("/{session_id}", response_model=StudySessionResponse, summary="Update study session")
def update_study_session(session_id: int, payload: StudySessionUpdate, db: Session = Depends(get_db)):
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study session with ID {session_id} not found",
        )

    target_subject_id = payload.subject_id if payload.subject_id is not None else session.subject_id

    # If subject_id changing, verify it exists
    if payload.subject_id is not None and payload.subject_id != session.subject_id:
        subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {payload.subject_id} not found",
            )
        session.subject_id = payload.subject_id

    # If topic_id is specified
    if payload.topic_id is not None:
        topic = db.query(Topic).filter(Topic.id == payload.topic_id).first()
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Topic with ID {payload.topic_id} not found",
            )
        if topic.subject_id != target_subject_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Topic ID {payload.topic_id} does not belong to subject ID {target_subject_id}",
            )
        session.topic_id = payload.topic_id

    if payload.title is not None:
        session.title = payload.title
    if payload.scheduled_date is not None:
        session.scheduled_date = payload.scheduled_date
    if payload.start_time is not None:
        session.start_time = payload.start_time
    if payload.planned_duration_minutes is not None:
        session.planned_duration_minutes = payload.planned_duration_minutes
    if payload.actual_duration_minutes is not None:
        session.actual_duration_minutes = payload.actual_duration_minutes
    if payload.status is not None:
        session.status = payload.status
    if payload.notes is not None:
        session.notes = payload.notes

    db.commit()
    db.refresh(session)
    return format_study_session_response(session)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a study session")
def delete_study_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study session with ID {session_id} not found",
        )
    db.delete(session)
    db.commit()
    return None

