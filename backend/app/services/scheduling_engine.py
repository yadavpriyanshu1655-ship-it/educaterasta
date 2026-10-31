from datetime import date, datetime, timedelta, time
from typing import List, Dict, Tuple, Optional, Any
import json
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.study_session import StudySession
from backend.app.models.exam import Exam
from backend.app.models.preference import StudyPreference, UnavailableBlock, ScheduleHistory
from backend.app.schemas.planner import (
    PlanGenerateRequest,
    ProposedSession,
    UnscheduledTask,
    DailyWorkload,
    GeneratedPlanResponse,
    ConfirmPlanRequest,
    RecoverMissedRequest,
    RecoverMissedResponse,
    StudyPreferenceResponse,
    StudyPreferenceUpdate,
)


def time_to_minutes(t_str: str) -> int:
    """Converts 'HH:MM' string to minutes from midnight."""
    parts = t_str.strip().split(":")
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0
    return hours * 60 + minutes


def minutes_to_time(minutes: int) -> str:
    """Converts minutes from midnight to 'HH:MM' string."""
    hours = (minutes // 60) % 24
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


def subtract_intervals(
    free_intervals: List[Tuple[int, int]],
    occupied_intervals: List[Tuple[int, int]],
) -> List[Tuple[int, int]]:
    """Subtracts occupied intervals from free intervals, returning remaining disjoint intervals."""
    current_free = sorted(free_intervals)

    for occ_start, occ_end in sorted(occupied_intervals):
        new_free: List[Tuple[int, int]] = []
        for free_start, free_end in current_free:
            if occ_end <= free_start or occ_start >= free_end:
                # No overlap
                new_free.append((free_start, free_end))
            else:
                # Overlap occurs
                if occ_start > free_start:
                    new_free.append((free_start, occ_start))
                if occ_end < free_end:
                    new_free.append((occ_end, free_end))
        current_free = new_free

    return [iv for iv in current_free if iv[1] > iv[0]]


def get_or_create_preferences(db: Session) -> StudyPreference:
    """Retrieves single-user study preferences or creates default records."""
    pref = db.query(StudyPreference).first()
    if not pref:
        pref = StudyPreference(
            daily_target_hours=3.0,
            preferred_start_time="09:00",
            preferred_end_time="21:00",
            max_session_duration_minutes=60,
            break_duration_minutes=15,
            available_days="mon,tue,wed,thu,fri,sat,sun",
            exam_survival_mode=False,
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def update_preferences(db: Session, update_data: StudyPreferenceUpdate) -> StudyPreference:
    """Updates stored study preferences."""
    pref = get_or_create_preferences(db)
    for field, val in update_data.model_dump(exclude_unset=True).items():
        setattr(pref, field, val)
    db.commit()
    db.refresh(pref)
    return pref


def calculate_topic_priority(
    topic: Topic,
    subject: Subject,
    earliest_exam: Optional[Exam],
    reference_date: date,
    exam_survival_mode: bool,
    has_missed_sessions: bool = False,
) -> Tuple[float, str]:
    """Calculates deterministic composite score and human-readable explanation."""
    reasons: List[str] = []

    # 1. Base Priority
    base_scores = {"high": 50.0, "medium": 30.0, "low": 15.0}
    base = base_scores.get(topic.priority, 30.0)
    reasons.append(f"{topic.priority.capitalize()} base priority (+{int(base)})")

    # 2. Exam Urgency
    exam_score = 0.0
    if earliest_exam:
        days_to_exam = (earliest_exam.exam_date - reference_date).days
        if days_to_exam < 0:
            exam_score = 0.0
        elif days_to_exam <= 3:
            exam_score = 40.0
            reasons.append(f"Exam '{earliest_exam.title}' in {days_to_exam}d (+40 urgency)")
        elif days_to_exam <= 7:
            exam_score = 25.0
            reasons.append(f"Exam '{earliest_exam.title}' in {days_to_exam}d (+25 urgency)")
        elif days_to_exam <= 14:
            exam_score = 15.0
            reasons.append(f"Exam '{earliest_exam.title}' in {days_to_exam}d (+15 urgency)")
        elif days_to_exam <= 30:
            exam_score = 5.0
            reasons.append(f"Exam '{earliest_exam.title}' in {days_to_exam}d (+5 urgency)")

        if exam_survival_mode:
            exam_score *= 2.0
            exam_score += 50.0
            reasons.append(f"Exam Survival Mode applied (+{int(exam_score)})")
    elif exam_survival_mode:
        reasons.append("Deprioritized in Survival Mode (no upcoming exam)")

    # 3. Status Continuity
    status_score = 0.0
    if topic.status == "in_progress":
        status_score = 10.0
        reasons.append("Topic currently in progress (+10)")

    # 4. Missed work recovery
    missed_score = 0.0
    if has_missed_sessions:
        missed_score = 15.0
        reasons.append("Recent missed work detected (+15)")

    total_score = base + exam_score + status_score + missed_score
    explanation = "; ".join(reasons)
    return total_score, explanation


def generate_intelligent_study_plan(
    db: Session,
    request: PlanGenerateRequest,
    reference_today: Optional[date] = None,
) -> GeneratedPlanResponse:
    """Executes deterministic, constraint-satisfaction algorithm to generate an optimized study schedule."""
    today = reference_today or date.today()
    start_date = request.start_date or today
    end_date = request.end_date or (start_date + timedelta(days=6))

    if end_date < start_date:
        end_date = start_date

    # Load preferences
    stored_pref = get_or_create_preferences(db)
    daily_target_hours = request.daily_target_hours or stored_pref.daily_target_hours
    daily_capacity_minutes = int(daily_target_hours * 60)
    pref_start = request.preferred_start_time or stored_pref.preferred_start_time
    pref_end = request.preferred_end_time or stored_pref.preferred_end_time
    max_duration = request.max_session_duration_minutes or stored_pref.max_session_duration_minutes
    break_duration = request.break_duration_minutes or stored_pref.break_duration_minutes
    survival_mode = (
        request.exam_survival_mode
        if request.exam_survival_mode is not None
        else stored_pref.exam_survival_mode
    )

    available_days_list = [d.strip().lower() for d in stored_pref.available_days.split(",") if d.strip()]
    day_abbrs = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

    # Load unavailable recurring blocks
    unavail_blocks = db.query(UnavailableBlock).all()

    # Load subjects & exams
    subjects_query = db.query(Subject)
    if request.subject_ids:
        subjects_query = subjects_query.filter(Subject.id.in_(request.subject_ids))
    subjects = {s.id: s for s in subjects_query.all()}

    all_exams = db.query(Exam).filter(Exam.exam_date >= today).order_by(Exam.exam_date.asc()).all()
    earliest_exam_by_subject: Dict[int, Exam] = {}
    for exam in all_exams:
        if exam.subject_id not in earliest_exam_by_subject:
            earliest_exam_by_subject[exam.subject_id] = exam

    # Check for recent missed sessions to boost priority
    missed_sessions = (
        db.query(StudySession)
        .filter(StudySession.status == "missed")
        .all()
    )
    missed_topic_ids = {s.topic_id for s in missed_sessions if s.topic_id is not None}
    missed_subject_ids = {s.subject_id for s in missed_sessions}

    # Load incomplete topics
    topics_query = (
        db.query(Topic)
        .filter(Topic.status.in_(["not_started", "in_progress"]))
    )
    if request.subject_ids:
        topics_query = topics_query.filter(Topic.subject_id.in_(request.subject_ids))
    incomplete_topics = topics_query.all()

    # Calculate topic priorities
    scored_topics: List[Tuple[float, str, Topic, Optional[Exam]]] = []
    for t in incomplete_topics:
        subject = subjects.get(t.subject_id)
        if not subject:
            continue
        earliest_exam = earliest_exam_by_subject.get(t.subject_id)
        has_missed = (t.id in missed_topic_ids) or (t.subject_id in missed_subject_ids)
        score, explanation = calculate_topic_priority(
            topic=t,
            subject=subject,
            earliest_exam=earliest_exam,
            reference_date=today,
            exam_survival_mode=survival_mode,
            has_missed_sessions=has_missed,
        )
        scored_topics.append((score, explanation, t, earliest_exam))

    # Sort topics descending by calculated priority score
    scored_topics.sort(key=lambda item: item[0], reverse=True)

    # Load existing commitments (completed and preserved pending sessions)
    existing_sessions = (
        db.query(StudySession)
        .filter(StudySession.scheduled_date >= start_date)
        .filter(StudySession.scheduled_date <= end_date)
        .filter(StudySession.status == "completed")  # Preserved
        .all()
    )
    existing_by_date: Dict[date, List[Tuple[int, int]]] = {}
    for s in existing_sessions:
        if s.start_time:
            s_start = time_to_minutes(s.start_time)
            dur = s.actual_duration_minutes or s.planned_duration_minutes
            s_end = s_start + dur
            existing_by_date.setdefault(s.scheduled_date, []).append((s_start, s_end))

    # Build daily free interval schedules
    window_start_min = time_to_minutes(pref_start)
    window_end_min = time_to_minutes(pref_end)

    daily_free_intervals: Dict[date, List[Tuple[int, int]]] = {}
    daily_workloads_dict: Dict[date, DailyWorkload] = {}

    current_d = start_date
    while current_d <= end_date:
        weekday_idx = current_d.weekday()  # 0 = Monday, 6 = Sunday
        weekday_code = day_abbrs[weekday_idx]
        is_active_day = weekday_code in available_days_list

        if not is_active_day:
            daily_free_intervals[current_d] = []
            daily_workloads_dict[current_d] = DailyWorkload(
                date=current_d,
                day_name=current_d.strftime("%A"),
                total_planned_minutes=0,
                capacity_minutes=0,
                sessions_count=0,
                is_available=False,
            )
        else:
            base_window = [(window_start_min, window_end_min)]
            occupied: List[Tuple[int, int]] = []

            # Unavailable recurring blocks for this weekday
            for blk in unavail_blocks:
                if blk.day_of_week.lower() in ["all", weekday_code]:
                    b_start = time_to_minutes(blk.start_time)
                    b_end = time_to_minutes(blk.end_time)
                    occupied.append((b_start, b_end))

            # Existing preserved completed sessions
            if current_d in existing_by_date:
                occupied.extend(existing_by_date[current_d])

            free = subtract_intervals(base_window, occupied)
            daily_free_intervals[current_d] = free

            daily_workloads_dict[current_d] = DailyWorkload(
                date=current_d,
                day_name=current_d.strftime("%A"),
                total_planned_minutes=0,
                capacity_minutes=daily_capacity_minutes,
                sessions_count=0,
                is_available=True,
            )

        current_d += timedelta(days=1)

    # Allocate tasks into feasible slots
    proposed_sessions: List[ProposedSession] = []
    unscheduled_tasks: List[UnscheduledTask] = []

    for score, reason, topic, earliest_exam in scored_topics:
        subject = subjects[topic.subject_id]
        topic_duration_needed = topic.estimated_duration_minutes or 60
        allocated = False

        # If topic has an exam, must be scheduled on or before exam date
        exam_limit_date = earliest_exam.exam_date if earliest_exam else None

        current_d = start_date
        while current_d <= end_date:
            if exam_limit_date and current_d > exam_limit_date:
                # Cannot schedule past examination deadline
                break

            workload = daily_workloads_dict[current_d]
            if not workload.is_available:
                current_d += timedelta(days=1)
                continue

            free_slots = daily_free_intervals[current_d]
            remaining_day_capacity = daily_capacity_minutes - workload.total_planned_minutes

            if remaining_day_capacity <= 0 or not free_slots:
                current_d += timedelta(days=1)
                continue

            # Check if any free slot can accommodate the session (up to max_duration chunk)
            chunk_duration = min(topic_duration_needed, max_duration, remaining_day_capacity)

            if chunk_duration < 15:
                # Slot too small for a meaningful session
                current_d += timedelta(days=1)
                continue

            # Find earliest slot that fits chunk_duration
            slot_found_idx: Optional[int] = None
            slot_start_min: Optional[int] = None

            for idx, (f_start, f_end) in enumerate(free_slots):
                if (f_end - f_start) >= chunk_duration:
                    slot_found_idx = idx
                    slot_start_min = f_start
                    break

            if slot_found_idx is not None and slot_start_min is not None:
                slot_end_min = slot_start_min + chunk_duration

                proposed_sessions.append(
                    ProposedSession(
                        subject_id=subject.id,
                        subject_name=subject.name,
                        subject_color=subject.color or "#3b82f6",
                        topic_id=topic.id,
                        topic_title=topic.title,
                        title=f"Study: {topic.title}",
                        scheduled_date=current_d,
                        start_time=minutes_to_time(slot_start_min),
                        end_time=minutes_to_time(slot_end_min),
                        planned_duration_minutes=chunk_duration,
                        priority_score=round(score, 1),
                        reason=reason,
                    )
                )

                workload.total_planned_minutes += chunk_duration
                workload.sessions_count += 1

                # Update free intervals: slot used + break duration
                slot_occupied_until = slot_end_min + break_duration
                f_start, f_end = free_slots[slot_found_idx]

                new_slots = free_slots[:slot_found_idx]
                if slot_occupied_until < f_end:
                    new_slots.append((slot_occupied_until, f_end))
                new_slots.extend(free_slots[slot_found_idx + 1:])
                daily_free_intervals[current_d] = new_slots

                allocated = True
                break

            current_d += timedelta(days=1)

        if not allocated:
            conflict_type = "capacity_exceeded"
            conflict_msg = "Daily capacity or available study windows exhausted across the planning period."

            if exam_limit_date and exam_limit_date < start_date:
                conflict_type = "before_exam_deadline"
                conflict_msg = f"Exam date ({exam_limit_date}) occurs before the schedule start date."
            elif exam_limit_date and start_date <= exam_limit_date <= end_date:
                conflict_type = "before_exam_deadline"
                conflict_msg = f"All available study slots prior to exam '{earliest_exam.title}' on {exam_limit_date} are fully booked."
            elif not any(w.is_available for w in daily_workloads_dict.values()):
                conflict_type = "no_available_days"
                conflict_msg = "No available study days configured in preferences."

            unscheduled_tasks.append(
                UnscheduledTask(
                    topic_id=topic.id,
                    topic_title=topic.title,
                    subject_id=subject.id,
                    subject_name=subject.name,
                    estimated_duration_minutes=topic.estimated_duration_minutes,
                    reason=conflict_msg,
                    conflict_type=conflict_type,
                )
            )

    explanations: List[str] = [
        f"Generated plan from {start_date} to {end_date} across {len(daily_workloads_dict)} days.",
        f"Target study capacity: {daily_target_hours:.1f} hours/day between {pref_start} and {pref_end}.",
        f"Allocated {len(proposed_sessions)} focus sessions totaling {sum(p.planned_duration_minutes for p in proposed_sessions)} minutes.",
    ]
    if survival_mode:
        explanations.append("Exam Survival Mode active: Upcoming exam topics were prioritized with doubled urgency weights.")
    if unscheduled_tasks:
        explanations.append(f"Notice: {len(unscheduled_tasks)} topic(s) could not be scheduled within current capacity constraints.")

    # Sort proposed sessions chronologically
    proposed_sessions.sort(key=lambda s: (s.scheduled_date, s.start_time))

    return GeneratedPlanResponse(
        start_date=start_date,
        end_date=end_date,
        exam_survival_mode=survival_mode,
        total_proposed_sessions=len(proposed_sessions),
        total_planned_minutes=sum(p.planned_duration_minutes for p in proposed_sessions),
        proposed_sessions=proposed_sessions,
        unscheduled_tasks=unscheduled_tasks,
        daily_workloads=list(daily_workloads_dict.values()),
        explanations=explanations,
    )


def confirm_study_plan(
    db: Session,
    request: ConfirmPlanRequest,
) -> int:
    """Applies proposed sessions to the database and logs a schedule history record."""
    if not request.sessions:
        return 0

    dates = {s.scheduled_date for s in request.sessions}
    min_date = min(dates)
    max_date = max(dates)

    if request.mode == "replace_pending":
        # Remove only pending sessions in this date range; completed sessions are strictly preserved
        db.query(StudySession).filter(
            StudySession.scheduled_date >= min_date,
            StudySession.scheduled_date <= max_date,
            StudySession.status == "pending",
        ).delete(synchronize_session="fetch")

    # Insert proposed sessions
    created_count = 0
    for ps in request.sessions:
        new_sess = StudySession(
            subject_id=ps.subject_id,
            topic_id=ps.topic_id,
            title=ps.title,
            scheduled_date=ps.scheduled_date,
            start_time=ps.start_time,
            planned_duration_minutes=ps.planned_duration_minutes,
            status="pending",
            notes=f"Priority Score: {ps.priority_score}. Reason: {ps.reason}",
        )
        db.add(new_sess)
        created_count += 1

    # Record Schedule History
    summary_text = (
        request.action_summary
        or f"Applied intelligent plan ({request.mode}): {created_count} session(s) from {min_date} to {max_date}."
    )
    history = ScheduleHistory(
        action="confirm_plan",
        summary=summary_text,
        sessions_created=created_count,
        exam_survival_mode=request.exam_survival_mode,
        details=json.dumps({
            "mode": request.mode,
            "min_date": str(min_date),
            "max_date": str(max_date),
            "count": created_count,
        }),
    )
    db.add(history)
    db.commit()

    return created_count


def recover_missed_study_sessions(
    db: Session,
    request: RecoverMissedRequest,
    reference_today: Optional[date] = None,
) -> RecoverMissedResponse:
    """Identifies missed or overdue sessions and reschedules them into the earliest available study windows."""
    today = reference_today or date.today()
    target_start = request.target_start_date or today
    target_end = request.target_end_date or (target_start + timedelta(days=6))
    lookback_cutoff = today - timedelta(days=request.lookback_days)

    # Detect missed sessions: explicitly marked 'missed' or 'pending' with date < today
    missed_sessions = (
        db.query(StudySession)
        .filter(StudySession.scheduled_date >= lookback_cutoff)
        .filter(
            (StudySession.status == "missed")
            | ((StudySession.status == "pending") & (StudySession.scheduled_date < today))
        )
        .order_by(StudySession.scheduled_date.asc())
        .all()
    )

    if not missed_sessions:
        return RecoverMissedResponse(
            missed_sessions_detected=0,
            recovered_sessions=[],
            unrecoverable_tasks=[],
            summary="No missed or overdue sessions detected in the lookback window.",
        )

    # Use the plan generator over the target recovery window, with missed topics prioritized
    missed_subject_ids = list({s.subject_id for s in missed_sessions})

    gen_request = PlanGenerateRequest(
        start_date=target_start,
        end_date=target_end,
        subject_ids=missed_subject_ids,
        exam_survival_mode=request.exam_survival_mode,
    )

    plan = generate_intelligent_study_plan(db, gen_request, reference_today=today)

    # Annotate recovered sessions with a clear recovery reason
    for s in plan.proposed_sessions:
        s.reason = f"Missed Session Recovery: {s.reason}"

    summary = (
        f"Detected {len(missed_sessions)} missed session(s). "
        f"Proposed {len(plan.proposed_sessions)} recovery session(s) across {target_start} to {target_end}. "
        f"{len(plan.unscheduled_tasks)} task(s) could not fit before their deadlines."
    )

    return RecoverMissedResponse(
        missed_sessions_detected=len(missed_sessions),
        recovered_sessions=plan.proposed_sessions,
        unrecoverable_tasks=plan.unscheduled_tasks,
        summary=summary,
    )

