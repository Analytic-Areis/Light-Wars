/**
 * Light-Wars: Player Character Controller
 * 2.5D Brawler hero with RGB laser blasters, dash, and White Light refill.
 */

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.radius = 26;
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
    this.walkCycle = 0;
    this.isMoving = false;
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

  addAmmo(colorId, amount = 1) {
    if (this.ammo[colorId] !== undefined) {
      this.ammo[colorId] = Math.min(this.maxAmmo, this.ammo[colorId] + amount);
    }
  }

  triggerDash(dirX, dirY) {
    if (this.dashCooldown > 0 || this.isDashing) return;

    let len = Math.hypot(dirX, dirY);
    if (len < 0.01) {
      // Dash towards aim angle if no movement keys pressed
      this.dashDirX = Math.cos(this.aimAngle);
      this.dashDirY = Math.sin(this.aimAngle);
    } else {
      this.dashDirX = dirX / len;
      this.dashDirY = dirY / len;
    }

    this.isDashing = true;
    this.dashTimer = window.LightWars.GAME_CONFIG.playerDashDuration;
    this.dashCooldown = window.LightWars.GAME_CONFIG.playerDashCooldown;
    window.LightWars.sound.playDash();
  }

  shoot(targetX, targetY) {
    if (this.shootCooldown > 0) return null;

    const colorId = this.getActiveColorId();
    if (this.ammo[colorId] <= 0) {
      return { failed: true, reason: 'OUT_OF_AMMO', colorId };
    }

    // Deduct 1 ammo
    this.ammo[colorId]--;
    this.shootCooldown = window.LightWars.GAME_CONFIG.laserCooldown;

    // Calculate muzzle origin
    const barrelDist = 32;
    const muzzleX = this.x + Math.cos(this.aimAngle) * barrelDist;
    const muzzleY = this.y + Math.sin(this.aimAngle) * barrelDist;

    const speed = window.LightWars.GAME_CONFIG.laserSpeed;
    const vx = Math.cos(this.aimAngle) * speed;
    const vy = Math.sin(this.aimAngle) * speed;

    window.LightWars.sound.playLaser(colorId);

    return new window.LightWars.Laser(muzzleX, muzzleY, vx, vy, colorId, true);
  }

  takeDamage(amount, sourceX, sourceY) {
    if (this.invulnerableTimer > 0 || this.isDashing) return;

    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 1.0;
    window.LightWars.sound.playPlayerHurt();

    // Knockback
    const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
    this.x += Math.cos(angle) * 35;
    this.y += Math.sin(angle) * 35;

    if (this.health <= 0) {
      this.alive = false;
    }
  }

  update(dt, input, arena) {
    if (!this.alive) return;

    // Timers
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    // Update aim angle from mouse/reticle
    const dx = input.mouseX - this.x;
    const dy = input.mouseY - this.y;
    this.aimAngle = Math.atan2(dy, dx);

    // Handle Dash
    if (this.isDashing) {
      this.dashTimer -= dt;

      // Spawn dash ghost trail
      this.dashGhosts.push({
        x: this.x,
        y: this.y,
        angle: this.aimAngle,
        alpha: 0.6
      });

      this.x += this.dashDirX * window.LightWars.GAME_CONFIG.playerDashSpeed * dt;
      this.y += this.dashDirY * window.LightWars.GAME_CONFIG.playerDashSpeed * dt;

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // Normal WASD movement
      let mx = 0;
      let my = 0;
      if (input.keys['KeyW'] || input.keys['ArrowUp']) my -= 1;
      if (input.keys['KeyS'] || input.keys['ArrowDown']) my += 1;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;

      const len = Math.hypot(mx, my);
      if (len > 0) {
        this.vx = (mx / len) * this.speed;
        this.vy = (my / len) * this.speed;
        this.isMoving = true;
        this.walkCycle += dt * 10;
      } else {
        this.vx = 0;
        this.vy = 0;
        this.isMoving = false;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Dash trigger check
      if (input.dashRequested) {
        this.triggerDash(mx, my);
        input.dashRequested = false;
      }
    }

    // Update dash ghosts
    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      this.dashGhosts[i].alpha -= dt * 3.5;
      if (this.dashGhosts[i].alpha <= 0) {
        this.dashGhosts.splice(i, 1);
      }
    }

    // White Light Refill Check
    this.isRefilling = false;
    if (arena && arena.whiteLight) {
      const distToSpawn = Math.hypot(this.x - arena.whiteLight.x, this.y - arena.whiteLight.y);
      if (distToSpawn <= arena.whiteLight.radius) {
        // Player is standing in the White Light!
        const needsRefill = (this.ammo.RED < this.maxAmmo || this.ammo.GREEN < this.maxAmmo || this.ammo.BLUE < this.maxAmmo);
        if (needsRefill) {
          this.isRefilling = true;
          this.refillTimer += dt;
          if (this.refillTimer >= 0.28) {
            this.refillTimer = 0;
            if (this.ammo.RED < this.maxAmmo) this.ammo.RED++;
            if (this.ammo.GREEN < this.maxAmmo) this.ammo.GREEN++;
            if (this.ammo.BLUE < this.maxAmmo) this.ammo.BLUE++;
            window.LightWars.sound.playRefill();
          }
        }
      }
    }

    // Keep within arena
    if (arena) {
      this.x = Math.max(arena.minX + this.radius, Math.min(arena.maxX - this.radius, this.x));
      this.y = Math.max(arena.minY + this.radius, Math.min(arena.maxY - this.radius, this.y));
    }
  }

  draw(ctx, spriteManager) {
    if (!this.alive) return;

    // Draw dash ghost silhouettes
    for (const ghost of this.dashGhosts) {
      ctx.save();
      ctx.translate(ghost.x, ghost.y);
      ctx.globalAlpha = ghost.alpha;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2.5D Ground Shadow
    const shadowScale = 1.0 + (this.isMoving ? Math.sin(this.walkCycle) * 0.08 : 0);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius * 0.85, this.radius * 1.1 * shadowScale, this.radius * 0.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Invulnerability flashing
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    // Bobbing / Walk bounce
    const bob = this.isMoving ? Math.abs(Math.sin(this.walkCycle)) * 4 : 0;
    const drawY = this.y - bob;

    ctx.save();
    ctx.translate(this.x, drawY);

    // If custom sprite loaded, allow spriteManager to render
    if (spriteManager && spriteManager.hasSprite('player')) {
      spriteManager.drawPlayer(ctx, this);
      ctx.restore();
      return;
    }

    // Procedural 2.5D Brawl-Stars Style Brawler Hero
    const activeColor = this.getActiveColorData();

    // Body suit (High-tech combat armor)
    const bodyGrad = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, 2, 0, 0, this.radius);
    bodyGrad.addColorStop(0, '#FFFFFF');
    bodyGrad.addColorStop(0.3, '#E8E8FA');
    bodyGrad.addColorStop(0.8, '#4E5370');
    bodyGrad.addColorStop(1, '#1A1C29');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Comic bold outline
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#12131C';
    ctx.stroke();

    // Hero visor glowing with selected laser color
    ctx.save();
    ctx.rotate(this.aimAngle);

    // Chest / Visor Chromatic Arc
    ctx.fillStyle = activeColor.hex;
    ctx.shadowColor = activeColor.hex;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(0, -7, 18, 14, 4);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Dual Chromatic Laser Blaster Cannons
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#26293D';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111';

    // Cannon barrels
    ctx.beginPath();
    ctx.roundRect(14, -14, 20, 7, 3);
    ctx.roundRect(14, 7, 20, 7, 3);
    ctx.fill();
    ctx.stroke();

    // Cannon glowing tips
    ctx.fillStyle = activeColor.hex;
    ctx.shadowColor = activeColor.hex;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(32, -13, 5, 5, 2);
    ctx.roundRect(32, 8, 5, 5, 2);
    ctx.fill();

    ctx.restore();

    // Hero helmet crest
    ctx.fillStyle = '#FFDD00';
    ctx.beginPath();
    ctx.arc(0, -this.radius * 0.55, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Player = Player;
