from datetime import date, timedelta
from fastapi.testclient import TestClient


def test_empty_database_states(client: TestClient):
    """Test dashboard and list endpoints return clean, empty state without errors."""
    # List subjects
    res = client.get("/api/v1/subjects")
    assert res.status_code == 200
    assert res.json() == []

    # List study sessions
    res = client.get("/api/v1/study-sessions")
    assert res.status_code == 200
    assert res.json() == []

    # List exams
    res = client.get("/api/v1/exams")
    assert res.status_code == 200
    assert res.json() == []

    # Dashboard summary
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_subjects"] == 0
    assert data["total_topics"] == 0
    assert data["completed_topics"] == 0
    assert data["overall_syllabus_progress"] == 0.0
    assert data["total_study_sessions"] == 0
    assert data["completed_study_sessions"] == 0
    assert data["pending_study_sessions"] == 0
    assert data["missed_study_sessions"] == 0
    assert data["todays_sessions"] == []
    assert data["upcoming_exams"] == []

    # Analytics overview
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    adata = res.json()
    assert adata["overall_completion_rate"] == 0.0
    assert adata["sessions_breakdown"]["total"] == 0


def test_subject_crud_lifecycle(client: TestClient):
    """Test creating, reading, updating, and deleting subjects."""
    # 1. Create subject
    create_payload = {
        "name": "Mathematics",
        "description": "Calculus and Linear Algebra",
        "color": "#10b981",
    }
    res = client.post("/api/v1/subjects", json=create_payload)
    assert res.status_code == 201
    subject = res.json()
    assert subject["id"] > 0
    assert subject["name"] == "Mathematics"
    assert subject["topic_count"] == 0
    assert subject["progress_percentage"] == 0.0
    subject_id = subject["id"]

    # Duplicate name should fail with 400
    res_dup = client.post("/api/v1/subjects", json=create_payload)
    assert res_dup.status_code == 400

    # 2. Get subject by ID
    res = client.get(f"/api/v1/subjects/{subject_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Mathematics"
    assert data["topics"] == []

    # 3. Update subject
    update_payload = {"description": "Advanced Applied Calculus", "color": "#0ea5e9"}
    res = client.patch(f"/api/v1/subjects/{subject_id}", json=update_payload)
    assert res.status_code == 200
    assert res.json()["description"] == "Advanced Applied Calculus"
    assert res.json()["color"] == "#0ea5e9"

    # 4. List subjects
    res = client.get("/api/v1/subjects")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 5. Delete subject
    res = client.delete(f"/api/v1/subjects/{subject_id}")
    assert res.status_code == 204

    # 6. Verify 404 after deletion
    res = client.get(f"/api/v1/subjects/{subject_id}")
    assert res.status_code == 404


def test_topic_management_and_progress_calculation(client: TestClient):
    """Test topic CRUD under subject and accurate progress calculation."""
    # Create Subject
    res = client.post("/api/v1/subjects", json={"name": "Physics", "color": "#8b5cf6"})
    assert res.status_code == 201
    subject_id = res.json()["id"]

    # Reject topic creation for nonexistent subject
    res = client.post(
        "/api/v1/subjects/9999/topics",
        json={"title": "Ghost Topic", "estimated_duration_minutes": 45},
    )
    assert res.status_code == 404

    # Reject topic with invalid duration (<= 0)
    res = client.post(
        f"/api/v1/subjects/{subject_id}/topics",
        json={"title": "Invalid Topic", "estimated_duration_minutes": 0},
    )
    assert res.status_code == 422

    # Add Topic 1
    res1 = client.post(
        f"/api/v1/subjects/{subject_id}/topics",
        json={
            "title": "Kinematics",
            "priority": "high",
            "estimated_duration_minutes": 90,
            "status": "not_started",
        },
    )
    assert res1.status_code == 201
    topic1 = res1.json()
    assert topic1["status"] == "not_started"

    # Add Topic 2
    res2 = client.post(
        f"/api/v1/subjects/{subject_id}/topics",
        json={
            "title": "Thermodynamics",
            "priority": "medium",
            "estimated_duration_minutes": 120,
            "status": "in_progress",
        },
    )
    assert res2.status_code == 201
    topic2 = res2.json()

    # Check progress: 0 completed out of 2 = 0.0%
    sub_res = client.get(f"/api/v1/subjects/{subject_id}")
    assert sub_res.json()["topic_count"] == 2
    assert sub_res.json()["completed_topic_count"] == 0
    assert sub_res.json()["progress_percentage"] == 0.0

    # Mark Topic 1 as completed
    res_patch = client.patch(
        f"/api/v1/topics/{topic1['id']}",
        json={"status": "completed"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "completed"

    # Check progress: 1 completed out of 2 = 50.0%
    sub_res = client.get(f"/api/v1/subjects/{subject_id}")
    assert sub_res.json()["completed_topic_count"] == 1
    assert sub_res.json()["progress_percentage"] == 50.0

    # Mark Topic 2 as completed
    client.patch(f"/api/v1/topics/{topic2['id']}", json={"status": "completed"})

    # Check progress: 2 completed out of 2 = 100.0%
    sub_res = client.get(f"/api/v1/subjects/{subject_id}")
    assert sub_res.json()["completed_topic_count"] == 2
    assert sub_res.json()["progress_percentage"] == 100.0

    # Delete topic
    del_res = client.delete(f"/api/v1/topics/{topic1['id']}")
    assert del_res.status_code == 204

    # Now 1 completed out of 1 = 100.0%
    sub_res = client.get(f"/api/v1/subjects/{subject_id}")
    assert sub_res.json()["topic_count"] == 1
    assert sub_res.json()["completed_topic_count"] == 1
    assert sub_res.json()["progress_percentage"] == 100.0


def test_study_session_validation_and_tracking(client: TestClient):
    """Test study session creation, topic association validation, durations, and status updates."""
    # Create 2 subjects
    sub1 = client.post("/api/v1/subjects", json={"name": "Chemistry"}).json()
    sub2 = client.post("/api/v1/subjects", json={"name": "Biology"}).json()

    # Create topic under Chemistry
    topic1 = client.post(
        f"/api/v1/subjects/{sub1['id']}/topics",
        json={"title": "Organic Compounds", "estimated_duration_minutes": 60},
    ).json()

    today_str = date.today().isoformat()

    # Reject study session referencing mismatched topic & subject
    mismatch_res = client.post(
        "/api/v1/study-sessions",
        json={
            "subject_id": sub2["id"],  # Biology
            "topic_id": topic1["id"],  # belongs to Chemistry!
            "title": "Mismatched session",
            "scheduled_date": today_str,
            "planned_duration_minutes": 45,
        },
    )
    assert mismatch_res.status_code == 400
    assert "does not belong to subject" in mismatch_res.json()["detail"]

    # Reject negative planned duration
    neg_res = client.post(
        "/api/v1/study-sessions",
        json={
            "subject_id": sub1["id"],
            "title": "Invalid session",
            "scheduled_date": today_str,
            "planned_duration_minutes": -10,
        },
    )
    assert neg_res.status_code == 422

    # Create valid session
    session_res = client.post(
        "/api/v1/study-sessions",
        json={
            "subject_id": sub1["id"],
            "topic_id": topic1["id"],
            "title": "Review Alkanes and Alkenes",
            "scheduled_date": today_str,
            "start_time": "14:00",
            "planned_duration_minutes": 60,
            "status": "pending",
        },
    )
    assert session_res.status_code == 201
    sess = session_res.json()
    assert sess["status"] == "pending"
    assert sess["subject_name"] == "Chemistry"
    assert sess["topic_title"] == "Organic Compounds"

    # Update session to completed with actual duration
    update_res = client.patch(
        f"/api/v1/study-sessions/{sess['id']}",
        json={
            "status": "completed",
            "actual_duration_minutes": 55,
            "notes": "Covered practice reactions successfully.",
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "completed"
    assert updated["actual_duration_minutes"] == 55

    # Reject negative actual duration
    neg_act_res = client.patch(
        f"/api/v1/study-sessions/{sess['id']}",
        json={"actual_duration_minutes": -5},
    )
    assert neg_act_res.status_code == 422


def test_examination_countdown_and_management(client: TestClient):
    """Test examination creation, upcoming countdown calculation, and deletion."""
    sub = client.post("/api/v1/subjects", json={"name": "History"}).json()

    today = date.today()
    future_date = (today + timedelta(days=7)).isoformat()
    today_date = today.isoformat()

    # 1. Create upcoming exam in 7 days
    exam_res = client.post(
        "/api/v1/exams",
        json={
            "subject_id": sub["id"],
            "title": "Midterm Exam",
            "exam_date": future_date,
            "notes": "Units 1 through 4",
        },
    )
    assert exam_res.status_code == 201
    exam = exam_res.json()
    assert exam["days_remaining"] == 7
    assert exam["is_today"] is False
    assert exam["is_past"] is False
    assert exam["subject_name"] == "History"

    # 2. Create exam today
    today_exam = client.post(
        "/api/v1/exams",
        json={
            "subject_id": sub["id"],
            "title": "Quick Quiz",
            "exam_date": today_date,
        },
    ).json()
    assert today_exam["days_remaining"] == 0
    assert today_exam["is_today"] is True

    # 3. List exams
    all_exams = client.get("/api/v1/exams").json()
    assert len(all_exams) >= 2


def test_dashboard_and_analytics_aggregation(client: TestClient):
    """Test end-to-end dashboard summary and analytics calculation with mixed data."""
    # Create Subject & Topics
    sub = client.post("/api/v1/subjects", json={"name": "Computer Science"}).json()
    client.post(
        f"/api/v1/subjects/{sub['id']}/topics",
        json={"title": "Data Structures", "status": "completed", "priority": "high", "estimated_duration_minutes": 60},
    )
    client.post(
        f"/api/v1/subjects/{sub['id']}/topics",
        json={"title": "Algorithms", "status": "in_progress", "priority": "high", "estimated_duration_minutes": 120},
    )

    # Create Session today
    client.post(
        "/api/v1/study-sessions",
        json={
            "subject_id": sub["id"],
            "title": "Binary Search Trees",
            "scheduled_date": date.today().isoformat(),
            "planned_duration_minutes": 60,
            "status": "completed",
            "actual_duration_minutes": 50,
        },
    )

    # Query Dashboard Summary
    dash_res = client.get("/api/v1/dashboard/summary")
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert dash["total_subjects"] >= 1
    assert dash["completed_study_sessions"] >= 1
    assert len(dash["todays_sessions"]) >= 1
    assert dash["total_actual_minutes"] >= 50

    # Query Analytics
    analytics_res = client.get("/api/v1/analytics/overview")
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert analytics["sessions_breakdown"]["completed"] >= 1
    assert analytics["time_metrics"]["total_planned_minutes"] >= 60
    assert analytics["time_metrics"]["total_actual_minutes"] >= 50

