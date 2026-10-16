// Melbourne Pixel Train - City streets (the MCG, trams), the CBD towers, then the Yarra and its parkland
'use strict';

// --- 1. the city: Flinders Street, Jolimont, Richmond ------------------------
// Mid layer: brick warehouses, terraces and flats, lower the further from
// the city they stand (the MCG is a landmark: see LINE.landmarks)
function cityMid(ctx) { cityStreets(ctx, u => Math.max(0.3, Math.min(1, 1 - (u - 150) / 800))); }
function innerMid(ctx) { cityStreets(ctx, () => 0.42); }
function cityStreets(ctx, height) {
  const { rng, L } = ctx, G = 34;
  for (let x = ctx.from; x < ctx.to; ) {
    const w = randInt(rng, 10, 26), kind = rng(), seed = randInt(rng, 1, 1e6), bx = x;
    const r = randInt(rng, 3, 5), th = randInt(rng, 2, 4), hh = randInt(rng, 9, 30);
    const tall = height(uOf(L, x));
    x += w + randInt(rng, 1, 5);
    if (!ctx.free(bx - 2, bx + w + 2) || !ctx.ok(bx)) continue;
    if (kind < 0.16) ctx.stat(bx - r - 2, bx + r + 1, G + 1, (g, p, lit, ox) => roundTree(g, bx + ox, G + 1, r, th, p, seed));
    else ctx.stat(bx, bx + w, G + 2, (g, p, lit, ox) => cityBlock(g, p, lit, bx + ox, G + 2, w, Math.round(hh * tall) + 4, kind, seed));
  }
}

function cityBlock(g, p, lit, x, base, w, h, kind, seed) {
  const rng = mulberry32(seed), top = base - h;
  const [body, side, win] = kind < 0.5 ? [p.rust, p.brown, p.navy] : kind < 0.72 ? [p.cream, p.tan, p.indigo]
                          : kind < 0.88 ? [p.skyMid, p.skyDeep, p.skyLight] : [p.gray, p.grayDark, p.navy];
  rect(g, x, top, w, h, body);
  rect(g, x + w - 1, top, 1, h, side);
  rect(g, x, top, w, 1, side);                                                    // parapet
  for (let yy = top + 3; yy < base - 2; yy += 4)
    for (let xx = x + 2; xx < x + w - 2; xx += 3) {
      const on = rng() < 0.4, warm = rng() < 0.7;
      rect(g, xx, yy, 1, 2, lit && on ? (warm ? PALETTE.glow : PALETTE.amber) : win);
    }
  if (kind < 0.3) {                                                               // a factory: sawtooth roof, a chimney
    for (let xx = x; xx + 4 <= x + w; xx += 5) for (let k = 0; k < 3; k++) rect(g, xx + k, top - 3 + k, 1, 3 - k, k ? p.grayLight : p.skyLight);
    if (h > 12) { rect(g, x + w - 4, top - 9, 2, 9, p.rust); rect(g, x + w - 4, top - 9, 2, 1, p.brownDark); }
  } else if (kind > 0.72 && kind < 0.88) {
    for (let yy = top + 2; yy < base; yy += 4) rect(g, x, yy, w - 1, 1, p.cloudShade);   // balconies
  } else if (rng() < 0.4) rect(g, x + 2, top - 2, 3, 2, p.grayDark);              // water tank
}

// The Melbourne Cricket Ground: the bowl of its stands and six light towers
function paintMCG(g, p, lit, cx, base) {
  const HW = 56;
  for (let i = -HW; i <= HW; i++) {
    const top = base - 9 - Math.round(6 * Math.sqrt(1 - (i / HW) ** 2));
    rect(g, cx + i, top, 1, base - top, p.cloudShade);
    px(g, cx + i, top, p.white);                                                  // roof edge
    px(g, cx + i, top + 1, p.grayLight);
    if (i % 4 === 0) rect(g, cx + i, top + 3, 1, base - top - 3, p.grayLight);    // ribs
    px(g, cx + i, top + 5, lit ? PALETTE.amber : p.gray);                         // concourse
  }
  for (const dx of [-46, -28, -9, 9, 28, 46]) {
    const top = base - 15 - Math.round(6 * Math.sqrt(1 - (dx / HW) ** 2)), lean = Math.sign(dx);
    for (let k = 0; k < 14; k++) px(g, cx + dx - Math.round(lean * k / 7), top - k, p.grayLight);
    const hx = cx + dx - lean * 2;
    rect(g, hx - 2, top - 17, 5, 3, lit ? PALETTE.white : p.grayLight);           // the lights: on for a night game
    rect(g, hx - 2, top - 14, 5, 1, p.gray);
    if (lit) glowHalo(g, hx, top - 16, 2.5, 6, 4);
  }
  rect(g, cx - 4, base - 24, 19, 8, p.ink);                                      // scoreboard
  drawText(g, 'MCG', cx, base - 22, PALETTE.glow);
  rect(g, cx - 2, base - 16, 1, 3, p.grayDark); rect(g, cx + 12, base - 16, 1, 3, p.grayDark);
}

function cityMidGround(c, y, lx) {
  if (y < 34) return null;
  if (y < 36) return bayer(lx, y) < 8 ? 'grayLight' : 'gray';
  if (y < 42) return y === 38 && (lx >> 2) % 3 === 0 ? 'cream' : hash2(lx, y) < 0.1 ? 'grayDark' : 'gray';
  return y === 46 || y === 48 || y === 56 || y === 58 ? 'grayLight' : hash2(lx, y) < 0.3 ? 'gray' : 'grayDark';   // stabling sidings
}

// Near ground: a chain-mesh fence, then a street with tram tracks
function cityFg(ctx) {
  const { rng } = ctx;
  for (let a = ctx.from + 160; a + 420 < ctx.to; a += randInt(rng, 700, 1000)) {   // trams both ways along the street
    if (!ctx.ok(a + 200)) continue;
    ctx.live(tramEnt(a, a + 420, 24, rng));
    ctx.live(tramEnt(a + 150, a + 620, 31, rng));
  }
  for (let x = ctx.from + randInt(rng, 0, 60); x < ctx.to; x += randInt(rng, 150, 260)) {
    const len = randInt(rng, 180, 300);
    if (ctx.ok(x + (len >> 1))) ctx.live(carEnt(x, x + len, rng() < 0.5 ? 26 : 33, rng));
  }
  for (let x = ctx.from + 20; x < ctx.to; x += 110) if (ctx.ok(x)) ctx.live(streetLampEnt(x, 16));
}

function cityFgGround(c, y, lx) {
  if (y < 8) return null;
  if (y < 14) {                                                                   // the rail corridor fence
    if (lx % 16 === 0) return 'gray';
    if (y === 8) return 'grayLight';
    return y < 12 ? (bayer(lx, y) < 5 ? 'grayLight' : null) : hash2(lx, y) < 0.3 ? 'gray' : 'grayDark';
  }
  if (y === 14) return 'cloudShade';                                              // kerb
  if (y === 15) return 'grayLight';
  if (y === 22 || y === 24 || y === 29 || y === 31) return bayer(lx, y) < 12 ? 'grayLight' : 'gray';   // tram rails
  if (y === 27) return (lx >> 3) & 1 ? 'cream' : 'gray';
  return hash2(lx >> 1, y) < 0.12 ? 'grayDark' : 'gray';
}

// --- 2. the Yarra at Burnley: parkland, the river and the bridge to Hawthorn ----
// The river crosses the line at right angles, so each layer shows a narrower
// slice of it than the one in front: it runs away from the viewer.
const yarraWet = (u, pad) => u > BRIDGE.u0 - pad && u < BRIDGE.u1 + pad;
const yarraWater = (lx, y, mud) => hash2(lx >> 2, y) < 0.07 ? 'skyLight' : hash2(lx >> 3, y + 50) < mud / 16 ? 'tan' : 'haze';   // famously brown

function yarraFar(ctx) {
  const { rng, L } = ctx, dashes = [];
  treeLine({ ...ctx, ok: x => ctx.ok(x) && !yarraWet(uOf(L, x), 75) });
  const a = lxOf(L, BRIDGE.u0 - 60), b = lxOf(L, BRIDGE.u1 + 60);
  for (let x = a - 2; x < b + 3; x += randInt(rng, 2, 5)) {                       // trees along the far bank
    const r = randInt(rng, 1, 3), tx = x;
    ctx.stat(tx - r, tx + r + 1, 0, (g, p, lit, ox) => disc(g, tx + ox, 46 - r + 1, r, p.haze));
  }
  for (let x = a; x < b; x += randInt(rng, 3, 7)) dashes.push([x, randInt(rng, 49, 58), randInt(rng, 2, 4), rng() * 6, 1 + rng() * 2]);
  chunkedShimmer(ctx, dashes, 0);
  ctx.live(crewEnt((a + b) >> 1, 52, (b - a) / 2 - 10, rng, 2));
}

function yarraFarGround(wet, y, lx) {
  if (!wet) return y >= 52 ? 'haze' : null;
  if (y < 46) return null;
  return y < 48 ? 'haze' : hash2(lx >> 2, y) < 0.12 ? 'skyLight' : bayer(lx, y) < 5 ? 'skyMid' : 'haze';
}

function yarraMid(ctx) {
  const { rng, L } = ctx, G = 34, a = lxOf(L, BRIDGE.u0 - 10), b = lxOf(L, BRIDGE.u1 + 10), dashes = [];
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 12, 30)) {                 // river red gums in the parkland
    const tx = x, h = randInt(rng, 14, 26), seed = randInt(rng, 1, 1e6), kind = rng(), rr = randInt(rng, 3, 6), th = randInt(rng, 2, 4);
    if ((tx > a - 32 && tx < b + 8) || !ctx.ok(tx)) continue;
    if (kind < 0.7) ctx.stat(tx - 14, tx + 14, G + 1, (g, p, lit, ox) => gumTree(g, tx + ox, G + 1, h, p, seed));
    else ctx.stat(tx - rr - 2, tx + rr + 1, G + 1, (g, p, lit, ox) => roundTree(g, tx + ox, G + 1, rr, th, p, seed));
  }
  const shed = a - 28;                                                            // a rowing club on the bank
  ctx.stat(shed - 2, shed + 24, G + 2, (g, p, lit, ox) => boatShed(g, p, lit, shed + ox, G + 2));
  for (let x = a + 2; x < b - 2; x += randInt(rng, 3, 7)) dashes.push([x, randInt(rng, 34, 70), randInt(rng, 2, 6), rng() * 6, 1 + rng() * 2]);
  chunkedShimmer(ctx, dashes, 0);
  ctx.live(crewEnt((a + b) >> 1, 33, (b - a) / 2 - 16, rng, 4));
  for (let x = a - 3; x <= b + 3; x += randInt(rng, 3, 6))                        // reeds along both banks
    if (x < a + 5 || x > b - 5) ctx.live(swayer(L, x, 35, 'reed', randInt(rng, 7, 10), randInt(rng, 0, 2)));
}

function boatShed(g, p, lit, x, base) {
  rect(g, x, base - 7, 22, 7, p.cream);
  for (const dx of [2, 9, 16]) { rect(g, x + dx, base - 5, 5, 5, p.navy); rect(g, x + dx, base - 5, 5, 1, p.blue); }   // boat bays
  for (let r = 0; r < 4; r++) rect(g, x - 1 + (3 - r) * 2, base - 11 + r, 24 - (3 - r) * 4, 1, r ? p.red : p.rust);
  rect(g, x + 11, base - 16, 1, 5, p.grayLight);                                  // club flag
  rect(g, x + 12, base - 16, 3, 2, p.blue);
  if (lit) px(g, x + 8, base - 6, PALETTE.glow);
}

function yarraMidGround(wet, y, lx) {
  if (wet) return y < 31 ? null : y < 33 ? (bayer(lx, y) < 9 ? 'greenDark' : 'haze') : yarraWater(lx, y, 5);
  if (y < 34) return null;
  if (y === 34) return bayer(lx, y) < 10 ? 'grassLight' : 'grass';
  if (y > 39 && y < 42) return hash2(lx, y) < 0.2 ? 'cloudShade' : 'cream';       // the river trail
  return hash2(lx >> 1, y >> 1) < 0.25 ? 'green' : 'grass';
}

// Near ground: mown parkland and the Main Yarra Trail, then the river
// itself, widening towards the viewer
function yarraFg(ctx) {
  const { rng, L } = ctx, a = lxOf(L, BRIDGE.u0), b = lxOf(L, BRIDGE.u1), dashes = [];
  const D = { paths: [[ctx.from, a - 46], [b + 46, ctx.to]] };
  for (const [pa, pb] of D.paths)
    for (let x = pa + randInt(rng, 10, 70); x < pb - 100; x += randInt(rng, 110, 220)) {
      const len = Math.min(pb - x - 4, randInt(rng, 170, 300));
      if (len > 90 && ctx.ok(x + (len >> 1))) ctx.live(rng() < 0.55 ? cyclistEnt(x, x + len, 22, rng) : joggerEnt(x, x + len, 22, rng));
    }
  for (let x = a + 4; x < b - 4; x += randInt(rng, 2, 6)) dashes.push([x, randInt(rng, 18, 33), randInt(rng, 2, 7), rng() * 6, 0.8 + rng() * 2.2]);
  chunkedShimmer(ctx, dashes, 0, ['skyLight', 'white']);
  for (let i = 0; i < 5; i++)                                                     // ducks, and a black swan
    ctx.live(waterfowlEnt({ cx: Math.round(a + 44 + i * (b - a - 88) / 4), rx: 28, cy: 21 + (i % 3) * 4, ry: 3 }, rng, i === 2 ? 'swan' : 'duck'));
  for (let x = a - 20; x < b + 20; x += randInt(rng, 3, 6))
    if (x < a - 2 || x > b + 2) ctx.live(swayer(L, x, randInt(rng, 17, 31), 'reed', randInt(rng, 7, 11), randInt(rng, 0, 2)));
  const dry = { ...ctx, ok: x => ctx.ok(x) && !yarraWet(uOf(L, x), 24) };
  addTufts(dry, 11, 13, 16);
  for (let x = ctx.from + randInt(rng, 20, 80); x < ctx.to; x += randInt(rng, 70, 160)) {   // young gums, a park bench
    const tx = x, y = randInt(rng, 26, 33), h = randInt(rng, 12, 20), seed = randInt(rng, 1, 1e6), bench = rng() < 0.35;
    if (!dry.ok(tx)) continue;
    if (bench) ctx.stat(tx - 5, tx + 5, 17, (g, p, lit, ox) => { rect(g, tx - 4 + ox, 14, 9, 1, p.brown); rect(g, tx - 4 + ox, 16, 9, 1, p.tan); rect(g, tx - 3 + ox, 17, 1, 2, p.grayDark); rect(g, tx + 3 + ox, 17, 1, 2, p.grayDark); });
    else ctx.stat(tx - 14, tx + 14, y, (g, p, lit, ox) => gumTree(g, tx + ox, y, h, p, seed));
  }
  return D;
}

function yarraFgColumn(lx, D, u) {
  let path = -1;
  for (const [a, b] of D.paths) if (lx >= a && lx < b) { path = Math.min(lx - a, b - 1 - lx); break; }
  return { u, path };
}

const yarraPad = y => 4 + Math.max(0, y - 15) * 0.5;    // the banks draw apart towards the viewer
function yarraFgGround(c, y, lx) {
  if (y < 12) return null;
  const pad = yarraPad(y);
  if (yarraWet(c.u, y < 15 ? 0 : pad)) {
    if (y < 17) return bayer(lx, y) < 9 ? 'greenDark' : 'haze';                   // in the shadow of the deck
    return hash2(lx >> 3, y) < 0.06 ? 'skyLight' : hash2(lx >> 3, y + 50) < 0.3 ? 'tan' : y > 25 && bayer(lx + 2, y) < y - 25 ? 'greenDark' : 'haze';
  }
  if (y >= 15 && yarraWet(c.u, pad + 3)) return bayer(lx, y) < 8 ? 'tan' : 'brown';   // muddy bank
  if (y === 12) return bayer(lx, y) < 10 ? 'grass' : 'green';
  if (y < 17) return hash2(lx >> 1, y) < 0.18 ? 'greenDark' : hash2(lx, y) < 0.1 ? 'grass' : 'green';   // embankment
  if (c.path >= 0 && y >= 19 && y <= 22) {
    if (y === 19 || y === 22) return bayer(lx, y) < (c.path < 6 ? 4 : 10) ? 'cream' : 'grass';
    return hash2(lx, y) < 0.08 ? 'cloudShade' : 'cream';
  }
  return hash2(lx >> 2, y >> 1) < 0.2 ? 'grassLight' : hash2(lx, y) < 0.06 ? 'green' : 'grass';
}
