/**
 * Light-Wars: Coloured Enemies with Headbands & Color-Reaction Logic
 * Supports Red, Green, Blue, Cyan, Magenta, Yellow troops.
 * Cyan, Magenta, Yellow drop Red, Green, Blue orbs respectively;
 * Red, Green, Blue troops drop nothing.
 */

class Enemy {
  constructor(x, y, colorId) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.colorId = colorId;
    this.colorData = window.LightWars.COLORS[colorId] || window.LightWars.COLORS.CYAN;
    this.bandColorId = this.colorData.band || this.colorData.complementary;
    this.bandColorData = window.LightWars.COLORS[this.bandColorId] || window.LightWars.COLORS.RED;

    this.radius = 16; // Solid ground body collision hitbox radius
    this.bodyRadius = 15; // Full body laser hit capsule radius
    this.spriteWidth = 50;
    this.spriteHeight = 50;
    this.speed = (105 + Math.random() * 25) * 0.60; // Decreased speed to 60%
    this.alive = true;
    this.health = 2;

    // Animation & physics
    this.walkAnimTime = Math.random() * 25;
    this.idleAnimTime = Math.random() * 25;
    this.isMoving = false;
    this.facingDir = 'S';
    this.facingAngle = 0;
    this.hurtFlash = 0;
    this.transformPulse = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.aggroRange = 1200;
    this.attackCooldown = 0;
    this.shootCooldown = 1.8 + Math.random() * 2.2;

    // Tactical Standoff (stays 4 tiles away from hero, not too far away)
    this.idealMinDist = 160; // ~3.5–4 tiles standoff distance
    this.idealMaxDist = 220; // Proximity cap (4–4.5 tiles away)
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 1.0 + Math.random() * 3.0;
    this.dodgeCooldown = 0.5 + Math.random() * 1.5;
    this.dodgeTimer = 0;
    this.dodgeVx = 0;
    this.dodgeVy = 0;
  }

  /**
   * Modular Dodging Mechanic:
   * Scans incoming player lasers within danger radius and evasively side-steps
   * perpendicular to the incoming laser trajectory.
   * Can be toggled globally via window.LightWars.GAME_CONFIG.enemyDodgingEnabled
   * or per-enemy instance via enemy.dodgingModuleEnabled
   */
  processDodging(dt, lasers = [], arena = null) {
    // Dodging commented out as requested
    return;
    /*
    const config = window.LightWars.GAME_CONFIG || {};
    const moduleEnabled = (this.dodgingModuleEnabled !== undefined)
      ? this.dodgingModuleEnabled
      : (config.enemyDodgingEnabled !== false);

    if (!moduleEnabled) return;

    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      const nextX = this.x + this.dodgeVx * dt;
      const nextY = this.y + this.dodgeVy * dt;
      if (arena && arena.resolveMovement) {
        const res = arena.resolveMovement(this.x, this.y, nextX, nextY, this.radius);
        this.x = res.x;
        this.y = res.y;
      } else {
        this.x = nextX;
        this.y = nextY;
      }
      this.walkAnimTime += dt * 14.0;
      return;
    }

    if (this.dodgeCooldown <= 0 && lasers && lasers.length > 0) {
      const detectRadius = config.enemyDodgeDetectionRadius || 280;
      const dodgeChance = config.enemyDodgeChance !== undefined ? config.enemyDodgeChance : 0.75;
      const dodgeSpeed = config.enemyDodgeSpeed || 230;

      for (const laser of lasers) {
        if (!laser.alive || !laser.isPlayer) continue;

        // Check if laser is heading towards this enemy
        const toEnemyX = this.x - laser.x;
        const toEnemyY = this.y - laser.y;
        const distSq = toEnemyX * toEnemyX + toEnemyY * toEnemyY;

        if (distSq < detectRadius * detectRadius) {
          // Dot product with laser velocity direction
          const laserSpeed = Math.hypot(laser.vx, laser.vy) || 1;
          const lDirX = laser.vx / laserSpeed;
          const lDirY = laser.vy / laserSpeed;
          const dot = toEnemyX * lDirX + toEnemyY * lDirY;

          // If laser is moving towards enemy and close enough
          if (dot > 0 && Math.random() < dodgeChance) {
            // Perpendicular evasive vector (sidestep left or right)
            const sign = Math.random() < 0.5 ? 1 : -1;
            const perpX = -lDirY * sign;
            const perpY = lDirX * sign;

            this.dodgeVx = perpX * dodgeSpeed;
            this.dodgeVy = perpY * dodgeSpeed;
            this.dodgeTimer = 0.28;
            this.dodgeCooldown = config.enemyDodgeCooldown || 2.2;
            break;
          }
        }
      }
    }
    */
  }

  // Whole-body vertical capsule hitbox from feet (y - 4) to head (y - 44 / y - 52 for boss) with continuous sweep segment support
  checkLaserHit(laser) {
    if (!this.alive) return false;
    const topY = this.isBoss ? (this.y - 52) : (this.y - 44);
    const bottomY = this.y - 4;
    const clampedY = Math.max(topY, Math.min(bottomY, laser.y));
    const dist = Math.hypot(laser.x - this.x, laser.y - clampedY);
    const hitRadius = (this.bodyRadius || 15) + laser.radius;
    if (dist < hitRadius) return true;

    // Check continuous sweep segment from prevX, prevY to laser.x, laser.y to prevent tunneling
    if (laser.prevX !== undefined && laser.prevY !== undefined) {
      const dx = laser.x - laser.prevX;
      const dy = laser.y - laser.prevY;
      const segLenSq = dx * dx + dy * dy;
      if (segLenSq > 0.001) {
        const segClampedY = Math.max(topY, Math.min(bottomY, (laser.prevY + laser.y) / 2));
        const t = Math.max(0, Math.min(1, ((this.x - laser.prevX) * dx + (segClampedY - laser.prevY) * dy) / segLenSq));
        const projX = laser.prevX + t * dx;
        const projY = laser.prevY + t * dy;
        const sweepDist = Math.hypot(this.x - projX, segClampedY - projY);
        if (sweepDist < hitRadius) return true;
      }
    }

    return false;
  }

  // Ground-contact-relative sniper rifle muzzle offsets scaled to 1x1 tile size (~50x50 model)
  static MUZZLE_OFFSETS = {
    N:  { x: -1.5, y: -36.0 },
    NE: { x: 7.5,  y: -20.0 },
    E:  { x: 18.5, y: -22.0 },
    SE: { x: 17.5, y: -25.0 },
    S:  { x: 0.0,  y: -12.0 },
    SW: { x: -8.5, y: -23.0 },
    W:  { x: -18.5, y: -17.0 },
    NW: { x: -18.0, y: -20.0 }
  };

  getMuzzlePos(dir) {
    const d = dir || this.facingDir || SpriteManager.getDirection8(this.facingAngle);
    const offset = Enemy.MUZZLE_OFFSETS[d] || { x: 0, y: -22 };
    return {
      x: this.x + offset.x,
      y: this.y + offset.y,
      dir: d
    };
  }

  shoot(targetX, targetY) {
    if (!this.alive || this.shootCooldown > 0) return null;

    // Reset slow shooting cooldown: 3.2 to 4.4 seconds (relative to player's 0.28s cooldown)
    this.shootCooldown = 3.2 + Math.random() * 1.2;

    this.facingDir = SpriteManager.getDirection8(this.facingAngle);
    const muzzle = this.getMuzzlePos(this.facingDir);

    // Aim towards target player chest height (targetY - 20)
    const targetAimY = targetY - 20;
    const enemyCenterY = this.y - 24;
    const bodyAngle = Math.atan2(targetAimY - enemyCenterY, targetX - this.x);
    const distToTarget = Math.hypot(targetX - this.x, targetAimY - enemyCenterY);

    let angle;
    let spawnX;
    let spawnY;

    // At close/point-blank range (or if muzzle could overshoot), aim strictly along body angle and spawn at enemy front
    if (distToTarget < 50) {
      angle = bodyAngle;
      spawnX = this.x + Math.cos(angle) * 10;
      spawnY = enemyCenterY + Math.sin(angle) * 10;
    } else {
      angle = Math.atan2(targetAimY - muzzle.y, targetX - muzzle.x);
      // Safeguard: if angle diverges drastically from body direction towards target, fallback to body angle
      const dot = Math.cos(angle) * Math.cos(bodyAngle) + Math.sin(angle) * Math.sin(bodyAngle);
      if (dot < 0.5) {
        angle = bodyAngle;
      }
      spawnX = muzzle.x + Math.cos(angle) * 12;
      spawnY = muzzle.y + Math.sin(angle) * 12;
    }

    // Slower dodgeable speed (315 px/s, decreased to 75% of original 420 px/s)
    const speed = (window.LightWars.GAME_CONFIG && window.LightWars.GAME_CONFIG.enemyLaserSpeed) || 315;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    if (window.LightWars.sound) {
      window.LightWars.sound.playLaserFire(this.colorId);
    }

    // Enemy shoots its own color! isPlayer = false
    const laser = new window.LightWars.Laser(spawnX, spawnY, vx, vy, this.colorId, false);
    laser.originX = spawnX;
    laser.originY = spawnY;
    laser.prevX = spawnX;
    laser.prevY = spawnY;
    return laser;
  }

  setColor(newColorId) {
    this.colorId = newColorId;
    this.colorData = window.LightWars.COLORS[newColorId];
    this.bandColorId = this.colorData.band || this.colorData.complementary;
    this.bandColorData = window.LightWars.COLORS[this.bandColorId];
    this.transformPulse = 1.0;
  }

  getOrbDrop() {
    // Exact rule: Cyan, Magenta, Yellow drop Red, Green, Blue orbs respectively;
    // Red, Green, Blue troops drop nothing!
    return window.LightWars.ENEMY_ORB_DROPS[this.colorId] || null;
  }

  update(dt, player, arena, barrels = [], lasers = [], otherEnemies = []) {
    if (!this.alive) return;

    // Decay knockback with strict arena collision checks
    if (Math.abs(this.knockbackVx) > 0.1 || Math.abs(this.knockbackVy) > 0.1) {
      const nextX = this.x + this.knockbackVx * dt;
      const nextY = this.y + this.knockbackVy * dt;
      if (arena && arena.resolveMovement) {
        const res = arena.resolveMovement(this.x, this.y, nextX, nextY, this.radius);
        if (Math.abs(res.x - nextX) > 0.05) this.knockbackVx = 0;
        if (Math.abs(res.y - nextY) > 0.05) this.knockbackVy = 0;
        this.x = res.x;
        this.y = res.y;
      } else {
        this.x = nextX;
        this.y = nextY;
      }
      this.knockbackVx *= Math.pow(0.05, dt);
      this.knockbackVy *= Math.pow(0.05, dt);
    }

    // Safety check: ensure enemy is always strictly within the walkable area of the hero
    if (arena && arena.pushOutOfWall) {
      const safe = arena.pushOutOfWall(this.x, this.y, this.radius + 4);
      this.x = safe.x;
      this.y = safe.y;
    }

    if (this.hurtFlash > 0) this.hurtFlash -= dt * 4;
    if (this.transformPulse > 0) this.transformPulse -= dt * 3;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    // Update periodic strafe direction timer
    if (this.strafeTimer !== undefined) {
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeTimer = 1.8 + Math.random() * 2.8;
        this.strafeDir = (this.strafeDir || 1) * -1;
      }
    }

    // Compute dynamic soft separation vector from other living enemies (Flocking / Anti-Crowding)
    let sepX = 0;
    let sepY = 0;
    if (otherEnemies && otherEnemies.length > 1) {
      for (const other of otherEnemies) {
        if (!other || other === this || !other.alive) continue;
        const odx = this.x - other.x;
        const ody = this.y - other.y;
        const odist = Math.hypot(odx, ody);
        const desiredDist = this.radius + other.radius + 18; // ~50px separation boundary
        if (odist < desiredDist) {
          const strength = (desiredDist - odist) / desiredDist;
          if (odist > 0.001) {
            sepX += (odx / odist) * strength;
            sepY += (ody / odist) * strength;
          } else {
            const randA = Math.random() * Math.PI * 2;
            sepX += Math.cos(randA) * strength;
            sepY += Math.sin(randA) * strength;
          }
        }
      }
    }

    // 1. Process Modular Dodging if incoming player laser detected (COMMENTED OUT)
    // this.processDodging(dt, lasers, arena);

    let firedLaser = null;

    // 2. Tactical AI Navigation & Ranged Combat
    if (player && player.alive) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      this.facingAngle = Math.atan2(dy, dx);

      // Shoot safely from far away (up to 850px range)
      if (dist <= 850 && this.shootCooldown <= 0) {
        firedLaser = this.shoot(player.x, player.y);
      }

      // Safe Standoff Positioning:
      // Bots DO NOT come too close to player!
      // - If dist < idealMinDist: Back away to maintain safe distance
      // - If dist > idealMaxDist: Advance towards player (steering around neighboring enemies)
      // - If within safe zone: Actively space out if crowded, or gently strafe around player
      /*
      if (this.dodgeTimer > 0) {
        // Currently executing dodge impulse (COMMENTED OUT)
        this.isMoving = true;
        this.facingDir = SpriteManager.getDirection8(this.facingAngle);
      } else
      */
      if (dist < this.idealMinDist) {
        // TOO CLOSE: Back away from the player to stay safe!
        let nx = -dx / dist;
        let ny = -dy / dist;
        // Blend with separation vector
        if (sepX !== 0 || sepY !== 0) {
          nx += sepX * 1.2;
          ny += sepY * 1.2;
          const len = Math.hypot(nx, ny) || 1;
          nx /= len;
          ny /= len;
        }

        const retreatSpeed = this.speed * 1.15;
        let moveNx = nx;
        let moveNy = ny;

        // If direct retreat leads into a wall, steer sideways (strafe) along open floor
        if (arena && arena.isBodyBlocked && arena.isBodyBlocked(this.x + nx * retreatSpeed * dt, this.y + ny * retreatSpeed * dt, this.radius + 4)) {
          const perpX = -ny * (this.strafeDir || 1);
          const perpY = nx * (this.strafeDir || 1);
          if (!arena.isBodyBlocked(this.x + perpX * retreatSpeed * dt, this.y + perpY * retreatSpeed * dt, this.radius + 2)) {
            moveNx = perpX;
            moveNy = perpY;
          } else if (!arena.isBodyBlocked(this.x - perpX * retreatSpeed * dt, this.y - perpY * retreatSpeed * dt, this.radius + 2)) {
            moveNx = -perpX;
            moveNy = -perpY;
            this.strafeDir = (this.strafeDir || 1) * -1;
          }
        }

        const nextX = this.x + moveNx * retreatSpeed * dt;
        const nextY = this.y + moveNy * retreatSpeed * dt;

        if (arena && arena.resolveMovement) {
          const res = arena.resolveMovement(this.x, this.y, nextX, nextY, this.radius);
          this.x = res.x;
          this.y = res.y;
        } else {
          this.x = nextX;
          this.y = nextY;
        }

        this.isMoving = true;
        this.walkAnimTime += dt * 12.0;
        this.facingDir = SpriteManager.getDirection8(this.facingAngle);
      } else if (dist > this.idealMaxDist && dist < this.aggroRange) {
        // TOO FAR: Close in until in safe shooting range, but steer around other enemies!
        let nx = dx / dist;
        let ny = dy / dist;
        if (sepX !== 0 || sepY !== 0) {
          nx += sepX * 1.4;
          ny += sepY * 1.4;
          const len = Math.hypot(nx, ny) || 1;
          nx /= len;
          ny /= len;
        }

        const nextX = this.x + nx * this.speed * dt;
        const nextY = this.y + ny * this.speed * dt;

        if (arena && arena.resolveMovement) {
          const res = arena.resolveMovement(this.x, this.y, nextX, nextY, this.radius);
          this.x = res.x;
          this.y = res.y;
        } else {
          this.x = nextX;
          this.y = nextY;
        }

        this.isMoving = true;
        this.walkAnimTime += dt * 12.0;
        this.facingDir = SpriteManager.getDirection8(this.facingAngle);
      } else {
        // IN SWEET SPOT:
        // If crowded by another enemy, actively step away so they never stand in the same place!
        const sepDist = Math.hypot(sepX, sepY);
        if (sepDist > 0.05) {
          const snx = sepX / sepDist;
          const sny = sepY / sepDist;
          const spreadSpeed = this.speed * 0.75;
          const nextX = this.x + snx * spreadSpeed * dt;
          const nextY = this.y + sny * spreadSpeed * dt;

          if (arena && arena.resolveMovement) {
            const res = arena.resolveMovement(this.x, this.y, nextX, nextY, this.radius);
            this.x = res.x;
            this.y = res.y;
          } else {
            this.x = nextX;
            this.y = nextY;
          }

          this.isMoving = true;
          this.walkAnimTime += dt * 10.0;
          this.facingDir = SpriteManager.getDirection8(this.facingAngle);
        } else {
          // Uncrowded: subtle orbital drift around the player to stay dynamic
          const perpX = -Math.sin(this.facingAngle) * (this.strafeDir || 1);
          const perpY = Math.cos(this.facingAngle) * (this.strafeDir || 1);
          const driftSpeed = 20;
          const nextX = this.x + perpX * driftSpeed * dt;
          const nextY = this.y + perpY * driftSpeed * dt;

          if (arena && arena.resolveMovement) {
            const res = arena.resolveMovement(this.x, this.y, nextX, nextY, this.radius);
            this.x = res.x;
            this.y = res.y;
          } else {
            this.x = nextX;
            this.y = nextY;
          }

          this.isMoving = false;
          this.idleAnimTime += dt * 10.0;
          this.facingDir = SpriteManager.getDirection8(this.facingAngle);
        }
      }

      // Safeguard melee damage if player rushes into the enemy
      const minContactDist = this.radius + player.radius;
      if (dist <= minContactDist + 4 && this.attackCooldown <= 0) {
        player.takeDamage(1, this.x, this.y, false);
        this.attackCooldown = 1.2;
      }
    } else {
      this.isMoving = false;
      this.idleAnimTime += dt * 10.0;
    }

    // 2. Barrels Collision
    for (const b of barrels) {
      if (!b.alive) continue;
      const res = b.resolveCircleCollision(this.x, this.y, this.radius);
      if (res.collided) {
        this.x = res.x;
        this.y = res.y;
      }
    }

    // Final boundary safeguard: keep enemy strictly clear of any blocked boundary walls
    if (arena && arena.pushOutOfWall) {
      const safe = arena.pushOutOfWall(this.x, this.y, this.radius + 4);
      this.x = safe.x;
      this.y = safe.y;
    }

    return firedLaser;
  }

  takeLaserHit(laserColorId, hitAngle) {
    const isInverted = window.game && window.game.physicsInverted;
    const rulesTable = isInverted
      ? window.LightWars.ENEMY_INTERACTIONS_INVERTED
      : window.LightWars.ENEMY_INTERACTIONS;
    const rules = rulesTable[this.colorId];
    const interaction = (rules && rules[laserColorId]) ? rules[laserColorId] : { action: 'NONE' };

    // Apply brief knockback
    this.knockbackVx = Math.cos(hitAngle) * 140;
    this.knockbackVy = Math.sin(hitAngle) * 140;
    this.hurtFlash = 1.0;

    if (interaction.action === 'KILL') {
      // Counter weakness is instant 1-hit kill
      this.health = 0;
      this.alive = false;
      return { action: 'KILL' };
    }

    if (interaction.action === 'TRANSFORM') {
      return { action: 'TRANSFORM', target: interaction.target };
    }

    // action === 'NONE' -> No change when hit by this color!
    return { action: 'NONE' };
  }

  draw(ctx, spriteManager) {
    if (!this.alive) return;

    // 1. Ground Contact Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 0.9, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);

    // 2. Custom Troop Sprite Rendering
    if (spriteManager && spriteManager.drawEnemy(ctx, this)) {
      this.drawContraryEssence(ctx);
      ctx.restore();
      return;
    }

    // Fallback Procedural Troop Sphere
    ctx.fillStyle = this.colorData.hex;
    ctx.beginPath();
    ctx.arc(0, -this.radius * 0.8, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#111';
    ctx.stroke();

    this.drawContraryEssence(ctx);
    ctx.restore();
  }

  // Visual essence of contrary color: floating head diamond crystal (chest red blob removed)
  drawContraryEssence(ctx) {
    if (this.isBoss) return; // Boss has its own void aura
    const colHex = this.bandColorData ? this.bandColorData.hex : '#FF2A4D';
    const now = Date.now();
    const pulse = 1.0 + Math.sin(now * 0.006 + this.x * 0.01) * 0.22;

    // 2. Floating Contrary Energy Diamond Indicator above head (y = -52)
    const floatY = -52 + Math.sin(now * 0.005 + this.y * 0.01) * 2.5;
    const diaSize = 3.6 * pulse;

    ctx.save();
    // Soft glow behind diamond
    const diaGrad = ctx.createRadialGradient(0, floatY, 0.5, 0, floatY, 8 * pulse);
    diaGrad.addColorStop(0, colHex);
    diaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = diaGrad;
    ctx.beginPath();
    ctx.arc(0, floatY, 8 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(0, floatY - diaSize);
    ctx.lineTo(diaSize * 0.8, floatY);
    ctx.lineTo(0, floatY + diaSize);
    ctx.lineTo(-diaSize * 0.8, floatY);
    ctx.closePath();
    ctx.fillStyle = colHex;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Black Boss: Master of Darkness (Level 3 Void Overlord)
 * - 3 Health points (takes 3 hits of WHITE laser bullets)
 * - Fires homing black bullets that can be dodged with skill, range, and dash
 * - Randomly shakes left and right at high speed for 1s to invert light physics:
 *   Inversion lasts 10s: makes weak strong and strong weak!
 *   After losing 1 heart (hp=2): periodic every 30s
 *   On last heart (hp=1): periodic every 15s
 */
class BlackBoss extends Enemy {
  constructor(x, y) {
    super(x, y, 'BLACK');
    this.isBoss = true;
    this.name = "The Black Boss";
    this.maxHealth = 3;
    this.health = 3;
    this.radius = 24; // Boss solid collision hitbox radius
    this.bodyRadius = 22; // Boss laser hitbox radius
    this.spriteWidth = 50;
    this.spriteHeight = 50;
    this.speed = 90 * 0.60; // Decreased speed to 60%

    // Shooting: black homing bullets
    this.shootCooldown = 2.5;
    this.idealMinDist = 180; // ~4 tiles standoff
    this.idealMaxDist = 240; // 4–5 tiles cap

    // Physics Inversion ability
    this.inversionState = 'IDLE'; // 'IDLE' | 'PREPARING_SHAKE' | 'INVERTED'
    this.shakeDuration = 1.0;
    this.shakeTimer = 0;
    this.shakeOffset = 0;
    this.inversionDuration = 10.0;
    this.inversionTimer = 0;
    this.abilityIntervalTimer = 999; // Initial delay before periodic triggers
    this.firstInversionTriggered = false;
    this.auraPulse = 0;
  }

  // Check if physics inversion is currently active
  isPhysicsInverted() {
    return this.inversionState === 'INVERTED';
  }

  // Black Boss is invulnerable while inverting reality or preparing shake
  isInvulnerable() {
    return this.inversionState === 'INVERTED' || this.inversionState === 'PREPARING_SHAKE';
  }

  triggerPhysicsInversion() {
    if (this.inversionState !== 'IDLE') return;
    this.inversionState = 'PREPARING_SHAKE';
    this.shakeTimer = this.shakeDuration;
    if (window.LightWars.sound) {
      window.LightWars.sound.playTransform();
    }
  }

  update(dt, player, arena, barrels = [], lasers = [], otherEnemies = []) {
    if (!this.alive) return null;

    this.auraPulse += dt * 4;

    // Periodic Inversion Timer based on health
    // Full HP (3): no periodic trigger (stays idle)
    // 2 HP (lost 1 heart): triggers periodically every 30 seconds
    // 1 HP (last heart): triggers periodically every 15 seconds
    if (this.health === 2) {
      this.abilityIntervalTimer -= dt;
      if (this.abilityIntervalTimer <= 0 && this.inversionState === 'IDLE') {
        this.abilityIntervalTimer = 30.0;
        this.triggerPhysicsInversion();
      }
    } else if (this.health === 1) {
      this.abilityIntervalTimer -= dt;
      if (this.abilityIntervalTimer <= 0 && this.inversionState === 'IDLE') {
        this.abilityIntervalTimer = 15.0;
        this.triggerPhysicsInversion();
      }
    }

    // Handle high-speed left/right shaking during 1s preparation
    if (this.inversionState === 'PREPARING_SHAKE') {
      this.shakeTimer -= dt;
      // High speed oscillation: 50 Hz
      this.shakeOffset = Math.sin(this.shakeTimer * 50) * 16;

      if (this.shakeTimer <= 0) {
        this.shakeOffset = 0;
        this.inversionState = 'INVERTED';
        this.inversionTimer = this.inversionDuration;

        // Notify game engine
        if (window.game) {
          window.game.physicsInverted = true;
          window.game.particles.spawnComicText(this.x, this.y - 120, "PHYSICS INVERTED!", "#00F0FF");
          if (window.game.waves && window.game.waves.onBossPhysicsInversionActivated) {
            window.game.waves.onBossPhysicsInversionActivated();
          }
        }
      }
      // While charging up the reality shift, boss stands firm
      return null;
    }

    // Handle active 10s inverted physics
    if (this.inversionState === 'INVERTED') {
      this.inversionTimer -= dt;
      if (this.inversionTimer <= 0) {
        this.inversionState = 'IDLE';
        if (window.game) {
          window.game.physicsInverted = false;
          window.game.particles.spawnComicText(this.x, this.y - 120, "PHYSICS RESTORED!", "#FFFFFF");
        }
      }
    }

    // Call standard navigation & movement
    const standardLaser = super.update(dt, player, arena, barrels, lasers, otherEnemies);

    // If super fired a laser, override with Homing Black Bullet!
    if (standardLaser) {
      // Create homing black laser (decreased to 75% of original 310 px/s)
      const homingSpeed = (window.LightWars.GAME_CONFIG && window.LightWars.GAME_CONFIG.bossLaserSpeed) || 232.5;
      const homingLaser = new window.LightWars.Laser(
        standardLaser.x,
        standardLaser.y,
        standardLaser.vx * 0.75, // Scaled down launch speed: dodgeable with skill/dash
        standardLaser.vy * 0.75,
        'BLACK',
        false,
        {
          isHoming: true,
          target: player,
          speed: homingSpeed,
          turnRate: 2.1, // Smooth turning curve allowing evade & dash
          homingLife: 1.5 // Exactly 1.5s timer before disappearing
        }
      );
      homingLaser.originX = standardLaser.originX;
      homingLaser.originY = standardLaser.originY;
      return homingLaser;
    }

    return null;
  }

  takeLaserHit(laserColorId, hitAngle) {
    this.knockbackVx = Math.cos(hitAngle) * 120;
    this.knockbackVy = Math.sin(hitAngle) * 120;
    this.hurtFlash = 1.0;

    // If boss is invulnerable (during shaking or reality inversion), immune to ALL attacks!
    if (this.isInvulnerable()) {
      if (window.game && window.game.particles) {
        window.game.particles.spawnBurst(this.x, this.y - 20, '#00F0FF', 14);
        window.game.particles.spawnComicText(this.x, this.y - 60, 'IMMUNE!', '#00F0FF');
      }
      return { action: 'NONE' };
    }

    // Black Boss ONLY takes damage from WHITE laser bullets!
    if (laserColorId === 'WHITE') {
      this.health -= 1;
      const heartsLeft = this.health;

      if (window.game) {
        window.game.camera.shake(14);
        window.LightWars.sound.playKaboom();
      }

      if (this.health <= 0) {
        this.health = 0;
        this.alive = false;
        if (window.game) window.game.physicsInverted = false;
        return { action: 'KILL', bossDead: true };
      }

      // Notify waves director so minions can replenish and boss can prepare invert
      if (window.game && window.game.waves && window.game.waves.onBossHit) {
        window.game.waves.onBossHit(heartsLeft);
      }

      return { action: 'BOSS_HIT', remainingHealth: heartsLeft };
    }

    // Any other laser color deflects off void shields
    return { action: 'NONE' };
  }

  draw(ctx, spriteManager) {
    if (!this.alive) return;

    // Ground Contact Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(this.x + this.shakeOffset, this.y, this.radius * 1.3, this.radius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x + this.shakeOffset, this.y);

    // Glowing void aura around Boss
    const pulse = 1.0 + Math.sin(this.auraPulse) * 0.12;
    const auraColor = (this.inversionState === 'INVERTED') ? 'rgba(0, 240, 255, 0.35)' : 'rgba(160, 32, 240, 0.35)';
    const grad = ctx.createRadialGradient(0, -22, 5, 0, -22, 35 * pulse);
    grad.addColorStop(0, auraColor);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -22, 35 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Inversion shimmer effect if inverted
    // Inversion / Invulnerability barrier effect
    if (this.isInvulnerable()) {
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(0, -22, 32 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer hexagonal protective forcefield
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const ang = (s * Math.PI) / 3 + this.auraPulse * 0.5;
        const rad = 36 * pulse;
        const hx = Math.cos(ang) * rad;
        const hy = -22 + Math.sin(ang) * rad;
        if (s === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Render Boss Sprite (scale = 50x50, 1x1 tile)
    let spriteRendered = false;
    if (spriteManager) {
      const dir = this.facingDir || SpriteManager.getDirection8(this.facingAngle) || 'S';
      let img = null;
      let frameIdx = 0;
      if (this.isMoving) {
        img = spriteManager.getSprite(`BLACK_${dir}_walk`) || spriteManager.getSprite(`BOSS_${dir}_walk`) || spriteManager.getSprite(`BLACK_S_walk`);
        frameIdx = Math.floor(this.walkAnimTime) % 25;
      } else {
        img = spriteManager.getSprite(`BLACK_${dir}_idle`) || spriteManager.getSprite(`BOSS_${dir}_idle`) || spriteManager.getSprite(`BLACK_S_idle`);
        frameIdx = Math.floor(this.idleAnimTime || 0) % 25;
      }

      if (img) {
        const col = frameIdx % 5;
        const row = Math.floor(frameIdx / 5);
        const frameW = 256;
        const frameH = 256;
        const sx = col * frameW;
        const sy = row * frameH;

        if (this.hurtFlash > 0) {
          ctx.filter = 'brightness(3.5) contrast(1.8)';
        }
        const h = 50;
        const w = 50;
        const feetOffset = h * (224 / 256);
        ctx.drawImage(img, sx, sy, frameW, frameH, -w / 2, -feetOffset, w, h);
        ctx.filter = 'none';
        spriteRendered = true;
      }
    }

    if (!spriteRendered) {
      ctx.fillStyle = '#101018';
      ctx.beginPath();
      ctx.arc(0, -this.radius * 1.2, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#A020F0';
      ctx.stroke();
    }

    // Overhead Boss Health Bar (3 Hearts)
    const heartSpacing = 16;
    const startHeartX = -((this.maxHealth - 1) * heartSpacing) / 2;
    const heartY = -55;

    for (let i = 0; i < this.maxHealth; i++) {
      const isFilled = i < this.health;
      const hx = startHeartX + i * heartSpacing;
      ctx.save();
      ctx.translate(hx, heartY);
      ctx.scale(0.5, 0.5);
      ctx.fillStyle = isFilled ? '#FF2A4D' : '#33384D';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(0, 0, -6, -4, -10, -4);
      ctx.bezierCurveTo(-16, -4, -16, 4, -16, 4);
      ctx.bezierCurveTo(-16, 10, -8, 16, 0, 22);
      ctx.bezierCurveTo(8, 16, 16, 10, 16, 4);
      ctx.bezierCurveTo(16, 4, 16, -4, 10, -4);
      ctx.bezierCurveTo(6, -4, 0, 0, 0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Boss Name Label
    ctx.font = '900 11px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFE600';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeText("THE BLACK BOSS", 0, heartY - 8);
    ctx.fillText("THE BLACK BOSS", 0, heartY - 8);

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Enemy = Enemy;
window.LightWars.BlackBoss = BlackBoss;
