import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Mail, Copy, Check, FileText, AlertCircle, Building, 
  MapPin, Calendar, CheckCircle2, Send, ExternalLink, ShieldAlert, Sparkles, User
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { 
  generateCertificatTaciteLetterPDF, 
  buildMairieCertificatEmail,
  extractInseeFromDpNumber,
  fetchMairieByInsee
} from '@/services/dpInstructionService';

export default function DemandeCertificatTaciteModal({
  isOpen,
  onClose,
  project,
  timeline,
  mairieInfo,
  onUpdateProject,
}) {
  if (!isOpen || !project) return null;

  // Récupération des données initiales depuis le projet, stepState et mairieInfo
  const dpNumber = project?.dp_registration_number || project?.numero_dp || project?.num_dp || 'DP 024 253 26 00012';
  const communeName = mairieInfo?.commune || project?.city || project?.commune || '';
  const codePostal = mairieInfo?.codePostal || project?.zip || project?.zipCode || project?.code_postal || '';
  const mairieNom = mairieInfo?.nomMairie || project?.dp_mairie_info?.nomMairie || `Mairie de ${communeName}`;
  const mairieAddress = mairieInfo?.adresseLigne || project?.dp_mairie_info?.adresseLigne || `${codePostal} ${communeName}`;
  
  // Résolution multi-niveaux de l'email officiel de la mairie pour ne JAMAIS l'égarer
  const initialMairieEmail = 
    mairieInfo?.email || 
    project?.dp_mairie_info?.email || 
    project?.mairie_email || 
    project?.devWorkflow?.dp?.dp_mairie_info?.email || 
    project?.stepsState?.dp?.dp_mairie_info?.email || 
    '';

  // Demandeur (pétitionnaire)
  const demandeurDefault = project?.demandeur_nom || project?.company || 'ENR COURTAGE ENERGIE';
  const demandeurSignataireDefault = project?.demandeur_signataire || 'Yann BARBERIS — Direction du Développement';
  const demandeurEmailDefault = project?.demandeur_email || 'contact@enr-courtage.fr';
  const demandeurTelDefault = project?.demandeur_tel || '05 56 00 00 00';
  const demandeurAddressDefault = project?.demandeur_adresse || '12 Avenue de l’Énergie, 33127 Saint-Jean-d’Illac';

  // Cadastre & travaux
  const sectionCadastre = project?.cadastre_section || project?.section || 'A';
  const numCadastre = project?.cadastre_numero || project?.numero_parcelle || project?.parcelle || '1';
  const surfaceTerrain = project?.cadastre_surface || project?.surface_parcelle || project?.surface || '';
  const terrainAddress = project?.address || `${communeName}`;

  const isBattery = Boolean(project?.isBattery || project?.isBatterySA || project?.type === 'batterie' || project?.type === 'bess_standalone');
  const defaultTravaux = isBattery
    ? "Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) sur dalle béton < 20 m² raccordée au réseau public HTA"
    : (project?.type ? `Construction : ${project.type}` : "Installation d'équipements photovoltaïques sur toiture ou ombrière");

  // Form State
  const [formData, setFormData] = useState({
    dpNumber,
    mairieNom,
    mairieAddress,
    mairieEmail: initialMairieEmail,
    communeName,
    codePostal,
    demandeurName: demandeurDefault,
    demandeurSignataire: demandeurSignataireDefault,
    demandeurEmail: demandeurEmailDefault,
    demandeurTel: demandeurTelDefault,
    demandeurAddress: demandeurAddressDefault,
    natureTravaux: defaultTravaux,
    terrainAddress,
    cadastreSection: sectionCadastre,
    cadastreNumero: numCadastre,
    cadastreSurface: surfaceTerrain,
    depositDate: timeline?.depositDateFormatted || '01/09/2026',
    complementDate: timeline?.complementDateFormatted || '',
    legalDueDate: timeline?.legalDueDateFormatted || '01/10/2026',
  });

  const [customEmailBody, setCustomEmailBody] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedField, setCopiedField] = useState(null); // 'to' | 'subject' | 'body' | 'all' | null
  const [activeTab, setActiveTab] = useState('email'); // 'email' | 'preview' | 'edit'

  // Synchronisation lors du changement des props
  useEffect(() => {
    const curEmail = 
      mairieInfo?.email || 
      project?.dp_mairie_info?.email || 
      project?.mairie_email || 
      project?.devWorkflow?.dp?.dp_mairie_info?.email || 
      '';

    setFormData(prev => ({
      ...prev,
      dpNumber,
      mairieNom: mairieInfo?.nomMairie || project?.dp_mairie_info?.nomMairie || prev.mairieNom,
      mairieAddress: mairieInfo?.adresseLigne || project?.dp_mairie_info?.adresseLigne || prev.mairieAddress,
      mairieEmail: curEmail || prev.mairieEmail,
      communeName: mairieInfo?.commune || project?.city || prev.communeName,
      codePostal: mairieInfo?.codePostal || project?.zip || prev.codePostal,
      depositDate: timeline?.depositDateFormatted || prev.depositDate,
      complementDate: timeline?.complementDateFormatted || prev.complementDate,
      legalDueDate: timeline?.legalDueDateFormatted || prev.legalDueDate,
    }));
  }, [dpNumber, mairieInfo, project, timeline]);

  // Si l'email mairie n'est pas encore résolu, tenter l'auto-détection via le code INSEE de la DP
  useEffect(() => {
    const autoFetchMairieIfNeeded = async () => {
      if (formData.mairieEmail && formData.mairieNom) return;
      const codeInsee = mairieInfo?.codeInsee || extractInseeFromDpNumber(formData.dpNumber) || project?.inseeCode || project?.citycode;
      if (codeInsee) {
        try {
          const res = await fetchMairieByInsee(codeInsee);
          if (res) {
            setFormData(prev => ({
              ...prev,
              mairieNom: prev.mairieNom || res.nomMairie || '',
              mairieAddress: prev.mairieAddress || res.adresseLigne || '',
              mairieEmail: prev.mairieEmail || res.email || '',
              communeName: prev.communeName || res.commune || '',
              codePostal: prev.codePostal || res.codePostal || '',
            }));
          }
        } catch (e) {
          console.warn('Auto fetch mairie in modal failed:', e);
        }
      }
    };
    autoFetchMairieIfNeeded();
  }, [formData.dpNumber, project?.id]);

  // Construction de l'email
  const emailPayload = useMemo(() => {
    return buildMairieCertificatEmail({
      mairieEmail: formData.mairieEmail,
      mairieNom: formData.mairieNom,
      dpNumber: formData.dpNumber,
      depositDate: formData.depositDate,
      complementDate: formData.complementDate,
      legalDueDate: formData.legalDueDate,
      demandeurName: formData.demandeurName,
      demandeurEmail: formData.demandeurEmail,
      demandeurTel: formData.demandeurTel,
      projectTitle: formData.natureTravaux,
      terrainAddress: formData.terrainAddress,
      communeName: formData.communeName,
      cadastreSection: formData.cadastreSection,
      cadastreNumero: formData.cadastreNumero,
    });
  }, [formData]);

  // Initialisation du corps d'email
  useEffect(() => {
    if (!customEmailBody && emailPayload?.body) {
      setCustomEmailBody(emailPayload.body);
    }
  }, [emailPayload?.body]);

  // Copie individuelle d'un champ
  const handleCopyField = (field, text, label) => {
    if (!text) {
      toast({
        title: "Champ vide",
        description: `Aucun texte à copier pour ${label}.`,
        variant: "destructive"
      });
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: `${label} copié !`,
      description: "Le texte a été copié dans votre presse-papier.",
    });
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Copie intégrale de tout le mail (Destinataire + Objet + Corps)
  const handleCopyAllEmail = () => {
    const fullText = `Destinataire : ${formData.mairieEmail}\nObjet : ${emailPayload.subject}\n\n${customEmailBody || emailPayload.body}`;
    navigator.clipboard.writeText(fullText);
    setCopiedField('all');
    toast({
      title: "Email complet copié !",
      description: "Destinataire, objet et corps copiés dans votre presse-papier.",
    });
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Téléchargement du PDF officiel A4
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateCertificatTaciteLetterPDF({
        dpNumber: formData.dpNumber,
        depositDate: formData.depositDate,
        complementDate: formData.complementDate,
        legalDueDate: formData.legalDueDate,
        demandeurName: formData.demandeurName,
        demandeurAddress: formData.demandeurAddress,
        demandeurEmail: formData.demandeurEmail,
        demandeurTel: formData.demandeurTel,
        demandeurSignataire: formData.demandeurSignataire,
        natureTravaux: formData.natureTravaux,
        terrainAddress: formData.terrainAddress,
        communeName: formData.communeName,
        codePostal: formData.codePostal,
        cadastreSection: formData.cadastreSection,
        cadastreNumero: formData.cadastreNumero,
        cadastreSurface: formData.cadastreSurface,
        mairieNom: formData.mairieNom,
        mairieAddress: formData.mairieAddress,
      });
      toast({
        title: "Courrier PDF officiel généré !",
        description: `Le document pour le dossier ${formData.dpNumber} a été téléchargé en local.`,
      });
    } catch (err) {
      console.error('Erreur génération PDF certificat tacite:', err);
      toast({
        title: "Erreur de génération",
        description: err.message || "Impossible de générer le courrier PDF.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Marquer comme certificat obtenu
  const handleMarkAsObtained = () => {
    if (onUpdateProject && project?.id) {
      onUpdateProject(project.id, {
        dp_status: 'validated',
        dp_certificate_obtained: true,
        dp_certificate_date: new Date().toISOString().split('T')[0],
      });
      toast({
        title: "Statut mis à jour !",
        description: "Le dossier DP est désormais marqué comme validé avec certificat de non-opposition obtenu.",
      });
      onClose();
    }
  };

  // Lien mailto dynamique avec destinataire, objet et corps encodés
  const dynamicMailto = useMemo(() => {
    const to = encodeURIComponent(formData.mairieEmail || '');
    const subject = encodeURIComponent(emailPayload.subject || '');
    const body = encodeURIComponent(customEmailBody || emailPayload.body || '');
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }, [formData.mairieEmail, emailPayload.subject, customEmailBody, emailPayload.body]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 px-6 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Demande Officielle de Certificat de Non-Opposition Tacite
                </h3>
                <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Art. R. 424-13
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Dossier {formData.dpNumber} &bull; {formData.mairieNom} &bull; Échéance légale expirée le <strong className="text-emerald-400">{formData.legalDueDate}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'email' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>E-mail Mairie</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Courrier LRAR (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'edit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Personnaliser
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps de la modale */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          
          {/* Bandeau d'information juridique */}
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 shadow-sm">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-1">
              <p className="font-extrabold text-sm text-emerald-900">
                Accord tacite acquis de plein droit pour {formData.demandeurName}
              </p>
              <p className="text-emerald-800 leading-relaxed font-medium">
                En vertu de l'article <strong>R. 424-13 du Code de l'urbanisme</strong>, le Maire est tenu de délivrer ce certificat de non-opposition tacite sur simple demande. Vous pouvez soit <strong>envoyer cet e-mail officiel directement au service urbanisme</strong>, soit <strong>télécharger le courrier officiel au format PDF A4</strong> pour envoi recommandé avec accusé de réception (LRAR).
              </p>
            </div>
          </div>

          {/* ═══ ONGLET 1 : BLOC EMAIL PRÊT À ENVOYER (COPIER / COLLER) ═══ */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                
                {/* 1. DESTINATAIRE (Mairie) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      1. Destinataire (Service Urbanisme Mairie)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyField('to', formData.mairieEmail, "L'adresse email")}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedField === 'to' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'to' ? 'Copié !' : "📋 Copier l'adresse mail"}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.mairieEmail}
                      onChange={(e) => setFormData({ ...formData, mairieEmail: e.target.value })}
                      placeholder="ex : mairie@rochechouart.com ou urbanisme@..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-blue-700 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  {!formData.mairieEmail && (
                    <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Email mairie non identifié automatiquement. Vous pouvez le saisir directement ci-dessus.
                    </p>
                  )}
                </div>

                {/* 2. OBJET DU MAIL */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      2. Objet de l'e-mail
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyField('subject', emailPayload.subject, "L'objet du mail")}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedField === 'subject' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'subject' ? 'Copié !' : "📋 Copier l'objet"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={emailPayload.subject}
                    readOnly
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none select-all"
                  />
                </div>

                {/* 3. CORPS DE L'E-MAIL */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <Send className="w-3.5 h-3.5 text-indigo-600" />
                      3. Corps du mail (modifiable / sélectionnable)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyField('body', customEmailBody || emailPayload.body, "Le corps du mail")}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedField === 'body' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'body' ? 'Copié !' : "📋 Copier le corps du mail"}</span>
                    </button>
                  </div>
                  <textarea
                    rows={12}
                    value={customEmailBody}
                    onChange={(e) => setCustomEmailBody(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all font-sans whitespace-pre-wrap"
                  />
                </div>

                {/* Barre d'action rapide dans le bloc e-mail */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 bg-slate-50/80 -mx-5 -mb-5 p-4 rounded-b-2xl">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyAllEmail}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      {copiedField === 'all' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-indigo-600" />}
                      <span>{copiedField === 'all' ? 'Tout le mail a été copié !' : "📋 Copier tout le mail (Destinataire + Objet + Corps)"}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {formData.mairieEmail ? (
                      <a
                        href={dynamicMailto}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>✉️ Ouvrir dans mon client mail ({formData.mairieEmail})</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Renseignez l'email pour le bouton direct
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ═══ ONGLET 2 : COURRIER OFFICIEL LRAR (A4) ═══ */}
          {activeTab === 'preview' && (
            <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-10 text-slate-800 font-sans leading-relaxed text-sm max-w-3xl mx-auto space-y-6">
              
              {/* En-tête de lettre */}
              <div className="flex justify-between items-start border-b pb-5">
                <div className="space-y-1">
                  <div className="text-lg font-black text-slate-900">{formData.demandeurName.toUpperCase()}</div>
                  <div className="text-xs text-slate-600">{formData.demandeurAddress}</div>
                  <div className="text-xs text-slate-600">Tél : {formData.demandeurTel} &bull; Email : {formData.demandeurEmail}</div>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-xs text-slate-500 font-medium">Fait le {new Date().toLocaleDateString('fr-FR')}</div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left text-xs max-w-[240px]">
                    <div className="font-bold text-slate-900">Monsieur ou Madame le Maire</div>
                    <div className="font-black text-indigo-900">{formData.mairieNom}</div>
                    <div className="text-slate-600">Service Urbanisme</div>
                    <div className="text-slate-600">{formData.mairieAddress}</div>
                  </div>
                </div>
              </div>

              {/* Objet */}
              <div className="space-y-1 pt-1">
                <div className="text-xs font-bold text-rose-600 uppercase tracking-wide">
                  Lettre recommandée avec avis de réception / Dépôt SVE
                </div>
                <div className="font-bold text-base text-slate-900">
                  Objet : Demande de certificat de non-opposition tacite à Déclaration Préalable — Dossier n° <span className="font-mono text-indigo-700">{formData.dpNumber}</span>
                </div>
                <div className="text-xs italic text-slate-500 font-medium">
                  Application de l'article R. 424-13 du Code de l'urbanisme
                </div>
              </div>

              {/* Corps de la lettre */}
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                <p>Madame, Monsieur le Maire,</p>
                <p>
                  En date du <strong>{formData.depositDate}</strong>
                  {formData.complementDate ? ` (puis suite au dépôt régulier des pièces complémentaires réceptionnées par vos services le ${formData.complementDate})` : ''}, 
                  la société / le pétitionnaire <strong>{formData.demandeurName}</strong> a déposé auprès de vos services une Déclaration Préalable enregistrée sous le numéro <strong>{formData.dpNumber}</strong>, portant sur le projet suivant :
                </p>
                
                <ul className="list-disc pl-5 space-y-1 text-slate-800 font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <li><strong>Nature des travaux :</strong> {formData.natureTravaux}</li>
                  <li><strong>Adresse du terrain d’assiette :</strong> {formData.terrainAddress}, {formData.codePostal} {formData.communeName}</li>
                  <li><strong>Références cadastrales :</strong> Section {formData.cadastreSection} n° {formData.cadastreNumero} {formData.cadastreSurface ? `(Superficie : ${formData.cadastreSurface} m²)` : ''}</li>
                </ul>

                <p>
                  Conformément aux dispositions des articles <strong>R. 423-23</strong> et <strong>L. 424-2</strong> du Code de l'urbanisme ainsi qu'aux mentions légales figurant sur le récépissé de dépôt, et en l'absence de notification d'une décision expresse d'opposition dans le délai légal d'instruction arrivé à échéance le <strong>{formData.legalDueDate}</strong>, nous bénéficions depuis cette date d'une décision de non-opposition tacite pour la réalisation de ces travaux.
                </p>

                <p>
                  Aussi, afin de nous permettre de justifier de cette autorisation auprès du gestionnaire du réseau public de distribution d'électricité (Enedis), de notre étude notariale et de nos partenaires financiers, nous vous prions de bien vouloir nous délivrer, en application stricte de <strong>l'article R. 424-13 du Code de l'urbanisme</strong> (<em>« Un certificat est délivré sur simple demande du demandeur »</em>), un certificat attestant de l'existence de cette décision de non-opposition tacite et mentionnant la date de transmission du dossier au représentant de l'État.
                </p>

                <p>
                  Vous remerciant par avance pour votre diligence et l'envoi de ce certificat par retour de courrier ou par voie électronique à l'adresse <strong>{formData.demandeurEmail}</strong>, nous vous prions d'agréer, Madame, Monsieur le Maire, l'expression de notre considération distinguée.
                </p>
              </div>

              {/* Signature */}
              <div className="pt-6 flex justify-end text-right">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-500">Pour le demandeur,</div>
                  <div className="font-extrabold text-sm text-slate-900">{formData.demandeurSignataire}</div>
                  <div className="text-[11px] italic text-slate-400">« Pour faire valoir ce que de droit »</div>
                </div>
              </div>

            </div>
          )}

          {/* ═══ ONGLET 3 : PERSONNALISER LES CHAMPS ═══ */}
          {activeTab === 'edit' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs">
              <div className="space-y-3.5">
                <h4 className="font-black text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-700">
                  <Building className="w-4 h-4" /> Destinataire (Mairie)
                </h4>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Mairie compétente</label>
                  <input
                    type="text"
                    value={formData.mairieNom}
                    onChange={(e) => setFormData({ ...formData, mairieNom: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Adresse postale complète</label>
                  <input
                    type="text"
                    value={formData.mairieAddress}
                    onChange={(e) => setFormData({ ...formData, mairieAddress: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Email officiel du service urbanisme</label>
                  <input
                    type="email"
                    value={formData.mairieEmail}
                    onChange={(e) => setFormData({ ...formData, mairieEmail: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-mono text-blue-700 font-bold"
                  />
                </div>

                <h4 className="font-black text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-700 pt-3 border-t">
                  <Calendar className="w-4 h-4" /> Délais &amp; Dates d'Instruction
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Date dépôt initial</label>
                    <input
                      type="text"
                      value={formData.depositDate}
                      onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Date échéance légale</label>
                    <input
                      type="text"
                      value={formData.legalDueDate}
                      onChange={(e) => setFormData({ ...formData, legalDueDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl font-bold text-emerald-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Date dépôt pièces compl. (si applicable)</label>
                  <input
                    type="text"
                    value={formData.complementDate}
                    onChange={(e) => setFormData({ ...formData, complementDate: e.target.value })}
                    placeholder="Laisser vide si aucune"
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-3.5">
                <h4 className="font-black text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-700">
                  <MapPin className="w-4 h-4" /> Demandeur &amp; Projet
                </h4>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Numéro officiel DP</label>
                  <input
                    type="text"
                    value={formData.dpNumber}
                    onChange={(e) => setFormData({ ...formData, dpNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Société / Demandeur pétitionnaire</label>
                  <input
                    type="text"
                    value={formData.demandeurName}
                    onChange={(e) => setFormData({ ...formData, demandeurName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Signataire / Qualité</label>
                  <input
                    type="text"
                    value={formData.demandeurSignataire}
                    onChange={(e) => setFormData({ ...formData, demandeurSignataire: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Nature exacte des travaux</label>
                  <textarea
                    rows={2}
                    value={formData.natureTravaux}
                    onChange={(e) => setFormData({ ...formData, natureTravaux: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Section</label>
                    <input
                      type="text"
                      value={formData.cadastreSection}
                      onChange={(e) => setFormData({ ...formData, cadastreSection: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Parcelle n°</label>
                    <input
                      type="text"
                      value={formData.cadastreNumero}
                      onChange={(e) => setFormData({ ...formData, cadastreNumero: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Surface (m²)</label>
                    <input
                      type="text"
                      value={formData.cadastreSurface}
                      onChange={(e) => setFormData({ ...formData, cadastreSurface: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer avec boutons d'actions globaux */}
        <div className="bg-slate-100/95 border-t border-slate-200 p-4 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAsObtained}
              className="px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Marquer "Certificat obtenu"</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyAllEmail}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              {copiedField === 'all' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedField === 'all' ? 'Email copié !' : "📋 Copier tout le mail"}</span>
            </button>

            {formData.mairieEmail ? (
              <a
                href={dynamicMailto}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>✉️ Client Mail ({formData.mairieEmail})</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  toast({
                    title: "Aucun email officiel détecté",
                    description: "Renseignez l'adresse email de la mairie dans l'onglet 'E-mail Mairie' pour ouvrir votre messagerie.",
                    variant: "destructive"
                  });
                  setActiveTab('email');
                }}
                className="px-4 py-2.5 bg-slate-300 text-slate-600 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                <span>Email mairie non renseigné</span>
              </button>
            )}

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Génération...' : '📥 Télécharger PDF A4'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
