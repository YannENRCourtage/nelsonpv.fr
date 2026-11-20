import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Building2,
  BatteryCharging,
  Zap,
  Sun,
  TrendingUp,
  FileDown,
  FileSpreadsheet,
  Plus,
  ExternalLink,
  FolderPlus,
  Loader2,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast.js';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { apiService } from '@/services/api.js';
import { PRM_HANDOFF_KEY } from '@/services/storageBatteryEngine.js';
import {
  GROS_CONSO_SECTORS,
  DEPARTEMENTS_LIST,
  searchCommunesFrance,
  searchGrosConsommateurs,
  evaluateSiteBatteryRecommendation,
  exportProspectionCsv,
  exportProspectionPdf
} from '@/services/bessGrosConsoProspectionService.js';

export default function BessGrosConsoProspector({ onOpenInSimulator }) {
  const navigate = useNavigate();
  const { addProject } = useProjects();
  const { activeTenantId, user } = useAuth();

  // Mode de ciblage géographique : 'city' | 'department'
  const [geoMode, setGeoMode] = useState('city');
  const [cityQuery, setCityQuery] = useState('Mérignac');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [selectedCity, setSelectedCity] = useState({
    nom: 'Mérignac',
    codeInsee: '33281',
    codePostal: '33700',
    departement: '33',
    label: 'Mérignac (33700)'
  });
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [departmentCode, setDepartmentCode] = useState('24');

  // Filtres sectoriels et énergétiques
  const [sectorId, setSectorId] = useState('all');
  const [minAnnualKwh, setMinAnnualKwh] = useState(100000);
  const [minPeakKw, setMinPeakKw] = useState(36);
  const [pvOnly, setPvOnly] = useState(false);

  // Résultats et état de recherche
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searchMeta, setSearchMeta] = useState(null);
  const [creatingCrmId, setCreatingCrmId] = useState(null);
  const [createdCrmIds, setCreatedCrmIds] = useState({});

  // Formulaire de saisie manuelle / simulation rapide
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSite, setManualSite] = useState({
    name: '',
    address: '',
    codePostal: '',
    commune: '',
    sectorId: 'agroalimentaire',
    annualKwh: 320000,
    peakKw: 120,
    hasPv: true
  });

  const cityBoxRef = useRef(null);

  // Autocomplétion communes françaises
  useEffect(() => {
    if (geoMode !== 'city') return;
    if (!cityQuery || cityQuery.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const list = await searchCommunesFrance(cityQuery);
        setCitySuggestions(list);
      } catch (_) {
        setCitySuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [cityQuery, geoMode]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const onDocClick = (e) => {
      if (cityBoxRef.current && !cityBoxRef.current.contains(e.target)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Lancer la recherche & le dimensionnement automatique
  const handleRunSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      let cityObj = selectedCity;
      if (geoMode === 'city' && (!cityObj || cityObj.nom.toLowerCase() !== cityQuery.trim().toLowerCase())) {
        const suggestions = await searchCommunesFrance(cityQuery);
        if (suggestions.length > 0) {
          cityObj = suggestions[0];
          setSelectedCity(cityObj);
          setCityQuery(cityObj.label);
        } else {
          cityObj = { nom: cityQuery.trim(), codePostal: /^\d{5}$/.test(cityQuery.trim()) ? cityQuery.trim() : '' };
        }
      }

      const res = await searchGrosConsommateurs({
        geoMode,
        cityInfo: cityObj,
        departmentCode,
        sectorId,
        minAnnualKwh: Number(minAnnualKwh) || 0,
        minPeakKw: Number(minPeakKw) || 0,
        pvOnly,
        perPage: 20
      });

      setResults(res.results || []);
      setSearchMeta({
        source: res.source,
        totalFound: res.totalFound,
        filtersRelaxed: res.filtersRelaxed,
        zoneLabel: geoMode === 'city' ? (cityObj?.label || cityQuery) : `Département ${departmentCode}`
      });
    } catch (err) {
      toast({
        title: 'Erreur lors de la prospection',
        description: err?.message || 'Impossible d’exécuter la recherche.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Ajout manuel d'un prospect et dimensionnement immédiat
  const handleAddManualSite = (e) => {
    e.preventDefault();
    if (!manualSite.name.trim()) {
      toast({ title: 'Nom requis', description: 'Saisissez la raison sociale ou le nom du site.', variant: 'destructive' });
      return;
    }
    const sec = GROS_CONSO_SECTORS.find((s) => s.id === manualSite.sectorId) || GROS_CONSO_SECTORS[0];
    const evaluated = evaluateSiteBatteryRecommendation({
      id: `manual_${Date.now()}`,
      siren: '',
      name: manualSite.name.trim(),
      address: manualSite.address.trim() || 'Adresse à préciser',
      codePostal: manualSite.codePostal.trim() || (geoMode === 'city' ? selectedCity?.codePostal || '' : `${departmentCode}000`),
      commune: (manualSite.commune.trim() || (geoMode === 'city' ? selectedCity?.nom || '' : '')).toUpperCase(),
      departement: departmentCode,
      sectorId: sec.id,
      sectorLabel: sec.label,
      annualKwh: Number(manualSite.annualKwh) || 250000,
      peakKw: Number(manualSite.peakKw) || 95,
      hasPv: Boolean(manualSite.hasPv),
      defaultUseCase: sec.defaultUseCase,
      source: 'Saisie manuelle'
    });

    setResults((prev) => [evaluated, ...prev]);
    setShowManualForm(false);
    setManualSite((prev) => ({ ...prev, name: '', address: '' }));
    toast({
      title: 'Site ajouté et dimensionné ✓',
      description: `Batterie recommandée : ${evaluated.recommendation.quantity}× ${evaluated.recommendation.primaryModel.reference}`
    });
  };

  // Ajustement en direct de la conso / pointe sur une carte résultat
  const handleRecalculateSite = (siteId, field, value) => {
    setResults((prev) =>
      prev.map((item) => {
        if (item.id !== siteId) return item;
        const updated = { ...item, [field]: field === 'hasPv' ? Boolean(value) : Number(value) || 0 };
        return evaluateSiteBatteryRecommendation(updated);
      })
    );
  };

  // Passerelle 1 : Ouvrir l'étude dans le Simulateur Stockage Batterie
  const handleOpenSimulator = (site) => {
    const payload = {
      prm: site.siren ? `PROSPECT_${site.siren}` : `PROSPECT_${Date.now()}`,
      titulaire: site.name,
      clientName: site.name,
      adresse: `${site.address}${site.codePostal || site.commune ? `, ${site.codePostal} ${site.commune}` : ''}`.trim(),
      annualKwh: site.annualKwh,
      peakKw: site.peakKw,
      hasPv: site.hasPv
    };
    try {
      localStorage.setItem(PRM_HANDOFF_KEY, JSON.stringify(payload));
    } catch (_) {}

    if (typeof onOpenInSimulator === 'function') {
      onOpenInSimulator(site, payload);
    } else {
      navigate('/simulateur?solution=stockage');
    }
  };

  // Passerelle 2 : Ouvrir dans Admin Enedis
  const handleOpenEnedis = (site) => {
    try {
      localStorage.setItem(
        'nelson_enedis_prospect_prefill',
        JSON.stringify({
          name: site.name,
          address: site.address,
          codePostal: site.codePostal,
          commune: site.commune
        })
      );
    } catch (_) {}
    navigate('/enedis-admin');
  };

  // Passerelle 3 : Créer un dossier / contact dans le CRM & Projets
  const handleCreateCrm = async (site) => {
    setCreatingCrmId(site.id);
    try {
      const rec = site.recommendation || {};
      const m = rec.primaryModel || {};
      const newProj = {
        name: site.name,
        company: site.name,
        address: `${site.address} ${site.codePostal} ${site.commune}`.trim(),
        zip: site.codePostal || '',
        city: site.commune || '',
        lat: site.lat || undefined,
        lng: site.lng || undefined,
        gps: site.lat && site.lng ? `${site.lat}, ${site.lng}` : '',
        siren: site.siren || '',
        type: 'Batterie SA',
        status: 'Nouveau',
        kwc: rec.totalPowerKw || site.peakKw || 100,
        annualConsumption: site.annualKwh,
        peakKw: site.peakKw,
        comments: `[Prospection Gros Consommateurs BESS]\nSecteur : ${site.sectorLabel}\nConso estimée : ${site.annualKwh.toLocaleString('fr-FR')} kWh/an (${site.dailyKwh} kWh/j) | Pointe : ${site.peakKw} kW\nSolution recommandée : ${rec.quantity}× ${m.name || m.reference} (${rec.totalPowerKw} kW / ${rec.totalCapacityKwh} kWh)\nCAPEX indicatif : ${(rec.capexHT || 0).toLocaleString('fr-FR')} € HT | Gain estimé : ${(rec.estimatedAnnualSavings || 0).toLocaleString('fr-FR')} €/an`,
        tenantId: activeTenantId || user?.tenantId || 'enr-courtage-energie',
        dateCreation: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      let created = null;
      if (typeof addProject === 'function') {
        created = await addProject(newProj);
      } else if (apiService?.createProject) {
        created = await apiService.createProject(newProj);
      }

      setCreatedCrmIds((prev) => ({ ...prev, [site.id]: created?.id || 'ok' }));
      toast({
        title: 'Dossier CRM créé ✓',
        description: `${site.name} a été ajouté au CRM avec la recommandation ${m.reference}.`
      });
    } catch (err) {
      toast({
        title: 'Erreur création CRM',
        description: err?.message || 'Impossible de créer le dossier.',
        variant: 'destructive'
      });
    } finally {
      setCreatingCrmId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* EN-TÊTE */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-indigo-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Automate BESS C&amp;I
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Catalogue SAFRA &amp; CESC
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mt-2">
              Prospection &amp; Dimensionnement BESS « Gros Consommateurs »
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              Ciblez une ville ou un département, filtrez les sites énergivores (industrie, agroalimentaire, froid, agricole, tertiaire) et obtenez instantanément la batterie optimale et les passerelles CRM / Simulateur.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowManualForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Saisie manuelle
            </button>
            {results.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => exportProspectionCsv(results, searchMeta?.zoneLabel || 'bess')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportProspectionPdf(results, searchMeta?.zoneLabel || 'France')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Export PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FORMULAIRE DE CIBLAGE GÉOGRAPHIQUE & FILTRES */}
      <form
        onSubmit={handleRunSearch}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Paramètres de ciblage géographique &amp; profil énergétique
          </div>

          {/* Sélecteur Ville vs Département */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setGeoMode('city')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                geoMode === 'city'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Par Ville / Commune
            </button>
            <button
              type="button"
              onClick={() => setGeoMode('department')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                geoMode === 'department'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Par Département
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Zone géographique */}
          {geoMode === 'city' ? (
            <div className="relative" ref={cityBoxRef}>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Ville, Commune ou Code Postal
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cityQuery}
                  onFocus={() => setShowCityDropdown(true)}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  placeholder="Ex: Bergerac, 33700, Agen..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                />
              </div>
              {showCityDropdown && citySuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {citySuggestions.map((c) => (
                    <button
                      key={c.codeInsee}
                      type="button"
                      onClick={() => {
                        setSelectedCity(c);
                        setCityQuery(c.label);
                        setShowCityDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                    >
                      <span className="font-bold text-slate-800">{c.nom}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{c.codePostal}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Département cible
              </label>
              <select
                value={departmentCode}
                onChange={(e) => setDepartmentCode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {DEPARTEMENTS_LIST.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Secteur d'activité */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Secteur / Typologie de site
            </label>
            <select
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {GROS_CONSO_SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Seuil Conso annuelle */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Conso min. estimée (kWh/an)
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={minAnnualKwh}
              onChange={(e) => setMinAnnualKwh(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Seuil Pointe */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Puissance pointe min. (kW)
            </label>
            <input
              type="number"
              min="0"
              step="5"
              value={minPeakKw}
              onChange={(e) => setMinPeakKw(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Bouton Lancer */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Analyse en cours...' : 'Prospecter & Dimensionner'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={pvOnly}
              onChange={(e) => setPvOnly(e.target.checked)}
              className="rounded text-amber-500"
            />
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            Uniquement les sites avec potentiel / toiture Photovoltaïque (Couplage PV + Batterie)
          </label>

          {searchMeta && (
            <span className="text-xs font-semibold text-slate-500">
              {searchMeta.totalFound} établissement(s) trouvé(s) sur{' '}
              <strong className="text-slate-800">{searchMeta.zoneLabel}</strong>{' '}
              ({searchMeta.source === 'api_recherche_entreprises' ? 'API Entreprises data.gouv.fr' : 'Simulation sectorielle'})
            </span>
          )}
        </div>
      </form>

      {/* FORMULAIRE DE SAISIE MANUELLE RAPIDE */}
      {showManualForm && (
        <form
          onSubmit={handleAddManualSite}
          className="bg-indigo-50/70 rounded-2xl border border-indigo-200 p-5 space-y-3"
        >
          <div className="text-xs font-black uppercase tracking-wider text-indigo-900">
            Ajouter un site / établissement manuellement au dimensionnement
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Raison sociale / Nom du site*"
              value={manualSite.name}
              onChange={(e) => setManualSite((p) => ({ ...p, name: e.target.value }))}
              className="px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white font-semibold"
            />
            <input
              type="text"
              placeholder="Adresse"
              value={manualSite.address}
              onChange={(e) => setManualSite((p) => ({ ...p, address: e.target.value }))}
              className="px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white"
            />
            <input
              type="text"
              placeholder="Code Postal"
              value={manualSite.codePostal}
              onChange={(e) => setManualSite((p) => ({ ...p, codePostal: e.target.value }))}
              className="px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white"
            />
            <input
              type="text"
              placeholder="Commune"
              value={manualSite.commune}
              onChange={(e) => setManualSite((p) => ({ ...p, commune: e.target.value }))}
              className="px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white"
            />
            <select
              value={manualSite.sectorId}
              onChange={(e) => setManualSite((p) => ({ ...p, sectorId: e.target.value }))}
              className="px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white font-semibold"
            >
              {GROS_CONSO_SECTORS.filter((s) => s.id !== 'all').map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Conso annuelle (kWh/an)"
              value={manualSite.annualKwh}
              onChange={(e) => setManualSite((p) => ({ ...p, annualKwh: e.target.value }))}
              className="px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white font-bold"
            />
            <input
              type="number"
              placeholder="Pointe (kW)"
              value={manualSite.peakKw}
              onChange={(e) => setManualSite((p) => ({ ...p, peakKw: e.target.value }))}
              className="px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white font-bold"
            />
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={manualSite.hasPv}
                  onChange={(e) => setManualSite((p) => ({ ...p, hasPv: e.target.checked }))}
                />
                Toiture PV
              </label>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Calculer
              </button>
            </div>
          </div>
        </form>
      )}

      {/* LISTE DES RÉSULTATS DIMENSIONNÉS */}
      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
          <BatteryCharging className="w-10 h-10 mx-auto text-indigo-400" />
          <p className="text-sm font-bold text-slate-700">
            Sélectionnez une ville ou un département puis cliquez sur « Prospecter &amp; Dimensionner »
          </p>
          <p className="text-xs text-slate-500 max-w-xl mx-auto">
            L’automate interroge la base officielle des entreprises, estime le profil de charge et sélectionne automatiquement la meilleure batterie dans le catalogue SAFRA (`recommendSafraModel`) et CESC.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {results.map((site) => {
            const rec = site.recommendation || {};
            const m = rec.primaryModel || {};
            const altSafra = rec.alternateSafra;
            const altPartner = rec.alternatePartner;
            const isCrmCreated = Boolean(createdCrmIds[site.id]);

            return (
              <div
                key={site.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Identité & Profil Énergétique */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <h3 className="text-sm md:text-base font-black text-slate-900">
                        {site.name}
                      </h3>
                      {site.siren && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                          SIREN {site.siren}
                        </span>
                      )}
                      {site.hasPv && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1">
                          <Sun className="w-3 h-3" /> Couplage PV
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {site.address ? `${site.address} — ` : ''}
                      <strong>{site.codePostal} {site.commune}</strong>
                      <span className="text-slate-300">•</span>
                      <span className="text-indigo-700 font-semibold">{site.sectorLabel}</span>
                    </p>

                    <p className="text-xs text-slate-500">
                      Cas d’usage principal : <strong className="text-slate-700">{site.useCase}</strong>
                    </p>
                  </div>

                  {/* Paramètres de conso ajustables en direct */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
                    <div>
                      <span className="block text-[9.5px] font-bold text-slate-500 uppercase">Conso kWh/an</span>
                      <input
                        type="number"
                        step="5000"
                        value={site.annualKwh}
                        onChange={(e) => handleRecalculateSite(site.id, 'annualKwh', e.target.value)}
                        className="w-24 px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="block text-[9.5px] font-bold text-slate-500 uppercase">Moy kWh/j</span>
                      <div className="px-2 py-1 text-xs font-bold text-indigo-700">{site.dailyKwh}</div>
                    </div>
                    <div>
                      <span className="block text-[9.5px] font-bold text-slate-500 uppercase">Pointe (kW)</span>
                      <input
                        type="number"
                        step="5"
                        value={site.peakKw}
                        onChange={(e) => handleRecalculateSite(site.id, 'peakKw', e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* BLOC RECOMMANDATION BATTERIE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                  <div className="lg:col-span-7 bg-gradient-to-br from-indigo-50 to-blue-50/70 rounded-xl border border-indigo-200 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Solution Batterie Recommandée
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black">
                        {rec.quantity}× {m.reference}
                      </span>
                    </div>

                    <div className="text-sm font-black text-slate-900">
                      {rec.quantity}× {m.name} — <span className="text-indigo-700">{rec.totalPowerKw} kW / {rec.totalCapacityKwh} kWh</span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 font-medium">
                      <span>⚡ Tension : <strong>{m.voltageType}</strong></span>
                      <span>❄️ Refroidissement : <strong>{m.coolingType}</strong></span>
                      <span>🔋 Rendement : <strong>{m.efficiency}%</strong></span>
                    </div>

                    <p className="text-xs text-slate-700 leading-snug pt-1 border-t border-indigo-200/70">
                      {rec.reason}
                    </p>

                    {(altSafra || altPartner) && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        Variante(s) :{' '}
                        {altSafra && (
                          <span className="font-semibold text-slate-700">
                            {altSafra.quantity}× {altSafra.model.reference} ({Math.round(altSafra.model.capacityKwh * altSafra.quantity)} kWh)
                          </span>
                        )}
                        {altSafra && altPartner && ' • '}
                        {altPartner && (
                          <span className="font-semibold text-slate-700">
                            {altPartner.brand} {altPartner.model}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* BUDGET & GAIN + PASSERELLES 1 CLIC */}
                  <div className="lg:col-span-5 flex flex-col justify-between gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase">CAPEX HT</span>
                        <span className="block text-sm font-black text-slate-900 mt-0.5">
                          {(rec.capexHT || 0).toLocaleString('fr-FR')} €
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                        <span className="block text-[10px] font-bold text-emerald-700 uppercase">Gain estimé</span>
                        <span className="block text-sm font-black text-emerald-700 mt-0.5">
                          +{(rec.estimatedAnnualSavings || 0).toLocaleString('fr-FR')} €/an
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                        <span className="block text-[10px] font-bold text-amber-800 uppercase">Retour</span>
                        <span className="block text-sm font-black text-amber-800 mt-0.5">
                          {rec.paybackYears || '—'} ans
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSimulator(site)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Simulateur Stockage
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEnedis(site)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Enedis
                      </button>

                      <button
                        type="button"
                        disabled={creatingCrmId === site.id || isCrmCreated}
                        onClick={() => handleCreateCrm(site)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                          isCrmCreated
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {creatingCrmId === site.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isCrmCreated ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <FolderPlus className="w-3.5 h-3.5" />
                        )}
                        {isCrmCreated ? 'Dossier créé' : 'Créer CRM'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
