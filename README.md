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

## Connecting the Google Sheet

The board reads two tabs, published as CSV. Publishing only these two tabs keeps
the form responses (bKash IDs, member names) private.

### 1. `Teams` tab

Add a tab named `Teams` and put this formula in `A1`. It mirrors the form, so a new
registration shows up on its own:

```
=QUERY('Form Responses 1'!B:C, "select C, B where C is not null label C 'Team', B 'Avatar'", 1)
```

### 2. `Scores` tab

Add a tab named `Scores` with one row per team per class:

| Day | Team | Attendance | Assignment | Quiz | Note |
|---|---|---|---|---|---|
| 2 | Phoenix | 1 | 1 | 0 | |

`data/scores.csv` holds Day 2 already: import it with *File > Import > Upload >
Insert new sheet*, then rename the tab to `Scores`. Team names must match the
`Teams` tab (case and spaces are ignored). Points can be any number, so a quiz worth 2 also works.

### 3. Publish and paste the links

*File > Share > Publish to web*, choose the `Teams` tab and *Comma-separated values (.csv)*,
publish, and copy the link. Do the same for `Scores`. Paste both into `assets/config.js`:

```js
teamsCsv: "https://docs.google.com/spreadsheets/d/e/…/pub?gid=…&single=true&output=csv",
scoresCsv: "https://docs.google.com/spreadsheets/d/e/…/pub?gid=…&single=true&output=csv",
```

The status in the top-right corner says **Live from sheet** once both load. Google
refreshes published CSVs within about five minutes of an edit; the board re-reads every
60 s (20 s in live mode). If the sheet can't be reached, the board falls back to `data/`.

## Hosting

GitHub Pages: *Settings > Pages > Deploy from a branch > `main` / root*.

## The robot figures

The three bots are isometric SVGs drawn from the bootcamp kit (ESP32, L298N, 2 × TT
motor, 65 mm wheels, caster, 4 × 18650, LM2596, DPDT switch, IR sensors) with the
[Anatomy](https://github.com/wheresryan22/anatomy) kit (MIT, vendored in `tools/anatomy`).
To change them, edit `tools/build-bots.mjs` and run:

```
node tools/build-bots.mjs
```

The page loads the output from `assets/bots/`.
