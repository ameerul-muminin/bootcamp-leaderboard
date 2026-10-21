// Shared helpers for the API routes (files starting with "_" are not routes on Vercel).
import { createHmac, timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";

const seed = createRequire(import.meta.url)("../data/seed.json");

const KEY = "board";
const SESSION_HOURS = 12;

// ---- Storage: one JSON document in Upstash Redis, over its REST API.
// Vercel's Upstash integration sets KV_REST_API_*; a direct Upstash setup sets UPSTASH_REDIS_REST_*.
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storageReady = () => Boolean(REDIS_URL && REDIS_TOKEN);

async function redis(command) {
  const response = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`Redis ${command[0]} failed: ${response.status}`);
  return (await response.json()).result;
}

export async function readBoard() {
  const raw = await redis(["GET", KEY]);
  return raw ? JSON.parse(raw) : structuredClone(seed);
}

export async function writeBoard(board) {
  await redis(["SET", KEY, JSON.stringify(board)]);
}

// ---- Admin session: a signed, expiring token in an HttpOnly cookie.
const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
const sign = (value) => createHmac("sha256", SECRET).update(value).digest("base64url");
const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export const passwordSet = () => Boolean(process.env.ADMIN_PASSWORD);
export const passwordMatches = (given) => passwordSet() && same(given || "", process.env.ADMIN_PASSWORD);

export function sessionCookie() {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const token = `${expires}.${sign(String(expires))}`;
  return `admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export const clearCookie = () => "admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";

export function isAdmin(req) {
  if (!passwordSet()) return false;
  const cookie = String(req.headers.cookie || "").split(/;\s*/).find((part) => part.startsWith("admin="));
  if (!cookie) return false;
  const [expires, mac] = cookie.slice(6).split(".");
  return Number(expires) > Date.now() && same(mac, sign(expires));
}

// ---- Request and response plumbing that works on Vercel and in tools/dev-server.mjs.
export async function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  let text = "";
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}

export function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(data));
}

// ---- Validation: keep only known shapes, numbers in a sane range, and teams that exist.
const points = (value) => Math.max(0, Math.min(10, Math.round(Number(value) || 0)));
const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function clean(input) {
  const teams = [];
  const seen = new Set();
  for (const team of Array.isArray(input?.teams) ? input.teams.slice(0, 40) : []) {
    const name = String(team?.name || "").trim().slice(0, 40);
    if (!name) continue;
    let id = slug(team.id || name) || slug(name);
    while (seen.has(id)) id += "-2";
    seen.add(id);
    teams.push({ id, name, avatar: String(team?.avatar || "").trim().slice(0, 30) });
  }
  const days = {};
  for (const [day, scores] of Object.entries(input?.days || {})) {
    const n = Math.round(Number(day));
    if (!(n >= 1 && n <= 30) || typeof scores !== "object") continue;
    days[n] = {};
    for (const [id, s] of Object.entries(scores || {})) {
      if (!seen.has(id)) continue;
      days[n][id] = { attendance: points(s?.attendance), assignment: points(s?.assignment), quiz: points(s?.quiz) };
    }
  }
  return { teams, days };
}
