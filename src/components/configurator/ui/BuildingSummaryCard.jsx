import React from 'react';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import { Building2, Sun, Coins, Ruler, Layers, Tag, CheckCircle2 } from 'lucide-react';
import { findBarconniereBuilding } from '@/data/barconniereCatalog.js';

export const BuildingSummaryCard = ({ isAcama = false, className = '' }) => {
    const config = useConfiguratorValues();

    const length = Number(config.length || 30.0);
    const mainWidth = Number(config.width || 15.0);
    const leftExt = config.leftSide !== 'none' ? Number(config.leftWidth || 0) : 0;
    const rightExt = config.rightSide !== 'none' ? Number(config.rightWidth || 0) : 0;
    const totalWidth = mainWidth + leftExt + rightExt;

    const floorArea = Math.round(length * totalWidth);

    // Recherche automatique dans le catalogue officiel Barconnière
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
    const modeleId = barcMatch.id;
    const equivalenceCode = barcMatch.code;

    // Puissance solaire
    const installedKwc = Number(config.solarStats?.power) || barcMatch.kwc || Math.round(floorArea * 0.20);
    const panelCount = Number(config.solarStats?.count) || Math.round((installedKwc * 1000) / (isAcama ? 460 : 465));
    const estimatedProductionKwh = Math.round(installedKwc * 1150);

    // Chiffrage officiel Barconnière
    const totalBuildingCost = barcMatch.tarif;

    // Ratios officiels
    const ratioCostPerWc = barcMatch.ratioKwc;
    const ratioCostPerKwc = Math.round(ratioCostPerWc * 1000);
    const ratioCostPerM2 = barcMatch.ratioM2;

    // Chiffrage PV & Économique
    const pvCostPerWc = 0.55;
    const pvInstallationCost = Math.round(installedKwc * 1000 * pvCostPerWc + 15000);
    const totalProjectInvestment = totalBuildingCost + pvInstallationCost;

    // Soulte Investisseur (180 € / kWc) et Reste à Charge
    const soulteInvestisseur = Math.round(installedKwc * 180);
    const resteACharge = Math.max(0, totalBuildingCost - soulteInvestisseur);

    return (
        <div className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 text-slate-800 text-xs space-y-3 ${className}`}>
            {/* Header Nomenclature Officielle Barconnière */}
            <div className="border-b border-slate-100 pb-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">Gamme & Modèle Officiel</span>
                            <h3 className="font-black text-slate-900 text-xs tracking-tight flex items-center gap-1.5">
                                {gammeName} <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/60 font-mono text-[11px]">#{modeleId}</span>
                            </h3>
                        </div>
                    </div>
                    <span className="text-[10.5px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                        {floorArea} m²
                    </span>
                </div>

                {/* Badges d'Identification / Correspondance Barconnière */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border border-slate-200">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <span>Barconnière : {equivalenceCode}</span>
                    </div>
                    {barcMatch.exactMatch ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Grille Standard
                        </span>
                    ) : (
                        <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Ajusté Sur-Mesure
                        </span>
                    )}
                </div>
            </div>

            {/* Grid 1 : Dimensions & Structure */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                    <span className="text-[9.5px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Ruler className="w-3 h-3 text-blue-600" /> Dimensions
                    </span>
                    <p className="font-extrabold text-slate-800 text-[11px]">
                        {length.toFixed(1)}m × {totalWidth.toFixed(1)}m
                    </p>
                    <p className="text-[9.5px] text-slate-500">
                        {barcMatch.travees || `${config.bayCount || 4} travées de ${config.baySpacing || 7.5}m`}
                    </p>
                </div>

                <div className="space-y-0.5">
                    <span className="text-[9.5px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3 text-indigo-600" /> Hauteurs & Pente
                    </span>
                    <p className="font-extrabold text-slate-800 text-[11px]">
                        Sablière : {barcMatch.sabliere || `${Number(config.eaveHeight || 4).toFixed(1)}m`}
                    </p>
                    <p className="text-[9.5px] text-slate-500">
                        Faîtage : {barcMatch.faitage || `${Number(config.ridgeHeight || 7.4).toFixed(1)}m`}
                    </p>
                </div>
            </div>

            {/* Grid 2 : Centrale Solaire & Puissance */}
            {config.hasSolar && (
                <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between">
                    <div className="space-y-0.5">
                        <span className="text-[9.5px] text-amber-800 font-bold uppercase flex items-center gap-1">
                            <Sun className="w-3.5 h-3.5 text-amber-600" /> Centrale Photovoltaïque
                        </span>
                        <p className="font-black text-amber-950 text-sm">
                            ⚡ {installedKwc.toFixed(1)} kWc
                        </p>
                        <p className="text-[9.5px] text-amber-700 font-medium">
                            {panelCount} modules • ~{estimatedProductionKwh.toLocaleString('fr-FR')} kWh/an
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-[9.5px] text-slate-500 block">Tarif Centrale PV</span>
                        <strong className="text-xs font-black text-slate-900">
                            {pvInstallationCost.toLocaleString('fr-FR')} € HT
                        </strong>
                    </div>
                </div>
            )}

            {/* Grid 3 : Chiffrage Structure & Ratios Barconnière */}
            <div className="space-y-2 border-t border-slate-100 pt-2">
                <div className="flex items-center justify-between bg-slate-100/70 p-2 rounded-xl border border-slate-200/60">
                    <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-slate-600" /> Tarif Structure Métallique :
                    </span>
                    <span className="font-black text-blue-900 text-sm">
                        {totalBuildingCost.toLocaleString('fr-FR')} € HT
                    </span>
                </div>

                {/* Ratios Tarif/Puissance (Col P) et Tarif/Surface (Col Q) */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                    <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Ratio Tarif / Puissance</span>
                        <strong className="text-slate-800 font-extrabold text-[11px] flex items-baseline gap-1">
                            {ratioCostPerWc.toFixed(2)} € <span className="text-[9.5px] font-normal text-slate-500">/ Wc</span>
                            <span className="text-[9px] font-semibold text-slate-400">({ratioCostPerKwc} €/kWc)</span>
                        </strong>
                    </div>
                    <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Ratio Tarif / Surface (Col Q)</span>
                        <strong className="text-slate-800 font-extrabold text-[11px]">
                            {ratioCostPerM2} € <span className="text-[9.5px] font-normal text-slate-500">/ m²</span>
                        </strong>
                    </div>
                </div>

                {/* Soulte & Reste à Charge */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                        <span className="text-[9px] font-bold text-emerald-800 uppercase block">Soulte Investisseur</span>
                        <strong className="text-xs font-black text-emerald-700">+{soulteInvestisseur.toLocaleString('fr-FR')} €</strong>
                        <span className="text-[8.5px] text-emerald-600 block mt-0.5">Basée sur 180 € / kWc</span>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
                        <span className="text-[9px] font-bold text-blue-800 uppercase block">Reste à Charge</span>
                        <strong className="text-xs font-black text-blue-900">{resteACharge.toLocaleString('fr-FR')} € HT</strong>
                        <span className="text-[8.5px] text-blue-600 block mt-0.5">Structure - Soulte</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuildingSummaryCard;
