#!/usr/bin/env python3
"""
Extract and colorize Free8DirRobot assets for enemy troops:
- troop_cyan (Cyan armor, Red visor)
- troop_magenta (Magenta armor, Green visor)
- troop_yellow (Yellow armor, Blue visor)
- troop_red (Red armor, Cyan visor)
Generates 8-direction idle frames and walk/run animation cycles.
"""

import os
import colorsys
from PIL import Image

ROBOT_DIR = "/home/srihith/Documents/Free8DirRobot"
OUT_BASE = "assets/sprites"

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

ROBOT_CONFIGS = {
    "troop_cyan": {
        "armor_hue": 0.50, # Cyan (180 deg)
        "visor_hue": 0.00  # Red
    },
    "troop_magenta": {
        "armor_hue": 0.83, # Magenta (300 deg)
        "visor_hue": 0.33  # Green
    },
    "troop_yellow": {
        "armor_hue": 0.14, # Yellow (50 deg)
        "visor_hue": 0.60  # Blue
    },
    "troop_red": {
        "armor_hue": 0.00, # Red (0 deg)
        "visor_hue": 0.50  # Cyan
    },
    "troop_green": {
        "armor_hue": 0.33, # Green (120 deg)
        "visor_hue": 0.83  # Magenta
    },
    "troop_blue": {
        "armor_hue": 0.60, # Blue (216 deg)
        "visor_hue": 0.14  # Yellow
    }
}

def recolor_robot(im, armor_hue, visor_hue):
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
            # Eye / gun laser green tint
            if g > r + 18 and g > b:
                vr, vg, vb = colorsys.hsv_to_rgb(visor_hue, 1.0, 1.0)
                rpix[x, y] = (int(vr * 255), int(vg * 255), int(vb * 255), a)
            else:
                h_val, s_val, v_val = colorsys.rgb_to_hsv(r/255, g/255, b/255)
                # Blue armor plating
                if 0.48 <= h_val <= 0.78:
                    nr, ng, nb = colorsys.hsv_to_rgb(armor_hue, min(1.0, s_val * 1.35), min(1.0, v_val * 1.25))
                    rpix[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
                elif v_val < 0.22:
                    # Dark outlines and metallic joints
                    pass
                else:
                    nr, ng, nb = colorsys.hsv_to_rgb(armor_hue, s_val, v_val)
                    rpix[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return res

def process_frame(crop_img, armor_hue, visor_hue):
    # Recolor
    rec = recolor_robot(crop_img, armor_hue, visor_hue)
    
    # Scale 1.6x so height is ~142px (matching standard 2.5D character scale)
    scaled = rec.resize((int(256 * 1.6), int(256 * 1.6)), Image.Resampling.LANCZOS)
    
    # Place on 256x256 canvas with feet touching at y=235
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.paste(scaled, (-77, 25), scaled)
    return canvas

def main():
    print("Processing Free8DirRobot assets for enemy troops...")
    
    for troop_name, cfg in ROBOT_CONFIGS.items():
        out_dir = os.path.join(OUT_BASE, troop_name)
        os.makedirs(out_dir, exist_ok=True)
        print(f"Generating robot troop sprites in {out_dir}...")
        
        for dir_idx, dir_name in DIR_MAP.items():
            # 1. Idle Frame (from IdleAim or WalkingShoot frame 0)
            idle_src_path = os.path.join(ROBOT_DIR, "IdleAim", f"LowPolyManny_Blue_rig_IdleAim_dir{dir_idx}.png")
            if not os.path.exists(idle_src_path):
                idle_src_path = os.path.join(ROBOT_DIR, "WalkingShoot", f"LowPolyManny_Blue_rig_WalkingShoot_dir{dir_idx}.png")
                
            idle_sheet = Image.open(idle_src_path)
            idle_crop = idle_sheet.crop((0, 0, 256, 256))
            idle_final = process_frame(idle_crop, cfg["armor_hue"], cfg["visor_hue"])
            idle_final.save(os.path.join(out_dir, f"{dir_name}_idle.png"))
            idle_final.save(os.path.join(out_dir, f"{dir_name}.png"))
            
            # 2. Walk/Run Cycle (from WalkingShoot)
            walk_src_path = os.path.join(ROBOT_DIR, "WalkingShoot", f"LowPolyManny_Blue_rig_WalkingShoot_dir{dir_idx}.png")
            if os.path.exists(walk_src_path):
                walk_sheet = Image.open(walk_src_path)
                # 8 evenly spaced walking frames (0, 2, 4, 6, 8, 10, 12, 14)
                walk_indices = [0, 2, 4, 6, 8, 10, 12, 14]
                for r_idx, f_num in enumerate(walk_indices):
                    col = f_num % 4
                    row = f_num // 4
                    crop = walk_sheet.crop((col * 256, row * 256, (col + 1) * 256, (row + 1) * 256))
                    walk_final = process_frame(crop, cfg["armor_hue"], cfg["visor_hue"])
                    walk_final.save(os.path.join(out_dir, f"{dir_name}_run_{r_idx}.png"))
                    
                    if dir_name == "S":
                        walk_final.save(os.path.join(out_dir, f"run_{r_idx + 1}.png"))

    print("Free8DirRobot enemies successfully generated for all troop colors!")

if __name__ == "__main__":
    main()
