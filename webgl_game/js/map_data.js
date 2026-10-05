/**
 * LIGHT-WARS: MAP CONFIGURATION & CONSTRAINTS
 */
window.LightWars = window.LightWars || {};

window.LightWars.MAP_CONFIG = {
  imageSrc: 'assets/map.png',
  width: 6520,
  height: 3688,
  scale: 1.0,
  ignoreBoundaries: true, 
  bounds: {
    minX: 0,
    minY: 0,
    maxX: 6520,
    maxY: 3688
  },
  spawn: {
    x: 3260,
    y: 1768
  },
  whiteLight: {
    x: 3260,
    y: 1768,
    radius: 120
  },
  silhouetteAlpha: 0.15,
  walls: [
    {
        "type": "ARCHWAY",
        "sprite": "assets/tileset/08_archway_doorframe_west.png",
        "x": 4155,
        "y": 1220.8,
        "width": 214,
        "height": 228,
        "c": 8,
        "r": 1,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 4314,
        "y": 1227.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 1,
        "facing": "east"
    },
    {
        "type": "WINDOW",
        "sprite": "assets/tileset/06_space_window_wall_west.png",
        "x": 4295,
        "y": 1296.95,
        "width": 214,
        "height": 227,
        "c": 9,
        "r": 1,
        "facing": "west"
    },
    {
        "type": "ARCHWAY",
        "sprite": "assets/tileset/08_archway_doorframe_west.png",
        "x": 4435,
        "y": 1372.8,
        "width": 214,
        "height": 228,
        "c": 10,
        "r": 1,
        "facing": "west"
    },
    {
        "type": "WINDOW",
        "sprite": "assets/tileset/06_space_window_wall_east.png",
        "x": 4163,
        "y": 1304.9,
        "width": 171,
        "height": 174,
        "c": 8,
        "r": 2,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 4034,
        "y": 1379.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 3,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 3894,
        "y": 1455.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 4,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 3754,
        "y": 1531.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 5,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 3614,
        "y": 1607.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 6,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 3186,
        "y": 1607.85,
        "width": 192,
        "height": 181,
        "c": 7,
        "r": 7,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 3334,
        "y": 1607.85,
        "width": 192,
        "height": 181,
        "c": 7,
        "r": 7,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 3746,
        "y": 1911.85,
        "width": 192,
        "height": 181,
        "c": 11,
        "r": 7,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 2206,
        "y": 1227.85,
        "width": 192,
        "height": 181,
        "c": 1,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "ARCHWAY",
        "sprite": "assets/tileset/08_archway_doorframe_east.png",
        "x": 2365,
        "y": 1220.8,
        "width": 214,
        "height": 228,
        "c": 1,
        "r": 8,
        "facing": "east"
    },
    {
        "type": "WINDOW",
        "sprite": "assets/tileset/06_space_window_wall_west.png",
        "x": 2335,
        "y": 1296.95,
        "width": 214,
        "height": 227,
        "c": 2,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 2486,
        "y": 1379.85,
        "width": 192,
        "height": 181,
        "c": 3,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 2626,
        "y": 1455.85,
        "width": 192,
        "height": 181,
        "c": 4,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 2766,
        "y": 1531.85,
        "width": 192,
        "height": 181,
        "c": 5,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 2906,
        "y": 1607.85,
        "width": 192,
        "height": 181,
        "c": 6,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 3746,
        "y": 2063.85,
        "width": 192,
        "height": 181,
        "c": 12,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 3886,
        "y": 2139.85,
        "width": 192,
        "height": 181,
        "c": 13,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 4026,
        "y": 2215.85,
        "width": 192,
        "height": 181,
        "c": 14,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 4166,
        "y": 2291.85,
        "width": 192,
        "height": 181,
        "c": 15,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WINDOW",
        "sprite": "assets/tileset/06_space_window_wall_west.png",
        "x": 4295,
        "y": 2360.95,
        "width": 214,
        "height": 227,
        "c": 16,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_west.png",
        "x": 4446,
        "y": 2443.85,
        "width": 192,
        "height": 181,
        "c": 17,
        "r": 8,
        "facing": "west"
    },
    {
        "type": "WINDOW",
        "sprite": "assets/tileset/06_space_window_wall_east.png",
        "x": 2203,
        "y": 1304.9,
        "width": 171,
        "height": 174,
        "c": 1,
        "r": 9,
        "facing": "east"
    },
    {
        "type": "ARCHWAY",
        "sprite": "assets/tileset/08_archway_doorframe_east.png",
        "x": 2085,
        "y": 1372.8,
        "width": 214,
        "height": 228,
        "c": 1,
        "r": 10,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 2774,
        "y": 1911.85,
        "width": 192,
        "height": 181,
        "c": 7,
        "r": 11,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 2774,
        "y": 2063.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 12,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 2634,
        "y": 2139.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 13,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 2494,
        "y": 2215.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 14,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 2354,
        "y": 2291.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 15,
        "facing": "east"
    },
    {
        "type": "WINDOW",
        "sprite": "assets/tileset/06_space_window_wall_east.png",
        "x": 2203,
        "y": 2368.9,
        "width": 171,
        "height": 174,
        "c": 8,
        "r": 16,
        "facing": "east"
    },
    {
        "type": "WALL",
        "sprite": "assets/tileset/04_sci_fi_wall_straight_east.png",
        "x": 2074,
        "y": 2443.85,
        "width": 192,
        "height": 181,
        "c": 8,
        "r": 17,
        "facing": "east"
    }
]
};

if (window.LightWars.GAME_CONFIG) {
  window.LightWars.GAME_CONFIG.arenaWidth = window.LightWars.MAP_CONFIG.width;
  window.LightWars.GAME_CONFIG.arenaHeight = window.LightWars.MAP_CONFIG.height;
}
window.LightWars.LEVEL1_MAP_DATA = window.LightWars.MAP_CONFIG;
