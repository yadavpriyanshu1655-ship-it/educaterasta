from datetime import datetime
from typing import List, Optional, Any, Dict, Union
from pydantic import BaseModel, ConfigDict, Field


# --- Question Schemas ---

class QuestionOption(BaseModel):
    id: str  # e.g. "A", "B", "C", "D"
    text: str

    model_config = ConfigDict(from_attributes=True)


class QuestionCreate(BaseModel):
    subject_id: int
    topic_id: int
    question_text: str = Field(..., min_length=3)
    question_type: str = Field(
        default="single_choice",
        description="single_choice, multiple_select, true_false, short_answer",
    )
    difficulty: str = Field(default="medium", description="easy, medium, hard")
    options: Optional[List[QuestionOption]] = None
    correct_answer: Union[str, List[str]]  # JSON array or string
    explanation: Optional[str] = None
    marks: float = Field(default=1.0, ge=0.5)
    negative_marks: float = Field(default=0.0, ge=0.0)
    source: Optional[str] = None


class QuestionUpdate(BaseModel):
    subject_id: Optional[int] = None
    topic_id: Optional[int] = None
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    difficulty: Optional[str] = None
    options: Optional[List[QuestionOption]] = None
    correct_answer: Optional[Union[str, List[str]]] = None
    explanation: Optional[str] = None
    marks: Optional[float] = None
    negative_marks: Optional[float] = None
    source: Optional[str] = None


# Sanitized for public quiz taking (NO correct_answer or explanation)
class QuestionPublicResponse(BaseModel):
    id: int
    subject_id: int
    topic_id: int
    question_text: str
    question_type: str
    difficulty: str
    options: Optional[List[QuestionOption]] = None
    marks: float
    negative_marks: float
    question_order: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)


# Authoring / Teacher / Admin detail view
class QuestionDetailResponse(BaseModel):
    id: int
    subject_id: int
    topic_id: int
    question_text: str
    question_type: str
    difficulty: str
    options: Optional[List[QuestionOption]] = None
    correct_answer: Union[str, List[str]]
    explanation: Optional[str] = None
    marks: float
    negative_marks: float
    source: Optional[str] = None
    subject_name: Optional[str] = None
    topic_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Quiz Schemas ---

class QuizCreate(BaseModel):
    subject_id: int
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    duration_minutes: int = Field(default=15, ge=1, le=240)
    difficulty: str = Field(default="medium", description="easy, medium, hard")
    passing_percentage: float = Field(default=60.0, ge=0.0, le=100.0)
    status: str = Field(default="published", description="draft, published")
    feedback_mode: str = Field(default="post_submission", description="post_submission, instant")
    topic_ids: Optional[List[int]] = Field(default_factory=list)
    question_ids: Optional[List[int]] = Field(default_factory=list)


class QuizUpdate(BaseModel):
    subject_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    difficulty: Optional[str] = None
    passing_percentage: Optional[float] = None
    status: Optional[str] = None
    feedback_mode: Optional[str] = None
    topic_ids: Optional[List[int]] = None
    question_ids: Optional[List[int]] = None


class QuizSummaryResponse(BaseModel):
    id: int
    subject_id: int
    subject_name: str
    subject_color: Optional[str] = None
    title: str
    description: Optional[str] = None
    duration_minutes: int
    difficulty: str
    passing_percentage: float
    status: str
    feedback_mode: str
    question_count: int
    topic_ids: List[int] = Field(default_factory=list)
    topic_titles: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuizTakeResponse(BaseModel):
    quiz: QuizSummaryResponse
    questions: List[QuestionPublicResponse]


# --- Attempt & Evaluation Schemas ---

class QuizStartResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    title: str
    duration_minutes: int
    feedback_mode: str
    started_at: datetime
    total_questions: int
    questions: List[QuestionPublicResponse]
    saved_answers: Dict[int, Any] = Field(default_factory=dict)


class SaveAnswerRequest(BaseModel):
    question_id: int
    selected_answer: Optional[Union[str, List[str]]] = None
    time_spent_seconds: Optional[int] = 0


class SubmitQuizRequest(BaseModel):
    answers: Optional[List[SaveAnswerRequest]] = None


class AnswerReviewItem(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    difficulty: str
    topic_id: int
    topic_title: str
    options: Optional[List[QuestionOption]] = None
    selected_answer: Optional[Union[str, List[str]]] = None
    correct_answer: Union[str, List[str]]
    is_correct: bool
    obtained_marks: float
    marks: float
    negative_marks: float
    explanation: Optional[str] = None
    mistake_category: Optional[str] = None


class TopicBreakdownItem(BaseModel):
    topic_id: int
    topic_title: str
    total_questions: int
    correct_count: int
    incorrect_count: int
    accuracy_percentage: float
    obtained_marks: float
    total_marks: float


class DifficultyBreakdownItem(BaseModel):
    difficulty: str
    total_questions: int
    correct_count: int
    accuracy_percentage: float


class QuizResultResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    quiz_title: str
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    time_spent_seconds: int
    total_questions: int
    attempted_questions: int
    correct_answers: int
    incorrect_answers: int
    unanswered_questions: int
    total_marks: float
    obtained_marks: float
    accuracy_percentage: float
    is_passed: bool
    passing_percentage: float
    topic_breakdown: List[TopicBreakdownItem] = Field(default_factory=list)
    difficulty_breakdown: List[DifficultyBreakdownItem] = Field(default_factory=list)
    mistakes: List[AnswerReviewItem] = Field(default_factory=list)
    answers: List[AnswerReviewItem] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class QuizAttemptSummaryResponse(BaseModel):
    id: int
    quiz_id: int
    quiz_title: str
    subject_name: str
    subject_color: Optional[str] = None
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    time_spent_seconds: int
    total_questions: int
    obtained_marks: float
    total_marks: float
    accuracy_percentage: float
    is_passed: bool

    model_config = ConfigDict(from_attributes=True)


# --- Weak Topics & Topic Performance ---

class TopicPerformanceResponse(BaseModel):
    topic_id: int
    topic_title: str
    subject_id: int
    subject_name: str
    subject_color: Optional[str] = None
    attempts_count: int
    correct_count: int
    incorrect_count: int
    accuracy_percentage: float
    mastery_estimate: float
    classification: str  # Strong, Moderate, Needs Improvement, Weak, Insufficient Data
    confidence_level: str  # Low, Medium, High
    last_attempted_at: Optional[datetime] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WeakTopicItem(BaseModel):
    topic_id: int
    topic_title: str
    subject_id: int
    subject_name: str
    subject_color: Optional[str] = None
    accuracy_percentage: float
    mastery_estimate: float
    attempts_count: int
    classification: str
    confidence_level: str
    reason: str
    recommended_action: str
    prerequisite_warnings: List[str] = Field(default_factory=list)


# --- Mistake Analysis Schemas ---

class MistakeAnalysisItem(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    topic_id: int
    topic_title: str
    subject_name: str
    selected_answer: Optional[Union[str, List[str]]] = None
    correct_answer: Union[str, List[str]]
    explanation: Optional[str] = None
    mistake_category: str
    is_repeated: bool
    attempt_id: int
    attempted_at: datetime
    suggested_action: str


# --- Recommendations Schemas ---

class RecommendationItem(BaseModel):
    id: str
    type: str  # revise_weak_topic, practice_prerequisite, retry_mistakes, increase_difficulty
    topic_id: Optional[int] = None
    topic_title: Optional[str] = None
    subject_name: Optional[str] = None
    priority: str  # high, medium, low
    title: str
    description: str
    action_type: str  # schedule_session, start_practice, review_mistakes
    action_payload: Optional[Dict[str, Any]] = None


# --- Topic Prerequisite Schemas ---

class PrerequisiteCreateInput(BaseModel):
    prerequisite_topic_id: int
    relationship_type: Optional[str] = "prerequisite"  # prerequisite, recommended_prior


class PrerequisiteResponse(BaseModel):
    id: int
    topic_id: int
    topic_title: str
    prerequisite_topic_id: int
    prerequisite_topic_title: str
    relationship_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TopicDependenciesResponse(BaseModel):
    topic_id: int
    topic_title: str
    prerequisites: List[PrerequisiteResponse] = Field(default_factory=list)
    dependents: List[PrerequisiteResponse] = Field(default_factory=list)


# --- Adaptive Practice Schemas ---

class AdaptiveQuestionResponse(BaseModel):
    question: QuestionPublicResponse
    topic_id: int
    topic_title: str
    subject_id: int
    subject_name: str
    difficulty: str
    current_topic_mastery: float
    reason: str

