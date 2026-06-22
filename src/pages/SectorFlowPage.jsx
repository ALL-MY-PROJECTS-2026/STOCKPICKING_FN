import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox } from "../components/ui.jsx";

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

/** 유입/유출 한 컬럼 (자금흐름 막대) */
function FlowColumn({ title, icon, rows, kind }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.net_eok)));
  return (
    <div className="card card-pad">
      <div className="sect-hd" style={{ marginBottom: 12 }}>
        <i className={"ti ti-" + icon} style={{ color: `var(--${kind})` }} />
        {title}
        <span className="sect-sub">{rows.length}개 테마</span>
      </div>
      {rows.length === 0 ? <Empty /> : (
        <div className="secflow">
          {rows.map((r) => (
            <div className="secrow" key={r.theme + r.dir}>
              <span className="nm" title={r.theme}>{r.theme}</span>
              <div className="track">
                <i style={{ width: (Math.abs(r.net_eok) / max) * 100 + "%", background: `var(--${kind})` }} />
              </div>
              <span className="val" style={{ color: `var(--${kind})` }}>{eokInt(r.net_eok)}</span>
            </div>
          ))}
        </div>
      )}
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
  const inflow = data?.inflow || [];
  const outflow = data?.outflow || [];
  const domDate = freshDate(data);
  return (
    <>
      {/* 🇰🇷 국내 자금흐름 (유지) */}
      <FlowHeatCross />
      <SectionHd icon="arrows-exchange" title="섹터 자금흐름" count={loading ? null : (data?.n ?? inflow.length + outflow.length)}
        desc={data?.note || "테마별 순매수(억) — 유입=빨강 / 유출=파랑"}
        right={!loading && (
          <span className="gf-hd-right">
            <ScopeChip kr />
            <FreshChip date={domDate} fallback={data?.lookback ? `최근 ${data.lookback}거래일 누적` : null} />
          </span>
        )} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}><Skeletons n={2} /></div> : (
          <div className="secflow-cols">
            <FlowColumn title="자금 유입" icon="trending-up" rows={inflow} kind="up" />
            <FlowColumn title="자금 유출" icon="trending-down" rows={outflow} kind="down" />
          </div>
        )}

      {/* 🌍 해외 자금흐름 (신규 — 하단 카드) */}
      <GlobalFlow />
    </>
  );
}
