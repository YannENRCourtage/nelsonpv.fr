import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Building2,
  Zap,
  Coins,
  CheckCircle2
} from 'lucide-react';
import {
  calculateThirdPartyFinancing,
  calculateBankLoan,
  calculateLeasingSubscription
} from '@/services/solarFinancingEngine';

export default function SolarFinancingComparisonSection({
  powerKwc = 100,
  annualRevenue = 21985,
  capexHT = 92000,
  rentMultiplierDefault = 14
}) {
  const [rentMultiplier, setRentMultiplier] = useState(rentMultiplierDefault || 14);
  const [bankDuration, setBankDuration] = useState(20);
  const [leasingDuration, setLeasingDuration] = useState(20);

  // 1. Tiers-Financement
  const thirdParty = useMemo(() => {
    return calculateThirdPartyFinancing({
      powerKwc,
      annualRevenue,
      rentMultiplier
    });
  }, [powerKwc, annualRevenue, rentMultiplier]);

  // 2. Crédit Bancaire
  const bankLoan = useMemo(() => {
    return calculateBankLoan({
      capexHT,
      durationYears: bankDuration,
      annualRevenue
    });
  }, [capexHT, bankDuration, annualRevenue]);

  // 3. Abonnement / Leasing SunLib
  const leasing = useMemo(() => {
    return calculateLeasingSubscription({
      capexHT,
      powerKwc,
      annualRevenue
    });
  }, [capexHT, powerKwc, annualRevenue]);

  const activeLeasingOption = useMemo(() => {
    return leasing.durations.find(d => d.durationYears === leasingDuration) || leasing.durations[2];
  }, [leasing, leasingDuration]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
      
      {/* En-tête de la section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black tracking-wide uppercase mb-2">
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            Ingénierie Financière Solaire
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Solutions de Financement
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Comparez les 3 scénarios de financement pour valoriser votre toiture selon vos objectifs de trésorerie et de propriété.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-4 text-xs shrink-0">
          <div>
            <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Centrale étudiée</span>
            <span className="font-black text-slate-800 text-sm">{powerKwc} kWc</span>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">CA Vente EDF OA</span>
            <span className="font-black text-emerald-600 text-sm">~{annualRevenue.toLocaleString('fr-FR')} €/an</span>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Investissement CAPEX</span>
            <span className="font-black text-slate-800 text-sm">{capexHT.toLocaleString('fr-FR')} € HT</span>
          </div>
        </div>
      </div>

      {/* Les 3 Cadres Comparatifs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── CADRE 1 : TIERS-FINANCEMENT ──────────────────────────────── */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-50/50 via-white to-white p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
            0 € d'apport
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Tiers-Financement</h4>
                <span className="text-xs font-semibold text-emerald-700 block">Bail emphytéotique 30 ans</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>L'investisseur prend en charge 100% de la centrale</strong> (CAPEX, raccordement, exploitation, assurances). Vous percevez un loyer garanti sans aucun risque.
            </p>

            {/* Sélecteur du multiplicateur de loyer */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Multiplicateur de loyer :</span>
                <span className="font-black text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-md">
                  {rentMultiplier} € / kWc / an
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[9, 12, 14, 16].map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setRentMultiplier(mult)}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all ${
                      rentMultiplier === mult
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-100/50'
                    }`}
                  >
                    {mult} €
                  </button>
                ))}
              </div>
            </div>

            {/* Indicateurs clés */}
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Investissement client</span>
                <span className="font-black text-emerald-600 text-sm">0 € HT</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Loyer fixe garanti (Ans 1 à 20)</span>
                <span className="font-black text-slate-800 text-sm">+{thirdParty.annualRentFixed.toLocaleString('fr-FR')} € / an</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Cumul loyers sur 20 ans</span>
                <span className="font-black text-slate-900 text-sm">+{thirdParty.cumulYears1To20.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Intéressement 10% (Ans 21 à 30)</span>
                <span className="font-black text-emerald-700 text-sm">+{thirdParty.annualProfitSharing.toLocaleString('fr-FR')} € / an</span>
              </div>
              <div className="bg-emerald-100/70 border border-emerald-300 rounded-2xl p-3 text-center">
                <span className="text-[11px] font-bold text-emerald-800 block uppercase tracking-wider">
                  Gains cumulés sur 30 ans
                </span>
                <span className="text-2xl font-black text-emerald-800 block mt-0.5">
                  +{thirdParty.totalGains30Years.toLocaleString('fr-FR')} €
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Zéro endettement, toiture valorisée clé en main</span>
          </div>
        </div>

        {/* ─── CADRE 2 : CRÉDIT BANCAIRE PROFESSIONNEL ──────────────────── */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/50 via-white to-white p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
            Propriétaire J1
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shadow-2xs shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Crédit Bancaire</h4>
                <span className="text-xs font-semibold text-blue-700 block">Prêt professionnel amortissable</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Vous êtes propriétaire dès le premier jour</strong> de l'actif solaire. Les recettes EDF OA remboursent directement l'emprunt et génèrent un excédent net.
            </p>

            {/* Sélecteur de durée du prêt */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Durée de remboursement :</span>
                <span className="font-black text-blue-800 bg-blue-200/60 px-2 py-0.5 rounded-md">
                  {bankDuration} ans ({bankDuration * 12} mois)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[10, 15, 20, 25].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setBankDuration(d)}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all ${
                      bankDuration === d
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-100/50'
                    }`}
                  >
                    {d} ans
                  </button>
                ))}
              </div>
            </div>

            {/* Indicateurs clés */}
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Mensualité de crédit</span>
                <span className="font-black text-blue-700 text-sm">
                  ~{Number(bankLoan?.monthlyPaymentExact || 0).toLocaleString('fr-FR')} € / mois
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Annuité de remboursement</span>
                <span className="font-black text-slate-800 text-sm">
                  {Number(bankLoan?.annualPaymentExact || 0).toLocaleString('fr-FR')} € / an
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Coût total du crédit</span>
                <span className="font-bold text-slate-600 text-xs">
                  {Number(bankLoan?.totalRepaid || 0).toLocaleString('fr-FR')} € (intérêts : +{Number(bankLoan?.totalInterest || 0).toLocaleString('fr-FR')} €)
                </span>
              </div>
              <div className="bg-blue-100/70 border border-blue-300 rounded-2xl p-3 text-center">
                <span className="text-[11px] font-bold text-blue-900 block uppercase tracking-wider">
                  Cash-flow net annuel (Vente - Crédit)
                </span>
                <span className={`text-2xl font-black block mt-0.5 ${
                  Number(bankLoan?.annualNetCashflow ?? bankLoan?.annualNetCashFlow ?? 0) >= 0 ? 'text-blue-950' : 'text-amber-700'
                }`}>
                  {Number(bankLoan?.annualNetCashflow ?? bankLoan?.annualNetCashFlow ?? 0) >= 0 ? '+' : ''}{Number(bankLoan?.annualNetCashflow ?? bankLoan?.annualNetCashFlow ?? 0).toLocaleString('fr-FR')} € / an
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Amortissement comptable de l'actif & valorisation patrimoniale</span>
          </div>
        </div>

        {/* ─── CADRE 3 : ABONNEMENT SOLAIRE (LEASING / SUNLIB) ──────────── */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-purple-200 bg-gradient-to-b from-purple-50/50 via-white to-white p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
            Option rachat 1 €
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-2xs shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Abonnement Solaire</h4>
                <span className="text-xs font-semibold text-purple-700 block">Leasing / LOA Professionnelle</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Formule tout-en-un sans impacter votre trésorerie</strong>. Loyers déductibles du résultat fiscal, option d'achat à 1 € pour devenir propriétaire au terme.
            </p>

            {/* Sélecteur de durée de leasing */}
            <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Durée du contrat leasing :</span>
                <span className="font-black text-purple-800 bg-purple-200/60 px-2 py-0.5 rounded-md">
                  {leasingDuration} ans ({activeLeasingOption.annualRate}% / an)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[10, 15, 20, 25].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setLeasingDuration(d)}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all ${
                      leasingDuration === d
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-100/50'
                    }`}
                  >
                    {d} ans
                  </button>
                ))}
              </div>
            </div>

            {/* Indicateurs clés */}
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Mensualité d'abonnement HT</span>
                <span className="font-black text-purple-700 text-sm">
                  {activeLeasingOption.monthlyPaymentHT.toLocaleString('fr-FR')} € / mois HT
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Annuité d'abonnement HT</span>
                <span className="font-black text-slate-800 text-sm">
                  {activeLeasingOption.annualPaymentHT.toLocaleString('fr-FR')} € / an HT
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Option de rachat au terme</span>
                <span className="font-black text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  1,00 € symbolique
                </span>
              </div>
              <div className="bg-purple-100/70 border border-purple-300 rounded-2xl p-3 text-center">
                <span className="text-[11px] font-bold text-purple-900 block uppercase tracking-wider">
                  Bilan annuel (Vente EDF OA - Abonnement)
                </span>
                <span className={`text-2xl font-black block mt-0.5 ${
                  activeLeasingOption.annualNetCashflow >= 0 ? 'text-emerald-700' : 'text-purple-950'
                }`}>
                  {activeLeasingOption.annualNetCashflow >= 0 ? '+' : ''}{activeLeasingOption.annualNetCashflow.toLocaleString('fr-FR')} € / an
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Traitement comptable hors-bilan, trésorerie préservée</span>
          </div>
        </div>

      </div>

    </div>
  );
}
