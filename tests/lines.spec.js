// Every line in the game: its data, the departures board, and a full trip on each.
const { test, expect } = require('./fixtures');

const LINES = ['belgrave', 'mernda', 'hurstbridge', 'craigieburn', 'werribee', 'dandenong', 'geelong'];

test.describe('lines', () => {
  test('the data of every line hangs together', async ({ page, game }) => {
    await game.open();
    const problems = await page.evaluate(() => {
      const out = [];
      for (const id of LINE_IDS) {
        const L = LINES[id], S = L.stations, codes = S.map(s => s.code);
        S.forEach((s, i) => {
          if (i && s.at - S[i - 1].at < 900) out.push(id + ': ' + s.code + ' is too close to ' + S[i - 1].code);
          if (i && s.km <= S[i - 1].km) out.push(id + ': km goes backwards at ' + s.code);
          if (i && s.at % 96 !== 76) out.push(id + ': ' + s.code + ' at ' + s.at + ' is not 76 mod 96');
          if (s.roof === 'under' && !UNDER_STYLES[s.under]) out.push(id + ': ' + s.code + ' has no underground style');
        });
        if (new Set(codes).size !== codes.length) out.push(id + ': station codes repeat');
        for (const [code, , , name] of [...L.landmarks, ...L.farmarks]) {
          if (!codes.includes(code)) out.push(id + ': landmark at unknown station ' + code);
          if (!PAINTERS[name]) out.push(id + ': no painter called ' + name);
        }
        for (const t of L.terrain) if (!SECTIONS[t.id]) out.push(id + ': no landscape called ' + t.id);
        if (!TRAIN_STYLES[L.train]) out.push(id + ': no train style ' + L.train);
        // an underground platform must lie inside a tunnel, and nothing else may
        const at = ([i, px]) => S[i].at + px;
        S.forEach(s => {
          const inside = L.tunnels.some(([a, b]) => s.at > at(a) && s.at < at(b));
          if ((s.roof === 'under') !== inside) out.push(id + ': ' + s.code + (inside ? ' is in a tunnel but not underground' : ' is underground outside a tunnel'));
        });
      }
      return out;
    });
    expect(problems).toEqual([]);
  });

  test('the departures board lists every line, earliest first', async ({ page, game }) => {
    await game.open();
    const board = await page.evaluate(() => LINE_IDS.map(id => [id, LINES[id].clock[0]]));
    expect(board.map(([id]) => id).sort()).toEqual([...LINES].sort());
    for (let i = 1; i < board.length; i++) expect(board[i][1]).toBeGreaterThan(board[i - 1][1]);
  });

  test('moving along the board puts that line behind it, and the address follows', async ({ page, game }) => {
    await game.open();
    expect(await page.evaluate(() => LINE_ID)).toBe('belgrave');
    await page.keyboard.press('ArrowDown');
    const s = await page.evaluate(() => ({ id: LINE_ID, first: STATIONS[0].code, sel: LINE_IDS[ui.lineSel], title: ui.title, dist: sim.dist }));
    expect(s.id).toBe(s.sel);
    expect(s.id).not.toBe('belgrave');
    expect(s.title).toBe(true);
    expect(s.dist).toBe(0);
    expect(new URL(page.url()).searchParams.get('line')).toBe(s.id);
    await page.keyboard.press('ArrowUp');
    expect(await page.evaluate(() => LINE_ID)).toBe('belgrave');
  });

  test('clicking a row of the board picks that line', async ({ page, game }) => {
    await game.open();
    const box = await page.locator('#screen').boundingBox();
    const hit = await page.evaluate(() => { const i = LINE_IDS.indexOf('geelong'); drawTitle(document.getElementById('screen').getContext('2d')); return LINE_HITS[i]; });
    await page.mouse.click(box.x + (hit.x + 20) * box.width / 320, box.y + (hit.y + 4) * box.height / 180);
    const s = await page.evaluate(() => ({ id: LINE_ID, first: STATIONS[0].en, train: LINE.train }));
    expect(s).toEqual({ id: 'geelong', first: 'SOUTHERN CROSS', train: 'vlocity' });
  });

  test('a ?line= link opens that line on the board', async ({ game, page }) => {
    await game.open('?line=dandenong');
    const s = await page.evaluate(() => ({ id: LINE_ID, first: STATIONS[0].code, title: ui.title, sel: LINE_IDS[ui.lineSel] }));
    expect(s).toEqual({ id: 'dandenong', first: 'THL', title: true, sel: 'dandenong' });
  });

  test('OTHER LINES goes back to the board from a trip', async ({ page, game }) => {
    await game.open('?line=werribee#watch');
    await page.waitForFunction(() => sim.state !== 'STOPPED' || sim.stopPhase !== 'SETTLE');
    await page.locator('#b-lines').click();
    const s = await page.evaluate(() => ({ title: ui.title, station: sim.station, dist: sim.dist, driving: drive.on }));
    expect(s).toEqual({ title: true, station: 0, dist: 0, driving: false });
    expect(await game.buttons()).not.toContain('lines');
  });

  for (const id of LINES.filter(l => l !== 'belgrave')) {                      // (Belgrave has its own run in autopilot.spec.js)
    test(`the ${id} line runs to the end on autopilot`, async ({ page, game }) => {
      test.setTimeout(240_000);
      await game.open(`?line=${id}#watch`);
      await page.keyboard.press('Digit4');
      await game.fastForward();
      const codes = await page.evaluate(() => STATIONS.map(s => s.code)), seen = [];
      for (const code of codes) { await game.atStation(code, undefined, 90_000); seen.push(code); }
      await page.waitForFunction(() => ui.complete, null, { timeout: 30_000 });
      expect(seen).toEqual(codes);
      expect((await game.state()).station).toBe(codes[codes.length - 1]);
    });
  }
});

test.describe('trains', () => {
  test('each line runs its own kind of train', async ({ page, game }) => {
    await game.open();
    const trains = await page.evaluate(() => Object.fromEntries(LINE_IDS.map(id => [id, LINES[id].train])));
    expect(trains).toEqual({ belgrave: 'xtrap', mernda: 'xtrap', hurstbridge: 'xtrap', craigieburn: 'siemens', werribee: 'comeng', dandenong: 'hcmt', geelong: 'vlocity' });
  });

  test('the V/Line diesel starts its engine instead of raising a pantograph', async ({ page, game }) => {
    await game.open('?line=geelong#drive');
    let s = await game.state();
    expect(s.hint).toBe('START THE ENGINE [E]');
    expect(await page.evaluate(() => [TRAIN.pantos.length, ELECTRIC])).toEqual([0, false]);
    await expect(page.locator('#b-engine')).toHaveText('START');
    await page.keyboard.press('KeyE');
    expect((await game.state()).hint).toBe('STARTING THE ENGINE...');
    await page.waitForFunction(() => drive.engine === 'ON');
    await expect(page.locator('#b-engine')).toHaveText('STOP');
    expect((await game.state()).hint).toBe('OPEN THE DOORS [O]');
  });

  test('switching lines on the board changes the train too', async ({ page, game }) => {
    await game.open('?line=geelong');
    expect(await page.evaluate(() => [STYLE === TRAIN_STYLES.vlocity, DIESEL])).toEqual([true, true]);
    await page.evaluate(() => pickLine(LINE_IDS.indexOf('craigieburn')));
    expect(await page.evaluate(() => [STYLE === TRAIN_STYLES.siemens, DIESEL, TRAIN.pantos.length])).toEqual([true, false, 4]);
  });
});

test('on a phone, the NEXT button steps along the board', async ({ page, game }) => {
  await game.open();
  await expect(page.locator('#b-skip')).toHaveText('LINE');
  await page.locator('#b-skip').click();
  expect(await page.evaluate(() => LINE_IDS[ui.lineSel] === LINE_ID && LINE_ID !== 'belgrave')).toBe(true);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(page.locator('#b-skip')).toHaveText('NEXT');
});
