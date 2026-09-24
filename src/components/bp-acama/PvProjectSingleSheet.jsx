import React from 'react';
import {
  Sun,
  Building2,
  TrendingUp,
  Zap,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { computePvFinancials } from '../../data/pvPortfolioData.js';

const fmtNum = (n, dec = 0) => (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtEur = (n) => `${fmtNum(n, 0)} €`;
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

/**
 * Rendu 1 Page A4 Paysage (1380 x 940 px) d'une Fiche Photovoltaïque Unitaire
 * Utilisé dans l'Étude Complète multi-sites PV du Portefeuille HÉLIOS
 * Intègre la vue détaillée complète du plan d'affaires prévisionnel sur 20 ans
 */
export default function PvProjectSingleSheet({ site, siteIndex, totalSites = 20, studyDuration = 20 }) {
  if (!site) return null;

  // Calcul dynamique unifié avec computePvFinancials (respecte les calculs BP existants du site)
  const fin = (site.rows && site.rows.length >= (studyDuration || 20) && site.capexTotal)
    ? site
    : computePvFinancials(site, {
        studyDuration: studyDuration || 20,
        debtDuration: 20,
        debtRate: 4.3,
        tarifS21: 0.082
      });

  const kwc = fin.kwc || 250;
  const productible = fin.productible || 1125;
  const prodMwh = fin.prodMwh || Math.round((kwc * productible) / 1000);
  const nbPanels = Math.round((kwc * 1000) / 465);
  const substation = site.substation || { name: site.posteSource || 'ODRE', distanceKm: site.distanceKm || 5.0 };

  // Données CAPEX
  const coutCentrale = fin.coutCentrale;
  const coutCharpente = fin.coutCharpente;
  const raccordement = fin.raccordement;
  const fraisCommuns = fin.frais + (fin.ingenieurDP || 0);
  const capexTotal = fin.capexTotal;

  // Financement senior (20 ans @ 4.30%)
  const debtDuration = 20;
  const debtRate = 4.30;
  const emprunt = fin.emprunt || Math.round(capexTotal * 0.90);
  const apport10 = fin.apport10 || (capexTotal - emprunt);
  const annuite = fin.annuiteDette;

  // Revenus An 1
  const caAn1 = fin.caAnnuel;

  // OPEX An 1 (Aucun loyer foncier par défaut)
  const maintenanceAn1 = fin.maintenanceAn1 || Math.round(kwc * 7.5);
  const assuranceAn1 = fin.assuranceAn1 || Math.round(kwc * 3.5);
  const taxesLocalesAn1 = fin.taxesLocalesAn1 || 0;
  const loyerAn1 = fin.loyerAn1 || 0;
  const totalOpexAn1 = fin.opexAnnuel;
  const ebitdaAn1 = fin.ebitdaAn1;

  // Chronique 20 ans
  const years = Array.from({ length: studyDuration || 20 }, (_, i) => 2026 + i);
  const tableRows = (fin.rows || []).slice(0, studyDuration || 20);

  const triProjet = fin.triProjet;
  const paybackProjet = fin.payback;
  const avgDscr = fin.dscrMoyen || 1.35;
  const totalRecettes = fin.totalRecettesStudy || tableRows.reduce((sum, r) => sum + (r.ca || 0), 0);
  const totalOpexCumul = fin.totalOpexStudy || tableRows.reduce((sum, r) => sum + (r.opex || 0), 0);
  const beneficeNetCash = fin.totalCashFlowNet || tableRows.reduce((sum, r) => sum + (r.cfNet || 0), 0);

  // Ligne de données compacte pour le tableau prévisionnel détaillé
  const DataRow = ({ label, propName, isCurrency, format, bold, className, indent }) => (
    <tr className={`border-b border-slate-200 bg-white hover:bg-slate-50 ${className || ''}`}>
      <td className={`px-1.5 py-[1.2px] font-medium bg-slate-50 text-[7.5px] border-r border-slate-200 w-[180px] min-w-[180px] whitespace-nowrap ${bold ? 'font-black text-slate-900' : 'text-slate-700'} ${indent ? 'pl-3 italic text-slate-500' : ''}`}>
        {label}
      </td>
      {tableRows.map((r, i) => (
        <td key={i} className={`px-1 py-[1.2px] text-right border-r border-slate-200 text-[7.5px] whitespace-nowrap ${bold ? 'font-black' : ''}`}>
          {format ? format(r[propName]) : (isCurrency ? fmtEur(r[propName]) : fmtNum(r[propName], 0))}
        </td>
      ))}
    </tr>
  );

  return (
    <div
      id={`pv-single-site-page-${siteIndex}`}
      className="pv-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col justify-between"
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
        {/* 1. En-tête de la Fiche Centrale */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-1.5">
          <div className="flex items-center gap-3.5">
            <img src="/logo-nelson.png" alt="NELSON" className="h-8 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="h-6 w-[1px] bg-slate-200" />
            <img src="/logo-enr-courtage-inline.png" alt="ENR COURTAGE" className="h-7 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9.5px] font-black uppercase tracking-wider">
                  Centrale #{siteIndex} / {totalSites}
                </span>
                <h1 className="text-lg font-black text-[#0b192c] tracking-tight">
                  PROJET {site.name?.toUpperCase() || site.siteName?.toUpperCase()} • {kwc} kWc
                </h1>
              </div>
              <p className="text-[10px] font-medium text-slate-500">
                {site.client ? `${site.client} • ` : ''}{site.address ? `${site.address}, ` : ''}{site.postcode || site.cp || site.zip} {site.city || site.commune}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8.5px] uppercase tracking-wider text-slate-400 font-bold block">Centrale Photovoltaïque Toiture</span>
            <span className="text-sm font-black text-amber-700">{kwc} kWc TopCon 465 Wc</span>
            <span className="text-[9.5px] text-slate-500 font-semibold block">Tarif Garanti S21 : 0,082 €/kWh • Indexation 0,6%/an</span>
          </div>
        </div>

        {/* 2. Bandeau Technique & Réseau ODRE */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-5 text-slate-700">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[8.5px] uppercase font-bold text-slate-400">Centrale :</span>
              <span className="text-[11px] font-black text-slate-900">{kwc} kWc ({nbPanels} modules 465 Wc)</span>
            </div>
            <div className="border-l border-slate-200 pl-4 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[8.5px] uppercase font-bold text-slate-400">Productible :</span>
              <span className="text-[11px] font-black text-emerald-700">{productible} kWh/kWc/an ({prodMwh} MWh/an)</span>
            </div>
            <div className="border-l border-slate-200 pl-4 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[8.5px] uppercase font-bold text-slate-400">Poste Source Enedis :</span>
              <span className="text-[11px] font-black text-blue-900">{substation.name} ({substation.distanceKm} km • {substation.voltageLevel || 'HTA 20 kV'})</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[9px] font-extrabold uppercase">
            Bâtiment {site.typeBat || 'BAC'} • S3REnR : {substation.quotePartS3renr || '84.13 k€/MW'}
          </span>
        </div>

        {/* 3. Grille des 4 Colonnes : Paramètres & KPI */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {/* Colonne 1 : Données Projet & CAPEX */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs space-y-1 text-[9.5px]">
            <div className="font-black text-amber-700 uppercase border-b border-amber-100 pb-0.5 flex justify-between">
              <span>Investissement CAPEX</span>
              <span className="font-extrabold text-slate-900">{fmtEur(capexTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Centrale solaire (panneaux, pose) :</span><span className="font-bold text-slate-900">{fmtEur(coutCentrale)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Charpente métallique & toiture :</span><span className="font-bold text-slate-900">{fmtEur(coutCharpente)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Raccordement Enedis HTA :</span><span className="font-bold text-slate-900">{fmtEur(raccordement)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Frais structure & ingénierie DP :</span><span className="font-bold text-slate-900">{fmtEur(fraisCommuns)}</span></div>
            <div className="pt-0.5 border-t border-slate-100 text-[8.5px] text-slate-500 font-medium flex justify-between">
              <span>Prix unitaire clé en main :</span>
              <span className="font-bold text-slate-700">{Math.round(capexTotal / kwc)} € / kWc</span>
            </div>
          </div>

          {/* Colonne 2 : Tarifs & Financement Senior */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs space-y-1 text-[9.5px]">
            <div className="font-black text-blue-700 uppercase border-b border-blue-100 pb-0.5 flex justify-between">
              <span>Tarifs & Financement</span>
              <span className="font-extrabold text-slate-900">20 ans</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Tarif de base (≤ 1 100) :</span><span className="font-bold text-indigo-700">0,082 € / kWh</span></div>
            <div className="flex justify-between text-slate-600"><span>Seuil kWh / kWc :</span><span className="font-bold text-slate-900">1 100 kWh/kWc</span></div>
            <div className="flex justify-between text-slate-600"><span>Emprunt bancaire senior :</span><span className="font-bold text-slate-900">{debtDuration} ans @ {debtRate}%</span></div>
            <div className="flex justify-between text-slate-600"><span>Apport Fonds Propres (10%) :</span><span className="font-bold text-slate-900">{fmtEur(apport10)}</span></div>
            <div className="pt-0.5 border-t border-slate-100 flex justify-between text-slate-600">
              <span>Annuité de la Dette :</span>
              <span className="font-bold text-red-600">{fmtEur(annuite)}/an</span>
            </div>
          </div>

          {/* Colonne 3 : Charges & OPEX An 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs space-y-1 text-[9.5px]">
            <div className="font-black text-blue-700 uppercase border-b border-blue-100 pb-0.5 flex justify-between">
              <span>Charges & OPEX An 1</span>
              <span className="font-extrabold text-slate-900">{fmtEur(totalOpexAn1)}/an</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Maintenance & monitoring :</span><span className="font-bold text-slate-900">{fmtEur(maintenanceAn1)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Assurance RC & exploitation :</span><span className="font-bold text-slate-900">{fmtEur(assuranceAn1)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Location compteur & taxes :</span><span className="font-bold text-slate-900">{fmtEur(taxesLocalesAn1)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Loyer foncier / toiture :</span><span className="font-bold text-emerald-700">{fmtEur(loyerAn1)}</span></div>
            <div className="pt-0.5 border-t border-slate-100 flex justify-between text-slate-500 text-[8.5px]">
              <span>Provision onduleurs (An 11) :</span>
              <span className="font-bold text-slate-700">{fmtEur(coutCentrale * 0.1)}</span>
            </div>
          </div>

          {/* Colonne 4 : Carte KPI Sombre */}
          <div className="bg-slate-900 text-white rounded-xl p-2 shadow-md flex flex-col justify-between text-[9.5px]">
            <div>
              <div className="flex justify-between items-center border-b border-white/10 pb-0.5 mb-0.5">
                <span className="text-[8.5px] uppercase font-black text-amber-300">Indicateurs de Rentabilité</span>
                <span className="text-[11px] font-black text-emerald-400">TRI : {triProjet.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-white/80 py-0.5"><span>EBITDA Net An 1 :</span><span className="font-black text-white">{fmtEur(ebitdaAn1)}</span></div>
              <div className="flex justify-between text-white/80 py-0.5"><span>Temps de Retour :</span><span className="font-black text-amber-300">{paybackProjet ? `${paybackProjet.toFixed(1)} ans` : '8.5 ans'}</span></div>
              <div className="flex justify-between text-white/80 py-0.5"><span>DSCR Moyen Dette :</span><span className="font-black text-cyan-300">{avgDscr.toFixed(2)}x</span></div>
            </div>
            <div className="pt-1 border-t border-white/10 mt-0.5">
              <div className="flex justify-between text-white/70 text-[8.5px]"><span>Recettes 20 ans :</span><span className="font-bold text-white">{fmtEur(totalRecettes)}</span></div>
              <div className="flex justify-between text-emerald-300 font-black text-[9.5px] mt-0.5">
                <span>Bénéfice Net Cash :</span>
                <span>{fmtEur(beneficeNetCash)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Tableau Prévisionnel Financier - Vue Détaillée Complète (20 Ans) */}
        <div className="overflow-x-auto w-full rounded-lg border border-slate-200 shadow-2xs">
          <table className="w-full border-collapse border border-slate-200 text-[7.5px]">
            <thead>
              <tr className="bg-slate-100">
                <td className="px-1.5 py-1 border-r border-b border-slate-200 text-[8px] font-black text-slate-800 w-[180px] min-w-[180px]">Indicateurs Financiers (€)</td>
                {tableRows.map((r, i) => (
                  <td key={i} className="px-1 py-1 border-r border-b border-slate-200 text-center font-bold bg-slate-50 text-[8px] text-slate-900 min-w-[54px]">{r.year}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* SECTION 1 : REVENUS */}
              <tr className="bg-amber-400 font-bold uppercase text-[7.5px] text-slate-900">
                <td className="px-1.5 py-0.5 border-r border-b border-slate-300" colSpan={tableRows.length + 1}>CHIFFRE D'AFFAIRES & RECETTES (TARIF S21)</td>
              </tr>
              <DataRow label="Vente Énergie Réseau (Injection Totale)" propName="ca" isCurrency indent />
              <DataRow label="TOTAL RECETTES BRUTES" propName="caTotal" isCurrency bold className="bg-slate-50 text-blue-900 font-bold" />

              {/* SECTION 2 : OPEX */}
              <tr className="bg-slate-100 font-bold uppercase text-[7.5px] text-slate-800">
                <td className="px-1.5 py-0.5 border-r border-b border-slate-200" colSpan={tableRows.length + 1}>CHARGES D'EXPLOITATION (OPEX)</td>
              </tr>
              <DataRow label="Maintenance & Monitoring Centrale" propName="maint" isCurrency indent />
              <DataRow label="Assurance RC & Dommages aux Biens" propName="assur" isCurrency indent />
              <DataRow label="Location Compteur & Taxes Locales" propName="taxes" isCurrency indent />
              <DataRow label="Loyer Foncier / Bâtiment" propName="loyer" isCurrency indent />
              <DataRow label="Provision Onduleurs (MRA Année 11)" propName="mra" isCurrency indent />
              <DataRow label="TOTAL CHARGES D'EXPLOITATION (OPEX)" propName="opex" isCurrency bold className="bg-slate-50 text-slate-800 font-bold" />

              {/* SECTION 3 : SOLDES FINANCIERS & DETTE */}
              <tr className="bg-slate-100 font-bold uppercase text-[7.5px] text-slate-800">
                <td className="px-1.5 py-0.5 border-r border-b border-slate-200" colSpan={tableRows.length + 1}>SOLDES FINANCIERS, DETTE & FISCALITÉ</td>
              </tr>
              <DataRow label="EBITDA (EBE)" propName="ebitda" isCurrency bold className="bg-blue-50 text-blue-900 font-black" />
              <DataRow label="Amortissement Linéaire (20 ans)" propName="amortissement" isCurrency indent />
              <DataRow label="Résultat d'Exploitation (EBIT)" propName="ebit" isCurrency indent />
              <DataRow label="Intérêts d'Emprunt (4,30%)" propName="interets" isCurrency indent />
              <DataRow label="Résultat Fiscal / Courant" propName="resFiscal" isCurrency indent />
              <DataRow label="Impôt sur les Sociétés (IS)" propName="is" isCurrency indent />
              <DataRow label="Remboursement Principal Dette" propName="principal" isCurrency indent />
              <DataRow label="Service de la Dette (Senior 20 ans)" propName="serviceDette" isCurrency bold />
              <DataRow label="DSCR Annuel" propName="dscr" format={v => (v > 9 ? '9.99' : (v ?? 0).toFixed(2))} bold className="bg-slate-50 text-slate-800 font-extrabold" />

              {/* TRÉSORERIE NETTE ANNUELLE */}
              <tr className="bg-amber-400 font-black text-slate-950 text-[8px]">
                <td className="px-1.5 py-0.5 uppercase border-r border-slate-300 font-black">TRÉSORERIE NETTE ANNUELLE (AVEC DETTE)</td>
                {tableRows.map((r, i) => (
                  <td key={i} className="px-1 py-0.5 text-right border-r border-slate-300 font-black text-slate-950">
                    {fmtEur(r.tresorerie)}
                  </td>
                ))}
              </tr>
              {/* TRÉSORERIE CUMULÉE */}
              <tr className="bg-emerald-50 font-bold text-emerald-950 text-[7.5px]">
                <td className="px-1.5 py-0.5 border-r border-slate-200 font-bold text-emerald-900">Trésorerie Nette Cumulée</td>
                {tableRows.map((r, i) => (
                  <td key={i} className="px-1 py-0.5 text-right border-r border-slate-200 font-bold text-emerald-800">
                    {fmtEur(r.cumulCashFlow)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Pied de Page */}
      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500 font-medium">
        <div>Nelson Energy Advisory • Fiche Centrale Photovoltaïque Unitaire #{siteIndex} ({site.name || site.siteName})</div>
        <div className="font-semibold text-slate-600">Arrêté Tarifaire S21 • Injection Réseau Enedis HTA • TopCon 465 Wc</div>
        <div className="font-bold text-[#0b192c]">Fiche {siteIndex} / {totalSites}</div>
      </div>
    </div>
  );
}
