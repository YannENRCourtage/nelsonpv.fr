import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

import { Analytics } from "@vercel/analytics/react"

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>
);

// Retirer le splash screen une fois React initialisé
const splash = document.getElementById("app-splash");
if (splash) {
  setTimeout(() => {
    splash.classList.add("fade-out");
    setTimeout(() => splash.remove(), 350);
  }, 100);
}