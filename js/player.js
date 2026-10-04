/**
 * Light-Wars: Player Character Controller
 * 2.5D Brawler hero with 8-directional smooth WASD run animations,
 * RGB laser blasters, dash, and White Light refill.
 */

class Player {
  constructor(x = 1352, y = 1502) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.radius = 20;
    this.bodyRadius = 24; // Full body width radius
    this.speed = window.LightWars.GAME_CONFIG.playerSpeed;
    this.alive = true;

    // Health
    this.maxHealth = window.LightWars.GAME_CONFIG.playerMaxHealth;
    this.health = this.maxHealth;
    this.invulnerableTimer = 0;

    // Laser Ammo Inventory (Capacity: 6 per color)
    this.maxAmmo = window.LightWars.GAME_CONFIG.maxAmmoPerType;
    this.ammo = {
      RED: 6,
      GREEN: 6,
      BLUE: 6,
      CYAN: 0,
      MAGENTA: 0,
      YELLOW: 0,
      WHITE: 0
    };

    // Active color selection
    this.colorOrder = ['RED', 'GREEN', 'BLUE', 'CYAN', 'MAGENTA', 'YELLOW'];
    this.activeColorIndex = 0; // Starts with RED

    // Shooting
    this.shootCooldown = 0;
    this.shootFaceTimer = 0;
    this.aimAngle = 0;

    // Dash
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDirX = 0;
    this.dashDirY = 0;
    this.dashGhosts = [];

    // Movement & Animation
    this.vx = 0;
    this.vy = 0;
    this.isMoving = false;
    this.facingDir = 'S';
    this.walkAnimTime = 0;
    this.idleAnimTime = 0;
    this.refillTimer = 0;
    this.isRefilling = false;
  }

  getActiveColorId() {
    return this.colorOrder[this.activeColorIndex];
  }

  getActiveColorData() {
    const id = this.getActiveColorId();
    return window.LightWars.COLORS[id];
  }

  selectColorIndex(index) {
    if (index >= 0 && index < this.colorOrder.length) {
      this.activeColorIndex = index;
    }
  }

  selectNextColor() {
    this.activeColorIndex = (this.activeColorIndex + 1) % this.colorOrder.length;
  }

  selectPrevColor() {
    this.activeColorIndex = (this.activeColorIndex - 1 + this.colorOrder.length) % this.colorOrder.length;
  }

  hasAmmo(colorId) {
    return (this.ammo[colorId] || 0) > 0;
  }

  consumeAmmo(colorId) {
    if (this.ammo[colorId] > 0) {
      this.ammo[colorId]--;
      return true;
    }
    return false;
  }

  addAmmo(colorId, count = 1) {
    if (this.ammo[colorId] !== undefined) {
      this.ammo[colorId] = Math.min(this.maxAmmo, this.ammo[colorId] + count);
    }
  }

  canAddAmmo(colorId) {
    return (this.ammo[colorId] !== undefined) && (this.ammo[colorId] < this.maxAmmo);
  }

  // Whole-body vertical capsule hitbox from feet (y - 10) to head (y - 110) with sweep support
  checkLaserHit(laser) {
    if (!this.alive) return false;
    const clampedY = Math.max(this.y - 110, Math.min(this.y - 10, laser.y));
    const dist = Math.hypot(laser.x - this.x, laser.y - clampedY);
    const hitRadius = (this.bodyRadius || 24) + laser.radius;
    if (dist < hitRadius) return true;

    // Check continuous sweep segment from prevX, prevY to laser.x, laser.y
    if (laser.prevX !== undefined && laser.prevY !== undefined) {
      const dx = laser.x - laser.prevX;
      const dy = laser.y - laser.prevY;
      const segLenSq = dx * dx + dy * dy;
      if (segLenSq > 0.001) {
        const segClampedY = Math.max(this.y - 110, Math.min(this.y - 10, (laser.prevY + laser.y) / 2));
        const t = Math.max(0, Math.min(1, ((this.x - laser.prevX) * dx + (segClampedY - laser.prevY) * dy) / segLenSq));
        const projX = laser.prevX + t * dx;
        const projY = laser.prevY + t * dy;
        const sweepDist = Math.hypot(this.x - projX, segClampedY - projY);
        if (sweepDist < hitRadius) return true;
      }
    }

    return false;
  }

  // Exact ground-contact-relative blaster muzzle offsets for all 8 directions
  static MUZZLE_OFFSETS = {
    N:  { x: -7.6,  y: -110.0 },
    NE: { x: 51.6,  y: -90.2 },
    E:  { x: 56.8,  y: -73.2 },
    SE: { x: 43.4,  y: -60.9 },
    S:  { x: 0.0,   y: -35.0 },
    SW: { x: -44.0, y: -60.9 },
    W:  { x: -56.8, y: -72.7 },
    NW: { x: -51.0, y: -89.6 }
  };

  getMuzzlePos(dir) {
    const d = dir || this.facingDir || SpriteManager.getDirection8(this.aimAngle);
    const offset = Player.MUZZLE_OFFSETS[d] || { x: 0, y: -70 };
    return {
      x: this.x + offset.x,
      y: this.y + offset.y,
      dir: d
    };
  }

  shoot(targetX, targetY) {
    if (!this.alive || this.shootCooldown > 0) return null;

    const activeColor = this.getActiveColorId();
    if (!this.consumeAmmo(activeColor)) {
      if (window.LightWars.sound) window.LightWars.sound.playEmpty();
      return null;
    }

    this.shootCooldown = window.LightWars.GAME_CONFIG.laserCooldown;

    // Face towards the target when shooting
    const aimAngle = Math.atan2(targetY - (this.y - 70), targetX - this.x);
    this.facingDir = SpriteManager.getDirection8(aimAngle);
    this.shootFaceTimer = 0.22;

    const muzzle = this.getMuzzlePos(this.facingDir);
    const angle = Math.atan2(targetY - muzzle.y, targetX - muzzle.x);
    const speed = window.LightWars.GAME_CONFIG.laserSpeed;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Spawn starting right at the tip of the blaster barrel
    const spawnDist = 12;
    const spawnX = muzzle.x + Math.cos(angle) * spawnDist;
    const spawnY = muzzle.y + Math.sin(angle) * spawnDist;

    if (window.LightWars.sound) {
      window.LightWars.sound.playLaserFire(activeColor);
    }

    const laser = new window.LightWars.Laser(spawnX, spawnY, vx, vy, activeColor, true);
    laser.originX = muzzle.x;
    laser.originY = muzzle.y;
    return laser;
  }

  takeDamage(amount = 1, fromX = 0, fromY = 0, applyKnockback = true, knockbackAngle = null) {
    if (!this.alive) return;

    // 1. Always apply shot impact / knockback if requested (even during invulnerability frames)
    if (applyKnockback) {
      let angle = knockbackAngle;
      if (angle === null || angle === undefined) {
        if (fromX !== 0 || fromY !== 0) {
          angle = Math.atan2(this.y - fromY, this.x - fromX);
        } else {
          angle = 0;
        }
      }
      this.vx = Math.cos(angle) * 340;
      this.vy = Math.sin(angle) * 340;
    }
    // Note: Melee collision (applyKnockback = false) adds zero knockback, but leaves existing player velocity intact

    // 2. Health damage is guarded by invulnerability cooldown
    if (this.invulnerableTimer > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 0.8;

    if (window.LightWars.sound) {
      window.LightWars.sound.playPlayerHurt();
    }

    if (this.health <= 0) {
      this.alive = false;
    }
  }

  update(dt, input, arena, barrels = []) {
    if (!this.alive) return;

    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.shootFaceTimer > 0) this.shootFaceTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    // 1. Safety check: ensure player is never pushed or stuck inside a wall
    if (arena && arena.pushOutOfWall) {
      const safe = arena.pushOutOfWall(this.x, this.y, this.radius);
      this.x = safe.x;
      this.y = safe.y;
    }

    // 2. Apply & decay shot impact knockback with strict wall-collision check
    if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
      const nextX = this.x + this.vx * dt;
      const nextY = this.y + this.vy * dt;
      if (arena && arena.resolveMovement) {
        const res = arena.resolveMovement(this.x, this.y, nextX, nextY, this.radius);
        // If movement was stopped by a wall in X or Y, stop velocity in that axis
        if (Math.abs(res.x - nextX) > 0.05) this.vx = 0;
        if (Math.abs(res.y - nextY) > 0.05) this.vy = 0;
        this.x = res.x;
        this.y = res.y;
      } else {
        this.x = nextX;
        this.y = nextY;
      }
      this.vx *= Math.pow(0.01, dt);
      this.vy *= Math.pow(0.01, dt);
    }

    // Aim Angle towards Mouse in World Space
    this.aimAngle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

    // Handle Dash
    if (input.dashRequested && this.dashCooldown <= 0 && !this.isDashing) {
      input.dashRequested = false;
      this.isDashing = true;
      this.dashTimer = window.LightWars.GAME_CONFIG.playerDashDuration;
      this.dashCooldown = window.LightWars.GAME_CONFIG.playerDashCooldown;

      let dx = 0, dy = 0;
      if (input.keys['KeyW'] || input.keys['ArrowUp']) dy -= 1;
      if (input.keys['KeyS'] || input.keys['ArrowDown']) dy += 1;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) dx -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) dx += 1;

      if (dx === 0 && dy === 0) {
        dx = Math.cos(this.aimAngle);
        dy = Math.sin(this.aimAngle);
      }
      const len = Math.hypot(dx, dy) || 1;
      this.dashDirX = dx / len;
      this.dashDirY = dy / len;

      if (window.LightWars.sound) window.LightWars.sound.playDash();
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      const dashSpeed = window.LightWars.GAME_CONFIG.playerDashSpeed;
      const nextX = this.x + this.dashDirX * dashSpeed * dt;
      const nextY = this.y + this.dashDirY * dashSpeed * dt;
      if (arena && arena.resolveMovement) {
        const res = arena.resolveMovement(this.x, this.y, nextX, nextY, this.radius);
        this.x = res.x;
        this.y = res.y;
      } else {
        this.x = nextX;
        this.y = nextY;
      }

      // Dash ghost particle
      if (Math.random() < 0.45) {
        this.dashGhosts.push({ x: this.x, y: this.y, alpha: 0.7 });
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // Normal WASD Movement
      let mx = 0, my = 0;
      if (input.keys['KeyW'] || input.keys['ArrowUp']) my -= 1;
      if (input.keys['KeyS'] || input.keys['ArrowDown']) my += 1;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;

      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        const normX = mx / len;
        const normY = my / len;
        const nextX = this.x + normX * this.speed * dt;
        const nextY = this.y + normY * this.speed * dt;

        if (arena && arena.resolveMovement) {
          const res = arena.resolveMovement(this.x, this.y, nextX, nextY, this.radius);
          this.x = res.x;
          this.y = res.y;
        } else {
          this.x = nextX;
          this.y = nextY;
        }

        this.isMoving = true;
        this.walkAnimTime += dt * 12.0;
        this.idleAnimTime = 0;

        // Face movement direction, unless actively aiming/firing
        const moveAngle = Math.atan2(normY, normX);
        if ((input && input.isMouseDown) || this.shootFaceTimer > 0) {
          this.facingDir = SpriteManager.getDirection8(this.aimAngle);
        } else {
          this.facingDir = SpriteManager.getDirection8(moveAngle);
        }
      } else {
        this.isMoving = false;
        this.walkAnimTime = 0;
        this.idleAnimTime += dt * 10.0;
        // When idle, face aim direction
        this.facingDir = SpriteManager.getDirection8(this.aimAngle);
      }
    }

    // Decay dash ghosts
    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      this.dashGhosts[i].alpha -= dt * 3.5;
      if (this.dashGhosts[i].alpha <= 0) {
        this.dashGhosts.splice(i, 1);
      }
    }

    // 1. Barrel Barricade Collision Resolution
    for (const b of barrels) {
      if (!b.alive) continue;
      const res = b.resolveCircleCollision(this.x, this.y, this.radius);
      if (res.collided) {
        this.x = res.x;
        this.y = res.y;
      }
    }

    // 3. White Light Sanctuary Refill Logic at (1352, 1502)
    if (arena && arena.whiteLight) {
      const wl = arena.whiteLight;
      const dist = Math.hypot(this.x - wl.x, this.y - wl.y);
      if (dist <= wl.radius) {
        this.isRefilling = true;
        this.refillTimer += dt;
        if (this.refillTimer >= 0.25) {
          this.refillTimer = 0;
          let changed = false;

          // Heal HP
          if (this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + 1);
            changed = true;
          }

          // Refill only RGB primary laser ammunition types (Capacity: 6 per color)
          // Crafted secondary ammo (Cyan, Magenta, Yellow) is strictly gained from crystals (+1 per crystal)
          for (const c of ['RED', 'GREEN', 'BLUE']) {
            if (this.ammo[c] < this.maxAmmo) {
              this.ammo[c] = Math.min(this.maxAmmo, this.ammo[c] + 1);
              changed = true;
            }
          }
          if (changed && window.LightWars.sound) {
            window.LightWars.sound.playRefill();
          }
        }
      } else {
        this.isRefilling = false;
        this.refillTimer = 0;
      }
    }
  }

  draw(ctx, spriteManager) {
    if (!this.alive) return;

    // Dash ghost trails
    for (const ghost of this.dashGhosts) {
      ctx.save();
      ctx.translate(ghost.x, ghost.y);
      ctx.globalAlpha = ghost.alpha;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 1. Solid Ground Shadow (anchored directly under feet at local ground position)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 0.9, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Invulnerability flashing
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // 2. Render Hero Sprite via SpriteManager
    if (spriteManager && spriteManager.drawPlayer(ctx, this)) {
      ctx.restore();
      return;
    }

    // Procedural Fallback
    const activeColor = this.getActiveColorData();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, -this.radius * 0.8, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#111';
    ctx.stroke();

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Player = Player;
