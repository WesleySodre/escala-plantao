exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data = {};
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid JSON" }) };
  }

  const password = String(data.password || "");
  const expected = process.env.ADMIN_PASSWORD || "";

  if (!expected) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "ADMIN_PASSWORD not set" }) };
  }

  if (password === expected) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 401, body: JSON.stringify({ success: false }) };
};
