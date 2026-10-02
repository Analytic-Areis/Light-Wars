/**
 * Light-Wars: Level 1 Wave Progression Director
 * Introduces Cyan enemies, Red Orb drops, Orb laser crafting, Green enemies, Red enemies, and the full combat loop.
 */

class WaveDirector {
  constructor(game) {
    this.game = game;
    this.phase = 1;
    this.phaseTimer = 0;
    this.cleared = false;
    this.spawnQueue = [];
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
      "PHASE 1: THE CYAN ENCOUNTER",
      "Press [1] for RED Laser. Red Laser destroys Cyan enemies!"
    );
    // Spawn 2 Cyan enemies
    this.game.spawnEnemy(750, 400, 'CYAN');
    this.game.spawnEnemy(750, 700, 'CYAN');
    this.enemiesRemainingInPhase = 2;
  }

  initPhase2() {
    this.phase = 2;
    this.game.ui.setObjective(
      "PHASE 2: MAGENTA TROOP",
      "Press [2] for GREEN Laser (or craft Magenta via Red Orb + Blue Laser) to defeat Magenta troop!"
    );
    this.game.spawnEnemy(950, 550, 'MAGENTA');
    this.enemiesRemainingInPhase = 1;
  }

  initPhase3() {
    this.phase = 3;
    this.game.ui.setObjective(
      "PHASE 3: YELLOW TROOP",
      "Yellow troop approaches! Press [3] for BLUE Laser to eliminate it!"
    );
    this.game.spawnEnemy(1050, 550, 'YELLOW');
    this.enemiesRemainingInPhase = 1;
  }

  initPhase4() {
    this.phase = 4;
    this.game.ui.setObjective(
      "CLIMAX WAVE: CHROMATIC SHOWDOWN",
      "Cyan, Magenta, and Yellow troops attack! Use WHITE LIGHT at spawn to recharge RGB ammo!"
    );
    // Spawn Cyan, Magenta, Yellow troops
    this.game.spawnEnemy(850, 320, 'CYAN');
    this.game.spawnEnemy(1050, 550, 'MAGENTA');
    this.game.spawnEnemy(900, 720, 'YELLOW');
    this.enemiesRemainingInPhase = 3;
  }

  onEnemyDefeated(enemy) {
    this.stats.enemiesKilled++;
    this.enemiesRemainingInPhase = Math.max(0, this.enemiesRemainingInPhase - 1);

    if (this.phase === 1 && this.enemiesRemainingInPhase <= 0) {
      setTimeout(() => this.initPhase2(), 1000);
    } else if (this.phase === 2 && this.enemiesRemainingInPhase <= 0) {
      setTimeout(() => this.initPhase3(), 1000);
    } else if (this.phase === 3 && this.enemiesRemainingInPhase <= 0) {
      setTimeout(() => this.initPhase4(), 1200);
    } else if (this.phase === 4 && this.enemiesRemainingInPhase <= 0) {
      this.cleared = true;
      this.game.onLevelComplete();
    }
  }

  onOrbCrafted(orbColor, laserColor, resultColor) {
    this.stats.orbsCrafted++;

    if ((this.phase === 1 || this.phase === 2) && resultColor === 'MAGENTA') {
      setTimeout(() => this.initPhase2Combat(), 800);
    } else if ((this.phase === 2.5 || this.phase === 3) && resultColor === 'CYAN') {
      setTimeout(() => this.initPhase3Combat(), 800);
    }
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.WaveDirector = WaveDirector;
