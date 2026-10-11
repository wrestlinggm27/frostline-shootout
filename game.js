(() => {
  'use strict';

  // All gameplay and art are drawn on a 420 x 680 virtual rink.
  // CSS scales that rink for phones and desktops; pointer coordinates are scaled back.
  // DEV BUILD. This version's experimental profiles and scores are isolated
  // from Stable even though both pages share the same GitHub Pages origin.
  const DEV_STORAGE_PREFIX = 'frostline-dev:';
  const devStorage = {
    getItem(key) { return localStorage.getItem(DEV_STORAGE_PREFIX + key); },
    setItem(key, value) { return localStorage.setItem(DEV_STORAGE_PREFIX + key, value); },
    removeItem(key) { return localStorage.removeItem(DEV_STORAGE_PREFIX + key); }
  };
    const W = 420;
  const H = 680;
  const ROUND_SECONDS = 30;
  const PUCK_START = { x: 210, y: 563 };
  const GOAL = { left: 120, right: 300, line: 172 };
  const GOALIE_LINE = 225;
  const LEGACY_HIGH_SCORE_KEY = 'frostline-shootout-high-score-v1';
  const PROFILE_DB_KEY = 'frostline-player-profiles-v1';
  const GAME_STYLE = 'arcade'; // Future styles get their own record namespaces.
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
      const stored = devStorage.getItem(MODE_KEY);
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
  // Original hockey crests. Each team's identity is a serializable design ID
  // and palette, reusable later when opponents are introduced.
  const CREST_ART = {
    monogram: { label: 'Captain', shapes: [] },
    wolf: { label: 'Wolf', shapes: [
      { d: 'M27 45 L35 32 L43 46 L50 41 L57 46 L65 32 L73 45 L71 69 L61 82 L50 75 L39 82 L29 69 Z' },
      { d: 'M37 56 L45 59 L39 63 Z M55 59 L63 56 L61 63 Z', mode: 'cutout' },
      { d: 'M44 67 L56 67 L50 73 Z', mode: 'cutout' }
    ] },
    bolt: { label: 'Lightning', shapes: [
      { d: 'M55 29 L35 60 H51 L43 86 L70 52 H53 L63 29 Z' }
    ] },
    sticks: { label: 'Crossed Sticks', shapes: [
      { d: 'M30 37 L67 77 M69 37 L32 78', mode: 'stroke' },
      { d: 'M67 77 Q74 80 76 72 M32 78 Q26 80 24 73', mode: 'stroke' },
      { d: 'M44 81 H56 V85 H44 Z' }
    ] },
    star: { label: 'Star', shapes: [
      { d: 'M50 27 L58 47 L79 48 L63 62 L69 84 L50 72 L31 84 L37 62 L21 48 L42 47 Z' }
    ] },
    mountain: { label: 'Summit', shapes: [
      { d: 'M23 78 L44 39 L55 58 L64 44 L78 78 Z' },
      { d: 'M35 57 L44 39 L52 54 L44 51 L40 59 Z M58 55 L64 44 L72 59 L64 56 Z', mode: 'cutout' }
    ] },
    // Four entirely original fictional clubs based on real hockey-city traditions.
    // Their colors nod to the local pro palettes; none uses an official name or logo.
    nySalute: { label: 'New York Stick Salute', shapes: [
      { d: 'M35 82 L27 38 Q25 31 18 33', mode: 'stroke', width: 5 },
      { d: 'M65 82 L73 38 Q75 31 82 33', mode: 'stroke', width: 5 },
      { d: 'M34 82 V64 H39 V57 H43 V45 H48 V38 H53 V52 H58 V46 H63 V62 H67 V82 Z', mode: 'accent' },
      { d: 'M47 46 H50 V53 H47 Z M47 59 H50 V64 H47 Z M56 56 H59 V61 H56 Z M40 66 H43 V71 H40 Z', mode: 'trim' },
      { d: 'M32 82 H68', mode: 'stroke', width: 2.5 },
      { d: 'M45 87 H55', mode: 'stroke', width: 3.5 }
    ] },
    detOctopus: { label: 'Detroit Octopus', shapes: [
      { d: 'M36 54 C25 47 20 60 27 72 C31 78 36 73 34 68', mode: 'stroke', width: 5.5 },
      { d: 'M42 57 C31 63 30 79 37 85', mode: 'stroke', width: 5.5 },
      { d: 'M48 58 C43 71 44 84 49 88', mode: 'stroke', width: 5 },
      { d: 'M55 58 C64 65 66 81 60 86', mode: 'stroke', width: 5.5 },
      { d: 'M63 54 C77 49 82 64 74 73 C70 77 67 71 71 68', mode: 'stroke', width: 5 },
      { d: 'M38 51 C36 41 39 34 45 32 C53 28 62 34 64 44 C67 56 61 62 50 62 C41 62 38 57 38 51 Z', mode: 'trim' },
      { d: 'M43 47 A2.6 2.6 0 1 0 48.2 47 A2.6 2.6 0 1 0 43 47 Z M54 47 A2.6 2.6 0 1 0 59.2 47 A2.6 2.6 0 1 0 54 47 Z', mode: 'base' },
      { d: 'M48 55 Q50 58 53 55', mode: 'base-stroke', width: 2 },
      { d: 'M27 66 L29 65 M70 62 L72 63', mode: 'base-stroke', width: 2.2 }
    ] },
    chiCurve: { label: 'Chicago Curved Stick', shapes: [
      { d: 'M30 31 L51 70 C57 82 71 77 77 67', mode: 'stroke', width: 8 },
      { d: 'M35 35 L53 69 C60 76 69 73 74 68', mode: 'base-stroke', width: 2 },
      { d: 'M24 61 Q25 79 39 84', mode: 'accent-stroke', width: 4 },
      { d: 'M44 86 Q61 91 74 80', mode: 'accent-stroke', width: 3 },
      { d: 'M34 43 L36 39 L40 43 L37 47 Z', mode: 'accent' },
      { d: 'M63 40 L65 35 L68 40 L73 42 L68 45 L66 50 L63 45 L59 43 Z', mode: 'accent' }
    ] },
    calFire: { label: 'Calgary Ring of Fire', shapes: [
      { d: 'M27 78 C18 70 19 56 29 44 Q27 54 34 52 Q32 40 44 28 Q43 41 51 46 Q58 40 56 31 Q70 41 67 54 Q73 52 73 44 C85 62 80 78 68 84 C57 91 37 89 27 78 Z', mode: 'accent' },
      { d: 'M50 48 C64 48 73 58 71 70 C69 82 57 88 46 85 C34 82 28 73 30 62 C32 54 40 48 50 48 Z', mode: 'base' },
      { d: 'M50 50 C62 50 70 59 68 70 C66 80 57 84 48 82 C38 81 33 72 34 63 C36 55 42 51 50 50 Z', mode: 'stroke', width: 3.8 },
      { d: 'M45 61 A5 5 0 1 0 55 61 A5 5 0 1 0 45 61 Z', mode: 'trim' },
      { d: 'M44 69 Q50 74 57 69', mode: 'accent-stroke', width: 2.8 }
    ] },
    // Batch two: fan, work-ethic, crowd-chant and steel-city traditions.
    bosBanner: { label: 'Boston Fan Banner', shapes: [
      // Gold rally pennant on a black shield, with an original block-B cutout.
      { d: 'M27 34 Q46 27 73 38 L70 69 Q49 59 29 72 Z', mode: 'accent' },
      { d: 'M30 36 L27 83', mode: 'stroke', width: 4.4 },
      { d: 'M25 84 L36 84', mode: 'stroke', width: 3 },
      { d: 'M38 42 V61 H49 C63 61 64 51 54 50 C62 43 54 38 47 40 Z', mode: 'base' },
      { d: 'M43 44 H49 Q54 44 49 48 H43 Z M43 52 H50 Q56 52 50 57 H43 Z', mode: 'accent' },
      { d: 'M59 72 Q69 73 76 78', mode: 'stroke', width: 2.2 }
    ] },
    torGrind: { label: 'Toronto Grit and Grind', shapes: [
      // Forged G with grind wheel teeth and an ice-edge slash.
      { d: 'M68 40 Q57 29 43 34 Q26 40 27 59 Q26 78 45 83 Q60 86 73 73 V58 H50 V67 H62 V70 Q56 76 47 75 Q35 72 35 60 Q35 44 47 42 Q55 41 61 47 Z', mode: 'trim' },
      { d: 'M25 48 L33 45 M24 58 H32 M26 70 L34 73 M42 27 L45 35 M56 28 L55 36 M70 37 L65 44', mode: 'accent-stroke', width: 3.5 },
      { d: 'M35 86 L70 80', mode: 'accent-stroke', width: 4 },
      { d: 'M41 86 L72 86', mode: 'stroke', width: 2.3 }
    ] },
    monChant: { label: 'Montreal Olé Chant', shapes: [
      // Heritage M with concentric arena-chant arcs, no hockey-league insignia.
      { d: 'M31 78 V40 L50 58 L69 40 V78 H60 V59 L50 69 L40 59 V78 Z', mode: 'trim' },
      { d: 'M24 47 Q20 34 32 26 M76 47 Q80 34 68 26', mode: 'accent-stroke', width: 4.1 },
      { d: 'M27 58 Q15 44 21 31 M73 58 Q85 44 79 31', mode: 'stroke', width: 2.9 },
      { d: 'M39 84 Q50 89 61 84', mode: 'stroke', width: 2.9 },
      { d: 'M46 32 H54', mode: 'accent-stroke', width: 3 }
    ] },
    pitGear: { label: 'Pittsburgh Black and Gold Gear', shapes: [
      // Bold eight-tooth industrial gear and a miniature original hockey jersey.
      { d: 'M43 29 H57 L60 36 L67 34 L73 41 L70 48 L77 53 V65 L70 68 L73 76 L66 83 L59 80 L56 87 H44 L41 80 L34 83 L27 76 L30 68 L23 65 V53 L30 48 L27 41 L34 34 L41 36 Z', mode: 'accent' },
      { d: 'M50 41 A18 18 0 1 0 50 77 A18 18 0 1 0 50 41 Z', mode: 'base' },
      { d: 'M39 52 L45 46 H55 L61 52 L68 55 L63 65 L59 63 V73 H41 V63 L37 65 L32 55 Z', mode: 'trim' },
      { d: 'M45 52 H55 M43 61 H57', mode: 'base-stroke', width: 2.8 },
      { d: 'M41 75 H59', mode: 'stroke', width: 2.5 }
    ] },
    // Batch three: original civic bell, northwoods, live music, and coastal rain.
    phiBell: { label: 'Philadelphia Bellline', shapes: [
      { d: 'M50 30 C43 30 40 35 40 43 V57 C40 64 36 68 31 72 H69 C64 68 60 64 60 57 V43 C60 35 57 30 50 30 Z', mode: 'accent' },
      { d: 'M44 73 C45 83 55 83 56 73 Z', mode: 'trim' },
      { d: 'M50 28 V25 M34 76 H66', mode: 'stroke', width: 3.7 },
      { d: 'M48 44 L52 50 L48 55 L54 64', mode: 'stroke', width: 2.7 },
      { d: 'M32 83 H68', mode: 'stroke', width: 3.3 },
      { d: 'M41 87 H59', mode: 'accent-stroke', width: 2.8 }
    ] },
    minNorth: { label: 'Minnesota Northwoods', shapes: [
      { d: 'M51 26 L55 34 L63 35 L57 41 L59 49 L51 45 L43 49 L45 41 L39 35 L47 34 Z', mode: 'accent' },
      { d: 'M51 46 L39 60 H45 L33 73 H69 L57 60 H63 Z', mode: 'trim' },
      { d: 'M47 70 H55 V83 H47 Z', mode: 'trim' },
      { d: 'M26 83 Q35 78 44 83 T62 83 T78 83', mode: 'accent-stroke', width: 3.5 },
      { d: 'M29 89 Q39 85 49 89 T71 89', mode: 'stroke', width: 2.7 }
    ] },
    nasRiff: { label: 'Nashville Music City Riff', shapes: [
      { d: 'M45 29 L56 29 V53 L60 58 L58 67 L45 67 L42 60 L45 54 Z', mode: 'accent' },
      { d: 'M45 30 L38 27 M45 38 L37 38 M56 31 L63 27 M56 39 L65 39', mode: 'stroke', width: 2.8 },
      { d: 'M48 32 V59 M51 32 V59 M54 32 V59', mode: 'trim-stroke', width: 1.7 },
      { d: 'M45 67 L45 81 Q46 87 54 87 H73 Q78 87 78 80 H62 Q57 80 56 75 L56 67 Z', mode: 'accent' },
      { d: 'M60 81 H75', mode: 'trim-stroke', width: 2.3 },
      { d: 'M27 48 V66 M32 52 V63 M73 45 V60 M79 49 V56', mode: 'stroke', width: 2.6 }
    ] },
    seaRain: { label: 'Seattle Rainline', shapes: [
      { d: 'M50 27 L54 39 H46 Z', mode: 'trim' },
      { d: 'M50 35 V75', mode: 'accent-stroke', width: 4.4 },
      { d: 'M35 47 H65 L58 54 H42 Z', mode: 'trim' },
      { d: 'M45 55 H55 L58 76 H42 Z', mode: 'accent' },
      { d: 'M27 39 L23 49 M77 39 L73 49 M31 53 L27 62 M69 53 L73 62', mode: 'stroke', width: 3 },
      { d: 'M23 81 Q35 69 47 81 T77 81', mode: 'trim-stroke', width: 4.1 },
      { d: 'M24 88 Q37 80 50 88 T77 88', mode: 'accent-stroke', width: 3.2 }
    ] },
    // Batch four: original takes on the warning siren, rally rat, electric
    // arena intro, and cowboy-hat tradition. No official marks are used.
    carSiren: { label: 'Carolina Hurricane Warning Siren', shapes: [
      // Sweeping twin alarm waves behind the loudspeaker dome.
      { d: 'M29 36 Q18 49 26 64 M71 36 Q82 49 74 64', mode: 'stroke', width: 3.8 },
      { d: 'M34 40 Q27 48 31 57 M66 40 Q73 48 69 57', mode: 'stroke', width: 2.5 },
      { d: 'M46 27 L54 27 L57 35 H43 Z', mode: 'trim' },
      { d: 'M29 55 L34 46 Q50 33 66 46 L71 55 Z', mode: 'trim' },
      { d: 'M35 53 L65 53 L61 60 H39 Z', mode: 'accent' },
      { d: 'M29 61 H71 V70 H29 Z', mode: 'trim' },
      { d: 'M38 64 V68 M44 64 V68 M50 64 V68 M56 64 V68 M62 64 V68', mode: 'base-stroke', width: 2.6 },
      { d: 'M46 70 H54 L56 83 H44 Z', mode: 'trim' },
      { d: 'M38 84 H62 M32 88 H68', mode: 'stroke', width: 3.1 }
    ] },
    flaRat: { label: 'Florida Blue Rally Rat', shapes: [
      // Navy-blue rat mascot, curved tail and white whiskers: entirely original.
      { d: 'M32 53 Q24 42 29 35 Q34 29 43 41 Q54 35 61 43 Q68 31 74 37 Q79 43 68 55 Q71 64 77 70 L72 78 Q57 86 44 82 Q30 78 29 65 Q28 59 32 53 Z', mode: 'accent' },
      { d: 'M33 40 Q37 38 41 47 M68 41 Q64 40 62 48', mode: 'stroke', width: 2.8 },
      { d: 'M42 58 Q46 54 50 58 Q54 54 58 58', mode: 'stroke', width: 2.7 },
      { d: 'M44 64 A3 3 0 1 0 50 64 A3 3 0 1 0 44 64 Z M55 64 A3 3 0 1 0 61 64 A3 3 0 1 0 55 64 Z', mode: 'gold' },
      { d: 'M60 72 L65 70 L63 75 Z', mode: 'gold' },
      { d: 'M63 74 L78 72 M61 77 L77 80 M42 73 L26 70 M42 77 L24 79', mode: 'stroke', width: 2.2 },
      { d: 'M37 81 Q22 90 22 76 Q23 68 29 68', mode: 'gold-stroke', width: 3.7 },
      { d: 'M46 83 Q56 89 66 83', mode: 'stroke', width: 2.5 }
    ] },
    tamCoil: { label: 'Tampa Tesla Coil Intro', shapes: [
      // Electric arc forks above a freestanding induction coil tower.
      { d: 'M36 35 L28 26 L33 42 L23 45 L35 49 M64 35 L72 26 L67 42 L77 45 L65 49', mode: 'stroke', width: 3.1 },
      { d: 'M50 23 L44 36 H52 L47 47 L61 30 H53 L58 23 Z', mode: 'trim' },
      { d: 'M42 47 H58 L62 54 L59 63 H41 L38 54 Z', mode: 'trim' },
      { d: 'M39 53 H61 M40 59 H60', mode: 'base-stroke', width: 3.5 },
      { d: 'M44 63 H56 V76 H44 Z', mode: 'trim' },
      { d: 'M44 67 H56 M44 72 H56', mode: 'base-stroke', width: 2.8 },
      { d: 'M39 77 H61 L64 84 H36 Z', mode: 'trim' },
      { d: 'M31 87 H69', mode: 'stroke', width: 3.4 },
      { d: 'M29 55 L21 61 L30 64 M71 55 L79 61 L70 64', mode: 'stroke', width: 2.7 }
    ] },
    dalHat: { label: 'Dallas Cowboy Hat', shapes: [
      // Wide swept-up Western hat with a distinct crown and woven band.
      { d: 'M33 61 Q38 55 37 40 Q39 35 45 41 Q50 46 55 41 Q61 35 64 41 L67 61 Q53 67 33 61 Z', mode: 'trim' },
      { d: 'M38 56 Q49 61 63 56 L64 62 Q51 67 36 62 Z', mode: 'accent' },
      { d: 'M22 67 Q25 63 34 64 Q50 72 66 64 Q76 61 80 67 Q72 82 50 82 Q28 82 22 67 Z', mode: 'trim' },
      { d: 'M26 68 Q50 82 75 68', mode: 'base-stroke', width: 3 },
      { d: 'M50 55 L52 59 L57 59 L53 63 L55 67 L50 64 L45 67 L47 63 L43 59 L48 59 Z', mode: 'trim' },
      { d: 'M36 87 H64', mode: 'stroke', width: 3 },
      { d: 'M42 91 H58', mode: 'stroke', width: 2.5 }
    ] },
    // Batch five: original marks inspired by Buffalo's hockey fan ritual,
    // Ottawa's Roman heritage, Columbus's cannon salute and Newark ironwork.
    bufBladeGang: { label: 'Buffalo Blade Gang Ritual', shapes: [
      // Crossed skate blades with boot fittings, a rally halo and a central puck.
      { d: 'M26 42 Q50 26 74 42', mode: 'accent-stroke', width: 4 },
      { d: 'M31 36 L70 83', mode: 'stroke', width: 5.6 },
      { d: 'M69 36 L30 83', mode: 'stroke', width: 5.6 },
      { d: 'M27 82 Q23 87 33 87 L41 81 M73 82 Q77 87 67 87 L59 81', mode: 'accent-stroke', width: 4 },
      { d: 'M36 42 L43 48 M57 48 L64 42', mode: 'accent-stroke', width: 3 },
      { d: 'M50 57 A9 9 0 1 0 50 75 A9 9 0 1 0 50 57 Z', mode: 'accent' },
      { d: 'M43 66 H57', mode: 'base-stroke', width: 2 },
      { d: 'M46 31 L50 24 L54 31', mode: 'stroke', width: 2.9 }
    ] },
    ottLegion: { label: 'Ottawa Roman Legion', shapes: [
      // Roman crested helmet drawn from basic geometric armor elements.
      { d: 'M34 43 Q40 30 53 32 Q67 34 67 50 L60 58 L43 58 L36 51 Z', mode: 'trim' },
      { d: 'M28 44 Q30 32 39 28 Q49 22 62 28 Q72 31 74 45 Q62 36 51 35 Q40 36 28 44 Z', mode: 'accent' },
      { d: 'M36 47 L64 47 L62 55 L45 55 L44 65 L60 65 Q57 78 46 81 L38 68 L36 55 Z', mode: 'trim' },
      { d: 'M46 55 L60 55 L56 62 H46 Z', mode: 'base' },
      { d: 'M44 68 L55 68 L49 75 Z', mode: 'accent' },
      { d: 'M31 51 L36 55 M64 55 L70 51', mode: 'stroke', width: 3.2 },
      { d: 'M35 85 Q50 90 65 85', mode: 'accent-stroke', width: 3.5 }
    ] },
    colCannon: { label: 'Columbus Cannon Salute', shapes: [
      // Broad cannon barrel, spoked wheel and three blast rays.
      { d: 'M28 58 L59 44 L67 49 L37 65 Z', mode: 'trim' },
      { d: 'M25 55 L34 52 L38 65 L29 68 Z', mode: 'accent' },
      { d: 'M62 49 L72 44 M66 39 L74 32 M70 54 L80 55', mode: 'stroke', width: 3.8 },
      { d: 'M75 38 L80 33 M75 46 L85 43', mode: 'silver-stroke', width: 2.7 },
      { d: 'M44 63 L61 74 L56 80 L40 69 Z', mode: 'accent' },
      { d: 'M50 64 A12 12 0 1 0 50 88 A12 12 0 1 0 50 64 Z', mode: 'silver' },
      { d: 'M50 68 A8 8 0 1 0 50 84 A8 8 0 1 0 50 68 Z', mode: 'base' },
      { d: 'M50 66 V86 M40 76 H60 M43 69 L57 83 M57 69 L43 83', mode: 'silver-stroke', width: 2 },
      { d: 'M28 90 H71', mode: 'stroke', width: 3 }
    ] },
    newIron: { label: 'Newark Ironbound', shapes: [
      // Newark-inspired industrial iron bridge, city towers and rivets.
      { d: 'M31 77 V59 H37 V47 H43 V54 H47 V38 H55 V52 H62 V44 H68 V77 Z', mode: 'accent' },
      { d: 'M49 43 H52 V48 H49 Z M39 58 H42 V63 H39 Z M59 56 H62 V61 H59 Z', mode: 'trim' },
      { d: 'M24 75 Q50 48 76 75', mode: 'stroke', width: 5 },
      { d: 'M24 77 H76', mode: 'stroke', width: 3.5 },
      { d: 'M31 69 V83 M39 62 V84 M50 59 V84 M61 62 V84 M69 69 V83', mode: 'trim-stroke', width: 2.6 },
      { d: 'M24 85 H76', mode: 'stroke', width: 3.5 },
      { d: 'M30 90 H70', mode: 'accent-stroke', width: 2.8 }
    ] },
    // Batch six: original crowd-chant, arena-fury, mountain-singalong and
    // rally-towel crests. The designs do not reproduce any licensed insignia.
    islYesWave: { label: 'Island Yes Chant', shapes: [
      // Three clear Y cheers form a rolling crowd wave beneath a sound halo.
      { d: 'M25 42 Q50 22 75 42', mode: 'accent-stroke', width: 4.2 },
      { d: 'M23 51 Q50 35 77 51', mode: 'stroke', width: 2.9 },
      { d: 'M28 53 L35 62 L42 53 M35 62 V75', mode: 'stroke', width: 5 },
      { d: 'M43 46 L50 55 L57 46 M50 55 V75', mode: 'stroke', width: 5.8 },
      { d: 'M58 53 L65 62 L72 53 M65 62 V75', mode: 'stroke', width: 5 },
      { d: 'M25 81 Q37 75 49 81 T75 81', mode: 'accent-stroke', width: 4.1 },
      { d: 'M30 88 Q40 84 50 88 T70 88', mode: 'stroke', width: 2.5 }
    ] },
    wasFury: { label: 'Washington Unleashed Fury', shapes: [
      // Angular F-shaped charge framed by fast slashes and a burst star.
      { d: 'M34 32 H73 L69 43 H46 L42 53 H66 L62 63 H38 L31 83 H20 Z', mode: 'trim' },
      { d: 'M41 35 H70 L67 40 H44 Z M39 56 H61 L59 60 H37 Z', mode: 'accent' },
      { d: 'M67 66 L72 75 L81 77 L74 83 L75 91 L67 87 L59 91 L61 82 L55 77 L64 75 Z', mode: 'accent' },
      { d: 'M29 44 L20 50 M32 59 L19 67 M34 75 L26 84', mode: 'stroke', width: 3 },
      { d: 'M73 31 L78 26 M79 48 L83 44', mode: 'stroke', width: 2.5 }
    ] },
    colAnthem: { label: 'Colorado Mountain Anthem', shapes: [
      // Original high-peak ridge and radiating chorus curves.
      { d: 'M22 72 L42 39 L51 55 L61 43 L80 72 Z', mode: 'trim' },
      { d: 'M36 49 L42 39 L49 52 L42 49 Z M56 50 L61 43 L67 53 L61 51 Z', mode: 'base' },
      { d: 'M26 80 Q39 72 50 80 T75 80', mode: 'accent-stroke', width: 3.8 },
      { d: 'M26 87 Q38 81 50 87 T74 87', mode: 'stroke', width: 2.9 },
      { d: 'M24 46 Q16 55 19 63 M76 46 Q84 55 81 63', mode: 'stroke', width: 3.2 },
      { d: 'M31 36 Q49 24 68 36', mode: 'accent-stroke', width: 2.8 },
      { d: 'M48 28 V38 M48 28 Q56 29 55 34 Q52 39 48 35', mode: 'accent-stroke', width: 2 }
    ] },
    stlTowel: { label: 'St. Louis Rally Towel Man', shapes: [
      // A cheering figure waves an oversized rally towel in a sweeping arc.
      { d: 'M50 52 A7 7 0 1 0 50 66 A7 7 0 1 0 50 52 Z', mode: 'gold' },
      { d: 'M44 65 Q50 69 56 65 L61 81 H39 Z', mode: 'trim' },
      { d: 'M45 68 L32 57 L25 46 M55 68 L66 54 L70 43', mode: 'stroke', width: 4.2 },
      { d: 'M63 28 Q75 24 81 35 L76 42 Q68 38 62 42 Q58 47 53 44 L54 34 Q60 37 63 28 Z', mode: 'trim' },
      { d: 'M58 30 Q72 19 83 27 M62 47 Q75 46 82 56', mode: 'gold-stroke', width: 3.7 },
      { d: 'M26 30 Q14 48 27 64', mode: 'gold-stroke', width: 3.4 },
      { d: 'M29 87 H71', mode: 'stroke', width: 3.5 }
    ] },
    // Batch seven: original tributes to Utah's tusk rally, the northern
    // crowd shout, Anaheim's hockey cheers and Edmonton's oil-country roots.
    utaTusks: { label: 'Utah Tusks Up Rally', shapes: [
      // Two proudly raised, inward-curving tusks frame a rocky high-desert peak.
      { d: 'M26 38 Q17 65 29 84 Q37 95 46 81 Q32 83 32 65 Q31 50 37 41 Z', mode: 'trim' },
      { d: 'M74 38 Q83 65 71 84 Q63 95 54 81 Q68 83 68 65 Q69 50 63 41 Z', mode: 'trim' },
      { d: 'M26 38 L37 41 L32 50 Z M74 38 L63 41 L68 50 Z', mode: 'accent' },
      { d: 'M37 70 L50 46 L63 70 Z', mode: 'accent' },
      { d: 'M45 55 L50 46 L55 55 L50 52 Z', mode: 'trim' },
      { d: 'M45 77 H55 M43 84 H57', mode: 'stroke', width: 3.1 },
      { d: 'M43 32 L50 25 L57 32', mode: 'stroke', width: 3.2 }
    ] },
    winNorth: { label: 'Winnipeg True North Call', shapes: [
      // Polar compass star above prairie horizon, with chant-echo arcs.
      { d: 'M50 25 L55 42 L72 47 L55 52 L50 69 L45 52 L28 47 L45 42 Z', mode: 'trim' },
      { d: 'M50 32 L53 44 L65 47 L53 50 L50 62 L47 50 L35 47 L47 44 Z', mode: 'accent' },
      { d: 'M50 36 V57 M40 47 H60', mode: 'base-stroke', width: 2.3 },
      { d: 'M30 68 Q50 56 70 68', mode: 'stroke', width: 3.8 },
      { d: 'M25 76 Q50 60 75 76', mode: 'accent-stroke', width: 3.2 },
      { d: 'M22 84 H78 M30 90 H70', mode: 'stroke', width: 3 },
      { d: 'M36 30 L30 26 M64 30 L70 26', mode: 'stroke', width: 2.6 }
    ] },
    anaFlight: { label: 'Anaheim Rally Flight', shapes: [
      // Original rising wing and three cheering speed trails; no duck symbol.
      { d: 'M24 73 Q39 42 78 31 Q65 48 55 52 L69 48 Q54 63 43 65 L57 63 Q40 79 24 73 Z', mode: 'trim' },
      { d: 'M31 69 Q48 48 70 40', mode: 'base-stroke', width: 3.3 },
      { d: 'M39 69 Q52 56 64 53', mode: 'accent-stroke', width: 3 },
      { d: 'M26 80 L52 80 M30 86 L60 86 M34 92 L51 92', mode: 'accent-stroke', width: 3.9 },
      { d: 'M31 38 L35 32 L39 38 M47 29 L51 23 L55 29', mode: 'stroke', width: 3 },
      { d: 'M70 67 L78 62', mode: 'stroke', width: 2.8 }
    ] },
    edmOil: { label: 'Edmonton Oil Country Identity', shapes: [
      // Industrial pump silhouette inside a bold rising oil droplet.
      { d: 'M50 24 C43 37 31 47 31 63 C31 77 39 85 50 85 C61 85 69 77 69 63 C69 47 57 37 50 24 Z', mode: 'trim' },
      { d: 'M50 39 C45 47 40 55 40 64 C40 73 44 77 50 77 C56 77 60 73 60 64 C60 55 55 47 50 39 Z', mode: 'accent' },
      { d: 'M37 62 H63 M43 58 L51 51 L57 58', mode: 'base-stroke', width: 3 },
      { d: 'M50 52 V70 M42 70 H58', mode: 'base-stroke', width: 2.9 },
      { d: 'M25 87 H75 M33 92 H67', mode: 'stroke', width: 3.4 },
      { d: 'M30 40 L24 46 M70 40 L76 46', mode: 'stroke', width: 2.7 }
    ] },
    // Batch eight: original crests celebrating arena royal chants, shark
    // chomps, the glittering clock chain and the victory flamingo tradition.
    laRoyal: { label: 'Los Angeles Royal Army', shapes: [
      { d: 'M25 44 L31 28 L41 41 L50 23 L59 41 L69 28 L75 44 L70 63 H30 Z', mode: 'trim' },
      { d: 'M30 48 H70 L67 56 H33 Z', mode: 'accent' },
      { d: 'M31 66 H69 L72 73 H28 Z', mode: 'trim' },
      { d: 'M38 37 L41 42 L44 37 M47 33 L50 28 L53 33 M56 37 L59 42 L62 37', mode: 'base-stroke', width: 2.7 },
      { d: 'M35 77 L65 86 M65 77 L35 86', mode: 'stroke', width: 3.7 },
      { d: 'M32 88 H68', mode: 'accent-stroke', width: 3 },
      { d: 'M46 55 H54', mode: 'base-stroke', width: 2.4 }
    ] },
    sjChomp: { label: 'San Jose Shark Chomp', shapes: [
      { d: 'M24 44 Q41 28 59 36 L67 27 L70 44 Q78 51 77 61 Q65 65 55 60 L38 72 Q28 67 23 56 Z', mode: 'trim' },
      { d: 'M30 52 Q43 43 63 49 L72 55 L61 60 L43 55 L34 63 Z', mode: 'base' },
      { d: 'M34 56 L39 65 L43 57 L47 62 L51 56 L55 60 L60 54 L64 58', mode: 'accent-stroke', width: 2.8 },
      { d: 'M39 42 A3 3 0 1 0 45 42 A3 3 0 1 0 39 42 Z', mode: 'base' },
      { d: 'M52 73 Q62 79 75 70', mode: 'stroke', width: 3.5 },
      { d: 'M27 80 Q39 73 48 82', mode: 'accent-stroke', width: 3.7 },
      { d: 'M28 88 H72', mode: 'stroke', width: 3 }
    ] },
    vanClock: { label: 'Vancouver Bedazzled Clock Chain', shapes: [
      { d: 'M37 26 Q25 39 34 53 M63 26 Q75 39 66 53', mode: 'stroke', width: 4.3 },
      { d: 'M38 30 L43 35 M31 38 L37 42 M30 48 L35 52 M62 30 L57 35 M69 38 L63 42 M70 48 L65 52', mode: 'gold-stroke', width: 2.8 },
      { d: 'M50 37 A24 24 0 1 0 50 85 A24 24 0 1 0 50 37 Z', mode: 'trim' },
      { d: 'M50 43 A18 18 0 1 0 50 79 A18 18 0 1 0 50 43 Z', mode: 'base' },
      { d: 'M50 47 V62 L61 68', mode: 'stroke', width: 3.2 },
      { d: 'M50 45 V49 M50 75 V79 M31 61 H35 M65 61 H69', mode: 'gold-stroke', width: 2.8 },
      { d: 'M26 32 L29 24 L32 32 L40 35 L32 38 L29 46 L26 38 L18 35 Z', mode: 'gold' },
      { d: 'M73 69 L76 63 L79 69 L85 72 L79 75 L76 81 L73 75 L67 72 Z', mode: 'gold' }
    ] },
    vegFlamingo: { label: 'Vegas Victory Flamingo Toss', shapes: [
      { d: 'M48 73 Q36 63 41 53 Q46 43 53 49 Q62 58 59 40 Q57 31 66 29 Q75 28 76 36 Q78 43 69 47 Q64 54 67 62 Q75 77 59 82 Q52 83 48 73 Z', mode: 'trim' },
      { d: 'M48 56 Q41 51 37 59 Q37 70 51 77 Q62 82 67 73 Q57 72 54 66 Z', mode: 'accent' },
      { d: 'M76 36 L84 39 L77 43 Z', mode: 'gold' },
      { d: 'M68 34 A2 2 0 1 0 72 34 A2 2 0 1 0 68 34 Z', mode: 'base' },
      { d: 'M52 80 L47 90 M61 79 L67 90', mode: 'stroke', width: 3.2 },
      { d: 'M28 45 Q31 29 47 27 M24 58 Q19 48 25 35', mode: 'gold-stroke', width: 3.4 },
      { d: 'M33 84 Q40 90 47 87', mode: 'accent-stroke', width: 2.8 }
    ] },
    // Country flags are public national symbols, not hockey federation marks.
    // Geometric flag motifs use a shared shield and render identically in
    // the SVG team picker and the rink's Canvas 2D crest renderer.
    natUSA: { label: 'USA Flag', shapes: [
      { d: 'M22 37 H78 V77 H22 Z', mode:'flag-white' },
      { d: 'M22 37 H78 V43 H22 Z M22 49 H78 V55 H22 Z M22 61 H78 V67 H22 Z M22 73 H78 V77 H22 Z', mode:'flag-us-red' },
      { d: 'M22 37 H48 V60 H22 Z', mode:'flag-us-blue' },
      { d: 'M29 42 L30 45 L33 45 L31 47 L32 50 L29 48 L26 50 L27 47 L25 45 L28 45 Z M40 42 L41 45 L44 45 L42 47 L43 50 L40 48 L37 50 L38 47 L36 45 L39 45 Z M34 51 L35 53 L38 53 L36 55 L37 57 L34 55 L31 57 L32 55 L30 53 L33 53 Z', mode:'flag-white' }
    ] },
    natCanada: { label: 'Canada Flag', shapes: [
      { d:'M22 37 H78 V77 H22 Z', mode:'flag-white' },
      { d:'M22 37 H35 V77 H22 Z M65 37 H78 V77 H65 Z', mode:'flag-canada-red' },
      { d:'M50 41 L54 49 L58 46 L57 53 L64 53 L59 59 L61 64 L53 63 L52 73 H48 L47 63 L39 64 L41 59 L36 53 L43 53 L42 46 L46 49 Z', mode:'flag-canada-red' }
    ] },
    natSweden: { label: 'Sweden Flag', shapes: [
      { d:'M22 37 H78 V77 H22 Z', mode:'flag-sweden-blue' },
      { d:'M40 37 H49 V77 H40 Z M22 52 H78 V62 H22 Z', mode:'flag-sweden-yellow' }
    ] },
    natFinland: { label: 'Finland Flag', shapes: [
      { d:'M22 37 H78 V77 H22 Z', mode:'flag-white' },
      { d:'M39 37 H49 V77 H39 Z M22 51 H78 V62 H22 Z', mode:'flag-finland-blue' }
    ] },
    natCzechia: { label: 'Czechia Flag', shapes: [
      { d:'M22 37 H78 V77 H22 Z', mode:'flag-white' },
      { d:'M22 57 H78 V77 H22 Z', mode:'flag-czech-red' },
      { d:'M22 37 L52 57 L22 77 Z', mode:'flag-czech-blue' }
    ] },
    natSlovakia: { label: 'Slovakia Flag', shapes: [
      { d:'M22 37 H78 V77 H22 Z', mode:'flag-white' },
      { d:'M22 50 H78 V64 H22 Z', mode:'flag-slovakia-blue' },
      { d:'M22 64 H78 V77 H22 Z', mode:'flag-slovakia-red' },
      { d:'M33 47 H50 V69 Q42 75 33 69 Z', mode:'flag-slovakia-red' },
      { d:'M40 49 H43 V65 H40 Z M35 54 H48 V57 H35 Z M37 60 H46 V63 H37 Z', mode:'flag-white' }
    ] },
    natGermany: { label: 'Germany Flag', shapes: [
      { d:'M22 37 H78 V77 H22 Z', mode:'flag-germany-black' },
      { d:'M22 50 H78 V64 H22 Z', mode:'flag-germany-red' },
      { d:'M22 64 H78 V77 H22 Z', mode:'flag-germany-gold' }
    ] },
    natSwitzerland: { label: 'Switzerland Flag', shapes: [
      { d:'M28 35 H72 V79 H28 Z', mode:'flag-swiss-red' },
      { d:'M45 43 H55 V71 H45 Z M36 52 H64 V62 H36 Z', mode:'flag-white' }
    ] }

  };
  const CITY_CLUBS = {
    newyork: { name: 'Empire Salute', location: 'New York', primary: '#0038a8', secondary: '#ce1126', trim: '#ffffff', crest: 'nySalute', club: 'newyork' },
    detroit: { name: 'Motor City Octopus', location: 'Detroit', primary: '#ce1126', secondary: '#ffffff', trim: '#ffffff', crest: 'detOctopus', club: 'detroit' },
    chicago: { name: 'Chicago Curve', location: 'Chicago', primary: '#121318', secondary: '#cf0a2c', trim: '#f4e9d8', crest: 'chiCurve', club: 'chicago' },
    calgary: { name: 'Prairie Fire', location: 'Calgary', primary: '#c8102e', secondary: '#f1be48', trim: '#ffffff', crest: 'calFire', club: 'calgary' },
    boston: { name: 'Boston Banner', location: 'Boston', primary: '#101010', secondary: '#ffb81c', trim: '#ffffff', crest: 'bosBanner', club: 'boston' },
    toronto: { name: 'Toronto Grind', location: 'Toronto', primary: '#00205b', secondary: '#ffffff', trim: '#ffffff', crest: 'torGrind', club: 'toronto' },
    montreal: { name: 'Montreal Olé', location: 'Montreal', primary: '#af1e2d', secondary: '#192168', trim: '#ffffff', crest: 'monChant', club: 'montreal' },
    pittsburgh: { name: 'Pittsburgh Gear', location: 'Pittsburgh', primary: '#111111', secondary: '#fcb514', trim: '#ffffff', crest: 'pitGear', club: 'pittsburgh' },
    philadelphia: { name: 'Philly Bellline', location: 'Philadelphia', primary: '#f74902', secondary: '#000000', trim: '#ffffff', crest: 'phiBell', club: 'philadelphia' },
    minnesota: { name: 'Minnesota Northwoods', location: 'Minnesota', primary: '#154734', secondary: '#a6192e', trim: '#ddcba4', crest: 'minNorth', club: 'minnesota' },
    nashville: { name: 'Nashville Riff', location: 'Nashville', primary: '#ffb81c', secondary: '#041e42', trim: '#ffffff', crest: 'nasRiff', club: 'nashville' },
    seattle: { name: 'Seattle Rainline', location: 'Seattle', primary: '#001628', secondary: '#99d9d9', trim: '#ffffff', crest: 'seaRain', club: 'seattle' },
    carolina: { name: 'Carolina Warning', location: 'Carolina', primary: '#cc0000', secondary: '#111111', trim: '#ffffff', crest: 'carSiren', club: 'carolina' },
    florida: { name: 'Florida Blue Rat', location: 'Florida', primary: '#c8102e', secondary: '#041e42', trim: '#ffffff', crest: 'flaRat', club: 'florida' },
    tampa: { name: 'Tampa Coil', location: 'Tampa Bay', primary: '#002868', secondary: '#101820', trim: '#ffffff', crest: 'tamCoil', club: 'tampa' },
    dallas: { name: 'Dallas Brimline', location: 'Dallas', primary: '#006847', secondary: '#111111', trim: '#c4ced4', crest: 'dalHat', club: 'dallas' },
    buffalo: { name: 'Buffalo Blade Gang', location: 'Buffalo', primary: '#003087', secondary: '#ffb81c', trim: '#ffffff', crest: 'bufBladeGang', club: 'buffalo' },
    ottawa: { name: 'Ottawa Legion', location: 'Ottawa', primary: '#151515', secondary: '#c52032', trim: '#c2912c', crest: 'ottLegion', club: 'ottawa' },
    columbus: { name: 'Columbus Cannonfire', location: 'Columbus', primary: '#002654', secondary: '#ce1126', trim: '#ffffff', crest: 'colCannon', club: 'columbus' },
    newjersey: { name: 'Newark Ironbound', location: 'Newark, New Jersey', primary: '#ce1126', secondary: '#151515', trim: '#ffffff', crest: 'newIron', club: 'newjersey' },
    islanders: { name: 'Island Yes Wave', location: 'Long Island, New York', primary: '#00539b', secondary: '#f47d30', trim: '#ffffff', crest: 'islYesWave', club: 'islanders' },
    washington: { name: 'Washington Fury', location: 'Washington, DC', primary: '#c8102e', secondary: '#041e42', trim: '#ffffff', crest: 'wasFury', club: 'washington' },
    colorado: { name: 'Colorado Anthem', location: 'Colorado', primary: '#6f263d', secondary: '#236192', trim: '#ffffff', crest: 'colAnthem', club: 'colorado' },
    stlouis: { name: 'St. Louis Towel Wave', location: 'St. Louis', primary: '#002f87', secondary: '#fcb514', trim: '#ffffff', crest: 'stlTowel', club: 'stlouis' },
    utah: { name: 'Utah Tusks Up', location: 'Utah', primary: '#15171a', secondary: '#79cfe8', trim: '#ffffff', crest: 'utaTusks', club: 'utah' },
    winnipeg: { name: 'Winnipeg True North', location: 'Winnipeg', primary: '#041e42', secondary: '#5b92c7', trim: '#d2d9e1', crest: 'winNorth', club: 'winnipeg' },
    anaheim: { name: 'Anaheim Rally Flight', location: 'Anaheim', primary: '#111111', secondary: '#f47a38', trim: '#d6a85e', crest: 'anaFlight', club: 'anaheim' },
    edmonton: { name: 'Edmonton Oil Country', location: 'Edmonton', primary: '#041e42', secondary: '#ff4c00', trim: '#ffffff', crest: 'edmOil', club: 'edmonton' },
    losangeles: { name: 'Los Angeles Royal Army', location: 'Los Angeles', primary: '#111111', secondary: '#a7a9ac', trim: '#ffffff', crest: 'laRoyal', club: 'losangeles' },
    sanjose: { name: 'San Jose Chomp', location: 'San Jose', primary: '#006d75', secondary: '#ea7200', trim: '#ffffff', crest: 'sjChomp', club: 'sanjose' },
    vancouver: { name: 'Vancouver Clock Chain', location: 'Vancouver', primary: '#00205b', secondary: '#00843d', trim: '#ffffff', crest: 'vanClock', club: 'vancouver' },
    vegas: { name: 'Vegas Flamingo Toss', location: 'Las Vegas', primary: '#333f42', secondary: '#d4af37', trim: '#ffffff', crest: 'vegFlamingo', club: 'vegas' }
  };
  const NATIONAL_TEAMS = {
    usa: { name: 'USA', primary: '#002868', secondary: '#bf0a30', trim: '#ffffff', crest: 'natUSA', nation: 'usa' },
    canada: { name: 'Canada', primary: '#d80621', secondary: '#ffffff', trim: '#ffffff', crest: 'natCanada', nation: 'canada' },
    sweden: { name: 'Sweden', primary: '#006aa7', secondary: '#fecc00', trim: '#ffffff', crest: 'natSweden', nation: 'sweden' },
    finland: { name: 'Finland', primary: '#ffffff', secondary: '#002f6c', trim: '#002f6c', crest: 'natFinland', nation: 'finland' },
    czechia: { name: 'Czechia', primary: '#ffffff', secondary: '#d7141a', trim: '#11457e', crest: 'natCzechia', nation: 'czechia' },
    slovakia: { name: 'Slovakia', primary: '#ffffff', secondary: '#0b4ea2', trim: '#ee1c25', crest: 'natSlovakia', nation: 'slovakia' },
    germany: { name: 'Germany', primary: '#111111', secondary: '#dd0000', trim: '#ffce00', crest: 'natGermany', nation: 'germany' },
    switzerland: { name: 'Switzerland', primary: '#da291c', secondary: '#ffffff', trim: '#ffffff', crest: 'natSwitzerland', nation: 'switzerland' }
  };
  const normalizeCrest = value => typeof value === 'string' && Object.hasOwn(CREST_ART, value) ? value : 'monogram';
  const SHIELD_OUTER = 'M50 4 L88 17 L86 61 Q82 91 50 113 Q18 91 14 61 L12 17 Z';
  const SHIELD_INNER = 'M50 14 L79 24 L77 61 Q74 83 50 101 Q26 83 23 61 L21 24 Z';
  const validHex = color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);
  function normalizeTeam(value) {
    const fallback = TEAM_PRESETS.broadway;
    return {
      name: typeof value?.name === 'string' ? (value.name.trim().slice(0, 24) || fallback.name) : fallback.name,
      primary: validHex(value?.primary) ? value.primary.toLowerCase() : fallback.primary,
      secondary: validHex(value?.secondary) ? value.secondary.toLowerCase() : fallback.secondary,
      trim: validHex(value?.trim) ? value.trim.toLowerCase() : fallback.trim,
      crest: normalizeCrest(value?.crest),
      club: typeof value?.club === 'string' && Object.hasOwn(CITY_CLUBS, value.club) && !(typeof value?.nation === 'string' && Object.hasOwn(NATIONAL_TEAMS, value.nation)) ? value.club : null,
      nation: typeof value?.nation === 'string' && Object.hasOwn(NATIONAL_TEAMS, value.nation) ? value.nation : null
    };
  }
  const FLAG_PAINT = {
    'flag-white': '#ffffff', 'flag-us-red': '#b31942', 'flag-us-blue': '#0a3161',
    'flag-canada-red': '#d80621', 'flag-sweden-blue': '#006aa7', 'flag-sweden-yellow': '#fecc00',
    'flag-finland-blue': '#002f6c', 'flag-czech-red': '#d7141a', 'flag-czech-blue': '#11457e',
    'flag-slovakia-blue': '#0b4ea2', 'flag-slovakia-red': '#ee1c25',
    'flag-germany-black': '#111111', 'flag-germany-red': '#dd0000', 'flag-germany-gold': '#ffce00',
    'flag-swiss-red': '#da291c'
  };
  function artPaint(shape, team) {
    if (Object.hasOwn(FLAG_PAINT, shape.mode)) return FLAG_PAINT[shape.mode];
    if (shape.mode === 'gold' || shape.mode === 'gold-stroke') return '#b9975b';
    if (shape.mode === 'silver' || shape.mode === 'silver-stroke') return '#b5c1d0';
    if (shape.mode === 'accent' || shape.mode === 'cutout' || shape.mode === 'accent-stroke') return team.secondary;
    if (shape.mode === 'base' || shape.mode === 'base-stroke') return team.primary;
    return team.trim;
  }
  function artIsStroke(shape) { return ['stroke','accent-stroke','base-stroke','trim-stroke','gold-stroke','silver-stroke'].includes(shape.mode); }
  function makeCrestSvg(team, className = '') {
    const svgNS = 'http://www.w3.org/2000/svg';
    const create = (tag, attrs) => {
      const node = document.createElementNS(svgNS, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
      return node;
    };
    const svg = create('svg', { viewBox: '0 0 100 116', 'aria-hidden': 'true', class: className });
    svg.append(create('path', { d: SHIELD_OUTER, fill: team.secondary, stroke: team.trim, 'stroke-width': 2.4 }));
    svg.append(create('path', { d: SHIELD_INNER, fill: team.primary, stroke: team.trim, 'stroke-width': 1.5 }));
    svg.append(create('path', { d: 'M30 28 H70', fill: 'none', stroke: team.trim, 'stroke-width': 2, opacity: .65 }));
    if (team.crest === 'monogram') {
      const label = create('text', {
        x: 50, y: 69, 'font-family': 'system-ui, sans-serif',
        'font-weight': 1000, 'font-size': 29,
        'text-anchor': 'middle', 'letter-spacing': -1.5, fill: team.trim
      });
      label.textContent = initialsFor(team.name);
      svg.append(label);
    } else {
      for (const shape of CREST_ART[team.crest].shapes) {
        const attrs = { d: shape.d, fill: artIsStroke(shape) ? 'none' : artPaint(shape, team) };
        if (artIsStroke(shape)) {
          attrs.stroke = artPaint(shape, team);
          attrs['stroke-width'] = shape.width || 5.5;
          attrs['stroke-linecap'] = 'round';
          attrs['stroke-linejoin'] = 'round';
        }
        svg.append(create('path', attrs));
      }
    }
    return svg;
  }
  function renderCrest(node, team, className = '') {
    node.replaceChildren(makeCrestSvg(team, className));
  }
  function drawIceCrest(team) {
    // Share the same shield geometry and symbol paths as the SVG preview.
    // The center-ice logo is decorative; older test contexts without Path2D
    // use the initials fallback.
    ctx.save();
    ctx.globalAlpha = .58;
    if (typeof Path2D === 'function') {
      ctx.translate(-27, -42);
      ctx.scale(.54, .54);
      ctx.fillStyle = team.secondary; ctx.strokeStyle = team.trim; ctx.lineWidth = 2.4;
      const outer = new Path2D(SHIELD_OUTER);
      ctx.fill(outer); ctx.stroke(outer);
      ctx.fillStyle = team.primary; ctx.lineWidth = 1.5;
      const inner = new Path2D(SHIELD_INNER);
      ctx.fill(inner); ctx.stroke(inner);
      ctx.strokeStyle = team.trim; ctx.lineWidth = 2; ctx.globalAlpha = .3;
      ctx.beginPath(); ctx.moveTo(30, 28); ctx.lineTo(70, 28); ctx.stroke();
      ctx.globalAlpha = .58;
      if (team.crest === 'monogram') {
        ctx.fillStyle = team.trim; ctx.font = '1000 29px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(initialsFor(team.name), 50, 69, 54);
      } else {
        for (const shape of CREST_ART[team.crest].shapes) {
          const path = new Path2D(shape.d);
          if (artIsStroke(shape)) {
            ctx.strokeStyle = artPaint(shape, team); ctx.lineWidth = shape.width || 5.5;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path);
          } else {
            ctx.fillStyle = artPaint(shape, team);
            ctx.fill(path);
          }
        }
      }
    } else {
      ctx.fillStyle = team.primary; ctx.font = '1000 25px system-ui, sans-serif';
      ctx.fillText(initialsFor(team.name), 0, 0, 57);
    }
    ctx.restore();
  }
  function loadTeam() {
    try { return normalizeTeam(JSON.parse(devStorage.getItem(TEAM_KEY))); }
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

  // Player records live on this browser only. They are not online accounts or
  // public leaderboards. Separate arcade records are reserved for future modes.
  function emptyRecord(best = 0) {
    return { best: Math.max(0, Number(best) || 0), rounds: 0,
      goals: 0, shots: 0, saves: 0, misses: 0 };
  }
  function cleanPlayerName(value) {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 18) : '';
  }
  function loadProfileDB() {
    const blank = { players: [], activeId: null, legacyClaimed: false };
    try {
      const data = JSON.parse(devStorage.getItem(PROFILE_DB_KEY));
      if (!data || !Array.isArray(data.players)) return blank;
      const players = data.players.filter(p => p && typeof p.id === 'string' && cleanPlayerName(p.name)).map(p => ({
        id: p.id, name: cleanPlayerName(p.name),
        team: normalizeTeam(p.team),
        logoVariant: typeof p.logoVariant === 'string' && ['power','speed','ice'].includes(p.logoVariant)
          ? p.logoVariant : 'power',
        difficulty: Object.hasOwn(DIFFICULTIES, p.difficulty) ? p.difficulty : 'beer',
        records: p.records && typeof p.records === 'object' ? p.records : {}
      }));
      return { players, activeId: data.activeId, legacyClaimed: !!data.legacyClaimed };
    } catch { return blank; }
  }
  const LOGO_VARIANTS = {
    power: { name: 'A · POWER PLAY', symbol: '#frostline-power' },
    speed: { name: 'B · SPEED RUSH', symbol: '#frostline-speed' },
    ice: { name: 'C · ICE CUT', symbol: '#frostline-ice' }
  };
  const normalizeLogo = value => Object.hasOwn(LOGO_VARIANTS, value) ? value : 'power';

  const profileDB = loadProfileDB();
  function saveProfileDB() {
    try { devStorage.setItem(PROFILE_DB_KEY, JSON.stringify(profileDB)); }
    catch { /* Private browsing / full storage: game remains playable for this session. */ }
  }
  function getRecord(difficulty, profile = game.profile) {
    if (!profile) return emptyRecord();
    if (!profile.records || typeof profile.records !== 'object') profile.records = {};
    if (!profile.records[GAME_STYLE] || typeof profile.records[GAME_STYLE] !== 'object') {
      profile.records[GAME_STYLE] = {};
    }
    if (!profile.records[GAME_STYLE][difficulty]) profile.records[GAME_STYLE][difficulty] = emptyRecord();
    const record = profile.records[GAME_STYLE][difficulty];
    for (const field of ['best', 'rounds', 'goals', 'shots', 'saves', 'misses']) {
      record[field] = Math.max(0, Number(record[field]) || 0);
    }
    return record;
  }
  function readBest(difficulty) { return getRecord(difficulty).best; }
  function saveBest(n) {
    if (!game.profile) return;
    const record = getRecord(game.difficulty);
    if (n > record.best) {
      record.best = n;
      saveProfileDB();
    }
  }
  function legacyBest(difficulty) {
    try {
      const current = devStorage.getItem('frostline-shootout-high-score-' + difficulty + '-v1');
      const prior = difficulty === 'show' ? devStorage.getItem(LEGACY_HIGH_SCORE_KEY) : null;
      return Math.max(0, Number(current) || 0, Number(prior) || 0);
    } catch { return 0; }
  }

  const game = {
    mode: 'idle', remaining: ROUND_SECONDS, elapsed: 0, bestAtStart: 0,
    difficulty: initialDifficulty, team: loadTeam(), profile: null,
    goals: 0, shots: 0, saves: 0, misses: 0, best: 0,
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

  // The cabinet has the same compact proportions on desktop and mobile.
  // When the entire rink becomes small (including a short desktop window),
  // shrink the menu uniformly instead of letting labels spill or show scrollbars.
  function fitOverlayCard() {
    if (overlay.hidden) return;
    const card = overlay.querySelector('.overlay-card');
    if (!card || !overlay.clientWidth || !overlay.clientHeight) return;
    card.style.setProperty('--overlay-fit', '1');
    const availableWidth = Math.max(1, overlay.clientWidth - 16);
    const availableHeight = Math.max(1, overlay.clientHeight - 16);
    const neededWidth = Math.max(card.scrollWidth || 0, card.offsetWidth || 0, 1);
    const neededHeight = Math.max(card.scrollHeight || 0, card.offsetHeight || 0, 1);
    const scale = Math.min(1, availableWidth / neededWidth, availableHeight / neededHeight);
    card.style.setProperty('--overlay-fit', scale.toFixed(3));
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
    if (game.profile) {
      game.profile.difficulty = id;
      saveProfileDB();
    }
    updateHUD();
    fitOverlayCard();
  }
  difficultyButtons.forEach(button => button.addEventListener('click', () => setDifficulty(button.dataset.difficulty)));
  setDifficulty(initialDifficulty);

  function startGame() {
    if (!game.profile) { openPlayerDialog(); return; }
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
    overlay.classList.remove('results');
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
    overlay.classList.add('results');
    if (game.profile) {
      const record = getRecord(game.difficulty);
      record.rounds += 1;
      record.goals += game.goals;
      record.shots += game.shots;
      record.saves += game.saves;
      record.misses += game.misses;
      record.best = Math.max(record.best, game.goals);
      saveProfileDB();
    }
    game.aiming = null;
    game.cooldown = 0;
    game.toastTimer = 0;
    toast.className = 'shot-toast';
    const newRecord = game.goals > game.bestAtStart;
    $('overlayTitle').innerHTML = newRecord ? `NEW PERSONAL<br><em>BEST!</em>` : `TIME'S UP.<br><em>GOOD HUSTLE.</em>`;
    $('overlayCopy').textContent = newRecord
      ? 'The goalie is already studying the replay. Ready to go again?'
      : 'Thirty seconds goes fast. Find the corners and beat the goalie next round.';
    $('overlayHint').textContent = 'ARCADE SHOOTOUT · MORE MODES COMING';
    $('overlay').querySelector('.overlay-kicker').textContent = 'ARCADE SHOOTOUT · FINAL BUZZER';
    const summary = $('endSummary');
    summary.hidden = false;
    summary.innerHTML = `<div><span>GOALS</span><strong>${game.goals}</strong></div>` +
      `<div><span>SHOTS</span><strong>${game.shots}</strong></div>` +
      `<div><span>ACCURACY</span><strong>${game.shots ? Math.round(100 * game.goals / game.shots) : 0}%</strong></div>`;
    $('playButton').innerHTML = 'PLAY AGAIN <span aria-hidden="true">↗</span>';
    overlay.hidden = false;
    $('controlHint').textContent = 'ROUND COMPLETE  ·  BEAT YOUR RECORD';
    updateHUD();
    fitOverlayCard();
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
    drawIceCrest(game.team);
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
    fitOverlayCard();
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

  // Team editing is restricted to the welcome / replay menu; active rounds continue unchanged.
  const teamDialog = $('teamDialog');
  const teamNameInput = $('teamNameInput');
  const teamPrimary = $('teamPrimary');
  const teamSecondary = $('teamSecondary');
  const teamTrim = $('teamTrim');
  const presetButtons = [...document.querySelectorAll('[data-team-preset]')];
  const crestButtons = [...document.querySelectorAll('[data-team-crest]')];
  const cityButtons = [...document.querySelectorAll('[data-city-club]')];
  const nationButtons = [...document.querySelectorAll('[data-national-team]')];
  const cityClubGallery = $('cityClubGallery');
  const nationalTeamGallery = $('nationalTeamGallery');
  let crestDraft = 'monogram';
  let clubDraft = null;
  let nationDraft = null;
  crestButtons.forEach(button => button.addEventListener('click', () => {
    crestDraft = normalizeCrest(button.dataset.teamCrest);
    clubDraft = null;
    nationDraft = null;
    updateTeamPreview();
  }));
  cityButtons.forEach(button => button.addEventListener('click', () => {
    const club = CITY_CLUBS[button.dataset.cityClub];
    if (!club) return;
    teamNameInput.value = club.name;
    teamPrimary.value = club.primary;
    teamSecondary.value = club.secondary;
    teamTrim.value = club.trim;
    crestDraft = club.crest;
    clubDraft = club.club;
    nationDraft = null;
    nationalTeamGallery.open = false;
    updateTeamPreview();
  }));
  nationButtons.forEach(button => button.addEventListener('click', () => {
    const country = NATIONAL_TEAMS[button.dataset.nationalTeam];
    if (!country) return;
    teamNameInput.value = country.name;
    teamPrimary.value = country.primary;
    teamSecondary.value = country.secondary;
    teamTrim.value = country.trim;
    crestDraft = country.crest;
    nationDraft = country.nation;
    clubDraft = null;
    cityClubGallery.open = false;
    updateTeamPreview();
  }));
  function applyTeam(team) {
    game.team = normalizeTeam(team);
    if (game.profile) {
      game.profile.team = { ...game.team };
      saveProfileDB();
    }
    const root = document.documentElement.style;
    root.setProperty('--team-primary', game.team.primary);
    root.setProperty('--team-secondary', game.team.secondary);
    root.setProperty('--team-trim', game.team.trim);
    const red = parseInt(game.team.secondary.slice(1,3),16);
    const green = parseInt(game.team.secondary.slice(3,5),16);
    const blue = parseInt(game.team.secondary.slice(5,7),16);
    root.setProperty('--team-action-ink', (.299*red+.587*green+.114*blue)>158 ? '#06142b' : '#ffffff');
    root.setProperty('--team-highlight', mixHex(game.team.primary, '#ffffff', .58));
    root.setProperty('--team-deep', mixHex(game.team.primary, '#071020', .72));
    root.setProperty('--team-darker', mixHex(game.team.primary, '#020914', .91));
    $('teamNameDisplay').textContent = game.team.name.toUpperCase();
    renderCrest($('headerTeamCrest'), game.team, 'small-team-crest');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mixHex(game.team.primary, '#020914', .91));
  }
  function currentEditorTeam() {
    return normalizeTeam({ name:teamNameInput.value, primary:teamPrimary.value,
      secondary:teamSecondary.value, trim:teamTrim.value, crest:crestDraft, club:clubDraft, nation:nationDraft });
  }
  function updateTeamPreview() {
    const team = currentEditorTeam();
    renderCrest($('previewTeamCrest'), team, 'large-team-crest');
    $('previewTeamCrest').setAttribute('aria-label', team.name + ' ' + CREST_ART[team.crest].label + ' shield');
    crestButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.teamCrest === team.crest));
      renderCrest(button.querySelector('.crest-choice-preview'), { ...team, crest: button.dataset.teamCrest }, 'option-team-crest');
    });
    cityButtons.forEach(button => {
      const club = CITY_CLUBS[button.dataset.cityClub];
      button.setAttribute('aria-pressed', String(clubDraft === button.dataset.cityClub));
      renderCrest(button.querySelector('.city-club-icon'), club, 'city-club-shield');
    });
    nationButtons.forEach(button => {
      const country = NATIONAL_TEAMS[button.dataset.nationalTeam];
      button.setAttribute('aria-pressed', String(nationDraft === button.dataset.nationalTeam));
      renderCrest(button.querySelector('.national-team-icon'), country, 'city-club-shield');
    });
    $('nationalTeamSummary').textContent = team.nation
      ? 'Selected: ' + NATIONAL_TEAMS[team.nation].name
      : 'Browse 8 national teams';
    // Show the current choice without forcing the user to expand a long list.
    $('cityClubSummary').textContent = team.club
      ? 'Selected: ' + CITY_CLUBS[team.club].name
      : 'Browse 32 original city teams';
    $('previewTeamName').textContent = team.name.toUpperCase();
    const preview = document.querySelector('.team-preview');
    preview.style.setProperty('--preview-primary', team.primary);
    preview.style.setProperty('--preview-secondary', team.secondary);
    preview.style.setProperty('--preview-trim', team.trim);
    const chosen = Object.keys(TEAM_PRESETS).find(id => {
      const t = TEAM_PRESETS[id];
      return t.name === team.name && t.primary === team.primary && t.secondary === team.secondary && t.trim === team.trim;
    });
    presetButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.teamPreset === chosen)));
  }
  function openTeamEditor(firstTime = false) {
    if (game.mode === 'playing' || game.mode === 'ending') return;
    $('teamDialogTitle').textContent = firstTime ? 'BUILD YOUR TEAM' : 'CUSTOMIZE TEAM';
    $('cancelTeam').textContent = firstTime ? 'KEEP THIS TEAM' : 'CANCEL';
    const team = game.team;
    teamNameInput.value = team.name;
    teamPrimary.value = team.primary;
    teamSecondary.value = team.secondary;
    teamTrim.value = team.trim;
    crestDraft = normalizeCrest(team.crest);
    clubDraft = team.club;
    nationDraft = team.nation;
    // Long catalogs start closed to keep the editor compact.
    cityClubGallery.open = false;
    nationalTeamGallery.open = false;
    updateTeamPreview();
    teamDialog.showModal();
  }
  function closeTeamEditor() { teamDialog.close(); }
  $('customizeButton').addEventListener('click', () => openTeamEditor(false));
  $('closeTeamDialog').addEventListener('click', closeTeamEditor);
  $('cancelTeam').addEventListener('click', closeTeamEditor);
  teamDialog.addEventListener('click', event => { if (event.target === teamDialog) closeTeamEditor(); });
  presetButtons.forEach(button => button.addEventListener('click', () => {
    const theme = TEAM_PRESETS[button.dataset.teamPreset];
    if (!theme) return;
    teamNameInput.value = theme.name;
    teamPrimary.value = theme.primary;
    teamSecondary.value = theme.secondary;
    teamTrim.value = theme.trim;
    clubDraft = null;
    nationDraft = null;
    updateTeamPreview();
  }));
  [teamNameInput,teamPrimary,teamSecondary,teamTrim].forEach(el=>el.addEventListener('input', () => {
    // Editing the name or palette keeps the crest/flag artwork, but lets the
    // player build a unique team instead of remaining tied to a preset.
    clubDraft = null;
    nationDraft = null;
    updateTeamPreview();
  }));
  $('teamForm').addEventListener('submit', event => {
    event.preventDefault();
    const team = currentEditorTeam();
    applyTeam(team);
    // Profile-specific team saves replace the old one-team-per-browser key.
    closeTeamEditor();
    resizeCanvas();
  });
  // First launch: username -> team setup -> Arcade Shootout.
  // Other players on the same browser can switch without touching each other's records.
  const playerDialog = $('playerDialog');
  const playerNameInput = $('playerNameInput');
  const recordDialog = $('recordsDialog');

  function returnToArcadeMenu() {
    stopWindup();
    game.mode = 'idle';
    game.remaining = ROUND_SECONDS;
    game.elapsed = 0;
    game.goals = 0; game.shots = 0; game.saves = 0; game.misses = 0;
    game.aiming = null;
    game.toastTimer = 0;
    game.shake = 0;
    game.particles = [];
    game.previousTargets = [];
    game.goalie = { x:210, targetX:210, lean:0, flash:0 };
    resetPuck();
    toast.textContent = '';
    toast.className = 'shot-toast';
    overlay.classList.remove('results');
    $('overlayTitle').innerHTML = 'THIRTY SECONDS.<br><em>ONE NET.</em>';
    $('overlayCopy').textContent =
      'Pull back from the puck to aim, then let go to rip it. You can also flick it forward.';
    $('overlayHint').textContent = '30 SECONDS · UNLIMITED PUCKS · MORE MODES COMING';
    $('overlay').querySelector('.overlay-kicker').textContent = 'ARCADE SHOOTOUT · CLASSIC MODE';
    $('endSummary').hidden = true;
    $('playButton').innerHTML = 'START GAME <span aria-hidden="true">↗</span>';
    $('controlHint').textContent = 'PULL BACK & RELEASE · OR FLICK FORWARD';
    game.best = readBest(game.difficulty);
    overlay.hidden = false;
    updateHUD();
    fitOverlayCard();
  }

  function activateProfile(profile) {
    game.profile = profile;
    profileDB.activeId = profile.id;
    applyTeam(profile.team);
    applyLogo(normalizeLogo(profile.logoVariant));
    $('menuPlayerName').textContent = profile.name.toUpperCase();
    setDifficulty(profile.difficulty);
    returnToArcadeMenu();
    saveProfileDB();
  }

  function openPlayerDialog() {
    if (game.mode === 'playing' || game.mode === 'ending' || playerDialog.open) return;
    playerNameInput.value = '';
    $('playerError').textContent = '';
    const list = $('existingPlayers');
    list.replaceChildren();
    for (const profile of profileDB.players) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'existing-player-button';
      button.textContent = profile.name;
      if (game.profile?.id === profile.id) button.classList.add('current-player');
      button.addEventListener('click', () => {
        activateProfile(profile);
        playerDialog.close();
      });
      list.append(button);
    }
    $('existingPlayerSection').hidden = profileDB.players.length === 0;
    $('closePlayerDialog').hidden = !game.profile;
    playerDialog.showModal();
  }

  $('switchPlayerButton').addEventListener('click', openPlayerDialog);
  $('closePlayerDialog').addEventListener('click', () => playerDialog.close());
  playerDialog.addEventListener('cancel', event => {
    if (!game.profile) event.preventDefault();
  });
  $('playerForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = cleanPlayerName(playerNameInput.value);
    if (name.length < 2) {
      $('playerError').textContent = 'Please enter at least 2 characters.';
      return;
    }
    const duplicate = profileDB.players.find(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (duplicate) {
      activateProfile(duplicate);
      playerDialog.close();
      return;
    }
    const firstProfile = !profileDB.legacyClaimed && profileDB.players.length === 0;
    const profile = {
      id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
      name,
      team: firstProfile ? loadTeam() : normalizeTeam(null),
      logoVariant: 'power',
      difficulty: firstProfile ? initialDifficulty : 'beer',
      records: { arcade: {} }
    };
    if (firstProfile) {
      for (const level of Object.keys(DIFFICULTIES)) {
        profile.records.arcade[level] = emptyRecord(legacyBest(level));
      }
      profileDB.legacyClaimed = true;
    }
    profileDB.players.push(profile);
    activateProfile(profile);
    playerDialog.close();
    // New profiles see the actual team editor before their first game.
    openTeamEditor(true);
  });

  function openRecords() {
    if (!game.profile || game.mode === 'playing' || game.mode === 'ending') return;
    $('recordsTitle').textContent = game.profile.name.toUpperCase() + ' · RECORD BOOK';
    $('recordsSubtitle').textContent = game.team.name + ' · Arcade Shootout';
    const rows = $('recordRows');
    rows.replaceChildren();
    for (const level of ['pond', 'beer', 'show']) {
      const rec = getRecord(level);
      const row = document.createElement('div');
      row.className = 'record-card';
      const title = document.createElement('strong');
      title.textContent = DIFFICULTIES[level].name;
      const detail = document.createElement('p');
      detail.textContent = rec.rounds + (rec.rounds === 1 ? ' ROUND' : ' ROUNDS')
        + ' · ' + rec.goals + ' TOTAL GOALS';
      const score = document.createElement('span');
      score.className = 'record-score';
      score.textContent = rec.best + ' BEST';
      const left = document.createElement('div');
      left.append(title, detail);
      row.append(left, score);
      rows.append(row);
    }
    recordDialog.showModal();
  }
  $('recordsButton').addEventListener('click', openRecords);
  $('closeRecords').addEventListener('click', () => recordDialog.close());

  // Logo Lab is a DEV-only brand experiment. The player's chosen preview is
  // saved with their DEV profile; the Stable mark and data are never touched.
  const logoDialog = $('logoLabDialog');
  const logoChoices = [...document.querySelectorAll('[data-f-logo]')];
  let logoDraft = 'power';
  function applyLogo(kind) {
    const logo = LOGO_VARIANTS[normalizeLogo(kind)];
    $('brandLogoUse').setAttribute('href', logo.symbol);
    $('logoPreviewUse').setAttribute('href', logo.symbol);
    $('logoPreviewName').textContent = logo.name;
    for (const button of logoChoices) {
      button.setAttribute('aria-pressed', String(button.dataset.fLogo === normalizeLogo(kind)));
    }
  }
  function openLogoLab() {
    if (game.mode === 'playing' || game.mode === 'ending' || logoDialog.open || !game.profile) return;
    logoDraft = normalizeLogo(game.profile.logoVariant);
    applyLogo(logoDraft);
    logoDialog.showModal();
  }
  function cancelLogoLab() {
    applyLogo(normalizeLogo(game.profile?.logoVariant));
    logoDialog.close();
  }
  $('logoLabButton').addEventListener('click', openLogoLab);
  $('brandLogoButton').addEventListener('click', openLogoLab);
  $('cancelLogoLab').addEventListener('click', cancelLogoLab);
  $('closeLogoLab').addEventListener('click', cancelLogoLab);
  logoDialog.addEventListener('cancel', event => { event.preventDefault(); cancelLogoLab(); });
  logoChoices.forEach(button => button.addEventListener('click', () => {
    logoDraft = normalizeLogo(button.dataset.fLogo);
    applyLogo(logoDraft);
  }));
  $('saveLogoLab').addEventListener('click', () => {
    if (!game.profile) return;
    game.profile.logoVariant = logoDraft;
    saveProfileDB();
    logoDialog.close();
  });
  applyLogo('power');

  applyTeam(game.team);
  const resumed = profileDB.players.find(p => p.id === profileDB.activeId);
  if (resumed) activateProfile(resumed);
  else requestAnimationFrame(openPlayerDialog);
  updateHUD();
  resizeCanvas();
  requestAnimationFrame(frame);
})();
