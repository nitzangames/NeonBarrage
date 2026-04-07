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
