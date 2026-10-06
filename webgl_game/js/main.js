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
    this.powerups = [];

    // Input state
    this.input = {
      keys: {},
      mouseX: 3800,
      mouseY: 2320,
      screenMouseX: 640,
      screenMouseY: 360,
      mouseInside: false,
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

    // Reset progress on fresh launch/restart so game always starts with Levels 2 & 3 locked
    this.resetProgressOnLaunch();

    this.devMode = false;
    // Unlocked Capabilities for dynamic Help Codex progression
    this.unlockedCapabilities = {
      recharge: true,
      orbCrafting: false,
      dash: false,
      whiteAmmo: false,
      inversion: false
    };
    this._newlyUnlockedCapabilities = new Set();

    this.initWindow();
    this.bindEvents();
    this.setupComicMenu();
  }

  resetProgressOnLaunch() {
    try {
      localStorage.removeItem('lightwars_level1_cleared');
      localStorage.removeItem('lightwars_level2_cleared');
      localStorage.removeItem('lightwars_black_boss_defeated');
      localStorage.removeItem('lightwars_dash_unlocked');
    } catch (e) {
      console.warn("Storage reset on launch:", e);
    }
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

      // Number keys 1-7 for laser ammo selection (including White [7])
      if (e.key >= '1' && e.key <= '7') {
        const idx = parseInt(e.key, 10) - 1;
        if (this.player) this.player.selectColorIndex(idx);
      }
      if (e.code === 'KeyQ') {
        if (this.player) this.player.selectPrevColor();
      }
      if (e.code === 'KeyE') {
        if (this.player && this.player.invertUnlocked && this.state === 'PLAYING') {
          this.player.triggerInvertFrame(this);
        } else if (this.player) {
          this.player.selectNextColor();
        }
      }
      if (e.code === 'Space' && this.state === 'PLAYING') {
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
        if (e.repeat) return; // Prevent glitching/toggling when holding down Escape
        if (this.isHelpModalOpen()) {
          this.toggleHelpModal(false);
        } else if (this.state === 'TUTORIAL') {
          this.dismissTutorial();
        } else if (this.state === 'PLAYING') {
          this.togglePauseMenu(true);
        } else if (this.state === 'PAUSED') {
          this.togglePauseMenu(false);
        }
      }
      if ((e.code === 'Enter' || e.code === 'Space') && this.state === 'TUTORIAL') {
        if (this.isHelpModalOpen()) return;
        this.dismissTutorial();
      }
      if (e.code === 'KeyH') {
        if (e.repeat) return;
        // When on escape pause menu, pressing H must not display anything!
        const pauseModal = document.getElementById('escapePauseModal');
        if (pauseModal && pauseModal.style.display === 'flex') {
          return;
        }
        // When on noobiwan chat, display help tab and pressing H again removes it and continues where you left off
        this.toggleHelpModal();
      }
      if (e.code === 'KeyI') {
        if (e.repeat) return;
        if (this.state === 'TUTORIAL') {
          this.dismissTutorial();
        } else if (this.state === 'PLAYING') {
          this.showInstructionsModal();
        }
      }
      if (e.code === 'KeyP' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        if (e.repeat) return;
        if (this.isHelpModalOpen()) {
          this.toggleHelpModal(false);
        } else {
          this.togglePauseMenu(this.state === 'PLAYING');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    // Mouse tracking & firing
    this.canvas.addEventListener('mouseenter', () => {
      this.input.mouseInside = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.input.mouseInside = false;
      this.input.isMouseDown = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      this.input.mouseInside = true;
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
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        if (this.camera && this.camera.setZoom) {
          this.camera.setZoom(this.camera.targetZoom + delta);
        }
      } else {
        if (e.deltaY > 0) this.player.selectNextColor();
        else if (e.deltaY < 0) this.player.selectPrevColor();
      }
    }, { passive: false });

    // Ammo HUD click
    this.canvas.addEventListener('click', (e) => {
      if (!this.player || this.state !== 'PLAYING') return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const clickY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      const ammoBarWidth = 520;
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
    const devModeCheckbox = document.getElementById('devModeCheckbox');
    if (devModeCheckbox) {
      devModeCheckbox.checked = this.devMode;
      devModeCheckbox.addEventListener('change', (e) => {
        this.setDevMode(e.target.checked);
      });
    }

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

    const play3Btn = document.getElementById('startLevel3Btn');
    if (play3Btn) {
      play3Btn.addEventListener('click', () => {
        window.LightWars.sound.resume();
        this.startLevel3();
      });
    }

    // Direct click-to-play on comic panel rows
    const comicRow1 = document.getElementById('comicRow1');
    if (comicRow1) {
      comicRow1.addEventListener('click', (e) => {
        if (e.target.closest('#startLevel1Btn')) return;
        if (playBtn) playBtn.click();
      });
    }

    const comicRow2 = document.getElementById('comicRow2');
    if (comicRow2) {
      comicRow2.addEventListener('click', (e) => {
        if (e.target.closest('#startLevel2Btn')) return;
        const lock = document.getElementById('row2LockOverlay');
        if (lock && lock.style.display !== 'none') return;
        if (play2Btn) play2Btn.click();
      });
    }

    const comicRow3 = document.getElementById('comicRow3');
    if (comicRow3) {
      comicRow3.addEventListener('click', (e) => {
        if (e.target.closest('#startLevel3Btn')) return;
        const lock = document.getElementById('row3LockOverlay');
        if (lock && lock.style.display !== 'none') return;
        if (play3Btn && play3Btn.style.display !== 'none') play3Btn.click();
      });
    }

    const play4Btn = document.getElementById('startLevel4Btn');
    if (play4Btn) {
      play4Btn.addEventListener('click', () => {
        window.LightWars.sound.resume();
        this.startLevel4();
      });
    }

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (this._lastLevel === 4) this.startLevel4();
        else if (this._lastLevel === 3) this.startLevel3();
        else if (this._lastLevel === 2) this.startLevel2();
        else this.startLevel1();
      });
    }

    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        if (this._lastLevel === 4) this.startLevel4();
        else if (this._lastLevel === 3) this.startLevel3();
        else if (this._lastLevel === 2) this.startLevel2();
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
        this.transitionToPage2();
      });
    }

    const backToPage1Btn = document.getElementById('backToPage1Btn');
    if (backToPage1Btn) {
      backToPage1Btn.addEventListener('click', () => {
        this.transitionToPage1();
      });
    }

    const page2Badge = document.getElementById('page2TeaserBadge');
    if (page2Badge) {
      page2Badge.addEventListener('click', () => {
        if (this.devMode || localStorage.getItem('lightwars_black_boss_defeated') === 'true') {
          this.transitionToPage2();
        }
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
        if (this._lastLevel === 4) this.startLevel4();
        else if (this._lastLevel === 3) this.startLevel3();
        else if (this._lastLevel === 2) this.startLevel2();
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
      const updateSfx = (e) => {
        const val = parseFloat(e.target.value);
        sfxVal.textContent = `${Math.round(val * 100)}%`;
        if (window.LightWars.sound) {
          window.LightWars.sound.resume();
          window.LightWars.sound.setSfxVolume(val);
        }
      };
      sfxSlider.addEventListener('input', updateSfx);
      sfxSlider.addEventListener('change', (e) => {
        updateSfx(e);
        if (window.LightWars.sound && window.LightWars.sound.sfxVolume > 0) {
          window.LightWars.sound.playLaser('RED');
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
          window.LightWars.sound.resume();
          window.LightWars.sound.setMusicVolume(val);
        }
      });
    }

    // Stop Tutorial / Noobi-Wan Instruction Modal dismiss
    const tutorialDismissBtn = document.getElementById('tutorialDismissBtn');
    if (tutorialDismissBtn) {
      tutorialDismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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

    // In-Game HUD Action Buttons (Pause & Help)
    const inGamePauseBtn = document.getElementById('inGamePauseBtn');
    if (inGamePauseBtn) {
      inGamePauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isHelpModalOpen()) {
          this.toggleHelpModal(false);
        }
        if (this.state === 'PLAYING') {
          this.togglePauseMenu(true);
        } else if (this.state === 'PAUSED') {
          this.togglePauseMenu(false);
        }
      });
    }

    const inGameHelpBtn = document.getElementById('inGameHelpBtn');
    if (inGameHelpBtn) {
      inGameHelpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleHelpModal(true);
      });
    }

    // Help Modal Close / Resume Buttons
    const helpResumeBtn = document.getElementById('helpResumeBtn');
    if (helpResumeBtn) {
      helpResumeBtn.addEventListener('click', () => {
        this.toggleHelpModal(false);
      });
    }

    const helpCloseX = document.getElementById('helpModalCloseX');
    if (helpCloseX) {
      helpCloseX.addEventListener('click', () => {
        this.toggleHelpModal(false);
      });
    }

    const helpModal = document.getElementById('helpVennModal');
    if (helpModal) {
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          this.toggleHelpModal(false);
        }
      });
    }

    this.setupVennDiagramInteractions();
    this.renderHelpCapabilities();

    this.updateComicMenuLockState();
    this.updateComicMenuBossState();

    // Start Main Menu music on first user interaction anywhere (complies with browser AudioContext autoplay policy)
    const startMenuMusicOnFirstGesture = () => {
      if (this.state === 'MENU' && window.LightWars.sound) {
        window.LightWars.sound.resume();
        window.LightWars.sound.startMusic('MENU');
      }
      window.removeEventListener('pointerdown', startMenuMusicOnFirstGesture);
      window.removeEventListener('keydown', startMenuMusicOnFirstGesture);
    };
    window.addEventListener('pointerdown', startMenuMusicOnFirstGesture, { once: true });
    window.addEventListener('keydown', startMenuMusicOnFirstGesture, { once: true });
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

  isHelpModalOpen() {
    const modal = document.getElementById('helpVennModal');
    return modal && modal.classList.contains('visible');
  }

  toggleHelpModal(show) {
    const modal = document.getElementById('helpVennModal');
    if (!modal) return;

    // Strict requirement: "take care that pressing H when on escape shouldnt display anything"
    const pauseModal = document.getElementById('escapePauseModal');
    if (pauseModal && pauseModal.style.display === 'flex') {
      return; // Do nothing when escape pause menu is open!
    }

    const isCurrentlyOpen = modal.classList.contains('visible');
    const shouldOpen = (show !== undefined) ? show : !isCurrentlyOpen;

    if (shouldOpen) {
      if (isCurrentlyOpen) return;

      // Remember pre-help state to restore upon closing (e.g. 'PLAYING' or 'TUTORIAL')
      this._savedPreHelpState = this.state || 'PLAYING';

      // Immediately PAUSE the game simulation
      this.state = 'PAUSED';
      this.input.isMouseDown = false;
      this.input.keys = {};

      // Clear any pending newly unlocked badge on HUD button
      const helpBtn = document.getElementById('inGameHelpBtn');
      if (helpBtn) {
        helpBtn.classList.remove('has-new-unlock');
      }
      if (this._newlyUnlockedCapabilities) {
        this._newlyUnlockedCapabilities.clear();
      }

      // Update Help Codex sections & Venn diagram stage-gated to current mission level
      this.updateHelpForCurrentLevel();

      // Re-render capability list so all unlocks are fresh
      this.renderHelpCapabilities();

      if (window.LightWars.sound && window.LightWars.sound.playDialogueAdvance) {
        window.LightWars.sound.playDialogueAdvance();
      }

      // Smooth opening animation sequence
      modal.style.display = 'flex';
      void modal.offsetWidth; // Force layout reflow so CSS transition begins smoothly from 0
      requestAnimationFrame(() => {
        modal.classList.add('visible');
      });
    } else {
      if (!isCurrentlyOpen) return;

      // Smooth closing sequence
      modal.classList.remove('visible');

      if (window.LightWars.sound && window.LightWars.sound.playDialogueAdvance) {
        window.LightWars.sound.playDialogueAdvance();
      }

      // Wait for CSS transition (280ms) before hiding display
      setTimeout(() => {
        modal.style.display = 'none';

        // Requirement: "and when on noobiwan chat it should display that help tab and pressing H again should remove it and continue where u left off"
        this.state = this._savedPreHelpState || 'PLAYING';
      }, 280);
    }
  }

  getCurrentMissionLevel() {
    if (this.waves && typeof this.waves.level === 'number' && this.waves.level > 0) {
      return this.waves.level;
    }
    if (typeof this._lastLevel === 'number' && this._lastLevel > 0) {
      return this._lastLevel;
    }
    return 1;
  }

  updateHelpForCurrentLevel() {
    const lvl = this.getCurrentMissionLevel();

    // Stage-gate Right Column sections
    // Requirement: "dont show mission 2,3 in Help in 1, first show 1 in m1 then 2 in m2 then 3 in m3"
    const sec1 = document.getElementById('sectionMission1');
    const sec2 = document.getElementById('sectionMission2');
    const sec3 = document.getElementById('sectionMission3');
    const badge = document.getElementById('helpMissionBadge');
    const subtitle = document.getElementById('helpModalSubtitle');

    if (sec1) sec1.style.display = 'block'; // Always visible in all missions
    if (sec2) sec2.style.display = (lvl >= 2) ? 'block' : 'none'; // Only in Mission 2 & 3
    if (sec3) sec3.style.display = (lvl >= 3) ? 'block' : 'none'; // Only in Mission 3

    // Update Header Badge & Subtitle
    if (badge) {
      if (lvl === 1) {
        badge.textContent = '⚡ MISSION 01 INTEL';
      } else if (lvl === 2) {
        badge.textContent = '⚡ MISSION 02 INTEL';
      } else {
        badge.textContent = '⚡ MISSION 03 INTEL';
      }
    }

    if (subtitle) {
      if (lvl === 1) {
        subtitle.textContent = 'MISSION 01: ADDITIVE SPECTRUM & CMY TROOP COUNTERS';
      } else if (lvl === 2) {
        subtitle.textContent = 'MISSION 02: ADVANCED RGB TROOPS & COMBAT SYNTHESIS';
      } else {
        subtitle.textContent = 'MISSION 03: VOID OVERLORD & WHITE LIGHT CONVERGENCE';
      }
    }

    // Stage-gate SVG Venn diagram elements
    // In Level 1 and 2, hide Black Boss node in SVG
    const nodeBoss = document.getElementById('nodeBlackBoss');
    if (nodeBoss) {
      nodeBoss.style.display = (lvl >= 3) ? 'inline' : 'none';
    }

    // Center white node text in SVG: in Level 1 & 2 show SANCTUARY, in Level 3 show [7] WHITE
    const nodeWhite = document.getElementById('nodeWhite');
    if (nodeWhite) {
      const keyTxt = nodeWhite.querySelector('.node-key-txt');
      const nameTxt = nodeWhite.querySelector('.node-name-txt');
      const subTxt = nodeWhite.querySelector('.node-sub-txt');
      if (lvl < 3) {
        if (keyTxt) keyTxt.textContent = '⚪';
        if (nameTxt) nameTxt.textContent = 'SANCTUARY';
        if (subTxt) subTxt.textContent = 'RECHARGE';
      } else {
        if (keyTxt) keyTxt.textContent = '[7]';
        if (nameTxt) nameTxt.textContent = 'WHITE';
        if (subTxt) subTxt.textContent = 'R+G+B';
      }
    }
  }

  unlockHelpCapability(key) {
    if (!this.unlockedCapabilities) {
      this.unlockedCapabilities = {
        recharge: true,
        orbCrafting: false,
        dash: false,
        whiteAmmo: false,
        inversion: false
      };
      this._newlyUnlockedCapabilities = new Set();
    }

    if (!this.unlockedCapabilities[key]) {
      this.unlockedCapabilities[key] = true;
      if (!this._newlyUnlockedCapabilities) this._newlyUnlockedCapabilities = new Set();
      this._newlyUnlockedCapabilities.add(key);

      // Re-render capability list in Help modal immediately
      this.renderHelpCapabilities();

      // Trigger notification badge & pulse on in-game [H] Help button
      const helpBtn = document.getElementById('inGameHelpBtn');
      if (helpBtn) {
        helpBtn.classList.add('has-new-unlock');
        helpBtn.title = 'New Combat Intel Unlocked! Press [H] to view.';
      }

      // Spawn celebratory in-game comic text if game is currently playing
      if (this.state === 'PLAYING' && this.particles && this.player) {
        const labels = {
          dash: 'DASH UNLOCKED! [H]',
          orbCrafting: 'ORB CRAFTING UNLOCKED! [H]',
          whiteAmmo: 'WHITE AMMO UNLOCKED! [H]',
          inversion: 'INVERSION INTEL ADDED! [H]'
        };
        const text = labels[key] || 'NEW INTEL UNLOCKED! [H]';
        this.particles.spawnComicText(this.player.x, this.player.y - 80, text, '#00F0FF');
      }
    }
  }

  renderHelpCapabilities() {
    const container = document.getElementById('helpCapabilitiesList');
    if (!container) return;

    if (!this.unlockedCapabilities) {
      this.unlockedCapabilities = {
        recharge: true,
        orbCrafting: false,
        dash: false,
        whiteAmmo: false,
        inversion: false
      };
      this._newlyUnlockedCapabilities = new Set();
    }

    const currentLvl = this.getCurrentMissionLevel();

    // Dynamic sync with game progression
    if (this.player && this.player.dashUnlocked) {
      this.unlockedCapabilities.dash = true;
    }
    if (localStorage.getItem('lightwars_dash_unlocked') === 'true' || this.devMode) {
      this.unlockedCapabilities.dash = true;
    }
    if (currentLvl >= 2) {
      this.unlockedCapabilities.orbCrafting = true;
      this.unlockedCapabilities.dash = true;
    }
    if (currentLvl >= 3) {
      this.unlockedCapabilities.whiteAmmo = true;
      this.unlockedCapabilities.inversion = true;
    }
    if (this.waves && this.waves.stats && this.waves.stats.orbsCrafted > 0) {
      this.unlockedCapabilities.orbCrafting = true;
    }

    const allItems = [
      {
        id: 'recharge',
        minLevel: 1,
        icon: '⚪',
        name: 'WHITE LIGHT RECHARGE SANCTUARY',
        key: 'TOP-CENTER SANCTUARY',
        desc: 'Step into the glowing white circle at the top of the map to <b>instantly reload all ammo</b> and regenerate shields.',
        unlocked: true,
        lockHint: ''
      },
      {
        id: 'orbCrafting',
        minLevel: 1,
        icon: '💎',
        name: 'ORB AMMO SYNTHESIS (HITTING ORBS)',
        key: 'SHOOT WITH COMPLEMENTARY LASER',
        desc: 'Shoot dropped enemy energy orbs with <b>complementary lasers</b> to synthesize high-tier <b>Ammo Crystals</b>! Walk over crystals to collect ammo.',
        unlocked: !!this.unlockedCapabilities.orbCrafting,
        lockHint: 'Defeat troops to drop orbs and discover synthesis.'
      },
      {
        id: 'dash',
        minLevel: 1,
        icon: '⚡',
        name: 'HIGH-SPEED DASH WARP',
        key: 'SPACE / RMB',
        desc: 'Warp at high velocity to <b>dodge enemy lasers</b>, slip through crossfire, and evade dangerous barrel concussions!',
        unlocked: !!this.unlockedCapabilities.dash,
        lockHint: 'Destroy the Black Orb in Level 1 to unlock Dash.'
      },
      {
        id: 'whiteAmmo',
        minLevel: 3,
        icon: '✨',
        name: 'WHITE LASER CONVERGENCE [7]',
        key: 'SYNTHESIZE IN ORB (L3)',
        desc: 'Shoot complementary lasers into an orb (Red into Cyan orb) to synthesize <b>White Ammo [7]</b>. The Black Boss requires <b>3 White laser strikes</b> to defeat.',
        unlocked: !!this.unlockedCapabilities.whiteAmmo,
        lockHint: 'Classified: Unlocked in Mission 03 Boss fight.'
      },
      {
        id: 'inversion',
        minLevel: 3,
        icon: '🔄',
        name: 'INVERT FRAME ABILITY',
        key: 'KEY [E]',
        desc: 'Activate Invert Frame using <b>KEY [E]</b> to reverse light physics for 10s! Cooldown scales with damage: <b>25s</b> at full health, <b>7s</b> after 1 heart lost, <b>5s</b> after 2 hearts lost. When inverted, bots can only be destroyed by their matching color lasers, and the Black Boss is invincible.',
        unlocked: !!this.unlockedCapabilities.inversion,
        lockHint: 'Defeat the Black Boss in Mission 03 to acquire.'
      }
    ];

    // Filter capabilities based on mission level so future mission spoilers are not shown early
    const items = allItems.filter(item => currentLvl >= item.minLevel);

    container.innerHTML = items.map(item => {
      const isNew = this._newlyUnlockedCapabilities && this._newlyUnlockedCapabilities.has(item.id);
      const entryClass = item.unlocked 
        ? `capability-entry is-unlocked ${isNew ? 'is-newly-unlocked' : ''}`
        : 'capability-entry is-locked';

      const statusTag = isNew
        ? `<span class="capability-status-tag new-tag">★ NEW UNLOCK!</span>`
        : (item.unlocked 
            ? `<span class="capability-status-tag unlocked">&#x2714; UNLOCKED</span>` 
            : `<span class="capability-status-tag locked">&#x1F512; LOCKED</span>`);

      const keyPill = item.unlocked && item.key
        ? `<span class="capability-key-pill">[${item.key}]</span>`
        : '';

      const descText = item.unlocked ? item.desc : `<i>${item.lockHint}</i>`;

      return `
        <div class="${entryClass}">
          <div class="capability-header">
            <div class="capability-title-wrap">
              <span class="capability-icon">${item.icon}</span>
              <span class="capability-name">${item.name}</span>
            </div>
            ${statusTag}
          </div>
          <div class="capability-desc">
            ${keyPill}${descText}
          </div>
        </div>
      `;
    }).join('');
  }

  setupVennDiagramInteractions() {
    const pairs = {
      'CYAN': {
        enemy: 'CYAN',
        weapon: 'RED',
        beamId: 'beamRedCyan',
        nodeIds: ['nodeCyan', 'nodeRed'],
        cardId: 'cardCyan',
        text: '🎯 <b>CYAN TROOPS</b> (Green + Blue) &rarr; Shoot <b>RED LASER [1]</b>! (Red is directly opposite Cyan across the Venn diagram).'
      },
      'MAGENTA': {
        enemy: 'MAGENTA',
        weapon: 'GREEN',
        beamId: 'beamGreenMagenta',
        nodeIds: ['nodeMagenta', 'nodeGreen'],
        cardId: 'cardMagenta',
        text: '🎯 <b>MAGENTA TROOPS</b> (Red + Blue) &rarr; Shoot <b>GREEN LASER [2]</b>! (Green is directly opposite Magenta across the Venn diagram).'
      },
      'YELLOW': {
        enemy: 'YELLOW',
        weapon: 'BLUE',
        beamId: 'beamBlueYellow',
        nodeIds: ['nodeYellow', 'nodeBlue'],
        cardId: 'cardYellow',
        text: '🎯 <b>YELLOW TROOPS</b> (Red + Green) &rarr; Shoot <b>BLUE LASER [3]</b>! (Blue is directly opposite Yellow across the Venn diagram).'
      },
      'RED': {
        enemy: 'RED',
        weapon: 'CYAN',
        beamId: 'beamRedCyan',
        nodeIds: ['nodeRed', 'nodeCyan'],
        cardId: 'cardRed',
        text: '🎯 <b>RED TROOPS</b> &rarr; Shoot <b>CYAN LASER [4]</b>! (Cyan is Green + Blue, directly opposite Red).'
      },
      'GREEN': {
        enemy: 'GREEN',
        weapon: 'MAGENTA',
        beamId: 'beamGreenMagenta',
        nodeIds: ['nodeGreen', 'nodeMagenta'],
        cardId: 'cardGreen',
        text: '🎯 <b>GREEN TROOPS</b> &rarr; Shoot <b>MAGENTA LASER [5]</b>! (Magenta is Red + Blue, directly opposite Green).'
      },
      'BLUE': {
        enemy: 'BLUE',
        weapon: 'YELLOW',
        beamId: 'beamBlueYellow',
        nodeIds: ['nodeBlue', 'nodeYellow'],
        cardId: 'cardBlue',
        text: '🎯 <b>BLUE TROOPS</b> &rarr; Shoot <b>YELLOW LASER [6]</b>! (Yellow is Red + Green, directly opposite Blue).'
      },
      'WHITE': {
        enemy: 'BLACK',
        weapon: 'WHITE',
        beamId: null,
        nodeIds: ['nodeWhite', 'nodeBlackBoss'],
        cardId: 'cardBoss',
        text: '🌑 <b>THE BLACK BOSS</b> devours all standard wavelengths! Only <b>WHITE LASER [7]</b> (R+G+B convergence) can damage his void core!'
      }
    };

    const calloutEl = document.getElementById('tacticalCalloutText');
    const defaultText = '<b>THE OPPOSITE RULE:</b> Shoot the laser directly <u>opposite</u> across the Venn diagram to destroy target enemies!';

    const activatePair = (key) => {
      const data = pairs[key];
      if (!data) return;

      const card = document.getElementById(data.cardId);
      // If card belongs to a hidden mission section, don't activate or spoil it
      if (card && card.closest('.matrix-card-section') && card.closest('.matrix-card-section').style.display === 'none') {
        return;
      }
      if (key === 'WHITE' && this.getCurrentMissionLevel() < 3) {
        return;
      }

      // Highlight card
      document.querySelectorAll('.counter-card').forEach(c => c.classList.remove('is-highlighted'));
      if (card) card.classList.add('is-highlighted');

      // Highlight SVG nodes
      document.querySelectorAll('.venn-node, .venn-boss-node').forEach(n => n.classList.remove('is-active-node'));
      data.nodeIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display !== 'none') el.classList.add('is-active-node');
      });

      // Highlight beam
      document.querySelectorAll('.counter-beam-line').forEach(b => b.classList.remove('is-active-beam'));
      if (data.beamId) {
        const beam = document.getElementById(data.beamId);
        if (beam) beam.classList.add('is-active-beam');
      }

      // Update callout text
      if (calloutEl) calloutEl.innerHTML = data.text;
    };

    const deactivateAll = () => {
      document.querySelectorAll('.counter-card').forEach(c => c.classList.remove('is-highlighted'));
      document.querySelectorAll('.venn-node, .venn-boss-node').forEach(n => n.classList.remove('is-active-node'));
      document.querySelectorAll('.counter-beam-line').forEach(b => b.classList.remove('is-active-beam'));
      if (calloutEl) calloutEl.innerHTML = defaultText;
    };

    // Attach to cards
    Object.keys(pairs).forEach(key => {
      const card = document.getElementById(pairs[key].cardId);
      if (card) {
        card.addEventListener('mouseenter', () => activatePair(key));
        card.addEventListener('mouseleave', deactivateAll);
        card.addEventListener('click', () => activatePair(key));
      }
    });

    // Attach to Venn SVG nodes
    const nodeToKey = {
      'nodeCyan': 'CYAN',
      'nodeMagenta': 'MAGENTA',
      'nodeYellow': 'YELLOW',
      'nodeRed': 'RED',
      'nodeGreen': 'GREEN',
      'nodeBlue': 'BLUE',
      'nodeWhite': 'WHITE',
      'nodeBlackBoss': 'WHITE'
    };

    Object.keys(nodeToKey).forEach(nodeId => {
      const el = document.getElementById(nodeId);
      if (el) {
        el.addEventListener('mouseenter', () => activatePair(nodeToKey[nodeId]));
        el.addEventListener('mouseleave', deactivateAll);
        el.addEventListener('click', () => activatePair(nodeToKey[nodeId]));
      }
    });

    // Beams hover
    const beamToKey = {
      'beamRedCyan': 'CYAN',
      'beamGreenMagenta': 'MAGENTA',
      'beamBlueYellow': 'YELLOW'
    };
    Object.keys(beamToKey).forEach(beamId => {
      const el = document.getElementById(beamId);
      if (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('mouseenter', () => activatePair(beamToKey[beamId]));
        el.addEventListener('mouseleave', deactivateAll);
        el.addEventListener('click', () => activatePair(beamToKey[beamId]));
      }
    });
  }

  showTutorialSequence(cards, onComplete) {
    if (!cards || cards.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    this._tutorialSequenceOnComplete = onComplete || null;
    this._tutorialQueue = [...cards];

    if (this.state !== 'TUTORIAL') {
      this._savedPreTutorialState = this.state;
    }
    this.state = 'TUTORIAL';

    const firstCard = this._tutorialQueue.shift();
    this._displayTutorialModal(firstCard);
  }

  showStopTutorial(id, title, message, options = {}) {
    const isRepeatable = options.repeatable || options.force || !id;
    if (!isRepeatable && id && this._tutorialsSeen && this._tutorialsSeen[id]) return;
    if (id && !isRepeatable) {
      if (!this._tutorialsSeen) this._tutorialsSeen = {};
      this._tutorialsSeen[id] = true;
    }

    const card = {
      id,
      title,
      message,
      badge: options.badge || '⚡ JEDI MASTER INTEL',
      tracker: options.tracker || '',
      step: options.step || 1,
      totalSteps: options.totalSteps || 1,
      btnText: options.btnText || 'CONTINUE MISSION ▶',
      onDismiss: options.onDismiss || null
    };

    if (this.state === 'TUTORIAL') {
      if (!this._tutorialQueue) this._tutorialQueue = [];
      this._tutorialQueue.push(card);
      return;
    }

    if (this.state !== 'TUTORIAL') {
      this._savedPreTutorialState = this.state;
    }
    this.state = 'TUTORIAL';
    this._displayTutorialModal(card);
  }

  _displayTutorialModal(cardOrTitle, message) {
    let card;
    if (typeof cardOrTitle === 'string') {
      card = {
        title: cardOrTitle,
        message: message,
        badge: '⚡ JEDI MASTER INTEL',
        tracker: '',
        step: 1,
        totalSteps: 1,
        btnText: 'CONTINUE NOOBI-WAN ▶'
      };
    } else {
      card = cardOrTitle;
    }

    this._currentCard = card;

    const modal = document.getElementById('tutorialModal');
    const badgeEl = document.getElementById('tutorialBadge');
    const trackerEl = document.getElementById('tutorialCardTracker');
    const titleEl = document.getElementById('tutorialTitle');
    const msgEl = document.getElementById('tutorialMessage');
    const btnEl = document.getElementById('tutorialDismissBtn');
    const dotsEl = document.getElementById('tutorialDots');

    const isBossCard = !!(
      (card.speakerImg && (card.speakerImg.includes('Black Boss') || card.speakerImg.includes('Splash') || card.speakerImg.includes('Fallen'))) ||
      (card.id && (card.id.includes('boss') || card.id === 'l3_card0' || card.id === 'l3_card4' || card.id === 'l3_card5')) ||
      card.isBoss
    );

    if (modal) {
      if (isBossCard) {
        modal.classList.add('is-boss-card');
      } else {
        modal.classList.remove('is-boss-card');
      }
    }

    if (badgeEl) {
      badgeEl.innerHTML = card.badge || card.tag || '⚡ JEDI MASTER INTEL';
      badgeEl.style.background = '';
      badgeEl.style.borderColor = '';
    }
    if (titleEl) titleEl.innerHTML = card.title || 'MISSION BRIEFING';
    if (msgEl) msgEl.innerHTML = card.message || '';
    if (btnEl) {
      btnEl.innerHTML = card.btnText || (isBossCard ? 'RESPOND! ▶' : 'CONTINUE NOOBI-WAN ▶');
      // Stick strictly with the established color: Yellow for Noobi, Red against Black
      btnEl.style.background = '';
      btnEl.style.boxShadow = '';
      btnEl.style.color = '';
    }

    // Swap speaker portrait — Black Boss cards supply speakerImg; default is Noobi-Wan
    const artImg = document.getElementById('noobiArtImg');
    if (artImg) {
      const NOOBI_DEFAULT = 'assets/noobi/noobi_wan_instructions.png';
      artImg.src = card.speakerImg || NOOBI_DEFAULT;
      artImg.alt = card.speakerAlt || 'Master Noobi-Wan Instructions';
    }

    // Tracker badge (e.g. CARD 01 / 06)
    if (trackerEl) {
      const trackerText = card.tracker || ((card.totalSteps && card.totalSteps > 1) ? `CARD ${String(card.step).padStart(2, '0')} / ${String(card.totalSteps).padStart(2, '0')}` : '');
      if (trackerText) {
        trackerEl.innerHTML = trackerText;
        trackerEl.style.background = '';
        trackerEl.style.borderColor = '';
        trackerEl.style.boxShadow = '';
        trackerEl.style.display = 'inline-block';
      } else {
        trackerEl.style.display = 'none';
      }
    }

    // Dots indicator
    if (dotsEl) {
      dotsEl.innerHTML = '';
      if (card.totalSteps && card.totalSteps > 1) {
        dotsEl.style.display = 'flex';
        for (let i = 1; i <= card.totalSteps; i++) {
          const dot = document.createElement('div');
          dot.className = 'noobi-dot' + (i === card.step ? ' active' : '');
          dotsEl.appendChild(dot);
        }
      } else {
        dotsEl.style.display = 'none';
      }
    }

    if (modal) {
      modal.style.display = 'flex';
      void modal.offsetWidth;
      requestAnimationFrame(() => {
        modal.classList.add('visible');
      });
    }
  }

  dismissTutorial() {
    if (window.LightWars.sound && window.LightWars.sound.playDialogueAdvance) {
      window.LightWars.sound.playDialogueAdvance();
    }

    if (this._currentCard && typeof this._currentCard.onDismiss === 'function') {
      try {
        this._currentCard.onDismiss();
      } catch (err) {
        console.error("Error in card onDismiss:", err);
      }
    }

    // If another instruction is queued, transition smoothly to it
    if (this._tutorialQueue && this._tutorialQueue.length > 0) {
      const next = this._tutorialQueue.shift();
      const modal = document.getElementById('tutorialModal');
      if (modal) modal.classList.remove('visible');

      setTimeout(() => {
        this._displayTutorialModal(next);
      }, 180);
      return;
    }

    // No more cards: close modal
    const modal = document.getElementById('tutorialModal');
    if (modal) {
      modal.classList.remove('visible');
    }

    const onComplete = this._tutorialSequenceOnComplete;
    this._tutorialSequenceOnComplete = null;
    this._currentCard = null;

    setTimeout(() => {
      if (this.state !== 'TUTORIAL') {
        if (modal) modal.style.display = 'none';
      }
    }, 320);

    this.state = (this._savedPreTutorialState && this._savedPreTutorialState !== 'TUTORIAL') 
      ? this._savedPreTutorialState 
      : 'PLAYING';
    this._savedPreTutorialState = 'PLAYING';

    if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  showInstructionsModal() {
    const lvl = this._lastLevel || 1;
    let title, message;
    if (lvl === 1) {
      title = "FIELD GUIDE: LEVEL 1 TACTICS";
      message = 
        "Listen closely, Fluke. Here is your tactical briefing for Level 1:<br><br>" +
        "• <b>CONTROLS:</b> Move with <span class=\"noobi-key\">[W][A][S][D]</span> | Aim & Shoot: <span class=\"noobi-key\">[MOUSE]</span>.<br>" +
        "• <b>COUNTER WEAKNESSES:</b><br>" +
        "&nbsp;&nbsp;&bull; <span class=\"noobi-hl cyan\">CYAN TROOP</span> &rarr; Kill with <span class=\"noobi-hl red\">RED LASER [1]</span><br>" +
        "&nbsp;&nbsp;&bull; <span class=\"noobi-hl magenta\">MAGENTA TROOP</span> &rarr; Kill with <span class=\"noobi-hl green\">GREEN LASER [2]</span><br>" +
        "&nbsp;&nbsp;&bull; <span class=\"noobi-hl yellow\">YELLOW TROOP</span> &rarr; Kill with <span class=\"noobi-hl blue\">BLUE LASER [3]</span><br>" +
        "• <b>BLACK ORB:</b> Shoot with 1 bullet of each type (Red, Green, Blue, Cyan, Magenta, Yellow) to unlock the DASH reward!<br>" +
        "• <b>RECHARGE:</b> Step onto the white glowing sanctuary circle to reload your RGB blasters and heal HP.";
    } else if (lvl === 2) {
      title = "FIELD GUIDE: LEVEL 2 TACTICS";
      message = 
        "Welcome to Level 2, Fluke. The chromatic battlefield expands:<br><br>" +
        "• <b>DASH:</b> Press <span class=\"noobi-key\">[SPACE]</span> or <span class=\"noobi-key\">[RMB]</span> to dash and avoid enemy lasers!<br>" +
        "• <b>COUNTER MATRIX:</b><br>" +
        "&nbsp;&nbsp;&bull; <span class=\"noobi-hl red\">RED</span> dies to <span class=\"noobi-hl cyan\">CYAN [4]</span> | <span class=\"noobi-hl green\">GREEN</span> dies to <span class=\"noobi-hl magenta\">MAGENTA [5]</span> | <span class=\"noobi-hl blue\">BLUE</span> dies to <span class=\"noobi-hl yellow\">YELLOW [6]</span><br>" +
        "• Fuse orbs with your blasters to synthesize high-spectrum Ammo Crystals!";
    } else {
      title = "FIELD GUIDE: LEVEL 3 BOSS TACTICS";
      message = 
        "Tactical guide against the Black Boss, Fluke:<br><br>" +
        "• <b>WHITE BULLETS:</b> Black Boss requires <b>3 hits of WHITE LASER [7]</b>. Normal enemies take 1 hit.<br>" +
        "• <b>SYNTHESIZING WHITE AMMO:</b> Shoot a complementary wavelength into an orb (e.g. Red into Cyan orb, or Cyan into Red orb)!<br>" +
        "• <b>HOMING BULLETS:</b> Use your DASH <span class=\"noobi-key\">[SPACE / RMB]</span> and distance to dodge tracking black lasers!<br>" +
        "• <b>LIGHT INVERSION:</b> When the boss shakes rapidly, physics inverts for 10s: weak is strong and strong is weak (e.g. Cyan dies to Cyan)!";
    }
    this.showStopTutorial(null, title, message);
  }

  setDevMode(enabled) {
    if (this.devMode === enabled) return;
    this.devMode = enabled;
    // Expose to player.js and other modules via global namespace
    window.LightWars = window.LightWars || {};
    window.LightWars.devMode = enabled;

    const devModeCheckbox = document.getElementById('devModeCheckbox');
    if (devModeCheckbox && devModeCheckbox.checked !== enabled) {
      devModeCheckbox.checked = enabled;
    }

    if (enabled) {
      // Backup true state before enabling dev mode
      this.savedProgressBackup = {
        level1: localStorage.getItem('lightwars_level1_cleared'),
        level2: localStorage.getItem('lightwars_level2_cleared'),
        blackBoss: localStorage.getItem('lightwars_black_boss_defeated'),
        dash: localStorage.getItem('lightwars_dash_unlocked')
      };
    } else {
      // Restore true state when dev mode is turned off
      if (this.savedProgressBackup) {
        if (this.savedProgressBackup.level1 !== null) {
          localStorage.setItem('lightwars_level1_cleared', this.savedProgressBackup.level1);
        } else {
          localStorage.removeItem('lightwars_level1_cleared');
        }

        if (this.savedProgressBackup.level2 !== null) {
          localStorage.setItem('lightwars_level2_cleared', this.savedProgressBackup.level2);
        } else {
          localStorage.removeItem('lightwars_level2_cleared');
        }

        if (this.savedProgressBackup.blackBoss !== null) {
          localStorage.setItem('lightwars_black_boss_defeated', this.savedProgressBackup.blackBoss);
        } else {
          localStorage.removeItem('lightwars_black_boss_defeated');
        }

        if (this.savedProgressBackup.dash !== null) {
          localStorage.setItem('lightwars_dash_unlocked', this.savedProgressBackup.dash);
        } else {
          localStorage.removeItem('lightwars_dash_unlocked');
        }

        this.savedProgressBackup = null;
      }
    }

    this.updateComicMenuLockState();
    this.updateComicMenuBossState();
  }

  /** Show/hide row lock overlays based on progress flags */
  updateComicMenuLockState() {
    const level1Cleared = this.devMode || (localStorage.getItem('lightwars_level1_cleared') === 'true');
    const level2Cleared = this.devMode || (localStorage.getItem('lightwars_level2_cleared') === 'true');

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

    // Page 2: Level 4 & Level 5 locks
    const level4Cleared = this.devMode || (localStorage.getItem('lightwars_level4_cleared') === 'true');
    const mission4StatusPill = document.getElementById('mission4StatusPill');
    if (mission4StatusPill) {
      if (level4Cleared) {
        mission4StatusPill.textContent = 'CLEARED ★';
        mission4StatusPill.className = 'comic-status-pill cleared';
      } else {
        mission4StatusPill.textContent = 'READY';
        mission4StatusPill.className = 'comic-status-pill ready';
      }
    }

    // Row 5 lock overlay (Level 5 locked)
    const row5LockOverlay = document.getElementById('row5LockOverlay');
    if (row5LockOverlay) {
      row5LockOverlay.style.display = level4Cleared ? 'none' : 'flex';
    }
    const mission5StatusPill = document.getElementById('mission5StatusPill');
    if (mission5StatusPill) {
      if (level4Cleared) {
        mission5StatusPill.textContent = 'READY';
        mission5StatusPill.className = 'comic-status-pill ready';
      } else {
        mission5StatusPill.textContent = 'LOCKED';
        mission5StatusPill.className = 'comic-status-pill locked';
      }
    }
  }


  updateComicMenuBossState() {
    // Page 2 only unlocks when Black Boss has actually been defeated in progression
    const isBlackBossDefeated = localStorage.getItem('lightwars_black_boss_defeated') === 'true';
    const bossRoleBadge = document.getElementById('bossRoleBadge');
    const bossNameTitle = document.getElementById('bossNameTitle');
    const bossEncounterStatus = document.getElementById('bossEncounterStatus');
    const bossPlotTwistReveal = document.getElementById('bossPlotTwistReveal');
    const page2TeaserBadge = document.getElementById('page2TeaserBadge');
    const bossLoreCaption = document.querySelector('.boss-lore-caption');

    const level2Cleared = this.devMode || (localStorage.getItem('lightwars_level2_cleared') === 'true');
    const startLevel3Btn = document.getElementById('startLevel3Btn');
    const bossStampLocked = document.getElementById('bossStampLocked');

    if (isBlackBossDefeated) {
      if (bossRoleBadge) {
        bossRoleBadge.innerText = '⚔️ MINI BOSS ⚔️';
        bossRoleBadge.classList.add('mini-boss-mode');
      }
      if (bossNameTitle) {
        bossNameTitle.innerText = 'THE BLACK BOSS • SHADOW APPRENTICE';
      }
      if (bossEncounterStatus) {
        bossEncounterStatus.style.display = 'block';
      }
      if (bossStampLocked) {
        bossStampLocked.style.display = 'none';
      }
      if (startLevel3Btn) {
        startLevel3Btn.style.display = 'inline-block';
        startLevel3Btn.innerText = 'REPLAY BLACK BOSS';
      }
      if (bossLoreCaption) {
        bossLoreCaption.style.display = 'none';
      }
      if (bossPlotTwistReveal) {
        bossPlotTwistReveal.style.display = 'block';
      }
      if (page2TeaserBadge) {
        page2TeaserBadge.style.display = 'inline-block';
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
      if (level2Cleared) {
        if (bossStampLocked) bossStampLocked.style.display = 'none';
        if (startLevel3Btn) startLevel3Btn.style.display = 'inline-block';
      } else {
        if (bossStampLocked) bossStampLocked.style.display = 'block';
        if (startLevel3Btn) startLevel3Btn.style.display = 'none';
      }
      if (bossPlotTwistReveal) {
        bossPlotTwistReveal.style.display = 'none';
      }
      if (page2TeaserBadge) {
        // Page 2 removed from initial view; only shown after defeating Black Boss
        page2TeaserBadge.style.display = 'none';
        page2TeaserBadge.innerText = 'PAGE 02 🔒';
        page2TeaserBadge.classList.add('locked');
        page2TeaserBadge.classList.remove('unlocked');
      }
    }
  }

  showMenu() {
    this.state = 'MENU';
    if (window.LightWars.sound) {
      window.LightWars.sound.startMusic('MENU');
    }
    this.updateComicMenuLockState();
    this.updateComicMenuBossState();
    document.getElementById('comicMenu').style.display = 'flex';

    // If coming back from Level 4, show Page 2; otherwise default to Page 1
    const page1 = document.getElementById('comicPage1');
    const page2 = document.getElementById('comicPage2');
    if (this._lastLevel === 4 && page2) {
      if (page1) page1.style.display = 'none';
      page2.style.display = 'flex';
      page2.style.opacity = '1';
      page2.style.transform = 'none';
    } else {
      if (page1) {
        page1.style.display = 'flex';
        page1.style.opacity = '1';
        page1.style.transform = 'none';
      }
      if (page2) page2.style.display = 'none';
    }

    document.getElementById('levelClearModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';
    const topHud = document.getElementById('inGameTopHud');
    if (topHud) topHud.style.display = 'none';
    const helpBtn = document.getElementById('inGameHelpBtn');
    if (helpBtn) helpBtn.style.display = 'none';
  }

  _resetGameEntities() {
    document.getElementById('comicMenu').style.display = 'none';
    document.getElementById('levelClearModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';
    const topHud = document.getElementById('inGameTopHud');
    if (topHud) topHud.style.display = 'flex';
    const helpBtn = document.getElementById('inGameHelpBtn');
    if (helpBtn) helpBtn.style.display = 'inline-flex';

    const spawnX = (this.arena.spawn && this.arena.spawn.x !== undefined) ? this.arena.spawn.x : (this.arena.whiteLight ? this.arena.whiteLight.x : 2920);
    const spawnY = (this.arena.spawn && this.arena.spawn.y !== undefined) ? this.arena.spawn.y : (this.arena.whiteLight ? this.arena.whiteLight.y : 1640);
    this.player = new window.LightWars.Player(spawnX, spawnY);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    this.barrels = [];
    this.enemies = [];
    this.lasers = [];
    this.orbs = [];
    this.crystals = [];
    this.powerups = [];
    this.particles = new window.LightWars.ParticleSystem();

    this.waves = new window.LightWars.WaveDirector(this);
    this.colorChangingEnabled = false; // default off; waves.startLevelX sets it
    this.physicsInverted = false;
  }

  startLevel1() {
    this._lastLevel = 1;
    this.arena.loadLevel(1);
    if (window.LightWars.occlusion) {
      window.LightWars.occlusion.loadLevelWalls(1, this.arena);
    }
    this._resetGameEntities();
    if ((this.devMode || localStorage.getItem('lightwars_black_boss_defeated') === 'true') && this.player) {
      this.player.invertUnlocked = true;
    }
    this.waves.startLevel1();
    this.state = 'PLAYING';
    if (window.LightWars.sound) {
      window.LightWars.sound.startMusic('EXPLORATION');
    }
  }

  startLevel2() {
    this._lastLevel = 2;
    // Requirement: use the same level 1 map for all 3 lvls
    this.arena.loadLevel(1);
    if (window.LightWars.occlusion) {
      window.LightWars.occlusion.loadLevelWalls(1, this.arena);
    }
    this._resetGameEntities();
    // Inherit unlocked dash if already unlocked (or in Dev Mode)
    if ((this.devMode || localStorage.getItem('lightwars_dash_unlocked') === 'true') && this.player) {
      this.player.dashUnlocked = true;
    }
    if ((this.devMode || localStorage.getItem('lightwars_black_boss_defeated') === 'true') && this.player) {
      this.player.invertUnlocked = true;
    }
    this.unlockHelpCapability('dash');
    this.unlockHelpCapability('orbCrafting');
    this.waves.startLevel2();
    this.state = 'PLAYING';
    if (window.LightWars.sound) {
      window.LightWars.sound.startMusic('COMBAT');
    }
  }

  startLevel3() {
    this._lastLevel = 3;
    // Requirement: use the same level 1 map for all 3 lvls
    this.arena.loadLevel(1);
    if (window.LightWars.occlusion) {
      window.LightWars.occlusion.loadLevelWalls(1, this.arena);
    }
    this._resetGameEntities();
    // Inherit unlocked dash if already unlocked
    if (this.player) {
      this.player.dashUnlocked = true;
      if (this.devMode || localStorage.getItem('lightwars_black_boss_defeated') === 'true') {
        this.player.invertUnlocked = true;
      }
      // Developer mode: start Level 3 with 1 WHITE bullet (infinite via consumeAmmo patch)
      if (this.devMode) {
        this.player.ammo['WHITE'] = 1;
      }
    }
    this.unlockHelpCapability('dash');
    this.unlockHelpCapability('orbCrafting');
    this.unlockHelpCapability('whiteAmmo');
    this.unlockHelpCapability('inversion');
    this.waves.startLevel3();
    this.state = 'PLAYING';
    if (window.LightWars.sound) {
      window.LightWars.sound.startMusic('BOSS');
    }
  }

  startLevel4() {
    this._lastLevel = 4;
    this.arena.loadLevel(4);
    if (window.LightWars.occlusion) {
      window.LightWars.occlusion.loadLevelWalls(4, this.arena);
    }
    this._resetGameEntities();
    if (this.player) {
      this.player.dashUnlocked = true;
      this.player.invertUnlocked = true;
    }
    this.unlockHelpCapability('dash');
    this.unlockHelpCapability('orbCrafting');
    this.unlockHelpCapability('whiteAmmo');
    this.unlockHelpCapability('inversion');
    this.waves.startLevel4();
    this.state = 'PLAYING';
    if (window.LightWars.sound) {
      window.LightWars.sound.startMusic('BOSS');
    }
  }

  /**
   * Animated page flip transition from Page 1 → Page 2 of the comic strip.
   * Creates a fullscreen flash effect then swaps the visible comic page.
   */
  transitionToPage2() {
    const page1 = document.getElementById('comicPage1');
    const page2 = document.getElementById('comicPage2');
    const pageTracker = document.querySelector('.sw-comic-page-tracker');

    if (!page2) return; // Safety guard

    // Update page badge
    const currentBadge = document.querySelector('.page-badge.current');
    if (currentBadge) currentBadge.textContent = 'PAGE 02';

    const page2Badge = document.getElementById('page2TeaserBadge');
    if (page2Badge) {
      page2Badge.textContent = 'PAGE 02';
      page2Badge.classList.remove('locked');
      page2Badge.classList.add('current');
    }

    // Flash overlay animation
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed; inset: 0; z-index: 9999; pointer-events: none;
      background: #FFFFFF;
      opacity: 0;
      transition: opacity 0.25s ease;
    `;
    document.body.appendChild(flash);

    // Animate flash in
    requestAnimationFrame(() => {
      flash.style.opacity = '1';
      setTimeout(() => {
        // Swap pages
        if (page1) {
          page1.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          page1.style.opacity = '0';
          page1.style.transform = 'translateX(-40px)';
          setTimeout(() => { page1.style.display = 'none'; }, 300);
        }
        page2.style.display = 'flex';
        page2.style.opacity = '0';
        page2.style.transform = 'translateX(40px)';
        page2.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        requestAnimationFrame(() => {
          setTimeout(() => {
            page2.style.opacity = '1';
            page2.style.transform = 'translateX(0)';
          }, 20);
        });

        // Update issue badge
        const issueBox = document.querySelector('.sw-comic-corner-box .corner-issue');
        if (issueBox) issueBox.textContent = '#2';

        // Flash out
        flash.style.opacity = '0';
        setTimeout(() => {
          if (flash.parentNode) flash.parentNode.removeChild(flash);
        }, 350);
      }, 200);
    });
  }

  /**
   * Animated page flip transition back from Page 2 → Page 1.
   */
  transitionToPage1() {
    const page1 = document.getElementById('comicPage1');
    const page2 = document.getElementById('comicPage2');

    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed; inset: 0; z-index: 9999; pointer-events: none;
      background: #FFFFFF;
      opacity: 0;
      transition: opacity 0.25s ease;
    `;
    document.body.appendChild(flash);

    requestAnimationFrame(() => {
      flash.style.opacity = '1';
      setTimeout(() => {
        if (page2) {
          page2.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          page2.style.opacity = '0';
          page2.style.transform = 'translateX(40px)';
          setTimeout(() => { page2.style.display = 'none'; }, 300);
        }
        if (page1) {
          page1.style.display = 'flex';
          page1.style.opacity = '0';
          page1.style.transform = 'translateX(-40px)';
          page1.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
          requestAnimationFrame(() => {
            setTimeout(() => {
              page1.style.opacity = '1';
              page1.style.transform = 'translateX(0)';
            }, 20);
          });
        }

        const currentBadge = document.querySelector('.page-badge.current');
        if (currentBadge) currentBadge.textContent = 'PAGE 01';

        const issueBox = document.querySelector('.sw-comic-corner-box .corner-issue');
        if (issueBox) issueBox.textContent = '#1';

        flash.style.opacity = '0';
        setTimeout(() => {
          if (flash.parentNode) flash.parentNode.removeChild(flash);
        }, 350);
      }, 200);
    });
  }

  getSafeEnemySpawnPos(targetX, targetY) {
    if (!this.player || !this.arena) return { x: targetX, y: targetY };

    // Anti-crowding check: ensure spawn position is not on top of another living enemy
    const isTooCloseToOtherEnemy = (screenX, screenY, minSeparation = 45) => {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - screenX, e.y - screenY) < minSeparation) {
          return true;
        }
      }
      return false;
    };

    const minTileDist = 4.0; // Strictly spawn enemies at least 4 tiles away from player

    if (this.arena.ignoreBoundaries) {
      const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x) || 0;
      return {
        x: this.player.x + Math.cos(angle) * (minTileDist * 50),
        y: this.player.y + Math.sin(angle) * (minTileDist * 50)
      };
    }

    const pGrid = this.arena.toGrid(this.player.x, this.player.y);
    const sGrid = this.arena.toGrid(targetX, targetY);

    // 1. Check if the requested target is already >= 4.0 tiles away and on a walkable tile
    const targetDist = Math.hypot(sGrid.gx - pGrid.gx, sGrid.gy - pGrid.gy);
    const targetTx = Math.floor(sGrid.gx);
    const targetTy = Math.floor(sGrid.gy);

    if (targetDist >= minTileDist && this.arena.isWalkableTile(targetTx, targetTy)) {
      let candPos = { x: targetX, y: targetY };
      if (this.arena.pushOutOfWall) {
        candPos = this.arena.pushOutOfWall(candPos.x, candPos.y);
      }
      const candGrid = this.arena.toGrid(candPos.x, candPos.y);
      const candDist = Math.hypot(candGrid.gx - pGrid.gx, candGrid.gy - pGrid.gy);
      if (candDist >= minTileDist && !this.arena.isPointBlocked(candPos.x, candPos.y) && !isTooCloseToOtherEnemy(candPos.x, candPos.y)) {
        return candPos;
      }
    }

    // 2. Search for valid walkable arena tiles strictly >= 4.0 tiles away from player
    const targetAngle = Math.atan2(sGrid.gy - pGrid.gy, sGrid.gx - pGrid.gx);
    const maxCols = this.arena.cols || 36;
    const maxRows = this.arena.rows || 24;

    const validCandidates = [];

    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < maxCols; c++) {
        if (!this.arena.isWalkableTile(c, r)) continue;

        const tileCenterGx = c + 0.5;
        const tileCenterGy = r + 0.5;
        const distTiles = Math.hypot(tileCenterGx - pGrid.gx, tileCenterGy - pGrid.gy);

        // Enforce strictly at least 4.0 tiles away from player
        if (distTiles < minTileDist) continue;

        const screenPos = this.arena.toScreen(tileCenterGx, tileCenterGy);
        if (this.arena.isPointBlocked(screenPos.x, screenPos.y)) continue;
        if (this.arena.isBodyBlocked && this.arena.isBodyBlocked(screenPos.x, screenPos.y, 20)) continue;

        const crowded = isTooCloseToOtherEnemy(screenPos.x, screenPos.y);
        const crowdedPenalty = crowded ? 5000 : 0;

        // Angle and proximity score: prioritize tiles close to 4.0–4.5 tiles in target direction
        const ang = Math.atan2(tileCenterGy - pGrid.gy, tileCenterGx - pGrid.gx);
        let angDiff = Math.abs(ang - targetAngle);
        if (angDiff > Math.PI) angDiff = Math.PI * 2 - angDiff;

        const distPenalty = Math.abs(distTiles - 4.2) * 40;
        const score = angDiff * 60 + distPenalty + crowdedPenalty;

        validCandidates.push({
          pos: screenPos,
          score
        });
      }
    }

    if (validCandidates.length > 0) {
      validCandidates.sort((a, b) => a.score - b.score);
      let bestPos = validCandidates[0].pos;
      if (this.arena.pushOutOfWall) {
        bestPos = this.arena.pushOutOfWall(bestPos.x, bestPos.y, 20);
      }
      return bestPos;
    }

    // Fallback: search all walkable tiles outside the 2.5-tile radius with strict body clearance
    let bestPos = { x: targetX, y: targetY };
    let bestDist = Infinity;
    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < maxCols; c++) {
        if (!this.arena.isWalkableTile(c, r)) continue;
        const distTiles = Math.hypot(c + 0.5 - pGrid.gx, r + 0.5 - pGrid.gy);
        if (distTiles < minTileDist) continue;
        const pos = this.arena.toScreen(c + 0.5, r + 0.5);
        if (this.arena.isBodyBlocked && this.arena.isBodyBlocked(pos.x, pos.y, 20)) continue;
        const d = Math.hypot(pos.x - targetX, pos.y - targetY);
        if (d < bestDist) {
          bestDist = d;
          bestPos = pos;
        }
      }
    }
    if (this.arena.pushOutOfWall) {
      bestPos = this.arena.pushOutOfWall(bestPos.x, bestPos.y, 20);
    }
    return bestPos;
  }

  spawnEnemy(x, y, colorId) {
    const safePos = this.getSafeEnemySpawnPos(x, y);
    const enemy = new window.LightWars.Enemy(safePos.x, safePos.y, colorId);
    this.enemies.push(enemy);
    this.particles.spawnBurst(safePos.x, safePos.y, enemy.colorData.hex, 16);
    return enemy;
  }

  spawnBoss(x, y) {
    const safePos = this.getSafeEnemySpawnPos(x, y);
    const boss = new window.LightWars.BlackBoss(safePos.x, safePos.y);
    this.enemies.push(boss);
    this.particles.spawnBurst(safePos.x, safePos.y, '#A020F0', 32);
    return boss;
  }

  killRemainingMinions(bossEnemy = null) {
    let killedAny = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e === bossEnemy) {
        e.alive = false;
        continue;
      }
      if (!e || !e.alive) continue;
      e.alive = false;
      killedAny = true;
      if (this.waves && this.waves.stats) {
        this.waves.stats.enemiesKilled++;
      }
      if (this.particles) {
        const hex = (window.LightWars.COLORS[e.colorId] && window.LightWars.COLORS[e.colorId].hex) || '#FFFFFF';
        this.particles.spawnBurst(e.x, e.y - 50, hex, 28);
        const deathWord = window.LightWars.COMIC_DEATH_WORDS
          ? window.LightWars.COMIC_DEATH_WORDS[Math.floor(Math.random() * window.LightWars.COMIC_DEATH_WORDS.length)]
          : 'KABOOM!';
        this.particles.spawnComicText(e.x, e.y - 70, deathWord, hex);
      }
    }
    this.enemies = [];
    if (this.lasers) {
      this.lasers = this.lasers.filter(l => l.isPlayer);
    }
    if (killedAny && window.LightWars.sound) {
      window.LightWars.sound.playKaboom();
    }
  }

  spawnOrb(x, y, colorId) {
    const orb = new window.LightWars.Orb(x, y, colorId);
    this.orbs.push(orb);
    window.LightWars.sound.playOrbSpawn();
    this.unlockHelpCapability('orbCrafting');

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

  onDashPowerupCollected(x, y) {
    if (this.player) {
      this.player.dashUnlocked = true;
    }
    localStorage.setItem('lightwars_dash_unlocked', 'true');
    this.unlockHelpCapability('dash');

    if (window.LightWars.sound) {
      if (window.LightWars.sound.playPowerupPickup) {
        window.LightWars.sound.playPowerupPickup();
      } else {
        window.LightWars.sound.playVictory();
      }
    }

    if (this.particles) {
      this.particles.spawnBurst(x, y, '#00F0FF', 36);
      this.particles.spawnBurst(x, y, '#FFE600', 24);
      this.particles.spawnComicText(x, y - 40, 'DASH ACQUIRED!', '#00F0FF');
    }

    if (this.waves && this.waves.onDashPowerupCollected) {
      this.waves.onDashPowerupCollected();
    }
  }

  onInvertPowerupCollected(x, y) {
    if (this.player) {
      this.player.invertUnlocked = true;
    }
    localStorage.setItem('lightwars_black_boss_defeated', 'true');
    this.unlockHelpCapability('inversion');

    if (window.LightWars.sound) {
      if (window.LightWars.sound.playPowerupPickup) {
        window.LightWars.sound.playPowerupPickup();
      } else {
        window.LightWars.sound.playVictory();
      }
    }

    if (this.particles) {
      this.particles.spawnBurst(x, y, '#FF2A4D', 36);
      this.particles.spawnBurst(x, y, '#FFFFFF', 24);
      this.particles.spawnComicText(x, y - 40, 'INVERT FRAME UNLOCKED!', '#FF2A4D');
    }

    if (this.waves && this.waves.onInvertPowerupCollected) {
      this.waves.onInvertPowerupCollected();
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
    } else if (lvl === 3) {
      localStorage.setItem('lightwars_black_boss_defeated', 'true');
    } else if (lvl === 4) {
      localStorage.setItem('lightwars_level4_cleared', 'true');
    }

    // Update modal text
    const titleEl = document.getElementById('levelClearTitle');
    const msgEl = document.getElementById('levelClearMsg');
    if (titleEl) titleEl.textContent = `LEVEL ${lvl} CLEARED!`;
    if (msgEl) {
      if (lvl === 1) {
        msgEl.textContent = 'You eliminated the CMY invasion force and unlocked the DASH ability! The Spectrum War continues...';
      } else if (lvl === 2) {
        msgEl.textContent = 'You conquered the CMY and RGB legions! The Black Void Overlord awaits your challenge...';
      } else if (lvl === 3) {
        msgEl.textContent = 'THE BLACK BOSS HAS FALLEN! You shattered the void using synthesized White light!';
      } else if (lvl === 4) {
        msgEl.textContent = 'INVERTED FRAME MASTERED! You conquered the chromatic legions with reverse spectrum mastery!';
      }
    }

    document.getElementById('clearKills').innerText = this.waves.stats.enemiesKilled;
    document.getElementById('clearOrbs').innerText = this.waves.stats.orbsCrafted;
    document.getElementById('levelClearModal').style.display = 'flex';
    const topHud = document.getElementById('inGameTopHud');
    if (topHud) topHud.style.display = 'none';
    const helpBtn = document.getElementById('inGameHelpBtn');
    if (helpBtn) helpBtn.style.display = 'none';
    if (window.LightWars.sound) {
      window.LightWars.sound.stopMusic();
      window.LightWars.sound.playVictory();
    }
  }

  onGameOver() {
    this.state = 'GAME_OVER';
    document.getElementById('gameOverModal').style.display = 'flex';
    const topHud = document.getElementById('inGameTopHud');
    if (topHud) topHud.style.display = 'none';
    const helpBtn = document.getElementById('inGameHelpBtn');
    if (helpBtn) helpBtn.style.display = 'none';
    if (window.LightWars.sound) {
      window.LightWars.sound.stopMusic();
      window.LightWars.sound.playPlayerDeath();
    }
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

    // Update Ground Powerups (e.g. Dash Powerup) & Player Collection
    for (const p of this.powerups) {
      p.update(dt);
      if (this.player && this.player.alive) {
        const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
        if (dist <= (p.pickupRadius || 30) + this.player.radius) {
          p.collect(this.player, this);
        }
      }
    }
    this.powerups = this.powerups.filter(p => p.alive);

    // Update Camera (tracks player and focuses on the active region)
    if (this.player) {
      this.camera.update(dt, this.player.x, this.player.y, this.arena.width, this.arena.height);
      const worldPos = this.camera.screenToWorld(this.input.screenMouseX, this.input.screenMouseY);
      this.input.mouseX = worldPos.x;
      this.input.mouseY = worldPos.y;
    }

    // Update Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      const prevX = laser.x;
      const prevY = laser.y;
      laser.update(dt, this.player);

      if (!laser.alive) {
        this.lasers.splice(i, 1);
        continue;
      }

      // Despawn lasers that travel far outside the map
      if (laser.x < -400 || laser.y < -400 || laser.x > this.arena.width + 400 || laser.y > this.arena.height + 400) {
        laser.alive = false;
        this.lasers.splice(i, 1);
        continue;
      }

      // 1. Entity Collision Handling (Check targets FIRST before background boundary walls!)
      if (laser.isPlayer) {
        // [only for 1st level] orbs must be uninteractable till all the enemies die **NOTE only 1st level**
        const isLevel1 = (this.waves && this.waves.level === 1);
        const l1EnemiesStillAlive = isLevel1 && (
          this.enemies.some(e => e.alive) ||
          (this.waves && this.waves.l1Subwave !== 'MAGENTA_YELLOW')
        );

        // Player Laser: Check collision with Orbs -> Spawn 2 Ammo Crystals!
        let laserConsumed = false;
        if (!l1EnemiesStillAlive) {
          for (let j = this.orbs.length - 1; j >= 0; j--) {
            const orb = this.orbs[j];
            if (!orb.alive) continue;
            const clampedOrbY = Math.max(orb.y - 45, Math.min(orb.y + 10, laser.y));
            const d = Math.hypot(laser.x - orb.x, laser.y - clampedOrbY);
            if (d < (orb.hitRadius || 36)) {
              const res = orb.hitByLaser(laser.colorId);
              if (res.success) {
                // Double safety: In level 2, white bullets creation should be stopped
                const isLevel2 = (this.waves && this.waves.level === 2);
                if (isLevel2 && res.resultColor === 'WHITE') {
                  this.particles.spawnBurst(laser.x, laser.y, '#FFFFFF', 6);
                  laser.alive = false;
                  laserConsumed = true;
                  break;
                }

                laser.alive = false;
                laserConsumed = true;
                this.unlockHelpCapability('orbCrafting');
                if (res.resultColor === 'WHITE') {
                  this.unlockHelpCapability('whiteAmmo');
                }

                // Audio & comic banner
                if (window.LightWars.sound) window.LightWars.sound.playOrbConvert();
                const resultColorHex = window.LightWars.COLORS[res.resultColor] ? window.LightWars.COLORS[res.resultColor].hex : '#FFFFFF';
                this.particles.spawnBurst(orb.x, orb.y, resultColorHex, 24);
                this.particles.spawnComicText(orb.x, orb.y, 'CRAFTED!', resultColorHex);

                // Spawn 2 crystals in the place of the orb for player to collect!
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
        }

        if (laserConsumed) {
          this.lasers.splice(i, 1);
          continue;
        }

        // Player Laser: Check collision with Enemies (Whole-body hitbox!)
        let hitEnemy = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          if (!enemy.alive) continue;
          if (enemy.checkLaserHit(laser)) {
            hitEnemy = true;
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

              this.waves.onEnemyDefeated(enemy, laser.colorId);

              // When the Black Boss dies, eliminate all remaining enemies across the arena
              if (enemy.isBoss) {
                this.killRemainingMinions(enemy);
              }
            } else if (outcome.action === 'BOSS_HIT') {
              // Boss took 1 white bullet hit
              this.camera.shake(12);
              this.particles.spawnBurst(enemy.x, enemy.y - 70, '#FFFFFF', 32);
              this.particles.spawnComicText(enemy.x, enemy.y - 90, `HIT! (${outcome.remainingHealth} HP)`, '#00F0FF');
              if (this.waves && this.waves.onBossHit) {
                this.waves.onBossHit(outcome.remainingHealth);
              }
            } else if (outcome.action === 'TRANSFORM' && this.colorChangingEnabled) {
              // TRANSFORM active
              window.LightWars.sound.playTransform();
              this.particles.spawnBurst(enemy.x, enemy.y - 50, window.LightWars.COLORS[outcome.target].hex, 20);
              this.particles.spawnComicText(enemy.x, enemy.y - 70, `➔ ${outcome.target}!`, window.LightWars.COLORS[outcome.target].hex);
              const prevColor = enemy.colorId;
              enemy.setColor(outcome.target);
              if (this.waves && this.waves.onEnemyTransform) {
                this.waves.onEnemyTransform(enemy, prevColor, outcome.target, laser.colorId);
              }
            } else {
              // 'NONE' OR transform disabled in Level 1 — no effect
              this.particles.spawnBurst(laser.x, laser.y, '#AAAAAA', 8);
              this.particles.spawnComicText(enemy.x, enemy.y - 70, 'NO EFFECT!', '#888888');
            }

            break;
          }
        }

        if (hitEnemy) {
          this.lasers.splice(i, 1);
          continue;
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

      // 2. Destructible Barrel Collision Check
      let hitBarrel = false;
      for (const b of this.barrels) {
        if (!b.alive) continue;
        const targetY = b.isBlackBarrel ? b.y : (b.y - 12);
        const dist = Math.hypot(laser.x - b.x, laser.y - targetY);
        if (dist < b.colRadiusX + laser.radius) {
          hitBarrel = true;
          laser.alive = false;
          this.particles.spawnBurst(laser.x, laser.y, b.isBlackBarrel ? '#B040FF' : '#D2A679', 10);
          const res = b.takeLaserHit(laser.colorId, laser.angle);
          if (res.destroyed) {
            this.particles.spawnComicText(b.x, b.y, b.isBlackBarrel ? 'REWARD UNLOCKED!' : 'CRASH!', b.isBlackBarrel ? '#B040FF' : '#D2A679');
            if (b.isBlackBarrel) {
              if (window.LightWars.DashPowerup) {
                this.powerups.push(new window.LightWars.DashPowerup(b.x, b.y));
              }
              if (this.waves && this.waves.onBlackBarrelDestroyed) {
                this.waves.onBlackBarrelDestroyed(b.x, b.y);
              }
            } else if (res.dropColor) {
              this.spawnOrb(b.x, b.y, res.dropColor);
            }
            if (window.LightWars.sound) {
              window.LightWars.sound.playKaboom();
            }
          } else if (b.isBlackBarrel && res.newHit) {
            this.particles.spawnComicText(b.x, b.y - 30, `+${laser.colorId}! (${res.remaining} left)`, window.LightWars.COLORS[laser.colorId].hex);
            if (window.LightWars.sound) window.LightWars.sound.playOrbConvert();
          }
          break;
        }
      }
      if (hitBarrel) {
        this.lasers.splice(i, 1);
        continue;
      }

      // 3. Boundary Wall Collision Check (Only triggers if laser did not strike any entity!)
      if (!this.arena.ignoreBoundaries && this.arena.isPointBlocked(laser.x, laser.y)) {
        laser.alive = false;
        this.particles.spawnBurst(laser.x, laser.y, '#AAAAAA', 8);
        this.lasers.splice(i, 1);
        continue;
      }
    }

    // Update Enemies & Enemy Shooting
    for (const enemy of this.enemies) {
      const enemyLaser = enemy.update(dt, this.player, this.arena, this.barrels, this.lasers, this.enemies);
      if (enemyLaser) {
        this.lasers.push(enemyLaser);
        if (this.particles && this.particles.spawnMuzzleFlash) {
          this.particles.spawnMuzzleFlash(enemyLaser.originX, enemyLaser.originY, enemyLaser.angle, enemyLaser.colorData.hex);
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // Physical Body Collision Resolution (Enemy-Enemy, Player-Enemy, Enemy-Barrel)
    this.resolveEntityCollisions();

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

    // Update Wave Director
    if (this.waves && this.waves.update) {
      this.waves.update(dt);
    }

    // Update UI banners
    this.ui.update(dt);
  }

  // Multi-pass solid circle-circle physical collision resolution
  // Prevents enemies from walking through each other, stacking, or phasing into the player
  resolveEntityCollisions() {
    const enemies = this.enemies;
    const numEnemies = enemies.length;
    const arena = this.arena;

    // 3 relaxation iterations for clean cluster resolution
    for (let iter = 0; iter < 3; iter++) {
      // 1. Enemy vs Enemy Solid Hitbox Collisions
      for (let i = 0; i < numEnemies; i++) {
        const e1 = enemies[i];
        if (!e1.alive) continue;

        for (let j = i + 1; j < numEnemies; j++) {
          const e2 = enemies[j];
          if (!e2.alive) continue;

          const dx = e2.x - e1.x;
          const dy = e2.y - e1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = e1.radius + e2.radius;

          if (dist < minDist) {
            const overlap = minDist - dist;
            let nx, ny;
            if (dist < 0.001) {
              const randAngle = ((i + 1) * 1.618 + (j + 1) * 2.718) % (Math.PI * 2);
              nx = Math.cos(randAngle);
              ny = Math.sin(randAngle);
            } else {
              nx = dx / dist;
              ny = dy / dist;
            }

            const m1 = e1.isBoss ? 4.0 : 1.0;
            const m2 = e2.isBoss ? 4.0 : 1.0;
            const totalM = m1 + m2;
            const ratio1 = m2 / totalM;
            const ratio2 = m1 / totalM;

            e1.x -= nx * overlap * ratio1;
            e1.y -= ny * overlap * ratio1;
            e2.x += nx * overlap * ratio2;
            e2.y += ny * overlap * ratio2;

            if (arena && arena.pushOutOfWall) {
              const s1 = arena.pushOutOfWall(e1.x, e1.y, e1.radius);
              e1.x = s1.x;
              e1.y = s1.y;
              const s2 = arena.pushOutOfWall(e2.x, e2.y, e2.radius);
              e2.x = s2.x;
              e2.y = s2.y;
            }
          }
        }
      }

      // 2. Player vs Enemy Solid Hitbox Collisions
      if (this.player && this.player.alive) {
        for (let i = 0; i < numEnemies; i++) {
          const enemy = enemies[i];
          if (!enemy.alive) continue;

          const pdx = enemy.x - this.player.x;
          const pdy = enemy.y - this.player.y;
          const pdist = Math.hypot(pdx, pdy);
          const pMinDist = this.player.radius + enemy.radius;

          if (pdist < pMinDist) {
            const pOverlap = pMinDist - pdist;
            let pnx, pny;
            if (pdist < 0.001) {
              const randAngle = Math.random() * Math.PI * 2;
              pnx = Math.cos(randAngle);
              pny = Math.sin(randAngle);
            } else {
              pnx = pdx / pdist;
              pny = pdy / pdist;
            }

            const pMass = 1.0;
            const eMass = enemy.isBoss ? 4.0 : 1.0;
            const totalM = pMass + eMass;
            const pRatio = eMass / totalM;
            const eRatio = pMass / totalM;

            this.player.x -= pnx * pOverlap * pRatio;
            this.player.y -= pny * pOverlap * pRatio;
            enemy.x += pnx * pOverlap * eRatio;
            enemy.y += pny * pOverlap * eRatio;

            if (arena && arena.pushOutOfWall) {
              const ps = arena.pushOutOfWall(this.player.x, this.player.y, this.player.radius);
              this.player.x = ps.x;
              this.player.y = ps.y;
              const es = arena.pushOutOfWall(enemy.x, enemy.y, enemy.radius);
              enemy.x = es.x;
              enemy.y = es.y;
            }
          }
        }
      }

      // 3. Enemy vs Destructible Barrels
      for (let i = 0; i < numEnemies; i++) {
        const enemy = enemies[i];
        if (!enemy.alive) continue;
        for (const b of this.barrels) {
          if (!b.alive) continue;
          const res = b.resolveCircleCollision(enemy.x, enemy.y, enemy.radius);
          if (res.collided) {
            enemy.x = res.x;
            enemy.y = res.y;
            if (arena && arena.pushOutOfWall) {
              const es = arena.pushOutOfWall(enemy.x, enemy.y, enemy.radius);
              enemy.x = es.x;
              enemy.y = es.y;
            }
          }
        }
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'MENU') return;

    // Apply Camera translation
    this.camera.apply(this.ctx);

    // 1. Draw 5520x3388 2.5D Dungeon Arena
    this.arena.draw(this.ctx);

    // 2. Y-sorted 2.5D Entities & Foreground Walls (Player, Enemies, Barrels, Orbs, Crystals, Powerups, Walls)
    const entities = [...this.orbs, ...this.crystals, ...this.barrels, ...this.powerups, ...this.enemies];
    if (this.player) entities.push(this.player);

    if (window.LightWars.occlusion) {
      window.LightWars.occlusion.renderDepthSortedScene(this.ctx, entities, this.spriteManager);
    } else {
      entities.sort((a, b) => a.y - b.y);
      for (const ent of entities) {
        if (ent instanceof window.LightWars.Player || ent instanceof window.LightWars.Enemy) {
          ent.draw(this.ctx, this.spriteManager);
        } else if (ent.draw) {
          ent.draw(this.ctx);
        }
      }
    }

    // 3. Draw Lasers
    for (const laser of this.lasers) {
      laser.draw(this.ctx);
    }

    // 4. Draw Particles & Comic Text bursts
    this.particles.draw(this.ctx);

    this.camera.restore(this.ctx);

    // Invert Frame visual reality distortion vignette
    if (this.physicsInverted) {
      this.ctx.save();
      const grad = this.ctx.createRadialGradient(
        this.canvas.width / 2, this.canvas.height / 2, Math.min(this.canvas.width, this.canvas.height) * 0.35,
        this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.75
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(160, 32, 240, 0.28)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }

    // 5. Draw Screenspace HUD
    this.ui.drawHUD(this.ctx, this.canvas.width, this.canvas.height, this.player, this.waves, this.enemies);

    // 6. Draw Custom Crosshair (Mini Orb matching currently selected player color)
    if (this.state === 'PLAYING' && this.player && this.player.alive && this.input.mouseInside) {
      this.drawCrosshair(this.ctx);
    }
  }

  /**
   * Render custom crosshair designed as a mini glowing energy orb matching the selected color.
   */
  drawCrosshair(ctx) {
    const x = this.input.screenMouseX;
    const y = this.input.screenMouseY;
    const colorData = this.player.getActiveColorData() || window.LightWars.COLORS.RED;
    const hex = colorData.hex || '#FF2A4D';
    const glow = colorData.glow || hex;

    const time = (performance.now ? performance.now() : Date.now()) * 0.005;
    const pulse = 1.0 + Math.sin(time * 2.0) * 0.12;

    const baseRadius = 2.75; // Mini orb base radius (scaled to 50%)
    const outerRadius = baseRadius * 2.6 * pulse;
    const innerRadius = baseRadius * 1.15 * pulse;

    ctx.save();
    ctx.translate(x, y);

    // 1. Ambient outer energy glow halo
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
    glowGrad.addColorStop(0.0, '#FFFFFF');
    glowGrad.addColorStop(0.2, hex);
    glowGrad.addColorStop(0.55, glow);
    glowGrad.addColorStop(0.85, hex);
    glowGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-intensity additive inner luminous core
    ctx.globalCompositeOperation = 'lighter';
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
    coreGrad.addColorStop(0.0, '#FFFFFF');
    coreGrad.addColorStop(0.35, '#FFFFFF');
    coreGrad.addColorStop(0.7, hex);
    coreGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Mini orbiting orbital sparks
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 3; i++) {
      const angle = time * 3.0 + (i * (Math.PI * 2 / 3));
      const sparkDist = outerRadius * 0.85;
      const sx = Math.cos(angle) * sparkDist;
      const sy = Math.sin(angle) * sparkDist;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Subtle tactical crosshair tick marks outside the mini orb for precision aiming
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = hex;
    ctx.lineWidth = 1.0;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 3;

    const tickDist = outerRadius + 1.8;
    const tickLen = 2.5;

    // 4 directional ticks (Top, Bottom, Left, Right)
    ctx.beginPath();
    // Top
    ctx.moveTo(0, -tickDist - tickLen);
    ctx.lineTo(0, -tickDist);
    // Bottom
    ctx.moveTo(0, tickDist);
    ctx.lineTo(0, tickDist + tickLen);
    // Left
    ctx.moveTo(-tickDist - tickLen, 0);
    ctx.lineTo(-tickDist, 0);
    // Right
    ctx.moveTo(tickDist, 0);
    ctx.lineTo(tickDist + tickLen, 0);
    ctx.stroke();

    // Pinpoint white center pip
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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
