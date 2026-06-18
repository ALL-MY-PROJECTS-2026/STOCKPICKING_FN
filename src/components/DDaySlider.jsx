import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../lib/useApi.js";
import { useDetail } from "./DetailModal.jsx";
import { stripEmoji } from "../lib/format.js";
import { asEvents, upcoming, catMeta, marketLabel, ddayLabel, ymd, todayMidnight, eventImpact } from "../lib/calendar.js";

/**
 * 상단 D-DAY 슬라이드 — 다가오는 주요 증시 일정을 카드 슬라이드로 표시.
 * 자동 회전(4.5s) · 좌우 버튼 · 도트. 종목코드 있으면 클릭 시 상세모달, 없으면 캘린더로 이동.
 * 데이터 없거나 BN 미가동이면 조용히 숨김.
 */
export default function DDaySlider() {
  const from = ymd(todayMidnight());
  const to = ymd(new Date(todayMidnight().getTime() + 45 * 86400000));
  const { data, loading } = useApi(`/api/calendar/events?from=${from}&to=${to}`);
  const list = useMemo(() => upcoming(asEvents(data), 14), [data]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);
  const nav = useNavigate();
  const { open } = useDetail();

  useEffect(() => { if (idx >= list.length) setIdx(0); }, [list.length, idx]);
  useEffect(() => {
    if (paused || list.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 4500);
    return () => clearInterval(t);
  }, [paused, list.length]);
  useEffect(() => {
    const el = trackRef.current?.children?.[idx];
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [idx]);

  if ((loading && !list.length) || !list.length) return null;
  const go = (e) => { if (e.symbol) open({ code: e.symbol, name: e.name }); else nav("/calendar"); };
  const step = (d) => setIdx((i) => (i + d + list.length) % list.length);

  return (
    <div className="dday" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="dday-hd">
        <i className="ti ti-calendar-star" aria-hidden="true" /> 주요 일정
        {list.length > 1 && (
          <span className="dday-nav">
            <button className="btn" onClick={() => step(-1)} aria-label="이전 일정"><i className="ti ti-chevron-left" /></button>
            <button className="btn" onClick={() => step(1)} aria-label="다음 일정"><i className="ti ti-chevron-right" /></button>
          </span>
        )}
      </div>
      <div className="dday-track" ref={trackRef}>
        {list.map((e) => {
          const c = catMeta(e.category);
          const soon = e._dd <= 3;
          const impact = eventImpact(e);
          return (
            <button className={"dday-card dc-" + c.cls} key={e.id || e.title + e.date}
              onClick={() => go(e)} title={e.title + (e.name ? ` · ${e.name}` : "") + (impact ? `\n${stripEmoji(impact)}` : "")}>
              <span className={"dday-badge" + (soon ? " soon" : "")}>{ddayLabel(e._dd)}</span>
              <span className="dc-cat"><i className={"ti ti-" + c.icon} aria-hidden="true" />{c.label}
                {e._imp >= 2 && <em className="dc-imp">핵심</em>}
                {e.market && <em className="dc-mkt">{marketLabel(e.market)}</em>}</span>
              <span className="dc-title">{e.title}{e.name ? <b> · {e.name}</b> : null}</span>
              {impact ? <span className="dc-impact">{stripEmoji(impact)}</span> : <span className="dc-date num">{(e.date || "").slice(0, 10)}</span>}
            </button>
          );
        })}
      </div>
      {list.length > 1 && (
        <div className="dday-dots">
          {list.map((_, i) => (
            <button key={i} className={i === idx ? "on" : ""} onClick={() => setIdx(i)} aria-label={`${i + 1}번째 일정으로`} />
          ))}
        </div>
      )}
    </div>
  );
}
