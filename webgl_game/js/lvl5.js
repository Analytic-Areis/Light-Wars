/**
 * Light-Wars: Level 5 — The White Boss
 *
 * Mechanics:
 *  - Intro cards play, White Boss + Black Boss (1hp, no invert power) are present
 *  - Fight: CMY minions spawn first, after all dead → 15s wait → RGB, then 15s → CMY, repeat
 *  - White Boss: 3 hearts, only killable with WHITE laser in INVERTED mode
 *  - Black Boss: 1 heart, killable with WHITE laser in NORMAL mode, invincible in INVERTED mode
 *  - When White Boss dies → all enemies die → victory cards → level complete
 */

const L5_NOOBI_IMG      = 'assets/noobi/noobi_wan_instructions.png';
const L5_BLACK_BOSS_IMG = 'assets/noobi/Black Boss_ Armoured Enforcer Splash.png';
const L5_WHITE_BOSS_IMG = 'assets/noobi/White Boss Armoured.png';

class Level5Director {
  constructor(waveDirector) {
    this.waves        = waveDirector;
    this.game         = waveDirector.game;

    this.phase        = 0;   // 0=cutscene, 1=fighting, 2=victory
    this.minionWave   = 'CMY';
    this.minionTimer  = 0;   // countdown between waves
    this.waitingForNextWave = false;

    this.bossRef      = null;
    this.blackBossRef = null;
    this._victoryDone = false;
  }

  // ─── Entry ───────────────────────────────────────────────────────────────
  start() {
    this.waves.level    = 5;
    this.waves.phase    = 0;
    this.waves.cleared  = false;
    this.waves.stats    = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    this.phase          = 0;
    this.minionWave     = 'CMY';
    this.minionTimer    = 0;
    this.waitingForNextWave = false;
    this._victoryDone   = false;
    this.bossRef        = null;
    this.blackBossRef   = null;

    // Ensure player has invert unlocked and starter ammo
    if (this.game.player) {
      this.game.player.invertUnlocked = true;
      const startAmmo = { RED: 6, GREEN: 6, BLUE: 6, CYAN: 6, MAGENTA: 6, YELLOW: 6, WHITE: 4 };
      for (const [c, n] of Object.entries(startAmmo)) {
        this.game.player.ammo[c] = Math.min(this.game.player.maxAmmo, Math.max(this.game.player.ammo[c] || 0, n));
      }
    }

    this.game.colorChangingEnabled = true;

    this.game.ui.setObjective(
      'LEVEL 5 — THE WHITE BOSS',
      'The final confrontation begins…'
    );

    // Spawn White Boss immediately (present during intro)
    this._spawnWhiteBoss();

    // Delay intro so arena finishes rendering
    setTimeout(() => this._showIntroCards(), 600);
  }

  // ─── Spawn helpers ────────────────────────────────────────────────────────
  _spawnWhiteBoss() {
    const wl = this.game.arena.whiteLight;
    const pos = this.game.getSafeEnemySpawnPos(wl.x, wl.y - 80);
    this.bossRef = new window.LightWars.WhiteBoss(pos.x, pos.y);
    this.game.enemies.push(this.bossRef);
  }

  _spawnBlackBoss() {
    if (!this.bossRef) return;
    const pos = this.game.getSafeEnemySpawnPos(this.bossRef.x + 60, this.bossRef.y + 80);
    this.blackBossRef = new window.LightWars.BlackBoss(pos.x, pos.y);
    // Resurrect: no invert power, tanks 2 hits
    this.blackBossRef.canInvert    = false;
    this.blackBossRef.health       = 2;
    this.blackBossRef.maxHealth    = 2;
    this.game.enemies.push(this.blackBossRef);

    if (this.game.particles && this.bossRef) {
      this.game.particles.spawnBurst(pos.x, pos.y, '#A020F0', 40);
    }
  }

  // ─── Cutscene cards ────────────────────────────────────────────────────────
  _showIntroCards() {
    const cards = [
      {
        id: 'l5_card1',
        badge: '⚠️ FINAL BOSS ENCOUNTER',
        isBoss: true,
        speakerImg: L5_WHITE_BOSS_IMG,
        title: 'THE WHITE BOSS',
        message: `You have come further than I ever anticipated, Fluke.<br>
          <br>
          This is where your journey ends — and where you ascend<br>
          into something <b>far greater than you know</b>.`,
        btnText: 'FACE THE BOSS ▶',
      },
      {
        id: 'l5_card2',
        badge: '⚠️ FINAL BOSS ENCOUNTER',
        isBoss: true,
        speakerImg: L5_WHITE_BOSS_IMG,
        title: 'THE WHITE BOSS',
        message: `I am the convergence of all light — <b>pure, absolute, unstoppable</b>.<br>
          <br>
          But first, let me resurrect my most loyal enforcer.<br>
          He deserves a second chance to finish what he started.`,
        btnText: 'WITNESS ▶',
      },
    ];

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence(cards, () => this._spawnBlackBossAndContinue());
    } else {
      this._spawnBlackBossAndContinue();
    }
  }

  _spawnBlackBossAndContinue() {
    this._spawnBlackBoss();

    const cards = [
      {
        id: 'l5_card3',
        badge: '💀 RESURRECTED — THE BLACK ENFORCER',
        isBoss: true,
        speakerImg: L5_BLACK_BOSS_IMG,
        title: 'THE BLACK BOSS',
        message: `I am <b>back from the void</b>, Fluke.<br>
          <br>
          My master showed me mercy I do not deserve.<br>
          This time — I will <b>not</b> fail him.`,
        btnText: 'RESPOND! ▶',
      },
      {
        id: 'l5_card4',
        badge: '⚡ MASTER NOOBI-WAN INTEL',
        speakerImg: L5_NOOBI_IMG,
        title: 'MASTER NOOBI-WAN',
        message: `Do not be rattled, Fluke. He was resurrected — which means he no longer holds the
          <b>Invert Frame power</b> you took from him, and he returns with only
          <b>2 hearts</b> this time.`,
        btnText: 'UNDERSTOOD ▶',
      },
      {
        id: 'l5_card5',
        badge: '⚡ MASTER NOOBI-WAN INTEL',
        speakerImg: L5_NOOBI_IMG,
        title: 'MASTER NOOBI-WAN',
        message: `The <b>White Boss is invincible in Normal Mode</b>.<br>
          Use your <b>Invert Frame ability [RMB]</b> — in that inverted state,
          every enemy including the White Boss dies to the <b>same colour laser</b> they normally wield.`,
        btnText: 'GOT IT ▶',
      },
      {
        id: 'l5_card6',
        badge: '⚡ MASTER NOOBI-WAN INTEL',
        speakerImg: L5_NOOBI_IMG,
        title: 'MASTER NOOBI-WAN',
        message: `Here is the catch: in <b>Inverted Mode</b>, the Black Boss would only
          die to a black laser — which does not exist.<br>
          <br>
          So the <b>Black Boss is invincible while you are inverted!</b>`,
        btnText: 'UNDERSTOOD ▶',
      },
      {
        id: 'l5_card7',
        badge: '⚡ MASTER NOOBI-WAN INTEL',
        speakerImg: L5_NOOBI_IMG,
        title: 'MASTER NOOBI-WAN',
        message: `<b>Strategy:</b><br>
          &bull; In <b>Normal Mode</b> — shoot <b>WHITE [7]</b> to damage the Black Boss.<br>
          &bull; In <b>Inverted Mode [RMB]</b> — shoot <b>WHITE [7]</b> to damage the White Boss.<br>
          <br>
          Use the ability <b>wisely</b>. May the light be with you, Fluke.`,
        btnText: 'FIGHT! ▶',
      },
    ];

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence(cards, () => this._startFight());
    } else {
      this._startFight();
    }
  }


  // ─── Fight phase ──────────────────────────────────────────────────────────
  _startFight() {
    this.phase = 1;
    this.minionWave = 'CMY';
    this.minionTimer = 0;
    this.waitingForNextWave = false;

    this.game.ui.setObjective(
      'DEFEAT THE WHITE BOSS',
      'Normal Mode: WHITE laser kills Black Boss. Inverted Mode [E]: WHITE laser kills White Boss!'
    );

    this._spawnMinionWave();
  }

  _spawnMinionWave() {
    if (this.phase !== 1) return;

    const colors = this.minionWave === 'CMY'
      ? ['CYAN', 'MAGENTA', 'YELLOW']
      : ['RED', 'GREEN', 'BLUE'];

    const coords = [
      { col: 9,  row: 11 },
      { col: 13, row: 14 },
      { col: 17, row: 12 },
      { col: 21, row: 15 },
      { col: 11, row: 17 },
      { col: 19, row: 10 },
    ];

    let idx = 0;
    colors.forEach(color => {
      for (let i = 0; i < 2; i++, idx++) {
        const c = coords[idx] || { col: 12 + idx, row: 13 };
        this.waves.spawnAt(c.col, c.row, color);
      }
    });

    if (this.game.particles && this.game.player) {
      this.game.particles.spawnComicText(
        this.game.player.x,
        this.game.player.y - 60,
        `${this.minionWave} TROOPS INCOMING!`,
        this.minionWave === 'CMY' ? '#00F0FF' : '#FF5733'
      );
    }

    // Toggle wave for next time
    this.minionWave = this.minionWave === 'CMY' ? 'RGB' : 'CMY';
    this.waitingForNextWave = false;
    this.minionTimer = 0;
  }

  // ─── Enemy defeated callback ──────────────────────────────────────────────
  onEnemyDefeated(enemy, laserColorId) {
    if (this.phase !== 1) return;

    // White Boss killed → victory
    if (enemy === this.bossRef) {
      this._onWhiteBossDefeated();
      return;
    }

    // Check if all minions are gone (ignore bosses)
    const livingMinions = this.game.enemies.filter(e => e.alive && !e.isBoss);
    if (livingMinions.length === 0 && !this.waitingForNextWave) {
      this.waitingForNextWave = true;
      this.minionTimer = 15.0;

      if (this.game.particles && this.game.player) {
        this.game.particles.spawnComicText(
          this.game.player.x,
          this.game.player.y - 60,
          'NEXT WAVE IN 15s',
          '#FFE600'
        );
      }
    }
  }

  onBossHit(remainingHp) {
    // Could show boss health flash etc — handled by HUD
  }

  // ─── White Boss defeated ──────────────────────────────────────────────────
  _onWhiteBossDefeated() {
    if (this._victoryDone) return;
    this._victoryDone = true;
    this.phase = 2;

    // Kill every remaining enemy
    if (this.game && typeof this.game.killRemainingMinions === 'function') {
      this.game.killRemainingMinions(this.bossRef);
    } else {
      this.game.enemies.forEach(e => { e.alive = false; });
    }

    setTimeout(() => this._showVictoryCards(), 1500);
  }

  _showVictoryCards() {
    const cards = [
      {
        id: 'l5_card8',
        badge: '☠️ WHITE BOSS DEFEATED',
        isBoss: true,
        speakerImg: L5_WHITE_BOSS_IMG,
        title: 'THE WHITE BOSS',
        message: `I am... <b>genuinely surprised</b>.<br>
          <br>
          I did not foresee a warrior of your caliber.<br>
          Perhaps the light belongs to you after all...`,
        btnText: 'CLAIM VICTORY ▶',
      },
      {
        id: 'l5_card9',
        badge: '🌟 GALAXY SAVED',
        speakerImg: L5_NOOBI_IMG,
        title: 'MASTER NOOBI-WAN',
        message: `You have successfully eliminated the darkness in this sector, Fluke!<br>
          <br>
          You are a true master of the <b>Chromatic Spectrum</b>.<br>
          But stay vigilant... there is much more out there in other galaxies.`,
        btnText: 'COMPLETE JOURNEY ▶',
      },
    ];

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence(cards, () => {
        this.waves.cleared = true;
        this.game.onLevelComplete(5);
      });
    } else {
      this.waves.cleared = true;
      this.game.onLevelComplete(5);
    }
  }

  // ─── Update loop ──────────────────────────────────────────────────────────
  update(dt) {
    if (this.phase !== 1) return;

    if (this.waitingForNextWave) {
      this.minionTimer -= dt;
      if (this.minionTimer <= 0) {
        this._spawnMinionWave();
      }
    } else {
      // Failsafe: if all minions gone but timer wasn't started (e.g. initial state)
      const livingMinions = this.game.enemies.filter(e => e.alive && !e.isBoss);
      if (livingMinions.length === 0) {
        this.waitingForNextWave = true;
        this.minionTimer = 15.0;
      }
    }
  }

  onEnemyTransform(enemy, prevColor, newColor, laserColor) {}
  onOrbCrafted() {}
}

window.LightWars = window.LightWars || {};
window.LightWars.Level5Director = Level5Director;
