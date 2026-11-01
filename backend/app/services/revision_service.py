from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from backend.app.models.revision import RevisionPlan, RevisionAttempt, RevisionEvent
from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.quiz import (
    TopicPerformance,
    AttemptAnswer,
    Question,
    TopicPrerequisite,
)
from backend.app.models.study_session import StudySession
from backend.app.models.exam import Exam
from backend.app.schemas.revision import (
    RevisionPlanResponse,
    RevisionPlanDetailResponse,
    RevisionAttemptCreate,
    RevisionAttemptResponse,
    RevisionEventResponse,
    RevisionOverviewMetrics,
    ForgettingRiskItem,
    ScheduleRevisionAsSessionInput,
)

DEFAULT_INTERVAL_STAGES = [1, 3, 7, 14, 30, 60]


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def calculate_forgetting_risk(
    days_since_last: int,
    current_interval_days: int,
    consecutive_failures: int,
    topic_accuracy: Optional[float] = None,
) -> Tuple[float, str, str, str]:
    """
    Deterministic Heuristic Forgetting-Risk Estimator.
    Returns (risk_score, risk_category, reason, recommended_action).
    """
    interval = max(1, current_interval_days)
    ratio = days_since_last / interval

    # Base decay score based on elapsed interval ratio
    base_score = min(0.60, ratio * 0.45)

    # Topic weakness penalty
    weakness_penalty = 0.0
    if topic_accuracy is not None:
        if topic_accuracy < 50.0:
            weakness_penalty = 0.25
        elif topic_accuracy < 65.0:
            weakness_penalty = 0.15

    # Failure penalty
    failure_penalty = min(0.25, consecutive_failures * 0.12)

    risk_score = round(min(1.0, base_score + weakness_penalty + failure_penalty), 2)

    # If overdue by multiple days, elevate risk
    if ratio >= 2.0:
        risk_score = max(risk_score, 0.75)
    if ratio >= 3.0:
        risk_score = max(risk_score, 0.90)

    # Categorization
    if risk_score >= 0.85:
        category = "Critical"
        reason = f"Significantly past target interval ({days_since_last}d vs {interval}d target) with retention vulnerability."
        action = "Prioritize immediate active recall revision session today."
    elif risk_score >= 0.60:
        category = "High"
        reason = f"Approaching or past due date with moderate forgetting vulnerability."
        action = "Schedule revision session in current study window."
    elif risk_score >= 0.30:
        category = "Moderate"
        reason = f"Memory trace is active within safe retention interval ({days_since_last}d of {interval}d)."
        action = "Review brief summary or flashcards before due date."
    else:
        category = "Low"
        reason = "Recently reinforced with solid retention stability."
        action = "Maintain regular spaced repetition schedule."

    return risk_score, category, reason, action


def calculate_next_interval(
    current_interval: int,
    confidence_rating: int,
    quiz_accuracy: Optional[float] = None,
) -> Tuple[int, str]:
    """
    Determines next revision interval based on student confidence and objective quiz accuracy.
    Returns (next_interval_days, result_status).
    """
    # Combined performance factor
    p_factor = confidence_rating / 5.0
    if quiz_accuracy is not None:
        p_factor = 0.6 * p_factor + 0.4 * (quiz_accuracy / 100.0)

    # Strong performance: advance to next stage or multiply
    if confidence_rating >= 4 and p_factor >= 0.75:
        # Find next default stage or multiply by 2.2
        next_stage = None
        for stage in DEFAULT_INTERVAL_STAGES:
            if stage > current_interval:
                next_stage = stage
                break
        if next_stage is not None:
            new_interval = next_stage
        else:
            new_interval = min(90, max(current_interval + 7, int(current_interval * 2.2)))
        return new_interval, "success"

    # Moderate performance: retain or small incremental progression
    if confidence_rating == 3 or (0.55 <= p_factor < 0.75):
        new_interval = max(current_interval + 1, int(current_interval * 1.3))
        return min(60, new_interval), "partial"

    # Poor performance: reset interval back to 1 day
    return 1, "failed"


class RevisionService:
    @staticmethod
    def sync_eligible_topics(db: Session) -> int:
        """
        Scans completed topics and quiz-tested topics, ensuring each has an active RevisionPlan.
        """
        now = datetime.now(timezone.utc)
        
        # 1. Topics with status 'completed'
        completed_topics = db.query(Topic).filter(Topic.status == "completed").all()
        # 2. Topics with TopicPerformance records
        tested_perf = db.query(TopicPerformance).all()
        tested_topic_ids = {p.topic_id for p in tested_perf}

        eligible_topic_ids = {t.id for t in completed_topics}.union(tested_topic_ids)
        if not eligible_topic_ids:
            return 0

        # Existing plans
        existing_plans = (
            db.query(RevisionPlan)
            .filter(RevisionPlan.topic_id.in_(eligible_topic_ids))
            .all()
        )
        existing_topic_ids = {p.topic_id for p in existing_plans}

        new_count = 0
        for topic_id in eligible_topic_ids:
            if topic_id not in existing_topic_ids:
                topic = db.query(Topic).filter(Topic.id == topic_id).first()
                if not topic:
                    continue

                # Check topic performance for initial risk estimation
                perf = db.query(TopicPerformance).filter(TopicPerformance.topic_id == topic_id).first()
                acc = perf.accuracy_percentage if perf else None

                risk_score, category, _, _ = calculate_forgetting_risk(
                    days_since_last=1,
                    current_interval_days=1,
                    consecutive_failures=0,
                    topic_accuracy=acc,
                )

                plan = RevisionPlan(
                    topic_id=topic.id,
                    subject_id=topic.subject_id,
                    current_interval_days=1,
                    last_revision_at=None,
                    next_revision_at=now + timedelta(days=1),
                    revision_count=0,
                    consecutive_successes=0,
                    consecutive_failures=0,
                    risk_score=risk_score,
                    risk_category=category,
                    status="scheduled",
                )
                db.add(plan)
                db.flush()

                event = RevisionEvent(
                    revision_plan_id=plan.id,
                    event_type="created",
                    new_due_date=plan.next_revision_at,
                    reason="Automatically generated from syllabus completion or quiz assessment.",
                )
                db.add(event)
                new_count += 1

        db.commit()
        return new_count

    @staticmethod
    def _refresh_plan_status_and_risk(plan: RevisionPlan, db: Session, now: datetime) -> None:
        """Helper to recompute live status and forgetting-risk for a plan."""
        due_diff = (ensure_utc(plan.next_revision_at) - now).total_seconds()
        
        # Status calculation
        if plan.status not in ("snoozed",):
            if due_diff < -86400: # more than 24 hours overdue
                plan.status = "overdue"
            elif due_diff <= 0:   # due today or slightly past
                plan.status = "due"
            else:
                plan.status = "scheduled"

        # Calculate days since last revision
        ref_date = plan.last_revision_at or plan.created_at
        days_since = max(0, (now - ensure_utc(ref_date)).days)

        # Topic accuracy lookup
        perf = db.query(TopicPerformance).filter(TopicPerformance.topic_id == plan.topic_id).first()
        acc = perf.accuracy_percentage if perf else None

        score, cat, _, _ = calculate_forgetting_risk(
            days_since_last=days_since,
            current_interval_days=plan.current_interval_days,
            consecutive_failures=plan.consecutive_failures,
            topic_accuracy=acc,
        )
        plan.risk_score = score
        plan.risk_category = cat

    @classmethod
    def get_revision_plans(
        cls,
        db: Session,
        status: Optional[str] = None,
        subject_id: Optional[int] = None,
        risk_category: Optional[str] = None,
    ) -> List[RevisionPlanResponse]:
        now = datetime.now(timezone.utc)
        query = db.query(RevisionPlan)

        if subject_id:
            query = query.filter(RevisionPlan.subject_id == subject_id)

        plans = query.all()
        for p in plans:
            cls._refresh_plan_status_and_risk(p, db, now)
        db.commit()

        # Filter in Python to respect updated dynamic statuses/risk
        if status:
            if status == "due_or_overdue":
                plans = [p for p in plans if p.status in ("due", "overdue")]
            else:
                plans = [p for p in plans if p.status == status]

        if risk_category:
            plans = [p for p in plans if p.risk_category.lower() == risk_category.lower()]

        # Sort: Overdue first, then by risk_score desc, then next_revision_at asc
        def sort_key(p: RevisionPlan):
            status_order = 0 if p.status == "overdue" else (1 if p.status == "due" else 2)
            return (status_order, -p.risk_score, p.next_revision_at)

        plans.sort(key=sort_key)

        return [cls._to_plan_response(p, now) for p in plans]

    @classmethod
    def get_due_revisions(cls, db: Session) -> List[RevisionPlanResponse]:
        return cls.get_revision_plans(db, status="due_or_overdue")

    @classmethod
    def get_overdue_revisions(cls, db: Session) -> List[RevisionPlanResponse]:
        return cls.get_revision_plans(db, status="overdue")

    @classmethod
    def get_revision_detail(cls, db: Session, plan_id: int) -> Optional[RevisionPlanDetailResponse]:
        now = datetime.now(timezone.utc)
        plan = db.query(RevisionPlan).filter(RevisionPlan.id == plan_id).first()
        if not plan:
            return None

        cls._refresh_plan_status_and_risk(plan, db, now)
        db.commit()

        topic = db.query(Topic).filter(Topic.id == plan.topic_id).first()
        subject = db.query(Subject).filter(Subject.id == plan.subject_id).first()
        perf = db.query(TopicPerformance).filter(TopicPerformance.topic_id == plan.topic_id).first()

        # Fetch recent mistakes on this topic (Phase 03 integration)
        recent_mistakes = []
        mistake_answers = (
            db.query(AttemptAnswer)
            .filter(AttemptAnswer.topic_id == plan.topic_id, AttemptAnswer.is_correct == False)
            .order_by(desc(AttemptAnswer.created_at))
            .limit(5)
            .all()
        )
        for ma in mistake_answers:
            q = db.query(Question).filter(Question.id == ma.question_id).first()
            if q:
                recent_mistakes.append({
                    "question_id": q.id,
                    "question_text": q.question_text,
                    "mistake_category": ma.mistake_category,
                    "is_repeated": ma.is_repeated_mistake,
                    "explanation": q.explanation,
                })

        # Fetch sample questions for active self-testing
        sample_questions = []
        questions = (
            db.query(Question)
            .filter(Question.topic_id == plan.topic_id)
            .limit(3)
            .all()
        )
        for q in questions:
            sample_questions.append({
                "id": q.id,
                "question_text": q.question_text,
                "difficulty": q.difficulty,
                "options": q.options,
                "question_type": q.question_type,
            })

        # Fetch prerequisite names
        prereqs = (
            db.query(TopicPrerequisite)
            .filter(TopicPrerequisite.topic_id == plan.topic_id)
            .all()
        )
        prereq_titles = []
        for pr in prereqs:
            pr_topic = db.query(Topic).filter(Topic.id == pr.prerequisite_topic_id).first()
            if pr_topic:
                prereq_titles.append(pr_topic.title)

        base_res = cls._to_plan_response(plan, now)
        return RevisionPlanDetailResponse(
            **base_res.model_dump(),
            topic_description=topic.description if topic else None,
            topic_status=topic.status if topic else "not_started",
            topic_priority=topic.priority if topic else "medium",
            recent_mistakes=recent_mistakes,
            sample_questions=sample_questions,
            prerequisites=prereq_titles,
            mastery_score=perf.mastery_score if perf else None,
        )

    @classmethod
    def complete_revision(
        cls,
        db: Session,
        plan_id: int,
        input_data: RevisionAttemptCreate,
    ) -> Tuple[RevisionAttemptResponse, RevisionPlanResponse]:
        now = datetime.now(timezone.utc)
        plan = db.query(RevisionPlan).filter(RevisionPlan.id == plan_id).first()
        if not plan:
            raise ValueError(f"RevisionPlan with ID {plan_id} not found")

        # Determine adaptive next interval
        new_interval, result = calculate_next_interval(
            current_interval=plan.current_interval_days,
            confidence_rating=input_data.confidence_rating,
            quiz_accuracy=input_data.quiz_accuracy,
        )

        started_at = now - timedelta(minutes=input_data.duration_minutes)

        attempt = RevisionAttempt(
            revision_plan_id=plan.id,
            topic_id=plan.topic_id,
            started_at=started_at,
            completed_at=now,
            duration_minutes=input_data.duration_minutes,
            confidence_rating=input_data.confidence_rating,
            quiz_accuracy=input_data.quiz_accuracy,
            self_assessment=input_data.self_assessment,
            notes=input_data.notes,
            result=result,
        )
        db.add(attempt)

        # Update Plan progression
        prev_due = plan.next_revision_at
        plan.last_revision_at = now
        plan.current_interval_days = new_interval
        plan.next_revision_at = now + timedelta(days=new_interval)
        plan.revision_count += 1
        plan.status = "scheduled"

        if result == "success":
            plan.consecutive_successes += 1
            plan.consecutive_failures = 0
        elif result == "failed":
            plan.consecutive_failures += 1
            plan.consecutive_successes = 0

        # Recalculate risk immediately
        cls._refresh_plan_status_and_risk(plan, db, now)

        # Log event
        event_reason = f"Completed with confidence {input_data.confidence_rating}/5. Interval adapted to {new_interval}d."
        if plan.consecutive_failures >= 2:
            event_reason += " Warning: Multiple consecutive low recall scores. Prerequisite review advised."

        event = RevisionEvent(
            revision_plan_id=plan.id,
            event_type="completed",
            previous_due_date=prev_due,
            new_due_date=plan.next_revision_at,
            reason=event_reason,
        )
        db.add(event)
        db.commit()
        db.refresh(attempt)
        db.refresh(plan)

        attempt_res = RevisionAttemptResponse(
            id=attempt.id,
            revision_plan_id=attempt.revision_plan_id,
            topic_id=attempt.topic_id,
            topic_title=plan.topic.title if plan.topic else None,
            subject_name=plan.subject.name if plan.subject else None,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            duration_minutes=attempt.duration_minutes,
            confidence_rating=attempt.confidence_rating,
            quiz_accuracy=attempt.quiz_accuracy,
            self_assessment=attempt.self_assessment,
            notes=attempt.notes,
            result=attempt.result,
            created_at=attempt.created_at,
        )

        return attempt_res, cls._to_plan_response(plan, now)

    @classmethod
    def snooze_revision(
        cls,
        db: Session,
        plan_id: int,
        snooze_days: int,
        reason: Optional[str] = None,
    ) -> RevisionPlanResponse:
        now = datetime.now(timezone.utc)
        plan = db.query(RevisionPlan).filter(RevisionPlan.id == plan_id).first()
        if not plan:
            raise ValueError(f"RevisionPlan with ID {plan_id} not found")

        prev_due = plan.next_revision_at
        plan.next_revision_at = now + timedelta(days=snooze_days)
        plan.status = "snoozed"

        event = RevisionEvent(
            revision_plan_id=plan.id,
            event_type="snoozed",
            previous_due_date=prev_due,
            new_due_date=plan.next_revision_at,
            reason=reason or f"Snoozed by {snooze_days} day(s).",
        )
        db.add(event)
        db.commit()
        db.refresh(plan)
        return cls._to_plan_response(plan, now)

    @classmethod
    def skip_revision(
        cls,
        db: Session,
        plan_id: int,
        reason: str,
    ) -> RevisionPlanResponse:
        now = datetime.now(timezone.utc)
        plan = db.query(RevisionPlan).filter(RevisionPlan.id == plan_id).first()
        if not plan:
            raise ValueError(f"RevisionPlan with ID {plan_id} not found")

        prev_due = plan.next_revision_at
        # Advance by current interval so the cycle is preserved
        plan.next_revision_at = now + timedelta(days=max(1, plan.current_interval_days))
        plan.status = "scheduled"

        event = RevisionEvent(
            revision_plan_id=plan.id,
            event_type="skipped",
            previous_due_date=prev_due,
            new_due_date=plan.next_revision_at,
            reason=reason,
        )
        db.add(event)
        db.commit()
        db.refresh(plan)
        return cls._to_plan_response(plan, now)

    @classmethod
    def get_history(
        cls,
        db: Session,
        topic_id: Optional[int] = None,
        limit: int = 50,
    ) -> List[RevisionAttemptResponse]:
        query = db.query(RevisionAttempt)
        if topic_id:
            query = query.filter(RevisionAttempt.topic_id == topic_id)

        attempts = query.order_by(desc(RevisionAttempt.completed_at)).limit(limit).all()
        results = []
        for a in attempts:
            t = db.query(Topic).filter(Topic.id == a.topic_id).first()
            s = db.query(Subject).filter(Subject.id == t.subject_id).first() if t else None
            results.append(
                RevisionAttemptResponse(
                    id=a.id,
                    revision_plan_id=a.revision_plan_id,
                    topic_id=a.topic_id,
                    topic_title=t.title if t else None,
                    subject_name=s.name if s else None,
                    started_at=a.started_at,
                    completed_at=a.completed_at,
                    duration_minutes=a.duration_minutes,
                    confidence_rating=a.confidence_rating,
                    quiz_accuracy=a.quiz_accuracy,
                    self_assessment=a.self_assessment,
                    notes=a.notes,
                    result=a.result,
                    created_at=a.created_at,
                )
            )
        return results

    @classmethod
    def get_topic_events(cls, db: Session, plan_id: int) -> List[RevisionEventResponse]:
        events = (
            db.query(RevisionEvent)
            .filter(RevisionEvent.revision_plan_id == plan_id)
            .order_by(desc(RevisionEvent.id))
            .all()
        )
        return [RevisionEventResponse.model_validate(e) for e in events]

    @classmethod
    def get_overview_metrics(cls, db: Session) -> RevisionOverviewMetrics:
        now = datetime.now(timezone.utc)
        plans = db.query(RevisionPlan).all()
        for p in plans:
            cls._refresh_plan_status_and_risk(p, db, now)
        db.commit()

        total_plans = len(plans)
        due_today = sum(1 for p in plans if p.status in ("due", "overdue"))
        overdue_count = sum(1 for p in plans if p.status == "overdue")

        attempts = db.query(RevisionAttempt).all()
        completed_total = len(attempts)
        avg_confidence = (
            round(sum(a.confidence_rating for a in attempts) / completed_total, 2)
            if completed_total > 0
            else 0.0
        )

        successful_attempts = sum(1 for a in attempts if a.result == "success")
        retention_rate = (
            round((successful_attempts / completed_total) * 100, 1)
            if completed_total > 0
            else 0.0
        )

        risk_distribution = {
            "Low": sum(1 for p in plans if p.risk_category == "Low"),
            "Moderate": sum(1 for p in plans if p.risk_category == "Moderate"),
            "High": sum(1 for p in plans if p.risk_category == "High"),
            "Critical": sum(1 for p in plans if p.risk_category == "Critical"),
        }

        return RevisionOverviewMetrics(
            total_plans=total_plans,
            due_today=due_today,
            overdue_count=overdue_count,
            completed_total=completed_total,
            average_confidence=avg_confidence,
            retention_rate_percentage=retention_rate,
            risk_distribution=risk_distribution,
        )

    @classmethod
    def get_forgetting_risk_analysis(cls, db: Session) -> List[ForgettingRiskItem]:
        now = datetime.now(timezone.utc)
        plans = db.query(RevisionPlan).all()
        for p in plans:
            cls._refresh_plan_status_and_risk(p, db, now)
        db.commit()

        items = []
        for p in plans:
            topic = db.query(Topic).filter(Topic.id == p.topic_id).first()
            subject = db.query(Subject).filter(Subject.id == p.subject_id).first()
            if not topic or not subject:
                continue

            ref_date = p.last_revision_at or p.created_at
            days_since = max(0, (now - ensure_utc(ref_date)).days)

            perf = db.query(TopicPerformance).filter(TopicPerformance.topic_id == p.topic_id).first()
            acc = perf.accuracy_percentage if perf else None

            score, cat, reason, action = calculate_forgetting_risk(
                days_since_last=days_since,
                current_interval_days=p.current_interval_days,
                consecutive_failures=p.consecutive_failures,
                topic_accuracy=acc,
            )

            items.append(
                ForgettingRiskItem(
                    topic_id=p.topic_id,
                    topic_title=topic.title,
                    subject_name=subject.name,
                    subject_color=subject.color,
                    risk_score=score,
                    risk_category=cat,
                    current_interval_days=p.current_interval_days,
                    days_since_last_revision=days_since,
                    consecutive_failures=p.consecutive_failures,
                    reason=reason,
                    recommended_action=action,
                    suggested_revision_date=p.next_revision_at,
                )
            )

        items.sort(key=lambda x: -x.risk_score)
        return items

    @classmethod
    def schedule_as_study_session(
        cls,
        db: Session,
        plan_id: int,
        session_input: ScheduleRevisionAsSessionInput,
    ) -> StudySession:
        """
        Bridges the revision plan with Phase 01 / Phase 02 study scheduling.
        Creates a StudySession for the topic.
        """
        plan = db.query(RevisionPlan).filter(RevisionPlan.id == plan_id).first()
        if not plan:
            raise ValueError(f"RevisionPlan with ID {plan_id} not found")

        topic = db.query(Topic).filter(Topic.id == plan.topic_id).first()
        subject = db.query(Subject).filter(Subject.id == plan.subject_id).first()

        session = StudySession(
            subject_id=plan.subject_id,
            topic_id=plan.topic_id,
            title=f"Spaced Revision: {topic.title if topic else 'Topic'}",
            scheduled_date=session_input.scheduled_date,
            start_time=session_input.start_time,
            planned_duration_minutes=session_input.duration_minutes,
            status="pending",
            notes=f"Personalized revision session scheduled from Smart Revision Engine (Interval: {plan.current_interval_days}d).",
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def _to_plan_response(p: RevisionPlan, now: datetime) -> RevisionPlanResponse:
        due_diff_seconds = (ensure_utc(p.next_revision_at) - now).total_seconds()
        days_until = int(due_diff_seconds // 86400)

        return RevisionPlanResponse(
            id=p.id,
            topic_id=p.topic_id,
            subject_id=p.subject_id,
            topic_title=p.topic.title if p.topic else f"Topic #{p.topic_id}",
            subject_name=p.subject.name if p.subject else f"Subject #{p.subject_id}",
            subject_color=p.subject.color if p.subject else "#3b82f6",
            current_interval_days=p.current_interval_days,
            last_revision_at=p.last_revision_at,
            next_revision_at=p.next_revision_at,
            revision_count=p.revision_count,
            consecutive_successes=p.consecutive_successes,
            consecutive_failures=p.consecutive_failures,
            risk_score=p.risk_score,
            risk_category=p.risk_category,
            status=p.status,
            is_due=p.status in ("due", "overdue"),
            is_overdue=p.status == "overdue",
            days_until_due=days_until,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
