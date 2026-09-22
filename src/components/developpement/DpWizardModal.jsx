import React, { useState, useEffect } from 'react';
import {
  X, Check, Sparkles, FileText, MapPin, Building, ShieldCheck,
  Image, Layers, ArrowLeft, ArrowRight, Download, RefreshCw, Upload,
  Zap, Clock, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { toast } from '@/components/ui/use-toast.js';
import { initBessDpAutoConfig, buildExpressBessProjectPayload } from '@/services/bessDpAutoInitService.js';

export default function DpWizardModal({
  isOpen,
  onClose,
  project,
  onGenerate,
  onUpdateProject
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [dpConfig, setDpConfig] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      const initial = initBessDpAutoConfig(project);
      setDpConfig(initial);
      setCurrentStep(1);
    }
  }, [isOpen, project]);

  if (!isOpen || !dpConfig) return null;

  const updateDeclarant = (field, val) => {
    setDpConfig(prev => ({
      ...prev,
      declarant: { ...prev.declarant, [field]: val }
    }));
  };

  const updateTerrain = (field, val) => {
    setDpConfig(prev => ({
      ...prev,
      terrain: { ...prev.terrain, [field]: val }
    }));
  };

  const updateImplantation = (field, val) => {
    setDpConfig(prev => ({
      ...prev,
      implantation: { ...prev.implantation, [field]: val }
    }));
  };

  const updateTechnique = (field, val) => {
    setDpConfig(prev => ({
      ...prev,
      technique: { ...prev.technique, [field]: val }
    }));
  };

  const updateNotice = (field, val) => {
    setDpConfig(prev => ({
      ...prev,
      notice_custom: { ...prev.notice_custom, [field]: val }
    }));
  };

  const handleSaveAndCompile = async () => {
    setIsCompiling(true);
    try {
      const updatedConfig = {
        ...dpConfig,
        status: 'GENERATED',
        generatedAt: new Date().toISOString()
      };
      setDpConfig(updatedConfig);

      if (onUpdateProject && project?.id) {
        await onUpdateProject(project.id, {
          dp_config: updatedConfig,
          updatedAt: new Date().toISOString()
        });
      }

      const payload = buildExpressBessProjectPayload(project, updatedConfig);
      await onGenerate('dp', 'Station Batteries Stand-Alone', payload, payload.selectedPages);

      toast({
        title: "Dossier DP BESS compilé avec succès !",
        description: `Le CERFA 16702*03 et l'ensemble des pièces graphiques ont été générés.`
      });
      onClose();
    } catch (err) {
      console.error('Erreur compilation DP Wizard:', err);
      toast({
        title: "Erreur lors de la compilation",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const STEPS = [
    { num: 1, label: 'Déclarant & Foncier', icon: Building },
    { num: 2, label: 'Implantation & Plan DP2', icon: MapPin },
    { num: 3, label: 'Notice & SDIS DP3', icon: FileText },
    { num: 4, label: 'Volet Paysager DP6/7/8', icon: Image },
    { num: 5, label: 'Récapitulatif & Export', icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Tunnel de Déclaration Préalable BESS
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-900">
                  500 kW / 1044 kWh
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Site : <span className="font-bold text-white">{project?.name || 'Projet BESS'}</span> — {dpConfig.terrain.ville} ({dpConfig.terrain.code_postal})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[550px]">
            {STEPS.map((s, idx) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <div key={s.num} className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(s.num)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                        : isPast
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black bg-black/10">
                      {isPast ? '✓' : s.num}
                    </span>
                    <span>{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body Content by Step */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* ÉTAPE 1 : Déclarant & Foncier */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-blue-900 font-medium">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Ces informations alimentent directement les <strong>Cadres 1, 2 et 3 du CERFA officiel 16702*03</strong>.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cadre Déclarant */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    Identité du Déclarant (Bailleur / Demandeur)
                  </h4>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Nom</label>
                      <input
                        type="text"
                        value={dpConfig.declarant.nom}
                        onChange={e => updateDeclarant('nom', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Prénom</label>
                      <input
                        type="text"
                        value={dpConfig.declarant.prenom}
                        onChange={e => updateDeclarant('prenom', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Date Naissance (JJMMAAAA)</label>
                      <input
                        type="text"
                        value={dpConfig.declarant.date_naissance}
                        onChange={e => updateDeclarant('date_naissance', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Lieu Naissance</label>
                      <input
                        type="text"
                        value={dpConfig.declarant.lieu_naissance}
                        onChange={e => updateDeclarant('lieu_naissance', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Dpt Naissance</label>
                      <input
                        type="text"
                        value={dpConfig.declarant.dept_naissance}
                        onChange={e => updateDeclarant('dept_naissance', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Adresse</label>
                    <input
                      type="text"
                      value={dpConfig.declarant.adresse}
                      onChange={e => updateDeclarant('adresse', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Téléphone</label>
                      <input
                        type="text"
                        value={dpConfig.declarant.telephone}
                        onChange={e => updateDeclarant('telephone', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Email</label>
                      <input
                        type="text"
                        value={dpConfig.declarant.email}
                        onChange={e => updateDeclarant('email', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Cadre Terrain */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Terrain d'Assiette du Projet
                  </h4>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Section</label>
                      <input
                        type="text"
                        value={dpConfig.terrain.section}
                        onChange={e => updateTerrain('section', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Numéro Parcelle</label>
                      <input
                        type="text"
                        value={dpConfig.terrain.parcelle}
                        onChange={e => updateTerrain('parcelle', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Superficie (m²)</label>
                      <input
                        type="number"
                        value={dpConfig.terrain.contenance_m2}
                        onChange={e => updateTerrain('contenance_m2', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Commune du Projet</label>
                    <input
                      type="text"
                      value={dpConfig.terrain.ville}
                      onChange={e => updateTerrain('ville', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Code Postal</label>
                      <input
                        type="text"
                        value={dpConfig.terrain.code_postal}
                        onChange={e => updateTerrain('code_postal', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Code INSEE</label>
                      <input
                        type="text"
                        value={dpConfig.terrain.code_insee}
                        onChange={e => updateTerrain('code_insee', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : Implantation & Plan de masse DP2 */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Cotes d'Implantation de la Dalle Béton (6,20 m x 3,20 m = 19,84 m²)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Recul voie publique (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={dpConfig.implantation.recul_voie_m}
                      onChange={e => updateImplantation('recul_voie_m', parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Recul limites séparatives (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={dpConfig.implantation.recul_limite_m}
                      onChange={e => updateImplantation('recul_limite_m', parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Angle d'orientation (°)</label>
                    <input
                      type="number"
                      value={dpConfig.implantation.angle_rotation}
                      onChange={e => updateImplantation('angle_rotation', parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Hauteur clôture (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dpConfig.technique.hauteur_cloture_m}
                      onChange={e => updateTechnique('hauteur_cloture_m', parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                    <span className="font-bold text-slate-700">Dalle armée étanche : 6,20 m x 3,20 m (19,84 m²)</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    GPS : {dpConfig.implantation.lat.toFixed(6)}, {dpConfig.implantation.lng.toFixed(6)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : Notice Descriptive & SDIS DP3 */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Notice Descriptive & Sécurité SDIS (Pièce DP3 / DP11)
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">1. Objet du projet</label>
                    <textarea
                      rows={2}
                      value={dpConfig.notice_custom.objet}
                      onChange={e => updateNotice('objet', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">2. Site d'implantation</label>
                    <textarea
                      rows={2}
                      value={dpConfig.notice_custom.site}
                      onChange={e => updateNotice('site', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">3. Description des ouvrages & clôture</label>
                    <textarea
                      rows={2}
                      value={dpConfig.notice_custom.projet}
                      onChange={e => updateNotice('projet', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">4. Raccordement Réseau Enedis</label>
                    <textarea
                      rows={2}
                      value={dpConfig.notice_custom.raccordement}
                      onChange={e => updateNotice('raccordement', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">5. Sécurité Incendie & Accès Pompiers SDIS</label>
                    <textarea
                      rows={2}
                      value={dpConfig.notice_custom.sdis}
                      onChange={e => updateNotice('sdis', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : Volet Paysager DP6/7/8 */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-blue-600" />
                  Pièces Photographiques et Photomontage Paysager (DP6, DP7, DP8)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-indigo-700 uppercase block">DP6 : Insertion Paysagère 3D</span>
                    <div className="h-32 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 font-bold">
                      Photomontage 3D BESS
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-indigo-700 uppercase block">DP7 : Environnement Proche</span>
                    <div className="h-32 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 font-bold">
                      Photo Paysage Proche
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-indigo-700 uppercase block">DP8 : Paysage Lointain</span>
                    <div className="h-32 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 font-bold">
                      Photo Vue Lointaine
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 5 : Récapitulatif & Export */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-black uppercase tracking-wider">
                    Dossier Prêt pour Compilation et Export PDF
                  </h4>
                </div>
                <p className="text-xs text-emerald-800">
                  L'ensemble des pièces graphiques réglementaires (DP1 à DP8, Notice descriptive et CERFA 16702*03 pré-rempli) sont configurées.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">Puissance installée :</span>
                  <span className="font-black text-slate-900">{dpConfig.technique.puissance_kw} kW (1044 kWh)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">Déclarant :</span>
                  <span className="font-black text-slate-900">{dpConfig.declarant.prenom} {dpConfig.declarant.nom}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">Parcelle cadastrale :</span>
                  <span className="font-black text-slate-900">Section {dpConfig.terrain.section} n° {dpConfig.terrain.parcelle} ({dpConfig.terrain.ville})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-bold">Poste source ODRE :</span>
                  <span className="font-black text-blue-700">{dpConfig.technique.poste_source} ({dpConfig.technique.distance_km} km)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={currentStep === 1 || isCompiling}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Précédent
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 5 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs font-bold"
              >
                Suivant <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isCompiling}
                onClick={handleSaveAndCompile}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-2 text-xs font-black shadow-md cursor-pointer"
              >
                {isCompiling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Compilation en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Compiler & Télécharger le dossier PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
