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
    this.speed = 130 + Math.random() * 30;
    this.alive = true;
    this.health = 2; // 2 HP base; counter laser deals lethal 1-shot kill

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

    // AI navigation towards player
    if (player && player.alive) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      this.facingAngle = Math.atan2(dy, dx);

      if (dist > 35 && dist < this.aggroRange) {
        const nx = dx / dist;
        const ny = dy / dist;
        this.x += nx * this.speed * dt;
        this.y += ny * this.speed * dt;
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

    // 1. Boundary Slab Collision
    if (arena && arena.resolveCircleCollision) {
      const res = arena.resolveCircleCollision(this.x, this.y, this.radius);
      this.x = res.x;
      this.y = res.y;
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

    // Non-counter laser deals 1 damage
    this.health -= 1;
    if (this.health <= 0) {
      this.alive = false;
      return { action: 'KILL' };
    }

    return interaction;
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
