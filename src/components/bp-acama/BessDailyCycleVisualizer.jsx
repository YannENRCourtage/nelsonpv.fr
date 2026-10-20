import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Zap, Activity, Clock, ShieldCheck, Sun, Moon, Sunrise, Sunset, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * Dictionnaire complet des 24 heures de la journée type d'une batterie BESS.
 * Aligné sur le modèle pédagogique Solaime Énergies et le modèle économique ENR COURTAGE.
 */
export const BESS_24H_CYCLE = [
  {
    hour: 0,
    time: '00:00',
    label: '00h',
    ambience: { label: 'NUIT', type: 'nuit', icon: 'moon' },
    soc: 40,
    state: 'idle',
    stateLabel: 'VEILLE ACTIVE • 50 HZ',
    flow: 'idle',
    priceColor: '#4ade80', // Vert creux
    priceLabel: 'Prix bas',
    actionColor: '#38bdf8', // Bleu
    actionLabel: 'Stabilise la fréquence (50 Hz)',
    activeMissions: ['fcr'],
    narrative: 'La nuit est calme. La batterie veille sur le réseau : elle corrige en continu les petits écarts de fréquence pour que le courant reste exactement à 50 Hz.'
  },
  {
    hour: 1,
    time: '01:00',
    label: '01h',
    ambience: { label: 'NUIT', type: 'nuit', icon: 'moon' },
    soc: 40,
    state: 'idle',
    stateLabel: 'VEILLE ACTIVE • 50 HZ',
    flow: 'idle',
    priceColor: '#4ade80',
    priceLabel: 'Prix bas',
    actionColor: '#38bdf8',
    actionLabel: 'Stabilise la fréquence (50 Hz)',
    activeMissions: ['fcr'],
    narrative: 'La nuit est calme. La batterie veille sur le réseau : elle corrige en continu les petits écarts de fréquence pour que le courant reste exactement à 50 Hz.'
  },
  {
    hour: 2,
    time: '02:00',
    label: '02h',
    ambience: { label: 'NUIT', type: 'nuit', icon: 'moon' },
    soc: 55,
    state: 'charge',
    stateLabel: 'SE CHARGE (SOUTIRAGE)',
    flow: 'charge',
    priceColor: '#4ade80',
    priceLabel: 'Creux nocturne / éolien',
    actionColor: '#f59e0b', // Ambre
    actionLabel: "Se charge quand c'est bon marché",
    activeMissions: ['day_ahead'],
    narrative: "L'électricité est abondante et bon marché (creux nocturne / éolien). La batterie fait le plein — un achat programmé la veille sur le marché Day-Ahead."
  },
  {
    hour: 3,
    time: '03:00',
    label: '03h',
    ambience: { label: 'NUIT', type: 'nuit', icon: 'moon' },
    soc: 70,
    state: 'charge',
    stateLabel: 'SE CHARGE (SOUTIRAGE)',
    flow: 'charge',
    priceColor: '#4ade80',
    priceLabel: 'Creux nocturne',
    actionColor: '#f59e0b',
    actionLabel: "Se charge quand c'est bon marché",
    activeMissions: ['day_ahead'],
    narrative: "L'électricité est abondante et bon marché (creux nocturne / éolien). La batterie fait le plein — un achat programmé la veille sur le marché Day-Ahead."
  },
  {
    hour: 4,
    time: '04:00',
    label: '04h',
    ambience: { label: 'NUIT', type: 'nuit', icon: 'moon' },
    soc: 85,
    state: 'charge',
    stateLabel: 'SE CHARGE (SOUTIRAGE)',
    flow: 'charge',
    priceColor: '#4ade80',
    priceLabel: 'Creux nocturne',
    actionColor: '#f59e0b',
    actionLabel: "Se charge quand c'est bon marché",
    activeMissions: ['day_ahead'],
    narrative: "L'électricité est abondante et bon marché (creux nocturne / éolien). La batterie fait le plein — un achat programmé la veille sur le marché Day-Ahead."
  },
  {
    hour: 5,
    time: '05:00',
    label: '05h',
    ambience: { label: 'NUIT', type: 'nuit', icon: 'moon' },
    soc: 85,
    state: 'idle',
    stateLabel: 'VEILLE ACTIVE • 50 HZ',
    flow: 'idle',
    priceColor: '#4ade80',
    priceLabel: 'Prix modéré',
    actionColor: '#38bdf8',
    actionLabel: 'Stabilise la fréquence (50 Hz)',
    activeMissions: ['fcr'],
    narrative: 'Fin de charge nocturne. La batterie stabilise la fréquence à 50 Hz avant le réveil du réseau.'
  },
  {
    hour: 6,
    time: '06:00',
    label: '06h',
    ambience: { label: 'AUBE', type: 'aube', icon: 'sunrise' },
    soc: 70,
    state: 'discharge',
    stateLabel: 'INJECTE DANS LE RÉSEAU',
    flow: 'discharge',
    priceColor: '#f59e0b', // Orange début de pointe
    priceLabel: 'Pointe matin montante',
    actionColor: '#f43f5e', // Corail
    actionLabel: "Restitue quand c'est cher",
    activeMissions: ['day_ahead'],
    narrative: 'La France se réveille, la demande grimpe (Pointe Matin) : la batterie restitue son énergie au réseau au prix fort sur le marché Day-Ahead.'
  },
  {
    hour: 7,
    time: '07:00',
    label: '07h',
    ambience: { label: 'AUBE', type: 'aube', icon: 'sunrise' },
    soc: 50,
    state: 'discharge',
    stateLabel: 'INJECTE DANS LE RÉSEAU',
    flow: 'discharge',
    priceColor: '#d97706', // Orange foncé
    priceLabel: 'Pointe Matin (Pic)',
    actionColor: '#f43f5e',
    actionLabel: "Restitue quand c'est cher",
    activeMissions: ['day_ahead'],
    narrative: 'La France se réveille, la demande grimpe (Pointe Matin) : la batterie restitue son énergie au réseau au prix fort sur le marché Day-Ahead.'
  },
  {
    hour: 8,
    time: '08:00',
    label: '08h',
    ambience: { label: 'AUBE', type: 'aube', icon: 'sunrise' },
    soc: 35,
    state: 'discharge',
    stateLabel: 'INJECTE DANS LE RÉSEAU',
    flow: 'discharge',
    priceColor: '#d97706',
    priceLabel: 'Pointe Matin',
    actionColor: '#f43f5e',
    actionLabel: "Restitue quand c'est cher",
    activeMissions: ['day_ahead'],
    narrative: 'La France se réveille, la demande grimpe (Pointe Matin) : la batterie restitue son énergie au réseau au prix fort sur le marché Day-Ahead.'
  },
  {
    hour: 9,
    time: '09:00',
    label: '09h',
    ambience: { label: 'PLEIN JOUR', type: 'jour', icon: 'sun' },
    soc: 35,
    state: 'idle',
    stateLabel: 'VEILLE ACTIVE • 50 HZ',
    flow: 'idle',
    priceColor: '#86efac', // Vert clair
    priceLabel: 'Détente post-pointe',
    actionColor: '#38bdf8',
    actionLabel: 'Stabilise la fréquence (50 Hz)',
    activeMissions: ['fcr'],
    narrative: "La pointe du matin s'estompe. La batterie se repositionne en réserve de fréquence 50 Hz."
  },
  {
    hour: 10,
    time: '10:00',
    label: '10h',
    ambience: { label: 'PLEIN JOUR', type: 'jour', icon: 'sun' },
    soc: 55,
    state: 'charge',
    stateLabel: 'SE CHARGE (SOUTIRAGE)',
    flow: 'charge',
    priceColor: '#4ade80',
    priceLabel: 'Montée solaire',
    actionColor: '#f59e0b',
    actionLabel: "Se charge quand c'est bon marché",
    activeMissions: ['day_ahead'],
    narrative: 'Le soleil monte, la production solaire s’accélère. Les prix baissent : la batterie commence sa 2e recharge au meilleur coût.'
  },
  {
    hour: 11,
    time: '11:00',
    label: '11h',
    ambience: { label: 'PLEIN JOUR', type: 'jour', icon: 'sun' },
    soc: 76,
    state: 'charge',
    stateLabel: 'SE CHARGE (SOUTIRAGE)',
    flow: 'charge',
    priceColor: '#22c55e', // Vert franc
    priceLabel: 'Forte injection solaire',
    actionColor: '#f59e0b',
    actionLabel: "Se charge quand c'est bon marché",
    activeMissions: ['day_ahead'],
    narrative: 'Le soleil monte, la production solaire s’accélère. Les prix baissent : la batterie commence sa 2e recharge au meilleur coût.'
  },
  {
    hour: 12,
    time: '12:00',
    label: '12h',
    ambience: { label: 'PLEIN JOUR', type: 'jour', icon: 'sun' },
    soc: 92,
    state: 'charge',
    stateLabel: 'SE CHARGE (SOUTIRAGE)',
    flow: 'charge',
    priceColor: '#16a34a', // Vert émeraude
    priceLabel: 'Creux solaire méridien',
    actionColor: '#f59e0b',
    actionLabel: "Se charge quand c'est bon marché",
    activeMissions: ['day_ahead'],
    narrative: 'Le soleil monte, la production solaire s’accélère. Les prix baissent : la batterie commence sa 2e recharge au meilleur coût.'
  },
  {
    hour: 13,
    time: '13:00',
    label: '13h',
    ambience: { label: 'PLEIN JOUR', type: 'jour', icon: 'sun' },
    soc: 100,
    state: 'charge',
    stateLabel: 'SE CHARGE (SOUTIRAGE)',
    flow: 'charge',
    priceColor: '#15803d', // Vert très foncé (prix négatifs)
    priceLabel: 'Prix négatifs / surplus PV',
    actionColor: '#f59e0b',
    actionLabel: "Se charge quand c'est bon marché",
    activeMissions: ['intraday'],
    narrative: "Pic de production solaire. L'électricité est au prix le plus bas de la journée (parfois négatif). La batterie absorbe le surplus sur l'Intraday."
  },
  {
    hour: 14,
    time: '14:00',
    label: '14h',
    ambience: { label: 'PLEIN JOUR', type: 'jour', icon: 'sun' },
    soc: 100,
    state: 'ready',
    stateLabel: 'PRÊTE POUR LA POINTE',
    flow: 'ready',
    priceColor: '#16a34a',
    priceLabel: 'Prix bas',
    actionColor: '#10b981', // Émeraude
    actionLabel: 'Se tient prête pour la pointe',
    activeMissions: ['capacity'],
    narrative: 'Batterie pleine (100%). Elle bascule en veille active et se tient à disposition du gestionnaire de réseau (Mécanisme de Capacité).'
  },
  {
    hour: 15,
    time: '15:00',
    label: '15h',
    ambience: { label: 'PLEIN JOUR', type: 'jour', icon: 'sun' },
    soc: 90,
    state: 'charge',
    stateLabel: 'SE CHARGE (SOUTIRAGE)',
    flow: 'charge',
    priceColor: '#4ade80',
    priceLabel: 'Ajustement intraday',
    actionColor: '#f59e0b',
    actionLabel: "Se charge quand c'est bon marché",
    activeMissions: ['intraday'],
    narrative: 'Le soleil décline doucement. La batterie ajuste son niveau et se prépare pour le grand pic de consommation du soir.'
  },
  {
    hour: 16,
    time: '16:00',
    label: '16h',
    ambience: { label: 'PLEIN JOUR', type: 'jour', icon: 'sun' },
    soc: 90,
    state: 'idle',
    stateLabel: 'VEILLE ACTIVE • 50 HZ',
    flow: 'idle',
    priceColor: '#ca8a04', // Jaune ambre
    priceLabel: 'Demande en hausse',
    actionColor: '#38bdf8',
    actionLabel: 'Stabilise la fréquence (50 Hz)',
    activeMissions: ['fcr'],
    narrative: 'Le soleil décline doucement. La batterie ajuste son niveau et se prépare pour le grand pic de consommation du soir.'
  },
  {
    hour: 17,
    time: '17:00',
    label: '17h',
    ambience: { label: 'PLEIN JOUR', type: 'jour', icon: 'sun' },
    soc: 94,
    state: 'ready',
    stateLabel: 'PRÊTE POUR LA POINTE',
    flow: 'ready',
    priceColor: '#ca8a04',
    priceLabel: 'Pré-pointe du soir',
    actionColor: '#10b981',
    actionLabel: 'Se tient prête pour la pointe',
    activeMissions: ['capacity'],
    narrative: 'Le soleil décline doucement. La batterie ajuste son niveau et se prépare pour le grand pic de consommation du soir.'
  },
  {
    hour: 18,
    time: '18:00',
    label: '18h',
    ambience: { label: 'SOIR', type: 'soir', icon: 'sunset' },
    soc: 88,
    state: 'discharge',
    stateLabel: 'INJECTE DANS LE RÉSEAU',
    flow: 'discharge',
    priceColor: '#ef4444', // Rouge
    priceLabel: 'Pointe Soir débutante',
    actionColor: '#f43f5e', // Corail
    actionLabel: "Restitue quand c'est cher",
    activeMissions: ['day_ahead'],
    narrative: 'Pointe du Soir : tout le pays consomme. Les prix flambent. La batterie injecte toute sa puissance pour sécuriser le réseau au tarif maximum.'
  },
  {
    hour: 19,
    time: '19:00',
    label: '19h',
    ambience: { label: 'SOIR', type: 'soir', icon: 'sunset' },
    soc: 66,
    state: 'discharge',
    stateLabel: 'INJECTE DANS LE RÉSEAU',
    flow: 'discharge',
    priceColor: '#dc2626', // Rouge vif
    priceLabel: 'Pic maximal journée',
    actionColor: '#f43f5e',
    actionLabel: "Restitue quand c'est cher",
    activeMissions: ['day_ahead'],
    narrative: 'Pointe du Soir : tout le pays consomme. Les prix flambent. La batterie injecte toute sa puissance pour sécuriser le réseau au tarif maximum.'
  },
  {
    hour: 20,
    time: '20:00',
    label: '20h',
    ambience: { label: 'SOIR', type: 'soir', icon: 'sunset' },
    soc: 45,
    state: 'discharge',
    stateLabel: 'INJECTE DANS LE RÉSEAU',
    flow: 'discharge',
    priceColor: '#ef4444',
    priceLabel: 'Pointe Soir',
    actionColor: '#f43f5e',
    actionLabel: "Restitue quand c'est cher",
    activeMissions: ['day_ahead'],
    narrative: 'Pointe du Soir : tout le pays consomme. Les prix flambent. La batterie injecte toute sa puissance pour sécuriser le réseau au tarif maximum.'
  },
  {
    hour: 21,
    time: '21:00',
    label: '21h',
    ambience: { label: 'SOIR', type: 'soir', icon: 'sunset' },
    soc: 25,
    state: 'discharge',
    stateLabel: 'INJECTE DANS LE RÉSEAU',
    flow: 'discharge',
    priceColor: '#ea580c', // Orange rouge
    priceLabel: 'Fin de pointe',
    actionColor: '#f43f5e',
    actionLabel: "Restitue quand c'est cher",
    activeMissions: ['day_ahead'],
    narrative: 'Pointe du Soir : tout le pays consomme. Les prix flambent. La batterie injecte toute sa puissance pour sécuriser le réseau au tarif maximum.'
  },
  {
    hour: 22,
    time: '22:00',
    label: '22h',
    ambience: { label: 'NUIT', type: 'nuit', icon: 'moon' },
    soc: 25,
    state: 'idle',
    stateLabel: 'VEILLE ACTIVE • 50 HZ',
    flow: 'idle',
    priceColor: '#84cc16', // Vert lime
    priceLabel: 'Retour au calme',
    actionColor: '#38bdf8',
    actionLabel: 'Stabilise la fréquence (50 Hz)',
    activeMissions: ['fcr'],
    narrative: 'Le calme revient. La batterie se repositionne en réserve primaire 50 Hz pour la nuit. Le cycle complet est bouclé.'
  },
  {
    hour: 23,
    time: '23:00',
    label: '23h',
    ambience: { label: 'NUIT', type: 'nuit', icon: 'moon' },
    soc: 30,
    state: 'idle',
    stateLabel: 'VEILLE ACTIVE • 50 HZ',
    flow: 'idle',
    priceColor: '#84cc16',
    priceLabel: 'Nuit calme',
    actionColor: '#38bdf8',
    actionLabel: 'Stabilise la fréquence (50 Hz)',
    activeMissions: ['fcr'],
    narrative: 'Le calme revient. La batterie se repositionne en réserve primaire 50 Hz pour la nuit. Le cycle complet est bouclé.'
  }
];

const MISSIONS_CONFIG = [
  {
    id: 'fcr',
    title: 'Régulation de fréquence',
    subtitle: 'FCR 50 Hz / aFRR PICASSO',
    desc: 'Stabilisation milliseconde du réseau',
    colorKey: 'blue',
    activeBorder: 'border-blue-500 bg-blue-50/90 text-blue-950 shadow-sm ring-1 ring-blue-300',
    badgeClass: 'bg-blue-600 text-white'
  },
  {
    id: 'capacity',
    title: 'Mécanisme de capacité',
    subtitle: 'Garantie de puissance RTE',
    desc: 'Disponibilité lors des pointes de tension',
    colorKey: 'emerald',
    activeBorder: 'border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-sm ring-1 ring-emerald-300',
    badgeClass: 'bg-emerald-600 text-white'
  },
  {
    id: 'day_ahead',
    title: 'Marché Day-Ahead',
    subtitle: 'Arbitrage sur prix spot EPEX',
    desc: 'Achat creux nocturne & vente aux pointes',
    colorKey: 'amber',
    activeBorder: 'border-amber-500 bg-amber-50/90 text-amber-950 shadow-sm ring-1 ring-amber-300',
    badgeClass: 'bg-amber-600 text-white'
  },
  {
    id: 'intraday',
    title: 'Marché Intraday',
    subtitle: 'Ajustement temps réel & prix négatifs',
    desc: 'Recharge sur excédents solaires à bas coût',
    colorKey: 'yellow',
    activeBorder: 'border-yellow-500 bg-yellow-50/90 text-yellow-950 shadow-sm ring-1 ring-yellow-300',
    badgeClass: 'bg-yellow-600 text-white'
  }
];

const KEY_MOMENTS = [
  { hour: 2, label: '02h • Nuit (Creux éolien)', time: '02:00', type: 'charge' },
  { hour: 7, label: '07h • Pointe Matin (Pic)', time: '07:00', type: 'discharge' },
  { hour: 13, label: '13h • Creux Solaire (Prix négatifs)', time: '13:00', type: 'charge' },
  { hour: 19, label: '19h • Pointe Soir (Pic max)', time: '19:00', type: 'discharge' }
];

export default function BessDailyCycleVisualizer({ defaultHour = 13, compact = false, isPdf = false }) {
  const [selectedHour, setSelectedHour] = useState(defaultHour);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  const current = BESS_24H_CYCLE[selectedHour] || BESS_24H_CYCLE[13];

  // Auto-play 1.5s
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

  const renderAmbienceBadge = () => {
    const { label, type } = current.ambience;
    let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300';
    let icon = <Sun className="w-3.5 h-3.5 text-amber-500" />;

    if (type === 'nuit') {
      badgeStyle = 'bg-indigo-50 text-indigo-900 border-indigo-200';
      icon = <Moon className="w-3.5 h-3.5 text-indigo-600" />;
    } else if (type === 'aube') {
      badgeStyle = 'bg-amber-50 text-amber-900 border-amber-200';
      icon = <Sunrise className="w-3.5 h-3.5 text-amber-600" />;
    } else if (type === 'jour') {
      badgeStyle = 'bg-sky-50 text-sky-900 border-sky-200';
      icon = <Sun className="w-3.5 h-3.5 text-amber-500" />;
    } else if (type === 'soir') {
      badgeStyle = 'bg-rose-50 text-rose-900 border-rose-200';
      icon = <Sunset className="w-3.5 h-3.5 text-rose-600" />;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${badgeStyle}`}>
        {icon}
        {label}
      </span>
    );
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 text-slate-900 select-none shadow-xs">
      <style>{`
        @keyframes bessPulseRight {
          0% { transform: translateX(0px); opacity: 0.2; }
          50% { opacity: 1; transform: translateX(20px); }
          100% { transform: translateX(40px); opacity: 0.1; }
        }
        @keyframes bessPulseLeft {
          0% { transform: translateX(0px); opacity: 0.2; }
          50% { opacity: 1; transform: translateX(-20px); }
          100% { transform: translateX(-40px); opacity: 0.1; }
        }
        @keyframes bessPulseBi {
          0%, 100% { transform: scale(0.9); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        .anim-flow-right {
          animation: bessPulseRight 1.2s infinite ease-in-out;
        }
        .anim-flow-left {
          animation: bessPulseLeft 1.2s infinite ease-in-out;
        }
        .anim-flow-bi {
          animation: bessPulseBi 1.5s infinite ease-in-out;
        }
      `}</style>

      {/* EN-TÊTE : Titre pédagogique + Contrôles (Play / Slider / Raccourcis / Badge) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-[#0b192c]">
                24 HEURES DANS LA VIE D'UNE BATTERIE
              </h3>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                Double Cycle Quotidien
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Une journée type d'arbitrage et de régulation Enedis/RTE, expliquée simplement
            </p>
          </div>
        </div>

        {/* Barre de contrôle interactive */}
        <div className="flex items-center gap-2">
          {/* Boutons d'accès rapide aux 4 moments clés */}
          <div className="hidden xl:flex items-center gap-1 text-[9px] font-bold">
            {KEY_MOMENTS.map((km) => (
              <button
                key={km.hour}
                type="button"
                onClick={() => setSelectedHour(km.hour)}
                className={`px-2 py-1 rounded-md border transition-all ${
                  selectedHour === km.hour
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-extrabold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title={`Aller à ${km.time}`}
              >
                {km.time}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={togglePlay}
            data-html2canvas-ignore="true"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all shadow-2xs ${
              isPlaying
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={isPlaying ? 'Mettre en pause' : 'Lancer le cycle automatique'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : '▶ Suivre la journée'}</span>
          </button>

          {/* Slider horaire */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="range"
              min="0"
              max="23"
              step="1"
              value={selectedHour}
              onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
              className="w-20 sm:w-28 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              title="Sélectionner l'heure"
            />
            <span className="text-xs font-black text-[#0b192c] font-mono min-w-[34px] text-right">
              {current.time}
            </span>
          </div>

          {/* Badge d'ambiance */}
          {renderAmbienceBadge()}
        </div>
      </div>

      {/* SYNOPTIQUE DES FLUX + NARRATIF (Réseau HTA <---> BESS) */}
      <div className="grid grid-cols-12 gap-3 my-2.5 items-stretch">
        {/* Synoptique des flux (7 colonnes) */}
        <div className="col-span-12 lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
          {/* Gauche : Pylône Enedis HTA 20 kV */}
          <div className="flex flex-col items-center text-center shrink-0 w-24">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs mb-1">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-700 stroke-current" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
            <span className="text-[10px] font-black uppercase text-slate-900 leading-tight">Réseau Enedis</span>
            <span className="text-[9px] font-semibold text-slate-500">HTA 20 kV</span>
          </div>

          {/* Centre : Directionnel animé & Label d'état */}
          <div className="flex-1 px-3 flex flex-col items-center justify-center text-center">
            {/* Label d'état dynamique */}
            <div className="mb-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide border shadow-2xs ${
                  current.state === 'charge'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : current.state === 'discharge'
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : current.state === 'ready'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-blue-100 text-blue-900 border-blue-300'
                }`}
              >
                {current.state === 'charge' && <ArrowRight className="w-3.5 h-3.5 text-amber-700" />}
                {current.state === 'discharge' && <ArrowLeft className="w-3.5 h-3.5 text-rose-700" />}
                {current.state === 'ready' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />}
                {current.state === 'idle' && <Activity className="w-3.5 h-3.5 text-blue-700" />}
                <span>{current.stateLabel}</span>
              </span>
            </div>

            {/* Flux de points lumineux animés */}
            <div className="relative w-full max-w-[200px] h-5 flex items-center justify-center">
              {/* Ligne conductrice */}
              <div className="absolute inset-x-0 h-1 bg-slate-300 rounded-full"></div>

              {current.state === 'charge' && (
                <div className="relative flex items-center justify-center gap-4 anim-flow-right">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                </div>
              )}

              {current.state === 'discharge' && (
                <div className="relative flex items-center justify-center gap-4 anim-flow-left">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                </div>
              )}

              {current.state === 'idle' && (
                <div className="relative flex items-center justify-center gap-4 anim-flow-bi">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>
                </div>
              )}

              {current.state === 'ready' && (
                <div className="relative flex items-center justify-center gap-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-ping"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 font-semibold mt-1">
              {current.state === 'charge' && 'Électricité soutirée du réseau'}
              {current.state === 'discharge' && 'Énergie restituée au réseau'}
              {current.state === 'idle' && 'Réserve de puissance à disposition RTE'}
              {current.state === 'ready' && 'Capacité 100% mobilisable pour le pic'}
            </div>
          </div>

          {/* Droite : Batterie BESS avec jauge dynamique de SoC */}
          <div className="flex flex-col items-center text-center shrink-0 w-28">
            <div className="relative w-12 h-14 bg-white border-2 border-slate-700 rounded-md p-1 flex flex-col justify-end shadow-2xs mb-1">
              {/* Borne supérieure batterie */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-slate-700 rounded-t-xs"></div>

              {/* Jauge de remplissage dynamique */}
              <div
                className="w-full rounded-xs transition-all duration-500 ease-out flex items-center justify-center"
                style={{
                  height: `${Math.max(12, current.soc)}%`,
                  backgroundColor:
                    current.soc >= 80 ? '#10b981' : current.soc >= 40 ? '#38bdf8' : '#f59e0b'
                }}
              >
                <Zap className="w-3 h-3 text-white fill-current opacity-90" />
              </div>

              {/* Pourcentage SoC centré */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[11px] font-black text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                  {current.soc}%
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-900 leading-tight">Batterie BESS</span>
            <span className="text-[9px] font-semibold text-slate-500">SoC {current.soc}%</span>
          </div>
        </div>

        {/* Narratif horodaté (5 colonnes) */}
        <div className="col-span-12 lg:col-span-5 bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-900 uppercase tracking-wide">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Créneau : {current.time}
              </span>
              <span className="text-[9px] font-extrabold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-md">
                Cycle {selectedHour < 12 ? '1 (Matin)' : '2 (Soir)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-800 font-medium leading-relaxed">
              "{current.narrative}"
            </p>
          </div>

          <div className="pt-1.5 border-t border-blue-200/70 mt-1.5 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-semibold">
              Marché spot : <strong className="text-slate-900">{current.priceLabel}</strong>
            </span>
            <span className="text-slate-500 font-semibold">
              Action : <strong className="text-slate-900">{current.actionLabel}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* LES 4 CARTES DE MISSION (VALUE STACKING DYNAMIQUE) */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
            Activation des 4 Piliers de Monétisation (Value Stacking)
          </span>
          <span className="text-[9px] font-semibold text-slate-400">
            Missions actives mises en surbrillance à {current.time}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {MISSIONS_CONFIG.map((m) => {
            const isActive = current.activeMissions.includes(m.id);
            return (
              <div
                key={m.id}
                className={`rounded-lg p-2 border transition-all duration-200 ${
                  isActive
                    ? m.activeBorder
                    : 'border-slate-200 bg-white/70 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider">
                    {m.id === 'fcr' && '58.7 % CA'}
                    {m.id === 'day_ahead' && '31.8 % CA'}
                    {m.id === 'intraday' && 'Inclus Arbitrage'}
                    {m.id === 'capacity' && '9.5 % CA'}
                  </span>
                  <span
                    className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive ? m.badgeClass : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isActive ? '● En mission' : 'En veille'}
                  </span>
                </div>
                <h4 className="text-[11px] font-black leading-tight text-[#0b192c]">
                  {m.title}
                </h4>
                <p className="text-[9px] font-medium text-slate-600 mt-0.5 leading-snug line-clamp-1">
                  {m.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* DOUBLE FRISE CHRONOLOGIQUE 24 HEURES */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 sm:p-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-600">
            Profil Chronologique 24h (Cliquez sur une heure pour naviguer)
          </span>
          <span className="text-[9px] font-bold text-blue-700">
            Heure active : {current.time}
          </span>
        </div>

        {/* Ligne 1 : Prix du marché */}
        <div className="mb-1.5">
          <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 mb-0.5 px-0.5">
            <span>PRIX MARCHÉ SPOT</span>
            <span className="text-[8px] font-normal text-slate-400">Vert = Prix bas • Rouge = Pointes chères</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
              gap: '2px'
            }}
          >
            {BESS_24H_CYCLE.map((h) => {
              const isSelected = h.hour === selectedHour;
              return (
                <button
                  key={`price-${h.hour}`}
                  type="button"
                  onClick={() => setSelectedHour(h.hour)}
                  className={`h-5 rounded-xs flex items-center justify-center text-[8px] font-black transition-all ${
                    isSelected
                      ? 'ring-2 ring-slate-900 scale-110 z-10 shadow-md font-black'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: h.priceColor,
                    color: ['#15803d', '#16a34a', '#dc2626', '#ef4444'].includes(h.priceColor) ? '#ffffff' : '#0f172a'
                  }}
                  title={`${h.time} : ${h.priceLabel}`}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ligne 2 : Ce que fait la batterie */}
        <div>
          <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 mb-0.5 px-0.5">
            <span>ACTION BATTERIE</span>
            <span className="text-[8px] font-normal text-slate-400">Bleu = 50Hz • Ambre = Charge • Corail = Restitue • Vert = Prête</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
              gap: '2px'
            }}
          >
            {BESS_24H_CYCLE.map((h) => {
              const isSelected = h.hour === selectedHour;
              return (
                <button
                  key={`action-${h.hour}`}
                  type="button"
                  onClick={() => setSelectedHour(h.hour)}
                  className={`h-5.5 rounded-xs flex items-center justify-center text-[9px] font-black transition-all ${
                    isSelected
                      ? 'ring-2 ring-slate-900 scale-110 z-10 shadow-md text-white'
                      : 'hover:opacity-80 text-white'
                  }`}
                  style={{ backgroundColor: h.actionColor }}
                  title={`${h.time} : ${h.actionLabel}`}
                >
                  {isSelected ? '●' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Légende en bas */}
        <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[9px] font-semibold text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
              Stabilise la fréquence (50 Hz)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
              Se charge quand c'est bon marché
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
              Restitue quand c'est cher
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
              Se tient prête pour la pointe
            </span>
          </div>

          <span className="text-slate-400 font-medium">
            2 cycles complets par 24h garantis
          </span>
        </div>
      </div>
    </div>
  );
}
