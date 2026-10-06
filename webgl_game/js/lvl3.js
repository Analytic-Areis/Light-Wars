/**
 * Light-Wars: Level 3 Wave & Script Logic
 *
 * LEVEL 3: The Black Boss & Alternating 3-Minion Waves (CYM <-> RGB)
 * - Black Boss dialogue and taunt
 * - Spawns Black Boss + CYM triad
 * - Master Noobi-Wan guide on White Bullets [7] & Black Boss vulnerability (3 White laser hits)
 * - Alternating 3-minion waves with 3-second gap timer
 * - Boss hit reaction: replenishes minions, triggers light physics inversion
 * - Reality Distortion / Light Physics Inversion mechanics and tutorials
 */

class Level3Director {
  constructor(waveDirector) {
    this.waves = waveDirector;
    this.game = waveDirector.game;

    this.seenInversionExplanation = false;
    this.seen15sWarning = false;
    this.bossRef = null;

    this.l3ReplenishPending = false;
    this.l3ReplenishTimer = 0;
    this.l3NextBatch = 'RGB'; // 'RGB' or 'CYM'
  }

  start() {
    this.waves.level = 3;
    this.waves.phase = 1;
    this.waves.cleared = false;
    this.waves.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    this.game.colorChangingEnabled = true;
    this.seenInversionExplanation = false;
    this.seen15sWarning = false;
    this.l3ReplenishPending = false;
    this.l3ReplenishTimer = 0;
    this.l3NextBatch = 'RGB';

    if (this.game.showStopTutorial) {
      setTimeout(() => {
        this.game.showStopTutorial(
          'l3_boss_taunt',
          'THE BLACK BOSS: "PALE LITTLE INSECT..."',
          '<div style="color: #FF4D66; font-style: italic; font-size: 15px; border-left: 3px solid #A020F0; padding-left: 10px;">' +
          '&ldquo;Is this the so-called savior of the light? A pathetic, flickering candle wandering into my infinite abyss?<br><br>' +
          'You know nothing of true power, Fluke. Your colors are toys. I will devour your little photons and snuff out your soul like an insignificant ember!&rdquo;' +
          '</div>'
        );

        setTimeout(() => {
          this.initL3BossBattle();
        }, 300);
      }, 200);
    } else {
      this.initL3BossBattle();
    }
  }

  initL3BossBattle() {
    this.waves.phase = 1;
    this.game.ui.setObjective(
      "LEVEL 3 — THE BLACK BOSS SHOWDOWN",
      "Defeat the initial CYM triad, synthesize WHITE ammo, and strike the Black Boss!"
    );

    // Initial spawn: CYM trio
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

    // Noobi-Wan tactical briefing for Black Boss & White Bullet synthesis
    if (this.game.showStopTutorial) {
      setTimeout(() => {
        this.game.showStopTutorial(
          'l3_noobi_boss_guide',
          'MASTER NOOBI-WAN: HOW TO DEFEAT THE BLACK BOSS',
          'Do not let his dark words shake your spirit, Fluke! Here is how to conquer the Void:<br><br>' +
          '• <b>BLACK BOSS TAKES 3 HITS OF WHITE BULLETS:</b><br>' +
          'Normal enemies fall in 1 hit, but the Black Boss requires <b>3 hits of pure WHITE LASER</b>.<br><br>' +
          '• <b>HOW TO CREATE WHITE BULLETS:</b><br>' +
          'Shoot the <b>COMPLEMENTARY</b> color into an orb!<br>' +
          '&nbsp;&nbsp;&bull; Shoot <span class="noobi-hl red">RED laser</span> into a <span class="noobi-hl cyan">CYAN orb</span> (or Cyan into Red orb)<br>' +
          '&nbsp;&nbsp;&bull; Shoot <span class="noobi-hl green">GREEN laser</span> into a <span class="noobi-hl magenta">MAGENTA orb</span> (or Magenta into Green orb)<br>' +
          '&nbsp;&nbsp;&bull; Shoot <span class="noobi-hl blue">BLUE laser</span> into a <span class="noobi-hl yellow">YELLOW orb</span> (or Yellow into Blue orb)<br>' +
          'Complementary fusion generates <b>WHITE AMMO [7]</b> crystals!<br><br>' +
          '• <b>HOMING BLACK BULLETS & REALITY INVERSION:</b><br>' +
          'The Black Boss fires tracking void bullets (1.5s lifetime) and shifts reality — when inverted, he is <b>completely INVULNERABLE</b>!'
        );
      }, 400);
    }
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
    if (!this.seenInversionExplanation && this.game.showStopTutorial) {
      this.seenInversionExplanation = true;
      this.game.showStopTutorial(
        'l3_physics_inversion',
        'WARNING: REALITY DISTORTION ACTIVE!',
        'Fluke! Look out! The Black Boss shook reality and <b>CHANGED THE PHYSICS OF LIGHT</b> for the next 10 seconds!<br><br>' +
        '• <b>THE BLACK BOSS IS INVULNERABLE:</b><br>' +
        'While inverted, he is protected by a chromatic distortion barrier and cannot be harmed!<br><br>' +
        '• <b>WEAK IS STRONG & STRONG IS WEAK:</b><br>' +
        'Enemies now die to their <b>SAME COLOR</b>:<br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl cyan">CYAN</span> dies to <b>CYAN [4]</b>!<br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl red">RED</span> dies to <b>RED [1]</b>!<br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl green">GREEN</span> dies to <b>GREEN [2]</b>, <span class="noobi-hl blue">BLUE</span> dies to <b>BLUE [3]</b>, etc.<br><br>' +
        'Hold your ground until reality stabilizes!'
      );
    }
  }

  onBossHit(remainingHp) {
    if (remainingHp <= 0) return;

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

    if (remainingHp === 1 && !this.seen15sWarning && this.game.showStopTutorial) {
      this.seen15sWarning = true;
      this.game.showStopTutorial(
        'l3_boss_last_heart',
        'CRITICAL ALERT: FINAL HEART!',
        'The Black Boss is enraged! He only has <b>1 HEART REMAINING</b>!<br><br>' +
        'Wait for his reality distortion shield to drop, synthesize one final WHITE bullet, and defeat him!'
      );
    }
  }

  onEnemyDefeated(enemy) {
    // If boss dies, level 3 is cleared!
    if (enemy && enemy.isBoss) {
      this.waves.cleared = true;
      this.game.onLevelComplete(3);
      return;
    }

    this.waves.enemiesRemainingInPhase = Math.max(0, this.waves.enemiesRemainingInPhase - 1);

    // Check if all non-boss minions are dead
    const livingMinions = this.game.enemies.filter(e => e.alive && !e.isBoss);
    if (livingMinions.length === 0 && !this.l3ReplenishPending) {
      // Check what died: if the last dead was CMY -> schedule RGB in 3 sec; if RGB -> schedule CYM in 3 sec!
      const deadColor = enemy ? enemy.colorId : '';
      const isRGB = (deadColor === 'RED' || deadColor === 'GREEN' || deadColor === 'BLUE');
      const nextBatch = isRGB ? 'CYM' : 'RGB';
      this.scheduleL3Replenish(nextBatch);
    }
  }

  update(dt) {
    if (this.l3ReplenishPending) {
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
