import React from 'react';
import { useConfiguratorValues, useConfiguratorActions } from '@/stores/useConfiguratorStore.js';

export function ControlPanel() {
    // NEW: Split hooks with destructuring to maintain variable scope compatibility
    // Removed unused: ridgeHeight, length, showDimensions
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
        solarStats
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
        reset
    } = useConfiguratorActions();

    return (
        <div className="control-panel bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-slate-200">

            {/* HEADER */}
            <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Configurateur 2D/3D</h2>
                <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Bâtiment Métallique Pro</p>
            </div>

            {/* ========== TYPE DE BÂTIMENT ========== */}
            <div className="param-group mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Type de Bâtiment
                </label>
                <select
                    value={buildingType}
                    onChange={(e) => setBuildingType(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg font-semibold text-sm bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                >
                    <option value="symetrique">Symétrique</option>
                    <option value="asymetrique_1">Asymétrique 1 zone</option>
                    <option value="asymetrique_2">Asymétrique 2 zones</option>
                    <option value="monopente">Monopente</option>
                    <option value="ombriere_vl_simple">Ombrière VL simple</option>
                    <option value="ombriere_vl_double">Ombrière VL double</option>
                    <option value="ombriere_pl">Ombrière PL</option>
                </select>
            </div>

            {/* ========== LARGEUR DU BÂTIMENT ========== */}
            <div className="param-group mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Largeur du Bâtiment
                </label>

                <select
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg font-semibold text-sm bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                >
                    {availableWidths.map((w) => (
                        <option key={w} value={w}>{w} m</option>
                    ))}
                </select>
            </div>

            {/* ========== OPTIONS STRUCTURE - EXTENSIONS (Compact) ========== */}
            <div className="param-group mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span>🏗️</span> Extensions
                </label>

                <div className="space-y-3 p-3 border border-slate-300 rounded-lg bg-white">
                    {/* Côté Gauche */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-12 uppercase">Gch</span>
                        <div className="flex-1 flex gap-2">
                            <button
                                onClick={() => setLeftSide(leftSide === 'auvent' ? 'none' : 'auvent')}
                                className={`flex-1 py-1.5 rounded text-xs font-bold uppercase border transition-all ${leftSide === 'auvent'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                            >
                                Auvent
                            </button>
                            <button
                                onClick={() => setLeftSide(leftSide === 'appentis' ? 'none' : 'appentis')}
                                disabled={buildingType === 'monopente'}
                                className={`flex-1 py-1.5 rounded text-xs font-bold uppercase border transition-all ${leftSide === 'appentis'
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : buildingType === 'monopente'
                                        ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                            >
                                Appentis
                            </button>
                        </div>
                    </div>

                    {/* Côté Droit */}
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                        <span className="text-xs font-bold text-slate-500 w-12 uppercase">Drt</span>
                        <div className="flex-1 flex gap-2">
                            <button
                                onClick={() => setRightSide(rightSide === 'auvent' ? 'none' : 'auvent')}
                                className={`flex-1 py-1.5 rounded text-xs font-bold uppercase border transition-all ${rightSide === 'auvent'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                            >
                                Auvent
                            </button>
                            <button
                                onClick={() => setRightSide(rightSide === 'appentis' ? 'none' : 'appentis')}
                                disabled={buildingType === 'monopente'}
                                className={`flex-1 py-1.5 rounded text-xs font-bold uppercase border transition-all ${rightSide === 'appentis'
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : buildingType === 'monopente'
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

            {/* ========== ESPACEMENT TRAVÉES ========== */}
            <div className="param-group mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Espacement Travées
                </label>

                {/* Toggle 6m / 7.5m */}
                <div className="inline-flex rounded-lg overflow-hidden border-2 border-slate-300">
                    <button
                        onClick={() => setBaySpacing(6)}
                        className={`
                            px-6 py-3 font-semibold text-sm transition-all
                            ${baySpacing === 6
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-50'
                            }
                        `}
                    >
                        6m
                    </button>
                    <button
                        onClick={() => setBaySpacing(7.5)}
                        className={`
                            px-6 py-3 font-semibold text-sm transition-all
                            ${baySpacing === 7.5
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-50'
                            }
                        `}
                    >
                        7.5m
                    </button>
                </div>
            </div>

            {/* ========== NOMBRE DE TRAVÉES ========== */}
            <div className="param-group mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Nombre de Travées
                </label>

                {/* Stepper (Plus/Moins) */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={decrementBayCount}
                        disabled={bayCount <= 4}
                        className={`
                            w-12 h-12 rounded-lg font-bold text-xl transition-all
                            ${bayCount > 4
                                ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-105'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }
                        `}
                    >
                        −
                    </button>

                    <div className="flex-1 text-center">
                        <span className="text-4xl font-bold text-slate-900">{bayCount}</span>
                        <p className="text-xs text-slate-500 mt-1">travées (min. 4)</p>
                    </div>

                    <button
                        onClick={incrementBayCount}
                        className="w-12 h-12 rounded-lg bg-green-500 text-white font-bold text-xl hover:bg-green-600 transition-all hover:scale-105"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* ========== PARAMÈTRES FIXES ========== */}
            <div className="fixed-params mb-6 p-4 bg-slate-100 rounded-lg border border-slate-300">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Paramètres Fixes
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-slate-700">Pente: <strong>{roofPitch}°</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-slate-700">H. Égout: <strong>{eaveHeight}m</strong></span>
                    </div>
                </div>
            </div>

            {/* ========== OPTION SOLAIRE ========== */}
            <div className="param-group mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Option Solaire
                </label>
                <button
                    onClick={toggleSolar}
                    className={`
                        w-full py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm border
                        ${hasSolar
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200 shadow-inner'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
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



        </div>
    );
}
