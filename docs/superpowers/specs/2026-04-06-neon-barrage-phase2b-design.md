# Neon Barrage — Phase 2b Design Spec

Phase 2b adds economy and meta systems: coins, shop, star chest, settings screen, continue system, and polished level complete/game over screens.

## Coins

- **Earning**: 10 coins per star earned on level completion (10-30 per level). Only new stars count — replaying for the same stars gives 0 coins.
- **Spending**: Powerup packs in the shop, continues on game over.
- **Display**: Shown on main menu and in-game HUD.

## Shop Screen

- Accessed from main menu SHOP button (re-enable it).
- Back button returns to main menu.
- "SHOP" title, coin balance display at top.

### Powerup Packs (bought with coins)

| Pack | Contents | Cost |
|------|----------|------|
| Ball Pack | 3× Laser, 3× Fire, 3× Extra Balls | 300 coins |
| Utility Pack | 3× Magnet, 3× Shockwave, 3× Shrink Ray | 350 coins |
| Everything Pack | 3× each of all 6 powerups | 500 coins |

- Each pack is a card showing name, contents, cost, and a BUY button.
- BUY is grayed out if insufficient coins.
- On purchase: deduct coins, add powerups to inventory, save, show brief confirmation.

## Star Chest

- Shown on main menu as a hexagonal icon with "X/10" progress.
- Stars accumulated = sum of new delta stars earned (improvement over previous best) since last chest.
- At 10 accumulated stars, chest glows and is tappable.
- **Reward**: 3 random powerups (any of 6 types, can repeat).
- Opening resets counter to 0.
- Show a reward popup with the 3 powerups received.

## Continue System

- On game over screen, if player has ≥ 50 coins, show "CONTINUE (50 coins)" button.
- Costs 50 coins. Resumes the level from current state — blocks remain, game continues from AIMING state.
- Only available once per game over.

## Settings Screen

- Accessed from main menu (add SETTINGS button, top-right gear icon).
- 3 toggle switches: Sound, Music, Haptics.
- Toggle visual: rounded pill, white knob slides left/right, green (on) / gray (off).
- Toggles saved to localStorage.
- "Main Menu" button returns to menu.
- Version text at bottom: "v1.0"

## Level Complete Screen (Full)

- "LEVEL COMPLETE!" title (green glow).
- 3 large star display (gold filled / gray empty).
- Score card: Score, Turns, Balls Used.
- "+X COINS" reward display (gold text).
- NEXT LEVEL (green) and REPLAY (blue) buttons.
- MENU button.

## Game Over Screen (Full)

- "GAME OVER" title (red).
- "Mission Failed" subtitle.
- Score and turns display.
- CONTINUE (50 COINS) button — purple, only if ≥ 50 coins. 
- RETRY (green) and LEVELS (blue) buttons.

## Persistence Changes

Add to saveData:
- `coins`: current coin balance (integer)
- `chestStars`: accumulated stars toward next chest (integer)
- `settings`: `{ sound: true, music: true, haptics: true }`
- Remove the test powerup grant from startLevel (players earn them now)

## File Changes

| File | Changes |
|------|---------|
| `js/constants.js` | Add coin/chest/continue constants, pack definitions |
| `js/storage.js` | Add coins, chestStars, settings to saveData |
| `js/game.js` | Shop screen, settings screen, star chest, continue system, coin rewards, full level complete/game over screens, coin display in HUD/menu |
| `js/renderer.js` | Settings toggle drawing helper, shop card helper, chest icon |
