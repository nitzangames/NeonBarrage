// --- Game States ---
const STATE = {
  MENU: 0,
  LEVEL_SELECT: 1,
  AIMING: 2,
  LAUNCHING: 3,
  FLIGHT: 4,
  TURN_END: 5,
  GAME_OVER: 6,
  LEVEL_COMPLETE: 7,
  SHOP: 8,
  SETTINGS: 9,
  CHEST_POPUP: 10
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
const BLOCK_HIT_ROTATION = 0.14;  // radians (~8 degrees)

// --- Screen Shake ---
const SHAKE_HIT_DURATION = 0.08;
const SHAKE_HIT_MAGNITUDE = 2;
const SHAKE_DESTROY_DURATION = 0.12;
const SHAKE_DESTROY_MAGNITUDE = 4;

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

// --- Block Types ---
const BLOCK_NORMAL = 0;
const BLOCK_EXPLOSIVE = 1;
const BLOCK_STONE = 2;
const BLOCK_MOVING = 3;

const EXPLOSIVE_UNLOCK = 5;
const STONE_UNLOCK = 10;
const MOVING_UNLOCK = 15;

const EXPLOSIVE_SPAWN_RATE = 0.12;
const STONE_SPAWN_RATE = 0.06;
const MOVING_SPAWN_RATE = 0.15;

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

// --- Economy ---
const COINS_PER_STAR = 10;
const CONTINUE_COST = 50;
const CHEST_THRESHOLD = 10;
const CHEST_REWARD_COUNT = 3;

// --- Powerup Packs ---
const PACKS = [
  { name: 'Ball Pack', cost: 300, items: [3,3,3,0,0,0] },
  { name: 'Utility Pack', cost: 350, items: [0,0,0,3,3,3] },
  { name: 'Everything Pack', cost: 500, items: [3,3,3,3,3,3] }
];

// --- Block HP → Color ---
function blockColor(hp, type) {
  if (type === BLOCK_EXPLOSIVE) return [255, 80, 40];
  if (type === BLOCK_STONE) return [140, 140, 160];
  if (type === BLOCK_MOVING) return COL.gold;
  if (hp <= 15)  return COL.green;
  if (hp <= 50)  return COL.blue;
  if (hp <= 125) return COL.purple;
  return COL.orange;
}
