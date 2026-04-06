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
    const gridTop = canvasH * 0.12;
    const gridHeight = rows * (cellH + gap);
    this.maxScroll = Math.max(0, gridHeight - (canvasH * 0.78));

    // Save context for clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, gridTop, canvasW, canvasH * 0.78);
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
    ctx.fillText(`${totalStars} / ${maxStars} \u2605`, canvasW / 2, barY + barH + canvasH * 0.025);

    // Back button
    const backW = canvasW * 0.2;
    const backH = canvasH * 0.045;
    const backX = canvasW * 0.05;
    const backY = canvasH * 0.03;
    Game.drawButton('BACK', backX, backY, backW, backH, COL.textDim, canvasH * 0.02);

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

  // --- Button Helper ---
  drawButton(text, x, y, w, h, color, fontSize) {
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

    clearAllPools();
    Physics.resetLastHit();

    // Reset launch position
    Input.launchX = FIELD_WIDTH / 2;
    Input.launchY = FIELD_HEIGHT + LAUNCH_AREA_HEIGHT * 0.3;
    Input.isAiming = false;
    Input.aimReleased = false;
    Input.tapped = false;

    // Spawn first row
    spawnRow(0, this.turn);

    this.state = STATE.AIMING;
  },

  // --- Update ---
  update(dt) {
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

    // Always update particles and flash
    Physics.updateParticles(dt);
    Physics.updateBlockFlash(dt);
  },

  updateAiming(dt) {
    // Cache aim state before updateAim clears aimReleased
    const wasAiming = Input.isAiming;
    const released = Input.aimReleased;

    Input.updateAim();

    if (released && wasAiming) {
      // Start launching
      this.ballsToLaunch = this.ballCount;
      this.launchTimer = 0;
      this.state = STATE.LAUNCHING;
      Input.isAiming = false;
    }
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
    const stars = calcStars(this.turn, this.missionTarget);
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

    // Shift blocks down
    shiftBlocksDown();

    // Check game over
    if (checkGameOver()) {
      const stars = calcStars(this.turn, this.missionTarget);
      if (stars >= 1) {
        this.completeMission();
      } else {
        this.state = STATE.GAME_OVER;
      }
      return;
    }

    // Increment turn, spawn new row
    this.turn++;
    spawnRow(0, this.turn);
    Physics.resetLastHit();

    this.state = STATE.AIMING;
  },

  completeMission() {
    const stars = calcStars(this.turn, this.missionTarget);

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
    ctx.fillText('NEON', canvasW / 2, canvasH * 0.28);
    ctx.fillText('BARRAGE', canvasW / 2, canvasH * 0.28 + titleSize * 1.2);

    // Subtitle
    ctx.font = `bold ${canvasW * 0.035}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDim);
    ctx.fillText('BLOCK BREAKER', canvasW / 2, canvasH * 0.28 + titleSize * 2.5);

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
      ctx.fillText('BEST: ' + saveData.bestScore, canvasW / 2, canvasH * 0.82);
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

    const textY = hudY + hudH / 2;
    const pad = canvasW * 0.04;
    const fontSize = canvasW * 0.035;

    // Level + Turn (left)
    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDim);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`LVL ${this.level + 1}`, pad, textY - fontSize * 0.6);
    ctx.fillStyle = rgb(COL.textWhite);
    ctx.fillText(`Turn ${this.turn}`, pad, textY + fontSize * 0.6);

    // Score (center)
    ctx.font = `bold ${fontSize * 1.2}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.green);
    ctx.textAlign = 'center';
    ctx.fillText(this.score, canvasW / 2, textY);

    // Mission progress (right)
    const stars = calcStars(this.turn, this.missionTarget);
    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;
    ctx.textAlign = 'right';

    // Stars display
    for (let s = 0; s < 3; s++) {
      const starX = canvasW - pad - (2 - s) * fontSize * 1.1;
      const starY = textY - fontSize * 0.6;
      ctx.fillStyle = s < stars ? rgb(COL.gold) : rgb(COL.textDim, 0.4);
      ctx.fillText('\u2605', starX, starY);
    }

    // Target text
    ctx.fillStyle = rgb(COL.textDim);
    ctx.textAlign = 'right';
    ctx.fillText(`${this.turn}/${this.missionTarget}`, canvasW - pad, textY + fontSize * 0.6);
  },

  // --- Game Render ---
  renderGame() {
    Renderer.drawBackground();
    this.renderHUD();
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
    this.drawButton('RETRY', btnX, retryY, btnW, btnH, COL.orange);

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
  },

  // --- Level Complete Overlay ---
  renderLevelComplete() {
    // Dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const centerY = canvasH * 0.25;

    // Title
    ctx.font = `bold ${canvasW * 0.08}px ${FONT_TITLE}`;
    ctx.fillStyle = rgb(COL.green);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL COMPLETE', canvasW / 2, centerY);

    // Stars
    const stars = calcStars(this.turn, this.missionTarget);
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

    // Retry button
    const retryY = nextY + btnH * 1.6;
    this.drawButton('RETRY', btnX, retryY, btnW, btnH, COL.orange);

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
