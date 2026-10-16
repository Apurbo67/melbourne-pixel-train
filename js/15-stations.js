// Melbourne Pixel Train - Platforms, roofs, furniture, coffee cart, name boards, city and station backdrops
'use strict';

// =====================================================================
// 6. STATIONS
// =====================================================================
// Platforms are on the near side of the line, so passengers, benches and
// pillars stand in front of the train. Station content is laid out in
// "stop coordinates" - its screen x while the train stands there - so
//   screen x = stopX + station.dist - camera.

// Roof styles: y0/h of the roof sprite, pillarTop where pillars start
const ROOFS = {
  heritage: { y0: 82, h: 11, pillarTop: 90 },            // Flinders Street: iron verandahs with a timber valance
  canopy:   { y0: 86, h: 7, pillarTop: 93, span: [30, 258] },
  shelter:  { y0: 93, h: 7, pillarTop: 100, span: [186, 266] },
  scross:   { y0: 0, h: 44, pillarTop: 0, span: [-420, 560], open: true, pidY: 98 },   // Southern Cross: the wave roof, no posts on our platform
  under:    { y0: 0, h: 0, pillarTop: 0, span: [0, 0], open: true, pidY: 88, below: true },   // underground: the vault is the roof
};
const BOARD_TOP = 93;

let STATIONS, LAST_STATION;
function buildStations() {
  STATIONS = ROUTE.map((r, index) => {
    const st = { ...STATION_DEFAULTS, ...r, index };
    st.dist = st.at;
    st.layout = layoutStation(st);
    return st;
  });
  LAST_STATION = STATIONS.length - 1;
}
buildStations();
const stn = code => STATIONS.find(s => s.code === code);

// Kilometres from Flinders Street at world position d (the line is not
// compressed evenly, so this reads between the stations either side)
function kmAt(d) {
  for (let i = 1; i <= LAST_STATION; i++) {
    const a = STATIONS[i - 1], b = STATIONS[i];
    if (d <= b.dist || i === LAST_STATION) return a.km + (b.km - a.km) * Math.max(0, Math.min(1, (d - a.dist) / (b.dist - a.dist)));
  }
  return 0;
}

// Fixed furniture positions for one station (same in every lighting)
function layoutStation(st) {
  const [L, R] = st.platform, items = [];
  const clear = x => x > L + 6 && x < R - 12 && (x < PLAT.STALL_X - 10 || x > PLAT.STALL_X + 36) &&
                     Math.abs(x - PLAT.BOARD_X) > 34 + st.en.length * 2;      // keep the name board unobstructed
  const roof = ROOFS[st.roof], span = roof.span || [L, R];
  // roof pillars sit mid-carriage (41 px apart), clear of every door
  if (!roof.open) for (let x = Math.ceil((span[0] + 6) / 41) * 41; x <= span[1] - 6; x += 41) items.push({ type: 'pillar', x, y: 158 });
  const every = (start, step, fn) => { for (let x = start + step * Math.ceil((L - start) / step); x < R; x += step) fn(x); };
  if (!roof.open) every(30, 82, x => clear(x) && items.push({ type: 'lamp', x, y: 161 }));
  every(56, 82, x => clear(x) && clear(x + 10) && items.push({ type: 'bench', x, y: 166 }));
  every(76, 164, x => clear(x) && items.push({ type: 'bin', x, y: 164 }));
  for (const x of [70, 228]) if (roof.open || (x > span[0] + 8 && x < span[1] - 8)) items.push({ type: 'pid', x, y: 150 });   // next-train displays
  if (!roof.below) items.push({ type: 'myki', x: 256, y: 165 });                 // underground, the readers are up at the gates
  items.push({ type: roof.below ? 'vending' : 'stall', x: PLAT.STALL_X, y: PLAT.STALL_Y });
  items.push({ type: 'board', x: PLAT.BOARD_X, y: 159 });
  if (st.extras.includes('bikes'))
    for (const x of [326, 340]) if (clear(x)) items.push({ type: 'bikes', x, y: 160 });
  if (st.extras.includes('pigeons'))
    for (const [x, y, gull] of [[214, 171, 0], [222, 174, 0], [203, 176, 1], [-52, 172, 0], [-44, 176, 0], [352, 173, 1], [361, 170, 0], [470, 174, 0]])
      if (x > L + 6 && x < R - 8) items.push({ type: 'pigeon', x, y, gull });
  return items;
}

// --- shared furniture sprites; each has an anchor (ax, ay) at its foot --
function prop(w, h, ax, ay, paint) {
  const [c, g] = makeCanvas(w, h);
  paint(g);
  return { c, ax, ay };
}

function glowHalo(g, cx, cy, r0, r1, level) {
  const n = Math.ceil(r1);
  for (let y = -n; y <= n; y++)
    for (let x = -n; x <= n; x++) {
      const d = Math.hypot(x, y);
      if (d > r0 && d <= r1 && bayer(cx + x, cy + y) < level) px(g, cx + x, cy + y, PALETTE.glow);
    }
}

function buildProps(p, lit) {
  return {
    // lamp post: lantern head, warm dithered halo after dark
    lamp: prop(15, 64, 7, 63, g => {
      if (lit) glowHalo(g, 7, 8, 2, 7, 4);
      rect(g, 7, 9, 1, 52, p.grayDark);
      rect(g, 6, 61, 3, 3, p.gray);
      rect(g, 5, 6, 5, 1, p.grayDark);
      rect(g, 6, 7, 3, 2, lit ? PALETTE.glow : p.cloudShade);
      rect(g, 6, 9, 3, 1, p.grayDark);
    }),
    bench: prop(10, 5, 0, 4, g => {
      rect(g, 0, 0, 10, 1, p.grayLight);                 // backrest
      rect(g, 0, 1, 10, 1, p.gray);
      rect(g, 0, 2, 10, 1, p.cloudShade);                // seat
      rect(g, 1, 3, 1, 2, p.grayDark);
      rect(g, 8, 3, 1, 2, p.grayDark);
    }),
    bin: prop(4, 6, 1, 5, g => {                         // recycling: yellow lid
      rect(g, 0, 0, 4, 1, p.glow);
      rect(g, 0, 1, 4, 5, p.grayDark);
      rect(g, 3, 1, 1, 5, p.ink);
      px(g, 1, 2, p.white);
    }),
    // myki reader on its post
    myki: prop(5, 11, 2, 10, g => {
      rect(g, 2, 5, 1, 6, p.grayDark);
      rect(g, 0, 0, 5, 6, p.grayLight);
      rect(g, 1, 1, 3, 2, p.ink);
      px(g, 2, 1, lit ? PALETTE.glow : p.grassLight);
      rect(g, 1, 4, 3, 1, p.glow);
    }),
    // next-train display hanging under the roof
    pid: prop(17, 8, 8, 0, g => {
      rect(g, 8, 0, 1, 2, p.grayDark);
      rect(g, 0, 2, 17, 6, p.ink);
      rect(g, 1, 3, 15, 4, p.navy);
      rect(g, 2, 4, 8, 1, PALETTE.amber);                // BELGRAVE
      rect(g, 12, 4, 3, 1, PALETTE.white);               // 2 min
      rect(g, 2, 6, 6, 1, p.slate);
      rect(g, 12, 6, 2, 1, p.slate);
    }),
    // two bikes locked to a hoop
    bikes: prop(13, 8, 6, 7, g => {
      rect(g, 5, 1, 3, 1, p.grayLight); rect(g, 5, 2, 1, 6, p.grayLight); rect(g, 7, 2, 1, 6, p.grayLight);
      for (const [x, col] of [[0, p.red], [7, p.skyMid]]) {
        for (const wx of [x + 1, x + 4]) { rect(g, wx - 1, 5, 3, 3, p.ink); px(g, wx, 6, p.grayLight); }
        rect(g, x + 1, 4, 4, 1, col); px(g, x + 2, 3, col); px(g, x + 4, 3, p.grayDark); px(g, x + 5, 2, p.grayDark); px(g, x + 1, 3, p.ink);
      }
    }),
    stall: prop(27, 26, 0, 25, g => paintStall(g, p, lit)),
    // a drinks machine, lit up from inside
    vending: prop(14, 24, 0, 23, g => {
      rect(g, 0, 0, 14, 24, p.red);
      rect(g, 13, 0, 1, 24, p.rust);
      rect(g, 2, 2, 7, 15, p.ink);
      for (let y = 3; y < 16; y += 3) for (let x = 3; x < 9; x += 2) px(g, x, y, [p.skyMid, p.glow, p.grassLight, p.white][(x + y) % 4]);
      rect(g, 10, 4, 2, 6, p.grayDark); px(g, 10, 5, PALETTE.grassLight);
      rect(g, 2, 19, 9, 2, p.ink);
    }),
  };
}

// Coffee cart: black and white awning, the espresso machine steaming on
// the counter, a jar of biscuits, cups stacked up
function paintStall(g, p, lit) {
  rect(g, 2, 4, 23, 12, p.brownDark);                    // dim interior
  rect(g, 3, 8, 21, 1, p.brown);                         // back shelf: cups and syrups
  for (const [x, k] of [[4, 'white'], [5, 'white'], [7, 'cream'], [20, 'rust'], [22, 'paddy'], [23, 'white']]) px(g, x, 7, p[k]);
  // the barista behind the counter
  rect(g, 14, 10, 3, 1, p.ink);
  px(g, 14, 11, p.ink); rect(g, 15, 11, 2, 2, p.tan);
  rect(g, 13, 13, 5, 3, p.grayDark);
  px(g, 15, 14, p.white);
  // bare bulb on a cord
  rect(g, 11, 3, 1, 2, p.ink);
  if (lit) glowHalo(g, 11, 5, 1.2, 4.6, 5);
  px(g, 11, 5, lit ? PALETTE.glow : p.cloudShade);
  // striped awning and posts
  rect(g, 0, 0, 27, 1, p.grayDark);
  for (let x = 0; x < 27; x++) rect(g, x, 1, 1, 2, (x >> 1) & 1 ? p.white : p.ink);
  for (let x = 0; x < 27; x += 2) px(g, x, 3, p.ink);
  rect(g, 1, 3, 1, 23, p.grayDark);
  rect(g, 25, 3, 1, 23, p.grayDark);
  // espresso machine: steel box, two group heads, a cup under one
  rect(g, 3, 11, 7, 5, p.grayLight);
  rect(g, 3, 11, 7, 1, p.cloudShade);
  rect(g, 4, 13, 5, 1, p.grayDark);
  px(g, 5, 14, p.ink); px(g, 7, 14, p.ink);
  px(g, 5, 15, p.white);
  px(g, 9, 12, lit ? PALETTE.amber : p.red);
  // jar of biscuits, a stack of takeaway cups
  rect(g, 10, 12, 3, 1, p.red);
  rect(g, 10, 13, 3, 3, p.skyLight);
  rect(g, 11, 14, 1, 2, p.tan);
  rect(g, 21, 12, 2, 4, p.white);
  rect(g, 21, 13, 2, 1, p.cloudShade);
  // counter
  rect(g, 0, 16, 27, 1, p.cream);
  rect(g, 1, 17, 25, 9, p.navy);
  rect(g, 2, 18, 23, 7, p.ink);
  drawText(g, 'COFFEE', 2, 19, p.white);
}

// --- per-station sprites: platform slab, roof, name board -------------
function buildStationSprites(st, p, lit) {
  const [L, R] = st.platform, roof = ROOFS[st.roof];
  const span = roof.span || [L, R];
  return {
    slab: st.roof === 'under' ? buildTiledSlab(p, R - L, UNDER_STYLES[st.under]) : buildSlab(p, R - L, st.index),
    roof: st.roof === 'heritage' ? buildVerandah(p, span[1] - span[0]) : st.roof === 'scross' ? buildWaveRoof(p, lit, span[1] - span[0])
        : st.roof === 'under' ? null : buildTinRoof(p, span[1] - span[0], st.roofColor),
    roofX: span[0], roofY: roof.y0,
    board: buildBoard(p, st, lit),
    backs: st.back.map(key => BACKS[key].build(p, lit, st)),
  };
}

// Raised concrete platform seen from slightly above: coping, yellow safety
// line along the track edge, paved surface, then the front face.
function buildSlab(p, w, seed) {
  const rng = mulberry32(300 + seed);
  const [c, g] = makeCanvas(w, 32);                      // screen y 148..179
  rect(g, 0, 0, w, 1, p.cloudShade);
  rect(g, 0, 1, w, 23, p.grayLight);
  rect(g, 0, 2, w, 1, p.glow);                           // safety line
  for (const y of [9, 16]) rect(g, 0, y, w, 1, p.gray);
  [[3, 6], [10, 6], [17, 7]].forEach(([y, h], r) => {
    for (let x = (r * 7) % 16; x < w; x += 16) rect(g, x, y, 1, h, p.gray);
  });
  for (let i = 0; i < w / 3; i++) px(g, randInt(rng, 0, w - 1), randInt(rng, 3, 23), rng() < 0.6 ? p.gray : p.cloudShade);
  rect(g, 0, 24, w, 1, p.cloudShade);
  rect(g, 0, 25, w, 7, p.gray);
  rect(g, 0, 29, w, 3, p.grayDark);
  for (let x = 5; x < w; x += 24) rect(g, x, 25, 1, 7, p.grayDark);
  rect(g, 0, 0, 1, 32, p.grayDark);
  rect(g, w - 1, 0, 1, 32, p.grayDark);
  return c;
}

// Flinders Street: a long corrugated-iron verandah, dark green, with a
// cream fascia and a scalloped timber valance hanging from its edge
function buildVerandah(p, w) {
  const [c, g] = makeCanvas(w, ROOFS.heritage.h);
  rect(g, 0, 0, w, 1, p.greenDeep);
  rect(g, 0, 1, w, 5, p.greenDark);
  for (let x = 1; x < w; x += 3) rect(g, x, 1, 1, 5, p.green);   // corrugations
  rect(g, 0, 6, w, 1, p.cream);
  rect(g, 0, 7, w, 1, p.tan);
  for (let x = 0; x < w; x++) {
    const k = x % 6;
    rect(g, x, 8, 1, k === 0 ? 0 : k === 3 ? 3 : k === 2 || k === 4 ? 2 : 1, p.cream);
  }
  return c;
}

function buildTinRoof(p, w, color) {
  const [c, g] = makeCanvas(w, 7);
  const base = p[color], dark = p[{ red: 'rust', blue: 'navy', gray: 'grayDark', brown: 'brownDark', glow: 'amber', vline: 'purple', skyMid: 'skyDeep' }[color] || 'greenDark'];
  rect(g, 1, 0, w - 2, 1, dark);
  rect(g, 0, 1, w, 4, base);
  for (let x = 1; x < w; x += 3) rect(g, x, 1, 1, 4, dark);   // corrugations
  rect(g, 0, 5, w, 1, p.grayLight);
  rect(g, 0, 6, w, 1, p.grayDark);
  return c;
}

// Station name board on two posts: white on blue
function buildBoard(p, st, lit) {
  const ew = textWidth(st.en), bw = ew + 10, bh = 13, h = 160 - BOARD_TOP;
  const [c, g] = makeCanvas(bw, h);
  for (const x of [3, bw - 5]) { rect(g, x, bh, 2, h - bh, p.grayDark); rect(g, x, bh, 1, h - bh, p.gray); }
  rect(g, 0, 0, bw, bh, p.navy);
  rect(g, 1, 1, bw - 2, bh - 2, p.blue);
  rect(g, 1, 1, bw - 2, 2, p[LINE.stripe]);             // the line's colour along the top
  drawText(g, st.en, 5, 6, lit ? PALETTE.cloudShade : p.white);     // lit from inside after dark
  return c;
}

// --- station backdrops: drawn in a parallax layer behind the line ------
// sx is the sprite's screen x while the train stands at the station.
const BACKDROPS = {
  city:      { layer: 'far', sx: -84, y: 52, build: buildCity },       // the towers of the CBD
  flinders:  { layer: 'mid', sx: -10, y: 62, build: buildFlinders },   // the station building itself
  scrossMid: { layer: 'mid', sx: -170, y: 78, build: (p, lit) => buildScrossMid(p, lit) }, // Southern Cross: the other platforms and their trains
};
// Station structures right behind the train (1.0x), drawn before it
const BACKS = {
  scrossBack: { sx: -420, y: 0, build: (p, lit, st) => buildScrossBack(p, lit, st) },               // the white columns holding up the wave roof
};

// The city seen from the platforms, looking north: glass and concrete
// towers highest about Collins Street, the twin slabs of the Rialto at the
// western end, St Paul's spires beside the station
function buildCity(p, lit) {
  const TW = 600, TH = 60, rng = mulberry32(61);
  const [c, g] = makeCanvas(TW, TH);
  const tower = (x, w, h, col, side, win) => {
    const top = TH - h;
    rect(g, x, top, w, h, col);
    rect(g, x + w - 1, top, 1, h, side);
    for (let yy = top + 2; yy < TH - 2; yy += 3)
      for (let xx = x + 2; xx < x + w - 2; xx += 3) {
        const on = rng() < 0.35, warm = rng() < 0.7;       // always roll: same city in every lighting
        px(g, xx, yy, lit && on ? (warm ? PALETTE.glow : PALETTE.amber) : win);
      }
    return top;
  };
  const env = x => Math.max(0.12, 1 - Math.abs(x - 245) / 250);       // how high the skyline stands at x
  const row = (hMax, glassy, cols) => {
    for (let x = randInt(rng, 0, 6); x < TW - 12; ) {
      const w = randInt(rng, 8, 19), h = Math.max(4, Math.round(randInt(rng, 12, hMax) * env(x))), glass = rng() < glassy;
      const top = glass ? tower(x, w, h, p.skyMid, p.skyDeep, p.skyLight) : tower(x, w, h, cols[0], cols[1], cols[1]);
      if (rng() < 0.2 && h > 24) { rect(g, x + (w >> 1), top - 5, 1, 5, p.grayDark); px(g, x + (w >> 1), top - 6, p.red); }
      x += w + randInt(rng, 0, 3) + (env(x) < 0.4 ? randInt(rng, 6, 18) : 0);
    }
  };
  row(46, 0.4, [p.cloudShade, p.grayLight]);
  let t = tower(104, 9, 46, p.blue, p.navy, p.skyDeep);                // the Rialto
  tower(114, 8, 39, p.blue, p.navy, p.skyDeep);
  rect(g, 108, t - 5, 1, 5, p.grayLight); px(g, 108, t - 6, p.red);
  t = tower(232, 13, 48, p.cloudShade, p.grayLight, p.gray);           // 120 Collins and its mast
  rect(g, 235, t - 3, 7, 3, p.cloudShade);
  rect(g, 238, t - 9, 1, 6, p.white); px(g, 238, t - 10, p.red);
  t = tower(258, 11, 44, p.grayLight, p.gray, p.grayDark);             // 101 Collins
  rect(g, 263, t - 6, 1, 6, p.cloudShade);
  t = tower(196, 12, 50, p.skyMid, p.skyDeep, p.skyLight);
  rect(g, 198, t - 1, 8, 1, p.skyMid);
  row(30, 0.2, [p.grayLight, p.gray]);
  for (const [x, h] of [[392, 17], [400, 25], [408, 17]]) {            // St Paul's
    for (let k = 0; k < h; k++) { const hw = Math.round(k / h * 2.4); rect(g, x - hw, TH - 12 - h + k, 2 * hw + 1, 1, k > h - 3 ? p.tan : p.cream); }
    rect(g, x - 3, TH - 12, 7, 12, p.cream); rect(g, x + 3, TH - 12, 1, 12, p.tan);
  }
  rect(g, 388, TH - 9, 26, 9, p.cream);
  return c;
}

// Flinders Street Station: the long mustard range with its red banding and
// arched windows, the clock tower at the Elizabeth Street end and the
// copper dome over the steps at Swanston Street
function buildFlinders(p, lit) {
  const TW = 300, TH = 58, rng = mulberry32(73), ROOF = 28, WALL = 30, LEN = 256;
  const [c, g] = makeCanvas(TW, TH);
  rect(g, 0, ROOF, LEN, 2, p.gray);                                    // slate roof
  rect(g, 0, WALL, LEN, TH - WALL, p.peach);
  for (const y of [WALL, WALL + 8, WALL + 17]) rect(g, 0, y, LEN, 1, p.rust);
  for (let x = 4; x < LEN - 4; x += 7) {                               // two storeys of arched windows over an arcade
    for (const y of [WALL + 2, WALL + 10]) {
      const on = rng() < 0.45;
      rect(g, x, y + 1, 3, 4, lit && on ? PALETTE.glow : p.brownDark);
      px(g, x + 1, y, lit && on ? PALETTE.amber : p.brownDark);
    }
    rect(g, x - 1, WALL + 20, 5, TH - WALL - 20, p.brown);
    rect(g, x, WALL + 19, 3, 1, p.brown);
  }
  for (let x = 70; x < LEN - 30; x += 52) {                            // gabled bays along the roof
    for (let k = 0; k < 5; k++) rect(g, x + 4 - k, ROOF - 5 + k, 2 * k + 1, 1, p.peach);
    rect(g, x - 1, ROOF, 11, 1, p.rust);
    px(g, x + 4, ROOF - 2, p.brownDark);
  }
  // the clock tower
  const tx = 22;
  rect(g, tx, 10, 13, WALL - 10, p.peach);
  rect(g, tx + 12, 10, 1, WALL - 10, p.orange);
  for (const y of [10, 20, 26]) rect(g, tx - 1, y, 15, 1, p.rust);
  disc(g, tx + 6, 15, 3, p.white);
  px(g, tx + 6, 15, p.ink); px(g, tx + 6, 14, p.ink); px(g, tx + 7, 15, p.ink);
  disc(g, tx + 6, 5, 4, p.haze);                                       // its little copper cap
  rect(g, tx + 2, 5, 9, 5, p.cream);
  for (const x of [tx + 3, tx + 6, tx + 9]) rect(g, x, 6, 1, 3, p.brownDark);
  rect(g, tx + 1, 5, 11, 1, p.rust);
  rect(g, tx + 6, 0, 1, 2, p.glow);
  // the dome
  const dx = 276;
  rect(g, dx - 22, 24, 44, TH - 24, p.peach);
  rect(g, dx - 23, 24, 46, 1, p.rust);
  rect(g, dx + 21, 25, 1, TH - 25, p.orange);
  disc(g, dx, 17, 12, p.haze);
  for (const k of [-8, -4, 0, 4, 8]) for (let y = 6; y < 17; y++) if ((17 - y) ** 2 + k * k < 150) px(g, dx + k, y, p.greenDark);   // ribs
  rect(g, dx - 14, 17, 28, 7, p.cream);                                // drum
  for (let x = dx - 12; x < dx + 12; x += 4) rect(g, x, 19, 2, 4, lit ? PALETTE.amber : p.brownDark);
  rect(g, dx - 15, 17, 30, 1, p.rust);
  rect(g, dx - 1, 1, 3, 4, p.cream);                                   // lantern and finial
  px(g, dx, 0, p.glow);
  disc(g, dx, 44, 9, p.brownDark);                                     // the arch over the steps
  rect(g, dx - 9, 44, 19, TH - 44, p.brownDark);
  rect(g, dx - 11, 32, 23, 3, p.cream);                                // and the row of clocks under it
  for (let x = dx - 9; x <= dx + 9; x += 3) px(g, x, 33, p.ink);
  return c;
}

function drawBackdrops(g, v, layer) {
  const f = PARALLAX[layer];
  for (const st of STATIONS)
    for (const key of st.backdrop) {
      if (!v.backdrops[key]) continue;
      const b = BACKDROPS[key];
      if (b.layer !== layer) continue;
      const spr = v.backdrops[key];
      const x = b.sx + Math.floor(st.dist * f) - Math.floor(sim.dist * f);   // same stepping as the tiles
      if (x < W && x + spr.width > 0) g.drawImage(spr, x, b.y);
    }
}

// Station structures behind the train (Southern Cross's columns)
function drawStationBack(g, v) {
  const cam = Math.floor(sim.dist);
  for (let i = 0; i < STATIONS.length; i++) {
    const st = STATIONS[i], s = v.stations[i];
    st.back.forEach((key, k) => {
      const b = BACKS[key], spr = s.backs[k], x = b.sx + st.dist - cam;
      if (x < W && x + spr.width > 0) g.drawImage(spr, x, b.y);
    });
  }
}

// --- near-side platform: slab, then furniture and people sorted by depth
const frontItems = [], byY = (a, b) => a.y - b.y;
function drawStationFront(g, v) {
  const cam = Math.floor(sim.dist);
  for (let i = 0; i < STATIONS.length; i++) {
    const st = STATIONS[i], off = st.dist - cam;
    const s = v.stations[i], r0 = s.roof ? s.roofX + off : 0, r1 = s.roof ? r0 + s.roof.width : 0;
    if ((st.platform[0] + off >= W + 40 || st.platform[1] + off <= -40) && (r0 >= W || r1 <= 0)) continue;
    g.drawImage(s.slab, st.platform[0] + off, PLAT.TOP);
    if (st.psd) drawScreenDoors(g, v, st, off);
    if (drive.on && !ui.title) drawStopMark(g, v, off);
    if (i === LAST_STATION) drawBuffer(g, v, off);
    frontItems.length = 0;
    for (let k = 0; k < st.layout.length; k++) frontItems.push(st.layout[k]);
    for (let k = 0; k < sim.people.length; k++) { const q = sim.people[k]; if (q.st === i && !q.hidden) frontItems.push(q); }
    frontItems.sort(byY);
    for (let k = 0; k < frontItems.length; k++) { const it = frontItems[k]; it.d ? drawPersonAt(g, v, it, off) : drawProp(g, v, st, it, off); }
    if (s.roof) g.drawImage(s.roof, s.roofX + off, s.roofY);
  }
  drawBubbles(g);
}

// Platform screen doors (the Metro Tunnel): a glass wall along the edge,
// a pair of doors at every train door, opening with them
function drawScreenDoors(g, v, st, off) {
  const p = v.p, [L, R] = st.platform, top = 117, bot = PLAT.TOP + 2, here = sim.station === st.index && sim.state === 'STOPPED';
  const k = here ? Math.round(sim.doorOpen * (DOOR_W + 1)) : 0, so = here ? Math.round(sim.stopOffset) : 0;
  const x0 = Math.max(L + off, -2), x1 = Math.min(R + off, W + 2);
  if (x1 <= x0) return;
  rect(g, x0, top, x1 - x0, 3, p.ink);                                           // the header, its lights
  for (let x = x0; x < x1; x++) {
    const sx = x - off;
    let inDoor = -1;
    for (let d = 0; d < DOORS.length; d++) if (sx >= DOORS[d] + so - 1 && sx < DOORS[d] + so + DOOR_W + 1) { inDoor = sx - (DOORS[d] + so - 1); break; }
    if (inDoor >= 0) {                                                            // a door: two leaves sliding apart
      const half = (DOOR_W + 2) / 2, open = inDoor < half ? inDoor < half - k / 2 : inDoor >= half + k / 2;
      if (!open) continue;
      if (inDoor === 0 || inDoor === DOOR_W + 1) rect(g, x, top + 3, 1, bot - top - 3, p.grayLight);
      for (let y = top + 3; y < bot; y++) if (bayer(x, y) < 3) px(g, x, y, p.skyLight);
      continue;
    }
    if (sx % 41 === 0) { rect(g, x, top + 3, 1, bot - top - 3, p.grayLight); continue; }   // the fixed panels' frames
    for (let y = top + 3; y < bot; y++) if (bayer(x, y) < 2) px(g, x, y, p.skyLight);
    if ((sx & 7) === 0) px(g, x, top + 1, here && sim.doorOpen > 0 ? PALETTE.grassLight : p.grayDark);
  }
  rect(g, x0, bot - 2, x1 - x0, 1, p.grayLight);
}

// Where a driver stops: a board at the platform edge, level with the
// train's nose when it stands on the mark
function drawStopMark(g, v, off) {
  const p = v.p, x = CONFIG.TRAIN_FRONT_X + 2 + off;
  if (x < -4 || x > W + 4) return;
  rect(g, x, 149, 1, 8, p.grayDark);
  rect(g, x - 2, 144, 5, 5, p.ink);
  rect(g, x - 1, 145, 3, 3, p.glow);
  px(g, x, 146, p.ink);
}

// The end of the line at Belgrave: a striped buffer beam on a braced frame
function drawBuffer(g, v, off) {
  const p = v.p, x = CONFIG.TRAIN_FRONT_X + BUFFER_O + 2 + off;
  if (x < -16 || x > W + 4) return;
  rect(g, x + 3, 131, 2, 15, p.grayDark);              // post with a lamp on top
  px(g, x + 3, 131, PALETTE.red);
  rect(g, x, 135, 3, 6, p.red);                        // buffer beam at coupler height
  for (let y = 136; y < 141; y += 2) rect(g, x, y, 3, 1, p.white);
  for (let k = 0; k < 8; k++) px(g, x + 5 + k, 138 + k, p.gray);   // brace
  rect(g, x - 1, 146, 16, 1, p.grayDark);
}

function drawProp(g, v, st, it, off) {
  const p = v.p, x = it.x + off;
  if (it.type === 'pillar') {
    const top = ROOFS[st.roof].pillarTop, h = it.y - top + 1;
    if (st.roof === 'heritage') {                        // fluted iron column with scrolled brackets
      rect(g, x - 1, top, 3, h, p.greenDark);
      rect(g, x, top, 1, h, p.green);
      rect(g, x - 2, it.y - 1, 5, 2, p.greenDark);
      for (let k = 1; k <= 3; k++) { px(g, x - 1 - k, top + 4 - k, p.cream); px(g, x + 1 + k, top + 4 - k, p.cream); }
    } else {                                             // steel post
      rect(g, x, top, 2, h, p.grayDark);
      rect(g, x, top, 1, h, p.gray);
      px(g, x - 1, top, p.grayDark);
      px(g, x + 2, top, p.grayDark);
    }
  } else if (it.type === 'board') {
    const b = v.stations[st.index].board;
    g.drawImage(b, x - (b.width >> 1), BOARD_TOP);
  } else if (it.type === 'pid') {
    const r = ROOFS[st.roof], spr = v.props.pid, y = r.pidY || r.y0 + r.h;
    if (r.pidY) rect(g, x, y - 12, 1, 12, p.grayDark);                             // hung on a rod
    g.drawImage(spr.c, x - spr.ax, y);
    addLight(x, y + 5, LIGHT_BULB);
  } else if (it.type === 'pigeon') {                     // pecking about, hopping a step now and then
    const f = Math.floor(sim.clock * 2.5 + it.x) % 5, body = it.gull ? 'white' : 'gray';
    mpAt(g, p, x + (Math.floor(sim.clock * 0.35 + it.x * 0.7) & 1), it.y, it.x & 1 ? 1 : -1);
    mpRect(-1, -2, 3, 2, body); mp(-2, -2, it.gull ? 'grayLight' : 'grayDark');
    mp(2, f ? -3 : -1, it.gull ? 'white' : 'slate'); mp(3, f ? -3 : -1, 'amber');
    mp(0, 0, 'rose');
  } else {
    const spr = v.props[it.key || it.type];
    g.drawImage(spr.c, x - spr.ax, it.y - spr.ay);
    if (it.type === 'lamp') addLight(x, it.y - 55, LIGHT_LAMP);
    else if (it.type === 'stall') { drawSteam(g, v, x + 9, it.y - 16); addLight(x + 11, it.y - 20, LIGHT_BULB); }
  }
}

// Steam curling up from the kettle spout: a few dithered wisps on a loop
function drawSteam(g, v, x, y) {
  for (let i = 0; i < 4; i++) {
    const ph = (sim.clock * 0.6 + i / 4) % 1;
    const sx = x + Math.round(Math.sin(ph * 6 + i * 2) * 1.2 + ph * 2), sy = y - Math.floor(ph * 11);
    if (bayer(sx, sy) < (1 - ph) * 22) px(g, sx, sy, v.p.white);
    if (ph < 0.45) px(g, sx + 1, sy - 1, v.p.cloudShade);
  }
}
