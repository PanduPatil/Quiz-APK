"""Adaptive quiz AI + HuggingFace Inference API question generator with deduplication."""
import asyncio
import json
import os
import re
import hashlib
import httpx
from pathlib import Path
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta

from dotenv import load_dotenv

try:
    from transformers import pipeline
except ImportError:
    pipeline = None

load_dotenv(Path(__file__).parent / ".env", encoding="utf-8-sig")
_GENERATOR = None
_GENERATOR_MODEL = None
_QUESTION_CACHE: Dict[str, Set[str]] = {}  # Track generated question hashes by session
_CACHE_EXPIRY: Dict[str, datetime] = {}  # Expiry for cached sessions (12 hours)
_CACHE_TTL = timedelta(hours=12)

HF_MODEL_OPTIONS = [
    {
        "id": "gemini/gemini-1.5-flash",
        "label": "Google Gemini 1.5 Flash (Recommended - Free & Ultra Fast)",
        "best_for": "Outstanding speed, high quality, and robust structured assessments",
        "api": True,
    },
    {
        "id": "gemini/gemini-2.5-flash",
        "label": "Google Gemini 2.5 Flash (Advanced)",
        "best_for": "Advanced coding assessments and superior logical reasoning",
        "api": True,
    },
    {
        "id": "Qwen/Qwen2.5-7B-Instruct",
        "label": "Qwen 2.5 7B Instruct (HuggingFace Serverless)",
        "best_for": "Highly active open serverless model - Excellent multilingual/coding questions",
        "api": True,
    },
    {
        "id": "meta-llama/Meta-Llama-3-8B-Instruct",
        "label": "Llama 3 8B Instruct (HuggingFace Serverless)",
        "best_for": "Lightweight serverless model - Strong general instructions",
        "api": True,
    },
    {
        "id": "mistralai/Mistral-7B-Instruct-v0.3",
        "label": "Mistral 7B Instruct (HuggingFace Serverless)",
        "best_for": "Strong lightweight general instructions",
        "api": True,
    },
]


def _clean_cache(session_id: str):
    """Clean expired cache entries."""
    if session_id in _CACHE_EXPIRY:
        if datetime.now() > _CACHE_EXPIRY[session_id]:
            _QUESTION_CACHE.pop(session_id, None)
            _CACHE_EXPIRY.pop(session_id, None)


def _get_question_hash(question_dict: Dict) -> str:
    """Generate a hash for a question to detect duplicates."""
    key_parts = [
        question_dict.get("text", "").lower().strip(),
        question_dict.get("topic", "").lower().strip(),
        question_dict.get("difficulty", "").lower().strip(),
    ]
    if question_dict.get("question_type") == "mcq":
        key_parts.extend(sorted(str(o).lower().strip() for o in question_dict.get("options", [])))
    return hashlib.md5("|".join(key_parts).encode()).hexdigest()


def _is_duplicate(question_dict: Dict, session_id: str) -> bool:
    """Check if question has been generated in this session."""
    _clean_cache(session_id)
    if session_id not in _QUESTION_CACHE:
        _QUESTION_CACHE[session_id] = set()
        _CACHE_EXPIRY[session_id] = datetime.now() + _CACHE_TTL
    
    q_hash = _get_question_hash(question_dict)
    if q_hash in _QUESTION_CACHE[session_id]:
        return True
    _QUESTION_CACHE[session_id].add(q_hash)
    return False


async def _call_gemini_api(prompt: str, model: str = "gemini-1.5-flash", max_tokens: int = 2400) -> Optional[str]:
    """Call Google Gemini API directly using httpx."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Gemini API key is not configured.")
        return None
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": float(os.environ.get("HF_TEMPERATURE", "0.7")),
            "maxOutputTokens": max_tokens
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"]
            else:
                print(f"Gemini API error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Gemini API call failed: {e}")
    
    return None


async def _call_hf_api(prompt: str, model: str, max_tokens: int = 2400) -> Optional[str]:
    """Call HuggingFace Inference API."""
    api_key = os.environ.get("HF_API_KEY")
    if not api_key:
        return None
    
    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": max_tokens,
            "temperature": float(os.environ.get("HF_TEMPERATURE", "0.7")),
            "top_p": float(os.environ.get("HF_TOP_P", "0.92")),
            "top_k": int(os.environ.get("HF_TOP_K", "40")),
            "repetition_penalty": float(os.environ.get("HF_REPETITION_PENALTY", "1.1")),
            "do_sample": True,
        },
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    return data[0].get("generated_text", "")
                elif isinstance(data, dict):
                    return data.get("generated_text", "")
            else:
                print(f"HF API error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"HF API call failed: {e}")
    
    return None
def next_difficulty(current: str, was_correct: bool, time_taken_seconds: Optional[float] = None) -> str:
    order = ["easy", "medium", "hard"]
    idx = order.index(current) if current in order else 1
    return order[min(idx + 1, 2)] if was_correct else order[max(idx - 1, 0)]

def compute_trust_score(violations: List[Dict], answers: List[Dict], total_questions: int) -> float:
    score = 100.0
    penalties = {
        "tab_switch": 8,
        "out_of_window": 10,
        "focus_loss": 5,
        "copy_attempt": 6,
        "paste_attempt": 10,
        "right_click": 2,
        "fullscreen_exit": 7,
        "no_face": 10,
        "multi_face": 15,
        "rapid_answer": 4,
        "devtools": 12,
        "screen_share_missing": 15,
        "screen_share_stopped": 15,
        "camera_dark": 6,
        "camera_blurry": 4,
        "face_scan_missing": 12,
        "looking_away": 8,
    }
    for v in violations:
        score -= penalties.get(v.get("type", ""), 3)

    if answers:
        rapid = sum(1 for a in answers if a.get("time_taken_seconds", 0) < 3)
        if rapid / max(len(answers), 1) > 0.3:
            score -= 10

    return max(0.0, min(100.0, round(score, 1)))


def _extract_json(text: str) -> Optional[list]:
    if not text:
        return None
    text = text.strip()
    
    # Remove markdown code-block wrappers if present
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "questions" in data:
            return data["questions"]
    except Exception:
        pass

    # Fallback to finding JSON array via regex
    match = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
    if match:
        try:
            cleaned_json = match.group(0)
            # Remove trailing commas inside braces/brackets
            cleaned_json = re.sub(r",\s*(\]|\})", r"\1", cleaned_json)
            return json.loads(cleaned_json)
        except Exception:
            return None
    return None


def _question_key(text: str) -> str:
    return re.sub(r"\W+", " ", text.lower()).strip()


def _keywords(details: str, topic: str) -> List[str]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9+#.-]{2,}", f"{topic} {details}")
    stop = {"the", "and", "for", "with", "that", "this", "from", "assessment", "question", "quiz", "student"}
    out = []
    for word in words:
        clean = word.strip(".,:;").lower()
        if clean not in stop and clean not in out:
            out.append(clean)
    return out[:18] or [topic.strip() or "core concept"]


def _fallback_questions(
    topic_text: str,
    details_text: str,
    difficulty: str,
    count: int,
    question_type: str,
    language: str,
    start_index: int = 0,
) -> List[Dict]:
    concepts = _keywords(details_text, topic_text)
    items = []
    mcq_stems = [
        "A student is applying {concept} in a new scenario. Which decision is most appropriate?",
        "Which option best identifies the misconception about {concept}?",
        "In the context provided by the admin, what is the strongest reason for using {concept}?",
        "Which outcome would most likely happen if {concept} is applied incorrectly?",
        "Which example best demonstrates practical understanding of {concept}?",
        "Which statement is most accurate when comparing {concept} with related ideas?",
        "A teacher asks students to justify {concept}. Which response is strongest?",
        "Which detail from the prompt is most important for solving a problem about {concept}?",
    ]
    coding_stems = [
        "Write a {language} function that solves a realistic problem involving {concept}.",
        "Implement input parsing and validation in {language} for a task based on {concept}.",
        "Debug and complete a {language} program that applies {concept}.",
        "Design an efficient {language} solution for a school/college exercise on {concept}.",
        "Create a {language} program that transforms data using {concept}.",
    ]

    for offset in range(count):
        idx = start_index + offset
        concept = concepts[idx % len(concepts)]
        if question_type == "coding":
            text = coding_stems[idx % len(coding_stems)].format(language=language, concept=concept)
            items.append({
                "text": f"{text}\n\nAdmin prompt context: {details_text[:450]}",
                "options": [],
                "correct_index": -1,
                "difficulty": difficulty,
                "topic": topic_text,
                "explanation": "Draft coding problem generated from the admin prompt. Review constraints and hidden tests before approval.",
                "question_type": "coding",
                "language": language,
                "starter_code": _starter_code(language, concept),
                "sample_input": "5\n1 2 3 4 5",
                "sample_output": "15",
                "test_cases": ["Input: 3\\n2 4 6 | Output: 12", "Input: 1\\n10 | Output: 10"],
            })
        else:
            stem = mcq_stems[idx % len(mcq_stems)].format(concept=concept)
            correct_index = idx % 4
            correct = f"The answer that directly applies {concept} to the admin's scenario"
            distractors = [
                f"A tempting but incomplete interpretation of {concept}",
                "A generic answer that ignores the supplied prompt details",
                "A statement that sounds technical but contradicts the scenario",
            ]
            options = distractors[:]
            options.insert(correct_index, correct)
            items.append({
                "text": f"{stem}\nContext: {details_text[:300]}",
                "options": options,
                "correct_index": correct_index,
                "difficulty": difficulty,
                "topic": topic_text,
                "explanation": f"The correct option is the only one grounded in the prompt's use of {concept}.",
                "question_type": "mcq" if question_type == "mcq" else "composite",
                "language": language if question_type == "composite" else "",
                "starter_code": _starter_code(language, concept) if question_type == "composite" else "",
                "sample_input": "5\n1 2 3 4 5" if question_type == "composite" else "",
                "sample_output": "15" if question_type == "composite" else "",
                "test_cases": [],
            })
    return items


def _starter_code(language: str, concept: str) -> str:
    if language == "javascript":
        return f"function solve(input) {{\n  // TODO: implement using {concept}\n  return '';\n}}\n"
    if language == "java":
        return f"import java.util.*;\nclass Main {{\n  public static void main(String[] args) {{\n    // TODO: implement using {concept}\n  }}\n}}\n"
    if language == "csharp":
        return f"using System;\nclass Program {{\n  static void Main() {{\n    // TODO: implement using {concept}\n  }}\n}}\n"
    return f"def solve(data):\n    # TODO: implement using {concept}\n    return None\n"


async def generate_questions_via_ai(
    topic: str,
    difficulty: str,
    count: int,
    session_id: str,
    details: str = "",
    question_type: str = "mcq",
    model: str = "gemini/gemini-1.5-flash",
    language: str = "python",
) -> List[Dict]:
    """Generate unique questions via Gemini API or HuggingFace serverless with deduplication."""
    model_name = model or os.environ.get("HF_MODEL", "gemini/gemini-1.5-flash")
    max_new_tokens = int(os.environ.get("HF_MAX_NEW_TOKENS", "2400"))
    topic_text = topic.strip() or "admin supplied assessment content"
    details_text = details.strip() or "No extra admin details were provided."
    qtype = question_type if question_type in {"mcq", "coding", "composite"} else "mcq"

    schema = {
        "mcq": '"text", "options" exactly 4 strings, "correct_index" 0-3, "explanation"',
        "coding": '"text", "language", "starter_code", "sample_input", "sample_output", "test_cases" array, "explanation"',
        "composite": '"text", "options" exactly 4 strings, "correct_index" 0-3, optional "starter_code", "sample_input", "sample_output", "explanation"',
    }[qtype]
    
    prompt = f"""You are a senior school/college assessment designer creating UNIQUE questions.
Generate exactly {count} UNIQUE {qtype.upper()} questions from the admin prompt below.

ADMIN PROMPT AND QUIZ DETAILS:
{details_text}

Topic/focus: {topic_text}
Difficulty: {difficulty}
Preferred coding language: {language}

CRITICAL REQUIREMENTS:
✓ Every question must test a DIFFERENT sub-skill, scenario, misconception, or application
✓ Do NOT repeat any stems, option patterns, examples, numbers, or wording
✓ Vary question structures significantly
✓ Be creative yet faithful to admin prompt
✓ Return ONLY a valid JSON array - no markdown formatting
✓ Required fields: {schema}
✓ Include "difficulty", "topic", "question_type" on every item

RESPONSE FORMAT: [{{...}}, {{...}}]"""

    data = None
    
    # Check configurations
    is_gemini = model_name.startswith("gemini/")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    hf_key = os.environ.get("HF_API_KEY")

    # Try Gemini API if explicitly selected, or if Gemini is configured and HF is not
    if is_gemini or (gemini_key and not hf_key):
        gemini_model = model_name.split("/")[-1] if is_gemini else "gemini-1.5-flash"
        print(f"Trying Gemini API generation with model: {gemini_model}")
        gemini_response = await _call_gemini_api(prompt, gemini_model, max_new_tokens)
        if gemini_response:
            data = _extract_json(gemini_response)
            if data:
                print(f"✓ Generated via Gemini API ({gemini_model})")

    # Fallback to HuggingFace serverless API if no data yet and HF key is set
    if not data and hf_key:
        hf_model = model_name if not is_gemini else "Qwen/Qwen2.5-7B-Instruct"
        print(f"Trying HuggingFace API generation with model: {hf_model}")
        api_response = await _call_hf_api(prompt, hf_model, max_new_tokens)
        if api_response:
            data = _extract_json(api_response)
            if data:
                print(f"✓ Generated via HF API ({hf_model})")

    # Local model fallback is intentionally opt-in because hosted environments
    # like Render usually cannot load large Transformer models reliably.
    local_fallback_enabled = os.environ.get("ENABLE_LOCAL_AI_FALLBACK", "false").lower() == "true"
    if not data and local_fallback_enabled and pipeline is not None:
        try:
            def _run_local_generation() -> str:
                global _GENERATOR, _GENERATOR_MODEL
                local_model = model_name if not is_gemini else "Qwen/Qwen2.5-7B-Instruct"
                if _GENERATOR is None or _GENERATOR_MODEL != local_model:
                    print(f"Loading local model: {local_model}")
                    _GENERATOR = pipeline(
                        "text-generation",
                        model=local_model,
                        tokenizer=local_model,
                        device_map=os.environ.get("HF_DEVICE_MAP", "auto"),
                        trust_remote_code=os.environ.get("HF_TRUST_REMOTE_CODE", "false").lower() == "true",
                    )
                    _GENERATOR_MODEL = local_model
                output = _GENERATOR(
                    prompt,
                    max_new_tokens=max_new_tokens,
                    do_sample=True,
                    temperature=float(os.environ.get("HF_TEMPERATURE", "0.7")),
                    top_p=float(os.environ.get("HF_TOP_P", "0.92")),
                    top_k=int(os.environ.get("HF_TOP_K", "40")),
                    repetition_penalty=float(os.environ.get("HF_REPETITION_PENALTY", "1.1")),
                    return_full_text=False,
                )
                return output[0].get("generated_text", "") if isinstance(output, list) and output else str(output)
            
            local_response = await asyncio.to_thread(_run_local_generation)
            data = _extract_json(local_response)
            print(f"✓ Generated via local model fallback")
        except Exception as e:
            print(f"Local model generation fallback failed: {e}")
            data = None
    
    # Process and deduplicate results
    valid = []
    seen = set()
    
    for q in data or []:
        try:
            # Skip if already seen (duplicate detection)
            if _is_duplicate(q, session_id):
                continue
            
            text = str(q.get("text", "")).strip()
            if not text:
                continue
            
            key = _question_key(text)
            if key in seen:
                continue
            
            item = {
                "text": text,
                "options": [str(o).strip() for o in q.get("options", [])],
                "correct_index": int(q.get("correct_index", -1)),
                "difficulty": difficulty,
                "topic": str(q.get("topic") or topic_text),
                "explanation": str(q.get("explanation", "")).strip(),
                "question_type": qtype,
                "language": str(q.get("language") or language),
                "starter_code": str(q.get("starter_code", "")),
                "sample_input": str(q.get("sample_input", "")),
                "sample_output": str(q.get("sample_output", "")),
                "test_cases": [str(t) for t in q.get("test_cases", [])],
            }
            
            # Validate based on question type
            if qtype in {"mcq", "composite"}:
                if len(item["options"]) != 4 or not (0 <= item["correct_index"] <= 3):
                    continue
            elif qtype == "coding":
                item["options"] = []
                item["correct_index"] = -1
                if not item["starter_code"]:
                    item["starter_code"] = _starter_code(language, topic_text)
            
            seen.add(key)
            valid.append(item)
            
        except Exception as e:
            print(f"Error processing question: {e}")
            continue
    
    # Fill gaps with fallback generator if needed
    if len(valid) < count:
        gap = count - len(valid)
        print(f"Filling {gap} questions with fallback generator")
        for item in _fallback_questions(topic_text, details_text, difficulty, gap, qtype, language, len(valid)):
            key = _question_key(item["text"])
            if key not in seen and not _is_duplicate(item, session_id):
                seen.add(key)
                valid.append(item)
                if len(valid) >= count:
                    break
    
    return valid[:count]
