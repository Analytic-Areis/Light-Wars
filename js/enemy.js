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

    this.radius = 22;
    this.bodyRadius = 26; // Full body width radius
    this.speed = 130 + Math.random() * 30;
    this.alive = true;
    this.health = 2;

    // Animation & physics
    this.walkAnimTime = Math.random() * 8;
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

  // Whole-body vertical capsule hitbox from feet (y - 10) to head (y - 130)
  checkLaserHit(laser) {
    if (!this.alive) return false;
    const clampedY = Math.max(this.y - 130, Math.min(this.y - 10, laser.y));
    const dist = Math.hypot(laser.x - this.x, laser.y - clampedY);
    return dist < (this.bodyRadius || 26) + laser.radius;
  }

  // Exact ground-contact-relative sniper rifle muzzle offsets for troops in all 8 directions
  static MUZZLE_OFFSETS = {
    N:  { x: 11.8,  y: -112.2 },
    NE: { x: 45.9,  y: -102.4 },
    E:  { x: 51.2,  y: -83.3 },
    SE: { x: 27.6,  y: -66.9 },
    S:  { x: -17.1, y: -69.6 },
    SW: { x: -47.2, y: -76.1 },
    W:  { x: -52.5, y: -95.8 },
    NW: { x: -28.9, y: -112.2 }
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
    const angle = Math.atan2(targetAimY - muzzle.y, targetX - muzzle.x);
    // Slower dodgeable speed (420 px/s vs player's 820 px/s)
    const speed = 420;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Spawn starting right at the tip of the sniper rifle
    const spawnDist = 12;
    const spawnX = muzzle.x + Math.cos(angle) * spawnDist;
    const spawnY = muzzle.y + Math.sin(angle) * spawnDist;

    if (window.LightWars.sound) {
      window.LightWars.sound.playLaserFire(this.colorId);
    }

    // Enemy shoots its own color! isPlayer = false
    const laser = new window.LightWars.Laser(spawnX, spawnY, vx, vy, this.colorId, false);
    laser.originX = muzzle.x;
    laser.originY = muzzle.y;
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

      // Shoot slowly at player if within line of sight / engagement range
      if (dist >= 60 && dist <= 750 && this.shootCooldown <= 0) {
        firedLaser = this.shoot(player.x, player.y);
      }

      if (dist > 35 && dist < this.aggroRange) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nextX = this.x + nx * this.speed * dt;
        const nextY = this.y + ny * this.speed * dt;

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
        this.facingDir = SpriteManager.getDirection8(this.facingAngle);
      } else {
        this.isMoving = false;
        this.facingDir = SpriteManager.getDirection8(this.facingAngle);
      }

      // Attack player if in melee contact
      if (dist < this.radius + player.radius && this.attackCooldown <= 0) {
        player.takeDamage(1, this.x, this.y);
        this.attackCooldown = 1.2;
      }
    } else {
      this.isMoving = false;
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
