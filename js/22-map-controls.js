// Melbourne Pixel Train - Route map, toolbar buttons, keyboard and pointer input
'use strict';

// --- route map: the whole line, coloured by landscape, with a little train -
// It sits on a dark panel narrow enough to fit between the driver's two
// panels; the station codes go on two staggered rows so a long line fits.
const MAP = { x: 0, y: 2, w: 146, h: 23, sprite: null };
const mapX = i => 6 + Math.round((STATIONS[i].dist - STATIONS[0].dist) / (STATIONS[LAST_STATION].dist - STATIONS[0].dist) * MAP.w);
const labelX = (i, s) => Math.max(1, Math.min(MAP.w + 12 - textWidth(s) - 1, mapX(i) - (textWidth(s) >> 1)));
const labelY = i => i & 1 ? 15 : 9;
function buildMap() {
  const w = MAP.w, [c, g] = makeCanvas(w + 12, MAP.h);
  const d0 = STATIONS[0].dist, d1 = STATIONS[LAST_STATION].dist;
  const SEC_COL = { city: PALETTE.grayLight, cbd: PALETTE.grayLight, inner: PALETTE.gray, yarra: PALETTE.skyMid, suburbs: PALETTE.orange,
                    foothills: PALETTE.paddy, forest: PALETTE.green, industrial: PALETTE.rust, plains: PALETTE.tan, bay: PALETTE.skyDeep,
                    skyrail: PALETTE.cloudShade };
  rect(g, 0, 0, w + 12, MAP.h, PALETTE.slate);
  rect(g, 1, 1, w + 10, MAP.h - 2, PALETTE.ink);
  rect(g, 1, 1, w + 10, 1, LINE.color);                                   // the line's own colour along the top
  for (let i = 0; i <= w; i++) {
    const u = d0 + (d1 - d0) * i / w, tw = terrainAt(u);
    rect(g, 6 + i, 4, 1, 2, inTunnel(u) ? PALETTE.slate : SEC_COL[TERRAIN[bayer(i, 4) < tw.t * 16 ? tw.b : tw.a].id]);   // underground in slate
  }
  STATIONS.forEach((st, i) => {
    const x = mapX(i), s = st.code || st.en.slice(0, 3);
    rect(g, x - 1, 3, 3, 4, PALETTE.white);
    rect(g, x, 7, 1, labelY(i) - 8, PALETTE.slate);                        // a tick down to its code
    drawText(g, s, labelX(i, s), labelY(i), PALETTE.grayLight);
  });
  MAP.x = (W - w - 12) >> 1;
  MAP.sprite = c;
}

function drawMap(g) {
  if (!MAP.sprite) buildMap();
  const d0 = STATIONS[0].dist, d1 = STATIONS[LAST_STATION].dist, ox = MAP.x, oy = MAP.y, blink = Math.floor(sim.clock * 3) & 1;
  g.drawImage(MAP.sprite, ox, oy);
  for (let i = 0; i <= LAST_STATION; i++) {              // stations reached light up, the next one blinks
    const next = i === sim.station + (sim.state === 'STOPPED' ? 0 : 1), done = i <= sim.station, s = STATIONS[i].code;
    if (!done && !next) continue;
    const here = i === sim.station && sim.state === 'STOPPED';
    if (done || blink) { g.fillStyle = PALETTE.glow; g.fillRect(ox + mapX(i), oy + 4, 1, 2); }
    drawText(g, s, ox + labelX(i, s), oy + labelY(i), here || (next && blink) ? PALETTE.glow : PALETTE.white);
  }
  const tx = ox + 6 + Math.round((sim.dist - d0) / (d1 - d0) * MAP.w);
  g.fillStyle = PALETTE[STYLE.map[0]]; g.fillRect(tx - 5, oy + 3, 6, 2);   // the set, in its livery
  g.fillStyle = PALETTE[STYLE.map[1]]; g.fillRect(tx, oy + 2, 2, 3);       // cab end
  g.fillStyle = PALETTE.glow;  g.fillRect(tx + 2, oy + 3, 1, 1);           // headlight
}

// --- controls: toolbar buttons and keys --------------------------------------
const SPEEDS = [1, 2, 4], RAIN_MODES = ['AUTO', 'ON', 'OFF'];
const ICONS = {
  pause: '<path d="M4 3h3v10H4zM9 3h3v10H9z"/>',
  play: '<path d="M4 3h2v1h2v1h2v1h2v1h1v2h-1v1h-2v1H8v1H6v1H4z"/>',
  sun: '<path d="M6 5h4v1h1v4h-1v1H6v-1H5V6h1zM7 1h2v2H7zM7 13h2v2H7zM1 7h2v2H1zM13 7h2v2h-2zM3 3h2v2H3zM11 3h2v2h-2zM3 11h2v2H3zM11 11h2v2h-2z"/>',
  dusk: '<path d="M5 7h6v1h1v2H4V8h1zM1 11h14v1H1zM3 13h10v1H3zM7 2h2v3H7zM2 5h2v2H2zM12 5h2v2h-2z"/>',
  moon: '<path d="M7 2h4v1H8v1H7v1H6v6h1v1h1v1h3v1H7v-1H5v-1H4V9H3V6h1V4h1V3h2z"/>',
  auto: '<path d="M6 2h4v1h2v1h1v2h1v4h-1v2h-1v1h-2v1H6v-1H4v-1H3v-2H2V6h1V4h1V3h2zM7 4v5h4V8H8V4z"/>',
  sound: '<path d="M2 6h3l3-3h1v10H8l-3-3H2zM11 5h1v6h-1zM13 3h1v10h-1z"/>',
  mute: '<path d="M2 6h3l3-3h1v10H8l-3-3H2zM11 5h1v1h-1zM12 6h1v1h-1zM13 7h1v1h-1zM14 8h1v1h-1zM14 5h1v1h-1zM13 6h1v1h-1zM12 7h1v1h-1zM11 8h1v1h-1z"/>',
};
const btn = id => document.getElementById(id);

function syncButtons() {
  // AUTO and DRIVE each show their own set of buttons
  const driving = drive.on && !ui.title;
  let relayout = false;
  for (const b of bar.children) {
    const hide = b.id === 'b-lines' ? ui.title : b.classList.contains('drv') ? !driving : b.classList.contains('aut') && driving;
    if (b.hidden !== hide) { b.hidden = hide; relayout = true; }
  }
  if (relayout) fit();
  const set = (id, icon, label, on, aria) => {
    const b = btn(id);
    if (icon && b.dataset.icon !== icon) { b.firstElementChild.innerHTML = icon; b.dataset.icon = icon; }
    if (label !== null && b.lastChild.textContent !== label) b.lastChild.textContent = label;
    b.classList.toggle('on', !!on);
    b.setAttribute('aria-label', aria);
  };
  set('b-pause', ui.paused ? ICONS.play : ICONS.pause, ui.paused ? 'PLAY' : 'PAUSE', ui.paused, ui.paused ? 'Resume' : 'Pause');
  const sp = btn('b-speed');
  if (sp.textContent !== ui.speed + 'x') sp.textContent = ui.speed + 'x';
  sp.classList.toggle('on', ui.speed > 1);
  sp.setAttribute('aria-label', 'Speed ' + ui.speed + 'x');
  const tm = TIME_MODES[ui.timeMode][0];
  set('b-time', tm === 'NIGHT' ? ICONS.moon : tm === 'DUSK' ? ICONS.dusk : tm === 'DAY' ? ICONS.sun : ICONS.auto, tm, ui.timeMode > 0, 'Time of day: ' + tm);
  set('b-rain', null, RAIN_MODES[ui.rainMode], ui.rainMode === 1, 'Rain: ' + RAIN_MODES[ui.rainMode]);
  const live = audio.ctx && audio.ctx.state === 'running';
  set('b-mute', live && !audio.muted ? ICONS.sound : ICONS.mute, !live ? 'TAP' : audio.muted ? 'OFF' : 'ON', live && !audio.muted,
      !live ? 'Turn sound on' : audio.muted ? 'Unmute' : 'Mute');
  set('b-skip', null, ui.title ? 'LINE' : 'NEXT', false, ui.title ? 'Next line on the departures board' : 'Skip to next station');
  set('b-mode', null, driving ? 'DRIVE' : 'AUTO', driving, driving ? 'Driver mode on: hand back to autopilot' : 'Drive the train yourself');
  const E = drive.engine;
  set('b-engine', null, E === 'OFF' ? TRACTION.btn[0] : E === 'ON' ? TRACTION.btn[1] : '...', E === 'ON', TRACTION.aria[E === 'OFF' ? 0 : 1]);
  set('b-power', null, null, drive.lever > 0, 'Power up, lever ' + leverLabel(drive.lever));
  set('b-brake', null, null, drive.lever < 0, 'Brake, lever ' + leverLabel(drive.lever));
  const closing = sim.state === 'STOPPED' && (sim.stopPhase === 'BOARDING' || sim.stopPhase === 'BOARDED' || sim.stopPhase === 'DOORS_OPEN');
  set('b-doors', null, closing ? 'CLOSE' : 'OPEN', sim.doorOpen > 0, closing ? 'Close the doors' : 'Open the doors');
  set('b-light', null, null, drive.headlight, drive.headlight ? 'Headlight off' : 'Headlight on');
}

const actions = {
  mode() { if (ui.title) beginTrip(true); else setDriveMode(!drive.on); },
  pause() { ui.paused = !ui.paused; if (ui.paused) { hornOff(); stopVoice(); } },
  speed() { ui.speed = SPEEDS[(SPEEDS.indexOf(ui.speed) + 1) % SPEEDS.length]; },
  skip() { if (ui.title) pickLine(ui.lineSel + 1); else skipToNextStation(); },   // on the board: the next line
  time() { ui.timeMode = (ui.timeMode + 1) % TIME_MODES.length; },
  rain() { ui.rainMode = (ui.rainMode + 1) % RAIN_MODES.length; },
  mute() {
    // the tap that starts the audio should not also mute it
    if (performance.now() - audio.unlockedAt < 700) { setMuted(false); return; }
    setMuted(!audio.muted);
  },
  engine() { toggleEngine(); },
  power() { setLever(drive.lever + 1); },
  brake() { setLever(drive.lever - 1); },
  doors() { toggleDoors(); },
  light() { toggleLight(); },
  lines() { backToBoard(); },
};
for (const [id, act] of [['b-mode', 'mode'], ['b-pause', 'pause'], ['b-speed', 'speed'], ['b-skip', 'skip'], ['b-time', 'time'],
                         ['b-rain', 'rain'], ['b-mute', 'mute'], ['b-engine', 'engine'], ['b-doors', 'doors'], ['b-light', 'light'],
                         ['b-lines', 'lines']])
  btn(id).addEventListener('click', () => { unlockAudio(); actions[act](); syncButtons(); });

// Power and brake step once per tap and keep stepping while held; the horn
// sounds while held. A click with no pointer (keyboard on the button) taps.
let holdTimer = 0;
const endHold = () => { clearTimeout(holdTimer); holdTimer = 0; };
for (const [id, act] of [['b-power', 'power'], ['b-brake', 'brake']]) {
  const b = btn(id), step = () => { actions[act](); syncButtons(); };
  b.addEventListener('pointerdown', e => {
    unlockAudio(); step(); endHold();
    const again = () => { step(); holdTimer = setTimeout(again, 170); };
    holdTimer = setTimeout(again, 420);
    e.preventDefault();
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, endHold);
  b.addEventListener('click', e => { if (e.detail === 0) step(); });
}
{
  const b = btn('b-horn');
  b.addEventListener('pointerdown', e => { unlockAudio(); hornOn(); e.preventDefault(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, hornOff);
  b.addEventListener('click', e => { if (e.detail === 0) { hornOn(); setTimeout(hornOff, 400); } });
}

function skipToNextStation() {
  if (ui.complete || sim.station >= LAST_STATION || drive.on) return;
  sim.doorOpen = 0;
  sparkPool.n = 0;
  arrive(sim.station + 1, 0);
}

const timeScale = () => (ui.paused ? 0 : ui.speed) * (input.fast ? CONFIG.FAST_FACTOR : 1);

// Keys on the title card, and the driver's keys; true when the key was used
function titleKey(key) {
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Tab') ui.titleSel ^= 1;
  else if (key === 'ArrowUp' || key === 'ArrowDown') pickLine(ui.lineSel + (key === 'ArrowUp' ? -1 : 1));
  else if (key === 'Enter' || key === 'Space') beginTrip(ui.titleSel === 1);
  else if (key === 'KeyC') beginTrip(true);
  else return false;
  return true;
}
function driveKey(key) {
  if (ui.complete) return false;
  switch (key) {
    case 'KeyE': toggleEngine(); break;
    case 'ArrowUp': setLever(drive.lever + 1); break;
    case 'ArrowDown': setLever(drive.lever - 1); break;
    case 'KeyB': setLever(EB); break;
    case 'KeyO': toggleDoors(); break;
    case 'KeyL': toggleLight(); break;
    case 'KeyH': break;                                  // held: see keydown
    default: return false;
  }
  return true;
}

addEventListener('keydown', e => {
  unlockAudio();
  const key = e.code;
  if (key === 'KeyF') input.fast = true;
  if (key === 'KeyH' && drive.on && !ui.title && !ui.paused) hornOn();
  if (e.repeat) { if (key === 'Space' || key.startsWith('Arrow')) e.preventDefault(); return; }
  if ((ui.title && titleKey(key)) || (drive.on && !ui.title && driveKey(key))) { e.preventDefault(); syncButtons(); return; }
  if (key === 'KeyD') input.debug = !input.debug;
  else if (key === 'KeyC') actions.mode();
  else if (key === 'KeyT') actions.time();
  else if (key === 'KeyM') setMuted(!audio.muted);
  else if (key === 'KeyW') actions.rain();
  else if (key === 'KeyN') actions.skip();
  else if (key === 'KeyP' || (key === 'Space' && !ui.complete)) { actions.pause(); e.preventDefault(); }
  else if (!drive.on && (key === 'Digit1' || key === 'Digit2' || key === 'Digit4')) ui.speed = +key.slice(5);
  else if (key === 'KeyR' || (ui.complete && (key === 'Enter' || key === 'Space'))) startJourney();
  else if (key === 'Escape' || key === 'Backspace') actions.lines();
  else if (key === 'KeyG' && ui.complete) returnTrip();          // go back the other way
  syncButtons();
});
addEventListener('keyup', e => {
  if (e.code === 'KeyF') input.fast = false;
  if (e.code === 'KeyH') hornOff();
});
addEventListener('blur', () => { input.fast = false; hornOff(); endHold(); });
addEventListener('pointerdown', unlockAudio);

function toInternal(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
}
canvas.addEventListener('pointermove', e => {
  const [x, y] = toInternal(e), t = ui.title ? titleHit(x, y) : null;
  if (t && t.mode !== undefined) ui.titleSel = t.mode;
  ui.hover = buttonHit(x, y);
  canvas.style.cursor = ui.hover || t ? 'pointer' : 'default';
});
canvas.addEventListener('pointerdown', e => {
  const [x, y] = toInternal(e), t = ui.title ? titleHit(x, y) : null, b = buttonHit(x, y);
  if (t && t.mode !== undefined) { beginTrip(t.mode === 1); canvas.style.cursor = 'default'; }
  else if (t) pickLine(t.line);                                   // a row of the board: show that line
  else if (b === 1) { startJourney(); ui.hover = false; canvas.style.cursor = 'default'; }
  else if (b === 2) { returnTrip(); ui.hover = false; canvas.style.cursor = 'default'; }
  else if (b === 3) { backToBoard(); ui.hover = false; canvas.style.cursor = 'default'; }
  syncButtons();
});
