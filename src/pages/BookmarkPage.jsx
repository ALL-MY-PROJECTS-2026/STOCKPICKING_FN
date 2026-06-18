import { useState, useMemo } from "react";
import { useApi } from "../lib/useApi.js";
import { useListView } from "../lib/useListView.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, ListControls, Segmented } from "../components/ui.jsx";
import { useDetail } from "../components/DetailModal.jsx";
import MyBookmarkButton from "../components/MyBookmarkButton.jsx";
import PromptCopyButton from "../components/PromptCopyButton.jsx";
import { won, pct, dir, arrow, fixed } from "../lib/format.js";

const num = (v, f = -1e9) => (v == null || isNaN(v) ? f : Number(v));
const SORTS = [
  { v: "ret", label: "수익률순", fn: (a, b) => num(b.ret_pct) - num(a.ret_pct) },
  { v: "score", label: "종합점수순", fn: (a, b) => num(b.score) - num(a.score) },
  { v: "value", label: "가치점수순", fn: (a, b) => num(b.verdict?.value_score) - num(a.verdict?.value_score) },
  { v: "recent", label: "최근 추가순", fn: (a, b) => num(a.elapsed_days, 1e9) - num(b.elapsed_days, 1e9) },
  { v: "old", label: "오래된순(D+)", fn: (a, b) => num(b.elapsed_days) - num(a.elapsed_days) },
  { v: "name", label: "종목명순", fn: (a, b) => (a.name || "").localeCompare(b.name || "") },
];
const MK = [{ value: "", label: "전체" }, { value: "KOSPI", label: "KOSPI" }, { value: "KOSDAQ", label: "KOSDAQ" }];
const SIG = { BUY: { kind: "up", label: "매수" }, AVOID: { kind: "down", label: "회피" }, NEUTRAL: { kind: "mut", label: "중립" } };

/** 가치점수 산정 분해 툴팁 — verdict.value_factors(수급·α·재무 축×가중치) */
function valueScoreTip(v) {
  if (!v) return "";
  const f = v.value_factors;
  if (!f) return v.grade ? `가치점수 ${v.value_score} (${v.grade})` : "";
  const parts = ["supply", "alpha", "fin"].filter((k) => f[k]).map((k) => `${f[k].detail}=${f[k].points}`);
  let s = `가치점수 ${v.value_score} = ${parts.join(" + ")}`;
  if (v.reliability_tier) s += `\n신뢰도 ${v.reliability_tier}${v.reliability != null ? ` (${fixed(v.reliability, 0)})` : ""}`;
  if (v.alpha_sig) s += ` · α ${v.alpha_sig}(t≈${fixed(v.alpha_tstat, 1)})`;
  return s;
}

/** SERVER 북마크 카드 — 읽기전용. 별 대신 브라우저 북마크 버튼. */
function BmCard({ c }) {
  const { open } = useDetail();
  const v = c.verdict;
  const sig = SIG[c.predict_signal];
  return (
    <div className="card scard" onClick={() => open(c)}>
      <div className="scard-top">
        <div style={{ minWidth: 0 }}>
          <div className="nm" title={c.name}>{c.name}</div>
          <div className="code num">{c.code}{c.market ? " · " + c.market : ""}</div>
        </div>
        <div className="scard-top-right">
          <PromptCopyButton stock={c} />
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
      <div className="bm-scores">
        {c.score != null && (
          <span className="bm-sc" title="종합 점수 — 수급·재무·모멘텀 등 종합(0~100, 높을수록 강함)">
            <i className="ti ti-bolt" aria-hidden="true" />종합 <b className="num">{fixed(c.score, 0)}</b>
          </span>
        )}
        {v?.value_score != null && (
          <span className="bm-sc bm-val" title={valueScoreTip(v)}>
            가치 <b className="num">{fixed(v.value_score, 0)}</b>
            {v.grade && <em className="bm-grade">{v.grade}</em>}
            <i className="ti ti-info-circle bm-i" aria-hidden="true" />
          </span>
        )}
        {c.fin_grade && <span className="bm-sc" title="재무 등급">재무 <b>{c.fin_grade}</b></span>}
        {sig && <Badge kind={sig.kind} dot title="예측 신호">{sig.label}</Badge>}
      </div>
      <div className="scard-metrics">
        <span>경과 <b className="num">D+{c.elapsed_days}</b></span>
        {c.alpha_pct != null && <span>α <b className="num" style={{ color: `var(--${dir(c.alpha_pct)})` }}>{pct(c.alpha_pct)}</b></span>}
        {c.roe != null && <span>ROE <b className="num">{fixed(c.roe, 1)}%</b></span>}
        {c.per != null && <span>PER <b className="num">{fixed(c.per, 1)}</b></span>}
        {c.holding && <Badge kind="ok" dot>보유</Badge>}
      </div>
    </div>
  );
}

export default function BookmarkPage() {
  const { data, loading, error, reload } = useApi("/api/bookmark-value");
  const [sort, setSort] = useState("ret");
  const [market, setMarket] = useState("");

  const cards = useMemo(() => {
    let cs = (data?.cards || []).slice();
    if (market) cs = cs.filter((c) => c.market === market);
    cs.sort((SORTS.find((s) => s.v === sort) || SORTS[0]).fn);
    return cs;
  }, [data, sort, market]);

  const lv = useListView(cards, { pageSize: 12 });
  const sm = data?.summary;

  return (
    <>
      <SectionHd icon="star" title="추천 종목" count={loading ? null : cards.length}
        desc="운영 서버가 선별한 추천 — 시점 대비 수익률 추적 (읽기 전용)"
        right={
          <div className="bm-controls">
            <Segmented value={market} onChange={setMarket} options={MK} />
            <select className="bm-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬 기준">
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
        } />
      {sm && (
        <div className="bm-summary">
          {sm.avg_value != null && <span>평균 가치 <b className="num">{fixed(sm.avg_value, 1)}</b></span>}
          {sm.avg_reliability != null && <span>평균 신뢰도 <b className="num">{fixed(sm.avg_reliability, 0)}</b></span>}
          {sm.buy != null && <span>매수 <b className="num up">{sm.buy}</b></span>}
          {sm.hold != null && <span>보유 <b className="num">{sm.hold}</b></span>}
          {sm.sell != null && <span>매도 <b className="num down">{sm.sell}</b></span>}
        </div>
      )}
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
