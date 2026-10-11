// Melbourne Pixel Train - Spawners shared by several landscapes: tree lines, tufts, fog, ponds
'use strict';

// --- shared spawners ------------------------------------------------------
// Distant line of trees, all one haze colour (far layer)
function treeLine(ctx, base = 52, rMax = 6) {
  const { rng } = ctx;
  for (let x = ctx.from; x < ctx.to; ) {
    if (rng() < 0.12) { x += randInt(rng, 8, 26); continue; }       // open gap
    const r = randInt(rng, 2, rMax), cy = base - randInt(rng, 0, 5) - r + 1, cx = x;
    if (ctx.ok(cx)) ctx.stat(cx - r, cx + r, 0, (g, p, lit, ox) => {
      disc(g, cx + ox, cy, r, p.haze);
      rect(g, cx - r + 1 + ox, cy, 2 * r - 1, base - cy, p.haze);
    });
    x += r + randInt(rng, 0, 3);
  }
}

// A far-off tower block with a grid of windows
function farTower(g, p, lit, x, base, w, h, glass, seed) {
  const rng = mulberry32(seed), top = base - h;
  rect(g, x, top, w, h, glass ? p.skyMid : p.cloudShade);
  rect(g, x + w - 1, top, 1, h, glass ? p.skyDeep : p.grayLight);
  for (let yy = top + 2; yy < base - 1; yy += 3)
    for (let xx = x + 1; xx < x + w - 1; xx += 2) {
      const on = rng() < 0.4, warm = rng() < 0.7;        // always roll: same windows in every lighting
      px(g, xx, yy, lit && on ? (warm ? PALETTE.glow : PALETTE.amber) : glass ? p.skyLight : p.grayLight);
    }
}

function addTufts(ctx, every, y0, y1, tall = 7) {
  const { rng } = ctx;
  for (let x = ctx.from + randInt(rng, 0, every); x < ctx.to; x += randInt(rng, every >> 1, (every * 1.5) | 0)) {
    const base = randInt(rng, y0, y1), h = randInt(rng, 3, tall), blades = [];
    for (let b = randInt(rng, 3, 6); b > 0; b--) blades.push([randInt(rng, -2, 2), randInt(rng, Math.max(2, h - 3), h), randInt(rng, -2, 2), rng()]);
    const flower = rng() < 0.12 ? (rng() < 0.5 ? 'red' : 'white') : null, tx = x;
    if (!ctx.ok(x)) continue;
    ctx.stat(tx - 4, tx + 4, base, (g, p, lit, ox) => {
      for (const [dx, bh, lean, cr] of blades) {
        const col = cr < 0.3 ? p.greenDark : cr < 0.7 ? p.grass : p.grassLight;
        for (let k = 0; k < bh; k++) px(g, tx + ox + dx + Math.round(lean * k / bh), base - k, col);
      }
      if (flower) { const [dx, bh, lean] = blades[0]; px(g, tx + ox + dx + lean, base - bh, p[flower]); }
    });
  }
}

// Fog banks drifting slowly back and forth (pre-dithered sprites)
function fogBands(ctx, y0, y1, gap, dens) {
  const { rng } = ctx;
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, gap, gap * 2)) {
    const w = randInt(rng, 60, 150), h = randInt(rng, 4, 8), y = randInt(rng, y0, y1), ph = rng() * 6, drift = randInt(rng, 20, 50), lx = x;
    if (!ctx.ok(x + (w >> 1))) continue;
    const key = 'fog' + w + '|' + h + '|' + dens;
    ctx.live({ x0: lx - drift, x1: lx + w + drift, z: 100 + y, warm: v => fogSprite(v, key, w, h, dens), draw(g, v, ox, oy, t) {
      g.drawImage(fogSprite(v, key, w, h, dens), Math.round(lx + Math.sin(t * 0.03 + ph) * drift) + ox, y + oy);
    } });
  }
}

function fogSprite(v, key, w, h, dens) {
  return cached(v, key, w, h, (g, p) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const ex = Math.min(1, Math.min(x, w - 1 - x) / (w * 0.3)), ey = 1 - Math.abs((y + 0.5) / h * 2 - 1);
        if (bayer(x, y) < dens * ex * (0.4 + 0.6 * ey)) px(g, x, y, p.white);
      }
  });
}

const CROPS = {                          // [base, row lines, tips lit by the wind]
  paddy:  ['paddy', 'grassLight', 'cream'],
  young:  ['grassLight', 'grass', 'paddy'],
  green:  ['grass', 'green', 'grassLight'],
  dark:   ['green', 'greenDark', 'grass'],
  fallow: ['tan', 'brown', 'paddy'],
};
const MID_BANDS = [[34, 5], [39, 7], [46, 9], [55, 11], [66, 14]];   // field bands, taller towards the viewer

// Plots along a row of fields: sorted start columns, one crop each
function plots(rng, from, to, wMin, wMax, crops) {
  const xs = [], cs = [];
  for (let x = from - wMax; x < to + wMax; x += randInt(rng, wMin, wMax)) { xs.push(x); cs.push(pick(rng, crops)); }
  return { xs, cs };
}
function plotAt(P, lx) {
  let lo = 0, hi = P.xs.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (P.xs[m] <= lx) lo = m; else hi = m - 1; }
  return lo;
}

// Pond: muddy far rim, the sky mirrored (pale near the far bank, deeper
// blue towards the viewer), a reflection of the bank along the top
function pondPixel(pd, lx, y) {
  const dx = (lx - pd.cx) / pd.rx, dy = (y - pd.cy) / pd.ry, d = dx * dx + dy * dy;
  if (d > 1.35) return null;
  if (d > 1) return dy < 0 ? 'brown' : 'greenDark';
  if (dy < -0.7) return bayer(lx, y) < 8 ? 'green' : 'skyLight';
  return dy < -0.2 ? (bayer(lx, y) < 10 ? 'skyLight' : 'skyMid') : dy < 0.4 ? 'skyMid' : bayer(lx, y) < 6 ? 'skyDeep' : 'skyMid';
}

// A stream wandering down a hillside from near the crest: [i, y] points
function streamPath(rng, w, h, base = 37) {
  let i = randInt(rng, Math.floor(w * 0.35), Math.floor(w * 0.65));
  const pts = [];
  for (let y = humpTop(i, w, h, base) + 3; y < base; y++) {
    if (y > humpTop(i, w, h, base)) pts.push([i, y]);
    i += randInt(rng, -1, 1) + (rng() < 0.3 ? Math.sign(i - w / 2) : 0);
  }
  return pts;
}

function forestHill(g, p, x, w, h, seed, stream) {
  const rng = mulberry32(seed), base = 37;
  hump(g, x, base, w, h, p.green, p.grass);
  for (let i = 0; i < w * h / 14; i++) {                          // crowns all over the slope
    const j = randInt(rng, 3, w - 4), t = humpTop(j, w, h, base), y = randInt(rng, t + 1, base), r = randInt(rng, 1, 2);
    if (y >= base) continue;
    disc(g, x + j, y, r, p.greenDark);
    px(g, x + j - 1, y - 1, p.grass);
  }
  if (stream) for (const [j, y] of stream) { px(g, x + j, y, p.skyMid); px(g, x + j + 1, y, p.skyLight); }
}
