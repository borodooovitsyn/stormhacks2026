"""Demo workload #2: grayscale-thumbnail the first image in /input to /output."""

import glob
import os

from PIL import Image

imgs = sorted(glob.glob("/input/*"))
if not imgs:
    raise SystemExit("no input image in /input")

im = Image.open(imgs[0]).convert("L")
im.thumbnail((256, 256))
im.save("/output/out.png")
print(f"processed {os.path.basename(imgs[0])} -> grayscale thumbnail {im.size}")
