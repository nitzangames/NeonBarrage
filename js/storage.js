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
