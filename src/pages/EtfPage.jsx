import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, ChangePill, Score } from "../components/ui.jsx";
import { fixed } from "../lib/format.js";
import { useDetail } from "../components/DetailModal.jsx";

function Group({ g }) {
  const { open } = useDetail();
  return (
    <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
      <div className="card-pad" style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12 }}>
        <div className="nm" style={{ fontWeight: 800, fontSize: ".98rem" }}>{g.theme}</div>
        <span className="count-chip">{g.count}</span>
        <span className="desc" style={{ fontSize: ".74rem", color: "var(--muted)", marginLeft: "auto" }}>
          평균점수 {fixed(g.avg_score, 0)} · 폭 {fixed(g.breadth, 0)}%
        </span>
      </div>
      <table className="tbl">
        <thead><tr><th style={{ width: 40 }}>#</th><th>ETF</th><th className="r">점수</th><th className="r">등락</th><th>사유</th></tr></thead>
        <tbody>
          {(g.etfs || []).map((e, i) => (
            <tr key={e.code} onClick={() => open({ ...e, theme: g.theme })}>
              <td><span className={"rank-n" + (i < 3 ? " top" : "")}>{i + 1}</span></td>
              <td><b>{e.name}</b><div className="code num" style={{ fontSize: ".66rem", color: "var(--faint)" }}>{e.code}</div></td>
              <td className="r"><Score v={e.score} /></td>
              <td className="r"><ChangePill v={e.change} /></td>
              <td style={{ color: "var(--muted)", fontSize: ".74rem" }}>{(e.reasons || []).slice(0, 2).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EtfPage() {
  const { data, loading, error, reload } = useApi("/api/etf-rank");
  const groups = (data?.groups || []).slice().sort((a, b) => b.avg_score - a.avg_score);
  return (
    <>
      <SectionHd icon="chart-candle" title="ETF 순위" count={loading ? null : groups.length}
        desc={data?.date ? `기준 ${data.date}` : "추세·자금 흐름 기준"} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid"><Skeletons n={4} cls="sk-card" /></div> :
          groups.length === 0 ? <Empty /> : groups.map((g) => <Group key={g.theme} g={g} />)}
    </>
  );
}
