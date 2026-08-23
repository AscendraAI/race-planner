#!/usr/bin/env bash
# 브랜드 자산 무결성 검사.
#
# 파비콘·OG 는 눈으로 확인하기 어렵다. 실측 가능한 것만 본다.
# 실패하면 exit 1.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
ok(){ printf "  \033[32m✓\033[0m %s\n" "$1"; }
no(){ printf "  \033[31m✗\033[0m %s\n" "$1"; fail=1; }

echo "== 추출 함정 =="
n=$(grep -c 'sc-camel-view-box' brand/icons.svg || true)
[ "$n" = "0" ] && ok "viewBox 정규화됨 (sc-camel-view-box 0건)" || no "sc-camel-view-box $n건 남음 — 아이콘이 안 보인다"
n=$(grep -c '<symbol' brand/icons.svg || true)
[ "$n" = "16" ] && ok "아이콘 16종" || no "아이콘 $n종 (16 기대)"

echo "== 스프라이트 =="
if python3 tools/sync_sprite.py --check >/dev/null 2>&1; then
  n=$(grep -c '<symbol' brand/icons.svg brand/icons-ext.svg | awk -F: '{s+=$2} END{print s}')
  ok "nav.js 스프라이트가 원본과 일치 (아이콘 ${n}종)"
else
  no "nav.js 스프라이트가 원본과 어긋남 — tools/sync_sprite.py 실행 필요"
fi
# 참조는 두 갈래다 — nav.js 는 icon("time") / ic:"time" 으로 이름만 넘기고
# href 를 실행 시점에 조립한다. 페이지 HTML 은 <use href="#rp-time"> 을 직접 쓴다.
# 문자열 `href="#rp-` 만 찾으면 nav.js 쪽이 통째로 안 잡힌다.
refs=$(
  { grep -o 'icon("[a-z-]*"' nav.js | sed 's/icon("//;s/"//'
    grep -o 'ic:"[a-z-]*"' nav.js | sed 's/ic:"//;s/"//'
    grep -rho 'href="#rp-[a-z-]*"' --include='*.html' . 2>/dev/null | sed 's/.*#rp-//;s/"//'
  } | sort -u )
m=0
for id in $refs; do
  grep -q "id=\"rp-$id\"" brand/icons.svg brand/icons-ext.svg || { no "없는 아이콘을 참조: rp-$id"; m=1; }
done
[ "$m" = "0" ] && ok "아이콘 참조 $(echo "$refs" | wc -w | tr -d ' ')종 전부 존재 ($(echo $refs | tr '\n' ' '))"

echo "== 지오메트리 =="
w=$(grep -oh 'stroke-width="[0-9.]*"' brand/rp/svg/RP-mark-dark.svg brand/rp/svg/RP-h-dark.svg brand/ap/*.svg | sort -u | tr '\n' ' ')
[ "$w" = 'stroke-width="9" ' ] && ok "링 굵기 9 단일 (가이드 규격)" || no "링 굵기가 섞였다: $w"
n=$(grep -l 'A43.5 43.5' brand/rp/svg/RP-mark-dark.svg brand/ap/AP-h-arc-perf.svg 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = "2" ] && ok "링 반지름 43.5 (RP·AP 동일)" || no "링 반지름 불일치"

echo "== 아크 색 오염 =="
n=$(grep -ric '#CCFF00\|#C8FF43\|#C5FF3D' brand/ 2>/dev/null | grep -cv ':0$' || true)
[ "$n" = "0" ] && ok "폐기색 없음" || no "폐기 라임색이 $n개 파일에 남음"

echo "== 래스터 =="
if command -v sips >/dev/null; then
  a=$(sips -g hasAlpha apple-touch-icon.png 2>/dev/null | tail -1 | tr -d ' ')
  [ "$a" = "hasAlpha:no" ] && ok "apple-touch-icon 알파 없음 (iOS가 투명을 검게 채운다)" || no "apple-touch-icon 에 알파: $a"
  d=$(sips -g pixelWidth -g pixelHeight og/rp-og-default.png 2>/dev/null | tail -2 | tr -d ' \n')
  [ "$d" = "pixelWidth:1200pixelHeight:630" ] && ok "OG 1200×630" || no "OG 크기: $d"
fi
s=$(python3 -c "from PIL import Image;print(sorted(Image.open('favicon.ico').info['sizes']))" 2>/dev/null)
[ "$s" = "[(16, 16), (32, 32), (48, 48)]" ] && ok "favicon.ico 3크기 ($s)" || no "favicon.ico: $s"

echo "== SVG 유효성 =="
bad=0
for f in $(find brand -name '*.svg'); do
  python3 -c "import xml.dom.minidom,sys;xml.dom.minidom.parse(sys.argv[1])" "$f" 2>/dev/null || { no "파싱 실패: $f"; bad=1; }
done
[ "$bad" = "0" ] && ok "SVG $(find brand -name '*.svg' | wc -l | tr -d ' ')개 전부 파싱됨"

echo
[ "$fail" = "0" ] && echo "전부 통과" || echo "실패 있음"
exit $fail
