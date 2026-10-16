// Melbourne Pixel Train - The six-car set in each line's livery: car and cab sprites, pantographs, doors, horn, exhaust
'use strict';

// =====================================================================
// 4. TRAIN
// =====================================================================
// A six-car set heading right: the leading car carries the driver's cab.
// The whole train stays fixed on screen. Each line runs its own kind of
// train (LINE.train), painted from one of the TRAIN_STYLES below:
//   xtrap    Alstom X'Trapolis 100: white, a blue cantrail, yellow doors
//   siemens  Siemens Nexas: silver, Metro's blue facets, a yellow-framed face
//   comeng   Comeng: ribbed stainless steel, blue doors, a flat yellow face
//   hcmt     the High Capacity Metro Train: white, a black window band, a raked black nose
//   vlocity  V/Line's VLocity diesel: silver and purple, a yellow nose, no pantographs
const TRAIN_STYLES = {
  xtrap:   { pantos: [0, 2, 3, 5], body: 'white', edge: 'cloudShade', cant: 'blue', band: 'navy', bandRows: [4, 5],
             skirt: 'blue', door: 'glow', doorEdge: 'amber', pods: true,
             nose: [37, 38, 40, 41, 42, 43, 44, 45, 45, 45, 45, 45, 45, 45, 45, 45], face: r => r < 10 ? 'blue' : r === 15 ? 'amber' : 'glow',
             map: ['white', 'blue'] },
  siemens: { pantos: [0, 2, 3, 5], body: 'cloudShade', edge: 'grayLight', cant: 'grayLight', band: 'navy', bandRows: [4, 5],
             skirt: 'grayLight', door: 'skyMid', doorEdge: 'blue', pods: true, facets: true,
             nose: [38, 39, 40, 41, 42, 43, 43, 44, 44, 44, 45, 45, 45, 45, 45, 45],
             face: r => r < 2 ? 'cloudShade' : r < 10 ? 'glow' : r < 13 ? 'skyMid' : 'white',
             map: ['cloudShade', 'skyMid'] },
  comeng:  { pantos: [0, 2, 3, 5], body: 'grayLight', edge: 'gray', cant: 'gray', band: 'indigo', bandRows: [5, 4],
             skirt: 'blue', door: 'blue', doorEdge: 'navy', pods: true, ribs: true,
             nose: [40, 41, 42, 42, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43],
             face: r => r < 2 ? 'grayLight' : r < 9 ? 'white' : r < 11 ? 'blue' : 'glow',
             map: ['grayLight', 'blue'] },
  hcmt:    { pantos: [0, 2, 3, 5], body: 'white', edge: 'cloudShade', cant: 'ink', band: 'ink', bandRows: [3, 7],
             skirt: 'skyMid', door: 'white', doorEdge: 'skyMid', pods: false,
             nose: [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 45, 45, 45],
             face: r => r < 9 ? 'ink' : r < 11 ? 'skyMid' : r < 15 ? 'white' : 'grayLight',
             map: ['white', 'ink'] },
  vlocity: { pantos: [], body: 'cloudShade', edge: 'grayLight', cant: 'grayLight', band: 'ink', bandRows: [4, 5],
             skirt: 'vline', door: 'lilac', doorEdge: 'vline', pods: true, exhaust: true, swoosh: true,
             nose: [35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 45, 45, 45, 45, 45, 45],
             face: r => r < 2 ? 'grayLight' : r < 11 ? 'glow' : r < 13 ? 'vline' : 'cloudShade',
             map: ['cloudShade', 'vline'] },
};
let STYLE = TRAIN_STYLES[LINE.train];
const TRAIN = (() => {
  const leadX = CONFIG.TRAIN_FRONT_X - CONFIG.LOCO_W;
  const vehicles = [{ x: leadX, w: CONFIG.LOCO_W, y: LAYER_Y.loco, wheels: [5, 13, 25, 33] }];
  let x = leadX;
  for (let i = 0; i < CONFIG.CAR_COUNT; i++) {
    x -= CONFIG.CAR_GAP + CONFIG.CAR_W;
    vehicles.push({ x, w: CONFIG.CAR_W, y: LAYER_Y.car, wheels: [5, 13, 25, 33] });
  }
  return { vehicles, centerX: (x + CONFIG.TRAIN_FRONT_X) / 2, pantos: STYLE.pantos };
})();
const WIRE_Y = 112;                                   // the contact wire, 9 px above the roofs
const DOOR_AT = [7, 28], DOOR_W = 4;                  // two doorways a side on every car
const WINDOWS = [2, 12, 17, 22, 33];                  // left edge of each 4 px saloon window
const CAB_AT = 35;                                    // where the lead car's saloon ends and the cab begins
// What the driver does to get power: raise the pantographs, or start the diesels
let DIESEL, TRACTION;
function trainStyle() {
  STYLE = TRAIN_STYLES[LINE.train];
  TRAIN.pantos = STYLE.pantos;
  DIESEL = !!STYLE.exhaust;
  TRACTION = DIESEL
  ? { up: 'START THE ENGINE', down: 'STOP THE ENGINE', rising: 'STARTING THE ENGINE...', on: 'ENGINE RUNNING',
      coasting: 'ENGINE OFF - COASTING', hud: 'ENG', states: ['OFF', 'RUN', 'START', 'STOP'], btn: ['START', 'STOP'],
      aria: ['Start the engine', 'Stop the engine'] }
  : { up: 'RAISE THE PANTOGRAPH', down: 'LOWER THE PANTOGRAPH', rising: 'RAISING THE PANTOGRAPH...', on: 'POWER ON',
      coasting: 'PANTOGRAPH DOWN - COASTING', hud: 'PAN', states: ['DOWN', 'UP', 'RISE', 'DROP'], btn: ['RAISE', 'LOWER'],
      aria: ['Raise the pantograph', 'Lower the pantograph'] };
}
trainStyle();

// 7x7 wheel with four spokes; frames cover a quarter turn (spoke symmetry)
function buildWheels(p) {
  const frames = [];
  for (let f = 0; f < CONFIG.WHEEL_FRAMES; f++) {
    const [c, g] = makeCanvas(7, 7);
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const d = Math.hypot(x - 3, y - 3);
        if (d <= 3.4) px(g, x, y, d > 2.4 ? p.ink : p.grayDark);
      }
    const base = (f / CONFIG.WHEEL_FRAMES) * Math.PI / 2;
    for (let k = 0; k < 4; k++) {
      const a = base + k * Math.PI / 2;
      for (const r of [1, 2]) px(g, 3 + Math.round(Math.cos(a) * r), 3 + Math.round(Math.sin(a) * r), p.grayLight);
    }
    px(g, 3, 3, p.gray);
    frames.push(c);
  }
  return frames;
}

function windowPane(g, p, lit, x, y, w, h) {
  if (lit) {
    rect(g, x, y, w, h, PALETTE.glow);
    rect(g, x, y + h - 1, w, 1, PALETTE.amber);
  } else {
    rect(g, x, y, w, h, p.indigo);
    px(g, x, y, p.skyLight);
  }
}

// One car body, 19 rows with row 0 the roof, painted at (x0, y0) in the
// line's style: roof, cantrail, body side, window band, skirt stripe, doors
function paintCarBody(g, p, lit, rng, x0, y0, w, cab) {
  const S = STYLE, R = (x, y, ww, h, col) => rect(g, x0 + x, y0 + y, ww, h, col);
  const [b0, bh] = S.bandRows;
  R(3, 0, w - (cab ? 3 : 6), 1, p.grayLight);         // roof crown
  if (S.pods) for (const ax of [9, 22]) {             // air-conditioning pods
    R(ax, 0, 8, 1, p.gray);
    R(ax + 1, 0, 1, 1, p.grayDark); R(ax + 6, 0, 1, 1, p.grayDark);
  }
  if (S.exhaust) { R(cab ? 4 : 30, -1, 2, 2, p.grayDark); px(g, x0 + (cab ? 4 : 30), y0 - 1, p.ink); }   // the diesel's exhaust stack
  R(1, 1, w - (cab ? 1 : 2), 1, p.gray);              // roof
  R(0, 2, w, 1, p[S.cant]);                           // cantrail
  R(0, 3, w, 12, p[S.body]);                          // body side
  if (S.ribs) for (let x = 1; x < w; x += 2) { R(x, 3, 1, b0 - 3, p[S.edge]); R(x, b0 + bh + 1, 1, 14 - b0 - bh, p[S.edge]); }   // fluted stainless
  R(0, b0, w, bh, p[S.band]);                         // window band
  R(0, 12, w, 1, p[S.skirt]);                         // skirt stripe
  if (S.swoosh) {                                     // V/Line: a purple sweep along the bottom, lilac over it
    R(0, 11, w, 2, p.vline);
    for (let x = 0; x < w; x++) if (((x + (cab ? 5 : 0)) % 26) < 9) px(g, x0 + x, y0 + 10 - (((x % 26) / 3) | 0) % 2, p.lilac);
  }
  R(0, 14, w, 1, p.cloudShade);
  R(0, 15, w, 1, p.grayLight);
  R(0, 3, 1, 12, p[S.edge]);
  if (!cab) R(w - 1, 3, 1, 12, p[S.edge]);
  for (const wx of WINDOWS) {
    if (wx + 4 > w) continue;
    windowPane(g, p, lit, x0 + wx, y0 + 5, 4, 3);
    if (rng() < 0.7) {                                // a passenger: head and shoulders
      const hx = wx + randInt(rng, 0, 3), col = lit ? PALETTE.rust : p.ink;
      R(hx, 6, 1, 1, col);
      const a = Math.max(wx, hx - 1), b = Math.min(wx + 3, hx + 1);
      R(a, 7, b - a + 1, 1, col);
    }
  }
  if (S.facets) {                                     // Metro's blue facets either side of the first door
    for (let k = 0; k < 7; k++) { R(k, 9 + (k >> 1), 7 - k, 1, p.blue); R(0, 3 + k, Math.max(0, 5 - k), 1, p.skyMid); }
    for (let k = 0; k < 5; k++) R(13 + k, 13 - k, 5 - k, 1, p.navy);
  }
  for (const dx of DOOR_AT) {                         // doors: two leaves, a small window each
    R(dx, 3, DOOR_W, 13, p[S.door]);
    R(dx, 3, DOOR_W, 1, p[S.doorEdge]);
    R(dx, 15, DOOR_W, 1, p[S.doorEdge]);
    if (S.door === 'white') { R(dx - 1, 3, 1, 13, p[S.doorEdge]); R(dx + DOOR_W, 3, 1, 13, p[S.doorEdge]); }
    windowPane(g, p, lit, x0 + dx + 1, y0 + 5, 2, 3);
  }
  R(1, 16, w - 2, 1, p.grayDark);                     // underframe, equipment boxes
  R(2, 17, w - 4, 1, p.ink);
  R(16, 17, 6, 2, p.grayDark);
  if (S.exhaust) R(6, 17, 9, 2, p.ink);               // the engine under the floor
}

// Passenger car, 39x19. Row 0 is the roof (screen y 121).
function buildCar(p, lit, seed) {
  const w = CONFIG.CAR_W, [c, g] = makeCanvas(w, 20);
  paintCarBody(g, p, lit, mulberry32(100 + seed), 0, 1, w, false);
  return c;
}

// Leading car, 48x24: the same body five rows down the canvas (so its roof
// is level with the others), then the cab - its profile and the colours of
// its face come from the style
function buildLead(p, lit) {
  const [c, g] = makeCanvas(48, 24), Y = 5, NOSE = STYLE.nose;
  paintCarBody(g, p, lit, mulberry32(99), 0, Y, CAB_AT, true);
  for (let r = 0; r < NOSE.length; r++) {
    const col = r === 0 ? p.grayLight : r === 1 ? p.gray : p[STYLE.face(r)];
    rect(g, CAB_AT, Y + r, NOSE[r] - CAB_AT + 1, 1, col);
    if (r >= 3 && r <= 8) rect(g, NOSE[r] - 1, Y + r, 2, 1, p.ink);      // windscreen
  }
  px(g, NOSE[3] - 1, Y + 3, p.skyLight);
  px(g, NOSE[4] - 1, Y + 4, p.skyLight);
  rect(g, CAB_AT + 1, Y + 4, 3, 4, p.navy);                               // cab side window
  if (lit) rect(g, CAB_AT + 1, Y + 5, 3, 2, PALETTE.amber);
  else { rect(g, CAB_AT + 1, Y + 5, 3, 2, p.indigo); px(g, CAB_AT + 1, Y + 5, p.skyLight); }
  rect(g, CAB_AT, Y + 3, 1, 13, p.navy);                                  // saloon / cab partition
  rect(g, 37, Y + 2, 3, 1, PALETTE.amber);                                // destination display
  rect(g, 44, Y + 11, 2, 2, p.grayDark);                                  // light cluster
  px(g, 45, Y + 11, PALETTE.white);
  px(g, 45, Y + 12, PALETTE.glow);
  rect(g, 1, Y + 16, 43, 1, p.grayDark);                                  // underframe and pilot
  rect(g, 2, Y + 17, 40, 1, p.ink);
  rect(g, 41, Y + 16, 5, 1, p.grayDark);
  rect(g, 43, Y + 17, 3, 1, p.grayDark);
  px(g, 46, Y + 15, p.ink);                                               // coupler
  return c;
}

function drawBogie(g, p, a, b) {
  rect(g, a - 3, 143, b - a + 7, 1, p.gray);          // side frame
  rect(g, a - 2, 144, b - a + 5, 1, p.grayDark);
  const m = (a + b) >> 1;
  rect(g, m - 1, 140, 3, 3, p.ink);                   // bolster spring
  px(g, m, 141, p.grayDark);
}

// Body bounce relative to the bogies: -1, 0 or +1 px, only while moving
function swayOffset(i) {
  const k = Math.min(1, sim.speed / CONFIG.CRUISE_SPEED);
  if (k < 0.05) return 0;
  const s = (Math.sin(sim.swayPhase + i * 2.1) + 0.6 * Math.sin(sim.swayPhase * 2.3 + i * 1.3)) * k;
  return s > 1.05 ? -1 : s < -1.3 ? 1 : 0;
}

// How far the pantographs are up: 0 folded on the roof, 1 on the wire
function pantoHeight() {
  const D = CONFIG.DRIVE;
  switch (drive.engine) {
    case 'ON': return 1;
    case 'CRANK': return Math.min(1, drive.engineT / (D.CRANK_TIME * 0.85));
    case 'SHUTDOWN': return Math.max(0, 1 - drive.engineT / D.SHUTDOWN_TIME);
    default: return 0;
  }
}

// Single-arm pantograph on its frame; its contact strip rides just under the wire
function drawPanto(g, p, x, roofY, k) {
  rect(g, x - 3, roofY - 1, 8, 1, p.grayDark);
  if (k < 0.04) { rect(g, x - 2, roofY - 2, 7, 1, p.gray); return; }
  const low = roofY - 2, top = Math.round(low - k * (low - WIRE_Y - 1)), knee = Math.round((low + top) / 2);
  pxLine(g, x + 3, low, x - 2, knee, p.gray);                             // lower arm leans back
  pxLine(g, x - 2, knee, x + 1, top + 1, p.gray);                         // upper arm reaches forward
  rect(g, x - 1, top, 5, 1, p.grayDark);
}

function drawTrain(g, v) {
  const p = v.p, vehicles = TRAIN.vehicles, up = pantoHeight();
  const wf = v.wheels[Math.floor(sim.wheelAngle / (Math.PI / 2) * CONFIG.WHEEL_FRAMES) % CONFIG.WHEEL_FRAMES];
  // behind the bodies: gangway bellows and couplers between the cars
  for (let i = 0; i < vehicles.length - 1; i++) {
    const gx = vehicles[i + 1].x + vehicles[i + 1].w;
    rect(g, gx, 125, CONFIG.CAR_GAP, 11, p.grayDark);
    rect(g, gx - 1, 137, CONFIG.CAR_GAP + 2, 1, p.ink);
  }
  vehicles.forEach((veh, i) => {
    const sway = swayOffset(i);
    for (const wx of veh.wheels) g.drawImage(wf, veh.x + wx - 3, LAYER_Y.wheel);
    for (let k = 0; k < veh.wheels.length; k += 2) drawBogie(g, p, veh.x + veh.wheels[k], veh.x + veh.wheels[k + 1]);
    if (TRAIN.pantos.includes(i)) drawPanto(g, p, veh.x + 18, LAYER_Y.car + sway, up);
    g.drawImage(i === 0 ? v.lead : v.cars[i - 1], veh.x, veh.y + sway - (i ? 1 : 0));   // car sprites carry a row above the roof
  });
  drawDoors(g, v);
  if (STYLE.exhaust) drawExhaust(g, v);
  if (sim.hornWave > 0) drawHornWaves(g, p);
}

// The VLocity's diesels: a haze of exhaust off each car's roof stack,
// thick when the engines work hard, trailing back with the speed
function drawExhaust(g, v) {
  const load = drive.engine === 'ON' || drive.engine === 'CRANK' ? Math.max(0, drive.rpm - 0.2) / 0.8 : 0;
  if (load <= 0.02) return;
  TRAIN.vehicles.forEach((veh, i) => {
    const sx = veh.x + (i ? 31 : 5), sy = (i ? LAYER_Y.car : LAYER_Y.loco + 5) - 2;
    for (let k = 0; k < 5; k++) {
      const ph = (sim.clock * 0.9 + k / 5 + i * 0.29) % 1, r = 1 + Math.round(ph * 4);
      const x = Math.round(sx - ph * (6 + sim.speed * 0.35)), y = Math.round(sy - 2 - ph * 11);
      const dens = Math.round((1 - ph * 0.8) * 12 * load);
      if (dens > 0) g.drawImage(puffSprite(v, r, dens, ph < 0.3 ? 0 : 1), x - r, y - r);
    }
  });
}

// Left pixel column of every doorway along the train
const DOORS = TRAIN.vehicles.flatMap(c => DOOR_AT.map(d => c.x + d));

// Doors slide open into the body: the doorway is revealed column by column
function drawDoors(g, v) {
  const k = Math.round(sim.doorOpen * DOOR_W), p = v.p, h = PLAT.DOOR_FLOOR - PLAT.DOOR_TOP + 1;
  if (!k) return;
  for (const dx of DOORS) {
    rect(g, dx, PLAT.DOOR_TOP, k, h, p.ink);
    rect(g, dx, PLAT.DOOR_TOP, k, 1, v.lit ? PALETTE.amber : p.grayDark);        // ceiling light
    if (k < DOOR_W) rect(g, dx + k, PLAT.DOOR_TOP, 1, h, p.amber);
    else px(g, dx + 1, PLAT.DOOR_TOP + 4, p.glow);                               // grab pole
  }
}

function drawHornWaves(g, p) {
  const hx = TRAIN.vehicles[0].x + 44, hy = LAYER_Y.loco + 6;
  const ph = Math.floor(sim.clock * 8) % 3;
  for (let i = 0; i < 3; i++) {
    if ((i + ph) % 3 === 2) continue;                                   // flicker outward
    const r = 2 + i * 3;
    for (let a = -2; a <= 2; a++) px(g, hx + r + (Math.abs(a) === 2 ? -1 : 0), hy + a - i, p.white);
  }
}

// --- steam (Puffing Billy, waiting at Belgrave) -----------------------------
const SMOKE_SHADES = ['grayDark', 'gray', 'grayLight', 'cloudShade'];

// Dithered puff sprites, cached per lighting / radius / density / shade
function puffSprite(v, r, dens, shade) {
  const key = (r * 17 + dens) * 4 + shade;
  let c = v.puffs[key];
  if (!c) {
    let g;
    [c, g] = makeCanvas(r * 2 + 1, r * 2 + 1);
    g.fillStyle = v.p[SMOKE_SHADES[shade]];
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= (r + 0.5) * (r + 0.5) && bayer(x + r, y + r) < dens) g.fillRect(x + r, y + r, 1, 1);
    v.puffs[key] = c;
  }
  return c;
}
