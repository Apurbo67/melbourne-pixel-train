// DRIVE mode: the procedure a driver follows, and how mistakes are scored.
const { test, expect, DRIVE_BUTTONS } = require('./fixtures');

// Flinders Street, from a cold train to "all clear": the same steps every driving test needs.
async function boardAtFlindersStreet(page, game) {
  await page.keyboard.press('KeyE');                     // pantographs up
  await page.waitForFunction(() => drive.engine === 'ON');
  await game.fastForward();
  await page.keyboard.press('KeyO');                     // doors open
  await game.phase('BOARDED');
}

test.describe('driver mode', () => {
  test.beforeEach(async ({ game }) => {
    await game.open();
    await game.drive();
  });

  test('shows the driving controls and walks you through start-up', async ({ page, game }) => {
    expect(await game.buttons()).toEqual(DRIVE_BUTTONS);
    expect((await game.state()).hint).toBe('RAISE THE PANTOGRAPH [E]');

    await page.keyboard.press('KeyE');
    expect((await game.state()).hint).toBe('RAISING THE PANTOGRAPH...');
    await page.waitForFunction(() => drive.engine === 'ON');
    expect((await game.state()).hint).toBe('OPEN THE DOORS [O]');
  });

  test('will not take power with the pantograph down', async ({ page, game }) => {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(1000);
    const s = await game.state();
    expect(s.toasts).toContain('RAISE THE PANTOGRAPH [E]');
    expect(s.speed).toBe(0);
    expect(s.state).toBe('STOPPED');
  });

  test('boards passengers, waits for the all clear, then departs without penalty', async ({ page, game }) => {
    await boardAtFlindersStreet(page, game);
    let s = await game.state();
    expect(s.pax).toBeGreaterThan(0);
    expect(s.hint).toBe('CLOSE THE DOORS [O]');

    await page.keyboard.press('KeyO');                   // doors closed; now the timetable and the platform staff
    await game.phase('CLEAR');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => sim.state === 'DRIVING' && sim.speed > 20);

    s = await game.state();
    expect(s.lever).toBe(6);
    expect(s.points.penalty).toBe(0);
    expect(s.points.pax).toBe(s.pax * 10);               // ten points a passenger
  });

  test('leaving before the all clear costs 150 points', async ({ page, game }) => {
    await boardAtFlindersStreet(page, game);
    await page.keyboard.press('KeyO');
    await game.phase('WAIT');                            // doors shut, but it is not departure time yet
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => sim.state === 'DRIVING');

    const s = await game.state();
    expect(s.points.penalty).toBe(-150);
    expect(s.toasts).toContain('LEFT BEFORE THE ALL CLEAR -150');
  });

  test('a stop within the platform scores, and nearer the mark scores more', async ({ page, game }) => {
    // Arrange: put the train rolling slowly 12 px short of the Richmond stop mark with the brake on.
    // (Driving the whole leg by keyboard would make this test about steering, not about scoring.)
    await page.evaluate(() => {
      drive.engine = 'ON'; drive.rpm = 0.3; drive.lever = -2;
      sim.state = 'DRIVING'; sim.stopPhase = null;
      sim.dist = STATIONS[1].dist - 12; sim.speed = 6;
    });
    await page.waitForFunction(() => sim.speed === 0);
    expect((await game.state()).hint).toBe('OPEN THE DOORS [O]');

    await page.keyboard.press('KeyO');
    await game.atStation('RMD');
    const s = await game.state();
    expect(Math.abs(s.stopOffset)).toBeLessThanOrEqual(25);
    expect(s.points.stops).toBe(150);                    // GOOD STOP: within 25 px of the mark
    expect(s.toasts).toContain('GOOD STOP +150');
    expect(s.points.time).toBe(200);                     // early or on time
  });

  test('the doors stay shut away from a platform', async ({ page, game }) => {
    await page.evaluate(() => {
      drive.engine = 'ON'; sim.state = 'DRIVING'; sim.stopPhase = null;
      sim.dist = 500; sim.speed = 0; drive.lever = 0;
    });
    await page.keyboard.press('KeyO');
    const s = await game.state();
    expect(s.toasts).toContain('NO PLATFORM HERE');
    expect(s.doorOpen).toBe(0);
  });

  test('speeding is warned about and penalised; the emergency brake stops the train', async ({ page, game }) => {
    await page.evaluate(() => {
      drive.engine = 'ON'; sim.state = 'DRIVING'; sim.stopPhase = null;
      sim.dist = 400; sim.speed = 125; drive.lever = 0;   // the limit out here is 100
    });
    await page.waitForFunction(() => drive.over);
    let s = await game.state();
    expect(s.limit).toBe(100);
    expect(s.hint).toBe('SLOW DOWN! LIMIT 100');
    await expect.poll(async () => (await game.state()).points.penalty).toBeLessThan(0);

    await page.keyboard.press('KeyB');
    s = await game.state();
    expect(s.lever).toBe(-5);
    expect(s.toasts).toContain('EMERGENCY BRAKE!');
    await page.waitForFunction(() => sim.speed === 0, null, { timeout: 20_000 });
  });

  test('handing back to the autopilot hides the driving controls', async ({ page, game }) => {
    await page.locator('#b-mode').click();
    await page.waitForFunction(() => !drive.on);
    expect(await game.buttons()).not.toContain('engine');
    expect(await game.buttons()).toContain('skip');
  });
});
