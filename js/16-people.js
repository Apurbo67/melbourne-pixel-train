// Melbourne Pixel Train - Passenger designs, sprites and platform behaviour
'use strict';

// =====================================================================
// 7. PEOPLE
// =====================================================================
// Each person is a procedural "design" (clothes, skin, what they carry),
// painted into small sprites on demand and cached per lighting.
// Frames: 0-3 walk cycle, 4 sitting, 5/6 sipping a coffee (or strumming),
// 7/8 signalling all clear.
const SKINS = ['peach', 'peach', 'tan', 'tan', 'brown', 'cream', 'rust'];
const HAIRS = ['ink', 'ink', 'ink', 'brownDark', 'brownDark', 'brown', 'amber', 'rust', 'grayLight'];
const SHIRTS = ['white', 'cream', 'skyLight', 'skyMid', 'grayLight', 'rose', 'blue', 'navy', 'ink', 'red', 'green', 'purple'];
const TROUSERS = ['navy', 'grayDark', 'ink', 'gray', 'indigo', 'tan'];
const SARIS = [['red', 'glow'], ['rose', 'white'], ['orange', 'red'], ['purple', 'glow'], ['blue', 'skyLight'],
               ['green', 'glow'], ['skyMid', 'white']];                              // [body, border]
const TEAMS = [['brown', 'glow'], ['glow', 'ink'], ['navy', 'white'], ['ink', 'white'], ['red', 'navy'], ['red', 'ink'], ['red', 'white']];   // footy scarves
const BAGS = ['brown', 'ink', 'red', 'navy', 'tan', 'grayDark'];
const PASSENGER_KINDS = ['office', 'office', 'office', 'office', 'casual', 'casual', 'casual', 'casual', 'dress', 'dress',
                         'student', 'student', 'tradie', 'tradie', 'footy', 'hijab', 'sari', 'child', 'child', 'elder', 'elder'];
const PERSON_W = 13, PERSON_H = 20, PERSON_CX = 6, PERSON_FY = 19;   // sprite box, centre column, feet row
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

let designId = 0;
function makeDesign(rng, kind, kinds = PASSENGER_KINDS) {
  kind = kind || pick(rng, kinds);
  const d = { id: ++designId, kind, skin: pick(rng, SKINS), hair: pick(rng, HAIRS), h: 12, carry: null, shoe: 'ink', toe: true,
              bagColor: pick(rng, BAGS) };
  const carry = opts => { const r = rng(); let a = 0; for (const [k, w] of opts) if (r < (a += w)) { d.carry = k; break; } };
  switch (kind) {
    case 'office':  d.bottom = pick(rng, ['navy', 'grayDark', 'ink', 'gray']);
                    d.top = rng() < 0.7 ? d.bottom : pick(rng, ['white', 'skyLight', 'cream']);
                    d.shirt = d.top === d.bottom ? pick(rng, ['white', 'skyLight', 'rose']) : null;
                    d.long = rng() < 0.4; carry([['bag', 0.4], ['coffee', 0.25], ['phone', 0.12]]); break;
    case 'casual':  d.top = pick(rng, SHIRTS); d.bottom = pick(rng, ['blue', 'navy', 'ink', 'grayDark', 'tan']);
                    d.long = rng() < 0.4; d.bare = rng() < 0.2; d.shoe = rng() < 0.5 ? 'white' : 'ink';
                    if (rng() < 0.15) { d.head = pick(rng, ['navy', 'red', 'ink', 'white']); d.peak = true; }
                    carry([['backpack', 0.25], ['bag', 0.2], ['coffee', 0.15], ['phone', 0.12]]); break;
    case 'student': d.top = pick(rng, ['red', 'navy', 'grayLight', 'ink', 'green', 'purple', 'white']); d.bottom = pick(rng, ['blue', 'ink', 'navy']);
                    d.long = rng() < 0.5; d.shoe = 'white'; d.carry = 'backpack'; break;
    case 'dress':   d.top = pick(rng, ['rose', 'red', 'skyMid', 'purple', 'glow', 'green', 'ink', 'white', 'orange']);
                    d.long = true; d.shoe = pick(rng, ['ink', 'red', 'white']); d.toe = false; carry([['bag', 0.5], ['coffee', 0.15]]); break;
    case 'tradie':  d.top = rng() < 0.6 ? 'glow' : 'orange'; d.top2 = 'navy'; d.bottom = 'navy'; d.bare = rng() < 0.7; d.shoe = 'tan';
                    if (rng() < 0.5) { d.head = 'navy'; d.peak = true; }
                    carry([['bag', 0.45], ['coffee', 0.3]]); break;
    case 'footy': { const [a, b] = pick(rng, TEAMS);
                    d.top = pick(rng, ['navy', 'ink', 'grayDark', a]); d.bottom = pick(rng, ['blue', 'ink', 'navy']);
                    d.scarf = a; d.scarf2 = b; d.long = rng() < 0.3;
                    if (rng() < 0.6) { d.head = a; d.pom = b; }
                    break; }
    case 'hijab':   d.head = pick(rng, ['rose', 'cream', 'skyMid', 'purple', 'white', 'ink', 'haze']); d.long = true;
                    d.top = pick(rng, ['navy', 'purple', 'cream', 'haze', 'rose', 'grayDark']); d.bottom = pick(rng, ['navy', 'ink', 'grayDark', 'white']);
                    carry([['bag', 0.5], ['backpack', 0.15]]); break;
    case 'sari':    [d.cloth, d.accent] = pick(rng, SARIS); d.long = true; d.shoe = d.skin; d.toe = false;
                    if (rng() < 0.5) d.head = d.cloth;
                    carry([['bag', 0.4]]); break;
    case 'child':   d.h = 8; d.girl = rng() < 0.5; d.bottom = pick(rng, TROUSERS);
                    d.top = d.girl ? pick(rng, ['rose', 'red', 'glow', 'skyMid', 'purple']) : pick(rng, SHIRTS); break;
    case 'elder':   d.hair = 'white'; d.top = pick(rng, ['cream', 'grayLight', 'rose', 'haze', 'tan']); d.bottom = pick(rng, ['grayDark', 'navy', 'brown']);
                    d.beard = rng() < 0.3; d.shoe = 'brownDark'; d.toe = false; break;
    case 'staff':   d.top = 'orange'; d.top2 = 'navy'; d.bottom = 'navy'; d.head = 'navy'; d.peak = true; break;   // hi-vis over navy
    case 'busker':  d.top = pick(rng, ['red', 'ink', 'green', 'purple']); d.bottom = 'ink'; d.long = true; d.carry = 'guitar';
                    if (rng() < 0.5) { d.head = 'brown'; d.peak = true; }
                    break;
  }
  return d;
}

function paintPerson(g, d, p, frame) {
  const ox = PERSON_CX - 2, oy = PERSON_FY - d.h + 1;
  const P = (x, y, k) => { g.fillStyle = p[k]; g.fillRect(ox + x, oy + y, 1, 1); };
  const R = (x, y, w, h, k) => { g.fillStyle = p[k]; g.fillRect(ox + x, oy + y, w, h); };
  const s = d.skin, walk = frame < 4 ? frame : 0, stride = walk === 1 || walk === 3;

  if (d.kind === 'child') {                               // 8 px tall
    R(1, 0, 3, 1, d.hair); P(1, 1, d.hair); R(2, 1, 2, 1, s); R(1, 2, 3, 1, s);
    if (d.girl) {                                         // frock and a pigtail
      P(0, 1, d.hair); R(1, 3, 3, 4, d.top);
      if (stride) { P(0, 6, d.top); P(4, 6, d.top); }
    } else {
      R(1, 3, 3, 3, d.top);
      if (stride) { P(1, 6, d.bottom); P(3, 6, d.bottom); } else R(2, 6, 2, 1, d.bottom);
    }
    if (stride) { P(0, 7, s); P(4, 7, s); } else { P(2, 7, s); P(3, 7, s); }
    if (walk === 1) P(4, 4, s); else if (walk === 3) P(0, 4, s);
    return;
  }

  const sit = frame === 4, dy = sit ? 3 : 0, lean = d.kind === 'elder' && !sit ? 1 : 0;
  const cover = d.head || d.hair;                         // cap, beanie, headscarf, or just hair
  // 3x3 head facing right; elders stoop forward a pixel
  R(1 + lean, dy, 3, 1, cover);
  P(1 + lean, dy + 1, cover); R(2 + lean, dy + 1, 2, 1, s);
  P(1 + lean, dy + 2, d.long ? cover : s); R(2 + lean, dy + 2, 2, 1, s);
  if (d.peak) P(4, dy, cover);                            // cap peak
  if (d.pom) P(2, dy - 1, d.pom);                         // bobble on the beanie
  if (d.beard) P(3 + lean, dy + 2, 'white');

  const lower = d.kind === 'sari' ? d.cloth : d.bottom, leg = d.bare ? s : lower;
  if (sit) {
    R(1, 6, 3, 3, d.kind === 'sari' ? d.cloth : d.top);
    if (d.kind === 'sari') P(1, 6, d.accent);
    if (d.top2) R(1, 8, 3, 1, d.top2);
    if (d.scarf) R(1, 6, 3, 1, d.scarf);
    for (let x = 1; x <= 4; x++) P(x, 9, x > 2 ? leg : lower);    // thighs along the seat
    P(4, 10, leg);
    P(4, 11, d.shoe); P(5, 11, d.shoe);
    P(3, 8, s);                                          // hands in the lap
    if (d.carry === 'coffee') P(4, 7, 'white');
    return;
  }

  switch (d.kind) {
    case 'sari':                                         // drape to the ankles, pallu over the shoulder
      R(1, 3, 3, 8, d.cloth);
      R(1, 3, 1, 3, d.accent);
      R(1, 10, 3, 1, d.accent);
      if (stride) { P(0, 10, d.accent); P(4, 10, d.accent); }
      break;
    case 'dress':                                        // dress to the knee
      R(1, 3, 3, 6, d.top);
      if (stride) { P(0, 8, d.top); P(4, 8, d.top); P(1, 9, s); P(3, 9, s); P(0, 10, s); P(4, 10, s); }
      else R(2, 9, 2, 2, s);
      break;
    case 'hijab':                                        // long tunic over trousers
      R(1, 3, 3, 6, d.top);
      R(1, 3, 3, 1, cover);
      if (stride) { P(1, 9, d.bottom); P(3, 9, d.bottom); P(0, 10, d.bottom); P(4, 10, d.bottom); }
      else R(2, 9, 2, 2, d.bottom);
      break;
    default:                                             // top and trousers - or shorts, whatever the weather
      R(1, 3, 3, 4, d.top);
      if (d.shirt) P(3, 3, d.shirt);                     // collar under the jacket
      if (d.top2) R(1, 5, 3, 2, d.top2);                 // two-tone hi-vis
      R(1, 7, 3, 1, d.bottom);
      if (stride) { R(1, 8, 3, 1, d.bottom); P(1, 9, leg); P(3, 9, leg); P(0, 10, leg); P(4, 10, leg); }
      else { R(2, 8, 2, 1, d.bottom); R(2, 9, 2, 2, leg); }
  }
  if (d.scarf) { R(1, 3, 3, 1, d.scarf); P(1, 4, d.scarf2); P(1, 5, d.scarf); }   // one end hanging down
  if (stride) { P(0, 11, d.shoe); P(4, 11, d.shoe); } else { P(2, 11, d.shoe); P(3, 11, d.shoe); }
  if (d.toe) P(stride ? 5 : 4, 11, d.shoe);              // shoes point forward

  // arms and whatever they carry
  const hand = frame === 6 ? [4, 3] : frame === 5 ? [4, 5] : walk === 1 ? [4, 6] : walk === 3 ? [0, 6] : [3, 7];
  switch (d.carry) {
    case 'bag':      R(4, 7, 2, 2, d.bagColor); P(4, 6, s); break;
    case 'backpack': R(0, 3, 1, 4, d.bagColor); P(hand[0], hand[1], s); break;
    case 'coffee':   P(4, 5, s); P(4, 4, 'white'); break;                  // takeaway cup
    case 'phone':    P(4, 4, s); P(4, 3, 'ink'); break;                    // eyes on the phone
    case 'guitar':   R(2, 6, 3, 2, 'amber'); P(3, 6, 'brownDark'); P(1, 5, 'brown'); P(0, 4, 'brown'); P(0, 5, s);
                     P(frame === 6 ? 4 : 3, frame === 6 ? 7 : 6, s); break; // the strumming hand
    default:
      if (d.kind === 'elder') { R(5, 6, 1, 6, 'brown'); P(4, 6, s); }      // walking stick
      else if (d.kind !== 'staff') P(hand[0], hand[1], s);
  }
  if ((frame === 5 || frame === 6) && d.carry !== 'guitar') P(hand[0], hand[1] - 1, 'white');   // a flat white
  if (d.kind === 'staff') {
    if (frame === 7) {                                   // arm straight up, the white paddle shown to the driver
      P(4, 3, d.top); P(4, 2, s); P(4, 1, s);
      R(3, -2, 3, 3, 'white'); P(4, -1, 'grassLight');
    } else if (frame === 8) {
      P(4, 3, d.top); P(5, 2, s); P(5, 1, s);
      R(5, -2, 3, 3, 'white'); P(6, -1, 'grassLight');
    } else {                                             // paddle at their side
      P(4, 6, s); R(4, 7, 1, 3, 'white');
    }
  }
}

function personSprite(v, d, frame, dir) {
  let set = v.people.get(d.id);
  if (!set) v.people.set(d.id, set = []);
  const key = frame * 2 + (dir < 0 ? 1 : 0);
  if (!set[key]) {
    const [c, g] = makeCanvas(PERSON_W, PERSON_H);
    if (dir < 0) { g.translate(PERSON_W, 0); g.scale(-1, 1); }   // exact pixel mirror
    paintPerson(g, d, v.p, frame);
    set[key] = c;
  }
  return set[key];
}

function personFrame(q) {
  if (q.walking) return Math.floor(q.anim) % 4;
  if (q.mode === 'sit') return 4;
  if (q.mode === 'sip') return q.t % 3.4 > 2.3 ? 6 : 5;
  if (q.mode === 'busk') return Math.floor(q.t * 3.2) & 1 ? 6 : 5;
  if (q.mode === 'guard' && sim.state === 'STOPPED' && sim.station === q.st &&
      (sim.stopPhase === 'FLAG' || sim.stopPhase === 'HORN' || sim.stopPhase === 'CLEAR')) return 7 + (Math.floor(sim.clock * 4) & 1);
  return 0;
}

function drawPersonAt(g, v, q, off) {
  const spr = personSprite(v, q.d, personFrame(q), q.dir);
  const x = Math.round(q.x) + off - PERSON_CX, y = Math.round(q.y) - PERSON_FY;
  if (q.clip === null) { g.drawImage(spr, x, y); return; }
  // stepping through a doorway: only the part inside the door column shows
  g.save();
  g.beginPath();
  g.rect(q.clip + off, PLAT.DOOR_TOP, 4, PLAT.EDGE_Y - PLAT.DOOR_TOP + 1);
  g.clip();
  g.drawImage(spr, x, y);
  g.restore();
}

// --- behaviour ---------------------------------------------------------
// People follow a list of waypoints; a waypoint may clip them to a door
// column (climbing in or out) and may run a callback when reached.
const gone = q => { q.gone = true; };
const nearestDoor = x => DOORS.reduce((a, b) => Math.abs(b + 2 - x) < Math.abs(a + 2 - x) ? b : a);
const randWalkY = rng => PLAT.WALK_MIN + Math.floor(rng() * (PLAT.WALK_MAX - PLAT.WALK_MIN + 1));

function spawnPerson(st, d, x, y, dir, mode) {
  const speed = d.kind === 'elder' ? 7 : d.kind === 'child' ? 13 : 11 + Math.random() * 5;
  const q = { st: st.index, d, x, y, dir, mode, speed, path: [], anim: 0, t: Math.random() * 3,
              delay: 0, clip: null, hidden: false, walking: false, turnAt: 2 + Math.random() * 6 };
  sim.people.push(q);
  return q;
}

function populateStation(st) {
  sim.populated.add(st.index);
  const rng = mulberry32((Math.random() * 1e9) | 0);    // a different crowd every trip
  const [L, R] = st.platform, kinds = st.kinds || PASSENGER_KINDS;
  const plain = (...ks) => { const d = makeDesign(rng, pick(rng, ks)); if (d.carry !== 'coffee') d.carry = null; return d; };
  for (let i = 0; i < st.crowd; i++)                    // waiting to board, spread along the train
    spawnPerson(st, makeDesign(rng, null, kinds), 24 + rng() * 244, randWalkY(rng), rng() < 0.5 ? 1 : -1, 'wait');
  for (let i = 0; i < st.idle; i++) {                   // just standing about
    let x;
    do x = L + 10 + rng() * (R - L - 20); while (x > PLAT.STALL_X - 4 && x < PLAT.STALL_X + 34);
    spawnPerson(st, makeDesign(rng, null, kinds), x, randWalkY(rng), rng() < 0.5 ? 1 : -1, 'idle');
  }
  for (const it of st.layout)                           // someone resting on a bench
    if (it.type === 'bench' && rng() < 0.5)
      spawnPerson(st, plain('office', 'casual', 'dress', 'elder', 'student', 'hijab', 'tradie'), it.x + 3, it.y, rng() < 0.5 ? 1 : -1, 'sit');
  const sipper = plain('office', 'casual', 'tradie');   // a regular at the coffee cart
  sipper.carry = null;
  spawnPerson(st, sipper, PLAT.STALL_X + 31, PLAT.STALL_Y + 2, -1, 'sip');
  const pacer = spawnPerson(st, makeDesign(rng, pick(rng, ['office', 'casual', 'student'])), 60 + rng() * 150, PLAT.WALK_MAX, 1, 'patrol');
  pacer.ax = Math.max(L + 20, -120);                    // up and down the platform, checking the time
  pacer.bx = Math.min(R - 46, 440);
  spawnPerson(st, makeDesign(rng, 'staff'), 14, 167, 1, 'guard');   // platform staff, out by the yellow line
  if (st.extras.includes('busker')) spawnPerson(st, makeDesign(rng, 'busker'), 204, 169, -1, 'busk');
}


// Doors are open: a few passengers step off, then the waiting ones board.
// A driver rarely stops exactly on the mark, so the doors stand at
// DOORS + sim.stopOffset in stop coordinates.
function startBoarding(st) {
  const terminus = st.index === LAST_STATION, o = Math.round(sim.stopOffset);
  // everyone gets off at the end of the line; a driver can't deliver more than they carry
  const alight = terminus ? Math.max(st.alight, Math.min(20, drive.pax)) : drive.on ? Math.min(st.alight, drive.pax) : st.alight;
  for (let i = 0; i < alight; i++) {
    const door = DOORS[Math.floor(Math.random() * DOORS.length)] + o, x = door + 2;
    const q = spawnPerson(st, makeDesign(Math.random), x, PLAT.DOOR_FLOOR, x - o < 150 ? -1 : 1, 'alight');
    const y = randWalkY(Math.random), exit = (x - o < 150 ? -24 : W + 24) + o;   // just off screen
    q.hidden = true;
    q.delay = i * (terminus ? 0.5 : 0.45) + Math.random() * 0.6;
    q.path = [{ x, y: PLAT.EDGE_Y, clip: door, speed: 18, then: passengerOut },
              { x: x + Math.sign(exit - x) * 4, y },
              { x: exit, y, then: gone }];
  }
  for (const q of sim.people) {
    if (q.st !== st.index) continue;
    if (q.mode === 'wait') {
      const door = nearestDoor(q.x - o) + o, x = door + 2;
      q.mode = 'board';
      q.delay = (st.alight ? 1.4 : 0.3) + Math.random() * 3;
      q.path = [{ x, y: q.y }, { x, y: PLAT.EDGE_Y }, { x, y: PLAT.DOOR_FLOOR, clip: door, speed: 18, then: passengerIn }];
    }
  }
}

function boardingDone(st) {
  return !sim.people.some(q => q.st === st.index &&
    (q.mode === 'board' ||
     (q.mode === 'alight' && (q.hidden || q.path.length > 2))));
}

function moveAlong(q, dt) {
  const wp = q.path[0], dx = wp.x - q.x, dy = wp.y - q.y, dist = Math.hypot(dx, dy);
  const step = (wp.speed || q.speed) * dt;
  q.clip = wp.clip === undefined ? null : wp.clip;
  if (Math.abs(dx) > 0.01) q.dir = dx > 0 ? 1 : -1;
  q.walking = true;
  q.anim += Math.min(dist, step) / 3;
  if (dist <= step) {
    q.x = wp.x; q.y = wp.y;
    q.path.shift();
    q.clip = null;
    if (wp.then) wp.then(q);
  } else {
    q.x += dx / dist * step;
    q.y += dy / dist * step;
  }
}

function updatePerson(q, dt) {
  q.t += dt;
  q.walking = false;
  if (q.delay > 0) {
    q.delay -= dt;
    if (q.delay <= 0) q.hidden = false;
    return;
  }
  if (q.path.length) { moveAlong(q, dt); return; }
  switch (q.mode) {
    case 'idle': case 'wait':
      if (q.t > q.turnAt) { q.dir = -q.dir; q.turnAt = q.t + 2 + Math.random() * 6; }
      break;
    case 'patrol':                                       // someone pacing the platform
      q.path = [{ x: q.x < (q.ax + q.bx) / 2 ? q.bx : q.ax, y: q.y }];
      q.delay = 1 + Math.random() * 2;
      break;
  }
}

function updatePeople(dt) {
  for (const st of STATIONS)
    if (!sim.populated.has(st.index) && Math.abs(st.dist - sim.dist) < 1000) populateStation(st);
  for (const q of sim.people) updatePerson(q, dt);
  let n = 0;
  for (const q of sim.people) {
    if (q.gone || Math.abs(STATIONS[q.st].dist - sim.dist) > 1200) { forgetPerson(q); continue; }
    sim.people[n++] = q;
  }
  sim.people.length = n;
}

function forgetPerson(q) {
  for (const k in VARIANTS) VARIANTS[k].people.delete(q.d.id);
}
