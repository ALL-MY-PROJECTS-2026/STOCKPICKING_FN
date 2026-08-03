import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../api.js";

/*
 * 모듈 스코프 캐시 + in-flight dedup (stale-while-revalidate) + 회복력(graceful degrade).
 *   - 같은 path 를 여러 컴포넌트가 동시에 부르면 fetch 1회만 나가고 Promise 를 공유한다.
 *   - TTL(기본 45s) 안에서는 캐시를 즉시 반환해 라우트 왕복 시 재요청을 막는다.
 *   - 성공 응답은 localStorage 에 영속화 → 새로고침·BN 다운에도 마지막 정상 데이터로 화면 유지(화이트스크린 방지).
 *   - BN 실패 시: 캐시(메모리/로컬)에 마지막 정상 데이터가 있으면 그것을 stale 로 계속 표시(error 대신).
 *     캐시가 전혀 없을 때만 error 를 노출한다. → 서버가 죽어도 사이트·광고는 생존.
 */
const TTL = 45000;
const LS_PREFIX = "fn-cache:";
const LS_MAX_AGE = 3 * 24 * 60 * 60 * 1000; // 로컬 캐시 표시 상한 3일(그 이상 오래되면 무시)
const cache = new Map(); // path -> { data, ts }
const inflight = new Map(); // path -> Promise<data>

function lsGet(path) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + path);
    if (!raw) return undefined;
    const o = JSON.parse(raw);
    if (!o || typeof o.ts !== "number" || Date.now() - o.ts > LS_MAX_AGE) return undefined;
    return o;
  } catch { return undefined; }
}
function lsSet(path, entry) {
  try { localStorage.setItem(LS_PREFIX + path, JSON.stringify(entry)); } catch { /* quota·비활성 무시 */ }
}

function freshCached(path) {
  const c = cache.get(path);
  return c && Date.now() - c.ts < TTL ? c : undefined;
}
// 나이 무관 마지막 정상 데이터(메모리 우선, 없으면 로컬) — degrade 표시용
function anyCached(path) {
  const c = cache.get(path);
  if (c) return c;
  const l = lsGet(path);
  if (l) { cache.set(path, l); return l; } // 로컬 → 메모리 승격
  return undefined;
}

function sharedGet(path, force) {
  if (!force && inflight.has(path)) return inflight.get(path);
  const p = apiGet(path)
    .then((d) => {
      const entry = { data: d, ts: Date.now() };
      cache.set(path, entry);
      lsSet(path, entry);
      inflight.delete(path);
      return d;
    })
    .catch((e) => {
      inflight.delete(path);
      throw e;
    });
  inflight.set(path, p);
  return p;
}

/**
 * BN GET 훅 — { data, loading, error, reload, stale, asOf }.
 *   stale=true → BN 실패로 캐시(마지막 정상) 데이터를 표시 중. asOf=해당 데이터 수신 시각(ms).
 *   error 는 표시할 캐시가 전혀 없을 때만 채워진다.
 */
export function useApi(path, { deps = [] } = {}) {
  const cached = freshCached(path) || anyCached(path);
  const [data, setData] = useState(cached ? cached.data : null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [stale, setStale] = useState(false);
  const [asOf, setAsOf] = useState(cached ? cached.ts : null);
  const alive = useRef(true);

  const load = useCallback(async (opts) => {
    const force = opts === true || opts?.force;
    if (!force) {
      const c = freshCached(path);
      if (c) {
        if (alive.current) { setData(c.data); setError(null); setStale(false); setAsOf(c.ts); setLoading(false); }
        return;
      }
    } else {
      cache.delete(path);
    }
    // 재검증 중에도 이전 데이터가 있으면 유지(로딩 스피너로 화면 비우지 않음)
    const prev = anyCached(path);
    if (alive.current) { setLoading(!prev); setError(null); }
    try {
      const d = await sharedGet(path, force);
      if (alive.current) { setData(d); setStale(false); setAsOf(Date.now()); setError(null); }
    } catch (e) {
      // graceful degrade: 마지막 정상 데이터가 있으면 그것을 유지·표시(error 대신 stale)
      const fb = anyCached(path);
      if (alive.current) {
        if (fb) { setData(fb.data); setStale(true); setAsOf(fb.ts); setError(null); }
        else { setError(e.message || "요청 실패"); }
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);

  const reload = useCallback(() => load({ force: true }), [load]);

  useEffect(() => {
    alive.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, error, reload, stale, asOf };
}
