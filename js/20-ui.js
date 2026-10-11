// Melbourne Pixel Train - Banner, end panel, title card, driver HUD, debug overlay
'use strict';

// =====================================================================
// 9. UI, SOUND AND INPUT
// =====================================================================
const canvas = document.getElementById('screen');
const ui = { bannerY: -40, bannerSt: 1, complete: false, panelY: -150, hover: false, debugW: 0,
             paused: false, speed: 1, timeMode: 0, rainMode: 0,      // toolbar state
             title: true, titleSel: 1 };                              // title card: 0 WATCH, 1 DRIVE
const input = { debug: false, fast: false };

function updateUI(dt) {
  const next = sim.station + 1;
  const show = next <= LAST_STATION && (sim.state === 'ARRIVING' ||
    ((sim.state === 'TRAVELING' || sim.state === 'DRIVING') && sim.nextStop - sim.dist < 900));
  if (show) ui.bannerSt = next;                           // latched while it slides out
  // slides out under the route map (under the driver's panels in DRIVE)
  ui.bannerY += ((show ? (drive.on ? 50 : 19) : -40) - ui.bannerY) * Math.min(1, dt * 5);
  ui.panelY += ((ui.complete ? (drive.final ? 24 : 44) : -150) - ui.panelY) * Math.min(1, dt * 4);
}

// "NEXT STATION: <name>", pre-rendered once per station
const bannerCache = [];
function bannerSprite(i) {
  if (bannerCache[i]) return bannerCache[i];
  const st = STATIONS[i], label = 'NEXT STATION:';
  const lw = textWidth(label), ew = st.en.length * 8 - 2, h = 16, w = 6 + lw + 6 + ew + 6;
  const [c, g] = makeCanvas(w, h);
  rect(g, 0, 0, w, h, PALETTE.slate);
  rect(g, 1, 1, w - 2, h - 2, PALETTE.ink);
  rect(g, 1, h - 2, w - 2, 1, PALETTE.skyDeep);
  drawText(g, label, 6, 5, PALETTE.grayLight);
  drawText2x(g, st.en, 6 + lw + 6, 3, PALETTE.white);
  return (bannerCache[i] = c);
}

function drawBanner(g) {
  const b = bannerSprite(ui.bannerSt), y = Math.round(ui.bannerY);
  if (y <= -b.height) return;
  g.drawImage(b, Math.max(input.debug ? ui.debugW + 4 : 2, (W - b.width) >> 1), y);
}

// "Journey complete" panel with a restart button (normal + hover sprites).
// After a drive it grows a score card: the breakdown, stars, best score.
const PANEL = { w: 172, h: 64 };
const STAR = ['....x....', '...xxx...', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '.xxx.xxx.', '.xx...xx.'];
let panelSprites = null;

function readBest() {
  try { return +localStorage.getItem('mpt-best') || 0; } catch (e) { return 0; }
}

function sizePanel() {
  PANEL.w = drive.final ? 184 : 172;
  PANEL.h = drive.final ? 134 : 64;
}

function panelButton() {
  const bw = textWidth('RESTART TRIP') + 12, bh = 11;
  return { x: (PANEL.w - bw) >> 1, y: PANEL.h - bh - 6, w: bw, h: bh };
}

function buildPanel(hover) {
  sizePanel();
  const { w, h } = PANEL, [c, g] = makeCanvas(w, h), m = { h: 7 }, P = PALETTE;
  const first = STATIONS[0], last = STATIONS[LAST_STATION];
  rect(g, 0, 0, w, h, P.slate);
  rect(g, 1, 1, w - 2, h - 2, P.ink);
  const title = 'JOURNEY COMPLETE';
  drawText2x(g, title, (w - title.length * 8 + 2) >> 1, 7, P.glow);
  const bye = 'THIS TRAIN TERMINATES HERE';
  drawText(g, bye, (w - textWidth(bye)) >> 1, 22, P.white);
  const route = first.en + ' > ' + last.en + '  ' + Math.round(last.km - first.km) + ' KM';
  drawText(g, route, (w - textWidth(route)) >> 1, 25 + m.h, P.grayLight);
  const F = drive.final;
  if (F) {
    const S = drive.pts, y0 = 36 + m.h;
    const rows = [['STOPS', S.stops], ['PUNCTUALITY', S.time], ['PASSENGERS', S.pax],
                  ['COMFORT ' + Math.round(drive.comfort) + '%', F.comfort], ['PENALTIES', Math.round(S.penalty)]];
    rows.forEach(([label, val], i) => {
      drawText(g, label, 14, y0 + i * 8, P.grayLight);
      drawText(g, String(val), w - 14 - textWidth(String(val)), y0 + i * 8, val < 0 ? P.red : P.white);
    });
    const ty = y0 + rows.length * 8 + 2;
    rect(g, 14, ty - 2, w - 28, 1, P.slate);
    drawText(g, 'TOTAL', 14, ty + 1, P.glow);
    drawText2x(g, String(F.total), w - 12 - String(F.total).length * 8, ty - 1, P.glow);
    for (let i = 0; i < 3; i++) stamp(g, STAR, 14 + i * 11, ty + 12, { x: i < F.stars ? P.glow : P.indigo });
    const best = F.record ? 'NEW RECORD!' : 'BEST ' + Math.max(F.best, F.total);
    drawText(g, best, w - 14 - textWidth(best), ty + 13, F.record ? P.glow : P.grayLight);
  }
  const b = panelButton();
  rect(g, b.x, b.y, b.w, b.h, P.grassLight);
  rect(g, b.x + 1, b.y + 1, b.w - 2, b.h - 2, hover ? P.grass : P.green);
  drawText(g, 'RESTART TRIP', b.x + 6, b.y + 3, P.white);
  return c;
}

function drawPanel(g) {
  const y = Math.round(ui.panelY);
  if (y <= -PANEL.h) return;
  panelSprites = panelSprites || [buildPanel(false), buildPanel(true)];
  g.drawImage(panelSprites[ui.hover ? 1 : 0], (W - PANEL.w) >> 1, y);
}

function buttonHit(x, y) {
  if (!ui.complete) return false;
  const b = panelButton(), bx = ((W - PANEL.w) >> 1) + b.x, by = Math.round(ui.panelY) + b.y;
  return x >= bx && x < bx + b.w && y >= by && y < by + b.h;
}

// --- title card: WATCH the journey or DRIVE it ------------------------------
const TITLE = { w: 208, h: 100, y: 38, sprite: null, best: readBest() };
const TITLE_OPTS = [['WATCH', 'SIT BACK AND ENJOY'], ['DRIVE', 'YOU ARE THE DRIVER']];
const TITLE_HITS = TITLE_OPTS.map(() => ({ x: 0, y: 0, w: 80, h: 15 }));

function buildTitle() {
  const { w, h } = TITLE, [c, g] = makeCanvas(w, h), P = PALETTE;
  rect(g, 0, 0, w, h, P.slate);
  rect(g, 1, 1, w - 2, h - 2, P.ink);
  rect(g, 1, h - 2, w - 2, 1, P.skyDeep);
  const t = 'MELBOURNE PIXEL TRAIN';
  drawText2x(g, t, (w - t.length * 8 + 2) >> 1, 6, P.glow);
  const sub = 'FLINDERS STREET TO BELGRAVE  ' + Math.round(STATIONS[LAST_STATION].km) + ' KM';
  drawText(g, sub, (w - textWidth(sub)) >> 1, 22, P.white);
  const route = STATIONS.map(s => s.code).join(' ');
  drawText(g, route, (w - textWidth(route)) >> 1, 33, P.grayLight);
  const keys = 'E PANTO  ↑↓ LEVER  O DOORS  H HORN  L LIGHT';
  drawText(g, keys, (w - textWidth(keys)) >> 1, h - 19, P.slate);
  const foot = '←→ CHOOSE   ENTER START' + (TITLE.best ? '   BEST ' + TITLE.best : '');
  drawText(g, foot, (w - textWidth(foot)) >> 1, h - 11, P.grayLight);
  return c;
}

function drawTitle(g) {
  const x0 = (W - TITLE.w) >> 1, y0 = TITLE.y, P = PALETTE;
  g.drawImage(TITLE.sprite || (TITLE.sprite = buildTitle()), x0, y0);
  for (let i = 0; i < TITLE_OPTS.length; i++) {
    const [label, sub] = TITLE_OPTS[i], r = TITLE_HITS[i], sel = ui.titleSel === i;
    r.x = x0 + 16 + i * 96; r.y = y0 + 48;
    rect(g, r.x, r.y, r.w, r.h, sel ? P.glow : P.slate);
    rect(g, r.x + 1, r.y + 1, r.w - 2, r.h - 2, sel ? (i ? P.green : P.blue) : P.navy);
    drawText2x(g, label, r.x + ((r.w - label.length * 8 + 2) >> 1), r.y + 3, sel ? P.white : P.grayLight);
    drawText(g, sub, r.x + ((r.w - textWidth(sub)) >> 1), r.y + 19, sel ? P.white : P.gray);
  }
}

function titleHit(x, y) {
  for (let i = 0; i < TITLE_HITS.length; i++) {
    const r = TITLE_HITS[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

// Leave the title card: AUTO raises the pantographs and sets off;
// DRIVE leaves them down for the driver
function beginTrip(driving) {
  if (!ui.title) return;
  ui.title = false;
  if (driving) { setDriveMode(true); resetDrive(); }
  else if (drive.engine === 'OFF') startEngine();
  syncButtons();
}

// --- DRIVE mode: the driver's panels, the next-step hint, messages ----------
function hudBox(g, x, y, w, h) {
  rect(g, x, y, w, h, PALETTE.slate);
  rect(g, x + 1, y + 1, w - 2, h - 2, PALETTE.ink);
}
const textRight = (g, s, xr, y, col) => drawText(g, s, xr - textWidth(s), y, col);

function drawDriveHUD(g) {
  const P = PALETTE, D = CONFIG.DRIVE, blink = Math.floor(sim.clock * 4) & 1, E = drive.engine;
  // left: speedometer, limit board, the lever, power, passengers
  let x = 2, y = 2;
  hudBox(g, x, y, 76, 44);
  const v = String(Math.round(sim.speed));
  drawText2x(g, v, x + 28 - v.length * 8, y + 4, drive.over && blink ? P.red : P.white);
  drawText(g, 'KM/H', x + 30, y + 9, P.grayLight);
  const lim = String(drive.limit);
  rect(g, x + 52, y + 3, 21, 13, P.red);
  rect(g, x + 54, y + 5, 17, 9, P.white);
  drawText(g, lim, x + 52 + ((21 - textWidth(lim)) >> 1), y + 7, P.ink);
  const ly = y + 18, l = drive.lever;                    // brake steps on the left, power on the right
  for (let n = EB; n <= D.NOTCHES; n++) {
    const cx = x + 4 + (n - EB) * 4, on = l > 0 ? n > 0 && n <= l : l < 0 ? n < 0 && n >= l : n === 0;
    rect(g, cx, ly, 3, 5, n > 0 ? (on ? P.grassLight : P.greenDeep) : n < 0 ? (on ? (n === EB ? P.red : P.amber) : P.brownDark)
                         : on ? P.white : P.grayDark);
    if (n === l) rect(g, cx, ly + 6, 3, 1, P.glow);
  }
  textRight(g, leverLabel(l), x + 73, ly, l === EB ? P.red : P.white);
  const ey = y + 28;
  drawText(g, 'PAN', x + 4, ey, P.grayLight);
  drawText(g, E === 'OFF' ? 'DOWN' : E === 'ON' ? 'UP' : E === 'CRANK' ? 'RISE' : 'DROP', x + 20, ey,
           E === 'OFF' ? P.red : E === 'ON' ? P.grassLight : blink ? P.amber : P.peach);
  rect(g, x + 44, ey, 29, 5, P.navy);
  rect(g, x + 44, ey, Math.round(29 * drive.rpm), 5, drive.rpm > 0.85 ? P.orange : P.green);
  drawText(g, 'PAX ' + drive.pax, x + 4, y + 36, P.white);
  textRight(g, 'LAMP', x + 73, y + 36, drive.headlight && E !== 'OFF' ? P.glow : P.grayDark);

  // right: score, clock and timetable, the next stop, comfort
  x = W - 78;
  hudBox(g, x, y, 76, 44);
  const S = drive.pts, score = String(Math.round(S.stops + S.time + S.pax + S.penalty));
  drawText(g, 'SCORE', x + 4, y + 4, P.grayLight);
  textRight(g, score, x + 72, y + 4, P.glow);
  const stopped = sim.state === 'STOPPED', i = stopped ? sim.station : Math.min(LAST_STATION, sim.station + 1);
  const leaving = stopped && i < LAST_STATION, dueT = leaving ? SCHEDULE[i].dep : SCHEDULE[i].arr;
  drawText(g, hhmm(wallClock(tripHour(drive.tripT))), x + 4, y + 12, P.white);
  textRight(g, (leaving ? 'DEP ' : 'ARR ') + hhmm(wallClock(tripHour(dueT))), x + 72, y + 12,
            drive.tripT > dueT && !(stopped && !leaving) ? P.red : P.grayLight);
  const st = STATIONS[sim.station + 1];
  if (stopped) {
    drawText(g, 'AT ' + STATIONS[sim.station].code, x + 4, y + 20, P.white);
    textRight(g, st ? 'NEXT ' + st.code : 'TERMINUS', x + 72, y + 20, P.grayLight);
  } else if (st) {
    const togo = st.dist - sim.dist;
    drawText(g, st.code, x + 4, y + 20, P.white);
    textRight(g, togo > 400 ? (st.km - kmAt(sim.dist)).toFixed(1) + ' KM' : 'STOP ' + Math.round(togo) + ' M', x + 72, y + 20,
              togo > 400 ? P.white : P.glow);
  }
  if (!stopped && st && st.dist - sim.dist < 400) {      // stop gauge: the window, the mark, the train
    const w = stopWindow(st), o = sim.dist - st.dist, bx = x + 4, bw = 68;
    const at = u => bx + Math.round((Math.max(-160, Math.min(80, u)) + 160) / 240 * (bw - 1));
    rect(g, bx, y + 29, bw, 3, P.navy);
    rect(g, at(w[0]), y + 29, at(w[1]) - at(w[0]) + 1, 3, P.greenDark);
    rect(g, at(0), y + 28, 1, 5, P.white);
    rect(g, at(o) - 1, y + 28, 3, 5, P.glow);
  } else {
    const ahead = speedLimitAt(sim.dist + 320);
    if (!stopped && ahead < drive.limit) drawText(g, 'LIMIT ' + ahead + ' AHEAD', x + 4, y + 28, blink ? P.amber : P.peach);
    else drawText(g, 'LIMIT ' + drive.limit, x + 4, y + 28, P.grayLight);
  }
  const cf = Math.round(drive.comfort);
  drawText(g, 'COMFORT', x + 4, y + 36, P.grayLight);
  textRight(g, cf + '%', x + 72, y + 36, cf > 80 ? P.grassLight : cf > 50 ? P.amber : P.red);
}

function drawHint(g) {
  const s = driveHint();
  if (!s) return;
  const w = textWidth(s) + 8, x = (W - w) >> 1, y = 20;
  hudBox(g, x, y, w, 11);
  drawText(g, s, x + 4, y + 3, PALETTE.glow);
}

function drawToasts(g) {
  const b = bannerCache[ui.bannerSt];                   // under the HUD, or under the banner while it shows
  let y = b && ui.bannerY > -b.height ? Math.max(50, Math.round(ui.bannerY) + b.height + 3) : 50;
  for (let i = toasts.length - 1; i >= 0; i--) {
    const t = toasts[i], h = t.big ? 16 : 11, w = (t.big ? t.text.length * 8 - 2 : textWidth(t.text)) + 10, x = (W - w) >> 1;
    const yy = y - Math.round(Math.max(0, 1 - t.t / 0.15) * 6);      // pops in from above
    g.globalAlpha = Math.max(0, Math.min(1, (TOAST_LIFE - t.t) / 0.4));
    hudBox(g, x, yy, w, h);
    (t.big ? drawText2x : drawText)(g, t.text, x + 5, yy + 3, PALETTE[t.col]);
    g.globalAlpha = 1;
    y += h + 2;
  }
}

function drawPopups(g) {
  for (let i = 0; i < popPool.n; i++) {
    const q = popPool.items[i], x = q.x - (textWidth(q.text) >> 1), y = Math.round(q.y - q.t * 12);
    drawText(g, q.text, x + 1, y + 1, PALETTE.ink);
    drawText(g, q.text, x, y, PALETTE[q.col]);
  }
}

function drawPaused(g) {
  const s = 'PAUSED', w = s.length * 8 + 8, x = (W - w) >> 1;
  hudBox(g, x, 84, w, 16);
  drawText2x(g, s, x + 5, 87, PALETTE.white);
}

function landLabel() {
  const w = terrainAt(sim.dist);
  return SECTIONS[TERRAIN[w.t > 0.5 ? w.b : w.a].id].name;
}

function drawDebug(g) {
  const stopped = sim.state === 'STOPPED';
  const st = STATIONS[stopped ? sim.station : Math.min(sim.station + 1, LAST_STATION)];
  const lines = [
    'STATE ' + sim.state + (stopped ? ' ' + sim.stopPhase.replace('_', ' ') : ''),
    'SPEED ' + sim.speed.toFixed(1) + ' PX/S',
    'DIST  ' + Math.floor(sim.dist) + ' PX',
    (stopped ? 'AT    ' : 'NEXT  ') + st.en,
    stopped ? 'PEOPLE ' + sim.people.length : 'IN    ' + Math.ceil(sim.nextStop - sim.dist) + ' PX',
    'LIGHT ' + hhmm(sim.hour) + ' ' + TIME_MODES[ui.timeMode][0] + (weather.level > 0.05 ? ' RAIN ' + Math.round(weather.level * 100) : ''),
    'LAND  ' + landLabel() + (sim.onBridge ? ' BRIDGE' : ''),
  ];
  if (drive.on) lines.push('DRIVE ' + drive.engine + ' ' + leverLabel(drive.lever) + ' LOAD ' + Math.round(drive.rpm * 100) +
                           ' A ' + drive.accel.toFixed(1), 'TRIP ' + Math.round(drive.tripT) + ' S  OFFSET ' + Math.round(sim.dist - (STATIONS[sim.station + 1] || STATIONS[sim.station]).dist));
  if (timeScale() !== 1) lines.push(ui.paused ? 'PAUSED' : 'SPEED X' + timeScale());
  if (quality.low) lines.push('LOW QUALITY ' + quality.ema.toFixed(1) + ' MS');
  lines.push('P PAUSE  N NEXT  T TIME  W RAIN  C DRIVE', 'M SOUND  1/2/4 SPEED  R RESTART');
  const w = Math.max(...lines.map(textWidth)) + 6, h = lines.length * 7 + 4;
  rect(g, 2, 2, w, h, PALETTE.slate);
  rect(g, 3, 3, w - 2, h - 2, PALETTE.ink);
  lines.forEach((s, i) =>
    drawText(g, s, 5, 5 + i * 7, i >= lines.length - 2 ? PALETTE.grayLight : i === 0 ? PALETTE.glow : PALETTE.white));
  ui.debugW = w + 2;
}
