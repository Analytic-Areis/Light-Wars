/**
 * Light-Wars: Modular Wave Director
 * Coordinates levels 1, 2, and 3 via dedicated level directors:
 *   - Level1Director (js/lvl1.js)
 *   - Level2Director (js/lvl2.js)
 *   - Level3Director (js/lvl3.js)
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

    // Instantiate level modular directors
    this.lvl1 = new window.LightWars.Level1Director(this);
    this.lvl2 = new window.LightWars.Level2Director(this);
    this.lvl3 = new window.LightWars.Level3Director(this);

    // Current active level director
    this.currentDirector = this.lvl1;
  }

  // Helper to spawn enemy in arena screen coordinates
  spawnAt(col, row, colorId) {
    if (this.game.arena && this.game.arena.toScreen) {
      const pos = this.game.arena.toScreen(col + 0.5, row + 0.5);
      return this.game.spawnEnemy(pos.x, pos.y, colorId);
    } else {
      return this.game.spawnEnemy(col, row, colorId);
    }
  }

  // Getters & setters to maintain complete backwards compatibility
  get l1Subwave() {
    return this.lvl1 ? this.lvl1.l1Subwave : 'CYAN';
  }
  set l1Subwave(val) {
    if (this.lvl1) this.lvl1.l1Subwave = val;
  }

  get l2PairStep() {
    return this.lvl2 ? this.lvl2.l2PairStep : 0;
  }
  set l2PairStep(val) {
    if (this.lvl2) this.lvl2.l2PairStep = val;
  }

  get bossRef() {
    return this.lvl3 ? this.lvl3.bossRef : null;
  }
  set bossRef(val) {
    if (this.lvl3) this.lvl3.bossRef = val;
  }

  get seenInversionExplanation() {
    return this.lvl3 ? this.lvl3.seenInversionExplanation : false;
  }
  set seenInversionExplanation(val) {
    if (this.lvl3) this.lvl3.seenInversionExplanation = val;
  }

  get seen15sWarning() {
    return this.lvl3 ? this.lvl3.seen15sWarning : false;
  }
  set seen15sWarning(val) {
    if (this.lvl3) this.lvl3.seen15sWarning = val;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Level Launchers
  // ═════════════════════════════════════════════════════════════════════════════

  startLevel1() {
    this.currentDirector = this.lvl1;
    this.lvl1.start();
  }

  startLevel2() {
    this.currentDirector = this.lvl2;
    this.lvl2.start();
  }

  startLevel3() {
    this.currentDirector = this.lvl3;
    this.lvl3.start();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Event Delegation
  // ═════════════════════════════════════════════════════════════════════════════

  update(dt) {
    if (this.currentDirector && typeof this.currentDirector.update === 'function') {
      this.currentDirector.update(dt);
    }
  }

  onEnemyDefeated(enemy, laserColor) {
    this.stats.enemiesKilled++;
    if (this.currentDirector && typeof this.currentDirector.onEnemyDefeated === 'function') {
      this.currentDirector.onEnemyDefeated(enemy, laserColor);
    }
  }

  onEnemyTransform(enemy, prevColor, newColor, laserColor) {
    if (this.currentDirector && typeof this.currentDirector.onEnemyTransform === 'function') {
      this.currentDirector.onEnemyTransform(enemy, prevColor, newColor, laserColor);
    }
  }

  onOrbCrafted(orbColor, laserColor, resultColor) {
    this.stats.orbsCrafted++;
    if (this.currentDirector && typeof this.currentDirector.onOrbCrafted === 'function') {
      this.currentDirector.onOrbCrafted(orbColor, laserColor, resultColor);
    }
  }

  onBlackBarrelDestroyed(dropX, dropY) {
    if (this.lvl1 && typeof this.lvl1.onBlackBarrelDestroyed === 'function') {
      this.lvl1.onBlackBarrelDestroyed(dropX, dropY);
    }
  }

  onDashPowerupCollected() {
    if (this.lvl1 && typeof this.lvl1.onDashPowerupCollected === 'function') {
      this.lvl1.onDashPowerupCollected();
    }
  }

  onInvertPowerupCollected() {
    if (this.lvl3 && typeof this.lvl3.onInvertPowerupCollected === 'function') {
      this.lvl3.onInvertPowerupCollected();
    }
  }

  onBossPhysicsInversionActivated() {
    if (this.lvl3 && typeof this.lvl3.onBossPhysicsInversionActivated === 'function') {
      this.lvl3.onBossPhysicsInversionActivated();
    }
  }

  onBossHit(remainingHp) {
    if (this.lvl3 && typeof this.lvl3.onBossHit === 'function') {
      this.lvl3.onBossHit(remainingHp);
    }
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.WaveDirector = WaveDirector;
