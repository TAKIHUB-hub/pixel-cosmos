import { PALETTES } from "./planets.js";
import { accountOf, currentUser, hashPassword } from "./storage.js";

const CODES = {
  GALAXY2026: 2026,
  PIXEL1000: 1000,
  STARSEED: 5000,
  VOID99: 999,
  COSMOS: 7500,
};

export function formatDust(n) {
  return Math.floor(n).toLocaleString("en-US");
}

export function youtubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function mediaList(deed) {
  if (!deed) return [];
  if (Array.isArray(deed.media) && deed.media.length) return deed.media;
  const list = [];
  if (deed.imageUrl) list.push({ type: "image", url: deed.imageUrl });
  if (deed.youtubeUrl) list.push({ type: "youtube", url: deed.youtubeUrl });
  return list;
}

export function createUI({ getState, setState, planets, flyToPlanet, onToast }) {
  const root = document.getElementById("modal-root");
  const body = document.getElementById("modal-body");
  const closeBtn = document.getElementById("modal-close");
  const balanceEl = document.getElementById("balance");
  const coordsEl = document.getElementById("coords");
  const pilotEl = document.getElementById("pilot-name");
  const authRoot = document.getElementById("auth-root");
  const authBody = document.getElementById("auth-body");
  const surfaceRoot = document.getElementById("surface-root");
  const surfaceStage = document.getElementById("surface-stage");
  const surfaceBanner = document.getElementById("surface-banner");
  let surfacePlanetId = null;
  let lastLanded = false;

  closeBtn.addEventListener("click", hide);
  root.querySelector("[data-close]").addEventListener("click", hide);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !authRoot.hidden) return;
    if (e.key === "Escape") hide();
  });
  body.addEventListener("change", (e) => {
    if (e.target.id !== "palette") return;
    const id = body.querySelector("[data-action='save-planet']")?.dataset.id;
    const state = getState();
    const user = currentUser(state);
    const deed = state.deeds[id];
    if (!id || !deed || deed.owner !== user) return;
    deed.paletteId = e.target.value;
    setState(state);
  });

  document.getElementById("btn-atlas").addEventListener("click", showAtlas);
  document.getElementById("btn-codes").addEventListener("click", showCodes);
  document.getElementById("btn-help").addEventListener("click", showHelp);
  document.getElementById("btn-account").addEventListener("click", showAccount);

  function show(html) {
    body.innerHTML = html;
    root.hidden = false;
    bind(body);
  }

  function hide() {
    root.hidden = true;
    body.innerHTML = "";
  }

  function bind(scope) {
    scope.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", () => handle(el.dataset.action, el));
    });
  }

  function handle(action, el) {
    const state = getState();
    const user = currentUser(state);
    const id = el.dataset.id;

    if (action === "buy") {
      const planet = planets.find((p) => p.id === id);
      const acc = accountOf(state);
      if (!planet || !acc || !user) return;
      if (state.deeds[id]) {
        onToast("ALREADY CLAIMED");
        return;
      }
      if (acc.balance < planet.price) {
        onToast("INSUFFICIENT STARDUST");
        return;
      }
      acc.balance -= planet.price;
      state.deeds[id] = {
        owner: user,
        notes: `Deed signed by @${user}`,
        paletteId: planet.paletteId,
        media: [],
        boughtAt: Date.now(),
      };
      setState(state);
      refreshWallet();
      openPlanet(planet);
      onToast(`${planet.name} → @${user}`);
      return;
    }

    if (action === "warp") {
      const planet = planets.find((p) => p.id === id);
      if (planet) {
        flyToPlanet(planet, 1.45);
        hide();
      }
      return;
    }

    if (action === "land") {
      const planet = planets.find((p) => p.id === id);
      if (planet) {
        flyToPlanet(planet, 9.5);
        hide();
      }
      return;
    }

    if (action === "redeem") {
      const acc = accountOf(state);
      if (!acc) return;
      const input = body.querySelector("#code-input");
      const code = (input.value || "").trim().toUpperCase();
      if (!CODES[code]) {
        onToast("UNKNOWN SIGNAL");
        return;
      }
      if (acc.redeemed.includes(code)) {
        onToast("CODE ALREADY USED");
        return;
      }
      acc.redeemed.push(code);
      acc.balance += CODES[code];
      setState(state);
      refreshWallet();
      input.value = "";
      onToast(`+${formatDust(CODES[code])} STARDUST`);
      showCodes();
      return;
    }

    if (action === "save-planet") {
      const planet = planets.find((p) => p.id === id);
      const deed = state.deeds[id];
      if (!planet || !deed || deed.owner !== user) return;
      deed.notes = body.querySelector("#notes").value;
      deed.paletteId = body.querySelector("#palette").value;
      setState(state);
      onToast("PLANET LOG SAVED");
      openPlanet(planet);
      return;
    }

    if (action === "add-media") {
      const planet = planets.find((p) => p.id === id);
      const deed = state.deeds[id];
      if (!planet || !deed || deed.owner !== user) return;
      const type = body.querySelector("#media-type").value;
      const url = sanitizeHttpUrl(body.querySelector("#media-url").value.trim());
      if (!url) {
        onToast("NEED A VALID URL");
        return;
      }
      if (type === "youtube" && !youtubeId(url)) {
        onToast("BAD YOUTUBE LINK");
        return;
      }
      deed.media = mediaList(deed);
      deed.media.push({ type, url });
      setState(state);
      onToast("MEDIA PLANTED");
      openPlanet(planet);
      return;
    }

    if (action === "remove-media") {
      const planet = planets.find((p) => p.id === id);
      const deed = state.deeds[id];
      if (!planet || !deed || deed.owner !== user) return;
      const index = Number(el.dataset.index);
      deed.media = mediaList(deed).filter((_, i) => i !== index);
      setState(state);
      openPlanet(planet);
      return;
    }

    if (action === "logout") {
      state.session = null;
      setState(state);
      hide();
      refreshWallet();
      showAuth();
      return;
    }
  }

  function openPlanet(planet) {
    const state = getState();
    const user = currentUser(state);
    const deed = state.deeds[planet.id];
    if (!deed) {
      const acc = accountOf(state);
      show(`
        <h2>${escapeHtml(planet.name)}</h2>
        <p class="muted">UNCLAIMED WORLD · ${planet.rings ? "RINGED" : "BARE"} CORE</p>
        <p>Asking price <span class="price">${formatDust(planet.price)} SD</span></p>
        <p class="muted">Wallet ${formatDust(acc?.balance || 0)} SD</p>
        <div class="row">
          <button class="save-btn" data-action="buy" data-id="${planet.id}" type="button">PURCHASE DEED</button>
          <button class="chip" data-action="warp" data-id="${planet.id}" type="button">WARP</button>
          <button class="chip" data-action="land" data-id="${planet.id}" type="button">LAND</button>
        </div>
      `);
      return;
    }

    const mine = deed.owner === user;
    const items = mediaList(deed);
    const palettes = PALETTES.map(
      (p) => `<option value="${p.id}" ${p.id === deed.paletteId ? "selected" : ""}>${p.name}</option>`
    ).join("");
    const gallery = items.length
      ? items
          .map((item, i) => {
            const vid = item.type === "youtube" ? youtubeId(item.url) : null;
            return `
              <div class="media-row">
                ${vid ? `<span>YT ${escapeHtml(vid)}</span>` : `<span>IMG</span>`}
                ${mine ? `<button class="chip" data-action="remove-media" data-id="${planet.id}" data-index="${i}" type="button">DEL</button>` : ""}
              </div>
            `;
          })
          .join("")
      : `<p class="muted">No surface media yet. Zoom in to visit anyway.</p>`;

    show(`
      <h2>${escapeHtml(planet.name)}</h2>
      <p class="status-owned">OWNED BY @${escapeHtml(deed.owner)}</p>
      <p class="muted">Zoom in hard on this world to land and watch their gallery.</p>
      ${
        mine
          ? `
      <div class="field">
        <label>Captain log</label>
        <textarea id="notes">${escapeHtml(deed.notes || "")}</textarea>
      </div>
      <div class="field">
        <label>Pixel palette</label>
        <select id="palette">${palettes}</select>
      </div>
      <div class="field">
        <label>Plant media on the surface</label>
        <select id="media-type">
          <option value="image">IMAGE URL</option>
          <option value="youtube">YOUTUBE URL</option>
        </select>
        <input id="media-url" placeholder="https://..." />
      </div>
      <div class="row">
        <button class="save-btn" data-action="save-planet" data-id="${planet.id}" type="button">SAVE HUB</button>
        <button class="chip" data-action="add-media" data-id="${planet.id}" type="button">ADD MEDIA</button>
        <button class="chip" data-action="warp" data-id="${planet.id}" type="button">WARP</button>
        <button class="chip" data-action="land" data-id="${planet.id}" type="button">LAND</button>
      </div>
      ${gallery}
      `
          : `
      <p>${escapeHtml(deed.notes || "")}</p>
      ${gallery}
      <div class="row">
        <button class="chip" data-action="warp" data-id="${planet.id}" type="button">WARP</button>
        <button class="chip" data-action="land" data-id="${planet.id}" type="button">LAND</button>
      </div>
      `
      }
    `);
  }

  function showAtlas() {
    const state = getState();
    const items = planets
      .slice()
      .sort((a, b) => a.price - b.price)
      .map((p) => {
        const deed = state.deeds[p.id];
        return `
          <button class="atlas-item" data-action="warp" data-id="${p.id}" type="button">
            <span>${escapeHtml(p.name)}</span>
            <span class="${deed ? "status-owned" : "status-locked"}">${deed ? `@${escapeHtml(deed.owner)}` : "LOCKED"}</span>
            <span class="price">${formatDust(p.price)}</span>
          </button>
        `;
      })
      .join("");
    show(`
      <h2>SECTOR ATLAS</h2>
      <p class="muted">Gold names are owners. Warp, then zoom in to land.</p>
      <div class="atlas-list">${items}</div>
    `);
  }

  function showCodes() {
    const acc = accountOf(getState());
    const used = acc?.redeemed?.length
      ? acc.redeemed.map((c) => `<span class="chip active">${escapeHtml(c)}</span>`).join("")
      : `<span class="muted">NO CODES REDEEMED</span>`;
    show(`
      <h2>REDEEM SIGNAL</h2>
      <p class="muted">Known bursts: GALAXY2026 · PIXEL1000</p>
      <div class="field">
        <label>Promo code</label>
        <input id="code-input" maxlength="24" placeholder="ENTER CODE" />
      </div>
      <button class="save-btn" data-action="redeem" type="button">TRANSMIT</button>
      <p>History</p>
      <div class="row">${used}</div>
    `);
    queueMicrotask(() => body.querySelector("#code-input")?.focus());
  }

  function showHelp() {
    show(`
      <h2>FLIGHT MANUAL</h2>
      <p>Create a pilot account first. Your name is burned onto every planet you buy.</p>
      <p>Drag to pan, scroll to zoom. Zoom <strong>deep into</strong> a planet to land on its surface and watch the owner's photos and videos. Scroll out to return to space.</p>
      <p class="muted">Codes: GALAXY2026 and PIXEL1000.</p>
    `);
  }

  function showAccount() {
    const user = currentUser(getState());
    show(`
      <h2>PILOT FILE</h2>
      <p>Signed in as <span class="price">@${escapeHtml(user || "---")}</span></p>
      <div class="row">
        <button class="save-btn" data-action="logout" type="button">LOG OUT</button>
      </div>
    `);
  }

  function renderAuth() {
    authBody.innerHTML = `
      <h2 id="auth-title">CREATE PILOT</h2>
      <p class="muted">You need an account before claiming worlds. Your username is painted on every deed.</p>
      <div class="field">
        <label>Username</label>
        <input id="auth-user" maxlength="16" placeholder="3-16 LETTERS" />
      </div>
      <div class="field">
        <label>Password</label>
        <input id="auth-pass" type="password" maxlength="32" placeholder="4+ CHARS" />
      </div>
      <div class="row">
        <button class="save-btn" id="auth-register" type="button">REGISTER</button>
        <button class="chip" id="auth-login" type="button">LOG IN</button>
      </div>
    `;
    authBody.querySelector("#auth-register").addEventListener("click", () => submitAuth("register"));
    authBody.querySelector("#auth-login").addEventListener("click", () => submitAuth("login"));
  }

  function submitAuth(mode) {
    const username = (authBody.querySelector("#auth-user").value || "").trim();
    const password = authBody.querySelector("#auth-pass").value || "";
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      onToast("USERNAME 3-16 [A-Z 0-9 _]");
      return;
    }
    if (password.length < 4) {
      onToast("PASSWORD TOO SHORT");
      return;
    }
    const state = getState();
    const key = Object.keys(state.accounts).find((k) => k.toLowerCase() === username.toLowerCase()) || username;
    const passHash = hashPassword(key, password);

    if (mode === "register") {
      if (state.accounts[key]) {
        onToast("NAME TAKEN");
        return;
      }
      let balance = 4200;
      let redeemed = [];
      if (state.legacy && Object.keys(state.accounts).length === 0) {
        balance = state.legacy.balance || 4200;
        redeemed = state.legacy.redeemed || [];
        for (const [pid, old] of Object.entries(state.legacy.owned || {})) {
          if (state.deeds[pid]) continue;
          state.deeds[pid] = {
            owner: key,
            notes: old.notes || "",
            paletteId: old.paletteId,
            media: mediaList(old),
            boughtAt: old.boughtAt || Date.now(),
          };
        }
        state.legacy = null;
      }
      state.accounts[key] = { passwordHash: passHash, balance, redeemed };
      state.session = key;
      setState(state);
      onToast(`WELCOME @${key}`);
    } else {
      const acc = state.accounts[key];
      if (!acc || acc.passwordHash !== passHash) {
        onToast("BAD CREDENTIALS");
        return;
      }
      state.session = key;
      setState(state);
      onToast(`WELCOME BACK @${key}`);
    }
    refreshWallet();
    hideAuth();
  }

  function showAuth() {
    authRoot.hidden = false;
    document.body.classList.add("needs-auth");
    renderAuth();
  }

  function hideAuth() {
    authRoot.hidden = true;
    document.body.classList.remove("needs-auth");
  }

  function syncSurface(planet, amount) {
    const deep = Boolean(planet && amount > 0.42);
    document.body.classList.toggle("is-landed", deep);
    if (!deep) {
      if (lastLanded) {
        surfaceStage.innerHTML = "";
        surfacePlanetId = null;
      }
      lastLanded = false;
      surfaceRoot.hidden = true;
      return;
    }

    const deed = getState().deeds[planet.id];
    surfaceRoot.hidden = false;
    surfaceRoot.style.opacity = String(Math.min(1, (amount - 0.42) / 0.35));
    surfaceRoot.classList.toggle("is-deep", amount > 0.72);
    surfaceBanner.textContent = deed?.owner
      ? `SURFACE OF ${planet.name} · @${deed.owner} · SCROLL OUT TO LEAVE`
      : `EMPTY WORLD · ${planet.name} · SCROLL OUT TO LEAVE`;

    if (surfacePlanetId !== planet.id) {
      surfacePlanetId = planet.id;
      const items = mediaList(deed);
      if (!items.length) {
        surfaceStage.innerHTML = `<div class="surface-empty">NO MEDIA PLANTED ON THIS WORLD</div>`;
      } else {
        surfaceStage.innerHTML = items
          .map((item, i) => {
            const vid = item.type === "youtube" ? youtubeId(item.url) : null;
            if (vid) {
              return `<article class="surface-card" style="--i:${i}"><iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen title="Planet video ${i + 1}"></iframe></article>`;
            }
            return `<article class="surface-card" style="--i:${i}"><img alt="Planet photo ${i + 1}" src="${escapeAttr(item.url)}" /></article>`;
          })
          .join("");
      }
    }
    lastLanded = true;
  }

  function refreshWallet() {
    const state = getState();
    const user = currentUser(state);
    const acc = accountOf(state);
    balanceEl.textContent = formatDust(acc?.balance || 0);
    pilotEl.textContent = user ? `@${user}` : "---";
  }

  function refreshCoords(camera) {
    coordsEl.innerHTML = `<span>X ${camera.x.toFixed(0)}</span><span>Y ${camera.y.toFixed(0)}</span><span>Z ${camera.zoom.toFixed(2)}x</span>`;
  }

  refreshWallet();
  if (!currentUser(getState())) showAuth();
  else hideAuth();

  return {
    openPlanet,
    hide,
    refreshWallet,
    refreshCoords,
    showAtlas,
    showCodes,
    showHelp,
    showAuth,
    syncSurface,
  };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', "&quot;");
}

function sanitizeHttpUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch {
    /* ignore invalid */
  }
  return "";
}
