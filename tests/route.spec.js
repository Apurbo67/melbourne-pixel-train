// The route data, and the links that skip the title card.
const { test, expect, LINE, DRIVE_BUTTONS } = require('./fixtures');

test.describe('route', () => {
  test('the line has its ten stations in travel order', async ({ page, game }) => {
    await game.open();
    const stations = await page.evaluate(() => STATIONS.map(s => [s.code, s.en]));
    expect(stations).toEqual(LINE);
  });

  test('distances only ever increase, in pixels and in kilometres', async ({ page, game }) => {
    await game.open();
    const stations = await page.evaluate(() => STATIONS.map(s => ({ code: s.code, dist: s.dist, km: s.km })));
    expect(stations[0]).toMatchObject({ dist: 0, km: 0 });
    for (let i = 1; i < stations.length; i++) {
      expect(stations[i].dist, stations[i].code + ' is further along than ' + stations[i - 1].code).toBeGreaterThan(stations[i - 1].dist);
      expect(stations[i].km, stations[i].code + ' km').toBeGreaterThan(stations[i - 1].km);
    }
  });

  test('stations are far enough apart for the train to get up to speed and stop', async ({ page, game }) => {
    await game.open();
    const gaps = await page.evaluate(() => STATIONS.slice(1).map((s, i) => s.dist - STATIONS[i].dist));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(900);
  });

  test('the timetable runs forward and ends at the advertised arrival time', async ({ page, game }) => {
    await game.open();
    const t = await page.evaluate(() => ({
      times: SCHEDULE.flatMap(s => [s.arr, s.dep]),
      arrive: hhmm(wallClock(tripHour(SCHEDULE[LAST_STATION].arr))),
      depart: hhmm(wallClock(tripHour(0))),
    }));
    for (let i = 1; i < t.times.length; i++) expect(t.times[i]).toBeGreaterThanOrEqual(t.times[i - 1]);
    expect(t.depart).toBe('16:21');
    expect(t.arrive).toBe('17:33');
  });

  test('a #watch link starts the autopilot straight away', async ({ game }) => {
    await game.open('#watch');
    const s = await game.state();
    expect(s.title).toBe(false);
    expect(s.driving).toBe(false);
  });

  test('a #drive link puts you in the cab', async ({ game }) => {
    await game.open('#drive');
    const s = await game.state();
    expect(s.title).toBe(false);
    expect(s.driving).toBe(true);
    expect(await game.buttons()).toEqual(DRIVE_BUTTONS);
  });
});
