# Melbourne Pixel Train

[![Tests](https://github.com/Apurbo67/melbourne-pixel-train/actions/workflows/tests.yml/badge.svg)](https://github.com/Apurbo67/melbourne-pixel-train/actions/workflows/tests.yml)

A pixel-art train journey down Melbourne's Belgrave line, from Flinders Street to Belgrave.
Watch it run on autopilot, or drive it yourself and be scored on your stops and your timekeeping.

**Play it: https://apurbo67.github.io/melbourne-pixel-train/**

## The line

| Code | Station | Behind the platform |
|---|---|---|
| FSS | Flinders Street | The station's dome and clock tower, the CBD skyline |
| RMD | Richmond | The MCG |
| HAW | Hawthorn | A bluestone church, just over the Yarra bridge |
| GFE | Glenferrie | Hawthorn Town Hall, Swinburne University |
| CAM | Camberwell | Burke Road shops and the Sunday market |
| BOX | Box Hill | Box Hill Central and the towers |
| RWD | Ringwood | Eastland and the clock tower |
| BOR | Boronia | Mount Dandenong and its TV masts |
| UFG | Upper Ferntree Gully | The 1000 Steps |
| BEG | Belgrave | Puffing Billy |

The geography is compressed and not to scale.

## Controls

| Action | Keys | Mode |
|---|---|---|
| Choose WATCH or DRIVE | Left / Right, Enter | title card |
| Pause | P or Space | both |
| Sound | M | both |
| Run four times faster | hold F | both |
| Speed | 1, 2, 4 | autopilot |
| Next station | N | autopilot |
| Time of day, rain | T, W | autopilot |
| Pantograph up / down | E | driver |
| Power / brake lever | Up / Down, B for emergency | driver |
| Doors | O | driver |
| Horn, headlight | H, L | driver |

Every control is also a button on the toolbar, so it plays on a phone.

## Tests

The game is tested end to end with [Playwright](https://playwright.dev). The suite runs on every push
through GitHub Actions (`.github/workflows/tests.yml`).

| Spec | What it checks |
|---|---|
| `tests/smoke.spec.js` | The page loads, the canvas is really painted, the right controls show, buttons have accessible names |
| `tests/route.spec.js` | Ten stations in order, distances and timetable run forward, `#watch` and `#drive` links |
| `tests/autopilot.spec.js` | A whole trip calls at every station and terminates; NEXT, PAUSE, speed, time of day, rain |
| `tests/driver.spec.js` | The start-up procedure, departing on the all clear, penalties, stop scoring, overspeed, emergency brake |
| `tests/layout.spec.js` | Picture and toolbar fit a phone (both ways up) and a desktop without scrolling |

How the tests work:

- The game keeps its state in plain globals (`sim`, `ui`, `drive`, `STATIONS`), so tests assert on that
  state directly rather than comparing screenshots of an animated canvas.
- Tests steer the game through its real controls, the keyboard and the toolbar. The few that place the
  train somewhere first (to test scoring, not steering) say so in a comment.
- A shared fixture (`tests/fixtures.js`) fails any test during which the browser logs an error.
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
js/01-config.js ...     the game, one file per section (see the comment at the top of each)
tests/                  Playwright specs and the shared fixture
playwright.config.js    test configuration; starts a local server for the game
.github/workflows/      CI: run the tests on every push and pull request
```

The scripts are plain (non-module) scripts sharing one global scope, so they load in the order
`index.html` lists them. To change the stations, edit `ROUTE` in `js/02-route.js`.

## How this was made

- The engine (parallax terrain, lighting, driving model, sound) comes from the "Intercity Pixel Train"
  game of a Dhaka to Sylhet journey. Credit for it belongs to that game's author.
- The Melbourne adaptation (route, scenery, train, stations, landmarks) and the first version of the
  test suite were produced with the help of an AI assistant, Claude.
- I host it, maintain it and extend the tests.
