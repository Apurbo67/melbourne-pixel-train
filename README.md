# Melbourne Pixel Train

[![Tests](https://github.com/Apurbo67/melbourne-pixel-train/actions/workflows/tests.yml/badge.svg)](https://github.com/Apurbo67/melbourne-pixel-train/actions/workflows/tests.yml)

Pixel-art train journeys on seven Melbourne lines, through the City Loop, the Metro Tunnel and out to
Geelong. Pick a line on the departures board at Flinders Street, then watch it run on autopilot, or drive
it yourself and be scored on your stops and your timekeeping.

**Play it: https://melbpixeltrain.netlify.app/**

## The lines

| Line | Train | From | Underground | Landmarks along the way |
|---|---|---|---|---|
| Belgrave | X'Trapolis | Flinders Street, platform 2 | | The MCG, Swinburne at Glenferrie, Box Hill, the 1000 Steps, Puffing Billy |
| Mernda | X'Trapolis | Flinders Street, platform 1 | Clockwise round the City Loop: Flagstaff, Melbourne Central, Parliament | Southern Cross, the MCG at Jolimont, Victoria Park, the Clifton Hill shot tower, Preston Market |
| Hurstbridge | X'Trapolis | Flinders Street, platform 1 | Clockwise round the City Loop, like Mernda | Jolimont and the MCG, the shot tower, the Austin at Heidelberg, Greensborough Plaza, Montsalvat, the Eltham trestle bridge, Hurstbridge's main street |
| Craigieburn | Siemens | Flinders Street, platform 4 | The loop the other way: Parliament, Melbourne Central, Flagstaff | The Showgrounds, Puckle Street, Windy Hill, Mount Macedon on the horizon |
| Dandenong | HCMT | Town Hall, platform 2 | The Metro Tunnel: Town Hall and Anzac, behind platform screen doors | Caulfield racecourse, the Skyrail through Carnegie, Monash, Dandenong Market |
| Werribee | Comeng | Flinders Street, platform 9 | | Southern Cross, the Maribyrnong, the Sun Theatre, Scienceworks, the West Gate, Werribee Park |
| Geelong | V/Line VLocity (diesel) | Southern Cross, platform 8 | | The Maribyrnong, the basalt plains, the You Yangs, Corio Bay and the refinery |

Notes on how the lines run:

- Since the Metro Tunnel opened in 2026, Pakenham and Cranbourne trains run through the tunnel and no
  longer use Flinders Street or the City Loop, so the Dandenong trip starts at Town Hall.
- Mernda trains go clockwise round the loop all day. Craigieburn trains go round it anticlockwise on
  weekday afternoons, and the game's timetable is set in the afternoon.
- Each line calls at a selection of its stations, not all of them. The geography is compressed and not
  to scale, and the platform numbers are a snapshot: check a current timetable.

On the trip:

- Underground, the picture becomes a cutaway: the street above, the ground, and the tunnel with its lamps,
  cross-passage doors and signals. The loop stations follow the real ones: Flagstaff's cream panels and
  timber strips, Melbourne Central's brown walls and blue light strip, Parliament's blue walls, and
  terracotta floor tiles in all three.
- Southern Cross has its wave roof on white tree-like columns, with V/Line trains at the other platforms.
- The station announcer uses the browser's own voice (Australian English where the device has one):
  the platform announcement before you leave, the next station as you pull out, and the station as you
  arrive. It follows the sound setting.
- The weather is different on every trip. Each trip draws a kind of day (fine, showers, drizzle or
  storms, with only storms bringing lightning), and its showers and wind come and go at random. The
  departures board gives the forecast.
- From the end of the line, RETURN TRIP takes the same train back the other way, through the evening.
- The platforms have their own life, different every trip: people taking selfies, dancing to the
  busker, a kid running about, someone waving at the train, a latecomer sprinting for the doors, and now
  and then an argument that a PSO comes over to break up.
- Each line is about 1.7 times as long as it was first laid out, so the legs between stations take a
  while (`STRETCH` in `js/00-lines.js`).
- The VLocity is a diesel: in DRIVE you start its engine instead of raising a pantograph, it smokes when
  you open the throttle, and there are no overhead wires on its line.

## Controls

| Action | Keys | Where |
|---|---|---|
| Choose a line | Up / Down, or tap a row (NEXT steps through them) | departures board |
| Choose WATCH or DRIVE, and go | Left / Right, Enter | departures board |
| Back to the departures board | Esc, or LINES | during a trip |
| Ride back the other way | G, or RETURN TRIP | end of the line |
| Pause | P or Space | both modes |
| Sound and announcements | M | both modes |
| Run four times faster | hold F | both modes |
| Speed | 1, 2, 4 | autopilot |
| Next station | N | autopilot |
| Time of day, rain | T, W | autopilot |
| Pantograph up / down (engine start / stop on V/Line) | E | driver |
| Power / brake lever | Up / Down, B for emergency | driver |
| Doors | O | driver |
| Horn, headlight | H, L | driver |

Every control is also a button on the toolbar, so it plays on a phone. A link can open a line straight
away: `?line=mernda`, `?line=geelong#drive`, `?line=mernda&dir=back` for the trip home. Add `&seed=7` to fix
the weather to one draw.

## Tests

The game is tested end to end with [Playwright](https://playwright.dev). The suite runs on every push
through GitHub Actions (`.github/workflows/tests.yml`).

| Spec | What it checks |
|---|---|
| `tests/smoke.spec.js` | The page loads, the canvas is really painted, the right controls show, buttons have accessible names |
| `tests/route.spec.js` | Belgrave's ten stations in order, distances and timetable run forward, `#watch` and `#drive` links |
| `tests/lines.spec.js` | Every line's data hangs together, the departures board, `?line=` links, a full trip on every line, each line's train, the diesel start |
| `tests/underground.spec.js` | The loop in both directions, the Metro Tunnel, the tunnel cutaway is drawn (and dark), loop stations are lit |
| `tests/weather.spec.js` | Every trip draws its own weather, a seed fixes it, all four kinds of day turn up, showers come and clear, lightning only in a storm |
| `tests/return.spec.js` | Every line runs backwards with its stations in order and its underground stations in the tunnels; the return trip from Belgrave; Mernda home through the loop |
| `tests/people.spec.js` | An argument runs its course and a PSO turns up; arguing people aren't counted as waiting; a late runner makes the train; the platforms get up to all sorts |
| `tests/voice.spec.js` | What the announcer says (speech is replaced by a recorder), and that it keeps quiet when muted |
| `tests/autopilot.spec.js` | A whole trip calls at every station and terminates; NEXT, PAUSE, speed, time of day, rain |
| `tests/driver.spec.js` | The start-up procedure, departing on the all clear, penalties, stop scoring, overspeed, emergency brake |
| `tests/layout.spec.js` | Picture and toolbar fit a phone (both ways up) and a desktop without scrolling |

How the tests work:

- The game keeps its state in plain globals (`sim`, `ui`, `drive`, `STATIONS`), so tests assert on that
  state directly rather than comparing screenshots of an animated canvas.
- Tests steer the game through its real controls, the keyboard and the toolbar. The few that place the
  train somewhere first (to test scoring, not steering) say so in a comment.
- A shared fixture (`tests/fixtures.js`) fails any test during which the browser logs an error.
- The weather is random for players, so the fixture opens the game with `?seed=7` to keep tests repeatable;
  the weather tests open it without one, to check it really does change.
- Holding F runs the game four times faster, so a five-minute trip is tested in about twenty seconds.

### Run them

```bash
npm install
npx playwright install chromium
npm test                # headless
npm run test:headed     # watch the browser drive the train
npm run test:ui         # Playwright's UI mode
npm run report          # open the last HTML report
```

## Run the game locally

```bash
npm start
```

Or just open `index.html` in a browser. There is no build step.

## Project layout

```
index.html              the page: canvas, toolbar, scripts in load order
css/style.css           layout and toolbar styling
js/00-lines.js          every line: stations, landscapes, tunnels, trains, timetables, landmarks
js/01-config.js ...     the game, one file per section (see the comment at the top of each)
tests/                  Playwright specs and the shared fixture
playwright.config.js    test configuration; starts a local server for the game
.github/workflows/      CI: run the tests on every push and pull request
```

The scripts are plain (non-module) scripts sharing one global scope, so they load in the order
`index.html` lists them. To change a line, or add one, edit `LINES` in `js/00-lines.js`; the comment at
the top of that file explains each field, and `tests/lines.spec.js` checks the data hangs together.

## How this was made

- The engine (parallax terrain, lighting, driving model, sound) comes from the "Intercity Pixel Train"
  game of a Dhaka to Sylhet journey. Credit for it belongs to that game's author.
- The Melbourne adaptation (routes, scenery, trains, stations, landmarks, the underground, the announcer)
  and the test suite were produced with the help of an AI assistant, Claude.
- I host it, maintain it and extend the tests.
