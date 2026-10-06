/**
 * Light-Wars: Level 4 Wave & Script Logic
 *
 * LEVEL 4: Inverted Frame Training — White Boss Arena (map4and5.png)
 *
 * card-1: Noobi-Wan — explains Inverted Frame ability (E key, 25s cooldown)
 *          "In inverted frame only the way they die (to their own colour) will change,
 *           not the colour changing of bots"
 * card-2: Noobi-Wan — "now red blue green will come, use inverted frame and defeat them"
 *           (if player doesn't use inverted frame → reset to pre-card2 state & replay card2)
 *           (if inverted frame is on cooldown → refresh it for this one time)
 * card-3: Noobi-Wan — "here is one of each cyan magenta yellow, use inverted frame and defeat them"
 *           Noobi gifts Fluke 3 CMY bullets each before spawning enemies.
 *           If player doesn't use inverted frame → reset to the state just after killing RGB (pre-card-3 snapshot)
 *           (same reset logic as card-2 if player doesn't use inverted frame)
 */

const L4_NOOBI_IMG = 'assets/noobi/noobi_wan_instructions.png';

class Level4Director {
  constructor(waveDirector) {
    this.waves = waveDirector;
    this.game  = waveDirector.game;

    // Phase tracking
    this.phase = 0; // 0=intro, 1=RGB-invert-check, 2=CMY-invert-check, 3=done
    this.isVictoryInProgress = false;

    // Snapshot of player state just before card-2 (used for reset)
    this._card2Snapshot = null;

    // Flags for this combat phase
    this._invertUsedInPhase = false;
    this._phaseEnemiesAlive  = 0;
    this._watchingPhase      = false;
    this._phaseTimer         = 0; // watchdog after enemies die
  }

  // ─── Entry point ─────────────────────────────────────────────────────────────
  start() {
    this.waves.level   = 4;
    this.waves.phase   = 0;
    this.waves.cleared = false;
    this.waves.stats   = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    this.game.colorChangingEnabled = true;
    this.phase = 0;
    this.isVictoryInProgress = false;
    this._card2Snapshot = null;
    this._invertUsedInPhase = false;
    this._phaseEnemiesAlive  = 0;
    this._watchingPhase      = false;
    this._phaseTimer         = 0;

    // Ensure player has the invert unlock
    if (this.game.player) {
      this.game.player.invertUnlocked = true;
      // Give solid combat ammo
      const startAmmo = { RED:8, GREEN:8, BLUE:8, CYAN:6, MAGENTA:6, YELLOW:6, WHITE:0 };
      for (const [c, n] of Object.entries(startAmmo)) {
        this.game.player.ammo[c] = Math.max(this.game.player.ammo[c] || 0, n);
      }
    }

    this.game.ui.setObjective(
      'LEVEL 4 — INVERTED FRAME TRAINING',
      'Master the Invert Frame ability in the White Boss arena!'
    );

    // card-1: Ability intro
    setTimeout(() => this._showCard1(), 400);
  }

  // ─── Card 1 — Explain Inverted Frame ─────────────────────────────────────────
  _showCard1() {
    const card1 = {
      id: 'l4_card1',
      badge: '⚡ MASTER NOOBI-WAN INTEL',
      tracker: 'CARD 01 / 03',
      step: 1,
      totalSteps: 3,
      title: 'MASTER NOOBI-WAN: INVERTED FRAME ABILITY',
      speakerImg: L4_NOOBI_IMG,
      speakerAlt: 'Master Noobi-Wan',
      message:
        '<div class="noobi-callout-box" style="margin:4px 0;padding:6px;font-size:12.5px;font-weight:bold;color:#FF3366;border-left:3.5px solid #9400D3;background:rgba(160,32,240,0.15);border-radius:4px;">' +
        '&ldquo;In Inverted Frame, bots die to their <b>own colour</b> laser!&rdquo;</div>' +
        '• Activate with <b>KEY [RMB]</b> (10s duration, 25s cooldown).<br>' +
        '• Color-changing logic remains unchanged.',
      btnText: 'UNDERSTOOD! ▶'
    };

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence([card1], () => this._prepareCard2());
    } else {
      this._prepareCard2();
    }
  }

  // ─── Prepare state before card-2 (snapshot + show card) ───────────────────
  _prepareCard2() {
    // Take snapshot of player inventory right now
    this._snapshotPlayerState();
    this._showCard2();
  }

  _snapshotPlayerState() {
    if (!this.game.player) return;
    const p = this.game.player;
    this._card2Snapshot = {
      ammo:              Object.assign({}, p.ammo),
      health:            p.health,
      invertCooldown:    p.invertCooldown,
      invertUnlocked:    p.invertUnlocked,
      invertActiveTimer: p.invertActiveTimer
    };
  }

  _restoreCard2State() {
    if (!this._card2Snapshot || !this.game.player) return;
    const p  = this.game.player;
    const sn = this._card2Snapshot;
    p.ammo = Object.assign({}, sn.ammo);
    p.health            = sn.health;
    p.invertCooldown    = 0;      // always reset cooldown on retry
    p.invertUnlocked    = true;
    p.invertActiveTimer = 0;
    if (this.game.physicsInverted) {
      this.game.physicsInverted = false;
    }
  }

  // ─── Card 2 — RGB wave ───────────────────────────────────────────────────────
  _showCard2() {
    const card2 = {
      id: 'l4_card2',
      badge: '⚡ MASTER NOOBI-WAN INTEL',
      tracker: 'CARD 02 / 03',
      step: 2,
      totalSteps: 3,
      title: 'MASTER NOOBI-WAN: USE INVERTED FRAME',
      speakerImg: L4_NOOBI_IMG,
      speakerAlt: 'Master Noobi-Wan',
      message:
        '<b>INVERTED FRAME PRACTICE: RGB</b><br><br>' +
        '• <span style="color:#FF2A4D">RED</span> dies to <b>RED [1]</b><br>' +
        '• <span style="color:#22E058">GREEN</span> dies to <b>GREEN [2]</b><br>' +
        '• <span style="color:#4D96FF">BLUE</span> dies to <b>BLUE [3]</b><br><br>' +
        '<div class="noobi-callout-box" style="margin:4px 0;padding:6px;font-size:12.5px;font-weight:bold;color:#FF3366;border-left:3.5px solid #9400D3;background:rgba(160,32,240,0.15);border-radius:4px;">' +
        '&ldquo;Activate <b>[E]</b> to defeat the incoming bots with their own color!&rdquo;</div>',
      btnText: 'ENGAGE! ⚔️'
    };

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence([card2], () => this._startRGBPhase());
    } else {
      this._startRGBPhase();
    }
  }

  _startRGBPhase() {
    this.phase = 1;
    this._invertUsedInPhase = false;
    this._watchingPhase     = false;

    // If invert frame is on cooldown, refresh it for this one time
    if (this.game.player && this.game.player.invertCooldown > 0) {
      this.game.player.invertCooldown = 0;
      if (this.game.particles) {
        this.game.particles.spawnComicText(
          this.game.player.x, this.game.player.y - 80,
          'INVERT REFRESHED!', '#A020F0'
        );
      }
    }

    // Clear existing enemies
    this.game.enemies.forEach(e => { e.alive = false; });
    this.game.enemies = [];

    // Spawn 3 RGB troops
    const coords = [
      { col: 10, row: 12 },
      { col: 15, row: 16 },
      { col: 20, row: 13 }
    ];
    ['RED', 'GREEN', 'BLUE'].forEach((color, i) => {
      this.waves.spawnAt(coords[i].col, coords[i].row, color);
    });
    this._phaseEnemiesAlive = 3;

    this.game.ui.setObjective(
      'LEVEL 4 — RGB INVERTED TRAINING',
      'Activate Inverted Frame [E], then kill RED, GREEN, BLUE with their own colour!'
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(
        this.game.player.x, this.game.player.y - 60,
        'RGB TROOPS INCOMING!', '#FF2A4D'
      );
    }
  }

  // ─── Card 3 — CMY wave ──────────────────────────────────────────────────────
  _showCard3() {
    const card3 = {
      id: 'l4_card3',
      badge: '⚡ MASTER NOOBI-WAN INTEL',
      tracker: 'CARD 03 / 03',
      step: 3,
      totalSteps: 3,
      title: 'MASTER NOOBI-WAN: CMY INVERTED FRAME',
      speakerImg: L4_NOOBI_IMG,
      speakerAlt: 'Master Noobi-Wan',
      message:
        '<b>INVERTED FRAME PRACTICE: CMY</b><br><br>' +
        '• <span style="color:#00F0FF">CYAN</span> dies to <b>CYAN [4]</b><br>' +
        '• <span style="color:#FF2AD4">MAGENTA</span> dies to <b>MAGENTA [5]</b><br>' +
        '• <span style="color:#FFE600">YELLOW</span> dies to <b>YELLOW [6]</b><br><br>' +
        '<div class="noobi-callout-box" style="margin:4px 0;padding:6px;font-size:12.5px;font-weight:bold;color:#FF3366;border-left:3.5px solid #9400D3;background:rgba(160,32,240,0.15);border-radius:4px;">' +
        '&ldquo;Here — one of each awaits you. I&rsquo;ll gift you 3 CMY bullets each. Activate <b>[E]</b> and defeat them with their own color!&rdquo;</div>',
      btnText: 'ENGAGE! ⚔️'
    };

    // Gift the player 3 bullets of each CMY color before the fight
    if (this.game.player) {
      const p = this.game.player;
      ['CYAN', 'MAGENTA', 'YELLOW'].forEach(color => {
        p.ammo[color] = (p.ammo[color] || 0) + 3;
      });
      if (this.game.particles) {
        this.game.particles.spawnComicText(
          this.game.player.x, this.game.player.y - 80,
          'NOOBI GIFTED 3 CMY BULLETS!', '#00F0FF'
        );
      }
    }

    // Snapshot AFTER gifting CMY bullets — this is the baseline for retries in this phase
    this._snapshotPlayerState();

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence([card3], () => this._startCMYPhase());
    } else {
      this._startCMYPhase();
    }
  }

  _startCMYPhase() {
    this.phase = 2;
    this._invertUsedInPhase = false;
    this._watchingPhase     = false;

    // Refresh invert cooldown if on cooldown
    if (this.game.player && this.game.player.invertCooldown > 0) {
      this.game.player.invertCooldown = 0;
      if (this.game.particles) {
        this.game.particles.spawnComicText(
          this.game.player.x, this.game.player.y - 80,
          'INVERT REFRESHED!', '#A020F0'
        );
      }
    }

    // Clear existing enemies
    this.game.enemies.forEach(e => { e.alive = false; });
    this.game.enemies = [];

    // Spawn 1 of each CMY = 3 enemies
    const cmyColors = ['CYAN', 'MAGENTA', 'YELLOW'];
    const coords = [
      { col: 10, row: 12 },
      { col: 15, row: 16 },
      { col: 20, row: 13 }
    ];
    cmyColors.forEach((color, i) => {
      this.waves.spawnAt(coords[i].col, coords[i].row, color);
    });
    this._phaseEnemiesAlive = 3;

    this.game.ui.setObjective(
      'LEVEL 4 — CMY INVERTED TRAINING',
      'Activate Inverted Frame [E], then kill Cyan, Magenta, Yellow with their own colour!'
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(
        this.game.player.x, this.game.player.y - 60,
        'CMY TROOPS INCOMING!', '#00F0FF'
      );
    }
  }

  // ─── Reset to pre-card-2 state ────────────────────────────────────────────
  _resetToCard2() {
    if (this.game.particles && this.game.player) {
      this.game.particles.spawnComicText(
        this.game.player.x, this.game.player.y - 80,
        'INVERT FRAME NOT USED!', '#FF2A4D'
      );
    }

    // Kill all current enemies
    this.game.enemies.forEach(e => { e.alive = false; });
    this.game.enemies = [];

    // Reset phase back to 1
    this.phase = 1;
    this._invertUsedInPhase = false;

    // Restore player state to pre-card-2 snapshot
    this._restoreCard2State();

    // Re-show card 2 after a brief pause
    setTimeout(() => this._showCard2(), 800);
  }

  // ─── Reset to post-RGB / pre-card-3 state (CMY phase fail) ───────────────
  _resetToCard3() {
    if (this.game.particles && this.game.player) {
      this.game.particles.spawnComicText(
        this.game.player.x, this.game.player.y - 80,
        'INVERT FRAME NOT USED!', '#FF2A4D'
      );
    }

    // Kill all current enemies
    this.game.enemies.forEach(e => { e.alive = false; });
    this.game.enemies = [];

    // Reset phase back to 2
    this.phase = 2;
    this._invertUsedInPhase = false;

    // Restore player state to the snapshot taken just after Noobi gifted CMY bullets
    this._restoreCard2State();

    // Re-show card 3 retry dialogue after a brief pause
    setTimeout(() => {
      if (this.game.showTutorialSequence) {
        const card3Retry = {
          id: 'l4_card3',
          badge: '⚡ MASTER NOOBI-WAN INTEL',
          tracker: 'CARD 03 / 03',
          step: 3,
          totalSteps: 3,
          title: 'MASTER NOOBI-WAN: CMY INVERTED FRAME',
          speakerImg: L4_NOOBI_IMG,
          speakerAlt: 'Master Noobi-Wan',
          message:
            '<b>INVERTED FRAME PRACTICE: CMY</b><br><br>' +
            '• <span style="color:#00F0FF">CYAN</span> dies to <b>CYAN [4]</b><br>' +
            '• <span style="color:#FF2AD4">MAGENTA</span> dies to <b>MAGENTA [5]</b><br>' +
            '• <span style="color:#FFE600">YELLOW</span> dies to <b>YELLOW [6]</b><br><br>' +
            '<div class="noobi-callout-box" style="margin:4px 0;padding:6px;font-size:12.5px;font-weight:bold;color:#FF3366;border-left:3.5px solid #9400D3;background:rgba(160,32,240,0.15);border-radius:4px;">' +
            '&ldquo;You must use the Inverted Frame [E]! Try again — your inventory is restored.&rdquo;</div>',
          btnText: 'TRY AGAIN! ⚔️'
        };
        this.game.showTutorialSequence([card3Retry], () => this._startCMYPhase());
      } else {
        this._startCMYPhase();
      }
    }, 800);
  }

  // ─── Victory ────────────────────────────────────────────────────────────────
  _levelComplete() {
    if (this.isVictoryInProgress) return;
    this.isVictoryInProgress = true;
    this.phase = 3;

    if (this.game.particles && this.game.player) {
      this.game.particles.spawnComicText(
        this.game.player.x, this.game.player.y - 80,
        'LEVEL 4 COMPLETE!', '#FFE600'
      );
    }

    setTimeout(() => {
      this.waves.cleared = true;
      this.game.onLevelComplete(4);
    }, 1000);
  }

  // ─── Event hooks ────────────────────────────────────────────────────────────

  onEnemyDefeated(enemy, laserColorId) {
    this._phaseEnemiesAlive = Math.max(0, this._phaseEnemiesAlive - 1);

    const livingMinions = this.game.enemies.filter(e => e.alive && !e.isBoss);

    if (livingMinions.length === 0 && !this.isVictoryInProgress) {
      // All enemies dead — check if invert frame was used
      if (!this._invertUsedInPhase) {
        if (this.phase === 1) {
          // Player did NOT use invert frame in RGB phase → reset to pre-card2 state and replay card2
          this._resetToCard2();
        } else if (this.phase === 2) {
          // Player did NOT use invert frame in CMY phase → restore post-RGB inventory and replay card3
          this._resetToCard3();
        }
      } else if (this.phase === 1) {
        // RGB phase cleared with invert frame → proceed to card 3
        setTimeout(() => this._showCard3(), 800);
      } else if (this.phase === 2) {
        // CMY phase cleared with invert frame → victory!
        setTimeout(() => this._levelComplete(), 800);
      }
    }
  }

  onEnemyTransform(enemy, prevColor, newColor, laserColor) {
    // No special handling needed
  }

  onOrbCrafted() {}

  update(dt) {
    // Track whether player activated invert frame this phase
    if (this.phase === 1 || this.phase === 2) {
      if (this.game.physicsInverted) {
        this._invertUsedInPhase = true;
      }
    }
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Level4Director = Level4Director;
