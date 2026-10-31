from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.preference import UnavailableBlock, ScheduleHistory
from backend.app.schemas.planner import (
    StudyPreferenceResponse,
    StudyPreferenceUpdate,
    UnavailableBlockCreate,
    UnavailableBlockResponse,
    ScheduleHistoryResponse,
    PlanGenerateRequest,
    GeneratedPlanResponse,
    ConfirmPlanRequest,
    RecoverMissedRequest,
    RecoverMissedResponse,
)
from backend.app.services.scheduling_engine import (
    get_or_create_preferences,
    update_preferences,
    generate_intelligent_study_plan,
    confirm_study_plan,
    recover_missed_study_sessions,
)

router = APIRouter()


@router.post(
    "/generate",
    response_model=GeneratedPlanResponse,
    summary="Generate an intelligent, constraint-aware study plan",
    description="Calculates topic priorities based on exam deadlines and packs tasks into available time slots without persisting.",
)
def generate_plan(payload: PlanGenerateRequest, db: Session = Depends(get_db)):
    return generate_intelligent_study_plan(db, payload)


@router.post(
    "/preview-reschedule",
    response_model=GeneratedPlanResponse,
    summary="Preview study plan adjustments",
    description="Identical to /generate; previews the effect of modified availability and exam constraints without committing changes.",
)
def preview_reschedule(payload: PlanGenerateRequest, db: Session = Depends(get_db)):
    return generate_intelligent_study_plan(db, payload)


@router.post(
    "/confirm-plan",
    status_code=status.HTTP_201_CREATED,
    summary="Confirm and apply proposed study sessions to database",
    description="Creates persistent StudySession records. In 'replace_pending' mode, existing pending sessions in the window are safely replaced while completed sessions are preserved.",
)
def confirm_plan(payload: ConfirmPlanRequest, db: Session = Depends(get_db)):
    created_count = confirm_study_plan(db, payload)
    return {
        "status": "success",
        "message": f"Successfully scheduled {created_count} study session(s).",
        "sessions_created": created_count,
    }


@router.post(
    "/recover-missed",
    response_model=RecoverMissedResponse,
    summary="Detect and recover missed study sessions",
    description="Scans past sessions for missed/overdue work and finds the earliest feasible recovery windows before exam deadlines.",
)
def recover_missed(payload: RecoverMissedRequest, db: Session = Depends(get_db)):
    return recover_missed_study_sessions(db, payload)


@router.get(
    "/preferences",
    response_model=StudyPreferenceResponse,
    summary="Get user study availability preferences",
)
def get_preferences(db: Session = Depends(get_db)):
    return get_or_create_preferences(db)


@router.put(
    "/preferences",
    response_model=StudyPreferenceResponse,
    summary="Update study availability preferences and Exam Survival Mode",
)
def put_preferences(payload: StudyPreferenceUpdate, db: Session = Depends(get_db)):
    return update_preferences(db, payload)


@router.get(
    "/unavailable-blocks",
    response_model=List[UnavailableBlockResponse],
    summary="List recurring unavailable time blocks",
)
def list_unavailable_blocks(db: Session = Depends(get_db)):
    return db.query(UnavailableBlock).order_by(UnavailableBlock.day_of_week.asc()).all()


@router.post(
    "/unavailable-blocks",
    response_model=UnavailableBlockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a recurring unavailable time block",
)
def create_unavailable_block(payload: UnavailableBlockCreate, db: Session = Depends(get_db)):
    block = UnavailableBlock(
        title=payload.title,
        day_of_week=payload.day_of_week.lower(),
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.delete(
    "/unavailable-blocks/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an unavailable time block",
)
def delete_unavailable_block(block_id: int, db: Session = Depends(get_db)):
    block = db.query(UnavailableBlock).filter(UnavailableBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unavailable block with ID {block_id} not found",
        )
    db.delete(block)
    db.commit()
    return None


@router.get(
    "/history",
    response_model=List[ScheduleHistoryResponse],
    summary="Get audit log of generated and recovered study plans",
)
def get_history(db: Session = Depends(get_db)):
    return (
        db.query(ScheduleHistory)
        .order_by(ScheduleHistory.created_at.desc())
        .limit(20)
        .all()
    )

