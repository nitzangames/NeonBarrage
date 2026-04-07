# Neon Barrage Phase 2b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add coin economy, shop, star chest, settings, continue system, and polished end-of-level screens.

**Architecture:** Extends existing Game state machine with 3 new states (SHOP, SETTINGS, CHEST_POPUP). Coin/chest/settings data added to storage. Shop and settings are full-screen canvas-drawn menus like the existing ones.

**Tech Stack:** Same — vanilla JS, HTML5 Canvas 2D.

**Spec:** `docs/superpowers/specs/2026-04-06-neon-barrage-phase2b-design.md`

---

## File Map

| File | Changes |
|------|---------|
| `js/constants.js` | New states, coin/chest/pack constants |
| `js/storage.js` | Add coins, chestStars, settings to saveData |
| `js/game.js` | Shop, settings, chest popup rendering + logic; continue system; coin rewards; remove test powerups; coin display; full end screens |
| `js/renderer.js` | Toggle switch helper, shop card helper |

---

### Task 1: Constants and Storage

**Files:**
- Modify: `js/constants.js`
- Modify: `js/storage.js`

- [ ] **Step 1: Add new states and economy constants to constants.js**

Add to the STATE object:
```js
  SHOP: 8,
  SETTINGS: 9,
  CHEST_POPUP: 10
```

Add at end of constants.js (before blockColor):
```js
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
```

- [ ] **Step 2: Update storage.js**

Add to saveData:
```js
  coins: 0,
  chestStars: 0,
  settings: { sound: true, music: true, haptics: true }
```

In loadProgress, add after the powerups block:
```js
      if (typeof data.coins === 'number') saveData.coins = data.coins;
      if (typeof data.chestStars === 'number') saveData.chestStars = data.chestStars;
      if (data.settings) saveData.settings = data.settings;
```

- [ ] **Step 3: Commit**

```bash
git add js/constants.js js/storage.js
git commit -m "feat: add economy constants and persist coins, chest stars, settings"
```

---

### Task 2: Renderer Helpers

**Files:**
- Modify: `js/renderer.js`

- [ ] **Step 1: Add toggle switch and shop card helpers**

Add to the Renderer object (before drawPowerupBar):

```js
  // Toggle switch for settings
  drawToggle(x, y, w, h, isOn, label) {
    // Track background
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fillStyle = isOn ? rgb(COL.green, 0.3) : rgb(COL.bgCard);
    ctx.fill();
    ctx.strokeStyle = isOn ? rgb(COL.green, 0.6) : rgb(COL.borderDim);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Knob
    const knobR = h * 0.35;
    const knobX = isOn ? x + w - h / 2 : x + h / 2;
    ctx.beginPath();
    ctx.arc(knobX, y + h / 2, knobR, 0, Math.PI * 2);
    ctx.fillStyle = isOn ? rgb(COL.green) : rgb(COL.textDim);
    ctx.fill();

    // Label
    ctx.font = `bold ${h * 0.7}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x - h * 0.4, y + h / 2);
  },

  // Shop pack card
  drawPackCard(x, y, w, h, pack, canAfford) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fillStyle = rgb(COL.bgCard);
    ctx.fill();
    ctx.strokeStyle = rgb(COL.borderDim);
    ctx.lineWidth = 1;
    ctx.stroke();

    const midX = x + w / 2;
    const fs = h * 0.13;

    // Pack name
    ctx.font = `bold ${fs * 1.2}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pack.name, midX, y + h * 0.15);

    // Contents
    ctx.font = `bold ${fs * 0.8}px ${FONT_BODY}`;
    let contY = y + h * 0.32;
    for (let i = 0; i < POWERUP_COUNT; i++) {
      if (pack.items[i] > 0) {
        ctx.fillStyle = rgb(PW_COLORS[i]);
        ctx.fillText(`${pack.items[i]}× ${PW_NAMES[i]}`, midX, contY);
        contY += fs * 1.1;
      }
    }

    // Cost / Buy button
    const btnW = w * 0.5;
    const btnH = h * 0.16;
    const btnX = midX - btnW / 2;
    const btnY = y + h - btnH - h * 0.08;
    const color = canAfford ? COL.gold : COL.textDim;

    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, btnH / 2);
    ctx.fillStyle = canAfford ? rgb(COL.gold, 0.2) : rgb(COL.bgCard);
    ctx.fill();
    ctx.strokeStyle = rgb(color, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `bold ${btnH * 0.5}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(color);
    ctx.fillText(`${pack.cost} coins`, midX, btnY + btnH / 2);

    return { btnX, btnY, btnW, btnH };
  },
```

- [ ] **Step 2: Commit**

```bash
git add js/renderer.js
git commit -m "feat: add toggle switch and shop card renderer helpers"
```

---

### Task 3: Shop, Settings, Star Chest, Continue, Coin Rewards

**Files:**
- Modify: `js/game.js`

This is the big integration task. Changes needed:

- [ ] **Step 1: Remove test powerup grant from startLevel**

Remove the block that gives 3 of each powerup in `startLevel`.

- [ ] **Step 2: Add coin display to main menu**

In `renderMenu`, show coin balance at top. Re-enable SHOP button. Add SETTINGS gear button top-right. Add star chest display.

- [ ] **Step 3: Add coin display to HUD**

In `renderHUD`, show coin balance.

- [ ] **Step 4: Update completeMission to award coins**

Calculate coins = new stars × COINS_PER_STAR. Add to saveData.coins. Track delta stars for chest.

- [ ] **Step 5: Update level complete screen**

Show "+X COINS" text. Full score card.

- [ ] **Step 6: Update game over screen with continue**

Add CONTINUE button (50 coins) if player can afford it. On tap: deduct coins, resume from AIMING.

- [ ] **Step 7: Add renderShop method**

Full shop screen: back button, coin balance, 3 pack cards using Renderer.drawPackCard. Purchase logic deducts coins, adds powerups.

- [ ] **Step 8: Add renderSettings method**

3 toggles using Renderer.drawToggle. Main Menu button. Version text.

- [ ] **Step 9: Add renderChestPopup method**

Overlay showing 3 random powerup rewards. "AWESOME!" dismiss button.

- [ ] **Step 10: Add star chest to main menu**

Hex icon with glow when full. "X/10" text. On tap when full: open chest, show popup.

- [ ] **Step 11: Update Game.update and Game.render for new states**

Add SHOP, SETTINGS, CHEST_POPUP to the render switch.

- [ ] **Step 12: Commit**

```bash
git add js/game.js
git commit -m "feat: add shop, settings, star chest, continue system, coin rewards"
```

---

### Task 4: End-to-End Verification

- [ ] Test coin earning: complete a level, verify coins awarded (10 per new star)
- [ ] Test shop: buy a pack, verify coins deducted and powerups added
- [ ] Test star chest: earn 10 stars, open chest, verify 3 random powerups
- [ ] Test continue: game over with 50+ coins, continue resumes play
- [ ] Test settings: toggles persist after refresh
- [ ] Test no free powerups: new game starts with 0 powerups (no more test grant)

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Constants + storage | constants.js, storage.js |
| 2 | Renderer helpers | renderer.js |
| 3 | All game logic (shop, settings, chest, continue, coins) | game.js |
| 4 | Verification | (testing) |
