const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// --- Canvas Sizing ---
// Fixed 1080×1920 logical resolution; CSS scales the canvas to fit the viewport.
const canvasW = 1080;
const canvasH = 1920;
let scale, fieldRect;

// Convert a clientX/Y from a pointer event to the canvas's logical pixel space.
function clientToLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvasW / rect.width),
    y: (clientY - rect.top) * (canvasH / rect.height)
  };
}

// Scale a delta in CSS pixels (e.g. wheel/touch deltas) to logical pixels.
function clientDeltaToLogicalY(dy) {
  const rect = canvas.getBoundingClientRect();
  return dy * (canvasH / rect.height);
}

// --- Screen Shake ---
let shakeTimer = 0;
let shakeMagnitude = 0;
let shakeOffsetX = 0;
let shakeOffsetY = 0;

function triggerShake(duration, magnitude) {
  shakeTimer = duration;
  shakeMagnitude = magnitude;
}

function updateShake(dt) {
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    shakeOffsetX = (Math.random() - 0.5) * 2 * shakeMagnitude;
    shakeOffsetY = (Math.random() - 0.5) * 2 * shakeMagnitude;
  } else {
    shakeOffsetX = 0;
    shakeOffsetY = 0;
  }
}

function layout() {
  const padding = canvasW * 0.04;
  scale = (canvasW - padding * 2) / FIELD_WIDTH;

  const fieldW = FIELD_WIDTH * scale;
  const fieldH = (FIELD_HEIGHT + LAUNCH_AREA_HEIGHT) * scale;
  const fieldX = (canvasW - fieldW) / 2;
  const hudHeight = canvasH * 0.08;
  const fieldY = hudHeight + ((canvasH - hudHeight - fieldH) / 2);

  fieldRect = { x: fieldX, y: fieldY, w: fieldW, h: fieldH };
}

layout();

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
    const dy = clientDeltaToLogicalY(LevelSelect.lastTouchY - y);
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
  updateShake(dt);

  // Apply shake offset during rendering
  if (shakeOffsetX !== 0 || shakeOffsetY !== 0) {
    ctx.save();
    ctx.translate(shakeOffsetX, shakeOffsetY);
  }

  Game.render();

  if (shakeOffsetX !== 0 || shakeOffsetY !== 0) {
    ctx.restore();
  }

  requestAnimationFrame(gameLoop);
}

// Start
Game.state = STATE.MENU;

requestAnimationFrame(function(timestamp) {
  lastTime = timestamp;
  requestAnimationFrame(gameLoop);
});
