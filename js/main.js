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
