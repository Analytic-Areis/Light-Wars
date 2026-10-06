/**
 * Light-Wars: Wave Director with Levels 1, 2, and 3 Scripts & Narrative Progression
 *
 * LEVEL 1:
 *   - Exactly 6 enemies: 2 Cyan, 2 Magenta, 2 Yellow.
 *   - After killing all 6, Master Noobi-Wan explains how to craft different color bullets
 *     and how to destroy the Black Barrel by firing one bullet of each type (Red, Green, Blue, Cyan, Magenta, Yellow).
 *   - Spawns the Black Barrel. Player crafts remaining bullets by shooting orbs.
 *   - Shooting 1 of each of the 6 colors destroys the barrel and unlocks the Dash ability!
 *
 * LEVEL 2:
 *   - At start, Master Noobi-Wan explains how to use Dash ([SPACE] or [Right Mouse Button]).
 *   - Phase 1: 3 CMY enemies spawn together (1 Cyan, 1 Magenta, 1 Yellow).
 *   - Phase 2: After defeating them, 3 RGB enemies spawn (1 Red, 1 Green, 1 Blue).
 *     Noobi-Wan explains why CMY are easier to beat (enemies follow CMY colors whereas we follow RGB which counters them),
 *     while RGB enemies stole our technology and are as strong as us, and explains how to counter them (Cyan kills Red, Magenta kills Green, Yellow kills Blue).
 *   - After defeating them, Level 2 completes.
 *
 * LEVEL 3:
 *   - The Black Boss encounter!
 *   - Black Boss speaks demeaning words to Luke.
 *   - Boss spawns with minions of all 6 colors (Cyan, Yellow, Magenta, Red, Green, Blue).
 *   - Noobi-Wan explains how to defeat the Black Boss: normal enemies take 1 hit, but Black Boss takes 3 hits of WHITE bullets!
 *     White bullets are synthesized by shooting a complementary wavelength into an orb (e.g. Red into Cyan orb, or Cyan into Red orb, etc.).
 *     Also warns about the boss's homing black bullets and how to dodge them with skill, range, and dash!
 *   - MECHANIC: Reality Distortion / Light Physics Inversion!
 *     Boss shakes left/right at high speed for 1s, then inverts light physics for 10s (weak becomes strong, strong becomes weak: e.g. Cyan now needs Cyan instead of Red).
 *     Noobi-Wan explains this the first time it happens, and warns that it will trigger periodically every 30s after losing 1 heart.
 *     When Boss loses another heart (down to 1 HP), Noobi-Wan warns the frequency has increased to every 15s!
 */

class WaveDirector {
  constructor(game) {
    this.game = game;
    this.level = 1;
    this.phase = 1;
    this.cleared = false;
    this.enemiesRemainingInPhase = 0;
    this.stats = {
      enemiesKilled: 0,
      orbsCrafted: 0,
      shotsFired: 0
    };

    // Tracking for tutorials and boss states
    this.seenInversionExplanation = false;
    this.seen15sWarning = false;
    this.bossRef = null;

    // Level 1: 2-2-2 sequential CYM spawn state
    this.l1Subwave = 'CYAN'; // 'CYAN' -> 'YELLOW' -> 'MAGENTA' -> done

    // Level 2: R+M -> B+C -> G+Y progression state
    this.l2PairStep = 0; // 0: R+M, 1: B+C, 2: G+Y

    // Level 3: Replenish cycle & 3-second gap timer
    this.l3ReplenishPending = false;
    this.l3ReplenishTimer = 0;
    this.l3NextBatch = 'RGB'; // 'RGB' or 'CYM'
  }

  spawnAt(col, row, colorId) {
    if (this.game.arena && this.game.arena.toScreen) {
      const pos = this.game.arena.toScreen(col + 0.5, row + 0.5);
      return this.game.spawnEnemy(pos.x, pos.y, colorId);
    } else {
      return this.game.spawnEnemy(col, row, colorId);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // LEVEL 1: Master Noobi-Wan 10-Card Interactive Tutorial & CMY Infiltration
  // ═════════════════════════════════════════════════════════════════════════════

  startLevel1() {
    this.level = 1;
    this.phase = 1;
    this.cleared = false;
    this.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    this.game.colorChangingEnabled = false;
    this.l1Subwave = 'CYAN';

    this.game.ui.setObjective(
      "LEVEL 1 — CMY INFILTRATION",
      "Eliminate the 2 CYAN troops with RED [1]!"
    );

    // Initial 6 Tutorial Cards from Master Noobi-Wan
    const startCards = [
      {
        id: 'l1_card1',
        tag: 'TRANSMISSION // 01',
        tracker: 'CARD 01 / 06',
        step: 1,
        totalSteps: 6,
        title: 'HI FLUKE! THE BLACK BOSS AWAITS',
        message:
          'Greetings, <b>Fluke</b>! Master <b>NOOBI-WAN</b> contacting you across the stars.<br><br>' +
          'Listen closely: your ultimate mission is to infiltrate the Imperial flagship and <b>kill the Black Boss in the space ship</b>!<br>' +
          'He rules from the dark void, devouring all visible light in the galaxy. Only you can ignite the stars once more!',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l1_card2',
        tag: 'TUTORIAL // 02',
        tracker: 'CARD 02 / 06',
        step: 2,
        totalSteps: 6,
        title: "NOOBI-WAN'S TRAINING GROUNDS",
        message:
          '<b>This level is the tutorial for you!</b> Before you face the deep void, I will give you a tutorial on the ancient laws of chromatic warfare.<br><br>' +
          'Take a breath, steady your blasters, and follow my guidance step by step!',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l1_card3',
        tag: 'LIGHT CURSE // 03',
        tracker: 'CARD 03 / 06',
        step: 3,
        totalSteps: 6,
        title: 'THE CURSE OF THE LIGHT',
        message:
          'All imperial combatants are bound by <b>THE LIGHT CURSE</b>!<br><br>' +
          'The curse shields them against ordinary attacks: <b>ENEMIES ONLY DIE TO THEIR CONTRARY (COMPLEMENTARY) COLOUR</b>!<br><br>' +
          '• <span class="noobi-hl cyan">CYAN TROOPS</span> &rarr; Die ONLY to <span class="noobi-hl red">RED LASER [1]</span><br>' +
          '• <span class="noobi-hl magenta">MAGENTA TROOPS</span> &rarr; Die ONLY to <span class="noobi-hl green">GREEN LASER [2]</span><br>' +
          '• <span class="noobi-hl yellow">YELLOW TROOPS</span> &rarr; Die ONLY to <span class="noobi-hl blue">BLUE LASER [3]</span><br><br>' +
          'Shooting them with matching or non-contrary colors deals no damage!',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l1_card4',
        tag: 'CONTRARY ESSENCE // 04',
        tracker: 'CARD 04 / 06',
        step: 4,
        totalSteps: 6,
        title: 'CONTRARY ESSENCE & ORBS',
        message:
          'Because of this curse, <b>aspects of that contrary colour are trapped within them</b>!<br><br>' +
          'When you destroy an enemy, that contrary essence destabilizes and is <b>DROPPED INTO ORBS</b> on the deck:<br><br>' +
          '• Eliminating <span class="noobi-hl cyan">Cyan</span> drops a <span class="noobi-hl red">RED ORB</span><br>' +
          '• Eliminating <span class="noobi-hl magenta">Magenta</span> drops a <span class="noobi-hl green">GREEN ORB</span><br>' +
          '• Eliminating <span class="noobi-hl yellow">Yellow</span> drops a <span class="noobi-hl blue">BLUE ORB</span><br><br>' +
          'These orbs hold the secret to forging secondary ammunition!',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l1_card5',
        tag: 'SANCTUARY // 05',
        tracker: 'CARD 05 / 06',
        step: 5,
        totalSteps: 6,
        title: 'SPAWN POINT REFILL & HEAL',
        message:
          'Remember this survival rule, Fluke: <b>when you are at the spawn point, your RGB shots will refill and heal</b>!<br><br>' +
          'The glowing <b>White Sanctuary</b> in the center chamber radiates pure restorative light. Step onto it anytime to reload your Red, Green, and Blue blasters and mend your health hearts!',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l1_card6',
        tag: 'FIRST STRIKE // 06',
        tracker: 'CARD 06 / 06',
        step: 6,
        totalSteps: 6,
        title: '2 CYAN TROOPS INCOMING!',
        message:
          'Battle begins now, Fluke! <b>2 Cyan troops are going to come</b> right now into the corridor! Select your <span class="noobi-hl red">RED LASER [1]</span> and kill them!<br><br>' +
          '<div class="noobi-tip-box">💡 <b>TIP:</b> Every bot contains some visible essence of their contrary colour on them — watch for the red energy core glowing on their chest and armor!</div>',
        btnText: 'FIGHT CYAN TROOPS! ⚔️'
      }
    ];

    // Spawn the 2 Cyan enemies (strictly on clear open floor away from boundaries)
    this.spawnAt(16, 6, 'CYAN');
    this.spawnAt(10, 8, 'CYAN');
    this.enemiesRemainingInPhase = 2;

    if (this.game.showTutorialSequence) {
      setTimeout(() => {
        this.game.showTutorialSequence(startCards);
      }, 150);
    }
  }

  showL1Card7() {
    const card7 = [
      {
        id: 'l1_card7',
        tag: 'REINFORCEMENTS // 07',
        tracker: 'CARD 07 / 10',
        step: 7,
        totalSteps: 10,
        title: 'REPEAT FOR MAGENTA & YELLOW!',
        message:
          'Outstanding shooting, Fluke! The 2 Cyan scouts are eliminated, leaving 2 Red orbs on the deck.<br><br>' +
          'Now <b>REPEAT THE SAME FOR MAGENTA AND YELLOW</b>!<br><br>' +
          '• Destroy <span class="noobi-hl magenta">MAGENTA TROOPS</span> with <span class="noobi-hl green">GREEN LASER [2]</span> (notice their glowing green essence!)<br>' +
          '• Destroy <span class="noobi-hl yellow">YELLOW TROOPS</span> with <span class="noobi-hl blue">BLUE LASER [3]</span> (notice their glowing blue essence!)<br><br>' +
          'Eliminate them to harvest their Green and Blue energy orbs!',
        btnText: 'FIGHT REINFORCEMENTS! ⚔️',
        onDismiss: () => {
          this.spawnL1MagentaYellowWave();
        }
      }
    ];

    setTimeout(() => {
      this.game.showTutorialSequence(card7, () => {
        this.spawnL1MagentaYellowWave();
      });
    }, 600);
  }

  spawnL1MagentaYellowWave() {
    if (this.l1Subwave === 'MAGENTA_YELLOW') return; // Guard against duplicate calls
    this.l1Subwave = 'MAGENTA_YELLOW';
    this.game.ui.setObjective(
      "LEVEL 1 — MAGENTA & YELLOW INCOMING",
      "Defeat Magenta with Green [2], and Yellow with Blue [3]!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "REINFORCEMENTS!", "#FF2AD4");
    }

    // Spawn 2 Yellow and 2 Magenta troops on clear open floor
    this.spawnAt(9, 12, 'YELLOW');
    this.spawnAt(13, 7, 'YELLOW');
    this.spawnAt(13, 11, 'MAGENTA');
    this.spawnAt(11, 8, 'MAGENTA');
    this.enemiesRemainingInPhase = 4;
  }

  showL1Cards8to10() {
    const finalCards = [
      {
        id: 'l1_card8',
        tag: 'SPECTRUM FUSION // 08',
        tracker: 'CARD 08 / 10',
        step: 8,
        totalSteps: 10,
        title: 'ALL ORB COMBINATIONS OF RGB',
        message:
          'Superb combat, Fluke! All imperial scouts are eliminated, leaving <b>RED, GREEN, and BLUE ORBS</b> across the deck!<br><br>' +
          'Firing your RGB lasers into contrary orbs triggers additive light fusion:<br>' +
          '<div class="noobi-combos-grid">' +
            '<div class="combo-row">🔴 <b>Red Laser</b> + 🟢 <b>Green Orb</b> &rarr; <span class="noobi-hl yellow">🟡 YELLOW AMMO [6]</span></div>' +
            '<div class="combo-row">🔵 <b>Blue Laser</b> + 🟢 <b>Green Orb</b> &rarr; <span class="noobi-hl cyan">💠 CYAN AMMO [4]</span></div>' +
            '<div class="combo-row">🔵 <b>Blue Laser</b> + 🔴 <b>Red Orb</b> &rarr; <span class="noobi-hl magenta">💖 MAGENTA AMMO [5]</span></div>' +
          '</div>' +
          '<div class="noobi-tip-box">💡 Additive symmetry: Green laser into Red orb also yields Yellow!</div>',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l1_card9',
        tag: 'CMY ARSENAL // 09',
        tracker: 'CARD 09 / 10',
        step: 9,
        totalSteps: 10,
        title: 'PICK UP BULLETS & USE CMY NOW!',
        message:
          'When you shoot an orb with a fusing laser, it shatters into ammo crystals.<br><br>' +
          '<b>PICK THOSE BULLETS AND YOU CAN USE CMY BULLETS NOW</b>!<br><br>' +
          '• Press <span class="noobi-key">[4]</span> for <span class="noobi-hl cyan">CYAN LASER</span><br>' +
          '• Press <span class="noobi-key">[5]</span> for <span class="noobi-hl magenta">MAGENTA LASER</span><br>' +
          '• Press <span class="noobi-key">[6]</span> for <span class="noobi-hl yellow">YELLOW LASER</span><br><br>' +
          'Collect the dropped crystals to equip all six wavelengths of the light spectrum!',
        btnText: 'CONTINUE NOOBI-WAN ▶'
      },
      {
        id: 'l1_card10',
        tag: 'SECRET SURPRISE // 10',
        tracker: 'CARD 10 / 10',
        step: 10,
        totalSteps: 10,
        title: 'HIT THE BLACK ORB TO UNLOCK REWARD!',
        message:
          'Look ahead! A mysterious radiant <b>BLACK ORB</b> has materialized in the chamber!<br><br>' +
          '<b>STRIKE THE BLACK ORB WITH ALL 6 COLOURS TO UNLOCK YOUR REWARD!</b><br><br>' +
          'Fire <b>one bullet of each of the 6 colors</b> into it:<br>' +
          '<div class="noobi-color-pips-preview">' +
            '<span style="color:#FF2A4D;">● RED [1]</span>' +
            '<span style="color:#22E058;">● GREEN [2]</span>' +
            '<span style="color:#2A85FF;">● BLUE [3]</span>' +
            '<span style="color:#00F0FF;">● CYAN [4]</span>' +
            '<span style="color:#FF2AD4;">● MAGENTA [5]</span>' +
            '<span style="color:#FFE600;">● YELLOW [6]</span>' +
          '</div>' +
          'Watch the 6 illuminated color pips above the black orb light up. Strike it with all 6 colors to claim your secret surprise power!',
        btnText: 'UNLOCK THE SURPRISE! 🎁',
        onDismiss: () => {
          this.spawnBlackBarrelChallenge();
        }
      }
    ];

    setTimeout(() => {
      this.game.showTutorialSequence(finalCards, () => {
        this.spawnBlackBarrelChallenge();
      });
    }, 600);
  }

  spawnBlackBarrelChallenge() {
    if (this.phase === 'BLACK_BARREL') return;
    this.phase = 'BLACK_BARREL';
    this.game.ui.setObjective(
      "SPECIAL OBJECTIVE — STRIKE THE BLACK ORB!",
      "Synthesize all 6 colors and hit the Black Orb with all colors to unlock the surprise!"
    );

    const barrelPos = (this.game.arena && this.game.arena.toScreen)
      ? this.game.arena.toScreen(10.5, 8.5)
      : { x: 2688, y: 1400 };

    const blackBarrel = new window.LightWars.BlackBarrel(barrelPos.x, barrelPos.y);
    this.game.barrels.push(blackBarrel);

    if (this.game.particles) {
      this.game.particles.spawnComicText(barrelPos.x, barrelPos.y - 60, "BLACK ORB SPAWNED!", "#FFE600");
    }
  }

  onBlackBarrelDestroyed() {
    this.cleared = true;
    if (this.game.unlockHelpCapability) {
      this.game.unlockHelpCapability('dash');
    }
    if (this.game.showStopTutorial) {
      this.game.showStopTutorial(
        'l1_dash_unlocked',
        'SURPRISE UNLOCKED: DASH ABILITY!',
        'SPLENDID WORK, FLUKE! The Black Orb has released its contained power: <b>THE DASH ABILITY</b>!<br><br>' +
        '• Press <span class="noobi-key">[SPACE]</span> or <span class="noobi-key">[RMB]</span> to warp through danger at high speed!<br><br>' +
        'You have mastered the foundations of the chromatic spectrum. Prepare yourself—the war escalates!',
        {
          badge: '⚡ ABILITY UNLOCKED',
          btnText: 'COMPLETE LEVEL 1! 🏆'
        }
      );
    }
    setTimeout(() => {
      this.game.onLevelComplete(1);
    }, 1800);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // LEVEL 2: Complement Pairs Progression (Red+Magenta -> Blue+Cyan -> Green+Yellow)
  // ═════════════════════════════════════════════════════════════════════════════

  startLevel2() {
    this.level = 2;
    this.phase = 1;
    this.cleared = false;
    this.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    this.game.colorChangingEnabled = true;
    this.l2PairStep = 0;

    // Start with Noobi-Wan explaining Dash & Complementary pairings
    if (this.game.showStopTutorial) {
      setTimeout(() => {
        this.game.showStopTutorial(
          'l2_dash_explanation',
          'MASTER NOOBI-WAN: COMPLEMENTARY PAIRS & DASH',
          'Welcome to Level 2, Fluke!<br><br>' +
          '• <b>USING YOUR NEW DASH:</b><br>' +
          'Press <span class="noobi-key">[SPACE]</span> or <span class="noobi-key">[RIGHT MOUSE BUTTON]</span> to execute a high-speed dash!<br><br>' +
          '• <b>DUAL ENEMY BATTLES:</b><br>' +
          'Enemies are attacking in pairs! First wave: <span class="noobi-hl red">RED</span> and <span class="noobi-hl magenta">MAGENTA</span>!<br>' +
          'Eliminate Red with Cyan ammo [4] and Magenta with Green laser [2]!'
        );
      }, 200);
    }

    this.spawnL2Pair1();
  }

  spawnL2Pair1() {
    this.l2PairStep = 0;
    this.game.ui.setObjective(
      "LEVEL 2 — PAIR 1: RED & MAGENTA",
      "Defeat Red (with Cyan [4]) and Magenta (with Green [2])!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "RED + MAGENTA INCOMING!", "#FF2A4D");
    }

    this.spawnAt(11, 7, 'RED');
    this.spawnAt(14, 11, 'MAGENTA');
    this.enemiesRemainingInPhase = 2;
  }

  spawnL2Pair2() {
    this.l2PairStep = 1;
    this.game.ui.setObjective(
      "LEVEL 2 — PAIR 2: BLUE & CYAN",
      "Defeat Blue (with Yellow [6]) and Cyan (with Red [1])!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "BLUE + CYAN INCOMING!", "#0055FF");
    }

    this.spawnAt(14, 13, 'BLUE');
    this.spawnAt(9, 11, 'CYAN');
    this.enemiesRemainingInPhase = 2;
  }

  spawnL2Pair3() {
    this.l2PairStep = 2;
    this.game.ui.setObjective(
      "LEVEL 2 — PAIR 3: GREEN & YELLOW",
      "Defeat Green (with Magenta [5]) and Yellow (with Blue [3])!"
    );

    if (this.game.particles) {
      this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "GREEN + YELLOW INCOMING!", "#00FF66");
    }

    this.spawnAt(9, 13, 'GREEN');
    this.spawnAt(14, 7, 'YELLOW');
    this.enemiesRemainingInPhase = 2;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // LEVEL 3: The Black Boss & Alternating 3-Minion Waves (CYM <-> RGB)
  // ═════════════════════════════════════════════════════════════════════════════

  startLevel3() {
    this.level = 3;
    this.phase = 1;
    this.cleared = false;
    this.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
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
    this.phase = 1;
    this.game.ui.setObjective(
      "LEVEL 3 — THE BLACK BOSS SHOWDOWN",
      "Defeat the initial CYM triad, synthesize WHITE ammo, and strike the Black Boss!"
    );

    // Initial spawn: CYM trio
    this.spawnAt(8, 6, 'CYAN');
    this.spawnAt(24, 11, 'YELLOW');
    this.spawnAt(7, 13, 'MAGENTA');

    // Spawn the Black Boss at upper center dais
    const bossPos = (this.game.arena && this.game.arena.toScreen)
      ? this.game.arena.toScreen(10.5, 6.5)
      : { x: 2688, y: 1100 };
    this.bossRef = this.game.spawnBoss(bossPos.x, bossPos.y);

    this.enemiesRemainingInPhase = 3;
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
        this.spawnAt(c.col, c.row, rgbColors[i]);
      }
      this.enemiesRemainingInPhase = 3;
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
        this.spawnAt(c.col, c.row, cymColors[i]);
      }
      this.enemiesRemainingInPhase = 3;
      this.game.ui.setObjective(
        "LEVEL 3 — CYM REINFORCEMENTS",
        "Eliminate the 3 CYM troops (Cyan, Yellow, Magenta) to harvest complementary orbs!"
      );
      if (this.game.particles) {
        this.game.particles.spawnComicText(this.game.player.x, this.game.player.y - 80, "CYM TROOPS ARRIVED!", "#00F0FF");
      }
    }
  }

  // Update loop called every frame from game.update(dt)
  update(dt) {
    if (this.level === 3 && this.l3ReplenishPending) {
      this.l3ReplenishTimer -= dt;
      if (this.l3ReplenishTimer <= 0) {
        this.l3ReplenishPending = false;
        this.spawnL3MinionSet(this.l3NextBatch);
      }
    }
  }

  /**
   * Called by BlackBoss when his high-speed shaking completes and light inversion activates
   */
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

  /**
   * Called when Black Boss takes a white bullet hit
   * Requirement: boss replenishes all missing enemies in set of 3, then executes invert!
   */
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
        this.spawnAt(coord.col, coord.row, missingColors[i]);
      }
      this.enemiesRemainingInPhase = targetSet.length;
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

  // ═════════════════════════════════════════════════════════════════════════════
  // Shared Defeat Handler
  // ═════════════════════════════════════════════════════════════════════════════

  onEnemyDefeated(enemy) {
    this.stats.enemiesKilled++;

    if (this.level === 1) {
      this.enemiesRemainingInPhase = Math.max(0, this.enemiesRemainingInPhase - 1);
      if (this.enemiesRemainingInPhase === 0) {
        if (this.l1Subwave === 'CYAN') {
          // 2 Cyan troops defeated -> Trigger Card 7 (Repeat for Magenta & Yellow)
          this.showL1Card7();
        } else if (this.l1Subwave === 'MAGENTA_YELLOW') {
          // Magenta & Yellow troops defeated -> Trigger Cards 8, 9, 10
          this.showL1Cards8to10();
        }
      }
    } else if (this.level === 2) {
      this.enemiesRemainingInPhase = Math.max(0, this.enemiesRemainingInPhase - 1);
      if (this.enemiesRemainingInPhase === 0) {
        if (this.l2PairStep === 0) {
          // Red + Magenta defeated -> spawn Blue + Cyan
          setTimeout(() => this.spawnL2Pair2(), 800);
        } else if (this.l2PairStep === 1) {
          // Blue + Cyan defeated -> spawn Green + Yellow
          setTimeout(() => this.spawnL2Pair3(), 800);
        } else if (this.l2PairStep === 2) {
          // Green + Yellow defeated -> Level 2 complete!
          this.cleared = true;
          this.game.onLevelComplete(2);
        }
      }
    } else if (this.level === 3) {
      // If boss dies, level 3 is cleared!
      if (enemy && enemy.isBoss) {
        this.cleared = true;
        this.game.onLevelComplete(3);
        return;
      }

      this.enemiesRemainingInPhase = Math.max(0, this.enemiesRemainingInPhase - 1);

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
  }

  onOrbCrafted(orbColor, laserColor, resultColor) {
    this.stats.orbsCrafted++;
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.WaveDirector = WaveDirector;

