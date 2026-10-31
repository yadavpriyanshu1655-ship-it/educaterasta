import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

describe('EDUCATERASTA Phase 01 & Phase 02 Frontend Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.location.hash = '#dashboard';
  });

  it('renders dashboard with actual API data and navigation elements', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('dashboard/summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total_subjects: 3,
            total_topics: 12,
            completed_topics: 6,
            overall_syllabus_progress: 50.0,
            total_study_sessions: 8,
            completed_study_sessions: 5,
            pending_study_sessions: 2,
            missed_study_sessions: 1,
            total_planned_minutes: 480,
            total_actual_minutes: 450,
            todays_sessions: [
              {
                id: 1,
                subject_id: 1,
                topic_id: 1,
                title: 'Calculus Derivatives Practice',
                scheduled_date: new Date().toISOString().split('T')[0],
                start_time: '10:00',
                planned_duration_minutes: 60,
                actual_duration_minutes: null,
                status: 'pending',
                notes: 'Work on chain rule problems',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                subject_name: 'Mathematics',
                subject_color: '#3b82f6',
                topic_title: 'Derivatives',
              },
            ],
            upcoming_exams: [
              {
                id: 1,
                subject_id: 1,
                title: 'Math Midterm Exam',
                exam_date: '2026-11-15',
                notes: 'Units 1-3',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                subject_name: 'Mathematics',
                subject_color: '#3b82f6',
                days_remaining: 16,
                is_today: false,
                is_past: false,
              },
            ],
            subject_progress: [
              {
                subject_id: 1,
                subject_name: 'Mathematics',
                color: '#3b82f6',
                total_topics: 6,
                completed_topics: 3,
                in_progress_topics: 2,
                not_started_topics: 1,
                progress_percentage: 50.0,
              },
            ],
            recent_activity: [],
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(<App />);

    // Brand and desktop sidebar navigation
    expect(screen.getAllByText('EDUCATERASTA')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Subjects')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Syllabus & Topics')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Examinations')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Analytics')[0]).toBeInTheDocument();

    // Verify Dashboard data loads
    await waitFor(() => {
      expect(screen.getByText('Study Overview')).toBeInTheDocument();
      expect(screen.getByText('Calculus Derivatives Practice')).toBeInTheDocument();
      expect(screen.getByText('Math Midterm Exam')).toBeInTheDocument();
      expect(screen.getByText('16 days left')).toBeInTheDocument();
    });
  });

  it('renders empty states gracefully when no records exist', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('dashboard/summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total_subjects: 0,
            total_topics: 0,
            completed_topics: 0,
            overall_syllabus_progress: 0.0,
            total_study_sessions: 0,
            completed_study_sessions: 0,
            pending_study_sessions: 0,
            missed_study_sessions: 0,
            total_planned_minutes: 0,
            total_actual_minutes: 0,
            todays_sessions: [],
            upcoming_exams: [],
            subject_progress: [],
            recent_activity: [],
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('No sessions planned for today')).toBeInTheDocument();
      expect(screen.getByText('No upcoming exams')).toBeInTheDocument();
      expect(screen.getByText('No subjects registered')).toBeInTheDocument();
    });
  });

  it('displays API error notice when backend fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.reject(new Error('Backend connection refused'))
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
      expect(screen.getByText('Backend connection refused')).toBeInTheDocument();
    });
  });

  it('navigates to Subjects page and shows create modal validation', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('/subjects')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });

    render(<App />);

    // Click on Subjects nav tab
    const subjectsTabs = screen.getAllByText('Subjects');
    fireEvent.click(subjectsTabs[0]);

    await waitFor(() => {
      expect(screen.getByText('No subjects created yet')).toBeInTheDocument();
    });

    // Click Add First Subject
    const addSubjectBtn = screen.getByText('Add First Subject');
    fireEvent.click(addSubjectBtn);

    // Verify modal opened
    expect(screen.getByText('Add New Subject')).toBeInTheDocument();
  });

  it('renders Study Planner with Intelligent Generator, Missed Recovery, and Weekly view', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('dashboard/summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total_subjects: 1,
            total_topics: 1,
            completed_topics: 0,
            overall_syllabus_progress: 0.0,
            total_study_sessions: 1,
            completed_study_sessions: 0,
            pending_study_sessions: 1,
            missed_study_sessions: 0,
            total_planned_minutes: 60,
            total_actual_minutes: 0,
            todays_sessions: [],
            upcoming_exams: [],
            subject_progress: [],
            recent_activity: [],
          }),
        } as Response);
      }
      if (urlStr.includes('/subjects')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 1, name: 'Physics', color: '#6366f1', description: 'Mechanics' },
          ],
        } as Response);
      }
      if (urlStr.includes('/planner/preferences')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1,
            daily_target_hours: 4.0,
            preferred_start_time: '09:00',
            preferred_end_time: '21:00',
            max_session_duration_minutes: 60,
            break_duration_minutes: 15,
            available_days: 'monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            exam_survival_mode: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        } as Response);
      }
      if (urlStr.includes('/study-sessions')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 1,
              subject_id: 1,
              topic_id: 1,
              title: 'Newtonian Dynamics',
              scheduled_date: new Date().toISOString().split('T')[0],
              start_time: '14:00',
              planned_duration_minutes: 60,
              actual_duration_minutes: null,
              status: 'pending',
              notes: 'Solve problem set 3',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              subject_name: 'Physics',
              subject_color: '#6366f1',
              topic_title: 'Forces & Motion',
            },
          ],
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(<App />);

    // Navigate to Planner using nav button
    const plannerBtn = screen.getAllByText('Study Planner').find((el) => el.closest('button'))?.closest('button');
    expect(plannerBtn).toBeDefined();
    fireEvent.click(plannerBtn!);

    await waitFor(() => {
      expect(screen.getByText('Newtonian Dynamics')).toBeInTheDocument();
      expect(screen.getByText('Intelligent Plan')).toBeInTheDocument();
      expect(screen.getByText('Recover Missed')).toBeInTheDocument();
      expect(screen.getByText('Survival Mode')).toBeInTheDocument();
      expect(screen.getByText('Daily View')).toBeInTheDocument();
      expect(screen.getByText('Weekly View')).toBeInTheDocument();
    });

    // Switch to Weekly View
    const weeklyBtn = screen.getByText('Weekly View');
    fireEvent.click(weeklyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Prev Week/i)).toBeInTheDocument();
      expect(screen.getByText(/Next Week/i)).toBeInTheDocument();
    });

    // Open Plan Generator Modal
    const intelligentPlanBtn = screen.getAllByText('Intelligent Plan').find((el) => el.closest('button'))?.closest('button');
    expect(intelligentPlanBtn).toBeDefined();
    fireEvent.click(intelligentPlanBtn!);

    await waitFor(() => {
      expect(screen.getByText('Intelligent Study Plan Generator')).toBeInTheDocument();
      expect(screen.getByText('Generate Plan Preview')).toBeInTheDocument();
    });
  });

  it('renders Settings page with Engine Capacity limits, unavailable blocks, and history audit', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('dashboard/summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total_subjects: 0,
            total_topics: 0,
            completed_topics: 0,
            overall_syllabus_progress: 0.0,
            total_study_sessions: 0,
            completed_study_sessions: 0,
            pending_study_sessions: 0,
            missed_study_sessions: 0,
            total_planned_minutes: 0,
            total_actual_minutes: 0,
            todays_sessions: [],
            upcoming_exams: [],
            subject_progress: [],
            recent_activity: [],
          }),
        } as Response);
      }
      if (urlStr.includes('/planner/preferences')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1,
            daily_target_hours: 5.0,
            preferred_start_time: '08:30',
            preferred_end_time: '22:00',
            max_session_duration_minutes: 90,
            break_duration_minutes: 20,
            available_days: 'monday,tuesday,wednesday,thursday,friday',
            exam_survival_mode: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        } as Response);
      }
      if (urlStr.includes('/planner/unavailable-blocks')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 1,
              title: 'University Lectures',
              day_of_week: 'monday',
              start_time: '10:00',
              end_time: '13:00',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        } as Response);
      }
      if (urlStr.includes('/planner/history')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 1,
              action: 'generate_plan',
              summary: 'Generated 6 study sessions across 3 days',
              sessions_created: 6,
              exam_survival_mode: false,
              details: null,
              created_at: new Date().toISOString(),
            },
          ],
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(<App />);

    // Navigate to Settings using nav button
    const settingsBtn = screen.getAllByText('Settings').find((el) => el.closest('button'))?.closest('button');
    expect(settingsBtn).toBeDefined();
    fireEvent.click(settingsBtn!);

    await waitFor(() => {
      expect(screen.getByText('Settings & Engine Capacity')).toBeInTheDocument();
      expect(screen.getByText('Study Availability & Capacity Limits')).toBeInTheDocument();
      expect(screen.getByText('Unavailable Time Blocks')).toBeInTheDocument();
      expect(screen.getByText('University Lectures')).toBeInTheDocument();
      expect(screen.getByText('Scheduling & Recovery Audit History')).toBeInTheDocument();
      expect(screen.getByText('Generated 6 study sessions across 3 days')).toBeInTheDocument();
      expect(screen.getByText('Save Availability Preferences')).toBeInTheDocument();
    });
  });

  it('navigates to Quizzes & Practice, validates sanitized question attempt, and shows results', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      const method = init?.method || 'GET';

      if (urlStr.includes('/api/v1/subjects')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 1, name: 'Mathematics', description: 'Calculus and Algebra', color: '#3b82f6', created_at: new Date().toISOString() },
          ],
        } as Response);
      }
      if (urlStr.includes('/api/v1/quizzes') && !urlStr.includes('/attempts') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 1,
              subject_id: 1,
              title: 'Calculus Diagnostics Quiz',
              description: 'Assess derivatives mastery',
              difficulty: 'medium',
              duration_minutes: 15,
              passing_percentage: 70.0,
              status: 'published',
              feedback_mode: 'post_submission',
              question_count: 1,
              topic_ids: [1],
              topic_titles: ['Derivatives'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              subject_name: 'Mathematics',
              subject_color: '#3b82f6',
            },
          ],
        } as Response);
      }
      if (urlStr.includes('/api/v1/quizzes/1/start') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            attempt_id: 101,
            quiz_id: 1,
            title: 'Calculus Diagnostics Quiz',
            duration_minutes: 15,
            feedback_mode: 'post_submission',
            started_at: new Date().toISOString(),
            total_questions: 1,
            saved_answers: {},
            questions: [
              {
                id: 10,
                subject_id: 1,
                topic_id: 1,
                question_text: 'What is the derivative of sin(x)?',
                question_type: 'single_choice',
                difficulty: 'medium',
                marks: 4.0,
                negative_marks: 1.0,
                options: [
                  { id: 'A', text: 'cos(x)' },
                  { id: 'B', text: '-cos(x)' },
                ],
                // Security Check: Public question payload NEVER includes correct_answer or explanation
              },
            ],
          }),
        } as Response);
      }
      if (urlStr.includes('/api/v1/attempts/101/answers') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1,
            attempt_id: 101,
            question_id: 10,
            selected_answer: 'A',
            is_correct: null,
            marks_awarded: null,
          }),
        } as Response);
      }
      if (urlStr.includes('/api/v1/attempts/101/submit') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            attempt_id: 101,
            quiz_id: 1,
            quiz_title: 'Calculus Diagnostics Quiz',
            status: 'completed',
            started_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            time_spent_seconds: 45,
            total_questions: 1,
            attempted_questions: 1,
            correct_answers: 1,
            incorrect_answers: 0,
            unanswered_questions: 0,
            unanswered: 0,
            total_marks: 4.0,
            obtained_marks: 4.0,
            accuracy_percentage: 100.0,
            is_passed: true,
            passing_percentage: 70.0,
            topic_breakdown: [
              {
                topic_id: 1,
                topic_title: 'Derivatives',
                total_questions: 1,
                correct_count: 1,
                incorrect_count: 0,
                accuracy_percentage: 100.0,
                obtained_marks: 4.0,
                total_marks: 4.0,
              },
            ],
            difficulty_breakdown: [
              {
                difficulty: 'medium',
                total_questions: 1,
                correct_count: 1,
                accuracy_percentage: 100.0,
              },
            ],
            mistakes: [],
            answers: [
              {
                question_id: 10,
                question_text: 'What is the derivative of sin(x)?',
                question_type: 'single_choice',
                difficulty: 'medium',
                topic_id: 1,
                topic_title: 'Derivatives',
                selected_answer: 'A',
                correct_answer: 'A',
                is_correct: true,
                obtained_marks: 4.0,
                marks: 4.0,
                negative_marks: 1.0,
                explanation: 'By definition of trigonometric derivative, d/dx(sin x) = cos x.',
                mistake_category: null,
                options: [
                  { id: 'A', text: 'cos(x)' },
                  { id: 'B', text: '-cos(x)' },
                ],
              },
            ],
            recommendations: ['Great work on trigonometric derivatives! Continue to integrals next.'],
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(<App />);

    // Click on Quizzes & Practice in navigation
    const quizzesNav = screen.getAllByText('Quizzes & Practice').find((el) => el.closest('button'))?.closest('button');
    expect(quizzesNav).toBeDefined();
    fireEvent.click(quizzesNav!);

    await waitFor(() => {
      expect(screen.getByText('Quizzes & Assessment')).toBeInTheDocument();
      expect(screen.getByText('Calculus Diagnostics Quiz')).toBeInTheDocument();
      expect(screen.getByText('Take Quiz')).toBeInTheDocument();
    });

    // Start Quiz
    fireEvent.click(screen.getByText('Take Quiz'));

    await waitFor(() => {
      // Quiz Taking UI rendered
      expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();
      expect(screen.getByText('What is the derivative of sin(x)?')).toBeInTheDocument();
      expect(screen.getByText('cos(x)')).toBeInTheDocument();
      // Security Check: Ensure explanation is NOT leaked in taking state
      expect(screen.queryByText('By definition of trigonometric derivative')).not.toBeInTheDocument();
    });

    // Select the option
    fireEvent.click(screen.getByText('cos(x)'));

    // Open confirmation
    const reviewBtn = screen.getByText('Review & Submit');
    fireEvent.click(reviewBtn);

    // Confirm submission
    await waitFor(() => {
      expect(screen.getByText('Confirm Submission')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Confirm Submission'));

    // Modal result should render post-submission details and explanations
    await waitFor(() => {
      expect(screen.getByText('Assessment Performance Analysis')).toBeInTheDocument();
      expect(screen.getByText('Assessment Passed')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('By definition of trigonometric derivative, d/dx(sin x) = cos x.')).toBeInTheDocument();
    });
  });

  it('navigates to Weak Topics & Mistakes and displays diagnostic metrics and recommendations', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('/api/v1/analytics/weak-topics')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              topic_id: 2,
              topic_title: 'Integration by Parts',
              subject_id: 1,
              subject_name: 'Mathematics',
              subject_color: '#3b82f6',
              attempts_count: 6,
              accuracy_percentage: 33.3,
              mastery_estimate: 33.3,
              classification: 'Weak',
              confidence_level: 'High',
              reason: 'Accuracy is 33.3% across 6 attempts (below 50% threshold).',
              recommended_action: 'Allocate high-priority revision session and practice foundation problems.',
              prerequisite_warnings: ['Prerequisite "Basic Antiderivatives" is incomplete.'],
            },
          ],
        } as Response);
      }
      if (urlStr.includes('/api/v1/analytics/topic-performance')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 1,
              topic_id: 2,
              subject_id: 1,
              total_questions_attempted: 6,
              correct_questions: 2,
              accuracy_percentage: 33.3,
              mastery_score: 0.33,
              last_attempted_at: new Date().toISOString(),
              topic_title: 'Integration by Parts',
              subject_name: 'Mathematics',
            },
          ],
        } as Response);
      }
      if (urlStr.includes('/api/v1/analytics/mistakes')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 1,
              attempt_id: 101,
              question_id: 12,
              topic_id: 2,
              mistake_category: 'conceptual',
              is_repeated: true,
              question_text: 'Evaluate integral of x*e^x dx',
              topic_title: 'Integration by Parts',
              subject_name: 'Mathematics',
              selected_answer: 'e^x + C',
              correct_answer: 'x*e^x - e^x + C',
              explanation: 'Use parts formula: uv - int(v du)',
              suggested_action: 'Review Integration by Parts derivation before taking more tests.',
              attempted_at: new Date().toISOString(),
            },
          ],
        } as Response);
      }
      if (urlStr.includes('/api/v1/analytics/recommendations')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 'rec_1',
              type: 'adaptive_practice',
              topic_id: 2,
              topic_title: 'Integration by Parts',
              subject_name: 'Mathematics',
              priority: 'high',
              title: 'Targeted Practice: Integration by Parts',
              description: 'Topic is marked Weak with repeated conceptual errors. Practice 5 easy questions.',
              action_type: 'start_quiz',
            },
          ],
        } as Response);
      }
      if (urlStr.includes('/api/v1/subjects')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 1, name: 'Mathematics', description: 'Calculus and Algebra', color: '#3b82f6', created_at: new Date().toISOString() },
          ],
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(<App />);

    // Click on Weak Topics & Mistakes in navigation
    const weakNav = screen.getAllByText('Weak Topics & Mistakes').find((el) => el.closest('button'))?.closest('button');
    expect(weakNav).toBeDefined();
    fireEvent.click(weakNav!);

    await waitFor(() => {
      expect(screen.getByText('Weak Topic Detection & Mistake Analyzer')).toBeInTheDocument();
      expect(screen.getByText('Integration by Parts')).toBeInTheDocument();
      expect(screen.getAllByText('33.3%')[0]).toBeInTheDocument();
      expect(screen.getByText('Prerequisite Alert')).toBeInTheDocument();
      expect(screen.getByText(/Prerequisite "Basic Antiderivatives" is incomplete/)).toBeInTheDocument();
    });

    // Check Mistakes tab
    const mistakesTab = screen.getByText(/Mistake Analysis Log/);
    fireEvent.click(mistakesTab);

    await waitFor(() => {
      expect(screen.getByText('Evaluate integral of x*e^x dx')).toBeInTheDocument();
      expect(screen.getByText('REPEATED ERROR')).toBeInTheDocument();
      expect(screen.getByText('x*e^x - e^x + C')).toBeInTheDocument();
    });

    // Check Recommendations tab
    const recTab = screen.getByText(/Practice Recommendations/);
    fireEvent.click(recTab);

    await waitFor(() => {
      expect(screen.getByText('Targeted Practice: Integration by Parts')).toBeInTheDocument();
      expect(screen.getByText(/Topic is marked Weak with repeated conceptual errors/)).toBeInTheDocument();
      expect(screen.getByText('Take Action →')).toBeInTheDocument();
    });
  });
});
