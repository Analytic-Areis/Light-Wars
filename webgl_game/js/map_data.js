/**
 * ============================================================================
 * LIGHT-WARS: MAP CONFIGURATION & CONSTRAINTS
 * ============================================================================
 * Centralized configuration file for the game map. Edit map dimensions,
 * asset path, spawn positions, sanctuary station, and boundary limits here.
 */

window.LightWars = window.LightWars || {};

window.LightWars.MAP_CONFIG = {
  // Path to the arena map image (relative to game root)
  imageSrc: 'assets/map.png',

  // Native non-stretched dimensions of the map image (map.png is 5840 x 3112)
  width: 5840,
  height: 3112,
  scale: 1.0,

  // BOUNDARIES & COLLISIONS:
  // Set to true to freely roam everywhere across the map without walls or barriers.
  // Set to false when you want to enforce boundary wall collision.
  ignoreBoundaries: true,

  // Custom coordinate boundaries (used when ignoreBoundaries is false)
  bounds: {
    minX: 0,
    minY: 0,
    maxX: 5840,
    maxY: 3112
  },

  // Player spawn coordinates (defaults to the center of the arena floor)
  spawn: {
    x: 2920,
    y: 1640
  },

  // Radiant Recharge Sanctuary (White Light station)
  whiteLight: {
    x: 2920,
    y: 1640,
    radius: 120
  },

  // 2.5D OCCLUSION WALLS & WINDOWS
  // silhouetteAlpha: Opacity of the subtle X-Ray hologram when behind solid walls (0.0 to 1.0)
  // Set lower (e.g. 0.15) to make Luke barely visible, or 0.0 to make him completely invisible.
  silhouetteAlpha: 0.15,

  // Add walls or windows here. Any entity standing behind them (y < wall.y)
  // will be occluded by solid walls, or partially visible through windows & archways.
  walls: [
    // Demonstration wall set near spawn:
    // Solid sci-fi wall
    {
      type: 'WALL',
      sprite: 'assets/tileset/04_sci_fi_wall_straight.png',
      x: 2750,
      y: 1520,
      width: 217,
      height: 218
    },
    // Space Window (Luke's body shows through glass pane!)
    {
      type: 'WINDOW',
      sprite: 'assets/tileset/06_space_window_wall.png',
      x: 2920,
      y: 1440,
      width: 207,
      height: 232
    },
    // Archway doorframe (Luke shows through the doorway opening!)
    {
      type: 'ARCHWAY',
      sprite: 'assets/tileset/08_archway_doorframe.png',
      x: 3090,
      y: 1360,
      width: 213,
      height: 239
    }
  ]
};

// Sync global GAME_CONFIG dimensions if already loaded
if (window.LightWars.GAME_CONFIG) {
  window.LightWars.GAME_CONFIG.arenaWidth = window.LightWars.MAP_CONFIG.width;
  window.LightWars.GAME_CONFIG.arenaHeight = window.LightWars.MAP_CONFIG.height;
}

// Backward-compatibility alias for systems querying LEVEL1_MAP_DATA
window.LightWars.LEVEL1_MAP_DATA = window.LightWars.MAP_CONFIG;
