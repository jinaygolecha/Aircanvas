import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { LandingPage } from "./components/LandingPage";
import { WhiteboardApp } from "./components/WhiteboardApp";
import { Dashboard } from "./components/Dashboard";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: LandingPage },
      { path: "app", Component: WhiteboardApp },
      { path: "dashboard", Component: Dashboard },
      { path: "*", Component: NotFound },
    ],
  },
]);
