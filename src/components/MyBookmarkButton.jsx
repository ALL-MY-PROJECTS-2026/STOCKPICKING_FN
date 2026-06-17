import { useMyBookmarks, toggleMyBookmark } from "../lib/myBookmarks.js";

/** 브라우저 북마크 토글 버튼 — 카드/모달 공용. 클릭 전파 차단(모달 안 열림). */
export default function MyBookmarkButton({ stock, size = "sm" }) {
  const list = useMyBookmarks();
  const on = list.some((b) => b.code === stock?.code);
  return (
    <button
      type="button"
      className={"mybm-btn" + (on ? " on" : "") + (size === "lg" ? " lg" : "")}
      title={on ? "내 북마크 해제" : "내 북마크 추가"}
      aria-label={on ? "내 북마크 해제" : "내 북마크 추가"}
      aria-pressed={on}
      onClick={(e) => { e.stopPropagation(); toggleMyBookmark(stock); }}
    >
      <i className={"ti " + (on ? "ti-bookmark-filled" : "ti-bookmark")} />
    </button>
  );
}
