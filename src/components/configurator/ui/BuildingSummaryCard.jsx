import React from 'react';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import { Building2, Sun, Coins, Ruler, Layers, CheckCircle2, Sparkles } from 'lucide-react';
import { findBarconniereBuilding } from '@/data/barconniereCatalog.js';

export const BuildingSummaryCard = ({ isAcama = false, className = '' }) => {
    const config = useConfiguratorValues();

    const length = Number(config.length || 30.0);
    const mainWidth = Number(config.width || 15.0);
    const leftExt = config.leftSide !== 'none' ? Number(config.leftWidth || 0) : 0;
    const rightExt = config.rightSide !== 'none' ? Number(config.rightWidth || 0) : 0;
    const totalWidth = mainWidth + leftExt + rightExt;

    const floorArea = Math.round(length * totalWidth);

    // Détection mode sur-mesure
    const isCustom = config.configMode === 'custom' || (!isAcama && config.buildingType === 'custom');

    // Recherche automatique dans le catalogue officiel Barconnière / Acama
    const barcMatch = findBarconniereBuilding({
        length,
        width: mainWidth,
        buildingType: config.buildingType || 'symetrique',
        leftSide: config.leftSide || 'none',
        rightSide: config.rightSide || 'none',
        leftWidth: config.leftWidth || 0,
        rightWidth: config.rightWidth || 0,
        isAcama,
    });

    const gammeName = barcMatch.gamme;
    const buildingCode = String(barcMatch.id || '').replace(/^#/, '').trim();
    const equivalenceCode = String(barcMatch.code || '').trim();

    // Puissance solaire
    const installedKwc = Number(config.solarStats?.power) || barcMatch.kwc || Math.round(floorArea * 0.20);
    const panelCount = Number(config.solarStats?.count) || Math.round((installedKwc * 1000) / (isAcama ? 460 : 465));
    const estimatedProductionKwh = Math.round(installedKwc * 1150);

    // Chiffrage officiel Barconnière
    const totalBuildingCost = isCustom
        ? Math.round(floorArea * 128)
        : barcMatch.tarif;

    // Chiffrage PV
    const pvCostPerWc = 0.55;
    const pvInstallationCost = Math.round(installedKwc * 1000 * pvCostPerWc + 15000);

    // Ratios officiels
    // 1. Ratio Global (Structure + Centrale PV)
    const totalProjectCost = totalBuildingCost + (config.hasSolar ? pvInstallationCost : 0);
    const ratioTotalCostPerWc = installedKwc > 0 ? Number((totalProjectCost / (installedKwc * 1000)).toFixed(2)) : 0;
    const ratioTotalCostPerKwc = Math.round(ratioTotalCostPerWc * 1000);

    // 2. Ratio Hors PV (Structure uniquement)
    const ratioStructureCostPerWc = installedKwc > 0 ? Number((totalBuildingCost / (installedKwc * 1000)).toFixed(2)) : barcMatch.ratioKwc;
    const ratioStructureCostPerKwc = Math.round(ratioStructureCostPerWc * 1000);

    // 3. Ratio Tarif / Surface
    const ratioCostPerM2 = floorArea > 0 ? Math.round(totalBuildingCost / floorArea) : barcMatch.ratioM2;

    return (
        <div className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 text-slate-800 space-y-3.5 ${className}`}>
            {/* Header Nomenclature Officielle */}
            <div className="border-b border-slate-100 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                                {isCustom ? 'Configuration Personnalisée' : 'Gamme & Modèle Officiel'}
                            </span>
                            <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                                {isCustom ? 'Bâtiment Sur-Mesure' : gammeName}
                            </h3>
                        </div>
                    </div>

                    {/* En haut à droite : Code du bâtiment (ex: C10) */}
                    {!isCustom && buildingCode ? (
                        <div className="flex flex-col items-end">
                            <span className="text-xs sm:text-sm font-black bg-blue-600 text-white px-2.5 py-1 rounded-lg shadow-sm font-mono tracking-wide">
                                {buildingCode}
                            </span>
                        </div>
                    ) : (
                        <span className="text-xs font-black bg-slate-800 text-white px-2.5 py-1 rounded-lg shadow-sm">
                            {floorArea} m²
                        </span>
                    )}
                </div>

                {/* Juste en dessous : Équivalence Barconnière à gauche + Surface en gras à droite */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                    {!isCustom && equivalenceCode ? (
                        <div className="flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-mono text-xs font-bold border border-slate-200">
                            <span>{equivalenceCode}</span>
                        </div>
                    ) : isCustom ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Grille sur-mesure
                        </span>
                    ) : <div />}

                    {!isCustom && (
                        <span className="text-slate-900 font-black text-xs sm:text-sm font-mono">
                            {floorArea} m²
                        </span>
                    )}
                </div>
            </div>

            {/* Grid 1 : Dimensions & Structure */}
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-blue-600" /> Dimensions
                    </span>
                    <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {length.toFixed(1)}m × {totalWidth.toFixed(1)}m
                    </p>
                    <p className="text-[11px] text-slate-500">
                        {barcMatch.travees || `${config.bayCount || 4} travées de ${config.baySpacing || 7.5}m`}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" /> Hauteurs & Pente
                    </span>
                    <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        Sablière : {barcMatch.sabliere || `${Number(config.eaveHeight || 4).toFixed(1)}m`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                        Faîtage : {barcMatch.faitage || `${Number(config.ridgeHeight || 7.4).toFixed(1)}m`}
                    </p>
                </div>
            </div>

            {/* Grid 2 : Centrale Solaire & Puissance */}
            {config.hasSolar && (
                <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[11px] text-amber-800 font-bold uppercase flex items-center gap-1.5">
                            <Sun className="w-4 h-4 text-amber-600" /> Centrale Photovoltaïque
                        </span>
                        <p className="font-black text-amber-950 text-sm sm:text-base">
                            ⚡ {installedKwc.toFixed(1)} kWc
                        </p>
                        <p className="text-[11px] text-amber-800 font-medium">
                            {panelCount} modules • ~{estimatedProductionKwh.toLocaleString('fr-FR')} kWh/an (Hypothèse 1150 kWh/kWc)
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-[11px] text-slate-500 block">Tarif Centrale PV</span>
                        <strong className="text-xs sm:text-sm font-black text-slate-900">
                            {pvInstallationCost.toLocaleString('fr-FR')} € HT
                        </strong>
                    </div>
                </div>
            )}

            {/* Grid 3 : Chiffrage Structure & Ratios */}
            <div className="space-y-2.5 border-t border-slate-100 pt-2.5">
                <div className="flex items-center justify-between bg-slate-100/80 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-slate-600" /> Tarif Structure Métallique :
                    </span>
                    <span className="font-black text-blue-900 text-sm sm:text-base">
                        {totalBuildingCost.toLocaleString('fr-FR')} € HT
                    </span>
                </div>

                {/* Ratios : Ligne 1 avec PV et Hors PV, Ligne 2 Ratio Surface */}
                {config.hasSolar ? (
                    <div className="space-y-2.5 bg-white p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-slate-500">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ratio Tarif / Puissance</span>
                                <strong className="text-slate-800 font-extrabold text-xs sm:text-sm flex items-baseline gap-1 mt-0.5">
                                    {ratioTotalCostPerWc.toFixed(2)} € <span className="text-[10px] font-normal text-slate-500">/ Wc</span>
                                    <span className="text-[10px] font-semibold text-slate-400">({ratioTotalCostPerKwc} €/kWc)</span>
                                </strong>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ratio Tarif / Puissance (Hors PV)</span>
                                <strong className="text-slate-700 font-extrabold text-xs sm:text-sm flex items-baseline gap-1 mt-0.5">
                                    {ratioStructureCostPerWc.toFixed(2)} € <span className="text-[10px] font-normal text-slate-500">/ Wc</span>
                                    <span className="text-[10px] font-normal text-slate-400">({ratioStructureCostPerKwc} €/kWc)</span>
                                </strong>
                            </div>
                        </div>
                        <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-slate-500">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Ratio Tarif / Surface</span>
                            <strong className="text-slate-800 font-extrabold text-xs sm:text-sm">
                                {ratioCostPerM2} € <span className="text-[10px] font-normal text-slate-500">/ m²</span>
                            </strong>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Ratio Tarif / Surface</span>
                        <strong className="text-slate-800 font-extrabold text-xs sm:text-sm">
                            {ratioCostPerM2} € <span className="text-[10px] font-normal text-slate-500">/ m²</span>
                        </strong>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BuildingSummaryCard;
