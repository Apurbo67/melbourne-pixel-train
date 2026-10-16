// Melbourne Pixel Train - Landscapes of the other lines: the CBD, industry, basalt plains, the bay, the Skyrail
'use strict';

// --- the CBD: towers right up against the line -------------------------------
function cbdFar(ctx) {
  const { rng } = ctx;
  for (let x = ctx.from; x < ctx.to; ) {
    const w = randInt(rng, 6, 12), h = randInt(rng, 22, 52), tx = x, seed = randInt(rng, 1, 1e6), glass = rng() < 0.55;
    x += w + randInt(rng, 0, 3);
    if (!ctx.ok(tx) || !ctx.free(tx, tx + w)) continue;
    ctx.stat(tx, tx + w, 1, (g, p, lit, ox) => farTower(g, p, lit, tx + ox, 52, w, h, glass, seed));
    if (rng() < 0.15) { const mx = tx + (w >> 1); ctx.stat(mx, mx + 1, 2, (g, p, lit, ox) => { rect(g, mx + ox, 52 - h - 5, 1, 5, p.grayDark); px(g, mx + ox, 52 - h - 6, p.red); }); }
  }
}
function cbdMid(ctx) { cityStreets(ctx, () => 1.35); }

// --- industry: the docks, tank farms and sheds of the west ---------------------
// Far layer: container cranes at the port, tank farms, a chimney or two
function industryFar(ctx) {
  const { rng } = ctx;
  treeLine(ctx, 52, 3);
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 26, 70)) {
    const tx = x, kind = rng(), h = randInt(rng, 14, 30), n = randInt(rng, 2, 4);
    if (!ctx.ok(tx) || !ctx.free(tx - 10, tx + 30)) continue;
    if (kind < 0.3) ctx.stat(tx - 4, tx + 26, 3, (g, p, lit, ox) => {          // a container crane, boom raised
      const x0 = tx + ox;
      rect(g, x0, 52 - h, 1, h, p.cloudShade); rect(g, x0 + 9, 52 - h, 1, h, p.cloudShade);
      rect(g, x0 - 3, 52 - h, 20, 2, p.cloudShade);
      pxLine(g, x0 + 16, 52 - h, x0 + 22, 52 - h - 12, p.cloudShade);
      if (lit) px(g, x0 + 22, 52 - h - 12, LAMP_RED);
    });
    else if (kind < 0.65) ctx.stat(tx, tx + n * 8, 2, (g, p, lit, ox) => {     // a tank farm
      for (let i = 0; i < n; i++) { rect(g, tx + ox + i * 8, 46, 7, 6, p.cloudShade); rect(g, tx + ox + i * 8, 46, 7, 1, p.white); }
    });
    else if (kind < 0.8) ctx.stat(tx, tx + 3, 2, (g, p, lit, ox) => {          // a chimney
      rect(g, tx + ox, 52 - h - 6, 2, h + 6, p.cloudShade); rect(g, tx + ox, 52 - h - 6, 2, 1, p.grayLight);
    });
  }
}

// Mid layer: warehouses with sawtooth roofs, white oil tanks, stacks of
// containers, and a few worker's cottages between them
const CONTAINER_COLS = ['red', 'blue', 'grass', 'orange', 'skyMid', 'white', 'rust', 'glow'];
function industryMid(ctx) {
  const { rng } = ctx, G = 34;
  for (let x = ctx.from; x < ctx.to; ) {
    const kind = rng(), w = kind < 0.4 ? randInt(rng, 30, 60) : kind < 0.6 ? randInt(rng, 14, 22) : kind < 0.8 ? randInt(rng, 16, 30) : randInt(rng, 12, 16);
    const bx = x, seed = randInt(rng, 1, 1e6);
    x += w + randInt(rng, 3, 14);
    if (!ctx.ok(bx) || !ctx.free(bx - 2, bx + w + 2)) continue;
    if (kind < 0.4) ctx.stat(bx, bx + w, G, (g, p, lit, ox) => warehouse(g, p, lit, bx + ox, G + 1, w, seed));
    else if (kind < 0.6) ctx.stat(bx, bx + w, G, (g, p, lit, ox) => oilTank(g, p, bx + ox, G + 1, w));
    else if (kind < 0.8) ctx.stat(bx, bx + w, G, (g, p, lit, ox) => containers(g, p, bx + ox, G + 1, w, seed));
    else {
      const o = houseDesign(rng, w), e = spriteEnt(bx, G + 2, w + 3, 16, 1, 16, 'ih' + bx, (g, p, lit) => ausHouse(g, 1, 16, w, p, o, lit && o.lightOn));
      if (o.lightOn) e.light = [bx + o.win + 1, G - 3];
      ctx.live(e);
    }
  }
}

function warehouse(g, p, lit, x, base, w, seed) {
  const rng = mulberry32(seed), h = randInt(rng, 9, 15), [wall, side] = pick(rng, [['grayLight', 'gray'], ['cloudShade', 'grayLight'], ['rust', 'brown'], ['haze', 'greenDark'], ['cream', 'tan']]);
  rect(g, x, base - h, w, h, p[wall]);
  rect(g, x + w - 1, base - h, 1, h, p[side]);
  if (rng() < 0.6) for (let xx = x; xx + 5 <= x + w; xx += 6)                  // sawtooth roof with its south-light glazing
    for (let k = 0; k < 4; k++) { rect(g, xx + k, base - h - 4 + k, 1, 4 - k, p.grayLight); px(g, xx + 4, base - h - 1 - k * 0, lit ? PALETTE.amber : p.skyLight); }
  else rect(g, x - 1, base - h - 1, w + 2, 1, p.gray);
  for (let xx = x + 3; xx < x + w - 6; xx += 10) rect(g, xx, base - 6, 6, 6, p.grayDark);   // roller doors
  for (let xx = x + 4; xx < x + w - 6; xx += 10) for (let y = base - 5; y < base; y += 2) rect(g, xx, y, 4, 1, p.gray);
  if (lit) px(g, x + 2, base - h + 2, PALETTE.glow);
}

function oilTank(g, p, x, base, w) {
  const h = Math.round(w * 0.6);
  rect(g, x, base - h, w, h, p.white);
  rect(g, x + w - 3, base - h, 3, h, p.cloudShade);
  rect(g, x, base - h - 1, w, 1, p.cloudShade);
  for (let k = 0; k < h; k += 2) px(g, x + 2 + (k >> 1), base - k - 1, p.grayDark);   // the stair winding up
  rect(g, x, base - 2, w, 2, p.grayLight);
}

function containers(g, p, x, base, w, seed) {
  const rng = mulberry32(seed);
  for (let row = 0; row < 3; row++)
    for (let xx = x + row * 2; xx + 8 <= x + w; xx += 9) {
      if (row && rng() < 0.4) continue;
      const col = p[pick(rng, CONTAINER_COLS)], y = base - 4 * (row + 1);
      rect(g, xx, y, 8, 4, col);
      for (let k = xx + 1; k < xx + 8; k += 2) px(g, k, y + 1, p.ink);
    }
}

function industryMidGround(c, y, lx) {
  if (y < 34) return null;
  if (y < 36) return bayer(lx, y) < 8 ? 'grayLight' : 'gray';
  return hash2(lx >> 1, y) < 0.08 ? (hash2(lx, y + 3) < 0.5 ? 'grass' : 'grayDark') : y === 40 || y === 47 ? 'grayLight' : 'gray';
}

// Near ground: a mesh fence, a gravel yard with weeds and the odd stack of pallets
function industryFg(ctx) {
  const { rng } = ctx;
  addTufts(ctx, 23, 15, 30, 5);
  for (let x = ctx.from + randInt(rng, 0, 60); x < ctx.to; x += randInt(rng, 90, 180)) {
    const tx = x, y = randInt(rng, 20, 30), kind = rng();
    if (!ctx.ok(tx)) continue;
    if (kind < 0.4) ctx.stat(tx - 8, tx + 8, y, (g, p, lit, ox) => {          // pallets
      for (let k = 0; k < 3; k++) { rect(g, tx - 6 + ox, y - 2 - k * 2, 12, 1, p.tan); rect(g, tx - 6 + ox, y - 1 - k * 2, 12, 1, p.brown); }
    });
    else if (kind < 0.6) ctx.stat(tx - 12, tx + 12, y, (g, p, lit, ox) => containers(g, p, tx - 12 + ox, y, 24, tx));
    else if (kind < 0.75) ctx.live(streetLampEnt(tx, 16));
  }
}
function industryFgGround(c, y, lx) {
  if (y < 8) return null;
  if (y < 14) {
    if (lx % 16 === 0) return 'gray';
    if (y === 8) return 'grayLight';
    return y < 12 ? (bayer(lx, y) < 5 ? 'grayLight' : null) : 'grayDark';
  }
  const h = hash2(lx >> 1, y);
  return h < 0.1 ? 'grayDark' : h < 0.16 ? 'brown' : h < 0.19 ? 'grass' : y & 1 ? 'gray' : hash2(lx, y) < 0.5 ? 'gray' : 'grayLight';
}

// --- the basalt plains: north and west of the city -------------------------
// Far layer: a flat horizon, a line of trees along a creek, roofs of the
// newest estates, power lines
function plainsFar(ctx) {
  const { rng } = ctx;
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 6, 22)) {
    const tx = x, w = randInt(rng, 3, 6), on = rng() < 0.5, kind = rng();
    if (!ctx.ok(tx) || !ctx.free(tx, tx + w)) continue;
    if (kind < 0.55) ctx.stat(tx, tx + w, 1, (g, p, lit, ox) => {
      rect(g, tx + ox, 50, w, 2, p.cloudShade); rect(g, tx + ox, 49, w, 1, p.gray);
      if (lit && on) px(g, tx + 1 + ox, 51, PALETTE.glow);
    });
    else if (kind < 0.8) { const r = randInt(rng, 1, 3); ctx.stat(tx - r, tx + r, 0, (g, p, lit, ox) => disc(g, tx + ox, 52 - r, r, p.haze)); }
  }
  for (let x = ctx.from + randInt(rng, 0, 80); x < ctx.to; x += randInt(rng, 120, 200)) {   // transmission towers
    const tx = x;
    if (ctx.ok(tx)) ctx.stat(tx - 4, tx + 4, 1, (g, p, lit, ox) => {
      for (let k = 0; k < 16; k++) { const hw = Math.round((16 - k) / 8); px(g, tx - hw + ox, 52 - k, p.grayLight); px(g, tx + hw + ox, 52 - k, p.grayLight); }
      rect(g, tx - 4 + ox, 39, 9, 1, p.grayLight);
    });
  }
}
const plainsFarGround = (c, y, lx) => y < 52 ? null : y < 54 ? (bayer(lx, y) < 8 ? 'haze' : 'paddy') : 'haze';

// Mid layer: dry grassland, bluestone walls, red gums, rocks, and new estates
// creeping out across it - two-storey houses, the same three designs over and over
function plainsMid(ctx) {
  const { rng } = ctx, G = 34;
  for (let x = ctx.from; x < ctx.to; ) {
    const kind = rng(), bx = x, seed = randInt(rng, 1, 1e6);
    if (kind < 0.3) {                                                          // a row of new houses
      const n = randInt(rng, 3, 7), w = 12, cols = pick(rng, [['cloudShade', 'grayDark'], ['cream', 'gray'], ['white', 'grayDark'], ['tan', 'grayDark']]);
      x += n * (w + 2) + randInt(rng, 10, 30);
      if (!ctx.ok(bx) || !ctx.free(bx, bx + n * (w + 2))) continue;
      ctx.stat(bx, bx + n * (w + 2), G, (g, p, lit, ox) => { for (let i = 0; i < n; i++) newHouse(g, p, lit, bx + ox + i * (w + 2), G + 2, w, cols, seed + i); });
    } else if (kind < 0.55) {                                                  // a dry-stone wall across the paddock
      const w = randInt(rng, 40, 90);
      x += w + randInt(rng, 8, 20);
      if (!ctx.ok(bx) || !ctx.free(bx, bx + w)) continue;
      ctx.stat(bx, bx + w, G - 1, (g, p, lit, ox) => {
        for (let xx = 0; xx < w; xx++) { px(g, bx + xx + ox, G - 1, (xx * 7) % 5 ? p.gray : p.grayDark); px(g, bx + xx + ox, G - 2, (xx * 3) % 4 ? p.grayLight : p.gray); }
      });
    } else if (kind < 0.8) {                                                   // a red gum on its own
      const h = randInt(rng, 18, 30);
      x += randInt(rng, 24, 50);
      if (!ctx.ok(bx) || !ctx.free(bx - 10, bx + 10)) continue;
      ctx.stat(bx - 14, bx + 14, G + 1, (g, p, lit, ox) => gumTree(g, bx + ox, G + 1, h, p, seed));
    } else {                                                                   // basalt boulders
      x += randInt(rng, 20, 40);
      if (!ctx.ok(bx)) continue;
      ctx.stat(bx - 4, bx + 6, G + 3, (g, p, lit, ox) => { disc(g, bx + ox, G + 2, 2, p.grayDark); disc(g, bx + 3 + ox, G + 3, 1, p.gray); px(g, bx - 1 + ox, G, p.grayLight); });
    }
  }
  for (let x = ctx.from + 40; x < ctx.to; x += randInt(rng, 160, 300)) {      // a mob of roos grazing
    const H = { x0: x - 40, w: 80, h: 0, dry: true };
    if (ctx.ok(x) && ctx.free(x - 20, x + 20)) for (let n = randInt(rng, 1, 3); n > 0; n--) ctx.live(farRooEnt(H, randInt(rng, 20, 60), rng));
  }
}

function newHouse(g, p, lit, x, base, w, [wall, roof], seed) {
  const rng = mulberry32(seed), h = 10;
  rect(g, x, base - h, w, h, p[wall]);
  rect(g, x + w - 1, base - h, 1, h, p.grayLight);
  for (let k = 0; k < 3; k++) rect(g, x - 1 + k, base - h - 3 + k, w + 2 - 2 * k, 1, p[roof]);   // low hipped roof
  rect(g, x + 1, base - h - 3, w - 2, 1, p[roof]);
  rect(g, x + 2, base - 8, 3, 2, lit && rng() < 0.6 ? PALETTE.glow : p.navy);
  rect(g, x + w - 5, base - 8, 3, 2, lit && rng() < 0.4 ? PALETTE.glow : p.navy);
  rect(g, x + 1, base - 4, 5, 4, p.grayDark);                                  // double garage
  rect(g, x + 8, base - 4, 2, 4, p[pick(rng, ['brownDark', 'ink', 'grayDark'])]);
}

const plainsMidGround = (c, y, lx) => y < 34 ? null : y === 34 ? (bayer(lx, y) < 9 ? 'tan' : 'paddy')
  : hash2(lx >> 1, y >> 1) < 0.18 ? 'tan' : hash2(lx, y) < 0.06 ? 'grass' : (y & 1) && bayer(lx, y) < 5 ? 'grassLight' : 'paddy';

// --- Corio Bay: water out to the far shore -----------------------------------
function bayFar(ctx) {
  const { rng } = ctx, dashes = [];
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 4, 9)) dashes.push([x, randInt(rng, 50, 59), randInt(rng, 2, 4), rng() * 6, 1 + rng() * 2]);
  chunkedShimmer(ctx, dashes, 0);
  for (let x = ctx.from + randInt(rng, 20, 90); x < ctx.to; x += randInt(rng, 90, 200)) {   // a yacht or two
    const tx = x;
    if (ctx.ok(tx)) ctx.stat(tx - 3, tx + 4, 2, (g, p, lit, ox) => {
      for (let k = 0; k < 5; k++) rect(g, tx + ox, 49 - k, Math.max(1, 3 - (k >> 1)), 1, p.white);
      rect(g, tx - 2 + ox, 50, 6, 1, p.navy);
    });
  }
}
const bayFarGround = (c, y, lx) => y < 47 ? null : y < 49 ? (bayer(lx, y) < 6 ? 'haze' : 'slate') : hash2(lx >> 2, y) < 0.08 ? 'skyLight' : bayer(lx, y) < 6 ? 'skyMid' : 'skyDeep';

function bayMid(ctx) {
  const { rng } = ctx, dashes = [];
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 3, 8)) dashes.push([x, randInt(rng, 44, 74), randInt(rng, 2, 6), rng() * 6, 1 + rng() * 2]);
  chunkedShimmer(ctx, dashes, 0);
  for (let x = ctx.from + randInt(rng, 40, 120); x < ctx.to; x += randInt(rng, 220, 380)) {   // a timber jetty out into the bay
    const tx = x, len = randInt(rng, 30, 60);
    if (ctx.ok(tx) && ctx.free(tx, tx + len)) ctx.stat(tx, tx + len, 42, (g, p, lit, ox) => {
      rect(g, tx + ox, 42, len, 1, p.tan); rect(g, tx + ox, 43, len, 1, p.brown);
      for (let k = 2; k < len; k += 6) rect(g, tx + k + ox, 44, 1, 4, p.brownDark);
    });
  }
  addTufts({ ...ctx, ok: x => ctx.ok(x) }, 9, 35, 40, 4);
}
const bayMidGround = (c, y, lx) => y < 34 ? null : y < 41 ? (hash2(lx >> 1, y) < 0.25 ? 'tan' : y === 34 ? 'grassLight' : 'grass')
  : y === 41 ? (bayer(lx, y) < 8 ? 'cream' : 'tan') : hash2(lx >> 3, y) < 0.06 ? 'skyLight' : bayer(lx, y) < 5 ? 'skyMid' : 'blue';

function bayFg(ctx) {
  const { rng, L } = ctx;
  addTufts(ctx, 8, 14, 32, 6);
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 6, 14)) if (ctx.ok(x)) ctx.live(swayer(L, x, randInt(rng, 16, 30), 'reed', randInt(rng, 6, 9), randInt(rng, 0, 2)));
}
const bayFgGround = (c, y, lx) => y < 12 ? null : y === 12 ? (bayer(lx, y) < 10 ? 'grass' : 'green')
  : hash2(lx >> 1, y) < 0.2 ? 'tan' : hash2(lx >> 2, y >> 1) < 0.3 ? 'haze' : (y & 1) ? 'green' : 'grass';   // saltmarsh

// --- the Skyrail: up on the viaduct through Carnegie --------------------------
// Mid layer: the rooftops below, seen from up on the viaduct
function skyrailMid(ctx) {
  const { rng } = ctx, G = 40;
  for (let x = ctx.from; x < ctx.to; ) {
    const w = randInt(rng, 12, 20), hx = x, o = houseDesign(rng, w), seed = randInt(rng, 1, 1e6), tree = rng() < 0.4;
    x += w + randInt(rng, 3, 10);
    if (!ctx.ok(hx) || !ctx.free(hx, hx + w)) continue;
    ctx.stat(hx - 2, hx + w + 2, G, (g, p, lit, ox) => {
      ausHouse(g, hx + ox, G + 2, w, p, o, lit && o.lightOn);
      if (tree) roundTree(g, hx + w + 1 + ox, G + 2, 4, 1, p, seed);
    });
  }
}
const skyrailMidGround = (c, y, lx) => y < 40 ? null : y < 43 ? (hash2(lx, y) < 0.1 ? 'grayDark' : 'gray') : hash2(lx >> 1, y >> 1) < 0.25 ? 'green' : 'grass';

// Near layer: the viaduct's own parapet, its piers, and the linear park far
// below with people out on the path
function skyrailFg(ctx) {
  const { rng } = ctx;
  for (let x = ctx.from + randInt(rng, 0, 80); x < ctx.to; x += randInt(rng, 120, 240)) {
    const len = randInt(rng, 140, 260);
    if (ctx.ok(x + (len >> 1))) ctx.live(rng() < 0.5 ? cyclistEnt(x, x + len, 30, rng) : joggerEnt(x, x + len, 30, rng));
  }
  for (let x = ctx.from + randInt(rng, 10, 60); x < ctx.to; x += randInt(rng, 60, 140)) {
    const tx = x, seed = randInt(rng, 1, 1e6), h = randInt(rng, 6, 10);
    if (ctx.ok(tx) && (tx % 72) > 14 && (tx % 72) < 60) ctx.stat(tx - 6, tx + 6, 33, (g, p, lit, ox) => roundTree(g, tx + ox, 33, 3, h - 5, p, seed));
  }
}
function skyrailFgGround(c, y, lx) {
  if (y < 8) return null;
  if (y < 12) return y === 8 ? 'cloudShade' : y === 11 ? 'gray' : 'grayLight';     // the parapet
  const k = lx % 72;
  if (k < 8) return k === 0 || k === 7 ? 'gray' : y < 14 ? 'grayLight' : 'cloudShade';   // a pier
  if (y < 14) return 'grayDark';                                                  // under the deck, in its shadow
  if (y > 27 && y < 30) return hash2(lx, y) < 0.1 ? 'cloudShade' : 'cream';       // the shared path
  return hash2(lx >> 2, y >> 1) < 0.25 ? 'grassLight' : 'grass';
}

// =====================================================================
// LANDMARKS of the other lines. Each painter draws centred on cx, standing
// on base (the mid layer's ground, or the far layer's horizon).
// =====================================================================
// A sign board with lettering that stays readable after dark
function signBoard(g, p, lit, x, y, text, bg) {
  const w = textWidth(text) + 4;
  rect(g, x, y, w, 7, p[bg]);
  drawText(g, text, x + 2, y + 1, signInk(p, lit));
  return w;
}

// Victoria Park: the old Collingwood grandstand, black and white
function paintVictoriaPark(g, p, lit, cx, base) {
  rect(g, cx - 44, base - 14, 88, 14, p.rust);                                    // brick base
  for (let x = cx - 42; x < cx + 42; x += 2) rect(g, x, base - 13, 1, 8, (x >> 1) & 1 ? p.white : p.ink);   // the seats in stripes
  for (let k = 0; k < 4; k++) rect(g, cx - 46 + k * 2, base - 18 + k, 92 - k * 4, 1, k ? p.gray : p.grayDark);   // the roof
  for (let x = cx - 40; x <= cx + 40; x += 16) rect(g, x, base - 15, 1, 10, p.grayDark);
  for (let x = cx - 40; x < cx + 40; x += 6) rect(g, x, base - 4, 3, 3, lit ? PALETTE.glow : p.brownDark);
  signBoard(g, p, lit, cx - 27, base - 27, 'VICTORIA PARK', 'ink');
}

// Clifton Hill: the shot tower, 1882, red brick tapering up to its parapet
function paintShotTower(g, p, lit, cx, base) {
  const H = 46;
  for (let k = 0; k < H; k++) {
    const hw = Math.round(5 - k * 2 / H);
    rect(g, cx - hw, base - k - 1, 2 * hw + 1, 1, k % 6 === 5 ? p.cream : p.rust);
    px(g, cx + hw, base - k - 1, p.brown);
  }
  for (let k = 8; k < H - 6; k += 8) rect(g, cx, base - k - 3, 1, 2, lit ? PALETTE.amber : p.navy);
  rect(g, cx - 5, base - H - 3, 11, 3, p.cream);                                  // the gallery at the top
  for (let x = cx - 5; x <= cx + 5; x += 2) px(g, x, base - H - 4, p.cream);
  rect(g, cx - 1, base - H - 7, 3, 3, p.rust);
  rect(g, cx - 12, base - 6, 8, 6, p.rust); rect(g, cx + 5, base - 8, 9, 8, p.brown);   // the works around its foot
}

// Northcote: High Street shops and the old cinema with its blade sign
function paintCinema(g, p, lit, cx, base) {
  const rng = mulberry32(44);
  shopRow(g, p, lit, rng, cx - 46, base, 4);
  rect(g, cx - 4, base - 22, 30, 22, p.cream);                                    // the cinema
  rect(g, cx - 4, base - 22, 30, 2, p.rust);
  for (let x = cx; x < cx + 24; x += 5) rect(g, x, base - 17, 2, 6, p.tan);       // art deco fins
  rect(g, cx - 2, base - 8, 26, 2, p.red);                                        // the marquee
  if (lit) for (let x = cx - 2; x < cx + 24; x += 2) px(g, x, base - 6, PALETTE.glow);
  rect(g, cx + 4, base - 6, 12, 6, lit ? PALETTE.amber : p.brownDark);
  signBoard(g, p, lit, cx + 26, base - 30, 'WESTGARTH', 'red');
  rect(g, cx + 27, base - 23, 1, 8, p.grayDark);
}

// Preston: Preston Market, a long shed with a sawtooth roof and fruit out the front
function paintPrestonMarket(g, p, lit, cx, base) {
  const rng = mulberry32(65);
  rect(g, cx - 54, base - 12, 108, 12, p.cloudShade);
  for (let x = cx - 54; x + 6 <= cx + 54; x += 7)
    for (let k = 0; k < 5; k++) { rect(g, x + k, base - 17 + k, 1, 5 - k, p.haze); px(g, x + 5, base - 13 - k * 0, p.greenDark); }
  rect(g, cx - 54, base - 6, 108, 1, p.green);                                    // the awning
  for (let x = cx - 52; x < cx + 52; x += 4) {                                    // crates of fruit and veg
    rect(g, x, base - 3, 3, 3, p.tan);
    px(g, x + 1, base - 4, p[pick(rng, ['red', 'glow', 'grass', 'orange', 'purple', 'grassLight'])]);
  }
  for (let x = cx - 50; x < cx + 50; x += 9) rect(g, x, base - 10, 5, 3, lit ? PALETTE.glow : p.indigo);
  signBoard(g, p, lit, cx - 30, base - 26, 'PRESTON MARKET', 'greenDark');
}

// Epping: the train yard - a maintenance shed, and trains stabled in rows
function paintTrainYard(g, p, lit, cx, base) {
  rect(g, cx - 60, base - 18, 54, 18, p.grayLight);
  rect(g, cx - 61, base - 19, 56, 2, p.gray);
  for (const x of [cx - 56, cx - 40, cx - 24]) { rect(g, x, base - 13, 12, 13, p.grayDark); if (lit) rect(g, x + 1, base - 12, 10, 2, PALETTE.amber); }
  for (let r = 0; r < 3; r++) {                                                   // three trains stabled side by side
    const y = base - 2 - r * 4, x = cx - 2 + r * 3;
    rect(g, x, y - 5, 58 - r * 4, 5, p.white);
    rect(g, x, y - 4, 58 - r * 4, 1, p.navy);
    rect(g, x, y - 1, 58 - r * 4, 1, p.blue);
    rect(g, x + 56 - r * 4, y - 5, 2, 5, p.glow);
  }
}

// Ascot Vale: the Showgrounds - the pavilion, the grandstand and the big wheel
function paintShowgrounds(g, p, lit, cx, base) {
  const wx = cx + 34, wy = base - 22, r = 18;
  for (let a = 0; a < 12; a++) {                                                  // the wheel
    const t = a * Math.PI / 6;
    pxLine(g, wx, wy, wx + Math.round(Math.cos(t) * r), wy + Math.round(Math.sin(t) * r), p.grayLight);
    rect(g, wx + Math.round(Math.cos(t) * r) - 1, wy + Math.round(Math.sin(t) * r), 3, 2, p[['red', 'glow', 'skyMid', 'grass'][a % 4]]);
  }
  pxLine(g, wx, wy, wx - 8, base, p.gray); pxLine(g, wx, wy, wx + 8, base, p.gray);
  if (lit) glowHalo(g, wx, wy, 3, r + 3, 2);
  rect(g, cx - 56, base - 12, 60, 12, p.cream);                                   // the pavilion
  for (let k = 0; k < 5; k++) rect(g, cx - 56 + k * 3, base - 17 + k, 60 - k * 6, 1, p.red);
  for (let x = cx - 52; x < cx; x += 6) rect(g, x, base - 9, 3, 5, lit ? PALETTE.glow : p.brownDark);
  signBoard(g, p, lit, cx - 50, base - 28, 'SHOWGROUNDS', 'red');
}

// Moonee Ponds: Puckle Street, and the clock tower over the shops
function paintPuckleSt(g, p, lit, cx, base) {
  const rng = mulberry32(21);
  shopRow(g, p, lit, rng, cx - 48, base, 4);
  shopRow(g, p, lit, rng, cx + 10, base, 4);
  rect(g, cx - 6, base - 34, 13, 34, p.rust);                                     // the clock tower
  rect(g, cx + 6, base - 34, 1, 34, p.brown);
  disc(g, cx, base - 27, 3, p.white);
  px(g, cx, base - 27, p.ink); px(g, cx, base - 28, p.ink); px(g, cx + 1, base - 27, p.ink);
  for (let k = 0; k < 5; k++) rect(g, cx - 5 + k, base - 39 + k, 11 - 2 * k, 1, p.haze);
  signBoard(g, p, lit, cx - 47, base - 24, 'PUCKLE ST', 'navy');
}

// Essendon: Windy Hill, the old home of the Bombers, red and black
function paintWindyHill(g, p, lit, cx, base) {
  rect(g, cx - 44, base - 13, 70, 13, p.ink);
  for (let x = cx - 42; x < cx + 24; x += 2) rect(g, x, base - 12, 1, 7, (x >> 1) & 1 ? p.red : p.ink);
  for (let k = 0; k < 3; k++) rect(g, cx - 46 + k * 2, base - 16 + k, 74 - k * 4, 1, p.gray);
  for (let i = -44; i <= 44; i += 2) px(g, cx + i, base - 1, p.white);            // the oval's fence
  for (const dx of [32, 40]) { rect(g, cx + dx, base - 12, 1, 12, p.white); }     // the posts at the city end
  signBoard(g, p, lit, cx - 40, base - 25, 'WINDY HILL', 'red');
}

// Broadmeadows: the civic centre and library, glass and timber
function paintCivicCentre(g, p, lit, cx, base) {
  const rng = mulberry32(12);
  let t = bldg(g, p, lit, rng, cx - 46, base, 40, 22, p.skyMid, p.skyDeep, p.skyLight, 4);
  for (let x = cx - 46; x < cx - 6; x += 5) rect(g, x, t, 2, 22, p.tan);          // timber fins
  t = bldg(g, p, lit, rng, cx - 4, base, 50, 14, p.cloudShade, p.grayLight, p.slate, 4);
  signBoard(g, p, lit, cx - 2, t - 9, 'BROADMEADOWS', 'blue');
}

// Footscray: the market and the shops of Hopkins Street
function paintFootscray(g, p, lit, cx, base) {
  const rng = mulberry32(81);
  rect(g, cx - 54, base - 16, 56, 16, p.cream);
  rect(g, cx - 54, base - 17, 56, 1, p.tan);
  rect(g, cx - 54, base - 7, 56, 1, p.red);
  for (let x = cx - 50; x < cx; x += 6) rect(g, x, base - 13, 3, 4, lit ? PALETTE.glow : p.navy);
  for (let x = cx - 52; x < cx; x += 4) { rect(g, x, base - 4, 3, 3, p.tan); px(g, x + 1, base - 5, p[pick(rng, ['red', 'glow', 'grass', 'orange'])]); }
  signBoard(g, p, lit, cx - 52, base - 25, 'FOOTSCRAY MARKET', 'red');
  shopRow(g, p, lit, rng, cx + 6, base, 5);
  for (let x = cx + 6; x < cx + 54; x += 3) { g.fillStyle = lit ? LAMP_RED : p.red; g.fillRect(x, base - 8 + ((x >> 1) & 1), 1, 1); }   // lanterns
}

// Yarraville: the Sun Theatre, art deco, its name up in lights
function paintSunTheatre(g, p, lit, cx, base) {
  const rng = mulberry32(5);
  rect(g, cx - 14, base - 20, 28, 20, p.cream);
  rect(g, cx + 13, base - 20, 1, 20, p.tan);
  for (let k = 0; k < 4; k++) rect(g, cx - 14 + k * 2, base - 21 - k, 28 - k * 4, 1, p.peach);   // stepped parapet
  rect(g, cx - 3, base - 34, 7, 14, p.cream);                                     // the fin
  rect(g, cx - 3, base - 34, 7, 1, p.tan);
  for (const [i, ch] of ['S', 'U', 'N'].entries()) drawText(g, ch, cx - 1, base - 32 + i * 4, lit ? PALETTE.glow : p.red);
  if (lit) glowHalo(g, cx, base - 27, 3, 8, 3);
  rect(g, cx - 12, base - 8, 24, 2, p.red);
  rect(g, cx - 8, base - 6, 16, 6, lit ? PALETTE.amber : p.brownDark);
  shopRow(g, p, lit, rng, cx - 26, base, 1);
}

// Spotswood: the old pumping station - its tall chimney - and Scienceworks
function paintScienceworks(g, p, lit, cx, base) {
  rect(g, cx - 36, base - 14, 30, 14, p.rust);
  for (let x = cx - 33; x < cx - 8; x += 5) { rect(g, x, base - 11, 2, 6, lit ? PALETTE.amber : p.navy); px(g, x, base - 12, p.cream); }
  for (let k = 0; k < 4; k++) rect(g, cx - 37 + k * 2, base - 18 + k, 34 - k * 4, 1, p.grayDark);
  const sx = cx - 2;                                                              // the chimney
  for (let k = 0; k < 52; k++) rect(g, sx - (k < 6 ? 2 : 1), base - k - 1, k < 6 ? 5 : 3, 1, k % 9 === 8 ? p.cream : p.rust);
  rect(g, cx + 4, base - 12, 32, 12, p.cloudShade);                               // the museum's shed
  rect(g, cx + 4, base - 13, 32, 1, p.white);
  rect(g, cx + 8, base - 22, 10, 10, p.skyMid); disc(g, cx + 13, base - 22, 5, p.skyMid);   // a dome
  signBoard(g, p, lit, cx + 8, base - 9, 'SCIENCEWORKS', 'ink');
}

// Newport: the railway workshops - long brick sheds - and an old steam loco
function paintWorkshops(g, p, lit, cx, base) {
  for (const [x0, w] of [[cx - 62, 56], [cx - 2, 46]]) {
    rect(g, x0, base - 14, w, 14, p.rust);
    for (let x = x0; x + 6 <= x0 + w; x += 7) for (let k = 0; k < 5; k++) { rect(g, x + k, base - 19 + k, 1, 5 - k, p.gray); px(g, x + 5, base - 15, lit ? PALETTE.amber : p.skyLight); }
    for (let x = x0 + 3; x < x0 + w - 6; x += 9) { rect(g, x, base - 10, 5, 10, p.brownDark); px(g, x + 2, base - 11, p.cream); }
  }
  const lx = cx + 46;                                                             // an R class steamer out the front
  rect(g, lx, base - 7, 16, 5, p.ink); rect(g, lx + 13, base - 9, 3, 2, p.ink);
  rect(g, lx + 1, base - 11, 5, 4, p.ink); rect(g, lx + 2, base - 10, 3, 2, lit ? PALETTE.amber : p.navy);
  rect(g, lx, base - 6, 16, 1, p.red);
  for (const wx of [lx + 4, lx + 8, lx + 12]) disc(g, wx, base - 1, 1, p.red);
  signBoard(g, p, lit, cx - 58, base - 27, 'NEWPORT WORKSHOPS', 'brownDark');
}

// Laverton: the air base - curved hangars, a control tower, an old jet on a plinth
function paintAirBase(g, p, lit, cx, base) {
  for (const x0 of [cx - 60, cx - 22]) {
    for (let i = 0; i < 34; i++) { const t = Math.round(10 * Math.sin(Math.PI * i / 33)); rect(g, x0 + i, base - 4 - t, 1, 4 + t, i % 4 ? p.grayLight : p.gray); }
    rect(g, x0 + 8, base - 8, 18, 8, p.grayDark);
  }
  rect(g, cx + 18, base - 26, 6, 26, p.cloudShade);                               // control tower
  rect(g, cx + 16, base - 30, 10, 4, p.skyMid); rect(g, cx + 16, base - 31, 10, 1, p.grayDark);
  if (lit) px(g, cx + 21, base - 32, LAMP_RED);
  const jx = cx + 32;                                                             // the jet
  rect(g, jx, base - 9, 24, 3, p.grayLight); rect(g, jx + 22, base - 8, 4, 1, p.gray);
  for (let k = 0; k < 5; k++) rect(g, jx + 8 + k, base - 9 - k, 6 - k, 1, p.gray);   // wing
  for (let k = 0; k < 4; k++) rect(g, jx + 1, base - 10 - k, 2, 1, p.gray);       // tail fin
  rect(g, jx + 10, base - 6, 1, 6, p.grayDark);
}

// Williams Landing: the new town centre's tower beside the station
function paintWilliamsLanding(g, p, lit, cx, base) {
  const rng = mulberry32(9);
  bldg(g, p, lit, rng, cx - 8, base, 16, 34, p.skyMid, p.skyDeep, p.skyLight, 3);
  bldg(g, p, lit, rng, cx - 28, base, 18, 16, p.cloudShade, p.grayLight, p.slate, 4);
  bldg(g, p, lit, rng, cx + 10, base, 18, 12, p.white, p.cloudShade, p.slate, 4);
}

// Werribee: Werribee Park Mansion, Italianate, behind its formal garden
function paintMansion(g, p, lit, cx, base) {
  rect(g, cx - 34, base - 16, 68, 14, p.cream);
  rect(g, cx + 33, base - 16, 1, 14, p.tan);
  rect(g, cx - 35, base - 17, 70, 1, p.peach);
  for (let x = cx - 31; x < cx + 32; x += 5) for (const y of [13, 8]) rect(g, x, base - y, 2, 3, lit ? PALETTE.glow : p.navy);
  rect(g, cx - 6, base - 30, 12, 14, p.cream);                                    // the tower
  rect(g, cx - 7, base - 31, 14, 1, p.peach);
  for (const x of [cx - 4, cx + 2]) rect(g, x, base - 27, 2, 4, lit ? PALETTE.glow : p.navy);
  for (let k = 0; k < 3; k++) rect(g, cx - 5 + k * 2, base - 34 + k, 10 - k * 4, 1, p.gray);
  rect(g, cx - 34, base - 2, 68, 2, p.greenDark);                                 // the hedges
  for (let x = cx - 33; x < cx + 33; x += 6) rect(g, x, base - 3, 3, 1, p.green);
}

// Caulfield: the racecourse grandstand and the white rail of the track
function paintRacecourse(g, p, lit, cx, base) {
  rect(g, cx - 62, base - 16, 70, 16, p.white);
  for (let k = 0; k < 4; k++) rect(g, cx - 64 + k, base - 20 + k, 74 - 2 * k, 1, p.grayLight);   // the cantilever roof
  for (let r = 0; r < 3; r++) for (let x = cx - 60; x < cx + 6; x += 2) px(g, x, base - 14 + r * 3, p[pick(mulberry32(x * 3 + r), ['navy', 'red', 'cream', 'skyMid', 'ink'])]);
  for (let x = cx - 60; x < cx + 6; x += 8) rect(g, x, base - 6, 5, 4, lit ? PALETTE.glow : p.slate);
  for (let x = cx - 64; x < cx + 64; x++) px(g, x, base - 1, x % 3 ? p.white : p.grayLight);   // the rail
  for (const [dx, col] of [[24, 'brown'], [40, 'ink']]) {                         // horses out on the track
    const hx = cx + dx;
    rect(g, hx, base - 5, 5, 2, p[col]); rect(g, hx + 4, base - 7, 2, 2, p[col]);
    for (const lx of [hx, hx + 4]) rect(g, lx, base - 3, 1, 2, p[col]);
    rect(g, hx + 1, base - 7, 2, 2, p.red);                                      // the jockey's silks
  }
  signBoard(g, p, lit, cx - 58, base - 28, 'CAULFIELD', 'navy');
}

// Carnegie: Koornang Road shops, in the shade of the viaduct
function paintKoornang(g, p, lit, cx, base) {
  const rng = mulberry32(17);
  shopRow(g, p, lit, rng, cx - 40, base, 8);
  signBoard(g, p, lit, cx - 26, base - 24, 'KOORNANG RD', 'navy');
}

// Oakleigh: Eaton Mall - the cafes and their umbrellas
function paintEatonMall(g, p, lit, cx, base) {
  const rng = mulberry32(23);
  shopRow(g, p, lit, rng, cx - 40, base, 8);
  for (let x = cx - 36; x < cx + 36; x += 12) {
    rect(g, x + 2, base - 7, 1, 7, p.grayDark);
    for (let k = 0; k < 2; k++) rect(g, x - k, base - 9 + k, 5 + 2 * k, 1, k ? p.white : p.skyMid);
  }
  signBoard(g, p, lit, cx - 22, base - 24, 'EATON MALL', 'skyDeep');
}

// Clayton: Monash
function paintMonash(g, p, lit, cx, base) {
  const rng = mulberry32(4);
  let t = bldg(g, p, lit, rng, cx - 50, base, 44, 26, p.cloudShade, p.grayLight, p.navy, 4);
  signBoard(g, p, lit, cx - 44, t + 3, 'MONASH', 'blue');
  t = bldg(g, p, lit, rng, cx - 2, base, 30, 18, p.rust, p.brown, p.navy, 4);
  bldg(g, p, lit, rng, cx + 30, base, 20, 12, p.skyMid, p.skyDeep, p.skyLight, 4);
}

// Springvale: the shops along Springvale Road, red and gold, lanterns strung across
function paintSpringvale(g, p, lit, cx, base) {
  const rng = mulberry32(88);
  for (let i = 0; i < 10; i++) {
    const sx = cx - 48 + i * 10, h = 12 + randInt(rng, 0, 4);
    rect(g, sx, base - h, 10, h, p[pick(rng, ['cream', 'cloudShade', 'peach', 'white'])]);
    rect(g, sx, base - h, 10, 4, p[i & 1 ? 'red' : 'glow']);                     // shop signs
    for (let k = 1; k < 9; k += 2) px(g, sx + k, base - h + 1 + (k & 2 ? 1 : 0), p[i & 1 ? 'glow' : 'red']);
    rect(g, sx + 1, base - 6, 8, 6, lit ? PALETTE.glow : p.indigo);
    rect(g, sx - 1, base - 7, 12, 1, p.grayDark);
  }
  for (let x = cx - 48; x < cx + 52; x += 5) { g.fillStyle = lit ? LAMP_RED : p.red; g.fillRect(x, base - 20 + ((x >> 2) & 1), 2, 2); }
}

// Dandenong: the market, red brick with its clock tower
function paintDandenongMarket(g, p, lit, cx, base) {
  const rng = mulberry32(31);
  rect(g, cx - 50, base - 13, 100, 13, p.rust);
  for (let x = cx - 50; x < cx + 50; x += 4) px(g, x, base - 13, p.cream);
  for (let x = cx - 46; x < cx + 46; x += 7) rect(g, x, base - 10, 4, 6, lit ? PALETTE.glow : p.brownDark);
  rect(g, cx - 5, base - 30, 10, 17, p.rust);
  disc(g, cx, base - 24, 3, p.white);
  px(g, cx, base - 24, p.ink); px(g, cx, base - 25, p.ink); px(g, cx + 1, base - 24, p.ink);
  for (let k = 0; k < 4; k++) rect(g, cx - 4 + k, base - 34 + k, 8 - 2 * k, 1, p.gray);
  for (let x = cx - 48; x < cx + 48; x += 4) { rect(g, x, base - 3, 3, 3, p.tan); px(g, x + 1, base - 4, p[pick(rng, ['red', 'glow', 'grass', 'orange'])]); }
  signBoard(g, p, lit, cx - 48, base - 22, 'DANDENONG MARKET', 'navy');
}

// Sunshine: the harvester works - sawtooth sheds and the chimney
function paintHarvester(g, p, lit, cx, base) {
  warehouse(g, p, lit, cx - 38, base, 50, 7);
  for (let k = 0; k < 44; k++) rect(g, cx + 18, base - k - 1, 3, 1, k % 8 === 7 ? p.cream : p.rust);
  rect(g, cx + 24, base - 12, 14, 12, p.cream);
  signBoard(g, p, lit, cx - 34, base - 28, 'SUNSHINE', 'red');
}

// Tarneit: a brand new estate going up, and its billboard
function paintEstate(g, p, lit, cx, base) {
  for (let i = 0; i < 6; i++) newHouse(g, p, lit, cx - 58 + i * 14, base, 12, i % 3 ? ['cloudShade', 'grayDark'] : ['cream', 'gray'], 70 + i);
  for (let x = cx + 28; x < cx + 58; x += 10) {                                   // frames of the next ones
    rect(g, x, base - 9, 1, 9, p.tan); rect(g, x + 8, base - 9, 1, 9, p.tan); rect(g, x, base - 9, 9, 1, p.tan);
    for (let k = 0; k < 3; k++) rect(g, x + k, base - 12 + k, 9 - 2 * k, 1, p.tan);
  }
  rect(g, cx - 20, base - 22, 1, 9, p.grayDark); rect(g, cx + 20, base - 22, 1, 9, p.grayDark);
  signBoard(g, p, lit, cx - 23, base - 30, 'NOW SELLING', 'vline');
}

// Corio: the refinery on the bay - tanks, towers, pipes and the flare
function paintRefinery(g, p, lit, cx, base) {
  for (let i = 0; i < 4; i++) oilTank(g, p, cx - 70 + i * 16, base, 14);
  for (const [dx, h] of [[0, 30], [8, 22], [14, 34]]) {                           // distillation columns
    rect(g, cx + dx, base - h, 4, h, p.grayLight); rect(g, cx + dx + 3, base - h, 1, h, p.gray);
    for (let k = 4; k < h; k += 6) rect(g, cx + dx - 1, base - k, 6, 1, p.grayDark);
    if (lit) px(g, cx + dx + 1, base - h - 1, LAMP_RED);
  }
  for (let x = cx - 8; x < cx + 60; x++) { px(g, x, base - 5, p.grayDark); if (x % 3 === 0) px(g, x, base - 8, p.gray); }   // the pipe racks
  const fx = cx + 54;                                                             // the flare stack
  rect(g, fx, base - 40, 2, 40, p.grayLight);
  for (const [dx, dy, col] of [[0, -42, 'orange'], [1, -43, 'glow'], [0, -44, 'orange'], [1, -45, 'amber']]) px(g, fx + dx, base + dy, lit ? PALETTE[col] : p[col]);
  if (lit) glowHalo(g, fx + 1, base - 43, 1.5, 6, 6);
}

// Geelong: the station building, and the city behind it
function paintGeelongStation(g, p, lit, cx, base) {
  const rng = mulberry32(14);
  rect(g, cx - 36, base - 16, 72, 16, p.cream);
  rect(g, cx + 35, base - 16, 1, 16, p.tan);
  for (let k = 0; k < 4; k++) rect(g, cx - 38 + k * 2, base - 20 + k, 76 - k * 4, 1, p.gray);
  for (let x = cx - 32; x < cx + 32; x += 6) { rect(g, x, base - 12, 3, 5, lit ? PALETTE.glow : p.navy); px(g, x + 1, base - 13, p.peach); }
  rect(g, cx - 6, base - 6, 12, 6, p.brownDark);
  signBoard(g, p, lit, cx - 15, base - 28, 'GEELONG', 'vline');
  bldg(g, p, lit, rng, cx + 38, base, 12, 26, p.skyMid, p.skyDeep, p.skyLight, 3);
  bldg(g, p, lit, rng, cx - 50, base, 12, 20, p.cloudShade, p.grayLight, p.slate, 3);
}

// --- far marks: on the horizon -----------------------------------------------
// Mount Macedon, blue and far off to the north-west
function paintMacedon(g, p, lit, cx, base) {
  hump(g, cx - 90, base + 1, 180, 18, p.haze, null, p.skyMid);
  hump(g, cx - 40, base + 1, 70, 24, p.haze, null, p.skyMid);
}

// The West Gate Bridge: the long high deck, its two towers and their cables
function paintWestGate(g, p, lit, cx, base) {
  const deck = base - 24;
  for (let x = cx - 120; x < cx + 120; x++) {
    const sag = Math.round(3 * Math.cos(Math.PI * (x - cx) / 240));
    px(g, x, deck - sag, p.cloudShade); px(g, x, deck - sag + 1, p.grayLight);
  }
  for (let x = cx - 116; x < cx + 120; x += 18) rect(g, x, deck + 2, 2, base - deck - 2, p.cloudShade);   // the piers
  for (const tx of [cx - 30, cx + 30]) {
    rect(g, tx, deck - 22, 2, 22, p.cloudShade);
    for (const d of [-1, 1]) for (let k = 1; k <= 3; k++) pxLine(g, tx, deck - 20 + k * 4, tx + d * k * 9, deck - 2, p.grayLight);
    if (lit) px(g, tx, deck - 23, LAMP_RED);
  }
  if (lit) for (let x = cx - 116; x < cx + 120; x += 6) px(g, x, deck - 1 - Math.round(3 * Math.cos(Math.PI * (x - cx) / 240)), PALETTE.amber);
}

// The You Yangs: granite peaks rising out of the plain
function paintYouYangs(g, p, lit, cx, base) {
  for (const [dx, w, h] of [[-150, 110, 14], [-80, 90, 26], [-30, 70, 34], [20, 80, 22], [70, 80, 16]]) hump(g, cx + dx, base + 1, w, h, p.haze, p.slate, p.skyMid);
  for (const [dx, dy] of [[-3, -30], [4, -28], [-46, -22], [36, -18]]) { rect(g, cx + dx, base + dy, 3, 2, p.slate); px(g, cx + dx + 1, base + dy - 1, p.slate); }   // granite tors
}

// --- the Hurstbridge line ----------------------------------------------------
// Fairfield: the Station Street shops
function paintStationSt(g, p, lit, cx, base) {
  const rng = mulberry32(61);
  shopRow(g, p, lit, rng, cx - 40, base, 8);
  signBoard(g, p, lit, cx - 24, base - 24, 'STATION ST', 'greenDark');
}

// Heidelberg: the Austin Hospital, its towers up on the hill
function paintAustin(g, p, lit, cx, base) {
  const rng = mulberry32(77);
  let t = bldg(g, p, lit, rng, cx - 46, base, 34, 34, p.cloudShade, p.grayLight, p.slate, 3);
  rect(g, cx - 46, t, 34, 2, p.skyMid);
  t = bldg(g, p, lit, rng, cx - 10, base, 26, 26, p.white, p.cloudShade, p.skyDeep, 3);
  rect(g, cx - 4, t - 8, 14, 7, p.red);                                             // the red cross on the roof
  rect(g, cx + 2, t - 7, 2, 5, p.white); rect(g, cx, t - 5, 6, 1, p.white);
  bldg(g, p, lit, rng, cx + 18, base, 28, 16, p.cream, p.tan, p.navy, 4);
  signBoard(g, p, lit, cx + 20, base - 24, 'AUSTIN', 'blue');
}

// Greensborough: the Plaza, a big box of a shopping centre and its car park
function paintPlaza(g, p, lit, cx, base) {
  rect(g, cx - 60, base - 15, 120, 15, p.cloudShade);
  rect(g, cx - 60, base - 15, 120, 1, p.white);
  for (let x = cx - 58; x < cx + 58; x += 7) { rect(g, x, base - 6, 5, 1, p.grayLight); rect(g, x, base - 3, 5, 1, p.grayLight); }
  rect(g, cx - 18, base - 19, 30, 19, p.skyMid);
  for (let x = cx - 18; x < cx + 12; x += 4) rect(g, x, base - 19, 1, 19, p.skyDeep);
  signBoard(g, p, lit, cx - 16, base - 27, 'THE PLAZA', 'red');
}

// Eltham: Montsalvat, the artists' colony - mud brick and stone, steep
// slate roofs, gothic windows, a tower
function paintMontsalvat(g, p, lit, cx, base) {
  const mud = (x, y, w, h) => { rect(g, x, y, w, h, p.tan); for (let yy = y + 1; yy < y + h; yy += 2) for (let xx = x + ((yy >> 1) & 1) * 2; xx < x + w; xx += 4) px(g, xx, yy, p.brown); };
  mud(cx - 40, base - 16, 46, 16);                                                 // the Great Hall
  for (let k = 0; k < 9; k++) rect(g, cx - 41 + k, base - 25 + k, 48 - 2 * k, 1, k ? p.grayDark : p.gray);
  for (let x = cx - 35; x < cx + 2; x += 8) {                                      // pointed windows
    rect(g, x, base - 11, 3, 6, lit ? PALETTE.amber : p.navy); px(g, x + 1, base - 12, lit ? PALETTE.amber : p.navy);
  }
  rect(g, cx + 8, base - 32, 10, 32, p.gray);                                      // the stone tower
  for (let y = base - 30; y < base; y += 3) for (let x = cx + 8 + ((y >> 1) & 1) * 2; x < cx + 18; x += 4) px(g, x, y, p.grayDark);
  for (let k = 0; k < 6; k++) rect(g, cx + 13 - k, base - 38 + k, 1 + 2 * k, 1, p.grayDark);
  rect(g, cx + 12, base - 24, 2, 4, lit ? PALETTE.glow : p.navy);
  mud(cx + 20, base - 10, 26, 10);
  for (let k = 0; k < 4; k++) rect(g, cx + 19 + k, base - 14 + k, 28 - 2 * k, 1, p.rust);
  signBoard(g, p, lit, cx - 38, base - 24, 'MONTSALVAT', 'brownDark');
}

// Hurstbridge: the main street - weatherboard shops with verandahs, the
// pub on the corner, wattle in flower
function paintHurstbridgeMain(g, p, lit, cx, base) {
  const rng = mulberry32(99);
  for (let i = 0; i < 5; i++) {                                                    // weatherboard shops
    const x = cx - 56 + i * 14, h = 11 + (i % 2) * 2, col = pick(rng, ['cream', 'white', 'skyLight', 'peach']);
    rect(g, x, base - h, 13, h, p[col]);
    for (let y = base - h + 1; y < base; y += 2) rect(g, x, y, 13, 1, p.cloudShade);
    rect(g, x + 2, base - 9, 9, 5, lit && rng() < 0.7 ? PALETTE.glow : p.indigo);
    rect(g, x - 1, base - 4, 15, 1, p.red);                                        // verandah
    for (const px0 of [x, x + 12]) rect(g, px0, base - 3, 1, 3, p.white);
  }
  rect(g, cx + 14, base - 16, 24, 16, p.rust);                                     // the pub
  rect(g, cx + 13, base - 17, 26, 1, p.cream);
  for (let x = cx + 16; x < cx + 36; x += 5) rect(g, x, base - 13, 3, 4, lit ? PALETTE.glow : p.navy);
  rect(g, cx + 13, base - 7, 26, 1, p.greenDark);
  signBoard(g, p, lit, cx + 14, base - 25, 'HOTEL', 'greenDark');
  for (const [dx, r] of [[-62, 5], [44, 6], [54, 4]]) roundTree(g, cx + dx, base, r, 3, p, cx + dx, WATTLE);   // wattle
}
