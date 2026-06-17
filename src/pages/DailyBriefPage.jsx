import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, Heat } from "../components/ui.jsx";
import { useDetail } from "../components/DetailModal.jsx";
import { eok, fixed } from "../lib/format.js";

const POSTURE_RC = { positive: "var(--up)", good: "var(--up)", neutral: "var(--flat)",
  caution: "var(--warn)", negative: "var(--down)", bad: "var(--down)" };

const COUNTS = [
  { k: "breakout", label: "돌파", to: "/flow" },
  { k: "value", label: "가치", to: "/value" },
  { k: "dip", label: "낙폭", to: "/rebound" },
  { k: "caution", label: "주의" },
  { k: "watchlist", label: "관심" },
];

/** 클릭 시 상세 모달 여는 종목 행 (code/name 만 있어도 모달이 code 로 조회) */
function NameRow({ s, open }) {
  return (
    <div className="holder" style={{ cursor: "pointer" }} onClick={() => open(s)}>
      <span className="hn">{s.name}</span>
      <b className="code num">{s.code}</b>
    </div>
  );
}

function FlowCard({ title, o, kind }) {
  if (!o) return null;
  return (
    <div className="card card-pad brief-flow-card" style={{ borderTop: `2px solid var(--${kind})` }}>
      <div className="k" style={{ color: `var(--${kind})` }}>{title}</div>
      <div className="bf-theme">{o.theme}</div>
      <div className="bf-meta num">
        순매수 <b style={{ color: o.net_eok >= 0 ? "var(--up)" : "var(--down)" }}>{eok(o.net_eok)}</b>
        · heat {fixed(o.heat, 0)}
      </div>
    </div>
  );
}

export default function DailyBriefPage() {
  const { data, loading, error, reload } = useApi("/api/daily-brief");
  const { open } = useDetail();

  if (error) return <ErrBox onRetry={reload}>{error}</ErrBox>;
  if (loading) return (
    <>
      <SectionHd icon="news" title="데일리 브리핑" />
      <div className="grid grid-stats"><Skeletons n={5} cls="sk-card" /></div>
    </>
  );

  const d = data || {};
  const posture = d.posture || {};
  const rc = POSTURE_RC[posture.color] || "var(--primary)";
  const garp = d.garp || [];
  const reversal = d.reversal || [];

  return (
    <>
      <SectionHd icon="news" title="데일리 브리핑"
        desc={d.note || "11개 발굴 위젯 한 줄 종합"}
        right={d.freshness && <Badge kind={d.freshness.level === "fresh" ? "ok" : "warn"} dot>{d.freshness.label} {d.freshness.latest}</Badge>} />

      {/* 헤드라인 + 행동 가이드 */}
      <div className="card card-pad brief-hero">
        <div className="bh-line">{d.headline}</div>
        {d.action && (
          <div className="bh-action">
            <Badge kind="mut">{d.action.tier}</Badge>
            <span>{d.action.text}</span>
          </div>
        )}
      </div>

      {/* 자세(posture) 배너 */}
      {posture.tier && (
        <div className="card regime" style={{ "--rc": rc, marginTop: 14 }}>
          <div className="regime-score"><b>{posture.score}</b><span>{posture.tier}</span></div>
          <div className="regime-body">
            <div className="tier">{posture.tier} 자세</div>
            <div className="advice">{posture.advice}</div>
            {Array.isArray(posture.votes) && (
              <div className="regime-votes">
                {posture.votes.map((v, i) => (
                  <span key={i} className={"phase " + (v.vote > 0 ? "accel" : v.vote < 0 ? "cool" : "neutral")}
                    title={v.detail}>{v.factor} {v.vote > 0 ? "＋" : v.vote < 0 ? "－" : "·"}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 카운트 통계 */}
      <div className="grid grid-stats" style={{ marginTop: 14 }}>
        {COUNTS.map((c) => (
          <div className="card stat" key={c.k}>
            <div className="k">{c.label}</div>
            <div className="v num">{d.counts?.[c.k] ?? "-"}</div>
          </div>
        ))}
      </div>

      {/* 최우선 픽 · 핫테마 · 매집 */}
      <SectionHd icon="star" title="핵심 요약" />
      <div className="grid grid-stats">
        {d.top && (
          <div className="card stat brief-mini" onClick={() => open(d.top)} style={{ cursor: "pointer" }}>
            <div className="k">최우선 픽 <Badge kind="ok">{d.top.tier}</Badge></div>
            <div className="v" style={{ fontSize: "1.15rem" }}>{d.top.name}</div>
            <div className="d">{d.top.combo} · {d.top.theme}</div>
          </div>
        )}
        {d.hot_theme && (
          <div className="card stat">
            <div className="k">핫 테마</div>
            <div className="v" style={{ fontSize: "1.15rem" }}>{d.hot_theme.theme}</div>
            <div style={{ marginTop: 8 }}><Heat v={d.hot_theme.heat} /></div>
          </div>
        )}
        {d.accum && (
          <div className="card stat">
            <div className="k">매집 상위</div>
            <div className="v" style={{ fontSize: "1.15rem" }}>{d.accum.top}</div>
            <div className="d">연속 {d.accum.streak}일 · 총 {d.accum.n}종목</div>
          </div>
        )}
        {d.trust && (
          <div className="card stat">
            <div className="k">신뢰도</div>
            <div className="v num">{d.trust.trust}<span style={{ fontSize: ".8rem", color: "var(--muted)" }}> / 100</span></div>
            <div className="d">{d.trust.tier}</div>
          </div>
        )}
      </div>

      {/* 섹터 자금흐름 요약 */}
      {d.flow && (
        <>
          <SectionHd icon="arrows-exchange" title="자금 흐름" right={<a className="count-chip" href="#/sectors">전체 보기</a>} />
          <div className="brief-flow">
            <FlowCard title="주도" o={d.flow.lead} kind="up" />
            <FlowCard title="이탈 경고" o={d.flow.warn} kind="down" />
            <FlowCard title="초기" o={d.flow.early} kind="accent" />
          </div>
        </>
      )}

      {/* 우량 모멘텀 · 역발상 종목 */}
      <div className="brief-lists">
        <div>
          <SectionHd icon="rocket" title="우량 모멘텀" count={d.garp_n ?? garp.length} />
          <div className="holders">
            {garp.length === 0 ? <Empty /> : garp.map((s) => <NameRow key={s.code} s={s} open={open} />)}
          </div>
        </div>
        <div>
          <SectionHd icon="refresh" title="역발상" count={d.reversal_n ?? reversal.length} />
          <div className="holders">
            {reversal.length === 0 ? <Empty /> : reversal.map((s) => <NameRow key={s.code} s={s} open={open} />)}
          </div>
        </div>
      </div>
    </>
  );
}
