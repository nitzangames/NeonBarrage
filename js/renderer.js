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

    const color = blockColor(blockHP[i]);

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

    // HP text
    const hp = blockHP[i];
    const fontSize = hp >= 100 ? this.us(0.28) : this.us(0.35);
    ctx.font = `bold ${fontSize}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.textDark);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hp, px + pw / 2, py + ph / 2);
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

    // Trail
    ctx.lineCap = 'round';
    for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
      const alpha = (1 - t / TRAIL_LENGTH) * 0.6;
      const width = TRAIL_MAX_WIDTH * (1 - t / TRAIL_LENGTH);
      ctx.beginPath();
      ctx.moveTo(this.ux(ballTrailX[i][t]), this.uy(ballTrailY[i][t]));
      ctx.lineTo(this.ux(ballTrailX[i][t + 1]), this.uy(ballTrailY[i][t + 1]));
      ctx.strokeStyle = rgb(COL.green, alpha);
      ctx.lineWidth = this.us(width);
      ctx.stroke();
    }

    // Ball glow
    ctx.beginPath();
    ctx.arc(px, py, r * 2, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green, 0.2);
    ctx.fill();

    // Ball
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green);
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
  }
};
