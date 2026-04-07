// --- Level Select ---
const LevelSelect = {
  scrollY: 0,
  scrollVel: 0,
  maxScroll: 0,
  isDragging: false,
  touchStartY: 0,
  lastTouchY: 0,

  handleScroll(e) {
    this.scrollY += e.deltaY * 0.5;
    this.scrollVel = 0;
  },

  update(dt) {
    if (!this.isDragging) {
      this.scrollY += this.scrollVel * dt;
      this.scrollVel *= 0.92; // friction
      if (Math.abs(this.scrollVel) < 1) this.scrollVel = 0;
    }
    // Clamp scroll
    if (this.scrollY < 0) this.scrollY = 0;
    if (this.scrollY > this.maxScroll) this.scrollY = this.maxScroll;
  },

  render() {
    ctx.fillStyle = rgb(COL.bgDark);
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Title
    const titleSize = canvasW * 0.06;
    ctx.font = `bold ${titleSize}px ${FONT_TITLE}`;
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SELECT LEVEL', canvasW / 2, canvasH * 0.06);

    // Grid layout
    const cols = 5;
    const rows = Math.ceil(TOTAL_LEVELS / cols);
    const padding = canvasW * 0.06;
    const gap = canvasW * 0.025;
    const cellW = (canvasW - padding * 2 - gap * (cols - 1)) / cols;
    const cellH = cellW * 1.2;
    const gridTop = canvasH * 0.16;
    const gridHeight = rows * (cellH + gap);
    this.maxScroll = Math.max(0, gridHeight - (canvasH * 0.74));

    // Save context for clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, gridTop, canvasW, canvasH * 0.74);
    ctx.clip();

    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (cellW + gap);
      const y = gridTop + row * (cellH + gap) - this.scrollY;

      // Skip if off-screen
      if (y + cellH < gridTop || y > canvasH) continue;

      const stars = saveData.stars[i];
      const isUnlocked = i === 0 || saveData.stars[i - 1] > 0;
      const isCurrent = i === saveData.currentLevel;

      // Cell background
      if (!isUnlocked) {
        ctx.fillStyle = rgb([30, 30, 50]);
      } else if (isCurrent) {
        ctx.fillStyle = rgb(COL.blue, 0.3);
      } else if (stars > 0) {
        ctx.fillStyle = rgb(COL.green, 0.15);
      } else {
        ctx.fillStyle = rgb(COL.bgCard);
      }

      ctx.beginPath();
      ctx.roundRect(x, y, cellW, cellH, 6);
      ctx.fill();

      // Border
      if (isCurrent) {
        ctx.strokeStyle = rgb(COL.blue);
        ctx.lineWidth = 2;
      } else if (stars > 0) {
        ctx.strokeStyle = rgb(COL.green, 0.5);
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = rgb(COL.borderDim);
        ctx.lineWidth = 1;
      }
      ctx.stroke();

      // Cell content
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (!isUnlocked) {
        ctx.font = `bold ${cellW * 0.4}px ${FONT_BODY}`;
        ctx.fillStyle = rgb(COL.textDim);
        ctx.fillText('\u2014', x + cellW / 2, y + cellH * 0.4);
      } else {
        // Level number
        ctx.font = `bold ${cellW * 0.35}px ${FONT_BODY}`;
        ctx.fillStyle = rgb(COL.textWhite);
        ctx.fillText(i + 1, x + cellW / 2, y + cellH * 0.35);

        if (isCurrent && stars === 0) {
          ctx.font = `bold ${cellW * 0.2}px ${FONT_BODY}`;
          ctx.fillStyle = rgb(COL.blue);
          ctx.fillText('PLAY', x + cellW / 2, y + cellH * 0.7);
        } else if (stars > 0) {
          // Draw stars
          const starStr = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
          ctx.font = `${cellW * 0.22}px ${FONT_BODY}`;
          ctx.fillStyle = rgb(COL.gold);
          ctx.fillText(starStr, x + cellW / 2, y + cellH * 0.72);
        }
      }

      // Hit test for tapping
      if (isUnlocked && (Input.tapped || Input.aimReleased)) {
        if (Input.hitTestRect(x, y, cellW, cellH)) {
          Input.consumeTap();
          Input.consumeRelease();
          Game.startLevel(i);
          ctx.restore();
          return;
        }
      }
    }

    ctx.restore();

    // Progress bar
    const totalStars = saveData.stars.reduce((a, b) => a + b, 0);
    const maxStars = TOTAL_LEVELS * 3;
    const barW = canvasW * 0.7;
    const barH = canvasH * 0.02;
    const barX = (canvasW - barW) / 2;
    const barY = canvasH * 0.93;

    ctx.fillStyle = rgb(COL.borderDim);
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barH / 2);
    ctx.fill();

    const fillW = barW * (totalStars / maxStars);
    if (fillW > 0) {
      ctx.fillStyle = rgb(COL.green);
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, barH / 2);
      ctx.fill();
    }

    ctx.font = `bold ${canvasH * 0.018}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDim);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`STARS COLLECTED: ${totalStars}/180`, canvasW / 2, barY + barH + canvasH * 0.025);

    // Back button (below title)
    const backW = canvasW * 0.2;
    const backH = canvasH * 0.04;
    const backX = canvasW * 0.05;
    const backY = canvasH * 0.1;
    Game.drawButton('← BACK', backX, backY, backW, backH, COL.textDim, canvasH * 0.018);

    if (Input.tapped || Input.aimReleased) {
      if (Input.hitTestRect(backX, backY, backW, backH)) {
        Input.consumeTap();
        Input.consumeRelease();
        Game.state = STATE.MENU;
      }
    }
  }
};

// --- Game Object ---
const Game = {
  state: STATE.MENU,

  // Per-level state
  level: 0,
  turn: 0,
  score: 0,
  ballCount: BALL_START_COUNT,
  blocksDestroyed: 0,
  pickupsCollected: 0,
  missionTarget: 0,

  // Launch state
  ballsToLaunch: 0,
  launchTimer: 0,

  // Auto-complete timer (for 3-star)
  autoCompleteTimer: 0,

  // Turn-end animation timer
  turnEndTimer: 0,

  // Powerup state
  activePowerup: -1,  // -1 = none, PW_LASER or PW_FIRE
  blocksThisTurn: 0,
  bestTurnBlocks: 0,

  // --- Button Helper ---
  drawButton(text, x, y, w, h, color, fontSize, disabled) {
    color = color || COL.green;
    fontSize = fontSize || h * 0.5;

    ctx.fillStyle = rgb(color, 0.15);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h * 0.2);
    ctx.fill();

    ctx.strokeStyle = rgb(color, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(color);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
  },

  // --- Start Level ---
  startLevel(level) {
    this.level = level;
    this.turn = 1;
    this.score = 0;
    this.ballCount = BALL_START_COUNT;
    this.blocksDestroyed = 0;
    this.pickupsCollected = 0;
    this.missionTarget = getMissionTarget(level);
    this.ballsToLaunch = 0;
    this.launchTimer = 0;
    this.autoCompleteTimer = 0;
    this.turnEndTimer = 0;
    this.activePowerup = -1;
    this.blocksThisTurn = 0;
    this.bestTurnBlocks = 0;

    // Give test powerups (Phase 2a: 3 of each for testing)
    for (let p = 0; p < POWERUP_COUNT; p++) {
      if (powerupInventory[p] < 3) powerupInventory[p] = 3;
    }
    syncPowerupsToSave();
    saveProgress();

    clearAllPools();
    Physics.resetLastHit();

    // Reset launch position
    Input.launchX = FIELD_WIDTH / 2;
    Input.launchY = FIELD_HEIGHT + LAUNCH_AREA_HEIGHT * 0.3;
    Input.isAiming = false;
    Input.aimReleased = false;
    Input.tapped = false;

    // Spawn first row
    spawnRow(0, this.turn, this.level);

    this.state = STATE.AIMING;
  },

  // --- Pause button hit test (checked before aim consumes input) ---
  checkPause() {
    if (!Input.tapped) return;
    const pad = canvasW * 0.04;
    const fontSize = canvasW * 0.035;
    const hudH = canvasH * 0.08;
    const row1Y = hudH * 0.32;
    const row2Y = hudH * 0.72;
    const pauseH = row2Y - row1Y + fontSize * 1.3;
    const pauseW = pauseH;
    const pauseBtnX = canvasW - pad - pauseW;
    const pauseBtnY = row1Y - fontSize * 0.4;
    if (Input.tapX >= pauseBtnX && Input.tapX <= pauseBtnX + pauseW &&
        Input.tapY >= pauseBtnY && Input.tapY <= pauseBtnY + pauseH) {
      Input.consumeTap();
      this.state = STATE.MENU;
      return true;
    }
    return false;
  },

  // --- Update ---
  update(dt) {
    // Check pause before anything else during gameplay
    if (this.state >= STATE.AIMING && this.state <= STATE.TURN_END) {
      if (this.checkPause()) return;
    }

    switch (this.state) {
      case STATE.AIMING:
        this.updateAiming(dt);
        break;
      case STATE.LAUNCHING:
        this.updateLaunching(dt);
        break;
      case STATE.FLIGHT:
        this.updateFlight(dt);
        break;
      case STATE.TURN_END:
        this.updateTurnEnd(dt);
        break;
      // Menu states don't need per-frame update here
    }

    // Always update particles, flash, and falling pickups
    Physics.updateParticles(dt);
    Physics.updateBlockFlash(dt);
    Physics.updateFallingPickups(dt);
  },

  // Check if pointer is in the powerup bar area
  isInPowerupBar(py) {
    const barH = canvasH * 0.06;
    const barY = canvasH - barH - canvasH * 0.01;
    return py >= barY;
  },

  updateAiming(dt) {
    // Check powerup bar taps
    if (Input.tapped) {
      if (this.isInPowerupBar(Input.tapY)) {
        this.checkPowerupTap();
        return; // Don't process aim this frame
      }
    }

    // Don't aim if dragging from the powerup bar
    if (Input.isDown && this.isInPowerupBar(Input.pointerY)) {
      return;
    }

    const wasAiming = Input.isAiming;
    const released = Input.aimReleased;

    Input.updateAim();

    if (released && wasAiming) {
      this.ballsToLaunch = this.ballCount;
      this.launchTimer = 0;
      this.blocksThisTurn = 0;
      this.state = STATE.LAUNCHING;
      Input.isAiming = false;
    }
  },

  checkPowerupTap() {
    const barH = canvasH * 0.06;
    const barY = canvasH - barH - canvasH * 0.01;
    const btnW = (canvasW * 0.88) / POWERUP_COUNT;
    const gap = canvasW * 0.01;
    const startX = (canvasW - (btnW * POWERUP_COUNT + gap * (POWERUP_COUNT - 1))) / 2;

    for (let p = 0; p < POWERUP_COUNT; p++) {
      const x = startX + p * (btnW + gap);
      if (Input.tapX >= x && Input.tapX <= x + btnW &&
          Input.tapY >= barY && Input.tapY <= barY + barH) {
        Input.consumeTap();
        this.activatePowerup(p);
        return;
      }
    }
  },

  activatePowerup(type) {
    if (powerupInventory[type] <= 0) return;

    if (type === PW_LASER || type === PW_FIRE) {
      if (this.activePowerup === type) {
        this.activePowerup = -1;
        return;
      }
      if (this.activePowerup === PW_LASER || this.activePowerup === PW_FIRE) {
        return;
      }
      powerupInventory[type]--;
      this.activePowerup = type;
    } else if (type === PW_EXTRA) {
      powerupInventory[type]--;
      this.ballCount += PW_EXTRA_BALLS;
    } else if (type === PW_MAGNET) {
      powerupInventory[type]--;
      for (let i = 0; i < MAX_PICKUPS; i++) {
        if (pickupActive[i] && !pickupFalling[i]) {
          pickupFalling[i] = 1;
          pickupVY[i] = 0;
          // Award balls immediately
          this.ballCount += PICKUP_BALL_BONUS;
          this.pickupsCollected++;
        }
      }
    } else if (type === PW_SHOCKWAVE) {
      powerupInventory[type]--;
      let lowestRow = -1;
      for (let i = 0; i < MAX_BLOCKS; i++) {
        if (blockActive[i] && blockRow[i] > lowestRow) lowestRow = blockRow[i];
      }
      if (lowestRow >= 0) {
        for (let i = 0; i < MAX_BLOCKS; i++) {
          if (blockActive[i] && blockRow[i] === lowestRow) {
            blockActive[i] = 0;
            this.score++;
            this.blocksDestroyed++;
            const color = blockColor(blockMaxHP[i], blockType[i]);
            spawnParticles(blockX[i] + BLOCK_SIZE / 2, blockY[i] + BLOCK_SIZE / 2,
              DESTROY_PARTICLE_COUNT, DESTROY_PARTICLE_SPEED, DESTROY_PARTICLE_LIFE,
              color[0], color[1], color[2]);
          }
        }
      }
    } else if (type === PW_SHRINK) {
      powerupInventory[type]--;
      for (let i = 0; i < MAX_BLOCKS; i++) {
        if (blockActive[i]) {
          blockHP[i] = Math.max(1, Math.floor(blockHP[i] / 2));
          blockFlashTimer[i] = BLOCK_FLASH_DURATION;
        }
      }
    }
    syncPowerupsToSave();
    saveProgress();
  },

  updateLaunching(dt) {
    this.launchTimer -= dt;

    if (this.launchTimer <= 0 && this.ballsToLaunch > 0) {
      // Fire a ball
      const vx = Input.aimDirX * BALL_SPEED;
      const vy = Input.aimDirY * BALL_SPEED;
      activateBall(Input.launchX, Input.launchY, vx, vy);
      this.ballsToLaunch--;
      this.launchTimer = LAUNCH_DELAY;
    }

    // Run physics even while launching
    const active = Physics.update(dt, this);

    if (this.ballsToLaunch <= 0) {
      this.state = STATE.FLIGHT;
    }
  },

  updateFlight(dt) {
    const active = Physics.update(dt, this);

    // Check 3-star auto-complete
    const progress = getMissionProgress(this);
    const stars = calcStars(progress, this.missionTarget);
    if (stars >= 3) {
      this.autoCompleteTimer += dt;
      if (this.autoCompleteTimer >= 1.0) {
        this.completeMission();
        return;
      }
    } else {
      this.autoCompleteTimer = 0;
    }

    if (active === 0) {
      this.state = STATE.TURN_END;
      this.turnEndTimer = 0.2;
    }
  },

  updateTurnEnd(dt) {
    this.turnEndTimer -= dt;
    if (this.turnEndTimer > 0) return;

    if (this.blocksThisTurn > this.bestTurnBlocks) {
      this.bestTurnBlocks = this.blocksThisTurn;
    }
    this.blocksThisTurn = 0;
    this.activePowerup = -1;

    shiftBlocksDown();
    moveMovingBlocks();

    if (checkGameOver()) {
      const progress = getMissionProgress(this);
      const stars = calcStars(progress, this.missionTarget);
      if (stars >= 1) {
        this.completeMission();
      } else {
        this.state = STATE.GAME_OVER;
      }
      return;
    }

    this.turn++;
    spawnRow(0, this.turn, this.level);
    Physics.resetLastHit();

    this.state = STATE.AIMING;
  },

  completeMission() {
    const progress = getMissionProgress(this);
    const stars = calcStars(progress, this.missionTarget);

    // Save progress
    if (stars > saveData.stars[this.level]) {
      saveData.stars[this.level] = stars;
    }
    if (this.score > saveData.bestScore) {
      saveData.bestScore = this.score;
    }
    // Unlock next level
    if (this.level === saveData.currentLevel && this.level < TOTAL_LEVELS - 1) {
      saveData.currentLevel = this.level + 1;
    }
    saveProgress();

    this.state = STATE.LEVEL_COMPLETE;
  },

  // --- Render ---
  render() {
    switch (this.state) {
      case STATE.MENU:
        this.renderMenu();
        break;
      case STATE.LEVEL_SELECT:
        LevelSelect.render();
        break;
      case STATE.AIMING:
      case STATE.LAUNCHING:
      case STATE.FLIGHT:
      case STATE.TURN_END:
        this.renderGame();
        break;
      case STATE.GAME_OVER:
        this.renderGame();
        this.renderGameOver();
        break;
      case STATE.LEVEL_COMPLETE:
        this.renderGame();
        this.renderLevelComplete();
        break;
    }
  },

  // --- Menu ---
  renderMenu() {
    ctx.fillStyle = rgb(COL.bgDark);
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Title
    const titleSize = canvasW * 0.09;
    ctx.font = `bold ${titleSize}px ${FONT_TITLE}`;
    ctx.fillStyle = rgb(COL.green);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = rgb(COL.green, 0.6);
    ctx.shadowBlur = 20;
    ctx.fillText('NEON', canvasW / 2, canvasH * 0.28);
    ctx.fillText('BARRAGE', canvasW / 2, canvasH * 0.28 + titleSize * 1.2);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = `bold ${canvasW * 0.035}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText('BREAK THE GRID', canvasW / 2, canvasH * 0.28 + titleSize * 2.5);

    // Play button
    const btnW = canvasW * 0.55;
    const btnH = canvasH * 0.065;
    const btnX = (canvasW - btnW) / 2;
    const playY = canvasH * 0.55;
    this.drawButton('PLAY', btnX, playY, btnW, btnH, COL.green);

    if (Input.tapped || Input.aimReleased) {
      if (Input.hitTestRect(btnX, playY, btnW, btnH)) {
        Input.consumeTap();
        Input.consumeRelease();
        this.startLevel(saveData.currentLevel);
        return;
      }
    }

    // Level Select button
    const lsY = playY + btnH * 1.6;
    this.drawButton('LEVEL SELECT', btnX, lsY, btnW, btnH, COL.blue);

    if (Input.tapped || Input.aimReleased) {
      if (Input.hitTestRect(btnX, lsY, btnW, btnH)) {
        Input.consumeTap();
        Input.consumeRelease();
        LevelSelect.scrollY = 0;
        LevelSelect.scrollVel = 0;
        this.state = STATE.LEVEL_SELECT;
        return;
      }
    }

    // Best score
    if (saveData.bestScore > 0) {
      ctx.font = `bold ${canvasW * 0.035}px ${FONT_BODY}`;
      ctx.fillStyle = rgb(COL.textDim);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BEST: ' + saveData.bestScore, canvasW / 2, lsY + btnH * 2.2);
    }

    // Consume any remaining input
    if (Input.tapped) Input.consumeTap();
    if (Input.aimReleased) Input.consumeRelease();
  },

  // --- HUD ---
  renderHUD() {
    const hudY = 0;
    const hudH = canvasH * 0.08;

    // Background
    ctx.fillStyle = rgb(COL.bgPanel);
    ctx.fillRect(0, hudY, canvasW, hudH);

    // Bottom border
    ctx.strokeStyle = rgb(COL.borderDim);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hudY + hudH);
    ctx.lineTo(canvasW, hudY + hudH);
    ctx.stroke();

    const pad = canvasW * 0.04;
    const fontSize = canvasW * 0.035;
    const row1Y = hudY + hudH * 0.32;
    const row2Y = hudY + hudH * 0.72;

    // --- Turn label (left, two lines) ---
    ctx.textBaseline = 'middle';

    // "TURN" small label
    ctx.font = `bold ${fontSize * 0.75}px ${FONT_BODY}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText('TURN', pad, row1Y);

    // Turn number (large)
    ctx.font = `bold ${fontSize * 1.3}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.fillText(this.turn, pad, row2Y);

    // --- Pause button (right, same height as turn two-liner) ---
    const pauseH = row2Y - row1Y + fontSize * 1.3;
    const pauseW = pauseH;
    const pauseBtnX = canvasW - pad - pauseW;
    const pauseBtnY = row1Y - fontSize * 0.4;
    ctx.fillStyle = rgb(COL.textDim, 0.5);
    ctx.beginPath();
    ctx.roundRect(pauseBtnX, pauseBtnY, pauseW, pauseH, 4);
    ctx.fill();
    ctx.font = `bold ${pauseH * 0.4}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', pauseBtnX + pauseW / 2, pauseBtnY + pauseH / 2);

    // --- Center column: Level label + Score ---
    // Level above score
    ctx.font = `bold ${fontSize * 0.75}px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText(`LEVEL ${this.level + 1}`, canvasW / 2, row1Y);

    // Score
    ctx.font = `bold ${fontSize * 1.3}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.green);
    ctx.fillText(this.score, canvasW / 2, row2Y);

    // --- Sub-bar below HUD: Mission (left), Stars (right) ---
    const subY = hudY + hudH + fontSize * 0.7;
    ctx.font = `bold ${fontSize * 0.85}px ${FONT_BODY}`;
    ctx.textBaseline = 'middle';

    // Mission progress (left)
    const progress = getMissionProgress(this);
    const label = getMissionLabel(this.level);
    ctx.textAlign = 'left';
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText(`${label}: ${progress} / ${this.missionTarget}`, pad, subY);

    // Stars (right)
    const stars = calcStars(progress, this.missionTarget);
    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;
    for (let s = 0; s < 3; s++) {
      const starX = canvasW - pad - (2 - s) * fontSize * 0.9;
      ctx.textAlign = 'center';
      ctx.fillStyle = s < stars ? rgb(COL.gold) : rgb(COL.textDim, 0.4);
      ctx.fillText('\u2605', starX, subY);
    }
  },

  // --- Game Render ---
  renderGame() {
    Renderer.drawBackground();
    this.renderHUD();

    if (this.activePowerup === PW_LASER) Renderer.ballColor = [0, 212, 255];
    else if (this.activePowerup === PW_FIRE) Renderer.ballColor = COL.orange;
    else Renderer.ballColor = COL.green;

    Renderer.drawBlocks();
    Renderer.drawPickups();
    Renderer.drawBalls();
    Renderer.drawParticles();

    if (this.state === STATE.AIMING) {
      if (Input.isAiming) {
        Renderer.drawAimLine(Input.launchX, Input.launchY, Input.aimDirX, Input.aimDirY);
      }
      Renderer.drawLaunchPoint(Input.launchX, Input.launchY, this.ballCount);
    }

    if (this.state === STATE.AIMING) {
      Renderer.drawPowerupBar(this.activePowerup);
    }
  },

  // --- Game Over Overlay ---
  renderGameOver() {
    // Dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const centerY = canvasH * 0.35;

    // Title
    ctx.font = `bold ${canvasW * 0.1}px ${FONT_TITLE}`;
    ctx.fillStyle = rgb(COL.red);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', canvasW / 2, centerY);

    // Subtitle
    ctx.font = `bold ${canvasW * 0.04}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText('Mission Failed', canvasW / 2, centerY + canvasH * 0.045);

    // Score
    ctx.font = `bold ${canvasW * 0.05}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.fillText('Score: ' + this.score, canvasW / 2, centerY + canvasH * 0.08);

    // Turns survived
    ctx.font = `bold ${canvasW * 0.04}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText('Turns: ' + this.turn, canvasW / 2, centerY + canvasH * 0.14);

    // Retry button
    const btnW = canvasW * 0.55;
    const btnH = canvasH * 0.065;
    const btnX = (canvasW - btnW) / 2;
    const retryY = canvasH * 0.58;
    this.drawButton('RETRY', btnX, retryY, btnW, btnH, COL.green);

    if (Input.tapped || Input.aimReleased) {
      if (Input.hitTestRect(btnX, retryY, btnW, btnH)) {
        Input.consumeTap();
        Input.consumeRelease();
        this.startLevel(this.level);
        return;
      }
    }

    // Levels button
    const levelsY = retryY + btnH * 1.6;
    this.drawButton('LEVELS', btnX, levelsY, btnW, btnH, COL.blue);

    if (Input.tapped || Input.aimReleased) {
      if (Input.hitTestRect(btnX, levelsY, btnW, btnH)) {
        Input.consumeTap();
        Input.consumeRelease();
        Game.state = STATE.LEVEL_SELECT;
        LevelSelect.scrollY = 0;
        return;
      }
    }

    // Consume remaining
    if (Input.tapped) Input.consumeTap();
    if (Input.aimReleased) Input.consumeRelease();
  },

  // --- Level Complete Overlay ---
  renderLevelComplete() {
    // Dim overlay (darker)
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const centerY = canvasH * 0.25;

    // Title
    ctx.font = `bold ${canvasW * 0.08}px ${FONT_TITLE}`;
    ctx.fillStyle = rgb(COL.green);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL COMPLETE', canvasW / 2, centerY);

    // Stars
    const progress = getMissionProgress(this);
    const stars = calcStars(progress, this.missionTarget);
    const starSize = canvasW * 0.12;
    ctx.font = `${starSize}px ${FONT_BODY}`;
    const starY = centerY + canvasH * 0.1;
    for (let s = 0; s < 3; s++) {
      const starX = canvasW / 2 + (s - 1) * starSize * 1.1;
      ctx.fillStyle = s < stars ? rgb(COL.gold) : rgb(COL.textDim, 0.3);
      ctx.fillText('\u2605', starX, starY);
    }

    // Score
    ctx.font = `bold ${canvasW * 0.05}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.fillText('Score: ' + this.score, canvasW / 2, starY + canvasH * 0.08);

    // Turns
    ctx.font = `bold ${canvasW * 0.04}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText(`Turns: ${this.turn} / ${this.missionTarget}`, canvasW / 2, starY + canvasH * 0.14);

    // Next Level button
    const btnW = canvasW * 0.55;
    const btnH = canvasH * 0.065;
    const btnX = (canvasW - btnW) / 2;
    const nextY = canvasH * 0.62;

    if (this.level < TOTAL_LEVELS - 1) {
      this.drawButton('NEXT LEVEL', btnX, nextY, btnW, btnH, COL.green);

      if (Input.tapped || Input.aimReleased) {
        if (Input.hitTestRect(btnX, nextY, btnW, btnH)) {
          Input.consumeTap();
          Input.consumeRelease();
          this.startLevel(this.level + 1);
          return;
        }
      }
    }

    // Replay button
    const retryY = nextY + btnH * 1.6;
    this.drawButton('REPLAY', btnX, retryY, btnW, btnH, COL.blue);

    if (Input.tapped || Input.aimReleased) {
      if (Input.hitTestRect(btnX, retryY, btnW, btnH)) {
        Input.consumeTap();
        Input.consumeRelease();
        this.startLevel(this.level);
        return;
      }
    }

    // Menu button
    const menuY = retryY + btnH * 1.6;
    this.drawButton('MENU', btnX, menuY, btnW, btnH, COL.textDim);

    if (Input.tapped || Input.aimReleased) {
      if (Input.hitTestRect(btnX, menuY, btnW, btnH)) {
        Input.consumeTap();
        Input.consumeRelease();
        this.state = STATE.MENU;
        return;
      }
    }

    // Consume remaining
    if (Input.tapped) Input.consumeTap();
    if (Input.aimReleased) Input.consumeRelease();
  }
};
