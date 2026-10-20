import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Zap, Activity, Clock, ShieldCheck, Sun, Moon, Sunrise, Sunset, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * RÉFÉRENTIEL EXACT DES 24 HEURES D'UNE BATTERIE BESS (HOURLY_BESS_DATA)
 * Conforme au modèle pédagogique Solaime Énergies et au modèle économique ENR COURTAGE.
 */
export const HOURLY_BESS_DATA = [
  {
    hour: 0,
    time: '00:00',
    label: '00h',
    periode: 'NUIT',
    ambianceBadge: '🌙 NUIT',
    etat: 'VEILLE ACTIVE • 50 HZ',
    soc: 40,
    mission: 'FCR',
    prixColor: '#65a30d',
    actionColor: '#38bdf8',
    texte: 'La nuit est calme. La batterie veille sur le réseau : elle corrige en continu les petits écarts de fréquence, pour que le courant reste exactement à 50 Hz.'
  },
  {
    hour: 1,
    time: '01:00',
    label: '01h',
    periode: 'NUIT',
    ambianceBadge: '🌙 NUIT',
    etat: 'VEILLE ACTIVE • 50 HZ',
    soc: 40,
    mission: 'FCR',
    prixColor: '#65a30d',
    actionColor: '#38bdf8',
    texte: 'La nuit se poursuit. La batterie maintient sa veille active seconde par seconde pour stabiliser la fréquence à 50 Hz.'
  },
  {
    hour: 2,
    time: '02:00',
    label: '02h',
    periode: 'NUIT',
    ambianceBadge: '🌙 NUIT',
    etat: 'SE CHARGE',
    soc: 55,
    mission: 'DAY_AHEAD',
    prixColor: '#4d7c0f',
    actionColor: '#f59e0b',
    texte: "L'électricité est abondante et bon marché. La batterie fait le plein — un achat programmé la veille, sur le marché Day-Ahead."
  },
  {
    hour: 3,
    time: '03:00',
    label: '03h',
    periode: 'NUIT',
    ambianceBadge: '🌙 NUIT',
    etat: 'SE CHARGE',
    soc: 70,
    mission: 'DAY_AHEAD',
    prixColor: '#3f6212',
    actionColor: '#f59e0b',
    texte: 'Creux de consommation nocturne : la batterie poursuit sa recharge programmée au tarif le plus bas de la nuit.'
  },
  {
    hour: 4,
    time: '04:00',
    label: '04h',
    periode: 'NUIT',
    ambianceBadge: '🌙 NUIT',
    etat: 'SE CHARGE',
    soc: 85,
    mission: 'DAY_AHEAD',
    prixColor: '#4d7c0f',
    actionColor: '#f59e0b',
    texte: 'Fin du cycle de charge nocturne : les réserves d\'énergie sont constituées avant le réveil du réseau.'
  },
  {
    hour: 5,
    time: '05:00',
    label: '05h',
    periode: 'NUIT',
    ambianceBadge: '🌙 NUIT',
    etat: 'VEILLE ACTIVE • 50 HZ',
    soc: 85,
    mission: 'FCR',
    prixColor: '#65a30d',
    actionColor: '#38bdf8',
    texte: 'Pause avant la pointe matinale : la batterie veille sur l\'équilibre du réseau à 50 Hz.'
  },
  {
    hour: 6,
    time: '06:00',
    label: '06h',
    periode: 'AUBE',
    ambianceBadge: '🌅 AUBE',
    etat: 'INJECTE DANS LE RÉSEAU',
    soc: 68,
    mission: 'DAY_AHEAD',
    prixColor: '#a16207',
    actionColor: '#f43f5e',
    texte: 'La France se réveille, la demande grimpe : la batterie commence à restituer l\'énergie stockée cette nuit.'
  },
  {
    hour: 7,
    time: '07:00',
    label: '07h',
    periode: 'AUBE',
    ambianceBadge: '🌅 AUBE',
    etat: 'INJECTE DANS LE RÉSEAU',
    soc: 52,
    mission: 'DAY_AHEAD',
    prixColor: '#b45309',
    actionColor: '#f43f5e',
    texte: 'Pointe du matin — elle injecte l\'énergie achetée pas chère, au moment où le réseau en a besoin.'
  },
  {
    hour: 8,
    time: '08:00',
    label: '08h',
    periode: 'AUBE',
    ambianceBadge: '🌅 AUBE',
    etat: 'INJECTE DANS LE RÉSEAU',
    soc: 42,
    mission: 'DAY_AHEAD',
    prixColor: '#b45309',
    actionColor: '#f43f5e',
    texte: 'Dernières ventes de la matinée, avant l\'arrivée massive du solaire.'
  },
  {
    hour: 9,
    time: '09:00',
    label: '09h',
    periode: 'PLEIN JOUR',
    ambianceBadge: '☀️ PLEIN JOUR',
    etat: 'VEILLE ACTIVE • 50 HZ',
    soc: 42,
    mission: 'FCR',
    prixColor: '#a16207',
    actionColor: '#38bdf8',
    texte: 'Pause sur les marchés : la batterie stabilise la fréquence du réseau.'
  },
  {
    hour: 10,
    time: '10:00',
    label: '10h',
    periode: 'PLEIN JOUR',
    ambianceBadge: '☀️ PLEIN JOUR',
    etat: 'SE CHARGE',
    soc: 58,
    mission: 'DAY_AHEAD',
    prixColor: '#4d7c0f',
    actionColor: '#f59e0b',
    texte: 'Plein soleil : les panneaux produisent en masse, l\'électricité redevient très bon marché — la batterie se recharge.'
  },
  {
    hour: 11,
    time: '11:00',
    label: '11h',
    periode: 'PLEIN JOUR',
    ambianceBadge: '☀️ PLEIN JOUR',
    etat: 'SE CHARGE',
    soc: 74,
    mission: 'DAY_AHEAD',
    prixColor: '#15803d',
    actionColor: '#f59e0b',
    texte: 'Elle continue de stocker ce surplus solaire...'
  },
  {
    hour: 12,
    time: '12:00',
    label: '12h',
    periode: 'PLEIN JOUR',
    ambianceBadge: '☀️ PLEIN JOUR',
    etat: 'SE CHARGE',
    soc: 88,
    mission: 'DAY_AHEAD',
    prixColor: '#166534',
    actionColor: '#f59e0b',
    texte: 'Pic de production photovoltaïque méridien : la batterie absorbe l\'énergie solaire abondante.'
  },
  {
    hour: 13,
    time: '13:00',
    label: '13h',
    periode: 'PLEIN JOUR',
    ambianceBadge: '☀️ PLEIN JOUR',
    etat: 'SE CHARGE',
    soc: 100,
    mission: 'INTRADAY',
    prixColor: '#14532d',
    actionColor: '#f59e0b',
    texte: 'Il y a même trop d\'électricité : les prix deviennent négatifs. Sur le marché Intraday, la batterie est payée pour se charger !'
  },
  {
    hour: 14,
    time: '14:00',
    label: '14h',
    periode: 'PLEIN JOUR',
    ambianceBadge: '☀️ PLEIN JOUR',
    etat: 'PRÊTE POUR LA POINTE',
    soc: 100,
    mission: 'CAPACITE',
    prixColor: '#15803d',
    actionColor: '#10b981',
    texte: 'Batterie pleine. Elle se déclare disponible pour la pointe du soir : c\'est le mécanisme de capacité.'
  },
  {
    hour: 15,
    time: '15:00',
    label: '15h',
    periode: 'PLEIN JOUR',
    ambianceBadge: '☀️ PLEIN JOUR',
    etat: 'INJECTE DANS LE RÉSEAU',
    soc: 90,
    mission: 'INTRADAY',
    prixColor: '#65a30d',
    actionColor: '#f43f5e',
    texte: 'Une occasion se présente en temps réel : petite vente sur le marché Intraday.'
  },
  {
    hour: 16,
    time: '16:00',
    label: '16h',
    periode: 'PLEIN JOUR',
    ambianceBadge: '☀️ PLEIN JOUR',
    etat: 'VEILLE ACTIVE • 50 HZ',
    soc: 90,
    mission: 'FCR',
    prixColor: '#a16207',
    actionColor: '#38bdf8',
    texte: 'Retour en veille active : elle stabilise la fréquence en attendant le soir.'
  },
  {
    hour: 17,
    time: '17:00',
    label: '17h',
    periode: 'SOIR',
    ambianceBadge: '🌆 SOIR',
    etat: 'PRÊTE POUR LA POINTE',
    soc: 90,
    mission: 'CAPACITE',
    prixColor: '#b45309',
    actionColor: '#10b981',
    texte: 'Avant la grande pointe, elle reste en réserve — son engagement de capacité envers le réseau.'
  },
  {
    hour: 18,
    time: '18:00',
    label: '18h',
    periode: 'SOIR',
    ambianceBadge: '🌆 SOIR',
    etat: 'INJECTE DANS LE RÉSEAU',
    soc: 68,
    mission: 'DAY_AHEAD',
    prixColor: '#c2410c',
    actionColor: '#f43f5e',
    texte: 'Début de la pointe du soir : les foyers rentrent, la demande s\'envole et la batterie injecte sur le réseau.'
  },
  {
    hour: 19,
    time: '19:00',
    label: '19h',
    periode: 'SOIR',
    ambianceBadge: '🌆 SOIR',
    etat: 'INJECTE DANS LE RÉSEAU',
    soc: 44,
    mission: 'DAY_AHEAD',
    prixColor: '#b91c1c',
    actionColor: '#f43f5e',
    texte: 'Pic de consommation : c\'est maintenant que son énergie est la plus précieuse pour le réseau.'
  },
  {
    hour: 20,
    time: '20:00',
    label: '20h',
    periode: 'SOIR',
    ambianceBadge: '🌆 SOIR',
    etat: 'INJECTE DANS LE RÉSEAU',
    soc: 24,
    mission: 'DAY_AHEAD',
    prixColor: '#991b1b',
    actionColor: '#f43f5e',
    texte: 'La pointe se prolonge — elle continue d\'alimenter le réseau.'
  },
  {
    hour: 21,
    time: '21:00',
    label: '21h',
    periode: 'SOIR',
    ambianceBadge: '🌆 SOIR',
    etat: 'INJECTE DANS LE RÉSEAU',
    soc: 15,
    mission: 'DAY_AHEAD',
    prixColor: '#b45309',
    actionColor: '#f43f5e',
    texte: 'Fin de la pointe vespérale : la batterie termine de restituer son énergie au prix fort.'
  },
  {
    hour: 22,
    time: '22:00',
    label: '22h',
    periode: 'NUIT',
    ambianceBadge: '🌙 NUIT',
    etat: 'VEILLE ACTIVE • 50 HZ',
    soc: 25,
    mission: 'FCR',
    prixColor: '#a16207',
    actionColor: '#38bdf8',
    texte: 'La consommation retombe : la batterie repasse en stabilisation de fréquence à 50 Hz.'
  },
  {
    hour: 23,
    time: '23:00',
    label: '23h',
    periode: 'NUIT',
    ambianceBadge: '🌙 NUIT',
    etat: 'VEILLE ACTIVE • 50 HZ',
    soc: 35,
    mission: 'FCR',
    prixColor: '#65a30d',
    actionColor: '#38bdf8',
    texte: 'Veille nocturne : la batterie maintient le 50 Hz et prépare le prochain cycle journalier.'
  }
];

// Alias de rétrocompatibilité
export const BESS_24H_CYCLE = HOURLY_BESS_DATA;

/**
 * CONFIGURATION DES 4 MISSIONS DE MONÉTISATION (VALUE STACKING)
 */
export const MISSIONS_LIST = [
  {
    id: 'FCR',
    title: 'Régulation de fréquence',
    code: 'FCR',
    color: '#38bdf8',
    borderClass: 'border-[#38bdf8]',
    bgActiveClass: 'bg-sky-50/90 ring-2 ring-[#38bdf8]',
    badgeActiveClass: 'bg-[#38bdf8] text-slate-950',
    bulletColor: 'bg-[#38bdf8]',
    description: 'La batterie stabilise le réseau seconde par seconde, pour maintenir le courant exactement à 50 Hz.'
  },
  {
    id: 'CAPACITE',
    title: 'Mécanisme de capacité',
    code: 'CAPACITÉ',
    color: '#10b981',
    borderClass: 'border-[#10b981]',
    bgActiveClass: 'bg-emerald-50/90 ring-2 ring-[#10b981]',
    badgeActiveClass: 'bg-[#10b981] text-white',
    bulletColor: 'bg-[#10b981]',
    description: 'Elle garantit d\'être disponible et chargée aux heures où la France consomme le plus.'
  },
  {
    id: 'DAY_AHEAD',
    title: 'Marché Day-Ahead',
    code: 'DAY-AHEAD',
    color: '#f59e0b',
    borderClass: 'border-[#f59e0b]',
    bgActiveClass: 'bg-amber-50/90 ring-2 ring-[#f59e0b]',
    badgeActiveClass: 'bg-[#f59e0b] text-white',
    bulletColor: 'bg-[#f59e0b]',
    description: 'La veille, elle programme ses achats quand l\'électricité est abondante — et ses ventes aux heures chères.'
  },
  {
    id: 'INTRADAY',
    title: 'Marché Intraday',
    code: 'INTRADAY',
    color: '#eab308',
    borderClass: 'border-[#eab308]',
    bgActiveClass: 'bg-yellow-50/90 ring-2 ring-[#eab308]',
    badgeActiveClass: 'bg-[#eab308] text-slate-950',
    bulletColor: 'bg-[#eab308]',
    description: 'En cours de journée, elle saisit les occasions de dernière minute, au fil de l\'eau.'
  }
];

/**
 * Mise en gras dynamique des mots-clés pédagogiques dans le texte narratif
 */
function renderHighlightedNarrative(text) {
  if (!text) return null;

  // Liste des expressions clés à valoriser
  const keywords = [
    '50 Hz',
    'Day-Ahead',
    'Intraday',
    'mécanisme de capacité',
    'prix négatifs',
    'surplus solaire',
    'panneaux produisent en masse',
    'pointe du matin',
    'pointe du soir',
    'grande pointe',
    'Pic de consommation',
    'Fin de la pointe vespérale',
    'bon marché',
    'pas chère',
    'plus précieuse',
    'prix fort',
    'se recharge',
    'recharge programmée',
    'fait le plein',
    'restituer l\'énergie',
    'injecte l\'énergie',
    'injecte sur le réseau',
    'veille active',
    'veille sur le réseau',
    'Veille nocturne',
    'stabilise la fréquence',
    'stabiliser la fréquence',
    'engagement de capacité'
  ];

  // Construction de l'expression régulière
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');

  const parts = text.split(regex);
  return parts.map((part, index) => {
    const isKw = keywords.some((kw) => kw.toLowerCase() === part.toLowerCase());
    if (isKw) {
      return (
        <strong key={index} className="font-extrabold text-slate-950 underline decoration-amber-400 decoration-2 underline-offset-2">
          {part}
        </strong>
      );
    }
    return part;
  });
}

/**
 * COMPOSANT PRINCIPAL : 24 HEURES DANS LA VIE D'UNE BATTERIE
 * @param {number} defaultHour - Heure sélectionnée par défaut (0-23, défaut 13h)
 * @param {boolean} compact - Mode compact si nécessaire
 * @param {boolean} isPdf - Mode PDF statique haute définition
 */
export default function BessDailyCycleVisualizer({ defaultHour = 13, compact = false, isPdf = false }) {
  const [selectedHour, setSelectedHour] = useState(defaultHour);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  const current = HOURLY_BESS_DATA[selectedHour] || HOURLY_BESS_DATA[13];

  // Auto-play 1500ms : boucle 00h -> 23h
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setSelectedHour((prev) => (prev + 1) % 24);
      }, 1500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  // Icône et badge d'ambiance
  const getAmbienceIcon = (periode) => {
    switch (periode) {
      case 'NUIT':
        return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
      case 'AUBE':
        return <Sunrise className="w-3.5 h-3.5 text-amber-500" />;
      case 'PLEIN JOUR':
        return <Sun className="w-3.5 h-3.5 text-yellow-500" />;
      case 'SOIR':
        return <Sunset className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const getAmbienceBg = (periode) => {
    switch (periode) {
      case 'NUIT':
        return 'bg-indigo-50 text-indigo-900 border-indigo-200';
      case 'AUBE':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'PLEIN JOUR':
        return 'bg-yellow-50 text-yellow-950 border-yellow-200';
      case 'SOIR':
        return 'bg-rose-50 text-rose-900 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-200';
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-slate-900 select-none shadow-xs">
      <style>{`
        @keyframes bessPulseRight {
          0% { transform: translateX(0px); opacity: 0.3; }
          50% { opacity: 1; transform: translateX(18px); }
          100% { transform: translateX(36px); opacity: 0.15; }
        }
        @keyframes bessPulseLeft {
          0% { transform: translateX(0px); opacity: 0.3; }
          50% { opacity: 1; transform: translateX(-18px); }
          100% { transform: translateX(-36px); opacity: 0.15; }
        }
        @keyframes bessPulseBi {
          0%, 100% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.25); opacity: 1; }
        }
        .anim-flow-right {
          animation: bessPulseRight 1.2s infinite ease-in-out;
        }
        .anim-flow-left {
          animation: bessPulseLeft 1.2s infinite ease-in-out;
        }
        .anim-flow-bi {
          animation: bessPulseBi 1.4s infinite ease-in-out;
        }
      `}</style>

      {/* ========================================================================= */}
      {/* ÉTAGE A : EN-TÊTE ET CONTRÔLE TEMPOREL                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        {/* Titre avec pastille verte */}
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-[#0b192c]">
                24 HEURES DANS LA VIE D'UNE BATTERIE
              </h3>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Solaime &amp; ENR Courtage
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 font-medium">
              Une journée type, expliquée simplement
            </p>
          </div>
        </div>

        {/* Barre de contrôle interactive */}
        <div className="flex items-center gap-2.5">
          {/* Bouton ambre Suivre la journée */}
          <button
            type="button"
            onClick={togglePlay}
            data-html2canvas-ignore="true"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-300'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
            title={isPlaying ? 'Mettre en pause la journée' : 'Lancer le parcours automatique 24h'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Suivre la journée</span>
              </>
            )}
          </button>

          {/* Slider horizontal avec curseur rond ambre */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <input
              type="range"
              min="0"
              max="23"
              step="1"
              value={selectedHour}
              onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
              className="w-24 sm:w-32 accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              title="Sélectionner une heure"
            />
            {/* Affichage heure à droite */}
            <span className="text-xs font-black text-amber-700 font-mono min-w-[36px] text-right">
              {String(selectedHour).padStart(2, '0')} h
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÉTAGE B & C : BANDEAU SYNOPTIQUE ANIMÉ + ENCADRÉ NARRATIF HORODATÉ        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-12 gap-3 my-3 items-stretch">
        {/* ÉTAGE B : BANDEAU SYNOPTIQUE ANIMÉ (7 colonnes) */}
        <div className="col-span-12 lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between relative shadow-2xs">
          {/* Badge d'ambiance en haut à droite */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
              Flux Énergétique HTA &amp; Stockage BESS
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${getAmbienceBg(
                current.periode
              )}`}
            >
              {getAmbienceIcon(current.periode)}
              {current.ambianceBadge}
            </span>
          </div>

          {/* Centre du bandeau : Pylône <---> Flux animé <---> Batterie */}
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            {/* À gauche : Icône SVG Pylône HTA + label */}
            <div className="flex flex-col items-center text-center shrink-0 w-28">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs mb-1">
                <svg
                  viewBox="0 0 24 24"
                  className="w-7 h-7 text-slate-700 stroke-current"
                  fill="none"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20" />
                  <path d="M7 6l10 0" />
                  <path d="M5 11l14 0" />
                  <path d="M4 17l16 0" />
                  <path d="M8 2l-4 20" />
                  <path d="M16 2l4 20" />
                  <path d="M8 6l8 5" />
                  <path d="M16 6l-8 5" />
                  <path d="M7 11l10 6" />
                  <path d="M17 11l-10 6" />
                </svg>
              </div>
              <span className="text-[10.5px] font-black text-slate-900 leading-tight">
                Le réseau électrique
              </span>
              <span className="text-[9px] font-bold text-slate-500">
                Enedis HTA 20 kV
              </span>
            </div>

            {/* Au centre : Label d'état en majuscules + 3 points lumineux animés */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
              {/* Label d'état dynamique en majuscules */}
              <div className="mb-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wide border shadow-2xs"
                  style={{
                    backgroundColor: `${current.actionColor}18`,
                    color: current.actionColor === '#38bdf8' ? '#0369a1' : current.actionColor,
                    borderColor: `${current.actionColor}40`
                  }}
                >
                  {current.actionColor === '#f59e0b' && <ArrowRight className="w-3.5 h-3.5 text-amber-600" />}
                  {current.actionColor === '#f43f5e' && <ArrowLeft className="w-3.5 h-3.5 text-rose-600" />}
                  {current.actionColor === '#10b981' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  {current.actionColor === '#38bdf8' && <Activity className="w-3.5 h-3.5 text-sky-600" />}
                  <span>{current.etat}</span>
                </span>
              </div>

              {/* Ligne conductrice avec 3 points lumineux animés */}
              <div className="relative w-full max-w-[190px] h-6 flex items-center justify-center">
                <div className="absolute inset-x-0 h-1 bg-slate-300 rounded-full" />

                {/* Animation selon le sens de flux */}
                {current.actionColor === '#f59e0b' && (
                  <div className="relative flex items-center justify-center gap-4 anim-flow-right">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                  </div>
                )}

                {current.actionColor === '#f43f5e' && (
                  <div className="relative flex items-center justify-center gap-4 anim-flow-left">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
                  </div>
                )}

                {current.actionColor === '#38bdf8' && (
                  <div className="relative flex items-center justify-center gap-4 anim-flow-bi">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                  </div>
                )}

                {current.actionColor === '#10b981' && (
                  <div className="relative flex items-center justify-center gap-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-ping" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                  </div>
                )}
              </div>

              <span className="text-[9.5px] font-semibold text-slate-500 mt-1">
                {current.actionColor === '#f59e0b' && 'Recharge programmée (soutirage)'}
                {current.actionColor === '#f43f5e' && 'Injection sur le réseau public'}
                {current.actionColor === '#38bdf8' && 'Stabilisation réseau seconde par seconde'}
                {current.actionColor === '#10b981' && 'Réserve de capacité disponible'}
              </span>
            </div>

            {/* À droite : Icône SVG Batterie BESS verticale avec remplissage dynamique AMBRE */}
            <div className="flex flex-col items-center text-center shrink-0 w-28">
              <div className="relative w-12 h-16 bg-white border-2 border-slate-700 rounded-md p-0.5 flex flex-col justify-end shadow-xs mb-1 overflow-hidden">
                {/* Borne supérieure batterie */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-slate-700 rounded-t-xs" />

                {/* Remplissage dynamique AMBRE proportionnel au SoC */}
                <div
                  className="w-full rounded-xs transition-all duration-300 ease-out flex items-center justify-center"
                  style={{
                    height: `${Math.max(10, current.soc)}%`,
                    backgroundColor: '#f59e0b'
                  }}
                />

                {/* Pourcentage SoC exact centré au milieu de la batterie */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-black text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">
                    {current.soc} %
                  </span>
                </div>
              </div>
              <span className="text-[10.5px] font-black text-slate-900 leading-tight">
                Batterie BESS
              </span>
              <span className="text-[9px] font-extrabold text-amber-600">
                SoC {current.soc} %
              </span>
            </div>
          </div>
        </div>

        {/* ÉTAGE C : ENCADRÉ NARRATIF HORODATÉ (5 colonnes) */}
        <div className="col-span-12 lg:col-span-5 border-l-4 border-amber-500 bg-amber-50/50 rounded-r-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs">
          <div>
            {/* Timestamp monospace ambre */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-base font-black font-mono text-amber-600 tracking-wider">
                  {current.time}
                </span>
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-800">
                Mission {current.mission}
              </span>
            </div>

            {/* Texte narratif avec mots-clés en gras */}
            <p className="text-xs text-slate-800 leading-relaxed font-normal">
              "{renderHighlightedNarrative(current.texte)}"
            </p>
          </div>

          {/* Pied de carte narratif */}
          <div className="pt-2 border-t border-amber-200/80 mt-2 flex items-center justify-between text-[10px]">
            <span className="text-slate-600 font-medium">
              Période : <strong className="text-slate-900">{current.periode}</strong>
            </span>
            <span className="text-slate-600 font-medium">
              SoC BESS : <strong className="text-amber-700 font-black">{current.soc}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÉTAGE D : GRILLE DES 4 CARTES DE MISSIONS (4 COLONNES)                     */}
      {/* ========================================================================= */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-600">
            Activation des 4 Piliers de Monétisation (Value Stacking)
          </span>
          <span className="text-[9px] font-semibold text-slate-400">
            Mission en cours à {current.time} : <strong className="text-slate-800 uppercase">{current.mission}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {MISSIONS_LIST.map((m) => {
            const isActive = current.mission === m.id;
            return (
              <div
                key={m.id}
                className={`rounded-xl p-2.5 border transition-all duration-200 flex flex-col justify-between ${
                  isActive
                    ? `${m.bgActiveClass} ${m.borderClass} shadow-xs`
                    : 'border-slate-200 bg-white/70 text-slate-500 opacity-60'
                }`}
              >
                <div>
                  {/* Titre et Pastille */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <h4 className="text-[11px] font-black text-slate-900 leading-tight">
                      {m.code} — <span className="font-extrabold">{m.title}</span>
                    </h4>
                  </div>

                  {/* Description verbatim */}
                  <p className="text-[9.5px] text-slate-700 leading-snug line-clamp-2">
                    {m.description}
                  </p>
                </div>

                {/* Badge en bas */}
                <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase">Statut</span>
                  <span
                    className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive
                        ? m.badgeActiveClass
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isActive ? '● EN MISSION' : 'EN VEILLE'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÉTAGE E : DOUBLE FRISE INTERACTIVE DE 24 BLOCS (00H À 23H)                */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3">
        {/* LIGNE 1 : PRIX DE L'ÉLECTRICITÉ */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[9px] font-black text-slate-700 mb-1 px-0.5">
            <span className="uppercase tracking-wide">
              Prix de l'électricité • vert = bon marché, rouge = cher — cliquez sur une heure
            </span>
            <span className="text-slate-400 font-bold hidden sm:inline">
              00h à 23h
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
              gap: '2px'
            }}
          >
            {HOURLY_BESS_DATA.map((h) => {
              const isSelected = h.hour === selectedHour;
              return (
                <button
                  key={`prix-${h.hour}`}
                  type="button"
                  onClick={() => setSelectedHour(h.hour)}
                  className={`h-5 sm:h-5.5 rounded-xs flex items-center justify-center text-[8px] sm:text-[8.5px] font-black transition-all ${
                    isSelected
                      ? 'ring-2 ring-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] scale-105 z-10 font-black'
                      : 'hover:opacity-85'
                  }`}
                  style={{
                    backgroundColor: h.prixColor,
                    color: '#ffffff'
                  }}
                  title={`${h.label} (${h.time}) : ${h.periode} — ${h.etat}`}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* LIGNE 2 : CE QUE FAIT LA BATTERIE */}
        <div className="mb-1">
          <div className="flex items-center justify-between text-[9px] font-black text-slate-700 mb-1 px-0.5">
            <span className="uppercase tracking-wide">
              Ce que fait la batterie
            </span>
            <span className="text-amber-700 font-mono font-black text-[10px]">
              Heure active : {current.time}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
              gap: '2px'
            }}
          >
            {HOURLY_BESS_DATA.map((h) => {
              const isSelected = h.hour === selectedHour;
              return (
                <button
                  key={`action-${h.hour}`}
                  type="button"
                  onClick={() => setSelectedHour(h.hour)}
                  className={`h-5 sm:h-5.5 rounded-xs flex items-center justify-center text-[9px] font-black transition-all ${
                    isSelected
                      ? 'ring-2 ring-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] scale-105 z-10 text-white font-black'
                      : 'hover:opacity-85 text-white/90'
                  }`}
                  style={{
                    backgroundColor: h.actionColor
                  }}
                  title={`${h.label} : ${h.etat} (${h.mission})`}
                >
                  {isSelected ? '●' : ''}
                </button>
              );
            })}
          </div>

          {/* GRADUATIONS HORAIRES SOUS LA 2E BARRE : 00, 03, 06, 09, 12, 15, 18, 21 */}
          <div
            className="mt-1"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
              gap: '2px'
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((hr) => {
              const showTick = hr % 3 === 0;
              return (
                <div key={`tick-${hr}`} className="text-center">
                  {showTick ? (
                    <span className="text-[8px] sm:text-[8.5px] font-mono font-bold text-slate-500">
                      {String(hr).padStart(2, '0')}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* LÉGENDE HORIZONTALE EN BAS */}
        <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-[9px] font-bold text-slate-700">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] shadow-xs" />
              <span>Se charge quand c'est bon marché</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#f43f5e] shadow-xs" />
              <span>Restitue quand c'est cher</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#38bdf8] shadow-xs" />
              <span>Stabilise la fréquence (50 Hz)</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981] shadow-xs" />
              <span>Se tient prête pour la pointe</span>
            </span>
          </div>

          <span className="text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider">
            Cycle 24h Algorithmique
          </span>
        </div>
      </div>
    </div>
  );
}
