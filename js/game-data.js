// --- Parallel Arrays: Blocks ---
const blockX = new Float32Array(MAX_BLOCKS);
const blockY = new Float32Array(MAX_BLOCKS);
const blockHP = new Int32Array(MAX_BLOCKS);
const blockMaxHP = new Int32Array(MAX_BLOCKS);
const blockActive = new Uint8Array(MAX_BLOCKS);
const blockFlashTimer = new Float32Array(MAX_BLOCKS);
const blockRow = new Int32Array(MAX_BLOCKS);
const blockCol = new Int32Array(MAX_BLOCKS);
const blockType = new Uint8Array(MAX_BLOCKS);
const blockArmor = new Uint8Array(MAX_BLOCKS);
const blockMoveDir = new Int8Array(MAX_BLOCKS);
const blockRotation = new Float32Array(MAX_BLOCKS);  // hit rotation swing (radians)

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
const pickupVY = new Float32Array(MAX_PICKUPS);     // falling velocity (magnet effect)
const pickupFalling = new Uint8Array(MAX_PICKUPS);   // 1 = falling (magnet collected)

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

// --- Powerup Inventory ---
const powerupInventory = new Int32Array(POWERUP_COUNT);

// --- Pool Helpers ---
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
  blockType.fill(0);
  blockArmor.fill(0);
  blockMoveDir.fill(0);
  ballActive.fill(0);
  pickupActive.fill(0);
  pickupFalling.fill(0);
  pickupVY.fill(0);
  partActive.fill(0);
}
