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
  Quiz,
  QuizCreateInput,
  QuizUpdateInput,
  QuizStartResponse,
  SaveAnswerInput,
  SubmitQuizInput,
  QuizResult,
  QuizAttemptSummary,
  QuestionDetail,
  QuestionCreateInput,
  QuestionUpdateInput,
  TopicPerformance,
  WeakTopic,
  MistakeAnalysis,
  PracticeRecommendation,
  PrerequisiteCreateInput,
  Prerequisite,
  TopicDependencies,
  AdaptiveQuestion,
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


// --- Phase 03: Quiz Engine & Weak Topic Detection ---

export interface QuizFilters {
  subject_id?: number;
  difficulty?: string;
  status?: string;
}

export async function getQuizzes(filters?: QuizFilters): Promise<Quiz[]> {
  const params = new URLSearchParams();
  if (filters?.subject_id) params.append('subject_id', String(filters.subject_id));
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);
  if (filters?.status) params.append('status', filters.status);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}${API_PREFIX}/quizzes${query}`);
  return handleResponse<Quiz[]>(res);
}

export async function createQuiz(input: QuizCreateInput): Promise<Quiz> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Quiz>(res);
}

export async function getQuiz(id: number): Promise<Quiz> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/quizzes/${id}`);
  return handleResponse<Quiz>(res);
}

export async function updateQuiz(id: number, input: QuizUpdateInput): Promise<Quiz> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/quizzes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Quiz>(res);
}

export async function deleteQuiz(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/quizzes/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

export async function startQuiz(quizId: number): Promise<QuizStartResponse> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/quizzes/${quizId}/start`, {
    method: 'POST',
  });
  return handleResponse<QuizStartResponse>(res);
}

export async function getAdaptiveQuestion(subjectId: number, topicId?: number): Promise<AdaptiveQuestion> {
  const params = new URLSearchParams({ subject_id: String(subjectId) });
  if (topicId) params.append('topic_id', String(topicId));
  const res = await fetch(`${BASE_URL}${API_PREFIX}/quizzes/adaptive/next-question?${params.toString()}`);
  return handleResponse<AdaptiveQuestion>(res);
}

export interface QuestionFilters {
  subject_id?: number;
  topic_id?: number;
  difficulty?: string;
  question_type?: string;
}

export async function getQuestions(filters?: QuestionFilters): Promise<QuestionDetail[]> {
  const params = new URLSearchParams();
  if (filters?.subject_id) params.append('subject_id', String(filters.subject_id));
  if (filters?.topic_id) params.append('topic_id', String(filters.topic_id));
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);
  if (filters?.question_type) params.append('question_type', filters.question_type);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}${API_PREFIX}/questions${query}`);
  return handleResponse<QuestionDetail[]>(res);
}

export async function createQuestion(input: QuestionCreateInput): Promise<QuestionDetail> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<QuestionDetail>(res);
}

export async function getQuestion(id: number): Promise<QuestionDetail> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/questions/${id}`);
  return handleResponse<QuestionDetail>(res);
}

export async function updateQuestion(id: number, input: QuestionUpdateInput): Promise<QuestionDetail> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/questions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<QuestionDetail>(res);
}

export async function deleteQuestion(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/questions/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

export async function getAttempts(quizId?: number, limit: number = 50): Promise<QuizAttemptSummary[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (quizId) params.append('quiz_id', String(quizId));
  const res = await fetch(`${BASE_URL}${API_PREFIX}/attempts?${params.toString()}`);
  return handleResponse<QuizAttemptSummary[]>(res);
}

export async function getAttempt(attemptId: number): Promise<QuizResult | QuizStartResponse> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/attempts/${attemptId}`);
  return handleResponse<QuizResult | QuizStartResponse>(res);
}

export async function saveAnswer(attemptId: number, input: SaveAnswerInput): Promise<void> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/attempts/${attemptId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<void>(res);
}

export async function submitAttempt(attemptId: number, input?: SubmitQuizInput): Promise<QuizResult> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/attempts/${attemptId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input || {}),
  });
  return handleResponse<QuizResult>(res);
}

export async function getAttemptResults(attemptId: number): Promise<QuizResult> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/attempts/${attemptId}/results`);
  return handleResponse<QuizResult>(res);
}

export async function getTopicPerformances(subjectId?: number): Promise<TopicPerformance[]> {
  const params = new URLSearchParams();
  if (subjectId) params.append('subject_id', String(subjectId));
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}${API_PREFIX}/analytics/topic-performance${query}`);
  return handleResponse<TopicPerformance[]>(res);
}

export async function getWeakTopics(): Promise<WeakTopic[]> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/analytics/weak-topics`);
  return handleResponse<WeakTopic[]>(res);
}

export async function getMistakes(limit: number = 50): Promise<MistakeAnalysis[]> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/analytics/mistakes?limit=${limit}`);
  return handleResponse<MistakeAnalysis[]>(res);
}

export async function getRecommendations(): Promise<PracticeRecommendation[]> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/analytics/recommendations`);
  return handleResponse<PracticeRecommendation[]>(res);
}

export async function getTopicPrerequisites(topicId: number): Promise<TopicDependencies> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/topics/${topicId}/prerequisites`);
  return handleResponse<TopicDependencies>(res);
}

export async function createTopicPrerequisite(topicId: number, input: PrerequisiteCreateInput): Promise<Prerequisite> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/topics/${topicId}/prerequisites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Prerequisite>(res);
}

export async function deleteTopicPrerequisite(topicId: number, prerequisiteId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}/topics/${topicId}/prerequisites/${prerequisiteId}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}
