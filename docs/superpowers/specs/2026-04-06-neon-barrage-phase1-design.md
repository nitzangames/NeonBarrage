# Neon Barrage — Phase 1 Design Spec

Phase 1 delivers the core gameplay loop: aiming, launching, ball physics, normal blocks, pickups, basic HUD, menus, level progression, and the neon visual style. No audio, powerups, economy, or special block types.

## Platform Constraints

Target: `play.nitzan.games` (sandboxed iframe)
- No network requests — fully self-contained
- localStorage available (prefix all keys with `neon-barrage:`)
- Canvas/WebGL, pointer lock, gamepad, fullscreen, Web Audio all available
- Must ship as a folder with `meta.json`, `index.html`, and supporting files

## File Structure

```
neon-barrage/
  meta.json          — platform metadata
  index.html         — entry point, canvas, font loading, script tags
  thumbnail.png      — platform thumbnail (placeholder until phase 3)
  js/
    constants.js     — colors, sizes, grid config, tuning values
    game-data.js     — parallel arrays for blocks/balls/pickups/particles (object pools)
    physics.js       — ball movement, sub-stepping, circle-AABB collision, reflection
    levels.js        — difficulty curve, mission generation, row spawning, HP scaling
    input.js         — touch/mouse aiming, UI button hit detection
    renderer.js      — canvas drawing: blocks, balls, trails, HUD, menus, particles
    game.js          — game loop, state machine, turn logic, scoring
    storage.js       — localStorage wrapper with slug prefix
    main.js          — bootstrap: init canvas, load fonts, start loop
```

All JS files loaded via `<script>` tags in `index.html` (no bundler). Order: constants → game-data → storage → levels → physics → input → renderer → game → main.

## Architecture

### Data Flow

```
input.js → game.js (state machine) → physics.js
               ↕                         ↕
           game-data.js (parallel arrays / pools)
               ↕
           renderer.js (canvas draw)
               ↕
           storage.js (localStorage)
           levels.js (difficulty + missions)
           constants.js (config)
```

### Object Pools (Parallel Arrays)

Per the GDD's performance guidance, all frequently-used objects are pre-allocated as parallel arrays. Objects are activated/deactivated via an `active` flag — never created or destroyed during gameplay.

| Pool | Max Count | Arrays |
|------|-----------|--------|
| Blocks | 128 | x, y, hp, maxHp, type, active, flashTimer, row, col |
| Balls | 512 | x, y, vx, vy, active, trailX[], trailY[] |
| Pickups | 32 | x, y, row, col, active |
| Particles | 256 | x, y, vx, vy, life, maxLife, r, g, b, active |

### Game States

```
MENU → LEVEL_SELECT → AIMING → LAUNCHING → FLIGHT → TURN_END → ...
                                                        ↓
                                              ┌─────────┴─────────┐
                                         block at row 0?     mission complete?
                                              ↓                    ↓
                                         GAME_OVER          LEVEL_COMPLETE
                                              ↓                    ↓
                                         retry/menu          next/replay/menu

If neither: new row spawns → back to AIMING
```

States: `MENU`, `LEVEL_SELECT`, `AIMING`, `LAUNCHING`, `FLIGHT`, `TURN_END`, `GAME_OVER`, `LEVEL_COMPLETE`

## Playing Field

| Property | Value |
|----------|-------|
| Grid columns | 7 |
| Visible rows | 9 |
| Block size | 1.0 unit (square) |
| Block spacing | 0.12 units |
| Cell width | 1.12 units |
| Orientation | Portrait (9:16 reference) |

- Walls on left/right, ceiling at top — balls bounce off all three
- Floor at bottom — balls that fall below are deactivated (returned)
- Balls launch from center-bottom
- Blocks display remaining HP as a centered number

## Canvas & Responsive Layout

- Native canvas resolution: 1080 × 1920
- Canvas fills viewport width (up to readable max), height matches full viewport
- **Playing field**: Fixed unit-based dimensions, centered horizontally and vertically within the canvas. Does not stretch on taller viewports.
- **Menus/HUD**: Layout adapts to actual canvas height. On taller devices, elements use proportional vertical spacing rather than being letterboxed.
- Renderer tracks two rects:
  - **fieldRect**: fixed game area (grid + launch zone)
  - **canvasRect**: full viewport dimensions
- Menus position relative to canvasRect. Gameplay draws relative to fieldRect.
- CSS: canvas centered via absolute positioning + transform, `overflow: hidden` on body.

## Ball Mechanics

| Property | Value |
|----------|-------|
| Ball speed | 14 units/sec |
| Ball radius | 0.15 units |
| Starting ball count | 5 per level |
| Launch delay | 0.04s between balls |
| Min aim angle | 0.15 (Y component) |
| Sub-step size | radius × 1.8 = 0.27 units |

### Collision (Circle-to-AABB)

1. Find closest point on block rect to ball center.
2. If distance < ball radius → hit (1 damage).
3. Reflection: if horizontal overlap < vertical overlap → reverse vx, else reverse vy.
4. Track last-hit block per ball per sub-step to prevent double-damage.

### Boundaries

- Left/right walls: reverse vx
- Ceiling: reverse vy
- Floor (below field): deactivate ball

### Delta Time

- Game loop uses `requestAnimationFrame` with delta time
- Delta capped at 33ms (minimum effective 30fps) to prevent physics spiral

## Aiming & Launching

- **Aim input**: Touch drag or mouse drag from the bottom area of the screen. Direction = normalized vector from launch point toward pointer position.
- **Clamp**: Y component of direction must be ≥ 0.15 (prevents near-horizontal shots).
- **Aim line**: Dotted line from launch point in aimed direction, showing trajectory with wall bounces.
- **Launch**: On release, balls fire one every 0.04s from center-bottom, all sharing the same direction vector.

## Blocks (Phase 1: Normal Only)

- Each hit deals 1 damage. Destroyed when HP reaches 0.
- HP scales by turn: `HP = max(1, 15 + 7.5 × (turn - 1))`

### Color by HP

| HP Range | Color (RGB) |
|----------|-------------|
| 1–15 | Green (15, 255, 149) |
| 16–50 | Blue (26, 143, 255) |
| 51–125 | Purple (108, 60, 224) |
| 126+ | Orange (255, 107, 53) |

### Row Spawning

- Each turn, 1 new row spawns at the top
- Min blocks per row: 1, max blocks per row: 5 (out of 7 columns)
- Existing blocks shift down 1 row

## Pickups

- When a new row spawns, each empty cell has 15% chance to spawn a pickup
- Appearance: glowing green circle in the grid cell
- Collection: ball within (ball radius + block size × 0.3) collects it
- Effect: +5 balls to the player's count for the current level
- Pickups shift down with blocks each turn
- Removed if they fall below the floor
- Max 32 active pickups

## Scoring

- +1 point per damage dealt to a block
- +1 bonus when a block is fully destroyed

## Levels & Missions (Phase 1)

### 60 Levels

All 60 levels are defined by formulas — no hand-designed content.

**Difficulty curve:**
- Base: `progression = 1 + level × 0.25`
- Group multiplier (repeating pattern within each 10-level group):

| Position | Multiplier | Feel |
|----------|-----------|------|
| 0–1 | 0.70× | Comfort |
| 2–3 | 0.90× | Ramp up |
| 4 | 1.00× | Challenge |
| 5 | 0.75× | Breather |
| 6–7 | 1.10× | Ramp to spike |
| 8 | 1.30× | Spike |
| 9 | 0.80× | Breather |

- Final difficulty = `progression × multiplier`

### Mission Type (Phase 1)

Only "Survive N Turns" is functional in phase 1. Target = `round(8 × difficulty)`.

The other 4 mission types (Destroy N Blocks, Reach N Score, Collect N Pickups, Destroy N Blocks in One Shot) cycle by level number but are deferred to phase 2. In phase 1, all levels use Survive N Turns.

### Star System

| Stars | Requirement |
|-------|-------------|
| 1 star | Reach target |
| 2 stars | Reach 1.5× target |
| 3 stars | Reach 2× target |

- 3-star achievement auto-completes the level after 1 second
- Stars persist — only improvements are saved
- Level N+1 unlocks when level N earns ≥ 1 star
- Level 0 is always unlocked

## Menus

### Main Menu

- "NEON BARRAGE" title in Orbitron Bold, neon green glow
- "BREAK THE GRID" subtitle in Rajdhani
- PLAY button (green) — starts current/next unlocked level
- LEVEL SELECT button — opens level grid
- Star chest and shop buttons visible but disabled/grayed (phase 2)
- Layout scales vertically to viewport

### Level Select

- 5×12 grid of 60 levels, vertically scrollable via touch/mouse drag
- Locked: dark gray, shows "—"
- Current: blue highlight, shows "PLAY"
- Completed: dark green, shows 1–3 gold stars
- "STARS COLLECTED: X/180" progress bar at bottom
- Back button returns to main menu
- Layout scales vertically to viewport

### Level Complete Screen

- "LEVEL COMPLETE!" title (green)
- 3 star display (gold filled / gray empty)
- Score and turns summary
- NEXT LEVEL (green) and REPLAY (blue) buttons
- Layout scales vertically to viewport

### Game Over Screen

- "GAME OVER" title (red)
- "Mission Failed" subtitle
- RETRY (green) and LEVEL SELECT (blue) buttons
- Layout scales vertically to viewport

## Visual Style

### Color Palette

| Name | RGB | Usage |
|------|-----|-------|
| BgDark | (15, 15, 30) | Background |
| BgPanel | (12, 12, 26, 230) | Semi-transparent panels |
| BgCard | (20, 20, 42) | Card backgrounds |
| BorderDim | (26, 26, 58) | Subtle borders |
| Green | (15, 255, 149) | Primary accent, titles, buttons |
| GreenDark | (0, 204, 118) | Secondary green |
| Blue | (26, 143, 255) | Secondary accent, info |
| Purple | (108, 60, 224) | Tertiary accent |
| Orange | (255, 107, 53) | Warnings |
| Gold | (255, 170, 0) | Currency, rewards |
| TextWhite | (230, 230, 255) | Primary text |
| TextDim | (100, 100, 140) | Secondary text |
| TextDark | (10, 10, 22) | Text on bright backgrounds |

### Typography

- **Title font**: Orbitron Bold (Google Fonts) — headers, titles
- **Body font**: Rajdhani Bold (Google Fonts) — all other text
- Loaded via `<link>` in `index.html`

### Visual Effects (Phase 1)

- **Block destruction**: 20 particles burst radially, random directions, speed 5 ± 50%, lifetime 0.4s, alpha fade, color matches block
- **Block hit**: White flash for 0.12s
- **Ball trails**: 8-segment trail per ball, green, width tapers from 0.225 to 0
- **Aim line**: Dotted trajectory with wall bounce preview

### Design Principles

- Dark background with bright neon accents
- Glowing outlines on interactive elements
- All visuals procedurally drawn on canvas (no external image assets)
- Blocks rendered as rounded rects with HP number centered
- Consistent neon color coding throughout

## Persistence (localStorage)

All keys prefixed with `neon-barrage:`.

### Phase 1 Data

```json
{
  "stars": [0, 0, 0, ...],     // int[60] — stars per level
  "currentLevel": 0,            // highest unlocked level
  "bestScore": 0                 // all-time high score
}
```

Serialized as JSON. Loaded on startup, saved on level complete.

## What's Deferred

| Feature | Phase |
|---------|-------|
| Explosive, Stone, Moving blocks | 2 |
| All 6 powerups + inventory | 2 |
| 4 remaining mission types | 2 |
| Coin economy + shop | 2 |
| Star chest | 2 |
| Settings screen | 2 |
| Continue system (50 coins) | 2 |
| Level complete / game over full detail | 2 |
| Procedural audio (11 SFX + music) | 3 |
| Full VFX (screen shake, popups, powerup FX) | 3 |
| Haptics | 3 |
| Thumbnail image | 3 |
