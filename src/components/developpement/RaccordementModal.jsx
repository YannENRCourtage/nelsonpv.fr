import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
  Plug, Zap, FileText, Copy, ExternalLink, Download, X, CheckSquare,
  Square, Info, ChevronRight, Loader2, Building2, Globe, ShieldCheck,
  AlertCircle, CheckCircle2, Phone, Mail, FileDown
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// ─── Portails officiels ──────────────────────────────────────────────────────

const PORTALS = {
  enedis: {
    connect:     { name: 'Enedis Connect', url: 'https://connect.enedis.fr', color: '#007DC5' },
    raccordement:{ name: 'Raccordement Direct Enedis', url: 'https://www.raccordement-elec.enedis.fr', color: '#007DC5' },
    producteur:  { name: 'Espace Producteurs Enedis', url: 'https://espace-client.enedis.fr', color: '#007DC5' },
    cardi:       { name: 'CARDi — Contrat producteurs', url: 'https://producteurs.enedis.fr', color: '#0052A5' },
  },
  rte: {
    portal:      { name: 'Portail RTE Producteurs', url: 'https://clients.rte-france.com', color: '#0032A0' },
    request:     { name: 'Demande de raccordement RTE', url: 'https://clients.rte-france.com/lang/fr/visiteurs/clients/raccordement.jsp', color: '#0032A0' },
  },
};

// ─── Checklists pièces par type ──────────────────────────────────────────────

const DOCS_BT_HTA = [
  { id: 'plan_situation', label: 'Plan de situation (extrait IGN ou cadastre)', required: true },
  { id: 'plan_masse', label: 'Plan de masse avec emprise des panneaux', required: true },
  { id: 'schema_uni', label: 'Schéma unifilaire de l\'installation', required: true },
  { id: 'mandat', label: 'Mandat de représentation signé', required: true },
  { id: 'urbanisme', label: 'Autorisation d\'urbanisme (PC/DP/CU)', required: true },
  { id: 'siret', label: 'SIRET du producteur', required: true },
  { id: 'puissance', label: 'Puissance maximale injectée (kVA)', required: true },
  { id: 'onduleur', label: 'Fiche technique onduleur(s)', required: false },
  { id: 'consuel', label: 'Attestation CONSUEL (pour installations BT)', required: false },
  { id: 'dossier_technique', label: 'Dossier technique complet', required: false },
];

const DOCS_CARDI = [
  { id: 'cardi_mandat', label: 'Mandat de représentation pour signature CARDi', required: true },
  { id: 'cardi_rib', label: 'RIB du producteur', required: true },
  { id: 'cardi_plan', label: 'Plan de situation et de masse', required: true },
  { id: 'cardi_schema', label: 'Schéma unifilaire validé', required: true },
  { id: 'cardi_siret', label: 'SIRET et Kbis', required: true },
  { id: 'cardi_consuel', label: 'Attestation CONSUEL finale', required: false },
  { id: 'cardi_ptf', label: 'PTF (Proposition Technique et Financière) signée', required: true },
];

const DOCS_RTE = [
  { id: 'rte_etude', label: "Étude de raccordement HTA/HTB soumise à RTE", required: true },
  { id: 'rte_plan', label: 'Plan de situation et de masse géoréférencé', required: true },
  { id: 'rte_schema', label: 'Schéma unifilaire HTA/HTB', required: true },
  { id: 'rte_kbis', label: 'Extrait Kbis (< 3 mois)', required: true },
  { id: 'rte_accord', label: "Convention de raccordement HTB / Accord de principe", required: false },
  { id: 'rte_garantie', label: 'Garantie bancaire de raccordement RTE', required: false },
  { id: 'rte_consuel', label: 'Attestation d\'achèvement des travaux', required: false },
];

// ─── Composant ───────────────────────────────────────────────────────────────

export default function RaccordementModal({ isOpen, onClose, project }) {
  const powerKwc = parseFloat(project?.kwc || project?.projectSize || 0);
  const isHTA = powerKwc >= 250;
  const isRTE = powerKwc >= 10000; // > 10 MWc → RTE
  const defaultTab = isRTE ? 'rte' : 'bt_hta';

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [formData, setFormData] = useState({
    puissance: '',
    typeRaccordement: 'Injection totale',
    tension: isHTA ? 'HTA (Haute Tension A)' : 'BT (Basse Tension)',
    pdr: '',
    siret: '',
    dateMiseEnService: '',
    nom: '',
    adresse: '',
  });
  const [btChecklist, setBtChecklist] = useState(() => Object.fromEntries(DOCS_BT_HTA.map(d => [d.id, d.required])));
  const [cardiChecklist, setCardiChecklist] = useState(() => Object.fromEntries(DOCS_CARDI.map(d => [d.id, d.required])));
  const [rteChecklist, setRteChecklist] = useState(() => Object.fromEntries(DOCS_RTE.map(d => [d.id, d.required])));
  const [copied, setCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setFormData(prev => ({
        ...prev,
        puissance: project.kwc || project.projectSize || '',
        siret: project.siret || '',
        nom: `${project.firstName || ''} ${project.lastName || project.name || ''}`.trim(),
        adresse: `${project.address || ''}, ${project.zip || ''} ${project.city || ''}`.trim().replace(/^,\s*/, ''),
        tension: (parseFloat(project.kwc || project.projectSize || 0) >= 250) ? 'HTA (Haute Tension A)' : 'BT (Basse Tension)',
      }));
    }
  }, [project, isOpen]);

  const handleChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleCheck = (setter, id) => setter(prev => ({ ...prev, [id]: !prev[id] }));

  const emailBody = `Madame, Monsieur,

Nous vous adressons la présente demande de raccordement pour une installation photovoltaïque.

Informations du demandeur :
  Nom : ${formData.nom || '_______________'}
  Adresse de l'installation : ${formData.adresse || '_______________'}
  SIRET : ${formData.siret || '_______________'}

Caractéristiques de l'installation :
  Puissance : ${formData.puissance || '___'} kWc
  Type de raccordement : ${formData.typeRaccordement}
  Tension de raccordement : ${formData.tension}
  PDR/PRM : ${formData.pdr || '_______________'}
  Date de mise en service prévue : ${formData.dateMiseEnService || '_______________'}

Nous vous remercions de bien vouloir nous transmettre une proposition technique et financière (PTF).

Cordialement,
ENR COURTAGE ENERGIE — nelsonpv.fr`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Email copié', description: 'L\'email de demande a été copié dans le presse-papiers.' });
  };

  const handleOpenPortal = (portal) => {
    window.open(portal.url, '_blank');
  };

  // ── Génération PDF récapitulatif ───────────────────────────────
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; const m = 20;

      doc.setFillColor(0, 82, 165);
      doc.rect(0, 0, W, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Dossier de Demande de Raccordement', m, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Installation PV — ${formData.puissance || '—'} kWc — ${formData.tension}`, m, 24);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} par nelsonpv.fr`, m, 32);

      let y = 50;
      const section = (title, color = [0, 82, 165]) => {
        doc.setFillColor(...color);
        doc.roundedRect(m, y - 5, W - 2 * m, 9, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(title.toUpperCase(), m + 3, y + 1);
        y += 12;
        doc.setTextColor(30, 30, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      };

      const row = (label, value) => {
        doc.setFont('helvetica', 'bold'); doc.text(label + ' :', m, y);
        doc.setFont('helvetica', 'normal'); doc.text(String(value || '—'), m + 55, y);
        y += 7;
      };

      section('Informations Projet');
      row('Demandeur', formData.nom);
      row('Adresse', formData.adresse);
      row('SIRET', formData.siret);
      row('Puissance', `${formData.puissance} kWc`);
      row('Tension raccordement', formData.tension);
      row('Type injection', formData.typeRaccordement);
      row('Mise en service prévue', formData.dateMiseEnService || 'Non renseigné');
      y += 4;

      const activeChecklist = activeTab === 'cardi' ? DOCS_CARDI : activeTab === 'rte' ? DOCS_RTE : DOCS_BT_HTA;
      const activeState = activeTab === 'cardi' ? cardiChecklist : activeTab === 'rte' ? rteChecklist : btChecklist;

      section('Pièces Justificatives', [0, 82, 165]);
      activeChecklist.forEach(item => {
        const done = activeState[item.id];
        doc.setTextColor(done ? 14 : 180, done ? 158 : 30, done ? 63 : 30);
        doc.setFont('helvetica', done ? 'bold' : 'normal');
        doc.setFontSize(8);
        doc.text(`${done ? '☑' : '☐'}  ${item.label}${item.required ? ' *' : ''}`, m, y);
        doc.setTextColor(30, 30, 50);
        y += 6;
      });
      y += 5;

      section('Portails de Soumission', [0, 52, 140]);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(0, 52, 140);
      doc.text('Enedis Connect :', m, y); doc.setFont('helvetica', 'normal');
      doc.text(PORTALS.enedis.connect.url, m + 38, y); y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Raccordement Direct :', m, y); doc.setFont('helvetica', 'normal');
      doc.text(PORTALS.enedis.raccordement.url, m + 38, y); y += 7;
      if (isRTE) {
        doc.setFont('helvetica', 'bold');
        doc.text('Portail RTE :', m, y); doc.setFont('helvetica', 'normal');
        doc.text(PORTALS.rte.portal.url, m + 38, y); y += 7;
      }

      doc.setFillColor(0, 82, 165);
      doc.rect(0, 282, W, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Document généré par nelsonpv.fr — ENR COURTAGE ENERGIE', m, 291);

      doc.save(`Raccordement_${(project?.name || project?.lastName || 'Projet').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
      toast({ title: 'Dossier PDF généré', description: 'Le récapitulatif de raccordement a été téléchargé.' });
    } catch (e) {
      console.error('Erreur PDF raccordement:', e);
      toast({ title: 'Erreur', description: 'Impossible de générer le PDF.', variant: 'destructive' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!isOpen) return null;

  const TABS = [
    { id: 'bt_hta', label: isHTA ? 'Demande HTA' : 'Demande BT', icon: Plug },
    { id: 'cardi', label: 'Contrat CARDi', icon: FileText },
    ...(isRTE ? [{ id: 'rte', label: 'Raccordement RTE', icon: Zap }] : []),
  ];

  // ── Checklist renderer ─────────────────────────────────────────
  const ChecklistBlock = ({ items, state, setter }) => (
    <div className="space-y-2">
      {items.map(item => (
        <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
          <input
            type="checkbox" checked={!!state[item.id]}
            onChange={() => toggleCheck(setter, item.id)}
            className="w-4 h-4 rounded text-blue-600"
          />
          <div className="flex-1">
            <span className="text-xs text-gray-700 font-medium">{item.label}</span>
            {item.required && <span className="ml-1.5 text-[10px] text-red-400 font-bold">*requis</span>}
          </div>
          {state[item.id] ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />}
        </label>
      ))}
    </div>
  );

  // ── Boutons portails ───────────────────────────────────────────
  const PortalButton = ({ label, url, icon: Icon, color }) => (
    <button
      onClick={() => handleOpenPortal({ url })}
      style={{ borderColor: color, color }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold hover:opacity-80 transition-all bg-white"
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
      <ExternalLink className="w-3.5 h-3.5 ml-auto" />
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-cyan-600 px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20">
                <Plug className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg">Demande de Raccordement</h3>
                <p className="text-white/70 text-xs mt-0.5">
                  {project?.name || project?.lastName || '—'} — <span className="font-bold">{powerKwc || '?'} kWc</span>
                  {isHTA && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full font-bold">HTA</span>}
                  {isRTE && <span className="ml-2 bg-red-400/30 px-2 py-0.5 rounded-full font-bold">RTE</span>}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl text-white/60 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/80">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">

            {/* Onglet BT/HTA */}
            {activeTab === 'bt_hta' && (
              <motion.div key="bt_hta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Alerte niveau de tension */}
                <div className={`p-3 rounded-xl border flex items-start gap-2 ${isHTA ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
                  <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isHTA ? 'text-amber-500' : 'text-blue-400'}`} />
                  <p className={`text-xs ${isHTA ? 'text-amber-800' : 'text-blue-700'}`}>
                    {isHTA
                      ? <><strong>Raccordement HTA</strong> — Votre installation (≥ 250 kVA) nécessite un raccordement en Haute Tension. Le dossier sera instruit par la Direction Régionale ENEDIS.</>
                      : <><strong>Raccordement BT</strong> — Votre installation est raccordable en Basse Tension. Déposez votre demande directement sur le portail Enedis Connect.</>}
                  </p>
                </div>

                {/* Formulaire */}
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-3">Informations de la demande</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'puissance', label: 'Puissance (kWc)', type: 'number' },
                      { name: 'tension', label: 'Tension', type: 'select', opts: ['BT (Basse Tension)', 'HTA (Haute Tension A)'] },
                      { name: 'typeRaccordement', label: 'Type d\'injection', type: 'select', opts: ['Injection totale', 'Injection partielle', 'Autoconsommation + injection'] },
                      { name: 'pdr', label: 'PDR / PRM', type: 'text' },
                      { name: 'siret', label: 'SIRET producteur', type: 'text' },
                      { name: 'dateMiseEnService', label: 'Mise en service prévue', type: 'date' },
                    ].map(field => (
                      <div key={field.name}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</label>
                        {field.type === 'select' ? (
                          <select
                            name={field.name} value={formData[field.name]}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            {field.opts.map(o => <option key={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type={field.type} name={field.name} value={formData[field.name]}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pièces */}
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">Pièces à fournir</p>
                  <ChecklistBlock items={DOCS_BT_HTA} state={btChecklist} setter={setBtChecklist} />
                </div>

                {/* Portails */}
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">Portails de soumission</p>
                  <div className="grid grid-cols-2 gap-2">
                    <PortalButton label="Enedis Connect" url={PORTALS.enedis.connect.url} color={PORTALS.enedis.connect.color} />
                    <PortalButton label="Raccordement Direct" url={PORTALS.enedis.raccordement.url} color={PORTALS.enedis.raccordement.color} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Onglet CARDi */}
            {activeTab === 'cardi' && (
              <motion.div key="cardi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800">
                  <p className="font-bold text-sm mb-1">📄 Contrat CARDi (Contrat d'Accès au Réseau de Distribution)</p>
                  <p>Le CARDi est le contrat signé entre vous et Enedis autorisant l'injection de votre production sur le réseau. Il est distinct de la demande de raccordement et est signé après obtention de la PTF.</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">Pièces nécessaires pour le CARDi</p>
                  <ChecklistBlock items={DOCS_CARDI} state={cardiChecklist} setter={setCardiChecklist} />
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">Portails CARDi</p>
                  <div className="grid grid-cols-1 gap-2">
                    <PortalButton label="Espace Producteurs Enedis" url={PORTALS.enedis.producteur.url} color={PORTALS.enedis.producteur.color} />
                    <PortalButton label="Portail CARDi Enedis" url={PORTALS.enedis.cardi.url} color={PORTALS.enedis.cardi.color} />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-700 mb-1">Contact ENEDIS Producteurs</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                    <span>09 69 32 18 00 (numéro non surtaxé)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>producteurs.enedis.fr</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Onglet RTE */}
            {activeTab === 'rte' && (
              <motion.div key="rte" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
                  <p className="font-bold text-sm mb-1">⚡ Raccordement RTE (> 10 MWc)</p>
                  <p>Pour les installations dépassant 10 MWc, le raccordement est géré par RTE (Réseau de Transport d'Électricité) et non Enedis. Une étude préalable de faisabilité est obligatoire.</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">Pièces à fournir pour RTE</p>
                  <ChecklistBlock items={DOCS_RTE} state={rteChecklist} setter={setRteChecklist} />
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">Portails RTE</p>
                  <div className="grid grid-cols-1 gap-2">
                    <PortalButton label="Portail Clients RTE" url={PORTALS.rte.portal.url} color={PORTALS.rte.portal.color} />
                    <PortalButton label="Demande de raccordement RTE" url={PORTALS.rte.request.url} color={PORTALS.rte.request.color} />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-700 mb-1">Contact RTE</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <Globe className="w-3.5 h-3.5 text-blue-700" />
                    <span>clients.rte-france.com</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                    <Mail className="w-3.5 h-3.5 text-blue-700" />
                    <span>raccordement@rte-france.com</span>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/80">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
            Fermer
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCopyEmail}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier email'}
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all shadow-sm disabled:opacity-60"
            >
              {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Dossier PDF
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
