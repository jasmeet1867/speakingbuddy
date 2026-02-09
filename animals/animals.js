// animals/animals.js

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
// Data (German animals)
// Structure: { text, phon, translations: {en, fr, de}, accept[] }
// ----------------------
const WORDS = [
  { text: "Hund", phon: "hoont", translations: { en: "Dog", fr: "Chien", de: "Hund" }, accept: ["hund"] },
  { text: "Katze", phon: "KAH-tsuh", translations: { en: "Cat", fr: "Chat", de: "Katze" }, accept: ["katze"] },
  { text: "Vogel", phon: "FOH-gul", translations: { en: "Bird", fr: "Oiseau", de: "Vogel" }, accept: ["vogel"] },
  { text: "Pferd", phon: "pfairt", translations: { en: "Horse", fr: "Cheval", de: "Pferd" }, accept: ["pferd"] },
  { text: "Kuh", phon: "koo", translations: { en: "Cow", fr: "Vache", de: "Kuh" }, accept: ["kuh"] },
  { text: "Schwein", phon: "shvine", translations: { en: "Pig", fr: "Cochon", de: "Schwein" }, accept: ["schwein"] },
  { text: "Fisch", phon: "fish", translations: { en: "Fish", fr: "Poisson", de: "Fisch" }, accept: ["fisch"] },
  { text: "Maus", phon: "mows", translations: { en: "Mouse", fr: "Souris", de: "Maus" }, accept: ["maus"] },
  { text: "Bär", phon: "bear", translations: { en: "Bear", fr: "Ours", de: "Bär" }, accept: ["bär", "bar"] },
  { text: "Kaninchen", phon: "kah-NIN-khen", translations: { en: "Rabbit", fr: "Lapin", de: "Kaninchen" }, accept: ["kaninchen"] },
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

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const hintText = document.getElementById("hintText");

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

// Shared quiz wiring (see quiz-shared.js)
// - words:      category WORDS array (each item has .text and .translations)
// - targetLang: which translation to quiz on (en | fr | de)
// - ids:        DOM element ids for the quiz UI
// This same pattern is used in every category page so new
// categories only need WORDS + these ids to get a quiz.
if (window.createTranslationQuiz) {
  window.createTranslationQuiz({
    words: WORDS,
    targetLang: TARGET_LANG,
    ids: {
      startBtn: "startQuizBtn",
      area: "quizArea",
      count: "quizCount",
      score: "quizScore",
      word: "quizWord",
      options: "quizOptions",
      feedback: "quizFeedback",
      nextBtn: "nextQuizBtn",
    },
    showIntro: true,
  });
}

window.addEventListener("beforeunload", () => {
  try {
    stopMeter();
    stopMicStream();
    window.speechSynthesis?.cancel?.();
  } catch {}
});
