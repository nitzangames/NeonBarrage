const Physics = {
  // Track last-hit block per ball to prevent double-damage in same sub-step
  lastHitBlock: new Int32Array(MAX_BALLS),
  wallBounceCount: 0,

  resetLastHit() {
    this.lastHitBlock.fill(-1);
  },

  // Update all active balls by dt seconds. Returns number of balls still active.
  update(dt, gameState) {
    let activeBalls = 0;
    const totalDist = BALL_SPEED * dt;
    const steps = Math.max(1, Math.ceil(totalDist / SUB_STEP));
    const stepDist = totalDist / steps;

    for (let i = 0; i < MAX_BALLS; i++) {
      if (!ballActive[i]) continue;

      // Update trail: shift positions
      for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
        ballTrailX[i][t] = ballTrailX[i][t - 1];
        ballTrailY[i][t] = ballTrailY[i][t - 1];
      }
      ballTrailX[i][0] = ballX[i];
      ballTrailY[i][0] = ballY[i];

      for (let s = 0; s < steps; s++) {
        this.lastHitBlock[i] = -1;
        const speed = Math.sqrt(ballVX[i] * ballVX[i] + ballVY[i] * ballVY[i]);
        if (speed < 0.001) { ballActive[i] = 0; break; }

        const nx = ballVX[i] / speed;
        const ny = ballVY[i] / speed;
        ballX[i] += nx * stepDist;
        ballY[i] += ny * stepDist;

        // Wall collisions
        if (ballX[i] - BALL_RADIUS < 0) {
          ballX[i] = BALL_RADIUS;
          ballVX[i] = Math.abs(ballVX[i]);
          this.wallBounceCount++;
          if (this.wallBounceCount % 3 === 0) Audio.wallBounce();
        } else if (ballX[i] + BALL_RADIUS > FIELD_WIDTH) {
          ballX[i] = FIELD_WIDTH - BALL_RADIUS;
          ballVX[i] = -Math.abs(ballVX[i]);
          this.wallBounceCount++;
          if (this.wallBounceCount % 3 === 0) Audio.wallBounce();
        }

        // Ceiling collision
        if (ballY[i] - BALL_RADIUS < 0) {
          ballY[i] = BALL_RADIUS;
          ballVY[i] = Math.abs(ballVY[i]);
        }

        // Floor — ball returned
        if (ballY[i] > FIELD_HEIGHT + LAUNCH_AREA_HEIGHT) {
          ballActive[i] = 0;
          break;
        }

        // Block collisions
        this.checkBlockCollisions(i, gameState);

        // Pickup collection
        this.checkPickupCollection(i, gameState);
      }

      if (ballActive[i]) activeBalls++;
    }

    return activeBalls;
  },

  checkBlockCollisions(ballIdx, gameState) {
    const bx = ballX[ballIdx];
    const by = ballY[ballIdx];
    const isLaser = gameState.activePowerup === PW_LASER;
    const isFire = gameState.activePowerup === PW_FIRE;
    const damage = isFire ? 2 : 1;

    for (let i = 0; i < MAX_BLOCKS; i++) {
      if (!blockActive[i]) continue;
      if (this.lastHitBlock[ballIdx] === i) continue;

      const rx = blockX[i];
      const ry = blockY[i];
      const rw = BLOCK_SIZE;
      const rh = BLOCK_SIZE;

      const cx = Math.max(rx, Math.min(bx, rx + rw));
      const cy = Math.max(ry, Math.min(by, ry + rh));

      const dx = bx - cx;
      const dy = by - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < BALL_RADIUS * BALL_RADIUS) {
        this.lastHitBlock[ballIdx] = i;

        // Stone block with armor: deflect straight down, reduce armor
        if (blockType[i] === BLOCK_STONE && blockArmor[i] > 0) {
          blockArmor[i]--;
          blockFlashTimer[i] = BLOCK_FLASH_DURATION;
          Audio.ballHit();
          Audio.vibrateLight();
          ballVX[ballIdx] = 0;
          ballVY[ballIdx] = BALL_SPEED;
          ballY[ballIdx] = ry + rh + BALL_RADIUS;
          if (!isLaser) break;
          continue;
        }

        // Reflection (skip for laser — laser pierces)
        if (!isLaser) {
          const overlapX = (BALL_RADIUS + rw / 2) - Math.abs(bx - (rx + rw / 2));
          const overlapY = (BALL_RADIUS + rh / 2) - Math.abs(by - (ry + rh / 2));

          if (overlapX < overlapY) {
            ballVX[ballIdx] = -ballVX[ballIdx];
            if (bx < rx + rw / 2) ballX[ballIdx] = rx - BALL_RADIUS;
            else ballX[ballIdx] = rx + rw + BALL_RADIUS;
          } else {
            ballVY[ballIdx] = -ballVY[ballIdx];
            if (by < ry + rh / 2) ballY[ballIdx] = ry - BALL_RADIUS;
            else ballY[ballIdx] = ry + rh + BALL_RADIUS;
          }
        }

        // Damage
        blockHP[i] -= damage;
        blockFlashTimer[i] = BLOCK_FLASH_DURATION;
        blockRotation[i] = (Math.random() < 0.5 ? -1 : 1) * BLOCK_HIT_ROTATION;
        gameState.score += damage;
        triggerShake(SHAKE_HIT_DURATION, SHAKE_HIT_MAGNITUDE);
        Audio.ballHit();
        Audio.vibrateLight();

        if (blockHP[i] <= 0) {
          this.destroyBlock(i, gameState);
          triggerShake(SHAKE_DESTROY_DURATION, SHAKE_DESTROY_MAGNITUDE);
        }

        if (!isLaser) break;
      }
    }
  },

  destroyBlock(i, gameState) {
    blockActive[i] = 0;
    gameState.score++;
    gameState.blocksDestroyed++;
    if (gameState.blocksThisTurn !== undefined) gameState.blocksThisTurn++;

    const color = blockColor(blockMaxHP[i], blockType[i]);
    spawnParticles(
      blockX[i] + BLOCK_SIZE / 2,
      blockY[i] + BLOCK_SIZE / 2,
      DESTROY_PARTICLE_COUNT,
      DESTROY_PARTICLE_SPEED,
      DESTROY_PARTICLE_LIFE,
      color[0], color[1], color[2]
    );
    Audio.blockDestroyed();
    Audio.vibrateMedium();

    if (blockType[i] === BLOCK_EXPLOSIVE) {
      this.explodeAdjacent(i, gameState);
    }
  },

  explodeAdjacent(srcIdx, gameState) {
    const row = blockRow[srcIdx];
    const col = blockCol[srcIdx];

    for (let i = 0; i < MAX_BLOCKS; i++) {
      if (!blockActive[i]) continue;
      const dr = Math.abs(blockRow[i] - row);
      const dc = Math.abs(blockCol[i] - col);
      if (dr <= 1 && dc <= 1 && (dr + dc) > 0) {
        blockActive[i] = 0;
        gameState.score++;
        gameState.blocksDestroyed++;
        if (gameState.blocksThisTurn !== undefined) gameState.blocksThisTurn++;

        const color = blockColor(blockMaxHP[i], blockType[i]);
        spawnParticles(
          blockX[i] + BLOCK_SIZE / 2,
          blockY[i] + BLOCK_SIZE / 2,
          DESTROY_PARTICLE_COUNT,
          DESTROY_PARTICLE_SPEED,
          DESTROY_PARTICLE_LIFE,
          color[0], color[1], color[2]
        );

        if (blockType[i] === BLOCK_EXPLOSIVE) {
          this.explodeAdjacent(i, gameState);
        }
      }
    }
  },

  checkPickupCollection(ballIdx, gameState) {
    const bx = ballX[ballIdx];
    const by = ballY[ballIdx];

    for (let i = 0; i < MAX_PICKUPS; i++) {
      if (!pickupActive[i] || pickupFalling[i]) continue;

      const dx = bx - pickupX[i];
      const dy = by - pickupY[i];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PICKUP_COLLECT_RADIUS) {
        pickupActive[i] = 0;
        Audio.pickupCollected();
        Audio.vibrateMedium();
        gameState.ballCount += PICKUP_BALL_BONUS;
        gameState.pickupsCollected++;
      }
    }
  },

  // Update particles
  updateParticles(dt) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!partActive[i]) continue;
      partX[i] += partVX[i] * dt;
      partY[i] += partVY[i] * dt;
      partLife[i] -= dt;
      if (partLife[i] <= 0) partActive[i] = 0;
    }
  },

  // Update falling pickups (magnet effect)
  updateFallingPickups(dt) {
    for (let i = 0; i < MAX_PICKUPS; i++) {
      if (!pickupActive[i] || !pickupFalling[i]) continue;
      pickupVY[i] += 25 * dt; // gravity acceleration
      pickupY[i] += pickupVY[i] * dt;
      if (pickupY[i] > FIELD_HEIGHT + LAUNCH_AREA_HEIGHT + 1) {
        pickupActive[i] = 0;
        pickupFalling[i] = 0;
      }
    }
  },

  // Update block flash timers and rotation decay
  updateBlockFlash(dt) {
    for (let i = 0; i < MAX_BLOCKS; i++) {
      if (blockFlashTimer[i] > 0) {
        blockFlashTimer[i] = Math.max(0, blockFlashTimer[i] - dt);
      }
      if (blockRotation[i] !== 0) {
        blockRotation[i] *= Math.max(0, 1 - dt * 12); // fast decay
        if (Math.abs(blockRotation[i]) < 0.005) blockRotation[i] = 0;
      }
    }
  }
};
