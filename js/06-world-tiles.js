// Melbourne Pixel Train - Trees and houses, clouds, overhead wire, track, bridge parts, lighting variants
'use strict';

// =====================================================================
// 5. WORLD LAYERS
// =====================================================================
// Every layer is a pre-rendered tile whose width is a multiple of 4, so
// Bayer dither patterns line up across the seam and it repeats forever.

// --- scenery props ---------------------------------------------------
const LEAFY = ['greenDark', 'green', 'grass'], JACARANDA = ['purple', 'slate', 'skyLight'], WATTLE = ['amber', 'glow', 'cream'];

// Round-crowned street tree: plane, elm, a jacaranda in flower, golden wattle
function roundTree(g, x, base, r, trunkH, p, seed, cols = LEAFY) {
  const rng = mulberry32(seed), cy = base - trunkH - r;
  rect(g, x, cy, 1, base - cy, p.brownDark);
  disc(g, x, cy, r, p[cols[0]]);
  disc(g, x - 1, cy - 1, Math.max(1, r - 2), p[cols[1]]);
  for (let i = 0; i < r * 2; i++) {
    const a = rng() * Math.PI * 2, d = rng() * (r - 1) * 0.7;
    px(g, Math.round(x - 2 + Math.cos(a) * d), Math.round(cy - 2 + Math.sin(a) * d), p[cols[2]]);
  }
}

// Eucalypt: a pale trunk that forks, and loose flat clumps of grey-green
// leaves with the sky showing between them
function gumTree(g, x, base, h, p, seed) {
  const rng = mulberry32(seed), fork = Math.round(h * 0.42), spread = Math.max(3, Math.round(h * 0.3));
  for (let i = 0; i < h - 1; i++) {
    const col = i % 5 === 4 ? p.grayLight : p.cream;
    px(g, x + (i > fork ? Math.round((i - fork) * 0.28) : 0), base - i, col);
    if (i > fork && i < h - 3) px(g, x - Math.round((i - fork) * 0.5), base - i, col);      // second limb
  }
  if (h > 18) rect(g, x + 1, base - 3, 1, 4, p.tan);
  for (let k = 3 + Math.floor(h / 5); k > 0; k--) {
    const cx = x + randInt(rng, -spread, spread), cy = base - h + randInt(rng, -1, Math.round(h * 0.28)), w = randInt(rng, 3, 5);
    rect(g, cx - w, cy, 2 * w, 2, p.greenDark);
    rect(g, cx - w + 1, cy - 1, 2 * w - 2, 1, p.haze);
    for (let j = 0; j < w; j++) px(g, cx - w + 1 + randInt(rng, 0, 2 * w - 3), cy - (j & 1), p.green);
  }
}

// Dark, narrow cypress, the kind that lines old driveways
function cypress(g, x, base, h, p) {
  for (let i = 0; i < h; i++) {
    const hw = Math.min(2, Math.floor(i / 3));
    rect(g, x - hw, base - h + i, 2 * hw + 1, 1, p.greenDeep);
    if (hw && (i & 1)) px(g, x - hw, base - h + i, p.greenDark);
  }
  px(g, x, base, p.brownDark);
}

// A house on its block. o comes from houseDesign(): weatherboard under
// tin, red brick under terracotta tiles, or post-war cream brick; a picket
// fence or a low brick one along the front.
function houseDesign(rng, w, farm) {
  const kind = farm ? 'wb' : pick(rng, ['wb', 'wb', 'fed', 'fed', 'fed', 'brick', 'brick']);
  const o = { kind, tin: kind === 'wb', chimney: rng() < 0.6, verandah: kind !== 'brick' && rng() < 0.6,
              fence: farm ? 'none' : pick(rng, ['picket', 'picket', 'brick', 'none']), lightOn: rng() < 0.7, win: rng() < 0.5 ? 2 : w - 5,
              door: pick(rng, ['red', 'navy', 'greenDark', 'brownDark', 'white']) };
  if (kind === 'wb') { [o.wall, o.wall2] = pick(rng, [['white', 'cloudShade'], ['cream', 'tan'], ['skyLight', 'skyMid'], ['cloudShade', 'grayLight']]);
                       [o.roof, o.ridge] = pick(rng, [['grayLight', 'gray'], ['red', 'rust'], ['haze', 'greenDark'], ['gray', 'grayDark']]); }
  else if (kind === 'fed') { o.wall = 'rust'; o.wall2 = 'brown'; [o.roof, o.ridge] = pick(rng, [['orange', 'rust'], ['orange', 'rust'], ['gray', 'grayDark']]); }
  else { o.wall = 'cream'; o.wall2 = 'tan'; [o.roof, o.ridge] = pick(rng, [['brown', 'brownDark'], ['rust', 'brown'], ['grayDark', 'ink']]); }
  return o;
}

function ausHouse(g, x, base, w, p, o, lightOn) {
  const wallH = 6, top = base - wallH - 1, dx = x + (w >> 1) - 1;
  rect(g, x, top, w, wallH, p[o.wall]);
  if (o.kind === 'wb') for (let yy = top + 1; yy < top + wallH; yy += 2) rect(g, x, yy, w, 1, p[o.wall2]);       // boards
  else for (let yy = top; yy < top + wallH; yy++) for (let xx = x + (yy & 1) * 2; xx < x + w; xx += 4) px(g, xx, yy, p[o.wall2]);   // courses
  rect(g, dx, top + 2, 2, wallH - 2, p[o.door]);
  for (const wx of [x + 2, x + w - 5]) { rect(g, wx, top + 2, 3, 2, p.navy); px(g, wx, top + 2, p.skyLight); }
  if (lightOn) rect(g, x + o.win, top + 2, 3, 2, PALETTE.glow);
  const rh = o.kind === 'brick' ? 3 : 4, step = o.kind === 'brick' ? 2 : 1;
  for (let r = 0; r < rh; r++) {
    const inset = (rh - 1 - r) * step, x0 = x - 1 + inset, rw = w + 2 - inset * 2;
    rect(g, x0, top - rh + r, rw, 1, r === 0 ? p[o.ridge] : p[o.roof]);
    if (r > 0 && o.tin) for (let xx = x0 + 1; xx < x0 + rw; xx += 2) px(g, xx, top - rh + r, p[o.ridge]);
    else if (r > 0) for (let xx = x0 + (r & 1) * 2; xx < x0 + rw; xx += 4) px(g, xx, top - rh + r, p[o.ridge]);   // tiles
  }
  if (o.chimney) { rect(g, x + w - 4, top - rh - 2, 2, 3, p.rust); rect(g, x + w - 4, top - rh - 2, 2, 1, p.brown); }
  if (o.verandah) {
    rect(g, x - 1, top + 1, w + 2, 1, p[o.ridge]);
    for (const vx of [x, x + w - 1]) rect(g, vx, top + 2, 1, wallH - 2, p.cream);
  }
  if (o.fence === 'picket') {
    for (let xx = x - 1; xx <= x + w; xx++) {
      if (xx === dx || xx === dx + 1) continue;                    // the gate stands open
      px(g, xx, base - 1, p.white);
      if ((xx - x) & 1) px(g, xx, base - 2, p.white);
    }
  } else if (o.fence === 'brick') {
    rect(g, x - 1, base - 2, w + 2, 2, p.rust);
    rect(g, x - 1, base - 2, w + 2, 1, p.cloudShade);
    rect(g, dx, base - 2, 2, 2, p[o.wall]);
  }
}

// Bell-shaped hill: top row of column i, and the filled silhouette
const humpTop = (i, w, h, base) => base - Math.round(h * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / w)));

function hump(g, x, base, w, h, col, ridge, tint) {
  for (let i = 0; i < w; i++) {
    const t = humpTop(i, w, h, base);
    if (t >= base) continue;
    rect(g, x + i, t, 1, base - t, col);
    if (tint) for (let y = t; y < Math.min(base, t + 6); y++) if (bayer(x + i, y) < 7 - (y - t)) px(g, x + i, y, tint);
    if (ridge && bayer(x + i, t) < 10) px(g, x + i, t, ridge);
  }
}

// --- 2. far clouds (0.05x) -------------------------------------------
function buildClouds(p) {
  const TW = 640, TH = 64, rng = mulberry32(7);
  const [c, g] = makeCanvas(TW, TH);
  for (let i = 0; i < 8; i++) {
    const x0 = i * 80 + randInt(rng, 0, 40), base = randInt(rng, 14, 54), n = randInt(rng, 3, 6);
    const puffs = [];
    let x = x0;
    for (let j = 0; j < n; j++) {
      const mid = 1 - Math.abs(j - (n - 1) / 2) / n;
      const r = Math.max(2, Math.round((3 + rng() * 4) * (0.6 + mid * 0.6)));
      puffs.push([x, base - r + 2, r]);
      x += r + randInt(rng, 1, 3);
    }
    wrapX(TW, o => {
      for (const [cx, cy, r] of puffs) disc(g, cx + o, cy, r, p.cloudShade);
      g.clearRect(x0 - 12 + o, base + 2, x - x0 + 24, 12);            // flat underside
      for (const [cx, cy, r] of puffs) disc(g, cx - 1 + o, cy - 1, r - 1, p.white);
    });
  }
  for (let i = 0; i < 6; i++) {                                         // thin high streaks
    const x = randInt(rng, 0, TW - 1), y = randInt(rng, 2, 20), w = randInt(rng, 12, 30);
    wrapX(TW, o => { rect(g, x + o, y, w, 1, p.white); rect(g, x + 4 + o, y + 1, w - 6, 1, p.cloudShade); });
  }
  return c;
}

// Big, bright cumulus for the open sky over the foothills (0.07x)
function buildCumulus(p) {
  const TW = 576, TH = 60, rng = mulberry32(13);
  const [c, g] = makeCanvas(TW, TH);
  for (let i = 0; i < 5; i++) {
    const x0 = i * 115 + randInt(rng, 0, 50), base = randInt(rng, 34, 54), n = randInt(rng, 4, 6);
    const puffs = [];
    let x = x0;
    for (let j = 0; j < n; j++) {
      const mid = 1 - Math.abs(j - (n - 1) / 2) / n;
      const r = Math.max(4, Math.round((6 + rng() * 6) * (0.5 + mid * 0.7)));
      puffs.push([x, base - r + 2, r]);
      x += r + randInt(rng, 0, 3);
    }
    wrapX(TW, o => {
      for (const [cx, cy, r] of puffs) disc(g, cx + o, cy, r, p.cloudShade);
      for (const [cx, cy, r] of puffs) disc(g, cx + o, cy - 1, r, p.white);   // shade only on the underside
      g.clearRect(x0 - 16 + o, base + 2, x - x0 + 32, 20);
    });
  }
  return c;
}

// --- 5a. overhead: steel masts beside the far rail, and the wire (1.0x) ----
// The contact wire runs level at WIRE_Y; above it the catenary sags from
// mast to mast and carries it on droppers.
const MAST_SPACING = 96;
function buildWires(p) {
  const TW = 192, [c, g] = makeCanvas(TW, 14);                          // screen y WIRE_Y - 12 ..
  for (let x = 0; x < TW; x++) {
    const t = ((x - 48 + TW) % MAST_SPACING) / MAST_SPACING, s = Math.round(6 * 4 * t * (1 - t));
    px(g, x, 3 + s, p.grayDark);
    px(g, x, 12, p.grayDark);
    if (x % 12 === 0 && s < 8) for (let y = 5 + s; y < 12; y += 2) px(g, x, y, p.gray);   // droppers
  }
  return c;
}

function buildMasts(p) {
  const TW = 192, [c, g] = makeCanvas(TW, 143 - (WIRE_Y - 16) + 1);     // screen y WIRE_Y - 16 .. 143
  for (let x = 48; x < TW; x += MAST_SPACING) {
    rect(g, x, 0, 2, c.height, p.gray);
    rect(g, x + 1, 0, 1, c.height, p.grayDark);
    for (let y = 4; y < c.height - 4; y += 6) px(g, x, y, p.grayLight); // lattice
    rect(g, x - 5, 7, 7, 1, p.grayDark);                                // cantilever to the catenary
    pxLine(g, x - 5, 8, x - 1, 12, p.grayDark);                         // its stay
    rect(g, x - 4, 16, 4, 1, p.grayDark);                               // steady arm at the contact wire
    px(g, x - 1, 6, p.cloudShade);
    px(g, x - 1, 15, p.cloudShade);                                     // insulators
    rect(g, x - 1, c.height - 3, 4, 3, p.grayDark);                     // footing
  }
  return c;
}

// --- 5b. track: gravel bed, concrete sleepers, two rails (1.0x) -------
function buildTrack(p) {
  const TW = 192, TH = 20, rng = mulberry32(5);
  const [c, g] = makeCanvas(TW, TH);
  rect(g, 0, 3, TW, 12, p.gray);                                        // ballast top
  rect(g, 0, 15, TW, 3, p.grayDark);                                    // ballast shoulder
  for (let i = 0; i < TW * 8; i++) {
    const x = randInt(rng, 0, TW - 1), y = randInt(rng, 3, 17), r = rng();
    px(g, x, y, y >= 15 ? (r < 0.5 ? p.gray : p.brownDark)
                        : r < 0.4 ? p.grayLight : r < 0.8 ? p.grayDark : p.brown);
  }
  for (let x = 0; x < TW; x++) if (bayer(x, 3) < 8) px(g, x, 3, p.grayLight);
  for (let x = 2; x < TW; x += 8) {                                     // sleepers
    rect(g, x, 5, 4, 9, p.grayLight);
    rect(g, x + 3, 5, 1, 9, p.gray);
    rect(g, x, 13, 4, 1, p.grayDark);
    px(g, x, 5, p.cloudShade);
  }
  rect(g, 0, 6, TW, 1, p.cloudShade); rect(g, 0, 7, TW, 1, p.grayDark);  // far rail
  rect(g, 0, 11, TW, 1, p.cloudShade); rect(g, 0, 12, TW, 1, p.grayDark); // near rail (y 151)
  return c;
}

// --- 5c. Yarra bridge: open deck, piers, abutments, truss spans (1.0x) ----
// Same sleeper spacing as the track tile, but nothing under the sleepers
// except steel and, far below, the river.
function buildDeck(p) {
  const TW = 192, [c, g] = makeCanvas(TW, 20);
  rect(g, 0, 4, TW, 10, p.haze);
  ditherRect(g, 0, 4, TW, 10, p.greenDark, 7);
  for (const y of [8, 10]) rect(g, 0, y, TW, 1, p.grayDark);           // rail-bearing stringers
  for (let x = 2; x < TW; x += 8) {
    rect(g, x, 5, 4, 9, p.brown);
    rect(g, x + 3, 5, 1, 9, p.brownDark);
    px(g, x, 5, p.tan);
  }
  rect(g, 0, 6, TW, 1, p.cloudShade); rect(g, 0, 7, TW, 1, p.grayDark);
  rect(g, 0, 11, TW, 1, p.cloudShade); rect(g, 0, 12, TW, 1, p.grayDark);
  rect(g, 0, 14, TW, 1, p.grayDark);
  rect(g, 0, 15, TW, 1, p.ink);
  rect(g, 0, 16, TW, 4, p.haze);                                       // the river in the deck's shadow
  ditherRect(g, 0, 16, TW, 4, p.greenDark, 9);
  return c;
}

const TRUSS_Y = 96, PIER_Y = 155, REFLECT_AXIS = 158;

// One camelback through-truss span. The far truss sits behind the train
// (darker, a little higher); the near one is drawn over it.
function buildTruss(p, near) {
  const S = BRIDGE.span, P = 6, pw = S / P, bot = 57;
  const [c, g] = makeCanvas(S + 1, 62);
  const col = near ? p.gray : p.grayDark, hi = near ? p.grayLight : p.gray, dark = near ? p.grayDark : p.navy;
  const top = i => 4 + Math.round(6 * ((i - P / 2) / (P / 2 - 1)) ** 2);
  const line = (x0, y0, x1, y1, k) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= n; s++) px(g, Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n), k);
  };
  rect(g, 0, bot, S + 1, 2, col);                                       // bottom chord
  rect(g, 0, bot + 2, S + 1, 1, dark);
  for (let i = 1; i < P - 1; i++) {                                     // polygonal top chord
    line(i * pw, top(i), (i + 1) * pw, top(i + 1), hi);
    line(i * pw, top(i) + 1, (i + 1) * pw, top(i + 1) + 1, col);
  }
  line(0, bot, pw, top(1), hi); line(1, bot, pw + 1, top(1) + 1, col);  // inclined end posts
  line(S, bot, S - pw, top(P - 1), col); line(S - 1, bot, S - pw - 1, top(P - 1) + 1, dark);
  for (let i = 1; i < P; i++) rect(g, i * pw, top(i) + 2, 1, bot - top(i) - 2, col);   // verticals
  for (let i = 1; i < P - 1; i++) {                                     // diagonals slope down to mid-span
    if (i < P / 2) line(i * pw + 1, top(i) + 2, (i + 1) * pw - 1, bot - 1, col);
    else line((i + 1) * pw - 1, top(i + 1) + 2, i * pw + 1, bot - 1, col);
  }
  for (let i = 0; i <= P; i++) {                                        // gusset plates
    rect(g, i * pw - 1, bot - 1, 3, 3, dark);
    if (i > 0 && i < P) rect(g, i * pw - 1, top(i), 3, 2, dark);
  }
  if (near) for (let x = 3; x < S; x += 6) px(g, x, bot, p.grayLight);  // rivets
  return c;
}

// Bluestone pier under a span joint, its foot in the water
function buildPier(p) {
  const [c, g] = makeCanvas(11, 8);
  rect(g, 0, 0, 11, 1, p.grayLight);
  rect(g, 1, 1, 9, 7, p.gray);
  rect(g, 8, 1, 2, 7, p.grayDark);
  for (const [x, y] of [[3, 2], [6, 3], [2, 4], [5, 6]]) px(g, x, y, p.grayLight);
  rect(g, 1, 6, 9, 1, p.ink);                                          // waterline stain
  px(g, 0, 7, p.skyLight); px(g, 10, 7, p.skyLight);
  return c;
}

// Bluestone abutment where the embankment meets the river (mirrored for the far bank)
function buildAbutment(p, flip) {
  const [c, g] = makeCanvas(16, 15);
  if (flip) { g.translate(16, 0); g.scale(-1, 1); }
  rect(g, 0, 0, 16, 1, p.cloudShade);
  rect(g, 0, 1, 16, 14, p.gray);
  for (let y = 3; y < 15; y += 3) {
    rect(g, 0, y, 16, 1, p.grayDark);
    for (let x = (y % 6 ? 1 : 4); x < 16; x += 6) px(g, x, y - 1, p.grayDark);
  }
  rect(g, 14, 1, 2, 14, p.ink);                                        // face towards the water
  return c;
}

// 4x4 ordered-dither pattern of one colour; with lines, every other row is
// fourth row is filled solid as well (the ripple lines of a reflection)
function tintPattern(col, level, lines) {
  const [c, g] = makeCanvas(4, 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (bayer(x, y) < level || (lines && y === 3)) px(g, x, y, col);
  return g.createPattern(c, 'repeat');
}

// --- lighting variants: every sprite and tile, once per lighting -----
function buildVariant(name) {
  const def = LIGHTING[name], p = {}, rgba = {};
  for (const k in PALETTE) p[k] = PALETTE[def.map[k] || k];
  for (const k in p) {                                    // ImageData words (little-endian ABGR)
    const [r, gr, b] = hexToRgb(p[k]);
    rgba[k] = ((255 << 24) | (b << 16) | (gr << 8) | r) >>> 0;
  }
  const backdrops = {};
  for (const key in BACKDROPS) backdrops[key] = BACKDROPS[key].build(p, def.lit);
  return {
    name, lit: def.lit, p, rgba, puffs: [], people: new Map(),
    sprites: new Map(),                                   // terrain sprites, painted on first use
    chunks: { far: new Map(), mid: new Map(), fg: new Map() },
    clouds: buildClouds(p),
    cumulus: buildCumulus(p),
    masts: buildMasts(p),
    wires: buildWires(p),
    track: buildTrack(p),
    deck: buildDeck(p),
    pier: buildPier(p),
    abutment: [buildAbutment(p, false), buildAbutment(p, true)],
    trussNear: buildTruss(p, true),
    trussFar: buildTruss(p, false),
    waterTint: tintPattern(p.haze, 3, true),
    waterFade: Array.from({ length: 17 }, (_, l) => tintPattern(p.haze, l)),
    lead: buildLead(p, def.lit),
    cars: Array.from({ length: CONFIG.CAR_COUNT }, (_, i) => buildCar(p, def.lit, i)),
    wheels: buildWheels(p),
    backdrops,
    props: buildProps(p, def.lit),
    stations: STATIONS.map(st => buildStationSprites(st, p, def.lit)),
  };
}
