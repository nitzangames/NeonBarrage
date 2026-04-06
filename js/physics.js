const Physics = {
  // Track last-hit block per ball to prevent double-damage in same sub-step
  lastHitBlock: new Int32Array(MAX_BALLS),

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
        } else if (ballX[i] + BALL_RADIUS > FIELD_WIDTH) {
          ballX[i] = FIELD_WIDTH - BALL_RADIUS;
          ballVX[i] = -Math.abs(ballVX[i]);
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

    for (let i = 0; i < MAX_BLOCKS; i++) {
      if (!blockActive[i]) continue;
      if (this.lastHitBlock[ballIdx] === i) continue;

      // Block rect
      const rx = blockX[i];
      const ry = blockY[i];
      const rw = BLOCK_SIZE;
      const rh = BLOCK_SIZE;

      // Closest point on rect to ball center
      const cx = Math.max(rx, Math.min(bx, rx + rw));
      const cy = Math.max(ry, Math.min(by, ry + rh));

      const dx = bx - cx;
      const dy = by - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < BALL_RADIUS * BALL_RADIUS) {
        // Hit! Determine reflection direction
        this.lastHitBlock[ballIdx] = i;

        // Overlap amounts
        const overlapX = (BALL_RADIUS + rw / 2) - Math.abs(bx - (rx + rw / 2));
        const overlapY = (BALL_RADIUS + rh / 2) - Math.abs(by - (ry + rh / 2));

        if (overlapX < overlapY) {
          ballVX[ballIdx] = -ballVX[ballIdx];
          // Push out
          if (bx < rx + rw / 2) ballX[ballIdx] = rx - BALL_RADIUS;
          else ballX[ballIdx] = rx + rw + BALL_RADIUS;
        } else {
          ballVY[ballIdx] = -ballVY[ballIdx];
          if (by < ry + rh / 2) ballY[ballIdx] = ry - BALL_RADIUS;
          else ballY[ballIdx] = ry + rh + BALL_RADIUS;
        }

        // Damage
        blockHP[i]--;
        blockFlashTimer[i] = BLOCK_FLASH_DURATION;
        gameState.score++;

        if (blockHP[i] <= 0) {
          // Destroy block
          blockActive[i] = 0;
          gameState.score++; // bonus for destroy
          gameState.blocksDestroyed++;

          // Spawn particles
          const color = blockColor(blockMaxHP[i]);
          spawnParticles(
            blockX[i] + BLOCK_SIZE / 2,
            blockY[i] + BLOCK_SIZE / 2,
            DESTROY_PARTICLE_COUNT,
            DESTROY_PARTICLE_SPEED,
            DESTROY_PARTICLE_LIFE,
            color[0], color[1], color[2]
          );
        }

        break; // One collision per sub-step per ball
      }
    }
  },

  checkPickupCollection(ballIdx, gameState) {
    const bx = ballX[ballIdx];
    const by = ballY[ballIdx];

    for (let i = 0; i < MAX_PICKUPS; i++) {
      if (!pickupActive[i]) continue;

      const dx = bx - pickupX[i];
      const dy = by - pickupY[i];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PICKUP_COLLECT_RADIUS) {
        pickupActive[i] = 0;
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

  // Update block flash timers
  updateBlockFlash(dt) {
    for (let i = 0; i < MAX_BLOCKS; i++) {
      if (blockFlashTimer[i] > 0) {
        blockFlashTimer[i] = Math.max(0, blockFlashTimer[i] - dt);
      }
    }
  }
};
