import React, { useState, useEffect } from 'react';
import { DashboardSummary } from '../types';
import { getDashboardSummary, updateStudySession } from '../services/api';
import { StatCard } from '../components/StatCard';
import { ProgressBar } from '../components/ProgressBar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import {
  BookOpenIcon,
  LayersIcon,
  CalendarIcon,
  AwardIcon,
  PlusIcon,
  ClockIcon,
  CheckIcon,
  RefreshIcon,
  AlertCircleIcon,
} from '../components/Icons';

interface DashboardPageProps {
  onNavigate: (tab: 'subjects' | 'syllabus' | 'planner' | 'exams' | 'analytics') => void;
  onOpenNewSubject: () => void;
  onOpenNewSession: () => void;
  onOpenNewExam: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenNewSubject,
  onOpenNewSession,
  onOpenNewExam,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleMarkComplete = async (sessionId: number, plannedMinutes: number) => {
    setUpdatingSessionId(sessionId);
    try {
      await updateStudySession(sessionId, {
        status: 'completed',
        actual_duration_minutes: plannedMinutes,
      });
      await loadSummary();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete session');
    } finally {
      setUpdatingSessionId(null);
    }
  };

  const currentDateFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading && !summary) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="inline-block animate-spin text-sky-400">
          <RefreshIcon className="w-8 h-8" />
        </div>
        <p className="text-sm text-slate-400">Loading study dashboard metrics...</p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-2 font-semibold">
          <AlertCircleIcon className="w-5 h-5" />
          <span>Error loading dashboard</span>
        </div>
        <p className="mt-2 text-sm text-rose-300/90">{error}</p>
        <button
          onClick={loadSummary}
          className="mt-4 px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Study Overview</h2>
          <p className="mt-1 text-xs text-slate-400">{currentDateFormatted}</p>
        </div>
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onOpenNewSubject}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
          >
            <PlusIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>New Subject</span>
          </button>
          <button
            onClick={onOpenNewSession}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition shadow-sm"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Schedule Session</span>
          </button>
          <button
            onClick={onOpenNewExam}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
          >
            <PlusIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Exam</span>
          </button>
          <button
            onClick={loadSummary}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50"
            title="Refresh dashboard"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Subjects"
          value={summary?.total_subjects || 0}
          subtitle="Enrolled curriculum subjects"
          icon={<BookOpenIcon className="w-4 h-4 text-sky-400" />}
          accentColor="#0ea5e9"
        />
        <StatCard
          title="Total Topics"
          value={summary?.total_topics || 0}
          subtitle={`${summary?.completed_topics || 0} completed`}
          icon={<LayersIcon className="w-4 h-4 text-emerald-400" />}
          accentColor="#10b981"
        />
        <StatCard
          title="Completed Sessions"
          value={summary?.completed_study_sessions || 0}
          subtitle={`${summary?.total_actual_minutes || 0} minutes studied`}
          icon={<CalendarIcon className="w-4 h-4 text-purple-400" />}
          accentColor="#a855f7"
        />
        <StatCard
          title="Overall Syllabus"
          value={`${summary?.overall_syllabus_progress || 0}%`}
          subtitle="Across all active subjects"
          icon={<AwardIcon className="w-4 h-4 text-amber-400" />}
          accentColor="#f59e0b"
        />
      </div>

      {/* Today's Study Sessions & Upcoming Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Sessions (2 cols on lg) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-semibold text-white">Today's Study Schedule</h3>
              </div>
              <button
                onClick={() => onNavigate('planner')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                View Full Planner &rarr;
              </button>
            </div>

            <div className="mt-4">
              {!summary?.todays_sessions || summary.todays_sessions.length === 0 ? (
                <EmptyState
                  title="No sessions planned for today"
                  description="Keep momentum by scheduling a study block for your subjects."
                  actionLabel="Schedule Session"
                  onAction={onOpenNewSession}
                />
              ) : (
                <div className="divide-y divide-slate-800">
                  {summary.todays_sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: sess.subject_color || '#3b82f6' }}
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">{sess.title}</div>
                          <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-slate-400">
                            <span className="font-medium text-slate-300">{sess.subject_name}</span>
                            {sess.topic_title && <span>&bull; {sess.topic_title}</span>}
                            {sess.start_time && (
                              <span className="flex items-center space-x-1 text-slate-400">
                                <ClockIcon className="w-3 h-3" />
                                <span>{sess.start_time}</span>
                              </span>
                            )}
                            <span>&bull; {sess.planned_duration_minutes} min planned</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <Badge type="session_status" value={sess.status} />
                        {sess.status === 'pending' && (
                          <button
                            onClick={() => handleMarkComplete(sess.id, sess.planned_duration_minutes)}
                            disabled={updatingSessionId === sess.id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition disabled:opacity-50"
                          >
                            <CheckIcon className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Exams (1 col on lg) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <AwardIcon className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Upcoming Exams</h3>
              </div>
              <button
                onClick={() => onNavigate('exams')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                All Exams &rarr;
              </button>
            </div>

            <div className="mt-4">
              {!summary?.upcoming_exams || summary.upcoming_exams.length === 0 ? (
                <EmptyState
                  title="No upcoming exams"
                  description="Track your exam dates to plan syllabus coverage in advance."
                  actionLabel="Add Exam"
                  onAction={onOpenNewExam}
                />
              ) : (
                <div className="space-y-3">
                  {summary.upcoming_exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{exam.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{exam.subject_name}</div>
                        <div className="text-[11px] text-slate-500 mt-1">{exam.exam_date}</div>
                      </div>
                      <div className="text-right">
                        {exam.is_today ? (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Today
                          </span>
                        ) : (
                          <div className="px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-950/70 text-sky-300 border border-sky-800">
                            {exam.days_remaining} {exam.days_remaining === 1 ? 'day' : 'days'} left
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Syllabus Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <BookOpenIcon className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Subject-Wise Syllabus Coverage</h3>
          </div>
          <button
            onClick={() => onNavigate('subjects')}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium"
          >
            Manage Subjects &rarr;
          </button>
        </div>

        <div className="mt-6">
          {!summary?.subject_progress || summary.subject_progress.length === 0 ? (
            <EmptyState
              title="No subjects registered"
              description="Add your first study subject to start organizing your syllabus topics."
              actionLabel="Add Subject"
              onAction={onOpenNewSubject}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.subject_progress.map((sp) => (
                <div
                  key={sp.subject_id}
                  className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sp.color || '#3b82f6' }}
                      />
                      <span className="text-sm font-semibold text-white">{sp.subject_name}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {sp.completed_topics} / {sp.total_topics} topics
                    </span>
                  </div>
                  <ProgressBar
                    progress={sp.progress_percentage}
                    color={sp.color || undefined}
                    showLabel={true}
                    size="md"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
