import { useApi } from "../lib/useApi.js";
import { useListView } from "../lib/useListView.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, ListControls } from "../components/ui.jsx";
import { useDetail } from "../components/DetailModal.jsx";
import MyBookmarkButton from "../components/MyBookmarkButton.jsx";
import { won, pct, dir, arrow, fixed } from "../lib/format.js";

/** SERVER 북마크 카드 — 읽기전용(BN 쓰기 없음). 별 대신 브라우저 북마크 버튼. */
function BmCard({ c }) {
  const { open } = useDetail();
  return (
    <div className="card scard" onClick={() => open(c)}>
      <div className="scard-top">
        <div style={{ minWidth: 0 }}>
          <div className="nm" title={c.name}>{c.name}</div>
          <div className="code num">{c.code}{c.market ? " · " + c.market : ""}</div>
        </div>
        <div className="scard-top-right">
          <MyBookmarkButton stock={c} />
        </div>
      </div>
      <div className="scard-price">
        <span className="p num">{won(c.price)}</span>
        {c.ret_pct != null && (
          <span className={"chg chg-pill " + dir(c.ret_pct)} title="북마크 시점 대비 수익률">
            {arrow(c.ret_pct)} {pct(c.ret_pct)}
          </span>
        )}
      </div>
      <div className="scard-metrics">
        <span>경과 <b className="num">{c.elapsed_days}일</b></span>
        {c.alpha_pct != null && <span>α <b className="num" style={{ color: `var(--${dir(c.alpha_pct)})` }}>{pct(c.alpha_pct)}</b></span>}
        {c.roe != null && <span>ROE <b className="num">{fixed(c.roe, 1)}%</b></span>}
        {c.per != null && <span>PER <b className="num">{fixed(c.per, 1)}</b></span>}
        {c.pbr != null && <span>PBR <b className="num">{fixed(c.pbr, 2)}</b></span>}
        {c.holding && <Badge kind="ok" dot>보유</Badge>}
      </div>
    </div>
  );
}

export default function BookmarkPage() {
  const { data, loading, error, reload } = useApi("/api/bookmark-value");
  const cards = (data?.cards || []).slice().sort((a, b) => (b.ret_pct ?? -999) - (a.ret_pct ?? -999));
  const lv = useListView(cards, { pageSize: 12 });
  const sm = data?.summary;
  return (
    <>
      <SectionHd icon="star" title="북마크 (SERVER)" count={loading ? null : cards.length}
        desc="SERVER 북마크 시점 대비 수익률 추적 (읽기 전용)"
        right={sm?.avg_ret_pct != null && (
          <span className="count-chip">평균 <b className={dir(sm.avg_ret_pct)} style={{ color: `var(--${dir(sm.avg_ret_pct)})` }}>{pct(sm.avg_ret_pct)}</b></span>
        )} />
      <ListControls view={lv} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-stocks">
          {loading ? <Skeletons n={8} /> : cards.length === 0 ? <Empty icon="star-off">북마크한 종목이 없습니다</Empty> :
            lv.view.map((c) => <BmCard key={c.code} c={c} />)}
        </div>
      )}
    </>
  );
}
