# Neon Barrage — Phase 2a Design Spec

Phase 2a adds gameplay content on top of the Phase 1 core loop: 3 special block types, 6 powerups with inventory and activation UI, and all 5 mission goal types.

## Special Block Types

### Explosive Block (Orange-Red) — Unlocks at Level 5

- Spawn rate: 12% per block in new rows (when level >= 5)
- When destroyed, all 8 adjacent blocks (including diagonals) are also destroyed
- Chain reactions: if an adjacent block is also explosive, it triggers too
- Each adjacent block destroyed gives +1 score bonus
- Visual: orange-red color with a distinct icon/marker (e.g., "!" or explosion symbol)

### Stone Block (Gray) — Unlocks at Level 10

- Spawn rate: 6% per block in new rows (when level >= 10)
- Has 2 armor hits — first 2 hits deal no HP damage, only remove armor
- When hit, ball is deflected straight down (vy = abs(speed), vx = 0) instead of normal reflection
- After armor is depleted, takes normal damage and reflects normally
- Visual: gray color, shows armor count when armor > 0 (e.g., shield icon or armor number)

### Moving Block (Gold) — Unlocks at Level 15

- Spawn rate: 15% per block in new rows (when level >= 15)
- Each turn, shifts 1 column horizontally (random initial direction: left or right)
- Reverses direction at board edges or when blocked by another block
- Otherwise behaves like a normal block (same HP, same damage)
- Visual: gold color with a directional arrow indicator

### Data Changes

Add to block parallel arrays:
- `blockType`: 0 = normal, 1 = explosive, 2 = stone, 3 = moving
- `blockArmor`: armor hits remaining (stone blocks only, starts at 2)
- `blockMoveDir`: horizontal direction for moving blocks (-1 or 1)

### Row Spawning Changes

When spawning a new row, for each block:
1. Roll block type based on level unlock thresholds and spawn rates
2. Priority order: check moving (15%), then explosive (12%), then stone (6%), else normal
3. Only roll types that are unlocked for the current level

### Physics Changes

- Stone block collision: when armor > 0, decrement armor, deflect ball straight down, no HP damage
- Explosive block destruction: when HP reaches 0, destroy all 8 adjacent active blocks (check grid neighbors by row/col). For each destroyed neighbor, award +1 score. If neighbor is explosive, queue it for chain detonation.

### Turn-End Changes

- After shifting blocks down, move all active moving blocks horizontally by their `blockMoveDir`
- Reverse direction if at edge (col 0 or col 6) or if destination cell is occupied

## Powerups

### Inventory

- `powerupInventory[6]` — count for each powerup type, persisted in localStorage
- Phase 2a: powerups are granted for testing (e.g., start with 3 of each). Full economy comes in Phase 2b.

### Powerup Types

| # | Name | Color | Effect | Duration |
|---|------|-------|--------|----------|
| 0 | Laser Ball | Blue (26,143,255) | Balls pierce through blocks without bouncing, hitting every block in path | One turn |
| 1 | Fire Ball | Orange (255,107,53) | Balls deal 2 damage per hit instead of 1 | One turn |
| 2 | Extra Balls | Green (15,255,149) | Adds 25 balls to player's count | Permanent (current level) |
| 3 | Magnet | Purple (108,60,224) | Instantly collects all pickups on the board | Instant |
| 4 | Shockwave | Yellow (255,170,0) | Destroys all blocks in the lowest occupied row, +1 score per block | Instant |
| 5 | Shrink Ray | Cyan (0,212,255) | Halves HP of every active block (rounded down, min 1) | Instant |

### Activation Rules

- Laser Ball and Fire Ball are mutually exclusive — only one per turn
- Other powerups can be used freely, multiple times per turn if inventory allows
- Each activation consumes 1 from inventory
- Powerups are activated during AIMING state, before launching

### Activation UI

- Horizontal bar of 6 powerup buttons at the bottom of the screen, below the playing field
- Each button: colored pill shape with border, shows icon and inventory count
- Colors: Blue (laser), Orange (fire), Green (extra), Purple (magnet), Yellow (shockwave), Cyan (shrink)
- Grayed out when inventory is 0
- Laser/Fire: highlighted border when active, grayed out if the other is active this turn
- Tapping an active Laser/Fire toggles it off

### Powerup Effects on Physics

- **Laser Ball**: balls don't bounce off blocks. On block collision, deal damage but continue in same direction. Ball still bounces off walls/ceiling.
- **Fire Ball**: each block hit deals 2 damage instead of 1. Score is +2 per hit (matching damage dealt).
- **Extra Balls**: immediate, just adds to `Game.ballCount`
- **Magnet**: iterate all active pickups, deactivate them, add ball bonus for each
- **Shockwave**: find the highest row number (lowest on screen) that has active blocks. Destroy all blocks in that row. +1 score per block.
- **Shrink Ray**: iterate all active blocks, set `blockHP[i] = max(1, floor(blockHP[i] / 2))`

### Visual Effects for Powerups

- **Laser Ball active**: ball trail color changes to cyan, balls rendered with a cyan glow
- **Fire Ball active**: ball trail color changes to orange, balls rendered with an orange glow
- **Magnet**: pickups flash and disappear (instant)
- **Shockwave**: particles burst from all destroyed blocks in the row
- **Shrink Ray**: all blocks flash white simultaneously, small particles from each (3 per block)

## Mission Goal Types

All 5 types cycle by level number: Level 0 = type 0, Level 1 = type 1, ..., Level 5 = type 0, etc.

| # | Goal | Target Formula | Tracking |
|---|------|---------------|----------|
| 0 | Survive N Turns | `round(8 × difficulty)` | `Game.turn` (already implemented) |
| 1 | Destroy N Blocks | `round(15 × difficulty)` | `Game.blocksDestroyed` (already tracked) |
| 2 | Reach N Score | `round(40 × difficulty)` | `Game.score` (already tracked) |
| 3 | Collect N Pickups | `max(2, round(3 × difficulty))` | `Game.pickupsCollected` (already tracked) |
| 4 | Destroy N Blocks in One Shot | `max(2, round(2.5 × difficulty))` | New: track max blocks destroyed in a single turn |

### Changes to levels.js

- `getMissionTarget(level)` returns target based on `level % 5` goal type
- `getMissionType(level)` returns 0-4
- `getMissionProgress(game)` returns current progress based on mission type

### Changes to HUD

- Mission text changes based on type: "Survive: X/Y", "Destroy: X/Y", "Score: X/Y", "Collect: X/Y", "One Shot: X/Y"

### Star Calculation

Stars are calculated on the mission progress value vs target (same thresholds: 1x, 1.5x, 2x).

### "One Shot" Tracking

Track `Game.bestTurnBlocks` — the maximum number of blocks destroyed in any single turn. Reset to 0 at level start. After each turn's balls return, compare `blocksDestroyedThisTurn` to `bestTurnBlocks` and keep the max.

## File Changes Summary

| File | Changes |
|------|---------|
| `js/constants.js` | Add BLOCK_TYPE enum, powerup constants, mission type constants |
| `js/game-data.js` | Add blockType, blockArmor, blockMoveDir arrays; add powerupInventory |
| `js/levels.js` | Update spawnRow for block types; add getMissionType, getMissionProgress; update getMissionTarget for all 5 types; add moveMovingBlocks |
| `js/physics.js` | Stone deflection, explosive chain destruction, laser pierce, fire damage |
| `js/renderer.js` | Draw special block types (explosive marker, stone armor, moving arrow); draw powerup bar; colored ball trails |
| `js/game.js` | Powerup activation in AIMING; powerup UI; mission type display in HUD; one-shot tracking; turn-end moving blocks |
| `js/storage.js` | Add powerupInventory to save/load |

## What's Deferred to Phase 2b

- Coin economy (earn/spend)
- Shop screen
- Star Chest
- Settings screen
- Continue system (50 coins)
- Rewarded ad buttons (removed for web)
