from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- USERS ----------
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    role: Literal["admin", "student"]
    trust_score: float = 100.0
    is_flagged: bool = False
    is_blocked: bool = False
    created_at: str


class TokenResponse(BaseModel):
    token: str
    user: UserOut


# ---------- QUESTIONS ----------
class QuestionIn(BaseModel):
    text: str
    options: List[str] = []
    correct_index: int = -1
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    topic: str = "General"
    explanation: Optional[str] = ""
    question_type: Literal["mcq", "coding", "composite"] = "mcq"
    language: Optional[str] = ""
    starter_code: Optional[str] = ""
    sample_input: Optional[str] = ""
    sample_output: Optional[str] = ""
    test_cases: List[str] = []


class Question(QuestionIn):
    id: str = Field(default_factory=_uuid)
    quiz_id: str
    created_at: str = Field(default_factory=_now_iso)
    source: Literal["manual", "ai"] = "manual"
    is_approved: bool = True


class QuestionPublic(BaseModel):
    """Question shape sent to student - hides correct_index."""
    id: str
    text: str
    options: List[str]
    difficulty: str
    topic: str
    question_type: str = "mcq"
    language: Optional[str] = ""
    starter_code: Optional[str] = ""
    sample_input: Optional[str] = ""
    sample_output: Optional[str] = ""


# ---------- QUIZZES ----------
class QuizIn(BaseModel):
    title: str
    description: str = ""
    duration_minutes: int = 30
    total_questions: int = 10
    topics: List[str] = []
    generation_instructions: str = ""
    question_type: Literal["mcq", "coding", "composite"] = "mcq"
    allowed_languages: List[str] = ["python", "javascript", "java", "csharp"]
    adaptive: bool = True
    max_violations: int = 3


class Quiz(QuizIn):
    id: str = Field(default_factory=_uuid)
    created_by: str
    created_at: str = Field(default_factory=_now_iso)
    is_active: bool = True
    assigned_to: List[str] = []  # list of user ids


# ---------- ATTEMPTS ----------
class AttemptStart(BaseModel):
    quiz_id: str


class AnswerSubmit(BaseModel):
    attempt_id: str
    question_id: str
    selected_index: int = -1
    code_answer: Optional[str] = ""
    language: Optional[str] = ""
    time_taken_seconds: float


class ViolationLog(BaseModel):
    attempt_id: str
    type: str  # tab_switch, focus_loss, copy_attempt, paste_attempt, right_click, fullscreen_exit, no_face, multi_face, rapid_answer
    severity: Literal["low", "medium", "high"] = "medium"
    details: Optional[str] = ""


class AttemptAnswer(BaseModel):
    question_id: str
    selected_index: int
    correct_index: int
    is_correct: bool
    difficulty: str
    topic: str
    question_type: str = "mcq"
    code_answer: Optional[str] = ""
    language: Optional[str] = ""
    time_taken_seconds: float
    answered_at: str = Field(default_factory=_now_iso)


class Attempt(BaseModel):
    id: str = Field(default_factory=_uuid)
    quiz_id: str
    user_id: str
    status: Literal["in_progress", "completed", "auto_submitted"] = "in_progress"
    started_at: str = Field(default_factory=_now_iso)
    finished_at: Optional[str] = None
    answers: List[AttemptAnswer] = []
    current_difficulty: str = "medium"
    score: float = 0.0
    total: int = 0
    correct: int = 0
    trust_score: float = 100.0
    violations_count: int = 0
    seen_question_ids: List[str] = []


class AIGenerateIn(BaseModel):
    quiz_id: str
    topic: str = ""
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    count: int = 5
    details: str = ""
    question_type: Literal["mcq", "coding", "composite"] = "mcq"
    model: str = "gemini/gemini-1.5-flash"
    language: str = "python"
