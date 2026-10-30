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

