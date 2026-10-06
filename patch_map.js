const fs = require('fs');
const finalArena = JSON.parse(fs.readFileSync('./webgl_game/assets/map_stuff/final_arena.json'));
let mapData = fs.readFileSync('./webgl_game/js/map_data.js', 'utf8');

// The original map config string up to blocked array
let newConfig = `{
  "title": "White Boss Arena (Level 4)",
  "imageSrc": "assets/map_stuff/Assets_inesh/White_boss/map4and5.png",
  "width": 1600,
  "height": 1040,
  "scale": 1.0,
  "cols": ${finalArena.cols},
  "rows": ${finalArena.rows},
  "corners": ${JSON.stringify(finalArena.corners)},
  "spawn": { "c": ${finalArena.spawn[0]}, "r": ${finalArena.spawn[1]}, "x": 691.3, "y": 565.2 },
  "whiteLight": { "x": 691.3, "y": 565.2, "radius": 50 },
  "blocked": [
`;

for (let i = 0; i < finalArena.blocked.length; i++) {
  newConfig += '    ' + JSON.stringify(finalArena.blocked[i]) + (i < finalArena.blocked.length - 1 ? ',' : '') + '\n';
}

newConfig += `  ],
  "walls": [],
  "occluders": []
};`;

const match = mapData.match(/window\.LightWars\.LEVEL4_MAP_CONFIG\s*=\s*\{[\s\S]*?\}\s*;/);
if (match) {
  mapData = mapData.replace(match[0], 'window.LightWars.LEVEL4_MAP_CONFIG = ' + newConfig);
  fs.writeFileSync('./webgl_game/js/map_data.js', mapData);
  console.log("Updated map_data.js");
} else {
  console.log("Could not find LEVEL4_MAP_CONFIG");
}
