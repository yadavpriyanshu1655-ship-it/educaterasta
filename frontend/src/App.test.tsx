import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

describe('EDUCATERASTA Phase 01 Frontend Tests', () => {
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
    expect(screen.getAllByText('Study Planner')[0]).toBeInTheDocument();
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
});
