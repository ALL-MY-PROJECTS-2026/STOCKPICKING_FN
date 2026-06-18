import { useState, useMemo } from "react";

/**
 * 목록 필터 + 페이징 공용 훅. 항목 10개 초과일 때만 컨트롤 노출(enabled).
 * 반환값을 <ListControls view={lv}/> 에 넘기고, 렌더는 lv.view 를 사용.
 */
export function useListView(items, { pageSize = 10, keys = ["name", "code", "theme"] } = {}) {
  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  // keys 는 호출부에서 인라인 배열(매 렌더 새 참조)일 수 있어, 의존성은 안정 문자열(keyStr)로 고정.
  const keyStr = keys.join("|");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    const ks = keyStr.split("|");
    return list.filter((it) => ks.some((k) => String(it?.[k] ?? "").toLowerCase().includes(t)));
  }, [list, q, keyStr]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // 검색어 변경 시 1페이지로 — effect 대신 이벤트 핸들러에서 리셋(권장 패턴). 데이터 변동 시엔 아래 clamp 가 처리.
  const changeQ = (v) => { setQ(v); setPage(0); };
  const cur = Math.min(page, pages - 1);
  const view = filtered.slice(cur * pageSize, cur * pageSize + pageSize);

  return { q, setQ: changeQ, page: cur, setPage, pages, total: filtered.length, view, enabled: list.length > 10 };
}
