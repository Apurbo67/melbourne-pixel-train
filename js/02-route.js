// Melbourne Pixel Train - The ten stations, the landscape sections, bridge, crossings, layer geometry
'use strict';

// The route, in travel order: a limited-express run down the Belgrave line.
// To add a station, add an entry: only en, km and at are required,
// everything else falls back to STATION_DEFAULTS.
//   en        name shown on the board and banner
//   code      Metro's three-letter station code, for the route map
//   km        distance from Flinders Street along the real line
//   at        world px from Flinders Street (the line is compressed, and
//             the inner suburbs get more room than their kilometres); 76 mod
//             96 puts the overhead masts behind the roof pillars, clear of
//             the landmark signs
//   platform  [left, right] screen x of the platform while stopped here
//   roof      'heritage' | 'canopy' | 'shelter'
//   crowd     passengers waiting to board, alight: passengers getting off
//   idle      extra people standing around
//   kinds     who waits here, if not the usual mix (see PASSENGER_KINDS)
//   backdrop  extra scenery from BACKDROPS drawn near the station (the
//             landscape along the line itself comes from TERRAIN below)
//   extras    station-specific props / characters ('busker', 'pigeons', 'bikes')
const ROUTE = [
  { en: 'FLINDERS STREET', code: 'FSS', km: 0, at: 0,
    platform: [-330, 590], roof: 'heritage', crowd: 15, alight: 0, idle: 12,
    backdrop: ['city', 'flinders'], extras: ['busker', 'pigeons'] },
  { en: 'RICHMOND', code: 'RMD', km: 2.6, at: 1036,                       // the MCG next door
    roof: 'canopy', roofColor: 'blue', crowd: 8, alight: 3, idle: 4,
    kinds: ['footy', 'footy', 'footy', 'casual', 'casual', 'office', 'office', 'dress', 'tradie', 'child', 'elder'] },
  { en: 'HAWTHORN', code: 'HAW', km: 5.7, at: 2188,                      // just over the river: a bluestone church
    roof: 'canopy', roofColor: 'green', crowd: 4, alight: 3, idle: 2 },
  { en: 'GLENFERRIE', code: 'GFE', km: 6.9, at: 3244,                    // Hawthorn Town Hall, Swinburne University
    platform: [-90, 400], roof: 'canopy', roofColor: 'red', crowd: 7, alight: 5, idle: 4,
    kinds: ['student', 'student', 'student', 'student', 'casual', 'casual', 'office', 'dress', 'hijab', 'footy'],
    extras: ['bikes'] },
  { en: 'CAMBERWELL', code: 'CAM', km: 9.0, at: 4204,                    // Burke Road shops and the Sunday market
    roof: 'heritage', crowd: 5, alight: 4, idle: 3 },
  { en: 'BOX HILL', code: 'BOX', km: 14.9, at: 5260,                     // Box Hill Central and the towers
    roof: 'canopy', roofColor: 'blue', crowd: 6, alight: 5, idle: 3 },
  { en: 'RINGWOOD', code: 'RWD', km: 24.5, at: 6316,                     // the clock tower, Eastland
    roof: 'canopy', roofColor: 'gray', crowd: 4, alight: 5, idle: 3, extras: ['bikes'] },
  { en: 'BORONIA', code: 'BOR', km: 32.2, at: 7468,                      // under Mount Dandenong and its TV masts
    roof: 'canopy', roofColor: 'gray', crowd: 3, alight: 4, idle: 2 },
  { en: 'UPPER FERNTREE GULLY', code: 'UFG', km: 36.4, at: 8524,         // the 1000 Steps
    platform: [4, 330], roof: 'shelter', crowd: 2, alight: 3, idle: 1 },
  { en: 'BELGRAVE', code: 'BEG', km: 41.3, at: 9580,                     // Puffing Billy
    platform: [-60, 380], roof: 'canopy', roofColor: 'green', crowd: 0, alight: 12, idle: 2 },
];
const STATION_DEFAULTS = { platform: [-40, 360], roof: 'canopy', roofColor: 'green',
                           crowd: 4, alight: 3, idle: 3, backdrop: [], extras: [] };

// The landscape between the stations, in travel order. Each section starts
// at [station index, world px from that station]; neighbouring sections
// cross-fade over CONFIG.TERRAIN_BLEND px. What a section paints and spawns
// in the far, mid and foreground layers is defined in SECTIONS.
const TERRAIN = [
  { id: 'city' },                         // Flinders Street, the MCG, Richmond's brick and trams
  { id: 'yarra',     at: [1, 360] },      // Burnley parkland and the river
  { id: 'suburbs',   at: [2, -220] },     // Hawthorn to Ringwood: tiled roofs, back fences, footy ovals
  { id: 'foothills', at: [6, 260] },      // paddocks, gums and roos, the Dandenongs ahead
  { id: 'forest',    at: [8, -120] },     // mountain ash and tree ferns up to Belgrave
];
// Iron truss bridge over the Yarra between Burnley and Hawthorn
const BRIDGE = { at: [1, 580], spans: 2, span: 120 };
// Level crossings (boom gates, bells) and footy ovals: [station index, world px past it]
const CROSSINGS = [[4, 560], [5, 430], [6, 640], [7, 560], [8, 520]].map((at, i) => (
  { at, u: 0, tooted: false, near: ['red', 'white', 'blue', 'grayLight', 'cream'][i], far: ['cloudShade', 'skyMid', 'white', 'red', 'blue'][i], ped: null }));
const OVALS = [[3, 520], [5, 790]];


// Scroll speed of each parallax layer relative to the track
const PARALLAX = { clouds: 0.05, far: 0.2, mid: 0.5, track: 1.0, fg: 1.3 };

// Screen y where each layer / sprite is drawn
const LAYER_Y = { clouds: 6, far: 60, mid: 84, poles: 92,
                  track: 140, fg: 146, loco: 116, car: 121, wheel: 144 };

// Near-side platform geometry (screen y). People stand with their feet
// between WALK_MIN and WALK_MAX; doors span DOOR_TOP..DOOR_FLOOR.
const PLAT = { TOP: 148, EDGE_Y: 152, WALK_MIN: 154, WALK_MAX: 169,
               DOOR_TOP: 125, DOOR_FLOOR: 136,
               STALL_X: 280, STALL_Y: 163, BOARD_X: 132 };

// Palette lighting by hour of day: [hour, lighting]. Between two different
// lightings the world cross-fades with an ordered dither; the sky, the
// colour tint and the glow of lamps follow the hour smoothly on top.
const LIGHT_KEYS = [[0, 'night'], [4.6, 'night'], [5.4, 'dusk'], [6.4, 'dusk'], [7.4, 'day'],
                    [17.0, 'day'], [17.9, 'dusk'], [18.9, 'dusk'], [19.9, 'night'], [24, 'night']];
// The time-of-day button / T key cycles these; AUTO follows the trip
const TIME_MODES = [['AUTO', null], ['DAY', 12], ['DUSK', 18.3], ['NIGHT', 22.5]];
