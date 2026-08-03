import { useApi } from "../lib/useApi.js";
import { fixed } from "../lib/format.js";

/**
 * 선별 종목·신호의 실제 성과(적중률·평균 전진수익·표본)를 픽 화면에 투명 공개.
 * 정직 표기 = 최고의 리스크 완충(과대광고·투자자문 오인 방지). BN /api/top-picks-validation.
 * 데이터 없거나 비활성이면 아무것도 렌더하지 않음(정상 빈상태).
 */
export default function TrackRecordBanner() {
  const { data } = useApi("/api/top-picks-validation");
  if (!data || data.enabled === false) return null;
  const hit = data.hit_rate;
  const fwd = data.avg_fwd_ret;
  const n = data.samples;
  if (hit == null && fwd == null) return null;
  const fwdKind = fwd == null ? "muted" : fwd >= 0 ? "up" : "down";
  return (
    <div className="track-rec" role="note" aria-label="선별 종목 실제 성과 (투명 공개)">
      <i className="ti ti-scale" aria-hidden="true" />
      <div className="tr-body">
        <b className="tr-title">선별 종목 실제 성과 <span className="tr-tag">투명 공개</span></b>
        <div className="tr-stats">
          {hit != null && <span>적중률 <b className="num">{fixed(hit, 1)}%</b></span>}
          {fwd != null && <span>평균 전진수익 <b className="num" style={{ color: `var(--${fwdKind})` }}>{fwd >= 0 ? "+" : ""}{fixed(fwd, 1)}%</b></span>}
          {n != null && <span>표본 <b className="num">{n}</b>건</span>}
          {data.logged_dates != null && <span>추적일 <b className="num">{data.logged_dates}</b>일</span>}
          {data.latest && <span className="tr-asof">기준 {data.latest}</span>}
        </div>
        <p className="tr-note">
          위 수치는 과거 선별 종목의 실제 사후 성과입니다. <b>과거 성과는 미래 수익을 보장하지 않으며</b>, 모든 신호·데이터는 참고용입니다. 투자 판단과 책임은 이용자 본인에게 있습니다.
        </p>
      </div>
    </div>
  );
}
