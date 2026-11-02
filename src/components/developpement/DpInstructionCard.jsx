import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Clock, AlertTriangle, CheckCircle2, ChevronRight, 
  Building, Mail, Phone, MapPin, Calendar, Sparkles, RefreshCw, 
  ExternalLink, ShieldCheck, Check, Info, Search, Paperclip
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { 
  extractInseeFromDpNumber, 
  fetchMairieByInsee, 
  calculateDpTimeline,
  resolveProjectDepositDate,
  formatToIsoDate,
  formatToFrenchDate,
  normalizeDpNumber,
  searchAndSyncDp,
  extractDataFromReceiptFile
} from '@/services/dpInstructionService';

export default function DpInstructionCard({
  project,
  stepState,
  onUpdateStep,
  onOpenUrbanismeWizard,
  onRequestCertificate,
}) {
  // Numéro de DP
  const [dpNumber, setDpNumber] = useState(
    stepState?.registrationNumber || 
    project?.dp_registration_number || 
    project?.numero_dp || 
    project?.num_dp || 
    ''
  );

  // Date de dépôt initial résolue intelligemment
  const [depositDate, setDepositDate] = useState(() => {
    const resolved = resolveProjectDepositDate(project, stepState);
    return resolved ? formatToIsoDate(resolved) : '';
  });

  // Régime
  const [regime, setRegime] = useState(
    stepState?.regime || 
    project?.dp_regime || 
    '1_mois'
  );

  // Pièces complémentaires
  const [hasComplement, setHasComplement] = useState(
    Boolean(stepState?.hasComplement || project?.dp_has_complement || regime === 'pieces_complementaires')
  );
  const [complementDate, setComplementDate] = useState(
    stepState?.complementDate || 
    project?.dp_complement_date || 
    ''
  );

  // Constat huissier affichage
  const [displayDate, setDisplayDate] = useState(
    stepState?.displayDate || 
    project?.dp_display_date || 
    project?.date_constat_huissier || 
    ''
  );

  // Coordonnées de la mairie
  const [mairieInfo, setMairieInfo] = useState(
    stepState?.dp_mairie_info || project?.dp_mairie_info || null
  );
  const [loadingMairie, setLoadingMairie] = useState(false);
  const [mairieResolvedCode, setMairieResolvedCode] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Synchronisation avec les props quand le projet change
  useEffect(() => {
    const curDp = stepState?.registrationNumber || project?.dp_registration_number || project?.numero_dp || project?.num_dp || '';
    setDpNumber(curDp);
    
    // Résolution robuste de la date de dépôt pour ne jamais afficher "Invalid Date"
    const resolved = resolveProjectDepositDate(project, stepState);
    const isoDate = resolved ? formatToIsoDate(resolved) : '';
    if (isoDate) {
      setDepositDate(isoDate);
    } else if (stepState?.depositDate) {
      setDepositDate(stepState.depositDate);
    }

    setRegime(stepState?.regime || project?.dp_regime || '1_mois');
    setHasComplement(Boolean(stepState?.hasComplement || project?.dp_has_complement || stepState?.regime === 'pieces_complementaires'));
    setComplementDate(stepState?.complementDate || project?.dp_complement_date || '');
    setDisplayDate(stepState?.displayDate || project?.dp_display_date || project?.date_constat_huissier || '');
    
    const curMairie = stepState?.dp_mairie_info || project?.dp_mairie_info || null;
    if (curMairie) {
      setMairieInfo(curMairie);
    } else if (curDp && curDp.length >= 7) {
      detectAndFetchMairie(curDp);
    }
  }, [project?.id, stepState]);

  // Décodage automatique de la mairie à partir du numéro de DP ou du code INSEE du projet
  const detectAndFetchMairie = async (inputDp, force = false) => {
    const codeInsee = extractInseeFromDpNumber(inputDp) || project?.inseeCode || project?.citycode;
    if (!codeInsee) return;

    if (!force && mairieResolvedCode === codeInsee && mairieInfo) {
      return; // Déjà résolu pour ce code INSEE
    }

    try {
      setLoadingMairie(true);
      const data = await fetchMairieByInsee(codeInsee);
      if (data) {
        setMairieInfo(data);
        setMairieResolvedCode(codeInsee);
        if (onUpdateStep) {
          onUpdateStep({ dp_mairie_info: data, dp_insee: codeInsee, mairie_email: data.email || '' });
        }
      }
    } catch (err) {
      console.warn('Erreur auto-détection mairie DP:', err);
    } finally {
      setLoadingMairie(false);
    }
  };

  // Trigger détection mairie lors de la modification du numéro DP
  useEffect(() => {
    if (dpNumber && dpNumber.length >= 7) {
      detectAndFetchMairie(dpNumber);
    }
  }, [dpNumber]);

  // Recherche & synchronisation multi-sources (SITADEL, Web affichage, documents & jalons)
  const handleSearchAndSync = async () => {
    if (!dpNumber) return;
    setIsSearching(true);
    try {
      const res = await searchAndSyncDp(dpNumber, project, stepState);
      if (res.normalizedDp) {
        setDpNumber(res.normalizedDp);
      }
      if (res.mairieInfo) {
        setMairieInfo(res.mairieInfo);
      }
      const finalDepositDate = res.depositDateIso || depositDate;
      if (finalDepositDate) {
        setDepositDate(finalDepositDate);
      }
      const tl = res.timeline || calculateDpTimeline({
        depositDate: finalDepositDate,
        regime,
        hasComplement,
        complementDate,
        displayDate,
      });

      if (onUpdateStep) {
        onUpdateStep({
          registrationNumber: res.normalizedDp || dpNumber,
          dp_registration_number: res.normalizedDp || dpNumber,
          numero_dp: res.normalizedDp || dpNumber,
          ...(res.mairieInfo ? { dp_mairie_info: res.mairieInfo, mairie_email: res.mairieInfo.email } : {}),
          ...(finalDepositDate ? {
            depositDate: finalDepositDate,
            dp_deposit_date: finalDepositDate,
            date_depot_dp: finalDepositDate,
            dpDepositDate: finalDepositDate,
            dateDepotDP: finalDepositDate,
            depositDateFormatted: res.depositDateFormatted || formatToFrenchDate(finalDepositDate),
            lastIntervention: res.depositDateFormatted || formatToFrenchDate(finalDepositDate),
          } : {}),
          ...(tl?.legalDueDateIso ? { deadline: tl.legalDueDateIso, dp_deadline: tl.legalDueDateIso } : {}),
        });
      }

      const statutLabel = tl?.isOverdue ? 'Accord tacite acquis' : 'En cours d\'instruction';
      toast({
        title: "✅ DP synchronisée",
        description: `Mairie de ${res.communeName || 'la commune'} • Dépôt : ${res.depositDateFormatted || '—'} • Échéance : ${tl?.legalDueDateFormatted || '—'} (${statutLabel})`,
      });
    } catch (err) {
      console.error('Erreur synchronisation DP:', err);
      toast({
        title: "Erreur synchronisation",
        description: err.message || "Impossible d'interroger les services publics.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // BONUS : Lecture automatique de récépissé ou courrier mairie (PDF ou image)
  const [isReadingReceipt, setIsReadingReceipt] = useState(false);

  const handleImportReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReadingReceipt(true);
    try {
      const data = await extractDataFromReceiptFile(file);
      let newDp = dpNumber;
      let newDate = depositDate;
      let newRegime = regime;

      if (data?.dpNumber) {
        newDp = data.dpNumber;
        setDpNumber(data.dpNumber);
      }
      if (data?.depositDateIso) {
        newDate = data.depositDateIso;
        setDepositDate(data.depositDateIso);
      }
      if (data?.regime) {
        newRegime = data.regime;
        setRegime(data.regime);
      }

      const tl = calculateDpTimeline({
        depositDate: newDate,
        regime: newRegime,
        hasComplement,
        complementDate,
        displayDate,
      });

      if (onUpdateStep) {
        onUpdateStep({
          registrationNumber: newDp,
          dp_registration_number: newDp,
          numero_dp: newDp,
          ...(newDate ? {
            depositDate: newDate,
            dp_deposit_date: newDate,
            date_depot_dp: newDate,
            dpDepositDate: newDate,
            dateDepotDP: newDate,
            depositDateFormatted: data?.depositDateFormatted || formatToFrenchDate(newDate),
          } : {}),
          regime: newRegime,
          ...(tl?.legalDueDateIso ? { deadline: tl.legalDueDateIso, dp_deadline: tl.legalDueDateIso } : {}),
          ...(data?.depositDateFormatted ? { lastIntervention: data.depositDateFormatted } : {}),
          status: tl?.isOverdue ? 'in_progress' : (stepState?.status || 'pending'),
        });
      }

      if (data?.dpNumber) {
        detectAndFetchMairie(data.dpNumber, true);
      }

      toast({
        title: "📄 Récépissé analysé avec succès !",
        description: `${newDp ? `DP : ${newDp} • ` : ''}${newDate ? `Dépôt : ${data?.depositDateFormatted || formatToFrenchDate(newDate)} • ` : ''}Délai : ${newRegime === '2_mois' ? '2 mois' : '1 mois'} (${tl.isOverdue ? 'Accord tacite acquis' : 'En cours'})`,
      });
    } catch (err) {
      console.error('Erreur lecture récépissé:', err);
      toast({
        title: "Erreur lecture récépissé",
        description: err.message || "Impossible de lire le document.",
        variant: "destructive"
      });
    } finally {
      setIsReadingReceipt(false);
      e.target.value = '';
    }
  };

  // Calcul temps réel de la chronologie
  const timeline = useMemo(() => {
    return calculateDpTimeline({
      depositDate: depositDate || null,
      regime,
      hasComplement,
      complementDate: complementDate || null,
      hasRefusal: stepState?.status === 'refused' || project?.dp_refusal,
      certificateObtained: stepState?.status === 'validated' || project?.dp_certificate_obtained,
      displayDate: displayDate || null,
    });
  }, [depositDate, regime, hasComplement, complementDate, displayDate, stepState?.status, project?.dp_certificate_obtained, project?.dp_refusal]);

  // Sauvegarde des champs
  const handleDpNumberChange = (val) => {
    const norm = normalizeDpNumber(val);
    const cleaned = norm.formatted || val;
    setDpNumber(cleaned);
    if (onUpdateStep) {
      onUpdateStep({
        registrationNumber: cleaned,
        dp_registration_number: cleaned,
        numero_dp: cleaned,
      });
    }
  };

  const handleDepositDateChange = (val) => {
    setDepositDate(val);
    const tl = calculateDpTimeline({
      depositDate: val,
      regime,
      hasComplement,
      complementDate,
      displayDate,
    });
    if (onUpdateStep) {
      onUpdateStep({
        depositDate: val,
        dp_deposit_date: val,
        date_depot_dp: val,
        dpDepositDate: val,
        dateDepotDP: val,
        depositDateFormatted: val ? formatToFrenchDate(val) : '',
        deadline: tl?.legalDueDateIso || '',
        dp_deadline: tl?.legalDueDateIso || '',
        lastIntervention: val ? formatToFrenchDate(val) : '',
      });
    }
  };

  const handleRegimeChange = (val) => {
    setRegime(val);
    const isComp = val === 'pieces_complementaires';
    setHasComplement(isComp);
    const tl = calculateDpTimeline({
      depositDate,
      regime: val,
      hasComplement: isComp,
      complementDate: isComp ? complementDate : null,
      displayDate,
    });
    if (onUpdateStep) {
      onUpdateStep({
        regime: val,
        hasComplement: isComp,
        deadline: tl?.legalDueDateIso || '',
      });
    }
  };

  const handleComplementDateChange = (val) => {
    setComplementDate(val);
    const tl = calculateDpTimeline({
      depositDate,
      regime,
      hasComplement: true,
      complementDate: val,
      displayDate,
    });
    if (onUpdateStep) {
      onUpdateStep({
        complementDate: val,
        deadline: tl?.legalDueDateIso || '',
      });
    }
  };

  const handleDisplayDateChange = (val) => {
    setDisplayDate(val);
    if (onUpdateStep) {
      onUpdateStep({
        displayDate: val,
        dp_display_date: val,
        date_constat_huissier: val,
      });
    }
  };

  const triggerRequestCertificate = () => {
    const payload = {
      project,
      timeline,
      mairieInfo: mairieInfo || project?.dp_mairie_info || null,
    };
    if (onRequestCertificate) {
      if (onRequestCertificate.length > 1) {
        onRequestCertificate(project, timeline, mairieInfo || project?.dp_mairie_info || null);
      } else {
        onRequestCertificate(payload);
      }
    }
  };

  const isTacitAcquired = timeline?.status === 'accord_tacite';
  const isCertified = timeline?.status === 'certificat_obtenu';

  return (
    <div className={`bg-white rounded-2xl p-4 border transition-all shadow-2xs relative overflow-hidden flex flex-col justify-between ${
      isCertified
        ? 'border-emerald-300 bg-emerald-50/15'
        : isTacitAcquired
          ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/20'
          : timeline?.isOverdue
            ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20'
            : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Barre supérieure couleur statut */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
        isCertified ? 'bg-blue-600' : isTacitAcquired ? 'bg-emerald-500' : 'bg-purple-600'
      }`} />

      <div className="space-y-3.5 pt-0.5">
        {/* Header Carte */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-purple-500 text-purple-600 bg-purple-50 border">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-sm text-slate-900 leading-tight truncate">
                  Déclaration Préalable (DP)
                </h4>
                {isTacitAcquired && (
                  <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-emerald-500 text-white uppercase tracking-wider animate-pulse">
                    Accord tacite
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                Suivi légal temps réel &bull; Art. R.423-23 &amp; R.424-13
              </p>
            </div>
          </div>

          {/* Statut Selector */}
          <div className="relative shrink-0">
            <select
              value={stepState?.status || 'pending'}
              onChange={(e) => onUpdateStep && onUpdateStep({ status: e.target.value })}
              className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer appearance-none border-none outline-none shadow-2xs transition-all ${
                stepState?.status === 'validated'
                  ? 'bg-emerald-600 text-white'
                  : isTacitAcquired
                    ? 'bg-emerald-500 text-white'
                    : stepState?.status === 'in_progress'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-400 text-white'
              }`}
            >
              <option value="pending" className="bg-slate-700 text-white font-bold">En attente</option>
              <option value="in_progress" className="bg-amber-600 text-white font-bold">En cours</option>
              <option value="validated" className="bg-emerald-600 text-white font-bold">Validée / Accord obtenu ✓</option>
              <option value="ns" className="bg-slate-500 text-white font-bold">NS</option>
            </select>
          </div>
        </div>

        {/* ═══ 1. SAISIE N° DP & RÉGIME D'INSTRUCTION ═════════════════ */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
          
          {/* Ligne 1 : Numéro officiel DP + Recherche/Sync */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10.5px] font-bold text-slate-600 flex items-center gap-1">
                <FileText className="w-3 h-3 text-indigo-600" />
                Numéro officiel DP :
              </label>
              {mairieInfo?.nomMairie && (
                <span className="text-[9.5px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 truncate max-w-[150px]">
                  🏛️ {mairieInfo.nomMairie}
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={dpNumber}
                onChange={(e) => handleDpNumberChange(e.target.value)}
                placeholder="ex : DP 024 253 26 00012 ou DP0871262600074"
                className="flex-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-sans outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleSearchAndSync}
                disabled={isSearching || !dpNumber}
                title="Rechercher et synchroniser dans SITADEL, Web & Mairie"
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Sparkles className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`} />
                <span>{isSearching ? '...' : 'Sync'}</span>
              </button>

              <label 
                title="Importer un récépissé de dépôt ou courrier mairie (PDF ou image)"
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-[10.5px] font-bold flex items-center gap-1 border border-slate-200 shadow-2xs transition-all cursor-pointer shrink-0"
              >
                <Paperclip className={`w-3 h-3 ${isReadingReceipt ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span>{isReadingReceipt ? 'Lecture...' : '📎 Lire Récépissé'}</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={handleImportReceipt}
                  disabled={isReadingReceipt}
                />
              </label>
            </div>
          </div>

          {/* Ligne 2 : Date de dépôt & Régime de délai */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                Date de dépôt / Récépissé :
              </label>
              <input
                type="date"
                value={depositDate}
                onChange={(e) => handleDepositDateChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                Régime d'instruction :
              </label>
              <select
                value={regime}
                onChange={(e) => handleRegimeChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="1_mois">1 mois (Droit commun)</option>
                <option value="2_mois">2 mois (Secteur ABF)</option>
                <option value="pieces_complementaires">Demande de pièces reçue</option>
              </select>
            </div>
          </div>

          {/* Ligne Conditionnelle : Date de dépôt des pièces complémentaires */}
          {hasComplement && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-50/80 p-2.5 rounded-lg border border-amber-200 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold text-amber-900 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Date de dépôt des pièces complémentaires :
                </span>
                <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-1 py-0.5 rounded">
                  Repart à 0 (R.423-39)
                </span>
              </div>
              <input
                type="date"
                value={complementDate}
                onChange={(e) => handleComplementDateChange(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-lg px-2 py-0.5 text-xs font-bold text-amber-900 outline-none"
              />
              <p className="text-[9.5px] text-amber-700 leading-tight">
                Le délai d'instruction complet court à nouveau à compter de cette date.
              </p>
            </motion.div>
          )}

          {/* Auto-décodage Mairie avec coordonnées */}
          {mairieInfo && (
            <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-950 flex items-center gap-1">
                  <Building className="w-3 h-3 text-indigo-600" />
                  {mairieInfo.nomMairie} ({mairieInfo.codePostal})
                </span>
                <button
                  type="button"
                  onClick={() => detectAndFetchMairie(dpNumber, true)}
                  className="text-[9.5px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                  title="Actualiser les coordonnées de la mairie"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${loadingMairie ? 'animate-spin' : ''}`} /> Actualiser
                </button>
              </div>

              <div className="text-[10px] text-slate-600 space-y-0.5">
                {mairieInfo.adresseLigne && (
                  <div className="flex items-center gap-1 truncate text-slate-500">
                    <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="truncate">{mairieInfo.adresseLigne}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[9.5px] pt-0.5 border-t border-indigo-100/60">
                  {mairieInfo.telephone ? (
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                      <Phone className="w-2.5 h-2.5 text-slate-400" /> {mairieInfo.telephone}
                    </span>
                  ) : <span />}
                  {mairieInfo.email ? (
                    <span className="flex items-center gap-1 text-blue-700 font-bold truncate max-w-[170px]" title={mairieInfo.email}>
                      <Mail className="w-2.5 h-2.5 text-blue-500" /> {mairieInfo.email}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Email non répertorié</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ 2. MOTEUR DE SUIVI TEMPS RÉEL & BARRE DE PROGRESSION ═══ */}
        {timeline?.isValid && (
          <div className="space-y-2">
            {/* ÉTAT 2 : DÉLAI DÉPASSÉ — ACCORD TACITE ACQUIS */}
            {isTacitAcquired ? (
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-md space-y-2 border border-emerald-400"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0 mt-0.5 animate-bounce" />
                  <div className="text-xs leading-tight">
                    <div className="font-black text-white text-[12px] flex items-center gap-1">
                      ✅ ACCORD TACITE ACQUIS (Art. R.424-13)
                    </div>
                    <p className="text-emerald-100 text-[10.5px] mt-0.5">
                      Délai expiré le <strong>{timeline.legalDueDateFormatted}</strong> sans opposition. Le certificat doit être délivré sur simple demande.
                    </p>
                  </div>
                </div>

                {/* Dates Post-Accord (Retrait & Purge recours) */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-emerald-400/50 text-[10px]">
                  <div className="bg-emerald-700/40 p-1.5 rounded-lg">
                    <span className="text-emerald-200 block text-[9px] font-bold">Retrait administratif (3 mois) :</span>
                    <strong className="text-white text-[10.5px]">{timeline.retraitAdminDeadlineFormatted || '—'}</strong>
                  </div>

                  <div className="bg-emerald-700/40 p-1.5 rounded-lg">
                    <span className="text-emerald-200 block text-[9px] font-bold">Purge recours tiers (2 mois) :</span>
                    {timeline.recoursTiersDeadlineFormatted ? (
                      <strong className="text-white text-[10.5px]">{timeline.recoursTiersDeadlineFormatted}</strong>
                    ) : (
                      <span className="text-emerald-200/80 italic text-[9.5px]">En attente constat huissier</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : isCertified ? (
              /* Certificat officiel déjà obtenu */
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Certificat de non-opposition officiel délivré
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  Dossier Régularisé
                </span>
              </div>
            ) : (
              /* ÉTAT 1 : EN COURS D'INSTRUCTION */
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    En cours d'instruction :
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                    J-{timeline.daysRemaining} avant accord tacite
                  </span>
                </div>

                {/* Barre de progression visuelle */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9.5px] font-bold text-slate-400">
                    <span>Dépôt : {timeline.effectiveStartDateFormatted}</span>
                    <span>Échéance : {timeline.legalDueDateFormatted}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${timeline.progressPercent}%` }} 
                    />
                  </div>
                </div>

                {/* Alerte 1er mois pour pièces manquantes ou majoration ABF */}
                {timeline.isFirstMonthActive && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 flex items-start gap-1.5">
                    <Info className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Période critique :</strong> La mairie dispose jusqu'au <strong>{timeline.firstMonthEndFormatted}</strong> pour notifier une majoration ABF (+1 mois) ou des pièces manquantes.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ═══ 3. ACTIONS DE LA CARTE ═════════════════════════════════ */}
      <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex flex-col gap-2">
        {/* Bouton d'action principale : Réclamer certificat si accord tacite ou à tout moment */}
        <button
          type="button"
          onClick={triggerRequestCertificate}
          className={`w-full py-2.5 px-3 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
            isTacitAcquired
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white ring-2 ring-emerald-400 shadow-md animate-pulse'
              : 'bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isTacitAcquired ? "📜 Demander le Certificat d'Accord Tacite" : "📜 Éditer Demande de Certificat Tacite"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Bouton secondaire : Ouvrir le Wizard de génération du dossier DP */}
        <button
          type="button"
          onClick={() => onOpenUrbanismeWizard && onOpenUrbanismeWizard('dp')}
          className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Générer le dossier DP complet (Cerfa + Plans)</span>
        </button>
      </div>
    </div>
  );
}
