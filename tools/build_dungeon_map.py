#!/usr/bin/env python3
"""
Generate a complete, high-resolution isometric dungeon arena map from Kenney Isometric Dungeon assets.
"""

import os
import random
from PIL import Image, ImageDraw, ImageFilter

ASSET_DIR = "assets/isometric_dungeon/Isometric"

def load_img(name):
    path = os.path.join(ASSET_DIR, f"{name}.png")
    if os.path.exists(path):
        return Image.open(path).convert("RGBA")
    print(f"Warning: {path} not found")
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
    canvas_w = max_sx - min_sx + margin_x * 2
    canvas_h = max_sy - min_sy + margin_y * 2
    
    origin_x = -min_sx + margin_x
    origin_y = margin_y
    
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (12, 14, 20, 255))
    
    # Floor assets
    tiles_floor = [
        load_img("stone_N"),
        load_img("stoneTile_N"),
        load_img("stoneUneven_N"),
        load_img("stoneMissingTiles_N")
    ]
    tile_dirt = load_img("dirtTiles_N") or load_img("dirt_N")
    
    # Wall assets
    w_n = load_img("stoneWall_N")
    w_w = load_img("stoneWall_W")
    w_s = load_img("stoneWall_S")
    w_e = load_img("stoneWall_E")
    
    c_n = load_img("stoneWallCorner_N")
    c_e = load_img("stoneWallCorner_E")
    c_s = load_img("stoneWallCorner_S")
    c_w = load_img("stoneWallCorner_W")
    
    arch_n = load_img("stoneWallArchway_N")
    gate_w = load_img("stoneWallGateOpen_W") or load_img("stoneWallGateOpen_N")
    door_s = load_img("stoneWallDoorOpen_S") or w_s
    door_e = load_img("stoneWallDoorOpen_E") or w_e
    
    # Prop assets
    col = load_img("stoneColumn_N")
    col_wood = load_img("stoneColumnWood_N")
    crates = load_img("woodenCrates_N")
    crate_s = load_img("woodenCrate_N")
    barrels = load_img("barrelsStacked_N")
    barrel_s = load_img("barrels_N")
    chest = load_img("chestClosed_N")
    
    # Grid of props: (gx, gy) -> Image
    props = {}
    
    # 1. Perimeter Walls & Corners
    for gx in range(COLS):
        for gy in range(ROWS):
            # Corners
            if gx == COLS - 1 and gy == 0:
                props[(gx, gy)] = c_n
            elif gx == COLS - 1 and gy == ROWS - 1:
                props[(gx, gy)] = c_e
            elif gx == 0 and gy == ROWS - 1:
                props[(gx, gy)] = c_s
            elif gx == 0 and gy == 0:
                props[(gx, gy)] = c_w
            # Walls
            elif gy == 0:
                props[(gx, gy)] = arch_n if gx == COLS // 2 else w_n
            elif gx == COLS - 1:
                props[(gx, gy)] = gate_w if gy == ROWS // 2 else w_w
            elif gy == ROWS - 1:
                props[(gx, gy)] = door_s if gx == COLS // 2 else w_s
            elif gx == 0:
                props[(gx, gy)] = door_e if gy == ROWS // 2 else w_e

    # 2. Inner Tactical Obstacles
    # Center monument
    props[(10, 8)] = col
    props[(11, 8)] = chest
    props[(12, 8)] = col
    
    # Upper-left crates & barrels
    props[(6, 4)] = crates
    props[(7, 4)] = barrel_s
    props[(6, 5)] = crate_s
    
    # Upper-right column & barricade
    props[(16, 5)] = col_wood
    props[(17, 5)] = crates
    props[(16, 6)] = barrels
    
    # Lower-right crates & barrels
    props[(15, 12)] = barrels
    props[(16, 12)] = crates
    props[(15, 13)] = barrel_s
    
    # Sanctuary sanctuary columns (gx=3.5, gy=13.5 area)
    props[(2, 11)] = col
    props[(2, 15)] = col
    props[(5, 15)] = col

    # Draw all floors first
    coords = [(gx, gy) for gx in range(COLS) for gy in range(ROWS)]
    coords.sort(key=lambda c: (c[0] + c[1], c[1]))
    
    for gx, gy in coords:
        sx = int((gx - gy) * (TW / 2) + origin_x)
        sy = int((gx + gy) * (TH / 2) + origin_y)
        draw_x = sx
        draw_y = sy + TH - TILE_H
        
        # Floor variation
        r = random.random()
        if gx < 6 and gy > 11:
            tile_img = tiles_floor[0]
        elif (gx in [10, 11, 12] and gy in [7, 8, 9]) or (gx in [15, 16] and gy in [11, 12]):
            tile_img = tile_dirt if tile_dirt else tiles_floor[2]
        elif r < 0.65:
            tile_img = tiles_floor[0]
        elif r < 0.82:
            tile_img = tiles_floor[1]
        elif r < 0.92:
            tile_img = tiles_floor[2]
        else:
            tile_img = tiles_floor[3]
            
        canvas.paste(tile_img, (draw_x, draw_y), tile_img)
        
        # Draw prop if present
        if (gx, gy) in props and props[(gx, gy)]:
            p_img = props[(gx, gy)]
            canvas.paste(p_img, (draw_x, draw_y), p_img)
            
    # Add White Light Rune Circle at sanctuary (gx=3.5, gy=13.5)
    spawn_gx, spawn_gy = 3.5, 13.5
    sp_sx = int((spawn_gx - spawn_gy) * (TW / 2) + origin_x + TW // 2)
    sp_sy = int((spawn_gx + spawn_gy) * (TH / 2) + origin_y + TH // 2)
    
    rune_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(rune_layer)
    ew = 230
    eh = 115
    # Outer glow
    r_draw.ellipse(
        [sp_sx - ew, sp_sy - eh, sp_sx + ew, sp_sy + eh],
        fill=(170, 225, 255, 45),
        outline=(190, 245, 255, 160),
        width=4
    )
    # Inner ring
    r_draw.ellipse(
        [sp_sx - ew + 35, sp_sy - eh + 18, sp_sx + ew - 35, sp_sy + eh - 18],
        outline=(150, 220, 255, 110),
        width=2
    )
    # Center rune glyphs / dots
    r_draw.ellipse(
        [sp_sx - 20, sp_sy - 10, sp_sx + 20, sp_sy + 10],
        fill=(220, 250, 255, 180)
    )
    canvas = Image.alpha_composite(canvas, rune_layer)
    
    # Crop canvas to content
    bbox = canvas.getbbox()
    if bbox:
        pad = 40
        crop_box = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(canvas_w, bbox[2] + pad),
            min(canvas_h, bbox[3] + pad)
        )
        canvas = canvas.crop(crop_box)
        
    out_png = "assets/textures/dungeon_arena.png"
    out_jpg = "assets/textures/arena_map.jpg"
    canvas.save(out_png)
    
    # Save optimized JPG as arena_map.jpg for both Godot and Web!
    rgb_canvas = Image.new("RGB", canvas.size, (12, 14, 20))
    rgb_canvas.paste(canvas, mask=canvas.split()[3])
    rgb_canvas.save(out_jpg, quality=94)
    
    print(f"Generated {out_png} and {out_jpg} size: {canvas.size}")

if __name__ == "__main__":
    main()
