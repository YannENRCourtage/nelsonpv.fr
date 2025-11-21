import React from "react";
import { symbols } from "@/lib/nomenclature.js";

export default function SymbolsPanel({ onSymbolClick }) {
  return (
    <div className="pe_left">
      <h3>Symboles</h3>
      <div className="symbols-grid">
        {symbols.map((symb, idx) => (
          <button
            key={idx}
            className="symbol-btn"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("symbol", JSON.stringify(symb));
            }}
            onClick={() => onSymbolClick(symb)}
          >
            <img src={symb.icon} alt={symb.label} />
            <span>{symb.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}