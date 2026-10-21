// Local preview with the admin API: node tools/dev-server.mjs [port]
// Serves the site, routes /api/* to the Vercel functions, and stands in for
// Upstash Redis with an in-memory store unless real KV_REST_API_* are set.
// The admin password defaults to "admin" here.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.argv[2]) || 8787;
const memory = new Map();

process.env.ADMIN_PASSWORD ||= "admin";
if (!process.env.KV_REST_API_URL) {
  process.env.KV_REST_API_URL = `http://localhost:${PORT}/__redis`;
  process.env.KV_REST_API_TOKEN = "local";
}

const routes = {
  "/api/board": (await import("../api/board.js")).default,
  "/api/session": (await import("../api/session.js")).default,
};
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".csv": "text/csv", ".svg": "image/svg+xml", ".png": "image/png" };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/__redis") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const [command, key, value] = JSON.parse(body);
    const result = command === "GET" ? memory.get(key) ?? null : (memory.set(key, value), "OK");
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ result }));
  }
  const route = routes[url.pathname.replace(/\/$/, "")];
  if (route) return route(req, res);
  const path = normalize(join(ROOT, url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/admin$/, "/admin.html")));
  if (!path.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  try {
    const file = await readFile(path);
    res.setHeader("Content-Type", TYPES[extname(path)] || "application/octet-stream");
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}  (admin: /admin, password "${process.env.ADMIN_PASSWORD}")`));
