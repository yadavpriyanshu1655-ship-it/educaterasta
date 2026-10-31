import React, { useState, useEffect } from 'react';
import {
  Subject,
  Topic,
  Quiz,
  QuizCreateInput,
  QuestionDetail,
  QuestionCreateInput,
  QuizStartResponse,
  QuizResult,
  QuizAttemptSummary,
} from '../types';
import {
  getSubjects,
  getSubjectTopics,
  getQuizzes,
  createQuiz,
  startQuiz,
  getQuestions,
  createQuestion,
  getAttempts,
  getAttempt,
  saveAnswer,
  submitAttempt,
  getAdaptiveQuestion,
} from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { QuizResultModal } from '../components/QuizResultModal';
import {
  AwardIcon,
  PlusIcon,
  ClockIcon,
  RefreshIcon,
  SparklesIcon,
  BookOpenIcon,
  HistoryIcon,
} from '../components/Icons';

export const QuizPage: React.FC = () => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'quizzes' | 'questions' | 'history'>('quizzes');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Available Quizzes Tab
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<number | 'all'>('all');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');

  // Question Bank Tab
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');

  // Attempt History Tab
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);

  // Modals
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [isCreateQuestionOpen, setIsCreateQuestionOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);

  // Active Quiz Attempt State
  const [activeAttempt, setActiveAttempt] = useState<QuizStartResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Forms
  const [newQuiz, setNewQuiz] = useState<QuizCreateInput>({
    subject_id: 0,
    title: '',
    description: '',
    duration_minutes: 15,
    difficulty: 'medium',
    passing_percentage: 60,
    status: 'published',
    feedback_mode: 'post_submission',
    topic_ids: [],
    question_ids: [],
  });
  const [formTopics, setFormTopics] = useState<Topic[]>([]);
  const [formQuestions, setFormQuestions] = useState<QuestionDetail[]>([]);

  // New Question Form
  const [newQuestion, setNewQuestion] = useState<QuestionCreateInput>({
    subject_id: 0,
    topic_id: 0,
    question_text: '',
    question_type: 'single_choice',
    difficulty: 'medium',
    options: [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ],
    correct_answer: 'A',
    explanation: '',
    marks: 1.0,
    negative_marks: 0.0,
  });

  // Initial Data Load
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, qzs, atts] = await Promise.all([
        getSubjects(),
        getQuizzes(),
        getAttempts(),
      ]);
      setSubjects(subs);
      setQuizzes(qzs);
      setAttempts(atts);
      if (subs.length > 0) {
        setNewQuiz((prev) => ({ ...prev, subject_id: subs[0].id }));
        setNewQuestion((prev) => ({ ...prev, subject_id: subs[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load Question Bank when tab is questions
  const loadQuestionBank = async () => {
    try {
      const qList = await getQuestions();
      setQuestions(qList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestionBank();
    }
  }, [activeTab]);

  // Load Topics & Questions for Quiz Form when Subject Changes
  useEffect(() => {
    if (newQuiz.subject_id > 0) {
      getSubjectTopics(newQuiz.subject_id)
        .then(setFormTopics)
        .catch(() => setFormTopics([]));
      getQuestions({ subject_id: newQuiz.subject_id })
        .then(setFormQuestions)
        .catch(() => setFormQuestions([]));
    }
  }, [newQuiz.subject_id]);

  // Load Topics for Question Form
  useEffect(() => {
    if (newQuestion.subject_id > 0) {
      getSubjectTopics(newQuestion.subject_id)
        .then((tops) => {
          if (tops.length > 0) {
            setNewQuestion((prev) => ({ ...prev, topic_id: tops[0].id }));
          }
        })
        .catch(() => {});
    }
  }, [newQuestion.subject_id]);

  // Active Quiz Countdown Timer
  useEffect(() => {
    if (!activeAttempt || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAttempt, secondsRemaining]);

  // Start Quiz Handler
  const handleStartQuiz = async (quizId: number) => {
    setLoading(true);
    try {
      const startData = await startQuiz(quizId);
      setActiveAttempt(startData);
      setCurrentQuestionIndex(0);
      setUserAnswers(startData.saved_answers || {});
      setSecondsRemaining(startData.duration_minutes * 60);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start quiz');
    } finally {
      setLoading(false);
    }
  };

  // Launch Adaptive Question
  const handleLaunchAdaptivePractice = async (subjectId: number) => {
    try {
      const adaptive = await getAdaptiveQuestion(subjectId);
      alert(
        `Adaptive Recommender:\n\nRecommended: ${adaptive.question.question_text}\nDifficulty: ${adaptive.difficulty.toUpperCase()}\nReason: ${adaptive.reason}`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No adaptive questions available.');
    }
  };

  // Answer change handler in active quiz
  const handleSelectAnswer = async (questionId: number, val: any) => {
    const updated = { ...userAnswers, [questionId]: val };
    setUserAnswers(updated);

    if (activeAttempt) {
      setSaveStatus('Saving...');
      try {
        await saveAnswer(activeAttempt.attempt_id, {
          question_id: questionId,
          selected_answer: val,
        });
        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(null), 1500);
      } catch {
        setSaveStatus('Sync failed');
      }
    }
  };

  // Submit Active Quiz
  const handleFinalSubmit = async () => {
    if (!activeAttempt || isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitConfirm(false);

    const answersPayload = activeAttempt.questions.map((q) => ({
      question_id: q.id,
      selected_answer: userAnswers[q.id] || null,
    }));

    try {
      const result = await submitAttempt(activeAttempt.attempt_id, { answers: answersPayload });
      setActiveAttempt(null);
      setSelectedResult(result);
      setIsResultOpen(true);
      await loadInitialData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Quiz Submit
  const handleCreateQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuiz.title.trim()) return;

    try {
      await createQuiz(newQuiz);
      setIsCreateQuizOpen(false);
      setNewQuiz({
        subject_id: subjects[0]?.id || 0,
        title: '',
        description: '',
        duration_minutes: 15,
        difficulty: 'medium',
        passing_percentage: 60,
        status: 'published',
        feedback_mode: 'post_submission',
        topic_ids: [],
        question_ids: [],
      });
      await loadInitialData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create quiz');
    }
  };

  // Create Question Submit
  const handleCreateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.question_text.trim()) return;

    try {
      await createQuestion(newQuestion);
      setIsCreateQuestionOpen(false);
      setNewQuestion({
        subject_id: subjects[0]?.id || 0,
        topic_id: 0,
        question_text: '',
        question_type: 'single_choice',
        difficulty: 'medium',
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ],
        correct_answer: 'A',
        explanation: '',
        marks: 1.0,
        negative_marks: 0.0,
      });
      await loadQuestionBank();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create question');
    }
  };

  // View past result
  const handleViewAttemptResult = async (attemptId: number) => {
    try {
      const res = await getAttempt(attemptId);
      if ('accuracy_percentage' in res) {
        setSelectedResult(res as QuizResult);
        setIsResultOpen(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load attempt results');
    }
  };

  // Filter Quizzes
  const filteredQuizzes = quizzes.filter((q) => {
    if (selectedSubjectFilter !== 'all' && q.subject_id !== selectedSubjectFilter) return false;
    if (selectedDifficultyFilter !== 'all' && q.difficulty !== selectedDifficultyFilter) return false;
    return true;
  });

  // Filter Questions
  const filteredQuestions = questions.filter((q) => {
    if (!questionSearch) return true;
    return (
      q.question_text.toLowerCase().includes(questionSearch.toLowerCase()) ||
      (q.topic_title && q.topic_title.toLowerCase().includes(questionSearch.toLowerCase()))
    );
  });

  // ========================================================
  // ACTIVE QUIZ TAKING INTERFACE
  // ========================================================
  if (activeAttempt) {
    const questionsList = activeAttempt.questions;
    const currentQ = questionsList[currentQuestionIndex];
    const answeredCount = Object.keys(userAnswers).filter(
      (k) => userAnswers[Number(k)] !== undefined && userAnswers[Number(k)] !== null && userAnswers[Number(k)] !== ''
    ).length;
    const unansweredCount = questionsList.length - answeredCount;

    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    const isUrgent = secondsRemaining < 120; // less than 2 minutes

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top Active Quiz Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm sticky top-4 z-20">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {activeAttempt.title}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
              <span>
                Question {currentQuestionIndex + 1} of {questionsList.length}
              </span>
              <span>&bull;</span>
              <span className="text-emerald-400 font-medium">{answeredCount} answered</span>
              {saveStatus && (
                <>
                  <span>&bull;</span>
                  <span className="text-sky-400 italic text-[11px]">{saveStatus}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Countdown Timer */}
            <div
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                isUrgent
                  ? 'bg-rose-950/60 border-rose-700 text-rose-300 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <ClockIcon className="w-3.5 h-3.5" />
              <span>{timeFormatted}</span>
            </div>

            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
            >
              Submit Quiz
            </button>
          </div>
        </div>

        {/* Question Navigator Strip */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-wrap gap-2">
          {questionsList.map((q, idx) => {
            const isAnswered =
              userAnswers[q.id] !== undefined &&
              userAnswers[q.id] !== null &&
              userAnswers[q.id] !== '';
            const isCurrent = idx === currentQuestionIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                  isCurrent
                    ? 'bg-sky-600 text-white ring-2 ring-sky-400/40'
                    : isAnswered
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Current Question Card */}
        {currentQ && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-950 text-sky-300 border border-sky-800 capitalize">
                  {currentQ.question_type.replace('_', ' ')}
                </span>
                <Badge type="difficulty" value={currentQ.difficulty} />
              </div>
              <span className="text-xs text-slate-400 font-medium">
                +{currentQ.marks} pts {currentQ.negative_marks > 0 && `(-${currentQ.negative_marks} on error)`}
              </span>
            </div>

            {/* Question Text */}
            <h3 className="text-base font-semibold text-white leading-relaxed">
              {currentQ.question_text}
            </h3>

            {/* Multiple Choice Options */}
            {currentQ.question_type === 'single_choice' && currentQ.options && (
              <div className="space-y-2.5">
                {currentQ.options.map((opt) => {
                  const isSelected = userAnswers[currentQ.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQ.id, opt.id)}
                      className={`w-full p-3.5 rounded-xl border text-left transition flex items-center space-x-3 ${
                        isSelected
                          ? 'bg-sky-950/60 border-sky-600 text-white shadow-sm ring-1 ring-sky-500/30'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-600 text-slate-400'
                        }`}
                      >
                        {opt.id}
                      </div>
                      <span className="text-xs font-medium">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multiple Select Options */}
            {currentQ.question_type === 'multiple_select' && currentQ.options && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-400 italic">Select all that apply:</p>
                {currentQ.options.map((opt) => {
                  const selectedArr: string[] = Array.isArray(userAnswers[currentQ.id])
                    ? userAnswers[currentQ.id]
                    : [];
                  const isSelected = selectedArr.includes(opt.id);

                  const toggleOpt = () => {
                    const newArr = isSelected
                      ? selectedArr.filter((x) => x !== opt.id)
                      : [...selectedArr, opt.id];
                    handleSelectAnswer(currentQ.id, newArr);
                  };

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={toggleOpt}
                      className={`w-full p-3.5 rounded-xl border text-left transition flex items-center space-x-3 ${
                        isSelected
                          ? 'bg-sky-950/60 border-sky-600 text-white shadow-sm ring-1 ring-sky-500/30'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-sky-600 border-sky-500 text-white' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && '✓'}
                      </div>
                      <span className="text-xs font-medium">
                        <strong className="text-slate-200 mr-1.5">{opt.id}:</strong>
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* True / False Options */}
            {currentQ.question_type === 'true_false' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {['True', 'False'].map((tf) => {
                  const isSelected = String(userAnswers[currentQ.id]).toLowerCase() === tf.toLowerCase();
                  return (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQ.id, tf)}
                      className={`p-4 rounded-xl border text-center font-bold text-sm transition ${
                        isSelected
                          ? 'bg-sky-950/80 border-sky-500 text-white ring-1 ring-sky-500/40'
                          : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short Answer Input */}
            {currentQ.question_type === 'short_answer' && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-medium text-slate-400">Type your answer:</label>
                <input
                  type="text"
                  value={userAnswers[currentQ.id] || ''}
                  onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                  placeholder="e.g. Mitochondria, O(log n)"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 placeholder-slate-500"
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-40"
              >
                &larr; Previous Question
              </button>

              {currentQuestionIndex < questionsList.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
                >
                  Next Question &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                >
                  Review & Submit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Submit Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          onConfirm={handleFinalSubmit}
          title="Submit Assessment?"
          message={
            unansweredCount > 0
              ? `You have ${unansweredCount} unanswered question(s). Are you sure you want to finalize your submission?`
              : 'All questions have been answered. Ready to generate your performance analysis?'
          }
          confirmLabel={isSubmitting ? 'Evaluating...' : 'Confirm Submission'}
          loading={isSubmitting}
        />
      </div>
    );
  }

  // ========================================================
  // MAIN QUIZ HUB VIEW
  // ========================================================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Quizzes & Assessment</h2>
          <p className="mt-1 text-xs text-slate-400">
            Practice topic-specific questions, test retention under timed conditions, and detect weak syllabus areas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateQuestionOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>

          <button
            onClick={() => setIsCreateQuizOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Create Quiz</span>
          </button>

          <button
            onClick={loadInitialData}
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

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'quizzes'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Available Quizzes ({quizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'questions'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Question Bank ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'history'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Past Attempts ({attempts.length})
        </button>
      </div>

      {/* TAB 1: AVAILABLE QUIZZES */}
      {activeTab === 'quizzes' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Subject:</span>
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) =>
                    setSelectedSubjectFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Difficulty:</span>
                <select
                  value={selectedDifficultyFilter}
                  onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {subjects.length > 0 && (
              <button
                onClick={() => handleLaunchAdaptivePractice(subjects[0].id)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-950/70 border border-purple-800 text-purple-300 hover:bg-purple-900/60 transition"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Launch Adaptive Question</span>
              </button>
            )}
          </div>

          {filteredQuizzes.length === 0 ? (
            <EmptyState
              icon={<AwardIcon className="w-8 h-8" />}
              title="No quizzes available"
              description="Create a subject-specific quiz to test your mastery and diagnose weak syllabus topics."
              actionLabel="Create Quiz"
              onAction={() => setIsCreateQuizOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider"
                        style={{ backgroundColor: quiz.subject_color || '#3b82f6' }}
                      >
                        {quiz.subject_name}
                      </span>
                      <Badge type="difficulty" value={quiz.difficulty} />
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{quiz.description}</p>
                    )}

                    <div className="flex items-center space-x-3 text-xs text-slate-400 pt-1">
                      <span className="flex items-center space-x-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>{quiz.duration_minutes} min</span>
                      </span>
                      <span>&bull;</span>
                      <span>{quiz.question_count} Questions</span>
                      <span>&bull;</span>
                      <span>Pass: {quiz.passing_percentage}%</span>
                    </div>

                    {quiz.topic_titles && quiz.topic_titles.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1">
                        {quiz.topic_titles.slice(0, 3).map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300"
                          >
                            {t}
                          </span>
                        ))}
                        {quiz.topic_titles.length > 3 && (
                          <span className="text-[10px] text-slate-500 self-center">
                            +{quiz.topic_titles.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <Badge type="quiz_status" value={quiz.status} />
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
                    >
                      <span>Take Quiz</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUESTION BANK */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <input
              type="text"
              placeholder="Search question text or topic..."
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <span className="text-slate-400">Total: {filteredQuestions.length} Questions</span>
          </div>

          {filteredQuestions.length === 0 ? (
            <EmptyState
              icon={<BookOpenIcon className="w-8 h-8" />}
              title="No questions found"
              description="Add questions across single-choice, multiple-select, true/false, or short-answer types."
              actionLabel="Add Question"
              onAction={() => setIsCreateQuestionOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-300">{q.subject_name}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-sky-400">{q.topic_title}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="capitalize text-slate-400">{q.question_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge type="difficulty" value={q.difficulty} />
                      <span className="text-slate-400 font-semibold">{q.marks} pts</span>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-white">{q.question_text}</p>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800/40 border border-slate-800 text-slate-300"
                        >
                          <strong className="text-slate-400 mr-1">{opt.id}:</strong> {opt.text}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="text-emerald-400 font-medium">
                      Correct Answer:{' '}
                      <span className="font-bold">
                        {Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}
                      </span>
                    </span>
                    {q.explanation && (
                      <span className="text-slate-400 italic text-[11px] truncate max-w-md">
                        "{q.explanation}"
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAST ATTEMPTS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {attempts.length === 0 ? (
            <EmptyState
              icon={<HistoryIcon className="w-8 h-8" />}
              title="No attempts recorded yet"
              description="Complete a practice quiz to inspect your score, accuracy breakdown, and mistake analysis."
              actionLabel="Take a Quiz"
              onAction={() => setActiveTab('quizzes')}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Quiz</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Accuracy</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-white block">{att.quiz_title}</span>
                        <span className="text-[11px] text-slate-400">{att.subject_name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.is_passed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {att.is_passed ? 'PASSED' : 'NEEDS PRACTICE'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-white">
                        {att.obtained_marks} / {att.total_marks}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-semibold ${
                            att.accuracy_percentage >= 70
                              ? 'text-emerald-400'
                              : att.accuracy_percentage >= 50
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {att.accuracy_percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        {new Date(att.started_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleViewAttemptResult(att.id)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-semibold transition"
                        >
                          Analysis
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE QUIZ MODAL */}
      <Modal
        isOpen={isCreateQuizOpen}
        onClose={() => setIsCreateQuizOpen(false)}
        title="Create New Quiz"
      >
        <form onSubmit={handleCreateQuizSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Subject *
            </label>
            <select
              value={newQuiz.subject_id}
              onChange={(e) =>
                setNewQuiz({
                  ...newQuiz,
                  subject_id: Number(e.target.value),
                  topic_ids: [],
                  question_ids: [],
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
              Quiz Title *
            </label>
            <input
              type="text"
              required
              value={newQuiz.title}
              onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
              placeholder="e.g. Calculus Midterm Diagnostic"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={newQuiz.description || ''}
              onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Duration (Min) *
              </label>
              <input
                type="number"
                min={1}
                max={240}
                required
                value={newQuiz.duration_minutes}
                onChange={(e) =>
                  setNewQuiz({ ...newQuiz, duration_minutes: parseInt(e.target.value) || 15 })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Difficulty
              </label>
              <select
                value={newQuiz.difficulty}
                onChange={(e) =>
                  setNewQuiz({ ...newQuiz, difficulty: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Pass Threshold (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={newQuiz.passing_percentage}
                onChange={(e) =>
                  setNewQuiz({ ...newQuiz, passing_percentage: parseFloat(e.target.value) || 60 })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Select Topics */}
          {formTopics.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Covered Topics
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-800/40 rounded-xl border border-slate-700">
                {formTopics.map((top) => {
                  const isSelected = newQuiz.topic_ids?.includes(top.id);
                  return (
                    <button
                      type="button"
                      key={top.id}
                      onClick={() => {
                        const cur = newQuiz.topic_ids || [];
                        const updated = isSelected ? cur.filter((id) => id !== top.id) : [...cur, top.id];
                        setNewQuiz({ ...newQuiz, topic_ids: updated });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                        isSelected
                          ? 'bg-sky-600 border-sky-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {top.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Select Questions */}
          {formQuestions.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Select Questions ({newQuiz.question_ids?.length || 0} selected)
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-800/40 rounded-xl border border-slate-700 text-xs">
                {formQuestions.map((q) => {
                  const isSelected = newQuiz.question_ids?.includes(q.id);
                  return (
                    <button
                      type="button"
                      key={q.id}
                      onClick={() => {
                        const cur = newQuiz.question_ids || [];
                        const updated = isSelected ? cur.filter((id) => id !== q.id) : [...cur, q.id];
                        setNewQuiz({ ...newQuiz, question_ids: updated });
                      }}
                      className={`w-full p-2 rounded-lg text-left border flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-sky-950/80 border-sky-600 text-white'
                          : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate pr-2">{q.question_text}</span>
                      <span className="font-bold text-[10px] uppercase">{q.difficulty}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateQuizOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
            >
              Create Quiz
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE QUESTION MODAL */}
      <Modal
        isOpen={isCreateQuestionOpen}
        onClose={() => setIsCreateQuestionOpen(false)}
        title="Add Question to Question Bank"
      >
        <form onSubmit={handleCreateQuestionSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Subject *
              </label>
              <select
                value={newQuestion.subject_id}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, subject_id: Number(e.target.value) })
                }
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
                Topic *
              </label>
              <select
                value={newQuestion.topic_id}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, topic_id: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              >
                {formTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Question Text *
            </label>
            <textarea
              rows={2}
              required
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
              placeholder="e.g. Which algorithm has O(n log n) average time complexity?"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                value={newQuestion.question_type}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, question_type: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="single_choice">Single Choice</option>
                <option value="multiple_select">Multiple Select</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Difficulty
              </label>
              <select
                value={newQuestion.difficulty}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, difficulty: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Marks
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={newQuestion.marks}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, marks: parseFloat(e.target.value) || 1.0 })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Options for single_choice or multiple_select */}
          {(newQuestion.question_type === 'single_choice' || newQuestion.question_type === 'multiple_select') && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Options (A, B, C, D)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {newQuestion.options?.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-400 w-4">{opt.id}:</span>
                    <input
                      type="text"
                      required
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...(newQuestion.options || [])];
                        updated[idx].text = e.target.value;
                        setNewQuestion({ ...newQuestion, options: updated });
                      }}
                      placeholder={`Option ${opt.id}`}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Correct Answer *
            </label>
            <input
              type="text"
              required
              value={Array.isArray(newQuestion.correct_answer) ? newQuestion.correct_answer.join(', ') : newQuestion.correct_answer}
              onChange={(e) => {
                const val = e.target.value;
                if (newQuestion.question_type === 'multiple_select') {
                  const items = val.split(',').map((x) => x.trim().toUpperCase());
                  setNewQuestion({ ...newQuestion, correct_answer: items });
                } else {
                  setNewQuestion({ ...newQuestion, correct_answer: val });
                }
              }}
              placeholder="e.g. A (or A, C for multiple select, or keyword for short answer)"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Explanation (Optional)
            </label>
            <textarea
              rows={2}
              value={newQuestion.explanation || ''}
              onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateQuestionOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
            >
              Save Question
            </button>
          </div>
        </form>
      </Modal>

      {/* QUIZ RESULT MODAL */}
      <QuizResultModal
        isOpen={isResultOpen}
        onClose={() => setIsResultOpen(false)}
        result={selectedResult}
      />
    </div>
  );
};
