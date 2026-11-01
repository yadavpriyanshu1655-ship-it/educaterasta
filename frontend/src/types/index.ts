export type TopicStatus = 'not_started' | 'in_progress' | 'completed';
export type TopicPriority = 'low' | 'medium' | 'high';
export type SessionStatus = 'pending' | 'completed' | 'missed';

export interface Subject {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  topic_count: number;
  completed_topic_count: number;
  progress_percentage: number;
}

export interface SubjectDetail extends Subject {
  topics: Topic[];
}

export interface SubjectCreateInput {
  name: string;
  description?: string;
  color?: string;
}

export interface SubjectUpdateInput {
  name?: string;
  description?: string;
  color?: string;
}

export interface Topic {
  id: number;
  subject_id: number;
  title: string;
  description: string | null;
  status: TopicStatus;
  priority: TopicPriority;
  estimated_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface TopicCreateInput {
  title: string;
  description?: string;
  status?: TopicStatus;
  priority?: TopicPriority;
  estimated_duration_minutes?: number;
}

export interface TopicUpdateInput {
  title?: string;
  description?: string;
  status?: TopicStatus;
  priority?: TopicPriority;
  estimated_duration_minutes?: number;
}

export interface StudySession {
  id: number;
  subject_id: number;
  topic_id: number | null;
  title: string;
  scheduled_date: string;
  start_time: string | null;
  planned_duration_minutes: number;
  actual_duration_minutes: number | null;
  status: SessionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  subject_name?: string | null;
  subject_color?: string | null;
  topic_title?: string | null;
}

export interface StudySessionCreateInput {
  subject_id: number;
  topic_id?: number | null;
  title: string;
  scheduled_date: string;
  start_time?: string;
  planned_duration_minutes: number;
  actual_duration_minutes?: number | null;
  status?: SessionStatus;
  notes?: string;
}

export interface StudySessionUpdateInput {
  subject_id?: number;
  topic_id?: number | null;
  title?: string;
  scheduled_date?: string;
  start_time?: string;
  planned_duration_minutes?: number;
  actual_duration_minutes?: number | null;
  status?: SessionStatus;
  notes?: string;
}

export interface Exam {
  id: number;
  subject_id: number;
  title: string;
  exam_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  subject_name?: string | null;
  subject_color?: string | null;
  days_remaining: number;
  is_today: boolean;
  is_past: boolean;
}

export interface ExamCreateInput {
  subject_id: number;
  title: string;
  exam_date: string;
  notes?: string;
}

export interface ExamUpdateInput {
  subject_id?: number;
  title?: string;
  exam_date?: string;
  notes?: string;
}

export interface SubjectProgressSummary {
  subject_id: number;
  subject_name: string;
  color: string | null;
  total_topics: number;
  completed_topics: number;
  in_progress_topics: number;
  not_started_topics: number;
  progress_percentage: number;
}

export interface DashboardSummary {
  total_subjects: number;
  total_topics: number;
  completed_topics: number;
  overall_syllabus_progress: floatNumber;
  total_study_sessions: number;
  completed_study_sessions: number;
  pending_study_sessions: number;
  missed_study_sessions: number;
  total_planned_minutes: number;
  total_actual_minutes: number;
  todays_sessions: StudySession[];
  upcoming_exams: Exam[];
  subject_progress: SubjectProgressSummary[];
  recent_activity: StudySession[];
}

type floatNumber = number;

export interface SessionStatusBreakdown {
  completed: number;
  pending: number;
  missed: number;
  total: number;
}

export interface StudyTimeMetrics {
  total_planned_minutes: number;
  total_actual_minutes: number;
  total_planned_hours: number;
  total_actual_hours: number;
}

export interface AnalyticsOverview {
  overall_completion_rate: number;
  sessions_breakdown: SessionStatusBreakdown;
  time_metrics: StudyTimeMetrics;
  subject_completion_rates: SubjectProgressSummary[];
  upcoming_exams_count: number;
  upcoming_exams: Exam[];
  priority_distribution: Record<string, number>;
}

// --- Phase 02 Intelligent Scheduling Engine Types ---

export interface StudyPreference {
  id: number;
  daily_target_hours: number;
  preferred_start_time: string;
  preferred_end_time: string;
  max_session_duration_minutes: number;
  break_duration_minutes: number;
  available_days: string;
  exam_survival_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyPreferenceUpdateInput {
  daily_target_hours?: number;
  preferred_start_time?: string;
  preferred_end_time?: string;
  max_session_duration_minutes?: number;
  break_duration_minutes?: number;
  available_days?: string;
  exam_survival_mode?: boolean;
}

export interface UnavailableBlock {
  id: number;
  title: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface UnavailableBlockCreateInput {
  title: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface ScheduleHistory {
  id: number;
  action: string;
  summary: string;
  sessions_created: number;
  exam_survival_mode: boolean;
  details: string | null;
  created_at: string;
}

export interface ProposedSession {
  subject_id: number;
  subject_name: string;
  subject_color: string | null;
  topic_id: number | null;
  topic_title: string | null;
  title: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  planned_duration_minutes: number;
  priority_score: number;
  reason: string;
}

export interface UnscheduledTask {
  topic_id: number;
  topic_title: string;
  subject_id: number;
  subject_name: string;
  estimated_duration_minutes: number;
  reason: string;
  conflict_type: string;
}

export interface DailyWorkload {
  date: string;
  day_name: string;
  total_planned_minutes: number;
  capacity_minutes: number;
  sessions_count: number;
  is_available: boolean;
}

export interface GeneratedPlanResponse {
  start_date: string;
  end_date: string;
  exam_survival_mode: boolean;
  total_proposed_sessions: number;
  total_planned_minutes: number;
  proposed_sessions: ProposedSession[];
  unscheduled_tasks: UnscheduledTask[];
  daily_workloads: DailyWorkload[];
  explanations: string[];
}

export interface PlanGenerateRequestInput {
  start_date?: string;
  end_date?: string;
  subject_ids?: number[];
  exam_survival_mode?: boolean;
  daily_target_hours?: number;
  preferred_start_time?: string;
  preferred_end_time?: string;
  max_session_duration_minutes?: number;
  break_duration_minutes?: number;
}

export interface ConfirmPlanRequestInput {
  sessions: ProposedSession[];
  mode?: 'append' | 'replace_pending';
  action_summary?: string;
  exam_survival_mode?: boolean;
}

export interface RecoverMissedRequestInput {
  lookback_days?: number;
  target_start_date?: string;
  target_end_date?: string;
  exam_survival_mode?: boolean;
}

export interface RecoverMissedResponse {
  missed_sessions_detected: number;
  recovered_sessions: ProposedSession[];
  unrecoverable_tasks: UnscheduledTask[];
  summary: string;
}


// --- Phase 03: Quiz Engine & Weak Topic Detection ---

export type QuestionType = 'single_choice' | 'multiple_select' | 'true_false' | 'short_answer';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuizStatus = 'draft' | 'published';
export type QuizFeedbackMode = 'post_submission' | 'instant';
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';
export type TopicClassification = 'Strong' | 'Moderate' | 'Needs Improvement' | 'Weak' | 'Insufficient Data';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionPublic {
  id: number;
  subject_id: number;
  topic_id: number;
  question_text: string;
  question_type: QuestionType;
  difficulty: QuestionDifficulty;
  options: QuestionOption[] | null;
  marks: number;
  negative_marks: number;
  question_order?: number;
}

export interface QuestionDetail extends QuestionPublic {
  correct_answer: string | string[];
  explanation: string | null;
  source: string | null;
  subject_name?: string;
  topic_title?: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionCreateInput {
  subject_id: number;
  topic_id: number;
  question_text: string;
  question_type: QuestionType;
  difficulty: QuestionDifficulty;
  options?: QuestionOption[];
  correct_answer: string | string[];
  explanation?: string;
  marks?: number;
  negative_marks?: number;
  source?: string;
}

export interface QuestionUpdateInput {
  subject_id?: number;
  topic_id?: number;
  question_text?: string;
  question_type?: QuestionType;
  difficulty?: QuestionDifficulty;
  options?: QuestionOption[];
  correct_answer?: string | string[];
  explanation?: string;
  marks?: number;
  negative_marks?: number;
  source?: string;
}

export interface Quiz {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_color: string | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  difficulty: QuestionDifficulty;
  passing_percentage: number;
  status: QuizStatus;
  feedback_mode: QuizFeedbackMode;
  question_count: number;
  topic_ids: number[];
  topic_titles: string[];
  created_at: string;
  updated_at: string;
}

export interface QuizCreateInput {
  subject_id: number;
  title: string;
  description?: string;
  duration_minutes?: number;
  difficulty?: QuestionDifficulty;
  passing_percentage?: number;
  status?: QuizStatus;
  feedback_mode?: QuizFeedbackMode;
  topic_ids?: number[];
  question_ids?: number[];
}

export interface QuizUpdateInput {
  subject_id?: number;
  title?: string;
  description?: string;
  duration_minutes?: number;
  difficulty?: QuestionDifficulty;
  passing_percentage?: number;
  status?: QuizStatus;
  feedback_mode?: QuizFeedbackMode;
  topic_ids?: number[];
  question_ids?: number[];
}

export interface QuizStartResponse {
  attempt_id: number;
  quiz_id: number;
  title: string;
  duration_minutes: number;
  feedback_mode: QuizFeedbackMode;
  started_at: string;
  total_questions: number;
  questions: QuestionPublic[];
  saved_answers: Record<number, any>;
}

export interface SaveAnswerInput {
  question_id: number;
  selected_answer: string | string[] | null;
  time_spent_seconds?: number;
}

export interface SubmitQuizInput {
  answers?: SaveAnswerInput[];
}

export interface AnswerReview {
  question_id: number;
  question_text: string;
  question_type: QuestionType;
  difficulty: QuestionDifficulty;
  topic_id: number;
  topic_title: string;
  options?: QuestionOption[];
  selected_answer: any;
  correct_answer: any;
  is_correct: boolean;
  obtained_marks: number;
  marks: number;
  negative_marks: number;
  explanation: string | null;
  mistake_category: string | null;
}

export interface TopicBreakdown {
  topic_id: number;
  topic_title: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  accuracy_percentage: number;
  obtained_marks: number;
  total_marks: number;
}

export interface DifficultyBreakdown {
  difficulty: string;
  total_questions: number;
  correct_count: number;
  accuracy_percentage: number;
}

export interface QuizResult {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  total_marks: number;
  obtained_marks: number;
  accuracy_percentage: number;
  is_passed: boolean;
  passing_percentage: number;
  topic_breakdown: TopicBreakdown[];
  difficulty_breakdown: DifficultyBreakdown[];
  mistakes: AnswerReview[];
  answers: AnswerReview[];
  recommendations: string[];
}

export interface QuizAttemptSummary {
  id: number;
  quiz_id: number;
  quiz_title: string;
  subject_name: string;
  subject_color: string | null;
  status: string;
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number;
  total_questions: number;
  obtained_marks: number;
  total_marks: number;
  accuracy_percentage: number;
  is_passed: boolean;
}

export interface TopicPerformance {
  topic_id: number;
  topic_title: string;
  subject_id: number;
  subject_name: string;
  subject_color: string | null;
  attempts_count: number;
  correct_count: number;
  incorrect_count: number;
  accuracy_percentage: number;
  mastery_estimate: number;
  classification: TopicClassification;
  confidence_level: 'Low' | 'Medium' | 'High';
  last_attempted_at: string | null;
  updated_at: string;
}

export interface WeakTopic {
  topic_id: number;
  topic_title: string;
  subject_id: number;
  subject_name: string;
  subject_color: string | null;
  accuracy_percentage: number;
  mastery_estimate: number;
  attempts_count: number;
  classification: TopicClassification;
  confidence_level: 'Low' | 'Medium' | 'High';
  reason: string;
  recommended_action: string;
  prerequisite_warnings: string[];
}

export interface MistakeAnalysis {
  question_id: number;
  question_text: string;
  question_type: QuestionType;
  topic_id: number;
  topic_title: string;
  subject_name: string;
  selected_answer: any;
  correct_answer: any;
  explanation: string | null;
  mistake_category: string;
  is_repeated: boolean;
  attempt_id: number;
  attempted_at: string;
  suggested_action: string;
}

export interface PracticeRecommendation {
  id: string;
  type: string;
  topic_id?: number;
  topic_title?: string;
  subject_name?: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_type: string;
  action_payload?: Record<string, any>;
}

export interface PrerequisiteCreateInput {
  prerequisite_topic_id: number;
  relationship_type?: string;
}

export interface Prerequisite {
  id: number;
  topic_id: number;
  topic_title: string;
  prerequisite_topic_id: number;
  prerequisite_topic_title: string;
  relationship_type: string;
  created_at: string;
}

export interface TopicDependencies {
  topic_id: number;
  topic_title: string;
  prerequisites: Prerequisite[];
  dependents: Prerequisite[];
}

export interface AdaptiveQuestion {
  question: QuestionPublic;
  topic_id: number;
  topic_title: string;
  subject_id: number;
  subject_name: string;
  difficulty: QuestionDifficulty;
  current_topic_mastery: number;
  reason: string;
}

// ========================================================
// PHASE 04: SMART REVISION ENGINE TYPES
// ========================================================

export type RevisionRiskCategory = 'Low' | 'Moderate' | 'High' | 'Critical';
export type RevisionStatus = 'scheduled' | 'due' | 'overdue' | 'completed' | 'snoozed';

export interface RevisionPlan {
  id: number;
  topic_id: number;
  subject_id: number;
  topic_title: string;
  subject_name: string;
  subject_color: string | null;
  current_interval_days: number;
  last_revision_at: string | null;
  next_revision_at: string;
  revision_count: number;
  consecutive_successes: number;
  consecutive_failures: number;
  risk_score: number;
  risk_category: RevisionRiskCategory;
  status: RevisionStatus;
  is_due: boolean;
  is_overdue: boolean;
  days_until_due: number;
  created_at: string;
  updated_at: string;
}

export interface RevisionPlanDetail extends RevisionPlan {
  topic_description: string | null;
  topic_status: string;
  topic_priority: string;
  recent_mistakes: Array<{
    question_id: number;
    question_text: string;
    mistake_category: string | null;
    is_repeated: boolean;
    explanation: string | null;
  }>;
  sample_questions: Array<{
    id: number;
    question_text: string;
    difficulty: string;
    options: any;
    question_type: string;
  }>;
  prerequisites: string[];
  mastery_score: number | null;
}

export interface RevisionAttempt {
  id: number;
  revision_plan_id: number;
  topic_id: number;
  topic_title?: string;
  subject_name?: string;
  started_at: string;
  completed_at: string;
  duration_minutes: number;
  confidence_rating: number; // 1 to 5
  quiz_accuracy?: number | null;
  self_assessment?: string | null;
  notes?: string | null;
  result: 'success' | 'partial' | 'failed';
  created_at: string;
}

export interface RevisionAttemptCreateInput {
  confidence_rating: number; // 1 to 5
  duration_minutes?: number;
  quiz_accuracy?: number;
  self_assessment?: string;
  notes?: string;
}

export interface RevisionSnoozeInput {
  snooze_days: number;
  reason?: string;
}

export interface RevisionSkipInput {
  reason: string;
}

export interface RevisionEvent {
  id: number;
  revision_plan_id: number;
  event_type: string;
  previous_due_date?: string | null;
  new_due_date?: string | null;
  reason?: string | null;
  details?: string | null;
  created_at: string;
}

export interface RevisionOverviewMetrics {
  total_plans: number;
  due_today: number;
  overdue_count: number;
  completed_total: number;
  average_confidence: number;
  retention_rate_percentage: number;
  risk_distribution: {
    Low: number;
    Moderate: number;
    High: number;
    Critical: number;
  };
}

export interface ForgettingRiskItem {
  topic_id: number;
  topic_title: string;
  subject_name: string;
  subject_color: string | null;
  risk_score: number;
  risk_category: RevisionRiskCategory;
  current_interval_days: number;
  days_since_last_revision: number;
  consecutive_failures: number;
  reason: string;
  recommended_action: string;
  suggested_revision_date: string;
}

export interface ScheduleRevisionAsSessionInput {
  scheduled_date: string;
  start_time: string;
  duration_minutes?: number;
}
