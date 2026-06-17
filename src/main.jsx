import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./theme.css";
import { DetailProvider } from "./components/DetailModal.jsx";
import AppShell from "./components/AppShell.jsx";
import Discover from "./pages/Discover.jsx";
import ThemesPage from "./pages/ThemesPage.jsx";
import ReboundPage from "./pages/ReboundPage.jsx";
import FlowPage from "./pages/FlowPage.jsx";
import ValuePage from "./pages/ValuePage.jsx";
import BookmarkPage from "./pages/BookmarkPage.jsx";
import EtfPage from "./pages/EtfPage.jsx";
import SignalsPage from "./pages/SignalsPage.jsx";
import SchedulePage from "./pages/SchedulePage.jsx";

// HashRouter — 정적 호스팅에서도 새로고침/딥링크 안전.
const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Discover /> },
      { path: "themes", element: <ThemesPage /> },
      { path: "rebound", element: <ReboundPage /> },
      { path: "flow", element: <FlowPage /> },
      { path: "value", element: <ValuePage /> },
      { path: "bookmarks", element: <BookmarkPage /> },
      { path: "etf", element: <EtfPage /> },
      { path: "signals", element: <SignalsPage /> },
      { path: "schedule", element: <SchedulePage /> },
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
