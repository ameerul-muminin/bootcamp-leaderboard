(() => {
  const config = window.BOARD_CONFIG || {};
  const live = new URLSearchParams(location.search).has("live");
  if (live) document.body.dataset.live = "";

  const CATEGORIES = [
    { key: "Attendance", label: "Attendance", color: "var(--s-att)" },
    { key: "Assignment", label: "Assignment", color: "var(--s-hw)" },
    { key: "Quiz", label: "Quiz", color: "var(--s-quiz)" },
  ];


  const $ = (selector) => document.querySelector(selector);
  const chart = $("[data-chart]");
  const tableView = $("[data-table]");
  const tip = $("[data-tip]");
  const status = $("[data-status]");

  const keyOf = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const num = (value) => { const n = parseFloat(value); return Number.isFinite(n) ? n : 0; };
  const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const [head = [], ...body] = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
    const keys = head.map((h) => h.trim().replace(/:$/, ""));
    return body.map((r) => Object.fromEntries(keys.map((key, i) => [key, (r[i] || "").trim()])));
  }

  // Header names are matched loosely so "Team Name:" or "team" both work.
  const pick = (record, ...names) => {
    const wanted = names.map(keyOf);
    const hit = Object.keys(record).find((key) => wanted.includes(keyOf(key)));
    return hit ? record[hit] : "";
  };

  async function load(url, fallback) {
    if (url) {
      try {
        const sep = url.includes("?") ? "&" : "?";
        const response = await fetch(url + sep + "t=" + Date.now(), { cache: "no-store" });
        if (response.ok) return { rows: parseCsv(await response.text()), live: true };
      } catch (error) { console.warn("Sheet unreachable, using local data", error); }
    }
    const response = await fetch(fallback, { cache: "no-store" });
    return { rows: parseCsv(await response.text()), live: false };
  }

  function standings(teamRows, scoreRows) {
    const teams = new Map();
    for (const row of teamRows) {
      const name = pick(row, "Team", "Team Name");
      if (!name) continue;
      teams.set(keyOf(name), { name, avatar: pick(row, "Avatar", "Avatar taken in first class"), points: { Attendance: 0, Assignment: 0, Quiz: 0 }, days: {} });
    }
    const days = new Set();
    for (const row of scoreRows) {
      const name = pick(row, "Team", "Team Name");
      if (!name) continue;
      const key = keyOf(name);
      if (!teams.has(key)) teams.set(key, { name, avatar: "", points: { Attendance: 0, Assignment: 0, Quiz: 0 }, days: {} });
      const team = teams.get(key);
      const day = pick(row, "Day", "Class") || "?";
      days.add(day);
      const entry = (team.days[day] ||= { Attendance: 0, Assignment: 0, Quiz: 0 });
      for (const { key: category } of CATEGORIES) {
        const value = num(pick(row, category, category === "Assignment" ? "HW" : category, category === "Quiz" ? "Quizzes" : category));
        team.points[category] += value;
        entry[category] += value;
      }
    }
    const list = [...teams.values()].map((team) => ({ ...team, total: CATEGORIES.reduce((sum, c) => sum + team.points[c.key], 0) }));
    list.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    list.forEach((team, i) => { team.rank = i > 0 && team.total === list[i - 1].total ? list[i - 1].rank : i + 1; });
    return { list, days: [...days].sort((a, b) => num(a) - num(b)) };
  }

  const avatarHtml = (name) => window.Avatars.html(name);

  function renderChart({ list }) {
    if (!list.length) { chart.innerHTML = `<li class="empty">No teams yet.</li>`; return; }
    const max = Math.max(3, ...list.map((t) => t.total));
    chart.style.setProperty("--unit", `${100 / max}%`);
    chart.innerHTML = list.map((team) => {
      const segs = CATEGORIES.filter((c) => team.points[c.key] > 0).map((c) =>
        `<span class="seg" tabindex="0" style="--c:${c.color};width:calc(${(team.points[c.key] / max) * 100}% - 2px)" data-tip-text="${escape(`${team.name} · ${c.label}: ${team.points[c.key]}`)}" aria-label="${escape(`${c.label} ${team.points[c.key]}`)}"></span>`).join("");
      return `<li class="row"${team.rank === 1 && team.total > 0 ? " data-top" : ""}>
        <span class="rank">${String(team.rank).padStart(2, "0")}</span>
        <span class="team">${avatarHtml(team.avatar)}<span class="team-text"><span class="team-name">${escape(team.name)}</span>${team.avatar ? `<span class="char">${escape(team.avatar)}</span>` : ""}</span></span>
        <span class="track" style="--unit:${100 / max}%"><span class="bar-fill">${segs}</span></span>
        <span class="total" aria-label="${team.total} points">${team.total}</span>
      </li>`;
    }).join("");
  }

  function renderTable({ list, days }) {
    const head = `<tr><th>Team</th>${days.map((d) => `<th>Day ${escape(d)}</th>`).join("")}${CATEGORIES.map((c) => `<th>${c.label}</th>`).join("")}<th>Total</th></tr>`;
    const body = list.map((team) => `<tr><td>${escape(team.name)}</td>${days.map((d) => {
      const e = team.days[d];
      return `<td>${e ? e.Attendance + e.Assignment + e.Quiz : "–"}</td>`;
    }).join("")}${CATEGORIES.map((c) => `<td>${team.points[c.key]}</td>`).join("")}<td><b>${team.total}</b></td></tr>`).join("");
    tableView.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  function renderMeta({ list, days }, isLive) {
    $("[data-team-count]").textContent = String(list.length).padStart(2, "0");
    $("[data-day-count]").textContent = String(days.length).padStart(2, "0");
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $("[data-updated]").textContent = `Last read at ${time}. Scored so far: ${days.length ? days.map((d) => "Day " + d).join(", ") : "none"}.`;
    status.textContent = isLive ? "Live" : "Local data";
    status.dataset.state = isLive ? "live" : "local";
  }

  // The admin dashboard's board (api/board.js), as the same rows the CSVs give.
  async function loadBoard() {
    try {
      const response = await fetch("api/board", { cache: "no-store" });
      if (!response.ok) return null;
      const board = await response.json();
      const nameOf = Object.fromEntries(board.teams.map((t) => [t.id, t.name]));
      const scores = Object.entries(board.days || {}).flatMap(([day, rows]) =>
        Object.entries(rows).filter(([id]) => nameOf[id]).map(([id, s]) => ({ Day: day, Team: nameOf[id], Attendance: s.attendance, Assignment: s.assignment, Quiz: s.quiz })));
      return { teams: board.teams.map((t) => ({ Team: t.name, Avatar: t.avatar })), scores };
    } catch { return null; }
  }

  async function refresh() {
    try {
      const board = await loadBoard();
      let data, isLive;
      if (board) {
        data = standings(board.teams, board.scores);
        isLive = true;
      } else {
        const [teams, scores] = await Promise.all([
          load(config.teamsCsv, "data/teams.csv"),
          load(config.scoresCsv, "data/scores.csv"),
        ]);
        data = standings(teams.rows, scores.rows);
        isLive = teams.live && scores.live;
      }
      renderChart(data);
      renderTable(data);
      renderMeta(data, isLive);
    } catch (error) {
      console.error(error);
      status.textContent = "Offline";
      status.dataset.state = "";
    }
  }

  // Tooltip on each bar segment.
  const showTip = (target) => {
    const text = target?.dataset?.tipText;
    if (!text) { tip.hidden = true; return; }
    const host = tip.offsetParent.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    tip.textContent = text;
    tip.hidden = false;
    const left = Math.min(box.left - host.left, host.width - tip.offsetWidth - 8);
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${box.top - host.top - tip.offsetHeight - 6}px`;
  };
  chart.addEventListener("pointerover", (e) => showTip(e.target.closest(".seg")));
  chart.addEventListener("pointerleave", () => { tip.hidden = true; });
  chart.addEventListener("focusin", (e) => showTip(e.target.closest(".seg")));
  chart.addEventListener("focusout", () => { tip.hidden = true; });

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    const table = button.dataset.view === "table";
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-selected", String(b === button)));
    chart.hidden = table;
    tableView.hidden = !table;
  }));

  // Robot figures are prebuilt SVG fragments (tools/build-bots.mjs).
  if (!live) {
    document.querySelectorAll("[data-bot]").forEach(async (slot) => {
      try {
        slot.innerHTML = await (await fetch(`assets/bots/${slot.dataset.bot}.svg.html`)).text();
        window.BotScenes?.mount(slot.closest("[data-scene-host]"), slot.querySelector("svg"));
      } catch (error) { console.warn("Bot figure failed to load", error); }
    });
  }

  refresh();
  const every = (live ? config.liveRefreshSeconds : config.refreshSeconds) || 60;
  setInterval(() => { if (!document.hidden) refresh(); }, every * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
