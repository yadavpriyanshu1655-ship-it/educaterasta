from datetime import date, timedelta
from fastapi.testclient import TestClient


def test_preferences_lifecycle(client: TestClient):
    """Test getting and updating study preferences and availability."""
    # 1. Get default preferences
    res = client.get("/api/v1/planner/preferences")
    assert res.status_code == 200
    pref = res.json()
    assert pref["daily_target_hours"] == 3.0
    assert pref["preferred_start_time"] == "09:00"
    assert pref["preferred_end_time"] == "21:00"
    assert pref["exam_survival_mode"] is False

    # 2. Update preferences
    update_payload = {
        "daily_target_hours": 4.5,
        "preferred_start_time": "08:00",
        "preferred_end_time": "20:00",
        "exam_survival_mode": True,
        "break_duration_minutes": 20,
    }
    update_res = client.put("/api/v1/planner/preferences", json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["daily_target_hours"] == 4.5
    assert updated["preferred_start_time"] == "08:00"
    assert updated["preferred_end_time"] == "20:00"
    assert updated["exam_survival_mode"] is True
    assert updated["break_duration_minutes"] == 20


def test_unavailable_blocks_lifecycle(client: TestClient):
    """Test creating, listing, and deleting recurring unavailable blocks."""
    # 1. Add block
    payload = {
        "title": "College Lecture",
        "day_of_week": "mon",
        "start_time": "10:00",
        "end_time": "13:00",
    }
    res = client.post("/api/v1/planner/unavailable-blocks", json=payload)
    assert res.status_code == 201
    block = res.json()
    assert block["title"] == "College Lecture"
    assert block["day_of_week"] == "mon"
    block_id = block["id"]

    # 2. List blocks
    list_res = client.get("/api/v1/planner/unavailable-blocks")
    assert list_res.status_code == 200
    assert any(b["id"] == block_id for b in list_res.json())

    # 3. Delete block
    del_res = client.delete(f"/api/v1/planner/unavailable-blocks/{block_id}")
    assert del_res.status_code == 204

    # 4. Verify deleted
    list_res_after = client.get("/api/v1/planner/unavailable-blocks")
    assert not any(b["id"] == block_id for b in list_res_after.json())


def test_intelligent_study_plan_generation_and_priority(client: TestClient):
    """Test priority engine, exam urgency weighting, and constraint satisfaction."""
    today = date.today()

    # Create Subject A with an urgent exam in 3 days
    sub_a = client.post("/api/v1/subjects", json={"name": "Calculus", "color": "#3b82f6"}).json()
    exam_date_a = (today + timedelta(days=3)).isoformat()
    client.post(
        "/api/v1/exams",
        json={"subject_id": sub_a["id"], "title": "Calculus Midterm", "exam_date": exam_date_a},
    )

    # Create Topic A1 (High priority) and A2 (Medium priority)
    topic_a1 = client.post(
        f"/api/v1/subjects/{sub_a['id']}/topics",
        json={"title": "Integration by Parts", "priority": "high", "estimated_duration_minutes": 60},
    ).json()
    topic_a2 = client.post(
        f"/api/v1/subjects/{sub_a['id']}/topics",
        json={"title": "Taylor Series", "priority": "medium", "estimated_duration_minutes": 60},
    ).json()

    # Create Subject B with no exam, low priority topic
    sub_b = client.post("/api/v1/subjects", json={"name": "Music Theory", "color": "#10b981"}).json()
    topic_b1 = client.post(
        f"/api/v1/subjects/{sub_b['id']}/topics",
        json={"title": "Circle of Fifths", "priority": "low", "estimated_duration_minutes": 60},
    ).json()

    # Generate Plan for next 3 days
    gen_payload = {
        "start_date": today.isoformat(),
        "end_date": (today + timedelta(days=2)).isoformat(),
        "daily_target_hours": 2.0,  # 120 min max per day
        "preferred_start_time": "09:00",
        "preferred_end_time": "15:00",
        "max_session_duration_minutes": 60,
        "break_duration_minutes": 15,
        "exam_survival_mode": True,
    }
    res = client.post("/api/v1/planner/generate", json=gen_payload)
    assert res.status_code == 200
    plan = res.json()

    assert plan["total_proposed_sessions"] > 0
    proposed = plan["proposed_sessions"]

    # Verify high priority exam topic is ranked first
    assert proposed[0]["topic_id"] == topic_a1["id"]
    assert "Exam" in proposed[0]["reason"]
    assert proposed[0]["priority_score"] > 80  # 50 base + 40 exam urgency * 2 in survival mode + 50 boost

    # Verify no overlapping sessions
    sessions_by_date: dict = {}
    for sess in proposed:
        sessions_by_date.setdefault(sess["scheduled_date"], []).append(sess)

    for d, s_list in sessions_by_date.items():
        total_day_min = sum(s["planned_duration_minutes"] for s in s_list)
        # Verify daily capacity constraint is strictly respected (120 min)
        assert total_day_min <= 120

        # Verify time intervals do not overlap
        sorted_s = sorted(s_list, key=lambda x: x["start_time"])
        for i in range(len(sorted_s) - 1):
            assert sorted_s[i]["end_time"] <= sorted_s[i + 1]["start_time"]


def test_confirm_plan_and_history_logging(client: TestClient):
    """Test confirming a proposed plan, replacing pending sessions, and verifying schedule history."""
    today = date.today()
    sub = client.post("/api/v1/subjects", json={"name": "Linear Algebra"}).json()
    topic = client.post(
        f"/api/v1/subjects/{sub['id']}/topics",
        json={"title": "Eigenvalues", "priority": "high", "estimated_duration_minutes": 60},
    ).json()

    # Pre-existing completed session (must NOT be deleted or moved)
    completed_sess = client.post(
        "/api/v1/study-sessions",
        json={
            "subject_id": sub["id"],
            "topic_id": topic["id"],
            "title": "Completed Eigenvectors",
            "scheduled_date": today.isoformat(),
            "start_time": "08:00",
            "planned_duration_minutes": 60,
            "actual_duration_minutes": 55,
            "status": "completed",
        },
    ).json()

    # Pre-existing pending session (should be safely replaced)
    old_pending_sess = client.post(
        "/api/v1/study-sessions",
        json={
            "subject_id": sub["id"],
            "title": "Old Pending Session",
            "scheduled_date": today.isoformat(),
            "start_time": "14:00",
            "planned_duration_minutes": 60,
            "status": "pending",
        },
    ).json()

    # Generate plan
    plan = client.post(
        "/api/v1/planner/generate",
        json={"start_date": today.isoformat(), "end_date": today.isoformat()},
    ).json()

    # Confirm plan with replace_pending
    confirm_payload = {
        "sessions": plan["proposed_sessions"],
        "mode": "replace_pending",
        "action_summary": "Applied test schedule for Linear Algebra",
        "exam_survival_mode": False,
    }
    confirm_res = client.post("/api/v1/planner/confirm-plan", json=confirm_payload)
    assert confirm_res.status_code == 201

    # Verify completed session still exists
    all_sess = client.get(f"/api/v1/study-sessions?scheduled_date={today.isoformat()}").json()
    titles = [s["title"] for s in all_sess]
    assert "Completed Eigenvectors" in titles
    assert "Old Pending Session" not in titles
    assert any("Study: Eigenvalues" in t for t in titles)

    # Verify schedule history logged
    hist_res = client.get("/api/v1/planner/history")
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert len(hist) >= 1
    assert "Linear Algebra" in hist[0]["summary"]


def test_missed_session_recovery_workflow(client: TestClient):
    """Test detecting missed sessions and recovering them into feasible future slots."""
    today = date.today()
    sub = client.post("/api/v1/subjects", json={"name": "Discrete Mathematics"}).json()
    topic = client.post(
        f"/api/v1/subjects/{sub['id']}/topics",
        json={"title": "Graph Theory", "priority": "high", "estimated_duration_minutes": 60},
    ).json()

    # Create a missed session in the past
    past_date = (today - timedelta(days=2)).isoformat()
    client.post(
        "/api/v1/study-sessions",
        json={
            "subject_id": sub["id"],
            "topic_id": topic["id"],
            "title": "Missed Graph Theory Intro",
            "scheduled_date": past_date,
            "planned_duration_minutes": 60,
            "status": "missed",
        },
    )

    # Call recover-missed
    rec_res = client.post(
        "/api/v1/planner/recover-missed",
        json={"lookback_days": 7, "target_start_date": today.isoformat()},
    )
    assert rec_res.status_code == 200
    rec = rec_res.json()
    assert rec["missed_sessions_detected"] >= 1
    assert len(rec["recovered_sessions"]) >= 1
    assert "Missed Session Recovery" in rec["recovered_sessions"][0]["reason"]


def test_empty_datasets_and_completed_topics_excluded(client: TestClient):
    """Test scheduling handles empty database and complete topics safely without exceptions."""
    today = date.today()

    # 1. Fully empty database test
    res = client.post("/api/v1/planner/generate", json={"start_date": today.isoformat()})
    assert res.status_code == 200
    data = res.json()
    assert data["total_proposed_sessions"] == 0
    assert data["proposed_sessions"] == []
    assert data["unscheduled_tasks"] == []

    # 2. Subject exists but all topics are completed
    sub = client.post("/api/v1/subjects", json={"name": "Art History"}).json()
    client.post(
        f"/api/v1/subjects/{sub['id']}/topics",
        json={"title": "Renaissance", "status": "completed", "estimated_duration_minutes": 60},
    )

    res2 = client.post(
        "/api/v1/planner/generate",
        json={"start_date": today.isoformat(), "subject_ids": [sub["id"]]},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total_proposed_sessions"] == 0
    assert data2["unscheduled_tasks"] == []
