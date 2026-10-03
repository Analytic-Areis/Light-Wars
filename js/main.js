/**
 * Light-Wars: Main Game Engine & Loop
 * Full 2.5D Isometric Pathway Dungeon with WASD 8-direction running animations,
 * 92 boundary collision slabs, destructible Barrels, physical Ammo Crystals,
 * and 8 waves featuring Red, Green, Blue, Cyan, Magenta, and Yellow troops.
 */

class LightWarsGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'LEVEL_CLEAR' | 'GAME_OVER'
    this.lastTime = 0;

    // Subsystems
    this.config = window.LightWars.GAME_CONFIG;
    this.arena = new window.LightWars.Arena(this.config.arenaWidth, this.config.arenaHeight);
    this.camera = new window.LightWars.Camera(1280, 720);
    this.spriteManager = new window.LightWars.SpriteManager();
    this.particles = new window.LightWars.ParticleSystem();
    this.ui = new window.LightWars.UIManager();
    this.waves = new window.LightWars.WaveDirector(this);

    // Entities
    this.player = null;
    this.enemies = [];
    this.lasers = [];
    this.orbs = [];
    this.crystals = [];
    this.barrels = [];

    // Input state
    this.input = {
      keys: {},
      mouseX: 1352,
      mouseY: 1502,
      screenMouseX: 640,
      screenMouseY: 360,
      isMouseDown: false,
      dashRequested: false
    };

    // Mobile / Virtual Joystick state
    this.touchControls = {
      active: false,
      stickActive: false,
      stickStartX: 0,
      stickStartY: 0,
      stickCurrX: 0,
      stickCurrY: 0
    };

    this.initWindow();
    this.bindEvents();
    this.setupComicMenu();
  }

  initWindow() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    document.addEventListener('fullscreenchange', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    if (this.camera) {
      this.camera.viewportWidth = w;
      this.camera.viewportHeight = h;
    }
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.input.keys[e.code] = true;

      // Number keys 1-6 for laser ammo selection
      if (e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key, 10) - 1;
        if (this.player) this.player.selectColorIndex(idx);
      }
      if (e.code === 'KeyQ') {
        if (this.player) this.player.selectPrevColor();
      }
      if (e.code === 'KeyE') {
        if (this.player) this.player.selectNextColor();
      }
      if (e.code === 'Space') {
        this.input.dashRequested = true;
      }
      if (e.code === 'KeyM') {
        window.LightWars.sound.toggleMute();
      }
      if (e.code === 'KeyF') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
      if (e.code === 'KeyP' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        this.state = (this.state === 'PLAYING') ? 'PAUSED' : 'PLAYING';
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    // Mouse tracking & firing
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.input.screenMouseX = (e.clientX - rect.left) * scaleX;
      this.input.screenMouseY = (e.clientY - rect.top) * scaleY;

      const worldPos = this.camera.screenToWorld(this.input.screenMouseX, this.input.screenMouseY);
      this.input.mouseX = worldPos.x;
      this.input.mouseY = worldPos.y;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      window.LightWars.sound.resume();
      if (e.button === 0) {
        this.input.isMouseDown = true;
        this.handlePlayerShoot();
      } else if (e.button === 2) {
        e.preventDefault();
        this.input.dashRequested = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.input.isMouseDown = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('wheel', (e) => {
      if (!this.player) return;
      if (e.deltaY > 0) this.player.selectNextColor();
      else if (e.deltaY < 0) this.player.selectPrevColor();
    });

    // Ammo HUD click
    this.canvas.addEventListener('click', (e) => {
      if (!this.player || this.state !== 'PLAYING') return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const clickY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      const ammoBarWidth = 440;
      const ammoBarHeight = 64;
      const startX = (this.canvas.width - ammoBarWidth) / 2;
      const startY = this.canvas.height - ammoBarHeight - 20;

      if (clickX >= startX && clickX <= startX + ammoBarWidth &&
          clickY >= startY && clickY <= startY + ammoBarHeight) {
        const slotWidth = ammoBarWidth / this.player.colorOrder.length;
        const clickedIdx = Math.floor((clickX - startX) / slotWidth);
        this.player.selectColorIndex(clickedIdx);
      }
    });
  }

  setupComicMenu() {
    const playBtn = document.getElementById('startLevel1Btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        window.LightWars.sound.resume();
        this.startLevel1();
      });
    }

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.startLevel1();
      });
    }

    const menuReturnBtn = document.getElementById('menuReturnBtn');
    if (menuReturnBtn) {
      menuReturnBtn.addEventListener('click', () => {
        this.showMenu();
      });
    }
  }

  showMenu() {
    this.state = 'MENU';
    document.getElementById('comicMenu').style.display = 'flex';
    document.getElementById('levelClearModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';
  }

  startLevel1() {
    document.getElementById('comicMenu').style.display = 'none';
    document.getElementById('levelClearModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';

    // Spawn player at White Light Sanctuary (1352, 1502)
    this.player = new window.LightWars.Player(this.arena.whiteLight.x, this.arena.whiteLight.y);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    // Open arena floor without obstacles
    this.barrels = [];

    this.enemies = [];
    this.lasers = [];
    this.orbs = [];
    this.crystals = [];
    this.particles = new window.LightWars.ParticleSystem();

    this.waves = new window.LightWars.WaveDirector(this);
    this.waves.startLevel1();

    this.state = 'PLAYING';
  }

  getSafeEnemySpawnPos(targetX, targetY) {
    if (!this.player || !this.arena) return { x: targetX, y: targetY };

    const pGrid = this.arena.toGrid(this.player.x, this.player.y);
    const sGrid = this.arena.toGrid(targetX, targetY);

    // Exclusion distance: square of at least 3.2 tiles around the player
    const minTileDist = 3.2;
    const dx = Math.abs(sGrid.gx - pGrid.gx);
    const dy = Math.abs(sGrid.gy - pGrid.gy);

    const targetTx = Math.round(sGrid.gx);
    const targetTy = Math.round(sGrid.gy);

    // If proposed point is already outside the 3-tile square and is a walkable tile, keep it!
    if ((dx >= minTileDist || dy >= minTileDist) && this.arena.isWalkableTile(targetTx, targetTy)) {
      return { x: targetX, y: targetY };
    }

    // Otherwise, find a valid walkable arena tile that is strictly >= 3.2 tiles away from player
    // Use Chebyshev norm so stepping outward guarantees being outside the 3-tile square
    let dirGx = sGrid.gx - pGrid.gx;
    let dirGy = sGrid.gy - pGrid.gy;
    if (Math.abs(dirGx) < 0.1 && Math.abs(dirGy) < 0.1) {
      dirGx = 1.0;
      dirGy = 0.0;
    }
    const maxDelta = Math.max(Math.abs(dirGx), Math.abs(dirGy)) || 1.0;
    const stepGx = dirGx / maxDelta; // Normalized so max component is 1.0
    const stepGy = dirGy / maxDelta;

    for (let extra = minTileDist; extra <= 14.0; extra += 0.8) {
      const candGx = Math.round(pGrid.gx + stepGx * extra);
      const candGy = Math.round(pGrid.gy + stepGy * extra);
      const cdx = Math.abs(candGx - pGrid.gx);
      const cdy = Math.abs(candGy - pGrid.gy);
      if ((cdx >= minTileDist || cdy >= minTileDist) && this.arena.isWalkableTile(candGx, candGy)) {
        return this.arena.toScreen(candGx, candGy);
      }
    }

    // Fallback: search all walkable tiles in the arena outside the 3-tile square
    let bestDist = Infinity;
    let bestPos = { x: targetX, y: targetY };

    for (let gx = 2; gx <= 19; gx++) {
      for (let gy = 2; gy <= 15; gy++) {
        if (!this.arena.isWalkableTile(gx, gy)) continue;
        const dTileX = Math.abs(gx - pGrid.gx);
        const dTileY = Math.abs(gy - pGrid.gy);
        if (dTileX < minTileDist && dTileY < minTileDist) continue; // Inside 3-tile exclusion square

        const screenPos = this.arena.toScreen(gx, gy);
        const distToTarget = Math.hypot(screenPos.x - targetX, screenPos.y - targetY);
        if (distToTarget < bestDist) {
          bestDist = distToTarget;
          bestPos = screenPos;
        }
      }
    }

    return bestPos;
  }

  spawnEnemy(x, y, colorId) {
    const safePos = this.getSafeEnemySpawnPos(x, y);
    const enemy = new window.LightWars.Enemy(safePos.x, safePos.y, colorId);
    this.enemies.push(enemy);
    this.particles.spawnBurst(safePos.x, safePos.y, enemy.colorData.hex, 16);
  }

  spawnOrb(x, y, colorId) {
    const orb = new window.LightWars.Orb(x, y, colorId);
    this.orbs.push(orb);
    window.LightWars.sound.playOrbSpawn();
  }

  handlePlayerShoot() {
    if (this.state !== 'PLAYING' || !this.player || !this.player.alive) return;

    const worldPos = this.camera.screenToWorld(this.input.screenMouseX, this.input.screenMouseY);
    this.input.mouseX = worldPos.x;
    this.input.mouseY = worldPos.y;

    const result = this.player.shoot(this.input.mouseX, this.input.mouseY);
    if (result && result.alive) {
      this.lasers.push(result);
      this.waves.stats.shotsFired++;
    }
  }

  onLevelComplete() {
    this.state = 'LEVEL_CLEAR';
    window.LightWars.sound.playVictory();

    document.getElementById('clearKills').innerText = this.waves.stats.enemiesKilled;
    document.getElementById('clearOrbs').innerText = this.waves.stats.orbsCrafted;
    document.getElementById('levelClearModal').style.display = 'flex';
  }

  onGameOver() {
    this.state = 'GAME_OVER';
    document.getElementById('gameOverModal').style.display = 'flex';
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    if (this.input.isMouseDown) {
      this.handlePlayerShoot();
    }

    this.arena.update(dt);

    if (this.player) {
      this.player.update(dt, this.input, this.arena, this.barrels);
      if (!this.player.alive) {
        this.onGameOver();
        return;
      }
    }

    // Update Barrels
    for (const b of this.barrels) {
      b.update(dt);
    }
    this.barrels = this.barrels.filter(b => b.alive);

    // Update Ammo Crystals & Player Collection
    for (const c of this.crystals) {
      c.update(dt);
      if (this.player && this.player.alive) {
        const dist = Math.hypot(this.player.x - c.x, this.player.y - c.y);
        if (dist <= c.pickupRadius + this.player.radius) {
          // Cap check: player cannot collect crystal if inventory for that color is at max cap (6)
          if (this.player.canAddAmmo(c.colorId)) {
            c.collect(this.player, this);
          }
        }
      }
    }
    this.crystals = this.crystals.filter(c => c.alive);

    // Update Camera
    if (this.player) {
      this.camera.update(dt, this.player.x, this.player.y, this.arena.width, this.arena.height);
    }

    // Update Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      const prevX = laser.x;
      const prevY = laser.y;
      laser.update(dt);

      if (!laser.alive) {
        this.lasers.splice(i, 1);
        continue;
      }

      // 1. Boundary Wall Collision Check
      if (this.arena.isPointBlocked(laser.x, laser.y)) {
        laser.alive = false;
        this.particles.spawnBurst(laser.x, laser.y, '#AAAAAA', 8);
        this.lasers.splice(i, 1);
        continue;
      }

      // 2. Destructible Barrel Collision Check
      let hitBarrel = false;
      for (const b of this.barrels) {
        if (!b.alive) continue;
        const dist = Math.hypot(laser.x - b.x, laser.y - (b.y - 12));
        if (dist < b.colRadiusX + laser.radius) {
          hitBarrel = true;
          laser.alive = false;
          this.particles.spawnBurst(laser.x, laser.y, '#D2A679', 10);
          const res = b.takeLaserHit(laser.colorId, laser.angle);
          if (res.destroyed) {
            this.particles.spawnComicText(b.x, b.y, 'CRASH!', '#D2A679');
            if (res.dropColor) {
              this.spawnOrb(b.x, b.y, res.dropColor);
            }
            if (window.LightWars.sound) {
              window.LightWars.sound.playKaboom();
            }
          }
          break;
        }
      }
      if (hitBarrel) {
        this.lasers.splice(i, 1);
        continue;
      }

      // 3. Collision handling based on laser owner
      if (laser.isPlayer) {
        // Player Laser: Check collision with Orbs -> Spawn 2 Ammo Crystals!
        let laserConsumed = false;
        for (let j = this.orbs.length - 1; j >= 0; j--) {
          const orb = this.orbs[j];
          if (!orb.alive) continue;
          const d = Math.hypot(laser.x - orb.x, laser.y - orb.y);
          if (d < (orb.hitRadius || 32)) {
            const res = orb.hitByLaser(laser.colorId);
            if (res.success) {
              laser.alive = false;
              laserConsumed = true;

              // Audio & comic banner
              if (window.LightWars.sound) window.LightWars.sound.playOrbConvert();
              this.particles.spawnBurst(orb.x, orb.y, window.LightWars.COLORS[res.resultColor].hex, 24);
              this.particles.spawnComicText(orb.x, orb.y, 'CRAFTED!', window.LightWars.COLORS[res.resultColor].hex);

              // Exact User Requirement: Place 2 crystals in the place of the orb for player to collect!
              this.crystals.push(new window.LightWars.AmmoCrystal(orb.x, orb.y, res.resultColor, Math.PI));
              this.crystals.push(new window.LightWars.AmmoCrystal(orb.x, orb.y, res.resultColor, 0));

              this.waves.onOrbCrafted(orb.colorId, laser.colorId, res.resultColor);
              break;
            } else {
              // Deflected off incompatible orb
              this.particles.spawnBurst(laser.x, laser.y, '#FFFFFF', 6);
              laser.alive = false;
              laserConsumed = true;
              break;
            }
          }
        }

        if (laserConsumed) {
          this.lasers.splice(i, 1);
          continue;
        }

        // Player Laser: Check collision with Enemies (Whole-body hitbox!)
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          if (!enemy.alive) continue;
          if (enemy.checkLaserHit(laser)) {
            const hitAngle = Math.atan2((enemy.y - 50) - laser.y, enemy.x - laser.x);
            const outcome = enemy.takeLaserHit(laser.colorId, hitAngle);

            laser.alive = false;

            if (outcome.action === 'KILL') {
              window.LightWars.sound.playKaboom();
              this.camera.shake(9);

              this.particles.spawnBurst(enemy.x, enemy.y - 50, window.LightWars.COLORS[enemy.colorId].hex, 28);
              const deathWord = window.LightWars.COMIC_DEATH_WORDS[Math.floor(Math.random() * window.LightWars.COMIC_DEATH_WORDS.length)];
              this.particles.spawnComicText(enemy.x, enemy.y - 70, deathWord, window.LightWars.COLORS[enemy.colorId].hex);

              // Drop orb: Cyan -> Red, Magenta -> Green, Yellow -> Blue; RGB troops drop nothing!
              const dropColor = enemy.getOrbDrop();
              if (dropColor) {
                this.spawnOrb(enemy.x, enemy.y, dropColor);
              }

              this.waves.onEnemyDefeated(enemy);
            } else if (outcome.action === 'TRANSFORM') {
              window.LightWars.sound.playTransform();
              this.particles.spawnBurst(enemy.x, enemy.y - 50, window.LightWars.COLORS[outcome.target].hex, 20);
              this.particles.spawnComicText(enemy.x, enemy.y - 70, `➔ ${outcome.target}!`, window.LightWars.COLORS[outcome.target].hex);
              enemy.setColor(outcome.target);
            } else {
              // 'NONE' -> No change when hit by this color!
              this.particles.spawnBurst(laser.x, laser.y, '#AAAAAA', 8);
              this.particles.spawnComicText(enemy.x, enemy.y - 70, 'NO EFFECT!', '#888888');
            }

            break;
          }
        }
      } else {
        // Enemy Laser: Check collision with Player (Whole-body hitbox!)
        if (this.player && this.player.alive && this.player.checkLaserHit(laser)) {
          laser.alive = false;
          this.player.takeDamage(1, laser.x, laser.y);
          this.camera.shake(5);
          this.particles.spawnBurst(laser.x, laser.y, window.LightWars.COLORS[laser.colorId].hex, 16);
          this.particles.spawnComicText(this.player.x, this.player.y - 70, 'ZAP!', '#FF2A4D');
          if (window.LightWars.sound) {
            window.LightWars.sound.playPlayerHurt();
          }
        }
      }
    }

    // Update Enemies & Enemy Shooting
    for (const enemy of this.enemies) {
      const enemyLaser = enemy.update(dt, this.player, this.arena, this.barrels);
      if (enemyLaser) {
        this.lasers.push(enemyLaser);
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // Update Orbs
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.update(dt);
      if (!orb.alive) {
        this.orbs.splice(i, 1);
      }
    }

    // Update Particles & Comic Texts
    this.particles.update(dt);

    // Update UI banners
    this.ui.update(dt);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'MENU') return;

    // Apply Camera translation
    this.camera.apply(this.ctx);

    // 1. Draw 5520x3388 2.5D Dungeon Arena
    this.arena.draw(this.ctx);

    // 2. Y-sorted 2.5D Entities (Player, Enemies, Barrels, Orbs, Crystals)
    const entities = [...this.orbs, ...this.crystals, ...this.barrels, ...this.enemies];
    if (this.player) entities.push(this.player);
    entities.sort((a, b) => a.y - b.y);

    for (const ent of entities) {
      if (ent instanceof window.LightWars.Player || ent instanceof window.LightWars.Enemy) {
        ent.draw(this.ctx, this.spriteManager);
      } else if (ent.draw) {
        ent.draw(this.ctx);
      }
    }

    // 3. Draw Lasers
    for (const laser of this.lasers) {
      laser.draw(this.ctx);
    }

    // 4. Draw Particles & Comic Text bursts
    this.particles.draw(this.ctx);

    this.camera.restore(this.ctx);

    // 5. Draw Screenspace HUD
    this.ui.drawHUD(this.ctx, this.canvas.width, this.canvas.height, this.player, this.waves);
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new LightWarsGame();
  window.game.start();
});
