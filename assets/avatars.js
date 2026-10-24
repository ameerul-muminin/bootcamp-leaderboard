// Avatar badges, shared by the board and the admin page. Each character the teams
// picked has a small original icon (64 × 64, flat fills, ink outline) on a tile in
// its colour; any other name falls back to initials.
(() => {
  const INK = "#141414";
  const o = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;

  // A capped plumber's head, facing front: cap colour, letter on the badge, mustache colour.
  const plumber = (cap, brim, letter, tache) => `
    <circle cx="16.5" cy="44" r="4" fill="#f2c79a" ${o}/><circle cx="47.5" cy="44" r="4" fill="#f2c79a" ${o}/>
    <ellipse cx="32" cy="42" rx="15.5" ry="15" fill="#f2c79a" ${o}/>
    <path d="M11 32C11 17 20 8 32 8s21 9 21 24z" fill="${cap}" ${o}/>
    <path d="M12 31c12 5 28 5 40 0 1 3 0 5-3 6-10 4-24 4-34 0-3-1-4-3-3-6z" fill="${brim}" ${o}/>
    <circle cx="32" cy="20" r="7" fill="#fff" ${o}/>
    <path d="${letter}" fill="none" stroke="${cap}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="26" cy="43" rx="2.5" ry="3.3" fill="#fff" ${o}/><circle cx="26.4" cy="43.6" r="1.5" fill="#2e6fd6"/>
    <ellipse cx="38" cy="43" rx="2.5" ry="3.3" fill="#fff" ${o}/><circle cx="37.6" cy="43.6" r="1.5" fill="#2e6fd6"/>
    <path d="M18 54c4-5 9-5 14-2 5-3 10-3 14 2-3 3-9 4-14 2-5 2-11 1-14-2z" fill="${tache}" ${o}/>
    <ellipse cx="32" cy="49" rx="5" ry="4" fill="#f7d4ae" ${o}/>`;

  const ICONS = {
    mario: plumber("#e52521", "#b8141a", "M28.5 23.5v-7l3.5 4 3.5-4v7", INK),
    luigi: plumber("#2f9e44", "#1f7a32", "M30 16v7.5h5", "#5a3418"),

    yoshi: `<g transform="translate(2.6 2.4) scale(.92)">
    <path d="M13 26c-5-1-8 2-7 6 3-1 5 0 6 2zM9 37c-5 0-7 4-5 7 3-2 5-1 7 1zM10 48c-4 1-5 5-2 8 2-2 5-2 7-1z" fill="#f2771f" ${o}/>
    <path d="M15 56C8 50 7 40 9 32c2-7 7-12 14-14 6-2 11 0 14 2 3-4 9-6 15-4 8 3 11 11 9 19-2 7-9 11-16 10-3 7-10 12-19 12-4 0-8-0-11-1z" fill="#6cc24a" ${o}/>
    <path d="M14 47c7 4 17 5 24 3 2 6-3 11-10 12-7 1-13-3-14-15z" fill="#fff" ${o}/>
    <path d="M16 49c6 3 14 4 20 3-1 4-5 6-10 6-5 0-9-4-10-9z" fill="#d81e3a"/>
    <ellipse cx="20" cy="18" rx="7" ry="10" fill="#6cc24a" ${o}/>
    <ellipse cx="31" cy="16" rx="7" ry="10" fill="#6cc24a" ${o}/>
    <ellipse cx="20.5" cy="19" rx="4.8" ry="7.4" fill="#fff" ${o}/>
    <ellipse cx="31.5" cy="17" rx="4.8" ry="7.4" fill="#fff" ${o}/>
    <ellipse cx="22.2" cy="21" rx="2.6" ry="4.4" fill="#1d2f8f"/><ellipse cx="33.2" cy="19" rx="2.6" ry="4.4" fill="#1d2f8f"/>
    <circle cx="23" cy="19" r="1.1" fill="#fff"/><circle cx="34" cy="17" r="1.1" fill="#fff"/>
    <circle cx="52" cy="22" r="1.5" fill="#2d6b1f"/><circle cx="56.5" cy="25.5" r="1.5" fill="#2d6b1f"/></g>`,

    toad: `
      <path d="M15 34h34v10c0 9-7 16-17 16s-17-7-17-16z" fill="#f6e2b8" ${o}/>
      <path d="M7 33C7 19 18 6 32 6s25 13 25 27c0 3-2 5-5 5H12c-3 0-5-2-5-5z" fill="#e52521" ${o}/>
      <ellipse cx="32" cy="18" rx="8.5" ry="6.5" fill="#fff"/>
      <path d="M8.5 25c4-1 7 2 6.5 6-.5 3-4 5-7 4" fill="#fff"/><path d="M55.5 25c-4-1-7 2-6.5 6 .5 3 4 5 7 4" fill="#fff"/>
      <path d="M7 33C7 19 18 6 32 6s25 13 25 27c0 3-2 5-5 5H12c-3 0-5-2-5-5z" fill="none" ${o}/>
      <ellipse cx="26" cy="46" rx="2.3" ry="4" fill="${INK}"/><ellipse cx="38" cy="46" rx="2.3" ry="4" fill="${INK}"/>
      <circle cx="26.7" cy="44.4" r=".8" fill="#fff"/><circle cx="38.7" cy="44.4" r=".8" fill="#fff"/>
      <ellipse cx="20.5" cy="51" rx="2.6" ry="1.6" fill="#f4a3a3"/><ellipse cx="43.5" cy="51" rx="2.6" ry="1.6" fill="#f4a3a3"/>
      <path d="M29.5 53c1.5 1.4 3.5 1.4 5 0" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,

    "princess peach": `
    <path d="M7 58C3 44 5 26 14 17c9-9 27-9 36 0 9 9 11 27 7 41-3 0-6-2-8-6H15c-2 4-5 6-8 6z" fill="#ffd93b" ${o}/>
    <ellipse cx="32" cy="40" rx="16" ry="15.5" fill="#fde7d8" ${o}/>
    <path d="M15.5 38c0-11 7-19 16.5-19s16.5 8 16.5 19c-4-6-11-10-18-10-5 2-10 5-15 10z" fill="#ffd93b" ${o}/>
    <path d="M25 15l1.5-7 4 4 1.5-6 1.5 6 4-4 1.5 7z" fill="#f2b31f" ${o}/><circle cx="32" cy="12.6" r="1.6" fill="#e52521"/>
    <ellipse cx="25.5" cy="42" rx="3.8" ry="5.2" fill="#2e6fd6" ${o}/><ellipse cx="38.5" cy="42" rx="3.8" ry="5.2" fill="#2e6fd6" ${o}/>
    <ellipse cx="25.5" cy="43.2" rx="2" ry="2.8" fill="#163d8f"/><ellipse cx="38.5" cy="43.2" rx="2" ry="2.8" fill="#163d8f"/>
    <circle cx="26.8" cy="40" r="1.5" fill="#fff"/><circle cx="39.8" cy="40" r="1.5" fill="#fff"/>
    <circle cx="24.2" cy="45" r=".7" fill="#fff"/><circle cx="37.2" cy="45" r=".7" fill="#fff"/>
    <path d="M21.6 38.6c1.6-3.6 6.6-3.8 8.2-.4M21.6 38.6l-1.8-1.2M34.2 38.2c1.6-3.4 6.6-3.2 8.2.4M42.4 38.6l1.8-1.2" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="20.5" cy="48.5" rx="3" ry="1.8" fill="#f7a6c4"/><ellipse cx="43.5" cy="48.5" rx="3" ry="1.8" fill="#f7a6c4"/>
    <path d="M29.5 50c1.5 1.6 3.5 1.6 5 0" fill="none" stroke="#c23a64" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="16" cy="49" r="2.8" fill="#36b3e0" ${o}/><circle cx="48" cy="49" r="2.8" fill="#36b3e0" ${o}/>`,

    boo: `
      <path d="M10 34c0-15 10-25 23-25s22 10 22 24c0 13-9 22-21 22-6 0-11-2-14-5-4 1-8-1-8-4 2-1 2-3 0-5 0-2-2-4-2-7z" fill="#fbfbfb" ${o}/>
      <path d="M8 29c3-3 8-3 10 0-3 1-6 3-6 6-3-1-5-3-4-6z" fill="#fbfbfb" ${o}/>
      <path d="M54 26c3 0 5 3 4 6-2 0-4 0-5-1z" fill="#fbfbfb" ${o}/>
      <path d="M24 24l7 3M44 23l-7 4" fill="none" ${o}/>
      <ellipse cx="29" cy="30" rx="1.8" ry="2.6" fill="${INK}"/><ellipse cx="38.5" cy="29.5" rx="1.8" ry="2.6" fill="${INK}"/>
      <path d="M21 36c7 3 17 3 26-1-1 8-6 13-13 13s-12-5-13-12z" fill="#c8102e" ${o}/>
      <path d="M24 37l2 4 2-3 3 4 2-4 3 4 2-4 3 3 2-4" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M33 44c-2 6 0 12 5 13 4 0 6-4 4-9-1-3-5-4-9-4z" fill="#f06aa8" ${o}/>`,

    goomba: `
      <path d="M8 46c-1-14 8-34 24-34s25 20 24 34c0 6-6 10-24 10S8 52 8 46z" fill="#9b5a2a" ${o}/>
      <path d="M13 47c2-4 8-6 19-6s17 2 19 6c-2 4-8 6-19 6s-17-2-19-6z" fill="#c7352f" ${o}/>
      <path d="M20 43l3 6 3-5zM44 43l-3 6-3-5z" fill="#fff" ${o}/>
      <ellipse cx="24" cy="31" rx="5" ry="6.5" fill="#fff" ${o}/><ellipse cx="40" cy="31" rx="5" ry="6.5" fill="#fff" ${o}/>
      <ellipse cx="25.5" cy="32" rx="2.2" ry="3" fill="${INK}"/><ellipse cx="38.5" cy="32" rx="2.2" ry="3" fill="${INK}"/>
      <path d="M15 20c4-1 9 1 12 6M49 20c-4-1-9 1-12 6" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>`,

    bowser: `
      <path d="M14 22c-6-6-7-13-5-17 4 3 8 8 11 13zM50 22c6-6 7-13 5-17-4 3-8 8-11 13z" fill="#f6e7c1" ${o}/>
      <path d="M12 34c0-14 9-22 20-22s20 8 20 22z" fill="#57a83a" ${o}/>
      <path d="M20 14c2-6 7-10 12-10s10 4 12 10c-4-2-8-3-12-3s-8 1-12 3z" fill="#e5412b" ${o}/>
      <path d="M10 33c0 13 10 23 22 23s22-10 22-23c-6 2-14 3-22 3s-16-1-22-3z" fill="#f2d18a" ${o}/>
      <path d="M17 28l10 4M47 28l-10 4" fill="none" stroke="#e5412b" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="25" cy="34.5" rx="3" ry="2.4" fill="#fff" ${o}/><circle cx="25.6" cy="34.8" r="1.2" fill="#c8102e"/>
      <ellipse cx="39" cy="34.5" rx="3" ry="2.4" fill="#fff" ${o}/><circle cx="38.4" cy="34.8" r="1.2" fill="#c8102e"/>
      <path d="M20 43c7 3 17 3 24 0-1 6-6 9-12 9s-11-3-12-9z" fill="#b5162b" ${o}/>
      <path d="M23 44l2 4 2-3M41 44l-2 4-2-3" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`,
  };
  ICONS.peach = ICONS["princess peach"];

  // Tile colours: a light tint of each character's main colour, so the icon stays the focus.
  const TILES = {
    mario: "#ffd9d4", luigi: "#d5f0d7", yoshi: "#e3f5d6", toad: "#ffe1dc", "princess peach": "#ffdcea",
    peach: "#ffdcea", boo: "#e7e4f3", goomba: "#f1e0cf", bowser: "#e6f1d9",
  };
  const NAMES = ["Mario", "Luigi", "Yoshi", "Toad", "Princess Peach", "Bowser", "Boo", "Goomba"];

  const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function html(name) {
    const key = String(name || "").toLowerCase().trim();
    const title = escape(name || "No avatar");
    if (ICONS[key]) {
      return `<span class="avatar avatar-icon" style="--av:${TILES[key]}" title="${title}" aria-hidden="true"><svg viewBox="0 0 64 64">${ICONS[key]}</svg></span>`;
    }
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    const initials = escape((words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "·").slice(0, 2)).toUpperCase());
    return `<span class="avatar" style="--av:#d9d7d0;--av-ink:${INK}" title="${title}" aria-hidden="true">${initials}</span>`;
  }

  window.Avatars = { names: NAMES, html };
})();
