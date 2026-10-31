import React, { useState, useEffect } from 'react';
import {
  WeakTopic,
  MistakeAnalysis,
  PracticeRecommendation,
  Subject,
  Topic,
  TopicPerformance,
} from '../types';
import {
  getWeakTopics,
  getMistakes,
  getRecommendations,
  getTopicPerformances,
  getSubjects,
  getSubjectTopics,
  createTopicPrerequisite,
} from '../services/api';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshIcon,
  PlusIcon,
  SparklesIcon,
} from '../components/Icons';

interface WeakTopicsPageProps {
  onScheduleTopic?: (topicId: number, subjectId: number, topicTitle: string) => void;
}

export const WeakTopicsPage: React.FC<WeakTopicsPageProps> = ({ onScheduleTopic }) => {
  const [activeTab, setActiveTab] = useState<'weak_topics' | 'mistakes' | 'recommendations' | 'prerequisites'>('weak_topics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [allPerformances, setAllPerformances] = useState<TopicPerformance[]>([]);
  const [mistakes, setMistakes] = useState<MistakeAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<PracticeRecommendation[]>([]);

  // Mistake category filter
  const [mistakeFilter, setMistakeFilter] = useState<string>('all');

  // Prerequisites manager state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [prereqSubjectId, setPrereqSubjectId] = useState<number>(0);
  const [prereqTopics, setPrereqTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number>(0);
  const [selectedPrereqId, setSelectedPrereqId] = useState<number>(0);
  const [isAddPrereqOpen, setIsAddPrereqOpen] = useState(false);
  const [prereqError, setPrereqError] = useState<string | null>(null);
  const [prereqSuccess, setPrereqSuccess] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wts, perfs, mists, recs, subs] = await Promise.all([
        getWeakTopics(),
        getTopicPerformances(),
        getMistakes(50),
        getRecommendations(),
        getSubjects(),
      ]);
      setWeakTopics(wts);
      setAllPerformances(perfs);
      setMistakes(mists);
      setRecommendations(recs);
      setSubjects(subs);
      if (subs.length > 0) {
        setPrereqSubjectId(subs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diagnostic analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Load topics when prereqSubjectId changes
  useEffect(() => {
    if (prereqSubjectId > 0) {
      getSubjectTopics(prereqSubjectId)
        .then((tops) => {
          setPrereqTopics(tops);
          if (tops.length >= 2) {
            setSelectedTopicId(tops[1].id);
            setSelectedPrereqId(tops[0].id);
          } else if (tops.length === 1) {
            setSelectedTopicId(tops[0].id);
            setSelectedPrereqId(tops[0].id);
          }
        })
        .catch(() => setPrereqTopics([]));
    }
  }, [prereqSubjectId]);

  const handleAddPrerequisiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrereqError(null);
    setPrereqSuccess(null);

    if (selectedTopicId === selectedPrereqId) {
      setPrereqError('A topic cannot have a dependency on itself.');
      return;
    }

    try {
      await createTopicPrerequisite(selectedTopicId, {
        prerequisite_topic_id: selectedPrereqId,
        relationship_type: 'prerequisite',
      });
      setPrereqSuccess('Prerequisite dependency successfully established.');
      setTimeout(() => {
        setIsAddPrereqOpen(false);
        setPrereqSuccess(null);
      }, 1500);
      await loadAllData();
    } catch (err) {
      setPrereqError(err instanceof Error ? err.message : 'Failed to add prerequisite');
    }
  };

  // KPI Calculations
  const strongCount = allPerformances.filter((p) => p.classification === 'Strong').length;
  const moderateCount = allPerformances.filter((p) => p.classification === 'Moderate').length;
  const needsImpCount = allPerformances.filter((p) => p.classification === 'Needs Improvement').length;
  const weakCount = allPerformances.filter((p) => p.classification === 'Weak').length;

  const totalEvaluated = allPerformances.length;
  const avgAccuracy =
    totalEvaluated > 0
      ? Math.round(allPerformances.reduce((sum, p) => sum + p.accuracy_percentage, 0) / totalEvaluated)
      : 0;

  // Filter mistakes
  const filteredMistakes = mistakes.filter((m) => {
    if (mistakeFilter === 'repeated') return m.is_repeated;
    if (mistakeFilter !== 'all') return m.mistake_category === mistakeFilter;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Weak Topic Detection & Mistake Analyzer
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-300">
              Diagnostic Engine
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Automated diagnostic engine analyzing quiz error patterns, topic mastery thresholds, and prerequisite gaps.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddPrereqOpen(true)}
            disabled={subjects.length === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <PlusIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Add Prerequisite</span>
          </button>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Refresh"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-400 hover:text-rose-200 font-medium px-2 py-1 rounded bg-rose-500/20"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
            Weak Topics
          </span>
          <span className="text-2xl font-black text-rose-400">{weakCount}</span>
          <span className="text-[11px] text-slate-500 block mt-1">&lt;50% accuracy</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
            Needs Work
          </span>
          <span className="text-2xl font-black text-amber-400">{needsImpCount}</span>
          <span className="text-[11px] text-slate-500 block mt-1">50% - 65% accuracy</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
            Moderate
          </span>
          <span className="text-2xl font-black text-sky-400">{moderateCount}</span>
          <span className="text-[11px] text-slate-500 block mt-1">65% - 80% accuracy</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
            Strong / Mastered
          </span>
          <span className="text-2xl font-black text-emerald-400">{strongCount}</span>
          <span className="text-[11px] text-slate-500 block mt-1">&ge;80% accuracy</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
            Diagnostic Avg
          </span>
          <span className="text-2xl font-black text-white">{avgAccuracy}%</span>
          <span className="text-[11px] text-slate-500 block mt-1">{totalEvaluated} topics assessed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('weak_topics')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'weak_topics'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Weak & Flagged Topics ({weakTopics.length})
        </button>
        <button
          onClick={() => setActiveTab('mistakes')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'mistakes'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Mistake Analysis Log ({mistakes.length})
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'recommendations'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Practice Recommendations ({recommendations.length})
        </button>
      </div>

      {/* TAB 1: WEAK TOPICS */}
      {activeTab === 'weak_topics' && (
        <div className="space-y-4">
          {weakTopics.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon className="w-8 h-8 text-emerald-400" />}
              title="No weak topics detected"
              description="Either all tested topics exhibit strong mastery (&ge;65% accuracy), or more quiz attempts are required to reach the minimum diagnostic evidence threshold."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weakTopics.map((wt) => (
                <div
                  key={wt.topic_id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider"
                        style={{ backgroundColor: wt.subject_color || '#3b82f6' }}
                      >
                        {wt.subject_name}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <Badge type="classification" value={wt.classification} />
                        <span className="text-[10px] text-slate-500 border border-slate-800 rounded px-1.5 py-0.5">
                          {wt.confidence_level} Conf.
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">{wt.topic_title}</h3>

                    {/* Progress & Evidence */}
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Quiz Accuracy:</span>
                        <span className="font-bold text-rose-400">{wt.accuracy_percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Mastery Estimate:</span>
                        <span className="font-bold text-amber-400">{wt.mastery_estimate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Sample Evidence:</span>
                        <span className="text-slate-300 font-medium">{wt.attempts_count} question attempts</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/20 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-slate-400 font-semibold block mb-0.5">Diagnostic Reason:</span>
                      {wt.reason}
                    </p>

                    {/* Prerequisite Warnings */}
                    {wt.prerequisite_warnings && wt.prerequisite_warnings.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-1 text-xs text-amber-300">
                        <span className="font-bold flex items-center space-x-1 text-[11px]">
                          <AlertCircleIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span>Prerequisite Alert</span>
                        </span>
                        {wt.prerequisite_warnings.map((warn, i) => (
                          <p key={i} className="text-[11px] leading-normal text-slate-300">
                            &bull; {warn}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                      {wt.recommended_action}
                    </span>
                    <button
                      onClick={() => {
                        if (onScheduleTopic) {
                          onScheduleTopic(wt.topic_id, wt.subject_id, wt.topic_title);
                        } else {
                          window.location.hash = '#planner';
                        }
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm flex-shrink-0"
                    >
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>Schedule Session</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MISTAKE ANALYSIS LOG */}
      {activeTab === 'mistakes' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Category Filter:</span>
              <select
                value={mistakeFilter}
                onChange={(e) => setMistakeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="all">All Mistakes</option>
                <option value="repeated">Repeated Mistakes Only</option>
                <option value="conceptual">Conceptual Errors</option>
                <option value="calculation">Calculation Errors</option>
                <option value="incorrect_selection">Selection Errors</option>
                <option value="incomplete">Incomplete / Blank</option>
              </select>
            </div>
            <span className="text-slate-400">Showing {filteredMistakes.length} mistakes</span>
          </div>

          {filteredMistakes.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon className="w-8 h-8 text-emerald-400" />}
              title="No mistakes matching filter"
              description="Either no mistakes were recorded in recent attempts or none match the selected filter."
            />
          ) : (
            <div className="space-y-3">
              {filteredMistakes.map((m, idx) => (
                <div
                  key={idx}
                  className={`bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-3 transition ${
                    m.is_repeated ? 'border-rose-800/80' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-300">{m.subject_name}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-sky-400">{m.topic_title}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {m.is_repeated && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                          REPEATED ERROR
                        </span>
                      )}
                      <Badge type="mistake_category" value={m.mistake_category} />
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-white">{m.question_text}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Your Answer:</span>
                      <span className="text-rose-300 font-medium">
                        {Array.isArray(m.selected_answer)
                          ? m.selected_answer.join(', ')
                          : m.selected_answer || '(Blank)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Correct Answer:</span>
                      <span className="text-emerald-400 font-medium">
                        {Array.isArray(m.correct_answer)
                          ? m.correct_answer.join(', ')
                          : m.correct_answer}
                      </span>
                    </div>
                  </div>

                  {m.explanation && (
                    <div className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800 text-[11px] text-slate-300">
                      <span className="font-semibold text-slate-400 block mb-0.5">Explanation:</span>
                      <p>{m.explanation}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-sky-400 font-medium">
                    Suggested Action: <span className="text-slate-300">{m.suggested_action}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <EmptyState
              icon={<SparklesIcon className="w-8 h-8 text-sky-400" />}
              title="No recommendations yet"
              description="Complete a few quizzes to let the diagnostic engine analyze your strengths, weaknesses, and prerequisites."
            />
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge type="priority" value={rec.priority} />
                      {rec.subject_name && (
                        <span className="text-xs text-slate-400">&bull; {rec.subject_name}</span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">{rec.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{rec.description}</p>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={() => {
                        if (rec.action_type === 'schedule_session') {
                          window.location.hash = '#planner';
                        } else if (rec.action_type === 'review_mistakes') {
                          setActiveTab('mistakes');
                        } else {
                          window.location.hash = '#quizzes';
                        }
                      }}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
                    >
                      <span>Take Action &rarr;</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD PREREQUISITE MODAL */}
      <Modal
        isOpen={isAddPrereqOpen}
        onClose={() => setIsAddPrereqOpen(false)}
        title="Add Topic Prerequisite Dependency"
      >
        <form onSubmit={handleAddPrerequisiteSubmit} className="space-y-4">
          {prereqError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {prereqError}
            </div>
          )}

          {prereqSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span>{prereqSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Subject *
            </label>
            <select
              value={prereqSubjectId}
              onChange={(e) => setPrereqSubjectId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
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
              Target Topic (Dependent Topic) *
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            >
              {prereqTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Must Precede (Prerequisite Topic) *
            </label>
            <select
              value={selectedPrereqId}
              onChange={(e) => setSelectedPrereqId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            >
              {prereqTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Students must understand this foundational topic before tackling the target topic.
            </span>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddPrereqOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
            >
              Add Prerequisite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
