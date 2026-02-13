/**
 * SpeakingBuddy – API client module
 *
 * Shared functions for calling the backend.
 * Depends on API_BASE_URL from js/config.js (loaded before this script).
 */

async function fetchCategories() {
  const res = await fetch(`${API_BASE_URL}/api/categories`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  return res.json(); // [{id, name, display_name, image_url, word_count}, ...]
}

async function fetchWords(categoryName, lang = "en") {
  const res = await fetch(
    `${API_BASE_URL}/api/categories/${encodeURIComponent(categoryName)}/words?lang=${encodeURIComponent(lang)}`
  );
  if (!res.ok) throw new Error(`Failed to fetch words: ${res.status}`);
  return res.json(); // [{id, word_lb, translation, gender, audio_url}, ...]
}

function getAudioUrl(wordId) {
  return `${API_BASE_URL}/api/audio/${wordId}`;
}

async function checkPronunciation(wordId, audioBlob) {
  const form = new FormData();
  form.append("word_id", String(wordId));
  form.append("audio", audioBlob, "recording.webm");

  console.log("[API] POST /api/pronunciation/check  word_id:", wordId, "blob size:", audioBlob.size);

  const res = await fetch(`${API_BASE_URL}/api/pronunciation/check`, {
    method: "POST",
    body: form,
  });

  console.log("[API] Response status:", res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error("[API] Error body:", text);
    throw new Error(`Pronunciation check failed: ${res.status} — ${text}`);
  }
  return res.json(); // {score, feedback, breakdown, improvements, suggestions}
}
