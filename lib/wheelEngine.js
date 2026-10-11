/*
 * Wheel engine: plain DOM + canvas logic, started once from <WheelApp />.
 * The markup it drives lives in components/WheelApp.jsx.
 */
let started = false;

export function initWheel() {
  // React StrictMode runs effects twice in dev; the DOM is kept, so only start once.
  if (started) return;
  started = true;

  /* =========================================================
   * Constants & state
   * ======================================================= */
  const TAU = Math.PI * 2;
  const STORE_KEY = 'namewheel.state';
  const DEFAULT_NAMES = ['Yasmine', 'Omar', 'Salma', 'Karim', 'Nora', 'Youssef', 'Lina', 'Adam'];

  const PALETTES = [
    { name: 'IKIDO', colors: ['#14B8B3', '#16191D', '#7FDCD7', '#0B7F7B'] },
    { name: 'Retro', colors: ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'] },
    { name: 'Pastel', colors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#D7BAFF'], text: '#000' },
    { name: 'Neon', colors: ['#FF006E', '#FB5607', '#FFBE0B', '#3A86FF', '#8338EC'] },
    { name: 'Ocean', colors: ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#48CAE4', '#023E8A'] },
    { name: 'Sunset', colors: ['#F94144', '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#577590'] },
    { name: 'Forest', colors: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#1B4332'] },
    { name: 'Candy', colors: ['#F72585', '#B5179E', '#7209B7', '#560BAD', '#480CA8', '#3A0CA3', '#4361EE', '#4CC9F0'] },
  ];

  const DEFAULT_SETTINGS = {
    tickSound: 'tick',
    volume: 50,
    spinTime: 10,
    maxNames: 1000,
    winSound: 'chime',
    soundVersion: 2,
    confetti: true,
    popup: true,
    message: 'And the winner is…',
    removeBtn: true,
    autoRemove: false,
    palette: 0,
    shadow: true,
    idle: true,
    animatedBg: true,
    theme: 'dark',
  };

  const state = {
    entries: DEFAULT_NAMES.map(text => ({ text, weight: 1, enabled: true })),
    results: [],
    settings: { ...DEFAULT_SETTINGS },
    title: '',
    desc: '',
    image: null,      // data URL of center image
    advanced: false,
  };

  // runtime
  let angle = 0;
  let spinning = false;
  let hasSpun = false;
  let segments = [];
  let lastSegIdx = -1;
  let lastTickAt = 0;
  let pointerKick = 0;
  let wheelCache = null;
  let centerImg = null;
  let size = 0;          // CSS px
  let dpr = 1;
  let currentWinner = null;
  let autoRemoveTimer = null;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const el = {
    stage: $('#stage'), wheel: $('#wheel'), wrap: $('#wheelWrap'), hint: $('#spinHint'),
    entriesText: $('#entriesText'), entriesCount: $('#entriesCount'), resultsCount: $('#resultsCount'),
    resultsList: $('#resultsList'), resultsEmpty: $('#resultsEmpty'),
    advChk: $('#advancedChk'), advList: $('#advList'), advAdd: $('#advAdd'), advInput: $('#advInput'),
    title: $('#wheelTitle'), confetti: $('#confetti'), toast: $('#toast'), bgGlow: $('.bg-glow'),
  };
  const ctx = el.wheel.getContext('2d');

  /* =========================================================
   * Persistence
   * ======================================================= */
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      // probably the image is too big – save without it
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...state, image: null })); } catch {}
    }
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && Array.isArray(s.entries)) {
        Object.assign(state, s);
        state.settings = { ...DEFAULT_SETTINGS, ...s.settings };
        // visitors saved before the chime existed: switch them to the new default sound
        if (s.settings?.soundVersion !== DEFAULT_SETTINGS.soundVersion) {
          state.settings.winSound = DEFAULT_SETTINGS.winSound;
          state.settings.soundVersion = DEFAULT_SETTINGS.soundVersion;
        }
      }
    } catch {}
  }

  /* =========================================================
   * Helpers
   * ======================================================= */
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.toast.classList.remove('show'), 2400);
  }

  function textColorFor(hex) {
    const pal = PALETTES[state.settings.palette];
    if (pal && pal.text) return pal.text;
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#000' : '#fff';
  }

  const palette = () => (PALETTES[state.settings.palette] || PALETTES[0]).colors;
  const activeEntries = () => state.entries.filter(e => e.enabled && e.text.trim());

  /* =========================================================
   * Segments
   * ======================================================= */
  function buildSegments() {
    const list = state.entries
      .map((e, idx) => ({ ...e, idx }))
      .filter(e => e.enabled && e.text.trim());
    const colors = palette();
    const total = list.reduce((s, e) => s + Math.max(0.01, +e.weight || 1), 0);
    let a = 0;
    segments = list.map((e, i) => {
      const span = TAU * Math.max(0.01, +e.weight || 1) / total;
      let color = colors[i % colors.length];
      // avoid same color next to each other when wrapping around
      if (i === list.length - 1 && i > 0 && i % colors.length === 0) color = colors[1 % colors.length];
      const seg = { text: e.text.trim(), idx: e.idx, start: a, end: a + span, color };
      a += span;
      return seg;
    });
  }

  function segmentAtPointer() {
    if (!segments.length) return null;
    const theta = ((-Math.PI / 2 - angle) % TAU + TAU) % TAU; // wheel-angle under pointer (pointer at 12 o'clock)
    let lo = 0, hi = segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segments[mid].start <= theta) lo = mid; else hi = mid - 1;
    }
    return segments[lo];
  }

  /* =========================================================
   * Wheel rendering
   * ======================================================= */
  const radius = () => size / 2 * 0.9;
  const wheelFont = () => getComputedStyle(document.body).fontFamily || 'Arial, sans-serif';

  function buildCache() {
    buildSegments();
    const r = radius();
    if (r <= 0) return;
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(r * 2 * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.translate(r, r);

    if (!segments.length) {
      g.fillStyle = '#555';
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    }

    for (const s of segments) {
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, r, s.start, s.end);
      g.closePath();
      g.fillStyle = s.color;
      g.fill();
    }

    // names
    const showText = segments.length <= state.settings.maxNames;
    if (showText) {
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      for (const s of segments) {
        const span = s.end - s.start;
        const chord = 2 * r * 0.62 * Math.sin(Math.min(span, Math.PI) / 2);
        let fs = Math.min(r * 0.15, chord * 0.82);
        if (fs < 3) continue;
        const avail = r * (state.image ? 0.66 : 0.8);
        g.font = `700 ${fs}px ${wheelFont()}`;
        let text = s.text;
        let w = g.measureText(text).width;
        if (w > avail) {
          fs = Math.max(fs * avail / w, Math.min(fs, 9));
          g.font = `700 ${fs}px ${wheelFont()}`;
          w = g.measureText(text).width;
          while (w > avail && text.length > 1) {
            text = text.slice(0, -1);
            w = g.measureText(text + '…').width;
          }
          if (text !== s.text) text += '…';
        }
        g.save();
        g.rotate((s.start + s.end) / 2);
        g.fillStyle = textColorFor(s.color);
        g.fillText(text, r * 0.94, fs * 0.04);
        g.restore();
      }
    }

    // center
    if (centerImg) {
      const ir = r * 0.26;
      g.save();
      g.beginPath(); g.arc(0, 0, ir, 0, TAU); g.closePath();
      g.fillStyle = '#fff'; g.fill();
      g.clip();
      const k = Math.max(ir * 2 / centerImg.width, ir * 2 / centerImg.height);
      g.drawImage(centerImg, -centerImg.width * k / 2, -centerImg.height * k / 2, centerImg.width * k, centerImg.height * k);
      g.restore();
    } else {
      g.beginPath(); g.arc(0, 0, r * 0.13, 0, TAU);
      g.fillStyle = '#16191D'; g.fill();
      g.lineWidth = r * 0.025; g.strokeStyle = '#FFFFFF'; g.stroke();
      g.beginPath(); g.arc(0, 0, r * 0.045, 0, TAU);
      g.fillStyle = '#14B8B3'; g.fill();
    }
    wheelCache = c;
    lastSegIdx = segmentAtPointer()?.idx ?? -1;
  }

  function draw() {
    const r = radius();
    const c = size / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (!wheelCache) return;

    // shadow
    if (state.settings.shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowBlur = r * 0.08;
      ctx.shadowOffsetY = r * 0.015;
      ctx.beginPath(); ctx.arc(c, c, r - 1, 0, TAU);
      ctx.fillStyle = '#000'; ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(angle);
    ctx.drawImage(wheelCache, -r, -r, r * 2, r * 2);
    ctx.lineWidth = r * 0.035;
    ctx.strokeStyle = '#16191D';
    ctx.beginPath(); ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, TAU); ctx.stroke();
    const studs = 24;
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < studs; i++) {
      const a = i * TAU / studs;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (r - r * 0.0175), Math.sin(a) * (r - r * 0.0175), r * 0.009, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // pointer (12 o'clock, pointing toward the center)
    const px = c, py = c - r;
    const len = r * 0.13, half = r * 0.065;
    ctx.save();
    ctx.translate(px, py - len * 0.35);
    ctx.rotate(-Math.PI / 2 - pointerKick);
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(len * 0.25, -half);
    ctx.quadraticCurveTo(len * 0.42, 0, len * 0.25, half);
    ctx.closePath();
    ctx.fillStyle = '#14B8B3';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();
  }

  function resize() {
    const rect = el.wrap.getBoundingClientRect();
    const s = Math.floor(Math.max(120, Math.min(rect.width, rect.height)));
    dpr = window.devicePixelRatio || 1;
    if (s === size && el.wheel.width === Math.round(s * dpr)) return;
    size = s;
    el.wheel.style.width = el.wheel.style.height = s + 'px';
    el.wheel.width = el.wheel.height = Math.round(s * dpr);
    buildCache();
    draw();
  }

  function drawLogo() {
    const c = $('#logo'); if (!c) return;
    const g = c.getContext('2d');
    const cols = palette(), n = 8, r = 30;
    g.clearRect(0, 0, 64, 64);
    for (let i = 0; i < n; i++) {
      g.beginPath(); g.moveTo(32, 32);
      g.arc(32, 32, r, i * TAU / n, (i + 1) * TAU / n);
      g.fillStyle = cols[i % cols.length]; g.fill();
    }
    g.beginPath(); g.arc(32, 32, 8, 0, TAU); g.fillStyle = '#1A1530'; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
  }

  /* =========================================================
   * Audio (Web Audio, synthesized – no files needed)
   * ======================================================= */
  let actx = null, master = null, tickBuf = null, applauseBuf = null;

  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
    master.gain.value = (state.settings.volume / 100) ** 1.5;
    return actx;
  }

  function makeTickBuffer(a) {
    const len = Math.floor(a.sampleRate * 0.03);
    const b = a.createBuffer(1, len, a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / a.sampleRate;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.0025) * 0.9 + Math.sin(TAU * 1700 * t) * Math.exp(-t / 0.004) * 0.6;
    }
    return b;
  }

  function playTick() {
    const s = state.settings.tickSound;
    if (s === 'none') return;
    const a = audio(); if (!a) return;
    tickBuf ||= makeTickBuffer(a);
    const src = a.createBufferSource();
    src.buffer = tickBuf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = s === 'soft' ? 1100 : 2400;
    f.Q.value = 1.2;
    const g = a.createGain();
    g.gain.value = s === 'soft' ? 0.6 : 1.4;
    src.connect(f).connect(g).connect(master);
    src.start();
  }

  function makeApplauseBuffer(a) {
    const sr = a.sampleRate, dur = 4.2, len = Math.floor(sr * dur);
    const b = a.createBuffer(2, len, sr);
    const L = b.getChannelData(0), R = b.getChannelData(1);
    // clap density envelope: fast rise, sustain, long fade
    const env = t => t < 0.25 ? t / 0.25 : t < 1.8 ? 1 : Math.max(0, 1 - (t - 1.8) / 2.3) ** 1.6;
    const claps = 1400;
    for (let n = 0; n < claps; n++) {
      let t;
      do { t = Math.random() * dur; } while (Math.random() > env(t));
      const start = Math.floor(t * sr);
      const clen = Math.floor(sr * (0.012 + Math.random() * 0.02));
      const amp = 0.15 + Math.random() * 0.35;
      const pan = Math.random();
      const decay = 0.003 + Math.random() * 0.004;
      for (let i = 0; i < clen && start + i < len; i++) {
        const v = (Math.random() * 2 - 1) * amp * Math.exp(-(i / sr) / decay);
        L[start + i] += v * (1 - pan * 0.7);
        R[start + i] += v * (0.3 + pan * 0.7);
      }
    }
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const k = 0.9 / (peak || 1);
    for (let i = 0; i < len; i++) { L[i] *= k; R[i] *= k; }
    return b;
  }

  function playApplause(delay = 0) {
    const a = audio(); if (!a) return;
    applauseBuf ||= makeApplauseBuffer(a);
    const src = a.createBufferSource();
    src.buffer = applauseBuf;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600;
    const pk = a.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 2000; pk.gain.value = 4;
    const g = a.createGain(); g.gain.value = 0.9;
    src.connect(hp).connect(pk).connect(g).connect(master);
    src.start(a.currentTime + delay);
  }

  // Effects bus for win sounds: dry signal + a short generated reverb.
  let fxIn = null;
  function fxBus(a) {
    if (fxIn) return fxIn;
    const sr = a.sampleRate, len = Math.floor(sr * 2.4);
    const ir = a.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
    }
    const conv = a.createConvolver(); conv.buffer = ir;
    const wet = a.createGain(); wet.gain.value = 0.28;
    fxIn = a.createGain();
    fxIn.connect(master);
    fxIn.connect(conv).connect(wet).connect(master);
    return fxIn;
  }

  // Soft FM bell (celesta / glockenspiel-like).
  function bell(a, freq, at, dur, vol, pan = 0) {
    const car = a.createOscillator(); car.frequency.value = freq;
    const mod = a.createOscillator(); mod.frequency.value = freq * 2;
    const idx = a.createGain();
    idx.gain.setValueAtTime(freq * 1.1, at);
    idx.gain.exponentialRampToValueAtTime(freq * 0.02, at + dur * 0.5);
    mod.connect(idx).connect(car.frequency);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    let out = car.connect(g);
    if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = pan; out = out.connect(p); }
    out.connect(fxBus(a));
    car.start(at); mod.start(at);
    car.stop(at + dur + 0.05); mod.stop(at + dur + 0.05);
  }

  function playChime() {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + 0.02;
    // soft "thump" for impact
    const o = a.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(140, t0);
    o.frequency.exponentialRampToValueAtTime(55, t0 + 0.18);
    const og = a.createGain();
    og.gain.setValueAtTime(0.35, t0);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    o.connect(og).connect(master);
    o.start(t0); o.stop(t0 + 0.25);
    // rising arpeggio C5 E5 G5 C6
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(a, f, t0 + i * 0.085, 0.9, 0.16, -0.4 + i * 0.25));
    // bright chord C6 E6 G6 + C5 body
    [1046.5, 1318.5, 1568.0].forEach((f, i) => bell(a, f, t0 + 0.38, 2.2, 0.1, (i - 1) * 0.5));
    bell(a, 523.25, t0 + 0.38, 2.4, 0.12);
    // sparkles (C major pentatonic, high octave)
    const sparkle = [2093, 2349.3, 2637, 3136, 3520, 4186];
    for (let i = 0; i < 9; i++) {
      const f = sparkle[Math.floor(Math.random() * sparkle.length)];
      bell(a, f, t0 + 0.45 + i * 0.09 + Math.random() * 0.04, 0.5, 0.035, Math.random() * 1.6 - 0.8);
    }
  }

  function playFanfare() {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + 0.02;
    const notes = [[523.25, 0, 0.13], [659.25, 0.13, 0.13], [783.99, 0.26, 0.13], [1046.5, 0.39, 0.7]];
    const chord = [523.25, 659.25, 783.99, 1046.5];
    const tone = (freq, at, dur, vol, type) => {
      const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
      const g = a.createGain();
      g.gain.setValueAtTime(0, t0 + at);
      g.gain.linearRampToValueAtTime(vol, t0 + at + 0.015);
      g.gain.setValueAtTime(vol, t0 + at + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g).connect(fxBus(a));
      o.start(t0 + at); o.stop(t0 + at + dur + 0.05);
    };
    notes.forEach(([f, at, d]) => { tone(f, at, d, 0.18, 'triangle'); tone(f * 2, at, d, 0.04, 'square'); });
    chord.forEach(f => tone(f, 0.39, 1.1, 0.07, 'sawtooth'));
  }

  function playWin() {
    const s = state.settings.winSound;
    if (s === 'chime') playChime();
    else if (s === 'applause') playApplause();
    else if (s === 'fanfare') playFanfare();
    else if (s === 'both') { playFanfare(); playApplause(0.35); }
  }

  /* =========================================================
   * Confetti
   * ======================================================= */
  const cctx = el.confetti.getContext('2d');
  let confettiParts = [];
  let confettiRunning = false;

  function launchConfetti() {
    const W = el.confetti.width = innerWidth * dpr;
    const H = el.confetti.height = innerHeight * dpr;
    const cols = [...palette(), '#ffffff', '#ff4d6d', '#ffd166'];
    for (let i = 0; i < 260; i++) {
      confettiParts.push({
        x: Math.random() * W,
        y: -Math.random() * H * 0.6 - 20,
        vx: (Math.random() - 0.5) * 3 * dpr,
        vy: (2 + Math.random() * 3) * dpr,
        w: (6 + Math.random() * 6) * dpr,
        h: (8 + Math.random() * 10) * dpr,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 0.25,
        flip: Math.random() * TAU,
        vf: 0.05 + Math.random() * 0.12,
        color: cols[Math.floor(Math.random() * cols.length)],
      });
    }
    if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(confettiStep); }
  }

  function confettiStep() {
    const H = el.confetti.height;
    cctx.clearRect(0, 0, el.confetti.width, H);
    for (const p of confettiParts) {
      p.vy += 0.035 * dpr;
      p.vx += Math.sin(p.flip) * 0.03;
      p.x += p.vx; p.y += p.vy;
      p.rot += p.vr; p.flip += p.vf;
      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.scale(1, Math.cos(p.flip));
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cctx.restore();
    }
    confettiParts = confettiParts.filter(p => p.y < H + 40);
    if (confettiParts.length) requestAnimationFrame(confettiStep);
    else { confettiRunning = false; cctx.clearRect(0, 0, el.confetti.width, H); }
  }

  /* =========================================================
   * Spin logic
   * ======================================================= */
  // Short acceleration phase, then a long smooth deceleration (power ease-out)
  function spinEase(p) {
    const a = 0.06, n = 4;
    const v0 = 1 / (a / 2 + (1 - a) / n);
    if (p < a) return 0.5 * (v0 / a) * p * p;
    const q = (p - a) / (1 - a);
    return v0 * a / 2 + (v0 * (1 - a) / n) * (1 - (1 - q) ** n);
  }

  function spin() {
    if (spinning) return;
    if (!segments.length) { toast('Add some entries first'); return; }
    closeModal($('#winnerModal'));
    audio();
    spinning = true;
    hasSpun = true;
    el.wheel.classList.add('spinning');
    el.hint.classList.add('gone');

    const duration = state.settings.spinTime * 1000;
    const startAngle = angle;
    const turns = Math.max(3, Math.round(state.settings.spinTime * 1.6));
    const delta = turns * TAU + Math.random() * TAU;
    const t0 = performance.now();

    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      angle = startAngle + delta * spinEase(p);
      if (p < 1) requestAnimationFrame(frame);
      else finishSpin();
    }
    requestAnimationFrame(frame);
  }

  function finishSpin() {
    spinning = false;
    angle %= TAU;
    el.wheel.classList.remove('spinning');
    const seg = segmentAtPointer();
    if (!seg) return;
    currentWinner = seg;
    state.results.unshift({ text: seg.text, at: Date.now() });
    renderResults();
    save();
    playWin();
    if (state.settings.confetti) launchConfetti();
    if (state.settings.popup) showWinner(seg);
    if (state.settings.autoRemove) {
      clearTimeout(autoRemoveTimer);
      autoRemoveTimer = setTimeout(() => { removeWinner(); }, 5000);
    }
  }

  function showWinner(seg) {
    const head = $('#winnerHead');
    head.textContent = state.settings.message || 'And the winner is…';
    $('#winnerName').style.setProperty('--seg', seg.color);
    $('#winnerName').textContent = seg.text;
    $('#winnerRemove').hidden = !state.settings.removeBtn;
    openModal($('#winnerModal'));
  }

  function removeWinner() {
    clearTimeout(autoRemoveTimer);
    if (currentWinner && state.entries[currentWinner.idx] && state.entries[currentWinner.idx].text.trim() === currentWinner.text) {
      state.entries.splice(currentWinner.idx, 1);
      currentWinner = null;
      entriesChanged(true);
    }
    closeModal($('#winnerModal'));
  }

  /* =========================================================
   * Main loop (idle rotation, tick detection, pointer kick)
   * ======================================================= */
  let lastFrame = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    if (!spinning && !hasSpun && state.settings.idle && !document.querySelector('.modal:not([hidden])')) {
      angle += dt * 0.12;
    }

    const seg = segmentAtPointer();
    const idx = seg ? seg.idx : -1;
    if (idx !== lastSegIdx) {
      lastSegIdx = idx;
      if (spinning) {
        pointerKick = Math.min(0.45, pointerKick + 0.3);
        if (now - lastTickAt > 28) { playTick(); lastTickAt = now; }
      }
    }
    pointerKick *= Math.pow(0.0005, dt); // fast decay
    if (pointerKick < 0.001) pointerKick = 0;

    draw();
    requestAnimationFrame(loop);
  }

  /* =========================================================
   * Entries UI
   * ======================================================= */
  function entriesFromText() {
    const lines = el.entriesText.value.split('\n');
    const old = state.entries;
    state.entries = lines
      .filter(l => l.trim())
      .map((text, i) => {
        const o = old[i];
        return { text, weight: o && o.text === text ? o.weight : 1, enabled: o && o.text === text ? o.enabled : true };
      });
  }

  function entriesChanged(syncText) {
    if (syncText) el.entriesText.value = state.entries.map(e => e.text).join('\n');
    if (state.advanced) renderAdvanced();
    el.entriesCount.textContent = activeEntries().length;
    buildCache();
    save();
  }

  function renderAdvanced() {
    const list = el.advList;
    const focusedIdx = document.activeElement?.dataset?.idx;
    const focusedField = document.activeElement?.dataset?.field;
    list.innerHTML = '';
    buildSegments();
    const colorOf = {};
    segments.forEach(s => colorOf[s.idx] = s.color);
    state.entries.forEach((e, i) => {
      const row = document.createElement('div');
      row.className = 'adv-row' + (e.enabled ? '' : ' disabled');
      row.innerHTML = `
        <input type="checkbox" title="Show on wheel" ${e.enabled ? 'checked' : ''} data-idx="${i}" data-field="enabled">
        <span class="swatch" style="background:${colorOf[i] || 'transparent'}"></span>
        <input type="text" data-idx="${i}" data-field="text">
        <span class="w-label">×</span>
        <input type="number" min="0.1" max="100" step="0.1" title="Weight" data-idx="${i}" data-field="weight">
        <button class="icon-btn" title="Delete" data-idx="${i}" data-field="delete"><svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>`;
      row.querySelector('[data-field=text]').value = e.text;
      row.querySelector('[data-field=weight]').value = e.weight;
      list.appendChild(row);
    });
    if (focusedIdx != null && focusedField) {
      const f = list.querySelector(`[data-idx="${focusedIdx}"][data-field="${focusedField}"]`);
      if (f) { f.focus(); if (f.type === 'text') f.setSelectionRange(f.value.length, f.value.length); }
    }
  }

  function setAdvanced(on) {
    state.advanced = on;
    el.advChk.checked = on;
    el.entriesText.hidden = on;
    el.advList.hidden = !on;
    el.advAdd.hidden = !on;
    if (on) renderAdvanced();
    else el.entriesText.value = state.entries.map(e => e.text).join('\n');
    save();
  }

  function renderResults() {
    el.resultsCount.textContent = state.results.length;
    el.resultsEmpty.hidden = state.results.length > 0;
    el.resultsList.innerHTML = '';
    state.results.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r.text;
      if (r.at) {
        const t = document.createElement('span');
        t.className = 'time';
        t.textContent = new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        li.appendChild(t);
      }
      el.resultsList.appendChild(li);
    });
  }

  function renderTitle() {
    el.title.innerHTML = '';
    if (state.title) {
      const h = document.createElement('h1'); h.textContent = state.title; el.title.appendChild(h);
    }
    if (state.desc) {
      const p = document.createElement('p'); p.textContent = state.desc; el.title.appendChild(p);
    }
    requestAnimationFrame(resize);
  }

  function loadCenterImage() {
    centerImg = null;
    if (!state.image) { buildCache(); return; }
    const img = new Image();
    img.onload = () => { centerImg = img; buildCache(); };
    img.src = state.image;
  }

  function applyTheme() {
    document.body.dataset.theme = state.settings.theme;
    el.bgGlow.classList.toggle('animated', state.settings.animatedBg);
  }

  function renderAll() {
    applyTheme();
    el.entriesText.value = state.entries.map(e => e.text).join('\n');
    setAdvanced(state.advanced);
    el.entriesCount.textContent = activeEntries().length;
    renderResults();
    renderTitle();
    drawLogo();
    loadCenterImage();
    buildCache();
  }

  /* =========================================================
   * Modals
   * ======================================================= */
  function openModal(m) { m.hidden = false; }
  function closeModal(m) {
    if (!m || m.hidden) return;
    m.hidden = true;
    if (m.id === 'winnerModal') clearTimeout(autoRemoveTimer);
  }

  $$('.modal').forEach(m => {
    m.addEventListener('mousedown', e => { if (e.target === m) closeModal(m); });
    m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(m)));
  });

  // ---- customize ----
  let draftPalette = 0;
  const S = id => $('#' + id);

  function openCustomize() {
    const s = state.settings;
    S('setTickSound').value = s.tickSound;
    S('setVolume').value = s.volume;
    S('setSpinTime').value = s.spinTime;
    S('setMaxNames').value = s.maxNames;
    S('setWinSound').value = s.winSound;
    S('setConfetti').checked = s.confetti;
    S('setPopup').checked = s.popup;
    S('setMessage').value = s.message;
    S('setRemoveBtn').checked = s.removeBtn;
    S('setAutoRemove').checked = s.autoRemove;
    S('setShadow').checked = s.shadow;
    S('setIdle').checked = s.idle;
    S('setBg').checked = s.animatedBg;
    draftPalette = s.palette;
    renderPalettes();
    updateRangeLabels();
    openModal($('#customizeModal'));
  }

  function updateRangeLabels() {
    S('volumeVal').textContent = S('setVolume').value + '%';
    S('spinTimeVal').textContent = S('setSpinTime').value + 's';
    S('maxNamesVal').textContent = S('setMaxNames').value;
  }
  ['setVolume', 'setSpinTime', 'setMaxNames'].forEach(id => S(id).addEventListener('input', updateRangeLabels));
  S('setVolume').addEventListener('change', () => {
    state.settings.volume = +S('setVolume').value; audio(); playTick();
  });

  function renderPalettes() {
    const box = $('#palettes');
    box.innerHTML = '';
    PALETTES.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'palette' + (i === draftPalette ? ' active' : '');
      b.innerHTML = `<div class="sw">${p.colors.map(c => `<span style="background:${c}"></span>`).join('')}</div>${p.name}`;
      b.addEventListener('click', () => { draftPalette = i; renderPalettes(); });
      box.appendChild(b);
    });
  }

  $$('.ctab').forEach(t => t.addEventListener('click', () => {
    $$('.ctab').forEach(x => x.classList.toggle('active', x === t));
    $$('.cpane').forEach(p => p.hidden = p.id !== 'c-' + t.dataset.ctab);
  }));

  S('customizeOk').addEventListener('click', () => {
    Object.assign(state.settings, {
      tickSound: S('setTickSound').value,
      volume: +S('setVolume').value,
      spinTime: +S('setSpinTime').value,
      maxNames: +S('setMaxNames').value,
      winSound: S('setWinSound').value,
      confetti: S('setConfetti').checked,
      popup: S('setPopup').checked,
      message: S('setMessage').value.trim() || DEFAULT_SETTINGS.message,
      removeBtn: S('setRemoveBtn').checked,
      autoRemove: S('setAutoRemove').checked,
      shadow: S('setShadow').checked,
      idle: S('setIdle').checked,
      animatedBg: S('setBg').checked,
      palette: draftPalette,
    });
    applyTheme();
    drawLogo();
    entriesChanged(false);
    closeModal($('#customizeModal'));
  });

  // ---- title ----
  function openTitle() {
    S('titleInput').value = state.title;
    S('descInput').value = state.desc;
    openModal($('#titleModal'));
    setTimeout(() => S('titleInput').focus(), 50);
  }
  S('titleOk').addEventListener('click', () => {
    state.title = S('titleInput').value.trim();
    state.desc = S('descInput').value.trim();
    renderTitle(); save();
    closeModal($('#titleModal'));
  });

  /* =========================================================
   * Menu actions
   * ======================================================= */
  const actions = {
    customize: openCustomize,
    fullscreen() {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    },
    more() { $('#moreMenu').classList.toggle('open'); },
    theme() {
      state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
      applyTheme(); save();
    },
    'clear-results'() { state.results = []; renderResults(); save(); toast('Results cleared'); },
    'reset-settings'() {
      state.settings = { ...DEFAULT_SETTINGS, theme: state.settings.theme };
      applyTheme(); drawLogo(); entriesChanged(false); toast('Settings reset');
    },
    about() { openModal($('#aboutModal')); },
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a) {
      e.preventDefault();
      const name = a.dataset.action;
      if (name !== 'more') $('#moreMenu').classList.remove('open');
      if (name !== 'more') $('#menu').classList.remove('open');
      actions[name]?.();
      return;
    }
    if (!e.target.closest('.dropdown')) $('#moreMenu').classList.remove('open');
    if (!e.target.closest('.split')) $('#imageMenu').classList.remove('open');
  });

  $('#menuToggle').addEventListener('click', () => $('#menu').classList.toggle('open'));
  $('#brand').addEventListener('click', e => e.preventDefault());

  /* =========================================================
   * Panel events
   * ======================================================= */
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.toggle('active', x === t));
    $('#tab-entries').hidden = t.dataset.tab !== 'entries';
    $('#tab-results').hidden = t.dataset.tab !== 'results';
  }));

  el.entriesText.addEventListener('input', () => { entriesFromText(); entriesChanged(false); });

  $('#shuffleBtn').addEventListener('click', () => {
    const a = state.entries;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    entriesChanged(true);
  });

  let sortAsc = true;
  $('#sortBtn').addEventListener('click', () => {
    state.entries.sort((x, y) => x.text.localeCompare(y.text, undefined, { sensitivity: 'base' }) * (sortAsc ? 1 : -1));
    sortAsc = !sortAsc;
    entriesChanged(true);
  });

  el.advChk.addEventListener('change', () => {
    if (!el.advChk.checked) entriesFromText();
    setAdvanced(el.advChk.checked);
  });

  el.advList.addEventListener('input', e => {
    const t = e.target, i = +t.dataset.idx, f = t.dataset.field;
    if (!state.entries[i]) return;
    if (f === 'text') state.entries[i].text = t.value;
    else if (f === 'weight') state.entries[i].weight = Math.max(0.1, Math.min(100, +t.value || 1));
    else return;
    el.entriesCount.textContent = activeEntries().length;
    buildCache(); save();
  });
  el.advList.addEventListener('change', e => {
    const t = e.target, i = +t.dataset.idx;
    if (t.dataset.field === 'enabled') { state.entries[i].enabled = t.checked; entriesChanged(true); }
    if (t.dataset.field === 'weight') renderAdvanced();
  });
  el.advList.addEventListener('click', e => {
    const b = e.target.closest('[data-field=delete]');
    if (!b) return;
    state.entries.splice(+b.dataset.idx, 1);
    entriesChanged(true);
  });
  function advAdd() {
    const v = el.advInput.value.trim();
    if (!v) return;
    state.entries.push({ text: v, weight: 1, enabled: true });
    el.advInput.value = '';
    entriesChanged(true);
    el.advList.scrollTop = el.advList.scrollHeight;
  }
  $('#advAddBtn').addEventListener('click', advAdd);
  el.advInput.addEventListener('keydown', e => { if (e.key === 'Enter') advAdd(); });

  // image
  const imageInput = $('#imageInput');
  $('#addImageBtn').addEventListener('click', () => imageInput.click());
  $('#imgCenter').addEventListener('click', () => { $('#imageMenu').classList.remove('open'); imageInput.click(); });
  $('#imageMenuBtn').addEventListener('click', () => $('#imageMenu').classList.toggle('open'));
  $('#imgRemove').addEventListener('click', () => {
    $('#imageMenu').classList.remove('open');
    state.image = null; loadCenterImage(); save();
  });
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    imageInput.value = '';
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      // downscale to keep localStorage small
      const max = 400, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      state.image = c.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
      loadCenterImage(); save();
    };
    img.src = URL.createObjectURL(file);
  });

  // results
  $('#sortResultsBtn').addEventListener('click', () => {
    state.results.sort((a, b) => a.text.localeCompare(b.text));
    renderResults(); save();
  });
  $('#clearResultsBtn').addEventListener('click', actions['clear-results']);

  // winner dialog
  $('#winnerClose').addEventListener('click', () => closeModal($('#winnerModal')));
  $('#winnerRemove').addEventListener('click', removeWinner);

  // panel toggle & title
  $('#panelToggle').addEventListener('click', () => {
    el.stage.classList.toggle('collapsed');
    requestAnimationFrame(resize);
  });
  $('#editTitleBtn').addEventListener('click', openTitle);

  // wheel
  el.wheel.addEventListener('click', spin);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); spin(); }
    if (e.key === 'Escape') {
      const open = $$('.modal:not([hidden])').pop();
      if (open) closeModal(open);
    }
  });

  new ResizeObserver(resize).observe(el.wrap);
  window.addEventListener('resize', resize);

  /* =========================================================
   * Boot
   * ======================================================= */
  load();
  renderAll();
  resize();
  document.fonts?.ready.then(() => buildCache());
  requestAnimationFrame(loop);
}
