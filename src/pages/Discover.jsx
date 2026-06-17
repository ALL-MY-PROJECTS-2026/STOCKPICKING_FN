import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge } from "../components/ui.jsx";
import StockCard from "../components/StockCard.jsx";
import { fixed, eok, won, stripEmoji } from "../lib/format.js";

/** BN '오늘의 핵심 종합'(daily-brief) 한 줄 — BN 대시보드와 동일 소스 */
function BriefStrip() {
  const { data } = useApi("/api/daily-brief");
  if (!data?.headline) return null;
  return (
    <div className="card card-pad brief-hero" style={{ marginBottom: 14 }}>
      <div className="bh-line" style={{ fontSize: ".95rem" }}>
        <i className="ti ti-bulb" style={{ color: "var(--primary)", marginRight: 6 }} />
        {stripEmoji(data.headline)}
      </div>
    </div>
  );
}

function RegimeBanner() {
  const { data, loading, error } = useApi("/api/market-regime");
  if (loading) return <div className="sk" style={{ height: 112, borderRadius: "var(--r)" }} />;
  if (error || !data) return null;
  const colorMap = { 위험: "var(--up)", 경계: "var(--warn)", 중립: "var(--muted)", 양호: "var(--ok)", 강세: "var(--ok)" };
  const rc = data.color || colorMap[data.tier] || "var(--primary)";
  return (
    <div className="regime card" style={{ "--rc": rc }}>
      <div className="regime-score">
        <b style={{ color: rc }} className="num">{Math.round(data.score)}</b>
        <span>SCORE</span>
      </div>
      <div className="regime-body">
        <div className="tier" style={{ color: rc }}>{data.tier} 국면</div>
        <div className="advice">{data.advice || data.note}</div>
        <div className="regime-votes">
          {(data.votes || []).slice(0, 6).map((v, i) => (
            <Badge key={i} kind={v.vote > 0 ? "up" : v.vote < 0 ? "down" : "mut"} dot>
              {v.factor}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatRow() {
  const { data } = useApi("/api/market-regime");
  const tp = useApi("/api/top-picks");
  const stats = [
    { k: "추세 평균", v: data ? fixed(data.trend_avg, 1) + "%" : "-", icon: "trending-up" },
    { k: "시장 폭(breadth)", v: data ? fixed(data.breadth, 0) + "%" : "-", icon: "arrows-split" },
    { k: "오늘의 픽", v: tp.data ? (tp.data.picks?.length ?? 0) + "종목" : "-", icon: "sparkles" },
    { k: "사용 테마", v: tp.data ? (tp.data.themes_used?.length ?? tp.data.themes_used ?? "-") : "-", icon: "flame" },
  ];
  return (
    <div className="grid grid-stats">
      {stats.map((s, i) => (
        <div className="card stat" key={i}>
          <div className="k"><i className={"ti ti-" + s.icon} />{s.k}</div>
          <div className="v num">{s.v}</div>
        </div>
      ))}
    </div>
  );
}

function TopPicks() {
  const { data, loading, error, reload } = useApi("/api/top-picks");
  const picks = data?.picks || [];
  return (
    <>
      <SectionHd icon="sparkles" title="핵심 픽" count={loading ? null : picks.length}
        desc="열기·점수·수급 종합 상위 (top-picks)" />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-stocks">
          {loading ? <Skeletons n={8} /> : picks.length === 0 ? <Empty>오늘 픽 없음</Empty> :
            picks.slice(0, 12).map((s) => (
              <StockCard key={s.code} s={s} score={s.score} heat={s.heat}
                badge={s.held ? <Badge kind="ok" dot>보유</Badge> : s.bookmarked ? <Badge kind="warn" dot>관심</Badge> : null}
                metrics={[
                  { k: "열기", v: Math.round(s.heat) },
                  { k: "수급", v: won(Math.round((s.supply || 0) / 1e8)) + "억" },
                  { k: "거래", v: fixed(s.volume, 1) + "배" },
                ]} />
            ))}
        </div>
      )}
    </>
  );
}

function ValuePicks() {
  const { data, loading } = useApi("/api/value-picks");
  const items = (data?.items || []).slice(0, 6);
  return (
    <>
      <SectionHd icon="diamond" title="가치주 발굴" count={loading ? null : items.length}
        desc="펀더멘털 · 매집 · 모멘텀" />
      <div className="grid grid-stocks">
        {loading ? <Skeletons n={3} /> : items.length === 0 ? <Empty /> :
          items.map((s) => (
            <StockCard key={s.code} s={s} score={s.pick_score}
              metrics={[
                { k: "ROE", v: fixed(s.roe, 1) + "%" },
                { k: "PER", v: fixed(s.per, 1) },
                { k: "PBR", v: fixed(s.pbr, 2) },
              ]} />
          ))}
      </div>
    </>
  );
}

function ReboundMini() {
  const { data, loading } = useApi("/api/rebound");
  const items = (data?.items || []).slice(0, 6);
  return (
    <>
      <SectionHd icon="trending-up" title="반등 후보" count={loading ? null : items.length}
        desc="낙폭 과대 + 수급 유입" />
      <div className="grid grid-stocks">
        {loading ? <Skeletons n={3} /> : items.length === 0 ? <Empty /> :
          items.map((s) => (
            <StockCard key={s.code} s={s} score={s.score}
              metrics={[
                { k: "낙폭", v: "-" + fixed(s.drop, 0) + "%", cls: "down" },
                { k: "순매수", v: eok(s.net_eok), cls: s.net_eok >= 0 ? "up" : "down" },
              ]} />
          ))}
      </div>
    </>
  );
}

function SharpReboundMini() {
  const { data, loading } = useApi("/api/sharp-rebound");
  const items = (data?.items || []).slice(0, 6);
  return (
    <>
      <SectionHd icon="rocket" title="급반등 (다음날)" count={loading ? null : items.length}
        desc="단기 급반등 신호 · 백테스트 엣지" />
      <div className="grid grid-stocks">
        {loading ? <Skeletons n={3} /> : items.length === 0 ? <Empty>급반등 후보 없음</Empty> :
          items.map((s) => (
            <StockCard key={s.code} s={s} score={s.score}
              badge={s.tier_edge ? <Badge kind="up" dot>{s.tier_edge}</Badge> : null}
              metrics={[
                { k: "낙폭", v: "-" + fixed(s.drop, 0) + "%", cls: "down" },
                { k: "순매수", v: eok(s.net_eok), cls: s.net_eok >= 0 ? "up" : "down" },
                { k: "PER", v: fixed(s.per, 1) },
              ]} />
          ))}
      </div>
    </>
  );
}

export default function Discover() {
  return (
    <>
      <BriefStrip />
      <RegimeBanner />
      <div style={{ height: 14 }} />
      <StatRow />
      <TopPicks />
      <ValuePicks />
      <ReboundMini />
      <SharpReboundMini />
    </>
  );
}
