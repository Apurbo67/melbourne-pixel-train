// Melbourne Pixel Train - SECTIONS: which painter and spawner each landscape uses per layer
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
  forest: {
    name: 'DANDENONGS', birds: [['rosella', 0.09], ['cocky', 0.05]],
    far: { spawn: forestFar, ground: (c, y, lx) => y >= 52 ? (bayer(lx, y) < 6 ? 'haze' : 'greenDark') : null },
    mid: { spawn: forestMid, ground: (c, y, lx) => y < 34 ? null : hash2(lx >> 1, y >> 1) < 0.3 ? 'greenDeep' : bayer(lx, y) < 3 ? 'green' : 'greenDark' },
    fg:  { spawn: forestFg, column: (lx, D) => D.streams.find(s => Math.abs(lx - s.cx) < s.w + 24) || null, ground: forestFgGround },
  },
};
