import React, { useState, useRef, useEffect } from 'react';
import { 
  X, ArrowLeft, Send, ThumbsUp, Reply, Eye, MoreVertical, 
  Trash2, MessageSquare, Plus, Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import MentionTextarea from '@/components/MentionTextarea.jsx';

/**
 * Formatage de la date dans le style Monday : "janv. 19" ou "nov. 07 2025"
 */
export const formatMondayDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  const currentYear = new Date().getFullYear();

  if (year === currentYear) {
    return `${month} ${day}`;
  }
  return `${month} ${day} ${year}`;
};

/**
 * Extraction du nom / libellé de la ligne
 */
export const getRowTitle = (row, columns = []) => {
  if (!row || !row.data) return 'Élément';

  // 1. Première colonne du tableau si présente et non vide
  if (columns && columns.length > 0) {
    const firstColVal = row.data[columns[0]];
    if (firstColVal && String(firstColVal).trim()) {
      return String(firstColVal).trim();
    }
  }

  // 2. Clés classiques courantes
  const candidateKeys = [
    'Projet', 'projet', 'Nom', 'nom', 'Client', 'client', 
    'Entreprise', 'entreprise', 'PDB', 'Dossier', 'dossier', 
    'Désignation', 'designation', 'Libellé', 'Title', 'title'
  ];

  for (const k of candidateKeys) {
    if (row.data[k] && String(row.data[k]).trim()) {
      return String(row.data[k]).trim();
    }
  }

  // 3. Première valeur non interne
  const nonInternal = Object.entries(row.data).find(
    ([k, v]) => !k.startsWith('__') && v && String(v).trim()
  );
  if (nonInternal) return String(nonInternal[1]).trim();

  return `Projet #${row.id || ''}`;
};

/**
 * Tiroir de discussion et mises à jour Monday (conforme aux images 3 et 4)
 */
export default function MondayUpdatesDrawer({
  isOpen,
  row,
  columns = [],
  tabName = 'Suivi des dossiers',
  onClose,
  onAddUpdate,
  onToggleLike,
  onDeleteUpdate
}) {
  const { user } = useAuth();
  const [newText, setNewText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('updates'); // 'columns', 'emails', 'updates'
  const [menuOpenId, setMenuOpenId] = useState(null);
  const textareaRef = useRef(null);
  const updatesEndRef = useRef(null);

  // Auteur courant
  const currentAuthor = user?.displayName || user?.firstName || user?.name || 'Yann';
  const currentAvatar = user?.photoURL || user?.avatar || '/avatars/yann.jpg';
  const currentRole = user?.role || 'Responsable Equipe Commerciale';

  // Liste des mises à jour stockées sur la ligne
  const updates = Array.isArray(row?.data?.__updates)
    ? row.data.__updates
    : Array.isArray(row?.updates)
    ? row.updates
    : [];

  useEffect(() => {
    if (isOpen && isComposing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, isComposing]);

  if (!isOpen || !row) return null;

  const rowTitle = getRowTitle(row, columns);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!newText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddUpdate(row.id, newText.trim());
      setNewText('');
      setIsComposing(false);
    } catch (err) {
      console.error('Erreur lors de la publication de la mise à jour :', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReply = (authorName) => {
    setIsComposing(true);
    setNewText(prev => (prev ? `${prev} @${authorName} ` : `@${authorName} `));
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <div 
        className="relative w-full sm:w-[480px] md:w-[540px] h-full bg-[#181b20] text-white shadow-2xl flex flex-col z-10 overflow-hidden border-l border-slate-800 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ HEADER DU TIROIR (Image 4) ═══ */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#181b20] shrink-0 space-y-3.5">
          {/* Ligne d'icônes supérieure */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Titre de l'élément (ex: CHAUCHET 17150 MIRAMBEAU) */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight select-all">
              {rowTitle}
            </h2>

            {/* Fil d'Ariane / Groupe (ex: Suivi des dossiers > Sécurisation projet) */}
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <span className="font-semibold text-slate-200">{tabName}</span>
              <span className="text-slate-500">&gt;</span>
              <span className="text-emerald-400 font-bold">Mises à jour</span>
            </div>
          </div>

          {/* Barre d'onglets (Image 4 : Colonnes | E-mails et activités | Mises à jour) */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('columns')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'columns'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Colonnes
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('emails')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'emails'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              E-mails et activités
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('updates')}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'updates'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Mises à jour ({updates.length})
            </button>
          </div>
        </div>

        {/* ═══ CONTENU PRINCIPAL : LISTE DES MISES À JOUR ═══ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'updates' && (
            <>
              {updates.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-200">Aucune mise à jour pour le moment</h3>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Partagez des informations, comptes-rendus d'appels ou pièces avec votre équipe sur ce dossier.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposing(true);
                      setTimeout(() => textareaRef.current?.focus(), 50);
                    }}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Rédiger la première mise à jour</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map((upd) => {
                    const authorName = upd.author || 'Yann';
                    const authorAvatar = upd.avatar || '/avatars/yann.jpg';
                    const authorRole = upd.role || 'Responsable Equipe Commerciale';
                    const isLiked = upd.liked === true;
                    const likesCount = Number(upd.likes || 0);

                    return (
                      <div
                        key={upd.id}
                        className="bg-[#22272e] border border-slate-700/70 rounded-2xl p-4 space-y-3 shadow-lg shadow-black/20 relative group transition-all"
                      >
                        {/* En-tête de la mise à jour (Avatar, Nom, Date, Rôle, Menu) */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={authorAvatar}
                              alt={authorName}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700 shrink-0 bg-slate-800"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/avatars/yann.jpg';
                              }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{authorName}</span>
                                <span className="text-xs text-slate-400 font-medium">{formatMondayDate(upd.timestamp)}</span>
                              </div>
                              <span className="text-xs text-slate-400 font-normal block leading-tight">
                                {authorRole}
                              </span>
                            </div>
                          </div>

                          {/* Menu 3 points (suppression d'une mise à jour) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setMenuOpenId(menuOpenId === upd.id ? null : upd.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
                              title="Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {menuOpenId === upd.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-20">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    if (confirm('Supprimer cette mise à jour ?')) {
                                      onDeleteUpdate(row.id, upd.id);
                                    }
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Supprimer</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Corps du message */}
                        <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed select-text pt-0.5 font-normal">
                          {upd.text}
                        </div>

                        {/* Statistique de vue (Image 4 : 👁️ 1) */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>1</span>
                        </div>

                        {/* Barre d'action inférieure (Image 4 : 👍 J'aime | ↩️ Répondre) */}
                        <div className="border-t border-slate-700/60 pt-2.5 flex items-center justify-around text-xs font-semibold text-slate-300">
                          <button
                            type="button"
                            onClick={() => onToggleLike(row.id, upd.id)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                              isLiked
                                ? 'text-blue-400 font-bold bg-blue-950/40'
                                : 'hover:text-blue-400 hover:bg-slate-700/50'
                            }`}
                          >
                            <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-blue-400 text-blue-400' : ''}`} />
                            <span>{likesCount > 0 ? `${likesCount} J'aime` : "J'aime"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReply(authorName)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg hover:text-blue-400 hover:bg-slate-700/50 transition-colors cursor-pointer"
                          >
                            <Reply className="w-4 h-4" />
                            <span>Répondre</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={updatesEndRef} />
                </div>
              )}
            </>
          )}

          {activeTab === 'columns' && (
            <div className="p-4 bg-[#22272e] border border-slate-700/70 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Détail des colonnes</h3>
              <div className="space-y-2 text-xs">
                {columns.map((col) => (
                  <div key={col} className="flex items-center justify-between py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 font-semibold">{col}</span>
                    <span className="text-slate-100 font-bold max-w-[240px] truncate">{String(row.data?.[col] ?? '-')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'emails' && (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <p>Aucune activité e-mail liée à ce dossier.</p>
            </div>
          )}
        </div>

        {/* ═══ FOOTER / COMPOSITEUR DE MISE À JOUR (Image 4) ═══ */}
        {activeTab === 'updates' && (
          <div className="p-3 sm:p-4 bg-[#181b20] border-t border-slate-800/80 shrink-0">
            {!isComposing ? (
              <button
                type="button"
                onClick={() => {
                  setIsComposing(true);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#22272e] hover:bg-slate-800 border border-slate-700 text-slate-300 text-sm font-bold flex items-center gap-2.5 shadow-xl transition-all hover:border-slate-600 cursor-pointer active:scale-[0.99]"
              >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>Rédiger une mise à jour</span>
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={currentAvatar}
                      alt={currentAuthor}
                      className="w-5 h-5 rounded-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/avatars/yann.jpg'; }}
                    />
                    <span>Posté par <strong className="text-white">{currentAuthor}</strong></span>
                  </div>
                  <span className="text-[10px] text-slate-500">Ctrl + Entrée pour publier</span>
                </div>

                <MentionTextarea
                  textareaRef={textareaRef}
                  value={newText}
                  onChange={(val) => setNewText(val)}
                  onKeyDown={handleKeyDown}
                  placeholder="Rédiger une mise à jour... Tapez @ ou # pour mentionner un utilisateur."
                  rows={4}
                  className="w-full p-3 bg-[#22272e] border border-slate-700 focus:border-blue-500 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all shadow-inner"
                  darkMode={true}
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposing(false);
                      setNewText('');
                    }}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={!newText.trim() || isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Publication...' : 'Mettre à jour'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
