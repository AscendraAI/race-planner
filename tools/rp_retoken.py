#!/usr/bin/env python3
"""
페이지 인라인 CSS 의 레거시 변수를 rp.css 토큰으로 옮긴다.

이 저장소에는 두 세대의 팔레트가 섞여 있다.

  · 레거시 — 페이지마다 :root 를 한 벌씩 들고 있다. 이름이 --ink/--sub/--accent
    이고 값이 페이지마다 갈렸다(--accent 가 #c8ff43 과 #c5ff3d 로 두 갈래).
  · rp.css — 가이드 §04 의 Ink 테마. --text/--text-3/--acc-line.

앞서 한 번은 페이지 :root 에 `--sub: var(--text-2)` 같은 호환 선언을 넣어
이었는데, 그건 덧칠이라 팔레트가 둘로 남는다. 여기서는 반대로 한다 —
레거시 :root 선언을 지우고 사용처를 토큰 이름으로 바꾼다. 팔레트는 하나만 남는다.

이름이 rp.css 와 겹치는 것(--bg, --line, --radius, --warn)은 매핑하지 않고
선언만 지운다. rp.css 가 <style> 뒤에 실려 어차피 이기고 있었으므로,
지우면 값이 바뀌는 게 아니라 죽은 선언이 사라진다.

    python3 tools/rp_retoken.py about/index.html --dry-run
    python3 tools/rp_retoken.py about/index.html pace/index.html
"""
import argparse
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 레거시 이름 → rp.css 토큰
MAP = {
    "--bg2": "--surface",
    "--panel": "--surface-2",
    "--panel2": "--surface-3",
    "--panelhi": "--surface-3",
    "--line2": "--line-2",
    "--ink": "--text",
    "--ink2": "--text-2",
    "--sub": "--text-3",
    "--faint": "--text-3",
    "--accentink": "--acc-on",
    "--mono": "--font-mono",
    "--rox": "--warn",
    # 민트(#6ee7a8)는 가이드에 대응색이 없다. 본문 링크·호버에만 쓰이므로
    # 브랜드 강조로 합친다 — 팔레트에 남는 색조를 하나로 줄이는 쪽을 택했다.
    "--mint": "--acc-line",
    # #7be0a4. 긍정·보급 표시에 쓰인다 → 가이드의 Fuel.
    "--accent2": "--fuel",
}

# rp.css 와 이름이 같다. 매핑 없이 선언만 지운다.
SHADOWED = {"--bg", "--line", "--radius", "--warn", "--fuel", "--scrim"}

# --accent 는 쓰이는 자리에 따라 갈린다. 면이면 fill, 글자·선이면 line.
FILL_PROPS = ("background", "background-color", "fill")


def retoken_css(css):
    """(새 CSS, 변경 로그) 를 돌려준다."""
    log = []

    # 1) 사용처 치환. `prop: … var(--x) …` 한 선언 안의 모든 var() 를
    #    속성 문맥과 함께 본다 — --accent 는 속성 이름을 보고 갈린다.
    def sub_decl(m):
        prop, val = m.group(1), m.group(2)
        def one(vm):
            name = vm.group(1)
            if name == "--accent":
                tgt = "--acc-fill" if prop.strip().lower() in FILL_PROPS else "--acc-line"
            elif name in MAP:
                tgt = MAP[name]
            else:
                return vm.group(0)
            log.append(f"  {prop}: {name} → {tgt}")
            return f"var({tgt}"
        return prop + ":" + re.sub(r"var\(\s*(--[\w-]+)", one, val)

    out = re.sub(r"([\w-]+)\s*:\s*([^;{}]*var\([^;{}]*)", sub_decl, css)

    # 2) 레거시 :root 선언 제거
    def strip_root(m):
        head, body = m.group(1), m.group(2)
        kept = []
        for decl in body.split(";"):
            if not decl.strip():
                continue
            name = decl.split(":", 1)[0].strip()
            if name in MAP or name in SHADOWED or name == "--accent":
                log.append(f"  :root 선언 삭제 {name}")
                continue
            kept.append(decl.strip())
        if not kept:
            log.append("  :root 블록 통째 삭제")
            return ""
        return f"{head}{{{';'.join(kept)}}}"

    out = re.sub(r"(:root[^{]*)\{([^}]*)\}", strip_root, out)
    return out, log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    rp = io.open(os.path.join(ROOT, "rp.css"), encoding="utf-8").read()
    known = set(re.findall(r"(--[\w-]+)\s*:", rp))

    total = 0
    for rel in args.paths:
        path = rel if os.path.isabs(rel) else os.path.join(ROOT, rel)
        html = io.open(path, encoding="utf-8").read()
        blocks = list(re.finditer(r"<style[^>]*>(.*?)</style>", html, re.S))
        if len(blocks) != 1:
            print(f"!! {rel}: <style> {len(blocks)}개 — 건너뜀")
            continue
        b = blocks[0]
        new_css, log = retoken_css(b.group(1))

        # 인라인 style="" 속성도 같이 옮긴다. <style> 만 고치면 본문 몇 군데가
        # 정의 없는 변수를 가리켜 색을 잃는다 — 실제로 놓칠 뻔했다.
        head, tail = html[: b.start(1)], html[b.end(1):]

        def fix_attr(m):
            fixed, sub_log = retoken_css(m.group(1))
            log.extend("  [inline] " + x.strip() for x in sub_log)
            return f' style="{fixed}"'

        head = re.sub(r'\sstyle="([^"]*)"', fix_attr, head)
        tail = re.sub(r'\sstyle="([^"]*)"', fix_attr, tail)

        # 남은 레거시 변수 보고 — 조용히 넘기지 않는다. <style> 과 인라인 속성 둘 다 본다.
        scan = new_css + " ".join(re.findall(r'\sstyle="([^"]*)"', head + tail))
        left = {v for v in re.findall(r"var\(\s*(--[\w-]+)", scan) if v not in known}
        print(f"{rel}: 치환 {len(log)}건" + (f"  ⚠ 미매핑 {sorted(left)}" if left else ""))
        for line in log[:6]:
            print("   " + line)
        if len(log) > 6:
            print(f"   … 외 {len(log) - 6}건")
        total += len(log)

        if not args.dry_run and log:
            io.open(path, "w", encoding="utf-8").write(head + new_css + tail)

    print(f"\n{'(dry-run) ' if args.dry_run else ''}합계 {total}건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
