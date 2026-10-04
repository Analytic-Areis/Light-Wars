#!/usr/bin/env python3
"""
Generate the 2.5D Lunar Arena Map using the Lunar Tileset (best.zip)
Features:
- Seamless solid flat lunar diamond floor across the entire arena (NO holes, NO internal obstacles)
- Continuous enclosing perimeter walls: tall stone walls on North & West borders,
  low protective balustrades on South & East borders
- Clean Recharge Station at (1352, 1502) with sci-fi holographic energy ring
- Props safely stationed outside the playable floor
"""

import os
import random
import json
from PIL import Image, ImageDraw, ImageFilter

ASSET_DIR = "assets/isometric_dungeon/Isometric"
LUNAR_TILE_DIR = "assets/lunar_tileset/tiles"
LUNAR_PROP_DIR = "assets/lunar_tileset/props"

def load_img(name):
    path = os.path.join(ASSET_DIR, f"{name}.png")
    if os.path.exists(path):
        return Image.open(path).convert("RGBA")
    return None

def load_prop(name):
    path = os.path.join(LUNAR_PROP_DIR, f"{name}.png")
    if os.path.exists(path):
        return Image.open(path).convert("RGBA")
    return None

def main():
    random.seed(42)

    COLS = 22
    ROWS = 18

    TW = 256
    TH = 128

    min_sx = -(ROWS) * (TW // 2)
    max_sx = (COLS) * (TW // 2)
    min_sy = 0
    max_sy = (COLS + ROWS) * (TH // 2) + TH

    margin_x = 200
    margin_y = 350
    canvas_w = max_sx - min_sx + margin_x * 2  # 5520
    canvas_h = max_sy - min_sy + margin_y * 2  # 3388

    origin_x = -min_sx + margin_x  # 2504
    origin_y = margin_y            # 350

    print(f"Canvas size: {canvas_w}x{canvas_h}, origin: ({origin_x}, {origin_y})")

    # 1. Base foundation block (tinted to deep cool lunar basalt)
    raw_stone = load_img("stone_N")
    if raw_stone:
        r, g, b, a = raw_stone.split()
        f_stone = Image.new("RGBA", raw_stone.size, (55, 60, 78, 255))
        f_stone = Image.composite(f_stone, raw_stone, a)
        f_stone = Image.blend(raw_stone, f_stone, 0.55)
        f_stone.putalpha(a)
    else:
        f_stone = None

    # Walls for borders
    w_n = load_img("stoneWall_N")
    w_corner = load_img("stoneWallCorner_N")
    w_half_s = load_img("stoneWallHalf_S")

    def tint_wall(w):
        if not w: return None
        wa = w.split()[3]
        tint = Image.new("RGBA", w.size, (60, 66, 85, 255))
        tw = Image.blend(w, tint, 0.5)
        tw.putalpha(wa)
        return tw

    w_n = tint_wall(w_n)
    w_w = w_n.transpose(Image.FLIP_LEFT_RIGHT) if w_n else None
    w_corner = tint_wall(w_corner)
    w_half_s = tint_wall(w_half_s)
    w_half_e = w_half_s.transpose(Image.FLIP_LEFT_RIGHT) if w_half_s else None

    # 2. Seamless Flat Lunar Floor Tile
    flat_tile_path = os.path.join(LUNAR_TILE_DIR, "GroundTile-pure-flat.png")
    flat_tile = Image.open(flat_tile_path).convert("RGBA").resize((256, 134), Image.Resampling.LANCZOS)

    # 3. Define Walkable Grid: Solid, open 20x16 arena with zero holes
    walkable = set()
    for x in range(1, 21):
        for y in range(1, 17):
            walkable.add((x, y))

    def grid_to_screen(gx, gy, z=0):
        sx = int((gx - gy) * (TW / 2) + origin_x)
        sy = int((gx + gy) * (TH / 2) + origin_y)
        draw_x = sx
        draw_y = sy - 308 - (z * 78)
        diamond_cx = sx + TW // 2
        diamond_cy = sy + TH // 2 - (z * 78)
        return draw_x, draw_y, diamond_cx, diamond_cy

    # 4. Canvas Initialization (Deep Lunar Space Void Background)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (8, 9, 14, 255))
    star_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(star_layer)
    for _ in range(500):
        sx = random.randint(0, canvas_w - 1)
        sy = random.randint(0, canvas_h - 1)
        sr = random.randint(1, 2)
        sa = random.randint(70, 210)
        s_draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(200, 225, 255, sa))
    canvas = Image.alpha_composite(canvas, star_layer)

    all_coords = sorted(list(walkable), key=lambda c: (c[0] + c[1], c[1]))

    # Step 1: Base foundation blocks
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        if f_stone:
            canvas.paste(f_stone, (draw_x, draw_y), f_stone)

    # Step 2: Seamless Lunar Diamond Surface Tiles
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        sx = draw_x
        sy = draw_y + 308
        canvas.paste(flat_tile, (sx, sy), flat_tile)

    # Step 3: Perimeter Walls along Borders
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        # North-West Corner
        if gx == 1 and gy == 1:
            if w_corner:
                canvas.paste(w_corner, (draw_x, draw_y), w_corner)
            elif w_n:
                canvas.paste(w_n, (draw_x, draw_y), w_n)
        # North Border Wall
        elif gy == 1 and w_n:
            canvas.paste(w_n, (draw_x, draw_y), w_n)
        # West Border Wall
        elif gx == 1 and w_w:
            canvas.paste(w_w, (draw_x, draw_y), w_w)

        # South Border Balustrade
        if gy == 16 and w_half_s:
            canvas.paste(w_half_s, (draw_x, draw_y), w_half_s)
        # East Border Balustrade
        if gx == 20 and w_half_e:
            canvas.paste(w_half_e, (draw_x, draw_y), w_half_e)

    # 5. Clean Sci-Fi Recharge Station Holographic Ring on Floor at (1352, 1502)
    spawn_gx, spawn_gy = 3.5, 13.5
    sp_sx = int((spawn_gx - spawn_gy) * (TW / 2) + origin_x + TW // 2)
    sp_sy = int((spawn_gx + spawn_gy) * (TH / 2) + origin_y + TH // 2)

    rune_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(rune_layer)
    ew, eh = 180, 95

    # Outer cyan energy glow
    for off in range(8, 0, -2):
        r_draw.ellipse(
            [sp_sx - ew - off, sp_sy - eh - off//2, sp_sx + ew + off, sp_sy + eh + off//2],
            outline=(0, 240, 255, 30),
            width=2
        )
    r_draw.ellipse(
        [sp_sx - ew, sp_sy - eh, sp_sx + ew, sp_sy + eh],
        fill=(0, 240, 255, 35),
        outline=(0, 245, 255, 220),
        width=4
    )
    # Inner tech ring
    r_draw.ellipse(
        [sp_sx - ew + 35, sp_sy - eh + 18, sp_sx + ew - 35, sp_sy + eh - 18],
        outline=(0, 255, 255, 170),
        width=3
    )
    # Tech diamond
    r_draw.polygon([
        (sp_sx, sp_sy - eh + 20),
        (sp_sx + ew - 38, sp_sy),
        (sp_sx, sp_sy + eh - 20),
        (sp_sx - ew + 38, sp_sy)
    ], outline=(180, 250, 255, 190), width=2)
    # Core energy circle
    r_draw.ellipse(
        [sp_sx - 24, sp_sy - 12, sp_sx + 24, sp_sy + 12],
        fill=(230, 255, 255, 240),
        outline=(0, 240, 255, 255),
        width=2
    )
    canvas = Image.alpha_composite(canvas, rune_layer)

    # 6. Props stationed cleanly OUTSIDE the playable arena
    lander = load_prop("Lander_0")
    if lander:
        lw = int(lander.width * 0.7)
        lh = int(lander.height * 0.7)
        lander_scaled = lander.resize((lw, lh), Image.Resampling.LANCZOS)
        canvas.paste(lander_scaled, (480, 1300), lander_scaled)

    solar = load_prop("SolarPanel_0")
    if solar:
        canvas.paste(solar, (420, 1500), solar)

    dish = load_prop("SatelliteDish_0")
    if dish:
        canvas.paste(dish, (560, 1620), dish)

    # 7. Subtle Ambient Cyan Sci-Fi Glow along North/West Walls
    glow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow_layer)
    glow_points = [
        (4, 1), (8, 1), (12, 1), (16, 1), (20, 1),
        (1, 4), (1, 8), (1, 12), (1, 16)
    ]
    for tgx, tgy in glow_points:
        _, _, tcx, tcy = grid_to_screen(tgx, tgy, 0)
        ty = tcy - 110
        g_draw.ellipse([tcx - 120, ty - 70, tcx + 120, ty + 70], fill=(0, 240, 255, 25))
        g_draw.ellipse([tcx - 60, ty - 35, tcx + 60, ty + 35], fill=(0, 255, 255, 45))
        g_draw.ellipse([tcx - 14, ty - 10, tcx + 14, ty + 10], fill=(220, 255, 255, 120))

    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=15))
    canvas = Image.alpha_composite(canvas, glow_layer)

    # 8. Save Map Textures & Map Data
    out_floor = "assets/textures/dungeon_floor.png"
    out_png = "assets/textures/dungeon_arena.png"
    out_jpg = "assets/textures/arena_map.jpg"
    out_json = "assets/textures/dungeon_map_data.json"

    canvas.save(out_floor)
    canvas.save(out_png)

    rgb_canvas = Image.new("RGB", canvas.size, (8, 9, 14))
    rgb_canvas.paste(canvas, mask=canvas.split()[3])
    rgb_canvas.save(out_jpg, quality=94)

    map_data = {
        "width": canvas_w,
        "height": canvas_h,
        "whiteLight": {
            "x": sp_sx,
            "y": sp_sy,
            "radius": 190
        },
        "obstacles": [],
        "walkable_tiles": list(walkable),
        "origin_x": origin_x,
        "origin_y": origin_y
    }
    with open(out_json, "w") as f:
        json.dump(map_data, f, indent=2)

    with open("js/map_data.js", "w") as f:
        f.write("window.LightWars = window.LightWars || {};\n")
        f.write(f"window.LightWars.DUNGEON_MAP_DATA = {json.dumps(map_data)};\n")

    print(f"Generated 2.5D Solid Lunar Arena Map successfully!")
    print(f"Total walkable tiles: {len(walkable)} (No holes, no obstacles)")
    print(f"Floor size: {canvas.size}")
    print(f"Recharge Station at ({sp_sx}, {sp_sy})")

if __name__ == "__main__":
    main()
