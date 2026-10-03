/**
 * Light-Wars: Floating Chromatic Plasma Orb
 * Compact glossy glowing energy sphere (NO text/letters).
 * Hit with compatible laser to craft 2 Ammo Crystals!
 */

class Orb {
  constructor(x, y, colorId) {
    this.x = x;
    this.y = y;
    this.colorId = colorId;
    this.colorData = window.LightWars.COLORS[colorId] || window.LightWars.COLORS.GREEN;
    this.radius = 9;
    this.hitRadius = 32;
    this.hoverTime = Math.random() * Math.PI * 2;
    this.alive = true;
    this.pulsePhase = 0;

    this.sparkles = [];
  }

  update(dt) {
    if (!this.alive) return;
    this.hoverTime += dt * 3.5;
    this.pulsePhase += dt * 4;

    if (Math.random() < 0.2) {
      this.sparkles.push({
        angle: Math.random() * Math.PI * 2,
        dist: this.radius * (1.2 + Math.random() * 0.5),
        speed: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
        life: 0.45,
        maxLife: 0.45
      });
    }

    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.angle += sp.speed * dt;
      sp.life -= dt;
      if (sp.life <= 0) {
        this.sparkles.splice(i, 1);
      }
    }
  }

  // Hit by a laser shot
  hitByLaser(laserColorId) {
    const key = `${this.colorId}_${laserColorId}`;
    const resultColor = window.LightWars.ORB_CONVERSIONS[key];
    if (resultColor) {
      this.alive = false;
      return { success: true, resultColor };
    }
    return { success: false };
  }

  draw(ctx) {
    if (!this.alive) return;

    const hoverY = this.y - 10 + Math.sin(this.hoverTime) * 3.0;
    const groundShadowY = this.y + 2;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.12;

    // 1. Compact Ground Contact Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
    ctx.beginPath();
    ctx.ellipse(this.x, groundShadowY, this.radius * 1.1, this.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Radiant Outer Glow Corona
    ctx.save();
    ctx.translate(this.x, hoverY);

    const grad = ctx.createRadialGradient(0, 0, this.radius * 0.2, 0, 0, this.radius * 2.0 * pulse);
    grad.addColorStop(0, this.colorData.hex);
    grad.addColorStop(0.5, this.colorData.glow);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2.0 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting energy specks
    for (const sp of this.sparkles) {
      const sx = Math.cos(sp.angle) * sp.dist;
      const sy = Math.sin(sp.angle) * sp.dist * 0.7;
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = sp.life / sp.maxLife;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 3. Spherical Plasma Core (Pure color with 3D gradient, NO letters)
    const sphereGrad = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.35, this.radius * 0.05,
      0, 0, this.radius
    );
    sphereGrad.addColorStop(0, '#FFFFFF');
    sphereGrad.addColorStop(0.3, this.colorData.hex);
    sphereGrad.addColorStop(0.9, this.colorData.hex);
    sphereGrad.addColorStop(1, '#000000');

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Clean comic outline
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Glossy specular energy highlight dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(-this.radius * 0.3, -this.radius * 0.3, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Orb = Orb;
