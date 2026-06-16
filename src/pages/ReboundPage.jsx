import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge } from "../components/ui.jsx";
import StockCard from "../components/StockCard.jsx";
import { fixed, eok } from "../lib/format.js";

export default function ReboundPage() {
  const { data, loading, error, reload } = useApi("/api/rebound");
  const items = data?.items || [];
  return (
    <>
      <SectionHd icon="trending-up" title="반등 후보" count={loading ? null : items.length}
        desc={data?.note || "낙폭 과대 + 수급 유입 종목"}
        right={data?.as_of && <span className="count-chip">기준 {data.as_of}</span>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-stocks">
          {loading ? <Skeletons n={9} /> : items.length === 0 ? <Empty /> :
            items.map((s) => (
              <StockCard key={s.code} s={s} score={s.score}
                badge={s.held ? <Badge kind="ok" dot>보유</Badge> : s.tracked ? <Badge kind="mut" dot>추적</Badge> : null}
                metrics={[
                  { k: "낙폭", v: "-" + fixed(s.drop, 0) + "%", cls: "down" },
                  { k: "순매수", v: eok(s.net_eok), cls: s.net_eok >= 0 ? "up" : "down" },
                  { k: "ROE", v: fixed(s.roe, 0) + "%" },
                  { k: "거래", v: fixed(s.vol_ratio, 1) + "배" },
                ]} />
            ))}
        </div>
      )}
    </>
  );
}
