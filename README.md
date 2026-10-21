# Bootcamp Leaderboard

Live team standings for the EDURS Robotics & IoT Bootcamp, on the road to the BUMFA TRIALS.
A static site (no build step, no server) that reads its scores from a Google Sheet.

- `index.html`: the board
- `index.html?live`: big-screen mode for the competition floor (rankings only, refreshes every 20 s)

## Scoring

From class 2 onwards, each team earns:

| Category | How | Points |
|---|---|---|
| Attendance | at least one member present | +1 per class |
| Assignment | team homework handed in | +1 |
| In-class quiz | quiz done in class | +1 |

## Entering scores (admins)

Scores are entered at **`/admin`**, behind a password. The board reads them from
`/api/board` and refreshes every 60 s (20 s in live mode).

On the admin page:

- pick a class tab (or **+ Class** for a new one),
- click a cell to switch it between 0 and 1, or use **+ / −** for extra points,
- **Everyone present** fills attendance for the whole class,
- rename teams, change avatars, add or remove teams under **Teams**,
- **Save** (or Ctrl/⌘ + S). If two admins edit at once, the second save is refused
  instead of overwriting the first; reload to get their changes.

### One-time setup in Vercel

1. **Storage:** project → *Storage* → *Create Database* → **Upstash for Redis** (free plan)
   → connect it to this project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
2. **Password:** project → *Settings → Environment Variables* → add `ADMIN_PASSWORD`
   (and optionally `SESSION_SECRET`, any long random string; otherwise the password signs sessions).
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the functions pick the variables up.

The first time the admin page loads, it starts from the Day 2 scores in `data/seed.json`.
Until storage is connected, the board falls back to `data/teams.csv` and `data/scores.csv`
(or to published Google Sheet CSVs, if links are set in `assets/config.js`).

### Running it locally

```
node tools/dev-server.mjs
```

Opens on http://localhost:8787 with an in-memory store; the admin password is `admin`.

## Hosting

Vercel: *Add New > Project*, import this repo, set *Framework Preset* to **Other**,
leave the build command empty and the output directory as the root, then *Deploy*.
Every push to `main` redeploys. (GitHub Pages also works: *Settings > Pages > `main` / root*.)

## The robot figures

The three bots are isometric SVGs drawn from the bootcamp kit (ESP32, L298N, 2 × TT
motor, 65 mm wheels, caster, 4 × 18650, LM2596, DPDT switch, IR sensors) with the
[Anatomy](https://github.com/wheresryan22/anatomy) kit (MIT, vendored in `tools/anatomy`).
To change them, edit `tools/build-bots.mjs` and run:

```
node tools/build-bots.mjs
```

The page loads the output from `assets/bots/`. Each figure is a small scene that plays
on hover (tap on phones): the sumo bot pushes another bot off the ring, the soccer bot
scores and celebrates, and the obstacle bot pings a box, stops and turns. The motion
lives in `assets/scenes.js` and stays off under the system's reduced-motion setting.
