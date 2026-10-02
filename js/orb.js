/**
 * Light-Wars: Floating Orb System
 * Dropped from enemies, shot with compatible lasers to craft new laser ammunition.
 */

class Orb {
  constructor(x, y, colorId) {
    this.x = x;
    this.y = y;
    this.z = 20; // 2.5D height
    this.colorId = colorId;
    this.colorData = window.LightWars.COLORS[colorId] || window.LightWars.COLORS.GREEN;
    this.radius = 18;
    this.hoverTime = Math.random() * Math.PI * 2;
    this.alive = true;
    this.pulsePhase = 0;
    this.pickupRadius = 32;

    // Visual ring particles
    this.sparkles = [];
  }

  update(dt) {
    if (!this.alive) return;
    this.hoverTime += dt * 3.5;
    this.pulsePhase += dt * 4;

    // Periodically spawn orbiting speck
    if (Math.random() < 0.25) {
      this.sparkles.push({
        angle: Math.random() * Math.PI * 2,
        dist: this.radius * (1.2 + Math.random() * 0.6),
        speed: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
        life: 0.6,
        maxLife: 0.6
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

    const hoverY = this.y + Math.sin(this.hoverTime) * 6;
    const groundShadowY = this.y + 25;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.12;

    // 2.5D Ground Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, groundShadowY, this.radius * 0.85, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Radiant outer glow aura
    ctx.save();
    ctx.translate(this.x, hoverY);

    const grad = ctx.createRadialGradient(0, 0, this.radius * 0.3, 0, 0, this.radius * 2.2 * pulse);
    grad.addColorStop(0, this.colorData.hex);
    grad.addColorStop(0.5, this.colorData.glow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2.2 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Floating sparkles around orb
    for (const sp of this.sparkles) {
      const sx = Math.cos(sp.angle) * sp.dist;
      const sy = Math.sin(sp.angle) * sp.dist * 0.7;
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = sp.life / sp.maxLife;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Main orb sphere with 3D spherical shading
    const sphereGrad = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.35, this.radius * 0.1,
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

    // High-tech comic outline
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Color ID indicator glyph / icon inside
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.colorData.name[0], 0, 0);

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Orb = Orb;
