// Difficulty multiplier pattern per 10-level group
const DIFFICULTY_PATTERN = [0.70, 0.70, 0.90, 0.90, 1.00, 0.75, 1.10, 1.10, 1.30, 0.80];

function getLevelDifficulty(level) {
  const progression = 1 + level * 0.25;
  const multiplier = DIFFICULTY_PATTERN[level % 10];
  return progression * multiplier;
}

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

    blockCol[i] = newCol;
    blockTargetX[i] = newCol * CELL_SIZE + BLOCK_SPACING / 2;
    // blockX will lerp toward blockTargetX in physics update
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
