// Builds the three bootcamp robots as isometric SVG figures with the Anatomy kit.
// Every bot shares the kit chassis (ESP32, L298N, 2 × TT motor, 65 mm wheels,
// caster, 4 × 18650 holder, LM2596, DPDT switch, 2 × IR sensor) and differs only
// in its front add-on. Run: node tools/build-bots.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./anatomy/iso-kit.mjs";
import * as G from "./anatomy/lathe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets", "bots");

const WIDTH = 640;
const HEIGHT = 440;

// World units are millimetres. +x is the front of the robot, z is up.
const PLATE = { x: -82, y: -56, w: 164, d: 112, r: 7 };
const PLATE_Z = 26;
const PLATE_H = 4;
const DECK = PLATE_Z + PLATE_H;
const WHEEL_R = 32.5;
const WHEEL_W = 26;
const WHEEL_Y = 60;
const AXLE = [0, WHEEL_R];
const CASTER = [-66, 0];
const FRONT = PLATE.x + PLATE.w;

function projectionFor(reach) {
  const points = [
    ...k.boxCorners(PLATE, 0, 66),
    [0, WHEEL_Y + WHEEL_W + 4, 0],
    [0, -WHEEL_Y - WHEEL_W - 4, 0],
    [0, WHEEL_Y + WHEEL_W, WHEEL_R * 2],
    [FRONT + reach, -62, 0],
    [FRONT + reach, 62, 0],
    [FRONT + reach, 62, 50],
  ];
  return k.fitProjection(points, WIDTH, HEIGHT, { pad: 34, azimuth: 38 });
}

function robot(P, addOn) {
  const at = (point) => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const depth = ([x, y, z = 0]) => k.depthOf([x, y, z], P);
  const byDepth = (points) => [...points].sort((a, b) => depth(a) - depth(b));

  // A board on four brass standoffs: returns the board top height.
  function board(plan, lift, thick, out, { tone = "mid", holes = 3 } = {}) {
    for (const [x, y] of byDepth(k.corners(plan, holes))) {
      out.push(S(k.cylinder(x, y, 2, DECK, lift, P, 14), { tone: "lo", crease: "none" }));
    }
    out.push(S(k.slabOf(plan, DECK + lift, thick, P, 3, 0.4), { tone }));
    const top = DECK + lift + thick;
    const screws = k.corners(plan, holes);
    out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.6, top, P, 12)).join(""), { tone: "lo" }));
    out.push(D(screws.map(([x, y]) => at([x, y, top])), { size: 0.45 }));
    return top;
  }

  function wheel(side) {
    const out = [];
    const y0 = side * WHEEL_Y;
    const F = G.frameAlong([AXLE[0], y0, AXLE[1]], [0, side, 0]);
    out.push(S(G.disc(0, WHEEL_W, WHEEL_R, F, P), { tone: "mid", crease: "lo" }));
    const tread = G.ribsOf(F, 0, WHEEL_W, WHEEL_R, 44, P, { fade: [0.05, 0.45], seams: true });
    out.push(k.fadedSvg(tread, { tone: "lo" }));
    out.push(L(G.arcOf(F, 4, WHEEL_R, P) + G.arcOf(F, WHEEL_W - 4, WHEEL_R, P), { tone: "faint" }));
    if (side < 0) {
      // The far wheel shows its inner face: rim ring and the hub the motor shaft enters.
      out.push(L(G.circleOf(F, 0, WHEEL_R - 6, P), { tone: "lo" }));
      out.push(L(G.spokesOf(F, 0, 9, WHEEL_R - 6, 6, P, { phase: 0.3 }), { tone: "faint" }));
      out.push(L(G.circleOf(F, 0, 9, P), { tone: "lo" }));
    }
    if (side > 0) {
      out.push(L(G.circleOf(F, WHEEL_W, WHEEL_R - 6, P), { tone: "lo" }));
      out.push(L(G.spokesOf(F, WHEEL_W, 9, WHEEL_R - 6, 6, P, { phase: 0.3 }), { tone: "lo" }));
      out.push(S(G.disc(WHEEL_W, WHEEL_W + 3, 9, F, P), { tone: "mid" }));
      out.push(S(G.disc(WHEEL_W + 3, WHEEL_W + 4, 3.2, F, P), { tone: "hi" }));
      out.push(D(G.dotsOf(F, WHEEL_W + 3, 6.2, 4, P, { all: true }), { size: 0.45 }));
    }
    return out.join("");
  }

  function motor(side) {
    const out = [];
    const plan = { x: -11, y: side > 0 ? 6 : -54, w: 22, d: 48, r: 2 };
    out.push(S(k.slabOf(plan, PLATE_Z - 19, 19, P, 3, 0.5), { tone: "mid" }));
    out.push(L(k.sideSeam(plan, PLATE_Z - 10, P, 3), { tone: "faint" }));
    const can = G.frameAlong([0, side > 0 ? 6 : -6, AXLE[1] - 8], [0, -side, 0]);
    out.push(S(G.disc(0, 22, 9, can, P), { tone: "mid" }));
    const shaft = G.frameAlong([0, side * 54, AXLE[1]], [0, side, 0]);
    out.push(S(G.disc(0, WHEEL_Y - 54, 2.6, shaft, P), { tone: "lo" }));
    return out.join("");
  }

  function caster() {
    const out = [];
    const [x, y] = CASTER;
    out.push(S(G.sphereOf([x, y, 8], 8, P), { tone: "hi" }));
    out.push(S(k.cylinder(x, y, 10, 13, 4, P, 28), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 7, 17, PLATE_Z - 17, P, 24), { tone: "mid", crease: "none" }));
    return out.join("");
  }

  function chassis() {
    const out = [];
    out.push(S(k.slabOf(PLATE, PLATE_Z, PLATE_H, P, 8, 1.2), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 4), DECK, P), { tone: "faint" }));
    const screws = k.corners(PLATE, 9);
    out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, DECK, P, 16)).join(""), { tone: "lo" }));
    out.push(D(screws.map(([x, y]) => at([x, y, DECK])), { size: 0.5 }));
    // Mounting slots along both sides of the PVC board.
    const slots = [];
    for (const x of [-56, -30, 24, 50]) for (const y of [-49, 45]) slots.push(k.planOutline({ x, y, w: 12, d: 4, r: 2 }, DECK, P, 4));
    out.push(L(slots.join(""), { tone: "lo" }));
    return out.join("");
  }

  function battery() {
    const out = [];
    const tray = { x: -78, y: -40, w: 72, d: 78, r: 2 };
    out.push(S(k.slabOf(tray, DECK, 2, P, 3, 0.4), { tone: "lo" }));
    for (const y of [-40, 36]) out.push(S(k.slabOf({ x: -78, y, w: 72, d: 2, r: 0.6 }, DECK + 2, 7, P, 2), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: -78, y: -40, w: 3, d: 78, r: 0.8 }, DECK + 2, 19, P, 2, 0.4), { tone: "mid" }));
    const cells = [-29, -10, 9, 28].map((y) => [y, G.frameAlong([-75, y, DECK + 2 + 9.2], [1, 0, 0])]);
    for (const [, F] of cells) {
      out.push(S(G.disc(0, 64, 9, F, P), { tone: "hi", crease: "lo" }));
      out.push(L(G.arcOf(F, 6, 9, P) + G.arcOf(F, 58, 9, P), { tone: "faint" }));
    }
    out.push(S(k.slabOf({ x: -9, y: -40, w: 3, d: 78, r: 0.8 }, DECK + 2, 19, P, 2, 0.4), { tone: "mid" }));
    out.push(D(cells.map(([y]) => at([-6, y, DECK + 13])), { size: 0.5 }));
    return out.join("");
  }

  function esp32() {
    const out = [];
    const plan = { x: 6, y: 8, w: 52, d: 28, r: 1.5 };
    const top = board(plan, 7, 1.6, out, { tone: "hi", holes: 2.4 });
    for (const y of [plan.y + 1, plan.y + plan.d - 3.5]) {
      out.push(S(k.slabOf({ x: plan.x + 6, y, w: 40, d: 2.5, r: 0.4 }, top, 2.5, P, 2), { tone: "lo", crease: "none" }));
      const pins = Array.from({ length: 15 }, (_, i) => at([plan.x + 7.4 + i * 2.54, y + 1.25, top + 2.5]));
      out.push(D(pins, { size: 0.35, tone: "mid" }));
    }
    const can = { x: plan.x + 28, y: plan.y + 6, w: 18, d: 16, r: 0.6 };
    out.push(S(k.slabOf(can, top, 3, P, 2, 0.4), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(can, 1.4), top + 3, P, 2), { tone: "faint" }));
    out.push(S(k.slabOf({ x: plan.x - 1, y: plan.y + 10, w: 6, d: 8, r: 0.8 }, top, 3, P, 2), { tone: "mid" }));
    for (const y of [plan.y + 7, plan.y + plan.d - 7]) out.push(S(k.cylinder(plan.x + 10, y, 1.6, top, 1.4, P, 12), { tone: "lo" }));
    return out.join("");
  }

  function l298n() {
    const out = [];
    const plan = { x: 8, y: -50, w: 43, d: 43, r: 1.5 };
    const top = board(plan, 5, 1.6, out);
    const cap = [plan.x + 34, plan.y + 9];
    out.push(S(k.cylinder(cap[0], cap[1], 4, top, 10, P, 20), { tone: "mid" }));
    out.push(L(k.ring(cap[0], cap[1], 2.6, top + 10, P, 16), { tone: "faint" }));
    // Heatsink: a base and eight fins standing on the board's back half.
    const sink = { x: plan.x + 4, y: plan.y + 14, w: 16, d: 24, r: 0.6 };
    out.push(S(k.slabOf(sink, top, 4, P, 2, 0.3), { tone: "lo" }));
    for (let i = 0; i < 8; i++) {
      out.push(S(k.slabOf({ x: sink.x, y: sink.y + i * 3.2, w: sink.w, d: 1.2, r: 0.3 }, top + 4, 16, P, 2), { tone: "mid", crease: "none" }));
    }
    // Screw terminals along the front edge.
    for (const y of [plan.y + 3, plan.y + 17, plan.y + 31]) {
      const block = { x: plan.x + plan.w - 8, y, w: 7.5, d: 10, r: 0.4 };
      out.push(S(k.slabOf(block, top, 9, P, 2, 0.3), { tone: "mid" }));
      out.push(L([3, 7].map((dy) => k.ring(block.x + 3.75, y + dy, 1.3, top + 9, P, 12)).join(""), { tone: "lo" }));
      out.push(D([3, 7].map((dy) => at([block.x + 3.75, y + dy, top + 9])), { size: 0.4 }));
    }
    return out.join("");
  }

  function lm2596() {
    const out = [];
    const plan = { x: 56, y: -50, w: 21, d: 43, r: 1 };
    const top = board(plan, 4, 1.6, out, { tone: "lo", holes: 2.2 });
    out.push(S(k.cylinder(plan.x + 10.5, plan.y + 12, 6, top, 7, P, 24), { tone: "mid" }));
    out.push(L(k.ring(plan.x + 10.5, plan.y + 12, 3, top + 7, P, 16), { tone: "faint" }));
    for (const y of [plan.y + 26, plan.y + 35]) out.push(S(k.cylinder(plan.x + 6, y, 3.6, top, 9, P, 18), { tone: "mid" }));
    const pot = { x: plan.x + 12, y: plan.y + 28, w: 6, d: 9, r: 0.6 };
    out.push(S(k.slabOf(pot, top, 6, P, 2, 0.3), { tone: "mid" }));
    out.push(S(k.cylinder(pot.x + 3, pot.y + 2, 1.4, top + 6, 1, P, 12), { tone: "hi" }));
    return out.join("");
  }

  function switchAndSensors() {
    const out = [];
    const sw = { x: 62, y: 18, w: 13, d: 9, r: 1 };
    out.push(S(k.slabOf(sw, DECK, 9, P, 2, 0.4), { tone: "mid" }));
    out.push(S(k.cylinder(sw.x + 6.5, sw.y + 4.5, 1.2, DECK + 9, 7, P, 12), { tone: "hi" }));
    for (const y of [-52, 38]) {
      const plan = { x: 64, y: y === 38 ? 38 : -52 + 0, w: 15, d: 14, r: 0.8 };
      if (y === -52) continue; // the far sensor sits under the LM2596; only the near one shows
      const top = board(plan, 3, 1.4, out, { tone: "lo", holes: 2 });
      for (const dy of [4, 10]) out.push(S(k.cylinder(plan.x + 12, plan.y + dy, 2.2, top, 5, P, 16), { tone: "hi" }));
      out.push(S(k.slabOf({ x: plan.x + 2, y: plan.y + 4, w: 5, d: 5, r: 0.5 }, top, 3, P, 2), { tone: "mid" }));
    }
    return out.join("");
  }

  function wires() {
    const lift = (x, y, z) => at([x, y, z]);
    return [
      k.wireSvg(lift(-6, 30, DECK + 16), lift(62, 22.5, DECK + 9), { via: [lift(20, 44, DECK + 26), lift(54, 44, DECK + 22)], tone: "mid" }),
      k.wireSvg(lift(75, 22.5, DECK + 9), lift(66, -10, DECK + 5.6), { via: [lift(80, 0, DECK + 14)], tone: "mid" }),
      k.wireSvg(lift(45, -46, DECK + 15.6), lift(30, 8, DECK + 9), { via: [lift(40, -2, DECK + 22)], tone: "mid" }),
    ].join("");
  }

  const body = [
    `<path class="iso-halo" d="${k.haloOf({ x: -88, y: -88, w: 176 + addOn.reach, d: 176, r: 20 }, 0, 0.1, P)}"/>`,
    wheel(-1),
    motor(-1),
    caster(),
    motor(1),
    chassis(),
    battery(),
    l298n(),
    lm2596(),
    esp32(),
    switchAndSensors(),
    wires(),
    wheel(1),
    addOn.draw({ P, S, L, D, at }),
  ];
  return body.join("");
}

const ADD_ONS = {
  sumo: {
    reach: 42,
    title: "Sumo plow",
    draw({ P, S, L, D, at }) {
      const out = [];
      const F = G.frameOf([FRONT, -58, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
      // Side profile in (x, z): a steep wedge whose lip skims the floor.
      const wedge = [[0, 4], [40, 0.6], [42, 2.2], [8, 34], [0, 34]];
      out.push(S(G.prismOf(F, wedge, 0, 116, P), { tone: "hi", lit: true }));
      const slope = (t) => [FRONT + 8 + (42 - 8) * t, 34 - (34 - 2.2) * t];
      const rivets = [];
      for (const t of [0.25, 0.55]) for (const y of [-46, -16, 16, 46]) { const [x, z] = slope(t); rivets.push(at([x, y, z])); }
      out.push(D(rivets, { size: 0.9, tone: "hi" }));
      for (const y of [-40, 40]) out.push(S(k.slabOf({ x: FRONT - 6, y: y - 4, w: 8, d: 8, r: 0.8 }, DECK, 6, P, 2, 0.3), { tone: "mid" }));
      return out.join("");
    },
  },
  soccer: {
    reach: 52,
    title: "Soccer cradle",
    draw({ P, S, L, D, at }) {
      const out = [];
      const z0 = 6;
      out.push(S(k.slabOf({ x: FRONT, y: -44, w: 4, d: 88, r: 1 }, z0, 22, P, 2, 0.4), { tone: "mid" }));
      const ball = [FRONT + 26, 0, 21];
      const armOf = (y) => ({ x: FRONT, y, w: 50, d: 5, r: 1.6 });
      out.push(S(k.slabOf(armOf(-44), z0, 18, P, 3, 0.4), { tone: "mid" }));
      out.push(S(G.sphereOf(ball, 21, P), { tone: "hi", lit: true }));
      const seams = [[1, 0, 0.6], [0, 1, 0.3], [0.5, -0.6, 1]].map((axis) => {
        const n = Math.hypot(...axis);
        return G.arcOf(G.frameAlong(ball, axis.map((v) => v / n)), 0, 21, P);
      });
      out.push(L(seams.join(""), { tone: "mid" }));
      out.push(S(k.slabOf(armOf(39), z0, 18, P, 3, 0.4), { tone: "mid" }));
      out.push(D([FRONT + 12, FRONT + 38].map((x) => at([x, 41.5, z0 + 18])), { size: 0.5 }));
      return out.join("");
    },
  },
  obstacle: {
    reach: 18,
    title: "Ultrasonic head",
    draw({ P, S, L, D, at }) {
      const out = [];
      out.push(S(k.slabOf({ x: FRONT - 10, y: -18, w: 12, d: 36, r: 1 }, DECK, 3, P, 2, 0.3), { tone: "mid" }));
      const pcb = { x: FRONT + 2, y: -22.5, w: 1.6, d: 45, r: 0.3 };
      out.push(S(k.slabOf(pcb, DECK - 4, 22, P, 2), { tone: "mid", crease: "none" }));
      for (const y of [-13, 13]) {
        const F = G.frameAlong([FRONT + 3.6, y, DECK + 7], [1, 0, 0]);
        out.push(S(G.disc(0, 12, 8, F, P), { tone: "hi", lit: true }));
        out.push(L(G.circleOf(F, 12, 5.2, P), { tone: "mid" }));
        out.push(D(G.dotsOf(F, 12, 2.6, 8, P, { all: true }), { size: 0.4, tone: "mid" }));
      }
      out.push(S(k.cylinder(FRONT + 1, 0, 1.6, DECK + 12, 1, P, 12), { tone: "lo" }));
      return out.join("");
    },
  },
};

const LABELS = {
  sumo: "Sumo bot: the bootcamp kit robot with a steel wedge plow on its front, built to slide under an opponent and push it out of the ring.",
  soccer: "Soccer bot: the bootcamp kit robot with a U-shaped cradle on its front that traps and carries the ball.",
  obstacle: "Obstacle course bot: the bootcamp kit robot with an ultrasonic distance sensor mounted on its nose to see walls ahead.",
};

mkdirSync(OUT, { recursive: true });
for (const [name, addOn] of Object.entries(ADD_ONS)) {
  const P = projectionFor(addOn.reach);
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABELS[name], body: [robot(P, addOn)] });
  writeFileSync(join(OUT, `${name}.svg.html`), svg);
  console.log("wrote", name, (svg.length / 1024).toFixed(0) + " KB");
}
