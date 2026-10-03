#!/usr/bin/env python3
"""
Generate the gleaming White Robot Hero using the EXACT same grid cropping and frame indices
as the enemy robot troops:
- WalkingShoot 4x4 grid (1024x1024): indices [0, 2, 4, 6, 8, 10, 12, 14] for the 8 running frames
- Frame 0 of WalkingShoot for the idle frame (exact same standing stance, zero pop/change)
- Armor: Brilliant white/silver armor with glowing cyan energy visor
"""

import os
import shutil
import colorsys
from PIL import Image

ROBOT_DIR = "/home/srihith/Documents/Free8DirRobot"
OUT_DIR = "assets/sprites/hero"

DIR_MAP = {
    1: "SW",
    2: "W",
    3: "NW",
    4: "N",
    5: "NE",
    6: "E",
    7: "SE",
    8: "S"
}

def recolor_to_white_hero(im):
    im = im.convert("RGBA")
    w, h = im.size
    pix = im.load()
    res = im.copy()
    rpix = res.load()
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a < 30:
                continue
                
            # Visor / gun energy (greenish in original) -> Radiant Cyan/Electric Blue
            if g > r + 18 and g > b:
                rpix[x, y] = (30, 240, 255, a)
            else:
                h_val, s_val, v_val = colorsys.rgb_to_hsv(r/255, g/255, b/255)
                # Blue armor plating -> brilliant white/silver armor
                if 0.45 <= h_val <= 0.82:
                    val_boost = min(1.0, v_val * 1.35 + 0.18)
                    nr, ng, nb = colorsys.hsv_to_rgb(0.55, 0.05, val_boost)
                    rpix[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
                elif v_val < 0.20:
                    # Dark outlines and metallic joints
                    rpix[x, y] = (int(r * 0.9), int(g * 0.9), int(b * 0.9), a)
                else:
                    # Neutral highlights
                    val_boost = min(1.0, v_val * 1.25)
                    nr, ng, nb = colorsys.hsv_to_rgb(0.55, 0.03, val_boost)
                    rpix[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return res

def process_frame(crop_img):
    rec = recolor_to_white_hero(crop_img)
    # Scale 1.6x matching enemy troop scale
    scaled = rec.resize((int(256 * 1.6), int(256 * 1.6)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.paste(scaled, (-77, 25), scaled)
    return canvas

def main():
    # Clean output dir completely
    if os.path.exists(OUT_DIR):
        for f in os.listdir(OUT_DIR):
            f_path = os.path.join(OUT_DIR, f)
            if os.path.isfile(f_path):
                os.remove(f_path)
    os.makedirs(OUT_DIR, exist_ok=True)
    
    print("Generating White Robot Hero sprites with matching WalkingShoot frames...")
    
    walk_indices = [0, 2, 4, 6, 8, 10, 12, 14]
    
    for dir_idx, dir_name in DIR_MAP.items():
        walk_src_path = os.path.join(ROBOT_DIR, "WalkingShoot", f"LowPolyManny_Blue_rig_WalkingShoot_dir{dir_idx}.png")
        if not os.path.exists(walk_src_path):
            print(f"Warning: missing {walk_src_path}")
            continue
            
        walk_sheet = Image.open(walk_src_path)
        
        # 1. Idle frame: exactly frame 0 of WalkingShoot
        crop_0 = walk_sheet.crop((0, 0, 256, 256))
        idle_frame = process_frame(crop_0)
        idle_frame.save(os.path.join(OUT_DIR, f"{dir_name}_idle.png"))
        idle_frame.save(os.path.join(OUT_DIR, f"{dir_name}.png"))
        
        # 2. Run frames: 8 frames from the 4x4 grid
        for r_idx, f_num in enumerate(walk_indices):
            col = f_num % 4
            row = f_num // 4
            crop = walk_sheet.crop((col * 256, row * 256, (col + 1) * 256, (row + 1) * 256))
            run_frame = process_frame(crop)
            run_frame.save(os.path.join(OUT_DIR, f"{dir_name}_run_{r_idx}.png"))

    print(f"White Robot Hero generated successfully with exact enemy matching in {OUT_DIR}!")

if __name__ == "__main__":
    main()
