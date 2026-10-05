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
  }

  update(dt) {
    super.update(dt);
    this.auraPhase += dt * 3.5;
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

    // Ground Contact Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.colRadiusX * 1.15, this.colRadiusY * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    let shakeX = 0;
    if (this.shakeTime > 0) {
      shakeX = Math.sin(this.shakeTime * 45) * 8;
    }
    ctx.translate(this.x + shakeX, this.y);

    // Dark void glow / pulsating dark aura
    const pulse = 1.0 + Math.sin(this.auraPhase) * 0.15;
    const grad = ctx.createRadialGradient(0, -60, 20, 0, -60, 100 * pulse);
    grad.addColorStop(0, 'rgba(60, 20, 90, 0.6)');
    grad.addColorStop(0.6, 'rgba(20, 20, 35, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -60, 100 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Dark filter for sprite to make it look pitch black / obsidian void
    if (this.hurtFlash > 0) {
      ctx.filter = 'brightness(3.5) contrast(1.8)';
    } else {
      ctx.filter = 'brightness(0.25) contrast(1.7) drop-shadow(0 0 10px #7020A0)';
    }

    if (this.img.complete && this.img.naturalWidth > 0) {
      const w = 180;
      const h = (this.img.height / this.img.width) * w;
      ctx.drawImage(this.img, -w / 2, -h + 20, w, h);
    } else {
      ctx.fillStyle = '#101018';
      ctx.strokeStyle = '#7020A0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-45, -70, 90, 70, 8);
      ctx.fill();
      ctx.stroke();
    }
    ctx.filter = 'none';

    // Draw chromatic energy pips above barrel representing 6 required colors
    const pipSpacing = 18;
    const startPipX = -((this.requiredColors.length - 1) * pipSpacing) / 2;
    const pipY = -160;

    for (let i = 0; i < this.requiredColors.length; i++) {
      const colId = this.requiredColors[i];
      const isLit = this.hitColors.has(colId);
      const px = startPipX + i * pipSpacing;
      const colData = window.LightWars.COLORS[colId];

      ctx.save();
      ctx.beginPath();
      ctx.arc(px, pipY, isLit ? 6.5 : 4.5, 0, Math.PI * 2);
      if (isLit) {
        ctx.fillStyle = colData.hex;
        ctx.shadowColor = colData.hex;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#222233';
        ctx.fill();
        ctx.strokeStyle = colData.hex;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Overhead Title
    ctx.font = '900 13px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#E0D0FF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(`BLACK BOX (${this.hitColors.size}/6)`, 0, pipY - 14);
    ctx.fillText(`BLACK BOX (${this.hitColors.size}/6)`, 0, pipY - 14);

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Barrel = Barrel;
window.LightWars.BlackBarrel = BlackBarrel;
