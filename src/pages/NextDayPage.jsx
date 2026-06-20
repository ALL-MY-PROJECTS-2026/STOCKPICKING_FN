import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, Heat } from "../components/ui.jsx";
import { pct, dir, fixed, stripEmoji } from "../lib/format.js";

const dirArrow = (d) => (d > 0 ? "▲" : d < 0 ? "▼" : "–");
const dirCls = (d) => (d > 0 ? "up" : d < 0 ? "down" : "flat");
const STRENGTH = { high: { kind: "ok", label: "영향 높음", rank: 0 }, medium: { kind: "warn", label: "영향 보통", rank: 1 }, low: { kind: "mut", label: "영향 낮음", rank: 2 } };
const CERT = { verified: "검증", "verified-channel": "검증채널", info: "정보" };
const CONF = { high: "ok", medium: "warn", low: "mut", info: "mut" };
const SENT = { pos: { kind: "ok", label: "긍정" }, neg: { kind: "warn", label: "부정" }, neu: { kind: "mut", label: "중립" } };
const biasKind = (b) => (/긍정|호재|상승/.test(b || "") ? "up" : /부정|악재|하락/.test(b || "") ? "down" : "mut");

function ProgressLine({ label, n, min }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem", marginBottom: 5 }}>
        <span style={{ color: "var(--muted)" }}>{label}</span>
        <b className="num">{n ?? 0} / {min ?? 10}</b>
      </div>
      <Heat v={((n ?? 0) / (min || 10)) * 100} />
    </div>
  );
}

/** 예측 검증 — /api/prediction-scorecard(전체 신뢰도 점수·요인적중·개선점) + /api/driver-forward-ic(드라이버별 forward IC·승률) */
function PredictionValidation() {
  const sc = useApi("/api/prediction-scorecard");
  const fic = useApi("/api/driver-forward-ic");
  if (sc.loading && fic.loading) return <><SectionHd icon="target-arrow" title="예측 검증 · 신뢰도" /><div className="sk" style={{ height: 80, borderRadius: "var(--r)" }} /></>;
  const s = sc.data, f = fic.data;
  if (!s && !f) return null;
  const scObs = !s || s.status === "observing" || (s.samples_graded != null && s.min_sample != null && s.samples_graded < s.min_sample);
  const ficObs = !f || f.status === "observing" || (f.samples_logged != null && f.min_sample != null && f.samples_logged < f.min_sample);
  const measured = !scObs || !ficObs;
  const rows = (f && Array.isArray(f.drivers) && f.drivers) || (f && Array.isArray(f.ic) && f.ic) || [];
  const improvements = (s && (s.improvements || s.improvement_points)) || [];
  const factors = (s && Array.isArray(s.factors) && s.factors) || [];

  return (
    <>
      <SectionHd icon="target-arrow" title="예측 검증 · 신뢰도" desc="이 페이지 예측이 실제 익일 결과를 얼마나 맞췄는지 — 점수로 개선점 도출"
        right={<Badge kind={measured ? "ok" : "warn"} dot>{measured ? "측정 완료" : "표본 수집 중"}</Badge>} />
      <div className="card card-pad">
        {/* 측정 완료 점수 */}
        {(s && (s.reliability_score != null || s.score != null || s.hit_rate != null)) && (
          <div className="grid grid-stats" style={{ marginBottom: 10 }}>
            {(s.reliability_score ?? s.score) != null && <div className="card stat"><div className="k">예측 신뢰도</div><div className="v num">{fixed(s.reliability_score ?? s.score, 0)}</div></div>}
            {s.hit_rate != null && <div className="card stat"><div className="k">적중률</div><div className="v num">{fixed(s.hit_rate, 0)}%</div></div>}
            {s.samples_graded != null && <div className="card stat"><div className="k">채점 표본</div><div className="v num">{s.samples_graded}</div></div>}
          </div>
        )}
        {/* 진행바 (수집 중) */}
        {scObs && <ProgressLine label="예측 채점 누적" n={s?.samples_graded ?? s?.samples_logged} min={s?.min_sample} />}
        {ficObs && <ProgressLine label="드라이버 스냅샷 누적" n={f?.samples_logged} min={f?.min_sample} />}

        {/* 드라이버별 forward IC (측정 완료 시) */}
        {rows.length > 0 && (
          <table className="tbl"><thead><tr><th>드라이버</th><th className="r">forward IC</th><th className="r">승률</th><th className="r">표본</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i}><td><b>{r.category || r.name}</b></td>
                <td className="r num" style={{ color: `var(--${dir(r.ic ?? r.forward_ic)})` }}>{fixed(r.ic ?? r.forward_ic, 3)}</td>
                <td className="r num">{(r.win_rate ?? r.hit ?? r.hit_rate) != null ? fixed(r.win_rate ?? r.hit ?? r.hit_rate, 0) + "%" : "-"}</td>
                <td className="r num">{r.n ?? r.samples ?? "-"}</td></tr>
            ))}</tbody>
          </table>
        )}
        {/* 요인별 적중 / 개선점 (측정 완료 시) */}
        {factors.length > 0 && (
          <div className="sig-chips" style={{ marginTop: 8 }}>{factors.map((x, i) => <span className="sig-chip" key={i}>{x.name || x.factor}{(x.hit ?? x.hit_rate) != null ? ` ${fixed(x.hit ?? x.hit_rate, 0)}%` : ""}</span>)}</div>
        )}
        {improvements.length > 0 && (
          <ul className="why-list" style={{ marginTop: 8 }}>{improvements.slice(0, 5).map((x, i) => <li key={i}>{stripEmoji(typeof x === "string" ? x : x.text || x.note)}</li>)}</ul>
        )}
        {(s?.note || f?.note) && <p className="force-note" style={{ marginTop: 8 }}>{stripEmoji(s?.note || f?.note)}</p>}
      </div>
    </>
  );
}

/** 다음날 증시 예측 — /api/next-day-insight (간밤 글로벌·수급·이벤트 종합 → 익일 시초가·장중 영향, 카드 그리드) */
export default function NextDayPage() {
  const { data, loading, error, reload } = useApi("/api/next-day-insight");

  if (loading) return <><SectionHd icon="crystal-ball" title="다음날 증시 예측" /><div className="nd-grid"><Skeletons n={6} cls="sk-card" /></div></>;
  if (error) return <><SectionHd icon="crystal-ball" title="다음날 증시 예측" /><ErrBox onRetry={reload}>{error}</ErrBox></>;
  if (!data) return <><SectionHd icon="crystal-ball" title="다음날 증시 예측" /><Empty>데이터 없음</Empty></>;

  const drivers = (data.drivers || []).slice().sort((a, b) => (STRENGTH[a.strength]?.rank ?? 3) - (STRENGTH[b.strength]?.rank ?? 3));
  const sc = data.scenarios || [];
  const asia = data.asia_markets || {};
  const asiaRows = [
    { k: "니케이 225", v: asia.nikkei225_chg },
    { k: "항셍", v: asia.hangseng_chg },
    { k: "상하이종합", v: asia.shanghai_chg },
  ].filter((x) => x.v != null);
  const ns = data.news_sentiment || {};

  return (
    <>
      <SectionHd icon="crystal-ball" title="다음날 증시 예측"
        desc="간밤 글로벌·수급·이벤트 종합 — 익일 시초가·장중 영향"
        right={data.as_of_us_session && <span className="count-chip">미국세션 {data.as_of_us_session}</span>} />

      {/* 시나리오 카드 */}
      {sc.length > 0 && (
        <div className="nd-grid nd-grid-2" style={{ marginBottom: 6 }}>
          {sc.map((s, i) => (
            <div className={"card card-pad nd-scn" + (i === 0 ? " primary" : "")} key={i}>
              <div className="nd-scn-hd">
                <i className={"ti ti-" + (i === 0 ? "bulb" : "alert-hexagon")} aria-hidden="true" />
                <b>{stripEmoji(s.name)}</b>
                {s.confidence && <Badge kind={CONF[s.confidence] || "mut"} dot>확신 {s.confidence}</Badge>}
              </div>
              <p className="nd-scn-r">{stripEmoji(s.rationale)}</p>
            </div>
          ))}
        </div>
      )}

      {/* 핵심 드라이버 — 카드 그리드 */}
      <SectionHd icon="route" title="핵심 드라이버" count={drivers.length} desc="간밤 요인별 익일 영향 (영향도순)" />
      <div className="nd-grid">
        {drivers.map((d, i) => {
          const st = STRENGTH[d.strength] || STRENGTH.low;
          return (
            <div className="card card-pad nd-driver" style={{ "--dc": `var(--${dirCls(d.direction)})` }} key={i}>
              <div className="nd-driver-top">
                <span className="nd-driver-cat">{d.category}</span>
                <span className="nd-driver-arr" style={{ color: `var(--${dirCls(d.direction)})` }}>{dirArrow(d.direction)}</span>
              </div>
              <div className="nd-driver-sig">{stripEmoji(d.signal)}</div>
              <div className="nd-driver-meta">
                <Badge kind={st.kind} dot>{st.label}</Badge>
                <span className="nd-chip">{CERT[d.certainty] || d.certainty}</span>
                <span className="nd-chip mut">{d.lag}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 예측 검증 · 신뢰도 (scorecard + forward IC) */}
      <PredictionValidation />

      {/* 영향 섹터 + 아시아 */}
      <div className="nd-grid nd-grid-2">
        {Array.isArray(data.impacted_sectors) && data.impacted_sectors.length > 0 && (
          <div className="card card-pad">
            <div className="sect-hd" style={{ marginBottom: 10 }}><i className="ti ti-affiliate" aria-hidden="true" />영향 섹터</div>
            <div className="nd-sectors">
              {data.impacted_sectors.map((s, i) => (
                <div className="nd-sector" key={i}>
                  <Badge kind={biasKind(s.bias)} dot>{s.bias}</Badge>
                  <b>{s.sector}</b>
                  <span className="nd-sector-d">{s.driver}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {asiaRows.length > 0 && (
          <div className="card card-pad">
            <div className="sect-hd" style={{ marginBottom: 10 }}><i className="ti ti-world" aria-hidden="true" />아시아 동시간대</div>
            <div className="grid grid-stats" style={{ gap: 8 }}>
              {asiaRows.map((a) => (
                <div className="card stat" key={a.k} style={{ boxShadow: "none", border: "1px solid var(--border-soft)" }}>
                  <div className="k">{a.k}</div>
                  <div className="v num" style={{ color: `var(--${dir(a.v)})` }}>{pct(a.v)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 예정 이벤트 — 카드 그리드 */}
      {Array.isArray(data.upcoming_events) && data.upcoming_events.length > 0 && (
        <>
          <SectionHd icon="calendar-event" title="예정 이벤트" count={data.upcoming_events.length} desc="대기 변동성 요인" />
          <div className="nd-grid">
            {data.upcoming_events.slice(0, 9).map((e, i) => (
              <div className="card card-pad nd-event" key={i}>
                <div className="nd-event-top">
                  <span className="nd-event-date num">{e.date}</span>
                  {e.importance && <Badge kind={e.importance === "high" ? "warn" : "mut"} dot>{e.importance}</Badge>}
                </div>
                <div className="nd-event-title">{stripEmoji(e.title)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 뉴스 하이라이트 — 카드 그리드 */}
      {Array.isArray(data.news_highlights) && data.news_highlights.length > 0 && (
        <>
          <SectionHd icon="news" title="뉴스 하이라이트" count={data.news_highlights.length}
            desc={ns.note || "근거 헤드라인 (감성은 방향 예측 아님)"}
            right={<span className="count-chip">긍 {ns.pos ?? 0} · 부 {ns.neg ?? 0} · 중 {ns.neu ?? 0}</span>} />
          <div className="nd-grid">
            {data.news_highlights.slice(0, 9).map((n, i) => {
              const s = SENT[n.sentiment] || SENT.neu;
              return (
                <a className="card card-pad nd-news-card" key={i} href={n.link} target="_blank" rel="noopener noreferrer">
                  <div className="nd-news-meta">
                    <Badge kind={s.kind} dot>{s.label}</Badge>
                    <span className="nd-news-date num">{(n.date || "").slice(0, 10)}</span>
                  </div>
                  <div className="nd-news-title">{stripEmoji(n.title)}</div>
                  {n.keyword && <span className="nd-news-kw">{n.keyword}</span>}
                </a>
              );
            })}
          </div>
        </>
      )}

      {/* 리스크 */}
      {Array.isArray(data.risks) && data.risks.length > 0 && (
        <>
          <SectionHd icon="alert-triangle" title="리스크" count={data.risks.length} />
          <div className="card card-pad">
            <ul className="why-list" style={{ paddingLeft: 2, margin: 0 }}>
              {data.risks.slice(0, 8).map((r, i) => <li key={i}>{stripEmoji(r)}</li>)}
            </ul>
          </div>
        </>
      )}

      {data.disclaimer && (
        <p className="disclaimer" style={{ marginTop: 10 }}><i className="ti ti-info-circle" aria-hidden="true" /> {data.disclaimer}</p>
      )}
    </>
  );
}
