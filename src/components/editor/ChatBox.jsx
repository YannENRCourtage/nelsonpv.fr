import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { createComment, updateComment, deleteComment } from '@/services/firebase/comments.service';
import { Button } from '@/components/ui/button';
import { Send, Pencil, Trash2, Check, X } from 'lucide-react';
import MentionTextarea from '@/components/MentionTextarea.jsx';
import { useToast } from '@/components/ui/use-toast';

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

/**
 * Formatage lisible de l'horodatage
 */
const formatTimestamp = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch (e) {
    return '';
  }
};

/**
 * Détection robuste de l'auteur du commentaire
 */
export const isLineAuthor = (line, currentUser) => {
  if (!line || !currentUser) return false;

  // 1. Match par ID utilisateur
  if (line.userId && (line.userId === currentUser.uid || line.userId === currentUser.id)) {
    return true;
  }

  // 2. Match par email
  if (line.userEmail && currentUser.email && line.userEmail.toLowerCase() === currentUser.email.toLowerCase()) {
    return true;
  }

  // 3. Match par nom / prénom / displayName
  const who = (line.who || '').trim().toLowerCase();
  if (!who) return false;

  const candidateNames = [
    currentUser.name,
    currentUser.displayName,
    currentUser.firstName,
    currentUser.lastName ? `${currentUser.firstName || ''} ${currentUser.lastName}`.trim() : null,
    currentUser.email ? currentUser.email.split('@')[0] : null,
    'vous'
  ].filter(Boolean).map(s => s.trim().toLowerCase());

  if (candidateNames.includes(who)) return true;

  // Détection partielle (ex: "Yann" vs "Yann Barberis")
  if (candidateNames.some(c => c.length >= 3 && (c.includes(who) || who.includes(c)))) {
    return true;
  }

  // Cas spécifique Yann (y.barberis@enr-courtage.fr / yann / contact@nelsonpv.fr)
  const isYann = (currentUser.email && (currentUser.email.includes('barberis') || currentUser.email.includes('yann'))) ||
                 (currentUser.displayName && currentUser.displayName.toLowerCase().includes('yann')) ||
                 (currentUser.firstName && currentUser.firstName.toLowerCase().includes('yann'));
  if (isYann && (who === 'yann' || who.includes('barberis') || who === 'vous')) {
    return true;
  }

  return false;
};

export default function ChatBox() {
  const { user } = useAuth();
  const { project, updateProject } = useProject(); // Utilise le contexte du projet
  const { toast } = useToast();
  const [input, setInput] = useState("");

  // État d'édition inline
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const devCommentText = (project?.devComments || project?.notes || (project?.id ? localStorage.getItem(`nelson_comment_${project.id}`) : '') || '').trim();

  // Intégration immédiate des commentaires du dossier dans les lignes du chat
  const allLines = useMemo(() => {
    let rawLines = Array.isArray(project?.chatLines) ? [...project.chatLines] : [];
    if (devCommentText) {
      const idx = rawLines.findIndex(l => l.source === 'devComments');
      const author = project?.commercial || project?.assignedUser || user?.name || user?.displayName || user?.firstName || 'Développement';
      const devLine = {
        who: author,
        text: devCommentText,
        timestamp: project?.updatedAt || new Date().toISOString(),
        source: 'devComments'
      };
      if (idx >= 0) {
        if (rawLines[idx].text !== devCommentText) {
          rawLines[idx] = { ...rawLines[idx], ...devLine };
        }
      } else {
        rawLines.push(devLine);
      }
    }
    return rawLines;
  }, [project?.chatLines, project?.devComments, project?.notes, project?.id, project?.commercial, project?.assignedUser, user, devCommentText]);

  // Filtre: Suppression des messages spécifiques demandés par l'utilisateur
  const lines = useMemo(() => {
    return allLines.filter(l => 
      l.text !== "C'est quoi ce projet vide ???" && 
      !(l.who === "Alexandru" && l.text === "test")
    );
  }, [allLines]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Synchronisation automatique et persistance en dur dans Firestore
  useEffect(() => {
    if (!project?.id || !devCommentText) return;

    const currentLines = Array.isArray(project.chatLines) ? project.chatLines : [];
    const idx = currentLines.findIndex(l => l.source === 'devComments');
    const author = project.commercial || project.assignedUser || user?.name || user?.displayName || user?.firstName || 'Développement';

    let needsSave = false;
    let updatedLines = [...currentLines];

    if (idx >= 0) {
      if (currentLines[idx].text !== devCommentText) {
        updatedLines[idx] = {
          ...updatedLines[idx],
          who: author,
          text: devCommentText,
          timestamp: new Date().toISOString(),
          source: 'devComments'
        };
        needsSave = true;
      }
    } else {
      updatedLines.push({
        who: author,
        text: devCommentText,
        timestamp: project.updatedAt || new Date().toISOString(),
        source: 'devComments'
      });
      needsSave = true;
    }

    if (needsSave) {
      updateProject({ chatLines: updatedLines });
      import('@/services/api').then(({ apiService }) => {
        apiService.updateProject(project.id, { chatLines: updatedLines }, true);
      }).catch(err => console.error("Failed to auto-save devComments in chatLines:", err));
    }
  }, [project?.id, devCommentText]);

  /**
   * Règle stricte demandée :
   * L'utilisateur qui a écrit le commentaire (ici Yann) doit pouvoir supprimer ou modifier
   * son commentaire tant que personne d'autre n'a mis de commentaire après lui.
   */
  const canModifyOrDelete = (index) => {
    const line = lines[index];
    if (!line) return false;

    // Les commentaires de la fiche dossier 'devComments' ne sont pas modifiables ici
    if (line.source === 'devComments') return false;

    // L'utilisateur doit impérativement être l'auteur
    if (!isLineAuthor(line, user)) return false;

    // Vérifier s'il y a des commentaires postérieurs postés par quelqu'un d'autre
    const subsequentChatLines = lines.slice(index + 1).filter(l => l.source !== 'devComments');
    const someoneElseAfter = subsequentChatLines.some(nextL => !isLineAuthor(nextL, user));

    return !someoneElseAfter;
  };

  const startEdit = (index, line) => {
    setEditingIndex(index);
    setEditText(line.text || '');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const saveEdit = async (index) => {
    const newText = editText.trim();
    if (!newText || isSubmittingEdit) return;

    const targetLine = lines[index];
    if (!targetLine) return;

    setIsSubmittingEdit(true);
    try {
      const currentRawLines = Array.isArray(project?.chatLines) ? [...project.chatLines] : [];
      let found = false;

      const updatedRawLines = currentRawLines.map((item) => {
        if (found) return item;
        const matchId = targetLine.id && item.id && targetLine.id === item.id;
        const matchContent = (!targetLine.id || !item.id) &&
          item.who === targetLine.who &&
          item.text === targetLine.text &&
          (!targetLine.timestamp || item.timestamp === targetLine.timestamp);

        if (matchId || matchContent) {
          found = true;
          return {
            ...item,
            text: newText,
            isEdited: true,
            editedAt: new Date().toISOString()
          };
        }
        return item;
      });

      const finalList = found
        ? updatedRawLines
        : lines.map((l, i) => i === index ? { ...l, text: newText, isEdited: true, editedAt: new Date().toISOString() } : l);

      const toSave = finalList.filter(l => l.source !== 'devComments');

      // 1. Sauvegarde locale / context
      updateProject({ chatLines: toSave });

      // 2. Persistance Firestore
      if (project?.id) {
        const { apiService } = await import('@/services/api');
        await apiService.updateProject(project.id, { chatLines: toSave }, true);

        if (targetLine.commentId) {
          updateComment(targetLine.commentId, newText).catch(() => {});
        }
      }

      toast({
        title: "Commentaire modifié",
        duration: 2500
      });

      cancelEdit();
    } catch (err) {
      console.error("Erreur modification commentaire:", err);
      toast({
        title: "Erreur lors de la modification",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const deleteLine = async (index) => {
    const targetLine = lines[index];
    if (!targetLine) return;

    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) {
      return;
    }

    try {
      const currentRawLines = Array.isArray(project?.chatLines) ? [...project.chatLines] : [];
      let found = false;

      const updatedRawLines = currentRawLines.filter((item) => {
        if (found) return true;
        const matchId = targetLine.id && item.id && targetLine.id === item.id;
        const matchContent = (!targetLine.id || !item.id) &&
          item.who === targetLine.who &&
          item.text === targetLine.text &&
          (!targetLine.timestamp || item.timestamp === targetLine.timestamp);

        if (matchId || matchContent) {
          found = true;
          return false;
        }
        return true;
      });

      const finalList = found ? updatedRawLines : lines.filter((_, i) => i !== index);
      const toSave = finalList.filter(l => l.source !== 'devComments');

      // 1. Sauvegarde locale / context
      updateProject({ chatLines: toSave });

      // 2. Persistance Firestore
      if (project?.id) {
        const { apiService } = await import('@/services/api');
        await apiService.updateProject(project.id, { chatLines: toSave }, true);

        if (targetLine.commentId) {
          deleteComment(targetLine.commentId).catch(() => {});
        }
      }

      toast({
        title: "Commentaire supprimé",
        duration: 2500
      });
    } catch (err) {
      console.error("Erreur suppression commentaire:", err);
      toast({
        title: "Erreur lors de la suppression",
        variant: "destructive"
      });
    }
  };

  const send = async () => {
    const t = input.trim();
    if (!t) return;

    const newLine = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      who: user?.name || user?.displayName || user?.firstName || "Vous",
      userId: user?.uid || user?.id || null,
      userEmail: user?.email || null,
      text: t,
      timestamp: new Date().toISOString()
    };

    // 1. Sauvegarde locale (Legacy UI)
    const updatedLines = [...lines.filter(l => l.source !== 'devComments'), newLine];
    updateProject({ chatLines: updatedLines });

    // 2. Persistance backend pour Notifications et ID commentaire
    let createdCommentId = null;
    if (project?.id) {
      try {
        const uid = user?.uid || user?.id || 'unknown';
        const uName = user?.name || user?.displayName || user?.firstName || 'Utilisateur';
        const assignedTo = project?.commercial || project?.assignedUser || null;
        const commentDoc = await createComment(project.id, uid, uName, t, assignedTo, user?.email);
        if (commentDoc?.id) {
          createdCommentId = commentDoc.id;
          newLine.commentId = createdCommentId;
        }
      } catch (err) {
        console.error("Failed to create notification comment:", err);
      }
    }

    // 3. Persistance immédiate (Auto-save)
    if (project?.id) {
      try {
        const { apiService } = await import('@/services/api');
        await apiService.updateProject(project.id, { chatLines: [...lines.filter(l => l.source !== 'devComments'), newLine] }, true);
      } catch (err) {
        console.error("Failed to auto-save chat:", err);
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
    <div className="flex flex-col h-full rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b px-4 py-3 font-semibold text-lg flex items-center justify-between bg-slate-50/50">
        <span className="text-slate-800">Chat</span>
        {devCommentText && (
          <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Dossier synchronisé
          </span>
        )}
      </div>
      <div className="flex-grow p-4 space-y-4 overflow-y-auto h-64">
        {lines.length === 0 && (
          <div className="text-sm text-gray-400 text-center pt-10">
            Aucun message.
          </div>
        )}
        {lines.map((l, i) => {
          const isMe = isLineAuthor(l, user);
          const canAction = canModifyOrDelete(i);
          const isEditingThis = editingIndex === i;

          return (
            <div key={l.id || i} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
              {/* En-tête du message : auteur, horodatage, badge et boutons d'action */}
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-2 max-w-xs md:max-w-md w-full justify-between">
                <div className={`flex items-center gap-1.5 flex-wrap ${isMe ? 'order-2 justify-end' : 'order-1 justify-start'}`}>
                  <span className="font-bold text-slate-700">{l.who}</span>
                  {l.timestamp && (
                    <span className="text-[10px] text-slate-400">
                      {formatTimestamp(l.timestamp)}
                    </span>
                  )}
                  {l.isEdited && (
                    <span className="text-[10px] text-slate-400 italic">(modifié)</span>
                  )}
                  {l.source === 'devComments' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Commentaires du dossier
                    </span>
                  )}
                </div>

                {/* Boutons Modifier / Supprimer disponibles tant que personne d'autre n'a mis de commentaire après */}
                {canAction && !isEditingThis && (
                  <div className={`flex items-center gap-1 transition-opacity ${isMe ? 'order-1' : 'order-2'}`}>
                    <button
                      type="button"
                      onClick={() => startEdit(i, l)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Modifier ce commentaire"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLine(i)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Supprimer ce commentaire"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Corps du message ou formulaire d'édition inline */}
              {isEditingThis ? (
                <div className="w-full max-w-xs md:max-w-md bg-blue-50/70 p-2.5 rounded-xl border border-blue-300 shadow-sm space-y-2 animate-in fade-in duration-150">
                  <MentionTextarea
                    value={editText}
                    onChange={(val) => setEditText(val)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveEdit(i);
                      } else if (e.key === 'Escape') {
                        cancelEdit();
                      }
                    }}
                    rows={2}
                    className="w-full p-2 bg-white border border-blue-400 rounded-lg text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none shadow-inner"
                    darkMode={false}
                    placeholder="Modifier votre commentaire..."
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="text-[10px] text-slate-400">Entrée pour valider • Échap</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isSubmittingEdit}
                        className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 rounded transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(i)}
                        disabled={!editText.trim() || isSubmittingEdit}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded shadow-sm flex items-center gap-1 transition-all"
                      >
                        <Check className="w-3 h-3" />
                        <span>{isSubmittingEdit ? 'Enregistrement...' : 'Enregistrer'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`max-w-xs md:max-w-md rounded-lg px-3 py-2 whitespace-pre-wrap ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {renderTextWithMentions(l.text)}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4 bg-slate-50/30">
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
