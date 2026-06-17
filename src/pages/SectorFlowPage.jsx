import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox } from "../components/ui.jsx";
import { fixed } from "../lib/format.js";

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

/** 섹터 자금흐름 — /api/sector-flow (테마별 순매수, 유입=빨강 / 유출=파랑) */
export default function SectorFlowPage() {
  const { data, loading, error, reload } = useApi("/api/sector-flow");
  const inflow = data?.inflow || [];
  const outflow = data?.outflow || [];
  return (
    <>
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
