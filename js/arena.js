/**
 * Light-Wars: 2.5D Arena & Radiant White Light Refill Platform
 * Renders the high-res sci-fi rooftop arena map texture and bright beacon pad.
 */

class Arena {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    this.minX = 75;
    this.maxX = width - 75;
    this.minY = 75;
    this.maxY = height - 75;

    // Load custom arena map image
    this.mapImg = new Image();
    this.mapImg.src = 'assets/textures/arena_map.jpg';

    // White Light Sanctuary (lower-left quadrant)
    this.whiteLight = {
      x: Math.round(width * 0.245),
      y: Math.round(height * 0.443),
      radius: 95,
      pulseTime: 0,
      particles: []
    };

    // Barriers matching the Kenney Isometric Dungeon layout
    this.barriers = [
      { x: Math.round(width * 0.546) - 100, y: Math.round(height * 0.481) - 45, w: 200, h: 90 }, // Center Monument (columns + chest)
      { x: Math.round(width * 0.523) - 75, y: Math.round(height * 0.330) - 40, w: 150, h: 80 },  // Upper Barricade (crates/barrels)
      { x: Math.round(width * 0.732) - 70, y: Math.round(height * 0.538) - 45, w: 140, h: 90 },  // Right Bastion (column + barrels)
      { x: Math.round(width * 0.546) - 75, y: Math.round(height * 0.651) - 40, w: 150, h: 80 },  // Bottom Barricade (stacked barrels)
      { x: Math.round(width * 0.268) - 30, y: Math.round(height * 0.368) - 40, w: 60, h: 80 },   // Sanctuary Column 1
      { x: Math.round(width * 0.175) - 30, y: Math.round(height * 0.443) - 40, w: 60, h: 80 },   // Sanctuary Column 2
      { x: Math.round(width * 0.245) - 30, y: Math.round(height * 0.500) - 40, w: 60, h: 80 }    // Sanctuary Column 3
    ];
  }

  update(dt) {
    this.whiteLight.pulseTime += dt * 3.0;

    // Spawn intense upward beacon beams and light particles
    if (Math.random() < 0.85) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.whiteLight.radius * 0.9);
      this.whiteLight.particles.push({
        x: this.whiteLight.x + Math.cos(angle) * r,
        y: this.whiteLight.y + Math.sin(angle) * (r * 0.55),
        vy: -(60 + Math.random() * 90),
        vx: (Math.random() - 0.5) * 20,
        alpha: 1.0,
        size: 3 + Math.random() * 4
      });
    }

    for (let i = this.whiteLight.particles.length - 1; i >= 0; i--) {
      const p = this.whiteLight.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 1.8;
      if (p.alpha <= 0) {
        this.whiteLight.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // 1. Draw High-Res Sci-Fi Arena Map
    if (this.mapImg.complete && this.mapImg.naturalWidth > 0) {
      ctx.drawImage(this.mapImg, 0, 0, this.width, this.height);
    } else {
      // Fallback sci-fi floor
      ctx.fillStyle = '#0B0E1B';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Subtle arena edge vignette
    const vig = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.35,
      this.width / 2, this.height / 2, this.width * 0.65
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Brilliant Radiant White Light Refill Platform
    const wl = this.whiteLight;
    const pulse = 1.0 + Math.sin(wl.pulseTime) * 0.12;

    ctx.save();
    // Soft translucent cyan-white halo
    const haloGrad = ctx.createRadialGradient(wl.x, wl.y, wl.radius * 0.2, wl.x, wl.y, wl.radius * 1.5 * pulse);
    haloGrad.addColorStop(0, 'rgba(220, 245, 255, 0.35)');
    haloGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.15)');
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius * 1.5 * pulse, wl.radius * 0.85 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Translucent soft disc
    ctx.fillStyle = 'rgba(180, 230, 255, 0.22)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius, wl.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner delicate cyan energy ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius * 0.75, wl.radius * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating holographic tech runes
    ctx.save();
    ctx.translate(wl.x, wl.y);
    ctx.rotate(wl.pulseTime * 0.5);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.ellipse(0, 0, wl.radius * 0.6, wl.radius * 0.33, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Subtle translucent light shimmer
    const colGrad = ctx.createLinearGradient(wl.x, wl.y, wl.x, wl.y - 120);
    colGrad.addColorStop(0, 'rgba(200, 240, 255, 0.2)');
    colGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = colGrad;
    ctx.beginPath();
    ctx.moveTo(wl.x - wl.radius * 0.6, wl.y);
    ctx.lineTo(wl.x - wl.radius * 0.4, wl.y - 120);
    ctx.lineTo(wl.x + wl.radius * 0.4, wl.y - 120);
    ctx.lineTo(wl.x + wl.radius * 0.6, wl.y);
    ctx.closePath();
    ctx.fill();

    // White Light 3D Label
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 15px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ WHITE LIGHT REFILL ⚡', wl.x, wl.y - 18);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.fillText('STEP ON PAD TO RECHARGE RGB AMMO', wl.x, wl.y + 18);

    // Floating upward beacon particles
    for (const p of wl.particles) {
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Arena = Arena;
