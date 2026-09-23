import React from 'react';
import {
  Sun,
  Building2,
  TrendingUp,
  Zap,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { computePvFinancials } from '../../data/pvPortfolioData.js';

const fmtEur = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— €';
  return Math.round(val).toLocaleString('fr-FR') + ' €';
};

const fmtPct = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— %';
  return (val || 0).toFixed(1) + ' %';
};

/**
 * Fiche Individuelle 1 Page A4 Paysage (1380 x 940 px) pour un projet photovoltaïque
 * Utilisée dans l'Étude Complète multi-projets
 */
export default function PvProjectSingleSheet({ site, siteIndex, totalSites = 20 }) {
  if (!site) return null;

  // Calcul dynamique certifié
  const fin = computePvFinancials(site, {
    studyDuration: 20,
    debtDuration: 20,
    debtRate: 4.3,
    tarifS21: 0.082
  });

  const kwc = fin.kwc || 250;
  const capexTotal = fin.capexTotal;
  const caAn1 = fin.caAnnuel;
  const opexAn1 = fin.opexAnnuel;
  const ebitdaAn1 = fin.ebitdaAn1;
  const triProjet = fin.triProjet;
  const payback = fin.payback;
  const prodMwh = fin.prodMwh;
  const substation = site.substation || { name: site.posteSource || 'ODRE', distanceKm: site.distanceKm || 5 };

  const years = Array.from({ length: 20 }, (_, i) => 2026 + i);

  return (
    <section
      className="pv-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between"
      style={{
        width: '1380px',
        minWidth: '1380px',
        maxWidth: '1380px',
        height: '940px',
        minHeight: '940px',
        maxHeight: '940px',
        flexShrink: 0,
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <div>
        {/* En-tête de la fiche projet */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3.5">
          <div className="flex items-center gap-4">
            <img src="/logo-nelson.png" alt="Nelson" className="h-10 w-auto object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] uppercase">
                  Fiche Centrale {siteIndex} / {totalSites}
                </span>
                <h2 className="text-2xl font-black text-[#0b192c] tracking-tight">
                  {site.siteName || site.name}
                </h2>
              </div>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                Bâtiment {site.typeBat || 'BAC'} • {site.commune || site.city || '—'} ({site.codePostal?.slice(0, 2) || site.postcode?.slice(0, 2) || '—'}) • Raccordement Poste Source {substation.name} ({substation.distanceKm} km)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Centrale Photovoltaïque</span>
            <span className="text-base font-black text-amber-700">{kwc} kWc</span>
            <span className="text-xs text-slate-500 font-medium block">TopCon 465 Wc • Tarif 0,082 €</span>
          </div>
        </div>

        {/* 4 Indicateurs Majeurs du Projet */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-800">Puissance & Prod.</span>
              <div className="text-xl font-black text-[#0b192c]">{kwc} kWc</div>
              <span className="text-[10px] text-slate-500 font-medium">{prodMwh} MWh/an</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-600" />
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-800">CAPEX Clé en Main</span>
              <div className="text-xl font-black text-[#0b192c]">{fmtEur(capexTotal)}</div>
              <span className="text-[10px] text-slate-500 font-medium">{Math.round(capexTotal / kwc)} € / kWc</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800">EBITDA Année 1</span>
              <div className="text-xl font-black text-emerald-700">{fmtEur(ebitdaAn1)}</div>
              <span className="text-[10px] text-slate-500 font-medium">CA Brut : {fmtEur(caAn1)}</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>

          <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-purple-800">TRI & Retour</span>
              <div className="text-xl font-black text-purple-800">{fmtPct(triProjet)}</div>
              <span className="text-[10px] text-slate-500 font-medium">Payback: {payback.toFixed(1)} ans</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Détail Technique & Décomposition CAPEX */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
            <span className="text-[10px] font-black uppercase text-slate-500 block mb-2">Décomposition de l'Investissement (CAPEX)</span>
            <div className="space-y-1">
              <div className="flex justify-between py-0.5 border-b border-slate-200">
                <span className="text-slate-600">Centrale solaire (panneaux, onduleurs, pose) :</span>
                <span className="font-bold text-slate-900">{fmtEur(fin.coutCentrale)}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200">
                <span className="text-slate-600">Charpente métallique & toiture :</span>
                <span className="font-bold text-slate-900">{fmtEur(fin.coutCharpente)}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200">
                <span className="text-slate-600">Raccordement réseau Enedis HTA :</span>
                <span className="font-bold text-slate-900">{fmtEur(fin.raccordement)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Frais structure & ingénierie DP :</span>
                <span className="font-bold text-slate-900">{fmtEur(fin.frais + 7500)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
            <span className="text-[10px] font-black uppercase text-slate-500 block mb-2">Paramètres Réseau & Financement 20 ans</span>
            <div className="space-y-1">
              <div className="flex justify-between py-0.5 border-b border-slate-200">
                <span className="text-slate-600">Poste source ODRE rapproché :</span>
                <span className="font-bold text-slate-900">{substation.name} à {substation.distanceKm} km</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200">
                <span className="text-slate-600">Tarif d'achat de base garanti :</span>
                <span className="font-bold text-slate-900">0,082 € / kWh (S21)</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200">
                <span className="text-slate-600">Financement bancaire sénior :</span>
                <span className="font-bold text-slate-900">90% CAPEX sur 20 ans @ 4,30%</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Total Trésorerie Nette 20 ans :</span>
                <span className="font-black text-emerald-700">{fmtEur(fin.rows?.reduce((s, r) => s + (r.cfNet || 0), 0))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau Financier Prévisionnel 20 ans */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-[10px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="p-1.5 min-w-[130px] sticky left-0 bg-slate-900">Poste (€)</th>
                {years.map(y => (
                  <th key={y} className="p-1.5 text-right min-w-[50px]">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-blue-50/50 font-bold text-blue-900">
                <td className="p-1.5 sticky left-0 bg-blue-50 font-bold">Chiffre d'Affaires</td>
                {(fin.rows || []).slice(0, 20).map((r, i) => (
                  <td key={i} className="p-1.5 text-right whitespace-nowrap">{Math.round(r.ca || 0).toLocaleString('fr-FR')}</td>
                ))}
              </tr>
              <tr className="text-slate-600">
                <td className="p-1.5 sticky left-0 bg-white font-medium">OPEX & Exploitation</td>
                {(fin.rows || []).slice(0, 20).map((r, i) => (
                  <td key={i} className="p-1.5 text-right whitespace-nowrap">{Math.round(r.opex || 0).toLocaleString('fr-FR')}</td>
                ))}
              </tr>
              <tr className="bg-emerald-50/60 font-black text-emerald-900">
                <td className="p-1.5 sticky left-0 bg-emerald-50 font-black">EBITDA</td>
                {(fin.rows || []).slice(0, 20).map((r, i) => (
                  <td key={i} className="p-1.5 text-right font-bold whitespace-nowrap">{Math.round(r.ebitda || 0).toLocaleString('fr-FR')}</td>
                ))}
              </tr>
              <tr className="text-slate-700">
                <td className="p-1.5 sticky left-0 bg-white font-medium">Service de la Dette</td>
                {(fin.rows || []).slice(0, 20).map((r, i) => (
                  <td key={i} className="p-1.5 text-right whitespace-nowrap">{Math.round(r.serviceDette || 0).toLocaleString('fr-FR')}</td>
                ))}
              </tr>
              <tr className="bg-amber-400 font-black text-slate-900">
                <td className="p-1.5 sticky left-0 bg-amber-400 font-black">Cash-Flow Net Annuel</td>
                {(fin.rows || []).slice(0, 20).map((r, i) => (
                  <td key={i} className="p-1.5 text-right font-black whitespace-nowrap">{Math.round(r.cfNet || 0).toLocaleString('fr-FR')}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pied de page institutionnel */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
        <div>Nelson Energy Advisory • Fiche Photovoltaïque Unitaire</div>
        <div className="font-semibold text-slate-600">Projet {site.siteName || site.name} • {kwc} kWc</div>
        <div className="font-bold text-[#0b192c]">Fiche {siteIndex} / {totalSites}</div>
      </div>
    </section>
  );
}
