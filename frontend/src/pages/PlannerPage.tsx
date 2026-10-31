import React, { useState, useEffect, useCallback } from 'react';
import {
  Subject,
  Topic,
  StudySession,
  StudySessionCreateInput,
  StudySessionUpdateInput,
  SessionStatus,
  StudyPreference,
} from '../types';
import {
  getSubjects,
  getSubjectTopics,
  getStudySessions,
  createStudySession,
  updateStudySession,
  deleteStudySession,
  getStudyPreferences,
} from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { PlanGeneratorModal } from '../components/PlanGeneratorModal';
import { MissedRecoveryModal } from '../components/MissedRecoveryModal';
import {
  CalendarIcon,
  PlusIcon,
  ClockIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
  RefreshIcon,
  AlertCircleIcon,
  SparklesIcon,
  ShieldAlertIcon,
} from '../components/Icons';

interface PlannerPageProps {
  openCreateModal?: boolean;
  onResetOpenCreateModal?: () => void;
}

function getStartOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const cur = new Date(y, m - 1, d);
  const day = cur.getDay(); // 0 = Sun, 1 = Mon ...
  const diff = cur.getDate() - day + (day === 0 ? -6 : 1); // target Monday
  const monday = new Date(cur.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function addDaysToIso(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const cur = new Date(y, m - 1, d);
  cur.setDate(cur.getDate() + days);
  return cur.toISOString().split('T')[0];
}

function formatDayHeader(dateStr: string): { weekday: string; monthDay: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const cur = new Date(y, m - 1, d);
  return {
    weekday: cur.toLocaleDateString(undefined, { weekday: 'short' }),
    monthDay: cur.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
}

export const PlannerPage: React.FC<PlannerPageProps> = ({
  openCreateModal = false,
  onResetOpenCreateModal,
}) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [weeklySessions, setWeeklySessions] = useState<StudySession[]>([]);
  const [missedCount, setMissedCount] = useState<number>(0);
  const [preferences, setPreferences] = useState<StudyPreference | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isPlanGenOpen, setIsPlanGenOpen] = useState(false);
  const [isMissedRecoveryOpen, setIsMissedRecoveryOpen] = useState(false);

  // Topics for selected subject in form
  const [formTopics, setFormTopics] = useState<Topic[]>([]);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<StudySessionCreateInput>({
    subject_id: 0,
    topic_id: null,
    title: '',
    scheduled_date: todayIso,
    start_time: '09:00',
    planned_duration_minutes: 60,
    status: 'pending',
    notes: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [editForm, setEditForm] = useState<StudySessionUpdateInput>({});
  const [editTopics, setEditTopics] = useState<Topic[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Complete Session Modal
  const [completingSession, setCompletingSession] = useState<StudySession | null>(null);
  const [actualMinutes, setActualMinutes] = useState<number>(60);
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);

  // Delete Dialog
  const [deletingSession, setDeletingSession] = useState<StudySession | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Calculate week range from selectedDate
  const currentWeekStart = getStartOfWeek(selectedDate);
  const currentWeekEnd = addDaysToIso(currentWeekStart, 6);

  // 7 days array for weekly view
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysToIso(currentWeekStart, i));

  // Initial subjects and preferences load
  useEffect(() => {
    const initData = async () => {
      try {
        const [subs, prefs] = await Promise.all([
          getSubjects(),
          getStudyPreferences().catch(() => null),
        ]);
        setSubjects(subs);
        if (subs.length > 0) {
          setCreateForm((prev) => ({ ...prev, subject_id: subs[0].id }));
        }
        if (prefs) {
          setPreferences(prefs);
        }
      } catch (err) {
        console.error(err);
      }
    };
    initData();
  }, []);

  // Fetch missed count
  const loadMissedCount = useCallback(async () => {
    try {
      const missed = await getStudySessions({ status: 'missed' });
      setMissedCount(missed.length);
    } catch {
      // ignore
    }
  }, []);

  // Fetch sessions for current view
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (viewMode === 'daily') {
        const data = await getStudySessions({ scheduled_date: selectedDate });
        setSessions(data);
      } else {
        const data = await getStudySessions({
          start_date: currentWeekStart,
          end_date: currentWeekEnd,
        });
        setWeeklySessions(data);
      }
      await loadMissedCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study sessions');
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedDate, currentWeekStart, currentWeekEnd, loadMissedCount]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (openCreateModal) {
      setCreateForm((prev) => ({ ...prev, scheduled_date: selectedDate }));
      setIsCreateOpen(true);
      if (onResetOpenCreateModal) onResetOpenCreateModal();
    }
  }, [openCreateModal, onResetOpenCreateModal, selectedDate]);

  // Load topics whenever createForm.subject_id changes
  useEffect(() => {
    if (!createForm.subject_id) {
      setFormTopics([]);
      return;
    }
    const loadTopics = async () => {
      try {
        const data = await getSubjectTopics(createForm.subject_id);
        setFormTopics(data);
      } catch {
        setFormTopics([]);
      }
    };
    loadTopics();
  }, [createForm.subject_id]);

  // Load topics for editingSession
  useEffect(() => {
    if (!editForm.subject_id) {
      setEditTopics([]);
      return;
    }
    const loadTopics = async () => {
      try {
        const data = await getSubjectTopics(editForm.subject_id!);
        setEditTopics(data);
      } catch {
        setEditTopics([]);
      }
    };
    loadTopics();
  }, [editForm.subject_id]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      setCreateError('Session title is required');
      return;
    }
    if (!createForm.subject_id) {
      setCreateError('Please select a subject');
      return;
    }
    if ((createForm.planned_duration_minutes || 0) <= 0) {
      setCreateError('Planned duration must be positive');
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createStudySession({
        subject_id: createForm.subject_id,
        topic_id: createForm.topic_id || undefined,
        title: createForm.title.trim(),
        scheduled_date: createForm.scheduled_date,
        start_time: createForm.start_time || undefined,
        planned_duration_minutes: Number(createForm.planned_duration_minutes),
        status: createForm.status || 'pending',
        notes: createForm.notes?.trim() || undefined,
      });
      setIsCreateOpen(false);
      setCreateForm({
        subject_id: subjects[0]?.id || 0,
        topic_id: null,
        title: '',
        scheduled_date: selectedDate,
        start_time: '09:00',
        planned_duration_minutes: 60,
        status: 'pending',
        notes: '',
      });
      await loadSessions();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to schedule session');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEdit = (sess: StudySession) => {
    setEditingSession(sess);
    setEditForm({
      subject_id: sess.subject_id,
      topic_id: sess.topic_id,
      title: sess.title,
      scheduled_date: sess.scheduled_date,
      start_time: sess.start_time || '',
      planned_duration_minutes: sess.planned_duration_minutes,
      actual_duration_minutes: sess.actual_duration_minutes,
      status: sess.status,
      notes: sess.notes || '',
    });
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    if (!editForm.title?.trim()) {
      setEditError('Session title is required');
      return;
    }
    if ((editForm.planned_duration_minutes || 0) <= 0) {
      setEditError('Planned duration must be positive');
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateStudySession(editingSession.id, {
        subject_id: editForm.subject_id,
        topic_id: editForm.topic_id,
        title: editForm.title.trim(),
        scheduled_date: editForm.scheduled_date,
        start_time: editForm.start_time || undefined,
        planned_duration_minutes: Number(editForm.planned_duration_minutes),
        actual_duration_minutes:
          editForm.actual_duration_minutes !== undefined && editForm.actual_duration_minutes !== null
            ? Number(editForm.actual_duration_minutes)
            : undefined,
        status: editForm.status,
        notes: editForm.notes?.trim() || undefined,
      });
      setEditingSession(null);
      await loadSessions();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update session');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenCompleteModal = (sess: StudySession) => {
    setCompletingSession(sess);
    setActualMinutes(sess.actual_duration_minutes || sess.planned_duration_minutes);
    setCompletionNotes(sess.notes || '');
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingSession) return;
    if (actualMinutes < 0) {
      alert('Actual study minutes cannot be negative');
      return;
    }

    setCompleteSubmitting(true);
    try {
      await updateStudySession(completingSession.id, {
        status: 'completed',
        actual_duration_minutes: actualMinutes,
        notes: completionNotes.trim() || undefined,
      });
      setCompletingSession(null);
      await loadSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete session');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (sess: StudySession, newStatus: SessionStatus) => {
    try {
      await updateStudySession(sess.id, {
        status: newStatus,
        actual_duration_minutes: newStatus === 'completed' ? sess.planned_duration_minutes : null,
      });
      await loadSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSession) return;
    setDeleteSubmitting(true);
    try {
      await deleteStudySession(deletingSession.id);
      setDeletingSession(null);
      await loadSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Day / Week shifts
  const changeDateBy = (days: number) => {
    setSelectedDate(addDaysToIso(selectedDate, days));
  };

  const changeWeekBy = (weeks: number) => {
    setSelectedDate(addDaysToIso(selectedDate, weeks * 7));
  };

  // Stats calculation
  const activeSessions = viewMode === 'daily' ? sessions : weeklySessions;
  const totalPlanned = activeSessions.reduce((sum, s) => sum + s.planned_duration_minutes, 0);
  const totalActual = activeSessions.reduce(
    (sum, s) => sum + (s.status === 'completed' && s.actual_duration_minutes ? s.actual_duration_minutes : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Core Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Study Planner</h2>
            {preferences?.exam_survival_mode && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <ShieldAlertIcon className="w-3.5 h-3.5" />
                <span>Survival Mode</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Intelligent constraint-aware scheduling, missed session recovery, and daily study blocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Missed Recovery Trigger */}
          <button
            onClick={() => setIsMissedRecoveryOpen(true)}
            className="relative inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Scan and recover missed study sessions"
          >
            <RefreshIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Recover Missed</span>
            {missedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {missedCount}
              </span>
            )}
          </button>

          {/* Intelligent Plan Generator Trigger */}
          <button
            onClick={() => setIsPlanGenOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sm transition"
          >
            <SparklesIcon className="w-3.5 h-3.5 text-sky-200" />
            <span>Intelligent Plan</span>
          </button>

          {/* Manual Add Session */}
          <button
            onClick={() => {
              setCreateForm((prev) => ({ ...prev, scheduled_date: selectedDate }));
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            disabled={subjects.length === 0}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm disabled:opacity-50"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Session</span>
          </button>

          <button
            onClick={loadSessions}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Refresh"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View Switcher, Date Navigation & Stats Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: View Mode Tabs & Date Nav */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Daily / Weekly View Switcher */}
          <div className="inline-flex rounded-xl bg-slate-800/80 p-0.5 border border-slate-700/60">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'daily'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daily View
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'weekly'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly View
            </button>
          </div>

          {/* Date Controls */}
          {viewMode === 'daily' ? (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => changeDateBy(-1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                title="Previous Day"
              >
                &larr; Prev
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
              />
              <button
                onClick={() => changeDateBy(1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                title="Next Day"
              >
                Next &rarr;
              </button>
              {selectedDate !== todayIso && (
                <button
                  onClick={() => setSelectedDate(todayIso)}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-950 text-sky-400 border border-sky-800 text-xs font-medium hover:bg-sky-900 transition"
                >
                  Today
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => changeWeekBy(-1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                title="Previous Week"
              >
                &larr; Prev Week
              </button>
              <span className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded-lg border border-slate-700">
                {formatDayHeader(currentWeekStart).monthDay} – {formatDayHeader(currentWeekEnd).monthDay}
              </span>
              <button
                onClick={() => changeWeekBy(1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                title="Next Week"
              >
                Next Week &rarr;
              </button>
              {selectedDate !== todayIso && (
                <button
                  onClick={() => setSelectedDate(todayIso)}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-950 text-sky-400 border border-sky-800 text-xs font-medium hover:bg-sky-900 transition"
                >
                  This Week
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Summary Metrics */}
        <div className="flex items-center space-x-4 text-xs">
          <div>
            <span className="text-slate-400">Planned: </span>
            <span className="font-semibold text-slate-200">{totalPlanned} min</span>
          </div>
          <div>
            <span className="text-slate-400">Recorded: </span>
            <span className="font-semibold text-emerald-400">{totalActual} min</span>
          </div>
          <div>
            <span className="text-slate-400">Sessions: </span>
            <span className="font-semibold text-white">{activeSessions.length}</span>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircleIcon className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={loadSessions} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && activeSessions.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <div className="inline-block animate-spin text-sky-400">
            <RefreshIcon className="w-6 h-6" />
          </div>
          <p className="text-xs">Loading study schedule...</p>
        </div>
      ) : viewMode === 'daily' ? (
        /* DAILY VIEW */
        sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="w-8 h-8" />}
            title={`No study sessions for ${selectedDate}`}
            description="Use the Intelligent Plan Generator to automatically schedule your topics or add a session manually."
            actionLabel="Generate Intelligent Plan"
            onAction={() => setIsPlanGenOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: sess.subject_color || '#3b82f6' }}
                  />
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="text-base font-bold text-white tracking-tight">{sess.title}</h3>
                      <Badge type="session_status" value={sess.status} />
                    </div>
                    <div className="flex items-center flex-wrap gap-2 text-xs text-slate-400 mt-1">
                      <span className="font-semibold text-slate-300">{sess.subject_name}</span>
                      {sess.topic_title && <span>&bull; {sess.topic_title}</span>}
                      {sess.start_time && (
                        <span className="flex items-center space-x-1 text-slate-400">
                          <ClockIcon className="w-3.5 h-3.5" />
                          <span>{sess.start_time}</span>
                        </span>
                      )}
                      <span>&bull; Planned: {sess.planned_duration_minutes} min</span>
                      {sess.status === 'completed' && sess.actual_duration_minutes !== null && (
                        <span className="text-emerald-400 font-medium">
                          &bull; Completed in: {sess.actual_duration_minutes} min
                        </span>
                      )}
                    </div>
                    {sess.notes && (
                      <p className="mt-2 text-xs text-slate-400 italic bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                        "{sess.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center">
                  {sess.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleOpenCompleteModal(sess)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                      <button
                        onClick={() => handleQuickStatusChange(sess, 'missed')}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 transition"
                        title="Mark as Missed"
                      >
                        Missed
                      </button>
                    </>
                  )}
                  {sess.status === 'missed' && (
                    <button
                      onClick={() => handleQuickStatusChange(sess, 'pending')}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Revert to Pending
                    </button>
                  )}
                  {sess.status === 'completed' && (
                    <button
                      onClick={() => handleQuickStatusChange(sess, 'pending')}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Re-open
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(sess)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Edit Session"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingSession(sess)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Delete Session"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* WEEKLY VIEW (7-day grid) */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((dayDate) => {
            const dayHeader = formatDayHeader(dayDate);
            const isToday = dayDate === todayIso;
            const daySessions = weeklySessions.filter((s) => s.scheduled_date === dayDate);
            const dayPlanned = daySessions.reduce((sum, s) => sum + s.planned_duration_minutes, 0);

            return (
              <div
                key={dayDate}
                className={`bg-slate-900 border rounded-2xl p-3 flex flex-col min-h-[380px] shadow-sm transition ${
                  isToday
                    ? 'border-sky-500/60 ring-1 ring-sky-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Column Day Header */}
                <div className="pb-2 mb-3 border-b border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white uppercase">{dayHeader.weekday}</span>
                      {isToday && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{dayHeader.monthDay}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-300 block">{dayPlanned}m</span>
                    <button
                      onClick={() => {
                        setCreateForm((prev) => ({ ...prev, scheduled_date: dayDate }));
                        setCreateError(null);
                        setIsCreateOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-sky-400 rounded transition"
                      title={`Add session for ${dayDate}`}
                    >
                      <PlusIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Day Sessions List */}
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {daySessions.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-4 text-center">
                      <span className="text-[11px] text-slate-600">No sessions</span>
                    </div>
                  ) : (
                    daySessions.map((sess) => (
                      <div
                        key={sess.id}
                        onClick={() => handleOpenEdit(sess)}
                        className="group p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition text-left"
                      >
                        <div className="flex items-center space-x-1.5 mb-1">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: sess.subject_color || '#3b82f6' }}
                          />
                          <span className="text-xs font-semibold text-white truncate flex-1">
                            {sess.title}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{sess.start_time || 'Flexible'}</span>
                          <span>{sess.planned_duration_minutes}m</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <Badge type="session_status" value={sess.status} />
                          {sess.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCompleteModal(sess);
                              }}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
                            >
                              ✓ Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Daily View Jump */}
                <div className="pt-2 mt-2 border-t border-slate-800/60 text-center">
                  <button
                    onClick={() => {
                      setSelectedDate(dayDate);
                      setViewMode('daily');
                    }}
                    className="text-[10px] text-slate-400 hover:text-sky-400 font-medium transition"
                  >
                    View Day &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Intelligent Plan Generator Modal */}
      <PlanGeneratorModal
        isOpen={isPlanGenOpen}
        onClose={() => setIsPlanGenOpen(false)}
        subjects={subjects}
        initialSurvivalMode={preferences?.exam_survival_mode}
        onPlanApplied={loadSessions}
      />

      {/* Missed Session Recovery Modal */}
      <MissedRecoveryModal
        isOpen={isMissedRecoveryOpen}
        onClose={() => setIsMissedRecoveryOpen(false)}
        onRecoveryApplied={loadSessions}
      />

      {/* Schedule Session Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule Study Session"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Subject *
            </label>
            <select
              value={createForm.subject_id}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  subject_id: Number(e.target.value),
                  topic_id: null,
                })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Associated Topic (Optional)
            </label>
            <select
              value={createForm.topic_id || ''}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  topic_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">-- No specific topic --</option>
              {formTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Session Goal / Title *
            </label>
            <input
              type="text"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="e.g. Solve Chapter 4 practice exercises"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={createForm.scheduled_date}
                onChange={(e) => setCreateForm({ ...createForm, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={createForm.start_time || ''}
                onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Planned Duration (min) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={createForm.planned_duration_minutes}
                onChange={(e) =>
                  setCreateForm({ ...createForm, planned_duration_minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={createForm.notes || ''}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="Materials needed, chapter numbers, questions to review"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50"
            >
              {createSubmitting ? 'Scheduling...' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Session Modal */}
      <Modal
        isOpen={completingSession !== null}
        onClose={() => setCompletingSession(null)}
        title="Complete Study Session"
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Record the actual time spent on <span className="text-white font-medium">"{completingSession?.title}"</span>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Actual Study Time (Minutes) *
            </label>
            <input
              type="number"
              min={0}
              required
              value={actualMinutes}
              onChange={(e) => setActualMinutes(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Planned duration was {completingSession?.planned_duration_minutes} minutes.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Reflections / Notes
            </label>
            <textarea
              rows={2}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="What went well? Any difficulties or pending questions?"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCompletingSession(null)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={completeSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
            >
              {completeSubmitting ? 'Recording...' : 'Save & Mark Complete'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Session Modal */}
      <Modal
        isOpen={editingSession !== null}
        onClose={() => setEditingSession(null)}
        title="Edit Study Session"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Subject *
            </label>
            <select
              value={editForm.subject_id || ''}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  subject_id: Number(e.target.value),
                  topic_id: null,
                })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Associated Topic (Optional)
            </label>
            <select
              value={editForm.topic_id || ''}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  topic_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">-- No specific topic --</option>
              {editTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Session Goal / Title *
            </label>
            <input
              type="text"
              required
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={editForm.scheduled_date || ''}
                onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={editForm.start_time || ''}
                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={editForm.status || 'pending'}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as SessionStatus })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Planned Duration (min) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={editForm.planned_duration_minutes || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, planned_duration_minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Actual Duration (min)
              </label>
              <input
                type="number"
                min={0}
                value={editForm.actual_duration_minutes ?? ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    actual_duration_minutes: e.target.value === '' ? null : parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Recorded upon completion"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={editForm.notes || ''}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditingSession(null)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50"
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Session Confirmation */}
      <ConfirmDialog
        isOpen={deletingSession !== null}
        onClose={() => setDeletingSession(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Study Session"
        message={`Are you sure you want to delete session "${deletingSession?.title}"?`}
        confirmLabel="Delete Session"
        loading={deleteSubmitting}
      />
    </div>
  );
};
