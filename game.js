(() => {
  'use strict';

  // All gameplay and art are drawn on a 420 x 680 virtual rink.
  // CSS scales that rink for phones and desktops; pointer coordinates are scaled back.
  const W = 420;
  const H = 680;
  const ROUND_SECONDS = 30;
  const PUCK_START = { x: 210, y: 563 };
  const GOAL = { left: 120, right: 300, line: 172 };
  const GOALIE_LINE = 225;
  const LEGACY_HIGH_SCORE_KEY = 'frostline-shootout-high-score-v1';
  const MODE_KEY = 'frostline-shootout-difficulty-v1';
  // Each rink keeps the 30-second format. Only goalie skill changes.
  // Hard preserves the original goalie; the other levels are deliberately beatable.
  const DIFFICULTIES = {
    pond: {
      name: 'Pond Hockey', description: 'A casual goalie. More open net, slower reactions.',
      reactionStart: .55, reactionEnd: .40, repeatBoost: .015,
      patrolSpeed: 1.8, patrolWave: 26, patrolExtra: 9,
      biasStart: .06, biasGain: .08,
      chaseStart: 88, chaseGain: 92, saveStart: 19, saveGain: 4, drift: 21
    },
    beer: {
      name: 'Beer League', description: 'A competitive goalie. A fair challenge.',
      reactionStart: .37, reactionEnd: .18, repeatBoost: .03,
      patrolSpeed: 2.0, patrolWave: 35, patrolExtra: 13,
      biasStart: .16, biasGain: .14,
      chaseStart: 125, chaseGain: 150, saveStart: 24, saveGain: 6, drift: 9
    },
    show: {
      name: 'The Show', description: 'Pro-level goalie. Earn every goal.',
      reactionStart: .21, reactionEnd: .07, repeatBoost: .045,
      patrolSpeed: 2.25, patrolWave: 43, patrolExtra: 16,
      biasStart: .24, biasGain: .20,
      chaseStart: 165, chaseGain: 190, saveStart: 28, saveGain: 8, drift: 0
    }
  };
  function readDifficulty() {
    try {
      const stored = localStorage.getItem(MODE_KEY);
      return Object.hasOwn(DIFFICULTIES, stored) ? stored : 'beer';
    } catch { return 'beer'; }
  }
  const initialDifficulty = readDifficulty();
  const TEAM_KEY = 'frostline-shootout-personal-team-v1';
  // Original palette themes. Broadway Blues is inspired by New York hockey colors,
  // but all team names and artwork in this game are fictional.
  const TEAM_PRESETS = {
    broadway: { name: 'Broadway Blues', primary: '#0038a8', secondary: '#ce1126', trim: '#ffffff' },
    ice: { name: 'Icebreakers', primary: '#007e8a', secondary: '#ef7827', trim: '#ffffff' },
    aurora: { name: 'Aurora', primary: '#5c2590', secondary: '#41d4df', trim: '#ffffff' },
    black: { name: 'Black Ice', primary: '#202837', secondary: '#f4b942', trim: '#ffffff' }
  };
  const validHex = color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);
  function normalizeTeam(value) {
    const fallback = TEAM_PRESETS.broadway;
    return {
      name: typeof value?.name === 'string' ? (value.name.trim().slice(0, 24) || fallback.name) : fallback.name,
      primary: validHex(value?.primary) ? value.primary.toLowerCase() : fallback.primary,
      secondary: validHex(value?.secondary) ? value.secondary.toLowerCase() : fallback.secondary,
      trim: validHex(value?.trim) ? value.trim.toLowerCase() : fallback.trim
    };
  }
  function loadTeam() {
    try { return normalizeTeam(JSON.parse(localStorage.getItem(TEAM_KEY))); }
    catch { return normalizeTeam(null); }
  }
  function mixHex(first, second, factor) {
    const a = first.replace('#',''), b = second.replace('#','');
    const components = [0,2,4].map(i => Math.round(parseInt(a.slice(i,i+2),16)*(1-factor)+parseInt(b.slice(i,i+2),16)*factor));
    return '#' + components.map(n => n.toString(16).padStart(2,'0')).join('');
  }
  function initialsFor(name) {
    const words = name.toUpperCase().split(/\s+/).filter(Boolean);
    return words.length >= 2 ? words.slice(0,3).map(w=>w[0]).join('') : (words[0] || 'BB').slice(0,2);
  }


  const $ = (id) => document.getElementById(id);
  const canvas = $('rink');
  const ctx = canvas.getContext('2d');
  const overlay = $('overlay');
  const scoreEl = $('score');
  const timeEl = $('time');
  const shotsEl = $('shots');
  const savesEl = $('saves');
  const missesEl = $('misses');
  const percentageEl = $('percentage');
  const bestEl = $('best');
  const timeFill = $('timeFill');
  const toast = $('shotToast');
  const soundButton = $('soundButton');
  const soundOnIcon = $('soundOnIcon');
  const soundOffIcon = $('soundOffIcon');

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function readBest(difficulty) {
    try {
      const key = 'frostline-shootout-high-score-' + difficulty + '-v1';
      const saved = localStorage.getItem(key);
      // Old V1-V1.3 records were earned against what is now "The Show".
      const value = saved === null && difficulty === 'show'
        ? localStorage.getItem(LEGACY_HIGH_SCORE_KEY) : saved;
      return Math.max(0, Number(value) || 0);
    } catch { return 0; }
  }
  function saveBest(n) {
    try {
      localStorage.setItem('frostline-shootout-high-score-' + game.difficulty + '-v1', String(n));
    } catch { /* Private browsing may deny storage. Gameplay still works. */ }
  }

  const game = {
    mode: 'idle', remaining: ROUND_SECONDS, elapsed: 0, bestAtStart: 0,
    difficulty: initialDifficulty, team: loadTeam(),
    goals: 0, shots: 0, saves: 0, misses: 0, best: readBest(initialDifficulty),
    puck: { ...PUCK_START, moving: false, vx: 0, vy: 0, trail: [] },
    goalie: { x: 210, targetX: 210, lean: 0, flash: 0 },
    shot: null, cooldown: 0, toastTimer: 0, shake: 0,
    aiming: null, particles: [], previousTargets: [],
    audioEnabled: true, audioContext: null, lastTime: 0,
    statsRefresh: 0
  };

  // Original, procedural arena audio. No licensed clips or network requests.
  // Web Audio is unlocked by Start Game / pointer interaction on mobile Safari.
  const arenaAudio = { master: null, noise: null, windup: null, crowd: null, horn: null };
  // Real recorded crowd sound effects are decoded inside the unlocked Web Audio context.
  const crowdBuffers = { boo: null, cheer: null };
  let crowdLoadStarted = false;
  function preloadCrowd(ac) {
    if (crowdLoadStarted) return;
    crowdLoadStarted = true;
    const clips = { boo: 'assets/crowd-groan.wav', cheer: 'assets/crowd-cheer.mp3' };
    for (const [kind, url] of Object.entries(clips)) {
      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error('Crowd audio unavailable');
          return response.arrayBuffer();
        })
        .then(bytes => ac.decodeAudioData(bytes))
        .then(buffer => { crowdBuffers[kind] = buffer; })
        .catch(() => { /* Keep procedural fallback if offline. */ });
    }
  }

  function audioReady() {
    if (!game.audioEnabled) return null;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return null;
      if (!game.audioContext) game.audioContext = new Audio();
      const ac = game.audioContext;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      if (!arenaAudio.master) {
        const compressor = ac.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 12;
        compressor.ratio.value = 3;
        compressor.attack.value = .004;
        compressor.release.value = .18;
        const master = ac.createGain();
        master.gain.value = .74;
        master.connect(compressor);
        compressor.connect(ac.destination);
        arenaAudio.master = master;
      }
      return ac;
    } catch { return null; }
  }

  function volumeFade(gain, t, peak, attack, duration) {
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(.0001, peak), t + attack);
    gain.gain.setValueAtTime(Math.max(.0001, peak), t + Math.max(attack, duration * .5));
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
  }

  function getNoise(ac) {
    if (!arenaAudio.noise) {
      const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * 3.4), ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      arenaAudio.noise = buffer;
    }
    return arenaAudio.noise;
  }

  function noiseBurst(ac, t, duration, center, q, peak, output, attack = .012) {
    const src = ac.createBufferSource();
    src.buffer = getNoise(ac);
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = center;
    filter.Q.value = q;
    const gain = ac.createGain();
    volumeFade(gain, t, peak, attack, duration);
    src.connect(filter); filter.connect(gain); gain.connect(output);
    src.start(t); src.stop(t + duration + .015);
  }

  // Brighter, layered procedural arena crowd. The broad formants and high-frequency
  // texture keep reactions distinct on small phone speakers (no licensed samples).
  function crowdVoice(ac, t, duration, vowel, pitch, peak, output) {
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.linearRampToValueAtTime(pitch * (vowel === 'oo' ? .83 : 1.18), t + duration);
    const wobble = ac.createOscillator();
    wobble.frequency.value = 5 + Math.random() * 6;
    const wobbleDepth = ac.createGain();
    wobbleDepth.gain.value = pitch * .013;
    wobble.connect(wobbleDepth); wobbleDepth.connect(osc.frequency);
    const voiced = ac.createGain();
    volumeFade(voiced, t, peak, .035 + Math.random() * .08, duration);
    const frequencies = vowel === 'oo' ? [490, 1130, 2650] : [900, 1660, 3220];
    const levels = vowel === 'oo' ? [.60, .46, .30] : [.58, .48, .35];
    frequencies.forEach((freq, i) => {
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq * (.91 + Math.random() * .18);
      filter.Q.value = [1.1, 1.6, 1.85][i];
      const band = ac.createGain(); band.gain.value = levels[i];
      osc.connect(filter); filter.connect(band); band.connect(voiced);
    });
    voiced.connect(output);
    osc.start(t); wobble.start(t);
    osc.stop(t + duration + .025); wobble.stop(t + duration + .025);
  }

  function replaceAtmosphere(ac, kind) {
    const t = ac.currentTime;
    if (arenaAudio.crowd) {
      const old = arenaAudio.crowd;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(Math.max(.0001, old.gain.value), t);
      old.gain.exponentialRampToValueAtTime(.0001, t + .065);
    }
    const bus = ac.createGain();
    bus.gain.value = 1;
    bus.connect(arenaAudio.master);
    arenaAudio.crowd = bus;

    const cheering = kind === 'cheer';
    const recorded = crowdBuffers[cheering ? 'cheer' : 'boo'];
    if (recorded) {
      // No muffling bandpass filter: let natural crowd voices come through.
      const source = ac.createBufferSource();
      source.buffer = recorded;
      const offset = cheering ? Math.min(3.2 + Math.random() * 1.6,
        Math.max(0, recorded.duration - 2.4)) : .06;
      const duration = Math.min(cheering ? 2.3 : 1.65,
        recorded.duration - offset - .02);
      if (duration > .12) {
        const gain = ac.createGain();
        volumeFade(gain, t, cheering ? .72 : .85, .055, duration);
        source.connect(gain); gain.connect(bus);
        source.start(t, offset, duration);
        return;
      }
    }

    // Procedural fallback while samples load or if network fails.
    const duration = cheering ? 2 : 1.35;
    noiseBurst(ac, t + .02, duration, cheering ? 2600 : 1200, .38,
      cheering ? .24 : .16, bus, .07);
    for (let i = 0; i < (cheering ? 11 : 8); i++) {
      const offset = .02 + Math.random() * (cheering ? .35 : .2);
      crowdVoice(ac, t + offset, duration - offset, cheering ? 'ah' : 'oo',
        (cheering ? 155 : 102) + Math.random() * (cheering ? 140 : 65),
        cheering ? .054 : .066, bus);
    }
  }

  // One quick stick-and-skate swish when the player pulls back. No sustained
  // synthetic voice: the old "ahhhhh" quickly became repetitive and distracting.
  function startWindup() {
    if (arenaAudio.windup || !game.audioEnabled) return;
    const ac = audioReady();
    if (!ac) return;
    try {
      const t = ac.currentTime;
      const bus = ac.createGain();
      bus.gain.value = .65;
      bus.connect(arenaAudio.master);
      const src = ac.createBufferSource();
      src.buffer = getNoise(ac);
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1550, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + .17);
      filter.Q.value = .75;
      const gain = ac.createGain();
      volumeFade(gain, t, .22, .025, .19);
      src.connect(filter); filter.connect(gain); gain.connect(bus);
      src.start(t); src.stop(t + .205);
      const low = ac.createOscillator();
      low.type = 'triangle';
      low.frequency.setValueAtTime(170, t);
      low.frequency.exponentialRampToValueAtTime(100, t + .14);
      const lowGain = ac.createGain();
      volumeFade(lowGain, t, .080, .013, .14);
      low.connect(lowGain); lowGain.connect(bus);
      low.start(t); low.stop(t + .155);
      arenaAudio.windup = { bus };
    } catch { /* Never let optional sound block a shot. */ }
  }

  function updateWindup(pull) {
    // Trigger only once per actual pull-back gesture, not on every pointermove.
    if (!game.audioEnabled || pull < 18 || !game.aiming || game.aiming.windupPlayed) return;
    game.aiming.windupPlayed = true;
    startWindup();
  }

  function stopWindup() {
    const sound = arenaAudio.windup;
    if (!sound || !game.audioContext) return;
    arenaAudio.windup = null;
    const t = game.audioContext.currentTime;
    sound.bus.gain.cancelScheduledValues(t);
    sound.bus.gain.setValueAtTime(Math.max(.0001, sound.bus.gain.value), t);
    sound.bus.gain.exponentialRampToValueAtTime(.0001, t + .045);
  }

  function playSlapshot(ac) {
    const t = ac.currentTime;
    // Stick-on-ice scrape, a double wooden crack, then short low puck "thock".
    noiseBurst(ac, t, .09, 1950, .8, .55, arenaAudio.master, .002);
    noiseBurst(ac, t + .014, .074, 530, 1.7, .51, arenaAudio.master, .002);
    const osc = ac.createOscillator(); osc.type = 'triangle';
    const gain = ac.createGain();
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(86, t + .11);
    volumeFade(gain, t, .32, .003, .13);
    osc.connect(gain); gain.connect(arenaAudio.master);
    osc.start(t); osc.stop(t + .15);
  }

  function playHorn(ac) {
    const t = ac.currentTime;
    if (arenaAudio.horn) {
      const old = arenaAudio.horn;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(Math.max(.0001, old.gain.value), t);
      old.gain.exponentialRampToValueAtTime(.0001, t + .07);
    }
    const bus = ac.createGain(); bus.gain.value = 1;
    bus.connect(arenaAudio.master); arenaAudio.horn = bus;
    // Original two-blast arena siren/horn, not an NHL club recording.
    [.0, .77].forEach((offset, index) => {
      const start = t + offset;
      const duration = index === 0 ? .60 : .82;
      [233, 349.5, 466].forEach((freq, i) => {
        const osc = ac.createOscillator(); osc.type = i === 2 ? 'triangle' : 'sawtooth';
        const lowpass = ac.createBiquadFilter(); lowpass.type = 'lowpass';
        lowpass.frequency.value = i === 2 ? 1300 : 900;
        osc.frequency.setValueAtTime(freq * .986, start);
        osc.frequency.linearRampToValueAtTime(freq * 1.012, start + duration);
        const gain = ac.createGain();
        volumeFade(gain, start, [.16, .11, .055][i], .045, duration);
        osc.connect(lowpass); lowpass.connect(gain); gain.connect(bus);
        osc.start(start); osc.stop(start + duration + .02);
      });
    });
  }

  function playSound(kind) {
    if (!game.audioEnabled) return;
    const ac = audioReady();
    if (!ac) return;
    try {
      if (kind === 'fire') playSlapshot(ac);
      if (kind === 'goal') { playHorn(ac); replaceAtmosphere(ac, 'cheer'); }
      if (kind === 'miss' || kind === 'post') {
        if (kind === 'post') {
          const t = ac.currentTime;
          [940, 1495, 2185].forEach((hz, i) => {
            const osc = ac.createOscillator(); osc.type = 'sine';
            const gain = ac.createGain();
            osc.frequency.value = hz;
            volumeFade(gain, t, .14 / (i + 1), .003, .34 + i * .1);
            osc.connect(gain); gain.connect(arenaAudio.master);
            osc.start(t); osc.stop(t + .59);
          });
        }
        replaceAtmosphere(ac, 'boo');
      }
      if (kind === 'save') {
        const t = ac.currentTime;
        noiseBurst(ac, t, .13, 500, 1.3, .25, arenaAudio.master, .005);
        const osc = ac.createOscillator(); osc.type = 'triangle';
        const gain = ac.createGain();
        osc.frequency.setValueAtTime(195, t);
        osc.frequency.exponentialRampToValueAtTime(92, t + .16);
        volumeFade(gain, t, .16, .005, .18);
        osc.connect(gain); gain.connect(arenaAudio.master);
        osc.start(t); osc.stop(t + .2);
      }
    } catch { /* Browsers without Web Audio still play silently. */ }
  }

  soundButton.addEventListener('click', () => {
    game.audioEnabled = !game.audioEnabled;
    if (!game.audioEnabled) stopWindup();
    if (arenaAudio.master && game.audioContext) {
      const t = game.audioContext.currentTime;
      arenaAudio.master.gain.setTargetAtTime(game.audioEnabled ? .74 : 0, t, .025);
    }
    if (game.audioEnabled) {
      const ac = audioReady();
      if (ac) preloadCrowd(ac);
    }
    soundOnIcon.hidden = !game.audioEnabled;
    soundOffIcon.hidden = game.audioEnabled;
    soundButton.setAttribute('aria-label', game.audioEnabled ? 'Mute sound' : 'Turn sound on');
    soundButton.title = game.audioEnabled ? 'Mute sound' : 'Turn sound on';
  });

  function updateHUD() {
    scoreEl.textContent = game.goals;
    timeEl.innerHTML = `${game.remaining.toFixed(1)}<span class="time-unit">s</span>`;
    shotsEl.textContent = game.shots;
    savesEl.textContent = game.saves;
    missesEl.textContent = game.misses;
    percentageEl.textContent = game.shots ? `${Math.round(100 * game.goals / game.shots)}%` : '0%';
    bestEl.textContent = game.best;
    timeFill.style.width = `${100 * game.remaining / ROUND_SECONDS}%`;
    const urgent = game.remaining <= 7 && game.mode !== 'idle';
    timeEl.classList.toggle('urgent', urgent);
    timeFill.classList.toggle('urgent', urgent);
  }

  function resetPuck() {
    game.puck = { ...PUCK_START, moving: false, vx: 0, vy: 0, trail: [] };
    game.shot = null;
    game.cooldown = 0;
  }

  const difficultyButtons = Array.from(document.querySelectorAll('[data-difficulty]'));
  const difficultyDescription = $('difficultyDescription');
  const difficultyStatus = $('difficultyStatus');
  function setDifficulty(id) {
    if (game.mode === 'playing' || game.mode === 'ending' || !Object.hasOwn(DIFFICULTIES, id)) return;
    game.difficulty = id;
    game.best = readBest(id);
    for (const button of difficultyButtons) {
      const selected = button.dataset.difficulty === id;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.classList.toggle('selected', selected);
    }
    difficultyDescription.textContent = DIFFICULTIES[id].description;
    difficultyStatus.textContent = DIFFICULTIES[id].name.toUpperCase();
    try { localStorage.setItem(MODE_KEY, id); } catch {}
    updateHUD();
  }
  difficultyButtons.forEach(button => button.addEventListener('click', () => setDifficulty(button.dataset.difficulty)));
  setDifficulty(initialDifficulty);

  function startGame() {
    stopWindup();
    const ac = audioReady(); // Start button provides the user gesture Safari needs.
    if (ac) preloadCrowd(ac);
    game.mode = 'playing';
    // Snapshot the selected mode's record, even after switching levels on the menu.
    game.best = readBest(game.difficulty);
    game.remaining = ROUND_SECONDS;
    game.elapsed = 0;
    game.bestAtStart = game.best;
    game.goals = 0; game.shots = 0; game.saves = 0; game.misses = 0;
    game.goalie = { x: 210, targetX: 210, lean: 0, flash: 0 };
    game.particles = [];
    game.previousTargets = [];
    game.aiming = null;
    game.toastTimer = 0;
    game.shake = 0;
    game.statsRefresh = 0;
    resetPuck();
    overlay.hidden = true;
    toast.className = 'shot-toast';
    toast.textContent = '';
    $('controlHint').textContent = 'PULL BACK & RELEASE  ·  OR FLICK FORWARD';
    updateHUD();
    game.lastTime = performance.now();
  }

  function finishGame() {
    if (game.mode === 'finished') return;
    stopWindup();
    game.mode = 'finished';
    game.aiming = null;
    game.cooldown = 0;
    game.toastTimer = 0;
    toast.className = 'shot-toast';
    const newRecord = game.goals > game.bestAtStart;
    $('overlayTitle').innerHTML = newRecord ? `NEW PERSONAL<br><em>BEST!</em>` : `TIME'S UP.<br><em>GOOD HUSTLE.</em>`;
    $('overlayCopy').textContent = newRecord
      ? 'The goalie is already studying the replay. Ready to go again?'
      : 'Thirty seconds goes fast. Find the corners and beat the goalie next round.';
    $('overlayHint').textContent = 'PULL BACK OR FLICK UP TO SHOOT';
    $('overlay').querySelector('.overlay-kicker').textContent = 'FINAL BUZZER';
    const summary = $('endSummary');
    summary.hidden = false;
    summary.innerHTML = `<div><span>GOALS</span><strong>${game.goals}</strong></div>` +
      `<div><span>SHOTS</span><strong>${game.shots}</strong></div>` +
      `<div><span>ACCURACY</span><strong>${game.shots ? Math.round(100 * game.goals / game.shots) : 0}%</strong></div>`;
    $('playButton').innerHTML = 'PLAY AGAIN <span aria-hidden="true">↗</span>';
    overlay.hidden = false;
    $('controlHint').textContent = 'ROUND COMPLETE  ·  BEAT YOUR RECORD';
    updateHUD();
  }

  $('playButton').addEventListener('click', startGame);

  function showToast(text, type) {
    const missDetail = type === 'miss' ? /^MISS · (.+)!$/.exec(text) : null;
    if (missDetail) {
      const heading = document.createElement('span');
      heading.textContent = 'MISS!';
      const detail = document.createElement('span');
      detail.className = 'toast-detail';
      detail.textContent = missDetail[1] + '!';
      toast.replaceChildren(heading, detail);
    } else {
      toast.textContent = text;
    }
    toast.className = `shot-toast ${type}${missDetail ? ' stacked' : ''} visible`;
    game.toastTimer = .72;
  }

  function addParticles(x, y, colors, count = 20, burst = 180) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * burst;
      game.particles.push({ x, y, vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 25, life: .45 + Math.random() * .5,
        maxLife: .95, size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)] });
    }
  }

  function registerOutcome(type) {
    if (!game.shot || !game.puck.moving) return; // Never double-count a shot.
    const p = game.puck;
    if (type === 'goal') {
      game.goals++;
      game.shake = 4;
      showToast('GOAL!', 'goal');
      playSound('goal');
      addParticles(p.x, GOAL.line, ['#35e9b8', '#ffffff', '#f8d78e', '#74d5ff'], 36, 230);
      if (game.goals > game.best) {
        game.best = game.goals;
        saveBest(game.best);
      }
    } else if (type === 'save') {
      game.saves++;
      game.goalie.flash = .24;
      showToast('SAVE!', 'save');
      playSound('save');
      addParticles(p.x, GOALIE_LINE, ['#ffffff', '#6cdff0', '#bfdbe8'], 13, 110);
    } else {
      game.misses++;
      if (type === 'post') {
        showToast('MISS · POST!', 'miss');
        playSound('post');
        game.shake = 2.5;
        addParticles(p.x, GOAL.line, ['#ff5c50', '#f5ba75', '#fff6dc'], 17, 140);
      } else if (type === 'crossbar') {
        showToast('MISS · CROSSBAR!', 'miss');
        playSound('post');
        game.shake = 2;
        addParticles(p.x, GOAL.line, ['#ff5c50', '#f5ba75', '#fff6dc'], 19, 150);
      } else {
        showToast('MISS!', 'miss');
        playSound('miss');
      }
    }
    p.moving = false;
    game.shot = null;
    game.cooldown = .29;
    updateHUD();
  }

  function calculateGesture(aim) {
    const dx = aim.current.x - aim.origin.x;
    const dy = aim.current.y - aim.origin.y;
    const pullBack = dy >= 0;
    const vx = pullBack ? -dx : dx;
    const vy = pullBack ? -dy : dy;
    const length = Math.hypot(vx, vy);
    const elapsedMs = Math.max(35, performance.now() - aim.started);
    // Finger travel primarily sets power. A quick upward flick gets a small boost.
    const gestureSpeed = length * 1000 / elapsedMs;
    const power = clamp(Math.max(length / 125,
      pullBack ? 0 : (gestureSpeed / 2100) * .85), .14, 1);
    const directionX = length > 0 ? vx / length : 0;
    const directionY = length > 0 ? vy / length : -1;
    return { length, power, directionX, directionY, pullBack };
  }

  function worldPoint(event) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - r.left) / r.width * W,
      y: (event.clientY - r.top) / r.height * H
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (game.mode !== 'playing' || game.puck.moving || game.cooldown > 0 || game.aiming) return;
    if (event.button !== undefined && event.button !== 0) return;
    const pt = worldPoint(event);
    // Finger-sized hit area; still requires starting on/near the actual puck.
    if (distance(pt, PUCK_START) > 67) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    game.aiming = { pointerId: event.pointerId, origin: pt, current: pt, started: performance.now(), windupPlayed: false };
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!game.aiming || event.pointerId !== game.aiming.pointerId) return;
    event.preventDefault();
    game.aiming.current = worldPoint(event);
    const a = game.aiming;
    const dx = a.current.x - a.origin.x;
    const dy = a.current.y - a.origin.y;
    if (dy > 0) updateWindup(Math.hypot(dx, dy));
    else stopWindup();
  });

  function releaseAim(event, canceled = false) {
    if (!game.aiming || event.pointerId !== game.aiming.pointerId) return;
    event.preventDefault();
    const aim = game.aiming;
    stopWindup();
    game.aiming = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (canceled || game.mode !== 'playing') return;
    aim.current = worldPoint(event);
    const gesture = calculateGesture(aim);
    if (gesture.length < 22) return; // Tiny accidental drags don't burn a shot.
    firePuck(gesture);
  }

  canvas.addEventListener('pointerup', (event) => releaseAim(event));
  canvas.addEventListener('pointercancel', (event) => releaseAim(event, true));
  canvas.addEventListener('lostpointercapture', (event) => {
    if (game.aiming?.pointerId === event.pointerId) {
      game.aiming = null;
      stopWindup();
    }
  });
  canvas.addEventListener('contextmenu', event => event.preventDefault());

  function firePuck(gesture) {
    const speed = 580 + 1040 * gesture.power;
    game.puck = { ...PUCK_START, moving: true,
      vx: gesture.directionX * speed,
      vy: gesture.directionY * speed, trail: [] };
    const predictedGoalieX = gesture.directionY < -.025
      ? PUCK_START.x + (GOALIE_LINE - PUCK_START.y) * gesture.directionX / gesture.directionY
      : PUCK_START.x + 900 * gesture.directionX;
    const predictedNetX = gesture.directionY < -.025
      ? PUCK_START.x + (GOAL.line - PUCK_START.y) * gesture.directionX / gesture.directionY
      : PUCK_START.x + 1200 * gesture.directionX;
    game.shots++;
    const progress = clamp(game.elapsed / ROUND_SECONDS, 0, 1);
    const settings = DIFFICULTIES[game.difficulty];
    const lastTargets = game.previousTargets;
    const repeat = lastTargets.length >= 2 && lastTargets.slice(-2).every(n => Math.abs(n - predictedNetX) < 32);
    game.shot = {
      aimX: predictedGoalieX, netX: predictedNetX, power: gesture.power,
      // Less experienced goalies occasionally misread where the puck is heading.
      aimDrift: (Math.random() * 2 - 1) * settings.drift,
      reacted: false, reactionTime: lerp(settings.reactionStart, settings.reactionEnd, progress)
        - (repeat ? settings.repeatBoost : 0),
      // High-power shots can occasionally sail up into the crossbar.
      // The chance rises with force, so max power has a small risk/reward tradeoff.
      crossbar: gesture.power > .86 && Math.random() < (gesture.power - .86) * 1.05
    };
    lastTargets.push(predictedNetX);
    if (lastTargets.length > 4) lastTargets.shift();
    playSound('fire');
    updateHUD();
  }

  function updateGoalie(dt) {
    const g = game.goalie;
    const progress = clamp(game.elapsed / ROUND_SECONDS, 0, 1);
    const settings = DIFFICULTIES[game.difficulty];
    // Independent patrol + adaptive corner bias; all levels improve over 30 seconds.
    const patrol = 210 + Math.sin(game.elapsed * (settings.patrolSpeed + progress * .65)) * settings.patrolWave
      + Math.sin(game.elapsed * 4.3 + 1.3) * settings.patrolExtra;
    let target = patrol;
    if (game.previousTargets.length > 1) {
      const last = game.previousTargets.slice(-3);
      const avg = last.reduce((a, b) => a + b, 0) / last.length;
      const consistent = last.every(n => Math.abs(n - avg) < 35);
      if (consistent) target = lerp(target, clamp(avg, 142, 278),
        settings.biasStart + progress * settings.biasGain);
    }
    if (game.shot) {
      game.shot.reactionTime -= dt;
      if (game.shot.reactionTime <= 0) {
        game.shot.reacted = true;
        target = clamp(game.shot.aimX + game.shot.aimDrift, 146, 274);
      }
    }
    g.targetX = target;
    const speed = settings.chaseStart + progress * settings.chaseGain;
    const step = clamp(g.targetX - g.x, -speed * dt, speed * dt);
    g.x = clamp(g.x + step, 146, 274);
    g.lean = lerp(g.lean, clamp(step / Math.max(.01, dt) / 300, -1, 1), Math.min(1, dt * 10));
    g.flash = Math.max(0, g.flash - dt);
  }

  function updatePuck(dt) {
    const p = game.puck;
    if (!p.moving) return;
    const beforeY = p.y;
    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > 11) p.trail.pop();
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Goalie collision is checked when crossing its plane, not per-pixel overlap.
    if (beforeY > GOALIE_LINE && p.y <= GOALIE_LINE) {
      const settings = DIFFICULTIES[game.difficulty];
      const goalieWidth = settings.saveStart + settings.saveGain * clamp(game.elapsed / ROUND_SECONDS, 0, 1);
      if (Math.abs(p.x - game.goalie.x) <= goalieWidth) {
        registerOutcome('save');
        return;
      }
    }
    if (beforeY > GOAL.line && p.y <= GOAL.line) {
      const onPost = Math.abs(p.x - GOAL.left) < 9 || Math.abs(p.x - GOAL.right) < 9;
      if (onPost) registerOutcome('post');
      else if (p.x > GOAL.left + 8 && p.x < GOAL.right - 8) {
        if (game.shot?.crossbar) registerOutcome('crossbar');
        else registerOutcome('goal');
      } else registerOutcome('miss');
      return;
    }
    if (p.x < 5 || p.x > W - 5 || p.y > H + 30 || p.y < -30) {
      registerOutcome('miss');
    }
  }

  function tick(dt, realDt = dt) {
    game.elapsed += realDt * (game.mode === 'playing' ? 1 : 0);
    if (game.mode === 'playing') {
      game.remaining = Math.max(0, game.remaining - realDt);
      if (game.remaining <= 0) {
        game.mode = 'ending';
        game.aiming = null;
        stopWindup();
      }
    }
    if (game.mode === 'playing' || game.mode === 'ending') {
      updateGoalie(dt);
      updatePuck(dt);
      if (!game.puck.moving && game.cooldown > 0) {
        game.cooldown = Math.max(0, game.cooldown - dt);
        if (game.cooldown === 0) resetPuck();
      }
      if (game.mode === 'ending' && !game.puck.moving) finishGame();
    }
    game.shake = Math.max(0, game.shake - dt * 18);
    if (game.toastTimer > 0) {
      game.toastTimer = Math.max(0, game.toastTimer - dt);
      if (game.toastTimer === 0) toast.classList.remove('visible');
    }
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const part = game.particles[i];
      part.x += part.vx * dt; part.y += part.vy * dt;
      part.vy += 260 * dt; part.vx *= Math.max(0, 1 - 1.6 * dt);
      part.life -= dt;
      if (part.life <= 0) game.particles.splice(i, 1);
    }
    game.statsRefresh -= dt;
    if (game.statsRefresh <= 0) {
      updateHUD();
      game.statsRefresh = .05;
    }
  }

  // ------------------------------ ORIGINAL CANVAS ART ------------------------------
  const iceFlecks = Array.from({ length: 115 }, (_, i) => ({
    x: ((i * 71 + 31) % 386) + 17, y: ((i * 181 + 37) % 610) + 26,
    a: .055 + (i % 4) * .02, r: i % 5 === 0 ? 1.5 : .8
  }));

  function rr(x, y, w, h, r, fill, stroke = null, lineWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lineWidth; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function ellipse(x, y, rx, ry, fill, stroke = null, lineWidth = 1) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lineWidth; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawIce() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#c4eaf4'); grad.addColorStop(.48, '#eaf8ff');
    grad.addColorStop(1, '#b8e4f0');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // Cold light washing over the ice.
    const glow = ctx.createRadialGradient(215, 340, 25, 215, 340, 335);
    glow.addColorStop(0, '#ffffffb0'); glow.addColorStop(1, '#ffffff00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff75'; ctx.fillRect(10, 0, 9, H); ctx.fillRect(W - 19, 0, 9, H);
    ctx.strokeStyle = '#88afc0'; ctx.lineWidth = 4;
    ctx.strokeRect(6, -3, W - 12, H + 6);
    ctx.strokeStyle = '#e6fcff'; ctx.lineWidth = 2;
    ctx.strokeRect(12, -3, W - 24, H + 6);
    iceFlecks.forEach(p => { ctx.globalAlpha = p.a; ellipse(p.x, p.y, p.r, p.r, '#4e95ac'); });
    ctx.globalAlpha = 1;

    ctx.strokeStyle = game.team.primary + '99'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(11, 319); ctx.lineTo(409, 319); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, 498); ctx.lineTo(409, 498); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff7a';
    ctx.beginPath(); ctx.moveTo(11, 316); ctx.lineTo(409, 316); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, 495); ctx.lineTo(409, 495); ctx.stroke();

    // Original rink markings: center ice faceoff circle and stick hash lines.
    ctx.strokeStyle = game.team.secondary + '99'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(210, 414, 71, 0, Math.PI * 2); ctx.stroke();
    ellipse(210, 414, 5, 5, game.team.secondary + '99');
    ctx.save(); ctx.translate(210, 399);
    ctx.textAlign = 'center';
    ctx.globalAlpha = .5;
    ellipse(0, -7, 33, 33, game.team.primary, game.team.secondary, 4);
    ctx.fillStyle = game.team.trim; ctx.font = '1000 italic 25px system-ui, sans-serif';
    ctx.fillText(initialsFor(game.team.name), 0, 1, 57);
    ctx.globalAlpha = .55;
    ctx.fillStyle = game.team.primary; ctx.font = '900 11px system-ui, sans-serif';
    ctx.fillText(game.team.name.toUpperCase(), 0, 39, 170);
    ctx.globalAlpha = 1;
    ctx.restore();
    for (const x of [78, 342]) {
      ctx.strokeStyle = '#c7747e80'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 15, 259); ctx.lineTo(x - 15, 282);
      ctx.moveTo(x + 15, 259); ctx.lineTo(x + 15, 282); ctx.stroke();
      ellipse(x, 270, 3.5, 3.5, '#bc5a68bb');
    }
    // Blue ice shade at the shooting position.
    const spotlight = ctx.createRadialGradient(PUCK_START.x, PUCK_START.y, 8, PUCK_START.x, PUCK_START.y, 110);
    spotlight.addColorStop(0, '#ffffffa0'); spotlight.addColorStop(1, '#d4f5ff00');
    ctx.fillStyle = spotlight; ctx.fillRect(0, 430, W, 250);
  }

  function drawGoalAndCrease() {
    // Crease: half-circle extending toward the shooter.
    ctx.beginPath(); ctx.moveTo(126, GOAL.line); ctx.lineTo(294, GOAL.line);
    ctx.arc(210, GOAL.line, 84, 0, Math.PI, false); ctx.closePath();
    ctx.fillStyle = '#51c9e32a'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#3581bbc2'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(35, GOAL.line); ctx.lineTo(114, GOAL.line);
    ctx.moveTo(306, GOAL.line); ctx.lineTo(385, GOAL.line);
    ctx.lineWidth = 2; ctx.strokeStyle = '#d066708c'; ctx.stroke();

    // Net and mesh, from scratch.
    ctx.fillStyle = '#2d566642';
    ctx.beginPath(); ctx.moveTo(114, 167); ctx.lineTo(111, 110); ctx.lineTo(309, 110);
    ctx.lineTo(306, 167); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f0fbffcf';
    ctx.beginPath(); ctx.moveTo(GOAL.left, GOAL.line); ctx.lineTo(116, 112);
    ctx.lineTo(304, 112); ctx.lineTo(GOAL.right, GOAL.line); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.moveTo(120, 170); ctx.lineTo(116, 114); ctx.lineTo(304, 114); ctx.lineTo(300, 170); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = '#7aa6b775'; ctx.lineWidth = .95;
    for (let x = 106; x <= 314; x += 12) {
      ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x + 3, 173); ctx.stroke();
    }
    for (let y = 116; y <= 176; y += 10) {
      ctx.beginPath(); ctx.moveTo(114, y); ctx.lineTo(306, y); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#e0525a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(GOAL.left, GOAL.line); ctx.lineTo(116, 114);
    ctx.lineTo(304, 114); ctx.lineTo(GOAL.right, GOAL.line); ctx.stroke();
    ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(GOAL.left, GOAL.line); ctx.lineTo(GOAL.right, GOAL.line); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffafb2';
    ctx.beginPath(); ctx.moveTo(GOAL.left + 5, GOAL.line - 1.6);
    ctx.lineTo(GOAL.right - 5, GOAL.line - 1.6); ctx.stroke();
    for (const x of [GOAL.left, GOAL.right]) {
      ellipse(x, GOAL.line, 6, 6, '#d72f3d', '#ff9f9a', 1.5);
    }
  }

  function drawGoalie() {
    const g = game.goalie;
    ctx.save(); ctx.translate(g.x, GOALIE_LINE + 3);
    ctx.rotate(g.lean * .065);
    ellipse(0, 17, 47, 15, '#28719342');
    // Skates and leg pads.
    rr(-25, 14, 18, 24, 5, '#122c42', '#54839b', 2);
    rr(8, 14, 18, 24, 5, '#122c42', '#54839b', 2);
    rr(-30, 5, 22, 31, 5, '#f8ffff', '#678ea7', 2);
    rr(8, 5, 22, 31, 5, '#f8ffff', '#678ea7', 2);
    ctx.strokeStyle = '#d45557'; ctx.lineWidth = 3;
    for (const x of [-22, 16]) {
      ctx.beginPath(); ctx.moveTo(x, 12); ctx.lineTo(x + 5, 29); ctx.stroke();
    }
    // Body and shoulder pads.
    ellipse(-28, -2, 14, 16, '#16394f', '#0c2538', 2);
    ellipse(28, -2, 14, 16, '#16394f', '#0c2538', 2);
    rr(-24, -24, 48, 40, 13, g.flash ? '#d1fff6' : '#1b6b83', '#0b344b', 2);
    ctx.fillStyle = '#b3f0e8'; ctx.fillRect(-17, -5, 34, 5);
    ctx.fillStyle = '#ffffff'; ctx.font = '950 14px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('1', 0, 6);
    // Catcher glove & blocker. Bigger visually than collision circle.
    ellipse(-35, 1, 12, 12, '#f8fbf9', '#547e9c', 2);
    rr(27, -9, 17, 22, 5, '#fffefa', '#547e9c', 2);
    // Mask and face cage.
    ellipse(0, -29, 15, 17, '#fdfefa', '#5c88a3', 2);
    ctx.strokeStyle = '#32536b'; ctx.lineWidth = 1.5;
    for (const i of [-7, 0, 7]) {
      ctx.beginPath(); ctx.moveTo(i, -40); ctx.lineTo(i, -18); ctx.stroke();
    }
    for (const j of [-35, -28, -22]) {
      ctx.beginPath(); ctx.moveTo(-12, j); ctx.lineTo(12, j); ctx.stroke();
    }
    ellipse(-5, -31, 2, 2, '#18394c'); ellipse(5, -31, 2, 2, '#18394c');
    ctx.restore();
  }

  function drawShotPrediction() {
    const a = game.aiming;
    if (!a) return;
    const s = calculateGesture(a);
    if (s.length < 3) return;
    const px = PUCK_START.x, py = PUCK_START.y;
    const endY = GOAL.line;
    const projectedX = s.directionY < -.02 ? px + (endY - py) * s.directionX / s.directionY : 9999;
    const safeX = clamp(projectedX, -120, W + 120);
    const onTarget = safeX > GOAL.left + 9 && safeX < GOAL.right - 9;
    const aimColor = onTarget ? game.team.primary : game.team.secondary;

    // Elastic tether for a backward pull; forward flick still gets a dotted guide.
    if (s.pullBack) {
      ctx.strokeStyle = '#124d61b0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px - 7, py); ctx.lineTo(a.current.x, a.current.y);
      ctx.lineTo(px + 7, py); ctx.stroke();
      ellipse(a.current.x, a.current.y, 10, 10, '#163f58a9', '#ffffffaa', 1.5);
    }
    ctx.strokeStyle = aimColor; ctx.lineWidth = 2;
    ctx.setLineDash([3, 8]);
    ctx.beginPath(); ctx.moveTo(px, py);
    const endX = s.directionY < -.02 ? safeX : px + 160 * s.directionX;
    ctx.lineTo(endX, s.directionY < -.02 ? endY : py + 155 * s.directionY);
    ctx.stroke(); ctx.setLineDash([]);
    if (s.directionY < -.02 && safeX >= 4 && safeX <= W - 4) {
      ellipse(safeX, endY + 2, 10, 5, '#ffffffb3', aimColor, 2.2);
      ellipse(safeX, endY + 2, 3, 2, aimColor);
    }
    // Subtle power meter, placed above launch point.
    rr(px - 49, py - 39, 98, 7, 3.5, '#16415778', '#4f809c', 1);
    rr(px - 47, py - 37, 94 * s.power, 3.5, 1.5,
      s.power > .86 ? game.team.secondary : game.team.primary);
    ctx.textAlign = 'center'; ctx.font = '850 10px system-ui,sans-serif';
    ctx.fillStyle = '#28586e'; ctx.fillText(s.pullBack ? 'RELEASE TO SHOOT' : 'FLICK TO SHOOT', px, py - 49);
  }

  function drawPuck() {
    const p = game.puck;
    const total = p.trail.length;
    for (let i = total - 1; i >= 0; i--) {
      ctx.globalAlpha = (total - i) / total * .2;
      ellipse(p.trail[i].x, p.trail[i].y + 5, 9, 4, '#15536c');
    }
    ctx.globalAlpha = 1;
    if (!p.moving && game.cooldown > .05) return;
    ellipse(p.x + 1, p.y + 7, 13, 5.5, '#16496d40');
    ellipse(p.x, p.y + 3, 12.8, 7.7, '#061620');
    ellipse(p.x, p.y, 12, 6.9, '#1b303b', '#021522', 1.5);
    ellipse(p.x - 2.5, p.y - 1.5, 5, 1.6, '#8eb9c673');
    if (!p.moving && !game.aiming && game.mode === 'playing') {
      ctx.save(); ctx.globalAlpha = .7 + .15 * Math.sin(game.elapsed * 5);
      ctx.strokeStyle = game.team.primary; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(PUCK_START.x, PUCK_START.y + 2, 25, 16, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.font = '850 10px system-ui,sans-serif';
      ctx.fillStyle = '#29728c';
      ctx.fillText('FLICK THE PUCK', PUCK_START.x, PUCK_START.y + 39);
    }
  }

  function drawParticles() {
    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife * 1.7, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size * .7);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.save();
    if (game.shake > 0) ctx.translate((Math.random() - .5) * game.shake, (Math.random() - .5) * game.shake);
    drawIce();
    drawGoalAndCrease();
    drawGoalie();
    drawShotPrediction();
    drawPuck();
    drawParticles();
    ctx.restore();
  }

  function resizeCanvas() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    draw();
  }

  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resizeCanvas) : null;
  if (observer) observer.observe(canvas);
  else window.addEventListener('resize', resizeCanvas);
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('visibilitychange', () => {
    // A hidden browser tab doesn't consume the player's 30 seconds.
    game.lastTime = performance.now();
  });

  function frame(timestamp) {
    const realDt = game.lastTime ? Math.max(0, (timestamp - game.lastTime) / 1000) : 0;
    const physicsDt = Math.min(realDt, .05);
    game.lastTime = timestamp;
    if (!document.hidden) tick(physicsDt, realDt);
    draw();
    requestAnimationFrame(frame);
  }

  updateHUD();
  resizeCanvas();
  requestAnimationFrame(frame);
})();
