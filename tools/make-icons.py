"""
Rasterises assets/sync.svg (Material Symbols "sync", 960-unit viewBox) into icons/sync.png.

Run from the mod folder:  python tools/make-icons.py   (needs Pillow)

⚠️ WHY A PNG: an SVG `data:` URI draws nothing in this engine (measured in Better Journal UI), so
the icon is served as a PNG through `fs://game/<mod-id>/icons/…` and registered in <ImportFiles>.

⚠️ THE PATH PARSER IS MINIMAL: it handles exactly the commands this icon uses
(M m L l H h V v Q q T t Z z). A new icon with arcs or cubic curves needs it extended.
"""
import re
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 64            # final icon, px
SS = 8               # supersampling factor for anti-aliasing
STEPS = 16           # line segments per quadratic curve
FILL = (227, 227, 227, 255)   # #e3e3e3, the SVG's own fill

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "sync.svg"
OUT = ROOT / "icons" / "sync.png"

# viewBox="0 -960 960 960"
VB_X, VB_Y, VB_W, VB_H = 0, -960, 960, 960


def tokens(d):
    for match in re.finditer(r"[MmLlHhVvQqTtZz]|-?\d*\.?\d+(?:e-?\d+)?", d):
        yield match.group(0)


def subpaths(d):
    """Flattens the path into closed polygons, in viewBox units."""
    out, current = [], []
    x = y = start_x = start_y = 0.0
    ctrl = None          # last quadratic control point, for T
    command = None
    stream = list(tokens(d))
    i = 0

    def number():
        nonlocal i
        value = float(stream[i])
        i += 1
        return value

    def quad(cx, cy, ex, ey):
        nonlocal x, y
        for step in range(1, STEPS + 1):
            t = step / STEPS
            px = (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * ex
            py = (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ey
            current.append((px, py))
        x, y = ex, ey

    while i < len(stream):
        if stream[i].isalpha():
            command = stream[i]
            i += 1
        rel = command.islower()
        op = command.upper()
        if op == "Z":
            if current:
                out.append(current)
            current = []
            x, y = start_x, start_y
            ctrl = None
            continue
        if op == "M":
            if current:
                out.append(current)
            nx, ny = number(), number()
            x, y = (x + nx, y + ny) if rel else (nx, ny)
            start_x, start_y = x, y
            current = [(x, y)]
            command = "l" if rel else "L"   # implicit lineto after moveto
            ctrl = None
        elif op == "L":
            nx, ny = number(), number()
            x, y = (x + nx, y + ny) if rel else (nx, ny)
            current.append((x, y))
            ctrl = None
        elif op == "H":
            n = number()
            x = x + n if rel else n
            current.append((x, y))
            ctrl = None
        elif op == "V":
            n = number()
            y = y + n if rel else n
            current.append((x, y))
            ctrl = None
        elif op == "Q":
            cx, cy, ex, ey = number(), number(), number(), number()
            if rel:
                cx, cy, ex, ey = x + cx, y + cy, x + ex, y + ey
            ctrl = (cx, cy)
            quad(cx, cy, ex, ey)
        elif op == "T":
            ex, ey = number(), number()
            if rel:
                ex, ey = x + ex, y + ey
            cx, cy = (2 * x - ctrl[0], 2 * y - ctrl[1]) if ctrl else (x, y)
            ctrl = (cx, cy)
            quad(cx, cy, ex, ey)
    if current:
        out.append(current)
    return out


def main():
    d = re.search(r'\sd="([^"]+)"', SOURCE.read_text(encoding="utf-8")).group(1)
    big = SIZE * SS
    scale = big / VB_W
    image = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for polygon in subpaths(d):
        draw.polygon([((px - VB_X) * scale, (py - VB_Y) * scale) for px, py in polygon], fill=FILL)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.resize((SIZE, SIZE), Image.LANCZOS).save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
