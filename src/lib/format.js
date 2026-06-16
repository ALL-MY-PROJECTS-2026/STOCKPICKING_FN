// 숫자/통화/등락 포맷 (한국 관례: 상승=빨강, 하락=파랑)

export const won = (v) => {
  if (v == null || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR");
};

export const wonShort = (v) => {
  if (v == null || isNaN(v)) return "-";
  const n = Number(v);
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(1) + "조";
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(0) + "억";
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(0) + "만";
  return won(n);
};

// 억원 단위 값(net_eok 등) → "+90.6억"
export const eok = (v) => {
  if (v == null || isNaN(v)) return "-";
  const n = Number(v);
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "억";
};

export const pct = (v, d = 2) => {
  if (v == null || isNaN(v)) return "-";
  const n = Number(v);
  return (n >= 0 ? "+" : "") + n.toFixed(d) + "%";
};

export const dir = (v) => (v > 0 ? "up" : v < 0 ? "down" : "flat");
export const arrow = (v) => (v > 0 ? "▲" : v < 0 ? "▼" : "·");

export const scoreClass = (s) => (s >= 70 ? "s-hi" : s >= 50 ? "s-md" : "s-lo");

export const fixed = (v, d = 1) =>
  v == null || isNaN(v) ? "-" : Number(v).toFixed(d);

// phase tier → css class
export const phaseClass = (tier) =>
  ({ accel: "accel", strong: "strong", early: "early", cool: "cool" }[tier] || "neutral");
