import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, ListControls, LazyMount } from "../components/ui.jsx";
import StockCard from "../components/StockCard.jsx";
import { useDetail } from "../components/DetailModal.jsx";
import PromptCopyButton from "../components/PromptCopyButton.jsx";
import { useListView } from "../lib/useListView.js";
import { fixed } from "../lib/format.js";

/** 다중 신호 합치 — /api/consensus (여러 발굴 신호가 겹친 고신뢰 종목) */
function ConsensusSection() {
  const { data, loading, error, reload } = useApi("/api/consensus");
  const { open } = useDetail();
  const items = data?.consensus || [];
  const lv = useListView(items, { pageSize: 12 });
  return (
    <>
      <SectionHd icon="layers-intersect" title="다중 신호 합치" count={loading ? null : items.length}
        desc={data?.note || "여러 발굴 신호가 동시에 겹친 고신뢰 종목"}
        right={data?.pool && typeof data.pool === "object" &&
          <span className="count-chip">신호 {Object.keys(data.pool).length}종</span>} />
      <ListControls view={lv} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid grid-stocks"><Skeletons n={6} /></div> :
        items.length === 0 ? <Empty /> : (
          <div className="grid grid-stocks">
            {lv.view.map((s) => (
              <div className="card scard" key={s.code} onClick={() => open(s)}>
                <div className="scard-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="nm" title={s.name}>{s.name}</div>
                    <div className="code num">{s.code}</div>
                  </div>
                  <div className="scard-top-right">
                    <Badge kind="up" dot>{s.count}개 신호</Badge>
                    <PromptCopyButton stock={s} />
                  </div>
                </div>
                <div className="sig-chips">
                  {(s.signals || []).map((sig) => <span className="sig-chip" key={sig}>{sig}</span>)}
                </div>
                {s.held && <Badge kind="ok" dot>보유</Badge>}
              </div>
            ))}
          </div>
        )}
    </>
  );
}

/** 주의 종목 — /api/caution (과열·리스크 높은 종목) */
function CautionSection() {
  const { data, loading, error, reload } = useApi("/api/caution");
  const items = data?.items || [];
  const lv = useListView(items, { pageSize: 12 });
  return (
    <>
      <SectionHd icon="alert-triangle" title="주의 종목" count={loading ? null : items.length}
        desc={data?.note || "급등·과열 등 리스크 높은 종목 (추격 주의)"}
        right={data?.date && <span className="count-chip">기준 {data.date}</span>} />
      <ListControls view={lv} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid grid-stocks"><Skeletons n={6} /></div> :
        items.length === 0 ? <Empty /> : (
          <div className="grid grid-stocks">
            {lv.view.map((s) => (
              <StockCard key={s.code} s={s}
                badge={<Badge kind="warn" dot>위험 {fixed(s.risk, 0)}</Badge>}
                metrics={[
                  { k: "고점거리", v: fixed(s.dist, 0) + "%" },
                  { k: "거래량", v: fixed(s.volume, 1) + "배" },
                ]} />
            ))}
          </div>
        )}
    </>
  );
}

/** 리스크 경고 — /api/risk-warning ({items, n, error} 가드) */
function RiskWarningSection() {
  const { data, loading, error } = useApi("/api/risk-warning");
  const items = data?.items || [];
  if (loading || error || data?.error || items.length === 0) return null; // 데이터 있을 때만 노출
  return (
    <>
      <SectionHd icon="shield-x" title="리스크 경고" count={items.length} desc="시스템 감지 위험 신호" />
      <div className="grid grid-stocks">
        {items.slice(0, 30).map((s) => (
          <StockCard key={s.code} s={s} badge={<Badge kind="down" dot>경고</Badge>}
            metrics={s.reason ? [{ k: "사유", v: s.reason }] : []} />
        ))}
      </div>
    </>
  );
}

export default function ConsensusPage() {
  return (
    <>
      <ConsensusSection />
      <LazyMount><CautionSection /></LazyMount>
      <LazyMount><RiskWarningSection /></LazyMount>
    </>
  );
}
