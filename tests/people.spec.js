// Life on the platforms: things people get up to, and an argument a PSO breaks up.
const { test, expect } = require('./fixtures');

test.describe('people', () => {
  test('an argument: words, maybe a shove, a PSO comes over, and it is over', async ({ page, game }) => {
    await game.open('?line=belgrave#watch');
    await page.evaluate(() => { ui.paused = false; window.__f = startScuffle(STATIONS[0], mulberry32(4)); window.__f.t = 0; window.__f.shove = true; });
    await expect.poll(() => page.evaluate(() => !!(__f.a.bubble || __f.b.bubble))).toBe(true);      // they have words
    await expect.poll(() => page.evaluate(() => __f.shoved === true), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => page.evaluate(() => !!__f.pso), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => page.evaluate(() => __f.done), { timeout: 30_000 }).toBe(true);
    const s = await page.evaluate(() => ({ pso: __f.pso.d.kind, modes: [__f.a.mode, __f.b.mode].sort().join() }));
    expect(s.pso).toBe('pso');
    expect(['idle,idle', 'leave,leave']).toContain(s.modes);
  });

  test('arguing passengers are not waiting for the train, and are not left behind', async ({ page, game }) => {
    await game.open('#drive');
    const modes = await page.evaluate(() => { const f = startScuffle(STATIONS[0], mulberry32(1)); return [f.a.mode, f.b.mode]; });
    expect(modes).toEqual(['argue', 'argue']);
  });

  test('a late runner makes the train, and boarding waits for them', async ({ page, game }) => {
    await game.open('#watch');
    await page.evaluate(() => { const r = Math.random; Math.random = () => 0.1; lateRunner(STATIONS[0], 0); Math.random = r; });
    const runner = () => page.evaluate(() => sim.people.find(q => q.runner));
    expect((await runner()).mode).toBe('board');
    expect(await page.evaluate(() => boardingDone(STATIONS[0]))).toBe(false);
    await expect.poll(async () => !(await runner()), { timeout: 20_000 }).toBe(true);   // on board
  });

  test('over a few stations, the platforms get up to all sorts', async ({ page, game }) => {
    await game.open('#watch');
    const modes = await page.evaluate(() => {
      const seen = new Set();
      for (let k = 0; k < 12; k++) {                      // a dozen trips' worth of crowds at Flinders Street
        sim.people.length = 0; sim.populated.clear(); populateStation(STATIONS[0]);
        for (const q of sim.people) seen.add(q.mode);
      }
      return [...seen];
    });
    for (const m of ['dance', 'selfie', 'chase', 'wave', 'argue']) expect(modes).toContain(m);
  });
});
