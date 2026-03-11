import React from 'react';
import { useConfiguratorValues, useConfiguratorActions, EPONA_MODELS, TALIAN_MODELS, TALIAN_1_MODELS, TALIAN_3_MODELS, TALIAN_5_MODELS } from '@/stores/useConfiguratorStore.js';

export function ControlPanel({ isAcama = false }) {
    // NEW: Split hooks with destructuring to maintain variable scope compatibility
    const {
        width,
        eaveHeight,
        roofPitch,
        baySpacing,
        bayCount,
        availableWidths,
        buildingType,
        leftSide,
        rightSide,
        hasSolar,
        solarStats,
        selectedEponaModel,
        selectedTalianModel,
        selectedTalian1Model,
        selectedTalian3Model,
        selectedTalian5Model,
    } = useConfiguratorValues();

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
    } = useConfiguratorActions();

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
            <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Configurateur 2D/3D</h2>
                <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Bâtiment Métallique Pro</p>
            </div>

            {/* ========== TYPE DE BÂTIMENT ========== */}
            <div className="param-group mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Type de Bâtiment
                </label>
                <select
                    value={isAcama ? (isAcamaAsymetrique ? 'asymetrique' : 'symetrique') : buildingType}
                    onChange={(e) => isAcama ? handleAcamaBuildingType(e.target.value) : setBuildingType(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg font-semibold text-sm bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
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

            {/* ========== ACAMA: MODÈLE BÂTIMENT (EPONA/TALIAN 5) ========== */}
            {isAcamaAsymetrique && (
                <div className="param-group mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                        Modèle Bâtiment
                    </label>

                    {/* Model Switcher for Asymetrique (EPONA vs TALIAN 5) */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setEponaModel(selectedEponaModel)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${isAcamaEpona ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            EPONA
                        </button>
                        <button
                            onClick={() => setTalian5Model(selectedTalian5Model)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${isAcamaTalian5 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            TALIAN 5
                        </button>
                    </div>

                    <select
                        value={isAcamaEpona ? selectedEponaModel : selectedTalian5Model}
                        onChange={(e) => {
                            if (isAcamaEpona) setEponaModel(e.target.value);
                            else setTalian5Model(e.target.value);
                        }}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg font-semibold text-sm bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    >
                        {isAcamaEpona && Object.entries(EPONA_MODELS || {}).map(([key, model]) => (
                            <option key={key} value={key}>{model.label}</option>
                        ))}
                        {isAcamaTalian5 && Object.entries(TALIAN_5_MODELS || {}).map(([key, model]) => (
                            <option key={key} value={key}>{model.label}</option>
                        ))}
                    </select>

                    {/* Display fixed model characteristics */}
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800 space-y-1">
                        <div className="font-bold text-blue-900 mb-1">
                            {isAcamaEpona ? EPONA_MODELS[selectedEponaModel]?.label : TALIAN_5_MODELS[selectedTalian5Model]?.label}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <span>Longueur : <strong>{isAcamaEpona ? EPONA_MODELS[selectedEponaModel]?.fixedLength : TALIAN_5_MODELS[selectedTalian5Model]?.fixedLength}m</strong></span>
                            <span>Largeur totale : <strong>35.3m</strong></span>
                            <span>Travées : <strong>{isAcamaEpona ? `${EPONA_MODELS[selectedEponaModel]?.bayCount} × ${EPONA_MODELS[selectedEponaModel]?.baySpacing}m` : `${TALIAN_5_MODELS[selectedTalian5Model]?.bayCount} × ${TALIAN_5_MODELS[selectedTalian5Model]?.baySpacing}m`}</strong></span>
                            <span>Pente : <strong>{isAcamaEpona ? '17°' : '10°'}</strong></span>
                            <span>Faîtage : <strong>{isAcamaEpona ? '9.4m' : '8.1m'}</strong></span>
                            <span>Sablière G : <strong>{isAcamaEpona ? '5m' : '7.9m'}</strong></span>
                            <span>Sablière D : <strong>{isAcamaEpona ? '3.8m' : '4.3m'}</strong></span>
                            {!isAcamaEpona && !isAcamaTalian5 && <span>Appentis D : 9.3m</span>}
                            {isAcamaEpona && <span>Auvent D : <strong>2.5m</strong></span>}
                        </div>
                    </div>
                </div>
            )}

            {isAcamaTalian && (
                <div className="param-group mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                        Modèle Bâtiment
                    </label>

                    {/* Model Switcher for TALIAN */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setTalianModel(selectedTalianModel)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${isAcamaTalian4 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            TALIAN 4
                        </button>
                        <button
                            onClick={() => setTalian1Model(selectedTalian1Model)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${isAcamaTalian1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            TALIAN 1
                        </button>
                        <button
                            onClick={() => setTalian3Model(selectedTalian3Model)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${isAcamaTalian3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            TALIAN 3
                        </button>
                    </div>

                    <select
                        value={isAcamaTalian4 ? selectedTalianModel : (isAcamaTalian1 ? selectedTalian1Model : selectedTalian3Model)}
                        onChange={(e) => {
                            if (isAcamaTalian4) setTalianModel(e.target.value);
                            else if (isAcamaTalian1) setTalian1Model(e.target.value);
                            else if (isAcamaTalian3) setTalian3Model(e.target.value);
                        }}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg font-semibold text-sm bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    >
                        {isAcamaTalian4 && Object.entries(TALIAN_MODELS || {}).map(([key, model]) => (
                            <option key={key} value={key}>{model.label}</option>
                        ))}
                        {isAcamaTalian1 && Object.entries(TALIAN_1_MODELS || {}).map(([key, model]) => (
                            <option key={key} value={key}>{model.label}</option>
                        ))}
                        {isAcamaTalian3 && Object.entries(TALIAN_3_MODELS || {}).map(([key, model]) => (
                            <option key={key} value={key}>{model.label}</option>
                        ))}
                    </select>

                    {/* Display fixed model characteristics */}
                    {(isAcamaTalian4 || isAcamaTalian1 || isAcamaTalian3) && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800 space-y-1">
                            <div className="font-bold text-blue-900 mb-1">
                                {isAcamaTalian4 ? TALIAN_MODELS[selectedTalianModel]?.label : (isAcamaTalian1 ? TALIAN_1_MODELS[selectedTalian1Model]?.label : TALIAN_3_MODELS[selectedTalian3Model]?.label)}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <span>Longueur : <strong>{isAcamaTalian4 ? TALIAN_MODELS[selectedTalianModel]?.fixedLength : (isAcamaTalian1 ? TALIAN_1_MODELS[selectedTalian1Model]?.fixedLength : TALIAN_3_MODELS[selectedTalian3Model]?.fixedLength)}m</strong></span>
                                <span>Largeur totale : <strong>{isAcamaTalian4 ? '37.5m' : (isAcamaTalian1 ? '23.5m' : '21.1m')}</strong></span>
                                <span>Travées : <strong>{isAcamaTalian4 ? TALIAN_MODELS[selectedTalianModel]?.bayCount : (isAcamaTalian1 ? TALIAN_1_MODELS[selectedTalian1Model]?.bayCount : TALIAN_3_MODELS[selectedTalian3Model]?.bayCount)}</strong></span>
                                <span>Pente : <strong>{isAcamaTalian4 ? '6°' : (isAcamaTalian1 ? '14°' : '12°')}</strong></span>
                                <span>Faîtage : <strong>{isAcamaTalian4 ? '5.23m' : (isAcamaTalian1 ? '6.7m' : '4.5m')}</strong></span>
                                <span>Sablière G/D : <strong>{isAcamaTalian4 ? '4.5m' : (isAcamaTalian1 ? '4.36m' : '2.8m')}</strong></span>
                                <span>{isAcamaTalian4 ? 'Appentis G/D' : 'Auvent G/D'} : <strong>{isAcamaTalian4 ? '11.2m' : (isAcamaTalian1 ? '2.3m' : '1.8m')}</strong></span>
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {
                !isAcama && (
                    /* ========== GREEN INVEST: LARGEUR DU BÂTIMENT ========== */
                    <div className="param-group mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                            Largeur du Bâtiment
                        </label>
                        <select
                            value={width}
                            onChange={(e) => setWidth(Number(e.target.value))}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg font-semibold text-sm bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        >
                            {availableWidths?.map((w) => (
                                <option key={w} value={w}>{w} m</option>
                            ))}
                        </select>
                    </div>
                )
            }

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
                                        onClick={() => setLeftSide(leftSide === 'auvent' ? 'none' : 'auvent')}
                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${leftSide === 'auvent'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        Auvent
                                    </button>
                                    <button
                                        onClick={() => setLeftSide(leftSide === 'appentis' ? 'none' : 'appentis')}
                                        disabled={buildingType === 'monopente'}

                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${leftSide === 'appentis'
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                            : (buildingType === 'monopente' || buildingType.startsWith('asymetrique'))
                                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
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
                                        onClick={() => setRightSide(rightSide === 'auvent' ? 'none' : 'auvent')}
                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${rightSide === 'auvent'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        Auvent
                                    </button>
                                    <button
                                        onClick={() => setRightSide(rightSide === 'appentis' ? 'none' : 'appentis')}
                                        disabled={buildingType === 'monopente'}

                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${rightSide === 'appentis'
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                            : (buildingType === 'monopente' || buildingType.startsWith('asymetrique'))
                                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
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

            {/* ========== ESPACEMENT TRAVÉES — masqué pour ACAMA EPONA/TALIAN ========== */}
            {
                !isAcama && (
                    <div className="param-group mb-4">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                            Espacement Travées
                        </label>
                        <div className="inline-flex rounded-lg overflow-hidden border-2 border-slate-300">
                            <button
                                onClick={() => setBaySpacing(6)}
                                className={`px-4 py-2 font-bold text-xs transition-all ${baySpacing === 6 ? 'bg-green-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                            >
                                6m
                            </button>
                            <button
                                onClick={() => setBaySpacing(7.5)}
                                className={`px-4 py-2 font-bold text-xs transition-all ${baySpacing === 7.5 ? 'bg-green-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                            >
                                7.5m
                            </button>
                        </div>
                    </div>
                )
            }

            {/* ========== NOMBRE DE TRAVÉES — masqué pour ACAMA EPONA/TALIAN ========== */}
            {
                !isAcama && (
                    <div className="param-group mb-4">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                            Nombre de Travées
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={decrementBayCount}
                                disabled={bayCount <= 4}
                                className={`w-10 h-10 rounded-lg font-bold text-lg transition-all ${bayCount > 4 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                            >
                                −
                            </button>
                            <div className="text-center">
                                <span className="text-2xl font-bold text-slate-900">{bayCount}</span>
                                <p className="text-[10px] text-slate-500 leading-none mt-0.5">travées</p>
                            </div>
                            <button
                                onClick={incrementBayCount}
                                className="w-10 h-10 rounded-lg bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-all"
                            >
                                +
                            </button>
                        </div>
                    </div>
                )
            }

            {/* ========== PARAMÈTRES FIXES ========== */}
            <div className="fixed-params mb-6 p-4 bg-slate-100 rounded-lg border border-slate-300">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Paramètres Fixes
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-slate-700">Pente: <strong>{isAcamaTalian4 ? 6 : (isAcamaTalian1 ? 14 : (buildingType?.startsWith('asymetrique') ? 15 : roofPitch))}°</strong></span>
                    </div>
                    {!buildingType?.startsWith('ombriere') && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-slate-700">H. Égout: <strong>{buildingType?.startsWith('asymetrique') ? 4 : eaveHeight}m</strong></span>
                        </div>
                    )}
                    {isAcama && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-slate-700">Panneau: <strong>460 Wc</strong></span>
                        </div>
                    )}
                </div>
            </div>

            {/* ========== OPTION SOLAIRE ========== */}
            <div className="param-group mb-4">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Option Solaire
                </label>
                <button
                    onClick={toggleSolar}
                    className={`
                        w-full sm:w-64 lg:w-full py-2 px-3 rounded-lg font-bold text-xs transition-all duration-200 shadow-sm border
                        ${hasSolar
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }
                    `}
                >
                    Couverture Solaire PV
                </button>

                {hasSolar && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                        <div className="text-xs text-yellow-800 uppercase font-semibold mb-1">Puissance Installée</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-yellow-900">{solarStats?.power?.toFixed(2)}</span>
                            <span className="text-sm font-medium text-yellow-700">kWc</span>
                        </div>
                        <div className="text-xs text-yellow-600 mt-1">{solarStats?.count} panneaux</div>
                    </div>
                )}
            </div>



        </div >
    );
}
