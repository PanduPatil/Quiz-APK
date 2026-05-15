"""Seed admin, sample student, and a sample quiz with 20 questions."""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env", encoding="utf-8-sig")

from auth import hash_password  # noqa

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

ADMIN_EMAIL = "admin@quizapk.com"
ADMIN_PASSWORD = "Admin@123"
STUDENT_EMAIL = "student@quizapk.com"
STUDENT_PASSWORD = "Student@123"


SAMPLE_QUESTIONS = [
    # Python (easy)
    {"text": "Which keyword is used to define a function in Python?", "options": ["func", "def", "function", "define"], "correct_index": 1, "difficulty": "easy", "topic": "Python"},
    {"text": "What is the output of len('hello')?", "options": ["4", "5", "6", "Error"], "correct_index": 1, "difficulty": "easy", "topic": "Python"},
    {"text": "Which of these is a mutable data type?", "options": ["tuple", "str", "list", "int"], "correct_index": 2, "difficulty": "easy", "topic": "Python"},
    # Python (medium)
    {"text": "What does list comprehension [x*2 for x in range(3)] produce?", "options": ["[0,1,2]", "[0,2,4]", "[2,4,6]", "[1,2,3]"], "correct_index": 1, "difficulty": "medium", "topic": "Python"},
    {"text": "Which method removes & returns the last element of a list?", "options": ["remove()", "pop()", "del", "discard()"], "correct_index": 1, "difficulty": "medium", "topic": "Python"},
    {"text": "What is the time complexity of dict lookup in Python?", "options": ["O(n)", "O(log n)", "O(1) avg", "O(n^2)"], "correct_index": 2, "difficulty": "medium", "topic": "Python"},
    # Python (hard)
    {"text": "What does the GIL in CPython primarily affect?", "options": ["Memory allocation", "CPU-bound thread parallelism", "I/O performance", "Garbage collection"], "correct_index": 1, "difficulty": "hard", "topic": "Python"},
    {"text": "Which decorator makes a method callable on the class itself?", "options": ["@staticmethod", "@classmethod", "@property", "@abstractmethod"], "correct_index": 1, "difficulty": "hard", "topic": "Python"},
    # JavaScript
    {"text": "Which keyword declares a block-scoped variable in JS?", "options": ["var", "let", "dim", "val"], "correct_index": 1, "difficulty": "easy", "topic": "JavaScript"},
    {"text": "typeof null returns?", "options": ["'null'", "'undefined'", "'object'", "'number'"], "correct_index": 2, "difficulty": "easy", "topic": "JavaScript"},
    {"text": "Which method creates a new array with transformed elements?", "options": ["forEach", "map", "filter", "reduce"], "correct_index": 1, "difficulty": "medium", "topic": "JavaScript"},
    {"text": "What does Promise.all reject with?", "options": ["Array of errors", "First rejection", "Last rejection", "Nothing"], "correct_index": 1, "difficulty": "medium", "topic": "JavaScript"},
    {"text": "Which hook persists a value across re-renders without triggering re-render?", "options": ["useState", "useEffect", "useRef", "useMemo"], "correct_index": 2, "difficulty": "hard", "topic": "JavaScript"},
    {"text": "What is the output of: [1,2,3].reduce((a,b)=>a+b, 10)?", "options": ["6", "16", "10", "NaN"], "correct_index": 1, "difficulty": "hard", "topic": "JavaScript"},
    # Aptitude
    {"text": "If 5 pens cost INR 100, what do 8 pens cost?", "options": ["INR 120", "INR 140", "INR 160", "INR 180"], "correct_index": 2, "difficulty": "easy", "topic": "Aptitude"},
    {"text": "What comes next: 2, 4, 8, 16, ?", "options": ["20", "24", "32", "64"], "correct_index": 2, "difficulty": "easy", "topic": "Aptitude"},
    {"text": "Average of first 5 prime numbers?", "options": ["5.6", "4.8", "5.0", "6.2"], "correct_index": 0, "difficulty": "medium", "topic": "Aptitude"},
    {"text": "A train 100m long passes a pole in 10s. Its speed?", "options": ["10 m/s", "36 km/h", "Both A & B", "None"], "correct_index": 2, "difficulty": "medium", "topic": "Aptitude"},
    {"text": "If A:B = 2:3 and B:C = 4:5, then A:B:C = ?", "options": ["8:12:15", "2:3:5", "2:4:5", "4:6:15"], "correct_index": 0, "difficulty": "hard", "topic": "Aptitude"},
    {"text": "Compound interest on INR 10,000 at 10% for 2 years?", "options": ["INR 2000", "INR 2100", "INR 2200", "INR 2500"], "correct_index": 1, "difficulty": "hard", "topic": "Aptitude"},
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.quizzes.create_index("id", unique=True)
    await db.questions.create_index("id", unique=True)
    await db.questions.create_index([("quiz_id", 1), ("difficulty", 1)])
    await db.attempts.create_index("id", unique=True)
    await db.attempts.create_index([("user_id", 1), ("quiz_id", 1)])
    await db.violations.create_index("attempt_id")

    now = datetime.now(timezone.utc).isoformat()

    # Admin
    admin = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
    if not admin:
        admin_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": admin_id,
            "name": "Platform Admin",
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "trust_score": 100.0,
            "is_flagged": False,
            "is_blocked": False,
            "created_at": now,
        })
        print(f"[seed] Admin created: {ADMIN_EMAIL}")
    else:
        admin_id = admin["id"]
        print(f"[seed] Admin exists: {ADMIN_EMAIL}")

    # Student
    student = await db.users.find_one({"email": STUDENT_EMAIL}, {"_id": 0})
    if not student:
        student_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": student_id,
            "name": "Sample Student",
            "email": STUDENT_EMAIL,
            "password_hash": hash_password(STUDENT_PASSWORD),
            "role": "student",
            "trust_score": 100.0,
            "is_flagged": False,
            "is_blocked": False,
            "created_at": now,
        })
        print(f"[seed] Student created: {STUDENT_EMAIL}")
    else:
        student_id = student["id"]
        print(f"[seed] Student exists")

    # Sample Quiz
    quiz = await db.quizzes.find_one({"title": "Full-Stack Aptitude Assessment"}, {"_id": 0})
    if not quiz:
        quiz_id = str(uuid.uuid4())
        await db.quizzes.insert_one({
            "id": quiz_id,
            "title": "Full-Stack Aptitude Assessment",
            "description": "A 10-question adaptive exam covering Python, JavaScript and Quantitative Aptitude. Difficulty adjusts to your skill level in real-time.",
            "duration_minutes": 20,
            "total_questions": 10,
            "topics": ["Python", "JavaScript", "Aptitude"],
            "adaptive": True,
            "max_violations": 3,
            "created_by": admin_id,
            "created_at": now,
            "is_active": True,
            "assigned_to": [student_id],
        })
        # Seed questions
        for q in SAMPLE_QUESTIONS:
            await db.questions.insert_one({
                "id": str(uuid.uuid4()),
                "quiz_id": quiz_id,
                "text": q["text"],
                "options": q["options"],
                "correct_index": q["correct_index"],
                "difficulty": q["difficulty"],
                "topic": q["topic"],
                "explanation": "",
                "created_at": now,
            })
        print(f"[seed] Quiz + {len(SAMPLE_QUESTIONS)} questions created")
    else:
        print(f"[seed] Quiz already exists")

    client.close()
    print("[seed] Done.")


if __name__ == "__main__":
    asyncio.run(main())
