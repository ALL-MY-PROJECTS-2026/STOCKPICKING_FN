import { useState } from "react";
import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, Segmented } from "../components/ui.jsx";
import { useDetail } from "../components/DetailModal.jsx";
import { won, fixed } from "../lib/format.js";

const TABS = [
  { value: "alpha-picks", label: "알파", icon: "chart-arrows", desc: "팩터 알파 스코어 랭킹" },
  { value: "quality-picks", label: "퀄리티", icon: "diamond", desc: "재무 우량 팩터 Z 합산 랭킹" },
  { value: "value-alpha", label: "가치알파", icon: "coin", desc: "밸류 팩터 초과수익 기대 랭킹" },
];

/** 탭별 컬럼 정의 — 실제 응답 스키마에 맞춤 */
const COLS = {
  "alpha-picks": [
    { h: "점수", get: (r) => fixed(r.score, 1) },
    { h: "알파", get: (r) => fixed(r.alpha_score, 2), cls: "up" },
  ],
  "quality-picks": [
    { h: "가격", get: (r) => won(r.price) },
    { h: "종합Z", get: (r) => fixed(r.sum_z, 1), cls: "up" },
    { h: "팩터", get: (r) => fixed(r.n_factors, 0) + "개" },
  ],
  "value-alpha": [
    { h: "가격", get: (r) => won(r.price) },
    { h: "밸류α", get: (r) => fixed(r.value_alpha, 3), cls: "up" },
    { h: "판정", get: (r) => r.value_trap ? <Badge kind="down">밸류트랩</Badge> : <Badge kind="ok">양호</Badge> },
  ],
};

export default function AlphaPage() {
  const [sel, setSel] = useState("alpha-picks");
  const { data, loading, error, reload } = useApi(`/api/${sel}`);
  const { open } = useDetail();
  const rows = data?.top || [];
  const tab = TABS.find((t) => t.value === sel);
  const cols = COLS[sel];

  return (
    <>
      <SectionHd icon={tab.icon} title="알파 팩터 픽" count={loading ? null : rows.length}
        desc={tab.desc}
        right={<Segmented value={sel} onChange={setSel} options={TABS.map((t) => ({ value: t.value, label: t.label }))} />} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="card card-pad"><Skeletons n={1} /></div> :
        rows.length === 0 ? <Empty /> : (
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>종목</th><th>테마</th>
                  {cols.map((c) => <th key={c.h} className="r">{c.h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.code} onClick={() => open(r)}>
                    <td><span className={"rank-n" + (i < 3 ? " top" : "")}>{r.rank ?? i + 1}</span></td>
                    <td>
                      <b>{r.name}</b>
                      <span className="code num" style={{ marginLeft: 8 }}>{r.code}</span>
                    </td>
                    <td>{r.theme || "-"}</td>
                    {cols.map((c) => (
                      <td key={c.h} className="r num" style={c.cls ? { color: `var(--${c.cls})` } : null}>{c.get(r)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}
