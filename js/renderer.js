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

    // Type-specific decorations (drawn before border/flash)
    if (type === BLOCK_EXPLOSIVE) {
      // Hazard stripes
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, radius);
      ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = this.us(0.06);
      const stripeGap = this.us(0.18);
      for (let s = -pw; s < pw * 2; s += stripeGap) {
        ctx.beginPath();
        ctx.moveTo(px + s, py);
        ctx.lineTo(px + s + pw, py + ph);
        ctx.stroke();
      }
      ctx.restore();
    } else if (type === BLOCK_STONE) {
      // Chevron pattern pointing down
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, radius);
      ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = this.us(0.025);
      const chevGap = this.us(0.2);
      for (let cy = py - chevGap; cy < py + ph + chevGap; cy += chevGap) {
        ctx.beginPath();
        ctx.moveTo(px, cy);
        ctx.lineTo(px + pw / 2, cy + chevGap * 0.6);
        ctx.lineTo(px + pw, cy);
        ctx.stroke();
      }
      ctx.restore();
    } else if (type === BLOCK_MOVING) {
      // Side arrows ◄►
      const arrSize = this.us(0.12);
      const arrInset = this.us(0.1);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      // Left arrow
      ctx.beginPath();
      ctx.moveTo(px + arrInset, py + ph / 2);
      ctx.lineTo(px + arrInset + arrSize, py + ph / 2 - arrSize);
      ctx.lineTo(px + arrInset + arrSize, py + ph / 2 + arrSize);
      ctx.fill();
      // Right arrow
      ctx.beginPath();
      ctx.moveTo(px + pw - arrInset, py + ph / 2);
      ctx.lineTo(px + pw - arrInset - arrSize, py + ph / 2 - arrSize);
      ctx.lineTo(px + pw - arrInset - arrSize, py + ph / 2 + arrSize);
      ctx.fill();
    }

    // Glow border
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, radius);
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
    ctx.fillStyle = color === COL.green ? rgb(COL.textDark) : rgb(COL.textWhite);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hp, px + pw / 2, py + ph / 2);

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

  // Ball launcher — glowing circle with crosshair and count
  drawLaunchPoint(launchX, launchY, ballCount) {
    const px = this.ux(launchX);
    const py = this.uy(launchY);
    const outerR = this.us(0.35);
    const innerR = this.us(0.22);
    const dotR = this.us(0.07);
    const crossLen = this.us(0.18);
    const crossGap = this.us(0.1);

    // Outer glow
    ctx.beginPath();
    ctx.arc(px, py, outerR, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green, 0.1);
    ctx.fill();

    // Ring
    ctx.beginPath();
    ctx.arc(px, py, innerR, 0, Math.PI * 2);
    ctx.strokeStyle = rgb(COL.green, 0.7);
    ctx.lineWidth = this.us(0.03);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(px, py, dotR, 0, Math.PI * 2);
    ctx.fillStyle = rgb(COL.green);
    ctx.fill();

    // Crosshair lines
    ctx.strokeStyle = rgb(COL.green, 0.4);
    ctx.lineWidth = this.us(0.02);
    // Left
    ctx.beginPath(); ctx.moveTo(px - crossLen, py); ctx.lineTo(px - crossGap, py); ctx.stroke();
    // Right
    ctx.beginPath(); ctx.moveTo(px + crossGap, py); ctx.lineTo(px + crossLen, py); ctx.stroke();
    // Up
    ctx.beginPath(); ctx.moveTo(px, py - crossLen); ctx.lineTo(px, py - crossGap); ctx.stroke();
    // Down
    ctx.beginPath(); ctx.moveTo(px, py + crossGap); ctx.lineTo(px, py + crossLen); ctx.stroke();

    // Ball count
    ctx.font = `bold ${this.us(0.35)}px ${FONT_BODY}`;
    ctx.fillStyle = rgb(COL.green);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×' + ballCount, px, py + this.us(0.55));
  },

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

    // Contents — 3-column grid
    ctx.font = `bold ${fs * 0.75}px ${FONT_BODY}`;
    const items = [];
    for (let i = 0; i < POWERUP_COUNT; i++) {
      if (pack.items[i] > 0) items.push(i);
    }
    const cols = Math.min(3, items.length);
    const gridRows = Math.ceil(items.length / cols);
    const cellW = w * 0.3;
    const rowH = fs * 1.2;
    const gridStartY = y + h * 0.32;
    const gridStartX = midX - (cols * cellW) / 2;
    for (let idx = 0; idx < items.length; idx++) {
      const i = items[idx];
      const gc = idx % cols;
      const gr = Math.floor(idx / cols);
      const cx = gridStartX + gc * cellW + cellW / 2;
      const cy = gridStartY + gr * rowH;
      ctx.fillStyle = rgb(PW_COLORS[i]);
      ctx.fillText(`${pack.items[i]}× ${PW_NAMES[i]}`, cx, cy);
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

  drawPowerupBar(activePowerup, faded) {
    if (faded) ctx.globalAlpha = 0.3;
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

    if (faded) ctx.globalAlpha = 1;
    return { barY, barH, btnW, gap, startX };
  }
};
