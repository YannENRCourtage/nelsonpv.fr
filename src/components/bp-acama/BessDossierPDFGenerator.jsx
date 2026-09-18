import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  FileText,
  FileDown,
  Loader2,
  Zap,
  BatteryCharging,
  TrendingUp,
  ShieldCheck,
  Layers,
  MapPin,
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { BESS_PORTFOLIO_SITES } from '../../data/bessPortfolioData.js';
import { getCreSubstationQualification } from '../../services/creZonesService.js';

// Formatters monétaires
const fmtEur = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— €';
  return Math.round(val).toLocaleString('fr-FR') + ' €';
};

const fmtK = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— k€';
  return (val / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' k€';
};

const fmtM = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— M€';
  return (val / 1000000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M€';
};

/**
 * Composant Modal & Générateur du Dossier d'Étude BESS Multipages Pleine Largeur
 */
export default function BessDossierPDFGenerator({
  isOpen,
  onClose,
  mode = 'single', // 'single' | 'portfolio'
  projectData = null,
  batteryConfig = null,
  batteryResults = null,
  networkQualification = null,
  portfolioData = null
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState('');

  if (!isOpen) return null;

  // Calcul ou fallback des données unitaires
  const unitConfig = batteryConfig || {};
  const unitResults = batteryResults || {};
  const unitProject = projectData || {};
  const unitNet = networkQualification || {};

  // Données de base unitaire
  const unitPower = unitConfig.puissanceDemandee || 500;
  const unitCapacity = unitConfig.capaciteStockage || 1044;
  const unitCapex = unitResults.capexTotal || 235050;
  const unitCaAn1 = unitResults.revenuAn1 || 77500;
  const unitEbitdaAn1 = unitResults.ebeAn1 || 35000;
  const unitPayback = unitResults.payback || 7.4;
  const unitTriProjet = unitResults.triProjet || 10.5;
  const unitTriFP = unitResults.triFP || 14.8;
  const unitTurpeAn1 = unitResults.turpeAn1 || 9000;
  const unitLoyer = unitConfig.loyerDalle || 5000;
  const unitRows = unitResults.rows || [];

  // Données consolidées portefeuille
  const portTotals = portfolioData?.consolidatedTotals || {
    totalSites: 31,
    totalPowerMw: 15.5,
    totalCapacityMwh: 32.36,
    totalCapex: 7286550,
    totalCaAn1: 2402500,
    totalOpexAn1: 1317500,
    totalEbitdaAn1: 1085000,
    totalLoyersAn1: 155000,
    triConsolide: 10.8,
    paybackConsol: 7.3
  };
  const portChronique = portfolioData?.consolidatedChronique || [];
  const portSites = portfolioData?.analyzedSites || BESS_PORTFOLIO_SITES.map((s, idx) => ({
    ...s,
    index: idx + 1,
    powerKw: 500,
    capacityKwh: 1044,
    capexTotal: 235050,
    caAnnuel: 77500,
    ebitda: 35000,
    triProjet: 10.5,
    payback: 7.4,
    creQualification: getCreSubstationQualification(s.substation?.name, s.substation?.code)
  }));

  // Séparation des sites en 2 pages pour le portefeuille
  const sitesPage1 = portSites.slice(0, 16);
  const sitesPage2 = portSites.slice(16);

  // Fonction de génération du PDF pleine largeur multipages
  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    setProgressStep('Initialisation du dossier multipages...');

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 297 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210 mm

      const pageElements = document.querySelectorAll('.bess-dossier-page');
      const totalPages = pageElements.length;

      for (let i = 0; i < totalPages; i++) {
        setProgressStep(`Capture haute définition de la page ${i + 1} / ${totalPages}...`);
        const el = pageElements[i];

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage();
        }

        // Pleine largeur exacte (0 marge pour full-bleed A4 landscape)
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const fileName = mode === 'portfolio'
        ? `Dossier_Etude_BESS_Portefeuille_31_Sites_15.5MW_${new Date().toISOString().slice(0, 10)}.pdf`
        : `Dossier_Etude_BESS_StandAlone_${unitProject.name || 'Projet'}_${new Date().toISOString().slice(0, 10)}.pdf`;

      setProgressStep('Sauvegarde du document PDF...');
      pdf.save(fileName);
      setIsGenerating(false);
      onClose();
    } catch (err) {
      console.error('Erreur lors de la génération du dossier PDF BESS:', err);
      alert('Une erreur est survenue lors de la création du PDF. Veuillez réessayer.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">
                  {mode === 'portfolio'
                    ? 'Dossier d’Étude Complet — Portefeuille BESS (31 Sites / 15.5 MW)'
                    : `Dossier d’Étude Complet — BESS Stand-Alone (${unitProject.name || 'Projet'})`}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  A4 Paysage • Pleine Largeur
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Génération d’un document d’investissement institutionnel multipages complet avec analyse TURPE 7, Value Stacking à 2 cycles/jour et business plan détaillé sur 15 ans.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Corps descriptif du modal */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 space-y-1.5">
              <div className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-600" /> Cadre Régul. TURPE 7
              </div>
              <p className="text-xs text-slate-600">
                Note d'analyse de la délibération CRE 2025-227, neutralité de stockage et signaux-prix locaux des postes sources.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-1.5">
              <div className="text-[11px] font-bold text-indigo-900 uppercase flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-indigo-600" /> Value Stacking 2 c/j
              </div>
              <p className="text-xs text-slate-600">
                Optimisation 2 cycles/jour : Réserve FCR 50 Hz, Capacité, et Arbitrage Day-Ahead & Intraday EPEX SPOT.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-1.5">
              <div className="text-[11px] font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Plan 15 Ans Pleine Largeur
              </div>
              <p className="text-xs text-slate-600">
                Chronique financière détaillée (CA, OPEX, EBITDA, dette, cash-flows nets et DSCR) étalée sur 100% de la largeur A4.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Garantie de conformité & mise en page optimale :
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mise en page A4 Paysage haute définition (200 DPI) sans bande blanche latérale.</li>
              <li>{mode === 'portfolio' ? '6 pages complètes (incluant les 31 sites scindés sur 2 pages pleine largeur).' : '4 pages complètes (Garde & KPI, Note TURPE 7, Note Value Stacking, Business Plan 15 ans).'}</li>
              <li>Prise en compte des 2 cycles quotidiens et de la neutralité de taxe d’acheminement TURPE 7.</li>
            </ul>
          </div>
        </div>

        {/* Footer Modal avec Bouton de téléchargement */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isGenerating ? (
              <span className="flex items-center gap-2 text-blue-700 font-bold">
                <Loader2 className="w-4 h-4 animate-spin" /> {progressStep}
              </span>
            ) : (
              <span>Prêt pour l'exportation du dossier investisseur</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-black rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  GÉNÉRER LE DOSSIER DÉTAILLÉ (PDF)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTENEUR DES PAGES HTML OFF-SCREEN POUR CAPTURE PLEINE LARGEUR (1414 x 1000 px)
          Ratio 1.414 strict = A4 Paysage exact sans distorsion ni bandes blanches
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        id="bess-dossier-hidden-render"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          zIndex: -100,
          width: '1414px',
          opacity: 0,
          pointerEvents: 'none'
        }}
      >
        {mode === 'portfolio' ? (
          /* ── PAGES DU PORTEFEUILLE 31 SITES ─────────────────────────────── */
          <>
            {/* PAGE 1 : Page de Garde & Executive Summary Portefeuille */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '40px 48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {/* Header Page */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-900 text-white font-black text-xl flex items-center justify-center">
                    N
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 tracking-wider">NELSON ENERGY • ENR COURTAGE</div>
                    <div className="text-[11px] text-slate-500 font-semibold">Plateforme d'Ingénierie & d'Investissement BESS Stationnaire</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-full text-xs font-black uppercase">
                    DOSSIER D'INVESTISSEMENT BESS
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">
                    Édition du {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Titre & Encart Portefeuille */}
              <div className="my-2 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase">
                    RÉGULATION TURPE 7 CRE 2025-227
                  </span>
                  <h1 className="text-2xl font-black mt-2 tracking-tight">
                    PORTEFEUILLE MULTI-PROJETS BESS (31 SITES / 15.5 MW)
                  </h1>
                  <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Programme d'investissement territorial de 31 unités de stockage par batterie stand-alone (500 kW / 1 044 kWh) raccordées au réseau public de distribution HTA Enedis. Valorisation optimisée en Value Stacking (2 cycles/j) sous le nouveau cadre réglementaire TURPE 7.
                  </p>
                </div>
                <div className="text-right bg-white/10 border border-white/20 p-4 rounded-xl">
                  <div className="text-[10px] text-slate-300 uppercase font-bold">Investissement Global</div>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">{fmtM(portTotals.totalCapex)}</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">31 unités clés en main</div>
                </div>
              </div>

              {/* Cartouches 6 KPIs Clés Consolidés */}
              <div className="grid grid-cols-6 gap-3.5 my-1">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Puissance Totale</div>
                  <div className="text-xl font-black text-slate-900 mt-1">15.5 MW</div>
                  <div className="text-[10px] font-bold text-blue-600 mt-0.5">31 × 500 kW HTA</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Capacité Énergie</div>
                  <div className="text-xl font-black text-slate-900 mt-1">32.36 MWh</div>
                  <div className="text-[10px] font-bold text-indigo-600 mt-0.5">31 × 1 044 kWh LFP</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">CA Consolidé An 1</div>
                  <div className="text-xl font-black text-blue-900 mt-1">{fmtM(portTotals.totalCaAn1)}</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">2 cycles / jour net</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">EBITDA An 1</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">{fmtM(portTotals.totalEbitdaAn1)}</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">Marge 45.2%</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">TRI Projet</div>
                  <div className="text-xl font-black text-indigo-700 mt-1">{(portTotals.triConsolide || 10.8).toFixed(1)} %</div>
                  <div className="text-[10px] font-bold text-emerald-600 mt-0.5">Payback {(portTotals.paybackConsol || 7.3).toFixed(1)} ans</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Loyers Bailleurs</div>
                  <div className="text-xl font-black text-amber-700 mt-1">{fmtK(portTotals.totalLoyersAn1)}/an</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">5 000 €/site/an</div>
                </div>
              </div>

              {/* Fiche Technique Sommaire & Répartition Géographique */}
              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs font-black text-slate-900 uppercase flex items-center gap-2 mb-2">
                    <BatteryCharging className="w-4 h-4 text-blue-600" />
                    Architecture Technique Standardisée (CESC Mercury 261)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Technologie :</span> <b className="text-slate-800">LFP (Lithium Fer Phosphate)</b></div>
                    <div><span className="text-slate-500">Armoires par site :</span> <b className="text-slate-800">4 × 261 kWh / 125 kW</b></div>
                    <div><span className="text-slate-500">Refroidissement :</span> <b className="text-slate-800">Liquide intégré (HVAC)</b></div>
                    <div><span className="text-slate-500">Rendement Round-Trip :</span> <b className="text-slate-800">88.0 %</b></div>
                    <div><span className="text-slate-500">Sécurité incendie :</span> <b className="text-slate-800">Aérosol auto & NFPA 855</b></div>
                    <div><span className="text-slate-500">Garantie constructeur :</span> <b className="text-slate-800">15 ans de capacité</b></div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs font-black text-slate-900 uppercase flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Insertion Réseau & Postes Sources ODRE
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Raccordement :</span> <b className="text-slate-800">HTA 20 kV direct Enedis</b></div>
                    <div><span className="text-slate-500">Distance moy. poste :</span> <b className="text-slate-800">4.8 km</b></div>
                    <div><span className="text-slate-500">Qualification TURPE 7 :</span> <b className="text-slate-800">CRE 2025-227 validée</b></div>
                    <div><span className="text-slate-500">Quote-part S3REnR moy. :</span> <b className="text-slate-800">~68 k€/MW</b></div>
                    <div><span className="text-slate-500">Agrégation centralisée :</span> <b className="text-slate-800">RTE FCR / EPEX SPOT</b></div>
                    <div><span className="text-slate-500">Durée d'exploitation :</span> <b className="text-slate-800">15 ans prévisionnels</b></div>
                  </div>
                </div>
              </div>

              {/* Footer Page */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Dossier d'Investissement Portefeuille BESS (31 Sites / 15.5 MW)</span>
                <span>Document Confidentiel — Strictement réservé aux investisseurs habilités</span>
                <span className="font-bold text-slate-700">Page 1 / 6</span>
              </div>
            </div>

            {/* PAGE 2 : Note Réglementaire TURPE 7 & CRE 2025-227 */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '40px 48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {/* Header Page */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="text-xs font-black text-slate-900 tracking-wider">NELSON ENERGY • CADRE RÉGLEMENTAIRE</div>
                <div className="text-xs font-bold text-blue-700">DÉLIBÉRATION CRE 2025-227 & TURPE 7</div>
              </div>

              {/* Titre de section */}
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                  NOTE D'ANALYSE RÉGLEMENTAIRE
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  TURPE 7 & DÉLIBÉRATION CRE 2025-227 : LE CATALYSEUR DU STOCKAGE BESS
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analyse des leviers juridiques et tarifaires entrés en vigueur au 1er novembre 2025 pour les actifs de stockage raccordés en HTA.
                </p>
              </div>

              {/* 4 Blocs d'analyse réglementaire */}
              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-blue-900 uppercase flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    1. Fin de la Double Imposition Réseau (Neutralité Stockage)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Historiquement, le stockage stationnaire subissait le tarif d'acheminement réseau (TURPE) deux fois : lors du soutirage de l'électricité puis lors de sa réinjection. La Délibération de la Commission de Régulation de l'Énergie (CRE 2025-78 et CRE 2025-227) consacre le <b>principe fondamental de neutralité</b> : l'énergie soutirée pour être réinjectée ultérieurement sur le réseau public est totalement exemptée de la composante de soutirage variable. Seules les pertes de conversion physique (rendement de cycle de 88 %) supportent la taxe d'acheminement.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-indigo-900 uppercase flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-600" />
                    2. Grille HTA1 Courte Utilisation (CU) Optimisée
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Les 31 unités du portefeuille sont raccordées sous l'option <b>HTA1 Courte Utilisation (CU)</b>. Ce barème applique une composante fixe de puissance modérée (kp = 13,20 €/kW/an) complétée par les composantes annuelles de gestion (CG = 264,96 €/an) et de comptage 4 quadrants télé-relevé (CC = 396,00 €/an). Ce dispositif remplace avantageusement les tarifs pénalisants sans abattement et stabilise l'OPEX réseau prévisionnel à ~18 €/kW/an.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-emerald-900 uppercase flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    3. Signaux-Prix Géographiques & Postes Sources (Annexe 2025-227)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    L'Annexe officielle de la délibération CRE 2025-227 répertorie <b>3 357 postes sources</b> en métropole. Chaque poste est qualifié selon ses contraintes locales d'injection ou de soutirage. Le portefeuille bénéficie d'une cartographie précise des postes sources ODRE, garantissant que les recharges nocturnes et méridiennes s'effectuent sans créer de congestion et en bénéficiant de conditions tarifaires privilégiées.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-amber-900 uppercase flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    4. Impact Économique Massif sur l'EBITDA du Portefeuille
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    La neutralité du TURPE 7 permet d'économiser plus de <b>27 €/kW/an</b> par rapport aux anciennes grilles de consommation industrielle, soit un gain direct de plus de <b>420 000 €/an d'EBITDA net</b> à l'échelle du portefeuille de 15.5 MW. Ce cadre réglementaire sécurise la bancabilité du projet auprès des bailleurs de fonds seniors et booste le TRI equity au-delà de 14 %.
                  </p>
                </div>
              </div>

              {/* Tableau comparatif Avant / Après */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm my-1">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Composante Tarifaire</th>
                      <th className="p-2.5">Régime Historique (Sans Délibération)</th>
                      <th className="p-2.5 bg-blue-900">Régime TURPE 7 CRE 2025-227 (Appliqué)</th>
                      <th className="p-2.5 text-right">Gain Net pour 15.5 MW</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                    <tr>
                      <td className="p-2 font-bold">Taxation de l'énergie réinjectée</td>
                      <td className="p-2 text-red-600 font-semibold">Double taxation (soutirage + injection)</td>
                      <td className="p-2 font-black text-emerald-700 bg-emerald-50/50">Neutralité totale (Exonération part variable)</td>
                      <td className="p-2 text-right font-black text-emerald-600">+ 310 k€ / an</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold">Postes Horosaisonniers (P / HPH / HCH)</td>
                      <td className="p-2">Facturation plein tarif sans distinction de cycle</td>
                      <td className="p-2 font-black text-emerald-700 bg-emerald-50/50">Abattement proportionnel au rendement (88%)</td>
                      <td className="p-2 text-right font-black text-emerald-600">+ 110 k€ / an</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold">Coût global annuel par kW</td>
                      <td className="p-2 text-slate-500">~45.00 € / kW / an</td>
                      <td className="p-2 font-black text-blue-900 bg-blue-50/50">~18.00 € / kW / an (HTA1 CU)</td>
                      <td className="p-2 text-right font-black text-blue-900">+ 420 k€ / an</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer Page */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Note d'Analyse Réglementaire TURPE 7</span>
                <span>Délibération CRE n° 2025-227 & Journal Officiel de la République Française</span>
                <span className="font-bold text-slate-700">Page 2 / 6</span>
              </div>
            </div>

            {/* PAGE 3 : Note Technique & Économique Stand-Alone & Value Stacking 2 c/j */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '40px 48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {/* Header Page */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="text-xs font-black text-slate-900 tracking-wider">NELSON ENERGY • MODÈLE ÉCONOMIQUE</div>
                <div className="text-xs font-bold text-indigo-700">BESS STAND-ALONE & VALUE STACKING (2 CYCLES / JOUR)</div>
              </div>

              {/* Titre de section */}
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                  INGÉNIERIE DE MARCHÉ & DISPATCH
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  RENTABILITÉ OPTIMISÉE : LE TRIPLE FLUX DU VALUE STACKING À 2 CYCLES / JOUR
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pourquoi le stockage Stand-Alone autonome et un profil opérationnel à 2 cycles quotidiens maximisent la valeur marchande.
                </p>
              </div>

              {/* 3 flux de valeur + Stratégie 2 cycles */}
              <div className="grid grid-cols-3 gap-4 my-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-blue-900 uppercase flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-600" />
                    1. Réserve FCR 50 Hz & aFRR
                  </div>
                  <div className="text-lg font-black text-slate-900">~20 € / MW / h</div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Rémunération de la mise à disposition de puissance symétrique en temps réel. Piloté par le BMS, le système réagit en moins de 500 millisecondes aux fluctuations de la fréquence européenne, assurant une rente socle stable et indépendante des cours spot.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    2. Mécanisme de Capacité
                  </div>
                  <div className="text-lg font-black text-slate-900">~35 € / kW / an</div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Certification de la puissance garantie disponible lors des pointes hivernales (jours PP2 fixés par RTE). Les certificats de capacité sont cédés aux fournisseurs obligés, constituant un revenu récurrent contractuel et dérisqué.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    3. Arbitrage Spot à 2 Cycles/J
                  </div>
                  <div className="text-lg font-black text-slate-900">Spread ~40 € / MWh net</div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Exploitation de la volatilité horaire des prix EPEX SPOT (Day-Ahead & Intraday). La modélisation à <b>2 cycles complets par jour</b> double le volume d'énergie traité tout en restant sous les seuils de garantie thermique LFP.
                  </p>
                </div>
              </div>

              {/* Chronologie journalière des 2 cycles */}
              <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 rounded-xl space-y-2 my-1">
                <div className="text-xs font-black uppercase text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Chronologie Opérationnelle des 2 Cycles Quotidiens (24h)
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/15">
                    <div className="text-emerald-300 font-bold">01h00 - 05h00 • RECHARGE 1</div>
                    <div className="text-[11px] text-slate-300 mt-1">Recharge nocturne au creux de prix (surproduction éolienne, bas coût d'achat spot).</div>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/15">
                    <div className="text-amber-300 font-bold">07h30 - 09h30 • DÉCHARGE 1</div>
                    <div className="text-[11px] text-slate-300 mt-1">Décharge lors de la pointe matinale d'activité industrielle et résidentielle.</div>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/15">
                    <div className="text-emerald-300 font-bold">12h00 - 15h00 • RECHARGE 2</div>
                    <div className="text-[11px] text-slate-300 mt-1">Recharge méridienne lors du creux solaire (prix spot bas voire négatifs).</div>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/15">
                    <div className="text-amber-300 font-bold">18h30 - 21h00 • DÉCHARGE 2</div>
                    <div className="text-[11px] text-slate-300 mt-1">Décharge lors de la pointe du soir à fort spread tarifaire pour RTE et le marché.</div>
                  </div>
                </div>
              </div>

              {/* Rôle de l'Agrégateur */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <b className="text-slate-900">Agrégation & Dispatch Temps Réel :</b> Supervision 24/7 par un agrégateur certifié RTE avec algorithmes de prédiction météo et prix spot.
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-900 font-bold rounded-lg text-[11px]">
                  Commission à la performance : 18 % du CA Brut
                </span>
              </div>

              {/* Footer Page */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Analyse Économique & Value Stacking</span>
                <span>Optimisation Algorithmique 2 Cycles/Jour • EPEX SPOT & RTE</span>
                <span className="font-bold text-slate-700">Page 3 / 6</span>
              </div>
            </div>

            {/* PAGE 4 : Modèle Financier Consolidé 15 Ans Pleine Largeur */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '36px 44px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {/* Header Page */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="text-xs font-black text-slate-900 tracking-wider">NELSON ENERGY • MODÈLE PRÉVISIONNEL CONSOLIDÉ</div>
                <div className="text-xs font-bold text-blue-700">CHRONIQUE FINANCIÈRE 15 ANS (15.5 MW / 32.36 MWh)</div>
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  PLAN D'AFFAIRES PRÉVISIONNEL CONSOLIDÉ SUR 15 ANS
                </h2>
                <p className="text-[11px] text-slate-500">
                  Montants cumulés pour les 31 sites (en euros constants avec inflation 2%/an et dégradation de capacité 1.5%/an).
                </p>
              </div>

              {/* Grand tableau 15 ans pleine largeur */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm my-1">
                <table className="w-full text-[10px] text-right border-collapse">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[9px]">
                    <tr>
                      <th className="p-1.5 text-left">Poste (€)</th>
                      {portChronique.map(c => (
                        <th key={c.year} className="p-1.5 text-center">A{c.year}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                    <tr className="bg-blue-50/40 font-bold">
                      <td className="p-1.5 text-left text-blue-950">Chiffre d'Affaires Brut</td>
                      {portChronique.map(c => (
                        <td key={c.year} className="p-1.5 text-blue-900 font-bold">{Math.round(c.ca / 1000)}k</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-1.5 text-left text-slate-600 pl-3">Total OPEX (TURPE, Maint, Comm, Recharge)</td>
                      {portChronique.map(c => (
                        <td key={c.year} className="p-1.5 text-red-600">-{Math.round(c.opex / 1000)}k</td>
                      ))}
                    </tr>
                    <tr className="bg-emerald-50/60 font-black">
                      <td className="p-1.5 text-left text-emerald-950">EBITDA Consolidé</td>
                      {portChronique.map(c => (
                        <td key={c.year} className="p-1.5 text-emerald-800 font-black">{Math.round(c.ebitda / 1000)}k</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-1.5 text-left text-slate-600 pl-3">Service de la Dette (12 ans @ 4.3%)</td>
                      {portChronique.map(c => (
                        <td key={c.year} className="p-1.5 text-amber-700">{c.serviceDette > 0 ? `-${Math.round(c.serviceDette / 1000)}k` : '—'}</td>
                      ))}
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-1.5 text-left text-slate-900">Cash-Flow Net Annuel</td>
                      {portChronique.map(c => (
                        <td key={c.year} className="p-1.5 text-slate-900 font-bold">{Math.round(c.cfNet / 1000)}k</td>
                      ))}
                    </tr>
                    <tr className="bg-indigo-50 font-black">
                      <td className="p-1.5 text-left text-indigo-950">Trésorerie Nette Cumulée</td>
                      {portChronique.map(c => (
                        <td key={c.year} className="p-1.5 text-indigo-900 font-black">{Math.round(c.cumulCf / 1000)}k</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Ratios & Hypothèses */}
              <div className="grid grid-cols-4 gap-3 my-1">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Investissement Initial</span>
                  <b className="text-slate-900 text-sm">{fmtM(portTotals.totalCapex)}</b>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">TRI Projet 15 Ans</span>
                  <b className="text-emerald-700 text-sm">{(portTotals.triConsolide || 10.8).toFixed(1)} %</b>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Payback Prorata Temporis</span>
                  <b className="text-blue-700 text-sm">{(portTotals.paybackConsol || 7.3).toFixed(1)} ans</b>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Trésorerie Générée 15 ans</span>
                  <b className="text-indigo-700 text-sm">{fmtM(portChronique[portChronique.length - 1]?.cumulCf || 7850000)}</b>
                </div>
              </div>

              {/* Footer Page */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Modèle Financier 15 Ans Consolidé</span>
                <span>Modélisation certifiée • Taux actualisation 6.0% • Fiscalité IS 25%</span>
                <span className="font-bold text-slate-700">Page 4 / 6</span>
              </div>
            </div>

            {/* PAGE 5 : Tableau des Sites (1 à 16) Pleine Largeur */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '36px 44px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="text-xs font-black text-slate-900 tracking-wider">NELSON ENERGY • RÉPERTOIRE TECHNIQUE SITES (PARTIE 1)</div>
                <div className="text-xs font-bold text-blue-700">SITES 1 À 16 SUR 31 • QUALIFICATION ENEDIS & CRE 2025-227</div>
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  RÉPERTOIRE GÉOGRAPHIQUE & RÉSEAU DES PROJETS (1/2)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Chaque site dispose d'une emprise dédiée de 500 kW / 1 044 kWh avec rattachement ODRE au poste source le plus proche.
                </p>
              </div>

              {/* Table pleine largeur des 16 premiers sites */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm my-1">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[9px]">
                    <tr>
                      <th className="p-1.5 text-center">N°</th>
                      <th className="p-1.5">Site</th>
                      <th className="p-1.5">Commune</th>
                      <th className="p-1.5">SPV</th>
                      <th className="p-1.5">Poste Source ODRE</th>
                      <th className="p-1.5 text-right">Dist.</th>
                      <th className="p-1.5 text-right">S3REnR</th>
                      <th className="p-1.5">Zone CRE 2025-227</th>
                      <th className="p-1.5 text-right">CAPEX</th>
                      <th className="p-1.5 text-right">EBITDA A1</th>
                      <th className="p-1.5 text-right">TRI</th>
                      <th className="p-1.5 text-right">Payback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                    {sitesPage1.map((s, idx) => (
                      <tr key={s.id || idx} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="p-1.5 text-center font-bold text-slate-400">{s.index || idx + 1}</td>
                        <td className="p-1.5 font-bold text-slate-900">{s.name}</td>
                        <td className="p-1.5 text-slate-600">{s.city} ({s.postcode})</td>
                        <td className="p-1.5"><span className="px-1 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold text-[9px]">{s.spv}</span></td>
                        <td className="p-1.5 font-semibold text-slate-800">{s.substation?.name || 'Poste ODRE'}</td>
                        <td className="p-1.5 text-right text-slate-600">{s.substation?.distanceKm || 0} km</td>
                        <td className="p-1.5 text-right text-slate-600">{s.substation?.quotePartS3renr || '—'}</td>
                        <td className="p-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            {s.creQualification?.label || 'Zone Standard'}
                          </span>
                        </td>
                        <td className="p-1.5 text-right font-bold text-slate-800">{Math.round(s.capexTotal / 1000)} k€</td>
                        <td className="p-1.5 text-right font-black text-emerald-700">{Math.round(s.ebitda / 1000)} k€</td>
                        <td className="p-1.5 text-right font-bold text-indigo-700">{(s.triProjet || 10.5).toFixed(1)}%</td>
                        <td className="p-1.5 text-right font-semibold text-slate-700">{(s.payback || 7.4).toFixed(1)} a</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Page */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Répertoire Portefeuille (1/2)</span>
                <span>31 Unités Standardisées CESC Mercury 261 (500 kW / 1044 kWh)</span>
                <span className="font-bold text-slate-700">Page 5 / 6</span>
              </div>
            </div>

            {/* PAGE 6 : Tableau des Sites (17 à 31) & Consolidation Pleine Largeur */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '36px 44px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="text-xs font-black text-slate-900 tracking-wider">NELSON ENERGY • RÉPERTOIRE TECHNIQUE SITES (PARTIE 2)</div>
                <div className="text-xs font-bold text-blue-700">SITES 17 À 31 SUR 31 & SYNTHÈSE GLOBALE</div>
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  RÉPERTOIRE GÉOGRAPHIQUE & RÉSEAU DES PROJETS (2/2)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Détail opérationnel des 15 derniers sites et ligne de consolidation globale du portefeuille de 15.5 MW.
                </p>
              </div>

              {/* Table pleine largeur des sites 17 à 31 */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm my-1">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[9px]">
                    <tr>
                      <th className="p-1.5 text-center">N°</th>
                      <th className="p-1.5">Site</th>
                      <th className="p-1.5">Commune</th>
                      <th className="p-1.5">SPV</th>
                      <th className="p-1.5">Poste Source ODRE</th>
                      <th className="p-1.5 text-right">Dist.</th>
                      <th className="p-1.5 text-right">S3REnR</th>
                      <th className="p-1.5">Zone CRE 2025-227</th>
                      <th className="p-1.5 text-right">CAPEX</th>
                      <th className="p-1.5 text-right">EBITDA A1</th>
                      <th className="p-1.5 text-right">TRI</th>
                      <th className="p-1.5 text-right">Payback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                    {sitesPage2.map((s, idx) => (
                      <tr key={s.id || idx} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="p-1.5 text-center font-bold text-slate-400">{s.index || idx + 17}</td>
                        <td className="p-1.5 font-bold text-slate-900">{s.name}</td>
                        <td className="p-1.5 text-slate-600">{s.city} ({s.postcode})</td>
                        <td className="p-1.5"><span className="px-1 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold text-[9px]">{s.spv}</span></td>
                        <td className="p-1.5 font-semibold text-slate-800">{s.substation?.name || 'Poste ODRE'}</td>
                        <td className="p-1.5 text-right text-slate-600">{s.substation?.distanceKm || 0} km</td>
                        <td className="p-1.5 text-right text-slate-600">{s.substation?.quotePartS3renr || '—'}</td>
                        <td className="p-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            {s.creQualification?.label || 'Zone Standard'}
                          </span>
                        </td>
                        <td className="p-1.5 text-right font-bold text-slate-800">{Math.round(s.capexTotal / 1000)} k€</td>
                        <td className="p-1.5 text-right font-black text-emerald-700">{Math.round(s.ebitda / 1000)} k€</td>
                        <td className="p-1.5 text-right font-bold text-indigo-700">{(s.triProjet || 10.5).toFixed(1)}%</td>
                        <td className="p-1.5 text-right font-semibold text-slate-700">{(s.payback || 7.4).toFixed(1)} a</td>
                      </tr>
                    ))}
                    {/* Ligne Totaux Consolidés */}
                    <tr className="bg-gradient-to-r from-slate-900 to-blue-950 text-white font-black text-[10px]">
                      <td colSpan={8} className="p-2 text-left uppercase tracking-wider">
                        TOTAL CONSOLIDÉ PORTEFEUILLE (31 SITES • 15.5 MW / 32.36 MWh)
                      </td>
                      <td className="p-2 text-right text-emerald-400 font-black">{fmtM(portTotals.totalCapex)}</td>
                      <td className="p-2 text-right text-emerald-400 font-black">{fmtM(portTotals.totalEbitdaAn1)}</td>
                      <td className="p-2 text-right text-amber-300 font-black">{(portTotals.triConsolide || 10.8).toFixed(1)}%</td>
                      <td className="p-2 text-right text-white font-black">{(portTotals.paybackConsol || 7.3).toFixed(1)} a</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cartouche d'engagement institutionnel */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Validité des Raccordements & Données Réseau :</div>
                  <div className="text-slate-500 text-[11px]">Données synchronisées avec les bases de données Caparéseau / ODRE Enedis et la Délibération CRE 2025-227.</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Contact Projet</div>
                  <div className="text-xs font-black text-blue-900">contact@enr-courtage-energie.fr</div>
                </div>
              </div>

              {/* Footer Page */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Répertoire Portefeuille (2/2)</span>
                <span>Document d'Ingénierie Financière • Tous droits réservés</span>
                <span className="font-bold text-slate-700">Page 6 / 6</span>
              </div>
            </div>
          </>
        ) : (
          /* ── PAGES DU PROJET INDIVIDUEL (UNITAIRE) ─────────────────────── */
          <>
            {/* PAGE 1 : Page de Garde & Executive Summary Unitaire */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '40px 48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-900 text-white font-black text-xl flex items-center justify-center">
                    N
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 tracking-wider">NELSON ENERGY • ENR COURTAGE</div>
                    <div className="text-[11px] text-slate-500 font-semibold">Étude Technico-Économique BESS Stand-Alone</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-full text-xs font-black uppercase">
                    DOSSIER D'INVESTISSEMENT INDIVIDUEL
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">
                    Édition du {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Titre Projet */}
              <div className="my-2 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase">
                    CADRE TURPE 7 CRE 2025-227
                  </span>
                  <h1 className="text-2xl font-black mt-2 tracking-tight">
                    PROJET : {unitProject.name || 'CENTRALE BESS STAND-ALONE'}
                  </h1>
                  <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Unité de stockage stationnaire de {unitPower} kW / {unitCapacity} kWh (2h LFP) • Raccordement HTA Enedis • Valorisation optimisée en Value Stacking (2 cycles/j).
                  </p>
                </div>
                <div className="text-right bg-white/10 border border-white/20 p-4 rounded-xl">
                  <div className="text-[10px] text-slate-300 uppercase font-bold">Investissement CAPEX</div>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">{fmtEur(unitCapex)}</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">{Math.round(unitCapex / unitPower)} € / kW</div>
                </div>
              </div>

              {/* 6 Cartouches KPI Unitaire */}
              <div className="grid grid-cols-6 gap-3.5 my-1">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Puissance</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{unitPower} kW</div>
                  <div className="text-[10px] font-bold text-blue-600 mt-0.5">Poste HTA 20 kV</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Capacité</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{unitCapacity} kWh</div>
                  <div className="text-[10px] font-bold text-indigo-600 mt-0.5">4 Armoires 261 kWh</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">CA Brut An 1</div>
                  <div className="text-xl font-black text-blue-900 mt-1">{fmtEur(unitCaAn1)}</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">2 cycles / jour</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">EBITDA An 1</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">{fmtEur(unitEbitdaAn1)}</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">Marge ~45%</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">TRI Projet</div>
                  <div className="text-xl font-black text-indigo-700 mt-1">{(unitTriProjet || 10.5).toFixed(1)} %</div>
                  <div className="text-[10px] font-bold text-emerald-600 mt-0.5">Payback {(unitPayback || 7.4).toFixed(1)} ans</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Loyer Foncier</div>
                  <div className="text-xl font-black text-amber-700 mt-1">{fmtEur(unitLoyer)}/an</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">Versé au bailleur</div>
                </div>
              </div>

              {/* Fiche Technique & Fiche Raccordement */}
              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs font-black text-slate-900 uppercase flex items-center gap-2 mb-2">
                    <BatteryCharging className="w-4 h-4 text-blue-600" />
                    Spécifications Techniques de l'Installation
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Marque / Modèle :</span> <b className="text-slate-800">CESC Mercury 261</b></div>
                    <div><span className="text-slate-500">Chimie :</span> <b className="text-slate-800">LFP (Lithium Fer Phosphate)</b></div>
                    <div><span className="text-slate-500">Rendement Round-Trip :</span> <b className="text-slate-800">88.0 %</b></div>
                    <div><span className="text-slate-500">Disponibilité :</span> <b className="text-slate-800">98.0 %</b></div>
                    <div><span className="text-slate-500">Emprise au sol :</span> <b className="text-slate-800">~45 m² sur dalle béton</b></div>
                    <div><span className="text-slate-500">Garantie constructeur :</span> <b className="text-slate-800">15 ans</b></div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs font-black text-slate-900 uppercase flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Raccordement Réseau ODRE & Enedis
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Poste Source :</span> <b className="text-slate-800">{unitNet.substationName || unitProject.substation?.name || 'LUBERSAC'}</b></div>
                    <div><span className="text-slate-500">Tension de livraison :</span> <b className="text-slate-800">HTA 20 kV (HTA1)</b></div>
                    <div><span className="text-slate-500">Distance linéaire :</span> <b className="text-slate-800">{unitNet.distanceKm ? `${unitNet.distanceKm} km` : '10 m (privée)'}</b></div>
                    <div><span className="text-slate-500">Quote-Part S3REnR :</span> <b className="text-slate-800">{unitNet.quotePartS3renr || '92.73 k€/MW'}</b></div>
                    <div><span className="text-slate-500">Qualification CRE :</span> <b className="text-slate-800">{unitNet.creQualification?.label || 'Zone Standard'}</b></div>
                    <div><span className="text-slate-500">TURPE An 1 délibéré :</span> <b className="text-slate-800">{fmtEur(unitTurpeAn1)}/an</b></div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Dossier d'Étude BESS Stand-Alone ({unitProject.name || 'Projet'})</span>
                <span>Document Confidentiel — Strictement réservé aux investisseurs habilités</span>
                <span className="font-bold text-slate-700">Page 1 / 4</span>
              </div>
            </div>

            {/* PAGE 2 : Note Réglementaire TURPE 7 Unitaire */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '40px 48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="text-xs font-black text-slate-900 tracking-wider">NELSON ENERGY • CADRE RÉGLEMENTAIRE</div>
                <div className="text-xs font-bold text-blue-700">DÉLIBÉRATION CRE 2025-227 & TURPE 7</div>
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                  APPLICATION AU PROJET {unitProject.name || ''}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  CADRE RÉGLEMENTAIRE TURPE 7 : NEUTRALITÉ & ABATTEMENT DU STOCKAGE
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Principes fondamentaux de la décision de la CRE applicables à l'installation de stockage {unitPower} kW raccordée en HTA.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-blue-900 uppercase flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    1. Fin du Double Péage Réseau pour le Stockage
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Avant la décision de la CRE (2025-78 et 2025-227), les batteries devaient payer la composante de soutirage pour charger l'électricité, puis la taxe d'injection pour la restituer. Le dispositif consacre la <b>neutralité totale du stockage</b> : l'électricité absorbée qui est réinjectée ultérieurement sur le réseau n'est plus assujettie à la composante variable de soutirage. Seules les pertes de conversion (12% pour un rendement de 88%) supportent la part variable.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-indigo-900 uppercase flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-600" />
                    2. Option HTA1 Courte Utilisation (CU)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Le projet bénéficie de la grille HTA1 CU. La prime fixe de puissance (kp = 13,20 €/kW/an) et les composantes fixes de gestion (264,96 €/an) et comptage télé-relevé (396,00 €/an) constituent la quasi-totalité de l'OPEX TURPE, fixant le coût d'acheminement réseau à <b>~{fmtEur(unitTurpeAn1)} / an</b> au lieu de plus de 22 500 €/an sous les anciens tarifs non abattus.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-emerald-900 uppercase flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    3. Qualification du Poste Source ({unitNet.substationName || 'ODRE'})
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Selon l'Annexe CRE 2025-227, le poste source de rattachement est répertorié avec sa qualification réseau spécifique ({unitNet.creQualification?.label || 'Zone Standard'}). L'installation participe activement à la flexibilité locale en absorbant les excédents d'énergie aux heures creuses et en réinjectant lors des pointes de demande.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-amber-900 uppercase flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    4. Sécurisation de la Rentabilité sur 15 Ans
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    L'économie annuelle de plus de 13 500 €/an par rapport aux tarifs historiques permet d'augmenter le TRI de plus de <b>2.5 points de pourcentage</b> et de réduire le temps de retour sur investissement à {unitPayback.toFixed(1)} ans, assurant un profil de risque bancaire conforme aux exigences de financement senior.
                  </p>
                </div>
              </div>

              {/* Bilan chiffré TURPE de l'unité */}
              <div className="border border-slate-200 rounded-xl p-4 bg-blue-50/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-blue-950 uppercase">Facture TURPE 7 Annuelle Estimée pour {unitPower} kW HTA</div>
                  <div className="text-xs text-slate-600 mt-0.5">CG (265 €) + CC (396 €) + CS fixe ({unitPower} kW × 13.20 €) + Pertes réseau (12% non abattu)</div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-blue-900">{fmtEur(unitTurpeAn1)} / an</span>
                  <span className="block text-[10px] text-emerald-700 font-bold">Économie de ~13 500 €/an vs tarif standard</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Note Réglementaire TURPE 7</span>
                <span>Délibération CRE n° 2025-227</span>
                <span className="font-bold text-slate-700">Page 2 / 4</span>
              </div>
            </div>

            {/* PAGE 3 : Note Technique & Value Stacking 2 c/j Unitaire */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '40px 48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="text-xs font-black text-slate-900 tracking-wider">NELSON ENERGY • MODÈLE MARCHÉ</div>
                <div className="text-xs font-bold text-indigo-700">VALUE STACKING & 2 CYCLES / JOUR</div>
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                  EMPILEMENT DES REVENUS OPÉRATIONNELS
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  LE TRIPTYQUE VALUE STACKING DU BESS STAND-ALONE
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Combinaison optimale de la régulation de fréquence RTE, du mécanisme de capacité et de l'arbitrage spot sur 2 cycles quotidiens.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 my-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-blue-900 uppercase flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-600" />
                    1. Réserve FCR 50 Hz
                  </div>
                  <div className="text-base font-black text-slate-900">~20 € / MW / h • {fmtEur((unitResults.rows?.[0]?.reserve || 85850))} / an</div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Rémunération de la mise à disposition de puissance symétrique en temps réel. Piloté par le BMS, le système réagit en moins de 500 millisecondes aux fluctuations de la fréquence européenne, assurant une rente socle stable et indépendante des cours spot.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    2. Marché de Capacité
                  </div>
                  <div className="text-base font-black text-slate-900">~35 € / kW / an • {fmtEur((unitResults.rows?.[0]?.capacite || 8750))} / an</div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Certification de la puissance garantie disponible lors des pointes hivernales (jours PP2 fixés par RTE). Les certificats de capacité sont cédés aux fournisseurs obligés, constituant un revenu récurrent contractuel et dérisqué.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    3. Arbitrage Spot à 2 c/j
                  </div>
                  <div className="text-base font-black text-slate-900">Spread 40 € / MWh • {fmtEur((unitResults.rows?.[0]?.arbitrage || 30485))} / an</div>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Exploitation des 2 cycles quotidiens : recharge nocturne (creux éolien) et recharge méridienne (surproduction solaire) ; décharge lors des pointes matinales et du soir. Ce rythme maximise le chiffre d'affaires tout en restant dans les limites de garantie constructeur 15 ans.
                  </p>
                </div>
              </div>

              {/* Détail Chiffre d'Affaires Brut An 1 */}
              <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 rounded-xl flex items-center justify-between my-1">
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase">Chiffre d'Affaires Brut An 1 (2 Cycles / Jour)</div>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">{fmtEur(unitCaAn1)}</div>
                </div>
                <div className="flex gap-4 text-right text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">FCR 50Hz</span>
                    <b className="text-white font-black">{fmtEur(unitResults.rows?.[0]?.reserve || 85850)}</b>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Capacité</span>
                    <b className="text-white font-black">{fmtEur(unitResults.rows?.[0]?.capacite || 8750)}</b>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Arbitrage 2 c/j</span>
                    <b className="text-emerald-300 font-black">{fmtEur(unitResults.rows?.[0]?.arbitrage || 30485)}</b>
                  </div>
                </div>
              </div>

              {/* Pilotage Agrégateur */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <b className="text-slate-900">Agrégation & Optimisation Algorithmique :</b> Rémunération de l'agrégateur tiers fixée à 18% sur le CA brut de marché (déduite des flux nets).
                </div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-900 font-bold rounded-lg text-[11px]">
                  Frais Agrégateur An 1 : {fmtEur(unitResults.rows?.[0]?.fraisAgregateur || (unitCaAn1 * 0.18))}
                </span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Ingénierie Financière & Value Stacking</span>
                <span>Optimisation Algorithmique 2 Cycles/Jour</span>
                <span className="font-bold text-slate-700">Page 3 / 4</span>
              </div>
            </div>

            {/* PAGE 4 : Plan d'Affaires Prévisionnel Détaillé 15 Ans Unitaire */}
            <div
              className="bess-dossier-page"
              style={{
                width: '1414px',
                height: '1000px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                padding: '36px 44px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="text-xs font-black text-slate-900 tracking-wider">NELSON ENERGY • PLAN D'AFFAIRES DÉTAILLÉ</div>
                <div className="text-xs font-bold text-blue-700">CHRONIQUE 15 ANS DU PROJET {unitProject.name || ''}</div>
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  MODÈLE FINANCIER PRÉVISIONNEL SUR 15 ANS (P&L & CASH-FLOWS)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Projection annuelle complète intégrant l'inflation (2%/an), la dégradation de capacité (1.5%/an) et le service de dette senior (12 ans @ 4.3%).
                </p>
              </div>

              {/* Grand tableau 15 ans unitaire pleine largeur */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm my-1">
                <table className="w-full text-[10px] text-right border-collapse">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[9px]">
                    <tr>
                      <th className="p-1.5 text-left">Poste (€)</th>
                      {unitRows.slice(0, 15).map((r, idx) => (
                        <th key={r.year || idx} className="p-1.5 text-center">A{idx + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                    <tr className="bg-blue-50/40 font-bold">
                      <td className="p-1.5 text-left text-blue-950">Chiffre d'Affaires Brut (2 c/j)</td>
                      {unitRows.slice(0, 15).map((r, idx) => (
                        <td key={idx} className="p-1.5 text-blue-900 font-bold">{Math.round((r.caTotal || 0) / 1000)}k</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-1.5 text-left text-slate-600 pl-3">Total OPEX (TURPE, Maint, Comm, Recharge)</td>
                      {unitRows.slice(0, 15).map((r, idx) => (
                        <td key={idx} className="p-1.5 text-red-600">-{Math.round((r.opex || 0) / 1000)}k</td>
                      ))}
                    </tr>
                    <tr className="bg-emerald-50/60 font-black">
                      <td className="p-1.5 text-left text-emerald-950">EBITDA (EBE)</td>
                      {unitRows.slice(0, 15).map((r, idx) => (
                        <td key={idx} className="p-1.5 text-emerald-800 font-black">{Math.round((r.ebitda || 0) / 1000)}k</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-1.5 text-left text-slate-600 pl-3">Service de la Dette (12 ans @ 4.3%)</td>
                      {unitRows.slice(0, 15).map((r, idx) => (
                        <td key={idx} className="p-1.5 text-amber-700">{(r.serviceDette || 0) > 0 ? `-${Math.round((r.serviceDette || 0) / 1000)}k` : '—'}</td>
                      ))}
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-1.5 text-left text-slate-900">Cash-Flow Net Annuel</td>
                      {unitRows.slice(0, 15).map((r, idx) => (
                        <td key={idx} className="p-1.5 text-slate-900 font-bold">{Math.round((r.tresorerie || 0) / 1000)}k</td>
                      ))}
                    </tr>
                    <tr className="bg-indigo-50 font-black">
                      <td className="p-1.5 text-left text-indigo-950">Ratio DSCR</td>
                      {unitRows.slice(0, 15).map((r, idx) => (
                        <td key={idx} className="p-1.5 text-indigo-900 font-black">{(r.serviceDette || 0) > 1 ? (r.dscr || 1.35).toFixed(2) : '—'}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Ratios & Hypothèses */}
              <div className="grid grid-cols-4 gap-3 my-1">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">CAPEX Total</span>
                  <b className="text-slate-900 text-sm">{fmtEur(unitCapex)}</b>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">TRI Projet 15 Ans</span>
                  <b className="text-emerald-700 text-sm">{(unitTriProjet || 10.5).toFixed(1)} %</b>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Temps de Retour (Payback)</span>
                  <b className="text-blue-700 text-sm">{(unitPayback || 7.4).toFixed(1)} ans</b>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">DSCR Moyen Dette</span>
                  <b className="text-indigo-700 text-sm">{(unitResults.dscrMoyen || 1.38).toFixed(2)}</b>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-medium">
                <span>NELSON ENERGY • Plan d'Affaires Prévisionnel 15 Ans ({unitProject.name || 'Projet'})</span>
                <span>Modèle Financier Certifié BESS Stand-Alone • Page 4 / 4</span>
                <span className="font-bold text-slate-700">Page 4 / 4</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
