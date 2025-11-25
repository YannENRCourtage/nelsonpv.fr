import React from "react";

/** Icônes inline pour éviter toute dépendance externe */
const Icon = {
  pin: (size = 24) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11Z" /><circle cx="12" cy="11" r="3" /></svg>),
  gate: (size = 24) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20h20" /><path d="M6 20V8h12v12" /><path d="M10 12h4" /></svg>),
  home: (size = 24) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7" /><path d="M9 22V12h6v10" /></svg>),
  fire: (size = 24) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 14a4 4 0 1 0 8 0c0-3-2-4-2-6 0-2-1-3-2-4-1 1-2 2-2 4 0 2-2 3-2 6Z" /></svg>),
  bolt: (size = 24) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m13 2-8 14h7l-1 6 8-14h-7l1-6z" /></svg>),
  plug: (size = 24) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 7v6a6 6 0 1 0 12 0V7" /><path d="M8 7V3" /><path d="M16 7V3" /></svg>),
  user: (size = 24) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4" /><path d="M6 21a6 6 0 0 1 12 0" /></svg>),
};

/** Bouton symbole : clic = pose au centre, drag = déposer sur la carte */
function SymbolButton({ label, symbolKey, icon }) {
  const dispatch = (name, detail) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  const onDragStart = (e) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ symbol: symbolKey }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const onClick = () => dispatch("map-add-symbol", { symbol: symbolKey });

  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      title={label}
      className="w-full flex items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm hover:bg-gray-50"
    >
      {icon(22)} <span>{label}</span>
    </button>
  );
}

export default function SymbolsPanel() {
  const items = [
    { key: "lieu-projet", label: "Lieu Projet", icon: Icon.pin },
    { key: "acces", label: "Accès", icon: Icon.gate },
    { key: "maison", label: "Maison", icon: Icon.home },
    { key: "sdis", label: "SDIS", icon: Icon.fire },
    { key: "transfo", label: "Transfo", icon: Icon.bolt },
    { key: "pdl", label: "PDL", icon: Icon.plug },
    { key: "voisin", label: "Voisin", icon: Icon.user },
  ];

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <SymbolButton
            key={it.key}
            symbolKey={it.key}
            label={it.label}
            icon={it.icon}
          />
        ))}
      </div>
    </div>
  );
}