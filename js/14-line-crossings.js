// Melbourne Pixel Train - The line and bridge drawing, level crossings, birds, falling leaves
'use strict';

// --- the line: masts, wire and ballast on land, the bridge over the Yarra ---
let bridgeX0 = 0, bridgeX1 = 0;                  // screen x of the abutments, set by bridgeX()
function bridgeX() {
  const cam = Math.floor(sim.dist);
  bridgeX0 = BRIDGE.u0 - cam + ANCHOR_X;
  bridgeX1 = BRIDGE.u1 - cam + ANCHOR_X;
}

// Clip to a band of screen columns; call g.restore() when it returns true
function clipBegin(g, xa, xb) {
  xa = Math.max(xa, -64); xb = Math.min(xb, W + 64);
  if (xb <= xa) return false;
  g.save();
  g.beginPath();
  g.rect(xa, 0, xb - xa, H);
  g.clip();
  return true;
}

function drawLand(g, v, d) {
  drawTiled(g, v.masts, d, WIRE_Y - 16);
  drawTiled(g, v.wires, d, WIRE_Y - 12);
  drawTiled(g, v.track, d, LAYER_Y.track);
}

function drawLine(g, v) {
  const d = sim.dist;
  bridgeX();
  const b0 = bridgeX0, b1 = bridgeX1;
  if (b1 <= -40 || b0 >= W + 40) { drawLand(g, v, d); return; }
  if (clipBegin(g, -64, b0)) { drawLand(g, v, d); g.restore(); }
  if (clipBegin(g, b1, W + 64)) { drawLand(g, v, d); g.restore(); }
  if (clipBegin(g, b0, b1)) {                          // the wire carries on across, hung from the truss
    drawTiled(g, v.wires, d, WIRE_Y - 12);
    drawTiled(g, v.deck, d, LAYER_Y.track);
    g.restore();
  }
  for (let k = 1; k < BRIDGE.spans; k++) g.drawImage(v.pier, b0 + k * BRIDGE.span - 5, PIER_Y);
  g.drawImage(v.abutment[0], b0 - 14, 147);
  g.drawImage(v.abutment[1], b1 - 2, 147);
  drawTruss(g, v, false);
}

// Far truss behind the train; near truss drawn over it, so the train runs
// behind the lattice
function drawTruss(g, v, near) {
  bridgeX();
  const spr = near ? v.trussNear : v.trussFar;
  for (let k = 0; k < BRIDGE.spans; k++) {
    const x = bridgeX0 + k * BRIDGE.span;
    if (x < W && x + spr.width > 0) g.drawImage(spr, x, near ? TRUSS_Y : TRUSS_Y - 4);
  }
}

// Wavy reflection of the train and bridge in the open water under the deck:
// rows above the axis are copied upside down and squashed 2:1 (so the
// carriage bodies show), each nudged sideways by a ripple, then a
// water-coloured dither knocks them back
function drawReflection(g, v) {
  const d = sim.dist, f = PARALLAX.fg;
  const xa = Math.max(0, Math.ceil(ANCHOR_X + (BRIDGE.u0 - d) * f));
  const xb = Math.min(W, Math.floor(ANCHOR_X + (BRIDGE.u1 - d) * f));
  if (xb <= xa) return;
  const y0 = LAYER_Y.fg + 15, top = REFLECT_AXIS - 2 * (H - y0);
  rctx.clearRect(0, 0, W, REFLECT_AXIS - top);
  rctx.drawImage(g.canvas, 0, top, W, REFLECT_AXIS - top, 0, 0, W, REFLECT_AXIS - top);   // one snapshot
  for (let y = y0; y < H; y++) {
    const wob = Math.round(Math.sin(y * 1.3 + sim.clock * 3.2) * (y - y0 + 4) / 9);
    g.drawImage(reflectBuf, xa, REFLECT_AXIS - 2 * (y - y0) - 1 - top, xb - xa, 1, xa + wob, y, xb - xa, 1);
  }
  g.fillStyle = v.waterTint;
  g.fillRect(xa, y0, xb - xa, H - y0);
  for (let i = 0; i < 12; i++) {                       // fade out towards the banks
    g.fillStyle = v.waterFade[16 - Math.round(i * 4 / 3)];
    if (xa > 0) g.fillRect(xa + i, y0, 1, H - y0);
    if (xb < W) g.fillRect(xb - 1 - i, y0, 1, H - y0);
  }
}

// How much of the train is on the bridge: onBridge as a flag, bridgeMix
// 0..1 so the rumble turns louder and more metallic as the rake runs on
function updateBridge() {
  const rear = sim.dist + TRAIN.vehicles[TRAIN.vehicles.length - 1].x - ANCHOR_X;
  const front = sim.dist + CONFIG.TRAIN_FRONT_X - ANCHOR_X;
  const over = Math.max(0, Math.min(front, BRIDGE.u1) - Math.max(rear, BRIDGE.u0));
  sim.bridgeMix = over / (front - rear);
  sim.onBridge = over > 0;
}

// --- level crossings: booms down, red lights flashing, bells ringing --------
// The road crosses at right angles. In front of the track it is drawn row
// by row with the parallax sliding from the rails' 1.0 to the near ground's
// 1.3 at the bottom of the screen, so it swings past the way a real one does.
const XING = { hw: 15, y0: 153 }, LAMP_RED = '#ff5a48';
const crossingF = y => y <= XING.y0 ? 1 : 1 + (PARALLAX.fg - 1) * (y - XING.y0) / (LAYER_Y.fg + 33 - XING.y0);
const crossingX = (c, y) => { const f = crossingF(y); return Math.round(c.u * f + ANCHOR_X) - Math.floor(sim.dist * f); };

// Signal mast with its crossbuck and twin lights, and the boom lowered
// across the road (dir: which way the boom points)
function drawBoom(g, v, x, base, dir, len) {
  const p = v.p, flash = Math.floor(sim.clock * 2.6) & 1;
  rect(g, x, base - 13, 1, 13, p.grayLight);
  rect(g, x - 1, base - 1, 3, 1, p.gray);
  for (const [dx, dy] of [[-2, -17], [2, -17], [-1, -16], [1, -16], [0, -15], [-1, -14], [1, -14], [-2, -13], [2, -13]]) px(g, x + dx, base + dy, p.white);
  rect(g, x - 2, base - 11, 5, 2, p.ink);
  g.fillStyle = flash ? LAMP_RED : PALETTE.brownDark; g.fillRect(x - 2, base - 11, 2, 2);
  g.fillStyle = flash ? PALETTE.brownDark : LAMP_RED; g.fillRect(x + 1, base - 11, 2, 2);
  addLight(x + (flash ? -1 : 2), base - 10, LIGHT_RED);
  for (let i = 0; i < len; i++) px(g, x + dir * (2 + i), base - 5, (i >> 2) & 1 ? p.white : p.red);
  px(g, x + dir, base - 5, p.grayDark);
  g.fillStyle = LAMP_RED; g.fillRect(x + dir * (len + 1), base - 6, 1, 1);
}

// A car seen end-on, waiting at the boom: its tail lights, or its headlights
function carEndSprite(v, col, front) {
  return cached(v, 'carEnd' + col + front, 11, 8, (g, p, lit) => {
    rect(g, 1, 0, 9, 1, p[col]);
    rect(g, 0, 1, 11, 5, p[col]);
    rect(g, 2, 1, 7, 2, p.indigo); px(g, 2, 1, p.skyLight);
    rect(g, 0, 5, 11, 1, p.grayDark);
    rect(g, 4, 4, 3, 1, p.white);                                               // number plate
    rect(g, 0, 6, 2, 2, p.ink); rect(g, 9, 6, 2, 2, p.ink);
    for (const x of [0, 9]) { g.fillStyle = front ? (lit ? PALETTE.glow : PALETTE.cream) : LAMP_RED; g.fillRect(x, 3, 2, 1); }
  });
}

// Behind the train: the road over the rails, the far boom, a car facing us
function drawCrossingBack(g, v) {
  const p = v.p, cam = Math.floor(sim.dist), hw = XING.hw;
  for (const c of CROSSINGS) {
    const x = c.u - cam + ANCHOR_X;
    if (x < -70 || x > W + 70) continue;
    rect(g, x - hw + 3, 136, 2 * hw - 6, 4, p.gray);                            // the road arriving from beyond
    rect(g, x - hw, 140, 2 * hw, XING.y0 - 140, p.grayDark);
    rect(g, x - hw, 140, 2 * hw, 1, p.gray);
    for (const ry of [146, 151]) { rect(g, x - hw, ry, 2 * hw, 1, p.cloudShade); rect(g, x - hw, ry + 1, 2 * hw, 1, p.ink); }   // rails in their grooves
    g.drawImage(carEndSprite(v, c.far, true), x + 2, 131);
    if (v.lit) { addLight(x + 3, 134, LIGHT_WINDOW); addLight(x + 12, 134, LIGHT_WINDOW); }
    drawBoom(g, v, x + hw + 2, 141, -1, hw + 2);
  }
}

// In front of the train: the road towards the viewer, the near boom, a car
// and someone on foot waiting for the train to pass
function drawCrossingFront(g, v) {
  const p = v.p, bottom = LAYER_Y.fg + 34;
  for (let i = 0; i < CROSSINGS.length; i++) {
    const c = CROSSINGS[i], x0 = crossingX(c, XING.y0);
    if (x0 < -110 || x0 > W + 110) continue;
    for (let y = XING.y0; y < bottom; y++) {
      const f = crossingF(y), x = crossingX(c, y), hw = Math.round(XING.hw * f);
      rect(g, x - hw, y, 2 * hw, 1, p.grayDark);
      px(g, x - hw, y, p.cloudShade); px(g, x + hw - 1, y, p.cloudShade);       // kerbs
      if ((y >> 1) & 1) px(g, x, y, p.cream);                                   // centre line
    }
    const ys = 157, xs = crossingX(c, ys), hs = Math.round(XING.hw * crossingF(ys));
    rect(g, xs - hs + 2, ys, hs - 3, 1, p.white);                               // stop line: we keep left
    drawBoom(g, v, xs - hs - 3, ys + 1, 1, hs + 1);
    const yc = 173, xc = crossingX(c, yc), hc = Math.round(XING.hw * crossingF(yc));
    g.drawImage(carEndSprite(v, c.near, false), xc - (hc >> 1) - 5, yc - 8);
    if (v.lit) { addLight(xc - (hc >> 1) - 4, yc - 5, LIGHT_RED); addLight(xc - (hc >> 1) + 5, yc - 5, LIGHT_RED); }
    c.ped = c.ped || makeDesign(mulberry32(77 + i * 13));
    g.drawImage(personSprite(v, c.ped, 0, 1), crossingX(c, 162) - Math.round(XING.hw * crossingF(162)) - 9 - PERSON_CX, 163 - PERSON_FY);
  }
}

// Bells, panned to where the crossing is; and in AUTO a toot on the way in
function crossingSound(dt) {
  let near = null, best = 420;
  for (const c of CROSSINGS) {
    const dx = c.u - sim.dist, ahead = dx - (CONFIG.TRAIN_FRONT_X - ANCHOR_X);
    if (Math.abs(dx) < best) { best = Math.abs(dx); near = c; }
    if (ahead > 420) c.tooted = false;
    else if (!c.tooted && ahead < 330 && ahead > 150 && sim.state === 'TRAVELING') { c.tooted = true; playHorn(true); }
  }
  if (!near || (sim.bellT -= dt) > 0) return;
  sim.bellT = 0.26;
  const vol = (1 - best / 420) ** 2 * 0.07;
  if (vol > 0.002 && audioOn()) playBell(audio.ctx.currentTime + 0.01, sim.bellN++ & 1 ? 1320 : 1245, vol, Math.max(-1, Math.min(1, (near.u - sim.dist) / 200)));
}

// --- screen-space visitors: birds crossing the sky, leaves coming down ------
const birdPool = makePool(CONFIG.BIRD_MAX[0], () => ({ kind: '', x: 0, y: 0, vx: 0, depth: 0, age: 0, ph: 0 }));
const fluffPool = makePool(CONFIG.FLUFF_MAX[0], () => ({ x: 0, y: 0, vx: 0, depth: 0, age: 0, life: 0, ph: 0, big: false }));
const BIRDS = {                          // wingspan px, wing beats a second, colours; flock: they come in mobs
  gull:     { span: 2, rate: 7, body: 'white', tip: 'grayDark' },
  magpie:   { span: 2, rate: 6, body: 'ink', tip: 'white' },
  lorikeet: { span: 1, rate: 12, body: 'grass', tip: 'red', flock: true },
  galah:    { span: 2, rate: 8, body: 'rose', tip: 'grayLight', flock: true },
  cocky:    { span: 3, rate: 4, body: 'white', tip: 'white', crest: 'glow' },
  rosella:  { span: 2, rate: 9, body: 'red', tip: 'blue' },
};

function trySpawnBird(si, w, dt) {
  const list = SECTIONS[TERRAIN[si].id].birds, rng = sim.fxRng;
  if (!list || w <= 0) return;
  for (const [kind, rate] of list) {
    if (rng() >= rate * w * dt) continue;
    const left = rng() < 0.3, sp = 14 + rng() * 22, y = 64 + rng() * 40, depth = 0.4 + rng() * 0.3;
    for (let n = BIRDS[kind].flock ? 3 + Math.floor(rng() * 4) : 1; n > 0; n--) {
      const q = poolSpawn(birdPool, cap('BIRD_MAX'));
      if (!q) return;
      q.kind = kind; q.x = (left ? -6 : W + 6) + (left ? -1 : 1) * (n - 1) * (5 + rng() * 5); q.y = y + (n > 1 ? (rng() - 0.5) * 14 : 0);
      q.vx = left ? sp : -sp; q.depth = depth; q.age = 0; q.ph = rng() * 4;
    }
  }
}

function updateBirds(dt) {
  const here = terrainAt(sim.dist), a = here.a, b = here.b, t = here.t;
  trySpawnBird(a, 1 - t, dt);
  if (b !== a) trySpawnBird(b, t, dt);
  for (let i = 0; i < birdPool.n; ) {
    const q = birdPool.items[i];
    q.age += dt;
    q.x += (q.vx - sim.speed * q.depth) * dt;          // air is still relative to the ground
    q.y += Math.sin(q.age * 0.9 + q.ph) * 3 * dt;
    if (q.x > -80 && q.x < W + 80) i++;
    else poolKill(birdPool, i);
  }
}

const WING_LIFT = [-1, 0, 1, 0];
function drawBirds(g, v) {
  const p = v.p;
  for (let n = 0; n < birdPool.n; n++) {
    const q = birdPool.items[n], B = BIRDS[q.kind], x = Math.round(q.x), y = Math.round(q.y), face = Math.sign(q.vx);
    const lift = WING_LIFT[Math.floor(q.age * B.rate + q.ph) % 4];
    for (let i = 1; i <= B.span; i++) {
      const yy = y + (i === B.span ? lift : Math.round(lift / 2)), col = p[i === B.span ? B.tip : B.body];
      px(g, x - i, yy, col);
      px(g, x + i, yy, col);
    }
    px(g, x, y, p[B.body]);
    px(g, x + face, y - (B.crest ? 1 : 0), p[B.body]);
    if (B.crest) px(g, x, y - 2, p[B.crest]);
  }
}

// Gum leaves drifting down among the trees (the pool is still called fluff)
function updateFluff(dt) {
  const rng = sim.fxRng;
  sim.fluffAcc += (5 * sectionWeight('forest', sim.dist) + 1.2 * sectionWeight('foothills', sim.dist)) * dt;
  while (sim.fluffAcc >= 1) {
    sim.fluffAcc -= 1;
    const f = poolSpawn(fluffPool, cap('FLUFF_MAX'));
    if (!f) continue;
    f.depth = 0.5 + rng() * 0.8;                       // nearer leaves sail past faster and lower
    f.x = rng() * (W + 60); f.y = f.depth > 1 ? 96 + rng() * 60 : 70 + rng() * 40;
    f.vx = -(sim.speed * f.depth) - 4; f.age = 0; f.life = 4 + rng() * 5; f.ph = rng() * 6; f.big = rng() < 0.3;
  }
  for (let i = 0; i < fluffPool.n; ) {
    const f = fluffPool.items[i];
    f.age += dt;
    f.vx += (-(sim.speed * f.depth) - 4 - f.vx) * Math.min(1, dt * 1.5);
    f.x += f.vx * dt + Math.sin(f.age * 2.3 + f.ph) * 9 * dt;
    f.y += (7 + Math.sin(f.age * 1.7 + f.ph) * 5) * dt;
    if (f.age < f.life && f.x > -4 && f.y < H + 4) i++;
    else poolKill(fluffPool, i);
  }
}

function drawFluff(g, v) {
  for (let i = 0; i < fluffPool.n; i++) {
    const f = fluffPool.items[i], x = Math.round(f.x), y = Math.round(f.y);
    if (bayer(x, y) >= (f.life - f.age) * 16) continue;   // dissolves in its last second
    px(g, x, y, v.p[f.big ? 'paddy' : 'tan']);
    if (f.big) px(g, x + 1, y + (Math.sin(f.age * 3 + f.ph) > 0 ? 1 : -1), v.p.grassLight);
  }
}

// The foothills' big white cumulus, faded in with an ordered dither
function drawCumulus(g, v, weight) {
  const level = Math.round(weight * 16), off = sim.dist * 0.07 + sim.cloudDrift * 1.4;
  if (level <= 0) return;
  if (level >= 16) { drawTiled(g, v.cumulus, off, 2); return; }
  sctx.clearRect(0, 0, W, 64);
  drawTiled(sctx, v.cumulus, off, 2);
  sctx.globalCompositeOperation = 'destination-in';
  sctx.fillStyle = DITHER_MASKS[level];
  sctx.fillRect(0, 0, W, 64);
  sctx.globalCompositeOperation = 'source-over';
  g.drawImage(scratch, 0, 0, W, 64, 0, 0, W, 64);
}
