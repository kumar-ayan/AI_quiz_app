# ⚡ QuizForge

> AI-powered quiz generator — enter any topic, get 5 multiple-choice questions instantly.

## 🗂️ Project Structure

```
AI_quiz_app/
├── server/          # Node.js + Express backend
│   ├── server.js
│   ├── package.json
│   ├── .env         ← Add your API key here
│   └── .env.example
└── client/          # Vanilla HTML/CSS/JS frontend
    ├── index.html
    ├── style.css
    └── app.js
```

## 🚀 Quick Start

### 1. Set up the backend

```bash
cd server
npm install
```

Copy `.env.example` to `.env` and fill in your API key:

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1   # or any OpenAI-compatible URL
AI_MODEL=gpt-4o-mini
PORT=3001
```

Start the server:

```bash
npm run dev     # development (nodemon)
# or
npm start       # production
```

### 2. Open the frontend

Just open `client/index.html` in your browser — no build step needed.

> The frontend connects to `http://localhost:3001` by default.

## 🤖 AI Provider Compatibility

QuizForge works with **any OpenAI-compatible API**:

| Provider | Base URL |
|---|---|
| OpenAI | `https://api.openai.com/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Together AI | `https://api.together.xyz/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Ollama (local) | `http://localhost:11434/v1` |

## 📡 API Reference

### `POST /api/quiz/generate`

**Request:**
```json
{ "topic": "Machine Learning" }
```

**Response:**
```json
{
  "success": true,
  "topic": "Machine Learning",
  "questions": [
    {
      "question": "What does 'overfitting' mean?",
      "options": ["...", "...", "...", "..."],
      "answer": "...",
      "explanation": "..."
    }
  ]
}
```

### `GET /api/health`
Returns server status and active model.

## 🧩 Features

- ✅ 5 MCQs with 4 options, correct answer, and explanation
- ✅ Robust JSON parsing (handles AI markdown code fences)
- ✅ Full input validation on both client and server
- ✅ Graceful error handling (rate limits, network failures, bad responses)
- ✅ Loading state with rotating messages
- ✅ Regenerate and "New Quiz" shortcuts
- ✅ Responsive dark-mode design
