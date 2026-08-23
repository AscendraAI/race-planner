#!/usr/bin/env python3
"""
파비콘·OG·트위터 메타를 손으로 쓴 페이지 <head> 에 주입한다. 멱등.

생성 페이지 11개는 이 스크립트가 건드리지 않는다 — build_pace_pages.py 의
page_shell() 이 소유한다. 생성물을 직접 고치면 다음 빌드에 날아간다.

    python3 tools/inject_head.py --dry-run
    python3 tools/inject_head.py
"""
import argparse
import glob
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://raceplanner.athletespick.com"
MARK = "<!-- rp-head:start -->"
END = "<!-- rp-head:end -->"


def block(canonical):
    """
    og:url 은 페이지의 canonical 을 그대로 쓴다 — 둘이 어긋나면 크롤러가 혼란한다.

    canonical 이 없으면 og:url 을 아예 넣지 않는다. 루트로 때우면 "이 페이지는
    홈페이지다" 라고 선언하는 셈인데, course/ 는 ?id= 로 수백 개 코스를 그리는
    페이지라 그 거짓말의 대가가 크다. 없는 편이 틀린 것보다 낫다.
    """
    og_url_line = f'<meta property="og:url" content="{canonical}" />\n' if canonical else ""
    return f"""{MARK}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Hanken+Grotesk:wght@300;400;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/rp.css" />
<link rel="stylesheet" href="/rp-app.css" />
<script src="/nav.js" defer></script>
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta property="og:site_name" content="Race Planner" />
{og_url_line}<meta property="og:image" content="{SITE}/og/rp-og-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="{SITE}/og/rp-og-default.png" />
{END}"""


def hand_written():
    out = []
    for f in glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True):
        if os.sep + ".git" + os.sep in f:
            continue
        if os.path.join("pace", "marathon") in f:
            continue  # 생성물 — build_pace_pages.py 소유
        out.append(f)
    return sorted(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    changed = skipped = 0
    for path in hand_written():
        html = io.open(path, encoding="utf-8").read()
        rel = os.path.relpath(path, ROOT)

        canon = re.search(r'<link\s+rel="canonical"\s+href="([^"]*)"', html, re.I)
        new_block = block(canon.group(1) if canon else None)

        if MARK in html:
            # 이미 있으면 통째로 교체 (멱등)
            html2 = re.sub(re.escape(MARK) + r".*?" + re.escape(END), new_block, html, flags=re.S)
            action = "갱신"
        else:
            m = re.search(r"</head>", html, re.I)
            if not m:
                print(f"  !! {rel}: </head> 없음 — 건너뜀")
                skipped += 1
                continue
            html2 = html[: m.start()] + new_block + "\n" + html[m.start():]
            action = "삽입"

        if html2 == html:
            skipped += 1
            continue
        if not args.dry_run:
            io.open(path, "w", encoding="utf-8").write(html2)
        print(f"  {action}  {rel}" + ("  (canonical 없음 → og:url 생략)" if not canon else ""))
        changed += 1

    print(f"\n{'(dry-run) ' if args.dry_run else ''}변경 {changed} · 변화없음 {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
