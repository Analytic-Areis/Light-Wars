/**
 * Light-Wars: Arena & Recharge Station Manager
 * Supports:
 * - Level 1: Starting Map (map2.png, map_collision.json)
 * - Level 2: Starting Map (map2.png, map_collision.json)
 * - Level 3: Black Boss Map (Isometric Sci-Fi Reactor Chamber.png, blackboss_map.json, occluder8_front.png)
 * - White Boss Map (Untitled design.png, whiteboss_map.json)
 *
 * Implements exact projective homography transformation, continuous
 * body collision checking, smooth wall-sliding, and 1x1 tile character scaling.
 */

class Arena {
  constructor(width, height) {
    this.currentLevel = 1;
    this.mapImg = new Image();
    this.whiteLight = {
      x: 856,
      y: 273,
      radius: 45,
      pulseTime: 0,
      particles: []
    };

    this.loadLevel(1);
  }

  static computeProj(corners) {
    if (!corners || corners.length < 4) return null;
    const [p0, p1, p2, p3] = corners;
    const [x0, y0] = p0, [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const D = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(D) < 1e-12) return null;
    const g = (dx3 * dy2 - dx2 * dy3) / D, h = (dx1 * dy3 - dx3 * dy1) / D;
    const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3;
    const d_ = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
    return { a, b, d_, e, g, h, x0, y0 };
  }

  loadLevel(levelNum = 1) {
    this.currentLevel = levelNum;

    // Load centralized map configuration
    let config = null;
    if (levelNum === 1) {
      config = window.LightWars.LEVEL1_MAP_CONFIG || window.LightWars.MAP_CONFIG || {};
    } else if (levelNum === 2) {
      config = window.LightWars.LEVEL2_MAP_CONFIG || window.LightWars.MAP_CONFIG || {};
    } else if (levelNum === 3) {
      config = window.LightWars.LEVEL3_MAP_CONFIG || window.LightWars.MAP_CONFIG || {};
    } else {
      config = window.LightWars.MAP_CONFIG || {};
    }

    this.scale = config.scale !== undefined ? config.scale : 1.0;
    this.width = config.width || 1536;
    this.height = config.height || 1024;
    this.ignoreBoundaries = config.ignoreBoundaries !== undefined ? config.ignoreBoundaries : false;
    this.bounds = config.bounds || { minX: 0, minY: 0, maxX: this.width, maxY: this.height };

    this.cols = config.cols || 36;
    this.rows = config.rows || 24;
    this.blocked = config.blocked || null;
    this.corners = config.corners || null;
    this.proj = config.proj || (config.corners ? Arena.computeProj(config.corners) : null);
    this.spawn = config.spawn || { x: Math.round(this.width / 2), y: Math.round(this.height / 2) };
    this.occluders = config.occluders || [];

    const wl = config.whiteLight || {};
    this.whiteLight = {
      x: wl.x !== undefined ? wl.x : (this.spawn ? this.spawn.x : Math.round(this.width / 2)),
      y: wl.y !== undefined ? wl.y : (this.spawn ? this.spawn.y : Math.round(this.height / 2)),
      radius: wl.radius || 45,
      pulseTime: 0,
      particles: []
    };

    this.mapImg = new Image();
    this.mapImg.onload = () => {
      if (this.mapImg.naturalWidth > 0 && this.mapImg.naturalHeight > 0) {
        this.width = this.mapImg.naturalWidth;
        this.height = this.mapImg.naturalHeight;
      }
    };
    this.mapImg.src = config.imageSrc || 'assets/map_stuff/starting_map.png';
  }

  /**
   * Convert World / Screen coordinates (px, py) to fractional grid coordinates (c, r)
   */
  toGrid(px, py) {
    if (this.proj) {
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

    return { c: px / 50, r: py / 30, gx: px / 50, gy: py / 30 };
  }

  /**
   * Convert fractional grid coordinates (c, r) to World / Screen coordinates (x, y)
   */
  toScreen(c, r) {
    if (this.proj) {
      const p = this.proj;
      const u = c / this.cols;
      const v = r / this.rows;
      const w = p.g * u + p.h * v + 1;
      const x = ((p.a * u + p.b * v + p.x0) / w) * this.scale;
      const y = ((p.d_ * u + p.e * v + p.y0) / w) * this.scale;
      return { x, y };
    }

    return { x: c * 50, y: r * 30 };
  }

  /**
   * Check if integer tile (c, r) is blocked (treats out of bounds as blocked)
   */
  isBlocked(c, r) {
    return c < 0 || r < 0 || c >= this.cols || r >= this.rows || (this.blocked && this.blocked[r][c] === 1);
  }

  /**
   * Check if tile (c, r) is walkable
   */
  isWalkableTile(c, r) {
    if (this.ignoreBoundaries) return true;
    const tc = Math.floor(c);
    const tr = Math.floor(r);
    return !this.isBlocked(tc, tr);
  }

  /**
   * Check if point (px, py) is inside a blocked tile or out of bounds
   */
  isPointBlocked(px, py) {
    if (this.ignoreBoundaries) return false;
    if (this.bounds) {
      if (px < this.bounds.minX || py < this.bounds.minY || px >= this.bounds.maxX || py >= this.bounds.maxY) {
        return true;
      }
    } else if (px < 0 || py < 0 || px >= this.width || py >= this.height) {
      return true;
    }

    const g = this.toGrid(px, py);
    return !this.isWalkableTile(g.c, g.r);
  }

  /**
   * Check if character collision body centered at (px, py) intersects any blocked tile
   * Uses 1x1 tile collision radius (~12px)
   */
  isBodyBlocked(px, py, radius = 12) {
    if (this.ignoreBoundaries) return false;
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
  resolveMovement(oldX, oldY, newX, newY, radius = 12) {
    if (this.ignoreBoundaries) {
      return { x: newX, y: newY };
    }

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

    if (this.proj) {
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
  pushOutOfWall(px, py, radius = 12) {
    if (this.ignoreBoundaries) return { x: px, y: py };
    if (!this.isPointBlocked(px, py)) return { x: px, y: py };

    const g = this.toGrid(px, py);
    const tc = Math.floor(g.c);
    const tr = Math.floor(g.r);

    let bestDist = Infinity;
    let bestX = px;
    let bestY = py;

    if (this.blocked) {
      for (let dr = -5; dr <= 5; dr++) {
        for (let dc = -5; dc <= 5; dc++) {
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
    if (Math.random() < 0.45) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.whiteLight.radius * 0.85);
      this.whiteLight.particles.push({
        x: this.whiteLight.x + Math.cos(angle) * r,
        y: this.whiteLight.y + Math.sin(angle) * (r * 0.52),
        vy: -(40 + Math.random() * 50),
        vx: (Math.random() - 0.5) * 10,
        alpha: 1.0,
        size: 2.0 + Math.random() * 2.5
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
    if (this.mapImg && this.mapImg.complete && this.mapImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.mapImg, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#08090E';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Draw Radiant Recharge Station
    const wl = this.whiteLight;
    if (wl && wl.radius > 0) {
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
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(wl.x, wl.y, wl.radius, wl.radius * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(wl.x, wl.y, wl.radius * 0.75, wl.radius * 0.39, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating runic runes
      ctx.save();
      ctx.translate(wl.x, wl.y);
      ctx.rotate(wl.pulseTime * 0.4);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 0, wl.radius * 0.58, wl.radius * 0.30, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3D Label: Only display RECHARGE STATION
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 13px "Impact", "Arial Black", sans-serif';
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
}

window.LightWars = window.LightWars || {};
window.LightWars.Arena = Arena;
