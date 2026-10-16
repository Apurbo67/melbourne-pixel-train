// The station announcer. The browser's speech is replaced by a recorder, so the
// tests read what would have been said.
const { test, expect } = require('./fixtures');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__said = [];
    const fake = { speak: u => window.__said.push(u.text), cancel() {}, getVoices: () => [], addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  });
});
const said = page => page.evaluate(() => window.__said);

test.describe('announcements', () => {
  test('the platform announcement names the platform, the time, the train and its stops', async ({ page, game }) => {
    await game.open('?line=mernda');
    await page.keyboard.press('ArrowLeft');                // any key turns the sound on (browser rule)
    await page.keyboard.press('Enter');
    await expect.poll(() => said(page)).toContainEqual(
      'Platform 1. The next train is the 4 24 Mernda train, stopping all stations via the City Loop. Change at Southern Cross for regional trains.');
  });

  test('V/Line says it is a V/Line service', async ({ page, game }) => {
    await game.open('?line=geelong');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await said(page)).join(' ')).toContain('Platform 8. The next train is the 4 35 V/Line service to Geelong');
  });

  test('the next station when pulling out, and the station coming in', async ({ page, game }) => {
    test.setTimeout(90_000);
    await game.open('?line=werribee');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect.poll(() => said(page), { timeout: 60_000 }).toContainEqual('The next station is Southern Cross.');
    await expect.poll(() => said(page), { timeout: 60_000 }).toContainEqual('Now arriving at Southern Cross. Change here for regional trains and coaches.');
  });

  test('with the sound muted the announcer keeps quiet', async ({ page, game }) => {
    await game.open('?line=mernda');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('KeyM');                     // mute
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    expect(await said(page)).toEqual([]);
  });
});

test('the platform number is the one the line leaves from', async ({ page, game }) => {
  await game.open('?line=werribee');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await said(page)).join(' ')).toContain('Platform 9. The next train is the 4 32 Werribee train');
});
