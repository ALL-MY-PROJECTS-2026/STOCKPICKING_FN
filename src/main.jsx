import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./theme.css";
import { DetailProvider } from "./components/DetailModal.jsx";
import AppShell from "./components/AppShell.jsx";
import Discover from "./pages/Discover.jsx";
import DailyBriefPage from "./pages/DailyBriefPage.jsx";
import ThemesPage from "./pages/ThemesPage.jsx";
import ReboundPage from "./pages/ReboundPage.jsx";
import FlowPage from "./pages/FlowPage.jsx";
import SectorFlowPage from "./pages/SectorFlowPage.jsx";
import ValuePage from "./pages/ValuePage.jsx";
import AlphaPage from "./pages/AlphaPage.jsx";
import AutoPicksPage from "./pages/AutoPicksPage.jsx";
import ConsensusPage from "./pages/ConsensusPage.jsx";
import WatchlistPage from "./pages/WatchlistPage.jsx";
import ProposalsPage from "./pages/ProposalsPage.jsx";
import BookmarkPage from "./pages/BookmarkPage.jsx";
import MyBookmarksPage from "./pages/MyBookmarksPage.jsx";
import EtfPage from "./pages/EtfPage.jsx";
import SignalsPage from "./pages/SignalsPage.jsx";

// HashRouter — 정적 호스팅에서도 새로고침/딥링크 안전.
const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Discover /> },
      { path: "brief", element: <DailyBriefPage /> },
      { path: "themes", element: <ThemesPage /> },
      { path: "rebound", element: <ReboundPage /> },
      { path: "flow", element: <FlowPage /> },
      { path: "sectors", element: <SectorFlowPage /> },
      { path: "value", element: <ValuePage /> },
      { path: "alpha", element: <AlphaPage /> },
      { path: "auto", element: <AutoPicksPage /> },
      { path: "consensus", element: <ConsensusPage /> },
      { path: "watchlist", element: <WatchlistPage /> },
      { path: "proposals", element: <ProposalsPage /> },
      { path: "bookmarks", element: <BookmarkPage /> },
      { path: "my", element: <MyBookmarksPage /> },
      { path: "etf", element: <EtfPage /> },
      { path: "signals", element: <SignalsPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DetailProvider>
      <RouterProvider router={router} />
    </DetailProvider>
  </StrictMode>
);
