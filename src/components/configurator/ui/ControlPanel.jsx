import React from 'react';
import { useConfiguratorStore } from '@/stores/useConfiguratorStore.js';

export function ControlPanel() {
    // Récupération des valeurs et actions du store
    const {
        width,
        ridgeHeight,
        eaveHeight,
        roofPitch,
        baySpacing,
        bayCount,
        length,
        availableWidths,
        setWidth,
        setBaySpacing,
        incrementBayCount,
        decrementBayCount,
        hasAwning,
        toggleAwning,
        showDimensions,
        toggleDimensions,
        reset
    } = useConfiguratorStore();

    return (
        <div className="control-panel bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-slate-200">

            {/* HEADER */}
            <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Configurateur 2D/3D</h2>
                <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Bâtiment Métallique Pro</p>
            </div>

            {/* ========== LARGEUR DU BÂTIMENT ========== */}
            <div className="param-group mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Largeur du Bâtiment
                </label>

                {/* Button Group pour sélection largeur */}
                <div className="grid grid-cols-3 gap-2">
                    {availableWidths.map((w) => (
                        <button
                            key={w}
                            onClick={() => setWidth(w)}
                            className={`
                px-4 py-3 rounded-lg font-semibold text-sm transition-all
                ${width === w
                                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-102'
                                }
              `}
                        >
                            {w}m
                        </button>
                    ))}
                </div>

                {/* Info calculée : Hauteur Faîtage */}
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium">
                        <span className="opacity-70">Hauteur Faîtage :</span>{' '}
                        <span className="font-bold text-blue-900">{ridgeHeight}m</span>
                    </p>
                </div>
            </div>

            {/* ========== TYPE DE BÂTIMENT ========== */}
            <div className="param-group mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Type de Bâtiment
                </label>
                <select className="w-full px-4 py-3 border border-slate-300 rounded-lg font-semibold text-sm bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all">
                    <option value="symetrique">Symétrique</option>
                    <option value="asymetrique">Asymétrique</option>
                    <option value="monopente">Monopente</option>
                    <option value="ombriere">Ombrière</option>
                </select>
                <p className="text-xs text-slate-500 mt-2 italic">À venir : affectation structure 3D</p>
            </div>

            {/* ========== OPTION AUVENT & CÔTES ========== */}
            <div className="param-group mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Options Structure
                </label>
                <div className="space-y-3">
                    {/* Auvent Toggle */}
                    <div className="flex items-center justify-between p-4 border border-slate-300 rounded-lg bg-white">
                        <span className="font-semibold text-slate-700">Ajouter un Auvent (9.3m)</span>
                        <button
                            onClick={toggleAwning}
                            className={`
                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                                ${hasAwning ? 'bg-blue-600' : 'bg-slate-300'}
                            `}
                        >
                            <span
                                className={`
                                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                    ${hasAwning ? 'translate-x-6' : 'translate-x-1'}
                                `}
                            />
                        </button>
                    </div>

                    {/* Dimensions Toggle */}
                    <div className="flex items-center justify-between p-4 border border-slate-300 rounded-lg bg-white">
                        <span className="font-semibold text-slate-700">Afficher les côtes</span>
                        <button
                            onClick={toggleDimensions}
                            className={`
                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                                ${showDimensions ? 'bg-blue-600' : 'bg-slate-300'}
                            `}
                        >
                            <span
                                className={`
                                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                    ${showDimensions ? 'translate-x-6' : 'translate-x-1'}
                                `}
                            />
                        </button>
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

                {/* Info calculée : Longueur */}
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 font-medium">
                        <span className="opacity-70">Longueur Totale :</span>{' '}
                        <span className="font-bold text-green-900">{(baySpacing * bayCount).toFixed(1).replace(/[.,]0$/, '')}m</span> ({baySpacing}m × {bayCount})
                    </p>
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

            {/* ========== RÉSUMÉ & ACTIONS ========== */}
            <div className="actions space-y-3">
                {/* Bouton Reset */}
                <button
                    onClick={reset}
                    className="w-full px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-300 transition-all"
                >
                    ↺ Réinitialiser
                </button>

                {/* Résumé */}
                <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-slate-600 font-medium">
                        Bâtiment {width}m × {length}m  •  {bayCount} travées
                    </p>
                </div>
            </div>
        </div>
    );
}
