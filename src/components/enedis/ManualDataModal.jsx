import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Zap, Building2, User, MapPin, Activity, Calendar, Check, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PROFILES = [
  {
    key: 'agricole',
    label: 'Agricole / Élevage',
    icon: '🚜',
    desc: 'Activité continue de jour, pompage, séchage & élevage.'
  },
  {
    key: 'tertiaire',
    label: 'Tertiaire / Bureaux',
    icon: '🏢',
    desc: 'Pointes 8h - 18h en semaine, consommation réduite le week-end.'
  },
  {
    key: 'industriel',
    label: 'Industriel / Froid',
    icon: '🏭',
    desc: 'Consommation continue 24/7 avec forts appels de puissance.'
  },
  {
    key: 'residentiel',
    label: 'Résidentiel',
    icon: '🏡',
    desc: 'Pics de soutirage le matin (7h-9h) et en soirée (19h-22h).'
  }
];

export default function ManualDataModal({
  isOpen,
  onClose,
  prm = '',
  initialOwner = '',
  initialAddress = '',
  initialKwh = '',
  initialPeak = '',
  initialProfile = 'agricole',
  onSave
}) {
  const [mounted, setMounted] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [annualKwh, setAnnualKwh] = useState('');
  const [peakKw, setPeakKw] = useState('');
  const [profileKey, setProfileKey] = useState('agricole');
  const [showMonthly, setShowMonthly] = useState(false);
  const [months, setMonths] = useState([
    { label: 'Jan', pct: 1.15, kwh: '' },
    { label: 'Fév', pct: 1.10, kwh: '' },
    { label: 'Mar', pct: 1.05, kwh: '' },
    { label: 'Avr', pct: 0.95, kwh: '' },
    { label: 'Mai', pct: 0.90, kwh: '' },
    { label: 'Juin', pct: 0.85, kwh: '' },
    { label: 'Juil', pct: 0.90, kwh: '' },
    { label: 'Août', pct: 0.92, kwh: '' },
    { label: 'Sept', pct: 0.98, kwh: '' },
    { label: 'Oct', pct: 1.02, kwh: '' },
    { label: 'Nov', pct: 1.08, kwh: '' },
    { label: 'Déc', pct: 1.15, kwh: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOwnerName(initialOwner || '');
      setOwnerAddress(initialAddress || '');
      const cleanKwh = (initialKwh && Number(initialKwh) !== 5850) ? String(initialKwh) : '';
      setAnnualKwh(cleanKwh);
      setPeakKw(initialPeak ? String(initialPeak) : '');
      setProfileKey(initialProfile || 'agricole');
    }
  }, [isOpen, initialOwner, initialAddress, initialKwh, initialPeak, initialProfile]);

  // Recalcul de la répartition mensuelle théorique si la conso annuelle change
  useEffect(() => {
    const tot = Number(annualKwh);
    if (tot > 0) {
      const sumPcts = months.reduce((s, m) => s + m.pct, 0);
      setMonths(prev =>
        prev.map(m => ({
          ...m,
          kwh: String(Math.round(tot * (m.pct / sumPcts)))
        }))
      );
      if (!peakKw) {
        // Estimation automatique de la pointe si non renseignée (ex: 36 à 90 kW selon le volume)
        const estPeak = Math.max(6, Math.min(250, Number((tot / 2400).toFixed(1))));
        setPeakKw(String(estPeak));
      }
    }
  }, [annualKwh]);

  if (!isOpen || !mounted) return null;

  const numKwh = Number(annualKwh) || 0;
  const avgDaily = numKwh > 0 ? (numKwh / 365).toFixed(1) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numKwh || numKwh <= 0) {
      alert('Veuillez saisir une consommation annuelle en kWh positive.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave({
        prm,
        ownerName: ownerName.trim(),
        ownerAddress: ownerAddress.trim(),
        annualConsumption: numKwh,
        peakKw: Number(peakKw) || Number((numKwh / 2400).toFixed(1)),
        profileKey
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/30">
              <Sparkles className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Saisie Manuelle &amp; Calibrage PRM</h2>
                <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-300/30">
                  {prm}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Délai de synchronisation Enedis SGE (24h) : Calibrez les données pour débloquer l'étude
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-slate-800">
          {/* Titulaire et Adresse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-blue-600" />
                Titulaire / Client
              </label>
              <Input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="Ex: Eric GILBERT, Jean DUPONT..."
                className="h-9 text-xs rounded-xl border-slate-200 font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} className="text-blue-600" />
                Adresse d'implantation
              </label>
              <Input
                type="text"
                value={ownerAddress}
                onChange={e => setOwnerAddress(e.target.value)}
                placeholder="Ex: Route de Lespinasse, 24800..."
                className="h-9 text-xs rounded-xl border-slate-200 font-medium"
              />
            </div>
          </div>

          {/* Consommation Annuelle & Puissance de Pointe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap size={14} className="text-blue-600" />
                  Conso Annuelle (kWh/an) *
                </span>
                {numKwh > 0 && (
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-100 px-1.5 py-0.2 rounded">
                    ~{avgDaily} kWh/j
                  </span>
                )}
              </label>
              <Input
                type="number"
                required
                min="100"
                max="10000000"
                value={annualKwh}
                onChange={e => setAnnualKwh(e.target.value)}
                placeholder="Ex: 210000, 45000, 12500..."
                className="h-10 text-sm rounded-xl border-blue-200 font-mono font-bold text-blue-900 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-orange-600" />
                Pointe max / Souscrite (kW)
              </label>
              <Input
                type="number"
                step="0.1"
                min="3"
                max="1000"
                value={peakKw}
                onChange={e => setPeakKw(e.target.value)}
                placeholder="Ex: 90.0, 36.0, 18.0..."
                className="h-10 text-sm rounded-xl border-blue-200 font-mono font-bold text-orange-900 bg-white"
              />
            </div>
          </div>

          {/* Profil de Consommation */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-blue-600" />
              Profil de Consommation du site
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROFILES.map(p => {
                const active = profileKey === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setProfileKey(p.key)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      active
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{p.icon}</span>
                        {p.label}
                      </span>
                      {active && <Check size={14} className="text-blue-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optionnel : Répartition Mensuelle */}
          <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setShowMonthly(s => !s)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-500" />
                Répartition mensuelle détaillée (12 mois)
              </span>
              <span className="text-[10px] text-blue-600 font-semibold">
                {showMonthly ? 'Masquer' : 'Afficher / Ajuster'}
              </span>
            </button>

            {showMonthly && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-3">
                {months.map((m, idx) => (
                  <div key={m.label} className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">{m.label}</span>
                    <input
                      type="number"
                      value={m.kwh}
                      onChange={e => {
                        const val = e.target.value;
                        setMonths(prev => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], kwh: val };
                          return copy;
                        });
                      }}
                      className="w-full text-center text-xs font-mono font-bold text-slate-800 outline-none mt-1"
                    />
                    <span className="text-[9px] text-slate-400 block">kWh</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pied du formulaire */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !numKwh}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>{isSubmitting ? 'Calcul en cours...' : 'Valider & Générer les courbes'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
