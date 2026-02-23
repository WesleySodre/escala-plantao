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

  const historyId = Number(body.historyId);
  if (!Number.isFinite(historyId) || historyId <= 0) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing historyId" }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Supabase env not set" }) };
  }

  const supabaseHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  const historyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/app_state_history?id=eq.${historyId}&select=id,data`,
    { headers: supabaseHeaders }
  );
  const historyText = await historyRes.text();
  if (!historyRes.ok) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: historyText }) };
  }

  let historyRows = [];
  try {
    historyRows = JSON.parse(historyText);
  } catch {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Invalid history response" }) };
  }

  if (!Array.isArray(historyRows) || historyRows.length === 0) {
    return { statusCode: 404, body: JSON.stringify({ success: false, error: "History not found" }) };
  }

  const historyData = historyRows[0]?.data ?? {};

  const currentRes = await fetch(
    `${SUPABASE_URL}/rest/v1/app_state?id=eq.1&select=data,updated_at`,
    { headers: supabaseHeaders }
  );
  const currentText = await currentRes.text();
  if (!currentRes.ok) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: currentText }) };
  }

  let currentData = {};
  try {
    const rows = JSON.parse(currentText);
    if (Array.isArray(rows) && rows.length > 0) {
      currentData = rows[0]?.data ?? {};
    }
  } catch {
    currentData = {};
  }

  const historyBackupRes = await fetch(`${SUPABASE_URL}/rest/v1/app_state_history`, {
    method: "POST",
    headers: {
      ...supabaseHeaders,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      data: currentData ?? {},
      changed_by: "admin",
      note: "auto backup before restore",
    }),
  });

  const historyBackupText = await historyBackupRes.text();
  if (!historyBackupRes.ok) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: historyBackupText }) };
  }

  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/app_state?id=eq.1`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ data: historyData ?? {} }),
  });

  const updateText = await updateRes.text();
  if (!updateRes.ok) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: updateText }) };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
