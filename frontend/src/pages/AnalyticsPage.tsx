import React, { useState, useEffect } from 'react';
import { AnalyticsOverview } from '../types';
import { getAnalyticsOverview } from '../services/api';
import { StatCard } from '../components/StatCard';
import { ProgressBar } from '../components/ProgressBar';
import { EmptyState } from '../components/EmptyState';
import {
  ChartIcon,
  CalendarIcon,
  ClockIcon,
  AwardIcon,
  RefreshIcon,
  AlertCircleIcon,
} from '../components/Icons';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalyticsOverview();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading && !analytics) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="inline-block animate-spin text-sky-400">
          <RefreshIcon className="w-8 h-8" />
        </div>
        <p className="text-sm text-slate-400">Computing analytics from database...</p>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-2 font-semibold">
          <AlertCircleIcon className="w-5 h-5" />
          <span>Error loading analytics</span>
        </div>
        <p className="mt-2 text-sm text-rose-300/90">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const sessions = analytics?.sessions_breakdown;
  const time = analytics?.time_metrics;
  const subjects = analytics?.subject_completion_rates || [];
  const priority = analytics?.priority_distribution || { high: 0, medium: 0, low: 0 };
  const totalTopics = priority.high + priority.medium + priority.low;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Study Analytics</h2>
          <p className="mt-1 text-xs text-slate-400">
            Real data-driven insights on your syllabus progress, study sessions, and time commitment.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition self-start sm:self-center"
          title="Refresh metrics"
        >
          <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Syllabus"
          value={`${analytics?.overall_completion_rate || 0}%`}
          subtitle="Completion across all topics"
          icon={<ChartIcon className="w-4 h-4 text-sky-400" />}
          accentColor="#0ea5e9"
        />
        <StatCard
          title="Planned Time"
          value={`${time?.total_planned_hours || 0} hrs`}
          subtitle={`${time?.total_planned_minutes || 0} total minutes scheduled`}
          icon={<ClockIcon className="w-4 h-4 text-purple-400" />}
          accentColor="#a855f7"
        />
        <StatCard
          title="Actual Studied"
          value={`${time?.total_actual_hours || 0} hrs`}
          subtitle={`${time?.total_actual_minutes || 0} total minutes recorded`}
          icon={<ClockIcon className="w-4 h-4 text-emerald-400" />}
          accentColor="#10b981"
        />
        <StatCard
          title="Upcoming Exams"
          value={analytics?.upcoming_exams_count || 0}
          subtitle="Target examination deadlines"
          icon={<AwardIcon className="w-4 h-4 text-amber-400" />}
          accentColor="#f59e0b"
        />
      </div>

      {/* Study Session Distribution & Time Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sessions Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-semibold text-white">Study Sessions Breakdown</h3>
            <span className="text-xs text-slate-400">Total: {sessions?.total || 0}</span>
          </div>

          {!sessions || sessions.total === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="w-6 h-6" />}
              title="No session data yet"
              description="Schedule and complete sessions in the Study Planner to view session statistics."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60">
                  <div className="text-xs text-emerald-400 font-medium">Completed</div>
                  <div className="text-xl font-bold text-white mt-1">{sessions.completed}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {Math.round((sessions.completed / sessions.total) * 100)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-900/60">
                  <div className="text-xs text-sky-400 font-medium">Pending</div>
                  <div className="text-xl font-bold text-white mt-1">{sessions.pending}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {Math.round((sessions.pending / sessions.total) * 100)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60">
                  <div className="text-xs text-rose-400 font-medium">Missed</div>
                  <div className="text-xl font-bold text-white mt-1">{sessions.missed}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {Math.round((sessions.missed / sessions.total) * 100)}%
                  </div>
                </div>
              </div>

              {/* Stacked bar visualization */}
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  style={{ width: `${(sessions.completed / sessions.total) * 100}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Completed: ${sessions.completed}`}
                />
                <div
                  style={{ width: `${(sessions.pending / sessions.total) * 100}%` }}
                  className="bg-sky-500 h-full transition-all"
                  title={`Pending: ${sessions.pending}`}
                />
                <div
                  style={{ width: `${(sessions.missed / sessions.total) * 100}%` }}
                  className="bg-rose-500 h-full transition-all"
                  title={`Missed: ${sessions.missed}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Topic Priority Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-semibold text-white">Syllabus Topic Priorities</h3>
            <span className="text-xs text-slate-400">Total: {totalTopics} topics</span>
          </div>

          {totalTopics === 0 ? (
            <EmptyState
              icon={<ChartIcon className="w-6 h-6" />}
              title="No topics created yet"
              description="Add topics under subjects to see priority breakdown."
            />
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-rose-400 font-semibold">High Priority</span>
                  <span className="text-slate-300">
                    {priority.high} ({Math.round((priority.high / totalTopics) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-rose-500 h-2 rounded-full"
                    style={{ width: `${(priority.high / totalTopics) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-sky-400 font-semibold">Medium Priority</span>
                  <span className="text-slate-300">
                    {priority.medium} ({Math.round((priority.medium / totalTopics) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-sky-500 h-2 rounded-full"
                    style={{ width: `${(priority.medium / totalTopics) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Low Priority</span>
                  <span className="text-slate-300">
                    {priority.low} ({Math.round((priority.low / totalTopics) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-slate-500 h-2 rounded-full"
                    style={{ width: `${(priority.low / totalTopics) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subject-Wise Completion Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-base font-semibold text-white">Subject-Wise Completion Rates</h3>
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            title="No subjects to analyze"
            description="Create subjects and add syllabus topics to track subject progress."
          />
        ) : (
          <div className="space-y-4">
            {subjects.map((sub) => (
              <div key={sub.subject_id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sub.color || '#3b82f6' }}
                    />
                    <span className="text-sm font-semibold text-white">{sub.subject_name}</span>
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    {sub.completed_topics} / {sub.total_topics} topics completed ({sub.progress_percentage}%)
                  </span>
                </div>
                <ProgressBar
                  progress={sub.progress_percentage}
                  color={sub.color || undefined}
                  showLabel={false}
                  size="md"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

