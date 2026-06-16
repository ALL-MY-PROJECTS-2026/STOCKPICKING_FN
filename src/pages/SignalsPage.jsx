import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge } from "../components/ui.jsx";
import { fixed, pct, dir, arrow, won } from "../lib/format.js";
import { useDetail } from "../components/DetailModal.jsx";

function TrustGauge() {
  const { data, loading, error } = useApi("/api/signal-trust");
  if (loading) return <div className="sk" style={{ height: 130, borderRadius: "var(--r)" }} />;
  if (error || !data) return null;
  const tr = Math.round(data.trust ?? 0);
  const rc = tr >= 70 ? "var(--ok)" : tr >= 50 ? "var(--warn)" : "var(--up)";
  // factors 는 객체({freshness:{pct,weight,detail},...}) 또는 배열 둘 다 대응
  const factors = Array.isArray(data.factors)
    ? data.factors.map((f) => (typeof f === "string" ? { name: f } : { name: f.name || f.factor, pct: f.pct }))
    : Object.entries(data.factors || {}).map(([k, v]) => ({ name: k, pct: v?.pct, detail: v?.detail }));
  return (
    <div className="regime card" style={{ "--rc": rc }}>
      <div className="regime-score">
        <b style={{ color: rc }} className="num">{tr}</b><span>TRUST</span>
      </div>
      <div className="regime-body">
        <div className="tier" style={{ color: rc }}>{data.tier} 신뢰도</div>
        <div className="advice">{data.note}</div>
        <div className="regime-votes">
          {factors.slice(0, 6).map((f, i) => (
            <Badge key={i} kind={f.pct >= 80 ? "ok" : f.pct != null && f.pct < 50 ? "warn" : "mut"} dot>
              {f.name}{f.pct != null ? ` ${Math.round(f.pct)}%` : ""}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportStats({ report }) {
  if (!report) return null;
  const stats = [
    { k: "평균 초과수익", v: pct(report.avg_return, 1), icon: "trending-up", cls: dir(report.avg_return) },
    { k: "적중률", v: fixed(report.hit_rate, 1) + "%", icon: "target", cls: report.hit_rate >= 50 ? "up" : "" },
    { k: "표본 수", v: report.n + "개", icon: "database" },
    { k: "코호트", v: report.cohort_days + "일", icon: "calendar" },
  ];
  return (
    <div className="grid grid-stats" style={{ marginBottom: 6 }}>
      {stats.map((s, i) => (
        <div className="card stat" key={i}>
          <div className="k"><i className={"ti ti-" + s.icon} />{s.k}</div>
          <div className="v num" style={s.cls ? { color: `var(--${s.cls})` } : null}>{s.v}</div>
        </div>
      ))}
    </div>
  );
}

function ValidationTable() {
  const { open } = useDetail();
  const { data, loading, error, reload } = useApi("/api/validation");
  const vr = data?.value_rank || {};
  const top = Array.isArray(vr.top) ? vr.top : [];
  return (
    <>
      <SectionHd icon="list-check" title="가치 팩터 랭킹" count={loading ? null : top.length}
        desc={vr.method || "Z-score 결합 가치 상위 (전진 검증)"}
        right={vr.date && <span className="count-chip">기준 {vr.date}</span>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid"><Skeletons n={3} cls="sk-card" /></div> :
          top.length === 0 ? <Empty>검증 후보 없음</Empty> : (
            <>
              <ReportStats report={data?.report} />
              <div className="card" style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead><tr><th>#</th><th>종목</th><th>테마</th><th className="r">가치Z</th><th className="r">PBR</th><th className="r">PER</th><th className="r">가격</th></tr></thead>
                  <tbody>
                    {top.slice(0, 20).map((c, i) => (
                      <tr key={c.code || i} onClick={() => open(c)}>
                        <td><span className={"rank-n" + (i < 3 ? " top" : "")}>{i + 1}</span></td>
                        <td><b>{c.name}</b> <span className="code num" style={{ color: "var(--faint)" }}>{c.code}</span></td>
                        <td style={{ color: "var(--muted)", fontSize: ".74rem" }}>{c.theme}</td>
                        <td className="r num"><b style={{ color: "var(--ok)" }}>{fixed(c.value_z ?? c.corr_z ?? c.robust_z, 2)}</b></td>
                        <td className="r num">{fixed(c.pbr, 2)}</td>
                        <td className="r num">{fixed(c.per, 1)}</td>
                        <td className="r num">{won(c.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
    </>
  );
}

export default function SignalsPage() {
  return (
    <>
      <TrustGauge />
      <div style={{ height: 8 }} />
      <ValidationTable />
    </>
  );
}
