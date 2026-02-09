(function (global) {
  "use strict";

  function createTranslationQuiz(config) {
    if (!config) return null;

    const {
      words,
      targetLang,
      limit,
      ids,
      showIntro = false,
    } = config;

    if (!Array.isArray(words) || !ids) return null;

    const startQuizBtn = document.getElementById(ids.startBtn);
    const quizArea = document.getElementById(ids.area);
    const quizCount = document.getElementById(ids.count);
    const quizScoreEl = document.getElementById(ids.score);
    const quizWord = document.getElementById(ids.word);
    const quizOptions = document.getElementById(ids.options);
    const quizFeedback = document.getElementById(ids.feedback);
    const nextQuizBtn = document.getElementById(ids.nextBtn);

    if (!quizArea || !quizWord || !quizOptions || !quizFeedback || !nextQuizBtn) {
      return null;
    }

    const QUIZ_TOTAL = typeof limit === "number" && limit > 0
      ? Math.min(limit, words.length)
      : words.length;

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
      return ({ en: "English", fr: "French", de: "Deutsch" }[targetLang]) || "English";
    }

    function getTranslationFor(idx) {
      const item = words[idx];
      return (item && item.translations && item.translations[targetLang]) || "";
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

      const candidateIdxs = Array.from({ length: words.length }, (_, n) => n).filter(
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
      quizOptions.innerHTML = "";
      quizFeedback.textContent = "";
      nextQuizBtn.disabled = true;
    }

    function setQuizMeta() {
      if (quizCount) {
        quizCount.textContent = `Question ${quizQuestionIndex + 1}/${QUIZ_TOTAL}`;
      }
      if (quizScoreEl) {
        quizScoreEl.textContent = `Score: ${quizScore}/${QUIZ_TOTAL}`;
      }
    }

    function showFinalScore() {
      quizFeedback.textContent = `Finished! Your score: ${quizScore}/${QUIZ_TOTAL}.`;
      nextQuizBtn.disabled = true;
    }

    function renderQuizQuestion() {
      resetQuizUI();
      quizAnswered = false;
      quizCurrentWordIndex = quizOrder[quizQuestionIndex];

      setQuizMeta();

      const item = words[quizCurrentWordIndex];
      quizWord.textContent = item.text;

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
            quizFeedback.textContent = "✅ Correct! Nice job.";
          } else {
            btn.classList.add("wrong");
            const correctBtn = quizOptions.querySelector('.opt[data-correct="1"]');
            if (correctBtn) correctBtn.classList.add("correct");
            const correctLabel = getTranslationFor(quizCurrentWordIndex);
            quizFeedback.textContent = `Not quite. Correct answer: ${correctLabel}.`;
          }

          nextQuizBtn.disabled = false;
        });
      });
    }

    function ensureQuizVisible() {
      quizArea.hidden = false;
    }

    function startQuiz() {
      if (!words.length) return;

      quizOrder = shuffleInPlace(Array.from({ length: words.length }, (_, n) => n)).slice(0, QUIZ_TOTAL);
      quizQuestionIndex = 0;
      quizScore = 0;

      ensureQuizVisible();
      renderQuizQuestion();
    }

    if (showIntro) {
      quizFeedback.textContent = `Quiz answers are in ${getTargetLabel()}.`;
    }

    if (startQuizBtn) {
      startQuizBtn.addEventListener("click", () => {
        startQuiz();
        startQuizBtn.textContent = "Restart Quiz";
      });
    }

    nextQuizBtn.addEventListener("click", () => {
      if (quizQuestionIndex < QUIZ_TOTAL - 1) {
        quizQuestionIndex++;
        renderQuizQuestion();
      } else {
        showFinalScore();
      }
    });

    return {
      startQuiz,
    };
  }

  global.createTranslationQuiz = createTranslationQuiz;
})(window);
