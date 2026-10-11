// Melbourne Pixel Train - Animated things: rowers, ducks, cyclists, trams, cars, dogs, kangaroos, lyrebird
'use strict';

// --- live entities -----------------------------------------------------------
// Every entity: { x0, x1 (layer columns it may cover), z (draw order),
// draw(g, v, ox, oy, t) } with screen x = lx + ox and screen y = y + oy.

// Glints on water: [lx, y, w, phase, rate] dashes that wink on and off
function shimmerEnt(dashes, z, cols = ['skyLight', 'white']) {
  let x0 = Infinity, x1 = -Infinity;
  for (const d of dashes) { x0 = Math.min(x0, d[0]); x1 = Math.max(x1, d[0] + d[2] + 1); }
  return { x0, x1, z, draw(g, v, ox, oy, t) {
    for (const [x, y, w, ph, rate] of dashes) {
      const s = Math.sin(t * rate + ph);
      if (s > 0.35) rect(g, x + ox + (s > 0.8 ? 1 : 0), y + oy, w, 1, v.p[s > 0.8 ? cols[1] : cols[0]]);
    }
  } };
}

// Split a long run of dashes into entities of ~64 px so culling stays cheap
function chunkedShimmer(ctx, dashes, z, cols) {
  dashes.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < dashes.length; ) {
    const grp = [], end = dashes[i][0] + 64;
    while (i < dashes.length && dashes[i][0] < end) grp.push(dashes[i++]);
    ctx.live(shimmerEnt(grp, z, cols));
  }
}

// Water running downhill: bright points travel along the path
function streamFlowEnt(pts, rng) {
  const ph = rng() * 6;
  let x0 = Infinity, x1 = -Infinity;
  for (const [x] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); }
  return { x0, x1, z: 1, draw(g, v, ox, oy, t) {
    for (let k = 0; k < pts.length; k++)
      if ((((k - t * 6 + ph) % 5) + 5) % 5 < 1) px(g, pts[k][0] + ox, pts[k][1] + oy, v.p.white);
  } };
}

// Mirror painter for the small figures drawn live: set origin and facing
// once, then plot offsets in palette keys (no closures in the frame loop)
const MP = { g: null, p: null, x: 0, y: 0, dir: 1 };
function mpAt(g, p, x, y, dir) { MP.g = g; MP.p = p; MP.x = x; MP.y = y; MP.dir = dir; }
function mp(dx, dy, key) { MP.g.fillStyle = MP.p[key]; MP.g.fillRect(MP.x + dx * MP.dir, MP.y + dy, 1, 1); }
function mpRect(dx, dy, w, h, key) {
  MP.g.fillStyle = MP.p[key];
  MP.g.fillRect(MP.dir > 0 ? MP.x + dx : MP.x - dx - w + 1, MP.y + dy, w, h);
}

const WHEEL_RING = [-1, -2, 0, -2, 1, -2, -2, -1, 2, -1, -2, 0, 2, 0, -2, 1, 2, 1, -1, 2, 0, 2, 1, 2];
function cycleWheel(cx, cy, spin) {
  for (let i = 0; i < WHEEL_RING.length; i += 2) mp(cx + WHEEL_RING[i], cy + WHEEL_RING[i + 1], 'ink');
  mp(cx, cy, 'grayLight');
  if (spin) { mp(cx, cy - 1, 'gray'); mp(cx, cy + 1, 'gray'); } else { mp(cx - 1, cy, 'gray'); mp(cx + 1, cy, 'gray'); }
}

// A rowing crew out on the river, sliding up and back on a slow loop:
// the bodies swing, the blades dip and leave puddles (n rowers)
function crewEnt(lx, wl, range, rng, n) {
  const ph = rng() * 6, shirt = pick(rng, ['white', 'red', 'navy', 'glow', 'skyLight']), half = n * 2 + 1;
  return { x0: lx - range - half - 4, x1: lx + range + half + 5, z: wl, draw(g, v, ox, oy, t) {
    const a = t * 0.05 + ph, dir = Math.cos(a) >= 0 ? 1 : -1, pull = (t * 0.9 + ph) % 1 < 0.4;
    mpAt(g, v.p, Math.round(lx + Math.sin(a) * range) + ox, wl + oy, dir);
    mpRect(-half, 0, 2 * half + 1, 1, 'white');                              // the shell
    mp(half + 1, 0, 'cloudShade');
    for (let i = 0; i < n; i++) {
      const x = -half + 2 + i * 4 + (pull ? 0 : 1);                           // rowers face the stern
      mp(x, -1, shirt); mp(x, -2, 'tan');
      const bx = x + (pull ? 2 : -1);
      mp(bx, pull ? 1 : 0, pull ? 'skyLight' : 'cream');                      // blade in the water / feathered
      if (pull) mp(bx + 1, 1, 'white');
    }
  } };
}

// Ducks paddling about a pond or the river; a black swan with its red bill
function waterfowlEnt(pd, rng, kind) {
  const ph = rng() * 6, sp = 0.15 + rng() * 0.2, range = pd.rx - 5, y = pd.cy + randInt(rng, -pd.ry + 1, pd.ry - 1);
  const swan = kind === 'swan', white = !swan && rng() < 0.3;
  return { x0: pd.cx - pd.rx - 2, x1: pd.cx + pd.rx + 2, z: y, draw(g, v, ox, oy, t) {
    const a = t * sp + ph, dir = Math.cos(a) >= 0 ? 1 : -1, body = swan ? 'ink' : white ? 'white' : 'brown';
    mpAt(g, v.p, Math.round(pd.cx + Math.sin(a) * range) + ox, y + oy - (Math.sin(t * 2.3 + ph) > 0.7 ? 1 : 0), dir);
    if (swan) {
      mpRect(-2, -1, 4, 1, body); mp(-2, -2, body); mp(-1, -2, body); mp(0, -2, body);
      mp(2, -2, body); mp(2, -3, body); mp(3, -4, body); mp(4, -4, 'red');     // the neck's S, the bill
    } else {
      mp(1, -2, white ? body : 'greenDark');                                  // head
      mp(2, -2, 'amber');                                                     // bill
      mpRect(-1, -1, 3, 1, body);
      mp(-2, -2, body);                                                       // tail up
    }
    if (Math.abs(Math.cos(a)) > 0.3) { mp(-3, 0, 'skyLight'); mp(-4, 1, 'skyLight'); }   // wake
  } };
}

// Someone on a bike along the trail, turning round at its ends
function cyclistEnt(a, b, y, rng) {
  const len = b - a - 30, ph = rng() * len * 2, sp = randInt(rng, 14, 22);
  const shirt = pick(rng, ['glow', 'red', 'skyMid', 'white', 'orange', 'grassLight']), legs = pick(rng, ['ink', 'navy', 'grayDark']);
  const skin = pick(rng, SKINS), helmet = pick(rng, ['white', 'red', 'ink', 'skyLight']);
  return { x0: a, x1: b, z: y, draw(g, v, ox, oy, t) {
    const s = (t * sp + ph) % (2 * len), fwd = s < len, spin = Math.floor(t * 8) & 1, pedal = Math.floor(t * 5) & 1;
    mpAt(g, v.p, Math.round(a + 15 + (fwd ? s : 2 * len - s)) + ox, y + oy, fwd ? 1 : -1);
    cycleWheel(-3, -2, spin); cycleWheel(4, -2, spin);
    mpRect(-2, -4, 6, 1, 'grayDark'); mp(0, -5, 'grayDark'); mpRect(3, -7, 1, 3, 'grayDark'); mp(4, -8, 'grayDark');
    mpRect(0, -11, 2, 4, shirt); mp(2, -10, shirt); mp(3, -9, skin);          // leaning to the bars
    mpRect(0, -13, 2, 1, helmet); mpRect(0, -12, 2, 1, skin);
    mpRect(0, -7, 2, 2, legs);
    if (pedal) { mp(1, -5, skin); mp(0, -4, skin); } else { mp(0, -5, skin); mp(1, -4, skin); }
  } };
}

// A runner, sometimes with the dog out in front on its lead
function joggerEnt(a, b, y, rng) {
  const len = b - a - 30, ph = rng() * len * 2, sp = randInt(rng, 9, 13);
  const top = pick(rng, ['rose', 'skyMid', 'glow', 'white', 'red', 'grassLight']), skin = pick(rng, SKINS), dog = rng() < 0.45;
  return { x0: a, x1: b, z: y, draw(g, v, ox, oy, t) {
    const s = (t * sp + ph) % (2 * len), fwd = s < len, f = Math.floor(t * 6 + ph) & 1;
    mpAt(g, v.p, Math.round(a + 15 + (fwd ? s : 2 * len - s)) + ox, y + oy, fwd ? 1 : -1);
    mpRect(0, -8, 2, 1, 'ink'); mpRect(0, -7, 2, 1, skin);
    mpRect(0, -6, 2, 3, top); mp(f ? 2 : -1, -5, skin);
    mpRect(0, -3, 2, 1, 'navy');
    if (f) { mp(-1, -2, skin); mp(2, -2, skin); mp(-2, -1, 'white'); mp(3, -1, 'white'); }
    else { mp(0, -2, skin); mp(1, -2, skin); mp(0, -1, 'white'); mp(1, -1, 'white'); }
    if (dog) { mpRect(6, -3, 4, 2, 'tan'); mp(10, -4, 'tan'); mp(6, -1, 'brown'); mp(9, -1, 'brown'); mp(f ? 5 : 6, -4, 'brown'); mp(4, -4, 'grayLight'); mp(3, -5, 'grayLight'); }
  } };
}

// A W-class tram trundling along its street and back, trolley pole
// trailing: green and cream, or a maroon City Circle car
function tramEnt(a, b, y, rng) {
  const len = b - a - 40, ph = rng() * len * 2, sp = randInt(rng, 14, 20), maroon = rng() < 0.45;
  return { x0: a, x1: b, z: y, draw(g, v, ox, oy, t) {
    const s = (t * sp + ph) % (2 * len), fwd = s < len, x = Math.round(a + 20 + (fwd ? s : 2 * len - s)) + ox, top = y + oy - 13;
    pxLine(g, x, top, x - (fwd ? 8 : -8), top - 4, v.p.grayDark);
    g.drawImage(cached(v, maroon ? 'tramM' : 'tramG', 31, 14, (gg, p, lit) => paintTram(gg, p, lit, maroon)), x - 15, top);
    if (v.lit) addLight(x + (fwd ? 15 : -15), top + 9, LIGHT_WINDOW);
  } };
}

function paintTram(g, p, lit, maroon) {
  const body = maroon ? p.rust : p.green, dark = maroon ? p.brownDark : p.greenDark, band = maroon ? p.glow : p.cream;
  rect(g, 3, 0, 25, 1, p.gray);                                                // clerestory roof
  rect(g, 1, 1, 29, 1, p.grayLight);
  rect(g, 0, 2, 31, 9, body);
  rect(g, 0, 2, 31, 1, band);
  for (const x of [2, 6, 22, 26]) windowPane(g, p, lit, x, 4, 3, 3);           // the two saloons
  rect(g, 11, 4, 9, 6, dark);                                                  // open drop-centre
  rect(g, 12, 4, 3, 5, lit ? PALETTE.amber : p.ink);
  rect(g, 16, 4, 3, 5, lit ? PALETTE.amber : p.ink);
  rect(g, 0, 8, 11, 1, band); rect(g, 20, 8, 11, 1, band);                     // waist band
  rect(g, 0, 10, 31, 1, dark);
  rect(g, 0, 4, 1, 3, p.skyLight); rect(g, 30, 4, 1, 3, p.skyLight);           // end windscreens
  px(g, 0, 9, PALETTE.glow); px(g, 30, 9, PALETTE.glow);                       // headlights
  rect(g, 2, 11, 8, 2, p.grayDark); rect(g, 21, 11, 8, 2, p.grayDark);         // bogies
  for (const x of [3, 7, 22, 26]) rect(g, x, 13, 2, 1, p.ink);
}

// A car, or a tradie's ute, up and down the street
const CAR_COLS = ['white', 'cloudShade', 'red', 'blue', 'grayDark', 'skyMid', 'cream', 'ink'];
function carEnt(a, b, y, rng) {
  const len = b - a - 24, ph = rng() * len * 2, sp = randInt(rng, 26, 40), col = pick(rng, CAR_COLS), ute = rng() < 0.25;
  return { x0: a, x1: b, z: y, draw(g, v, ox, oy, t) {
    const s = (t * sp + ph) % (2 * len), fwd = s < len, x = Math.round(a + 12 + (fwd ? s : 2 * len - s)) + ox, dir = fwd ? 1 : -1;
    mpAt(g, v.p, x, y + oy, dir);
    mpRect(-5, -3, 11, 2, col);
    if (ute) { mpRect(0, -5, 4, 2, col); mpRect(1, -5, 2, 1, 'skyLight'); mpRect(-5, -4, 5, 1, 'grayDark'); }
    else { mpRect(-3, -5, 7, 2, col); mpRect(-2, -5, 2, 1, 'skyLight'); mpRect(1, -5, 2, 1, 'skyLight'); }
    mpRect(-4, -1, 2, 1, 'ink'); mpRect(3, -1, 2, 1, 'ink');
    mp(-5, -3, 'red');
    if (v.lit) { g.fillStyle = PALETTE.glow; g.fillRect(x + dir * 5, y + oy - 3, 1, 1); addLight(x + dir * 7, y + oy - 3, LIGHT_WINDOW); }
    else mp(5, -3, 'cream');
  } };
}

function streetLampEnt(lx, y) {
  const e = spriteEnt(lx, y, 7, 16, 1, 15, 'slamp', (g, p, lit) => {
    rect(g, 1, 2, 1, 14, p.grayDark);
    rect(g, 1, 1, 5, 1, p.grayDark);
    rect(g, 4, 2, 2, 1, lit ? PALETTE.glow : p.cloudShade);
  });
  e.light = [lx + 4, y - 12, LIGHT_LAMP];
  return e;
}

// Red aviation light on a mast, winking after dark
function beaconEnt(lx, y) {
  return { x0: lx - 1, x1: lx + 2, z: 0, draw(g, v, ox, oy, t) {
    if (!v.lit || Math.sin(t * 2.2 + lx) < 0) return;
    g.fillStyle = LAMP_RED;
    g.fillRect(lx + ox, y + oy, 1, 1);
    addLight(lx + ox, y + oy, LIGHT_RED);
  } };
}

// Hills hoist: the washing goes round with the breeze
function hoistEnt(lx, y, rng) {
  const ph = rng() * 6, u = lx / PARALLAX.fg, wash = [0, 1, 2, 3].map(() => pick(rng, WASH));
  return { x0: lx - 7, x1: lx + 8, z: y, draw(g, v, ox, oy, t) {
    const p = v.p, x = lx + ox, top = y + oy - 10, a = t * 0.45 + ph + windAt(u, t) * 0.9;
    rect(g, x, top, 1, 10, p.grayLight);
    for (let k = 0; k < 4; k++) {
      const ax = Math.round(Math.cos(a + k * 1.5708) * 6), ay = Math.round(Math.sin(a + k * 1.5708) * 1.6);
      pxLine(g, x, top, x + ax, top + ay, p.gray);
      rect(g, x + Math.round(ax * 0.7), top + Math.round(ay * 0.7) + 1, 1, ay > 0 ? 3 : 2, p[wash[k]]);
    }
  } };
}

// A kid on the trampoline
function trampEnt(lx, y, rng) {
  const ph = rng() * 6, top = pick(rng, SHIRTS), skin = pick(rng, SKINS);
  return { x0: lx - 7, x1: lx + 8, z: y, draw(g, v, ox, oy, t) {
    const p = v.p, x = lx + ox, yy = y + oy, h = Math.round(Math.abs(Math.sin(t * 2.4 + ph)) * 7), ky = yy - 5 - h;
    rect(g, x - 6, yy - 4, 13, 1, p.blue);                                      // padding round the rim
    rect(g, x - 5, yy - 3, 11, 1, p.ink);
    rect(g, x - 5, yy - 2, 1, 3, p.gray); rect(g, x + 5, yy - 2, 1, 3, p.gray);
    px(g, x, ky - 4, p.brownDark); px(g, x, ky - 3, p[skin]); rect(g, x, ky - 2, 1, 2, p[top]);
    if (h > 3) { px(g, x - 1, ky - 3, p[skin]); px(g, x + 1, ky - 3, p[skin]); px(g, x - 1, ky, p.navy); px(g, x + 1, ky, p.navy); }   // star jump
    else px(g, x, ky, p.navy);
  } };
}

// A dog racing the train along the back fence, stopping to bark at it
const DOG_COLS = [['tan', 'brown'], ['white', 'cloudShade'], ['ink', 'grayDark'], ['brown', 'brownDark'], ['cream', 'tan']];
function dogEnt(lx, y, rng) {
  const ph = rng() * 9, col = pick(rng, DOG_COLS), range = 12;
  return { x0: lx - range - 6, x1: lx + range + 7, z: y, draw(g, v, ox, oy, t) {
    const a = t * 1.1 + ph, run = Math.abs(Math.cos(a)) > 0.25, f = Math.floor(t * 9 + ph) & 1;
    mpAt(g, v.p, Math.round(lx + Math.sin(a) * range) + ox, y + oy, Math.cos(a) >= 0 ? 1 : -1);
    mpRect(-2, -3, 5, 2, col[0]); mp(3, -4, col[0]); mp(4, -4, col[0]); mp(3, -5, col[1]);
    mp(-3, f ? -4 : -3, col[1]);                                                // tail going
    if (run && f) { mp(-3, -1, col[1]); mp(3, -1, col[1]); } else { mp(-2, -1, col[1]); mp(2, -1, col[1]); }
    if (!run && f) mp(6, -5, 'white');                                          // woof
  } };
}

// Two kids kicking a footy end to end
const JUMPERS = [['brown', 'glow'], ['navy', 'white'], ['ink', 'white'], ['red', 'white'], ['glow', 'ink'], ['red', 'navy']];
function footyEnt(cx, y, rng) {
  const ph = rng() * 9, ja = pick(rng, JUMPERS), jb = pick(rng, JUMPERS), xa = cx - 24, xb = cx + 24;
  return { x0: cx - 30, x1: cx + 30, z: y, draw(g, v, ox, oy, t) {
    const p = v.p, c = (t * 0.28 + ph) % 2, k = c % 1, right = c < 1;
    for (const [x, d, j] of [[xa, 1, ja], [xb, -1, jb]]) {
      const kick = (d > 0) === right && k < 0.14, mark = (d > 0) !== right && k > 0.86;
      mpAt(g, p, x + ox, y + oy, d);
      mp(0, -5, 'tan'); mp(0, -4, j[0]); mp(0, -3, j[1]); mp(0, -2, 'white'); mp(kick ? 1 : 0, -1, 'tan');
      if (mark) { mp(1, -6, 'tan'); mp(-1, -6, 'tan'); } else mp(1, -3, 'tan');   // arms up for the mark
    }
    const bx = Math.round(right ? xa + (xb - xa) * k : xb - (xb - xa) * k) + ox, by = Math.round(y - 4 - Math.sin(k * Math.PI) * 14) + oy;
    px(g, bx, by, p.red); px(g, bx + 1, by, p.rust);
  } };
}

// A kangaroo: bent over grazing, up on its tail to watch the train, then
// bounding along to somewhere else. cols is [coat, shade]: eastern greys
// in the paddocks, a dark swamp wallaby in the forest.
const ROO_COLS = [['grayLight', 'gray'], ['tan', 'brown'], ['gray', 'grayDark']];
function rooEnt(lx, y, rng, cols) {
  const ph = rng() * 30, range = randInt(rng, 9, 18), [c0, c1] = cols;
  return { x0: lx - range - 10, x1: lx + range + 10, z: y, draw(g, v, ox, oy, t) {
    const T = t * 0.2 + ph, c = T % 6, n = Math.floor(T / 6), from = (n & 1 ? 1 : -1) * range;
    const hop = c > 4.6, k = hop ? (c - 4.6) / 1.4 : 0, up = hop || c > 2.6;
    const x = lx + from - 2 * from * smoothstep(k), lift = hop ? Math.round(Math.abs(Math.sin(k * Math.PI * 4)) * 3) : 0;
    mpAt(g, v.p, Math.round(x) + ox, y + oy - lift, hop ? -Math.sign(from) : Math.sign(from));
    if (up) {
      mpRect(-2, -5, 3, 3, c0); mp(0, -6, c0); mp(1, -6, c0);                    // haunch and chest
      mp(1, -7, c0); mp(2, -7, c0); mp(1, -8, c1);                               // head, ear
      if (Math.floor(t * 2 + ph) % 5) mp(0, -8, c1);                             // the other ear flicks
      mp(1, -4, c1);                                                             // forepaw
      mp(-1, -2, c1); mp(0, -1, c1); mpRect(0, 0, 2, 1, c1);                     // hind leg, long foot
      mp(-3, -3, c1); mp(-4, -2, c1); mp(-5, hop ? -2 : -1, c1);                 // tail
    } else {
      const chew = Math.floor(t * 2 + ph) & 1;
      mpRect(-3, -4, 5, 2, c0); mp(-2, -5, c0); mp(-1, -5, c0);
      mp(-2, -2, c1); mp(-2, -1, c1); mpRect(-2, 0, 2, 1, c1);
      mp(2, -3, c0); mp(3, -2, c0); mp(3, -1 + chew, c0); mp(4, -1 + chew, c0); mp(2, -4, c1);   // head down in the grass
      mp(-4, -3, c1); mp(-5, -2, c1); mp(-6, -1, c1);
    }
  } };
}

// Far-off roos on a paddock slope: a few pixels each
function farRooEnt(H, i, rng) {
  const ph = rng() * 20, range = 10;
  return { x0: H.x0 + i - range - 4, x1: H.x0 + i + range + 4, z: 50, draw(g, v, ox, oy, t) {
    const a = t * 0.12 + ph, moving = Math.abs(Math.cos(a)) > 0.5, j = Math.round(i + Math.sin(a) * range);
    const hop = moving ? Math.round(Math.abs(Math.sin(t * 5 + ph)) * 2) : 0;
    mpAt(g, v.p, H.x0 + j + ox, humpTop(j, H.w, H.h, 36) + oy - hop, Math.cos(a) >= 0 ? 1 : -1);
    mp(0, -1, 'tan'); mp(0, -2, 'tan'); mp(-1, 0, 'brown'); mp(-2, 0, 'brown');
    if (moving || Math.sin(t * 0.5 + ph) > 0) { mp(1, -3, 'tan'); mp(1, -4, 'brown'); }
    else { mp(1, -1, 'tan'); mp(2, 0, 'tan'); }
  } };
}

// Walkers going up and down the 1000 Steps
function hikersEnt(cx, base, rng) {
  const n = STEPS_PATH.length, who = [0, 1, 2, 3, 4].map(k => [k * 2 * n / 5 + rng() * 20, pick(rng, ['red', 'glow', 'skyLight', 'white', 'orange', 'rose']), pick(rng, SKINS)]);
  return { x0: cx - 12, x1: cx + 26, z: 70, draw(g, v, ox, oy, t) {
    for (const [ph, top, skin] of who) {
      const s = Math.floor(t * 1.6 + ph) % (2 * n), [dx, dy] = STEPS_PATH[s < n ? s : 2 * n - 1 - s];
      px(g, cx + dx + ox, base + dy - 1 + oy, v.p[top]);
      px(g, cx + dx + ox, base + dy - 2 + oy, v.p[skin]);
    }
  } };
}

// A superb lyrebird scratching in the litter; every so often the tail goes
// up and over in display
const LYRE_TAIL = [[-2, -4], [-2, -5], [-1, -6], [0, -7], [1, -7], [2, -6], [-3, -6], [-1, -8], [3, -5]];
function lyrebirdEnt(lx, y, rng) {
  const ph = rng() * 20, dir = rng() < 0.5 ? 1 : -1;
  return { x0: lx - 9, x1: lx + 9, z: y, draw(g, v, ox, oy, t) {
    const show = (t * 0.3 + ph) % 8 > 6, peck = !show && (Math.floor(t * 3 + ph) & 1);
    mpAt(g, v.p, lx + ox, y + oy, dir);
    mpRect(-1, -3, 3, 2, 'brown'); mp(-1, -1, 'gray'); mp(1, -1, 'gray');
    if (peck) { mp(2, -2, 'brown'); mp(3, -1, 'brownDark'); } else { mp(2, -4, 'brown'); mp(3, -4, 'brownDark'); }
    if (show) for (const [dx, dy] of LYRE_TAIL) mp(dx, dy, (dx + dy) & 1 ? 'cream' : 'tan');
    else { mp(-2, -3, 'brown'); mp(-3, -3, 'tan'); mp(-4, -2, 'tan'); mp(-5, -2, 'cream'); mp(-6, -1, 'tan'); }
  } };
}
