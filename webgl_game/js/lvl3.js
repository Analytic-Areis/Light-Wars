/**
 * Light-Wars: Level 3 Wave & Script Logic
 *
 * LEVEL 3: The Black Boss & Master Noobi-Wan Cards (1-5)
 * - Card 1: Noobi-wan teaches how to create white crystals ("Shoot some orb with its contrary-color laser to form white crystals")
 * - Card 2: Noobi-wan teaches how to defeat the Black Boss ("To defeat the black boss, shoot him with his contrary-color laser")
 * - Spawns Black Boss + CYM triad; alternating minion waves (CYM <-> RGB)
 * - Boss hit reaction: replenishes minions, triggers Invert Frame ability
 * - Card 3: Triggered upon Boss Invert Frame activation ("The black boss has a special ability known as invert frame; when it is turned on, bots can be killed only by the lasers of their color, and the black boss is literally invincible in this state")
 * - Boss defeated reaction:
 *   - Card 4: ("By defeating the black boss, you gained his ability to invert frame. You can activate the ability using the key E, and it has a timeout of 25s at full health, 7s after 1 heart lost, and 5s after 2 hearts lost")
 *   - Card 5: ("Seems like another boss; we have to destroy him too. Let's move further")
 * - Completes Level 3 and transitions to victory / next boss screen
 */

class Level3Director {
  constructor(waveDirector) {
    this.waves = waveDirector;
    this.game = waveDirector.game;

    this.seenInversionExplanation = false;
    this.bossRef = null;

    this.l3ReplenishPending = false;
    this.l3ReplenishTimer = 0;
    this.l3NextBatch = 'RGB'; // 'RGB' or 'CYM'
    this._lastProcessedHp = null;
    this.isVictoryInProgress = false;
  }

  start() {
    this.waves.level = 3;
    this.waves.phase = 1;
    this.waves.cleared = false;
    this.waves.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    this.game.colorChangingEnabled = true;
    this.seenInversionExplanation = false;
    this.l3ReplenishPending = false;
    this.l3ReplenishTimer = 0;
    this.l3NextBatch = 'RGB';
    this._lastProcessedHp = null;
    this.isVictoryInProgress = false;

    // Equip Fluke with combat-ready ammo for Level 3
    if (this.game.player) {
      this.game.player.ammo.RED = Math.max(this.game.player.ammo.RED || 0, 6);
      this.game.player.ammo.GREEN = Math.max(this.game.player.ammo.GREEN || 0, 6);
      this.game.player.ammo.BLUE = Math.max(this.game.player.ammo.BLUE || 0, 6);
      this.game.player.ammo.CYAN = Math.max(this.game.player.ammo.CYAN || 0, 4);
      this.game.player.ammo.MAGENTA = Math.max(this.game.player.ammo.MAGENTA || 0, 4);
      this.game.player.ammo.YELLOW = Math.max(this.game.player.ammo.YELLOW || 0, 4);
    }

    // Sequence of Card 1 and Card 2 at the start of Level 3
    const startCards = [
      {
        id: 'l3_card1',
        tag: 'SYNTHESIS INTEL // 01',
        badge: '⚡ MASTER NOOBI-WAN INTEL',
        tracker: 'CARD 01 / 02',
        step: 1,
        totalSteps: 2,
        title: 'MASTER NOOBI-WAN: WHITE CRYSTALS',
        message:
          'Listen closely, Fluke!<br><br>' +
          '<div style="font-size: 15px; font-weight: bold; color: #00F0FF; border-left: 3px solid #00F0FF; padding: 8px 10px; background: rgba(0, 240, 255, 0.12); border-radius: 4px; margin-bottom: 12px;">' +
          '&ldquo;Shoot some orb with its contrary-color laser to form white crystals&rdquo;' +
          '</div>' +
          '• Shoot <span class="noobi-hl red">RED laser [1]</span> into a <span class="noobi-hl cyan">CYAN orb</span> (or Cyan into Red)<br>' +
          '• Shoot <span class="noobi-hl green">GREEN laser [2]</span> into a <span class="noobi-hl magenta">MAGENTA orb</span> (or Magenta into Green)<br>' +
          '• Shoot <span class="noobi-hl blue">BLUE laser [3]</span> into a <span class="noobi-hl yellow">YELLOW orb</span> (or Yellow into Blue)<br><br>' +
          'Contrary-color reaction crystallizes pure <b>WHITE AMMO [7]</b>!',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l3_card2',
        tag: 'BOSS COMBAT // 02',
        badge: '⚡ MASTER NOOBI-WAN INTEL',
        tracker: 'CARD 02 / 02',
        step: 2,
        totalSteps: 2,
        title: 'MASTER NOOBI-WAN: DEFEATING THE BLACK BOSS',
        message:
          'The Black Boss commands the abyssal darkness!<br><br>' +
          '<div style="font-size: 15px; font-weight: bold; color: #FFE600; border-left: 3px solid #FFE600; padding: 8px 10px; background: rgba(255, 230, 0, 0.12); border-radius: 4px; margin-bottom: 12px;">' +
          '&ldquo;To defeat the black boss, shoot him with his contrary-color laser&rdquo;' +
          '</div>' +
          '• The Black Boss is darkness incarnate — his contrary wavelength is <b>pure WHITE LASER [7]</b>!<br>' +
          '• Standard RGB &amp; CMY lasers will not scratch his abyssal shield.<br>' +
          '• Strike him with <b>3 White laser strikes</b> to destroy him once and for all!',
        btnText: 'ENGAGE THE BLACK BOSS! ⚔️'
      }
    ];

    setTimeout(() => {
      if (this.game.showTutorialSequence) {
        this.game.showTutorialSequence(startCards, () => {
          this.initL3BossBattle();
        });
      } else {
        this.initL3BossBattle();
      }
    }, 250);
  }

  initL3BossBattle() {
    this.waves.phase = 1;
    this.game.ui.setObjective(
      "LEVEL 3 — THE BLACK BOSS SHOWDOWN",
      "Defeat minions, synthesize WHITE crystals, and shoot the Black Boss!"
    );

    // Initial spawn: CYM triad
    this.waves.spawnAt(8, 6, 'CYAN');
    this.waves.spawnAt(24, 11, 'YELLOW');
    this.waves.spawnAt(7, 13, 'MAGENTA');

    // Spawn the Black Boss at upper center dais
    const bossPos = (this.game.arena && this.game.arena.toScreen)
      ? this.game.arena.toScreen(10.5, 6.5)
      : { x: 2688, y: 1100 };
    this.bossRef = this.game.spawnBoss(bossPos.x, bossPos.y);

    this.waves.enemiesRemainingInPhase = 3;
    this.l3NextBatch = 'RGB';
  }

  scheduleL3Replenish(nextType) {
    this.l3NextBatch = nextType;
    this.l3ReplenishTimer = 3.0; // Exact 3-second gap
    this.l3ReplenishPending = true;

    if (this.game.particles && this.game.player) {
      this.game.particles.spawnComicText(
        this.game.player.x,
        this.game.player.y - 70,
        `${nextType} INCOMING IN 3s!`,
        nextType === 'RGB' ? '#FF2A4D' : '#00F0FF'
      );
    }
  }

  spawnL3MinionSet(setType) {
    const minionCoords = [
      { col: 8, row: 6 },
      { col: 24, row: 11 },
      { col: 7, row: 13 }
    ];

    if (setType === 'RGB') {
      const rgbColors = ['RED', 'GREEN', 'BLUE'];
      for (let i = 0; i < 3; i++) {
        const c = minionCoords[i];
        this.waves.spawnAt(c.col, c.row, rgbColors[i]);
      }
      this.waves.enemiesRemainingInPhase = 3;
      this.game.ui.setObjective(
        "LEVEL 3 — RGB REINFORCEMENTS",
        "Counter the 3 RGB troops (Red, Green, Blue)!"
      );
      if (this.game.particles) {
        this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "RGB LEGION ARRIVED!", "#FF2A4D");
      }
    } else {
      const cymColors = ['CYAN', 'YELLOW', 'MAGENTA'];
      for (let i = 0; i < 3; i++) {
        const c = minionCoords[i];
        this.waves.spawnAt(c.col, c.row, cymColors[i]);
      }
      this.waves.enemiesRemainingInPhase = 3;
      this.game.ui.setObjective(
        "LEVEL 3 — CYM REINFORCEMENTS",
        "Eliminate the 3 CYM troops (Cyan, Yellow, Magenta) to harvest complementary orbs!"
      );
      if (this.game.particles) {
        this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "CYM TROOPS ARRIVED!", "#00F0FF");
      }
    }
  }

  onBossPhysicsInversionActivated() {
    if (this.seenInversionExplanation) return;
    this.seenInversionExplanation = true;

    // Card 3: After hitting the black boss with a white bullet and the boss uses invert frame
    const card3 = {
      id: 'l3_card3',
      tag: 'BOSS ABILITY UNLEASHED',
      badge: '⚠️ REALITY DISTORTION ALERT',
      tracker: 'CARD 03',
      step: 1,
      totalSteps: 1,
      title: 'MASTER NOOBI-WAN: INVERT FRAME ABILITY',
      message:
        'Fluke, look out!<br><br>' +
        '<div style="font-size: 15px; font-weight: bold; color: #FF4D66; border-left: 3px solid #A020F0; padding: 8px 10px; background: rgba(160, 32, 240, 0.15); border-radius: 4px; margin-bottom: 12px;">' +
        '&ldquo;The black boss has a special ability known as invert frame; when it is turned on, bots can be killed only by the lasers of their color, and the black boss is literally invincible in this state&rdquo;' +
        '</div>' +
        '• <b>SAME-COLOR VULNERABILITY:</b><br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl cyan">CYAN bot</span> dies only to <b>CYAN laser [4]</b><br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl magenta">MAGENTA bot</span> dies only to <b>MAGENTA laser [5]</b><br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl yellow">YELLOW bot</span> dies only to <b>YELLOW laser [6]</b><br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl red">RED bot</span> dies only to <b>RED laser [1]</b> (and Green to Green, Blue to Blue)<br><br>' +
        '• <b>THE BLACK BOSS IS INVINCIBLE:</b> Hold your ground until his invert frame drops before striking him with White lasers again!',
      btnText: 'UNDERSTOOD, NOOBI-WAN! ⚔️'
    };

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence([card3]);
    }
  }

  onBossHit(remainingHp) {
    if (remainingHp <= 0) return;
    if (this._lastProcessedHp === remainingHp) return;
    this._lastProcessedHp = remainingHp;

    // Check currently living minions
    const livingMinions = this.game.enemies.filter(e => e.alive && !e.isBoss);
    const livingColors = livingMinions.map(e => e.colorId);

    // Replenish minions: determine if currently fighting RGB or CYM, and replenish missing ones
    const hasRGB = livingColors.some(c => c === 'RED' || c === 'GREEN' || c === 'BLUE');
    const targetSet = hasRGB ? ['RED', 'GREEN', 'BLUE'] : ['CYAN', 'YELLOW', 'MAGENTA'];
    const missingColors = targetSet.filter(c => !livingColors.includes(c));

    const minionCoords = [
      { col: 8, row: 6 },
      { col: 24, row: 11 },
      { col: 7, row: 13 }
    ];

    if (missingColors.length > 0) {
      for (let i = 0; i < missingColors.length; i++) {
        const coord = minionCoords[i % minionCoords.length];
        this.waves.spawnAt(coord.col, coord.row, missingColors[i]);
      }
      this.waves.enemiesRemainingInPhase = targetSet.length;
      if (this.game.particles) {
        this.game.particles.spawnComicText(
          this.bossRef ? this.bossRef.x : this.game.player.x,
          (this.bossRef ? this.bossRef.y : this.game.player.y) - 100,
          "MINIONS REPLENISHED!",
          "#A020F0"
        );
      }
    }

    // Immediately trigger Boss Physics Inversion
    if (this.bossRef && this.bossRef.alive) {
      this.bossRef.triggerPhysicsInversion();
    }
  }

  onEnemyDefeated(enemy, laserColorId) {
    // If boss dies, trigger Cards 4 & 5 and level completion
    if (enemy && enemy.isBoss) {
      if (this.isVictoryInProgress) return;
      this.isVictoryInProgress = true;

      // Safely neutralize remaining minion projectiles
      this.game.enemyLasers = [];

      // Drop the Uno Reverse Card — InvertPowerup pickup at boss death position
      if (window.LightWars.InvertPowerup && this.game.powerups) {
        this.game.powerups.push(new window.LightWars.InvertPowerup(enemy.x, enemy.y));
      }

      if (this.game.particles) {
        this.game.particles.spawnComicText(enemy.x, enemy.y - 60, "POWERUP DROPPED!", "#FF2A4D");
      }

      return;
    }

    this.waves.enemiesRemainingInPhase = Math.max(0, this.waves.enemiesRemainingInPhase - 1);

    // Check if all non-boss minions are dead
    const livingMinions = this.game.enemies.filter(e => e.alive && !e.isBoss);
    if (livingMinions.length === 0 && !this.l3ReplenishPending && !this.isVictoryInProgress) {
      // Check what died: if the last dead was CMY -> schedule RGB in 3 sec; if RGB -> schedule CYM in 3 sec!
      const deadColor = enemy ? enemy.colorId : '';
      const isRGB = (deadColor === 'RED' || deadColor === 'GREEN' || deadColor === 'BLUE');
      const nextBatch = isRGB ? 'CYM' : 'RGB';
      this.scheduleL3Replenish(nextBatch);
    }
  }

  onInvertPowerupCollected() {
    if (this.isPowerupCollected) return;
    this.isPowerupCollected = true;

    // Give a clear gap/breather (1.5 seconds) after picking up the Uno Reverse Powerup before Noobi-Wan appears
    setTimeout(() => {
      const victoryCards = [
        {
          id: 'l3_card4',
          tag: 'LEGENDARY POWER ACQUIRED // 01',
          badge: '✨ NEW ABILITY UNLOCKED',
          tracker: 'CARD 04 / 05',
          step: 1,
          totalSteps: 2,
          title: 'MASTER NOOBI-WAN: INVERT FRAME GAINED',
          message:
            'Incredible victory, Fluke!<br><br>' +
            '<div style="font-size: 15px; font-weight: bold; color: #00F0FF; border-left: 3px solid #00F0FF; padding: 8px 10px; background: rgba(0, 240, 255, 0.12); border-radius: 4px; margin-bottom: 12px;">' +
            '&ldquo;By defeating the black boss, you gained his ability to invert frame. You can activate the ability using the key E, and it has a timeout of 25s at full health &mdash; but it drops to 7s after losing 1 heart, and 5s after losing 2 hearts!&rdquo;' +
            '</div>' +
            '• Press <b>KEY [E]</b> during combat to reverse light physics for 10 seconds!<br>' +
            '• When active, enemies can be destroyed by their own matching color lasers.<br>' +
            '• Ability timeout cooldown: <b>25s</b> (full health) → <b>7s</b> (1 heart lost) → <b>5s</b> (2 hearts lost).',
          btnText: 'CONTINUE NOOBI-WAN ▶'
        },
        {
          id: 'l3_card5',
          tag: 'GREATER PERIL // 02',
          badge: '🌌 THE SPECTRUM WAR AHEAD',
          tracker: 'CARD 05 / 05',
          step: 2,
          totalSteps: 2,
          title: 'MASTER NOOBI-WAN: ANOTHER BOSS AHEAD',
          message:
            'Hold on... the chromatic disturbances haven\'t ceased!<br><br>' +
            '<div style="font-size: 15px; font-weight: bold; color: #FFE600; border-left: 3px solid #FFE600; padding: 8px 10px; background: rgba(255, 230, 0, 0.12); border-radius: 4px; margin-bottom: 12px;">' +
            '&ldquo;Seems like another boss; we have to destroy him too. Let\'s move further&rdquo;' +
            '</div>' +
            'Prepare yourself, Fluke. The battle for the spectrum is far from over!',
          btnText: 'COMPLETE LEVEL 3! 🏆'
        }
      ];

      if (this.game.showTutorialSequence) {
        this.game.showTutorialSequence(victoryCards, () => {
          this.waves.cleared = true;
          this.game.onLevelComplete(3);
        });
      } else {
        this.waves.cleared = true;
        this.game.onLevelComplete(3);
      }
    }, 1500);
  }

  update(dt) {
    if (this.l3ReplenishPending && !this.isVictoryInProgress) {
      this.l3ReplenishTimer -= dt;
      if (this.l3ReplenishTimer <= 0) {
        this.l3ReplenishPending = false;
        this.spawnL3MinionSet(this.l3NextBatch);
      }
    }
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Level3Director = Level3Director;
