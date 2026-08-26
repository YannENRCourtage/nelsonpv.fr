import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Send, Copy, Check, User, Building, Phone, MapPin, FileText, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatGps } from '@/utils/formatGps.js';

/**
 * EmailMandatementModal — Générateur d'e-mail pour les mandatements (Huissier, Géomètre, Notaire)
 * Cible automatiquement le professionnel assigné dans la base, pré-remplit les coordonnées
 * et génère le modèle d'email avec toutes les références du projet et pièces à joindre.
 */
export default function EmailMandatementModal({
  isOpen,
  onClose,
  type = 'geometre', // 'huissier', 'geometre', 'notaire'
  project,
  professionals = [],
  onMailSent
}) {
  const [selectedProfId, setSelectedProfId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  // Titres et métadonnées selon le type de mandatement
  const MANDATEMENT_CONFIG = {
    huissier: {
      title: 'Mandatement Huissier (Commissaire de justice)',
      subtitle: 'Constat d\'affichage du panneau d\'urbanisme (période de 2 mois)',
      categoryTag: 'Huissier',
      color: 'from-amber-500 to-orange-500',
      defaultSubject: `Mandat constat d'affichage — Projet ${project?.name || ''} (${project?.city || ''})`,
      getDefaultBody: (prof, proj) => `Bonjour ${prof?.name ? `Maître ${prof.name}` : 'Maître'},

Nous vous mandatons pour réaliser le constat d'affichage réglementaire (3 passages sur une période de 2 mois) pour le projet photovoltaïque suivant :

• Nom du projet / Client : ${proj?.firstName || ''} ${proj?.name || proj?.lastName || ''}
• Adresse du terrain : ${proj?.address || ''}, ${proj?.zip || ''} ${proj?.city || ''}
• Références cadastrales : Section ${proj?.cadastre_section || 'N/A'} - N° ${proj?.cadastre_numero || 'N/A'} (Surface : ${proj?.cadastre_surface || 'N/A'} m²)
• Type d'ouvrage : ${proj?.type || 'Bâtiment agricole photovoltaïque'} (${proj?.kwc ? `${proj.kwc} kWc` : 'Centrale solaire'})

Le panneau de permis de construire / déclaration préalable a été posé sur site.
Merci de bien vouloir effectuer le premier passage dès que possible et nous transmettre le procès-verbal intermédiaire.

Restant à votre disposition pour tout renseignement complémentaire.

Cordialement,
Groupe ENR Courtage
contact@enr-courtage.fr | 05 56 00 00 00`
    },
    geometre: {
      title: 'Mandatement Géomètre-Expert',
      subtitle: 'Division parcellaire et plan de bornage pour bail emphytéotique',
      categoryTag: 'Géomètre',
      color: 'from-emerald-500 to-teal-500',
      defaultSubject: `Mission division parcellaire — Projet ${project?.name || ''} (${project?.city || ''})`,
      getDefaultBody: (prof, proj) => `Bonjour ${prof?.name ? `M. / Mme ${prof.name}` : ''},

Dans le cadre du développement d'une centrale photovoltaïque au sol / bâtiment, nous vous confions la mission de division parcellaire et d'établissement du plan de bornage pour le dossier suivant :

• Demandeur / Propriétaire : ${proj?.firstName || ''} ${proj?.name || proj?.lastName || ''}
• Adresse du site : ${proj?.address || ''}, ${proj?.zip || ''} ${proj?.city || ''}
• Parcelle(s) d'origine : Section ${proj?.cadastre_section || 'N/A'} - N° ${proj?.cadastre_numero || 'N/A'}
• Emprise du projet : environ ${(proj?.longueur && proj?.largeur) ? `${proj.longueur * proj.largeur} m²` : 'selon plan de masse joint'}
• Coordonnées GPS : ${formatGps(proj?.gps) || 'Voir fiche projet'}

Pourriez-vous nous établir votre devis d'intervention ainsi que votre calendrier prévisionnel de relevé terrain ?

Bien cordialement,
Groupe ENR Courtage
contact@enr-courtage.fr`
    },
    notaire: {
      title: 'Mandatement Notaire',
      subtitle: 'Rédaction et régularisation du bail emphytéotique / promesse de bail',
      categoryTag: 'Notaire',
      color: 'from-purple-500 to-indigo-500',
      defaultSubject: `Dossier Bail Emphytéotique — Projet Solaire ${project?.name || ''} (${project?.city || ''})`,
      getDefaultBody: (prof, proj) => `Bonjour ${prof?.name ? `Maître ${prof.name}` : 'Maître'},

Nous nous rapprochons de votre étude pour la rédaction et la régularisation de la promesse et du bail emphytéotique relatif au projet solaire suivant :

• Bailleur / Propriétaire : ${proj?.firstName || ''} ${proj?.name || proj?.lastName || ''}
• Preneur : SAS ENR Courtage / Société de projet
• Assiette foncière : Commune de ${proj?.city || ''} (${proj?.zip || ''}) — Section ${proj?.cadastre_section || 'N/A'} N° ${proj?.cadastre_numero || 'N/A'}
• Destination : Exploitation d'une toiture / ombrière photovoltaïque de ${proj?.kwc ? `${proj.kwc} kWc` : 'puissance définie'}
• Durée envisagée : 30 ans avec loyer / indemnité fixée

Vous trouverez ci-joint les pièces d'identité du bailleur, le titre de propriété et le plan de situation cadastral.
Merci de nous faire parvenir le projet d'acte pour relecture.

Cordialement,
Groupe ENR Courtage`
    }
  };

  const currentConfig = MANDATEMENT_CONFIG[type] || MANDATEMENT_CONFIG.geometre;

  // Filtrer les professionnels correspondant à ce type
  const matchedProfs = professionals.filter(p => {
    const cats = Array.isArray(p.categories) ? p.categories : [p.type, p.category].filter(Boolean);
    return cats.some(c => c && c.toLowerCase().includes(currentConfig.categoryTag.toLowerCase()));
  });

  // Sélection automatique du premier professionnel trouvé ou mise à jour
  useEffect(() => {
    if (matchedProfs.length > 0) {
      const p = matchedProfs[0];
      setSelectedProfId(p.id);
      setRecipientEmail(p.email || '');
      setRecipientName(`${p.firstName || ''} ${p.name || p.lastName || ''}`.trim());
      setRecipientCompany(p.company || p.entreprise || '');
      setSubject(currentConfig.defaultSubject);
      setBody(currentConfig.getDefaultBody(p, project));
    } else {
      setSelectedProfId('custom');
      setRecipientEmail('');
      setRecipientName('');
      setRecipientCompany('');
      setSubject(currentConfig.defaultSubject);
      setBody(currentConfig.getDefaultBody({ name: '' }, project));
    }
  }, [type, project, professionals]);

  const handleSelectProf = (profId) => {
    setSelectedProfId(profId);
    if (profId === 'custom') {
      setRecipientEmail('');
      setRecipientName('');
      setRecipientCompany('');
      setBody(currentConfig.getDefaultBody({ name: '' }, project));
    } else {
      const p = professionals.find(item => item.id === profId);
      if (p) {
        setRecipientEmail(p.email || '');
        setRecipientName(`${p.firstName || ''} ${p.name || p.lastName || ''}`.trim());
        setRecipientCompany(p.company || p.entreprise || '');
        setBody(currentConfig.getDefaultBody(p, project));
      }
    }
  };

  const handleCopy = () => {
    const fullText = `Destinataire: ${recipientEmail}\nObjet: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast({
      title: 'Texte copié !',
      description: 'Le contenu de l\'e-mail a été copié dans le presse-papier.',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    if (onMailSent) {
      onMailSent({
        type,
        recipientEmail,
        recipientName,
        date: new Date().toISOString()
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${currentConfig.color} px-6 py-5 text-white flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg leading-tight">{currentConfig.title}</h3>
                <p className="text-xs text-white/80">{currentConfig.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Sélection du professionnel */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <label className="block font-bold text-slate-800 flex items-center justify-between">
                <span>Professionnel cible (Base de données)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {matchedProfs.length} {currentConfig.categoryTag.toLowerCase()}(s) trouvé(s)
                </span>
              </label>

              <select
                value={selectedProfId}
                onChange={(e) => handleSelectProf(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {matchedProfs.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.lastName} {p.firstName || ''} {p.company ? `(${p.company})` : ''} — {p.email || 'Pas d\'email'}
                  </option>
                ))}
                <option value="custom">+ Autre / Saisie manuelle</option>
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email destinataire</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="contact@etude.fr"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom / Étude</label>
                  <input
                    type="text"
                    value={recipientName || recipientCompany}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Maître Dupont"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Objet du mail */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Objet de l'e-mail</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Corps du mail */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Corps du message (Modèle automatique pré-rempli)</span>
                <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Données projet injectées
                </span>
              </label>
              <textarea
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Fermer
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                {copied ? 'Copié !' : 'Copier l\'e-mail'}
              </button>

              <button
                onClick={handleOpenMailClient}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
                Ouvrir dans mon client mail & Envoyer
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
