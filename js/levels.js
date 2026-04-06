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
      if (pickupRow[i] >= GRID_ROWS) {
        pickupActive[i] = 0;
      }
    }
  }
}

function checkGameOver() {
  for (let i = 0; i < MAX_BLOCKS; i++) {
    if (blockActive[i] && blockRow[i] >= GRID_ROWS) {
      return true;
    }
  }
  return false;
}
