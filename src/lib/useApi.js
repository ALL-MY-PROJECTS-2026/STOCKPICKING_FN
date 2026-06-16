import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../api.js";

/**
 * BN GET 훅 — { data, loading, error, reload }.
 * path 변경/reload 시 재요청. 언마운트 후 setState 방지.
 */
export function useApi(path, { auth, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiGet(path, { auth });
      if (alive.current) setData(d);
    } catch (e) {
      if (alive.current) setError(e.message || "요청 실패");
    } finally {
      if (alive.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, auth]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, error, reload: load };
}
