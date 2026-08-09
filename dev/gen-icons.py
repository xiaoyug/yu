"""生成「遇」的应用图标。

    python3 tools/yu/dev/gen-icons.py

赤陶底 + 米色「遇」字，右下一个米色圆点 —— 呼应卡片署名行的那颗点。
apple-touch-icon 必须不透明、四角不自己切圆（iOS 会自己圆角）。
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
GROUND = (196, 85, 42)      # --accent #C4552A
CREAM = (246, 241, 231)     # --bg #F6F1E7

FONT_CANDIDATES = [
    ("/System/Library/Fonts/Hiragino Sans GB.ttc", 1),
    ("/System/Library/Fonts/Hiragino Sans GB.ttc", 0),
    ("/System/Library/Fonts/STHeiti Medium.ttc", 0),
    ("/System/Library/Fonts/Songti.ttc", 0),
]


def load_font(px):
    for path, idx in FONT_CANDIDATES:
        if not os.path.exists(path):
            continue
        try:
            return ImageFont.truetype(path, px, index=idx)
        except Exception:
            continue
    raise SystemExit("找不到可用的中文字体")


def make(size, pad_ratio=0.0):
    """pad_ratio > 0 时字缩小，给 maskable 的安全区留边。"""
    img = Image.new("RGB", (size, size), GROUND)
    d = ImageDraw.Draw(img)

    glyph_px = int(size * (0.60 - pad_ratio))
    font = load_font(glyph_px)
    box = d.textbbox((0, 0), "遇", font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    # 视觉重心略偏上，给右下的圆点让位
    x = (size - w) / 2 - box[0]
    y = (size - h) / 2 - box[1] - size * 0.025
    d.text((x, y), "遇", font=font, fill=CREAM)

    r = size * (0.038 - pad_ratio * 0.05)
    cx = size * (0.5 + (0.325 - pad_ratio * 0.5))
    cy = size * (0.5 + (0.325 - pad_ratio * 0.5))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CREAM)
    return img


os.makedirs(OUT, exist_ok=True)
for name, size, pad in [
    ("icon-180.png", 180, 0.0),
    ("icon-192.png", 192, 0.0),
    ("icon-512.png", 512, 0.0),
    ("icon-512-maskable.png", 512, 0.10),
]:
    p = os.path.abspath(os.path.join(OUT, name))
    make(size, pad).save(p, "PNG")
    print("wrote", p)
