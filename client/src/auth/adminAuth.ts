const KEY = "isAdmin";

export function isAdmin(): boolean {
  return sessionStorage.getItem(KEY) === "true";
}

export function setAdmin(value: boolean) {
  sessionStorage.setItem(KEY, value ? "true" : "false");
}

export async function adminLogin(password: string): Promise<boolean> {
  const res = await fetch("/.netlify/functions/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  return res.ok;
}

export function adminLogout() {
  sessionStorage.removeItem(KEY);
}
