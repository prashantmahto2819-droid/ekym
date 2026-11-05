# Hero slide artwork for Kalchuri One / प्रगतिशील समाज. No text inside the images (titles come from the DB, bilingual);
# left side stays dark for the headline, artwork sits right-of-centre. Palette = site theme (deep teal, teal, gold, cream).
import math, random
from PIL import Image, ImageDraw, ImageFilter

W, H = 1920, 1080
DEEP = (18, 56, 58); TEAL = (28, 110, 108); TEAL2 = (52, 150, 145); GOLD = (214, 160, 72); GOLD2 = (242, 205, 130); CREAM = (250, 246, 236)

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def base(seed=1):
    random.seed(seed)
    img = Image.new("RGB", (W, H), DEEP)
    px = img.load()
    # diagonal gradient deep → teal, darker on the left for text
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            t = (x / W) * 0.75 + (y / H) * 0.25
            c = lerp(DEEP, TEAL, t * 0.9)
            px[x, y] = c; px[x + 1, y] = c; px[x, y + 1] = c; px[x + 1, y + 1] = c
    # soft glows
    glow = Image.new("RGB", (W, H), (0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse((W * 0.55, -H * 0.3, W * 1.25, H * 0.75), fill=(40, 90, 80))
    g.ellipse((W * 0.6, H * 0.5, W * 1.15, H * 1.3), fill=(70, 60, 20))
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    img = Image.blend(img, Image.composite(glow, img, Image.new("L", (W, H), 255)), 0.0)
    img = Image.eval(Image.blend(img, glow, 0.35), lambda v: v)
    # fine dotted texture
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(2600):
        x, y = random.randrange(W), random.randrange(H); r = random.choice((1, 1, 2))
        d.ellipse((x, y, x + r, y + r), fill=(255, 255, 255, random.randint(8, 26)))
    return img

def vignette(img):
    m = Image.new("L", (W, H), 0); md = ImageDraw.Draw(m)
    md.ellipse((-W * 0.2, -H * 0.4, W * 1.2, H * 1.4), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(260))
    dark = Image.new("RGB", (W, H), (8, 28, 30))
    return Image.composite(img, dark, m)

def layer():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def glow_layer(draw_fn, blur=28, alpha=140):
    L = layer(); draw_fn(ImageDraw.Draw(L, "RGBA"))
    G = L.filter(ImageFilter.GaussianBlur(blur))
    G.putalpha(G.split()[3].point(lambda a: min(255, int(a * alpha / 100))))
    return G, L

def paste(img, *layers):
    out = img.convert("RGBA")
    for L in layers: out = Image.alpha_composite(out, L)
    return out.convert("RGB")

# ---------- 1. network of organizations ----------
def network():
    img = base(11); random.seed(3)
    cx, cy = int(W * 0.68), int(H * 0.5)
    nodes = [(cx, cy, 64)]
    for i in range(9):
        a = i / 9 * math.tau + 0.3; r = 330
        nodes.append((int(cx + math.cos(a) * r), int(cy + math.sin(a) * r * 0.78), random.choice((26, 30, 36))))
    for i in range(14):
        a = i / 14 * math.tau + 0.1; r = 560
        nodes.append((int(cx + math.cos(a) * r), int(cy + math.sin(a) * r * 0.72), random.choice((12, 16, 20))))
    def lines(d):
        for n in nodes[1:10]: d.line((cx, cy, n[0], n[1]), fill=(*GOLD2, 150), width=3)
        for i, n in enumerate(nodes[10:]):
            m = nodes[1 + (i * 9 // 14)]; d.line((m[0], m[1], n[0], n[1]), fill=(*CREAM, 90), width=2)
    def dots(d):
        for (x, y, r) in nodes:
            d.ellipse((x - r - 10, y - r - 10, x + r + 10, y + r + 10), fill=(*GOLD, 60))
            d.ellipse((x - r, y - r, x + r, y + r), fill=GOLD2 if r > 40 else CREAM)
            d.ellipse((x - r * 0.55, y - r * 0.55, x + r * 0.55, y + r * 0.55), fill=TEAL if r > 20 else TEAL2)
    G1, L1 = glow_layer(lines, 18, 120); G2, L2 = glow_layer(dots, 30, 160)
    return vignette(paste(img, G1, L1, G2, L2))

# ---------- 2. family tree ----------
def tree():
    img = base(22)
    root = (int(W * 0.70), int(H * 0.16))
    levels = [[root]]
    for lvl in range(1, 5):
        prev = levels[-1]; cur = []
        n = min(2 ** lvl, 12); span = W * 0.42 * (0.55 + lvl * 0.14)
        for i in range(n):
            x = int(W * 0.70 - span / 2 + span * (i + 0.5) / n); y = int(H * 0.16 + lvl * H * 0.19)
            cur.append((x, y))
        levels.append(cur)
    def lines(d):
        for lvl in range(1, 5):
            prev, cur = levels[lvl - 1], levels[lvl]
            for i, (x, y) in enumerate(cur):
                px, py = prev[min(len(prev) - 1, i * len(prev) // len(cur))]
                my = (py + y) // 2
                d.line((px, py, px, my), fill=(*GOLD2, 190), width=4); d.line((px, my, x, my), fill=(*GOLD2, 190), width=4); d.line((x, my, x, y), fill=(*GOLD2, 190), width=4)
    def nodes(d):
        for lvl, cur in enumerate(levels):
            r = [38, 30, 24, 18, 14][lvl]
            for (x, y) in cur:
                d.ellipse((x - r - 8, y - r - 8, x + r + 8, y + r + 8), fill=(*GOLD, 70))
                d.ellipse((x - r, y - r, x + r, y + r), fill=CREAM if lvl else GOLD2, outline=GOLD, width=3)
                # tiny person glyph
                d.ellipse((x - r * 0.28, y - r * 0.55, x + r * 0.28, y - r * 0.02), fill=TEAL)
                d.pieslice((x - r * 0.55, y - r * 0.05, x + r * 0.55, y + r * 0.9), 180, 360, fill=TEAL)
    G1, L1 = glow_layer(lines, 16, 110); G2, L2 = glow_layer(nodes, 26, 150)
    return vignette(paste(img, G1, L1, G2, L2))

# ---------- 3. diya (shok sandesh) ----------
def diya():
    img = base(33)
    cx, cy = int(W * 0.70), int(H * 0.60)
    def flame(d):
        top, bottom = cy - 470, cy - 95
        for sx, sy, col in ((1.0, 1.0, GOLD), (0.72, 0.8, GOLD2), (0.42, 0.55, CREAM)):
            pts_l, pts_r = [], []
            hgt = (bottom - top) * sy; t0 = bottom - hgt
            for i in range(41):
                t = i / 40; y = t0 + hgt * t
                wdt = 120 * sx * (math.sin(math.pi * t) ** 0.9) * (0.35 + 0.65 * t) ** 0.6
                pts_l.append((cx - wdt, y)); pts_r.append((cx + wdt, y))
            d.polygon(pts_l + pts_r[::-1], fill=col)
    def bowl(d):
        d.chord((cx - 300, cy - 230, cx + 300, cy + 130), 0, 180, fill=GOLD)
        d.ellipse((cx - 300, cy - 110, cx + 300, cy + 10), fill=GOLD2)
        d.ellipse((cx - 250, cy - 90, cx + 250, cy - 10), fill=(120, 80, 30))
        d.rectangle((cx - 7, cy - 130, cx + 7, cy - 55), fill=(60, 40, 20))
        # petals / rangoli ring
        for i in range(16):
            a = i / 16 * math.tau; r1, r2 = 420, 470
            x1, y1 = cx + math.cos(a) * r1, cy + 40 + math.sin(a) * r1 * 0.45
            x2, y2 = cx + math.cos(a) * r2, cy + 40 + math.sin(a) * r2 * 0.45
            d.line((x1, y1, x2, y2), fill=(*GOLD2, 120), width=4)
    def halo(d):
        d.ellipse((cx - 300, cy - 560, cx + 300, cy - 40), fill=(*GOLD, 90))
    Gh, _ = glow_layer(halo, 120, 100)
    G1, L1 = glow_layer(flame, 40, 170); G2, L2 = glow_layer(bowl, 24, 110)
    return vignette(paste(img, Gh, G2, L2, G1, L1))

# ---------- 4. membership / ID card ----------
def card():
    img = base(44)
    cx, cy = int(W * 0.70), int(H * 0.52)
    cw, ch = 640, 400
    def shadow(d): d.rounded_rectangle((cx - cw // 2 + 30, cy - ch // 2 + 50, cx + cw // 2 + 30, cy + ch // 2 + 50), 36, fill=(0, 0, 0, 160))
    def body(d):
        d.rounded_rectangle((cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2), 36, fill=CREAM)
        d.rounded_rectangle((cx - cw // 2, cy - ch // 2, cx + cw // 2, cy - ch // 2 + 90), 36, fill=TEAL)
        d.rectangle((cx - cw // 2, cy - ch // 2 + 50, cx + cw // 2, cy - ch // 2 + 90), fill=TEAL)
        d.rectangle((cx - cw // 2, cy - ch // 2 + 90, cx + cw // 2, cy - ch // 2 + 98), fill=GOLD)
        # photo box
        d.rounded_rectangle((cx - cw // 2 + 36, cy - ch // 2 + 130, cx - cw // 2 + 206, cy - ch // 2 + 330), 18, fill=(225, 232, 228))
        px, py = cx - cw // 2 + 121, cy - ch // 2 + 230
        d.ellipse((px - 34, py - 70, px + 34, py - 2), fill=TEAL2); d.pieslice((px - 70, py - 10, px + 70, py + 110), 180, 360, fill=TEAL2)
        # text lines
        for i, wdt in enumerate((300, 220, 260, 180)):
            y = cy - ch // 2 + 140 + i * 48
            d.rounded_rectangle((cx - cw // 2 + 240, y, cx - cw // 2 + 240 + wdt, y + 18), 9, fill=(190, 200, 196) if i else TEAL)
        d.rounded_rectangle((cx + cw // 2 - 170, cy + ch // 2 - 70, cx + cw // 2 - 36, cy + ch // 2 - 30), 10, fill=GOLD)
        # chip
        d.rounded_rectangle((cx - cw // 2 + 36, cy - ch // 2 + 20, cx - cw // 2 + 96, cy - ch // 2 + 70), 10, fill=GOLD2)
    def people(d):
        for i, (ox, oy, s) in enumerate(((-520, 120, 1.0), (-430, -220, 0.8), (380, -300, 0.9), (430, 240, 0.7))):
            x, y = cx + ox, cy + oy
            d.ellipse((x - 36 * s, y - 70 * s, x + 36 * s, y - 2 * s), fill=(*CREAM, 190))
            d.pieslice((x - 72 * s, y - 10 * s, x + 72 * s, y + 110 * s), 180, 360, fill=(*CREAM, 190))
    Gs, Ls = glow_layer(shadow, 40, 100)
    G2, L2 = glow_layer(body, 30, 80); G3, L3 = glow_layer(people, 20, 120)
    return vignette(paste(img, G3, L3, Gs, G2, L2))

# ---------- 5. regions / villages (map pins) ----------
def regions():
    img = base(55); random.seed(9)
    cx, cy = int(W * 0.69), int(H * 0.52)
    pins = []
    for i in range(20):
        a = random.random() * math.tau; r = random.uniform(80, 520)
        pins.append((int(cx + math.cos(a) * r), int(cy + math.sin(a) * r * 0.62)))
    def web(d):
        for i, p in enumerate(pins):
            q = min(pins, key=lambda z: (z[0] - p[0]) ** 2 + (z[1] - p[1]) ** 2 if z != p else 1e12)
            d.line((p[0], p[1], q[0], q[1]), fill=(*CREAM, 70), width=2)
        for k in range(3):
            r = 220 + k * 170
            d.ellipse((cx - r, cy - r * 0.62, cx + r, cy + r * 0.62), outline=(*GOLD2, 60), width=2)
    def pin(d):
        for (x, y) in pins:
            d.ellipse((x - 18, y - 6, x + 18, y + 6), fill=(0, 0, 0, 90))
            d.polygon(((x, y), (x - 22, y - 40), (x + 22, y - 40)), fill=GOLD)
            d.ellipse((x - 26, y - 78, x + 26, y - 26), fill=GOLD)
            d.ellipse((x - 11, y - 63, x + 11, y - 41), fill=CREAM)
    G1, L1 = glow_layer(web, 14, 100); G2, L2 = glow_layer(pin, 22, 150)
    return vignette(paste(img, G1, L1, G2, L2))

out = "/home/claude/ekym/public/slides/"
import os; os.makedirs(out, exist_ok=True)
for name, fn in (("network", network), ("tree", tree), ("diya", diya), ("card", card), ("regions", regions)):
    im = fn(); im.save(out + f"{name}.jpg", quality=86, optimize=True, progressive=True); print(name, os.path.getsize(out + f"{name}.jpg") // 1024, "KB")
