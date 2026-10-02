/**
 * Light-Wars: 2.5D Camera, Particles, Comic FX, and Modular Sprite Manager
 */

class SpriteManager {
  constructor() {
    this.sprites = {};
    this.loadedCount = 0;
    this.initDirectionalSprites();
  }

  initDirectionalSprites() {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const characters = ['hero', 'troop_cyan', 'troop_magenta', 'troop_yellow', 'troop_red'];

    for (const charId of characters) {
      for (const d of dirs) {
        const id = `${charId}_${d}`;
        const path = `assets/sprites/${charId}/${d}.png`;
        this.loadSprite(id, path);
        
        // Load 8 directional run frames
        for (let r = 0; r < 8; r++) {
          const runId = `${charId}_${d}_run_${r}`;
          const runPath = `assets/sprites/${charId}/${d}_run_${r}.png`;
          this.loadSprite(runId, runPath);
        }
      }
      // General run cycle fallback
      for (let i = 1; i <= 8; i++) {
        const id = `${charId}_run_${i}`;
        const path = `assets/sprites/${charId}/run_${i}.png`;
        this.loadSprite(id, path);
      }
    }
  }

  loadSprite(id, src) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      this.sprites[id] = img;
      this.loadedCount++;
    };
    img.onerror = () => {
      // Graceful fallback
    };
  }

  hasSprite(id) {
    return !!this.sprites[id];
  }

  getSprite(id) {
    return this.sprites[id] || null;
  }

  static getDirection8(angle) {
    let deg = (angle * 180) / Math.PI;
    if (deg < 0) deg += 360;
    if (deg >= 337.5 || deg < 22.5) return 'E';
    if (deg >= 22.5 && deg < 67.5) return 'SE';
    if (deg >= 67.5 && deg < 112.5) return 'S';
    if (deg >= 112.5 && deg < 157.5) return 'SW';
    if (deg >= 157.5 && deg < 202.5) return 'W';
    if (deg >= 202.5 && deg < 247.5) return 'NW';
    if (deg >= 247.5 && deg < 292.5) return 'N';
    return 'NE';
  }

  drawPlayer(ctx, player) {
    const dir = SpriteManager.getDirection8(player.aimAngle);
    const img = this.getSprite(`hero_${dir}`) || this.getSprite('hero_S');
    if (!img) return false;

    ctx.save();
    // Running animation bobbing, tilt, and squash-stretch
    const moving = player.isMoving;
    const bob = moving ? Math.abs(Math.sin(player.walkCycle)) * 6 : 0;
    const tilt = moving ? Math.sin(player.walkCycle) * 0.08 : 0;
    const squash = moving ? Math.sin(player.walkCycle * 2) * 0.05 : 0;

    ctx.translate(0, -bob);
    ctx.rotate(tilt);
    ctx.scale(1.0 + squash, 1.0 - squash);

    // Render upright 2.5D sprite standing on ground plane with increased size
    const h = player.radius * 3.8;
    const w = (img.width / img.height) * h;
    ctx.drawImage(img, -w / 2, -h + 10, w, h);
    ctx.restore();
    return true;
  }

  drawEnemy(ctx, enemy) {
    const col = enemy.colorId.toLowerCase();
    const isMoving = enemy.walkCycle > 0;
    const dir = SpriteManager.getDirection8(enemy.facingAngle);
    const runFrameIdx = Math.floor(enemy.walkCycle * 1.5) % 8;
    const runImg = this.getSprite(`troop_${col}_${dir}_run_${runFrameIdx}`) || this.getSprite(`troop_${col}_run_${runFrameIdx + 1}`);
    const idleImg = this.getSprite(`troop_${col}_${dir}`) || this.getSprite(`troop_${col}_S`);
    const img = (isMoving && runImg) ? runImg : idleImg;
    if (!img) return false;

    ctx.save();
    // Running animation bobbing and subtle tilt
    const bob = isMoving ? Math.abs(Math.sin(enemy.walkCycle)) * 3 : 0;
    const tilt = isMoving ? Math.sin(enemy.walkCycle) * 0.04 : 0;

    ctx.translate(0, -bob);
    ctx.rotate(tilt);

    // Visual hurt flash on laser hit
    if (enemy.hurtFlash > 0) {
      ctx.filter = 'brightness(2.8) contrast(1.5)';
    }

    const h = enemy.radius * 3.8;
    const w = (img.width / img.height) * h;
    ctx.drawImage(img, -w / 2, -h + 10, w, h);
    ctx.restore();
    return true;
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.comicTexts = [];
  }

  spawnBurst(x, y, colorHex, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4.5,
        colorHex,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        gravity: 40
      });
    }
  }

  spawnComicText(x, y, text, colorHex = '#FFE600') {
    this.comicTexts.push({
      x,
      y: y - 20,
      text,
      colorHex,
      vy: -60,
      scale: 0.2,
      targetScale: 1.25,
      life: 0.9,
      maxLife: 0.9,
      rot: (Math.random() - 0.5) * 0.4
    });
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update comic text popups
    for (let i = this.comicTexts.length - 1; i >= 0; i--) {
      const ct = this.comicTexts[i];
      ct.y += ct.vy * dt;
      ct.vy *= Math.pow(0.1, dt);
      if (ct.scale < ct.targetScale) {
        ct.scale = Math.min(ct.targetScale, ct.scale + dt * 6);
      }
      ct.life -= dt;
      if (ct.life <= 0) {
        this.comicTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.colorHex;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw comic bursts (KAABOOM!, BOOM!, 1CO!)
    for (const ct of this.comicTexts) {
      ctx.save();
      ctx.translate(ct.x, ct.y);
      ctx.rotate(ct.rot);
      ctx.scale(ct.scale, ct.scale);
      ctx.globalAlpha = Math.min(1.0, ct.life / (ct.maxLife * 0.4));

      // Comic Starburst Polygon behind word
      ctx.fillStyle = '#FFE600';
      ctx.strokeStyle = '#12121A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const points = 14;
      const outerR = 55;
      const innerR = 35;
      for (let j = 0; j < points * 2; j++) {
        const r = (j % 2 === 0) ? outerR : innerR;
        const a = (j * Math.PI) / points;
        const px = Math.cos(a) * r * 1.5;
        const py = Math.sin(a) * r * 0.8;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Comic text
      ctx.font = '900 24px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FF2A4D';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#12121A';
      ctx.strokeText(ct.text, 0, 0);
      ctx.fillText(ct.text, 0, 0);

      ctx.restore();
    }
  }
}

class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.x = 0;
    this.y = 0;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  shake(amount = 8) {
    this.shakeIntensity = Math.min(22, this.shakeIntensity + amount);
  }

  update(dt, targetX, targetY, arenaWidth, arenaHeight) {
    // Smooth lerp to target
    this.x += (targetX - this.x) * 0.12;
    this.y += (targetY - this.y) * 0.12;

    // Decay screen shake
    if (this.shakeIntensity > 0) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity -= dt * 25;
      if (this.shakeIntensity < 0) this.shakeIntensity = 0;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Clamp camera within arena bounds
    const halfW = this.viewportWidth / 2;
    const halfH = this.viewportHeight / 2;
    this.x = Math.max(halfW, Math.min(arenaWidth - halfW, this.x));
    this.y = Math.max(halfH, Math.min(arenaHeight - halfH, this.y));
  }

  apply(ctx) {
    ctx.save();
    ctx.translate(
      this.viewportWidth / 2 - this.x + this.shakeOffsetX,
      this.viewportHeight / 2 - this.y + this.shakeOffsetY
    );
  }

  restore(ctx) {
    ctx.restore();
  }

  screenToWorld(screenX, screenY) {
    return {
      x: screenX - (this.viewportWidth / 2 - this.x),
      y: screenY - (this.viewportHeight / 2 - this.y)
    };
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.SpriteManager = SpriteManager;
window.LightWars.ParticleSystem = ParticleSystem;
window.LightWars.Camera = Camera;
