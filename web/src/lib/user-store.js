// The user's own state (liked jobs, tracker, onboarding answers). Kept in the
// browser for now; when sign-in exists this moves to Supabase tables keyed by
// user id, behind these same functions.
const KEY = "aligned:v1";

function read() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function getUser(field, fallback) {
  if (typeof window === "undefined") return fallback;
  const v = read()[field];
  return v === undefined ? fallback : v;
}

export function setUser(field, value) {
  try {
    const all = read();
    all[field] = value;
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable (private mode): state lasts for this visit only */
  }
}
