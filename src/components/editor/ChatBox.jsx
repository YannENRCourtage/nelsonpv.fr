import React, { useState, useRef, useEffect } from "react";
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Button } from "../ui/button.jsx";
import { Textarea } from "../ui/textarea.jsx";
import { Send } from "lucide-react";
import { useProject } from '../../contexts/ProjectContext.jsx'; // Importé

export default function ChatBox() {
  const { user } = useAuth();
  const { project, updateProject } = useProject(); // Utilise le contexte du projet
  const [input, setInput] = useState("");

  // CORRIGÉ : Lit les messages depuis 'project.chatLines'
  const lines = project?.chatLines || [];

  const messagesEndRef = useRef(null);

  // Scroll automatique supprimé à la demande de l'utilisateur
  // useEffect(scrollToBottom, [lines]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    const newLine = {
      who: user?.name || "Vous",
      text: t,
      timestamp: new Date().toISOString()
    };

    // CORRIGÉ : Sauvegarde les messages dans l'objet projet
    updateProject({ chatLines: [...lines, newLine] });
    setInput("");
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl bg-white shadow-sm">
      <div className="border-b px-4 py-3 font-semibold text-lg">Chat</div>
      <div className="flex-grow p-4 space-y-4 overflow-y-auto h-64">
        {lines.length === 0 && (
          <div className="text-sm text-gray-400 text-center pt-10">
            Aucun message.
          </div>
        )}
        {lines.map((l, i) => (
          <div key={i} className={`flex flex-col ${l.who === (user?.name || "Vous") ? 'items-end' : 'items-start'}`}>
            <div className="text-xs text-gray-500 mb-1">{l.who}</div>
            <div className={`max-w-xs md:max-w-md rounded-lg px-3 py-2 ${l.who === (user?.name || "Vous") ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
              {l.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4">
        <div className="relative">
          <Textarea
            rows={2}
            placeholder="Écrire un message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            className="pr-12"
          />
          <Button onClick={send} size="icon" className="absolute right-2 bottom-2 h-8 w-8 bg-blue-600 hover:bg-blue-700">
            <Send size={16} className="text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}