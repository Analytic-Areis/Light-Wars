/**
 * Light-Wars: Level 2 Wave & Narrative Script Logic
 *
 * LEVEL 2 STORY & PROGRESSION:
 *
 * NOOBI-WAN CARDS:
 * Card 1: Gift 4 laser shots of each CMY (Cyan, Magenta, Yellow) to prepare for the level.
 * Card 2: Acknowledges skill killing CMY enemies, warns more dangerous threats are coming.
 * Card 3: 2 Red bots will come, kill them with Cyan [4] laser shot.
 * Card 4: 2 Green and 2 Blue bots will come, kill them with Magenta [5] and Yellow [6].
 *
 * (Colour Changing Unlocks)
 * Card 5: Explains colour changing of troops:
 *         - Bots of the same group (RGB or CMY) change colour when hit by a different colour laser of their own group!
 *         - e.g. Shooting Red bot with Green laser changes it into Yellow!
 *         - Shooting Red bot with Blue laser changes it into Magenta!
 * Card 6: Spawns 1 Red bot, asks Fluke to test colour changing by firing Green laser [2].
 *         Then spawns another Red bot, asks Fluke to shoot Blue laser [3].
 *         * FAILURE RECOVERY: If Fluke messes up (e.g. kills the practice Red with Cyan laser instead of transforming),
 *           inventory is restored and Card 5 / Card 6 trial repeats until successfully demonstrated!
 * Card 7: Same for CMY: 1 Cyan bot comes, asks Fluke to shoot Magenta [5].
 *         Then 1 Cyan bot comes, asks Fluke to shoot Yellow [6].
 *
 * (Dynamic Combat Practice Waves):
 * Phase 8: 1 Blue and 1 Green bot to practice colour changing & combat!
 * Phase 9: 1 Cyan and 1 Magenta bot to practice colour changing & combat!
 * Phase 10: 1 Cyan, 1 Magenta, 1 Red bot wave!
 * Phase 11: 1 Green, 1 Blue, 1 Yellow bot wave!
 * -> On defeat: Level 2 Cleared!
 */

class Level2Director {
  constructor(waveDirector) {
    this.waves = waveDirector;
    this.game = waveDirector.game;

    // State machine step
    this.step = 'INIT';
    // Sub-trial index for Card 6 & 7
    this.trialStep = 0;
    // Snapshot of player inventory for rollback if player messes up trial
    this.inventorySnapshot = null;
    // Track spawned trial enemy
    this.trialEnemy = null;
  }

  saveInventorySnapshot() {
    if (!this.game.player) return;
    this.inventorySnapshot = { ...this.game.player.ammo };
  }

  restoreInventorySnapshot() {
    if (!this.game.player || !this.inventorySnapshot) return;
    this.game.player.ammo = { ...this.inventorySnapshot };
    // Refill at least 2 shots of each test color so player cannot get softlocked
    this.game.player.ammo.RED = Math.max(this.game.player.ammo.RED || 0, 4);
    this.game.player.ammo.GREEN = Math.max(this.game.player.ammo.GREEN || 0, 4);
    this.game.player.ammo.BLUE = Math.max(this.game.player.ammo.BLUE || 0, 4);
    this.game.player.ammo.CYAN = Math.max(this.game.player.ammo.CYAN || 0, 4);
    this.game.player.ammo.MAGENTA = Math.max(this.game.player.ammo.MAGENTA || 0, 4);
    this.game.player.ammo.YELLOW = Math.max(this.game.player.ammo.YELLOW || 0, 4);
  }

  start() {
    this.waves.level = 2;
    this.waves.phase = 1;
    this.waves.cleared = false;
    this.waves.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    this.game.colorChangingEnabled = false; // Unlocks at Card 5!
    this.step = 'START_CARDS';

    // Gift Fluke 4 laser shots of each CMY (Cyan, Magenta, Yellow)
    if (this.game.player) {
      this.game.player.ammo.CYAN = 4;
      this.game.player.ammo.MAGENTA = 4;
      this.game.player.ammo.YELLOW = 4;
      this.game.player.ammo.RED = Math.max(this.game.player.ammo.RED, 6);
      this.game.player.ammo.GREEN = Math.max(this.game.player.ammo.GREEN, 6);
      this.game.player.ammo.BLUE = Math.max(this.game.player.ammo.BLUE, 6);
      this.game.player.ammo.WHITE = 0;
    }

    const startCards = [
      {
        id: 'l2_card1',
        tag: 'SPECIAL GIFT // 01',
        tracker: 'CARD 01 / 04',
        step: 1,
        totalSteps: 4,
        title: 'MASTER NOOBI-WAN: SPECIAL GIFT',
        message:
          'Welcome to Level 2, <b>Fluke</b>!<br>' +
          '<b>I GIFT YOU 4 LASER SHOTS OF EACH CMY</b>!<br>' +
          '• <span class="noobi-hl cyan">+4 CYAN [4]</span><br>' +
          '• <span class="noobi-hl magenta">+4 MAGENTA [5]</span><br>' +
          '• <span class="noobi-hl yellow">+4 YELLOW [6]</span>',
        btnText: 'CLAIM GIFT & CONTINUE ▶'
      },
      {
        id: 'l2_card2',
        tag: 'IMPERIAL THREAT // 02',
        tracker: 'CARD 02 / 04',
        step: 2,
        totalSteps: 4,
        title: 'THE PRIMARY LEGIONS AWAIT',
        message:
          'Now you know how to harvest and eliminate CMY enemies.<br><br>' +
          '<b>BUT THERE ARE MANY MORE TO BE KILLED!</b><br><br>' +
          'The Imperial vanguard has deployed true combat battalions. Stay alert and watch your ammo reserves!',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l2_card3',
        tag: 'TARGET ACQUIRED // 03',
        tracker: 'CARD 03 / 04',
        step: 3,
        totalSteps: 4,
        title: 'RED BOTS INCOMING!',
        message:
          '<b>RED BOTS WILL COME!</b><br><br>' +
          'You need to kill them with your new <b>CYAN LASER SHOTS [4]</b>!<br><br>' +
          '<div class="noobi-tip-box">💡 <b>REMEMBER:</b> Red is countered directly across the spectrum by Cyan light!</div>',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l2_card4',
        tag: 'BATTLE ALERT // 04',
        tracker: 'CARD 04 / 04',
        step: 4,
        totalSteps: 4,
        title: 'ENGAGE RED TROOPS!',
        message:
          'Prepare your blasters!<br><br>' +
          'Select <span class="noobi-hl cyan">CYAN LASER [4]</span> and wipe out the 2 incoming Red troops!',
        btnText: 'FIGHT RED TROOPS! ⚔️'
      }
    ];

    setTimeout(() => {
      this.game.showTutorialSequence(startCards, () => {
        this.spawnRedTroopsWave();
      });
    }, 200);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Card 3 & 4 Phase: 2 Red Troops -> then 2 Green & 2 Blue Troops
  // ═════════════════════════════════════════════════════════════════════════════

  spawnRedTroopsWave() {
    this.step = 'RED_TROOPS';
    this.waves.phase = 1;
    this.game.ui.setObjective(
      "LEVEL 2 — RED TROOPS INCOMING",
      "Eliminate the 2 RED troops with CYAN LASER [4]!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "2 RED TROOPS!", "#FF2A4D");
    }

    this.waves.spawnAt(11, 7, 'RED');
    this.waves.spawnAt(14, 11, 'RED');
    this.waves.enemiesRemainingInPhase = 2;
  }

  spawnGreenBlueTroopsWave() {
    this.step = 'GREEN_BLUE_TROOPS';
    this.waves.phase = 2;
    this.game.ui.setObjective(
      "LEVEL 2 — GREENS & BLUES INCOMING",
      "Defeat 2 Greens (with Magenta [5]) and 2 Blues (with Yellow [6])!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "GREENS & BLUES!", "#22E058");
    }

    this.waves.spawnAt(9, 13, 'GREEN');
    this.waves.spawnAt(14, 7, 'GREEN');
    this.waves.spawnAt(14, 13, 'BLUE');
    this.waves.spawnAt(9, 11, 'BLUE');
    this.waves.enemiesRemainingInPhase = 4;
  }

  showGreenBlueIntroCards() {
    // Top up Magenta and Yellow so the player always has enough to kill
    // the 2 Green (needs Magenta) and 2 Blue (needs Yellow) troops,
    // even if they spent all their gifted CMY ammo on the Red wave.
    if (this.game.player) {
      this.game.player.ammo.MAGENTA = Math.max(this.game.player.ammo.MAGENTA || 0, 4);
      this.game.player.ammo.YELLOW  = Math.max(this.game.player.ammo.YELLOW  || 0, 4);
      this.game.player.ammo.CYAN    = Math.max(this.game.player.ammo.CYAN    || 0, 2);
    }

    const cards = [
      {
        id: 'l2_card_gb',
        tag: 'WAVE 2 // GREENS & BLUES',
        tracker: 'BRIEFING',
        step: 1,
        totalSteps: 1,
        title: 'GREENS AND BLUES INCOMING!',
        message:
          'Great shooting on the Red scouts!<br><br>' +
          'Now <b>2 GREEN AND 2 BLUE BOTS WILL COME — KILL THEM</b>!<br><br>' +
          '• Destroy <span class="noobi-hl green">GREEN BOTS</span> with <span class="noobi-hl magenta">MAGENTA LASER [5]</span><br>' +
          '• Destroy <span class="noobi-hl blue">BLUE BOTS</span> with <span class="noobi-hl yellow">YELLOW LASER [6]</span><br><br>' +
          '<div class="noobi-tip-box">💡 <b>AMMO REFILL:</b> You\'ve been topped up with <span class="noobi-hl magenta">+MAGENTA [5]</span> and <span class="noobi-hl yellow">+YELLOW [6]</span> to get you through this wave!</div>',
        btnText: 'FIGHT GREENS & BLUES! ⚔️'
      }
    ];

    setTimeout(() => {
      this.game.showTutorialSequence(cards, () => {
        this.spawnGreenBlueTroopsWave();
      });
    }, 400);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Card 5 & 6 Phase: Colour Changing Unlocks & Red Trials (Green & Blue tests)
  // ═════════════════════════════════════════════════════════════════════════════

  showCard5ColourChangingUnlock() {
    this.step = 'CARD_5_EXPLANATION';
    this.game.colorChangingEnabled = true;
    this.saveInventorySnapshot();

    const card5 = [
      {
        id: 'l2_card5',
        tag: 'DISCOVERY // 05',
        tracker: 'CARD 05 / 07',
        step: 5,
        totalSteps: 7,
        title: 'COLOR CHANGING OF TROOPS UNLOCKED!',
        message:
          '<b>TROOPS CHANGE COLOR WHEN HIT BY LASERS OF SAME GROUP!</b><br>' +
          '• <b>RGB:</b> Red struck by Green becomes <b>YELLOW</b>! Struck by Blue &rarr; <b>MAGENTA</b>!<br>' +
          '• <b>CMY:</b> Cyan struck by Magenta becomes <b>BLUE</b>! Struck by Yellow &rarr; <b>GREEN</b>!',
        btnText: 'CONTINUE TO PRACTICE ▶'
      },
      {
        id: 'l2_card6_intro',
        tag: 'TRAINING DRILL // 06',
        tracker: 'CARD 06 / 07',
        step: 6,
        totalSteps: 7,
        title: 'DRILL: TRANSFORM RED WITH GREEN!',
        message:
          'Let us put this theory to the test right now!<br>' +
          '<b>ONE RED BOT WILL COME</b>.<br>' +
          'Test color changing by <b>FIRING GREEN LASER [2]</b> at him!<br>' +
          '<div class="noobi-tip-box">⚠️ <b>DO NOT KILL WITH CYAN!</b> Shoot him with <b>GREEN [2]</b> to turn him Yellow!</div>',
        btnText: 'SPAWN TEST RED BOT 🎯'
      }
    ];

    setTimeout(() => {
      this.game.showTutorialSequence(card5, () => {
        this.startRedTrialStep1();
      });
    }, 500);
  }

  startRedTrialStep1() {
    this.step = 'RED_TRIAL_GREEN';
    this.saveInventorySnapshot();
    this.clearEnemies();

    this.game.ui.setObjective(
      "TEST 1/2 — SHOOT RED WITH GREEN [2]",
      "Shoot the Red bot with GREEN laser [2] to transform him into Yellow!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "SHOOT GREEN [2]!", "#22E058");
    }

    this.trialEnemy = this.waves.spawnAt(12, 9, 'RED');
    this.waves.enemiesRemainingInPhase = 1;
  }

  startRedTrialStep2() {
    this.step = 'RED_TRIAL_BLUE';
    this.saveInventorySnapshot();
    this.clearEnemies();

    this.game.ui.setObjective(
      "TEST 2/2 — SHOOT RED WITH BLUE [3]",
      "Shoot the Red bot with BLUE laser [3] to transform him into Magenta!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "SHOOT BLUE [3]!", "#2A85FF");
    }

    if (this.game.showStopTutorial) {
      this.game.showStopTutorial(
        'l2_red_step2_notice',
        'STEP 2: TRANSFORM RED WITH BLUE!',
        'Splendid! The Red bot transformed into Yellow!<br><br>' +
        'Now another Red bot is arriving. <b>SHOOT BLUE LASER [3]</b> to watch him transform into <b>MAGENTA</b>!',
        {
          repeatable: true,
          btnText: 'ENGAGE WITH BLUE [3] ▶',
          onDismiss: () => {
            this.trialEnemy = this.waves.spawnAt(12, 9, 'RED');
            this.waves.enemiesRemainingInPhase = 1;
          }
        }
      );
    } else {
      this.trialEnemy = this.waves.spawnAt(12, 9, 'RED');
      this.waves.enemiesRemainingInPhase = 1;
    }
  }

  handleRedTrialFailure() {
    // If player messed up by killing Red directly instead of transforming
    this.restoreInventorySnapshot();
    this.clearEnemies();

    if (this.game.showStopTutorial) {
      this.game.showStopTutorial(
        'l2_red_trial_retry',
        'DRILL MISSTEP: DO NOT KILL WITH CYAN!',
        'Hold your fire, Fluke! You eliminated the test subject with Cyan instead of transforming him!<br><br>' +
        'Remember: we are testing <b>COLOR CHANGING</b>.<br>' +
        '• Shoot Red bot with <b>GREEN LASER [2]</b> (transforms to Yellow)<br>' +
        '• Shoot Red bot with <b>BLUE LASER [3]</b> (transforms to Magenta)<br><br>' +
        'Your inventory has been replenished. Try again!',
        {
          repeatable: true,
          btnText: 'RETRY COLOR DRILL 🔁',
          onDismiss: () => {
            this.startRedTrialStep1();
          }
        }
      );
    } else {
      this.startRedTrialStep1();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Card 7 Phase: CMY Color Changing (Cyan with Magenta & Yellow)
  // ═════════════════════════════════════════════════════════════════════════════

  showCard7CMYTrials() {
    this.step = 'CARD_7_EXPLANATION';
    this.saveInventorySnapshot();

    const card7 = [
      {
        id: 'l2_card7',
        tag: 'TRAINING DRILL // 07',
        tracker: 'CARD 07 / 07',
        step: 7,
        totalSteps: 7,
        title: 'DRILL: TRANSFORM CYAN TROOPS!',
        message:
          '<b>CYAN BOTS ALSO TRANSFORM</b>:<br>' +
          '• Cyan + <span class="noobi-hl magenta">MAGENTA [5]</span> &rarr; <b>BLUE</b>!<br>' +
          '• Cyan + <span class="noobi-hl yellow">YELLOW [6]</span> &rarr; <b>GREEN</b>!<br><br>' +
          '<b>SHOOT MAGENTA [5]</b> at the incoming Cyan bot!',
        btnText: 'SPAWN TEST CYAN BOT 🎯'
      }
    ];

    setTimeout(() => {
      this.game.showTutorialSequence(card7, () => {
        this.startCyanTrialStep1();
      });
    }, 400);
  }

  startCyanTrialStep1() {
    this.step = 'CYAN_TRIAL_MAGENTA';
    this.saveInventorySnapshot();
    this.clearEnemies();

    this.game.ui.setObjective(
      "CYAN TEST 1/2 — SHOOT CYAN WITH MAGENTA [5]",
      "Shoot the Cyan bot with MAGENTA laser [5] to transform him into Blue!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "SHOOT MAGENTA [5]!", "#FF2AD4");
    }

    this.trialEnemy = this.waves.spawnAt(12, 9, 'CYAN');
    this.waves.enemiesRemainingInPhase = 1;
  }

  startCyanTrialStep2() {
    this.step = 'CYAN_TRIAL_YELLOW';
    this.saveInventorySnapshot();
    this.clearEnemies();

    this.game.ui.setObjective(
      "CYAN TEST 2/2 — SHOOT CYAN WITH YELLOW [6]",
      "Shoot the Cyan bot with YELLOW laser [6] to transform him into Green!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "SHOOT YELLOW [6]!", "#FFE600");
    }

    if (this.game.showStopTutorial) {
      this.game.showStopTutorial(
        'l2_cyan_step2_notice',
        'STEP 2: TRANSFORM CYAN WITH YELLOW!',
        'Perfect! The Cyan bot transformed into Blue!<br><br>' +
        'Now another Cyan bot is coming. <b>SHOOT YELLOW LASER [6]</b> to watch him transform into <b>GREEN</b>!',
        {
          repeatable: true,
          btnText: 'ENGAGE WITH YELLOW [6] ▶',
          onDismiss: () => {
            this.trialEnemy = this.waves.spawnAt(12, 9, 'CYAN');
            this.waves.enemiesRemainingInPhase = 1;
          }
        }
      );
    } else {
      this.trialEnemy = this.waves.spawnAt(12, 9, 'CYAN');
      this.waves.enemiesRemainingInPhase = 1;
    }
  }

  handleCyanTrialFailure() {
    this.restoreInventorySnapshot();
    this.clearEnemies();

    if (this.game.showStopTutorial) {
      this.game.showStopTutorial(
        'l2_cyan_trial_retry',
        'DRILL MISSTEP: DO NOT KILL CYAN WITH RED!',
        'Hold on, Fluke! You killed the Cyan subject with Red instead of transforming him!<br><br>' +
        'Test the transformation:<br>' +
        '• Shoot Cyan with <b>MAGENTA LASER [5]</b> (transforms into Blue)<br>' +
        '• Shoot Cyan with <b>YELLOW LASER [6]</b> (transforms into Green)<br><br>' +
        'Your inventory has been restored. Try again!',
        {
          repeatable: true,
          btnText: 'RETRY CYAN DRILL 🔁',
          onDismiss: () => {
            this.startCyanTrialStep1();
          }
        }
      );
    } else {
      this.startCyanTrialStep1();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Practice & Final Waves
  // ═════════════════════════════════════════════════════════════════════════════

  startFinalWave_RGB() {
    this.step = 'FINAL_WAVE_RGB';
    this.clearEnemies();
    this.game.ui.setObjective(
      "FINAL ASSAULT: RED, GREEN, BLUE",
      "Eliminate the final RGB squad to clear Level 2!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "RGB SQUAD INCOMING!", "#FFFFFF");
    }

    this.waves.spawnAt(9, 7, 'RED');
    this.waves.spawnAt(14, 7, 'GREEN');
    this.waves.spawnAt(12, 12, 'BLUE');
    this.waves.enemiesRemainingInPhase = 3;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Event Handlers (Transforms & Defeats)
  // ═════════════════════════════════════════════════════════════════════════════

  onEnemyTransform(enemy, prevColor, newColor, laserColor) {
    if (this.step === 'RED_TRIAL_GREEN' && prevColor === 'RED' && newColor === 'YELLOW') {
      if (this.game.particles) {
        this.game.particles.spawnComicText(enemy.x, enemy.y - 90, "SUCCESS: RED ➔ YELLOW!", "#FFE600");
      }
      // Successfully demonstrated Green into Red -> finish enemy and advance to step 2
      setTimeout(() => {
        enemy.alive = false;
        this.waves.enemiesRemainingInPhase = 0;
        this.startRedTrialStep2();
      }, 700);
    } else if (this.step === 'RED_TRIAL_BLUE' && prevColor === 'RED' && newColor === 'MAGENTA') {
      if (this.game.particles) {
        this.game.particles.spawnComicText(enemy.x, enemy.y - 90, "SUCCESS: RED ➔ MAGENTA!", "#FF2AD4");
      }
      // Successfully demonstrated Blue into Red -> advance to Card 7
      setTimeout(() => {
        enemy.alive = false;
        this.waves.enemiesRemainingInPhase = 0;
        this.showCard7CMYTrials();
      }, 700);
    } else if (this.step === 'CYAN_TRIAL_MAGENTA' && prevColor === 'CYAN' && newColor === 'BLUE') {
      if (this.game.particles) {
        this.game.particles.spawnComicText(enemy.x, enemy.y - 90, "SUCCESS: CYAN ➔ BLUE!", "#0055FF");
      }
      // Successfully demonstrated Magenta into Cyan -> advance to Cyan step 2
      setTimeout(() => {
        enemy.alive = false;
        this.waves.enemiesRemainingInPhase = 0;
        this.startCyanTrialStep2();
      }, 700);
    } else if (this.step === 'CYAN_TRIAL_YELLOW' && prevColor === 'CYAN' && newColor === 'GREEN') {
      if (this.game.particles) {
        this.game.particles.spawnComicText(enemy.x, enemy.y - 90, "SUCCESS: CYAN ➔ GREEN!", "#22E058");
      }
      // Successfully demonstrated Yellow into Cyan -> advance to practice waves!
      setTimeout(() => {
        enemy.alive = false;
        this.waves.enemiesRemainingInPhase = 0;
        this.startFinalWave_RGB();
      }, 700);
    }
  }

  onEnemyDefeated(enemy, laserColor) {
    // If in Red trial and player killed the Red bot without transforming
    if (this.step === 'RED_TRIAL_GREEN' || this.step === 'RED_TRIAL_BLUE') {
      this.handleRedTrialFailure();
      return;
    }

    // If in Cyan trial and player killed Cyan bot without transforming
    if (this.step === 'CYAN_TRIAL_MAGENTA' || this.step === 'CYAN_TRIAL_YELLOW') {
      this.handleCyanTrialFailure();
      return;
    }

    this.waves.enemiesRemainingInPhase = Math.max(0, this.waves.enemiesRemainingInPhase - 1);

    if (this.waves.enemiesRemainingInPhase === 0) {
      if (this.step === 'RED_TROOPS') {
        // Red troops eliminated -> show Green and Blue intro
        setTimeout(() => this.showGreenBlueIntroCards(), 600);
      } else if (this.step === 'GREEN_BLUE_TROOPS') {
        // Green and Blue troops eliminated -> Card 5 Color Changing Unlocks!
        setTimeout(() => this.showCard5ColourChangingUnlock(), 700);
      } else if (this.step === 'FINAL_WAVE_RGB') {
        // Level 2 Complete!
        this.waves.cleared = true;
        this.game.onLevelComplete(2);
      }
    }
  }

  clearEnemies() {
    for (const e of this.game.enemies) {
      e.alive = false;
    }
    this.game.enemies = [];
    this.waves.enemiesRemainingInPhase = 0;
  }

  update(dt) {
    // Frame hook
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Level2Director = Level2Director;
