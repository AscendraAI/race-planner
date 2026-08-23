#!/usr/bin/env python3
"""
아이콘 스프라이트를 nav.js 안으로 동기화한다. 멱등.

왜 nav.js 인가 — 전달 방법 세 가지를 놓고 골랐다.

  · 페이지마다 인라인: 4KB × 29 페이지. 같은 것을 29번 내려받는다.
  · `<use href="/brand/icons.svg#rp-time">` 외부 참조: 요청이 한 번 더 늘고,
    외부 SVG 조각 참조는 브라우저 지원이 고르지 않다.
  · nav.js 에 넣고 스크립트가 body 맨 앞에 심는다  ← 이걸 골랐다.

nav.js 는 이미 29페이지 전부에 실린다. 요청이 늘지 않고, 로고 락업을 이미
같은 방식(인라인 SVG 상수)으로 들고 있어 새로운 구조가 아니다.

    python3 tools/sync_sprite.py --check    # 어긋나면 exit 1
    python3 tools/sync_sprite.py
"""
import argparse
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAV = os.path.join(ROOT, "nav.js")
SOURCES = [
    os.path.join(ROOT, "brand", "icons.svg"),      # 가이드 추출본 — 손대지 않는다
    os.path.join(ROOT, "brand", "icons-ext.svg"),  # 직접 그린 확장
]
START = "/* RP-SPRITE-START */"
END = "/* RP-SPRITE-END */"

# 가이드 §08 규격
REQUIRED = {
    "viewBox": "0 0 24 24",
    "fill": "none",
    "stroke": "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "butt",
    "stroke-linejoin": "miter",
}


def symbols():
    out = []
    seen = {}
    for path in SOURCES:
        if not os.path.exists(path):
            sys.exit(f"!! 없음: {os.path.relpath(path, ROOT)}")
        text = io.open(path, encoding="utf-8").read()
        for m in re.finditer(r"<symbol\s([^>]*)>(.*?)</symbol>", text, re.S):
            attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(1)))
            sid = attrs.get("id", "")
            if not sid.startswith("rp-"):
                sys.exit(f"!! id 가 rp- 로 시작하지 않습니다: {sid}")
            if sid in seen:
                sys.exit(f"!! id 중복: {sid} ({seen[sid]} 와 {os.path.basename(path)})")
            for k, v in REQUIRED.items():
                if attrs.get(k) != v:
                    sys.exit(f"!! {sid}: {k}={attrs.get(k)!r} — 규격은 {v!r} (§08)")
            seen[sid] = os.path.basename(path)
            body = re.sub(r"\s+", " ", m.group(2)).strip()
            out.append((sid, attrs, body))
    return out


def build(syms):
    """
    브라우저가 <use> 로 참조하려면 symbol 이 문서 안에 있어야 한다.
    display:none 컨테이너에 넣어 자리를 차지하지 않게 한다.
    aria-hidden 을 붙여 스크린리더가 빈 그래픽을 읽지 않도록 한다.
    """
    parts = []
    for sid, attrs, body in syms:
        a = " ".join(f'{k}="{attrs[k]}"' for k in
                     ["id", "viewBox", "fill", "stroke", "stroke-width",
                      "stroke-linecap", "stroke-linejoin"])
        parts.append(f"<symbol {a}>{body}</symbol>")
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none" '
           'aria-hidden="true">' + "".join(parts) + "</svg>")
    return (
        f"{START}\n"
        f"  // tools/sync_sprite.py 가 생성합니다. 손으로 고치지 마세요.\n"
        f"  // 원본: brand/icons.svg (가이드 추출) + brand/icons-ext.svg (직접 그림)\n"
        f"  var SPRITE = {svg!r};\n"
        f"  {END}"
    ).replace("'", '"', 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="어긋나면 exit 1")
    args = ap.parse_args()

    syms = symbols()
    block = build(syms)
    nav = io.open(NAV, encoding="utf-8").read()

    if START not in nav:
        sys.exit(f"!! nav.js 에 {START} 표식이 없습니다 — 먼저 넣어 주세요")

    new = re.sub(re.escape(START) + r".*?" + re.escape(END), block.replace("\\", "\\\\"),
                 nav, flags=re.S)

    ids = [s[0] for s in syms]
    print(f"아이콘 {len(syms)}종 · 스프라이트 {len(block):,}자")
    print("  " + " ".join(i.replace("rp-", "") for i in ids))

    if args.check:
        if new != nav:
            print("\n!! nav.js 의 스프라이트가 원본과 어긋납니다 — sync_sprite.py 를 실행하세요",
                  file=sys.stderr)
            return 1
        print("\n일치합니다")
        return 0

    if new == nav:
        print("\n변화 없음")
        return 0
    io.open(NAV, "w", encoding="utf-8").write(new)
    print(f"\nnav.js 갱신 ({len(nav):,} → {len(new):,}자)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
