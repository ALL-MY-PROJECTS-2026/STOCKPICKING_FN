# STOCKPICKING_FN — 국내주식 발굴 대시보드 (Frontend) · 작업지시서

> **React 19 + Vite/esbuild** 단일 페이지 앱. 백엔드(BN, FastAPI REST)를 **HTTP(JSON)로만** 호출하는 **완전 독립** 프론트엔드. BN과 별도 저장소로 운영된다.
> BN 저장소: `STOCKPICKING_BN`

---

## 1. 목적 / 원칙
- 국내주식 **발굴·분석 데이터 시각화** (매매 기능 없음 — 발굴 전용).
- **FN ↔ BN 완전 분리**: FN은 BN의 어떤 파일/모듈도 import 하지 않는다. **REST 통신만.** BN 위치는 `BN_BASE` 한 곳으로 주입 → 로컬·사내망·외부(Cloudflare) 어디든 연결 가능.
- **현대 트렌드 UI/UX**: 라이트 기본(다크 토글), **색상 그라데이션 미사용**, border-radius 최소(각진 모던 룩), 반응형(모바일 오프캔버스), 한국 관례 색상(**상승=빨강 / 하락=파랑**).

## 2. 기술 스택
- React 19 · react-router-dom 7 (HashRouter) · esbuild 번들(`build.mjs`)
- Pretendard 폰트 · Tabler Icons (CDN)
- 상태/데이터: 자체 `useApi` 훅 (외부 상태관리 없음)

## 3. 실행
```bash
cp .env.sample .env        # BN_BASE=https://<BN-도메인> (비우면 localhost:8000)
node build.mjs             # esbuild 번들 → dist/ (BN_BASE 빌드 주입)
python -m http.server 5174 -d dist   # 정적 서빙 (또는 임의 정적 호스팅/Cloudflare Pages)
```
`npm run dev`(vite)도 가능하나 본 환경에선 `node build.mjs` 경로를 표준으로 한다(한글경로 rollup 이슈 회피).

## 4. BN 연결 (우선순위)
`?bn=` 쿼리 > `window.__BN_BASE` > `FN/.env` 의 `BN_BASE`(빌드 주입) > `http://localhost:8000`
- 설정은 **`.env.sample` → `.env`** 한 곳(`BN_BASE`)뿐. `build.mjs` 가 `__BN_BASE__` 로 주입.

### Cloudflare 외부 연결 (사설망 BN ↔ 외부 FN)
BN 은 사설망에 있어도 Cloudflare 터널로 외부 HTTPS 주소를 발급할 수 있다. **BN 서버에서 터널을 켜고 받은 URL 을 FN `.env` 의 `BN_BASE` 에 넣으면** 외부 어디서든 FN 이 그 BN 에 연결된다.

1) **BN 서버에서** 터널 시작 + URL 발급 (인증 `admin:<DASHBOARD_PASS>`):
```bash
curl -u admin:<PASS> -X POST "http://localhost:8000/api/tunnel/start"
# → { "url":"https://xxxx.trycloudflare.com",
#     "fn_env":"BN_BASE=https://xxxx.trycloudflare.com", "ready":true }
```
2) 응답의 **`fn_env`** 한 줄을 FN `.env` 에 그대로 붙여넣기 → `node build.mjs` 재빌드.
3) URL 재확인: `GET /api/tunnel/url` · 중지: `POST /api/tunnel/stop`
- **named 터널**(고정 도메인): BN `.env` 에 `CF_TUNNEL_TOKEN`/`CF_TUNNEL_HOSTNAME` 설정 시 재시작해도 URL 동일.
- 매매/보유주 API 는 Cloudflare 외부에서 자동 차단(발굴 데이터만 노출).

## 5. 구조
```
src/
  api.js                REST 클라이언트 (BN_BASE 결정 + apiGet/apiSend[Basic 인증])
  lib/
    useApi.js           GET 훅 (data/loading/error/reload)
    format.js           숫자·통화·등락·점수 포맷 (상승빨강/하락파랑)
  components/
    AppShell.jsx        사이드바 + 토픽바(KOSPI/KOSDAQ 티커) + 테마토글 + 라우팅
    StockCard.jsx       종목 카드(공용) — 클릭 시 상세 모달
    DetailModal.jsx     종목 상세 모달 + Context(useDetail)
    ui.jsx              SectionHd·ChangePill·Score·Heat·Badge·Skeleton·Empty·Segmented
  pages/
    Discover.jsx        발굴 대시보드(국면·통계·핵심픽·가치주·반등)
    ThemesPage.jsx      테마 로테이션
    ReboundPage.jsx     반등 후보
    ValuePage.jsx       가치주
    BookmarkPage.jsx    북마크/관심종목(수익률 추적)
    EtfPage.jsx         ETF 순위
    SignalsPage.jsx     신호 검증(신뢰도 게이지 + 가치팩터 랭킹)
    SchedulePage.jsx    스케쥴러(상태·로그) + MySQL 적재 패널
  theme.css             디자인 시스템 (라이트 기본/다크 토글, 그라데이션 미사용)
index.html              무플래시 테마 인라인 스크립트(기본 라이트)
build.mjs               esbuild 번들러 (BN_BASE 주입)
```

## 6. 페이지 / 기능
| 라우트 | 내용 |
|---|---|
| `/` 발굴 대시보드 | 시장국면 배너 + 통계 + 핵심픽/가치주/반등 카드 |
| `/themes` | 테마별 heat·국면·평균등락·리더 |
| `/rebound` | 낙폭·순매수·ROE·거래량 |
| `/value` | ROE·PER·PBR·매집 |
| `/bookmarks` | 북마크 시점 대비 수익률·α·재무 + 별 토글/해제 |
| `/etf` | 그룹별 ETF 랭킹 테이블 |
| `/signals` | 신뢰도 게이지 + 가치 팩터 Z랭킹 |
| `/schedule` | 자동분석 스케쥴러(상태·진행바·로그) + **MySQL 전체종목 적재 패널** |

### 종목 상세 모달 (카드/행 클릭)
- 예측 신호(매수/관망/매도) + 신뢰도, 예상 등락/가격, 종합점수
- 긍정/부정 근거
- **투자자 동향**: 외국인/기관/개인 순매수 막대 (`/api/stock-detail`)
- **재무제표**: 매출·영업이익·영업이익률·부채비율·ROE·순이익·등급·신호
- **대량보유(5%+)**: 국민연금 등 기관 보유 (DART)
- 지표(세력·뉴스급등·거래량Z·52주거리…) + 툴팁(help 아이콘) + 북마크 별

## 7. 사용 BN 엔드포인트 (전부 GET, 매매 없음)
`/api/top-picks` `/api/value-picks` `/api/rebound` `/api/theme-rotation`
`/api/market-regime` `/api/kr-indices` `/api/etf-rank` `/api/signal-trust`
`/api/validation` `/api/bookmark-value` `/api/predict/{code}` `/api/stock-detail/{code}`
`/api/schedule`·`/api/run-status`·`/api/run-log`·`/api/run-now`·`/api/bookmarks`(POST 인증)
`/api/mysql/status`·`/api/mysql/collect`(POST 인증)

## 8. 작업 요구사항 종합 (이력)
1. BN(REST)에서 FN(UI) 분리 → 비동기 REST 요청/응답. **추후 git 저장소 각각 분리**(본 분리 완료).
2. 원본 대시보드 iframe 재현 → **모던 트렌드 UI/UX 전면 개편**(React 네이티브 재구축).
3. **라이트 기본 모드**, **border-radius 최소화**, **색상 그라데이션 제거**.
4. 로고 심플화(미니멀 상승바 SVG).
5. 카드 클릭 → **상세 모달**(내용 충실): 재무제표, **외국인/기관/개인 매매동향**, 국민연금 등 대량보유, 툴팁.
6. **북마크 페이지** 추가.
7. 외부접속: FN은 외부에서 BN(Cloudflare)로 데이터 수신, `.env`에 BN 경로 등록.

## 9. 향후 작업(백로그)
- 상세 모달 가격 차트(`/api/historical/{code}` 복구됨 — chart.js 연동)
- 과거 예측 적중 이력 표시
- 페이지별 반응형 3뷰포트 회귀 자동화(Playwright)
