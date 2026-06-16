import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Heat } from "../components/ui.jsx";
import { pct, dir, arrow, fixed, phaseClass, wonShort } from "../lib/format.js";

function ThemeCard({ t }) {
  const ph = t.phase || {};
  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="nm" style={{ fontSize: "1.02rem", fontWeight: 800 }}>{t.theme}</div>
        {ph.label && <span className={"phase " + phaseClass(ph.tier)}>{ph.label}</span>}
      </div>
      <Heat v={t.heat} />
      <div style={{ display: "flex", gap: "8px 18px", flexWrap: "wrap", fontSize: ".78rem", color: "var(--muted)" }}>
        <span>평균등락 <b className={"num " + dir(t.avg_change)} style={{ color: `var(--${dir(t.avg_change)})` }}>{arrow(t.avg_change)} {pct(t.avg_change)}</b></span>
        <span>커버 <b className="num">{t.covered}/{t.total}</b></span>
        <span>폭 <b className="num">{fixed(t.breadth, 0)}%</b></span>
        <span>수급 <b className="num">{wonShort(t.supply)}</b></span>
        <span>점수 <b className="num">{fixed(t.avg_score, 0)}</b></span>
      </div>
      {Array.isArray(t.leaders) && t.leaders.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {t.leaders.slice(0, 4).map((l, i) => (
            <span key={i} className="theme-tag">{typeof l === "string" ? l : l.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ThemesPage() {
  const { data, loading, error, reload } = useApi("/api/theme-rotation");
  const themes = (data?.themes || []).slice().sort((a, b) => b.heat - a.heat);
  return (
    <>
      <SectionHd icon="flame" title="테마 로테이션" count={loading ? null : themes.length}
        desc={data?.date ? `기준 ${data.date}` : "테마별 자금·열기 흐름"} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-themes">
          {loading ? <Skeletons n={9} /> : themes.length === 0 ? <Empty /> :
            themes.map((t) => <ThemeCard key={t.theme} t={t} />)}
        </div>
      )}
    </>
  );
}
