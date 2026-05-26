# AI Question Generation Setup Guide

## Overview

The quiz application now supports **AI-powered question generation** using HuggingFace's Inference API and optional local model support. The system generates **unique questions** with built-in deduplication to prevent duplicates.

## Key Features

✅ **HuggingFace Inference API** - Access to best-in-class models (Llama 3.3, Qwen, Mistral)
✅ **Automatic Fallback** - Falls back to local models if API is unavailable
✅ **Deduplication** - Session-based tracking prevents duplicate questions
✅ **Multiple Question Types** - MCQ, Coding, Composite (MCQ + Coding)
✅ **Adaptive Difficulty** - Supports easy, medium, hard levels
✅ **Multiple Languages** - Python, JavaScript, Java, C#, and more

## Setup Instructions

### 1. Get HuggingFace API Key

1. Visit https://huggingface.co/settings/tokens
2. Create a **Read-only** access token
3. Copy the token

### 2. Configure Environment Variables

Edit `.env` in the `app/backend/` directory:

```bash
# HuggingFace API Configuration
HF_API_KEY="your_token_here"
HF_MODEL="meta-llama/Llama-3.3-70B-Instruct"

# Generation Parameters
HF_MAX_NEW_TOKENS="2400"
HF_TEMPERATURE="0.7"
HF_TOP_P="0.92"
HF_TOP_K="40"
HF_REPETITION_PENALTY="1.1"
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

Or if updating an existing environment:

```bash
pip install httpx>=0.25.0
```

## Model Options

### Recommended Models (API-Based)

| Model | Best For | Notes |
|-------|----------|-------|
| **meta-llama/Llama-3.3-70B-Instruct** | ⭐ Best overall | Superior reasoning, fastest |
| **Qwen/Qwen2.5-72B-Instruct** | Multilingual + Coding | Excellent for diverse topics |
| **mistralai/Mistral-Large-Instruct-2407** | General purpose | Strong instruction following |
| **NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO** | Efficient generation | Good quality, lower latency |

### Local Models (When API Unavailable)

```
Qwen/Qwen3-30B-A3B-Instruct-2507  (30B - recommended if GPU available)
Qwen/Qwen3-4B-Instruct-2507       (4B - for modest hardware)
mistralai/Mistral-Small-3.2-24B   (24B - balanced option)
```

## API Usage

### Generate Questions Endpoint

**POST** `/api/questions/ai-generate`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "quiz_id": "quiz-123",
  "topic": "Python Data Structures",
  "difficulty": "medium",
  "count": 5,
  "question_type": "mcq",
  "model": "meta-llama/Llama-3.3-70B-Instruct",
  "language": "python",
  "details": "Focus on lists, sets, and dictionaries with practical examples"
}
```

**Response:**
```json
{
  "inserted": 5,
  "approval_required": true,
  "questions": [
    {
      "id": "q-uuid",
      "text": "Which data structure...",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "difficulty": "medium",
      "topic": "Python Data Structures",
      "explanation": "...",
      "question_type": "mcq"
    }
  ]
}
```

## Deduplication & Session Management

The system tracks generated questions per session:

- **Session ID Format**: `gen-{user_id}-{quiz_id}`
- **Cache TTL**: 12 hours per session
- **Deduplication Method**: MD5 hash of question text + topic + difficulty + options
- **Automatic Cleanup**: Expired sessions are cleaned up on access

## Temperature & Randomness Guide

| Value | Effect | Use Case |
|-------|--------|----------|
| **0.1-0.3** | Very focused, deterministic | When consistency matters |
| **0.5-0.7** | Balanced (recommended) | Most use cases ✓ |
| **0.8-1.0** | Highly creative, varied | When maximum diversity needed |

## Troubleshooting

### "HF API not available"
- Check `HF_API_KEY` is set correctly
- Verify token has read access
- Check internet connection

### "Model not found"
- Ensure model ID is correct (check https://huggingface.co)
- Model may require authentication (use API key)

### Slow generation
- Use a faster model (Mistral, Nous Hermes)
- Reduce `HF_MAX_NEW_TOKENS`
- Check system resources

### Duplicate questions
- Questions are cached per session (12 hours)
- Create a new session for genuinely new questions
- System auto-deduplicates identical questions

## Performance Tips

1. **Best Performance**: Use Llama 3.3 70B or Qwen 72B
2. **Faster Generation**: Use Mistral or Nous Hermes
3. **Cost Optimization**: Use smaller models for non-critical quizzes
4. **Batch Requests**: Generate multiple questions at once (count=10 vs count=1)

## Example: Python Client

```python
import httpx
import json

async def generate_questions():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/questions/ai-generate",
            json={
                "quiz_id": "quiz-123",
                "topic": "Machine Learning",
                "difficulty": "hard",
                "count": 5,
                "question_type": "mcq",
                "model": "meta-llama/Llama-3.3-70B-Instruct",
                "language": "python"
            },
            headers={"Authorization": "Bearer {token}"}
        )
        return response.json()

# Run it
result = await generate_questions()
print(f"Generated {result['inserted']} questions")
```

## Security Notes

⚠️ **Never commit `.env` with real API keys**
- Use `.env.example` as template
- Add `.env` to `.gitignore`
- Rotate tokens regularly
- Use scoped/read-only tokens only

## Support for Question Types

### MCQ (Multiple Choice)
```json
{
  "text": "Which...",
  "options": ["A", "B", "C", "D"],
  "correct_index": 2,
  "explanation": "..."
}
```

### Coding
```json
{
  "text": "Write a function...",
  "language": "python",
  "starter_code": "def solve():\n  pass",
  "sample_input": "5",
  "sample_output": "120",
  "test_cases": ["Input: 3 | Output: 6"]
}
```

### Composite (MCQ + Coding)
```json
{
  "text": "What's the output...",
  "options": ["A", "B", "C", "D"],
  "correct_index": 1,
  "starter_code": "...",
  "sample_input": "10",
  "sample_output": "55"
}
```

## Next Steps

1. ✅ Set `HF_API_KEY` in `.env`
2. ✅ Restart the backend server
3. ✅ Test question generation via API
4. ✅ Monitor generation quality
5. ✅ Adjust temperature/model as needed
