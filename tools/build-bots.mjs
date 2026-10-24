// Builds the three bootcamp robots as small isometric scenes with the Anatomy kit.
// Every bot shares the kit chassis (ESP32, L298N, 2 × TT motor, 65 mm wheels,
// caster, 4 × 18650 holder, LM2596, DPDT switch, 2 × IR sensor) and differs only
// in its front add-on. Each scene also carries the props its animation needs
// (a ring and an opponent, a goal and a ball, a box), and writes the screen
// vectors of the world axes so assets/scenes.js can move whole parts.
// Run: node tools/build-bots.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./anatomy/iso-kit.mjs";
import * as G from "./anatomy/lathe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets", "bots");

const WIDTH = 640;
const HEIGHT = 420;
const AZIMUTH = 38;

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
const ESP = [32, 22, DECK + 12]; // the ESP32, where the phone's Bluetooth signal lands
const BALL_R = 21;
const BALL_AT = [FRONT + 26, 0, BALL_R]; // ball centre while it sits in the cradle

// Rotation of a robot about z by a multiple of 90°, so slabs stay axis-aligned.
const turn = (heading) => {
  const q = ((heading % 360) + 360) % 360;
  return ([x, y]) => (q === 90 ? [-y, x] : q === 180 ? [-x, -y] : q === 270 ? [y, -x] : [x, y]);
};

function draw(P) {
  return {
    S: (paths, style) => k.solidSvg(paths, style),
    L: (d, style) => k.lineSvg(d, style),
    D: (points, style) => k.dotsSvg(points, style),
  };
}

// Collects parts and paints them back to front: by layer first, then by depth.
function painter(P, rot = (p) => p) {
  const items = [];
  return {
    put(layer, [x, y, z = 0], svg) {
      const [rx, ry] = rot([x, y]);
      items.push({ layer, d: k.depthOf([rx, ry, z], P), svg });
    },
    svg: () => items.sort((a, b) => a.layer - b.layer || a.d - b.d).map((item) => item.svg).join(""),
  };
}

function robot(P, { heading = 0, addOn, accent = true }) {
  const { S, L, D } = draw(P);
  const rot = turn(heading);
  const r3 = ([x, y, z]) => [...rot([x, y]), z];
  const rplan = (plan) => {
    const a = rot([plan.x, plan.y]);
    const b = rot([plan.x + plan.w, plan.y + plan.d]);
    return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), d: Math.abs(b[1] - a[1]), r: plan.r };
  };
  const at = (p) => k.iso(r3(p), P);
  const depth = (p) => k.depthOf(r3(p), P);
  const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(rplan(plan), z, h, P, steps, bevel);
  const cyl = (x, y, r, z, h, steps = 20, bevel = 0) => { const [rx, ry] = rot([x, y]); return k.cylinder(rx, ry, r, z, h, P, steps, bevel); };
  const ringAt = (x, y, r, z, steps = 12) => { const [rx, ry] = rot([x, y]); return k.ring(rx, ry, r, z, P, steps); };
  const outline = (plan, z, steps) => k.planOutline(rplan(plan), z, P, steps);
  const seam = (plan, z, steps) => k.sideSeam(rplan(plan), z, P, steps);
  const frame = (o, a) => G.frameAlong(r3(o), r3(a));
  const frameOf = (o, a, u, v) => G.frameOf(r3(o), r3(a), r3(u), r3(v));
  const view = k.towardViewer(P);
  const faces = (a) => { const [x, y] = rot(a); return x * view[0] + y * view[1] > 0; };
  const ctx = { P, S, L, D, at, slab, cyl, ringAt, outline, frame, frameOf, depth, accent, r3 };

  // A board on four standoffs. Returns the board top height.
  function board(out, plan, lift, thick, { tone = "mid", holes = 3 } = {}) {
    for (const [x, y] of k.corners(plan, holes)) out.put(0, [x, y, DECK], S(cyl(x, y, 2, DECK, lift, 14), { tone: "lo", crease: "none" }));
    const top = DECK + lift + thick;
    const screws = k.corners(plan, holes);
    out.put(1, [plan.x + plan.w / 2, plan.y + plan.d / 2, DECK + lift],
      S(slab(plan, DECK + lift, thick, 3, 0.4), { tone }) +
      L(screws.map(([x, y]) => ringAt(x, y, 1.6, top)).join(""), { tone: "lo" }) +
      D(screws.map(([x, y]) => at([x, y, top])), { size: 0.45 }));
    return top;
  }

  function wheel(side) {
    const F = frame([AXLE[0], side * WHEEL_Y, AXLE[1]], [0, side, 0]);
    let svg = S(G.disc(0, WHEEL_W, WHEEL_R, F, P), { tone: "mid", crease: "lo" });
    svg += k.fadedSvg(G.ribsOf(F, 0, WHEEL_W, WHEEL_R, 44, P, { fade: [0.05, 0.45], seams: true }), { tone: "lo" });
    svg += L(G.arcOf(F, 4, WHEEL_R, P) + G.arcOf(F, WHEEL_W - 4, WHEEL_R, P), { tone: "faint" });
    if (faces([0, side])) {
      svg += L(G.circleOf(F, WHEEL_W, WHEEL_R - 6, P), { tone: "lo" });
      svg += L(G.spokesOf(F, WHEEL_W, 9, WHEEL_R - 6, 6, P, { phase: 0.3 }), { tone: "lo" });
      svg += S(G.disc(WHEEL_W, WHEEL_W + 3, 9, F, P), { tone: "mid" });
      svg += S(G.disc(WHEEL_W + 3, WHEEL_W + 4, 3.2, F, P), { tone: "hi" });
      svg += D(G.dotsOf(F, WHEEL_W + 3, 6.2, 4, P, { all: true }), { size: 0.45 });
    } else {
      // The inner face: rim ring and the hub the motor shaft enters.
      svg += L(G.circleOf(F, 0, WHEEL_R - 6, P), { tone: "lo" });
      svg += L(G.spokesOf(F, 0, 9, WHEEL_R - 6, 6, P, { phase: 0.3 }), { tone: "faint" });
      svg += L(G.circleOf(F, 0, 9, P), { tone: "lo" });
    }
    return svg;
  }

  function motor(side) {
    const plan = { x: -11, y: side > 0 ? 6 : -54, w: 22, d: 48, r: 2 };
    return S(slab(plan, PLATE_Z - 19, 19, 3, 0.5), { tone: "mid", inner: L(seam(plan, PLATE_Z - 10, 3), { tone: "faint" }) }) +
      S(G.disc(0, 22, 9, frame([0, side * 6, AXLE[1] - 8], [0, -side, 0]), P), { tone: "mid" }) +
      S(G.disc(0, WHEEL_Y - 54, 2.6, frame([0, side * 54, AXLE[1]], [0, side, 0]), P), { tone: "lo" });
  }

  function caster() {
    const [x, y] = CASTER;
    return S(G.sphereOf(r3([x, y, 8]), 8, P), { tone: "hi" }) +
      S(cyl(x, y, 10, 13, 4, 28), { tone: "mid" }) +
      S(cyl(x, y, 7, 17, PLATE_Z - 17, 24), { tone: "mid", crease: "none" });
  }

  function chassis() {
    const screws = k.corners(PLATE, 9);
    const slots = [];
    for (const x of [-56, -30, 24, 50]) for (const y of [-49, 45]) slots.push(outline({ x, y, w: 12, d: 4, r: 2 }, DECK, 4));
    return S(slab(PLATE, PLATE_Z, PLATE_H, 8, 1.2), { tone: "mid" }) +
      L(outline(k.insetPlan(PLATE, 4), DECK), { tone: "faint" }) +
      L(screws.map(([x, y]) => ringAt(x, y, 2.2, DECK, 16)).join(""), { tone: "lo" }) +
      D(screws.map(([x, y]) => at([x, y, DECK])), { size: 0.5 }) +
      L(slots.join(""), { tone: "lo" });
  }

  function battery() {
    const out = painter(P, rot);
    out.put(0, [-42, -1, DECK], S(slab({ x: -78, y: -40, w: 72, d: 78, r: 2 }, DECK, 2, 3, 0.4), { tone: "lo" }));
    for (const y of [-40, 36]) out.put(1, [-42, y + 1, DECK + 2], S(slab({ x: -78, y, w: 72, d: 2, r: 0.6 }, DECK + 2, 7, 2), { tone: "mid", crease: "none" }));
    for (const x of [-78, -9]) {
      out.put(1, [x + 1.5, -1, DECK + 2], S(slab({ x, y: -40, w: 3, d: 78, r: 0.8 }, DECK + 2, 19, 2, 0.4), { tone: "mid" }) +
        (x > -50 ? D([-29, -10, 9, 28].map((y) => at([x + 3, y, DECK + 13]).concat([1])), { size: 0.5 }) : ""));
    }
    for (const y of [-29, -10, 9, 28]) {
      const F = frame([-75, y, DECK + 11.2], [1, 0, 0]);
      out.put(1, [-43, y, DECK + 2], S(G.disc(0, 64, 9, F, P), { tone: "hi", crease: "lo" }) + L(G.arcOf(F, 6, 9, P) + G.arcOf(F, 58, 9, P), { tone: "faint" }));
    }
    return out.svg();
  }

  function esp32() {
    const out = painter(P, rot);
    const plan = { x: 6, y: 8, w: 52, d: 28, r: 1.5 };
    const top = board(out, plan, 7, 1.6, { tone: "hi", holes: 2.4 });
    for (const y of [plan.y + 1, plan.y + plan.d - 3.5]) {
      const pins = Array.from({ length: 15 }, (_, i) => at([plan.x + 7.4 + i * 2.54, y + 1.25, top + 2.5]));
      out.put(2, [plan.x + 26, y + 1.25, top], S(slab({ x: plan.x + 6, y, w: 40, d: 2.5, r: 0.4 }, top, 2.5, 2), { tone: "lo", crease: "none" }) + D(pins, { size: 0.35, tone: "mid" }));
    }
    const can = { x: plan.x + 28, y: plan.y + 6, w: 18, d: 16, r: 0.6 };
    out.put(2, [can.x + 9, can.y + 8, top], S(slab(can, top, 3, 2, 0.4), { tone: "mid" }) + L(outline(k.insetPlan(can, 1.4), top + 3, 2), { tone: "faint" }));
    out.put(2, [plan.x + 2, plan.y + 14, top], S(slab({ x: plan.x - 1, y: plan.y + 10, w: 6, d: 8, r: 0.8 }, top, 3, 2), { tone: "mid" }));
    for (const y of [plan.y + 7, plan.y + plan.d - 7]) out.put(2, [plan.x + 10, y, top], S(cyl(plan.x + 10, y, 1.6, top, 1.4, 12), { tone: "lo" }));
    return out.svg();
  }

  function l298n() {
    const out = painter(P, rot);
    const plan = { x: 8, y: -50, w: 43, d: 43, r: 1.5 };
    const top = board(out, plan, 5, 1.6);
    const cap = [plan.x + 34, plan.y + 9];
    out.put(2, [...cap, top], S(cyl(cap[0], cap[1], 4, top, 10, 20), { tone: "mid" }) + L(ringAt(cap[0], cap[1], 2.6, top + 10, 16), { tone: "faint" }));
    const sink = { x: plan.x + 4, y: plan.y + 14, w: 16, d: 24, r: 0.6 };
    out.put(2, [sink.x + 8, sink.y + 12, top], S(slab(sink, top, 4, 2, 0.3), { tone: "lo" }));
    for (let i = 0; i < 8; i++) {
      out.put(3, [sink.x + 8, sink.y + i * 3.2 + 0.6, top + 4], S(slab({ x: sink.x, y: sink.y + i * 3.2, w: sink.w, d: 1.2, r: 0.3 }, top + 4, 16, 2), { tone: "mid", crease: "none" }));
    }
    for (const y of [plan.y + 3, plan.y + 17, plan.y + 31]) {
      const block = { x: plan.x + plan.w - 8, y, w: 7.5, d: 10, r: 0.4 };
      out.put(2, [block.x + 3.75, y + 5, top], S(slab(block, top, 9, 2, 0.3), { tone: "mid" }) +
        L([3, 7].map((dy) => ringAt(block.x + 3.75, y + dy, 1.3, top + 9)).join(""), { tone: "lo" }) +
        D([3, 7].map((dy) => at([block.x + 3.75, y + dy, top + 9])), { size: 0.4 }));
    }
    return out.svg();
  }

  function lm2596() {
    const out = painter(P, rot);
    const plan = { x: 56, y: -50, w: 21, d: 43, r: 1 };
    const top = board(out, plan, 4, 1.6, { tone: "lo", holes: 2.2 });
    out.put(2, [plan.x + 10.5, plan.y + 12, top], S(cyl(plan.x + 10.5, plan.y + 12, 6, top, 7, 24), { tone: "mid" }) + L(ringAt(plan.x + 10.5, plan.y + 12, 3, top + 7, 16), { tone: "faint" }));
    for (const y of [plan.y + 26, plan.y + 35]) out.put(2, [plan.x + 6, y, top], S(cyl(plan.x + 6, y, 3.6, top, 9, 18), { tone: "mid" }));
    const pot = { x: plan.x + 12, y: plan.y + 28, w: 6, d: 9, r: 0.6 };
    out.put(2, [pot.x + 3, pot.y + 4.5, top], S(slab(pot, top, 6, 2, 0.3), { tone: "mid" }) + S(cyl(pot.x + 3, pot.y + 2, 1.4, top + 6, 1, 12), { tone: "hi" }));
    return out.svg();
  }

  function switchBlock() {
    const sw = { x: 62, y: 18, w: 13, d: 9, r: 1 };
    return S(slab(sw, DECK, 9, 2, 0.4), { tone: "mid" }) + S(cyl(sw.x + 6.5, sw.y + 4.5, 1.2, DECK + 9, 7, 12), { tone: "hi" });
  }

  function irSensor() {
    const out = painter(P, rot);
    const plan = { x: 64, y: 38, w: 15, d: 14, r: 0.8 };
    const top = board(out, plan, 3, 1.4, { tone: "lo", holes: 2 });
    for (const dy of [4, 10]) out.put(2, [plan.x + 12, plan.y + dy, top], S(cyl(plan.x + 12, plan.y + dy, 2.2, top, 5, 16), { tone: "hi" }));
    out.put(2, [plan.x + 4.5, plan.y + 6.5, top], S(slab({ x: plan.x + 2, y: plan.y + 4, w: 5, d: 5, r: 0.5 }, top, 3, 2), { tone: "mid" }));
    return out.svg();
  }

  function wires() {
    return [
      k.wireSvg(at([-6, 30, DECK + 16]), at([62, 22.5, DECK + 9]), { via: [at([20, 44, DECK + 26]), at([54, 44, DECK + 22])], tone: "mid" }),
      k.wireSvg(at([75, 22.5, DECK + 9]), at([66, -10, DECK + 5.6]), { via: [at([80, 0, DECK + 14])], tone: "mid" }),
      k.wireSvg(at([45, -46, DECK + 15.6]), at([30, 8, DECK + 9]), { via: [at([40, -2, DECK + 22])], tone: "mid" }),
    ].join("");
  }

  // Whole robot: far wheel and the parts under the deck, the plate, the deck
  // in depth order, the wires, the near wheel, then the add-on if it faces us.
  const scene = painter(P, rot);
  const wheelNear = (side) => depth([0, side * (WHEEL_Y + WHEEL_W / 2), 0]) > depth([0, -side * (WHEEL_Y + WHEEL_W / 2), 0]);
  for (const side of [-1, 1]) scene.put(wheelNear(side) ? 6 : 0, [0, side * (WHEEL_Y + 13), AXLE[1]], wheel(side));
  for (const side of [-1, 1]) scene.put(0, [0, side * 30, 10], motor(side));
  scene.put(0, [CASTER[0], 0, 10], caster());
  scene.put(1, [0, 0, PLATE_Z], chassis());
  scene.put(2, [-42, -1, DECK], battery());
  scene.put(2, [32, 22, DECK], esp32());
  scene.put(2, [29, -28, DECK], l298n());
  scene.put(2, [66, -28, DECK], lm2596());
  scene.put(2, [68, 22, DECK], switchBlock());
  scene.put(2, [71, 45, DECK], irSensor());
  scene.put(5, [0, 0, DECK + 30], wires());
  const parts = addOn.draw(ctx);
  const ahead = depth([FRONT + 20, 0, 0]) > depth([0, 0, 0]);
  scene.put(ahead ? 7 : -1, [FRONT + 20, 0, 0], parts.back || "");
  const halo = `<path class="iso-halo" d="${k.haloOf(rplan({ x: -90, y: -90, w: 180 + addOn.reach, d: 180, r: 22 }), 0, 0.1, P)}"/>`;
  return { body: halo + scene.svg(), front: parts.front || "" };
}

const ADD_ONS = {
  plow: {
    reach: 42,
    draw({ P, S, D, at, slab, frameOf, accent }) {
      const F = frameOf([FRONT, -58, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
      // Side profile in (x, z): a steep wedge whose lip skims the floor.
      const wedge = [[0, 4], [40, 0.6], [42, 2.2], [8, 34], [0, 34]];
      const slope = (t) => [FRONT + 8 + (42 - 8) * t, 34 - (34 - 2.2) * t];
      const rivets = [];
      for (const t of [0.25, 0.55]) for (const y of [-46, -16, 16, 46]) { const [x, z] = slope(t); rivets.push(at([x, y, z])); }
      let svg = "";
      for (const y of [-40, 40]) svg += S(slab({ x: FRONT - 6, y: y - 4, w: 8, d: 8, r: 0.8 }, DECK, 6, 2, 0.3), { tone: "mid" });
      svg += S(G.prismOf(F, wedge, 0, 116, P), { tone: "hi", lit: accent });
      svg += D(rivets, { size: 0.9, tone: "hi" });
      return { back: svg };
    },
  },
  cradle: {
    reach: 52,
    // The ball is drawn by the scene, between the far arm and the near arm.
    draw({ S, D, at, slab }) {
      const z0 = 6;
      const armOf = (y) => ({ x: FRONT, y, w: 50, d: 5, r: 1.6 });
      const back = S(slab({ x: FRONT, y: -44, w: 4, d: 88, r: 1 }, z0, 22, 2, 0.4), { tone: "mid" }) + S(slab(armOf(-44), z0, 18, 3, 0.4), { tone: "mid" });
      const front = S(slab(armOf(39), z0, 18, 3, 0.4), { tone: "mid" }) + D([FRONT + 12, FRONT + 38].map((x) => at([x, 41.5, z0 + 18])), { size: 0.5 });
      return { back, front };
    },
  },
  bumper: {
    reach: 8,
    // A plain front bumper: the course bot has no sensors, the phone does the steering.
    draw({ S, D, at, slab }) {
      let svg = "";
      for (const y of [-34, 34]) svg += S(slab({ x: FRONT - 6, y: y - 4, w: 8, d: 8, r: 0.8 }, DECK, 5, 2, 0.3), { tone: "mid" });
      svg += S(slab({ x: FRONT, y: -50, w: 8, d: 100, r: 2.5 }, 8, 18, 3, 0.6), { tone: "mid" });
      svg += D([-34, 34].map((y) => at([FRONT + 8, y, 17])), { size: 0.6 });
      return { back: svg };
    },
  },
};

// A part placed in the scene: its own <g> that scenes.js translates.
// `at` is its resting world offset, baked in so the still frame needs no script.
const part = (P, name, svg, at = [0, 0, 0], extra = "") => `<g data-part="${name}" transform="${k.translateAlong(P, at)}"${extra}>${svg}</g>`;

function ball(P, centre) {
  const { S, L } = draw(P);
  const seams = [[1, 0, 0.6], [0, 1, 0.3], [0.5, -0.6, 1]].map((axis) => {
    const n = Math.hypot(...axis);
    return G.arcOf(G.frameAlong(centre, axis.map((v) => v / n)), 0, BALL_R, P);
  });
  const [cx, cy] = k.iso(centre, P);
  return `<path class="iso-halo" d="${k.haloOf({ x: centre[0] - 16, y: centre[1] - 16, w: 32, d: 32, r: 16 }, 0, 0.1, P)}" style="filter:blur(4px)"/>` +
    S(G.sphereOf(centre, BALL_R, P), { tone: "hi", lit: true }) +
    `<g data-part="seams" data-cx="${cx.toFixed(1)}" data-cy="${cy.toFixed(1)}">${L(seams.join(""), { tone: "mid" })}</g>`;
}

// A phone lying beside the arena with a Bluetooth remote on its screen. The d-pad's
// "up" points along +x, the way the robots drive. Buttons carry data-btn so
// scenes.js can light the one being pressed.
function phone(P, cx, cy) {
  const { S, L } = draw(P);
  const H = 7;
  const body = { x: cx - 60, y: cy - 30, w: 120, d: 60, r: 9 };
  const top = H + 0.4;
  let svg = `<path class="iso-halo" d="${k.haloOf(body, 0, H, P)}" style="filter:blur(5px)"/>`;
  svg += S(k.slabOf(body, 0, H, P, 6, 0.8), { tone: "mid", inner: L(k.sideSeam(body, H / 2, P, 6), { tone: "faint" }) });
  svg += S(k.slabOf(k.insetPlan(body, 4), H, 0.4, P, 6), { tone: "hi", crease: "none" });
  svg += L(k.planOutline({ x: cx + 50, y: cy - 7, w: 2.4, d: 14, r: 1.2 }, top, P, 3), { tone: "mid" });
  const chevron = (x, y, dx, dy) => k.onTop([[x - dx * 2.6 - dy * 3.4, y - dy * 2.6 - dx * 3.4], [x + dx * 2.6, y + dy * 2.6], [x - dx * 2.6 + dy * 3.4, y - dy * 2.6 + dx * 3.4]], top + 1.6, P);
  const pad = [cx + 10, cy];
  const buttons = [["down", -15, 0, -1, 0], ["right", 0, -15, 0, -1], ["left", 0, 15, 0, 1], ["up", 15, 0, 1, 0]];
  for (const [name, dx, dy, ux, uy] of buttons) {
    const [x, y] = [pad[0] + dx, pad[1] + dy];
    svg += `<g data-btn="${name}">${S(k.cylinder(x, y, 6.6, top, 1.6, P, 28, 0.4), { tone: "mid" })}${L(chevron(x, y, ux, uy), { tone: "hi" })}</g>`;
  }
  // The Bluetooth rune, drawn on the screen in (left, forward) steps from its centre.
  const [bx, by] = [cx - 34, cy];
  const rune = [[-4.5, -4.5], [4.5, 4.5], [0, 9], [0, -9], [4.5, -4.5], [-4.5, 4.5]].map(([v, u]) => [bx + u, by + v]);
  svg += L(k.onTop(rune, top, P), { tone: "lit" }).replace("<path ", '<path style="stroke-width:1.4" ');
  return { svg, antenna: k.iso([cx + 40, cy, top], P).map((v) => +v.toFixed(1)) };
}

// A traffic cone: a square foot and a turned body with a reflective band.
function cone(P, x, y) {
  const { S, L } = draw(P);
  const F = G.frameAlong([x, y, 2], [0, 0, 1]);
  const slope = -7 / 27;
  return S(k.slabOf({ x: x - 12, y: y - 12, w: 24, d: 24, r: 2.5 }, 0, 2, P, 3, 0.4), { tone: "mid" }) +
    S(G.solidOf([[0, 10], [3, 9], [30, 2], [31, 1.4]], F, P), { tone: "hi", lit: true, inner: L(G.arcOf(F, 14, 9 + slope * 11, P, { slope }) + G.arcOf(F, 19, 9 + slope * 16, P, { slope }), { tone: "hi" }) });
}

// What every scene tells scenes.js about the phone and the robot's radio.
const radio = (P, ph) => ({ phone: ph.antenna, origin: k.iso([0, 0, 0], P).map((v) => +v.toFixed(2)), esp: ESP });

const SCENES = {
  sumo: {
    label: "Sumo bot: two kit robots face each other on a raised sumo ring. Ours carries an orange steel wedge plow and is driven from a phone over Bluetooth; it drives under the other robot and pushes it off the edge.",
    build() {
      const RING = 236;
      const RING_H = 24;
      const START = 150;
      const PHONE = [-236, 206];
      const P = k.fitProjection([
        ...k.boxCorners({ x: -RING, y: -RING, w: RING * 2, d: RING * 2, r: 0 }, 0, RING_H),
        [-START, 0, RING_H + 70], [START, 0, RING_H + 70],
        [PHONE[0] - 60, PHONE[1] + 30, 0], [PHONE[0] + 60, PHONE[1] + 30, 0],
      ], WIDTH, HEIGHT, { pad: 18, azimuth: AZIMUTH });
      const ph = phone(P, ...PHONE);
      const { S, L } = draw(P);
      const dohyo = `<path class="iso-halo" d="${k.haloOf({ x: -RING, y: -RING, w: RING * 2, d: RING * 2, r: RING }, 0, RING_H, P)}"/>` +
        S(k.cylinder(0, 0, RING, 0, RING_H, P, 120, 1.4), { tone: "lo" }) +
        L(k.ring(0, 0, RING - 12, RING_H, P, 120), { tone: "hi" }) +
        L(k.ring(0, 0, RING - 16, RING_H, P, 120), { tone: "mid" }) +
        L([-1, 1].map((s) => k.lineOnTop([s * 40, -30], [s * 40, 30], RING_H, P)).join(""), { tone: "hi" });
      const ours = robot(P, { addOn: ADD_ONS.plow });
      const theirs = robot(P, { heading: 180, addOn: ADD_ONS.plow, accent: false });
      return {
        P,
        body: dohyo + part(P, "ours", ours.body, [-START, 0, RING_H]) + part(P, "theirs", theirs.body, [START, 0, RING_H]) + ph.svg + `<g data-part="waves"></g>`,
        meta: { ring: RING, ringH: RING_H, start: START, reach: FRONT + 42, ...radio(P, ph) },
      };
    },
  },
  soccer: {
    label: "Soccer bot: driven from a phone over Bluetooth, the kit robot carries a ball in a U-shaped cradle towards a goal, stops, and lets the ball roll on into the net.",
    build() {
      const GOAL = 236;
      const MOUTH = 74;
      const BAR = 76;
      const DEPTH = 56;
      const START = -150;
      const PHONE = [-150, 176];
      const P = k.fitProjection([
        ...k.boxCorners({ x: START - 70, y: -120, w: GOAL + DEPTH - START + 74, d: 240, r: 0 }, 0, 0),
        [GOAL, -MOUTH, BAR], [GOAL + DEPTH, MOUTH, BAR], [START, 0, 70],
        [PHONE[0] - 60, PHONE[1] + 30, 0], [PHONE[0] + 60, PHONE[1] + 30, 0],
      ], WIDTH, HEIGHT, { pad: 18, azimuth: AZIMUTH });
      const ph = phone(P, ...PHONE);
      const { S, L, D } = draw(P);
      const mat = { x: START - 70, y: -120, w: GOAL + DEPTH - START + 74, d: 240, r: 6 };
      const pitch = `<path class="iso-halo" d="${k.haloOf(mat, 0, 2, P)}"/>` +
        S(k.slabOf(mat, -2, 2, P, 4, 0.6), { tone: "lo", crease: "none" }) +
        L(k.lineOnTop([20, mat.y], [20, mat.y + mat.d], 0, P) + k.ring(20, 0, 46, 0, P, 64), { tone: "faint" }) +
        L(k.onTop([[GOAL, -110], [GOAL - 70, -110], [GOAL - 70, 110], [GOAL, 110]], 0, P), { tone: "faint" });
      const post = (x, y) => S(k.cylinder(x, y, 3, 0, BAR, P, 16), { tone: "hi", crease: "none" });
      const bar = (from, to) => S(G.disc(0, Math.hypot(to[0] - from[0], to[1] - from[1]), 3, G.frameAlong(from, [Math.sign(to[0] - from[0]), Math.sign(to[1] - from[1]), 0]), P), { tone: "hi" });
      const net = (points) => L(points.join(""), { tone: "lo" });
      const back = GOAL + DEPTH;
      const farGoal = post(GOAL, -MOUTH) + post(back, -MOUTH) + bar([GOAL, -MOUTH, BAR], [back, -MOUTH, BAR]) +
        net(Array.from({ length: 7 }, (_, i) => k.segment([GOAL + (i * DEPTH) / 6, -MOUTH, 0], [GOAL + (i * DEPTH) / 6, -MOUTH, BAR], P)).concat(
          Array.from({ length: 6 }, (_, i) => k.segment([GOAL, -MOUTH, (i * BAR) / 6], [back, -MOUTH, (i * BAR) / 6], P))));
      const nearGoal = post(back, MOUTH) +
        net(Array.from({ length: 13 }, (_, i) => k.segment([back, -MOUTH + (i * MOUTH) / 6, 0], [back, -MOUTH + (i * MOUTH) / 6, BAR], P)).concat(
          Array.from({ length: 7 }, (_, i) => k.segment([back, -MOUTH, (i * BAR) / 6], [back, MOUTH, (i * BAR) / 6], P)))) +
        bar([back, -MOUTH, BAR], [back, MOUTH, BAR]) +
        net(Array.from({ length: 7 }, (_, i) => k.segment([GOAL + (i * DEPTH) / 6, MOUTH, 0], [GOAL + (i * DEPTH) / 6, MOUTH, BAR], P)).concat(
          Array.from({ length: 6 }, (_, i) => k.segment([GOAL, MOUTH, (i * BAR) / 6], [back, MOUTH, (i * BAR) / 6], P)))) +
        post(GOAL, MOUTH) + bar([back, MOUTH, BAR], [GOAL, MOUTH, BAR]) + bar([GOAL, -MOUTH, BAR], [GOAL, MOUTH, BAR]) +
        D([[GOAL, -MOUTH, BAR], [GOAL, MOUTH, BAR], [back, -MOUTH, BAR], [back, MOUTH, BAR]].map((p) => k.iso(p, P)), { size: 0.6 });
      const ours = robot(P, { addOn: ADD_ONS.cradle });
      return {
        P,
        body: pitch + farGoal + part(P, "ours", ours.body, [START, 0, 0]) + part(P, "ball", ball(P, BALL_AT), [START, 0, 0]) + part(P, "ours-front", ours.front, [START, 0, 0]) + nearGoal + ph.svg + `<g data-part="waves"></g><g data-part="confetti"></g>`,
        meta: { start: START, goal: GOAL, depth: DEPTH, ballAt: BALL_AT[0], ballR: BALL_R, ...radio(P, ph) },
      };
    },
  },
  obstacle: {
    label: "Obstacle course bot: driven from a phone over Bluetooth, the kit robot follows forward, left and right commands past rows of cones to a chequered finish line.",
    build() {
      const START = -210, TURN = -20, LANE_A = -55, LANE_B = 55, FINISH = 236;
      const PHONE = [-196, 176];
      const floor = { x: -300, y: -170, w: 590, d: 382, r: 8 };
      const P = k.fitProjection([...k.boxCorners(floor, 0, 0), [START, LANE_A, 70], [FINISH, LANE_B, 70]], WIDTH, HEIGHT, { pad: 18, azimuth: AZIMUTH });
      const { S, L } = draw(P);
      let ground = `<path class="iso-halo" d="${k.haloOf(floor, 0, 2, P)}"/>` + S(k.slabOf(floor, -2, 2, P, 4, 0.6), { tone: "lo", crease: "none" });
      ground += L(k.onTop([[START, LANE_A], [TURN, LANE_A], [TURN, LANE_B], [FINISH + 30, LANE_B]], 0, P), { tone: "mid", dashed: true });
      // Chequered finish strip across lane B: two rows of squares, alternate ones inked.
      const cell = 8;
      const dark = [];
      for (let i = 0; i < 2; i++) for (let j = 0; j < 14; j++) {
        if ((i + j) % 2) continue;
        const x = FINISH + i * cell, y = LANE_B - 56 + j * cell;
        dark.push(k.onTop([[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell]], 0, P, true));
      }
      ground += `<path d="${dark.join("")}" fill="var(--anatomy-hi)"/>` + L(k.planOutline({ x: FINISH, y: LANE_B - 56, w: cell * 2, d: cell * 14, r: 0 }, 0, P, 2), { tone: "hi" });
      const cones = [[130, -62], [130, -102], [130, -142], [-150, 64], [-150, 104], [-150, 144]]
        .sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P)).map(([x, y]) => cone(P, x, y)).join("");
      const h0 = robot(P, { addOn: ADD_ONS.bumper, accent: false });
      const h90 = robot(P, { heading: 90, addOn: ADD_ONS.bumper, accent: false });
      const ph = phone(P, ...PHONE);
      return {
        P,
        body: ground + part(P, "h90", h90.body, [START, LANE_A, 0], ` opacity="0"`) + part(P, "ours", h0.body, [START, LANE_A, 0]) +
          `<g data-part="cones">${cones}</g>` + ph.svg + `<g data-part="waves"></g>`,
        meta: { start: START, turn: TURN, laneA: LANE_A, laneB: LANE_B, finish: FINISH, ...radio(P, ph) },
      };
    },
  },
};

mkdirSync(OUT, { recursive: true });
for (const [name, scene] of Object.entries(SCENES)) {
  const { P, body, meta } = scene.build();
  const axes = { x: k.axisVector(P, [1, 0, 0]), y: k.axisVector(P, [0, 1, 0]), z: k.axisVector(P, [0, 0, 1]) };
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: scene.label, body: [body] })
    .replace("<svg ", `<svg data-scene="${name}" data-meta='${JSON.stringify({ ...meta, axes })}' `);
  writeFileSync(join(OUT, `${name}.svg.html`), svg);
  console.log("wrote", name, (svg.length / 1024).toFixed(0) + " KB");
}
