// Melbourne Pixel Train - Underground: the City Loop and Metro Tunnel, their stations; Southern Cross
'use strict';

// =====================================================================
// 6b. UNDERGROUND
// =====================================================================
// Where the line runs in a tunnel (TUNNELS) the picture becomes a cutaway:
// the street and the sky stay on top, then the ground, then the tunnel
// with the train in it. The tunnel is drawn in the night palette by its
// own lamps; a station is a tall vault in the bright 'under' lighting.
// render() works out which screen columns are underground (underSpans)
// and draws them over the outdoor picture with renderUnder().
const SURFACE_Y = 58, TUBE_TOP = 88, TUBE_BOT = 152, VAULT_TOP = 64, VAULT_PAD = 120;

// The look of each underground platform: wall, ceiling, accents, lettering, floor
const UNDER_STYLES = {
  flagstaff:   { wall: 'cloudShade', holes: 'grayLight', strip: 'orange', band: 'ink', ceil: 'grayLight', lights: 'white',
                 sign: 'gray', signInk: 'white', floor: 'terracotta', panel: 40 },
  melbcentral: { wall: 'brown', holes: 'tan', strip: 'brownDark', band: 'ink', ceil: 'grayLight', lights: 'white',
                 sign: 'skyMid', signInk: 'white', floor: 'terracotta', panel: 30, led: true },
  parliament:  { wall: 'blue', holes: 'skyDeep', strip: 'navy', band: 'grayDark', ceil: 'white', lights: 'white',
                 sign: 'navy', signInk: 'white', floor: 'terracotta', panel: 24, gloss: true },
  townhall:    { wall: 'cloudShade', holes: 'cloudShade', strip: 'grayLight', band: 'grayDark', ceil: 'white', lights: 'white',
                 sign: 'grayDark', signInk: 'white', floor: 'stone', panel: 48, coffers: true },
  anzac:       { wall: 'white', holes: 'white', strip: 'skyMid', band: 'grayDark', ceil: 'cloudShade', lights: 'white',
                 sign: 'grayDark', signInk: 'white', floor: 'stone', panel: 36, coffers: true },
};

// --- what is underground on screen right now --------------------------------
// tube: screen intervals of running tunnel; vault: station vaults [x0, x1, station]
const UNDER = { tube: [], vault: [], all: false, any: false };
function underSpans() {
  const cam = Math.floor(sim.dist), tube = UNDER.tube, vault = UNDER.vault;
  tube.length = vault.length = 0;
  UNDER.any = UNDER.all = false;
  if (!TUNNELS.length) return UNDER;
  for (const t of TUNNELS) {
    const a = Math.max(-2, t.u0 - cam + ANCHOR_X), b = Math.min(W + 2, t.u1 - cam + ANCHOR_X);
    if (b <= a) continue;
    const cuts = [];                                                  // the station vaults inside this stretch
    for (const st of STATIONS) {
      if (st.roof !== 'under' || st.dist < t.u0 || st.dist > t.u1) continue;
      const v0 = Math.max(a, st.platform[0] - VAULT_PAD + st.dist - cam), v1 = Math.min(b, st.platform[1] + VAULT_PAD + st.dist - cam);
      if (v1 > v0) { cuts.push([v0, v1]); vault.push([v0, v1, st]); }
    }
    cuts.sort((p, q) => p[0] - q[0]);
    let x = a;
    for (const [v0, v1] of cuts) { if (v0 > x) tube.push([x, v0]); x = Math.max(x, v1); }
    if (x < b) tube.push([x, b]);
  }
  UNDER.any = tube.length + vault.length > 0;
  let covered = 0;
  for (const [a, b] of tube) covered += b - a;
  for (const [a, b] of vault) covered += b - a;
  UNDER.all = covered >= W + 4;
  return UNDER;
}

// How much of the train is underground, 0..1 (for the sound)
function underMix() {
  if (!TUNNELS.length) return 0;
  const front = sim.dist + CONFIG.TRAIN_FRONT_X - ANCHOR_X, rear = sim.dist + TRAIN.vehicles[TRAIN.vehicles.length - 1].x - ANCHOR_X;
  let over = 0;
  for (const t of TUNNELS) over += Math.max(0, Math.min(front, t.u1) - Math.max(rear, t.u0));
  return Math.min(1, over / (front - rear));
}

// --- tiles ------------------------------------------------------------------
// Street over the tunnel, then the ground: clay, rock, pipes, a bluestone drain
function buildEarth(p) {
  const TW = 384, TH = TUBE_TOP - SURFACE_Y, rng = mulberry32(58), [c, g] = makeCanvas(TW, TH);
  rect(g, 0, 0, TW, 1, p.cloudShade);                                   // the kerb
  rect(g, 0, 1, TW, 3, p.grayDark);                                     // the road
  for (let x = 0; x < TW; x += 12) rect(g, x, 2, 6, 1, p.cream);         // its centre line
  rect(g, 0, 4, TW, 2, p.gray);                                         // road base
  for (let y = 6; y < TH; y++)
    for (let x = 0; x < TW; x++) {
      const h = hash2(x >> 1, y >> 1), deep = (y - 6) / (TH - 6);
      px(g, x, y, h < 0.08 ? p.grayDark : h < 0.14 ? p.rust : deep > 0.55 && bayer(x, y) < 6 ? p.grayDark : bayer(x, y) < 4 + deep * 6 ? p.brownDark : p.brown);
    }
  for (let i = 0; i < 9; i++) {                                         // stones in the clay
    const x = randInt(rng, 0, TW - 1), y = randInt(rng, 9, TH - 3);
    disc(g, x, y, randInt(rng, 1, 2), p.gray); px(g, x - 1, y - 1, p.grayLight);
  }
  for (const [x, y, r, col] of [[40, 12, 3, 'cream'], [212, 14, 2, 'grayLight'], [300, 11, 3, 'rust']]) {   // pipes and a drain, end on
    disc(g, x, y, r, p[col]); disc(g, x, y, r - 1, p.ink);
  }
  for (let x = 0; x < TW; x++) { px(g, x, 8, (x >> 3) & 1 ? p.red : p.brownDark); if (x % 5 === 0) px(g, x, 9, p.glow); }   // cables under the footpath
  rect(g, 0, TH - 1, TW, 1, p.grayDark);
  return c;
}

// The back wall of a running tunnel: segment rings, cable trays, lamps
const TUBE_LAMP = 64;
function buildTube(p) {
  const TW = 192, TH = TUBE_BOT - TUBE_TOP, [c, g] = makeCanvas(TW, TH);
  rect(g, 0, 0, TW, 2, p.cloudShade);                                   // the lining, cut away
  for (let y = 2; y < 12; y++) for (let x = 0; x < TW; x++) px(g, x, y, bayer(x, y) < (12 - y) * 1.4 ? p.grayDark : p.gray);   // the crown curving towards us
  rect(g, 0, 12, TW, 40, p.gray);
  for (let x = 0; x < TW; x += 24) { rect(g, x, 2, 1, 50, p.grayDark); for (const y of [16, 30, 44]) px(g, x + 2, y, p.grayLight); }   // ring joints and bolts
  for (let x = 12; x < TW; x += 24) rect(g, x, 22, 1, 1, p.grayDark);
  for (const [y, col] of [[33, 'red'], [35, 'glow'], [37, 'ink']]) rect(g, 0, y, TW, 1, p[col]);   // cables on their trays
  rect(g, 0, 38, TW, 1, p.grayDark);
  for (let x = 0; x < TW; x += 8) px(g, x, 39, p.grayDark);
  for (let x = 0; x < TW; x += TUBE_LAMP) { rect(g, x + 20, 13, 6, 2, p.cloudShade); rect(g, x + 21, 15, 4, 1, PALETTE.glow); }
  rect(g, 0, 52, TW, TH - 52, p.grayDark);                               // the invert and the drain
  for (let x = 0; x < TW; x += 6) px(g, x, 54, p.gray);
  return c;
}

// Slab track: the rails sit on concrete blocks, no ballast underground
function buildSlabTrack(p) {
  const TW = 192, [c, g] = makeCanvas(TW, 20);
  rect(g, 0, 3, TW, 12, p.gray);
  rect(g, 0, 3, TW, 1, p.grayLight);
  rect(g, 0, 15, TW, 3, p.grayDark);
  for (let x = 2; x < TW; x += 8) { rect(g, x, 5, 4, 3, p.cloudShade); rect(g, x, 10, 4, 3, p.cloudShade); px(g, x + 3, 7, p.grayDark); px(g, x + 3, 12, p.grayDark); }
  rect(g, 0, 6, TW, 1, p.cloudShade); rect(g, 0, 7, TW, 1, p.grayDark);
  rect(g, 0, 11, TW, 1, p.cloudShade); rect(g, 0, 12, TW, 1, p.grayDark);
  return c;
}

// Overhead underground: a rigid conductor bar hung from the crown
function buildRigid(p) {
  const TW = 96, [c, g] = makeCanvas(TW, WIRE_Y - TUBE_TOP + 3);
  const bar = WIRE_Y - TUBE_TOP;
  rect(g, 0, bar - 1, TW, 2, p.grayLight);
  rect(g, 0, bar + 1, TW, 1, p.grayDark);
  for (let x = 30; x < TW; x += 48) {
    rect(g, x, 2, 1, bar - 3, p.grayDark);
    rect(g, x - 3, bar - 2, 7, 1, p.grayDark);
    px(g, x, 8, p.cloudShade);                                          // insulator
  }
  return c;
}

// The walkway along a running tunnel, and the tunnel's cut edge below it
function buildWalkway(p) {
  const TW = 96, [c, g] = makeCanvas(TW, H - TUBE_BOT + 6);
  for (let x = 0; x < TW; x += 24) { rect(g, x, 0, 1, 6, p.grayLight); }
  rect(g, 0, 0, TW, 1, p.glow);                                         // the handrail, painted yellow
  rect(g, 0, 6, TW, 1, p.cloudShade);
  rect(g, 0, 7, TW, 4, p.gray);
  rect(g, 0, 11, TW, 3, p.grayDark);
  rect(g, 0, 14, TW, c.height - 14, p.ink);
  for (let x = 0; x < TW; x++) px(g, x, 14, bayer(x, 14) < 8 ? p.gray : p.grayDark);
  for (let y = 16; y < c.height; y++) for (let x = 0; x < TW; x++) if (bayer(x, y) < 3) px(g, x, y, p.brownDark);
  return c;
}

// --- a station's vault --------------------------------------------------------
// Drawn once per station from its style: a barrel-vaulted ceiling with
// light lines, the wall behind the track with the station's name along it,
// screens, and the running tunnels opening at either end
function buildVault(p, lit, st) {
  const S = UNDER_STYLES[st.under], w = st.platform[1] - st.platform[0] + VAULT_PAD * 2, h = TUBE_BOT - VAULT_TOP;
  const [c, g] = makeCanvas(w, h), rng = mulberry32(st.index * 31 + 7);
  rect(g, 0, 0, w, 2, p.grayDark);
  for (let y = 2; y < 20; y++) {                                        // the vault, darker towards its crown
    const k = (20 - y) / 18;
    for (let x = 0; x < w; x++) px(g, x, y, bayer(x, y) < k * 7 ? p.gray : p[S.ceil]);
  }
  for (const y of [7, 13]) rect(g, 0, y, w, 1, PALETTE.white);           // the light lines along it
  if (S.coffers) for (let x = 6; x < w; x += 16) for (const y of [3, 9, 15]) rect(g, x, y, 10, 2, p.cloudShade);
  else for (let x = 0; x < w; x += 12) rect(g, x, 3, 1, 16, p.cloudShade);
  rect(g, 0, 20, w, 2, p.grayDark);                                     // the cornice
  rect(g, 0, 22, w, 10, p[S.band]);                                     // the dark band: screens and adverts
  for (let x = 30 + randInt(rng, 0, 40); x < w - 40; x += randInt(rng, 140, 200)) {
    rect(g, x, 23, 26, 8, p.ink);
    rect(g, x + 1, 24, 24, 6, p[pick(rng, ['skyMid', 'orange', 'grass', 'rose', 'red'])]);
    rect(g, x + 3, 25, 12, 2, p.white); rect(g, x + 3, 28, 8, 1, p.cream);
  }
  for (let y = 32; y < 72; y++)                                        // the wall
    for (let x = 0; x < w; x++) {
      const k = x % S.panel;
      if (k < 3) { px(g, x, y, p[S.strip]); continue; }
      if (S.gloss) px(g, x, y, k === 3 || (k === S.panel - 4 && y < 60) ? p.skyMid : bayer(x, y) < 2 ? p.skyDeep : p[S.wall]);
      else px(g, x, y, (y & 1) && (x & 1) && S.holes !== S.wall ? p[S.holes] : p[S.wall]);
    }
  if (S.led) { rect(g, 0, 47, w, 2, p.skyMid); rect(g, 0, 47, w, 1, PALETTE.skyLight); }
  const label = st.en, lw = textWidth(label) + 8;                       // the name, every so often along the wall
  for (let x = 40; x < w - lw; x += Math.max(160, lw + 80)) {
    rect(g, x, 36, lw, 9, p[S.sign]);
    rect(g, x, 36, lw, 1, p.cloudShade);
    drawText(g, label, x + 4, 38, p[S.signInk]);
  }
  rect(g, 0, 72, w, 2, p.cloudShade);                                   // the skirting, then the trough behind the rails
  rect(g, 0, 74, w, h - 74, p.grayDark);
  for (let x = 0; x < w; x += 10) px(g, x, 78, p.gray);
  for (const ex of [0, w - 20]) {                                       // the ends: concrete, and the dark mouths of the running tunnels
    rect(g, ex, 0, 20, h, p.gray);
    rect(g, ex + (ex ? 0 : 19), 0, 1, h, p.grayDark);
    for (let y = 24; y < h; y++) {
      const hw = Math.round(9 * Math.sqrt(Math.max(0, 1 - ((y - 50) / 26) ** 2)));
      if (y > 50 || hw > 0) rect(g, ex + 10 - (y > 50 ? 9 : hw), y, (y > 50 ? 9 : hw) * 2, 1, p.ink);
    }
  }
  return c;
}

// Underground platforms: terracotta tiles in the loop, pale stone in the
// Metro Tunnel; the yellow line and the white tactiles along the edge
function buildTiledSlab(p, w, S) {
  const [c, g] = makeCanvas(w, 32);
  const stone = S.floor === 'stone';
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < w; x++) {
      const tx = (x + (((y / 4) | 0) & 1) * 4) >> 3, ty = y >> 2, k = hash2(tx, ty);
      px(g, x, y, stone ? (k < 0.5 ? p.cloudShade : p.grayLight) : k < 0.35 ? p.orange : k < 0.7 ? p.rust : p.brown);
      if (!stone && ((x + (((y / 4) | 0) & 1) * 4) % 8 === 0 || y % 4 === 0) && bayer(x, y) < 8) px(g, x, y, p.brownDark);
    }
  rect(g, 0, 0, w, 1, p.cloudShade);
  rect(g, 0, 1, w, 1, p.grayLight);
  rect(g, 0, 2, w, 1, p.glow);                                          // the yellow line
  for (let x = 0; x < w; x += 2) { px(g, x, 3, p.white); px(g, x + 1, 4, p.white); }   // tactiles
  rect(g, 0, 24, w, 1, p.cloudShade);
  rect(g, 0, 25, w, 7, p.gray);
  rect(g, 0, 29, w, 3, p.grayDark);
  rect(g, 0, 0, 1, 32, p.grayDark); rect(g, w - 1, 0, 1, 32, p.grayDark);
  return c;
}

// Sprites per lighting variant, painted on first use
function underSprites(v) {
  let u = v.sprites.get('under');
  if (!u) {
    u = { earth: buildEarth(v.p), tube: buildTube(v.p), track: buildSlabTrack(v.p), rigid: buildRigid(v.p), walk: buildWalkway(v.p), vaults: [] };
    v.sprites.set('under', u);
  }
  return u;
}

// --- drawing ------------------------------------------------------------------
function renderUnder(g, x0, x1, st) {
  const v = st ? VARIANTS.under : VARIANTS.night, u = underSprites(v), d = sim.dist, cam = Math.floor(d), p = v.p;
  g.save();
  g.beginPath(); g.rect(x0, 0, x1 - x0, H); g.clip();
  lights.n = 0; lights.collect = true;
  drawTiled(g, underSprites(VARIANTS.under).earth, d, SURFACE_Y);       // the ground keeps its own colours
  if (st) {
    const vault = u.vaults[st.index] || (u.vaults[st.index] = buildVault(p, v.lit, st));
    const vx = st.platform[0] - VAULT_PAD + st.dist - cam;
    rect(g, x0, SURFACE_Y + 6, x1 - x0, VAULT_TOP - SURFACE_Y - 6, p.grayDark);   // the station box under the street
    g.drawImage(vault, vx, VAULT_TOP);
    for (let x = vx + 24; x < vx + vault.width - 24; x += 48) addLight(x, VAULT_TOP + 9, LIGHT_LAMP);
    drawSurfaceMark(g, st, cam);
  } else {
    drawTiled(g, u.tube, d, TUBE_TOP);
    for (let x = -(((cam % TUBE_LAMP) + TUBE_LAMP) % TUBE_LAMP) + 23; x < W + 8; x += TUBE_LAMP) addLight(x, TUBE_TOP + 15, LIGHT_BULB);
    drawTubeFeatures(g, v, cam);
  }
  drawTiled(g, u.track, d, LAYER_Y.track);
  drawTiled(g, u.rigid, d, TUBE_TOP);
  drawTrain(g, v);
  if (st) drawStationFront(g, v);
  else { drawTiled(g, u.walk, d, TUBE_BOT); drawPortalRings(g, v, cam); }
  lights.collect = false;
  glowUnder(g, st ? 0.55 : 1);
  g.restore();
}

// Every so often along the tunnel: a cross-passage door with its green
// exit sign, and a signal before each station
function drawTubeFeatures(g, v, cam) {
  const p = v.p;
  for (let u = Math.floor((cam - ANCHOR_X - 40) / 420) * 420; u < cam + W; u += 420) {
    const x = u - cam + ANCHOR_X;
    if (x < -20 || x > W + 20 || u % 840 === 0) continue;
    rect(g, x, TUBE_TOP + 26, 10, 22, p.grayDark);
    rect(g, x + 1, TUBE_TOP + 27, 8, 21, p.slate);
    px(g, x + 7, TUBE_TOP + 37, p.grayLight);
    g.fillStyle = '#3cc46a'; g.fillRect(x, TUBE_TOP + 20, 10, 4);       // EXIT, lit green
    g.fillStyle = PALETTE.white; g.fillRect(x + 2, TUBE_TOP + 21, 2, 2); g.fillRect(x + 5, TUBE_TOP + 22, 3, 1);
    addLight(x + 5, TUBE_TOP + 22, LIGHT_BULB);
  }
  for (const st of STATIONS) {
    if (st.roof !== 'under') continue;
    const x = st.dist + st.platform[0] - VAULT_PAD - 70 - cam;
    if (x < -10 || x > W + 10) continue;
    rect(g, x, TUBE_TOP + 24, 4, 9, p.ink);
    const green = sim.station + 1 >= st.index;
    g.fillStyle = green ? '#3cc46a' : LAMP_RED; g.fillRect(x + 1, TUBE_TOP + (green ? 29 : 25), 2, 2);
    addLight(x + 2, TUBE_TOP + 27, green ? LIGHT_BULB : LIGHT_RED);
  }
}

// Where the tunnel meets the open air: the concrete ring of the portal
function drawPortalRings(g, v, cam) {
  const p = v.p;
  for (const t of TUNNELS) for (const [uu, dir] of [[t.u0, 1], [t.u1, -1]]) {
    const x = uu - cam + ANCHOR_X;
    if (x < -10 || x > W + 10) continue;
    const bx = dir > 0 ? x : x - 5;
    rect(g, bx, TUBE_TOP - 4, 5, TUBE_BOT - TUBE_TOP + 10, p.cloudShade);
    rect(g, bx + (dir > 0 ? 4 : 0), TUBE_TOP - 4, 1, TUBE_BOT - TUBE_TOP + 10, p.grayLight);
  }
}

// Out in the open: the ground rising over each tunnel mouth, its concrete headwall
function drawPortals(g, v) {
  if (!TUNNELS.length) return;
  const p = v.p, cam = Math.floor(sim.dist);
  for (const t of TUNNELS) for (const [uu, dir] of [[t.u0, -1], [t.u1, 1]]) {
    const x = uu - cam + ANCHOR_X, len = 110;
    if (x + len < 0 || x - len > W) continue;
    for (let k = 0; k < len; k++) {                                     // the bank, sloping down to the track
      const xx = x + dir * (k + 1), top = SURFACE_Y + Math.round(k * (138 - SURFACE_Y) / len);
      if (xx < -1 || xx > W) continue;
      rect(g, xx, top, 1, 140 - top, k & 1 ? p.green : p.grass);
      for (let y = top + 3; y < 140; y += 3) if (bayer(xx, y) < 5) px(g, xx, y, p.greenDark);
      px(g, xx, top, p.grassLight);
      if (k < 40) rect(g, xx, top + 4 + (k >> 2), 1, 140 - top - 4 - (k >> 2), (k + 1) % 6 ? p.grayLight : p.gray);   // the retaining wall
    }
    rect(g, x - 3, SURFACE_Y - 2, 6, 140 - SURFACE_Y + 2, p.cloudShade);   // the headwall
    rect(g, x - 4, SURFACE_Y - 3, 8, 2, p.grayLight);
  }
}

// --- up on the street, over a station ------------------------------------------
// The building over the platforms, painted in the open air's lighting
// (day, dusk or night) since it stands outside. [stop x, painter]
const SURFACE_MARKS = { MCE: [-40, paintMelbourneCentral] };
function drawSurfaceMark(g, st, cam) {
  const mark = SURFACE_MARKS[st.code];
  if (!mark) return;
  const L = lightingAt(sim.hour), v = VARIANTS[L.f > 0.5 ? L.b : L.a], key = 'surf' + st.code;
  let spr = v.sprites.get(key);
  if (!spr) { let sg; [spr, sg] = makeCanvas(420, SURFACE_Y + 1); mark[1](sg, v.p, v.lit, SURFACE_Y + 1); v.sprites.set(key, spr); }
  g.drawImage(spr, mark[0] + st.dist - cam, 0);
}

// Melbourne Central from the corner of Swanston and La Trobe streets: the
// timber-clad block with its jutting top, the glass level and yellow band
// under it, the red lips over the entrance, the glass cone over the shot
// tower behind, the dotted facade along La Trobe Street, the tower over it all
function paintMelbourneCentral(g, p, lit, base) {
  const rng = mulberry32(310), win = (x, y, on) => lit && on ? PALETTE.glow : y;
  // the office tower, behind everything
  rect(g, 300, 0, 46, base, p.skyDeep);
  for (let y = 2; y < base; y += 3) for (let x = 302; x < 344; x += 3) px(g, x, y, lit && rng() < 0.4 ? PALETTE.glow : p.skyLight);
  rect(g, 344, 0, 2, base, p.navy);
  // the glass cone over the shot tower, peeking out between the tower and the block
  for (let k = 0; k < 22; k++) {
    const hw = Math.round(k * 0.5), y = 18 + k, cx = 284;
    rect(g, cx - hw, y, 2 * hw + 1, 1, k % 4 === 0 ? p.white : p.skyLight);
    if (hw > 1) { px(g, cx - hw, y, p.cloudShade); px(g, cx + hw, y, p.grayLight); }
    if (k > 3) px(g, cx, y, p.cloudShade);
  }
  // a white office block on the left
  rect(g, 0, 6, 60, base - 6, p.white);
  rect(g, 58, 6, 2, base - 6, p.cloudShade);
  for (let y = 9; y < base - 12; y += 4) for (let x = 4; x < 56; x += 5) rect(g, x, y, 3, 2, lit && rng() < 0.5 ? PALETTE.glow : p.slate);
  // the timber block, its top stepping out over the street
  rect(g, 64, 16, 200, 30, p.tan);
  rect(g, 70, 8, 70, 8, p.tan);                                         // the jutting piece at the top
  for (let k = 0; k < 6; k++) rect(g, 58 + k, 10 + k, 14, 1, p.brown);   // its underside, angled back
  rect(g, 196, 10, 50, 6, p.tan);
  for (let y = 9; y < 46; y += 2) for (let x = 64; x < 264; x++) if ((y >= 16 || (x >= 70 && x < 140) || (x >= 196 && x < 246)) && hash2(x >> 3, y) < 0.55) px(g, x, y, p.brown);   // the boards
  for (let x = 64; x < 264; x += 23) rect(g, x, 16, 1, 30, p.brownDark);
  rect(g, 262, 16, 2, 30, p.brown);
  rect(g, 120, 20, 60, 16, p.navy);                                     // a billboard on the corner
  rect(g, 122, 22, 18, 12, p.rose); rect(g, 144, 24, 30, 3, p.white); rect(g, 144, 29, 20, 2, p.cloudShade);
  // the yellow band, then the glass level
  rect(g, 60, 46, 206, 2, p.glow);
  rect(g, 64, 48, 200, base - 48, lit ? p.indigo : p.skyMid);
  for (let x = 64; x < 264; x += 6) rect(g, x, 48, 1, base - 48, p.grayDark);
  if (lit) for (let x = 66; x < 262; x += 6) rect(g, x, base - 6, 4, 4, PALETTE.amber);
  // the lips over the entrance, on their post
  rect(g, 172, 50, 1, base - 50, p.grayDark);
  for (let k = 0; k < 4; k++) rect(g, 160 + (k === 0 || k === 3 ? 2 : 0), 46 + k, k === 0 || k === 3 ? 20 : 24, 1, k === 1 ? p.rose : p.red);
  // the dotted facade along La Trobe Street
  rect(g, 266, 40, 90, base - 40, p.ink);
  for (let y = 44; y < base - 4; y += 6) for (let x = 270; x < 352; x += 6) disc(g, x, y, 1, (x + y) % 18 === 0 ? p.grayLight : p.white);
  // the tram wires over the corner
  for (let x = 0; x < 420; x++) { px(g, x, 30 + Math.round(2 * Math.sin(x / 40)), p.grayDark); if (x % 60 === 0) rect(g, x, 30, 1, base - 30, p.grayDark); }
  // and a tram on Swanston Street
  const tx = 8;
  rect(g, tx, base - 12, 44, 10, p.white);
  rect(g, tx, base - 9, 44, 3, p.navy);
  for (let x = tx + 2; x < tx + 42; x += 5) rect(g, x, base - 9, 3, 2, lit ? PALETTE.glow : p.skyLight);
  rect(g, tx, base - 5, 44, 1, p.grass);
  rect(g, tx + 2, base - 2, 6, 2, p.ink); rect(g, tx + 36, base - 2, 6, 2, p.ink);
  pxLine(g, tx + 22, base - 12, tx + 28, 30, p.grayDark);
}

// Lamps and the train's own lights, added on top (always lit down here)
function glowUnder(g, a) {
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a;
  g.drawImage(GLOW.train, 0, GLOW.trainY);
  if (sim.doorOpen > 0.3) for (let i = 0; i < DOORS.length; i++) g.drawImage(GLOW.door, DOORS[i] + 2 - 8, PLAT.DOOR_TOP + 4 - 8);
  for (let i = 0; i < lights.n; i++) {
    const spr = GLOW.halos[lights.k[i]], r = spr.width >> 1;
    g.drawImage(spr, Math.round(lights.x[i]) - r, Math.round(lights.y[i]) - r);
  }
  if (drive.engine !== 'OFF' && (drive.headlight || !drive.on)) {
    g.drawImage(GLOW.cone, CONFIG.TRAIN_FRONT_X, LAYER_Y.loco + 10);
    g.drawImage(GLOW.flare, CONFIG.TRAIN_FRONT_X - 8, LAYER_Y.loco + 8);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}

// =====================================================================
// SOUTHERN CROSS
// =====================================================================
// The wave roof: a run of shallow domes, white panels on a steel lattice,
// a vent at each crown letting the daylight down
const SC_WAVE = 140;
function buildWaveRoof(p, lit, w) {
  const [c, g] = makeCanvas(w, ROOFS.scross.h);
  for (let x = 0; x < w; x++) {
    const ph = ((x % SC_WAVE) + SC_WAVE) % SC_WAVE / SC_WAVE, top = Math.round(20 - 16 * Math.sin(Math.PI * ph));
    rect(g, x, top, 1, 2, p.white);                                     // the skin
    rect(g, x, top + 2, 1, 9, p.cloudShade);                            // the lattice underneath
    const k = (x % 12), d = Math.abs(k - 6);
    px(g, x, top + 3 + d, p.grayLight); px(g, x, top + 9 - d, p.grayLight);   // its diagonals
    if (k === 0) rect(g, x, top + 2, 1, 9, p.gray);
    rect(g, x, top + 11, 1, 1, p.gray);
    if (lit && x % 9 === 0) px(g, x, top + 12, PALETTE.glow);
  }
  for (let x = SC_WAVE / 2; x < w; x += SC_WAVE) {                       // the vents at the crowns
    rect(g, x - 4, 0, 9, 4, p.grayLight);
    rect(g, x - 3, 1, 7, 2, lit ? p.indigo : p.skyLight);
    for (let y = 10; y < 40; y++) if (bayer(x, y) < 2 && !lit) { px(g, x - 2 + (y & 3), y, p.white); }
  }
  return c;
}

// The columns: white steel trunks branching up into the roof (behind the train)
function buildScrossBack(p, lit, st) {
  const w = ROOFS.scross.span[1] - ROOFS.scross.span[0], [c, g] = makeCanvas(w, 142);
  for (let x = 0; x <= w; x += SC_WAVE) {
    rect(g, x - 2, 56, 4, 86, p.white);
    rect(g, x + 1, 56, 1, 86, p.cloudShade);
    for (const [dx, dy] of [[-26, 28], [-12, 14], [12, 14], [26, 28]]) {  // the branches, up to the roof
      pxLine(g, x, 58, x + dx, dy, p.white); pxLine(g, x + Math.sign(dx), 58, x + dx + Math.sign(dx), dy, p.cloudShade);
    }
    rect(g, x - 3, 138, 7, 4, p.gray);
  }
  rect(g, 0, 132, w, 4, p.grayLight);                                   // the next platform's edge, past our track
  rect(g, 0, 132, w, 1, p.glow);
  rect(g, 0, 136, w, 4, p.gray);
  return c;
}

// Further back: the other platforms - two VLocities waiting to go west, a
// Metro train, people on the far platforms, the hanging departure boards
function buildScrossMid(p, lit) {
  const TW = 640, TH = 44, rng = mulberry32(17), [c, g] = makeCanvas(TW, TH);
  rect(g, 0, 0, TW, 30, p.cloudShade);                                  // the glass wall along Spencer Street
  for (let x = 0; x < TW; x += 8) { rect(g, x, 2, 6, 20, lit ? p.indigo : p.skyLight); rect(g, x, 2, 6, 1, p.white); }
  rect(g, 0, 22, TW, 4, p.gray);
  for (const y of [26, 38]) { rect(g, 0, y, TW, 3, p.grayLight); rect(g, 0, y, TW, 1, p.glow); }   // platforms
  const train = (x, y, n, body, band, nose) => {
    for (let i = 0; i < n; i++) {
      const cx = x + i * 27;
      rect(g, cx, y, 26, 10, p[body]);
      rect(g, cx, y + 2, 26, 3, p.ink);
      for (let k = 2; k < 24; k += 5) rect(g, cx + k, y + 2, 3, 2, lit ? PALETTE.glow : p.indigo);
      rect(g, cx, y + 7, 26, 2, p[band]);
      rect(g, cx, y, 26, 1, p.grayLight);
    }
    rect(g, x + n * 27 - 1, y, 4, 10, p[nose]);
    rect(g, x + n * 27, y + 2, 2, 3, p.ink);
  };
  train(20, 16, 6, 'cloudShade', 'vline', 'glow');                      // V/Line, on the far road
  train(250, 16, 3, 'cloudShade', 'vline', 'glow');
  train(380, 28, 6, 'cloudShade', 'skyMid', 'glow');                    // a Metro train closer in
  for (let i = 0; i < 40; i++) {                                        // people along the platforms
    const x = randInt(rng, 0, TW - 1), y = rng() < 0.5 ? 26 : 38;
    rect(g, x, y - 3, 1, 3, p[pick(rng, ['navy', 'ink', 'red', 'skyMid', 'cream'])]);
    px(g, x, y - 4, p[pick(rng, SKINS)]);
  }
  for (let x = 60; x < TW; x += 120) {                                  // departure boards
    rect(g, x, 0, 1, 6, p.grayDark);
    rect(g, x - 9, 6, 19, 6, p.ink);
    rect(g, x - 8, 7, 9, 1, PALETTE.amber); rect(g, x + 3, 7, 5, 1, PALETTE.white); rect(g, x - 8, 9, 6, 1, p.slate);
  }
  return c;
}
