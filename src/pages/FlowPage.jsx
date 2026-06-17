import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, ListControls } from "../components/ui.jsx";
import StockCard from "../components/StockCard.jsx";
import { useDetail } from "../components/DetailModal.jsx";
import { useListView } from "../lib/useListView.js";
import { fixed, eok } from "../lib/format.js";

/** 보유/북마크 뱃지 (breakout·supply 공용) */
function flagBadge(s) {
  if (s.held) return <Badge kind="ok" dot>보유</Badge>;
  if (s.bookmarked) return <Badge kind="warn" dot>북마크</Badge>;
  return null;
}

/** 돌파(거래량 신고가 근접) — /api/breakout */
function BreakoutSection() {
  const { data, loading, error, reload } = useApi("/api/breakout");
  const items = data?.items || [];
  const lv = useListView(items, { pageSize: 12 });
  return (
    <>
      <SectionHd icon="arrow-big-up-lines" title="거래량 돌파" count={loading ? null : items.length}
        desc={data?.note || "신고가 근접 + 거래량 급증"}
        right={data?.date && <span className="count-chip">기준 {data.date}</span>} />
      <ListControls view={lv} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-stocks">
          {loading ? <Skeletons n={6} /> : items.length === 0 ? <Empty /> :
            lv.view.map((s) => (
              <StockCard key={s.code} s={s} score={s.score} badge={flagBadge(s)}
                metrics={[
                  { k: "고점거리", v: fixed(s.dist, 1) + "%" },
                  { k: "거래Z", v: fixed(s.vz, 1), cls: "up" },
                  { k: "거래량", v: fixed(s.volume, 1) + "배" },
                ]} />
            ))}
        </div>
      )}
    </>
  );
}

/** 수급 급증(순매수 강도) — /api/supply-surge */
function SupplySection() {
  const { data, loading, error, reload } = useApi("/api/supply-surge");
  const items = data?.items || [];
  const lv = useListView(items, { pageSize: 12 });
  return (
    <>
      <SectionHd icon="wave-sine" title="수급 급증" count={loading ? null : items.length}
        desc={data?.note || "기관·외국인 순매수 강도 급등"}
        right={data?.date && <span className="count-chip">기준 {data.date}</span>} />
      <ListControls view={lv} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-stocks">
          {loading ? <Skeletons n={6} /> : items.length === 0 ? <Empty /> :
            lv.view.map((s) => (
              <StockCard key={s.code} s={s} badge={flagBadge(s)}
                metrics={[
                  { k: "수급", v: eok(s.supply), cls: s.supply >= 0 ? "up" : "down" },
                  { k: "강도Z", v: fixed(s.z, 1), cls: "up" },
                  { k: "연속", v: fixed(s.streak, 0) + "일" },
                ]} />
            ))}
        </div>
      )}
    </>
  );
}

/** 매집(연속 순매수 누적) — /api/accumulation. 가격/등락 없는 스키마 → 테이블. */
function AccumulationSection() {
  const { data, loading, error, reload } = useApi("/api/accumulation");
  const { open } = useDetail();
  const items = data?.items || [];
  const lv = useListView(items, { pageSize: 12 });
  return (
    <>
      <SectionHd icon="stack-2" title="매집" count={loading ? null : items.length}
        desc={data?.note || `연속 순매수 ${data?.min_streak ?? ""}일+ 누적 (${data?.lookback ?? "-"}일 관찰)`} />
      <p className="disclaimer" style={{ marginBottom: 10 }}>
        <i className="ti ti-info-circle" /> 세력(외국인/기관/개인) 구분은 종목 클릭 → <b>세력 분석</b>에서 확인하세요.
      </p>
      <ListControls view={lv} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="card card-pad"><Skeletons n={1} /></div> :
        items.length === 0 ? <Empty /> : (
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>
                  <th>종목</th><th>테마</th>
                  <th className="r">연속</th><th className="r">누적 순매수</th><th className="r">상승일</th><th className="r">세력</th>
                </tr>
              </thead>
              <tbody>
                {lv.view.map((s) => (
                  <tr key={s.code} onClick={() => open(s)}>
                    <td>
                      <b>{s.name}</b>
                      <span className="code num" style={{ marginLeft: 8 }}>{s.code}</span>
                    </td>
                    <td>{s.theme || "-"}</td>
                    <td className="r num">{fixed(s.streak, 0)}일</td>
                    <td className="r num" style={{ color: "var(--up)" }}>{eok(s.cum_net_eok)}</td>
                    <td className="r num">{fixed(s.up_days, 0)}</td>
                    <td className="r"><span className="count-chip">분석 ›</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}

export default function FlowPage() {
  return (
    <>
      <BreakoutSection />
      <SupplySection />
      <AccumulationSection />
    </>
  );
}
