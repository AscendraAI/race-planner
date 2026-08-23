# RP 브랜드 자산

**손으로 고치지 마세요.** `brand/rp/svg/RP-mark-dark.svg` · `RP-h-*.svg` ·
`AP-RP-colockup-dark.svg` · `icons.svg` 는 디자인가이드 번들에서 추출한 것이고,
파비콘·앱아이콘 세트는 마크에서 생성한 것입니다.

## 출처

| 자산 | 출처 |
|---|---|
| RP 마크·락업·아이콘 16종 | `RP Design Guide 1.0 (standalone).html` 번들 (`__bundler/manifest`·`__bundler/template`) |
| AP 가로 락업 | `AP_re-branding 3.0/AP 3.0 brand-assets/svg/lockup-horizontal/AP-h-arc-perf.svg` |

AP 자산 폴더가 3벌 있는데 **`AP 3.0 brand-assets/` 만 가이드와 지오메트리가 같습니다**
(링 r=43.5 · 획 9). `AP_로고자산_3.0_260731/`(r=43.056 · 획 9.888)과
`AP_로고자산_v3.0_260731/`(획 19.36)은 쓰지 마세요.

푸터에 기본 `-dark`(Volt 아크)가 아니라 `-arc-perf`를 쓰는 이유: 가이드가
"한 화면에 두 아크 색 금지"를 명시했고 헤더 RP 아크가 Perf 고정이기 때문입니다.

## 재생성

```bash
python3 tools/extract_brand.py       # 번들 → SVG 4종 + 아이콘 스프라이트
python3 tools/build_brand_icons.py   # 마크 → 파비콘·앱아이콘 SVG 7종
./tools/check_brand.sh               # 무결성 검사
```

`tools/brand-manifest.lock` 에 번들 해시가 기록돼 있습니다. 가이드가 갱신되면
추출기가 멈춥니다 — 조용히 다른 자산을 뽑는 것보다 실패하는 편이 낫습니다.
의도한 갱신이면 lock 파일을 지우고 다시 실행하세요.

## 판단 기록

- **16px 파비콘은 아크 색분할을 버리고 단색 링입니다.** AP README 의 "모노그램
  단독 최소 화면 24px" 아래라 90° 분할이 뭉개집니다. 32·48 은 풀마크입니다.
  그래서 ICO 를 Pillow 의 `sizes=` 로 만들면 안 됩니다 — 48을 축소해 넣어서
  16의 별도 드로잉이 사라집니다. `tools/` 의 스크립트가 컨테이너를 직접 씁니다.
- **OG 이미지에 텍스트를 넣지 않았습니다.** `rsvg-convert` 는 웹폰트를 못
  가져오므로 Jost 로 조판하면 대체 폰트로 렌더됩니다. 락업의 워드마크는 이미
  아웃라인 path 라 폰트 없이 정확히 나옵니다.
