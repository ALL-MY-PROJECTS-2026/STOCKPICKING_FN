import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, ListControls } from "../components/ui.jsx";
import { useDetail } from "../components/DetailModal.jsx";
import { useListView } from "../lib/useListView.js";
import { fixed } from "../lib/format.js";

/** 자동 관심종목 — /api/watchlist (다중신호 + combo 티어 + 근거) */
export default function WatchlistPage() {
  const { data, loading, error, reload } = useApi("/api/watchlist");
  const { open } = useDetail();
  const items = data?.items || [];
  const lv = useListView(items, { pageSize: 12 });
  return (
    <>
      <SectionHd icon="star" title="자동 관심종목" count={loading ? null : items.length}
        desc={data?.note || "다중 신호·근거 기반 자동 선별 워치리스트"}
        right={data?.adaptive != null && <span className="count-chip">{data.adaptive ? "적응형" : "고정"} 가중</span>} />
      <ListControls view={lv} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid grid-stocks"><Skeletons n={9} /></div> :
        items.length === 0 ? <Empty /> : (
          <div className="grid grid-stocks">
            {lv.view.map((s) => (
              <div className="card scard" key={s.code} onClick={() => open(s)}>
                <div className="scard-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="nm" title={s.name}>{s.name}</div>
                    <div className="code num">{s.code}</div>
                  </div>
                  {s.combo?.tier && <Badge kind="up" dot>{s.combo.tier} {s.combo.label}</Badge>}
                </div>
                {Array.isArray(s.signals) && s.signals.length > 0 && (
                  <div className="sig-chips">
                    {s.signals.map((sig) => <span className="sig-chip" key={sig}>{sig}</span>)}
                  </div>
                )}
                {Array.isArray(s.why) && s.why.length > 0 && (
                  <ul className="why-list">
                    {s.why.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                )}
                <div className="scard-metrics">
                  <span>점수 <b className="num">{fixed(s.score, 2)}</b></span>
                  {s.bookmarked && <Badge kind="warn" dot>북마크</Badge>}
                  {s.held && <Badge kind="ok" dot>보유</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}
