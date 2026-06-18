// 증시 이벤트 캘린더 — BN /api/calendar 정규화 스키마 표시 헬퍼
// event: { id, date, market, category, title, symbol, name, importance, source, source_url }

export const CAL_CATS = {
  earnings:   { label: "실적",      icon: "report-money",   cls: "earnings" },
  dividend:   { label: "배당",      icon: "coin",           cls: "dividend" },
  ipo:        { label: "신규상장",  icon: "rocket",         cls: "ipo" },
  split:      { label: "분할·증자", icon: "arrows-split",   cls: "split" },
  disclosure: { label: "공시",      icon: "file-text",      cls: "disclosure" },
  expiry:     { label: "만기",      icon: "calendar-clock", cls: "expiry" },
  macro:      { label: "거시·금리", icon: "world",          cls: "macro" },
};
export const CAT_ORDER = ["earnings", "dividend", "ipo", "split", "disclosure", "expiry", "macro"];
export const catMeta = (c) => CAL_CATS[c] || { label: c || "기타", icon: "calendar-event", cls: "etc" };

export const MARKETS = { KR: "국내", US: "해외" };
export const marketLabel = (m) => MARKETS[m] || m || "";

// importance 정규화 → 0(낮음)·1(보통)·2(높음). 문자/숫자/누락 모두 수용.
export function impRank(v) {
  if (v == null) return 1;
  if (typeof v === "number") return v >= 3 || v >= 0.66 ? 2 : v >= 2 || v >= 0.33 ? 1 : 0;
  const s = String(v).toLowerCase();
  if (["high", "h", "상", "3"].includes(s)) return 2;
  if (["low", "l", "하", "1"].includes(s)) return 0;
  return 1;
}

// 중요도 라벨/색 (0 낮음·1 보통·2 높음)
export const IMP_META = {
  2: { label: "높음", cls: "imp-hi" },
  1: { label: "보통", cls: "imp-md" },
  0: { label: "낮음", cls: "imp-lo" },
};
export const impMeta = (v) => IMP_META[impRank(v)];

// 국내외 증시 영향 설명 — BN 필드명 변형(impact/description/market_impact 등) 방어적 수용
export function eventImpact(e) {
  if (!e) return "";
  const v = e.impact ?? e.description ?? e.market_impact ?? e.impact_desc ??
            e.explanation ?? e.explain ?? e.detail ?? e.summary ?? e.note;
  return typeof v === "string" ? v.trim() : "";
}

function parseDate(s) {
  if (!s) return null;
  const p = String(s).slice(0, 10).split("-").map(Number);
  if (p.length < 3 || !p[0]) return null;
  return new Date(p[0], p[1] - 1, p[2]);
}
export function todayMidnight() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
// D-day 숫자: 미래 +, 과거 −, 당일 0
export function ddayNum(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  return Math.round((d - todayMidnight()) / 86400000);
}
export function ddayLabel(n) {
  if (n == null) return "";
  if (n === 0) return "D-DAY";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}
export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 응답 형태 차이 흡수(배열 / {events} / {items})
export const asEvents = (data) =>
  Array.isArray(data) ? data : data?.events || data?.items || [];

// 일요일 시작 6주(42칸) 월 그리드
export function monthGrid(year, month /* 0-based */) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const today = ymd(todayMidnight());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const id = ymd(d);
    return { date: d, ymd: id, dow: d.getDay(), inMonth: d.getMonth() === month, isToday: id === today };
  });
}

// 다가오는 주요 일정 N개(오늘 이후, 날짜 오름차순·중요도 내림차순)
export function upcoming(events, n = 14) {
  return (events || [])
    .map((e) => ({ ...e, _dd: ddayNum(e.date), _imp: impRank(e.importance) }))
    .filter((e) => e._dd != null && e._dd >= 0)
    .sort((a, b) => a._dd - b._dd || b._imp - a._imp)
    .slice(0, n);
}
