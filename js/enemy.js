/**
 * Light-Wars: Coloured Enemies with Headbands & Color-Reaction Logic
 */

class Enemy {
  constructor(x, y, colorId) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.colorId = colorId;
    this.colorData = window.LightWars.COLORS[colorId] || window.LightWars.COLORS.RED;
    this.bandColorId = this.colorData.band || this.colorData.complementary;
    this.bandColorData = window.LightWars.COLORS[this.bandColorId] || window.LightWars.COLORS.CYAN;

    this.radius = 24;
    this.speed = 100 + Math.random() * 35;
    this.alive = true;
    this.health = 1; // 1-shot kill under correct chromatic condition

    // Animation & physics
    this.walkCycle = Math.random() * Math.PI * 2;
    this.facingAngle = 0;
    this.hurtFlash = 0;
    this.transformPulse = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.aggroRange = 900;
    this.attackCooldown = 0;
  }

  setColor(newColorId) {
    this.colorId = newColorId;
    this.colorData = window.LightWars.COLORS[newColorId];
    this.bandColorId = this.colorData.band || this.colorData.complementary;
    this.bandColorData = window.LightWars.COLORS[this.bandColorId];
    this.transformPulse = 1.0;
  }

  update(dt, player, arena) {
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
        this.walkCycle += dt * 8;
      }

      // Attack player if in melee contact
      if (dist < this.radius + player.radius && this.attackCooldown <= 0) {
        player.takeDamage(1, this.x, this.y);
        this.attackCooldown = 1.2;
      }
    }

    // Keep within arena bounds
    if (arena) {
      this.x = Math.max(arena.minX + this.radius, Math.min(arena.maxX - this.radius, this.x));
      this.y = Math.max(arena.minY + this.radius, Math.min(arena.maxY - this.radius, this.y));
    }
  }

  // Handle laser shot hitting enemy
  takeLaserHit(laserColorId, hitAngle) {
    const rules = window.LightWars.ENEMY_INTERACTIONS[this.colorId];
    const interaction = (rules && rules[laserColorId]) ? rules[laserColorId] : { action: 'NONE' };

    // Apply brief knockback
    this.knockbackVx = Math.cos(hitAngle) * 220;
    this.knockbackVy = Math.sin(hitAngle) * 220;
    this.hurtFlash = 1.0;

    return interaction;
  }

  draw(ctx, spriteManager) {
    if (!this.alive) return;

    // 2.5D Drop Shadow
    const shadowScale = 1.0 + Math.sin(this.walkCycle) * 0.08;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius * 0.85, this.radius * 1.05 * shadowScale, this.radius * 0.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bobbing / Walk bounce
    const bob = Math.abs(Math.sin(this.walkCycle)) * 4;
    const drawY = this.y - bob;

    ctx.save();
    ctx.translate(this.x, drawY);

    // If custom sprite exists, allow spriteManager to render
    if (spriteManager && spriteManager.drawEnemy(ctx, this)) {
      ctx.restore();
      return;
    }

    // Procedural 2.5D Brawl-Stars Style Brawler Enemy
    const scalePulse = 1.0 + (this.transformPulse * 0.25);
    ctx.scale(scalePulse, scalePulse);

    // Outer glow of enemy's color
    ctx.shadowColor = this.colorData.hex;
    ctx.shadowBlur = (this.transformPulse > 0) ? 25 : 12;

    // Body sphere with gradient
    const bodyGrad = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.1,
      0, 0, this.radius
    );
    if (this.hurtFlash > 0.5) {
      bodyGrad.addColorStop(0, '#FFFFFF');
      bodyGrad.addColorStop(1, '#FFFFFF');
    } else {
      bodyGrad.addColorStop(0, '#FFFFFF');
      bodyGrad.addColorStop(0.35, this.colorData.hex);
      bodyGrad.addColorStop(1, '#111118');
    }

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Bold comic outline
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#181822';
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Enemy Forehead Band (Shows band colour!)
    ctx.save();
    ctx.rotate(this.facingAngle * 0.3); // Slight tilt with movement
    ctx.fillStyle = this.bandColorData.hex;
    ctx.shadowColor = this.bandColorData.hex;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(-this.radius * 0.95, -this.radius * 0.55, this.radius * 1.9, this.radius * 0.42, 3);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Band core accent
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, -this.radius * 0.34, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Animated Eyes looking toward facingAngle
    const eyeOffsetX = Math.cos(this.facingAngle) * (this.radius * 0.35);
    const eyeOffsetY = Math.sin(this.facingAngle) * (this.radius * 0.2) + 2;

    // Eye whites
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(eyeOffsetX - 5, eyeOffsetY, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeOffsetX + 5, eyeOffsetY, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#111';
    ctx.stroke();

    // Pupils
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(eyeOffsetX - 5 + Math.cos(this.facingAngle) * 2, eyeOffsetY + Math.sin(this.facingAngle) * 2, 2.5, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + 5 + Math.cos(this.facingAngle) * 2, eyeOffsetY + Math.sin(this.facingAngle) * 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Small comic horns/ears according to type
    ctx.fillStyle = this.colorData.hex;
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.7, -this.radius * 0.7);
    ctx.lineTo(-this.radius * 0.9, -this.radius * 1.1);
    ctx.lineTo(-this.radius * 0.4, -this.radius * 0.85);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.radius * 0.7, -this.radius * 0.7);
    ctx.lineTo(this.radius * 0.9, -this.radius * 1.1);
    ctx.lineTo(this.radius * 0.4, -this.radius * 0.85);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Enemy = Enemy;
