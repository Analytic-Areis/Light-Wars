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

/**
 * DashPowerup: Collectible pickup dropped when the Black Orb is destroyed.
 * Floats with glowing particles and an overhead label until the player walks over it.
 */
class DashPowerup {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.pickupRadius = 32;
    this.floatTime = 0;
    this.pulseTime = 0;
    this.alive = true;
    this.isCollected = false;
    this.sparks = [];
  }

  collect(player, game) {
    if (this.isCollected || !this.alive || this.isPickingUp) return false;
    this.isPickingUp = true;
    this.pickupTimer = 0;
    this.targetPlayer = player;
    this.gameRef = game;

    // Audio & initial burst feedback
    if (window.LightWars.sound) {
      if (window.LightWars.sound.playPowerupPickup) {
        window.LightWars.sound.playPowerupPickup();
      }
    }
    if (game && game.particles) {
      game.particles.spawnBurst(this.x, this.y, '#00F0FF', 30);
      game.particles.spawnBurst(this.x, this.y, '#FFE600', 20);
      game.particles.spawnComicText(this.x, this.y - 45, 'DASH ACQUIRED!', '#00F0FF');
    }

    return true;
  }

  update(dt) {
    if (!this.alive) return;
    this.floatTime += dt * 3.8;
    this.pulseTime += dt * 4.5;

    // Pickup Animation sequence
    if (this.isPickingUp) {
      this.pickupTimer += dt;

      // Animate ascending float & attraction toward player
      if (this.targetPlayer) {
        const dx = this.targetPlayer.x - this.x;
        const dy = (this.targetPlayer.y - 10) - this.y;
        this.x += dx * Math.min(1.0, dt * 7.5);
        this.y += dy * Math.min(1.0, dt * 7.5) - (dt * 12);
      }

      // Continuous luminous energy trail while ascending
      if (Math.random() < 0.7) {
        this.sparks.push({
          angle: Math.random() * Math.PI * 2,
          dist: 6 + Math.random() * 16,
          speed: (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 4),
          life: 0.35,
          maxLife: 0.35
        });
      }

      // After 1.4s of glorious pickup animation, finish collection and invoke callback
      if (this.pickupTimer >= 1.4) {
        this.alive = false;
        this.isCollected = true;

        if (this.gameRef && this.gameRef.particles) {
          this.gameRef.particles.spawnBurst(this.x, this.y, '#00F0FF', 35);
          this.gameRef.particles.spawnBurst(this.x, this.y, '#FFFFFF', 25);
        }

        if (this.gameRef && this.gameRef.onDashPowerupCollected) {
          this.gameRef.onDashPowerupCollected(this.x, this.y);
        }
      }
    } else {
      // Ambient lightning sparks before pickup
      if (Math.random() < 0.35) {
        this.sparks.push({
          angle: Math.random() * Math.PI * 2,
          dist: 14 + Math.random() * 12,
          speed: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
          life: 0.4,
          maxLife: 0.4
        });
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.angle += sp.speed * dt;
      sp.life -= dt;
      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    let animScale = 1.0;
    let animAlpha = 1.0;

    if (this.isPickingUp) {
      const progress = Math.min(1.0, this.pickupTimer / 1.4);
      // First expands with energy, then absorbs into player
      if (progress < 0.3) {
        animScale = 1.0 + (progress / 0.3) * 0.45;
      } else {
        animScale = 1.45 - ((progress - 0.3) / 0.7) * 0.95;
      }
      animAlpha = Math.max(0.1, 1.0 - Math.pow(progress, 2.5));
    }

    const bob = Math.sin(this.floatTime) * 4.0;
    const pulse = (1.0 + Math.sin(this.pulseTime) * 0.15) * animScale;
    const cy = this.y - 12 + bob;

    // 1. Ground contact shadow (fades out during pickup animation)
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * animAlpha})`;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 4, 18 * pulse, 8 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, cy);
    ctx.globalAlpha = animAlpha;

    // Shockwave pulse if picking up
    if (this.isPickingUp) {
      const waveRadius = (this.pickupTimer * 60) % 55;
      const waveAlpha = Math.max(0, 1.0 - (waveRadius / 55));
      ctx.save();
      ctx.strokeStyle = `rgba(0, 240, 255, ${waveAlpha * 0.8})`;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 230, 0, ${waveAlpha * 0.6})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Radiant cyan-purple aura flare
    const auraR = 24 * pulse;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, auraR);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.25, '#00F0FF');
    grad.addColorStop(0.6, 'rgba(176, 64, 255, 0.7)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Rotating energy rings (spin faster during pickup)
    const spinMultiplier = this.isPickingUp ? 4.0 : 1.0;
    ctx.save();
    ctx.rotate(this.floatTime * 1.5 * spinMultiplier);
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * animScale, 7 * animScale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-this.floatTime * 1.2 * spinMultiplier);
    ctx.strokeStyle = '#FFE600';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * animScale, 7 * animScale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4. Core glowing sphere / disc
    ctx.beginPath();
    ctx.arc(0, 0, 11 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = '#08081A';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#00F0FF';
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 12 * animScale;
    ctx.stroke();

    // 5. Stylized Dash Lightning Bolt symbol in center
    ctx.save();
    ctx.scale(animScale, animScale);
    ctx.fillStyle = '#FFE600';
    ctx.shadowColor = '#FFE600';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(1, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(-2, 7);
    ctx.lineTo(5, -1);
    ctx.lineTo(1, -1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 6. Orbiting sparks
    for (const sp of this.sparks) {
      const sx = Math.cos(sp.angle) * sp.dist * animScale;
      const sy = Math.sin(sp.angle) * (sp.dist * 0.6) * animScale;
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = (sp.life / sp.maxLife) * animAlpha;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = animAlpha;

    // 7. Overhead Floating Pill Badge: "⚡ DASH POWERUP" (hidden once picked up)
    if (!this.isPickingUp) {
      ctx.font = '900 10px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#000000';
      ctx.strokeText('⚡ DASH POWERUP', 0, -22);
      ctx.fillStyle = '#00F0FF';
      ctx.fillText('⚡ DASH POWERUP', 0, -22);

      ctx.font = '800 8px sans-serif';
      ctx.strokeText('[WALK OVER TO EQUIP]', 0, -12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('[WALK OVER TO EQUIP]', 0, -12);
    }

    ctx.restore();
  }
}


/**
 * InvertPowerup: Collectible pickup dropped when the Black Boss is defeated.
 * Looks like a glowing Uno Reverse Card. Walk over it to unlock Invert Frame.
 */
class InvertPowerup {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.pickupRadius = 32;
    this.floatTime = 0;
    this.pulseTime = 0;
    this.alive = true;
    this.isCollected = false;
    this.sparks = [];
  }

  collect(player, game) {
    if (this.isCollected || !this.alive || this.isPickingUp) return false;
    this.isPickingUp = true;
    this.pickupTimer = 0;
    this.targetPlayer = player;
    this.gameRef = game;

    if (window.LightWars.sound) {
      if (window.LightWars.sound.playPowerupPickup) {
        window.LightWars.sound.playPowerupPickup();
      }
    }
    if (game && game.particles) {
      game.particles.spawnBurst(this.x, this.y, '#FF2A4D', 30);
      game.particles.spawnBurst(this.x, this.y, '#FFFFFF', 20);
      game.particles.spawnComicText(this.x, this.y - 45, 'INVERT FRAME ACQUIRED!', '#FF2A4D');
    }
    return true;
  }

  update(dt) {
    if (!this.alive) return;
    this.floatTime += dt * 3.8;
    this.pulseTime += dt * 4.5;

    if (this.isPickingUp) {
      this.pickupTimer += dt;

      if (this.targetPlayer) {
        const dx = this.targetPlayer.x - this.x;
        const dy = (this.targetPlayer.y - 10) - this.y;
        this.x += dx * Math.min(1.0, dt * 7.5);
        this.y += dy * Math.min(1.0, dt * 7.5) - (dt * 12);
      }

      if (Math.random() < 0.7) {
        this.sparks.push({
          angle: Math.random() * Math.PI * 2,
          dist: 6 + Math.random() * 16,
          speed: (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 4),
          life: 0.35,
          maxLife: 0.35
        });
      }

      if (this.pickupTimer >= 1.4) {
        this.alive = false;
        this.isCollected = true;

        if (this.gameRef && this.gameRef.particles) {
          this.gameRef.particles.spawnBurst(this.x, this.y, '#FF2A4D', 35);
          this.gameRef.particles.spawnBurst(this.x, this.y, '#FFFFFF', 25);
        }

        if (this.gameRef && this.gameRef.onInvertPowerupCollected) {
          this.gameRef.onInvertPowerupCollected(this.x, this.y);
        }
      }
    } else {
      if (Math.random() < 0.35) {
        this.sparks.push({
          angle: Math.random() * Math.PI * 2,
          dist: 14 + Math.random() * 12,
          speed: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
          life: 0.4,
          maxLife: 0.4
        });
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.angle += sp.speed * dt;
      sp.life -= dt;
      if (sp.life <= 0) this.sparks.splice(i, 1);
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    let animScale = 1.0;
    let animAlpha = 1.0;

    if (this.isPickingUp) {
      const progress = Math.min(1.0, this.pickupTimer / 1.4);
      if (progress < 0.3) {
        animScale = 1.0 + (progress / 0.3) * 0.45;
      } else {
        animScale = 1.45 - ((progress - 0.3) / 0.7) * 0.95;
      }
      animAlpha = Math.max(0.1, 1.0 - Math.pow(progress, 2.5));
    }

    const bob = Math.sin(this.floatTime) * 4.0;
    const pulse = (1.0 + Math.sin(this.pulseTime) * 0.15) * animScale;
    const cy = this.y - 12 + bob;

    // 1. Ground shadow
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * animAlpha})`;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 4, 18 * pulse, 8 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, cy);
    ctx.globalAlpha = animAlpha;

    // Shockwave on pickup
    if (this.isPickingUp) {
      const waveRadius = (this.pickupTimer * 60) % 55;
      const waveAlpha = Math.max(0, 1.0 - (waveRadius / 55));
      ctx.save();
      ctx.strokeStyle = `rgba(255, 42, 77, ${waveAlpha * 0.8})`;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha * 0.6})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Radiant red-white aura
    const auraR = 24 * pulse;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, auraR);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.25, '#FF2A4D');
    grad.addColorStop(0.6, 'rgba(160, 0, 32, 0.7)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Slow counter-rotating rings
    const spinMultiplier = this.isPickingUp ? 4.0 : 1.0;
    ctx.save();
    ctx.rotate(this.floatTime * 1.0 * spinMultiplier);
    ctx.strokeStyle = '#FF2A4D';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * animScale, 7 * animScale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-this.floatTime * 0.8 * spinMultiplier);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * animScale, 7 * animScale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4. Core dark sphere
    ctx.beginPath();
    ctx.arc(0, 0, 11 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = '#1A0008';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#FF2A4D';
    ctx.shadowColor = '#FF2A4D';
    ctx.shadowBlur = 12 * animScale;
    ctx.stroke();

    // 5. Uno Reverse Card symbol ↺
    ctx.save();
    ctx.scale(animScale, animScale);
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 7;

    // Card body (rounded rect, tipped ~15°)
    ctx.save();
    ctx.rotate(0.26); // ~15 degrees tilt
    const cw = 9, ch = 13, cr = 2;
    ctx.fillStyle = '#CC0022';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cr);
    ctx.fill();
    ctx.stroke();

    // Oval on card face
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 5.0, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Reverse arrows drawn on top (↺ shape — two arcs with arrow heads)
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);

    // Top arc (left-to-right, top half)
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, Math.PI * 1.15, Math.PI * 1.95, false);
    ctx.stroke();
    // Arrow head for top arc (pointing right at ~1.95π)
    ctx.save();
    ctx.translate(Math.cos(Math.PI * 1.95) * 5.5, Math.sin(Math.PI * 1.95) * 5.5);
    ctx.rotate(Math.PI * 1.95 + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-1.6, -2.8); ctx.lineTo(1.6, -2.8);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Bottom arc (right-to-left, bottom half)
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, Math.PI * 0.15, Math.PI * 0.95, false);
    ctx.stroke();
    // Arrow head for bottom arc (pointing left at ~0.15π)
    ctx.save();
    ctx.translate(Math.cos(Math.PI * 0.15) * 5.5, Math.sin(Math.PI * 0.15) * 5.5);
    ctx.rotate(Math.PI * 0.15 - Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-1.6, -2.8); ctx.lineTo(1.6, -2.8);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.restore();

    // 6. Orbiting sparks (red/white)
    for (const sp of this.sparks) {
      const sx = Math.cos(sp.angle) * sp.dist * animScale;
      const sy = Math.sin(sp.angle) * (sp.dist * 0.6) * animScale;
      ctx.fillStyle = Math.random() > 0.5 ? '#FF2A4D' : '#FFFFFF';
      ctx.globalAlpha = (sp.life / sp.maxLife) * animAlpha;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = animAlpha;

    // 7. Overhead label
    if (!this.isPickingUp) {
      ctx.font = '900 10px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#000000';
      ctx.strokeText('🔄 INVERT POWERUP', 0, -22);
      ctx.fillStyle = '#FF2A4D';
      ctx.fillText('🔄 INVERT POWERUP', 0, -22);

      ctx.font = '800 8px sans-serif';
      ctx.strokeText('[WALK OVER TO EQUIP]', 0, -12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('[WALK OVER TO EQUIP]', 0, -12);
    }

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Barrel = Barrel;
window.LightWars.BlackBarrel = BlackBarrel;
window.LightWars.DashPowerup = DashPowerup;
window.LightWars.InvertPowerup = InvertPowerup;
