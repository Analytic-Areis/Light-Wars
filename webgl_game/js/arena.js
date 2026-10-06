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

    // Deep Galaxy & Cosmic Space Backdrop System
    this.galaxyTime = 0;
    this.stars = [];
    this.planets = [];
    this.shootingStars = [];
    this.initGalaxyBackdrop();

    this.loadLevel(1);
  }

  initGalaxyBackdrop() {
    this.stars = [];
    // 3 layers of stars spanning a large canvas region (-1000 to 2600, -1000 to 2200)
    const bounds = { minX: -1000, maxX: 2600, minY: -1000, maxY: 2200 };
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;

    // Distant twinkle stars
    for (let i = 0; i < 280; i++) {
      this.stars.push({
        x: bounds.minX + Math.random() * w,
        y: bounds.minY + Math.random() * h,
        radius: 0.6 + Math.random() * 1.4,
        baseAlpha: 0.35 + Math.random() * 0.55,
        twinkleSpeed: 1.5 + Math.random() * 3.5,
        twinklePhase: Math.random() * Math.PI * 2,
        color: ['#FFFFFF', '#B8D5FF', '#FFE8D6', '#00F0FF', '#FFB8E8'][Math.floor(Math.random() * 5)],
        layer: 1
      });
    }

    // Mid-ground brighter stars with diffraction crosses
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: bounds.minX + Math.random() * w,
        y: bounds.minY + Math.random() * h,
        radius: 1.5 + Math.random() * 1.5,
        baseAlpha: 0.7 + Math.random() * 0.3,
        twinkleSpeed: 2.0 + Math.random() * 2.5,
        twinklePhase: Math.random() * Math.PI * 2,
        color: ['#FFFFFF', '#D0E8FF', '#FFEABF', '#80FFFF'][Math.floor(Math.random() * 4)],
        hasSpikes: Math.random() < 0.45,
        layer: 2
      });
    }

    // Distant Majestic Planets visible outside the station edges
    this.planets = [
      // 1. Giant Ringed Gas Planet (Upper Right edge)
      {
        x: 1720,
        y: 180,
        radius: 110,
        primaryColor: '#6B3FA0',
        secondaryColor: '#B24BF3',
        atmosphereColor: 'rgba(178, 75, 243, 0.4)',
        hasRings: true,
        ringColor: 'rgba(215, 160, 255, 0.45)',
        ringTilt: -0.42,
        ringInner: 140,
        ringOuter: 220,
        glowRadius: 180,
        craters: []
      },
      // 2. Cyan Glowing Ice / Terra World (Bottom Right edge)
      {
        x: 1580,
        y: 920,
        radius: 85,
        primaryColor: '#0A3B5C',
        secondaryColor: '#00F0FF',
        atmosphereColor: 'rgba(0, 240, 255, 0.5)',
        hasRings: false,
        glowRadius: 130,
        craters: [
          { dx: -20, dy: -15, r: 18, color: '#00D1FF' },
          { dx: 25, dy: 10, r: 24, color: '#00A8FF' },
          { dx: -5, dy: 30, r: 12, color: '#00F0FF' }
        ]
      },
      // 3. Volcanic Crimson / Magma Dwarf Planet (Bottom Left edge)
      {
        x: -280,
        y: 720,
        radius: 95,
        primaryColor: '#4A1118',
        secondaryColor: '#FF2A4D',
        atmosphereColor: 'rgba(255, 42, 77, 0.45)',
        hasRings: false,
        glowRadius: 150,
        craters: [
          { dx: -25, dy: -20, r: 22, color: '#FF4D66' },
          { dx: 15, dy: -10, r: 16, color: '#FFA04D' },
          { dx: 10, dy: 25, r: 28, color: '#FF1A35' }
        ]
      },
      // 4. Golden Sun / Radiant Star Cluster (Upper Left deep void)
      {
        x: -220,
        y: -140,
        radius: 125,
        primaryColor: '#5C380A',
        secondaryColor: '#FFE600',
        atmosphereColor: 'rgba(255, 230, 0, 0.4)',
        hasRings: true,
        ringColor: 'rgba(255, 230, 100, 0.35)',
        ringTilt: 0.35,
        ringInner: 155,
        ringOuter: 205,
        glowRadius: 210,
        craters: []
      }
    ];
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
    this.boundaryEdges = this.computeBoundaryEdges();
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
   * Safety check: push entity back onto valid walkable floor with full body radius clearance
   */
  pushOutOfWall(px, py, radius = 12) {
    if (this.ignoreBoundaries) return { x: px, y: py };
    if (!this.isBodyBlocked(px, py, radius)) return { x: px, y: py };

    let curX = px, curY = py;
    const angles = [0, 0.785, 1.571, 2.356, 3.142, 3.927, 4.712, 5.498];

    // Phase 1: Iterative continuous outward nudge away from blocked perimeter points
    for (let step = 0; step < 4; step++) {
      let pushX = 0, pushY = 0, blockedCount = 0;
      if (this.isPointBlocked(curX, curY)) {
        blockedCount += 2;
      }
      for (let i = 0; i < 8; i++) {
        const ang = angles[i];
        const sx = curX + Math.cos(ang) * radius;
        const sy = curY + Math.sin(ang) * (radius * 0.52);
        if (this.isPointBlocked(sx, sy)) {
          pushX -= Math.cos(ang);
          pushY -= Math.sin(ang) * 0.52;
          blockedCount++;
        }
      }
      if (blockedCount === 0) break;
      const len = Math.hypot(pushX, pushY);
      if (len > 0.001) {
        curX += (pushX / len) * 7.0;
        curY += (pushY / len) * 7.0;
        if (!this.isBodyBlocked(curX, curY, radius)) {
          return { x: curX, y: curY };
        }
      }
    }

    // Phase 2: Search neighboring grid tiles for closest tile with full body clearance
    const g = this.toGrid(px, py);
    const tc = Math.floor(g.c);
    const tr = Math.floor(g.r);

    let bestDist = Infinity;
    let bestX = px;
    let bestY = py;

    if (this.blocked) {
      for (let dr = -6; dr <= 6; dr++) {
        for (let dc = -6; dc <= 6; dc++) {
          const nc = tc + dc;
          const nr = tr + dr;
          if (nc >= 0 && nr >= 0 && nc < this.cols && nr < this.rows && this.blocked[nr][nc] === 0) {
            const cand = this.toScreen(nc + 0.5, nr + 0.5);
            if (!this.isBodyBlocked(cand.x, cand.y, radius)) {
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

      // Phase 3: Global map search if pushed far out of bounds
      if (bestDist === Infinity) {
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            if (this.blocked[r][c] === 0) {
              const cand = this.toScreen(c + 0.5, r + 0.5);
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

      // Safe fallback to hero spawn
      if (bestDist === Infinity && this.spawn) {
        bestX = this.spawn.x;
        bestY = this.spawn.y;
      }
    }
    return { x: bestX, y: bestY };
  }

  /**
   * Precompute boundary perimeter edges separating walkable tiles (0) from blocked tiles (1)
   */
  computeBoundaryEdges() {
    if (!this.blocked || !this.cols || !this.rows) return [];
    const edges = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.blocked[r][c] !== 0) continue; // Walkable tiles only

        // Top-Right edge: (c, r) -> (c + 1, r)
        if (r === 0 || this.blocked[r - 1][c] === 1) {
          edges.push({ p1: this.toScreen(c, r), p2: this.toScreen(c + 1, r) });
        }
        // Bottom-Right edge: (c + 1, r) -> (c + 1, r + 1)
        if (c === this.cols - 1 || this.blocked[r][c + 1] === 1) {
          edges.push({ p1: this.toScreen(c + 1, r), p2: this.toScreen(c + 1, r + 1) });
        }
        // Bottom-Left edge: (c + 1, r + 1) -> (c, r + 1)
        if (r === this.rows - 1 || this.blocked[r + 1][c] === 1) {
          edges.push({ p1: this.toScreen(c + 1, r + 1), p2: this.toScreen(c, r + 1) });
        }
        // Top-Left edge: (c, r + 1) -> (c, r)
        if (c === 0 || this.blocked[r][c - 1] === 1) {
          edges.push({ p1: this.toScreen(c, r + 1), p2: this.toScreen(c, r) });
        }
      }
    }
    return edges;
  }

  /**
   * Render glowing sci-fi holographic perimeter demarcating the clear arena boundaries
   */
  drawArenaBoundaries(ctx) {
    if (!this.boundaryEdges || this.boundaryEdges.length === 0) return;
    ctx.save();
    const pulse = 0.65 + 0.25 * Math.sin(this.galaxyTime * 2.2);

    // 1. Soft atmospheric outer glow
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.40 * pulse})`;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let i = 0; i < this.boundaryEdges.length; i++) {
      const e = this.boundaryEdges[i];
      ctx.moveTo(e.p1.x, e.p1.y);
      ctx.lineTo(e.p2.x, e.p2.y);
    }
    ctx.stroke();

    // 2. Crisp bright neon laser perimeter line
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(215, 250, 255, ${0.80 * pulse})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < this.boundaryEdges.length; i++) {
      const e = this.boundaryEdges[i];
      ctx.moveTo(e.p1.x, e.p1.y);
      ctx.lineTo(e.p2.x, e.p2.y);
    }
    ctx.stroke();

    ctx.restore();
  }

  update(dt) {
    this.whiteLight.pulseTime += dt * 3.0;
    this.galaxyTime += dt;

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

    // Occasional shooting star across deep space
    if (Math.random() < 0.02) {
      const sx = -400 + Math.random() * 2000;
      const sy = -400 + Math.random() * 600;
      const angle = Math.PI * 0.25 + (Math.random() - 0.5) * 0.4;
      const speed = 700 + Math.random() * 500;
      this.shootingStars.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: 80 + Math.random() * 70,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.2
      });
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      ss.life -= dt;
      if (ss.life <= 0) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // 0. Draw Infinite Deep Galaxy & Cosmic Space Backdrop
    this.drawGalaxyBackdrop(ctx);

    // 1. Draw Map Image (Isometric Sci-Fi Station floating in space)
    if (this.mapImg && this.mapImg.complete && this.mapImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.mapImg, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = 'rgba(8, 9, 14, 0.4)';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 1.5. Draw Clear Holographic Arena Boundaries
    this.drawArenaBoundaries(ctx);

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

  /**
   * Render Infinite Galaxy Backdrop with Twinkling Stars, Cosmic Nebulae, and Glowing Planets
   */
  drawGalaxyBackdrop(ctx) {
    ctx.save();

    const minX = -1000;
    const minY = -1000;
    const maxX = 2600;
    const maxY = 2200;
    const width = maxX - minX;
    const height = maxY - minY;

    // 1. Deep Space Cosmic Sky Gradient
    const spaceGrad = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.5, 200,
      this.width * 0.5, this.height * 0.5, 1600
    );
    spaceGrad.addColorStop(0.0, '#060814'); // Center deep navy void
    spaceGrad.addColorStop(0.4, '#04060E');
    spaceGrad.addColorStop(0.75, '#020308');
    spaceGrad.addColorStop(1.0, '#010204'); // Edge deep black void

    ctx.fillStyle = spaceGrad;
    ctx.fillRect(minX, minY, width, height);

    // 2. Cosmic Nebulae Clouds (Ethereal Purple, Cyan, and Magenta dust clouds)
    // Purple Nebula (Upper Right)
    const neb1 = ctx.createRadialGradient(1600, 250, 40, 1600, 250, 550);
    neb1.addColorStop(0.0, 'rgba(120, 40, 200, 0.28)');
    neb1.addColorStop(0.45, 'rgba(60, 20, 140, 0.15)');
    neb1.addColorStop(0.8, 'rgba(20, 10, 60, 0.05)');
    neb1.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb1;
    ctx.fillRect(minX, minY, width, height);

    // Cyan Nebula (Bottom Right)
    const neb2 = ctx.createRadialGradient(1500, 950, 50, 1500, 950, 600);
    neb2.addColorStop(0.0, 'rgba(0, 180, 255, 0.22)');
    neb2.addColorStop(0.5, 'rgba(0, 80, 160, 0.12)');
    neb2.addColorStop(0.85, 'rgba(0, 20, 60, 0.04)');
    neb2.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(minX, minY, width, height);

    // Magenta / Crimson Nebula (Bottom Left)
    const neb3 = ctx.createRadialGradient(-200, 750, 40, -200, 750, 520);
    neb3.addColorStop(0.0, 'rgba(255, 30, 100, 0.20)');
    neb3.addColorStop(0.5, 'rgba(140, 20, 60, 0.10)');
    neb3.addColorStop(0.85, 'rgba(50, 10, 30, 0.03)');
    neb3.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb3;
    ctx.fillRect(minX, minY, width, height);

    // Golden Stardust Nebula (Top Left)
    const neb4 = ctx.createRadialGradient(-150, -100, 60, -150, -100, 480);
    neb4.addColorStop(0.0, 'rgba(255, 190, 40, 0.18)');
    neb4.addColorStop(0.5, 'rgba(160, 100, 20, 0.08)');
    neb4.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb4;
    ctx.fillRect(minX, minY, width, height);

    // 3. Render Twinkling Stars
    const time = this.galaxyTime;
    for (const s of this.stars) {
      const alpha = s.baseAlpha * (0.65 + 0.35 * Math.sin(time * s.twinkleSpeed + s.twinklePhase));
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0.1, Math.min(1.0, alpha));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();

      // Diffraction spike cross for brighter stars
      if (s.hasSpikes && alpha > 0.7) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 0.75;
        const spikeLen = s.radius * 3.8;
        ctx.beginPath();
        ctx.moveTo(s.x - spikeLen, s.y);
        ctx.lineTo(s.x + spikeLen, s.y);
        ctx.moveTo(s.x, s.y - spikeLen);
        ctx.lineTo(s.x, s.y + spikeLen);
        ctx.stroke();
      }
    }

    // 4. Render Shooting Stars
    ctx.globalCompositeOperation = 'lighter';
    for (const ss of this.shootingStars) {
      const prog = ss.life / ss.maxLife;
      const tailX = ss.x - (ss.vx * 0.06);
      const tailY = ss.y - (ss.vy * 0.06);

      const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
      grad.addColorStop(0, 'rgba(255, 255, 255, ' + (prog * 0.9) + ')');
      grad.addColorStop(0.3, 'rgba(0, 240, 255, ' + (prog * 0.6) + ')');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // 5. Render Majestic Planets at the Edges
    for (const planet of this.planets) {
      this.drawPlanet(ctx, planet);
    }

    ctx.restore();
  }

  drawPlanet(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    // A. Atmospheric Outer Glow
    const atmosGrad = ctx.createRadialGradient(0, 0, p.radius * 0.8, 0, 0, p.glowRadius);
    atmosGrad.addColorStop(0, p.atmosphereColor);
    atmosGrad.addColorStop(0.6, p.atmosphereColor.replace(/[\d\.]+\)$/, '0.15)'));
    atmosGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = atmosGrad;
    ctx.beginPath();
    ctx.arc(0, 0, p.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // B. Back Planetary Rings (if tilted)
    if (p.hasRings) {
      ctx.save();
      ctx.rotate(p.ringTilt);
      ctx.fillStyle = p.ringColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.ringOuter, p.ringOuter * 0.28, 0, Math.PI, Math.PI * 2); // Top half behind
      ctx.fill();
      ctx.restore();
    }

    // C. Planet Body (3D Spherical Shading)
    const bodyGrad = ctx.createRadialGradient(
      -p.radius * 0.35, -p.radius * 0.35, p.radius * 0.1,
      0, 0, p.radius
    );
    bodyGrad.addColorStop(0.0, p.secondaryColor);
    bodyGrad.addColorStop(0.55, p.primaryColor);
    bodyGrad.addColorStop(0.9, '#05070C');
    bodyGrad.addColorStop(1.0, '#000000');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();

    // Craters / Surface Bands
    if (p.craters && p.craters.length > 0) {
      for (const cr of p.craters) {
        ctx.fillStyle = cr.color;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(cr.dx, cr.dy, cr.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // D. Front Planetary Rings (Crossing over the planet body)
    if (p.hasRings) {
      ctx.save();
      ctx.rotate(p.ringTilt);
      ctx.fillStyle = p.ringColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.ringOuter, p.ringOuter * 0.28, 0, 0, Math.PI); // Bottom half in front
      ctx.fill();
      // Inner shadow cutout
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.ringInner, p.ringInner * 0.28, 0, 0, Math.PI);
      ctx.fill();
      ctx.restore();
    }

    // Rim specular light
    ctx.strokeStyle = p.secondaryColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, Math.PI * 0.8, Math.PI * 1.6);
    ctx.stroke();

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Arena = Arena;
