import React, { useState, useEffect } from 'react';
import { Subject, GeneratedPlanResponse, PlanGenerateRequestInput } from '../types';
import { generateStudyPlan, confirmStudyPlan } from '../services/api';
import { Modal } from './Modal';
import {
  SparklesIcon,
  ShieldAlertIcon,
  ClockIcon,
  CheckIcon,
  AlertCircleIcon,
} from './Icons';

interface PlanGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialSurvivalMode?: boolean;
  onPlanApplied: () => void;
}

export const PlanGeneratorModal: React.FC<PlanGeneratorModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialSurvivalMode = false,
  onPlanApplied,
}) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const in6DaysIso = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];

  const [form, setForm] = useState<PlanGenerateRequestInput>({
    start_date: todayIso,
    end_date: in6DaysIso,
    exam_survival_mode: initialSurvivalMode,
    daily_target_hours: 3.0,
  });

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<GeneratedPlanResponse | null>(null);
  const [confirmMode, setConfirmMode] = useState<'replace_pending' | 'append'>('replace_pending');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (subjects.length > 0 && selectedSubjectIds.length === 0) {
      setSelectedSubjectIds(subjects.map((s) => s.id));
    }
  }, [subjects]);

  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const plan = await generateStudyPlan({
        ...form,
        subject_ids: selectedSubjectIds.length === subjects.length ? undefined : selectedSubjectIds,
      });
      setPreview(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate study plan');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPlan = async () => {
    if (!preview || preview.proposed_sessions.length === 0) return;
    setApplying(true);
    try {
      await confirmStudyPlan({
        sessions: preview.proposed_sessions,
        mode: confirmMode,
        exam_survival_mode: preview.exam_survival_mode,
        action_summary: `Intelligent Plan: ${preview.total_proposed_sessions} sessions (${preview.start_date} to ${preview.end_date})`,
      });
      onPlanApplied();
      onClose();
      setPreview(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to apply schedule');
    } finally {
      setApplying(false);
    }
  };

  const toggleSubject = (id: number) => {
    if (selectedSubjectIds.includes(id)) {
      setSelectedSubjectIds(selectedSubjectIds.filter((sId) => sId !== id));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, id]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={preview ? 'Review Proposed Study Plan' : 'Intelligent Study Plan Generator'}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!preview ? (
          /* Step 1: Configuration Form */
          <form onSubmit={handleGeneratePreview} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/60 text-xs text-slate-300 flex items-start space-x-2.5">
              <SparklesIcon className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                The constraint-aware engine calculates deterministic priority scores based on upcoming exam
                urgency, topic difficulty, and existing progress to build a balanced, non-overlapping schedule.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Plan Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.start_date || todayIso}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Plan End Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.end_date || in6DaysIso}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Daily Study Target (Hours)
              </label>
              <input
                type="number"
                min={0.5}
                max={16}
                step={0.5}
                value={form.daily_target_hours || 3.0}
                onChange={(e) => setForm({ ...form, daily_target_hours: parseFloat(e.target.value) || 3.0 })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Workload cap per day. The engine will never schedule beyond this limit.
              </span>
            </div>

            {/* Exam Survival Mode Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/70 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <ShieldAlertIcon className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Exam Survival Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Doubles urgency scores for subjects with imminent exams and suppresses non-exam topics.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.exam_survival_mode || false}
                onChange={(e) => setForm({ ...form, exam_survival_mode: e.target.checked })}
                className="w-4 h-4 text-sky-600 rounded bg-slate-900 border-slate-700 mt-1 cursor-pointer"
              />
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Subjects to Include
              </label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((sub) => {
                  const selected = selectedSubjectIds.includes(sub.id);
                  return (
                    <button
                      type="button"
                      key={sub.id}
                      onClick={() => toggleSubject(sub.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer flex items-center space-x-1.5 ${
                        selected
                          ? 'bg-sky-950/80 text-sky-300 border-sky-700'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: sub.color || '#3b82f6' }}
                      />
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || selectedSubjectIds.length === 0}
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-50 shadow-sm"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{loading ? 'Calculating Plan...' : 'Generate Plan Preview'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Interactive Plan Preview */
          <div className="space-y-5">
            {/* KPI Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="text-slate-400">Proposed Sessions</div>
                <div className="text-lg font-bold text-white mt-0.5">{preview.total_proposed_sessions}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="text-slate-400">Total Study Time</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {Math.round(preview.total_planned_minutes / 60)} hrs ({preview.total_planned_minutes} min)
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="text-slate-400">Survival Mode</div>
                <div className="text-xs font-bold text-amber-300 mt-1.5">
                  {preview.exam_survival_mode ? 'Active' : 'Standard'}
                </div>
              </div>
            </div>

            {/* Unscheduled Warnings if any */}
            {preview.unscheduled_tasks.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-1.5">
                <div className="font-semibold flex items-center space-x-1.5 text-amber-300">
                  <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                  <span>Notice: {preview.unscheduled_tasks.length} topic(s) could not fit in this window</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-300/80 space-y-0.5">
                  {preview.unscheduled_tasks.map((u) => (
                    <li key={u.topic_id}>
                      <span className="font-medium text-amber-200">{u.subject_name} &mdash; {u.topic_title}</span>: {u.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Daily Workload Distribution */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Daily Workload Distribution
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {preview.daily_workloads.map((w) => (
                  <div
                    key={w.date}
                    className={`p-2.5 rounded-xl border ${
                      !w.is_available
                        ? 'bg-slate-900 border-slate-800 text-slate-500'
                        : 'bg-slate-800/40 border-slate-700/60'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-slate-300">{w.day_name.slice(0, 3)}</span>
                      <span className="text-slate-400">{w.date.slice(5)}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">
                      {w.total_planned_minutes} / {w.capacity_minutes} min
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Proposed Sessions List */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Chronological Schedule ({preview.proposed_sessions.length} sessions)
              </span>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {preview.proposed_sessions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No sessions could be allocated. Check topics or expand study availability.
                  </div>
                ) : (
                  preview.proposed_sessions.map((sess, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start space-x-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: sess.subject_color || '#3b82f6' }}
                        />
                        <div>
                          <div className="font-semibold text-white">{sess.title}</div>
                          <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="text-slate-300">{sess.subject_name}</span>
                            <span>&bull;</span>
                            <span>{sess.scheduled_date}</span>
                            <span>&bull;</span>
                            <span className="flex items-center space-x-1 text-slate-300">
                              <ClockIcon className="w-3 h-3" />
                              <span>{sess.start_time} - {sess.end_time}</span>
                            </span>
                            <span>({sess.planned_duration_minutes} min)</span>
                          </div>
                          <p className="mt-1 text-[11px] text-sky-400/90 leading-normal">
                            &rarr; {sess.reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                          Score: {sess.priority_score}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Replacement Confirmation Mode */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                How should this schedule be applied?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-start space-x-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer hover:bg-slate-800">
                  <input
                    type="radio"
                    name="confirmMode"
                    value="replace_pending"
                    checked={confirmMode === 'replace_pending'}
                    onChange={() => setConfirmMode('replace_pending')}
                    className="mt-0.5 text-sky-600"
                  />
                  <div>
                    <span className="font-semibold text-white block">Replace Pending Sessions</span>
                    <span className="text-[11px] text-slate-400">
                      Replaces existing pending sessions in this date range. Completed sessions remain untouched.
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer hover:bg-slate-800">
                  <input
                    type="radio"
                    name="confirmMode"
                    value="append"
                    checked={confirmMode === 'append'}
                    onChange={() => setConfirmMode('append')}
                    className="mt-0.5 text-sky-600"
                  />
                  <div>
                    <span className="font-semibold text-white block">Append Only</span>
                    <span className="text-[11px] text-slate-400">
                      Adds these proposed sessions alongside all existing sessions.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                &larr; Adjust Parameters
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={applying || preview.proposed_sessions.length === 0}
                  onClick={handleConfirmPlan}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 shadow-sm"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>{applying ? 'Applying Schedule...' : 'Confirm & Apply Plan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

