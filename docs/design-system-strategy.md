# RP Design Guide 1.0 전면 적용 전략

작성 2026-08-22 · 대상 `race-planner-web` 29페이지 · 기준 문서 `RP Design Guide 1.0` (AP Brand Standards 3.2 상속)

---

## 0. 왜 지금 제각각인가

부분 적용(2026-08-22, `feat/design-system` 브랜치)이 실패한 원인을 실측했다. **덧칠했기 때문이다** — 값의 대부분이 하드코딩인 코드베이스에서 CSS 변수만 재정의하면 이렇게 된다.

| # | 원인 | 실측 |
|---|---|---|
| 1 | 액센트 3개 공존 | `#FBD32C`(rp.css) · `#c8ff43`(17p) · `#c5ff3d`(레거시 블록) |
| 2 | 디자인 시스템을 12/29만 로드 | 나머지 17p는 rp.css도 웹폰트도 모름 |
| 3 | 토큰이 닿지 않는 값 | 라임 리터럴 `rgba(200,255,67,…)` **324회**, 3자리 hex(`#566` `#244` `#443` `#522`) |
| 4 | 반경 위반 | **202회** (`7px` 34 · `13px` 31 · `9px` 27 · `14px` 27 …) |
| 5 | 셸 이중화 | nav.js는 18p만. `pace/marathon/` 11p는 생성기의 구식 HEADER — 내비 로직 2벌, 항목 수도 4 vs 6 |
| 6 | 푸터에 주인 없음 | **8변종** + `course/` 부재 = 9가지 상태 |
| 7 | 브랜드 층 부재 | 파비콘·OG·앱아이콘 **0건**. 로고는 네모 안 글자 "R" |
| 8 | 인라인 CSS 중복 | 총 **407KB**인데 고유 규칙은 **63KB** — **6.5배** |

### 아직 안 드러난 버그 4건

- **라이트 모드 Mac에서 Paper 테마가 샌다.** `data-theme`이 어디에도 없고 rp.css에 `prefers-color-scheme: light` 분기가 있다. rp.css를 쓰는 12p만 배경이 뒤집히는데, 하드코딩된 어두운 카드·회색 글자는 안 뒤집힌다 → 밝은 배경 위 어두운 카드. **"Ink 고정"이 코드에 없다.**
- **`--line: var(--line)` 순환 참조**(12p). 지금은 rp.css 링크가 `</style>`보다 **뒤에** 있어 캐스케이드로 가려져 있다. 공유 CSS를 앞으로 옮기는 순간(=이 작업이 하려는 것) 되살아나 12p 테두리가 전멸한다. **잠복 지뢰.**
- **죽은 `NAV_PAINT` 9개.** nav.js가 `<header>`를 통째로 교체해 `.navlink[data-nav]`가 사라지므로 `paint()`가 아무것도 못 찾는다.
- **`applyLang()`이 nav.js 스텁에 결합.** 25p가 `getElementById("lang-ko").classList.toggle(...)`을 무조건 호출하는데, 안 터지는 이유는 nav.js가 숨김 스텁을 미리 만들어 주기 때문이다. 헤더를 정적화하며 스텁을 지우면 **25p에서 TypeError**.
- **브랜드 마크가 Space Grotesk로 그려진다.** `.logo .mark{font-family:var(--mono)}`.

---

## 1. 확정된 결정

| 항목 | 결정 |
|---|---|
| 액센트 | **Perf `#FBD32C`** (가이드·로고 아크와 일치) |
| 테마 | **Ink 고정.** Paper는 토큰만 준비, `data-theme="dark"`를 29p에 박아 비활성 |
| 범위 | **시각 + 브랜드.** 문구는 불변 (i18n 788개·JSON-LD 26블록 보호) |
| 예외 팔레트 | 포스터 테마만 격리(`RP_POSTER_THEMES`). **gpx는 예외가 아니다** — `<style>` 안 40색은 대부분 UI고, 데이터 인코딩은 `<style>` 밖 14색뿐이며 그마저 `--terrain-*`·`--plan-line`이 rp.css에 이미 있다 |

---

## 2. 세 가지 원칙

**① 덧칠이 아니라 차감.** 페이지 인라인 `<style>`을 공통 CSS와 대조해 중복 규칙을 지우고, 남는 고유 규칙만 `[data-page="…"]`로 스코프한다. 인라인 `<style>` 바이트가 진척도다.

**② 마크업은 최소로 만진다.** `data-i18n` 788개와 JSON-LD 26블록이 SEO·다국어의 실체다. 아래는 절대 금지:
- `[data-i18n]` **안쪽**에 요소 삽입 → `applyLang()`이 `textContent`/`innerHTML`로 자식을 파괴한다
- `data-i18n` 속성 이동·값 변경
- JSON-LD 블록 수정 (diff에 나타나면 실패)

허용: `[data-i18n]` 요소 **자신**에 class 추가, 새 부모로 감싸기, 형제 추가.

**③ 검사를 먼저 만든다.** 린터·SEO 가드·스냅샷 도구가 없는 상태로 페이지를 고치지 않는다. 이 작업의 절반은 "다시 갈라지지 않게 하는 것"이다.

---

## 3. 구조

### 3-1. CSS 파일 4개 (하나는 임시)

```
/rp.css          29p   L0 토큰 · L1 리셋 · L2 프리미티브
/rp-app.css      29p   L3 셸(헤더·푸터·로고) · L4 반복 컴포넌트
/rp-viz.css       2p   제품 산출물 팔레트 (포스터 테마, 상승/하강)
/rp-legacy.css   임시   레거시 별칭 브리지
```

**`rp-legacy.css`가 진척도 계기판이다.** 레거시 별칭 17개를 여기 두고, 페이지가 끝날 때마다 그 페이지에서 `<link>`를 뗀다. 남은 링크 수 = 남은 페이지 수. **0이 되면 파일을 삭제한다.** 별칭을 `rp.css`에 넣으면 영구화되므로 절대 넣지 않는다.

**`@layer`를 쓴다** (2026-08-23 결정 — Safari 15.3 이하 트래픽 무시 가능). 캐스케이드가 특이도 규율이 아니라 구조로 보장된다:

```css
@layer tokens, base, components, page;
```

페이지 인라인 `<style>`은 `@layer page`로 감싼다. 이러면 페이지가 무슨 셀렉터를 쓰든 공통 컴포넌트를 덮어쓰고, 반대로 공통이 페이지를 침범하지 않는다. `[data-page="…"]` 접두는 **가독성 목적으로만** 유지하고 특이도 방어용으로는 더 이상 필요 없다.

`!important`는 여전히 금지 — `@layer` 밖으로 탈출하는 유일한 수단이라 쓰는 순간 구조가 무너진다.

**토큰에 추가할 것**
- 알파 토큰 6개 (`--acc-a06 … --acc-a50`) — 라임 리터럴 324회를 기계적으로 흡수. `color-mix()`가 아니라 명시 토큰인 이유는 `sed` 한 줄로 치환되고 결과가 100% 결정적이기 때문
- `--brand-strava: #FC4C02` — 제3자 브랜드 강제값. 이름이 있어야 린터가 예외로 인정
- `--brand-arc` — 로고 아크 전용. **`--acc-line` 재사용 금지**: 라이트에서 Ink가 되어 아크가 링과 같은 색이 되어 사라진다

**반경 토큰은 늘리지 않는다.** 202회 위반을 전부 `0`으로. `--radius-s` 같은 걸 만들면 §07이 무너지고 다시 갈라진다.

### 3-2. 셸 — 헤더는 정적, 동작만 JS

nav.js가 `<header>`를 통째로 교체하는 현재 방식은 `body>header{visibility:hidden}`을 강제하고, 이건 **CLS**를 만든다. SEO가 수익 모델인데 Core Web Vitals 항목이다.

| nav.js에서 삭제 | 유지 |
|---|---|
| `CSS` 상수 전체(~50줄) → rp-app.css로 이관 | `detect()` `switchLang()` — 언어 |
| `headerHTML()` + `build()`의 헤더 교체 | `active`/`curTool`/`onc()` — 활성 표시 |
| 9~17행 스텁 + `visibility:hidden` | `drawerHTML()` — 초기 뷰포트 밖이라 FOUC 무관 |
| `.rpn-mark` 글로우(`rgba(200,255,67,.35)`) | `TOOLS`/`W` — 내비 모델 단일 정본 |

**스텁 삭제는 연쇄를 부른다.** 같은 커밋에서 25p + 생성기 `I18N_CORE`의 `getElementById("lang-ko")` 두 줄을 제거해야 한다.

**생성기 11p**: `HEADER`(68행) 교체, `NAV_PAINT`(83행) 삭제, `page_shell()`에 `<script src="/nav.js">` + `data-theme="dark" data-page="pace"` 추가, 푸터 골격 교체.

**`course/`**: 본문 전체가 JS 템플릿 문자열이라 푸터를 **JS 밖 `</body>` 직전**에 정적으로 넣는다.

### 3-3. 브랜드 자산

**RP 로고 벡터의 유일한 원본은 가이드 번들 안에 있다.** `<script type="__bundler/manifest">` 다음 줄의 gzip+base64 JSON에 SVG 4종. `tools/extract_brand.py`로 추출하되:
- 줄 번호를 하드코딩하지 않는다 (`__bundler/manifest` 문자열로 찾는다)
- manifest의 SHA-256을 상수로 박고 대조 — 가이드가 1.1로 갱신되면 즉시 중단
- 결과 SHA를 `tools/brand-manifest.lock`에 기록

**아이콘 16종 추출에는 함정이 있다.** 템플릿 안에서 `viewBox`가 아니라 **`sc-camel-view-box`**로 적혀 있다(번들러가 camelCase를 뭉갠 흔적). 그대로 복사하면 브라우저가 무시해 **아이콘이 안 보인다.** 정규식이 18건을 잡는데 뒤 2건은 빈 상태 삽화이므로 `[:16]`으로 자른다.

**AP 자산은 폴더를 잘못 고르면 안 된다.** 3벌이 병존하고 둘이 가이드와 어긋난다:

| 폴더 | 링 r | 획 | 판정 |
|---|---|---|---|
| `AP_re-branding 3.0/AP 3.0 brand-assets/` | **43.5** | **9** | ✅ 가이드와 동일 |
| `AP_로고자산_3.0_260731/` | 43.056 | 9.888 / 30.77 | ❌ |
| `AP_로고자산_v3.0_260731/` | — | 19.36 | ❌ |

푸터에는 `AP 3.0 brand-assets/svg/lockup-horizontal/**AP-h-arc-perf.svg**`를 **무수정 복사**한다. 기본 `-dark`가 아니라 Perf 아크판인 이유: 가이드가 "한 화면에 두 아크 색 금지"를 명시했고 헤더 RP 아크가 Perf 고정이므로, 푸터가 Volt면 규칙 위반이다. 재조판 금지 — AP README가 "폰트로 다시 치면 13쌍의 커닝과 소유격 's가 사라진다"고 경고한다.

**파비콘 사이즈 체계는 AP 3.0을 그대로 상속한다** (실측 규격): 16은 아크를 버리고 **단색 원**(24px 미만에서 90° 색분할이 뭉개지므로 별도 드로잉), 32·48은 풀마크, 180·1024는 여백 21% + 라운드 배경, 1080 소셜은 여백 30% 정사각.

**헤더 로고는 인라인 SVG.** `<img>`는 테마 분기가 필요하고, CSS mask는 알파 1채널이라 링(Cream)+아크(Perf) **2색을 표현할 수 없다.** 링·글자를 `currentColor`, 아크만 `var(--brand-arc)`로 두면 추가 요청 0·FOUC 0·테마 전환 공짜다. 락업 비율 7.727:1 → 높이 22px = 폭 170px.

**단일 출처 유지**: nav.js에 `/* RP-LOCKUP-START */ … /* RP-LOCKUP-END */` 센티널로 상수를 두고, `build_pace_pages.py`가 `extract_style()`과 같은 관례로 뽑아 쓴다.

---

## 4. 실행 순서

브랜드 층과 CSS 층을 **교차 배치**한다. 브랜드 PR 중 시각 회귀가 0인 것을 앞에 두어 이득을 먼저 확보한다.

| # | 내용 | 페이지 | 시각 회귀 | 비고 |
|---|---|---|---|---|
| **P0** | 검사 도구 3종 + 베이스라인 116장 + `--line` 순환 삭제 + `data-theme="dark"` 29p | 0 | 없음 | **Paper 새는 것 즉시 차단** |
| **P1** | 브랜드 자산 추출 (`brand/` 일체). 코드 변경 0 | 0 | 없음 | 롤백 = 파일 삭제 |
| **P2** | 파비콘·앱아이콘·manifest·OG 메타 | 29 head | **없음** | 효과 대비 위험 최저 — 탭 아이콘·SNS 썸네일 즉시 |
| **P3** | 셸 일원화 + 헤더 락업 | 29 | **큼** | 단독 배포. **CLS 개선이 성과 지표** |
| **P4** | 푸터 AP 배지 | 29 | 작음 | |
| **P5** | 저위험 대량 (pace 12 + terms/privacy/about/contact/api-docs/ai) | 18 | 중 | pace 12는 `pace/index.html` 1개 수정 → 재생성 |
| **P6** | 가이드 6개 | 6 | 중 | 3개는 CSS가 바이트 동일 → 실질 2벌 |
| **P7** | 아이콘 스프라이트 + 1차 교체 | — | 중 | |
| **P8** | courses + hyrox | 2 | 중 | |
| **P9** | course (JS 템플릿) | 1 | 높음 | ld+json 런타임 주입 → Chrome MCP 검증 의존 |
| **P10** | gpx | 1 | 높음 | 고유 87 · `:root` 2벌 · CSS 24KB |
| **P11** | index | 1 | 높음 | **마지막.** 수익 랜딩. 앞의 28p에서 컴포넌트 검증 완료 후라 실제 위험이 최저 |
| **P12** | 로더 + `rp-legacy.css` 삭제 | — | 없음 | `/trails.json` 1.12MB가 최우선 적용 지점 |

**총 약 9~11일 (1인 기준, 추정).**

---

## 5. 재발 방지

`tools/rp_lint.py` — **Python 표준 라이브러리만.** 이 저장소에 `package.json`이 없다는 것이 배포 모델의 자산이고, `build_pace_pages.py`와 언어를 통일하면 유지 주체가 하나다.

| 검사 | 규칙 | 현재 위반 |
|---|---|---|
| `hardcoded-color` | `<style>`·`style=` 안의 hex/rgb/hsl. 면제: 토큰 정의부·rp-viz·`--brand-*` | 다수 |
| `hardcoded-radius` | `0`·`var(--radius)`·`var(--radius-pill)`·`50%` 외 실패 | **202** |
| `no-shadow` | `box-shadow`는 `none`만 (§07) | 다수 |
| **`token-cycle`** | 커스텀 프로퍼티 자기참조·순환 탐지 | **1** ← 이번 버그 |
| **`dup-rule`** | 페이지 인라인이 공통 CSS와 `(selector, body)` 중복이면 실패 | **296** ← "다시 갈라짐" 직접 차단 |
| `required-assets` | 전 HTML이 rp.css+rp-app.css 로드, `data-theme="dark"` 존재 | 29 |
| `i18n-nesting` | `[data-i18n]` 하위에 `class` 있으면 실패 | 0 |
| **`budget`** | 페이지당 인라인 `<style>` 바이트 상한 = 완료 실측치 +20% | — |
| `no-important` | 금지 | 수 건 |

3자리 hex는 `#[0-9a-fA-F]{3,8}\b`로 `#566` `#244` `#443` `#522`까지 포착된다(실측 확인).

`tools/rp_seo_guard.py` — `git show HEAD:<path>`로 이전 버전과 대조: title·meta·canonical·hreflang·og·h1, **ld+json 26블록 정규화 해시**, **`data-i18n` 788개 정렬 목록**, script/style 제거 후 본문 해시. **하나라도 다르면 실패.** 시각 마이그레이션은 정의상 이 중 무엇도 바꾸지 않는다.

`build_pace_pages.py --check` — 파일을 쓰지 않고 diff만 보고. 생성물 11개를 직접 편집하면 잡는다. **이 저장소에서 가장 중요한 CI 검사.**

---

## 6. 검증

**L1 정적** — 린터 + SEO 가드. 초 단위, 모든 커밋.

**L2 구조 회귀** (`tools/rp_snap.py`, 로컬 서버 + Playwright) — 29 URL × 2뷰포트 × 2언어 = **116장**. 픽셀 diff는 쓰지 않는다(색이 바뀌는 게 목적이라 무의미). 대신:
1. **경계 상자 diff** — `h1,h2,h3,table,header,footer,[data-i18n]`의 `getBoundingClientRect()` 전후 ±8px → 레이아웃 불변 증명
2. **계산값 단언** — `--acc-fill === #FBD32C`(액센트 3개 공존 해소 증명), `body` 배경 `rgb(11,11,9)`, 카드 `border-radius: 0px` / `box-shadow: none`, 락업 높이 **22px**, AP 배지 **18px**
3. **죽은 border 탐지** — `border-style: solid`인데 `width: 0px`인 요소 수집 → `--line` 순환류 재발 즉시 포착

**L3 동작** (Chrome MCP, 페이지당 1회) — 언어 토글 후 레이아웃 동일(**가장 중요**), 드로어, 핵심 인터랙션 1개, 콘솔 에러 0, 포커스 링, reduced-motion, **OS 라이트 모드에서 여전히 Ink**.

**브랜드 전용 검사** (`tools/check_brand.sh`)
```bash
grep -c 'sc-camel-view-box' brand/icons.svg          # → 0 (추출 함정 회귀 방지)
grep -oh 'stroke-width="[0-9.]*"' brand/**/*.svg     # → "9" 하나만
grep -ri '#DCF734\|#CCFF00\|#C8FF43\|#C5FF3D' brand/ # → 0건 (아크 색 오염)
python3 -c "from PIL import Image;print(sorted(Image.open('favicon.ico').info['sizes']))"
sips -g hasAlpha apple-touch-icon.png                # → no (iOS가 투명을 검게 채운다)
```

**도구 실측**: macOS에 SVG 래스터라이저가 **하나도 없다** → `brew install librsvg` 1회 필요. ICO 패킹은 Pillow 11.3.0이 이미 있어 추가 설치 불필요. Playwright도 미설치.

**OG는 배포 후에만 실검증 가능** — 슬랙 붙여넣기(캐시 없음) → **카카오 디버거**(한국 주력이므로 페북보다 중요) → 페북 디버거. `twitter:card`가 29p 전부 0건이라 반드시 추가해야 큰 이미지가 뜬다.

---

## 7. 결정 완료

**둘 다 2026-08-23에 확정됐다.**

1. **`rp-foot__legal`을 없는 15p에 추가한다.** 문구 추가가 아니라 사이트 구조이며 AdSense 정책상으로도 전 페이지에 필요하다. `rp_seo_guard.py`의 본문 해시 검사에서 이 4개 링크는 **명시적 예외**로 허용한다 — 예외를 코드에 적어 두지 않으면 P4에서 가드가 29번 실패한다.
2. **`@layer`를 쓴다.** Safari 15.3 이하 무시 가능 (§3-1 반영).

---

## 부록 — 손대면 안 되는 것

- `data-i18n` **788개** (값·위치·중첩)
- JSON-LD **26블록** (바이트 단위)
- URL · title · meta description · canonical · hreflang
- 본문 텍스트
- `pace/marathon/` **11개 생성 파일** (직접 편집 금지, `pace/index.html` + 재생성)
- `index.html`의 `RP_POSTER_THEMES` (제품 기능이지 UI가 아니다. `paper` 테마 배경 `#f4f1e9`를 시스템 `#F2F0E8`과 같게 만들면 사용자가 만든 포스터가 사이트 배경에 묻힌다)
