/**
 * Light-Wars: 2.5D Arena & Radiant White Light Refill Platform
 * Manages 5520x3388 map rendering, White Light Sanctuary, and exact tile-based
 * corridor boundary collision and wall-sliding.
 */

class Arena {
  constructor(width, height) {
    this.width = width || 5520;
    this.height = height || 3388;

    this.originX = 2504;
    this.originY = 350;

    // Load custom arena map image
    this.mapImg = new Image();
    this.mapImg.src = 'assets/textures/arena_map.jpg';

    // White Light Sanctuary (lower-left courtyard)
    this.whiteLight = {
      x: 1352,
      y: 1502,
      radius: 190,
      pulseTime: 0,
      particles: []
    };

    // Load walkable grid tiles from map data
    this.walkable = new Set();
    const mapData = window.LightWars.DUNGEON_MAP_DATA;
    if (mapData && mapData.walkable_tiles) {
      if (mapData.origin_x !== undefined) this.originX = mapData.origin_x;
      if (mapData.origin_y !== undefined) this.originY = mapData.origin_y;
      for (const t of mapData.walkable_tiles) {
        this.walkable.add(`${t[0]}_${t[1]}`);
      }
    }
  }

  isWalkableTile(tx, ty) {
    return this.walkable.has(`${tx}_${ty}`);
  }

  toGrid(px, py) {
    const sx = px - 128.0 - this.originX;
    const sy = py - 64.0 - this.originY;
    const gx = (sx / 256.0) + (sy / 128.0);
    const gy = (sy / 128.0) - (sx / 256.0);
    return { gx, gy };
  }

  toScreen(gx, gy) {
    const sx = (gx - gy) * 128.0;
    const sy = (gx + gy) * 64.0;
    return { x: sx + 128.0 + this.originX, y: sy + 64.0 + this.originY };
  }

  // Exact boundary collision & wall sliding
  resolveMovement(oldX, oldY, newX, newY) {
    const oldGrid = this.toGrid(oldX, oldY);
    const newGrid = this.toGrid(newX, newY);

    const targetTx = Math.round(newGrid.gx);
    const targetTy = Math.round(newGrid.gy);

    let candGx = newGrid.gx;
    let candGy = newGrid.gy;

    const PAD = 0.36;

    if (!this.isWalkableTile(targetTx, targetTy)) {
      // Try X slide
      const slideX_Tx = Math.round(newGrid.gx);
      const slideX_Ty = Math.round(oldGrid.gy);

      // Try Y slide
      const slideY_Tx = Math.round(oldGrid.gx);
      const slideY_Ty = Math.round(newGrid.gy);

      if (this.isWalkableTile(slideX_Tx, slideX_Ty)) {
        candGy = oldGrid.gy;
      } else if (this.isWalkableTile(slideY_Tx, slideY_Ty)) {
        candGx = oldGrid.gx;
      } else {
        return { x: oldX, y: oldY };
      }
    }

    // Clamp inside walkable corridor boundaries
    const curTx = Math.round(candGx);
    const curTy = Math.round(candGy);

    if (this.isWalkableTile(curTx, curTy)) {
      if (!this.isWalkableTile(curTx + 1, curTy)) candGx = Math.min(curTx + PAD, candGx);
      if (!this.isWalkableTile(curTx - 1, curTy)) candGx = Math.max(curTx - PAD, candGx);
      if (!this.isWalkableTile(curTx, curTy + 1)) candGy = Math.min(curTy + PAD, candGy);
      if (!this.isWalkableTile(curTx, curTy - 1)) candGy = Math.max(curTy - PAD, candGy);
    } else {
      return { x: oldX, y: oldY };
    }

    return this.toScreen(candGx, candGy);
  }

  // Check if laser hit wall/void
  isPointBlocked(px, py) {
    const g = this.toGrid(px, py);
    const tx = Math.round(g.gx);
    const ty = Math.round(g.gy);
    return !this.isWalkableTile(tx, ty);
  }

  update(dt) {
    this.whiteLight.pulseTime += dt * 3.0;

    // Upward particles inside sanctuary
    if (Math.random() < 0.6) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.whiteLight.radius * 0.85);
      this.whiteLight.particles.push({
        x: this.whiteLight.x + Math.cos(angle) * r,
        y: this.whiteLight.y + Math.sin(angle) * (r * 0.55),
        vy: -(60 + Math.random() * 80),
        vx: (Math.random() - 0.5) * 15,
        alpha: 1.0,
        size: 2.5 + Math.random() * 3
      });
    }

    for (let i = this.whiteLight.particles.length - 1; i >= 0; i--) {
      const p = this.whiteLight.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 1.6;
      if (p.alpha <= 0) {
        this.whiteLight.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // 1. Draw High-Res 5520x3388 2.5D Dungeon Map
    if (this.mapImg.complete && this.mapImg.naturalWidth > 0) {
      ctx.drawImage(this.mapImg, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#08090E';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Draw Radiant White Light Sanctuary at (1352, 1502)
    const wl = this.whiteLight;
    const pulse = 1.0 + Math.sin(wl.pulseTime) * 0.12;

    ctx.save();
    // Halo glow
    const haloGrad = ctx.createRadialGradient(wl.x, wl.y, wl.radius * 0.2, wl.x, wl.y, wl.radius * 1.4 * pulse);
    haloGrad.addColorStop(0, 'rgba(230, 248, 255, 0.40)');
    haloGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.18)');
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius * 1.4 * pulse, wl.radius * 0.75 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Runic energy disc
    ctx.fillStyle = 'rgba(180, 230, 255, 0.25)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius, wl.radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius * 0.75, wl.radius * 0.39, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Runes
    ctx.save();
    ctx.translate(wl.x, wl.y);
    ctx.rotate(wl.pulseTime * 0.4);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.ellipse(0, 0, wl.radius * 0.6, wl.radius * 0.31, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3D Label
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 18px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ WHITE LIGHT REFILL ⚡', wl.x, wl.y - 25);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.fillText('STAND HERE TO RECHARGE HP & AMMO', wl.x, wl.y + 25);

    // Floating upward particles
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
