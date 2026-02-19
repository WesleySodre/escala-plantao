export const handler = async (event) => {
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
  const jwtSecret = process.env.ADMIN_JWT_SECRET || "";

  if (!expected) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "ADMIN_PASSWORD not set" }) };
  }
  if (!jwtSecret) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "ADMIN_JWT_SECRET not set" }) };
  }

  if (password !== expected) {
    return { statusCode: 401, body: JSON.stringify({ success: false }) };
  }

  const { SignJWT } = await import("jose");
  const secretKey = new TextEncoder().encode(jwtSecret);

  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secretKey);

  return { statusCode: 200, body: JSON.stringify({ success: true, token }) };
};
