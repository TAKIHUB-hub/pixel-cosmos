const SYL_A = ["Nyx", "Vela", "Io", "Zeta", "Lyra", "Orion", "Quark", "Nova", "Helio", "Astra", "Kepler", "Voss"];
const SYL_B = ["Prime", "Minor", "Reach", "Gate", "Drift", "Hollow", "Forge", "Bloom", "Shard", "Well"];

export const PALETTES = [
  { id: "rose", name: "NEBULA ROSE", core: "#ffd6ea", mid: "#ff4d9a", rim: "#6b1038", glow: "#ff3dc8" },
  { id: "ion", name: "ION CYAN", core: "#e8ffff", mid: "#2ad4ff", rim: "#0b4a6b", glow: "#3cf0ff" },
  { id: "solar", name: "SOLAR GOLD", core: "#fff4c2", mid: "#ffb31a", rim: "#7a3b00", glow: "#ffe56b" },
  { id: "toxic", name: "TOXIC LIME", core: "#f3ffd6", mid: "#8bff3d", rim: "#24510c", glow: "#b6ff4a" },
  { id: "void", name: "VOID VIOLET", core: "#efe6ff", mid: "#8a4dff", rim: "#2a0b5c", glow: "#b57bff" },
  { id: "ash", name: "ASH MOON", core: "#f2f2f2", mid: "#9aa3b5", rim: "#2c3344", glow: "#d7dde8" },
  { id: "lava", name: "MAGMA CORE", core: "#ffe0b8", mid: "#ff5a1a", rim: "#4a1208", glow: "#ff6a2a" },
  { id: "ice", name: "GLACIER", core: "#f4fbff", mid: "#9fd7ff", rim: "#1a3f63", glow: "#9fd7ff" },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function generateGalaxy(count = 52) {
  const rng = mulberry32(20260821);
  const planets = [];

  for (let i = 0; i < count; i++) {
    const arm = i % 4;
    const t = i / count;
    const radius = 420 + t * 6200 + rng() * 380;
    const angle = arm * (Math.PI / 2) + t * Math.PI * 3.4 + rng() * 0.28;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.72;
    const size = 18 + Math.floor(rng() * 28);
    const palette = PALETTES[Math.floor(rng() * PALETTES.length)];
    const rarity = rng();
    const price = Math.round((380 + size * 42 + t * 9800 + rarity * 4200) / 50) * 50;
    const rings = rng() > 0.72;
    const name = `${pick(rng, SYL_A)}-${pick(rng, SYL_B)} ${i + 1}`;

    planets.push({
      id: `p${i}`,
      name,
      x,
      y,
      size,
      price,
      paletteId: palette.id,
      rings,
      seed: Math.floor(rng() * 1e9),
    });
  }

  return planets;
}

export function planetHit(planets, wx, wy) {
  let best = null;
  let bestD = Infinity;
  for (const p of planets) {
    const dx = wx - p.x;
    const dy = wy - p.y;
    const d = Math.hypot(dx, dy);
    const r = p.size + (p.rings ? 10 : 4);
    if (d < r && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

export function resolvePalette(planet, deed) {
  const id = deed?.paletteId || planet.paletteId;
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

export function landingFocus(camera, planets, width, height) {
  let best = null;
  let bestScore = 0;
  for (const planet of planets) {
    const sx = (planet.x - camera.x) * camera.zoom + width / 2;
    const sy = (planet.y - camera.y) * camera.zoom + height / 2;
    const screenR = planet.size * camera.zoom;
    const dist = Math.hypot(sx - width / 2, sy - height / 2);
    if (screenR < 160) continue;
    if (dist > screenR * 0.85) continue;
    const score = screenR - dist * 0.4;
    if (score > bestScore) {
      best = planet;
      bestScore = score;
    }
  }
  return best;
}

export function landAmount(camera, planet, width, height) {
  if (!planet) return 0;
  const screenR = planet.size * camera.zoom;
  const sx = (planet.x - camera.x) * camera.zoom + width / 2;
  const sy = (planet.y - camera.y) * camera.zoom + height / 2;
  const dist = Math.hypot(sx - width / 2, sy - height / 2);
  const sizeT = Math.min(1, Math.max(0, (screenR - 170) / 260));
  const centerT = Math.min(1, Math.max(0, 1 - dist / (screenR * 0.9 + 1)));
  return sizeT * centerT;
}
