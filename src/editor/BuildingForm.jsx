import React, { useState } from "react";

/**
 * Panneau "Bâtiments" minimal – aucun autre import requis
 * Tu peux brancher plus tard ta logique réelle.
 */
export default function BuildingForm() {
  const [preset, setPreset] = useState("");
  const [len, setLen] = useState("45");
  const [wid, setWid] = useState("28");

  const placeCustom = () => {
    // Placeholder : branche ici ton action réelle
    console.log("Placer bâtiment perso", { len, wid });
    alert(`Bâtiment personnalisé placé : ${len}m x ${wid}m`);
  };

  return (
    <div className="pe_card">
      <h3 style={{ margin: 0, fontSize: 16 }}>Bâtiments</h3>

      <div className="pe_field" style={{ marginTop: 12 }}>
        <label>Prédéfini</label>
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          style={{ marginTop: 6 }}
        >
          <option value="">Choisir un bâtiment…</option>
          <option value="100kWc">Bâtiment 100kWc - 23x22m</option>
          <option value="50kWc">Bâtiment 50kWc - 20x12m</option>
        </select>
      </div>

      <div className="pe_field" style={{ marginTop: 12 }}>
        <label>Longueur (m)</label>
        <input
          value={len}
          onChange={(e) => setLen(e.target.value)}
          inputMode="numeric"
          placeholder="ex. 45"
          style={{ marginTop: 6 }}
        />
      </div>

      <div className="pe_field" style={{ marginTop: 12 }}>
        <label>Largeur (m)</label>
        <input
          value={wid}
          onChange={(e) => setWid(e.target.value)}
          inputMode="numeric"
          placeholder="ex. 28"
          style={{ marginTop: 6 }}
        />
      </div>

      <button className="pe_btn" style={{ marginTop: 14 }} onClick={placeCustom}>
        Placer Bâtiment Personnalisé
      </button>
    </div>
  );
}