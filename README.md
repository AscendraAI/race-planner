# 레이스 플래너 (Race Planner)

러너·하이록스 선수를 위한 무료 웹 도구. 순수 정적 사이트(빌드 불필요).

- 라이브: https://raceplanner.athletespick.com
- 계산기: 평소 러닝 페이스 → 하이록스 완주 기록 예측
- 가이드: 페이싱 / 보급 / 스테이션

## 구조

```
index.html              계산기 (메인)
guide/pacing/index.html  페이싱 가이드
guide/nutrition/index.html 보급 가이드
guide/stations/index.html  스테이션 공략
sitemap.xml / robots.txt   SEO
```

## 배포

Vercel Git 연동 시 `main` 브랜치에 push하면 자동 배포됩니다. 빌드 설정 없음(정적). Output Directory: 루트(`.`).

## UTNP 이벤트 화면

`/gpx/?race=utnp`는 `events/utnp.json`의 행사 기간에 맞춰 플랜과 부스 설문을 표시합니다. 기간 밖에는 플랜만 볼 수 있습니다. 다섯 코스는 `course-data/utnp-*.json`에 있으며, `tools/build_utnp_courses.py`로 2026년 10월 12일 GPX 사본에서 다시 만들 수 있습니다. 화면 거리·상승·제한시간·보급소 표기는 공식 종목 페이지를 따릅니다.

설문 RPC를 연결할 때는 `assets/event-config.js`의 두 자리표시자를 실제 Supabase 공개 URL·anon 키로 채웁니다. 픽나우 `events` 행의 `questions`, `reason_options`, `participating_brands`는 `events/utnp.json`과 같아야 합니다. 설정 전이나 전송 실패 때는 답을 기기에 보관하고 재전송 버튼을 표시합니다.

검사: `python3 tools/rp_lint.py`, `python3 tools/rp_seo_guard.py`, `node tools/utnp_smoke.mjs`. 마지막 검사는 390×844 화면 캡처 일곱 장을 `docs/utnp/screens/`에 만듭니다. 로컬 Supabase RPC 시험은 `UTNP_SUPABASE_URL`과 `UTNP_SUPABASE_ANON_KEY` 환경변수를 넘겨 `node tools/utnp_smoke.mjs --rpc-only`를 실행합니다. 이 모드는 로컬 DB에 시험용 이벤트를 만들고 종료 때 삭제합니다.
