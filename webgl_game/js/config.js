/**
 * Light-Wars: Core Game Configuration & Color Interaction Rules
 */

const COLORS = {
  RED: {
    id: 'RED',
    name: 'Red',
    hex: '#FF2A4D',
    glow: 'rgba(255, 42, 77, 0.7)',
    complementary: 'CYAN',
    band: 'CYAN',
    isPrimary: true
  },
  GREEN: {
    id: 'GREEN',
    name: 'Green',
    hex: '#22E058',
    glow: 'rgba(34, 224, 88, 0.7)',
    complementary: 'MAGENTA',
    band: 'MAGENTA',
    isPrimary: true
  },
  BLUE: {
    id: 'BLUE',
    name: 'Blue',
    hex: '#2A85FF',
    glow: 'rgba(42, 133, 255, 0.7)',
    complementary: 'YELLOW',
    band: 'YELLOW',
    isPrimary: true
  },
  CYAN: {
    id: 'CYAN',
    name: 'Cyan',
    hex: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.7)',
    complementary: 'RED',
    band: 'RED',
    isPrimary: false
  },
  MAGENTA: {
    id: 'MAGENTA',
    name: 'Magenta',
    hex: '#FF2AD4',
    glow: 'rgba(255, 42, 212, 0.7)',
    complementary: 'GREEN',
    band: 'GREEN',
    isPrimary: false
  },
  YELLOW: {
    id: 'YELLOW',
    name: 'Yellow',
    hex: '#FFE600',
    glow: 'rgba(255, 230, 0, 0.7)',
    complementary: 'BLUE',
    band: 'BLUE',
    isPrimary: false
  },
  WHITE: {
    id: 'WHITE',
    name: 'White',
    hex: '#FFFFFF',
    glow: 'rgba(255, 255, 255, 0.9)',
    complementary: 'BLACK',
    band: 'BLACK'
  },
  BLACK: {
    id: 'BLACK',
    name: 'Black',
    hex: '#14141E',
    glow: 'rgba(40, 40, 55, 0.8)',
    complementary: 'WHITE',
    band: 'WHITE'
  }
};

// Enemy Combat Rules (Enemy Color + Laser Color -> Result)
// Result types: 'KILL', 'TRANSFORM', 'NONE'
const ENEMY_INTERACTIONS = {
  RED: {
    RED: { action: 'NONE' },
    GREEN: { action: 'TRANSFORM', target: 'YELLOW' },
    BLUE: { action: 'TRANSFORM', target: 'MAGENTA' },
    CYAN: { action: 'KILL' },
    MAGENTA: { action: 'NONE' },
    YELLOW: { action: 'NONE' }
  },
  CYAN: {
    RED: { action: 'KILL' },
    GREEN: { action: 'NONE' },
    BLUE: { action: 'NONE' },
    CYAN: { action: 'NONE' },
    MAGENTA: { action: 'TRANSFORM', target: 'BLUE' },
    YELLOW: { action: 'TRANSFORM', target: 'GREEN' }
  },
  GREEN: {
    RED: { action: 'TRANSFORM', target: 'YELLOW' },
    GREEN: { action: 'NONE' },
    BLUE: { action: 'TRANSFORM', target: 'CYAN' },
    CYAN: { action: 'NONE' },
    MAGENTA: { action: 'KILL' },
    YELLOW: { action: 'NONE' }
  },
  MAGENTA: {
    RED: { action: 'NONE' },
    GREEN: { action: 'KILL' },
    BLUE: { action: 'NONE' },
    CYAN: { action: 'TRANSFORM', target: 'BLUE' },
    MAGENTA: { action: 'NONE' },
    YELLOW: { action: 'TRANSFORM', target: 'RED' }
  },
  BLUE: {
    RED: { action: 'TRANSFORM', target: 'MAGENTA' },
    GREEN: { action: 'TRANSFORM', target: 'CYAN' },
    BLUE: { action: 'NONE' },
    CYAN: { action: 'NONE' },
    MAGENTA: { action: 'NONE' },
    YELLOW: { action: 'KILL' }
  },
  YELLOW: {
    RED: { action: 'NONE' },
    GREEN: { action: 'NONE' },
    BLUE: { action: 'KILL' },
    CYAN: { action: 'TRANSFORM', target: 'GREEN' },
    MAGENTA: { action: 'TRANSFORM', target: 'RED' },
    YELLOW: { action: 'NONE' }
  }
};

// Inverted Physics Combat Rules (when Black Boss light inversion is active:
// Cyan needs CYAN, Red needs RED, etc. Same-color kills, complementaries transform/deflect)
const ENEMY_INTERACTIONS_INVERTED = {
  RED: {
    RED: { action: 'KILL' },
    GREEN: { action: 'NONE' },
    BLUE: { action: 'NONE' },
    CYAN: { action: 'NONE' },
    MAGENTA: { action: 'NONE' },
    YELLOW: { action: 'NONE' }
  },
  CYAN: {
    RED: { action: 'NONE' },
    GREEN: { action: 'NONE' },
    BLUE: { action: 'NONE' },
    CYAN: { action: 'KILL' },
    MAGENTA: { action: 'NONE' },
    YELLOW: { action: 'NONE' }
  },
  GREEN: {
    RED: { action: 'NONE' },
    GREEN: { action: 'KILL' },
    BLUE: { action: 'NONE' },
    CYAN: { action: 'NONE' },
    MAGENTA: { action: 'NONE' },
    YELLOW: { action: 'NONE' }
  },
  MAGENTA: {
    RED: { action: 'NONE' },
    GREEN: { action: 'NONE' },
    BLUE: { action: 'NONE' },
    CYAN: { action: 'NONE' },
    MAGENTA: { action: 'KILL' },
    YELLOW: { action: 'NONE' }
  },
  BLUE: {
    RED: { action: 'NONE' },
    GREEN: { action: 'NONE' },
    BLUE: { action: 'KILL' },
    CYAN: { action: 'NONE' },
    MAGENTA: { action: 'NONE' },
    YELLOW: { action: 'NONE' }
  },
  YELLOW: {
    RED: { action: 'NONE' },
    GREEN: { action: 'NONE' },
    BLUE: { action: 'NONE' },
    CYAN: { action: 'NONE' },
    MAGENTA: { action: 'NONE' },
    YELLOW: { action: 'KILL' }
  }
};

// Enemy death -> Orb drop mapping
// (Cyan, Magenta, Yellow drop Red, Green, Blue orbs;
//  Red, Green, Blue drop Cyan, Magenta, Yellow orbs!)
const ENEMY_ORB_DROPS = {
  CYAN: 'RED',
  MAGENTA: 'GREEN',
  YELLOW: 'BLUE',
  RED: 'CYAN',
  GREEN: 'MAGENTA',
  BLUE: 'YELLOW'
};

// Orb + Laser Shot -> New Laser Shot Conversion
// Key format: `${orbColor}_${laserColor}`
// Full Light Physics & Additive Color Mixing Rules:
// 1. Primary + Primary additive mixing:
//    Red + Green = Yellow, Red + Blue = Magenta, Green + Blue = Cyan
// 2. Complementary Light Pairs (R+C, G+M, B+Y) neutralize into pure WHITE light:
//    Red + Cyan = WHITE, Green + Magenta = WHITE, Blue + Yellow = WHITE
// 3. Subtractive Orb + Primary Laser wavelength absorption:
//    Cyan (G+B) + Green = Blue, Cyan (G+B) + Blue = Green
//    Magenta (R+B) + Red = Blue, Magenta (R+B) + Blue = Red
//    Yellow (R+G) + Red = Green, Yellow (R+G) + Green = Red
// 4. Secondary + Secondary mixing:
//    Cyan + Magenta = Blue, Cyan + Yellow = Green, Magenta + Yellow = Red
const ORB_CONVERSIONS = {
  // ── RED ORB (R) ──────────────────────────
  'RED_GREEN': 'YELLOW',    // R + G = Yellow
  'RED_BLUE': 'MAGENTA',    // R + B = Magenta
  'RED_CYAN': 'WHITE',      // Complementary: R + C = WHITE!
  'RED_YELLOW': 'GREEN',    // R + Y (R+G) = Green
  'RED_MAGENTA': 'BLUE',    // R + M (R+B) = Blue

  // ── GREEN ORB (G) ────────────────────────
  'GREEN_RED': 'YELLOW',    // G + R = Yellow
  'GREEN_BLUE': 'CYAN',     // G + B = Cyan
  'GREEN_MAGENTA': 'WHITE', // Complementary: G + M = WHITE!
  'GREEN_YELLOW': 'RED',    // G + Y (R+G) = Red
  'GREEN_CYAN': 'BLUE',     // G + C (G+B) = Blue

  // ── BLUE ORB (B) ─────────────────────────
  'BLUE_RED': 'MAGENTA',    // B + R = Magenta
  'BLUE_GREEN': 'CYAN',     // B + G = Cyan
  'BLUE_YELLOW': 'WHITE',   // Complementary: B + Y = WHITE!
  'BLUE_CYAN': 'GREEN',     // B + C (G+B) = Green
  'BLUE_MAGENTA': 'RED',    // B + M (R+B) = Red

  // ── CYAN ORB (C = G + B) ─────────────────
  'CYAN_RED': 'WHITE',      // Complementary: C + R = WHITE!
  'CYAN_GREEN': 'BLUE',     // (G+B) - G = Blue
  'CYAN_BLUE': 'GREEN',     // (G+B) - B = Green
  'CYAN_MAGENTA': 'BLUE',   // C (G+B) + M (R+B) = Blue shared
  'CYAN_YELLOW': 'GREEN',   // C (G+B) + Y (R+G) = Green shared

  // ── MAGENTA ORB (M = R + B) ──────────────
  'MAGENTA_GREEN': 'WHITE', // Complementary: M + G = WHITE!
  'MAGENTA_RED': 'BLUE',    // (R+B) - R = Blue
  'MAGENTA_BLUE': 'RED',    // (R+B) - B = Red
  'MAGENTA_CYAN': 'BLUE',   // M (R+B) + C (G+B) = Blue shared
  'MAGENTA_YELLOW': 'RED',   // M (R+B) + Y (R+G) = Red shared

  // ── YELLOW ORB (Y = R + G) ───────────────
  'YELLOW_BLUE': 'WHITE',   // Complementary: Y + B = WHITE!
  'YELLOW_RED': 'GREEN',    // (R+G) - R = Green
  'YELLOW_GREEN': 'RED',    // (R+G) - G = Red
  'YELLOW_CYAN': 'GREEN',   // Y (R+G) + C (G+B) = Green shared
  'YELLOW_MAGENTA': 'RED'   // Y (R+G) + M (R+B) = Red shared
};

// Comic death words
const COMIC_DEATH_WORDS = ['KAABOOM!', 'BOOM!', '1CO!', 'POW!', 'ZAP!', 'CRASH!'];

// Game Tunings
const GAME_CONFIG = {
  arenaWidth: 1536,
  arenaHeight: 1024,
  maxAmmoPerType: 6,
  playerSpeed: 140, // Decreased to 80% (was 175)
  playerDashSpeed: 420,
  playerDashDuration: 0.22,
  playerDashCooldown: 1.2,
  playerMaxHealth: 100,
  normalBulletDamage: 10,   // HP damage dealt by normal (colored) enemy bullets
  blackBulletDamage: 15,    // HP damage dealt by BLACK homing bullets
  passiveRegenAmount: 20,   // HP healed per passive regen tick (anywhere)
  passiveRegenInterval: 5.0, // Seconds between each passive regen tick
  ammoRechargeRate: 1.0,    // Seconds between each +1 ammo recharge tick at pad
  laserSpeed: 487.5, // Decreased to 75% (was 650)
  enemyLaserSpeed: 315, // Decreased to 75% (was 420)
  bossLaserSpeed: 232.5, // Decreased to 75% (was 310)
  laserLifetime: 1.6,
  laserCooldown: 0.22,
  playerKnockbackSpeed: 102, // Decreased to 30% (was 340)
  enemyKnockbackSpeed: 42, // Decreased to 30% (was 140)
  bossKnockbackSpeed: 36, // Decreased to 30% (was 120)
  whiteLightRadius: 50,
  refillRate: 1.0, // seconds to fully refill RGB

  // Enemy Combat & Dodging Module Configuration
  enemyDodgingEnabled: false, // Commented out / disabled
  enemyDodgeDetectionRadius: 180, // Distance to incoming player laser to trigger dodge
  enemyDodgeSpeed: 140, // Impulse speed when dodging
  enemyDodgeCooldown: 2.2, // Minimum seconds between dodges per enemy
  enemyDodgeChance: 0.75 // 75% reaction chance on incoming lethal/threat lasers
};

window.LightWars = window.LightWars || {};
window.LightWars.COLORS = COLORS;
window.LightWars.ENEMY_INTERACTIONS = ENEMY_INTERACTIONS;
window.LightWars.ENEMY_INTERACTIONS_INVERTED = ENEMY_INTERACTIONS_INVERTED;
window.LightWars.ENEMY_ORB_DROPS = ENEMY_ORB_DROPS;
window.LightWars.ORB_CONVERSIONS = ORB_CONVERSIONS;
window.LightWars.COMIC_DEATH_WORDS = COMIC_DEATH_WORDS;
window.LightWars.GAME_CONFIG = GAME_CONFIG;
