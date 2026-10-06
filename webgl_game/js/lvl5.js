/**
 * Light-Wars: Level 5 Wave & Script Logic
 *
 * LEVEL 5: The White Boss
 */

const L5_NOOBI_IMG = "assets/noobi/noobi_wan_instructions.png";
const L5_BLACK_BOSS_IMG =
  "assets/noobi/Black Boss_ Armoured Enforcer Splash.png";
const L5_WHITE_BOSS_IMG = "assets/sprites/bots/white-pink/idle/down.png";

class Level5Director {
  constructor(waveDirector) {
    this.waves = waveDirector;
    this.game = waveDirector.game;

    this.phase = 0; // 0=intro, 1=fighting, 2=victory
    this.minionWave = "CMY"; // alternates between CMY and RGB
    this.minionTimer = 0;
    this.bossRef = null;
    this.blackBossRef = null;
  }

  start() {
    this.waves.level = 5;
    this.waves.phase = 0;
    this.waves.cleared = false;
    this.waves.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    this.game.colorChangingEnabled = true;
    this.phase = 0;
    this.minionWave = "CMY";
    this.minionTimer = 0;

    if (this.game.player) {
      this.game.player.invertUnlocked = true;
      const startAmmo = {
        RED: 8,
        GREEN: 8,
        BLUE: 8,
        CYAN: 8,
        MAGENTA: 8,
        YELLOW: 8,
        WHITE: 3,
      };
      for (const [c, n] of Object.entries(startAmmo)) {
        this.game.player.ammo[c] = Math.max(this.game.player.ammo[c] || 0, n);
      }
    }

    this.game.ui.setObjective(
      "LEVEL 5 — THE WHITE BOSS",
      "Confront the True Mastermind.",
    );

    const spawnPos = this.game.getSafeEnemySpawnPos(
      this.game.arena.whiteLight.x,
      this.game.arena.whiteLight.y - 100,
    );
    this.bossRef = new window.LightWars.WhiteBoss(spawnPos.x, spawnPos.y);
    this.game.enemies.push(this.bossRef);

    setTimeout(() => this._showIntroCards(), 500);
  }

  _showIntroCards() {
    const cards = [
      {
        id: "l5_card1",
        badge: "⚠️ BOSS ENCOUNTER",
        isBoss: true,
        speakerImg: L5_WHITE_BOSS_IMG,
        title: "THE WHITE BOSS",
        message:
          "I didn't expect you to come this far, Fluke. This will be the end of your journey and some elevation.",
      },
      {
        id: "l5_card2",
        badge: "⚠️ BOSS ENCOUNTER",
        isBoss: true,
        speakerImg: L5_WHITE_BOSS_IMG,
        title: "THE WHITE BOSS",
        message: "I am going to resurrect my strongest slave to deal with you.",
      },
    ];

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence(cards, () =>
        this._spawnBlackBossAndContinue(),
      );
    } else {
      this._spawnBlackBossAndContinue();
    }
  }

  _spawnBlackBossAndContinue() {
    if (this.game.particles && this.bossRef) {
      this.game.particles.spawnBurst(
        this.bossRef.x,
        this.bossRef.y + 80,
        "#A020F0",
        40,
      );
    }

    // Spawn Black Boss
    const spawnPos = this.game.getSafeEnemySpawnPos(
      this.bossRef.x,
      this.bossRef.y + 80,
    );
    this.blackBossRef = new window.LightWars.BlackBoss(spawnPos.x, spawnPos.y);
    this.blackBossRef.canInvert = false;
    this.blackBossRef.health = 1;
    this.blackBossRef.maxHealth = 1;
    this.game.enemies.push(this.blackBossRef);

    const cards = [
      {
        id: "l5_card3",
        badge: "⚠️ RESURRECTED ENEMY",
        isBoss: true,
        speakerImg: L5_BLACK_BOSS_IMG,
        title: "THE BLACK BOSS",
        message: "I am back and this time I won't disappoint my master.",
      },
      {
        id: "l5_card4",
        badge: "⚡ MASTER NOOBI-WAN INTEL",
        speakerImg: L5_NOOBI_IMG,
        title: "MASTER NOOBI-WAN",
        message:
          "Don't worry Fluke, since he resurrected he doesn't have the inverted frame power (since you acquired it from him) and he has only 1/3 of his health as before.",
      },
      {
        id: "l5_card5",
        badge: "⚡ MASTER NOOBI-WAN INTEL",
        speakerImg: L5_NOOBI_IMG,
        title: "MASTER NOOBI-WAN",
        message:
          "The White Boss is <b>invincible</b> normally, but if you use your acquired ability, every bot and boss will die with the <b>same colour</b> laser shot.",
      },
      {
        id: "l5_card6",
        badge: "⚡ MASTER NOOBI-WAN INTEL",
        speakerImg: L5_NOOBI_IMG,
        title: "MASTER NOOBI-WAN",
        message:
          "But there is a catch: in inverted mode, the Black Boss will die with a black laser shot, which doesn't exist, so he is <b>invincible</b> in inverted mode!",
      },
      {
        id: "l5_card7",
        badge: "⚡ MASTER NOOBI-WAN INTEL",
        speakerImg: L5_NOOBI_IMG,
        title: "MASTER NOOBI-WAN",
        message: "So use the ability wisely!",
      },
    ];

    if (this.game.showTutorialSequence) {
      this.game.showTutorialSequence(cards, () => this._startFight());
    } else {
      this._startFight();
    }
  }

  _startFight() {
    this.phase = 1;
    this.game.ui.setObjective(
      "DEFEAT THE WHITE BOSS",
      "White Boss is vulnerable to White laser ONLY in Inverted Mode! Black Boss is vulnerable to White laser ONLY in Normal Mode!",
    );
    this._spawnMinionWave();
  }

  _spawnMinionWave() {
    if (this.phase !== 1) return;

    // Check if we already have 6 or more minions, to avoid crowding
    const livingMinions = this.game.enemies.filter((e) => e.alive && !e.isBoss);
    if (livingMinions.length >= 6) {
      return;
    }

    const colors =
      this.minionWave === "CMY"
        ? ["CYAN", "MAGENTA", "YELLOW"]
        : ["RED", "GREEN", "BLUE"];

    // Spawn 2 of each
    const coords = [
      { col: 9, row: 11 },
      { col: 13, row: 14 },
      { col: 17, row: 12 },
      { col: 21, row: 15 },
      { col: 11, row: 17 },
      { col: 19, row: 10 },
    ];
    let idx = 0;
    colors.forEach((color) => {
      for (let i = 0; i < 2; i++, idx++) {
        const c = coords[idx] || { col: 12 + idx, row: 13 };
        this.waves.spawnAt(c.col, c.row, color);
      }
    });

    if (this.game.particles && this.game.player) {
      this.game.particles.spawnComicText(
        this.game.player.x,
        this.game.player.y - 60,
        `${this.minionWave} TROOPS ARRIVED!`,
        "#FFFFFF",
      );
    }

    // Toggle wave for next time
    this.minionWave = this.minionWave === "CMY" ? "RGB" : "CMY";
  }

  onEnemyDefeated(enemy, laserColorId) {
    if (this.phase !== 1) return;

    if (enemy === this.bossRef) {
      this._onBossDefeated();
      return;
    }

    const livingMinions = this.game.enemies.filter((e) => e.alive && !e.isBoss);
    if (livingMinions.length === 0) {
      // Start 15s timer before next wave
      this.minionTimer = 15.0;
      if (this.game.particles && this.game.player) {
        this.game.particles.spawnComicText(
          this.game.player.x,
          this.game.player.y - 60,
          "NEXT WAVE IN 15s",
          "#FFFFFF",
        );
      }
    }
  }

  onBossHit(remainingHp) {}

  _onBossDefeated() {
    this.phase = 2;
    // boss dies -> kills remaining minions (already handled in WhiteBoss.takeLaserHit)
    setTimeout(() => this._showVictoryCards(), 1500);
  }

  _showVictoryCards() {
    const cards = [
      {
        id: "l5_card8",
        badge: "⚠️ BOSS DEFEATED",
        isBoss: true,
        speakerImg: L5_WHITE_BOSS_IMG,
        title: "THE WHITE BOSS",
        message:
          "I am genuinely surprised. I didn't know you are this good of a warrior.",
      },
      {
        id: "l5_card9",
        badge: "⚡ MASTER NOOBI-WAN INTEL",
        speakerImg: L5_NOOBI_IMG,
        title: "MASTER NOOBI-WAN",
        message:
          "You have successfully eliminated the bad in this galaxy, but there is so much bad out there in other galaxies...",
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

  onEnemyTransform(enemy, prevColor, newColor, laserColor) {}
  onOrbCrafted() {}

  update(dt) {
    if (this.phase === 1) {
      const livingMinions = this.game.enemies.filter(
        (e) => e.alive && !e.isBoss,
      );
      if (livingMinions.length === 0) {
        if (this.minionTimer > 0) {
          this.minionTimer -= dt;
          if (this.minionTimer <= 0) {
            this._spawnMinionWave();
          }
        } else {
          // Fallback if timer is somehow 0 but enemies are 0
          this.minionTimer = 15.0;
        }
      }
    }
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.Level5Director = Level5Director;
