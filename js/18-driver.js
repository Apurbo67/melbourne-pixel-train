// Melbourne Pixel Train - Driver mode: timetable, speed limits, lever physics, scoring, hints
'use strict';

// =====================================================================
// 8a. DRIVER MODE
// =====================================================================
// The player at the controls: raise the pantographs, work one combined lever
// (power notches up, brake steps down), stop with every door along the
// platform, open and close the doors, wait for the all clear, keep to
// the speed limits and the timetable. Score: stopping accuracy,
// punctuality, passengers carried and their comfort, minus penalties.
const drive = {
  on: false,                               // DRIVE mode; AUTO when false
  engine: 'OFF', engineT: 0, rpm: 0,       // traction power: OFF | CRANK (pantographs rising) | ON | SHUTDOWN (dropping);
                                           // rpm 0..1 is how hard the motors are working (0.3 = ticking over)
  lever: 0, accel: 0,                      // lever: -5 emergency, -4..-1 brake, 0 coast, 1..8 power
  headlight: true, horn: false,
  tripT: 0,                                // s since the trip began: the timetable clock
  limit: CONFIG.DRIVE.LIMIT, over: false, beepT: 0,
  pts: { stops: 0, time: 0, pax: 0, penalty: 0 }, comfort: 100, pax: 0,
  final: null,                             // the score card once the trip is complete
};
const EB = -CONFIG.DRIVE.BRAKES - 1;       // the emergency brake position
const leverLabel = n => n > 0 ? 'P' + n : n === EB ? 'EB' : n < 0 ? 'B' + -n : 'N';

// Timetable: each leg run a little under the line speed, plus time to get
// going and to stop, plus some slack; a dwell at each stop. Built once the
// terrain (and so the speed limits) is laid out. The day's clock runs on
// it, so a late train arrives later in the evening.
const SCHEDULE = [];
let HOURS_PER_S = 0;
function buildSchedule() {
  const D = CONFIG.DRIVE;
  SCHEDULE.push({ arr: 0, dep: D.FIRST_DEP });
  for (let i = 1; i < STATIONS.length; i++) {
    let run = 0;
    for (let d = STATIONS[i - 1].dist; d < STATIONS[i].dist; d += 10) run += 10 / Math.min(D.SCHED_SPEED, speedLimitAt(d) - 6);
    const arr = SCHEDULE[i - 1].dep + run + (CONFIG.ACCEL_TIME + CONFIG.BRAKE_TIME) / 2 + D.SLACK;
    SCHEDULE.push({ arr, dep: arr + D.DWELL });
  }
  HOURS_PER_S = (CONFIG.HOUR_END - CONFIG.HOUR_START) / SCHEDULE[LAST_STATION].arr;
}
const tripHour = t => CONFIG.HOUR_START + t * HOURS_PER_S;
const lateMinutes = (t, due) => (t - due) * HOURS_PER_S * 60;
// The same hours and minutes on the desk clock, which runs to the real timetable
const WALL = (CONFIG.CLOCK_END - CONFIG.CLOCK_START) / (CONFIG.HOUR_END - CONFIG.HOUR_START);
const wallClock = h => CONFIG.CLOCK_START + (h - CONFIG.HOUR_START) * WALL;
const wallMin = m => Math.max(1, Math.round(Math.abs(m) * WALL));

// Where the train may stand at a station and still have every door on the
// platform: [lo, hi] px around the stop mark. The terminus ends in a buffer stop.
const DOORS_LO = Math.min(...DOORS), DOORS_HI = Math.max(...DOORS) + 4, BUFFER_O = 72;
const STOP_WIN = [0, 0];
function stopWindow(st) {
  const [L, R] = st.platform;
  STOP_WIN[0] = Math.max(-60, L + 2 - DOORS_LO);
  STOP_WIN[1] = st.index === LAST_STATION ? BUFFER_O : Math.min(60, R - 2 - DOORS_HI);
  return STOP_WIN;
}

// Line speed: slower on the single track winding up through the forest,
// round the Burnley curves and over the Yarra, and through stations
function speedLimitAt(d) {
  const D = CONFIG.DRIVE;
  let lim = sectionWeight('forest', d) > 0.5 ? D.LIMIT_HILLS : D.LIMIT;
  if (d > BRIDGE.u0 - 120 && d < BRIDGE.u1 + 60) lim = Math.min(lim, D.LIMIT_BRIDGE);
  for (let i = 0; i < STATIONS.length; i++)
    if (d > STATIONS[i].dist - 280 && d < STATIONS[i].dist + 160) return Math.min(lim, D.LIMIT_STATION);
  return lim;
}

function resetDrive() {
  const P = drive.pts;
  P.stops = P.time = P.pax = P.penalty = 0;
  drive.comfort = 100; drive.pax = 0; drive.final = null; drive.tripT = 0;
  drive.lever = 0; drive.over = false;
  toasts.length = 0; popPool.n = 0;
  hornOff();
  if (drive.on) { setEngine('OFF'); drive.rpm = 0; setStopPhase('READY'); }
}

// AUTO hands the train to the driver, or takes it back, wherever it is
function setDriveMode(on) {
  if (on === drive.on) return;
  drive.on = on;
  ui.speed = 1;
  toasts.length = 0;
  if (on) {
    drive.lever = 0;
    drive.tripT = (journeyHour() - CONFIG.HOUR_START) / HOURS_PER_S;     // the clock carries on
    if (sim.state !== 'STOPPED') sim.state = 'DRIVING';
    else if (sim.stopPhase === 'SETTLE') setStopPhase('READY');
    else if (sim.stopPhase === 'HORN') setStopPhase('CLEAR');
    toast('YOU HAVE THE CONTROLS', 'glow');
  } else {
    hornOff();
    if (drive.engine === 'OFF' || drive.engine === 'SHUTDOWN') startEngine();
    if (sim.state === 'DRIVING') {
      const st = STATIONS[sim.station + 1], o = st ? sim.dist - st.dist : 0, w = st && stopWindow(st);
      if (st && (sim.speed < 1 || st.index === LAST_STATION) && o >= w[0] && o <= w[1]) {
        arrive(st.index, o);                             // standing at (or rolling into) the platform
      } else {
        if (st && o > 0) missStation(false);             // already past the mark: on to the next stop
        setState(sim.speed > 1 ? 'TRAVELING' : 'DEPARTING');
      }
    }
  }
  syncButtons();
}

// --- traction power (the code still calls it the engine) --------------------
function setEngine(s) {
  drive.engine = s;
  drive.engineT = 0;
  syncButtons();
}
function startEngine() { setEngine('CRANK'); playCrank(); }

function toggleEngine() {
  if (drive.engine === 'OFF') {
    if (drive.lever > 0) { toast('LEVER TO N FIRST', 'amber'); return; }
    startEngine();
  } else if (drive.engine === 'ON') {
    if (sim.speed > 0.5) toast('PANTOGRAPH DOWN - COASTING', 'amber');
    setEngine('SHUTDOWN');
    playAir(0.5, 0.05);
  }
}

// Motor load: nothing until the pantographs are up, ticking over, working
// with the notch (in AUTO with the journey phase), falling away
function updateEngine(dt) {
  const D = CONFIG.DRIVE;
  drive.engineT += dt;
  let target = 0, rate = 0.5;
  switch (drive.engine) {
    case 'CRANK':
      target = 0.12;
      if (drive.engineT >= D.CRANK_TIME) {              // on the wire: fans and compressors come to life
        setEngine('ON');
        drive.rpm = 0.3;
        playThump(0.1);
        toast('POWER ON', 'grassLight');
      }
      break;
    case 'SHUTDOWN':
      rate = 0.16;
      if (drive.engineT >= D.SHUTDOWN_TIME) { setEngine('OFF'); playAir(0.9, 0.07); }
      break;
    case 'ON':
      target = drive.on ? 0.3 + 0.7 * (sim.doorOpen > 0 ? 0 : Math.max(0, drive.lever)) / D.NOTCHES
             : sim.state === 'DEPARTING' ? 0.95 : sim.state === 'TRAVELING' ? 0.65 : sim.stopPhase === 'HORN' ? 0.6 : 0.3;
      if (target > drive.rpm) rate = 0.6;               // spools up a little faster than it winds down
      break;
  }
  drive.rpm += Math.max(-rate * dt, Math.min(rate * dt, target - drive.rpm));
}

// --- controls ---------------------------------------------------------------
function setLever(n) {
  const was = drive.lever;
  drive.lever = Math.max(EB, Math.min(CONFIG.DRIVE.NOTCHES, n));
  if (drive.lever === was) return;
  playNotch();
  if (drive.lever === EB) { toast('EMERGENCY BRAKE!', 'red'); playAir(1.3, 0.14); }
  else if (was < 0 && drive.lever >= 0 && sim.speed < 1) playAir(0.5, 0.04);    // brakes released
  if (drive.lever > 0 && was <= 0) {
    if (drive.engine === 'OFF' || drive.engine === 'SHUTDOWN') toast('RAISE THE PANTOGRAPH [E]', 'amber');
    else if (sim.doorOpen > 0) toast('CLOSE THE DOORS [O]', 'amber');
  }
}

function toggleLight() {
  drive.headlight = !drive.headlight;
  playNotch();
  toast(drive.headlight ? 'HEADLIGHT ON' : 'HEADLIGHT OFF', 'white');
}

// The doors button: open them at a platform once stopped, close them after boarding
function toggleDoors() {
  if (sim.state === 'STOPPED') {
    switch (sim.stopPhase) {
      case 'SETTLE': case 'READY': setStopPhase('DOORS_OPEN'); playAir(0.6, 0.06); break;
      case 'BOARDING': toast('PASSENGERS STILL BOARDING', 'amber'); break;
      case 'BOARDED': setStopPhase('DOORS_CLOSE'); playChime(); break;
      case 'WAIT': case 'FLAG': case 'CLEAR': case 'PARKED': toast('DOORS LOCKED', 'grayLight'); break;
    }
    return;
  }
  if (sim.speed > 0.3) { toast('STOP THE TRAIN FIRST', 'amber'); return; }
  const st = STATIONS[sim.station + 1];
  if (!st) return;
  const o = sim.dist - st.dist, w = stopWindow(st);
  if (o < -400) toast('NO PLATFORM HERE', 'amber');
  else if (o < w[0]) toast('PLATFORM AHEAD - ' + Math.ceil(w[0] - o) + ' M', 'amber');
  else if (o > w[1]) toast('OVERSHOT THE PLATFORM', 'red');
  else {
    arrive(st.index, o);
    scoreArrival(st.index, o);
    setStopPhase('DOORS_OPEN');
    playAir(0.6, 0.06);
  }
}

// --- driving ----------------------------------------------------------------
// Traction follows the motors (they take a moment to wind up), fades at speed and is
// cut while a door is open; brakes, rolling and air resistance oppose it
function updateDrive(dt) {
  const D = CONFIG.DRIVE, v = sim.speed;
  drive.tripT += dt;
  if (sim.state === 'STOPPED') updateStop(dt);
  const power = drive.lever > 0 && drive.engine === 'ON' && sim.doorOpen === 0 && !ui.complete ? drive.lever / D.NOTCHES : 0;
  const trac = Math.min(power, Math.max(0, (drive.rpm - 0.3) / 0.7)) * D.ACCEL * Math.min(1, D.KNEE / Math.max(v, 1));
  if (sim.state === 'STOPPED') {
    drive.accel = 0;
    if (trac <= 0 || !depart()) return;
  }
  const brake = drive.lever === EB ? D.EMERGENCY : drive.lever < 0 ? -drive.lever * D.BRAKE : 0;
  const resist = v > 0 ? D.DRAG[0] + D.DRAG[1] * v * v + brake : 0;
  sim.speed = Math.max(0, v + (trac - resist) * dt);
  sim.dist += (v + sim.speed) / 2 * dt;
  drive.accel = (sim.speed - v) / dt;
  if (v > 1.5 && sim.speed === 0) sim.shake = Math.max(sim.shake, drive.lever <= -3 ? 1.2 : 0.5);   // the brakes hold
  const harsh = Math.abs(drive.accel) - D.COMFORT_ACCEL;  // passengers thrown about
  if (harsh > 0) drive.comfort = Math.max(0, drive.comfort - harsh * dt * 1.5);
  checkSpeed(dt);
  checkLine();
}

// Pulling out of a station: anyone still waiting on the platform is left behind
function depart() {
  if (sim.station === LAST_STATION) return false;
  const st = STATIONS[sim.station];
  let waiting = 0;
  for (const q of sim.people) if (q.st === st.index && q.mode === 'wait') waiting++;
  if (waiting) penalty(waiting * 40, 'LEFT ' + waiting + ' BEHIND');
  else if (sim.stopPhase === 'FLAG' || sim.stopPhase === 'WAIT') penalty(150, 'LEFT BEFORE THE ALL CLEAR');
  sim.state = 'DRIVING';
  sim.stopPhase = null;
  sim.shake = Math.max(sim.shake, 0.5 + drive.lever * 0.12);   // couplings snatch
  return true;
}

function checkSpeed(dt) {
  drive.limit = speedLimitAt(sim.dist);
  const over = sim.speed > drive.limit + 3;
  if (over && !drive.over) toast('OVERSPEED! LIMIT ' + drive.limit, 'red');
  drive.over = over;
  if (!over) return;
  drive.pts.penalty -= 20 * dt;
  if ((drive.beepT -= dt) <= 0) { drive.beepT = 0.45; playBeep(); }
}

// Rolling past a platform without stopping, or into the buffers at Belgrave
function checkLine() {
  const st = STATIONS[sim.station + 1];
  if (!st) return;
  const o = sim.dist - st.dist;
  if (st.index !== LAST_STATION) { if (o > stopWindow(st)[1] + 40) missStation(true); return; }
  if (o < BUFFER_O) return;
  const hard = sim.speed > 12, bump = sim.speed > 3;
  sim.dist = st.dist + BUFFER_O;
  sim.speed = 0;
  if (!bump) return;                                    // just leaning on them
  sim.shake = hard ? 3 : 1;
  playThump(hard ? 0.6 : 0.2);
  if (hard) { drive.comfort = Math.max(0, drive.comfort - 35); penalty(300, 'HIT THE BUFFERS!'); }
}

function missStation(announce) {
  sim.station++;
  sim.nextStop = sim.station < LAST_STATION ? STATIONS[sim.station + 1].dist : Infinity;
  if (announce) penalty(400, 'MISSED ' + STATIONS[sim.station].en);
}

function penalty(n, msg) {
  drive.pts.penalty -= n;
  toast(msg + ' -' + n, 'red');
}

// Doors opened at a platform: how close to the mark, how close to time
function scoreArrival(i, o) {
  const a = Math.abs(o), late = lateMinutes(drive.tripT, SCHEDULE[i].arr), ok = CONFIG.DRIVE.ON_TIME;
  const tp = late <= ok ? 200 : Math.max(-200, Math.round(200 - 6 * (late - ok)));   // early is fine: departure waits
  drive.pts.time += tp;
  toast((late < -ok ? 'EARLY ' + wallMin(late) + ' MIN' : late <= ok ? 'ON TIME' : 'LATE ' + wallMin(late) + ' MIN') +
        (tp < 0 ? ' ' : ' +') + tp, tp >= 150 ? 'grassLight' : tp > 0 ? 'amber' : 'red');
  const [label, pts, col] = a <= 3 ? ['PERFECT STOP', 500, 'glow'] : a <= 10 ? ['GREAT STOP', 300, 'grassLight']
                          : a <= 25 ? ['GOOD STOP', 150, 'skyLight'] : ['STOPPED', 50, 'white'];
  drive.pts.stops += pts;
  toast(label + ' +' + pts, col, true);
  playScore(a <= 10);
}

function finishJourney() {
  ui.complete = true;
  panelSprites = null;
  hornOff();
  if (!drive.on) return;
  const P = drive.pts, comfort = Math.round(drive.comfort * 4);
  const total = Math.round(P.stops + P.time + P.pax + comfort + P.penalty);
  const best = readBest();
  if (total > best) try { localStorage.setItem('mpt-best', String(total)); } catch (e) { /* storage blocked */ }
  drive.final = { total, comfort, best, record: total > best && best > 0,
                  stars: total >= 3000 ? 3 : total >= 2200 ? 2 : total >= 1200 ? 1 : 0 };
  playScore(true);
}

// How hard the brakes bite, 0..1 (sparks) and how loudly they squeal near a stop
function brakeEffort() {
  if (drive.on) return sim.state === 'DRIVING' && drive.lever <= -2 ? (-drive.lever - 1) / 4 : 0;
  return sim.state === 'ARRIVING' ? Math.sin(Math.min(1, sim.timer / sim.segDur) * Math.PI) : 0;
}
function squealLevel() {
  const v = sim.speed, k = drive.on ? (drive.lever < 0 ? Math.min(1, -drive.lever / 3) : 0) : sim.state === 'ARRIVING' ? 0.6 : 0;
  return v > 0.3 && v < 26 ? k * (1 - v / 26) * Math.min(1, v / 2) : 0;
}

// --- messages: toasts across the sky, +10s over the doors -------------------
const toasts = [], TOAST_LIFE = 2.6;
function toast(text, col = 'white', big = false) {
  if (!drive.on) return;
  const last = toasts[toasts.length - 1];
  if (last && last.text === text) { last.t = 0; return; }
  toasts.push({ text, col, big, t: 0 });
  if (toasts.length > 3) toasts.shift();
}
function updateToasts(dt) {
  for (let i = toasts.length - 1; i >= 0; i--) if ((toasts[i].t += dt) > TOAST_LIFE) toasts.splice(i, 1);
}

const popPool = makePool(24, () => ({ x: 0, y: 0, t: 0, text: '', col: '' }));
function popup(x, y, text, col) {
  const q = poolSpawn(popPool, 24);
  if (q) { q.x = x; q.y = y; q.t = 0; q.text = text; q.col = col; }
}
function updatePopups(dt) {
  for (let i = 0; i < popPool.n; ) { if ((popPool.items[i].t += dt) < 1.2) i++; else poolKill(popPool, i); }
}

// Passengers in and out: a head count, and a fare for the driver
const screenXOf = q => Math.round(q.x + STATIONS[q.st].dist - Math.floor(sim.dist));
function passengerIn(q) {
  q.gone = true;
  drive.pax++;
  if (drive.on) { drive.pts.pax += 10; popup(screenXOf(q), PLAT.DOOR_TOP - 6, '+10', 'glow'); }
}
function passengerOut(q) {
  drive.pax = Math.max(0, drive.pax - 1);
  if (drive.on) { drive.pts.pax += 10; popup(screenXOf(q), PLAT.DOOR_TOP - 6, '+10', 'white'); }
}

// What the driver should do next, shown under the route map
function driveHint() {
  const e = drive.engine;
  if (ui.complete) return '';
  if (e === 'CRANK') return 'RAISING THE PANTOGRAPH...';
  const power = drive.lever < 0 ? 'RELEASE THE BRAKE [↑]' : 'APPLY POWER [↑]';
  if (sim.state === 'STOPPED') {
    const term = sim.station === LAST_STATION;
    switch (sim.stopPhase) {
      case 'SETTLE': case 'READY': return e === 'OFF' && sim.station === 0 ? 'RAISE THE PANTOGRAPH [E]' : 'OPEN THE DOORS [O]';
      case 'DOORS_OPEN': case 'BOARDING': return term ? 'PASSENGERS GETTING OFF...' : 'PASSENGERS BOARDING...';
      case 'BOARDED': return !term ? 'CLOSE THE DOORS [O]' : e === 'ON' ? 'LOWER THE PANTOGRAPH [E]' : '';
      case 'DOORS_CLOSE': return 'DOORS CLOSING...';
      case 'WAIT': return 'DEPARTS AT ' + hhmm(wallClock(tripHour(SCHEDULE[sim.station].dep))) + ' - WAIT';
      case 'FLAG': return 'WAIT FOR THE ALL CLEAR...';
      case 'CLEAR': return e === 'OFF' ? 'RAISE THE PANTOGRAPH [E]' : e === 'ON' ? power : '';
      case 'PARKED': return e === 'ON' ? 'LOWER THE PANTOGRAPH [E]' : '';
    }
    return '';
  }
  if (drive.over) return 'SLOW DOWN! LIMIT ' + drive.limit;
  const st = STATIONS[sim.station + 1];
  if (!st) return '';
  const o = sim.dist - st.dist, w = stopWindow(st);
  if (sim.speed < 0.3) {
    if (o >= w[0] && o <= w[1]) return 'OPEN THE DOORS [O]';
    if (e === 'OFF') return 'RAISE THE PANTOGRAPH [E]';
    if (o > w[1]) return 'OVERSHOT! DRIVE ON [↑]';
    if (o > -160) return 'CREEP UP ' + Math.ceil(w[0] - o) + ' M [↑]';
    return power;
  }
  if (o > -440 && o < w[0]) return 'BRAKE FOR ' + st.en + ' [↓]';
  return '';
}
