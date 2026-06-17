import { useState, useMemo, useEffect } from "react";

/**
 * 목록 필터 + 페이징 공용 훅. 항목 10개 초과일 때만 컨트롤 노출(enabled).
 * 반환값을 <ListControls view={lv}/> 에 넘기고, 렌더는 lv.view 를 사용.
 */
export function useListView(items, { pageSize = 10, keys = ["name", "code", "theme"] } = {}) {
  const list = Array.isArray(items) ? items : [];
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((it) => keys.some((k) => String(it?.[k] ?? "").toLowerCase().includes(t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(0); }, [q, filtered.length]);
  const cur = Math.min(page, pages - 1);
  const view = filtered.slice(cur * pageSize, cur * pageSize + pageSize);

  return { q, setQ, page: cur, setPage, pages, total: filtered.length, view, enabled: list.length > 10 };
}
