import { useState, useMemo } from "react";
import { useApi } from "../lib/useApi.js";
import { useDetail } from "../components/DetailModal.jsx";
import { SectionHd, Empty, ErrBox, Skeletons } from "../components/ui.jsx";
import DDaySlider from "../components/DDaySlider.jsx";
import { stripEmoji } from "../lib/format.js";
import {
  CAL_CATS, CAT_ORDER, catMeta, marketLabel, monthGrid, asEvents,
  ymd, ddayNum, ddayLabel, todayMidnight, impMeta, impRank, eventImpact,
} from "../lib/calendar.js";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const MK = [{ v: "", label: "전체" }, { v: "KR", label: "국내" }, { v: "US", label: "해외" }];

export default function CalendarPage() {
  const t0 = todayMidnight();
  const [cur, setCur] = useState({ y: t0.getFullYear(), m: t0.getMonth() });
  const [cats, setCats] = useState(() => new Set()); // 비어있으면 전체
  const [market, setMarket] = useState("");
  const [selDay, setSelDay] = useState(ymd(t0));

  // 그리드가 직전/다음달 일부를 포함하므로 여유 범위로 조회
  const from = ymd(new Date(cur.y, cur.m, 1 - 7));
  const to = ymd(new Date(cur.y, cur.m + 1, 7));
  const q = `/api/calendar/events?from=${from}&to=${to}` + (market ? `&market=${market}` : "");
  const { data, loading, error, reload } = useApi(q);

  const events = useMemo(() => {
    const all = asEvents(data);
    return cats.size ? all.filter((e) => cats.has(e.category)) : all;
  }, [data, cats]);

  const byDay = useMemo(() => {
    const m = {};
    events.forEach((e) => { const k = (e.date || "").slice(0, 10); if (k) (m[k] = m[k] || []).push(e); });
    return m;
  }, [events]);

  const grid = monthGrid(cur.y, cur.m);
  const monthEvents = events.filter((e) => {
    const d = (e.date || "").slice(0, 7);
    return d === `${cur.y}-${String(cur.m + 1).padStart(2, "0")}`;
  });
  const selEvents = (byDay[selDay] || []).slice().sort((a, b) => (a.category || "").localeCompare(b.category || ""));

  const shift = (n) => {
    const d = new Date(cur.y, cur.m + n, 1);
    setCur({ y: d.getFullYear(), m: d.getMonth() });
  };
  const toThisMonth = () => setCur({ y: t0.getFullYear(), m: t0.getMonth() });
  const toggleCat = (c) => setCats((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });

  return (
    <>
      <DDaySlider />
      <SectionHd icon="calendar-month" title="이벤트 캘린더" count={loading ? null : monthEvents.length}
        desc="실적·배당·신규상장·분할·공시·만기·거시 일정 (SERVER 집계)"
        right={
          <div className="cal-monthnav">
            <button className="btn" onClick={() => shift(-1)} aria-label="이전 달"><i className="ti ti-chevron-left" /></button>
            <button className="btn cal-cur" onClick={toThisMonth}>{cur.y}.{String(cur.m + 1).padStart(2, "0")}</button>
            <button className="btn" onClick={() => shift(1)} aria-label="다음 달"><i className="ti ti-chevron-right" /></button>
          </div>
        } />

      <div className="cal-filters">
        <div className="seg cal-mkt">
          {MK.map((o) => (
            <button key={o.v} className={market === o.v ? "on" : ""} onClick={() => setMarket(o.v)}>{o.label}</button>
          ))}
        </div>
        <div className="cal-cats">
          {CAT_ORDER.map((c) => {
            const m = CAL_CATS[c]; const on = cats.has(c);
            return (
              <button key={c} className={"cal-chip cc-" + m.cls + (on ? " on" : "")} onClick={() => toggleCat(c)}>
                <i className={"ti ti-" + m.icon} aria-hidden="true" />{m.label}
              </button>
            );
          })}
          {cats.size > 0 && <button className="cal-chip cc-clear" onClick={() => setCats(new Set())}>전체</button>}
        </div>
      </div>

      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <>
          <div className="cal-grid card" role="grid" aria-label="월간 일정">
            {WD.map((w, i) => (
              <div key={w} className={"cal-wd" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}>{w}</div>
            ))}
            {grid.map((cell) => {
              const evs = byDay[cell.ymd] || [];
              const sel = cell.ymd === selDay;
              return (
                <button key={cell.ymd}
                  className={"cal-cell" + (cell.inMonth ? "" : " out") + (cell.isToday ? " today" : "") + (sel ? " sel" : "")}
                  onClick={() => setSelDay(cell.ymd)} aria-label={`${cell.ymd} 일정 ${evs.length}건`}>
                  <span className={"cal-dnum" + (cell.dow === 0 ? " sun" : cell.dow === 6 ? " sat" : "")}>{cell.date.getDate()}</span>
                  <span className="cal-dots">
                    {evs.slice(0, 4).map((e, i) => (
                      <i key={i} className={"cal-dot cd-" + catMeta(e.category).cls} title={catMeta(e.category).label + " · " + e.title} />
                    ))}
                    {evs.length > 4 && <i className="cal-more">+{evs.length - 4}</i>}
                  </span>
                </button>
              );
            })}
            {loading && <div className="cal-loading"><Skeletons n={1} cls="sk-card" /></div>}
          </div>

          <div className="cal-daylist">
            <h3 className="cal-dl-hd">
              <i className="ti ti-calendar-event" aria-hidden="true" />
              {selDay}
              {(() => { const n = ddayNum(selDay); return n != null ? <span className={"cal-dl-dday" + (n === 0 ? " today" : "")}>{ddayLabel(n)}</span> : null; })()}
              <span className="cal-dl-cnt">{selEvents.length}건</span>
            </h3>
            {selEvents.length === 0 ? <Empty icon="calendar-off">선택한 날짜에 일정이 없습니다</Empty> : (
              <ul className="cal-events">
                {selEvents.map((e, i) => <EventRow key={e.id || i} e={e} />)}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}

function EventRow({ e }) {
  const c = catMeta(e.category);
  const { open } = useDetail();
  const clickable = !!e.symbol;
  const imp = impMeta(e.importance);
  const showImp = impRank(e.importance) >= 1; // 보통·높음만 배지 표시(낮음은 생략)
  const impact = eventImpact(e);
  return (
    <li className={"cal-ev ce-" + c.cls}>
      <span className="ce-cat"><i className={"ti ti-" + c.icon} aria-hidden="true" />{c.label}</span>
      <div className="ce-body">
        <button className={"ce-title" + (clickable ? " link" : "")} disabled={!clickable}
          onClick={() => clickable && open({ code: e.symbol, name: e.name })}>
          {e.title}{e.name ? <b> · {e.name}</b> : null}
          {e.symbol ? <span className="ce-code num">{e.symbol}</span> : null}
        </button>
        <div className="ce-meta">
          {showImp && <span className={"ce-imp " + imp.cls} title="이벤트 중요도">중요도 {imp.label}</span>}
          {e.market && <span className="ce-mkt">{marketLabel(e.market)}</span>}
          {e.source && <span className="ce-src">{e.source}</span>}
          {e.source_url && (
            <a className="ce-link" href={e.source_url} target="_blank" rel="noopener noreferrer">
              원문 <i className="ti ti-external-link" aria-hidden="true" />
            </a>
          )}
        </div>
        {impact && <p className="ce-impact"><i className="ti ti-bulb" aria-hidden="true" />{stripEmoji(impact)}</p>}
      </div>
    </li>
  );
}
