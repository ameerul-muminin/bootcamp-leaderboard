// Score entry for admins. Loads the board from api/board, edits it locally,
// and saves the whole board back with the revision it was loaded at.
(() => {
  const $ = (selector) => document.querySelector(selector);
  const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const CATS = [
    { key: "attendance", label: "Attendance", color: "var(--s-att)" },
    { key: "assignment", label: "Assignment", color: "var(--s-hw)" },
    { key: "quiz", label: "Quiz", color: "var(--s-quiz)" },
  ];

  let board = null;
  let day = null;
  let dirty = false;

  const api = async (path, options = {}) => {
    const response = await fetch(`/api/${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      credentials: "same-origin",
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  };

  let toastTimer = 0;
  function toast(text, bad = false) {
    const el = $("[data-toast]");
    el.textContent = text;
    el.toggleAttribute("data-bad", bad);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, bad ? 6000 : 2600);
  }

  function setDirty(value) {
    dirty = value;
    const state = $("[data-save-state]");
    state.toggleAttribute("data-dirty", dirty);
    state.textContent = dirty ? "Unsaved changes" : board?.updatedAt ? `Saved ${new Date(board.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : "All saved";
    $("[data-save]").disabled = !dirty;
  }

  const days = () => Object.keys(board.days).map(Number).sort((a, b) => a - b);
  const scoreOf = (d, id) => board.days[d]?.[id] || { attendance: 0, assignment: 0, quiz: 0 };
  const sum = (s) => s.attendance + s.assignment + s.quiz;
  const totalOf = (id) => days().reduce((n, d) => n + sum(scoreOf(d, id)), 0);

  // ---- Rendering
  function renderDays() {
    const list = days();
    $("[data-days]").innerHTML = list.map((d) => `<button role="tab" aria-selected="${d === day}" data-day="${d}">Class ${d}</button>`).join("") +
      `<button class="add" data-add-day>+ Class</button>`;
  }

  function renderGrid() {
    $("[data-day-title]").textContent = day ? `Class ${day}` : "No classes yet";
    $("[data-grid]").innerHTML = board.teams.map((team) => {
      const s = scoreOf(day, team.id);
      const cells = CATS.map((c) => `<td data-label="${c.label}"><div class="cell-pt">
          <button class="step" data-step="-1" data-cat="${c.key}" data-id="${team.id}" aria-label="${c.label} minus one for ${escape(team.name)}">−</button>
          <button class="pt" style="--c:${c.color}" ${s[c.key] > 0 ? "data-on" : ""} data-toggle="${c.key}" data-id="${team.id}" aria-pressed="${s[c.key] > 0}" aria-label="${c.label} for ${escape(team.name)}">${s[c.key]}</button>
          <button class="step" data-step="1" data-cat="${c.key}" data-id="${team.id}" aria-label="${c.label} plus one for ${escape(team.name)}">+</button>
        </div></td>`).join("");
      return `<tr><td><span class="team">${window.Avatars.html(team.avatar)}<span class="team-text"><span class="team-name">${escape(team.name)}</span><span class="char">${escape(team.avatar || "")}</span></span></span></td>${cells}
        <td class="num">${sum(s)}</td><td class="num">${totalOf(team.id)}</td></tr>`;
    }).join("");
    const none = !day;
    document.querySelectorAll("[data-fill], [data-clear], [data-remove-day]").forEach((b) => { b.disabled = none; });
  }

  function renderTeams() {
    const options = (current) => {
      const names = window.Avatars.names.includes(current) || !current ? window.Avatars.names : [current, ...window.Avatars.names];
      return `<option value="">No avatar</option>` + names.map((n) => `<option ${n === current ? "selected" : ""}>${escape(n)}</option>`).join("");
    };
    $("[data-teams]").innerHTML = board.teams.map((team, i) => `<div class="team-edit">
        ${window.Avatars.html(team.avatar)}
        <input value="${escape(team.name)}" data-name="${i}" aria-label="Team name" maxlength="40">
        <select data-avatar="${i}" aria-label="Avatar">${options(team.avatar)}</select>
        <button class="btn btn-danger" data-remove-team="${i}">Remove</button>
      </div>`).join("");
  }

  const render = () => { renderDays(); renderGrid(); renderTeams(); };

  // ---- Editing
  function setScore(id, cat, value) {
    if (!day) return;
    const row = (board.days[day][id] ||= { attendance: 0, assignment: 0, quiz: 0 });
    row[cat] = Math.max(0, Math.min(10, value));
    setDirty(true);
    renderGrid();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.day) { day = Number(t.dataset.day); renderDays(); renderGrid(); }
    else if (t.hasAttribute("data-add-day")) {
      const next = days().length ? Math.max(...days()) + 1 : 2;
      board.days[next] = {};
      day = next;
      setDirty(true);
      render();
    } else if (t.dataset.toggle) {
      const current = scoreOf(day, t.dataset.id)[t.dataset.toggle];
      setScore(t.dataset.id, t.dataset.toggle, current > 0 ? 0 : 1);
    } else if (t.dataset.step) {
      setScore(t.dataset.id, t.dataset.cat, scoreOf(day, t.dataset.id)[t.dataset.cat] + Number(t.dataset.step));
    } else if (t.dataset.fill) {
      board.teams.forEach((team) => { (board.days[day][team.id] ||= { attendance: 0, assignment: 0, quiz: 0 })[t.dataset.fill] = 1; });
      setDirty(true); renderGrid();
    } else if (t.hasAttribute("data-clear")) {
      if (!confirm(`Set every score in class ${day} to 0?`)) return;
      board.days[day] = {};
      setDirty(true); renderGrid();
    } else if (t.hasAttribute("data-remove-day")) {
      if (!confirm(`Delete class ${day} and all its scores?`)) return;
      delete board.days[day];
      day = days().at(-1) || null;
      setDirty(true); render();
    } else if (t.hasAttribute("data-add-team")) {
      const name = prompt("Team name?")?.trim();
      if (!name) return;
      let id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
      while (board.teams.some((x) => x.id === id)) id += "-2";
      board.teams.push({ id, name, avatar: "" });
      setDirty(true); render();
    } else if (t.dataset.removeTeam) {
      const team = board.teams[Number(t.dataset.removeTeam)];
      if (!confirm(`Remove ${team.name} and all of its scores?`)) return;
      board.teams.splice(Number(t.dataset.removeTeam), 1);
      for (const d of days()) delete board.days[d][team.id];
      setDirty(true); render();
    } else if (t.hasAttribute("data-save")) save();
    else if (t.hasAttribute("data-signout")) signOut();
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.name !== undefined) {
      const name = el.value.trim();
      if (!name) { el.value = board.teams[el.dataset.name].name; return; }
      board.teams[el.dataset.name].name = name;
      setDirty(true); renderGrid();
    } else if (el.dataset.avatar !== undefined) {
      board.teams[el.dataset.avatar].avatar = el.value;
      setDirty(true); renderGrid(); renderTeams();
    }
  });

  addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); if (dirty) save(); } });

  // ---- Server
  async function load() {
    const { ok, data } = await api("board", { cache: "no-store" });
    if (!ok) { toast(data.error || "Could not load the board.", true); return; }
    board = data;
    board.days ||= {};
    day = days().at(-1) || null;
    setDirty(false);
    render();
  }

  async function save() {
    const button = $("[data-save]");
    button.disabled = true;
    const { ok, status, data } = await api("board", { method: "PUT", body: JSON.stringify(board) });
    if (ok) {
      board = data;
      if (day && !board.days[day]) day = days().at(-1) || null;
      setDirty(false);
      render();
      toast("Saved. The board updates within a minute.");
    } else if (status === 409) {
      toast(data.error, true);
      if (confirm("Someone else saved first. Load their version? Your unsaved changes here will be lost.")) { setDirty(false); load(); }
      else button.disabled = false;
    } else if (status === 401) {
      toast("Your session ended. Sign in again; your changes are kept on this page.", true);
      showLogin();
      button.disabled = false;
    } else {
      toast(data.error || "Save failed.", true);
      button.disabled = false;
    }
  }

  // Setup status from GET api/session: what is missing, in the words of the Vercel dashboard.
  let check = null;
  function showLogin(ready = check?.ready) {
    $("[data-login]").hidden = false;
    $("[data-signout]").hidden = true;
    const c = check?.check;
    const items = [];
    if (ready && !ready.password) items.push("<b>ADMIN_PASSWORD</b> is not set for <b>Production</b>. Project → Settings → Environment Variables → add it with the Production box ticked.");
    if (ready && !ready.storage) items.push(`No Upstash storage variables found. Project → <b>Storage</b> → <b>Upstash for Redis</b> → <b>Connect Project</b> (tick Production).${c?.variables?.length ? ` Found only: ${c.variables.map(escape).join(", ")}.` : ""}`);
    if (c?.storageError) items.push(escape(c.storageError));
    else if (ready?.storage && c && !c.storageOk) items.push("Storage is connected but did not answer. Check the database is active in Upstash.");
    if (items.length) items.push("Then <b>Deployments → ⋯ → Redeploy</b>. New variables only reach a fresh deployment.");
    const setup = $("[data-setup]");
    setup.hidden = !items.length;
    setup.innerHTML = items.length ? `<b>Setup needed</b><ol>${items.map((i) => `<li>${i}</li>`).join("")}</ol>` : "";
    $("#password").focus();
  }

  async function showEditor() {
    $("[data-login]").hidden = true;
    $("[data-editor]").hidden = false;
    $("[data-signout]").hidden = false;
    if (!board) await load();
  }

  $("[data-login-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("[data-login-msg]");
    msg.textContent = "";
    const { ok, status, data } = await api("session", { method: "POST", body: JSON.stringify({ password: $("#password").value }) });
    if (!ok) { msg.textContent = data.error || `Sign in failed (server error ${status}). Check the function logs in Vercel.`; return; }
    $("#password").value = "";
    if (!data.ready.storage) { showLogin(data.ready); msg.textContent = "Password accepted, but storage is not set up yet (see below)."; return; }
    showEditor();
  });

  async function signOut() {
    if (dirty && !confirm("Sign out without saving?")) return;
    await api("session", { method: "DELETE" });
    setDirty(false);
    location.reload();
  }

  (async () => {
    const { ok, status, data } = await api("session");
    if (!ok) {
      showLogin();
      const setup = $("[data-setup]");
      setup.hidden = false;
      setup.innerHTML = `<b>The admin API is not answering</b> (${status === 404 ? "not found: the api folder did not deploy" : `error ${status}`}). In Vercel, open the latest deployment → <b>Functions</b> / <b>Logs</b> to see why.`;
      return;
    }
    check = data;
    if (data.admin && data.ready.storage && data.check?.storageOk !== false) showEditor();
    else showLogin(data.ready);
  })();
})();
