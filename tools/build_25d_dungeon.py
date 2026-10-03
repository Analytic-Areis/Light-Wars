#!/usr/bin/env python3
"""
Generate a structured 2.5D Isometric Dungeon Pathway Map using Kenney Isometric Dungeon assets.
Features:
- Structured dungeon pathways and branching corridors instead of an open flat square arena
- Distinct Sanctuary Chamber with White Light runic altar at (1352, 1502)
- Dual branching pathways (North Flank Route & South Bastion Route) separated by a deep central chasm
- Central Crossroads Junction Hall with tactical cover and monument
- East Pass leading to the Northern Overlord Arena
- 3D stone cliff drop-offs (stoneSide_S, stoneSide_W, stoneSide_E) along all abyss borders
- Multi-tier upper battlement connected by stone stairs
- Soft directional drop shadows and warm torchlight atmosphere
- Exports high-resolution dungeon_floor.png, dungeon_arena.png, arena_map.jpg, and dungeon_map_data.json
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
    
    steps_n = load_img("stoneSteps_N")
    
    w_n = load_img("stoneWall_N")
    w_w = load_img("stoneWall_W")
    w_s = load_img("stoneWallHalf_S") or load_img("stoneWall_S")
    w_e = load_img("stoneWallHalf_E") or load_img("stoneWall_E")
    
    c_n = load_img("stoneWallCorner_N")
    c_e = load_img("stoneWallCorner_E")
    c_s = load_img("stoneWallCorner_S")
    c_w = load_img("stoneWallCorner_W")
    
    arch_n = load_img("stoneWallArchway_N")
    win_n = load_img("stoneWallWindowBars_N")
    broken_n = load_img("stoneWallBroken_N")
    
    col = load_img("stoneColumn_N")
    col_wood = load_img("stoneColumnWood_N")
    chest = load_img("chestClosed_N")
    
    cliff_s = load_img("stoneSide_S")
    cliff_w = load_img("stoneSide_W")
    cliff_e = load_img("stoneSide_E")

    # 2. Define Pathway Layout (Walkable Grid Coordinates)
    walkable = set()
    
    # Room 1: Sanctuary Bastion (around player spawn gx=3.5, gy=13.5)
    for x in range(2, 6):
        for y in range(12, 16):
            walkable.add((x, y))
    for pt in [(1, 13), (1, 14), (6, 13), (6, 14), (3, 11), (4, 11), (3, 16), (4, 16)]:
        walkable.add(pt)
        
    # Route A: Northern Flank Corridor (width 2-3 tiles)
    for x in range(3, 6):
        for y in range(8, 12):
            walkable.add((x, y))
    for x in range(5, 11):
        for y in range(6, 9):
            walkable.add((x, y))
            
    # Route B: Southern Bastion Corridor (width 2-3 tiles)
    for x in range(6, 11):
        for y in range(13, 16):
            walkable.add((x, y))
    for x in range(10, 13):
        for y in range(11, 14):
            walkable.add((x, y))
            
    # Note: gx in [6..9] and gy in [9..12] is an interior chasm dividing Route A and Route B!
    
    # Room 2: Central Crossroads & Grand Hall (convergence of Route A & B)
    for x in range(10, 16):
        for y in range(7, 11):
            walkable.add((x, y))
            
    # East Corridor towards Enemy Arena
    for x in range(14, 18):
        for y in range(5, 8):
            walkable.add((x, y))
            
    # Room 3: Overlord Enemy Arena / Northern Bastion
    for x in range(16, 21):
        for y in range(2, 6):
            walkable.add((x, y))
    for x in range(17, 21):
        for y in range(1, 3):
            walkable.add((x, y))

    # Elevation & Stairs
    elevation = {pt: 0 for pt in walkable}
    stairs = {(18, 2): "steps_n"}
    # Raised terrace in Overlord Arena
    for x in range(17, 21):
        for y in range(1, 3):
            if (x, y) not in stairs:
                elevation[(x, y)] = 1

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

    # 4. Define Walls, Columns and Props
    # (gx, gy) -> (img, type_name, tex_name)
    walls_and_props = {}
    
    # Northern boundary walls
    north_wall_defs = [
        (17, 1, win_n, "wall", "stoneWallWindowBars_N"),
        (18, 1, arch_n, "wall", "stoneWallArchway_N"),
        (19, 1, w_n, "wall", "stoneWall_N"),
        (20, 1, broken_n, "wall", "stoneWallBroken_N"),
        (16, 2, w_n, "wall", "stoneWall_N"),
        (14, 5, w_n, "wall", "stoneWall_N"),
        (15, 5, w_n, "wall", "stoneWall_N"),
        (10, 6, w_n, "wall", "stoneWall_N"),
        (11, 6, win_n, "wall", "stoneWallWindowBars_N"),
        (12, 6, w_n, "wall", "stoneWall_N"),
        (13, 6, broken_n, "wall", "stoneWallBroken_N"),
        (6, 6, w_n, "wall", "stoneWall_N"),
        (7, 6, w_n, "wall", "stoneWall_N"),
        (8, 6, w_n, "wall", "stoneWall_N"),
        (9, 6, w_n, "wall", "stoneWall_N"),
        (3, 8, w_n, "wall", "stoneWall_N"),
        (4, 8, w_n, "wall", "stoneWall_N"),
        (5, 8, w_n, "wall", "stoneWall_N")
    ]
    for gx, gy, img, p_type, tex in north_wall_defs:
        walls_and_props[(gx, gy)] = (img, p_type, tex)

    # Architectural columns & markers along the path network
    col_defs = [
        # Sanctuary boundary (grand circular frame, clear inside)
        (1, 13, col, "column", "stoneColumn_N"),
        (1, 14, col, "column", "stoneColumn_N"),
        (3, 16, col, "column", "stoneColumn_N"),
        (4, 16, col, "column", "stoneColumn_N"),
        # Central chasm border columns (preventing falling into abyss)
        (6, 12, col, "column", "stoneColumn_N"),
        (7, 12, col, "column", "stoneColumn_N"),
        (8, 11, col, "column", "stoneColumn_N"),
        (6, 9, col, "column", "stoneColumn_N"),
        (7, 9, col, "column", "stoneColumn_N"),
        (8, 9, col, "column", "stoneColumn_N"),
        # South path boundary
        (6, 15, col, "column", "stoneColumn_N"),
        (10, 15, col, "column", "stoneColumn_N"),
        (12, 13, col, "column", "stoneColumn_N"),
        # Crossroads grand monument & cover
        (12, 8, col, "column", "stoneColumn_N"),
        (13, 8, chest, "chest", "chestClosed_N"),
        (14, 8, col, "column", "stoneColumn_N"),
        # East corridor & Overlord arena
        (16, 5, col, "column", "stoneColumn_N"),
        (18, 4, col, "column", "stoneColumn_N"),
        (20, 3, col, "column", "stoneColumn_N"),
        (17, 3, col_wood, "column", "stoneColumnWood_N")
    ]
    for gx, gy, img, p_type, tex in col_defs:
        walls_and_props[(gx, gy)] = (img, p_type, tex)

    # 5. Generate Drop Shadows for Walls and Columns
    for (gx, gy), (p_img, p_type, _) in walls_and_props.items():
        z = elevation.get((gx, gy), 0)
        _, _, dcx, dcy = grid_to_screen(gx, gy, z)
        if p_type in ["column", "corner"]:
            shadow_draw.ellipse([dcx - 42, dcy - 18, dcx + 68, dcy + 22], fill=(0, 0, 0, 110))
        elif p_type in ["wall", "gate", "door"]:
            poly = [
                (dcx - 85, dcy - 10),
                (dcx + 85, dcy + 10),
                (dcx + 120, dcy + 38),
                (dcx - 50, dcy + 24)
            ]
            shadow_draw.polygon(poly, fill=(0, 0, 0, 125))
        elif p_type in ["chest", "crates"]:
            shadow_draw.ellipse([dcx - 45, dcy - 18, dcx + 60, dcy + 20], fill=(0, 0, 0, 95))

    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=8))

    # 6. Render 3D Foundation Cliffs on Abyss Borders
    all_coords = sorted(list(walkable), key=lambda c: (c[0] + c[1], c[1]))
    
    for gx, gy in all_coords:
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
        # South edge: stoneSide_S
        if (gx, gy + 1) not in walkable:
            canvas.paste(cliff_s, (draw_x, draw_y + 40), cliff_s)
        # East edge: stoneSide_E
        if (gx + 1, gy) not in walkable and cliff_e:
            canvas.paste(cliff_e, (draw_x, draw_y + 40), cliff_e)
        # West edge: stoneSide_W
        if (gx - 1, gy) not in walkable and cliff_w:
            canvas.paste(cliff_w, (draw_x, draw_y + 40), cliff_w)

    # 7. Render Floor Tiles
    for gx, gy in all_coords:
        z = elevation.get((gx, gy), 0)
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, z)
        
        if (gx, gy) in stairs:
            canvas.paste(steps_n, (draw_x, draw_y), steps_n)
            continue
            
        r = random.random()
        if (gx in [11, 12, 13] and gy in [8, 9]):
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

    # 8. Apply Shadow Layer onto the Floor
    canvas = Image.alpha_composite(canvas, shadow_layer)

    # 9. Render White Light Sanctuary Rune Circle (clean open center at 1352, 1502)
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

    # 10. Prepare Godot Obstacles list
    godot_obstacles = []
    for gx, gy in all_coords:
        if (gx, gy) in walls_and_props:
            p_img, p_type, tex_name = walls_and_props[(gx, gy)]
            z = elevation.get((gx, gy), 0)
            draw_x, draw_y, dcx, dcy = grid_to_screen(gx, gy, z)
            
            # Paste into visual map
            canvas.paste(p_img, (draw_x, draw_y), p_img)
            
            godot_obstacles.append({
                "name": f"{p_type}_{gx}_{gy}",
                "tex": tex_name,
                "x": dcx,
                "y": dcy,
                "type": p_type,
                "gx": gx,
                "gy": gy,
                "z": z
            })

    # 11. Generate Path Boundary Collisions along all borders and central chasm
    borders = []
    for gx, gy in all_coords:
        _, _, dcx, dcy = grid_to_screen(gx, gy, 0)
        # NE edge
        if (gx, gy - 1) not in walkable:
            borders.append({"x1": dcx, "y1": dcy - 64, "x2": dcx + 128, "y2": dcy})
        # SE edge
        if (gx + 1, gy) not in walkable:
            borders.append({"x1": dcx + 128, "y1": dcy, "x2": dcx, "y2": dcy + 64})
        # SW edge
        if (gx, gy + 1) not in walkable:
            borders.append({"x1": dcx, "y1": dcy + 64, "x2": dcx - 128, "y2": dcy})
        # NW edge
        if (gx - 1, gy) not in walkable:
            borders.append({"x1": dcx - 128, "y1": dcy, "x2": dcx, "y2": dcy - 64})

    # 12. Warm Torchlight Glare on Pathway Walls
    torch_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(torch_layer)
    torch_points = [
        (18, 1), (11, 6), (4, 8), (7, 6),
        (12, 8), (14, 8), (6, 12), (1, 14)
    ]
    for tgx, tgy in torch_points:
        _, _, tcx, tcy = grid_to_screen(tgx, tgy, elevation.get((tgx, tgy), 0))
        ty = tcy - 110
        t_draw.ellipse([tcx - 130, ty - 80, tcx + 130, ty + 80], fill=(255, 190, 80, 40))
        t_draw.ellipse([tcx - 65, ty - 40, tcx + 65, ty + 40], fill=(255, 220, 140, 70))
        t_draw.ellipse([tcx - 14, ty - 10, tcx + 14, ty + 10], fill=(255, 245, 210, 150))

    torch_layer = torch_layer.filter(ImageFilter.GaussianBlur(radius=15))
    canvas = Image.alpha_composite(canvas, torch_layer)

    # 13. Save Output Images and Data
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
        "obstacles": godot_obstacles,
        "borders": borders
    }
    with open(out_json, "w") as f:
        json.dump(map_data, f, indent=2)
        
    print(f"Generated 2.5D Dungeon Pathway Map successfully!")
    print(f"Floor size: {canvas.size}, Obstacles: {len(godot_obstacles)}")
    print(f"White light sanctuary at ({sp_sx}, {sp_sy})")

if __name__ == "__main__":
    main()
