#!/usr/bin/env python3
import os
import shutil
from PIL import Image
import numpy as np

SHEET_PATH = "/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/.user_uploaded/media_1790971452052.png"
OUTPUT_DIR = "/home/srihith/Light-Wars/assets/sprites/hero"

# Direction mapping to rows:
# Row 0: N
# Row 1: NE
# Row 2: E
# Row 3: S
# Row 4: SE
# Row 5: SW
# Row 6: NW
# W: E (Row 2) flipped horizontally

ROW_MAP = {
    "N": (0, False),
    "NE": (1, False),
    "E": (2, False),
    "S": (3, False),
    "SE": (4, False),
    "SW": (5, False),
    "W": (2, True),   # Flipped East
    "NW": (6, False)
}

ROW_CUTS = [0, 110, 222, 335, 448, 555, 658, 765]

def extract_row_frames(im, r_idx):
    y0, y1 = ROW_CUTS[r_idx], ROW_CUTS[r_idx + 1]
    row_crop = im.crop((0, y0, im.width, y1))
    arr = np.array(row_crop)
    alpha = arr[:, :, 3]
    col_sums = np.sum(alpha > 10, axis=0)

    # Detect 8 columns
    cols = []
    in_col = False
    start_x = 0
    for x, val in enumerate(col_sums):
        if val > 0 and not in_col:
            in_col = True
            start_x = x
        elif val == 0 and in_col:
            in_col = False
            cols.append((start_x, x))
    if in_col:
        cols.append((start_x, len(col_sums)))

    frames = []
    for c_start, c_end in cols:
        sprite_crop = row_crop.crop((c_start, 0, c_end, row_crop.height))
        bbox = sprite_crop.getbbox()
        if bbox:
            frames.append(sprite_crop.crop(bbox))
            
    return frames

def main():
    im = Image.open(SHEET_PATH).convert("RGBA")
    
    # Extract frames for all 7 rows
    row_frames = {}
    for r in range(7):
        frames = extract_row_frames(im, r)
        print(f"Extracted {len(frames)} frames for Row {r}")
        assert len(frames) == 8, f"Expected 8 frames in row {r}, got {len(frames)}"
        row_frames[r] = frames

    # Clean hero directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    # Remove old hero sprites
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith(".png") or f.endswith(".import"):
            os.remove(os.path.join(OUTPUT_DIR, f))

    SCALE = 1.6
    TARGET_SIZE = (256, 256)
    FEET_Y = 244
    CENTER_X = 128

    # Process each of the 8 directions
    for direction, (r_idx, flip) in ROW_MAP.items():
        frames = row_frames[r_idx]
        
        for f_idx, src_frame in enumerate(frames):
            frame_img = src_frame
            if flip:
                frame_img = frame_img.transpose(Image.FLIP_LEFT_RIGHT)
                
            # Scale frame
            new_w = int(round(frame_img.width * SCALE))
            new_h = int(round(frame_img.height * SCALE))
            scaled_frame = frame_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # Place onto 256x256 canvas
            canvas = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
            paste_x = CENTER_X - (new_w // 2)
            paste_y = FEET_Y - new_h
            canvas.paste(scaled_frame, (paste_x, paste_y), scaled_frame)
            
            # Save run frame
            run_filename = f"{direction}_run_{f_idx}.png"
            canvas.save(os.path.join(OUTPUT_DIR, run_filename))
            
            # Frame 0 is also idle
            if f_idx == 0:
                canvas.save(os.path.join(OUTPUT_DIR, f"{direction}_idle.png"))
                canvas.save(os.path.join(OUTPUT_DIR, f"{direction}.png"))
                
        print(f"Processed direction: {direction} (8 frames + idle)")

    print("Hero sprite generation complete!")

if __name__ == "__main__":
    main()
