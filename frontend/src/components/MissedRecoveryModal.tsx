import React, { useState } from 'react';
import { RecoverMissedResponse } from '../types';
import { recoverMissedSessions, confirmStudyPlan } from '../services/api';
import { Modal } from './Modal';
import {
  ClockIcon,
  CheckIcon,
  AlertCircleIcon,
  RefreshIcon,
  HistoryIcon,
} from './Icons';

interface MissedRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecoveryApplied: () => void;
}

export const MissedRecoveryModal: React.FC<MissedRecoveryModalProps> = ({
  isOpen,
  onClose,
  onRecoveryApplied,
}) => {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryData, setRecoveryData] = useState<RecoverMissedResponse | null>(null);

  const handleScanAndRecover = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recoverMissedSessions({ lookback_days: 14 });
      setRecoveryData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan for missed sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRecovery = async () => {
    if (!recoveryData || recoveryData.recovered_sessions.length === 0) return;
    setApplying(true);
    try {
      await confirmStudyPlan({
        sessions: recoveryData.recovered_sessions,
        mode: 'append',
        action_summary: `Recovered ${recoveryData.recovered_sessions.length} missed sessions into upcoming available slots.`,
      });
      onRecoveryApplied();
      onClose();
      setRecoveryData(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to apply recovery schedule');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Missed Study Session Recovery"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!recoveryData ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 space-y-2">
              <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                <HistoryIcon className="w-4 h-4 text-sky-400" />
                <span>Intelligent Recovery Workflow</span>
              </div>
              <p className="leading-relaxed">
                Life happens. Instead of blindly pushing all missed tasks to tomorrow, the recovery engine
                evaluates remaining capacity and prioritizes your incomplete topics into the earliest feasible
                slots before your target exam dates.
              </p>
            </div>

            <div className="text-center py-4">
              <button
                type="button"
                onClick={handleScanAndRecover}
                disabled={loading}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Scanning & Computing...' : 'Scan for Missed Sessions'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400">Missed Sessions Found: </span>
                <span className="font-bold text-white text-sm">{recoveryData.missed_sessions_detected}</span>
              </div>
              <div>
                <span className="text-slate-400">Recovery Slots Found: </span>
                <span className="font-bold text-emerald-400 text-sm">
                  {recoveryData.recovered_sessions.length}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">{recoveryData.summary}</p>

            {/* Unrecoverable Tasks if any */}
            {recoveryData.unrecoverable_tasks.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 space-y-1">
                <div className="font-semibold text-rose-300 flex items-center space-x-1.5">
                  <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                  <span>Unrecoverable Workload Warning</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-rose-300/80 space-y-0.5">
                  {recoveryData.unrecoverable_tasks.map((u) => (
                    <li key={u.topic_id}>
                      <span className="font-medium text-rose-200">{u.subject_name} &mdash; {u.topic_title}</span>: {u.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recovered Slots List */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Proposed Recovery Schedule
              </span>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {recoveryData.recovered_sessions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No recovery slots could be found in the next 7 days. Consider expanding daily capacity.
                  </div>
                ) : (
                  recoveryData.recovered_sessions.map((sess, idx) => (
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

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800 flex-shrink-0">
                        Score: {sess.priority_score}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRecoveryData(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Scan Again
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
                  disabled={applying || recoveryData.recovered_sessions.length === 0}
                  onClick={handleApplyRecovery}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 shadow-sm"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>{applying ? 'Applying...' : 'Apply Recovery Plan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

