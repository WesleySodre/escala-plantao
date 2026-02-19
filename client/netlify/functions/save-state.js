export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Exige JWT valido de admin
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.replace("Bearer ", "").trim();
  const jwtSecret = process.env.ADMIN_JWT_SECRET || "";

  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ success: false, error: "Unauthorized" }) };
  }

  if (!jwtSecret) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "ADMIN_JWT_SECRET not set" }) };
  }

  try {
    const { jwtVerify } = await import("jose");
    const secretKey = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    if (payload?.admin !== true) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: "Unauthorized" }) };
    }
  } catch {
    return { statusCode: 401, body: JSON.stringify({ success: false, error: "Unauthorized" }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid JSON" }) };
  }

  const data = body.data;
  if (typeof data === "undefined") {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing data" }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Supabase env not set" }) };
  }

  const url = `${SUPABASE_URL}/rest/v1/app_state?id=eq.1`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ data }),
  });

  const text = await res.text();
  if (!res.ok) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: text }) };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
