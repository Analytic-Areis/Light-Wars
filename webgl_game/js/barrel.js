/**
 * Light-Wars: Destructible Barrel Cover Barricade
 * Matches Godot mechanics: 3 HP, collision body, white flash & jiggle on hit,
 * crashes and drops random strategic color orb upon destruction.
 */

class Barrel {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.health = 3;
    this.maxHealth = 3;
    this.alive = true;

    // Collision footprint (isometric ellipse base: 180px wide x 60px deep)
    this.colRadiusX = 90;
    this.colRadiusY = 32;

    this.hurtFlash = 0;
    this.shakeTime = 0;

    // Barrel texture
    this.img = new Image();
    this.img.src = 'assets/isometric_dungeon/Isometric/barrelsStacked_N.png';
  }

  update(dt) {
    if (!this.alive) return;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.shakeTime > 0) this.shakeTime -= dt;
  }

  takeLaserHit(laserColor, hitAngle) {
    if (!this.alive) return { destroyed: false };
    this.health -= 1;
    this.hurtFlash = 0.16;
    this.shakeTime = 0.22;

    if (this.health <= 0) {
      this.alive = false;
      const shouldDropOrb = Math.random() < 0.65;
      const orbColors = ['RED', 'GREEN', 'BLUE'];
      const dropColor = orbColors[Math.floor(Math.random() * orbColors.length)];
      return { destroyed: true, dropColor: shouldDropOrb ? dropColor : null };
    }

    return { destroyed: false };
  }

  // Push circle out of barrel footprint
  resolveCircleCollision(x, y, radius) {
    const dx = x - this.x;
    const dy = y - (this.y - 12);

    // Normalized ellipse distance
    const rx = this.colRadiusX + radius;
    const ry = this.colRadiusY + radius;
    const normDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);

    if (normDist < 1.0 && normDist > 0.0001) {
      const scale = 1.0 / Math.sqrt(normDist);
      return {
        collided: true,
        x: this.x + dx * scale,
        y: (this.y - 12) + dy * scale
      };
    }
    return { collided: false, x, y };
  }

  draw(ctx) {
    if (!this.alive) return;

    // Ground Contact Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.colRadiusX * 1.1, this.colRadiusY * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    let shakeX = 0;
    if (this.shakeTime > 0) {
      shakeX = Math.sin(this.shakeTime * 45) * 6;
    }
    ctx.translate(this.x + shakeX, this.y);

    if (this.hurtFlash > 0) {
      ctx.filter = 'brightness(3.0) contrast(1.5)';
    }

    if (this.img.complete && this.img.naturalWidth > 0) {
      // 2.5D Sprite dimensions: width ~180px, height ~170px, anchored with bottom base at ground
      const w = 180;
      const h = (this.img.height / this.img.width) * w;
      ctx.drawImage(this.img, -w / 2, -h + 20, w, h);
    } else {
      // Fallback wooden barrel cluster
      ctx.fillStyle = '#8B5A2B';
      ctx.strokeStyle = '#3A2010';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-45, -70, 90, 70, 8);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Black Barrel: Special End-of-Level-1 Challenge Barrel.
 * Requires 1 shot of EACH weapon type (Red, Green, Blue, Cyan, Magenta, Yellow).
 * Unlocks the DASH ability when destroyed!
 */
class BlackBarrel extends Barrel {
  constructor(x, y) {
    super(x, y);
    this.isBlackBarrel = true;
    this.requiredColors = ['RED', 'GREEN', 'BLUE', 'CYAN', 'MAGENTA', 'YELLOW'];
    this.hitColors = new Set();
    this.health = this.requiredColors.length;
    this.maxHealth = this.requiredColors.length;
    this.auraPhase = 0;

    // 120% scaled Black Orb size (radius = 8.1px)
    this.radius = 8.1;
    this.colRadiusX = 22;
    this.colRadiusY = 22;
  }

  update(dt) {
    if (!this.alive) return;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.shakeTime > 0) this.shakeTime -= dt;
    this.auraPhase += dt * 3.5;
  }

  resolveCircleCollision(x, y, radius) {
    const dx = x - this.x;
    const dy = y - this.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.radius + radius;
    if (dist < minDist && dist > 0.001) {
      return {
        collided: true,
        x: this.x + (dx / dist) * minDist,
        y: this.y + (dy / dist) * minDist
      };
    }
    return { collided: false, x, y };
  }

  takeLaserHit(laserColor, hitAngle) {
    if (!this.alive) return { destroyed: false };
    this.hurtFlash = 0.22;
    this.shakeTime = 0.28;

    if (this.requiredColors.includes(laserColor) && !this.hitColors.has(laserColor)) {
      this.hitColors.add(laserColor);
      this.health = this.requiredColors.length - this.hitColors.size;

      if (this.hitColors.size >= this.requiredColors.length) {
        this.alive = false;
        return { destroyed: true, unlockedDash: true, hitColor: laserColor };
      }
      return { destroyed: false, newHit: true, hitColor: laserColor, remaining: this.health };
    }

    return { destroyed: false, alreadyHit: this.hitColors.has(laserColor) };
  }

  draw(ctx) {
    if (!this.alive) return;

    const hoverY = this.y - 12 + Math.sin(this.auraPhase * 1.4) * 3.0;
    const groundShadowY = this.y + 3;
    const pulse = 1.0 + Math.sin(this.auraPhase) * 0.14;

    // 1. Soft Ground Contact Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, groundShadowY, this.radius * 2.2, this.radius * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    let shakeX = 0;
    if (this.shakeTime > 0) {
      shakeX = Math.sin(this.shakeTime * 45) * 5;
    }
    ctx.translate(this.x + shakeX, hoverY);

    // 2. 1.5x Radiant Luminous Void Energy Flare
    const outerRadius = this.radius * 2.8 * pulse; // ~19px radius -> ~38px diameter (1.5x normal orb)
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
    grad.addColorStop(0.00, '#FFFFFF');
    grad.addColorStop(0.15, 'rgba(176, 64, 255, 0.95)');
    grad.addColorStop(0.35, '#7010C0');
    grad.addColorStop(0.65, 'rgba(112, 16, 192, 0.6)');
    grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Dense Obsidian Void Core Sphere
    ctx.fillStyle = (this.hurtFlash > 0) ? '#FFFFFF' : '#080812';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.35 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Violet Corona Outline
    ctx.strokeStyle = '#B040FF';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Inner void star sparkle
    ctx.fillStyle = '#C060FF';
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw chromatic energy pips above orb representing 6 required colors
    const pipSpacing = 12;
    const startPipX = -((this.requiredColors.length - 1) * pipSpacing) / 2;
    const pipY = -outerRadius - 16;

    for (let i = 0; i < this.requiredColors.length; i++) {
      const colId = this.requiredColors[i];
      const isLit = this.hitColors.has(colId);
      const px = startPipX + i * pipSpacing;
      const colData = window.LightWars.COLORS[colId];

      ctx.save();
      ctx.beginPath();
      ctx.arc(px, pipY, isLit ? 4.5 : 3.0, 0, Math.PI * 2);
      if (isLit) {
        ctx.fillStyle = colData.hex;
        ctx.shadowColor = colData.hex;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1c1c28';
        ctx.fill();
        ctx.strokeStyle = colData.hex;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Overhead Title
    ctx.font = '900 11px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#E0D0FF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeText(`BLACK ORB (${this.hitColors.size}/6)`, 0, pipY - 10);
    ctx.fillText(`BLACK ORB (${this.hitColors.size}/6)`, 0, pipY - 10);

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Barrel = Barrel;
window.LightWars.BlackBarrel = BlackBarrel;
