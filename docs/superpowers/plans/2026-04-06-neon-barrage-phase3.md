# Neon Barrage Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add procedural audio (11 SFX + ambient music loop) and haptics, all generated at runtime via Web Audio API.

**Architecture:** Single new `js/audio.js` file containing all sound generation. Lazy AudioContext initialization. Music is a self-contained looping system. Existing files get one-line sound trigger calls.

**Tech Stack:** Web Audio API (OscillatorNode, GainNode, BiquadFilterNode, AudioBufferSourceNode for noise).

**Spec:** `docs/superpowers/specs/2026-04-06-neon-barrage-phase3-design.md`

---

## File Map

| File | Changes |
|------|---------|
| `js/audio.js` (new) | Complete audio system: init, 11 SFX functions, music system, haptics |
| `index.html` | Add script tag for audio.js |
| `js/physics.js` | Add SFX triggers: ballHit, blockDestroyed, wallBounce, pickupCollected |
| `js/game.js` | Add SFX triggers: launch, turnComplete, gameOver, levelComplete, powerup, chest, buttonTap; music start/stop |

---

### Task 1: Create audio.js — Sound Effects

**Files:**
- Create: `js/audio.js`
- Modify: `index.html`

- [ ] **Step 1: Create js/audio.js with SFX system**

```js
const Audio = {
  ctx: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      // Web Audio not available
    }
  },

  // Ensure context is running (browsers suspend until user gesture)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  canPlay() {
    return this.initialized && saveData.settings.sound;
  },

  // --- Utility ---
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

  // --- Sound Effects ---

  // Ball hits a block: high sine blip 800→600Hz, 0.06s
  ballHit() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.createOsc('sine', 800, t, 0.06);
    osc.frequency.linearRampToValueAtTime(600, t + 0.06);
    const gain = this.createGain(0.15, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.06);
    osc.connect(gain).connect(this.ctx.destination);
  },

  // Block destroyed: noise burst + low thud + pop, 0.15s
  blockDestroyed() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;

    // Noise burst
    const noise = this.createNoise(0.08, t);
    const nGain = this.createGain(0.1, t);
    nGain.gain.linearRampToValueAtTime(0, t + 0.08);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    noise.connect(filter).connect(nGain).connect(this.ctx.destination);

    // Low thud
    const thud = this.createOsc('sine', 80, t, 0.12);
    const tGain = this.createGain(0.2, t);
    tGain.gain.linearRampToValueAtTime(0, t + 0.12);
    thud.connect(tGain).connect(this.ctx.destination);

    // Pop
    const pop = this.createOsc('sine', 400, t, 0.05);
    pop.frequency.linearRampToValueAtTime(200, t + 0.05);
    const pGain = this.createGain(0.12, t);
    pGain.gain.linearRampToValueAtTime(0, t + 0.05);
    pop.connect(pGain).connect(this.ctx.destination);
  },

  // Wall bounce: soft low thud 200Hz, 0.05s
  wallBounce() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.createOsc('sine', 200, t, 0.05);
    const gain = this.createGain(0.08, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
  },

  // Pickup collected: ascending ding 600→1400Hz, 0.2s
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

  // Ball launch: rising whoosh, 0.15s
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

  // Turn complete: two-note chime C5+E5, 0.3s
  turnComplete() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    // C5 = 523Hz
    const o1 = this.createOsc('sine', 523, t, 0.3);
    const g1 = this.createGain(0.1, t);
    g1.gain.linearRampToValueAtTime(0, t + 0.3);
    o1.connect(g1).connect(this.ctx.destination);
    // E5 = 659Hz (delayed slightly)
    const o2 = this.createOsc('sine', 659, t + 0.05, 0.25);
    const g2 = this.createGain(0.1, t + 0.05);
    g2.gain.linearRampToValueAtTime(0, t + 0.3);
    o2.connect(g2).connect(this.ctx.destination);
  },

  // Game over: descending tone 300→100Hz, 0.8s
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

  // Level complete: three-note fanfare C5→E5→G5→C6, 0.6s
  levelComplete() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    for (let i = 0; i < notes.length; i++) {
      const start = t + i * 0.12;
      const osc = this.createOsc('sine', notes[i], start, 0.4 - i * 0.05);
      const gain = this.createGain(0.12, start);
      gain.gain.linearRampToValueAtTime(0, start + 0.4 - i * 0.05);
      osc.connect(gain).connect(this.ctx.destination);
    }
  },

  // Powerup activated: electronic zap 200→1700Hz, 0.25s
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

  // Chest open: sparkle shimmer, 0.5s
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

  // Button tap: short click 1000Hz + noise, 0.04s
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
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  },

  vibrateLight()  { this.vibrate(10); },
  vibrateMedium() { this.vibrate(25); },
  vibrateHeavy()  { this.vibrate(50); },
  vibrateSuccess() { this.vibrate([50, 30, 50]); },
  vibrateError()   { this.vibrate([100, 50, 100]); },

  // --- Music ---
  musicPlaying: false,
  musicNodes: [],

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
  },

  playMusicLoop() {
    if (!this.musicPlaying || !this.ctx) return;

    const t = this.ctx.currentTime;
    const loopDur = 32; // seconds
    const chordDur = 4; // 4 seconds per chord
    // Chord progression: Cmaj7, Am7, Fmaj7, G7, Em7, Am7, Dm7, G7
    const chords = [
      [261.6, 329.6, 392.0, 493.9],  // Cmaj7
      [220.0, 261.6, 329.6, 392.0],  // Am7
      [174.6, 220.0, 261.6, 329.6],  // Fmaj7
      [196.0, 246.9, 293.7, 349.2],  // G7
      [164.8, 196.0, 246.9, 293.7],  // Em7
      [220.0, 261.6, 329.6, 392.0],  // Am7
      [146.8, 174.6, 220.0, 261.6],  // Dm7
      [196.0, 246.9, 293.7, 349.2]   // G7
    ];

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.25, t);
    masterGain.connect(this.ctx.destination);

    // Warm pad
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

    // Bass (root notes)
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

    // Schedule next loop
    setTimeout(() => {
      this.musicNodes = [];
      if (this.musicPlaying) this.playMusicLoop();
    }, (loopDur - 3) * 1000); // 3s crossfade overlap
  }
};
```

- [ ] **Step 2: Add script tag to index.html**

Add before the game.js script tag:
```html
<script src="js/audio.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add js/audio.js index.html
git commit -m "feat: add procedural audio system with 11 SFX, music loop, and haptics"
```

---

### Task 2: Wire SFX into Physics

**Files:**
- Modify: `js/physics.js`

- [ ] **Step 1: Add sound triggers to physics**

In `checkBlockCollisions`, after the damage section where `blockFlashTimer[i] = BLOCK_FLASH_DURATION;` is set (the line with `blockRotation[i] = ...`), add:
```js
        Audio.ballHit();
        Audio.vibrateLight();
```

Where `this.destroyBlock` is called, the destroy sound is already inside destroyBlock. Update `destroyBlock` to add:
```js
    Audio.blockDestroyed();
    Audio.vibrateMedium();
```
(Add after the `spawnParticles` call, before the explosive check)

In the wall collision section (where `ballVX` is reversed), add after each wall bounce:
```js
          Audio.wallBounce();
```
But to avoid spamming, only trigger wall bounce once per frame. Add a simple throttle: add a property `lastWallBounceTime: 0` to Physics, and only play if `this.ctx` time has advanced (or just skip the wall sound — it's very subtle). Actually, just add it to the left wall and right wall bounce sections. The sound is short enough that overlap is fine.

In `checkPickupCollection`, after `pickupActive[i] = 0;`:
```js
        Audio.pickupCollected();
        Audio.vibrateMedium();
```

In the stone armor hit section (where `blockArmor[i]--`), add:
```js
          Audio.ballHit();
          Audio.vibrateLight();
```

- [ ] **Step 2: Commit**

```bash
git add js/physics.js
git commit -m "feat: wire SFX triggers into physics (hit, destroy, bounce, pickup)"
```

---

### Task 3: Wire SFX and Music into Game

**Files:**
- Modify: `js/game.js`

- [ ] **Step 1: Init audio on first user interaction**

In `updateAiming`, at the very start (before powerup tap check), add:
```js
    Audio.init();
    Audio.resume();
```

Also add `Audio.init(); Audio.resume();` at the start of `renderMenu` input handling (before the first hitTestRect check).

- [ ] **Step 2: Add launch sound**

In `updateAiming`, where `this.state = STATE.LAUNCHING` is set, add:
```js
      Audio.ballLaunch();
```

- [ ] **Step 3: Add turn complete sound**

In `updateTurnEnd`, where `this.state = STATE.AIMING` is set at the end, add before it:
```js
    Audio.turnComplete();
```

- [ ] **Step 4: Add game over sound**

Where `this.state = STATE.GAME_OVER` is set in updateTurnEnd, add:
```js
        Audio.gameOver();
        Audio.vibrateError();
```

- [ ] **Step 5: Add level complete sound**

In `completeMission`, where `this.state = STATE.LEVEL_COMPLETE` is set, add:
```js
    Audio.levelComplete();
    Audio.vibrateSuccess();
```

- [ ] **Step 6: Add powerup activation sound**

In `activatePowerup`, add `Audio.powerupActivated(); Audio.vibrateMedium();` at the start of each powerup branch (after the inventory decrement). Or simpler: add it once at the end of the method, just before `syncPowerupsToSave()`:
```js
    Audio.powerupActivated();
    Audio.vibrateMedium();
```

- [ ] **Step 7: Add chest open sound**

In `openChest`, add at the start:
```js
    Audio.chestOpen();
    Audio.vibrateHeavy();
```

- [ ] **Step 8: Add button tap sound to menu buttons**

In each menu's input handling section (renderMenu, renderShop, renderSettings, renderGameOver, renderLevelComplete, LevelSelect.render), after a successful `Input.hitTestRect` match, add:
```js
        Audio.buttonTap();
        Audio.vibrateLight();
```

This is many locations. A simpler approach: add it to `Game.drawButton` — no, drawButton doesn't handle input. Instead, add `Audio.buttonTap(); Audio.vibrateLight();` in each hitTestRect success block. There are roughly 15 button hit locations. Add it to each.

OR even simpler: in the `Input.consumeTap` method, trigger the button sound. But that would play on every tap including aim taps. Skip this approach.

Just add `Audio.buttonTap();` after each `Input.consumeTap(); Input.consumeRelease();` pair in menu render methods. Do this for all menu screens.

- [ ] **Step 9: Start/stop music**

In `startLevel`, add at the end:
```js
    Audio.startMusic();
```

When transitioning to MENU (in checkPause, renderGameOver LEVELS button, renderLevelComplete MENU button), add:
```js
    Audio.stopMusic();
```

Also add `Audio.stopMusic();` at the start of `renderMenu` (so music stops whenever we're on the menu).

- [ ] **Step 10: Commit**

```bash
git add js/game.js
git commit -m "feat: wire SFX and music triggers into game flow"
```

---

### Task 4: Verification

- [ ] Test sounds play when: hitting blocks, destroying blocks, wall bounce, collecting pickups, launching, turn end, game over, level complete, activating powerups, opening chest, tapping buttons
- [ ] Test music plays during gameplay, stops on menu
- [ ] Test settings: turn off sound → no SFX, turn off music → no music
- [ ] Test haptics on mobile (or verify no errors on desktop)

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create audio.js + script tag | audio.js (new), index.html |
| 2 | Wire SFX into physics | physics.js |
| 3 | Wire SFX + music into game | game.js |
| 4 | Verification | (testing) |
