# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Neon Barrage — a brick breaker game built with HTML5 Canvas for the play.nitzan.games platform.

## Development

- Open `index.html` in a browser to run the game (no build step required)
- All JS files loaded via `<script>` tags in order: constants → game-data → storage → levels → physics → input → renderer → game → main
- No bundler, no npm, no framework — vanilla JS only

## Architecture

- **Parallel arrays** for all game objects (blocks, balls, pickups, particles) — object pool pattern, never allocate/free during gameplay
- **Unit-based coordinate system** internally; `renderer.js` converts to canvas pixels via `scale` factor
- **State machine** in `game.js` drives all game flow (MENU → AIMING → LAUNCHING → FLIGHT → TURN_END → ...)
- Canvas scales to viewport width (max 9:16 of height); menus scale vertically, game field stays fixed size

## Platform Constraints (play.nitzan.games)

- Runs in sandboxed iframe — no network requests, fully self-contained
- localStorage keys must be prefixed with `neon-barrage:`
- Must have `meta.json` and `index.html` at root

## Key Files

- `js/constants.js` — all tuning values, colors, sizes (change game feel here)
- `js/game-data.js` — pool arrays and activate/deactivate helpers
- `js/physics.js` — ball movement, sub-stepping collision
- `js/game.js` — state machine, turn flow, scoring, all menu logic
- `js/renderer.js` — all canvas drawing
- `js/levels.js` — difficulty curve, HP scaling, row spawning
