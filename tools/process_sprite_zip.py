#!/usr/bin/env python3
import os
import shutil
from PIL import Image
import numpy as np

ZIP_DIR = "/tmp/user_sprite_zip/sprite"
OUTPUT_DIR = "/home/srihith/Light-Wars/assets/sprites/hero"

RUN_SHEET = os.path.join(ZIP_DIR, "Eight-Direction Pixel RPG Running Sprite Sheet.png")
IDLE_SHEET = os.path.join(ZIP_DIR, "Chibi Soldier Idle Sprite Atlas.png")
SHOOT_SHEET = os.path.join(ZIP_DIR, "Eight-Direction Pixel Shooter Sprite Sheet.png")

ROW_MAP = {
    "N": (0, False),
    "NE": (1, False),
    "E": (2, False),
    "S": (3, False),
    "SE": (4, False),
    "SW": (5, False),
    "W": (2, True),   # East flipped horizontally
    "NW": (6, False)
}

GROUND_BASELINES = [153, 308, 463, 618, 773, 928, 1079]
ROW_CUTS = [0, 155, 310, 465, 620, 775, 930, 1084]

TARGET_CANVAS = (160, 160)
SCALE = 0.66
FEET_Y = 145

def get_columns(alpha_slice, min_width=25):
    col_sums = np.sum(alpha_slice > 10, axis=0)
    cols = []
    in_col = False
    s = 0
    for x, val in enumerate(col_sums):
        if val > 0 and not in_col:
            in_col = True
            s = x
        elif val == 0 and in_col:
            in_col = False
            if (x - s) >= min_width:
                cols.append((s, x))
    if in_col and (len(col_sums) - s) >= min_width:
        cols.append((s, len(col_sums)))
    return cols

def extract_sheet_frames(sheet_path, expected_cols_count):
    im = Image.open(sheet_path).convert("RGBA")
    arr = np.array(im)
    alpha = arr[:, :, 3]
    
    row_frames = {}
    for r in range(7):
        y0, y1 = ROW_CUTS[r], ROW_CUTS[r+1]
        ground = GROUND_BASELINES[r]
        sub_alpha = alpha[y0:y1, :]
        
        cols = get_columns(sub_alpha)
        # In case extra artifact or merged column, adjust to expected_cols_count
        if len(cols) != expected_cols_count:
            # Sort by width descending, pick the top expected_cols_count, then sort by x
            sorted_cols = sorted(cols, key=lambda c: (c[1]-c[0]), reverse=True)[:expected_cols_count]
            cols = sorted(sorted_cols, key=lambda c: c[0])
            
        assert len(cols) == expected_cols_count, f"Row {r} expected {expected_cols_count} cols, got {len(cols)}"
        
        frames = []
        crop_h = 155
        crop_w = 140
        crop_y0 = max(0, ground - crop_h)
        crop_y1 = ground
        
        for c_start, c_end in cols:
            center_x = (c_start + c_end) // 2
            crop_x0 = max(0, center_x - (crop_w // 2))
            crop_x1 = min(im.width, crop_x0 + crop_w)
            
            frame_crop = im.crop((crop_x0, crop_y0, crop_x1, crop_y1))
            frames.append(frame_crop)
            
        row_frames[r] = frames
        
    return row_frames

def process_and_save(row_frames, is_idle=False):
    for direction, (r_idx, flip) in ROW_MAP.items():
        frames = row_frames[r_idx]
        for f_idx, frame_img in enumerate(frames):
            if flip:
                frame_img = frame_img.transpose(Image.FLIP_LEFT_RIGHT)
                
            scaled_w = int(round(frame_img.width * SCALE))
            scaled_h = int(round(frame_img.height * SCALE))
            scaled = frame_img.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
            
            canvas = Image.new("RGBA", TARGET_CANVAS, (0, 0, 0, 0))
            paste_x = (TARGET_CANVAS[0] - scaled_w) // 2
            paste_y = FEET_Y - scaled_h
            canvas.paste(scaled, (paste_x, paste_y), scaled)
            
            if is_idle:
                canvas.save(os.path.join(OUTPUT_DIR, f"{direction}_idle_{f_idx}.png"))
                if f_idx == 0:
                    canvas.save(os.path.join(OUTPUT_DIR, f"{direction}_idle.png"))
                    canvas.save(os.path.join(OUTPUT_DIR, f"{direction}.png"))
            else:
                canvas.save(os.path.join(OUTPUT_DIR, f"{direction}_run_{f_idx}.png"))

def main():
    print("Extracting Run Frames from sprite.zip...")
    run_row_frames = extract_sheet_frames(RUN_SHEET, 8)
    
    print("Extracting Idle Frames from sprite.zip...")
    idle_row_frames = extract_sheet_frames(IDLE_SHEET, 4)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    # Clear directory of old files
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith(".png") or f.endswith(".import"):
            os.remove(os.path.join(OUTPUT_DIR, f))
            
    print("Generating Run animations...")
    process_and_save(run_row_frames, is_idle=False)
    
    print("Generating Idle animations...")
    process_and_save(idle_row_frames, is_idle=True)
    
    print("Hero spritesheet processing complete!")

if __name__ == "__main__":
    main()
