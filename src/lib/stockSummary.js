// 종목 객관지표 요약 — 에이전트/투자자문 재료용 JSON.
// 안전 원칙: "객관적 사실 지표만" 포함한다.
//   포함: 식별(코드/이름/시장/테마) · 가격/등락 · 밸류(PER/PBR) · 재무 원수치(매출·이익·ROE·부채비율 등)
//         · 수급(외국인/기관/개인 순매수·공매도비율·소진율) · 대량보유(DART 공시 사실) · 출처 링크
//   제외(투자자문 책임 회피): 점수(score/heat/fin_score/force score) · 등급(grade) · 추천/의견(signal/advice/verdict)
//         · 예측(predict/estimated) · 목표가/손절(target) · 해석 라벨/note
// → BN 에 /api/stock-summary/{code}(객관 전용) 가 생기면 그걸 우선 사용하도록 교체 예정.

const numOrUndef = (v) => (v == null || (typeof v === "number" && isNaN(v)) || v === "" ? undefined : v);

/** undefined 값을 제거한 얕은 객체. 남는 키가 없으면 undefined. */
function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const cv = numOrUndef(v);
    if (cv !== undefined) out[k] = cv;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * 카드 seed(현재 표시중 종목) + /api/stock-detail 응답을 받아 객관지표 JSON 을 만든다.
 * @param {object} seed   카드가 들고 있는 종목 객체 (code/name/price/change/per/pbr/market/theme 등)
 * @param {object} detail /api/stock-detail/{code} 응답 (없으면 {})
 * @param {string} asOf   ISO 타임스탬프 (호출부 주입 — 테스트/결정성)
 */
export function buildObjectiveSummary(seed = {}, detail = {}, asOf) {
  const fin = detail.financials || {};
  const flow = detail.investor_flow || {};
  const summary = {
    _meta: {
      source: "STOCKPICKING (FN) · BN /api/stock-detail",
      as_of: asOf,
      fields: "objective_only",
      excluded: ["score", "heat", "grade", "recommendation", "signal", "prediction", "target", "opinion"],
      disclaimer:
        "객관적 사실 지표만 포함합니다(점수·등급·추천·신호·예측·목표가·의견 제외). 투자 판단이나 자문이 아니며, 투자에 대한 책임은 전적으로 본인에게 있습니다.",
    },
    identity: clean({
      code: seed.code || detail.code,
      name: seed.name || detail.name,
      market: seed.market,
      theme: seed.theme,
    }),
    price: clean({ current_krw: seed.price, change_pct: seed.change }),
    valuation: clean({ per: seed.per, pbr: seed.pbr }),
    financials: clean({
      roe_pct: fin.roe,
      revenue_krw: fin.revenue,
      revenue_yoy_pct: fin.revenue_yoy,
      op_profit_krw: fin.op_profit,
      op_profit_yoy_pct: fin.op_profit_yoy,
      op_margin_pct: fin.op_margin,
      net_profit_krw: fin.net_profit,
      equity_krw: fin.equity,
      debt_ratio_pct: fin.debt_ratio,
      ocf_krw: fin.ocf,
      fiscal_year: fin.bsns_year,
    }),
    supply: clean({
      investor_net_buy_krw_1d: clean({
        foreign: flow.foreign,
        institution: flow.institution,
        individual: flow.individual,
      }),
      short_ratio_pct: detail.short?.short_ratio,
      foreign_exhaustion_rate_pct: detail.foreign_exhaustion?.exhaustion_rate,
    }),
    major_holders: Array.isArray(detail.major_holders) && detail.major_holders.length
      ? detail.major_holders.map((h) => clean({ name: h.name, ratio_pct: h.ratio, date: h.date, is_nps: h.nps || undefined }))
      : undefined,
    sources: clean({ dart: fin.dart_url, naver: fin.naver_url }),
  };
  // 빈 섹션 제거
  for (const k of Object.keys(summary)) if (summary[k] === undefined) delete summary[k];
  return summary;
}
