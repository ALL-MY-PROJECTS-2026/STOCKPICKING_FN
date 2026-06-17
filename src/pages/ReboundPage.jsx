import { useState } from "react";
import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, Segmented, ListControls } from "../components/ui.jsx";
import StockCard from "../components/StockCard.jsx";
import { useListView } from "../lib/useListView.js";
import { fixed, eok } from "../lib/format.js";

const TABS = [
  { value: "/api/rebound", label: "반등", icon: "trending-up", desc: "낙폭 과대 + 수급 유입 종목" },
  { value: "/api/sharp-rebound", label: "급반등", icon: "rocket", desc: "단기 급반등 신호 (백테스트 엣지 동반)" },
  { value: "/api/dip-quality", label: "낙폭우량", icon: "diamond", desc: "낙폭 + 펀더멘털 우량 결합" },
];

/** 탭별 뱃지/지표 구성 — 실제 응답 스키마에 맞춤 */
function decorate(sel, s) {
  if (sel === "/api/rebound")
    return {
      badge: s.held ? <Badge kind="ok" dot>보유</Badge> : s.tracked ? <Badge kind="mut" dot>추적</Badge> : null,
      metrics: [
        { k: "낙폭", v: "-" + fixed(s.drop, 0) + "%", cls: "down" },
        { k: "순매수", v: eok(s.net_eok), cls: s.net_eok >= 0 ? "up" : "down" },
        { k: "ROE", v: fixed(s.roe, 0) + "%" },
        { k: "거래", v: fixed(s.vol_ratio, 1) + "배" },
      ],
    };
  if (sel === "/api/sharp-rebound")
    return {
      badge: s.tier_edge ? <Badge kind="up" dot title={s.tier_edge}>{String(s.tier_edge).split("·")[0]}</Badge> : s.held ? <Badge kind="ok" dot>보유</Badge> : null,
      metrics: [
        { k: "낙폭", v: "-" + fixed(s.drop, 0) + "%", cls: "down" },
        { k: "순매수", v: eok(s.net_eok), cls: s.net_eok >= 0 ? "up" : "down" },
        { k: "ROE", v: fixed(s.roe, 0) + "%" },
        { k: "PER", v: fixed(s.per, 1) },
      ],
    };
  // dip-quality
  return {
    badge: s.held ? <Badge kind="ok" dot>보유</Badge> : s.bookmarked ? <Badge kind="warn" dot>북마크</Badge> : null,
    metrics: [
      { k: "낙폭", v: "-" + fixed(s.drop, 0) + "%", cls: "down" },
      { k: "ROE", v: fixed(s.roe, 0) + "%" },
      { k: "PER", v: fixed(s.per, 1) },
      { k: "PBR", v: fixed(s.pbr, 2) },
    ],
  };
}

export default function ReboundPage() {
  const [sel, setSel] = useState("/api/rebound");
  const { data, loading, error, reload } = useApi(sel);
  const items = data?.items || [];
  const tab = TABS.find((t) => t.value === sel);
  const lv = useListView(items, { pageSize: 12 });

  return (
    <>
      <SectionHd icon={tab.icon} title="반등 발굴" count={loading ? null : items.length}
        desc={data?.note || tab.desc}
        right={<Segmented value={sel} onChange={setSel} options={TABS.map((t) => ({ value: t.value, label: t.label }))} />} />
      <ListControls view={lv} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-stocks">
          {loading ? <Skeletons n={9} /> : items.length === 0 ? <Empty /> :
            lv.view.map((s) => {
              const { badge, metrics } = decorate(sel, s);
              return <StockCard key={s.code} s={s} score={s.score} badge={badge} metrics={metrics} />;
            })}
        </div>
      )}
    </>
  );
}
