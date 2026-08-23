#!/usr/bin/env python3
"""
푸터 법적 링크를 없는 페이지에 넣는다. 멱등.

푸터가 13변종이라 내용을 통합하지 않는다 — 문구 13벌을 건드리는 것은 "문구 불변"
약속을 깨고 위험만 크다. 대신 없는 것만 덧붙인다.

역할 분담:
  · 법적 링크 → 여기(정적). 애드센스 정책 관련이라 원본 HTML 에 있어야 한다
  · AP 락업 배지 → nav.js. 언어에 따라 문면이 바뀌어야 하고 29페이지 공통이다

course/index.html 은 <footer> 자체가 없다. 본문 전체가 JS 템플릿 문자열이라
</body> 직전에 정적으로 넣는다 — 본문이 늦게 그려져도 푸터는 즉시 나온다.

    python3 tools/inject_footer.py --dry-run
    python3 tools/inject_footer.py
"""
import argparse
import glob
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "<!-- rp-foot:start -->"
END = "<!-- rp-foot:end -->"
LEGAL = ("about", "privacy", "terms", "contact")

BLOCK = f"""{MARK}
<nav class="rp-foot__legal">
<a href="/about/">About</a>
<a href="/privacy/">Privacy</a>
<a href="/terms/">Terms</a>
<a href="/contact/">Contact</a>
</nav>
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


def footer_span(html):
    m = re.search(r"<footer[^>]*>(.*?)</footer>", html, re.S)
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    added = has = created = 0
    for path in hand_written():
        html = io.open(path, encoding="utf-8").read()
        rel = os.path.relpath(path, ROOT)
        out = html

        if MARK in html:
            has += 1
            continue

        m = footer_span(html)
        if m is None:
            # 푸터가 없는 페이지 — 만들어 준다
            b = re.search(r"</body>", html, re.I)
            if not b:
                print(f"  !! {rel}: </body> 없음 — 건너뜀")
                continue
            out = html[: b.start()] + f'<footer class="rp-foot">\n{BLOCK}\n</footer>\n' + html[b.start():]
            print(f"  생성  {rel}  (푸터 자체가 없었음)")
            created += 1
        else:
            inner = m.group(1)
            if all(f'href="/{x}/"' in inner for x in LEGAL):
                has += 1
                continue
            # 푸터 끝에 덧붙인다. 기존 내용은 한 글자도 건드리지 않는다.
            out = html[: m.end(1)] + "\n" + BLOCK + "\n" + html[m.end(1):]
            print(f"  추가  {rel}")
            added += 1

        if not args.dry_run:
            io.open(path, "w", encoding="utf-8").write(out)

    print(f"\n{'(dry-run) ' if args.dry_run else ''}추가 {added} · 생성 {created} · 이미보유 {has}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
