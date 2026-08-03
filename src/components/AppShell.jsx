import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { apiGet } from "../api.js";
import { pct, dir, arrow, won } from "../lib/format.js";
import SearchBox from "./SearchBox.jsx";
import ConnectionBanner from "./ConnectionBanner.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

const NAV = [
  { sec: "오늘" },
  { to: "/", icon: "sparkles", label: "발굴 대시보드", end: true },
  { to: "/brief", icon: "news", label: "데일리 브리핑" },
  { to: "/next-day", icon: "report-analytics", label: "다음날 브리핑" },
  { to: "/calendar", icon: "calendar-month", label: "이벤트 캘린더" },
  { sec: "발굴" },
  { to: "/themes", icon: "flame", label: "테마 로테이션" },
  { to: "/rebound", icon: "trending-up", label: "반등 후보" },
  { to: "/flow", icon: "wave-sine", label: "수급·돌파" },
  { to: "/sectors", icon: "arrows-exchange", label: "섹터 자금흐름" },
  { to: "/value", icon: "diamond", label: "가치주" },
  { to: "/alpha", icon: "chart-arrows", label: "알파 팩터 픽" },
  { to: "/auto", icon: "bolt", label: "자동 픽" },
  { sec: "신호" },
  { to: "/consensus", icon: "layers-intersect", label: "신호 합치·주의" },
  { to: "/proposals", icon: "bulb", label: "발굴 제안" },
  { to: "/signals", icon: "shield-check", label: "신호 검증" },
  { to: "/etf", icon: "chart-candle", label: "ETF 순위" },
  { sec: "내 종목" },
  { to: "/bookmarks", icon: "star", label: "서버 선별 종목" },
  { to: "/my", icon: "bookmark", label: "내 관심종목" },
  { to: "/watchlist", icon: "eye", label: "자동 워치리스트" },
];

function IndexTicker() {
  const [idx, setIdx] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.hidden) return; // 백그라운드 탭에선 폴링 생략(성능)
      apiGet("/api/kr-indices").then((d) => { if (alive) setIdx(d); }).catch(() => {});
    };
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!idx) return null;
  return (
    <div className="tick-row">
      {["KOSPI", "KOSDAQ"].map((k) => {
        const o = idx[k]; if (!o) return null;
        const p = o.change_pct ?? 0;
        return (
          <div className="tick" key={k}>
            <span className="lbl">{k}</span>
            <b className="num">{won(Math.round(o.price))}</b>
            <span className={"chg num " + dir(p)}>{arrow(p)} {pct(p)}</span>
          </div>
        );
      })}
    </div>
  );
}

function LastUpdate({ top }) {
  const [u, setU] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => { if (document.hidden) return; apiGet("/api/last-update").then((d) => { if (alive) setU(d); }).catch(() => {}); };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!u) return null;
  // 오늘 갱신이면 시각만(HH:MM), 다른 날이면 MM-DD HH:MM — 한 줄 표시 위해 압축
  let when = "-";
  if (u.at) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    when = u.at.slice(0, 10) === today ? u.at.slice(11, 16) : u.at.slice(5, 16);
  } else if (u.date) {
    when = u.date;
  }
  return (
    <div className={"last-update" + (top ? " at-top" : "")} title={"SERVER 데이터 기준 " + (u.at || u.date || "")}>
      <i className="ti ti-refresh" aria-hidden="true" />
      <span>SERVER 업데이트 {when}{u.elapsed_min != null ? ` · ${u.elapsed_min}분 전` : ""}</span>
    </div>
  );
}

function VisitorCount() {
  const [c, setC] = useState(null);
  useEffect(() => {
    let alive = true;
    const apply = (counts) => {
      const v = counts && counts.total != null ? counts : (counts != null ? { total: counts } : null);
      if (v) setC(v);
    };
    const cached = sessionStorage.getItem("fn-visit-counts");
    if (sessionStorage.getItem("fn-visited") && cached) { try { apply(JSON.parse(cached)); } catch {} return; }
    // BN 에 접속 1회 기록(서버가 CF-IP 로 위치 로깅) + 기간별 카운트 수신. 실패해도 조용히.
    apiGet("/api/visit")
      .then((d) => {
        if (!alive || !d) return;
        const counts = d.counts || { total: d.count };
        apply(counts);
        sessionStorage.setItem("fn-visited", "1");
        sessionStorage.setItem("fn-visit-counts", JSON.stringify(counts));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!c) return null;
  const fmt = (v) => (v == null ? "-" : Number(v).toLocaleString("ko-KR"));
  const uip = c.unique_ip;
  const segs = [["오늘", c.today], ["주", c.week], ["월", c.month], ["누적", c.total]].filter(([, v]) => v != null);
  const tip = "접속 통계 (SERVER 기록)" + (uip ? ` · 고유IP 오늘 ${uip.today}/누적 ${uip.total}` : "");
  return (
    <div className="topstat" title={tip} aria-label={tip}>
      <i className="ti ti-users" aria-hidden="true" />
      {segs.map(([k, v]) => (<span className="ts-seg" key={k}>{k} <b className="num">{fmt(v)}</b></span>))}
    </div>
  );
}

const TITLES = {
  "/": ["발굴 대시보드", "오늘의 시장 국면 · 주도 테마 · 핵심 종목"],
  "/brief": ["데일리 브리핑", "11개 발굴 위젯 한 줄 종합"],
  "/next-day": ["다음날 증시 브리핑", "간밤 글로벌·수급·이벤트 종합 (사실 데이터 · 투자 권유 아님)"],
  "/calendar": ["이벤트 캘린더", "실적·배당·IPO·분할·공시·만기·거시 일정"],
  "/themes": ["테마 로테이션", "테마별 자금·열기·국면 흐름"],
  "/rebound": ["반등 발굴", "반등 · 급반등 · 낙폭우량"],
  "/flow": ["수급 · 돌파", "거래량 돌파 · 순매수 급증 · 매집"],
  "/sectors": ["섹터 자금흐름", "테마별 순매수 유입 · 유출"],
  "/value": ["가치주 발굴", "펀더멘털 · 매집 · 모멘텀 결합"],
  "/alpha": ["알파 팩터 픽", "알파 · 퀄리티 · 가치알파 팩터 랭킹"],
  "/auto": ["자동 픽", "자동 발굴 엔진 — 점수·세력·뉴스 종합"],
  "/consensus": ["신호 합치 · 주의", "다중 신호 겹침 · 과열 주의 종목"],
  "/proposals": ["발굴 제안", "다중 신호 기반 관심 제안 · 표시 전용"],
  "/bookmarks": ["서버 선별 종목", "운영 서버가 데이터 신호로 선별한 종목 — 시점 대비 수익률 추적 (참고용 · 투자 권유 아님)"],
  "/my": ["내 관심종목", "이 브라우저에 저장한 관심종목 (localStorage)"],
  "/watchlist": ["자동 워치리스트", "다중 신호·근거 기반 자동 선별"],
  "/etf": ["ETF 순위", "추세 · 자금 흐름 기준 ETF"],
  "/signals": ["신호 검증", "백테스트 · 신뢰도 · 캘리브레이션"],
  "/privacy": ["개인정보처리방침", "정보 제공 서비스 · 서버측 개인정보 미수집"],
  "/terms": ["이용약관", "정보 제공 목적 · 투자 권유 아님"],
};

export default function AppShell() {
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("fn-theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fn-theme", theme);
  }, [theme]);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const [title, sub] = TITLES[loc.pathname] || ["StockPicking", ""];
  useEffect(() => {
    // 라우트별 SEO 메타 동적 갱신 — 제목·설명·OG·canonical (정적 SPA 내 클라이언트 갱신)
    document.title = `${title} · StockPicking`;
    const desc = (sub ? sub + " — " : "") + "국내주식 공개·사실 데이터 정보 (투자 권유 아님)";
    const base = "https://all-my-projects-2026.github.io/STOCKPICKING_FN/";
    const url = base + (loc.pathname && loc.pathname !== "/" ? "#" + loc.pathname : "");
    const setMeta = (sel, attr, val) => {
      let el = document.head.querySelector(sel);
      if (!el) { el = document.createElement("meta"); const [k, v] = attr; el.setAttribute(k, v); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    setMeta('meta[name="description"]', ["name", "description"], desc);
    setMeta('meta[property="og:title"]', ["property", "og:title"], `${title} · StockPicking`);
    setMeta('meta[property="og:description"]', ["property", "og:description"], desc);
    setMeta('meta[property="og:url"]', ["property", "og:url"], url);
    let canon = document.head.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.setAttribute("rel", "canonical"); document.head.appendChild(canon); }
    canon.setAttribute("href", url);
  }, [title, sub, loc.pathname]);

  return (
    <div className={"app" + (open ? " nav-open" : "")}>
      <div className="scrim" onClick={() => setOpen(false)} />
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3"  y="13" width="4" height="8"  rx="1" fill="currentColor" opacity=".45" />
              <rect x="10" y="8"  width="4" height="13" rx="1" fill="currentColor" opacity=".72" />
              <rect x="17" y="3"  width="4" height="18" rx="1" fill="currentColor" />
            </svg>
          </div>
          <div className="brand-txt"><b>StockPicking</b><span>국내주식 발굴</span></div>
        </div>
        <LastUpdate top />
        {NAV.map((n, i) =>
          n.sec ? (
            <div className="nav-sec" key={"s" + i}>{n.sec}</div>
          ) : (
            <NavLink key={n.to} to={n.to} end={n.end}
              title={(TITLES[n.to] && TITLES[n.to][1]) || n.label}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <i className={"ti ti-" + n.icon} aria-hidden="true" />{n.label}
            </NavLink>
          )
        )}
        <div className="sidebar-foot">
          <div className="nav-item" role="button" tabIndex={0}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTheme(theme === "dark" ? "light" : "dark"); } }}>
            <i className={"ti ti-" + (theme === "dark" ? "sun" : "moon")} aria-hidden="true" />
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="notice-strip"><i className="ti ti-info-circle" aria-hidden="true" /> 임시 공개중입니다 · 추후 인증 기능 추가 예정</div>
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setOpen(true)} aria-label="메뉴 열기" aria-expanded={open}><i className="ti ti-menu-2" aria-hidden="true" /></button>
          <div>
            <h1>{title}</h1>
            <div className="sub">{sub}</div>
          </div>
          <VisitorCount />
          <SearchBox />
          <IndexTicker />
        </header>
        <ConnectionBanner />
        <main className="content"><ErrorBoundary key={loc.pathname}><Outlet /></ErrorBoundary></main>
        <footer className="site-foot">
          <p className="foot-disc">
            <i className="ti ti-info-circle" aria-hidden="true" />
            본 서비스는 공개·사실 데이터를 <b>정보 제공 목적</b>으로 표시합니다. 특정 종목의 매매를 권유하거나 투자자문을 제공하지 않으며, <b>모든 투자 판단과 책임은 이용자 본인</b>에게 있습니다. 데이터는 지연·오류가 있을 수 있고 과거 성과는 미래를 보장하지 않습니다.
          </p>
          <div className="foot-links">
            <NavLink to="/privacy">개인정보처리방침</NavLink>
            <span aria-hidden="true">·</span>
            <NavLink to="/terms">이용약관</NavLink>
            <span className="foot-copy">© {new Date().getFullYear()} StockPicking · 국내주식 발굴 정보</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
