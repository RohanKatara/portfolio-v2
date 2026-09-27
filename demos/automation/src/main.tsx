import React from "react";
import ReactDOM from "react-dom/client";
import "./theme.css";
import "./styles.css";
import "./portfolio-layout.css";
import AppRouter from "./app/AppRouter";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
