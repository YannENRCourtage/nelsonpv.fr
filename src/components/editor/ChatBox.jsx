import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { createComment } from '@/services/firebase/comments.service';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import MentionTextarea from '@/components/MentionTextarea.jsx';

/**
 * Rendu d'un texte avec @mentions surlignées en bleu
 */
const renderTextWithMentions = (text) => {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="font-bold text-blue-400 bg-blue-500/10 rounded px-0.5">
          {part}
        </span>
      );
    }
    return part;
  });
};

export default function ChatBox() {
  const { user } = useAuth();
  const { project, updateProject } = useProject(); // Utilise le contexte du projet
  const [input, setInput] = useState("");

  // Filtre: Suppression des messages spécifiques demandés par l'utilisateur
  const allLines = project?.chatLines || [];
  const lines = allLines.filter(l => 
    l.text !== "C'est quoi ce projet vide ???" && 
    !(l.who === "Alexandru" && l.text === "test")
  );

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll automatique supprimé à la demande de l'utilisateur
  // useEffect(scrollToBottom, [lines]);

  const send = async () => {
    const t = input.trim();
    if (!t) return;

    const newLine = {
      who: user?.name || user?.displayName || user?.firstName || "Vous",
      text: t,
      timestamp: new Date().toISOString()
    };

    // 1. Sauvegarde locale (Legacy UI)
    const updatedLines = [...lines, newLine];
    updateProject({ chatLines: updatedLines });

    // 2. Persistance immédiate (Auto-save)
    if (project?.id) {
      try {
        // Import apiService dynamically if not available or assume global/import
        const { apiService } = await import('@/services/api');
        await apiService.updateProject(project.id, { chatLines: updatedLines }, true);
      } catch (err) {
        console.error("Failed to auto-save chat:", err);
      }
    }

    // 3. Sauvegarde backend pour Notifications (si projet existant)
    if (project?.id) {
      try {
        // userId fallback
        const uid = user?.uid || user?.id || 'unknown';
        const uName = user?.name || user?.displayName || user?.firstName || 'Utilisateur';

        // PASS COMMERCIAL as AssignedTo for notification
        const assignedTo = project?.commercial || project?.assignedUser || null;
        await createComment(project.id, uid, uName, t, assignedTo, user?.email);
      } catch (err) {
        console.error("Failed to create notification comment:", err);
      }
    }

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
        {lines.map((l, i) => {
          const isMe = l.who === (user?.name || user?.displayName || user?.firstName || "Vous");
          return (
            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="text-xs text-gray-500 mb-1">{l.who}</div>
              <div className={`max-w-xs md:max-w-md rounded-lg px-3 py-2 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                {renderTextWithMentions(l.text)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4">
        <div className="relative">
          <MentionTextarea
            textareaRef={textareaRef}
            rows={2}
            placeholder="Écrire un message... Tapez @ ou # pour mentionner."
            value={input}
            onChange={(val) => setInput(val)}
            onKeyDown={onKey}
            className="w-full pr-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            darkMode={false}
          />
          <Button onClick={send} size="icon" className="absolute right-2 bottom-2 h-8 w-8 bg-blue-600 hover:bg-blue-700">
            <Send size={16} className="text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}