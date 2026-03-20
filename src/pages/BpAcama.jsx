// Re-trigger Vercel deployment 2
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import { apiService } from '@/services/api.js';
import { toast } from '@/components/ui/use-toast.js';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import {
  BarChart3, FileText, Calculator, TrendingUp, Users, Building,
  FileDown, Save, ChevronDown, Search, X, CheckCircle, AlertCircle,
  AlertTriangle, RefreshCw, Plus, Trash2
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'suivi', label: 'SUIVI', icon: Users },
  { id: 'suivi_bat', label: 'SUIVI BAT TYPE', icon: Building },
  { id: 'calcul', label: 'CALCUL', icon: Calculator },
  { id: 'bp_projets', label: 'BUSINESS PLAN PROJETS', icon: TrendingUp },
  { id: 'prop_bac', label: 'PROPOSITION CLIENT BAC', icon: FileText },
  { id: 'prop_be', label: 'PROPOSITION CLIENT BE', icon: FileText },
  { id: 'devis', label: 'DEVIS', icon: FileDown },
  { id: 'data', label: 'DATA', icon: BarChart3 },
];

const SUIVI_BAT_DATA = [
  { type:'TYPE 1 MINI', spv:'ACAMA SPV1', kwc:266.80, cout_bat:137939.59, massifs:16, longueur:42.7, largeur:24.44, travees:7, hSud:4, hNord:4, faitage:6.89, surfSud:643, surfNord:644, surfTot:1288, penteSud:11.19, penteNord:14.48, modH:10, modL:20, totalMod:300, puissMax:266.8, prodMoyen:1100 },
  { type:'TYPE 1 MID', spv:'ACAMA SPV1', kwc:303.60, cout_bat:157435.34, massifs:18, longueur:50.2, largeur:24.44, travees:7, hSud:4, hNord:4, faitage:6.89, surfSud:736, surfNord:736, surfTot:1471, penteSud:11.19, penteNord:14.48, modH:10, modL:23, totalMod:342, puissMax:303.6, prodMoyen:1100 },
  { type:'TYPE 1 MAXI', spv:'ACAMA SPV1', kwc:340.40, cout_bat:177710.51, massifs:20, longueur:57.5, largeur:24.44, travees:9, hSud:4, hNord:4, faitage:6.89, surfSud:824.85, surfNord:824.85, surfTot:1650, penteSud:11.19, penteNord:14.48, modH:10, modL:26, totalMod:384, puissMax:340.4, prodMoyen:1100 },
  { type:'TYPE 2 MINI', spv:'ACAMA SPV1', kwc:184.00, cout_bat:123583.08, massifs:21, longueur:31.4, largeur:24, travees:6, hSud:4.3, hNord:4.3, faitage:0, surfSud:0, surfNord:0, surfTot:874, penteSud:0, penteNord:0, modH:9, modL:30, totalMod:270, puissMax:184, prodMoyen:1254 },
  { type:'TYPE 2 MID', spv:'ACAMA SPV1', kwc:312.80, cout_bat:205845.56, massifs:33, longueur:52, largeur:24, travees:10, hSud:4.3, hNord:4.3, faitage:0, surfSud:1450.8, surfNord:0, surfTot:1451, penteSud:0, penteNord:0, modH:9, modL:50, totalMod:450, puissMax:312.8, prodMoyen:0 },
  { type:'TYPE 2 MAXI', spv:'ACAMA SPV1', kwc:349.60, cout_bat:226074.45, massifs:36, longueur:62, largeur:24, travees:11, hSud:4.3, hNord:4.3, faitage:0, surfSud:1595.88, surfNord:0, surfTot:1596, penteSud:0, penteNord:0, modH:9, modL:56, totalMod:504, puissMax:349.6, prodMoyen:0 },
  { type:'TYPE 3 MINI', spv:'ACAMA SPV1', kwc:240.12, cout_bat:108542.95, massifs:14, longueur:52.7, largeur:21.5, travees:9, hSud:2.5, hNord:2.5, faitage:4.7, surfSud:565.49, surfNord:565.49, surfTot:1131, penteSud:18.49, penteNord:18.49, modH:7.2, modL:18, totalMod:259, puissMax:240.1, prodMoyen:0 },
  { type:'TYPE 3 MID', spv:'ACAMA SPV1', kwc:314.64, cout_bat:146965.62, massifs:24, longueur:68, largeur:21.5, travees:9, hSud:2.5, hNord:2.5, faitage:4.7, surfSud:727.6, surfNord:727.6, surfTot:1455, penteSud:18.49, penteNord:18.49, modH:10, modL:24, totalMod:342, puissMax:314.6, prodMoyen:0 },
  { type:'TYPE 3 MAXI', spv:'ACAMA SPV1', kwc:414.00, cout_bat:182192.88, massifs:36, longueur:90.2, largeur:21.5, travees:12, hSud:2.5, hNord:2.5, faitage:4.7, surfSud:955.14, surfNord:955.14, surfTot:1910, penteSud:0, penteNord:0, modH:12.5, modL:32, totalMod:450, puissMax:414, prodMoyen:0 },
  { type:'TYPE 4 MINI', spv:'ACAMA SPV1', kwc:309.12, cout_bat:158178.74, massifs:24, longueur:37.5, largeur:37.72, travees:5, hSud:3.89, hNord:3.89, faitage:4.7, surfSud:707.25, surfNord:707.25, surfTot:1415, penteSud:0, penteNord:0, modH:9, modL:50, totalMod:150, puissMax:309.1, prodMoyen:0 },
  { type:'TYPE 4 MID', spv:'ACAMA SPV1', kwc:388.00, cout_bat:191445.01, massifs:28, longueur:45, largeur:37.72, travees:6, hSud:3.89, hNord:3.89, faitage:6.05, surfSud:848.7, surfNord:848.7, surfTot:1697, penteSud:0, penteNord:0, modH:12, modL:60, totalMod:720, puissMax:388, prodMoyen:0 },
  { type:'TYPE 4 MAXI', spv:'ACAMA SPV1', kwc:500.00, cout_bat:241242.54, massifs:36, longueur:63.2, largeur:37.72, travees:8, hSud:3.89, hNord:3.89, faitage:6.05, surfSud:1191.052, surfNord:1191.052, surfTot:2384, penteSud:0, penteNord:0, modH:15, modL:84, totalMod:1120, puissMax:500, prodMoyen:0 },
  { type:'TYPE 5 MINI', spv:'ACAMA SPV1', kwc:179.86, cout_bat:105611.99, massifs:18, longueur:31, largeur:27.95, travees:6, hSud:3.31, hNord:3.31, faitage:8.1, surfSud:733.77, surfNord:132.58, surfTot:866, penteSud:0, penteNord:0, modH:8, modL:24, totalMod:192, puissMax:179.9, prodMoyen:1357.39 },
  { type:'TYPE 5 MID', spv:'ACAMA SPV1', kwc:236.24, cout_bat:166814.50, massifs:27, longueur:50, largeur:27.95, travees:8, hSud:3.31, hNord:3.31, faitage:8.1, surfSud:1191.22, surfNord:221.58, surfTot:1414, penteSud:0, penteNord:0, modH:10, modL:40, totalMod:400, puissMax:236.24, prodMoyen:1357.39 },
  { type:'TYPE 5 MAXI', spv:'ACAMA SPV1', kwc:349.14, cout_bat:199644.67, massifs:33, longueur:60, largeur:27.95, travees:10, hSud:3.31, hNord:3.31, faitage:8.1, surfSud:1420.2, surfNord:256.8, surfTot:1677, penteSud:0, penteNord:0, modH:12, modL:50, totalMod:600, puissMax:349.1, prodMoyen:1357.39 },
  { type:'TYPE 6 MINI', spv:'ACAMA SPV1', kwc:161.92, cout_bat:91580.18, massifs:14, longueur:38.4, largeur:17.44, travees:6, hSud:3.8, hNord:3.8, faitage:5.7, surfSud:604.386, surfNord:165.48, surfTot:770, penteSud:0, penteNord:0, modH:9, modL:38, totalMod:342, puissMax:161.9, prodMoyen:0 },
  { type:'TYPE 6 MID', spv:'ACAMA SPV1', kwc:264.96, cout_bat:149821.56, massifs:22, longueur:64.5, largeur:17.44, travees:10, hSud:3.8, hNord:3.8, faitage:5.7, surfSud:989.43, surfNord:270.9, surfTot:1260, penteSud:0, penteNord:0, modH:13, modL:64, totalMod:832, puissMax:264.9, prodMoyen:0 },
  { type:'TYPE 6 MAXI', spv:'ACAMA SPV1', kwc:338.56, cout_bat:185198.57, massifs:28, longueur:83.2, largeur:17.44, travees:13, hSud:3.8, hNord:3.8, faitage:5.7, surfSud:1276.288, surfNord:349.44, surfTot:1626, penteSud:0, penteNord:0, modH:15, modL:83, totalMod:1245, puissMax:338.6, prodMoyen:0 },
  { type:'TYPE 7 MINI', spv:'ACAMA SPV1', kwc:156.40, cout_bat:91158.02, massifs:14, longueur:36, largeur:19.84, travees:6, hSud:3.39, hNord:3.39, faitage:7.23, surfSud:741.6, surfNord:0, surfTot:742, penteSud:12.7, penteNord:-14.95, modH:6, modL:34, totalMod:204, puissMax:156.4, prodMoyen:0 },
  { type:'TYPE 7 MID', spv:'ACAMA SPV1', kwc:253.00, cout_bat:152094.75, massifs:22, longueur:60, largeur:19.84, travees:10, hSud:3.39, hNord:3.39, faitage:7.23, surfSud:1236, surfNord:0, surfTot:1236, penteSud:0, penteNord:0, modH:10, modL:56, totalMod:560, puissMax:253, prodMoyen:0 },
  { type:'TYPE 7 MAXI', spv:'ACAMA SPV1', kwc:336.26, cout_bat:190249.08, massifs:28, longueur:80, largeur:19.84, travees:13, hSud:3.39, hNord:3.39, faitage:7.23, surfSud:1606.8, surfNord:0, surfTot:1607, penteSud:0, penteNord:0, modH:13, modL:74, totalMod:962, puissMax:336.3, prodMoyen:0 },
  { type:'TYPE 8 MINI', spv:'ACAMA SPV1', kwc:242.88, cout_bat:127331.73, massifs:18, longueur:43.2, largeur:27.32, travees:6, hSud:4, hNord:4, faitage:7, surfSud:786.24, surfNord:364.176, surfTot:1150, penteSud:0, penteNord:0, modH:9, modL:43, totalMod:387, puissMax:242.9, prodMoyen:0 },
  { type:'TYPE 8 MID', spv:'ACAMA SPV1', kwc:323.84, cout_bat:168025.86, massifs:27, longueur:57.6, largeur:27.32, travees:9, hSud:4, hNord:4, faitage:7, surfSud:1048, surfNord:486, surfTot:1534, penteSud:0, penteNord:0, modH:12, modL:57, totalMod:684, puissMax:323.8, prodMoyen:0 },
  { type:'TYPE 8 MAXI', spv:'ACAMA SPV1', kwc:485.76, cout_bat:238749.80, massifs:39, longueur:86.4, largeur:27.32, travees:12, hSud:4, hNord:4, faitage:7, surfSud:1576, surfNord:730, surfTot:2306, penteSud:0, penteNord:0, modH:18, modL:86, totalMod:1548, puissMax:485.8, prodMoyen:0 },
  { type:'TYPE 9 MINI', spv:'ACAMA SPV1', kwc:251.16, cout_bat:133488.49, massifs:21, longueur:37.5, largeur:31.5, travees:5, hSud:7.5, hNord:7.5, faitage:0, surfSud:836, surfNord:319, surfTot:1155, penteSud:0, penteNord:0, modH:10, modL:37, totalMod:370, puissMax:251.2, prodMoyen:0 },
  { type:'TYPE 9 MID', spv:'ACAMA SPV1', kwc:346.84, cout_bat:168081.00, massifs:24, longueur:52.5, largeur:31.5, travees:7, hSud:7.5, hNord:7.5, faitage:0, surfSud:1171, surfNord:446, surfTot:1617, penteSud:0, penteNord:0, modH:13, modL:52, totalMod:676, puissMax:346.8, prodMoyen:0 },
  { type:'TYPE 9 MAXI', spv:'ACAMA SPV1', kwc:500.00, cout_bat:230960.71, massifs:36, longueur:75, largeur:31.5, travees:10, hSud:7.5, hNord:7.5, faitage:0, surfSud:1673, surfNord:638, surfTot:2310, penteSud:0, penteNord:0, modH:18, modL:75, totalMod:1350, puissMax:500.0, prodMoyen:0 },
  { type:'EQUESTRE 60m', spv:'ACAMA SPV1', kwc:514.74, cout_bat:252314.71, massifs:30, longueur:65, largeur:29.5, travees:9, hSud:0, hNord:0, faitage:0, surfSud:1978, surfNord:1021, surfTot:2999, penteSud:0, penteNord:0, modH:15, modL:65, totalMod:975, puissMax:514.7, prodMoyen:0 },
  { type:'EQUESTRE 44m', spv:'ACAMA SPV1', kwc:356.50, cout_bat:197037.99, massifs:25, longueur:45, largeur:29.5, travees:6, hSud:0, hNord:0, faitage:0, surfSud:954, surfNord:707, surfTot:1661, penteSud:0, penteNord:0, modH:12, modL:45, totalMod:540, puissMax:356.5, prodMoyen:0 },
  { type:'SOL 1MW/c', spv:'ACAMA SPV1', kwc:1000.00, cout_bat:299140, massifs:0, longueur:0, largeur:0, travees:0, hSud:0, hNord:0, faitage:0, surfSud:4910, surfNord:0, surfTot:4910, penteSud:0, penteNord:0, modH:0, modL:0, totalMod:2175, puissMax:1000.0, prodMoyen:0 },
  { type:'OMB TYPE 1', spv:'ACAMA SPV1', kwc:9.20, cout_bat:5264, massifs:2, longueur:7.5, largeur:5.76, travees:1, hSud:0, hNord:0, faitage:6.1, surfSud:46, surfNord:0, surfTot:46, penteSud:0, penteNord:0, modH:2, modL:10, totalMod:20, puissMax:9.2, prodMoyen:0 },
  { type:'OMB TYPE 2', spv:'ACAMA SPV1', kwc:20.24, cout_bat:9996, massifs:2, longueur:7.5, largeur:12.65, travees:1, hSud:0, hNord:0, faitage:11, surfSud:98, surfNord:0, surfTot:98, penteSud:0, penteNord:0, modH:2, modL:22, totalMod:44, puissMax:20.2, prodMoyen:0 },
  { type:'OMB TYPE 3', spv:'ACAMA SPV1', kwc:18.40, cout_bat:10444, massifs:2, longueur:11.5, largeur:11.5, travees:1, hSud:0, hNord:0, faitage:6.1, surfSud:46, surfNord:0, surfTot:46, penteSud:0, penteNord:0, modH:2, modL:20, totalMod:40, puissMax:11.5, prodMoyen:0 },
  { type:'OMB TYPE PL', spv:'ACAMA SPV1', kwc:27.60, cout_bat:15207, massifs:6, longueur:7.5, largeur:17.8, travees:1, hSud:0, hNord:0, faitage:17.8, surfSud:127, surfNord:0, surfTot:127, penteSud:0, penteNord:0, modH:6, modL:10, totalMod:60, puissMax:27.6, prodMoyen:0 },
];

const BE_TABLES = {
  presence_bac: [
    { capacite:'100-150 KWc', p1000:{loyer:931,soulte:8342}, p1050:{loyer:1447,soulte:18645}, p1100:{loyer:1947,soulte:null}, p1150:{loyer:2447,soulte:25428}, p1200:{loyer:3010,soulte:30103}, p1250:{loyer:null,soulte:null}, p1300:{loyer:null,soulte:null} },
    { capacite:'150-200 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:18645}, p1100:{loyer:null,soulte:null}, p1150:{loyer:null,soulte:25428}, p1200:{loyer:3010,soulte:30103}, p1250:{loyer:3777,soulte:37770}, p1300:{loyer:null,soulte:null} },
    { capacite:'200-250 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:18888}, p1100:{loyer:2542,soulte:30504}, p1150:{loyer:3010,soulte:36126}, p1200:{loyer:4143,soulte:49716}, p1250:{loyer:4992,soulte:59904}, p1300:{loyer:null,soulte:null} },
    { capacite:'250-300 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:3448,soulte:41376}, p1150:{loyer:4082,soulte:48984}, p1200:{loyer:5378,soulte:64536}, p1250:{loyer:6186,soulte:74232}, p1300:{loyer:null,soulte:null} },
    { capacite:'300-350 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:3777,soulte:45324}, p1150:{loyer:4444,soulte:53328}, p1200:{loyer:6123,soulte:73476}, p1250:{loyer:7051,soulte:84612}, p1300:{loyer:7995,soulte:95940} },
    { capacite:'350-400 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:4143,soulte:49716}, p1150:{loyer:4992,soulte:59904}, p1200:{loyer:6768,soulte:81216}, p1250:{loyer:7914,soulte:94968}, p1300:{loyer:8853,soulte:106236} },
    { capacite:'400-450 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:4133,soulte:49596}, p1150:{loyer:5333,soulte:63996}, p1200:{loyer:7281,soulte:87372}, p1250:{loyer:8442,soulte:101304}, p1300:{loyer:9405,soulte:112860} },
    { capacite:'450-500 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:null,soulte:null}, p1150:{loyer:5831,soulte:69972}, p1200:{loyer:7995,soulte:95940}, p1250:{loyer:9225,soulte:110700}, p1300:{loyer:10074,soulte:120888} },
  ]
};

// Helper for PMT
function PMT(ir, np, pv) {
  if (ir === 0) return -(pv / np);
  const pvif = Math.pow(1 + ir, np);
  return -(ir * pv * pvif) / (pvif - 1);
}

// Helper for IRR
function IRR(values, guess = 0.1) {
  let min = -1.0;
  let max = 1.0;
  let guessVal = guess;
  for (let i = 0; i < 100; i++) {
    let npv = 0;
    for (let j = 0; j < values.length; j++) {
      npv += values[j] / Math.pow(1 + guessVal, j);
    }
    if (Math.abs(npv) < 0.0001) return guessVal;
    if (npv > 0) { min = guessVal; } else { max = guessVal; }
    guessVal = (min + max) / 2;
  }
  return guessVal;
}

function computeBusinessPlan(params) {
  const {
    kwc = 346.84,
    productible = 1123.08,
    tarifBas = 0.0846,
    tarifHaut = 0.04,
    seuilKwhKwc = 1100,
    maintenance = 1734.20,
    locationCompteur = 660,
    assurance = 867.10,
    taxesLocales = 0,
    gestionAdmin = 0,
    totalInvestissement = 435655.12, // TTC
    coutCentrale = 0,
    coutCharpente = 0,
    raccordement = 0,
    frais = 0,
    soulte = 0,
    dureeEmprunt = 20,
    tauxCredit = 4,
    indexationTarif = 0.006,
    indexationOpex = 0.02,
    degradation = 0.004,
  } = params;

  const totalConstruction = coutCentrale + coutCharpente + raccordement + frais;
  const apport10 = totalConstruction * 0.1;
  const emprunt = totalConstruction - apport10;
  const txMensuel = tauxCredit / 100 / 12;
  const annuite = emprunt > 0 ? -PMT(tauxCredit / 100, dureeEmprunt, -emprunt) : 0; 
  // Wait, PMT with annual rate for Annual payment.
  // Actually, VPM(K18; K17; K20) means VPM(taux, periods, pv).
  // So VPM(4%, 20, Emprunt) = -PMT(0.04, 20, Emprunt) -> returns negative. The formula E56 is `-VPM`.
  // Wait, E56 = -VPM($K$18; $K$17; $K$20). So it's positive payment.
  const serviceDette = emprunt > 0 ? -PMT(tauxCredit / 100, dureeEmprunt, emprunt) : 0;

  const prodTotale = kwc * productible;
  const prodHautInit = Math.max(0, prodTotale * ((productible - seuilKwhKwc) / productible));
  const prodBasInit = prodTotale - prodHautInit;

  const rows = [];
  let dscrs = [];

  let detteDebut = emprunt;
  let cfCumule = 0;
  let sumCA = 0;
  
  const opexBase = maintenance + locationCompteur + assurance + taxesLocales + gestionAdmin;

  // For IRR we need array of cash flows: Year 0 = -Apport (Wait, in Excel D61 = -K19)
  const cashFlowFP = [-apport10];
  const cashFlowProjet = [-totalConstruction]; // D62 = -Q12
  let sumCAFDS = 0;

  let fraisDSRFInit = 0;

  for (let i = 1; i <= 20; i++) {
    const deg = Math.pow(1 - degradation, i - 1);
    const idxT = Math.pow(1 + indexationTarif, i - 1);
    const idxOpex = Math.pow(1 + indexationOpex, i - 1);

    const pKw = kwc * deg;
    const ph = prodHautInit * deg;
    const pb = prodBasInit * deg;

    const tBas = tarifBas * idxT;
    const tHaut = tarifHaut * idxT;
    const ca = (pb * tBas) + (ph * tHaut);

    if (i === 1) {
      fraisDSRFInit = (ca / 1.35 * 0.5) * (tauxCredit / 100 * 0.35);
      sumCA += ca;
    } else { sumCA += ca; }

    const opex = opexBase * idxOpex;
    
    // We reconstruct the flat OPEX values matching existing display
    const maint = maintenance * idxOpex;
    const loc = locationCompteur * idxOpex;
    const ass = assurance * idxOpex;
    const taxes = taxesLocales * idxOpex;
    const admin = gestionAdmin * idxOpex;

    const ebitda = ca - opex;
    const amortissement = totalConstruction / 20;
    const ebit = ebitda - amortissement;

    const interets = (tauxCredit / 100) * detteDebut;
    const fraisDSRF = fraisDSRFInit; // Constant
    const resFin = interets + fraisDSRF;
    const resFiscal = ebit - resFin;

    // IS
    let is = 0;
    if (resFiscal > 0) {
      if (resFiscal < 42500) {
        is = resFiscal * 0.15;
      } else {
        is = (42500 * 0.15) + ((resFiscal - 42500) * 0.25);
      }
    }
    
    const resApresIS = resFiscal - is;
    const cafds = ebitda - is;
    sumCAFDS += cafds;

    const mra = (20 * kwc) / 10;
    
    const sd = i <= dureeEmprunt ? serviceDette : 0;
    const rembPrincipal = sd > 0 ? sd - interets : 0;
    const dscr = sd > 0 ? (cafds / sd) : 0;

    const tresorerie = ebitda - resFin - is - rembPrincipal;
    cfCumule += tresorerie;

    cashFlowFP.push(tresorerie);
    cashFlowProjet.push(cafds);
    if (sd > 0) dscrs.push(dscr);

    rows.push({
      year: 2025 + i,
      kwcDeg: pKw,
      prod: pb + ph,
      prodBas: pb,
      prodHaut: ph,
      tBas,
      tHaut,
      ca,
      maint,
      loc,
      ass,
      taxes,
      admin,
      opex, // Total indexed OPEX
      ebitda,
      amortissement,
      ebit,
      interets,
      fraisDSRF,
      resFin,
      resFiscal,
      is,
      resApresIS,
      detteDebut,
      cafds,
      mra,
      serviceDette: sd,
      rembPrincipal,
      dscr,
      tresorerie,
      cfCumule
    });
    
    detteDebut = Math.max(0, detteDebut - rembPrincipal);
  }

  const dscrMoyen = dscrs.length > 0 ? dscrs.reduce((a, b) => a + b, 0) / dscrs.length : 0;
  
  // Rentabilité
  const triProjet = IRR(cashFlowProjet, 0.05); // W8
  let triFP = IRR(cashFlowFP, 0.05); // W7
  if (triFP < -0.99 || triFP > 10) triFP = null; // Equivalent to #NOMBRE! if no convergence
  
  const tempsRetour = totalConstruction / (sumCAFDS / 20); // W9

  return { 
    rows, 
    dscrMoyen,
    annuite: serviceDette, 
    emprunt,
    triProjet,
    triFP,
    tempsRetour
  };
}

function computeResteACharge(params, targetDscr = 1.16) {
  // Binary search: find the apport needed so dscrMoyen >= targetDscr
  let lo = 0, hi = params.totalInvestissement * 0.9;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { dscrMoyen } = computeBusinessPlan({ ...params, apport: mid });
    if (dscrMoyen >= targetDscr) { hi = mid; } else { lo = mid; }
  }
  const minApport = params.totalInvestissement * 0.1;
  return Math.max(0, Math.ceil(hi) - minApport);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n, dec = 0) => (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtEur = (n) => `${fmt(n, 2)} €`;
const fmtPct = (n) => `${fmt(n * 100, 1)}%`;

// Lateral drag-scroll hook
const useDragScroll = () => {
  const ref = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e) => {
    if (!ref.current) return;
    setIsDragging(true);
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
  };
  const onMouseUp = () => setIsDragging(false);
  const onMouseLeave = () => setIsDragging(false);
  const onMouseMove = (e) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    ref.current.scrollLeft = scrollLeft - walk;
  };

  return { 
    ref, 
    onMouseDown, onMouseUp, onMouseLeave, onMouseMove,
    className: cn("overflow-auto border border-slate-200 rounded-lg select-none cursor-grab", isDragging && "cursor-grabbing") 
  };
};

function ProjectSelect({ projects, selectedProject, onSelect, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = (projects || []).filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) || 
    p.client_name?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10);

  return (
    <div className={cn("relative", className)}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-slate-200 rounded px-2 py-1.5 text-xs bg-white hover:bg-slate-50 transition-colors"
      >
        <span className="truncate">{selectedProject?.name || 'Sélectionner un projet CRM...'}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-40 max-h-60 overflow-y-auto">
            <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input 
                  autoFocus
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-100 rounded outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            {filtered.map(p => (
              <button
                key={p.id}
                className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                onClick={() => {
                  onSelect(p);
                  setIsOpen(false);
                }}
              >
                <div className="font-bold">{p.name}</div>
                <div className="text-[10px] text-slate-500">{p.client_name} • {p.city}</div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">Aucun projet trouvé</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', suffix, className, step, disabled }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="text-xs text-slate-600 w-48 shrink-0">{label}</label>
      <div className="flex items-center gap-1 flex-1 relative">
        <input
          type={type}
          disabled={disabled}
          className={cn(
            "border border-slate-200 rounded px-2 py-1 text-xs w-full outline-none transition-colors focus:ring-1 focus:ring-blue-500",
            disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "text-slate-900 bg-white"
          )}
          value={value ?? ''}
          onChange={e => onChange?.(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          step={step ?? (type === 'number' ? 'any' : undefined)}
        />
        {suffix && <span className="text-xs text-slate-500 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionCard({ title, children, className }) {
  return (
    <div className={cn('bg-white rounded-lg border border-slate-200 p-4 space-y-2', className)}>
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">{title}</h3>
      {children}
    </div>
  );
}

// ─── Shared Component: Tableau Previsionnel ───────────────────────────────

function TableauPrevisionnel({ params, rows }) {
  const SectionTitle = ({ title }) => (
    <td className="bg-amber-400 font-bold px-2 py-1 uppercase" colSpan={2}>{title}</td>
  );

  const DataRow = ({ label, propName, isPercent, isCurrency, format }) => (
    <tr className="border-b border-slate-200 bg-white hover:bg-slate-50">
      <td className="px-2 py-1 font-medium bg-slate-50 w-64">{label}</td>
      <td className="px-2 py-1 text-slate-400 w-8">-</td>
      {rows.map((r, i) => (
        <td key={i} className="px-2 py-1 text-right border-l border-slate-100 min-w-24 font-medium">
          {format ? format(r[propName]) : (isCurrency ? fmtEur(r[propName]) : (isPercent ? fmtPct(r[propName]) : fmt(r[propName], 2)))}
        </td>
      ))}
    </tr>
  );

  return (
    <SectionCard title="PLAN D'AFFAIRES PREVISIONNEL">
      <div className="overflow-auto border border-slate-200 mt-2 max-h-[70vh]">
        <table className="text-[10px] w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <td className="bg-slate-100" colSpan={2}></td>
              {rows.map((r, i) => (
                <td key={i} className="px-2 py-1 bg-slate-100 border-l border-slate-200 text-center font-bold">{r.year}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><SectionTitle title="CHIFFRE D'AFFAIRES" />{rows.map((_, i)=><td key={i} className="bg-amber-400"></td>)}</tr>
            <DataRow label="Puissance" propName="kwcDeg" format={v => fmt(v, 2)} />
            <DataRow label="Production avec dégradation" propName="prod" format={v => fmt(v, 0)} />
            <DataRow label="Production < 1100KWh/KWc" propName="prodBas" format={v => fmt(v, 0)} />
            <DataRow label="Production > 1100KWh/KWc" propName="prodHaut" format={v => fmt(v, 0)} />
            <DataRow label="Jusque 1 100KWh/KWc" propName="tBas" isCurrency />
            <DataRow label="Au-delà de 1 100KWh/KWc" propName="tHaut" isCurrency />
            <DataRow label="CA" propName="ca" isCurrency />

            <tr><SectionTitle title="CHARGE D'EXPLOITATION" />{rows.map((_, i)=><td key={i} className="bg-amber-400"></td>)}</tr>
            <DataRow label="Maintenance" propName="maint" isCurrency />
            <DataRow label="Location du compteur" propName="loc" isCurrency />
            <DataRow label="Assurance" propName="ass" isCurrency />
            <DataRow label="Annuité du crédit bancaire" propName="serviceDette" isCurrency />
            <DataRow label="Taxes locales (y compris TURPE)" propName="taxes" isCurrency />
            <DataRow label="Gestion administrative" propName="admin" isCurrency />
            <DataRow label="Remplacement des onduleurs" propName="mra" isCurrency />
            <tr className="border-b border-slate-200 bg-white">
              <td className="px-2 py-1 font-bold bg-slate-50">Total des charges</td>
              <td className="px-2 py-1 text-slate-400">-</td>
              {rows.map((r, i) => (
                <td key={i} className="px-2 py-1 text-right border-l border-slate-100 font-bold">{fmtEur(r.opex + r.serviceDette + r.mra)}</td>
              ))}
            </tr>
            <DataRow label="OPEX" propName="opex" isCurrency />

            <tr><SectionTitle title="RESULTATS" />{rows.map((_, i)=><td key={i} className="bg-amber-400"></td>)}</tr>
            <DataRow label="EBITDA" propName="ebitda" isCurrency />
            <DataRow label="Amortissement" propName="amortissement" isCurrency />
            <DataRow label="EBIT" propName="ebit" isCurrency />
            <DataRow label="Intérêts dette LT" propName="interets" isCurrency />
            <DataRow label="Frais DSRF" propName="fraisDSRF" isCurrency />
            <DataRow label="Résultat financier" propName="resFin" isCurrency />
            <DataRow label="Résultat fiscal" propName="resFiscal" isCurrency />
            <DataRow label="Résultat IS" propName="is" isCurrency />
            <DataRow label="Résultat après IS" propName="resApresIS" isCurrency />

            <tr><td className="bg-white" colSpan={2+rows.length} style={{height: 10}}></td></tr>
            <DataRow label="Dette début période" propName="detteDebut" isCurrency />
            <DataRow label="CAFDS" propName="cafds" isCurrency />
            <DataRow label="MRA onduleurs" propName="mra" isCurrency />
            <DataRow label="Service de la Dette" propName="serviceDette" isCurrency />
            <DataRow label="Remb principal" propName="rembPrincipal" isCurrency />
            <DataRow label="DSCR" propName="dscr" isPercent />
            <tr className="border-b border-slate-200 bg-amber-400">
              <td className="px-2 py-1 font-bold uppercase">Trésorerie nette annuelle avant imposition</td>
              <td className="px-2 py-1 text-slate-700">-</td>
              {rows.map((r, i) => (
                <td key={i} className="px-2 py-1 text-right border-l border-slate-200 font-bold">{fmtEur(r.tresorerie)}</td>
              ))}
            </tr>
            <tr className="border-b border-slate-200 bg-slate-200">
              <td className="px-2 py-1 font-bold uppercase">Cash Flow Cumulé</td>
              <td className="px-2 py-1">-</td>
              {rows.map((r, i) => (
                <td key={i} className="px-2 py-1 text-right border-l border-slate-300 font-bold text-green-700 bg-green-50/50">{fmtEur(r.cfCumule)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ─── Tab: BUSINESS PLAN PROJETS ──────────────────────────────────────────────

function TabBpProjets({ projects, selectedProject, setSelectedProject, params, setParams, computeBusinessPlan, computeResteACharge }) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const set = useCallback((k, v) => setParams(p => ({ ...p, [k]: v })), [setParams]);

  const saveBp = async () => {
    if (!selectedProject) return;
    try {
      await apiService.updateProject(selectedProject.id, { bpAcamaState: params });
      toast({ title: 'BP Sauvegardé', description: `L'état du business plan pour ${selectedProject.name} a été enregistré.` });
    } catch (e) {
      toast({ title: 'Erreur sauvegarde', variant: 'destructive', description: e.message });
    }
  };

  // Remove auto-calculation of kwc as requested by user
  /*
  useEffect(() => {
    if (params.nbModules && params.puissanceUnitaire) {
      const calculatedKwc = (params.nbModules * params.puissanceUnitaire) / 1000;
      if (Math.abs(calculatedKwc - params.kwc) > 0.01) {
        setParams(p => ({ ...p, kwc: calculatedKwc }));
      }
    }
  }, [params.nbModules, params.puissanceUnitaire, setParams]);
  */

  const totalConstruction = params.coutCentrale + params.coutCharpente + params.raccordement + params.frais + params.soulte;
  const tva = totalConstruction * 0.20;
  const totalInvestissement = totalConstruction + tva;
  const apport10 = totalInvestissement * 0.1;
  const apportSoulte = apport10 + params.soulte;

  const bpParams = { ...params, totalInvestissement, apport: apport10 };
  const { rows, dscrMoyen, annuite, emprunt, triProjet, triFP, tempsRetour } = useMemo(() => computeBusinessPlan(bpParams), [JSON.stringify(bpParams)]);

  const resteACharge = useMemo(() => computeResteACharge({ ...params, totalInvestissement }, 1.16), [JSON.stringify({ ...params, totalInvestissement })]);

  const dscrColor = dscrMoyen >= 1.16 ? 'text-green-600 bg-green-50' : dscrMoyen >= 1.10 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50';
  const DscrIcon = dscrMoyen >= 1.16 ? CheckCircle : dscrMoyen >= 1.10 ? AlertTriangle : AlertCircle;

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const applyProject = (p) => {
    setSelectedProject(p);
    setShowSearch(false);
  };

  const applyToProject = async () => {
    if (!selectedProject) return;
    try {
      await apiService.updateProject(selectedProject.id, { resteACharge });
      toast({ title: 'Reste à charge appliqué', description: `${fmtEur(resteACharge)} mis à jour dans le projet ${selectedProject.name}` });
    } catch (e) {
      toast({ title: 'Erreur', variant: 'destructive', description: e.message });
    }
  };

  const prodTotale = params.kwc * params.productible;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Project selector & Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
        <span className="text-xs font-semibold text-blue-700">Projet CRM :</span>
        <div className="relative flex-1">
          <button onClick={() => setShowSearch(!showSearch)} className="flex items-center gap-2 bg-white border border-blue-300 rounded px-3 py-1.5 text-xs w-full text-left hover:bg-blue-50">
            {selectedProject ? selectedProject.name : 'Sélectionner un projet...'}
            <ChevronDown className="w-3 h-3 ml-auto" />
          </button>
          {showSearch && (
            <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-80">
              <div className="p-2 border-b border-slate-100">
                <div className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1">
                  <Search className="w-3 h-3 text-slate-400" />
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="bg-transparent text-xs outline-none flex-1" />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredProjects.map(p => (
                  <button key={p.id} onClick={() => applyProject(p)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-50">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-slate-500">{p.city} • {p.puissance} kWc</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {selectedProject && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveBp} className="bg-green-600 hover:bg-green-700 text-white text-xs h-8">
              <Save className="w-3 h-3 mr-1" /> Sauvegarder BP
            </Button>
            <button onClick={() => { setSelectedProject(null); setSearch(''); }} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* LEFT: Inputs */}
        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title="Données du projet">
              <Field label="Nombre de modules" value={params.nbModules} onChange={v => set('nbModules', v)} type="number" suffix="modules" />
              <Field label="Puissance unitaire" value={params.puissanceUnitaire} onChange={v => set('puissanceUnitaire', v)} type="number" suffix="Wc" />
              <Field label="Puissance installée" value={params.kwc} onChange={v => set('kwc', v)} type="number" suffix="kWc" />
              <Field label="Surface totale installée" value={params.surfaceTotale} onChange={v => set('surfaceTotale', v)} type="number" suffix="m²" />
              <div className="h-2" />
              <Field label="Productible (KWh/KWc)" value={params.productible} onChange={v => set('productible', v)} type="number" />
              <div className="text-xs text-slate-500 pt-1">Production totale : <b>{fmt(prodTotale)} KWh/an</b></div>
            </SectionCard>
            <SectionCard title="Tarifs d'achat">
              <Field label="Tarif ≤ 1 100 KWh/KWc" value={params.tarifBas} onChange={v => set('tarifBas', v)} type="number" step={0.0001} suffix="€/kWh" />
              <Field label="Tarif > 1 100 KWh/KWc" value={params.tarifHaut} onChange={v => set('tarifHaut', v)} type="number" step={0.0001} suffix="€/kWh" />
              <Field label="Seuil (KWh/KWc)" value={params.seuilKwhKwc} onChange={v => set('seuilKwhKwc', v)} type="number" />
            </SectionCard>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title="Investissement">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-slate-600 w-48 shrink-0">Type de bâtiment</label>
                <select 
                  className="border border-slate-200 rounded px-2 py-1 text-xs w-full focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                  value={params.typeBat || ''}
                  onChange={e => {
                    const bat = SUIVI_BAT_DATA.find(b => b.type === e.target.value);
                    if (bat) {
                      setParams(p => ({
                        ...p,
                        typeBat: bat.type,
                        coutCharpente: bat.cout_bat,
                        kwc: bat.kwc,
                        surfaceTotale: bat.surfTot,
                        spv: bat.spv,
                        productible: bat.prodMoyen || p.productible
                      }));
                    }
                  }}
                >
                  <option value="">Sélectionner un bâtiment...</option>
                  {SUIVI_BAT_DATA.map(b => <option key={b.type} value={b.type}>{b.type}</option>)}
                </select>
              </div>
              <Field label="Centrale solaire" value={params.coutCentrale} onChange={v => set('coutCentrale', v)} type="number" suffix="€" />
              <Field label="Charpente / Bâtiment" value={params.coutCharpente} onChange={v => set('coutCharpente', v)} type="number" suffix="€" />
              <Field label="Raccordement" value={params.raccordement} onChange={v => set('raccordement', v)} type="number" suffix="€" />
              <Field label="Frais" value={params.frais} onChange={v => set('frais', v)} type="number" suffix="€" />
              <Field label="Soulte" value={params.soulte} onChange={v => set('soulte', v)} type="number" suffix="€" />
              <div className="border-t border-slate-100 pt-1 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Total construction :</span><b>{fmtEur(totalConstruction)}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">TVA 20% :</span><b>{fmtEur(tva)}</b></div>
                <div className="flex justify-between text-blue-700"><span className="font-semibold">Total investissement :</span><b>{fmtEur(totalInvestissement)}</b></div>
              </div>
            </SectionCard>
            <SectionCard title="OPEX annuels">
              <Field label="Maintenance" value={params.maintenance} onChange={v => set('maintenance', v)} type="number" suffix="€/an" />
              <Field label="Location compteur" value={params.locationCompteur} onChange={v => set('locationCompteur', v)} type="number" suffix="€/an" />
              <Field label="Assurance" value={params.assurance} onChange={v => set('assurance', v)} type="number" suffix="€/an" />
              <Field label="Taxes locales" value={params.taxesLocales} onChange={v => set('taxesLocales', v)} type="number" suffix="€/an" />
              <Field label="Gestion administrative" value={params.gestionAdmin} onChange={v => set('gestionAdmin', v)} type="number" suffix="€/an" />
            </SectionCard>
          </div>
          <SectionCard title="Banque">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Durée de l'emprunt" value={params.dureeEmprunt} onChange={v => set('dureeEmprunt', v)} type="number" suffix="ans" />
              <Field label="Taux de crédit" value={params.tauxCredit} onChange={v => set('tauxCredit', v)} type="number" step={0.1} suffix="%" />
              <Field label="Indexation tarif" value={params.indexationTarif * 100} onChange={v => set('indexationTarif', v / 100)} type="number" step={0.1} suffix="%" />
              <Field label="Indexation OPEX" value={params.indexationOpex * 100} onChange={v => set('indexationOpex', v / 100)} type="number" step={0.1} suffix="%" />
              <Field label="Dégradation modules" value={params.degradation * 100} onChange={v => set('degradation', v / 100)} type="number" step={0.1} suffix="%" />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Apport (10%) :</span><b>{fmtEur(apport10)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Emprunt :</span><b>{fmtEur(emprunt)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Annuité :</span><b>{fmtEur(annuite)}</b></div>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4">
          {/* DSCR box */}
          <div className={cn('rounded-xl border-2 p-4 text-center', dscrMoyen >= 1.16 ? 'border-green-300 bg-green-50' : dscrMoyen >= 1.10 ? 'border-orange-300 bg-orange-50' : 'border-red-300 bg-red-50')}>
            <DscrIcon className={cn('w-8 h-8 mx-auto mb-1', dscrColor.split(' ')[0])} />
            <div className="text-2xl font-black text-slate-900">{fmtPct(dscrMoyen)}</div>
            <div className={cn('text-xs font-semibold mt-1 px-2 py-0.5 rounded-full inline-block', dscrColor)}>DSCR MOYEN 20 ANS</div>
            <div className="text-[10px] text-slate-500 mt-1">Seuil bancaire : 116%</div>
          </div>

          {/* Reste à charge */}
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Reste à charge calculé</div>
            <div className="text-2xl font-black text-white mt-1">{fmtEur(resteACharge)}</div>
            <div className="text-[10px] text-slate-400 mt-1">Pour atteindre DSCR ≥ 116%</div>
            {selectedProject && (
              <Button onClick={applyToProject} size="sm" className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs">
                <Save className="w-3 h-3 mr-1" /> Appliquer au projet
              </Button>
            )}
          </div>

          <SectionCard title="Indicateurs">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Apport avec soulte :</span><b>{fmtEur(apportSoulte)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Emprunt net :</span><b>{fmtEur(emprunt)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">CA an 1 :</span><b>{fmtEur(rows[0]?.ca)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Total charges an 1 :</span><b>{fmtEur(rows[0]?.opex + rows[0]?.serviceDette)}</b></div>
            </div>
          </SectionCard>

          <SectionCard title="Rentabilité">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">TRI FP 20 ans :</span><b className={triFP >= 0.05 ? "text-green-600" : "text-slate-800"}>{triFP ? fmtPct(triFP) : 'N/A'}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">TRI Projet 20 ans :</span><b className={triProjet >= 0.05 ? "text-green-600" : "text-slate-800"}>{fmtPct(triProjet)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Temps de Retour :</span><b>{fmt(tempsRetour, 2)} ans</b></div>
              <div className="flex justify-between border-t border-slate-100 pt-1 mt-1 font-semibold text-blue-800">
                <span>Prix au Wc global hors raccordement :</span>
                <span>{params.kwc > 0 ? fmt((params.coutCentrale + params.coutCharpente) / (params.kwc * 1000), 2) : '0,00'} €/Wc</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>



      <div className="mt-4">
        <TableauPrevisionnel params={bpParams} rows={rows} />
      </div>

      {/* Render Charts */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <SectionCard title="Évolution Trésorerie & Cash Flow">
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" tick={{fontSize: 10, fill: '#64748B'}} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#64748B'}} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#64748B'}} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <RechartsTooltip formatter={(val) => fmtEur(val)} labelStyle={{color:'#0f172a', fontWeight:'bold'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend wrapperStyle={{fontSize: '10px'}} />
                <Bar yAxisId="left" dataKey="tresorerie" name="Trésorerie Annuelle" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cfCumule" name="Cash Flow Cumulé" stroke="#10B981" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Performance Économique">
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" tick={{fontSize: 10, fill: '#64748B'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10, fill: '#64748B'}} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <RechartsTooltip formatter={(val) => fmtEur(val)} labelStyle={{color:'#0f172a', fontWeight:'bold'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend wrapperStyle={{fontSize: '10px'}} />
                <Bar dataKey="ca" name="Chiffre d'Affaires" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ebitda" name="EBITDA" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opex" name="OPEX" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Tab: SUIVI ───────────────────────────────────────────────────────────────

function TabSuivi({ projects, projectEdits, updateProjectEdit }) {
  const defaultCols = [
    { key: 'nom', label: 'Nom projet', width: 140 }, { key: 'dev', label: 'Dev.' }, 
    { key: 'spv', label: 'SPV' }, { key: 'kwc', label: 'KWc' }, { key: 'adresse', label: 'Adresse' },
    { key: 'commune', label: 'Commune' }, { key: 'cp', label: 'CP' }, { key: 'gps', label: 'GPS' },
    { key: 'tel', label: 'Tél.' }, { key: 'zone_sism', label: 'Z. Sism.' }, { key: 'zone_vent', label: 'Z. Vent' },
    { key: 'zone_neige', label: 'Z. Neige' }, { key: 'altitude', label: 'Alt. (m)' }, { key: 'type_trav', label: 'Type trav.' },
    { key: 'type_bat', label: 'Type bat.' }, { key: 'nb_hang', label: 'Nb hang.' }, { key: 'categorie', label: 'Catégorie' },
    { key: 'productible', label: 'Productible (KWh/KWc)' }, { key: 'production', label: 'Prod. an. (KWh)' },
    { key: 'dist_hta', label: 'Dist. HTA (m)' }, { key: 'dist_priv', label: 'Dist. privée (m)' },
  ];

  const getRowValue = (row, k) => {
    if (projectEdits[row.id] && projectEdits[row.id][k] !== undefined) return projectEdits[row.id][k];
    return row[k];
  };

  const dbRowsLocal = useMemo(() => {
    return projects 
      .filter(p => p.bpAcamaState)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .map((p) => ({
        id: p.id,
        nom: p.name,
        dev: 'ACAMA',
        spv: p.bpAcamaState?.spv || 'CH-TTPAGE',
        kwc: p.bpAcamaState?.kwc || p.puissance || '',
        adresse: p.address || '',
        commune: p.city || '',
        cp: '',
        gps: (p.lat && p.lng) ? `${fmt(p.lat,4)} / ${fmt(p.lng,4)}` : '',
        tel: p.phone || '',
        zone_sism: p.urbanData?.seismes || '',
        zone_vent: p.urbanData?.vents || '',
        zone_neige: p.urbanData?.neige || '',
        altitude: p.urbanData?.alti || '',
        type_trav: 'BAC',
        type_bat: p.type_bat || '',
        nb_hang: p.bpAcamaState?.nbHang || 1,
        categorie: p.category || 'Agricole',
        productible: p.bpAcamaState?.productible || p.productible || '',
        production: (p.bpAcamaState?.kwc || p.puissance || 0) * (p.bpAcamaState?.productible || p.productible || 0),
        dist_hta: p.dist_hta || '',
        dist_priv: ''
      }));
  }, [projects]);

  const [localRows, setLocalRows] = useState([]);
  const addRow = () => setLocalRows(r => [{ id: `local-${Date.now()}`, dev: 'ACAMA', nom: '', spv: 'CH-TTPAGE', kwc: 0, adresse: '', commune: '', cp: '', gps: '', tel: '', zone_sism: '', zone_vent: '', zone_neige: '', altitude: '', type_trav: 'BAC', type_bat: '', nb_hang: 1, categorie: 'Agricole', productible: '', production: '', dist_hta: '', dist_priv: '' }, ...r]);

  const updateAnyRow = (id, k, v) => {
    if (typeof id === 'string' && id.startsWith('local-')) {
      setLocalRows(r => r.map(row => row.id === id ? { ...row, [k]: v } : row));
    } else {
      updateProjectEdit(id, k, v);
    }
  };

  const delAnyRow = (id) => {
    if (confirm('Supprimer cette ligne ?')) {
      if (typeof id === 'string' && id.startsWith('local-')) {
        setLocalRows(r => r.filter(row => row.id !== id));
      } else {
        // We can't delete DB rows from the UI usually, but we can hide them or just ignore
      }
    }
  };

  const allRows = [...dbRowsLocal, ...localRows];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" onClick={addRow} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Nouvelle ligne
        </Button>
        <span className="text-xs text-slate-500">{allRows.length} projets</span>
      </div>
      <div {...useDragScroll()}>
        <table className="text-[12px] border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-white">
              {defaultCols.map(c => <th key={c.key} style={{ width: c.width || 80 }} className="border border-slate-600 px-2 py-1.5 font-semibold whitespace-nowrap">{c.label}</th>)}
              <th className="border border-slate-600 px-2 py-1.5 w-8">✕</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {defaultCols.map(c => (
                  <td key={c.key} className="border border-slate-200 p-0">
                    <input
                      className="w-full px-2 py-1 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-400"
                      value={getRowValue(row, c.key) ?? ''}
                      onChange={e => updateAnyRow(row.id, c.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="border border-slate-200 text-center">
                  <button onClick={() => delAnyRow(row.id)} className="text-red-400 hover:text-red-600 p-0.5"><X className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: SUIVI BAT TYPE ─────────────────────────────────────────────────────

function TabSuiviBatType({ batEdits, updateBatEdit }) {
  const [localRows, setLocalRows] = useState([]);
  const keys = ['type','spv','kwc','cout_bat','massifs','longueur','largeur','travees','hSud','hNord','faitage','surfSud','surfNord','surfTot','penteSud','penteNord','modH','modL','totalMod','puissMax','prodMoyen'];
  const cols = [
    'Type','SPV','KWc','Coût bat. (€)','Massifs','Long. (m)','Larg. (m)','Travées',
    'H. Sud (m)','H. Nord (m)','Faitage (m)','Surf Sud (m²)','Surf Nord (m²)','Surf Tot (m²)',
    'Pente Sud (°)','Pente Nord (°)','Mod H','Mod L','Total Mod','Puiss Max (KWc)','Prod Moyen'
  ];

  const baseRows = useMemo(() => SUIVI_BAT_DATA.map((r, i) => ({ ...r, id: `base-${i}` })), []);
  const allRows = [...baseRows, ...localRows];

  const getVal = (row, k) => {
    if (batEdits[row.id] && batEdits[row.id][k] !== undefined) return batEdits[row.id][k];
    if (row.id.startsWith('local-')) return row[k] ?? '';
    return row[k];
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" onClick={() => setLocalRows(r => [...r, { id: `local-${Date.now()}`, type:'', spv:'', kwc:0, cout_bat:0, massifs:0, longueur:0, largeur:0, travees:0, hSud:0, hNord:0, faitage:0, surfSud:0, surfNord:0, surfTot:0, penteSud:0, penteNord:0, modH:0, modL:0, totalMod:0, puissMax:0, prodMoyen:0 }])} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Nouvelle ligne
        </Button>
      </div>
      <div {...useDragScroll()} className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white">
        <table className="text-[12px] border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-white">
              {cols.map(c => <th key={c} className="border border-slate-600 px-2 py-1.5 font-semibold text-center whitespace-nowrap">{c}</th>)}
              <th className="border border-slate-600 px-2 py-1.5 w-8">✕</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr key={i} className={cn(i % 2 === 0 ? 'bg-white' : 'bg-slate-50', "hover:bg-blue-50/30")}>
                {keys.map(k => (
                  <td key={k} className="border border-slate-200 p-0 relative">
                    <input 
                      className="w-full px-2 py-1 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 text-center transition-all"
                      value={getVal(row, k)}
                      onChange={e => {
                        const val = e.target.value;
                        if (row.id.startsWith('local-')) {
                          setLocalRows(prev => prev.map(r => r.id === row.id ? { ...r, [k]: val } : r));
                        } else {
                          updateBatEdit(row.id, k, val);
                        }
                      }}
                    />
                  </td>
                ))}
                <td className="border border-slate-200 text-center">
                   {i >= SUIVI_BAT_DATA.length && (
                     <button onClick={() => setLocalRows(prev => prev.filter(r => r.id !== row.id))} className="text-red-400 hover:text-red-600 p-0.5">
                       <X className="w-3 h-3" />
                     </button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: BE Tables ──────────────────────────────────────────────────────────


function TabData() {
  const [rows, setRows] = useState([
    { id:1, type:'TYPE 1 MINI', spv:'ACAMA SPV1', cap:270, massifs:22, long:53.72, larg:23.47, travees:7, lTravee:7.5, hSud:4, hNord:4, hFait:6.9, lRemS:11.97, lRemN:11.97, sSud:643.0, sNord:643.0, sTot:1286.1, axeS:11.82, axeN:11.82, pS:14.01, pN:14.01, bPO_d:115.54, bPO_e:8088, bPE_d:115.54, bPE_e:8088, bLN_d:231.69, bLN_e:12743, bLS_d:231.69, bLS_e:12743, chS:6017, chN:6017, faitage:1612, anticond:2572 },
    { id:2, type:'TYPE 1 MID', spv:'ACAMA SPV1', cap:306, massifs:24, long:60.67, larg:23.47, travees:8, lTravee:7.5, hSud:4, hNord:4, hFait:6.9, lRemS:11.97, lRemN:11.97, sSud:725.6, sNord:725.6, sTot:1451.2, axeS:11.82, axeN:11.82, pS:14.01, pN:14.01, bPO_d:115.54, bPO_e:8088, bPE_d:115.54, bPE_e:8088, bLN_d:264.75, bLN_e:14561, bLS_d:264.75, bLS_e:14561, chS:6789, chN:6789, faitage:1819, anticond:2902 },
    { id:3, type:'TYPE 1 MAXI', spv:'ACAMA SPV1', cap:342, massifs:26, long:68.05, larg:23.47, travees:9, lTravee:7.5, hSud:4, hNord:4, hFait:6.9, lRemS:11.97, lRemN:11.97, sSud:814.6, sNord:814.6, sTot:1629.1, axeS:11.82, axeN:11.82, pS:14.01, pN:14.01, bPO_d:115.54, bPO_e:8088, bPE_d:115.54, bPE_e:8088, bLN_d:297.84, bLN_e:16381, bLS_d:231.69, bLS_e:16381, chS:7622, chN:7622, faitage:2042, anticond:3258 },
    { id:4, type:'TYPE 2 MINI', spv:'ACAMA SPV1', cap:189, massifs:21, long:37.55, larg:24.26, travees:6, lTravee:6.2, hSud:4.35, hNord:9.67, hFait:0, lRemS:23.26, lRemN:0, sSud:873.6, sNord:0, sTot:873.6, axeS:22.44, axeN:0, pS:11, pN:0, bPO_d:157.15, bPO_e:11001, bPE_d:157.15, bPE_e:11001, bLN_d:375.75, bLN_e:20666, bLS_d:231.69, bLS_e:12743, chS:4428, chN:4428, faitage:1127, anticond:1747 },
    { id:5, type:'TYPE 2 MID', spv:'ACAMA SPV1', cap:315, massifs:30, long:62.36, larg:24.26, travees:10, lTravee:6.2, hSud:4.35, hNord:9.67, hFait:0, lRemS:23.26, lRemN:0, sSud:1450.5, sNord:0, sTot:1450.5, axeS:22.44, axeN:0, pS:11, pN:0, bPO_d:157.15, bPO_e:11001, bPE_d:157.15, bPE_e:11001, bLN_d:623.79, bLN_e:34308, bLS_d:231.69, bLS_e:12743, chS:7312, chN:7312, faitage:1871, anticond:2901 },
    { id:6, type:'TYPE 2 MAXI', spv:'ACAMA SPV1', cap:342, massifs:33, long:68.55, larg:24.26, travees:11, lTravee:6.2, hSud:4.35, hNord:9.67, hFait:0, lRemS:23.26, lRemN:0, sSud:1590.1, sNord:0, sTot:1590.1, axeS:22.44, axeN:0, pS:11, pN:0, bPO_d:157.15, bPO_e:11001, bPE_d:157.15, bPE_e:11001, bLN_d:686.03, bLN_e:37732, bLS_d:231.69, bLS_e:12743, chS:8043, chN:8043, faitage:2051, anticond:3180 },
    { id:7, type:'TYPE 3 MINI', spv:'ACAMA SPV1', cap:234.9, massifs:20, long:52.64, larg:21.13, travees:7, lTravee:7.5, hSud:2.56, hNord:2.56, hFait:4.7, lRemS:10.7, lRemN:10.7, sSud:563.2, sNord:563.2, sTot:1126.5, axeS:10.29, axeN:10.29, pS:11.75, pN:11.75, bPO_d:73.2, bPO_e:5124, bPE_d:73.2, bPE_e:5124, bLN_d:150.22, bLN_e:8262, bLS_d:231.69, bLS_e:12743, chS:5274, chN:5274, faitage:1579, anticond:2253 },
    { id:8, type:'TYPE 3 MID', spv:'ACAMA SPV1', cap:307.8, massifs:24, long:68, larg:21.13, travees:9, lTravee:7.5, hSud:2.56, hNord:2.56, hFait:4.7, lRemS:10.7, lRemN:10.7, sSud:727.6, sNord:727.6, sTot:1455.2, axeS:10.29, axeN:10.29, pS:11.75, pN:11.75, bPO_d:73.2, bPO_e:5124, bPE_d:73.2, bPE_e:5124, bLN_d:190.2, bLN_e:10461, bLS_d:231.69, bLS_e:12743, chS:6809, chN:6809, faitage:2040, anticond:2910 },
    { id:9, type:'TYPE 3 MAXI', spv:'ACAMA SPV1', cap:405, massifs:30, long:90.14, larg:21.13, travees:12, lTravee:7.5, hSud:2.56, hNord:2.56, hFait:4.7, lRemS:10.7, lRemN:10.7, sSud:964.5, sNord:964.5, sTot:1929.0, axeS:10.29, axeN:10.29, pS:11.75, pN:11.75, bPO_d:73.2, bPO_e:5124, bPE_d:73.2, bPE_e:5124, bLN_d:257.25, bLN_e:14149, bLS_d:231.69, bLS_e:12743, chS:10096, chN:10096, faitage:2704, anticond:3858 },
    { id:10, type:'TYPE 4 MINI', spv:'ACAMA SPV1', cap:302.4, massifs:24, long:37.65, larg:37.49, travees:5, lTravee:7.5, hSud:4.18, hNord:4.18, hFait:6.05, lRemS:18.79, lRemN:18.79, sSud:707.4, sNord:707.4, sTot:1414.9, axeS:18.5, axeN:18.5, pS:5.77, pN:5.77, bPO_d:204.8, bPO_e:14336, bPE_d:204.8, bPE_e:14336, bLN_d:170.97, bLN_e:9403, bLS_d:231.69, bLS_e:12743, chS:4207, chN:4207, faitage:1130, anticond:2830 },
    { id:11, type:'TYPE 4 MID', spv:'ACAMA SPV1', cap:360, massifs:28, long:45.15, larg:37.49, travees:6, lTravee:7.5, hSud:4.18, hNord:4.18, hFait:6.05, lRemS:18.79, lRemN:18.79, sSud:848.4, sNord:848.4, sTot:1696.7, axeS:18.5, axeN:18.5, pS:5.77, pN:5.77, bPO_d:204.8, bPO_e:14336, bPE_d:204.8, bPE_e:14336, bLN_d:205.04, bLN_e:11277, bLS_d:231.69, bLS_e:12743, chS:5057, chN:5057, faitage:1355, anticond:3393 },
    { id:12, type:'TYPE 4 MAXI', spv:'ACAMA SPV1', cap:499.05, massifs:36, long:63.35, larg:37.49, travees:8, lTravee:7.9, hSud:4.18, hNord:4.18, hFait:6.05, lRemS:18.79, lRemN:18.79, sSud:1190.3, sNord:1190.3, sTot:2380.7, axeS:18.5, axeN:18.5, pS:5.77, pN:5.77, bPO_d:204.8, bPO_e:14336, bPE_d:204.8, bPE_e:14336, bLN_d:287.72, bLN_e:15825, bLS_d:231.69, bLS_e:12743, chS:7095, chN:7095, faitage:1901, anticond:4761 },
    { id:13, type:'TYPE 5 MINI', spv:'ACAMA SPV1', cap:175.95, massifs:18, long:31.18, larg:27.59, travees:5, lTravee:6.2, hSud:4, hNord:8.26, hFait:7.54, lRemS:23.69, lRemN:4.19, sSud:738.2, sNord:130.6, sTot:868.7, axeS:23.1, axeN:3.93, pS:8.71, pN:-10.38, bPO_d:185.15, bPO_e:12961, bPE_d:185.15, bPE_e:12961, bLN_d:245.36, bLN_e:13495, bLS_d:231.69, bLS_e:12743, chS:3490, chN:3490, faitage:935, anticond:1737 },
    { id:14, type:'TYPE 5 MID', spv:'ACAMA SPV1', cap:289.8, massifs:27, long:50.18, larg:27.59, travees:8, lTravee:6.2, hSud:4, hNord:8.26, hFait:7.54, lRemS:23.69, lRemN:4.19, sSud:1188.3, sNord:210.2, sTot:1398.5, axeS:23.1, axeN:3.93, pS:8.71, pN:-10.38, bPO_d:185.15, bPO_e:12961, bPE_d:185.15, bPE_e:12961, bLN_d:394.94, bLN_e:21557, bLS_d:231.69, bLS_e:12743, chS:5618, chN:5618, faitage:1505, anticond:2797 },
    { id:15, type:'TYPE 5 MAXI', spv:'ACAMA SPV1', cap:362.25, massifs:33, long:62.58, larg:27.59, travees:10, lTravee:6.2, hSud:4, hNord:8.26, hFait:7.54, lRemS:23.69, lRemN:4.19, sSud:1482, sNord:262.1, sTot:1744.2, axeS:23.1, axeN:3.93, pS:8.71, pN:-10.38, bPO_d:185.15, bPO_e:12961, bPE_d:185.15, bPE_e:12961, bLN_d:489.65, bLN_e:26931, bLS_d:231.69, bLS_e:12743, chS:7007, chN:7007, faitage:1877, anticond:3488 },
    { id:16, type:'TYPE 6 MINI', spv:'ACAMA SPV1', kwc:158.4, massifs:14, long:38.4, larg:19.87, travees:6, lTravee:6.4, hSud:4.04, hNord:5.7, hFait:7, lRemS:15.21, lRemN:4.14, sSud:599.3, sNord:163.1, sTot:762.4, axeS:14.67, axeN:3.78, pS:11.41, pN:18.98, bPO_d:100.28, bPO_e:7020, bPE_d:100.28, bPE_e:7020, bLN_d:232.65, bLN_e:12796, bLS_d:231.69, bLS_e:12743, chS:4413, chN:4413, faitage:1182, anticond:1525 },
    { id:17, type:'TYPE 6 MID', spv:'ACAMA SPV1', kwc:259.2, massifs:22, long:64.17, larg:19.87, travees:10, lTravee:6.4, hSud:4.04, hNord:5.7, hFait:7, lRemS:15.21, lRemN:4.14, sSud:976, sNord:265.7, sTot:1241.7, axeS:14.67, axeN:3.78, pS:11.41, pN:18.98, bPO_d:100.28, bPO_e:7020, bPE_d:100.28, bPE_e:7020, bLN_d:387.07, bLN_e:21289, bLS_d:231.69, bLS_e:12743, chS:7387, chN:7387, faitage:1925, anticond:2485 },
    { id:18, type:'TYPE 6 MAXI', spv:'ACAMA SPV1', kwc:338.4, massifs:28, long:83.77, larg:19.87, travees:13, lTravee:6.4, hSud:4.04, hNord:5.7, hFait:7, lRemS:15.21, lRemN:4.14, sSud:1274.1, sNord:346.8, sTot:1620.9, axeS:14.67, axeN:3.78, pS:11.41, pN:18.98, bPO_d:100.28, bPO_e:7020, bPE_d:100.28, bPE_e:7020, bLN_d:508.38, bLN_e:27930, bLS_d:231.69, bLS_e:12743, chS:9382, chN:9382, faitage:2513, anticond:3242 },
    { id:19, type:'TYPE 7 MINI', spv:'ACAMA SPV1', kwc:153, massifs:14, long:36.17, larg:20.19, travees:6, lTravee:6, hSud:4, hNord:7.24, hFait:0, lRemS:20.45, lRemN:0, sSud:739.7, sNord:0, sTot:739.7, axeS:19.94, axeN:0, pS:-11.34, pN:0, bPO_d:111.99, bPO_e:7839, bPE_d:111.99, bPE_e:7839, bLN_d:276.91, bLN_e:15230, bLS_d:231.69, bLS_e:12743, chS:4051, chN:4051, faitage:1085, anticond:1479 },
    { id:20, type:'TYPE 7 MID', spv:'ACAMA SPV1', kwc:260.1, massifs:22, long:60.17, larg:20.19, travees:10, lTravee:6, hSud:4, hNord:7.24, hFait:0, lRemS:20.45, lRemN:0, sSud:1230.7, sNord:0, sTot:1230.7, axeS:19.94, axeN:0, pS:-11.34, pN:0, bPO_d:111.99, bPO_e:7839, bPE_d:111.99, bPE_e:7839, bLN_d:460.75, bLN_e:25341, bLS_d:231.69, bLS_e:12743, chS:6784, chN:6784, faitage:1817, anticond:2477 },
    { id:21, type:'TYPE 7 MAXI', spv:'ACAMA SPV1', kwc:336.1, massifs:28, long:78.57, larg:20.19, travees:13, lTravee:6, hSud:4, hNord:7.24, hFait:0, lRemS:20.45, lRemN:0, sSud:1606.8, sNord:0, sTot:1606.8, axeS:19.94, axeN:0, pS:-11.34, pN:0, bPO_d:111.99, bPO_e:7839, bPE_d:111.99, bPE_e:7839, bLN_d:598.79, bLN_e:32933, bLS_d:231.69, bLS_e:12743, chS:8800, chN:8800, faitage:2357, anticond:3214 },
    { id:22, type:'TYPE 8 MINI', spv:'ACAMA SPV1', kwc:237.6, massifs:21, long:43.65, larg:26.26, travees:6, lTravee:7.25, hSud:4, hNord:5.65, hFait:7, lRemS:18.08, lRemN:8.4, sSud:789.2, sNord:366.7, sTot:1155.9, axeS:17.75, axeN:8.09, pS:9.59, pN:9.47, bPO_d:146.71, bPO_e:10270, bPE_d:146.71, bPE_e:10270, bLN_d:260.28, bLN_e:14315, bLS_d:231.69, bLS_e:12743, chS:4889, chN:4889, faitage:1310, anticond:2312 },
    { id:23, type:'TYPE 8 MID', spv:'ACAMA SPV1', kwc:316.8, massifs:27, long:58.15, larg:26.26, travees:8, lTravee:7.25, hSud:4, hNord:5.65, hFait:7, lRemS:18.08, lRemN:8.4, sSud:1051.4, sNord:488.5, sTot:1539.8, axeS:17.75, axeN:8.09, pS:9.59, pN:9.47, bPO_d:146.71, bPO_e:10270, bPE_d:146.71, bPE_e:10270, bLN_d:346.67, bLN_e:19067, bLS_d:231.69, bLS_e:12743, chS:6515, chN:6515, faitage:1745, anticond:3080 },
    { id:24, type:'TYPE 8 MAXI', kwc:485.1, massifs:39, long:87.15, larg:26.26, travees:12, lTravee:7.25, hSud:4, hNord:5.65, hFait:7, lRemS:18.08, lRemN:8.4, sSud:1582.9, sNord:735.4, sTot:2318.3, axeS:17.75, axeN:8.09, pS:9.59, pN:9.47, bPO_d:146.71, bPO_e:10270, bPE_d:146.71, bPE_e:10270, bLN_d:519.6, bLN_e:28578, bLS_d:231.69, bLS_e:12743, chS:9806, chN:9806, faitage:2627, anticond:4637 },
    { id:25, type:'TYPE 9 MINI', kwc:255.15, massifs:18, long:37.67, larg:31.13, travees:5, lTravee:7.5, hSud:3.79, hNord:7.59, hFait:9.72, lRemS:23.48, lRemN:8.48, sSud:884.5, sNord:319.4, sTot:1203.9, axeS:22.51, axeN:8, pS:14.76, pN:14.91, bPO_d:221.67, bPO_e:15517, bPE_d:221.67, bPE_e:15517, bLN_d:298.25, bLN_e:16404, bLS_d:231.69, bLS_e:12743, chS:4207, chN:4207, faitage:1130, anticond:2408 },
    { id:26, type:'TYPE 9 MID', kwc:355.35, massifs:24, long:52.67, larg:31.13, travees:7, lTravee:7.5, hSud:3.79, hNord:7.59, hFait:9.72, lRemS:23.48, lRemN:8.48, sSud:1236.7, sNord:446.6, sTot:1683.3, axeS:22.51, axeN:8, pS:14.76, pN:14.91, bPO_d:221.67, bPO_e:15517, bPE_d:221.67, bPE_e:15517, bLN_d:416.98, bLN_e:22934, bLS_d:231.69, bLS_e:12743, chS:5906, chN:5906, faitage:1580, anticond:3367 },
    { id:27, type:'TYPE 9 MAXI', kwc:499.95, massifs:34, long:75, larg:31.13, travees:10, lTravee:7.5, hSud:3.79, hNord:7.59, hFait:9.72, lRemS:23.48, lRemN:8.48, sSud:1765, sNord:637.4, sTot:2402.4, axeS:22.51, axeN:8, pS:14.76, pN:14.91, bPO_d:221.67, bPO_e:15517, bPE_d:221.67, bPE_e:15517, bLN_d:593.43, bLN_e:32639, bLS_d:231.69, bLS_e:12743, chS:8419, chN:8419, faitage:2255, anticond:4805 },
    { id:28, type:'EQUESTRE 65m', kwc:502.2, massifs:30, long:65, larg:35.25, travees:9, lTravee:7.1, hSud:3.06, hNord:4.67, hFait:9.1, lRemS:21.11, lRemN:15.43, sSud:1372.2, sNord:1003.0, sTot:2375.1, axeS:20.14, axeN:14.78, pS:16.69, pN:16.69, bPO_d:224.31, bPO_e:15702, bPE_d:224.31, bPE_e:15702, bLN_d:321.73, bLN_e:17695, bLS_d:231.69, bLS_e:12743, chS:7280, chN:7280, faitage:1950, anticond:4750 },
    { id:29, type:'EQUESTRE 45m', kwc:348.75, long:45, larg:35.25, travees:6, lTravee:7.5, hSud:3.06, hNord:4.67, hFait:9.1, lRemS:21.11, lRemN:15.43, sSud:950.0, sNord:694.4, sTot:1644.3, axeS:20.14, axeN:14.78, pS:16.69, pN:16.69, bPO_d:224.31, bPO_e:15702, bPE_d:224.31, bPE_e:15702, bLN_d:220.83, bLN_e:12146, bLS_d:231.69, bLS_e:12743, chS:5040, chN:5040, faitage:1350, anticond:3289 },
    { id:30, type:'AMA 1 MINI', kwc:99.36, massifs:10, long:32.3, larg:14.85, travees:4, hSud:4, lRemS:13, lRemN:2, sSud:419.9, sNord:64.6, sTot:484.5, bPO_d:63.16, bPO_e:4421, bPE_d:63.16, bPE_e:4421, bLN_d:163.52, bLN_e:8994, bLS_d:119.54, bLS_e:6575, chS:3618, chN:3618, faitage:969, anticond:969 },
    { id:31, type:'AMA 2 MINI', kwc:99.36, massifs:10, long:32.3, larg:14.5, travees:4, hSud:4, lRemS:7.3, lRemN:7.3, sSud:235.8, sNord:235.8, sTot:471.6, bPO_d:71.89, bPO_e:5032, bPE_d:71.89, bPE_e:5032, bLN_d:127.35, bLN_e:7114, bLS_d:129.35, bLS_e:7114, chS:3618, chN:3618, faitage:969, anticond:909 },
    { id:32, type:'SOL MINI', kwc:101.2, massifs:10, long:55, travees:8.5, sSud:306.0, sNord:280.0, sTot:586.0, bPO_d:52.21, bPO_e:3655, bPE_d:52.21, bPE_e:3655, bLN_d:154.5, bLN_e:8498, bLS_d:124.33, bLS_e:6838, chS:4032, chN:4032, faitage:1080, anticond:972 },
  ]);

  const cols = [
    { key: 'type', label: 'Projet Type', width: 120 },
    { key: 'spv', label: 'S/PV', width: 90 },
    { key: 'cap', label: 'Capacité', width: 60 },
    { key: 'massifs', label: 'Nb massifs', width: 60 },
    { key: 'long', label: 'Long. Bat', width: 70 },
    { key: 'larg', label: 'Larg. Bat', width: 70 },
    { key: 'travees', label: 'Nb Travées', width: 60 },
    { key: 'lTravee', label: 'Larg. Travée', width: 70 },
    { key: 'hSud', label: 'H. Sud', width: 60 },
    { key: 'hNord', label: 'H. Nord', width: 60 },
    { key: 'hFait', label: 'H. Faitage', width: 60 },
    { key: 'lRemS', label: 'L. Remp. S', width: 70 },
    { key: 'lRemN', label: 'L. Remp. N', width: 70 },
    { key: 'sSud', label: 'Surf. S', width: 70 },
    { key: 'sNord', label: 'Surf. N', width: 70 },
    { key: 'sTot', label: 'Surf. Tot', width: 70 },
    { key: 'axeS', label: 'Axe S-F', width: 70 },
    { key: 'axeN', label: 'Axe N-F', width: 70 },
    { key: 'pS', label: 'Pente S', width: 60 },
    { key: 'pN', label: 'Pente N', width: 60 },
    { key: 'bLN_e', label: 'BP LP N (€)', width: 80 },
    { key: 'bLS_d', label: 'BP LP S (Dim)', width: 80 },
    { key: 'bLS_e', label: 'BP LP S (€)', width: 80 },
    { key: 'chS', label: 'Chéneau S', width: 80 },
    { key: 'chN', label: 'Chéneau N', width: 80 },
    { key: 'faitage', label: 'Faitage v.', width: 80 },
    { key: 'anticond', label: 'Anti-cond.', width: 80 },
  ];

  const update = (id, k, v) => setRows(r => r.map(row => row.id === id ? { ...row, [k]: v } : row));

  return (
    <div className="p-4 overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Button size="sm" onClick={() => setRows(r => [...r, { id: Date.now(), type:'' }])} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Nouvelle ligne
        </Button>
      </div>
      <div {...useDragScroll()} className="flex-1 overflow-auto border border-slate-200 rounded-lg shadow-sm bg-white">
        <table className="text-[12px] border-collapse min-w-max">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-800 text-white">
              {cols.map(c => (
                <th key={c.key} style={{ width: c.width }} className="border border-slate-600 px-2 py-2 font-semibold text-center whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="border border-slate-600 px-2 py-2 w-8">✕</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={cn('group', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-blue-50/30 font-medium')}>
                {cols.map(c => (
                  <td key={c.key} className="border border-slate-200 p-0 relative">
                    <input
                      className="w-full px-2 py-1.5 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-center transition-all"
                      value={row[c.key] ?? ''}
                      onChange={e => update(row.id, c.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="border border-slate-200 text-center group-hover:bg-red-50">
                  <button onClick={() => setRows(r => r.filter(x => x.id !== row.id))} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabPropositionClientBAC({ projects, selectedProject, setSelectedProject, params, resteACharge }) {
  const [data, setData] = useState({
    nomProjet: '', mixte: 'NON', typeBat: '', zoneNeige: 'N/A', zoneVent: 'N/A', altitude: 'N/A', gps: '', superficie: 'N/A',
    prodMoyen: '', puissance: '', tarif: '', ombrage: 'NON', longTranchee: '30', distPublique: '173', optionOffert: '',
    dateRealisation: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    dateValidite: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    pcComplete: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    depotDepose: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    realiseBy: 'M.T', valideBy: 'A.M', remarques: '',
  });

  useEffect(() => {
    if (selectedProject) {
      const commFullName = selectedProject.commercial_name || selectedProject.manager_name || '';
      const commFirstName = commFullName.split(' ')[0] || '';

      setData(prev => ({
        ...prev,
        nomProjet: selectedProject.name || '',
        mixte: selectedProject.mixte || 'NON',
        typeBat: selectedProject.type_bat || '',
        zoneNeige: selectedProject.urbanData?.neige || selectedProject.neige || selectedProject.urbanisme?.neige || 'N/A',
        zoneVent: selectedProject.urbanData?.vents || selectedProject.vent || selectedProject.urbanisme?.vents || 'N/A',
        altitude: selectedProject.urbanData?.alti || selectedProject.alti || selectedProject.urbanisme?.alti || 'N/A',
        gps: (selectedProject.lat && selectedProject.lng) ? `${fmt(selectedProject.lat, 6)}, ${fmt(selectedProject.lng, 6)}` : (selectedProject.gps || '0'),
        superficie: selectedProject.surface || 'N/A',
        prodMoyen: params?.productible || selectedProject.productible || '',
        puissance: params?.kwc || selectedProject.puissance || '',
        tarif: params?.tarifBas || '0,0846',
        ombrage: selectedProject.ombrage || 'NON',
        realiseBy: commFirstName,
        valideBy: '',
        remarques: selectedProject.comments || `Bâtiment type ${selectedProject.type_bat || 'T8 MIN'} avec les options :\n- 2 portails coulissants 4,5 m de haut par 6m de large\n- 4m de mur agglo sur les 4 côtés à la charge du client hors chiffrage et le reste en bardage chiffré dans l'offre`,
      }));
    }
  }, [selectedProject, params]);

  const update = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const Section = ({ title, children }) => (
    <div className="mb-4">
      <div className="bg-[#002060] text-white text-[12px] font-bold px-3 py-1.5 uppercase tracking-wider text-center">{title}</div>
      <div className="bg-white border-x border-b border-slate-300">{children}</div>
    </div>
  );

  const Row = ({ label, value, onChange, isLast, isCurrency, type = 'text', options }) => (
    <div className={cn("flex border-b border-slate-200 last:border-0", isLast && "border-0")}>
      <div className="w-2/5 bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-900 border-r border-slate-300 uppercase shrink-0 flex items-center">{label}</div>
      <div className="w-3/5 px-3 py-1.5 text-[12px] font-medium text-slate-800 flex items-center justify-center text-center bg-white min-h-[32px]">
        {onChange ? (
           type === 'select' ? (
             <select className="w-full bg-transparent outline-none text-center appearance-none" value={value ?? ''} onChange={e => onChange(e.target.value)}>
               {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
             </select>
           ) : (
            <input
              type={type}
              className="w-full bg-transparent outline-none text-center focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:rounded"
              value={isCurrency ? fmtEur(value).replace(' €','') : (value ?? '')}
              onChange={e => onChange(e.target.value)}
            />
           )
        ) : (
          <span>{isCurrency ? fmtEur(value) : (value ?? '—')}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-slate-100 min-h-full overflow-auto">
      <div className="max-w-[1200px] mx-auto bg-white shadow-xl p-8 border border-slate-300 rounded-sm">
        <div className="flex justify-between items-center mb-8 bg-white no-print">
          <div className="flex items-center gap-4">
             <div className="px-3 py-2 bg-[#002060] rounded-sm flex items-center justify-center text-white font-black text-lg">BAC</div>
             <h2 className="text-2xl font-black text-[#002060] uppercase tracking-tighter">Proposition Client BAC</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64"><ProjectSelect projects={projects} selectedProject={selectedProject} onSelect={setSelectedProject} /></div>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}><FileDown className="w-4 h-4" /> PDF</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <Section title="Projet">
              <Row label="PROJET :" value={data.nomProjet} onChange={v => update('nomProjet', v)} />
              <Row label="Projet Mixte" value={data.mixte} onChange={v => update('mixte', v)} options={['NON','OUI']} type="select" />
              <Row label="Type Bâtiment" value={data.typeBat} onChange={v => update('typeBat', v)} />
              <Row label="Zone neige :" value={data.zoneNeige} onChange={v => update('zoneNeige', v)} />
              <Row label="Zone vent :" value={data.zoneVent} onChange={v => update('zoneVent', v)} />
              <Row label="Altitude :" value={data.altitude} onChange={v => update('altitude', v)} />
              <Row label="POINT GPS" value={data.gps} onChange={v => update('gps', v)} />
              <Row label="Superficie (m²) :" value={data.superficie} onChange={v => update('superficie', v)} />
              <Row label="Productible (kWh/kWc)" value={data.prodMoyen} />
              <Row label="Puissance (kWc) :" value={data.puissance} />
              <Row label="Tarif (c€/kWh)" value={data.tarif} onChange={v => update('tarif', v)} />
              <Row label="Ombrage" value={data.ombrage} onChange={v => update('ombrage', v)} options={['NON','OUI']} type="select" isLast />
            </Section>
            <Section title="RACCORDEMENT PARTIE PRIVEE"><Row label="Longueur tranchée (ml)" value={data.longTranchee} onChange={v => update('longTranchee', v)} isLast /></Section>
            <Section title="RACCORDEMENT PARTIE PUBLIQUE"><Row label="Distance (ml) :" value={data.distPublique} onChange={v => update('distPublique', v)} isLast /></Section>
          </div>
          <div className="space-y-4">
            <Section title="BILAN PROJET">
              <Row label="Reste à charge" value={resteACharge} isCurrency isLast />
              <Row label="Option Offerte" value={data.optionOffert} onChange={v => update('optionOffert', v)} isLast />
            </Section>
            <Section title="Dates et Validation">
              <Row label="Date de réalisation :" value={data.dateRealisation} onChange={v => update('dateRealisation', v)} />
              <Row label="Offre valable jusqu'au :" value={data.dateValidite} onChange={v => update('dateValidite', v)} />
              <Row label="PC a Completer avant le" value={data.pcComplete} onChange={v => update('pcComplete', v)} />
              <Row label="Depot a deposer avant le" value={data.depotDepose} onChange={v => update('depotDepose', v)} />
              <Row label="Réalisé par" value={data.realiseBy} onChange={v => update('realiseBy', v)} />
              <Row label="Validé par" value={data.valideBy} onChange={v => update('valideBy', v)} isLast />
            </Section>
            <div className="mt-4 border border-slate-300 p-4 min-h-[140px] bg-white text-[12px]">
              <div className="font-bold text-[#002060] mb-2 uppercase border-b border-slate-200 pb-1">Remarques :</div>
              <textarea className="w-full bg-transparent outline-none text-slate-800 resize-y h-24" value={data.remarques} onChange={e => update('remarques', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabPropositionBE({ projects, selectedProject, setSelectedProject, params }) {
  const [data, setData] = useState({
    nomProjet: '', mixte: 'NON', typeBat: '', zoneNeige: 'N/A', zoneVent: 'N/A', altitude: 'N/A', gps: '', superficie: 'N/A',
    prodMoyen: '', puissance: '', tarif: '', ombrage: 'NON', longTranchee: '30', distPublique: '173', soulte: '', optionOffert: '',
    dateRealisation: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    dateValidite: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    pcComplete: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    depotDepose: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    realiseBy: 'S.B', valideBy: 'A.M', remarques: '',
  });

  useEffect(() => {
    if (selectedProject) {
      setData(prev => ({
        ...prev,
        nomProjet: selectedProject.name || '',
        mixte: selectedProject.mixte || 'NON',
        typeBat: selectedProject.type_bat || '',
        zoneNeige: selectedProject.urbanData?.neige || selectedProject.neige || selectedProject.urbanisme?.neige || 'N/A',
        zoneVent: selectedProject.urbanData?.vents || selectedProject.vent || selectedProject.urbanisme?.vents || 'N/A',
        altitude: selectedProject.urbanData?.alti || selectedProject.alti || selectedProject.urbanisme?.alti || 'N/A',
        gps: (selectedProject.lat && selectedProject.lng) ? `${fmt(selectedProject.lat, 4)} / ${fmt(selectedProject.lng, 4)}` : '0',
        superficie: selectedProject.surface || 'N/A',
        prodMoyen: params?.productible || selectedProject.productible || '',
        puissance: params?.kwc || selectedProject.puissance || '',
        tarif: params?.tarifBas || '0,0846',
        ombrage: selectedProject.ombrage || 'NON',
        soulte: params?.soulte || '',
      }));
    }
  }, [selectedProject, params]);

  const update = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const Section = ({ title, children }) => (
    <div className="mb-4">
      <div className="bg-[#002060] text-white text-[12px] font-bold px-3 py-1.5 uppercase tracking-wider text-center">{title}</div>
      <div className="bg-white border-x border-b border-slate-300">{children}</div>
    </div>
  );

  const Row = ({ label, value, onChange, isLast, isCurrency, type = 'text', options }) => (
    <div className={cn("flex border-b border-slate-200 last:border-0", isLast && "border-0")}>
      <div className="w-2/5 bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-900 border-r border-slate-300 uppercase shrink-0 flex items-center">{label}</div>
      <div className="w-3/5 px-3 py-1.5 text-[12px] font-medium text-slate-800 flex items-center justify-center text-center bg-white min-h-[32px]">
        {onChange ? (
           type === 'select' ? (
             <select className="w-full bg-transparent outline-none text-center appearance-none" value={value ?? ''} onChange={e => onChange(e.target.value)}>
               {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
             </select>
           ) : (
            <input
              type={type}
              className="w-full bg-transparent outline-none text-center focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:rounded"
              value={isCurrency ? fmtEur(value).replace(' €','') : (value ?? '')}
              onChange={e => onChange(e.target.value)}
            />
           )
        ) : (
          <span>{isCurrency ? fmtEur(value) : (value ?? '—')}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-slate-100 min-h-full overflow-auto">
      <div className="max-w-[1200px] mx-auto bg-white shadow-xl p-8 border border-slate-300 rounded-sm">
        <div className="flex justify-between items-center mb-8 bg-white no-print">
          <div className="flex items-center gap-4">
             <div className="px-3 py-2 bg-[#002060] rounded-sm flex items-center justify-center text-white font-black text-lg">BE</div>
             <h2 className="text-2xl font-black text-[#002060] uppercase tracking-tighter">Proposition Client BE</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64"><ProjectSelect projects={projects} selectedProject={selectedProject} onSelect={setSelectedProject} /></div>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}><FileDown className="w-4 h-4" /> PDF</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <Section title="Projet">
              <Row label="PROJET :" value={data.nomProjet} onChange={v => update('nomProjet', v)} />
              <Row label="Projet Mixte" value={data.mixte} onChange={v => update('mixte', v)} options={['NON','OUI']} type="select" />
              <Row label="Type Bâtiment" value={data.typeBat} onChange={v => update('typeBat', v)} />
              <Row label="Zone neige :" value={data.zoneNeige} onChange={v => update('zoneNeige', v)} />
              <Row label="Zone vent :" value={data.zoneVent} onChange={v => update('zoneVent', v)} />
              <Row label="Altitude :" value={data.altitude} onChange={v => update('altitude', v)} />
              <Row label="POINT GPS" value={data.gps} onChange={v => update('gps', v)} />
              <Row label="Superficie (m²) :" value={data.superficie} onChange={v => update('superficie', v)} />
              <Row label="Productible (kWh/kWc)" value={data.prodMoyen} />
              <Row label="Puissance (kWc) :" value={data.puissance} />
              <Row label="Tarif (c€/kWh)" value={data.tarif} onChange={v => update('tarif', v)} />
              <Row label="Ombrage" value={data.ombrage} onChange={v => update('ombrage', v)} options={['NON','OUI']} type="select" isLast />
            </Section>
            <Section title="RACCORDEMENT PARTIE PRIVEE"><Row label="Longueur tranchée (ml)" value={data.longTranchee} onChange={v => update('longTranchee', v)} isLast /></Section>
            <Section title="RACCORDEMENT PARTIE PUBLIQUE"><Row label="Distance (ml) :" value={data.distPublique} onChange={v => update('distPublique', v)} isLast /></Section>
          </div>
          <div className="space-y-4">
            <Section title="BILAN PROJET">
               <Row label="Soulte :" value={data.soulte} onChange={v => update('soulte', v)} isCurrency />
               <Row label="Option Offerte" value={data.optionOffert} onChange={v => update('optionOffert', v)} isLast />
            </Section>
            <Section title="Dates Clés">
              <Row label="Date de réalisation :" value={data.dateRealisation} onChange={v => update('dateRealisation', v)} />
              <Row label="Offre valable jusqu'au :" value={data.dateValidite} onChange={v => update('dateValidite', v)} />
              <Row label="PC à Compléter avant le" value={data.pcComplete} onChange={v => update('pcComplete', v)} />
              <Row label="Dépôt à déposer avant le" value={data.depotDepose} onChange={v => update('depotDepose', v)} isLast />
            </Section>
            <Section title="Responsabilité">
              <Row label="Réalisé par :" value={data.realiseBy} onChange={v => update('realiseBy', v)} />
              <Row label="Validé par :" value={data.valideBy} onChange={v => update('valideBy', v)} isLast />
              <div className="p-3 border-t border-slate-200 bg-white text-[12px]">
                <div className="font-bold text-[#002060] mb-1 uppercase pb-1">Remarques :</div>
                <textarea className="w-full bg-transparent outline-none text-slate-800 resize-y h-16" value={data.remarques} onChange={e => update('remarques', e.target.value)} />
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabDevis({ projects, selectedProject, setSelectedProject, params, setParams }) {
  const [data, setData] = useState({
    dateDevis: new Date().toLocaleDateString('fr-FR'), dateValidite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
    etudeRenfort: 0, etudeImplant: 0, etudeNoteCalcul: 0, etudeCalepinage: 0, transportCharpente: 0, fournitureBac: 0, anticondensation: 0,
    transportCouverture: 0, levage: 0, securite: 0, montage: 0, etudeElec: 0, securiteElec: 0, poseModules: 0,
  });

  const kwc = params?.kwc || 0;
  const longBat = parseFloat(selectedProject?.longueur) || 0;
  const largBat = parseFloat(selectedProject?.largeur) || 0;
  const nbTravees = parseInt(selectedProject?.nb_travees) || 0;
  const largTravee = parseFloat(selectedProject?.larg_travee) || 0;
  const surface = parseFloat(selectedProject?.surface) || 0;

  const update = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const subtotalBat = (parseFloat(data.etudeRenfort) || 0) + (parseFloat(data.etudeImplant) || 0) + (parseFloat(data.etudeNoteCalcul) || 0) +
                     (parseFloat(data.etudeCalepinage) || 0) + (parseFloat(data.transportCharpente) || 0) + (parseFloat(data.fournitureBac) || 0) +
                     (parseFloat(data.anticondensation) || 0) + (parseFloat(data.transportCouverture) || 0) + (parseFloat(data.levage) || 0) +
                     (parseFloat(data.securite) || 0) + (parseFloat(data.montage) || 0) + (params?.coutCharpente || 0);

  const subtotalElec = (parseFloat(data.etudeElec) || 0) + (parseFloat(data.securiteElec) || 0) + (parseFloat(data.poseModules) || 0) +
                       (params?.coutCentrale || 0) + (params?.onduleurs || 0);

  const totalHT = subtotalBat + subtotalElec + (params?.raccordement || 0);

  const Row = ({ label, value, unit, onChange, isHeader, isSubtotal }) => (
    <div className={cn("flex border-b border-slate-100 py-1.5 px-3 items-center hover:bg-slate-50 transition-colors",
      isHeader && "bg-slate-800 text-white font-bold hover:bg-slate-800", isSubtotal && "bg-slate-100 font-bold border-t-2 border-slate-200"
    )}>
      <div className={cn("text-[11px] flex-1", isHeader && "uppercase tracking-wider text-xs")}>{label}</div>
      <div className="flex items-center gap-2 w-32">
        {onChange ? (
          <input
            type="text"
            className="w-full bg-transparent text-right outline-none text-[11px] px-1 font-medium border-b border-transparent focus:border-blue-400 focus:bg-blue-50 focus:rounded"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <div className="w-full text-right text-[11px] font-bold">{typeof value === 'number' ? fmt(value, 0) : (value ?? '—')}</div>
        )}
        <div className="w-8 text-[9px] text-slate-400 text-right uppercase font-bold">{unit}</div>
      </div>
    </div>
  );

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="max-w-[1200px] mx-auto w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-auto flex flex-col no-scrollbar">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3"><FileDown className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-slate-800">DEVIS TECHNIQUE</h3></div>
          <div className="flex items-center gap-4">
             <div className="w-64"><ProjectSelect projects={projects} selectedProject={selectedProject} onSelect={setSelectedProject} /></div>
             <Button size="sm" className="gap-2 shadow-sm" onClick={() => window.print()}><FileDown className="w-4 h-4" /> Générer</Button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-8 p-4 bg-slate-50 rounded-lg border border-slate-100 text-[12px]">
             <div className="space-y-2">
               <div className="flex items-center gap-3"><span className="text-slate-500 font-medium w-40">Date de réalisation :</span><input className="bg-white border border-slate-200 rounded px-2 py-1 outline-none w-32 shadow-sm" value={data.dateDevis} onChange={e => update('dateDevis', e.target.value)} /></div>
               <div className="flex items-center gap-3"><span className="text-slate-500 font-medium w-40">Date de validité :</span><input className="bg-white border border-slate-200 rounded px-2 py-1 outline-none w-32 shadow-sm" value={data.dateValidite} onChange={e => update('dateValidite', e.target.value)} /></div>
               <div className="flex items-center gap-3 mt-4">
                  <span className="text-slate-500 font-medium w-40">Type de bâtiment :</span>
                  <select
                    className="bg-white border border-slate-200 rounded px-2 py-1 outline-none w-48 shadow-sm text-xs"
                    value={params.typeBat || ''}
                    onChange={e => {
                      const bat = SUIVI_BAT_DATA.find(b => b.type === e.target.value);
                      if (bat) {
                        setParams(p => ({
                          ...p,
                          typeBat: bat.type,
                          coutCharpente: bat.cout_bat,
                          kwc: bat.kwc,
                          surfaceTotale: bat.surfTot,
                          spv: bat.spv
                        }));
                      }
                    }}
                  >
                    <option value="">Sélectionner...</option>
                    {SUIVI_BAT_DATA.map(b => <option key={b.type} value={b.type}>{b.type}</option>)}
                  </select>
               </div>
             </div>
             <div className="text-right flex flex-col items-end">
                <div className="font-black text-slate-800 uppercase text-lg mb-1">PROJET : {selectedProject?.name || 'Non sélectionné'}</div>
                 <div className="bg-[#002060] text-white p-4 rounded-md shadow-md text-left min-w-[300px] border-l-4 border-blue-400">
                  <div className="font-bold border-b border-blue-800/50 pb-1 mb-2 uppercase text-[10px] tracking-widest text-blue-200">Informations Client</div>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-blue-300 font-medium mr-2">Nom / Prénom :</span> <span className="font-bold uppercase">{selectedProject?.name || selectedProject?.client_name || '—'} {selectedProject?.firstName || selectedProject?.client_firstname || ''}</span></p>
                    <p><span className="text-blue-300 font-medium mr-2">Adresse :</span> <span className="font-bold">{selectedProject?.address || '—'}</span></p>
                    <p><span className="text-blue-300 font-medium mr-2">CP / Ville :</span> <span className="font-bold">{selectedProject?.zip || '—'} {selectedProject?.city || '—'}</span></p>
                    <p><span className="text-blue-300 font-medium mr-2">Téléphone :</span> <span className="font-bold">{selectedProject?.phone || '—'}</span></p>
                    <p><span className="text-blue-300 font-medium mr-2">Email :</span> <span className="font-bold italic">{selectedProject?.email || '—'}</span></p>
                  </div>
                </div>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-0 border border-slate-100 rounded-lg overflow-hidden">
            <div className="border-r border-slate-100">
              <Row label="LOT BÂTIMENT (Charpente & Couverture)" isHeader />
              <div className="bg-blue-50/30 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-tighter">Études techniques</div>
              <Row label="  • Étude de renforcement" value={data.etudeRenfort} unit="€ HT" onChange={v => update('etudeRenfort', v)} />
              <Row label="  • Plan d'implantation & descente de charge" value={data.etudeImplant} unit="€ HT" onChange={v => update('etudeImplant', v)} />
              <Row label="  • Plan d'ensemble & note de calcul" value={data.etudeNoteCalcul} unit="€ HT" onChange={v => update('etudeNoteCalcul', v)} />
              <Row label="  • Plan de calepinage couverture" value={data.etudeCalepinage} unit="€ HT" onChange={v => update('etudeCalepinage', v)} />
              <div className="bg-blue-50/30 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-tighter">Ossature & Charpente</div>
              <Row label="  • Coût matériel Charpente (BP)" value={params?.coutCharpente} unit="€ HT" />
              <Row label="  • Largeur totale extérieur poteaux" value={fmt(largBat, 2)} unit="ml" />
              <Row label="  • Longueur totale" value={fmt(longBat, 2)} unit="ml" />
              <Row label="  • Nbre de travées / Largeur travée" value={`${nbTravees} u / ${fmt(largTravee, 2)} ml`} />
              <Row label="  • Transport et déchargement charpente" value={data.transportCharpente} unit="€ HT" onChange={v => update('transportCharpente', v)} />
              <div className="bg-blue-50/30 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-tighter">Couverture & Finitions</div>
              <Row label="  • Fourniture Bac Acier (BAC ACIER)" value={data.fournitureBac} unit="€ HT" onChange={v => update('fournitureBac', v)} />
              <Row label="  • Surface couverture totale" value={fmt(surface, 0)} unit="m²" />
              <Row label="  • Film anti-condensation / Épaisseur 75/100" value={data.anticondensation} unit="€ HT" onChange={v => update('anticondensation', v)} />
              <Row label="  • Transport et déchargement couverture" value={data.transportCouverture} unit="€ HT" onChange={v => update('transportCouverture', v)} />
            </div>
            <div>
              <div className="bg-blue-50/30 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-tighter">Pose & Logistique</div>
              <Row label="  • Location engins de levage & montage" value={data.levage} unit="€ HT" onChange={v => update('levage', v)} />
              <Row label="  • Sécurité chantier (EPI / EPC)" value={data.securite} unit="€ HT" onChange={v => update('securite', v)} />
              <Row label="  • Montage charpente & pose couverture" value={data.montage} unit="€ HT" onChange={v => update('montage', v)} />
              <Row label="SOUS-TOTAL LOT BÂTIMENT" value={subtotalBat} unit="€ HT" isSubtotal />
              <div className="h-4 bg-white" />
              <Row label="LOT ÉLECTRICITÉ (Photovoltaïque)" isHeader />
              <div className="bg-blue-50/30 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-tighter">Ingénierie & Sécurité</div>
              <Row label="  • Développement, Raccordement & Études PV" value={data.etudeElec} unit="€ HT" onChange={v => update('etudeElec', v)} />
              <Row label="  • Sécurité électrique & Travaux" value={data.securiteElec} unit="€ HT" onChange={v => update('securiteElec', v)} />
              <div className="bg-blue-50/30 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-tighter">Matériel & Pose</div>
              <Row label="  • Coût matériel Centrale PV (BP)" value={params?.coutCentrale} unit="€ HT" />
              <Row label="  • Puissance totale installée" value={fmt(kwc, 2)} unit="kWc" />
              <Row label="  • Fourniture des Onduleurs (BP)" value={params?.onduleurs} unit="€ HT" />
              <Row label="  • Pose & Raccordement modules" value={data.poseModules} unit="€ HT" onChange={v => update('poseModules', v)} />
              <Row label="SOUS-TOTAL LOT ÉLECTRICITÉ" value={subtotalElec} unit="€ HT" isSubtotal />
              <div className="h-4 bg-white" />
              <Row label="FRAIS DE RACCORDEMENT" isHeader />
              <Row label="Coûts Enedis / Privé (BP)" value={params?.raccordement} unit="€ HT" isSubtotal />
            </div>
          </div>
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="flex justify-between items-end relative z-10">
              <div className="space-y-1"><span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Montant Total du Devis</span><p className="text-[10px] text-slate-500 max-w-sm italic leading-tight">Ce devis est une estimation basée sur les paramètres techniques du projet. Une étude de sol et un levé topographique sont nécessaires pour validation finale.</p></div>
              <div className="text-right"><span className="text-xs text-blue-400 font-bold block mb-1">TOTAL HT</span><span className="text-3xl font-black tabular-nums">{fmtEur(totalHT)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: CALCUL ──────────────────────────────────────────────────────────────

function TabCalcul({ projects }) {
  const defaultCols = [
    { key: 'dev', label: 'Dev.' }, { key: 'nom', label: 'Nom du projet', width: 140 },
    { key: 'spv', label: 'SPV' }, { key: 'capacite', label: 'Capacité' },
    { key: 'etude_ch', label: 'Etude de ch.' }, { key: 'etude_bas', label: 'Etude bas.' },
    { key: 'etude_charpente', label: 'Etude charpente' }, { key: 'etude_pv', label: 'Etude PV' },
    { key: 'gestion_admin', label: 'Gestion administrative' }, { key: 'cout_maintenance', label: 'COUT DE LA MAINTENANCE' },
    { key: 'taxes', label: 'Taxes locales (y compris TURPE)' }, { key: 'cout_loc_compteur', label: 'COUT LOCATION COMPTEUR' },
    { key: 'cout_assurance', label: 'COUT ASSURANCE' }, { key: 'frais', label: 'Frais' },
    { key: 'cout_onduleurs', label: 'Coût remplacement onduleurs' }, { key: 'cout_racc_hta', label: 'COUT RACCORDEMENT HTA' },
    { key: 'cout_racc_priv', label: 'COUT RACCORDEMENT PRIVÉ' }, { key: 'cout_bat_type', label: 'COUT BATIMENT TYPE' },
    { key: 'cout_renforcement', label: 'COUT RENFORCEMENT' }, { key: 'cout_couv_1', label: 'COUT COUVERTURE BAT 1' },
    { key: 'cout_couv_2', label: 'COUT COUVERTURE BAT 2' }, { key: 'cout_couv_3', label: 'COUT COUVERTURE BAT 3' },
    { key: 'cout_couv_4', label: 'COUT COUVERTURE BAT 4' }, { key: 'cout_couv_total', label: 'COUT COUVERTURE TOTAL', readOnly: true },
    { key: 'cout_bardage_sud', label: 'COUT BARDAGE Sud' }, { key: 'cout_bardage_nord', label: 'COUT BARDAGE Nord' },
    { key: 'cout_bardage_est', label: 'COUT BARDAGE Est' }, { key: 'cout_bardage_ouest', label: 'COUT BARDAGE Ouest' },
    { key: 'cout_bardage_total', label: 'COUT BARDAGE TOTAL', readOnly: true }, { key: 'cheneaux_sud', label: 'Cheneaux SUD' },
    { key: 'cheneau_nord', label: 'Cheneau NORD' }, { key: 'regulateur', label: 'Régulateur' },
    { key: 'cout_bat_total', label: 'COUT BATIMENT TOTAL', readOnly: true }, { key: 'cout_pv_total', label: 'COUT PV TOTAL', readOnly: true },
    { key: 'cout_projet_total', label: 'COUT PROJET TOTAL', readOnly: true },
  ];

  const initialRows = useMemo(() => {
    return (projects || [])
      .filter(p => p.bpAcamaState)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .map((p) => {
        const bp = p.bpAcamaState || {};
        return {
          id: p.id,
          dev: 'ACAMA',
          nom: p.name,
          spv: bp.spv || 'CH-TTPAGE',
          capacite: bp.kwc || p.puissance || '',
          etude_ch: '', etude_bas: '',
          etude_charpente: bp.coutCharpente || '',
          etude_pv: '', gestion_admin: bp.gestionAdmin || '',
          cout_maintenance: bp.maintenance || '',
          taxes: bp.taxesLocales || '',
          cout_loc_compteur: bp.locationCompteur || '',
          cout_assurance: bp.assurance || '',
          frais: bp.frais || '', cout_onduleurs: bp.onduleurs || '',
          cout_racc_hta: bp.raccordement || '', cout_racc_priv: '',
          cout_bat_type: '', cout_renforcement: '',
          cout_couv_1: '', cout_couv_2: '', cout_couv_3: '', cout_couv_4: '',
          cout_bardage_sud: '', cout_bardage_nord: '', cout_bardage_est: '', cout_bardage_ouest: '',
          cheneaux_sud: '', cheneau_nord: '', regulateur: '',
        };
      });
  }, [projects]);

  const [localRows, setLocalRows] = useState([]);

  const addRow = () => setLocalRows(r => [{ id: `calc-${r.length}`, dev: 'ACAMA', nom: '', spv: 'CH-TTPAGE', capacite: '' }, ...r]);
  const updateLocal = (id, k, v) => setLocalRows(r => r.map(row => row.id === id ? { ...row, [k]: v } : row));
  const delLocal = (id) => setLocalRows(r => r.filter(row => row.id !== id));

  const allRows = [...initialRows, ...localRows].map(row => {
    const getRowValue = (r, k) => r[k]; // Helper to get value from row
    const parse = (k) => parseFloat(getRowValue(row, k)) || 0;

    // Calculs automatiques
    const cout_couv_total = parse(row.cout_couv_1) + parse(row.cout_couv_2) + parse(row.cout_couv_3) + parse(row.cout_couv_4);
    const cout_bardage_total = parse(row.cout_bardage_sud) + parse(row.cout_bardage_nord) + parse(row.cout_bardage_est) + parse(row.cout_bardage_ouest);

    const cout_bat_total = parse(row.regulateur) + cout_couv_total + parse(row.cout_renforcement) + parse(row.cout_bat_type) + parse(row.etude_charpente);

    const cout_pv_total = parse(row.etude_pv) + parse(row.gestion_admin) + parse(row.cout_maintenance) + parse(row.taxes) +
                          parse(row.cout_loc_compteur) + parse(row.cout_assurance) + parse(row.frais) + parse(row.cout_onduleurs) +
                          parse(row.cout_racc_hta) + parse(row.cout_racc_priv);

    const cout_projet_total = cout_bat_total + cout_pv_total;

    return { ...row, cout_couv_total, cout_bardage_total, cout_bat_total, cout_pv_total, cout_projet_total };
  });

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" onClick={addRow} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Nouvelle ligne
        </Button>
        <span className="text-xs text-slate-500">{allRows.length} projets calculés</span>
        <div className="ml-auto text-xs text-slate-400 italic">Formules du fichier BP DPGF--TYPE APP G02 appliquées automatiquement</div>
      </div>
      <div {...useDragScroll()} className="flex-1">
        <table className="text-[12px] border-collapse min-w-max w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-600 px-2 py-1.5 w-8">N°</th>
              {defaultCols.map(c => (
                <th key={c.key} style={{ width: c.width || 80 }} className={cn("border border-slate-600 px-2 py-1.5 font-semibold whitespace-nowrap", c.readOnly && "bg-cyan-800")}>
                  {c.label}
                </th>
              ))}
              <th className="border border-slate-600 px-2 py-1.5 w-8">✕</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => {
              const isLocal = typeof row.id === 'string' && row.id.startsWith('calc-');
              return (
                <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">{i+1}</td>
                  {defaultCols.map(c => (
                    <td key={c.key} className={cn("border border-slate-200 p-0", c.readOnly && "bg-slate-100/50")}>
                      {(c.readOnly && !['nom','spv','dev'].includes(c.key)) ? (
                        <div className="px-2 py-1.5 text-right font-medium">{typeof row[c.key] === 'number' && row[c.key] !== 0 ? fmt(row[c.key], 2) : row[c.key]}</div>
                      ) : (
                        <input
                          className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-blue-50 text-right"
                          value={row[c.key] === 0 ? '' : (row[c.key] ?? '')}
                          onChange={e => isLocal ? updateLocal(row.id, c.key, e.target.value) : null}
                          readOnly={!isLocal}
                        />
                      )}
                    </td>
                  ))}
                  <td className="border border-slate-200 p-0 text-center">
                    {isLocal && (
                      <button onClick={() => delLocal(row.id)} className="p-1 hover:text-red-500 text-slate-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Simple placeholder ─────────────────────────────────────────────────

function TabPlaceholder({ label }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-slate-400">
      <FileText className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs mt-1 opacity-60">Disponible prochainement</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BpAcama() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [activeTab, setActiveTab] = useState('bp_projets');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectEdits, setProjectEdits] = useState({});
  const [batEdits, setBatEdits] = useState({});

  const updateProjectEdit = useCallback((id, k, v) => {
    setProjectEdits(p => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));
  }, []);

  const updateBatEdit = useCallback((id, k, v) => {
    setBatEdits(p => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));
  }, []);

  const [params, setParams] = useState({
    nbModules: 528,
    puissanceUnitaire: 460,
    surfaceTotale: 1150,
    onduleurs: 10200.96,
    kwc: 242.88,
    productible: 1123.08,
    tarifBas: 0.0846,
    tarifHaut: 0.04,
    seuilKwhKwc: 1100,
    maintenance: 1734.20,
    locationCompteur: 660,
    assurance: 867.10,
    taxesLocales: 0,
    gestionAdmin: 0,
    coutCentrale: 169951.60,
    coutCharpente: 171381.00,
    raccordement: 18300.00,
    frais: 3413.33,
    soulte: -9048.54,
    dureeEmprunt: 20,
    tauxCredit: 4,
    indexationTarif: 0.006,
    indexationOpex: 0.02,
    degradation: 0.004,
  });

  // Persistence: Load saved state or calculate defaults when project changes
  useEffect(() => {
    if (!selectedProject) return;

    // 1. Try to load saved state
    if (selectedProject.bpAcamaState) {
      setParams(selectedProject.bpAcamaState);
      return;
    }

    // 2. Otherwise calculate defaults
    const kwc = parseFloat(selectedProject.puissance) || 346.84;
    const prod = parseFloat(selectedProject.productible) || 1123.08;
    
    // Raccordement formula: 12450 + 19.5 * dist_hta
    const distHta = parseFloat(selectedProject.dist_hta) || 0;
    const raccordement = 12450 + (distHta * 19.5);

    // Centrale logic: 490€/kWc
    const coutCentrale = kwc * 490;

    // Charpente lookup
    const batType = SUIVI_BAT_DATA.find(b => b.type === selectedProject.type_bat) || SUIVI_BAT_DATA[SUIVI_BAT_DATA.length - 1];
    const coutCharpente = batType.cout_bat || 171381;

    // OPEX
    const maintenance = kwc * 5;
    const assurance = kwc * 2.5;
    const taxesLocales = kwc * 2.5;

    // Frais (roughly 1% of subtotal)
    const subtotal = coutCentrale + coutCharpente + raccordement;
    const frais = subtotal * 0.01;

    setParams(prev => ({
      ...prev,
      kwc,
      productible: prod,
      coutCentrale,
      coutCharpente,
      raccordement,
      maintenance,
      assurance,
      taxesLocales,
      frais,
      soulte: parseFloat(selectedProject.soulte) || 0
    }));
  }, [selectedProject]);

  const isAdmin = user?.role === 'admin';
  const isAlexandru = user?.email === 'a.mihailov@acama-energies.fr';

  // Access Control: Admins + Alexandru
  if (!isAdmin && !isAlexandru) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Accès refusé</h2>
          <p className="text-sm text-slate-500 mt-1">Nécessite des droits administrateur ou un accès spécifique.</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'calcul': return <TabCalcul projects={projects || []} />;
      case 'bp_projets': return (
        <TabBpProjets 
          projects={projects || []} 
          selectedProject={selectedProject} 
          setSelectedProject={setSelectedProject}
          params={params}
          setParams={setParams}
          computeBusinessPlan={computeBusinessPlan}
          computeResteACharge={computeResteACharge}
        />
      );
      case 'suivi': return <TabSuivi projects={projects || []} projectEdits={projectEdits} updateProjectEdit={updateProjectEdit} />;
      case 'suivi_bat': return <TabSuiviBatType batEdits={batEdits} updateBatEdit={updateBatEdit} />;
      case 'prop_bac': {
        const totalConstruction = params.coutCentrale + params.coutCharpente + params.raccordement + params.frais + params.soulte;
        const totalInvestissement = totalConstruction * 1.20;
        const resteACharge = computeResteACharge({ ...params, totalInvestissement }, 1.16);
        return <TabPropositionClientBAC projects={projects || []} selectedProject={selectedProject} setSelectedProject={setSelectedProject} params={params} resteACharge={resteACharge} />;
      }
      case 'prop_be': return <TabPropositionBE projects={projects || []} selectedProject={selectedProject} setSelectedProject={setSelectedProject} params={params} />;
      case 'data': return <TabData />;
      case 'devis': return <TabDevis projects={projects || []} selectedProject={selectedProject} setSelectedProject={setSelectedProject} params={params} setParams={setParams} />;
      default: return <TabPlaceholder label={TABS.find(t => t.id === activeTab)?.label || ''} />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-700">
          <h1 className="text-sm font-bold text-white">BP ACAMA</h1>
          <p className="text-[10px] text-slate-400">Business Plan ACAMA</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2 text-left text-xs transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-slate-700 text-[10px] text-slate-400">
          Interface ACAMA • {new Date().getFullYear()}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="border-b border-slate-200 bg-white px-4 py-2 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-sm font-bold text-slate-800">{TABS.find(t => t.id === activeTab)?.label}</h2>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
