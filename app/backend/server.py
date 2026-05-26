from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

from models import (
    UserRegister, UserLogin, UserOut, TokenResponse,
    QuestionIn, Question, QuestionPublic,
    QuizIn, Quiz,
    AttemptStart, AnswerSubmit, ViolationLog, AttemptAnswer, Attempt,
    AIGenerateIn,
)
from auth import hash_password, verify_password, create_token, decode_token
from ai_engine import HF_MODEL_OPTIONS, next_difficulty, compute_trust_score, generate_questions_via_ai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", encoding="utf-8-sig")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AI Quiz Portal")
api = APIRouter(prefix="/api")
security = HTTPBearer()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------- AUTH ----------
async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(creds.credentials)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    if user.get("is_blocked"):
        raise HTTPException(403, "User is blocked")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user


@api.get("/")
async def root():
    return {"message": "AI Quiz Portal API", "status": "ok"}


@api.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email already registered")
    import uuid
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": "student",
        "trust_score": 100.0,
        "is_flagged": False,
        "is_blocked": False,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_token(user_id, "student")
    user_out = {k: v for k, v in doc.items() if k != "password_hash"}
    return {"token": token, "user": user_out}


@api.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    if user.get("is_blocked"):
        raise HTTPException(403, "Account blocked")
    token = create_token(user["id"], user["role"])
    user_out = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "user": user_out}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- QUIZZES ----------
@api.post("/quizzes", response_model=Quiz)
async def create_quiz(data: QuizIn, admin: dict = Depends(require_admin)):
    quiz = Quiz(**data.model_dump(), created_by=admin["id"])
    await db.quizzes.insert_one(quiz.model_dump())
    return quiz


@api.get("/quizzes")
async def list_quizzes(user: dict = Depends(get_current_user)):
    """Admin sees all; student sees assigned active quizzes."""
    if user["role"] == "admin":
        items = await db.quizzes.find({}, {"_id": 0}).to_list(500)
    else:
        items = await db.quizzes.find(
            {"assigned_to": user["id"], "is_active": True}, {"_id": 0}
        ).to_list(200)
    # Attach counts
    for q in items:
        q["question_count"] = await db.questions.count_documents({"quiz_id": q["id"]})
        q["approved_question_count"] = await db.questions.count_documents({"quiz_id": q["id"], "is_approved": {"$ne": False}})
        q["pending_question_count"] = await db.questions.count_documents({"quiz_id": q["id"], "is_approved": False})
    return items


@api.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, user: dict = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    quiz["question_count"] = await db.questions.count_documents({"quiz_id": quiz_id})
    quiz["approved_question_count"] = await db.questions.count_documents({"quiz_id": quiz_id, "is_approved": {"$ne": False}})
    quiz["pending_question_count"] = await db.questions.count_documents({"quiz_id": quiz_id, "is_approved": False})
    return quiz


@api.put("/quizzes/{quiz_id}", response_model=Quiz)
async def update_quiz(quiz_id: str, data: QuizIn, admin: dict = Depends(require_admin)):
    await db.quizzes.update_one({"id": quiz_id}, {"$set": data.model_dump()})
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    return quiz


@api.delete("/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, admin: dict = Depends(require_admin)):
    await db.quizzes.delete_one({"id": quiz_id})
    await db.questions.delete_many({"quiz_id": quiz_id})
    return {"ok": True}


@api.post("/quizzes/{quiz_id}/assign")
async def assign_quiz(quiz_id: str, payload: dict, admin: dict = Depends(require_admin)):
    user_ids = payload.get("user_ids", [])
    await db.quizzes.update_one(
        {"id": quiz_id}, {"$set": {"assigned_to": user_ids}}
    )
    return {"ok": True, "assigned": user_ids}


# ---------- QUESTIONS ----------
@api.post("/quizzes/{quiz_id}/questions", response_model=Question)
async def add_question(quiz_id: str, data: QuestionIn, admin: dict = Depends(require_admin)):
    q = Question(**data.model_dump(), quiz_id=quiz_id, source="manual", is_approved=True)
    await db.questions.insert_one(q.model_dump())
    return q


@api.post("/quizzes/{quiz_id}/questions/bulk")
async def bulk_add_questions(quiz_id: str, payload: dict, admin: dict = Depends(require_admin)):
    items = payload.get("questions", [])
    inserted = 0
    for item in items:
        try:
            qin = QuestionIn(**item)
            q = Question(**qin.model_dump(), quiz_id=quiz_id, source="manual", is_approved=True)
            await db.questions.insert_one(q.model_dump())
            inserted += 1
        except Exception:
            continue
    return {"inserted": inserted}


@api.get("/quizzes/{quiz_id}/questions")
async def list_questions(quiz_id: str, admin: dict = Depends(require_admin)):
    items = await db.questions.find({"quiz_id": quiz_id}, {"_id": 0}).to_list(1000)
    return items


@api.delete("/questions/{qid}")
async def delete_question(qid: str, admin: dict = Depends(require_admin)):
    await db.questions.delete_one({"id": qid})
    return {"ok": True}


@api.get("/questions/ai-models")
async def ai_models(admin: dict = Depends(require_admin)):
    return HF_MODEL_OPTIONS


@api.post("/questions/ai-generate")
async def ai_generate(data: AIGenerateIn, admin: dict = Depends(require_admin)):
    quiz = await db.quizzes.find_one({"id": data.quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    details = "\n".join(
        part for part in [
            quiz.get("title", ""),
            quiz.get("description", ""),
            "Topics: " + ", ".join(quiz.get("topics", [])) if quiz.get("topics") else "",
            quiz.get("generation_instructions", ""),
            data.details,
        ] if part
    )
    generated = await generate_questions_via_ai(
        topic=data.topic or ", ".join(quiz.get("topics", [])),
        difficulty=data.difficulty,
        count=data.count,
        session_id=f"gen-{admin['id']}-{data.quiz_id}",
        details=details,
        question_type=data.question_type,
        model=data.model,
        language=data.language,
    )
    inserted = 0
    created = []
    for item in generated:
        try:
            qin = QuestionIn(**item)
            q = Question(**qin.model_dump(), quiz_id=data.quiz_id, source="ai", is_approved=False)
            await db.questions.insert_one(q.model_dump())
            created.append(q.model_dump())
            inserted += 1
        except Exception:
            continue
    return {"inserted": inserted, "questions": created, "approval_required": True}


@api.post("/questions/{qid}/approve")
async def approve_question(qid: str, payload: dict, admin: dict = Depends(require_admin)):
    approved = bool(payload.get("approved", True))
    await db.questions.update_one({"id": qid}, {"$set": {"is_approved": approved}})
    return {"ok": True, "approved": approved}


# ---------- ATTEMPTS (Student) ----------
@api.post("/attempts/start")
async def start_attempt(data: AttemptStart, user: dict = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": data.quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    if user["id"] not in quiz.get("assigned_to", []) and user["role"] != "admin":
        raise HTTPException(403, "Quiz not assigned to you")

    # Reuse in-progress attempt if any
    existing = await db.attempts.find_one(
        {"quiz_id": data.quiz_id, "user_id": user["id"], "status": "in_progress"},
        {"_id": 0},
    )
    if existing:
        return existing

    attempt = Attempt(quiz_id=data.quiz_id, user_id=user["id"])
    await db.attempts.insert_one(attempt.model_dump())
    return attempt.model_dump()


@api.get("/attempts/{attempt_id}/next")
async def next_question(attempt_id: str, user: dict = Depends(get_current_user)):
    attempt = await db.attempts.find_one({"id": attempt_id}, {"_id": 0})
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    if attempt["user_id"] != user["id"]:
        raise HTTPException(403, "Not your attempt")
    if attempt["status"] != "in_progress":
        raise HTTPException(400, "Attempt not in progress")

    quiz = await db.quizzes.find_one({"id": attempt["quiz_id"]}, {"_id": 0})
    answered = len(attempt.get("answers", []))
    total = quiz["total_questions"]

    if answered >= total:
        return {"done": True, "message": "All questions completed"}

    difficulty = attempt.get("current_difficulty", "medium")
    seen = attempt.get("seen_question_ids", [])

    # Pick question: preferred difficulty first, else fallback
    q = await db.questions.find_one(
        {
            "quiz_id": attempt["quiz_id"],
            "difficulty": difficulty,
            "is_approved": {"$ne": False},
            "id": {"$nin": seen},
        },
        {"_id": 0},
    )
    if not q:
        # fallback to any unseen
        q = await db.questions.find_one(
            {"quiz_id": attempt["quiz_id"], "is_approved": {"$ne": False}, "id": {"$nin": seen}},
            {"_id": 0},
        )
    if not q:
        return {"done": True, "message": "No more questions"}

    public = {
        "id": q["id"],
        "text": q["text"],
        "options": q["options"],
        "difficulty": q["difficulty"],
        "topic": q["topic"],
        "question_type": q.get("question_type", "mcq"),
        "language": q.get("language", ""),
        "starter_code": q.get("starter_code", ""),
        "sample_input": q.get("sample_input", ""),
        "sample_output": q.get("sample_output", ""),
        "question_number": answered + 1,
        "total": total,
    }
    return {"done": False, "question": public}


@api.post("/attempts/answer")
async def submit_answer(data: AnswerSubmit, user: dict = Depends(get_current_user)):
    attempt = await db.attempts.find_one({"id": data.attempt_id}, {"_id": 0})
    if not attempt or attempt["user_id"] != user["id"]:
        raise HTTPException(404, "Attempt not found")
    if attempt["status"] != "in_progress":
        raise HTTPException(400, "Attempt not in progress")

    q = await db.questions.find_one({"id": data.question_id}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Question not found")

    is_correct = data.selected_index == q.get("correct_index", -1) if q.get("question_type", "mcq") != "coding" else False
    new_diff = next_difficulty(q["difficulty"], is_correct, data.time_taken_seconds)

    answer = {
        "question_id": q["id"],
        "selected_index": data.selected_index,
        "correct_index": q["correct_index"],
        "is_correct": is_correct,
        "difficulty": q["difficulty"],
        "topic": q["topic"],
        "question_type": q.get("question_type", "mcq"),
        "code_answer": data.code_answer or "",
        "language": data.language or q.get("language", ""),
        "time_taken_seconds": data.time_taken_seconds,
        "answered_at": now_iso(),
    }

    await db.attempts.update_one(
        {"id": data.attempt_id},
        {
            "$push": {"answers": answer, "seen_question_ids": q["id"]},
            "$set": {"current_difficulty": new_diff},
            "$inc": {"correct": 1 if is_correct else 0, "total": 1},
        },
    )

    # Check rapid answer violation
    if data.time_taken_seconds < 2.0:
        await db.violations.insert_one({
            "attempt_id": data.attempt_id,
            "type": "rapid_answer",
            "severity": "low",
            "details": f"Answered in {data.time_taken_seconds:.1f}s",
            "created_at": now_iso(),
        })

    return {"ok": True, "next_difficulty": new_diff}


@api.post("/attempts/violation")
async def log_violation(data: ViolationLog, user: dict = Depends(get_current_user)):
    attempt = await db.attempts.find_one({"id": data.attempt_id}, {"_id": 0})
    if not attempt or attempt["user_id"] != user["id"]:
        raise HTTPException(404, "Attempt not found")

    doc = {
        "attempt_id": data.attempt_id,
        "user_id": user["id"],
        "quiz_id": attempt["quiz_id"],
        "type": data.type,
        "severity": data.severity,
        "details": data.details,
        "created_at": now_iso(),
    }
    await db.violations.insert_one(doc)
    await db.attempts.update_one(
        {"id": data.attempt_id}, {"$inc": {"violations_count": 1}}
    )

    # Recompute trust score live
    violations = await db.violations.find(
        {"attempt_id": data.attempt_id}, {"_id": 0}
    ).to_list(1000)
    attempt_fresh = await db.attempts.find_one({"id": data.attempt_id}, {"_id": 0})
    trust = compute_trust_score(
        violations, attempt_fresh.get("answers", []), attempt_fresh.get("total", 0)
    )
    await db.attempts.update_one(
        {"id": data.attempt_id}, {"$set": {"trust_score": trust}}
    )

    # Auto-submit if high-severity violations pile up
    quiz = await db.quizzes.find_one({"id": attempt["quiz_id"]}, {"_id": 0})
    if attempt_fresh["violations_count"] + 1 >= quiz.get("max_violations", 3):
        await _finalize_attempt(data.attempt_id, status="auto_submitted")
        return {"ok": True, "trust_score": trust, "auto_submitted": True}

    return {"ok": True, "trust_score": trust, "auto_submitted": False}


async def _finalize_attempt(attempt_id: str, status: str = "completed"):
    attempt = await db.attempts.find_one({"id": attempt_id}, {"_id": 0})
    if not attempt:
        return
    answers = attempt.get("answers", [])
    correct = sum(1 for a in answers if a.get("is_correct"))
    total = len(answers)
    score = (correct / total * 100) if total > 0 else 0

    violations = await db.violations.find(
        {"attempt_id": attempt_id}, {"_id": 0}
    ).to_list(1000)
    trust = compute_trust_score(violations, answers, total)

    await db.attempts.update_one(
        {"id": attempt_id},
        {
            "$set": {
                "status": status,
                "finished_at": now_iso(),
                "score": round(score, 2),
                "correct": correct,
                "total": total,
                "trust_score": trust,
            }
        },
    )
    # Update user trust score (rolling avg)
    user = await db.users.find_one({"id": attempt["user_id"]}, {"_id": 0})
    if user:
        new_trust = round((user.get("trust_score", 100) * 0.6 + trust * 0.4), 1)
        is_flagged = trust < 50 or user.get("is_flagged", False)
        await db.users.update_one(
            {"id": attempt["user_id"]},
            {"$set": {"trust_score": new_trust, "is_flagged": is_flagged}},
        )


@api.post("/attempts/{attempt_id}/submit")
async def submit_attempt(attempt_id: str, user: dict = Depends(get_current_user)):
    attempt = await db.attempts.find_one({"id": attempt_id}, {"_id": 0})
    if not attempt or attempt["user_id"] != user["id"]:
        raise HTTPException(404, "Attempt not found")
    await _finalize_attempt(attempt_id, status="completed")
    # Student only sees status
    return {"status": "completed", "message": "Your response has been recorded. Results are visible to the administrator."}


@api.get("/attempts/my")
async def my_attempts(user: dict = Depends(get_current_user)):
    """Student view: only status, no scores."""
    items = await db.attempts.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).to_list(200)
    # Enrich with quiz title
    result = []
    for a in items:
        quiz = await db.quizzes.find_one({"id": a["quiz_id"]}, {"_id": 0})
        result.append({
            "attempt_id": a["id"],
            "quiz_id": a["quiz_id"],
            "quiz_title": quiz["title"] if quiz else "Unknown",
            "status": a["status"],
            "started_at": a["started_at"],
            "finished_at": a.get("finished_at"),
        })
    return result


# ---------- ADMIN ANALYTICS ----------
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total_students = await db.users.count_documents({"role": "student"})
    total_quizzes = await db.quizzes.count_documents({})
    total_attempts = await db.attempts.count_documents({})
    completed = await db.attempts.count_documents({"status": {"$in": ["completed", "auto_submitted"]}})
    in_progress = await db.attempts.count_documents({"status": "in_progress"})
    flagged = await db.users.count_documents({"is_flagged": True})
    total_violations = await db.violations.count_documents({})

    # Score distribution buckets
    all_attempts = await db.attempts.find(
        {"status": {"$in": ["completed", "auto_submitted"]}}, {"_id": 0}
    ).to_list(5000)
    dist = {"0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0}
    for a in all_attempts:
        s = a.get("score", 0)
        if s < 20: dist["0-20"] += 1
        elif s < 40: dist["20-40"] += 1
        elif s < 60: dist["40-60"] += 1
        elif s < 80: dist["60-80"] += 1
        else: dist["80-100"] += 1

    # Topic-wise accuracy
    topic_stats = {}
    for a in all_attempts:
        for ans in a.get("answers", []):
            t = ans.get("topic", "Other")
            if t not in topic_stats:
                topic_stats[t] = {"topic": t, "correct": 0, "total": 0}
            topic_stats[t]["total"] += 1
            if ans.get("is_correct"):
                topic_stats[t]["correct"] += 1
    topic_list = [
        {**v, "accuracy": round((v["correct"] / v["total"] * 100) if v["total"] else 0, 1)}
        for v in topic_stats.values()
    ]

    # Violation breakdown
    violation_agg = {}
    vio_list = await db.violations.find({}, {"_id": 0}).to_list(5000)
    for v in vio_list:
        t = v.get("type", "other")
        violation_agg[t] = violation_agg.get(t, 0) + 1
    violations_breakdown = [{"type": k, "count": v} for k, v in violation_agg.items()]

    return {
        "total_students": total_students,
        "total_quizzes": total_quizzes,
        "total_attempts": total_attempts,
        "completed": completed,
        "in_progress": in_progress,
        "flagged_users": flagged,
        "total_violations": total_violations,
        "score_distribution": [{"bucket": k, "count": v} for k, v in dist.items()],
        "topic_performance": topic_list,
        "violations_breakdown": violations_breakdown,
    }


@api.get("/admin/live")
async def admin_live(admin: dict = Depends(require_admin)):
    """Live attempts in progress with user info and violations."""
    in_progress = await db.attempts.find(
        {"status": "in_progress"}, {"_id": 0}
    ).to_list(200)
    out = []
    for a in in_progress:
        u = await db.users.find_one({"id": a["user_id"]}, {"_id": 0, "password_hash": 0})
        q = await db.quizzes.find_one({"id": a["quiz_id"]}, {"_id": 0})
        recent_violations = await db.violations.find(
            {"attempt_id": a["id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(20)
        out.append({
            "attempt_id": a["id"],
            "user_name": u["name"] if u else "Unknown",
            "user_email": u["email"] if u else "",
            "quiz_title": q["title"] if q else "",
            "started_at": a["started_at"],
            "progress": f"{len(a.get('answers', []))}/{q.get('total_questions', 0) if q else 0}",
            "trust_score": a.get("trust_score", 100),
            "violations_count": a.get("violations_count", 0),
            "recent_violations": recent_violations[:5],
        })
    return out


@api.get("/admin/results")
async def admin_results(
    admin: dict = Depends(require_admin),
    quiz_id: Optional[str] = Query(None),
):
    q_filter = {"status": {"$in": ["completed", "auto_submitted"]}}
    if quiz_id:
        q_filter["quiz_id"] = quiz_id
    attempts = await db.attempts.find(q_filter, {"_id": 0}).to_list(2000)
    rows = []
    for a in attempts:
        u = await db.users.find_one({"id": a["user_id"]}, {"_id": 0, "password_hash": 0})
        quiz = await db.quizzes.find_one({"id": a["quiz_id"]}, {"_id": 0})
        rows.append({
            "attempt_id": a["id"],
            "user_name": u["name"] if u else "Unknown",
            "user_email": u["email"] if u else "",
            "quiz_title": quiz["title"] if quiz else "",
            "score": a.get("score", 0),
            "correct": a.get("correct", 0),
            "total": a.get("total", 0),
            "trust_score": a.get("trust_score", 100),
            "violations_count": a.get("violations_count", 0),
            "status": a["status"],
            "finished_at": a.get("finished_at"),
        })
    # Sort by score descending for ranking.
    rows.sort(key=lambda r: (-r["score"], -r["trust_score"]))
    for idx, r in enumerate(rows):
        r["rank"] = idx + 1
    return rows


@api.get("/admin/users")
async def admin_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users


@api.post("/admin/users/{user_id}/flag")
async def flag_user(user_id: str, payload: dict, admin: dict = Depends(require_admin)):
    is_flagged = bool(payload.get("flagged", True))
    await db.users.update_one({"id": user_id}, {"$set": {"is_flagged": is_flagged}})
    return {"ok": True, "flagged": is_flagged}


@api.post("/admin/users/{user_id}/block")
async def block_user(user_id: str, payload: dict, admin: dict = Depends(require_admin)):
    is_blocked = bool(payload.get("blocked", True))
    await db.users.update_one({"id": user_id}, {"$set": {"is_blocked": is_blocked}})
    return {"ok": True, "blocked": is_blocked}


@api.get("/admin/attempts/{attempt_id}")
async def admin_attempt_detail(attempt_id: str, admin: dict = Depends(require_admin)):
    a = await db.attempts.find_one({"id": attempt_id}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Not found")
    u = await db.users.find_one({"id": a["user_id"]}, {"_id": 0, "password_hash": 0})
    q = await db.quizzes.find_one({"id": a["quiz_id"]}, {"_id": 0})
    violations = await db.violations.find(
        {"attempt_id": attempt_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    return {
        "attempt": a,
        "user": u,
        "quiz": q,
        "violations": violations,
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
