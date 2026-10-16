// The weather: a different kind of day, and different showers, on every trip.
const { test, expect } = require('./fixtures');

// The weather drawn for a trip: the kind of day, and the first few showers
const forecast = page => page.evaluate(() => weather.drawn);

test.describe('weather', () => {
  test('with no seed, every trip draws its own weather', async ({ page }) => {
    const seen = new Set();
    for (let i = 0; i < 4; i++) {
      await page.goto('./?line=belgrave');                  // no seed: as a player gets it
      await page.waitForFunction(() => typeof VARIANTS !== 'undefined');
      seen.add(JSON.stringify(await forecast(page)));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  test('restarting the trip draws again', async ({ page }) => {
    await page.goto('./');
    await page.waitForFunction(() => typeof VARIANTS !== 'undefined');
    const seen = new Set();
    for (let i = 0; i < 4; i++) { seen.add(JSON.stringify(await forecast(page))); await page.evaluate(() => startJourney()); }
    expect(seen.size).toBeGreaterThan(1);
  });

  test('the same seed gives the same weather', async ({ page, game }) => {
    await game.open('', 42);
    const a = await forecast(page);
    await game.open('', 42);
    expect(await forecast(page)).toEqual(a);
  });

  test('every kind of day turns up', async ({ page, game }) => {
    await game.open();
    const kinds = await page.evaluate(() => {
      const seen = new Set();
      for (let s = 1; s < 200; s++) { sim.wxRng = mulberry32(s); resetWeather(); seen.add(weather.day.name); }
      return [...seen].sort();
    });
    expect(kinds).toEqual(['DRIZZLE', 'FINE', 'SHOWERS', 'STORMS']);
  });

  test('showers come and go by themselves over a trip', async ({ page, game }) => {
    test.setTimeout(120_000);
    await game.open('?line=belgrave#watch', 3);
    await page.evaluate(() => { sim.wxRng = mulberry32(5); weather.day = WEATHER_DAYS.find(d => d.name === 'SHOWERS'); weather.timer = 1; weather.target = 0; });
    await page.keyboard.press('Digit4');
    await game.fastForward();
    await expect.poll(() => page.evaluate(() => weather.level), { timeout: 60_000 }).toBeGreaterThan(0.4);   // it rains...
    await expect.poll(() => page.evaluate(() => weather.level), { timeout: 90_000 }).toBeLessThan(0.05);     // ...and clears
  });

  test('lightning only comes with a storm', async ({ page, game }) => {
    await game.open();
    const strikes = await page.evaluate(() => {
      const count = storm => {
        sim.wxRng = mulberry32(9); weather.day = WEATHER_DAYS[1]; weather.level = weather.target = 1; weather.timer = 1e9; weather.storm = storm;
        let n = 0;
        for (let i = 0; i < 6000; i++) { weather.flashT = 9; updateWeather(1 / 30); if (weather.flashT === 1 / 30) n++; }
        return n;
      };
      return [count(false), count(true)];
    });
    expect(strikes[0]).toBe(0);
    expect(strikes[1]).toBeGreaterThan(0);
  });
});
