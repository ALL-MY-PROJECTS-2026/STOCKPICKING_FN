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

export function Badge({ kind = "mut", dot, children }) {
  return <span className={`badge ${kind} ${dot ? "dot" : ""}`}>{children}</span>;
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
