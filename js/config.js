/**
 * SpeakingBuddy – API configuration
 *
 * When served from FastAPI (port 8000) we use relative paths (same origin).
 * When served from Live Server (port 5500/5501) we need the full URL.
 */
const API_BASE_URL = location.port === "8000" ? "" : "http://localhost:8000";
