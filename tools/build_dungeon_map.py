#!/usr/bin/env python3
"""
Generate a complete, high-resolution 2.5D isometric dungeon floor with platform cliff edges from darked_tones assets.
Uses ONLY flat tiles (no manholes) and renders 3D vertical platform edges on the perimeter.
"""

import os
import random
from PIL import Image, ImageDraw

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
    
    floor_canvas = Image.new("RGBA", (canvas_w, canvas_h), (8, 9, 14, 255))
    
    # Floor assets: ONLY FLAT TILES from darked_tones! (No manholes / missing tiles / uneven)
    tile_stone = load_img("stone_N")
    tile_stone_tile = load_img("stoneTile_N")
    
    # 3D Platform vertical cliff side faces
    side_s = load_img("stoneSide_S")
    side_w = load_img("stoneSide_W")
    corner_s = load_img("stoneCorner_S")
    
    coords = [(gx, gy) for gx in range(COLS) for gy in range(ROWS)]
    coords.sort(key=lambda c: (c[0] + c[1], c[1]))
    
    for gx, gy in coords:
        sx = int((gx - gy) * (TW / 2) + origin_x)
        sy = int((gx + gy) * (TH / 2) + origin_y)
        draw_x = sx
        draw_y = sy + TH - TILE_H
        
        # Determine tile
        if gx == 0 and gy == ROWS - 1:
            tile_img = corner_s if corner_s else tile_stone
        elif gx == 0:
            tile_img = side_w if side_w else tile_stone
        elif gy == ROWS - 1:
            tile_img = side_s if side_s else tile_stone
        else:
            r = random.random()
            tile_img = tile_stone if r < 0.60 else tile_stone_tile
            
        floor_canvas.paste(tile_img, (draw_x, draw_y), tile_img)
        
    # White Light Rune Circle at sanctuary (gx=3.5, gy=13.5)
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
    floor_canvas = Image.alpha_composite(floor_canvas, rune_layer)
    
    out_floor = "assets/textures/dungeon_floor.png"
    floor_canvas.save(out_floor)
    print(f"Generated {out_floor} size: {floor_canvas.size} with 2.5D cliff edges and flat darked_tones tiles!")
    
    out_png = "assets/textures/dungeon_arena.png"
    out_jpg = "assets/textures/arena_map.jpg"
    floor_canvas.save(out_png)
    
    rgb_canvas = Image.new("RGB", floor_canvas.size, (8, 9, 14))
    rgb_canvas.paste(floor_canvas, mask=floor_canvas.split()[3])
    rgb_canvas.save(out_jpg, quality=94)
    print(f"Saved {out_png} and {out_jpg}")

if __name__ == "__main__":
    main()
