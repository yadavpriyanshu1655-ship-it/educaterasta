from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.topic import Topic
from backend.app.schemas.topic import TopicUpdate, TopicResponse

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

