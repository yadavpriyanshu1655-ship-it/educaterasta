import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient


def create_sample_subject_and_topics(client: TestClient):
    """Helper to setup test subject and topics."""
    # Subject
    sub_resp = client.post("/api/v1/subjects", json={"name": "Computer Science", "color": "#0ea5e9"})
    assert sub_resp.status_code == 201
    subject_id = sub_resp.json()["id"]

    # Topics
    t1_resp = client.post(
        f"/api/v1/subjects/{subject_id}/topics",
        json={"title": "Data Structures", "priority": "high", "estimated_duration_minutes": 60},
    )
    assert t1_resp.status_code == 201
    t1_id = t1_resp.json()["id"]

    t2_resp = client.post(
        f"/api/v1/subjects/{subject_id}/topics",
        json={"title": "Algorithms & Complexity", "priority": "high", "estimated_duration_minutes": 90},
    )
    assert t2_resp.status_code == 201
    t2_id = t2_resp.json()["id"]

    return subject_id, t1_id, t2_id


def test_question_bank_crud_and_security(client: TestClient):
    subject_id, t1_id, _ = create_sample_subject_and_topics(client)

    # 1. Create single-choice question
    q1_resp = client.post(
        "/api/v1/questions",
        json={
            "subject_id": subject_id,
            "topic_id": t1_id,
            "question_text": "What is the worst-case time complexity of binary search?",
            "question_type": "single_choice",
            "difficulty": "medium",
            "options": [
                {"id": "A", "text": "O(1)"},
                {"id": "B", "text": "O(log n)"},
                {"id": "C", "text": "O(n)"},
                {"id": "D", "text": "O(n log n)"},
            ],
            "correct_answer": "B",
            "explanation": "Binary search divides the search space in half at each step, yielding O(log n).",
            "marks": 2.0,
            "negative_marks": 0.5,
        },
    )
    assert q1_resp.status_code == 201
    q1_data = q1_resp.json()
    assert q1_data["id"] > 0
    assert q1_data["correct_answer"] == "B"
    assert q1_data["explanation"] is not None

    # 2. Create multiple-select question
    q2_resp = client.post(
        "/api/v1/questions",
        json={
            "subject_id": subject_id,
            "topic_id": t1_id,
            "question_text": "Which of the following data structures are linear?",
            "question_type": "multiple_select",
            "difficulty": "easy",
            "options": [
                {"id": "A", "text": "Array"},
                {"id": "B", "text": "Tree"},
                {"id": "C", "text": "Linked List"},
                {"id": "D", "text": "Graph"},
            ],
            "correct_answer": ["A", "C"],
            "explanation": "Arrays and Linked Lists are linear, while Trees and Graphs are non-linear.",
            "marks": 2.0,
        },
    )
    assert q2_resp.status_code == 201
    assert q2_resp.json()["correct_answer"] == ["A", "C"]

    # 3. List questions with filter
    list_resp = client.get(f"/api/v1/questions?topic_id={t1_id}")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 2


def test_quiz_lifecycle_and_attempt_experience(client: TestClient):
    subject_id, t1_id, t2_id = create_sample_subject_and_topics(client)

    # Create questions
    q1 = client.post(
        "/api/v1/questions",
        json={
            "subject_id": subject_id,
            "topic_id": t1_id,
            "question_text": "A stack operates on LIFO principle.",
            "question_type": "true_false",
            "difficulty": "easy",
            "options": [{"id": "True", "text": "True"}, {"id": "False", "text": "False"}],
            "correct_answer": "True",
            "explanation": "Stack is Last-In-First-Out.",
            "marks": 1.0,
            "negative_marks": 0.25,
        },
    ).json()

    q2 = client.post(
        "/api/v1/questions",
        json={
            "subject_id": subject_id,
            "topic_id": t2_id,
            "question_text": "What sorting algorithm has best-case time complexity O(n)?",
            "question_type": "short_answer",
            "difficulty": "medium",
            "correct_answer": "Insertion Sort, Bubble Sort",
            "explanation": "Insertion sort runs in linear time when the array is already sorted.",
            "marks": 2.0,
            "negative_marks": 0.0,
        },
    ).json()

    # 1. Create Quiz
    quiz_resp = client.post(
        "/api/v1/quizzes",
        json={
            "subject_id": subject_id,
            "title": "CS Fundamentals Practice Quiz",
            "description": "Timed assessment on data structures and algorithms.",
            "duration_minutes": 10,
            "difficulty": "medium",
            "passing_percentage": 60.0,
            "status": "published",
            "feedback_mode": "post_submission",
            "topic_ids": [t1_id, t2_id],
            "question_ids": [q1["id"], q2["id"]],
        },
    )
    assert quiz_resp.status_code == 201
    quiz_data = quiz_resp.json()
    quiz_id = quiz_data["id"]
    assert quiz_data["question_count"] == 2
    assert len(quiz_data["topic_ids"]) == 2

    # 2. Start Quiz Attempt (Security Check: answers must NOT be exposed)
    start_resp = client.post(f"/api/v1/quizzes/{quiz_id}/start")
    assert start_resp.status_code == 201
    start_data = start_resp.json()
    attempt_id = start_data["attempt_id"]
    assert start_data["total_questions"] == 2

    for sq in start_data["questions"]:
        assert "correct_answer" not in sq
        assert "explanation" not in sq

    # 3. Auto-save answer
    save_resp = client.post(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"question_id": q1["id"], "selected_answer": "True", "time_spent_seconds": 15},
    )
    assert save_resp.status_code == 200

    # 4. Refresh attempt (verifies state persistence across page refreshes)
    refresh_resp = client.get(f"/api/v1/attempts/{attempt_id}")
    assert refresh_resp.status_code == 200
    refreshed_data = refresh_resp.json()
    assert str(q1["id"]) in str(refreshed_data["saved_answers"])
    # Public security still applies
    for sq in refreshed_data["questions"]:
        assert "correct_answer" not in sq

    # 5. Submit Attempt
    submit_resp = client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        json={
            "answers": [
                {"question_id": q1["id"], "selected_answer": "True", "time_spent_seconds": 20},
                {"question_id": q2["id"], "selected_answer": "Insertion Sort", "time_spent_seconds": 35},
            ]
        },
    )
    assert submit_resp.status_code == 200
    result_data = submit_resp.json()
    assert result_data["total_questions"] == 2
    assert result_data["correct_answers"] == 2
    assert result_data["accuracy_percentage"] == 100.0
    assert result_data["is_passed"] is True
    assert result_data["obtained_marks"] == 3.0

    # 6. Verify cannot alter answers after submission
    late_save = client.post(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"question_id": q1["id"], "selected_answer": "False"},
    )
    assert late_save.status_code == 400


def test_evaluation_negative_marking_and_mistake_categorization(client: TestClient):
    subject_id, t1_id, _ = create_sample_subject_and_topics(client)

    # Multi-select with negative marking
    q1 = client.post(
        "/api/v1/questions",
        json={
            "subject_id": subject_id,
            "topic_id": t1_id,
            "question_text": "Select all prime numbers below 10",
            "question_type": "multiple_select",
            "difficulty": "medium",
            "options": [
                {"id": "A", "text": "2"},
                {"id": "B", "text": "3"},
                {"id": "C", "text": "4"},
                {"id": "D", "text": "5"},
            ],
            "correct_answer": ["A", "B", "D"],
            "marks": 3.0,
            "negative_marks": 1.0,
        },
    ).json()

    quiz = client.post(
        "/api/v1/quizzes",
        json={
            "subject_id": subject_id,
            "title": "Prime Numbers Quiz",
            "duration_minutes": 5,
            "topic_ids": [t1_id],
            "question_ids": [q1["id"]],
        },
    ).json()

    # Attempt 1: Partial selection (only picked A, B) -> mistake: incorrect_selection
    att1 = client.post(f"/api/v1/quizzes/{quiz['id']}/start").json()
    res1 = client.post(
        f"/api/v1/attempts/{att1['attempt_id']}/submit",
        json={"answers": [{"question_id": q1["id"], "selected_answer": ["A", "B"]}]},
    ).json()

    assert res1["correct_answers"] == 0
    assert res1["obtained_marks"] == 0.0  # Floored at 0.0
    assert len(res1["mistakes"]) == 1
    assert res1["mistakes"][0]["mistake_category"] == "incorrect_selection"

    # Attempt 2 on same question: picked completely wrong answer -> repeated_mistake
    att2 = client.post(f"/api/v1/quizzes/{quiz['id']}/start").json()
    res2 = client.post(
        f"/api/v1/attempts/{att2['attempt_id']}/submit",
        json={"answers": [{"question_id": q1["id"], "selected_answer": ["C"]}]},
    ).json()

    assert res2["correct_answers"] == 0
    assert res2["mistakes"][0]["mistake_category"] == "repeated_mistake"

    # Check mistakes API
    mistakes_api = client.get("/api/v1/analytics/mistakes")
    assert mistakes_api.status_code == 200
    mistakes_data = mistakes_api.json()
    assert len(mistakes_data) >= 1
    assert any(m["is_repeated"] for m in mistakes_data)


def test_weak_topic_detection_thresholds_and_recommendations(client: TestClient):
    subject_id, t1_id, t2_id = create_sample_subject_and_topics(client)

    # Create 3 questions for t1
    q_ids = []
    for i in range(3):
        q = client.post(
            "/api/v1/questions",
            json={
                "subject_id": subject_id,
                "topic_id": t1_id,
                "question_text": f"Topic 1 diagnostic question {i+1}",
                "question_type": "true_false",
                "difficulty": "easy",
                "options": [{"id": "True", "text": "True"}, {"id": "False", "text": "False"}],
                "correct_answer": "True",
                "marks": 1.0,
            },
        ).json()
        q_ids.append(q["id"])

    quiz = client.post(
        "/api/v1/quizzes",
        json={
            "subject_id": subject_id,
            "title": "Topic 1 Diagnostic",
            "topic_ids": [t1_id],
            "question_ids": q_ids,
        },
    ).json()

    # Fail all 3 questions to exceed threshold of 3 attempts with <50% accuracy
    att = client.post(f"/api/v1/quizzes/{quiz['id']}/start").json()
    client.post(
        f"/api/v1/attempts/{att['attempt_id']}/submit",
        json={
            "answers": [
                {"question_id": q_ids[0], "selected_answer": "False"},
                {"question_id": q_ids[1], "selected_answer": "False"},
                {"question_id": q_ids[2], "selected_answer": "False"},
            ]
        },
    )

    # Verify Topic Performance
    tp_resp = client.get(f"/api/v1/analytics/topic-performance?subject_id={subject_id}")
    assert tp_resp.status_code == 200
    perf_list = [p for p in tp_resp.json() if p["topic_id"] == t1_id]
    assert len(perf_list) == 1
    t1_perf = perf_list[0]
    assert t1_perf["attempts_count"] == 3
    assert t1_perf["accuracy_percentage"] == 0.0
    assert t1_perf["classification"] == "Weak"
    assert t1_perf["confidence_level"] in ("Medium", "High")

    # Verify Weak Topics API
    weak_resp = client.get("/api/v1/analytics/weak-topics")
    assert weak_resp.status_code == 200
    weak_list = [w for w in weak_resp.json() if w["topic_id"] == t1_id]
    assert len(weak_list) == 1
    assert "Weak" in weak_list[0]["classification"]
    assert "accuracy" in weak_list[0]["reason"].lower()

    # Verify Recommendations API
    rec_resp = client.get("/api/v1/analytics/recommendations")
    assert rec_resp.status_code == 200
    recs = rec_resp.json()
    assert len(recs) >= 1
    assert any("Data Structures" in r["title"] or "Data Structures" in r["description"] for r in recs)


def test_topic_prerequisites_dag_and_cycle_prevention(client: TestClient):
    subject_id, t1_id, t2_id = create_sample_subject_and_topics(client)

    # Create topic 3
    t3 = client.post(
        f"/api/v1/subjects/{subject_id}/topics",
        json={"title": "Graph Algorithms", "priority": "high"},
    ).json()
    t3_id = t3["id"]

    # 1. Add valid prerequisite: t2 (Algorithms) depends on t1 (Data Structures)
    p1 = client.post(
        f"/api/v1/topics/{t2_id}/prerequisites",
        json={"prerequisite_topic_id": t1_id, "relationship_type": "prerequisite"},
    )
    assert p1.status_code == 201
    assert p1.json()["prerequisite_topic_id"] == t1_id

    # 2. Add valid prerequisite: t3 (Graph Algorithms) depends on t2 (Algorithms)
    p2 = client.post(
        f"/api/v1/topics/{t3_id}/prerequisites",
        json={"prerequisite_topic_id": t2_id, "relationship_type": "prerequisite"},
    )
    assert p2.status_code == 201

    # 3. Prevent self-dependency: t1 cannot depend on t1
    self_dep = client.post(
        f"/api/v1/topics/{t1_id}/prerequisites",
        json={"prerequisite_topic_id": t1_id},
    )
    assert self_dep.status_code == 400
    assert "itself" in self_dep.json()["detail"].lower()

    # 4. Prevent circular cycle: t1 cannot depend on t3 (chain: t1 -> t2 -> t3 -> t1)
    cycle_dep = client.post(
        f"/api/v1/topics/{t1_id}/prerequisites",
        json={"prerequisite_topic_id": t3_id},
    )
    assert cycle_dep.status_code == 400
    assert "circular" in cycle_dep.json()["detail"].lower()

    # 5. Retrieve prerequisites and dependents for t2
    deps_resp = client.get(f"/api/v1/topics/{t2_id}/prerequisites")
    assert deps_resp.status_code == 200
    deps_data = deps_resp.json()
    assert len(deps_data["prerequisites"]) == 1
    assert deps_data["prerequisites"][0]["prerequisite_topic_id"] == t1_id
    assert len(deps_data["dependents"]) == 1
    assert deps_data["dependents"][0]["topic_id"] == t3_id


def test_adaptive_question_selection(client: TestClient):
    subject_id, t1_id, _ = create_sample_subject_and_topics(client)

    # Create easy, medium, and hard questions
    client.post(
        "/api/v1/questions",
        json={
            "subject_id": subject_id,
            "topic_id": t1_id,
            "question_text": "Easy DS question",
            "question_type": "single_choice",
            "difficulty": "easy",
            "options": [{"id": "A", "text": "1"}],
            "correct_answer": "A",
        },
    )
    client.post(
        "/api/v1/questions",
        json={
            "subject_id": subject_id,
            "topic_id": t1_id,
            "question_text": "Hard DS question",
            "question_type": "single_choice",
            "difficulty": "hard",
            "options": [{"id": "A", "text": "1"}],
            "correct_answer": "A",
        },
    )

    # Call adaptive endpoint
    resp = client.get(f"/api/v1/quizzes/adaptive/next-question?subject_id={subject_id}&topic_id={t1_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["question"]["question_text"] is not None
    assert "reason" in data
    assert data["topic_id"] == t1_id

