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
    this.radius = 22;
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

  shoot(targetX, targetY) {
    if (!this.alive || this.shootCooldown > 0) return null;

    const activeColor = this.getActiveColorId();
    if (!this.consumeAmmo(activeColor)) {
      if (window.LightWars.sound) window.LightWars.sound.playEmpty();
      return null;
    }

    this.shootCooldown = window.LightWars.GAME_CONFIG.laserCooldown;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = window.LightWars.GAME_CONFIG.laserSpeed;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const spawnDist = 28;
    const spawnX = this.x + Math.cos(angle) * spawnDist;
    const spawnY = this.y + Math.sin(angle) * spawnDist;

    if (window.LightWars.sound) {
      window.LightWars.sound.playLaserFire(activeColor);
    }

    return new window.LightWars.Laser(spawnX, spawnY, vx, vy, activeColor, true);
  }

  takeDamage(amount = 1, fromX = 0, fromY = 0) {
    if (this.invulnerableTimer > 0 || !this.alive) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 1.0;

    // Knockback
    if (fromX !== 0 || fromY !== 0) {
      const angle = Math.atan2(this.y - fromY, this.x - fromX);
      this.vx = Math.cos(angle) * 380;
      this.vy = Math.sin(angle) * 380;
    }

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
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    // Decay knockback
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.pow(0.1, dt);
    this.vy *= Math.pow(0.1, dt);

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
        const res = arena.resolveMovement(this.x, this.y, nextX, nextY);
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
          const res = arena.resolveMovement(this.x, this.y, nextX, nextY);
          this.x = res.x;
          this.y = res.y;
        } else {
          this.x = nextX;
          this.y = nextY;
        }

        this.isMoving = true;
        this.walkAnimTime += dt * 12.0;

        // Face movement direction
        const moveAngle = Math.atan2(normY, normX);
        this.facingDir = SpriteManager.getDirection8(moveAngle);
      } else {
        this.isMoving = false;
        this.walkAnimTime = 0;
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

          // Refill all 6 laser ammunition types
          for (const c of this.colorOrder) {
            if (this.ammo[c] < this.maxAmmo) {
              this.ammo[c] = Math.min(this.maxAmmo, this.ammo[c] + 1);
              changed = true;
            }
          }
          if (changed && window.LightWars.sound) {
            window.LightWars.sound.playLaserFire('WHITE');
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
