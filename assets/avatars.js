// Avatar badges, shared by the board and the admin page: each character's colour and initials.
(() => {
  const COLOURS = {
    Mario: ["#e52521", "#fff"], Luigi: ["#2f9e44", "#fff"], Yoshi: ["#7ccf52", "#13361a"],
    Toad: ["#f04a3c", "#fff"], "Princess Peach": ["#f48fb1", "#4a1028"], Bowser: ["#f2a51f", "#2d4a12"],
    Boo: ["#c9c3e6", "#2b2440"], Goomba: ["#8a4f24", "#fff"], Wario: ["#f2d21f", "#3b2a63"],
    Waluigi: ["#5b3c88", "#f2d21f"], "Donkey Kong": ["#7a4a24", "#fff"], Daisy: ["#f39c34", "#2d4a12"],
  };
  const lookup = Object.fromEntries(Object.entries(COLOURS).map(([name, c]) => [name.toLowerCase(), c]));
  lookup.peach = COLOURS["Princess Peach"];
  const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function html(name) {
    const [bg, fg] = lookup[String(name || "").toLowerCase().trim()] || ["#d9d7d0", "#141414"];
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    const initials = escape((words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "·").slice(0, 2)).toUpperCase());
    return `<span class="avatar" style="--av:${bg};--av-ink:${fg}" title="${escape(name || "No avatar")}" aria-hidden="true">${initials}</span>`;
  }

  window.Avatars = { names: Object.keys(COLOURS), html };
})();
