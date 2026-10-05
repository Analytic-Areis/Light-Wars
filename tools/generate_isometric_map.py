import os
import json
import random
from PIL import Image

TILESET = "../webgl_game/assets/isometric_dungeon/Isometric"
OUT_IMG = "../webgl_game/assets/map.png"
OUT_JS = "../webgl_game/js/map_data.js"

TW, TH = 256, 128
HW, HH = TW // 2, TH // 2
TILE_H = 512

COLS, ROWS = 20, 20
grid = [[0]*COLS for _ in range(ROWS)]

# Center room 6x6
for r in range(7, 13):
    for c in range(7, 13):
        grid[r][c] = 1

# Hallways
for r in range(13, 18):
    for c in range(9, 11): grid[r][c] = 1
for r in range(2, 7):
    for c in range(9, 11): grid[r][c] = 1

margin_x, margin_y = 600, 400
cw = (COLS + ROWS) * HW + margin_x*2
ch = (COLS + ROWS) * HH + margin_y*2

origin_x = margin_x + ROWS * HW
origin_y = margin_y

def to_screen(c, r):
    x = int(origin_x + (c - r) * HW)
    y = int(origin_y + (c + r) * HH)
    return x, y

def load_img(name):
    path = os.path.join(TILESET, f"{name}.png")
    if os.path.exists(path): return Image.open(path).convert("RGBA")
    return None

floor1 = load_img("stone_N")
floor2 = load_img("stoneTile_N")

canvas = Image.new("RGBA", (cw, ch), (8, 9, 14, 255))

# Draw Floor
for r in range(ROWS):
    for c in range(COLS):
        if grid[r][c]:
            x, y = to_screen(c, r)
            img = floor1 if random.random() < 0.7 else floor2
            if img:
                canvas.paste(img, (x, y + TH - TILE_H), img)

canvas.save(OUT_IMG)

walls = []
for r in range(ROWS):
    for c in range(COLS):
        if grid[r][c]:
            # North/West walls (stoneWall_W / stoneWall_E type logic)
            if r == 0 or not grid[r-1][c]:
                # NW edge
                sprite = "stoneWall_W"
                if c == 9 or c == 10: 
                    if r == 7 or r == 2:
                        sprite = "stoneWallArchway_W"
                walls.append({
                    "type": "ARCHWAY" if "Archway" in sprite else "WALL",
                    "sprite": f"assets/isometric_dungeon/Isometric/{sprite}.png",
                    "width": 256,
                    "height": 512,
                    "c": c, "r": r,
                    "blocksWalking": False if "Archway" in sprite else True
                })
            if c == 0 or not grid[r][c-1]:
                # NE edge
                sprite = "stoneWall_E"
                walls.append({
                    "type": "WALL",
                    "sprite": f"assets/isometric_dungeon/Isometric/{sprite}.png",
                    "width": 256,
                    "height": 512,
                    "c": c, "r": r,
                    "blocksWalking": True
                })
            # Half walls / borders on South/East
            if r == ROWS-1 or not grid[r+1][c]:
                walls.append({
                    "type": "WALL",
                    "sprite": "assets/isometric_dungeon/Isometric/stoneWallHalf_W.png",
                    "width": 256,
                    "height": 512,
                    "c": c, "r": r,
                    "blocksWalking": True
                })
            if c == COLS-1 or not grid[r][c+1]:
                walls.append({
                    "type": "WALL",
                    "sprite": "assets/isometric_dungeon/Isometric/stoneWallHalf_E.png",
                    "width": 256,
                    "height": 512,
                    "c": c, "r": r,
                    "blocksWalking": True
                })

blocked_arr = []
for r in range(ROWS):
    row_block = []
    for c in range(COLS):
        row_block.append(0 if grid[r][c] else 1)
    blocked_arr.append(row_block)

spawn_x, spawn_y = to_screen(9, 9)
spawn_x += TW // 2
spawn_y += TH // 2

js_content = f"""/**
 * LIGHT-WARS: MAP CONFIGURATION & CONSTRAINTS
 */
window.LightWars = window.LightWars || {{}};

window.LightWars.MAP_CONFIG = {{
  imageSrc: 'assets/map.png',
  width: {cw},
  height: {ch},
  scale: 1.0,
  ignoreBoundaries: false, 
  bounds: {{
    minX: 0,
    minY: 0,
    maxX: {cw},
    maxY: {ch}
  }},
  originX: {origin_x},
  originY: {origin_y},
  cols: {COLS},
  rows: {ROWS},
  blocked: {json.dumps(blocked_arr)},
  spawn: {{
    x: {spawn_x},
    y: {spawn_y}
  }},
  whiteLight: {{
    x: {spawn_x},
    y: {spawn_y},
    radius: 120
  }},
  silhouetteAlpha: 0.25,
  walls: {json.dumps(walls, indent=4)}
}};

if (window.LightWars.GAME_CONFIG) {{
  window.LightWars.GAME_CONFIG.arenaWidth = window.LightWars.MAP_CONFIG.width;
  window.LightWars.GAME_CONFIG.arenaHeight = window.LightWars.MAP_CONFIG.height;
}}
window.LightWars.LEVEL1_MAP_DATA = window.LightWars.MAP_CONFIG;
"""
with open(OUT_JS, "w") as f:
    f.write(js_content)
    
print("Updated map_data.js and map.png for isometric dungeon")
