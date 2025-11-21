import React, { useState } from "react";

/**
 * Chat minimal – purement local, pour que la page rende. 
 * Branche plus tard ton backend/WS si besoin.
 */
export default function ChatBox() {
  const [messages, setMessages] = useState([
    { author: "Autre", text: "Bonjour, je vois bien la parcelle 👌" },
    { author: "Vous", text: "Parfait, je place les symboles." },
  ]);
  const [draft, setDraft] = useState("");

  const send = () => {
    const txt = draft.trim();
    if (!txt) return;
    setMessages((m) => [...m, { author: "Vous", text: txt }]);
    setDraft("");
  };

  return (
    <div className="pe_card" style={{ display: "flex", flexDirection: "column", height: 300 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Chat</div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          border: "1px solid #eee",
          borderRadius: 6,
          padding: 8,
          background: "#fafafa",
          marginBottom: 8,
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{m.author}</div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Écrire un message…"
          style={{ flex: 1 }}
        />
        <button className="pe_btn" onClick={send}>Envoyer</button>
      </div>
    </div>
  );
}