/**
 * SpeakingBuddy – Dynamic Topic Page
 *
 * Replaces all 8 duplicated topic JS files.
 * Reads category/lang/mode from URL params, fetches words from the API,
 * and drives flashcard navigation, audio playback, recording, and
 * pronunciation evaluation.
 *
 * Depends on: js/config.js, js/api.js (loaded before this script).
 */

// ── Query params & settings ───────────────────────────────
const STORAGE_LANG = "selectedLanguage";
const STORAGE_DIFFICULTY = "selectedDifficulty";

function qp(name) {
  return new URLSearchParams(window.location.search).get(name);
}

const CATEGORY = qp("category") || "animals";
const TARGET_LANG = (() => {
  const l = qp("lang") || localStorage.getItem(STORAGE_LANG) || "en";
  return ["en", "fr", "de"].includes(l) ? l : "en";
})();
const CURRENT_MODE = qp("mode") || localStorage.getItem(STORAGE_DIFFICULTY) || "text";

// Emoji map (same as landing page)
const CATEGORY_EMOJI = {
  greetings: "👋", animals: "🐾", house: "🏠", outdoor: "🌳",
  family: "👨‍👩‍👧", food: "🍔", drinks: "🥤", colours: "🎨",
};

// ── DOM refs ──────────────────────────────────────────────
const backBtn        = document.getElementById("backBtn");
const pageTitle      = document.getElementById("pageTitle");
const categoryEmoji  = document.getElementById("categoryEmoji");
const counter        = document.getElementById("counter");
const progressBar    = document.getElementById("progressBar");

const promptWord     = document.getElementById("promptWord");
const meaningText    = document.getElementById("meaningText");
const hintText       = document.getElementById("hintText");

const listenBtn      = document.getElementById("listenBtn");

const recordBtn      = document.getElementById("recordBtn");
const playBtn        = document.getElementById("playBtn");
const retryBtn       = document.getElementById("retryBtn");
const micHint        = document.getElementById("micHint");
const meterFill      = document.getElementById("meterFill");

const evaluateRow    = document.getElementById("evaluateRow");
const evaluateBtn    = document.getElementById("evaluateBtn");

const fbBody         = document.getElementById("fbBody");
const breakdownEl    = document.getElementById("breakdown");

const prevBtn        = document.getElementById("prevBtn");
const nextBtn        = document.getElementById("nextBtn");

// ── State ─────────────────────────────────────────────────
let WORDS = [];       // populated from API
let i = 0;            // current flashcard index

let mediaRecorder    = null;
let recordedChunks   = [];
let recordedBlob     = null;
let recordedUrl      = null;

let audioStream      = null;
let audioContext      = null;
let analyser          = null;
let meterRAF          = null;

let currentAudio      = null; // reference audio element

// ── Helpers ───────────────────────────────────────────────
function setFeedback(html) { fbBody.innerHTML = html; }

function cleanupRecording() {
  if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  recordedUrl = null;
  recordedBlob = null;
  recordedChunks = [];
  meterFill.style.width = "0%";
}

// ── UI Update ─────────────────────────────────────────────
function updateUI() {
  if (!WORDS.length) return;
  const word = WORDS[i];

  promptWord.textContent = word.word_lb;

  // Translation
  if (meaningText) {
    const labels = { en: "English", fr: "French", de: "German" };
    const label = labels[TARGET_LANG] || "English";
    const translation = word.translation || "";
    meaningText.innerHTML = `Translation (${label}): <b>${translation}</b>`;
  }

  // Audio-only mode hides word + meaning
  if (CURRENT_MODE === "audio") {
    promptWord.style.visibility = "hidden";
    if (meaningText) meaningText.style.visibility = "hidden";
  } else {
    promptWord.style.visibility = "visible";
    if (meaningText) meaningText.style.visibility = "visible";
  }

  // Progress
  counter.textContent = `${i + 1}/${WORDS.length}`;
  progressBar.style.width = `${((i + 1) / WORDS.length) * 100}%`;

  // Reset recording state
  cleanupRecording();
  playBtn.disabled = true;
  retryBtn.disabled = true;
  evaluateRow.style.display = "none";
  breakdownEl.style.display = "none";

  setFeedback("Record your voice and tap Evaluate to get a pronunciation score.");
}

// ── Back button ───────────────────────────────────────────
backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

// ── Prev / Next ───────────────────────────────────────────
prevBtn.addEventListener("click", () => {
  if (i > 0) { i--; updateUI(); }
});

nextBtn.addEventListener("click", () => {
  if (i < WORDS.length - 1) { i++; updateUI(); }
});

// ── Listen (play reference audio from API) ────────────────
listenBtn.addEventListener("click", () => {
  if (!WORDS.length) return;
  const word = WORDS[i];
  const url = getAudioUrl(word.id);

  // Stop any previous playback
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }

  currentAudio = new Audio(url);
  currentAudio.play().catch(err => {
    console.error("Audio playback failed:", err);
    setFeedback("⚠ Could not play audio. Check the backend connection.");
  });
});

// ── Mic Meter ─────────────────────────────────────────────
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

// ── Recording ─────────────────────────────────────────────
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

  mediaRecorder.onstop = () => {
    stopMeter();
    recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
    recordedUrl = URL.createObjectURL(recordedBlob);

    playBtn.disabled = false;
    retryBtn.disabled = false;
    evaluateRow.style.display = "flex";

    micHint.textContent = "Recording saved. Play it back, retry, or evaluate.";
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
  evaluateRow.style.display = "none";
  breakdownEl.style.display = "none";
  setFeedback("Try again — tap the mic to record.");
  micHint.textContent = "Tap the microphone to record";
});

playBtn.addEventListener("click", () => {
  if (!recordedUrl) return;
  new Audio(recordedUrl).play();
});

// ── Evaluate Pronunciation ────────────────────────────────
evaluateBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  console.log("[Evaluate] clicked, recordedBlob:", recordedBlob, "WORDS.length:", WORDS.length);

  if (!recordedBlob || !WORDS.length) {
    console.warn("[Evaluate] No recording or words — aborting.");
    return;
  }
  const word = WORDS[i];
  console.log("[Evaluate] Sending word_id:", word.id);

  evaluateBtn.disabled = true;
  evaluateBtn.textContent = "⏳ Analyzing…";

  try {
    const result = await checkPronunciation(word.id, recordedBlob);
    console.log("[Evaluate] Result:", result);
    renderScore(result);
  } catch (err) {
    console.error("Pronunciation check error:", err);
    setFeedback("⚠ Could not reach the pronunciation checker. Is the backend running?");
  } finally {
    evaluateBtn.disabled = false;
    evaluateBtn.textContent = "📊 Evaluate Pronunciation";
  }
});

function renderScore(result) {
  // Overall score + feedback
  const scoreColor = result.score >= 70 ? "#22c55e" : result.score >= 40 ? "#eab308" : "#ef4444";
  let html = `<span style="font-size:28px;font-weight:950;color:${scoreColor}">${Math.round(result.score)}</span><span style="color:var(--muted);font-weight:700">/100</span>`;
  html += `<br><span style="font-weight:700;color:var(--muted)">${result.feedback}</span>`;

  if (result.improvements?.length) {
    html += `<br><br><b>Improvements:</b><ul style="margin:4px 0;padding-left:18px">`;
    result.improvements.forEach(tip => { html += `<li>${tip}</li>`; });
    html += `</ul>`;
  }
  if (result.suggestions?.length) {
    html += `<b>Suggestions:</b><ul style="margin:4px 0;padding-left:18px">`;
    result.suggestions.forEach(tip => { html += `<li>${tip}</li>`; });
    html += `</ul>`;
  }

  setFeedback(html);

  // Breakdown bars
  const bd = result.breakdown;
  if (bd) {
    breakdownEl.style.display = "block";
    setBar("Pitch", bd.pitch);
    setBar("Formants", bd.formants);
    setBar("Intensity", bd.intensity);
    setBar("Duration", bd.duration);
    setBar("VoiceQuality", bd.voice_quality);
  }
}

function setBar(name, value) {
  const fill = document.getElementById(`bar${name}`);
  const val  = document.getElementById(`val${name}`);
  if (!fill || !val) return;
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  fill.style.width = pct + "%";
  fill.style.background = pct >= 70 ? "#22c55e" : pct >= 40 ? "#eab308" : "#ef4444";
  val.textContent = pct;
}

// ── Bootstrap ─────────────────────────────────────────────
let _initRun = false;

async function init() {
  if (_initRun) {
    console.warn("[INIT] init() called again — skipping (already ran).");
    return;
  }
  _initRun = true;
  console.log("[INIT] page loaded at", new Date().toISOString());

  // Set page header
  pageTitle.textContent = CATEGORY.charAt(0).toUpperCase() + CATEGORY.slice(1);
  categoryEmoji.textContent = CATEGORY_EMOJI[CATEGORY] || "📚";
  document.title = `${pageTitle.textContent} • SpeakingBuddy`;

  try {
    WORDS = await fetchWords(CATEGORY, TARGET_LANG);
    if (!WORDS.length) {
      setFeedback("No words found for this category.");
      return;
    }
    updateUI();
  } catch (err) {
    console.error("Failed to load words:", err);
    setFeedback("⚠ Could not load words. Is the backend running?");
  }
}

init();

// ── Cleanup on leave ──────────────────────────────────────
window.addEventListener("beforeunload", () => {
  try {
    stopMeter();
    stopMicStream();
    if (currentAudio) currentAudio.pause();
  } catch {}
});
