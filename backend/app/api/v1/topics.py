from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.topic import Topic
from backend.app.models.quiz import TopicPrerequisite
from backend.app.schemas.topic import TopicUpdate, TopicResponse
from backend.app.schemas.quiz import (
    PrerequisiteCreateInput,
    PrerequisiteResponse,
    TopicDependenciesResponse,
)
from backend.app.services.quiz_service import add_topic_prerequisite

router = APIRouter()


@router.patch("/{topic_id}", response_model=TopicResponse, summary="Update topic details or status")
def update_topic(topic_id: int, payload: TopicUpdate, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with ID {topic_id} not found",
        )

    if payload.title is not None:
        topic.title = payload.title
    if payload.description is not None:
        topic.description = payload.description
    if payload.status is not None:
        topic.status = payload.status
        if payload.status == "completed":
            from backend.app.services.revision_service import RevisionService
            RevisionService.sync_eligible_topics(db)
    if payload.priority is not None:
        topic.priority = payload.priority
    if payload.estimated_duration_minutes is not None:
        topic.estimated_duration_minutes = payload.estimated_duration_minutes

    db.commit()
    db.refresh(topic)
    return TopicResponse.model_validate(topic)


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a topic")
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with ID {topic_id} not found",
        )
    db.delete(topic)
    db.commit()
    return None


@router.get(
    "/{topic_id}/prerequisites",
    response_model=TopicDependenciesResponse,
    summary="Get prerequisite and dependent topics",
)
def get_topic_prerequisites(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with ID {topic_id} not found",
        )

    # Prerequisites: topics that this topic depends on (TopicPrerequisite.topic_id == topic_id)
    prereq_records = (
        db.query(TopicPrerequisite)
        .filter(TopicPrerequisite.topic_id == topic_id)
        .all()
    )
    prereqs = [
        PrerequisiteResponse(
            id=p.id,
            topic_id=p.topic_id,
            topic_title=topic.title,
            prerequisite_topic_id=p.prerequisite_topic_id,
            prerequisite_topic_title=p.prerequisite_topic.title if p.prerequisite_topic else "",
            relationship_type=p.relationship_type,
            created_at=p.created_at,
        )
        for p in prereq_records
    ]

    # Dependents: topics that depend on this topic (TopicPrerequisite.prerequisite_topic_id == topic_id)
    dependent_records = (
        db.query(TopicPrerequisite)
        .filter(TopicPrerequisite.prerequisite_topic_id == topic_id)
        .all()
    )
    dependents = [
        PrerequisiteResponse(
            id=d.id,
            topic_id=d.topic_id,
            topic_title=d.topic.title if d.topic else "",
            prerequisite_topic_id=d.prerequisite_topic_id,
            prerequisite_topic_title=topic.title,
            relationship_type=d.relationship_type,
            created_at=d.created_at,
        )
        for d in dependent_records
    ]

    return TopicDependenciesResponse(
        topic_id=topic.id,
        topic_title=topic.title,
        prerequisites=prereqs,
        dependents=dependents,
    )


@router.post(
    "/{topic_id}/prerequisites",
    response_model=PrerequisiteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a prerequisite topic (with cycle prevention)",
)
def create_topic_prerequisite(
    topic_id: int,
    payload: PrerequisiteCreateInput,
    db: Session = Depends(get_db),
):
    try:
        link = add_topic_prerequisite(
            db=db,
            topic_id=topic_id,
            prerequisite_topic_id=payload.prerequisite_topic_id,
            relationship_type=payload.relationship_type or "prerequisite",
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )

    t1 = link.topic
    t2 = link.prerequisite_topic

    return PrerequisiteResponse(
        id=link.id,
        topic_id=link.topic_id,
        topic_title=t1.title if t1 else "",
        prerequisite_topic_id=link.prerequisite_topic_id,
        prerequisite_topic_title=t2.title if t2 else "",
        relationship_type=link.relationship_type,
        created_at=link.created_at,
    )


@router.delete(
    "/{topic_id}/prerequisites/{prerequisite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a topic prerequisite",
)
def remove_topic_prerequisite(
    topic_id: int,
    prerequisite_id: int,
    db: Session = Depends(get_db),
):
    link = (
        db.query(TopicPrerequisite)
        .filter(
            TopicPrerequisite.id == prerequisite_id,
            TopicPrerequisite.topic_id == topic_id,
        )
        .first()
    )
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic prerequisite not found",
        )

    db.delete(link)
    db.commit()
    return None
