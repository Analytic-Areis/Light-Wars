#!/usr/bin/env python3
"""
Extract 8-directional animated Hero sprites from new_girl.zip.
Extracts 14 Idle frames and 9 Walk frames per direction with fixed center and ground baseline.
"""

import os, zipfile, io
from PIL import Image

ZIP_PATH = "/home/srihith/Downloads/new_girl.zip"
OUT_DIR = "assets/sprites/hero"

DIR_MAP = {
    "Down": "S",
    "DownRight": "SE",
    "Right": "E",
    "UpRight": "NE",
    "Up": "N",
    "UpLeft": "NW",
    "Left": "W",
    "DownLeft": "SW"
}

# The cells in new_girl are 256x256.
# Bounding box is centered around x=128, feet at y=167.
# We crop a 160x160 window: x: 48..208, y: 16..176
CROP_X1, CROP_X2 = 48, 208
CROP_Y1, CROP_Y2 = 16, 176

def main():
    if not os.path.exists(ZIP_PATH):
        print(f"Error: {ZIP_PATH} not found")
        return
        
    os.makedirs(OUT_DIR, exist_ok=True)
    z = zipfile.ZipFile(ZIP_PATH)
    
    for src_name, d_code in DIR_MAP.items():
        # Process Idle
        idle_path = f"new_girl/Idle/GirlSample_ReadyIdle_{src_name}.png"
        if idle_path in z.namelist():
            im_idle = Image.open(io.BytesIO(z.read(idle_path)))
            cols, rows = im_idle.width // 256, im_idle.height // 256
            idle_idx = 0
            for r in range(rows):
                for c in range(cols):
                    cell = im_idle.crop((c*256, r*256, (c+1)*256, (r+1)*256))
                    if cell.getbbox():
                        frame = cell.crop((CROP_X1, CROP_Y1, CROP_X2, CROP_Y2))
                        frame.save(f"{OUT_DIR}/{d_code}_idle_{idle_idx}.png")
                        if idle_idx == 0:
                            frame.save(f"{OUT_DIR}/{d_code}_idle.png")
                            frame.save(f"{OUT_DIR}/{d_code}.png")
                        idle_idx += 1
                        
        # Process Walk
        walk_path = f"new_girl/Walk/GirlSample_Walk_{src_name}.png"
        if walk_path in z.namelist():
            im_walk = Image.open(io.BytesIO(z.read(walk_path)))
            cols, rows = im_walk.width // 256, im_walk.height // 256
            walk_idx = 0
            for r in range(rows):
                for c in range(cols):
                    cell = im_walk.crop((c*256, r*256, (c+1)*256, (r+1)*256))
                    if cell.getbbox():
                        frame = cell.crop((CROP_X1, CROP_Y1, CROP_X2, CROP_Y2))
                        frame.save(f"{OUT_DIR}/{d_code}_run_{walk_idx}.png")
                        walk_idx += 1
                        
    print("New Girl 8-directional hero sprites generated successfully!")

if __name__ == "__main__":
    main()
