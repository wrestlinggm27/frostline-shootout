// Zero-dependency smoke tests for browser-based Frostline Shootout.
// Run: node --test tests/smoke.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const gameCode = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

class MockNode {
  constructor(name = '') {
    this.name = name;
    this.textContent = '';
    this.innerHTML = '';
    this.hidden = false;
    this.value = '';
    this.open = false;
    this.dataset = {};
    this.attrs = {};
    this.children = [];
    this.handlers = {};
    this.style = { setProperty() {}, width: '' };
    this.classes = new Set();
    this.classList = {
      add: key => this.classes.add(key),
      remove: key => this.classes.delete(key),
      toggle: (key, enabled) => { if (enabled) this.classes.add(key); else this.classes.delete(key); },
      contains: key => this.classes.has(key)
    };
  }
  addEventListener(name, callback) { (this.handlers[name] ??= []).push(callback); }
  emit(name, details = {}) {
    const event = { preventDefault() {}, target: this, pointerId: 1, button: 0,
      clientX: 210, clientY: 563, ...details };
    for (const callback of this.handlers[name] || []) callback(event);
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name]; }
  querySelector() { return this.queryNode ||= new MockNode('query'); }
  showModal() { this.open = true; }
  close() { this.open = false; }
  setPointerCapture(id) { this.captured = id; }
  hasPointerCapture(id) { return this.captured === id; }
  releasePointerCapture() { this.captured = null; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 420, height: 680 }; }
}

function boot(seed = {}) {
  const storage = new Map(Object.entries(seed));
  const nodes = new Map();
  const raf = [];
  const errors = [];
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      if (key === 'measureText') return text => ({ width: String(text).length * 10 });
      return noop;
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  function elem(id) {
    if (!nodes.has(id)) nodes.set(id, new MockNode(id));
    return nodes.get(id);
  }
  const leagues = ['pond', 'beer', 'show'].map(id => Object.assign(new MockNode(id), { dataset: { difficulty: id } }));
  const presets = ['broadway', 'ice', 'aurora', 'black'].map(id => Object.assign(new MockNode(id), { dataset: { teamPreset: id } }));
  const document = {
    hidden: false,
    documentElement: { style: { setProperty: noop } },
    getElementById: elem,
    querySelectorAll(selector) {
      if (selector === '[data-difficulty]') return leagues;
      if (selector === '[data-team-preset]') return presets;
      return [];
    },
    querySelector(selector) { return elem('query:' + selector); },
    createElement(name) { return new MockNode(name); },
    addEventListener: noop
  };
  elem('rink').getContext = () => ctx;
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  let time = 1000;
  const sandbox = {
    document, localStorage, console,
    window: { addEventListener: noop, devicePixelRatio: 1 },
    performance: { now: () => time },
    requestAnimationFrame: fn => raf.push(fn),
    ResizeObserver: class { observe() {} },
    fetch: () => Promise.reject(Error('Skipped in smoke test')),
    setTimeout, clearTimeout
  };
  try { vm.runInNewContext(gameCode, sandbox, { filename: 'game.js', timeout: 2000 }); }
  catch (error) { errors.push(error); throw error; }
  function frame(ms = 100) {
    time += ms;
    const cb = raf.shift();
    assert.equal(typeof cb, 'function', 'animation frame must be available');
    cb(time);
  }
  function submit(id) { elem(id).emit('submit'); }
  return { elem, leagues, presets, storage, localStorage, frame, submit, errors, raf };
}

test('UI contains player, team and local record book elements', () => {
  for (const id of ['playerDialog', 'playerForm', 'playerNameInput', 'switchPlayerButton',
      'teamDialog', 'recordsDialog', 'recordsButton', 'recordRows', 'playButton',
      'menuPlayerName', 'teamNameDisplay']) {
    assert.ok(html.includes('id="' + id + '"'), id + ' missing in HTML');
  }
  assert.ok(css.includes('.profile-dialog'));
  assert.ok(html.includes('ARCADE SHOOTOUT'));
});

test('first visit requests name, leads to team setup, saves separate player records', () => {
  const t = boot();
  t.frame(16); // first requestAnimationFrame opens onboarding
  assert.equal(t.elem('playerDialog').open, true);
  t.elem('playerNameInput').value = '  Slapshot Ace  ';
  t.submit('playerForm');
  assert.equal(t.elem('playerDialog').open, false);
  assert.equal(t.elem('teamDialog').open, true);
  assert.equal(t.elem('menuPlayerName').textContent, 'SLAPSHOT ACE');
  t.presets[2].emit('click');
  t.elem('teamNameInput').value = 'Aurora Stars';
  t.submit('teamForm');
  assert.equal(t.elem('teamDialog').open, false);
  assert.equal(t.elem('teamNameDisplay').textContent, 'AURORA STARS');
  const saved = JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1'));
  assert.equal(saved.players.length, 1);
  assert.equal(saved.players[0].name, 'Slapshot Ace');
  assert.equal(saved.players[0].team.name, 'Aurora Stars');
  assert.equal(saved.players[0].records.arcade.beer.best, 0);

  t.leagues[0].emit('click');
  t.elem('playButton').emit('click');
  assert.equal(t.elem('overlay').hidden, true);
  // A real mouse drag must still shoot and update the scoreboard.
  const rink = t.elem('rink');
  rink.emit('pointerdown', { pointerId: 23, clientX: 210, clientY: 563 });
  rink.emit('pointermove', { pointerId: 23, clientX: 180, clientY: 650 });
  rink.emit('pointerup', { pointerId: 23, clientX: 180, clientY: 650 });
  assert.equal(t.elem('shots').textContent, 1);
  for (let i = 0; i < 370; i++) t.frame(100);
  assert.equal(t.elem('overlay').hidden, false);
  const after = JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1'));
  assert.equal(after.players[0].records.arcade.pond.rounds, 1);
  assert.equal(after.players[0].records.arcade.beer.rounds, 0);
  assert.equal(after.players[0].records.arcade.pond.shots, 1);
  const results = after.players[0].records.arcade.pond;
  assert.equal(results.shots, results.goals + results.saves + results.misses);
});

test('legacy high scores migrate once, each player stays independent', () => {
  const seed = {
    'frostline-dev:frostline-shootout-high-score-v1': '7',
    'frostline-dev:frostline-shootout-high-score-beer-v1': '5',
    'frostline-dev:frostline-shootout-personal-team-v1': JSON.stringify({
      name: 'Old Heroes', primary: '#113388', secondary: '#cc2222', trim: '#ffffff'
    })
  };
  const t = boot(seed);
  t.frame(16);
  t.elem('playerNameInput').value = 'Original';
  t.submit('playerForm');
  let data = JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1'));
  assert.equal(data.players[0].records.arcade.show.best, 7);
  assert.equal(data.players[0].records.arcade.beer.best, 5);
  assert.equal(data.players[0].team.name, 'Old Heroes');
  t.elem('cancelTeam').emit('click');
  t.elem('recordsButton').emit('click');
  assert.equal(t.elem('recordsDialog').open, true);
  assert.equal(t.elem('recordRows').children.length, 3);
  t.elem('closeRecords').emit('click');

  t.elem('switchPlayerButton').emit('click');
  t.elem('playerNameInput').value = 'New Contender';
  t.submit('playerForm');
  data = JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1'));
  assert.equal(data.players.length, 2);
  assert.equal(data.players[1].records.arcade.show?.best ?? 0, 0);
  t.elem('cancelTeam').emit('click');
  t.elem('switchPlayerButton').emit('click');
  const oldButton = t.elem('existingPlayers').children[0];
  oldButton.emit('click');
  assert.equal(t.elem('menuPlayerName').textContent, 'ORIGINAL');
  assert.equal(t.elem('teamNameDisplay').textContent, 'OLD HEROES');
  t.leagues[2].emit('click');
  assert.equal(t.elem('best').textContent, 7);

  const reloaded = boot(Object.fromEntries(t.storage));
  assert.equal(reloaded.elem('playerDialog').open, false);
  assert.equal(reloaded.elem('menuPlayerName').textContent, 'ORIGINAL');
  assert.equal(reloaded.elem('teamNameDisplay').textContent, 'OLD HEROES');
  assert.equal(reloaded.elem('best').textContent, 7);
  assert.equal(reloaded.elem('difficultyStatus').textContent, 'THE SHOW');
});
