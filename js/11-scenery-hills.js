// Melbourne Pixel Train - Foothills paddocks and roos, then the forest: mountain ash, 1000 Steps, Puffing Billy
'use strict';

// --- 4. the foothills: Heathmont, Bayswater, Boronia, Ferntree Gully ------------
// The Dandenongs fill the sky ahead, the television masts on Mount Dandenong
// winking red after dark
function rangeFar(ctx) {
  const { rng, L } = ctx;
  treeLine(ctx, 52, 5);
  for (let x = ctx.from - 100; x < ctx.to; x += randInt(rng, 70, 130)) {
    const w = randInt(rng, 150, 260), h = randInt(rng, 16, 28), tx = x;
    if (ctx.ok(x + (w >> 1))) ctx.stat(tx, tx + w, -2, (g, p, lit, ox) => hump(g, tx + ox, 53, w, h, p.haze, null, p.skyMid));
  }
  for (let x = ctx.from - 60; x < ctx.to; x += randInt(rng, 50, 100)) {           // nearer, wooded rises
    const w = randInt(rng, 80, 150), h = randInt(rng, 5, 11), tx = x;
    if (ctx.ok(x + (w >> 1))) ctx.stat(tx, tx + w, -1, (g, p, lit, ox) => hump(g, tx + ox, 53, w, h, p.greenDark, p.green));
  }
  const tv = lxOf(L, stn('BOR').dist + 260), W0 = 300, H0 = 38, top = 53 - H0;   // Mount Dandenong, behind Boronia
  ctx.stat(tv - W0 / 2, tv + W0 / 2, -3, (g, p, lit, ox) => {
    hump(g, tv - W0 / 2 + ox, 53, W0, H0, p.haze, null, p.skyMid);
    for (const [dx, h] of [[-9, 10], [0, 14], [8, 9]]) {
      rect(g, tv + dx + ox, top - h + 1, 1, h, p.cloudShade);
      for (let k = 2; k < h; k += 4) px(g, tv + dx + ox, top - k, p.red);
    }
  });
  for (const [dx, h] of [[-9, 10], [0, 14], [8, 9]]) ctx.live(beaconEnt(tv + dx, top - h + 1));
}

// Mid layer: rolling paddocks behind post-and-wire fences, roos on the
// slopes, gums and golden wattle, a farmhouse with its tank
const stepsAt = L => lxOf(L, stn('UFG').dist - 168);    // where the 1000 Steps stand (the forest section draws them)
function paddockMid(ctx) {
  const { rng, L } = ctx, steps = stepsAt(L);
  for (let x = ctx.from - 100; x < ctx.to; x += randInt(rng, 90, 170)) {
    const H = { x0: x, w: randInt(rng, 150, 260), h: randInt(rng, 7, 17), dry: rng() < 0.5 };
    const roos = randInt(rng, 0, 3);
    if (!ctx.ok(x + (H.w >> 1)) || (H.x0 + H.w > steps - 60 && H.x0 < steps + 60)) continue;
    ctx.stat(H.x0, H.x0 + H.w, -H.h, (g, p, lit, ox) => paddockHill(g, p, H, ox));
    for (let n = 0; n < roos; n++) ctx.live(farRooEnt(H, randInt(rng, 24, H.w - 24), rng));
  }
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 14, 44)) {
    const tx = x, kind = rng(), h = randInt(rng, 16, 30), seed = randInt(rng, 1, 1e6), rr = randInt(rng, 3, 5), th = randInt(rng, 2, 3);
    const y = randInt(rng, 35, 37), w = randInt(rng, 13, 18), o = houseDesign(rng, w, true);
    if (!ctx.ok(tx) || Math.abs(tx - steps) < 74) continue;
    if (kind < 0.55) ctx.stat(tx - 14, tx + 14, y, (g, p, lit, ox) => gumTree(g, tx + ox, y, h, p, seed));
    else if (kind < 0.76) ctx.stat(tx - rr - 2, tx + rr + 1, y, (g, p, lit, ox) => roundTree(g, tx + ox, y, rr, th, p, seed, WATTLE));
    else if (kind < 0.86) {
      const e = spriteEnt(tx, 36, w + 10, 16, 1, 16, 'farm' + tx, (g, p, lit) => {
        ausHouse(g, 1, 16, w, p, o, lit && o.lightOn);
        rect(g, w + 4, 9, 5, 7, p.haze);                                         // the water tank
        for (let k = 10; k < 16; k += 2) rect(g, w + 4, k, 5, 1, p.greenDark);
      });
      if (o.lightOn) e.light = [tx + o.win + 1, 31];
      ctx.live(e);
    }
  }
}

function paddockHill(g, p, H, ox) {
  const base = 36, x = H.x0 + ox, top = i => humpTop(i, H.w, H.h, base);
  const a = H.dry ? p.paddy : p.grassLight, b = H.dry ? p.grassLight : p.grass;
  for (let i = 0; i < H.w; i++) {
    const t = top(i);
    if (t >= base) continue;
    rect(g, x + i, t, 1, base - t + 2, a);
    for (let y = t; y < base; y++) if (y === t || bayer(x + i, y) < 2 + (y - t)) px(g, x + i, y, b);
  }
  for (let i = 5; i < H.w - 5; i++) {                                             // fence over the rise
    const t = top(i);
    if (t >= base - 1) continue;
    if (i % 7 === 0) rect(g, x + i, t - 3, 1, 4, p.brown);
    else if (i & 1) px(g, x + i, t - 2, p.grayLight);
  }
}

// Near ground: seeding grass rippling in the wind, a dam with ducks, a mob
// of eastern greys
function paddockFg(ctx) {
  const { rng, L } = ctx;
  const D = { plots: plots(rng, ctx.from, ctx.to, 60, 170, ['paddy', 'young', 'paddy', 'green', 'young']), ponds: [] };
  const clear = (x, pad = 14) => ctx.ok(x) && !D.ponds.some(pd => Math.abs(x - pd.cx) < pd.rx + pad) && !CROSSINGS.some(c => Math.abs(uOf(L, x) - c.u) < 50);
  for (let x = ctx.from + randInt(rng, 60, 200); x < ctx.to; x += randInt(rng, 240, 460)) {   // farm dams
    const pd = { cx: x, rx: randInt(rng, 14, 24), ry: randInt(rng, 4, 5), cy: randInt(rng, 26, 28) }, dashes = [];
    if (!clear(x, 30)) continue;
    D.ponds.push(pd);
    for (let i = 0; i < pd.rx; i++) {
      const dy = randInt(rng, -pd.ry + 1, pd.ry - 1), w = randInt(rng, 2, 4);
      const half = Math.floor(pd.rx * Math.sqrt(1 - (dy / pd.ry) ** 2)) - w;
      if (half > 1) dashes.push([pd.cx + randInt(rng, -half, half - 1), pd.cy + dy, w, rng() * 6, 1.2 + rng() * 2]);
    }
    ctx.live(shimmerEnt(dashes, pd.cy - pd.ry));
    for (let n = randInt(rng, 1, 3); n > 0; n--) ctx.live(waterfowlEnt(pd, rng, 'duck'));
  }
  for (let x = ctx.from + randInt(rng, 30, 120); x < ctx.to; x += randInt(rng, 130, 280)) {   // roos
    const cols = pick(rng, ROO_COLS);
    for (let n = randInt(rng, 1, 3), k = 0; k < n; k++) {
      const rx = x + k * randInt(rng, 13, 20), y = randInt(rng, 23, 32);
      if (clear(rx)) ctx.live(rooEnt(rx, y, rng, cols));
    }
  }
  for (let x = ctx.from + randInt(rng, 20, 90); x < ctx.to; x += randInt(rng, 60, 150)) {     // a stump, a young wattle, a fallen log
    const tx = x, y = randInt(rng, 22, 33), kind = rng(), seed = randInt(rng, 1, 1e6);
    if (!clear(tx)) continue;
    if (kind < 0.35) ctx.stat(tx - 6, tx + 6, y, (g, p, lit, ox) => { rect(g, tx - 5 + ox, y - 2, 11, 2, p.brown); rect(g, tx - 5 + ox, y - 2, 11, 1, p.tan); px(g, tx + 5 + ox, y - 1, p.cream); });
    else if (kind < 0.65) ctx.stat(tx - 6, tx + 5, y, (g, p, lit, ox) => roundTree(g, tx + ox, y, 3, 2, p, seed, WATTLE));
    else ctx.stat(tx - 2, tx + 3, y, (g, p, lit, ox) => { rect(g, tx - 1 + ox, y - 3, 3, 3, p.brown); rect(g, tx - 1 + ox, y - 3, 3, 1, p.tan); });
  }
  for (let x = ctx.from + randInt(rng, 0, 8); x < ctx.to; x += randInt(rng, 9, 22)) {         // the tallest grass, nearest the line
    const y = randInt(rng, 17, 20), h = randInt(rng, 8, 11), v = randInt(rng, 0, 2);
    if (clear(x, 4)) ctx.live(thinOut(swayer(L, x, y, 'grass', h, v)));
  }
  addTufts(ctx, 10, 13, 16);
  return D;
}

// Every other plant is skipped on low quality
let thinCount = 0;
const thinOut = e => { if (++thinCount & 1) e.lod = true; return e; };

function paddockFgColumn(lx, D) {
  const i = plotAt(D.plots, lx);
  let pond = null;
  for (const pd of D.ponds) if (Math.abs(lx - pd.cx) <= pd.rx + 2) { pond = pd; break; }
  return { crop: D.plots.cs[i], bund: D.plots.xs[i] === lx, pond };
}

function paddockFgGround(c, y, lx) {
  if (y < 8) return null;
  if (y < 12) return lx % 14 === 0 ? 'brown' : (y === 9 || y === 11) && bayer(lx, y) < 9 ? 'grayLight' : null;   // post-and-wire fence
  if (y === 12) return lx % 14 === 0 ? 'brown' : bayer(lx, y) < 10 ? 'grass' : 'green';
  if (y < 16) return hash2(lx >> 1, y) < 0.18 ? 'greenDark' : hash2(lx, y) < 0.1 ? 'grass' : 'green';
  if (y === 16) return bayer(lx, y) < 8 ? 'greenDark' : 'green';
  const pk = c.pond && pondPixel(c.pond, lx, y);
  if (pk) return pk;
  if (c.bund) return 'green';
  const C = CROPS[c.crop];
  return y % 2 === 1 && bayer(lx, y) < 7 ? C[1] : C[0];
}

// Under a wind crest the seed heads catch the light and the rows shift
function paddockFgHl(c, y, lx) {
  if (y < 18 || c.bund || (c.pond && pondPixel(c.pond, lx, y))) return null;
  const C = CROPS[c.crop];
  if (y % 2) return bayer(lx + 2, y) < 7 ? C[1] : bayer(lx, y) < 7 ? C[0] : null;
  return bayer(lx, y) < 5 ? C[2] : null;
}

// --- 5. the Dandenongs: Upper Ferntree Gully, Upwey, Tecoma, Belgrave -----------
function forestFar(ctx) {
  const { rng } = ctx;
  for (let x = ctx.from - 120; x < ctx.to; x += randInt(rng, 60, 120)) {          // the range, close now
    const w = randInt(rng, 140, 260), h = randInt(rng, 32, 46), tx = x;
    if (ctx.ok(x + (w >> 1))) ctx.stat(tx, tx + w, 0, (g, p, lit, ox) => hump(g, tx + ox, 53, w, h, p.haze, null, p.skyMid));
  }
  for (let x = ctx.from - 80; x < ctx.to; x += randInt(rng, 50, 100)) {           // forested spurs, ragged with tree tops
    const w = randInt(rng, 90, 170), h = randInt(rng, 16, 30), tx = x, seed = randInt(rng, 1, 1e6);
    if (!ctx.ok(x + (w >> 1))) continue;
    ctx.stat(tx, tx + w, 1, (g, p, lit, ox) => {
      const r2 = mulberry32(seed);
      hump(g, tx + ox, 53, w, h, p.greenDark, p.green);
      for (let i = 2; i < w - 2; i += randInt(r2, 2, 4)) {
        const t = humpTop(i, w, h, 53), th = randInt(r2, 2, 4);
        if (t < 52) { rect(g, tx + i + ox, t - th, 1, th, p.greenDark); px(g, tx + i - 1 + ox, t - th + 1, p.greenDark); px(g, tx + i + 1 + ox, t - th + 1, p.green); }
      }
    });
  }
  fogBands(ctx, 22, 46, 36, 8);
}

// Mid layer: mountain ash, straight and enormously tall, tree ferns under
// them, a creek down a gully; and Puffing Billy in steam at Belgrave
function forestMid(ctx) {
  const { rng, L } = ctx, billy = lxOf(L, STATIONS[LAST_STATION].dist) + 8;
  const steps = stepsAt(L);
  const nearBilly = x => (x > billy - 12 && x < billy + 86) || Math.abs(x - steps) < 60;
  ctx.stat(steps - 58, steps + 58, 90, (g, p, lit, ox) => paintSteps(g, p, lit, steps + ox, 36));    // in front of everything else here
  ctx.live(hikersEnt(steps, 36, rng));
  for (let x = ctx.from - 80; x < ctx.to; x += randInt(rng, 70, 140)) {
    const w = randInt(rng, 110, 200), h = randInt(rng, 7, 14), x0 = x, seed = randInt(rng, 1, 1e6);
    const stream = rng() < 0.5 ? streamPath(rng, w, h) : null;
    if (!ctx.ok(x + (w >> 1)) || (x0 + w > billy - 12 && x0 < billy + 86) || (x0 + w > steps - 60 && x0 < steps + 60)) continue;
    ctx.stat(x0, x0 + w, -h, (g, p, lit, ox) => forestHill(g, p, x0 + ox, w, h, seed, stream));
    if (stream) ctx.live(streamFlowEnt(stream.map(([i, y]) => [x0 + i, y]), rng));
  }
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 8, 20)) {
    const h = randInt(rng, 20, 31) * 2, k = randInt(rng, 0, 4), y = randInt(rng, 35, 38);
    if (ctx.ok(x) && !nearBilly(x)) ctx.live(ashEnt(x, y, h, k));
  }
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 10, 26)) {
    const y = randInt(rng, 36, 39), h = randInt(rng, 3, 8);
    if (ctx.ok(x) && !nearBilly(x)) ctx.live(swayer(L, x, y, 'treefern', h));
  }
  ctx.stat(billy - 4, billy + 80, 36, (g, p, lit, ox) => paintBilly(g, p, lit, billy + ox, 36));
  ctx.live(billySteamEnt(billy + 69, 23));
  fogBands({ ...ctx, ok: x => ctx.ok(x) && Math.abs(x - steps) > 140 && Math.abs(x - billy - 36) > 140 }, 6, 28, 46, 7);   // mist keeps off the signs
}

// One mountain ash: h px of pale trunk in its stocking of rough bark, a
// small crown right at the top. Painted once per height and variant.
function ashEnt(lx, y, h, k) {
  return spriteEnt(lx, y, 21, h + 3, 10, h + 2, 'ash' + h + '|' + k, (g, p) => {
    const rng = mulberry32(h * 7 + k), base = h + 2, x = 10, lean = (k - 2) * 0.03;
    for (let i = 0; i < h; i++) {
      const xx = x + Math.round(i * lean), bark = i < 7 + k;
      px(g, xx, base - i, bark ? p.brown : i % 7 === 3 ? p.grayLight : p.cream);
      if (i < h * 0.7) px(g, xx + 1, base - i, bark ? p.brownDark : i % 5 === k ? p.tan : p.grayLight);
    }
    const cx = x + Math.round(h * lean);
    for (let n = 5 + k; n > 0; n--) {
      const ax = cx + randInt(rng, -7, 6), ay = randInt(rng, 2, Math.round(h * 0.26)), w = randInt(rng, 2, 4);
      rect(g, ax - w, ay, 2 * w, 2, p.greenDark);
      rect(g, ax - w + 1, ay - 1, 2 * w - 2, 1, p.green);
      px(g, ax - w + 1 + randInt(rng, 0, 2 * w - 3), ay - 1, p.haze);
    }
  });
}

// Puffing Billy: a little green tank engine and two open-sided red
// carriages, passengers with their legs over the sills
function paintBilly(g, p, lit, x, base) {
  rect(g, x, base - 27, 33, 15, p.red);                                           // the sign over its platform
  rect(g, x + 1, base - 26, 31, 13, p.ink);
  drawText(g, 'PUFFING', x + 3, base - 25, lit ? PALETTE.glow : p.cream);
  drawText(g, 'BILLY', x + 7, base - 19, lit ? PALETTE.glow : p.cream);
  rect(g, x + 3, base - 12, 1, 2, p.grayDark); rect(g, x + 29, base - 12, 1, 2, p.grayDark);
  rect(g, x - 4, base, 84, 1, p.grayDark);                                        // its narrow-gauge track
  for (let i = -3; i < 80; i += 4) px(g, x + i, base + 1, p.brown);
  const rng = mulberry32(12);
  for (const cx of [x, x + 25]) {                                                 // carriages
    rect(g, cx, base - 10, 23, 1, p.cream);
    rect(g, cx + 1, base - 9, 21, 1, p.grayLight);
    for (let i = 0; i < 23; i += 4) rect(g, cx + i, base - 8, 1, 4, p.red);
    rect(g, cx, base - 4, 23, 3, p.red);
    rect(g, cx, base - 4, 23, 1, p.glow);
    for (let i = 2; i < 22; i += 4) {
      const skin = pick(rng, SKINS), top = pick(rng, SHIRTS);
      px(g, cx + i, base - 7, p.brownDark); px(g, cx + i, base - 6, p[skin]); px(g, cx + i, base - 5, p[top]);
      px(g, cx + i, base - 3, p[skin]); px(g, cx + i + 1, base - 2, p[skin]);    // legs dangling
    }
    for (const wx of [3, 18]) { px(g, cx + wx, base - 1, p.ink); px(g, cx + wx + 1, base - 1, p.ink); }
  }
  const lx = x + 51;                                                              // the engine
  rect(g, lx - 1, base - 12, 8, 1, p.ink);
  rect(g, lx, base - 11, 6, 8, p.green);
  rect(g, lx + 2, base - 10, 3, 3, lit ? PALETTE.amber : p.ink);
  rect(g, lx + 6, base - 8, 12, 5, p.greenDark);                                  // boiler and side tank
  rect(g, lx + 7, base - 7, 7, 4, p.green);
  rect(g, lx + 7, base - 7, 7, 1, p.glow);
  rect(g, lx + 11, base - 10, 2, 2, p.glow);                                      // brass dome
  rect(g, lx + 18, base - 8, 3, 5, p.ink);                                        // smokebox, chimney
  rect(g, lx + 18, base - 12, 2, 4, p.ink);
  rect(g, lx + 17, base - 13, 4, 1, p.ink);
  px(g, lx + 21, base - 9, lit ? PALETTE.glow : p.cream);                         // headlamp
  rect(g, lx, base - 3, 22, 1, p.red);                                            // frames, cowcatcher
  px(g, lx + 22, base - 2, p.red); px(g, lx + 23, base - 1, p.red);
  for (const wx of [3, 8, 12, 16]) { rect(g, lx + wx, base - 2, 2, 2, p.ink); px(g, lx + wx, base - 2, p.red); }
}

function billySteamEnt(lx, y) {
  const e = { x0: lx - 6, x1: lx + 26, z: 60, draw(g, v, ox, oy, t) {
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.33 + i / 6) % 1, r = 1 + Math.floor(k * 5), dens = 16 - Math.min(3, Math.floor(k * 4)) * 4;
      g.drawImage(puffSprite(v, r, dens, k > 0.5 ? 3 : 2),
                  lx + ox + Math.round(k * k * 12 + Math.sin(i * 2.4 + k * 5) * 1.5) - r, y + oy - Math.round(k * 20) - r);
    }
  } };
  e.light = [lx + 3, y + 4];
  return e;
}

// Near ground: leaf litter, ferns and tree ferns, mossy logs, a creek out
// of a culvert; a lyrebird scratching about, a wallaby; and now and then
// the trunk of a great tree right beside the line
function forestFg(ctx) {
  const { rng, L } = ctx, streams = [];
  for (let x = ctx.from + randInt(rng, 60, 200); x < ctx.to; x += randInt(rng, 260, 520)) {
    const s = { cx: x, w: randInt(rng, 7, 12) }, pts = [];
    if (!ctx.ok(x)) continue;
    streams.push(s);
    for (let y = 14; y < 34; y++) pts.push([Math.round(s.cx + (y - 12) * 0.8) + randInt(rng, -2, 2), y]);
    ctx.live(streamFlowEnt(pts, rng));
  }
  const dryOk = x => ctx.ok(x) && !streams.some(s => Math.abs(x - s.cx - 8) < s.w + 14) && !CROSSINGS.some(c => Math.abs(uOf(L, x) - c.u) < 50);
  const dry = { ...ctx, ok: dryOk };
  for (let x = ctx.from; x < ctx.to; x += randInt(rng, 9, 24)) {
    const y = randInt(rng, 15, 33), kind = rng(), tx = x, h = randInt(rng, 4, 9);
    if (!dryOk(x)) continue;
    if (kind < 0.42) ctx.live(swayer(L, tx, y, 'fern'));
    else if (kind < 0.68) ctx.live(swayer(L, tx, Math.max(y, 23), 'treefern', h));
    else if (kind < 0.84) ctx.stat(tx - 2, tx + 2, y, (g, p, lit, ox) => { rect(g, tx - 1 + ox, y - 1, 3, 2, p.gray); px(g, tx + ox, y - 1, p.grayLight); });
    else ctx.stat(tx - 6, tx + 7, y, (g, p, lit, ox) => {                         // a fallen log gone mossy
      rect(g, tx - 6 + ox, y - 2, 13, 2, p.brown); rect(g, tx - 6 + ox, y - 2, 13, 1, p.tan);
      for (let i = -5; i < 6; i += 3) px(g, tx + i + ox, y - 2, p.grass);
      px(g, tx + 6 + ox, y - 1, p.cream);
    });
  }
  for (let x = ctx.from + randInt(rng, 80, 200); x < ctx.to; x += randInt(rng, 240, 480))
    if (dryOk(x)) ctx.live(rng() < 0.6 ? lyrebirdEnt(x, randInt(rng, 22, 30), rng) : rooEnt(x, randInt(rng, 24, 31), rng, ['brown', 'brownDark']));
  for (let x = ctx.from + randInt(rng, 60, 180); x < ctx.to; x += randInt(rng, 170, 340)) {
    const u = uOf(L, x), w = randInt(rng, 4, 6), k = randInt(rng, 0, 2), y = randInt(rng, 31, 33);
    if (dryOk(x) && !STATIONS.some(st => u > st.dist + st.platform[0] - 300 && u < st.dist + st.platform[1] - 20)) ctx.live(trunkEnt(x, y, w, k));
  }
  addTufts(dry, 12, 13, 16);
  return { streams };
}

// A trunk between the viewer and the train, the whole height of the screen
function trunkEnt(lx, y, w, k) {
  const TH = LAYER_Y.fg + y + 4;
  return spriteEnt(lx, y, w + 6, TH, 3, TH - 1, 'trunk' + w + '|' + k + '|' + y, (g, p) => {
    const rng = mulberry32(w * 31 + k);
    rect(g, 3, 0, w, TH, p.cream);
    rect(g, 3, 0, 1, TH, p.white);
    rect(g, 3 + w - 2, 0, 2, TH, p.grayLight);
    for (let n = 0; n < TH / 5; n++) {                                            // ribbons of shed bark
      const sx = 3 + randInt(rng, 1, w - 2), sy = randInt(rng, 0, TH - 30), len = randInt(rng, 6, 22);
      rect(g, sx, sy, 1, len, n % 3 ? p.tan : p.grayLight);
    }
    for (let i = 0; i < 26; i++) {                                                // the rough stocking at the foot
      const flare = i < 6 ? 2 : i < 12 ? 1 : 0, yy = TH - 1 - i;
      rect(g, 3 - flare, yy, w + flare * 2, 1, p.brown);
      for (let xx = 3 - flare; xx < 3 + w + flare; xx++) if (hash2(xx + k * 9, yy) < 0.35) px(g, xx, yy, p.brownDark);
      if (i < 3) rect(g, 3 - flare, yy, 2, 1, p.green);
    }
  });
}

// Leaf litter, and a creek running out from a culvert under the track
function forestFgGround(s, y, lx) {
  if (y < 12) return null;
  if (s) {
    const d = Math.abs(lx - (s.cx + (y - 12) * 0.8)), hw = s.w / 2 + (y - 12) * 0.12;
    if (d < hw) return y < 14 ? 'navy' : hash2(lx >> 1, y) < 0.12 ? 'skyLight' : 'skyMid';
    if (d < hw + 2) return hash2(lx, y) < 0.4 ? 'grayLight' : 'gray';
  }
  if (y === 12) return bayer(lx, y) < 10 ? 'green' : 'greenDark';
  return hash2(lx >> 1, y) < 0.2 ? 'greenDeep' : hash2(lx, y + 99) < 0.08 ? 'brown' : hash2(lx, y + 5) < 0.06 ? 'grass' : 'greenDark';
}
