const Renderer = {
  // Convert unit coords to canvas pixels (relative to field)
  ux(units) { return fieldRect.x + units * scale; },
  uy(units) { return fieldRect.y + units * scale; },
  us(units) { return units * scale; },

  drawBackground() {
    ctx.fillStyle = rgb(COL.bgDark);
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Field area (slightly different shade)
    if (fieldRect) {
      ctx.fillStyle = rgb([12, 12, 24]);
      ctx.fillRect(fieldRect.x, fieldRect.y, FIELD_WIDTH * scale, FIELD_HEIGHT * scale);

      // Field border
      ctx.strokeStyle = rgb(COL.borderDim);
      ctx.lineWidth = 1;
      ctx.strokeRect(fieldRect.x, fieldRect.y, FIELD_WIDTH * scale, FIELD_HEIGHT * scale);
    }
  },

  drawBlock(i) {
    if (!blockActive[i]) return;

    const px = this.ux(blockX[i]);
    const py = this.uy(blockY[i]);
    const pw = this.us(BLOCK_SIZE);
    const ph = this.us(BLOCK_SIZE);
    const radius = this.us(0.1);

    const type = blockType[i];
    const color = blockColor(blockHP[i], type);

    // Apply rotation if hit
    const rot = blockRotation[i];
    if (rot !== 0) {
      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate(rot);
      ctx.translate(-(px + pw / 2), -(py + ph / 2));
    }

    // Block fill
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, radius);
    ctx.fillStyle = rgb(color);
    ctx.fill();

    // Glow border
    ctx.strokeStyle = rgb(color, 0.5);
    ctx.lineWidth = this.us(0.03);
    ctx.stroke();

    // White flash overlay
    if (blockFlashTimer[i] > 0) {
      const flash = blockFlashTimer[i] / BLOCK_FLASH_DURATION;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, radius);
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`;
      ctx.fill();
    }

    // Type indicator (top-left corner)
    const indSize = this.us(0.22);
    ctx.font = `bold ${indSize}px ${FONT_BODY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (type === BLOCK_EXPLOSIVE) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('!', px + this.us(0.08), py + this.us(0.02));
    } else if (type === BLOCK_STONE && blockArmor[i] > 0) {
      ctx.fillStyle = 'rgba(200,200,220,0.9)';
      ctx.fillText(blockArmor[i], px + this.us(0.06), py + this.us(0.02));
    } else if (type === BLOCK_MOVING) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(blockMoveDir[i] > 0 ? '\u2192' : '\u2190', px + this.us(0.04), py + this.us(0.02));
    }

    // HP text
    const hp = blockHP[i];
    const fontSize = hp >= 100 ? this.us(0.28) : this.us(0.35);
    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;
    ctx.fillStyle = color === COL.green ? rgb(COL.textDark) : rgb(COL.textWhite);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hp, px + pw / 2, py + ph / 2 + this.us(0.05));

    if (rot !== 0) ctx.restore();
  },

  drawBlocks() {
    for (let i = 0; i < MAX_BLOCKS; i++) {
      this.drawBlock(i);
    }
  },

  drawPickup(i) {
    if (!pickupActive[i]) return;

    const px = this.ux(pickupX[i]);
    const py = this.uy(pickupY[i]);
    const r = this.us(BLOCK_SIZE * 0.2);

    // Outer glow
    ctx.beginPath();
    ctx.arc(px, py, r * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green, 0.15);
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green);
    ctx.fill();

    // "+" text
    ctx.font = `bold ${this.us(0.25)}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDark);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', px, py);
  },

  drawPickups() {
    for (let i = 0; i < MAX_PICKUPS; i++) {
      this.drawPickup(i);
    }
  },

  drawBall(i) {
    if (!ballActive[i]) return;

    const px = this.ux(ballX[i]);
    const py = this.uy(ballY[i]);
    const r = this.us(BALL_RADIUS);

    const ballCol = this.ballColor || COL.green;

    // Trail
    ctx.lineCap = 'round';
    for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
      const alpha = (1 - t / TRAIL_LENGTH) * 0.6;
      const width = TRAIL_MAX_WIDTH * (1 - t / TRAIL_LENGTH);
      ctx.beginPath();
      ctx.moveTo(this.ux(ballTrailX[i][t]), this.uy(ballTrailY[i][t]));
      ctx.lineTo(this.ux(ballTrailX[i][t + 1]), this.uy(ballTrailY[i][t + 1]));
      ctx.strokeStyle = rgb(ballCol, alpha);
      ctx.lineWidth = this.us(width);
      ctx.stroke();
    }

    // Ball glow
    ctx.beginPath();
    ctx.arc(px, py, r * 2, 0, Math.PI * 2);
    ctx.fillStyle = rgb(ballCol, 0.2);
    ctx.fill();

    // Ball
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = rgb(ballCol);
    ctx.fill();
  },

  drawBalls() {
    for (let i = 0; i < MAX_BALLS; i++) {
      this.drawBall(i);
    }
  },

  drawParticles() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!partActive[i]) continue;
      const alpha = partLife[i] / partMaxLife[i];
      const r = this.us(0.06);
      ctx.beginPath();
      ctx.arc(this.ux(partX[i]), this.uy(partY[i]), r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${partR[i]},${partG[i]},${partB[i]},${alpha})`;
      ctx.fill();
    }
  },

  drawAimLine(launchX, launchY, dirX, dirY) {
    if (dirX === 0 && dirY === 0) return;

    const dashLen = 0.2;
    const gapLen = 0.15;
    const maxBounces = 3;
    const maxDist = 30;

    let x = launchX, y = launchY;
    let dx = dirX, dy = dirY;
    let dist = 0;
    let bounces = 0;
    let segDist = 0;
    let inDash = true;

    ctx.strokeStyle = rgb(COL.green, 0.4);
    ctx.lineWidth = this.us(0.04);
    ctx.beginPath();
    ctx.moveTo(this.ux(x), this.uy(y));

    const step = 0.05;
    while (dist < maxDist && bounces <= maxBounces) {
      const nx = x + dx * step;
      const ny = y + dy * step;

      // Wall bounces
      if (nx - BALL_RADIUS < 0 || nx + BALL_RADIUS > FIELD_WIDTH) {
        dx = -dx;
        bounces++;
        continue;
      }
      // Ceiling bounce
      if (ny - BALL_RADIUS < 0) {
        dy = -dy;
        bounces++;
        continue;
      }

      x = nx;
      y = ny;
      dist += step;
      segDist += step;

      if (inDash) {
        ctx.lineTo(this.ux(x), this.uy(y));
        if (segDist >= dashLen) { inDash = false; segDist = 0; }
      } else {
        ctx.moveTo(this.ux(x), this.uy(y));
        if (segDist >= gapLen) { inDash = true; segDist = 0; }
      }
    }
    ctx.stroke();
  },

  // Ball count display at launch point
  drawLaunchPoint(launchX, launchY, ballCount) {
    const px = this.ux(launchX);
    const py = this.uy(launchY);

    ctx.font = `bold ${this.us(0.4)}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.green);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×' + ballCount, px, py + this.us(0.5));
  },

  drawPowerupBar(activePowerup) {
    const barH = canvasH * 0.06;
    const barY = canvasH - barH - canvasH * 0.01;
    const btnW = (canvasW * 0.88) / POWERUP_COUNT;
    const gap = canvasW * 0.01;
    const startX = (canvasW - (btnW * POWERUP_COUNT + gap * (POWERUP_COUNT - 1))) / 2;

    for (let p = 0; p < POWERUP_COUNT; p++) {
      const x = startX + p * (btnW + gap);
      const count = powerupInventory[p];
      const isActive = activePowerup === p;
      const color = PW_COLORS[p];
      const isEmpty = count <= 0;

      ctx.beginPath();
      ctx.roundRect(x, barY, btnW, barH, barH * 0.3);

      if (isEmpty) {
        ctx.fillStyle = rgb(COL.bgCard);
        ctx.fill();
        ctx.strokeStyle = rgb(COL.borderDim);
      } else if (isActive) {
        ctx.fillStyle = rgb(color, 0.3);
        ctx.fill();
        ctx.strokeStyle = rgb(color);
      } else {
        ctx.fillStyle = rgb(color, 0.12);
        ctx.fill();
        ctx.strokeStyle = rgb(color, 0.5);
      }
      ctx.lineWidth = isActive ? 2.5 : 1;
      ctx.stroke();

      const nameSize = barH * 0.28;
      ctx.font = `bold ${nameSize}px ${FONT_BODY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isEmpty ? rgb(COL.textDim, 0.4) : rgb(color);
      ctx.fillText(PW_NAMES[p], x + btnW / 2, barY + barH * 0.38);

      ctx.font = `bold ${barH * 0.32}px ${FONT_BODY}`;
      ctx.fillStyle = isEmpty ? rgb(COL.textDim, 0.3) : rgb(COL.textWhite);
      ctx.fillText(count, x + btnW / 2, barY + barH * 0.72);
    }

    return { barY, barH, btnW, gap, startX };
  }
};
