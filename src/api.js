/*
 * BN REST 비동기 클라이언트.
 * BN base URL 우선순위: ?bn= 쿼리 > window.__BN_BASE > FN/.env BN_BASE(빌드주입) > localhost:8000
 *   - 외부 배포 시 FN/.env 에 BN_BASE=https://<BN-cloudflare-도메인> 등록 → build.mjs 가 주입.
 *   - __BN_BASE__ 는 build.mjs 의 esbuild define 으로 치환(미설정 시 "").
 */
const ENV_BN = (typeof __BN_BASE__ !== "undefined" && __BN_BASE__) ? __BN_BASE__ : "";
const BN =
  (typeof window !== "undefined" &&
    (new URLSearchParams(location.search).get("bn") || window.__BN_BASE)) ||
  ENV_BN ||
  "http://localhost:8000";

export const BN_BASE = BN;

/** GET /api/... → JSON (비동기). 인증 GET 은 auth 옵션으로 Basic 헤더 첨부. */
export async function apiGet(path, { auth } = {}) {
  const headers = {};
  if (auth) headers.Authorization = "Basic " + btoa(auth);
  const r = await fetch(BN + path, { headers });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + path);
  return r.json();
}

/** POST/DELETE /api/... (인증/매매용). body 는 JSON. */
export async function apiSend(path, { method = "POST", body, auth } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = "Basic " + btoa(auth);
  const r = await fetch(BN + path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await r.json();
  } catch (e) {
    /* no body */
  }
  return { status: r.status, ok: r.ok, data };
}
