/**
 * Light-Wars: Level 1 Wave Progression Director
 * Supports all 8 Phases including Cyan, Magenta, Yellow, Red, Green, Blue troops
 * and the climactic 6-troop chromatic battle.
 */

class WaveDirector {
  constructor(game) {
    this.game = game;
    this.phase = 1;
    this.cleared = false;
    this.enemiesRemainingInPhase = 0;
    this.stats = {
      enemiesKilled: 0,
      orbsCrafted: 0,
      shotsFired: 0
    };
  }

  startLevel1() {
    this.phase = 1;
    this.cleared = false;
    this.initPhase1();
  }

  initPhase1() {
    this.phase = 1;
    this.game.ui.setObjective(
      "PHASE 1: CYAN TROOPS INBOUND",
      "Press [1] for RED Laser. Red Laser annihilates Cyan troops! (Cyan drops RED Orbs)"
    );
    this.game.spawnEnemy(2180, 1310, 'CYAN');
    this.game.spawnEnemy(2100, 1750, 'CYAN');
    this.enemiesRemainingInPhase = 2;
  }

  initPhase2() {
    this.phase = 2;
    this.game.ui.setObjective(
      "PHASE 2: MAGENTA TROOPS ARRIVING",
      "Press [2] for GREEN Laser to defeat Magenta! (Magenta drops GREEN Orbs)"
    );
    this.game.spawnEnemy(2600, 1420, 'MAGENTA');
    this.game.spawnEnemy(2550, 1780, 'MAGENTA');
    this.enemiesRemainingInPhase = 2;
  }

  initPhase3() {
    this.phase = 3;
    this.game.ui.setObjective(
      "PHASE 3: YELLOW TROOP INVASION",
      "Press [3] for BLUE Laser to eliminate Yellow! (Yellow drops BLUE Orbs)"
    );
    this.game.spawnEnemy(3100, 1500, 'YELLOW');
    this.enemiesRemainingInPhase = 1;
  }

  initPhase4() {
    this.phase = 4;
    this.game.ui.setObjective(
      "PHASE 4: CMY TRIAD BATTLE",
      "Cyan, Magenta, and Yellow troops attack together! Use the RECHARGE STATION to recharge!"
    );
    this.game.spawnEnemy(2300, 1350, 'CYAN');
    this.game.spawnEnemy(2700, 1600, 'MAGENTA');
    this.game.spawnEnemy(3050, 1650, 'YELLOW');
    this.enemiesRemainingInPhase = 3;
  }

  initPhase5() {
    this.phase = 5;
    this.game.ui.setObjective(
      "PHASE 5: CRIMSON RED CORPS INBOUND",
      "Press [4] for CYAN Laser to defeat Red troops! (Red troops drop nothing)"
    );
    this.game.spawnEnemy(2350, 1300, 'RED');
    this.game.spawnEnemy(2400, 1720, 'RED');
    this.enemiesRemainingInPhase = 2;
  }

  initPhase6() {
    this.phase = 6;
    this.game.ui.setObjective(
      "PHASE 6: EMERALD GREEN TROOP ASSAULT",
      "Press [5] for MAGENTA Laser to extinguish Green troops! (Green troops drop nothing)"
    );
    this.game.spawnEnemy(2850, 1450, 'GREEN');
    this.game.spawnEnemy(2950, 1680, 'GREEN');
    this.enemiesRemainingInPhase = 2;
  }

  initPhase7() {
    this.phase = 7;
    this.game.ui.setObjective(
      "PHASE 7: COBALT BLUE LEGION ADVANCING",
      "Press [6] for YELLOW Laser to vanquish Blue troops! (Blue troops drop nothing)"
    );
    this.game.spawnEnemy(2700, 1400, 'BLUE');
    this.game.spawnEnemy(3100, 1600, 'BLUE');
    this.enemiesRemainingInPhase = 2;
  }

  initPhase8() {
    this.phase = 8;
    this.game.ui.setObjective(
      "FINAL SHOWDOWN: FULL CHROMATIC WARFARE!",
      "All 6 troop colors converge! Use your full laser arsenal [1-6] & Sanctuary!"
    );
    this.game.spawnEnemy(2200, 1310, 'RED');
    this.game.spawnEnemy(2150, 1750, 'GREEN');
    this.game.spawnEnemy(2650, 1450, 'BLUE');
    this.game.spawnEnemy(2700, 1700, 'CYAN');
    this.game.spawnEnemy(3150, 1550, 'MAGENTA');
    this.game.spawnEnemy(3300, 1650, 'YELLOW');
    this.enemiesRemainingInPhase = 6;
  }

  onEnemyDefeated(enemy) {
    this.stats.enemiesKilled++;
    this.enemiesRemainingInPhase = Math.max(0, this.enemiesRemainingInPhase - 1);

    if (this.enemiesRemainingInPhase <= 0) {
      if (this.phase === 1) setTimeout(() => this.initPhase2(), 1000);
      else if (this.phase === 2) setTimeout(() => this.initPhase3(), 1000);
      else if (this.phase === 3) setTimeout(() => this.initPhase4(), 1000);
      else if (this.phase === 4) setTimeout(() => this.initPhase5(), 1000);
      else if (this.phase === 5) setTimeout(() => this.initPhase6(), 1000);
      else if (this.phase === 6) setTimeout(() => this.initPhase7(), 1000);
      else if (this.phase === 7) setTimeout(() => this.initPhase8(), 1200);
      else if (this.phase === 8) {
        this.cleared = true;
        this.game.onLevelComplete();
      }
    }
  }

  onOrbCrafted(orbColor, laserColor, resultColor) {
    this.stats.orbsCrafted++;
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.WaveDirector = WaveDirector;
