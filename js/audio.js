const Audio = {
  ctx: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {}
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  canPlay() {
    return this.initialized && saveData.settings.sound;
  },

  createOsc(type, freq, startTime, duration) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    osc.start(startTime);
    osc.stop(startTime + duration);
    return osc;
  },

  createGain(volume, startTime) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    return gain;
  },

  createNoise(duration, startTime) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.start(startTime);
    source.stop(startTime + duration);
    return source;
  },

  // Ball hits a block: high sine blip 800→600Hz
  ballHit() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.createOsc('sine', 800, t, 0.06);
    osc.frequency.linearRampToValueAtTime(600, t + 0.06);
    const gain = this.createGain(0.15, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.06);
    osc.connect(gain).connect(this.ctx.destination);
  },

  // Block destroyed: noise burst + low thud + pop
  blockDestroyed() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const noise = this.createNoise(0.08, t);
    const nGain = this.createGain(0.1, t);
    nGain.gain.linearRampToValueAtTime(0, t + 0.08);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    noise.connect(filter).connect(nGain).connect(this.ctx.destination);

    const thud = this.createOsc('sine', 80, t, 0.12);
    const tGain = this.createGain(0.2, t);
    tGain.gain.linearRampToValueAtTime(0, t + 0.12);
    thud.connect(tGain).connect(this.ctx.destination);

    const pop = this.createOsc('sine', 400, t, 0.05);
    pop.frequency.linearRampToValueAtTime(200, t + 0.05);
    const pGain = this.createGain(0.12, t);
    pGain.gain.linearRampToValueAtTime(0, t + 0.05);
    pop.connect(pGain).connect(this.ctx.destination);
  },

  // Wall bounce: soft low thud
  wallBounce() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.createOsc('sine', 200, t, 0.05);
    const gain = this.createGain(0.08, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
  },

  // Pickup collected: ascending ding
  pickupCollected() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.createOsc('sine', 600, t, 0.2);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.15);
    const gain = this.createGain(0.15, t);
    gain.gain.setValueAtTime(0.15, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.2);
    osc.connect(gain).connect(this.ctx.destination);
  },

  // Ball launch: rising whoosh
  ballLaunch() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const noise = this.createNoise(0.15, t);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(2000, t + 0.15);
    filter.Q.setValueAtTime(2, t);
    const gain = this.createGain(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.15);
    noise.connect(filter).connect(gain).connect(this.ctx.destination);
  },

  // Turn complete: two-note chime
  turnComplete() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const o1 = this.createOsc('sine', 523, t, 0.3);
    const g1 = this.createGain(0.1, t);
    g1.gain.linearRampToValueAtTime(0, t + 0.3);
    o1.connect(g1).connect(this.ctx.destination);
    const o2 = this.createOsc('sine', 659, t + 0.05, 0.25);
    const g2 = this.createGain(0.1, t + 0.05);
    g2.gain.linearRampToValueAtTime(0, t + 0.3);
    o2.connect(g2).connect(this.ctx.destination);
  },

  // Game over: descending tone
  gameOver() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.createOsc('sawtooth', 300, t, 0.8);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.8);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.linearRampToValueAtTime(200, t + 0.8);
    const gain = this.createGain(0.12, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.8);
    osc.connect(filter).connect(gain).connect(this.ctx.destination);
  },

  // Level complete: fanfare
  levelComplete() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i < notes.length; i++) {
      const start = t + i * 0.12;
      const dur = 0.4 - i * 0.05;
      const osc = this.createOsc('sine', notes[i], start, dur);
      const gain = this.createGain(0.12, start);
      gain.gain.linearRampToValueAtTime(0, start + dur);
      osc.connect(gain).connect(this.ctx.destination);
    }
  },

  // Powerup activated: electronic zap
  powerupActivated() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.createOsc('sawtooth', 200, t, 0.25);
    osc.frequency.exponentialRampToValueAtTime(1700, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.25);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, t);
    const gain = this.createGain(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.25);
    osc.connect(filter).connect(gain).connect(this.ctx.destination);
  },

  // Chest open: sparkle shimmer
  chestOpen() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const freqs = [1200, 1500, 1800, 2200, 2600];
    for (let i = 0; i < freqs.length; i++) {
      const start = t + i * 0.08;
      const osc = this.createOsc('sine', freqs[i], start, 0.2);
      const gain = this.createGain(0.06, start);
      gain.gain.linearRampToValueAtTime(0, start + 0.2);
      osc.connect(gain).connect(this.ctx.destination);
    }
  },

  // Button tap: short click
  buttonTap() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.createOsc('square', 1000, t, 0.04);
    const gain = this.createGain(0.06, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.04);
    osc.connect(gain).connect(this.ctx.destination);
    const noise = this.createNoise(0.02, t);
    const nGain = this.createGain(0.04, t);
    nGain.gain.linearRampToValueAtTime(0, t + 0.02);
    noise.connect(nGain).connect(this.ctx.destination);
  },

  // --- Haptics ---
  vibrate(pattern) {
    if (!saveData.settings.haptics) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  },
  vibrateLight()   { this.vibrate(10); },
  vibrateMedium()  { this.vibrate(25); },
  vibrateHeavy()   { this.vibrate(50); },
  vibrateSuccess() { this.vibrate([50, 30, 50]); },
  vibrateError()   { this.vibrate([100, 50, 100]); },

  // --- Music ---
  musicPlaying: false,
  musicNodes: [],
  musicTimeout: null,

  startMusic() {
    if (!this.initialized || !saveData.settings.music || this.musicPlaying) return;
    this.musicPlaying = true;
    this.playMusicLoop();
  },

  stopMusic() {
    this.musicPlaying = false;
    for (const node of this.musicNodes) {
      try { node.stop(); } catch (e) {}
    }
    this.musicNodes = [];
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  },

  playMusicLoop() {
    if (!this.musicPlaying || !this.ctx) return;

    const t = this.ctx.currentTime;
    const loopDur = 32;
    const chordDur = 4;
    const chords = [
      [261.6, 329.6, 392.0, 493.9],
      [220.0, 261.6, 329.6, 392.0],
      [174.6, 220.0, 261.6, 329.6],
      [196.0, 246.9, 293.7, 349.2],
      [164.8, 196.0, 246.9, 293.7],
      [220.0, 261.6, 329.6, 392.0],
      [146.8, 174.6, 220.0, 261.6],
      [196.0, 246.9, 293.7, 349.2]
    ];

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.25, t);
    masterGain.connect(this.ctx.destination);

    for (let c = 0; c < chords.length; c++) {
      const ct = t + c * chordDur;
      for (const freq of chords[c]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 0.5, ct);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, ct);
        g.gain.linearRampToValueAtTime(0.04, ct + 0.5);
        g.gain.setValueAtTime(0.04, ct + chordDur - 0.5);
        g.gain.linearRampToValueAtTime(0, ct + chordDur);
        osc.connect(g).connect(masterGain);
        osc.start(ct);
        osc.stop(ct + chordDur);
        this.musicNodes.push(osc);
      }
    }

    for (let c = 0; c < chords.length; c++) {
      const ct = t + c * chordDur;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(chords[c][0] * 0.25, ct);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.06, ct);
      g.gain.setValueAtTime(0.06, ct + chordDur - 0.3);
      g.gain.linearRampToValueAtTime(0, ct + chordDur);
      osc.connect(g).connect(masterGain);
      osc.start(ct);
      osc.stop(ct + chordDur);
      this.musicNodes.push(osc);
    }

    this.musicTimeout = setTimeout(() => {
      this.musicNodes = [];
      if (this.musicPlaying) this.playMusicLoop();
    }, (loopDur - 3) * 1000);
  }
};
