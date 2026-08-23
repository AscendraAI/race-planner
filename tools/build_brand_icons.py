#!/usr/bin/env python3
"""
RP 파비콘·앱아이콘 세트 생성 — AP 3.0 규격을 그대로 상속한다.

가이드는 `RP-favicon-*` 와 `RP-appicon-1024` 두 이름만 규정하고 사이즈 체계는
남기지 않았다. AP 3.0 brand-assets/svg/favicon/ 의 실측 규격을 그대로 따른다.

핵심 판단 하나: 16px 는 아크 90° 색분할을 버리고 **단색 링**으로 그린다.
AP README 가 "모노그램 단독 최소 화면 24px" 라고 못 박았는데 16px 파비콘은
이미 그 아래다. 색분할을 억지로 유지하면 뭉개져서 무엇인지 알아볼 수 없다.

    python3 tools/build_brand_icons.py
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "brand", "rp", "svg", "RP-mark-dark.svg")
OUT = os.path.join(ROOT, "brand", "rp", "svg")

INK = "#0B0B09"
PAPER = "#F2F0E8"
PERF = "#FBD32C"

# AP 3.0 favicon 폴더에서 실측한 배치값
SPECS = [
    # 파일명                     크기   배경        마크 transform                    도형
    ("RP-favicon-16.svg",        16,   None,      "scale(0.16)",                     "ring"),
    ("RP-favicon-16-paper.svg",  16,   None,      "scale(0.16)",                     "ring-paper"),
    ("RP-favicon-32.svg",        32,   None,      "scale(0.32)",                     "full"),
    ("RP-favicon-48.svg",        48,   None,      "scale(0.48)",                     "full"),
    ("RP-appicon-180.svg",      180,   ("40", INK),   "translate(37.8 37.8) scale(1.0875)", "full"),
    ("RP-appicon-1024.svg",    1024,   ("230", INK),  "translate(215.04 215.04) scale(6.18666667)", "full"),
    ("RP-social-1080.svg",     1080,   ("0", INK),    "translate(324 324) scale(4.32)", "full"),
]


def parts():
    """
    원본 마크에서 링 2아크와 R·P 글자 group 을 떼어낸다.

    번들에서 나온 SVG 는 <path …></path> 형태다(자기닫힘 아님). 그리고 글자
    group 안에도 <path> 가 있으므로, 첫 <g 앞부분에서만 링 path 를 찾는다.
    """
    svg = io.open(SRC, encoding="utf-8").read()
    head = svg[: svg.find("<g")]
    ring = re.findall(r"<path\b[^>]*>(?:</path>)?", head)
    groups = re.findall(r"<g\b[^>]*>.*?</g>", svg, re.S)
    if len(ring) < 2 or len(groups) < 2:
        sys.exit(f"!! {SRC} 구조가 예상과 다릅니다 (ring {len(ring)} · g {len(groups)})")
    return ring[0], ring[1], groups[0], groups[1]


def recolor(fragment, color):
    return re.sub(r'(stroke|fill)="#[0-9A-Fa-f]{6}"', lambda m: f'{m.group(1)}="{color}"', fragment)


def build(spec, ring_cream, ring_perf, glyph_r, glyph_p):
    name, size, bg, transform, shape = spec
    fg = PAPER if (bg or shape != "ring-paper") else INK

    body = []
    if bg:
        rx, fill = bg
        body.append(f'  <rect width="{size}" height="{size}" rx="{rx}" fill="{fill}"/>')

    if shape.startswith("ring"):
        # 16px — 아크 색분할을 버리고 단색 링. 24px 미만에서 90° 분할은 뭉개진다.
        c = PAPER if shape == "ring" else INK
        inner = (f'<circle cx="50" cy="50" r="43.5" fill="none" stroke="{c}" stroke-width="9"/>'
                 + recolor(glyph_r, c) + recolor(glyph_p, c))
    else:
        inner = (recolor(ring_cream, fg) + recolor(ring_perf, PERF)
                 + recolor(glyph_r, fg) + recolor(glyph_p, fg))

    body.append(f'  <g transform="{transform}">{inner}</g>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'width="{size}" height="{size}">\n'
        "<!-- tools/build_brand_icons.py 가 생성합니다. 손으로 고치지 마세요. -->\n"
        + "\n".join(body)
        + "\n</svg>\n"
    )


def main():
    ring_cream, ring_perf, glyph_r, glyph_p = parts()
    for spec in SPECS:
        content = build(spec, ring_cream, ring_perf, glyph_r, glyph_p)
        dest = os.path.join(OUT, spec[0])
        io.open(dest, "w", encoding="utf-8").write(content)
        print(f"  {spec[0]:<28} {spec[1]:>5}px  {len(content):>5}자")
    print(f"\n{len(SPECS)}개 생성")


if __name__ == "__main__":
    main()
