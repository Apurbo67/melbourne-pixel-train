// Melbourne Pixel Train - Every line in the game: stations, landscapes, tunnels, trains, timetables
'use strict';

// =====================================================================
// 0. LINES
// =====================================================================
// One entry per line. The page plays the line named in the address
// (?line=mernda), Belgrave when there is none; the departures board at
// Flinders Street switches between them. Everything below is data: the
// painters it names live in the scenery files and are looked up by name.
//
// Each line:
//   name       on the departures board and the front of the train
//   group      PTV line group, and colour: the board's colour bar (hex)
//   stripe     palette key for the line colour on station name boards
//   train      'xtrap' | 'siemens' | 'comeng' | 'hcmt' | 'vlocity' (see TRAIN_STYLES)
//   from       where the trip starts, and the platform there
//   via        how the board describes the run ('' for none)
//   clock      [departure, arrival] on the driver's clock, hours
//   stations   in travel order: en, code, km, at (world px; 76 mod 96 keeps
//              the overhead masts behind the roof pillars), then anything
//              from STATION_DEFAULTS that differs
//   terrain    the landscape sections, each from [station index, px past it]
//   tunnels    underground stretches, [from, to] as [station index, px]
//   bridge     one river crossing, or null
//   crossings  level crossings, [station index, px]
//   ovals      footy ovals in the suburbs, [station index, px]
//   landmarks  [station code, px past it, half width, painter name]
//   farmarks   the same in the far layer (mountains, a bridge on the skyline)
//   say        what the platform announcer says about the run
//
// Station roofs: 'heritage' | 'canopy' | 'shelter' on the surface,
// 'scross' for Southern Cross, 'under' for an underground platform
// (with under: its style in UNDER_STYLES).
const LINES = {
  belgrave: {
    name: 'BELGRAVE', group: 'BURNLEY', color: '#1f4fa8', stripe: 'skyMid', train: 'xtrap',
    from: 'FLINDERS STREET', platform: 2, via: '', clock: [16 + 21 / 60, 17 + 33 / 60],
    say: 'stopping at Richmond, Hawthorn, Glenferrie, Camberwell, Box Hill, Ringwood, Boronia, Upper Ferntree Gully and Belgrave',
    stations: [
      { en: 'FLINDERS STREET', code: 'FSS', km: 0, at: 0,
        platform: [-330, 590], roof: 'heritage', crowd: 15, alight: 0, idle: 12,
        backdrop: ['city', 'flinders'], extras: ['busker', 'pigeons'] },
      { en: 'RICHMOND', code: 'RMD', km: 2.6, at: 1036,                         // the MCG next door
        roof: 'canopy', roofColor: 'blue', crowd: 8, alight: 3, idle: 4,
        kinds: ['footy', 'footy', 'footy', 'casual', 'casual', 'office', 'office', 'dress', 'tradie', 'child', 'elder'] },
      { en: 'HAWTHORN', code: 'HAW', km: 5.7, at: 2188,                        // just over the river: a bluestone church
        roof: 'canopy', roofColor: 'green', crowd: 4, alight: 3, idle: 2 },
      { en: 'GLENFERRIE', code: 'GFE', km: 6.9, at: 3244,                      // Hawthorn Town Hall, Swinburne University
        platform: [-90, 400], roof: 'canopy', roofColor: 'red', crowd: 7, alight: 5, idle: 4,
        kinds: ['student', 'student', 'student', 'student', 'casual', 'casual', 'office', 'dress', 'hijab', 'footy'],
        extras: ['bikes'] },
      { en: 'CAMBERWELL', code: 'CAM', km: 9.0, at: 4204,                      // Burke Road shops and the Sunday market
        roof: 'heritage', crowd: 5, alight: 4, idle: 3 },
      { en: 'BOX HILL', code: 'BOX', km: 14.9, at: 5260,                       // Box Hill Central and the towers
        roof: 'canopy', roofColor: 'blue', crowd: 6, alight: 5, idle: 3 },
      { en: 'RINGWOOD', code: 'RWD', km: 24.5, at: 6316,                       // the clock tower, Eastland
        roof: 'canopy', roofColor: 'gray', crowd: 4, alight: 5, idle: 3, extras: ['bikes'] },
      { en: 'BORONIA', code: 'BOR', km: 32.2, at: 7468,                        // under Mount Dandenong and its TV masts
        roof: 'canopy', roofColor: 'gray', crowd: 3, alight: 4, idle: 2 },
      { en: 'UPPER FERNTREE GULLY', code: 'UFG', km: 36.4, at: 8524,           // the 1000 Steps
        platform: [4, 330], roof: 'shelter', crowd: 2, alight: 3, idle: 1 },
      { en: 'BELGRAVE', code: 'BEG', km: 41.3, at: 9580,                       // Puffing Billy
        platform: [-60, 380], roof: 'canopy', roofColor: 'green', crowd: 0, alight: 12, idle: 2 },
    ],
    terrain: [
      { id: 'city' },                         // Flinders Street, the MCG, Richmond's brick and trams
      { id: 'yarra',     at: [1, 360] },      // Burnley parkland and the river
      { id: 'suburbs',   at: [2, -220] },     // Hawthorn to Ringwood: tiled roofs, back fences, footy ovals
      { id: 'foothills', at: [6, 260] },      // paddocks, gums and roos, the Dandenongs ahead
      { id: 'forest',    at: [8, -120] },     // mountain ash and tree ferns up to Belgrave
    ],
    tunnels: [],
    bridge: { at: [1, 580], spans: 2, span: 120 },                             // iron truss over the Yarra
    crossings: [[4, 560], [5, 430], [6, 640], [7, 560], [8, 520]],
    ovals: [[3, 520], [5, 790]],
    landmarks: [['RMD', -140, 62, 'mcg'], ['HAW', 90, 20, 'church'], ['GFE', -210, 21, 'townHall'], ['GFE', 134, 64, 'campus'],
                ['CAM', 40, 62, 'market'], ['BOX', 60, 58, 'boxHill'], ['RWD', 70, 62, 'ringwood']],
    farmarks: [],
  },

  mernda: {
    name: 'MERNDA', group: 'CLIFTON HILL', color: '#d22630', stripe: 'red', train: 'xtrap',
    from: 'FLINDERS STREET', platform: 1, via: 'VIA CITY LOOP', clock: [16 + 24 / 60, 17 + 22 / 60],
    say: 'stopping all stations via the City Loop. Change at Southern Cross for regional trains',
    stations: [
      { en: 'FLINDERS STREET', code: 'FSS', km: 0, at: 0,
        platform: [-330, 590], roof: 'heritage', crowd: 15, alight: 0, idle: 12,
        backdrop: ['city', 'flinders'], extras: ['busker', 'pigeons'] },
      { en: 'SOUTHERN CROSS', code: 'SSS', km: 1.2, at: 1036, platformNo: 9,  // under the wave roof
        platform: [-120, 420], roof: 'scross', crowd: 9, alight: 4, idle: 6, backdrop: ['city', 'scrossMid'], back: ['scrossBack'],
        kinds: ['office', 'office', 'office', 'casual', 'casual', 'traveller', 'traveller', 'dress', 'elder', 'tradie'] },
      { en: 'FLAGSTAFF', code: 'FGS', km: 2.3, at: 2572, platformNo: 1,
        platform: [-90, 410], roof: 'under', under: 'flagstaff', crowd: 6, alight: 6, idle: 2,
        kinds: ['office', 'office', 'office', 'office', 'casual', 'dress', 'student'] },
      { en: 'MELBOURNE CENTRAL', code: 'MCE', km: 3.1, at: 3532, platformNo: 1,
        platform: [-90, 410], roof: 'under', under: 'melbcentral', crowd: 9, alight: 8, idle: 3,
        kinds: ['student', 'student', 'student', 'casual', 'casual', 'casual', 'office', 'dress', 'traveller'] },
      { en: 'PARLIAMENT', code: 'PAR', km: 3.9, at: 4492, platformNo: 1,
        platform: [-90, 410], roof: 'under', under: 'parliament', crowd: 7, alight: 6, idle: 2,
        kinds: ['office', 'office', 'office', 'dress', 'casual', 'casual', 'elder'] },
      { en: 'VICTORIA PARK', code: 'VPK', km: 6.5, at: 5548,                  // the old Collingwood ground
        roof: 'canopy', roofColor: 'gray', crowd: 4, alight: 4, idle: 2,
        kinds: ['footy', 'footy', 'casual', 'casual', 'office', 'student', 'tradie'] },
      { en: 'CLIFTON HILL', code: 'CHL', km: 7.7, at: 6604,                   // the shot tower
        roof: 'heritage', crowd: 5, alight: 3, idle: 3, extras: ['bikes'] },
      { en: 'NORTHCOTE', code: 'NCE', km: 9.4, at: 7660,                      // High Street and the old cinema
        roof: 'canopy', roofColor: 'red', crowd: 5, alight: 4, idle: 3, extras: ['bikes'] },
      { en: 'PRESTON', code: 'PRE', km: 12.4, at: 8716,                       // Preston Market
        roof: 'canopy', roofColor: 'blue', crowd: 6, alight: 5, idle: 3,
        kinds: ['casual', 'casual', 'casual', 'elder', 'elder', 'hijab', 'office', 'tradie', 'child', 'dress'] },
      { en: 'EPPING', code: 'EPP', km: 21.2, at: 9868,                        // the train yard
        roof: 'canopy', roofColor: 'gray', crowd: 3, alight: 5, idle: 2 },
      { en: 'MERNDA', code: 'MDA', km: 30.3, at: 11020,
        platform: [-60, 380], roof: 'canopy', roofColor: 'green', crowd: 0, alight: 12, idle: 2 },
    ],
    terrain: [
      { id: 'cbd' },                          // the city: Flinders Street, Southern Cross, the loop under it
      { id: 'inner',     at: [4, 560] },      // out of the tunnel at Jolimont: the MCG, Collingwood brick
      { id: 'yarra',     at: [6, 260] },      // Merri Creek
      { id: 'suburbs',   at: [6, 820] },      // Northcote, Preston, Reservoir
      { id: 'plains',    at: [8, 520] },      // Epping to Mernda: grassland and new estates
    ],
    tunnels: [[[1, 420], [4, 520]]],                                             // Southern Cross ramp to Jolimont portal
    bridge: { at: [6, 440], spans: 1, span: 120, name: 'MERRI CREEK' },
    crossings: [[8, 600], [9, 560]],
    ovals: [[7, 560]],
    landmarks: [['PAR', 760, 62, 'mcg'], ['VPK', 70, 46, 'victoriaPark'], ['CHL', 90, 14, 'shotTower'],
                ['NCE', -36, 48, 'cinema'], ['PRE', 76, 56, 'prestonMarket'], ['EPP', 70, 62, 'trainYard']],
    farmarks: [],
  },

  hurstbridge: {
    name: 'HURSTBRIDGE', group: 'CLIFTON HILL', color: '#d22630', stripe: 'red', train: 'xtrap',
    from: 'FLINDERS STREET', platform: 1, via: 'VIA CITY LOOP', clock: [16 + 26 / 60, 17 + 36 / 60],
    say: 'stopping at Southern Cross, the City Loop, Jolimont, Clifton Hill, Fairfield, Ivanhoe, Heidelberg, Greensborough, Eltham, Diamond Creek and Hurstbridge',
    stations: [                                                                // 14 of its 28 stations; km are approximate
      { en: 'FLINDERS STREET', code: 'FSS', km: 0, at: 0,
        platform: [-330, 590], roof: 'heritage', crowd: 15, alight: 0, idle: 12,
        backdrop: ['city', 'flinders'], extras: ['busker', 'pigeons'] },
      { en: 'SOUTHERN CROSS', code: 'SSS', km: 1.2, at: 1036, platformNo: 9,
        platform: [-120, 420], roof: 'scross', crowd: 9, alight: 4, idle: 6, backdrop: ['city', 'scrossMid'], back: ['scrossBack'],
        kinds: ['office', 'office', 'office', 'casual', 'casual', 'traveller', 'traveller', 'dress', 'elder', 'tradie'] },
      { en: 'FLAGSTAFF', code: 'FGS', km: 2.3, at: 2572, platformNo: 1,
        platform: [-90, 410], roof: 'under', under: 'flagstaff', crowd: 6, alight: 6, idle: 2,
        kinds: ['office', 'office', 'office', 'office', 'casual', 'dress', 'student'] },
      { en: 'MELBOURNE CENTRAL', code: 'MCE', km: 3.1, at: 3532, platformNo: 1,
        platform: [-90, 410], roof: 'under', under: 'melbcentral', crowd: 9, alight: 8, idle: 3,
        kinds: ['student', 'student', 'student', 'casual', 'casual', 'casual', 'office', 'dress', 'traveller'] },
      { en: 'PARLIAMENT', code: 'PAR', km: 3.9, at: 4492, platformNo: 1,
        platform: [-90, 410], roof: 'under', under: 'parliament', crowd: 7, alight: 6, idle: 2,
        kinds: ['office', 'office', 'office', 'dress', 'casual', 'casual', 'elder'] },
      { en: 'JOLIMONT', code: 'JLI', km: 5.0, at: 5548,                       // the MCG across the park
        roof: 'canopy', roofColor: 'gray', crowd: 4, alight: 4, idle: 2,
        kinds: ['footy', 'footy', 'footy', 'office', 'office', 'casual', 'elder'] },
      { en: 'CLIFTON HILL', code: 'CHL', km: 7.7, at: 6604,                   // the shot tower
        roof: 'heritage', crowd: 5, alight: 3, idle: 3, extras: ['bikes'] },
      { en: 'FAIRFIELD', code: 'FFD', km: 10.4, at: 7660,                     // Station Street
        roof: 'canopy', roofColor: 'green', crowd: 4, alight: 3, idle: 3, extras: ['bikes'] },
      { en: 'IVANHOE', code: 'IVA', km: 13.1, at: 8716,
        roof: 'heritage', crowd: 4, alight: 3, idle: 2 },
      { en: 'HEIDELBERG', code: 'HDB', km: 14.9, at: 9772,                    // the Austin, up the hill
        roof: 'canopy', roofColor: 'blue', crowd: 6, alight: 5, idle: 3,
        kinds: ['office', 'office', 'casual', 'casual', 'elder', 'elder', 'dress', 'student', 'hijab'] },
      { en: 'GREENSBOROUGH', code: 'GRN', km: 21.4, at: 10924,                // the Plaza
        roof: 'canopy', roofColor: 'gray', crowd: 5, alight: 5, idle: 3 },
      { en: 'ELTHAM', code: 'ELT', km: 26.4, at: 11980,                       // Montsalvat; the trestle bridge just past it
        roof: 'canopy', roofColor: 'brown', crowd: 4, alight: 4, idle: 2, extras: ['bikes'] },
      { en: 'DIAMOND CREEK', code: 'DCK', km: 30.6, at: 13036,
        roof: 'shelter', platform: [4, 330], crowd: 2, alight: 3, idle: 1 },
      { en: 'HURSTBRIDGE', code: 'HBE', km: 36.7, at: 14188,                  // the main street, wattle in flower
        platform: [-60, 380], roof: 'canopy', roofColor: 'glow', crowd: 0, alight: 12, idle: 2 },
    ],
    terrain: [
      { id: 'cbd' },                          // the city, and the loop under it
      { id: 'inner',     at: [4, 560] },      // out of the tunnel: Jolimont, Collingwood
      { id: 'suburbs',   at: [6, 420] },      // Westgarth to Greensborough
      { id: 'foothills', at: [10, 560] },     // Montmorency: bush, paddocks, roos
      { id: 'yarra',     at: [11, 380] },     // the gully of Diamond Creek
      { id: 'foothills', at: [11, 1000] },    // out to Hurstbridge
    ],
    tunnels: [[[1, 420], [4, 520]]],                                             // Southern Cross ramp to the Jolimont portal
    bridge: { at: [11, 600], spans: 2, span: 120, name: 'DIAMOND CREEK', kind: 'trestle' },   // the Eltham trestle, timber, 1902
    crossings: [[11, 1460], [12, 600]],
    ovals: [[8, 520]],
    landmarks: [['JLI', 32, 62, 'mcg'], ['CHL', 90, 14, 'shotTower'], ['FFD', 68, 40, 'stationSt'],      // placed so each sign shows
                ['HDB', -20, 50, 'austin'], ['GRN', 52, 62, 'plaza'], ['ELT', 96, 52, 'montsalvat'],      // between the name board and
                ['HBE', -4, 66, 'hurstbridgeMain']],                                                      // the next-train display
    farmarks: [],
  },

  craigieburn: {
    name: 'CRAIGIEBURN', group: 'NORTHERN', color: '#f2b600', stripe: 'glow', train: 'siemens',
    from: 'FLINDERS STREET', platform: 4, via: 'VIA CITY LOOP', clock: [16 + 27 / 60, 17 + 16 / 60],
    say: 'stopping all stations via the City Loop',
    stations: [
      { en: 'FLINDERS STREET', code: 'FSS', km: 0, at: 0,
        platform: [-330, 590], roof: 'heritage', crowd: 15, alight: 0, idle: 12,
        backdrop: ['city', 'flinders'], extras: ['busker', 'pigeons'] },
      { en: 'PARLIAMENT', code: 'PAR', km: 1.0, at: 1036, platformNo: 3,
        platform: [-90, 410], roof: 'under', under: 'parliament', crowd: 7, alight: 6, idle: 2,
        kinds: ['office', 'office', 'office', 'dress', 'casual', 'casual', 'elder'] },
      { en: 'MELBOURNE CENTRAL', code: 'MCE', km: 1.8, at: 2092, platformNo: 3,
        platform: [-90, 410], roof: 'under', under: 'melbcentral', crowd: 9, alight: 8, idle: 3,
        kinds: ['student', 'student', 'student', 'casual', 'casual', 'casual', 'office', 'dress', 'traveller'] },
      { en: 'FLAGSTAFF', code: 'FGS', km: 2.6, at: 3052, platformNo: 3,
        platform: [-90, 410], roof: 'under', under: 'flagstaff', crowd: 6, alight: 6, idle: 2,
        kinds: ['office', 'office', 'office', 'office', 'casual', 'dress', 'student'] },
      { en: 'NORTH MELBOURNE', code: 'NME', km: 4.2, at: 4588,                // the rail yards
        roof: 'canopy', roofColor: 'gray', crowd: 5, alight: 3, idle: 2 },
      { en: 'ASCOT VALE', code: 'ASV', km: 7.0, at: 5644,                     // the Showgrounds
        roof: 'heritage', crowd: 4, alight: 3, idle: 2 },
      { en: 'MOONEE PONDS', code: 'MPD', km: 8.4, at: 6700,                   // Puckle Street
        roof: 'canopy', roofColor: 'red', crowd: 5, alight: 4, idle: 3 },
      { en: 'ESSENDON', code: 'ESD', km: 9.9, at: 7756,                       // Windy Hill
        roof: 'heritage', crowd: 5, alight: 4, idle: 3,
        kinds: ['footy', 'footy', 'casual', 'casual', 'office', 'student', 'elder'] },
      { en: 'GLENROY', code: 'GRY', km: 13.6, at: 8812,
        roof: 'canopy', roofColor: 'blue', crowd: 4, alight: 4, idle: 2 },
      { en: 'BROADMEADOWS', code: 'BMS', km: 16.9, at: 9868,                  // the civic centre
        roof: 'canopy', roofColor: 'gray', crowd: 5, alight: 5, idle: 3,
        kinds: ['casual', 'casual', 'hijab', 'hijab', 'office', 'tradie', 'child', 'elder', 'student'] },
      { en: 'CRAIGIEBURN', code: 'CGB', km: 25.9, at: 11020,
        platform: [-60, 380], roof: 'canopy', roofColor: 'glow', crowd: 0, alight: 12, idle: 2 },
    ],
    terrain: [
      { id: 'cbd' },                          // Flinders Street, and the loop under the city
      { id: 'inner',     at: [3, 1040] },      // North Melbourne: yards, flats, warehouses
      { id: 'suburbs',   at: [4, 620] },      // Ascot Vale to Glenroy
      { id: 'plains',    at: [8, 620] },      // Broadmeadows to Craigieburn: basalt plains
    ],
    tunnels: [[[0, 480], [3, 1000]]],                                             // Flinders Street ramp, round the loop the other way
    bridge: null,
    crossings: [[5, 600], [6, 640], [8, 560]],
    ovals: [[8, 260]],
    landmarks: [['ASV', 116, 58, 'showgrounds'], ['MPD', 110, 50, 'puckleSt'], ['ESD', 96, 48, 'windyHill'],
                ['BMS', 20, 48, 'civicCentre']],
    farmarks: [['CGB', 300, 90, 'macedon']],
  },

  werribee: {
    name: 'WERRIBEE', group: 'CROSS CITY', color: '#028a3c', stripe: 'grass', train: 'comeng',
    from: 'FLINDERS STREET', platform: 9, via: 'EXPRESS NEWPORT - LAVERTON', clock: [16 + 32 / 60, 17 + 12 / 60],
    say: 'stopping all stations to Newport, then Laverton, Williams Landing, Hoppers Crossing and Werribee',
    stations: [
      { en: 'FLINDERS STREET', code: 'FSS', km: 0, at: 0,
        platform: [-330, 590], roof: 'heritage', crowd: 15, alight: 0, idle: 12,
        backdrop: ['city', 'flinders'], extras: ['busker', 'pigeons'] },
      { en: 'SOUTHERN CROSS', code: 'SSS', km: 1.2, at: 1036, platformNo: 14,
        platform: [-120, 420], roof: 'scross', crowd: 9, alight: 4, idle: 6, backdrop: ['city', 'scrossMid'], back: ['scrossBack'],
        kinds: ['office', 'office', 'office', 'casual', 'casual', 'traveller', 'traveller', 'dress', 'elder', 'tradie'] },
      { en: 'NORTH MELBOURNE', code: 'NME', km: 3.0, at: 2092,
        roof: 'canopy', roofColor: 'gray', crowd: 4, alight: 3, idle: 2 },
      { en: 'FOOTSCRAY', code: 'FSY', km: 5.8, at: 3244,                      // over the Maribyrnong: the market
        roof: 'canopy', roofColor: 'blue', crowd: 7, alight: 5, idle: 4,
        kinds: ['casual', 'casual', 'casual', 'student', 'student', 'hijab', 'elder', 'office', 'tradie', 'child'] },
      { en: 'YARRAVILLE', code: 'YVE', km: 7.6, at: 4300,                     // the Sun Theatre
        roof: 'heritage', crowd: 4, alight: 3, idle: 3, extras: ['bikes'] },
      { en: 'SPOTSWOOD', code: 'SPT', km: 9.1, at: 5356,                      // Scienceworks and its chimney
        roof: 'canopy', roofColor: 'gray', crowd: 3, alight: 3, idle: 2,
        kinds: ['child', 'child', 'child', 'casual', 'casual', 'dress', 'elder'] },
      { en: 'NEWPORT', code: 'NPT', km: 10.9, at: 6412,                       // the railway workshops
        roof: 'heritage', crowd: 4, alight: 3, idle: 2 },
      { en: 'LAVERTON', code: 'LAV', km: 17.4, at: 7564,                      // the air base
        roof: 'canopy', roofColor: 'blue', crowd: 4, alight: 4, idle: 2 },
      { en: 'WILLIAMS LANDING', code: 'WLD', km: 20.9, at: 8620,
        roof: 'canopy', roofColor: 'gray', crowd: 5, alight: 4, idle: 2 },
      { en: 'HOPPERS CROSSING', code: 'HCG', km: 25.0, at: 9676,
        roof: 'canopy', roofColor: 'green', crowd: 4, alight: 4, idle: 2 },
      { en: 'WERRIBEE', code: 'WER', km: 31.4, at: 10828,                     // Werribee Park mansion
        platform: [-60, 380], roof: 'canopy', roofColor: 'green', crowd: 0, alight: 12, idle: 2 },
    ],
    terrain: [
      { id: 'cbd' },                          // Flinders Street and Southern Cross
      { id: 'inner',     at: [1, 460] },      // the yards out to North Melbourne
      { id: 'yarra',     at: [2, 380] },      // the Maribyrnong at Footscray
      { id: 'industrial', at: [3, 320] },     // Yarraville, Spotswood, Newport: sheds, tanks, the West Gate
      { id: 'plains',    at: [6, 560] },      // Laverton to Werribee
    ],
    tunnels: [],
    bridge: { at: [2, 600], spans: 2, span: 120, name: 'MARIBYRNONG RIVER' },
    crossings: [[4, 620], [6, 400], [8, 600]],
    ovals: [[8, 300]],
    landmarks: [['FSY', 120, 56, 'footscray'], ['YVE', 60, 26, 'sunTheatre'], ['SPT', 80, 40, 'scienceworks'],
                ['NPT', 132, 64, 'workshops'], ['LAV', 90, 62, 'airBase'], ['WLD', 60, 30, 'williamsLanding'],
                ['WER', 110, 40, 'mansion']],
    farmarks: [['SPT', 560, 120, 'westGate']],
  },

  dandenong: {
    name: 'DANDENONG', group: 'METRO TUNNEL', color: '#1f9de0', stripe: 'skyMid', train: 'hcmt',
    from: 'TOWN HALL', platform: 2, via: 'VIA METRO TUNNEL', clock: [16 + 30 / 60, 17 + 6 / 60],
    say: 'stopping at Anzac, Caulfield, then all stations to Dandenong. Change at Town Hall for Flinders Street',
    stations: [
      { en: 'TOWN HALL', code: 'THL', km: 0, at: 0, platformNo: 2,
        platform: [-200, 470], roof: 'under', under: 'townhall', crowd: 14, alight: 0, idle: 8, psd: true,
        kinds: ['office', 'office', 'office', 'casual', 'casual', 'student', 'dress', 'traveller', 'elder'] },
      { en: 'ANZAC', code: 'AZC', km: 1.6, at: 1036, platformNo: 2,
        platform: [-90, 410], roof: 'under', under: 'anzac', crowd: 6, alight: 4, idle: 2, psd: true,
        kinds: ['office', 'casual', 'casual', 'dress', 'elder', 'student', 'child'] },
      { en: 'CAULFIELD', code: 'CFD', km: 8.6, at: 2188,                      // the racecourse
        roof: 'heritage', crowd: 7, alight: 5, idle: 3,
        kinds: ['student', 'student', 'student', 'casual', 'dress', 'dress', 'office', 'elder'] },
      { en: 'CARNEGIE', code: 'CNE', km: 10.0, at: 3244,                      // Koornang Road, under the Skyrail
        roof: 'canopy', roofColor: 'blue', crowd: 4, alight: 4, idle: 2 },
      { en: 'OAKLEIGH', code: 'OKL', km: 13.2, at: 4300,                      // Eaton Mall
        roof: 'heritage', crowd: 5, alight: 4, idle: 3 },
      { en: 'CLAYTON', code: 'CLA', km: 17.9, at: 5356,                       // Monash
        roof: 'canopy', roofColor: 'skyMid', crowd: 6, alight: 5, idle: 2,
        kinds: ['student', 'student', 'student', 'student', 'hijab', 'casual', 'office', 'elder'] },
      { en: 'SPRINGVALE', code: 'SPV', km: 20.6, at: 6412,                    // the shops along Springvale Road
        roof: 'canopy', roofColor: 'red', crowd: 5, alight: 4, idle: 3,
        kinds: ['casual', 'casual', 'elder', 'elder', 'office', 'child', 'dress', 'tradie'] },
      { en: 'NOBLE PARK', code: 'NPK', km: 23.6, at: 7468,
        roof: 'canopy', roofColor: 'gray', crowd: 3, alight: 3, idle: 2 },
      { en: 'DANDENONG', code: 'DNG', km: 27.6, at: 8524,                     // the market
        platform: [-60, 380], roof: 'canopy', roofColor: 'blue', crowd: 0, alight: 12, idle: 3 },
    ],
    terrain: [
      { id: 'cbd' },                          // above the Metro Tunnel
      { id: 'suburbs',   at: [1, 900] },      // out of the portal: Malvern, Caulfield
      { id: 'skyrail',   at: [2, 420] },      // up on the Skyrail through Carnegie
      { id: 'suburbs',   at: [3, 700] },      // Oakleigh, Clayton
      { id: 'industrial', at: [5, 560] },     // Springvale to Dandenong: factories and freight
    ],
    tunnels: [[[0, -1200], [1, 760]]],                                           // the Metro Tunnel, out at South Yarra
    bridge: null,
    crossings: [],                                                               // every one on this line has gone
    ovals: [[4, 560]],
    landmarks: [['CFD', 132, 64, 'racecourse'], ['CNE', 60, 40, 'koornang'], ['OKL', 70, 40, 'eatonMall'],
                ['CLA', 104, 52, 'monash'], ['SPV', 60, 50, 'springvale'], ['DNG', 120, 52, 'dandenongMarket']],
    farmarks: [],
  },

  geelong: {
    name: 'GEELONG', group: 'V/LINE', color: '#8f1a95', stripe: 'vline', train: 'vlocity',
    from: 'SOUTHERN CROSS', platform: 8, via: 'V/LINE', clock: [16 + 35 / 60, 17 + 32 / 60],
    say: 'stopping at Footscray, Sunshine, Deer Park, Tarneit, Wyndham Vale, Little River, Lara, Corio, North Geelong and Geelong',
    stations: [
      { en: 'SOUTHERN CROSS', code: 'SSS', km: 0, at: 0, platformNo: 8,
        platform: [-200, 470], roof: 'scross', crowd: 14, alight: 0, idle: 9, backdrop: ['city', 'scrossMid'], back: ['scrossBack'],
        kinds: ['office', 'office', 'casual', 'casual', 'traveller', 'traveller', 'traveller', 'dress', 'elder', 'student', 'child'] },
      { en: 'FOOTSCRAY', code: 'FSY', km: 4.6, at: 1036,
        roof: 'canopy', roofColor: 'blue', crowd: 5, alight: 3, idle: 3,
        kinds: ['casual', 'casual', 'casual', 'student', 'student', 'hijab', 'elder', 'office', 'tradie', 'child'] },
      { en: 'SUNSHINE', code: 'SUN', km: 11.6, at: 2188,                      // the old harvester works
        roof: 'canopy', roofColor: 'gray', crowd: 4, alight: 3, idle: 2 },
      { en: 'DEER PARK', code: 'DPK', km: 17.0, at: 3244,
        roof: 'shelter', platform: [4, 330], crowd: 3, alight: 3, idle: 1 },
      { en: 'TARNEIT', code: 'TNT', km: 26.6, at: 4396,                       // new estates
        roof: 'canopy', roofColor: 'vline', crowd: 5, alight: 3, idle: 2 },
      { en: 'WYNDHAM VALE', code: 'WVL', km: 32.8, at: 5452,
        roof: 'canopy', roofColor: 'vline', crowd: 4, alight: 3, idle: 2 },
      { en: 'LITTLE RIVER', code: 'LTR', km: 44.0, at: 6604,                  // the You Yangs
        roof: 'shelter', platform: [4, 330], crowd: 1, alight: 2, idle: 1 },
      { en: 'LARA', code: 'LRA', km: 56.5, at: 7660,
        roof: 'canopy', roofColor: 'gray', crowd: 3, alight: 4, idle: 2 },
      { en: 'CORIO', code: 'CRO', km: 64.7, at: 8716,                         // the refinery on the bay
        roof: 'shelter', platform: [4, 330], crowd: 2, alight: 3, idle: 1 },
      { en: 'NORTH GEELONG', code: 'NGL', km: 70.3, at: 9772,
        roof: 'canopy', roofColor: 'gray', crowd: 3, alight: 3, idle: 2 },
      { en: 'GEELONG', code: 'GLG', km: 72.9, at: 10828,                      // the station building, the bay
        platform: [-60, 380], roof: 'heritage', crowd: 0, alight: 14, idle: 3 },
    ],
    terrain: [
      { id: 'cbd' },                          // Southern Cross and the city
      { id: 'yarra',     at: [0, 420] },      // the Maribyrnong
      { id: 'industrial', at: [1, -320] },    // Footscray and Sunshine
      { id: 'plains',    at: [2, 520] },      // Deer Park to Lara: wide open basalt plains
      { id: 'bay',       at: [7, 620] },      // Corio Bay
      { id: 'suburbs',   at: [9, 200] },      // Geelong
    ],
    tunnels: [],
    bridge: { at: [0, 640], spans: 2, span: 120, name: 'MARIBYRNONG RIVER' },
    crossings: [[7, 560], [9, 520]],
    ovals: [[9, 560]],
    landmarks: [['FSY', 120, 56, 'footscray'], ['SUN', 84, 40, 'harvester'], ['TNT', 60, 60, 'estate'],
                ['CRO', 120, 70, 'refinery'], ['GLG', 46, 50, 'geelongStation']],
    farmarks: [['LTR', 300, 150, 'youYangs']],
  },
};

// Which line is being played, and which way: ?line=mernda, and &dir=back
// for the trip home. The departures board and the end-of-trip panel change
// them while the page runs (loadLine in 23-main.js), and everything built
// from the line is rebuilt then.
const LINE_IDS = Object.keys(LINES).sort((a, b) => LINES[a].clock[0] - LINES[b].clock[0]);   // board order: by departure time
const PARAMS = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new Map(); } })();
let LINE_ID = LINES[PARAMS.get('line')] ? PARAMS.get('line') : 'belgrave';
let LINE_BACK = PARAMS.get('dir') === 'back';

// The line as it is run: the stations spread out (the data above keeps the
// spacing it was laid out with; STRETCH makes every leg longer), and for
// the trip home, everything mirrored. Positions stay on 76 mod 96 going
// out; coming back they land on 0 mod 96, so the overhead masts shift by
// mastShift to stay behind the roof pillars.
const STRETCH = 1.7;
const stretched = at => at ? 76 + 96 * Math.round((at * STRETCH - 76) / 96) : 0;
function runLine(id, back) {
  const L = LINES[id], S = L.stations.map(s => ({ ...s, at: stretched(s.at) }));
  const out = { ...L, id, back: false, stations: S, hours: [12.8, 20.0], mastShift: 0 };
  if (!back) return out;
  const at = ([i, px]) => S[i].at + px, T = S[S.length - 1].at, mirror = u => [0, T - u];
  const R = S.slice().reverse().map(s => ({ ...s, at: T - s.at }));
  const first = R[0], last = R[R.length - 1];                              // the ends swap roles: a crowd waits at
  R[0] = { ...first, crowd: Math.max(first.crowd, 10), alight: 0 };        // the old terminus, everyone gets off at the start
  R[R.length - 1] = { ...last, crowd: 0, alight: Math.max(last.alight, 12) };
  const starts = L.terrain.map((t, i) => i ? at(t.at) : -Infinity);
  const terrain = L.terrain.map((t, i) => ({ id: t.id, at: i < L.terrain.length - 1 ? mirror(starts[i + 1]) : null })).reverse();
  terrain[0] = { id: terrain[0].id };
  const dur = L.clock[1] - L.clock[0], leave = L.clock[1] + 12 / 60;       // twelve minutes to turn the train round
  return {
    ...out, back: true, stations: R, terrain, mastShift: 76, hours: [18.6, 22.4],   // home through the evening
    name: first.en, from: last.en, platform: first.platformNo || 1, via: L.via, clock: [leave, leave + dur],
    say: 'stopping all stations' + (L.tunnels.length && id !== 'dandenong' ? ' via the City Loop' : ''),
    tunnels: L.tunnels.map(([a, b]) => [mirror(at(b)), mirror(at(a))]).reverse(),
    bridge: L.bridge && { ...L.bridge, at: mirror(at(L.bridge.at) + L.bridge.spans * L.bridge.span) },
    crossings: L.crossings.map(c => mirror(at(c))).reverse(),
    ovals: L.ovals.map(o => mirror(at(o))).reverse(),
    landmarks: L.landmarks.map(([c, du, hw, n]) => [c, -du, hw, n]),
    farmarks: L.farmarks.map(([c, du, hw, n]) => [c, -du, hw, n]),
  };
}
let LINE = runLine(LINE_ID, LINE_BACK);
