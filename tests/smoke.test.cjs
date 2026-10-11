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
  const logoChoices = ['power', 'speed', 'ice'].map(id => Object.assign(new MockNode(id), { dataset: { fLogo: id } }));
  const crestChoices = ['monogram', 'wolf', 'bolt', 'sticks', 'star', 'mountain'].map(id => Object.assign(new MockNode(id), { dataset: { teamCrest: id } }));
  const cityChoices = ['newyork', 'detroit', 'chicago', 'calgary', 'boston', 'toronto', 'montreal', 'pittsburgh', 'philadelphia', 'minnesota', 'nashville', 'seattle', 'carolina', 'florida', 'tampa', 'dallas', 'buffalo', 'ottawa', 'columbus', 'newjersey', 'islanders', 'washington', 'colorado', 'stlouis'].map(id => Object.assign(new MockNode(id), { dataset: { cityClub: id } }));
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
  return { elem, leagues, presets, logoChoices, crestChoices, cityChoices, storage, localStorage, frame, submit, errors, raf };
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

test('DEV Logo Lab previews all three F styles, cancel restores, and saving persists per player', () => {
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
  assert.equal(t.elem('brandLogoUse').getAttribute('href'), '#frostline-power');

  t.elem('brandLogoButton').emit('click');
  t.logoChoices[2].emit('click');
  assert.equal(t.elem('logoPreviewName').textContent, 'C · ICE CUT');
  t.elem('saveLogoLab').emit('click');
  assert.equal(t.elem('logoLabDialog').open, false);
  let saved = JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1'));
  assert.equal(saved.players[0].logoVariant, 'ice');

  const again = boot(Object.fromEntries(t.storage));
  assert.equal(again.elem('brandLogoUse').getAttribute('href'), '#frostline-ice');
  again.elem('switchPlayerButton').emit('click');
  again.elem('playerNameInput').value = 'Second Player';
  again.submit('playerForm');
  again.elem('cancelTeam').emit('click');
  assert.equal(again.elem('brandLogoUse').getAttribute('href'), '#frostline-power');
  again.elem('switchPlayerButton').emit('click');
  again.elem('existingPlayers').children[0].emit('click');
  assert.equal(again.elem('brandLogoUse').getAttribute('href'), '#frostline-ice');
  saved = JSON.parse(again.storage.get('frostline-dev:frostline-player-profiles-v1'));
  assert.equal(saved.players.length, 2);
  assert.equal(saved.players[0].logoVariant, 'ice');
  assert.equal(saved.players[1].logoVariant, 'power');
});

test('DEV custom team shields preview, save and persist separately for each player', () => {
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

  let saved = JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1'));
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
  saved = JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1'));
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
  saved = JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1'));
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
  assert.ok(!reloaded.storage.has('frostline-player-profiles-v1'), 'Stable data must remain separate');
});

test('DEV data normalizes unknown old shield identifiers safely', () => {
  const seed = {
    'frostline-dev:frostline-player-profiles-v1': JSON.stringify({
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

test('DEV twenty-four city clubs load original crests with intended color palettes and save team', () => {
  assert.equal((html.match(/data-city-club="/g) || []).length, 24);
  assert.match(html, /<details class="city-club-gallery" id="cityClubGallery">/);
  assert.match(html, /<summary class="city-club-toggle">/);
  assert.match(css, /city-club-gallery:not\(\[open\]\)/);
  const t = boot();
  t.frame(16);
  t.elem('playerNameInput').value = 'City Captain';
  t.submit('playerForm');
  assert.equal(t.elem('cityClubGallery').open, false, 'team setup should start with city clubs collapsed');
  const options = [
    { name: 'Empire Salute', crest: 'nySalute', club: 'newyork', primary:'#0038a8', secondary:'#ce1126' },
    { name: 'Motor City Octopus', crest: 'detOctopus', club: 'detroit', primary:'#ce1126', secondary:'#ffffff' },
    { name: 'Chicago Curve', crest: 'chiCurve', club: 'chicago', primary:'#121318', secondary:'#cf0a2c' },
    { name: 'Prairie Fire', crest: 'calFire', club: 'calgary', primary:'#c8102e', secondary:'#f1be48' },
    { name: 'Boston Banner', crest: 'bosBanner', club: 'boston', primary:'#101010', secondary:'#ffb81c' },
    { name: 'Toronto Grind', crest: 'torGrind', club: 'toronto', primary:'#00205b', secondary:'#ffffff' },
    { name: 'Montreal Olé', crest: 'monChant', club: 'montreal', primary:'#af1e2d', secondary:'#192168' },
    { name: 'Pittsburgh Gear', crest: 'pitGear', club: 'pittsburgh', primary:'#111111', secondary:'#fcb514' },
    { name: 'Philly Bellline', crest: 'phiBell', club: 'philadelphia', primary:'#f74902', secondary:'#000000' },
    { name: 'Minnesota Northwoods', crest: 'minNorth', club: 'minnesota', primary:'#154734', secondary:'#a6192e' },
    { name: 'Nashville Riff', crest: 'nasRiff', club: 'nashville', primary:'#ffb81c', secondary:'#041e42' },
    { name: 'Seattle Rainline', crest: 'seaRain', club: 'seattle', primary:'#001628', secondary:'#99d9d9' },
    { name: 'Carolina Warning', crest: 'carSiren', club: 'carolina', primary:'#cc0000', secondary:'#111111' },
    { name: 'Florida Blue Rat', crest: 'flaRat', club: 'florida', primary:'#c8102e', secondary:'#041e42' },
    { name: 'Tampa Coil', crest: 'tamCoil', club: 'tampa', primary:'#002868', secondary:'#101820' },
    { name: 'Dallas Brimline', crest: 'dalHat', club: 'dallas', primary:'#006847', secondary:'#111111' },
    { name: 'Buffalo Blade Gang', crest: 'bufBladeGang', club: 'buffalo', primary:'#003087', secondary:'#ffb81c' },
    { name: 'Ottawa Legion', crest: 'ottLegion', club: 'ottawa', primary:'#151515', secondary:'#c52032' },
    { name: 'Columbus Cannonfire', crest: 'colCannon', club: 'columbus', primary:'#002654', secondary:'#ce1126' },
    { name: 'Newark Ironbound', crest: 'newIron', club: 'newjersey', primary:'#ce1126', secondary:'#151515' },
    { name: 'Island Yes Wave', crest: 'islYesWave', club: 'islanders', primary:'#00539b', secondary:'#f47d30' },
    { name: 'Washington Fury', crest: 'wasFury', club: 'washington', primary:'#c8102e', secondary:'#041e42' },
    { name: 'Colorado Anthem', crest: 'colAnthem', club: 'colorado', primary:'#6f263d', secondary:'#236192' },
    { name: 'St. Louis Towel Wave', crest: 'stlTowel', club: 'stlouis', primary:'#002f87', secondary:'#fcb514' }
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
    const saved=JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1')).players[0].team;
    for (const key of ['name','crest','club','primary','secondary']) assert.equal(saved[key], expected[key]);
    assert.equal(t.elem('headerTeamCrest').children.length, 1);
    // Reopening the team editor should always return to the compact state.
    t.elem('cityClubGallery').open = true;
    t.elem('customizeButton').emit('click');
    assert.equal(t.elem('cityClubGallery').open, false);
    assert.equal(t.elem('cityClubSummary').textContent, 'Selected: ' + expected.name);
  }

  // Editing a city palette produces a custom derivative without losing its mark.
  t.elem('teamNameInput').value = 'My Rally';
  t.elem('teamNameInput').emit('input');
  assert.equal(t.elem('cityClubSummary').textContent, 'Browse 24 original city teams');
  t.submit('teamForm');
  let saved=JSON.parse(t.storage.get('frostline-dev:frostline-player-profiles-v1')).players[0].team;
  assert.equal(saved.club, null);
  assert.equal(saved.crest, 'stlTowel');
  assert.equal(saved.name, 'My Rally');

  const again=boot(Object.fromEntries(t.storage));
  again.elem('customizeButton').emit('click');
  assert.equal(again.elem('previewTeamCrest').children.length, 1);
  again.elem('cancelTeam').emit('click');
  assert.ok(!again.storage.has('frostline-player-profiles-v1'));
});
