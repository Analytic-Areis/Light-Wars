/**
 * Light-Wars: Coloured Enemies with Headbands & Color-Reaction Logic
 * Supports Red, Green, Blue, Cyan, Magenta, Yellow troops.
 * Cyan, Magenta, Yellow drop Red, Green, Blue orbs respectively;
 * Red, Green, Blue troops drop nothing.
 */

class Enemy {
  constructor(x, y, colorId) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.colorId = colorId;
    this.colorData = window.LightWars.COLORS[colorId] || window.LightWars.COLORS.CYAN;
    this.bandColorId = this.colorData.band || this.colorData.complementary;
    this.bandColorData = window.LightWars.COLORS[this.bandColorId] || window.LightWars.COLORS.RED;

    this.radius = 24;
    this.bodyRadius = 30; // Scaled for larger enemy body
    this.speed = 130 + Math.random() * 30;
    this.alive = true;
    this.health = 2;

    // Animation & physics
    this.walkAnimTime = Math.random() * 25;
    this.idleAnimTime = Math.random() * 25;
    this.isMoving = false;
    this.facingDir = 'S';
    this.facingAngle = 0;
    this.hurtFlash = 0;
    this.transformPulse = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.aggroRange = 1200;
    this.attackCooldown = 0;
    this.shootCooldown = 1.8 + Math.random() * 2.2;
  }

  // Whole-body vertical capsule hitbox from feet (y - 10) to head (y - 140)
  checkLaserHit(laser) {
    if (!this.alive) return false;
    const clampedY = Math.max(this.y - 140, Math.min(this.y - 10, laser.y));
    const dist = Math.hypot(laser.x - this.x, laser.y - clampedY);
    return dist < (this.bodyRadius || 30) + laser.radius;
  }

  // Ground-contact-relative sniper rifle muzzle offsets scaled to match 190x190 model
  static MUZZLE_OFFSETS = {
    N:  { x: -5.2,  y: -134.0 },
    NE: { x: 28.3,  y: -74.4 },
    E:  { x: 69.9,  y: -83.3 },
    SE: { x: 65.5,  y: -96.0 },
    S:  { x: 0.0,   y: -44.5 },
    SW: { x: -32.0, y: -87.8 },
    W:  { x: -69.9, y: -63.5 },
    NW: { x: -69.2, y: -74.4 }
  };

  getMuzzlePos(dir) {
    const d = dir || this.facingDir || SpriteManager.getDirection8(this.facingAngle);
    const offset = Enemy.MUZZLE_OFFSETS[d] || { x: 0, y: -80 };
    return {
      x: this.x + offset.x,
      y: this.y + offset.y,
      dir: d
    };
  }

  shoot(targetX, targetY) {
    if (!this.alive || this.shootCooldown > 0) return null;

    // Reset slow shooting cooldown: 3.2 to 4.4 seconds (relative to player's 0.28s cooldown)
    this.shootCooldown = 3.2 + Math.random() * 1.2;

    this.facingDir = SpriteManager.getDirection8(this.facingAngle);
    const muzzle = this.getMuzzlePos(this.facingDir);

    // Aim towards target player chest height (targetY - 55)
    const targetAimY = targetY - 55;
    const enemyCenterY = this.y - 60;
    const bodyAngle = Math.atan2(targetAimY - enemyCenterY, targetX - this.x);
    const distToTarget = Math.hypot(targetX - this.x, targetAimY - enemyCenterY);

    let angle;
    let spawnX;
    let spawnY;

    // At close/point-blank range (or if muzzle could overshoot), aim strictly along body angle and spawn at enemy front
    if (distToTarget < 115) {
      angle = bodyAngle;
      spawnX = this.x + Math.cos(angle) * 20;
      spawnY = enemyCenterY + Math.sin(angle) * 20;
    } else {
      angle = Math.atan2(targetAimY - muzzle.y, targetX - muzzle.x);
      // Safeguard: if angle diverges drastically from body direction towards target, fallback to body angle
      const dot = Math.cos(angle) * Math.cos(bodyAngle) + Math.sin(angle) * Math.sin(bodyAngle);
      if (dot < 0.5) {
        angle = bodyAngle;
      }
      spawnX = muzzle.x + Math.cos(angle) * 12;
      spawnY = muzzle.y + Math.sin(angle) * 12;
    }

    // Slower dodgeable speed (420 px/s vs player's 820 px/s)
    const speed = 420;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    if (window.LightWars.sound) {
      window.LightWars.sound.playLaserFire(this.colorId);
    }

    // Enemy shoots its own color! isPlayer = false
    const laser = new window.LightWars.Laser(spawnX, spawnY, vx, vy, this.colorId, false);
    laser.originX = spawnX;
    laser.originY = spawnY;
    laser.prevX = spawnX;
    laser.prevY = spawnY;
    return laser;
  }

  setColor(newColorId) {
    this.colorId = newColorId;
    this.colorData = window.LightWars.COLORS[newColorId];
    this.bandColorId = this.colorData.band || this.colorData.complementary;
    this.bandColorData = window.LightWars.COLORS[this.bandColorId];
    this.transformPulse = 1.0;
  }

  getOrbDrop() {
    // Exact rule: Cyan, Magenta, Yellow drop Red, Green, Blue orbs respectively;
    // Red, Green, Blue troops drop nothing!
    return window.LightWars.ENEMY_ORB_DROPS[this.colorId] || null;
  }

  update(dt, player, arena, barrels = []) {
    if (!this.alive) return;

    // Decay knockback
    this.x += this.knockbackVx * dt;
    this.y += this.knockbackVy * dt;
    this.knockbackVx *= Math.pow(0.05, dt);
    this.knockbackVy *= Math.pow(0.05, dt);

    if (this.hurtFlash > 0) this.hurtFlash -= dt * 4;
    if (this.transformPulse > 0) this.transformPulse -= dt * 3;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    let firedLaser = null;

    // AI navigation & shooting towards player
    if (player && player.alive) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      this.facingAngle = Math.atan2(dy, dx);

      // Shoot slowly at player if within line of sight / engagement range (even at point blank)
      if (dist <= 750 && this.shootCooldown <= 0) {
        firedLaser = this.shoot(player.x, player.y);
      }

      const minContactDist = this.radius + player.radius;
      if (dist > minContactDist && dist < this.aggroRange) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nextX = this.x + nx * this.speed * dt;
        const nextY = this.y + ny * this.speed * dt;

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
        this.facingDir = SpriteManager.getDirection8(this.facingAngle);
      } else {
        this.isMoving = false;
        this.idleAnimTime += dt * 10.0;
        this.facingDir = SpriteManager.getDirection8(this.facingAngle);
      }

      // Attack player if in melee contact (NO knockback / impact during collision)
      if (dist <= minContactDist + 4 && this.attackCooldown <= 0) {
        player.takeDamage(1, this.x, this.y, false);
        this.attackCooldown = 1.2;
      }
    } else {
      this.isMoving = false;
      this.idleAnimTime += dt * 10.0;
    }

    // 2. Barrels Collision
    for (const b of barrels) {
      if (!b.alive) continue;
      const res = b.resolveCircleCollision(this.x, this.y, this.radius);
      if (res.collided) {
        this.x = res.x;
        this.y = res.y;
      }
    }

    return firedLaser;
  }

  takeLaserHit(laserColorId, hitAngle) {
    const rules = window.LightWars.ENEMY_INTERACTIONS[this.colorId];
    const interaction = (rules && rules[laserColorId]) ? rules[laserColorId] : { action: 'NONE' };

    // Apply brief knockback
    this.knockbackVx = Math.cos(hitAngle) * 280;
    this.knockbackVy = Math.sin(hitAngle) * 280;
    this.hurtFlash = 1.0;

    if (interaction.action === 'KILL') {
      // Counter weakness is instant 1-hit kill
      this.health = 0;
      this.alive = false;
      return { action: 'KILL' };
    }

    if (interaction.action === 'TRANSFORM') {
      return { action: 'TRANSFORM', target: interaction.target };
    }

    // action === 'NONE' -> No change when hit by this color!
    return { action: 'NONE' };
  }

  draw(ctx, spriteManager) {
    if (!this.alive) return;

    // 1. Ground Contact Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 0.9, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);

    // 2. Custom Troop Sprite Rendering
    if (spriteManager && spriteManager.drawEnemy(ctx, this)) {
      ctx.restore();
      return;
    }

    // Fallback Procedural Troop Sphere
    ctx.fillStyle = this.colorData.hex;
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
window.LightWars.Enemy = Enemy;
