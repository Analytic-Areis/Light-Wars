/**
 * Light-Wars: 2.5D Arena & White Light Refill Platform
 */

class Arena {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    this.minX = 60;
    this.maxX = width - 60;
    this.minY = 60;
    this.maxY = height - 60;

    // White Light Spawn & Refill Zone
    this.whiteLight = {
      x: 220,
      y: height / 2,
      radius: window.LightWars.GAME_CONFIG.whiteLightRadius,
      pulseTime: 0,
      particles: []
    };

    // Tech obstacles / Cover pillars
    this.pillars = [
      { x: 500, y: 320, radius: 40 },
      { x: 500, y: height - 320, radius: 40 },
      { x: 1050, y: 320, radius: 40 },
      { x: 1050, y: height - 320, radius: 40 },
      { x: 800, y: height / 2, radius: 55 }
    ];
  }

  update(dt) {
    this.whiteLight.pulseTime += dt * 2.5;

    // Spawn upward light particles from White Light
    if (Math.random() < 0.6) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.whiteLight.radius * 0.85);
      this.whiteLight.particles.push({
        x: this.whiteLight.x + Math.cos(angle) * r,
        y: this.whiteLight.y + Math.sin(angle) * (r * 0.6),
        vy: -(30 + Math.random() * 50),
        alpha: 1.0,
        size: 2 + Math.random() * 3
      });
    }

    for (let i = this.whiteLight.particles.length - 1; i >= 0; i--) {
      const p = this.whiteLight.particles[i];
      p.y += p.vy * dt;
      p.alpha -= dt * 1.5;
      if (p.alpha <= 0) {
        this.whiteLight.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // 1. Draw Sci-Fi Hex / Grid Floor
    ctx.save();
    ctx.fillStyle = '#0B0D19';
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid lines with perspective tint
    ctx.strokeStyle = 'rgba(40, 50, 85, 0.4)';
    ctx.lineWidth = 1.5;
    const tileSize = 80;

    for (let x = 0; x < this.width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Outer boundary walls with comic hazard lines
    ctx.strokeStyle = '#2B3352';
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, this.width - 60, this.height - 60);

    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, this.width - 60, this.height - 60);

    // 2. Draw White Light Spawn Platform
    const wl = this.whiteLight;
    const pulse = 1 + Math.sin(wl.pulseTime) * 0.08;

    // Glowing base halo
    const haloGrad = ctx.createRadialGradient(wl.x, wl.y, wl.radius * 0.2, wl.x, wl.y, wl.radius * 1.6 * pulse);
    haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    haloGrad.addColorStop(0.4, 'rgba(210, 240, 255, 0.35)');
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius * 1.6 * pulse, wl.radius * 0.9 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Solid inner pad
    ctx.fillStyle = '#182035';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius, wl.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotating holographic tech ring
    ctx.save();
    ctx.translate(wl.x, wl.y);
    ctx.rotate(wl.pulseTime * 0.5);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.ellipse(0, 0, wl.radius * 0.75, wl.radius * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // White Light label & icon
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WHITE LIGHT', wl.x, wl.y - 12);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.fillText('⚡ REFILL PAD ⚡', wl.x, wl.y + 14);

    // Floating upward particles
    for (const p of wl.particles) {
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 3. Draw Tech Pillars with 2.5D height
    for (const pil of this.pillars) {
      // Base shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(pil.x, pil.y + 15, pil.radius * 1.2, pil.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pillar cylinder base
      const pilGrad = ctx.createLinearGradient(pil.x - pil.radius, pil.y, pil.x + pil.radius, pil.y);
      pilGrad.addColorStop(0, '#1E2438');
      pilGrad.addColorStop(0.5, '#384266');
      pilGrad.addColorStop(1, '#151928');

      ctx.fillStyle = pilGrad;
      ctx.beginPath();
      ctx.ellipse(pil.x, pil.y, pil.radius, pil.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pillar cap
      ctx.fillStyle = '#4B5888';
      ctx.beginPath();
      ctx.ellipse(pil.x, pil.y - 28, pil.radius * 0.9, pil.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Top glowing energy conduit
      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.arc(pil.x, pil.y - 28, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Arena = Arena;
