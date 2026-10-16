// Shared setup for every spec.
//
// `game` is a small driver for the page under test. The game keeps its state in
// plain globals (sim, ui, drive, STATIONS ...), so tests read that state directly
// instead of guessing from pixels, and steer the game through its real controls:
// the keyboard and the toolbar.
//
// Any uncaught error or console error in the browser fails the test that caused it.
const base = require('@playwright/test');

class Game {
  constructor(page) { this.page = page; }

  /**
   * Load the game ('' for the title card, '#watch' or '#drive' to deep-link, '?line=...' for a line)
   * and wait until it has started. The weather is random on every trip, so tests fix it with a seed.
   */
  async open(where = '', seed = 7) {
    const [path, hash = ''] = where.split('#');
    const query = (path.startsWith('?') ? path + '&' : '?') + 'seed=' + seed;
    await this.page.goto('./' + query + (hash ? '#' + hash : ''));
    await this.page.waitForFunction(() => typeof VARIANTS !== 'undefined' && typeof sim !== 'undefined');
  }

  /** Title card -> WATCH (autopilot). */
  async watch() {
    await this.page.keyboard.press('ArrowLeft');
    await this.page.keyboard.press('Enter');
    await this.page.waitForFunction(() => !ui.title && !drive.on);
  }

  /** Title card -> DRIVE (you are the driver). */
  async drive() {
    await this.page.keyboard.press('Enter');
    await this.page.waitForFunction(() => !ui.title && drive.on);
  }

  /** Hold F: everything runs four times faster until release(). Works in both modes. */
  async fastForward() { await this.page.keyboard.down('KeyF'); }
  async release() { await this.page.keyboard.up('KeyF'); }

  /** A snapshot of the state the assertions care about. */
  state() {
    return this.page.evaluate(() => ({
      title: ui.title, complete: ui.complete, paused: ui.paused, speedSetting: ui.speed,
      state: sim.state, phase: sim.stopPhase, station: STATIONS[sim.station].code,
      dist: sim.dist, speed: sim.speed, doorOpen: sim.doorOpen, stopOffset: sim.stopOffset,
      driving: drive.on, power: drive.engine, lever: drive.lever, limit: drive.limit, over: drive.over,
      pax: drive.pax, points: { ...drive.pts }, hint: drive.on ? driveHint() : '',
      toasts: toasts.map(t => t.text),
    }));
  }

  /** Wait for the train to be standing at a station (by code) in a given stop phase, if one is named. */
  async atStation(code, phase, timeout = 60_000) {
    await this.page.waitForFunction(([c, ph]) =>
      sim.state === 'STOPPED' && STATIONS[sim.station].code === c && (!ph || sim.stopPhase === ph), [code, phase], { timeout });
  }

  /** Wait for a stop phase at whatever station the train is standing at. */
  async phase(name, timeout = 60_000) {
    await this.page.waitForFunction(ph => sim.state === 'STOPPED' && sim.stopPhase === ph, name, { timeout });
  }

  /** Which toolbar buttons are showing, by id without the "b-" prefix. */
  buttons() {
    return this.page.evaluate(() => [...document.querySelectorAll('#bar button')]
      .filter(b => b.offsetParent !== null).map(b => b.id.slice(2)));
  }
}

exports.test = base.test.extend({
  game: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', e => errors.push('uncaught: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await use(new Game(page));
    base.expect(errors, 'the browser console stays free of errors').toEqual([]);
  },
});
exports.expect = base.expect;

// The line as it should be: [code, name], in travel order.
exports.LINE = [
  ['FSS', 'FLINDERS STREET'], ['RMD', 'RICHMOND'], ['HAW', 'HAWTHORN'], ['GFE', 'GLENFERRIE'], ['CAM', 'CAMBERWELL'],
  ['BOX', 'BOX HILL'], ['RWD', 'RINGWOOD'], ['BOR', 'BORONIA'], ['UFG', 'UPPER FERNTREE GULLY'], ['BEG', 'BELGRAVE'],
];
exports.AUTO_BUTTONS = ['mode', 'pause', 'speed', 'skip', 'time', 'rain', 'mute'];
exports.DRIVE_BUTTONS = ['mode', 'engine', 'power', 'brake', 'doors', 'horn', 'light', 'pause', 'mute', 'lines'];
