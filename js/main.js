import { loadState, saveState, currentUser } from "./storage.js";
import { createCamera, screenToWorld, updateCamera, zoomAt, flyTo } from "./camera.js";
import { generateGalaxy, planetHit, landingFocus, landAmount } from "./planets.js";
import { drawWorld, drawMinimap } from "./renderer.js";
import { createUI } from "./ui.js";

const canvas = document.getElementById("world");
const minimap = document.getElementById("minimap");
const ctx = canvas.getContext("2d", { alpha: false });
const miniCtx = minimap.getContext("2d", { alpha: false });

const planets = generateGalaxy();
const camera = createCamera();
let state = loadState();
if (state.session && !state.accounts[state.session]) state.session = null;
let last = performance.now();
let pointer = { x: 0, y: 0, lastX: 0, lastY: 0, lastT: 0, moved: 0 };

const ui = createUI({
  getState: () => state,
  setState: (next) => {
    state = next;
    saveState(state);
  },
  planets,
  flyToPlanet: (planet, zoom = 1.45) => flyTo(camera, planet.x, planet.y, zoom),
  onToast: toast,
});

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function landing() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const planet = landingFocus(camera, planets, w, h);
  return { planet, amount: landAmount(camera, planet, w, h) };
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updateCamera(camera, dt);
  const w = window.innerWidth;
  const h = window.innerHeight;
  const land = landing();
  drawWorld(ctx, camera, planets, state, now / 1000, w, h, land);
  drawMinimap(miniCtx, camera, planets, state, w, h);
  ui.refreshCoords(camera);
  ui.syncSurface(land.planet, land.amount);
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", (e) => {
  if (!currentUser(state)) return;
  canvas.setPointerCapture(e.pointerId);
  camera.dragging = true;
  camera.fly = null;
  camera.vx = 0;
  camera.vy = 0;
  pointer.x = pointer.lastX = e.clientX;
  pointer.y = pointer.lastY = e.clientY;
  pointer.lastT = performance.now();
  pointer.moved = 0;
  canvas.classList.add("is-dragging");
});

canvas.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  if (!camera.dragging) return;
  const dx = e.clientX - pointer.lastX;
  const dy = e.clientY - pointer.lastY;
  pointer.moved += Math.hypot(dx, dy);
  camera.x -= dx / camera.zoom;
  camera.y -= dy / camera.zoom;
  const t = performance.now();
  const dt = Math.max(0.008, (t - pointer.lastT) / 1000);
  camera.vx = -dx / camera.zoom / dt;
  camera.vy = -dy / camera.zoom / dt;
  pointer.lastX = e.clientX;
  pointer.lastY = e.clientY;
  pointer.lastT = t;
});

function endDrag(e) {
  if (!camera.dragging) return;
  camera.dragging = false;
  canvas.classList.remove("is-dragging");
  if (pointer.moved < 6 && landing().amount < 0.5) {
    const world = screenToWorld(camera, e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    const hit = planetHit(planets, world.x, world.y);
    if (hit) ui.openPlanet(hit);
  }
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (!currentUser(state)) return;
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    zoomAt(camera, e.clientX, e.clientY, factor, window.innerWidth, window.innerHeight);
    if (factor > 1) {
      const focus = landingFocus(camera, planets, window.innerWidth, window.innerHeight);
      if (focus) {
        camera.x += (focus.x - camera.x) * 0.12;
        camera.y += (focus.y - camera.y) * 0.12;
      }
    }
  },
  { passive: false }
);

window.addEventListener(
  "wheel",
  (e) => {
    if (!document.body.classList.contains("is-landed")) return;
    if (e.target.closest("#surface-root")) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.88 : 1.14;
      zoomAt(camera, window.innerWidth / 2, window.innerHeight / 2, factor, window.innerWidth, window.innerHeight);
    }
  },
  { passive: false }
);

window.addEventListener("keydown", (e) => {
  if (e.target?.matches?.("input, textarea, select")) return;
  if (!currentUser(state)) return;
  const speed = 520 / camera.zoom;
  if (e.key === "ArrowLeft" || e.key === "a") camera.vx -= speed;
  if (e.key === "ArrowRight" || e.key === "d") camera.vx += speed;
  if (e.key === "ArrowUp" || e.key === "w") camera.vy -= speed;
  if (e.key === "ArrowDown" || e.key === "s") camera.vy += speed;
});

minimap.addEventListener("click", (e) => {
  if (!currentUser(state)) return;
  const rect = minimap.getBoundingClientRect();
  const worldR = 7000;
  const nx = (e.clientX - rect.left) / rect.width;
  const ny = (e.clientY - rect.top) / rect.height;
  flyTo(camera, nx * worldR * 2 - worldR, ny * worldR * 2 - worldR, Math.min(camera.zoom, 1.2));
});

function toast(message) {
  document.querySelectorAll(".toast").forEach((n) => n.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(loop);
