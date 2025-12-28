// Polyfills pour compatibilité avec certaines librairies (comme ChatKitty)
if (typeof window !== 'undefined') {
  window.global = window;
  window.process = {
    env: { DEBUG: undefined },
    version: '',
    nextTick: (cb) => setTimeout(cb, 0)
  };
}

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);