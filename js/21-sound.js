// Melbourne Pixel Train - All sound, synthesised with Web Audio
'use strict';

// --- sound: everything synthesised with Web Audio, no files -----------------
// The context is created on the first click / tap / key (browser rule).
// Continuous beds (rumble, bridge ring, crowd, rain) are looping noise
// through filters whose gains follow the scene; one-shots (rail joints,
// horn, thunder) are scheduled ahead on the audio clock.
const audio = { ctx: null, muted: false, master: null, noise: null, unlockedAt: 0, bedT: 0,
                rumble: null, metal: null, boom: null, murmur: null, rain: null, patter: null,
                engine: null, engOsc: null, engSub: null, engLfo: null, whine: null, whineF: null, squeal: null,
                horn: null, hornT0: 0 };                // horn: the voice held down in DRIVE
const JOINT_PX = 96;                                    // one rail length between joints
const AXLES = [0, 8, 30, 38];                           // a carriage's two bogies: clickety ... clack
const HORN_TONES = [370.0, 466.2];                      // F-sharp and B-flat: a suburban train's two-tone whistle
const audioOn = () => audio.ctx && audio.ctx.state === 'running' && !audio.muted;

function unlockAudio() {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { audio.ctx = new AC(); } catch (e) { return; }
    audio.unlockedAt = performance.now();
    buildAudioGraph();
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume().then(syncButtons, syncButtons);
  syncButtons();
}

function buildAudioGraph() {
  const ac = audio.ctx;
  audio.master = ac.createGain();
  audio.master.gain.value = audio.muted ? 0 : 0.9;
  audio.master.connect(ac.destination);
  const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;      // 2 s of white noise, shared
  audio.noise = buf;
  const loop = () => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); return s; };
  const filt = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
  const gain = v => { const n = ac.createGain(); n.gain.value = v; return n; };
  const chain = nodes => { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); };
  const lfo = (hz, depth, param) => { const o = ac.createOscillator(), gn = gain(depth); o.frequency.value = hz; o.connect(gn); gn.connect(param); o.start(); };
  // wheels on rails: low rumble always, a ringing steel note and a hollow boom on the bridge
  audio.rumble = gain(0); chain([loop(), filt('lowpass', 220), audio.rumble, audio.master]);
  audio.metal = gain(0); chain([loop(), filt('bandpass', 2600, 7), audio.metal, audio.master]);
  audio.boom = gain(0); chain([loop(), filt('bandpass', 110, 4), audio.boom, audio.master]);
  // station crowd: two voice-band noises whose loudness wobbles like chatter
  audio.murmur = gain(0);
  const v1 = gain(0.55), v2 = gain(0.3);
  chain([loop(), filt('bandpass', 420, 1.2), v1, audio.murmur]);
  chain([loop(), filt('bandpass', 980, 2.2), v2, audio.murmur]);
  lfo(0.9, 0.3, v1.gain); lfo(2.3, 0.15, v1.gain); lfo(1.7, 0.2, v2.gain);
  chain([audio.murmur, filt('lowpass', 1600), audio.master]);
  // rain: hiss plus a brighter patter
  audio.rain = gain(0); chain([loop(), filt('highpass', 1200), filt('lowpass', 7500), audio.rain, audio.master]);
  audio.patter = gain(0); chain([loop(), filt('bandpass', 3800, 1.5), audio.patter, audio.master]);
  // electric traction: a steady hum from the gear under the floor, and the
  // motors' whine, its pitch climbing with the speed, loudest under power
  const osc = type => { const o = ac.createOscillator(); o.type = type; o.start(); return o; };
  audio.engine = gain(0);
  audio.engOsc = osc('sawtooth');
  audio.engOsc.frequency.value = 100;
  chain([audio.engOsc, filt('lowpass', 240), gain(0.5), audio.engine]);
  chain([loop(), filt('bandpass', 460, 2), gain(0.6), audio.engine]);                 // fans
  audio.engine.connect(audio.master);
  audio.whine = gain(0);
  audio.whineF = filt('bandpass', 900, 3);
  audio.engSub = osc('sawtooth'); audio.engLfo = osc('square');
  chain([audio.engSub, audio.whineF, audio.whine, audio.master]);
  chain([audio.engLfo, gain(0.3), audio.whineF]);
  // brake squeal in the last metres before a stop
  audio.squeal = gain(0);
  const sq = osc('sine');
  sq.frequency.value = 3150;
  lfo(6.5, 40, sq.frequency);
  chain([sq, audio.squeal, audio.master]);
}

function setMuted(m) {
  audio.muted = m;
  if (audio.master) audio.master.gain.setTargetAtTime(m ? 0 : 0.9, audio.ctx.currentTime, 0.05);
  syncButtons();
}

// Ten times a second, steer the continuous beds towards the scene
function updateAudioBeds(dt) {
  if (!audio.ctx || audio.ctx.state !== 'running' || (audio.bedT += dt) < 0.1) return;
  audio.bedT = 0;
  const now = audio.ctx.currentTime, run = ui.paused ? 0 : 1, sp = Math.min(1, sim.speed / CONFIG.CRUISE_SPEED) * run;
  const st = STATIONS[sim.state === 'STOPPED' ? sim.station : Math.min(LAST_STATION, sim.station + 1)];
  const near = Math.max(0, 1 - Math.abs(st.dist - sim.dist) / 500) * Math.min(1, sim.people.length / 8) * run;
  const set = (node, v) => node.gain.setTargetAtTime(v, now, 0.15);
  set(audio.rumble, sp * (0.16 + 0.12 * sim.bridgeMix));
  set(audio.metal, sp * sim.bridgeMix * 0.05);
  set(audio.boom, sp * sim.bridgeMix * 0.35);
  set(audio.murmur, near * 0.09);
  set(audio.rain, weather.level * 0.16 * run);
  set(audio.patter, weather.level * 0.05 * run);
  const rpm = drive.rpm, load = Math.min(1, Math.max(0, rpm - 0.3) / 0.7 + brakeEffort() * 0.5), vol = (drive.on ? 1 : 0.6) * run;
  const vk = Math.min(1.3, sim.speed / CONFIG.CRUISE_SPEED), f = 230 + vk * 640;
  audio.engSub.frequency.setTargetAtTime(f, now, 0.15);
  audio.engLfo.frequency.setTargetAtTime(f * 1.5, now, 0.15);
  audio.whineF.frequency.setTargetAtTime(f * 1.25, now, 0.15);
  set(audio.engine, rpm > 0.02 ? 0.03 * vol : 0);
  set(audio.whine, sim.speed > 0.5 || rpm > 0.35 ? load * (0.25 + 0.75 * Math.min(1, vk * 3)) * 0.022 * vol : 0);
  set(audio.squeal, squealLevel() * 0.02 * run);
}

// Rail joints: every JOINT_PX of travel, the four axles of a carriage click
// over it in turn - so the rhythm follows the speed exactly
function trackSound(dt) {
  sim.jointAcc += sim.speed * dt;
  if (sim.jointAcc < JOINT_PX) return;
  sim.jointAcc -= JOINT_PX;
  if (!audioOn() || sim.speed < 3) return;
  const now = audio.ctx.currentTime, rate = sim.speed * timeScale();
  for (let i = 0; i < AXLES.length; i++) playClick(now + 0.02 + AXLES[i] / rate, i === 0 || i === 2);
}

function playClick(t, strong) {
  const ac = audio.ctx, metal = sim.bridgeMix > 0.3, peak = (strong ? 0.32 : 0.22) * (1 + sim.bridgeMix * 0.7);
  const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = audio.noise;
  bp.type = 'bandpass'; bp.frequency.value = metal ? 3200 : 1700; bp.Q.value = metal ? 9 : 1.6;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (metal ? 0.14 : 0.06));
  src.connect(bp); bp.connect(g); g.connect(audio.master);
  src.start(t, Math.random() * 1.8, 0.16);
  const o = ac.createOscillator(), og = ac.createGain();               // the thump under the click
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.07);
  og.gain.setValueAtTime(peak * 0.9, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(og); og.connect(audio.master);
  o.start(t); o.stop(t + 0.1);
}

// Two-tone chord, three detuned saws per tone, a brassy peak and vibrato.
// One toot on departure; two short ones coming up to a level crossing.
function playHorn(short) {
  sim.hornWave = short ? 1 : 0.8;
  if (!audioOn()) return;
  const t0 = audio.ctx.currentTime + 0.02;
  if (short) { hornBlast(t0, 0.3); hornBlast(t0 + 0.42, 0.5); }
  else hornBlast(t0, 0.6);
}

function hornBlast(t0, dur) { hornRelease(hornVoice(t0), t0 + dur - 0.15); }

// One horn voice, sounding from t0 until hornRelease()
function hornVoice(t0) {
  const ac = audio.ctx, out = ac.createGain(), lp = ac.createBiquadFilter(), pk = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2400;
  pk.type = 'peaking'; pk.frequency.value = 900; pk.gain.value = 6;
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(0.09, t0 + 0.07);
  lp.connect(pk); pk.connect(out); out.connect(audio.master);
  const vib = ac.createOscillator(), vg = ac.createGain(), oscs = [vib];
  vib.frequency.value = 5.5; vg.gain.value = 2.5; vib.connect(vg);
  for (const f of HORN_TONES)
    for (const det of [-7, 0, 6]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = det;
      o.frequency.setValueAtTime(f * 0.94, t0);
      o.frequency.exponentialRampToValueAtTime(f, t0 + 0.09);
      vg.connect(o.frequency);
      o.connect(lp);
      oscs.push(o);
    }
  for (const o of oscs) o.start(t0);
  return { out, oscs };
}
function hornRelease(h, t) {
  h.out.gain.setValueAtTime(0.09, t);
  h.out.gain.linearRampToValueAtTime(0, t + 0.15);
  for (const o of h.oscs) o.stop(t + 0.2);
}

// DRIVE: the horn sounds for as long as it is held (at least a short toot)
function hornOn() {
  if (drive.horn) return;
  drive.horn = true;
  sim.hornWave = 99;
  if (!audioOn()) return;
  audio.hornT0 = audio.ctx.currentTime + 0.01;
  audio.horn = hornVoice(audio.hornT0);
}
function hornOff() {
  if (!drive.horn) return;
  drive.horn = false;
  sim.hornWave = Math.min(sim.hornWave, 0.3);
  if (!audio.horn) return;
  hornRelease(audio.horn, Math.max(audio.ctx.currentTime, audio.hornT0 + 0.3));
  audio.horn = null;
}

// --- DRIVE sound effects: all short, synthesised one-shots ------------------
function noiseHit(t, dur, type, freq, q, vol) {
  const ac = audio.ctx, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = audio.noise; src.loop = true;
  f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(audio.master);
  src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
}
function tone(t, freq, dur, vol, type = 'sine') {
  const ac = audio.ctx, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + dur + 0.05);
}

// Pantographs going up: air in the cylinders, and a motor-alternator winding up
function playCrank() {
  if (!audioOn()) return;
  const ac = audio.ctx, t = ac.currentTime + 0.02, dur = CONFIG.DRIVE.CRANK_TIME;
  const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(60, t);
  o.frequency.exponentialRampToValueAtTime(200, t + dur * 0.8);
  lp.type = 'lowpass'; lp.frequency.value = 700;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.014, t + 0.2);
  g.gain.setValueAtTime(0.014, t + dur - 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + dur + 0.05);
  noiseHit(t, dur * 0.8, 'highpass', 2600, 0, 0.035);
}
function playThump(v) {
  if (!audioOn()) return;
  const ac = audio.ctx, t = ac.currentTime + 0.01, o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(80, t);
  o.frequency.exponentialRampToValueAtTime(32, t + 0.3);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + 0.45);
  noiseHit(t, 0.25, 'lowpass', 500, 0, v * 0.6);
}
function playAir(dur, vol) { if (audioOn()) noiseHit(audio.ctx.currentTime + 0.01, dur, 'highpass', 2200, 0, vol); }   // pneumatics: pssssh
function playNotch() { if (audioOn()) noiseHit(audio.ctx.currentTime + 0.005, 0.04, 'bandpass', 2600, 4, 0.12); }    // the lever clicking into a notch
function playBeep() { if (audioOn()) tone(audio.ctx.currentTime + 0.01, 1250, 0.09, 0.035, 'square'); }               // overspeed warning
function playChime() {                                   // doors closing: four quick beeps
  if (!audioOn()) return;
  const t = audio.ctx.currentTime + 0.01;
  for (let i = 0; i < 4; i++) tone(t + i * 0.17, 1865, 0.09, 0.022, 'square');
}
function playScore(good) {
  if (!audioOn()) return;
  const t = audio.ctx.currentTime + 0.05, notes = good ? [523, 659, 784, 1047] : [523, 659, 784];
  notes.forEach((f, i) => tone(t + i * 0.08, f, 0.3, 0.045, 'triangle'));
}

function playThunder(strength) {
  if (!audioOn()) return;
  const ac = audio.ctx, t = ac.currentTime, src = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = audio.noise; src.loop = true;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(380, t); lp.frequency.exponentialRampToValueAtTime(90, t + 2.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5 * strength, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  src.connect(lp); lp.connect(g); g.connect(audio.master);
  src.start(t, Math.random()); src.stop(t + 3.3);
}

// One strike of a level crossing bell, panned left or right
function playBell(t, f, vol, pan) {
  const ac = audio.ctx, out = ac.createGain();
  let dest = audio.master;
  if (ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = pan; pn.connect(audio.master); dest = pn; }
  out.connect(dest);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(vol, t + 0.004);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  for (const [m, a] of [[1, 1], [2.76, 0.45], [5.4, 0.2]]) {
    const o = ac.createOscillator(), og = ac.createGain();
    o.frequency.value = f * m; og.gain.value = a;
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.26);
  }
}
