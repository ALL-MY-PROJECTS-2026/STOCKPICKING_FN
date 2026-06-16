import { useState } from "react";
import { useApi } from "../lib/useApi.js";
import { apiSend } from "../api.js";
import { SectionHd, Skeletons, Empty, ErrBox, ChangePill, Badge } from "../components/ui.jsx";
import { useDetail } from "../components/DetailModal.jsx";
import { won, pct, dir, arrow, fixed } from "../lib/format.js";

function BmCard({ c, onRemove }) {
  const { open } = useDetail();
  return (
    <div className="card scard" onClick={() => open(c)}>
      <div className="scard-top">
        <div style={{ minWidth: 0 }}>
          <div className="nm" title={c.name}>{c.name}</div>
          <div className="code num">{c.code} · {c.market}</div>
        </div>
        <button className="icon-btn" style={{ width: 30, height: 30, fontSize: ".95rem" }}
          title="북마크 해제" onClick={(e) => { e.stopPropagation(); onRemove(c.code); }}>
          <i className="ti ti-star-filled" style={{ color: "var(--warn)" }} />
        </button>
      </div>
      <div className="scard-price">
        <span className="p num">{won(c.price)}</span>
        {c.ret_pct != null && (
          <span className={"chg chg-pill " + dir(c.ret_pct)} title="북마크 시점 대비 수익률">
            {arrow(c.ret_pct)} {pct(c.ret_pct)}
          </span>
        )}
      </div>
      <div className="scard-metrics">
        <span>경과 <b className="num">{c.elapsed_days}일</b></span>
        {c.alpha_pct != null && <span>α <b className="num" style={{ color: `var(--${dir(c.alpha_pct)})` }}>{pct(c.alpha_pct)}</b></span>}
        {c.roe != null && <span>ROE <b className="num">{fixed(c.roe, 1)}%</b></span>}
        {c.per != null && <span>PER <b className="num">{fixed(c.per, 1)}</b></span>}
        {c.pbr != null && <span>PBR <b className="num">{fixed(c.pbr, 2)}</b></span>}
        {c.holding && <Badge kind="ok" dot>보유</Badge>}
      </div>
    </div>
  );
}

export default function BookmarkPage() {
  const { data, loading, error, reload } = useApi("/api/bookmark-value");
  const [toast, setToast] = useState(null);
  const cards = (data?.cards || []).slice().sort((a, b) => (b.ret_pct ?? -999) - (a.ret_pct ?? -999));

  const flash = (m, ok = true) => { setToast({ m, ok }); setTimeout(() => setToast(null), 2400); };
  const remove = async (code) => {
    let pass = localStorage.getItem("fn-pass");
    if (!pass) { pass = window.prompt("대시보드 비밀번호"); if (!pass) return; localStorage.setItem("fn-pass", pass); }
    const r = await apiSend("/api/bookmarks", { auth: "admin:" + pass, body: { code, action: "remove" } });
    if (r.ok) { flash("북마크 해제됨"); reload(); }
    else { localStorage.removeItem("fn-pass"); flash("실패 — 비밀번호 확인", false); }
  };

  const sm = data?.summary;
  return (
    <>
      <SectionHd icon="star" title="북마크 / 관심종목" count={loading ? null : cards.length}
        desc="북마크 시점 대비 수익률 추적"
        right={sm?.avg_ret_pct != null && (
          <span className="count-chip">평균 <b className={dir(sm.avg_ret_pct)} style={{ color: `var(--${dir(sm.avg_ret_pct)})` }}>{pct(sm.avg_ret_pct)}</b></span>
        )} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> : (
        <div className="grid grid-stocks">
          {loading ? <Skeletons n={8} /> : cards.length === 0 ? <Empty icon="star-off">북마크한 종목이 없습니다</Empty> :
            cards.map((c) => <BmCard key={c.code} c={c} onRemove={remove} />)}
        </div>
      )}
      {toast && <div className="toast-wrap"><div className={"toast " + (toast.ok ? "ok" : "err")}>{toast.m}</div></div>}
    </>
  );
}
