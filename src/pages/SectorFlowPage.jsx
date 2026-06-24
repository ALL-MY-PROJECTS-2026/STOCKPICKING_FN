import { useState } from "react";
import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox } from "../components/ui.jsx";
import { useDetail } from "../components/DetailModal.jsx";

/** 억 단위 정수 표기 — net_eok 가 큰 정수(억)라 소수 없이 +6,148억 */
const eokInt = (v) =>
  v == null || isNaN(v) ? "-" : (v >= 0 ? "+" : "") + Math.round(v).toLocaleString("ko-KR") + "억";

/** 등락률 ±0.00% (해외 ETF change_pct) */
const pct1 = (v) => (v == null || isNaN(v) ? "-" : (v >= 0 ? "+" : "") + Number(v).toFixed(2) + "%");

/** BN 이 날짜를 안 줄 수도 있어 방어적으로 여러 필드명을 수용 */
const freshDate = (d) => d?.as_of || d?.updated_at || d?.updatedAt || d?.date || d?.asof || null;

/** 국내/해외 범위 칩 */
function ScopeChip({ kr }) {
  return <span className="gf-scope" title={kr ? "국내 시장 데이터" : "해외 시장 데이터"}>{kr ? "🇰🇷 국내" : "🌍 해외"}</span>;
}
/** 기준일 칩 (없으면 fallback 라벨) */
function FreshChip({ date, fallback }) {
  if (date) return <span className="count-chip" title="데이터 기준일">기준일 {date}</span>;
  if (fallback) return <span className="count-chip" title="집계 기준 구간">{fallback}</span>;
  return null;
}

/** +면 상승색(빨강)/-면 하락색(파랑)/0이면 muted — 투자자별 순매수 부호색 */
const flowColor = (v) => `var(--${v > 0 ? "up" : v < 0 ? "down" : "muted"})`;

/** flow_quality 배지 메타 (BN: 강한유입/편중유입/강한유출/혼조) */
const QUAL_META = {
  "강한유입": { cls: "up", icon: "trending-up" },
  "강한유출": { cls: "down", icon: "trending-down" },
  "혼조": { cls: "mut", icon: "arrows-shuffle" },
};
const qualMeta = (q) =>
  QUAL_META[q] || (q && q.includes("편중") ? { cls: "warn", icon: "alert-triangle" } : { cls: "mut", icon: "minus" });

/** 방어적 필드 선택 — BN 이 추후 필드 추가 시 FN 이 자동 표시(필드명 변형 흡수) */
const pickNum = (o, keys) => { for (const k of keys) { const v = o && o[k]; if (typeof v === "number") return v; } return null; };
const pickArr = (o, keys) => { for (const k of keys) { const v = o && o[k]; if (Array.isArray(v) && v.length) return v; } return null; };

/** 일자별 순매수 추이 미니 스파크(BN series 제공 시) — 막대 높이=|값|, 색=부호 */
function SparkBars({ series }) {
  const vals = series.map((s) => (typeof s === "number" ? s : pickNum(s, ["net_eok", "net", "dnet", "value"]) || 0));
  const m = Math.max(1, ...vals.map((v) => Math.abs(v)));
  return (
    <div className="sfd-spark" title="일자별 순매수 추이(최근→과거)" aria-hidden="true">
      {vals.map((v, i) => (
        <i key={i} style={{ height: Math.max(10, (Math.abs(v) / m) * 100) + "%", background: flowColor(v) }} />
      ))}
    </div>
  );
}

/** 투자자별 종목 드릴다운 — 클릭한 투자자(외국인/기관)가 담은 종목 내역 (종목 클릭=상세모달) */
function InvestorDrill({ label, stocks, onPick }) {
  return (
    <div className="sfd-drill">
      <div className="sfd-drill-h"><i className="ti ti-list-search" aria-hidden="true" />{label} 자금 집중 종목<span className="sfd-drill-sub">매수 빨강 / 매도 파랑</span></div>
      <ul className="sfd-drill-list">
        {stocks.map((s, i) => {
          const v = pickNum(s, ["net_eok", "net", "eok", "value"]);
          const nm = s.name || s.code || "-";
          return (
            <li key={s.code || i}>
              <span className="sfd-drill-rk num">{i + 1}</span>
              <button className="sfd-drill-nm" title={`${nm} 상세보기`} disabled={!s.code}
                onClick={() => s.code && onPick({ code: s.code, name: s.name })}>{nm}</button>
              {v != null && <b className="num" style={{ color: flowColor(v) }}>{eokInt(v)}</b>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 테마 1개 카드 — 투자자 클릭 시 종목 드릴다운(자체 상태) */
function SfdCard({ r, rank, max }) {
  const [openInv, setOpenInv] = useState(null);
  const { open } = useDetail();
  const dirKind = r.dir === "inflow" ? "up" : r.dir === "outflow" ? "down" : "muted";
  const q = qualMeta(r.flow_quality);
  const indiv = pickNum(r, ["individual_eok", "retail_eok", "person_eok", "individual"]);
  const leaders = pickArr(r, ["top_stocks", "leaders", "top_contributors", "top_names"]);
  const series = pickArr(r, ["daily_trend", "series", "daily", "by_date", "daily_net"]);
  const fStocks = pickArr(r, ["top_stocks_foreign", "foreign_stocks", "foreign_top"]);
  const iStocks = pickArr(r, ["top_stocks_institution", "institution_stocks", "institution_top"]);
  const toggle = (k) => setOpenInv((o) => (o === k ? null : k));
  const drill = openInv === "foreign" ? fStocks : openInv === "institution" ? iStocks : null;
  const drillLabel = openInv === "foreign" ? "외국인" : "기관";
  return (
    <div className="card card-pad sfd-card" style={{ "--dc": `var(--${dirKind})` }}>
      <div className="sfd-top">
        <span className="sfd-rank num" title="순매수 순위">#{rank}</span>
        <span className="sfd-th" title={r.theme}>{r.theme}</span>
        {r.flow_quality && (
          <span className={"sfd-qual sfd-" + q.cls} title="자금흐름 품질(쏠림·일관성 종합)">
            <i className={"ti ti-" + q.icon} aria-hidden="true" />{r.flow_quality}
          </span>
        )}
      </div>
      <div className="sfd-net">
        <b className="num" style={{ color: `var(--${dirKind})` }}>{eokInt(r.net_eok)}</b>
        <span className="sfd-net-lbl">총 순매수(외국인+기관)</span>
      </div>
      <div className="sfd-track"><i style={{ width: (Math.abs(r.net_eok || 0) / max) * 100 + "%", background: `var(--${dirKind})` }} /></div>
      <div className={"sfd-split" + (indiv != null ? " sfd-split3" : "")}>
        {fStocks ? (
          <button className={"sfd-inv sfd-inv-btn" + (openInv === "foreign" ? " on" : "")}
            onClick={() => toggle("foreign")} aria-expanded={openInv === "foreign"} title="외국인 종목별 내역 보기">
            <span className="sfd-inv-k"><i className="ti ti-world" aria-hidden="true" />외국인<i className={"ti ti-chevron-down sfd-chev" + (openInv === "foreign" ? " up" : "")} aria-hidden="true" /></span>
            <span className="sfd-inv-v num" style={{ color: flowColor(r.foreign_eok) }}>{eokInt(r.foreign_eok)}</span>
          </button>
        ) : (
          <div className="sfd-inv">
            <span className="sfd-inv-k"><i className="ti ti-world" aria-hidden="true" />외국인</span>
            <span className="sfd-inv-v num" style={{ color: flowColor(r.foreign_eok) }}>{eokInt(r.foreign_eok)}</span>
          </div>
        )}
        {iStocks ? (
          <button className={"sfd-inv sfd-inv-btn" + (openInv === "institution" ? " on" : "")}
            onClick={() => toggle("institution")} aria-expanded={openInv === "institution"} title="기관 종목별 내역 보기">
            <span className="sfd-inv-k"><i className="ti ti-building-bank" aria-hidden="true" />기관<i className={"ti ti-chevron-down sfd-chev" + (openInv === "institution" ? " up" : "")} aria-hidden="true" /></span>
            <span className="sfd-inv-v num" style={{ color: flowColor(r.institution_eok) }}>{eokInt(r.institution_eok)}</span>
          </button>
        ) : (
          <div className="sfd-inv">
            <span className="sfd-inv-k"><i className="ti ti-building-bank" aria-hidden="true" />기관</span>
            <span className="sfd-inv-v num" style={{ color: flowColor(r.institution_eok) }}>{eokInt(r.institution_eok)}</span>
          </div>
        )}
        {indiv != null && (
          <div className="sfd-inv" title="개인 순매수(참고 — 총 순매수엔 미포함, 보통 외인·기관의 반대편)">
            <span className="sfd-inv-k"><i className="ti ti-user" aria-hidden="true" />개인</span>
            <span className="sfd-inv-v num" style={{ color: flowColor(indiv) }}>{eokInt(indiv)}</span>
          </div>
        )}
      </div>
      {drill && drill.length > 0 && <InvestorDrill label={drillLabel} stocks={drill} onPick={open} />}
      {leaders && !drill && (
        <div className="sfd-leaders">
          <span className="sfd-lead-h">주도 종목(외국인+기관)</span>
          {leaders.slice(0, 3).map((s, j) => {
            const nm = s.name || s.code || s.ticker || String(s);
            const v = pickNum(s, ["net_eok", "net", "eok", "value"]);
            return (
              <span className="sfd-lead" key={j} title={nm}>
                <span className="sfd-lead-nm">{nm}</span>
                {v != null && <b className="num" style={{ color: flowColor(v) }}>{eokInt(v)}</b>}
              </span>
            );
          })}
        </div>
      )}
      {series && series.length > 1 && <SparkBars series={series} />}
      <div className="sfd-meta">
        {r.led_by && <span className="sfd-led" title="주도 주체(부호 기준)">주도 {r.led_by}</span>}
        {r.consistency_pct != null && <span className="sfd-m" title="N거래일 중 순유입일 비율 — 꾸준함">일관성 {r.consistency_pct}%</span>}
        {r.breadth_pct != null && <span className="sfd-m" title="테마 내 순유입 종목 비율 — 광범위함">매수폭 {r.breadth_pct}%</span>}
        {r.concentration_pct != null && <span className="sfd-m" title="최대 1종목이 차지하는 절대비중 — 쏠림">집중도 {r.concentration_pct}%</span>}
        {r.stock_count != null && <span className="sfd-m" title="분석 종목 수">{r.stock_count}종목</span>}
        {r.per_stock_eok != null && <span className="sfd-m" title="종목당 평균 순매수">종목당 {eokInt(r.per_stock_eok)}</span>}
      </div>
    </div>
  );
}

/** 총자본 섹터 자금흐름 상세 — 테마별 카드 그리드 */
function SectorFlowDetail({ items }) {
  const max = Math.max(1, ...items.map((r) => Math.abs(r.net_eok || 0)));
  return (
    <div className="sfd-grid">
      {items.map((r, i) => <SfdCard key={r.theme} r={r} rank={i + 1} max={max} />)}
    </div>
  );
}

/** heat(가격 모멘텀) × 자금흐름 4분면 — /api/flow-heat-cross (테마 국면 교차 분류) */
const FHC_QUADS = [
  { key: "확증주도", icon: "flame", kind: "up", desc: "가격↑ + 자금유입 · 고확신 주도", empty: "지금은 가격↑·자금유입을 동시에 충족하는 주도 테마가 없습니다" },
  { key: "선취매", icon: "seeding", kind: "accent", desc: "자금 먼저 유입 · 선제 매집", empty: "해당 테마 없음" },
  { key: "분산경고", icon: "alert-triangle", kind: "warn", desc: "가격↑ + 자금유출 · 기관 이탈 주의", empty: "해당 테마 없음" },
  { key: "약세", icon: "trending-down", kind: "down", desc: "가격·자금 모두 약세", empty: "해당 테마 없음" },
];

function FlowHeatCross() {
  const { data, loading, error, reload } = useApi("/api/flow-heat-cross");
  const q = data?.quadrants || {};
  return (
    <>
      <SectionHd icon="layout-grid" title="heat × 자금흐름 4분면"
        desc={data?.note || "가격 모멘텀 × 기관·외인 순매수 교차 — 테마 국면 분류 (표시 전용)"}
        right={!loading && (
          <span className="gf-hd-right">
            <ScopeChip kr />
            <FreshChip date={freshDate(data)} />
          </span>
        )} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="fhc-grid"><Skeletons n={4} cls="sk" /></div> : (
          <div className="fhc-grid">
            {FHC_QUADS.map((qd) => {
              const rows = q[qd.key] || [];
              return (
                <div className="card card-pad fhc-quad" style={{ "--qc": `var(--${qd.kind})` }} key={qd.key}>
                  <div className="sect-hd" style={{ marginBottom: 2 }}>
                    <i className={"ti ti-" + qd.icon} style={{ color: `var(--${qd.kind})` }} aria-hidden="true" />
                    {qd.key}<span className="sect-sub">{rows.length}</span>
                  </div>
                  <p className="fhc-desc">{qd.desc}</p>
                  {rows.length === 0 ? <p className="fhc-empty">{qd.empty}</p> : (
                    <ul className="fhc-list">
                      {rows.map((r) => (
                        <li key={r.theme}>
                          <span className="fhc-th" title={r.theme}>{r.theme}</span>
                          <span className="fhc-heat num" title="heat (가격 모멘텀)">heat {Math.round(r.heat)}</span>
                          <span className="fhc-net num" style={{ color: `var(--${r.net_eok >= 0 ? "up" : "down"})` }}>{eokInt(r.net_eok)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </>
  );
}

const REGIME_META = {
  "위험선호": { cls: "up", icon: "mood-happy" },
  "위험회피": { cls: "down", icon: "mood-nervous" },
  "혼조": { cls: "muted", icon: "arrows-shuffle" },
};

/** 해외 자금흐름 — /api/global-flow (US 섹터 ETF 로테이션 = 자금이동 프록시 + 한국 테마 매핑) */
function GlobalFlow() {
  const { data, loading, error, reload } = useApi("/api/global-flow");
  const rot = data?.sector_rotation || [];
  const assets = data?.asset_flows ? Object.entries(data.asset_flows) : [];
  const maxRot = Math.max(1, ...rot.map((r) => Math.abs(r.change_pct || 0)));
  const reg = REGIME_META[data?.risk_regime] || REGIME_META["혼조"];
  return (
    <>
      <SectionHd icon="world-search" title="해외 자금흐름" count={loading ? null : rot.length}
        desc="US 섹터 ETF 등락 = 자금이동 프록시 → 연결되는 한국 테마 매핑 (표시 전용)"
        right={!loading && (
          <span className="gf-hd-right">
            <ScopeChip />
            {data?.risk_regime && (
              <span className={"gf-regime gf-" + reg.cls} title="해외 위험선호 국면">
                <i className={"ti ti-" + reg.icon} aria-hidden="true" />위험선호 {data.risk_regime}
              </span>
            )}
            <FreshChip date={freshDate(data)} />
          </span>
        )} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="gf-grid"><Skeletons n={2} /></div> :
        rot.length === 0 ? <Empty /> : (
          <div className="gf-grid">
            {/* US 섹터 로테이션 — 유입(빨강)순 */}
            <div className="card card-pad">
              <div className="sect-hd" style={{ marginBottom: 12 }}>
                <i className="ti ti-arrows-exchange-2" aria-hidden="true" />US 섹터 로테이션
                <span className="sect-sub">{rot.length}개 · 유입순</span>
              </div>
              <div className="secflow">
                {rot.map((r) => {
                  const kind = (r.change_pct || 0) >= 0 ? "up" : "down";
                  return (
                    <div className="secrow gf-rot" key={r.sector}>
                      <span className="nm" title={r.sector}>
                        {r.sector}{r.etf && <span className="gf-etf" title="대표 ETF">{r.etf}</span>}
                      </span>
                      <div className="track">
                        <i style={{ width: (Math.abs(r.change_pct || 0) / maxRot) * 100 + "%", background: `var(--${kind})` }} />
                      </div>
                      <span className="val" style={{ color: `var(--${kind})` }}>{pct1(r.change_pct)}</span>
                      {r.kr_link && (
                        <span className="gf-krlink" title={"연결 한국 테마/종목: " + r.kr_link}>
                          <i className="ti ti-arrow-right" aria-hidden="true" /><span className="gf-krlink-t">{r.kr_link}</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 자산 흐름 + 한국 시사점 */}
            <div className="card card-pad gf-side">
              <div>
                <div className="sect-hd" style={{ marginBottom: 12 }}>
                  <i className="ti ti-coins" aria-hidden="true" />자산 흐름
                  <span className="sect-sub">위험선호/회피</span>
                </div>
                {assets.length === 0 ? <Empty /> : (
                  <div className="gf-assets">
                    {assets.map(([name, v]) => (
                      <div className="gf-asset" key={name}>
                        <span className="gf-as-nm" title={name}>{name}</span>
                        <span className="gf-as-v num" style={{ color: `var(--${(v || 0) >= 0 ? "up" : "down"})` }}>{pct1(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {data?.kr_implication && (
                <p className="gf-impl">
                  <i className="ti ti-flag-2" aria-hidden="true" />
                  <span><b className="gf-impl-lbl">한국 시사점</b>{data.kr_implication}</span>
                </p>
              )}
            </div>
          </div>
        )}
      {data?.disclaimer && <p className="gf-disc">{data.disclaimer}{data?.source ? ` · 출처: ${data.source}` : ""}</p>}
    </>
  );
}

/** 섹터 자금흐름 — /api/sector-flow (테마별 순매수, 유입=빨강 / 유출=파랑) */
export default function SectorFlowPage() {
  const { data, loading, error, reload } = useApi("/api/sector-flow");
  const items = (data?.items || []).slice().sort((a, b) => (b.net_eok || 0) - (a.net_eok || 0));
  const domDate = freshDate(data);
  const cov = data?.coverage;
  const covWarn = cov && cov.consistent === false;
  // 정확도/신뢰도: 확정(장마감) vs 잠정(장중) 기준 명시
  const open = data?.is_market_open === true;
  const basisLabel = open ? "장중 잠정" : "장마감 확정";
  return (
    <>
      {/* 🇰🇷 국내 자금흐름 (유지) */}
      <FlowHeatCross />
      <SectionHd icon="arrows-exchange" title="총자본 섹터 자금흐름" count={loading ? null : (data?.n ?? items.length)}
        desc={data?.note || "테마별 (외국인+기관) 총 순매수(억) · 투자자 분리·일관성·쏠림 동반 — 유입=빨강 / 유출=파랑"}
        right={!loading && (
          <span className="gf-hd-right">
            <ScopeChip kr />
            {(data?.flow_basis || data?.is_market_open != null) && (
              <span className={"sfd-basis " + (open ? "sfd-basis-prov" : "sfd-basis-fix")}
                title={data?.flow_basis || "자금흐름 기준"}>
                <i className={"ti ti-" + (open ? "clock-play" : "circle-check")} aria-hidden="true" />{basisLabel}
              </span>
            )}
            <FreshChip date={domDate} fallback={data?.lookback ? `최근 ${data.lookback}거래일 누적` : null} />
          </span>
        )} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="sfd-grid"><Skeletons n={6} cls="sk" /></div> :
        items.length === 0 ? <Empty>표시할 섹터 자금흐름이 없습니다</Empty> : (
          <>
            {data?.flow_basis_note && (
              <p className="sfd-basis-note"><i className="ti ti-info-circle" aria-hidden="true" />{data.flow_basis_note.replace(/\*\*/g, "")}</p>
            )}
            {covWarn && (
              <p className="sfd-cov"><i className="ti ti-alert-triangle" aria-hidden="true" />
                {data.data_quality || "일별 분석종목수 편차로 합계가 왜곡될 수 있습니다 — per_stock·품질지표 참고"}
                {cov.min != null && cov.max != null ? ` (일별 ${cov.min}~${cov.max}종목)` : ""}
              </p>
            )}
            <SectorFlowDetail items={items} />
          </>
        )}

      {/* 🌍 해외 자금흐름 (신규 — 하단 카드) */}
      <GlobalFlow />
    </>
  );
}
