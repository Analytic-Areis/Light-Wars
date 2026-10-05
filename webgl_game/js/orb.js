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

    // 1. Soft Ground Contact Ambient Glow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, groundShadowY, this.radius * 1.5, this.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Radiant Luminous Energy Flare (Matches user reference style: soft glowing star core, no hard blob edges)
    ctx.save();
    ctx.translate(this.x, hoverY);

    // Multi-layered smooth radiant gradient
    const outerRadius = this.radius * 3.4 * pulse;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);

    // Color definitions for each spectral type
    const hex = this.colorData.hex;
    
    // Core white hot center -> bright tinted bloom -> saturated color -> warm ambient dissipation
    grad.addColorStop(0.00, '#FFFFFF');
    grad.addColorStop(0.12, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.28, hex);
    grad.addColorStop(0.55, this.colorData.glow || hex);
    grad.addColorStop(0.80, hex);
    grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

    // Render outer ambient flare
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Additive intense inner heat core (creates the brilliant shining center seen in reference)
    ctx.globalCompositeOperation = 'lighter';
    const innerRadius = this.radius * 1.6 * pulse;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
    coreGrad.addColorStop(0.0, '#FFFFFF');
    coreGrad.addColorStop(0.35, hex);
    coreGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle orbiting micro-sparks
    for (const sp of this.sparkles) {
      const sx = Math.cos(sp.angle) * sp.dist * 1.2;
      const sy = Math.sin(sp.angle) * sp.dist * 0.8;
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = (sp.life / sp.maxLife) * 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Orb = Orb;
