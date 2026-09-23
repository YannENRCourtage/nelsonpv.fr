import React, { useState } from 'react';
import {
  FileText,
  FileDown,
  Sun,
  TrendingUp,
  ShieldCheck,
  Layers,
  MapPin,
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  X,
  Printer
} from 'lucide-react';
import { PV_PORTFOLIO_SITES, computePvFinancials } from '../../data/pvPortfolioData.js';

const fmtEur = (v) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v || 0))} €`;
const fmtM = (v) => `${(v / 1000000).toFixed(2)} M€`;
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

export default function PvDossierPDFGenerator({ open, onClose, portfolioData }) {
  if (!open) return null;

  const sites = portfolioData?.analyzedSites || PV_PORTFOLIO_SITES.map(s => computePvFinancials(s));
  const totals = portfolioData?.consolidatedTotals || {
    totalSites: sites.length,
    totalPowerMw: sites.reduce((sum, s) => sum + (s.kwc || s.powerKwc || 250), 0) / 1000,
    totalProdMwh: sites.reduce((sum, s) => sum + (s.prodMwh || 300), 0),
    totalCapex: sites.reduce((sum, s) => sum + (s.capexTotal || 250000), 0),
    totalCaAn1: sites.reduce((sum, s) => sum + (s.caAnnuel || 25000), 0),
    totalEbitdaAn1: sites.reduce((sum, s) => sum + (s.ebitdaAn1 || 20000), 0),
    triConsolide: 9.5,
    paybackConsol: 10.8,
    debtDuration: 20,
    debtRate: 4.0
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Mémorandum d'Investissement — Portefeuille Multi-Projets PV (HÉLIOS)
              </h3>
              <p className="text-[11px] text-slate-400">
                Étude financière consolidée • {totals.totalSites} centrales photovoltaïques • {totals.totalPowerMw.toFixed(2)} MWc
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimer / Enregistrer PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Memorandum Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50 text-slate-900 print:p-0 print:space-y-4">
          {/* Planche 1 : Page de Garde Institutionnelle */}
          <div className="bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 text-white p-8 rounded-2xl shadow-lg border border-amber-500/20 text-center space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <img src="/logo-nelson.png" alt="Nelson" className="h-10 w-auto object-contain brightness-0 invert" />
              <span className="text-xs font-bold tracking-widest text-amber-300 uppercase">
                Nelson Energy Advisory • {new Date().getFullYear()}
              </span>
            </div>

            <div className="py-8 space-y-3">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 text-xs font-black uppercase tracking-wider">
                DOSSIER D'INVESTISSEMENT CONSOLIDÉ
              </span>
              <h1 className="text-3xl font-black tracking-tight text-white mt-2">
                PORTEFEUILLE MULTI-PROJETS PHOTOVOLTAÏQUE HÉLIOS
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl mx-auto">
                Consolidation financière, technique et réseau de {totals.totalSites} centrales photovoltaïques en toitures, hangars agricoles et ombrières de parking.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-left">
              <div className="bg-white/10 p-3 rounded-xl">
                <div className="text-[10px] text-amber-200 uppercase font-bold">Puissance Totale</div>
                <div className="text-xl font-black text-white">{totals.totalPowerMw.toFixed(2)} MWc</div>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <div className="text-[10px] text-amber-200 uppercase font-bold">Production An 1</div>
                <div className="text-xl font-black text-white">{Math.round(totals.totalProdMwh).toLocaleString('fr-FR')} MWh</div>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <div className="text-[10px] text-amber-200 uppercase font-bold">CAPEX Global</div>
                <div className="text-xl font-black text-white">{fmtM(totals.totalCapex)}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <div className="text-[10px] text-amber-200 uppercase font-bold">EBITDA An 1</div>
                <div className="text-xl font-black text-emerald-400">{fmtM(totals.totalEbitdaAn1)}</div>
              </div>
            </div>
          </div>

          {/* Planche 2 : Indicateurs Clés & Ratios Financiers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              Synthèse Financière & Hypothèses de Dette
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">TRI Projet 20 ans</span>
                <div className="text-2xl font-black text-purple-700">{fmtPct(totals.triConsolide)}</div>
                <span className="text-[10px] text-slate-500">Retour: {totals.paybackConsol.toFixed(1)} ans</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Couverture DSCR Moyen</span>
                <div className="text-2xl font-black text-emerald-600">{(totals.avgDscr || 1.35).toFixed(2)}x</div>
                <span className="text-[10px] text-emerald-700">Seuil bancaire exigé: 1.17x</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Structure Dette Sénior</span>
                <div className="text-2xl font-black text-slate-900">{totals.debtDuration} ans</div>
                <span className="text-[10px] text-slate-500">Taux nominal: {totals.debtRate.toFixed(2)}%</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Annuité Consolidée</span>
                <div className="text-2xl font-black text-blue-700">{fmtEur(totals.totalAnnuite || totals.totalCapex * 0.07)}/an</div>
                <span className="text-[10px] text-blue-600">Service dette portefeuille</span>
              </div>
            </div>
          </div>

          {/* Planche 3 : Répertoire des Sites du Portefeuille */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              Répertoire Exhaustif des Centrales Photovoltaïques
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2">N°</th>
                    <th className="p-2">Site / Bailleur</th>
                    <th className="p-2">Commune (Dép)</th>
                    <th className="p-2">Modèle Bâtiment</th>
                    <th className="p-2 text-right">Puissance</th>
                    <th className="p-2">Poste Source ODRE</th>
                    <th className="p-2 text-center">Distance</th>
                    <th className="p-2 text-right">CAPEX</th>
                    <th className="p-2 text-right">CA An 1</th>
                    <th className="p-2 text-right">EBITDA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sites.map((s, idx) => (
                    <tr key={s.id || idx}>
                      <td className="p-2 font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-900">{s.name}</td>
                      <td className="p-2">{s.city || s.commune} ({s.postcode?.slice(0, 2) || '—'})</td>
                      <td className="p-2 font-medium text-blue-700">{s.typeBat || 'Bâtiment BAC'}</td>
                      <td className="p-2 text-right font-black text-amber-700">{s.kwc || s.powerKwc} kWc</td>
                      <td className="p-2">{s.substation?.name || s.posteSource || 'ODRE'}</td>
                      <td className="p-2 text-center font-bold">{s.substation?.distanceKm || s.distanceKm} km</td>
                      <td className="p-2 text-right font-bold">{fmtEur(s.capexTotal)}</td>
                      <td className="p-2 text-right font-bold text-emerald-600">{fmtEur(s.caAnnuel)}</td>
                      <td className="p-2 text-right font-bold text-blue-600">{fmtEur(s.ebitdaAn1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
