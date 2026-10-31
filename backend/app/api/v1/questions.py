import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.quiz import Question
from backend.app.schemas.quiz import (
    QuestionCreate,
    QuestionUpdate,
    QuestionDetailResponse,
)
from backend.app.services.quiz_service import format_question_detail_response

router = APIRouter()


@router.get("", response_model=List[QuestionDetailResponse], summary="List questions with optional filters")
def list_questions(
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    topic_id: Optional[int] = Query(None, description="Filter by topic ID"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (easy, medium, hard)"),
    question_type: Optional[str] = Query(
        None,
        description="Filter by type (single_choice, multiple_select, true_false, short_answer)",
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Question)
    if subject_id is not None:
        query = query.filter(Question.subject_id == subject_id)
    if topic_id is not None:
        query = query.filter(Question.topic_id == topic_id)
    if difficulty is not None:
        query = query.filter(Question.difficulty == difficulty)
    if question_type is not None:
        query = query.filter(Question.question_type == question_type)

    questions = query.order_by(Question.created_at.desc()).all()
    return [format_question_detail_response(q) for q in questions]


@router.post(
    "",
    response_model=QuestionDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new question in the Question Bank",
)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db)):
    # Validate subject and topic exist
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {payload.subject_id} not found",
        )

    topic = db.query(Topic).filter(Topic.id == payload.topic_id).first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with ID {payload.topic_id} not found",
        )

    if topic.subject_id != payload.subject_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Topic {payload.topic_id} does not belong to Subject {payload.subject_id}",
        )

    # Encode options and correct answer to JSON
    options_json = (
        json.dumps([opt.model_dump() for opt in payload.options])
        if payload.options
        else None
    )
    correct_ans_str = (
        json.dumps(payload.correct_answer)
        if isinstance(payload.correct_answer, list)
        else str(payload.correct_answer).strip()
    )

    q = Question(
        subject_id=payload.subject_id,
        topic_id=payload.topic_id,
        question_text=payload.question_text.strip(),
        question_type=payload.question_type,
        difficulty=payload.difficulty,
        options=options_json,
        correct_answer=correct_ans_str,
        explanation=payload.explanation.strip() if payload.explanation else None,
        marks=payload.marks,
        negative_marks=payload.negative_marks,
        source=payload.source.strip() if payload.source else None,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return format_question_detail_response(q)


@router.get("/{question_id}", response_model=QuestionDetailResponse, summary="Get question details")
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found",
        )
    return format_question_detail_response(q)


@router.patch("/{question_id}", response_model=QuestionDetailResponse, summary="Update question")
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found",
        )

    if payload.subject_id is not None:
        sub = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {payload.subject_id} not found",
            )
        q.subject_id = payload.subject_id

    if payload.topic_id is not None:
        top = db.query(Topic).filter(Topic.id == payload.topic_id).first()
        if not top:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Topic with ID {payload.topic_id} not found",
            )
        q.topic_id = payload.topic_id

    if payload.question_text is not None:
        q.question_text = payload.question_text.strip()
    if payload.question_type is not None:
        q.question_type = payload.question_type
    if payload.difficulty is not None:
        q.difficulty = payload.difficulty
    if payload.options is not None:
        q.options = json.dumps([opt.model_dump() for opt in payload.options])
    if payload.correct_answer is not None:
        q.correct_answer = (
            json.dumps(payload.correct_answer)
            if isinstance(payload.correct_answer, list)
            else str(payload.correct_answer).strip()
        )
    if payload.explanation is not None:
        q.explanation = payload.explanation.strip() if payload.explanation else None
    if payload.marks is not None:
        q.marks = payload.marks
    if payload.negative_marks is not None:
        q.negative_marks = payload.negative_marks
    if payload.source is not None:
        q.source = payload.source.strip() if payload.source else None

    db.commit()
    db.refresh(q)
    return format_question_detail_response(q)


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete question")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found",
        )
    db.delete(q)
    db.commit()
    return None

