#!/usr/bin/env python3
"""
Generate a complete, authentic 2.5D Isometric Dungeon Map using Kenney Isometric Dungeon assets.
Features:
- Multi-tier isometric geometry with raised upper battlements connected by stone steps
- Full 2.5D vertical perimeter fortress walls with archways, gates, barred windows, and corners
- Tactical 2.5D stone columns, wooden scaffolding, stacked barrels, and supply crates
- 3D stone cliff drop-offs on perimeter edges
- Soft directional isometric drop-shadows and torchlight illumination
- Luminous White Light Sanctuary runic circle at (1352, 1502)
- Exports high-resolution dungeon_floor.png, dungeon_arena.png, arena_map.jpg, and dungeon_map_data.json
"""

import os
import random
import json
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

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
    # Floor tiles
    f_stone = load_img("stone_N")
    f_tile = load_img("stoneTile_N")
    f_uneven = load_img("stoneUneven_N")
    f_missing = load_img("stoneMissingTiles_N")
    f_dirt = load_img("dirtTiles_N") or load_img("dirt_N")
    
    # Steps / stairs
    steps_n = load_img("stoneSteps_N")
    steps_s = load_img("stoneSteps_S")
    steps_w = load_img("stoneSteps_W")
    
    # Walls
    w_n = load_img("stoneWall_N")
    w_w = load_img("stoneWall_W")
    w_s = load_img("stoneWall_S")
    w_e = load_img("stoneWall_E")
    
    c_n = load_img("stoneWallCorner_N")
    c_e = load_img("stoneWallCorner_E")
    c_s = load_img("stoneWallCorner_S")
    c_w = load_img("stoneWallCorner_W")
    
    arch_n = load_img("stoneWallArchway_N")
    arch_w = load_img("stoneWallArchway_W")
    gate_w = load_img("stoneWallGateOpen_W")
    door_s = load_img("stoneWallDoorOpen_S")
    door_e = load_img("stoneWallDoorOpen_E")
    win_n = load_img("stoneWallWindowBars_N")
    broken_n = load_img("stoneWallBroken_N")
    half_s = load_img("stoneWallHalf_S")
    half_e = load_img("stoneWallHalf_E")
    
    # Props & Architecture
    col = load_img("stoneColumn_N")
    col_wood = load_img("stoneColumnWood_N")
    support_n = load_img("woodenSupportsBlock_N")
    support_e = load_img("woodenSupportsBlock_E")
    crates = load_img("woodenCrates_N")
    crate_s = load_img("woodenCrate_N")
    barrels_stack = load_img("barrelsStacked_N")
    barrels = load_img("barrels_N")
    barrel = load_img("barrel_N")
    chest = load_img("chestClosed_N")
    
    # Cliffs
    cliff_s = load_img("stoneSide_S")
    cliff_w = load_img("stoneSide_W")
    cliff_e = load_img("stoneSide_E")
    cliff_uneven_s = load_img("stoneSideUneven_S") or cliff_s
    cliff_uneven_w = load_img("stoneSideUneven_W") or cliff_w

    # Canvas initialization
    # Dark atmospheric dungeon void
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (8, 9, 14, 255))
    shadow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    
    # Grid state
    # Elevation: (gx, gy) -> z_level (0 = floor, 1 = raised terrace +78px)
    elevation = {}
    for gx in range(COLS):
        for gy in range(ROWS):
            elevation[(gx, gy)] = 0
            
    # Raised upper terrace along northern fortress wall: gy in [1, 2], gx in [3..18]
    # Except stair access points
    stairs = {
        (7, 2): "steps_n",
        (14, 2): "steps_n"
    }
    for gx in range(3, 19):
        for gy in range(1, 3):
            if (gx, gy) not in stairs:
                elevation[(gx, gy)] = 1
                
    # Place walls & obstacles dictionary: (gx, gy) -> (img, type_name, tex_name)
    walls_and_props = {}
    
    # 1. Perimeter Walls & Corners
    for gx in range(COLS):
        for gy in range(ROWS):
            # Corners
            if gx == COLS - 1 and gy == 0:
                walls_and_props[(gx, gy)] = (c_n, "corner", "stoneWallCorner_N")
            elif gx == COLS - 1 and gy == ROWS - 1:
                walls_and_props[(gx, gy)] = (c_e, "corner", "stoneWallCorner_E")
            elif gx == 0 and gy == ROWS - 1:
                walls_and_props[(gx, gy)] = (c_s, "corner", "stoneWallCorner_S")
            elif gx == 0 and gy == 0:
                walls_and_props[(gx, gy)] = (c_w, "corner", "stoneWallCorner_W")
            # Walls
            elif gy == 0:
                if gx in [6, 15]:
                    walls_and_props[(gx, gy)] = (win_n, "wall", "stoneWallWindowBars_N")
                elif gx == 11:
                    walls_and_props[(gx, gy)] = (arch_n, "wall", "stoneWallArchway_N")
                elif gx in [4, 18]:
                    walls_and_props[(gx, gy)] = (broken_n, "wall", "stoneWallBroken_N")
                else:
                    walls_and_props[(gx, gy)] = (w_n, "wall", "stoneWall_N")
            elif gx == COLS - 1:
                if gy == ROWS // 2:
                    walls_and_props[(gx, gy)] = (gate_w, "gate", "stoneWallGateOpen_W")
                else:
                    walls_and_props[(gx, gy)] = (w_w, "wall", "stoneWall_W")
            elif gy == ROWS - 1:
                if gx == COLS // 2:
                    walls_and_props[(gx, gy)] = (door_s, "door", "stoneWallDoorOpen_S")
                else:
                    walls_and_props[(gx, gy)] = (half_s, "wall", "stoneWallHalf_S")
            elif gx == 0:
                if gy == ROWS // 2:
                    walls_and_props[(gx, gy)] = (door_e, "door", "stoneWallDoorOpen_E")
                else:
                    walls_and_props[(gx, gy)] = (half_e, "wall", "stoneWallHalf_E")

    # 2. Raised Terrace Scaffolding & Front Wall
    # Front balustrade / supports for the terrace along gy = 2
    for gx in range(3, 19):
        if (gx, 2) not in stairs and (gx, 2) not in walls_and_props:
            if gx in [3, 10, 18]:
                walls_and_props[(gx, 2)] = (col_wood, "column", "stoneColumnWood_N")
            elif gx in [5, 12, 16]:
                walls_and_props[(gx, 2)] = (support_n, "scaffold", "woodenSupportsBlock_N")

    # 3. Inner Tactical Arena Props & Columns
    # Grand central monument & cover
    walls_and_props[(10, 8)] = (col, "column", "stoneColumn_N")
    walls_and_props[(11, 8)] = (chest, "chest", "chestClosed_N")
    walls_and_props[(12, 8)] = (col, "column", "stoneColumn_N")
    
    # Barricade Alpha (upper corridor)
    walls_and_props[(6, 5)] = (crates, "crates", "woodenCrates_N")
    walls_and_props[(7, 5)] = (barrels, "barrel", "barrels_N")
    
    # Barricade Beta (east hall)
    walls_and_props[(15, 6)] = (col, "column", "stoneColumn_N")
    walls_and_props[(16, 6)] = (barrels_stack, "crates", "barrelsStacked_N")
    
    # Barricade Gamma (lower hall)
    walls_and_props[(15, 12)] = (crates, "crates", "woodenCrates_N")
    walls_and_props[(16, 12)] = (barrel, "barrel", "barrel_N")
    walls_and_props[(15, 13)] = (barrels_stack, "crates", "barrelsStacked_N")
    
    # Sanctuary guardian columns (surrounding spawn at gx=3.5, gy=13.5)
    walls_and_props[(2, 11)] = (col, "column", "stoneColumn_N")
    walls_and_props[(2, 15)] = (col, "column", "stoneColumn_N")
    walls_and_props[(5, 15)] = (col, "column", "stoneColumn_N")

    # Helper coordinate conversion
    def grid_to_screen(gx, gy, z=0):
        sx = int((gx - gy) * (TW / 2) + origin_x)
        sy = int((gx + gy) * (TH / 2) + origin_y)
        draw_x = sx
        draw_y = sy + TH - TILE_H - (z * 78)
        diamond_cx = sx + TW // 2
        diamond_cy = sy + TH // 2 - (z * 78)
        return draw_x, draw_y, diamond_cx, diamond_cy

    # 4. Generate Soft 2.5D Isometric Drop Shadows
    for (gx, gy), (p_img, p_type, _) in walls_and_props.items():
        z = elevation.get((gx, gy), 0)
        _, _, dcx, dcy = grid_to_screen(gx, gy, z)
        # Shadow stretches down-right in isometric view
        if p_type in ["column", "corner"]:
            shadow_draw.ellipse([dcx - 45, dcy - 18, dcx + 75, dcy + 24], fill=(0, 0, 0, 110))
        elif p_type in ["wall", "gate", "door", "scaffold"]:
            # Polygon shadow
            poly = [
                (dcx - 90, dcy - 10),
                (dcx + 90, dcy + 10),
                (dcx + 130, dcy + 40),
                (dcx - 50, dcy + 25)
            ]
            shadow_draw.polygon(poly, fill=(0, 0, 0, 125))
        elif p_type in ["crates", "barrel", "chest"]:
            shadow_draw.ellipse([dcx - 50, dcy - 20, dcx + 65, dcy + 22], fill=(0, 0, 0, 95))

    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=8))

    # 5. Render Floor & Foundation Cliffs (sorted back-to-front: c[0] + c[1], c[1])
    coords = [(gx, gy) for gx in range(COLS) for gy in range(ROWS)]
    coords.sort(key=lambda c: (c[0] + c[1], c[1]))

    # Draw bottom foundation cliff blocks first for the perimeter
    for gx, gy in coords:
        if gy == ROWS - 1 or gx == 0:
            draw_x, draw_y, _, _ = grid_to_screen(gx, gy, 0)
            cliff_img = cliff_s if gy == ROWS - 1 else cliff_e
            canvas.paste(cliff_img, (draw_x, draw_y + 40), cliff_img)

    # Draw floor tiles
    for gx, gy in coords:
        z = elevation.get((gx, gy), 0)
        draw_x, draw_y, _, _ = grid_to_screen(gx, gy, z)
        
        # Check if stairs
        if (gx, gy) in stairs:
            canvas.paste(steps_n, (draw_x, draw_y), steps_n)
            continue
            
        # Floor variation
        r = random.random()
        if (gx in [10, 11, 12] and gy in [7, 8, 9]) or (gx in [15, 16] and gy in [11, 12]):
            t_img = f_dirt if f_dirt else f_uneven
        elif r < 0.60:
            t_img = f_stone
        elif r < 0.85:
            t_img = f_tile
        elif r < 0.94:
            t_img = f_uneven
        else:
            t_img = f_missing
            
        canvas.paste(t_img, (draw_x, draw_y), t_img)

    # 6. Apply Shadow Layer onto the Floor
    canvas = Image.alpha_composite(canvas, shadow_layer)

    # 7. Render White Light Sanctuary Rune Circle
    spawn_gx, spawn_gy = 3.5, 13.5
    sp_sx = int((spawn_gx - spawn_gy) * (TW / 2) + origin_x + TW // 2)
    sp_sy = int((spawn_gx + spawn_gy) * (TH / 2) + origin_y + TH // 2)
    
    rune_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(rune_layer)
    ew, eh = 220, 110
    # Outer mystic glow
    for off in range(12, 0, -3):
        r_draw.ellipse(
            [sp_sx - ew - off, sp_sy - eh - off//2, sp_sx + ew + off, sp_sy + eh + off//2],
            outline=(140, 220, 255, 30),
            width=2
        )
    # Main outer ring
    r_draw.ellipse(
        [sp_sx - ew, sp_sy - eh, sp_sx + ew, sp_sy + eh],
        fill=(160, 230, 255, 40),
        outline=(190, 245, 255, 200),
        width=4
    )
    # Inner ring & celestial geometry
    r_draw.ellipse(
        [sp_sx - ew + 40, sp_sy - eh + 20, sp_sx + ew - 40, sp_sy + eh - 20],
        outline=(160, 230, 255, 150),
        width=3
    )
    # Diamond runes
    r_draw.polygon([
        (sp_sx, sp_sy - eh + 22),
        (sp_sx + ew - 42, sp_sy),
        (sp_sx, sp_sy + eh - 22),
        (sp_sx - ew + 42, sp_sy)
    ], outline=(210, 250, 255, 180), width=2)
    
    # Core crystal conduit
    r_draw.ellipse(
        [sp_sx - 28, sp_sy - 14, sp_sx + 28, sp_sy + 14],
        fill=(225, 255, 255, 230),
        outline=(180, 240, 255, 255),
        width=2
    )
    canvas = Image.alpha_composite(canvas, rune_layer)

    # 8. Render All 2.5D Walls, Corners, Pillars & Props in strict back-to-front order
    # (Background walls & props rendered into visual map; dynamic obstacle list prepared for Godot collision)
    godot_obstacles = []
    
    for gx, gy in coords:
        if (gx, gy) in walls_and_props:
            p_img, p_type, tex_name = walls_and_props[(gx, gy)]
            z = elevation.get((gx, gy), 0)
            draw_x, draw_y, dcx, dcy = grid_to_screen(gx, gy, z)
            
            # Paste into visual map
            canvas.paste(p_img, (draw_x, draw_y), p_img)
            
            # Prepare Godot collision/obstacle data
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

    # 9. Warm Torchlight Glare on Walls
    torch_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(torch_layer)
    torch_points = [
        (6, 0), (11, 0), (15, 0),
        (10, 8), (12, 8),
        (2, 11), (2, 15), (5, 15)
    ]
    for tgx, tgy in torch_points:
        _, _, tcx, tcy = grid_to_screen(tgx, tgy, elevation.get((tgx, tgy), 0))
        # Torch glow at wall height (120px above ground diamond)
        ty = tcy - 120
        t_draw.ellipse([tcx - 140, ty - 90, tcx + 140, ty + 90], fill=(255, 190, 80, 45))
        t_draw.ellipse([tcx - 70, ty - 45, tcx + 70, ty + 45], fill=(255, 220, 140, 75))
        t_draw.ellipse([tcx - 15, ty - 10, tcx + 15, ty + 10], fill=(255, 245, 210, 160))

    torch_layer = torch_layer.filter(ImageFilter.GaussianBlur(radius=15))
    canvas = Image.alpha_composite(canvas, torch_layer)

    # 10. Save Output Images and Data
    out_floor = "assets/textures/dungeon_floor.png"
    out_png = "assets/textures/dungeon_arena.png"
    out_jpg = "assets/textures/arena_map.jpg"
    out_json = "assets/textures/dungeon_map_data.json"
    
    canvas.save(out_floor)
    canvas.save(out_png)
    
    # Save optimized JPG
    rgb_canvas = Image.new("RGB", canvas.size, (8, 9, 14))
    rgb_canvas.paste(canvas, mask=canvas.split()[3])
    rgb_canvas.save(out_jpg, quality=94)
    
    # Save map data JSON
    map_data = {
        "width": canvas_w,
        "height": canvas_h,
        "whiteLight": {
            "x": sp_sx,
            "y": sp_sy,
            "radius": 190
        },
        "obstacles": godot_obstacles
    }
    with open(out_json, "w") as f:
        json.dump(map_data, f, indent=2)
        
    print(f"Generated 2.5D Dungeon Map successfully!")
    print(f"Floor size: {canvas.size}, Obstacles: {len(godot_obstacles)}")
    print(f"White light sanctuary at ({sp_sx}, {sp_sy})")

if __name__ == "__main__":
    main()
