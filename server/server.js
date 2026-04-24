require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Gemini Client ────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const AI_MODEL = process.env.AI_MODEL || "gemini-1.5-flash";

// ─── Prompt Builder ───────────────────────────────────────────────────────────
function buildPrompt(topic) {
  return `You are an expert quiz creator. You always return well-structured JSON arrays with exactly 5 multiple-choice questions. Never include markdown formatting in your response.

Generate 5 multiple choice questions on the topic: "${topic}".

Rules:
- Each question must have exactly 4 options
- Only one correct answer
- Include a clear explanation for the correct answer
- Difficulty: medium
- Questions should be specific, educational, and non-trivial

Return ONLY a raw JSON array (no markdown, no code fences, no extra text) in this exact format:
[
  {
    "question": "...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A",
    "explanation": "..."
  }
]`;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateQuestions(questions) {
  if (!Array.isArray(questions)) throw new Error("Response is not an array.");
  if (questions.length !== 5) throw new Error(`Expected 5 questions, got ${questions.length}.`);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const idx = i + 1;

    if (typeof q.question !== "string" || !q.question.trim())
      throw new Error(`Question ${idx}: missing "question" field.`);

    if (!Array.isArray(q.options) || q.options.length !== 4)
      throw new Error(`Question ${idx}: must have exactly 4 options.`);

    if (typeof q.answer !== "string" || !q.answer.trim())
      throw new Error(`Question ${idx}: missing "answer" field.`);

    if (!q.options.includes(q.answer))
      throw new Error(`Question ${idx}: answer "${q.answer}" not found in options.`);

    if (typeof q.explanation !== "string" || !q.explanation.trim())
      throw new Error(`Question ${idx}: missing "explanation" field.`);
  }

  return true;
}

// ─── Parse AI Response ────────────────────────────────────────────────────────
function parseAIResponse(content) {
  // Strip markdown code fences if present
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON array from within a larger string
    const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("Could not parse AI response as JSON.");
    }
  }

  return parsed;
}

// ─── POST /api/quiz/generate ──────────────────────────────────────────────────
app.post("/api/quiz/generate", async (req, res) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ success: false, error: "A valid topic is required." });
  }

  const trimmedTopic = topic.trim();

  if (trimmedTopic.length < 2) {
    return res.status(400).json({ success: false, error: "Topic must be at least 2 characters long." });
  }

  if (trimmedTopic.length > 200) {
    return res.status(400).json({ success: false, error: "Topic must be under 200 characters." });
  }

  try {
    console.log(`[QuizForge] Generating quiz for topic: "${trimmedTopic}" using Gemini`);

    const model = genAI.getGenerativeModel({
      model: AI_MODEL,
    });

    const result = await model.generateContent(buildPrompt(trimmedTopic));
    const rawContent = result.response.text();

    if (!rawContent) throw new Error("Empty response from AI.");

    const questions = parseAIResponse(rawContent);
    validateQuestions(questions);

    console.log(`[QuizForge] ✅ Quiz generated successfully (${questions.length} questions)`);

    return res.json({
      success: true,
      topic: trimmedTopic,
      questions,
    });
  } catch (err) {
    console.error("[QuizForge] ❌ Error:", err.message);

    // Common Gemini SDK errors
    if (err.message?.includes("API_KEY_INVALID")) {
      return res.status(500).json({ success: false, error: "Invalid API key. Please check your server configuration." });
    }
    if (err.message?.includes("QUOTA_EXCEEDED") || err.status === 429) {
      return res.status(429).json({ success: false, error: "Rate limit reached. Please try again in a moment." });
    }

    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate quiz. Please try again.",
    });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "QuizForge API", model: AI_MODEL });
});

// ─── Export for Vercel ────────────────────────────────────────────────────────
module.exports = app;

// ─── Start Server (Local only) ────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 QuizForge server running on http://localhost:${PORT}`);
    console.log(`🤖 Using model: ${AI_MODEL}`);
  });
}
