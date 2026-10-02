#!/usr/bin/env python3
"""
Process and colorize Kenney 2.5D Isometric Male character into Hero and Enemy Troops (Cyan, Magenta, Yellow, Red).
Generates full 8-directional idle and 10-frame running animations.
"""

import os
import colorsys
from PIL import Image

SRC_DIR = "assets/isometric_dungeon/Characters/Male"
OUT_BASE = "assets/sprites"

DIR_MAP = {
    0: "NW",
    1: "W",
    2: "SW",
    3: "S",
    4: "SE",
    5: "E",
    6: "NE",
    7: "N"
}

# (Target Hue 0..1, Saturation 0..1, Value Multiplier, Pants Tint Hue or None)
COLOR_CONFIGS = {
    "hero": {
        "shirt_hue": 0.52, # Cyan-Blue tactical
        "shirt_sat": 0.85,
        "band_hue": 0.50,
        "is_hero": True
    },
    "troop_cyan": {
        "shirt_hue": 0.50, # Cyan 180 deg
        "shirt_sat": 0.95,
        "band_hue": 0.00,  # Red band (complementary)
        "is_hero": False
    },
    "troop_magenta": {
        "shirt_hue": 0.83, # Magenta 300 deg
        "shirt_sat": 0.95,
        "band_hue": 0.33,  # Green band
        "is_hero": False
    },
    "troop_yellow": {
        "shirt_hue": 0.14, # Yellow 50 deg
        "shirt_sat": 0.95,
        "band_hue": 0.60,  # Blue band
        "is_hero": False
    },
    "troop_red": {
        "shirt_hue": 0.00, # Red 0 deg
        "shirt_sat": 0.95,
        "band_hue": 0.50,  # Cyan band
        "is_hero": False
    }
}

def recolor_frame(im, cfg):
    w, h = im.size
    pix = im.load()
    
    # Find bounding box
    ys = [y for y in range(h) for x in range(w) if pix[x, y][3] > 60]
    if not ys:
        return im
    min_y, max_y = min(ys), max(ys)
    char_h = max_y - min_y
    
    head_top = min_y
    head_bot = min_y + char_h * 0.20
    shirt_top = min_y + char_h * 0.20
    shirt_bot = min_y + char_h * 0.58
    pants_top = min_y + char_h * 0.58
    pants_bot = min_y + char_h * 0.85
    
    shirt_hue = cfg["shirt_hue"]
    shirt_sat = cfg["shirt_sat"]
    band_hue = cfg["band_hue"]
    is_hero = cfg["is_hero"]
    
    res = im.copy()
    rpix = res.load()
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a < 40:
                continue
            
            # Headband / Visor (around forehead)
            if head_top + char_h * 0.08 <= y <= head_top + char_h * 0.15:
                # Add colored band
                h_val, s_val, v_val = colorsys.rgb_to_hsv(r/255, g/255, b/255)
                nr, ng, nb = colorsys.hsv_to_rgb(band_hue, 0.95, min(1.0, v_val * 1.35))
                rpix[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
            # Shirt
            elif shirt_top <= y <= shirt_bot:
                h_val, s_val, v_val = colorsys.rgb_to_hsv(r/255, g/255, b/255)
                # Enhance brightness and apply vibrant hue
                val_mult = 1.3 if not is_hero else 1.45
                nr, ng, nb = colorsys.hsv_to_rgb(shirt_hue, shirt_sat, min(1.0, v_val * val_mult))
                rpix[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
            # Hero tactical dark suit pants
            elif is_hero and pants_top <= y <= pants_bot:
                h_val, s_val, v_val = colorsys.rgb_to_hsv(r/255, g/255, b/255)
                nr, ng, nb = colorsys.hsv_to_rgb(0.6, 0.25, v_val * 0.7)
                rpix[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
                
    return res

def main():
    print("Processing Kenney Isometric characters...")
    
    for char_name, cfg in COLOR_CONFIGS.items():
        out_dir = os.path.join(OUT_BASE, char_name)
        os.makedirs(out_dir, exist_ok=True)
        print(f"Generating sprites for {char_name} in {out_dir}...")
        
        for dir_idx, dir_name in DIR_MAP.items():
            # 1. Idle Frame
            idle_src = os.path.join(SRC_DIR, f"Male_{dir_idx}_Idle0.png")
            if os.path.exists(idle_src):
                im = Image.open(idle_src).convert("RGBA")
                rec = recolor_frame(im, cfg)
                # Save standard directional name
                rec.save(os.path.join(out_dir, f"{dir_name}.png"))
                rec.save(os.path.join(out_dir, f"{dir_name}_idle.png"))
                
            # 2. Run Frames (0..9)
            for r in range(10):
                run_src = os.path.join(SRC_DIR, f"Male_{dir_idx}_Run{r}.png")
                if os.path.exists(run_src):
                    im = Image.open(run_src).convert("RGBA")
                    rec = recolor_frame(im, cfg)
                    rec.save(os.path.join(out_dir, f"{dir_name}_run_{r}.png"))
                    
                    # Also save S_run_1..8 for general run cycle fallback
                    if dir_name == "S" and 1 <= r <= 8:
                        rec.save(os.path.join(out_dir, f"run_{r}.png"))

    print("All Kenney 2.5D Isometric character frames generated successfully!")

if __name__ == "__main__":
    main()
