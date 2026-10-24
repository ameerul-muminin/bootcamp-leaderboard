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
   → connect it to this project with **Production** ticked. Vercel's **Redis** integration
   (a `REDIS_URL`) works too; any variable prefix is found.
2. **Password:** project → *Settings → Environment Variables* → add `ADMIN_PASSWORD`
   (and optionally `SESSION_SECRET`, any long random string; otherwise the password signs sessions).
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the functions pick the variables up.

If sign-in still fails, the admin page lists what is missing. `/api/session` shows the same
check: which storage and password variable names the deployment can see (never their values)
and whether the database answers.

The first time the admin page loads, it starts from the Day 2 scores in `api/_seed.js`.
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
motor, 65 mm wheels, caster, 4 × 18650, LM2596, DPDT switch) with the
[Anatomy](https://github.com/wheresryan22/anatomy) kit (MIT, vendored in `tools/anatomy`).
To change them, edit `tools/build-bots.mjs` and run:

```
node tools/build-bots.mjs
```

The page loads the output from `assets/bots/`. Each figure is a small scene that plays
on hover (tap on phones): each bot is driven from a phone over Bluetooth (the pressed
button lights up and signal waves travel to the ESP32): the sumo bot pushes another bot
off the ring, the soccer bot scores and celebrates, and the obstacle course bot follows
forward, left and right commands past cones to the finish line. The motion
lives in `assets/scenes.js` and stays off under the system's reduced-motion setting.
