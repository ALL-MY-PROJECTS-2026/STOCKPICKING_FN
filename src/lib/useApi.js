import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../api.js";

/*
 * 모듈 스코프 캐시 + in-flight dedup (stale-while-revalidate).
 *   - 같은 path 를 여러 컴포넌트가 동시에 부르면 fetch 1회만 나가고 Promise 를 공유한다.
 *   - TTL(기본 45s) 안에서는 캐시를 즉시 반환해 라우트 왕복 시 재요청을 막는다.
 *   - reload({force}) 는 캐시를 무효화하고 새로 받는다(에러 재시도 포함).
 * 폴링 컴포넌트(IndexTicker/LastUpdate/ConnectionBanner)는 apiGet 을 직접 쓰므로 이 캐시의 영향을 받지 않는다.
 */
const TTL = 45000;
const cache = new Map(); // path -> { data, ts }
const inflight = new Map(); // path -> Promise<data>

function freshCached(path) {
  const c = cache.get(path);
  return c && Date.now() - c.ts < TTL ? c : undefined;
}

function sharedGet(path, force) {
  if (!force && inflight.has(path)) return inflight.get(path);
  const p = apiGet(path)
    .then((d) => {
      cache.set(path, { data: d, ts: Date.now() });
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
 * BN GET 훅 — { data, loading, error, reload }.
 * path 변경/reload 시 재요청. 언마운트 후 setState 방지.
 */
export function useApi(path, { deps = [] } = {}) {
  const cached = freshCached(path);
  const [data, setData] = useState(cached ? cached.data : null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const load = useCallback(async (opts) => {
    const force = opts === true || opts?.force;
    if (!force) {
      const c = freshCached(path);
      if (c) {
        if (alive.current) { setData(c.data); setError(null); setLoading(false); }
        return;
      }
    } else {
      cache.delete(path);
    }
    if (alive.current) { setLoading(true); setError(null); }
    try {
      const d = await sharedGet(path, force);
      if (alive.current) setData(d);
    } catch (e) {
      if (alive.current) setError(e.message || "요청 실패");
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

  return { data, loading, error, reload };
}
