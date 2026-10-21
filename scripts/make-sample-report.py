"""Render the fictional sample lab report used by the "Try a sample report" button.

Run: python3 scripts/make-sample-report.py  (needs Pillow). Output: public/sample-lab-report.png
Every name and number here is made up; values match the app's example patient.
"""
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
MONO = "/System/Library/Fonts/Supplemental/Courier New.ttf"
MONO_BOLD = "/System/Library/Fonts/Supplemental/Courier New Bold.ttf"
SANS = "/System/Library/Fonts/HelveticaNeue.ttc"

W, H = 1700, 1010
ink = (28, 30, 34)
img = Image.new("RGB", (W, H), (250, 249, 245))
d = ImageDraw.Draw(img)
mono = ImageFont.truetype(MONO, 27)
bold = ImageFont.truetype(MONO_BOLD, 27)
title = ImageFont.truetype(SANS, 38, index=1)
small = ImageFont.truetype(SANS, 22)

x0, y = 90, 80
d.text((x0, y), "NORTHSIDE COMMUNITY CLINIC LABORATORY", font=title, fill=ink)
d.text((W - 90, y + 8), "SAMPLE REPORT", font=bold, fill=(170, 40, 30), anchor="ra")
y += 56
d.text((x0, y), "Fictional patient for demonstration only. Not a real medical record.", font=small, fill=(110, 110, 110))
y += 46
d.line((x0, y, W - x0, y), fill=ink, width=3)
y += 26

rows = [
    ("Patient: SAMPLE, JORDAN", "DOB: 04/12/1966", "Sex: M"),
    ("MRN: 0000000", "Collected: 06/16/2020 08:42", ""),
    ("Ordering: A. Rivera, MD", "Reported: 06/16/2020 14:10", ""),
]
for a, b, c in rows:
    d.text((x0, y), a, font=mono, fill=ink)
    d.text((x0 + 620, y), b, font=mono, fill=ink)
    d.text((x0 + 1180, y), c, font=mono, fill=ink)
    y += 42
y += 18
d.line((x0, y, W - x0, y), fill=ink, width=2)
y += 22

cols = [0, 520, 700, 820, 1130]
def row(cells, font=mono):
    global y
    for cx, text in zip(cols, cells):
        d.text((x0 + cx, y), text, font=font, fill=ink)
    y += 44

row(["TEST", "RESULT", "FLAG", "UNITS", "REFERENCE"], bold)
d.line((x0, y - 6, W - x0, y - 6), fill=(150, 150, 150), width=1)
y += 6
row(["Creatinine, Serum", "3.60", "H", "mg/dL", "0.76-1.27"])
row(["BUN", "48", "H", "mg/dL", "6-24"])
row(["eGFR If NonAfricn Am", "18", "L", "mL/min/1.73", ">59"])
row(["eGFR If Africn Am", "21", "L", "mL/min/1.73", ">59"])
y += 30

d.text((x0, y), "CREATININE HISTORY", font=bold, fill=ink)
y += 50
hist_cols = [0, 330, 760]
def hrow(cells, font=mono):
    global y
    for cx, text in zip(hist_cols, cells):
        d.text((x0 + cx, y), text, font=font, fill=ink)
    y += 44
hrow(["DATE", "CREATININE (mg/dL)", "eGFR AFRICN AM"], bold)
d.line((x0, y - 6, x0 + 1100, y - 6), fill=(150, 150, 150), width=1)
y += 6
for date, scr, egfr in [("08/21/2018", "3.05", "26"), ("03/12/2019", "3.30", "23"), ("10/08/2019", "3.45", "22")]:
    hrow([date, scr, egfr])

y += 30
d.line((x0, y, W - x0, y), fill=ink, width=2)
y += 20
d.text((x0, y), "eGFR calculated by CKD-EPI (2009).", font=small, fill=(90, 90, 90))

# Make it read like a scan of a printout: faint speckle, a slight tilt, a touch of blur.
rnd = random.Random(7)
px = img.load()
for _ in range(9000):
    sx, sy = rnd.randrange(W), rnd.randrange(H)
    g = rnd.randrange(205, 240)
    px[sx, sy] = (g, g, g - 4)
img = img.rotate(-0.6, resample=Image.BICUBIC, expand=False, fillcolor=(250, 249, 245))
img = img.filter(ImageFilter.GaussianBlur(0.6))
out = ROOT / "public" / "sample-lab-report.png"
img.save(out, optimize=True)
print(out, out.stat().st_size // 1024, "KB")
