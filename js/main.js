/**
 * Light-Wars: Main Game Engine & Loop
 * Itch.io ready HTML5 / Canvas 2.5D Action Game
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

    // Input state
    this.input = {
      keys: {},
      mouseX: 0,
      mouseY: 0,
      screenMouseX: 0,
      screenMouseY: 0,
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
  }

  resizeCanvas() {
    // Keep 16:9 aspect ratio crisp on any display / itch.io iframe
    const container = document.getElementById('gameContainer');
    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 720;

    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.camera.viewportWidth = 1280;
    this.camera.viewportHeight = 720;
  }

  bindEvents() {
    // Prevent default scrolling on arrow keys / space
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.input.keys[e.code] = true;

      // Number keys for ammo selection
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
      if (e.code === 'KeyP' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        this.state = (this.state === 'PLAYING') ? 'PAUSED' : 'PLAYING';
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    // Mouse movement & firing
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.input.screenMouseX = (e.clientX - rect.left) * scaleX;
      this.input.screenMouseY = (e.clientY - rect.top) * scaleY;

      // Convert to world coordinates
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

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.input.isMouseDown = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse wheel ammo switching
    this.canvas.addEventListener('wheel', (e) => {
      if (!this.player) return;
      if (e.deltaY > 0) this.player.selectNextColor();
      else if (e.deltaY < 0) this.player.selectPrevColor();
    });

    // Canvas click on ammo HUD
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

    // Touch support for mobile / touchpads
    this.canvas.addEventListener('touchstart', (e) => {
      window.LightWars.sound.resume();
      this.touchControls.active = true;
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.touchControls.stickStartX = (t.clientX - rect.left) * (this.canvas.width / rect.width);
      this.touchControls.stickStartY = (t.clientY - rect.top) * (this.canvas.height / rect.height);
      this.touchControls.stickCurrX = this.touchControls.stickStartX;
      this.touchControls.stickCurrY = this.touchControls.stickStartY;
      this.touchControls.stickActive = true;
      this.handlePlayerShoot();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.touchControls.stickActive) return;
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.touchControls.stickCurrX = (t.clientX - rect.left) * (this.canvas.width / rect.width);
      this.touchControls.stickCurrY = (t.clientY - rect.top) * (this.canvas.height / rect.height);
      const dx = this.touchControls.stickCurrX - this.touchControls.stickStartX;
      const dy = this.touchControls.stickCurrY - this.touchControls.stickStartY;

      this.input.keys['KeyA'] = dx < -20;
      this.input.keys['KeyD'] = dx > 20;
      this.input.keys['KeyW'] = dy < -20;
      this.input.keys['KeyS'] = dy > 20;
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.touchControls.stickActive = false;
      this.input.keys['KeyA'] = false;
      this.input.keys['KeyD'] = false;
      this.input.keys['KeyW'] = false;
      this.input.keys['KeyS'] = false;
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

    // Spawn player at White Light
    this.player = new window.LightWars.Player(this.arena.whiteLight.x, this.arena.whiteLight.y);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    this.enemies = [];
    this.lasers = [];
    this.orbs = [];
    this.particles = new window.LightWars.ParticleSystem();

    this.waves = new window.LightWars.WaveDirector(this);
    this.waves.startLevel1();

    this.state = 'PLAYING';
  }

  spawnEnemy(x, y, colorId) {
    const enemy = new window.LightWars.Enemy(x, y, colorId);
    this.enemies.push(enemy);
    this.particles.spawnBurst(x, y, enemy.colorData.hex, 16);
  }

  spawnOrb(x, y, colorId) {
    const orb = new window.LightWars.Orb(x, y, colorId);
    this.orbs.push(orb);
    window.LightWars.sound.playOrbSpawn();
  }

  handlePlayerShoot() {
    if (this.state !== 'PLAYING' || !this.player || !this.player.alive) return;

    // Refresh world mouse position
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

    // Handle continuous firing when holding mouse button
    if (this.input.isMouseDown) {
      this.handlePlayerShoot();
    }

    // Update Arena
    this.arena.update(dt);

    // Update Player
    if (this.player) {
      this.player.update(dt, this.input, this.arena);
      if (!this.player.alive) {
        this.onGameOver();
        return;
      }
    }

    // Update Camera
    if (this.player) {
      this.camera.update(dt, this.player.x, this.player.y, this.arena.width, this.arena.height);
    }

    // Update Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.update(dt);

      if (!laser.alive) {
        this.lasers.splice(i, 1);
        continue;
      }

      // Check collision with Orbs
      let laserConsumed = false;
      for (let j = this.orbs.length - 1; j >= 0; j--) {
        const orb = this.orbs[j];
        if (!orb.alive) continue;
        const d = Math.hypot(laser.x - orb.x, laser.y - orb.y);
        if (d < orb.radius + laser.radius) {
          const res = orb.hitByLaser(laser.colorId);
          if (res.success) {
            // Orb converted!
            window.LightWars.sound.playOrbConvert();
            this.particles.spawnBurst(orb.x, orb.y, window.LightWars.COLORS[res.resultColor].hex, 28);
            this.particles.spawnComicText(orb.x, orb.y, `+1 ${res.resultColor}!`, window.LightWars.COLORS[res.resultColor].hex);

            // Add ammo to player
            this.player.addAmmo(res.resultColor, 2);
            this.waves.onOrbCrafted(orb.colorId, laser.colorId, res.resultColor);

            laser.alive = false;
            laserConsumed = true;
            break;
          } else {
            // Deflected off orb
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

      // Check collision with Enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (!enemy.alive) continue;
        const d = Math.hypot(laser.x - enemy.x, laser.y - enemy.y);
        if (d < enemy.radius + laser.radius) {
          const hitAngle = Math.atan2(enemy.y - laser.y, enemy.x - laser.x);
          const outcome = enemy.takeLaserHit(laser.colorId, hitAngle);

          laser.alive = false;

          if (outcome.action === 'KILL') {
            enemy.alive = false;
            this.camera.shake(9);
            window.LightWars.sound.playComicDeath();

            // Spawn comic popup word (KAABOOM!, BOOM!, 1CO!)
            const words = window.LightWars.COMIC_DEATH_WORDS;
            const comicWord = words[Math.floor(Math.random() * words.length)];
            this.particles.spawnComicText(enemy.x, enemy.y, comicWord, enemy.colorData.hex);
            this.particles.spawnBurst(enemy.x, enemy.y, enemy.colorData.hex, 32);

            // Check orb drop
            const dropOrbColor = window.LightWars.ENEMY_ORB_DROPS[enemy.colorId];
            if (dropOrbColor) {
              this.spawnOrb(enemy.x, enemy.y, dropOrbColor);
            }

            this.enemies.splice(j, 1);
            this.waves.onEnemyDefeated(enemy);
          } else if (outcome.action === 'TRANSFORM') {
            window.LightWars.sound.playTransform();
            this.particles.spawnBurst(enemy.x, enemy.y, window.LightWars.COLORS[outcome.target].hex, 20);
            this.particles.spawnComicText(enemy.x, enemy.y, `➔ ${outcome.target}!`, window.LightWars.COLORS[outcome.target].hex);
            enemy.setColor(outcome.target);
          } else {
            // Deflected
            this.particles.spawnBurst(laser.x, laser.y, '#AAAAAA', 6);
            this.particles.spawnComicText(enemy.x, enemy.y, 'NO EFFECT', '#FFFFFF');
          }

          break;
        }
      }
    }

    // Update Enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player, this.arena);
    }

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

    // 1. Draw Arena (Floor, grid, White Light pad, pillars)
    this.arena.draw(this.ctx);

    // 2. Draw Floating Orbs
    for (const orb of this.orbs) {
      orb.draw(this.ctx);
    }

    // 3. Draw Lasers
    for (const laser of this.lasers) {
      laser.draw(this.ctx);
    }

    // 4. Draw Enemies (2.5D with Bands)
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx, this.spriteManager);
    }

    // 5. Draw Player Hero
    if (this.player) {
      this.player.draw(this.ctx, this.spriteManager);
    }

    // 6. Draw Particles & Comic Text bursts
    this.particles.draw(this.ctx);

    this.camera.restore(this.ctx);

    // 7. Draw HUD (Screenspace)
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
