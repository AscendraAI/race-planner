#!/usr/bin/env python3
"""
RP Design System 린터 — 표준 라이브러리만 쓴다.

이 저장소에 package.json이 없다는 것이 배포 모델의 자산이다(빌드 없는 정적 사이트).
build_pace_pages.py와 언어를 통일하면 유지 주체가 하나가 된다.

    python3 tools/rp_lint.py              # 전체 검사, 위반 요약
    python3 tools/rp_lint.py --check radius
    python3 tools/rp_lint.py --strict     # 위반이 있으면 exit 1 (CI용)
    python3 tools/rp_lint.py --baseline   # 현재 위반 수를 기준선으로 기록

마이그레이션 중에는 위반이 많은 게 정상이다. --baseline 으로 현재 수치를 박아 두고,
그보다 늘어나면 실패시킨다. 0을 요구하면 아무도 안 쓴다.
"""
import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE_PATH = os.path.join(ROOT, "tools", "rp_lint_baseline.json")

# 토큰 정의부와 제품 산출물 팔레트는 하드코딩 색이 있어야 정상이다.
COLOR_EXEMPT_FILES = {"rp.css", "rp-viz.css"}
# 제3자 브랜드가 강제하는 값. 이름이 있어야 예외로 인정한다.
COLOR_EXEMPT_TOKENS = ("--brand-", "--poster-", "--terrain-", "--acc-a")

RADIUS_OK = {"0", "0px", "50%", "var(--radius)", "var(--radius-pill)"}

# Pick Now lib/banned-words.ts RULES, plus the UTNP runner-copy restriction.
BANNED_WORDS = (
    "회복이 빨라", "회복을 돕", "치료", "예방합니다", "예방해", "면역",
    "피로 해소", "피로해소", "근손실", "부상 방지", "염증", "최고",
    "최고의", "1위", "No.1", "NO.1", "유일한", "유일하게", "국내 유일",
    "의사가 추천", "의사 추천", "약사가 추천", "약사 추천", "전문의",
    "무료 매칭", "체험단", "인플루언서",
    "예방", "보호", "회복", "개선", "추천",
)


def html_files():
    out = []
    for f in glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True):
        if os.sep + ".git" + os.sep in f:
            continue
        out.append(f)
    return sorted(out)


def css_files():
    return sorted(glob.glob(os.path.join(ROOT, "*.css")))


def rel(p):
    return os.path.relpath(p, ROOT)


def style_blocks(html):
    """<style>…</style> 본문과 style="…" 속성값을 (내용, 오프셋)으로 뽑는다."""
    for m in re.finditer(r"<style[^>]*>(.*?)</style>", html, re.S):
        yield m.group(1), m.start(1)
    for m in re.finditer(r'\sstyle="([^"]*)"', html):
        yield m.group(1), m.start(1)


def line_of(text, offset):
    return text.count("\n", 0, offset) + 1


# ── 검사 ────────────────────────────────────────────────────────────────────

def check_hardcoded_color(path, text):
    """토큰을 거치지 않은 색상 리터럴. 3자리 hex(#566)까지 잡는다."""
    if os.path.basename(path) in COLOR_EXEMPT_FILES:
        return []
    hits = []
    pat = re.compile(r"#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(")
    chunks = style_blocks(text) if path.endswith(".html") else [(text, 0)]
    for chunk, base in chunks:
        # 주석을 먼저 걷어낸다 — 설명문에 든 색상값(#FBD32C 같은)까지 세면
        # 문서화를 잘 할수록 위반이 늘어나는 이상한 유인이 생긴다
        chunk = re.sub(r"/\*.*?\*/", " ", chunk, flags=re.S)
        for line in chunk.split(";"):
            if any(tok in line for tok in COLOR_EXEMPT_TOKENS):
                continue
            m = pat.search(line)
            if m:
                hits.append((line_of(text, base), line.strip()[:70]))
    return hits


def check_hardcoded_radius(path, text):
    """가이드 §07 — 컨테이너·카드·입력·버튼은 반경 0. 완전한 원만 예외."""
    hits = []
    chunks = style_blocks(text) if path.endswith(".html") else [(text, 0)]
    for chunk, base in chunks:
        for m in re.finditer(r"border-radius\s*:\s*([^;}\n]+)", chunk):
            val = m.group(1).strip()
            if val not in RADIUS_OK:
                hits.append((line_of(text, base + m.start()), f"border-radius:{val}"))
    return hits


def check_no_shadow(path, text):
    """가이드 §07 — 그림자 없음. 층위는 1px 선과 면 밝기로만."""
    hits = []
    chunks = style_blocks(text) if path.endswith(".html") else [(text, 0)]
    for chunk, base in chunks:
        for m in re.finditer(r"box-shadow\s*:\s*([^;}\n]+)", chunk):
            val = m.group(1).strip()
            if val != "none":
                hits.append((line_of(text, base + m.start()), f"box-shadow:{val[:50]}"))
    return hits


def check_token_cycle(path, text):
    """
    커스텀 프로퍼티의 자기참조·순환.

    `--line: var(--line)` 은 CSS 사양상 guaranteed-invalid 가 되어 그 토큰을 쓰는
    모든 선언이 조용히 죽는다. 2026-08-22에 실제로 12페이지에 심었던 버그라
    이 검사가 이 린터의 존재 이유 중 하나다.
    """
    hits = []
    chunks = style_blocks(text) if path.endswith(".html") else [(text, 0)]
    graph = {}
    where = {}
    for chunk, base in chunks:
        for m in re.finditer(r"(--[\w-]+)\s*:\s*([^;}\n]+)", chunk):
            name, val = m.group(1), m.group(2)
            refs = set(re.findall(r"var\(\s*(--[\w-]+)", val))
            graph.setdefault(name, set()).update(refs)
            where.setdefault(name, line_of(text, base + m.start()))

    def reaches(start, target, seen):
        for nxt in graph.get(start, ()):
            if nxt == target:
                return True
            if nxt not in seen:
                seen.add(nxt)
                if reaches(nxt, target, seen):
                    return True
        return False

    for name in graph:
        if reaches(name, name, set()):
            hits.append((where[name], f"{name} 가 순환 참조"))
    return hits


def check_no_important(path, text):
    hits = []
    chunks = style_blocks(text) if path.endswith(".html") else [(text, 0)]
    for chunk, base in chunks:
        for m in re.finditer(r"!important", chunk):
            hits.append((line_of(text, base + m.start()), "!important"))
    return hits


def check_required_assets(path, text):
    """전 페이지가 공통 CSS를 로드하고 Ink 테마가 박혀 있어야 한다."""
    if not path.endswith(".html"):
        return []
    hits = []
    if 'data-theme="dark"' not in text:
        hits.append((1, 'data-theme="dark" 없음'))
    if "/rp.css" not in text:
        hits.append((1, "/rp.css 미로드"))
    return hits


def check_i18n_nesting(path, text):
    """
    [data-i18n] 안쪽에 class 를 넣으면 안 된다.

    applyLang() 이 textContent / innerHTML 로 자식을 통째로 갈아치우므로,
    안쪽에 넣은 조판 요소는 언어 전환 첫 번에 사라진다.
    """
    if not path.endswith(".html"):
        return []
    hits = []
    for m in re.finditer(r'<([a-zA-Z0-9]+)([^>]*\sdata-i18n="[^"]*"[^>]*)>(.*?)</\1>', text, re.S):
        inner = m.group(3)
        if len(inner) > 400:  # 큰 블록은 컨테이너다 — 검사 대상 아님
            continue
        if re.search(r"<[a-zA-Z][^>]*\sclass=", inner):
            hits.append((line_of(text, m.start()), f"[data-i18n] 안쪽에 class: {inner.strip()[:50]}"))
    return hits


def check_event_banned(path, text):
    """UTNP first-party runner copy must not contain efficacy or sales words."""
    file = rel(path)
    if file not in {"assets/utnp.js", "events/utnp.json", "gpx/index.html"}:
        return []
    if file == "gpx/index.html":
        # Only event-specific share card and caption copy belongs to this rule.
        chunks = [(m.group(), m.start()) for m in re.finditer(
            r"if\(document\.documentElement\.classList\.contains\('utnp'\)\)(?:\{[^}]*\}|[^\n]*)", text)]
    else:
        chunks = [(text, 0)]
    return [(line_of(text, base + m.start()), m.group())
            for chunk, base in chunks
            for word in BANNED_WORDS
            for m in re.finditer(re.escape(word), chunk)]


CHECKS = {
    "banned": ("event-banned-words", check_event_banned),
    "color": ("hardcoded-color", check_hardcoded_color),
    "radius": ("hardcoded-radius", check_hardcoded_radius),
    "shadow": ("no-shadow", check_no_shadow),
    "cycle": ("token-cycle", check_token_cycle),
    "important": ("no-important", check_no_important),
    "assets": ("required-assets", check_required_assets),
    "i18n": ("i18n-nesting", check_i18n_nesting),
}

# 순환·i18n 중첩은 마이그레이션 중에도 0이어야 한다. 나머지는 기준선 대비로 본다.
MUST_BE_ZERO = {"cycle", "i18n", "banned"}


def run(selected):
    targets = html_files() + css_files()
    event_targets = [os.path.join(ROOT, p) for p in ("assets/utnp.js", "events/utnp.json", "gpx/index.html") if os.path.exists(os.path.join(ROOT, p))]
    results = {}
    for key in selected:
        label, fn = CHECKS[key]
        per_file = {}
        for path in (event_targets if key == "banned" else targets):
            with open(path, encoding="utf-8") as fh:
                text = fh.read()
            hits = fn(path, text)
            if hits:
                per_file[rel(path)] = hits
        results[key] = per_file
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="append", choices=sorted(CHECKS))
    ap.add_argument("--strict", action="store_true", help="기준선 초과 시 exit 1")
    ap.add_argument("--baseline", action="store_true", help="현재 위반 수를 기준선으로 기록")
    ap.add_argument("--verbose", "-v", action="store_true")
    args = ap.parse_args()

    selected = args.check or sorted(CHECKS)
    results = run(selected)

    baseline = {}
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH, encoding="utf-8") as fh:
            baseline = json.load(fh)

    counts = {k: sum(len(v) for v in files.values()) for k, files in results.items()}

    if args.baseline:
        with open(BASELINE_PATH, "w", encoding="utf-8") as fh:
            json.dump(counts, fh, indent=2, sort_keys=True)
        print(f"기준선 기록: {BASELINE_PATH}")
        for k in sorted(counts):
            print(f"  {CHECKS[k][0]:<20} {counts[k]}")
        return 0

    failed = False
    print(f"{'검사':<22}{'현재':>8}{'기준선':>10}  판정")
    print("-" * 52)
    for k in selected:
        label = CHECKS[k][0]
        now = counts[k]
        base = baseline.get(k)
        if k in MUST_BE_ZERO:
            ok = now == 0
            base_s = "0"
        else:
            ok = base is None or now <= base
            base_s = "—" if base is None else str(base)
        mark = "OK" if ok else "초과"
        if not ok:
            failed = True
        print(f"{label:<22}{now:>8}{base_s:>10}  {mark}")

    if args.verbose:
        for k in selected:
            for path, hits in sorted(results[k].items()):
                for line, detail in hits[:10]:
                    print(f"  {CHECKS[k][0]}  {path}:{line}  {detail}")

    if failed and (args.strict or ("banned" in selected and counts["banned"] > 0)):
        print("\n기준선을 초과했습니다.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
