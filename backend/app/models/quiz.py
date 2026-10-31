from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=15)
    difficulty = Column(String(20), nullable=False, default="medium")  # easy, medium, hard
    passing_percentage = Column(Float, nullable=False, default=60.0)
    status = Column(String(20), nullable=False, default="published")  # draft, published
    feedback_mode = Column(String(30), nullable=False, default="post_submission")  # post_submission, instant
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    subject = relationship("Subject", back_populates="quizzes")
    quiz_topics = relationship("QuizTopic", back_populates="quiz", cascade="all, delete-orphan")
    quiz_questions = relationship(
        "QuizQuestion",
        back_populates="quiz",
        order_by="QuizQuestion.question_order",
        cascade="all, delete-orphan",
    )
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizTopic(Base):
    __tablename__ = "quiz_topics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id = Column(
        Integer,
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (UniqueConstraint("quiz_id", "topic_id", name="uq_quiz_topic"),)

    quiz = relationship("Quiz", back_populates="quiz_topics")
    topic = relationship("Topic")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id = Column(
        Integer,
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_text = Column(Text, nullable=False)
    question_type = Column(
        String(30),
        nullable=False,
        default="single_choice",
    )  # single_choice, multiple_select, true_false, short_answer
    difficulty = Column(String(20), nullable=False, default="medium")  # easy, medium, hard
    options = Column(Text, nullable=True)  # JSON-encoded array of options: [{"id": "A", "text": "..."}]
    correct_answer = Column(Text, nullable=False)  # JSON or normalized string
    explanation = Column(Text, nullable=True)
    marks = Column(Float, nullable=False, default=1.0)
    negative_marks = Column(Float, nullable=False, default=0.0)
    source = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    subject = relationship("Subject", back_populates="questions")
    topic = relationship("Topic")
    quiz_questions = relationship("QuizQuestion", back_populates="question", cascade="all, delete-orphan")
    attempt_answers = relationship("AttemptAnswer", back_populates="question")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id = Column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_order = Column(Integer, nullable=False, default=1)

    __table_args__ = (UniqueConstraint("quiz_id", "question_id", name="uq_quiz_question"),)

    quiz = relationship("Quiz", back_populates="quiz_questions")
    question = relationship("Question", back_populates="quiz_questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(String(20), nullable=False, default="in_progress")  # in_progress, completed, abandoned
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    time_spent_seconds = Column(Integer, nullable=False, default=0)
    total_questions = Column(Integer, nullable=False, default=0)
    attempted_questions = Column(Integer, nullable=False, default=0)
    correct_answers = Column(Integer, nullable=False, default=0)
    incorrect_answers = Column(Integer, nullable=False, default=0)
    unanswered_questions = Column(Integer, nullable=False, default=0)
    total_marks = Column(Float, nullable=False, default=0.0)
    obtained_marks = Column(Float, nullable=False, default=0.0)
    accuracy_percentage = Column(Float, nullable=False, default=0.0)
    is_passed = Column(Boolean, nullable=False, default=False)

    quiz = relationship("Quiz", back_populates="attempts")
    answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    attempt_id = Column(
        Integer,
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id = Column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    selected_answer = Column(Text, nullable=True)  # JSON string e.g. "A" or ["A", "B"]
    is_correct = Column(Boolean, nullable=True)
    obtained_marks = Column(Float, nullable=False, default=0.0)
    time_spent_seconds = Column(Integer, nullable=False, default=0)
    mistake_category = Column(
        String(50),
        nullable=True,
    )  # conceptual, calculation, incorrect_selection, incomplete, time_pressure, repeated_mistake, unclassified

    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("Question", back_populates="attempt_answers")


class TopicPerformance(Base):
    __tablename__ = "topic_performances"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    topic_id = Column(
        Integer,
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    attempts_count = Column(Integer, nullable=False, default=0)
    correct_count = Column(Integer, nullable=False, default=0)
    incorrect_count = Column(Integer, nullable=False, default=0)
    accuracy_percentage = Column(Float, nullable=False, default=0.0)
    mastery_estimate = Column(Float, nullable=False, default=0.0)
    classification = Column(
        String(30),
        nullable=False,
        default="Insufficient Data",
    )  # Strong, Moderate, Needs Improvement, Weak, Insufficient Data
    confidence_level = Column(String(20), nullable=False, default="Low")  # Low, Medium, High
    last_attempted_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    topic = relationship("Topic")


class TopicPrerequisite(Base):
    __tablename__ = "topic_prerequisites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    topic_id = Column(
        Integer,
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prerequisite_topic_id = Column(
        Integer,
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relationship_type = Column(String(30), nullable=False, default="prerequisite")  # prerequisite, recommended_prior
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("topic_id", "prerequisite_topic_id", name="uq_topic_prerequisite"),
    )

    topic = relationship("Topic", foreign_keys=[topic_id])
    prerequisite_topic = relationship("Topic", foreign_keys=[prerequisite_topic_id])

