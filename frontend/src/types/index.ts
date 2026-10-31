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
