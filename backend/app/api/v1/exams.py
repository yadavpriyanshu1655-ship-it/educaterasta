from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.subject import Subject
from backend.app.models.exam import Exam
from backend.app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from backend.app.services.study_service import format_exam_response

router = APIRouter()


@router.get("", response_model=List[ExamResponse], summary="List all examinations with countdown calculations")
def list_exams(db: Session = Depends(get_db)):
    exams = db.query(Exam).order_by(Exam.exam_date.asc()).all()
    return [format_exam_response(e) for e in exams]


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED, summary="Create an examination")
def create_exam(payload: ExamCreate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {payload.subject_id} not found",
        )

    exam = Exam(
        subject_id=payload.subject_id,
        title=payload.title,
        exam_date=payload.exam_date,
        notes=payload.notes,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return format_exam_response(exam)


@router.patch("/{exam_id}", response_model=ExamResponse, summary="Update examination details")
def update_exam(exam_id: int, payload: ExamUpdate, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found",
        )

    if payload.subject_id is not None and payload.subject_id != exam.subject_id:
        subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {payload.subject_id} not found",
            )
        exam.subject_id = payload.subject_id

    if payload.title is not None:
        exam.title = payload.title
    if payload.exam_date is not None:
        exam.exam_date = payload.exam_date
    if payload.notes is not None:
        exam.notes = payload.notes

    db.commit()
    db.refresh(exam)
    return format_exam_response(exam)


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an examination")
def delete_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found",
        )
    db.delete(exam)
    db.commit()
    return None

