import json
from datetime import datetime, timezone
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.quiz import (
    Quiz,
    QuizAttempt,
    AttemptAnswer,
    QuizQuestion,
)
from backend.app.schemas.quiz import (
    QuizStartResponse,
    SaveAnswerRequest,
    SubmitQuizRequest,
    QuizResultResponse,
    QuizAttemptSummaryResponse,
)
from backend.app.services.quiz_service import (
    evaluate_and_submit_attempt,
    format_question_public_response,
    parse_json_safely,
)

router = APIRouter()


@router.get("", response_model=List[QuizAttemptSummaryResponse], summary="List past quiz attempts")
def list_attempts(
    quiz_id: Optional[int] = Query(None, description="Filter by quiz ID"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(QuizAttempt).join(Quiz, QuizAttempt.quiz_id == Quiz.id)
    if quiz_id is not None:
        query = query.filter(QuizAttempt.quiz_id == quiz_id)

    attempts = query.order_by(QuizAttempt.started_at.desc()).limit(limit).all()

    results = []
    for a in attempts:
        quiz = a.quiz
        subject = quiz.subject if quiz else None
        results.append(
            QuizAttemptSummaryResponse(
                id=a.id,
                quiz_id=a.quiz_id,
                quiz_title=quiz.title if quiz else "Quiz",
                subject_name=subject.name if subject else "General",
                subject_color=subject.color if subject else "#3b82f6",
                status=a.status,
                started_at=a.started_at,
                submitted_at=a.submitted_at,
                time_spent_seconds=a.time_spent_seconds,
                total_questions=a.total_questions,
                obtained_marks=a.obtained_marks,
                total_marks=a.total_marks,
                accuracy_percentage=a.accuracy_percentage,
                is_passed=a.is_passed,
            )
        )
    return results


@router.get(
    "/{attempt_id}",
    response_model=Union[QuizResultResponse, QuizStartResponse],
    summary="Get attempt state (persists in-progress state across page refreshes)",
)
def get_attempt(attempt_id: int, db: Session = Depends(get_db)):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz attempt with ID {attempt_id} not found",
        )

    # If completed, return evaluation results
    if attempt.status == "completed":
        return evaluate_and_submit_attempt(db, attempt)

    # If in-progress, return sanitized questions and current answers
    quiz = attempt.quiz
    qq_list = (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz.id)
        .order_by(QuizQuestion.question_order.asc())
        .all()
    )

    saved_answers_records = (
        db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt.id).all()
    )
    saved_answers = {
        ans.question_id: parse_json_safely(ans.selected_answer)
        for ans in saved_answers_records
    }

    sanitized_questions = [
        format_question_public_response(qq.question, order=qq.question_order)
        for qq in qq_list
    ]

    return QuizStartResponse(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        title=quiz.title,
        duration_minutes=quiz.duration_minutes,
        feedback_mode=quiz.feedback_mode,
        started_at=attempt.started_at,
        total_questions=len(sanitized_questions),
        questions=sanitized_questions,
        saved_answers=saved_answers,
    )


@router.post(
    "/{attempt_id}/answers",
    status_code=status.HTTP_200_OK,
    summary="Auto-save answer during active quiz",
)
def save_answer(attempt_id: int, payload: SaveAnswerRequest, db: Session = Depends(get_db)):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz attempt with ID {attempt_id} not found",
        )

    if attempt.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify answers: this quiz attempt has already been submitted.",
        )

    ans_record = (
        db.query(AttemptAnswer)
        .filter(
            AttemptAnswer.attempt_id == attempt.id,
            AttemptAnswer.question_id == payload.question_id,
        )
        .first()
    )

    stored_val = (
        json.dumps(payload.selected_answer)
        if isinstance(payload.selected_answer, (list, dict))
        else str(payload.selected_answer)
        if payload.selected_answer is not None
        else None
    )

    if ans_record:
        ans_record.selected_answer = stored_val
        ans_record.time_spent_seconds = payload.time_spent_seconds or ans_record.time_spent_seconds
    else:
        ans_record = AttemptAnswer(
            attempt_id=attempt.id,
            question_id=payload.question_id,
            selected_answer=stored_val,
            time_spent_seconds=payload.time_spent_seconds or 0,
        )
        db.add(ans_record)

    db.commit()
    return {"message": "Answer saved successfully", "question_id": payload.question_id}


@router.post(
    "/{attempt_id}/submit",
    response_model=QuizResultResponse,
    summary="Submit quiz attempt and evaluate results",
)
def submit_attempt(
    attempt_id: int,
    payload: Optional[SubmitQuizRequest] = None,
    db: Session = Depends(get_db),
):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz attempt with ID {attempt_id} not found",
        )

    # Safe handling of repeated submissions / duplicate clicks
    if attempt.status == "completed":
        return evaluate_and_submit_attempt(db, attempt)

    answers_input = [ans.model_dump() for ans in payload.answers] if payload and payload.answers else None
    return evaluate_and_submit_attempt(db, attempt, answers_input)


@router.get(
    "/{attempt_id}/results",
    response_model=QuizResultResponse,
    summary="Get detailed post-submission quiz results",
)
def get_attempt_results(attempt_id: int, db: Session = Depends(get_db)):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz attempt with ID {attempt_id} not found",
        )

    return evaluate_and_submit_attempt(db, attempt)

