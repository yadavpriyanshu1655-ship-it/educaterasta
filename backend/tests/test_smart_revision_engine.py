from datetime import datetime, timezone, timedelta, date
import pytest
from fastapi.testclient import TestClient

from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.revision import RevisionPlan, RevisionAttempt, RevisionEvent
from backend.app.models.quiz import TopicPerformance
from backend.app.models.study_session import StudySession


def test_sync_eligible_topics_and_plan_initialization(client: TestClient, db_session):
    # 1. Create a subject and topics
    subject = Subject(name="Biology", description="Cell Biology", color="#10b981")
    db_session.add(subject)
    db_session.commit()
    db_session.refresh(subject)

    t1 = Topic(
        subject_id=subject.id,
        title="Mitosis and Meiosis",
        status="completed",
        priority="high",
        estimated_duration_minutes=45,
    )
    t2 = Topic(
        subject_id=subject.id,
        title="Cellular Respiration",
        status="in_progress",
        priority="medium",
        estimated_duration_minutes=60,
    )
    db_session.add_all([t1, t2])
    db_session.commit()

    # Trigger revision generation
    res = client.post("/api/v1/revisions/generate")
    assert res.status_code == 200
    data = res.json()
    assert data["created_count"] == 1  # Only t1 is completed

    # Verify RevisionPlan exists
    plan = db_session.query(RevisionPlan).filter(RevisionPlan.topic_id == t1.id).first()
    assert plan is not None
    assert plan.current_interval_days == 1
    assert plan.status in ("scheduled", "due")
    assert plan.revision_count == 0

    # Verify event logged
    event = db_session.query(RevisionEvent).filter(RevisionEvent.revision_plan_id == plan.id).first()
    assert event is not None
    assert event.event_type == "created"

    # Idempotency check: Running again does not create duplicate
    res_repeat = client.post("/api/v1/revisions/generate")
    assert res_repeat.status_code == 200
    assert res_repeat.json()["created_count"] == 0


def test_adaptive_interval_progression_on_high_confidence(client: TestClient, db_session):
    subject = Subject(name="Physics", description="Classical Mechanics", color="#6366f1")
    db_session.add(subject)
    db_session.commit()

    topic = Topic(
        subject_id=subject.id,
        title="Newton Laws of Motion",
        status="completed",
        priority="high",
        estimated_duration_minutes=50,
    )
    db_session.add(topic)
    db_session.commit()

    client.post("/api/v1/revisions/generate")
    plan = db_session.query(RevisionPlan).filter(RevisionPlan.topic_id == topic.id).first()
    assert plan.current_interval_days == 1

    # First revision with High Confidence (5/5)
    res = client.post(
        f"/api/v1/revisions/{plan.id}/complete",
        json={
            "confidence_rating": 5,
            "duration_minutes": 20,
            "quiz_accuracy": 90.0,
            "self_assessment": "Remembered free body diagrams clearly",
            "notes": "Reviewed friction coefficients",
        },
    )
    assert res.status_code == 201
    attempt_data = res.json()
    assert attempt_data["confidence_rating"] == 5
    assert attempt_data["result"] == "success"

    # Check that interval progressed from 1 day to 3 days (next default stage)
    db_session.refresh(plan)
    assert plan.current_interval_days == 3
    assert plan.revision_count == 1
    assert plan.consecutive_successes == 1
    assert plan.consecutive_failures == 0

    # Second revision with High Confidence (4/5)
    res2 = client.post(
        f"/api/v1/revisions/{plan.id}/complete",
        json={
            "confidence_rating": 4,
            "duration_minutes": 15,
            "quiz_accuracy": 85.0,
        },
    )
    assert res2.status_code == 201
    db_session.refresh(plan)
    assert plan.current_interval_days == 7
    assert plan.revision_count == 2
    assert plan.consecutive_successes == 2


def test_interval_shortening_and_reset_on_poor_confidence(client: TestClient, db_session):
    subject = Subject(name="Chemistry", description="Organic Chemistry", color="#ec4899")
    db_session.add(subject)
    db_session.commit()

    topic = Topic(
        subject_id=subject.id,
        title="Electrophilic Aromatic Substitution",
        status="completed",
        priority="high",
        estimated_duration_minutes=60,
    )
    db_session.add(topic)
    db_session.commit()

    client.post("/api/v1/revisions/generate")
    plan = db_session.query(RevisionPlan).filter(RevisionPlan.topic_id == topic.id).first()

    # Artificially simulate that it was already at 14 days
    plan.current_interval_days = 14
    plan.consecutive_successes = 3
    db_session.commit()

    # Poor performance: rating 2/5 (forgot mechanisms)
    res = client.post(
        f"/api/v1/revisions/{plan.id}/complete",
        json={
            "confidence_rating": 2,
            "duration_minutes": 25,
            "quiz_accuracy": 40.0,
            "self_assessment": "Struggled with ortho/para directing groups",
        },
    )
    assert res.status_code == 201
    assert res.json()["result"] == "failed"

    db_session.refresh(plan)
    assert plan.current_interval_days == 1  # Reset to 1 day
    assert plan.consecutive_failures == 1
    assert plan.consecutive_successes == 0

    # Second failure in a row
    res2 = client.post(
        f"/api/v1/revisions/{plan.id}/complete",
        json={
            "confidence_rating": 1,
            "duration_minutes": 15,
            "quiz_accuracy": 20.0,
        },
    )
    assert res2.status_code == 201
    db_session.refresh(plan)
    assert plan.consecutive_failures == 2

    # Check events to see if warning was noted
    events = client.get(f"/api/v1/revisions/{plan.id}/events").json()
    assert len(events) >= 2
    latest_event = events[0]
    assert "Prerequisite review advised" in latest_event["reason"]


def test_due_and_overdue_detection_and_filtering(client: TestClient, db_session):
    now = datetime.now(timezone.utc)
    subject = Subject(name="History", color="#f59e0b")
    db_session.add(subject)
    db_session.commit()

    t_due = Topic(subject_id=subject.id, title="Industrial Revolution", status="completed")
    t_overdue = Topic(subject_id=subject.id, title="World War I Causes", status="completed")
    t_future = Topic(subject_id=subject.id, title="World War II Summary", status="completed")
    db_session.add_all([t_due, t_overdue, t_future])
    db_session.commit()

    client.post("/api/v1/revisions/generate")

    plan_due = db_session.query(RevisionPlan).filter(RevisionPlan.topic_id == t_due.id).first()
    plan_overdue = db_session.query(RevisionPlan).filter(RevisionPlan.topic_id == t_overdue.id).first()
    plan_future = db_session.query(RevisionPlan).filter(RevisionPlan.topic_id == t_future.id).first()

    # Due plan: next_revision_at is 1 hour in the past
    plan_due.next_revision_at = now - timedelta(hours=1)
    # Overdue plan: next_revision_at is 48 hours in the past
    plan_overdue.next_revision_at = now - timedelta(hours=48)
    # Future plan: next_revision_at is 5 days ahead
    plan_future.next_revision_at = now + timedelta(days=5)
    db_session.commit()

    # Query due revisions
    due_res = client.get("/api/v1/revisions/due")
    assert due_res.status_code == 200
    due_plans = due_res.json()
    due_topic_ids = [p["topic_id"] for p in due_plans]
    assert t_due.id in due_topic_ids
    assert t_overdue.id in due_topic_ids
    assert t_future.id not in due_topic_ids

    # Query overdue revisions strictly
    overdue_res = client.get("/api/v1/revisions/overdue")
    assert overdue_res.status_code == 200
    overdue_plans = overdue_res.json()
    overdue_topic_ids = [p["topic_id"] for p in overdue_plans]
    assert t_overdue.id in overdue_topic_ids
    assert t_due.id not in overdue_topic_ids


def test_snooze_and_skip_behavior(client: TestClient, db_session):
    subject = Subject(name="Literature", color="#8b5cf6")
    db_session.add(subject)
    db_session.commit()

    topic = Topic(subject_id=subject.id, title="Macbeth Act 1", status="completed")
    db_session.add(topic)
    db_session.commit()

    client.post("/api/v1/revisions/generate")
    plan = db_session.query(RevisionPlan).filter(RevisionPlan.topic_id == topic.id).first()

    # 1. Test Snooze
    snooze_res = client.post(
        f"/api/v1/revisions/{plan.id}/snooze",
        json={"snooze_days": 3, "reason": "Preparing for physics exam today"},
    )
    assert snooze_res.status_code == 200
    assert snooze_res.json()["status"] == "snoozed"

    db_session.refresh(plan)
    assert plan.status == "snoozed"

    # 2. Test Skip
    skip_res = client.post(
        f"/api/v1/revisions/{plan.id}/skip",
        json={"reason": "Already reviewed in group study"},
    )
    assert skip_res.status_code == 200
    db_session.refresh(plan)
    assert plan.status == "scheduled"

    # Verify events
    events = client.get(f"/api/v1/revisions/{plan.id}/events").json()
    event_types = [e["event_type"] for e in events]
    assert "snoozed" in event_types
    assert "skipped" in event_types


def test_forgetting_risk_analysis_and_weak_topic_weighting(client: TestClient, db_session):
    subject = Subject(name="Computer Science", color="#3b82f6")
    db_session.add(subject)
    db_session.commit()

    topic = Topic(subject_id=subject.id, title="Dynamic Programming", status="completed")
    db_session.add(topic)
    db_session.commit()

    # Add TopicPerformance indicating weak mastery
    tp = TopicPerformance(
        topic_id=topic.id,
        attempts_count=8,
        correct_count=3,
        incorrect_count=5,
        accuracy_percentage=37.5,
        mastery_estimate=0.38,
        classification="Weak",
        confidence_level="Medium",
    )
    db_session.add(tp)
    db_session.commit()

    client.post("/api/v1/revisions/generate")

    plan = db_session.query(RevisionPlan).filter(RevisionPlan.topic_id == topic.id).first()
    plan.last_revision_at = datetime.now(timezone.utc) - timedelta(days=2)
    db_session.commit()

    # Get forgetting risk analysis
    res = client.get("/api/v1/analytics/forgetting-risk")
    assert res.status_code == 200
    risk_items = res.json()
    dp_item = next((item for item in risk_items if item["topic_id"] == topic.id), None)
    assert dp_item is not None
    # Weak topic + elapsed should have elevated risk
    assert dp_item["risk_score"] >= 0.35
    assert dp_item["risk_category"] in ("Moderate", "High", "Critical")

    # Get revision overview metrics
    overview = client.get("/api/v1/analytics/revision-overview").json()
    assert "total_plans" in overview
    assert "risk_distribution" in overview
    assert overview["total_plans"] >= 1


def test_schedule_revision_as_study_session(client: TestClient, db_session):
    subject = Subject(name="Economics", color="#06b6d4")
    db_session.add(subject)
    db_session.commit()

    topic = Topic(subject_id=subject.id, title="Supply and Demand Elasticity", status="completed")
    db_session.add(topic)
    db_session.commit()

    client.post("/api/v1/revisions/generate")
    plan = db_session.query(RevisionPlan).filter(RevisionPlan.topic_id == topic.id).first()

    today_str = date.today().isoformat()
    res = client.post(
        f"/api/v1/revisions/{plan.id}/schedule-session",
        json={
            "scheduled_date": today_str,
            "start_time": "14:00",
            "duration_minutes": 45,
        },
    )
    assert res.status_code == 201
    session_data = res.json()
    assert session_data["title"] == "Spaced Revision: Supply and Demand Elasticity"
    assert session_data["status"] == "pending"
    assert session_data["planned_duration_minutes"] == 45

    # Verify session persisted in DB
    session = db_session.query(StudySession).filter(StudySession.id == session_data["id"]).first()
    assert session is not None
    assert session.topic_id == topic.id
