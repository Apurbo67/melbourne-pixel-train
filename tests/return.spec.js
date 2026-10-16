// From the end of the line, back the other way.
const { test, expect } = require('./fixtures');

test.describe('return trip', () => {
  test('every line run backwards keeps its stations in order, and underground stations in the tunnels', async ({ page, game }) => {
    await game.open();
    const problems = await page.evaluate(() => {
      const out = [];
      for (const id of LINE_IDS) for (const back of [false, true]) {
        loadLine(id, back);
        const name = id + (back ? ' back' : '');
        STATIONS.forEach((st, i) => {
          if (i && st.dist - STATIONS[i - 1].dist < 900) out.push(name + ': ' + st.code + ' too close');
          if (i && !(back && i === LAST_STATION) && (st.dist + LINE.mastShift) % 96 !== 76)   // (the old first station never was) out.push(name + ': ' + st.code + ' masts out of step');
          if ((st.roof === 'under') !== inTunnel(st.dist)) out.push(name + ': ' + st.code + (st.roof === 'under' ? ' is outside the tunnel' : ' is in a tunnel'));
        });
        const fwd = LINES[id].stations.map(s => s.code);
        const codes = STATIONS.map(s => s.code);
        if (JSON.stringify(codes) !== JSON.stringify(back ? fwd.slice().reverse() : fwd)) out.push(name + ': stations out of order');
        if (STATIONS[0].dist !== 0) out.push(name + ': does not start at 0');
      }
      return out;
    });
    expect(problems).toEqual([]);
  });

  test('the legs are longer than they were laid out', async ({ page, game }) => {
    await game.open();
    const r = await page.evaluate(() => ({ run: STATIONS[LAST_STATION].dist, data: LINES.belgrave.stations.at(-1).at, k: STRETCH }));
    expect(r.run / r.data).toBeCloseTo(r.k, 1);
  });

  test('RETURN TRIP at Belgrave goes back to Flinders Street, at night, and the address says so', async ({ page, game }) => {
    test.setTimeout(240_000);
    await game.open('?line=belgrave#watch');
    await page.evaluate(() => skipToNextStation());
    for (let i = 0; i < 9; i++) await page.evaluate(() => skipToNextStation());
    await page.keyboard.press('Digit4');
    await game.fastForward();
    await page.waitForFunction(() => ui.complete, null, { timeout: 60_000 });
    await game.release();
    await page.keyboard.press('KeyG');                    // go back the other way
    const s = await page.evaluate(() => ({ first: STATIONS[0].code, last: STATIONS[LAST_STATION].code, back: LINE_BACK, complete: ui.complete,
                                            title: ui.title, hours: [CONFIG.HOUR_START, CONFIG.HOUR_END] }));
    expect(s).toEqual({ first: 'BEG', last: 'FSS', back: true, complete: false, title: false, hours: [18.6, 22.4] });
    expect(new URL(page.url()).searchParams.get('dir')).toBe('back');
    await page.waitForFunction(() => sim.state !== 'STOPPED');   // it sets off by itself
  });

  test('the whole way back on the Mernda line, through the loop', async ({ page, game }) => {
    test.setTimeout(240_000);
    await game.open('?line=mernda&dir=back#watch');
    const codes = await page.evaluate(() => STATIONS.map(s => s.code));
    expect(codes[0]).toBe('MDA');
    expect(codes.at(-1)).toBe('FSS');
    await page.keyboard.press('Digit4');
    await game.fastForward();
    for (const code of codes) await game.atStation(code, undefined, 90_000);
    await page.waitForFunction(() => ui.complete, null, { timeout: 30_000 });
  });

  test('LINES from a return trip puts the board back on trains out of the city', async ({ page, game }) => {
    await game.open('?line=geelong&dir=back#watch');
    await page.locator('#b-lines').click();
    expect(await page.evaluate(() => [LINE_ID, LINE_BACK, STATIONS[0].code])).toEqual(['geelong', false, 'SSS']);
  });
});
