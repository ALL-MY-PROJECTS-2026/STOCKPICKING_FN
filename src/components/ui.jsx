import { useRef, useState, useEffect } from "react";
import { pct, dir, arrow, scoreClass, fixed } from "../lib/format.js";

/**
 * 뷰포트 진입 시에만 children 을 마운트(=지연 fetch). 진입 전엔 높이 확보용 스켈레톤.
 * 화면 하단 섹션의 useApi 가 초기에 한꺼번에 발사되는 것을 방지(성능).
 */
export function LazyMount({ minHeight = 140, children }) {
  const ref = useRef(null);
  const [show, setShow] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    let done = false;
    const reveal = () => { if (!done) { done = true; cleanup(); setShow(true); } };
    let io;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) reveal();
      }, { rootMargin: "300px" });
      io.observe(el);
    }
    // 안전망: IO 미발화 환경(일부 헤드리스/비페인트) 대비 — 스크롤 근접 + idle 타임아웃에도 노출해 콘텐츠가 영영 숨지 않게.
    const onScroll = () => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight + 300) reveal(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = setTimeout(reveal, 2500);
    function cleanup() { if (io) io.disconnect(); window.removeEventListener("scroll", onScroll); clearTimeout(t); }
    return cleanup;
  }, [show]);
  return (
    <div ref={ref}>
      {show ? children : <div className="sk" style={{ height: minHeight, borderRadius: "var(--r)" }} />}
    </div>
  );
}

export function SectionHd({ icon, title, desc, count, right }) {
  return (
    <div className="section-hd">
      {icon && <div className="ico"><i className={"ti ti-" + icon} aria-hidden="true" /></div>}
      <h2>{title}</h2>
      {count != null && <span className="count-chip">{count}</span>}
      {desc && <span className="desc">{desc}</span>}
      {right && <div className="right">{right}</div>}
    </div>
  );
}

export function ChangePill({ v, pill = true }) {
  const d = dir(v);
  return (
    <span className={`chg ${pill ? "chg-pill " : ""}${d}`}>
      {arrow(v)} {pct(v)}
    </span>
  );
}

export function Score({ v }) {
  return <span className={"score " + scoreClass(v)}><i className="ti ti-bolt" aria-hidden="true" />{fixed(v, 1)}</span>;
}

export function Heat({ v }) {
  return <div className="heat"><i style={{ width: Math.max(2, Math.min(100, v)) + "%" }} /></div>;
}

export function Skeletons({ n = 8, cls = "sk-card" }) {
  return Array.from({ length: n }).map((_, i) => <div key={i} className={"sk " + cls} />);
}

export function Empty({ icon = "mood-empty", children }) {
  return <div className="empty"><i className={"ti ti-" + icon} aria-hidden="true" />{children || "데이터 없음"}</div>;
}

export function ErrBox({ children, onRetry }) {
  return (
    <div className="err-box">
      <i className="ti ti-alert-triangle" aria-hidden="true" /> {children}
      {onRetry && <button className="btn" style={{ marginLeft: 12 }} onClick={onRetry}>다시 시도</button>}
    </div>
  );
}

export function Badge({ kind = "mut", dot, children, title }) {
  return <span className={`badge ${kind} ${dot ? "dot" : ""}`} title={title}>{children}</span>;
}

/** 목록 필터/페이징 컨트롤 — useListView 결과를 받는다. enabled(>10)일 때만 표시. */
export function ListControls({ view }) {
  if (!view || !view.enabled) return null;
  const { q, setQ, page, setPage, pages, total } = view;
  return (
    <div className="listctl">
      <div className="lc-search">
        <i className="ti ti-search" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·코드·테마 필터" aria-label="목록 필터" />
        {q && <button className="lc-clear" onClick={() => setQ("")} aria-label="지우기"><i className="ti ti-x" /></button>}
      </div>
      <div className="lc-pager">
        <span className="lc-total num">{total}개</span>
        <button className="btn" disabled={page <= 0} onClick={() => setPage(page - 1)} aria-label="이전"><i className="ti ti-chevron-left" /></button>
        <span className="num lc-page">{page + 1}/{pages}</span>
        <button className="btn" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="다음"><i className="ti ti-chevron-right" /></button>
      </div>
    </div>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
