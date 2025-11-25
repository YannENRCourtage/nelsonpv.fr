import React, { useState, useRef, useEffect } from "react";
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Button } from "../ui/button.jsx";
import { Textarea } from "../ui/textarea.jsx";
import { Send } from "lucide-react";

export default function ChatBox() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [lines, setLines] = useState([
    { who: "Yann", text: "Bonjour, je vois bien la parcelle 👌" },
    { who: user?.name || "Vous", text: "Parfait, je place les symboles." },
    { who: "Nico", text: "N'oubliez pas de vérifier l'accès SDIS." },
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [lines]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    setLines((prev) => [...prev, { who: user?.name || "Vous", text: t }]);
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