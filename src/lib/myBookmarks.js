// 브라우저 전용(localStorage) 북마크 — BN 북마크와 별개. 이 브라우저에만 저장된다.
import { useState, useEffect } from "react";

const KEY = "fn-my-bookmarks";
export const MYBM_EVENT = "fn-mybm-change";

export function getMyBookmarks() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(MYBM_EVENT));
}

export function isMyBookmarked(code) {
  return getMyBookmarks().some((b) => b.code === code);
}

/** 추가/해제 토글. stock 은 최소 {code,name,theme,price,change}. */
export function toggleMyBookmark(stock) {
  if (!stock?.code) return;
  const list = getMyBookmarks();
  const i = list.findIndex((b) => b.code === stock.code);
  if (i >= 0) list.splice(i, 1);
  else list.unshift({
    code: stock.code, name: stock.name, theme: stock.theme,
    price: stock.price, change: stock.change, ts: Date.now(),
  });
  save(list);
}

export function removeMyBookmark(code) {
  save(getMyBookmarks().filter((b) => b.code !== code));
}

/** 변경 구독 훅 — 목록 반환. 같은 탭(custom event)·다른 탭(storage) 모두 반영. */
export function useMyBookmarks() {
  const [list, setList] = useState(getMyBookmarks);
  useEffect(() => {
    const h = () => setList(getMyBookmarks());
    window.addEventListener(MYBM_EVENT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(MYBM_EVENT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return list;
}
