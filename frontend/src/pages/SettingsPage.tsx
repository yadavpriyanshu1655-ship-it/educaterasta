import React, { useState, useEffect } from 'react';
import { StudyPreference, UnavailableBlock, ScheduleHistory } from '../types';
import {
  getStudyPreferences,
  updateStudyPreferences,
  getUnavailableBlocks,
  createUnavailableBlock,
  deleteUnavailableBlock,
  getScheduleHistory,
} from '../services/api';
import {
  ShieldAlertIcon,
  ClockIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  RefreshIcon,
  AlertCircleIcon,
  HistoryIcon,
} from '../components/Icons';

const ALL_DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

export const SettingsPage: React.FC = () => {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Preferences State
  const [preferences, setPreferences] = useState<StudyPreference | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Form State for Preferences
  const [dailyTargetHours, setDailyTargetHours] = useState<number>(4.0);
  const [preferredStartTime, setPreferredStartTime] = useState<string>('09:00');
  const [preferredEndTime, setPreferredEndTime] = useState<string>('21:00');
  const [maxSessionDurationMinutes, setMaxSessionDurationMinutes] = useState<number>(60);
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(15);
  const [availableDays, setAvailableDays] = useState<string[]>([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]);
  const [examSurvivalMode, setExamSurvivalMode] = useState<boolean>(false);

  // Unavailable Blocks State
  const [blocks, setBlocks] = useState<UnavailableBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockDay, setNewBlockDay] = useState('monday');
  const [newBlockStartTime, setNewBlockStartTime] = useState('10:00');
  const [newBlockEndTime, setNewBlockEndTime] = useState('12:00');
  const [addingBlock, setAddingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  // Schedule History State
  const [history, setHistory] = useState<ScheduleHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load Preferences
  const loadPreferences = async () => {
    setPrefsLoading(true);
    setPrefsError(null);
    try {
      const data = await getStudyPreferences();
      setPreferences(data);
      setDailyTargetHours(data.daily_target_hours);
      setPreferredStartTime(data.preferred_start_time);
      setPreferredEndTime(data.preferred_end_time);
      setMaxSessionDurationMinutes(data.max_session_duration_minutes);
      setBreakDurationMinutes(data.break_duration_minutes);
      setAvailableDays(
        data.available_days
          ? data.available_days.split(',').map((d) => d.trim().toLowerCase())
          : ALL_DAYS.map((d) => d.key)
      );
      setExamSurvivalMode(data.exam_survival_mode);
    } catch (err) {
      setPrefsError(err instanceof Error ? err.message : 'Failed to load study preferences');
    } finally {
      setPrefsLoading(false);
    }
  };

  // Load Unavailable Blocks
  const loadBlocks = async () => {
    setBlocksLoading(true);
    try {
      const data = await getUnavailableBlocks();
      setBlocks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setBlocksLoading(false);
    }
  };

  // Load History
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getScheduleHistory(10);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
    loadBlocks();
    loadHistory();
  }, []);

  // Save Preferences Handler
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsSaving(true);
    setPrefsSuccess(null);
    setPrefsError(null);

    if (dailyTargetHours <= 0) {
      setPrefsError('Daily target hours must be greater than 0');
      setPrefsSaving(false);
      return;
    }
    if (preferredStartTime >= preferredEndTime) {
      setPrefsError('Preferred start time must precede preferred end time');
      setPrefsSaving(false);
      return;
    }
    if (availableDays.length === 0) {
      setPrefsError('Please select at least one available study day');
      setPrefsSaving(false);
      return;
    }

    try {
      const updated = await updateStudyPreferences({
        daily_target_hours: Number(dailyTargetHours),
        preferred_start_time: preferredStartTime,
        preferred_end_time: preferredEndTime,
        max_session_duration_minutes: Number(maxSessionDurationMinutes),
        break_duration_minutes: Number(breakDurationMinutes),
        available_days: availableDays.join(','),
        exam_survival_mode: examSurvivalMode,
      });
      setPreferences(updated);
      setPrefsSuccess('Study availability preferences successfully updated.');
      setTimeout(() => setPrefsSuccess(null), 4000);
    } catch (err) {
      setPrefsError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setPrefsSaving(false);
    }
  };

  // Toggle Day Chip
  const toggleDay = (dayKey: string) => {
    setAvailableDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  // Add Unavailable Block
  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockTitle.trim()) {
      setBlockError('Title is required');
      return;
    }
    if (newBlockStartTime >= newBlockEndTime) {
      setBlockError('Start time must precede end time');
      return;
    }

    setAddingBlock(true);
    setBlockError(null);
    try {
      await createUnavailableBlock({
        title: newBlockTitle.trim(),
        day_of_week: newBlockDay,
        start_time: newBlockStartTime,
        end_time: newBlockEndTime,
      });
      setNewBlockTitle('');
      await loadBlocks();
    } catch (err) {
      setBlockError(err instanceof Error ? err.message : 'Failed to add block');
    } finally {
      setAddingBlock(false);
    }
  };

  // Delete Unavailable Block
  const handleDeleteBlock = async (id: number) => {
    try {
      await deleteUnavailableBlock(id);
      await loadBlocks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete block');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="pb-6 border-b border-slate-800">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Settings & Engine Capacity</h2>
        <p className="mt-1 text-xs text-slate-400">
          Configure realistic study limits, unavailable hours, Exam Survival Mode, and inspect scheduling history.
        </p>
      </div>

      {/* SECTION 1: STUDY AVAILABILITY & CAPACITY */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <ClockIcon className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Study Availability & Capacity Limits</h3>
          </div>
          {prefsLoading ? (
            <span className="text-xs text-slate-500 animate-pulse">Loading preferences...</span>
          ) : preferences ? (
            <span className="text-[11px] text-slate-500">
              Last saved: {new Date(preferences.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
        </div>

        {prefsSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckIcon className="w-4 h-4 text-emerald-400" />
            <span>{prefsSuccess}</span>
          </div>
        )}

        {prefsError && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircleIcon className="w-4 h-4 text-rose-400" />
            <span>{prefsError}</span>
          </div>
        )}

        <form onSubmit={handleSavePreferences} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Daily Target Hours */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Daily Study Target (Hours) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="16"
                value={dailyTargetHours}
                onChange={(e) => setDailyTargetHours(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 font-semibold"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Engine will never schedule more than this per day.
              </span>
            </div>

            {/* Preferred Start Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Earliest Study Time *
              </label>
              <input
                type="time"
                value={preferredStartTime}
                onChange={(e) => setPreferredStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 09:00</span>
            </div>

            {/* Preferred End Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Latest Study Time *
              </label>
              <input
                type="time"
                value={preferredEndTime}
                onChange={(e) => setPreferredEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 21:00</span>
            </div>

            {/* Max Session Length */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Max Focus Block (Min)
              </label>
              <input
                type="number"
                step="15"
                min="15"
                max="240"
                value={maxSessionDurationMinutes}
                onChange={(e) => setMaxSessionDurationMinutes(parseInt(e.target.value) || 60)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 60 minutes</span>
            </div>

            {/* Break Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Rest Between Sessions (Min)
              </label>
              <input
                type="number"
                step="5"
                min="0"
                max="60"
                value={breakDurationMinutes}
                onChange={(e) => setBreakDurationMinutes(parseInt(e.target.value) || 15)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 15 minutes</span>
            </div>
          </div>

          {/* Available Study Days */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Available Days of the Week
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => {
                const isSelected = availableDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-slate-500 mt-1.5 block">
              The engine will skip scheduling on days that are deselected.
            </span>
          </div>

          {/* Exam Survival Mode Switch */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldAlertIcon className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-200">Exam Survival Mode</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                When active, the scheduling engine concentrates 100% on upcoming exam topics. It doubles
                urgency weighting, prioritizes incomplete high-priority syllabus items, and pushes non-exam
                backlog out of high-intensity study windows.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input
                type="checkbox"
                checked={examSurvivalMode}
                onChange={(e) => setExamSurvivalMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={prefsSaving}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-50 shadow-sm"
            >
              <CheckIcon className="w-4 h-4" />
              <span>{prefsSaving ? 'Saving Preferences...' : 'Save Availability Preferences'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: UNAVAILABLE TIME BLOCKS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white">Unavailable Time Blocks</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Define recurring commitments (classes, meals, gym) that the scheduler must strictly avoid.
            </p>
          </div>
          <button
            onClick={loadBlocks}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700"
            title="Refresh Blocks"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${blocksLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Add Block Form */}
        <form onSubmit={handleAddBlock} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
          <span className="text-xs font-bold text-slate-200 block">Add Recurring Block</span>
          {blockError && (
            <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {blockError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Title *</label>
              <input
                type="text"
                required
                value={newBlockTitle}
                onChange={(e) => setNewBlockTitle(e.target.value)}
                placeholder="e.g. Physics Lab, Gym"
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Day of Week</label>
              <select
                value={newBlockDay}
                onChange={(e) => setNewBlockDay(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {ALL_DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.key.charAt(0).toUpperCase() + d.key.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Start Time *</label>
              <input
                type="time"
                value={newBlockStartTime}
                onChange={(e) => setNewBlockStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">End Time *</label>
              <input
                type="time"
                value={newBlockEndTime}
                onChange={(e) => setNewBlockEndTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={addingBlock}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-50"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>{addingBlock ? 'Adding...' : 'Add Unavailable Block'}</span>
            </button>
          </div>
        </form>

        {/* Existing Blocks List */}
        <div className="space-y-2">
          {blocks.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-800/20 rounded-xl">
              No unavailable blocks configured. The engine is free to schedule sessions anytime within your preferred daily study window.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {blocks.map((blk) => (
                <div
                  key={blk.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">{blk.title}</h4>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {blk.day_of_week || 'Specific Date'} &bull; {blk.start_time} - {blk.end_time}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteBlock(blk.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Delete Block"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: SCHEDULING & RECOVERY HISTORY AUDIT LOG */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <HistoryIcon className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Scheduling & Recovery Audit History</h3>
          </div>
          <button
            onClick={loadHistory}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700"
            title="Refresh History"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-800/20 rounded-xl">
            No schedule changes recorded yet. Generated plans and recovery actions will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sky-300 uppercase tracking-wider text-[11px]">
                      {item.action.replace('_', ' ')}
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-slate-300">{item.summary}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex-shrink-0 text-slate-400 text-[11px]">
                  Sessions Created: <span className="text-emerald-400 font-semibold">{item.sessions_created}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: SYSTEM INFORMATION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-white pb-3 border-b border-slate-800">
          System & Runtime Specifications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <span className="text-slate-400 block mb-1">Client Timezone</span>
            <span className="font-semibold text-white text-sm">{userTimezone}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <span className="text-slate-400 block mb-1">Database Engine</span>
            <span className="font-semibold text-emerald-400 text-sm">SQLite (Persistent)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <span className="text-slate-400 block mb-1">Engine Algorithm</span>
            <span className="font-semibold text-sky-400 text-sm">Constraint-Satisfaction</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <span className="text-slate-400 block mb-1">API Backend Base URL</span>
            <span className="font-mono text-slate-300 text-xs">
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
