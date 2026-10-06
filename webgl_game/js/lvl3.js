/**
 * Light-Wars: Level 3 Wave & Script Logic
 *
 * LEVEL 3: The Black Boss & Master Noobi-Wan Cards (0–7)
 *
 * card-0: Black Boss taunts: "You can't defeat me — I am far stronger than you!"
 * card-1: Noobi-Wan: "Don't listen to him; he will die to his contrary color"
 * card-2: Noobi-Wan teaches white crystal synthesis
 *
 * (Battle begins — first hit triggers Invert Frame)
 * card-3: Noobi-Wan explains the Invert Frame ability
 *
 * (After defeating the Black Boss)
 * card-4: Dying Black Boss: "Are you thinking that everything is done? Not yet…"
 * card-5: Dying Black Boss: warns about their true boss
 * card-6: Noobi-Wan: "Seems like another boss; we have to destroy him too. Let's move further"
 * card-7: Noobi-Wan: explains the player's new Invert Frame ability (key E, 25 s timeout)
 */

// Image paths for swappable speaker portraits
const NOOBI_IMG    = 'assets/noobi/noobi_wan_instructions.png';
const BOSS_ALIVE   = 'assets/noobi/Black Boss_ Armoured Enforcer Splash.png';
const BOSS_FALLEN  = 'assets/noobi/Black Boss_ Fallen in the Shattered Dark.png';

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
    this.isPowerupCollected = false;
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
    this.isPowerupCollected = false;

    // Equip Fluke with combat-ready ammo for Level 3
    if (this.game.player) {
      this.game.player.ammo.RED    = Math.max(this.game.player.ammo.RED    || 0, 6);
      this.game.player.ammo.GREEN  = Math.max(this.game.player.ammo.GREEN  || 0, 6);
      this.game.player.ammo.BLUE   = Math.max(this.game.player.ammo.BLUE   || 0, 6);
      this.game.player.ammo.CYAN    = Math.max(this.game.player.ammo.CYAN   || 0, 4);
      this.game.player.ammo.MAGENTA = Math.max(this.game.player.ammo.MAGENTA|| 0, 4);
      this.game.player.ammo.YELLOW  = Math.max(this.game.player.ammo.YELLOW || 0, 4);
    }

    // ── card-0: Black Boss taunts ──────────────────────────────────────────────
    // ── card-1: Noobi-Wan rebuttal ────────────────────────────────────────────
    // ── card-2: White crystal synthesis tutorial ──────────────────────────────
    const openingCards = [
      {
        id: 'l3_card0',
        tag: 'BOSS INTERCEPT // 00',
        badge: '☠️ THE BLACK BOSS SPEAKS',
        tracker: 'CARD 01 / 03',
        step: 1,
        totalSteps: 3,
        title: 'THE BLACK BOSS: "YOU CANNOT DEFEAT ME"',
        speakerImg: BOSS_ALIVE,
        speakerAlt: 'The Black Boss — Armoured Enforcer',
        message:
          '<div style="font-size: 11px; letter-spacing: 1.5px; color: #666; font-weight: 800; margin-bottom: 3px;">— TRANSMISSION INTERCEPTED —</div>' +
          '<div class="noobi-callout-box" style="margin: 2px 0 4px 0; padding: 5px 9px; font-size: 12.5px; line-height: 1.34; color: #E60039; border-left: 3.5px solid #FF0055; background: rgba(255,0,85,0.10); border-radius: 4px; font-weight: 700;">' +
          '&ldquo;You dare challenge me, Fluke?! I am the Void Enforcer — absolute darkness itself. ' +
          'Every photon you fire crumbles at my feet. Your pitiful little lasers are nothing but flickering ' +
          'candles before the abyss. You <em>cannot</em> defeat me. Surrender now, or be consumed by the dark!&rdquo;' +
          '</div>' +
          '<div style="font-size: 11px; color: #555; font-weight: 600;">— <b style="color:#000;">THE BLACK BOSS</b>, Void Enforcer of the Spectrum War</div>',
        btnText: 'RESPOND! ▶'
      },
      {
        id: 'l3_card1',
        tag: 'NOOBI-WAN INTEL // 01',
        badge: '⚡ MASTER NOOBI-WAN INTEL',
        tracker: 'CARD 02 / 03',
        step: 2,
        totalSteps: 3,
        title: 'MASTER NOOBI-WAN: "DON\'T LISTEN TO HIM"',
        speakerImg: NOOBI_IMG,
        speakerAlt: 'Master Noobi-Wan',
        message:
          'Fluke, do not let his words shake you!<br><br>' +
          '<div class="noobi-callout-box" style="margin: 4px 0 6px 0; padding: 6px 10px; font-size: 13.5px; font-weight: bold; color: #FF007F; border-left: 3.5px solid #FF007F; background: rgba(255,0,127,0.14); border-radius: 4px;">' +
          '&ldquo;Don\'t listen to him — he is the same as all the others. He <em>will</em> die to his contrary color!&rdquo;' +
          '</div>' +
          '• Every entity in this war has a wavelength weakness — even the Black Boss.<br>' +
          '• The darkness itself has a contrary: <b>pure WHITE light</b>.<br>' +
          '• Find his weakness, and you will find his end.',
        btnText: 'UNDERSTOOD, MASTER ▶'
      },
      {
        id: 'l3_card2',
        tag: 'SYNTHESIS INTEL // 02',
        badge: '⚡ MASTER NOOBI-WAN INTEL',
        tracker: 'CARD 03 / 03',
        step: 3,
        totalSteps: 3,
        title: 'MASTER NOOBI-WAN: WHITE CRYSTAL SYNTHESIS',
        speakerImg: NOOBI_IMG,
        speakerAlt: 'Master Noobi-Wan',
        message:
          '<div class="noobi-callout-box" style="margin: 4px 0; padding: 6px; font-size: 12px; font-weight: bold; color: #FF2A6D; border-left: 3.5px solid #9400D3; background: rgba(160,32,240,0.14); border-radius: 4px;">' +
          '&ldquo;Shoot an orb with its contrary-color laser to form white crystals&rdquo;' +
          '</div>' +
          '• <span class="noobi-hl red">RED [1]</span> + <span class="noobi-hl cyan">CYAN orb</span><br>' +
          '• <span class="noobi-hl green">GREEN [2]</span> + <span class="noobi-hl magenta">MAGENTA orb</span><br>' +
          '• <span class="noobi-hl blue">BLUE [3]</span> + <span class="noobi-hl yellow">YELLOW orb</span><br><br>' +
          'Reaction makes <b>WHITE AMMO [7]</b> — the only laser to harm the Boss!',
        btnText: 'ENGAGE THE BLACK BOSS! ⚔️'
      }
    ];

    setTimeout(() => {
      if (this.game.showTutorialSequence) {
        this.game.showTutorialSequence(openingCards, () => {
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
    if (this.isVictoryInProgress || (this.bossRef && !this.bossRef.alive)) return;

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

  // card-3: Triggered after the black boss uses his invert frame ability on first white hit
  onBossPhysicsInversionActivated() {
    if (this.seenInversionExplanation) return;
    this.seenInversionExplanation = true;

    const card3 = {
      id: 'l3_card3',
      tag: 'BOSS ABILITY UNLEASHED',
      badge: '⚠️ REALITY DISTORTION ALERT',
      tracker: 'CARD 04',
      step: 1,
      totalSteps: 1,
      title: 'MASTER NOOBI-WAN: INVERT FRAME ABILITY',
      speakerImg: NOOBI_IMG,
      speakerAlt: 'Master Noobi-Wan',
      message:
        '<div style="font-size: 13px; font-weight: bold; color: #FF4D66; border-left: 3px solid #A020F0; ' +
        'padding: 8px; background: rgba(160,32,240,0.15); border-radius: 4px; margin-bottom: 12px;">' +
        '&ldquo;Invert frame is ON! Bots can only be killed by lasers of THEIR OWN color, and the Black Boss is invincible!&rdquo;' +
        '</div>' +
        '• <b>SAME-COLOR VULNERABILITY:</b><br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl cyan">CYAN bot</span> &rarr; <b>CYAN laser [4]</b><br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl magenta">MAGENTA bot</span> &rarr; <b>MAGENTA laser [5]</b><br>' +
        '&nbsp;&nbsp;&bull; <span class="noobi-hl red">RED bot</span> &rarr; <b>RED laser [1]</b><br><br>' +
        '• <b>BOSS IS INVINCIBLE:</b> Wait until it drops!',
      btnText: 'UNDERSTOOD, NOOBI-WAN! ⚔️'
    };

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence([card3]);
    }
  }

  onBossHit(remainingHp) {
    if (remainingHp <= 0 || this.isVictoryInProgress || (this.bossRef && !this.bossRef.alive)) return;
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
    // If boss dies, show dying cards 4 & 5 then proceed
    if (enemy && (enemy.isBoss || enemy === this.bossRef)) {
      if (this.isVictoryInProgress) return;
      this.isVictoryInProgress = true;
      this.l3ReplenishPending = false;
      this.waves.enemiesRemainingInPhase = 0;

      // Safely neutralize remaining minion projectiles
      if (this.game.lasers) {
        this.game.lasers = this.game.lasers.filter(l => l.isPlayer);
      }
      this.game.enemyLasers = [];

      // When the Black Boss dies, destroy all remaining enemies
      if (typeof this.game.killRemainingMinions === 'function') {
        this.game.killRemainingMinions(enemy);
      } else {
        const minions = this.game.enemies.filter(e => e !== enemy && e.alive);
        for (const m of minions) {
          m.alive = false;
          if (this.waves && this.waves.stats) {
            this.waves.stats.enemiesKilled++;
          }
          if (this.game.particles) {
            const hex = (window.LightWars.COLORS[m.colorId] && window.LightWars.COLORS[m.colorId].hex) || '#FFFFFF';
            this.game.particles.spawnBurst(m.x, m.y - 50, hex, 28);
            const deathWord = window.LightWars.COMIC_DEATH_WORDS
              ? window.LightWars.COMIC_DEATH_WORDS[Math.floor(Math.random() * window.LightWars.COMIC_DEATH_WORDS.length)]
              : 'KABOOM!';
            this.game.particles.spawnComicText(m.x, m.y - 70, deathWord, hex);
          }
        }
        this.game.enemies = [];
      }

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
      const deadColor = enemy ? enemy.colorId : '';
      const isRGB = (deadColor === 'RED' || deadColor === 'GREEN' || deadColor === 'BLUE');
      const nextBatch = isRGB ? 'CYM' : 'RGB';
      this.scheduleL3Replenish(nextBatch);
    }
  }

  onInvertPowerupCollected() {
    if (this.isPowerupCollected) return;
    this.isPowerupCollected = true;
    this.isVictoryInProgress = true;
    this.l3ReplenishPending = false;

    // Destroy all remaining enemies when powerup is collected
    if (this.game && typeof this.game.killRemainingMinions === 'function') {
      this.game.killRemainingMinions(this.bossRef);
    } else if (this.game) {
      this.game.enemies = [];
    }

    // Give a clear gap/breather before the dying boss dialogue appears
    setTimeout(() => {
      // ── card-4: Dying Black Boss — "Are you thinking that everything is done? Not yet…"
      // ── card-5: Dying Black Boss — warns about their true boss
      // ── card-6: Noobi-Wan — "Seems like another boss; let's move further"
      // ── card-7: Noobi-Wan — explains the new Invert Frame ability
      const victoryCards = [
        {
          id: 'l3_card4',
          tag: 'DYING BOSS // 01',
          badge: '☠️ THE BLACK BOSS SPEAKS',
          tracker: 'CARD 05 / 08',
          step: 1,
          totalSteps: 4,
          title: 'THE BLACK BOSS: "NOT YET…"',
          speakerImg: BOSS_FALLEN,
          speakerAlt: 'The Black Boss — Fallen in the Shattered Dark',
          message:
            '<div class="noobi-callout-box" style="margin: 2px 0; padding: 5px; font-size: 12.5px; line-height: 1.34; color: #E60039; border-left: 3.5px solid #FF0055; background: rgba(255,0,85,0.10); border-radius: 4px; font-weight: 700;">' +
            '&ldquo;…Not yet, little warrior. This battle was nothing. You haven\'t seen what lies ahead…&rdquo;' +
            '</div>' +
            '<div style="font-size: 11px; color: #555; font-weight: 600;">— <b style="color:#000;">THE BLACK BOSS</b></div>',
          btnText: 'LISTEN ▶'
        },
        {
          id: 'l3_card5',
          tag: 'DYING BOSS // 02',
          badge: '☠️ THE BLACK BOSS SPEAKS',
          tracker: 'CARD 06 / 08',
          step: 2,
          totalSteps: 4,
          title: 'THE BLACK BOSS: "OUR BOSS AWAITS YOU"',
          speakerImg: BOSS_FALLEN,
          speakerAlt: 'The Black Boss — Fallen in the Shattered Dark',
          message:
            '<div class="noobi-callout-box" style="margin: 2px 0; padding: 5px; font-size: 12.5px; line-height: 1.34; color: #E60039; border-left: 3.5px solid #FF0055; background: rgba(255,0,85,0.10); border-radius: 4px; font-weight: 700;">' +
            '&ldquo;You have awakened a far greater wrath. Our true lord — you cannot hope to defeat him!&rdquo;' +
            '</div>' +
            '<div style="font-size: 11px; color: #555; font-weight: 600;">— <b style="color:#000;">THE BLACK BOSS</b></div>',
          btnText: 'LISTEN ▶'
        },
        {
          id: 'l3_card6',
          tag: 'NOOBI-WAN INTEL // 03',
          badge: '⚡ MASTER NOOBI-WAN INTEL',
          tracker: 'CARD 07 / 08',
          step: 3,
          totalSteps: 4,
          title: 'MASTER NOOBI-WAN: ANOTHER BOSS AHEAD',
          speakerImg: NOOBI_IMG,
          speakerAlt: 'Master Noobi-Wan',
          message:
            'Hold on, Fluke — the chromatic disturbances haven\'t ceased!<br><br>' +
            '<div class="noobi-callout-box" style="margin: 4px 0 6px 0; padding: 6px 10px; font-size: 13.5px; font-weight: bold; color: #FF2A6D; border-left: 3.5px solid #9400D3; background: rgba(160,32,240,0.14); border-radius: 4px;">' +
            '&ldquo;Seems like another boss; we have to destroy him too. Let\'s move further!&rdquo;' +
            '</div>' +
            'Gather yourself. The spectrum is counting on you. Forward!',
          btnText: 'CONTINUE NOOBI-WAN ▶'
        },
        {
          id: 'l3_card7',
          tag: 'LEGENDARY POWER ACQUIRED // 04',
          badge: '✨ NEW ABILITY UNLOCKED',
          tracker: 'CARD 08 / 08',
          step: 4,
          totalSteps: 4,
          title: 'MASTER NOOBI-WAN: INVERT FRAME GAINED',
          speakerImg: NOOBI_IMG,
          speakerAlt: 'Master Noobi-Wan',
          message:
            '<div class="noobi-callout-box" style="margin: 4px 0; padding: 6px; font-size: 12px; font-weight: bold; color: #00A850; border-left: 3.5px solid #00E676; background: rgba(0,230,118,0.14); border-radius: 4px;">' +
            '&ldquo;You gained INVERT FRAME! Activate it using E (25s cooldown)!&rdquo;' +
            '</div>' +
            '• Press <b>KEY [E]</b> to reverse light physics!<br>' +
            '• When active, enemies die to matching color lasers (same-color kills).',
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
    if (this.isVictoryInProgress || (this.bossRef && !this.bossRef.alive)) {
      this.l3ReplenishPending = false;
      if (this.game && this.game.enemies && this.game.enemies.some(e => e.alive)) {
        if (typeof this.game.killRemainingMinions === 'function') {
          this.game.killRemainingMinions(this.bossRef);
        } else {
          this.game.enemies = [];
        }
      }
      return;
    }

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
