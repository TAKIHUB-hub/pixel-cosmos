export function createCamera() {
  return {
    x: 0,
    y: 0,
    zoom: 0.85,
    vx: 0,
    vy: 0,
    minZoom: 0.28,
    maxZoom: 22,
    dragging: false,
    fly: null,
  };
}

export function screenToWorld(camera, sx, sy, width, height) {
  return {
    x: (sx - width / 2) / camera.zoom + camera.x,
    y: (sy - height / 2) / camera.zoom + camera.y,
  };
}

export function worldToScreen(camera, wx, wy, width, height) {
  return {
    x: (wx - camera.x) * camera.zoom + width / 2,
    y: (wy - camera.y) * camera.zoom + height / 2,
  };
}

export function flyTo(camera, x, y, zoom = 1.15) {
  camera.fly = { x, y, zoom, t: 0 };
  camera.vx = 0;
  camera.vy = 0;
}

export function updateCamera(camera, dt) {
  if (camera.fly) {
    camera.fly.t = Math.min(1, camera.fly.t + dt * 1.8);
    const t = 1 - (1 - camera.fly.t) ** 3;
    camera.x += (camera.fly.x - camera.x) * t;
    camera.y += (camera.fly.y - camera.y) * t;
    camera.zoom += (camera.fly.zoom - camera.zoom) * t;
    if (camera.fly.t >= 1) camera.fly = null;
    return;
  }

  if (!camera.dragging) {
    camera.x += camera.vx * dt;
    camera.y += camera.vy * dt;
    const damp = Math.pow(0.0008, dt);
    camera.vx *= damp;
    camera.vy *= damp;
    if (Math.abs(camera.vx) < 2) camera.vx = 0;
    if (Math.abs(camera.vy) < 2) camera.vy = 0;
  }
}

export function zoomAt(camera, sx, sy, factor, width, height) {
  const before = screenToWorld(camera, sx, sy, width, height);
  camera.zoom = Math.min(camera.maxZoom, Math.max(camera.minZoom, camera.zoom * factor));
  const after = screenToWorld(camera, sx, sy, width, height);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;
}
