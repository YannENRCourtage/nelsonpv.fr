import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfiguratorValues, useConfiguratorActions, EPONA_MODELS, TALIAN_MODELS, TALIAN_1_MODELS, TALIAN_3_MODELS, TALIAN_5_MODELS } from '@/stores/useConfiguratorStore.js';
import { BATITECH_MODELS } from '@/data/sechoirBatitechModels.js';

const TYPE_WIDTHS_MAP = {
    'symetrique': [15.0, 18.6, 22.3, 26.0, 29.8, 33.5],
    'epona': [23.6],
    'epona_talian5': [23.6],
    'asymetrique_1': [16.4, 20.0],
    'asymetrique_2': [25.5, 29.1],
    'monopente': [12.7, 16.4],
    'ombriere_vl_simple_gauche': [6.9],
    'ombriere_vl_simple_droite': [6.9],
    'ombriere_vl_double': [9.1, 11.3],
    'ombriere_pl': [15.8, 20.2, 24.6]
};

export function ControlPanel({ isAcama = false, selectedProject = null, activeBuilding = null, onUpdateBuilding = null }) {
    const navigate = useNavigate();
    // NEW: Split hooks with destructuring to maintain variable scope compatibility
    const storeValues = useConfiguratorValues();
    const {
        eaveHeight,
        roofPitch,
        availableWidths,
        hasSolar,
        solarStats,
        selectedEponaModel,
        selectedTalianModel,
        selectedTalian1Model,
        selectedTalian3Model,
        selectedTalian5Model,
        selectedBatitechModel,
        configMode,
        customParams,
    } = storeValues;

    // Use activeBuilding values if provided (isolated tab), otherwise fallback to store
    const width = activeBuilding?.width !== undefined ? activeBuilding.width : storeValues.width;
    const buildingType = activeBuilding?.buildingType || storeValues.buildingType;
    const baySpacing = activeBuilding?.baySpacing !== undefined ? activeBuilding.baySpacing : storeValues.baySpacing;
    const bayCount = activeBuilding?.bayCount !== undefined ? activeBuilding.bayCount : storeValues.bayCount;
    const leftSide = activeBuilding?.leftSide || storeValues.leftSide;
    const rightSide = activeBuilding?.rightSide || storeValues.rightSide;

    const effectiveAvailableWidths = TYPE_WIDTHS_MAP[buildingType] || availableWidths || [20.0];

    const {
        setWidth,
        setBaySpacing,
        incrementBayCount,
        decrementBayCount,
        setBuildingType,
        setLeftSide,
        setRightSide,
        toggleDimensions,
        toggleSolar,
        reset,
        setEponaModel,
        setTalianModel,
        setTalian1Model,
        setTalian3Model,
        setTalian5Model,
        setBatitechModel,
        setConfigMode,
        updateCustomParams,
    } = useConfiguratorActions();

    const handleTypeSelection = (newType) => {
        setBuildingType(newType);
        if (onUpdateBuilding) {
            const defW = (TYPE_WIDTHS_MAP[newType] && TYPE_WIDTHS_MAP[newType][0]) || 20.0;
            const isOmb = newType.startsWith('ombriere');
            const isMono = newType === 'monopente';
            const isAsym = newType.startsWith('asymetrique');
            const defEave = (isAsym || isMono) ? 4.0 : (newType === 'ombriere_pl' ? 5.08 : (isOmb ? 3.0 : 5.5));
            const defPitch = (isAsym || isMono) ? 15 : 10;
            onUpdateBuilding({
                buildingType: newType,
                width: defW,
                roofPitch: defPitch,
                eaveHeight: defEave,
                leftSide: isOmb ? 'none' : (activeBuilding?.leftSide || leftSide),
                rightSide: isOmb ? 'none' : (activeBuilding?.rightSide || rightSide)
            });
        }
    };

    const handleWidthSelection = (newW) => {
        setWidth(newW);
        if (onUpdateBuilding) {
            onUpdateBuilding({ width: Number(newW) });
        }
    };

    const handleBaySpacingSelection = (sp) => {
        setBaySpacing(sp);
        if (onUpdateBuilding) {
            onUpdateBuilding({ baySpacing: sp });
        }
    };

    const handleIncrementBay = () => {
        incrementBayCount();
        if (onUpdateBuilding) {
            const curBays = activeBuilding?.bayCount !== undefined ? activeBuilding.bayCount : bayCount;
            onUpdateBuilding({ bayCount: curBays + 1 });
        }
    };

    const handleDecrementBay = () => {
        decrementBayCount();
        if (onUpdateBuilding) {
            const curBays = activeBuilding?.bayCount !== undefined ? activeBuilding.bayCount : bayCount;
            onUpdateBuilding({ bayCount: Math.max(4, curBays - 1) });
        }
    };

    const handleLeftSideToggle = (side) => {
        setLeftSide(side);
        if (onUpdateBuilding) {
            onUpdateBuilding({ 
                leftSide: side,
                leftWidth: side === 'appentis' ? 9.3 : (side === 'auvent' ? 4.0 : 0)
            });
        }
    };

    const handleRightSideToggle = (side) => {
        setRightSide(side);
        if (onUpdateBuilding) {
            onUpdateBuilding({ 
                rightSide: side,
                rightWidth: side === 'appentis' ? 9.3 : (side === 'auvent' ? 4.0 : 0)
            });
        }
    };

    // ACAMA mode: show EPONA model selector when buildingType is 'epona'
    const isAcamaTalian4 = isAcama && buildingType === 'symetrique' && !!TALIAN_MODELS[selectedTalianModel] && Math.abs(width - 13.7) < 0.1;
    const isAcamaTalian1 = isAcama && buildingType === 'symetrique' && !!TALIAN_1_MODELS[selectedTalian1Model] && Math.abs(width - 18.8) < 0.1;
    const isAcamaTalian3 = isAcama && buildingType === 'symetrique' && !!TALIAN_3_MODELS[selectedTalian3Model] && Math.abs(width - 17.5) < 0.1;
    const isAcamaTalian = isAcamaTalian4 || isAcamaTalian1 || isAcamaTalian3;

    const isAcamaAsymetrique = isAcama && (buildingType === 'epona' || buildingType === 'epona_talian5' || buildingType === 'asymetrique_2');
    const isAcamaTalian5 = isAcama && buildingType === 'epona_talian5' && !!TALIAN_5_MODELS[selectedTalian5Model];
    const isAcamaEpona = isAcama && buildingType === 'epona';

    // When ACAMA user picks 'Asymétrique', auto-load EPONA_45 if not already an asymmetric type
    const handleAcamaBuildingType = (value) => {
        if (value === 'asymetrique') {
            // Default to Epona
            setEponaModel(selectedEponaModel || 'EPONA_45');
        } else if (value === 'symetrique') {
            // Default to Talian 4 if coming from other type
            setTalianModel(selectedTalianModel || 'TALIAN_4_MIN');
        } else {
            setBuildingType('symetrique');
        }
    };

    return (
        <div className="control-panel bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-slate-200">

            {/* HEADER */}
            <div className="mb-4 border-b border-slate-100 pb-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setConfigMode('predefined');
                            if (onUpdateBuilding) onUpdateBuilding({ configMode: 'predefined' });
                        }}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${configMode === 'predefined' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        {isAcama ? "Gamme ACAMA" : "ECO-EVO"}
                    </button>
                    {!isAcama && (
                        <button
                            onClick={() => {
                                setConfigMode('batitech');
                                if (onUpdateBuilding) onUpdateBuilding({ configMode: 'batitech' });
                            }}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${configMode === 'batitech' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            BatiTech®
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setConfigMode('custom');
                            if (onUpdateBuilding) onUpdateBuilding({ configMode: 'custom' });
                        }}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${configMode === 'custom' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        Sur-mesure
                    </button>
                </div>
            </div>

            {configMode === 'predefined' ? (
                <>

            {/* ========== TYPE (2/3) ET LARGEUR (1/3) SUR UNE SEULE LIGNE ========== */}
            <div className="param-group mb-4 grid grid-cols-3 gap-2">
                {/* TYPE DE BÂTIMENT (2/3) */}
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Type
                    </label>
                    <select
                        value={isAcama ? (isAcamaAsymetrique ? 'asymetrique' : 'symetrique') : buildingType}
                        onChange={(e) => isAcama ? handleAcamaBuildingType(e.target.value) : handleTypeSelection(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-semibold text-xs bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    >
                        <option value="symetrique">Symétrique</option>
                        {isAcama ? (
                            <option value="asymetrique">Asymétrique</option>
                        ) : (
                            <>
                                <option value="asymetrique_1">Asymétrique 1 zone</option>
                                <option value="asymetrique_2">Asymétrique 2 zones</option>
                                <option value="monopente">Monopente</option>
                                <option value="ombriere_vl_simple_gauche">Ombrière VL simple gauche</option>
                                <option value="ombriere_vl_simple_droite">Ombrière VL simple droite</option>
                                <option value="ombriere_vl_double">Ombrière VL double</option>
                                <option value="ombriere_pl">Ombrière PL</option>
                            </>
                        )}
                    </select>
                </div>

                {/* LARGEUR DU BÂTIMENT (1/3) */}
                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Largeur
                    </label>
                    <select
                        value={width}
                        onChange={(e) => handleWidthSelection(Number(e.target.value))}
                        disabled={isAcama}
                        className={`w-full px-3 py-2.5 border border-slate-300 rounded-lg font-semibold text-xs bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                            isAcama ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                        }`}
                    >
                        {effectiveAvailableWidths?.map((w) => (
                            <option key={w} value={w}>{w} m</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ========== OPTIONS STRUCTURE - EXTENSIONS (Compact) — masqué pour ACAMA EPONA/TALIAN ========== */}
            {
                !buildingType.startsWith('ombriere') && !isAcama && buildingType !== 'epona' && (
                    <div className="param-group mb-4">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-2">
                            <span>🏗️</span> Extensions
                        </label>
                        <div className="space-y-2 p-2 border border-slate-300 rounded-lg bg-white max-w-sm">
                            {/* Côté Gauche */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 w-8 uppercase">Gch</span>
                                <div className="flex-1 flex gap-1">
                                    <button
                                        onClick={() => handleLeftSideToggle(leftSide === 'auvent' ? 'none' : 'auvent')}
                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${leftSide === 'auvent'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        Auvent
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (buildingType !== 'monopente' && !buildingType.startsWith('asymetrique')) {
                                                handleLeftSideToggle(leftSide === 'appentis' ? 'none' : 'appentis');
                                            }
                                        }}
                                        disabled={buildingType === 'monopente' || buildingType.startsWith('asymetrique')}
                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${leftSide === 'appentis'
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                            : (buildingType === 'monopente' || buildingType.startsWith('asymetrique'))
                                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed pointer-events-none opacity-60'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        Appentis
                                    </button>
                                </div>
                            </div>
                            {/* Côté Droit */}
                            <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                                <span className="text-[10px] font-bold text-slate-400 w-8 uppercase">Drt</span>
                                <div className="flex-1 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleRightSideToggle(rightSide === 'auvent' ? 'none' : 'auvent')}
                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${rightSide === 'auvent'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        Auvent
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (buildingType !== 'monopente' && !buildingType.startsWith('asymetrique')) {
                                                handleRightSideToggle(rightSide === 'appentis' ? 'none' : 'appentis');
                                            }
                                        }}
                                        disabled={buildingType === 'monopente' || buildingType.startsWith('asymetrique')}
                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${rightSide === 'appentis'
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                            : (buildingType === 'monopente' || buildingType.startsWith('asymetrique'))
                                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed pointer-events-none opacity-60'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        Appentis
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ========== ESPACEMENT & NOMBRE DE TRAVÉES (SUR LA MÊME LIGNE) ========== */}
            {
                !isAcama && (
                    <div className="param-group mb-4 grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                Espacement Travées
                            </label>
                            <div className="inline-flex rounded-lg overflow-hidden border-2 border-slate-300 w-full">
                                <button
                                    onClick={() => handleBaySpacingSelection(6)}
                                    className={`flex-1 py-1.5 font-bold text-xs transition-all ${baySpacing === 6 ? 'bg-green-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                                >
                                    6m
                                </button>
                                <button
                                    onClick={() => handleBaySpacingSelection(7.5)}
                                    className={`flex-1 py-1.5 font-bold text-xs transition-all ${baySpacing === 7.5 ? 'bg-green-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                                >
                                    7.5m
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                Nombre de Travées
                            </label>
                            <div className="flex items-center justify-between gap-1 border-2 border-slate-300 rounded-lg p-0.5 bg-white">
                                <button
                                    onClick={handleDecrementBay}
                                    disabled={bayCount <= 4}
                                    className={`w-7 h-7 rounded-md font-bold text-base transition-all flex items-center justify-center ${bayCount > 4 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                >
                                    −
                                </button>
                                <div className="text-center px-1">
                                    <span className="text-base font-bold text-slate-900 leading-none">{bayCount}</span>
                                </div>
                                <button
                                    onClick={handleIncrementBay}
                                    className="w-7 h-7 rounded-md bg-green-500 text-white font-bold text-base hover:bg-green-600 transition-all flex items-center justify-center"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ========== PARAMÈTRES FIXES (COMPACT) ========== */}
            <div className="fixed-params mb-3 p-2.5 bg-slate-100/90 rounded-lg border border-slate-200">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Paramètres Fixes
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0"></div>
                        <span className="text-slate-700 text-xs">Pente: <strong>{isAcamaTalian4 ? 6 : (isAcamaTalian1 ? 14 : (buildingType?.startsWith('asymetrique') ? 15 : roofPitch))}°</strong></span>
                    </div>
                    {!buildingType?.startsWith('ombriere') && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-purple-500 rounded-full shrink-0"></div>
                            <span className="text-slate-700 text-xs">H. Égout: <strong>{buildingType?.startsWith('asymetrique') ? 4 : eaveHeight}m</strong></span>
                        </div>
                    )}
                    {isAcama && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                            <span className="text-slate-700 text-xs">Panneau: <strong>460 Wc</strong></span>
                        </div>
                    )}
                </div>
            </div>

            {/* ========== OPTION SOLAIRE (COMPACT SANS SCROLL VERTICAL) ========== */}
            <div className="param-group mb-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Option Solaire
                </label>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            toggleSolar();
                            if (onUpdateBuilding) onUpdateBuilding({ hasSolar: !hasSolar });
                        }}
                        className={`
                            w-1/2 py-2 px-2 rounded-lg font-bold text-xs leading-snug transition-all duration-200 shadow-xs border text-center
                            ${hasSolar
                                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }
                        `}
                    >
                        Couverture<br />Solaire PV
                    </button>

                    {hasSolar ? (
                        <div className="w-1/2 py-1.5 px-2 bg-amber-50 border border-amber-200 rounded-lg flex flex-col justify-center text-center">
                            <div className="text-sm font-black text-amber-950 leading-tight">
                                {solarStats?.power?.toFixed(2)} <span className="text-[10px] font-bold text-amber-800">kWc</span>
                            </div>
                            <div className="text-[10px] font-semibold text-amber-700 leading-none mt-0.5">
                                {solarStats?.count} panneaux
                            </div>
                        </div>
                    ) : (
                        <div className="w-1/2 py-2.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-400 text-[11px] font-semibold">
                            Sans PV
                        </div>
                    )}
                </div>
            </div>

                </>
            ) : configMode === 'batitech' ? (
                <div className="batitech-config-form space-y-4">
                    {/* CHOIX DU MODÈLE BATITECH */}
                    <div className="param-group">
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                            Modèle BatiTech®
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['BT-3.1.15', 'BT-6.2.15', 'BT-8.3.15'].map((mId) => {
                                const m = BATITECH_MODELS[mId] || {};
                                const isSelected = selectedBatitechModel === mId;
                                return (
                                    <button
                                        key={mId}
                                        type="button"
                                        onClick={() => {
                                            setBatitechModel(mId);
                                            if (onUpdateBuilding) {
                                                const bayCount = m.zones === 1 ? 3 : (m.zones === 2 ? 6 : 8);
                                                onUpdateBuilding({
                                                    configMode: 'batitech',
                                                    selectedBatitechModel: mId,
                                                    buildingType: 'asymetrique_1',
                                                    width: 20.0,
                                                    baySpacing: 6.0,
                                                    bayCount: bayCount,
                                                    length: m.length || (bayCount * 6.0),
                                                    eaveHeight: 4.0,
                                                    roofPitch: 15,
                                                    hasSolar: true
                                                });
                                            }
                                        }}
                                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-between ${
                                            isSelected
                                                ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                                        }`}
                                    >
                                        <div className="font-black text-[11px] leading-tight">{m.name}</div>
                                        <div className={`text-[10px] mt-1 font-semibold ${isSelected ? 'text-amber-100' : 'text-slate-500'}`}>
                                            {m.dimensions}
                                        </div>
                                        <div className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-amber-600'}`}>
                                            {m.puissanceKwc} kWc
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* DÉTAILS TECHNIQUES FIXES AS9.2 DU SÉCHOIR */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                        <div className="font-bold text-slate-800 flex items-center justify-between gap-2">
                            <span>Base Structure : <strong className="text-amber-700">AS9.2</strong></span>
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">Séchoir Solaire</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                            <div>• Sablière Sud : <strong>4.00 m</strong></div>
                            <div>• Faîtage : <strong>8.40 m</strong></div>
                            <div>• Sablière Nord : <strong>7.40 m</strong></div>
                            <div>• Pente de toiture : <strong>15°</strong></div>
                            <div>• Travées : <strong>6.00 m</strong></div>
                            <div>• Largeur : <strong>20.00 m</strong></div>
                        </div>
                    </div>

                    {/* ÉQUIPEMENTS & BARDAGE INCLUS */}
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="font-bold text-amber-950 flex items-center gap-1.5">
                            <span>🌾 Équipements Séchage Inclus :</span>
                        </div>
                        <ul className="text-[11px] text-amber-900 space-y-1 pl-1">
                            <li className="flex items-start gap-1.5">
                                <span className="text-amber-600 font-black shrink-0">✓</span>
                                <div><strong>Bardage 3 faces :</strong> Sud, Est et Ouest</div>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-amber-600 font-black shrink-0">✓</span>
                                <div><strong className="whitespace-nowrap">Face Nord ouverte :</strong> Accès direct exploitation et manutention</div>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <span className="text-amber-600 font-black">✓</span>
                                <strong>Local ventilateur :</strong> 2m × 4m avec ventilateur Cogen'Air®
                            </li>
                            <li className="flex items-center gap-1.5">
                                <span className="text-amber-600 font-black">✓</span>
                                <strong>Toiture Cogen'Air® :</strong> Panneaux thermovoltaïques
                            </li>
                        </ul>
                    </div>

                    {/* OPTION COUVERTURE SOLAIRE */}
                    <div className="param-group pt-1">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Option Solaire
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={toggleSolar}
                                className={`w-1/2 py-2.5 px-2 rounded-lg font-bold text-xs transition-all border ${
                                    hasSolar
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="leading-tight">Couverture</div>
                                <div className="leading-tight">Solaire PV</div>
                            </button>

                            {hasSolar ? (
                                <div className="w-1/2 py-1.5 px-2 bg-amber-50 border border-amber-200 rounded-lg flex flex-col justify-center text-center">
                                    <div className="text-sm font-black text-amber-950 leading-tight">
                                        {solarStats?.power?.toFixed(2)} <span className="text-[10px] font-bold text-amber-800">kWc</span>
                                    </div>
                                    <div className="text-[10px] font-semibold text-amber-700 leading-none mt-0.5">
                                        {solarStats?.count} panneaux Cogen'Air®
                                    </div>
                                </div>
                            ) : (
                                <div className="w-1/2 py-2.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-400 text-[11px] font-semibold">
                                    Sans PV
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="custom-config-form space-y-5">
                    {/* FORMULAIRE SUR-MESURE */}
                    <div className="param-group">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Type de bâtiment</label>
                        <select
                            value={customParams.buildingType || 'symetrique'}
                            onChange={(e) => updateCustomParams({ buildingType: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                        >
                            <option value="symetrique">Symétrique</option>
                            <option value="asymetrique">Asymétrique</option>
                            <option value="monopente">Monopente</option>
                        </select>
                    </div>

                    {customParams.buildingType === 'asymetrique' && (
                        <div className="param-group">
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Proportion</label>
                            <select
                                value={customParams.proportion || '1/2-1/2'}
                                onChange={(e) => updateCustomParams({ proportion: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                            >
                                <option value="1/6-5/6">1/6 - 5/6</option>
                                <option value="1/5-4/5">1/5 - 4/5</option>
                                <option value="1/4-3/4">1/4 - 3/4</option>
                                <option value="1/3-2/3">1/3 - 2/3</option>
                                <option value="1/2-1/2">1/2 - 1/2</option>
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="param-group">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Largeur (m)</label>
                            <input
                                type="number"
                                value={customParams.width !== undefined && !isNaN(customParams.width) ? customParams.width : 15}
                                onChange={(e) => updateCustomParams({ width: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                        <div className="param-group">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Longueur (m)</label>
                            <div className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-sm font-bold text-slate-600">
                                {(((Number(customParams.bayCount) || 4) * (Number(customParams.baySpacing) || 7.5))).toFixed(2)}m
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="param-group">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Largeur travée (m)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={customParams.baySpacing !== undefined && !isNaN(customParams.baySpacing) ? customParams.baySpacing : 7.5}
                                onChange={(e) => updateCustomParams({ baySpacing: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                        <div className="param-group">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nb travées</label>
                            <input
                                type="number"
                                value={customParams.bayCount !== undefined && !isNaN(customParams.bayCount) ? customParams.bayCount : 4}
                                onChange={(e) => updateCustomParams({ bayCount: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    <div className="param-group">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Hauteur faîtage (m)</label>
                        <input
                            type="number"
                            step="0.05"
                            value={parseFloat((Number(customParams.ridgeHeight) || 5.0).toFixed(2))}
                            onChange={(e) => updateCustomParams({ ridgeHeight: Number(e.target.value) })}
                            className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm font-bold text-orange-700 focus:border-orange-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {customParams.buildingType !== 'monopente' && (
                            <div className="param-group">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase text-[10px]">Sablière Gauche (m)</label>
                                <input
                                    type="number"
                                    step="0.05"
                                    value={customParams.leftEaveHeight !== undefined && !isNaN(customParams.leftEaveHeight) ? customParams.leftEaveHeight : 3.5}
                                    onChange={(e) => updateCustomParams({ leftEaveHeight: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                            </div>
                        )}
                        <div className="param-group">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase text-[10px]">Sablière Droite (m)</label>
                            <input
                                type="number"
                                step="0.05"
                                value={customParams.rightEaveHeight !== undefined && !isNaN(customParams.rightEaveHeight) ? customParams.rightEaveHeight : 3.5}
                                onChange={(e) => updateCustomParams({ rightEaveHeight: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    {/* PENTES */}
                    <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Réglage des pentes</label>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Pente Gauche</label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={parseFloat((Number(customParams.leftPitch) || 11.31).toFixed(2))}
                                        onChange={(e) => updateCustomParams({ leftPitch: Number(e.target.value) })}
                                        className="w-16 px-2 py-1.5 border rounded-md text-sm font-medium"
                                    />
                                    <span className="text-xs font-bold text-slate-500">°</span>
                                    <span className="text-[10px] text-slate-400">≈ {(Math.tan((Number(customParams.leftPitch) || 11.31) * Math.PI / 180) * 100).toFixed(2)}%</span>
                                </div>
                            </div>

                            {customParams.buildingType !== 'monopente' && (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Pente Droite</label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={parseFloat((Number(customParams.rightPitch) || 11.31).toFixed(2))}
                                            onChange={(e) => updateCustomParams({ rightPitch: Number(e.target.value) })}
                                            className="w-16 px-2 py-1.5 border rounded-md text-sm font-medium"
                                        />
                                        <span className="text-xs font-bold text-slate-500">°</span>
                                        <span className="text-[10px] text-slate-400">≈ {(Math.tan((Number(customParams.rightPitch) || 11.31) * Math.PI / 180) * 100).toFixed(2)}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* EXTENSIONS SUR-MESURE */}
                    <div className="space-y-4 pt-2 border-t">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Extensions (Auvents / Appentis)</h4>
                        
                        {/* GAUCHE */}
                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-blue-800">Côté Gauche</span>
                                <div className="flex gap-1">
                                    {['none', 'auvent', 'appentis'].map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => updateCustomParams({ leftExtension: opt })}
                                            className={`text-[10px] font-bold py-1 px-2 rounded-md border transition-all ${
                                                customParams.leftExtension === opt
                                                    ? opt === 'none' ? 'bg-slate-200 text-slate-700 border-slate-300'
                                                    : opt === 'auvent' ? 'bg-sky-500 text-white border-sky-600'
                                                    : 'bg-violet-500 text-white border-violet-600'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {opt === 'none' ? 'Aucun' : opt === 'auvent' ? 'Auvent' : 'Appentis'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {customParams.leftExtension !== 'none' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Largeur (m)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customParams.leftExtWidth !== undefined && !isNaN(customParams.leftExtWidth) ? customParams.leftExtWidth : 4.0}
                                            onChange={(e) => updateCustomParams({ leftExtWidth: Number(e.target.value) })}
                                            className="w-full px-2 py-1 border rounded-md text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">H. Sablière (m)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            max={customParams.leftEaveHeight || 3.5}
                                            value={customParams.leftExtHeight !== undefined && !isNaN(customParams.leftExtHeight) ? customParams.leftExtHeight : 3.0}
                                            onChange={(e) => updateCustomParams({ leftExtHeight: Number(e.target.value) })}
                                            className="w-full px-2 py-1 border rounded-md text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DROITE */}
                        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-purple-800">Côté Droit</span>
                                <div className="flex gap-1">
                                    {['none', 'auvent', 'appentis'].map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => updateCustomParams({ rightExtension: opt })}
                                            className={`text-[10px] font-bold py-1 px-2 rounded-md border transition-all ${
                                                customParams.rightExtension === opt
                                                    ? opt === 'none' ? 'bg-slate-200 text-slate-700 border-slate-300'
                                                    : opt === 'auvent' ? 'bg-sky-500 text-white border-sky-600'
                                                    : 'bg-violet-500 text-white border-violet-600'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {opt === 'none' ? 'Aucun' : opt === 'auvent' ? 'Auvent' : 'Appentis'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {customParams.rightExtension !== 'none' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Largeur (m)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customParams.rightExtWidth !== undefined && !isNaN(customParams.rightExtWidth) ? customParams.rightExtWidth : 4.0}
                                            onChange={(e) => updateCustomParams({ rightExtWidth: Number(e.target.value) })}
                                            className="w-full px-2 py-1 border rounded-md text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">H. Sablière (m)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            max={customParams.rightEaveHeight || 3.5}
                                            value={customParams.rightExtHeight !== undefined && !isNaN(customParams.rightExtHeight) ? customParams.rightExtHeight : 3.0}
                                            onChange={(e) => updateCustomParams({ rightExtHeight: Number(e.target.value) })}
                                            className="w-full px-2 py-1 border rounded-md text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={toggleSolar}
                        className={`
                            w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm border mt-4
                            ${hasSolar
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }
                        `}
                    >
                        🚀 Activer Couverture Solaire PV
                    </button>
                    {hasSolar && (
                        <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-center">
                            <div className="text-[10px] text-yellow-700 font-bold mb-1">PUISSANCE ESTIMÉE</div>
                            <div className="text-xl font-black text-yellow-900">{solarStats?.power?.toFixed(2)} kWc</div>
                        </div>
                    )}
                </div>
            )}

            {/* Actions removed as requested */}
        </div>
    );
}
