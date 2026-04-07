# Neon Barrage Phase 2a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add special block types (explosive, stone, moving), all 6 powerups with inventory and activation UI, and all 5 mission goal types to the existing Phase 1 game.

**Architecture:** Extends existing parallel-array pools with new per-block fields (type, armor, moveDir). Powerup state lives on Game object. Physics conditionally branches on block type and active powerups. New powerup bar drawn by Renderer below the playing field.

**Tech Stack:** Same as Phase 1 — vanilla JS, HTML5 Canvas 2D, no bundler.

**Spec:** `docs/superpowers/specs/2026-04-06-neon-barrage-phase2a-design.md`

---

## File Map

| File | Changes |
|------|---------|
| `js/constants.js` | Add block type enum, powerup type enum/colors, mission type constants, spawn rates |
| `js/game-data.js` | Add blockType, blockArmor, blockMoveDir arrays; powerupInventory array; update activateBlock |
| `js/storage.js` | Add powerupInventory to saveData, save/load |
| `js/levels.js` | Update spawnRow for block types; add getMissionType/getMissionProgress; update getMissionTarget for all 5 types; add moveMovingBlocks |
| `js/physics.js` | Stone deflection; explosive chain destroy; laser pierce mode; fire damage mode |
| `js/renderer.js` | Special block visuals; powerup bar; colored ball trails for laser/fire |
| `js/game.js` | Powerup activation in AIMING; powerup UI hit tests; mission type in HUD; one-shot tracking; moving blocks in turn end |

---

### Task 1: Constants and Data Arrays for Block Types

**Files:**
- Modify: `js/constants.js`
- Modify: `js/game-data.js`

**Result:** Block type enum, spawn rates, and new parallel arrays ready for use.

- [ ] **Step 1: Add block type and powerup constants to constants.js**

Add at the end of `js/constants.js`, before the `blockColor` function:

```js
// --- Block Types ---
const BLOCK_NORMAL = 0;
const BLOCK_EXPLOSIVE = 1;
const BLOCK_STONE = 2;
const BLOCK_MOVING = 3;

// Unlock levels
const EXPLOSIVE_UNLOCK = 5;
const STONE_UNLOCK = 10;
const MOVING_UNLOCK = 15;

// Spawn rates (per block when type is unlocked)
const EXPLOSIVE_SPAWN_RATE = 0.12;
const STONE_SPAWN_RATE = 0.06;
const MOVING_SPAWN_RATE = 0.15;

// Stone armor
const STONE_ARMOR = 2;

// --- Powerup Types ---
const PW_LASER = 0;
const PW_FIRE = 1;
const PW_EXTRA = 2;
const PW_MAGNET = 3;
const PW_SHOCKWAVE = 4;
const PW_SHRINK = 5;
const POWERUP_COUNT = 6;

const PW_EXTRA_BALLS = 25;

const PW_COLORS = [
  [26, 143, 255],   // Laser - blue
  [255, 107, 53],   // Fire - orange
  [15, 255, 149],   // Extra - green
  [108, 60, 224],   // Magnet - purple
  [255, 170, 0],    // Shockwave - yellow/gold
  [0, 212, 255]     // Shrink - cyan
];

const PW_NAMES = ['LASER', 'FIRE', 'EXTRA', 'MAGNET', 'SHOCK', 'SHRINK'];

// --- Mission Types ---
const MISSION_SURVIVE = 0;
const MISSION_DESTROY = 1;
const MISSION_SCORE = 2;
const MISSION_COLLECT = 3;
const MISSION_ONESHOT = 4;
const MISSION_COUNT = 5;
```

- [ ] **Step 2: Update blockColor to handle special block types**

Replace the `blockColor` function in `js/constants.js`:

```js
function blockColor(hp, type) {
  if (type === BLOCK_EXPLOSIVE) return [255, 80, 40];
  if (type === BLOCK_STONE) return [140, 140, 160];
  if (type === BLOCK_MOVING) return COL.gold;
  if (hp <= 15)  return COL.green;
  if (hp <= 50)  return COL.blue;
  if (hp <= 125) return COL.purple;
  return COL.orange;
}
```

- [ ] **Step 3: Add new block arrays to game-data.js**

Add after line 9 (`const blockCol = ...`) in `js/game-data.js`:

```js
const blockType = new Uint8Array(MAX_BLOCKS);    // 0=normal, 1=explosive, 2=stone, 3=moving
const blockArmor = new Uint8Array(MAX_BLOCKS);   // stone armor hits remaining
const blockMoveDir = new Int8Array(MAX_BLOCKS);   // moving block direction: -1 or 1
```

- [ ] **Step 4: Add powerup inventory to game-data.js**

Add after the particle arrays in `js/game-data.js`:

```js
// --- Powerup Inventory ---
const powerupInventory = new Int32Array(POWERUP_COUNT);
```

- [ ] **Step 5: Update activateBlock to accept type parameter**

Replace the `activateBlock` function in `js/game-data.js`:

```js
function activateBlock(col, row, hp, type) {
  type = type || BLOCK_NORMAL;
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
      blockType[i] = type;
      blockArmor[i] = type === BLOCK_STONE ? STONE_ARMOR : 0;
      blockMoveDir[i] = type === BLOCK_MOVING ? (Math.random() < 0.5 ? -1 : 1) : 0;
      return i;
    }
  }
  return -1;
}
```

- [ ] **Step 6: Update clearAllPools to reset new arrays**

Replace `clearAllPools` in `js/game-data.js`:

```js
function clearAllPools() {
  blockActive.fill(0);
  blockType.fill(0);
  blockArmor.fill(0);
  blockMoveDir.fill(0);
  ballActive.fill(0);
  pickupActive.fill(0);
  partActive.fill(0);
}
```

- [ ] **Step 7: Verify no errors, commit**

Open in browser, verify no console errors and game still plays normally (all blocks are still normal type).

```bash
git add js/constants.js js/game-data.js
git commit -m "feat: add block type, powerup, and mission constants and data arrays"
```

---

### Task 2: Update Storage for Powerup Inventory

**Files:**
- Modify: `js/storage.js`

- [ ] **Step 1: Add powerupInventory to saveData and save/load**

Replace the entire `js/storage.js`:

```js
const STORAGE_PREFIX = 'neon-barrage:';

const saveData = {
  stars: new Array(TOTAL_LEVELS).fill(0),
  currentLevel: 0,
  bestScore: 0,
  powerups: new Array(POWERUP_COUNT).fill(0)
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
      if (data.powerups && data.powerups.length === POWERUP_COUNT) {
        saveData.powerups = data.powerups;
      }
    }
  } catch (e) {
    // Corrupt data — use defaults
  }
  // Sync to typed array
  for (let i = 0; i < POWERUP_COUNT; i++) {
    powerupInventory[i] = saveData.powerups[i];
  }
}

function syncPowerupsToSave() {
  for (let i = 0; i < POWERUP_COUNT; i++) {
    saveData.powerups[i] = powerupInventory[i];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/storage.js
git commit -m "feat: persist powerup inventory in localStorage"
```

---

### Task 3: Mission Types and Block Type Spawning in levels.js

**Files:**
- Modify: `js/levels.js`

- [ ] **Step 1: Replace getMissionTarget and add mission type functions**

Replace lines 10-14 of `js/levels.js` (the `getMissionTarget` function) with:

```js
function getMissionType(level) {
  return level % MISSION_COUNT;
}

function getMissionTarget(level) {
  const difficulty = getLevelDifficulty(level);
  switch (getMissionType(level)) {
    case MISSION_SURVIVE:  return Math.round(8 * difficulty);
    case MISSION_DESTROY:  return Math.round(15 * difficulty);
    case MISSION_SCORE:    return Math.round(40 * difficulty);
    case MISSION_COLLECT:  return Math.max(2, Math.round(3 * difficulty));
    case MISSION_ONESHOT:  return Math.max(2, Math.round(2.5 * difficulty));
    default: return Math.round(8 * difficulty);
  }
}

function getMissionProgress(game) {
  switch (getMissionType(game.level)) {
    case MISSION_SURVIVE:  return game.turn;
    case MISSION_DESTROY:  return game.blocksDestroyed;
    case MISSION_SCORE:    return game.score;
    case MISSION_COLLECT:  return game.pickupsCollected;
    case MISSION_ONESHOT:  return game.bestTurnBlocks;
    default: return game.turn;
  }
}

function getMissionLabel(level) {
  switch (getMissionType(level)) {
    case MISSION_SURVIVE:  return 'Survive';
    case MISSION_DESTROY:  return 'Destroy';
    case MISSION_SCORE:    return 'Score';
    case MISSION_COLLECT:  return 'Collect';
    case MISSION_ONESHOT:  return 'One Shot';
    default: return 'Survive';
  }
}
```

- [ ] **Step 2: Update spawnRow to choose block types**

Replace the `spawnRow` function in `js/levels.js`:

```js
function rollBlockType(level) {
  if (level >= MOVING_UNLOCK && Math.random() < MOVING_SPAWN_RATE) return BLOCK_MOVING;
  if (level >= EXPLOSIVE_UNLOCK && Math.random() < EXPLOSIVE_SPAWN_RATE) return BLOCK_EXPLOSIVE;
  if (level >= STONE_UNLOCK && Math.random() < STONE_SPAWN_RATE) return BLOCK_STONE;
  return BLOCK_NORMAL;
}

function spawnRow(rowIndex, turn, level) {
  const hp = getBlockHP(turn);
  const blockCount = MIN_BLOCKS_PER_ROW + Math.floor(Math.random() * (MAX_BLOCKS_PER_ROW - MIN_BLOCKS_PER_ROW + 1));

  const cols = [];
  for (let c = 0; c < GRID_COLS; c++) cols.push(c);
  for (let i = cols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = cols[i]; cols[i] = cols[j]; cols[j] = tmp;
  }
  const blockCols = cols.slice(0, blockCount);
  const emptyCols = cols.slice(blockCount);

  for (let c = 0; c < blockCount; c++) {
    const type = rollBlockType(level || 0);
    activateBlock(blockCols[c], rowIndex, hp, type);
  }

  for (let c = 0; c < emptyCols.length; c++) {
    if (Math.random() < PICKUP_SPAWN_CHANCE) {
      activatePickup(emptyCols[c], rowIndex);
    }
  }
}
```

- [ ] **Step 3: Add moveMovingBlocks function**

Add after the `shiftBlocksDown` function in `js/levels.js`:

```js
function moveMovingBlocks() {
  for (let i = 0; i < MAX_BLOCKS; i++) {
    if (!blockActive[i] || blockType[i] !== BLOCK_MOVING) continue;

    const newCol = blockCol[i] + blockMoveDir[i];

    // Check bounds
    if (newCol < 0 || newCol >= GRID_COLS) {
      blockMoveDir[i] = -blockMoveDir[i];
      continue;
    }

    // Check if destination is occupied
    let blocked = false;
    for (let j = 0; j < MAX_BLOCKS; j++) {
      if (j !== i && blockActive[j] && blockRow[j] === blockRow[i] && blockCol[j] === newCol) {
        blocked = true;
        break;
      }
    }

    if (blocked) {
      blockMoveDir[i] = -blockMoveDir[i];
      continue;
    }

    // Move
    blockCol[i] = newCol;
    blockX[i] = newCol * CELL_SIZE + BLOCK_SPACING / 2;
  }
}
```

- [ ] **Step 4: Verify and commit**

```bash
git add js/levels.js
git commit -m "feat: add mission types, block type spawning, and moving block logic"
```

---

### Task 4: Physics — Stone Deflection and Explosive Chains

**Files:**
- Modify: `js/physics.js`

- [ ] **Step 1: Replace checkBlockCollisions with stone/explosive/laser/fire support**

Replace the `checkBlockCollisions` method in `js/physics.js`:

```js
  checkBlockCollisions(ballIdx, gameState) {
    const bx = ballX[ballIdx];
    const by = ballY[ballIdx];
    const isLaser = gameState.activePowerup === PW_LASER;
    const isFire = gameState.activePowerup === PW_FIRE;
    const damage = isFire ? 2 : 1;

    for (let i = 0; i < MAX_BLOCKS; i++) {
      if (!blockActive[i]) continue;
      if (this.lastHitBlock[ballIdx] === i) continue;

      const rx = blockX[i];
      const ry = blockY[i];
      const rw = BLOCK_SIZE;
      const rh = BLOCK_SIZE;

      const cx = Math.max(rx, Math.min(bx, rx + rw));
      const cy = Math.max(ry, Math.min(by, ry + rh));

      const dx = bx - cx;
      const dy = by - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < BALL_RADIUS * BALL_RADIUS) {
        this.lastHitBlock[ballIdx] = i;

        // Stone block with armor: deflect straight down, reduce armor
        if (blockType[i] === BLOCK_STONE && blockArmor[i] > 0) {
          blockArmor[i]--;
          blockFlashTimer[i] = BLOCK_FLASH_DURATION;
          // Deflect straight down
          ballVX[ballIdx] = 0;
          ballVY[ballIdx] = BALL_SPEED;
          ballY[ballIdx] = ry + rh + BALL_RADIUS;
          if (!isLaser) break;
          continue;
        }

        // Reflection (skip for laser — laser pierces)
        if (!isLaser) {
          const overlapX = (BALL_RADIUS + rw / 2) - Math.abs(bx - (rx + rw / 2));
          const overlapY = (BALL_RADIUS + rh / 2) - Math.abs(by - (ry + rh / 2));

          if (overlapX < overlapY) {
            ballVX[ballIdx] = -ballVX[ballIdx];
            if (bx < rx + rw / 2) ballX[ballIdx] = rx - BALL_RADIUS;
            else ballX[ballIdx] = rx + rw + BALL_RADIUS;
          } else {
            ballVY[ballIdx] = -ballVY[ballIdx];
            if (by < ry + rh / 2) ballY[ballIdx] = ry - BALL_RADIUS;
            else ballY[ballIdx] = ry + rh + BALL_RADIUS;
          }
        }

        // Damage
        blockHP[i] -= damage;
        blockFlashTimer[i] = BLOCK_FLASH_DURATION;
        gameState.score += damage;

        if (blockHP[i] <= 0) {
          this.destroyBlock(i, gameState);
        }

        if (!isLaser) break; // Normal: one collision per sub-step. Laser: continue to next block.
      }
    }
  },

  destroyBlock(i, gameState) {
    blockActive[i] = 0;
    gameState.score++; // bonus for destroy
    gameState.blocksDestroyed++;
    gameState.blocksThisTurn++;

    const color = blockColor(blockMaxHP[i], blockType[i]);
    spawnParticles(
      blockX[i] + BLOCK_SIZE / 2,
      blockY[i] + BLOCK_SIZE / 2,
      DESTROY_PARTICLE_COUNT,
      DESTROY_PARTICLE_SPEED,
      DESTROY_PARTICLE_LIFE,
      color[0], color[1], color[2]
    );

    // Explosive chain reaction
    if (blockType[i] === BLOCK_EXPLOSIVE) {
      this.explodeAdjacent(i, gameState);
    }
  },

  explodeAdjacent(srcIdx, gameState) {
    const row = blockRow[srcIdx];
    const col = blockCol[srcIdx];

    for (let i = 0; i < MAX_BLOCKS; i++) {
      if (!blockActive[i]) continue;
      const dr = Math.abs(blockRow[i] - row);
      const dc = Math.abs(blockCol[i] - col);
      if (dr <= 1 && dc <= 1 && (dr + dc) > 0) {
        blockActive[i] = 0;
        gameState.score++;
        gameState.blocksDestroyed++;
        gameState.blocksThisTurn++;

        const color = blockColor(blockMaxHP[i], blockType[i]);
        spawnParticles(
          blockX[i] + BLOCK_SIZE / 2,
          blockY[i] + BLOCK_SIZE / 2,
          DESTROY_PARTICLE_COUNT,
          DESTROY_PARTICLE_SPEED,
          DESTROY_PARTICLE_LIFE,
          color[0], color[1], color[2]
        );

        // Chain: if neighbor is also explosive, recurse
        if (blockType[i] === BLOCK_EXPLOSIVE) {
          this.explodeAdjacent(i, gameState);
        }
      }
    }
  },
```

- [ ] **Step 2: Update blockColor calls in renderer.js**

In `js/renderer.js`, update the `drawBlock` method. Replace line 32:

```js
    const color = blockColor(blockHP[i]);
```

with:

```js
    const color = blockColor(blockHP[i], blockType[i]);
```

- [ ] **Step 3: Verify and commit**

Play the game at level 5+ to verify explosive blocks appear. Verify stone blocks at level 10+. Verify physics works correctly.

```bash
git add js/physics.js js/renderer.js
git commit -m "feat: add stone deflection, explosive chain reactions, laser pierce, fire damage"
```

---

### Task 5: Special Block Rendering

**Files:**
- Modify: `js/renderer.js`

- [ ] **Step 1: Update drawBlock for special block visuals**

Replace the `drawBlock` method in `js/renderer.js`:

```js
  drawBlock(i) {
    if (!blockActive[i]) return;

    const px = this.ux(blockX[i]);
    const py = this.uy(blockY[i]);
    const pw = this.us(BLOCK_SIZE);
    const ph = this.us(BLOCK_SIZE);
    const radius = this.us(0.1);
    const type = blockType[i];

    const color = blockColor(blockHP[i], type);

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

    // Type indicator (top-left corner)
    const indSize = this.us(0.22);
    ctx.font = `bold ${indSize}px ${FONT_BODY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (type === BLOCK_EXPLOSIVE) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('💥', px + this.us(0.04), py + this.us(0.02));
    } else if (type === BLOCK_STONE && blockArmor[i] > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('🛡' + blockArmor[i], px + this.us(0.02), py + this.us(0.02));
    } else if (type === BLOCK_MOVING) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(blockMoveDir[i] > 0 ? '→' : '←', px + this.us(0.04), py + this.us(0.02));
    }

    // HP text
    const hp = blockHP[i];
    const fontSize = hp >= 100 ? this.us(0.28) : this.us(0.35);
    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;
    ctx.fillStyle = color === COL.green ? rgb(COL.textDark) : rgb(COL.textWhite);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hp, px + pw / 2, py + ph / 2 + this.us(0.05));
  },
```

- [ ] **Step 2: Add colored ball trail support**

Replace the `drawBall` method in `js/renderer.js`:

```js
  drawBall(i) {
    if (!ballActive[i]) return;

    const px = this.ux(ballX[i]);
    const py = this.uy(ballY[i]);
    const r = this.us(BALL_RADIUS);

    // Determine ball color based on active powerup
    const ballCol = this.ballColor || COL.green;

    // Trail
    ctx.lineCap = 'round';
    for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
      const alpha = (1 - t / TRAIL_LENGTH) * 0.6;
      const width = TRAIL_MAX_WIDTH * (1 - t / TRAIL_LENGTH);
      ctx.beginPath();
      ctx.moveTo(this.ux(ballTrailX[i][t]), this.uy(ballTrailY[i][t]));
      ctx.lineTo(this.ux(ballTrailX[i][t + 1]), this.uy(ballTrailY[i][t + 1]));
      ctx.strokeStyle = rgb(ballCol, alpha);
      ctx.lineWidth = this.us(width);
      ctx.stroke();
    }

    // Ball glow
    ctx.beginPath();
    ctx.arc(px, py, r * 2, 0, Math.PI * 2);
    ctx.fillStyle = rgb(ballCol, 0.2);
    ctx.fill();

    // Ball
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = rgb(ballCol);
    ctx.fill();
  },
```

- [ ] **Step 3: Add powerup bar drawing method**

Add to the `Renderer` object, after `drawLaunchPoint`:

```js
  // Powerup bar at bottom of screen
  drawPowerupBar(activePowerup) {
    const barH = canvasH * 0.06;
    const barY = canvasH - barH - canvasH * 0.01;
    const btnW = (canvasW * 0.88) / POWERUP_COUNT;
    const gap = canvasW * 0.01;
    const startX = (canvasW - (btnW * POWERUP_COUNT + gap * (POWERUP_COUNT - 1))) / 2;

    for (let p = 0; p < POWERUP_COUNT; p++) {
      const x = startX + p * (btnW + gap);
      const count = powerupInventory[p];
      const isActive = activePowerup === p;
      const color = PW_COLORS[p];
      const isEmpty = count <= 0;

      // Button background
      ctx.beginPath();
      ctx.roundRect(x, barY, btnW, barH, barH * 0.3);

      if (isEmpty) {
        ctx.fillStyle = rgb(COL.bgCard);
        ctx.fill();
        ctx.strokeStyle = rgb(COL.borderDim);
      } else if (isActive) {
        ctx.fillStyle = rgb(color, 0.3);
        ctx.fill();
        ctx.strokeStyle = rgb(color);
      } else {
        ctx.fillStyle = rgb(color, 0.12);
        ctx.fill();
        ctx.strokeStyle = rgb(color, 0.5);
      }
      ctx.lineWidth = isActive ? 2.5 : 1;
      ctx.stroke();

      // Name
      const nameSize = barH * 0.28;
      ctx.font = `bold ${nameSize}px ${FONT_BODY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isEmpty ? rgb(COL.textDim, 0.4) : rgb(color);
      ctx.fillText(PW_NAMES[p], x + btnW / 2, barY + barH * 0.38);

      // Count
      ctx.font = `bold ${barH * 0.32}px ${FONT_BODY}`;
      ctx.fillStyle = isEmpty ? rgb(COL.textDim, 0.3) : rgb(COL.textWhite);
      ctx.fillText(count, x + btnW / 2, barY + barH * 0.72);
    }

    // Return layout info for hit testing
    return { barY, barH, btnW, gap, startX };
  }
```

- [ ] **Step 4: Commit**

```bash
git add js/renderer.js
git commit -m "feat: add special block visuals, colored ball trails, and powerup bar"
```

---

### Task 6: Game Logic — Powerups, Mission Types, One-Shot Tracking

**Files:**
- Modify: `js/game.js`

This is the integration task. Changes:
1. Add powerup state to Game object
2. Powerup activation during AIMING
3. Powerup bar hit testing
4. Mission type display in HUD
5. One-shot tracking (bestTurnBlocks)
6. Moving blocks in turn end
7. Pass level to spawnRow
8. Set ball color on Renderer based on active powerup
9. Give test powerups on level start (3 of each)

- [ ] **Step 1: Add powerup state to Game object**

In `js/game.js`, add these properties to the `Game` object (after `turnEndTimer: 0`):

```js
  // Powerup state
  activePowerup: -1,  // -1 = none, PW_LASER or PW_FIRE
  blocksThisTurn: 0,
  bestTurnBlocks: 0,
```

- [ ] **Step 2: Update startLevel to reset powerup state and track mission**

In the `startLevel` method, add after `this.turnEndTimer = 0;`:

```js
    this.activePowerup = -1;
    this.blocksThisTurn = 0;
    this.bestTurnBlocks = 0;

    // Give test powerups (Phase 2a: 3 of each for testing)
    for (let p = 0; p < POWERUP_COUNT; p++) {
      if (powerupInventory[p] < 3) powerupInventory[p] = 3;
    }
    syncPowerupsToSave();
    saveProgress();
```

- [ ] **Step 3: Update spawnRow calls to pass level**

Find every call to `spawnRow` in `js/game.js` and add `this.level` as the third argument.

In `startLevel`: change `spawnRow(0, this.turn);` to `spawnRow(0, this.turn, this.level);`

In `updateTurnEnd`: change `spawnRow(0, this.turn);` to `spawnRow(0, this.turn, this.level);`

- [ ] **Step 4: Update updateTurnEnd to move blocks and track one-shot**

Replace the `updateTurnEnd` method:

```js
  updateTurnEnd(dt) {
    this.turnEndTimer -= dt;
    if (this.turnEndTimer > 0) return;

    // Track one-shot before resetting
    if (this.blocksThisTurn > this.bestTurnBlocks) {
      this.bestTurnBlocks = this.blocksThisTurn;
    }
    this.blocksThisTurn = 0;

    // Reset powerup for next turn
    this.activePowerup = -1;

    // Shift blocks down
    shiftBlocksDown();

    // Move moving blocks horizontally
    moveMovingBlocks();

    // Check game over
    if (checkGameOver()) {
      const progress = getMissionProgress(this);
      const stars = calcStars(progress, this.missionTarget);
      if (stars >= 1) {
        this.completeMission();
      } else {
        this.state = STATE.GAME_OVER;
      }
      return;
    }

    // Increment turn, spawn new row
    this.turn++;
    spawnRow(0, this.turn, this.level);
    Physics.resetLastHit();

    this.state = STATE.AIMING;
  },
```

- [ ] **Step 5: Update star calculations to use mission progress**

In `updateFlight`, replace `calcStars(this.turn, this.missionTarget)` with:

```js
    const progress = getMissionProgress(this);
    const stars = calcStars(progress, this.missionTarget);
```

In `completeMission`, replace `calcStars(this.turn, this.missionTarget)` with:

```js
    const progress = getMissionProgress(this);
    const stars = calcStars(progress, this.missionTarget);
```

- [ ] **Step 6: Add powerup activation to updateAiming**

Replace `updateAiming`:

```js
  updateAiming(dt) {
    // Check powerup bar taps
    if (Input.tapped) {
      this.checkPowerupTap();
    }

    // Cache aim state before updateAim clears aimReleased
    const wasAiming = Input.isAiming;
    const released = Input.aimReleased;

    Input.updateAim();

    if (released && wasAiming) {
      this.ballsToLaunch = this.ballCount;
      this.launchTimer = 0;
      this.blocksThisTurn = 0;
      this.state = STATE.LAUNCHING;
      Input.isAiming = false;
    }
  },

  checkPowerupTap() {
    const barH = canvasH * 0.06;
    const barY = canvasH - barH - canvasH * 0.01;
    const btnW = (canvasW * 0.88) / POWERUP_COUNT;
    const gap = canvasW * 0.01;
    const startX = (canvasW - (btnW * POWERUP_COUNT + gap * (POWERUP_COUNT - 1))) / 2;

    for (let p = 0; p < POWERUP_COUNT; p++) {
      const x = startX + p * (btnW + gap);
      if (Input.tapX >= x && Input.tapX <= x + btnW &&
          Input.tapY >= barY && Input.tapY <= barY + barH) {
        Input.consumeTap();
        this.activatePowerup(p);
        return;
      }
    }
  },

  activatePowerup(type) {
    if (powerupInventory[type] <= 0) return;

    if (type === PW_LASER || type === PW_FIRE) {
      // Toggle off if already active
      if (this.activePowerup === type) {
        this.activePowerup = -1;
        return;
      }
      // Exclusive: can't use both
      if (this.activePowerup === PW_LASER || this.activePowerup === PW_FIRE) {
        return; // Other ball powerup already active
      }
      powerupInventory[type]--;
      this.activePowerup = type;
    } else if (type === PW_EXTRA) {
      powerupInventory[type]--;
      this.ballCount += PW_EXTRA_BALLS;
    } else if (type === PW_MAGNET) {
      powerupInventory[type]--;
      // Collect all pickups
      for (let i = 0; i < MAX_PICKUPS; i++) {
        if (pickupActive[i]) {
          pickupActive[i] = 0;
          this.ballCount += PICKUP_BALL_BONUS;
          this.pickupsCollected++;
        }
      }
    } else if (type === PW_SHOCKWAVE) {
      powerupInventory[type]--;
      // Find lowest row with blocks
      let lowestRow = -1;
      for (let i = 0; i < MAX_BLOCKS; i++) {
        if (blockActive[i] && blockRow[i] > lowestRow) lowestRow = blockRow[i];
      }
      if (lowestRow >= 0) {
        for (let i = 0; i < MAX_BLOCKS; i++) {
          if (blockActive[i] && blockRow[i] === lowestRow) {
            blockActive[i] = 0;
            this.score++;
            this.blocksDestroyed++;
            const color = blockColor(blockMaxHP[i], blockType[i]);
            spawnParticles(blockX[i] + BLOCK_SIZE / 2, blockY[i] + BLOCK_SIZE / 2,
              DESTROY_PARTICLE_COUNT, DESTROY_PARTICLE_SPEED, DESTROY_PARTICLE_LIFE,
              color[0], color[1], color[2]);
          }
        }
      }
    } else if (type === PW_SHRINK) {
      powerupInventory[type]--;
      for (let i = 0; i < MAX_BLOCKS; i++) {
        if (blockActive[i]) {
          blockHP[i] = Math.max(1, Math.floor(blockHP[i] / 2));
          blockFlashTimer[i] = BLOCK_FLASH_DURATION;
        }
      }
    }
    syncPowerupsToSave();
    saveProgress();
  },
```

- [ ] **Step 7: Update renderGame to draw powerup bar and set ball color**

Replace the `renderGame` method:

```js
  renderGame() {
    Renderer.drawBackground();
    this.renderHUD();

    // Set ball color based on active powerup
    if (this.activePowerup === PW_LASER) Renderer.ballColor = [0, 212, 255]; // cyan
    else if (this.activePowerup === PW_FIRE) Renderer.ballColor = COL.orange;
    else Renderer.ballColor = COL.green;

    Renderer.drawBlocks();
    Renderer.drawPickups();
    Renderer.drawBalls();
    Renderer.drawParticles();

    if (this.state === STATE.AIMING) {
      if (Input.isAiming) {
        Renderer.drawAimLine(Input.launchX, Input.launchY, Input.aimDirX, Input.aimDirY);
      }
      Renderer.drawLaunchPoint(Input.launchX, Input.launchY, this.ballCount);
    }

    // Draw powerup bar during aiming
    if (this.state === STATE.AIMING) {
      Renderer.drawPowerupBar(this.activePowerup);
    }
  },
```

- [ ] **Step 8: Update HUD mission text**

In the `renderHUD` method, replace the mission progress line:

```js
    ctx.fillText(`Survive: ${this.turn} / ${this.missionTarget}`, canvasW / 2, subY);
```

with:

```js
    const progress = getMissionProgress(this);
    const label = getMissionLabel(this.level);
    ctx.fillText(`${label}: ${progress} / ${this.missionTarget}`, canvasW / 2, subY);
```

And update the star calculation in renderHUD from `calcStars(this.turn, this.missionTarget)` to:

```js
    const stars = calcStars(progress, this.missionTarget);
```

- [ ] **Step 9: Update game over star check**

In `updateGameOver` (if present) or wherever game over checks stars, ensure it uses `getMissionProgress(this)` instead of `this.turn`.

- [ ] **Step 10: Verify and commit**

Test:
- Level 0-4: only normal blocks, Survive mission
- Level 5+: explosive blocks appear, Destroy Blocks mission on level 1,6,11...
- Level 10+: stone blocks appear with armor
- Level 15+: moving blocks shift each turn
- Powerup bar shows during aiming, tapping activates powerups
- Laser balls pierce through blocks, Fire balls deal double damage
- Extra Balls, Magnet, Shockwave, Shrink all work
- Mission progress shows correctly for each type

```bash
git add js/game.js
git commit -m "feat: add powerup activation, mission types, one-shot tracking, moving blocks"
```

---

### Task 7: End-to-End Verification

**Files:** None (verification only)

- [ ] **Step 1: Test special blocks**

Play level 5 (explosive blocks should appear). Destroy one and verify adjacent blocks are also destroyed with particle effects. Play level 10 (stone blocks). Verify first 2 hits deflect ball downward without HP damage, then normal hits work. Play level 15 (moving blocks). Verify they shift horizontally each turn.

- [ ] **Step 2: Test all mission types**

- Level 0 (Survive): HUD shows "Survive: X/Y"
- Level 1 (Destroy): HUD shows "Destroy: X/Y", progress tracks blocks destroyed
- Level 2 (Score): HUD shows "Score: X/Y"
- Level 3 (Collect): HUD shows "Collect: X/Y", progress tracks pickups
- Level 4 (One Shot): HUD shows "One Shot: X/Y", tracks best single-turn block count

Stars should award at 1x, 1.5x, 2x of target for all types.

- [ ] **Step 3: Test all powerups**

During AIMING state, tap each powerup button:
- Laser: balls should pierce through blocks (cyan trail)
- Fire: balls deal 2 damage (orange trail)
- Extra: +25 balls immediately
- Magnet: all pickups collected instantly
- Shockwave: lowest row of blocks destroyed
- Shrink: all block HP halved

Verify Laser and Fire are mutually exclusive. Verify inventory decrements.

- [ ] **Step 4: Test persistence**

Use some powerups, refresh page. Verify inventory counts persist.

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Constants and data arrays for block types + powerups | constants.js, game-data.js |
| 2 | Storage for powerup inventory | storage.js |
| 3 | Mission types and block type spawning | levels.js |
| 4 | Physics — stone, explosive, laser, fire | physics.js, renderer.js |
| 5 | Special block rendering + powerup bar | renderer.js |
| 6 | Game logic — powerups, missions, one-shot | game.js |
| 7 | End-to-end verification | (testing only) |
