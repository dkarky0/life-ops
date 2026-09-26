export const TOKEN_KEY = "lifeops_token";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  const token = getStoredToken();
  return {
    ...(extra || {}),
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
          "X-Lifeops-Token": token,
        }
      : {}),
  };
}

export async function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const extra = apiHeaders();
  Object.entries(extra).forEach(([k, v]) => {
    if (v != null && !headers.has(k)) headers.set(k, String(v));
  });
  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}
