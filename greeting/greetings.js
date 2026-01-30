// greeting/greetings.js

// ----------------------
// Read selected language + difficulty
// ----------------------
const STORAGE_LANG = "selectedLanguage";
const STORAGE_DIFFICULTY = "selectedDifficulty";

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function getLang() {
  return getQueryParam("lang") || localStorage.getItem(STORAGE_LANG) || "en";
}

function getMode() {
  return getQueryParam("mode") || localStorage.getItem(STORAGE_DIFFICULTY) || "text";
}

const CURRENT_LANG = getLang();
const CURRENT_MODE = getMode();

// Map your UI language to Speech API locales
const LANG_TO_TTS = {
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
};

// ----------------------
// Data (Greetings by language)
// Structure: { text, phon, meaning, accept[] }
// meaning = English meaning shown on screen for fr/de
// ----------------------
const WORDS_BY_LANG = {
  en: [
    { text: "Hello", phon: "HEL-oh", meaning: "Hello", accept: ["hello", "hi"] },
    { text: "Hi", phon: "HY", meaning: "Hi", accept: ["hi", "hey"] },
    { text: "Good morning", phon: "gud MOR-ning", meaning: "Good morning", accept: ["good morning"] },
    { text: "Good afternoon", phon: "gud af-ter-NOON", meaning: "Good afternoon", accept: ["good afternoon"] },
    { text: "Good evening", phon: "gud EEV-ning", meaning: "Good evening", accept: ["good evening"] },
    { text: "How are you?", phon: "how ar yoo", meaning: "How are you?", accept: ["how are you", "how are you?"] },
    { text: "Nice to meet you", phon: "nys too MEET yoo", meaning: "Nice to meet you", accept: ["nice to meet you"] },
    { text: "Please", phon: "pleez", meaning: "Please", accept: ["please"] },
    { text: "Thank you", phon: "THANGK yoo", meaning: "Thank you", accept: ["thank you", "thanks"] },
    { text: "Goodbye", phon: "gud-BYE", meaning: "Goodbye", accept: ["goodbye", "bye", "see you"] },
  ],

  fr: [
    { text: "Bonjour", phon: "bohn-ZHOOR", meaning: "Hello / Good morning", accept: ["bonjour"] },
    { text: "Salut", phon: "sa-LU", meaning: "Hi", accept: ["salut"] },
    { text: "Bon matin", phon: "bohn mah-TAN", meaning: "Good morning", accept: ["bon matin"] },
    { text: "Bon après-midi", phon: "bohn ah-pray mee-DEE", meaning: "Good afternoon", accept: ["bon après-midi", "bon apres midi"] },
    { text: "Bonsoir", phon: "bohn-SWAR", meaning: "Good evening", accept: ["bonsoir"] },
    { text: "Comment ça va ?", phon: "koh-mahn sah vah", meaning: "How are you?", accept: ["comment ça va", "comment ca va", "comment ça va ?"] },
    { text: "Enchanté", phon: "ahn-shahn-TAY", meaning: "Nice to meet you", accept: ["enchanté", "enchante"] },
    { text: "S’il vous plaît", phon: "seel voo PLAY", meaning: "Please", accept: ["s'il vous plaît", "sil vous plait", "s’il vous plaît"] },
    { text: "Merci", phon: "mehr-SEE", meaning: "Thank you", accept: ["merci"] },
    { text: "Au revoir", phon: "oh ruh-VWAR", meaning: "Goodbye", accept: ["au revoir"] },
  ],

  de: [
    { text: "Hallo", phon: "HAH-lo", meaning: "Hello", accept: ["hallo"] },
    { text: "Hi", phon: "hee", meaning: "Hi", accept: ["hi"] },
    { text: "Guten Morgen", phon: "GOO-ten MOR-gen", meaning: "Good morning", accept: ["guten morgen"] },
    { text: "Guten Tag", phon: "GOO-ten tahk", meaning: "Good afternoon / Good day", accept: ["guten tag"] },
    { text: "Guten Abend", phon: "GOO-ten AH-bent", meaning: "Good evening", accept: ["guten abend"] },
    { text: "Wie geht’s?", phon: "vee gates", meaning: "How are you?", accept: ["wie geht's", "wie gehts", "wie geht’s"] },
    { text: "Freut mich", phon: "froyte mikh", meaning: "Nice to meet you", accept: ["freut mich"] },
    { text: "Bitte", phon: "BIT-tuh", meaning: "Please / You're welcome", accept: ["bitte"] },
    { text: "Danke", phon: "DAHN-kuh", meaning: "Thank you", accept: ["danke"] },
    { text: "Auf Wiedersehen", phon: "owf VEE-der-zayn", meaning: "Goodbye", accept: ["auf wiedersehen"] },
  ],
};

const WORDS = WORDS_BY_LANG[CURRENT_LANG] || WORDS_BY_LANG.en;

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

// ----------------------
// Helpers
// ----------------------
function setFeedback(html) {
  fbBody.innerHTML = html;
}

function setHint() {
  if (!hintText) return;

  if (CURRENT_LANG === "fr") hintText.textContent = "Dis ceci";
  else if (CURRENT_LANG === "de") hintText.textContent = "Sag das";
  else hintText.textContent = "Say this";
}

function updateUI() {
  const item = WORDS[i];

  promptWord.textContent = item.text;
  phonetic.textContent = item.phon;

  // Show English meaning only for FR/DE
  if (meaningText) {
    if (CURRENT_LANG === "en") {
      meaningText.textContent = "";
    } else {
      meaningText.innerHTML = `Meaning (English): <b>${item.meaning}</b>`;
    }
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
  const target = (LANG_TO_TTS[CURRENT_LANG] || "en-US").toLowerCase();

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
  utter.lang = LANG_TO_TTS[CURRENT_LANG] || "en-US";

  window.speechSynthesis.speak(utter);
});

// ----------------------
// Speech Recognition (basic feedback)
// ----------------------
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const r = new SR();
  r.lang = LANG_TO_TTS[CURRENT_LANG] || "en-US";
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
document.documentElement.lang = CURRENT_LANG;
setHint();
updateUI();

window.addEventListener("beforeunload", () => {
  try {
    stopMeter();
    stopMicStream();
    window.speechSynthesis?.cancel?.();
  } catch {}
});
