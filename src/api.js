/*
 * BN REST 읽기 전용 클라이언트 (보안: FN 은 GET 만 — BN 에 쓰기/인증 요청을 보내지 않는다).
 * BN base URL 우선순위: ?bn= 쿼리 > window.__BN_BASE > FN/.env BN_BASE(빌드주입) > localhost:8000
 *   - 외부 배포 시 FN/.env 또는 repo 변수 BN_BASE=https://<BN-cloudflare-도메인> → build.mjs 가 주입.
 *   - __BN_BASE__ 는 build.mjs 의 esbuild define 으로 치환(미설정 시 "").
 *
 * 보안 원칙(명령프롬프트 §2.13):
 *   - 쓰기(POST/DELETE)·Basic 인증 헤더·비밀번호 취급 일절 없음(apiSend 제거).
 *   - 시크릿/토큰/비번을 FN 번들·localStorage 에 저장하지 않는다. 노출 값은 BN_BASE(URL) 뿐.
 */
const ENV_BN = (typeof __BN_BASE__ !== "undefined" && __BN_BASE__) ? __BN_BASE__ : "";
const BN =
  (typeof window !== "undefined" &&
    (new URLSearchParams(location.search).get("bn") || window.__BN_BASE)) ||
  ENV_BN ||
  "http://localhost:8000";

export const BN_BASE = BN;

/** GET /api/... → JSON. 인증/헤더 없음(읽기 전용). */
export async function apiGet(path) {
  const r = await fetch(BN + path);
  if (!r.ok) throw new Error("HTTP " + r.status + " " + path);
  return r.json();
}
