from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.schemas.revision import (
    RevisionPlanResponse,
    RevisionPlanDetailResponse,
    RevisionAttemptCreate,
    RevisionAttemptResponse,
    RevisionSnoozeInput,
    RevisionSkipInput,
    RevisionEventResponse,
    ScheduleRevisionAsSessionInput,
)
from backend.app.schemas.study_session import StudySessionResponse
from backend.app.services.revision_service import RevisionService

router = APIRouter()


@router.get(
    "",
    response_model=List[RevisionPlanResponse],
    summary="List revision plans with optional filters",
)
def list_revision_plans(
    status: Optional[str] = Query(None, description="Filter by status (scheduled, due, overdue, completed, snoozed, due_or_overdue)"),
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    risk_category: Optional[str] = Query(None, description="Filter by risk category (Low, Moderate, High, Critical)"),
    db: Session = Depends(get_db),
):
    return RevisionService.get_revision_plans(
        db=db,
        status=status,
        subject_id=subject_id,
        risk_category=risk_category,
    )


@router.get(
    "/due",
    response_model=List[RevisionPlanResponse],
    summary="List due and overdue revision plans sorted by priority",
)
def get_due_revisions(db: Session = Depends(get_db)):
    return RevisionService.get_due_revisions(db=db)


@router.get(
    "/overdue",
    response_model=List[RevisionPlanResponse],
    summary="List overdue revision plans",
)
def get_overdue_revisions(db: Session = Depends(get_db)):
    return RevisionService.get_overdue_revisions(db=db)


@router.post(
    "/generate",
    status_code=status.HTTP_200_OK,
    summary="Scan completed or quiz-tested topics and generate missing revision plans",
)
def generate_revision_plans(db: Session = Depends(get_db)):
    created_count = RevisionService.sync_eligible_topics(db=db)
    return {
        "message": f"Successfully synced revision plans. {created_count} new plan(s) initialized.",
        "created_count": created_count,
    }


@router.get(
    "/history",
    response_model=List[RevisionAttemptResponse],
    summary="List past revision attempts across all topics",
)
def get_revision_history(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return RevisionService.get_history(db=db, limit=limit)


@router.get(
    "/topics/{topic_id}/history",
    response_model=List[RevisionAttemptResponse],
    summary="Get revision attempt history for a specific topic",
)
def get_topic_revision_history(
    topic_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return RevisionService.get_history(db=db, topic_id=topic_id, limit=limit)


@router.get(
    "/{revision_id}",
    response_model=RevisionPlanDetailResponse,
    summary="Get detailed revision plan with recent mistakes, sample questions, and prerequisites",
)
def get_revision_plan_detail(
    revision_id: int,
    db: Session = Depends(get_db),
):
    plan = RevisionService.get_revision_detail(db=db, plan_id=revision_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Revision plan with ID {revision_id} not found",
        )
    return plan


@router.get(
    "/{revision_id}/events",
    response_model=List[RevisionEventResponse],
    summary="Get timeline audit events for a revision plan",
)
def get_revision_events(
    revision_id: int,
    db: Session = Depends(get_db),
):
    return RevisionService.get_topic_events(db=db, plan_id=revision_id)


@router.post(
    "/{revision_id}/complete",
    response_model=RevisionAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record revision session attempt, evaluate recall, and adapt next interval",
)
def complete_revision_session(
    revision_id: int,
    input_data: RevisionAttemptCreate,
    db: Session = Depends(get_db),
):
    try:
        attempt_res, _ = RevisionService.complete_revision(
            db=db,
            plan_id=revision_id,
            input_data=input_data,
        )
        return attempt_res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/{revision_id}/snooze",
    response_model=RevisionPlanResponse,
    summary="Snooze a revision plan by N days",
)
def snooze_revision_session(
    revision_id: int,
    input_data: RevisionSnoozeInput,
    db: Session = Depends(get_db),
):
    try:
        return RevisionService.snooze_revision(
            db=db,
            plan_id=revision_id,
            snooze_days=input_data.snooze_days,
            reason=input_data.reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/{revision_id}/skip",
    response_model=RevisionPlanResponse,
    summary="Skip current revision cycle with recorded explanation",
)
def skip_revision_session(
    revision_id: int,
    input_data: RevisionSkipInput,
    db: Session = Depends(get_db),
):
    try:
        return RevisionService.skip_revision(
            db=db,
            plan_id=revision_id,
            reason=input_data.reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/{revision_id}/schedule-session",
    response_model=StudySessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule revision item into the calendar as a study session",
)
def schedule_revision_as_session(
    revision_id: int,
    session_input: ScheduleRevisionAsSessionInput,
    db: Session = Depends(get_db),
):
    try:
        session = RevisionService.schedule_as_study_session(
            db=db,
            plan_id=revision_id,
            session_input=session_input,
        )
        return session
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
