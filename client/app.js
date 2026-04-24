/**
 * QuizForge — app.js
 * Frontend logic for AI-powered quiz generation
 */

// ── Config ──────────────────────────────────────────────────────────────────
const API_BASE = window.location.origin;
const OPTION_LETTERS = ["A", "B", "C", "D"];

const LOADING_MESSAGES = [
  "Crafting questions with AI…",
  "Thinking of tricky options…",
  "Adding explanations…",
  "Almost there…",
];

// ── DOM References ───────────────────────────────────────────────────────────
const topicInput      = document.getElementById("topic-input");
const generateBtn     = document.getElementById("generate-btn");
const charCount       = document.getElementById("char-count");
const loadingState    = document.getElementById("loading-state");
const loadingSub      = document.getElementById("loading-sub");
const errorState      = document.getElementById("error-state");
const errorMessage    = document.getElementById("error-message");
const quizOutput      = document.getElementById("quiz-output");
const quizTopicTitle  = document.getElementById("quiz-topic-title");
const questionsContainer = document.getElementById("questions-container");
const regenerateBtn   = document.getElementById("regenerate-btn");
const newQuizBtn      = document.getElementById("new-quiz-btn");

// ── State ────────────────────────────────────────────────────────────────────
let currentTopic = "";
let loadingTimer  = null;
let loadingMsgIdx = 0;

// ── Char Counter ─────────────────────────────────────────────────────────────
topicInput.addEventListener("input", () => {
  const len = topicInput.value.length;
  charCount.textContent = `${len} / 200`;
  charCount.classList.toggle("warn",   len > 150);
  charCount.classList.toggle("danger", len > 190);
});

// ── Enter key shortcut ───────────────────────────────────────────────────────
topicInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !generateBtn.disabled) handleGenerate();
});

// ── Button Listeners ─────────────────────────────────────────────────────────
generateBtn.addEventListener("click", handleGenerate);
regenerateBtn.addEventListener("click", handleRegenerate);
newQuizBtn.addEventListener("click", handleNewQuiz);

// ── UI Helpers ───────────────────────────────────────────────────────────────
function setLoading(active) {
  generateBtn.disabled = active;
  generateBtn.querySelector(".btn-text").textContent = active ? "Generating…" : "Generate Quiz";

  if (active) {
    loadingState.classList.remove("hidden");
    errorState.classList.add("hidden");
    quizOutput.classList.add("hidden");
    loadingMsgIdx = 0;
    loadingSub.textContent = LOADING_MESSAGES[0];
    loadingTimer = setInterval(() => {
      loadingMsgIdx = (loadingMsgIdx + 1) % LOADING_MESSAGES.length;
      loadingSub.textContent = LOADING_MESSAGES[loadingMsgIdx];
    }, 1800);
  } else {
    loadingState.classList.add("hidden");
    clearInterval(loadingTimer);
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.remove("hidden");
  // Trigger re-animation
  errorState.style.animation = "none";
  // eslint-disable-next-line no-unused-expressions
  errorState.offsetHeight;
  errorState.style.animation = "";
}

function hideError() {
  errorState.classList.add("hidden");
}

// ── Core: Generate ───────────────────────────────────────────────────────────
async function handleGenerate() {
  const topic = topicInput.value.trim();

  if (!topic) {
    topicInput.focus();
    showError("Please enter a topic before generating a quiz.");
    return;
  }
  if (topic.length < 2) {
    showError("Topic must be at least 2 characters long.");
    return;
  }

  hideError();
  currentTopic = topic;
  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/api/quiz/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Received an invalid response from the server.");
    }

    if (!res.ok || !data.success) {
      throw new Error(data.error || `Server error (${res.status})`);
    }

    renderQuiz(data);
  } catch (err) {
    console.error("[QuizForge]", err);

    if (err.name === "TypeError" && err.message.includes("fetch")) {
      showError("Cannot reach the server. Make sure the backend is running on port 3001.");
    } else {
      showError(err.message || "An unexpected error occurred. Please try again.");
    }
  } finally {
    setLoading(false);
  }
}

function handleRegenerate() {
  if (currentTopic) {
    topicInput.value = currentTopic;
    handleGenerate();
  }
}

function handleNewQuiz() {
  quizOutput.classList.add("hidden");
  hideError();
  topicInput.value = "";
  charCount.textContent = "0 / 200";
  charCount.classList.remove("warn", "danger");
  topicInput.focus();
  currentTopic = "";
}

// ── Render Quiz ───────────────────────────────────────────────────────────────
function renderQuiz({ topic, questions }) {
  quizTopicTitle.textContent = `Quiz: ${topic}`;
  questionsContainer.innerHTML = "";

  questions.forEach((q, idx) => {
    const card = buildQuestionCard(q, idx);
    // Stagger animation
    card.style.animationDelay = `${idx * 0.08}s`;
    questionsContainer.appendChild(card);
  });

  quizOutput.classList.remove("hidden");
  // Smooth scroll to quiz
  setTimeout(() => {
    quizOutput.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

function buildQuestionCard(q, idx) {
  const card = document.createElement("article");
  card.className = "question-card";
  card.setAttribute("aria-label", `Question ${idx + 1}`);

  // Number
  const numEl = document.createElement("div");
  numEl.className = "question-number";
  numEl.textContent = `Question ${idx + 1}`;

  // Text
  const textEl = document.createElement("p");
  textEl.className = "question-text";
  textEl.textContent = q.question;

  // Options
  const optionsList = document.createElement("ul");
  optionsList.className = "options-list";
  optionsList.setAttribute("role", "list");

  // Answer & Explanation (Hidden by default)
  const answerSection = document.createElement("div");
  answerSection.className = "answer-section hidden";

  answerSection.innerHTML = `
    <span class="answer-tag">Correct Answer</span>
    <p class="answer-text">${escapeHtml(q.answer)}</p>
    <span class="explanation-tag">Explanation</span>
    <p class="explanation-text">${escapeHtml(q.explanation)}</p>
  `;

  const optionItems = [];

  q.options.forEach((opt, optIdx) => {
    const isCorrect = opt === q.answer;
    const li = document.createElement("li");
    li.className = "option-item";
    li.style.cursor = "pointer";

    const letter = document.createElement("span");
    letter.className = "option-letter";
    letter.setAttribute("aria-hidden", "true");
    letter.textContent = OPTION_LETTERS[optIdx] || String(optIdx + 1);

    const text = document.createElement("span");
    text.className = "option-text";
    text.textContent = opt;

    li.appendChild(letter);
    li.appendChild(text);

    const tick = document.createElement("span");
    tick.className = "correct-tick hidden";
    tick.setAttribute("aria-label", "Correct answer");
    tick.textContent = "✓";
    li.appendChild(tick);

    li.addEventListener("click", () => {
      if (card.classList.contains("answered")) return;

      card.classList.add("answered");
      answerSection.classList.remove("hidden");

      // Mark all options based on correctness
      optionItems.forEach((item) => {
        item.li.style.cursor = "default";
        if (item.isCorrect) {
          item.li.classList.add("correct");
          item.tick.classList.remove("hidden");
        } else if (item.opt === opt) {
          item.li.classList.add("incorrect");
        }
      });
    });

    optionsList.appendChild(li);
    optionItems.push({ li, opt, isCorrect, tick });
  });

  card.appendChild(numEl);
  card.appendChild(textEl);
  card.appendChild(optionsList);
  card.appendChild(answerSection);

  return card;
}

// ── Utility ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
