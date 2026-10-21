// Shared helpers for the API routes (files starting with "_" are not routes on Vercel).
import { createHmac, timingSafeEqual } from "node:crypto";
import { connect as plainConnect } from "node:net";
import { connect as tlsConnect } from "node:tls";
import seed from "./_seed.js";

const KEY = "board";
const SESSION_HOURS = 12;

// ---- Storage: one JSON document in Redis (Upstash over REST, or any Redis over TCP).
// Vercel's storage integrations name their variables differently (KV_REST_API_*, a custom
// prefix, UPSTASH_REDIS_REST_*, or only a redis:// URL), so look for any of them.
function findRedis(env = process.env) {
  const keys = Object.keys(env).sort();
  for (const key of keys) {
    const rest = key.match(/^(.*)REST_API_URL$/) || key.match(/^(.*)UPSTASH_REDIS_REST_URL$/);
    if (!rest || !env[key]) continue;
    const tokenKey = key.replace(/URL$/, "TOKEN");
    if (env[tokenKey]) return { url: env[key], token: env[tokenKey], from: key };
  }
  // An Upstash redis:// URL carries the REST token as its password and the REST host as its host.
  for (const key of keys.filter((k) => /(REDIS|KV)_URL$/.test(k))) {
    try {
      const url = new URL(env[key]);
      if (url.hostname.endsWith("upstash.io") && url.password) {
        return { url: `https://${url.hostname}`, token: decodeURIComponent(url.password), from: key };
      }
      if (/^rediss?:$/.test(url.protocol)) return { tcp: url, from: key };
    } catch {}
  }
  return null;
}

// A minimal Redis client over TCP for plain redis:// URLs (Vercel's Redis integration):
// one connection per call, AUTH if the URL has a password, then one command.
function tcpCommand(url, command) {
  const encode = (args) => `*${args.length}\r\n` + args.map((a) => { const b = Buffer.from(String(a)); return `$${b.length}\r\n${b}\r\n`; }).join("");
  const steps = [];
  if (url.password) steps.push(url.username && url.username !== "default" ? ["AUTH", decodeURIComponent(url.username), decodeURIComponent(url.password)] : ["AUTH", decodeURIComponent(url.password)]);
  steps.push(command);
  return new Promise((resolve, reject) => {
    const options = { host: url.hostname, port: Number(url.port) || 6379, servername: url.hostname };
    const socket = url.protocol === "rediss:" ? tlsConnect(options) : plainConnect(options);
    const timer = setTimeout(() => { socket.destroy(); reject(new Error("Redis timed out")); }, 8000);
    let buffer = Buffer.alloc(0);
    const replies = [];
    // Parses one reply from the front of the buffer; returns [value, rest] or null if incomplete.
    const parse = (buf) => {
      const end = buf.indexOf("\r\n");
      if (end < 0) return null;
      const type = String.fromCharCode(buf[0]);
      const line = buf.subarray(1, end).toString();
      const rest = buf.subarray(end + 2);
      if (type === "+") return [line, rest];
      if (type === ":") return [Number(line), rest];
      if (type === "-") return [new Error(line), rest];
      if (type === "$") {
        const n = Number(line);
        if (n < 0) return [null, rest];
        if (rest.length < n + 2) return null;
        return [rest.subarray(0, n).toString(), rest.subarray(n + 2)];
      }
      return [new Error(`Unexpected Redis reply ${type}`), Buffer.alloc(0)];
    };
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (let next; (next = parse(buffer)); ) { replies.push(next[0]); buffer = next[1]; }
      if (replies.length >= steps.length) {
        clearTimeout(timer);
        socket.end();
        const failed = replies.find((r) => r instanceof Error);
        failed ? reject(new Error(`Redis: ${failed.message}`)) : resolve(replies.at(-1));
      }
    });
    socket.on("error", (error) => { clearTimeout(timer); reject(error); });
    socket.write(steps.map(encode).join(""));
  });
}

const STORE = findRedis();
const REDIS_URL = STORE?.url;
const REDIS_TOKEN = STORE?.token;

export const storageReady = () => Boolean(STORE);

// For the admin page's setup check: which variables exist (names only, never values)
// and whether storage answers.
export async function diagnose() {
  const seen = Object.keys(process.env).filter((k) => /REDIS|^KV_|UPSTASH|ADMIN_PASSWORD|SESSION_SECRET/.test(k)).sort();
  let storageOk = false, storageError = "";
  if (STORE) {
    try { storageOk = (await redis(["PING"])) === "PONG"; } catch (error) { storageError = error.message; }
  }
  return { variables: seen, storageFrom: STORE?.from || null, storageOk, storageError };
}

async function redis(command) {
  if (STORE.tcp) return tcpCommand(STORE.tcp, command);
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
const SECRET = String(process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "").trim();
const sign = (value) => createHmac("sha256", SECRET).update(value).digest("base64url");
const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

// Trimmed on both sides: a pasted password often carries a stray space or newline.
const PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();
export const passwordSet = () => Boolean(PASSWORD);
export const passwordMatches = (given) => passwordSet() && same(String(given || "").trim(), PASSWORD);

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
