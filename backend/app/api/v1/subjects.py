from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse, SubjectDetailResponse
from backend.app.schemas.topic import TopicCreate, TopicResponse
from backend.app.services.study_service import (
    format_subject_response,
    format_subject_detail_response,
)

router = APIRouter()


@router.get("", response_model=List[SubjectResponse], summary="List all subjects with progress metrics")
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).order_by(Subject.name.asc()).all()
    return [format_subject_response(s, db) for s in subjects]


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED, summary="Create a new subject")
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Subject).filter(Subject.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject with name '{payload.name}' already exists",
        )

    subject = Subject(
        name=payload.name,
        description=payload.description,
        color=payload.color or "#3b82f6",
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return format_subject_response(subject, db)


@router.get("/{subject_id}", response_model=SubjectDetailResponse, summary="Get subject details with topic list")
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found",
        )
    return format_subject_detail_response(subject, db)


@router.patch("/{subject_id}", response_model=SubjectResponse, summary="Update subject details")
def update_subject(subject_id: int, payload: SubjectUpdate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found",
        )

    if payload.name is not None and payload.name != subject.name:
        conflict = db.query(Subject).filter(Subject.name == payload.name).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subject with name '{payload.name}' already exists",
            )
        subject.name = payload.name

    if payload.description is not None:
        subject.description = payload.description
    if payload.color is not None:
        subject.color = payload.color

    db.commit()
    db.refresh(subject)
    return format_subject_response(subject, db)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a subject and child entities")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found",
        )
    db.delete(subject)
    db.commit()
    return None


# --- Nested Topic Endpoints ---

@router.get("/{subject_id}/topics", response_model=List[TopicResponse], summary="List all topics for a subject")
def list_subject_topics(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found",
        )
    topics = db.query(Topic).filter(Topic.subject_id == subject_id).order_by(Topic.id.asc()).all()
    return [TopicResponse.model_validate(t) for t in topics]


@router.post(
    "/{subject_id}/topics",
    response_model=TopicResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a topic under a subject",
)
def create_subject_topic(subject_id: int, payload: TopicCreate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found",
        )

    topic = Topic(
        subject_id=subject_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        estimated_duration_minutes=payload.estimated_duration_minutes,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return TopicResponse.model_validate(topic)

