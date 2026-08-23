#!/usr/bin/env python3
"""
RP 브랜드 자산 추출기 — 디자인가이드 번들에서 SVG와 아이콘을 꺼낸다.

RP 로고 벡터의 유일한 원본은 `RP Design Guide 1.0 (standalone).html` 안에 있다.
저장소에도, 구글 드라이브 어디에도 RP-* 파일이 없다(2026-08-22 실측). 그래서
이 스크립트가 브랜드 층의 출발점이다.

    python3 tools/extract_brand.py            # brand/ 아래로 추출
    python3 tools/extract_brand.py --verify   # 쓰지 않고 무결성만 확인

번들 구조:
  <script type="__bundler/manifest">   다음 줄에 자산 JSON (gzip+base64)
  <script type="__bundler/template">   다음 줄에 페이지 HTML (JSON 문자열)

주의 — 이 두 문자열은 파일 안에 각각 2번 나온다. 첫 번째는 로더 JS 안의
querySelector 인자다. 반드시 실제 <script 태그를 찾아야 한다. 줄 번호를
하드코딩하면 가이드가 갱신될 때 조용히 다른 걸 읽는다.
"""
import argparse
import base64
import gzip
import hashlib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUIDE = os.environ.get(
    "GUIDE",
    "/Users/noi/Library/CloudStorage/GoogleDrive-noi@athletespick.com/공유 드라이브/"
    "Athlete's Pick/1. Athletes_pick/Raceplanner/디자인가이드/"
    "RP Design Guide 1.0 (standalone).html",
)
OUT = os.path.join(ROOT, os.environ.get("OUT", "brand"))
LOCK = os.path.join(ROOT, "tools", "brand-manifest.lock")

# 가이드 1.0의 manifest 페이로드 해시. 가이드가 1.1로 갱신되면 여기서 멈춘다 —
# 조용히 다른 자산을 뽑는 것보다 실패하는 편이 낫다.
EXPECT_MANIFEST_SHA = None  # 최초 실행 시 기록되고 이후 대조된다

UUID_MAP = {
    "4aaae1f7": "rp/svg/RP-mark-dark.svg",          # 링+아크+RP, 100×100
    "d967c555": "rp/svg/RP-h-dark.svg",             # 가로 락업 nosub, 1128.095×146
    "ddb574b0": "rp/svg/RP-h-light.svg",            # 라이트판 (아크가 Blaze)
    "8c459cbe": "rp/svg/AP-RP-colockup-dark.svg",   # 보관용, 사이트 미사용
}

ICON_ORDER = [
    "elevation", "time", "pace", "hydration", "gel", "weather",
    "checkpoint", "finish", "upload", "effort", "race-day", "splits",
    "add", "done", "warning", "start",
]


def payload_after(html, tag_type):
    """<script type="…"> 실제 태그를 찾아 그 안의 페이로드를 돌려준다."""
    needle = f'<script type="{tag_type}">'
    i = html.find(needle)
    if i < 0:
        sys.exit(f"!! {tag_type} 태그를 찾지 못했습니다")
    start = i + len(needle)
    end = html.find("</script>", start)
    return html[start:end].strip()


def extract_svgs(manifest):
    out = {}
    for key, entry in manifest.items():
        short = key[:8]
        if short not in UUID_MAP:
            continue
        raw = base64.b64decode(entry["data"])
        svg = gzip.decompress(raw).decode() if entry.get("compressed") else raw.decode()
        out[UUID_MAP[short]] = svg
    return out


def extract_icons(template_json):
    """
    24px 아이콘 16종.

    함정: 번들러가 camelCase 속성을 뭉개서 viewBox 가 sc-camel-view-box 로
    적혀 있다. 그대로 복사하면 브라우저가 무시해 아이콘이 안 보인다.
    정규식이 18건을 잡는데 뒤 2건은 아이콘 카탈로그가 아니라 빈 상태 삽화다.
    """
    html = json.loads(template_json)
    pat = re.compile(r'<svg\s+sc-camel-view-box="0 0 24 24"(.*?)</svg>', re.S)
    hits = pat.findall(html)[:16]
    if len(hits) < 16:
        sys.exit(f"!! 아이콘을 {len(hits)}개만 찾았습니다 (16개 기대)")

    symbols = []
    for name, body in zip(ICON_ORDER, hits):
        body = re.sub(r'\sstyle="[^"]*"', "", body)          # 인라인 크기·색 제거
        body = re.sub(r"^[^>]*>", "", body, count=1).strip()  # 여는 태그 잔여 속성 제거
        symbols.append(
            f'  <symbol id="rp-{name}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="butt" stroke-linejoin="miter">\n'
            f"    {body}\n  </symbol>"
        )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n'
        "<!-- RP Design Guide 1.0 §08 — 24 박스 · stroke 2 · butt·miter.\n"
        "     tools/extract_brand.py 가 생성합니다. 손으로 고치지 마세요. -->\n"
        + "\n".join(symbols)
        + "\n</svg>\n"
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true", help="쓰지 않고 확인만")
    args = ap.parse_args()

    if not os.path.exists(GUIDE):
        sys.exit(f"!! 가이드를 찾지 못했습니다: {GUIDE}")

    html = io.open(GUIDE, encoding="utf-8", errors="replace").read()
    manifest_raw = payload_after(html, "__bundler/manifest")
    template_raw = payload_after(html, "__bundler/template")

    sha = hashlib.sha256(manifest_raw.encode()).hexdigest()
    print(f"manifest {len(manifest_raw):,}자  sha256={sha[:16]}")

    lock = {}
    if os.path.exists(LOCK):
        lock = json.load(open(LOCK, encoding="utf-8"))
        if lock.get("manifest_sha256") != sha:
            sys.exit(
                "!! manifest 해시가 기록과 다릅니다 — 가이드가 갱신됐습니까?\n"
                f"   기록 {lock.get('manifest_sha256','')[:16]}  현재 {sha[:16]}\n"
                "   의도한 갱신이면 tools/brand-manifest.lock 을 지우고 다시 실행하세요."
            )

    manifest = json.loads(manifest_raw)
    svgs = extract_svgs(manifest)
    if len(svgs) != len(UUID_MAP):
        sys.exit(f"!! SVG를 {len(svgs)}개만 찾았습니다 ({len(UUID_MAP)}개 기대)")
    sprite = extract_icons(template_raw)

    files = dict(svgs)
    files["icons.svg"] = sprite

    print(f"SVG {len(svgs)}개 · 아이콘 스프라이트 1개")
    for path in sorted(files):
        print(f"  {path:<40} {len(files[path]):>6}자")

    if args.verify:
        print("\n--verify: 파일을 쓰지 않았습니다")
        return 0

    written = {}
    for rel_path, content in files.items():
        dest = os.path.join(OUT, rel_path)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        io.open(dest, "w", encoding="utf-8").write(content)
        written[rel_path] = hashlib.sha256(content.encode()).hexdigest()[:16]

    json.dump(
        {"guide": os.path.basename(GUIDE), "manifest_sha256": sha, "files": written},
        io.open(LOCK, "w", encoding="utf-8"),
        indent=2, sort_keys=True, ensure_ascii=False,
    )
    print(f"\n{OUT}/ 에 기록 · 잠금 파일 {os.path.relpath(LOCK, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
