import { useState, useEffect } from "react";
import { BN_BASE } from "../api.js";

/**
 * 전역 BN 연결상태 배너 — BN 다운 시 페이지마다 흩어지는 'Failed to fetch' 대신
 * 상단에 한 번만 명확히 안내. /api/health 를 주기적으로 핑.
 */
export default function ConnectionBanner() {
  const [down, setDown] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const r = await fetch(BN_BASE + "/api/health", { cache: "no-store" });
        if (alive) { setDown(!r.ok); setChecked(true); }
      } catch {
        if (alive) { setDown(true); setChecked(true); }
      }
    };
    ping();
    const t = setInterval(ping, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!checked || !down) return null;
  return (
    <div className="conn-banner" role="alert">
      <i className="ti ti-loader" aria-hidden="true" />
      <span className="cb-msg">잠시 서버 업데이트 중이라 연결이 지연되고 있어요 — 잠시만 기다려 주세요. 복구되면 자동으로 표시됩니다.</span>
      <button className="btn" onClick={() => location.reload()}>새로고침</button>
    </div>
  );
}
