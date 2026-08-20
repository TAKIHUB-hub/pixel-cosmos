import { resolvePalette } from "./planets.js";

const spriteCache = new Map();

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function makePlanetSprite(planet, palette) {
  const key = `${planet.id}-${palette.id}-${planet.size}-${planet.rings}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const px = planet.size;
  const pad = planet.rings ? 10 : 4;
  const dim = px + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext("2d");
  const cx = dim / 2;
  const cy = dim / 2;
  const r = px / 2;

  if (planet.rings) {
    ctx.fillStyle = palette.glow + "99";
    for (let i = 0; i < dim; i++) {
      const dx = i - cx;
      if (Math.abs(dx) < r + 8) {
        const y = cy + 1;
        ctx.fillRect(i, y, 1, 2);
        if (hash(planet.seed + i) > 0.4) ctx.fillRect(i, y - 1, 1, 1);
      }
    }
  }

  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      const n = hash(planet.seed + x * 13 + y * 71);
      const light = (dx * -0.35 + dy * -0.45) / r + 0.55;
      let color = palette.mid;
      if (d > r - 1.2) color = palette.rim;
      else if (light > 0.72 || n > 0.86) color = palette.core;
      else if (light < 0.28 || n < 0.12) color = palette.rim;
      else if (n > 0.62) color = palette.glow;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  spriteCache.set(key, canvas);
  return canvas;
}

function starColor(layer) {
  if (layer === 0) return "rgba(180, 200, 255, 0.45)";
  if (layer === 1) return "rgba(255, 255, 255, 0.8)";
  return "rgba(60, 240, 255, 0.95)";
}

export function drawWorld(ctx, camera, planets, state, time, width, height, landing) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#05040c";
  ctx.fillRect(0, 0, width, height);

  const amount = landing?.amount || 0;
  if (amount < 0.97) {
    drawNebulae(ctx, camera, width, height);
    drawStars(ctx, camera, time, width, height, 0);
    drawGrid(ctx, camera, width, height);
    drawStars(ctx, camera, time, width, height, 1);

    const view = viewBounds(camera, width, height, 80);
    for (const planet of planets) {
      if (planet.x < view.left || planet.x > view.right || planet.y < view.top || planet.y > view.bottom) {
        continue;
      }
      drawPlanet(ctx, camera, planet, state, width, height);
    }

    drawStars(ctx, camera, time, width, height, 2);
  }

  if (landing?.planet && amount > 0.02) {
    drawInterior(ctx, camera, landing.planet, state, time, width, height, amount);
  }
}

function viewBounds(camera, width, height, pad) {
  const hw = width / (2 * camera.zoom) + pad;
  const hh = height / (2 * camera.zoom) + pad;
  return {
    left: camera.x - hw,
    right: camera.x + hw,
    top: camera.y - hh,
    bottom: camera.y + hh,
  };
}

function drawNebulae(ctx, camera, width, height) {
  const blobs = [
    { x: -900, y: -400, color: "rgba(255, 61, 200, 0.07)", s: 1400 },
    { x: 1600, y: 800, color: "rgba(60, 240, 255, 0.06)", s: 1600 },
    { x: 400, y: -1800, color: "rgba(138, 77, 255, 0.07)", s: 1200 },
    { x: -2200, y: 1400, color: "rgba(255, 229, 107, 0.04)", s: 1100 },
  ];
  for (const b of blobs) {
    const sx = (b.x - camera.x) * camera.zoom * 0.35 + width / 2;
    const sy = (b.y - camera.y) * camera.zoom * 0.35 + height / 2;
    const r = b.s * camera.zoom * 0.35;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, b.color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
}

function drawStars(ctx, camera, time, width, height, layer) {
  const parallax = 0.22 + layer * 0.28;
  const cell = 220 - layer * 40;
  const density = 8 + layer * 5;
  const left = Math.floor((camera.x * parallax - width / camera.zoom) / cell) - 1;
  const right = Math.floor((camera.x * parallax + width / camera.zoom) / cell) + 1;
  const top = Math.floor((camera.y * parallax - height / camera.zoom) / cell) - 1;
  const bottom = Math.floor((camera.y * parallax + height / camera.zoom) / cell) + 1;
  ctx.fillStyle = starColor(layer);

  for (let gx = left; gx <= right; gx++) {
    for (let gy = top; gy <= bottom; gy++) {
      for (let i = 0; i < density; i++) {
        const n = hash(gx * 9176 + gy * 3943 + i * 13 + layer * 91);
        const n2 = hash(gx * 221 + gy * 887 + i * 47);
        const wx = (gx + n) * cell;
        const wy = (gy + n2) * cell;
        const sx = (wx - camera.x * parallax) * camera.zoom + width / 2;
        const sy = (wy - camera.y * parallax) * camera.zoom + height / 2;
        const twinkle = 0.55 + 0.45 * Math.sin(time * (1.4 + n) + n2 * 12);
        const size = layer === 2 ? 2 : 1;
        if (twinkle > 0.35) ctx.fillRect(sx, sy, size, size);
      }
    }
  }
}

function drawGrid(ctx, camera, width, height) {
  const step = 240;
  const left = camera.x - width / (2 * camera.zoom);
  const right = camera.x + width / (2 * camera.zoom);
  const top = camera.y - height / (2 * camera.zoom);
  const bottom = camera.y + height / (2 * camera.zoom);
  ctx.strokeStyle = "rgba(60, 240, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const x0 = Math.floor(left / step) * step;
  const y0 = Math.floor(top / step) * step;
  for (let x = x0; x <= right; x += step) {
    const sx = (x - camera.x) * camera.zoom + width / 2;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
  }
  for (let y = y0; y <= bottom; y += step) {
    const sy = (y - camera.y) * camera.zoom + height / 2;
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
  }
  ctx.stroke();
}

function drawPlanet(ctx, camera, planet, state, width, height) {
  const deed = state.deeds[planet.id];
  const palette = resolvePalette(planet, deed);
  const sprite = makePlanetSprite(planet, palette);
  const scale = camera.zoom;
  const sx = (planet.x - camera.x) * scale + width / 2;
  const sy = (planet.y - camera.y) * scale + height / 2;
  const w = sprite.width * scale;
  const h = sprite.height * scale;

  ctx.save();
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = deed ? 18 : 8;
  ctx.drawImage(sprite, sx - w / 2, sy - h / 2, w, h);
  ctx.restore();

  if (scale > 0.55 && scale < 6) {
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillStyle = deed ? "#3cf0ff" : "#7d8aa8";
    ctx.fillText(deed ? planet.name : "LOCKED", sx, sy + h / 2 + 14);
    if (deed?.owner) {
      ctx.fillStyle = "#ffe56b";
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(`@${deed.owner}`, sx, sy + h / 2 + 30);
    }
  }

  if (!deed) {
    ctx.strokeStyle = "rgba(255, 61, 200, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.floor(sx - 4), Math.floor(sy - h / 2 - 8), 8, 8);
  }
}

export function drawInterior(ctx, camera, planet, state, time, width, height, amount) {
  const deed = state.deeds[planet.id];
  const palette = resolvePalette(planet, deed);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.fillStyle = palette.rim;
  ctx.fillRect(0, 0, width, height);

  const horizon = height * 0.42;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#07051a");
  sky.addColorStop(0.55, palette.glow + "55");
  sky.addColorStop(1, palette.mid);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);

  for (let i = 0; i < 40; i++) {
    const n = hash(planet.seed + i * 19);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect((n * width + time * 8) % width, (hash(i * 7) * horizon * 0.7), 2, 2);
  }

  ctx.fillStyle = palette.mid;
  ctx.fillRect(0, horizon, width, height - horizon);

  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 48; x++) {
      const n = hash(planet.seed + x * 17 + y * 91 + Math.floor(camera.x));
      if (n < 0.55) continue;
      ctx.fillStyle = n > 0.82 ? palette.core : palette.rim;
      const px = Math.floor((x / 48) * width);
      const py = Math.floor(horizon + (y / 28) * (height - horizon));
      ctx.fillRect(px, py, Math.ceil(width / 48), Math.ceil((height - horizon) / 28));
    }
  }

  ctx.fillStyle = palette.glow + "cc";
  for (let i = 0; i < 12; i++) {
    const n = hash(planet.seed + 400 + i);
    const bx = (n * 0.8 + 0.1) * width;
    const bw = 18 + hash(i + 3) * 40;
    const bh = 40 + hash(i + 9) * 90;
    ctx.fillRect(bx, horizon - bh * 0.35, bw, bh);
  }

  ctx.strokeStyle = "rgba(5,4,12,0.55)";
  ctx.lineWidth = Math.max(40, width * 0.08);
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawMinimap(ctx, camera, planets, state, width, height) {
  const size = ctx.canvas.width;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#050712";
  ctx.fillRect(0, 0, size, size);

  const worldR = 7000;
  const scale = size / (worldR * 2);

  ctx.strokeStyle = "rgba(60,240,255,0.15)";
  ctx.strokeRect(1, 1, size - 2, size - 2);

  for (const p of planets) {
    const x = (p.x + worldR) * scale;
    const y = (p.y + worldR) * scale;
    ctx.fillStyle = state.deeds[p.id] ? "#3cf0ff" : "#ff3dc8";
    ctx.fillRect(x, y, 2, 2);
  }

  const vw = width / camera.zoom;
  const vh = height / camera.zoom;
  const rx = (camera.x - vw / 2 + worldR) * scale;
  const ry = (camera.y - vh / 2 + worldR) * scale;
  ctx.strokeStyle = "#ffe56b";
  ctx.strokeRect(rx, ry, vw * scale, vh * scale);
}
