/**
 * Light-Wars: Wave Director with Level 1 & Level 2 support
 *
 * LEVEL 1 — CMY only:
 *   Phases 1-4: Cyan, Magenta, Yellow troops only.
 *   NO color-changing mechanism — wrong-color hits just show "NO EFFECT!"
 *   CMY drop orbs (C→Red, M→Green, Y→Blue). Orbs convert to ammo crystals.
 *
 * LEVEL 2 — RGB + Full Chromatic War:
 *   Phases 1-4: Red, Green, Blue troops introduced.
 *   FULL color-changing mechanism ACTIVE (TRANSFORM hits work).
 *   Mixed CMY + RGB battles. Bigger waves.
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
  }

  // ── LEVEL 1 ────────────────────────────────────────────────────────────────

  startLevel1() {
    this.level = 1;
    this.phase = 1;
    this.cleared = false;
    this.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    // Disable color-changing for Level 1
    this.game.colorChangingEnabled = false;
    this.initL1Phase1();
  }

  initL1Phase1() {
    this.phase = 1;
    this.game.ui.setObjective(
      "PHASE 1 — CYAN INFILTRATORS",
      "Use RED laser [1] to destroy Cyan troops! Cyan troops drop Red Orbs."
    );
    this.game.spawnEnemy(3317, 1425, 'CYAN');
    this.game.spawnEnemy(2385, 1300, 'CYAN');
    this.enemiesRemainingInPhase = 2;
  }

  initL1Phase2() {
    this.phase = 2;
    this.game.ui.setObjective(
      "PHASE 2 — MAGENTA TROOPERS",
      "Use GREEN laser [2] to destroy Magenta troops! Magenta troops drop Green Orbs."
    );
    this.game.spawnEnemy(3502, 2123, 'MAGENTA');
    this.game.spawnEnemy(2416, 2064, 'MAGENTA');
    this.enemiesRemainingInPhase = 2;
  }

  initL1Phase3() {
    this.phase = 3;
    this.game.ui.setObjective(
      "PHASE 3 — YELLOW SQUADRON",
      "Use BLUE laser [3] to eliminate Yellow troops! Yellow troops drop Blue Orbs."
    );
    this.game.spawnEnemy(1959, 1711, 'YELLOW');
    this.game.spawnEnemy(3695, 1692, 'YELLOW');
    this.enemiesRemainingInPhase = 2;
  }

  initL1Phase4() {
    this.phase = 4;
    this.game.ui.setObjective(
      "FINAL PHASE — CMY TRIAD ASSAULT!",
      "Cyan, Magenta & Yellow attack together! Use the RECHARGE STATION to stay armed!"
    );
    this.game.spawnEnemy(2864, 1103, 'CYAN');
    this.game.spawnEnemy(3502, 2123, 'MAGENTA');
    this.game.spawnEnemy(2894, 2434, 'YELLOW');
    this.game.spawnEnemy(2416, 2064, 'CYAN');
    this.game.spawnEnemy(1959, 1711, 'MAGENTA');
    this.enemiesRemainingInPhase = 5;
  }

  // ── LEVEL 2 ────────────────────────────────────────────────────────────────

  startLevel2() {
    this.level = 2;
    this.phase = 1;
    this.cleared = false;
    this.stats = { enemiesKilled: 0, orbsCrafted: 0, shotsFired: 0 };
    // Enable color-changing for Level 2
    this.game.colorChangingEnabled = true;
    this.initL2Phase1();
  }

  initL2Phase1() {
    this.phase = 1;
    this.game.ui.setObjective(
      "LEVEL 2 — RED LEGION ARRIVES!",
      "Use CYAN laser [4] to kill Red troops. Wrong color? They TRANSFORM! Green→Yellow, Blue→Magenta."
    );
    this.game.spawnEnemy(2350, 1300, 'RED');
    this.game.spawnEnemy(2400, 1720, 'RED');
    this.game.spawnEnemy(2800, 1500, 'RED');
    this.enemiesRemainingInPhase = 3;
  }

  initL2Phase2() {
    this.phase = 2;
    this.game.ui.setObjective(
      "PHASE 2 — GREEN CORPS ASSAULT!",
      "Use MAGENTA laser [5] to kill Green troops. Red→Yellow, Blue→Cyan if wrong!"
    );
    this.game.spawnEnemy(2850, 1450, 'GREEN');
    this.game.spawnEnemy(2950, 1680, 'GREEN');
    this.game.spawnEnemy(2600, 1550, 'GREEN');
    this.enemiesRemainingInPhase = 3;
  }

  initL2Phase3() {
    this.phase = 3;
    this.game.ui.setObjective(
      "PHASE 3 — BLUE LEGION ADVANCES!",
      "Use YELLOW laser [6] to kill Blue troops. Red→Magenta, Green→Cyan if wrong!"
    );
    this.game.spawnEnemy(2700, 1400, 'BLUE');
    this.game.spawnEnemy(3100, 1600, 'BLUE');
    this.game.spawnEnemy(2900, 1750, 'BLUE');
    this.enemiesRemainingInPhase = 3;
  }

  initL2Phase4() {
    this.phase = 4;
    this.game.ui.setObjective(
      "FINAL PHASE — FULL CHROMATIC WARFARE!",
      "All 6 colors! They TRANSFORM when hit wrong. Use all lasers [1-6] & Recharge Station!"
    );
    this.game.spawnEnemy(2200, 1310, 'RED');
    this.game.spawnEnemy(2150, 1750, 'GREEN');
    this.game.spawnEnemy(2650, 1450, 'BLUE');
    this.game.spawnEnemy(2700, 1700, 'CYAN');
    this.game.spawnEnemy(3150, 1550, 'MAGENTA');
    this.game.spawnEnemy(3300, 1650, 'YELLOW');
    this.game.spawnEnemy(2500, 1380, 'RED');
    this.game.spawnEnemy(2900, 1900, 'GREEN');
    this.enemiesRemainingInPhase = 8;
  }

  // ── Shared phase progression ───────────────────────────────────────────────

  onEnemyDefeated(enemy) {
    this.stats.enemiesKilled++;
    this.enemiesRemainingInPhase = Math.max(0, this.enemiesRemainingInPhase - 1);

    if (this.enemiesRemainingInPhase > 0) return;

    if (this.level === 1) {
      if (this.phase === 1) setTimeout(() => this.initL1Phase2(), 1000);
      else if (this.phase === 2) setTimeout(() => this.initL1Phase3(), 1000);
      else if (this.phase === 3) setTimeout(() => this.initL1Phase4(), 1200);
      else if (this.phase === 4) {
        this.cleared = true;
        this.game.onLevelComplete(1);
      }
    } else if (this.level === 2) {
      if (this.phase === 1) setTimeout(() => this.initL2Phase2(), 1000);
      else if (this.phase === 2) setTimeout(() => this.initL2Phase3(), 1000);
      else if (this.phase === 3) setTimeout(() => this.initL2Phase4(), 1200);
      else if (this.phase === 4) {
        this.cleared = true;
        this.game.onLevelComplete(2);
      }
    }
  }

  onOrbCrafted(orbColor, laserColor, resultColor) {
    this.stats.orbsCrafted++;
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.WaveDirector = WaveDirector;
