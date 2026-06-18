import { useState, useEffect, useRef } from "react";
import { apiGet } from "../api.js";
import { useDetail } from "./DetailModal.jsx";

const LIST_ID = "search-listbox";
const optId = (code) => "search-opt-" + code;

/** 전역 종목 검색 — /api/stock/search?q= (이름/코드), 클릭/키보드 선택 시 상세 모달 */
export default function SearchBox() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1); // 키보드 활성 옵션 인덱스
  const { open: openDetail } = useDetail();
  const boxRef = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) { setRes([]); setLoading(false); return; }
    let alive = true; setLoading(true);
    const t = setTimeout(() => {
      apiGet(`/api/stock/search?q=${encodeURIComponent(term)}`)
        .then((d) => { if (alive) { setRes(Array.isArray(d) ? d.slice(0, 12) : []); setOpen(true); setActive(-1); } })
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

  const pick = (s) => { openDetail(s); setOpen(false); setQ(""); setRes([]); setActive(-1); };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && res.length) { setOpen(true); setActive(0); return; }
      if (res.length) setActive((a) => (a + 1) % res.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (res.length) setActive((a) => (a <= 0 ? res.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && active < res.length) { e.preventDefault(); pick(res[active]); }
    } else if (e.key === "Escape") {
      setOpen(false); setActive(-1);
    }
  };

  const showPop = open && (loading || res.length > 0 || q.trim());
  return (
    <div className="search" ref={boxRef}>
      <i className="ti ti-search" aria-hidden="true" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => res.length && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="종목 검색 (이름·코드)"
        aria-label="종목 검색"
        role="combobox"
        aria-expanded={showPop ? true : false}
        aria-controls={LIST_ID}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 && res[active] ? optId(res[active].code) : undefined}
      />
      {showPop && (
        <div className="search-pop" id={LIST_ID} role="listbox" aria-label="검색 결과">
          {loading && res.length === 0 ? <div className="search-empty">검색 중…</div> :
            res.length === 0 ? <div className="search-empty">결과 없음</div> :
              res.map((s, i) => (
                <div
                  className={"search-item" + (i === active ? " active" : "")}
                  key={s.code}
                  id={optId(s.code)}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(s)}
                >
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
