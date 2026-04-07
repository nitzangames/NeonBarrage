# Neon Barrage Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core gameplay loop of Neon Barrage — a brick breaker where you aim and launch volleys of balls to destroy blocks that descend each turn. Phase 1 covers normal blocks, pickups, basic HUD, menus, level progression, and the neon visual style.

**Architecture:** Multi-file vanilla JS loaded via script tags. All game objects use pre-allocated parallel arrays (object pools). A central state machine in `game.js` drives turn flow. Canvas 2D renders everything at native 1080×1920, CSS-scaled to viewport. Unit-based coordinate system internally, converted to pixels by the renderer.

**Tech Stack:** HTML5 Canvas 2D, vanilla JavaScript (no framework/bundler), Google Fonts (Orbitron, Rajdhani), localStorage for persistence.

**Spec:** `docs/superpowers/specs/2026-04-06-neon-barrage-phase1-design.md`

**GDD:** `/Users/nitzanwilnai/Programming/Claude/NeonBarrage/GDD.md`

**Platform guide:** `/Users/nitzanwilnai/Programming/Claude/GamesPlatform/docs/game-developer-guide.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `meta.json` | Platform metadata (slug, title, tags, thumbnail) |
| `index.html` | Entry point: canvas element, font loading, script tags |
| `js/constants.js` | All colors, sizes, grid config, tuning values, game state enum |
| `js/game-data.js` | Parallel arrays for blocks/balls/pickups/particles; init/reset/activate/deactivate helpers |
| `js/storage.js` | localStorage wrapper with `neon-barrage:` prefix; load/save progress |
| `js/levels.js` | Difficulty curve, mission target calc, HP scaling, row generation |
| `js/physics.js` | Ball sub-stepping, circle-AABB collision, wall/ceiling bounce, floor return |
| `js/input.js` | Touch + mouse input, aim direction calc, UI button hit testing |
| `js/renderer.js` | All canvas drawing: field, blocks, balls, trails, particles, HUD, menus |
| `js/game.js` | State machine, turn flow, launch sequence, scoring, game-over/level-complete logic |
| `js/main.js` | Bootstrap: resize canvas, load fonts, start game loop |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `meta.json`
- Create: `index.html`
- Create: `js/constants.js`
- Create: `js/main.js`

**Result:** Opening `index.html` shows a dark neon background filling the viewport with the canvas properly scaled.

- [ ] **Step 1: Create meta.json**

```json
{
  "slug": "neon-barrage",
  "title": "Neon Barrage",
  "description": "A brick breaker where you aim and launch volleys of balls to destroy descending blocks.",
  "tags": ["arcade", "brick-breaker", "casual"],
  "author": "Nitzan Wilnai",
  "thumbnail": "thumbnail.png"
}
```

- [ ] **Step 2: Create index.html**

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Neon Barrage</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@700&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #0f0f1e; touch-action: none; }
canvas { display: block; position: absolute; top: 0; left: 50%; transform: translateX(-50%); }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script src="js/constants.js"></script>
<script src="js/game-data.js"></script>
<script src="js/storage.js"></script>
<script src="js/levels.js"></script>
<script src="js/physics.js"></script>
<script src="js/input.js"></script>
<script src="js/renderer.js"></script>
<script src="js/game.js"></script>
<script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create js/constants.js**

```js
// --- Game States ---
const STATE = {
  MENU: 0,
  LEVEL_SELECT: 1,
  AIMING: 2,
  LAUNCHING: 3,
  FLIGHT: 4,
  TURN_END: 5,
  GAME_OVER: 6,
  LEVEL_COMPLETE: 7
};

// --- Colors (RGB arrays for canvas) ---
const COL = {
  bgDark:     [15, 15, 30],
  bgPanel:    [12, 12, 26],
  bgCard:     [20, 20, 42],
  borderDim:  [26, 26, 58],
  green:      [15, 255, 149],
  greenDark:  [0, 204, 118],
  blue:       [26, 143, 255],
  purple:     [108, 60, 224],
  orange:     [255, 107, 53],
  gold:       [255, 170, 0],
  textWhite:  [230, 230, 255],
  textDim:    [100, 100, 140],
  textDark:   [10, 10, 22],
  red:        [255, 60, 60]
};

// Helper to create CSS color strings
function rgb(c, a) {
  if (a !== undefined) return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// --- Grid ---
const GRID_COLS = 7;
const GRID_ROWS = 9;
const BLOCK_SIZE = 1.0;       // units
const BLOCK_SPACING = 0.12;   // units
const CELL_SIZE = BLOCK_SIZE + BLOCK_SPACING; // 1.12 units
const FIELD_WIDTH = GRID_COLS * CELL_SIZE;    // 7.84 units
const FIELD_HEIGHT = GRID_ROWS * CELL_SIZE;   // 10.08 units

// --- Ball ---
const BALL_SPEED = 14;        // units/sec
const BALL_RADIUS = 0.15;     // units
const BALL_START_COUNT = 5;
const LAUNCH_DELAY = 0.04;    // seconds between balls
const MIN_AIM_Y = 0.15;       // minimum Y component of aim direction
const SUB_STEP = BALL_RADIUS * 1.8; // 0.27 units

// --- Ball Trail ---
const TRAIL_LENGTH = 8;
const TRAIL_MAX_WIDTH = 0.225; // units

// --- Particles ---
const DESTROY_PARTICLE_COUNT = 20;
const DESTROY_PARTICLE_SPEED = 5;  // units/sec ±50%
const DESTROY_PARTICLE_LIFE = 0.4; // seconds

// --- Block Hit ---
const BLOCK_FLASH_DURATION = 0.12; // seconds

// --- Pickup ---
const PICKUP_SPAWN_CHANCE = 0.15;
const PICKUP_BALL_BONUS = 5;
const PICKUP_COLLECT_RADIUS = BALL_RADIUS + BLOCK_SIZE * 0.3;

// --- Row Spawning ---
const MIN_BLOCKS_PER_ROW = 1;
const MAX_BLOCKS_PER_ROW = 5;

// --- HP Scaling ---
const BASE_HP = 15;
const HP_SCALE_PER_TURN = 7.5;

// --- Pool Sizes ---
const MAX_BLOCKS = 128;
const MAX_BALLS = 512;
const MAX_PICKUPS = 32;
const MAX_PARTICLES = 256;

// --- Levels ---
const TOTAL_LEVELS = 60;

// --- Delta Time ---
const MAX_DT = 0.033; // cap at ~30fps minimum

// --- Fonts ---
const FONT_TITLE = "'Orbitron', sans-serif";
const FONT_BODY = "'Rajdhani', sans-serif";

// --- Launch Area ---
const LAUNCH_AREA_HEIGHT = 1.5; // units below the grid for launch point

// --- Block HP → Color ---
function blockColor(hp) {
  if (hp <= 15)  return COL.green;
  if (hp <= 50)  return COL.blue;
  if (hp <= 125) return COL.purple;
  return COL.orange;
}
```

- [ ] **Step 4: Create js/main.js (minimal bootstrap)**

```js
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// --- Canvas Sizing ---
// fieldRect: the fixed game area in pixels
// scale: units → pixels conversion factor
let canvasW, canvasH, scale, fieldRect;

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Canvas width = viewport width, capped at 9:16 ratio of viewport height
  canvasW = Math.min(vw, Math.floor(vh * 9 / 16));
  canvasH = vh;

  canvas.width = canvasW;
  canvas.height = canvasH;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';

  // Scale: how many pixels per unit. Fit field width to canvas width with padding.
  const padding = canvasW * 0.04; // 4% padding each side
  scale = (canvasW - padding * 2) / FIELD_WIDTH;

  // Field rect: centered horizontally, positioned with top margin
  const fieldW = FIELD_WIDTH * scale;
  const fieldH = (FIELD_HEIGHT + LAUNCH_AREA_HEIGHT) * scale;
  const fieldX = (canvasW - fieldW) / 2;
  // Vertically: leave space for HUD at top, center remaining
  const hudHeight = canvasH * 0.08;
  const fieldY = hudHeight + ((canvasH - hudHeight - fieldH) / 2);

  fieldRect = { x: fieldX, y: fieldY, w: fieldW, h: fieldH };
}

window.addEventListener('resize', resize);
resize();

// --- Game Loop ---
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, MAX_DT);
  lastTime = timestamp;

  // Clear
  ctx.fillStyle = rgb(COL.bgDark);
  ctx.fillRect(0, 0, canvasW, canvasH);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(function(timestamp) {
  lastTime = timestamp;
  requestAnimationFrame(gameLoop);
});
```

- [ ] **Step 5: Verify in browser**

Open `index.html` in a browser. Expected: dark neon background (#0f0f1e) filling the viewport. Canvas is centered horizontally and fills the full viewport height. Resizing the window should re-scale properly.

- [ ] **Step 6: Commit**

```bash
git init
git add meta.json index.html js/constants.js js/main.js
git commit -m "feat: project scaffolding with canvas setup and constants"
```

---

### Task 2: Object Pools (game-data.js)

**Files:**
- Create: `js/game-data.js`

**Result:** All parallel arrays pre-allocated. Helper functions to activate/deactivate pool objects. No visual change yet.

- [ ] **Step 1: Create js/game-data.js**

```js
// --- Parallel Arrays: Blocks ---
const blockX = new Float32Array(MAX_BLOCKS);
const blockY = new Float32Array(MAX_BLOCKS);
const blockHP = new Int32Array(MAX_BLOCKS);
const blockMaxHP = new Int32Array(MAX_BLOCKS);
const blockActive = new Uint8Array(MAX_BLOCKS);
const blockFlashTimer = new Float32Array(MAX_BLOCKS);
const blockRow = new Int32Array(MAX_BLOCKS);
const blockCol = new Int32Array(MAX_BLOCKS);

// --- Parallel Arrays: Balls ---
const ballX = new Float32Array(MAX_BALLS);
const ballY = new Float32Array(MAX_BALLS);
const ballVX = new Float32Array(MAX_BALLS);
const ballVY = new Float32Array(MAX_BALLS);
const ballActive = new Uint8Array(MAX_BALLS);
// Trail: each ball stores TRAIL_LENGTH positions
const ballTrailX = [];
const ballTrailY = [];
for (let i = 0; i < MAX_BALLS; i++) {
  ballTrailX[i] = new Float32Array(TRAIL_LENGTH);
  ballTrailY[i] = new Float32Array(TRAIL_LENGTH);
}

// --- Parallel Arrays: Pickups ---
const pickupX = new Float32Array(MAX_PICKUPS);
const pickupY = new Float32Array(MAX_PICKUPS);
const pickupRow = new Int32Array(MAX_PICKUPS);
const pickupCol = new Int32Array(MAX_PICKUPS);
const pickupActive = new Uint8Array(MAX_PICKUPS);

// --- Parallel Arrays: Particles ---
const partX = new Float32Array(MAX_PARTICLES);
const partY = new Float32Array(MAX_PARTICLES);
const partVX = new Float32Array(MAX_PARTICLES);
const partVY = new Float32Array(MAX_PARTICLES);
const partLife = new Float32Array(MAX_PARTICLES);
const partMaxLife = new Float32Array(MAX_PARTICLES);
const partR = new Uint8Array(MAX_PARTICLES);
const partG = new Uint8Array(MAX_PARTICLES);
const partB = new Uint8Array(MAX_PARTICLES);
const partActive = new Uint8Array(MAX_PARTICLES);

// --- Pool Helpers ---
function activateBlock(col, row, hp) {
  for (let i = 0; i < MAX_BLOCKS; i++) {
    if (!blockActive[i]) {
      blockActive[i] = 1;
      blockCol[i] = col;
      blockRow[i] = row;
      blockX[i] = col * CELL_SIZE + BLOCK_SPACING / 2;
      blockY[i] = row * CELL_SIZE + BLOCK_SPACING / 2;
      blockHP[i] = hp;
      blockMaxHP[i] = hp;
      blockFlashTimer[i] = 0;
      return i;
    }
  }
  return -1;
}

function activateBall(x, y, vx, vy) {
  for (let i = 0; i < MAX_BALLS; i++) {
    if (!ballActive[i]) {
      ballActive[i] = 1;
      ballX[i] = x;
      ballY[i] = y;
      ballVX[i] = vx;
      ballVY[i] = vy;
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        ballTrailX[i][t] = x;
        ballTrailY[i][t] = y;
      }
      return i;
    }
  }
  return -1;
}

function activatePickup(col, row) {
  for (let i = 0; i < MAX_PICKUPS; i++) {
    if (!pickupActive[i]) {
      pickupActive[i] = 1;
      pickupCol[i] = col;
      pickupRow[i] = row;
      pickupX[i] = col * CELL_SIZE + CELL_SIZE / 2;
      pickupY[i] = row * CELL_SIZE + CELL_SIZE / 2;
      return i;
    }
  }
  return -1;
}

function spawnParticles(x, y, count, speed, life, r, g, b) {
  for (let n = 0; n < count; n++) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!partActive[i]) {
        partActive[i] = 1;
        partX[i] = x;
        partY[i] = y;
        const angle = Math.random() * Math.PI * 2;
        const spd = speed * (0.5 + Math.random());
        partVX[i] = Math.cos(angle) * spd;
        partVY[i] = Math.sin(angle) * spd;
        partLife[i] = life;
        partMaxLife[i] = life;
        partR[i] = r;
        partG[i] = g;
        partB[i] = b;
        break;
      }
    }
  }
}

function clearAllPools() {
  blockActive.fill(0);
  ballActive.fill(0);
  pickupActive.fill(0);
  partActive.fill(0);
}
```

- [ ] **Step 2: Verify no errors**

Open `index.html` in browser, open dev console. Expected: no errors. Canvas still shows dark background. Type `blockActive` in console to verify the array exists and has length 128.

- [ ] **Step 3: Commit**

```bash
git add js/game-data.js
git commit -m "feat: add object pool parallel arrays with activate/deactivate helpers"
```

---

### Task 3: Storage (storage.js)

**Files:**
- Create: `js/storage.js`

**Result:** Save/load functions for game progress. No visual change.

- [ ] **Step 1: Create js/storage.js**

```js
const STORAGE_PREFIX = 'neon-barrage:';

const saveData = {
  stars: new Array(TOTAL_LEVELS).fill(0),
  currentLevel: 0,
  bestScore: 0
};

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_PREFIX + 'progress', JSON.stringify(saveData));
  } catch (e) {
    // Storage full or unavailable — silently fail
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'progress');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.stars && data.stars.length === TOTAL_LEVELS) {
        saveData.stars = data.stars;
      }
      if (typeof data.currentLevel === 'number') {
        saveData.currentLevel = data.currentLevel;
      }
      if (typeof data.bestScore === 'number') {
        saveData.bestScore = data.bestScore;
      }
    }
  } catch (e) {
    // Corrupt data — use defaults
  }
}
```

- [ ] **Step 2: Verify in console**

Open browser console. Run `loadProgress(); saveData` — should show default values. Run `saveData.bestScore = 99; saveProgress(); loadProgress(); saveData.bestScore` — should return 99.

- [ ] **Step 3: Commit**

```bash
git add js/storage.js
git commit -m "feat: add localStorage persistence with slug-prefixed keys"
```

---

### Task 4: Levels (levels.js)

**Files:**
- Create: `js/levels.js`

**Result:** Functions to calculate difficulty, mission targets, HP, and spawn rows.

- [ ] **Step 1: Create js/levels.js**

```js
// Difficulty multiplier pattern per 10-level group
const DIFFICULTY_PATTERN = [0.70, 0.70, 0.90, 0.90, 1.00, 0.75, 1.10, 1.10, 1.30, 0.80];

function getLevelDifficulty(level) {
  const progression = 1 + level * 0.25;
  const multiplier = DIFFICULTY_PATTERN[level % 10];
  return progression * multiplier;
}

function getMissionTarget(level) {
  // Phase 1: all levels use "Survive N Turns"
  const difficulty = getLevelDifficulty(level);
  return Math.round(8 * difficulty);
}

function getBlockHP(turn) {
  return Math.max(1, Math.round(BASE_HP + HP_SCALE_PER_TURN * (turn - 1)));
}

function calcStars(current, target) {
  if (current >= target * 2) return 3;
  if (current >= target * 1.5) return 2;
  if (current >= target) return 1;
  return 0;
}

// --- Row Spawning ---
// Spawns a new row at the given rowIndex with blocks and pickups.
// Call shiftBlocksDown() first to make room.
function spawnRow(rowIndex, turn) {
  const hp = getBlockHP(turn);
  const blockCount = MIN_BLOCKS_PER_ROW + Math.floor(Math.random() * (MAX_BLOCKS_PER_ROW - MIN_BLOCKS_PER_ROW + 1));

  // Pick which columns get blocks
  const cols = [];
  for (let c = 0; c < GRID_COLS; c++) cols.push(c);
  // Shuffle and take blockCount
  for (let i = cols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = cols[i]; cols[i] = cols[j]; cols[j] = tmp;
  }
  const blockCols = cols.slice(0, blockCount);
  const emptyCols = cols.slice(blockCount);

  // Place blocks
  for (let c = 0; c < blockCount; c++) {
    activateBlock(blockCols[c], rowIndex, hp);
  }

  // Place pickups in empty cells (15% chance each)
  for (let c = 0; c < emptyCols.length; c++) {
    if (Math.random() < PICKUP_SPAWN_CHANCE) {
      activatePickup(emptyCols[c], rowIndex);
    }
  }
}

function shiftBlocksDown() {
  for (let i = 0; i < MAX_BLOCKS; i++) {
    if (blockActive[i]) {
      blockRow[i]++;
      blockY[i] = blockRow[i] * CELL_SIZE + BLOCK_SPACING / 2;
    }
  }
  for (let i = 0; i < MAX_PICKUPS; i++) {
    if (pickupActive[i]) {
      pickupRow[i]++;
      pickupY[i] = pickupRow[i] * CELL_SIZE + CELL_SIZE / 2;
      // Remove pickups that fall below the grid
      if (pickupRow[i] >= GRID_ROWS) {
        pickupActive[i] = 0;
      }
    }
  }
}

// Check if any block has reached row 0 (actually row >= GRID_ROWS - 1, since row 0 is top)
// Blocks at GRID_ROWS or beyond means game over (they've reached the bottom)
function checkGameOver() {
  for (let i = 0; i < MAX_BLOCKS; i++) {
    if (blockActive[i] && blockRow[i] >= GRID_ROWS) {
      return true;
    }
  }
  return false;
}
```

- [ ] **Step 2: Verify in console**

Open console. Run `getLevelDifficulty(0)` — should return ~0.7. Run `getMissionTarget(0)` — should return ~6. Run `getBlockHP(1)` — should return 15. Run `getBlockHP(5)` — should return 45.

- [ ] **Step 3: Commit**

```bash
git add js/levels.js
git commit -m "feat: add level difficulty curve, mission targets, HP scaling, and row spawning"
```

---

### Task 5: Renderer Foundation + Block Drawing

**Files:**
- Create: `js/renderer.js`
- Modify: `js/main.js` — call renderer in game loop

**Result:** Opening the game shows the playing field area with a few test blocks drawn in the correct neon colors with HP numbers.

- [ ] **Step 1: Create js/renderer.js**

```js
const Renderer = {
  // Convert unit coords to canvas pixels (relative to field)
  ux(units) { return fieldRect.x + units * scale; },
  uy(units) { return fieldRect.y + units * scale; },
  us(units) { return units * scale; },

  drawBackground() {
    ctx.fillStyle = rgb(COL.bgDark);
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Field border (subtle)
    ctx.strokeStyle = rgb(COL.borderDim);
    ctx.lineWidth = 1;
    ctx.strokeRect(fieldRect.x, fieldRect.y, FIELD_WIDTH * scale, FIELD_HEIGHT * scale);
  },

  drawBlock(i) {
    if (!blockActive[i]) return;

    const px = this.ux(blockX[i]);
    const py = this.uy(blockY[i]);
    const pw = this.us(BLOCK_SIZE);
    const ph = this.us(BLOCK_SIZE);
    const radius = this.us(0.1); // corner radius

    const color = blockColor(blockHP[i]);

    // Rounded rect
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, radius);

    // Flash white on hit
    if (blockFlashTimer[i] > 0) {
      const flash = blockFlashTimer[i] / BLOCK_FLASH_DURATION;
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`;
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, radius);
    }

    ctx.fillStyle = rgb(color);
    ctx.fill();

    // Glow border
    ctx.strokeStyle = rgb(color, 0.5);
    ctx.lineWidth = this.us(0.03);
    ctx.stroke();

    // HP text
    const hp = blockHP[i];
    const fontSize = hp >= 100 ? this.us(0.28) : this.us(0.35);
    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDark);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hp, px + pw / 2, py + ph / 2);
  },

  drawBlocks() {
    for (let i = 0; i < MAX_BLOCKS; i++) {
      this.drawBlock(i);
    }
  },

  drawPickup(i) {
    if (!pickupActive[i]) return;

    const px = this.ux(pickupX[i]);
    const py = this.uy(pickupY[i]);
    const r = this.us(BLOCK_SIZE * 0.2);

    // Outer glow
    ctx.beginPath();
    ctx.arc(px, py, r * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green, 0.15);
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green);
    ctx.fill();

    // "+" text
    ctx.font = `bold ${this.us(0.25)}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDark);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', px, py);
  },

  drawPickups() {
    for (let i = 0; i < MAX_PICKUPS; i++) {
      this.drawPickup(i);
    }
  },

  drawBall(i) {
    if (!ballActive[i]) return;

    const px = this.ux(ballX[i]);
    const py = this.uy(ballY[i]);
    const r = this.us(BALL_RADIUS);

    // Trail
    ctx.lineCap = 'round';
    for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
      const alpha = (1 - t / TRAIL_LENGTH) * 0.6;
      const width = TRAIL_MAX_WIDTH * (1 - t / TRAIL_LENGTH);
      ctx.beginPath();
      ctx.moveTo(this.ux(ballTrailX[i][t]), this.uy(ballTrailY[i][t]));
      ctx.lineTo(this.ux(ballTrailX[i][t + 1]), this.uy(ballTrailY[i][t + 1]));
      ctx.strokeStyle = rgb(COL.green, alpha);
      ctx.lineWidth = this.us(width);
      ctx.stroke();
    }

    // Ball glow
    ctx.beginPath();
    ctx.arc(px, py, r * 2, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green, 0.2);
    ctx.fill();

    // Ball
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green);
    ctx.fill();
  },

  drawBalls() {
    for (let i = 0; i < MAX_BALLS; i++) {
      this.drawBall(i);
    }
  },

  drawParticles() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!partActive[i]) continue;
      const alpha = partLife[i] / partMaxLife[i];
      const r = this.us(0.06);
      ctx.beginPath();
      ctx.arc(this.ux(partX[i]), this.uy(partY[i]), r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${partR[i]},${partG[i]},${partB[i]},${alpha})`;
      ctx.fill();
    }
  },

  drawAimLine(launchX, launchY, dirX, dirY) {
    if (dirX === 0 && dirY === 0) return;

    const dashLen = 0.2;
    const gapLen = 0.15;
    const maxBounces = 3;
    const maxDist = 30;

    let x = launchX, y = launchY;
    let dx = dirX, dy = dirY;
    let dist = 0;
    let bounces = 0;
    let drawing = true;
    let segDist = 0;
    let inDash = true;

    ctx.strokeStyle = rgb(COL.green, 0.4);
    ctx.lineWidth = this.us(0.04);
    ctx.beginPath();
    ctx.moveTo(this.ux(x), this.uy(y));

    const step = 0.05;
    while (dist < maxDist && bounces <= maxBounces) {
      const nx = x + dx * step;
      const ny = y + dy * step;

      // Wall bounces
      if (nx - BALL_RADIUS < 0 || nx + BALL_RADIUS > FIELD_WIDTH) {
        dx = -dx;
        bounces++;
        continue;
      }
      // Ceiling bounce
      if (ny - BALL_RADIUS < 0) {
        dy = -dy;
        bounces++;
        continue;
      }

      x = nx;
      y = ny;
      dist += step;
      segDist += step;

      if (inDash) {
        ctx.lineTo(this.ux(x), this.uy(y));
        if (segDist >= dashLen) { inDash = false; segDist = 0; }
      } else {
        ctx.moveTo(this.ux(x), this.uy(y));
        if (segDist >= gapLen) { inDash = true; segDist = 0; }
      }
    }
    ctx.stroke();
  },

  // Ball count display at launch point
  drawLaunchPoint(launchX, launchY, ballCount) {
    const px = this.ux(launchX);
    const py = this.uy(launchY);

    ctx.font = `bold ${this.us(0.4)}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.green);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×' + ballCount, px, py + this.us(0.5));
  }
};
```

- [ ] **Step 2: Add test rendering to main.js game loop**

Add the following inside the `gameLoop` function, after clearing the canvas:

```js
  Renderer.drawBackground();
  Renderer.drawBlocks();
  Renderer.drawPickups();
  Renderer.drawBalls();
  Renderer.drawParticles();
```

And after `resize()` but before the game loop, add a temporary test to spawn some blocks:

```js
// Temporary test: spawn some blocks to verify rendering
loadProgress();
activateBlock(0, 0, 10);   // green
activateBlock(1, 0, 30);   // blue
activateBlock(2, 0, 80);   // purple
activateBlock(3, 0, 150);  // orange
activateBlock(4, 1, 15);
activateBlock(5, 1, 50);
activatePickup(6, 0);
activatePickup(3, 1);
```

- [ ] **Step 3: Verify in browser**

Open `index.html`. Expected: dark background with a field area outlined. Blocks visible in row 0 and row 1 in correct colors (green, blue, purple, orange). HP numbers centered on each block. Two pickups visible as green glowing circles with "+" text.

- [ ] **Step 4: Remove test blocks, commit**

Remove the temporary test block spawning code from `main.js`.

```bash
git add js/renderer.js js/main.js
git commit -m "feat: add renderer with block, pickup, ball, particle, and aim line drawing"
```

---

### Task 6: Physics (physics.js)

**Files:**
- Create: `js/physics.js`

**Result:** Ball movement, collision detection, and boundary handling functions ready to be called by the game loop.

- [ ] **Step 1: Create js/physics.js**

```js
const Physics = {
  // Track last-hit block per ball to prevent double-damage in same sub-step
  lastHitBlock: new Int32Array(MAX_BALLS),

  resetLastHit() {
    this.lastHitBlock.fill(-1);
  },

  // Update all active balls by dt seconds. Returns number of balls still active.
  update(dt, gameState) {
    let activeBalls = 0;
    const totalDist = BALL_SPEED * dt;
    const steps = Math.max(1, Math.ceil(totalDist / SUB_STEP));
    const stepDist = totalDist / steps;

    for (let i = 0; i < MAX_BALLS; i++) {
      if (!ballActive[i]) continue;

      // Update trail: shift positions
      for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
        ballTrailX[i][t] = ballTrailX[i][t - 1];
        ballTrailY[i][t] = ballTrailY[i][t - 1];
      }
      ballTrailX[i][0] = ballX[i];
      ballTrailY[i][0] = ballY[i];

      for (let s = 0; s < steps; s++) {
        const speed = Math.sqrt(ballVX[i] * ballVX[i] + ballVY[i] * ballVY[i]);
        if (speed < 0.001) { ballActive[i] = 0; break; }

        const nx = ballVX[i] / speed;
        const ny = ballVY[i] / speed;
        ballX[i] += nx * stepDist;
        ballY[i] += ny * stepDist;

        // Wall collisions
        if (ballX[i] - BALL_RADIUS < 0) {
          ballX[i] = BALL_RADIUS;
          ballVX[i] = Math.abs(ballVX[i]);
        } else if (ballX[i] + BALL_RADIUS > FIELD_WIDTH) {
          ballX[i] = FIELD_WIDTH - BALL_RADIUS;
          ballVX[i] = -Math.abs(ballVX[i]);
        }

        // Ceiling collision
        if (ballY[i] - BALL_RADIUS < 0) {
          ballY[i] = BALL_RADIUS;
          ballVY[i] = Math.abs(ballVY[i]);
        }

        // Floor — ball returned
        if (ballY[i] > FIELD_HEIGHT + LAUNCH_AREA_HEIGHT) {
          ballActive[i] = 0;
          break;
        }

        // Block collisions
        this.checkBlockCollisions(i, gameState);

        // Pickup collection
        this.checkPickupCollection(i, gameState);
      }

      if (ballActive[i]) activeBalls++;
    }

    return activeBalls;
  },

  checkBlockCollisions(ballIdx, gameState) {
    const bx = ballX[ballIdx];
    const by = ballY[ballIdx];

    for (let i = 0; i < MAX_BLOCKS; i++) {
      if (!blockActive[i]) continue;
      if (this.lastHitBlock[ballIdx] === i) continue;

      // Block rect
      const rx = blockX[i];
      const ry = blockY[i];
      const rw = BLOCK_SIZE;
      const rh = BLOCK_SIZE;

      // Closest point on rect to ball center
      const cx = Math.max(rx, Math.min(bx, rx + rw));
      const cy = Math.max(ry, Math.min(by, ry + rh));

      const dx = bx - cx;
      const dy = by - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < BALL_RADIUS * BALL_RADIUS) {
        // Hit! Determine reflection direction
        this.lastHitBlock[ballIdx] = i;

        // Overlap amounts
        const overlapX = (BALL_RADIUS + rw / 2) - Math.abs(bx - (rx + rw / 2));
        const overlapY = (BALL_RADIUS + rh / 2) - Math.abs(by - (ry + rh / 2));

        if (overlapX < overlapY) {
          ballVX[ballIdx] = -ballVX[ballIdx];
          // Push out
          if (bx < rx + rw / 2) ballX[ballIdx] = rx - BALL_RADIUS;
          else ballX[ballIdx] = rx + rw + BALL_RADIUS;
        } else {
          ballVY[ballIdx] = -ballVY[ballIdx];
          if (by < ry + rh / 2) ballY[ballIdx] = ry - BALL_RADIUS;
          else ballY[ballIdx] = ry + rh + BALL_RADIUS;
        }

        // Damage
        blockHP[i]--;
        blockFlashTimer[i] = BLOCK_FLASH_DURATION;
        gameState.score++;

        if (blockHP[i] <= 0) {
          // Destroy block
          blockActive[i] = 0;
          gameState.score++; // bonus for destroy
          gameState.blocksDestroyed++;

          // Spawn particles
          const color = blockColor(blockMaxHP[i]);
          spawnParticles(
            blockX[i] + BLOCK_SIZE / 2,
            blockY[i] + BLOCK_SIZE / 2,
            DESTROY_PARTICLE_COUNT,
            DESTROY_PARTICLE_SPEED,
            DESTROY_PARTICLE_LIFE,
            color[0], color[1], color[2]
          );
        }

        break; // One collision per sub-step per ball
      }
    }
  },

  checkPickupCollection(ballIdx, gameState) {
    const bx = ballX[ballIdx];
    const by = ballY[ballIdx];

    for (let i = 0; i < MAX_PICKUPS; i++) {
      if (!pickupActive[i]) continue;

      const dx = bx - pickupX[i];
      const dy = by - pickupY[i];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PICKUP_COLLECT_RADIUS) {
        pickupActive[i] = 0;
        gameState.ballCount += PICKUP_BALL_BONUS;
        gameState.pickupsCollected++;
      }
    }
  },

  // Update particles
  updateParticles(dt) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!partActive[i]) continue;
      partX[i] += partVX[i] * dt;
      partY[i] += partVY[i] * dt;
      partLife[i] -= dt;
      if (partLife[i] <= 0) partActive[i] = 0;
    }
  },

  // Update block flash timers
  updateBlockFlash(dt) {
    for (let i = 0; i < MAX_BLOCKS; i++) {
      if (blockFlashTimer[i] > 0) {
        blockFlashTimer[i] = Math.max(0, blockFlashTimer[i] - dt);
      }
    }
  }
};
```

- [ ] **Step 2: Verify no errors**

Open `index.html`, check console for errors. No visual change expected yet since game.js doesn't exist to call Physics.update().

- [ ] **Step 3: Commit**

```bash
git add js/physics.js
git commit -m "feat: add ball physics with sub-stepping, circle-AABB collision, and pickups"
```

---

### Task 7: Input (input.js)

**Files:**
- Create: `js/input.js`

**Result:** Touch/mouse input captured and converted to aim direction in unit coordinates.

- [ ] **Step 1: Create js/input.js**

```js
const Input = {
  // Current pointer state
  isDown: false,
  pointerX: 0,  // canvas pixels
  pointerY: 0,

  // Aim direction (unit vector, 0,0 if not aiming)
  aimDirX: 0,
  aimDirY: 0,
  isAiming: false,
  aimReleased: false, // true for one frame when released

  // Launch point in units
  launchX: FIELD_WIDTH / 2,
  launchY: FIELD_HEIGHT + LAUNCH_AREA_HEIGHT * 0.3,

  init() {
    canvas.addEventListener('mousedown', (e) => this.onDown(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseup', () => this.onUp());

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onDown(t.clientX, t.clientY);
    });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMove(t.clientX, t.clientY);
    });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onUp();
    });
  },

  onDown(clientX, clientY) {
    this.isDown = true;
    this.updatePointer(clientX, clientY);
  },

  onMove(clientX, clientY) {
    if (!this.isDown) return;
    this.updatePointer(clientX, clientY);
  },

  onUp() {
    if (this.isDown && this.isAiming) {
      this.aimReleased = true;
    }
    this.isDown = false;
  },

  updatePointer(clientX, clientY) {
    // Convert client coords to canvas coords
    const rect = canvas.getBoundingClientRect();
    this.pointerX = clientX - rect.left;
    this.pointerY = clientY - rect.top;
  },

  // Call each frame during AIMING state to update aim direction
  updateAim() {
    this.aimReleased = false;

    if (!this.isDown) {
      this.isAiming = false;
      return;
    }

    // Convert pointer to unit coords
    const unitX = (this.pointerX - fieldRect.x) / scale;
    const unitY = (this.pointerY - fieldRect.y) / scale;

    // Direction from launch point toward pointer (but we aim upward, so invert)
    let dx = unitX - this.launchX;
    let dy = unitY - this.launchY;

    // We want to aim upward (negative Y direction) — invert if pointer is above launch
    // Actually: aim direction = from launch toward where the player drags
    // But in brick breakers, you typically drag below and aim above
    // GDD says "drags upward from launch point" — so direction is from pointer toward launch, then continue
    // Simpler: aim toward the pointer position, which should be above the launch point
    dy = -Math.abs(dy); // Always aim upward

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;

    dx /= len;
    dy /= len;

    // Clamp minimum Y angle
    if (-dy < MIN_AIM_Y) {
      dy = -MIN_AIM_Y;
      dx = Math.sign(dx) * Math.sqrt(1 - dy * dy);
    }

    this.aimDirX = dx;
    this.aimDirY = dy;
    this.isAiming = true;
  },

  // Hit test a rectangular button (in canvas pixel coords)
  hitTestRect(x, y, w, h) {
    if (!this.aimReleased && !this.isDown) return false;
    const px = this.pointerX;
    const py = this.pointerY;
    return px >= x && px <= x + w && py >= y && py <= y + h;
  },

  consumeRelease() {
    this.aimReleased = false;
  }
};
```

- [ ] **Step 2: Verify no errors**

Open `index.html`, check console. No visual change yet.

- [ ] **Step 3: Commit**

```bash
git add js/input.js
git commit -m "feat: add touch/mouse input handling with aim direction calculation"
```

---

### Task 8: Game State Machine (game.js)

**Files:**
- Create: `js/game.js`
- Modify: `js/main.js` — wire up game loop to Game.update/render

**Result:** Playable core loop: can aim, launch balls, balls bounce and destroy blocks, turns progress, game over detection works.

- [ ] **Step 1: Create js/game.js**

```js
const Game = {
  state: STATE.MENU,
  level: 0,
  turn: 0,
  score: 0,
  ballCount: BALL_START_COUNT,
  ballsLaunched: 0,
  ballsReturned: 0,
  launchTimer: 0,
  blocksDestroyed: 0,
  pickupsCollected: 0,
  missionTarget: 0,
  starsEarned: 0,
  autoCompleteTimer: 0,

  // For level complete / game over tracking
  prevBestStars: 0,

  startLevel(level) {
    this.level = level;
    this.turn = 0;
    this.score = 0;
    this.ballCount = BALL_START_COUNT;
    this.ballsLaunched = 0;
    this.ballsReturned = 0;
    this.launchTimer = 0;
    this.blocksDestroyed = 0;
    this.pickupsCollected = 0;
    this.missionTarget = getMissionTarget(level);
    this.starsEarned = 0;
    this.autoCompleteTimer = 0;
    this.prevBestStars = saveData.stars[level];

    clearAllPools();
    Physics.resetLastHit();

    // Spawn initial row
    this.turn = 1;
    spawnRow(0, this.turn);

    this.state = STATE.AIMING;
  },

  update(dt) {
    Physics.updateParticles(dt);
    Physics.updateBlockFlash(dt);

    switch (this.state) {
      case STATE.MENU: this.updateMenu(dt); break;
      case STATE.LEVEL_SELECT: this.updateLevelSelect(dt); break;
      case STATE.AIMING: this.updateAiming(dt); break;
      case STATE.LAUNCHING: this.updateLaunching(dt); break;
      case STATE.FLIGHT: this.updateFlight(dt); break;
      case STATE.TURN_END: this.updateTurnEnd(dt); break;
      case STATE.GAME_OVER: this.updateGameOver(dt); break;
      case STATE.LEVEL_COMPLETE: this.updateLevelComplete(dt); break;
    }
  },

  render() {
    Renderer.drawBackground();

    switch (this.state) {
      case STATE.MENU: this.renderMenu(); break;
      case STATE.LEVEL_SELECT: this.renderLevelSelect(); break;
      case STATE.GAME_OVER:
      case STATE.LEVEL_COMPLETE:
        // Draw field behind overlay
        this.renderField();
        if (this.state === STATE.GAME_OVER) this.renderGameOver();
        else this.renderLevelComplete();
        break;
      default:
        this.renderField();
        break;
    }
  },

  renderField() {
    Renderer.drawBlocks();
    Renderer.drawPickups();
    Renderer.drawBalls();
    Renderer.drawParticles();

    if (this.state === STATE.AIMING && Input.isAiming) {
      Renderer.drawAimLine(Input.launchX, Input.launchY, Input.aimDirX, Input.aimDirY);
    }

    Renderer.drawLaunchPoint(Input.launchX, Input.launchY, this.ballCount);
    this.renderHUD();
  },

  // --- HUD ---
  renderHUD() {
    const margin = canvasW * 0.04;
    const topY = fieldRect.y - canvasH * 0.07;
    const fontSize = canvasH * 0.022;
    const smallSize = canvasH * 0.018;

    // Top row: Turn (left), Level + Score (center), Pause placeholder (right)
    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;

    ctx.textAlign = 'left';
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.fillText(`Turn ${this.turn}`, margin, topY);

    ctx.textAlign = 'center';
    ctx.fillStyle = rgb(COL.green);
    ctx.fillText(`Lv.${this.level} — ${this.score}pts`, canvasW / 2, topY);

    // Second row: Mission progress (center), Stars (right)
    const row2Y = topY + fontSize * 1.3;
    ctx.font = `bold ${smallSize}px ${FONT_BODY}`;

    ctx.textAlign = 'center';
    ctx.fillStyle = rgb(COL.textDim);
    const progress = this.turn;
    ctx.fillText(`Survive: ${progress}/${this.missionTarget} turns`, canvasW / 2, row2Y);

    // Stars
    const stars = calcStars(this.turn, this.missionTarget);
    ctx.textAlign = 'right';
    let starText = '';
    for (let i = 0; i < 3; i++) {
      starText += i < stars ? '★' : '☆';
    }
    ctx.fillStyle = rgb(i < stars ? COL.gold : COL.textDim);
    // Fix: just draw all stars at once with gold color
    ctx.fillStyle = rgb(COL.gold);
    ctx.fillText(starText, canvasW - margin, row2Y);
  },

  // --- State Updates ---

  updateMenu(dt) {
    // Handled by renderMenu + input
  },

  updateLevelSelect(dt) {
    // Handled by renderLevelSelect + input
  },

  updateAiming(dt) {
    Input.updateAim();

    if (Input.aimReleased && Input.isAiming) {
      // Start launching
      this.state = STATE.LAUNCHING;
      this.ballsLaunched = 0;
      this.ballsReturned = 0;
      this.launchTimer = 0;
      Physics.resetLastHit();
      Input.consumeRelease();
    }
  },

  updateLaunching(dt) {
    this.launchTimer += dt;

    while (this.launchTimer >= LAUNCH_DELAY && this.ballsLaunched < this.ballCount) {
      const speed = BALL_SPEED;
      activateBall(
        Input.launchX,
        Input.launchY,
        Input.aimDirX * speed,
        Input.aimDirY * speed
      );
      this.ballsLaunched++;
      this.launchTimer -= LAUNCH_DELAY;
    }

    // Update physics while launching
    const active = Physics.update(dt, this);

    if (this.ballsLaunched >= this.ballCount) {
      this.state = STATE.FLIGHT;
    }
  },

  updateFlight(dt) {
    const active = Physics.update(dt, this);

    // Check for 3-star auto-complete
    const stars = calcStars(this.turn, this.missionTarget);
    if (stars >= 3 && this.autoCompleteTimer === 0) {
      this.autoCompleteTimer = 1.0;
    }
    if (this.autoCompleteTimer > 0) {
      this.autoCompleteTimer -= dt;
      if (this.autoCompleteTimer <= 0) {
        this.completeMission(3);
        return;
      }
    }

    if (active === 0) {
      this.state = STATE.TURN_END;
    }
  },

  updateTurnEnd(dt) {
    // Shift blocks down
    shiftBlocksDown();

    // Check game over
    if (checkGameOver()) {
      this.state = STATE.GAME_OVER;
      return;
    }

    // Check mission complete
    const stars = calcStars(this.turn, this.missionTarget);
    if (stars >= 1) {
      // Mission is achievable but hasn't auto-completed — keep playing
      // (Auto-complete only triggers at 3 stars during FLIGHT)
    }

    // New turn
    this.turn++;
    spawnRow(0, this.turn);

    this.state = STATE.AIMING;
  },

  completeMission(stars) {
    this.starsEarned = stars;

    // Save progress
    if (stars > saveData.stars[this.level]) {
      saveData.stars[this.level] = stars;
    }
    if (this.level >= saveData.currentLevel && stars >= 1) {
      saveData.currentLevel = Math.min(this.level + 1, TOTAL_LEVELS - 1);
    }
    if (this.score > saveData.bestScore) {
      saveData.bestScore = this.score;
    }
    saveProgress();

    this.state = STATE.LEVEL_COMPLETE;
  },

  updateGameOver(dt) {
    // Check stars earned so far (player might have partial progress)
    this.starsEarned = calcStars(this.turn, this.missionTarget);
    if (this.starsEarned >= 1) {
      this.completeMission(this.starsEarned);
      return;
    }
    // Wait for input (handled in render)
  },

  updateLevelComplete(dt) {
    // Wait for input (handled in render)
  },

  // --- Menu Rendering ---

  renderMenu() {
    // Title
    const titleY = canvasH * 0.25;
    ctx.font = `bold ${canvasH * 0.055}px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgb(COL.green);
    ctx.shadowColor = rgb(COL.green, 0.6);
    ctx.shadowBlur = 20;
    ctx.fillText('NEON BARRAGE', canvasW / 2, titleY);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = `bold ${canvasH * 0.025}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText('BREAK THE GRID', canvasW / 2, titleY + canvasH * 0.05);

    // Buttons
    const btnW = canvasW * 0.55;
    const btnH = canvasH * 0.06;
    const btnX = (canvasW - btnW) / 2;
    const playY = canvasH * 0.48;
    const selectY = canvasH * 0.57;

    // PLAY button
    this.drawButton(btnX, playY, btnW, btnH, 'PLAY', COL.green);
    // LEVEL SELECT button
    this.drawButton(btnX, selectY, btnW, btnH, 'LEVEL SELECT', COL.blue);

    // Disabled buttons (phase 2 placeholders)
    const shopY = canvasH * 0.66;
    this.drawButton(btnX, shopY, btnW, btnH, 'SHOP', COL.textDim, true);

    // Handle input
    if (Input.aimReleased) {
      if (Input.hitTestRect(btnX, playY, btnW, btnH)) {
        Input.consumeRelease();
        this.startLevel(saveData.currentLevel);
      } else if (Input.hitTestRect(btnX, selectY, btnW, btnH)) {
        Input.consumeRelease();
        this.state = STATE.LEVEL_SELECT;
        LevelSelect.scrollY = 0;
      }
    }
  },

  drawButton(x, y, w, h, text, color, disabled) {
    const radius = h * 0.3;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);

    if (disabled) {
      ctx.fillStyle = rgb(COL.bgCard);
      ctx.fill();
      ctx.strokeStyle = rgb(COL.borderDim);
    } else {
      ctx.fillStyle = rgb(color, 0.15);
      ctx.fill();
      ctx.strokeStyle = rgb(color, 0.6);
    }
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `bold ${h * 0.45}px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = disabled ? rgb(COL.textDim) : rgb(color);
    ctx.fillText(text, x + w / 2, y + h / 2);
  },

  // --- Game Over Screen ---
  renderGameOver() {
    // Dim overlay
    ctx.fillStyle = rgb(COL.bgDark, 0.85);
    ctx.fillRect(0, 0, canvasW, canvasH);

    const centerY = canvasH * 0.35;

    ctx.font = `bold ${canvasH * 0.05}px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgb(COL.red);
    ctx.fillText('GAME OVER', canvasW / 2, centerY);

    ctx.font = `bold ${canvasH * 0.025}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText('Mission Failed', canvasW / 2, centerY + canvasH * 0.05);

    // Score
    ctx.font = `bold ${canvasH * 0.02}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.fillText(`Score: ${this.score}  |  Turns: ${this.turn}`, canvasW / 2, centerY + canvasH * 0.1);

    // Buttons
    const btnW = canvasW * 0.4;
    const btnH = canvasH * 0.055;
    const gap = canvasW * 0.03;
    const btnY = canvasH * 0.55;
    const retryX = canvasW / 2 - btnW - gap / 2;
    const selectX = canvasW / 2 + gap / 2;

    this.drawButton(retryX, btnY, btnW, btnH, 'RETRY', COL.green);
    this.drawButton(selectX, btnY, btnW, btnH, 'LEVELS', COL.blue);

    if (Input.aimReleased) {
      if (Input.hitTestRect(retryX, btnY, btnW, btnH)) {
        Input.consumeRelease();
        this.startLevel(this.level);
      } else if (Input.hitTestRect(selectX, btnY, btnW, btnH)) {
        Input.consumeRelease();
        this.state = STATE.LEVEL_SELECT;
        LevelSelect.scrollY = 0;
      }
    }
  },

  // --- Level Complete Screen ---
  renderLevelComplete() {
    // Dim overlay
    ctx.fillStyle = rgb(COL.bgDark, 0.85);
    ctx.fillRect(0, 0, canvasW, canvasH);

    const centerY = canvasH * 0.25;

    ctx.font = `bold ${canvasH * 0.045}px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgb(COL.green);
    ctx.shadowColor = rgb(COL.green, 0.6);
    ctx.shadowBlur = 15;
    ctx.fillText('LEVEL COMPLETE!', canvasW / 2, centerY);
    ctx.shadowBlur = 0;

    // Stars
    const starSize = canvasH * 0.05;
    const starY = centerY + canvasH * 0.08;
    ctx.font = `${starSize}px ${FONT_BODY}`;
    for (let i = 0; i < 3; i++) {
      const sx = canvasW / 2 + (i - 1) * starSize * 1.2;
      ctx.fillStyle = i < this.starsEarned ? rgb(COL.gold) : rgb(COL.textDim, 0.3);
      ctx.fillText('★', sx, starY);
    }

    // Score
    ctx.font = `bold ${canvasH * 0.022}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.fillText(`Score: ${this.score}  |  Turns: ${this.turn}`, canvasW / 2, starY + canvasH * 0.07);

    // Buttons
    const btnW = canvasW * 0.4;
    const btnH = canvasH * 0.055;
    const gap = canvasW * 0.03;
    const btnY = canvasH * 0.55;
    const nextX = canvasW / 2 - btnW - gap / 2;
    const replayX = canvasW / 2 + gap / 2;

    this.drawButton(nextX, btnY, btnW, btnH, 'NEXT LEVEL', COL.green);
    this.drawButton(replayX, btnY, btnW, btnH, 'REPLAY', COL.blue);

    if (Input.aimReleased) {
      if (Input.hitTestRect(nextX, btnY, btnW, btnH)) {
        Input.consumeRelease();
        const next = Math.min(this.level + 1, TOTAL_LEVELS - 1);
        this.startLevel(next);
      } else if (Input.hitTestRect(replayX, btnY, btnW, btnH)) {
        Input.consumeRelease();
        this.startLevel(this.level);
      }
    }
  }
};

// --- Level Select (separate object to keep Game clean) ---
const LevelSelect = {
  scrollY: 0,
  scrollVel: 0,
  touchStartY: 0,
  lastTouchY: 0,
  isDragging: false,

  // Grid layout
  cols: 5,
  rows: 12, // 60 / 5

  update(dt) {
    // Inertial scrolling
    if (!this.isDragging) {
      this.scrollY += this.scrollVel * dt;
      this.scrollVel *= 0.92; // friction
      if (Math.abs(this.scrollVel) < 1) this.scrollVel = 0;
    }

    // Clamp scroll
    const cellSize = canvasW * 0.17;
    const gap = canvasW * 0.02;
    const totalH = this.rows * (cellSize + gap);
    const visibleH = canvasH * 0.7;
    const maxScroll = Math.max(0, totalH - visibleH);
    this.scrollY = Math.max(0, Math.min(this.scrollY, maxScroll));
  },

  render() {
    const margin = canvasW * 0.04;
    const titleY = canvasH * 0.06;

    // Title
    ctx.font = `bold ${canvasH * 0.03}px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgb(COL.green);
    ctx.fillText('LEVEL SELECT', canvasW / 2, titleY);

    // Back button
    const backW = canvasW * 0.2;
    const backH = canvasH * 0.04;
    const backX = margin;
    const backY = titleY - backH * 0.7;
    Game.drawButton(backX, backY, backW, backH, '← BACK', COL.textDim);

    // Grid
    const cellSize = canvasW * 0.17;
    const gap = canvasW * 0.02;
    const gridW = this.cols * cellSize + (this.cols - 1) * gap;
    const gridX = (canvasW - gridW) / 2;
    const gridTopY = canvasH * 0.1;

    // Clip region for scrolling
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, gridTopY, canvasW, canvasH * 0.75);
    ctx.clip();

    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      const cx = gridX + col * (cellSize + gap);
      const cy = gridTopY + row * (cellSize + gap) - this.scrollY;

      // Skip if offscreen
      if (cy + cellSize < gridTopY || cy > gridTopY + canvasH * 0.75) continue;

      const stars = saveData.stars[i];
      const unlocked = i === 0 || saveData.stars[i - 1] > 0 || i <= saveData.currentLevel;
      const isCurrent = i === saveData.currentLevel;

      // Cell background
      ctx.beginPath();
      ctx.roundRect(cx, cy, cellSize, cellSize, cellSize * 0.12);
      if (!unlocked) {
        ctx.fillStyle = rgb(COL.bgCard);
      } else if (isCurrent) {
        ctx.fillStyle = rgb(COL.blue, 0.2);
      } else if (stars > 0) {
        ctx.fillStyle = rgb(COL.greenDark, 0.15);
      } else {
        ctx.fillStyle = rgb(COL.bgCard);
      }
      ctx.fill();

      // Border
      if (isCurrent) {
        ctx.strokeStyle = rgb(COL.blue, 0.8);
      } else if (stars > 0) {
        ctx.strokeStyle = rgb(COL.greenDark, 0.4);
      } else {
        ctx.strokeStyle = rgb(COL.borderDim);
      }
      ctx.lineWidth = 2;
      ctx.stroke();

      // Content
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (!unlocked) {
        ctx.font = `bold ${cellSize * 0.35}px ${FONT_BODY}`;
        ctx.fillStyle = rgb(COL.textDim, 0.3);
        ctx.fillText('—', cx + cellSize / 2, cy + cellSize * 0.4);
      } else {
        // Level number
        ctx.font = `bold ${cellSize * 0.3}px ${FONT_BODY}`;
        ctx.fillStyle = isCurrent ? rgb(COL.blue) : rgb(COL.textWhite);
        ctx.fillText(i + 1, cx + cellSize / 2, cy + cellSize * 0.35);

        if (isCurrent) {
          ctx.font = `bold ${cellSize * 0.2}px ${FONT_BODY}`;
          ctx.fillStyle = rgb(COL.blue);
          ctx.fillText('PLAY', cx + cellSize / 2, cy + cellSize * 0.7);
        } else if (stars > 0) {
          // Stars
          ctx.font = `${cellSize * 0.22}px ${FONT_BODY}`;
          for (let s = 0; s < 3; s++) {
            const sx = cx + cellSize / 2 + (s - 1) * cellSize * 0.22;
            ctx.fillStyle = s < stars ? rgb(COL.gold) : rgb(COL.textDim, 0.3);
            ctx.fillText('★', sx, cy + cellSize * 0.72);
          }
        }
      }
    }

    ctx.restore();

    // Progress bar
    const totalStars = saveData.stars.reduce((a, b) => a + b, 0);
    const barY = canvasH * 0.9;
    ctx.font = `bold ${canvasH * 0.018}px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText(`STARS COLLECTED: ${totalStars}/180`, canvasW / 2, barY);

    // Progress bar visual
    const barW = canvasW * 0.6;
    const barH = canvasH * 0.01;
    const barX = (canvasW - barW) / 2;
    ctx.fillStyle = rgb(COL.bgCard);
    ctx.fillRect(barX, barY + canvasH * 0.015, barW, barH);
    ctx.fillStyle = rgb(COL.gold);
    ctx.fillRect(barX, barY + canvasH * 0.015, barW * (totalStars / 180), barH);

    // Handle input
    if (Input.aimReleased) {
      // Back button
      if (Input.hitTestRect(backX, backY, backW, backH)) {
        Input.consumeRelease();
        Game.state = STATE.MENU;
        return;
      }

      // Level cell tap
      for (let i = 0; i < TOTAL_LEVELS; i++) {
        const col = i % this.cols;
        const row = Math.floor(i / this.cols);
        const cx = gridX + col * (cellSize + gap);
        const cy = gridTopY + row * (cellSize + gap) - this.scrollY;

        const unlocked = i === 0 || saveData.stars[i - 1] > 0 || i <= saveData.currentLevel;
        if (unlocked && Input.hitTestRect(cx, cy, cellSize, cellSize)) {
          Input.consumeRelease();
          Game.startLevel(i);
          return;
        }
      }
    }
  },

  handleScroll(e) {
    // Mouse wheel scrolling
    this.scrollY += e.deltaY * 0.5;
  }
};
```

- [ ] **Step 2: Update main.js to wire everything together**

Replace the entire `main.js` with:

```js
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// --- Canvas Sizing ---
let canvasW, canvasH, scale, fieldRect;

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  canvasW = Math.min(vw, Math.floor(vh * 9 / 16));
  canvasH = vh;

  canvas.width = canvasW;
  canvas.height = canvasH;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';

  const padding = canvasW * 0.04;
  scale = (canvasW - padding * 2) / FIELD_WIDTH;

  const fieldW = FIELD_WIDTH * scale;
  const fieldH = (FIELD_HEIGHT + LAUNCH_AREA_HEIGHT) * scale;
  const fieldX = (canvasW - fieldW) / 2;
  const hudHeight = canvasH * 0.08;
  const fieldY = hudHeight + ((canvasH - hudHeight - fieldH) / 2);

  fieldRect = { x: fieldX, y: fieldY, w: fieldW, h: fieldH };
}

window.addEventListener('resize', resize);
resize();

// --- Init ---
loadProgress();
Input.init();

// Mouse wheel for level select
canvas.addEventListener('wheel', (e) => {
  if (Game.state === STATE.LEVEL_SELECT) {
    LevelSelect.handleScroll(e);
    e.preventDefault();
  }
}, { passive: false });

// Touch scroll for level select
canvas.addEventListener('touchstart', (e) => {
  if (Game.state === STATE.LEVEL_SELECT) {
    LevelSelect.isDragging = true;
    LevelSelect.touchStartY = e.touches[0].clientY;
    LevelSelect.lastTouchY = e.touches[0].clientY;
  }
});
canvas.addEventListener('touchmove', (e) => {
  if (Game.state === STATE.LEVEL_SELECT && LevelSelect.isDragging) {
    const y = e.touches[0].clientY;
    const dy = LevelSelect.lastTouchY - y;
    LevelSelect.scrollY += dy;
    LevelSelect.scrollVel = dy / 0.016; // approximate velocity
    LevelSelect.lastTouchY = y;
  }
});
canvas.addEventListener('touchend', () => {
  LevelSelect.isDragging = false;
});

// --- Game Loop ---
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, MAX_DT);
  lastTime = timestamp;

  if (Game.state === STATE.LEVEL_SELECT) {
    LevelSelect.update(dt);
  }

  Game.update(dt);
  Game.render();

  requestAnimationFrame(gameLoop);
}

// Start
Game.state = STATE.MENU;

requestAnimationFrame(function(timestamp) {
  lastTime = timestamp;
  requestAnimationFrame(gameLoop);
});
```

- [ ] **Step 3: Verify in browser**

Open `index.html`. Expected:
1. Main menu appears with "NEON BARRAGE" title in green glow, "BREAK THE GRID" subtitle, PLAY and LEVEL SELECT buttons.
2. Click PLAY → game starts. A row of blocks appears at the top. Drag upward to aim (dotted green line). Release to launch 5 balls.
3. Balls bounce off walls, ceiling, and blocks. Blocks flash white on hit. HP decreases. Blocks change color as HP drops. Particles spawn when blocks are destroyed.
4. When all balls return below the field, blocks shift down and a new row spawns.
5. "×5" ball count shows at the bottom. HUD shows turn, score, and mission progress.
6. Click LEVEL SELECT → grid of 60 levels shows. Level 1 is highlighted blue with "PLAY". Others are locked (gray "—").

- [ ] **Step 4: Commit**

```bash
git add js/game.js js/main.js
git commit -m "feat: add game state machine, menus, HUD, level select, and full turn flow"
```

---

### Task 9: Fix Input for Menu vs Gameplay

**Files:**
- Modify: `js/input.js` — separate click events from aim drags

**Issue:** The input system uses `aimReleased` for both button clicks (menus) and aim release (gameplay). In menus, a simple tap should register as a click without needing a drag. Fix: track whether this was a quick tap vs a drag.

- [ ] **Step 1: Add tap detection to input.js**

Add these properties to the `Input` object after the existing properties:

```js
  tapX: 0,
  tapY: 0,
  tapTime: 0,
  tapped: false, // true for one frame after a quick tap
```

Update `onDown`:

```js
  onDown(clientX, clientY) {
    this.isDown = true;
    this.tapTime = performance.now();
    this.updatePointer(clientX, clientY);
    this.tapX = this.pointerX;
    this.tapY = this.pointerY;
  },
```

Update `onUp`:

```js
  onUp() {
    if (this.isDown) {
      const elapsed = performance.now() - this.tapTime;
      const dx = this.pointerX - this.tapX;
      const dy = this.pointerY - this.tapY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (this.isAiming) {
        this.aimReleased = true;
      }

      // Quick tap with little movement = button tap
      if (elapsed < 300 && dist < 20) {
        this.tapped = true;
      }
    }
    this.isDown = false;
  },
```

Add a consume method:

```js
  consumeTap() {
    this.tapped = false;
  },
```

- [ ] **Step 2: Update hitTestRect to use tapped**

Replace the `hitTestRect` method:

```js
  hitTestRect(x, y, w, h) {
    if (!this.tapped && !this.aimReleased) return false;
    const px = this.tapped ? this.tapX : this.pointerX;
    const py = this.tapped ? this.tapY : this.pointerY;
    return px >= x && px <= x + w && py >= y && py <= y + h;
  },
```

- [ ] **Step 3: Update Game menu handlers to consume taps**

In `game.js`, replace all `Input.consumeRelease()` calls in menu/overlay handlers (`renderMenu`, `renderGameOver`, `renderLevelComplete`, and `LevelSelect.render`) with:

```js
Input.consumeTap();
Input.consumeRelease();
```

And change the input checks from `if (Input.aimReleased)` to `if (Input.tapped || Input.aimReleased)` in those menu/overlay methods.

- [ ] **Step 4: Verify in browser**

Tap PLAY → should start game immediately. Tap a level in level select → should start that level. Aim and release in gameplay → should launch balls. Both quick taps and longer drags should work appropriately.

- [ ] **Step 5: Commit**

```bash
git add js/input.js js/game.js
git commit -m "fix: separate tap detection from aim release for menu button handling"
```

---

### Task 10: Polish Rendering Details

**Files:**
- Modify: `js/renderer.js` — fix block flash rendering order, add field background

**Result:** Blocks flash white correctly on hit. Field has a subtle dark background distinct from the page background.

- [ ] **Step 1: Fix block flash rendering in renderer.js**

Replace the `drawBlock` method with corrected flash logic:

```js
  drawBlock(i) {
    if (!blockActive[i]) return;

    const px = this.ux(blockX[i]);
    const py = this.uy(blockY[i]);
    const pw = this.us(BLOCK_SIZE);
    const ph = this.us(BLOCK_SIZE);
    const radius = this.us(0.1);

    const color = blockColor(blockHP[i]);

    // Block fill
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, radius);
    ctx.fillStyle = rgb(color);
    ctx.fill();

    // Glow border
    ctx.strokeStyle = rgb(color, 0.5);
    ctx.lineWidth = this.us(0.03);
    ctx.stroke();

    // White flash overlay
    if (blockFlashTimer[i] > 0) {
      const flash = blockFlashTimer[i] / BLOCK_FLASH_DURATION;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, radius);
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`;
      ctx.fill();
    }

    // HP text
    const hp = blockHP[i];
    const fontSize = hp >= 100 ? this.us(0.28) : this.us(0.35);
    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDark);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hp, px + pw / 2, py + ph / 2);
  },
```

- [ ] **Step 2: Add field background to drawBackground**

Replace `drawBackground`:

```js
  drawBackground() {
    ctx.fillStyle = rgb(COL.bgDark);
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Field area (slightly different shade)
    if (fieldRect) {
      ctx.fillStyle = rgb([12, 12, 24]);
      ctx.fillRect(fieldRect.x, fieldRect.y, FIELD_WIDTH * scale, FIELD_HEIGHT * scale);

      // Field border
      ctx.strokeStyle = rgb(COL.borderDim);
      ctx.lineWidth = 1;
      ctx.strokeRect(fieldRect.x, fieldRect.y, FIELD_WIDTH * scale, FIELD_HEIGHT * scale);
    }
  },
```

- [ ] **Step 3: Verify in browser**

Play a level. Blocks should flash white when hit, with the flash fading over 0.12s. The playing field area should have a slightly darker background than the surrounding area.

- [ ] **Step 4: Commit**

```bash
git add js/renderer.js
git commit -m "fix: correct block flash rendering order and add field background"
```

---

### Task 11: Level Complete Flow Fix

**Files:**
- Modify: `js/game.js` — fix level complete to trigger when all balls return (not just at 3 stars)

**Issue:** Currently, level complete only triggers via 3-star auto-complete during flight. The game should also complete when the player manually meets the mission target and the turn ends normally. The player keeps playing until game over or 3-star auto-complete — but on game over, if they met ≥1 star, it should count as level complete.

- [ ] **Step 1: Update updateGameOver in game.js**

The current `updateGameOver` already checks stars and calls `completeMission` — this is correct. But we should also ensure the game over screen only shows when stars < 1. Verify this logic is already in place (it is from Task 8). No code change needed — just verify the flow is:

1. All balls return → TURN_END
2. Blocks shift down → check if any block is at row ≥ GRID_ROWS → GAME_OVER
3. In GAME_OVER: if calcStars ≥ 1, redirect to LEVEL_COMPLETE
4. Otherwise show game over screen

Verify by playing: survive enough turns to earn 1 star, then let a block reach the bottom. Should show "LEVEL COMPLETE" not "GAME OVER".

- [ ] **Step 2: Commit (only if changes were needed)**

If no code changes were needed, skip this commit.

---

### Task 12: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Result:** CLAUDE.md reflects the actual project structure and development workflow.

- [ ] **Step 1: Update CLAUDE.md**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Neon Barrage — a brick breaker game built with HTML5 Canvas for the play.nitzan.games platform.

## Development

- Open `index.html` in a browser to run the game (no build step required)
- All JS files loaded via `<script>` tags in order: constants → game-data → storage → levels → physics → input → renderer → game → main
- No bundler, no npm, no framework — vanilla JS only

## Architecture

- **Parallel arrays** for all game objects (blocks, balls, pickups, particles) — object pool pattern, never allocate/free during gameplay
- **Unit-based coordinate system** internally; `renderer.js` converts to canvas pixels via `scale` factor
- **State machine** in `game.js` drives all game flow (MENU → AIMING → LAUNCHING → FLIGHT → TURN_END → ...)
- Canvas scales to viewport width (max 9:16 of height); menus scale vertically, game field stays fixed size

## Platform Constraints (play.nitzan.games)

- Runs in sandboxed iframe — no network requests, fully self-contained
- localStorage keys must be prefixed with `neon-barrage:`
- Must have `meta.json` and `index.html` at root

## Key Files

- `js/constants.js` — all tuning values, colors, sizes (change game feel here)
- `js/game-data.js` — pool arrays and activate/deactivate helpers
- `js/physics.js` — ball movement, sub-stepping collision
- `js/game.js` — state machine, turn flow, scoring, all menu logic
- `js/renderer.js` — all canvas drawing
- `js/levels.js` — difficulty curve, HP scaling, row spawning
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with project architecture and dev workflow"
```

---

### Task 13: End-to-End Playtest Verification

**Files:** None (verification only)

**Result:** Confirm the full Phase 1 gameplay loop works end-to-end.

- [ ] **Step 1: Fresh start test**

Clear localStorage (`localStorage.clear()` in console), refresh page. Expected:
- Main menu shows with PLAY and LEVEL SELECT
- PLAY starts level 0
- Level select shows level 1 highlighted, all others locked

- [ ] **Step 2: Core gameplay test**

Start level 0. Verify:
- Aim line appears when dragging (dotted green)
- Balls launch in the aimed direction, one at a time
- Balls bounce off walls, ceiling, and blocks
- Blocks take damage (HP decreases), flash white on hit
- Block color changes as HP drops through thresholds
- Particles burst when a block is destroyed
- Ball trails render behind each ball
- When all balls fall below the field, turn ends
- Blocks shift down, new row spawns at top
- HUD shows turn count, score, and mission progress
- Pickups appear as green circles, collected by balls for +5 ball count

- [ ] **Step 3: Level completion test**

Play level 0 until surviving enough turns to earn 1+ star. Verify:
- Star indicators update in HUD
- At 3 stars, level auto-completes after ~1 second
- Level complete screen shows with correct stars and score
- NEXT LEVEL button starts level 1
- Level select now shows level 1 completed with stars, level 2 unlocked

- [ ] **Step 4: Game over test**

Start a level and let blocks reach the bottom. Verify:
- Game over screen appears with "GAME OVER" and "Mission Failed"
- If 1+ star was earned, redirects to level complete instead
- RETRY restarts the same level
- LEVELS button goes to level select

- [ ] **Step 5: Persistence test**

Earn stars on a few levels, then refresh the page. Verify:
- Progress is preserved (stars, current level)
- Level select reflects saved progress

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project scaffolding | meta.json, index.html, constants.js, main.js |
| 2 | Object pools | game-data.js |
| 3 | Storage | storage.js |
| 4 | Levels | levels.js |
| 5 | Renderer + blocks | renderer.js, main.js |
| 6 | Physics | physics.js |
| 7 | Input | input.js |
| 8 | Game state machine | game.js, main.js |
| 9 | Fix input tap vs drag | input.js, game.js |
| 10 | Polish rendering | renderer.js |
| 11 | Level complete flow fix | game.js |
| 12 | Update CLAUDE.md | CLAUDE.md |
| 13 | End-to-end playtest | (verification only) |
