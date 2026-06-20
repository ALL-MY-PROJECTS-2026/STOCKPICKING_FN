import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge } from "../components/ui.jsx";
import { pct, dir, stripEmoji } from "../lib/format.js";

const dirArrow = (d) => (d > 0 ? "▲" : d < 0 ? "▼" : "–");
const dirCls = (d) => (d > 0 ? "up" : d < 0 ? "down" : "flat");
const STRENGTH = { high: { kind: "ok", label: "높음" }, medium: { kind: "warn", label: "보통" }, low: { kind: "mut", label: "낮음" } };
const CERT = { verified: "검증", "verified-channel": "검증채널", info: "정보" };
const CONF = { high: "ok", medium: "warn", low: "mut", info: "mut" };
const SENT = { pos: { kind: "ok", label: "긍정" }, neg: { kind: "warn", label: "부정" }, neu: { kind: "mut", label: "중립" } };

/** 다음날 증시 예측 — /api/next-day-insight (간밤 글로벌·수급·이벤트 종합 → 익일 시초가·장중 영향) */
export default function NextDayPage() {
  const { data, loading, error, reload } = useApi("/api/next-day-insight");

  if (loading) return <><SectionHd icon="crystal-ball" title="다음날 증시 예측" /><div className="grid"><Skeletons n={3} cls="sk-card" /></div></>;
  if (error) return <><SectionHd icon="crystal-ball" title="다음날 증시 예측" /><ErrBox onRetry={reload}>{error}</ErrBox></>;
  if (!data) return <><SectionHd icon="crystal-ball" title="다음날 증시 예측" /><Empty>데이터 없음</Empty></>;

  const drivers = (data.drivers || []).slice().sort((a, b) => {
    const o = { high: 0, medium: 1, low: 2 };
    return (o[a.strength] ?? 3) - (o[b.strength] ?? 3);
  });
  const sc = data.scenarios || [];
  const asia = data.asia_markets || {};
  const asiaRows = [
    { k: "니케이225", v: asia.nikkei225_chg },
    { k: "항셍", v: asia.hangseng_chg },
    { k: "상하이", v: asia.shanghai_chg },
  ].filter((x) => x.v != null);
  const ns = data.news_sentiment || {};

  return (
    <>
      <SectionHd icon="crystal-ball" title="다음날 증시 예측"
        desc={data.method || "간밤 글로벌·수급·이벤트 종합 — 익일 시초가·장중 영향"}
        right={data.as_of_us_session && <span className="count-chip">미국세션 {data.as_of_us_session}</span>} />

      {/* 시나리오 */}
      {sc.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 8, marginBottom: 6 }}>
          {sc.map((s, i) => (
            <div className="card card-pad" key={i} style={{ borderLeft: `3px solid var(--${i === 0 ? "primary" : "border"})` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: i === 0 ? "1rem" : ".9rem" }}>{stripEmoji(s.name)}</b>
                {s.confidence && <Badge kind={CONF[s.confidence] || "mut"} dot>확신 {s.confidence}</Badge>}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: ".8rem", color: "var(--muted)", lineHeight: 1.5 }}>{stripEmoji(s.rationale)}</p>
            </div>
          ))}
        </div>
      )}

      {/* 핵심 드라이버 */}
      <SectionHd icon="route" title="핵심 드라이버" count={drivers.length} desc="간밤 요인별 익일 영향 방향·강도 (영향도순)" />
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead><tr><th>요인</th><th>신호</th><th className="r">방향</th><th className="r">영향도</th><th className="r">확신</th><th className="r">시차</th></tr></thead>
          <tbody>
            {drivers.map((d, i) => {
              const st = STRENGTH[d.strength] || STRENGTH.low;
              return (
                <tr key={i}>
                  <td><b>{d.category}</b></td>
                  <td style={{ color: "var(--muted)", fontSize: ".78rem" }}>{stripEmoji(d.signal)}</td>
                  <td className="r" style={{ color: `var(--${dirCls(d.direction)})`, fontWeight: 700 }}>{dirArrow(d.direction)}</td>
                  <td className="r"><Badge kind={st.kind} dot>{st.label}</Badge></td>
                  <td className="r" style={{ fontSize: ".72rem", color: "var(--muted)" }}>{CERT[d.certainty] || d.certainty}</td>
                  <td className="r num" style={{ fontSize: ".72rem", color: "var(--faint)" }}>{d.lag}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 영향 섹터 + 아시아 */}
      <div className="secflow-cols">
        {Array.isArray(data.impacted_sectors) && data.impacted_sectors.length > 0 && (
          <div className="card card-pad">
            <div className="sect-hd" style={{ marginBottom: 10 }}><i className="ti ti-affiliate" aria-hidden="true" />영향 섹터</div>
            <div className="flow" style={{ gap: 8 }}>
              {data.impacted_sectors.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".82rem" }}>
                  <Badge kind={/긍정|호재|상승/.test(s.bias) ? "up" : /부정|악재|하락/.test(s.bias) ? "down" : "mut"} dot>{s.bias}</Badge>
                  <b>{s.sector}</b>
                  <span style={{ marginLeft: "auto", color: "var(--faint)", fontSize: ".72rem" }}>{s.driver}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {asiaRows.length > 0 && (
          <div className="card card-pad">
            <div className="sect-hd" style={{ marginBottom: 10 }}><i className="ti ti-world" aria-hidden="true" />아시아 동시간대</div>
            <div className="flow" style={{ gap: 9 }}>
              {asiaRows.map((a) => (
                <div key={a.k} style={{ display: "flex", justifyContent: "space-between", fontSize: ".84rem" }}>
                  <span style={{ color: "var(--muted)" }}>{a.k}</span>
                  <b className="num" style={{ color: `var(--${dir(a.v)})` }}>{pct(a.v)}</b>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 예정 이벤트 */}
      {Array.isArray(data.upcoming_events) && data.upcoming_events.length > 0 && (
        <>
          <SectionHd icon="calendar-event" title="예정 이벤트" count={data.upcoming_events.length} desc="대기 변동성 요인" />
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr><th>날짜</th><th>일정</th><th className="r">중요도</th></tr></thead>
              <tbody>
                {data.upcoming_events.slice(0, 12).map((e, i) => (
                  <tr key={i}>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>{e.date}</td>
                    <td>{stripEmoji(e.title)}</td>
                    <td className="r">{e.importance && <Badge kind={e.importance === "high" ? "warn" : "mut"} dot>{e.importance}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 뉴스 하이라이트 */}
      {Array.isArray(data.news_highlights) && data.news_highlights.length > 0 && (
        <>
          <SectionHd icon="news" title="뉴스 하이라이트" count={data.news_highlights.length}
            desc={ns.note || "근거 헤드라인 (감성은 방향 예측 아님)"}
            right={<span className="count-chip">긍 {ns.pos ?? 0} · 부 {ns.neg ?? 0} · 중 {ns.neu ?? 0}</span>} />
          <div className="card" style={{ overflow: "hidden" }}>
            {data.news_highlights.slice(0, 10).map((n, i) => {
              const s = SENT[n.sentiment] || SENT.neu;
              return (
                <a className="nd-news" key={i} href={n.link} target="_blank" rel="noopener noreferrer">
                  <Badge kind={s.kind} dot>{s.label}</Badge>
                  <span className="nd-news-t">{stripEmoji(n.title)}</span>
                  <span className="nd-news-d num">{(n.date || "").slice(5, 10)}</span>
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
          <ul className="why-list" style={{ paddingLeft: 4 }}>
            {data.risks.slice(0, 8).map((r, i) => <li key={i}>{stripEmoji(r)}</li>)}
          </ul>
        </>
      )}

      {data.disclaimer && (
        <p className="disclaimer" style={{ marginTop: 10 }}><i className="ti ti-info-circle" aria-hidden="true" /> {data.disclaimer}</p>
      )}
    </>
  );
}
