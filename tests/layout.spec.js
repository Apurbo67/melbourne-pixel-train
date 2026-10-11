// The picture and its toolbar have to fit whatever screen they are given.
const { test, expect } = require('./fixtures');

const SCREENS = [
  { name: 'phone, portrait', width: 400, height: 780, layout: 'below' },
  { name: 'phone, landscape', width: 844, height: 390 },
  { name: 'desktop', width: 1280, height: 720, layout: 'side' },
];

for (const screen of SCREENS) {
  test.describe('layout: ' + screen.name, () => {
    test.use({ viewport: { width: screen.width, height: screen.height } });

    test('picture and toolbar fit without scrolling', async ({ page, game }) => {
      await game.open('#drive');                         // driver mode shows the most buttons
      const m = await page.evaluate(() => {
        const c = document.getElementById('screen').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('#bar button')].filter(b => b.offsetParent !== null).map(b => b.getBoundingClientRect());
        return {
          layout: document.body.className,
          canvas: { left: c.left, right: c.right, top: c.top, bottom: c.bottom, ratio: c.width / c.height },
          scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
          buttonsInside: buttons.every(b => b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight),
          smallestButton: Math.min(...buttons.map(b => Math.min(b.width, b.height))),
        };
      });
      if (screen.layout) expect(m.layout).toBe(screen.layout);
      expect(m.scrollWidth).toBeLessThanOrEqual(screen.width);
      expect(m.scrollHeight).toBeLessThanOrEqual(screen.height);
      expect(m.canvas.left).toBeGreaterThanOrEqual(0);
      expect(m.canvas.right).toBeLessThanOrEqual(screen.width);
      expect(m.canvas.top).toBeGreaterThanOrEqual(0);
      expect(m.canvas.bottom).toBeLessThanOrEqual(screen.height);
      expect(m.canvas.ratio).toBeCloseTo(16 / 9, 1);     // never stretched
      expect(m.buttonsInside).toBe(true);
      expect(m.smallestButton).toBeGreaterThanOrEqual(44);   // big enough for a thumb
    });
  });
}
