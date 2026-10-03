#!/usr/bin/env python3
"""
Extract 8-directional animated Hero sprites from the user's uploaded sprite sheet:
/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/.user_uploaded/media_1790997764694.png

Sheet layout (1024x896):
- 8 columns (128px wide each), 7 rows (128px tall each)
- Row 0: N (walk up/north)
- Row 1: NE (walk up-right/north-east)
- Row 2: E (walk right/east)
- Row 3: S (walk down/south)
- Row 4: SE (walk down-right/south-east)
- Row 5: SW (walk down-left/south-west)
- Row 6: NW (walk up-left/north-west)
- W is created by flipping E (Row 2) horizontally!

Target canvas: 160x160
Feet baseline: Y = 145 (matching player.tscn offset Vector2(0, -65))
Head/Spine center: X = 80
Clean white-background floodfill transparency.
"""

import os
from collections import deque
import numpy as np
from PIL import Image

SRC_PATH = "/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/.user_uploaded/media_1790997764694.png"
OUT_DIR = "assets/sprites/hero"

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

TARGET_SIZE = (160, 160)
FEET_Y = 145
CENTER_X = 80

def make_cell_transparent(cell_rgb):
    """
    Flood-fill from cell borders to cleanly key out pure/near-white background
    without degrading the character's beige outfit or details.
    """
    h, w, _ = cell_rgb.shape
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    
    # Border pixels near white
    for y in range(h):
        for x in [0, w-1]:
            if np.all(cell_rgb[y, x] >= 238):
                visited[y, x] = True
                q.append((y, x))
    for x in range(w):
        for y in [0, h-1]:
            if np.all(cell_rgb[y, x] >= 238) and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
                
    while q:
        y, x = q.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if np.all(cell_rgb[ny, nx] >= 230):
                    visited[ny, nx] = True
                    q.append((ny, nx))
                    
    alpha = np.where(visited, 0, 255).astype(np.uint8)
    
    # Anti-aliasing edge smoothing
    for y in range(1, h-1):
        for x in range(1, w-1):
            if not visited[y, x] and (visited[y-1, x] or visited[y+1, x] or visited[y, x-1] or visited[y, x+1]):
                lum = float(np.mean(cell_rgb[y, x]))
                if lum > 230:
                    alpha[y, x] = int(max(0, min(255, (255.0 - lum) / 25.0 * 255.0)))
                    
    return Image.fromarray(np.dstack([cell_rgb, alpha]), mode="RGBA")

def main():
    if not os.path.exists(SRC_PATH):
        print(f"Error: {SRC_PATH} not found")
        return
        
    os.makedirs(OUT_DIR, exist_ok=True)
    src_img = Image.open(SRC_PATH).convert("RGB")
    src_arr = np.array(src_img)
    
    # Extract all 7 rows x 8 columns as transparent RGBA images
    extracted_rows = {}
    for r in range(7):
        extracted_rows[r] = []
        for c in range(8):
            cell_rgb = src_arr[r*128:(r+1)*128, c*128:(c+1)*128]
            rgba_img = make_cell_transparent(cell_rgb)
            extracted_rows[r].append(rgba_img)
            
    # For each direction, compose onto 160x160 canvas with fixed ground baseline
    for d_name, (row_idx, flip_h) in ROW_MAP.items():
        frames = extracted_rows[row_idx]
        
        # 1. Save 8 running frames
        for f_idx, raw_frame in enumerate(frames):
            frame = raw_frame.copy()
            if flip_h:
                frame = frame.transpose(Image.FLIP_LEFT_RIGHT)
                
            # Place onto 160x160 canvas
            # In 128x128, character feet touch around y=111.
            # To put feet at FEET_Y = 145: paste at y = 145 - 111 = 34
            # Center of 128 is 64. To put center at CENTER_X = 80: paste at x = 80 - 64 = 16
            canvas = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
            paste_x = CENTER_X - 64
            paste_y = FEET_Y - 111
            canvas.paste(frame, (paste_x, paste_y), frame)
            
            out_run_path = os.path.join(OUT_DIR, f"{d_name}_run_{f_idx}.png")
            canvas.save(out_run_path)
            
        # 2. Save 4 idle frames with subtle natural breathing cycle
        # Base frame is frame 0
        base_frame = frames[0].copy()
        if flip_h:
            base_frame = base_frame.transpose(Image.FLIP_LEFT_RIGHT)
            
        # 4 breathing phases: 0px, -1px, -2px, -1px vertical shift
        breathe_offsets = [0, -1, -2, -1]
        for i_idx, b_off in enumerate(breathe_offsets):
            canvas = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
            paste_x = CENTER_X - 64
            paste_y = FEET_Y - 111 + b_off
            canvas.paste(base_frame, (paste_x, paste_y), base_frame)
            
            out_idle_path = os.path.join(OUT_DIR, f"{d_name}_idle_{i_idx}.png")
            canvas.save(out_idle_path)
            if i_idx == 0:
                canvas.save(os.path.join(OUT_DIR, f"{d_name}_idle.png"))
                canvas.save(os.path.join(OUT_DIR, f"{d_name}.png"))
                
    print(f"Successfully generated all 8-direction hero sprites in {OUT_DIR}!")

if __name__ == "__main__":
    main()
