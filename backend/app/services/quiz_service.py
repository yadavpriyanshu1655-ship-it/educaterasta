import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple, Set
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.quiz import (
    Quiz,
    QuizTopic,
    Question,
    QuizQuestion,
    QuizAttempt,
    AttemptAnswer,
    TopicPerformance,
    TopicPrerequisite,
)
from backend.app.schemas.quiz import (
    QuestionOption,
    QuestionPublicResponse,
    QuestionDetailResponse,
    QuizSummaryResponse,
    QuizResultResponse,
    TopicBreakdownItem,
    DifficultyBreakdownItem,
    AnswerReviewItem,
    WeakTopicItem,
    MistakeAnalysisItem,
    RecommendationItem,
)


def parse_json_safely(val: Any) -> Any:
    """Helper to parse JSON string or return raw value."""
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return val
    return val


def normalize_answer(val: Any) -> Any:
    """Normalize answer string or list for comparison."""
    if val is None:
        return ""
    if isinstance(val, list):
        return sorted([str(x).strip().lower() for x in val if x is not None])
    val_str = str(val).strip().lower()
    # Check if string is a JSON array
    if val_str.startswith("[") and val_str.endswith("]"):
        try:
            parsed = json.loads(val_str)
            if isinstance(parsed, list):
                return sorted([str(x).strip().lower() for x in parsed if x is not None])
        except Exception:
            pass
    return val_str


def evaluate_single_answer(
    question_type: str,
    correct_raw: Any,
    selected_raw: Any,
) -> Tuple[bool, Optional[str]]:
    """
    Evaluates student answer against correct answer.
    Returns (is_correct, mistake_category).
    """
    if selected_raw is None or selected_raw == "" or selected_raw == []:
        return False, "incomplete"

    norm_selected = normalize_answer(selected_raw)
    norm_correct = normalize_answer(correct_raw)

    if question_type in ("single_choice", "true_false"):
        is_correct = (norm_selected == norm_correct)
        mistake_cat = None if is_correct else "conceptual"
        return is_correct, mistake_cat

    elif question_type == "multiple_select":
        sel_set = set(norm_selected) if isinstance(norm_selected, list) else {norm_selected}
        cor_set = set(norm_correct) if isinstance(norm_correct, list) else {norm_correct}

        is_correct = (sel_set == cor_set)
        if is_correct:
            return True, None
        elif sel_set.issubset(cor_set):
            return False, "incorrect_selection"  # Missed some correct options
        elif cor_set.issubset(sel_set):
            return False, "incorrect_selection"  # Selected extra wrong option
        else:
            return False, "conceptual"

    elif question_type == "short_answer":
        # Check direct match or acceptable keywords
        acceptable: Set[str] = set()
        if isinstance(norm_correct, list):
            acceptable = set(norm_correct)
        else:
            # Check comma-separated keywords
            acceptable = {k.strip().lower() for k in str(correct_raw).split(",") if k.strip()}

        sel_str = str(norm_selected).strip()
        is_correct = (sel_str in acceptable)

        if is_correct:
            return True, None
        elif any(c.isdigit() for c in str(correct_raw)):
            return False, "calculation"
        else:
            return False, "conceptual"

    # Default fallback
    is_correct = (str(selected_raw).strip().lower() == str(correct_raw).strip().lower())
    return is_correct, None if is_correct else "unclassified"


# --- Question Sanitizer ---

def format_question_public_response(q: Question, order: int = 1) -> QuestionPublicResponse:
    options_data = parse_json_safely(q.options)
    options_list = []
    if isinstance(options_data, list):
        for opt in options_data:
            if isinstance(opt, dict) and "id" in opt and "text" in opt:
                options_list.append(QuestionOption(id=opt["id"], text=opt["text"]))
            elif isinstance(opt, str):
                options_list.append(QuestionOption(id=opt, text=opt))

    return QuestionPublicResponse(
        id=q.id,
        subject_id=q.subject_id,
        topic_id=q.topic_id,
        question_text=q.question_text,
        question_type=q.question_type,
        difficulty=q.difficulty,
        options=options_list if options_list else None,
        marks=q.marks,
        negative_marks=q.negative_marks,
        question_order=order,
    )


def format_question_detail_response(q: Question) -> QuestionDetailResponse:
    options_data = parse_json_safely(q.options)
    options_list = []
    if isinstance(options_data, list):
        for opt in options_data:
            if isinstance(opt, dict) and "id" in opt and "text" in opt:
                options_list.append(QuestionOption(id=opt["id"], text=opt["text"]))
            elif isinstance(opt, str):
                options_list.append(QuestionOption(id=opt, text=opt))

    correct_ans = parse_json_safely(q.correct_answer)

    return QuestionDetailResponse(
        id=q.id,
        subject_id=q.subject_id,
        topic_id=q.topic_id,
        question_text=q.question_text,
        question_type=q.question_type,
        difficulty=q.difficulty,
        options=options_list if options_list else None,
        correct_answer=correct_ans,
        explanation=q.explanation,
        marks=q.marks,
        negative_marks=q.negative_marks,
        source=q.source,
        subject_name=q.subject.name if q.subject else None,
        topic_title=q.topic.title if q.topic else None,
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


def format_quiz_summary_response(quiz: Quiz) -> QuizSummaryResponse:
    topic_ids = [qt.topic_id for qt in quiz.quiz_topics]
    topic_titles = [qt.topic.title for qt in quiz.quiz_topics if qt.topic]
    q_count = len(quiz.quiz_questions)

    return QuizSummaryResponse(
        id=quiz.id,
        subject_id=quiz.subject_id,
        subject_name=quiz.subject.name if quiz.subject else "General",
        subject_color=quiz.subject.color if quiz.subject else "#3b82f6",
        title=quiz.title,
        description=quiz.description,
        duration_minutes=quiz.duration_minutes,
        difficulty=quiz.difficulty,
        passing_percentage=quiz.passing_percentage,
        status=quiz.status,
        feedback_mode=quiz.feedback_mode,
        question_count=q_count,
        topic_ids=topic_ids,
        topic_titles=topic_titles,
        created_at=quiz.created_at,
        updated_at=quiz.updated_at,
    )


# --- Attempt Evaluation Engine ---

def evaluate_and_submit_attempt(
    db: Session,
    attempt: QuizAttempt,
    answers_input: Optional[List[Dict[str, Any]]] = None,
) -> QuizResultResponse:
    """
    Evaluates quiz attempt deterministically:
    - Calculates marks, accuracy, passing status
    - Updates topic performances
    - Detects mistakes and categorizes them
    - Generates personalized recommendations
    """
    quiz = attempt.quiz

    # If answers supplied in submit request, persist them
    if answers_input:
        for ans_in in answers_input:
            qid = ans_in.get("question_id")
            val = ans_in.get("selected_answer")
            time_spent = ans_in.get("time_spent_seconds", 0)
            if not qid:
                continue

            existing_ans = (
                db.query(AttemptAnswer)
                .filter(
                    AttemptAnswer.attempt_id == attempt.id,
                    AttemptAnswer.question_id == qid,
                )
                .first()
            )
            val_stored = json.dumps(val) if isinstance(val, (list, dict)) else str(val) if val is not None else None

            if existing_ans:
                existing_ans.selected_answer = val_stored
                existing_ans.time_spent_seconds = time_spent
            else:
                new_ans = AttemptAnswer(
                    attempt_id=attempt.id,
                    question_id=qid,
                    selected_answer=val_stored,
                    time_spent_seconds=time_spent,
                )
                db.add(new_ans)
        db.flush()

    # Fetch all questions in quiz order
    quiz_questions = (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz.id)
        .order_by(QuizQuestion.question_order.asc())
        .all()
    )

    existing_answers_map = {
        a.question_id: a
        for a in db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt.id).all()
    }

    # Tracking metrics
    total_q = len(quiz_questions)
    attempted_q = 0
    correct_q = 0
    incorrect_q = 0
    unanswered_q = 0
    total_marks = 0.0
    obtained_marks = 0.0

    topic_stats: Dict[int, Dict[str, Any]] = {}
    difficulty_stats: Dict[str, Dict[str, Any]] = {
        "easy": {"total": 0, "correct": 0},
        "medium": {"total": 0, "correct": 0},
        "hard": {"total": 0, "correct": 0},
    }

    reviewed_answers: List[AnswerReviewItem] = []
    mistakes_list: List[AnswerReviewItem] = []

    # Check for historical mistakes on these questions
    prior_incorrect_qids = set(
        qid
        for (qid,) in db.query(AttemptAnswer.question_id)
        .join(QuizAttempt, AttemptAnswer.attempt_id == QuizAttempt.id)
        .filter(
            QuizAttempt.id != attempt.id,
            QuizAttempt.status == "completed",
            AttemptAnswer.is_correct == False,
        )
        .all()
    )

    for qq in quiz_questions:
        q = qq.question
        total_marks += q.marks

        diff_key = q.difficulty.lower() if q.difficulty else "medium"
        if diff_key in difficulty_stats:
            difficulty_stats[diff_key]["total"] += 1

        tid = q.topic_id
        if tid not in topic_stats:
            topic_stats[tid] = {
                "topic_id": tid,
                "topic_title": q.topic.title if q.topic else f"Topic {tid}",
                "total": 0,
                "correct": 0,
                "incorrect": 0,
                "obtained_marks": 0.0,
                "total_marks": 0.0,
            }
        topic_stats[tid]["total"] += 1
        topic_stats[tid]["total_marks"] += q.marks

        ans_record = existing_answers_map.get(q.id)
        selected_raw = parse_json_safely(ans_record.selected_answer) if ans_record else None
        correct_raw = parse_json_safely(q.correct_answer)

        if selected_raw is None or selected_raw == "" or selected_raw == []:
            unanswered_q += 1
            is_correct = False
            obtained_q_marks = 0.0
            mistake_cat = "incomplete"
        else:
            attempted_q += 1
            is_correct, mistake_cat = evaluate_single_answer(q.question_type, correct_raw, selected_raw)

            if is_correct:
                correct_q += 1
                obtained_q_marks = q.marks
                mistake_cat = None
            else:
                incorrect_q += 1
                obtained_q_marks = -abs(q.negative_marks) if q.negative_marks > 0 else 0.0
                # Check for repeated mistake
                if q.id in prior_incorrect_qids:
                    mistake_cat = "repeated_mistake"

        obtained_marks += obtained_q_marks
        if is_correct:
            if diff_key in difficulty_stats:
                difficulty_stats[diff_key]["correct"] += 1
            topic_stats[tid]["correct"] += 1
        else:
            topic_stats[tid]["incorrect"] += 1
        topic_stats[tid]["obtained_marks"] += obtained_q_marks

        # Update or create answer record in DB
        if ans_record:
            ans_record.is_correct = is_correct
            ans_record.obtained_marks = obtained_q_marks
            ans_record.mistake_category = mistake_cat
        else:
            ans_record = AttemptAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_answer=None,
                is_correct=False,
                obtained_marks=0.0,
                time_spent_seconds=0,
                mistake_category="incomplete",
            )
            db.add(ans_record)

        # Parse options for review
        options_data = parse_json_safely(q.options)
        opts_list = []
        if isinstance(options_data, list):
            for opt in options_data:
                if isinstance(opt, dict) and "id" in opt and "text" in opt:
                    opts_list.append(QuestionOption(id=opt["id"], text=opt["text"]))
                elif isinstance(opt, str):
                    opts_list.append(QuestionOption(id=opt, text=opt))

        review_item = AnswerReviewItem(
            question_id=q.id,
            question_text=q.question_text,
            question_type=q.question_type,
            difficulty=q.difficulty,
            topic_id=q.topic_id,
            topic_title=q.topic.title if q.topic else f"Topic {q.topic_id}",
            options=opts_list if opts_list else None,
            selected_answer=selected_raw,
            correct_answer=correct_raw,
            is_correct=is_correct,
            obtained_marks=obtained_q_marks,
            marks=q.marks,
            negative_marks=q.negative_marks,
            explanation=q.explanation,
            mistake_category=mistake_cat,
        )
        reviewed_answers.append(review_item)
        if not is_correct:
            mistakes_list.append(review_item)

    # Floor obtained marks at 0.0
    final_obtained_marks = max(0.0, round(obtained_marks, 2))
    accuracy_pct = round((correct_q / total_q * 100.0), 1) if total_q > 0 else 0.0
    is_passed = (accuracy_pct >= quiz.passing_percentage)

    now_utc = datetime.now(timezone.utc)
    started_at = attempt.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    time_spent = int((now_utc - started_at).total_seconds())
    if time_spent < 0:
        time_spent = 0

    # Update attempt
    attempt.status = "completed"
    attempt.submitted_at = now_utc
    attempt.time_spent_seconds = time_spent
    attempt.total_questions = total_q
    attempt.attempted_questions = attempted_q
    attempt.correct_answers = correct_q
    attempt.incorrect_answers = incorrect_q
    attempt.unanswered_questions = unanswered_q
    attempt.total_marks = round(total_marks, 2)
    attempt.obtained_marks = final_obtained_marks
    attempt.accuracy_percentage = accuracy_pct
    attempt.is_passed = is_passed

    db.flush()

    # Update TopicPerformance for each tested topic
    update_topic_performances_from_attempt(db, attempt, topic_stats)

    # Construct topic breakdown
    topic_breakdown: List[TopicBreakdownItem] = []
    recommendations: List[str] = []

    for t_data in topic_stats.values():
        t_tot = t_data["total"]
        t_cor = t_data["correct"]
        t_acc = round((t_cor / t_tot * 100.0), 1) if t_tot > 0 else 0.0

        topic_breakdown.append(
            TopicBreakdownItem(
                topic_id=t_data["topic_id"],
                topic_title=t_data["topic_title"],
                total_questions=t_tot,
                correct_count=t_cor,
                incorrect_count=t_data["incorrect"],
                accuracy_percentage=t_acc,
                obtained_marks=round(t_data["obtained_marks"], 2),
                total_marks=round(t_data["total_marks"], 2),
            )
        )

        if t_acc < 50.0:
            recommendations.append(
                f"Weak performance in '{t_data['topic_title']}' ({t_acc}% accuracy). Review foundational concepts and attempt 5 practice questions."
            )
        elif t_acc < 70.0:
            recommendations.append(
                f"Needs improvement in '{t_data['topic_title']}' ({t_acc}% accuracy). Revisit key formulas and tricky problem types."
            )

    difficulty_breakdown = [
        DifficultyBreakdownItem(
            difficulty=k.capitalize(),
            total_questions=v["total"],
            correct_count=v["correct"],
            accuracy_percentage=round((v["correct"] / v["total"] * 100.0), 1) if v["total"] > 0 else 0.0,
        )
        for k, v in difficulty_stats.items()
        if v["total"] > 0
    ]

    if not is_passed:
        recommendations.append(
            f"Passing score of {quiz.passing_percentage}% not reached. Practice the flagged mistake questions and retry."
        )
    elif accuracy_pct >= 85.0:
        recommendations.append("Outstanding performance! You are ready to advance to higher difficulty topics.")

    db.commit()

    return QuizResultResponse(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        status="completed",
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        time_spent_seconds=attempt.time_spent_seconds,
        total_questions=total_q,
        attempted_questions=attempted_q,
        correct_answers=correct_q,
        incorrect_answers=incorrect_q,
        unanswered_questions=unanswered_q,
        total_marks=attempt.total_marks,
        obtained_marks=attempt.obtained_marks,
        accuracy_percentage=accuracy_pct,
        is_passed=is_passed,
        passing_percentage=quiz.passing_percentage,
        topic_breakdown=topic_breakdown,
        difficulty_breakdown=difficulty_breakdown,
        mistakes=mistakes_list,
        answers=reviewed_answers,
        recommendations=recommendations,
    )


def update_topic_performances_from_attempt(
    db: Session,
    attempt: QuizAttempt,
    current_attempt_topic_stats: Dict[int, Dict[str, Any]],
) -> None:
    """
    Recalculates cumulative TopicPerformance for all topics touched in attempt.
    """
    for tid in current_attempt_topic_stats.keys():
        # Query all historical answers for this topic across completed attempts
        answers = (
            db.query(AttemptAnswer)
            .join(QuizAttempt, AttemptAnswer.attempt_id == QuizAttempt.id)
            .join(Question, AttemptAnswer.question_id == Question.id)
            .filter(
                QuizAttempt.status == "completed",
                Question.topic_id == tid,
            )
            .all()
        )

        attempts_count = len(answers)
        if attempts_count == 0:
            continue

        correct_count = sum(1 for a in answers if a.is_correct)
        incorrect_count = attempts_count - correct_count
        acc_pct = round((correct_count / attempts_count * 100.0), 1)

        # Mastery estimate: weights accuracy by sample size evidence (max 100%)
        # 1-2 attempts capped at low mastery; 5+ attempts reflects full accuracy
        evidence_factor = min(1.0, attempts_count / 5.0)
        mastery = round(acc_pct * evidence_factor, 1)

        # Classification rule
        if attempts_count < 3:
            classification = "Insufficient Data"
            confidence = "Low"
        else:
            confidence = "High" if attempts_count >= 6 else "Medium"
            if acc_pct >= 80.0:
                classification = "Strong"
            elif acc_pct >= 65.0:
                classification = "Moderate"
            elif acc_pct >= 50.0:
                classification = "Needs Improvement"
            else:
                classification = "Weak"

        perf = db.query(TopicPerformance).filter(TopicPerformance.topic_id == tid).first()
        now_time = datetime.now(timezone.utc)

        if perf:
            perf.attempts_count = attempts_count
            perf.correct_count = correct_count
            perf.incorrect_count = incorrect_count
            perf.accuracy_percentage = acc_pct
            perf.mastery_estimate = mastery
            perf.classification = classification
            perf.confidence_level = confidence
            perf.last_attempted_at = now_time
        else:
            perf = TopicPerformance(
                topic_id=tid,
                attempts_count=attempts_count,
                correct_count=correct_count,
                incorrect_count=incorrect_count,
                accuracy_percentage=acc_pct,
                mastery_estimate=mastery,
                classification=classification,
                confidence_level=confidence,
                last_attempted_at=now_time,
            )
            db.add(perf)

    db.flush()


# --- Weak Topics & Mistake Query Services ---

def get_weak_topics_list(db: Session) -> List[WeakTopicItem]:
    """
    Returns classified weak and needs-improvement topics with evidence and prerequisite warnings.
    """
    performances = (
        db.query(TopicPerformance)
        .join(Topic, TopicPerformance.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .all()
    )

    weak_items: List[WeakTopicItem] = []

    for p in performances:
        if p.classification not in ("Weak", "Needs Improvement"):
            continue

        topic = p.topic
        subject = topic.subject if topic else None

        # Check prerequisite dependencies
        prereqs = (
            db.query(TopicPrerequisite)
            .filter(TopicPrerequisite.topic_id == p.topic_id)
            .all()
        )
        prereq_warnings: List[str] = []
        for pr in prereqs:
            pr_topic = pr.prerequisite_topic
            if pr_topic:
                pr_perf = (
                    db.query(TopicPerformance)
                    .filter(TopicPerformance.topic_id == pr_topic.id)
                    .first()
                )
                if pr_perf and pr_perf.classification in ("Weak", "Needs Improvement"):
                    prereq_warnings.append(
                        f"Prerequisite '{pr_topic.title}' is also classified as {pr_perf.classification} ({pr_perf.accuracy_percentage}% accuracy)."
                    )
                elif pr_topic.status == "not_started":
                    prereq_warnings.append(
                        f"Foundational prerequisite '{pr_topic.title}' has not been studied yet."
                    )

        reason = (
            f"Accuracy is {p.accuracy_percentage}% across {p.attempts_count} question attempts. "
            f"{p.incorrect_count} errors recorded."
        )

        if p.classification == "Weak":
            rec_action = f"Schedule a 45-minute revision block for {topic.title} and solve 5 beginner questions."
        else:
            rec_action = f"Targeted practice: solve medium-difficulty practice questions on {topic.title}."

        weak_items.append(
            WeakTopicItem(
                topic_id=p.topic_id,
                topic_title=topic.title if topic else f"Topic {p.topic_id}",
                subject_id=subject.id if subject else 0,
                subject_name=subject.name if subject else "General",
                subject_color=subject.color if subject else "#3b82f6",
                accuracy_percentage=p.accuracy_percentage,
                mastery_estimate=p.mastery_estimate,
                attempts_count=p.attempts_count,
                classification=p.classification,
                confidence_level=p.confidence_level,
                reason=reason,
                recommended_action=rec_action,
                prerequisite_warnings=prereq_warnings,
            )
        )

    # Sort weakest first
    weak_items.sort(key=lambda x: (0 if x.classification == "Weak" else 1, x.accuracy_percentage))
    return weak_items


def get_mistakes_history(db: Session, limit: int = 50) -> List[MistakeAnalysisItem]:
    """
    Returns list of incorrectly answered questions with classification and repeated mistake checks.
    """
    answers = (
        db.query(AttemptAnswer)
        .join(QuizAttempt, AttemptAnswer.attempt_id == QuizAttempt.id)
        .join(Question, AttemptAnswer.question_id == Question.id)
        .filter(
            QuizAttempt.status == "completed",
            AttemptAnswer.is_correct == False,
        )
        .order_by(QuizAttempt.submitted_at.desc())
        .limit(limit)
        .all()
    )

    items: List[MistakeAnalysisItem] = []

    for a in answers:
        q = a.question
        attempt = a.attempt

        # Count how many times this question was failed
        fail_count = (
            db.query(func.count(AttemptAnswer.id))
            .filter(
                AttemptAnswer.question_id == q.id,
                AttemptAnswer.is_correct == False,
            )
            .scalar()
        ) or 1

        is_repeated = (fail_count > 1 or a.mistake_category == "repeated_mistake")

        cat = a.mistake_category or "unclassified"
        if is_repeated:
            action = f"Repeated error on this question ({fail_count} times). Re-read explanation and practice similar problems."
        elif cat == "calculation":
            action = "Double check arithmetic and intermediate steps."
        elif cat == "incorrect_selection":
            action = "Carefully review all choices; multi-select questions require identifying every correct fact."
        elif cat == "incomplete":
            action = "Answer was left blank. Time management or hesitation may be the cause."
        else:
            action = "Conceptual gap detected. Review relevant study notes."

        items.append(
            MistakeAnalysisItem(
                question_id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                topic_id=q.topic_id,
                topic_title=q.topic.title if q.topic else f"Topic {q.topic_id}",
                subject_name=q.subject.name if q.subject else "General",
                selected_answer=parse_json_safely(a.selected_answer),
                correct_answer=parse_json_safely(q.correct_answer),
                explanation=q.explanation,
                mistake_category=cat,
                is_repeated=is_repeated,
                attempt_id=attempt.id,
                attempted_at=attempt.submitted_at or attempt.started_at,
                suggested_action=action,
            )
        )

    return items


def get_personalized_recommendations(db: Session) -> List[RecommendationItem]:
    """
    Grounded recommendations connecting quiz performance with Phase 01 topic states
    and Phase 02 study scheduling system.
    """
    recommendations: List[RecommendationItem] = []

    # 1. Weak topics recommendations
    weak_topics = get_weak_topics_list(db)
    for wt in weak_topics[:3]:
        recommendations.append(
            RecommendationItem(
                id=f"weak-topic-{wt.topic_id}",
                type="revise_weak_topic",
                topic_id=wt.topic_id,
                topic_title=wt.topic_title,
                subject_name=wt.subject_name,
                priority="high" if wt.classification == "Weak" else "medium",
                title=f"Schedule Revision: {wt.topic_title}",
                description=f"Classified as {wt.classification} ({wt.accuracy_percentage}% accuracy across {wt.attempts_count} attempts). {wt.recommended_action}",
                action_type="schedule_session",
                action_payload={
                    "topic_id": wt.topic_id,
                    "subject_id": wt.subject_id,
                    "title": f"Targeted Review: {wt.topic_title}",
                    "planned_duration_minutes": 45,
                },
            )
        )

    # 2. Repeated mistakes recommendation
    repeated_mistakes_count = (
        db.query(func.count(AttemptAnswer.id))
        .filter(AttemptAnswer.mistake_category == "repeated_mistake")
        .scalar()
    ) or 0

    if repeated_mistakes_count > 0:
        recommendations.append(
            RecommendationItem(
                id="retry-repeated-mistakes",
                type="retry_mistakes",
                priority="high",
                title="Review Repeated Mistakes",
                description=f"You have {repeated_mistakes_count} repeated mistake(s) across recent quiz attempts. Reviewing these reinforces memory retention.",
                action_type="review_mistakes",
            )
        )

    # 3. High mastery topics recommendation
    strong_topics = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.classification == "Strong")
        .limit(2)
        .all()
    )
    for st in strong_topics:
        if st.topic:
            recommendations.append(
                RecommendationItem(
                    id=f"strong-topic-{st.topic_id}",
                    type="increase_difficulty",
                    topic_id=st.topic_id,
                    topic_title=st.topic.title,
                    subject_name=st.topic.subject.name if st.topic.subject else "General",
                    priority="low",
                    title=f"Mastery Demonstrated: {st.topic.title}",
                    description=f"{st.accuracy_percentage}% accuracy. Ready for challenging application exercises.",
                    action_type="start_practice",
                    action_payload={"topic_id": st.topic_id, "difficulty": "hard"},
                )
            )

    return recommendations


# --- Topic Prerequisites DAG & Cycle Prevention ---

def check_cycle_in_prerequisites(db: Session, topic_id: int, target_prereq_id: int) -> bool:
    """
    DFS check: returns True if target_prereq_id can already reach topic_id,
    meaning adding (topic_id -> target_prereq_id) would introduce a cycle.
    """
    visited: Set[int] = set()
    queue = [target_prereq_id]

    while queue:
        curr = queue.pop()
        if curr == topic_id:
            return True
        if curr in visited:
            continue
        visited.add(curr)

        # Find what curr depends on
        direct_prereqs = (
            db.query(TopicPrerequisite.prerequisite_topic_id)
            .filter(TopicPrerequisite.topic_id == curr)
            .all()
        )
        for (next_pid,) in direct_prereqs:
            if next_pid not in visited:
                queue.append(next_pid)

    return False


def add_topic_prerequisite(
    db: Session,
    topic_id: int,
    prerequisite_topic_id: int,
    relationship_type: str = "prerequisite",
) -> TopicPrerequisite:
    """
    Adds a prerequisite dependency with self-dependency & circular cycle validation.
    """
    if topic_id == prerequisite_topic_id:
        raise ValueError("A topic cannot have a dependency on itself.")

    # Verify both topics exist
    t1 = db.query(Topic).filter(Topic.id == topic_id).first()
    t2 = db.query(Topic).filter(Topic.id == prerequisite_topic_id).first()
    if not t1 or not t2:
        raise ValueError("One or both topics do not exist.")

    # Check for existing duplicate
    existing = (
        db.query(TopicPrerequisite)
        .filter(
            TopicPrerequisite.topic_id == topic_id,
            TopicPrerequisite.prerequisite_topic_id == prerequisite_topic_id,
        )
        .first()
    )
    if existing:
        return existing

    # Cycle check
    if check_cycle_in_prerequisites(db, topic_id, prerequisite_topic_id):
        raise ValueError(
            f"Cannot add prerequisite '{t2.title}' to '{t1.title}': it would introduce a circular dependency cycle."
        )

    link = TopicPrerequisite(
        topic_id=topic_id,
        prerequisite_topic_id=prerequisite_topic_id,
        relationship_type=relationship_type,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


# --- Adaptive Practice Engine ---

def get_next_adaptive_question(
    db: Session,
    subject_id: int,
    topic_id: Optional[int] = None,
) -> Optional[Tuple[Question, str, float]]:
    """
    Selects suitable question based on recent student accuracy:
    - Analyzes current topic mastery
    - Adjusts target difficulty gradually
    - Prioritizes un-attempted or least recently attempted questions
    Returns (Question, reason_str, current_mastery)
    """
    # 1. Determine target topic
    target_topic_id = topic_id
    current_mastery = 0.0

    if target_topic_id:
        perf = db.query(TopicPerformance).filter(TopicPerformance.topic_id == target_topic_id).first()
        if perf:
            current_mastery = perf.mastery_estimate
    else:
        # Pick weakest topic in subject
        weakest = (
            db.query(TopicPerformance)
            .join(Topic, TopicPerformance.topic_id == Topic.id)
            .filter(Topic.subject_id == subject_id)
            .order_by(TopicPerformance.mastery_estimate.asc())
            .first()
        )
        if weakest:
            target_topic_id = weakest.topic_id
            current_mastery = weakest.mastery_estimate
        else:
            # Pick first topic in subject
            first_t = db.query(Topic).filter(Topic.subject_id == subject_id).first()
            if first_t:
                target_topic_id = first_t.id

    if not target_topic_id:
        return None

    # 2. Determine target difficulty
    if current_mastery >= 75.0:
        target_diffs = ["hard", "medium", "easy"]
        reason = f"High demonstrated mastery ({current_mastery}%). Serving advanced/hard problem."
    elif current_mastery >= 45.0:
        target_diffs = ["medium", "easy", "hard"]
        reason = f"Moderate mastery ({current_mastery}%). Serving standard intermediate practice."
    else:
        target_diffs = ["easy", "medium", "hard"]
        reason = f"Topic mastery is developing ({current_mastery}%). Serving foundational/beginner question."

    # 3. Find question least recently correctly answered
    recently_correct_qids = set(
        qid
        for (qid,) in db.query(AttemptAnswer.question_id)
        .join(QuizAttempt, AttemptAnswer.attempt_id == QuizAttempt.id)
        .filter(AttemptAnswer.is_correct == True)
        .all()
    )

    # Search in order of preferred difficulty
    for diff in target_diffs:
        query = db.query(Question).filter(
            Question.topic_id == target_topic_id,
            Question.difficulty == diff,
        )
        # Prefer questions not recently answered correctly
        candidates = query.all()
        unseen = [q for q in candidates if q.id not in recently_correct_qids]
        if unseen:
            return unseen[0], reason, current_mastery
        elif candidates:
            return candidates[0], reason, current_mastery

    # Fallback to any question in subject
    fallback = (
        db.query(Question)
        .filter(Question.subject_id == subject_id)
        .first()
    )
    if fallback:
        return fallback, "General practice question.", current_mastery

    return None

