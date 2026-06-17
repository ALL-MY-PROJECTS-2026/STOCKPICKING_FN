import { useApi } from "../lib/useApi.js";
import { SectionHd, Skeletons, Empty, ErrBox, Badge, Heat } from "../components/ui.jsx";
import { fixed, pct, dir, won } from "../lib/format.js";
import { useDetail } from "../components/DetailModal.jsx";

function TrustGauge() {
  const { data, loading, error } = useApi("/api/signal-trust");
  if (loading) return <div className="sk" style={{ height: 130, borderRadius: "var(--r)" }} />;
  if (error || !data) return null;
  const tr = Math.round(data.trust ?? 0);
  const rc = tr >= 70 ? "var(--ok)" : tr >= 50 ? "var(--warn)" : "var(--up)";
  // factors 는 객체({freshness:{pct,weight,detail},...}) 또는 배열 둘 다 대응
  const factors = Array.isArray(data.factors)
    ? data.factors.map((f) => (typeof f === "string" ? { name: f } : { name: f.name || f.factor, pct: f.pct }))
    : Object.entries(data.factors || {}).map(([k, v]) => ({ name: k, pct: v?.pct, detail: v?.detail }));
  return (
    <div className="regime card" style={{ "--rc": rc }}>
      <div className="regime-score">
        <b style={{ color: rc }} className="num">{tr}</b><span>TRUST</span>
      </div>
      <div className="regime-body">
        <div className="tier" style={{ color: rc }}>{data.tier} 신뢰도</div>
        <div className="advice">{data.note}</div>
        <div className="regime-votes">
          {factors.slice(0, 6).map((f, i) => (
            <Badge key={i} kind={f.pct >= 80 ? "ok" : f.pct != null && f.pct < 50 ? "warn" : "mut"} dot>
              {f.name}{f.pct != null ? ` ${Math.round(f.pct)}%` : ""}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportStats({ report }) {
  if (!report) return null;
  const stats = [
    { k: "평균 초과수익", v: pct(report.avg_return, 1), icon: "trending-up", cls: dir(report.avg_return) },
    { k: "적중률", v: fixed(report.hit_rate, 1) + "%", icon: "target", cls: report.hit_rate >= 50 ? "up" : "" },
    { k: "표본 수", v: report.n + "개", icon: "database" },
    { k: "코호트", v: report.cohort_days + "일", icon: "calendar" },
  ];
  return (
    <div className="grid grid-stats" style={{ marginBottom: 6 }}>
      {stats.map((s, i) => (
        <div className="card stat" key={i}>
          <div className="k"><i className={"ti ti-" + s.icon} />{s.k}</div>
          <div className="v num" style={s.cls ? { color: `var(--${s.cls})` } : null}>{s.v}</div>
        </div>
      ))}
    </div>
  );
}

function ValidationTable() {
  const { open } = useDetail();
  const { data, loading, error, reload } = useApi("/api/validation");
  const vr = data?.value_rank || {};
  const top = Array.isArray(vr.top) ? vr.top : [];
  return (
    <>
      <SectionHd icon="list-check" title="가치 팩터 랭킹" count={loading ? null : top.length}
        desc={vr.method || "Z-score 결합 가치 상위 (전진 검증)"}
        right={vr.date && <span className="count-chip">기준 {vr.date}</span>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="grid"><Skeletons n={3} cls="sk-card" /></div> :
          top.length === 0 ? <Empty>검증 후보 없음</Empty> : (
            <>
              <ReportStats report={data?.report} />
              <div className="card" style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead><tr><th>#</th><th>종목</th><th>테마</th><th className="r">가치Z</th><th className="r">PBR</th><th className="r">PER</th><th className="r">가격</th></tr></thead>
                  <tbody>
                    {top.slice(0, 20).map((c, i) => (
                      <tr key={c.code || i} onClick={() => open(c)}>
                        <td><span className={"rank-n" + (i < 3 ? " top" : "")}>{i + 1}</span></td>
                        <td><b>{c.name}</b> <span className="code num" style={{ color: "var(--faint)" }}>{c.code}</span></td>
                        <td style={{ color: "var(--muted)", fontSize: ".74rem" }}>{c.theme}</td>
                        <td className="r num"><b style={{ color: "var(--ok)" }}>{fixed(c.value_z ?? c.corr_z ?? c.robust_z, 2)}</b></td>
                        <td className="r num">{fixed(c.pbr, 2)}</td>
                        <td className="r num">{fixed(c.per, 1)}</td>
                        <td className="r num">{won(c.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
    </>
  );
}

const STRAT_LABEL = {
  breakout: "돌파", supply_surge: "수급급증", momentum: "모멘텀", value: "가치",
  garp: "GARP", dip: "낙폭우량", accumulation: "매집",
};
const relKind = (r) => (r === "견고" ? "ok" : r === "보통" ? "warn" : "mut");

/** 전략 백테스트 — /api/signal-backtest (전략별 전진수익 엣지) */
function BacktestSection() {
  const { data, loading, error, reload } = useApi("/api/signal-backtest");
  const rows = data ? Object.keys(STRAT_LABEL)
    .map((k) => ({ key: k, ...(data[k] || {}) }))
    .filter((r) => r.n != null) : [];
  return (
    <>
      <SectionHd icon="chart-histogram" title="전략 백테스트" count={loading ? null : rows.length}
        desc={data?.note || "전략별 진입 후 전진수익 (시장 대비)"}
        right={data?.market_avg != null && <span className="count-chip">시장평균 {pct(data.market_avg, 1)}</span>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="card card-pad"><Skeletons n={1} /></div> :
        rows.length === 0 ? <Empty>백테스트 데이터 없음</Empty> : (
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr>
                <th>전략</th><th className="r">표본</th><th className="r">평균수익</th>
                <th className="r">적중률</th><th className="r">시장대비</th><th className="r">유의성</th><th className="r">신뢰</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td><b>{STRAT_LABEL[r.key]}</b></td>
                    <td className="r num">{r.n}</td>
                    <td className="r num" style={{ color: `var(--${dir(r.avg_fwd)})` }}>{r.avg_fwd != null ? pct(r.avg_fwd, 1) : "-"}</td>
                    <td className="r num">{r.hit != null ? fixed(r.hit, 0) + "%" : "-"}</td>
                    <td className="r num" style={{ color: `var(--${dir(r.vs_market)})` }}>{r.vs_market != null ? pct(r.vs_market, 1) : "-"}</td>
                    <td className="r">{r.sig ? <Badge kind={String(r.sig).startsWith("유의") ? "ok" : "mut"}>{r.sig}</Badge> : "-"}</td>
                    <td className="r">{r.reliability ? <Badge kind={relKind(r.reliability)} dot>{r.reliability}</Badge> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}

/** 점수 예측력 — /api/score-forward (점수 5분위별 전진수익) */
function ScoreForwardSection() {
  const { data, loading, error, reload } = useApi("/api/score-forward");
  const q = data?.quintiles || [];
  return (
    <>
      <SectionHd icon="stairs-up" title="점수 예측력" count={loading ? null : (data?.n ?? null)}
        desc={data?.note || "발굴 점수 5분위별 전진수익 — 단조 증가일수록 점수 유효"}
        right={data?.level && <Badge kind={data.level === "good" ? "ok" : data.level === "bad" ? "up" : "warn"} dot>{data.level}</Badge>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="card card-pad"><Skeletons n={1} /></div> :
        q.length === 0 ? <Empty>예측력 데이터 없음</Empty> : (
          <>
            <div className="grid grid-stats" style={{ marginBottom: 6 }}>
              <div className="card stat"><div className="k">상하위 스프레드</div><div className="v num" style={{ color: `var(--${dir(data.spread)})` }}>{pct(data.spread, 1)}</div></div>
              <div className="card stat"><div className="k">순위상관 ρ</div><div className="v num">{fixed(data.rho, 2)}</div></div>
              <div className="card stat"><div className="k">단조성</div><div className="v" style={{ fontSize: "1.1rem" }}>{data.monotonic ? "단조 ✓" : "비단조"}</div></div>
              <div className="card stat"><div className="k">시장평균</div><div className="v num">{pct(data.market_avg, 1)}</div></div>
            </div>
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead><tr><th>분위</th><th className="r">점수구간</th><th className="r">평균 전진수익</th><th className="r">시장대비</th><th className="r">표본</th></tr></thead>
                <tbody>
                  {q.map((b) => (
                    <tr key={b.q}>
                      <td><b>Q{b.q}</b></td>
                      <td className="r num">{b.score_lo}~{b.score_hi}</td>
                      <td className="r num" style={{ color: `var(--${dir(b.avg_fwd)})` }}>{pct(b.avg_fwd, 1)}</td>
                      <td className="r num" style={{ color: `var(--${dir(b.vs_market)})` }}>{pct(b.vs_market, 1)}</td>
                      <td className="r num">{b.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </>
  );
}

/** 반등 신호 검증 — walkforward · calibration · accuracy */
function ReboundValidation() {
  const wf = useApi("/api/rebound-walkforward");
  const cal = useApi("/api/rebound-calibration");
  const acc = useApi("/api/rebound-accuracy");
  const w = wf.data || {}, c = cal.data || {}, a = acc.data || {};
  const bins = c.bins || [];
  if (wf.loading && cal.loading && acc.loading)
    return (<><SectionHd icon="discount-check" title="반등 신호 검증" /><div className="card card-pad"><Skeletons n={1} /></div></>);
  return (
    <>
      <SectionHd icon="discount-check" title="반등 신호 검증"
        desc={c.note || "워크포워드 · 분위 캘리브레이션 · 실측 적중"} />
      <div className="grid grid-stats" style={{ marginBottom: 6 }}>
        <div className="card stat"><div className="k">표본외 초과수익</div>
          <div className="num v" style={{ color: `var(--${dir(w.oos?.excess)})` }}>{w.oos ? pct(w.oos.excess, 2) : "-"}</div>
          <div className="d">IS {w.is ? pct(w.is.excess, 2) : "-"} · t {fixed(w.oos?.t, 2)}</div></div>
        <div className="card stat"><div className="k">과적합 여부</div>
          <div className="v">{w.not_overfit != null ? <Badge kind={w.not_overfit ? "ok" : "warn"} dot>{w.not_overfit ? "아님" : "주의"}</Badge> : "-"}</div>
          <div className="d">IS/OOS 일관성</div></div>
        <div className="card stat"><div className="k">분위 단조성</div>
          <div className="v">{c.monotonic != null ? (c.monotonic ? "단조 ✓" : "비단조") : "-"}</div>
          <div className="d">순위상관 ρ {fixed(c.rho, 2)}</div></div>
        <div className="card stat"><div className="k">실측 적중</div>
          <div className="v num">{a.hit_rate != null ? fixed(a.hit_rate, 0) + "%" : "-"}</div>
          <div className="d">{a.sig?.level || "-"}{a.sig ? (a.sig.reliable ? " · 신뢰" : " · 표본부족") : ""}</div></div>
      </div>
      {bins.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>신뢰분위</th><th className="r">점수구간</th><th className="r">표본</th><th className="r">초과수익</th><th className="r">적중률</th></tr></thead>
            <tbody>
              {bins.map((b) => (
                <tr key={b.q}>
                  <td><b>Q{b.q}</b></td>
                  <td className="r num">{b.lo}~{b.hi}</td>
                  <td className="r num">{b.n}</td>
                  <td className="r num" style={{ color: `var(--${dir(b.excess)})` }}>{pct(b.excess, 2)}</td>
                  <td className="r num">{fixed(b.hit, 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {c.regime && (c.regime.bear || c.regime.bull) && (
        <div className="grid grid-stats" style={{ marginTop: 6 }}>
          <div className="card stat"><div className="k">약세장 초과수익</div>
            <div className="v num" style={{ color: `var(--${dir(c.regime.bear?.excess)})` }}>{c.regime.bear ? pct(c.regime.bear.excess, 2) : "-"}</div>
            <div className="d">표본 {c.regime.bear?.n ?? "-"} · 적중 {fixed(c.regime.bear?.hit, 0)}%</div></div>
          <div className="card stat"><div className="k">강세장 초과수익</div>
            <div className="v num" style={{ color: `var(--${dir(c.regime.bull?.excess)})` }}>{c.regime.bull ? pct(c.regime.bull.excess, 2) : "-"}</div>
            <div className="d">표본 {c.regime.bull?.n ?? "-"} · 적중 {fixed(c.regime.bull?.hit, 0)}%</div></div>
        </div>
      )}
    </>
  );
}

/** 핵심픽 실측 — /api/top-picks-validation */
function TopPicksValidation() {
  const { data, loading } = useApi("/api/top-picks-validation");
  if (loading || !data || data.enabled === false) return null;
  const ps = data.phase_stats || [];
  return (
    <>
      <SectionHd icon="checkup-list" title="핵심픽 실측" desc={data.note || "적재시점→최신 단순 forward 수익(누적)"}
        right={data.samples != null && <span className="count-chip">표본 {data.samples}</span>} />
      <div className="grid grid-stats" style={{ marginBottom: 6 }}>
        <div className="card stat"><div className="k">평균 forward</div><div className="v num" style={{ color: `var(--${dir(data.avg_fwd_ret)})` }}>{pct(data.avg_fwd_ret, 1)}</div></div>
        <div className="card stat"><div className="k">적중률</div><div className="v num">{fixed(data.hit_rate, 0)}%</div></div>
        <div className="card stat"><div className="k">최고</div><div className="v" style={{ fontSize: "1rem" }}>{data.best?.name || "-"}</div><div className="d num" style={{ color: "var(--up)" }}>{data.best ? pct(data.best.fwd, 1) : ""}</div></div>
        <div className="card stat"><div className="k">최저</div><div className="v" style={{ fontSize: "1rem" }}>{data.worst?.name || "-"}</div><div className="d num" style={{ color: "var(--down)" }}>{data.worst ? pct(data.worst.fwd, 1) : ""}</div></div>
      </div>
      {ps.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>국면</th><th className="r">표본</th><th className="r">평균 forward</th><th className="r">적중</th></tr></thead>
            <tbody>{ps.map((p, i) => (
              <tr key={i}><td><b>{p.phase}</b></td><td className="r num">{p.n}</td>
                <td className="r num" style={{ color: `var(--${dir(p.avg_fwd)})` }}>{pct(p.avg_fwd, 1)}</td>
                <td className="r num">{fixed(p.hit, 0)}%</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** 반등 멀티호라이즌 — /api/rebound-multihorizon */
function ReboundMultiHorizon() {
  const { data, loading } = useApi("/api/rebound-multihorizon");
  if (loading || !data || data.enabled === false) return null;
  const hz = data.horizons || [];
  return (
    <>
      <SectionHd icon="timeline" title="반등 멀티호라이즌" desc={data.note || "건강반등 게이트 1~4일 forward 시장초과"}
        right={data.sign_consistent != null && <Badge kind={data.sign_consistent ? "ok" : "warn"} dot>{data.sign_consistent ? "부호일관" : "비일관"}</Badge>} />
      {hz.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>기간</th><th className="r">표본</th><th className="r">시장초과</th><th className="r">적중</th><th className="r">t값</th></tr></thead>
            <tbody>{hz.map((h) => (
              <tr key={h.hz}><td><b>{h.hz}일</b></td><td className="r num">{h.n}</td>
                <td className="r num" style={{ color: `var(--${dir(h.excess)})` }}>{pct(h.excess, 2)}</td>
                <td className="r num">{fixed(h.hit, 0)}%</td><td className="r num">{fixed(h.t, 2)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data.recommend && <p className="disclaimer" style={{ marginTop: 8 }}><i className="ti ti-info-circle" /> 권장 보유: {data.recommend}</p>}
    </>
  );
}

/** 퀄리티 OOS IC — /api/quality-validation */
function QualityValidation() {
  const { data, loading } = useApi("/api/quality-validation");
  if (loading || !data) return null;
  const sp = data.splits || [];
  return (
    <>
      <SectionHd icon="microscope" title="퀄리티 OOS 검증" desc={data.note || "표본외 정직 IC (신호선택 편향 제거)"}
        right={data.mean_oos_ic != null && <span className="count-chip">평균 OOS IC {fixed(data.mean_oos_ic, 3)}</span>} />
      {sp.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>분할(cut)</th><th className="r">테스트 표본</th><th className="r">OOS IC</th><th className="r">선택수</th></tr></thead>
            <tbody>{sp.map((s, i) => (
              <tr key={i}><td><b>{fixed(s.cut_frac * 100, 0)}%</b></td><td className="r num">{s.n_test}</td>
                <td className="r num" style={{ color: `var(--${dir(s.oos_ic)})` }}>{fixed(s.oos_ic, 3)}</td>
                <td className="r num">{s.n_selected}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** 알파 신호 가중치 · 홀드아웃 — /api/signal-alpha (발굴 점수 팩터 결합 가중 + OOS 검증) */
const ALPHA_COMP = {
  sc_fund: "재무", sc_momentum: "모멘텀", sc_supply: "수급", sc_volume: "거래량",
  sc_force: "세력", sc_news: "뉴스", sc_disc: "공시",
};
function AlphaSignalWeights() {
  const { data, loading, error, reload } = useApi("/api/signal-alpha");
  const fw = data?.full_weights || {};
  const ho = data?.holdout || {};
  const tw = ho.train_weights || {};
  const comps = data?.components || Object.keys(fw);
  const maxW = Math.max(0.0001, ...comps.map((c) => fw[c] || 0));
  const aq = ho.alpha_quintile || {};
  return (
    <>
      <SectionHd icon="adjustments-bolt" title="알파 신호 가중치" count={loading ? null : comps.length}
        desc={data?.note || "발굴 점수 팩터 결합 가중 + 표본외(OOS) 검증"}
        right={data?.n != null && <span className="count-chip">표본 {won(data.n)}</span>} />
      {error ? <ErrBox onRetry={reload}>{error}</ErrBox> :
        loading ? <div className="card card-pad"><Skeletons n={1} /></div> :
        comps.length === 0 ? <Empty>가중치 데이터 없음</Empty> : (
          <>
            <div className="grid grid-stats" style={{ marginBottom: 6 }}>
              <div className="card stat"><div className="k">알파 IC</div><div className="v num" style={{ color: `var(--${dir(ho.alpha_ic)})` }}>{fixed(ho.alpha_ic, 3)}</div><div className="d">표본외 {won(ho.n_test)}</div></div>
              <div className="card stat"><div className="k">점수 IC</div><div className="v num">{fixed(ho.score_ic, 3)}</div></div>
              <div className="card stat"><div className="k">상하위 스프레드</div><div className="v num" style={{ color: `var(--${dir(aq.spread)})` }}>{pct(aq.spread, 2)}</div></div>
              <div className="card stat"><div className="k">상위분위 적중</div><div className="v num">{fixed(ho.alpha_top_quintile_hit, 0)}%</div></div>
            </div>
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead><tr><th>팩터</th><th className="r">전체 가중</th><th style={{ width: "38%" }}>비중</th><th className="r">학습 가중</th></tr></thead>
                <tbody>
                  {comps.slice().sort((a, b) => (fw[b] || 0) - (fw[a] || 0)).map((c) => (
                    <tr key={c}>
                      <td><b>{ALPHA_COMP[c] || c}</b> <span className="code" style={{ color: "var(--faint)", fontSize: ".7rem" }}>{c}</span></td>
                      <td className="r num">{fixed((fw[c] || 0) * 100, 1)}%</td>
                      <td><Heat v={((fw[c] || 0) / maxW) * 100} /></td>
                      <td className="r num" style={{ color: "var(--muted)" }}>{fixed((tw[c] || 0) * 100, 1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data?.generated_at && <p className="disclaimer" style={{ marginTop: 8 }}><i className="ti ti-info-circle" /> 생성 {data.generated_at} · 가중은 표본 학습값(OOS 검증용), 라이브 점수와 별개</p>}
          </>
        )}
    </>
  );
}

const consKind = (c) => (/\+/.test(c || "") ? "ok" : /[−-]/.test(c || "") ? "warn" : "mut");

/** 전략 멀티윈도우 백테스트 — /api/signal-backtest-multi (전략 × 2·3·5일 시장초과 매트릭스) */
function BacktestMulti() {
  const { data, loading } = useApi("/api/signal-backtest-multi");
  if (loading || !data || data.enabled === false) return null;
  const lbs = data.lookbacks || [];
  const axes = data.axes || [];
  return (
    <>
      <SectionHd icon="layout-grid" title="전략 멀티윈도우 백테스트" desc={data.note || "전략별 2·3·5일 forward 시장초과"} />
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead><tr><th>전략</th>{lbs.map((lb) => <th key={lb} className="r">{lb}일</th>)}<th className="r">일관성</th></tr></thead>
          <tbody>
            {axes.map((a) => {
              const m = Object.fromEntries((a.windows || []).map((w) => [w.lb, w]));
              return (
                <tr key={a.key}>
                  <td><b>{a.label}</b></td>
                  {lbs.map((lb) => { const w = m[lb]; return <td key={lb} className="r num" style={w ? { color: `var(--${dir(w.vs_market)})` } : null}>{w ? pct(w.vs_market, 1) : "-"}</td>; })}
                  <td className="r">{a.consistency ? <Badge kind={consKind(a.consistency)}>{a.consistency}</Badge> : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** 점수 멀티윈도우 — /api/score-forward-multi (2·3·5일 창별 점수 예측력) */
function ScoreForwardMulti() {
  const { data, loading } = useApi("/api/score-forward-multi");
  if (loading || !data || data.enabled === false) return null;
  const w = data.windows || [];
  return (
    <>
      <SectionHd icon="chart-dots-3" title="점수 멀티윈도우" desc={data.note || "발굴 점수 2·3·5일 창 종합"}
        right={data.consistency && <Badge kind={consKind(data.consistency)} dot>{data.consistency}</Badge>} />
      <div className="grid grid-stats" style={{ marginBottom: 6 }}>
        <div className="card stat"><div className="k">평균 스프레드</div><div className="v num" style={{ color: `var(--${dir(data.avg_spread)})` }}>{pct(data.avg_spread, 1)}</div></div>
        <div className="card stat"><div className="k">양의 창</div><div className="v num">{data.pos ?? "-"}/{data.total ?? "-"}</div></div>
        <div className="card stat"><div className="k">지평 판정</div><div className="v" style={{ fontSize: "1.05rem" }}>{data.horizon || "-"}</div></div>
      </div>
      {w.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>창</th><th className="r">스프레드</th><th className="r">ρ</th><th className="r">단조</th><th className="r">표본</th></tr></thead>
            <tbody>{w.map((x) => (
              <tr key={x.lb}><td><b>{x.lb}일</b></td>
                <td className="r num" style={{ color: `var(--${dir(x.spread)})` }}>{pct(x.spread, 1)}</td>
                <td className="r num">{fixed(x.rho, 2)}</td>
                <td className="r">{x.monotonic ? "✓" : "—"}</td>
                <td className="r num">{x.n}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function SignalsPage() {
  return (
    <>
      <TrustGauge />
      <div style={{ height: 8 }} />
      <ValidationTable />
      <BacktestSection />
      <ScoreForwardSection />
      <ReboundValidation />
      <TopPicksValidation />
      <ReboundMultiHorizon />
      <QualityValidation />
      <AlphaSignalWeights />
      <BacktestMulti />
      <ScoreForwardMulti />
    </>
  );
}
