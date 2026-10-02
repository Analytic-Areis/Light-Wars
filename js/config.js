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
    glow: 'rgba(255, 255, 255, 0.9)'
  },
  BLACK: {
    id: 'BLACK',
    name: 'Black',
    hex: '#14141E',
    glow: 'rgba(40, 40, 55, 0.8)'
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

// Enemy death -> Orb drop mapping
const ENEMY_ORB_DROPS = {
  MAGENTA: 'GREEN',
  YELLOW: 'BLUE',
  CYAN: 'RED',
  RED: 'CYAN',      // For consistency in higher waves/invert mode
  GREEN: 'MAGENTA',
  BLUE: 'YELLOW'
};

// Orb + Laser Shot -> New Laser Shot Conversion
// Key format: `${orbColor}_${laserColor}`
const ORB_CONVERSIONS = {
  // Green Orb:
  'GREEN_RED': 'YELLOW',
  'GREEN_BLUE': 'CYAN',
  // Red Orb:
  'RED_GREEN': 'YELLOW',
  'RED_BLUE': 'MAGENTA',
  // Blue Orb:
  'BLUE_RED': 'MAGENTA',
  'BLUE_GREEN': 'CYAN',

  // White laser unlocks (post-Black boss):
  'RED_CYAN': 'WHITE',
  'GREEN_MAGENTA': 'WHITE',
  'BLUE_YELLOW': 'WHITE'
};

// Comic death words
const COMIC_DEATH_WORDS = ['KAABOOM!', 'BOOM!', '1CO!', 'POW!', 'ZAP!', 'CRASH!'];

// Game Tunings
const GAME_CONFIG = {
  arenaWidth: 1600,
  arenaHeight: 1100,
  maxAmmoPerType: 6,
  playerSpeed: 300,
  playerDashSpeed: 680,
  playerDashDuration: 0.22,
  playerDashCooldown: 1.2,
  playerMaxHealth: 3,
  laserSpeed: 750,
  laserLifetime: 1.4,
  laserCooldown: 0.22,
  whiteLightRadius: 90,
  refillRate: 1.0 // seconds to fully refill RGB
};

window.LightWars = window.LightWars || {};
window.LightWars.COLORS = COLORS;
window.LightWars.ENEMY_INTERACTIONS = ENEMY_INTERACTIONS;
window.LightWars.ENEMY_ORB_DROPS = ENEMY_ORB_DROPS;
window.LightWars.ORB_CONVERSIONS = ORB_CONVERSIONS;
window.LightWars.COMIC_DEATH_WORDS = COMIC_DEATH_WORDS;
window.LightWars.GAME_CONFIG = GAME_CONFIG;
