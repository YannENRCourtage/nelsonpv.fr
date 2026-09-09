import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getUsersForMentions } from '@/services/firebase/comments.service.js';

/**
 * Composant Textarea avec autocomplétion de mentions (@utilisateur ou #utilisateur).
 * Lorsque l'utilisateur tape @ ou #, un popup apparaît avec la liste des utilisateurs
 * filtrée par le texte tapé après le déclencheur.
 * 
 * Props:
 *  - value: string - contenu du textarea
 *  - onChange: (newValue: string) => void
 *  - onKeyDown: (e) => void - handler externe pour les raccourcis (ex: Ctrl+Enter)
 *  - placeholder: string
 *  - rows: number
 *  - className: string - classes CSS du textarea
 *  - textareaRef: React.Ref - ref externe pour le textarea
 *  - darkMode: boolean - mode sombre (Monday) ou clair (CRM)
 */
export default function MentionTextarea({
  value = '',
  onChange,
  onKeyDown,
  placeholder = '',
  rows = 4,
  className = '',
  textareaRef: externalRef,
  darkMode = true
}) {
  const internalRef = useRef(null);
  const ref = externalRef || internalRef;
  const popupRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  // Charger les utilisateurs pour les mentions au premier affichage
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await getUsersForMentions();
        setUsers(data || []);
      } catch (err) {
        console.warn('Impossible de charger les utilisateurs pour les mentions:', err);
      }
    };
    loadUsers();
  }, []);

  // Filtrer les utilisateurs selon la requête
  const filteredUsers = users.filter(u => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }).slice(0, 8);

  // Calculer la position du popup relativement au textarea
  const updatePopupPosition = useCallback(() => {
    const textarea = ref.current;
    if (!textarea) return;
    
    const rect = textarea.getBoundingClientRect();
    // Position simplifiée: en dessous du textarea
    setPopupPosition({
      top: rect.height + 4,
      left: 0
    });
  }, [ref]);

  // Détecter le caractère @ ou # et déclencher le popup
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);

    // Chercher si le caractère avant le curseur est @ ou # (ou s'il y a un @ ou # non fermé)
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = Math.max(textBeforeCursor.lastIndexOf('@'), textBeforeCursor.lastIndexOf('#'));

    if (lastAtIndex >= 0) {
      // Vérifier que le caractère avant @ est un espace, début de ligne, ou le tout début
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        // Pas de mention si la requête contient un espace (l'utilisateur a fini)
        if (!query.includes(' ') && query.length < 30) {
          setMentionQuery(query);
          setMentionTriggerIndex(lastAtIndex);
          setShowMentionPopup(true);
          setSelectedMentionIdx(0);
          updatePopupPosition();
          return;
        }
      }
    }

    setShowMentionPopup(false);
  }, [onChange, updatePopupPosition]);

  // Insérer la mention sélectionnée
  const insertMention = useCallback((user) => {
    const textarea = ref.current;
    if (!textarea) return;

    const name = user.displayName || user.email?.split('@')[0] || 'Utilisateur';
    const before = value.substring(0, mentionTriggerIndex);
    const after = value.substring(mentionTriggerIndex + 1 + mentionQuery.length);
    const newValue = `${before}@${name} ${after}`;

    onChange(newValue);
    setShowMentionPopup(false);
    setMentionQuery('');
    setMentionTriggerIndex(-1);

    // Replacer le curseur après la mention
    const newCursorPos = mentionTriggerIndex + name.length + 2;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  }, [ref, value, mentionTriggerIndex, mentionQuery, onChange]);

  // Gestion du clavier dans le popup
  const handleKeyDownInternal = useCallback((e) => {
    if (showMentionPopup && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIdx(prev => Math.min(prev + 1, filteredUsers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIdx(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredUsers[selectedMentionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionPopup(false);
        return;
      }
    }

    // Passer au handler externe
    if (onKeyDown) onKeyDown(e);
  }, [showMentionPopup, filteredUsers, selectedMentionIdx, insertMention, onKeyDown]);

  // Fermer le popup au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowMentionPopup(false);
      }
    };
    if (showMentionPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMentionPopup]);

  const bgPopup = darkMode ? 'bg-[#2c3038]' : 'bg-white';
  const borderPopup = darkMode ? 'border-slate-600' : 'border-slate-200';
  const textPopup = darkMode ? 'text-white' : 'text-slate-900';
  const hoverPopup = darkMode ? 'hover:bg-slate-700' : 'hover:bg-blue-50';
  const selectedPopup = darkMode ? 'bg-blue-600/30' : 'bg-blue-100';
  const subtextPopup = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {/* Popup d'autocomplétion des mentions */}
      {showMentionPopup && filteredUsers.length > 0 && (
        <div
          ref={popupRef}
          className={`absolute z-[60000] ${bgPopup} border ${borderPopup} rounded-xl shadow-2xl py-1 max-h-52 overflow-y-auto w-64 animate-in fade-in slide-in-from-bottom-2 duration-150`}
          style={{ top: popupPosition.top, left: popupPosition.left }}
        >
          <div className={`px-3 py-1.5 text-[10px] font-bold ${subtextPopup} uppercase border-b ${borderPopup}`}>
            Mentionner un utilisateur
          </div>
          {filteredUsers.map((u, idx) => (
            <button
              key={u.id || idx}
              type="button"
              onClick={() => insertMention(u)}
              onMouseEnter={() => setSelectedMentionIdx(idx)}
              className={`w-full px-3 py-2 flex items-center gap-2.5 text-left text-sm ${textPopup} ${hoverPopup} transition-colors cursor-pointer ${
                idx === selectedMentionIdx ? selectedPopup : ''
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                {(u.displayName || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate">{u.displayName || 'Utilisateur'}</div>
                {u.email && (
                  <div className={`text-[10px] ${subtextPopup} truncate`}>{u.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
