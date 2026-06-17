# STOCKPICKING_FN — 국내주식 발굴 대시보드 (Frontend) · 작업지시서

> **React 19 + Vite/esbuild** 단일 페이지 앱. 백엔드(BN, FastAPI REST)를 **HTTP(JSON)로만** 호출하는 **완전 독립** 프론트엔드. BN과 별도 저장소로 운영된다.
> BN 저장소: [`STOCKPICKING_BN`](https://github.com/ALL-MY-PROJECTS-2026/STOCKPICKING_BN)

---

## 프로젝트 문서 (클릭하면 이동)

| 문서 | 내용 |
|---|---|
| [README](README.md) | 본 문서 — 프로젝트 개요 · 실행 · 구조 · 페이지/엔드포인트 |
| [명령프롬프트](명령프롬프트.md) | UI 전면개선 **루프 작업 기준 문서** (매 루프 이 문서 기준으로 진행) |
| [작업보고](작업보고.md) | 작업 **완료 체크리스트 / 진행 로그** |

**라이브 사이트**: https://all-my-projects-2026.github.io/STOCKPICKING_FN/

---

## 1. 목적 / 원칙
- 국내주식 **발굴·분석 데이터 시각화** (매매 기능 없음 — 발굴 전용).
- **FN BN 완전 분리**: FN은 BN의 어떤 파일/모듈도 import 하지 않는다. **REST 통신만.** BN 위치는 `BN_BASE` 한 곳으로 주입 로컬·사내망·외부(Cloudflare) 어디든 연결 가능.
- **현대 트렌드 UI/UX**: 라이트 기본(다크 토글), **색상 그라데이션 미사용**, border-radius 최소(각진 모던 룩), 반응형(모바일 오프캔버스), 한국 관례 색상(**상승=빨강 / 하락=파랑**).

## 2. 기술 스택
- React 19 · react-router-dom 7 (HashRouter) · esbuild 번들(`build.mjs`)
- Pretendard 폰트 · Tabler Icons (CDN)
- 상태/데이터: 자체 `useApi` 훅 (외부 상태관리 없음)

## 3. 실행
```bash
cp .env.sample .env # BN_BASE=https://<BN-도메인> (비우면 localhost:8000)
node build.mjs # esbuild 번들 dist/ (BN_BASE 빌드 주입)
python -m http.server 5174 -d dist # 정적 서빙 (또는 임의 정적 호스팅/Cloudflare Pages)
```
`npm run dev`(vite)도 가능하나 본 환경에선 `node build.mjs` 경로를 표준으로 한다(한글경로 rollup 이슈 회피).

## 4. BN 연결 (우선순위)
`?bn=` 쿼리 > `window.__BN_BASE` > `FN/.env` 의 `BN_BASE`(빌드 주입) > `http://localhost:8000`
- 설정은 **`.env.sample` `.env`** 한 곳(`BN_BASE`)뿐. `build.mjs` 가 `__BN_BASE__` 로 주입.

### Cloudflare 외부 연결 (사설망 BN 외부 FN)
BN 은 사설망에 있어도 Cloudflare 터널로 외부 HTTPS 주소를 발급할 수 있다. **BN 서버에서 터널을 켜고 받은 URL 을 FN `.env` 의 `BN_BASE` 에 넣으면** 외부 어디서든 FN 이 그 BN 에 연결된다.

1) **BN 서버에서** 터널 시작 + URL 발급 (인증 `admin:<DASHBOARD_PASS>`):
```bash
curl -u admin:<PASS> -X POST "http://localhost:8000/api/tunnel/start"
# { "url":"https://xxxx.trycloudflare.com",
# "fn_env":"BN_BASE=https://xxxx.trycloudflare.com", "ready":true }
```
2) 응답의 **`fn_env`** 한 줄을 FN `.env` 에 그대로 붙여넣기 `node build.mjs` 재빌드.
3) URL 재확인: `GET /api/tunnel/url` · 중지: `POST /api/tunnel/stop`
- **named 터널**(고정 도메인): BN `.env` 에 `CF_TUNNEL_TOKEN`/`CF_TUNNEL_HOSTNAME` 설정 시 재시작해도 URL 동일.
- 매매/보유주 API 는 Cloudflare 외부에서 자동 차단(발굴 데이터만 노출).

### GitHub Pages(github.io) 배포 + BN CORS
FN 은 정적 빌드라 **GitHub Pages 로 호스팅** 가능하다. HashRouter 라 서버 rewrite 불필요, 에셋은 상대경로(`assets/...`)라 프로젝트 서브패스(`/STOCKPICKING_FN/`)에서도 동작한다.

1) **BN(Cloudflare HTTPS)** 가 떠 있어야 한다(github.io=HTTPS BN=HTTPS, 혼합콘텐츠 없음).
2) **BN CORS**: `*.github.io` 는 기본 허용된다(BN `CORS_ORIGIN_REGEX`). 좁히려면 BN `.env` 에
 `BN_CORS_REGEX=https://all-my-projects-2026\.github\.io`.
3) **배포(자동)**: `.github/workflows/pages.yml` 가 push 시 빌드Pages 배포.
 - repo **Settings > Pages > Source = GitHub Actions**
 - repo **Settings > Variables > Actions** 에 `BN_BASE = https://<BN-Cloudflare-도메인>` 등록
 (빌드 시 주입). 미설정이면 런타임에 `?bn=https://...` 로도 지정 가능.
 - **자동 등록**: BN 을 `BN_AUTOTUNNEL=1` + `FN_REPO`/`GH_PAT` 로 띄우면, BN 부팅 시
 터널 URL 이 이 `BN_BASE` 변수에 자동 반영되고 본 워크플로가 자동 재빌드한다(BN README 참고).
4) 결과 URL 예: `https://all-my-projects-2026.github.io/STOCKPICKING_FN/`

## 5. 구조
```
src/
 api.js          REST 클라이언트 (BN_BASE 결정 + apiGet) — GET 전용·인증 없음(보안)
 lib/
 useApi.js       GET 훅 (data/loading/error/reload)
 useListView.js  목록 필터+페이징 훅 (10개 초과 시 컨트롤 노출)
 myBookmarks.js  브라우저(localStorage) 북마크 (SERVER 와 별개)
 format.js       숫자·통화·등락·점수 포맷 + stripEmoji (상승빨강/하락파랑)
 components/
 AppShell.jsx    사이드바 + 상단바(검색·누적접속·KOSPI/KOSDAQ 티커) + 테마토글 + 라우팅
 SearchBox.jsx   전역 종목 검색(디바운스)
 ConnectionBanner.jsx  SERVER 다운 감지 배너
 MyBookmarkButton.jsx  브라우저 북마크 토글 버튼
 StockCard.jsx   종목 카드(공용) — 클릭 시 상세 모달
 DetailModal.jsx 상세 모달(예측·가격차트·AI·투자자·세력·재무·대량보유·목표가·출처링크)
 ui.jsx          SectionHd·ChangePill·Score·Heat·Badge·Skeleton·Empty·Segmented·ListControls
 pages/          Discover·DailyBrief·Themes·Rebound·Flow·SectorFlow·Value·Alpha·AutoPicks·
                 Consensus·Watchlist·Proposals·Bookmark·MyBookmarks·Etf·Signals
 theme.css       디자인 시스템 (라이트 기본/다크 토글, 각진 룩, 그라데이션 미사용)
index.html       무플래시 테마 인라인 스크립트(기본 라이트) + chart.js CDN
build.mjs        esbuild 번들러 (BN_BASE 주입)
```

## 6. 페이지 / 기능
| 라우트 | 내용 |
|---|---|
| `/` 발굴 대시보드 | 오늘의핵심(daily-brief) + 시장국면 + 통계 + 핵심픽/가치주/반등/급반등 |
| `/brief` 데일리 브리핑 | 헤드라인·자세·카운트·핵심픽·자금흐름·우량모멘텀/역발상 |
| `/themes` 테마 로테이션 | heat·국면·평균등락·수급·점수 (강등 안내) |
| `/rebound` 반등 발굴 | 3탭: 반등·급반등(tier엣지)·낙폭우량 |
| `/flow` 수급·돌파 | 거래량 돌파·수급 급증·매집 |
| `/sectors` 섹터 자금흐름 | 테마별 순매수 유입/유출 막대 |
| `/value` 가치주 | ROE·PER·PBR·매집 |
| `/alpha` 알파 팩터 픽 | 알파·퀄리티·가치알파(Segmented) |
| `/auto` 자동 픽 | 자동 발굴 엔진(점수·세력·뉴스) |
| `/consensus` 신호 합치·주의 | 다중신호 합치·주의 종목 |
| `/watchlist` 자동 관심종목 | 다중신호·근거·combo 티어 |
| `/proposals` 발굴 제안 | combo·확신·목표/손절·R/R (표시 전용) |
| `/bookmarks` 북마크 (SERVER) | 시점 대비 수익률·α·재무 (읽기 전용) |
| `/my` 나의 북마크 | 브라우저(localStorage) 관심종목 |
| `/etf` ETF 순위 | 그룹별 ETF 랭킹 |
| `/signals` 신호 검증 | 신뢰도·가치랭킹·전략백테스트·점수예측·반등검증·핵심픽실측·멀티윈도우 |

> 운영(스케쥴러·시스템 상태)·매매/보유주 화면은 FN 에서 비노출. 목록은 10개 초과 시 필터+페이징.

### 종목 상세 모달 (카드/행 클릭)
- 예측 신호(매수/관망/매도) + 신뢰도, 예상 등락/가격, 종합점수, 긍정/부정 근거
- **가격 추이**(`/api/historical`, chart.js) + **AI 차트 분석**(`/api/chart-ai`)
- **투자자 동향**(1일) + **세력 분석**(외국인/기관/개인 며칠째·누적규모·일별, `/api/force-detail`·force_flow)
- **재무제표**·**대량보유(5%+, DART)**·**애널리스트 목표가**(`/api/targets`)
- 각 섹션 근거 출처 링크(네이버 금융·DART·리포트 원문) + 툴팁 + 브라우저 북마크 버튼

## 7. 사용 BN 엔드포인트 (전부 GET, 매매 없음 · FN 은 읽기 전용)
발굴/픽: `/api/top-picks` `/api/value-picks` `/api/rebound` `/api/sharp-rebound` `/api/dip-quality`
`/api/alpha-picks` `/api/quality-picks` `/api/value-alpha` `/api/auto-picks` `/api/breakout`
`/api/supply-surge` `/api/accumulation` `/api/sector-flow` `/api/consensus` `/api/caution`
`/api/risk-warning` `/api/watchlist` `/api/proposals` `/api/theme-rotation` `/api/etf-rank` `/api/daily-brief`
시장/지표: `/api/market-regime` `/api/kr-indices` `/api/stock/search`
검증: `/api/signal-trust` `/api/validation` `/api/signal-backtest(-multi)` `/api/score-forward(-multi)`
`/api/rebound-walkforward` `/api/rebound-calibration` `/api/rebound-accuracy` `/api/rebound-multihorizon`
`/api/top-picks-validation` `/api/quality-validation`
종목상세: `/api/predict/{code}` `/api/stock-detail/{code}` `/api/historical/{code}` `/api/chart-ai/{code}`
`/api/force-detail/{code}` `/api/targets/{code}` · 북마크: `/api/bookmark-value` · 접속: `/api/visit`

## 8. 작업 요구사항 종합 (이력)
1. BN(REST)에서 FN(UI) 분리 비동기 REST 요청/응답. **추후 git 저장소 각각 분리**(본 분리 완료).
2. 원본 대시보드 iframe 재현 **모던 트렌드 UI/UX 전면 개편**(React 네이티브 재구축).
3. **라이트 기본 모드**, **border-radius 최소화**, **색상 그라데이션 제거**.
4. 로고 심플화(미니멀 상승바 SVG).
5. 카드 클릭 **상세 모달**(내용 충실): 재무제표, **외국인/기관/개인 매매동향**, 국민연금 등 대량보유, 툴팁.
6. **북마크 페이지** 추가.
7. 외부접속: FN은 외부에서 BN(Cloudflare)로 데이터 수신, `.env`에 BN 경로 등록.

## 9. 향후 작업(백로그)
- 상세 모달 가격 차트(`/api/historical/{code}` 복구됨 — chart.js 연동)
- 과거 예측 적중 이력 표시
- 페이지별 반응형 3뷰포트 회귀 자동화(Playwright)
