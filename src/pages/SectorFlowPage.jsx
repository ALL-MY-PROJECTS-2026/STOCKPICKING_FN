import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox } from "../components/ui.jsx";

/** 억 단위 정수 표기 — net_eok 가 큰 정수(억)라 소수 없이 +6,148억 */
const eokInt = (v) =>
  v == null || isNaN(v) ? "-" : (v >= 0 ? "+" : "") + Math.round(v).toLocaleString("ko-KR") + "억";

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
  { key: "확증주도", icon: "flame", kind: "up", desc: "가격↑ + 자금유입 · 고확신 주도" },
  { key: "선취매", icon: "seeding", kind: "accent", desc: "자금 먼저 유입 · 선제 매집" },
  { key: "분산경고", icon: "alert-triangle", kind: "warn", desc: "가격↑ + 자금유출 · 기관 이탈 주의" },
  { key: "약세", icon: "trending-down", kind: "down", desc: "가격·자금 모두 약세" },
];

function FlowHeatCross() {
  const { data, loading, error, reload } = useApi("/api/flow-heat-cross");
  const q = data?.quadrants || {};
  return (
    <>
      <SectionHd icon="layout-grid" title="heat × 자금흐름 4분면"
        desc={data?.note || "가격 모멘텀 × 기관·외인 순매수 교차 — 테마 국면 분류 (표시 전용)"} />
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
                  {rows.length === 0 ? <Empty>해당 없음</Empty> : (
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

/** 섹터 자금흐름 — /api/sector-flow (테마별 순매수, 유입=빨강 / 유출=파랑) */
export default function SectorFlowPage() {
  const { data, loading, error, reload } = useApi("/api/sector-flow");
  const inflow = data?.inflow || [];
  const outflow = data?.outflow || [];
  return (
    <>
      <FlowHeatCross />
      <SectionHd icon="arrows-exchange" title="섹터 자금흐름" count={loading ? null : (data?.n ?? inflow.length + outflow.length)}
        desc={data?.note || "테마별 순매수(억) — 유입=빨강 / 유출=파랑"}
        right={data?.lookback && <span className="count-chip">최근 {data.lookback}일</span>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}><Skeletons n={2} /></div> : (
          <div className="secflow-cols">
            <FlowColumn title="자금 유입" icon="trending-up" rows={inflow} kind="up" />
            <FlowColumn title="자금 유출" icon="trending-down" rows={outflow} kind="down" />
          </div>
        )}
    </>
  );
}
