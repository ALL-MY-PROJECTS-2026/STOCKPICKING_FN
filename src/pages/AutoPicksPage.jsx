import { useApi } from "../lib/useApi.js";
import { useListView } from "../lib/useListView.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, ListControls } from "../components/ui.jsx";
import StockCard from "../components/StockCard.jsx";
import { fixed } from "../lib/format.js";

/** 자동 픽 — /api/auto-picks (자동 발굴 엔진 픽: 점수·세력·뉴스·근거) */
export default function AutoPicksPage() {
  const { data, loading, error, reload } = useApi("/api/auto-picks");
  const picks = (data?.picks || []).map((p) => ({ ...p, change: p.change_pct }));
  const lv = useListView(picks, { pageSize: 12 });
  return (
    <>
      <SectionHd icon="bolt" title="자동 픽" count={loading ? null : picks.length}
        desc="자동 발굴 엔진 선정 — 점수·세력·뉴스 종합"
        right={data?.generated_at && <span className="count-chip">{data.generated_at}</span>} />
      <ListControls view={lv} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-stocks">
          {loading ? <Skeletons n={9} /> : picks.length === 0 ? <Empty /> :
            lv.view.map((s) => (
              <StockCard key={s.code} s={s} score={s.score}
                badge={s.hold_ok ? <Badge kind="ok" dot>보유적합</Badge> : null}
                metrics={[
                  { k: "세력", v: fixed(s.force_score, 0) },
                  { k: "뉴스", v: fixed(s.news_surge_score, 0), cls: s.news_surge_score >= 60 ? "up" : "" },
                  { k: "거래", v: s.volume != null ? fixed(s.volume, 1) + "배" : "-" },
                ]} />
            ))}
        </div>
      )}
    </>
  );
}
