import React from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="header">
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <img src="/logo-nelson.png" className="logo" alt="NELSON" />
          <h1 style={{ margin:0 }}>Fiche projet</h1>
        </div>
        <button className="btn" onClick={() => navigate("/")}>Retour</button>
      </div>

      <div className="card" style={{ padding:16 }}>
        <p>Projet affiché : <strong>{id}</strong></p>
        <p>Stub d’affichage sécurisé.</p>
      </div>
    </div>
  );
}