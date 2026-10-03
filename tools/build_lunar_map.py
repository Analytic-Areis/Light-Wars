#!/usr/bin/env python3
"""
Generate the 2.5D Lunar Dungeon Pathway Map using the Lunar Tileset (best.zip)
and Lunar Props (Lander, Solar Panels, Satellite Dish, Craters, Moon Rocks).
Integrates:
- Seamless flat lunar diamond tiles for all walkable pathways
- Perimeter curb trims and monolithic basalt pillars defining borders clearly
- Authentic Lunar Lander, Solar Panels & Satellite Dish at the Recharge Station
- Clean, non-distracting Recharge Station aesthetic
"""

import os
import random
import json
import glob
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
    TILE_H = 512

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

    # Walls for back borders (North/West)
    w_n = load_img("stoneWall_N")
    w_w = load_img("stoneWall_W")
    if w_n:
        wa = w_n.split()[3]
        tint = Image.new("RGBA", w_n.size, (60, 66, 85, 255))
        w_n = Image.blend(w_n, tint, 0.5)
        w_n.putalpha(wa)
    if w_w:
        wa = w_w.split()[3]
        tint = Image.new("RGBA", w_w.size, (60, 66, 85, 255))
        w_w = Image.blend(w_w, tint, 0.5)
        w_w.putalpha(wa)

    # 2. Seamless Flat Lunar Floor Tile
    flat_tile_path = os.path.join(LUNAR_TILE_DIR, "GroundTile-pure-flat.png")
    flat_tile = Image.open(flat_tile_path).convert("RGBA").resize((256, 134), Image.Resampling.LANCZOS)

    # 3. Perimeter Curb Tiles
    curb_n = Image.open(os.path.join(LUNAR_TILE_DIR, "GroundTile-3_0.png")).convert("RGBA").resize((256, 134), Image.Resampling.LANCZOS)
    curb_s = Image.open(os.path.join(LUNAR_TILE_DIR, "GroundTile-3_2.png")).convert("RGBA").resize((256, 134), Image.Resampling.LANCZOS)

    # 4. Basalt Rock Props
    rock_props = [
        load_prop("Rock-8_0"),
        load_prop("Rock-8_1"),
        load_prop("Rock-4_0"),
        load_prop("Rock-7_0"),
        load_prop("Rock-6_0"),
        load_prop("Rock-11_0"),
        load_prop("Rock-12_0"),
    ]
    rock_props = [r for r in rock_props if r is not None]

    # 5. Define Walkable Grid (identical to current smooth collision grid)
    walkable = set()

    # Room 1: Sanctuary Bastion (centered around player spawn gx=3.5, gy=13.5)
    for x in range(2, 6):
        for y in range(12, 16):
            walkable.add((x, y))
    for pt in [(1, 13), (1, 14), (6, 13), (6, 14), (3, 11), (4, 11), (3, 16), (4, 16)]:
        walkable.add(pt)

    # Route A: North Flank Corridor (spacious 3-4 tiles wide)
    for x in range(3, 6):
        for y in range(7, 12):
            walkable.add((x, y))
    for x in range(5, 11):
        for y in range(5, 9):
            walkable.add((x, y))

    # Route B: South Bastion Corridor (spacious 3-4 tiles wide)
    for x in range(6, 10):
        for y in range(13, 17):
            walkable.add((x, y))
    for x in range(8, 13):
        for y in range(12, 16):
            walkable.add((x, y))
    for x in range(10, 14):
        for y in range(9, 13):
            walkable.add((x, y))

    # Room 2: Central Crossroads (spacious junction hall)
    for x in range(10, 16):
        for y in range(6, 11):
            walkable.add((x, y))

    # East Corridor
    for x in range(14, 18):
        for y in range(5, 9):
            walkable.add((x, y))

    # Room 3: Overlord Arena / Northern Bastion
    for x in range(16, 21):
        for y in range(2, 6):
            walkable.add((x, y))
    for x in range(17, 21):
        for y in range(1, 3):
            walkable.add((x, y))

    def grid_to_screen(gx, gy, z=0):
        sx = int((gx - gy) * (TW / 2) + origin_x)
        sy = int((gx + gy) * (TH / 2) + origin_y)
        draw_x = sx
        draw_y = sy - 308 - (z * 78)
        diamond_cx = sx + TW // 2
        diamond_cy = sy + TH // 2 - (z * 78)
        return draw_x, draw_y, diamond_cx, diamond_cy

    # 6. Canvas Initialization (Deep Lunar Space Void Background)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (8, 9, 14, 255))
    star_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(star_layer)
    for _ in range(400):
        sx = random.randint(0, canvas_w - 1)
        sy = random.randint(0, canvas_h - 1)
        sr = random.randint(1, 2)
        sa = random.randint(70, 210)
        s_draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(200, 225, 255, sa))
    canvas = Image.alpha_composite(canvas, star_layer)

    # 7. Render Central Chasm craters & abyss backdrop
    crater_1 = load_prop("Crater-4_0")
    if crater_1:
        c_sx, c_sy = 2050, 1550
        c_scaled = crater_1.resize((int(crater_1.width * 0.8), int(crater_1.height * 0.8)))
        canvas.paste(c_scaled, (c_sx, c_sy), c_scaled)

    all_coords = sorted(list(walkable), key=lambda c: (c[0] + c[1], c[1]))

    # Base blocks
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        if f_stone:
            canvas.paste(f_stone, (draw_x, draw_y), f_stone)

    # Back Walls on North/West boundaries
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        if (gx, gy - 1) not in walkable and w_n:
            canvas.paste(w_n, (draw_x, draw_y), w_n)
        elif (gx - 1, gy) not in walkable and w_w:
            canvas.paste(w_w, (draw_x, draw_y), w_w)

    # Seamless Lunar Diamond Surface Tiles (Placed ON TOP so lunar floor is 100% pristine)
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        sx = draw_x
        sy = draw_y + 308
        canvas.paste(flat_tile, (sx, sy), flat_tile)

    # 10. Basalt Rock Pillars on Perimeter Non-Walkable Points (behind walls or in chasm)
    chasm_rocks = [
        (7, 9), (8, 9), (9, 9),
        (7, 10), (8, 10), (9, 10)
    ]
    rock_rand = random.Random(42)
    for cx, cy in chasm_rocks:
        _, _, dcx, dcy = grid_to_screen(cx, cy, 0)
        rock = rock_rand.choice(rock_props)
        rx = int(dcx - rock.width / 2)
        ry = int(dcy - rock.height / 2)
        canvas.paste(rock, (rx, ry), rock)

    # 11. Lunar Lander & Solar Array at the edge of the Recharge Station Bastion
    lander = load_prop("Lander_0")
    if lander:
        lw = int(lander.width * 0.72)
        lh = int(lander.height * 0.72)
        lander_scaled = lander.resize((lw, lh), Image.Resampling.LANCZOS)
        canvas.paste(lander_scaled, (1265, 1180), lander_scaled)

    solar = load_prop("SolarPanel_0")
    if solar:
        canvas.paste(solar, (1130, 1430), solar)

    dish = load_prop("SatelliteDish_0")
    if dish:
        canvas.paste(dish, (1550, 1370), dish)

    # 12. Clean Sci-Fi Recharge Station Holographic Ring on Floor at (1352, 1502)
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

    # 13. Boundaries (Solid Convex Polygon Slabs)
    boundaries = []
    for gx, gy in all_coords:
        _, _, dcx, dcy = grid_to_screen(gx, gy, 0)
        if (gx, gy - 1) not in walkable:
            boundaries.append({
                "poly": [
                    {"x": dcx, "y": dcy - 64},
                    {"x": dcx + 128, "y": dcy},
                    {"x": dcx + 128 + 32, "y": dcy - 64},
                    {"x": dcx + 32, "y": dcy - 128}
                ]
            })
        if (gx + 1, gy) not in walkable:
            boundaries.append({
                "poly": [
                    {"x": dcx + 128, "y": dcy},
                    {"x": dcx, "y": dcy + 64},
                    {"x": dcx + 64, "y": dcy + 64 + 32},
                    {"x": dcx + 128 + 64, "y": dcy + 32}
                ]
            })
        if (gx, gy + 1) not in walkable:
            boundaries.append({
                "poly": [
                    {"x": dcx, "y": dcy + 64},
                    {"x": dcx - 128, "y": dcy},
                    {"x": dcx - 128 - 32, "y": dcy + 64},
                    {"x": dcx - 32, "y": dcy + 128}
                ]
            })
        if (gx - 1, gy) not in walkable:
            boundaries.append({
                "poly": [
                    {"x": dcx - 128, "y": dcy},
                    {"x": dcx, "y": dcy - 64},
                    {"x": dcx - 64, "y": dcy - 64 - 32},
                    {"x": dcx - 128 - 64, "y": dcy - 32}
                ]
            })

    # 14. Subtle Ambient Cyan Sci-Fi Glow on Walls
    glow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow_layer)
    glow_points = [
        (4, 7), (8, 5), (14, 6), (20, 2),
        (7, 13), (12, 12), (18, 5)
    ]
    for tgx, tgy in glow_points:
        _, _, tcx, tcy = grid_to_screen(tgx, tgy, 0)
        ty = tcy - 110
        g_draw.ellipse([tcx - 130, ty - 80, tcx + 130, ty + 80], fill=(0, 240, 255, 30))
        g_draw.ellipse([tcx - 65, ty - 40, tcx + 65, ty + 40], fill=(0, 255, 255, 55))
        g_draw.ellipse([tcx - 14, ty - 10, tcx + 14, ty + 10], fill=(220, 255, 255, 140))

    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=15))
    canvas = Image.alpha_composite(canvas, glow_layer)

    # 15. Save Map Textures & Map Data
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
        "boundary_slabs": boundaries,
        "walkable_tiles": list(walkable),
        "origin_x": origin_x,
        "origin_y": origin_y
    }
    with open(out_json, "w") as f:
        json.dump(map_data, f, indent=2)

    with open("js/map_data.js", "w") as f:
        f.write("window.LightWars = window.LightWars || {};\n")
        f.write(f"window.LightWars.DUNGEON_MAP_DATA = {json.dumps(map_data)};\n")

    print(f"Generated 2.5D Lunar Arena Map successfully!")
    print(f"Floor size: {canvas.size}, boundary slabs: {len(boundaries)}")
    print(f"Recharge Station at ({sp_sx}, {sp_sy})")

if __name__ == "__main__":
    main()
