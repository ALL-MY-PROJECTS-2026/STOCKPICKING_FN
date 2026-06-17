import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge } from "../components/ui.jsx";
import { useDetail } from "../components/DetailModal.jsx";
import { won, pct, fixed, stripEmoji } from "../lib/format.js";

const convKind = (c) => (/(매우|상|강)/.test(c || "") ? "up" : /(하|약)/.test(c || "") ? "mut" : "warn");

/** 발굴 제안 — /api/proposals (관심등록·관망 권유, 표시 전용 / 매매 아님) */
export default function ProposalsPage() {
  const { data, loading, error, reload } = useApi("/api/proposals");
  const { open } = useDetail();
  const items = data?.items || [];
  return (
    <>
      <SectionHd icon="bulb" title="발굴 제안" count={loading ? null : items.length}
        desc={stripEmoji(data?.horizon?.text) || "다중 신호 기반 관심 제안 (표시 전용·매매 아님)"}
        right={data?.posture?.tier && <Badge kind="mut" dot>국면 {data.posture.tier}</Badge>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid grid-themes"><Skeletons n={6} /></div> :
        items.length === 0 ? <Empty /> : (
          <>
            <div className="grid grid-themes">
              {items.map((s) => {
                const z = s.zones || {};
                return (
                  <div className="card card-pad prop-card" key={s.code} onClick={() => open(s)}>
                    <div className="scard-top">
                      <div style={{ minWidth: 0 }}>
                        <div className="nm" title={s.name}>{s.name}</div>
                        <div className="code num">{s.code} · {s.theme}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flex: "none" }}>
                        {s.combo?.tier && <Badge kind="up" dot>{s.combo.tier} {s.combo.label}</Badge>}
                        {s.conviction && <Badge kind={convKind(s.conviction)}>확신 {s.conviction}</Badge>}
                      </div>
                    </div>

                    {Array.isArray(s.signals) && s.signals.length > 0 && (
                      <div className="sig-chips">{s.signals.map((g) => <span className="sig-chip" key={g}>{g}</span>)}</div>
                    )}
                    {s.thesis && <p className="prop-thesis">{stripEmoji(s.thesis)}</p>}

                    <div className="prop-zones">
                      <div><span>현재</span><b className="num">{won(z.price)}</b></div>
                      <div><span>목표</span><b className="num" style={{ color: "var(--up)" }}>{won(z.target)}<em>{z.upside_pct != null ? " " + pct(z.upside_pct, 1) : ""}</em></b></div>
                      <div><span>손절</span><b className="num" style={{ color: "var(--down)" }}>{won(z.stop)}<em>{z.downside_pct != null ? " " + pct(z.downside_pct, 1) : ""}</em></b></div>
                      <div><span>손익비</span><b className="num">{fixed(z.rr, 2)}</b></div>
                    </div>
                  </div>
                );
              })}
            </div>
            {data?.disclaimer && <p className="disclaimer" style={{ marginTop: 14 }}><i className="ti ti-alert-triangle" />{stripEmoji(data.disclaimer)}</p>}
          </>
        )}
    </>
  );
}
