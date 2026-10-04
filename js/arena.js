/**
 * Light-Wars: Arena & Recharge Station Manager
 * Supports Level 1 (Sci-Fi Chamber Map from map_collision.json)
 * and Level 2 (Dungeon Arena).
 * Implements exact projective homography transformation, continuous
 * body collision checking, and smooth wall-sliding.
 */

class Arena {
  constructor(width, height) {
    this.currentLevel = 1;
    this.mapImg = new Image();
    this.whiteLight = {
      x: 3425,
      y: 1091,
      radius: 75,
      pulseTime: 0,
      particles: []
    };

    this.loadLevel(1);
  }

  loadLevel(levelNum = 1) {
    this.currentLevel = levelNum;

    if (levelNum === 1 && window.LightWars.LEVEL1_MAP_DATA) {
      const data = window.LightWars.LEVEL1_MAP_DATA;
      this.cols = data.cols;
      this.rows = data.rows;
      this.scale = data.scale !== undefined ? data.scale : 1.0;
      this.width = data.width || Math.round(1536 * this.scale);
      this.height = data.height || Math.round(1024 * this.scale);
      this.blocked = data.blocked;
      this.proj = data.proj;
      this.spawn = data.spawn;

      this.whiteLight = {
        x: data.whiteLight.x,
        y: data.whiteLight.y,
        radius: data.whiteLight.radius,
        pulseTime: 0,
        particles: []
      };

      this.mapImg.src = 'assets/textures/level1_map.png';
    } else {
      // Fallback / Level 2 Dungeon Arena
      const data = window.LightWars.DUNGEON_MAP_DATA || {};
      this.cols = 24;
      this.rows = 18;
      this.scale = 1.0;
      this.width = data.width || 5520;
      this.height = data.height || 3388;
      this.originX = data.origin_x !== undefined ? data.origin_x : 2504;
      this.originY = data.origin_y !== undefined ? data.origin_y : 350;
      this.blocked = null;
      this.proj = null;

      this.walkable = new Set();
      if (data.walkable_tiles) {
        for (const t of data.walkable_tiles) {
          this.walkable.add(`${t[0]}_${t[1]}`);
        }
      }

      this.whiteLight = {
        x: data.whiteLight ? data.whiteLight.x : 1352,
        y: data.whiteLight ? data.whiteLight.y : 1502,
        radius: data.whiteLight ? data.whiteLight.radius : 190,
        pulseTime: 0,
        particles: []
      };

      this.mapImg.src = 'assets/textures/arena_map.jpg';
    }
  }

  /**
   * Convert World / Screen coordinates (px, py) to fractional grid coordinates (c, r)
   */
  toGrid(px, py) {
    if (this.currentLevel === 1 && this.proj) {
      const x = px / this.scale;
      const y = py / this.scale;
      const p = this.proj;

      const A1 = p.a - p.g * x;
      const B1 = p.b - p.h * x;
      const C1 = x - p.x0;
      const A2 = p.d_ - p.g * y;
      const B2 = p.e - p.h * y;
      const C2 = y - p.y0;

      const det = A1 * B2 - A2 * B1;
      if (Math.abs(det) < 1e-12) {
        return { c: -1, r: -1, gx: -1, gy: -1 };
      }

      const u = (C1 * B2 - C2 * B1) / det;
      const v = (A1 * C2 - A2 * C1) / det;
      const c = u * this.cols;
      const r = v * this.rows;
      return { c, r, gx: c, gy: r };
    }

    // Level 2 / Classic 2:1 isometric formula
    const sx = px - 128.0 - (this.originX || 2504);
    const sy = py - 64.0 - (this.originY || 350);
    const gx = (sx / 256.0) + (sy / 128.0);
    const gy = (sy / 128.0) - (sx / 256.0);
    return { c: gx, r: gy, gx, gy };
  }

  /**
   * Convert fractional grid coordinates (c, r) to World / Screen coordinates (x, y)
   */
  toScreen(c, r) {
    if (this.currentLevel === 1 && this.proj) {
      const p = this.proj;
      const u = c / this.cols;
      const v = r / this.rows;
      const w = p.g * u + p.h * v + 1;
      const x = ((p.a * u + p.b * v + p.x0) / w) * this.scale;
      const y = ((p.d_ * u + p.e * v + p.y0) / w) * this.scale;
      return { x, y };
    }

    // Level 2 / Classic 2:1 isometric formula
    const sx = (c - r) * 128.0;
    const sy = (c + r) * 64.0;
    return {
      x: sx + 128.0 + (this.originX || 2504),
      y: sy + 64.0 + (this.originY || 350)
    };
  }

  /**
   * Check if integer tile (c, r) is walkable
   */
  isWalkableTile(c, r) {
    const tc = Math.floor(c);
    const tr = Math.floor(r);

    if (this.currentLevel === 1 && this.blocked) {
      if (tc < 0 || tr < 0 || tc >= this.cols || tr >= this.rows) return false;
      return this.blocked[tr][tc] === 0;
    }

    if (this.walkable) {
      return this.walkable.has(`${Math.round(c)}_${Math.round(r)}`);
    }

    return true;
  }

  /**
   * Check if point (px, py) is inside a blocked tile or out of bounds
   */
  isPointBlocked(px, py) {
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return true;
    const g = this.toGrid(px, py);
    return !this.isWalkableTile(g.c, g.r);
  }

  /**
   * Check if character collision body centered at (px, py) intersects any blocked tile
   */
  isBodyBlocked(px, py, radius = 18) {
    if (this.isPointBlocked(px, py)) return true;

    // Test 8 points on ground ellipse (compressed vertically for isometric angle)
    const angles = [0, 0.785, 1.571, 2.356, 3.142, 3.927, 4.712, 5.498];
    for (let i = 0; i < 8; i++) {
      const ang = angles[i];
      const sx = px + Math.cos(ang) * radius;
      const sy = py + Math.sin(ang) * (radius * 0.52);
      if (this.isPointBlocked(sx, sy)) return true;
    }

    return false;
  }

  /**
   * Smooth movement collision resolution with wall sliding
   */
  resolveMovement(oldX, oldY, newX, newY, radius = 18) {
    // 1. Direct path check
    if (!this.isBodyBlocked(newX, newY, radius)) {
      return { x: newX, y: newY };
    }

    // 2. Sliding along World X axis
    if (!this.isBodyBlocked(newX, oldY, radius)) {
      return { x: newX, y: oldY };
    }

    // 3. Sliding along World Y axis
    if (!this.isBodyBlocked(oldX, newY, radius)) {
      return { x: oldX, y: newY };
    }

    if (this.currentLevel === 1 && this.proj) {
      // 4. Sliding along isometric grid tangents
      const oldG = this.toGrid(oldX, oldY);
      const newG = this.toGrid(newX, newY);

      // Tangent C-axis
      const candC = this.toScreen(newG.c, oldG.r);
      if (!this.isBodyBlocked(candC.x, candC.y, radius)) {
        return { x: candC.x, y: candC.y };
      }

      // Tangent R-axis
      const candR = this.toScreen(oldG.c, newG.r);
      if (!this.isBodyBlocked(candR.x, candR.y, radius)) {
        return { x: candR.x, y: candR.y };
      }

      // Fractional sub-step
      for (let frac = 0.75; frac >= 0.25; frac -= 0.25) {
        const mx = oldX + (newX - oldX) * frac;
        const my = oldY + (newY - oldY) * frac;
        if (!this.isBodyBlocked(mx, my, radius)) {
          return { x: mx, y: my };
        }
      }
    }

    // Blocked: remain at old position
    return { x: oldX, y: oldY };
  }

  /**
   * Safety check: push entity back onto nearest walkable floor if ever inside a blocked tile
   */
  pushOutOfWall(px, py, radius = 18) {
    if (!this.isPointBlocked(px, py)) return { x: px, y: py };

    const g = this.toGrid(px, py);
    const tc = Math.floor(g.c);
    const tr = Math.floor(g.r);

    let bestDist = Infinity;
    let bestX = px;
    let bestY = py;

    if (this.currentLevel === 1 && this.blocked) {
      for (let dr = -4; dr <= 4; dr++) {
        for (let dc = -4; dc <= 4; dc++) {
          const nc = tc + dc;
          const nr = tr + dr;
          if (nc >= 0 && nr >= 0 && nc < this.cols && nr < this.rows && this.blocked[nr][nc] === 0) {
            const cand = this.toScreen(nc + 0.5, nr + 0.5);
            const d = Math.hypot(cand.x - px, cand.y - py);
            if (d < bestDist) {
              bestDist = d;
              bestX = cand.x;
              bestY = cand.y;
            }
          }
        }
      }
    }
    return { x: bestX, y: bestY };
  }

  update(dt) {
    this.whiteLight.pulseTime += dt * 3.0;

    // Upward glowing energy particles inside sanctuary
    if (Math.random() < 0.55) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.whiteLight.radius * 0.85);
      this.whiteLight.particles.push({
        x: this.whiteLight.x + Math.cos(angle) * r,
        y: this.whiteLight.y + Math.sin(angle) * (r * 0.52),
        vy: -(50 + Math.random() * 70),
        vx: (Math.random() - 0.5) * 12,
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
    // 1. Draw Map Image
    if (this.mapImg.complete && this.mapImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.mapImg, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#08090E';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Draw Radiant Recharge Station
    const wl = this.whiteLight;
    const pulse = 1.0 + Math.sin(wl.pulseTime) * 0.12;

    ctx.save();
    // Halo glow
    const haloGrad = ctx.createRadialGradient(
      wl.x, wl.y, wl.radius * 0.2,
      wl.x, wl.y, wl.radius * 1.35 * pulse
    );
    haloGrad.addColorStop(0, 'rgba(230, 248, 255, 0.40)');
    haloGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.18)');
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius * 1.35 * pulse, wl.radius * 0.70 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Runic energy disc
    ctx.fillStyle = 'rgba(180, 230, 255, 0.25)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius, wl.radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius * 0.75, wl.radius * 0.39, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating runic runes
    ctx.save();
    ctx.translate(wl.x, wl.y);
    ctx.rotate(wl.pulseTime * 0.4);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.ellipse(0, 0, wl.radius * 0.58, wl.radius * 0.30, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3D Label: Only display RECHARGE STATION with zero extra text
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 17px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RECHARGE STATION', wl.x, wl.y + 4);

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
