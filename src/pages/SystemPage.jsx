import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge } from "../components/ui.jsx";
import { fixed } from "../lib/format.js";

/** 상태 레벨 → Badge kind (ok=초록 / warn=주황 / bad·err=빨강) */
const LV = { ok: "ok", good: "ok", fresh: "ok", warn: "warn", stale: "warn", bad: "up", err: "up", down: "up" };
const lvKind = (l) => LV[l] || "mut";

/** 종합 상태 — /api/system-health */
function HealthSection() {
  const { data, loading, error, reload } = useApi("/api/system-health");
  const items = data?.items || [];
  return (
    <>
      <SectionHd icon="activity-heartbeat" title="종합 상태"
        desc={data?.note || "신선도·런·AI·커버리지 종합"}
        right={data?.overall && <Badge kind={lvKind(data.overall)} dot>{data.overall.toUpperCase()}</Badge>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid grid-stats"><Skeletons n={4} /></div> :
        items.length === 0 ? <Empty /> : (
          <div className="grid grid-stats">
            {items.map((it) => (
              <div className="card stat" key={it.key}>
                <div className="k"><Badge kind={lvKind(it.level)} dot>{it.level}</Badge></div>
                <div className="d" style={{ marginTop: 8, color: "var(--text)", fontSize: ".84rem" }}>{it.label}</div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}

/** 데이터 신선도 · 마지막 업데이트 · 추적 통계 (스칼라 위주) */
function StatsSection() {
  const fresh = useApi("/api/data-freshness");
  const upd = useApi("/api/last-update");
  const trk = useApi("/api/tracker-stats");
  const f = fresh.data || {}, u = upd.data || {}, t = trk.data || {};
  return (
    <>
      <SectionHd icon="database-cog" title="데이터 현황" />
      <div className="grid grid-stats">
        <div className="card stat">
          <div className="k">데이터 신선도</div>
          <div className="v" style={{ fontSize: "1.15rem" }}>{f.label || "-"}</div>
          <div className="d">{f.latest || "-"} · 지연 {f.stale_days ?? "-"}일</div>
        </div>
        <div className="card stat">
          <div className="k">마지막 분석</div>
          <div className="v num" style={{ fontSize: "1.15rem" }}>{u.elapsed_min != null ? u.elapsed_min + "분 전" : "-"}</div>
          <div className="d">{u.at || "-"}</div>
        </div>
        <div className="card stat">
          <div className="k">추적 종목</div>
          <div className="v num">{t.bm_count ?? "-"}</div>
          <div className="d">베이스라인 {t.baseline_count ?? "-"} · 스냅 {t.snap_count ?? "-"}</div>
        </div>
        <div className="card stat">
          <div className="k">마지막 캡처</div>
          <div className="v" style={{ fontSize: "1rem" }}>{t.last_captured || "-"}</div>
        </div>
      </div>
    </>
  );
}

/** AI 상태 — /api/ai-health */
function AiSection() {
  const { data, loading } = useApi("/api/ai-health");
  if (loading) return null;
  const d = data || {};
  return (
    <>
      <SectionHd icon="robot" title="AI 분석 상태"
        right={<Badge kind={d.status === "ok" ? "ok" : d.using_ai ? "warn" : "mut"} dot>{d.status || "-"}</Badge>} />
      <div className="grid grid-stats">
        <div className="card stat"><div className="k">사용 여부</div><div className="v" style={{ fontSize: "1.1rem" }}>{d.using_ai ? "ON" : "OFF"}</div><div className="d">{d.model || "모델 없음"}</div></div>
        <div className="card stat"><div className="k">정상률</div><div className="v num">{d.health_pct != null ? fixed(d.health_pct, 0) + "%" : "-"}</div><div className="d">{d.ok ?? 0}/{d.total ?? 0} 정상</div></div>
        <div className="card stat"><div className="k">폴백</div><div className="v num">{d.fallback ?? "-"}</div><div className="d">규칙 기반 대체</div></div>
      </div>
    </>
  );
}

/** 데이터 소스 — /api/data-sources */
function SourcesSection() {
  const { data, loading, error, reload } = useApi("/api/data-sources");
  const sources = data?.sources || [];
  return (
    <>
      <SectionHd icon="plug-connected" title="데이터 소스"
        desc={data?.last_run ? "마지막 실행 " + data.last_run : null}
        right={data?.force_zero_pct != null && <span className="count-chip">강제 0% {fixed(data.force_zero_pct, 0)}%</span>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="card card-pad"><Skeletons n={1} /></div> :
        sources.length === 0 ? <Empty /> : (
          <div className="card">
            <table className="tbl">
              <thead><tr><th>소스</th><th style={{ width: 70 }}>상태</th><th>상세</th></tr></thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.key}>
                    <td><b>{s.name}</b></td>
                    <td><Badge kind={s.ok ? "ok" : "up"} dot>{s.ok ? "정상" : "오류"}</Badge></td>
                    <td style={{ color: "var(--muted)", fontSize: ".78rem" }}>{s.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}

export default function SystemPage() {
  return (
    <>
      <HealthSection />
      <StatsSection />
      <AiSection />
      <SourcesSection />
    </>
  );
}
