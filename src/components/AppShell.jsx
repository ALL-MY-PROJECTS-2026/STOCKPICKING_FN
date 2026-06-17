import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { apiGet } from "../api.js";
import { pct, dir, arrow, won } from "../lib/format.js";

const NAV = [
  { sec: "발굴" },
  { to: "/", icon: "sparkles", label: "발굴 대시보드", end: true },
  { to: "/brief", icon: "news", label: "데일리 브리핑" },
  { to: "/themes", icon: "flame", label: "테마 로테이션" },
  { to: "/rebound", icon: "trending-up", label: "반등 후보" },
  { to: "/flow", icon: "wave-sine", label: "수급·돌파" },
  { to: "/sectors", icon: "arrows-exchange", label: "섹터 자금흐름" },
  { to: "/value", icon: "diamond", label: "가치주" },
  { to: "/bookmarks", icon: "star", label: "북마크" },
  { sec: "분석" },
  { to: "/etf", icon: "chart-candle", label: "ETF 순위" },
  { to: "/signals", icon: "shield-check", label: "신호 검증" },
  { sec: "운영" },
  { to: "/schedule", icon: "clock-play", label: "스케쥴러" },
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

const TITLES = {
  "/": ["발굴 대시보드", "오늘의 시장 국면 · 주도 테마 · 핵심 종목"],
  "/brief": ["데일리 브리핑", "11개 발굴 위젯 한 줄 종합"],
  "/themes": ["테마 로테이션", "테마별 자금·열기·국면 흐름"],
  "/rebound": ["반등 후보", "낙폭 과대 + 수급 유입 종목"],
  "/flow": ["수급 · 돌파", "거래량 돌파 · 순매수 급증 · 매집"],
  "/sectors": ["섹터 자금흐름", "테마별 순매수 유입 · 유출"],
  "/value": ["가치주 발굴", "펀더멘털 · 매집 · 모멘텀 결합"],
  "/bookmarks": ["북마크 / 관심종목", "북마크 시점 대비 수익률 추적"],
  "/etf": ["ETF 순위", "추세 · 자금 흐름 기준 ETF"],
  "/signals": ["신호 검증", "백테스트 · 신뢰도 · 캘리브레이션"],
  "/schedule": ["자동 분석 스케쥴러", "예약 실행 · 수행 로그"],
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
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <i className={"ti ti-" + n.icon} />{n.label}
            </NavLink>
          )
        )}
        <div className="sidebar-foot">
          <div className="nav-item" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <i className={"ti ti-" + (theme === "dark" ? "sun" : "moon")} />
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setOpen(true)}><i className="ti ti-menu-2" /></button>
          <div>
            <h1>{title}</h1>
            <div className="sub">{sub}</div>
          </div>
          <IndexTicker />
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
