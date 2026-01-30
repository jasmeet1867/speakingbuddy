const languageGroup = document.getElementById("languageGroup");
const difficultyGroup = document.getElementById("difficultyGroup");

const STORAGE_LANG = "selectedLanguage";
const STORAGE_DIFFICULTY = "selectedDifficulty";

const translations = {
  en: {
    brandTitle: "Pronounce",
    brandSubtitle: "Language Practice",
    login: "Login",
    signup: "Sign Up",
    heroTitle: 'Practice <span>Pronunciation</span>',
    heroSubtitle:
      "Choose your difficulty, translation language, and start practicing real-world words.",
    settingsTitle: "Practice Settings",
    difficultyLabel: "Difficulty Mode",
    withText: "With Text",
    audioOnly: "Audio Only",
    languageLabel: "Translation Language",
    categoryTitle: "Choose a Category",
    tenWords: "10 words",
    catGreetings: "Greetings",
    catAnimals: "Animals",
    catHome: "Home",
    catTravel: "Travel",
    catFamily: "Family",
    catFood: "Food",
    catNumbers: "Numbers",
    catColors: "Colors",
  },

  fr: {
    brandTitle: "Prononce",
    brandSubtitle: "Pratique de langue",
    login: "Connexion",
    signup: "S’inscrire",
    heroTitle: 'Pratiquer la <span>prononciation</span>',
    heroSubtitle:
      "Choisissez la difficulté, la langue de traduction et commencez à pratiquer des mots du quotidien.",
    settingsTitle: "Paramètres d’entraînement",
    difficultyLabel: "Mode de difficulté",
    withText: "Avec texte",
    audioOnly: "Audio seulement",
    languageLabel: "Langue de traduction",
    categoryTitle: "Choisir une catégorie",
    tenWords: "10 mots",
    catGreetings: "Salutations",
    catAnimals: "Animaux",
    catHome: "Maison",
    catTravel: "Voyage",
    catFamily: "Famille",
    catFood: "Nourriture",
    catNumbers: "Nombres",
    catColors: "Couleurs",
  },

  de: {
    brandTitle: "Aussprache",
    brandSubtitle: "Sprachübung",
    login: "Anmelden",
    signup: "Registrieren",
    heroTitle: '<span>Aussprache</span> üben',
    heroSubtitle: "Wähle Schwierigkeit und Sprache und übe Wörter aus dem Alltag.",
    settingsTitle: "Übungseinstellungen",
    difficultyLabel: "Schwierigkeitsmodus",
    withText: "Mit Text",
    audioOnly: "Nur Audio",
    languageLabel: "Übersetzungssprache",
    categoryTitle: "Kategorie auswählen",
    tenWords: "10 Wörter",
    catGreetings: "Begrüßungen",
    catAnimals: "Tiere",
    catHome: "Zuhause",
    catTravel: "Unterwegs",
    catFamily: "Familie",
    catFood: "Essen",
    catNumbers: "Zahlen",
    catColors: "Farben",
  },
};

function applyLanguage(lang) {
  const dict = translations[lang] || translations.en;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!dict[key]) return;

    if (dict[key].includes("<")) el.innerHTML = dict[key];
    else el.textContent = dict[key];
  });

  document.documentElement.lang = lang;
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

      // Other categories → practice.html (later)
      window.location.href = `practice.html?category=${encodeURIComponent(
        category
      )}&lang=${encodeURIComponent(lang)}&mode=${encodeURIComponent(difficulty)}`;
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
    applyLanguage(lang);
  });
}

(function init() {
  const { lang, difficulty } = getState();

  setActiveLanguageButton(lang);
  applyLanguage(lang);
  setActiveDifficultyButton(difficulty);

  wireLanguages();
  wireDifficulty();
  wireCategories();
})();
