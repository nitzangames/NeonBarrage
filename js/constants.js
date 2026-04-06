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
const BLOCK_SIZE = 1.0;
const BLOCK_SPACING = 0.12;
const CELL_SIZE = BLOCK_SIZE + BLOCK_SPACING;
const FIELD_WIDTH = GRID_COLS * CELL_SIZE;
const FIELD_HEIGHT = GRID_ROWS * CELL_SIZE;

// --- Ball ---
const BALL_SPEED = 14;
const BALL_RADIUS = 0.15;
const BALL_START_COUNT = 5;
const LAUNCH_DELAY = 0.04;
const MIN_AIM_Y = 0.15;
const SUB_STEP = BALL_RADIUS * 1.8;

// --- Ball Trail ---
const TRAIL_LENGTH = 8;
const TRAIL_MAX_WIDTH = 0.225;

// --- Particles ---
const DESTROY_PARTICLE_COUNT = 20;
const DESTROY_PARTICLE_SPEED = 5;
const DESTROY_PARTICLE_LIFE = 0.4;

// --- Block Hit ---
const BLOCK_FLASH_DURATION = 0.12;

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
const MAX_DT = 0.033;

// --- Fonts ---
const FONT_TITLE = "'Orbitron', sans-serif";
const FONT_BODY = "'Rajdhani', sans-serif";

// --- Launch Area ---
const LAUNCH_AREA_HEIGHT = 1.5;

// --- Block HP → Color ---
function blockColor(hp) {
  if (hp <= 15)  return COL.green;
  if (hp <= 50)  return COL.blue;
  if (hp <= 125) return COL.purple;
  return COL.orange;
}
