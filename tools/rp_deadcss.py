#!/usr/bin/env python3
"""
페이지 인라인 CSS 에서 죽은 규칙을 걷어낸다.

왜 필요한가 — pace/index.html 의 <style> 은 19KB 에 규칙 188개인데, 브라우저에서
11개 pace 페이지 전부를 재어 보니 그중 69개가 어떤 페이지에서도 단 하나의 요소도
잡지 못한다. 붙여넣기가 세 겹 쌓이면서(`:root` 블록이 3벌 있다) 헤더 CSS 처럼
nav.js 가 통째로 교체해 버린 죽은 규칙이 그대로 남았다.

죽음의 판정은 이 스크립트가 하지 않는다. 브라우저에서 실측한 인덱스를 받는다.
정적 분석으로는 "이 셀렉터가 어떤 요소도 안 잡는다"를 알 수 없기 때문이다.

대신 이 스크립트는 실측만으로는 위험한 두 부류를 막는다:

  1) 상태 클래스 — `.out.show` 의 `.show` 는 계산 버튼을 눌러야 붙는다.
     로드 직후 재면 당연히 0개다. 지우면 결과창이 안 열린다.
  2) 광고 슬롯 — `.rail-left` 같은 컨테이너는 애드센스가 나중에 채운다.

그래서 후보 셀렉터에 든 클래스·id 가 그 페이지의 HTML/JS 소스 어디에든
문자열로 나타나면 삭제하지 않는다. 삭제는 "런타임에 안 잡힌다" 와
"소스 어디에도 언급이 없다" 가 모두 참일 때만 한다.

    python3 tools/rp_deadcss.py pace/index.html --measured 6,7,8 --dry-run
    python3 tools/rp_deadcss.py pace/index.html --measured-file /tmp/dead.txt
"""
import argparse
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 런타임 판정을 신뢰하지 않는 셀렉터. 실측이 죽었다고 해도 남긴다.
NEVER_DELETE = re.compile(
    r"\.(show|active|open|on|is-[\w-]+|hidden|sel|cur)\b"   # 상태 클래스
    r"|\bad-|\.ad\b|\brail|\bleader\b"                       # 광고 슬롯
    r"|\[data-i18n|\[data-l\b|\.ko\b|\.en\b"                 # i18n — 손대지 않는다
    r"|:root|^\*$|^html$|^body$"                             # 토큰·리셋
)


class Rule:
    def __init__(self, index, selector, start, end, media):
        self.index = index
        self.selector = selector
        self.start = start      # 규칙 전체(셀렉터 포함) 시작 오프셋
        self.end = end          # 닫는 } 다음 오프셋
        self.media = media


def parse_rules(css):
    """
    CSSOM 과 같은 순서로 스타일 규칙을 훑는다.

    at-rule 은 @media/@supports 만 내려간다. @font-face·@keyframes 안쪽은
    스타일 규칙이 아니므로 세지 않는다 — CSSOM 도 그렇게 센다.
    """
    rules = []
    counter = [0]

    def scan(text, base, media):
        i = 0
        n = len(text)
        while i < n:
            ch = text[i]
            if ch in " \t\r\n;":
                i += 1
                continue
            if text.startswith("/*", i):
                j = text.find("*/", i + 2)
                i = n if j < 0 else j + 2
                continue
            if ch == "@":
                brace = text.find("{", i)
                semi = text.find(";", i)
                if brace < 0 or (0 <= semi < brace):     # @import 등 본문 없는 at-rule
                    i = (semi + 1) if semi >= 0 else n
                    continue
                at = text[i:brace].strip()
                close = match_brace(text, brace)
                # `@media(max-width:800px)` 처럼 공백 없이 붙는 표기가 실제로 쓰인다.
                # split() 으로 이름을 떼면 통째로 한 토큰이 되어 못 알아본다.
                name = "@" + re.match(r"@([\w-]*)", at).group(1).lower()
                if name in ("@media", "@supports", "@layer", "@container"):
                    scan(text[brace + 1:close], base + brace + 1, at)
                # @font-face·@keyframes 는 통째로 건너뛴다
                i = close + 1
                continue
            brace = text.find("{", i)
            if brace < 0:
                break
            close = match_brace(text, brace)
            sel = re.sub(r"\s+", " ", text[i:brace].strip())
            rules.append(Rule(counter[0], sel, base + i, base + close + 1, media))
            counter[0] += 1
            i = close + 1

    scan(css, 0, "")
    return rules


def match_brace(text, open_idx):
    depth = 0
    i = open_idx
    n = len(text)
    while i < n:
        c = text[i]
        if c == "/" and text.startswith("/*", i):
            j = text.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in "\"'":
            q = c
            i += 1
            while i < n and text[i] != q:
                i += 2 if text[i] == "\\" else 1
            i += 1
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return n - 1


# 레거시 헤더 셀렉터. 소스에 마크업이 남아 있어 "소스 언급" 검사에 걸리지만,
# rp-app.css 가 `body > header ...` 로 29페이지 몫을 한 벌로 대신한다.
# 마크업 구조가 29페이지 전부 동일한 것을 실측으로 확인하고 여는 예외다.
HEADER_SELECTORS = {
    "header", "body>header", "body > header",
    ".wrap-h", ".logo", ".logo b", ".logo .mark", ".logo span.full", ".logo .full",
    ".mark", ".spacer",
    ".nav", ".nav::-webkit-scrollbar", ".nav .navlink", ".nav a",
    ".navlink", ".navlink:hover", ".navlink.active", ".navlink:hover, .navlink.active",
    ".langtoggle", ".langtoggle button", ".langtoggle button.on",
}


def is_header_only(selector):
    """콤마로 묶인 모든 갈래가 헤더 셀렉터일 때만 참."""
    parts = [re.sub(r"\s+", " ", p.strip()) for p in selector.split(",")]
    return bool(parts) and all(p in HEADER_SELECTORS for p in parts)


def source_tokens(html):
    """HTML/JS 소스에 등장하는 클래스·id 문자열 전부."""
    names = set()
    for m in re.finditer(r'class=["\']([^"\']+)["\']', html):
        names.update(m.group(1).split())
    for m in re.finditer(r'id=["\']([^"\']+)["\']', html):
        names.add(m.group(1))
    # JS 안의 문자열 리터럴 — classList.add("show") 같은 것
    for m in re.finditer(r'["\']([A-Za-z][\w-]{1,30})["\']', html):
        names.add(m.group(1))
    return names


def selector_names(sel):
    return set(re.findall(r"[.#]([A-Za-z][\w-]*)", sel))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--measured", help="쉼표로 구분한 죽은 규칙 인덱스")
    ap.add_argument("--measured-file")
    ap.add_argument("--header", action="store_true",
                    help="레거시 헤더 규칙도 지운다 (rp-app.css 가 대신함)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--list", action="store_true", help="규칙 목록만 출력")
    args = ap.parse_args()

    path = args.path if os.path.isabs(args.path) else os.path.join(ROOT, args.path)
    html = io.open(path, encoding="utf-8").read()

    blocks = list(re.finditer(r"<style[^>]*>(.*?)</style>", html, re.S))
    if len(blocks) != 1:
        sys.exit(f"!! <style> 블록이 {len(blocks)}개입니다 — 1개만 지원합니다")
    blk = blocks[0]
    css = blk.group(1)
    off = blk.start(1)

    rules = parse_rules(css)
    print(f"{args.path}: 규칙 {len(rules)}개")

    if args.list:
        for r in rules:
            print(f"  {r.index:>4}  {r.media + ' | ' if r.media else ''}{r.selector[:70]}")
        return 0

    raw = args.measured or (io.open(args.measured_file).read() if args.measured_file else "")
    measured = {int(x) for x in re.findall(r"\d+", raw)}
    if not measured:
        sys.exit("!! --measured 인덱스가 필요합니다")
    # 브라우저 측정에는 nav.js 가 런타임에 넣는 스타일(`body>header{visibility:hidden}`)이
    # 마지막에 딸려 온다. 소스에 없는 규칙이므로 범위 밖 인덱스는 버린다.
    over = {i for i in measured if i >= len(rules)}
    if over:
        print(f"  (런타임 주입분 {len(over)}개 제외: {sorted(over)})")
        measured -= over

    names = source_tokens(html)
    delete, kept = [], []
    for r in rules:
        if r.index not in measured:
            continue
        if args.header and is_header_only(r.selector):
            delete.append(r)          # rp-app.css 가 대신한다
            continue
        if NEVER_DELETE.search(r.selector):
            kept.append((r, "보호 패턴"))
            continue
        hit = selector_names(r.selector) & names
        if hit:
            kept.append((r, "소스에 언급: " + ",".join(sorted(hit))))
            continue
        delete.append(r)

    print(f"\n실측 죽음 {len(measured)}개 → 삭제 {len(delete)}개 · 보류 {len(kept)}개\n")
    for r, why in kept:
        print(f"  보류  {r.index:>4}  {r.selector[:50]:<52} {why}")
    print()
    for r in delete:
        print(f"  삭제  {r.index:>4}  {r.media + ' | ' if r.media else ''}{r.selector[:60]}")

    saved = sum(r.end - r.start for r in delete)
    print(f"\n{saved:,}자 절감 (CSS {len(css):,}자 중 {saved / len(css) * 100:.0f}%)")

    if args.dry_run or not delete:
        print("\n(dry-run) 파일을 쓰지 않았습니다")
        return 0

    new_css = css
    for r in sorted(delete, key=lambda x: x.start, reverse=True):
        new_css = new_css[: r.start] + new_css[r.end:]
    # 비게 된 @media 껍데기 정리
    new_css = re.sub(r"@[\w-]+[^{}]*\{\s*\}", "", new_css)
    new_css = re.sub(r"\n{3,}", "\n\n", new_css)

    io.open(path, "w", encoding="utf-8").write(html[:off] + new_css + html[blk.end(1):])
    print(f"\n{args.path} 갱신 — CSS {len(css):,} → {len(new_css):,}자")
    return 0


if __name__ == "__main__":
    sys.exit(main())
