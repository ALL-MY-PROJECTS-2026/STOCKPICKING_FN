import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { apiGet } from "../api.js";
import { pct, dir, arrow, won } from "../lib/format.js";
import SearchBox from "./SearchBox.jsx";
import ConnectionBanner from "./ConnectionBanner.jsx";

const NAV = [
  { sec: "발굴" },
  { to: "/", icon: "sparkles", label: "발굴 대시보드", end: true },
  { to: "/brief", icon: "news", label: "데일리 브리핑" },
  { to: "/themes", icon: "flame", label: "테마 로테이션" },
  { to: "/rebound", icon: "trending-up", label: "반등 후보" },
  { to: "/flow", icon: "wave-sine", label: "수급·돌파" },
  { to: "/sectors", icon: "arrows-exchange", label: "섹터 자금흐름" },
  { to: "/value", icon: "diamond", label: "가치주" },
  { to: "/alpha", icon: "chart-arrows", label: "알파 팩터 픽" },
  { to: "/auto", icon: "bolt", label: "자동 픽" },
  { to: "/consensus", icon: "layers-intersect", label: "신호 합치·주의" },
  { to: "/proposals", icon: "bulb", label: "발굴 제안" },
  { to: "/bookmarks", icon: "star", label: "북마크 (SERVER)" },
  { to: "/my", icon: "bookmark", label: "나의 북마크" },
  { to: "/watchlist", icon: "eye", label: "자동 관심종목" },
  { sec: "분석" },
  { to: "/etf", icon: "chart-candle", label: "ETF 순위" },
  { to: "/signals", icon: "shield-check", label: "신호 검증" },
];

function IndexTicker() {
  const [idx, setIdx] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      apiGet("/api/kr-indices").then((d) => { if (alive) setIdx(d); }).catch(() => {});
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

function LastUpdate() {
  const [u, setU] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => apiGet("/api/last-update").then((d) => { if (alive) setU(d); }).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!u) return null;
  const when = u.at ? u.at.slice(5, 16) : u.date || "-";
  return (
    <div className="last-update" title={"SERVER 데이터 기준 " + (u.at || u.date || "")}>
      <i className="ti ti-refresh" aria-hidden="true" />
      <span>SERVER 업데이트 {when}{u.elapsed_min != null ? ` · ${u.elapsed_min}분 전` : ""}</span>
    </div>
  );
}

function VisitorCount() {
  const [n, setN] = useState(null);
  useEffect(() => {
    let alive = true;
    const cached = sessionStorage.getItem("fn-visits");
    if (sessionStorage.getItem("fn-visited") && cached) { setN(Number(cached)); return; }
    // BN 에 접속 1회 기록(서버가 CF-IP 로 위치 로깅) + 누적 카운트 수신. 실패해도 조용히.
    apiGet("/api/visit")
      .then((d) => {
        if (alive && d && d.count != null) {
          setN(d.count);
          sessionStorage.setItem("fn-visited", "1");
          sessionStorage.setItem("fn-visits", String(d.count));
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  if (n == null) return null;
  return (
    <div className="topstat" title="누적 접속 수 (SERVER 기록)">
      <i className="ti ti-users" aria-hidden="true" />
      <b className="num">{n.toLocaleString("ko-KR")}</b><span>누적 접속</span>
    </div>
  );
}

const TITLES = {
  "/": ["발굴 대시보드", "오늘의 시장 국면 · 주도 테마 · 핵심 종목"],
  "/brief": ["데일리 브리핑", "11개 발굴 위젯 한 줄 종합"],
  "/themes": ["테마 로테이션", "테마별 자금·열기·국면 흐름"],
  "/rebound": ["반등 발굴", "반등 · 급반등 · 낙폭우량"],
  "/flow": ["수급 · 돌파", "거래량 돌파 · 순매수 급증 · 매집"],
  "/sectors": ["섹터 자금흐름", "테마별 순매수 유입 · 유출"],
  "/value": ["가치주 발굴", "펀더멘털 · 매집 · 모멘텀 결합"],
  "/alpha": ["알파 팩터 픽", "알파 · 퀄리티 · 가치알파 팩터 랭킹"],
  "/auto": ["자동 픽", "자동 발굴 엔진 — 점수·세력·뉴스 종합"],
  "/consensus": ["신호 합치 · 주의", "다중 신호 겹침 · 과열 주의 종목"],
  "/proposals": ["발굴 제안", "다중 신호 기반 관심 제안 · 표시 전용"],
  "/bookmarks": ["북마크 (SERVER)", "SERVER 북마크 시점 대비 수익률 추적"],
  "/my": ["나의 북마크", "이 브라우저에 저장한 관심종목"],
  "/watchlist": ["자동 관심종목", "다중 신호·근거 기반 자동 선별"],
  "/etf": ["ETF 순위", "추세 · 자금 흐름 기준 ETF"],
  "/signals": ["신호 검증", "백테스트 · 신뢰도 · 캘리브레이션"],
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
        {NAV.map((n, i) =>
          n.sec ? (
            <div className="nav-sec" key={"s" + i}>{n.sec}</div>
          ) : (
            <NavLink key={n.to} to={n.to} end={n.end}
              title={(TITLES[n.to] && TITLES[n.to][1]) || n.label}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <i className={"ti ti-" + n.icon} />{n.label}
            </NavLink>
          )
        )}
        <div className="sidebar-foot">
          <LastUpdate />
          <div className="nav-item" role="button" tabIndex={0}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTheme(theme === "dark" ? "light" : "dark"); } }}>
            <i className={"ti ti-" + (theme === "dark" ? "sun" : "moon")} />
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setOpen(true)} aria-label="메뉴 열기" aria-expanded={open}><i className="ti ti-menu-2" /></button>
          <div>
            <h1>{title}</h1>
            <div className="sub">{sub}</div>
          </div>
          <VisitorCount />
          <SearchBox />
          <IndexTicker />
        </header>
        <ConnectionBanner />
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
