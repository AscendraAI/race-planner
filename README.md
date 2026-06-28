# 레이스 플래너 (Race Planner)

러너·하이록스 선수를 위한 무료 웹 도구. 순수 정적 사이트(빌드 불필요).

- 라이브: https://raceplanner.online
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
