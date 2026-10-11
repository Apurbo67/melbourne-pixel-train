// Smoke tests: does the page load, draw, and offer the right controls?
const { test, expect, AUTO_BUTTONS } = require('./fixtures');

test.describe('smoke', () => {
  test('loads to the title card', async ({ page, game }) => {
    await game.open();
    await expect(page).toHaveTitle('Melbourne Pixel Train');
    await expect(page.locator('#screen')).toBeVisible();
    expect((await game.state()).title).toBe(true);
  });

  test('the canvas keeps its 320 x 180 pixel grid and is really painted', async ({ page, game }) => {
    await game.open();
    const canvas = page.locator('#screen');
    expect(await canvas.evaluate(c => [c.width, c.height])).toEqual([320, 180]);
    // a blank or half-drawn frame has a handful of colours; the scene has dozens
    const colours = await canvas.evaluate(c => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, seen = new Set();
      for (let i = 0; i < d.length; i += 4) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      return seen.size;
    });
    expect(colours).toBeGreaterThan(20);
  });

  test('the title card offers the autopilot controls only', async ({ game }) => {
    await game.open();
    expect(await game.buttons()).toEqual(AUTO_BUTTONS);
  });

  test('every toolbar button has an accessible name', async ({ page, game }) => {
    await game.open();
    const unnamed = await page.evaluate(() => [...document.querySelectorAll('#bar button')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).map(b => b.id));
    expect(unnamed).toEqual([]);
  });

  test('the train waits at Flinders Street until a mode is chosen', async ({ page, game }) => {
    await game.open();
    await page.waitForTimeout(1500);
    const s = await game.state();
    expect(s.station).toBe('FSS');
    expect(s.dist).toBe(0);
    expect(s.speed).toBe(0);
  });
});
