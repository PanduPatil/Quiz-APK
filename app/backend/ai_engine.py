"""Adaptive quiz AI + local Hugging Face question generator."""
import asyncio
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv

try:
    from transformers import pipeline
except ImportError:
    pipeline = None

load_dotenv(Path(__file__).parent / ".env", encoding="utf-8-sig")
_GENERATOR = None
_GENERATOR_MODEL = None


def next_difficulty(current: str, was_correct: bool, time_taken: float, avg_time: float = 30.0) -> str:
    """Rule-based adaptive difficulty engine."""
    order = ["easy", "medium", "hard"]
    idx = order.index(current) if current in order else 1
    if was_correct:
        idx = min(idx + 1, 2)
    else:
        idx = max(idx - 1, 0)
    return order[idx]


def compute_trust_score(
    violations: List[Dict],
    answers: List[Dict],
    total_questions: int,
) -> float:
    """Compute trust score 0-100 based on violations + behaviour."""
    score = 100.0
    penalties = {
        "tab_switch": 8,
        "focus_loss": 5,
        "copy_attempt": 6,
        "paste_attempt": 10,
        "right_click": 2,
        "fullscreen_exit": 7,
        "no_face": 8,
        "multi_face": 15,
        "rapid_answer": 4,
        "devtools": 12,
        "screen_share_missing": 15,
        "screen_share_stopped": 15,
        "camera_dark": 6,
        "camera_blurry": 4,
    }
    for v in violations:
        score -= penalties.get(v.get("type", ""), 3)

    if answers:
        rapid = sum(1 for a in answers if a.get("time_taken_seconds", 0) < 3)
        if rapid / max(len(answers), 1) > 0.3:
            score -= 10

    return max(0.0, min(100.0, round(score, 1)))


def _extract_json(text: str) -> Optional[list]:
    """Extract a JSON array from LLM response."""
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "questions" in data:
            return data["questions"]
    except Exception:
        pass

    match = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return None
    return None


def _question_key(text: str) -> str:
    return re.sub(r"\W+", " ", text.lower()).strip()


async def generate_questions_via_ai(
    topic: str,
    difficulty: str,
    count: int,
    session_id: str,
    details: str = "",
    question_type: str = "mcq",
) -> List[Dict]:
    """Generate draft MCQs with a local Hugging Face text-generation model.

    Set HF_LOCAL_MODEL to a local model directory or a Hugging Face model id
    that is already cached on the deployment host. A small starting point is
    Qwen/Qwen3-0.6B; larger Qwen or Mistral instruct models will produce better
    questions when the server has enough RAM/VRAM.
    """
    model_name = os.environ.get("HF_LOCAL_MODEL", "Qwen/Qwen3-0.6B")
    max_new_tokens = int(os.environ.get("HF_MAX_NEW_TOKENS", "1600"))
    topic_text = topic.strip() or "the quiz details supplied by the admin"
    details_text = details.strip() or "No extra admin details were provided."

    prompt = f"""You are an expert school and college exam question setter.
Create exactly {count} {question_type.upper()} questions.

Admin quiz details:
{details_text}

Topic/focus: {topic_text}
Difficulty: {difficulty}

Rules:
- Use only information implied by the admin details and topic.
- Return only a strict JSON array. No markdown. No prose.
- Each item must have exactly these keys: "text", "options", "correct_index", "explanation".
- "options" must contain exactly 4 distinct answer choices.
- "correct_index" must be an integer from 0 to 3.
- Explanations must be short and suitable for admin review.

JSON example:
[{{"text":"Question text","options":["A","B","C","D"],"correct_index":0,"explanation":"Why A is correct."}}]
"""

    def _fallback_questions(start_index: int = 0, needed: Optional[int] = None) -> List[Dict]:
        base = topic_text if topic_text else "the provided lesson"
        detail_hint = details_text.splitlines()[0][:120] if details_text else base
        target = count if needed is None else needed
        templates = [
            (
                "Which option best explains the central idea of {base} from the admin details?",
                [
                    "It correctly applies the main concept in the given context",
                    "It repeats a related term without explaining the concept",
                    "It describes a different topic not covered by the details",
                    "It makes a broad claim that is not always true",
                ],
                "This checks whether the learner understands the main concept, not just a keyword.",
            ),
            (
                "Which example would be the most appropriate application of {base}?",
                [
                    "An example that follows the rule or process described",
                    "An example that ignores an important condition",
                    "An example from a different subject area",
                    "An example that uses the right words but wrong reasoning",
                ],
                "The correct option applies the concept in a valid situation.",
            ),
            (
                "What is the most likely mistake a student might make while learning {base}?",
                [
                    "Confusing the core idea with a similar but different concept",
                    "Reading the full question before answering",
                    "Using evidence from the provided details",
                    "Checking whether all options are distinct",
                ],
                "The question targets a common misconception for admin review.",
            ),
            (
                "Which statement should be treated as true for {base}?",
                [
                    "The statement that matches the supplied learning details",
                    "The statement that sounds technical but contradicts the details",
                    "The statement that introduces unsupported information",
                    "The statement that is too vague to verify",
                ],
                "The correct statement is grounded in the admin-provided material.",
            ),
            (
                "Which question would best test understanding of {base}?",
                [
                    "A question that asks the learner to apply the concept",
                    "A question based only on memorizing the title",
                    "A question unrelated to the topic",
                    "A question with no clearly correct answer",
                ],
                "Application-based questions are stronger indicators of understanding.",
            ),
            (
                "Which answer best connects {base} with the quiz details: {hint}?",
                [
                    "It directly connects the topic to the stated lesson details",
                    "It ignores the lesson details and gives a generic answer",
                    "It changes the topic while sounding relevant",
                    "It states an absolute rule without support",
                ],
                "The correct option is the one most aligned with the admin details.",
            ),
        ]
        items = []
        for offset in range(target):
            idx = start_index + offset
            text_template, raw_options, explanation = templates[idx % len(templates)]
            correct_index = idx % 4
            correct = raw_options[0]
            distractors = raw_options[1:]
            options = distractors[:]
            options.insert(correct_index, correct)
            items.append({
                "text": text_template.format(base=base, hint=detail_hint),
                "options": options,
                "correct_index": correct_index,
                "difficulty": difficulty,
                "topic": topic_text,
                "explanation": f"{explanation} Generated as a draft; please edit before approval.",
                "question_type": "mcq",
            })
        return items

    if pipeline is None:
        print("HF AI gen fallback: transformers is not installed")
        return _fallback_questions()

    def _run_generation() -> str:
        global _GENERATOR, _GENERATOR_MODEL
        if _GENERATOR is None or _GENERATOR_MODEL != model_name:
            _GENERATOR = pipeline(
                "text-generation",
                model=model_name,
                tokenizer=model_name,
                device_map=os.environ.get("HF_DEVICE_MAP", "auto"),
                trust_remote_code=os.environ.get("HF_TRUST_REMOTE_CODE", "false").lower() == "true",
            )
            _GENERATOR_MODEL = model_name
        output = _GENERATOR(
            prompt,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=float(os.environ.get("HF_TEMPERATURE", "0.4")),
            top_p=float(os.environ.get("HF_TOP_P", "0.9")),
            return_full_text=False,
        )
        if isinstance(output, list) and output:
            return output[0].get("generated_text", "")
        return str(output)

    try:
        response = await asyncio.to_thread(_run_generation)
    except Exception as e:
        print(f"HF AI gen error: {e}")
        return _fallback_questions()

    data = _extract_json(response if isinstance(response, str) else str(response))
    if not data:
        return _fallback_questions()

    valid = []
    seen_questions = set()
    for q in data:
        try:
            options = [str(o).strip() for o in q.get("options", [])]
            text = q["text"].strip()
            key = _question_key(text)
            if (
                isinstance(q.get("text"), str)
                and key
                and key not in seen_questions
                and len(options) == 4
                and len(set(options)) == 4
                and isinstance(q.get("correct_index"), int)
                and 0 <= q["correct_index"] <= 3
            ):
                seen_questions.add(key)
                valid.append(
                    {
                        "text": text,
                        "options": options,
                        "correct_index": int(q["correct_index"]),
                        "difficulty": difficulty,
                        "topic": topic_text,
                        "explanation": str(q.get("explanation", "")).strip(),
                        "question_type": "mcq",
                    }
                )
        except Exception:
            continue

    if len(valid) < count:
        for item in _fallback_questions(start_index=len(valid), needed=count - len(valid)):
            key = _question_key(item["text"])
            if key not in seen_questions:
                seen_questions.add(key)
                valid.append(item)
            if len(valid) >= count:
                break
    return valid[:count]
