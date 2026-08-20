# PIXEL COSMOS

Infinite retro pixel-art space exploration in the browser. Pan a huge 2D sector map, buy planets with Stardust, customize owned worlds, and redeem promo codes. Progress is saved in `localStorage`.

## Run

Open `index.html` in a modern browser, or serve the folder:

```bash
npx --yes serve .
```

ES modules need a local server in some browsers if you open the file directly.

## Accounts

You must register a pilot name before playing. That name is painted on every planet you buy (`@username`). Other local accounts on the same browser can log in and see those deeds.

Zoom **deep into** a planet to land on its pixel surface and watch the owner's photos / YouTube videos. Scroll out to return to space.

## Controls

- Click and drag to pan (camera keeps inertia)
- Scroll wheel to zoom toward the cursor
- Click a planet to inspect / buy / edit
- WASD or arrow keys for extra thrust
- Click the minimap to warp

## Economy

Starting wallet: **4,200 Stardust**. Unowned planets are locked until purchased.

Promo codes (one-time each):

| Code | Reward |
| --- | --- |
| `GALAXY2026` | 2,026 |
| `PIXEL1000` | 1,000 |
| `STARSEED` | 5,000 |
| `VOID99` | 999 |
| `COSMOS` | 7,500 |

## Stack

Vanilla HTML, CSS, and Canvas 2D with `requestAnimationFrame`. No build step.
