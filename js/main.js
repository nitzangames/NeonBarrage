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
    LevelSelect.scrollVel = dy / 0.016;
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
