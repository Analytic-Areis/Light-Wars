import sys
from PIL import Image

img = Image.open(sys.argv[1])
bbox = img.getbbox()
print("BBox:", bbox)
print("Width:", bbox[2] - bbox[0])
print("Height:", bbox[3] - bbox[1])

