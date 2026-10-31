import {
  Subject,
  SubjectDetail,
  SubjectCreateInput,
  SubjectUpdateInput,
  Topic,
  TopicCreateInput,
  TopicUpdateInput,
  StudySession,
  StudySessionCreateInput,
  StudySessionUpdateInput,
  Exam,
  ExamCreateInput,
  ExamUpdateInput,
  DashboardSummary,
  AnalyticsOverview,
  StudyPreference,
  StudyPreferenceUpdateInput,
  UnavailableBlock,
  UnavailableBlockCreateInput,
  ScheduleHistory,
  GeneratedPlanResponse,
  PlanGenerateRequestInput,
  ConfirmPlanRequestInput,
  RecoverMissedRequestInput,
  RecoverMissedResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_PREFIX = '/api/v1';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.detail) {
        if (typeof errorJson.detail === 'string') {
          errorDetail = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errorDetail = errorJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ');
        }
      }
    } catch {
      // Use fallback errorDetail
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// --- Dashboard & Analytics ---
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/dashboard/summary`);
  return handleResponse<DashboardSummary>(res);
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/analytics/overview`);
  return handleResponse<AnalyticsOverview>(res);
}

// --- Subjects ---
export async function getSubjects(): Promise<Subject[]> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/subjects`);
  return handleResponse<Subject[]>(res);
}

export async function getSubject(id: number): Promise<SubjectDetail> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/subjects/${id}`);
  return handleResponse<SubjectDetail>(res);
}

export async function createSubject(input: SubjectCreateInput): Promise<Subject> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Subject>(res);
}

export async function updateSubject(id: number, input: SubjectUpdateInput): Promise<Subject> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/subjects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Subject>(res);
}

export async function deleteSubject(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/subjects/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

// --- Topics ---
export async function getSubjectTopics(subjectId: number): Promise<Topic[]> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/subjects/${subjectId}/topics`);
  return handleResponse<Topic[]>(res);
}

export async function createTopic(subjectId: number, input: TopicCreateInput): Promise<Topic> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/subjects/${subjectId}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Topic>(res);
}

export async function updateTopic(topicId: number, input: TopicUpdateInput): Promise<Topic> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/topics/${topicId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Topic>(res);
}

export async function deleteTopic(topicId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/topics/${topicId}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

// --- Study Sessions ---
export interface StudySessionFilters {
  scheduled_date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  subject_id?: number;
}

export async function getStudySessions(filters?: StudySessionFilters): Promise<StudySession[]> {
  const params = new URLSearchParams();
  if (filters?.scheduled_date) params.append('scheduled_date', filters.scheduled_date);
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.subject_id) params.append('subject_id', String(filters.subject_id));

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}${API_PREFIX}/study-sessions${query}`);
  return handleResponse<StudySession[]>(res);
}

export async function createStudySession(input: StudySessionCreateInput): Promise<StudySession> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/study-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<StudySession>(res);
}

export async function updateStudySession(id: number, input: StudySessionUpdateInput): Promise<StudySession> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/study-sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<StudySession>(res);
}

export async function deleteStudySession(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/study-sessions/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

// --- Exams ---
export async function getExams(): Promise<Exam[]> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/exams`);
  return handleResponse<Exam[]>(res);
}

export async function createExam(input: ExamCreateInput): Promise<Exam> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Exam>(res);
}

export async function updateExam(id: number, input: ExamUpdateInput): Promise<Exam> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/exams/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Exam>(res);
}

export async function deleteExam(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/exams/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

// --- Intelligent Scheduling Engine (Phase 02) ---

export async function getStudyPreferences(): Promise<StudyPreference> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/preferences`);
  return handleResponse<StudyPreference>(res);
}

export async function updateStudyPreferences(input: StudyPreferenceUpdateInput): Promise<StudyPreference> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<StudyPreference>(res);
}

export async function getUnavailableBlocks(): Promise<UnavailableBlock[]> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/unavailable-blocks`);
  return handleResponse<UnavailableBlock[]>(res);
}

export async function createUnavailableBlock(input: UnavailableBlockCreateInput): Promise<UnavailableBlock> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/unavailable-blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<UnavailableBlock>(res);
}

export async function deleteUnavailableBlock(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/unavailable-blocks/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

export async function getScheduleHistory(limit: number = 20): Promise<ScheduleHistory[]> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/history?limit=${limit}`);
  return handleResponse<ScheduleHistory[]>(res);
}

export async function generateStudyPlan(input: PlanGenerateRequestInput): Promise<GeneratedPlanResponse> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<GeneratedPlanResponse>(res);
}

export async function previewReschedule(input: PlanGenerateRequestInput): Promise<GeneratedPlanResponse> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/preview-reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<GeneratedPlanResponse>(res);
}

export async function confirmStudyPlan(input: ConfirmPlanRequestInput): Promise<{ status: string; message: string; sessions_created: number }> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/confirm-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<{ status: string; message: string; sessions_created: number }>(res);
}

export async function recoverMissedSessions(input: RecoverMissedRequestInput): Promise<RecoverMissedResponse> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/planner/recover-missed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<RecoverMissedResponse>(res);
}
