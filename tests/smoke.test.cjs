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
  toggleAttribute(name, force) {
    const next = force === undefined ? !Object.hasOwn(this.attrs, name) : Boolean(force);
    if (next) this.setAttribute(name, '');
    else delete this.attrs[name];
    return next;
  }
  querySelector() { return this.queryNode ||= new MockNode('query'); }
  showModal() { this.open = true; }
  close() { this.open = false; }
  setPointerCapture(id) { this.captured = id; }
  hasPointerCapture(id) { return this.captured === id; }
  releasePointerCapture() { this.captured = null; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 420, height: 680 }; }
}

function boot(seed = {}, options = {}) {
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
      if (key === 'fillText' && options.onDrawText) return text => options.onDrawText(String(text));
      if (key === 'rotate' && options.onCanvasRotate) return angle => options.onCanvasRotate(angle);
      if (key === 'translate' && options.onCanvasTranslate) return (x,y) => options.onCanvasTranslate(x,y);
      if (key === 'scale' && options.onCanvasScale) return (x,y) => options.onCanvasScale(x,y);
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
  const logoChoices = ['power', 'speed', 'ice'].map(id => Object.assign(new MockNode(id), { dataset: { fLogo: id } }));
  const crestChoices = ['monogram', 'wolf', 'bolt', 'sticks', 'star', 'mountain'].map(id => Object.assign(new MockNode(id), { dataset: { teamCrest: id } }));
  const cityChoices = ['boston', 'buffalo', 'detroit', 'florida', 'montreal', 'ottawa', 'tampa', 'toronto', 'carolina', 'columbus', 'newjersey', 'islanders', 'newyork', 'philadelphia', 'pittsburgh', 'washington', 'chicago', 'colorado', 'dallas', 'minnesota', 'nashville', 'stlouis', 'utah', 'winnipeg', 'anaheim', 'calgary', 'edmonton', 'losangeles', 'sanjose', 'seattle', 'vancouver', 'vegas'].map(id => Object.assign(new MockNode(id), { dataset: { cityClub: id } }));
  const nationChoices = ['usa','canada','sweden','finland','czechia','slovakia','germany','switzerland']
    .map(id => Object.assign(new MockNode(id), { dataset: { nationalTeam: id } }));
  const document = {
    hidden: false,
    documentElement: { style: { setProperty: noop } },
    getElementById: elem,
    querySelectorAll(selector) {
      if (selector === '[data-difficulty]') return leagues;
      if (selector === '[data-team-preset]') return presets;
      if (selector === '[data-f-logo]') return logoChoices;
      if (selector === '[data-team-crest]') return crestChoices;
      if (selector === '[data-city-club]') return cityChoices;
      if (selector === '[data-national-team]') return nationChoices;
      return [];
    },
    querySelector(selector) { return elem('query:' + selector); },
    createElement(name) { return new MockNode(name); },
    createElementNS(ns, name) { return new MockNode(name); },
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
    Path2D: options.usePath2D ? class MockPath2D { constructor(path) { this.path = path; } } : undefined,
    window: { addEventListener: noop, devicePixelRatio: 1, AudioContext: options.AudioContext },
    performance: { now: () => time },
    requestAnimationFrame: fn => raf.push(fn),
    ResizeObserver: class { observe() {} },
    fetch: () => Promise.reject(Error('Skipped in smoke test')),
    setTimeout, clearTimeout
  };
  try { vm.runInNewContext(gameCode, sandbox, { filename: 'game.js', timeout: 2000 }); }
  catch (error) { errors.push(error); throw error; }
  // Existing gameplay tests bypass the intro. Dedicated startup tests exercise the sequence.
  if (!options.manualStartup) elem('startupSkipButton').emit('click');
  function frame(ms = 100) {
    time += ms;
    const cb = raf.shift();
    assert.equal(typeof cb, 'function', 'animation frame must be available');
    cb(time);
  }
  function submit(id) { elem(id).emit('submit'); }
  return { elem, leagues, presets, logoChoices, crestChoices, cityChoices, nationChoices, storage, localStorage, frame, submit, errors, raf };
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

test('Stable startup gates onboarding and supports separate start / intro / ready states', () => {
  const t = boot({}, { manualStartup: true });
  const opening = t.elem('startupScreen');
  assert.equal(opening.dataset.phase, 'start');
  assert.equal(opening.hidden, false);
  assert.equal(t.elem('startupWelcome').hidden, false);
  assert.equal(t.elem('startupIntro').hidden, true);
  assert.equal(t.elem('frostEdgeOverlay').dataset.frost, 'off', 'corners start clear');
  assert.equal(t.elem('playerDialog').open, false, 'onboarding must not cover startup');
  t.frame(16);
  assert.equal(t.elem('playerDialog').open, false, 'first frame must leave opening on screen');
  assert.equal(t.storage.has('frostline-player-profiles-v1'), false, 'startup must not create profiles');

  t.elem('startupBeginButton').emit('click');
  assert.equal(opening.dataset.phase, 'intro');
  assert.equal(t.elem('startupWelcome').hidden, true);
  assert.equal(t.elem('startupIntro').hidden, false);
  assert.equal(t.elem('frostEdgeOverlay').dataset.frost, 'on', 'PRESS START grows corner ice');
  assert.equal(t.elem('playerDialog').open, false);
  t.elem('startupBeginButton').emit('click'); // double-taps cannot restart intro
  assert.equal(opening.dataset.phase, 'intro');
  t.elem('startupSkipButton').emit('click');
  assert.equal(opening.dataset.phase, 'ready');
  assert.equal(opening.hidden, true);
  assert.equal(t.elem('frostEdgeOverlay').dataset.frost, 'on', 'frost persists after intro');
  assert.equal(t.elem('playerDialog').open, true, 'new players enter existing onboarding');
  t.elem('startupSkipButton').emit('click');
  assert.equal(t.storage.has('frostline-player-profiles-v1'), false, 'skipping must not create profiles');
  assert.equal(t.elem('playerDialog').open, true);
  t.elem('playerNameInput').value = 'Intro Tester';
  t.submit('playerForm');
  t.submit('teamForm');
  const saved = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(saved.players[0].name, 'Intro Tester');
  assert.equal(t.storage.has('frostline-dev:frostline-player-profiles-v1'), false, 'DEV records isolated');
});

test('Stable intro can be skipped with an existing player without resetting the score', () => {
  const first = boot();
  first.elem('playerNameInput').value = 'Returning Player';
  first.submit('playerForm');
  first.submit('teamForm');
  const key = 'frostline-player-profiles-v1';
  let profileDB = JSON.parse(first.storage.get(key));
  profileDB.players[0].records.arcade.beer.best = 12;
  const saved = JSON.stringify(profileDB);
  const loaded = boot({ [key]: saved }, { manualStartup: true });
  assert.equal(loaded.elem('startupScreen').dataset.phase, 'start');
  assert.equal(loaded.elem('playerDialog').open, false);
  loaded.elem('startupSkipButton').emit('click');
  assert.equal(loaded.elem('frostEdgeOverlay').dataset.frost, 'on', 'skip also keeps frosty edges');
  assert.equal(loaded.elem('startupScreen').hidden, true);
  assert.equal(loaded.elem('playerDialog').open, false);
  assert.equal(loaded.elem('menuPlayerName').textContent, 'RETURNING PLAYER');
  assert.equal(Number(loaded.elem('best').textContent), 12);
  const preserved = JSON.parse(loaded.storage.get(key));
  assert.equal(preserved.players[0].records.arcade.beer.best, 12);
  assert.equal(preserved.players[0].name, 'Returning Player');
});

test('Stable ice startup sound is triggered by PRESS START and never by silent skip', () => {
  let cracks = 0, rings = 0;
  const param = () => ({
    value: 0, setValueAtTime() {}, linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {}, setTargetAtTime() {}
  });
  const node = () => ({ connect() {}, start() {}, stop() {}, frequency: param(), gain: param(), Q: param() });
  class FakeIceAudio {
    constructor() { this.state = 'running'; this.currentTime = 4; this.destination = {}; this.sampleRate = 48000; }
    createDynamicsCompressor() {
      return { connect() {}, threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() };
    }
    createGain() { return node(); }
    createBuffer() { return { getChannelData: () => new Float32Array(64) }; }
    createBufferSource() { cracks += 1; return node(); }
    createBiquadFilter() { return node(); }
    createOscillator() { rings += 1; return node(); }
  }
  const soundTest = boot({}, { manualStartup: true, AudioContext: FakeIceAudio });
  soundTest.elem('startupBeginButton').emit('click');
  assert.equal(soundTest.elem('frostEdgeOverlay').dataset.frost, 'on');
  assert.equal(cracks, 8, 'eight tightly spaced ice fracture impulses');
  assert.equal(rings, 0, 'no melodic oscillator or descending woo sound');
  soundTest.elem('startupBeginButton').emit('click');
  assert.equal(cracks, 8, 'repeated taps do not replay intro sound');
  soundTest.elem('startupSkipButton').emit('click');

  const silent = boot({}, { manualStartup: true, AudioContext: FakeIceAudio });
  silent.elem('startupSkipButton').emit('click');
  assert.equal(cracks, 8, 'skip does not trigger an unexpected crack sound');
  assert.equal(silent.elem('frostEdgeOverlay').dataset.frost, 'on');
  assert.equal(silent.storage.has('frostline-dev:frostline-player-profiles-v1'), false);
});

test('Stable sound toggle switches SVG icons and mutes/unmutes the audio bus', () => {
  const volumeChanges = [];
  class FakeAudioContext {
    constructor() { this.state = 'running'; this.currentTime = 4; this.destination = {}; }
    createDynamicsCompressor() {
      const param = () => ({ value: 0 });
      return { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect() {} };
    }
    createGain() {
      return { gain: { value: 1, setTargetAtTime(value) { volumeChanges.push(value); } }, connect() {} };
    }
  }
  const t = boot({}, { AudioContext: FakeAudioContext });
  const existingStorage = [...t.storage.entries()];
  const on = t.elem('soundOnIcon'), off = t.elem('soundOffIcon');
  const button = t.elem('soundButton');
  assert.equal(on.getAttribute('hidden'), undefined, 'speaker icon visible initially');
  assert.equal(off.getAttribute('hidden'), '', 'muted icon hidden initially');
  assert.equal(button.getAttribute('aria-pressed'), 'false');

  button.emit('click');
  assert.equal(on.getAttribute('hidden'), '', 'speaker icon must hide when muted');
  assert.equal(off.getAttribute('hidden'), undefined, 'muted icon must become visible');
  assert.equal(button.getAttribute('aria-label'), 'Turn sound on');
  assert.equal(button.getAttribute('aria-pressed'), 'true');

  button.emit('click'); // Unmuting unlocks and initializes Web Audio.
  assert.equal(on.getAttribute('hidden'), undefined);
  assert.equal(off.getAttribute('hidden'), '');
  assert.equal(button.getAttribute('aria-label'), 'Mute sound');
  button.emit('click'); // Now the existing master bus must actually mute.
  assert.equal(volumeChanges.at(-1), 0);
  button.emit('click');
  assert.equal(volumeChanges.at(-1), .74);
  assert.deepEqual([...t.storage.entries()], existingStorage, 'mute should not change player or game saves');
});


test('Stable excludes private DEV goalie diagnostic controls and storage', () => {
  for (const forbidden of [
    'devTestButton', 'devTestHint', 'dev-test-button',
    'toggleDevTest', 'devTest.dragPointer', 'DEV_STORAGE_PREFIX',
    'frostline-dev:'
  ]) {
    assert.equal(gameCode.includes(forbidden), false, forbidden + ' must not ship in game.js');
    assert.equal(html.includes(forbidden), false, forbidden + ' must not ship in index.html');
    assert.equal(css.includes(forbidden), false, forbidden + ' must not ship in style.css');
  }
});

test('Stable goalie gloves block both sides while clear shooting lanes can score', () => {
  // Normal live rounds only. No DEV diagnostic mode or private test controls.
  for (const difficulty of ['pond', 'beer', 'show']) {
    for (const [pull, outcome] of [[-15, 'save'], [8, 'save'], [17, 'goal']]) {
      const t = boot();
      t.frame(16);
      t.elem('playerNameInput').value = 'Glove Check';
      t.submit('playerForm');
      t.submit('teamForm');
      t.leagues.find(button => button.dataset.difficulty === difficulty).emit('click');
      t.elem('playButton').emit('click');
      const rink = t.elem('rink');
      rink.emit('pointerdown', { pointerId:67, clientX:210, clientY:563 });
      rink.emit('pointermove', { pointerId:67, clientX:210+pull, clientY:663 });
      rink.emit('pointerup', { pointerId:67, clientX:210+pull, clientY:663 });
      for (let i=0; i<13; i++) t.frame(100);
      assert.equal(t.elem('shots').textContent, 1, difficulty + ': one valid live shot');
      assert.equal(t.elem('saves').textContent, outcome === 'save' ? 1 : 0,
        difficulty + ': glove result for pull ' + pull);
      assert.equal(t.elem('score').textContent, outcome === 'goal' ? 1 : 0,
        difficulty + ': goal result for pull ' + pull);
      assert.equal(t.elem('misses').textContent, 0, difficulty + ': test shot stays on target');
      assert.equal(t.storage.has('frostline-dev:frostline-player-profiles-v1'), false,
        'Stable never creates DEV records');
    }
  }
});

test('Stable goalie colors are an independent main-menu editor with per-player saves', () => {
  assert.ok(html.includes('id="goalieCustomizeButton"'), 'independent main-menu button');
  assert.ok(html.includes('id="goalieDialog"'), 'independent dialog');
  assert.equal(html.includes('id="goaliePaletteGallery"'), false, 'old team sub-menu removed');
  assert.equal(html.includes('class="logo-lab-trigger"'), false, 'Logo Lab remains in menu grid');
  const dialogStart = html.indexOf('<dialog id="teamDialog"');
  const dialogEnd = html.indexOf('</dialog>', dialogStart);
  assert.equal(html.slice(dialogStart, dialogEnd).includes('id="goaliePaletteOptions"'), false,
    'team editor should not contain goalie colors');

  const t = boot();
  // Simulate a long goalie palette dialog for jump-to-save checks.
  t.elem('goalieDialog').scrollHeight = 1500;
  const options = t.elem('goaliePaletteOptions').children;
  assert.equal(options.length, 33, '32 city colors plus Frostline original');
  const choice = id => options.find(button => button.dataset.goaliePalette === id);
  for (const id of ['original','anaheim','boston','detroit','newyork','islanders','utah','vegas','seattle','winnipeg']) {
    assert.ok(choice(id), id + ' palette must be selectable');
  }

  t.frame(16);
  t.elem('playerNameInput').value = 'Boston Rival';
  t.submit('playerForm');
  t.submit('teamForm');
  const key = 'frostline-player-profiles-v1';
  let saved = JSON.parse(t.storage.get(key));
  const originalTeam = JSON.stringify(saved.players[0].team);
  assert.equal(saved.players[0].goaliePalette, 'original');

  t.elem('goalieCustomizeButton').emit('click');
  assert.equal(t.elem('goalieDialog').open, true);
  assert.equal(t.elem('goalieDialog').scrollTop, 0, 'goalie chooser starts at the top');
  choice('boston').emit('click');
  assert.equal(t.elem('goalieDialog').scrollTop, 1500,
    'goalie choice scrolls its dialog to Save Goalie');
  assert.equal(choice('boston').getAttribute('aria-pressed'), 'true');
  assert.equal(t.elem('goaliePaletteSummary').textContent, 'Selected: Boston');
  assert.equal(t.elem('goaliePalettePreview').textContent, 'BOSTON');
  t.elem('cancelGoalie').emit('click');
  assert.equal(t.elem('goalieDialog').open, false);
  assert.equal(JSON.parse(t.storage.get(key)).players[0].goaliePalette, 'original',
    'cancel discards unsaved goalie color');
  t.elem('goalieCustomizeButton').emit('click');
  assert.equal(t.elem('goalieDialog').scrollTop, 0, 'reopening goalie chooser resets scroll');
  assert.equal(t.elem('goaliePaletteSummary').textContent, 'Selected: Frostline Original');
  choice('boston').emit('click');
  assert.equal(t.elem('goalieDialog').scrollTop, 1500, 'jump works after reopening');
  t.submit('goalieForm');
  assert.equal(t.elem('goalieDialog').open, false);
  saved = JSON.parse(t.storage.get(key));
  assert.equal(saved.players[0].goaliePalette, 'boston');
  assert.equal(JSON.stringify(saved.players[0].team), originalTeam,
    'opponent choice must not alter home team');
  assert.equal(saved.players[0].records.arcade.beer.best, 0);

  t.elem('customizeButton').emit('click');
  assert.equal(t.elem('teamDialog').open, true);
  t.submit('teamForm');
  assert.equal(JSON.parse(t.storage.get(key)).players[0].goaliePalette, 'boston',
    'saving team must not reset opponent choice');
  t.elem('goalieCustomizeButton').emit('click');
  choice('vegas').emit('click');
  t.elem('closeGoalieDialog').emit('click');
  t.elem('goalieCustomizeButton').emit('click');
  assert.equal(t.elem('goaliePaletteSummary').textContent, 'Selected: Boston',
    'closing X discards unsaved opponent choice');
  t.elem('cancelGoalie').emit('click');

  t.elem('playButton').emit('click');
  t.elem('mainMenuButton').emit('click');
  assert.equal(JSON.parse(t.storage.get(key)).players[0].goaliePalette, 'boston');
  t.elem('switchPlayerButton').emit('click');
  t.elem('playerNameInput').value = 'New Opponent';
  t.submit('playerForm');
  t.submit('teamForm');
  saved = JSON.parse(t.storage.get(key));
  assert.equal(saved.players.length, 2);
  assert.equal(saved.players[0].goaliePalette, 'boston');
  assert.equal(saved.players[1].goaliePalette, 'original');
  assert.equal(t.storage.has('frostline-dev:frostline-player-profiles-v1'), false, 'DEV records untouched');

  const reloaded = boot(Object.fromEntries(t.storage));
  reloaded.elem('switchPlayerButton').emit('click');
  const oldPlayer = reloaded.elem('existingPlayers').children.find(button => button.textContent === 'Boston Rival');
  oldPlayer.emit('click');
  reloaded.elem('goalieCustomizeButton').emit('click');
  assert.equal(reloaded.elem('goaliePaletteSummary').textContent, 'Selected: Boston',
    'saved goalie palette survives reload');
  reloaded.elem('cancelGoalie').emit('click');
});

test('Stable Main Menu abandons a round safely and can start a clean game or new profile', () => {
  const t = boot();
  t.frame(16);
  t.elem('playerNameInput').value = 'First Skater';
  t.submit('playerForm');
  t.submit('teamForm');
  const original = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(original.players.length, 1);
  assert.equal(t.elem('mainMenuButton').hidden, true);
  assert.equal(t.elem('resultsMenuButton').hidden, true);

  t.elem('playButton').emit('click');
  assert.equal(t.elem('mainMenuButton').hidden, false);
  assert.equal(t.elem('overlay').hidden, true);
  const rink = t.elem('rink');
  rink.emit('pointerdown', { pointerId: 52, clientX: 210, clientY: 563 });
  rink.emit('pointermove', { pointerId: 52, clientX: 170, clientY: 645 });
  rink.emit('pointerup', { pointerId: 52, clientX: 170, clientY: 645 });
  assert.equal(t.elem('shots').textContent, 1);

  t.elem('mainMenuButton').emit('click');
  assert.equal(t.elem('mainMenuButton').hidden, true);
  assert.equal(t.elem('resultsMenuButton').hidden, true);
  assert.equal(t.elem('overlay').hidden, false);
  assert.match(t.elem('overlayTitle').innerHTML, /THIRTY SECONDS/);
  assert.equal(t.elem('shots').textContent, 0);
  assert.equal(t.elem('score').textContent, 0);
  assert.match(t.elem('time').innerHTML, /30\.0/);
  assert.equal(t.elem('menuPlayerName').textContent, 'FIRST SKATER');
  t.frame(50000); // Abandoned round must not finish after returning to menu.
  assert.equal(t.elem('overlay').hidden, false);
  let saved = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(saved.players.length, 1);
  assert.equal(saved.players[0].records.arcade.beer.rounds, 0);

  t.elem('playButton').emit('click');
  assert.equal(t.elem('mainMenuButton').hidden, false);
  assert.equal(t.elem('shots').textContent, 0);
  for (let i = 0; i < 350; i++) t.frame(100);
  assert.equal(t.elem('overlay').hidden, false, 'finished round displays results');
  assert.equal(t.elem('mainMenuButton').hidden, true);
  assert.equal(t.elem('resultsMenuButton').hidden, false);
  assert.match(t.elem('playButton').innerHTML, /PLAY AGAIN/);

  t.elem('resultsMenuButton').emit('click');
  assert.match(t.elem('overlayTitle').innerHTML, /THIRTY SECONDS/);
  assert.equal(t.elem('resultsMenuButton').hidden, true);
  assert.match(t.elem('playButton').innerHTML, /START GAME/);
  t.elem('switchPlayerButton').emit('click');
  assert.equal(t.elem('playerDialog').open, true);
  t.elem('playerNameInput').value = 'Second Skater';
  t.submit('playerForm');
  saved = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(saved.players.length, 2);
  assert.equal(saved.players[0].name, 'First Skater');
  assert.equal(saved.players[0].records.arcade.beer.rounds, 1);
  assert.equal(saved.players[1].name, 'Second Skater');
  assert.equal(saved.players[1].records.arcade.beer.best, 0);
  assert.equal(t.storage.has('frostline-dev:frostline-player-profiles-v1'), false, 'DEV player storage untouched');
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
  const saved = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
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
  const after = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(after.players[0].records.arcade.pond.rounds, 1);
  assert.equal(after.players[0].records.arcade.beer.rounds, 0);
  assert.equal(after.players[0].records.arcade.pond.shots, 1);
  const results = after.players[0].records.arcade.pond;
  assert.equal(results.shots, results.goals + results.saves + results.misses);
});

test('legacy high scores migrate once, each player stays independent', () => {
  const seed = {
    'frostline-shootout-high-score-v1': '7',
    'frostline-shootout-high-score-beer-v1': '5',
    'frostline-shootout-personal-team-v1': JSON.stringify({
      name: 'Old Heroes', primary: '#113388', secondary: '#cc2222', trim: '#ffffff'
    })
  };
  const t = boot(seed);
  t.frame(16);
  t.elem('playerNameInput').value = 'Original';
  t.submit('playerForm');
  let data = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
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
  data = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
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

test('Stable Logo Lab previews all three F styles, cancel restores, and saving persists per player', () => {
  const t = boot();
  t.frame(16);
  t.elem('playerNameInput').value = 'Logo Tester';
  t.submit('playerForm');
  t.elem('cancelTeam').emit('click');

  t.elem('logoLabButton').emit('click');
  assert.equal(t.elem('logoLabDialog').open, true);
  t.logoChoices[1].emit('click');
  assert.equal(t.elem('brandLogoUse').getAttribute('href'), '#frostline-speed');
  assert.equal(t.elem('logoPreviewUse').getAttribute('href'), '#frostline-speed');
  t.elem('cancelLogoLab').emit('click');
  assert.equal(t.elem('brandLogoUse').getAttribute('href'), '#frostline-ice');

  t.elem('brandLogoButton').emit('click');
  t.logoChoices[2].emit('click');
  assert.equal(t.elem('logoPreviewName').textContent, 'C · ICE CUT');
  t.elem('saveLogoLab').emit('click');
  assert.equal(t.elem('logoLabDialog').open, false);
  let saved = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(saved.players[0].logoVariant, 'ice');

  const again = boot(Object.fromEntries(t.storage));
  assert.equal(again.elem('brandLogoUse').getAttribute('href'), '#frostline-ice');
  again.elem('switchPlayerButton').emit('click');
  again.elem('playerNameInput').value = 'Second Player';
  again.submit('playerForm');
  again.elem('cancelTeam').emit('click');
  assert.equal(again.elem('brandLogoUse').getAttribute('href'), '#frostline-ice');
  again.elem('switchPlayerButton').emit('click');
  again.elem('existingPlayers').children[0].emit('click');
  assert.equal(again.elem('brandLogoUse').getAttribute('href'), '#frostline-ice');
  saved = JSON.parse(again.storage.get('frostline-player-profiles-v1'));
  assert.equal(saved.players.length, 2);
  assert.equal(saved.players[0].logoVariant, 'ice');
  assert.equal(saved.players[1].logoVariant, 'ice');
});

test('Stable custom team shields preview, save and persist separately for each player', () => {
  const t = boot();
  t.frame(16);
  t.elem('playerNameInput').value = 'Crest Tester';
  t.submit('playerForm');
  assert.equal(t.elem('teamDialog').open, true);
  assert.equal(t.crestChoices.length, 6);
  t.crestChoices[1].emit('click');
  assert.equal(t.crestChoices[1].getAttribute('aria-pressed'), 'true');
  assert.equal(t.elem('previewTeamCrest').children.length, 1);
  t.elem('teamNameInput').value = 'Forest Wolves';
  t.elem('teamPrimary').value = '#225533';
  t.elem('teamSecondary').value = '#ddee22';
  t.submit('teamForm');
  assert.equal(t.elem('teamDialog').open, false);

  let saved = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(saved.players[0].team.crest, 'wolf');
  assert.equal(saved.players[0].team.name, 'Forest Wolves');
  assert.equal(saved.players[0].team.primary, '#225533');
  assert.equal(saved.players[0].team.secondary, '#ddee22');
  assert.equal(t.elem('headerTeamCrest').children.length, 1);

  // Cancel must restore the last saved crest, not accidentally persist a draft.
  t.elem('customizeButton').emit('click');
  t.crestChoices[2].emit('click');
  assert.equal(t.crestChoices[2].getAttribute('aria-pressed'), 'true');
  t.elem('cancelTeam').emit('click');
  saved = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(saved.players[0].team.crest, 'wolf');
  t.elem('customizeButton').emit('click');
  assert.equal(t.crestChoices[1].getAttribute('aria-pressed'), 'true');
  t.elem('cancelTeam').emit('click');

  t.elem('switchPlayerButton').emit('click');
  t.elem('playerNameInput').value = 'Second Team';
  t.submit('playerForm');
  t.elem('cancelTeam').emit('click');
  t.elem('customizeButton').emit('click');
  t.crestChoices[3].emit('click');
  t.submit('teamForm');
  saved = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(saved.players[1].team.crest, 'sticks');
  assert.equal(saved.players[0].team.crest, 'wolf');

  const reloaded = boot(Object.fromEntries(t.storage));
  reloaded.elem('switchPlayerButton').emit('click');
  reloaded.elem('existingPlayers').children[0].emit('click');
  reloaded.elem('customizeButton').emit('click');
  assert.equal(reloaded.crestChoices[1].getAttribute('aria-pressed'), 'true');
  assert.equal(reloaded.elem('previewTeamCrest').children.length, 1);
  reloaded.elem('cancelTeam').emit('click');

  // Original gameplay remains playable with a custom shield on the rink.
  reloaded.elem('playButton').emit('click');
  const rink = reloaded.elem('rink');
  rink.emit('pointerdown', { pointerId: 35, clientX: 210, clientY: 563 });
  rink.emit('pointermove', { pointerId: 35, clientX: 174, clientY: 653 });
  rink.emit('pointerup', { pointerId: 35, clientX: 174, clientY: 653 });
  assert.equal(reloaded.elem('shots').textContent, 1);
  assert.ok(reloaded.storage.has('frostline-player-profiles-v1'), 'Stable saved profile must persist');
  assert.ok(!reloaded.storage.has('frostline-dev:frostline-player-profiles-v1'), 'Stable must not write to DEV profile storage');
});

test('Stable data normalizes unknown old shield identifiers safely', () => {
  const seed = {
    'frostline-player-profiles-v1': JSON.stringify({
      activeId: 'known',
      legacyClaimed:true,
      players:[{id:'known',name:'Legacy Tester',team:{
        name:'Heritage',primary:'#0038a8',secondary:'#ce1126',trim:'#ffffff',crest:'unknown-symbol'
      },difficulty:'beer',records:{arcade:{}}}]
    })
  };
  const t = boot(seed);
  t.elem('customizeButton').emit('click');
  assert.equal(t.crestChoices[0].getAttribute('aria-pressed'), 'true');
});

test('Stable center ice curves city and nickname around the approved team crest', () => {
  assert.match(gameCode, /function drawCenterIceBrand\(team\)/);
  assert.match(gameCode, /function drawCenterIceArc\(text, radius, side\)/);
  assert.equal(gameCode.includes('ctx.fillText(game.team.name.toUpperCase(), 0, 39, 170)'), false,
    'old one-line name must not crowd the logo');
  const inspectClub=id=>{
    const letters=[],rotations=[];
    const t=boot({}, {onDrawText:text=>letters.push(text),
      onCanvasRotate:angle=>rotations.push(angle)});
    t.frame(16);
    t.elem('playerNameInput').value='Center Ice Checker';
    t.submit('playerForm');
    t.cityChoices.find(c=>c.dataset.cityClub===id).emit('click');
    t.submit('teamForm');
    letters.length=0;rotations.length=0;
    t.frame(16);
    assert.ok(rotations.filter(a=>Math.abs(a)>.02).length>=6, id+': text follows both arcs');
    return letters.join('');
  };
  assert.match(inspectClub('vancouver'), /VANCOUVERCLOCK CHAIN/,
    'Vancouver and Clock Chain appear separately');
  assert.match(inspectClub('detroit'), /DETROITMOTOR CITYOCTOPUS/,
    'long traditions wrap without compressing the crest');
  assert.match(inspectClub('tampa'), /TAMPA BAYCOIL/,
    'multi-word locations retain their city identity');
  const country=boot({}, {onDrawText:()=>{}});
  country.frame(16);
  country.elem('playerNameInput').value='Flag Checker';
  country.submit('playerForm');
  country.nationChoices.find(c=>c.dataset.nationalTeam==='sweden').emit('click');
  country.submit('teamForm');
  const stored=JSON.parse(country.storage.get('frostline-player-profiles-v1'));
  assert.equal(stored.players[0].team.crest,'natSweden','approved national crest data preserved');
  assert.equal(country.storage.has('frostline-dev:frostline-player-profiles-v1'),false,
    'Stable stores records in its original namespace');
});

test('Stable center-ice crest is wider, centered and clear of circular lettering', () => {
  const transforms=[];
  const t=boot({}, {usePath2D:true,
    onCanvasTranslate:(x,y)=>transforms.push({type:'translate',x,y}),
    onCanvasScale:(x,y)=>transforms.push({type:'scale',x,y})});
  t.frame(16);
  const crestScale=transforms.find(o=>o.type==='scale'&&
    Math.abs(o.x-.78)<1e-6&&Math.abs(o.y-.675)<1e-6);
  assert.ok(crestScale, 'approved .78 wide, .675 high crest scale present');
  const offset=transforms.find(o=>o.type==='translate'&&
    Math.abs(o.x+39)<.001&&Math.abs(o.y+54.4875)<.001);
  assert.ok(offset,'crest translate uses correct center');
  const cx=210+offset.x+50*crestScale.x;
  const cy=429+offset.y+58.5*crestScale.y;
  assert.ok(Math.abs(cx-210)<.01&&Math.abs(cy-414)<.01,'center aligns with faceoff spot');
  assert.ok(cx+(12-50)*crestScale.x>177&&cx+(88-50)*crestScale.x<243,
    'shield stays inside the text arcs horizontally');
  assert.ok(cy+(4-58.5)*crestScale.y>374&&cy+(113-58.5)*crestScale.y<454,
    'shield stays between upper and lower lettering');
});

test('Stable team cards show each location once with full team data untouched', () => {
  const expected = [
    ["boston","BOSTON","BANNER"],
    ["buffalo","BUFFALO","BLADE GANG"],
    ["detroit","DETROIT","MOTOR CITY OCTOPUS"],
    ["florida","FLORIDA","BLUE RAT"],
    ["montreal","MONTREAL","OLÉ"],
    ["ottawa","OTTAWA","LEGION"],
    ["tampa","TAMPA BAY","COIL"],
    ["toronto","TORONTO","GRIND"],
    ["carolina","CAROLINA","WARNING"],
    ["columbus","COLUMBUS","CANNONFIRE"],
    ["newjersey","NEW JERSEY","NEWARK IRONBOUND"],
    ["islanders","LONG ISLAND","ISLAND YES WAVE"],
    ["newyork","NEW YORK","EMPIRE SALUTE"],
    ["philadelphia","PHILADELPHIA","BELLLINE"],
    ["pittsburgh","PITTSBURGH","GEAR"],
    ["washington","WASHINGTON","FURY"],
    ["chicago","CHICAGO","CURVE"],
    ["colorado","COLORADO","ANTHEM"],
    ["dallas","DALLAS","BRIMLINE"],
    ["minnesota","MINNESOTA","NORTHWOODS"],
    ["nashville","NASHVILLE","RIFF"],
    ["stlouis","ST. LOUIS","TOWEL WAVE"],
    ["utah","UTAH","TUSKS UP"],
    ["winnipeg","WINNIPEG","TRUE NORTH"],
    ["anaheim","ANAHEIM","RALLY FLIGHT"],
    ["calgary","CALGARY","PRAIRIE FIRE"],
    ["edmonton","EDMONTON","OIL COUNTRY"],
    ["losangeles","LOS ANGELES","ROYAL ARMY"],
    ["sanjose","SAN JOSE","CHOMP"],
    ["seattle","SEATTLE","RAINLINE"],
    ["vancouver","VANCOUVER","CLOCK CHAIN"],
    ["vegas","LAS VEGAS","FLAMINGO TOSS"],
  ];
  const entries = [...html.matchAll(/data-city-club="([^"]+)"[^>]*>[\s\S]*?<span class="city-club-detail"><small>([^<]+)<\/small><strong>([^<]+)<\/strong>/g)]
    .map(match => [match[1], match[2], match[3]]);
  assert.deepEqual(entries, expected, 'all 32 club cards use a consistent location + nickname display');


  assert.match(css, /\.city-club-detail strong\{[^}]*overflow-wrap:normal;word-break:normal;hyphens:none/,
    'whole city names remain unbroken');
  assert.match(css, /\.national-team-detail strong\{[^}]*overflow-wrap:normal;word-break:normal;hyphens:none/,
    'national team names remain unbroken');
  assert.equal(html.includes('<small>NY ISLANDERS</small>'), false,
    'Long Island display location is retained');
  for (const [club, originalName] of [
    ['pittsburgh', 'Pittsburgh Gear'],
    ['washington', 'Washington Fury'],
    ['philadelphia', 'Philly Bellline'],
    ['vegas', 'Vegas Flamingo Toss'],
    ['islanders', 'Island Yes Wave']
  ]) {
    const t = boot();
    t.frame(16);
    t.elem('playerNameInput').value = 'Original Name Keeper';
    t.submit('playerForm');
    t.cityChoices.find(choice => choice.dataset.cityClub === club).emit('click');
    assert.equal(t.elem('teamNameInput').value, originalName,
      club + ': display-only edit must not rename the team in the editor');
    t.submit('teamForm');
    const storage = JSON.parse(t.storage.get('frostline-player-profiles-v1'));
    assert.equal(storage.players[0].team.name, originalName,
      club + ': saved team name remains the original');
  }
});

test('Stable thirty-two division-grouped city clubs load original crests with intended color palettes and save team', () => {
  assert.equal((html.match(/data-city-club="/g) || []).length, 32);
  assert.match(html, /<details class="city-club-gallery" id="cityClubGallery">/);
  assert.match(html, /<summary class="city-club-toggle">/);
  assert.match(css, /city-club-gallery:not\(\[open\]\)/);
  assert.equal((html.match(/class="city-club-conference"/g) || []).length, 2);
  assert.equal((html.match(/class="city-club-division"/g) || []).length, 4);
  const expectedDivisions = {"atlantic":["boston","buffalo","detroit","florida","montreal","ottawa","tampa","toronto"],"metropolitan":["carolina","columbus","newjersey","islanders","newyork","philadelphia","pittsburgh","washington"],"central":["chicago","colorado","dallas","minnesota","nashville","stlouis","utah","winnipeg"],"pacific":["anaheim","calgary","edmonton","losangeles","sanjose","seattle","vancouver","vegas"]};
  for (const [division, ids] of Object.entries(expectedDivisions)) {
    const section = html.match(new RegExp('<section class="city-club-division" data-division="' + division + '"[\\s\\S]*?<\\/section>'));
    assert.ok(section, 'division section ' + division + ' exists');
    assert.deepEqual([...section[0].matchAll(/data-city-club="([^"]+)"/g)].map(hit => hit[1]), ids, division + ' contains the correct eight clubs in order');
  }
  const t = boot();
  t.frame(16);
  t.elem('playerNameInput').value = 'City Captain';
  t.submit('playerForm');
  assert.equal(t.elem('cityClubGallery').open, false, 'team setup should start with city clubs collapsed');
  const options = [
    { name: 'Boston Banner', crest: 'bosBanner', club: 'boston', primary:'#101010', secondary:'#ffb81c' },
    { name: 'Buffalo Blade Gang', crest: 'bufBladeGang', club: 'buffalo', primary:'#003087', secondary:'#ffb81c' },
    { name: 'Motor City Octopus', crest: 'detOctopus', club: 'detroit', primary:'#ce1126', secondary:'#ffffff' },
    { name: 'Florida Blue Rat', crest: 'flaRat', club: 'florida', primary:'#c8102e', secondary:'#041e42' },
    { name: 'Montreal Olé', crest: 'monChant', club: 'montreal', primary:'#af1e2d', secondary:'#192168' },
    { name: 'Ottawa Legion', crest: 'ottLegion', club: 'ottawa', primary:'#151515', secondary:'#c52032' },
    { name: 'Tampa Coil', crest: 'tamCoil', club: 'tampa', primary:'#002868', secondary:'#101820' },
    { name: 'Toronto Grind', crest: 'torGrind', club: 'toronto', primary:'#00205b', secondary:'#ffffff' },
    { name: 'Carolina Warning', crest: 'carSiren', club: 'carolina', primary:'#cc0000', secondary:'#111111' },
    { name: 'Columbus Cannonfire', crest: 'colCannon', club: 'columbus', primary:'#002654', secondary:'#ce1126' },
    { name: 'Newark Ironbound', crest: 'newIron', club: 'newjersey', primary:'#ce1126', secondary:'#151515' },
    { name: 'Island Yes Wave', crest: 'islYesWave', club: 'islanders', primary:'#00539b', secondary:'#f47d30' },
    { name: 'Empire Salute', crest: 'nySalute', club: 'newyork', primary:'#0038a8', secondary:'#ce1126' },
    { name: 'Philly Bellline', crest: 'phiBell', club: 'philadelphia', primary:'#f74902', secondary:'#000000' },
    { name: 'Pittsburgh Gear', crest: 'pitGear', club: 'pittsburgh', primary:'#111111', secondary:'#fcb514' },
    { name: 'Washington Fury', crest: 'wasFury', club: 'washington', primary:'#c8102e', secondary:'#041e42' },
    { name: 'Chicago Curve', crest: 'chiCurve', club: 'chicago', primary:'#121318', secondary:'#cf0a2c' },
    { name: 'Colorado Anthem', crest: 'colAnthem', club: 'colorado', primary:'#6f263d', secondary:'#236192' },
    { name: 'Dallas Brimline', crest: 'dalHat', club: 'dallas', primary:'#006847', secondary:'#111111' },
    { name: 'Minnesota Northwoods', crest: 'minNorth', club: 'minnesota', primary:'#154734', secondary:'#a6192e' },
    { name: 'Nashville Riff', crest: 'nasRiff', club: 'nashville', primary:'#ffb81c', secondary:'#041e42' },
    { name: 'St. Louis Towel Wave', crest: 'stlTowel', club: 'stlouis', primary:'#002f87', secondary:'#fcb514' },
    { name: 'Utah Tusks Up', crest: 'utaTusks', club: 'utah', primary:'#15171a', secondary:'#79cfe8' },
    { name: 'Winnipeg True North', crest: 'winNorth', club: 'winnipeg', primary:'#041e42', secondary:'#5b92c7' },
    { name: 'Anaheim Rally Flight', crest: 'anaFlight', club: 'anaheim', primary:'#111111', secondary:'#f47a38' },
    { name: 'Prairie Fire', crest: 'calFire', club: 'calgary', primary:'#c8102e', secondary:'#f1be48' },
    { name: 'Edmonton Oil Country', crest: 'edmOil', club: 'edmonton', primary:'#041e42', secondary:'#ff4c00' },
    { name: 'Los Angeles Royal Army', crest: 'laRoyal', club: 'losangeles', primary:'#111111', secondary:'#a7a9ac' },
    { name: 'San Jose Chomp', crest: 'sjChomp', club: 'sanjose', primary:'#006d75', secondary:'#ea7200' },
    { name: 'Seattle Rainline', crest: 'seaRain', club: 'seattle', primary:'#001628', secondary:'#99d9d9' },
    { name: 'Vancouver Clock Chain', crest: 'vanClock', club: 'vancouver', primary:'#00205b', secondary:'#00843d' },
    { name: 'Vegas Flamingo Toss', crest: 'vegFlamingo', club: 'vegas', primary:'#333f42', secondary:'#d4af37' }
  ];
  for (let i=0;i<options.length;i++) {
    t.cityChoices[i].emit('click');
    const expected=options[i];
    assert.equal(t.elem('teamNameInput').value, expected.name);
    assert.equal(t.elem('teamPrimary').value, expected.primary);
    assert.equal(t.elem('teamSecondary').value, expected.secondary);
    assert.equal(t.elem('previewTeamCrest').children.length, 1);
    assert.equal(t.cityChoices[i].getAttribute('aria-pressed'), 'true');
    assert.equal(t.elem('cityClubSummary').textContent, 'Selected: ' + expected.name);
    assert.equal(t.cityChoices[i].querySelector('.city-club-icon').children.length, 1);
    // The SVG contains one or more original icon path elements beyond the shield.
    assert.ok(t.elem('previewTeamCrest').children[0].children.length > 4);
    t.submit('teamForm');
    const saved=JSON.parse(t.storage.get('frostline-player-profiles-v1')).players[0].team;
    for (const key of ['name','crest','club','primary','secondary']) assert.equal(saved[key], expected[key]);
    assert.equal(t.elem('headerTeamCrest').children.length, 1);
    // Reopening the team editor should always return to the compact state.
    t.elem('cityClubGallery').open = true;
    t.elem('customizeButton').emit('click');
    assert.equal(t.elem('cityClubGallery').open, false);
    assert.equal(t.elem('cityClubSummary').textContent, 'Selected: ' + expected.name);
  }

  // Editing a city palette produces a custom derivative without losing its mark.
  t.elem('teamNameInput').value = 'My Flamingo';
  t.elem('teamNameInput').emit('input');
  assert.equal(t.elem('cityClubSummary').textContent, 'Browse 32 original city teams');
  t.submit('teamForm');
  let saved=JSON.parse(t.storage.get('frostline-player-profiles-v1')).players[0].team;
  assert.equal(saved.club, null);
  assert.equal(saved.crest, 'vegFlamingo');
  assert.equal(saved.name, 'My Flamingo');

  const again=boot(Object.fromEntries(t.storage));
  again.elem('customizeButton').emit('click');
  assert.equal(again.elem('previewTeamCrest').children.length, 1);
  again.elem('cancelTeam').emit('click');
  assert.ok(again.storage.has('frostline-player-profiles-v1'));
  assert.ok(!again.storage.has('frostline-dev:frostline-player-profiles-v1'));
});



test('Stable national teams show eight actual flags, save country identity, draw shields, and permit custom derivatives', () => {
  assert.equal((html.match(/data-city-club="/g) || []).length, 32, 'city collection stays intact');
  assert.equal((html.match(/data-national-team="/g) || []).length, 8);
  assert.match(html, /id="nationalTeamGallery"/);
  assert.match(html, /MAKE IT YOURS · CUSTOM TEAM/);
  for (const code of ['US','CA','SE','FI','CZ','SK','DE','CH']) {
    assert.ok(html.includes('<span class="national-team-flag" aria-hidden="true">' + code + '</span>'), 'country code ' + code);
  }
  // Only the original, correct flag geometry should be used in SVG and on ice.
  assert.match(gameCode, /const NATIONAL_FLAG_VECTORS =/);
  assert.match(gameCode, /ctx\.clip\(inner\)/);
  assert.match(gameCode, /create\('clipPath'/);
  assert.match(gameCode, /Array\.from\(\{length:9\}/);
  assert.match(gameCode, /length:row%2\?5:6/);
  assert.match(gameCode, /M233 370\.8/, 'real Slovak arms geometry is included');
  assert.match(gameCode, /M-19\.7 0h169\.8v480/, 'full Canadian maple leaf and red bars are included');
  const countries = [
    { id:'usa', name:'USA', crest:'natUSA', primary:'#002868', secondary:'#bf0a30' },
    { id:'canada', name:'Canada', crest:'natCanada', primary:'#d80621', secondary:'#ffffff' },
    { id:'sweden', name:'Sweden', crest:'natSweden', primary:'#006aa7', secondary:'#fecc00' },
    { id:'finland', name:'Finland', crest:'natFinland', primary:'#ffffff', secondary:'#002f6c' },
    { id:'czechia', name:'Czechia', crest:'natCzechia', primary:'#ffffff', secondary:'#d7141a' },
    { id:'slovakia', name:'Slovakia', crest:'natSlovakia', primary:'#ffffff', secondary:'#0b4ea2' },
    { id:'germany', name:'Germany', crest:'natGermany', primary:'#111111', secondary:'#dd0000' },
    { id:'switzerland', name:'Switzerland', crest:'natSwitzerland', primary:'#da291c', secondary:'#ffffff' }
  ];
  const t = boot();
  t.frame(16);
  t.elem('playerNameInput').value = 'International Captain';
  t.submit('playerForm');
  assert.equal(t.elem('nationalTeamGallery').open, false);
  assert.equal(t.nationChoices.length, 8);
  for (const country of countries) {
    t.nationChoices.find(button=>button.dataset.nationalTeam===country.id).emit('click');
    assert.equal(t.elem('teamNameInput').value, country.name);
    assert.equal(t.elem('teamPrimary').value, country.primary);
    assert.equal(t.elem('teamSecondary').value, country.secondary);
    assert.equal(t.elem('nationalTeamSummary').textContent, 'Selected: ' + country.name);
    assert.equal(t.elem('cityClubSummary').textContent, 'Browse 32 original city teams');
    const choice=t.nationChoices.find(button=>button.dataset.nationalTeam===country.id);
    assert.equal(choice.getAttribute('aria-pressed'), 'true');
    assert.equal(choice.querySelector('.national-team-icon').children.length, 1);
    assert.equal(t.elem('previewTeamCrest').children.length, 1);
    assert.ok(t.elem('previewTeamCrest').children[0].children.length > 4, 'flag geometry on shield');
    t.submit('teamForm');
    const saved=JSON.parse(t.storage.get('frostline-player-profiles-v1')).players[0].team;
    assert.equal(saved.nation, country.id);
    assert.equal(saved.club, null);
    assert.equal(saved.crest, country.crest);
    assert.equal(saved.name, country.name);
    assert.equal(saved.primary, country.primary);
    assert.equal(t.elem('headerTeamCrest').children.length,1);
    t.elem('nationalTeamGallery').open=true;
    t.elem('customizeButton').emit('click');
    assert.equal(t.elem('nationalTeamGallery').open,false,'reopening starts collapsed');
    assert.equal(t.elem('nationalTeamSummary').textContent,'Selected: ' + country.name);
  }
  // Starting with Switzerland, customize a country palette/name while
  // retaining its flag-derived crest as a player-owned team.
  t.elem('teamNameInput').value='My Alpine Crew';
  t.elem('teamNameInput').emit('input');
  assert.equal(t.elem('nationalTeamSummary').textContent,'Browse 8 national teams');
  t.submit('teamForm');
  let saved=JSON.parse(t.storage.get('frostline-player-profiles-v1')).players[0].team;
  assert.equal(saved.nation,null);
  assert.equal(saved.crest,'natSwitzerland');
  assert.equal(saved.name,'My Alpine Crew');
  const again=boot(Object.fromEntries(t.storage));
  again.elem('customizeButton').emit('click');
  assert.equal(again.elem('teamNameInput').value,'My Alpine Crew');
  assert.equal(again.elem('previewTeamCrest').children.length,1);
  again.elem('cancelTeam').emit('click');
  // Selecting a city instead clears the national identity, not the records.
  again.elem('customizeButton').emit('click');
  again.cityChoices.find(button=>button.dataset.cityClub==='newyork').emit('click');
  again.submit('teamForm');
  saved=JSON.parse(again.storage.get('frostline-player-profiles-v1')).players[0].team;
  assert.equal(saved.nation,null);
  assert.equal(saved.club,'newyork');
  assert.equal(saved.crest,'nySalute');
  assert.ok(again.storage.has('frostline-player-profiles-v1'),'Stable stores its own profiles');
  assert.ok(!again.storage.has('frostline-dev:frostline-player-profiles-v1'),'Stable never changes DEV');
});

test('Stable normalizes removed/unknown national identifiers without breaking old profiles',()=>{
  const t=boot({'frostline-player-profiles-v1':JSON.stringify({
    players:[{id:'older',name:'Older Fan',team:{name:'Legacy',primary:'#0038a8',secondary:'#ce1126',trim:'#ffffff',crest:'natFinland',nation:'unknown-nation'},difficulty:'beer',records:{}}],
    activeId:'older',legacyClaimed:true
  })});
  t.elem('customizeButton').emit('click');
  assert.equal(t.elem('nationalTeamSummary').textContent,'Browse 8 national teams');
  assert.equal(t.elem('previewTeamCrest').children.length,1);
});


test('national SVG vector detail is preserved in generated previews and saved teams', () => {
  const t=boot();
  t.frame(16);
  t.elem('playerNameInput').value='Flag Inspector';
  t.submit('playerForm');
  const expected={
    usa:53, canada:2, sweden:2, finland:3,
    czechia:3, slovakia:7, germany:3, switzerland:3
  };
  for(const [id,layers] of Object.entries(expected)){
    t.nationChoices.find(b=>b.dataset.nationalTeam===id).emit('click');
    const svg=t.elem('previewTeamCrest').children[0];
    assert.equal(svg.children.length,5,id+': SVG has shield, clip and flag');
    const flagGroup=svg.children[3].children[0];
    assert.equal(flagGroup.children.length,layers,id+': authoritative vector layers');
    assert.equal(svg.children[2].children[0].getAttribute('id').startsWith('frostline-national-clip-'),true);
    const cardSvg=t.nationChoices.find(b=>b.dataset.nationalTeam===id).querySelector('.national-team-icon').children[0];
    assert.equal(cardSvg.children.length,5,id+': picker also uses accurate flag');
  }
  const usa=t.nationChoices.find(b=>b.dataset.nationalTeam==='usa');
  usa.emit('click');
  const flagsSvg=t.elem('previewTeamCrest').children[0];
  assert.equal(flagsSvg.children[3].children[0].children.length,53,'USA must have 50 actual star paths plus 3 flag layers');
});

test('Stable 2.10 preserves V1.7.1 records and Ice Cut branding while adding accurate national shields',()=>{
  const records={arcade:{show:{best:12,rounds:7,goals:53,shots:90,saves:21,misses:16}}};
  const old={
    activeId:'legacy',legacyClaimed:true,players:[{
      id:'legacy',name:'Veteran Fan',team:{name:'Veteran Club',primary:'#113377',secondary:'#c52244',trim:'#ffffff'},
      difficulty:'show',records
    }]
  };
  const devSaved='{"activeId":"preview","players":[{"id":"preview","name":"Dev Player"}]}';
  const t=boot({
    'frostline-player-profiles-v1':JSON.stringify(old),
    'frostline-shootout-difficulty-v1':'show',
    'frostline-dev:frostline-player-profiles-v1':devSaved
  });
  assert.equal(t.elem('playerDialog').open,false);
  assert.equal(t.elem('menuPlayerName').textContent,'VETERAN FAN');
  assert.equal(t.elem('teamNameDisplay').textContent,'VETERAN CLUB');
  assert.equal(t.elem('best').textContent,12);
  assert.equal(t.elem('brandLogoUse').getAttribute('href'),'#frostline-ice');
  t.elem('customizeButton').emit('click');
  t.nationChoices.find(button=>button.dataset.nationalTeam==='canada').emit('click');
  t.submit('teamForm');
  let profile=JSON.parse(t.storage.get('frostline-player-profiles-v1')).players[0];
  assert.equal(profile.team.nation,'canada');
  assert.equal(profile.team.crest,'natCanada');
  assert.deepEqual(profile.records,records);
  assert.equal(profile.logoVariant,'ice');
  assert.equal(t.storage.get('frostline-dev:frostline-player-profiles-v1'),devSaved);
  const restarted=boot(Object.fromEntries(t.storage));
  assert.equal(restarted.elem('teamNameDisplay').textContent,'CANADA');
  assert.equal(restarted.elem('brandLogoUse').getAttribute('href'),'#frostline-ice');
  assert.equal(restarted.elem('best').textContent,12);
});

test('the original V2.8 Power Play default migrates to Ice Cut only once',()=>{
  const old={
    activeId:'v2',legacyClaimed:true,players:[
      {id:'v2',name:'Old Default',logoVariant:'power',team:{name:'Hockey Team'},difficulty:'beer',records:{}},
      {id:'speed',name:'Speed Fan',logoVariant:'speed',team:{name:'Fast Team'},difficulty:'beer',records:{}}
    ]
  };
  const t=boot({'frostline-player-profiles-v1':JSON.stringify(old)});
  let db=JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(db.players[0].logoVariant,'ice');
  assert.equal(db.players[1].logoVariant,'speed');
  assert.equal(t.storage.get('frostline-icecut-official-logo-v1'),'1');
  t.elem('logoLabButton').emit('click');
  t.logoChoices[0].emit('click');
  t.elem('saveLogoLab').emit('click');
  db=JSON.parse(t.storage.get('frostline-player-profiles-v1'));
  assert.equal(db.players[0].logoVariant,'power');
  const again=boot(Object.fromEntries(t.storage));
  assert.equal(again.elem('brandLogoUse').getAttribute('href'),'#frostline-power','explicitly chosen Power Play remains valid');
});
