/**
 * Light-Wars: 2.5D Camera, Particles, Comic FX, and Modular Sprite Manager
 */

class SpriteManager {
  constructor() {
    this.sprites = {};
    this.loadedCount = 0;
  }

  loadSprite(id, src) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      this.sprites[id] = img;
      this.loadedCount++;
      console.log(`Loaded sprite: ${id}`);
    };
    img.onerror = () => {
      console.warn(`Could not load sprite: ${id} at ${src}`);
    };
  }

  hasSprite(id) {
    return !!this.sprites[id];
  }

  getSprite(id) {
    return this.sprites[id] || null;
  }

  drawPlayer(ctx, player) {
    const img = this.getSprite('player');
    if (!img) return;
    ctx.save();
    ctx.rotate(player.aimAngle);
    const size = player.radius * 2.2;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  drawEnemy(ctx, enemy) {
    const key = `enemy_${enemy.colorId.toLowerCase()}`;
    const img = this.getSprite(key) || this.getSprite('enemy_default');
    if (!img) return;
    ctx.save();
    ctx.rotate(enemy.facingAngle);
    const size = enemy.radius * 2.2;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
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
