import { SectionHd, Empty, ListControls } from "../components/ui.jsx";
import StockCard from "../components/StockCard.jsx";
import { useMyBookmarks } from "../lib/myBookmarks.js";
import { useListView } from "../lib/useListView.js";

/** 나의 북마크 — 이 브라우저(localStorage)에만 저장된 관심종목. SERVER 와 무관. */
export default function MyBookmarksPage() {
  const list = useMyBookmarks();
  const lv = useListView(list, { pageSize: 12 });
  return (
    <>
      <SectionHd icon="bookmark" title="나의 북마크" count={list.length}
        desc="이 브라우저에 저장된 관심종목 (localStorage · SERVER 와 별개)" />
      <ListControls view={lv} />
      {list.length === 0 ? (
        <Empty icon="bookmark-off">카드 우측의 북마크 버튼으로 종목을 추가하세요</Empty>
      ) : (
        <div className="grid grid-stocks">
          {lv.view.map((s) => <StockCard key={s.code} s={s} />)}
        </div>
      )}
    </>
  );
}
