"""生成版式预览用的占位素材：两张合影占位照 + 一张二维码占位图。"""
import random, math, os
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.dirname(os.path.abspath(__file__))


def gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def bokeh(img, seed, n=26):
    rnd = random.Random(seed)
    w, h = img.size
    layer = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(layer)
    for _ in range(n):
        r = rnd.randint(int(w * 0.02), int(w * 0.07))
        x = rnd.randint(0, w)
        y = rnd.randint(0, int(h * 0.62))
        v = rnd.randint(120, 255)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(v, int(v * 0.86), int(v * 0.6)))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=w * 0.02))
    return Image.blend(img, Image.blend(img, layer, 0.55), 0.5)


def person(d, cx, cy, scale, skin, cloth):
    """一个头肩剪影。cy 是头顶。"""
    hr = int(70 * scale)                      # 头半径
    # 肩
    sw = int(hr * 3.1)
    sh = int(hr * 3.0)
    d.ellipse([cx - sw, cy + hr * 1.1, cx + sw, cy + hr * 1.1 + sh * 2], fill=cloth)
    # 脖
    d.rounded_rectangle([cx - hr * 0.42, cy + hr * 0.9, cx + hr * 0.42, cy + hr * 1.7],
                        radius=int(hr * 0.3), fill=skin)
    # 头
    d.ellipse([cx - hr, cy - hr * 0.15, cx + hr, cy + hr * 1.35], fill=skin)
    # 头发
    d.chord([cx - hr * 1.06, cy - hr * 0.28, cx + hr * 1.06, cy + hr * 1.1], 180, 360,
            fill=tuple(max(0, c - 95) for c in skin))


def make_photo(path, w, h, sky, ground, seed, dark=False):
    img = gradient(w, h, sky, ground)
    img = bokeh(img, seed)
    d = ImageDraw.Draw(img)
    s = min(w, h) / 900.0
    base = int(h * 0.50)
    skin_a = (214, 168, 140) if not dark else (150, 116, 96)
    skin_b = (196, 148, 122) if not dark else (132, 100, 82)
    cloth_a = (58, 62, 74) if not dark else (34, 36, 44)
    cloth_b = (150, 76, 52) if not dark else (92, 46, 32)
    person(d, int(w * 0.36), base, s * 1.02, skin_a, cloth_a)
    person(d, int(w * 0.63), int(base * 1.04), s * 0.96, skin_b, cloth_b)
    img.save(path, "JPEG", quality=86)
    print("wrote", path, img.size)


def make_qr(path, n=29, px=22):
    """长得像二维码的占位图：三个定位角 + 伪随机数据区。"""
    rnd = random.Random(7)
    size = n * px
    img = Image.new("RGB", (size, size), "white")
    d = ImageDraw.Draw(img)

    def cell(cx, cy, on=True):
        if 0 <= cx < n and 0 <= cy < n:
            d.rectangle([cx * px, cy * px, (cx + 1) * px - 1, (cy + 1) * px - 1],
                        fill="black" if on else "white")

    def finder(ox, oy):
        for y in range(7):
            for x in range(7):
                edge = x in (0, 6) or y in (0, 6)
                core = 2 <= x <= 4 and 2 <= y <= 4
                cell(ox + x, oy + y, edge or core)

    reserved = set()
    for ox, oy in ((0, 0), (n - 7, 0), (0, n - 7)):
        for y in range(-1, 8):
            for x in range(-1, 8):
                reserved.add((ox + x, oy + y))

    for y in range(n):
        for x in range(n):
            if (x, y) in reserved:
                continue
            if rnd.random() < 0.47:
                cell(x, y)

    for ox, oy in ((0, 0), (n - 7, 0), (0, n - 7)):
        finder(ox, oy)

    # 右下角对齐图案
    for y in range(5):
        for x in range(5):
            edge = x in (0, 4) or y in (0, 4)
            cell(n - 9 + x, n - 9 + y, edge or (x == 2 and y == 2))

    img.save(path, "PNG")
    print("wrote", path, img.size)


make_photo(os.path.join(OUT, "photo-land.jpg"), 1600, 1200, (232, 200, 158), (96, 74, 66), 3)
make_photo(os.path.join(OUT, "photo-port.jpg"), 1200, 1600, (74, 66, 88), (26, 24, 32), 11, dark=True)
make_qr(os.path.join(OUT, "qr-placeholder.png"))
