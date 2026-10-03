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
  constructor() {
    this.sprites = {};
    this.loadedCount = 0;
    this.initDirectionalSprites();
  }

  initDirectionalSprites() {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const characters = [
      'hero',
      'troop_cyan',
      'troop_magenta',
      'troop_yellow',
      'troop_red',
      'troop_green',
      'troop_blue'
    ];

    for (const charId of characters) {
      for (const d of dirs) {
        // Base / Idle frames
        this.loadSprite(`${charId}_${d}_idle`, `assets/sprites/${charId}/${d}_idle.png`);
        // Directional idle frames (25 frames for hero idle bob animation)
        if (charId === 'hero') {
          for (let r = 0; r < 25; r++) {
            const idleId = `hero_${d}_idle_${r}`;
            const idlePath = `assets/sprites/hero/${d}_idle_${r}.png`;
            this.loadSprite(idleId, idlePath);
          }
        }

        // Directional run frames (Full Luke sprite sheet frames for hero, 8 for troops)
        const frameCount = (charId === 'hero') ? (HERO_FRAME_COUNTS[d] || 8) : 8;
        for (let r = 0; r < frameCount; r++) {
          const runId = `${charId}_${d}_run_${r}`;
          const runPath = `assets/sprites/${charId}/${d}_run_${r}.png`;
          this.loadSprite(runId, runPath);
        }
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
    // Face movement direction when running, or aim direction when idle
    const dir = player.isMoving ? player.facingDir : (player.facingDir || SpriteManager.getDirection8(player.aimAngle));
    let img = null;

    if (player.isMoving) {
      const maxFrames = HERO_FRAME_COUNTS[dir] || 8;
      const frameIdx = Math.floor(player.walkAnimTime) % maxFrames;
      img = this.getSprite(`hero_${dir}_run_${frameIdx}`) ||
            this.getSprite(`hero_${dir}_idle`) ||
            this.getSprite(`hero_${dir}`) ||
            this.getSprite('hero_S');
    } else {
      const idleIdx = Math.floor(player.idleAnimTime) % 25;
      img = this.getSprite(`hero_${dir}_idle_${idleIdx}`) ||
            this.getSprite(`hero_${dir}_idle`) ||
            this.getSprite(`hero_${dir}`) ||
            this.getSprite('hero_S');
    }

    if (!img) return false;

    ctx.save();
    // Anchor sprite directly to ground plane (matching Godot scale 0.68)
    const h = 168;
    const w = (img.width / img.height) * h;
    const feetOffset = h * (237 / 256);

    ctx.drawImage(img, -w / 2, -feetOffset, w, h);
    ctx.restore();
    return true;
  }

  drawEnemy(ctx, enemy) {
    const col = enemy.colorId.toLowerCase();
    const dir = enemy.facingDir || SpriteManager.getDirection8(enemy.facingAngle);
    let img = null;

    if (enemy.isMoving) {
      const frameIdx = Math.floor(enemy.walkAnimTime) % 8;
      img = this.getSprite(`troop_${col}_${dir}_run_${frameIdx}`) ||
            this.getSprite(`troop_${col}_${dir}_idle`) ||
            this.getSprite(`troop_${col}_${dir}`) ||
            this.getSprite(`troop_${col}_S`);
    } else {
      img = this.getSprite(`troop_${col}_${dir}_idle`) ||
            this.getSprite(`troop_${col}_${dir}`) ||
            this.getSprite(`troop_${col}_S`);
    }

    if (!img) return false;

    ctx.save();
    if (enemy.hurtFlash > 0) {
      ctx.filter = 'brightness(3.2) contrast(1.5)';
    }

    // Anchor troop feet directly to ground plane (matching Godot scale 0.68)
    const h = 168;
    const w = (img.width / img.height) * h;
    const feetOffset = h * (251 / 256);

    ctx.drawImage(img, -w / 2, -feetOffset, w, h);
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
      radius: 6,
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
      radius: 11,
      colorHex,
      life: 0.12,
      maxLife: 0.12
    });
    // 3. Directional sparks leaping from the gun barrel
    for (let i = 0; i < 4; i++) {
      const spread = (Math.random() - 0.5) * 0.45;
      const spd = 140 + Math.random() * 180;
      this.particles.push({
        x: x + Math.cos(angle) * 3,
        y: y + Math.sin(angle) * 3,
        vx: Math.cos(angle + spread) * spd,
        vy: Math.sin(angle + spread) * spd,
        radius: 2 + Math.random() * 1.5,
        colorHex,
        life: 0.1 + Math.random() * 0.08,
        maxLife: 0.18
      });
    }
  }

  spawnComicText(x, y, text, colorHex = '#FF2A4D') {
    this.comicTexts.push({
      x,
      y: y - 25,
      text,
      colorHex,
      life: 0.85,
      maxLife: 0.85,
      scale: 0.4,
      targetScale: 1.15,
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
      ct.y -= dt * 25;
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

      // Comic Starburst Polygon behind word
      ctx.fillStyle = '#FFE600';
      ctx.strokeStyle = '#12121A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const points = 14;
      const outerR = 52;
      const innerR = 32;
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
      ctx.font = '900 22px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ct.colorHex;
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#12121A';
      ctx.strokeText(ct.text, 0, 0);
      ctx.fillText(ct.text, 0, 0);

      ctx.restore();
    }
  }
}

class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.x = 1352;
    this.y = 1502;
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
    this.x += (targetX - this.x) * 0.14;
    this.y += (targetY - this.y) * 0.14;

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
    if (this.viewportWidth < arenaWidth) {
      this.x = Math.max(halfW, Math.min(arenaWidth - halfW, this.x));
    } else {
      this.x = arenaWidth / 2;
    }
    if (this.viewportHeight < arenaHeight) {
      this.y = Math.max(halfH, Math.min(arenaHeight - halfH, this.y));
    } else {
      this.y = arenaHeight / 2;
    }
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
