/**
 * Light-Wars: Laser Projectile System
 */

class Laser {
  constructor(x, y, vx, vy, colorId, isPlayer = true, options = {}) {
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

    // Optional homing properties (for Black Boss bullets)
    this.isHoming = options.isHoming || false;
    this.homingTarget = options.target || null;
    this.homingSpeed = options.speed || Math.hypot(vx, vy) || 320;
    this.turnRate = options.turnRate || 2.4; // Controlled turning rate allowing skill/dash dodges
    this.homingLife = options.homingLife !== undefined ? options.homingLife : 1.5; // Exactly 1.5 seconds lifetime
    if (this.isHoming) {
      this.life = this.homingLife;
      this.radius = 9;
      this.length = 28;
    }
  }

  update(dt, player = null) {
    if (!this.alive) return;

    this.prevX = this.x;
    this.prevY = this.y;

    // Homing steering towards player target if active
    const target = this.homingTarget || player;
    if (this.isHoming && target && target.alive) {
      const targetAimY = target.y - 50;
      const targetAimX = target.x;
      const targetAngle = Math.atan2(targetAimY - this.y, targetAimX - this.x);
      
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const maxTurn = this.turnRate * dt;
      const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
      this.angle += turn;

      this.vx = Math.cos(this.angle) * this.homingSpeed;
      this.vy = Math.sin(this.angle) * this.homingSpeed;
    }

    // Record trail positions
    this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
    if (this.trail.length > (this.isHoming ? 12 : 7)) {
      this.trail.shift();
    }
    for (const t of this.trail) {
      t.alpha -= dt * (this.isHoming ? 2.5 : 4);
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
    ctx.shadowColor = (this.colorId === 'BLACK') ? '#A020F0' : (this.colorData.hex || '#FFFFFF');
    ctx.shadowBlur = this.isHoming ? 18 : 14;

    if (this.colorId === 'BLACK') {
      // Void homing bullet: dark obsidian body with glowing purple corona
      ctx.fillStyle = '#080810';
      ctx.beginPath();
      ctx.roundRect(-this.length * 0.5, -this.radius, this.length, this.radius * 2, this.radius);
      ctx.fill();
      ctx.strokeStyle = '#B040FF';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Deep void core
      ctx.fillStyle = '#7010C0';
      ctx.beginPath();
      ctx.roundRect(-this.length * 0.35, -this.radius * 0.4, this.length * 0.7, this.radius * 0.8, this.radius * 0.4);
      ctx.fill();
    } else {
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
    }

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Laser = Laser;
