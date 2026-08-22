# 도메인 이전 — raceplanner.online → raceplanner.athletespick.com

상태: **보류** — §1 선결 조건이 불가로 확인됨 (2026-08-22)
방식: **완전 이전 + 301 리다이렉트** (구 주소는 영구 리다이렉트로만 남긴다)

---

## 0. 실측한 현재 상태

| 대상 | 확인 결과 |
|---|---|
| `raceplanner.online` | Vercel 서빙 (`server: Vercel`, `icn1`). A 레코드 `76.76.21.21` |
| ↑ DNS 관리 | **GoDaddy** (`ns49/ns50.domaincontrol.com`) |
| `athletespick.com` | **카페24** 호스팅·DNS (`ns-*.cafe24.com`), A `183.111.139.234` 외 3개 |
| `raceplanner.athletespick.com` | 현재 **와일드카드가 흡수** → CNAME `athletespick.com` (쇼핑몰로 감) |
| 소스 | 이 레포. 호스팅 설정 파일 없음 = **Vercel Git 연동** |
| `athletespick.com/ads.txt` | **404** ← 아래 §1 |
| 카페24 DNS 커스텀 레코드 | **가능** (MX가 구글 워크스페이스를 향함) |
| 카페24 루트 파일 쓰기 | **불가** — 업로더 ROOT는 웹 루트가 아니다 (§1) |

---

## 1. 선결 조건: `ads.txt` (이거 안 되면 이전하지 말 것)

이 사이트는 AdSense를 싣고 있다 (`/ads.txt` → `pub-6369966478235204`).

**ads.txt는 루트 도메인에서 읽힌다.** 서브도메인으로 옮기면 크롤러는
`https://athletespick.com/ads.txt`를 본다. 지금 그 주소는 **404**다 (카페24 쇼핑몰
404 페이지가 응답한다).

이 상태로 이전하면 광고 인벤토리가 미승인으로 분류되어 **수익이 사실상 0으로 떨어질 수
있다.** 화면은 멀쩡한데 매출만 죽는 종류의 사고이므로, 이전 순서상 가장 먼저 해결한다.

**해야 할 일** — 카페24 웹 루트에 `ads.txt`를 올린다. 둘 중 하나:

```
# 방법 A — 게시자 줄을 직접 넣는다
google.com, pub-6369966478235204, DIRECT, f08c47fec0942fa0
```

```
# 방법 B — 서브도메인 참조 레코드 (IAB 규격)
subdomain=raceplanner.athletespick.com
```

**확인:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://athletespick.com/ads.txt   # 200 이어야 한다
curl -s https://athletespick.com/ads.txt | head -3                          # 내용 확인
```

**규칙 근거 (2026-08-22 확인).** ads.txt 명세상 크롤러는 **항상 루트 도메인의
ads.txt를 먼저 읽는다.** 루트 파일에 `subdomain=` 참조 레코드가 있을 때만 서브도메인의
ads.txt를 추가로 읽는다. 즉 루트에 파일이 없으면 서브도메인에 무엇을 두든 소용이 없다.
(구글 애드센스 공식 문서는 루트 배치만 설명하고 서브도메인 경우를 다루지 않는다.
`SUBDOMAIN` 변수는 IAB 명세 v1.0.1에서 추가됐다.)

> **미확인 — 이 이전의 유일한 실질 관문:** 카페24 **쇼핑몰 솔루션**에서 웹 루트에 임의
> 파일을 올릴 수 있는지 확인하지 못했다.
>
> 검색되는 "카페24 FTP로 www 폴더에 ads.txt 업로드" 안내는 대부분 카페24
> **웹호스팅** 상품 얘기다. `athletespick.com`은 쇼핑몰 솔루션이다 (근거: `/web/upload/`가
> 403으로 존재, robots.txt가 `/order/` `/basket/` `/checkout/`을 막는 쇼핑몰 형태).
> 쇼핑몰 관리자에서는 통상 `/web/upload/` 아래로만 파일을 올릴 수 있고 루트는 플랫폼이
> 소유한다.
>
### 결론: 불가능하다 (2026-08-22 실측)

**파일업로더의 ROOT는 웹 루트가 아니다.** 관리자 파일업로더에 로그인해 ROOT에 있는
파일들의 실제 서빙 여부를 확인한 결과:

| 확인 | 결과 |
|---|---|
| ROOT에 있는 PNG를 `athletespick.com/<파일명>`으로 요청 | **404** |
| 같은 파일을 `/web/`, `/web/upload/` 아래로 요청 | **404** |
| 쇼핑몰이 실제로 쓰는 `/web/upload/share-image-….png` | **200** |
| 쇼핑몰 HTML의 모든 자산 경로 | 전부 `/web/…` |

즉 **우리가 올릴 수 있는 파일은 `/web/` 아래에서만 서빙되고, 사이트 루트는 카페24
플랫폼이 소유한다.** `robots.txt`를 파일이 아니라 `SEO > 고급 설정` 화면에서 편집하게
해 둔 것도 같은 이유다. 그리고 카페24 헬프센터에 `ads.txt` 관련 문서는 존재하지 않는다.

**따라서 `athletespick.com/ads.txt`를 우리 힘으로 만들 수 없고, §1의 전제가 무너진다.**
남은 방법은 카페24에 1:1 문의로 "쇼핑몰 루트에 ads.txt를 제공해 줄 수 있는가"를 묻는
것뿐이다. 그 답이 '아니오'라면 아래 선택지로 간다.

### (참고) 시도했다가 막힌 경로



**웹 파일업로더로는 안 된다.** `[어드민] 디자인 > 웹FTP > 파일업로더`의 허용 확장자는
`JPG, JPEG, PNG, GIF, BMP, HTML, CSS, JS, EOT, WOFF, TTF, OTF`뿐이다. **`.txt`가 없다.**

**루트(ROOT) 업로드 자체는 가능하다.** 카페24 공식 문서가 페이스북 도메인 소유권 인증
파일을 두는 방법으로 "`Add Files` 버튼을 클릭하여 인증 HTML 파일을 선택한 후,
**최상위 디렉토리인 (ROOT)에**" 올리라고 안내한다. 즉 루트 디렉터리는 우리가 쓸 수 있고,
막는 것은 확장자다.

**따라서 외부 FTP 클라이언트를 쓴다.**

| 항목 | 값 |
|---|---|
| 호스트 | `쇼핑몰아이디.ftp.cafe24.com` |
| 사용자명 | 쇼핑몰 아이디 |
| 비밀번호 | 관리자에서 설정한 FTP 비밀번호 |
| 프로그램 | 파일질라(FileZilla), 알FTP 등 |

1. FTP로 접속해 **최상위(ROOT)** 로 이동한다
2. `ads.txt`를 업로드한다 (§1의 A 또는 B 내용)
3. `curl -s -o /dev/null -w "%{http_code}" https://athletespick.com/ads.txt` → **200** 확인

**주의:**
- FTP는 **대표운영자 계정으로만** 접속된다. 부운영자 권한으로는 페이지 열람만 되고 접속은 안 된다
- FTP 접속은 기본적으로 **국내 IP에서만** 허용된다. 해외에서 하려면 접속 지역 설정을 먼저 바꾼다
- 웹 파일업로더의 확장자 제한이 **외부 FTP에도 서버 단에서 걸리는지는 문서에 없다.**
  실제로 올려 보고 위 `curl`이 200을 반환하는지가 최종 확인이다. 거부되면 그때 §1의
  "불가능할 경우의 선택지"로 넘어간다
>
> **불가능할 경우의 선택지:**
> 1. **이전을 하지 않는다.** `raceplanner.online`은 지금 정상 동작하고 루트를 우리가
>    통제한다. 브랜드 통합의 이득과 광고 수익을 저울질하는 문제가 된다
> 2. **루트를 통제할 수 있는 도메인의 서브도메인을 쓴다.** DNS와 호스팅을 모두 쥔
>    도메인이면 `/ads.txt`를 우리가 서빙할 수 있다
> 3. **광고 수익이 무시할 수준이라면 감수하고 이전한다.** 다만 이건 숫자를 보고
>    내려야 하는 판단이지, 기술적으로 해결된 것이 아니다

---

## 2. Vercel에 새 도메인 추가

Vercel 대시보드 → 해당 프로젝트 → Settings → Domains → `raceplanner.athletespick.com` 추가.

추가하면 Vercel이 **필요한 DNS 레코드 값을 화면에 표시한다. 그 값을 그대로 쓴다.**
(통상 서브도메인은 `cname.vercel-dns.com`을 향하는 CNAME이지만, 계정·리전에 따라 다른
값을 안내할 수 있으므로 문서의 값이 아니라 화면의 값을 신뢰한다.)

DNS가 아직 안 바뀐 상태이므로 "Invalid Configuration"으로 표시된다. 정상이다.

**이 단계는 2026-08-22에 실행 완료했다.**
```bash
vercel domains add raceplanner.athletespick.com race-planner
# → {"status":"success","reason":"domain_added"}

vercel domains inspect raceplanner.athletespick.com   # 필요한 레코드 확인 (§3)
```
Vercel 계정 `dongyoonnoi-2732`, 프로젝트 `race-planner`(현 프로덕션 `raceplanner.online`).
도메인만 등록한 상태이며 **DNS가 향하지 않으므로 트래픽에는 아무 영향이 없다.**
되돌리려면 `vercel domains rm raceplanner.athletespick.com`.

---

## 3. 카페24 DNS에 CNAME 추가

**§2를 실행해 Vercel이 요구하는 실제 값을 받았다 (2026-08-22):**

| 호스트 | 타입 | 값 |
|---|---|---|
| `raceplanner` | **A** | `76.76.21.21` |

CNAME이 아니라 A다. (카페24 패널이 서브도메인 A를 거부하면 `cname.vercel-dns.com`을
향하는 CNAME이 표준 대안이지만, 먼저 위 값을 그대로 시도한다.)

명시적 레코드는 와일드카드보다 우선하므로, 현재 쇼핑몰로 가는 동작을 덮어쓴다.

> ### ⚠️ 네임서버는 절대 바꾸지 말 것
>
> `vercel domains inspect`는 두 가지 방법을 제시한다:
> **(a) A 레코드 추가** ← 이것만 한다
> **(b) 네임서버를 `ns1/ns2.vercel-dns.com`으로 변경**
>
> **(b)를 하면 `athletespick.com` 전체 DNS가 카페24에서 Vercel로 넘어간다.**
> 쇼핑몰 A 레코드 4개와 구글 워크스페이스 MX 5개가 함께 사라지므로, **쇼핑몰이 죽고
> 회사 메일이 끊긴다.** 우리가 옮기려는 것은 서브도메인 하나뿐이다.
>
> Vercel도 (a)를 recommended로 표시하지만, (b)가 나란히 제시되므로 명시해 둔다.

**확인** (전파에 수 분~수 시간):
```bash
dig +short raceplanner.athletespick.com CNAME     # Vercel 대상이 나와야 한다
curl -sI https://raceplanner.athletespick.com/ | head -3   # HTTP/2 200, server: Vercel
```

**가능성 확인됨 (2026-08-22).** `athletespick.com`의 MX가 구글 워크스페이스를
가리킨다 (`ASPMX.L.GOOGLE.com` 외 4개). 카페24 DNS에 커스텀 레코드를 이미 넣어 운용
중이라는 뜻이므로, DNS 편집기는 열려 있다.

다만 확인된 것은 MX이지 서브도메인 CNAME은 아니다. 현재 `www` `m` `shop` `mail` 등
조회한 서브도메인이 **전부 와일드카드로 흡수**되고 있어(임의 문자열도 마찬가지),
개별 서브도메인 레코드의 선례는 없다. 쇼핑몰 멀티도메인 기능이 서브도메인을 선점하고
있으면 그 설정을 먼저 풀어야 할 수 있다.

> 곁가지로 발견한 것: `athletespick.com`에 **TXT 레코드가 하나도 없다.** 구글
> 워크스페이스를 쓰는데 SPF가 없다는 뜻이라 메일 도달률·스푸핑에 불리하다. 이번
> 이전과는 무관하지만 따로 손볼 값어치가 있다.

Vercel 대시보드에서 도메인이 **Valid**로 바뀌고 인증서가 자동 발급될 때까지 기다린다.

---

## 4. 소스의 하드코딩 치환 (259곳)

DNS만 바꾸면 페이지들이 **여전히 구 도메인을 정답이라고 선언한다.** canonical이 구
주소를 가리키면 검색엔진은 새 주소를 색인하지 않는다.

실측 분포:

| 위치 | 건수 |
|---|---|
| `sitemap.xml` | 100 |
| `href=` | 108 |
| `hreflang` | 71 |
| `canonical` | 28 |
| JSON-LD `"url"` | 15 |
| **총계** | **259** (파일 34개: 29개 페이지 + 설정·생성기) |

**반드시 함께 고칠 것 — 안 고치면 되살아난다:**

- `build_pace_pages.py:14` → `BASE = "https://raceplanner.online"`
  페이스 페이지 생성기다. 이걸 두면 재생성할 때마다 구 도메인이 다시 박힌다.
- `robots.txt:4` → `Sitemap:` 줄
- `llms.txt` → 6곳 (제목 + 각 링크)

```bash
cd ~/race-planner-web
# .git 과 docs/ 를 제외한 전체 치환.
# docs/ 를 빼는 이유: 이 문서가 구/신 주소 대응을 본문에 담고 있어서,
# 함께 치환되면 런북이 스스로를 뭉갠다.
grep -rl "raceplanner\.online" . --exclude-dir=.git --exclude-dir=docs \
  | xargs sed -i '' 's|raceplanner\.online|raceplanner.athletespick.com|g'

# 잔여 확인 — 0 이어야 한다
grep -r "raceplanner\.online" . --exclude-dir=.git --exclude-dir=docs | wc -l
```

> 이 명령은 레포 사본에서 실제로 돌려 확인했다: 259건 → 0건, 파일 34개.
> `build_pace_pages.py:14`의 `BASE`도 함께 바뀐다.

치환 후 페이스 페이지를 재생성해 생성기와 산출물이 어긋나지 않는지 확인한다:
```bash
python3 build_pace_pages.py
git diff --stat        # 생성 결과가 치환 결과와 같아야 한다
```

커밋 → 푸시 → Vercel 자동 배포.

---

## 5. 구 도메인 301 리다이렉트

`raceplanner.online`을 **같은 Vercel 프로젝트에 남겨 둔 채** 새 도메인으로 리다이렉트한다.
GoDaddy DNS는 **건드리지 않는다** — A 레코드가 Vercel을 계속 향해야 리다이렉트가 작동한다.

**방법 A (권장) — 대시보드**
Settings → Domains에서 `raceplanner.athletespick.com`을 Primary로 지정하고,
`raceplanner.online`에 "Redirect to" → 새 도메인, 상태코드 **301**.

**방법 B — 코드**
```json
// vercel.json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "raceplanner.online" }],
      "destination": "https://raceplanner.athletespick.com/:path*",
      "permanent": true
    }
  ]
}
```

**확인 — 경로가 보존되는지가 핵심이다:**
```bash
curl -sI https://raceplanner.online/pace/marathon/3-30/ | grep -iE "^(HTTP|location)"
# HTTP/2 301
# location: https://raceplanner.athletespick.com/pace/marathon/3-30/
```
루트만 리다이렉트되고 하위 경로가 유실되면 색인된 29개 페이지의 권위가 전부 날아간다.

---

## 6. 검색·광고 재등록

1. **Search Console** — 새 속성(`raceplanner.athletespick.com`)을 추가·소유권 확인한 뒤,
   구 속성에서 **주소 변경(Change of Address)** 을 실행한다. 두 속성 모두 확인된
   상태여야 한다.
2. **새 sitemap 제출** — `https://raceplanner.athletespick.com/sitemap.xml`
3. **AdSense** — 사이트 목록에 새 도메인 추가. §1의 루트 `ads.txt`가 200으로 응답하는지
   다시 확인한다. AdSense 크롤러가 반영하는 데 하루 이상 걸릴 수 있다.
4. **애널리틱스** — 측정 대상 도메인 설정을 새 주소로 갱신한다.

---

## 7. 이전 후 확인 (하루 뒤, 그리고 일주일 뒤)

```bash
# 새 주소가 정상 서빙되는가
curl -sI https://raceplanner.athletespick.com/ | grep -iE "^(HTTP|server)"

# 구 주소가 경로를 보존해 301 하는가
for p in / /pace/ /gpx/ /course/ /pace/marathon/3-30/; do
  printf "%-28s " "$p"
  curl -sI "https://raceplanner.online$p" | grep -i "^location" || echo "리다이렉트 없음"
done

# ads.txt가 루트에서 읽히는가
curl -s https://athletespick.com/ads.txt | grep pub-6369966478235204

# canonical이 새 주소를 가리키는가
curl -s https://raceplanner.athletespick.com/ | grep -i canonical
```

- Search Console 색인 커버리지에서 새 URL이 잡히기 시작하는지
- AdSense 수익이 이전 전 수준으로 회복되는지 (§1이 제대로 됐는지의 진짜 검증)

---

## 8. 되돌리기

§4(소스 치환)까지 갔더라도 되돌릴 수 있다.

1. 카페24에서 `raceplanner` CNAME 삭제 → 와일드카드가 다시 흡수
2. Vercel에서 `raceplanner.online`의 리다이렉트 해제, Primary로 복구
3. 소스 치환 커밋 revert

색인은 되돌려도 즉시 복구되지 않는다. 301이 이미 크롤링된 뒤라면 검색엔진이 원래
주소로 돌아오는 데 시간이 걸린다. **§5 이전 단계에서 멈추는 것이 진짜 안전선이다.**

---

## 9. 판단 근거로 남기는 것

- **서브도메인은 루트 도메인의 권위를 온전히 물려받지 않는다.** 권위 공유가 목적이라면
  `athletespick.com/raceplanner/` 같은 하위 경로가 낫지만, 루트 경로를 카페24 쇼핑몰이
  점유하고 있어 현실적으로 불가능하다. 브랜드 통합이 목적이라면 서브도메인으로 충분하다.
- 완전 이전을 택했으므로 **검색 순위는 몇 주 동안 출렁인다.** 이는 정상이며, 301이
  제대로 걸려 있는 한 회복된다.
- 이 문서의 명령은 전부 확인용(읽기)이거나 로컬 치환이다. **DNS·Vercel·카페24·
  Search Console·AdSense 설정은 사람이 직접 눌러야 한다.**
