// Melbourne Pixel Train - Autopilot: stop routine, departing, cruising, arriving
'use strict';

// =====================================================================
// 8. JOURNEY STATE MACHINE
// =====================================================================
//   STOPPED --(stop routine)--> DEPARTING --(ACCEL_TIME)--> TRAVELING
//      ^                                                        |
//      +-------- ARRIVING <--(braking distance reached)---------+
//
// While STOPPED, a sub-phase runs the station routine:
//   SETTLE > DOORS_OPEN > BOARDING > DOORS_CLOSE > FLAG > HORN > (depart)
// and at the last station DOORS_CLOSE leads to PARKED > TERMINUS instead.
// In DRIVE mode (section 8a) the driver owns some steps, which wait for
// input: READY (open the doors), BOARDED (close them), CLEAR (depart),
// PARKED (drop the pantographs); between stations the state is DRIVING.
//
// Departing and arriving follow a smoothstep velocity curve (zero
// acceleration at both ends). Position is the exact integral of that
// curve, so the train always comes to rest exactly at the platform.
const sim = {
  state: 'STOPPED', stopPhase: 'SETTLE', phaseT: 0, timer: 0,
  speed: 0, dist: 0,                       // dist = world px travelled = camera x
  segStart: 0, segSpeed: 0, segDur: 0,     // current accel / brake segment
  station: 0,                              // index of the last station stopped at (or passed)
  stopOffset: 0,                           // how far past the stop mark the train stands (DRIVE)
  nextStop: 0,
  doorOpen: 0,                             // 0 closed .. 1 open
  wheelAngle: 0, swayPhase: 0, clock: 0, cloudDrift: 0,
  hour: CONFIG.HOUR_START, night: 1,       // time of day (0..24) and how dark it is (0..1)
  fluffAcc: 0, sparkAcc: 0, bellT: 0, bellN: 0, birdT: 3,
  people: [], populated: new Set(),
  fxRng: null, wxRng: null,                // seeded: same birds, fluff and weather every trip
  onBridge: false, bridgeMix: 0,           // see updateBridge(); drives the bridge rumble
  shake: 0, hornWave: 0, hornTimer: 8, jointAcc: 0,
};

const smoothstep = u => u * u * (3 - 2 * u);

function setState(s) {
  sim.state = s;
  sim.timer = 0;
  sim.segStart = sim.dist;
  sim.stopPhase = null;
  if (s === 'ARRIVING') {
    // fit the braking curve to the remaining distance: d = v0 * T / 2
    sim.segSpeed = sim.speed;
    sim.segDur = Math.max(0.2, 2 * (sim.nextStop - sim.dist) / Math.max(1, sim.speed));
  } else if (s === 'DEPARTING') {
    sim.shake = 1.6;                                     // couplings snatch as the train pulls away
  } else if (s === 'STOPPED') {
    sim.speed = 0;
    setStopPhase('SETTLE');
    sim.nextStop = sim.station < LAST_STATION ? STATIONS[sim.station + 1].dist : Infinity;
  }
}

function setStopPhase(ph) {
  sim.stopPhase = ph;
  sim.phaseT = 0;
  if (drive.on) syncButtons();                          // the doors button says OPEN or CLOSE
}

// Come to rest at station i, o px past its stop mark
function arrive(i, o) {
  sim.station = i;
  sim.dist = STATIONS[i].dist + o;
  sim.stopOffset = o;
  setState('STOPPED');
}

function updateStop(dt) {
  const st = STATIONS[sim.station], terminus = sim.station === LAST_STATION, auto = !drive.on;
  sim.phaseT += dt;
  switch (sim.stopPhase) {
    case 'SETTLE':
      if (sim.phaseT >= CONFIG.SETTLE_TIME) setStopPhase(auto ? 'DOORS_OPEN' : 'READY');
      break;
    case 'READY':                                         // the driver opens the doors
      if (auto) setStopPhase('DOORS_OPEN');
      break;
    case 'DOORS_OPEN':
      sim.doorOpen = Math.min(1, sim.phaseT / CONFIG.DOOR_TIME);
      if (sim.doorOpen >= 1) { startBoarding(st); setStopPhase('BOARDING'); }
      break;
    case 'BOARDING':
      if ((sim.phaseT > 1 && boardingDone(st)) || sim.phaseT >= CONFIG.BOARD_TIMEOUT) {
        setStopPhase(auto ? 'DOORS_CLOSE' : 'BOARDED');
        if (auto) playChime();
      }
      break;
    case 'BOARDED':                                       // the driver closes the doors
      if (auto) setStopPhase('DOORS_CLOSE');
      else if (terminus && drive.engine === 'OFF') setStopPhase('TERMINUS');
      break;
    case 'DOORS_CLOSE':
      sim.doorOpen = Math.max(0, 1 - sim.phaseT / CONFIG.DOOR_TIME);
      if (sim.doorOpen <= 0) setStopPhase(terminus ? 'PARKED' : 'WAIT');
      break;
    case 'WAIT':                                          // a driver early on the timetable waits for departure time
      if (auto || drive.tripT >= SCHEDULE[sim.station].dep - CONFIG.FLAG_TIME) setStopPhase('FLAG');
      break;
    case 'FLAG':                                          // platform staff hold up the all clear
      if (sim.phaseT < CONFIG.FLAG_TIME) break;
      if (auto) { setStopPhase('HORN'); playHorn(false); }
      else { setStopPhase('CLEAR'); toast('ALL CLEAR - DEPART', 'grassLight'); }
      break;
    case 'CLEAR':                                         // the driver takes the train out
      if (auto) { setStopPhase('HORN'); playHorn(false); }
      break;
    case 'HORN':
      if (sim.phaseT >= CONFIG.HORN_TIME) setState('DEPARTING');
      break;
    case 'PARKED':                                        // the driver drops the pantographs
      if (auto || drive.engine === 'OFF') setStopPhase('TERMINUS');
      break;
    case 'TERMINUS':
      if (sim.phaseT >= 1.5 && !ui.complete) finishJourney();
      break;
  }
}

// Back to Flinders Street with a fresh crowd
function startJourney() {
  for (const q of sim.people) forgetPerson(q);
  sim.people.length = 0;
  sim.populated.clear();
  birdPool.n = fluffPool.n = sparkPool.n = 0;
  for (const c of CROSSINGS) c.tooted = false;
  sim.fxRng = mulberry32(2024);
  sim.wxRng = mulberry32(1854);
  resetWeather();
  sim.hornTimer = 8;
  sim.doorOpen = 0;
  arrive(0, 0);
  resetDrive();
  ui.complete = false;
  panelSprites = null;
}

function updateJourney(dt) {
  const V = CONFIG.CRUISE_SPEED;
  if (ui.title) return;                                 // the train waits behind the title card
  if (drive.on) { updateDrive(dt); return; }
  switch (sim.state) {
    case 'STOPPED':
      updateStop(dt);
      break;

    case 'DEPARTING': {
      sim.timer += dt;
      const T = CONFIG.ACCEL_TIME, u = Math.min(1, sim.timer / T);
      sim.speed = V * smoothstep(u);
      sim.dist = sim.segStart + V * T * (u ** 3 - u ** 4 / 2);         // integral of smoothstep
      if (u >= 1) setState('TRAVELING');
      break;
    }

    case 'TRAVELING':                                   // (eases back to cruise when the driver hands over)
      sim.speed += Math.max(-12 * dt, Math.min(12 * dt, V - sim.speed));
      sim.dist += sim.speed * dt;
      if (sim.nextStop - sim.dist <= V * CONFIG.BRAKE_TIME / 2) setState('ARRIVING');
      break;

    case 'ARRIVING': {
      sim.timer += dt;
      const T = sim.segDur, u = Math.min(1, sim.timer / T);
      sim.speed = sim.segSpeed * (1 - smoothstep(u));
      sim.dist = sim.segStart + sim.segSpeed * T * (u - u ** 3 + u ** 4 / 2);
      if (u >= 1) {
        arrive(sim.station + 1, 0);
        sim.shake = 1.4;                                 // the last jolt as the brakes hold
      }
      break;
    }
  }
}
