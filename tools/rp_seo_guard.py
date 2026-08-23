#!/usr/bin/env python3
"""
SEO·다국어 불변식 가드.

이 사이트의 수익 모델은 SEO다. 시각 마이그레이션은 정의상 아래 중 무엇도 바꾸지
않는다 — 하나라도 바뀌면 그건 시각 작업이 아니라 사고다.

  · title / meta description / canonical / hreflang / og:*
  · JSON-LD 블록 (정규화 해시)
  · data-i18n 속성 값 전수
  · <h1> 텍스트
  · script/style 제거 후 본문 텍스트 해시

    python3 tools/rp_seo_guard.py --snapshot        # 현재 상태를 기준으로 저장
    python3 tools/rp_seo_guard.py                   # 기준과 비교
    python3 tools/rp_seo_guard.py --against HEAD    # git 이전 버전과 비교

문구 불변이 원칙이지만 예외가 하나 있다: 푸터 법적 링크(About·Privacy·Terms·
Contact)를 없는 페이지에 추가하기로 2026-08-23에 결정했다. 이 4개 링크만
본문 해시 계산에서 제외한다 — 예외를 코드에 적지 않으면 그 PR에서 가드가
전 페이지에서 실패한다.
"""
import argparse
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP_PATH = os.path.join(ROOT, "tools", "rp_seo_snapshot.json")

# 2026-08-23 결정: 푸터 법적 링크는 전 페이지 추가 허용 (구조이지 문구가 아니다)
#
# 두 벌이 필요하다. 새로 넣는 블록은 <nav class="rp-foot__legal"> 통째로 지워야
# 하고(안 그러면 구분자 "·" 가 남아 해시가 바뀐다), 이미 인라인으로 링크를 갖고
# 있던 페이지는 앵커만 지우면 된다 — 그 페이지들은 전후가 같으므로 구분자가
# 남아도 해시가 일치한다.
LEGAL_BLOCK_RE = re.compile(
    r'<nav[^>]+class="[^"]*rp-foot__legal[^"]*"[^>]*>.*?</nav>', re.S | re.I
)
LEGAL_LINK_RE = re.compile(
    r'<a[^>]+href="/(about|privacy|terms|contact)/"[^>]*>.*?</a>', re.S | re.I
)


def rel(p):
    return os.path.relpath(p, ROOT)


def html_files():
    out = []
    for f in glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True):
        if os.sep + ".git" + os.sep in f:
            continue
        out.append(f)
    return sorted(out)


def norm_jsonld(block):
    """키 순서·공백에 흔들리지 않게 정규화한 뒤 해시."""
    try:
        data = json.loads(block)
    except Exception:
        return "unparseable:" + hashlib.sha256(block.encode()).hexdigest()[:16]
    return hashlib.sha256(
        json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()[:16]


def body_hash(html):
    """script/style/주석과 태그를 걷어낸 본문 텍스트. 법적 링크는 예외로 제거."""
    m = re.search(r"<body[^>]*>(.*)</body>", html, re.S | re.I)
    body = m.group(1) if m else html
    body = re.sub(r"<script.*?</script>", " ", body, flags=re.S | re.I)
    body = re.sub(r"<style.*?</style>", " ", body, flags=re.S | re.I)
    body = re.sub(r"<!--.*?-->", " ", body, flags=re.S)
    body = LEGAL_BLOCK_RE.sub(" ", body)         # ← 명시적 예외 (신규 블록 통째)
    body = LEGAL_LINK_RE.sub(" ", body)          # ← 명시적 예외 (기존 인라인 앵커)
    body = re.sub(r"<[^>]+>", " ", body)
    body = re.sub(r"\s+", " ", body).strip()
    return hashlib.sha256(body.encode()).hexdigest()[:16]


def meta(html, name=None, prop=None):
    if name:
        m = re.search(r'<meta\s+name="%s"\s+[^>]*content="([^"]*)"' % re.escape(name), html, re.I)
    else:
        m = re.search(r'<meta\s+property="%s"\s+[^>]*content="([^"]*)"' % re.escape(prop), html, re.I)
    return m.group(1) if m else None


def fingerprint(html):
    title = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    canon = re.search(r'<link\s+rel="canonical"\s+href="([^"]*)"', html, re.I)
    hrefl = sorted(re.findall(r'<link\s+rel="alternate"\s+hreflang="([^"]*)"\s+href="([^"]*)"', html, re.I))
    ld = [norm_jsonld(b) for b in re.findall(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S | re.I)]
    h1 = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", t)).strip()
          for t in re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.S | re.I)]
    return {
        "title": title.group(1).strip() if title else None,
        "description": meta(html, name="description"),
        "canonical": canon.group(1) if canon else None,
        "hreflang": hrefl,
        "og_title": meta(html, prop="og:title"),
        "og_type": meta(html, prop="og:type"),
        "jsonld": sorted(ld),
        "jsonld_count": len(ld),
        "h1": h1,
        "i18n_keys": sorted(re.findall(r'data-i18n="([^"]*)"', html)),
        "i18n_count": len(re.findall(r'data-i18n="', html)),
        "body": body_hash(html),
    }


def collect_current():
    out = {}
    for f in html_files():
        with open(f, encoding="utf-8") as fh:
            out[rel(f)] = fingerprint(fh.read())
    return out


def collect_git(ref):
    out = {}
    for f in html_files():
        r = rel(f)
        try:
            blob = subprocess.run(["git", "show", f"{ref}:{r}"], cwd=ROOT,
                                  capture_output=True, text=True, check=True).stdout
        except subprocess.CalledProcessError:
            continue  # 그 시점에 없던 파일
        out[r] = fingerprint(blob)
    return out


def compare(base, now):
    problems = []
    for path, want in sorted(base.items()):
        got = now.get(path)
        if got is None:
            problems.append((path, "파일 사라짐", "", ""))
            continue
        for key in want:
            if want[key] != got[key]:
                a, b = want[key], got[key]
                if isinstance(a, list):
                    a, b = f"{len(a)}개", f"{len(b)}개"
                problems.append((path, key, str(a)[:40], str(b)[:40]))
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot", action="store_true")
    ap.add_argument("--against", metavar="GITREF")
    args = ap.parse_args()

    now = collect_current()

    if args.snapshot:
        with open(SNAP_PATH, "w", encoding="utf-8") as fh:
            json.dump(now, fh, indent=1, sort_keys=True, ensure_ascii=False)
        tot_i18n = sum(v["i18n_count"] for v in now.values())
        tot_ld = sum(v["jsonld_count"] for v in now.values())
        print(f"기준 저장: {rel(SNAP_PATH)}")
        print(f"  페이지 {len(now)}  ·  data-i18n {tot_i18n}  ·  JSON-LD {tot_ld}블록")
        return 0

    if args.against:
        base = collect_git(args.against)
        src = f"git {args.against}"
    else:
        if not os.path.exists(SNAP_PATH):
            print("기준이 없습니다. --snapshot 을 먼저 실행하세요.", file=sys.stderr)
            return 2
        with open(SNAP_PATH, encoding="utf-8") as fh:
            base = json.load(fh)
        src = rel(SNAP_PATH)

    problems = compare(base, now)
    if not problems:
        tot_i18n = sum(v["i18n_count"] for v in now.values())
        tot_ld = sum(v["jsonld_count"] for v in now.values())
        print(f"통과 — {src} 대비 변화 없음")
        print(f"  페이지 {len(now)}  ·  data-i18n {tot_i18n}  ·  JSON-LD {tot_ld}블록")
        return 0

    print(f"실패 — {src} 대비 {len(problems)}건 변화\n")
    for path, key, a, b in problems[:40]:
        print(f"  {path}")
        print(f"    {key}: {a}  →  {b}")
    if len(problems) > 40:
        print(f"  … 외 {len(problems)-40}건")
    return 1


if __name__ == "__main__":
    sys.exit(main())
