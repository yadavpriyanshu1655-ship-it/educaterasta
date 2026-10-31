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
});
