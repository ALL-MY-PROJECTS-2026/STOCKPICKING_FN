import { useState } from "react";
import { apiGet } from "../api.js";
import { buildObjectiveSummary } from "../lib/stockSummary.js";

async function copyText(text) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  // 비보안 컨텍스트 폴백
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
}

/**
 * 종목 객관지표 JSON 을 클립보드로 복사하는 프롬프트 아이콘 버튼 (카드 우측상단 공용).
 * 클릭 시 /api/stock-detail 를 받아 객관 사실 지표만 추려 JSON 복사 — 에이전트/투자자문 재료용.
 * 클릭 전파 차단(카드 모달 안 열림).
 */
export default function PromptCopyButton({ stock, size = "sm" }) {
  const [state, setState] = useState("idle"); // idle | ok | err

  const onClick = async (e) => {
    e.stopPropagation();
    if (!stock?.code) return;
    try {
      let detail = {};
      try { detail = (await apiGet("/api/stock-detail/" + stock.code)) || {}; } catch { detail = {}; }
      const summary = buildObjectiveSummary(stock, detail, new Date().toISOString());
      await copyText(JSON.stringify(summary, null, 2));
      setState("ok");
    } catch {
      setState("err");
    }
    setTimeout(() => setState("idle"), 1600);
  };

  const icon = state === "ok" ? "ti-check" : state === "err" ? "ti-alert-triangle" : "ti-prompt";
  const label = state === "ok" ? "객관지표 JSON 복사됨" : "종목 객관지표 JSON 복사 (에이전트 전달용 · 사실 지표만)";
  return (
    <button
      type="button"
      className={"prompt-btn" + (state === "ok" ? " ok" : "") + (state === "err" ? " err" : "") + (size === "lg" ? " lg" : "")}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <i className={"ti " + icon} aria-hidden="true" />
    </button>
  );
}
