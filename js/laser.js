/**
 * Light-Wars: Laser Projectile System
 */

class Laser {
  constructor(x, y, vx, vy, colorId, isPlayer = true) {
    this.x = x;
    this.y = y;
    this.z = 25; // 2.5D elevation off ground
    this.vx = vx;
    this.vy = vy;
    this.colorId = colorId;
    this.colorData = window.LightWars.COLORS[colorId] || window.LightWars.COLORS.RED;
    this.isPlayer = isPlayer;
    this.radius = 7;
    this.length = 26;
    this.angle = Math.atan2(vy, vx);
    this.life = window.LightWars.GAME_CONFIG.laserLifetime;
    this.alive = true;
    this.prevX = x;
    this.prevY = y;
    this.trail = [];
  }

  update(dt) {
    if (!this.alive) return;

    this.prevX = this.x;
    this.prevY = this.y;

    // Record trail positions
    this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
    if (this.trail.length > 7) {
      this.trail.shift();
    }
    for (const t of this.trail) {
      t.alpha -= dt * 4;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    // Draw 2.5D ground shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.z * 0.7, this.length * 0.45, 5, this.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw glowing trail
    for (let i = 0; i < this.trail.length; i++) {
      const pt = this.trail[i];
      if (pt.alpha <= 0) continue;
      ctx.save();
      ctx.strokeStyle = this.colorData.hex;
      ctx.globalAlpha = Math.max(0, pt.alpha * 0.4);
      ctx.lineWidth = 4 * (i / this.trail.length);
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      ctx.restore();
    }

    // Draw main laser beam
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Outer intense glow
    ctx.shadowColor = this.colorData.hex;
    ctx.shadowBlur = 14;

    // Colored outer shell
    ctx.fillStyle = this.colorData.hex;
    ctx.beginPath();
    ctx.roundRect(-this.length * 0.5, -this.radius, this.length, this.radius * 2, this.radius);
    ctx.fill();

    // White core hot-spot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(-this.length * 0.35, -this.radius * 0.4, this.length * 0.7, this.radius * 0.8, this.radius * 0.4);
    ctx.fill();

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Laser = Laser;
