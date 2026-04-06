const Input = {
  // Current pointer state
  isDown: false,
  pointerX: 0,
  pointerY: 0,

  // Aim direction (unit vector, 0,0 if not aiming)
  aimDirX: 0,
  aimDirY: 0,
  isAiming: false,
  aimReleased: false,

  // Tap detection (for menu buttons)
  tapX: 0,
  tapY: 0,
  tapTime: 0,
  tapped: false,

  // Launch point in units
  launchX: FIELD_WIDTH / 2,
  launchY: FIELD_HEIGHT + LAUNCH_AREA_HEIGHT * 0.3,

  init() {
    canvas.addEventListener('mousedown', (e) => this.onDown(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseup', () => this.onUp());

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onDown(t.clientX, t.clientY);
    });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMove(t.clientX, t.clientY);
    });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onUp();
    });
  },

  onDown(clientX, clientY) {
    this.isDown = true;
    this.tapTime = performance.now();
    this.updatePointer(clientX, clientY);
    this.tapX = this.pointerX;
    this.tapY = this.pointerY;
  },

  onMove(clientX, clientY) {
    if (!this.isDown) return;
    this.updatePointer(clientX, clientY);
  },

  onUp() {
    if (this.isDown) {
      const elapsed = performance.now() - this.tapTime;
      const dx = this.pointerX - this.tapX;
      const dy = this.pointerY - this.tapY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (this.isAiming) {
        this.aimReleased = true;
      }

      // Quick tap with little movement = button tap
      if (elapsed < 300 && dist < 20) {
        this.tapped = true;
      }
    }
    this.isDown = false;
  },

  updatePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    this.pointerX = clientX - rect.left;
    this.pointerY = clientY - rect.top;
  },

  // Call each frame during AIMING state to update aim direction
  updateAim() {
    this.aimReleased = false;
    this.tapped = false;

    if (!this.isDown) {
      this.isAiming = false;
      return;
    }

    // Convert pointer to unit coords
    const unitX = (this.pointerX - fieldRect.x) / scale;
    const unitY = (this.pointerY - fieldRect.y) / scale;

    let dx = unitX - this.launchX;
    let dy = unitY - this.launchY;

    // Always aim upward
    dy = -Math.abs(dy);

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;

    dx /= len;
    dy /= len;

    // Clamp minimum Y angle
    if (-dy < MIN_AIM_Y) {
      dy = -MIN_AIM_Y;
      dx = Math.sign(dx) * Math.sqrt(1 - dy * dy);
    }

    this.aimDirX = dx;
    this.aimDirY = dy;
    this.isAiming = true;
  },

  // Hit test a rectangular button (in canvas pixel coords)
  hitTestRect(x, y, w, h) {
    if (!this.tapped && !this.aimReleased) return false;
    const px = this.tapped ? this.tapX : this.pointerX;
    const py = this.tapped ? this.tapY : this.pointerY;
    return px >= x && px <= x + w && py >= y && py <= y + h;
  },

  consumeRelease() {
    this.aimReleased = false;
  },

  consumeTap() {
    this.tapped = false;
  }
};
