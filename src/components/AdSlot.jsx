/**
 * 광고 / 제휴 슬롯 — 레이아웃 '구조'만 마련한다.
 * 실제 광고(AdSense/AdPost) 코드·증권사 제휴(CPA) 링크는 도메인 연결·심사 승인 후 주입.
 * 표시광고 고지 의무에 따라 "광고"·"제휴" 라벨을 항상 노출한다.
 */

export function AdSlot({ id = "ad", format = "leaderboard", label = "광고" }) {
  return (
    <aside className={"ad-slot ad-" + format} data-ad-slot={id} aria-label="광고 영역">
      <span className="ad-tag">{label}</span>
      <span className="ad-ph">광고 영역 (준비 중)</span>
    </aside>
  );
}

/** 증권사 계좌개설 제휴(CPA) 배너 자리 — 실링크는 제휴 승인 후 연결. */
export function PartnerSlot({ compact = false }) {
  return (
    <aside className={"ad-slot partner-slot" + (compact ? " compact" : "")} aria-label="제휴 영역">
      <span className="ad-tag partner">제휴</span>
      <div className="partner-body">
        <b>증권사 계좌개설</b>
        <span className="partner-sub">제휴 배너 자리 (준비 중)</span>
      </div>
    </aside>
  );
}
