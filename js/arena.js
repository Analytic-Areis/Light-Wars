/**
 * Light-Wars: 2.5D Arena & Radiant White Light Refill Platform
 * Renders the 5520x3388 dungeon map, White Light Sanctuary, and manages
 * 92 solid boundary polygon slabs preventing players and enemies from walking into the void.
 */

class Arena {
  constructor(width, height) {
    this.width = width || 5520;
    this.height = height || 3388;

    this.minX = 150;
    this.maxX = this.width - 150;
    this.minY = 150;
    this.maxY = this.height - 150;

    // Load custom arena map image (5520x3388)
    this.mapImg = new Image();
    this.mapImg.src = 'assets/textures/arena_map.jpg';

    // White Light Sanctuary (Spawn sanctuary in the western courtyard)
    this.whiteLight = {
      x: 1352,
      y: 1502,
      radius: 190,
      pulseTime: 0,
      particles: []
    };

    // Load boundary slabs from map data
    this.slabs = [];
    const mapData = window.LightWars.DUNGEON_MAP_DATA;
    if (mapData && mapData.boundary_slabs) {
      for (const s of mapData.boundary_slabs) {
        const pts = s.poly;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        this.slabs.push({
          poly: pts,
          minX, maxX, minY, maxY
        });
      }
    }
  }

  pointSegDistSq(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      return { distSq: (px - x1) * (px - x1) + (py - y1) * (py - y1), qx: x1, qy: y1 };
    }
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const qx = x1 + t * dx;
    const qy = y1 + t * dy;
    return { distSq: (px - qx) * (px - qx) + (py - qy) * (py - qy), qx, qy };
  }

  pointInPoly(px, py, poly) {
    let inside = false;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const j = (i - 1 + n) % n;
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Resolve entity collision against all boundary slabs
  resolveCircleCollision(x, y, radius) {
    let currX = x;
    let currY = y;

    for (const slab of this.slabs) {
      if (currX + radius < slab.minX || currX - radius > slab.maxX ||
          currY + radius < slab.minY || currY - radius > slab.maxY) {
        continue;
      }

      const inside = this.pointInPoly(currX, currY, slab.poly);
      let minDistSq = Infinity;
      let closestQ = null;

      const pts = slab.poly;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const res = this.pointSegDistSq(currX, currY, pts[i].x, pts[i].y, pts[j].x, pts[j].y);
        if (res.distSq < minDistSq) {
          minDistSq = res.distSq;
          closestQ = res;
        }
      }

      if (inside) {
        const d = Math.sqrt(minDistSq);
        const nx = currX - closestQ.qx;
        const ny = currY - closestQ.qy;
        const len = Math.hypot(nx, ny);
        if (len > 0.001) {
          currX = closestQ.qx + (nx / len) * (radius + 2);
          currY = closestQ.qy + (ny / len) * (radius + 2);
        } else {
          currX = closestQ.qx + radius + 2;
        }
      } else if (minDistSq < radius * radius) {
        const d = Math.sqrt(minDistSq);
        if (d > 0.001) {
          const push = radius - d;
          currX += ((currX - closestQ.qx) / d) * push;
          currY += ((currY - closestQ.qy) / d) * push;
        }
      }
    }

    // Clamp inside world borders
    currX = Math.max(this.minX, Math.min(this.maxX, currX));
    currY = Math.max(this.minY, Math.min(this.maxY, currY));

    return { x: currX, y: currY };
  }

  // Check if laser ray hit a boundary wall
  isRayBlocked(x1, y1, x2, y2) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    for (const slab of this.slabs) {
      if (Math.max(x1, x2) < slab.minX || Math.min(x1, x2) > slab.maxX ||
          Math.max(y1, y2) < slab.minY || Math.min(y1, y2) > slab.maxY) {
        continue;
      }
      if (this.pointInPoly(x2, y2, slab.poly) || this.pointInPoly(midX, midY, slab.poly)) {
        return true;
      }
    }
    return false;
  }

  update(dt) {
    this.whiteLight.pulseTime += dt * 3.0;

    // Spawn upward beacon particles inside the sanctuary circle
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

    // 2. Draw Radiant White Light Refill Platform at (1352, 1502)
    const wl = this.whiteLight;
    const pulse = 1.0 + Math.sin(wl.pulseTime) * 0.12;

    ctx.save();
    // Translucent cyan-white outer bloom
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

    // Inner delicate cyan energy ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(wl.x, wl.y, wl.radius * 0.75, wl.radius * 0.39, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating holographic tech runes
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

    // White Light 3D Label
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 18px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ WHITE LIGHT REFILL ⚡', wl.x, wl.y - 25);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.fillText('STAND HERE TO RECHARGE HP & AMMO', wl.x, wl.y + 25);

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
