import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Building2,
  User,
  MapPin,
  CheckCircle2,
  Sparkles,
  Upload,
  Save,
  Eye,
  ClipboardPaste
} from 'lucide-react';
import {
  extractDefaultPromesseFaradayData,
  fetchParcelFromGps,
  fetchParcelSurfaceByReference,
  generatePromesseBailFaradayDocx,
  prepareAnnexe2PlanImageWithCartouche,
  parseSurfaceM2,
  m2ToHectaresString,
  guessCiviliteFromFirstName,
  DEFAULT_BENEFICIAIRE_TEXT
} from '@/services/promesseBailFaradayService.js';
import { apiService } from '@/services/api';

export default function PromesseBailFaradayModal({
  isOpen,
  onClose,
  project,
  onUpdateProject
}) {
  const [formData, setFormData] = useState(() => extractDefaultPromesseFaradayData(project || {}));
  const [loadingCadastre, setLoadingCadastre] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [previewCartoucheUrl, setPreviewCartoucheUrl] = useState('');
  const [autoCalcHa, setAutoCalcHa] = useState(true);

  // Réinitialise les données à l'ouverture de la modale ou au changement de projet
  useEffect(() => {
    if (isOpen && project) {
      const initial = extractDefaultPromesseFaradayData(project);
      setFormData(initial);
      setStatusMessage(null);

      // Si aucune surface ou parcelle n'est renseignée mais qu'on a le GPS, on lance une récupération automatique silencieuse
      const firstP = initial.parcelles?.[0];
      if (
        initial.lat &&
        initial.lng &&
        (!firstP?.section || !firstP?.numero || !parseSurfaceM2(firstP?.surfaceM2))
      ) {
        handleAutoFetchCadastre(initial, true);
      }
    }
  }, [isOpen, project?.id]);

  // Calcul automatique de la surface totale en m² et ha à partir du tableau des parcelles
  const totalSurfaceM2 = useMemo(() => {
    if (!Array.isArray(formData.parcelles)) return 0;
    return formData.parcelles.reduce((acc, p) => acc + parseSurfaceM2(p.surfaceM2), 0);
  }, [formData.parcelles]);

  useEffect(() => {
    if (autoCalcHa && totalSurfaceM2 > 0) {
      const computedHa = m2ToHectaresString(totalSurfaceM2);
      setFormData((prev) =>
        prev.superficieTotaleHa === computedHa ? prev : { ...prev, superficieTotaleHa: computedHa }
      );
    }
  }, [totalSurfaceM2, autoCalcHa]);

  // Aperçu en temps réel du plan Annexe 2 avec le cartouche en bas à gauche
  const firstParcel = formData.parcelles?.[0] || {};
  useEffect(() => {
    let active = true;
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      if (formData.planImageUrl === '__NONE__' || (!formData.planImageUrl && (!formData.lat || !formData.lng))) {
        if (active) setPreviewCartoucheUrl('');
        return;
      }
      try {
        const res = await prepareAnnexe2PlanImageWithCartouche(formData.planImageUrl, {
          lat: formData.lat,
          lng: formData.lng,
          addressLine1: firstParcel.adresse || formData.commune || '',
          addressLine2: `${formData.codePostal || ''} ${formData.commune || ''}`.trim(),
          altitude: formData.cartoucheAltitude || '125.0 m',
          surfaceM2: firstParcel.surfaceM2 || '',
          section: firstParcel.section || '',
          numero: firstParcel.numero || '',
          zoning: formData.cartoucheZonage || 'N / PLUi',
          stampCartouche: false
        });
        if (active && res?.dataUrl) {
          setPreviewCartoucheUrl(res.dataUrl);
        }
      } catch (_) {}
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    isOpen,
    formData.planImageUrl,
    formData.lat,
    formData.lng,
    formData.commune,
    formData.codePostal,
    formData.cartoucheAltitude,
    formData.cartoucheZonage,
    formData.stampCartoucheSurface,
    firstParcel.section,
    firstParcel.numero,
    firstParcel.surfaceM2,
    firstParcel.adresse
  ]);

  if (!isOpen) return null;

  // Récupération automatique IGN Cadastre (par GPS ou par référence Commune/Section/Numéro)
  const handleAutoFetchCadastre = async (currentState = formData, silent = false) => {
    setLoadingCadastre(true);
    if (!silent) setStatusMessage(null);
    try {
      let cadastreInfo = null;
      const p0 = currentState.parcelles?.[0] || {};

      // 1. Si Section + Numéro déjà saisis, priorité à la recherche exacte de la contenance de cette parcelle
      if (p0.section && p0.numero && (currentState.codePostal || currentState.commune)) {
        cadastreInfo = await fetchParcelSurfaceByReference({
          codePostal: currentState.codePostal,
          commune: currentState.commune,
          section: p0.section,
          numero: p0.numero
        });
      }

      // 2. Sinon recherche par coordonnées GPS du projet
      if (!cadastreInfo && currentState.lat && currentState.lng) {
        cadastreInfo = await fetchParcelFromGps(currentState.lat, currentState.lng);
      }

      if (cadastreInfo) {
        setFormData((prev) => {
          const updatedParcelles = [...(prev.parcelles || [])];
          const first = updatedParcelles[0] || {
            prefixe: '000',
            section: '',
            numero: '',
            adresse: '',
            surfaceM2: ''
          };
          updatedParcelles[0] = {
            ...first,
            prefixe: cadastreInfo.prefixe || first.prefixe || '000',
            section: cadastreInfo.section || first.section || '',
            numero: cadastreInfo.numero || first.numero || '',
            surfaceM2: cadastreInfo.surfaceM2 || first.surfaceM2 || '',
            adresse:
              first.adresse ||
              `${prev.codePostal || ''} ${cadastreInfo.commune || prev.commune || ''}`.trim()
          };
          const newTotalM2 = updatedParcelles.reduce(
            (acc, item) => acc + parseSurfaceM2(item.surfaceM2),
            0
          );
          return {
            ...prev,
            commune: prev.commune || cadastreInfo.commune || '',
            parcelles: updatedParcelles,
            superficieTotaleHa:
              newTotalM2 > 0 ? m2ToHectaresString(newTotalM2) : prev.superficieTotaleHa
          };
        });
        if (!silent) {
          setStatusMessage({
            type: 'success',
            text: `Cadastre IGN récupéré : Parcelle ${cadastreInfo.section} ${cadastreInfo.numero} — Surface : ${Number(cadastreInfo.surfaceM2 || 0).toLocaleString('fr-FR')} m²`
          });
        }
      } else if (!silent) {
        setStatusMessage({
          type: 'warning',
          text: "Aucune parcelle IGN trouvée automatiquement. Vérifiez les coordonnées GPS ou saisissez la section, le numéro et la surface."
        });
      }
    } catch (err) {
      if (!silent) {
        setStatusMessage({
          type: 'warning',
          text: 'Impossible de joindre le service cadastre IGN pour le moment.'
        });
      }
    } finally {
      setLoadingCadastre(false);
    }
  };

  // Recherche IGN ciblée sur une ligne du tableau de l'Article 4
  const handleFetchRowSurface = async (index) => {
    const row = formData.parcelles?.[index];
    if (!row || !row.section || !row.numero) {
      setStatusMessage({
        type: 'warning',
        text: 'Renseignez la Section et le Numéro de parcelle avant de lancer la recherche IGN.'
      });
      return;
    }
    setLoadingCadastre(true);
    try {
      const info = await fetchParcelSurfaceByReference({
        codePostal: formData.codePostal,
        commune: formData.commune,
        section: row.section,
        numero: row.numero
      });
      if (info && info.surfaceM2) {
        updateParcelle(index, 'surfaceM2', info.surfaceM2);
        if (info.prefixe) updateParcelle(index, 'prefixe', info.prefixe);
        setStatusMessage({
          type: 'success',
          text: `Surface cadastrale IGN trouvée pour ${info.section} ${info.numero} : ${Number(info.surfaceM2).toLocaleString('fr-FR')} m²`
        });
      } else {
        setStatusMessage({
          type: 'warning',
          text: `Surface non trouvée sur IGN pour la parcelle ${row.section} ${row.numero}. Vous pouvez la saisir manuellement.`
        });
      }
    } finally {
      setLoadingCadastre(false);
    }
  };

  // Gestion des signataires (Personnes physiques / Indivision)
  const updateSignataire = (index, field, value) => {
    setFormData((prev) => {
      const list = [...(prev.signataires || [])];
      const current = list[index] || {};
      const next = { ...current, [field]: value };
      if (field === 'civilite') {
        next.civiliteManual = true;
      } else if (field === 'prenom' && !current.civiliteManual && value.trim()) {
        next.civilite = guessCiviliteFromFirstName(value);
      }
      list[index] = next;
      return { ...prev, signataires: list };
    });
  };

  const addSignataire = () => {
    setFormData((prev) => ({
      ...prev,
      signataires: [
        ...(prev.signataires || []),
        {
          civilite: 'Madame',
          prenom: '',
          nom: prev.signataires?.[0]?.nom || '',
          nomCompletOrdre: prev.signataires?.[0]?.nomCompletOrdre || 'nom_prenom',
          adresse: prev.signataires?.[0]?.adresse || '',
          lieuNaissance: '',
          dateNaissance: '',
          nationalite: 'française'
        }
      ]
    }));
  };

  const removeSignataire = (index) => {
    setFormData((prev) => {
      if ((prev.signataires || []).length <= 1) return prev;
      return {
        ...prev,
        signataires: prev.signataires.filter((_, idx) => idx !== index)
      };
    });
  };

  // Gestion des données Société
  const updateSociete = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      societe: { ...(prev.societe || {}), [field]: value }
    }));
  };

  // Gestion des représentants légaux de la société
  const getRepresentantsList = (soc = {}) => (
    Array.isArray(soc.representants) && soc.representants.length > 0
      ? soc.representants
      : [{
          civilite: soc.repCivilite || 'Monsieur',
          prenom: soc.repPrenom || '',
          nom: soc.repNom || '',
          adresse: soc.repAdresse || '',
          lieuNaissance: soc.repLieuNaissance || '',
          dateNaissance: soc.repDateNaissance || '',
          nationalite: soc.repNationalite || 'française'
        }]
  );

  const updateRepresentant = (index, field, value) => {
    setFormData((prev) => {
      const soc = prev.societe || {};
      const list = [...getRepresentantsList(soc)];
      const current = list[index] || {};
      const next = { ...current, [field]: value };
      if (field === 'civilite') {
        next.civiliteManual = true;
      } else if (field === 'prenom' && !current.civiliteManual && value.trim()) {
        next.civilite = guessCiviliteFromFirstName(value);
      }
      list[index] = next;
      const first = list[0] || {};
      return {
        ...prev,
        societe: {
          ...soc,
          representants: list,
          repCivilite: first.civilite || 'Monsieur',
          repPrenom: first.prenom || '',
          repNom: first.nom || '',
          repAdresse: first.adresse || '',
          repLieuNaissance: first.lieuNaissance || '',
          repDateNaissance: first.dateNaissance || '',
          repNationalite: first.nationalite || 'française'
        }
      };
    });
  };

  const addRepresentant = () => {
    setFormData((prev) => {
      const soc = prev.societe || {};
      const currentList = getRepresentantsList(soc);
      return {
        ...prev,
        societe: {
          ...soc,
          representants: [
            ...currentList,
            {
              civilite: 'Monsieur',
              prenom: '',
              nom: '',
              adresse: soc.siegeSocial || currentList[0]?.adresse || '',
              lieuNaissance: '',
              dateNaissance: '',
              nationalite: 'française'
            }
          ]
        }
      };
    });
  };

  const removeRepresentant = (index) => {
    setFormData((prev) => {
      const soc = prev.societe || {};
      const list = getRepresentantsList(soc);
      if (list.length <= 1) return prev;
      const nextList = list.filter((_, idx) => idx !== index);
      const first = nextList[0] || {};
      return {
        ...prev,
        societe: {
          ...soc,
          representants: nextList,
          repCivilite: first.civilite || 'Monsieur',
          repPrenom: first.prenom || '',
          repNom: first.nom || '',
          repAdresse: first.adresse || '',
          repLieuNaissance: first.lieuNaissance || '',
          repDateNaissance: first.dateNaissance || '',
          repNationalite: first.nationalite || 'française'
        }
      };
    });
  };

  // Gestion des parcelles (Article 4)
  const updateParcelle = (index, field, value) => {
    setFormData((prev) => {
      const list = [...(prev.parcelles || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, parcelles: list };
    });
  };

  const addParcelle = () => {
    setFormData((prev) => ({
      ...prev,
      parcelles: [
        ...(prev.parcelles || []),
        {
          prefixe: '000',
          section: prev.parcelles?.[0]?.section || '',
          numero: '',
          adresse: prev.parcelles?.[0]?.adresse || `${prev.codePostal || ''} ${prev.commune || ''}`.trim(),
          surfaceM2: ''
        }
      ]
    }));
  };

  const removeParcelle = (index) => {
    setFormData((prev) => {
      if ((prev.parcelles || []).length <= 1) return prev;
      return {
        ...prev,
        parcelles: prev.parcelles.filter((_, idx) => idx !== index)
      };
    });
  };

  const readFileAsPlanImage = (file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, planImageUrl: reader.result }));
        setStatusMessage({
          type: 'success',
          text: 'Plan d’implantation chargé pour l’Annexe 2.'
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload d'une image personnalisée pour le plan Annexe 2
  const handleUploadPlanImage = (e) => {
    const file = e.target.files?.[0];
    if (file) readFileAsPlanImage(file);
  };

  // Coller une image depuis le presse-papiers (Ctrl+V dans la zone dédiée)
  const handlePastePlanImage = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) readFileAsPlanImage(blob);
        return;
      }
    }
  };

  // Glisser-déposer d'une image dans la zone dédiée
  const handleDropPlanImage = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) readFileAsPlanImage(file);
  };

  // Bouton Coller via l'API Clipboard du navigateur
  const handleClipboardButtonPaste = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setStatusMessage({
          type: 'warning',
          text: 'Cliquez dans la zone ci-dessous et faites Ctrl+V pour coller votre image.'
        });
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          readFileAsPlanImage(blob);
          return;
        }
      }
      setStatusMessage({
        type: 'warning',
        text: 'Aucune image détectée dans le presse-papiers. Copiez une image puis réessayez (ou Ctrl+V dans la zone).'
      });
    } catch (_) {
      setStatusMessage({
        type: 'warning',
        text: 'Cliquez dans la zone de collage ci-dessous puis appuyez sur Ctrl+V.'
      });
    }
  };

  // Sauvegarde des données de la promesse sur la fiche projet NELSON
  const persistToProject = async (silent = false) => {
    const p0 = formData.parcelles?.[0] || {};
    const surfM2 = parseSurfaceM2(p0.surfaceM2);
    const updatedFields = {
      faradayPromesseData: {
        ...formData,
        availableCaptures: undefined // évite de dupliquer le tableau de captures
      },
      cadastre_prefixe: p0.prefixe || '000',
      cadastre_section: p0.section || project?.cadastre_section || '',
      cadastre_numero: p0.numero || project?.cadastre_numero || '',
      cadastre_surface: surfM2 > 0 ? surfM2 : project?.cadastre_surface || '',
      city: formData.commune || project?.city || '',
      zip: formData.codePostal || project?.zip || ''
    };

    if (typeof onUpdateProject === 'function') {
      onUpdateProject(updatedFields);
    }

    if (project?.id && project.id !== 'new') {
      try {
        setSavingProject(true);
        await apiService.updateProject(project.id, {
          ...project,
          ...updatedFields
        });
        if (!silent) {
          setStatusMessage({
            type: 'success',
            text: 'Données de la Promesse FARADAY sauvegardées sur la fiche projet.'
          });
        }
      } catch (err) {
        console.warn('[PromesseBailFaradayModal] Erreur sauvegarde API projet:', err);
      } finally {
        setSavingProject(false);
      }
    } else if (!silent) {
      setStatusMessage({
        type: 'success',
        text: 'Données appliquées à la fiche projet en cours.'
      });
    }
  };

  // Génération et téléchargement du fichier Word (.docx)
  const handleGenerateDocx = async () => {
    setGeneratingDocx(true);
    setStatusMessage(null);
    try {
      await persistToProject(true);
      const result = await generatePromesseBailFaradayDocx(formData, { download: true });
      const generatedName = result?.filename || result?.fileName || '';
      setStatusMessage({
        type: 'success',
        text: generatedName
          ? `Document Word généré avec succès : ${generatedName} (100 % modifiable dans Word et LibreOffice).`
          : 'Document Word généré avec succès (100 % modifiable dans Word et LibreOffice).'
      });
    } catch (err) {
      console.error('[PromesseBailFaradayModal] Erreur génération DOCX:', err);
      setStatusMessage({
        type: 'error',
        text: `Erreur lors de la génération du fichier Word : ${err.message || 'Erreur inconnue'}`
      });
    } finally {
      setGeneratingDocx(false);
    }
  };

  // Formatage visuel de la surface et du numéro de parcelle pour l'aperçu du cadre en bas à gauche
  const formattedPreviewSurface = parseSurfaceM2(firstParcel.surfaceM2) > 0
    ? `${parseSurfaceM2(firstParcel.surfaceM2).toLocaleString('fr-FR')} m²`
    : (firstParcel.surfaceM2 ? `${firstParcel.surfaceM2} m²` : 'Surface m²');

  const formattedPreviewSection = firstParcel.section
    ? (firstParcel.section.length === 1 ? `0${firstParcel.section.toUpperCase()}` : firstParcel.section.toUpperCase())
    : 'ZP';
  const formattedPreviewNumero = firstParcel.numero
    ? String(firstParcel.numero).padStart(4, '0')
    : '0210';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* EN-TÊTE DE LA MODALE */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base md:text-lg font-bold tracking-tight">
                  Promesse de Bail Emphytéotique Batterie — Portefeuille FARADAY
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Word .DOCX 100 % Modifiable
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Modèle officiel V062026 • Pré-remplissage automatique (Promettant, Cadastre, Surface en bas à gauche à gauche du n° de parcelle, Article 4 & Annexe 2)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BANNIÈRE DE STATUT */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              ×
            </button>
          </div>
        )}

        {/* CORPS DE LA MODALE */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/60">
          {/* 1. IDENTITÉ DU / DES PROMETTANT(S) (BAILLEUR) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  1. Identité du / des Promettant(s) (« Le Bailleur » — Page 1)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Personne physique seule (ex: LINDMANN, HAUTHIER), Indivision / Co-propriétaires séparés par « Et » (ex: MICHAUD) ou Société / GFA / SCI (ex: ROBY / GFA DE FRUCHAUDIERE)
                </p>
              </div>

              {/* Sélecteur Personne physique vs Société */}
              <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 self-start">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, bailleurType: 'personne_physique' }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                    formData.bailleurType !== 'societe'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Personne physique / Indivision
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, bailleurType: 'societe' }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                    formData.bailleurType === 'societe'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Société (GFA, SCI, EARL, SAS...)
                </button>
              </div>
            </div>

            {formData.bailleurType !== 'societe' ? (
              <div className="space-y-4">
                {(formData.signataires || []).map((sig, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                        {idx === 0 ? 'Promettant principal' : `Co-Promettant #${idx + 1} (précédé de « Et »)`}
                      </span>
                      {(formData.signataires || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSignataire(idx)}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Supprimer
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Civilité</label>
                        <select
                          value={sig.civilite === 'Monsieur et Madame' ? 'Monsieur' : (sig.civilite || 'Monsieur')}
                          onChange={(e) => updateSignataire(idx, 'civilite', e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="Monsieur">Monsieur</option>
                          <option value="Madame">Madame</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom</label>
                        <input
                          type="text"
                          value={sig.nom || ''}
                          onChange={(e) => updateSignataire(idx, 'nom', e.target.value)}
                          placeholder="Ex: LINDMANN"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Prénom(s)</label>
                        <input
                          type="text"
                          value={sig.prenom || ''}
                          onChange={(e) => updateSignataire(idx, 'prenom', e.target.value)}
                          placeholder="Ex: Jean-Noel"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nationalité</label>
                        <input
                          type="text"
                          value={sig.nationalite || 'française'}
                          onChange={(e) => updateSignataire(idx, 'nationalite', e.target.value)}
                          placeholder="française"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Né(e) à (Lieu de naissance)
                        </label>
                        <input
                          type="text"
                          value={sig.lieuNaissance || ''}
                          onChange={(e) => updateSignataire(idx, 'lieuNaissance', e.target.value)}
                          placeholder="Ex: BERGERAC (24100)"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Adresse complète du Promettant
                        </label>
                        <input
                          type="text"
                          value={sig.adresse || ''}
                          onChange={(e) => updateSignataire(idx, 'adresse', e.target.value)}
                          placeholder="Ex: 4102 Route du Couzeau 24560 MONTAUT"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Le (Date de naissance)
                        </label>
                        <input
                          type="text"
                          value={sig.dateNaissance || ''}
                          onChange={(e) => updateSignataire(idx, 'dateNaissance', e.target.value)}
                          placeholder="Ex: 08/12/1951"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addSignataire}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un co-signataire
                </button>
              </div>
            ) : (
              /* MODE SOCIÉTÉ / PERSONNE MORALE */
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Dénomination sociale (La société...)
                    </label>
                    <input
                      type="text"
                      value={formData.societe?.denomination || ''}
                      onChange={(e) => updateSociete('denomination', e.target.value)}
                      placeholder="Ex: GFA DE FRUCHAUDIERE"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Capital social (€)
                    </label>
                    <input
                      type="text"
                      value={formData.societe?.capital || ''}
                      onChange={(e) => updateSociete('capital', e.target.value)}
                      placeholder="Ex: 231 539,57"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Numéro RCS / SIREN
                    </label>
                    <input
                      type="text"
                      value={formData.societe?.siren || ''}
                      onChange={(e) => updateSociete('siren', e.target.value)}
                      placeholder="Ex: 399 441 682"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Ville du Greffe RCS
                    </label>
                    <input
                      type="text"
                      value={formData.societe?.rcsVille || ''}
                      onChange={(e) => updateSociete('rcsVille', e.target.value)}
                      placeholder="Ex: PERIGUEUX"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Adresse du siège social
                    </label>
                    <input
                      type="text"
                      value={formData.societe?.siegeSocial || ''}
                      onChange={(e) => updateSociete('siegeSocial', e.target.value)}
                      placeholder="Ex: Fruchaudiere 24300 LA CHAPELLE-MONTMOREAU"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <span className="block text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    Représentant(s) légal(aux) de la société
                  </span>

                  {getRepresentantsList(formData.societe).map((rep, idx, arr) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                          {idx === 0
                            ? 'Représentant légal principal'
                            : `Co-représentant légal #${idx + 1} (précédé de « Et par »)`}
                        </span>
                        {arr.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRepresentant(idx)}
                            className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Supprimer
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Civilité</label>
                          <select
                            value={rep.civilite || 'Monsieur'}
                            onChange={(e) => updateRepresentant(idx, 'civilite', e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="Monsieur">Monsieur</option>
                            <option value="Madame">Madame</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Prénom</label>
                          <input
                            type="text"
                            value={rep.prenom || ''}
                            onChange={(e) => updateRepresentant(idx, 'prenom', e.target.value)}
                            placeholder="Ex: Philippe"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom</label>
                          <input
                            type="text"
                            value={rep.nom || ''}
                            onChange={(e) => updateRepresentant(idx, 'nom', e.target.value)}
                            placeholder="Ex: ROBY"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Nationalité</label>
                          <input
                            type="text"
                            value={rep.nationalite || 'française'}
                            onChange={(e) => updateRepresentant(idx, 'nationalite', e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Adresse du représentant
                          </label>
                          <input
                            type="text"
                            value={rep.adresse || ''}
                            onChange={(e) => updateRepresentant(idx, 'adresse', e.target.value)}
                            placeholder="Ex: 525 Route de L'Etang 24340 MAREUIL EN PERIGORD"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Né(e) à (Lieu de naissance)
                          </label>
                          <input
                            type="text"
                            value={rep.lieuNaissance || ''}
                            onChange={(e) => updateRepresentant(idx, 'lieuNaissance', e.target.value)}
                            placeholder="Ex: PERIGUEUX (24000)"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Le (Date de naissance)
                          </label>
                          <input
                            type="text"
                            value={rep.dateNaissance || ''}
                            onChange={(e) => updateRepresentant(idx, 'dateNaissance', e.target.value)}
                            placeholder="Ex: 11/10/1964"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addRepresentant}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter un représentant légal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. DÉSIGNATION DU SITE & TABLEAU CADASTRAL (PRÉAMBULE & ARTICLE 4) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  2. Désignation du Site & Parcelles Cadastrales (Préambule & Article 4)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Remplit automatiquement le Préambule (superficie en hectares, commune, CP) et le tableau cadastral de l'Article 4 (Page 6)
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAutoFetchCadastre(formData, false)}
                disabled={loadingCadastre}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors self-start disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCadastre ? 'animate-spin' : ''}`} />
                {loadingCadastre ? 'Interrogation IGN...' : 'Récupérer Cadastre & Surface IGN'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Commune du site (MAJUSCULES)
                </label>
                <input
                  type="text"
                  value={formData.commune || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, commune: e.target.value.toUpperCase() }))}
                  placeholder="Ex: SAINT-SAVIN / MONTAUT"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Code Postal
                </label>
                <input
                  type="text"
                  value={formData.codePostal || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, codePostal: e.target.value }))}
                  placeholder="Ex: 33920"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Superficie totale (en Ha)
                  </label>
                  <label className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCalcHa}
                      onChange={(e) => setAutoCalcHa(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    Auto (m² → ha)
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.superficieTotaleHa || ''}
                    onChange={(e) => {
                      setAutoCalcHa(false);
                      setFormData((prev) => ({ ...prev, superficieTotaleHa: e.target.value }));
                    }}
                    placeholder="Ex: 1.95"
                    className="w-full px-3 py-2 pr-10 text-xs border border-slate-300 rounded-lg bg-white font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ha
                  </span>
                </div>
              </div>
            </div>

            {/* Tableau Article 4 */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-200/80 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-2.5 px-3 border-r border-slate-300 w-24 text-center">PRÉFIXE</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-28 text-center">SECTION</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-32 text-center">NUMÉRO</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">ADRESSE / LIEU-DIT</th>
                    <th className="py-2.5 px-3 w-48 text-center">
                      SURFACE CADASTRALE (m²)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(formData.parcelles || []).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={p.prefixe || ''}
                          onChange={(e) => updateParcelle(idx, 'prefixe', e.target.value)}
                          placeholder="000"
                          className="w-full px-2 py-1.5 text-xs text-center border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={p.section || ''}
                          onChange={(e) => updateParcelle(idx, 'section', e.target.value.toUpperCase())}
                          placeholder="Ex: ZP"
                          className="w-full px-2 py-1.5 text-xs text-center font-bold border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={p.numero || ''}
                          onChange={(e) => updateParcelle(idx, 'numero', e.target.value)}
                          placeholder="Ex: 0210"
                          className="w-full px-2 py-1.5 text-xs text-center font-bold border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={p.adresse || ''}
                          onChange={(e) => updateParcelle(idx, 'adresse', e.target.value.toUpperCase())}
                          placeholder="Ex: 15 BARRE 33920 SAINT-SAVIN"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={p.surfaceM2 || ''}
                            onChange={(e) => updateParcelle(idx, 'surfaceM2', e.target.value)}
                            placeholder="Ex: 19491"
                            className="w-full px-2.5 py-1.5 text-xs text-center font-bold text-emerald-700 bg-emerald-50/50 border border-emerald-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleFetchRowSurface(idx)}
                            title="Rechercher la surface IGN de cette parcelle"
                            className="p-1.5 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors shrink-0"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <button
                type="button"
                onClick={addParcelle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter une parcelle au tableau de l'Article 4
              </button>

              <div className="text-xs text-slate-600 font-medium">
                Surface cadastrale totale :{' '}
                <span className="font-bold text-slate-900">
                  {totalSurfaceM2.toLocaleString('fr-FR')} m²
                </span>{' '}
                soit{' '}
                <span className="font-bold text-indigo-700">
                  {formData.superficieTotaleHa || '0.00'} ha
                </span>
              </div>
            </div>
          </div>

          {/* 3. PLAN D'IMPLANTATION À INJÉCTER EN ANNEXE 2 (PAGE 23) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-600" />
                  3. Plan d'implantation à insérer et centrer en Annexe 2 (Page 23)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Importez un fichier image ou collez directement une capture (Ctrl+V) dans la zone ci-dessous
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleClipboardButtonPaste}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-colors"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  Coller une image
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Importer un plan (.png/.jpg)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadPlanImage}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Zone de collage (Ctrl+V) et de glisser-déposer + aperçu centré */}
            <div
              tabIndex={0}
              onPaste={handlePastePlanImage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropPlanImage}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none rounded-xl p-4 bg-slate-50 transition-colors cursor-pointer"
              title="Cliquez ici puis faites Ctrl+V pour coller une capture d'écran, ou déposez une image"
            >
              {previewCartoucheUrl ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="group relative rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center max-h-72 border border-slate-200">
                    <img
                      src={previewCartoucheUrl}
                      alt="Aperçu du plan centré pour l'Annexe 2"
                      className="max-h-72 w-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((prev) => ({ ...prev, planImageUrl: '__NONE__' }));
                      }}
                      title="Supprimer l'image"
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Cliquez dans cette zone et appuyez sur <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold">Ctrl+V</kbd> pour remplacer par une autre image collée
                  </span>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                  <ClipboardPaste className="w-7 h-7 mx-auto text-slate-400" />
                  <p className="font-semibold text-slate-700">
                    Cliquez ici et faites <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-bold">Ctrl+V</kbd> pour coller un plan, ou glissez-déposez une image
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Vous pouvez aussi utiliser le bouton « Importer un plan (.png/.jpg) » ci-dessus. Seul ce plan sera inséré et centré en Annexe 2.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 4. CONDITIONS FINANCIÈRES (ARTICLE 9.6), BÉNÉFICIAIRE & SIGNATURES */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide pb-3 border-b border-slate-100">
              4. Conditions Essentielles du Bail (Article 9.6 — Page 15) & Bénéficiaire
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Loyer annuel HT (€ / an)
                </label>
                <input
                  type="text"
                  value={formData.loyerAnnuelHT || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, loyerAnnuelHT: e.target.value }))}
                  placeholder="2 000"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Soulte forfaitaire unique HT (€)
                </label>
                <input
                  type="text"
                  value={formData.soulteUniqueHT || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, soulteUniqueHT: e.target.value }))}
                  placeholder="20 000"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Option pré-cochée (Art. 9.6)
                </label>
                <select
                  value={formData.choixRemuneration || 'none'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, choixRemuneration: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="none">Aucune case cochée (☐ / ☐)</option>
                  <option value="loyer">Cocher Loyer annuel (☑ Loyer)</option>
                  <option value="soulte">Cocher Soulte unique (☑ Soulte)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Puissance de référence (kWc)
                </label>
                <input
                  type="text"
                  value={formData.puissanceReferenceKwc || '500'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, puissanceReferenceKwc: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Puissance réduite ÷ 2 (kWc)
                </label>
                <input
                  type="text"
                  value={formData.puissanceReduiteKwc || '250'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, puissanceReduiteKwc: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Fait à (Page 21 — laisser vide pour pointillés)
                </label>
                <input
                  type="text"
                  value={formData.faitA || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, faitA: e.target.value }))}
                  placeholder="Laisser vide pour conserver les pointillés"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Le (Date de signature — Page 21)
                </label>
                <input
                  type="text"
                  value={formData.faitLe || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, faitLe: e.target.value }))}
                  placeholder="Laisser vide pour conserver les pointillés"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Zone signature multi-signataires (Page 21) */}
            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Côté Bailleur */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-slate-700">
                    Signataires sous « Pour le Bailleur » (Page 21)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const list =
                        formData.bailleurType === 'societe'
                          ? getRepresentantsList(formData.societe).map((r) =>
                              [r.civilite || 'Monsieur', r.prenom, r.nom].filter(Boolean).join(' ').trim()
                            )
                          : (formData.signataires || []).map((s) =>
                              s.nomCompletOrdre === 'prenom_nom'
                                ? [s.civilite || 'Monsieur', s.prenom, s.nom].filter(Boolean).join(' ').trim()
                                : [s.civilite || 'Monsieur', s.nom, s.prenom].filter(Boolean).join(' ').trim()
                            );
                      const cleaned = list.filter(Boolean);
                      setFormData((prev) => ({
                        ...prev,
                        mentionsSignatairesBailleur: cleaned.length > 0 ? cleaned : [''],
                        mentionSignataireBailleur: cleaned[0] || ''
                      }));
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline shrink-0"
                    title="Remplir automatiquement avec les signataires ou représentants légaux saisis en Page 1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Reprendre Page 1
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(Array.isArray(formData.mentionsSignatairesBailleur) && formData.mentionsSignatairesBailleur.length > 0
                    ? formData.mentionsSignatairesBailleur
                    : [formData.mentionSignataireBailleur || '']
                  ).map((mention, idx, arr) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={mention}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => {
                            const current =
                              Array.isArray(prev.mentionsSignatairesBailleur) && prev.mentionsSignatairesBailleur.length > 0
                                ? [...prev.mentionsSignatairesBailleur]
                                : [prev.mentionSignataireBailleur || ''];
                            current[idx] = val;
                            return {
                              ...prev,
                              mentionsSignatairesBailleur: current,
                              mentionSignataireBailleur: current[0] || ''
                            };
                          });
                        }}
                        placeholder={
                          idx === 0
                            ? 'Optionnel (ex: Madame Catherine DESCHASEAUX)'
                            : `Signataire #${idx + 1} (ex: Madame Virginie HUGUENIN)`
                        }
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      {(arr.length > 1 || mention) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => {
                              const current =
                                Array.isArray(prev.mentionsSignatairesBailleur) && prev.mentionsSignatairesBailleur.length > 0
                                  ? [...prev.mentionsSignatairesBailleur]
                                  : [prev.mentionSignataireBailleur || ''];
                              const next = current.length > 1 ? current.filter((_, i) => i !== idx) : [''];
                              return {
                                ...prev,
                                mentionsSignatairesBailleur: next,
                                mentionSignataireBailleur: next[0] || ''
                              };
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer ce signataire"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => {
                      const current =
                        Array.isArray(prev.mentionsSignatairesBailleur) && prev.mentionsSignatairesBailleur.length > 0
                          ? prev.mentionsSignatairesBailleur
                          : [prev.mentionSignataireBailleur || ''];
                      return {
                        ...prev,
                        mentionsSignatairesBailleur: [...current, '']
                      };
                    })
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 pt-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un signataire Bailleur
                </button>
              </div>

              {/* Côté Preneur */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Signataires sous « Pour le Preneur » (Page 21)
                </label>

                <div className="space-y-1.5">
                  {(Array.isArray(formData.mentionsSignatairesPreneur) && formData.mentionsSignatairesPreneur.length > 0
                    ? formData.mentionsSignatairesPreneur
                    : ['']
                  ).map((mention, idx, arr) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={mention}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => {
                            const current =
                              Array.isArray(prev.mentionsSignatairesPreneur) && prev.mentionsSignatairesPreneur.length > 0
                                ? [...prev.mentionsSignatairesPreneur]
                                : [''];
                            current[idx] = val;
                            return { ...prev, mentionsSignatairesPreneur: current };
                          });
                        }}
                        placeholder={
                          idx === 0
                            ? 'Optionnel (ex: Monsieur Yann BARBERIS)'
                            : `Signataire Preneur #${idx + 1}`
                        }
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      {(arr.length > 1 || mention) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => {
                              const current =
                                Array.isArray(prev.mentionsSignatairesPreneur) && prev.mentionsSignatairesPreneur.length > 0
                                  ? [...prev.mentionsSignatairesPreneur]
                                  : [''];
                              const next = current.length > 1 ? current.filter((_, i) => i !== idx) : [''];
                              return { ...prev, mentionsSignatairesPreneur: next };
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer ce signataire"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => {
                      const current =
                        Array.isArray(prev.mentionsSignatairesPreneur) && prev.mentionsSignatairesPreneur.length > 0
                          ? prev.mentionsSignatairesPreneur
                          : [''];
                      return {
                        ...prev,
                        mentionsSignatairesPreneur: [...current, '']
                      };
                    })
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 pt-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un signataire Preneur
                </button>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-600">
                  Identité du Bénéficiaire / Preneur (Page 1)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, beneficiaireText: DEFAULT_BENEFICIAIRE_TEXT }))
                  }
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  Réinitialiser ENR COURTAGE par défaut
                </button>
              </div>
              <textarea
                rows={2}
                value={formData.beneficiaireText || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, beneficiaireText: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* PIED DE MODALE — ACTIONS */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            Fermer
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => persistToProject(false)}
              disabled={savingProject}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingProject ? 'Sauvegarde...' : 'Enregistrer sur le projet'}
            </button>

            <button
              type="button"
              onClick={handleGenerateDocx}
              disabled={generatingDocx}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {generatingDocx
                ? 'Génération du Word (.docx)...'
                : 'Télécharger la Promesse de Bail FARADAY (.docx)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
