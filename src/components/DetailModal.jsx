import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../api.js";
import { won, pct, dir, arrow, fixed, wonShort, stripEmoji } from "../lib/format.js";
import { ChangePill, Badge } from "./ui.jsx";
import MyBookmarkButton from "./MyBookmarkButton.jsx";

const Ctx = createContext({ open: () => {} });
export const useDetail = () => useContext(Ctx);

const FEATURE_LABELS = {
  force_score: "세력 점수", fin_grade: "재무 등급", score: "종합 점수",
  news_surge_score: "뉴스 급등", volume_zscore: "거래량 Z", high52_dist_pct: "52주고점 거리",
  change_pct: "당일 등락", hold_ok: "보유 적합", beneficiary: "수혜주",
  roe: "ROE", per: "PER", pbr: "PBR", supply: "수급",
};
const TIPS = {
  force_score: "세력(기관·외국인) 수급 강도 점수", news_surge_score: "뉴스 기반 급등 가능성 점수",
  volume_zscore: "평소 대비 거래량 표준편차(σ). 높을수록 이례적 급증",
  high52_dist_pct: "현재가가 52주 최고가 대비 떨어진 정도",
  "투자자동향": "최근 1거래일 투자자별 순매수(억원). 양수=매수우위",
  "외국인": "외국인 순매수(억원)", "기관": "기관 순매수(억원)", "개인": "개인 순매수(억원)",
  "영업이익률": "영업이익 ÷ 매출. 높을수록 본업 수익성 우수",
  "부채비율": "부채 ÷ 자본. 낮을수록 재무 안정", "ROE": "자기자본이익률(순이익÷자본)",
  "공매도비중": "거래대금 중 공매도 비중(%)", "외국인소진율": "외국인 보유한도 대비 실제 보유 비율",
  "대량보유": "지분 5% 이상 보유자 공시(DART). 국민연금 등 기관 포함",
};

function fmtFeature(k, v) {
  if (typeof v === "boolean") return v ? "예" : "아니오";
  if (v == null) return "-";
  if (["change_pct", "high52_dist_pct"].includes(k)) return pct(v);
  if (k === "volume_zscore") return fixed(v, 1) + "σ";
  if (typeof v === "number") return fixed(v, 1);
  return String(v);
}
// 원 → 억 (부호 포함)
const toEok = (v) => {
  if (v == null || isNaN(v)) return "-";
  const e = Math.round(Number(v) / 1e8);
  return (e >= 0 ? "+" : "") + e.toLocaleString("ko-KR") + "억";
};

function Tip({ k, children }) {
  return <span className="k" title={TIPS[k] || undefined}>{children}{TIPS[k] && <i className="ti ti-help-circle help" />}</span>;
}

function InvestorFlow({ flow }) {
  if (!flow) return null;
  const rows = [["외국인", flow.foreign], ["기관", flow.institution], ["개인", flow.individual]];
  const max = Math.max(1, ...rows.map(([, v]) => Math.abs(v || 0)));
  return (
    <div className="sect">
      <div className="sect-hd"><i className="ti ti-users-group" /><Tip k="투자자동향">투자자 동향</Tip>
        <span className="sect-sub">최근 1거래일 순매수</span></div>
      <div className="flow">
        {rows.map(([label, v]) => {
          const d = dir(v); const w = Math.round((Math.abs(v || 0) / max) * 100);
          return (
            <div className="flow-row" key={label}>
              <span className="flow-lbl" title={TIPS[label]}>{label}</span>
              <div className="flow-track">
                <i className={"flow-bar " + d} style={{ width: Math.max(3, w) + "%" }} />
              </div>
              <b className={"num flow-val " + d} style={{ color: `var(--${d})` }}>{toEok(v)}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Financials({ fin, short, exh }) {
  const hasFin = fin && (fin.revenue || fin.op_margin != null);
  if (!hasFin && !short) return null;
  const cells = hasFin ? [
    ["매출", wonShort(fin.revenue), fin.revenue_yoy],
    ["영업이익", wonShort(fin.op_profit), fin.op_profit_yoy],
    ["영업이익률", fixed(fin.op_margin, 1) + "%", null, "영업이익률"],
    ["부채비율", fixed(fin.debt_ratio, 0) + "%", null, "부채비율"],
    ["ROE", fixed(fin.roe, 1) + "%", null, "ROE"],
    ["순이익", wonShort(fin.net_profit), null],
  ] : [];
  if (short) {
    cells.push(["공매도비중", fixed(short.short_ratio, 2) + "%", null, "공매도비중"]);
    if (exh?.exhaustion_rate != null) cells.push(["외국인소진율", fixed(exh.exhaustion_rate, 1) + "%", null, "외국인소진율"]);
  }
  return (
    <div className="sect">
      <div className="sect-hd"><i className="ti ti-report-money" />재무제표
        {fin?.fin_grade && <span className={"score s-" + (fin.fin_grade <= "B" ? "hi" : "md")} style={{ marginLeft: 6 }}>등급 {fin.fin_grade}</span>}
        {fin?.bsns_year && <span className="sect-sub">{fin.bsns_year}년</span>}</div>
      <div className="feat-grid">
        {cells.map(([k, v, yoy, tipKey], i) => (
          <div className="feat" key={i}>
            <span className="k" title={TIPS[tipKey] || undefined}>{k}{TIPS[tipKey] && <i className="ti ti-help-circle help" />}</span>
            <b className="num">{v}{yoy != null && <span className={"yoy " + dir(yoy)} style={{ color: `var(--${dir(yoy)})` }}> {arrow(yoy)}{Math.abs(yoy)}%</span>}</b>
          </div>
        ))}
      </div>
      {Array.isArray(fin?.fin_signals) && fin.fin_signals.length > 0 && (
        <div className="sig-chips">{fin.fin_signals.map((s, i) => <span className="sig-chip" key={i}>{stripEmoji(s)}</span>)}</div>
      )}
    </div>
  );
}

/** 가격 차트 — /api/historical (chart.js 전역 window.Chart, 상승빨강/하락파랑) */
function PriceChart({ bars }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.Chart || !Array.isArray(bars) || bars.length < 2) return;
    const css = getComputedStyle(document.documentElement);
    const up = bars[bars.length - 1].close >= bars[0].close;
    const col = (up ? css.getPropertyValue("--up") : css.getPropertyValue("--down")).trim() || "#888";
    const grid = css.getPropertyValue("--border-soft").trim() || "#eee";
    const muted = css.getPropertyValue("--muted").trim() || "#888";
    chartRef.current = new window.Chart(ref.current, {
      type: "line",
      data: {
        labels: bars.map((b) => b.date),
        datasets: [{ data: bars.map((b) => b.close), borderColor: col, borderWidth: 1.5,
          pointRadius: 0, pointHoverRadius: 3, fill: false, tension: 0.12 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => Number(c.parsed.y).toLocaleString("ko-KR") + "원" } },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 5, color: muted, font: { size: 10 } }, grid: { display: false } },
          y: { position: "right", ticks: { maxTicksLimit: 5, color: muted, font: { size: 10 },
            callback: (v) => (v >= 1e4 ? (v / 1e4).toFixed(0) + "만" : v) }, grid: { color: grid } },
        },
      },
    });
    return () => { chartRef.current && chartRef.current.destroy(); };
  }, [bars]);
  return <div style={{ height: 180 }}><canvas ref={ref} /></div>;
}

/** AI 차트 분석 — /api/chart-ai */
function ChartAI({ ai }) {
  if (!ai || (!ai.opinion && !ai.reasoning)) return null;
  const k = ai.opinion === "매수" ? "up" : ai.opinion === "매도" ? "down" : "mut";
  return (
    <div className="sect">
      <div className="sect-hd"><i className="ti ti-robot" />AI 차트 분석
        {ai.opinion && <span style={{ marginLeft: 6 }}><Badge kind={k} dot>{ai.opinion}</Badge></span>}
        {ai.confidence != null && <span className="sect-sub">신뢰도 {ai.confidence}%</span>}</div>
      {Array.isArray(ai.patterns) && ai.patterns.length > 0 && (
        <div className="sig-chips">{ai.patterns.map((p, i) => <span className="sig-chip" key={i}>{stripEmoji(p)}</span>)}</div>
      )}
      {ai.reasoning && <p style={{ margin: 0, fontSize: ".8rem", color: "var(--muted)", lineHeight: 1.5 }}>{stripEmoji(ai.reasoning)}</p>}
      {ai.analyzed_at && <span className="sect-sub" style={{ marginLeft: 0 }}>분석 {ai.analyzed_at}</span>}
    </div>
  );
}

function MajorHolders({ holders }) {
  if (!holders || holders.length === 0) return null;
  return (
    <div className="sect">
      <div className="sect-hd"><i className="ti ti-building-bank" /><Tip k="대량보유">대량보유 (5%+)</Tip>
        <span className="sect-sub">DART 공시</span></div>
      <div className="holders">
        {holders.map((h, i) => (
          <div className="holder" key={i}>
            <span className="hn">{stripEmoji(h.name)}{h.nps && <Badge kind="ok" dot>국민연금</Badge>}</span>
            <b className="num">{fixed(h.ratio, 2)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function Modal({ seed, onClose }) {
  const [d, setD] = useState(null);          // /api/predict
  const [det, setDet] = useState(null);      // /api/stock-detail
  const [hist, setHist] = useState(null);    // /api/historical
  const [ai, setAi] = useState(null);        // /api/chart-ai
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setDet(null); setHist(null); setAi(null);
    apiGet("/api/predict/" + seed.code)
      .then((r) => alive && setD(r))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    apiGet("/api/stock-detail/" + seed.code)
      .then((r) => alive && setDet(r))
      .catch(() => { });
    apiGet("/api/historical/" + seed.code)
      .then((r) => alive && setHist(r))
      .catch(() => { });
    apiGet("/api/chart-ai/" + seed.code)
      .then((r) => alive && setAi(r))
      .catch(() => { });
    return () => { alive = false; };
  }, [seed.code]);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const sigColor = d?.signal_color || "var(--primary)";
  const price = d?.current_price ?? seed.price;
  const feats = d?.features || {};

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-actions">
          <MyBookmarkButton stock={seed} size="lg" />
          <button className="icon-btn" onClick={onClose} aria-label="닫기"><i className="ti ti-x" /></button>
        </div>

        <div className="modal-hd">
          <div style={{ minWidth: 0 }}>
            <div className="modal-name">{seed.name || d?.name || det?.name}</div>
            <div className="code num" style={{ color: "var(--faint)" }}>
              {seed.code}{seed.theme ? " · " + seed.theme : ""}
            </div>
            {seed.bookmarked && <span style={{ marginTop: 6, display: "inline-block" }}><Badge kind="warn" dot>BN 북마크</Badge></span>}
          </div>
          <div className="modal-price">
            <div className="num" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{won(price)}</div>
            {seed.change != null && <ChangePill v={seed.change} />}
          </div>
        </div>

        {loading ? (
          <div className="modal-body"><div className="sk" style={{ height: 200 }} /></div>
        ) : error ? (
          <div className="modal-body"><div className="err-box">{error}</div></div>
        ) : (
          <div className="modal-body">
            <div className="signal-banner" style={{ borderColor: sigColor + "55", background: sigColor + "12" }}>
              <div>
                <div className="lbl">예측 신호 <span style={{ color: "var(--faint)", fontWeight: 400 }}>(1단계 룰)</span></div>
                <div className="sig" style={{ color: sigColor }}>{stripEmoji(d.signal_label || d.signal)}</div>
              </div>
              <div className="conf">
                <div className="conf-bar"><i style={{ width: (d.confidence || 0) + "%", background: sigColor }} /></div>
                <span className="num">신뢰도 {d.confidence ?? 0}%</span>
              </div>
            </div>

            <div className="est-grid">
              <div className="est"><span className="k">예상 등락</span>
                <b className={"num " + dir(d.estimated_change_pct)} style={{ color: `var(--${dir(d.estimated_change_pct)})` }}>
                  {arrow(d.estimated_change_pct)} {pct(d.estimated_change_pct)}</b></div>
              <div className="est"><span className="k">예상 가격</span><b className="num">{won(d.estimated_price)}</b></div>
              <div className="est"><span className="k">종합 점수</span><b className="num">{fixed(feats.score ?? d.score_raw, 1)}</b></div>
            </div>

            {Array.isArray(hist?.bars) && hist.bars.length > 1 && (
              <div className="sect">
                <div className="sect-hd"><i className="ti ti-chart-line" />가격 추이
                  <span className="sect-sub">최근 {hist.bars.length}일{hist.source ? " · " + hist.source : ""}</span></div>
                <PriceChart bars={hist.bars} />
              </div>
            )}
            <ChartAI ai={ai} />

            <div className="reasons">
              {(d.reasons_pos || []).length > 0 && (
                <div className="reason-col"><div className="reason-hd up"><i className="ti ti-circle-plus" /> 긍정 근거</div>
                  {d.reasons_pos.map((r, i) => <div key={i} className="reason-item"><i className="ti ti-point" />{stripEmoji(r)}</div>)}</div>)}
              {(d.reasons_neg || []).length > 0 && (
                <div className="reason-col"><div className="reason-hd down"><i className="ti ti-circle-minus" /> 부정 근거</div>
                  {d.reasons_neg.map((r, i) => <div key={i} className="reason-item"><i className="ti ti-point" />{stripEmoji(r)}</div>)}</div>)}
            </div>

            {/* 투자자 동향 · 재무제표 · 대량보유 (stock-detail) */}
            {det ? (
              <>
                <InvestorFlow flow={det.investor_flow} />
                <Financials fin={det.financials} short={det.short} exh={det.foreign_exhaustion} />
                <MajorHolders holders={det.major_holders} />
              </>
            ) : <div className="sk" style={{ height: 90 }} />}

            <div className="feat-grid">
              {Object.entries(feats).map(([k, v]) => (
                <div className="feat" key={k}>
                  <span className="k" title={TIPS[k] || undefined}>{FEATURE_LABELS[k] || k}{TIPS[k] && <i className="ti ti-help-circle help" />}</span>
                  <b className="num">{fmtFeature(k, v)}</b>
                </div>
              ))}
            </div>

            {d.disclaimer && <div className="disclaimer"><i className="ti ti-info-circle" /> {stripEmoji(d.disclaimer)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailProvider({ children }) {
  const [seed, setSeed] = useState(null);
  const open = useCallback((s) => s?.code && setSeed(s), []);
  const close = useCallback(() => setSeed(null), []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {seed && <Modal seed={seed} onClose={close} />}
    </Ctx.Provider>
  );
}
