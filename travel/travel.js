// travel/travel.js

const STORAGE_LANG = "selectedLanguage";
const STORAGE_DIFFICULTY = "selectedDifficulty";
// ----------------------
// Init
// ----------------------
document.documentElement.lang = PRACTICE_LANG;
setHint();
updateUI();

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

  const idx = Number(voiceSelect.value || 0);
  const voice = VOICE_LIST[idx] || VOICE_LIST[0];

  const utter = new SpeechSynthesisUtterance(WORDS[i].text);
  utter.voice = voice;
  utter.rate = Number(speedSelect.value || 1);
  utter.lang = PRACTICE_LOCALE;

  window.speechSynthesis.speak(utter);
});

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
// Quiz (multiple choice)
// ----------------------
const startQuizBtn = document.getElementById("startQuizBtn");
const quizArea = document.getElementById("quizArea");
const quizCount = document.getElementById("quizCount");
const quizScoreEl = document.getElementById("quizScore");
const quizWord = document.getElementById("quizWord");
const quizOptions = document.getElementById("quizOptions");
const quizFeedback = document.getElementById("quizFeedback");
const nextQuizBtn = document.getElementById("nextQuizBtn");

const QUIZ_TOTAL = WORDS.length;
let quizOrder = [];
let quizQuestionIndex = 0;
let quizScore = 0;
let quizCurrentWordIndex = null;
let quizAnswered = false;

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
    const label = getTranslationFor(idx);
    if (!label || usedLabels.has(label)) return;
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

  return shuffleInPlace(options);
}

function resetQuizUI() {
  if (!quizArea) return;
  quizOptions.innerHTML = "";
  if (quizFeedback) quizFeedback.textContent = "";
  if (nextQuizBtn) nextQuizBtn.disabled = true;
}

function setQuizMeta() {
  if (!quizCount || !quizScoreEl) return;
  quizCount.textContent = `Question ${quizQuestionIndex + 1}/${QUIZ_TOTAL}`;
  quizScoreEl.textContent = `Score: ${quizScore}/${QUIZ_TOTAL}`;
}

function showFinalScore() {
  if (!quizFeedback) return;
  quizFeedback.textContent = `Finished! Your score: ${quizScore}/${QUIZ_TOTAL}.`;
  if (nextQuizBtn) nextQuizBtn.disabled = true;
}

function renderQuizQuestion() {
  if (!quizArea) return;

  resetQuizUI();
  quizAnswered = false;
  quizCurrentWordIndex = quizOrder[quizQuestionIndex];

  setQuizMeta();

  const item = WORDS[quizCurrentWordIndex];
  if (quizWord) quizWord.textContent = item.text;

  const opts = buildQuizOptions(quizCurrentWordIndex);
  opts.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn opt";
    btn.textContent = opt.label;
    btn.dataset.correct = opt.isCorrect ? "1" : "0";
    quizOptions.appendChild(btn);
  });

  quizOptions.querySelectorAll(".opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (quizAnswered) return;
      quizAnswered = true;

      const isCorrect = btn.dataset.correct === "1";
      if (isCorrect) {
        btn.classList.add("correct");
        quizScore++;
        setQuizMeta();
        if (quizFeedback) quizFeedback.textContent = "✅ Correct! Nice job.";
      } else {
        btn.classList.add("wrong");
        const correctBtn = quizOptions.querySelector('.opt[data-correct="1"]');
        if (correctBtn) correctBtn.classList.add("correct");
        const correctLabel = getTranslationFor(quizCurrentWordIndex);
        if (quizFeedback)
          quizFeedback.textContent = `Not quite. Correct answer: ${correctLabel}.`;
      }

      if (nextQuizBtn) nextQuizBtn.disabled = false;
    });
  });
}

function ensureQuizVisible() {
  if (!quizArea) return;
  quizArea.hidden = false;
  if (startQuizBtn) startQuizBtn.hidden = true;
}

function startQuiz() {
  if (!quizArea || !startQuizBtn) return;

  quizOrder = shuffleInPlace(Array.from({ length: WORDS.length }, (_, n) => n));
  quizQuestionIndex = 0;
  quizScore = 0;

  ensureQuizVisible();
  renderQuizQuestion();
}

if (startQuizBtn) {
  startQuizBtn.addEventListener("click", startQuiz);
}

if (nextQuizBtn) {
  nextQuizBtn.addEventListener("click", () => {
    if (quizQuestionIndex < QUIZ_TOTAL - 1) {
      quizQuestionIndex++;
      renderQuizQuestion();
    } else {
      showFinalScore();
    }
  });
}

document.documentElement.lang = PRACTICE_LANG;
setHint();
updateUI();

window.addEventListener("beforeunload", () => {
  try {
    stopMeter();
    stopMicStream();
    window.speechSynthesis?.cancel?.();
  } catch {}
});
