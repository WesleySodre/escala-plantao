const KEY = "isAdmin";
const JWT_KEY = "adminJwt";

export function isAdmin(): boolean {
  return sessionStorage.getItem(KEY) === "true" && Boolean(sessionStorage.getItem(JWT_KEY));
}

export function setAdmin(value: boolean) {
  sessionStorage.setItem(KEY, value ? "true" : "false");
}

export function getAdminJwt(): string | null {
  return sessionStorage.getItem(JWT_KEY);
}

export async function adminLogin(password: string): Promise<boolean> {
  try {
    const res = await fetch("/.netlify/functions/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) return false;

    const payload = (await res.json()) as { token?: string };
    const token = typeof payload?.token === "string" ? payload.token : "";
    if (!token) return false;

    sessionStorage.setItem(JWT_KEY, token);
    setAdmin(true);
    return true;
  } catch {
    return false;
  }
}

export function adminLogout() {
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(JWT_KEY);
}
