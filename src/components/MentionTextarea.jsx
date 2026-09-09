import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getUsersForMentions } from '@/services/firebase/comments.service.js';

// Liste de secours des collaborateurs connus de l'équipe ENR Courtage / Nelson
const FALLBACK_TEAM = [
  { id: 'team_nico_d', displayName: 'Nicolas DESAINT', email: 'n.desaint@enr-courtage.fr', role: 'Direction' },
  { id: 'team_nico', displayName: 'Nicolas', email: 'nicolas@enr-courtage.fr', role: 'Commercial' },
  { id: 'team_nmd', displayName: 'NicolasNMD', email: 'nmd@enr-courtage.fr', role: 'Développement' },
  { id: 'team_yann', displayName: 'Yann', email: 'y.barberis@enr-courtage.fr', role: 'Conseiller' },
  { id: 'team_vero', displayName: 'Véronique', email: 'v.dutard@enr-courtage.fr', role: 'Comptabilité' },
  { id: 'team_elodie', displayName: 'Elodie', email: 'elodie@enr-courtage.fr', role: 'Gestion' },
  { id: 'team_jack', displayName: 'Jack', email: 'jack@enr-courtage.fr', role: 'Technique' },
  { id: 'team_laurent', displayName: 'Laurent', email: 'laurent@enr-courtage.fr', role: 'Technique' },
  { id: 'team_philippe', displayName: 'Philippe', email: 'philippe@enr-courtage.fr', role: 'Partenaire' }
];

/**
 * Composant Textarea avec autocomplétion intelligente de mentions (@utilisateur ou #utilisateur).
 * Garantit que la liste déroulante reste 100% visible à l'écran sur Desktop et Mobile.
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

  const [users, setUsers] = useState(FALLBACK_TEAM);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState(0);
  const [popupStyle, setPopupStyle] = useState({});

  // Charger les utilisateurs depuis Firebase et fusionner avec l'équipe de référence
  useEffect(() => {
    let isMounted = true;
    const loadUsers = async () => {
      try {
        const firestoreUsers = await getUsersForMentions();
        if (isMounted && Array.isArray(firestoreUsers) && firestoreUsers.length > 0) {
          const map = new Map();
          // 1. Ajouter l'équipe de fallback
          FALLBACK_TEAM.forEach(u => map.set(u.displayName.toLowerCase(), u));
          // 2. Fusionner avec les utilisateurs Firestore récents
          firestoreUsers.forEach(u => {
            const name = u.displayName || u.email?.split('@')[0];
            if (name) map.set(name.toLowerCase(), { ...u, displayName: name });
          });
          setUsers(Array.from(map.values()));
        }
      } catch (err) {
        console.warn('Utilisation de la liste de secours pour les mentions:', err);
      }
    };
    loadUsers();
    return () => { isMounted = false; };
  }, []);

  // Filtrer les utilisateurs selon la recherche
  const filteredUsers = users.filter(u => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }).slice(0, 8);

  // Calcul dynamique et adaptatif de la position du popup (Viewport-aware, anti-clipping)
  const updatePopupPosition = useCallback(() => {
    const textarea = ref.current;
    if (!textarea) return;

    const rect = textarea.getBoundingClientRect();
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const visualTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
    const visualLeft = window.visualViewport ? window.visualViewport.offsetLeft : 0;

    // Espace visible disponible au-dessus et en-dessous (en tenant compte du clavier virtuel mobile)
    const spaceBelow = viewportHeight - (rect.bottom - visualTop);
    const spaceAbove = rect.top - visualTop;

    // Si l'espace en bas est restreint (< 190px) et qu'il y a plus de place en haut, ouvrir vers le haut
    const openUpwards = spaceBelow < 190 && spaceAbove > spaceBelow;

    const availableSpace = openUpwards ? spaceAbove - 12 : spaceBelow - 12;
    const dynamicMaxHeight = Math.max(120, Math.min(220, availableSpace));
    const width = Math.min(290, viewportWidth - 24);
    const left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12));

    if (openUpwards) {
      setPopupStyle({
        position: 'fixed',
        bottom: `${viewportHeight - (rect.top - visualTop) + 6}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${dynamicMaxHeight}px`,
        zIndex: 100000
      });
    } else {
      setPopupStyle({
        position: 'fixed',
        top: `${rect.bottom + 6}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${dynamicMaxHeight}px`,
        zIndex: 100000
      });
    }
  }, [ref]);

  // Recalculer la position quand le popup s'affiche ou lors du redimensionnement / clavier mobile
  useEffect(() => {
    if (!showMentionPopup) return;
    updatePopupPosition();

    const handleResizeOrScroll = () => updatePopupPosition();
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResizeOrScroll);
      window.visualViewport.addEventListener('scroll', handleResizeOrScroll);
    }

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResizeOrScroll);
        window.visualViewport.removeEventListener('scroll', handleResizeOrScroll);
      }
    };
  }, [showMentionPopup, updatePopupPosition]);

  // Détection du caractère @ ou #
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);

    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = Math.max(textBeforeCursor.lastIndexOf('@'), textBeforeCursor.lastIndexOf('#'));

    if (lastAtIndex >= 0) {
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        if (!query.includes(' ') && query.length < 30) {
          setMentionQuery(query);
          setMentionTriggerIndex(lastAtIndex);
          setShowMentionPopup(true);
          setSelectedMentionIdx(0);
          return;
        }
      }
    }

    setShowMentionPopup(false);
  }, [onChange]);

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

    const newCursorPos = mentionTriggerIndex + name.length + 2;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  }, [ref, value, mentionTriggerIndex, mentionQuery, onChange]);

  // Navigation clavier
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

    if (onKeyDown) onKeyDown(e);
  }, [showMentionPopup, filteredUsers, selectedMentionIdx, insertMention, onKeyDown]);

  // Fermer le popup au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) && !ref.current?.contains(e.target)) {
        setShowMentionPopup(false);
      }
    };
    if (showMentionPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMentionPopup, ref]);

  const bgPopup = darkMode ? 'bg-[#1f242c]' : 'bg-white';
  const borderPopup = darkMode ? 'border-slate-600/90' : 'border-slate-300';
  const textPopup = darkMode ? 'text-white' : 'text-slate-900';
  const hoverPopup = darkMode ? 'hover:bg-slate-700/70' : 'hover:bg-blue-50';
  const selectedPopup = darkMode ? 'bg-blue-600/35 ring-1 ring-blue-500/50' : 'bg-blue-100 ring-1 ring-blue-400';
  const subtextPopup = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="relative w-full">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {/* Popup flottant intelligent d'autocomplétion des mentions (Fixed, VisualViewport-aware) */}
      {showMentionPopup && filteredUsers.length > 0 && (
        <div
          ref={popupRef}
          style={popupStyle}
          className={`${bgPopup} border ${borderPopup} rounded-2xl shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md`}
        >
          <div className={`px-3 py-1.5 text-[10px] font-black ${subtextPopup} uppercase border-b ${borderPopup} sticky top-0 ${bgPopup} flex items-center justify-between`}>
            <span>Mentionner un membre</span>
            <span className="text-[9px] font-normal lowercase">@ ou #</span>
          </div>
          <div className="p-1 space-y-0.5">
            {filteredUsers.map((u, idx) => (
              <button
                key={u.id || idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  insertMention(u);
                }}
                onMouseEnter={() => setSelectedMentionIdx(idx)}
                className={`w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-left text-xs ${textPopup} ${hoverPopup} transition-all cursor-pointer ${
                  idx === selectedMentionIdx ? selectedPopup : ''
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-xs">
                  {(u.displayName || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate text-xs flex items-center justify-between">
                    <span>{u.displayName || 'Utilisateur'}</span>
                    {u.role && (
                      <span className={`text-[9px] font-medium ${subtextPopup} shrink-0`}>{u.role}</span>
                    )}
                  </div>
                  {u.email && (
                    <div className={`text-[10px] ${subtextPopup} truncate`}>{u.email}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
