// GET    /api/session → { admin, ready, check } for the admin page (check lists variable names, never values).
// POST   /api/session → sign in with { password }.
// DELETE /api/session → sign out.
import { bodyOf, clearCookie, diagnose, isAdmin, passwordMatches, passwordSet, send, sessionCookie, storageReady } from "./_lib.js";

export default async function handler(req, res) {
  const ready = { password: passwordSet(), storage: storageReady() };
  if (req.method === "GET") return send(res, 200, { admin: isAdmin(req), ready, check: await diagnose() });
  if (req.method === "DELETE") return send(res, 200, { admin: false, ready }, { "Set-Cookie": clearCookie() });
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" }, { Allow: "GET, POST, DELETE" });
  if (!ready.password) return send(res, 503, { error: "ADMIN_PASSWORD is not set in Vercel yet.", ready });
  const { password } = await bodyOf(req).catch(() => ({}));
  if (!passwordMatches(password)) {
    await new Promise((resolve) => setTimeout(resolve, 600)); // slows down guessing
    return send(res, 401, { error: "Wrong password." });
  }
  return send(res, 200, { admin: true, ready }, { "Set-Cookie": sessionCookie() });
}
