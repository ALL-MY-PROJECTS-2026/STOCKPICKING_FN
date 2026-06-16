import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge } from "../components/ui.jsx";
import StockCard from "../components/StockCard.jsx";
import { fixed, wonShort } from "../lib/format.js";

export default function ValuePage() {
  const { data, loading, error, reload } = useApi("/api/value-picks");
  const items = data?.items || [];
  return (
    <>
      <SectionHd icon="diamond" title="가치주 발굴" count={loading ? null : items.length}
        desc={data?.note || "펀더멘털 · 매집 · 모멘텀 결합 점수"} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-stocks">
          {loading ? <Skeletons n={9} /> : items.length === 0 ? <Empty /> :
            items.map((s) => (
              <StockCard key={s.code} s={s} score={s.pick_score}
                badge={s.bookmarked ? <Badge kind="warn" dot>관심</Badge> : null}
                metrics={[
                  { k: "ROE", v: fixed(s.roe, 1) + "%" },
                  { k: "PER", v: fixed(s.per, 1) },
                  { k: "PBR", v: fixed(s.pbr, 2) },
                  { k: "매집", v: wonShort(s.accum) },
                ]} />
            ))}
        </div>
      )}
    </>
  );
}
