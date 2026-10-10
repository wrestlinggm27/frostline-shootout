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
  const HIGH_SCORE_KEY = 'frostline-shootout-high-score-v1';

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

  function readBest() {
    try { return Math.max(0, Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0); }
    catch { return 0; }
  }
  function saveBest(n) {
    try { localStorage.setItem(HIGH_SCORE_KEY, String(n)); }
    catch { /* Private browsing may deny storage. Gameplay still works. */ }
  }

  const game = {
    mode: 'idle', remaining: ROUND_SECONDS, elapsed: 0, bestAtStart: 0,
    goals: 0, shots: 0, saves: 0, misses: 0, best: readBest(),
    puck: { ...PUCK_START, moving: false, vx: 0, vy: 0, trail: [] },
    goalie: { x: 210, targetX: 210, lean: 0, flash: 0 },
    shot: null, cooldown: 0, toastTimer: 0, shake: 0,
    aiming: null, particles: [], previousTargets: [],
    audioEnabled: true, audioContext: null, lastTime: 0,
    statsRefresh: 0
  };

  // Native Web Audio tones mean no sound files, CDN, or copyrighted assets.
  function playSound(kind) {
    if (!game.audioEnabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!game.audioContext) game.audioContext = new Audio();
      const ac = game.audioContext;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      const notes = {
        fire: [[165, 75, .07, 'triangle']],
        goal: [[440, 660, .16, 'triangle'], [660, 990, .20, 'sine']],
        save: [[175, 92, .17, 'sawtooth']],
        post: [[760, 430, .24, 'triangle']],
        miss: [[180, 115, .13, 'sine']]
      }[kind] || [];
      notes.forEach(([start, end, duration, type], i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const t = ac.currentTime + i * .045;
        osc.type = type;
        osc.frequency.setValueAtTime(start, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(35, end), t + duration);
        gain.gain.setValueAtTime(.0001, t);
        gain.gain.exponentialRampToValueAtTime(.07, t + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(t); osc.stop(t + duration + .02);
      });
    } catch { /* Sound is optional. */ }
  }

  soundButton.addEventListener('click', () => {
    game.audioEnabled = !game.audioEnabled;
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

  function startGame() {
    game.mode = 'playing';
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
    toast.textContent = text;
    toast.className = `shot-toast ${type} visible`;
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
    game.aiming = { pointerId: event.pointerId, origin: pt, current: pt, started: performance.now() };
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!game.aiming || event.pointerId !== game.aiming.pointerId) return;
    event.preventDefault();
    game.aiming.current = worldPoint(event);
  });

  function releaseAim(event, canceled = false) {
    if (!game.aiming || event.pointerId !== game.aiming.pointerId) return;
    event.preventDefault();
    const aim = game.aiming;
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
    if (game.aiming?.pointerId === event.pointerId) game.aiming = null;
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
    const difficulty = clamp(game.elapsed / ROUND_SECONDS, 0, 1);
    const lastTargets = game.previousTargets;
    const repeat = lastTargets.length >= 2 && lastTargets.slice(-2).every(n => Math.abs(n - predictedNetX) < 32);
    game.shot = {
      aimX: predictedGoalieX, netX: predictedNetX, power: gesture.power,
      reacted: false, reactionTime: .21 - difficulty * .14 - (repeat ? .045 : 0),
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
    const difficulty = clamp(game.elapsed / ROUND_SECONDS, 0, 1);
    // Independent patrol + an adaptive bias if the player repeats a corner.
    const patrol = 210 + Math.sin(game.elapsed * (2.25 + difficulty * .65)) * 43
      + Math.sin(game.elapsed * 4.3 + 1.3) * 16;
    let target = patrol;
    if (game.previousTargets.length > 1) {
      const last = game.previousTargets.slice(-3);
      const avg = last.reduce((a, b) => a + b, 0) / last.length;
      const consistent = last.every(n => Math.abs(n - avg) < 35);
      if (consistent) target = lerp(target, clamp(avg, 142, 278), .24 + difficulty * .2);
    }
    if (game.shot) {
      game.shot.reactionTime -= dt;
      if (game.shot.reactionTime <= 0) {
        game.shot.reacted = true;
        target = clamp(game.shot.aimX, 146, 274);
      }
    }
    g.targetX = target;
    const speed = 165 + difficulty * 190;
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
      const goalieWidth = 28 + 8 * clamp(game.elapsed / ROUND_SECONDS, 0, 1);
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

    ctx.strokeStyle = '#418bcaa0'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(11, 319); ctx.lineTo(409, 319); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, 498); ctx.lineTo(409, 498); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff7a';
    ctx.beginPath(); ctx.moveTo(11, 316); ctx.lineTo(409, 316); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, 495); ctx.lineTo(409, 495); ctx.stroke();

    // Original rink markings: center ice faceoff circle and stick hash lines.
    ctx.strokeStyle = '#db6a7690'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(210, 414, 71, 0, Math.PI * 2); ctx.stroke();
    ellipse(210, 414, 5, 5, '#b74b6199');
    ctx.save(); ctx.translate(210, 399);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#276e8570'; ctx.font = '1000 italic 32px system-ui, sans-serif';
    ctx.fillText('FL', 0, 0);
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.letterSpacing = '3px'; ctx.fillText('FROSTLINE', 0, 22);
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
    const aimColor = onTarget ? '#20b79e' : '#df725e';

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
      s.power > .86 ? '#ff795f' : '#35c9af');
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
      ctx.strokeStyle = '#138d9c'; ctx.lineWidth = 2;
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
