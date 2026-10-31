import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.quiz import (
    Quiz,
    QuizTopic,
    Question,
    QuizQuestion,
    QuizAttempt,
    AttemptAnswer,
)
from backend.app.schemas.quiz import (
    QuizCreate,
    QuizUpdate,
    QuizSummaryResponse,
    QuizStartResponse,
    AdaptiveQuestionResponse,
)
from backend.app.services.quiz_service import (
    format_quiz_summary_response,
    format_question_public_response,
    get_next_adaptive_question,
    parse_json_safely,
)

router = APIRouter()


@router.get("", response_model=List[QuizSummaryResponse], summary="List all quizzes with optional filters")
def list_quizzes(
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (easy, medium, hard)"),
    status: Optional[str] = Query(None, description="Filter by status (draft, published)"),
    db: Session = Depends(get_db),
):
    query = db.query(Quiz)
    if subject_id is not None:
        query = query.filter(Quiz.subject_id == subject_id)
    if difficulty is not None:
        query = query.filter(Quiz.difficulty == difficulty)
    if status is not None:
        query = query.filter(Quiz.status == status)

    quizzes = query.order_by(Quiz.created_at.desc()).all()
    return [format_quiz_summary_response(q) for q in quizzes]


@router.post(
    "",
    response_model=QuizSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new quiz",
)
def create_quiz(payload: QuizCreate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {payload.subject_id} not found",
        )

    quiz = Quiz(
        subject_id=payload.subject_id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        duration_minutes=payload.duration_minutes,
        difficulty=payload.difficulty,
        passing_percentage=payload.passing_percentage,
        status=payload.status,
        feedback_mode=payload.feedback_mode,
    )
    db.add(quiz)
    db.flush()

    # Associate topics
    if payload.topic_ids:
        for tid in payload.topic_ids:
            topic = db.query(Topic).filter(Topic.id == tid).first()
            if topic:
                db.add(QuizTopic(quiz_id=quiz.id, topic_id=tid))

    # Associate questions in order
    if payload.question_ids:
        for idx, qid in enumerate(payload.question_ids, start=1):
            q = db.query(Question).filter(Question.id == qid).first()
            if q:
                db.add(QuizQuestion(quiz_id=quiz.id, question_id=qid, question_order=idx))

    db.commit()
    db.refresh(quiz)
    return format_quiz_summary_response(quiz)


@router.get("/adaptive/next-question", response_model=AdaptiveQuestionResponse, summary="Get next adaptive practice question")
def get_adaptive_question(
    subject_id: int = Query(..., description="Subject ID for practice"),
    topic_id: Optional[int] = Query(None, description="Optional topic ID"),
    db: Session = Depends(get_db),
):
    result = get_next_adaptive_question(db, subject_id, topic_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No suitable practice questions found for this subject/topic",
        )

    question, reason, mastery = result
    pub_q = format_question_public_response(question)

    return AdaptiveQuestionResponse(
        question=pub_q,
        topic_id=question.topic_id,
        topic_title=question.topic.title if question.topic else "",
        subject_id=question.subject_id,
        subject_name=question.subject.name if question.subject else "",
        difficulty=question.difficulty,
        current_topic_mastery=mastery,
        reason=reason,
    )


@router.get("/{quiz_id}", response_model=QuizSummaryResponse, summary="Get quiz details")
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID {quiz_id} not found",
        )
    return format_quiz_summary_response(quiz)


@router.patch("/{quiz_id}", response_model=QuizSummaryResponse, summary="Update quiz")
def update_quiz(quiz_id: int, payload: QuizUpdate, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID {quiz_id} not found",
        )

    if payload.subject_id is not None:
        sub = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {payload.subject_id} not found",
            )
        quiz.subject_id = payload.subject_id

    if payload.title is not None:
        quiz.title = payload.title.strip()
    if payload.description is not None:
        quiz.description = payload.description.strip() if payload.description else None
    if payload.duration_minutes is not None:
        quiz.duration_minutes = payload.duration_minutes
    if payload.difficulty is not None:
        quiz.difficulty = payload.difficulty
    if payload.passing_percentage is not None:
        quiz.passing_percentage = payload.passing_percentage
    if payload.status is not None:
        quiz.status = payload.status
    if payload.feedback_mode is not None:
        quiz.feedback_mode = payload.feedback_mode

    # Update topics if provided
    if payload.topic_ids is not None:
        db.query(QuizTopic).filter(QuizTopic.quiz_id == quiz.id).delete()
        for tid in payload.topic_ids:
            db.add(QuizTopic(quiz_id=quiz.id, topic_id=tid))

    # Update questions if provided
    if payload.question_ids is not None:
        db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).delete()
        for idx, qid in enumerate(payload.question_ids, start=1):
            db.add(QuizQuestion(quiz_id=quiz.id, question_id=qid, question_order=idx))

    db.commit()
    db.refresh(quiz)
    return format_quiz_summary_response(quiz)


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete quiz")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID {quiz_id} not found",
        )
    db.delete(quiz)
    db.commit()
    return None


@router.post(
    "/{quiz_id}/start",
    response_model=QuizStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new quiz attempt (sanitized questions without answer keys)",
)
def start_quiz_attempt(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID {quiz_id} not found",
        )

    # Fetch quiz questions
    qq_list = (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz.id)
        .order_by(QuizQuestion.question_order.asc())
        .all()
    )

    if not qq_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start quiz: this quiz has no questions assigned yet.",
        )

    # Create new attempt record
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        status="in_progress",
        started_at=datetime.now(timezone.utc),
        total_questions=len(qq_list),
        unanswered_questions=len(qq_list),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Sanitize questions (never expose correct_answer or explanation)
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
        saved_answers={},
    )

