import React from 'react';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import { Building2, Sun, Coins, Ruler, Layers } from 'lucide-react';

export const BuildingSummaryCard = ({ isAcama = false, className = '' }) => {
    const config = useConfiguratorValues();

    const length = Number(config.length || 30.0);
    const mainWidth = Number(config.width || 20.0);
    const leftExt = config.leftSide !== 'none' ? Number(config.leftWidth || 0) : 0;
    const rightExt = config.rightSide !== 'none' ? Number(config.rightWidth || 0) : 0;
    const totalWidth = mainWidth + leftExt + rightExt;

    const floorArea = Math.round(length * totalWidth);
    const roofArea = Math.round(floorArea * 1.08); // Surface développée avec pente

    // Nom nomenclature
    let nomenclatureName = 'ECO-EVO Bâtiment Standard';
    const bType = config.buildingType || 'symetrique';
    if (isAcama) {
        if (bType === 'epona') nomenclatureName = `ACAMA EPONA (${config.selectedEponaModel || '45'})`;
        else if (bType === 'epona_talian5') nomenclatureName = `ACAMA TALIAN 5 (${config.selectedTalian5Model || 'STD'})`;
        else nomenclatureName = `ACAMA TALIAN (${totalWidth.toFixed(1)}m)`;
    } else if (config.configMode === 'custom') {
        nomenclatureName = `Bâtiment Sur-Mesure (${totalWidth.toFixed(1)}m × ${length.toFixed(1)}m)`;
    } else if (bType.includes('ombriere')) {
        nomenclatureName = `Ombrière Photovoltaïque (${totalWidth.toFixed(1)}m × ${length.toFixed(1)}m)`;
    } else if (bType.startsWith('asym')) {
        nomenclatureName = `ECO-EVO Asymétrique A${totalWidth.toFixed(1)}m`;
    } else if (bType.startsWith('mono')) {
        nomenclatureName = `ECO-EVO Monopente M${totalWidth.toFixed(1)}m`;
    } else {
        nomenclatureName = `ECO-EVO Symétrique S${totalWidth.toFixed(1)}m`;
    }

    // Puissance solaire
    const installedKwc = Number(config.solarStats?.power || (floorArea * 0.20)) || 0;
    const panelCount = Number(config.solarStats?.count || Math.round((installedKwc * 1000) / (isAcama ? 460 : 465))) || 0;
    const estimatedProductionKwh = Math.round(installedKwc * 1150);

    // Chiffrage Gros-Œuvre & PV
    const charpenteCost = Math.round(floorArea * 75);
    const couvertureCost = Math.round(roofArea * 28);
    const fondationsCost = Math.round(floorArea * 25);
    const totalBuildingCost = charpenteCost + couvertureCost + fondationsCost;

    const pvCostPerWc = 0.55;
    const pvInstallationCost = Math.round(installedKwc * 1000 * pvCostPerWc + 15000);
    const totalProjectInvestment = totalBuildingCost + pvInstallationCost;

    const soulteInvestisseur = Math.round(installedKwc * 180);
    const resteACharge = Math.max(0, totalBuildingCost - soulteInvestisseur);

    const ratioCostPerKwc = installedKwc > 0 ? Math.round(totalBuildingCost / installedKwc) : 0;
    const ratioCostPerM2 = floorArea > 0 ? Math.round(totalBuildingCost / floorArea) : 0;

    return (
        <div className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 text-slate-800 text-xs space-y-3.5 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 text-xs tracking-tight">Synthèse des Chiffres du Bâtiment</h3>
                        <p className="text-[10px] text-slate-500 font-medium">{nomenclatureName}</p>
                    </div>
                </div>
                <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                    {floorArea} m²
                </span>
            </div>

            {/* Grid 1 : Dimensions & Structure */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Ruler className="w-3 h-3 text-blue-600" /> Dimensions
                    </span>
                    <p className="font-extrabold text-slate-800 text-[11px]">
                        {length.toFixed(1)}m × {totalWidth.toFixed(1)}m
                    </p>
                    <p className="text-[9.5px] text-slate-500">
                        {config.bayCount || 5} travées de {config.baySpacing || 6}m
                    </p>
                </div>

                <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3 text-indigo-600" /> Hauteurs & Pente
                    </span>
                    <p className="font-extrabold text-slate-800 text-[11px]">
                        Égout : {Number(config.eaveHeight || 4).toFixed(1)}m • Pente : {config.roofPitch || 15}°
                    </p>
                    <p className="text-[9.5px] text-slate-500">
                        Faîtage : ~{Number(config.ridgeHeight || 7.4).toFixed(1)}m
                    </p>
                </div>
            </div>

            {/* Grid 2 : Centrale Solaire & Puissance */}
            {config.hasSolar && (
                <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between">
                    <div className="space-y-0.5">
                        <span className="text-[10px] text-amber-800 font-bold uppercase flex items-center gap-1">
                            <Sun className="w-3.5 h-3.5 text-amber-600" /> Centrale Photovoltaïque
                        </span>
                        <p className="font-black text-amber-950 text-sm">
                            ⚡ {installedKwc.toFixed(2)} kWc
                        </p>
                        <p className="text-[10px] text-amber-700 font-medium">
                            {panelCount} modules ({isAcama ? '460' : '465'} Wc) • ~{estimatedProductionKwh.toLocaleString('fr-FR')} kWh/an
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Tarif Centrale PV</span>
                        <strong className="text-xs font-black text-slate-900">
                            {pvInstallationCost.toLocaleString('fr-FR')} € HT
                        </strong>
                    </div>
                </div>
            )}

            {/* Grid 3 : Chiffrage Structure & Ratios */}
            <div className="space-y-2 border-t border-slate-100 pt-2">
                <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-600 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-slate-500" /> Tarif Structure Métallique :
                    </span>
                    <span className="font-black text-slate-900 text-xs">
                        {totalBuildingCost.toLocaleString('fr-FR')} € HT
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                    <div>
                        <span>Ratio Tarif / Puissance :</span>
                        <strong className="block text-slate-800 font-bold text-[11px]">{ratioCostPerKwc.toLocaleString('fr-FR')} € / kWc</strong>
                    </div>
                    <div>
                        <span>Ratio Tarif / Surface :</span>
                        <strong className="block text-slate-800 font-bold text-[11px]">{ratioCostPerM2.toLocaleString('fr-FR')} € / m²</strong>
                    </div>
                </div>

                {/* Soulte & Reste à Charge */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                        <span className="text-[9.5px] font-bold text-emerald-800 uppercase block">Soulte Investisseur</span>
                        <strong className="text-xs font-black text-emerald-700">+{soulteInvestisseur.toLocaleString('fr-FR')} €</strong>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
                        <span className="text-[9.5px] font-bold text-blue-800 uppercase block">Reste à Charge</span>
                        <strong className="text-xs font-black text-blue-900">{resteACharge.toLocaleString('fr-FR')} € HT</strong>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuildingSummaryCard;
