import { won } from "../lib/format.js";
import { Score, Heat, ChangePill } from "./ui.jsx";
import { useDetail } from "./DetailModal.jsx";

/**
 * 종목 카드 — top-picks / value-picks / rebound 공용.
 * metrics: [{k, v}] 하단 지표. heat/score 옵션.
 * 클릭 시 상세 모달(useDetail). onClick 으로 동작 override 가능.
 */
export default function StockCard({ s, score, heat, metrics = [], badge, onClick }) {
  const { open } = useDetail();
  return (
    <div className="card scard" onClick={onClick || (() => open(s))}>
      <div className="scard-top">
        <div style={{ minWidth: 0 }}>
          <div className="nm" title={s.name}>{s.name}</div>
          <div className="code num">{s.code}</div>
        </div>
        {s.theme && <span className="theme-tag">{s.theme}</span>}
      </div>

      <div className="scard-price">
        <span className="p num">{won(s.price)}</span>
        <ChangePill v={s.change} />
        {badge}
      </div>

      {heat != null && <Heat v={heat} />}

      <div className="scard-metrics">
        {score != null && <span>점수 <Score v={score} /></span>}
        {metrics.map((m, i) => (
          <span key={i}>{m.k} <b className="num" style={m.cls ? { color: `var(--${m.cls})` } : null}>{m.v}</b></span>
        ))}
      </div>
    </div>
  );
}
