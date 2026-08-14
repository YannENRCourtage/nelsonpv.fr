import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
  ClipboardList, CheckCircle2, AlertCircle, Euro, Leaf, X, ExternalLink,
  FileDown, Calendar, ChevronRight, Info, ShieldCheck, Building2, Zap
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// ─── Données officielles CRE ─────────────────────────────────────────────────

const CRE_SESSIONS = {
  aos: [
    { period: 'S1 2026', opening: '03/03/2026', closing: '31/03/2026', result: 'Juin 2026', status: 'upcoming' },
    { period: 'S2 2026', opening: '01/09/2026', closing: '30/09/2026', result: 'Déc. 2026', status: 'future' },
    { period: 'S1 2025', opening: '03/03/2025', closing: '31/03/2025', result: 'Juin 2025', status: 'closed' },
  ],
  ao: [
    { period: 'Période 14 (2026)', opening: '01/04/2026', closing: '30/06/2026', result: 'Sept. 2026', status: 'upcoming' },
    { period: 'Période 13 (2025)', opening: '01/04/2025', closing: '30/06/2025', result: 'Sept. 2025', status: 'closed' },
  ],
};

const PORTALS = {
  aos: {
    name: 'Plateforme AOS — CRE',
    url: 'https://apps.cre.fr/aos',
    fallback: 'https://www.cre.fr/Producteurs-et-fournisseurs/Production-d-electricite/Appels-d-offres',
    description: 'Dépôt des candidatures AOS 100–500 kWc',
    color: 'bg-blue-600',
  },
  ao: {
    name: 'Plateforme AO — CRE PPE',
    url: 'https://plateforme.cre.fr',
    fallback: 'https://www.cre.fr/Producteurs-et-fournisseurs/Production-d-electricite/Appels-d-offres',
    description: 'Dépôt des candidatures AO CRE > 500 kWc',
    color: 'bg-violet-600',
  },
};

// Checklist pièces justificatives AOS/AO
const CHECKLIST_ITEMS = [
  { id: 'cerfa_enr', label: 'Formulaire de candidature CRE (cerfa ENR)', required: true },
  { id: 'kbis', label: 'Extrait Kbis ou équivalent (< 3 mois)', required: true },
  { id: 'bilan_carbone', label: "Attestation bilan carbone modules (< 740 kg éqCO₂/kWc)", required: true },
  { id: 'permis', label: "Autorisation d'urbanisme obtenue (PC/DP)", required: true },
  { id: 'raccordement', label: 'Convention de raccordement ENEDIS signée', required: true },
  { id: 'dc1', label: 'DC1 — Lettre de candidature et habilitation', required: false },
  { id: 'dc2', label: 'DC2 — Déclaration du candidat individuel', required: false },
  { id: 'garantie', label: 'Garantie bancaire de dépôt (si exigée)', required: false },
  { id: 'resilienceUE', label: 'Attestation conformité critères UE Résilience (2026)', required: false },
];

export default function AosAoModal({ project, isOpen, onClose }) {
  const powerKwc = Number(project?.kwc || project?.projectSize || 150);
  const isAos = powerKwc >= 100 && powerKwc <= 500;
  const mode = isAos ? 'aos' : 'ao';
  const portal = PORTALS[mode];
  const sessions = CRE_SESSIONS[mode];

  const [proposedPrice, setProposedPrice] = useState(isAos ? 102.50 : 88.00);
  const [carbonFootprint, setCarbonFootprint] = useState(620);
  const [hasEuResilience, setHasEuResilience] = useState(true);
  const [bankGuarantee, setBankGuarantee] = useState(true);
  const [checklist, setChecklist] = useState(() =>
    Object.fromEntries(CHECKLIST_ITEMS.map(i => [i.id, i.required]))
  );
  const [activeTab, setActiveTab] = useState('dossier'); // 'dossier' | 'sessions' | 'checklist'
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const isEligibleCarbon = carbonFootprint < 740;

  const toggleCheck = (id) => setChecklist(prev => ({ ...prev, [id]: !prev[id] }));

  const handleOpenPortal = (url, fallback) => {
    const w = window.open(url, '_blank');
    if (!w) window.open(fallback, '_blank');
  };

  // ── Génération fiche PDF récapitulative ──────────────────────
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;
      const margins = 20;

      // Header
      doc.setFillColor(13, 77, 173);
      doc.rect(0, 0, W, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(isAos ? "Dossier Appel d'Offres Simplifié (AOS)" : "Dossier Appel d'Offres CRE", margins, 16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Projet : ${project?.name || project?.lastName || '—'} — ${powerKwc} kWc`, margins, 25);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} par nelsonpv.fr`, margins, 32);

      let y = 50;
      const section = (title) => {
        doc.setFillColor(232, 240, 254);
        doc.roundedRect(margins, y - 5, W - 2 * margins, 9, 1, 1, 'F');
        doc.setTextColor(13, 77, 173);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(title.toUpperCase(), margins + 3, y + 1);
        y += 12;
        doc.setTextColor(30, 30, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      };

      const row = (label, value, good) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(label + ' :', margins, y);
        doc.setFont('helvetica', 'normal');
        if (good !== undefined) {
          doc.setTextColor(good ? 14 : 200, good ? 158 : 30, good ? 63 : 30);
        }
        doc.text(String(value), margins + 55, y);
        doc.setTextColor(30, 30, 50);
        y += 7;
      };

      // Infos projet
      section('Informations du Projet');
      row('Maître d\'ouvrage', `${project?.firstName || ''} ${project?.lastName || project?.name || ''}`.trim() || '—');
      row('Adresse', `${project?.address || ''}, ${project?.city || ''}`.trim().replace(/^,\s*/, '') || '—');
      row('Puissance installée', `${powerKwc} kWc`);
      row('Dispositif applicable', isAos ? 'AOS — Arrêté du 22/09/2025 (100–500 kWc)' : 'AO CRE PPE (> 500 kWc)');
      y += 3;

      // Paramètres candidature
      section('Paramètres de Candidature');
      row('Tarif de rachat proposé', `${proposedPrice.toFixed(2)} €/MWh`);
      row('Bilan carbone modules', `${carbonFootprint} kg éqCO₂/kWc`, carbonFootprint < 740);
      row('Éligibilité carbone', isEligibleCarbon ? 'ÉLIGIBLE (< 740 kg éqCO₂/kWc)' : 'NON ÉLIGIBLE (≥ 740 kg éqCO₂/kWc)', isEligibleCarbon);
      row('Conformité UE Résilience', hasEuResilience ? 'Oui' : 'Non', hasEuResilience);
      row('Garantie bancaire', bankGuarantee ? 'Fournie' : 'Non fournie', bankGuarantee);
      y += 3;

      // Checklist
      section('Pièces Justificatives');
      CHECKLIST_ITEMS.forEach(item => {
        const done = checklist[item.id];
        doc.setFont('helvetica', done ? 'bold' : 'normal');
        doc.setTextColor(done ? 14 : 180, done ? 158 : 30, done ? 63 : 30);
        doc.setFontSize(8);
        doc.text(`${done ? '☑' : '☐'}  ${item.label}${item.required ? ' *' : ''}`, margins, y);
        doc.setTextColor(30, 30, 50);
        y += 6;
      });
      y += 5;

      // Portail de dépôt
      section('Portail de Dépôt Officiel');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Plateforme CRE :', margins, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(13, 77, 173);
      doc.text(portal.url, margins + 38, y);
      doc.setTextColor(30, 30, 50);
      y += 8;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text(`Fallback : ${portal.fallback}`, margins, y);

      // Footer
      doc.setFillColor(13, 77, 173);
      doc.rect(0, 282, W, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Document généré par nelsonpv.fr — ENR COURTAGE ENERGIE — Usage interne et confidentiel', margins, 291);

      doc.save(`AOS_AO_Fiche_${(project?.name || project?.lastName || 'Projet').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`);
      toast({ title: 'Fiche PDF générée', description: 'La fiche récapitulative a été téléchargée.' });
    } catch (e) {
      console.error('Erreur génération fiche AOS:', e);
      toast({ title: 'Erreur', description: 'Impossible de générer la fiche PDF.', variant: 'destructive' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!isOpen) return null;

  const TABS = [
    { id: 'dossier', label: 'Dossier' },
    { id: 'sessions', label: 'Calendrier CRE' },
    { id: 'checklist', label: 'Pièces' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className={`px-6 pt-5 pb-4 ${isAos ? 'bg-gradient-to-r from-blue-600 to-blue-800' : 'bg-gradient-to-r from-violet-700 to-purple-800'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg leading-tight">
                  {isAos ? "Appel d'Offres Simplifié (AOS)" : "Appel d'Offres CRE (> 500 kWc)"}
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  {project?.name || project?.lastName || '—'} — <span className="font-bold">{powerKwc} kWc</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/20 text-white/60 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Eligibilité rapide */}
          <div className="mt-3 flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isEligibleCarbon ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200'
            }`}>
              <Leaf className="w-3 h-3" />
              Carbone : {carbonFootprint} kg éqCO₂/kWc {isEligibleCarbon ? '✓' : '✗'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
              <Euro className="w-3 h-3" />
              {proposedPrice.toFixed(2)} €/MWh proposé
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/80">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">

            {/* Onglet Dossier */}
            {activeTab === 'dossier' && (
              <motion.div key="dossier" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Info réglementaire */}
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 space-y-1">
                  <p className="font-bold text-sm text-blue-900">
                    {isAos ? '📋 Dispositif AOS — Arrêté du 22 septembre 2025' : '📋 Appel d\'Offres CRE PPE2/PPE3'}
                  </p>
                  <p>
                    {isAos
                      ? 'Les projets entre 100 kWc et 500 kWc sont soumis à l\'AOS depuis le 22/09/2025. Le tarif est fixé par grille compétitive avec critère carbone obligatoire.'
                      : 'Les projets > 500 kWc relèvent de l\'Appel d\'Offres CRE. Les candidatures sont déposées sur la plateforme CRE en sessions pluriannuelles.'}
                  </p>
                </div>

                {/* Paramètres */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Tarif de rachat proposé (€/MWh)</label>
                    <div className="relative">
                      <input
                        type="number" step="0.5" min="60" max="180"
                        value={proposedPrice}
                        onChange={e => setProposedPrice(Number(e.target.value))}
                        className="w-full px-3 py-2.5 pr-14 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">€/MWh</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Référence marché : 95–108 €/MWh</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Bilan Carbone (kg éqCO₂/kWc)</label>
                    <input
                      type="number" min="0" max="2000"
                      value={carbonFootprint}
                      onChange={e => setCarbonFootprint(Number(e.target.value))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 outline-none ${
                        isEligibleCarbon ? 'border-emerald-300 focus:ring-emerald-400' : 'border-red-300 focus:ring-red-400'
                      }`}
                    />
                    <p className={`text-[11px] font-bold mt-1 ${isEligibleCarbon ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isEligibleCarbon ? '✓ Éligible (< 740 kg éqCO₂/kWc)' : '✗ Non éligible — Doit être < 740'}
                    </p>
                  </div>
                </div>

                {/* Critères conformité */}
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">Critères de conformité</p>
                  <div className="space-y-2">
                    {[
                      { key: 'hasEuResilience', label: 'Conformité résilience industrielle européenne (2026)', val: hasEuResilience, set: setHasEuResilience },
                      { key: 'bankGuarantee', label: 'Garantie bancaire validée', val: bankGuarantee, set: setBankGuarantee },
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox" checked={item.val}
                          onChange={e => item.set(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <span className="text-xs text-gray-700 font-medium">{item.label}</span>
                        {item.val ? <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" /> : <AlertCircle className="w-4 h-4 text-amber-400 ml-auto" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Portail de dépôt */}
                <div className={`${isAos ? 'bg-blue-600' : 'bg-violet-700'} rounded-2xl p-4 text-white`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="w-4 h-4" />
                    <p className="font-bold text-sm">{portal.name}</p>
                  </div>
                  <p className="text-white/70 text-xs mb-3">{portal.description}</p>
                  <button
                    onClick={() => handleOpenPortal(portal.url, portal.fallback)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-colors"
                  >
                    Ouvrir la plateforme CRE
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Onglet Sessions */}
            {activeTab === 'sessions' && (
              <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Calendrier officiel des sessions CRE ({isAos ? 'AOS 100–500 kWc' : 'AO > 500 kWc'})
                </p>
                {sessions.map((s, i) => (
                  <div key={i} className={`p-4 rounded-2xl border ${
                    s.status === 'upcoming' ? 'bg-emerald-50 border-emerald-200' :
                    s.status === 'future'   ? 'bg-blue-50 border-blue-100' :
                    'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm text-gray-900">{s.period}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        s.status === 'upcoming' ? 'bg-emerald-200 text-emerald-800' :
                        s.status === 'future'   ? 'bg-blue-200 text-blue-800' :
                        'bg-gray-200 text-gray-500'
                      }`}>
                        {s.status === 'upcoming' ? '🟢 Prochaine session' : s.status === 'future' ? '🔵 À venir' : '⚫ Clôturée'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><p className="text-gray-400">Ouverture</p><p className="font-semibold text-gray-700">{s.opening}</p></div>
                      <div><p className="text-gray-400">Clôture</p><p className="font-semibold text-gray-700">{s.closing}</p></div>
                      <div><p className="text-gray-400">Résultats</p><p className="font-semibold text-gray-700">{s.result}</p></div>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mt-2">
                  <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Dates indicatives — Vérifiez les arrêtés officiels sur <strong>legifrance.gouv.fr</strong> ou sur le site de la CRE.</p>
                </div>
              </motion.div>
            )}

            {/* Onglet Checklist */}
            {activeTab === 'checklist' && (
              <motion.div key="checklist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">Cochez les pièces disponibles dans votre dossier :</p>
                {CHECKLIST_ITEMS.map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox" checked={!!checklist[item.id]}
                      onChange={() => toggleCheck(item.id)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <div className="flex-1">
                      <span className="text-xs text-gray-700 font-medium">{item.label}</span>
                      {item.required && <span className="ml-1 text-[10px] text-red-400 font-bold">*obligatoire</span>}
                    </div>
                    {checklist[item.id] ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />}
                  </label>
                ))}
                <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {Object.values(checklist).filter(Boolean).length}/{CHECKLIST_ITEMS.length} pièces validées
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/80">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors">
            Fermer
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors disabled:opacity-60"
            >
              <FileDown className="w-4 h-4" />
              Fiche PDF
            </button>
            <button
              onClick={() => handleOpenPortal(portal.url, portal.fallback)}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl transition-all ${isAos ? 'bg-blue-600 hover:bg-blue-700' : 'bg-violet-700 hover:bg-violet-800'}`}
            >
              Déposer sur la CRE
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
