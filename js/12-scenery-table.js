// Melbourne Pixel Train - SECTIONS: which painter and spawner each landscape uses per layer; PAINTERS for landmarks
'use strict';

// --- what each section paints and spawns ---------------------------------
// Per layer: spawn(ctx) lays out objects (returning data for the ground),
// column(lx, data, u) prepares one column, ground(col, y, lx) returns the
// palette key of a pixel, and hl(col, y, lx) the key it takes on under a
// wind crest. Ground rows: far 52, mid 34, fg 12 (all screen y 112 / 118 / 158).
// birds: [kind, sightings per second] pairs.
const hazeGround = (c, y) => y >= 52 ? 'haze' : null;
const SECTIONS = {
  city: {
    name: 'CITY', birds: [['gull', 0.3]],
    far: { spawn: ctx => { treeLine(ctx, 52, 4); }, ground: hazeGround },
    mid: { spawn: cityMid, ground: cityMidGround },
    fg:  { spawn: cityFg, ground: cityFgGround },
  },
  yarra: {
    name: 'YARRA', birds: [['gull', 0.25]],
    far: { spawn: yarraFar, column: (lx, D, u) => yarraWet(u, 60), ground: yarraFarGround },
    mid: { spawn: yarraMid, column: (lx, D, u) => yarraWet(u, 10), ground: yarraMidGround },
    fg:  { spawn: yarraFg, column: yarraFgColumn, ground: yarraFgGround },
  },
  suburbs: {
    name: 'SUBURBS', birds: [['magpie', 0.1], ['lorikeet', 0.03]],
    far: { spawn: suburbFar, ground: hazeGround },
    mid: { spawn: suburbMid, ground: suburbMidGround },
    fg:  { spawn: suburbFg, column: suburbFgColumn, ground: suburbFgGround },
  },
  foothills: {
    name: 'FOOTHILLS', birds: [['galah', 0.035], ['magpie', 0.05]],
    far: { spawn: rangeFar, ground: hazeGround },
    mid: { spawn: paddockMid, ground: (c, y, lx) => y < 34 ? null : (y & 1) && bayer(lx, y) < 6 ? 'grassLight' : 'paddy' },
    fg:  { spawn: paddockFg, column: paddockFgColumn, ground: paddockFgGround, hl: paddockFgHl },
  },
  cbd: {
    name: 'CITY', birds: [['gull', 0.35]],
    far: { spawn: cbdFar, ground: hazeGround },
    mid: { spawn: cbdMid, ground: cityMidGround },
    fg:  { spawn: cityFg, ground: cityFgGround },
  },
  inner: {
    name: 'INNER CITY', birds: [['gull', 0.2], ['magpie', 0.05]],
    far: { spawn: ctx => { treeLine(ctx, 52, 4); cbdFar({ ...ctx, ok: x => ctx.ok(x) && ctx.rng() < 0.15 }); }, ground: hazeGround },
    mid: { spawn: innerMid, ground: cityMidGround },
    fg:  { spawn: cityFg, ground: cityFgGround },
  },
  industrial: {
    name: 'INDUSTRIAL', birds: [['gull', 0.3]],
    far: { spawn: industryFar, ground: hazeGround },
    mid: { spawn: industryMid, ground: industryMidGround },
    fg:  { spawn: industryFg, ground: industryFgGround },
  },
  plains: {
    name: 'PLAINS', birds: [['galah', 0.05], ['magpie', 0.06]],
    far: { spawn: plainsFar, ground: plainsFarGround },
    mid: { spawn: plainsMid, ground: plainsMidGround },
    fg:  { spawn: paddockFg, column: paddockFgColumn, ground: paddockFgGround, hl: paddockFgHl },
  },
  bay: {
    name: 'CORIO BAY', birds: [['gull', 0.4]],
    far: { spawn: bayFar, ground: bayFarGround },
    mid: { spawn: bayMid, ground: bayMidGround },
    fg:  { spawn: bayFg, ground: bayFgGround },
  },
  skyrail: {
    name: 'SKYRAIL', birds: [['magpie', 0.08], ['lorikeet', 0.05]],
    far: { spawn: suburbFar, ground: hazeGround },
    mid: { spawn: skyrailMid, ground: skyrailMidGround },
    fg:  { spawn: skyrailFg, ground: skyrailFgGround },
  },
  forest: {
    name: 'DANDENONGS', birds: [['rosella', 0.09], ['cocky', 0.05]],
    far: { spawn: forestFar, ground: (c, y, lx) => y >= 52 ? (bayer(lx, y) < 6 ? 'haze' : 'greenDark') : null },
    mid: { spawn: forestMid, ground: (c, y, lx) => y < 34 ? null : hash2(lx >> 1, y >> 1) < 0.3 ? 'greenDeep' : bayer(lx, y) < 3 ? 'green' : 'greenDark' },
    fg:  { spawn: forestFg, column: (lx, D) => D.streams.find(s => Math.abs(lx - s.cx) < s.w + 24) || null, ground: forestFgGround },
  },
};

// The river section takes the name of the line's river
function nameSections() { SECTIONS.yarra.name = BRIDGE.name || 'YARRA'; }
nameSections();

// --- landmark painters, by the names the lines use (LINE.landmarks) ---------
const PAINTERS = {
  mcg: paintMCG, church: paintChurch, townHall: paintTownHall, campus: paintCampus, market: paintMarket,
  boxHill: paintBoxHill, ringwood: paintRingwood,
  victoriaPark: paintVictoriaPark, shotTower: paintShotTower, cinema: paintCinema, prestonMarket: paintPrestonMarket,
  trainYard: paintTrainYard, showgrounds: paintShowgrounds, puckleSt: paintPuckleSt, windyHill: paintWindyHill,
  civicCentre: paintCivicCentre, footscray: paintFootscray, sunTheatre: paintSunTheatre, scienceworks: paintScienceworks,
  workshops: paintWorkshops, airBase: paintAirBase, williamsLanding: paintWilliamsLanding, mansion: paintMansion,
  racecourse: paintRacecourse, koornang: paintKoornang, eatonMall: paintEatonMall, monash: paintMonash,
  springvale: paintSpringvale, dandenongMarket: paintDandenongMarket, harvester: paintHarvester, estate: paintEstate,
  refinery: paintRefinery, geelongStation: paintGeelongStation,
  stationSt: paintStationSt, austin: paintAustin, plaza: paintPlaza, montsalvat: paintMontsalvat, hurstbridgeMain: paintHurstbridgeMain,
  macedon: paintMacedon, westGate: paintWestGate, youYangs: paintYouYangs,
};
