const languageGroup = document.getElementById("languageGroup");
const STORAGE_KEY = "selectedLanguage";

const translations = {
  en: {
    brandTitle: "Pronounce",
    brandSubtitle: "Language Practice",
    login: "Login",
    signup: "Sign Up",
    heroTitle: 'Practice <span>Pronunciation</span>',
    heroSubtitle: "Choose your difficulty, translation language, and start practicing real-world words.",
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
    heroSubtitle: "Choisissez la difficulté, la langue de traduction et commencez à pratiquer des mots du quotidien.",
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
  }
};

function applyLanguage(lang) {
  const dict = translations[lang] || translations.en;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (!dict[key]) return;

    // If text includes HTML tags (like <span>), use innerHTML
    if (dict[key].includes("<")) el.innerHTML = dict[key];
    else el.textContent = dict[key];
  });

  // update html lang attribute
  document.documentElement.lang = lang;

  localStorage.setItem(STORAGE_KEY, lang);
}

function setActiveLanguageButton(lang) {
  languageGroup.querySelectorAll(".pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

if (languageGroup) {
  // Load saved
  const saved = localStorage.getItem(STORAGE_KEY) || "en";
  setActiveLanguageButton(saved);
  applyLanguage(saved);

  languageGroup.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    const lang = btn.dataset.lang;

    setActiveLanguageButton(lang);
    applyLanguage(lang);
  });
}
