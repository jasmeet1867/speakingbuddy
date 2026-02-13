const languageGroup = document.getElementById("languageGroup");
const difficultyGroup = document.getElementById("difficultyGroup");
const categoriesGrid = document.getElementById("categoriesGrid");

const STORAGE_LANG = "selectedLanguage";
const STORAGE_DIFFICULTY = "selectedDifficulty";

// Emoji map for known categories
const CATEGORY_EMOJI = {
  greetings: "👋",
  animals: "🐾",
  house: "🏠",
  outdoor: "🌳",
  family: "👨‍👩‍👧",
  food: "🍔",
  drinks: "🥤",
  colours: "🎨",
};

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

function renderCategories(categories) {
  if (!categoriesGrid) return;
  categoriesGrid.innerHTML = "";

  categories.forEach((cat) => {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const emoji = CATEGORY_EMOJI[cat.name] || "📚";
    card.innerHTML = `<span class="emoji">${emoji}</span> <span>${cat.display_name}</span><br><span class="small">${cat.word_count} word${cat.word_count !== 1 ? "s" : ""}</span>`;

    const go = () => {
      const { lang, difficulty } = getState();
      window.location.href = `topic.html?category=${encodeURIComponent(cat.name)}&lang=${encodeURIComponent(lang)}&mode=${encodeURIComponent(difficulty)}`;
    };

    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });

    categoriesGrid.appendChild(card);
  });
}

async function loadCategories() {
  try {
    const categories = await fetchCategories();
    renderCategories(categories);
  } catch (err) {
    console.error("Failed to load categories:", err);
    if (categoriesGrid) {
      categoriesGrid.innerHTML = `<div class="card" style="grid-column:1/-1;color:var(--muted)">⚠ Could not load categories. Is the backend running?</div>`;
    }
  }
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
  loadCategories();
})();
