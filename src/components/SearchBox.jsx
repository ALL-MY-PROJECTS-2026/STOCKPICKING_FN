import { useState, useEffect, useRef } from "react";
import { apiGet } from "../api.js";
import { useDetail } from "./DetailModal.jsx";

/** 전역 종목 검색 — /api/stock/search?q= (이름/코드), 클릭 시 상세 모달 */
export default function SearchBox() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { open: openDetail } = useDetail();
  const boxRef = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) { setRes([]); setLoading(false); return; }
    let alive = true; setLoading(true);
    const t = setTimeout(() => {
      apiGet(`/api/stock/search?q=${encodeURIComponent(term)}`)
        .then((d) => { if (alive) { setRes(Array.isArray(d) ? d.slice(0, 12) : []); setOpen(true); } })
        .catch(() => { if (alive) setRes([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (s) => { openDetail(s); setOpen(false); setQ(""); setRes([]); };

  return (
    <div className="search" ref={boxRef}>
      <i className="ti ti-search" aria-hidden="true" />
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => res.length && setOpen(true)}
        placeholder="종목 검색 (이름·코드)" aria-label="종목 검색" />
      {open && (loading || res.length > 0 || q.trim()) && (
        <div className="search-pop">
          {loading && res.length === 0 ? <div className="search-empty">검색 중…</div> :
            res.length === 0 ? <div className="search-empty">결과 없음</div> :
              res.map((s) => (
                <div className="search-item" key={s.code} onClick={() => pick(s)}>
                  <span className="si-nm">{s.name}</span>
                  <span className="si-code num">{s.code}</span>
                  {s.theme && <span className="si-theme">{s.theme}</span>}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
