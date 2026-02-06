const languageGroup = document.getElementById("languageGroup");
const difficultyGroup = document.getElementById("difficultyGroup");

const STORAGE_LANG = "selectedLanguage";
const STORAGE_DIFFICULTY = "selectedDifficulty";

function setTranslationTarget(lang) {
  localStorage.setItem(STORAGE_LANG, lang);
}

function setActiveLanguageButton(lang) {
  if (!languageGroup) return;
  languageGroup.querySelectorAll(".pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

function setActiveDifficultyButton(mode) {
  if (!difficultyGroup) return;
  difficultyGroup.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  localStorage.setItem(STORAGE_DIFFICULTY, mode);
}

function getState() {
  return {
    lang: localStorage.getItem(STORAGE_LANG) || "en",
    difficulty: localStorage.getItem(STORAGE_DIFFICULTY) || "text",
  };
}

function wireCategories() {
  const cards = document.querySelectorAll(".categories .card");
  if (!cards.length) return;

  const categoryIds = [
    "greetings",
    "animals",
    "home",
    "travel",
    "family",
    "food",
    "numbers",
    "colors",
  ];

  cards.forEach((card, i) => {
    const category = categoryIds[i] || `cat${i + 1}`;
    card.dataset.category = category;

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const go = () => {
      const { lang, difficulty } = getState();

      // ✅ Greetings → greeting/greetings.html with params
      if (category === "greetings") {
        window.location.href = `greeting/greetings.html?lang=${encodeURIComponent(
          lang
        )}&mode=${encodeURIComponent(difficulty)}`;
        return;
      }

      // Other categories → their own folder page with params
      window.location.href = `${encodeURIComponent(
        category
      )}/${encodeURIComponent(category)}.html?lang=${encodeURIComponent(
        lang
      )}&mode=${encodeURIComponent(difficulty)}`;
    };

    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });
}

function wireDifficulty() {
  if (!difficultyGroup) return;

  difficultyGroup.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn) return;

    setActiveDifficultyButton(btn.dataset.mode);
  });
}

function wireLanguages() {
  if (!languageGroup) return;

  languageGroup.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;

    const lang = btn.dataset.lang;
    setActiveLanguageButton(lang);
    setTranslationTarget(lang);
  });
}

(function init() {
  const { lang, difficulty } = getState();

  setActiveLanguageButton(lang);
  setActiveDifficultyButton(difficulty);

  wireLanguages();
  wireDifficulty();
  wireCategories();
})();
