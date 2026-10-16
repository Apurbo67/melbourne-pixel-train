// Melbourne Pixel Train - Parallax terrain engine: layout, chunks, wind, swaying plants
'use strict';

// =====================================================================
// 5b. TERRAIN SECTIONS
// =====================================================================
// The far, mid and foreground layers are not repeating tiles: they are laid
// out once for the whole line from fixed seeds (so every trip looks the
// same), painted lazily in chunks per lighting, and overlaid every frame
// with live entities (swaying plants, boats, animals, fog, shimmer).
//
// A layer with parallax factor f shows layer column lx at screen
// x = lx - floor(dist * f), and that column stands for the world position
// u = (lx - ANCHOR_X) / f. So every layer agrees on what lies at the centre
// of the screen, and deeper layers see further ahead and behind.
//
// Ground pixels of two neighbouring sections are mixed with an ordered
// dither across the blend zone; objects are spawned with a probability
// equal to their section's weight, so they thin out instead of being cut.
const ANCHOR_X = W / 2;
const CHUNK_W = 64;                                 // multiple of 4: dither lines up across chunks; small = short builds

const TLAYERS = [
  { key: 'far', f: PARALLAX.far, y: LAYER_Y.far, h: 60, seed: 21, hiRows: null },
  { key: 'mid', f: PARALLAX.mid, y: LAYER_Y.mid, h: 80, seed: 42, hiRows: [16, 46] },
  { key: 'fg',  f: PARALLAX.fg,  y: LAYER_Y.fg,  h: 34, seed: 77, hiRows: [12, 34] },
];
const TL = Object.fromEntries(TLAYERS.map(L => [L.key, L]));
const uOf = (L, lx) => (lx - ANCHOR_X) / L.f;
const lxOf = (L, u) => Math.round(u * L.f + ANCHOR_X);

// Deterministic per-pixel noise in [0, 1)
function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function setupTerrain() {
  const at = a => STATIONS[a[0]].dist + a[1];
  TERRAIN.forEach((s, i) => { s.u = i ? at(s.at) : -Infinity; });
  BRIDGE.u0 = BRIDGE.at ? at(BRIDGE.at) : -1e7;
  BRIDGE.u1 = BRIDGE.u0 + BRIDGE.spans * BRIDGE.span;
  for (const c of CROSSINGS) c.u = at(c.at);
  for (const t of TUNNELS) { t.u0 = at(t.a); t.u1 = at(t.b); }
}

// Is world position u underground?
function inTunnel(u) {
  for (let i = 0; i < TUNNELS.length; i++) if (u >= TUNNELS[i].u0 && u < TUNNELS[i].u1) return true;
  return false;
}

// Landmarks and footy ovals are placed by the line, not by a landscape:
// every layer keeps a list of the stretches they stand on, and spawners
// leave those clear (ctx.free)
function placeMarks(L, ctx) {
  const list = L.key === 'mid' ? LINE.landmarks : L.key === 'far' ? LINE.farmarks : [];
  for (const [code, du, hw, name] of list) {
    const st = stn(code), paint = PAINTERS[name];
    if (!st || !paint) continue;
    const cx = lxOf(L, st.dist + du), base = L.key === 'mid' ? 36 : 52;
    ctx.stat(cx - hw, cx + hw, -1, (g, p, lit, ox) => paint(g, p, lit, cx + ox, base));
    L.keep.push([cx - hw - 4, cx + hw + 4]);
  }
  if (L.key === 'mid') for (const [i, px0] of OVALS) {
    const cx = lxOf(L, STATIONS[i].dist + px0);
    L.keep.push([cx - 48, cx + 48]);
    footyOval(ctx, cx, 34, ctx.rng);
  }
}

// Sections at world position u: a, b are TERRAIN indices, t the weight of b.
// Writes into out (a shared scratch object unless one is passed), so read
// the result before the next call.
const TERRAIN_TMP = { a: 0, b: 0, t: 0 }, TERRAIN_SW = { a: 0, b: 0, t: 0 };
function terrainAt(u, out = TERRAIN_TMP) {
  const half = CONFIG.TERRAIN_BLEND / 2, n = TERRAIN.length;
  out.a = out.b = n - 1; out.t = 0;
  for (let i = 1; i < n; i++) {
    const b = TERRAIN[i].u;
    if (u < b - half) { out.a = out.b = i - 1; break; }
    if (u < b + half) { out.a = i - 1; out.b = i; out.t = smoothstep((u - b + half) / (2 * half)); break; }
  }
  return out;
}

function sectionWeight(id, u) {
  const w = terrainAt(u, TERRAIN_SW);
  return (TERRAIN[w.a].id === id ? 1 - w.t : 0) + (TERRAIN[w.b].id === id ? w.t : 0);
}

// Breeze: waves of wind sweeping back along the line, roughly -1..1
const windAt = (u, t) => Math.sin(u * 0.016 + t * 1.7) * 0.65 + Math.sin(u * 0.043 + t * 2.9 + 1.7) * 0.35;
// How far a plant at u leans right now: -1..2 (the breeze mostly blows one way)
const leanAt = (u, t) => Math.max(-1, Math.min(2, Math.round(windAt(u, t) * 1.7 + 0.4)));

// --- layout: run every section's spawner over its stretch of each layer --
function buildTerrain() {
  setupTerrain();
  const half = CONFIG.TERRAIN_BLEND / 2, last = TERRAIN.length - 1;
  for (const L of TLAYERS) {
    L.lx0 = Math.floor(STATIONS[0].dist * L.f) - 48;
    L.lx1 = Math.ceil(STATIONS[LAST_STATION].dist * L.f) + W + 48;
    L.statics = []; L.live = []; L.data = {}; L.keep = [];
    const stat = (x0, x1, z, draw) => L.statics.push({ x0, x1, z, draw });   // baked into the chunks
    const live = e => L.live.push(e);                                        // drawn every frame
    const free = (a, b) => !L.keep.some(([k0, k1]) => b > k0 && a < k1);
    placeMarks(L, { L, rng: mulberry32(L.seed * 7 + 3), stat, live, free });
    TERRAIN.forEach((s, i) => {
      const spec = SECTIONS[s.id][L.key];
      const from = i ? Math.max(L.lx0, lxOf(L, s.u - half)) : L.lx0;
      const to = i < last ? Math.min(L.lx1, lxOf(L, TERRAIN[i + 1].u + half)) : L.lx1;
      if (!spec || from >= to) return;
      const rng = mulberry32(L.seed * 1000 + i * 97);
      const weight = lx => sectionWeight(s.id, uOf(L, lx));
      L.data[i] = (spec.spawn && spec.spawn({                              // by index: a landscape can come twice
        L, rng, from, to, weight, stat, live, free,
        ok: lx => rng() < weight(lx),
      })) || {};
    });
    L.statics.sort((a, b) => a.z - b.z);
    L.live.sort((a, b) => a.x0 - b.x0);
    L.span = L.live.reduce((m, e) => Math.max(m, e.x1 - e.x0), 0);
  }
}

// --- chunks: ground pixels via ImageData, then the static objects --------
function groundCol(L, si, lx) {
  const id = TERRAIN[si].id, spec = SECTIONS[id][L.key];
  if (!spec || !spec.ground) return null;
  return { spec, c: spec.column ? spec.column(lx, L.data[si], uOf(L, lx)) : null };
}

function terrainChunk(v, L, k) {
  const cache = v.chunks[L.key];
  let ch = cache.get(k);
  if (ch) return ch;
  const x0 = k * CHUNK_W, w = CHUNK_W, h = L.h;
  const [c, g] = makeCanvas(w, h);
  const img = g.createImageData(w, h), out = new Uint32Array(img.data.buffer);
  let hi = null;
  for (let i = 0; i < w; i++) {
    const lx = x0 + i, tw = terrainAt(uOf(L, lx));
    const A = groundCol(L, tw.a, lx), B = tw.t > 0 ? groundCol(L, tw.b, lx) : A;
    for (let y = 0; y < h; y++) {
      const s = bayer(lx, y) < tw.t * 16 ? B : A;
      if (!s) continue;
      const key = s.spec.ground(s.c, y, lx);
      if (key) out[y * w + i] = v.rgba[key];
      const hk = key && s.spec.hl && s.spec.hl(s.c, y, lx);
      if (hk) (hi || (hi = new Uint32Array(w * h)))[y * w + i] = v.rgba[hk];
    }
  }
  g.putImageData(img, 0, 0);
  const statics = L.statics.filter(s => s.x1 >= x0 && s.x0 < x0 + w);
  for (const s of statics) s.draw(g, v.p, v.lit, -x0, 0);
  ch = { c, hi: null };
  if (hi) {
    let hg;
    [ch.hi, hg] = makeCanvas(w, h);
    const himg = hg.createImageData(w, h);
    new Uint32Array(himg.data.buffer).set(hi);
    hg.putImageData(himg, 0, 0);
    hg.globalCompositeOperation = 'destination-out';     // no wind highlights over props
    for (const s of statics) s.draw(hg, v.p, v.lit, -x0, 0);
  }
  cache.set(k, ch);
  return ch;
}

// --- per frame: chunks, wind-wave highlights, then live entities ---------
const liveScratch = [];
function drawTerrain(g, v, L, afterGround) {
  const cam = Math.floor(sim.dist * L.f), t = sim.clock;
  const k0 = Math.floor(cam / CHUNK_W), k1 = Math.floor((cam + W - 1) / CHUNK_W);
  for (let k = k0; k <= k1; k++) g.drawImage(terrainChunk(v, L, k).c, k * CHUNK_W - cam, L.y);
  if (afterGround) afterGround(g, v);
  if (L.hiRows) drawWindCrests(g, v, L, cam, k0, k1);
  const list = liveScratch, live = L.live;
  list.length = 0;
  let lo = 0, hi = live.length;
  const start = cam - L.span - 4;
  while (lo < hi) { const m = (lo + hi) >> 1; if (live[m].x0 < start) lo = m + 1; else hi = m; }
  for (let i = lo; i < live.length && live[i].x0 <= cam + W + 4; i++)
    if (live[i].x1 >= cam - 4 && !(live[i].lod && quality.low)) list.push(live[i]);
  list.sort(byZ);
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    e.draw(g, v, -cam, L.y, t);
    if (e.light) addLight(e.light[0] - cam, e.light[1] + L.y, e.light[2] === undefined ? LIGHT_WINDOW : e.light[2]);
  }
}
const byZ = (a, b) => a.z - b.z;

// Pixels flagged by a section's hl() light up under the crests of the wind
// waves: strips of rows, each a little behind the one above, so the bands
// sweep diagonally across the long grass.
const crestX = [], crestHi = [];
function drawWindCrests(g, v, L, cam, k0, k1) {
  crestX.length = crestHi.length = 0;
  for (let k = k0; k <= k1; k++) { const ch = terrainChunk(v, L, k); if (ch.hi) { crestX.push(k * CHUNK_W - cam); crestHi.push(ch.hi); } }
  if (!crestX.length) return;
  const [r0, r1] = L.hiRows, t = sim.clock;
  for (let y = r0; y < r1; y += 3) {
    const rows = Math.min(3, r1 - y);
    let run = -1;
    for (let x = 0; x <= W; x += 2) {
      const on = x < W && windAt(uOf(L, x + cam) - (y - r0) * 7, t) > 0.38;
      if (on && run < 0) run = x;
      else if (!on && run >= 0) {
        for (let j = 0; j < crestX.length; j++) {
          const cx = crestX[j], a = Math.max(run, cx), b = Math.min(x, cx + CHUNK_W);
          if (b > a) g.drawImage(crestHi[j], a - cx, y, b - a, rows, a, L.y + y, b - a, rows);
        }
        run = -1;
      }
    }
  }
}

// --- sprite helpers for live entities ------------------------------------
function cached(v, key, w, h, paint) {
  let c = v.sprites.get(key);
  if (!c) {
    let g;
    [c, g] = makeCanvas(w, h);
    paint(g, v.p, v.lit);
    v.sprites.set(key, c);
  }
  return c;
}

// A still object that has to sort by depth with the live ones (houses in
// front of swaying palms); painted once per lighting
function spriteEnt(lx, y, w, h, ax, ay, key, paint) {
  return { x0: lx - ax, x1: lx - ax + w, z: y, warm: v => cached(v, key, w, h, paint), draw(g, v, ox, oy) {
    g.drawImage(cached(v, key, w, h, paint), lx - ax + ox, y - ay + oy);
  } };
}

// A plant that leans with the passing wind waves (one sprite per lean)
function swayer(L, lx, y, kind, a = 0, b = 0) {
  const S = SWAY[kind], [w, h, ax, ay] = S.size(a, b), u = uOf(L, lx), key = kind + a + '|' + b;
  const frames = v => {                                // all four leans, painted together
    let f = v.sprites.get(key);
    if (!f) {
      f = [];
      for (let lean = -1; lean <= 2; lean++) {
        const [c, g] = makeCanvas(w, h);
        S.paint(g, v.p, lean, a, b, ax, ay);
        f.push(c);
      }
      v.sprites.set(key, f);
    }
    return f;
  };
  return { x0: lx - ax, x1: lx - ax + w, z: y, warm: frames, draw(g, v, ox, oy, t) {
    g.drawImage(frames(v)[leanAt(u - y * 4, t) + 1], lx - ax + ox, y - ay + oy);
  } };
}


// Each kind: size(a, b) -> [w, h, anchor x, anchor y]; paint(g, p, lean, a, b, ax, ay)
const BLADES = [[[-3, 4], [2, 5]], [[-2, 5], [3, 3], [1, 4]], [[3, 4], [-2, 3]]];
// A tall grass with a seed head: a = height, b = variant
const plume = (leafA, leafB, stalk, headA, headB) => ({
  size: h => [14, h + 2, 5, h + 1],
  paint(g, p, lean, h, v, ax, ay) {
    const st = k => ax + Math.round(lean * 1.5 * (k / h) ** 2);
    for (const [dx, bh] of BLADES[v]) for (let k = 0; k < bh; k++) px(g, ax + Math.round(dx * (k + 1) / bh), ay - k, p[k < bh - 2 ? leafA : leafB]);
    for (let k = 0; k < h - 4; k++) px(g, st(k), ay - k, p[stalk]);
    const hx = st(h - 4), hy = ay - h + 4;              // the head, drooping downwind
    for (let j = 0; j < 5; j++) {
      const x = hx + Math.round((lean + 0.5) * j / 4), y = hy - j;
      px(g, x, y, p[j === 4 ? headB : headA]);
      if (j > 0 && j < 4 && (j + v) % 2) px(g, x - 1, y, p[headB]);
    }
  },
});
const FERN_ARCH = [0, 2, 3, 3, 2, 1, -1], FERN_UNDER = [0, 1, 1, 0, -2];
const SWAY = {
  reed:  plume('green', 'grass', 'grass', 'brown', 'brownDark'),      // cumbungi along the Yarra
  grass: plume('paddy', 'grassLight', 'tan', 'cream', 'paddy'),       // paddock grass gone to seed
  treefern: {                                         // soft tree fern: a = trunk height
    size: h => [15, h + 6, 7, h + 5],
    paint(g, p, lean, h, b, ax, ay) {
      const top = ay - h;
      for (let i = 0; i < h; i++) px(g, ax, ay - i, i % 3 ? p.brown : p.brownDark);
      for (const d of [-1, 1]) {                      // fronds arch out and droop; the far ends lift in the wind
        for (let k = 1; k <= 6; k++) px(g, ax + d * k + (k > 3 ? Math.round(lean * 0.7) : 0), top - FERN_ARCH[k], k > 4 ? p.grass : p.green);
        for (let k = 1; k <= 4; k++) px(g, ax + d * k + (k > 2 ? Math.round(lean * 0.5) : 0), top - FERN_UNDER[k], p.greenDark);
      }
      px(g, ax, top - 1, p.green);
      px(g, ax, top - 2, p.grass);
    },
  },
  fern: {
    size: () => [13, 7, 6, 6],
    paint(g, p, lean, a, b, ax, ay) {
      const arc = [1, 3, 4, 4, 3];
      for (const d of [-1, 1]) for (let k = 0; k < 5; k++)
        px(g, ax + d * (k + 1) + (k > 2 ? Math.round(lean * 0.7) : 0), ay - arc[k] + (k > 3 ? 1 : 0), k > 2 ? p.grass : p.green);
      rect(g, ax, ay - 2, 1, 3, p.greenDark);
    },
  },
};
