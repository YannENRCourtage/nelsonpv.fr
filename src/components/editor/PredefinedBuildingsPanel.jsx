import React, { useState, useMemo, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Minus, Layers, DollarSign } from 'lucide-react';
import { useConfiguratorStore, useConfiguratorValues } from '@/stores/useConfiguratorStore';
import { BARCONNIERE_CATALOG, ACAMA_CATALOG } from '@/data/barconniereCatalog';

// ─── Shared helpers ──────────────────────────────────────────────────────────
const getRatioColor = (ratio) => {
  if (ratio <= 0.45) return 'text-green-600';
  if (ratio > 0.45 && ratio <= 0.55) return 'text-orange-500';
  return 'text-red-600';
};

const formatNumber = (num) => {
  if (!num && num !== 0) return '—';
  return Math.round(num).toLocaleString('fr-FR');
};

// Helper to determine configuration based on building code / gamme (GREEN INVEST only)
const getBuildingConfig = (building) => {
  if (!building) return { allowAuvent: false, allowAppentis: false, baseWeight: 50, getWeight: () => 50 };
  const id = (building.id || '').toUpperCase();
  const gamme = (building.gamme || '').toUpperCase();

  const config = {
    allowAuvent: false,
    allowAppentis: false,
    baseWeight: 50,
    getWeight: () => 50,
  };

  if (gamme.includes('OMBRIERE')) {
    config.baseWeight = 100;
    config.getWeight = () => 100;
    return config;
  }

  // Gamme ORION (O1, O2, ... ou ORION 16 / ORION 20)
  // Possibilité d'ajouter 1 ou 2 auvents (Sud puis Nord)
  if (gamme.startsWith('ORION') || id.startsWith('O')) {
    config.allowAuvent = true;
    config.allowAppentis = false;
    config.baseWeight = 90;
    config.getWeight = (auv) => {
      const a = Number(auv) || 0;
      return a === 2 ? 70 : 90;
    };
  } else if (gamme.startsWith('CYRUS') || id.startsWith('C')) {
    config.allowAuvent = true;
    config.allowAppentis = false;
    config.baseWeight = 70;
    config.getWeight = (auv) => {
      const a = parseInt(auv, 10) || 0;
      if (a === 1) return 75;
      if (a === 2) return 65;
      return 70;
    };
  } else if (gamme.startsWith('ATLAS') || id.startsWith('A')) {
    config.allowAuvent = true;
    config.allowAppentis = false;
    config.baseWeight = 100;
    config.getWeight = () => 100;
  } else if (gamme.startsWith('HELIOS') || id.startsWith('H')) {
    config.allowAuvent = true;
    config.allowAppentis = true;
    config.baseWeight = 50;
    config.getWeight = (auv, app) => {
      const a = parseInt(auv, 10) || 0;
      const ap = parseInt(app, 10) || 0;
      if (a === 0 && ap === 0) return 50;
      if (a === 0 && ap === 1) return 65;
      if (a === 0 && ap === 2) return 50;
      if (a === 1 && ap === 1) return 60;
      if (a === 1 && ap === 0) return 55;
      if (a === 2 && ap === 0) return 50;
      return 50;
    };
  } else if (gamme.startsWith('KEREN') || id.startsWith('K')) {
    config.allowAuvent = true;
    config.allowAppentis = true;
    config.baseWeight = 65;
    config.getWeight = () => 65;
  } else if (gamme.startsWith('YOKO') || id.startsWith('Y') || gamme.startsWith('SOLEA') || id.startsWith('S')) {
    config.allowAuvent = true;
    config.allowAppentis = true;
    config.baseWeight = 50;
    config.getWeight = () => 50;
  } else {
    config.allowAuvent = true;
    config.allowAppentis = true;
    config.baseWeight = 50;
    config.getWeight = () => 50;
  }
  return config;
};

// ─── Component ───────────────────────────────────────────────────────────────
const PredefinedBuildingsPanel = ({ onBuildingSelect, onConfigChange, tenantId }) => {
  const isAcama = tenantId === 'acama';

  const [selectedKey, setSelectedKey] = useState(null);
  const [auventCount, setAuventCount] = useState(0);
  const [appentisCount, setAppentisCount] = useState(0);

  // --- CONFIGURATOR DATA ---
  const configuratorValues = useConfiguratorValues();
  const configuratorState = useConfiguratorStore();

  const customBuilding = useMemo(() => {
    const params = configuratorState.customParams;
    const length = params.bayCount * params.baySpacing;
    let totalWidth = params.width;

    if (params.leftExtension !== 'none') totalWidth += params.leftExtWidth;
    if (params.rightExtension !== 'none') totalWidth += params.rightExtWidth;

    const surface = length * totalWidth;
    const isCustomModeActive = configuratorState.configMode === 'custom';
    const power = isCustomModeActive ? configuratorValues.solarStats.power : 0;
    const ratio = isAcama ? 0.55 : 0.5;

    return {
      code: 'SUR-MESURE',
      id: 'SUR-MESURE',
      gamme: 'Configurateur',
      designation: 'Bâtiment Sur-Mesure',
      length: parseFloat(length.toFixed(2)),
      longueur: parseFloat(length.toFixed(2)),
      width: parseFloat(totalWidth.toFixed(2)),
      largeur: parseFloat(totalWidth.toFixed(2)),
      surface: parseFloat(surface.toFixed(2)),
      power: parseFloat(power.toFixed(2)),
      kwc: parseFloat(power.toFixed(2)),
      puissance: parseFloat(power.toFixed(2)),
      ratio,
      ratioKwc: ratio,
      ratioM2: 128,
      tarif: Math.round(surface * 128),
      isCustom: true,
      angle: params.leftPitch || 10,
      roofWeighting: 100,
      isPredefinedAcama: false,
      pricing_ht: {
        charpente_base_ht: Math.round(surface * 128 * 0.45),
        fondations_base_ht: Math.round(surface * 128 * 0.28),
        couverture_base_ht: Math.round(surface * 128 * 0.27),
        total_base_ht: Math.round(surface * 128),
        cout_travee_sup_ht: {
          charpente_travee: 0,
          fondations_travee: 0,
          couverture_travee: 0,
          total_travee: 0,
        },
      },
    };
  }, [configuratorState.customParams, configuratorState.configMode, configuratorValues.solarStats.power, isAcama]);

  // Reset counters and selection when tenant changes
  useEffect(() => {
    setSelectedKey(null);
    setAuventCount(0);
    setAppentisCount(0);
  }, [tenantId]);

  // Reset counters when selecting a new building
  useEffect(() => {
    setAuventCount(0);
    setAppentisCount(0);
  }, [selectedKey]);

  // Group Green Invest models by 5 categories
  const greenInvestCategories = useMemo(() => {
    if (isAcama) return null;
    const categories = {
      'Halls Symétriques': [],
      'Asymétriques & Auvents': [],
      'Monopentes': [],
      'Ombrières de parking VL': [],
      'Ombrières de parking PL': [],
    };

    BARCONNIERE_CATALOG.forEach(b => {
      const cat = b.category || 'Halls Symétriques';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(b);
    });

    return categories;
  }, [isAcama]);

  // Group ACAMA buildings by gamme
  const acamaGroups = useMemo(() => {
    if (!isAcama) return null;
    const groups = {};
    ACAMA_CATALOG.forEach(b => {
      if (!groups[b.gamme]) groups[b.gamme] = [];
      groups[b.gamme].push(b);
    });
    return groups;
  }, [isAcama]);

  // Selected building computation with dynamic bays stepper (+ / - 7.50m)
  const selectedBuildingData = useMemo(() => {
    if (!selectedKey) return null;
    if (selectedKey === 'SUR-MESURE') return customBuilding;

    if (isAcama) {
      const building = ACAMA_CATALOG.find(b => b.code === selectedKey || b.id === selectedKey);
      if (!building) return null;
      return {
        ...building,
        roofWeighting: building.roofWeighting ?? 50,
        power: building.kwc || building.puissance,
        length: building.longueur,
        width: building.largeur,
      };
    }

    const baseBuilding = BARCONNIERE_CATALOG.find(b => `${b.gamme}_${b.id}` === selectedKey || b.id === selectedKey);
    if (!baseBuilding) return null;

    // Green Invest: dimensions directes du catalogue (ex: C5 = 60m, C6 = 67.5m, C7 = 75m)
    const baseLength = baseBuilding.longueur;
    const currentLength = baseLength;
    const traveeCount = Math.round(currentLength / 7.5);

    let baseWidth = baseBuilding.largeur;
    let extraWidth = 0;
    if (auventCount > 0) extraWidth += auventCount * 4;
    if (appentisCount > 0) extraWidth += appentisCount * 9.3;
    const currentWidth = Number((baseWidth + extraWidth).toFixed(2));

    const currentSurface = Math.round(currentLength * currentWidth);
    const powerRatio = baseBuilding.kwc > 0 && baseBuilding.surface > 0
      ? baseBuilding.kwc / baseBuilding.surface
      : 0.20;
    const currentPower = Math.round(currentSurface * powerRatio);

    const charpente = Math.round(baseBuilding.pricing_ht?.charpente_base_ht || 0);
    const fondations = Math.round(baseBuilding.pricing_ht?.fondations_base_ht || 0);
    const couverture = Math.round(baseBuilding.pricing_ht?.couverture_base_ht || 0);
    const totalTarif = Math.round(baseBuilding.pricing_ht?.total_base_ht || baseBuilding.tarif || 0);

    const ratioKwc = currentPower > 0 ? Number((totalTarif / (currentPower * 1000)).toFixed(2)) : baseBuilding.ratioKwc;
    const ratioM2 = currentSurface > 0 ? Math.round(totalTarif / currentSurface) : baseBuilding.ratioM2;

    const config = getBuildingConfig(baseBuilding);
    const roofWeighting = config.getWeight(auventCount, appentisCount);

    let extensionLabel = '';
    if (auventCount === 1) extensionLabel += ' + 1 auvent Sud (4m)';
    else if (auventCount === 2) extensionLabel += ' + 2 auvents Sud & Nord (8m)';
    if (appentisCount === 1) extensionLabel += ' + 1 appenti Sud (9.3m)';
    else if (appentisCount === 2) extensionLabel += ' + 2 appentis Sud & Nord (18.6m)';

    const fullDesignation = `${baseBuilding.designation || baseBuilding.id}${extensionLabel}`;

    return {
      ...baseBuilding,
      length: currentLength,
      longueur: currentLength,
      width: currentWidth,
      largeur: currentWidth,
      surface: currentSurface,
      power: currentPower,
      kwc: currentPower,
      puissance: currentPower,
      tarif: totalTarif,
      ratio: ratioKwc,
      ratioKwc,
      extraBays: 0,
      traveeCount,
      travees: `${traveeCount} x 7.5m`,
      roofWeighting,
      auventCount,
      appentisCount,
      extensionLabel,
      fullDesignation,
      projectSizeDescription: `${baseBuilding.id} (${currentLength}m × ${currentWidth}m${extensionLabel})`,
      isPredefinedBuilding: true,
      pricing_ht: {
        charpente_base_ht: charpente,
        fondations_base_ht: fondations,
        couverture_base_ht: couverture,
        total_base_ht: totalTarif,
        cout_travee_sup_ht: baseBuilding.pricing_ht?.cout_travee_sup_ht || null,
      },
    };
  }, [selectedKey, auventCount, appentisCount, isAcama, customBuilding]);

  // Sync weighting with parent whenever it changes
  useEffect(() => {
    if (selectedBuildingData && onConfigChange && selectedBuildingData.roofWeighting !== undefined) {
      onConfigChange(selectedBuildingData);
    }
  }, [selectedBuildingData, onConfigChange]);

  const handleInsert = () => {
    if (selectedBuildingData && onBuildingSelect) {
      onBuildingSelect(selectedBuildingData);
    }
  };

  const handleKeySelect = (key) => {
    setSelectedKey(key);
    const b = BARCONNIERE_CATALOG.find(x => `${x.gamme}_${x.id}` === key || x.id === key);
    if (b) {
      const cfg = getBuildingConfig(b);
      if (!cfg.allowAuvent) setAuventCount(0);
      if (!cfg.allowAppentis) setAppentisCount(0);
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/60 rounded-t-2xl border-b border-slate-100">
        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Bâtiments prédéfinis
        </CardTitle>
        <div className="flex items-center gap-1.5">
          {!isAcama && selectedKey && selectedKey !== 'SUR-MESURE' && (
            <>
              <Button
                variant={auventCount > 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  const next = (auventCount + 1) % 3;
                  if (next + appentisCount <= 2) setAuventCount(next);
                  else setAuventCount(0);
                }}
                disabled={!selectedBuildingData || !getBuildingConfig(selectedBuildingData).allowAuvent}
                className={`h-8 text-xs font-semibold ${
                  auventCount > 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                }`}
                title={
                  auventCount === 0
                    ? 'Ajouter un 1er auvent (Sud +4m)'
                    : auventCount === 1
                    ? 'Ajouter un 2ème auvent (Nord +4m -> Total 8m)'
                    : 'Retirer les auvents'
                }
              >
                {auventCount === 0 && 'Auvent'}
                {auventCount === 1 && 'Auvent Sud (4m)'}
                {auventCount === 2 && '2 Auvents S+N (8m)'}
              </Button>
              <Button
                variant={appentisCount > 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  const next = (appentisCount + 1) % 3;
                  if (next + auventCount <= 2) setAppentisCount(next);
                  else setAppentisCount(0);
                }}
                disabled={!selectedBuildingData || !getBuildingConfig(selectedBuildingData).allowAppentis}
                className={`h-8 text-xs font-semibold ${
                  appentisCount > 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                }`}
                title={
                  appentisCount === 0
                    ? 'Ajouter un 1er appenti (Sud +9.3m)'
                    : appentisCount === 1
                    ? 'Ajouter un 2ème appenti (Nord +9.3m -> Total 18.6m)'
                    : 'Retirer les appentis'
                }
              >
                {appentisCount === 0 && 'Appenti'}
                {appentisCount === 1 && 'Appenti Sud (9.3m)'}
                {appentisCount === 2 && '2 Appentis S+N (18.6m)'}
              </Button>
            </>
          )}
          <Button
            onClick={handleInsert}
            disabled={!selectedBuildingData}
            size="sm"
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <Building2 size={15} className="mr-1.5" />
            Insérer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-3 pb-3 space-y-3">
        {/* Selector dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Select onValueChange={handleKeySelect} value={selectedKey || ''}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="Choisir un modèle prédéfini..." />
              </SelectTrigger>
              <SelectContent className="max-h-[380px]">
                <SelectItem value="SUR-MESURE" className="font-bold text-blue-600 py-1.5">
                  ✨ Sur-mesure (Configurateur)
                </SelectItem>
                {isAcama ? (
                  Object.entries(acamaGroups).map(([gamme, buildings]) => (
                    <React.Fragment key={gamme}>
                      <div className="px-2 py-1 text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 border-y border-slate-200">
                        {gamme}
                      </div>
                      {buildings.map((b) => (
                        <SelectItem key={b.code} value={b.code} className="text-xs">
                          {b.code} ({b.longueur}m × {b.largeur}m - {b.puissance} kWc)
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  Object.entries(greenInvestCategories).map(([catName, buildings]) => (
                    <React.Fragment key={catName}>
                      <div className="px-2 py-1 text-[11px] font-black text-blue-800 uppercase tracking-wider bg-blue-50 border-y border-blue-100">
                        {catName}
                      </div>
                      {buildings.map((b) => {
                        const valKey = `${b.gamme}_${b.id}`;
                        return (
                          <SelectItem key={valKey} value={valKey} className="text-xs">
                            <span className="font-semibold">{b.gamme}</span> ({b.id}) — {b.longueur}m × {b.largeur}m • {b.puissance} kWc
                          </SelectItem>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedBuildingData && (
            <div className="text-right text-xs">
              <span className="text-slate-400 block text-[10px]">Ratio PV</span>
              <span className={`font-bold ${getRatioColor(selectedBuildingData.ratioKwc || selectedBuildingData.ratio)}`}>
                {(selectedBuildingData.ratioKwc || selectedBuildingData.ratio || 0).toFixed(2)} €/Wc
              </span>
            </div>
          )}
        </div>



        {/* Building details & price breakdown */}
        {selectedBuildingData && (
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between text-slate-600">
                <span>Longueur :</span>
                <span className="font-bold text-slate-900">{selectedBuildingData.length} m</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Largeur :</span>
                <span className="font-bold text-slate-900">{selectedBuildingData.width} m</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Surface sol :</span>
                <span className="font-bold text-slate-900">{selectedBuildingData.surface} m²</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Puissance :</span>
                <span className="font-bold text-amber-600">{selectedBuildingData.power} kWc</span>
              </div>
              {selectedBuildingData.extensionLabel && (
                <div className="col-span-2 pt-1 text-[11px] text-amber-700 font-bold border-t border-slate-100 flex items-center justify-between">
                  <span>Extension :</span>
                  <span>{selectedBuildingData.extensionLabel.replace(/^\s*\+\s*/, '')}</span>
                </div>
              )}
            </div>

            {/* Financial Breakdown (GREEN INVEST) */}
            {!isAcama && selectedBuildingData.pricing_ht && (
              <div className="bg-slate-900 text-white rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                  <span className="font-semibold text-slate-300">Structure Métallique :</span>
                  <span className="font-black text-emerald-400 text-sm">
                    {formatNumber(selectedBuildingData.tarif || selectedBuildingData.pricing_ht.total_base_ht)} € HT
                  </span>
                </div>

                <div className={`grid ${selectedBuildingData.pricing_ht.couverture_base_ht > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-[11px] text-slate-300 pt-0.5`}>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dont Charpente</span>
                    <span className="font-semibold text-white">
                      {formatNumber(selectedBuildingData.pricing_ht.charpente_base_ht)} €
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dont Fondations</span>
                    <span className="font-semibold text-white">
                      {formatNumber(selectedBuildingData.pricing_ht.fondations_base_ht)} €
                    </span>
                  </div>
                  {selectedBuildingData.pricing_ht.couverture_base_ht > 0 && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Dont Couverture</span>
                      <span className="font-semibold text-white">
                        {formatNumber(selectedBuildingData.pricing_ht.couverture_base_ht)} €
                      </span>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredefinedBuildingsPanel;