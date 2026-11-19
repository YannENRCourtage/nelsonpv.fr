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
  Eye
} from 'lucide-react';
import {
  extractDefaultPromesseFaradayData,
  fetchParcelFromGps,
  fetchParcelSurfaceByReference,
  generatePromesseBailFaradayDocx,
  prepareAnnexe2PlanImageWithCartouche,
  parseSurfaceM2,
  m2ToHectaresString,
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
      if (!formData.planImageUrl && (!formData.lat || !formData.lng)) {
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
          stampCartouche: Boolean(formData.stampCartoucheSurface)
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
      list[index] = { ...list[index], [field]: value };
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

  // Upload d'une image personnalisée pour le plan Annexe 2
  const handleUploadPlanImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, planImageUrl: reader.result }));
      }
    };
    reader.readAsDataURL(file);
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
      setStatusMessage({
        type: 'success',
        text: `Document Word généré avec succès : ${result.fileName} (100 % modifiable dans Word et LibreOffice).`
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
                          value={sig.civilite || 'Monsieur'}
                          onChange={(e) => updateSignataire(idx, 'civilite', e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="Monsieur">Monsieur</option>
                          <option value="Madame">Madame</option>
                          <option value="Monsieur et Madame">Monsieur et Madame</option>
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
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Ordre d'affichage</label>
                        <select
                          value={sig.nomCompletOrdre || 'nom_prenom'}
                          onChange={(e) => updateSignataire(idx, 'nomCompletOrdre', e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="nom_prenom">Civilité NOM Prénom</option>
                          <option value="prenom_nom">Civilité Prénom NOM</option>
                        </select>
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
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
                  Ajouter un co-indivisaire / co-promettant (« Et »)
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

                <div className="pt-3 border-t border-slate-200">
                  <span className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2.5">
                    Représentant légal de la société
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Civilité</label>
                      <select
                        value={formData.societe?.repCivilite || 'Monsieur'}
                        onChange={(e) => updateSociete('repCivilite', e.target.value)}
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
                        value={formData.societe?.repPrenom || ''}
                        onChange={(e) => updateSociete('repPrenom', e.target.value)}
                        placeholder="Ex: Philippe"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom</label>
                      <input
                        type="text"
                        value={formData.societe?.repNom || ''}
                        onChange={(e) => updateSociete('repNom', e.target.value)}
                        placeholder="Ex: ROBY"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nationalité</label>
                      <input
                        type="text"
                        value={formData.societe?.repNationalite || 'française'}
                        onChange={(e) => updateSociete('repNationalite', e.target.value)}
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
                        value={formData.societe?.repAdresse || ''}
                        onChange={(e) => updateSociete('repAdresse', e.target.value)}
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
                        value={formData.societe?.repLieuNaissance || ''}
                        onChange={(e) => updateSociete('repLieuNaissance', e.target.value)}
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
                        value={formData.societe?.repDateNaissance || ''}
                        onChange={(e) => updateSociete('repDateNaissance', e.target.value)}
                        placeholder="Ex: 11/10/1964"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
                    Superficie totale (hectares — Préambule)
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
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nature du site (Préambule §2)
                </label>
                <input
                  type="text"
                  value={formData.descriptionSite || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descriptionSite: e.target.value }))}
                  placeholder="un site agricole dédié à la culture céréalière notamment"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
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
                    <th className="py-2.5 px-3 border-r border-slate-300 w-48 text-center">
                      SURFACE CADASTRALE (m²)
                    </th>
                    <th className="py-2.5 px-2 w-12 text-center">Action</th>
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
                      <td className="p-2 border-r border-slate-200">
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
                      <td className="p-2 text-center">
                        {(formData.parcelles || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParcelle(idx)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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

          {/* 3. CADRE EN BAS À GAUCHE (SURFACE À GAUCHE DU N° DE PARCELLE) & PLAN ANNEXE 2 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="pb-4 mb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-600" />
                  3. Cadre en bas à gauche de la Carte (Surface à gauche du n° de parcelle) & Annexe 2
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vérifiez l'affichage du cartouche en bas à gauche où la surface de la parcelle est positionnée à gauche du numéro de parcelle
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.stampCartoucheSurface)}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stampCartoucheSurface: e.target.checked }))
                  }
                  className="rounded text-amber-600"
                />
                Incruster le cartouche avec surface à gauche du n° de parcelle sur l'Annexe 2
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Aperçu fidèle du cadre en bas à gauche */}
              <div className="lg:col-span-5 space-y-3">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Aperçu du cadre en bas à gauche (Carte & Annexe 2) :
                </div>

                {/* Reproduction exacte du cartouche MapTargetInfo */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-inner">
                  <div className="bg-white/95 rounded-lg p-3 shadow-md border border-slate-200 max-w-[300px] text-xs font-sans">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-blue-600 text-[12px]">
                        {formData.lat && formData.lng
                          ? `${Number(formData.lat).toFixed(5)}, ${Number(formData.lng).toFixed(5)}`
                          : '45.14191, -0.46489'}
                      </span>
                      <span className="text-slate-400 font-bold text-xs">×</span>
                    </div>

                    <div className="text-slate-800 mb-2 leading-tight">
                      📍 <strong className="text-slate-900">{firstParcel.adresse || formData.commune || '15 Barré'}</strong>
                      <br />
                      <span className="text-slate-500 pl-4">
                        {formData.codePostal || '33920'} {formData.commune || 'SAINT-SAVIN'}
                      </span>
                    </div>

                    {/* LIGNE CLÉ : Altitude à gauche | Surface À GAUCHE du Numéro de parcelle */}
                    <div className="flex justify-between items-center border-t border-slate-200 pt-1.5 text-slate-600 gap-2">
                      <span title="Altitude NGF">⛰️ {formData.cartoucheAltitude || '125.0 m'}</span>
                      <div className="flex items-center gap-2 ml-auto">
                        <span
                          title="Surface de la parcelle (à gauche du numéro de parcelle)"
                          className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                        >
                          📐 {formattedPreviewSurface}
                        </span>
                        <span
                          title="Référence cadastrale"
                          className="font-bold text-slate-800"
                        >
                          🏷️ {formattedPreviewSection} {formattedPreviewNumero}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 mt-1.5 pt-1.5 flex items-center gap-1.5">
                      <span>🏛️</span>
                      <span className="text-slate-600 font-semibold">Zonage:</span>
                      <span className="font-bold text-slate-800">
                        {formData.cartoucheZonage || 'N / PLUi'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-300 mt-2.5 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    La surface ({formattedPreviewSurface}) est positionnée à gauche du numéro ({formattedPreviewSection} {formattedPreviewNumero}).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Altitude affichée (Cartouche)
                    </label>
                    <input
                      type="text"
                      value={formData.cartoucheAltitude || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cartoucheAltitude: e.target.value }))
                      }
                      placeholder="125.0 m"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Zonage affiché (Cartouche)
                    </label>
                    <input
                      type="text"
                      value={formData.cartoucheZonage || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cartoucheZonage: e.target.value }))
                      }
                      placeholder="N / PLUi"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sélecteur et aperçu de l'image complète de l'Annexe 2 */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Plan d'implantation injecté en Annexe 2 (Page 23) :
                  </span>
                  <div className="flex items-center gap-2">
                    {Array.isArray(formData.availableCaptures) && formData.availableCaptures.length > 0 && (
                      <select
                        value={formData.planImageUrl || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, planImageUrl: e.target.value }))
                        }
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                      >
                        {formData.availableCaptures.map((cap) => (
                          <option key={cap.id} value={cap.url}>
                            {cap.label}
                          </option>
                        ))}
                      </select>
                    )}
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

                {previewCartoucheUrl ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center max-h-64">
                    <img
                      src={previewCartoucheUrl}
                      alt="Aperçu Annexe 2 avec cartouche"
                      className="max-h-64 w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 text-xs text-slate-500">
                    Aucune capture de carte sélectionnée. Si le projet possède des coordonnées GPS, une vue satellite avec le cartouche en bas à gauche sera générée automatiquement, ou vous pouvez importer une capture ci-dessus.
                  </div>
                )}
              </div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
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
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mention sous « Pour le Bailleur » (Page 21)
                </label>
                <input
                  type="text"
                  value={formData.mentionSignataireBailleur || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mentionSignataireBailleur: e.target.value }))
                  }
                  placeholder="Optionnel (ex: Monsieur Philippe ROBY)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
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
