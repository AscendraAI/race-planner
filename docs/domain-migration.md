# 도메인 이전 — raceplanner.online → raceplanner.athletespick.com

상태: 실행 전 체크리스트 (2026-08-22 작성)
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

> **미확인 사항:** 카페24 쇼핑몰 솔루션에서 웹 루트에 임의 파일을 올릴 수 있는지
> 확인하지 못했다. 불가능하다면 서브도메인 이전 자체를 재고해야 한다 —
> 광고 수익이 이 사이트의 수익 모델이라면 이 항목이 이전 가능 여부를 결정한다.

---

## 2. Vercel에 새 도메인 추가

Vercel 대시보드 → 해당 프로젝트 → Settings → Domains → `raceplanner.athletespick.com` 추가.

추가하면 Vercel이 **필요한 DNS 레코드 값을 화면에 표시한다. 그 값을 그대로 쓴다.**
(통상 서브도메인은 `cname.vercel-dns.com`을 향하는 CNAME이지만, 계정·리전에 따라 다른
값을 안내할 수 있으므로 문서의 값이 아니라 화면의 값을 신뢰한다.)

DNS가 아직 안 바뀐 상태이므로 "Invalid Configuration"으로 표시된다. 정상이다.

CLI로도 가능하다:
```bash
cd ~/race-planner-web
vercel link          # 로컬에 .vercel 링크가 없으므로 최초 1회
vercel domains add raceplanner.athletespick.com
```

---

## 3. 카페24 DNS에 CNAME 추가

카페24 DNS 관리 → 레코드 추가:

| 호스트 | 타입 | 값 |
|---|---|---|
| `raceplanner` | CNAME | (§2에서 Vercel이 표시한 값) |

명시적 레코드는 와일드카드보다 우선하므로, 현재 쇼핑몰로 가는 동작을 덮어쓴다.

**확인** (전파에 수 분~수 시간):
```bash
dig +short raceplanner.athletespick.com CNAME     # Vercel 대상이 나와야 한다
curl -sI https://raceplanner.athletespick.com/ | head -3   # HTTP/2 200, server: Vercel
```

> **미확인 사항:** 카페24 DNS 패널이 쇼핑몰 도메인의 서브도메인에 대해 임의 CNAME을
> 허용하는지 확인하지 못했다. 서브도메인을 쇼핑몰 멀티도메인 기능이 선점하고 있으면
> 그 설정을 먼저 풀어야 할 수 있다.

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
