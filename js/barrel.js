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

window.LightWars = window.LightWars || {};
window.LightWars.Barrel = Barrel;
