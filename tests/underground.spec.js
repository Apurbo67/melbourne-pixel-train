// The City Loop and the Metro Tunnel: the picture turns into a cutaway of the tunnel.
const { test, expect } = require('./fixtures');

// Average brightness (0..255) of a box of the picture
const brightness = (page, x, y, w, h) => page.evaluate(([x, y, w, h]) => {
  const d = document.getElementById('screen').getContext('2d').getImageData(x, y, w, h).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
  return sum / (d.length / 4);
}, [x, y, w, h]);

// Put the train between two stations (to look at the scenery, not to test the driving)
async function placeAt(page, d) {
  await page.evaluate(d => {
    let i = 0;
    while (i < LAST_STATION && STATIONS[i + 1].dist <= d) i++;
    arrive(i, 0); sim.dist = d; sim.state = 'TRAVELING'; sim.stopPhase = null; ui.paused = true;
    ui.rainMode = 2; weather.level = 0;                  // a dry day, so the sky is bright enough to compare
  }, d);
  await page.waitForTimeout(300);
}

test.describe('underground', () => {
  test('the Mernda line runs through the City Loop: Flagstaff, Melbourne Central, Parliament', async ({ page, game }) => {
    await game.open('?line=mernda');
    const s = await page.evaluate(() => STATIONS.filter(st => st.roof === 'under').map(st => [st.code, st.under, st.platformNo]));
    expect(s).toEqual([['FGS', 'flagstaff', 1], ['MCE', 'melbcentral', 1], ['PAR', 'parliament', 1]]);
  });

  test('Craigieburn trains go round the loop the other way', async ({ page, game }) => {
    await game.open('?line=craigieburn');
    const order = await page.evaluate(() => STATIONS.slice(0, 5).map(st => st.code));
    expect(order).toEqual(['FSS', 'PAR', 'MCE', 'FGS', 'NME']);
  });

  test('Dandenong trains start at Town Hall, in the Metro Tunnel, behind screen doors', async ({ page, game }) => {
    await game.open('?line=dandenong');
    const s = await page.evaluate(() => ({ first: STATIONS[0].en, under: STATIONS[0].roof, psd: STATIONS[0].psd, spans: underSpans().all }));
    expect(s).toEqual({ first: 'TOWN HALL', under: 'under', psd: true, spans: true });
  });

  test('between loop stations the whole picture below the street is tunnel, and it is dark', async ({ page, game }) => {
    await game.open('?line=mernda#watch');
    const d = await page.evaluate(() => (STATIONS[1].dist + STATIONS[2].dist) / 2 + 200);   // past Southern Cross, before Flagstaff's vault
    await placeAt(page, d);
    const u = await page.evaluate(() => { const U = underSpans(); return { any: U.any, tube: U.tube.length, inTunnel: inTunnel(sim.dist) }; });
    expect(u).toEqual({ any: true, tube: 1, inTunnel: true });
    const wall = await brightness(page, 20, 96, 80, 16), sky = await brightness(page, 20, 2, 80, 10);
    expect(wall).toBeLessThan(90);                                                     // the tunnel wall, lamp-lit
    expect(sky).toBeGreaterThan(wall + 25);                                            // the afternoon sky still up top
  });

  test('a loop station is a bright vault with its name on the wall', async ({ page, game }) => {
    await game.open('?line=mernda#watch');
    await page.evaluate(() => { ui.timeMode = 3; });                                   // even at night
    await placeAt(page, await page.evaluate(() => STATIONS[3].dist));
    const u = await page.evaluate(() => underSpans().vault.map(([a, b, st]) => st.code));
    expect(u).toContain('MCE');
    expect(await brightness(page, 20, 70, 80, 12)).toBeGreaterThan(150);               // the lit ceiling
  });

  test('out of the tunnel the open air comes back', async ({ page, game }) => {
    await game.open('?line=mernda#watch');
    await placeAt(page, await page.evaluate(() => STATIONS[5].dist));                  // Victoria Park
    expect(await page.evaluate(() => [underSpans().any, inTunnel(sim.dist)])).toEqual([false, false]);
  });

  test('a whole trip through the loop on autopilot stays free of errors', async ({ page, game }) => {
    test.setTimeout(120_000);
    await game.open('?line=craigieburn#watch');
    await page.keyboard.press('Digit4');
    await game.fastForward();
    await game.atStation('NME', undefined, 90_000);                                   // out the far side of the loop
  });
});
