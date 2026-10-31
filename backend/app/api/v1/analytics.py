from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.topic import Topic
from backend.app.models.quiz import TopicPerformance
from backend.app.schemas.analytics import AnalyticsOverview
from backend.app.schemas.quiz import (
    TopicPerformanceResponse,
    WeakTopicItem,
    MistakeAnalysisItem,
    RecommendationItem,
)
from backend.app.services.study_service import get_analytics_overview_data
from backend.app.services.quiz_service import (
    get_weak_topics_list,
    get_mistakes_history,
    get_personalized_recommendations,
)

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverview, summary="Retrieve study analytics and syllabus progress metrics")
def get_analytics_overview(db: Session = Depends(get_db)):
    return get_analytics_overview_data(db)


@router.get("/topic-performance", response_model=List[TopicPerformanceResponse], summary="List topic performance and mastery levels")
def get_topic_performance(
    subject_id: int = Query(None, description="Optional subject ID filter"),
    db: Session = Depends(get_db),
):
    query = db.query(TopicPerformance).join(Topic, TopicPerformance.topic_id == Topic.id)
    if subject_id is not None:
        query = query.filter(Topic.subject_id == subject_id)

    records = query.order_by(TopicPerformance.accuracy_percentage.asc()).all()

    items: List[TopicPerformanceResponse] = []
    for p in records:
        topic = p.topic
        subject = topic.subject if topic else None
        items.append(
            TopicPerformanceResponse(
                topic_id=p.topic_id,
                topic_title=topic.title if topic else f"Topic {p.topic_id}",
                subject_id=subject.id if subject else 0,
                subject_name=subject.name if subject else "General",
                subject_color=subject.color if subject else "#3b82f6",
                attempts_count=p.attempts_count,
                correct_count=p.correct_count,
                incorrect_count=p.incorrect_count,
                accuracy_percentage=p.accuracy_percentage,
                mastery_estimate=p.mastery_estimate,
                classification=p.classification,
                confidence_level=p.confidence_level,
                last_attempted_at=p.last_attempted_at,
                updated_at=p.updated_at,
            )
        )
    return items


@router.get("/weak-topics", response_model=List[WeakTopicItem], summary="List identified weak topics with evidence and warnings")
def get_weak_topics(db: Session = Depends(get_db)):
    return get_weak_topics_list(db)


@router.get("/mistakes", response_model=List[MistakeAnalysisItem], summary="Get mistake analysis history")
def get_mistakes(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_mistakes_history(db, limit=limit)


@router.get("/recommendations", response_model=List[RecommendationItem], summary="Get personalized practice recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    return get_personalized_recommendations(db)
