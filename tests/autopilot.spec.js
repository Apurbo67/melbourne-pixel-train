// WATCH mode: the train drives itself, and the toolbar changes how you see it.
const { test, expect, LINE } = require('./fixtures');

test.describe('autopilot', () => {
  test('calls at every station in order and terminates at Belgrave', async ({ page, game }) => {
    test.setTimeout(240_000);
    await game.open();
    await game.watch();
    await page.keyboard.press('Digit4');                 // 4x ...
    await game.fastForward();                            // ... times 4: the five-minute trip takes about 20 s
    const visited = [];
    for (const [code] of LINE) {
      await game.atStation(code, undefined, 90_000);
      visited.push(code);
    }
    await page.waitForFunction(() => ui.complete, null, { timeout: 30_000 });
    const s = await game.state();
    expect(visited).toEqual(LINE.map(([code]) => code));
    expect(s.station).toBe('BEG');
    expect(s.speed).toBe(0);
    expect(s.doorOpen).toBe(0);
  });

  test('stops exactly on the mark and opens the doors', async ({ game }) => {
    await game.open();
    await game.watch();
    await game.fastForward();
    await game.atStation('RMD', 'BOARDING');
    const s = await game.state();
    expect(s.stopOffset).toBe(0);
    expect(s.doorOpen).toBe(1);
  });

  test('NEXT jumps to the following station', async ({ page, game }) => {
    await game.open();
    await game.watch();
    await page.locator('#b-skip').click();
    await game.atStation('RMD');
    await page.locator('#b-skip').click();
    await game.atStation('HAW');
  });

  test('PAUSE freezes the journey and PLAY resumes it', async ({ page, game }) => {
    await game.open();
    await game.watch();
    await game.fastForward();
    await page.waitForFunction(() => sim.state === 'TRAVELING');
    await game.release();
    const pause = page.locator('#b-pause');
    await pause.click();
    await expect(pause).toHaveText('PLAY');
    const frozen = (await game.state()).dist;
    await page.waitForTimeout(600);
    expect((await game.state()).dist).toBe(frozen);
    await pause.click();
    await expect(pause).toHaveText('PAUSE');
    await expect.poll(async () => (await game.state()).dist).toBeGreaterThan(frozen);
  });

  test('the speed button cycles 1x, 2x, 4x and back', async ({ page, game }) => {
    await game.open();
    await game.watch();
    const speed = page.locator('#b-speed');
    for (const label of ['2x', '4x', '1x']) {
      await speed.click();
      await expect(speed).toHaveText(label);
    }
  });

  test('the time-of-day button reaches night, and night falls', async ({ page, game }) => {
    await game.open();
    await game.watch();
    const time = page.locator('#b-time');
    for (const label of ['DAY', 'DUSK', 'NIGHT']) {
      await time.click();
      await expect(time).toHaveText(label);
    }
    await expect.poll(() => page.evaluate(() => sim.night), { timeout: 15_000 }).toBeGreaterThan(0.95);
  });

  test('the rain button brings on the rain', async ({ page, game }) => {
    await game.open();
    await game.watch();
    const rain = page.locator('#b-rain');
    await rain.click();
    await expect(rain).toHaveText('ON');
    await game.fastForward();
    await expect.poll(() => page.evaluate(() => weather.level), { timeout: 15_000 }).toBeGreaterThan(0.5);
    expect(await page.evaluate(() => rainPool.n)).toBeGreaterThan(0);
  });
});
