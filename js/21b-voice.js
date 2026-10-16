// Melbourne Pixel Train - The station announcer: the browser's own voice, Australian English if it has one
'use strict';

// Announcements go through the Web Speech API (speechSynthesis), which
// every current browser has; the words are made up here from the line
// data. They follow the sound: muted, paused or fast-forwarding, the
// announcer keeps quiet.
//   on the platform, before the first departure:
//     "Platform 1. The next train is the 4:24 Mernda train, stopping all
//      stations via the City Loop."
//   pulling out:         "The next station is Southern Cross."
//   coming in:           "Now arriving at Southern Cross. Change here for regional trains."
//   at the end:          "Mernda. This train terminates here. ..."
const voice = { ok: typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined', pick: null, near: -1 };

function chooseVoice() {
  if (!voice.ok) return;
  let list = [];
  try { list = speechSynthesis.getVoices(); } catch (e) { return; }
  const by = test => list.find(v => test(v.lang.replace('_', '-').toLowerCase()));
  voice.pick = by(l => l === 'en-au') || by(l => l === 'en-gb') || by(l => l.startsWith('en')) || null;
}
if (voice.ok) {
  chooseVoice();
  try { speechSynthesis.addEventListener('voiceschanged', chooseVoice); } catch (e) { /* older Safari */ }
}

const voiceAllowed = () => voice.ok && audioOn() && !ui.paused && timeScale() <= 2;

function say(text, delay = 0) {
  if (!voiceAllowed()) return;
  setTimeout(() => {
    if (!voiceAllowed()) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voice.pick) u.voice = voice.pick;
      u.lang = voice.pick ? voice.pick.lang : 'en-AU';
      u.rate = 0.95; u.pitch = 1; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { voice.ok = false; }
  }, delay);
}

function stopVoice() {
  if (voice.ok) try { speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ }
}

// Three rising notes before a platform announcement
function playAnnounceChime() {
  if (!audioOn()) return;
  const t = audio.ctx.currentTime + 0.02;
  [659, 784, 988].forEach((f, i) => tone(t + i * 0.22, f, 0.5, 0.03, 'sine'));
}

// "4:24" as it is said: "four twenty-four"
function spokenTime(h) {
  const m = Math.round(h * 60) % 1440, hh = Math.floor(m / 60) % 12 || 12, mm = m % 60;
  return hh + ' ' + (mm === 0 ? "o'clock" : mm < 10 ? 'oh ' + mm : mm);
}

// Station names as they are said
const SPOKEN = { 'SOUTHERN CROSS': 'Southern Cross', 'FLINDERS STREET': 'Flinders Street', 'UPPER FERNTREE GULLY': 'Upper Ferntree Gully' };
const spoken = name => SPOKEN[name] || name.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());

// What the announcer adds at a few stations
function stationExtra(st) {
  if (st.index === LAST_STATION) return 'This train terminates here. Please take all your belongings with you.';
  switch (st.code) {
    case 'SSS': return 'Change here for regional trains and coaches.';
    case 'FSS': return 'Change here for all metropolitan lines.';
    case 'THL': return 'Change here for Flinders Street station.';
    case 'MCE': case 'PAR': case 'FGS': return 'Change here for City Loop services.';
    case 'RMD': return 'Change here for the MCG.';
    case 'CFD': return 'Change here for the Frankston line.';
    default: return '';
  }
}

// Before the first departure, on the platform
function announceDeparture() {
  const L = LINE;
  voice.near = 0;
  const service = L.group === 'V/LINE' ? 'V/Line service to ' + spoken(L.name) : spoken(L.name) + ' train';
  playAnnounceChime();
  say('Platform ' + L.platform + '. The next train is the ' + spokenTime(L.clock[0]) + ' ' + service + ', ' + L.say + '.', 900);
}

// Pulling out of station i
function announceNext(i) {
  const st = STATIONS[i + 1];
  if (st) say('The next station is ' + spoken(st.en) + '.', 1200);
}

// Coming in to station i (said once, when the banner shows)
function announceArrival(i) {
  if (voice.near === i) return;
  voice.near = i;
  const st = STATIONS[i];
  say((i === LAST_STATION ? spoken(st.en) + '.' : 'Now arriving at ' + spoken(st.en) + '.') + ' ' + stationExtra(st));
}
