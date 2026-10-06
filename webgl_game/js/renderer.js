/**
 * Light-Wars: 2.5D Camera, Particles, Comic FX, and Modular Sprite Manager
 * Smooth 8-directional 12 FPS run animations, precise ground-anchoring for Hero & Troops.
 */

const HERO_FRAME_COUNTS = {
  S: 20,
  N: 14,
  W: 22,
  E: 22,
  NE: 14,
  NW: 14,
  SE: 12,
  SW: 12
};

class SpriteManager {
  static DIR_FILES = {
    N: 'up.png',
    NE: 'northeast.png',
    E: 'right.png',
    SE: 'southeast.png',
    S: 'down.png',
    SW: 'southwest.png',
    W: 'left.png',
    NW: 'northwest.png'
  };

  static BOT_SCHEMES = {
    RED: 'bots/red-cyan',
    GREEN: 'bots/green-magenta',
    BLUE: 'bots/blue-yellow',
    CYAN: 'bots/cyan-red',
    MAGENTA: 'bots/magenta-green',
    YELLOW: 'bots/yellow-blue',
    WHITE: 'bots/white-pink',
    BLACK: 'boss',
    BOSS: 'boss'
  };

  constructor() {
    this.sprites = {};
    this.imageCache = {};
    this.loadedCount = 0;
    this.totalCount = 0;
    this.initDirectionalSprites();
  }

  initDirectionalSprites() {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    // 1. Luke (Hero) 8-directional sprites (idle & walk)
    for (const d of dirs) {
      const fileName = SpriteManager.DIR_FILES[d];
      const idlePath = `assets/sprites/luke/idle/${fileName}`;
      const walkPath = `assets/sprites/luke/walk/${fileName}`;
      this.loadSprite(`luke_${d}_idle`, idlePath);
      this.loadSprite(`luke_${d}_walk`, walkPath);
      this.loadSprite(`luke_${d}`, idlePath);
      this.loadSprite(`hero_${d}_idle`, idlePath);
      this.loadSprite(`hero_${d}_walk`, walkPath);
      this.loadSprite(`hero_${d}`, idlePath);
    }

    // 2. Bots & Boss 8-directional idle and walk sprites
    for (const [schemeKey, subfolder] of Object.entries(SpriteManager.BOT_SCHEMES)) {
      for (const d of dirs) {
        const fileName = SpriteManager.DIR_FILES[d];
        const idlePath = `assets/sprites/${subfolder}/idle/${fileName}`;
        const walkPath = `assets/sprites/${subfolder}/walk/${fileName}`;

        // Canonical uppercase scheme keys
        this.loadSprite(`${schemeKey}_${d}_idle`, idlePath);
        this.loadSprite(`${schemeKey}_${d}_walk`, walkPath);

        // Aliases for lowercase and troop_ prefixes
        const lower = schemeKey.toLowerCase();
        this.loadSprite(`${lower}_${d}_idle`, idlePath);
        this.loadSprite(`${lower}_${d}_walk`, walkPath);
        this.loadSprite(`troop_${lower}_${d}_idle`, idlePath);
        this.loadSprite(`troop_${lower}_${d}_walk`, walkPath);
      }
    }
  }

  loadSprite(id, src) {
    if (this.imageCache[src]) {
      this.sprites[id] = this.imageCache[src];
      return;
    }
    this.totalCount++;
    const img = new Image();
    img.src = src;
    this.imageCache[src] = img;
    this.sprites[id] = img;
    img.onload = () => {
      this.loadedCount++;
    };
    img.onerror = () => {
      // Graceful fallback
    };
  }

  isLoaded() {
    return this.totalCount > 0 && this.loadedCount >= this.totalCount;
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
    // Face aim direction when idle or shooting, movement direction when walking
    let dir = player.facingDir;
    if (!player.isMoving || player.shootFaceTimer > 0) {
      dir = SpriteManager.getDirection8(player.aimAngle);
    }
    if (!dir) dir = 'S';

    let img = null;
    let frameIdx = 0;
    if (player.isMoving) {
      img = this.getSprite(`luke_${dir}_walk`) ||
            this.getSprite(`hero_${dir}_walk`) ||
            this.getSprite(`luke_${dir}_idle`) ||
            this.getSprite(`luke_S_walk`);
      frameIdx = Math.floor(player.walkAnimTime) % 25;
    } else {
      img = this.getSprite(`luke_${dir}_idle`) ||
            this.getSprite(`hero_${dir}_idle`) ||
            this.getSprite(`luke_S_idle`);
      frameIdx = Math.floor(player.idleAnimTime) % 25;
    }

    if (!img) return false;

    const col = frameIdx % 5;
    const row = Math.floor(frameIdx / 5);
    const frameW = 256;
    const frameH = 256;
    const sx = col * frameW;
    const sy = row * frameH;

    ctx.save();
    // Anchor sprite directly to ground plane, scaled to fit exactly 1x1 on the tile map (~50x50 px)
    const h = 50;
    const w = 50;
    const feetOffset = h * (224 / 256); // ~43.75 px

    ctx.drawImage(img, sx, sy, frameW, frameH, -w / 2, -feetOffset, w, h);
    ctx.restore();
    return true;
  }

  drawEnemy(ctx, enemy) {
    const colName = (enemy.colorId || 'CYAN').toUpperCase();
    const dir = enemy.facingDir || SpriteManager.getDirection8(enemy.facingAngle) || 'S';
    let img = null;
    let frameIdx = 0;

    if (enemy.isMoving) {
      img = this.getSprite(`${colName}_${dir}_walk`) ||
            this.getSprite(`${colName}_${dir}_idle`) ||
            this.getSprite(`${colName}_S_walk`);
      frameIdx = Math.floor(enemy.walkAnimTime) % 25;
    } else {
      img = this.getSprite(`${colName}_${dir}_idle`) ||
            this.getSprite(`${colName}_S_idle`);
      frameIdx = Math.floor(enemy.idleAnimTime || 0) % 25;
    }

    if (!img) return false;

    const col = frameIdx % 5;
    const row = Math.floor(frameIdx / 5);
    const frameW = 256;
    const frameH = 256;
    const sx = col * frameW;
    const sy = row * frameH;

    ctx.save();
    if (enemy.hurtFlash > 0) {
      ctx.filter = 'brightness(3.2) contrast(1.5)';
    }

    // Anchor troop feet directly to ground plane, scaled 1x1 on the tile map (~50x50 px)
    const h = 50;
    const w = 50;
    const feetOffset = h * (224 / 256);

    ctx.drawImage(img, sx, sy, frameW, frameH, -w / 2, -feetOffset, w, h);
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
        radius: 3 + Math.random() * 4,
        colorHex,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65
      });
    }
  }

  spawnMuzzleFlash(x, y, angle, colorHex) {
    // 1. Hot white core burst at muzzle tip
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 3,
      colorHex: '#FFFFFF',
      life: 0.08,
      maxLife: 0.08
    });
    // 2. Chromatic energy ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 5,
      colorHex,
      life: 0.12,
      maxLife: 0.12
    });
    // 3. Directional sparks leaping from the gun barrel
    for (let i = 0; i < 3; i++) {
      const spread = (Math.random() - 0.5) * 0.45;
      const spd = 100 + Math.random() * 120;
      this.particles.push({
        x: x + Math.cos(angle) * 2,
        y: y + Math.sin(angle) * 2,
        vx: Math.cos(angle + spread) * spd,
        vy: Math.sin(angle + spread) * spd,
        radius: 1.2 + Math.random() * 0.8,
        colorHex,
        life: 0.1 + Math.random() * 0.08,
        maxLife: 0.18
      });
    }
  }

  spawnComicText(x, y, text, colorHex = '#FF2A4D') {
    this.comicTexts.push({
      x,
      y: y - 18,
      text,
      colorHex,
      life: 0.85,
      maxLife: 0.85,
      scale: 0.3,
      targetScale: 0.65, // Decreased accordingly
      rot: (Math.random() - 0.5) * 0.25
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.15, dt);
      p.vy *= Math.pow(0.15, dt);
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.comicTexts.length - 1; i >= 0; i--) {
      const ct = this.comicTexts[i];
      ct.y -= dt * 20;
      ct.scale += (ct.targetScale - ct.scale) * Math.min(1.0, dt * 14);
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

    // Draw comic bursts (KAABOOM!, CRAFTED!, +1 YELLOW!)
    for (const ct of this.comicTexts) {
      ctx.save();
      ctx.translate(ct.x, ct.y);
      ctx.rotate(ct.rot);
      ctx.scale(ct.scale, ct.scale);
      ctx.globalAlpha = Math.min(1.0, ct.life / (ct.maxLife * 0.4));

      // Comic Starburst Polygon behind word (decreased accordingly)
      ctx.fillStyle = '#FFE600';
      ctx.strokeStyle = '#12121A';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const points = 14;
      const outerR = 28;
      const innerR = 16;
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
      ctx.font = '900 13px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ct.colorHex;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#12121A';
      ctx.strokeText(ct.text, 0, 0);
      ctx.fillText(ct.text, 0, 0);

      ctx.restore();
    }
  }
}

class Camera {
  constructor(viewportWidth = 1280, viewportHeight = 720) {
    this.x = 856;
    this.y = 273;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.zoom = 2.0; // Focused zoom onto player and local region
    this.targetZoom = 2.0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  shake(amount = 8) {
    this.shakeIntensity = Math.min(22, this.shakeIntensity + amount);
  }

  setZoom(val) {
    this.targetZoom = Math.max(1.4, Math.min(2.8, val));
  }

  update(dt, targetX, targetY, arenaWidth, arenaHeight) {
    // Smooth responsive lerp to player target
    this.x += (targetX - this.x) * 0.16;
    this.y += (targetY - this.y) * 0.16;

    // Smooth zoom interpolation
    if (this.targetZoom !== undefined) {
      this.zoom += (this.targetZoom - this.zoom) * 0.15;
    }

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

    // Clamp camera within arena bounds according to zoomed viewport
    const halfViewW = (this.viewportWidth / this.zoom) / 2;
    const halfViewH = (this.viewportHeight / this.zoom) / 2;
    if (halfViewW * 2 < arenaWidth) {
      this.x = Math.max(halfViewW, Math.min(arenaWidth - halfViewW, this.x));
    } else {
      this.x = arenaWidth / 2;
    }
    if (halfViewH * 2 < arenaHeight) {
      this.y = Math.max(halfViewH, Math.min(arenaHeight - halfViewH, this.y));
    } else {
      this.y = arenaHeight / 2;
    }
  }

  apply(ctx) {
    ctx.save();
    ctx.translate(
      this.viewportWidth / 2 + this.shakeOffsetX,
      this.viewportHeight / 2 + this.shakeOffsetY
    );
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restore(ctx) {
    ctx.restore();
  }

  screenToWorld(screenX, screenY) {
    return {
      x: this.x + (screenX - this.viewportWidth / 2) / this.zoom,
      y: this.y + (screenY - this.viewportHeight / 2) / this.zoom
    };
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.SpriteManager = SpriteManager;
window.LightWars.ParticleSystem = ParticleSystem;
window.LightWars.Camera = Camera;
