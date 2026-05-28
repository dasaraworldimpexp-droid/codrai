import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import "./index.css";

const storedTheme = window.localStorage.getItem("codrai-theme");
const systemTheme = window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
document.documentElement.dataset.theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme;
document.documentElement.style.colorScheme = document.documentElement.dataset.theme;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
