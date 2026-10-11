// Melbourne Pixel Train - Hawthorn to Ringwood: houses, station landmarks, footy ovals, backyards
'use strict';

// --- 3. the suburbs: Hawthorn, Camberwell, Box Hill, out to Ringwood ------------
function suburbFar(ctx) {
  const { rng, L } = ctx;
  treeLine(ctx, 52, 5);
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 10, 34)) {                 // rooftops and a spire among the trees
    const tx = x, w = randInt(rng, 5, 9), spire = rng() < 0.05, red = rng() < 0.6, on = rng() < 0.5;
    if (!ctx.ok(tx)) continue;
    ctx.stat(tx - 2, tx + w + 2, 2, (g, p, lit, ox) => {
      if (spire) { rect(g, tx + ox, 39, 1, 8, p.cloudShade); rect(g, tx - 1 + ox, 45, 3, 6, p.cloudShade); return; }
      rect(g, tx + ox, 49, w, 2, p.cloudShade);
      rect(g, tx - 1 + ox, 48, w + 2, 1, red ? p.rust : p.gray);
      rect(g, tx + ox, 47, w, 1, red ? p.rust : p.gray);
      if (lit && on) px(g, tx + ox + 2, 50, PALETTE.glow);
    });
  }
  const bh = lxOf(L, stn('BOX').dist - 120);                                      // the cluster of towers at Box Hill
  for (let i = 0; i < 9; i++) {
    const tx = bh + i * 9 + randInt(rng, -2, 2), w = randInt(rng, 5, 8), h = Math.max(8, randInt(rng, 18, 36) - Math.abs(i - 4) * 4);
    const seed = randInt(rng, 1, 1e6), glass = rng() < 0.6;
    ctx.stat(tx, tx + w, 1, (g, p, lit, ox) => farTower(g, p, lit, tx + ox, 52, w, h, glass, seed));
  }
}

// Mid layer: streets of houses under plane trees and gums; a landmark
// behind each station; two footy ovals
function suburbMid(ctx) {
  const { rng, L } = ctx, G = 34, keep = [];
  for (const [code, du, hw, paint] of LANDMARKS) {                                // each station's landmark
    const cx = lxOf(L, stn(code).dist + du);
    ctx.stat(cx - hw, cx + hw, -1, (g, p, lit, ox) => paint(g, p, lit, cx + ox, G + 2));
    keep.push([cx - hw - 4, cx + hw + 4]);
  }
  for (const [i, px0] of OVALS) { const cx = lxOf(L, STATIONS[i].dist + px0); keep.push([cx - 48, cx + 48]); footyOval(ctx, cx, G, rng); }
  for (let x = ctx.from; x < ctx.to; ) {
    const w = randInt(rng, 13, 22), hx = x, o = houseDesign(rng, w), tk = rng();
    const tr = randInt(rng, 3, 6), th = randInt(rng, 2, 5), seed = randInt(rng, 1, 1e6), tx = hx + w + randInt(rng, 1, 4), gh = randInt(rng, 16, 28);
    x += w + randInt(rng, 5, 14);
    if (keep.some(([a, b]) => hx + w > a && hx < b) || !ctx.ok(hx)) continue;
    if (tk < 0.5) ctx.stat(tx - tr - 2, tx + tr + 1, G, (g, p, lit, ox) => roundTree(g, tx + ox, G, tr, th, p, seed, tk < 0.06 ? JACARANDA : LEAFY));
    else if (tk < 0.68) ctx.stat(tx - 14, tx + 14, G, (g, p, lit, ox) => gumTree(g, tx + ox, G, gh, p, seed));
    else if (tk < 0.8) ctx.stat(tx - 3, tx + 4, G, (g, p, lit, ox) => cypress(g, tx + ox, G, gh - 8, p));
    const e = spriteEnt(hx, G + 2, w + 3, 16, 1, 16, 'hs' + hx, (g, p, lit) => ausHouse(g, 1, 16, w, p, o, lit && o.lightOn));
    if (o.lightOn) e.light = [hx + o.win + 1, G - 3];                            // its window glows after dark
    ctx.live(e);
  }
}

// --- landmarks: one behind each station, [station code, world px past it, half width, painter] ---
const LANDMARKS = [
  ['HAW', 90, 20, paintChurch], ['GFE', -210, 21, paintTownHall], ['GFE', 134, 64, paintCampus],
  ['CAM', 40, 62, paintMarket], ['BOX', 60, 58, paintBoxHill], ['RWD', 70, 62, paintRingwood],
];
const signInk = (p, lit) => lit ? PALETTE.cloudShade : p.white;     // lettering stays readable after dark

// A plain block with a grid of windows; returns its top row
function bldg(g, p, lit, rng, x, base, w, h, body, side, win, step) {
  const top = base - h;
  rect(g, x, top, w, h, body);
  rect(g, x + w - 1, top, 1, h, side);
  for (let yy = top + 3; yy < base - 2; yy += step)
    for (let xx = x + 2; xx < x + w - 2; xx += 3) { const on = rng() < 0.5; rect(g, xx, yy, 2, 2, lit && on ? PALETTE.glow : win); }
  return top;
}

// A strip of n two-storey shops, a verandah over the footpath
function shopRow(g, p, lit, rng, x, base, n) {
  for (let i = 0; i < n; i++) {
    const sx = x + i * 10, h = 12 + randInt(rng, 0, 3), on = rng() < 0.6;
    const wall = p[pick(rng, ['cream', 'rust', 'cloudShade', 'peach', 'skyLight', 'tan'])], sign = p[pick(rng, ['red', 'blue', 'green', 'ink', 'purple', 'orange'])];
    rect(g, sx, base - h, 10, h, wall);
    rect(g, sx + 9, base - h, 1, h, p.gray);
    rect(g, sx, base - h, 10, 1, p.cloudShade);                                   // parapet
    rect(g, sx + 2, base - h + 3, 2, 3, p.navy); rect(g, sx + 6, base - h + 3, 2, 3, p.navy);
    rect(g, sx, base - 7, 10, 1, sign);
    rect(g, sx - 1, base - 6, 12, 1, p.grayDark);                                 // verandah
    rect(g, sx + 1, base - 5, 8, 5, lit && on ? PALETTE.glow : p.indigo);
    rect(g, sx + 4, base - 5, 2, 5, p.brownDark);
  }
}

// Hawthorn: a bluestone church, its spire over the rooftops
function paintChurch(g, p, lit, cx, base) {
  rect(g, cx - 6, base - 10, 24, 10, p.gray);                                     // nave
  rect(g, cx - 7, base - 15, 26, 5, p.grayDark);                                  // steep slate roof
  rect(g, cx - 7, base - 15, 26, 1, p.grayLight);
  for (let x = cx - 3; x < cx + 16; x += 5) { rect(g, x, base - 7, 2, 5, lit ? PALETTE.amber : p.navy); px(g, x, base - 8, lit ? PALETTE.glow : p.skyLight); }
  rect(g, cx - 15, base - 19, 8, 19, p.gray);                                     // tower
  rect(g, cx - 8, base - 19, 1, 19, p.grayDark);
  rect(g, cx - 12, base - 15, 2, 4, p.navy); rect(g, cx - 12, base - 7, 2, 7, p.brownDark);
  for (let k = 0; k < 12; k++) { const hw = Math.round(k / 11 * 3.6); rect(g, cx - 11 - hw, base - 31 + k, 2 * hw + 1, 1, p.grayDark); }
  rect(g, cx - 11, base - 34, 1, 3, p.cloudShade); rect(g, cx - 12, base - 33, 3, 1, p.cloudShade);   // cross
}

// Glenferrie: Hawthorn Town Hall on Burwood Road, mansard roofs and a clock tower
function paintTownHall(g, p, lit, cx, base) {
  rect(g, cx - 18, base - 13, 36, 13, p.cream);
  rect(g, cx + 17, base - 13, 1, 13, p.tan);
  rect(g, cx - 19, base - 14, 38, 1, p.cloudShade);                               // cornice
  for (let k = 0; k < 3; k++) rect(g, cx - 15 - k, base - 17 + k, 30 + 2 * k, 1, p.gray);
  for (let x = cx - 15; x < cx + 14; x += 5) {
    rect(g, x, base - 11, 2, 4, lit ? PALETTE.glow : p.brownDark);
    rect(g, x, base - 5, 2, 5, p.brownDark);
  }
  rect(g, cx - 4, base - 27, 8, 14, p.cream);                                     // tower
  rect(g, cx + 3, base - 27, 1, 14, p.tan);
  disc(g, cx, base - 22, 2, p.white);
  px(g, cx, base - 22, p.ink); px(g, cx, base - 23, p.ink); px(g, cx + 1, base - 22, p.ink);
  rect(g, cx - 5, base - 28, 10, 1, p.cloudShade);
  for (let k = 0; k < 4; k++) rect(g, cx - 1 - k, base - 32 + k, 2 + 2 * k, 1, p.gray);
  rect(g, cx, base - 35, 1, 3, p.grayLight); rect(g, cx + 1, base - 35, 3, 2, p.blue);   // flag
}

// Glenferrie: Swinburne University right beside the station - the old red
// brick technical college, sixties concrete, a glass tower with its red sign
function paintCampus(g, p, lit, cx, base) {
  const rng = mulberry32(88);
  let t = bldg(g, p, lit, rng, cx - 62, base, 41, 33, p.skyMid, p.skyDeep, p.skyLight, 4);
  rect(g, cx - 62, t + 6, 41, 9, p.red);
  drawText(g, 'SWINBURNE', cx - 59, t + 8, signInk(p, lit));
  bldg(g, p, lit, rng, cx - 19, base, 24, 24, p.cloudShade, p.grayLight, p.slate, 4);
  t = bldg(g, p, lit, rng, cx + 7, base, 34, 17, p.rust, p.brown, p.navy, 5);
  rect(g, cx + 6, t - 1, 36, 1, p.cream);
  for (let k = 0; k < 4; k++) rect(g, cx + 23 - k, t - 5 + k, 2 + 2 * k, 1, p.cream);      // pediment
  rect(g, cx + 44, base - 14, 18, 14, p.cream);
  for (let xx = cx + 46; xx < cx + 60; xx += 4) rect(g, xx, base - 11, 2, 8, lit ? PALETTE.amber : p.indigo);
}

// Camberwell: the Burke Road shops, and the Sunday market in the car park
function paintMarket(g, p, lit, cx, base) {
  const rng = mulberry32(31), tops = ['red', 'white', 'blue', 'glow', 'green', 'orange'];
  shopRow(g, p, lit, rng, cx - 60, base, 5);
  for (let i = 0; i < 6; i++) {
    const x = cx - 4 + i * 10;
    rect(g, x + 3, base - 8, 1, 8, p.grayDark);
    for (let k = 0; k < 3; k++) rect(g, x + 2 - k, base - 11 + k, 3 + 2 * k, 1, k === 1 ? p.white : p[tops[i]]);   // umbrella
    rect(g, x, base - 3, 7, 1, p.tan);                                             // trestle of bric-a-brac
    px(g, x + 1, base - 4, p[pick(rng, ['red', 'glow', 'skyMid', 'rose'])]);
    px(g, x + 5, base - 4, p[pick(rng, ['white', 'purple', 'green', 'orange'])]);
    rect(g, x + 8, base - 4, 1, 3, p[pick(rng, SHIRTS)]);                          // someone browsing
    px(g, x + 8, base - 5, p[pick(rng, SKINS)]);
  }
  rect(g, cx - 8, base - 26, 27, 7, p.ink);
  drawText(g, 'MARKET', cx - 6, base - 25, signInk(p, lit));
  rect(g, cx - 6, base - 19, 1, 8, p.grayDark); rect(g, cx + 16, base - 19, 1, 8, p.grayDark);
}

// Box Hill: Box Hill Central over the station, lanterns along the restaurant strip
function paintBoxHill(g, p, lit, cx, base) {
  const rng = mulberry32(57);
  rect(g, cx - 56, base - 19, 62, 19, p.cloudShade);
  rect(g, cx + 5, base - 19, 1, 19, p.grayLight);
  rect(g, cx - 56, base - 19, 62, 1, p.white);
  rect(g, cx - 52, base - 13, 20, 13, p.skyMid);                                   // glass entrance
  for (let x = cx - 52; x < cx - 32; x += 4) rect(g, x, base - 13, 1, 13, p.skyDeep);
  rect(g, cx - 20, base - 26, 29, 7, p.red);                                       // the sign up on the roof
  drawText(g, 'CENTRAL', cx - 19, base - 25, signInk(p, lit));
  for (let x = cx - 26; x < cx + 2; x += 6) for (const y of [15, 7]) rect(g, x, base - y, 4, 4, lit ? PALETTE.glow : p.slate);
  shopRow(g, p, lit, rng, cx + 8, base, 5);
  for (let x = cx + 9; x < cx + 57; x += 3) { g.fillStyle = lit ? LAMP_RED : p.red; g.fillRect(x, base - 9 + ((x >> 1) & 1), 1, 1); }
}

// Ringwood: the brick clock tower on the highway, and Eastland
function paintRingwood(g, p, lit, cx, base) {
  rect(g, cx - 40, base - 16, 100, 16, p.cloudShade);                              // the shopping centre
  rect(g, cx - 40, base - 16, 100, 1, p.white);
  for (let x = cx - 38; x < cx + 58; x += 7) { rect(g, x, base - 6, 5, 1, p.grayLight); rect(g, x, base - 3, 5, 1, p.grayLight); }   // car park decks
  rect(g, cx - 14, base - 18, 22, 18, p.skyMid);                                   // glass atrium
  for (let x = cx - 14; x < cx + 8; x += 4) rect(g, x, base - 18, 1, 18, p.skyDeep);
  rect(g, cx - 14, base - 18, 22, 1, p.skyLight);
  rect(g, cx - 27, base - 26, 33, 7, p.blue);                                      // the sign up on the roof
  drawText(g, 'EASTLAND', cx - 26, base - 25, signInk(p, lit));
  rect(g, cx - 24, base - 19, 1, 3, p.grayDark); rect(g, cx + 3, base - 19, 1, 1, p.grayDark);
  const tx = cx + 13;                                                              // the clock tower, out on the highway
  rect(g, tx, base - 17, 5, 17, p.rust);
  rect(g, tx + 4, base - 17, 1, 17, p.brown);
  rect(g, tx - 1, base - 24, 7, 7, p.cream);
  disc(g, tx + 2, base - 21, 2, p.white);
  px(g, tx + 2, base - 21, p.ink); px(g, tx + 2, base - 22, p.ink); px(g, tx + 3, base - 21, p.ink);
  for (let k = 0; k < 3; k++) rect(g, tx + 2 - k, base - 27 + k, 1 + 2 * k, 1, p.gray);
}

// Upper Ferntree Gully: the 1000 Steps climbing the forested spur, walkers on them
const STEPS_PATH = (() => {
  const way = [[-8, -1], [22, -8], [-6, -15], [12, -22], [2, -27]], pts = [];
  for (let i = 0; i < way.length - 1; i++) {
    const [x0, y0] = way[i], [x1, y1] = way[i + 1], n = Math.abs(x1 - x0);
    for (let s = 0; s < n; s++) pts.push([x0 + Math.sign(x1 - x0) * s, Math.round(y0 + (y1 - y0) * s / n)]);
  }
  return pts;
})();
function paintSteps(g, p, lit, cx, base) {
  const rng = mulberry32(1000), W0 = 112, H0 = 30;
  hump(g, cx - 56, base + 1, W0, H0, p.greenDark, p.green);
  for (let n = 0; n < 170; n++) {                                                  // the forest on it
    const i = randInt(rng, 3, W0 - 4), t = humpTop(i, W0, H0, base + 1), y = t + 1 + Math.floor(rng() * Math.max(1, base - t - 1));
    if (y < base) disc(g, cx - 56 + i, y, 1, n % 3 ? p.green : p.greenDeep);
  }
  for (const [dx, dy] of STEPS_PATH) { px(g, cx + dx, base + dy, (dx + dy) & 1 ? p.cream : p.tan); px(g, cx + dx, base + dy + 1, p.greenDeep); }
  rect(g, cx - 54, base - 26, 43, 7, p.ink);                                       // trailhead sign
  drawText(g, '1000 STEPS', cx - 52, base - 25, signInk(p, lit));
  rect(g, cx - 52, base - 19, 1, 19, p.brown); rect(g, cx - 14, base - 19, 1, 14, p.brown);
}

// A suburban footy ground: four posts at each end, a clubroom, two kids
// kicking end to end
function footyOval(ctx, cx, G, rng) {
  ctx.stat(cx - 46, cx + 46, G - 1, (g, p, lit, ox) => {
    const x = cx + ox;
    for (let i = -44; i <= 44; i += 2) px(g, x + i, G, p.white);                  // boundary fence
    rect(g, x - 13, G - 8, 26, 8, p.cream);                                       // clubrooms and scoreboard
    rect(g, x - 14, G - 10, 28, 2, p.haze);
    for (let i = -10; i < 10; i += 5) rect(g, x + i, G - 6, 3, 3, lit ? PALETTE.glow : p.navy);
    rect(g, x + 18, G - 11, 9, 6, p.ink); px(g, x + 20, G - 9, p.white); px(g, x + 24, G - 9, p.white); rect(g, x + 22, G - 5, 1, 5, p.grayDark);
    for (const e of [-38, 38]) for (const [dx, h] of [[-5, 7], [-2, 12], [2, 12], [5, 7]]) rect(g, x + e + dx, G + 1 - h, 1, h, p.white);
  });
  ctx.live(footyEnt(cx, G + 1, rng));
}

function suburbMidGround(c, y, lx) {
  if (y < 34) return null;
  if (y < 37) return y === 34 ? (bayer(lx, y) < 9 ? 'grassLight' : 'grass') : hash2(lx >> 1, y) < 0.2 ? 'green' : 'grass';   // nature strip
  if (y < 43) return y === 37 || y === 42 ? 'cloudShade' : y === 40 && (lx >> 2) % 3 === 0 ? 'cream' : hash2(lx, y) < 0.08 ? 'grayDark' : 'gray';
  return hash2(lx >> 2, y >> 1) < 0.3 ? 'green' : 'grass';
}

// Near ground: the back fences along the line - palings, steel, brick, a
// hedge, a stretch with tags on it - and the backyards behind them
const FENCES = ['paling', 'paling', 'paling', 'tags', 'steel', 'brick', 'hedge'];
const LAWNS = ['grass', 'grass', 'grassLight', 'green', 'paddy'];
const TAG_COLS = ['rose', 'skyMid', 'glow', 'white', 'orange', 'purple', 'grassLight', 'red'];
const YARD_THINGS = ['hoist', 'hoist', 'hoist', 'shed', 'tramp', 'lemon', 'pool', 'dog', 'dog', 'tank', 'veg', 'gum', 'cubby', 'barbie'];
const YARD_W = { hoist: 8, shed: 8, tramp: 8, lemon: 5, pool: 11, dog: 16, tank: 5, veg: 8, gum: 6, cubby: 6, barbie: 7 };
const WASH = ['white', 'white', 'skyLight', 'rose', 'red', 'navy', 'cream', 'glow'];

function suburbFg(ctx) {
  const { rng, L } = ctx;
  const D = { yards: plots(rng, ctx.from, ctx.to, 48, 100, FENCES), lawns: [], tags: [] };
  const xs = D.yards.xs;
  for (let i = 0; i < xs.length; i++) { D.lawns.push(pick(rng, LAWNS)); D.tags.push(randInt(rng, 1, 9999)); }
  const clear = x => ctx.ok(x) && !CROSSINGS.some(c => Math.abs(uOf(L, x) - c.u) < 50);
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i] + 3, b = xs[i + 1] - 3, used = [];
    for (let n = randInt(rng, 2, 4); n > 0; n--) {
      const kind = pick(rng, YARD_THINGS), hw = YARD_W[kind], x = randInt(rng, a + hw, Math.max(a + hw, b - hw)), y = randInt(rng, 25, 32);
      if (b - a < 2 * hw || used.some(([u0, u1]) => x + hw > u0 && x - hw < u1) || !clear(x)) continue;
      used.push([x - hw, x + hw]);
      yardThing(ctx, kind, x, y, rng);
    }
  }
  return D;
}

function yardThing(ctx, kind, x, y, rng) {
  const seed = randInt(rng, 1, 1e6), alt = rng() < 0.5;
  switch (kind) {
    case 'hoist': ctx.live(hoistEnt(x, y, rng)); break;
    case 'tramp': ctx.live(trampEnt(x, y, rng)); break;
    case 'dog':   ctx.live(dogEnt(x, 22, rng)); break;
    case 'shed':                                                                  // tin shed
      ctx.stat(x - 7, x + 7, y, (g, p, lit, ox) => {
        rect(g, x - 6 + ox, y - 8, 13, 8, alt ? p.haze : p.grayLight);
        for (let i = -5; i < 7; i += 2) rect(g, x + i + ox, y - 8, 1, 8, alt ? p.greenDark : p.gray);
        rect(g, x - 7 + ox, y - 9, 15, 1, p.grayDark);
        rect(g, x - 1 + ox, y - 6, 4, 6, p.grayDark);
      });
      break;
    case 'lemon':
      ctx.stat(x - 6, x + 5, y, (g, p, lit, ox) => {
        roundTree(g, x + ox, y, 3, 2, p, seed);
        for (const [dx, dy] of [[-2, -6], [1, -4], [-1, -3], [2, -6]]) px(g, x + dx + ox, y + dy, p.glow);
      });
      break;
    case 'pool': {
      const w = randInt(rng, 13, 19), dashes = [];
      ctx.stat(x - 10, x + 12, y - 6, (g, p, lit, ox) => {
        rect(g, x - 10 + ox, y - 6, w + 2, 6, p.cream);
        rect(g, x - 9 + ox, y - 5, w, 4, p.skyMid);
        rect(g, x - 9 + ox, y - 5, w, 1, p.skyLight);
      });
      for (let k = 0; k < 4; k++) dashes.push([x - 8 + randInt(rng, 0, w - 4), y - randInt(rng, 2, 4), 2, rng() * 6, 1.5 + rng() * 2]);
      ctx.live(shimmerEnt(dashes, y));
      break;
    }
    case 'tank':                                                                  // rainwater tank
      ctx.stat(x - 4, x + 4, y, (g, p, lit, ox) => {
        rect(g, x - 3 + ox, y - 8, 7, 8, alt ? p.haze : p.cloudShade);
        for (let k = 1; k < 8; k += 2) rect(g, x - 3 + ox, y - k, 7, 1, alt ? p.greenDark : p.grayLight);
        rect(g, x - 2 + ox, y - 9, 5, 1, p.gray);
      });
      break;
    case 'veg':
      ctx.stat(x - 7, x + 7, y - 4, (g, p, lit, ox) => {
        for (const r of [0, 3]) {
          rect(g, x - 7 + ox, y - 1 - r, 14, 2, p.brown);
          for (let i = -6; i < 7; i += 2) px(g, x + i + ox, y - 2 - r, (i + r) % 3 ? p.grassLight : p.red);
        }
      });
      break;
    case 'gum': {
      const h = randInt(rng, 14, Math.min(26, y - 1));
      ctx.stat(x - 14, x + 14, y, (g, p, lit, ox) => gumTree(g, x + ox, y, h, p, seed));
      break;
    }
    case 'cubby':                                                                 // cubby house on stilts
      ctx.stat(x - 5, x + 6, y, (g, p, lit, ox) => {
        rect(g, x - 3 + ox, y - 3, 1, 3, p.brown); rect(g, x + 3 + ox, y - 3, 1, 3, p.brown);
        rect(g, x - 4 + ox, y - 8, 9, 5, alt ? p.skyLight : p.cream);
        rect(g, x - 5 + ox, y - 10, 11, 2, p.red);
        rect(g, x - 1 + ox, y - 6, 2, 3, p.brownDark);
      });
      break;
    case 'barbie':                                                                // barbecue and a table
      ctx.stat(x - 6, x + 7, y, (g, p, lit, ox) => {
        rect(g, x - 6 + ox, y - 4, 5, 2, p.grayDark); rect(g, x - 5 + ox, y - 2, 1, 2, p.gray); rect(g, x - 3 + ox, y - 2, 1, 2, p.gray);
        rect(g, x + 1 + ox, y - 3, 6, 1, p.tan); rect(g, x + 2 + ox, y - 2, 1, 2, p.brown); rect(g, x + 5 + ox, y - 2, 1, 2, p.brown);
      });
      break;
  }
}

function suburbFgColumn(lx, D) {
  const i = plotAt(D.yards, lx);
  return { edge: D.yards.xs[i] === lx, fence: D.yards.cs[i], lawn: D.lawns[i], tag: D.tags[i] };
}

function suburbFgGround(c, y, lx) {
  if (y < 12) return null;
  if (y < 19) return fencePixel(c, y - 12, lx);
  if (y === 19) return 'greenDark';                                               // the fence's shadow
  if (c.edge) return y & 1 ? 'tan' : 'brown';                                     // side fence between two yards
  if (c.lawn === 'paddy') return hash2(lx >> 1, y) < 0.3 ? 'grassLight' : hash2(lx, y) < 0.08 ? 'tan' : 'paddy';   // a thirsty lawn
  return hash2(lx >> 2, y >> 1) < 0.22 ? (c.lawn === 'grass' ? 'grassLight' : 'grass') : hash2(lx, y) < 0.05 ? 'greenDark' : c.lawn;
}

// One pixel of the back fence, r rows below its top
function fencePixel(c, r, lx) {
  switch (c.fence) {
    case 'steel': return r === 0 ? 'cloudShade' : lx % 4 === 0 ? 'gray' : 'grayLight';
    case 'brick': return r === 0 ? 'cloudShade' : (r & 1) === 0 || (lx + (r >> 1) * 2) % 4 === 0 ? 'brown' : 'rust';
    case 'hedge': return r === 0 ? (bayer(lx, r) < 9 ? 'grass' : null) : hash2(lx, r) < 0.25 ? 'greenDark' : hash2(lx, r + 9) < 0.15 ? 'grass' : 'green';
    default: {
      if (r === 0) return lx % 3 === 1 ? null : 'cream';                          // pointed tops
      if (c.fence === 'tags' && r > 1 && r < 6) {
        const k = hash2((lx + c.tag) >> 2, (r + c.tag) >> 1);
        if (k < 0.4) return TAG_COLS[Math.floor(k / 0.4 * TAG_COLS.length)];
      }
      return lx % 3 === 0 ? 'brown' : hash2(lx, r) < 0.12 ? 'brown' : 'tan';
    }
  }
}
