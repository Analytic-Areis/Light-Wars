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
    // If player already crafted Magenta, proceed directly to combat
    if (this.game.player && this.game.player.ammo.MAGENTA > 0) {
      this.initPhase2Combat();
      return;
    }

    // Ensure there is at least one Red Orb in the arena
    const hasRedOrb = this.game.orbs.some(o => o.alive && o.colorId === 'RED');
    if (!hasRedOrb) {
      this.game.spawnOrb(600, 550, 'RED');
    }

    this.game.ui.setObjective(
      "PHASE 2: ORB SYNTHESIS",
      "Shoot the RED ORB with BLUE Laser [3] to craft MAGENTA Ammo!"
    );
  }

  initPhase2Combat() {
    this.phase = 2.5;
    this.game.ui.setObjective(
      "PHASE 2: GREEN THREAT",
      "Select MAGENTA Laser [5] to eliminate the Green enemy!"
    );
    this.game.spawnEnemy(950, 550, 'GREEN');
    this.enemiesRemainingInPhase = 1;
  }

  initPhase3() {
    this.phase = 3;
    // If player already crafted Cyan, proceed directly to combat
    if (this.game.player && this.game.player.ammo.CYAN > 0) {
      this.initPhase3Combat();
      return;
    }

    // Ensure there is at least one Green Orb
    const hasGreenOrb = this.game.orbs.some(o => o.alive && o.colorId === 'GREEN');
    if (!hasGreenOrb) {
      this.game.spawnOrb(650, 550, 'GREEN');
    }

    this.game.ui.setObjective(
      "PHASE 3: CHAIN SYNTHESIS",
      "Shoot GREEN ORB with BLUE Laser [3] to craft CYAN Ammo!"
    );
  }

  initPhase3Combat() {
    this.phase = 3.5;
    this.game.ui.setObjective(
      "PHASE 3: RED ARMORED BRAWLER",
      "Select CYAN Laser [4] to destroy the Red enemy!"
    );
    this.game.spawnEnemy(1050, 550, 'RED');
    this.enemiesRemainingInPhase = 1;
  }

  initPhase4() {
    this.phase = 4;
    this.game.ui.setObjective(
      "CLIMAX WAVE: CHROMATIC SHOWDOWN",
      "Eliminate all hostiles! Return to WHITE LIGHT if you need to recharge RGB ammo!"
    );
    // Spawn mixed squad
    this.game.spawnEnemy(850, 300, 'CYAN');
    this.game.spawnEnemy(1000, 450, 'GREEN');
    this.game.spawnEnemy(950, 680, 'RED');
    this.game.spawnEnemy(1150, 550, 'CYAN');
    this.enemiesRemainingInPhase = 4;
  }

  onEnemyDefeated(enemy) {
    this.stats.enemiesKilled++;
    this.enemiesRemainingInPhase = Math.max(0, this.enemiesRemainingInPhase - 1);

    if (this.phase === 1 && this.enemiesRemainingInPhase <= 0) {
      setTimeout(() => this.initPhase2(), 1000);
    } else if (this.phase === 2.5 && this.enemiesRemainingInPhase <= 0) {
      setTimeout(() => this.initPhase3(), 1000);
    } else if (this.phase === 3.5 && this.enemiesRemainingInPhase <= 0) {
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
