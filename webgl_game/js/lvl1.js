/**
 * Light-Wars: Level 1 Wave & Script Logic
 *
 * LEVEL 1: CMY Infiltration & Tutorial
 * - Master Noobi-Wan 10-Card Interactive Briefing
 * - Waves:
 *     1. 2 Cyan troops (defeated with Red [1], drops Red orbs)
 *     2. 2 Magenta & 2 Yellow troops (defeated with Green [2] & Blue [3])
 *     3. All 6 orbs on deck: Fuse complementary bullets & unlock CMY
 *     4. Black Orb / Barrel challenge: strike with all 6 colors
 *     5. Drops Dash Powerup on floor
 *     6. Walk over powerup -> absorption animation -> Noobi-Wan brief -> Level 1 Complete
 */

class Level1Director {
  constructor(waveDirector) {
    this.waves = waveDirector;
    this.game = waveDirector.game;

    // Subwave state
    this.l1Subwave = 'CYAN'; // 'CYAN' -> 'MAGENTA_YELLOW' -> 'BLACK_BARREL'
  }

  start() {
    this.waves.level = 1;
    this.waves.phase = 1;
    this.waves.cleared = false;
    this.waves.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
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
    this.waves.spawnAt(16, 6, 'CYAN');
    this.waves.spawnAt(10, 8, 'CYAN');
    this.waves.enemiesRemainingInPhase = 2;

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
    this.waves.spawnAt(9, 12, 'YELLOW');
    this.waves.spawnAt(13, 7, 'YELLOW');
    this.waves.spawnAt(13, 11, 'MAGENTA');
    this.waves.spawnAt(11, 8, 'MAGENTA');
    this.waves.enemiesRemainingInPhase = 4;
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
    if (this.waves.phase === 'BLACK_BARREL') return;
    this.waves.phase = 'BLACK_BARREL';
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

  onBlackBarrelDestroyed(dropX, dropY) {
    this.game.ui.setObjective(
      "CLAIM REWARD — PICK UP DASH POWERUP!",
      "Walk over the dropped Dash Powerup on the floor to claim your ability!"
    );
    if (this.game.particles) {
      this.game.particles.spawnComicText(dropX, dropY - 60, "POWERUP DROPPED!", "#00F0FF");
    }
  }

  onDashPowerupCollected() {
    this.waves.cleared = true;
    setTimeout(() => {
      if (this.game.showStopTutorial) {
        this.game.showStopTutorial(
          'l1_dash_unlocked',
          'SURPRISE UNLOCKED: DASH ABILITY!',
          'SPLENDID WORK, FLUKE! You have collected the powerup released from the Black Orb: <b>THE DASH ABILITY</b>!<br><br>' +
          '• Press <span class="noobi-key">[SPACE]</span> or <span class="noobi-key">[RMB]</span> to warp through danger at high speed!<br>' +
          '• Dashing makes you slip past hostile projectiles and reposition in an instant.<br><br>' +
          'You have mastered the foundations of the chromatic spectrum. Prepare yourself—the war escalates!',
          {
            badge: '⚡ ABILITY UNLOCKED',
            btnText: 'COMPLETE LEVEL 1! 🏆',
            onDismiss: () => {
              this.game.onLevelComplete(1);
            }
          }
        );
      } else {
        this.game.onLevelComplete(1);
      }
    }, 600);
  }

  onEnemyDefeated(enemy) {
    this.waves.enemiesRemainingInPhase = Math.max(0, this.waves.enemiesRemainingInPhase - 1);
    if (this.waves.enemiesRemainingInPhase === 0) {
      if (this.l1Subwave === 'CYAN') {
        // 2 Cyan troops defeated -> Trigger Card 7 (Repeat for Magenta & Yellow)
        this.showL1Card7();
      } else if (this.l1Subwave === 'MAGENTA_YELLOW') {
        // Magenta & Yellow troops defeated -> Trigger Cards 8, 9, 10
        this.showL1Cards8to10();
      }
    }
  }

  update(dt) {
    // Level 1 frame update hook if needed
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Level1Director = Level1Director;
