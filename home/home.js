// home/home.js

// ----------------------
// Read translation target + difficulty
// ----------------------
const STORAGE_LANG = "selectedLanguage";
const STORAGE_DIFFICULTY = "selectedDifficulty";

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function getLang() {
  const lang = getQueryParam("lang") || localStorage.getItem(STORAGE_LANG) || "en";
  if (lang === "en" || lang === "fr" || lang === "de") return lang;
  return "en";
}

function getMode() {
  return getQueryParam("mode") || localStorage.getItem(STORAGE_DIFFICULTY) || "text";
}

const TARGET_LANG = getLang();
const CURRENT_MODE = getMode();

// German is the only practiced language.
const PRACTICE_LANG = "de";
const PRACTICE_LOCALE = "de-DE";

// ----------------------
// Data (German home)
// Structure: { text, phon, translations: {en, fr, de}, accept[] }
// ----------------------
const WORDS = [
  { text: "Haus", phon: "howss", translations: { en: "House", fr: "Maison", de: "Haus" }, accept: ["haus"] },
  { text: "Tür", phon: "tyr", translations: { en: "Door", fr: "Porte", de: "Tür" }, accept: ["tür", "tur"] },
  { text: "Fenster", phon: "FEN-ster", translations: { en: "Window", fr: "Fenêtre", de: "Fenster" }, accept: ["fenster"] },
  { text: "Küche", phon: "KUE-kheh", translations: { en: "Kitchen", fr: "Cuisine", de: "Küche" }, accept: ["küche", "kuche"] },
  { text: "Bad", phon: "baht", translations: { en: "Bathroom", fr: "Salle de bain", de: "Bad" }, accept: ["bad"] },
  { text: "Bett", phon: "bett", translations: { en: "Bed", fr: "Lit", de: "Bett" }, accept: ["bett"] },
  { text: "Stuhl", phon: "shtool", translations: { en: "Chair", fr: "Chaise", de: "Stuhl" }, accept: ["stuhl"] },
  { text: "Tisch", phon: "tish", translations: { en: "Table", fr: "Table", de: "Tisch" }, accept: ["tisch"] },
  { text: "Lampe", phon: "LAM-peh", translations: { en: "Lamp", fr: "Lampe", de: "Lampe" }, accept: ["lampe"] },
  { text: "Schlüssel", phon: "SHLYU-sel", translations: { en: "Key", fr: "Clé", de: "Schlüssel" }, accept: ["schlüssel", "schlussel"] },
];


// ----------------------
// Elements
// ----------------------
const backBtn = document.getElementById("backBtn");
const counter = document.getElementById("counter");
const progressBar = document.getElementById("progressBar");

const promptWord = document.getElementById("promptWord");
const phonetic = document.getElementById("phonetic");
const meaningText = document.getElementById("meaningText");

const listenBtn = document.getElementById("listenBtn");
const voiceSelect = document.getElementById("voiceSelect");
const speedSelect = document.getElementById("speedSelect");

const recordBtn = document.getElementById("recordBtn");
const playBtn = document.getElementById("playBtn");
const retryBtn = document.getElementById("retryBtn");

const micHint = document.getElementById("micHint");
const meterFill = document.getElementById("meterFill");

const fbBody = document.getElementById("fbBody");

// Quiz elements
const startQuizBtn = document.getElementById("startQuizBtn");
const quizArea = document.getElementById("quizArea");
const quizCount = document.getElementById("quizCount");
const quizScoreEl = document.getElementById("quizScore");
const quizWord = document.getElementById("quizWord");
const quizOptions = document.getElementById("quizOptions");
const quizFeedback = document.getElementById("quizFeedback");
const nextQuizBtn = document.getElementById("nextQuizBtn");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// ✅ NEW: hint label element
const hintText = document.getElementById("hintText");

// ✅ NEW: store the list that matches the dropdown (prevents index mismatch)
let VOICE_LIST = [];

// ----------------------
// State
// ----------------------
let i = 0;

let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let recordedUrl = null;

let audioStream = null;
let audioContext = null;
let analyser = null;
let meterRAF = null;

let recognition = null;

// Quiz state
const QUIZ_TOTAL = 10;
let quizOrder = [];
let quizQuestionIndex = 0; // 0..(quizOrder.length-1)
let quizScore = 0;
let quizCurrentWordIndex = null;
let quizAnswered = false;

// ----------------------
// Helpers
// ----------------------
function setFeedback(html) {
  fbBody.innerHTML = html;
}

function setHint() {
  if (!hintText) return;

  hintText.textContent = "Say this";
}

function updateUI() {
  const item = WORDS[i];

  promptWord.textContent = item.text;
  phonetic.textContent = item.phon;

  // Show translation of the German prompt into the selected target language
  if (meaningText) {
    const labels = {
      en: "Translation (English)",
      fr: "Translation (French)",
      de: "Translation (Deutsch)",
    };
    const label = labels[TARGET_LANG] || labels.en;
    const translation = (item.translations && item.translations[TARGET_LANG]) || "";
    meaningText.innerHTML = `${label}: <b>${translation}</b>`;
  }

  // Audio-only mode hides word + meaning
  if (CURRENT_MODE === "audio") {
    promptWord.style.visibility = "hidden";
    if (meaningText) meaningText.style.visibility = "hidden";
  } else {
    promptWord.style.visibility = "visible";
    if (meaningText) meaningText.style.visibility = "visible";
  }

  counter.textContent = `${i + 1}/${WORDS.length}`;
  progressBar.style.width = `${((i + 1) / WORDS.length) * 100}%`;

  cleanupRecording();
  playBtn.disabled = true;
  retryBtn.disabled = true;

  setFeedback("Record your voice and we’ll show a basic match check.");
}

function cleanupRecording() {
  if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  recordedUrl = null;
  recordedBlob = null;
  recordedChunks = [];
  meterFill.style.width = "0%";
}

// ----------------------
// Quiz (MCQ)
// ----------------------
function shuffleInPlace(arr) {
  for (let j = arr.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [arr[j], arr[k]] = [arr[k], arr[j]];
  }
  return arr;
}

function getTargetLabel() {
  return ({ en: "English", fr: "French", de: "Deutsch" }[TARGET_LANG]) || "English";
}

function getTranslationFor(idx) {
  const item = WORDS[idx];
  return (item.translations && item.translations[TARGET_LANG]) || "";
}

function buildQuizOptions(correctIdx) {
  const options = [];
  const usedLabels = new Set();

  const pushOption = (idx, isCorrect) => {
    const base = getTranslationFor(idx) || WORDS[idx].text;
    let label = base;
    if (usedLabels.has(label)) label = `${base} (${WORDS[idx].text})`;
    if (usedLabels.has(label)) label = `${label} #${idx + 1}`;
    usedLabels.add(label);
    options.push({ idx, label, isCorrect });
  };

  pushOption(correctIdx, true);

  const candidateIdxs = Array.from({ length: WORDS.length }, (_, n) => n).filter(
    (n) => n !== correctIdx
  );
  shuffleInPlace(candidateIdxs);

  for (const cand of candidateIdxs) {
    if (options.length >= 4) break;
    pushOption(cand, false);
  }

  return shuffleInPlace(options).slice(0, 4);
}

function resetQuizUI() {
  if (!quizFeedback) return;
  quizFeedback.textContent = "";
  nextQuizBtn.disabled = true;
  quizAnswered = false;
}

function setQuizMeta() {
  const total = quizOrder.length || Math.min(QUIZ_TOTAL, WORDS.length);
  const qNum = Math.min(quizQuestionIndex + 1, total);
  if (quizCount) quizCount.textContent = `Question ${qNum}/${total}`;
  if (quizScoreEl) quizScoreEl.textContent = `Score: ${quizScore}/${total}`;
}

function showFinalScore() {
  const total = quizOrder.length;
  if (quizCount) quizCount.textContent = `Finished`;
  if (quizScoreEl) quizScoreEl.textContent = `Score: ${quizScore}/${total}`;

  if (quizWord) quizWord.textContent = "Quiz complete";
  if (quizOptions) quizOptions.innerHTML = "";
  if (quizFeedback) quizFeedback.innerHTML = `✅ Your score: <b>${quizScore}/${total}</b>`;
  if (nextQuizBtn) nextQuizBtn.disabled = true;
}

function renderQuizQuestion() {
  if (!quizArea || !quizWord || !quizOptions || !quizFeedback) return;

  resetQuizUI();

  const total = quizOrder.length;
  if (quizQuestionIndex >= total) {
    showFinalScore();
    return;
  }

  setQuizMeta();

  const idx = quizOrder[quizQuestionIndex];
  quizCurrentWordIndex = idx;
  quizWord.textContent = WORDS[idx].text;

  const opts = buildQuizOptions(idx);
  quizOptions.innerHTML = "";

  opts.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn opt";
    btn.textContent = opt.label;
    btn.dataset.correct = opt.isCorrect ? "1" : "0";

    btn.addEventListener("click", () => {
      if (quizAnswered) return;
      quizAnswered = true;

      const buttons = quizOptions.querySelectorAll("button.opt");
      buttons.forEach((b) => (b.disabled = true));

      const isCorrect = btn.dataset.correct === "1";
      if (isCorrect) {
        btn.classList.add("correct");
        quizScore += 1;
        quizFeedback.innerHTML = `✅ Correct! (${getTargetLabel()})`;
      } else {
        btn.classList.add("wrong");
        const correct = opts.find((o) => o.isCorrect);
        quizFeedback.innerHTML = `❌ Not quite. Correct answer: <b>${correct?.label || ""}</b>`;
        const correctBtn = Array.from(buttons).find((b) => b.dataset.correct === "1");
        if (correctBtn) correctBtn.classList.add("correct");
      }

      setQuizMeta();

      nextQuizBtn.disabled = false;
    });

    quizOptions.appendChild(btn);
  });
}

function ensureQuizVisible() {
  if (!quizArea) return;
  quizArea.hidden = false;
}

function startQuiz() {
  ensureQuizVisible();

  // Build a non-repeating order (shuffle the whole list and take first N)
  quizOrder = Array.from({ length: WORDS.length }, (_, n) => n);
  shuffleInPlace(quizOrder);
  quizOrder = quizOrder.slice(0, Math.min(QUIZ_TOTAL, WORDS.length));

  quizQuestionIndex = 0;
  quizScore = 0;
  quizCurrentWordIndex = null;
  quizAnswered = false;

  renderQuizQuestion();
}

if (startQuizBtn) {
  startQuizBtn.addEventListener("click", () => {
    startQuiz();
    startQuizBtn.textContent = "Restart Quiz";
  });
}

if (nextQuizBtn) {
  nextQuizBtn.addEventListener("click", () => {
    // Move to next question
    quizQuestionIndex += 1;
    renderQuizQuestion();
  });
}

// ----------------------
// Back
// ----------------------
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "../index.html";
  });
}

// ----------------------
// Next / Prev
// ----------------------
prevBtn.addEventListener("click", () => {
  if (i > 0) i--;
  updateUI();
});

nextBtn.addEventListener("click", () => {
  if (i < WORDS.length - 1) i++;
  updateUI();
});

// ----------------------
// Text-to-Speech (Listen)
// ----------------------
function loadVoices() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const target = PRACTICE_LOCALE.toLowerCase();

  const matching = voices.filter(v =>
    (v.lang || "").toLowerCase().startsWith(target.slice(0, 2))
  );

  VOICE_LIST = matching.length ? matching : voices;

  voiceSelect.innerHTML = "";
  VOICE_LIST.forEach((v, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
}

if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
} else {
  listenBtn.disabled = true;
  setFeedback("Your browser does not support text-to-speech.");
}

listenBtn.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const idx = Number(voiceSelect.value || 0);
  const voice = VOICE_LIST[idx] || VOICE_LIST[0];

  const utter = new SpeechSynthesisUtterance(WORDS[i].text);
  utter.voice = voice;
  utter.rate = Number(speedSelect.value || 1);
  utter.lang = PRACTICE_LOCALE;

  window.speechSynthesis.speak(utter);
});

// ----------------------
// Speech Recognition (basic feedback)
// ----------------------
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const r = new SR();
  r.lang = PRACTICE_LOCALE;
  r.interimResults = false;
  r.maxAlternatives = 3;
  return r;
}
recognition = initRecognition();

// ----------------------
// Mic meter
// ----------------------
async function setupMeter(stream) {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);

  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let k = 0; k < data.length; k++) {
      const v = (data[k] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const pct = Math.min(100, Math.max(0, Math.floor(rms * 220)));
    meterFill.style.width = pct + "%";

    meterRAF = requestAnimationFrame(tick);
  };

  cancelAnimationFrame(meterRAF);
  tick();
}

function stopMeter() {
  cancelAnimationFrame(meterRAF);
  meterRAF = null;
  meterFill.style.width = "0%";
}

// ----------------------
// Recording
// ----------------------
async function ensureMic() {
  if (audioStream) return audioStream;
  audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return audioStream;
}

function stopMicStream() {
  if (!audioStream) return;
  audioStream.getTracks().forEach(t => t.stop());
  audioStream = null;
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Your browser doesn't support microphone recording.");
    return;
  }

  const stream = await ensureMic();
  await setupMeter(stream);

  recordedChunks = [];
  recordedBlob = null;

  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    stopMeter();

    recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
    recordedUrl = URL.createObjectURL(recordedBlob);

    playBtn.disabled = false;
    retryBtn.disabled = false;

    micHint.textContent = "Recording saved. Play it back or retry.";
    await runRecognitionFeedback();
  };

  mediaRecorder.start();
  recordBtn.classList.add("recording");
  micHint.textContent = "Recording… tap again to stop";
}

function stopRecording() {
  if (!mediaRecorder) return;
  if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
  recordBtn.classList.remove("recording");
}

recordBtn.addEventListener("click", async () => {
  try {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      await startRecording();
    } else {
      stopRecording();
    }
  } catch (err) {
    console.error(err);
    alert("Microphone permission is required.");
  }
});

retryBtn.addEventListener("click", () => {
  cleanupRecording();
  playBtn.disabled = true;
  retryBtn.disabled = true;
  setFeedback("Try again — tap the mic to record.");
  micHint.textContent = "Tap the microphone to record";
});

playBtn.addEventListener("click", () => {
  if (!recordedUrl) return;
  const a = new Audio(recordedUrl);
  a.play();
});

// ----------------------
// Feedback logic (Recognition match)
// ----------------------
async function runRecognitionFeedback() {
  if (!recognition) {
    setFeedback(
      `✅ Recording captured.<br><span style="color:#64748b;font-weight:700;">Speech recognition not supported on this browser — you can still listen and compare.</span>`
    );
    return;
  }

  if (!recordedBlob) return;

  setFeedback(
    `🧠 Basic check: click mic again and say it clearly for recognition (browser limitation).<br>
     <span style="color:#64748b;font-weight:700;">Tip: Chrome works best.</span>`
  );
}

// ----------------------
// Init
// ----------------------
document.documentElement.lang = PRACTICE_LANG;
setHint();
updateUI();

// Keep quiz hint text aligned with the selected translation target
if (quizFeedback) {
  quizFeedback.textContent = `Quiz answers are in ${getTargetLabel()}.`;
}

window.addEventListener("beforeunload", () => {
  try {
    stopMeter();
    stopMicStream();
    window.speechSynthesis?.cancel?.();
  } catch {}
});
