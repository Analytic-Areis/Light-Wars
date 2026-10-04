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
      if (e.code === 'Escape') {
        if (this.state === 'TUTORIAL') {
          this.dismissTutorial();
        } else if (this.state === 'PLAYING') {
          this.togglePauseMenu(true);
        } else if (this.state === 'PAUSED') {
          this.togglePauseMenu(false);
        }
      }
      if ((e.code === 'Enter' || e.code === 'Space') && this.state === 'TUTORIAL') {
        this.dismissTutorial();
      }
      if (e.code === 'KeyH' || e.code === 'KeyI') {
        if (this.state === 'TUTORIAL') {
          this.dismissTutorial();
        } else if (this.state === 'PLAYING') {
          this.showInstructionsModal();
        }
      }
      if (e.code === 'KeyP' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        this.togglePauseMenu(this.state === 'PLAYING');
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

    const play2Btn = document.getElementById('startLevel2Btn');
    if (play2Btn) {
      play2Btn.addEventListener('click', () => {
        window.LightWars.sound.resume();
        this.startLevel2();
      });
    }

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (this._lastLevel === 2) this.startLevel2();
        else this.startLevel1();
      });
    }

    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        if (this._lastLevel === 2) this.startLevel2();
        else this.startLevel1();
      });
    }

    const menuReturnBtn = document.getElementById('menuReturnBtn');
    if (menuReturnBtn) {
      menuReturnBtn.addEventListener('click', () => {
        this.showMenu();
      });
    }

    const page2Btn = document.getElementById('goToPage2Btn');
    if (page2Btn) {
      page2Btn.addEventListener('click', () => {
        alert('ISSUE #2 • THE WHITE BOSS AWAKENING\nComing in the next chapter of the chromatic war!');
      });
    }

    // Escape Pause Menu controls
    const pauseResumeBtn = document.getElementById('pauseResumeBtn');
    if (pauseResumeBtn) {
      pauseResumeBtn.addEventListener('click', () => {
        this.togglePauseMenu(false);
      });
    }

    const pauseRestartBtn = document.getElementById('pauseRestartBtn');
    if (pauseRestartBtn) {
      pauseRestartBtn.addEventListener('click', () => {
        this.togglePauseMenu(false);
        if (this._lastLevel === 2) this.startLevel2();
        else this.startLevel1();
      });
    }

    const pauseMenuBtn = document.getElementById('pauseMenuBtn');
    if (pauseMenuBtn) {
      pauseMenuBtn.addEventListener('click', () => {
        this.togglePauseMenu(false);
        this.showMenu();
      });
    }

    // Volume sliders
    const sfxSlider = document.getElementById('sfxVolumeSlider');
    const sfxVal = document.getElementById('sfxVolumeVal');
    if (sfxSlider && sfxVal) {
      sfxSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        sfxVal.textContent = `${Math.round(val * 100)}%`;
        if (window.LightWars.sound) {
          window.LightWars.sound.setSfxVolume(val);
        }
      });
    }

    const musicSlider = document.getElementById('musicVolumeSlider');
    const musicVal = document.getElementById('musicVolumeVal');
    if (musicSlider && musicVal) {
      musicSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        musicVal.textContent = `${Math.round(val * 100)}%`;
        if (window.LightWars.sound) {
          window.LightWars.sound.setMusicVolume(val);
        }
      });
    }

    // Stop Tutorial / Noobi-Wan Instruction Modal dismiss
    const tutorialDismissBtn = document.getElementById('tutorialDismissBtn');
    if (tutorialDismissBtn) {
      tutorialDismissBtn.addEventListener('click', () => {
        this.dismissTutorial();
      });
    }

    const tutorialModal = document.getElementById('tutorialModal');
    if (tutorialModal) {
      tutorialModal.addEventListener('click', (e) => {
        if (e.target === tutorialModal || e.target.classList.contains('noobi-art-img')) {
          this.dismissTutorial();
        }
      });
    }

    const pauseInstructionsBtn = document.getElementById('pauseInstructionsBtn');
    if (pauseInstructionsBtn) {
      pauseInstructionsBtn.addEventListener('click', () => {
        this.togglePauseMenu(false);
        this.showInstructionsModal();
      });
    }

    this.updateComicMenuLockState();
    this.updateComicMenuBossState();
  }

  togglePauseMenu(show) {
    const pauseModal = document.getElementById('escapePauseModal');
    if (!pauseModal) return;

    if (show) {
      this.state = 'PAUSED';
      pauseModal.style.display = 'flex';
    } else {
      pauseModal.style.display = 'none';
      if (this.state === 'PAUSED') {
        this.state = 'PLAYING';
      }
    }
  }

  showStopTutorial(id, title, message) {
    if (id && this._tutorialsSeen && this._tutorialsSeen[id]) return;
    if (id) {
      if (!this._tutorialsSeen) this._tutorialsSeen = {};
      this._tutorialsSeen[id] = true;
    }

    if (!this._tutorialQueue) this._tutorialQueue = [];

    // If currently displaying a tutorial, queue this one
    if (this.state === 'TUTORIAL') {
      this._tutorialQueue.push({ title, message });
      return;
    }

    if (this.state !== 'TUTORIAL') {
      this._savedPreTutorialState = this.state;
    }
    this.state = 'TUTORIAL';
    this._displayTutorialModal(title, message);
  }

  _displayTutorialModal(title, message) {
    const modal = document.getElementById('tutorialModal');
    const titleEl = document.getElementById('tutorialTitle');
    const msgEl = document.getElementById('tutorialMessage');
    if (titleEl) titleEl.innerHTML = title;
    if (msgEl) msgEl.innerHTML = message;

    if (modal) {
      modal.style.display = 'flex';
      // Force reflow and add visible class for smooth slide-up & fade-in transition
      void modal.offsetWidth;
      requestAnimationFrame(() => {
        modal.classList.add('visible');
      });
    }
  }

  dismissTutorial() {
    const modal = document.getElementById('tutorialModal');
    if (modal) {
      modal.classList.remove('visible');
    }

    // If another instruction is queued, transition smoothly to it
    if (this._tutorialQueue && this._tutorialQueue.length > 0) {
      const next = this._tutorialQueue.shift();
      setTimeout(() => {
        this._displayTutorialModal(next.title, next.message);
      }, 250);
      return;
    }

    setTimeout(() => {
      if (this.state !== 'TUTORIAL') {
        if (modal) modal.style.display = 'none';
      }
    }, 350);

    this.state = (this._savedPreTutorialState && this._savedPreTutorialState !== 'TUTORIAL') 
      ? this._savedPreTutorialState 
      : 'PLAYING';
    this._savedPreTutorialState = 'PLAYING';
  }

  showInstructionsModal() {
    const lvl = this._lastLevel || 1;
    let title, message;
    if (lvl === 1) {
      title = "FIELD GUIDE: LEVEL 1 TACTICS";
      message = 
        "Listen closely, Luke. Here is your tactical briefing for Level 1:<br><br>" +
        "• <b>CONTROLS:</b> Move with <span class=\"noobi-key\">[W][A][S][D]</span> | Aim & Shoot: <span class=\"noobi-key\">[MOUSE]</span> | Dash: <span class=\"noobi-key\">[SPACE / RMB]</span>.<br>" +
        "• <b>LEVEL 1 RULES:</b> Firing wrong colors has <b>NO EFFECT</b>. Strike enemies with their exact complementary counter:<br>" +
        "&nbsp;&nbsp;&bull; <span class=\"noobi-hl cyan\">CYAN TROOP</span> &rarr; Kill with <span class=\"noobi-hl red\">RED LASER [1]</span> (Drops <span class=\"noobi-hl red\">Red Orbs</span>)<br>" +
        "&nbsp;&nbsp;&bull; <span class=\"noobi-hl magenta\">MAGENTA TROOP</span> &rarr; Kill with <span class=\"noobi-hl green\">GREEN LASER [2]</span> (Drops <span class=\"noobi-hl green\">Green Orbs</span>)<br>" +
        "&nbsp;&nbsp;&bull; <span class=\"noobi-hl yellow\">YELLOW TROOP</span> &rarr; Kill with <span class=\"noobi-hl blue\">BLUE LASER [3]</span> (Drops <span class=\"noobi-hl blue\">Blue Orbs</span>)<br>" +
        "• <b>ORB FUSION:</b> Walk over orbs to collect, or shoot with your laser to craft 2 Ammo Crystals on the spot!<br>" +
        "• <b>RECHARGE:</b> Step onto the white glowing sanctuary circle to reload your energy.<br><br>" +
        "Press <span class=\"noobi-key\">[H]</span> anytime in battle to re-open this guide.";
    } else {
      title = "FIELD GUIDE: LEVEL 2 TACTICS";
      message = 
        "Welcome to the Dungeon Arena, Luke. The chromatic battlefield expands:<br><br>" +
        "• <b>NEW TROOPS:</b> <span class=\"noobi-hl red\">RED</span>, <span class=\"noobi-hl green\">GREEN</span>, and <span class=\"noobi-hl blue\">BLUE</span> troops enter the war!<br>" +
        "• <b>COLOR TRANSFORMATION:</b> Hitting troops with non-lethal wavelengths transforms them into another color!<br>" +
        "• <b>COUNTER MATRIX:</b><br>" +
        "&nbsp;&nbsp;&bull; <span class=\"noobi-hl red\">RED</span> dies to <span class=\"noobi-hl cyan\">CYAN [4]</span> | <span class=\"noobi-hl green\">GREEN</span> dies to <span class=\"noobi-hl magenta\">MAGENTA [5]</span> | <span class=\"noobi-hl blue\">BLUE</span> dies to <span class=\"noobi-hl yellow\">YELLOW [6]</span><br>" +
        "• Fuse orbs with your blasters to synthesize high-spectrum Ammo Crystals!";
    }
    this.showStopTutorial(null, title, message);
  }

  /** Show/hide row lock overlays based on progress flags */
  updateComicMenuLockState() {
    const level1Cleared = localStorage.getItem('lightwars_level1_cleared') === 'true';
    const level2Cleared = localStorage.getItem('lightwars_level2_cleared') === 'true';

    // Row 2 lock
    const row2Overlay = document.getElementById('row2LockOverlay');
    if (row2Overlay) row2Overlay.style.display = level1Cleared ? 'none' : 'flex';

    // Mission 2 — unlock content
    const mission2LockedContent = document.getElementById('mission2LockedContent');
    const mission2Briefing = document.getElementById('mission2Briefing');
    const mission2StatusPill = document.getElementById('mission2StatusPill');
    const startLevel2Btn = document.getElementById('startLevel2Btn');
    if (level1Cleared) {
      if (mission2LockedContent) mission2LockedContent.style.display = 'none';
      if (mission2Briefing) mission2Briefing.style.display = 'block';
      if (mission2StatusPill) {
        mission2StatusPill.textContent = 'READY';
        mission2StatusPill.className = 'comic-status-pill ready';
      }
      if (startLevel2Btn) startLevel2Btn.style.display = '';
    } else {
      if (mission2LockedContent) mission2LockedContent.style.display = '';
      if (mission2Briefing) mission2Briefing.style.display = 'none';
      if (mission2StatusPill) {
        mission2StatusPill.textContent = 'LOCKED';
        mission2StatusPill.className = 'comic-status-pill locked';
      }
      if (startLevel2Btn) startLevel2Btn.style.display = 'none';
    }

    // Mission 1 — mark cleared after level 1 done
    const mission1StatusPill = document.getElementById('mission1StatusPill');
    if (mission1StatusPill) {
      if (level1Cleared) {
        mission1StatusPill.textContent = 'CLEARED ★';
        mission1StatusPill.className = 'comic-status-pill cleared';
      } else {
        mission1StatusPill.textContent = 'READY';
        mission1StatusPill.className = 'comic-status-pill ready';
      }
    }

    // Row 3 lock
    const row3Overlay = document.getElementById('row3LockOverlay');
    if (row3Overlay) row3Overlay.style.display = level2Cleared ? 'none' : 'flex';
  }


  updateComicMenuBossState() {
    const isBlackBossDefeated = localStorage.getItem('lightwars_black_boss_defeated') === 'true';
    const bossRoleBadge = document.getElementById('bossRoleBadge');
    const bossNameTitle = document.getElementById('bossNameTitle');
    const bossEncounterStatus = document.getElementById('bossEncounterStatus');
    const bossPlotTwistReveal = document.getElementById('bossPlotTwistReveal');
    const page2TeaserBadge = document.getElementById('page2TeaserBadge');
    const bossLoreCaption = document.querySelector('.boss-lore-caption');

    if (isBlackBossDefeated) {
      if (bossRoleBadge) {
        bossRoleBadge.innerText = '⚔️ MINI BOSS ⚔️';
        bossRoleBadge.classList.add('mini-boss-mode');
      }
      if (bossNameTitle) {
        bossNameTitle.innerText = 'THE BLACK BOSS • SHADOW APPRENTICE';
      }
      if (bossEncounterStatus) {
        bossEncounterStatus.style.display = 'none';
      }
      if (bossLoreCaption) {
        bossLoreCaption.style.display = 'none';
      }
      if (bossPlotTwistReveal) {
        bossPlotTwistReveal.style.display = 'block';
      }
      if (page2TeaserBadge) {
        page2TeaserBadge.innerText = 'PAGE 02 (NEW!)';
        page2TeaserBadge.classList.remove('locked');
        page2TeaserBadge.classList.add('unlocked');
      }
    } else {
      if (bossRoleBadge) {
        bossRoleBadge.innerText = '★ FINAL BOSS ★';
        bossRoleBadge.classList.remove('mini-boss-mode');
      }
      if (bossNameTitle) {
        bossNameTitle.innerText = 'THE BLACK BOSS • VOID OVERLORD';
      }
      if (bossLoreCaption) {
        bossLoreCaption.style.display = 'block';
      }
      if (bossEncounterStatus) {
        bossEncounterStatus.style.display = 'block';
      }
      if (bossPlotTwistReveal) {
        bossPlotTwistReveal.style.display = 'none';
      }
      if (page2TeaserBadge) {
        page2TeaserBadge.innerText = 'PAGE 02 🔒';
        page2TeaserBadge.classList.add('locked');
        page2TeaserBadge.classList.remove('unlocked');
      }
    }
  }

  showMenu() {
    this.state = 'MENU';
    this.updateComicMenuLockState();
    this.updateComicMenuBossState();
    document.getElementById('comicMenu').style.display = 'flex';
    document.getElementById('levelClearModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';
  }

  _resetGameEntities() {
    document.getElementById('comicMenu').style.display = 'none';
    document.getElementById('levelClearModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';

    this.player = new window.LightWars.Player(this.arena.whiteLight.x, this.arena.whiteLight.y);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    this.barrels = [];
    this.enemies = [];
    this.lasers = [];
    this.orbs = [];
    this.crystals = [];
    this.particles = new window.LightWars.ParticleSystem();

    this.waves = new window.LightWars.WaveDirector(this);
    this.colorChangingEnabled = false; // default off; waves.startLevelX sets it
  }

  startLevel1() {
    this._lastLevel = 1;
    this.arena.loadLevel(1);
    this._resetGameEntities();
    this.waves.startLevel1();
    this.state = 'PLAYING';

    // Stop Tutorial 1: Mission Briefing & Controls
    setTimeout(() => {
      this.showStopTutorial(
        'l1_intro',
        'WELCOME TO THE SPECTRUM WAR!',
        'Greetings, Luke! Master <b>NOOBI-WAN</b> here.<br>' +
        'Troops in Level 1 wear <span class="noobi-hl cyan">CYAN</span>, <span class="noobi-hl magenta">MAGENTA</span>, or <span class="noobi-hl yellow">YELLOW</span> headbands.<br><br>' +
        '• <b>CONTROLS:</b> <span class="noobi-key">[W][A][S][D]</span> Move | <span class="noobi-key">[MOUSE]</span> Aim & Shoot | <span class="noobi-key">[SPACE / RMB]</span> Dash.<br>' +
        '• <b>COUNTER WEAPONS:</b> Press <span class="noobi-key">[1]</span> Red, <span class="noobi-key">[2]</span> Green, <span class="noobi-key">[3]</span> Blue to equip the complementary laser!<br>' +
        '• <b>RECHARGE:</b> Step onto the white glowing sanctuary circle to reload your energy.<br><br>' +
        'Press <span class="noobi-key">[H]</span> anytime during battle to review my teachings.'
      );
    }, 150);
  }

  startLevel2() {
    this._lastLevel = 2;
    this.arena.loadLevel(2);
    this._resetGameEntities();
    this.waves.startLevel2();
    this.state = 'PLAYING';

    // Level 2 Briefing: RGB Troops & Transformation Mechanics
    setTimeout(() => {
      this.showStopTutorial(
        'l2_intro',
        'LEVEL 2: CHROMATIC TRANSFORMATION!',
        'You entered the Dungeon Arena, Luke! Here, the Empire deploys <span class="noobi-hl red">RED</span>, <span class="noobi-hl green">GREEN</span>, and <span class="noobi-hl blue">BLUE</span> troops.<br><br>' +
        '• <b>TRANSFORMATION ACTIVE:</b> Non-lethal laser hits cause enemy wavelengths to <b>transform</b> into other colors!<br>' +
        '• <b>COUNTER WEAKNESSES:</b><br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl red">RED</span> dies to <span class="noobi-hl cyan">CYAN [4]</span> | <span class="noobi-hl green">GREEN</span> dies to <span class="noobi-hl magenta">MAGENTA [5]</span> | <span class="noobi-hl blue">BLUE</span> dies to <span class="noobi-hl yellow">YELLOW [6]</span><br>' +
        '• Shoot dropped orbs with your blasters to synthesize high-energy crystals!'
      );
    }, 150);
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
        return this.arena.toScreen(candGx + 0.5, candGy + 0.5);
      }
    }

    // Fallback: search all walkable tiles in the arena outside the 3-tile square
    let bestDist = Infinity;
    let bestPos = { x: targetX, y: targetY };

    const maxCols = this.arena.cols || 32;
    const maxRows = this.arena.rows || 21;

    for (let gx = 0; gx < maxCols; gx++) {
      for (let gy = 0; gy < maxRows; gy++) {
        if (!this.arena.isWalkableTile(gx, gy)) continue;
        const dTileX = Math.abs(gx - pGrid.gx);
        const dTileY = Math.abs(gy - pGrid.gy);
        if (dTileX < minTileDist && dTileY < minTileDist) continue; // Inside 3-tile exclusion square

        const screenPos = this.arena.toScreen(gx + 0.5, gy + 0.5);
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

    // Stop Tutorial: First Orb dropped
    if (this._lastLevel === 1) {
      this.showStopTutorial(
        'l1_orb_drop',
        'CHROMATIC ORB DETECTED!',
        'Defeated troops leave behind energy <b>ORBS</b>!<br><br>' +
        '• Shoot this orb with its <b>complementary laser</b> to convert it into Ammo Crystals!<br>' +
        '• Or walk over it to absorb basic spectral charge.<br><br>' +
        'Experiment with your lasers to craft ammo!'
      );
    }
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
      if (this.particles && this.particles.spawnMuzzleFlash) {
        this.particles.spawnMuzzleFlash(result.originX, result.originY, result.angle, result.colorData.hex);
      }
    }
  }

  onLevelComplete(levelNum) {
    this.state = 'LEVEL_CLEAR';
    window.LightWars.sound.playVictory();

    const lvl = levelNum || this._lastLevel || 1;

    // Save progress to localStorage
    if (lvl === 1) {
      localStorage.setItem('lightwars_level1_cleared', 'true');
    } else if (lvl === 2) {
      localStorage.setItem('lightwars_level2_cleared', 'true');
    }

    // Update modal text
    const titleEl = document.getElementById('levelClearTitle');
    const msgEl = document.getElementById('levelClearMsg');
    if (titleEl) titleEl.textContent = `LEVEL ${lvl} CLEARED!`;
    if (msgEl) {
      if (lvl === 1) {
        msgEl.textContent = 'You eliminated the CMY invasion force! The Spectrum War continues...';
      } else {
        msgEl.textContent = 'You mastered the full chromatic arsenal! The Void Overlord awaits...';
      }
    }

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

      // Check for low ammo stop tutorial in Level 1
      if (this._lastLevel === 1) {
        const totalAmmo = Object.values(this.player.ammo).reduce((a, b) => a + b, 0);
        if (totalAmmo <= 3) {
          this.showStopTutorial(
            'l1_low_ammo',
            'LOW CHROMATIC AMMO ALERT!',
            'Your laser energy is running low!<br><br>' +
            'Head directly to the <b>WHITE LIGHT RECHARGE SANCTUARY</b> at the top of the chamber.<br>' +
            'Stepping into the white glow will recharge all your weapons!'
          );
        }
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
          const clampedOrbY = Math.max(orb.y - 45, Math.min(orb.y + 10, laser.y));
          const d = Math.hypot(laser.x - orb.x, laser.y - clampedOrbY);
          if (d < (orb.hitRadius || 36)) {
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
            } else if (outcome.action === 'TRANSFORM' && this.colorChangingEnabled) {
              // TRANSFORM only active in Level 2+
              window.LightWars.sound.playTransform();
              this.particles.spawnBurst(enemy.x, enemy.y - 50, window.LightWars.COLORS[outcome.target].hex, 20);
              this.particles.spawnComicText(enemy.x, enemy.y - 70, `➔ ${outcome.target}!`, window.LightWars.COLORS[outcome.target].hex);
              enemy.setColor(outcome.target);
            } else {
              // 'NONE' OR transform disabled in Level 1 — no effect
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
          this.player.takeDamage(1, laser.x, laser.y, true, laser.angle);
          this.camera.shake(5);
          this.particles.spawnBurst(laser.x, laser.y, window.LightWars.COLORS[laser.colorId].hex, 16);
          this.particles.spawnComicText(this.player.x, this.player.y - 70, 'ZAP!', '#FF2A4D');
          if (window.LightWars.sound) {
            window.LightWars.sound.playPlayerHurt();
          }
          this.lasers.splice(i, 1);
          continue;
        }
      }
    }

    // Update Enemies & Enemy Shooting
    for (const enemy of this.enemies) {
      const enemyLaser = enemy.update(dt, this.player, this.arena, this.barrels);
      if (enemyLaser) {
        this.lasers.push(enemyLaser);
        if (this.particles && this.particles.spawnMuzzleFlash) {
          this.particles.spawnMuzzleFlash(enemyLaser.originX, enemyLaser.originY, enemyLaser.angle, enemyLaser.colorData.hex);
        }
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
