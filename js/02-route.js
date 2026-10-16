// Melbourne Pixel Train - The line's stations, landscape sections, tunnels, bridge, crossings, layer geometry
'use strict';

// The route of the line being played (see LINES in 00-lines.js), in travel
// order. Only en, km and at are required for a station; everything else
// falls back to STATION_DEFAULTS.
//   en        name shown on the board and banner
//   code      three-letter code, for the route map
//   km        distance from the first station along the real line
//   at        world px from the first station (the line is compressed, and
//             the inner suburbs get more room than their kilometres); 76 mod
//             96 puts the overhead masts behind the roof pillars, clear of
//             the landmark signs
//   platform  [left, right] screen x of the platform while stopped here
//   roof      'heritage' | 'canopy' | 'shelter' | 'scross' | 'under'
//   under     the look of an underground platform (UNDER_STYLES)
//   platformNo the platform number the announcer calls
//   psd       platform screen doors (the Metro Tunnel stations)
//   crowd     passengers waiting to board, alight: passengers getting off
//   idle      extra people standing around
//   kinds     who waits here, if not the usual mix (see PASSENGER_KINDS)
//   backdrop  extra scenery from BACKDROPS drawn near the station (the
//             landscape along the line itself comes from TERRAIN below)
//   back      station structures drawn right behind the train (BACKS)
//   extras    station-specific props / characters ('busker', 'pigeons', 'bikes')
const STATION_DEFAULTS = { platform: [-40, 360], roof: 'canopy', roofColor: 'green', platformNo: 1,
                           crowd: 4, alight: 3, idle: 3, backdrop: [], back: [], extras: [] };
let ROUTE, TERRAIN, TUNNELS, BRIDGE, CROSSINGS, OVALS, ELECTRIC;
function readLine() {
  ROUTE = LINE.stations;
  // The landscape between the stations, in travel order. Each section starts
  // at [station index, world px from that station]; neighbouring sections
  // cross-fade over CONFIG.TERRAIN_BLEND px. What a section paints and spawns
  // in the far, mid and foreground layers is defined in SECTIONS.
  TERRAIN = LINE.terrain.map(s => ({ ...s }));
  // Underground stretches: the tunnel replaces the picture below the street there
  TUNNELS = LINE.tunnels.map(([a, b]) => ({ a, b, u0: 0, u1: 0 }));
  // The river crossing (a truss bridge), if the line has one; a line without
  // one gets a bridge far off the map, so every test of it comes out false
  BRIDGE = LINE.bridge ? { ...LINE.bridge } : { at: null, spans: 1, span: 120 };
  // Level crossings (boom gates, bells) and footy ovals: [station index, world px past it]
  CROSSINGS = LINE.crossings.map((at, i) => (
    { at, u: 0, tooted: false, near: ['red', 'white', 'blue', 'grayLight', 'cream'][i % 5], far: ['cloudShade', 'skyMid', 'white', 'red', 'blue'][i % 5], ped: null }));
  OVALS = LINE.ovals.map(o => [o[0], o[1]]);
  // Overhead wires along the whole line (V/Line runs diesel trains under none)
  ELECTRIC = LINE.train !== 'vlocity';
}
readLine();


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
