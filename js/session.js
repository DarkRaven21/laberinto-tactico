const SESSION_KEY = "session:character";

export function saveSession(character) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    id: character.id,
    session_token: character.session_token
  }));
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !parsed.id || !parsed.session_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function requireSession() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}
