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

  const password = String(data.password || "").trim();
  const expected = String(process.env.ADMIN_PASSWORD || "").trim();
  const jwtSecret = process.env.ADMIN_JWT_SECRET || "";

  if (!password) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Password required" }) };
  }

  if (!expected) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "ADMIN_PASSWORD not set" }) };
  }

  if (!jwtSecret) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "ADMIN_JWT_SECRET not set" }) };
  }

  if (password === expected) {
    const { SignJWT } = await import("jose");
    const secretKey = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({ admin: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30m")
      .sign(secretKey);
    return { statusCode: 200, body: JSON.stringify({ success: true, token }) };
  }

  return { statusCode: 401, body: JSON.stringify({ success: false }) };
};
