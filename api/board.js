// GET  /api/board  → the whole board, for everyone.
// PUT  /api/board  → replace it (admins only). Send the `rev` you loaded; a stale rev gets 409.
import { bodyOf, clean, isAdmin, readBoard, send, storageReady, writeBoard } from "./_lib.js";

export default async function handler(req, res) {
  if (!storageReady()) return send(res, 503, { error: "Storage is not set up yet." });
  try {
    if (req.method === "GET") return send(res, 200, await readBoard());
    if (req.method !== "PUT") return send(res, 405, { error: "Method not allowed" }, { Allow: "GET, PUT" });
    if (!isAdmin(req)) return send(res, 401, { error: "Sign in first." });
    const body = await bodyOf(req);
    const current = await readBoard();
    if (Number(body.rev) !== Number(current.rev || 0)) {
      return send(res, 409, { error: "Someone else saved in the meantime. Reload to get their changes.", board: current });
    }
    const next = { ...clean(body), rev: (current.rev || 0) + 1, updatedAt: new Date().toISOString() };
    await writeBoard(next);
    return send(res, 200, next);
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: "Could not reach storage." });
  }
}
