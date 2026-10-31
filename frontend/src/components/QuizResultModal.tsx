import React from 'react';
import { QuizResult } from '../types';
import { Modal } from './Modal';
import { Badge } from './Badge';
import {
  CheckCircleIcon,
  XCircleIcon,
  TargetIcon,
  SparklesIcon,
} from './Icons';

interface QuizResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: QuizResult | null;
  onRetry?: () => void;
}

export const QuizResultModal: React.FC<QuizResultModalProps> = ({
  isOpen,
  onClose,
  result,
  onRetry,
}) => {
  if (!result) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assessment Performance Analysis"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Top Score Banner */}
        <div
          className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            result.is_passed
              ? 'bg-emerald-950/30 border-emerald-800/80'
              : 'bg-rose-950/30 border-rose-800/80'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {result.is_passed ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-rose-400" />
              )}
              <h3 className="text-lg font-bold text-white tracking-tight">
                {result.is_passed ? 'Assessment Passed' : 'Needs Practice & Revision'}
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              {result.quiz_title} &bull; Passing threshold: {result.passing_percentage}%
            </p>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Score</span>
              <span className="text-2xl font-black text-white">
                {result.obtained_marks}{' '}
                <span className="text-xs font-normal text-slate-400">/ {result.total_marks}</span>
              </span>
            </div>

            <div className="text-center border-l border-slate-700/60 pl-6">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Accuracy</span>
              <span
                className={`text-2xl font-black ${
                  result.accuracy_percentage >= 75
                    ? 'text-emerald-400'
                    : result.accuracy_percentage >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {result.accuracy_percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Correct</span>
            <span className="text-base font-bold text-emerald-400">{result.correct_answers}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Incorrect</span>
            <span className="text-base font-bold text-rose-400">{result.incorrect_answers}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Unanswered</span>
            <span className="text-base font-bold text-slate-300">{result.unanswered_questions}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Time Spent</span>
            <span className="text-base font-bold text-sky-400">
              {Math.floor(result.time_spent_seconds / 60)}m {result.time_spent_seconds % 60}s
            </span>
          </div>
        </div>

        {/* Topic-wise Breakdown */}
        {result.topic_breakdown && result.topic_breakdown.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
              <TargetIcon className="w-4 h-4 text-sky-400" />
              <span>Topic-Wise Breakdown</span>
            </div>
            <div className="space-y-2">
              {result.topic_breakdown.map((tb) => (
                <div
                  key={tb.topic_id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{tb.topic_title}</span>
                    <span
                      className={`font-bold ${
                        tb.accuracy_percentage >= 75
                          ? 'text-emerald-400'
                          : tb.accuracy_percentage >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {tb.accuracy_percentage}% ({tb.correct_count}/{tb.total_questions} correct)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        tb.accuracy_percentage >= 75
                          ? 'bg-emerald-500'
                          : tb.accuracy_percentage >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${tb.accuracy_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personalized Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/50 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-sky-300 uppercase tracking-wider">
              <SparklesIcon className="w-4 h-4 text-sky-400" />
              <span>Diagnostic Recommendations</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-sky-400 font-bold">&bull;</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed Question Review */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Detailed Question Review ({result.answers.length})
          </h4>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {result.answers.map((ans, idx) => {
              const isCorrect = ans.is_correct;
              const formattedSelected =
                Array.isArray(ans.selected_answer)
                  ? ans.selected_answer.join(', ')
                  : ans.selected_answer || '(Unanswered)';
              const formattedCorrect =
                Array.isArray(ans.correct_answer)
                  ? ans.correct_answer.join(', ')
                  : ans.correct_answer;

              return (
                <div
                  key={ans.question_id}
                  className={`p-4 rounded-xl border text-xs space-y-2 transition ${
                    isCorrect
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-rose-950/20 border-rose-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-200">
                      Q{idx + 1}. {ans.question_text}
                    </span>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {ans.mistake_category && (
                        <Badge type="mistake_category" value={ans.mistake_category} />
                      )}
                      <span
                        className={`font-bold ${
                          isCorrect ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isCorrect ? `+${ans.obtained_marks}` : ans.obtained_marks} pts
                      </span>
                    </div>
                  </div>

                  {/* Options List */}
                  {ans.options && ans.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {ans.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 text-[11px]"
                        >
                          <span className="font-bold text-slate-300">{opt.id}:</span> {opt.text}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Your Answer:</span>
                      <span
                        className={`font-medium ${
                          isCorrect ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {formattedSelected}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Correct Answer:</span>
                      <span className="font-medium text-emerald-400">{formattedCorrect}</span>
                    </div>
                  </div>

                  {ans.explanation && (
                    <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 text-[11px] text-slate-300">
                      <span className="font-semibold text-sky-400 block mb-0.5">Explanation:</span>
                      <p>{ans.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          {onRetry && (
            <button
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Retry Quiz
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </Modal>
  );
};
