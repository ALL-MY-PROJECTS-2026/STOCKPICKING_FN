import { pct, dir, arrow, scoreClass, fixed } from "../lib/format.js";

export function SectionHd({ icon, title, desc, count, right }) {
  return (
    <div className="section-hd">
      {icon && <div className="ico"><i className={"ti ti-" + icon} /></div>}
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
  return <span className={"score " + scoreClass(v)}><i className="ti ti-bolt" />{fixed(v, 1)}</span>;
}

export function Heat({ v }) {
  return <div className="heat"><i style={{ width: Math.max(2, Math.min(100, v)) + "%" }} /></div>;
}

export function Skeletons({ n = 8, cls = "sk-card" }) {
  return Array.from({ length: n }).map((_, i) => <div key={i} className={"sk " + cls} />);
}

export function Empty({ icon = "mood-empty", children }) {
  return <div className="empty"><i className={"ti ti-" + icon} />{children || "데이터 없음"}</div>;
}

export function ErrBox({ children, onRetry }) {
  return (
    <div className="err-box">
      <i className="ti ti-alert-triangle" /> {children}
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
