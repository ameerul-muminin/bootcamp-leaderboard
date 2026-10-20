// Hover animations for the three bot scenes built by tools/build-bots.mjs.
// Every moving part is a <g data-part> drawn once; a pose only translates it
// along the world axes (whose screen vectors the build writes into data-meta),
// fades it, or rotates a ball's seams. A scene plays in a loop while hovered
// or focused, finishes its current run when the pointer leaves, and stays
// still under reduced motion.
(() => {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const span = (t, from, to) => clamp((t - from) / (to - from));
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const inQ = (t) => t * t;

  function rig(svg) {
    const meta = JSON.parse(svg.dataset.meta);
    const { x: ex, y: ey, z: ez } = meta.axes;
    const parts = {};
    svg.querySelectorAll("[data-part]").forEach((el) => { parts[el.dataset.part] = el; });
    const screen = ([x, y, z]) => [x * ex[0] + y * ey[0] + z * ez[0], x * ex[1] + y * ey[1] + z * ez[1]];
    const move = (el, p, extra = "") => {
      if (!el) return;
      const [sx, sy] = screen(p);
      el.setAttribute("transform", `translate(${sx.toFixed(2)} ${sy.toFixed(2)})${extra}`);
    };
    const fade = (el, a) => el && el.setAttribute("opacity", a >= 0.999 ? "1" : a.toFixed(3));
    return { meta, parts, screen, move, fade, svg };
  }

  // ---- Sumo: drive in, shove, push the other bot over the edge, drop it.
  function sumo(r) {
    const { ring, ringH, start, reach } = r.meta;
    const contact = start - reach; // how far each bot drives before the plows meet
    const pushTo = ring + 72; // their centre when ours stops pushing
    const landAt = ring + reach + 20; // their centre once clear of the ring
    return {
      length: 6.2,
      pose(t) {
        let ours = -start;
        let theirs = start;
        let z = ringH;
        let say = "Ready";
        const a = inOut(span(t, 0.4, 1.0));
        ours += contact * a;
        theirs -= contact * a;
        if (t > 1.0) say = "Contact";
        const shove = t > 1.0 && t < 1.7 ? Math.sin((t - 1.0) * 42) * 2.2 * (1 - span(t, 1.0, 1.7)) : 0;
        ours += shove; theirs += shove;
        const push = inOut(span(t, 1.7, 3.1)) * (pushTo - (start - contact));
        ours += push; theirs += push;
        if (t > 1.7) say = "Pushing";
        const slide = out(span(t, 3.1, 3.7));
        theirs += slide * (landAt - pushTo);
        const fall = inQ(span(t, 3.35, 3.7));
        z = ringH - ringH * fall;
        if (t > 3.6) say = "Out!";
        const back = inOut(span(t, 4.9, 5.9));
        ours = lerp(ours, -start, back);
        r.move(r.parts.ours, [ours, 0, ringH]);
        const reset = span(t, 4.9, 5.4);
        if (t < 5.4) { r.move(r.parts.theirs, [theirs, 0, z]); r.fade(r.parts.theirs, 1 - reset); }
        else { r.move(r.parts.theirs, [start, 0, ringH]); r.fade(r.parts.theirs, span(t, 5.4, 6.0)); }
        if (t > 4.9) say = "Reset";
        return say;
      },
    };
  }

  // ---- Soccer: carry the ball, brake, the ball rolls on into the net, celebrate.
  function soccer(r) {
    const { start, goal, depth, ballAt, ballR } = r.meta;
    const stop = 30;
    const ballEnd = goal + depth - ballR - 6 - ballAt; // ball offset when it rests in the net
    const seams = r.svg.querySelector('[data-part="seams"]');
    const cx = +seams.dataset.cx, cy = +seams.dataset.cy;
    const confetti = r.parts.confetti;
    const colours = ["#e8562a", "#2f6fb0", "#2e9a6a", "#141414"];
    let bits = [];
    const burst = () => {
      // Screen origin of the world, from the ball's known centre.
      const [bx, by] = r.screen([ballAt, 0, ballR]);
      const [ox, oy] = r.screen([stop, 0, 90]);
      confetti.innerHTML = "";
      bits = Array.from({ length: 26 }, (_, i) => {
        const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        el.setAttribute("width", "3.4"); el.setAttribute("height", "2"); el.setAttribute("fill", colours[i % 4]);
        confetti.appendChild(el);
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
        const speed = 70 + Math.random() * 90;
        return { el, x: cx - bx + ox, y: cy - by + oy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, spin: (Math.random() - 0.5) * 720 };
      });
    };
    let burstAt = -1;
    return {
      length: 6.0,
      pose(t) {
        let say = "Ready";
        const drive = inOut(span(t, 0.3, 2.0));
        const x = lerp(start, stop, drive);
        if (t > 0.3) say = "Dribbling";
        // The ball rides in the cradle until the bot brakes, then rolls on alone.
        const release = 1.55;
        const xr = lerp(start, stop, inOut(span(release, 0.3, 2.0)));
        const roll = out(span(t, release, 2.9));
        const bx = t < release ? x : lerp(xr, ballEnd, roll);
        const hop = t > 2.9 && t < 4.3 ? Math.abs(Math.sin((t - 2.9) * Math.PI * 2.15)) * 12 * (1 - span(t, 2.9, 4.3) * 0.5) : 0;
        const back = inOut(span(t, 4.8, 5.8));
        const rx = lerp(x, start, back);
        r.move(r.parts.ours, [rx, 0, hop]);
        r.move(r.parts["ours-front"], [rx, 0, hop]);
        const turns = ((bx - start) / ballR) * (180 / Math.PI);
        if (t < 4.8) {
          r.move(r.parts.ball, [bx, 0, 0]);
          r.fade(r.parts.ball, 1);
        } else {
          r.move(r.parts.ball, t < 5.3 ? [bx, 0, 0] : [rx, 0, 0]);
          r.fade(r.parts.ball, t < 5.3 ? 1 - span(t, 4.8, 5.3) : span(t, 5.3, 5.9));
        }
        seams.setAttribute("transform", `rotate(${(t < 5.3 ? turns : 0).toFixed(1)} ${cx} ${cy})`);
        if (t > 2.75) say = "Goal!";
        if (t > 2.9 && burstAt < 0) { burstAt = t; burst(); }
        if (burstAt >= 0) {
          const dt = t - burstAt;
          for (const b of bits) {
            const px = b.x + b.vx * dt;
            const py = b.y + b.vy * dt + 160 * dt * dt;
            b.el.setAttribute("transform", `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${(b.spin * dt).toFixed(0)})`);
            b.el.setAttribute("opacity", clamp(1.6 - dt).toFixed(2));
          }
          if (dt > 1.7) { confetti.innerHTML = ""; bits = []; }
        }
        if (t > 4.8) say = "Reset";
        return say;
      },
      reset() { burstAt = -1; confetti.innerHTML = ""; bits = []; },
    };
  }

  // ---- Obstacle: ping while closing in, read the distance, stop, turn, leave.
  function obstacle(r) {
    const { start, box, sonar } = r.meta;
    const stopAt = box - 50 - sonar; // stop with the transducers 5 cm from the box
    const pings = [...r.svg.querySelectorAll("[data-ping]")];
    const cx = +pings[0].dataset.cx, cy = +pings[0].dataset.cy;
    const xAt = (t) => lerp(start, stopAt, out(span(t, 0.3, 2.5)));
    const PERIOD = 0.42, SPEED = 320;
    return {
      length: 5.6,
      pose(t) {
        const x = xAt(t);
        const turnT = inOut(span(t, 2.9, 3.5));
        const away = inQ(span(t, 3.5, 4.6)) * 300;
        const gone = span(t, 4.2, 4.6);
        const back = span(t, 4.8, 5.4);
        r.move(r.parts.ours, t < 4.8 ? [x, 0, 0] : [start, 0, 0]);
        r.move(r.parts.h90, [x, away, 0]);
        r.fade(r.parts.ours, t < 4.8 ? 1 - turnT : back);
        r.fade(r.parts.h90, t < 4.8 ? turnT * (1 - gone) : 0);
        // A ping leaves every PERIOD seconds and fades as it nears the box.
        pings.forEach((el, i) => {
          let shown = 0;
          for (let n = i; n < 12; n += pings.length) {
            const t0 = 0.3 + n * PERIOD;
            if (t0 > 2.8 || t < t0) continue;
            const from = xAt(t0) + sonar;
            const travel = (t - t0) * SPEED;
            const at = from + travel;
            if (at > box) continue;
            const [ox, oy] = r.screen([at - (start + sonar), 0, 0]);
            const s = Math.min(2.2, 1 + travel / 120);
            el.setAttribute("transform", `translate(${(cx + ox).toFixed(1)} ${(cy + oy).toFixed(1)}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy})`);
            shown = clamp((box - at) / 120) * 0.9;
          }
          el.setAttribute("opacity", shown.toFixed(2));
        });
        const cm = Math.max(0, (box - (x + sonar)) / 10);
        if (t < 0.3) return "Ready";
        if (t < 2.6) return `Distance ${cm.toFixed(1)} cm`;
        if (t < 2.9) return `Obstacle · ${cm.toFixed(0)} cm`;
        if (t < 3.5) return "Turning";
        if (t < 4.8) return "Clear";
        return "Reset";
      },
    };
  }

  const SCENES = { sumo, soccer, obstacle };

  function mount(host, svg) {
    if (!host || !svg || !SCENES[svg.dataset.scene]) return;
    const scene = SCENES[svg.dataset.scene](rig(svg));
    const say = host.querySelector("[data-say]");
    const idle = matchMedia("(hover: none)").matches ? "Tap to play" : "Hover to play";
    let wanted = false, frame = 0, began = 0;
    const setSay = (text) => { if (say && say.textContent !== text) say.textContent = text; };

    if (still.matches) { setSay("Motion off"); return; }
    setSay(idle);

    const tick = (now) => {
      if (!began) began = now;
      let t = (now - began) / 1000;
      if (t >= scene.length) {
        scene.reset?.();
        if (!wanted) { scene.pose(0); setSay(idle); host.removeAttribute("data-playing"); frame = 0; began = 0; return; }
        began = now; t = 0;
      }
      setSay(scene.pose(t));
      frame = requestAnimationFrame(tick);
    };
    const play = () => {
      wanted = true;
      host.setAttribute("data-playing", "");
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const stop = () => { wanted = false; };

    host.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") play(); });
    host.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") stop(); });
    host.addEventListener("click", () => { if (!frame) { play(); stop(); } });
    host.addEventListener("focus", () => { if (host.matches(":focus-visible")) play(); });
    host.addEventListener("blur", stop);
    host.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!frame) { play(); stop(); } } });
  }

  window.BotScenes = { mount };
})();
