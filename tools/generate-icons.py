#!/usr/bin/env python3
"""Regenerate the launcher, adaptive and splash artwork.

The mark is the same won glyph as assets/brand.svg, rasterised here with the
standard library so the files can be reproduced without extra tooling:

    python3 tools/generate-icons.py

Outputs:
  icon.png                      opaque full-bleed iOS/Android icon
  android-icon-foreground.png   transparent adaptive foreground (inside the safe zone)
  android-icon-monochrome.png   transparent single-colour layer for Android 13+ themed icons
  splash-icon.png               transparent rounded brand tile used by the native splash and LaunchScreen
"""

from pathlib import Path
import math
import struct
import zlib

SIZE = 1024
VIEW = 512.0
BRAND = (0x12, 0x3C, 0x35)
MARK = (0xD4, 0xEA, 0xB3)
WHITE = (0xFF, 0xFF, 0xFF)
STROKE = 27.0
CORNER = 120.0

# Won mark geometry in the 512-unit view box (mirrors assets/brand.svg).
SEGMENTS = [
    ((136, 166), (376, 166)),
    ((136, 212), (376, 212)),
    ((162, 142), (204, 370)),
    ((204, 370), (256, 225)),
    ((256, 225), (308, 370)),
    ((308, 370), (350, 142)),
]


def segment_distance(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    length = dx * dx + dy * dy
    t = 0.0 if length == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def mark_alpha(u, v, axis):
    """Coverage of the stroked mark at a point in view-box units."""
    half = STROKE / 2
    best = min(segment_distance(u, v, *a, *b) for a, b in SEGMENTS)
    return max(0.0, min(1.0, 0.5 + (half - best) / axis))


def rounded_alpha(u, v, axis):
    half = VIEW / 2
    qx = abs(u - half) - (half - CORNER)
    qy = abs(v - half) - (half - CORNER)
    outside = math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - CORNER
    return max(0.0, min(1.0, 0.5 - outside / axis))


def scale_point(u, v, factor):
    half = VIEW / 2
    return half + (u - half) * factor, half + (v - half) * factor


def render(*, background, rounded, mark, mark_scale, size=SIZE):
    axis = VIEW / size
    rows = []
    mark_box = [1e9, 1e9, -1e9, -1e9]
    for ax, ay in (p for segment in SEGMENTS for p in segment):
        sx, sy = scale_point(ax, ay, mark_scale)
        reach = STROKE * mark_scale / 2 + axis * 2
        mark_box = [min(mark_box[0], sx - reach), min(mark_box[1], sy - reach),
                    max(mark_box[2], sx + reach), max(mark_box[3], sy + reach)]
    for y in range(size):
        row = bytearray()
        v = (y + 0.5) * axis
        for x in range(size):
            u = (x + 0.5) * axis
            alpha = 0.0
            colour = (0, 0, 0)
            if background is not None:
                alpha = rounded_alpha(u, v, axis) if rounded else 1.0
                if alpha > 0:
                    colour = background
            if mark is not None and mark_box[0] <= u <= mark_box[2] and mark_box[1] <= v <= mark_box[3]:
                mu, mv = scale_point(u, v, mark_scale)
                coverage = mark_alpha(mu, mv, axis / mark_scale)
                if coverage > 0:
                    if background is None:
                        colour, alpha = mark, max(alpha, coverage)
                    else:
                        colour = tuple(round(colour[i] * (1 - coverage) + mark[i] * coverage) for i in range(3))
            row += bytes((*colour, round(alpha * 255)))
        rows.append(bytes(row))
    return rows


def write_png(path, rows, size=SIZE):
    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    raw = b''.join(b'\x00' + row for row in rows)
    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    Path(path).write_bytes(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', header)
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


def main():
    out = Path(__file__).resolve().parent.parent / 'assets'
    write_png(out / 'icon.png', render(background=BRAND, rounded=False, mark=MARK, mark_scale=1.0))
    # Keep the mark inside the 66dp safe zone of the 108dp adaptive canvas.
    write_png(out / 'android-icon-foreground.png', render(background=None, rounded=False, mark=MARK, mark_scale=0.62))
    write_png(out / 'android-icon-monochrome.png', render(background=None, rounded=False, mark=WHITE, mark_scale=0.62))
    write_png(out / 'splash-icon.png', render(background=BRAND, rounded=True, mark=MARK, mark_scale=1.0))


if __name__ == '__main__':
    main()
