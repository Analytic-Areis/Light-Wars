import os
import json
from PIL import Image

TILESET = "../webgl_game/assets/tileset"
OUT_IMG = "../webgl_game/assets/map.png"
OUT_JS = "../webgl_game/js/map_data.js"

TW, TH = 280, 152
HW, HH = TW // 2, TH // 2

# We'll match the user's screenshot map shape:
# Looks like a central 5x5 room, with 4 corridors of width 3 extending outwards.
COLS, ROWS = 19, 19
grid = [[0]*COLS for _ in range(ROWS)]

# Center room 5x5
for r in range(7, 12):
    for c in range(7, 12):
        grid[r][c] = 1

# Hallways
for r in range(1, 7):
    for c in range(8, 11): grid[r][c] = 1
for r in range(12, 18):
    for c in range(8, 11): grid[r][c] = 1
for r in range(8, 11):
    for c in range(1, 7): grid[r][c] = 1
for r in range(8, 11):
    for c in range(12, 18): grid[r][c] = 1

# Conduits in hallways
for i in range(2, 17):
    grid[9][i] = 2
    grid[i][9] = 2
grid[9][9] = 1  # Center

margin_x, margin_y = 600, 400
cw = (COLS + ROWS) * HW + margin_x*2
ch = (COLS + ROWS) * HH + margin_y*2

def to_screen(c, r):
    x = cw//2 + (c - r) * HW
    y = margin_y + (c + r) * HH
    return x, y

def load_img(name):
    path = os.path.join(TILESET, f"{name}.png")
    if os.path.exists(path): return Image.open(path).convert("RGBA")
    return None

floor1 = load_img("01_metal_floor_tile")
floor2 = load_img("03_conduit_light_floor_tile")
podium = load_img("10_hologram_podium")

canvas = Image.new("RGBA", (cw, ch), (0,0,0,0))

for r in range(ROWS):
    for c in range(COLS):
        if grid[r][c]:
            x, y = to_screen(c, r)
            img = floor1 if grid[r][c] == 1 else floor2
            canvas.paste(img, (x - HW, y), img)

# Draw podium at center (in the floor image directly for simplicity, though it's technically a prop)
# Wait, if we put podium in floor image, player will walk over it. That's fine for now, it's a floor object.
px, py = to_screen(9, 9)
# podium is drawn centered
if podium:
    canvas.paste(podium, (px - podium.width//2, py - podium.height + HH), podium)

canvas.save(OUT_IMG)

walls = []
def add_wall(c, r, facing, wall_type="straight"):
    x, y = to_screen(c, r)
    sprite = f"04_sci_fi_wall_straight_{facing}.png"
    if wall_type == "window":
        sprite = f"06_space_window_wall_{facing}.png"
    elif wall_type == "door":
        sprite = f"08_archway_doorframe_{facing}.png"
        
    img = load_img(sprite.replace(".png", ""))
    w, h = 192, 181
    if img: w, h = img.size
    feet = h * 0.85
    ox, oy = 0, 0
    if facing == "east":
        ox = -22; oy = 95 - h + HH
    elif facing == "west":
        ox = -w + 22; oy = 95 - h + HH
    elif facing == "south":
        ox = -w//2; oy = 95 - h + HH # Approximate
        
    walls.append({
        "type": "WINDOW" if wall_type == "window" else "ARCHWAY" if wall_type == "door" else "WALL",
        "sprite": f"assets/tileset/{sprite}",
        "x": x + ox + w//2,
        "y": y + oy + feet,
        "width": w,
        "height": h,
        "c": c, "r": r, "facing": facing
    })

# Decorate edges with parallel walls!
for r in range(ROWS):
    for c in range(COLS):
        if grid[r][c]:
            # NW edge (faces west sprite)
            if r == 0 or not grid[r-1][c]:
                wtype = "straight"
                if c in [2, 16, 9]: wtype = "window"
                if c in [8, 10]: wtype = "door"
                add_wall(c, r, "west", wtype)
            # NE edge (faces east sprite)
            if c == 0 or not grid[r][c-1]:
                wtype = "straight"
                if r in [2, 16, 9]: wtype = "window"
                if r in [8, 10]: wtype = "door"
                add_wall(c, r, "east", wtype)

# Fix JS bounds and blocked array
blocked_arr = []
for r in range(ROWS):
    row_block = []
    for c in range(COLS):
        row_block.append(0 if grid[r][c] else 1)
    blocked_arr.append(row_block)

js_content = f"""/**
 * LIGHT-WARS: MAP CONFIGURATION & CONSTRAINTS
 */
window.LightWars = window.LightWars || {{}};

window.LightWars.MAP_CONFIG = {{
  imageSrc: 'assets/map.png',
  width: {cw},
  height: {ch},
  scale: 1.0,
  ignoreBoundaries: true, 
  bounds: {{
    minX: 0,
    minY: 0,
    maxX: {cw},
    maxY: {ch}
  }},
  spawn: {{
    x: {to_screen(9, 9)[0]},
    y: {to_screen(9, 9)[1]}
  }},
  whiteLight: {{
    x: {to_screen(9, 9)[0]},
    y: {to_screen(9, 9)[1]},
    radius: 120
  }},
  silhouetteAlpha: 0.15,
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
    
print("Updated map_data.js and map.png")
