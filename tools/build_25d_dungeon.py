#!/usr/bin/env python3
"""
Generate a spacious, structured 2.5D Isometric Dungeon Pathway Map with clear visible borders,
railings, and thick boundary collision barriers.
Features:
- Extra-wide 4-tile corridors (500px wide) allowing smooth, frictionless movement with zero snagging
- Clear visible architectural borders:
  * High stone fortress walls (stoneWall_N, stoneWall_W) on North & West boundaries
  * Stone balustrade half-walls (stoneWallHalf_S, stoneWallHalf_E) on South & East boundaries
  * Deep central chasm enclosed with stone balustrades and 3D foundation cliffs
- Thick convex polygon collision slabs for all boundaries preventing walking out of the map or tunneling
- Luminous White Light Sanctuary runic circle at (1352, 1502)
- Exports high-res dungeon_floor.png, dungeon_arena.png, arena_map.jpg, and dungeon_map_data.json
"""

import os
import random
import json
from PIL import Image, ImageDraw, ImageFilter

ASSET_DIR = "assets/isometric_dungeon/Isometric"

def load_img(name):
    path = os.path.join(ASSET_DIR, f"{name}.png")
    if os.path.exists(path):
        return Image.open(path).convert("RGBA")
    print(f"Warning: {path} not found")
    return None

def main():
    random.seed(1337)
    
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
    
    # 1. Load Kenney Assets
    f_stone = load_img("stone_N")
    f_tile = load_img("stoneTile_N")
    f_uneven = load_img("stoneUneven_N")
    f_missing = load_img("stoneMissingTiles_N")
    f_dirt = load_img("dirtTiles_N") or load_img("dirt_N")
    
    cliff_s = load_img("stoneSide_S")
    cliff_w = load_img("stoneSide_W")
    cliff_e = load_img("stoneSide_E")
    
    w_n = load_img("stoneWall_N")
    w_w = load_img("stoneWall_W")
    w_half_s = load_img("stoneWallHalf_S") or load_img("stoneWall_S")
    w_half_e = load_img("stoneWallHalf_E") or load_img("stoneWall_E")
    
    win_n = load_img("stoneWallWindowBars_N")
    arch_n = load_img("stoneWallArchway_N")
    col = load_img("stoneColumn_N")

    # 2. Define Spacious Walkable Grid
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
            
    # Central Chasm: (7..9, 9..11) is non-walkable abyss separating Route A and Route B
    
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

    # Coordinate conversion
    def grid_to_screen(gx, gy, z=0):
        sx = int((gx - gy) * (TW / 2) + origin_x)
        sy = int((gx + gy) * (TH / 2) + origin_y)
        draw_x = sx
        draw_y = sy + TH - TILE_H - (z * 78)
        diamond_cx = sx + TW // 2
        diamond_cy = sy + TH // 2 - (z * 78)
        return draw_x, draw_y, diamond_cx, diamond_cy

    # 3. Canvas Initialization
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (8, 9, 14, 255))
    shadow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)

    all_coords = sorted(list(walkable), key=lambda c: (c[0] + c[1], c[1]))

    # 4. Foundation Cliffs along abyss drop-offs (South, East, West borders)
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        if (gx, gy + 1) not in walkable:
            canvas.paste(cliff_s, (draw_x, draw_y + 40), cliff_s)
        if (gx + 1, gy) not in walkable and cliff_e:
            canvas.paste(cliff_e, (draw_x, draw_y + 40), cliff_e)
        if (gx - 1, gy) not in walkable and cliff_w:
            canvas.paste(cliff_w, (draw_x, draw_y + 40), cliff_w)

    # 5. Render Floor Tiles
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        r = random.random()
        if (gx in [13, 14, 15] and gy in [7, 8]):
            t_img = f_dirt if f_dirt else f_uneven
        elif r < 0.65:
            t_img = f_stone
        elif r < 0.88:
            t_img = f_tile
        elif r < 0.96:
            t_img = f_uneven
        else:
            t_img = f_missing
        canvas.paste(t_img, (draw_x, draw_y), t_img)

    # 6. Render White Light Sanctuary Rune Circle at (1352, 1502)
    spawn_gx, spawn_gy = 3.5, 13.5
    sp_sx = int((spawn_gx - spawn_gy) * (TW / 2) + origin_x + TW // 2)
    sp_sy = int((spawn_gx + spawn_gy) * (TH / 2) + origin_y + TH // 2)
    
    rune_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(rune_layer)
    ew, eh = 220, 110
    for off in range(12, 0, -3):
        r_draw.ellipse(
            [sp_sx - ew - off, sp_sy - eh - off//2, sp_sx + ew + off, sp_sy + eh + off//2],
            outline=(140, 220, 255, 35),
            width=2
        )
    r_draw.ellipse(
        [sp_sx - ew, sp_sy - eh, sp_sx + ew, sp_sy + eh],
        fill=(160, 230, 255, 45),
        outline=(190, 245, 255, 220),
        width=4
    )
    r_draw.ellipse(
        [sp_sx - ew + 40, sp_sy - eh + 20, sp_sx + ew - 40, sp_sy + eh - 20],
        outline=(160, 230, 255, 160),
        width=3
    )
    r_draw.polygon([
        (sp_sx, sp_sy - eh + 22),
        (sp_sx + ew - 42, sp_sy),
        (sp_sx, sp_sy + eh - 22),
        (sp_sx - ew + 42, sp_sy)
    ], outline=(210, 250, 255, 180), width=2)
    r_draw.ellipse(
        [sp_sx - 28, sp_sy - 14, sp_sx + 28, sp_sy + 14],
        fill=(225, 255, 255, 235),
        outline=(180, 240, 255, 255),
        width=2
    )
    canvas = Image.alpha_composite(canvas, rune_layer)

    # 7. Render Clear Architectural Borders (Walls on North/West, Balustrades on South/East)
    # High back walls (North & West boundaries)
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        if (gx, gy - 1) not in walkable:
            canvas.paste(w_n, (draw_x, draw_y), w_n)
        elif (gx - 1, gy) not in walkable:
            canvas.paste(w_w, (draw_x, draw_y), w_w)

    # Front stone balustrades (South & East boundaries and central chasm)
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        if (gx, gy + 1) not in walkable:
            canvas.paste(w_half_s, (draw_x, draw_y), w_half_s)
        elif (gx + 1, gy) not in walkable:
            canvas.paste(w_half_e, (draw_x, draw_y), w_half_e)

    # Corner Columns to clearly anchor the rooms
    corner_pillars = [
        (1, 13), (1, 15), (3, 17), (5, 17),
        (7, 13), (7, 10), (10, 10), (14, 10),
        (18, 6), (23, 2), (23, 6)
    ]
    for gx, gy in corner_pillars:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        canvas.paste(col, (draw_x, draw_y), col)

    # 8. Generate Solid Convex Polygon Slabs for Map Boundaries (No thin segments!)
    # Each slab is a 70px thick convex polygon sitting in the void, flush with the walkway edge.
    boundaries = []
    for gx, gy in all_coords:
        _, _, dcx, dcy = grid_to_screen(gx, gy, 0)
        # NE edge (bordering gy - 1)
        if (gx, gy - 1) not in walkable:
            boundaries.append({
                "poly": [
                    {"x": dcx, "y": dcy - 64},
                    {"x": dcx + 128, "y": dcy},
                    {"x": dcx + 128 + 32, "y": dcy - 64},
                    {"x": dcx + 32, "y": dcy - 128}
                ]
            })
        # SE edge (bordering gx + 1)
        if (gx + 1, gy) not in walkable:
            boundaries.append({
                "poly": [
                    {"x": dcx + 128, "y": dcy},
                    {"x": dcx, "y": dcy + 64},
                    {"x": dcx + 64, "y": dcy + 64 + 32},
                    {"x": dcx + 128 + 64, "y": dcy + 32}
                ]
            })
        # SW edge (bordering gy + 1)
        if (gx, gy + 1) not in walkable:
            boundaries.append({
                "poly": [
                    {"x": dcx, "y": dcy + 64},
                    {"x": dcx - 128, "y": dcy},
                    {"x": dcx - 128 - 32, "y": dcy + 64},
                    {"x": dcx - 32, "y": dcy + 128}
                ]
            })
        # NW edge (bordering gx - 1)
        if (gx - 1, gy) not in walkable:
            boundaries.append({
                "poly": [
                    {"x": dcx - 128, "y": dcy},
                    {"x": dcx, "y": dcy - 64},
                    {"x": dcx - 64, "y": dcy - 64 - 32},
                    {"x": dcx - 128 - 64, "y": dcy - 32}
                ]
            })

    # 9. Warm Torchlight Glow on Walls
    torch_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(torch_layer)
    torch_points = [
        (4, 7), (8, 5), (14, 6), (20, 2),
        (7, 13), (12, 12), (18, 5)
    ]
    for tgx, tgy in torch_points:
        _, _, tcx, tcy = grid_to_screen(tgx, tgy, 0)
        ty = tcy - 110
        t_draw.ellipse([tcx - 130, ty - 80, tcx + 130, ty + 80], fill=(255, 190, 80, 40))
        t_draw.ellipse([tcx - 65, ty - 40, tcx + 65, ty + 40], fill=(255, 220, 140, 70))
        t_draw.ellipse([tcx - 14, ty - 10, tcx + 14, ty + 10], fill=(255, 245, 210, 150))

    torch_layer = torch_layer.filter(ImageFilter.GaussianBlur(radius=15))
    canvas = Image.alpha_composite(canvas, torch_layer)

    # 10. Save Output Images and Data
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
        "obstacles": [], # All walls/railings are now baked into the floor & enclosed by thick boundary slabs!
        "boundary_slabs": boundaries
    }
    with open(out_json, "w") as f:
        json.dump(map_data, f, indent=2)
        
    print(f"Generated 2.5D Dungeon Pathway Map successfully!")
    print(f"Floor size: {canvas.size}, Boundary slabs: {len(boundaries)}")
    print(f"White light sanctuary at ({sp_sx}, {sp_sy})")

if __name__ == "__main__":
    main()
