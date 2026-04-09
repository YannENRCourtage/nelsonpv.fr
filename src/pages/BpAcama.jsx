// Re-trigger Vercel deployment 2
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import { apiService } from '@/services/api.js';
import { toast } from '@/components/ui/use-toast.js';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import {
  BarChart3, FileText, Calculator, TrendingUp, Users, Building,
  FileDown, Save, ChevronDown, Search, X, CheckCircle, AlertCircle,
  AlertTriangle, RefreshCw, Plus, Trash2, MapPin, ChevronUp, Download, Menu
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

import { generateBpAcamaPDF } from '../components/bp-acama/BpAcamaPDFGenerator.jsx';
import ProjectSelect from '../components/bp-acama/ProjectSelect.jsx';
import * as XLSX from 'xlsx';

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'bp_projets', label: 'BUSINESS PLAN PROJETS', icon: TrendingUp },
  { id: 'bp_saved', label: 'BP SAUVEGARDÉS', icon: Save },
  { id: 'suivi', label: 'SUIVI', icon: Users },
  { id: 'suivi_bat', label: 'SUIVI BAT TYPE', icon: Building },
  { id: 'calcul', label: 'CALCUL', icon: Calculator },
  { id: 'prop_bac', label: 'PROPOSITION CLIENT BAC', icon: FileText },
  { id: 'prop_be', label: 'PROPOSITION CLIENT BE', icon: FileText },
  { id: 'devis', label: 'DEVIS', icon: FileDown },
  { id: 'data', label: 'DATA', icon: BarChart3 },
];

const SUIVI_BAT_DATA_ACAMA = [
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

const normalizeBatType = (t) => {
  if (!t) return t;
  const s = t.trim().toUpperCase();
  
  // Dictionnaire explicite basé sur le tableau utilisateur
  const map = {
    'T1 MINI': 'TYPE 1 MINI', 'T1 MID': 'TYPE 1 MID', 'T1 MAXI': 'TYPE 1 MAXI',
    'T2 MINI': 'TYPE 2 MINI', 'T2 MID': 'TYPE 2 MID', 'T2 MAXI': 'TYPE 2 MAXI',
    'T3 MINI': 'TYPE 3 MINI', 'T3 MID': 'TYPE 3 MID', 'T3 MAXI': 'TYPE 3 MAXI',
    'T4 MINI': 'TYPE 4 MINI', 'T4 MID': 'TYPE 4 MID', 'T4 MAXI': 'TYPE 4 MAXI',
    'T5 MINI': 'TYPE 5 MINI', 'T5 MID': 'TYPE 5 MID', 'T5 MAXI': 'TYPE 5 MAXI',
    'T6 MINI': 'TYPE 6 MINI', 'T6 MID': 'TYPE 6 MID', 'T6 MAXI': 'TYPE 6 MAXI',
    'T7 MINI': 'TYPE 7 MINI', 'T7 MID': 'TYPE 7 MID', 'T7 MAXI': 'TYPE 7 MAXI',
    'T8 MINI': 'TYPE 8 MINI', 'T8 MID': 'TYPE 8 MID', 'T8 MAXI': 'TYPE 8 MAXI',
    'T9 MINI': 'TYPE 9 MINI', 'T9 MID': 'TYPE 9 MID', 'T9 MAXI': 'TYPE 9 MAXI',
    'EQUESTRE 64M': 'EQUESTRE 60m',
    'EQUESTRE 44M': 'EQUESTRE 44m'
  };

  if (map[s]) return map[s];

  const m = s.match(/^T(\d+)\s*(.*)$/);
  if (m) {
    const num = m[1];
    const suffix = m[2].trim();
    return `TYPE ${num}${suffix ? ' ' + suffix : ''}`;
  }
  return t;
};

const parseFirestoreDate = (dateVal) => {
  if (!dateVal) return null;
  // Firestore Timestamp class instance
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  // Serialized Firestore Timestamp object { seconds, nanoseconds }
  if (dateVal.seconds !== undefined) return new Date(dateVal.seconds * 1000);
  // ISO string, Date object, or timestamp number
  const d = new Date(dateVal);
  return (d instanceof Date && !isNaN(d.getTime())) ? d : null;
};

const BATTERY_MODELS = [
  { id: 'solax', brand: 'Solax', model: 'TRENE-P125B261L', power: 125, capacity: 261, price: 57583 },
  { id: 'huawei', brand: 'Huawei', model: 'LUNA2000-200KWH', power: 100, capacity: 200, price: 45000 },
  { id: 'goodwe', brand: 'GoodWe', model: 'Lynx C (Armoire)', power: 100, capacity: 156, price: 35000 },
  { id: 'byd', brand: 'BYD', model: 'Battery-Box C&I', power: 100, capacity: 215, price: 42000 },
  { id: 'sungrow', brand: 'Sungrow', model: 'PowerStack ST275', power: 125, capacity: 275, price: 55000 },
  { id: 'deye', brand: 'Deye', model: 'GE-F120', power: 120, capacity: 215, price: 43000 },
  { id: 'socomec', brand: 'Socomec', model: 'SUNSYS HES L', power: 250, capacity: 500, price: 130000 },
  { id: 'pylontech', brand: 'Pylontech', model: 'Optimus-280', power: 100, capacity: 280, price: 52000 },
  { id: 'cesc_mercury', brand: 'CESC', model: 'Mercury233 EU 05kW/233kWh', power: 105, capacity: 233, price: 30298.71 }
];

const SUIVI_BAT_DATA_GREEN_INVEST = [
  {type:"ORION 16 O1",spv:"GREEN INVEST",kwc:96,cout_bat:57288,longueur:30,largeur:16.4,travees:"4 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:492},
  {type:"ORION 16 O2",spv:"GREEN INVEST",kwc:126,cout_bat:68777,longueur:37.5,largeur:16.4,travees:"5 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:615},
  {type:"ORION 16 O3",spv:"GREEN INVEST",kwc:151,cout_bat:80452,longueur:45,largeur:16.4,travees:"6 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:738},
  {type:"ORION 16 O4",spv:"GREEN INVEST",kwc:175,cout_bat:92127,longueur:52.5,largeur:16.4,travees:"7 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:861},
  {type:"ORION 16 O5",spv:"GREEN INVEST",kwc:199,cout_bat:103630,longueur:60,largeur:16.4,travees:"8 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:984},
  {type:"ORION 16 O6",spv:"GREEN INVEST",kwc:229,cout_bat:115305,longueur:67.5,largeur:16.4,travees:"9 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:1107},
  {type:"ORION 16 O7",spv:"GREEN INVEST",kwc:253,cout_bat:127820,longueur:75,largeur:16.4,travees:"10 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:1230},
  {type:"ORION 16 O8",spv:"GREEN INVEST",kwc:278,cout_bat:139495,longueur:82.5,largeur:16.4,travees:"11 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:1353},
  {type:"ORION 16 O9",spv:"GREEN INVEST",kwc:302,cout_bat:150985,longueur:90,largeur:16.4,travees:"12 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:1476},
  {type:"ORION 16 O10",spv:"GREEN INVEST",kwc:323,cout_bat:162488,longueur:97.5,largeur:16.4,travees:"13 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:1599},
  {type:"ORION 16 O11",spv:"GREEN INVEST",kwc:356,cout_bat:176705,longueur:105,largeur:16.4,travees:"14 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:1722},
  {type:"ORION 16 O12",spv:"GREEN INVEST",kwc:380,cout_bat:188380,longueur:112.5,largeur:16.4,travees:"15 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:1845},
  {type:"ORION 16 O13",spv:"GREEN INVEST",kwc:405,cout_bat:200055,longueur:120,largeur:16.4,travees:"16 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.42m",surfTot:1968},
  {type:"ORION 20 O14",spv:"GREEN INVEST",kwc:120,cout_bat:69598,longueur:30,largeur:20,travees:"4 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:600},
  {type:"ORION 20 O15",spv:"GREEN INVEST",kwc:156,cout_bat:83948,longueur:37.5,largeur:20,travees:"5 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:750},
  {type:"ORION 20 O16",spv:"GREEN INVEST",kwc:186,cout_bat:98469,longueur:45,largeur:20,travees:"6 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:900},
  {type:"ORION 20 O17",spv:"GREEN INVEST",kwc:215,cout_bat:113659,longueur:52.5,largeur:20,travees:"7 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:1050},
  {type:"ORION 20 O18",spv:"GREEN INVEST",kwc:245,cout_bat:128366,longueur:60,largeur:20,travees:"8 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:1200},
  {type:"ORION 20 O19",spv:"GREEN INVEST",kwc:282,cout_bat:142888,longueur:67.5,largeur:20,travees:"9 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:1350},
  {type:"ORION 20 O20",spv:"GREEN INVEST",kwc:312,cout_bat:157238,longueur:75,largeur:20,travees:"10 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:1500},
  {type:"ORION 20 O21",spv:"GREEN INVEST",kwc:342,cout_bat:171759,longueur:82.5,largeur:20,travees:"11 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:1650},
  {type:"ORION 20 O22",spv:"GREEN INVEST",kwc:372,cout_bat:186109,longueur:90,largeur:20,travees:"12 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:1800},
  {type:"ORION 20 O23",spv:"GREEN INVEST",kwc:409,cout_bat:200816,longueur:97.5,largeur:20,travees:"13 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:1950},
  {type:"ORION 20 O24",spv:"GREEN INVEST",kwc:438,cout_bat:217969,longueur:105,largeur:20,travees:"14 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:2100},
  {type:"ORION 20 O25",spv:"GREEN INVEST",kwc:468,cout_bat:233159,longueur:112.5,largeur:20,travees:"15 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:2250},
  {type:"ORION 20 O26",spv:"GREEN INVEST",kwc:498,cout_bat:247680,longueur:120,largeur:20,travees:"16 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.4m",surfTot:2400},
  {type:"CYRUS 25 C1",spv:"GREEN INVEST",kwc:169,cout_bat:80756,longueur:30,largeur:25.5,travees:"4 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.9m",surfTot:765},
  {type:"CYRUS 25 C2",spv:"GREEN INVEST",kwc:214,cout_bat:97152,longueur:37.5,largeur:25.5,travees:"5 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.9m",surfTot:956},
  {type:"CYRUS 25 C3",spv:"GREEN INVEST",kwc:255,cout_bat:113905,longueur:45,largeur:25.5,travees:"6 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.9m",surfTot:1147},
  {type:"CYRUS 25 C4",spv:"GREEN INVEST",kwc:296,cout_bat:130657,longueur:52.5,largeur:25.5,travees:"7 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.9m",surfTot:1339},
  {type:"CYRUS 25 C5",spv:"GREEN INVEST",kwc:338,cout_bat:148250,longueur:60,largeur:25.5,travees:"8 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.9m",surfTot:1530},
  {type:"CYRUS 25 C6",spv:"GREEN INVEST",kwc:388,cout_bat:165002,longueur:67.5,largeur:25.5,travees:"9 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.9m",surfTot:1721},
  {type:"CYRUS 25 C7",spv:"GREEN INVEST",kwc:429,cout_bat:181583,longueur:75,largeur:25.5,travees:"10 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.9m",surfTot:1912},
  {type:"CYRUS 25 C8",spv:"GREEN INVEST",kwc:470,cout_bat:198336,longueur:82.5,largeur:25.5,travees:"11 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.9m",surfTot:2104},
  {type:"CYRUS 25 C9",spv:"GREEN INVEST",kwc:511,cout_bat:215088,longueur:90,largeur:25.5,travees:"12 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.9m",surfTot:2295},
  {type:"CYRUS 29 C10",spv:"GREEN INVEST",kwc:193,cout_bat:92159,longueur:30,largeur:29,travees:"4 x 7.5m",hSud:"4m",hNord:"4m",faitage:"9.8m",surfTot:870},
  {type:"CYRUS 29 C11",spv:"GREEN INVEST",kwc:244,cout_bat:111617,longueur:37.5,largeur:29,travees:"5 x 7.5m",hSud:"4m",hNord:"4m",faitage:"9.8m",surfTot:1087},
  {type:"CYRUS 29 C12",spv:"GREEN INVEST",kwc:290,cout_bat:132086,longueur:45,largeur:29,travees:"6 x 7.5m",hSud:"4m",hNord:"4m",faitage:"9.8m",surfTot:1305},
  {type:"CYRUS 29 C13",spv:"GREEN INVEST",kwc:337,cout_bat:151901,longueur:52.5,largeur:29,travees:"7 x 7.5m",hSud:"4m",hNord:"4m",faitage:"9.8m",surfTot:1522},
  {type:"CYRUS 29 C14",spv:"GREEN INVEST",kwc:386,cout_bat:171359,longueur:60,largeur:29,travees:"8 x 7.5m",hSud:"4m",hNord:"4m",faitage:"9.8m",surfTot:1740},
  {type:"CYRUS 29 C15",spv:"GREEN INVEST",kwc:441,cout_bat:190988,longueur:67.5,largeur:29,travees:"9 x 7.5m",hSud:"4m",hNord:"4m",faitage:"9.8m",surfTot:1957},
  {type:"CYRUS 29 C16",spv:"GREEN INVEST",kwc:488,cout_bat:210803,longueur:75,largeur:29,travees:"10 x 7.5m",hSud:"4m",hNord:"4m",faitage:"9.8m",surfTot:2175},
  {type:"KEREN 24 K1",spv:"GREEN INVEST",kwc:157,cout_bat:79955,longueur:30,largeur:24.3,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.8m",surfTot:729},
  {type:"KEREN 24 K2",spv:"GREEN INVEST",kwc:195,cout_bat:96398,longueur:37.5,largeur:24.3,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.8m",surfTot:911},
  {type:"KEREN 24 K3",spv:"GREEN INVEST",kwc:235,cout_bat:112826,longueur:45,largeur:24.3,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.8m",surfTot:1094},
  {type:"KEREN 24 K4",spv:"GREEN INVEST",kwc:272,cout_bat:129269,longueur:52.5,largeur:24.3,travees:"7 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.8m",surfTot:1276},
  {type:"KEREN 24 K5",spv:"GREEN INVEST",kwc:314,cout_bat:146366,longueur:60,largeur:24.3,travees:"8 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.8m",surfTot:1458},
  {type:"KEREN 24 K6",spv:"GREEN INVEST",kwc:356,cout_bat:162980,longueur:67.5,largeur:24.3,travees:"9 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.8m",surfTot:1640},
  {type:"KEREN 24 K7",spv:"GREEN INVEST",kwc:392,cout_bat:179237,longueur:75,largeur:24.3,travees:"10 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.8m",surfTot:1823},
  {type:"KEREN 24 K8",spv:"GREEN INVEST",kwc:435,cout_bat:195851,longueur:82.5,largeur:24.3,travees:"11 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.8m",surfTot:2005},
  {type:"KEREN 24 K9",spv:"GREEN INVEST",kwc:471,cout_bat:212108,longueur:90,largeur:24.3,travees:"12 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.8m",surfTot:2187},
  {type:"KEREN 28 K10",spv:"GREEN INVEST",kwc:181,cout_bat:89261,longueur:30,largeur:28,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:840},
  {type:"KEREN 28 K11",spv:"GREEN INVEST",kwc:224,cout_bat:108539,longueur:37.5,largeur:28,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:1050},
  {type:"KEREN 28 K12",spv:"GREEN INVEST",kwc:272,cout_bat:128657,longueur:45,largeur:28,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:1260},
  {type:"KEREN 28 K13",spv:"GREEN INVEST",kwc:313,cout_bat:148107,longueur:52.5,largeur:28,travees:"7 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:1470},
  {type:"KEREN 28 K14",spv:"GREEN INVEST",kwc:362,cout_bat:167385,longueur:60,largeur:28,travees:"8 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:1680},
  {type:"KEREN 28 K15",spv:"GREEN INVEST",kwc:411,cout_bat:186633,longueur:67.5,largeur:28,travees:"9 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:1890},
  {type:"KEREN 28 K16",spv:"GREEN INVEST",kwc:453,cout_bat:205942,longueur:75,largeur:28,travees:"10 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:2100},
  {type:"KEREN 28 K17",spv:"GREEN INVEST",kwc:502,cout_bat:225391,longueur:82.5,largeur:28,travees:"11 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:2310},
  {type:"KEREN 32 K18",spv:"GREEN INVEST",kwc:205,cout_bat:98816,longueur:30,largeur:32,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:960},
  {type:"KEREN 32 K19",spv:"GREEN INVEST",kwc:253,cout_bat:119521,longueur:37.5,largeur:32,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:1200},
  {type:"KEREN 32 K20",spv:"GREEN INVEST",kwc:308,cout_bat:141201,longueur:45,largeur:32,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:1440},
  {type:"KEREN 32 K21",spv:"GREEN INVEST",kwc:355,cout_bat:161856,longueur:52.5,largeur:32,travees:"7 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:1680},
  {type:"KEREN 32 K22",spv:"GREEN INVEST",kwc:411,cout_bat:182696,longueur:60,largeur:32,travees:"8 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:1920},
  {type:"KEREN 32 K23",spv:"GREEN INVEST",kwc:466,cout_bat:203708,longueur:67.5,largeur:32,travees:"9 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:2160},
  {type:"KEREN 32 K24",spv:"GREEN INVEST",kwc:513,cout_bat:224363,longueur:75,largeur:32,travees:"10 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:2400},
  {type:"KEREN 35 K25",spv:"GREEN INVEST",kwc:229,cout_bat:112591,longueur:30,largeur:35,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.8m",surfTot:1050},
  {type:"KEREN 35 K26",spv:"GREEN INVEST",kwc:292,cout_bat:137009,longueur:37.5,largeur:35,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.8m",surfTot:1312},
  {type:"KEREN 35 K27",spv:"GREEN INVEST",kwc:348,cout_bat:160944,longueur:45,largeur:35,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.8m",surfTot:1575},
  {type:"KEREN 35 K28",spv:"GREEN INVEST",kwc:404,cout_bat:184879,longueur:52.5,largeur:35,travees:"7 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.8m",surfTot:1837},
  {type:"KEREN 35 K29",spv:"GREEN INVEST",kwc:460,cout_bat:208814,longueur:60,largeur:35,travees:"8 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.8m",surfTot:2100},
  {type:"KEREN 39 K30",spv:"GREEN INVEST",kwc:253,cout_bat:128832,longueur:30,largeur:39,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.1m",surfTot:1170},
  {type:"KEREN 39 K31",spv:"GREEN INVEST",kwc:322,cout_bat:156388,longueur:37.5,largeur:39,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.1m",surfTot:1462},
  {type:"KEREN 39 K32",spv:"GREEN INVEST",kwc:383,cout_bat:183586,longueur:45,largeur:39,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.1m",surfTot:1755},
  {type:"KEREN 39 K33",spv:"GREEN INVEST",kwc:445,cout_bat:210956,longueur:52.5,largeur:39,travees:"7 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.1m",surfTot:2047},
  {type:"KEREN 39 K34",spv:"GREEN INVEST",kwc:507,cout_bat:239351,longueur:60,largeur:39,travees:"8 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.1m",surfTot:2340},
  {type:"KEREN 43 K35",spv:"GREEN INVEST",kwc:278,cout_bat:145992,longueur:30,largeur:43,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.5m",surfTot:1290},
  {type:"KEREN 43 K36",spv:"GREEN INVEST",kwc:351,cout_bat:178101,longueur:37.5,largeur:43,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.5m",surfTot:1612},
  {type:"KEREN 43 K37",spv:"GREEN INVEST",kwc:418,cout_bat:210040,longueur:45,largeur:43,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.5m",surfTot:1935},
  {type:"KEREN 43 K38",spv:"GREEN INVEST",kwc:485,cout_bat:243175,longueur:52.5,largeur:43,travees:"7 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.5m",surfTot:2257},
  {type:"ATLAS 12 A1N",spv:"GREEN INVEST",kwc:96,cout_bat:57482,longueur:30,largeur:"12,7 + 4",travees:"4 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:501},
  {type:"ATLAS 12 A1SN",spv:"GREEN INVEST",kwc:120,cout_bat:63651,longueur:30,largeur:"12,7 + 8",travees:"4 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:621},
  {type:"ATLAS 12 A2N",spv:"GREEN INVEST",kwc:126,cout_bat:69282,longueur:37.5,largeur:"12,7 + 4",travees:"5 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:626},
  {type:"ATLAS 12 A2SN",spv:"GREEN INVEST",kwc:156,cout_bat:77068,longueur:37.5,largeur:"12,7 + 8",travees:"5 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:776},
  {type:"ATLAS 12 A3N",spv:"GREEN INVEST",kwc:151,cout_bat:81253,longueur:45,largeur:"12,7 + 4",travees:"6 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:751},
  {type:"ATLAS 12 A3SN",spv:"GREEN INVEST",kwc:186,cout_bat:90657,longueur:45,largeur:"12,7 + 8",travees:"6 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:931},
  {type:"ATLAS 12 A4N",spv:"GREEN INVEST",kwc:175,cout_bat:93225,longueur:52.5,largeur:"12,7 + 4",travees:"7 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:877},
  {type:"ATLAS 12 A4SN",spv:"GREEN INVEST",kwc:215,cout_bat:104061,longueur:52.5,largeur:"12,7 + 8",travees:"7 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:1087},
  {type:"ATLAS 12 A5N",spv:"GREEN INVEST",kwc:199,cout_bat:105196,longueur:60,largeur:"12,7 + 4",travees:"8 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:1002},
  {type:"ATLAS 12 A5SN",spv:"GREEN INVEST",kwc:245,cout_bat:117478,longueur:60,largeur:"12,7 + 8",travees:"8 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:1242},
  {type:"ATLAS 12 A6N",spv:"GREEN INVEST",kwc:229,cout_bat:116996,longueur:67.5,largeur:"12,7 + 4",travees:"9 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:1127},
  {type:"ATLAS 12 A6SN",spv:"GREEN INVEST",kwc:282,cout_bat:131907,longueur:67.5,largeur:"12,7 + 8",travees:"9 x 7.5m",hSud:"4m",hNord:"4m",faitage:"7.41m",surfTot:1397},
  {type:"ATLAS 16 A10N",spv:"GREEN INVEST",kwc:96,cout_bat:57482,longueur:30,largeur:"16,4 + 4",travees:"4 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:612},
  {type:"ATLAS 16 A10SN",spv:"GREEN INVEST",kwc:117,cout_bat:69597,longueur:30,largeur:"16,4 + 8",travees:"4 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:732},
  {type:"ATLAS 16 A11N",spv:"GREEN INVEST",kwc:151,cout_bat:84246,longueur:37.5,largeur:"16,4 + 4",travees:"5 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:765},
  {type:"ATLAS 16 A11SN",spv:"GREEN INVEST",kwc:179,cout_bat:92032,longueur:37.5,largeur:"16,4 + 8",travees:"5 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:915},
  {type:"ATLAS 16 A12N",spv:"GREEN INVEST",kwc:180,cout_bat:98724,longueur:45,largeur:"16,4 + 4",travees:"6 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:918},
  {type:"ATLAS 16 A12SN",spv:"GREEN INVEST",kwc:213,cout_bat:108128,longueur:45,largeur:"16,4 + 8",travees:"6 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:1098},
  {type:"ATLAS 16 A13N",spv:"GREEN INVEST",kwc:208,cout_bat:113374,longueur:52.5,largeur:"16,4 + 4",travees:"7 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:1071},
  {type:"ATLAS 16 A13SN",spv:"GREEN INVEST",kwc:247,cout_bat:127064,longueur:52.5,largeur:"16,4 + 8",travees:"7 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:1281},
  {type:"ATLAS 16 A14N",spv:"GREEN INVEST",kwc:237,cout_bat:128692,longueur:60,largeur:"16,4 + 4",travees:"8 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:1224},
  {type:"ATLAS 16 A14SN",spv:"GREEN INVEST",kwc:282,cout_bat:141331,longueur:60,largeur:"16,4 + 8",travees:"8 x 7.5m",hSud:"4m",hNord:"4m",faitage:"8.39m",surfTot:1464},
  {type:"HELIOS 15 H1",spv:"GREEN INVEST",kwc:96,cout_bat:55086,longueur:30,largeur:15,travees:"4 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"6.82m",surfTot:450},
  {type:"HELIOS 15 H2",spv:"GREEN INVEST",kwc:119,cout_bat:65962,longueur:37.5,largeur:15,travees:"5 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"6.82m",surfTot:562},
  {type:"HELIOS 15 H3",spv:"GREEN INVEST",kwc:145,cout_bat:76838,longueur:45,largeur:15,travees:"6 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"6.82m",surfTot:675},
  {type:"HELIOS 15 H4",spv:"GREEN INVEST",kwc:167,cout_bat:87885,longueur:52.5,largeur:15,travees:"7 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"6.82m",surfTot:787.5},
  {type:"HELIOS 15 H5",spv:"GREEN INVEST",kwc:193,cout_bat:98761,longueur:60,largeur:15,travees:"8 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"6.82m",surfTot:900},
  {type:"HELIOS 15 H6",spv:"GREEN INVEST",kwc:219,cout_bat:109994,longueur:67.5,largeur:15,travees:"9 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1012},
  {type:"HELIOS 15 H7",spv:"GREEN INVEST",kwc:241,cout_bat:120870,longueur:75,largeur:15,travees:"10 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1125},
  {type:"HELIOS 15 H8",spv:"GREEN INVEST",kwc:267,cout_bat:131747,longueur:82.5,largeur:15,travees:"11 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1237},
  {type:"HELIOS 15 H9",spv:"GREEN INVEST",kwc:290,cout_bat:143634,longueur:90,largeur:15,travees:"12 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1350},
  {type:"HELIOS 15 H10",spv:"GREEN INVEST",kwc:316,cout_bat:154510,longueur:97.5,largeur:15,travees:"13 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1462},
  {type:"HELIOS 15 H11",spv:"GREEN INVEST",kwc:338,cout_bat:167731,longueur:105,largeur:15,travees:"14 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1575},
  {type:"HELIOS 15 H12",spv:"GREEN INVEST",kwc:364,cout_bat:178608,longueur:112.5,largeur:15,travees:"15 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1687},
  {type:"HELIOS 15 H13",spv:"GREEN INVEST",kwc:386,cout_bat:189655,longueur:120,largeur:15,travees:"16 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1800},
  {type:"HELIOS 18 H14",spv:"GREEN INVEST",kwc:120,cout_bat:64229,longueur:30,largeur:18.6,travees:"4 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:558},
  {type:"HELIOS 18 H15",spv:"GREEN INVEST",kwc:148,cout_bat:78093,longueur:37.5,largeur:18.6,travees:"5 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:697},
  {type:"HELIOS 18 H16",spv:"GREEN INVEST",kwc:181,cout_bat:91771,longueur:45,largeur:18.6,travees:"6 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:837},
  {type:"HELIOS 18 H17",spv:"GREEN INVEST",kwc:209,cout_bat:105806,longueur:52.5,largeur:18.6,travees:"7 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:976},
  {type:"HELIOS 18 H18",spv:"GREEN INVEST",kwc:241,cout_bat:120325,longueur:60,largeur:18.6,travees:"8 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1116},
  {type:"HELIOS 18 H19",spv:"GREEN INVEST",kwc:274,cout_bat:134188,longueur:67.5,largeur:18.6,travees:"9 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1255},
  {type:"HELIOS 18 H20",spv:"GREEN INVEST",kwc:302,cout_bat:147867,longueur:75,largeur:18.6,travees:"10 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1395},
  {type:"HELIOS 18 H21",spv:"GREEN INVEST",kwc:334,cout_bat:161730,longueur:82.5,largeur:18.6,travees:"11 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1534},
  {type:"HELIOS 18 H22",spv:"GREEN INVEST",kwc:362,cout_bat:175765,longueur:90,largeur:18.6,travees:"12 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1674},
  {type:"HELIOS 18 H23",spv:"GREEN INVEST",kwc:395,cout_bat:189444,longueur:97.5,largeur:18.6,travees:"13 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1813},
  {type:"HELIOS 18 H24",spv:"GREEN INVEST",kwc:423,cout_bat:205799,longueur:105,largeur:18.6,travees:"14 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:1953},
  {type:"HELIOS 18 H25",spv:"GREEN INVEST",kwc:455,cout_bat:219478,longueur:112.5,largeur:18.6,travees:"15 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:2092},
  {type:"HELIOS 18 H26",spv:"GREEN INVEST",kwc:483,cout_bat:234353,longueur:120,largeur:18.6,travees:"16 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.14m",surfTot:2232},
  {type:"HELIOS 22 H27",spv:"GREEN INVEST",kwc:145,cout_bat:73649,longueur:30,largeur:22.35,travees:"4 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:670},
  {type:"HELIOS 22 H28",spv:"GREEN INVEST",kwc:178,cout_bat:88889,longueur:37.5,largeur:22.35,travees:"5 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:838},
  {type:"HELIOS 22 H29",spv:"GREEN INVEST",kwc:217,cout_bat:104130,longueur:45,largeur:22.35,travees:"6 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:1006},
  {type:"HELIOS 22 H30",spv:"GREEN INVEST",kwc:251,cout_bat:120395,longueur:52.5,largeur:22.35,travees:"7 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:1173},
  {type:"HELIOS 22 H31",spv:"GREEN INVEST",kwc:290,cout_bat:135636,longueur:60,largeur:22.35,travees:"8 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:1341},
  {type:"HELIOS 22 H32",spv:"GREEN INVEST",kwc:329,cout_bat:150876,longueur:67.5,largeur:22.35,travees:"9 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:1509},
  {type:"HELIOS 22 H33",spv:"GREEN INVEST",kwc:362,cout_bat:166302,longueur:75,largeur:22.35,travees:"10 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:1667},
  {type:"HELIOS 22 H34",spv:"GREEN INVEST",kwc:401,cout_bat:181542,longueur:82.5,largeur:22.35,travees:"11 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:1844},
  {type:"HELIOS 22 H35",spv:"GREEN INVEST",kwc:435,cout_bat:196782,longueur:90,largeur:22.35,travees:"12 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:2011},
  {type:"HELIOS 22 H36",spv:"GREEN INVEST",kwc:474,cout_bat:212208,longueur:97.5,largeur:22.35,travees:"13 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:2179},
  {type:"HELIOS 22 H37",spv:"GREEN INVEST",kwc:507,cout_bat:231049,longueur:105,largeur:22.35,travees:"14 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.47m",surfTot:2346},
  {type:"HELIOS 26 H38",spv:"GREEN INVEST",kwc:169,cout_bat:86673,longueur:30,largeur:26.05,travees:"4 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.80m",surfTot:781},
  {type:"HELIOS 26 H39",spv:"GREEN INVEST",kwc:214,cout_bat:104883,longueur:37.5,largeur:26.05,travees:"5 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.80m",surfTot:977},
  {type:"HELIOS 26 H40",spv:"GREEN INVEST",kwc:255,cout_bat:123918,longueur:45,largeur:26.05,travees:"6 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.80m",surfTot:1172},
  {type:"HELIOS 26 H41",spv:"GREEN INVEST",kwc:296,cout_bat:142113,longueur:52.5,largeur:26.05,travees:"7 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.80m",surfTot:1368},
  {type:"HELIOS 26 H42",spv:"GREEN INVEST",kwc:338,cout_bat:160494,longueur:60,largeur:26.05,travees:"8 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.80m",surfTot:1563},
  {type:"HELIOS 26 H43",spv:"GREEN INVEST",kwc:388,cout_bat:178689,longueur:67.5,largeur:26.05,travees:"9 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.80m",surfTot:1758},
  {type:"HELIOS 26 H44",spv:"GREEN INVEST",kwc:429,cout_bat:197069,longueur:75,largeur:26.05,travees:"10 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.80m",surfTot:1954},
  {type:"HELIOS 26 H45",spv:"GREEN INVEST",kwc:470,cout_bat:215093,longueur:82.5,largeur:26.05,travees:"11 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.80m",surfTot:2149},
  {type:"HELIOS 26 H46",spv:"GREEN INVEST",kwc:511,cout_bat:234314,longueur:90,largeur:26.05,travees:"12 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"7.80m",surfTot:2345},
  {type:"HELIOS 29 H47",spv:"GREEN INVEST",kwc:193,cout_bat:101561,longueur:30,largeur:29.75,travees:"4 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.12m",surfTot:892},
  {type:"HELIOS 29 H48",spv:"GREEN INVEST",kwc:238,cout_bat:124076,longueur:37.5,largeur:29.75,travees:"5 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.12m",surfTot:1116},
  {type:"HELIOS 29 H49",spv:"GREEN INVEST",kwc:290,cout_bat:145580,longueur:45,largeur:29.75,travees:"6 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.12m",surfTot:1339},
  {type:"HELIOS 29 H50",spv:"GREEN INVEST",kwc:334,cout_bat:167255,longueur:52.5,largeur:29.75,travees:"7 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.12m",surfTot:1562},
  {type:"HELIOS 29 H51",spv:"GREEN INVEST",kwc:386,cout_bat:188759,longueur:60,largeur:29.75,travees:"8 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.12m",surfTot:1785},
  {type:"HELIOS 29 H52",spv:"GREEN INVEST",kwc:438,cout_bat:211275,longueur:67.5,largeur:29.75,travees:"9 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.12m",surfTot:2008},
  {type:"HELIOS 29 H53",spv:"GREEN INVEST",kwc:483,cout_bat:232950,longueur:75,largeur:29.75,travees:"10 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.12m",surfTot:2231},
  {type:"HELIOS 29 H54",spv:"GREEN INVEST",kwc:535,cout_bat:254454,longueur:82.5,largeur:29.75,travees:"11 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.12m",surfTot:2454},
  {type:"HELIOS 33 H55",spv:"GREEN INVEST",kwc:217,cout_bat:118675,longueur:30,largeur:33.46,travees:"4 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.45m",surfTot:1004},
  {type:"HELIOS 33 H56",spv:"GREEN INVEST",kwc:273,cout_bat:144950,longueur:37.5,largeur:33.46,travees:"5 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.45m",surfTot:1255},
  {type:"HELIOS 33 H57",spv:"GREEN INVEST",kwc:326,cout_bat:171053,longueur:45,largeur:33.46,travees:"6 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.45m",surfTot:1506},
  {type:"HELIOS 33 H58",spv:"GREEN INVEST",kwc:377,cout_bat:197329,longueur:52.5,largeur:33.46,travees:"7 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.45m",surfTot:1757},
  {type:"HELIOS 33 H59",spv:"GREEN INVEST",kwc:435,cout_bat:224273,longueur:60,largeur:33.46,travees:"8 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.45m",surfTot:2008},
  {type:"HELIOS 33 H60",spv:"GREEN INVEST",kwc:494,cout_bat:250376,longueur:67.5,largeur:33.46,travees:"9 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.45m",surfTot:2259},
  {type:"HELIOS 33 H61",spv:"GREEN INVEST",kwc:546,cout_bat:276651,longueur:75,largeur:33.46,travees:"10 x 7.5m",hSud:"5.5m",hNord:"5.5m",faitage:"8.45m",surfTot:2510},
  {type:"YOKO 33 Y1",spv:"GREEN INVEST",kwc:217,cout_bat:105010,longueur:30,largeur:33.6,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.82m",surfTot:1008},
  {type:"YOKO 33 Y2",spv:"GREEN INVEST",kwc:273,cout_bat:126833,longueur:37.5,largeur:33.6,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.82m",surfTot:1260},
  {type:"YOKO 33 Y3",spv:"GREEN INVEST",kwc:326,cout_bat:149483,longueur:45,largeur:33.6,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.82m",surfTot:1512},
  {type:"YOKO 33 Y4",spv:"GREEN INVEST",kwc:377,cout_bat:171307,longueur:52.5,largeur:33.6,travees:"7 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.82m",surfTot:1764},
  {type:"YOKO 33 Y5",spv:"GREEN INVEST",kwc:435,cout_bat:193130,longueur:60,largeur:33.6,travees:"8 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.82m",surfTot:2016},
  {type:"YOKO 33 Y6",spv:"GREEN INVEST",kwc:494,cout_bat:215125,longueur:67.5,largeur:33.6,travees:"9 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"6.82m",surfTot:2268},
  {type:"YOKO 37 Y7",spv:"GREEN INVEST",kwc:241,cout_bat:114478,longueur:30,largeur:37.2,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:1116},
  {type:"YOKO 37 Y8",spv:"GREEN INVEST",kwc:312,cout_bat:140011,longueur:37.5,largeur:37.2,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:1395},
  {type:"YOKO 37 Y9",spv:"GREEN INVEST",kwc:372,cout_bat:165060,longueur:45,largeur:37.2,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:1674},
  {type:"YOKO 37 Y10",spv:"GREEN INVEST",kwc:431,cout_bat:189753,longueur:52.5,largeur:37.2,travees:"7 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:1953},
  {type:"YOKO 37 Y11",spv:"GREEN INVEST",kwc:491,cout_bat:214446,longueur:60,largeur:37.2,travees:"8 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.1m",surfTot:2232},
  {type:"YOKO 41 Y12",spv:"GREEN INVEST",kwc:265,cout_bat:128898,longueur:30,largeur:41,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:1230},
  {type:"YOKO 41 Y13",spv:"GREEN INVEST",kwc:332,cout_bat:150993,longueur:37.5,largeur:41,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:1537},
  {type:"YOKO 41 Y14",spv:"GREEN INVEST",kwc:398,cout_bat:177248,longueur:45,largeur:41,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:1845},
  {type:"YOKO 41 Y15",spv:"GREEN INVEST",kwc:460,cout_bat:203673,longueur:52.5,largeur:41,travees:"7 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.5m",surfTot:2152},
  {type:"YOKO 45 Y16",spv:"GREEN INVEST",kwc:290,cout_bat:139163,longueur:30,largeur:45,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.8m",surfTot:1350},
  {type:"YOKO 45 Y17",spv:"GREEN INVEST",kwc:371,cout_bat:168652,longueur:37.5,largeur:45,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.8m",surfTot:1687},
  {type:"YOKO 45 Y18",spv:"GREEN INVEST",kwc:441,cout_bat:197270,longueur:45,largeur:45,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"7.8m",surfTot:2025},
  {type:"YOKO 48 Y19",spv:"GREEN INVEST",kwc:314,cout_bat:155449,longueur:30,largeur:48,travees:"4 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.1m",surfTot:1440},
  {type:"YOKO 48 Y20",spv:"GREEN INVEST",kwc:410,cout_bat:188698,longueur:37.5,largeur:48,travees:"5 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.1m",surfTot:1800},
  {type:"YOKO 48 Y21",spv:"GREEN INVEST",kwc:488,cout_bat:221592,longueur:45,largeur:48,travees:"6 x 7.5m",hSud:"3.9m",hNord:"3.9m",faitage:"8.1m",surfTot:2160},
  {type:"SOLEA 21 S1",spv:"GREEN INVEST",kwc:145,cout_bat:67327,longueur:30,largeur:23,travees:"4 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:690},
  {type:"SOLEA 21 S2",spv:"GREEN INVEST",kwc:178,cout_bat:81415,longueur:37.5,largeur:23,travees:"5 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:862},
  {type:"SOLEA 21 S3",spv:"GREEN INVEST",kwc:217,cout_bat:95503,longueur:45,largeur:23,travees:"6 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:1035},
  {type:"SOLEA 21 S4",spv:"GREEN INVEST",kwc:251,cout_bat:109591,longueur:52.5,largeur:23,travees:"7 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:1207},
  {type:"SOLEA 21 S5",spv:"GREEN INVEST",kwc:290,cout_bat:123494,longueur:60,largeur:23,travees:"8 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:1380},
  {type:"SOLEA 21 S6",spv:"GREEN INVEST",kwc:329,cout_bat:138422,longueur:67.5,largeur:23,travees:"9 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:1552},
  {type:"SOLEA 21 S7",spv:"GREEN INVEST",kwc:362,cout_bat:152510,longueur:75,largeur:23,travees:"10 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:1725},
  {type:"SOLEA 21 S8",spv:"GREEN INVEST",kwc:401,cout_bat:166598,longueur:82.5,largeur:23,travees:"11 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:1897},
  {type:"SOLEA 21 S9",spv:"GREEN INVEST",kwc:435,cout_bat:180500,longueur:90,largeur:23,travees:"12 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:2070},
  {type:"SOLEA 21 S10",spv:"GREEN INVEST",kwc:474,cout_bat:194588,longueur:97.5,largeur:23,travees:"13 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"6.82m",surfTot:2242},
  {type:"SOLEA 26 S11",spv:"GREEN INVEST",kwc:169,cout_bat:76752,longueur:30,largeur:26.6,travees:"4 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.1m",surfTot:798},
  {type:"SOLEA 26 S12",spv:"GREEN INVEST",kwc:214,cout_bat:93665,longueur:37.5,largeur:26.6,travees:"5 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.1m",surfTot:997},
  {type:"SOLEA 26 S13",spv:"GREEN INVEST",kwc:255,cout_bat:110579,longueur:45,largeur:26.6,travees:"6 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.1m",surfTot:1197},
  {type:"SOLEA 26 S14",spv:"GREEN INVEST",kwc:296,cout_bat:128332,longueur:52.5,largeur:26.6,travees:"7 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.1m",surfTot:1396},
  {type:"SOLEA 26 S15",spv:"GREEN INVEST",kwc:338,cout_bat:145246,longueur:60,largeur:26.6,travees:"8 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.1m",surfTot:1596},
  {type:"SOLEA 26 S16",spv:"GREEN INVEST",kwc:388,cout_bat:162345,longueur:67.5,largeur:26.6,travees:"9 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.1m",surfTot:1795},
  {type:"SOLEA 26 S17",spv:"GREEN INVEST",kwc:429,cout_bat:179087,longueur:75,largeur:26.6,travees:"10 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.1m",surfTot:1995},
  {type:"SOLEA 26 S18",spv:"GREEN INVEST",kwc:470,cout_bat:196001,longueur:82.5,largeur:26.6,travees:"11 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.1m",surfTot:2194},
  {type:"SOLEA 30 S19",spv:"GREEN INVEST",kwc:193,cout_bat:86158,longueur:30,largeur:30.3,travees:"4 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.5m",surfTot:909},
  {type:"SOLEA 30 S20",spv:"GREEN INVEST",kwc:238,cout_bat:104462,longueur:37.5,largeur:30.3,travees:"5 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.5m",surfTot:1136},
  {type:"SOLEA 30 S21",spv:"GREEN INVEST",kwc:290,cout_bat:123777,longueur:45,largeur:30.3,travees:"6 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.5m",surfTot:1363},
  {type:"SOLEA 30 S22",spv:"GREEN INVEST",kwc:334,cout_bat:142253,longueur:52.5,largeur:30.3,travees:"7 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.5m",surfTot:1590},
  {type:"SOLEA 30 S23",spv:"GREEN INVEST",kwc:386,cout_bat:160557,longueur:60,largeur:30.3,travees:"8 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.5m",surfTot:1818},
  {type:"SOLEA 30 S24",spv:"GREEN INVEST",kwc:438,cout_bat:179032,longueur:67.5,largeur:30.3,travees:"9 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.5m",surfTot:2045},
  {type:"SOLEA 30 S25",spv:"GREEN INVEST",kwc:483,cout_bat:197508,longueur:75,largeur:30.3,travees:"10 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.5m",surfTot:2272},
  {type:"SOLEA 34 S26",spv:"GREEN INVEST",kwc:217,cout_bat:99196,longueur:30,largeur:34,travees:"4 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.8m",surfTot:1020},
  {type:"SOLEA 34 S27",spv:"GREEN INVEST",kwc:273,cout_bat:121295,longueur:37.5,largeur:34,travees:"5 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.8m",surfTot:1275},
  {type:"SOLEA 34 S28",spv:"GREEN INVEST",kwc:326,cout_bat:142726,longueur:45,largeur:34,travees:"6 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.8m",surfTot:1530},
  {type:"SOLEA 34 S29",spv:"GREEN INVEST",kwc:377,cout_bat:163985,longueur:52.5,largeur:34,travees:"7 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.8m",surfTot:1785},
  {type:"SOLEA 34 S30",spv:"GREEN INVEST",kwc:435,cout_bat:185415,longueur:60,largeur:34,travees:"8 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.8m",surfTot:2040},
  {type:"SOLEA 34 S31",spv:"GREEN INVEST",kwc:494,cout_bat:206674,longueur:67.5,largeur:34,travees:"9 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"7.8m",surfTot:2295},
  {type:"SOLEA 37 S32",spv:"GREEN INVEST",kwc:241,cout_bat:114738,longueur:30,largeur:37.8,travees:"4 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"8.1m",surfTot:1134},
  {type:"SOLEA 37 S33",spv:"GREEN INVEST",kwc:312,cout_bat:139648,longueur:37.5,largeur:37.8,travees:"5 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"8.1m",surfTot:1417},
  {type:"SOLEA 37 S34",spv:"GREEN INVEST",kwc:372,cout_bat:164388,longueur:45,largeur:37.8,travees:"6 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"8.1m",surfTot:1687},
  {type:"SOLEA 37 S35",spv:"GREEN INVEST",kwc:431,cout_bat:188941,longueur:52.5,largeur:37.8,travees:"7 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"8.1m",surfTot:1984},
  {type:"SOLEA 37 S36",spv:"GREEN INVEST",kwc:491,cout_bat:214521,longueur:60,largeur:37.8,travees:"8 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"8.1m",surfTot:2268},
  {type:"SOLEA 41 S37",spv:"GREEN INVEST",kwc:265,cout_bat:131368,longueur:30,largeur:41.5,travees:"4 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"8.5m",surfTot:1245},
  {type:"SOLEA 41 S38",spv:"GREEN INVEST",kwc:332,cout_bat:160522,longueur:37.5,largeur:41.5,travees:"5 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"8.5m",surfTot:1556},
  {type:"SOLEA 41 S39",spv:"GREEN INVEST",kwc:398,cout_bat:189861,longueur:45,largeur:41.5,travees:"6 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"8.5m",surfTot:1867},
  {type:"SOLEA 41 S40",spv:"GREEN INVEST",kwc:460,cout_bat:220040,longueur:52.5,largeur:41.5,travees:"7 x 7.5m",hSud:"4.6m",hNord:"4.6m",faitage:"8.5m",surfTot:2178},
];

const DETAILED_SUIVI_DATA = [
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
  { id:19, type:'TYPE 7 MINI', kwc:153, massifs:14, long:36.17, larg:20.19, travees:6, lTravee:6, hSud:4, hNord:7.24, hFait:0, lRemS:20.45, lRemN:0, sSud:739.7, sNord:0, sTot:739.7, axeS:19.94, axeN:0, pS:-11.34, pN:0, bPO_d:111.99, bPO_e:7839, bPE_d:111.99, bPE_e:7839, bLN_d:276.91, bLN_e:15230, bLS_d:231.69, bLS_e:12743, chS:4051, chN:4051, faitage:1085, anticond:1479 },
  { id:20, type:'TYPE 7 MID', kwc:260.1, massifs:22, long:60.17, larg:20.19, travees:10, lTravee:6, hSud:4, hNord:7.24, hFait:0, lRemS:20.45, lRemN:0, sSud:1230.7, sNord:0, sTot:1230.7, axeS:19.94, axeN:0, pS:-11.34, pN:0, bPO_d:111.99, bPO_e:7839, bPE_d:111.99, bPE_e:7839, bLN_d:460.75, bLN_e:25341, bLS_d:231.69, bLS_e:12743, chS:6784, chN:6784, faitage:1817, anticond:2477 },
  { id:21, type:'TYPE 7 MAXI', kwc:336.1, massifs:28, long:78.57, larg:20.19, travees:13, lTravee:6, hSud:4, hNord:7.24, hFait:0, lRemS:20.45, lRemN:0, sSud:1606.8, sNord:0, sTot:1606.8, axeS:19.94, axeN:0, pS:-11.34, pN:0, bPO_d:111.99, bPO_e:7839, bPE_d:111.99, bPE_e:7839, bLN_d:598.79, bLN_e:32933, bLS_d:231.69, bLS_e:12743, chS:8800, chN:8800, faitage:2357, anticond:3214 },
  { id:22, type:'TYPE 8 MINI', kwc:237.6, massifs:21, long:43.65, larg:26.26, travees:6, lTravee:7.25, hSud:4, hNord:5.65, hFait:7, lRemS:18.08, lRemN:8.4, sSud:789.2, sNord:366.7, sTot:1155.9, axeS:17.75, axeN:8.09, pS:9.59, pN:9.47, bPO_d:146.71, bPO_e:10270, bPE_d:146.71, bPE_e:10270, bLN_d:260.28, bLN_e:14315, bLS_d:231.69, bLS_e:12743, chS:4889, chN:4889, faitage:1310, anticond:2312 },
  { id:23, type:'TYPE 8 MID', kwc:316.8, massifs:27, long:58.15, larg:26.26, travees:8, lTravee:7.25, hSud:4, hNord:5.65, hFait:7, lRemS:18.08, lRemN:8.4, sSud:1051.4, sNord:488.5, sTot:1539.8, axeS:17.75, axeN:8.09, pS:9.59, pN:9.47, bPO_d:146.71, bPO_e:10270, bPE_d:146.71, bPE_e:10270, bLN_d:346.67, bLN_e:19067, bLS_d:231.69, bLS_e:12743, chS:6515, chN:6515, faitage:1745, anticond:3080 },
  { id:24, type:'TYPE 8 MAXI', kwc:485.1, massifs:39, long:87.15, larg:26.26, travees:12, lTravee:7.25, hSud:4, hNord:5.65, hFait:7, lRemS:18.08, lRemN:8.4, sSud:1582.9, sNord:735.4, sTot:2318.3, axeS:17.75, axeN:8.09, pS:9.59, pN:9.47, bPO_d:146.71, bPO_e:10270, bPE_d:146.71, bPE_e:10270, bLN_d:519.6, bLN_e:28578, bLS_d:231.69, bLS_e:12743, chS:9806, chN:9806, faitage:2627, anticond:4637 },
  { id:25, type:'TYPE 9 MINI', kwc:255.15, massifs:18, long:37.67, larg:31.13, travees:5, lTravee:7.5, hSud:3.79, hNord:7.59, hFait:9.72, lRemS:23.48, lRemN:8.48, sSud:884.5, sNord:319.4, sTot:1203.9, axeS:22.51, axeN:8, pS:14.76, pN:14.91, bPO_d:221.67, bPO_e:15517, bPE_d:221.67, bPE_e:15517, bLN_d:298.25, bLN_e:16404, bLS_d:231.69, bLS_e:12743, chS:4207, chN:4207, faitage:1130, anticond:2408 },
  { id:26, type:'TYPE 9 MID', kwc:355.35, massifs:24, long:52.67, larg:31.13, travees:7, lTravee:7.5, hSud:3.79, hNord:7.59, hFait:9.72, lRemS:23.48, lRemN:8.48, sSud:1236.7, sNord:446.6, sTot:1683.3, axeS:22.51, axeN:8, pS:14.76, pN:14.91, bPO_d:221.67, bPO_e:15517, bPE_d:221.67, bPE_e:15517, bLN_d:416.98, bLN_e:22934, bLS_d:231.69, bLS_e:12743, chS:5906, chN:5906, faitage:1580, anticond:3367 },
  { id:27, type:'TYPE 9 MAXI', kwc:499.95, massifs:34, long:75, larg:31.13, travees:10, lTravee:7.5, hSud:3.79, hNord:7.59, hFait:9.72, lRemS:23.48, lRemN:8.48, sSud:1765, sNord:637.4, sTot:2402.4, axeS:22.51, axeN:8, pS:14.76, pN:14.91, bPO_d:221.67, bPO_e:15517, bPE_d:221.67, bPE_e:15517, bLN_d:593.43, bLN_e:32639, bLS_d:231.69, bLS_e:12743, chS:8419, chN:8419, faitage:2255, anticond:4805 },
  { id:28, type:'EQUESTRE 65m', kwc:502.2, massifs:30, long:65, larg:35.25, travees:9, lTravee:7.1, hSud:3.06, hNord:4.67, hFait:9.1, lRemS:21.11, lRemN:15.43, sSud:1372.2, sNord:1003.0, sTot:2375.1, axeS:20.14, axeN:14.78, pS:16.69, pN:16.69, bPO_d:224.31, bPO_e:15702, bPE_d:224.31, bPE_e:15702, bLN_d:321.73, bLN_e:17695, bLS_d:231.69, bLS_e:12743, chS:7280, chN:7280, faitage:1950, anticond:4750 },
  { id:29, type:'EQUESTRE 45m', kwc:348.75, long:45, larg:35.25, travees:6, lTravee:7.5, hSud:3.06, hNord:4.67, hFait:9.1, lRemS:21.11, lRemN:15.43, sSud:950.0, sNord:694.4, sTot:1644.3, axeS:20.14, axeN:14.78, pS:16.69, pN:16.69, bPO_d:224.31, bPO_e:15702, bPE_d:224.31, bPE_e:15702, bLN_d:220.83, bLN_e:12146, bLS_d:231.69, bLS_e:12743, chS:5040, chN:5040, faitage:1350, anticond:3289 },
  { id:30, type:'AMA 1 MINI', kwc:99.36, massifs:10, long:32.3, larg:14.85, travees:4, hSud:4, lRemS:13, lRemN:2, sSud:419.9, sNord:64.6, sTot:484.5, bPO_d:63.16, bPO_e:4421, bPE_d:63.16, bPE_e:4421, bLN_d:163.52, bLN_e:8994, bLS_d:119.54, bLS_e:6575, chS:3618, chN:3618, faitage:969, anticond:969 },
  { id:31, type:'AMA 2 MINI', kwc:99.36, massifs:10, long:32.3, larg:14.5, travees:4, hSud:4, lRemS:7.3, lRemN:7.3, sSud:235.8, sNord:235.8, sTot:471.6, bPO_d:71.89, bPO_e:5032, bPE_d:71.89, bPE_e:5032, bLN_d:127.35, bLN_e:7114, bLS_d:129.35, bLS_e:7114, chS:3618, chN:3618, faitage:969, anticond:909 },
  { id:32, type:'SOL MINI', kwc:101.2, massifs:10, long:55, travees:8.5, sSud:306.0, sNord:280.0, sTot:586.0, bPO_d:52.21, bPO_e:3655, bPE_d:52.21, bPE_e:3655, bLN_d:154.5, bLN_e:8498, bLS_d:124.33, bLS_e:6838, chS:4032, chN:4032, faitage:1080, anticond:972 },
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

const MODULE_TYPES = [
  { power: 460, length: 1.762, width: 1.134 },
  { power: 550, length: 2.278, width: 1.134 },
  { power: 450, length: 1.762, width: 1.134 },
  { power: 435, length: 1.722, width: 1.134 },
  { power: 430, length: 1.722, width: 1.134 },
];

const getModuleDims = (power) => {
  const m = MODULE_TYPES.find(m => m.power === Number(power)) || MODULE_TYPES[0];
  return { length: m.length, width: m.width };
};


// ─── Automated Calculation Helpers ───────────────────────────────────────────

const getHtaCost = (kwc, hl) => {
  if (!kwc || kwc <= 0) return 0;
  if (kwc < 100) {
    if (hl < 10) return 5000;
    if (hl < 50) return 8000;
    if (hl < 100) return 10000;
    if (hl < 150) return 12000;
    if (hl < 200) return 14000;
    if (hl < 250) return 16000;
    return 16000;
  }
  if (kwc < 200) {
    if (hl < 50) return 14400;
    if (hl < 100) return 16100;
    if (hl < 150) return 17900;
    if (hl < 200) return 19600;
    if (hl < 250) return 21300;
    if (hl < 300) return 23000;
    if (hl < 350) return 24800;
    if (hl < 400) return 26500;
    if (hl < 450) return 27900;
    return 27900;
  }
  if (kwc < 300) {
    if (hl < 50) return 18300;
    if (hl < 100) return 20100;
    if (hl < 150) return 21800;
    if (hl < 200) return 23500;
    if (hl < 250) return 25300;
    if (hl < 300) return 27000;
    if (hl < 350) return 28700;
    if (hl < 400) return 30500;
    if (hl < 450) return 31900;
    return 31900;
  }
  if (kwc < 400) {
    if (hl < 350) return 28700;
    if (hl < 400) return 30500;
    if (hl < 450) return 31900;
    return 31900;
  }
  if (kwc < 600) {
    if (hl < 50) return 32600;
    if (hl < 100) return 35300;
    if (hl < 150) return 37100;
    if (hl < 200) return 38700;
    if (hl < 250) return 39100;
    if (hl < 300) return 40400;
    if (hl < 350) return 42200;
    if (hl < 400) return 43900;
    if (hl < 450) return 45300;
    return 45300;
  }
  if (kwc < 1200) {
    if (hl < 650) return 45300;
    return 45300;
  }
  return 0;
};

// Helper for PMT
function PMT(ir, np, pv) {
  if (ir === 0) return -(pv / np);
  const pvif = Math.pow(1 + ir, np);
  return -(ir * pv * pvif) / (pvif - 1);
}

// Helper for IRR
function IRR(values, guess = 0.1) {
  if (!values || values.length < 2) return 0;
  if (!values || values.length < 2) return 0;
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

function computeBatteryProfitability(config) {
  if (!config.enabled) return null;
  
  const {
    inflationAnnuelle = 2,
    degradationAnnuelle = 2,
    batterieBms = 50209,
    genieCivil = 6000,
    raccordement = 19900,
    developpement = 6000,
    fraisCommerciaux = 10000,
    arbitrageEnergie = 7500,
    reserveFCR = 37500,
    mecanismeCapacite = 5000,
    effacement = 5000,
    disponibilite = 98,
    rendementRoundTrip = 88,
    maintenanceAn = 1500,
    revenuBailleurAn = 2000,
    assuranceAn = 353,
    retributionCommAn = 0,
    commissionAgregateur = 20,
    turpeAn = 2500,
    iferAn = 625,
    tauxEmprunt = 4,
    dureeEmprunt = 20,
    apport = 0,
    tauxIS = 25,
    dureeEtude = 20
  } = config;

  const capexTotal = batterieBms + genieCivil + raccordement + developpement + fraisCommerciaux;
  const revenusBrutsAn1 = arbitrageEnergie + reserveFCR + mecanismeCapacite + effacement;
  
  const emprunt = Math.max(0, capexTotal - apport);
  const annuite = emprunt > 0 ? -PMT(tauxEmprunt / 100, dureeEmprunt, emprunt) : 0;

  const cashFlows = [-capexTotal];
  let remainingDebt = emprunt;
  let totalNetGain = 0;
  let paybackMonth = null;
  let runningCashFlow = -capexTotal;
  let resY1 = {};

  const rows = [];
  for (let y = 1; y <= dureeEtude; y++) {
    const infl = Math.pow(1 + inflationAnnuelle / 100, y - 1);
    const deg = Math.pow(1 - degradationAnnuelle / 100, y - 1);

    const revNet = revenusBrutsAn1 * deg * infl * (disponibilite / 100) * (rendementRoundTrip / 100);
    const chargesFixes = (maintenanceAn + assuranceAn + turpeAn + iferAn + revenuBailleurAn + retributionCommAn) * infl;
    const chargesCom = revNet * (commissionAgregateur / 100);
    const ebe = revNet - (chargesFixes + chargesCom);

    const interest = y <= dureeEmprunt ? remainingDebt * (tauxEmprunt / 100) : 0;
    const principal = y <= dureeEmprunt ? annuite - interest : 0;
    
    const amortissement = capexTotal / dureeEtude;
    const ebit = ebe - amortissement - interest;
    const is = ebit > 0 ? ebit * (tauxIS / 100) : 0;
    
    const cashFlow = ebe - interest - principal - is;
    
    if (paybackMonth === null) {
        if (runningCashFlow + cashFlow >= 0) {
            paybackMonth = (y - 1) + (Math.abs(runningCashFlow) / cashFlow);
        }
    }
    runningCashFlow += cashFlow;

    cashFlows.push(ebe - is);
    remainingDebt = Math.max(0, remainingDebt - principal);
    totalNetGain += cashFlow;

    const yearLabel = 2026 + y - 1;
    rows.push({
      year: yearLabel,
      arbitrage: arbitrageEnergie * deg * infl * (disponibilite / 100) * (rendementRoundTrip / 100),
      reserve: reserveFCR * deg * infl * (disponibilite / 100) * (rendementRoundTrip / 100),
      capacite: mecanismeCapacite * deg * infl * (disponibilite / 100) * (rendementRoundTrip / 100),
      effacement: effacement * deg * infl * (disponibilite / 100) * (rendementRoundTrip / 100),
      caTotal: revNet,
      opex: chargesFixes + chargesCom,
      maint: maintenanceAn * infl,
      revBailleur: revenuBailleurAn * infl,
      assur: assuranceAn * infl,
      turpe: turpeAn * infl,
      ifer: iferAn * infl,
      retribComm: retributionCommAn * infl,
      fraisAgregateur: chargesCom,
      serviceDette: interest + principal,
      ebe,
      interest,
      principal,
      tresorerie: cashFlow
    });

    if (y === 1) {
      resY1 = { revNet, ebe, dscr: annuite > 0 ? ebe / annuite : 9.99 };
    }
  }

  const simplePayback = resY1.ebe > 0 ? (capexTotal / resY1.ebe) : 20;

  return {
    capexTotal,
    revenuAn1: resY1.revNet,
    ebeAn1: resY1.ebe,
    triProjet: IRR(cashFlows, 0.1),
    payback: simplePayback,
    dscrAn1: resY1.dscr,
    gainNet20A: totalNetGain,
    rows
  };
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
    developpement = 0,
    soulte = 0,
    loyerCoeff = 0,
    soulteCoeff = 0,
    dureeEmprunt = 20,
    tauxCredit = 4,
    indexationTarif = 0.006,
    indexationOpex = 0.02,
    degradation = 0.004,
    tarifACC = 0.12,
    partACC = 0,
  } = params;

  const prodTotale = kwc * productible;
  const prodHautInit = Math.max(0, prodTotale * ((productible - seuilKwhKwc) / (productible || 1)));
  const prodBasInit = prodTotale - prodHautInit;

  // 1. First pass: calculate total CA and Opex (excluding loyer/soulte) to get the margin
  let totalCA = 0;
  let totalOpexBaseSum = 0;
  for (let y = 1; y <= 20; y++) {
    const d = Math.pow(1 - degradation, y - 1);
    const it = Math.pow(1 + indexationTarif, y - 1);
    const io = Math.pow(1 + indexationOpex, y - 1);

    const ph_test = prodHautInit * d;
    const pb_test = prodBasInit * d;
    const prodACC = (ph_test + pb_test) * partACC;
    const new_ph_test = Math.max(0, ph_test - prodACC);
    const rem_acc = Math.max(0, prodACC - ph_test);
    const new_pb_test = Math.max(0, pb_test - rem_acc);

    const caYear = (prodACC * tarifACC * it) + (new_pb_test * tarifBas * it) + (new_ph_test * tarifHaut * it);
    totalCA += caYear;

    const op = (maintenance + locationCompteur + assurance + taxesLocales + gestionAdmin) * io;
    totalOpexBaseSum += op;
  }

  const margin = totalCA - totalOpexBaseSum;
  
  // Potential values (if applied)
  const calculatedLoyer = (margin * (loyerCoeff || 0)) / 20;
  const calculatedSoulte = (margin * (soulteCoeff || 0)) / 2;

  // Actual values applied based on renteType selecion in UI
  const actualLoyerOpex = params.renteType === 'loyer' ? calculatedLoyer : 0;
  const actualSoulteCapitalized = params.renteType === 'soulte' ? calculatedSoulte : (params.renteType === 'none' ? 0 : (params.soulte || 0));

  const totalConstruction = (coutCentrale || 0) + (coutCharpente || 0) + (raccordement || 0) + (frais || 0) + (developpement || 0) + actualSoulteCapitalized;
  const apport10 = totalConstruction * 0.1;
  const emprunt = Math.max(0, totalConstruction - apport10 - (params.apport || 0));
  const serviceDette = emprunt > 0 ? -PMT(tauxCredit / 100, dureeEmprunt, emprunt) : 0;

  const rows = [];
  let dscrs = [];

  let detteDebut = emprunt;
  let cfCumule = 0;
  let sumCA = 0;
  let sumOpex = 0;
  
  const opexBase = maintenance + locationCompteur + assurance + taxesLocales + gestionAdmin + actualLoyerOpex;

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

    const prodACC = (ph + pb) * partACC;
    const new_ph = Math.max(0, ph - prodACC);
    const rem_acc_y = Math.max(0, prodACC - ph);
    const new_pb = Math.max(0, pb - rem_acc_y);

    const tBas = tarifBas * idxT;
    const tHaut = tarifHaut * idxT;
    const ca = (prodACC * tarifACC * idxT) + (new_pb * tBas) + (new_ph * tHaut);

    if (i === 1) {
      fraisDSRFInit = (ca / 1.35 * 0.5) * (tauxCredit / 100 * 0.35);
      sumCA += ca;
    } else { sumCA += ca; }

    const opex = opexBase * idxOpex;
    sumOpex += opex;
    
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

    const mra = (20 * kwc) / 10;
    
    const sd = i <= dureeEmprunt ? serviceDette : 0;
    const rembPrincipal = sd > 0 ? sd - interets : 0;
    // Fix: If no debt, DSCR is technically infinite/very high.
    const dscr = sd > 1 ? (cafds / sd) : (sd > 0 ? (cafds / sd) : 9.99);

    const tresorerie = ebitda - resFin - is - rembPrincipal;
    cfCumule += tresorerie;

    cashFlowFP.push(tresorerie);
    cashFlowProjet.push(cafds);
    if (sd > 0) dscrs.push(dscr);

    rows.push({
      year: 2025 + i,
      kwcDeg: pKw,
      prod: pb + ph,
      prodBas: new_pb,
      prodHaut: new_ph,
      tBas,
      tHaut,
      ca,
      maint,
      loc,
      ass,
      taxes,
      admin,
      loyer: actualLoyerOpex * idxOpex,
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
      prodACC,
      tresorerie,
      cfCumule
    });
    detteDebut = Math.max(0, detteDebut - rembPrincipal);
  }

  const dscrMoyen = dscrs.length > 0 ? dscrs.reduce((a, b) => a + b, 0) / dscrs.length : 0;
  
  // Gains sur 20 ans: turnover vs costs & investment
  const gainsVrai = sumCA - sumOpex - totalConstruction;

  // Average annual turnover (CA) payback
  const payback = totalConstruction / (Math.max(1, sumCA) / 20);

  // Rentabilité
  const triProjet = IRR(cashFlowProjet, 0.05); // W8
  let triFP = IRR(cashFlowFP, 0.05); // W7
  if (triFP < -0.99 || triFP > 10) triFP = null; 
  
  const tempsRetour = payback; // Sync both names for safety

  return { 
    rows, 
    dscrMoyen,
    annuite: serviceDette, 
    emprunt,
    triProjet,
    triFP,
    payback,
    tempsRetour,
    loyer: calculatedLoyer,
    soulte: calculatedSoulte,
    totalConstruction,
    totalInvestissement: totalConstruction,
    apport10,
    sumCA,
    sumOpex,
    gains: gainsVrai
  };
}

function mergeGlobalBP(bpBuilding, bpBattery, batteryConfig) {
  const years = bpBuilding.rows.length;
  const combinedRows = [];
  const tauxIS = batteryConfig.tauxIS || 25;

  for (let i = 0; i < years; i++) {
    const rB = bpBuilding.rows[i] || { year: i+1, ca: 0, opex: 0, serviceDette: 0, amortissement: 0, interets: 0, fraisDSRF: 0, rembPrincipal: 0 };
    // computeBatteryProfitability row has: year, arbitrage, reserve, capacite, effacement, caTotal, opex, serviceDette, ebe, interest, principal, tresorerie
    const rBat = bpBattery.rows[i] || { year: rB.year, arbitrage: 0, reserve: 0, capacite: 0, effacement: 0, caTotal: 0, opex: 0, serviceDette: 0, ebe: 0, interest: 0, principal: 0, tresorerie: 0 };

    const caGlobal = (rB.ca || 0) + (rBat.caTotal || 0);
    const opexGlobal = (rB.opex || 0) + (rBat.opex || 0);
    
    const ebitdaGlobal = caGlobal - opexGlobal;
    const amortissementGlobal = (rB.amortissement || 0) + (bpBattery.capexTotal / (batteryConfig.dureeEtude || 20));
    const ebitGlobal = ebitdaGlobal - amortissementGlobal;
    
    const interetsGlobal = (rB.interets || 0) + (rBat.interest || 0);
    const resFinGlobal = interetsGlobal + (rB.fraisDSRF || 0);
    const resFiscalGlobal = ebitGlobal - resFinGlobal;
    
    let impotGlobal = 0;
    if (resFiscalGlobal > 0) {
      if (resFiscalGlobal < 42500) {
        impotGlobal = resFiscalGlobal * 0.15;
      } else {
        impotGlobal = (42500 * 0.15) + ((resFiscalGlobal - 42500) * (tauxIS/100));
      }
    }
    
    const resApresISGlobal = resFiscalGlobal - impotGlobal;
    const rembPrincipalGlobal = (rB.rembPrincipal || 0) + (rBat.principal || 0);
    const serviceDetteGlobal = (rB.serviceDette || 0) + (rBat.serviceDette || 0);
    const tresorerieGlobal = ebitdaGlobal - resFinGlobal - impotGlobal - rembPrincipalGlobal;

    combinedRows.push({
      ...rB,
      ...rBat,
      year: rB.year,
      ca: caGlobal,
      opex: opexGlobal,
      maint: (rB.maint || 0) + (rBat.maint || 0),
      ass: (rB.ass || 0) + (rBat.assur || 0),
      loc: (rB.loc || 0),
      taxes: (rB.taxes || 0) + (rBat.turpe || 0) + (rBat.ifer || 0),
      admin: (rB.admin || 0) + (rBat.retribComm || 0),
      revenuBailleur: rBat.revBailleur || 0,
      ebitda: ebitdaGlobal,
      amortissement: amortissementGlobal,
      ebit: ebitGlobal,
      interets: interetsGlobal,
      resFin: resFinGlobal,
      resFiscal: resFiscalGlobal,
      is: impotGlobal,
      resApresIS: resApresISGlobal,
      serviceDetteBuilding: rB.serviceDette || 0,
      serviceDetteBattery: rBat.serviceDette || 0,
      serviceDette: serviceDetteGlobal,
      dscr: serviceDetteGlobal > 0.01 ? (ebitdaGlobal - impotGlobal) / serviceDetteGlobal : 9.99,
      rembPrincipal: rembPrincipalGlobal,
      tresorerie: tresorerieGlobal,
      cafds: ebitdaGlobal - impotGlobal,
      fraisAgregateur: rBat.fraisAgregateur || 0,
      isGlobal: true,
      isCombined: true
    });
  }

  const totalConsGlobal = (bpBuilding.totalConstruction || 0) + (bpBattery.capexTotal || 0);
  const totalApportGlobal = (bpBuilding.apport10 || 0) + (batteryConfig.apport || 0);

  const cashFlowProjet = [-totalConsGlobal, ...combinedRows.map(r => r.cafds)];
  const cashFlowFP = [-totalApportGlobal, ...combinedRows.map(r => r.tresorerie)];

  const triProjet = IRR(cashFlowProjet, 0.05);
  let triFP = IRR(cashFlowFP, 0.05);
  if (triFP < -0.99 || triFP > 10) triFP = null;

  const sumCA = combinedRows.reduce((acc, r) => acc + r.ca, 0);
  const sumOpex = combinedRows.reduce((acc, r) => acc + r.opex, 0);
  const gains = sumCA - sumOpex - totalConsGlobal;
  const payback = years > 0 ? (totalConsGlobal / (sumCA / years)) : 20;
  const dscrs = combinedRows.filter(r => r.serviceDette > 0).map(r => r.dscr);
  const dscrMoyen = dscrs.length > 0 ? dscrs.reduce((a, b) => a + b, 0) / dscrs.length : 0;

  return {
    ...bpBuilding,
    rows: combinedRows,
    dscrMoyen,
    totalConstruction: totalConsGlobal,
    totalInvestissement: totalConsGlobal,
    apport10: totalApportGlobal,
    triProjet,
    triFP,
    sumCA,
    sumOpex,
    gains,
    payback,
    tempsRetour: payback
  };
}

function calculateGoalSeekDSCR(params, type, target = 1.17) {
  if (!params.kwc) throw new Error("Aucun projet chargé ou puissance nulle.");
  
  let lo = 0, hi = 20; // Wide range for coeff
  let bestCoeff = 0;
  
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const testParams = { ...params };
    if (type === 'loyer') {
      testParams.loyerCoeff = mid;
      testParams.soulteCoeff = 0;
    } else {
      testParams.loyerCoeff = 0;
      testParams.soulteCoeff = mid;
    }
    
    const { dscrMoyen } = computeBusinessPlan(testParams);
    
    // DSCR decreases as coeff increases (higher rent/soulte = less cash flow for debt)
    if (dscrMoyen > target) {
      lo = mid;
    } else {
      hi = mid;
    }
    bestCoeff = mid;
  }
  return bestCoeff;
}


function computeResteACharge(params) {
  if (!params.totalInvestissement || params.totalInvestissement <= 0) return 0;
  const targetDscr = params.targetDSCR || 1.17;
  // Binary search: find the additional apport needed so dscrMoyen >= targetDscr
  let lo = 0, hi = params.totalInvestissement;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { dscrMoyen } = computeBusinessPlan({ ...params, apport: mid });
    if (isNaN(dscrMoyen) || dscrMoyen >= targetDscr) { hi = mid; } else { lo = mid; }
  }
  // Return early if target reached with 0 additional apport
  const { dscrMoyen: dscrInit } = computeBusinessPlan({ ...params, apport: 0 });
  if (dscrInit >= targetDscr) return 0;

  return hi < 0.01 ? 0 : Math.min(Math.ceil(hi), (params.totalInvestissement || 0) * 1.2);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n, dec = 0) => (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtEur = (n) => `${fmt(n, 2)} €`;
const fmtPct = (n) => `${fmt(n * 100, 1)}%`;
const fmtEurK = (v) => `${(v / 1000).toFixed(0)}k€`;

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

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e) => {
      if (!isDragging || !ref.current) return;
      e.preventDefault();
      const x = e.pageX - ref.current.offsetLeft;
      const walk = (x - startX) * 1.5;
      ref.current.scrollLeft = scrollLeft - walk;
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging, startX, scrollLeft]);

  return { 
    ref, 
    onMouseDown,
    className: cn("overflow-auto border border-slate-200 rounded-lg select-none cursor-grab", isDragging && "cursor-grabbing") 
  };
};

function Field({ label, value, onChange, type = 'text', suffix, className, step, disabled, precision = 2, hideLabel = false }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!hideLabel && <label className="text-[13px] text-slate-500 w-32 shrink-0">{label}</label>}
      <div className="flex items-center gap-1 flex-1 relative">
        <input
          type={type}
          disabled={disabled}
          min={type === 'number' ? 0 : undefined}
          className={cn(
            "border border-slate-200 rounded px-2 py-1 text-sm w-full outline-none transition-colors focus:ring-1 focus:ring-blue-500",
            disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "text-slate-900 bg-white"
          )}
          value={type === 'number' && typeof value === 'number' ? (Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision)).toString() : (value ?? '')}
          onChange={e => {
            let val = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            if (type === 'number' && val < 0) val = 0;
            onChange?.(val);
          }}
          step={step ?? (type === 'number' ? 'any' : undefined)}
        />
        {suffix && <span className="text-sm text-slate-500 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionCard({ title, children, className, id, actions }) {
  return (
    <div id={id} className={cn('bg-white rounded-lg border border-slate-200 p-4 space-y-3', className)}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
        <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function SignatureArea({ data, update }) {
  return (
    <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-12">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-slate-700 uppercase">Fait à :</span>
          <input 
            className="flex-1 outline-none text-[13px] px-1 focus:bg-blue-50/50 bg-transparent"
            value={data.faitA || ''} 
            onChange={e => update('faitA', e.target.value)}
            placeholder=".........................................."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-slate-700 uppercase">Le :</span>
          <input 
            className="flex-1 outline-none text-[13px] px-1 focus:bg-blue-50/50 bg-transparent"
            value={data.faitLe || ''} 
            onChange={e => update('faitLe', e.target.value)}
            placeholder=".........................................."
          />
        </div>
      </div>
    </div>
  );
}

function TableauPrevisionnelBatterie({ rows }) {
  const DataRow = ({ label, propName, isCurrency, format, bold, className }) => (
    <tr className={`border-b border-slate-200 bg-white hover:bg-slate-50 ${className}`}>
      <td className={`px-2 py-1 font-medium bg-slate-50 text-[11px] border-r border-slate-200 w-[180px] ${bold ? 'font-bold' : ''}`}>{label}</td>
      {rows.map((r, i) => (
        <td key={i} className={`px-1 py-1 text-right border-r border-slate-200 text-[11px] min-w-[50px] ${bold ? 'font-bold' : ''}`}>
          {format ? format(r[propName]) : (isCurrency ? fmtEur(r[propName]) : fmt(r[propName], 0))}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="mt-6 border-t pt-4">
      <h4 className="text-[12px] font-black text-blue-600 uppercase mb-3 px-1">Plan d'Affaires Prévisionnel Batterie Stand-Alone</h4>
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100">
              <td className="p-2 border-r border-b border-slate-200 text-[11px] font-bold w-[180px]">Indicateurs</td>
              {rows.map((r, i) => (
                <td key={i} className="p-1 border-r border-b border-slate-200 text-center font-bold bg-slate-50 text-[11px]">{r.year}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-amber-400 text-slate-900 font-bold uppercase text-[11px]">
              <td className="px-2 py-1 border-r border-b border-slate-300">Chiffre d'Affaires (HT)</td>
              {rows.map((_, i) => <td key={i} className="border-r border-b border-slate-300"></td>)}
            </tr>
            <DataRow label="Arbitrage énergie" propName="arbitrage" isCurrency />
            <DataRow label="Réserve (FCR/aFRR)" propName="reserve" isCurrency />
            <DataRow label="Mécanisme capacité" propName="capacite" isCurrency />
            <DataRow label="Effacement" propName="effacement" isCurrency />
            <DataRow label="TOTAL REVENUS" propName="caTotal" isCurrency bold className="bg-slate-50" />

            <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
              <td className="px-2 py-1 border-r border-b border-slate-200">Charges & Résultats</td>
              {rows.map((_, i) => <td key={i} className="border-r border-b border-slate-200"></td>)}
            </tr>
            <DataRow label="Charges d'Exploitation (OPEX)" propName="opex" isCurrency />
            <DataRow label="Service de la Dette" propName="serviceDette" isCurrency />
            <DataRow label="EBITDA (EBE)" propName="ebe" isCurrency bold className="bg-blue-50 text-blue-800" />
            <tr className="bg-amber-400 font-black text-slate-900 text-[11px]">
              <td className="px-2 py-1 uppercase border-r border-slate-300">Trésorerie nette annuelle</td>
              {rows.map((r, i) => (
                <td key={i} className="px-1 py-1 text-right border-r border-slate-300">{fmtEur(r.tresorerie)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BatterySection({ config, setParams }) {
  if (!config.enabled) return null;

  const results = computeBatteryProfitability(config);
  
  const currentModelKey = config.batteryModelKey || 'solax';
  const selectedModel = BATTERY_MODELS.find(m => m.id === currentModelKey) || BATTERY_MODELS[0];
  const nbBricks = config.nbBricks || 1;

  const realPower = nbBricks * selectedModel.power;
  const realEnergy = nbBricks * selectedModel.capacity;

  const updateBatterySpecs = (modelId, quantity) => {
    const model = BATTERY_MODELS.find(m => m.id === modelId) || selectedModel;
    const qty = quantity;
    const p = qty * model.power;
    const batteryBms = qty * model.price;
    
    const rHT = config.raccordementHT || 100;
    const dPriv = config.distancePriv || 100;
    const newRaccordement = getHtaCost(p, rHT) + (dPriv * 20);
    const newGenieCivil = 6000 + (qty - 1) * 1300;
    const newDeveloppement = 6000 + (qty - 1) * 500;
    const fraisComm = 50 * p;
    
    const capexPlusRacc = batteryBms + newGenieCivil + newRaccordement + newDeveloppement + fraisComm;
    
    const revBruts = (30 * p) + (150 * p) + (20 * p) + (20 * p);
    const rettComm = Math.round(revBruts * 0.02);

    setParams(prev => ({
      ...prev,
      batteryConfig: {
        ...prev.batteryConfig,
        batteryModelKey: modelId,
        nbBricks: qty,
        puissanceDemandee: p,
        batterieBms: batteryBms,
        genieCivil: newGenieCivil,
        developpement: newDeveloppement,
        fraisCommerciaux: fraisComm,
        raccordement: newRaccordement,
        arbitrageEnergie: 30 * p,
        reserveFCR: 150 * p,
        mecanismeCapacite: 20 * p,
        effacement: 20 * p,
        maintenanceAn: 6 * p,
        revenuBailleurAn: 2000 * qty,
        retributionCommAn: rettComm,
        turpeAn: 20 * p,
        iferAn: 5 * p,
        onduleurPcs: 0,
        assuranceAn: Math.round(capexPlusRacc * 0.004)
      }
    }));
  };

  const update = (k, v) => {
    setParams(prev => {
      const newConfig = { ...(prev.batteryConfig || {}), [k]: v };
      if (k === 'raccordementHT' || k === 'distancePriv') {
        const pReq = newConfig.puissanceDemandee || 125;
        const rHT = newConfig.raccordementHT || 100;
        const dPriv = newConfig.distancePriv || 100;
        newConfig.raccordement = getHtaCost(pReq, rHT) + (dPriv * 20);
        const totalCapex = (newConfig.batterieBms || 0) + (newConfig.genieCivil || 0) + newConfig.raccordement + (newConfig.developpement || 0) + (newConfig.fraisCommerciaux || 0);
        newConfig.assuranceAn = Math.round(totalCapex * 0.004);
      }
      return { ...prev, batteryConfig: newConfig };
    });
  };

  const GroupTitle = ({ title }) => <h4 className="text-[11px] font-black text-blue-600 uppercase mb-2 border-b border-blue-100 pb-1">{title}</h4>;

  return (
    <SectionCard title="RENTABILITÉ BATTERIE STAND-ALONE" id="pdf-section-battery" className="bg-white border-t-4 border-t-blue-600 shadow-lg">
      <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <GroupTitle title="Dimensionnement batterie" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
           <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[13px] text-slate-500">Marque / Modèle</label>
              <select 
                className="border border-slate-200 rounded px-2 py-1 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500 h-[30px]"
                value={currentModelKey}
                onChange={e => updateBatterySpecs(e.target.value, nbBricks)}
              >
                {BATTERY_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.brand} - {m.model} ({m.power}kW)</option>
                ))}
              </select>
           </div>
           <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-slate-500">Briques (Qté)</label>
              <input 
                type="number"
                min="1"
                className="border border-slate-200 rounded px-2 py-1 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500 h-[30px]"
                value={nbBricks}
                onChange={e => updateBatterySpecs(currentModelKey, parseInt(e.target.value) || 1)}
              />
           </div>
           
           <div className="space-y-1">
              <label className="text-[11px] text-slate-500 uppercase">Capacité totale</label>
              <div className="text-lg font-bold text-slate-900">{fmt(realEnergy, 0)} kWh</div>
           </div>
           <div className="space-y-1">
              <label className="text-[11px] text-slate-500 uppercase">Puissance totale</label>
              <div className="text-lg font-bold text-slate-900">{fmt(realPower, 0)} kW</div>
           </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${config.isGlobal ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-6`}>
        <div className="space-y-4">
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <GroupTitle title="DONNEES DU PROJET" />
            <div className="grid grid-cols-1 gap-2">
              <Field label="Raccordement HT" value={config.raccordementHT || 100} onChange={v => update('raccordementHT', v)} type="number" suffix="m" />
              <Field label="Distance privée" value={config.distancePriv || 100} onChange={v => update('distancePriv', v)} type="number" suffix="m" />
            </div>
          </div>

          <div className="pt-2">
            <GroupTitle title="Investissement Initial - CAPEX" />
            <div className="grid grid-cols-1 gap-2">
              <Field label="Batterie + BMS" value={config.batterieBms} onChange={v => update('batterieBms', v)} type="number" suffix="€" />
              <Field label="Génie civil" value={config.genieCivil} onChange={v => update('genieCivil', v)} type="number" suffix="€" readOnly />
              <Field label="Raccordement" value={config.raccordement} onChange={v => update('raccordement', v)} type="number" suffix="€" readOnly />
              <Field label="Développement" value={config.developpement} onChange={v => update('developpement', v)} type="number" suffix="€" readOnly />
              <Field label="Frais comm." value={config.fraisCommerciaux} onChange={v => update('fraisCommerciaux', v)} type="number" suffix="€" />
              <div className="pt-2 border-t border-slate-200 mt-1">
                <Field label="Invest. Total" value={results.capexTotal} type="number" suffix="€" readOnly className="font-bold bg-slate-100" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <GroupTitle title="Revenus Annuels (An 1)" />
          <div className="grid grid-cols-1 gap-2">
            <Field label="Arbitrage énergie" value={config.arbitrageEnergie} onChange={v => update('arbitrageEnergie', v)} type="number" suffix="€" />
            <Field label="Réserve (FCR/aFRR)" value={config.reserveFCR} onChange={v => update('reserveFCR', v)} type="number" suffix="€" />
            <Field label="Méc. capacité" value={config.mecanismeCapacite} onChange={v => update('mecanismeCapacite', v)} type="number" suffix="€" />
            <Field label="Effacement" value={config.effacement} onChange={v => update('effacement', v)} type="number" suffix="€" />
            <div className="pt-2 border-t border-slate-100 mt-2">
               <Field label="Disponibilité" value={config.disponibilite} onChange={v => update('disponibilite', v)} type="number" suffix="%" />
               <Field label="Rendement R-T" value={config.rendementRoundTrip} onChange={v => update('rendementRoundTrip', v)} type="number" suffix="%" />
            </div>
          </div>

          <div className="pt-2">
            <GroupTitle title="Financement" />
            <div className="grid grid-cols-1 gap-2">
              <Field label="Durée" value={config.dureeEmprunt || 20} onChange={v => update('dureeEmprunt', v)} type="number" suffix="ans" />
              <Field label="Taux" value={config.tauxEmprunt || 4} onChange={v => update('tauxEmprunt', v)} type="number" suffix="%" step={0.1} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <GroupTitle title="Charges & Hypothèses - OPEX" />
          <div className="grid grid-cols-1 gap-2">
            <Field label="Maintenance /an" value={config.maintenanceAn} onChange={v => update('maintenanceAn', v)} type="number" suffix="€" />
            <Field label="Revenu bailleur" value={config.revenuBailleurAn} onChange={v => update('revenuBailleurAn', v)} type="number" suffix="€" />
            <Field label="Rétribution comm." value={config.retributionCommAn || 0} onChange={v => update('retributionCommAn', v)} type="number" suffix="€" />
            <Field label="Assurance /an" value={config.assuranceAn} onChange={v => update('assuranceAn', v)} type="number" suffix="€" />
            <Field label="Comm. Agrégateur" value={config.commissionAgregateur} onChange={v => update('commissionAgregateur', v)} type="number" suffix="%" />
            <Field label="TURPE /an" value={config.turpeAn} onChange={v => update('turpeAn', v)} type="number" suffix="€" />
            <Field label="IFER /an" value={config.iferAn} onChange={v => update('iferAn', v)} type="number" suffix="€" />
            <div className="pt-2 border-t border-slate-100 mt-2">
               <div className="flex flex-col gap-1.5 mb-2">
                 <label className="text-[13px] text-slate-500">Durée d'étude</label>
                 <select 
                   className="border border-slate-200 rounded px-2 py-1 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500 h-[30px]"
                   value={config.dureeEtude || 20}
                   onChange={e => update('dureeEtude', parseInt(e.target.value))}
                 >
                   {[10, 15, 20, 25, 30].map(v => <option key={v} value={v}>{v} ans</option>)}
                 </select>
               </div>
               <Field label="Inflation ann." value={config.inflationAnnuelle} onChange={v => update('inflationAnnuelle', v)} type="number" suffix="%" />
               <Field label="Dégradation ann." value={config.degradationAnnuelle} onChange={v => update('degradationAnnuelle', v)} type="number" suffix="%" />
            </div>
          </div>
        </div>

        {!config.isGlobal && (
          <div className="bg-slate-900 rounded-lg p-4 text-white flex flex-col justify-between shadow-inner h-full">
             <div className="space-y-3">
                <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">Indicateurs de Rentabilité</h4>
                <div className="flex justify-between items-center"><span className="text-[11px] opacity-60 uppercase">CAPEX TOTAL</span><span className="font-bold text-lg">{fmtEur(results.capexTotal)}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] opacity-60 uppercase">REVENUS AN 1</span><span className="font-bold text-green-400">{fmtEur(results.revenuAn1)}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] opacity-60 uppercase">EBE AN 1</span><span className="font-bold text-blue-400">{fmtEur(results.ebeAn1)}</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10"><span className="text-[11px] opacity-60 uppercase">GAIN NET {config.dureeEtude || 20}A</span><span className="font-bold text-green-400">{fmtEur(results.gainNet20A)}</span></div>
             </div>
             <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/20">
                <div className="text-center">
                   <div className="text-[10px] opacity-50 uppercase leading-tight mb-1">TRI Projet</div>
                   <div className="text-lg font-black text-blue-400">{fmtPct(results.triProjet)}</div>
                </div>
                <div className="text-center border-x border-white/10 px-1">
                   <div className="text-[10px] opacity-50 uppercase leading-tight mb-1">Retour</div>
                   <div className="text-lg font-black text-amber-400">{fmt(results.payback, 1)} ans</div>
                </div>
                <div className="text-center">
                   <div className="text-[10px] opacity-50 uppercase leading-tight mb-1">DSCR Prêt</div>
                   <div className="text-lg font-black text-green-400">{fmt(results.dscrAn1, 2)}</div>
                </div>
             </div>
          </div>
        )}
      </div>

      {!config.isGlobal && <TableauPrevisionnelBatterie rows={results.rows} />}
    </SectionCard>
  );
}
// ─── Shared Component: Tableau Previsionnel ───────────────────────────────

function TableauPrevisionnel({ params, rows, apport10 }) {
  const DataRow = ({ label, propName, isPercent, isCurrency, format, showSum, bold, className }) => {
    const totalSum = showSum ? rows.reduce((acc, r) => acc + (r[propName] || 0), 0) : null;
    return (
      <tr className={cn("border-b border-slate-200 bg-white hover:bg-slate-50", className)}>
        <td className={cn("px-2 py-1 bg-slate-50 align-top text-[11px] border border-slate-200", bold ? "font-bold text-slate-900" : "font-medium text-slate-700")}>{label}</td>
        <td className={cn("px-2 py-1 w-28 whitespace-nowrap align-top text-right border border-slate-200 text-[11px] font-bold bg-slate-50 shadow-inner", showSum ? "text-slate-900" : "text-slate-400")}>
          {showSum ? (isCurrency ? fmtEur(totalSum) : fmt(totalSum, 2)) : "—"}
        </td>
        {rows.map((r, i) => (
          <td key={i} className="px-1 py-1 text-right border border-slate-200 font-medium align-top text-[11px]">
            {format ? format(r[propName]) : (isCurrency ? fmtEur(r[propName]) : (isPercent ? fmtPct(r[propName]) : fmt(r[propName], 2)))}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <SectionCard title={rows[0]?.isGlobal ? "PLAN D'AFFAIRES PREVISIONNEL BÂTIMENT + BATTERIE STAND-ALONE" : "PLAN D'AFFAIRES PREVISIONNEL BÂTIMENT"} className="p-0 border-none shadow-none">
      <div className="overflow-x-auto w-full">
        <table className="text-[11px] w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <td className="w-[180px] p-2 border border-slate-200 text-slate-400 font-bold italic">{rows[0]?.isGlobal ? "Étude Combinée" : ""}</td>
              <td className="w-28 p-1 border border-slate-200 text-center font-bold bg-amber-50 uppercase text-[10px] text-amber-900">TOTAL</td>
              {rows.map((r, i) => (
                <td key={i} className="p-1 border border-slate-200 text-center font-bold bg-slate-50">{r.year}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-amber-400 text-slate-900 font-bold uppercase">
                <td className="px-2 py-1 border border-slate-300" colSpan={2}>CHIFFRE D'AFFAIRES</td>
                {rows.map((_, i)=><td key={i} className="border border-slate-300"></td>)}
            </tr>
            <DataRow label="Puissance" propName="kwcDeg" format={v => fmt(v, 2)} />
            <DataRow label="Production avec dégradation" propName="prod" format={v => fmt(v, 0)} />
            <DataRow label="Production < 1100KWh/KWc" propName="prodBas" format={v => fmt(v, 0)} />
            <DataRow label="Production > 1100KWh/KWc" propName="prodHaut" format={v => fmt(v, 0)} />
            <DataRow label="Vente ACC" propName="prodACC" format={v => fmt(v, 0)} />
            <DataRow label="Jusque 1 100KWh/KWc" propName="tBas" isCurrency />
            <DataRow label="Au-delà de 1 100KWh/KWc" propName="tHaut" isCurrency />
            {rows[0]?.isGlobal && (
              <>
                <DataRow label="Arbitrage énergie (Batterie)" propName="arbitrage" isCurrency className="bg-blue-50/20" />
                <DataRow label="Réserve FCR/aFRR (Batterie)" propName="reserve" isCurrency className="bg-blue-50/20" />
                <DataRow label="Mécanisme capacité (Batterie)" propName="capacite" isCurrency className="bg-blue-50/20" />
                <DataRow label="Effacement (Batterie)" propName="effacement" isCurrency className="bg-blue-50/20" />
              </>
            )}
            <DataRow label="TOTAL REVENUS" propName="ca" isCurrency showSum bold />

            <tr className="bg-amber-400 text-slate-900 font-bold uppercase">
                <td className="px-2 py-1 border border-slate-300" colSpan={2}>CHARGE D'EXPLOITATION</td>
                {rows.map((_, i)=><td key={i} className="border border-slate-300"></td>)}
            </tr>
            <DataRow label="Maintenance" propName="maint" isCurrency />
            <DataRow label="Location du compteur" propName="loc" isCurrency />
            <DataRow label="Assurance" propName="ass" isCurrency />
            {rows[0]?.isGlobal ? (
              <>
                <DataRow label="Annuité crédit (Bâtiment)" propName="serviceDetteBuilding" isCurrency />
                <DataRow label="Annuité crédit (Batterie)" propName="serviceDetteBattery" isCurrency />
                <DataRow label="Frais agrégateur" propName="fraisAgregateur" isCurrency className="bg-blue-50/20" />
                <DataRow label="Taxes locales (TURPE+IFER)" propName="taxes" isCurrency />
                <DataRow label="Rétribution commerciale" propName="admin" isCurrency />
                <DataRow label="Revenu bailleur" propName="revenuBailleur" isCurrency />
              </>
            ) : (
              <DataRow label="Annuité du crédit bancaire" propName="serviceDette" isCurrency />
            )}
            <DataRow label="Remplacement des onduleurs" propName="mra" isCurrency />
            <tr className="border border-slate-200 bg-slate-50 font-bold">
              <td className="px-2 py-1">Total des charges</td>
              <td className="px-2 py-1 w-28 whitespace-nowrap text-right border-l border-slate-200 bg-slate-100/50">
                {fmtEur(rows.reduce((acc, r) => acc + (r.opex || 0) + (r.serviceDette || 0) + (r.mra || 0), 0))}
              </td>
              {rows.map((r, i) => (
                <td key={i} className="px-1 py-1 text-right border-l border-slate-200 text-red-700">{fmtEur(r.opex + r.serviceDette + r.mra)}</td>
              ))}
            </tr>
            <DataRow label="OPEX" propName="opex" isCurrency />

            <tr className="bg-amber-400 text-slate-900 font-bold uppercase">
                <td className="px-2 py-1 border border-slate-300" colSpan={2}>RESULTATS</td>
                {rows.map((_, i)=><td key={i} className="border border-slate-300"></td>)}
            </tr>
            <DataRow label="EBITDA" propName="ebitda" isCurrency />
            <DataRow label="Amortissement" propName="amortissement" isCurrency />
            <DataRow label="EBIT" propName="ebit" isCurrency />
            <DataRow label="Intérêts dette LT" propName="interets" isCurrency />
            <DataRow label="Frais DSRF" propName="fraisDSRF" isCurrency />
            <DataRow label="Résultat financier" propName="resFin" isCurrency />
            <DataRow label="Résultat fiscal" propName="resFiscal" isCurrency />
            <DataRow label="Résultat IS" propName="is" isCurrency />
            <DataRow label="Résultat après IS" propName="resApresIS" isCurrency />

            <tr className="bg-slate-200 border-none"><td colSpan={1+rows.length} className="h-2"></td></tr>
            <DataRow label="Dette début période" propName="detteDebut" isCurrency />
            <DataRow label="CAFDS" propName="cafds" isCurrency />
            <DataRow label="MRA onduleurs" propName="mra" isCurrency />
            {rows[0]?.isGlobal ? (
              <>
                <DataRow label="Dette Bâtiment" propName="serviceDetteBuilding" isCurrency className="text-slate-500 italic" />
                <DataRow label="Dette Batterie" propName="serviceDetteBattery" isCurrency className="text-slate-500 italic" />
                <DataRow label="TOTAL Service de la Dette" propName="serviceDette" isCurrency bold />
              </>
            ) : (
              <DataRow label="Service de la Dette" propName="serviceDette" isCurrency />
            )}
            <DataRow label="Remb principal" propName="rembPrincipal" isCurrency />
            <DataRow label="DSCR" propName="dscr" isPercent />
            <tr className="border border-slate-300 bg-amber-400 font-black">
              <td className="px-2 py-1 uppercase">Trésorerie nette annuelle</td>
              <td className="px-2 py-1 w-28 whitespace-nowrap text-right border-l border-slate-300 bg-amber-500/20">
                {fmtEur(rows.reduce((acc, r) => acc + (r.tresorerie || 0), 0))}
              </td>
              {rows.map((r, i) => (
                <td key={i} className="px-1 py-1 text-right border-l border-slate-300 text-slate-900">{fmtEur(r.tresorerie)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ─── Tab: BUSINESS PLAN PROJETS ──────────────────────────────────────────────

function TabBpProjets({ 
  projects, 
  selectedProject, 
  setSelectedProject, 
  params, 
  setParams, 
  computeBusinessPlan, 
  computeResteACharge, 
  calculateGoalSeekDSCR, 
  bpResults, 
  autoCoeffs,
  totalInvestissement, 
  apport10, 
  totalConstruction, 
  tva, 
  apportSoulte,
  activeSuiviBatData,
  isGreenInvest,
  resteACharge
}) {
  const PDFHeader = () => (
    <div className="pdf-header hidden flex flex-row items-start w-full mb-2 pb-1">
      <div className="flex-1">
        <img src="/logo-nelson.png" alt="Logo" className="h-14 w-auto object-contain" />
      </div>
      <div className="flex-1 text-center self-center">
        <span className="text-[20px] font-black text-slate-800 uppercase tracking-widest">{isGreenInvest ? 'BP' : 'Business Plan'}</span>
      </div>
      <div className="flex-1 text-right flex flex-col items-end">
        <h1 className="text-sm font-black text-slate-900 uppercase leading-tight">
          {selectedProject?.name || selectedProject?.client_name || selectedProject?.client_firstname || 'Projet Sans Nom'}
        </h1>
        <p className="text-[10px] font-bold text-slate-500 mt-1">{new Date().toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
  );

  const updateBuildingParam = (id, k, v) => {
    setParams(prev => {
      const newBuildings = (prev.buildings || []).map(b => {
        if (b.id === id) {
          let updated = { ...b, [k]: v };
          if (k === 'typeBat' && v) {
            const normalized = normalizeBatType(v);
            updated.typeBat = normalized;
            const batData = (activeSuiviBatData || []).find(d => d.type === normalized);
            if (batData) {
              updated.kwc = batData.kwc || updated.kwc;
              updated.productible = batData.prodMoyen || updated.productible || 1100;
              updated.coutCharpente = batData.cout_bat || updated.coutCharpente;
              updated.coutCentrale = (updated.kwc || 0) * 490;
            }
          }
          if (k === 'projectType' && v === 'BE') {
             updated.coutCharpente = 10000;
          }
          if (k === 'surfaceToiture' || (k === 'projectType' && v === 'BE')) {
            const surf = k === 'surfaceToiture' ? parseFloat(v) || 0 : b.surfaceToiture || 0;
            if (updated.projectType === 'BE' && surf > 0) {
              const dims = getModuleDims(prev.puissanceUnitaire || 460);
              const panels = Math.floor(surf / (dims.length * dims.width));
              updated.kwc = (panels * (prev.puissanceUnitaire || 460)) / 1000;
              updated.coutCentrale = (updated.kwc || 0) * 490;
            }
          }
          if (k === 'kwc' || k === 'coutCharpente' || k === 'coutCentrale' || k === 'distHta' || k === 'distPriv') {
            const num = parseFloat(v) || 0;
            updated[k] = num;
            if (k === 'kwc') {
              updated.coutCentrale = num * 490;
              updated.numPanneaux = Math.round(num * 1000 / (params.puissanceUnitaire || 460));
            }
          }
          return updated;
        }
        return b;
      });
      // Re-calculate automated fields
      const totalRaccordement = newBuildings.reduce((sum, b) => sum + getHtaCost(b.kwc, b.distHta) + (parseFloat(b.distPriv) || 0) * 20, 0);
      const totalCoutTechnique = newBuildings.reduce((sum, b) => sum + (parseFloat(b.coutCentrale) || 0) + (parseFloat(b.coutCharpente) || 0), 0);
      const totalFrais = totalCoutTechnique * 0.01;

      return { 
        ...prev, 
        buildings: newBuildings,
        raccordement: totalRaccordement,
        frais: totalFrais
      };
    });
  };

  const addBuilding = () => {
    if ((params.buildings || []).length >= 4) return;
    const newId = (params.buildings || []).length + 1;
    setParams(prev => ({
      ...prev,
      buildings: [...(prev.buildings || []), { id: newId, typeBat: '', kwc: 100, productible: 1123.08, coutCentrale: 0, coutCharpente: 0, raccordement: 0, frais: 0, soulte: 0, distHta: 100, distPriv: 100 }]
    }));
  };

  const removeBuilding = (id) => {
    if ((params.buildings || []).length <= 1) return;
    setParams(prev => ({
      ...prev,
      buildings: prev.buildings.filter(b => b.id !== id).map((b, i) => ({ ...b, id: i + 1 }))
    }));
  };

  const collapsedParams = useMemo(() => {
    const buildings = params.buildings || [];
    const totalKwc = buildings.reduce((sum, b) => sum + (parseFloat(b.kwc) || 0), 0);
    const totalCentrale = buildings.reduce((sum, b) => sum + (parseFloat(b.coutCentrale) || 0), 0);
    const totalCharpente = buildings.reduce((sum, b) => sum + (parseFloat(b.coutCharpente) || 0), 0);
    const developpement = isGreenInvest ? 0 : (totalKwc * 40);
    
    // Global fields from root params
    const totalRaccordement = parseFloat(params.raccordement) || 0;
    const totalFrais = parseFloat(params.frais) || 0;
    const totalSoulte = parseFloat(params.soulte) || 0;
    
    const totalProdKwh = buildings.reduce((sum, b) => sum + (parseFloat(b.kwc) || 0) * (parseFloat(b.productible) || 0), 0);
    const averageProd = totalKwc > 0 ? totalProdKwh / totalKwc : 0;

    const totalConst = totalCentrale + totalCharpente + totalRaccordement + totalFrais + developpement;

    return {
      ...params,
      kwc: totalKwc,
      productible: averageProd,
      coutCentrale: totalCentrale,
      coutCharpente: totalCharpente,
      raccordement: totalRaccordement,
      frais: totalFrais,
      developpement: developpement,
      soulte: totalSoulte,
      totalInvestissement: totalConst * 1.2
    };
  }, [params, isGreenInvest]);

  useEffect(() => {
    if (params.buildings?.length > 0) {
      const someNeedFix = params.buildings.some(b => b.typeBat && b.typeBat !== normalizeBatType(b.typeBat));
      if (someNeedFix) {
        setParams(prev => ({
          ...prev,
          buildings: prev.buildings.map(b => ({
            ...b,
            typeBat: normalizeBatType(b.typeBat)
          }))
        }));
      }
    }
  }, [params.buildings]);

  // AUTOMATION: Update Maintenance and Assurance based on building count and types
  useEffect(() => {
    if (!params.buildings || params.buildings.length === 0) return;

    const n = params.buildings.length;
    
    // 1. Maintenance Calculation: 1734.2 + (n-1) * (0.2 * 1734.2)
    const baseMaint = 1734.2;
    const incrementMaint = 0.2 * baseMaint;
    const newMaint = baseMaint + (n - 1) * incrementMaint;

    // 2. Assurance Calculation
    const baseAssur = 867.1;
    const buildings = params.buildings;
    const nBAC = buildings.filter(b => b.projectType !== 'BE').length;
    const nBE = buildings.filter(b => b.projectType === 'BE').length;
    
    let newAssur = baseAssur;
    if (nBAC > 0) {
      // Rule: Base is 867.1 (for 1st BAC). Extra BAC = +0.8. Extra BE = +0.1.
      newAssur = baseAssur * (1 + 0.8 * (nBAC - 1) + 0.1 * nBE);
    } else if (nBE > 0) {
      // Rule: Base is 867.1 (for 1st BE). Extra BE = +0.3.
      newAssur = baseAssur * (1 + 0.3 * (nBE - 1));
    }

    // Only update if values actually changed to avoid cycles or unnecessary updates
    if (Math.abs((params.maintenance || 0) - newMaint) > 0.01 || Math.abs((params.assurance || 0) - newAssur) > 0.01) {
      setParams(prev => ({
        ...prev,
        maintenance: Number(newMaint.toFixed(2)),
        assurance: Number(newAssur.toFixed(2))
      }));
    }
  }, [params.buildings]);

  const saveBp = async () => {
    if (!selectedProject) return;
    try {
      await apiService.updateProject(selectedProject.id, { bpAcamaState: params });
      toast({ title: 'BP Sauvegardé', description: `L'état du business plan pour ${selectedProject.name} a été enregistré.` });
    } catch (e) {
      toast({ title: 'Erreur sauvegarde', variant: 'destructive', description: e.message });
    }
  };

  // autoCoeffs and bpResults are passed as props

  // Note: bpResults and autoCoeffs are now passed as props
  const { rows, annuite, emprunt, soulte: calcSoulte, sumCA, sumOpex } = bpResults;
  const marginForCoeffs = sumCA - sumOpex;
  const targetLoyerTotal = marginForCoeffs * (autoCoeffs?.loyer || 0);
  const targetSoulte = (marginForCoeffs * (autoCoeffs?.soulte || 0)) / 2;

  // handleGoalSeek removed as it is now automated

  const limitDSCR = params.targetDSCR || 1.16;
  const dscrMoyenVal = bpResults.dscrMoyen || 0;
  const dscrColor = dscrMoyenVal >= limitDSCR ? 'text-green-600 bg-green-50' : dscrMoyenVal >= (limitDSCR - 0.06) ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50';
  const DscrIcon = dscrMoyenVal >= limitDSCR ? CheckCircle : dscrMoyenVal >= (limitDSCR - 0.06) ? AlertTriangle : AlertCircle;


  const applyProject = (id) => {
    const p = typeof id === 'string' ? (projects || []).find(proj => proj.id === id) : id;
    if (!p) return;
    setSelectedProject(p);
    setShowSearch(false);
    
    // Extract map features for immediate use
    const features = p.features || p.map_state?.features || p.map_state?.projects || [];
    const buildingFeatures = features.filter(f => f.type === 'rectangle' || (f.type === 'polygon' && f.isPredefinedBuilding));
    const defaultProd = parseFloat(p.solarYieldRoof1 || p.productible) || 1123.08;

    // Derive building data locally to avoid stale state issues during enrichment
    const projectTenant = p.tenant || p.bpAcamaState?.tenant || params.tenant;
    const localBatData = projectTenant === 'GREEN INVEST' ? SUIVI_BAT_DATA_GREEN_INVEST : SUIVI_BAT_DATA_ACAMA;

    if (p.bpAcamaState) {
      const saved = { ...p.bpAcamaState };
      // Enrich saved state with building types, productibles & power
      if (saved.buildings) {
        saved.buildings = saved.buildings.map((b, idx) => {
          const feat = (buildingFeatures || [])[idx];
          const rawTypeBat = (!b.typeBat || b.typeBat === '') ? (feat?.buildingName || feat?.name || b.typeBat) : b.typeBat;
          const newTypeBat = normalizeBatType(rawTypeBat);

          const specificProd = parseFloat(p[`solarYieldRoof${idx+1}`]) || defaultProd;
          const newProd = (!b.productible || b.productible === defaultProd) ? specificProd : b.productible;

          // If power is 100 (default) or missing, but map or project root has a power, update it
          const featPower = parseFloat(feat?.power || feat?.kwc || feat?.puissance) || (idx === 0 ? parseFloat(p.puissance) : 0) || 0;
          const newKwc = (b.kwc === 100 && featPower > 0) ? featPower : b.kwc;

          // Automate coutCharpente if missing or current type matches a batData
          let newCoutCharpente = b.coutCharpente || 0;
          const batData = (localBatData || []).find(d => {
            return d.type.toUpperCase() === newTypeBat.toUpperCase();
          });
          if (batData && (!newCoutCharpente || newCoutCharpente === 0)) {
            newCoutCharpente = batData.cout_bat || 0;
          }

          // Recompute costs if power changed
          const newCoutCentrale = (newKwc !== b.kwc) ? (newKwc * 490) : b.coutCentrale;

          return { ...b, typeBat: newTypeBat, productible: newProd, kwc: newKwc, coutCentrale: newCoutCentrale, coutCharpente: newCoutCharpente };
        });
      }
      setParams(saved);
    } else {
      const initialBuildings = [];

      if (buildingFeatures.length > 0) {
        buildingFeatures.forEach((f, idx) => {
          const specificProd = parseFloat(p[`solarYieldRoof${idx+1}`]) || defaultProd;
          // Fallback logic: feature power > project root power (for first building) > default 100
          const featPower = parseFloat(f.power || f.kwc || f.puissance) || (idx === 0 ? parseFloat(p.puissance) : 0) || 100;
          const rawTypeBat = f.buildingName || f.name || '';
          const normalizedType = normalizeBatType(rawTypeBat);

          const batData = (localBatData || []).find(d => d.type.toUpperCase() === normalizedType.toUpperCase());
          const autoCoutCharpente = batData ? batData.cout_bat : ((f.projectType === 'BE' || f.name === 'BE') ? 10000 : 0);
          const autoKwc = (batData && (!featPower || featPower === 100)) ? batData.kwc : featPower;

          initialBuildings.push({
            id: idx + 1,
            typeBat: normalizedType,
            projectType: f.projectType || 'BAC',
            surfaceToiture: f.surface || 0,
            kwc: autoKwc,
            productible: batData?.prodMoyen || specificProd,
            coutCentrale: autoKwc * 490,
            coutCharpente: autoCoutCharpente,
            distHta: 100,
            distPriv: 100,
            numPanneaux: Math.round(autoKwc * 1000 / (params.puissanceUnitaire || 460))
          });
        });
      } else {
        const b1 = parseFloat(p.puissance) || 0;
        const b2 = parseFloat(p.puissance2) || 0;
        const b3 = parseFloat(p.puissance3) || 0;
        const b4 = parseFloat(p.puissance4) || 0;

        if (b1 > 0 || (!b2 && !b3 && !b4)) {
          const rawTypeBat = p.type_bat || '';
          const normalizedType = normalizeBatType(rawTypeBat);
          const batData = (localBatData || []).find(d => d.type.toUpperCase() === normalizedType.toUpperCase());
          const initialKwc = (batData && (!b1 || b1 === 100)) ? batData.kwc : (b1 || 100);
          const initialCoutCharpente = batData ? batData.cout_bat : 0;

          initialBuildings.push({
            id: 1,
            typeBat: normalizedType,
            projectType: 'BAC',
            kwc: initialKwc,
            productible: batData?.prodMoyen || parseFloat(p.solarYieldRoof1 || p.productible) || defaultProd,
            coutCentrale: initialKwc * 490,
            coutCharpente: initialCoutCharpente,
            distHta: 100,
            distPriv: 100,
            numPanneaux: Math.round(initialKwc * 1000 / (params.puissanceUnitaire || 460))
          });
        }
        if (b2 > 0) {
          const norm2 = normalizeBatType(p.type_bat2 || '');
          const data2 = (localBatData || []).find(d => d.type.toUpperCase() === norm2.toUpperCase());
          const kwc2 = (data2 && (!b2 || b2 === 100)) ? data2.kwc : b2;
          initialBuildings.push({ id: 2, typeBat: norm2, projectType: 'BAC', kwc: kwc2, productible: data2?.prodMoyen || parseFloat(p.solarYieldRoof2 || p.productible) || defaultProd, coutCentrale: kwc2 * 490, coutCharpente: data2?.cout_bat || 0, distHta: 100, distPriv: 100, numPanneaux: Math.round(kwc2 * 1000 / (params.puissanceUnitaire || 460)) });
        }
        if (b3 > 0) {
          const norm3 = normalizeBatType(p.type_bat3 || '');
          const data3 = (localBatData || []).find(d => d.type.toUpperCase() === norm3.toUpperCase());
          const kwc3 = (data3 && (!b3 || b3 === 100)) ? data3.kwc : b3;
          initialBuildings.push({ id: 3, typeBat: norm3, projectType: 'BAC', kwc: kwc3, productible: data3?.prodMoyen || parseFloat(p.solarYieldRoof3 || p.productible) || defaultProd, coutCentrale: kwc3 * 490, coutCharpente: data3?.cout_bat || 0, distHta: 100, distPriv: 100, numPanneaux: Math.round(kwc3 * 1000 / (params.puissanceUnitaire || 460)) });
        }
        if (b4 > 0) {
          const norm4 = normalizeBatType(p.type_bat4 || '');
          const data4 = (localBatData || []).find(d => d.type.toUpperCase() === norm4.toUpperCase());
          const kwc4 = (data4 && (!b4 || b4 === 100)) ? data4.kwc : b4;
          initialBuildings.push({ id: 4, typeBat: norm4, projectType: 'BAC', kwc: kwc4, productible: data4?.prodMoyen || parseFloat(p.solarYieldRoof4 || p.productible) || defaultProd, coutCentrale: kwc4 * 490, coutCharpente: data4?.cout_bat || 0, distHta: 100, distPriv: 100, numPanneaux: Math.round(kwc4 * 1000 / (params.puissanceUnitaire || 460)) });
        }
      }
      
      const totalRaccordement = initialBuildings.reduce((sum, b) => sum + getHtaCost(b.kwc, b.distHta) + (parseFloat(b.distPriv) || 0) * 20, 0);
      const totalCoutTechnique = initialBuildings.reduce((sum, b) => sum + (parseFloat(b.coutCentrale) || 0) + (parseFloat(b.coutCharpente) || 0), 0);
      const totalFrais = totalCoutTechnique * 0.01;

      setParams(prev => ({
        ...prev,
        buildings: initialBuildings,
        vent: p.windZone || p.vent || p.urbanData?.vents || '',
        neige: p.snowZone || p.neige || p.urbanData?.neige || '',
        raccordement: totalRaccordement,
        frais: totalFrais,
        soulte: 0,
        renteType: 'none',
        targetDSCR: prev.targetDSCR || 1.17,
        tarifACC: prev.tarifACC || 0.14,
        partACC: prev.partACC !== undefined ? prev.partACC : 0
      }));
    }
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
    <div id="bp-acama-content" className="flex flex-col gap-4 p-4 text-slate-900">
      {/* Project selector & Actions */}
      <div data-html2canvas-ignore="true" className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-blue-700">Projet CRM :</span>
          <div className="w-64">
            <ProjectSelect 
              projects={projects || []} 
              activeProjectId={selectedProject?.id} 
              onSelect={applyProject} 
            />
          </div>
        </div>

        <div className="flex-1 min-w-[20px]" />

        {selectedProject && (
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="gap-2 h-8 border-slate-300" onClick={() => {
              const sections = ['pdf-section-1'];
              if (params.batteryConfig?.enabled && !params.batteryConfig?.isGlobal) {
                sections.push('pdf-section-battery');
              }
              sections.push('pdf-section-2');
              
              generateBpAcamaPDF({ 
                elementId: 'bp-acama-content', 
                sections,
                fileName: `BP_${selectedProject?.name || 'Projet'}.pdf` 
              });
            }}>
              <FileDown className="w-3.5 h-3.5 mr-1.5" /> PDF
            </Button>
            <Button size="sm" onClick={saveBp} className="bg-green-600 hover:bg-green-700 text-white text-[13px] h-8 px-3">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Sauvegarder
            </Button>
          </div>
        )}
      </div>

      <div id="pdf-section-1" className="pdf-header-container bg-white rounded-lg border border-slate-200 p-4 pt-6 relative overflow-hidden">
        <PDFHeader selectedProject={selectedProject} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2 items-stretch">
          {/* Column 1: Projects and Investment (Widened) */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-8 flex flex-col h-full">
            <SectionCard 
              title="DONNÉES DU PROJET" 
              id="pdf-section-data"
              className="bg-white border-t-4 border-t-blue-500 shadow-sm grow pb-2"
              actions={
                <button 
                  onClick={addBuilding} 
                  disabled={(params.buildings || []).length >= 4}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-5 h-5 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              }
            >
              <div className="overflow-x-auto pb-1">
                <table className="w-full text-left border-separate border-spacing-x-4">
                  <thead>
                    <tr>
                      <th className="w-32"></th>
                      {(params.buildings || []).map((b, i) => (
                        <th key={b.id} className="group relative text-center text-[12px] uppercase text-slate-400 font-bold pb-2">
                          <div className="flex flex-col items-center gap-1">
                            {i > 0 && (
                              <button 
                                onClick={() => removeBuilding(b.id)}
                                data-html2canvas-ignore="true"
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 text-red-500 p-1 rounded-full hover:bg-red-100 mb-1"
                                title="Supprimer ce bâtiment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <span>Bâtiment {i+1}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="h-2"></tr>
                    <tr>
                      <td className="text-[12px] text-blue-700 font-bold pt-2">Type de projet</td>
                      {(params.buildings || []).map(b => (
                        <td key={b.id} className="pt-2">
                          <select 
                            className="bg-white border border-blue-300 rounded px-1 py-1 text-[13px] w-full font-bold text-blue-900"
                            value={b.projectType || 'BAC'} 
                            onChange={e => updateBuildingParam(b.id, 'projectType', e.target.value)}
                          >
                            <option value="BAC">BAC</option>
                            <option value="BE">BE</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium pt-2">Type de bâtiment</td>
                      {(params.buildings || []).map(b => (
                        <td key={b.id} className="pt-2">
                          {b.projectType === 'BE' ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="number"
                                className="bg-white border border-slate-200 rounded px-1 py-1 text-[13px] w-full outline-none focus:ring-1 focus:ring-blue-400 text-center font-bold"
                                value={b.surfaceToiture || ''} 
                                onChange={e => updateBuildingParam(b.id, 'surfaceToiture', parseFloat(e.target.value) || 0)}
                                placeholder="m²"
                              />
                            </div>
                          ) : (
                            <select 
                              className="bg-white border border-slate-200 rounded px-1 py-1 text-[13px] w-full outline-none focus:ring-1 focus:ring-blue-400 font-bold"
                              value={b.typeBat || ''} 
                              onChange={e => updateBuildingParam(b.id, 'typeBat', e.target.value)}
                            >
                              <option value="">— Choisir —</option>
                              {(activeSuiviBatData || []).map(d => (
                                <option key={d.type} value={d.type}>{d.type}</option>
                              ))}
                            </select>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium">Nombre de panneaux</td>
                      {(params.buildings || []).map(b => {
                        const nb = Math.ceil((parseFloat(b.kwc) || 0) * 1000 / (parseFloat(params.puissanceUnitaire) || 460));
                        return <td key={b.id} className="text-center text-[13px] font-bold text-slate-700">{nb} un.</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium">Puissance installée</td>
                      {(params.buildings || []).map(b => (
                        <td key={b.id}>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-sm w-full outline-none focus:ring-1 focus:ring-blue-400 text-center font-bold"
                              value={b.kwc || ''} 
                              onChange={e => updateBuildingParam(b.id, 'kwc', parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-[12px] text-slate-400 w-6">kWc</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium">Productible</td>
                      {(params.buildings || []).map(b => (
                        <td key={b.id}>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-sm w-full outline-none focus:ring-1 focus:ring-blue-400 text-center font-bold"
                              value={b.productible || ''} 
                              onChange={e => updateBuildingParam(b.id, 'productible', parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-[12px] text-slate-400 w-[45px] whitespace-nowrap">kWh/kWc</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="h-4"></tr>
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium">Surface installée</td>
                      {(params.buildings || []).map(b => {
                        const nb = Math.ceil((parseFloat(b.kwc) || 0) * 1000 / (parseFloat(params.puissanceUnitaire) || 460));
                        const dims = getModuleDims(params.puissanceUnitaire || 460);
                        const surf = nb * (dims.length * dims.width);
                        return <td key={b.id} className="text-center text-sm font-bold text-slate-700">{fmt(surf, 0)} m²</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="text-[12px] text-blue-700 font-bold uppercase pt-2 border-t border-slate-50 mt-2">Sous-total Prod.</td>
                      {(params.buildings || []).map(b => {
                        const yearlyProd = (parseFloat(b.kwc) || 0) * (parseFloat(b.productible) || 0);
                        return <td key={b.id} className="text-center text-[12px] font-black text-blue-900 border-t border-blue-50 pt-2">{fmt(yearlyProd, 0)} kWh/an</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 items-end bg-blue-50/30 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                   <span className="text-[13px] text-slate-400 font-bold uppercase">Production totale cumulée</span>
                   <span className="text-sm font-black text-blue-900">{fmt(collapsedParams.kwc * collapsedParams.productible, 0)} kWh/an</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[12px] text-slate-400 font-bold uppercase">Puissance Totale</span>
                    <span className="text-sm font-bold text-slate-700">{fmt(collapsedParams.kwc, 2)} kWc</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100">
                <Field label="Zone de vent" value={params.vent} onChange={v => setParams(p => ({ ...p, vent: v }))} className="h-7" />
                <Field label="Zone de neige" value={params.neige} onChange={v => setParams(p => ({ ...p, neige: v }))} className="h-7" />
              </div>
              <div className="mt-6 p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/50 shadow-sm transition-all duration-300 hover:bg-emerald-100/40 group">
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                       <span className="text-[13px] font-bold text-emerald-900 uppercase tracking-tight">Option Batterie Stand-Alone</span>
                       <span className="text-[10px] text-emerald-700/70 font-medium">Ajouter un simulateur de stockage au projet</span>
                    </div>
                     <button 
                      onClick={() => setParams(p => ({ ...p, batteryConfig: { ...(p.batteryConfig || {}), enabled: !p.batteryConfig?.enabled } }))}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 shadow-inner",
                        params.batteryConfig?.enabled ? "bg-emerald-600" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                        params.batteryConfig?.enabled ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                 </div>

                 {params.batteryConfig?.enabled && (
                   <div className="flex items-center justify-between mt-3 pt-3 border-t border-emerald-200/30">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-emerald-800 uppercase">Étude Globale</span>
                        <span className="text-[10px] text-emerald-600 font-medium">Bâtiment + Batterie combinés</span>
                      </div>
                      <button 
                        onClick={() => setParams(p => ({ ...p, batteryConfig: { ...(p.batteryConfig || {}), isGlobal: !p.batteryConfig?.isGlobal } }))}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shadow-inner",
                          params.batteryConfig?.isGlobal ? "bg-blue-600" : "bg-slate-300"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm",
                          params.batteryConfig?.isGlobal ? "translate-x-5" : "translate-x-1"
                        )} />
                      </button>
                   </div>
                 )}
              </div>
            </SectionCard>

            <SectionCard title="INVESTISSEMENT" id="pdf-section-invest" className="grow pb-2 border-t-4 border-t-amber-400">
              <div className="overflow-x-auto pb-1">
                <table className="w-full text-left border-separate border-spacing-x-4">
                  <thead>
                    <tr>
                      <th className="w-1/3"></th>
                      {(params.buildings || []).map((b, i) => (
                        <th key={b.id} className="group relative text-center text-[12px] uppercase text-slate-400 font-bold pb-2">
                           <div className="flex flex-col items-center gap-1">
                            {i > 0 && (
                              <button 
                                onClick={() => removeBuilding(b.id)}
                                data-html2canvas-ignore="true"
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 text-red-500 p-1 rounded-full hover:bg-red-100 mb-1"
                                title="Supprimer ce bâtiment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <span>Bâtiment {i+1}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(params.buildings || []).some(b => b.projectType === 'BAC' || b.projectType === 'BAC + BE') && (
                      <tr className="bg-blue-50/50">
                        <td className="text-[12px] text-blue-700 font-bold pr-2 py-2">Modèle bâtiment</td>
                        {(params.buildings || []).map(b => (
                          <td key={b.id} className="py-2">
                            {b.projectType !== 'BE' && (
                              <div className="bg-slate-100 border border-slate-300 rounded px-2 py-1 text-[13px] w-full font-bold text-slate-500 text-center flex items-center justify-center gap-1 shadow-inner">
                                <Building className="w-3 h-3 opacity-40" />
                                {b.typeBat || '—'}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    )}
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium pt-2">Dist. Raccordement HT</td>
                      {(params.buildings || []).map(b => (
                        <td key={b.id} className="pt-2">
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-sm w-full outline-none focus:ring-1 focus:ring-blue-400 text-center font-bold"
                              value={b.distHta || ''} 
                              onChange={e => updateBuildingParam(b.id, 'distHta', parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-[12px] text-slate-400 w-4">m</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium">Dist. partie privée</td>
                      {(params.buildings || []).map(b => (
                        <td key={b.id}>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-sm w-full outline-none focus:ring-1 focus:ring-blue-400 text-center font-bold"
                              value={b.distPriv || ''} 
                              onChange={e => updateBuildingParam(b.id, 'distPriv', parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-[12px] text-slate-400 w-4">m</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="h-2"></tr>
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium pt-1">Centrale solaire</td>
                      {(params.buildings || []).map(b => (
                        <td key={b.id} className="pt-1 text-right text-sm font-bold text-slate-700 pr-2">
                           {fmtEur(b.coutCentrale)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium">Charpente / Bâtiment</td>
                      {(params.buildings || []).map(b => (
                        <td key={b.id}>
                          <input 
                            type="number"
                            className="bg-white border border-slate-200 rounded px-2 py-1 text-sm w-full outline-none focus:ring-1 focus:ring-blue-400 text-right font-bold"
                            value={b.coutCharpente || ''} 
                            onChange={e => updateBuildingParam(b.id, 'coutCharpente', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50 font-bold italic">
                      <td className="text-[13px] text-slate-400 py-1">Sous-total technique</td>
                      {(params.buildings || []).map(b => (
                        <td key={b.id} className="text-right text-[13px] pr-2">
                          {fmtEur((parseFloat(b.coutCentrale) || 0) + (parseFloat(b.coutCharpente) || 0))}
                        </td>
                      ))}
                    </tr>

                    <tr className="h-4"></tr>
                    <tr className="border-t border-slate-200">
                      <td className="text-[13px] text-slate-600 font-bold pt-3" colSpan={(params.buildings || []).length + 1}>FRAIS COMMUNS :</td>
                    </tr>
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium pl-2">Raccordement</td>
                      <td colSpan={(params.buildings || []).length} className="pt-1 text-center">
                        <div className="flex items-center justify-center">
                          <input 
                            readOnly 
                            className="bg-slate-100 border border-slate-200 rounded px-3 py-1 text-sm w-48 text-center font-bold text-slate-700 shadow-sm"
                            value={fmtEur(params.raccordement)}
                          />
                        </div>
                      </td>
                    </tr>
                    {!isGreenInvest && (
                      <tr>
                        <td className="text-[12px] text-slate-500 font-medium pl-2">Développement</td>
                        <td colSpan={(params.buildings || []).length} className="pt-1 text-center">
                          <div className="flex items-center justify-center">
                            <input 
                              readOnly 
                              className="bg-slate-100 border border-slate-200 rounded px-3 py-1 text-sm w-48 text-center font-bold text-slate-700 shadow-sm"
                              value={fmtEur(collapsedParams.developpement)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="text-[12px] text-slate-500 font-medium pl-2">Frais</td>
                      <td colSpan={(params.buildings || []).length} className="pt-1 text-center">
                        <div className="flex items-center justify-center">
                          <input 
                            readOnly 
                            className="bg-slate-100 border border-slate-200 rounded px-3 py-1 text-sm w-48 text-center font-bold text-slate-700 shadow-sm"
                            value={fmtEur(params.frais)}
                          />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-[13px] text-slate-600 font-bold pl-2">
                        <select 
                          className="bg-transparent border-none outline-none font-bold uppercase text-slate-600 cursor-pointer"
                          value={params.renteType || 'none'}
                          onChange={e => setParams(p => ({ ...p, renteType: e.target.value }))}
                        >
                          <option value="none">—</option>
                          <option value="soulte">Soulte</option>
                          <option value="loyer">Loyer annuel</option>
                        </select>
                      </td>
                      <td colSpan={(params.buildings || []).length} className="pt-1 text-center">
                        <div className="flex items-center justify-center">
                          <input 
                            readOnly 
                            className="bg-slate-100 border border-slate-200 rounded px-3 py-1 text-sm w-48 text-center font-bold text-slate-900 shadow-sm"
                            value={(!params.renteType || params.renteType === 'none') ? '0,00 €' : (params.renteType === 'loyer' ? `${fmtEur(targetLoyerTotal)} (sur 20 ans)` : fmtEur(targetSoulte))}
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 items-end bg-blue-50/30 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                   <span className="text-[13px] text-slate-400 font-bold uppercase">Total Construction :</span>
                   <span className="text-[13px] font-bold text-slate-800">{fmtEur(totalConstruction)}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[13px] text-slate-400 font-bold uppercase">Total avec TVA (20%) :</span>
                   <span className="text-md font-black text-blue-900">{fmtEur(totalInvestissement)}</span>
                </div>
              </div>
            </SectionCard>

            {/* INDICES moved to Column 2 */}
          </div>

          {/* Column 2: Parameters (Reduced) */}
          <div className="lg:col-span-6 xl:col-span-3 space-y-6 flex flex-col h-full">
            <SectionCard title="TARIFS D'ACHAT" id="pdf-section-tarifs" className="grid grid-cols-1 gap-y-1 py-2 border-t-4 border-t-orange-500">
              <Field label="Seuil" value={params.seuilKwhKwc} onChange={v => setParams(p => ({ ...p, seuilKwhKwc: v }))} type="number" suffix="kWh/kWc" className="h-7" />
              <Field label="Tarif ≤ 1 100" value={params.tarifBas} onChange={v => setParams(p => ({ ...p, tarifBas: v }))} type="number" suffix="€" precision={4} step="0.001" className="h-7" />
              <Field label="Tarif > 1 100" value={params.tarifHaut} onChange={v => setParams(p => ({ ...p, tarifHaut: v }))} type="number" suffix="€" precision={4} step="0.001" className="h-7" />
              <Field label="Tarif ACC" value={params.tarifACC} onChange={v => setParams(p => ({ ...p, tarifACC: v }))} type="number" suffix="€" precision={4} step="0.001" className="h-7" />
              <Field label="Part ACC" value={params.partACC * 100} onChange={v => setParams(p => ({ ...p, partACC: v/100 }))} type="number" suffix="%" className="h-7" />
            </SectionCard>

            <SectionCard title="OPEX ANNUELS" id="pdf-section-opex" className="grid grid-cols-1 gap-y-1 py-2 border-t-4 border-t-purple-500">
              <Field label="Maintenance" value={params.maintenance} onChange={v => setParams(p => ({ ...p, maintenance: v }))} type="number" suffix="€" className="h-7" />
              <Field label="Assurance" value={params.assurance} onChange={v => setParams(p => ({ ...p, assurance: v }))} type="number" suffix="€" className="h-7" />
              <Field label="Taxes locales" value={params.taxesLocales} onChange={v => setParams(p => ({ ...p, taxesLocales: v }))} type="number" suffix="€" className="h-7" />
              <Field label="Gestion" value={params.gestionAdmin} onChange={v => setParams(p => ({ ...p, gestionAdmin: v }))} type="number" suffix="€" className="h-7" />
            </SectionCard>

            <SectionCard title="BANQUE" id="pdf-section-banque" className="bg-white border-slate-200 border-t-4 border-t-amber-500">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-y-1">
                  <Field label="Durée" value={params.dureeEmprunt} onChange={v => setParams(p => ({ ...p, dureeEmprunt: v }))} type="number" suffix="ans" className="h-7" />
                  <Field label="Taux" value={params.tauxCredit} onChange={v => setParams(p => ({ ...p, tauxCredit: v }))} type="number" suffix="%" step="0.1" className="h-7" />
                </div>
                
                <div className="pt-2 border-t border-slate-200 mt-2 space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-500 italic">Apport :</span>
                    <span className="font-bold text-slate-700">{fmtEur(apport10)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-500 italic">Emprunt :</span>
                    <span className="font-bold text-slate-700">{fmtEur(emprunt)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] mt-1 pt-1 border-t border-slate-200 font-bold">
                    <span className="text-slate-700 font-bold uppercase text-[11px]">Annuité :</span>
                    <span className="text-slate-900">{fmtEur(annuite)}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="INDICES & DÉGRADATION" id="pdf-section-indices" className="grid grid-cols-1 gap-y-1 py-1 grow border-t-4 border-t-indigo-500">
              <div className="flex items-center gap-2 h-7 group">
                <label className="text-[13px] text-slate-500 w-32 shrink-0">P. Unitaire</label>
                <div className="flex items-center gap-1 flex-1 relative">
                  <select 
                    className="border border-slate-200 rounded px-2 py-1 text-sm w-full outline-none transition-colors focus:ring-1 focus:ring-blue-500 bg-white"
                    value={params.puissanceUnitaire || 460}
                    onChange={e => {
                      const newP = parseFloat(e.target.value);
                      const dims = getModuleDims(newP);
                      setParams(p => ({ 
                        ...p, 
                        puissanceUnitaire: newP,
                        buildings: (p.buildings || []).map(b => {
                          if (b.projectType === 'BE' && b.surfaceToiture > 0) {
                            const nbPanels = Math.floor(b.surfaceToiture / (dims.length * dims.width));
                            const newKwc = (nbPanels * newP) / 1000;
                            return { ...b, kwc: newKwc, coutCentrale: newKwc * 490 };
                          }
                          return b;
                        })
                      }));
                    }}
                  >
                    {MODULE_TYPES.map(m => (
                      <option key={m.power} value={m.power}>{m.power} Wc</option>
                    ))}
                  </select>
                </div>
              </div>
              <Field label="Indice Tarifs" value={params.indexationTarif * 100} onChange={v => setParams(p => ({ ...p, indexationTarif: v / 100 }))} type="number" suffix="%" step="0.1" className="h-7" />
              <Field label="Indice OPEX" value={params.indexationOpex * 100} onChange={v => setParams(p => ({ ...p, indexationOpex: v / 100 }))} type="number" suffix="%" step="0.1" className="h-7" />
              <Field label="Dégradation" value={params.degradation * 100} onChange={v => setParams(p => ({ ...p, degradation: v / 100 }))} type="number" suffix="%" step="0.1" className="h-7" />
            </SectionCard>
          </div>

          {/* Column 3: Results and Banking (Reduced) */}
          <div className="lg:col-span-6 xl:col-span-4 space-y-6 flex flex-col h-full">
            <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col items-center justify-center text-center space-y-1 shadow-sm border-t-4 border-t-green-500 grow">
              <div className="p-1.5 bg-green-50 rounded-full mb-0.5"><CheckCircle className="w-5 h-5 text-green-500" /></div>
              <div className="text-3xl font-black text-green-600">{fmtPct(bpResults.dscrMoyen)}</div>
              <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">DSCR MOYEN 20 ANS</div>
              <div className="text-[11px] text-slate-400">Seuil bancaire : {fmt(params.targetDSCR * 100, 0)}%</div>
            </div>

            <div className="bg-blue-600 rounded-lg p-5 text-white shadow-xl shadow-blue-100 space-y-3 grow">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-widest opacity-60">RESTE À CHARGE</div>
                <div className="text-2xl font-black">{fmtEur(resteACharge)}</div>
              </div>
              <Button onClick={applyToProject} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm py-4 h-10">
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Appliquer
              </Button>
            </div>

            <SectionCard title="INDICATEURS" id="pdf-section-indic" className="grow py-1 border-t-4 border-t-rose-500">
               <div className="space-y-1">
                 <div className="flex justify-between text-sm"><span className="text-slate-500 text-[12px]">Apport avec soulte :</span><span className="font-bold text-blue-800 text-[13px]">{fmtEur(apport10 + (calcSoulte > 0 ? calcSoulte : 0))}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-500 text-[12px]">Emprunt net :</span><span className="font-bold text-blue-800 text-[13px]">{fmtEur(emprunt)}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-500 text-[12px]">CA an 1 :</span><span className="font-bold text-blue-600 text-[13px]">{fmtEur(bpResults.rows[0]?.ca)}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-500 text-[12px]">Charges an 1 :</span><span className="font-bold text-red-600 text-[13px]">{fmtEur((bpResults.rows[0]?.opex || 0) + (bpResults.rows[0]?.serviceDette || 0))}</span></div>
               </div>
            </SectionCard>

            <SectionCard title="RENTABILITÉ" id="pdf-section-renta" className="bg-white border-slate-200 grow py-1 border-t-4 border-t-emerald-500">
               <div className="space-y-2">
                 <Field label="CIBLE DSCR :" value={params.targetDSCR * 100} onChange={v => setParams(p => ({ ...p, targetDSCR: v / 100 }))} type="number" suffix="%" step="1" className="bg-slate-50 p-1.5 rounded" />
                 
                 <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
                    <button 
                      onClick={() => {
                        const target = params.targetDSCR || 1.17;
                        const lCoeff = calculateGoalSeekDSCR({ ...collapsedParams, renteType: 'loyer', apport: resteACharge }, 'loyer', target);
                        const sCoeff = calculateGoalSeekDSCR({ ...collapsedParams, renteType: 'soulte', apport: resteACharge }, 'soulte', target);
                        setParams(p => ({ ...p, loyerCoeff: lCoeff, soulteCoeff: sCoeff }));
                        toast({ title: 'Cible atteinte', description: `Coefficients ajustés pour DSCR ${fmtPct(target)}` });
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-sm transition-colors shadow-sm uppercase tracking-wide"
                    >
                      Optimiser Loyer / Soulte
                    </button>
                    
                    <div className="w-full grid grid-cols-2 gap-2 pt-1 border-t border-slate-50 mt-1">
                      <div className="flex flex-col items-center p-1 bg-blue-50/50 rounded border border-blue-100">
                        <span className="text-[10px] text-blue-400 font-bold uppercase">Loyer possible</span>
                        <span className="text-[12px] font-bold text-blue-800">{fmtEur((autoCoeffs?.loyer || 0) * (bpResults.sumCA - bpResults.sumOpex) / 20)}</span>
                      </div>
                      <div className="flex flex-col items-center p-1 bg-amber-50/50 rounded border border-amber-100">
                        <span className="text-[10px] text-amber-500 font-bold uppercase">Soulte possible</span>
                        <span className="text-[12px] font-bold text-amber-700">{fmtEur((autoCoeffs?.soulte || 0) * (bpResults.sumCA - bpResults.sumOpex) / 2)}</span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-50 rounded p-2 border border-slate-100 flex justify-between items-center mt-1">
                       <span className="text-[10px] text-slate-400 font-bold uppercase">Loyer annuel actuel :</span>
                       <span className="text-sm font-black text-slate-800">{fmtEur(bpResults.loyer)}</span>
                    </div>
                 </div>

                 <div className="space-y-0.5 pt-1 border-t border-slate-100">
                   <div className="flex justify-between text-[11px]"><span className="text-slate-400 font-bold uppercase">CA 20 ans :</span><span className="font-bold text-blue-800">{fmtEur(bpResults.sumCA)}</span></div>
                   <div className="flex justify-between text-[11px]"><span className="text-slate-400 font-bold uppercase">Gains 20 ans :</span><span className="font-bold text-green-700">{fmtEur(bpResults.gains)}</span></div>
                   <div className="flex justify-between text-[11px]"><span className="text-slate-400 font-bold uppercase">TRI FP :</span><span className="font-bold text-green-600">{fmtPct(bpResults.triFP)}</span></div>
                   <div className="flex justify-between text-[11px]"><span className="text-slate-400 font-bold uppercase">RETOUR :</span><span className="font-bold text-blue-600">{fmt(bpResults.payback || bpResults.tempsRetour || 0, 1)} ans</span></div>
                   <div className="flex justify-between text-[11px] pt-1 mt-1 border-t border-slate-50">
                      <span className="text-slate-400 font-bold uppercase">Prix au Wc global :</span>
                      <span className="font-bold text-slate-700">{fmtEur(totalInvestissement / (bpResults.rows[0]?.kwcDeg || 1))} /Wc</span>
                   </div>
                 </div>
               </div>
            </SectionCard>
          </div>
        </div>
      </div>

        {/* Battery Section (Full Width) */}
        {params.batteryConfig?.enabled && (
          <div className="w-full">
             <BatterySection config={params.batteryConfig} setParams={setParams} />
          </div>
        )}

        {/* Page 2 (or 3 if battery) */}
        <div id="pdf-section-2" className="pdf-header-container bg-white rounded-lg border border-slate-200 p-6 pt-12 relative overflow-hidden">
          <div className="mt-4">
            <TableauPrevisionnel params={collapsedParams} rows={rows} apport10={bpResults.apport10} />
          </div>
        </div>
      </div>
  );
}

// ─── Tab: SUIVI ───────────────────────────────────────────────────────────────

function TabSuivi({ projects, projectEdits, updateProjectEdit }) {
  const SUIVI_COLS = [
    { key: 'nom', label: 'Nom projet', width: 160 }, // C
    { key: 'dev', label: 'Dev.', width: 60 }, // B
    { key: 'spv', label: 'SPV', width: 100 }, // D
    { key: 'kwc', label: 'Capacité', width: 80 }, // E
    { key: 'adresse', label: 'Adresse', width: 220 }, // F
    { key: 'commune', label: 'Commune', width: 140 }, // G
    { key: 'cp', label: 'CP', width: 70 }, // H
    { key: 'gps', label: 'GPS', width: 140 }, // I
    { key: 'tel', label: 'Tél.', width: 110 }, // J
    { key: 'zone_sism', label: 'Z. Sism.', width: 70 }, // K
    { key: 'zone_vent', label: 'Z. Vent (Q)', width: 90, editable: true }, // Q
    { key: 'zone_neige', label: 'Z. Neige (R)', width: 90, editable: true }, // R
    { key: 'altitude', label: 'Alt. (m) (S)', width: 90, editable: true }, // S
    { key: 'type_trav', label: 'Type trav. (T)', width: 110, editable: true }, // T
    { key: 'type_bat', label: 'Type bat. (U)', width: 140, editable: true }, // U
    { key: 'nb_trav_omb', label: 'Tr. OMB (V)', width: 90, editable: true }, // V
    // Colonnes calculées (lookup)
    { key: 'larg_trav', label: 'L. Travée (AC)', width: 90 },
    { key: 'hSud', label: 'H. Sud (AD)', width: 80 },
    { key: 'hNord', label: 'H. Nord (AE)', width: 80 },
    { key: 'faitage', label: 'Faitage (AF)', width: 80 },
    { key: 'long_remp_s', label: 'L. Remp S (AG)', width: 90 },
    { key: 'long_remp_n', label: 'L. Remp N (AH)', width: 90 },
    { key: 'surf_s', label: 'Surf S (AI)', width: 80 },
    { key: 'surf_n', label: 'Surf N (AJ)', width: 80 },
    { key: 'surf_tot', label: 'Surf Tot (AK)', width: 80 },
    { key: 'axe_s', label: 'Axe S (AL)', width: 80 },
    // Colonnes éditables demandées
    { key: 'ax', label: 'AX', width: 70, editable: true },
    { key: 'ay', label: 'AY', width: 70, editable: true },
    { key: 'az', label: 'AZ', width: 70, editable: true },
    { key: 'ba', label: 'BA', width: 70, editable: true },
    { key: 'bv', label: 'BV (H.Bas 1)', width: 90, editable: true },
    { key: 'bw', label: 'BW (H.Bas 2)', width: 90, editable: true },
    { key: 'bx', label: 'BX (H.Bas 3)', width: 90, editable: true },
    { key: 'by', label: 'BY (H.Bas 4)', width: 90, editable: true },
    { key: 'bz', label: 'BZ (H.N 1)', width: 80, editable: true },
    { key: 'ca', label: 'CA (H.N 2)', width: 80, editable: true },
    { key: 'cb', label: 'CB (H.N 3)', width: 80, editable: true },
    { key: 'cc', label: 'CC (H.N 4)', width: 80, editable: true },
    { key: 'cd', label: 'CD (H.F 1)', width: 80, editable: true },
    { key: 'ce', label: 'CE (H.F 2)', width: 80, editable: true },
    { key: 'cf', label: 'CF (H.F 3)', width: 80, editable: true },
    { key: 'cg', label: 'CG (H.F 4)', width: 80, editable: true },
    { key: 'ch', label: 'CH (L.Bat 1)', width: 80, editable: true },
    { key: 'ci', label: 'CI (L.Bat 2)', width: 80, editable: true },
    { key: 'cj', label: 'CJ (L.Bat 3)', width: 80, editable: true },
    { key: 'ck', label: 'CK (L.Bat 4)', width: 80, editable: true },
    { key: 'cl', label: 'CL (Long 1)', width: 80, editable: true },
    { key: 'cm', label: 'CM (Long 2)', width: 80, editable: true },
    { key: 'cn', label: 'CN (Long 3)', width: 80, editable: true },
    { key: 'co', label: 'CO (Long 4)', width: 80, editable: true },
    { key: 'hl', label: 'Dist. HT (HL)', width: 90, editable: true },
    { key: 'hm', label: 'Dist. Priv (HM)', width: 90, editable: true },
    { key: 'dv', label: 'Puissance Modules (DV)', width: 120, editable: true, type: 'select' },
    { key: 'dw', label: 'Long. Modules (DW)', width: 100 },
    { key: 'dx', label: 'Larg. Modules (DX)', width: 100 },
    { key: 'dy', label: 'Ratio Wc/m² (DY)', width: 100 },
    { key: 'dz', label: 'Espace Faitage (DZ)', width: 100, editable: true },
    { key: 'ea', label: 'Espace Petit (EA)', width: 100, editable: true },
    { key: 'eb', label: 'Espace Grand (EB)', width: 100, editable: true },
    { key: 'ds', label: 'Surf. Tot. (DS)', width: 100 },
    { key: 'dt', label: 'Poids Acier (DT)', width: 100, editable: true },
    { key: 'du', label: 'Nb Jours (DU)', width: 80, editable: true },
    { key: 'hn', label: 'Coût Centrale (HN)', width: 100 },
    { key: 'ho', label: 'Coût Charpente (HO)', width: 100 },
    { key: 'hp', label: 'Investissement HT (HP)', width: 120 },
    { key: 'hq', label: 'Investissement TTC (HQ)', width: 120 },
    { key: 'hr', label: 'Apport (HR)', width: 100 },
    { key: 'hs', label: 'Emprunt (HS)', width: 100 },
    { key: 'ht', label: 'DSCR Moyen (HT)', width: 100 },
    { key: 'hu', label: 'Tri Projet (HU)', width: 100 },
    { key: 'hv', label: 'Tri FP (HV)', width: 100 },
    { key: 'hw', label: 'Temps de retour (HW)', width: 120 },
    { key: 'hx', label: 'Loyer / Soulte (HX)', width: 100 },
  ];

  const getRowValue = (row, k) => {
    if (projectEdits[row.id] && projectEdits[row.id][k] !== undefined) return projectEdits[row.id][k];
    return row[k];
  };

  const dbRowsRaw = useMemo(() => {
    return projects 
      .filter(p => p.bpAcamaState)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .map((p) => ({
        id: p.id,
        nom: p.name,
        dev: 'ACAMA',
        spv: p.bpAcamaState?.spv || 'CH-TTPAGE',
        kwc: p.bpAcamaState?.kwc || p.puissance || '',
        adresse: p.address || p.urbanData?.address || '',
        commune: p.city || p.urbanData?.city || '',
        cp: p.zip_code || p.urbanData?.zip_code || '',
        gps: (p.lat && p.lng) ? `${fmt(p.lat,4)} / ${fmt(p.lng,4)}` : '',
        tel: p.phone || '',
        altitude: p.urbanData?.alti || p.urbanData?.altitude || p.altitude || '', 
        type_trav: p.bpAcamaState?.buildings?.[0]?.projectType || 'BAC',
        type_bat: p.bpAcamaState?.buildings?.[0]?.typeBat || '',
        nb_hang: p.bpAcamaState?.buildings?.length || 1,
        categorie: p.category || 'Agricole',
        zone_vent: p.windZone || p.vent || p.urbanData?.vents || '',
        zone_neige: p.snowZone || p.neige || p.urbanData?.neige || '',
        // Auto-fill distance from first building if exists
        hl: p.bpAcamaState?.buildings?.[0]?.distHta || '',
        hm: p.bpAcamaState?.buildings?.[0]?.distPriv || '',
        // Map multiple building heights/lengths for BV-CO range
        bv: p.bpAcamaState?.buildings?.[0]?.hBas || '',
        bw: p.bpAcamaState?.buildings?.[1]?.hBas || '',
        bx: p.bpAcamaState?.buildings?.[2]?.hBas || '',
        by: p.bpAcamaState?.buildings?.[3]?.hBas || '',
        bz: p.bpAcamaState?.buildings?.[0]?.hNord || '',
        ca: p.bpAcamaState?.buildings?.[1]?.hNord || '',
        cb: p.bpAcamaState?.buildings?.[2]?.hNord || '',
        cc: p.bpAcamaState?.buildings?.[3]?.hNord || '',
        cd: p.bpAcamaState?.buildings?.[0]?.hFait || '',
        ce: p.bpAcamaState?.buildings?.[1]?.hFait || '',
        cf: p.bpAcamaState?.buildings?.[2]?.hFait || '',
        cg: p.bpAcamaState?.buildings?.[3]?.hFait || '',
        ch: p.bpAcamaState?.buildings?.[0]?.largeur || '',
        ci: p.bpAcamaState?.buildings?.[1]?.largeur || '',
        cj: p.bpAcamaState?.buildings?.[2]?.largeur || '',
        ck: p.bpAcamaState?.buildings?.[3]?.largeur || '',
        cl: p.bpAcamaState?.buildings?.[0]?.longueur || '',
        cm: p.bpAcamaState?.buildings?.[1]?.longueur || '',
        cn: p.bpAcamaState?.buildings?.[2]?.longueur || '',
        co: p.bpAcamaState?.buildings?.[3]?.longueur || '',
        dv: p.bpAcamaState?.puissanceUnitaire || 460,
        dz: 0.2,
        ea: 0.02,
        eb: 0.02,
        dt: '',
        du: '',
        bpState: p.bpAcamaState,
      }));
  }, [projects]);

  const [localRows, setLocalRows] = useState([]);
  const addRow = () => setLocalRows(r => [{ id: `local-${Date.now()}`, dev: 'ACAMA', nom: '', spv: 'CH-TTPAGE' }, ...r]);

  const allRows = useMemo(() => {
    return [...dbRowsRaw, ...localRows].map(row => {
      const edit = projectEdits[row.id] || {};
      const fullRow = { ...row, ...edit };
      
      const typeBat = fullRow.type_bat;
      const batData = DETAILED_SUIVI_DATA.find(d => d.type === typeBat);
      
      // Module Dims & Ratio
      const dims = getModuleDims(fullRow.dv || 460);
      fullRow.dw = dims.length;
      fullRow.dx = dims.width;
      fullRow.dy = (fullRow.dw && fullRow.dx) ? (Number(fullRow.dv) / (fullRow.dw * fullRow.dx)).toFixed(2) : '';

      // Financials
      if (fullRow.bpState) {
        const bp = computeBusinessPlan({ ...fullRow.bpState, puissanceUnitaire: Number(fullRow.dv) });
        fullRow.hn = fmtEur(bp.coutCentrale);
        fullRow.ho = fmtEur(bp.coutCharpente);
        fullRow.hp = fmtEur(bp.totalInvestissement);
        fullRow.hq = fmtEur(bp.totalInvestissement * 1.2);
        fullRow.hr = fmtEur(bp.totalInvestissement * 0.1);
        fullRow.hs = fmtEur(bp.emprunt);
        fullRow.ht = fmt(bp.dscrMoyen, 2);
        fullRow.hu = fmtPct(bp.triP);
        fullRow.hv = fmtPct(bp.triFp);
        fullRow.hw = fmt(bp.payback, 1) + " ans";
        fullRow.hx = bp.soulte > 0 ? fmtEur(bp.soulte) : fmtEur(bp.loyerAnnuel);
        fullRow.ds = fmt(bp.surfaceTotale || 0, 0);
      }

      const getVal = (k, def) => (fullRow[k] !== undefined && fullRow[k] !== '') ? fullRow[k] : (batData?.[k] || def);

      return {
        ...fullRow,
        larg_trav: getVal('larg_trav', batData?.lTravee),
        hSud: getVal('hSud', batData?.hSud),
        hNord: getVal('hNord', batData?.hNord),
        faitage: getVal('faitage', batData?.hFait),
        long_remp_s: getVal('long_remp_s', batData?.lRemS),
        long_remp_n: getVal('long_remp_n', batData?.lRemN),
        surf_s: getVal('surf_s', batData?.sSud),
        surf_n: getVal('surf_n', batData?.sNord),
        surf_tot: getVal('surf_tot', batData?.sTot),
        axe_s: getVal('axe_s', batData?.axeS),
      };
    });
  }, [dbRowsRaw, localRows, projectEdits]);

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
      }
    }
  };

  return (
    <div className="p-4 h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Button size="sm" onClick={addRow} className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-7">
          <Plus className="w-3 h-3 mr-1" /> Nouvelle ligne
        </Button>
        <span className="text-sm text-slate-500">{allRows.length} projets</span>
      </div>
      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg shadow-sm bg-white" {...useDragScroll()}>
        <table className="text-[12px] border-collapse min-w-max">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-600 px-2 py-2 w-8">↑↓</th>
              {SUIVI_COLS.map(c => (
                <th key={c.key} style={{ width: c.width }} className="border border-slate-600 px-2 py-2 font-semibold text-center whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="border border-slate-600 px-2 py-2 w-8">✕</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr key={row.id} className={cn('hover:bg-blue-50/30 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>
                <td className="border border-slate-200 p-0 text-center">
                  <div className="flex flex-col items-center opacity-30 select-none">
                    <ChevronUp className="w-3 h-3" />
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </td>
                {SUIVI_COLS.map(c => {
                  const val = row[c.key] ?? '';
                  const isCalculated = !c.editable && ['larg_trav','hSud','hNord','faitage','long_remp_s','long_remp_n','surf_s','surf_n','surf_tot','axe_s'].includes(c.key);
                  return (
                    <td key={c.key} className={cn("border border-slate-200 p-0 relative", isCalculated && "bg-slate-100/50")}>
                      {c.editable ? (
                        c.type === 'select' ? (
                          <select 
                            className="w-full px-2 py-1.5 bg-blue-50/20 outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-center appearance-none"
                            value={val}
                            onChange={e => updateAnyRow(row.id, c.key, e.target.value)}
                          >
                            <option value="">Sélectionner...</option>
                            {c.key === 'dv' && MODULE_TYPES.map(m => <option key={m.power} value={m.power}>{m.power}</option>)}
                          </select>
                        ) : (
                          <input
                            className="w-full px-2 py-1.5 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-center transition-all bg-blue-50/20"
                            value={val}
                            onChange={e => updateAnyRow(row.id, c.key, e.target.value)}
                          />
                        )
                      ) : (
                        <div className="w-full px-2 py-1.5 text-center truncate select-all">{val}</div>
                      )}
                    </td>
                  );
                })}
                <td className="border border-slate-200 text-center">
                  <button onClick={() => delAnyRow(row.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
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

// ─── Tab: SUIVI BAT TYPE ─────────────────────────────────────────────────────

function TabSuiviBatType({ batEdits, updateBatEdit, activeSuiviBatData, localRows, setLocalRows, saveSuiviBatData, isSaving }) {
  const keys = ['type','spv','kwc','cout_bat','massifs','longueur','largeur','travees','hSud','hNord','faitage','surfSud','surfNord','surfTot','penteSud','penteNord','modH','modL','totalMod','puissMax','prodMoyen'];
  const cols = [
    'Type','SPV','KWc','Coût bat. (€)','Massifs','Long. (m)','Larg. (m)','Travées',
    'H. Sud (m)','H. Nord (m)','Faitage (m)','Surf Sud (m²)','Surf Nord (m²)','Surf Tot (m²)',
    'Pente Sud (°)','Pente Nord (°)','Mod H','Mod L','Total Mod','Puiss Max (KWc)','Prod Moyen'
  ];

  const allRows = activeSuiviBatData;

  const getVal = (row, k) => {
    if (batEdits[row.id] && batEdits[row.id][k] !== undefined) return batEdits[row.id][k];
    return row[k];
  };

  const moveRow = (index, direction) => {
    const newRows = [...localRows];
    // This logic only works for localRows if they are contiguous at the end or if we reorder the whole activeSuiviBatData
    // For now, let's keep it simple: reordering is only for localRows
    const baseCount = allRows.length - localRows.length;
    const localIndex = index - baseCount;
    if (localIndex < 0) return; // Cannot move base rows yet

    const targetIndex = localIndex + direction;
    if (targetIndex < 0 || targetIndex >= newRows.length) return;
    [newRows[localIndex], newRows[targetIndex]] = [newRows[targetIndex], newRows[localIndex]];
    setLocalRows(newRows);
  };

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={() => setLocalRows(r => [{ id: `local-${Date.now()}`, type:'', spv:'', kwc:0, cout_bat:0, massifs:0, longueur:0, largeur:0, travees:0, hSud:0, hNord:0, faitage:0, surfSud:0, surfNord:0, surfTot:0, penteSud:0, penteNord:0, modH:0, modL:0, totalMod:0, puissMax:0, prodMoyen:0 }, ...r])} 
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9 px-4"
          >
            <Plus className="w-4 h-4 mr-2" /> Nouvelle ligne
          </Button>
          <p className="text-[11px] text-slate-400 italic ml-2">Les nouvelles lignes seront ajoutées au catalogue après enregistrement.</p>
        </div>

        <Button 
          size="sm" 
          onClick={saveSuiviBatData} 
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9 px-6 shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Enregistrer les modifications</>
          )}
        </Button>
      </div>

      <div {...useDragScroll()} className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white shadow-inner">
        <table className="text-[12px] border-collapse min-w-max w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-white shadow-md">
              <th className="border border-slate-700 px-2 py-2 w-10">↑↓</th>
              {cols.map(c => <th key={c} className="border border-slate-700 px-3 py-2 font-semibold text-center whitespace-nowrap">{c}</th>)}
              <th className="border border-slate-700 px-2 py-2 w-10">✕</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => {
              const isLocal = row.id?.toString().startsWith('local-');
              const hasEdit = !!batEdits[row.id];
              
              return (
                <tr key={row.id || i} className={cn(
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50', 
                  "hover:bg-blue-50/40 transition-colors group",
                  hasEdit && "bg-amber-50/30"
                )}>
                  <td className="border border-slate-100 p-0 text-center">
                    {isLocal && (
                      <div className="flex flex-col items-center opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveRow(i, -1)} className="text-slate-400 hover:text-blue-500"><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={() => moveRow(i, 1)} className="text-slate-400 hover:text-blue-500"><ChevronDown className="w-3 h-3" /></button>
                      </div>
                    )}
                  </td>
                  {keys.map(k => (
                    <td key={k} className={cn(
                      "border border-slate-100 p-0 relative",
                      batEdits[row.id]?.[k] !== undefined && "bg-amber-100/40"
                    )}>
                      <input
                        className="w-full px-3 py-2 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 text-center transition-all font-medium text-slate-700"
                        value={getVal(row, k)}
                        onChange={e => updateBatEdit(row.id, k, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="border border-slate-100 text-center">
                    {isLocal && (
                      <button onClick={() => setLocalRows(prev => prev.filter(r => r.id !== row.id))} className="text-slate-300 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
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

function TabData() {
  const [rows, setRows] = useState([...DETAILED_SUIVI_DATA]);

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
    { key: 'bPO_d', label: 'BP PO (Dim)', width: 80 },
    { key: 'bPO_e', label: 'BP PO (€)', width: 80 },
    { key: 'bPE_d', label: 'BP PE (Dim)', width: 80 },
    { key: 'bPE_e', label: 'BP PE (€)', width: 80 },
    { key: 'bLN_d', label: 'BP LP N (Dim)', width: 80 },
    { key: 'bLN_e', label: 'BP LP N (€)', width: 80 },
    { key: 'bLS_d', label: 'BP LP S (Dim)', width: 80 },
    { key: 'bLS_e', label: 'BP LP S (€)', width: 80 },
    { key: 'chS', label: 'Chéneau S', width: 80 },
    { key: 'chN', label: 'Chéneau N', width: 80 },
    { key: 'faitage', label: 'Faitage v.', width: 80 },
    { key: 'anticond', label: 'Anti-cond.', width: 80 },
  ];

  const update = (id, k, v) => setRows(r => r.map(row => row.id === id ? { ...row, [k]: v } : row));

  const moveRow = (index, direction) => {
    const newRows = [...rows];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newRows.length) return;
    [newRows[index], newRows[targetIndex]] = [newRows[targetIndex], newRows[index]];
    setRows(newRows);
  };

  return (
    <div className="p-4 overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Button size="sm" onClick={() => setRows(r => [{ id: Date.now(), type:'' }, ...r])} className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-7">
          <Plus className="w-3 h-3 mr-1" /> Nouvelle ligne
        </Button>
      </div>
      <div {...useDragScroll()} className="flex-1 overflow-auto border border-slate-200 rounded-lg shadow-sm bg-white">
        <table className="text-[12px] border-collapse min-w-max">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-600 px-2 py-2 w-8">↑↓</th>
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
                <td className="border border-slate-200 p-0 text-center">
                  <div className="flex flex-col items-center">
                    <button onClick={() => moveRow(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-blue-500 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1} className="text-slate-400 hover:text-blue-500 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                </td>
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
    faitA: '', faitLe: new Date().toLocaleDateString('fr-FR'),
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
    <div id="prop-bac-content" className="p-4 bg-slate-100 min-h-full overflow-auto">
      <div className="max-w-[1200px] mx-auto bg-white shadow-xl p-8 border border-slate-300 rounded-sm">
        <div data-html2canvas-ignore="true" className="flex justify-between items-center mb-8 bg-white">
          <div className="flex items-center gap-4">
             <div className="px-3 py-2 bg-[#002060] rounded-sm flex items-center justify-center text-white font-black text-lg">BAC</div>
             <h2 className="text-2xl font-black text-[#002060] uppercase tracking-tighter">Proposition Client BAC</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <ProjectSelect 
                projects={projects || []} 
                activeProjectId={selectedProject?.id} 
                onSelect={(id) => setSelectedProject((projects || []).find(p => p.id === id))} 
              />
            </div>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => generateBpAcamaPDF({ 
              elementId: 'prop-bac-content', 
              fileName: `Proposition_BAC_${selectedProject?.name || 'Client'}.pdf`,
              orientation: 'portrait',
              clean: true
            })}>
              <FileDown className="w-4 h-4" /> PDF
            </Button>
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
            <div className="mt-4 border border-slate-300 p-4 bg-white text-[12px]">
              <div className="font-bold text-[#002060] mb-2 uppercase border-b border-slate-200 pb-1">Remarques :</div>
              <textarea className="w-full bg-transparent outline-none text-slate-800 resize-none min-h-[220px]" value={data.remarques} onChange={e => update('remarques', e.target.value)} />
            </div>
          </div>
        </div>
        <SignatureArea data={data} update={update} />
      </div>
    </div>
  );
}

function TabPropositionBE({ projects, selectedProject, setSelectedProject, params, bpResults }) {
  const [data, setData] = useState({
    nomProjet: '', mixte: 'NON', typeBat: '', zoneNeige: 'N/A', zoneVent: 'N/A', altitude: 'N/A', gps: '', superficie: 'N/A',
    prodMoyen: '', puissance: '', tarif: '', ombrage: 'NON', longTranchee: '30', distPublique: '173', soulte: '', optionOffert: '',
    dateRealisation: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    dateValidite: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    pcComplete: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    depotDepose: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    realiseBy: 'S.B', valideBy: 'A.M', remarques: '',
    faitA: '', faitLe: new Date().toLocaleDateString('fr-FR'),
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
        soulte: bpResults?.soulte || params?.soulte || '',
      }));
    }
  }, [selectedProject, params, bpResults]);


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
    <div id="prop-be-content" className="p-4 bg-slate-100 min-h-full overflow-auto">
      <div className="max-w-[1200px] mx-auto bg-white shadow-xl p-8 border border-slate-300 rounded-sm">
        <div data-html2canvas-ignore="true" className="flex justify-between items-center mb-8 bg-white">
          <div className="flex items-center gap-4">
             <div className="px-3 py-2 bg-[#002060] rounded-sm flex items-center justify-center text-white font-black text-lg">BE</div>
             <h2 className="text-2xl font-black text-[#002060] uppercase tracking-tighter">Proposition Client BE</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <ProjectSelect 
                projects={projects || []} 
                activeProjectId={selectedProject?.id} 
                onSelect={(id) => setSelectedProject((projects || []).find(p => p.id === id))} 
              />
            </div>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => generateBpAcamaPDF({ 
              elementId: 'prop-be-content', 
              fileName: `Proposition_BE_${selectedProject?.name || 'Client'}.pdf`,
              orientation: 'portrait',
              clean: true
            })}>
              <FileDown className="w-4 h-4" /> PDF
            </Button>
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
                <textarea className="w-full bg-transparent outline-none text-slate-800 resize-none min-h-[180px]" value={data.remarques} onChange={e => update('remarques', e.target.value)} />
              </div>
            </Section>
          </div>
        </div>
        <SignatureArea data={data} update={update} />
      </div>
    </div>
  );
}

function TabDevis({ projects, selectedProject, setSelectedProject, params, setParams, activeSuiviBatData }) {
  const [data, setData] = useState({
    dateDevis: new Date().toLocaleDateString('fr-FR'), dateValidite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
    etudeRenfort: 0, etudeImplant: 0, etudeNoteCalcul: 0, etudeCalepinage: 0, transportCharpente: 0, fournitureBac: 0, anticondensation: 0,
    transportCouverture: 0, levage: 0, securite: 0, montage: 0, etudeElec: 0, securiteElec: 0, poseModules: 0,
    faitA: '', faitLe: new Date().toLocaleDateString('fr-FR'),
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
      <div className={cn("text-[13px] flex-1", isHeader && "uppercase tracking-wider text-sm")}>{label}</div>
      <div className="flex items-center gap-2 w-32">
        {onChange ? (
          <input
            type="text"
            className="w-full bg-transparent text-right outline-none text-[13px] px-1 font-medium border-b border-transparent focus:border-blue-400 focus:bg-blue-50 focus:rounded"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <div className="w-full text-right text-[13px] font-bold">{typeof value === 'number' ? fmt(value, 0) : (value ?? '—')}</div>
        )}
        <div className="w-8 text-[11px] text-slate-400 text-right uppercase font-bold">{unit}</div>
      </div>
    </div>
  );

  return (
    <div id="tab-devis-content" className="p-4 flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="max-w-[1200px] mx-auto w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-auto flex flex-col no-scrollbar">
        <div data-html2canvas-ignore="true" className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3"><FileDown className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-slate-800">DEVIS TECHNIQUE</h3></div>
          <div className="flex items-center gap-4">
             <div className="w-64">
               <ProjectSelect 
                 projects={projects || []} 
                 activeProjectId={selectedProject?.id} 
                 onSelect={(id) => setSelectedProject((projects || []).find(p => p.id === id))} 
               />
             </div>
                          <Button size="sm" variant="outline" className="gap-2 shadow-sm border-slate-300 text-slate-900 font-bold" onClick={() => generateBpAcamaPDF({ 
               elementId: 'tab-devis-content', 
               fileName: `Devis_Technique_${selectedProject?.name || 'Projet'}.pdf` ,
               orientation: 'portrait',
               clean: true
             })}>
               <FileDown className="w-4 h-4" /> PDF
             </Button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-8 p-4 bg-slate-50 rounded-lg border border-slate-100 text-[12px]">
             <div className="space-y-2">
               <div className="flex items-center gap-3"><span className="text-slate-500 font-medium w-40">Date de validité :</span><input className="bg-white border border-slate-200 rounded px-2 py-1 outline-none w-32 shadow-sm" value={data.dateValidite} onChange={e => update('dateValidite', e.target.value)} /></div>
               <div className="flex items-center gap-3 mt-4">
                  <span className="text-slate-500 font-medium w-40">Type de bâtiment :</span>
                  <select
                    className="bg-white border border-slate-200 rounded px-2 py-1 outline-none w-48 shadow-sm text-sm"
                    value={params.typeBat || ''}
                    onChange={e => {
                      const selectedType = e.target.value;
                      const bat = (activeSuiviBatData || []).find(b => b.type === selectedType);
                      
                      if (selectedType === selectedProject?.bpAcamaState?.typeBat) {
                        setParams(p => ({ ...p, ...selectedProject.bpAcamaState }));
                        return;
                      }

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
                    <option value="">Sélectionner...</option>
                    {activeSuiviBatData.map(b => <option key={b.type} value={b.type}>{b.type}</option>)}
                  </select>
               </div>
             </div>
             <div className="text-right flex flex-col items-end">
                 <div className="bg-[#002060] text-white p-4 rounded-md shadow-md text-left min-w-[300px]">
                  <div className="font-bold uppercase text-[12px] tracking-widest text-blue-200">Informations Client</div>
                  <div className="space-y-1 text-sm">
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
              <div className="bg-blue-50/30 px-3 py-1 text-[12px] font-bold text-blue-700 uppercase tracking-tighter">Études techniques</div>
              <Row label="  • Étude de renforcement" value={data.etudeRenfort} unit="€ HT" onChange={v => update('etudeRenfort', v)} />
              <Row label="  • Plan d'implantation & descente de charge" value={data.etudeImplant} unit="€ HT" onChange={v => update('etudeImplant', v)} />
              <Row label="  • Plan d'ensemble & note de calcul" value={data.etudeNoteCalcul} unit="€ HT" onChange={v => update('etudeNoteCalcul', v)} />
              <Row label="  • Plan de calepinage couverture" value={data.etudeCalepinage} unit="€ HT" onChange={v => update('etudeCalepinage', v)} />
              <div className="bg-blue-50/30 px-3 py-1 text-[12px] font-bold text-blue-700 uppercase tracking-tighter">Ossature & Charpente</div>
              <Row label="  • Coût matériel Charpente (BP)" value={params?.coutCharpente} unit="€ HT" />
              <Row label="  • Largeur totale extérieur poteaux" value={fmt(largBat, 2)} unit="ml" />
              <Row label="  • Longueur totale" value={fmt(longBat, 2)} unit="ml" />
              <Row label="  • Nbre de travées / Largeur travée" value={`${nbTravees} u / ${fmt(largTravee, 2)} ml`} />
              <Row label="  • Transport et déchargement charpente" value={data.transportCharpente} unit="€ HT" onChange={v => update('transportCharpente', v)} />
              <div className="bg-blue-50/30 px-3 py-1 text-[12px] font-bold text-blue-700 uppercase tracking-tighter">Couverture & Finitions</div>
              <Row label="  • Fourniture Bac Acier (BAC ACIER)" value={data.fournitureBac} unit="€ HT" onChange={v => update('fournitureBac', v)} />
              <Row label="  • Surface couverture totale" value={fmt(surface, 0)} unit="m²" />
              <Row label="  • Film anti-condensation / Épaisseur 75/100" value={data.anticondensation} unit="€ HT" onChange={v => update('anticondensation', v)} />
              <Row label="  • Transport et déchargement couverture" value={data.transportCouverture} unit="€ HT" onChange={v => update('transportCouverture', v)} />
            </div>
            <div>
              <div className="bg-blue-50/30 px-3 py-1 text-[12px] font-bold text-blue-700 uppercase tracking-tighter">Pose & Logistique</div>
              <Row label="  • Location engins de levage & montage" value={data.levage} unit="€ HT" onChange={v => update('levage', v)} />
              <Row label="  • Sécurité chantier (EPI / EPC)" value={data.securite} unit="€ HT" onChange={v => update('securite', v)} />
              <Row label="  • Montage charpente & pose couverture" value={data.montage} unit="€ HT" onChange={v => update('montage', v)} />
              <Row label="SOUS-TOTAL LOT BÂTIMENT" value={subtotalBat} unit="€ HT" isSubtotal />
              <div className="h-4 bg-white" />
              <Row label="LOT ÉLECTRICITÉ (Photovoltaïque)" isHeader />
              <div className="bg-blue-50/30 px-3 py-1 text-[12px] font-bold text-blue-700 uppercase tracking-tighter">Ingénierie & Sécurité</div>
              <Row label="  • Développement, Raccordement & Études PV" value={data.etudeElec} unit="€ HT" onChange={v => update('etudeElec', v)} />
              <Row label="  • Sécurité électrique & Travaux" value={data.securiteElec} unit="€ HT" onChange={v => update('securiteElec', v)} />
              <div className="bg-blue-50/30 px-3 py-1 text-[12px] font-bold text-blue-700 uppercase tracking-tighter">Matériel & Pose</div>
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
              <div className="space-y-1"><span className="text-sm text-slate-400 font-bold uppercase tracking-tighter">Montant Total du Devis</span><p className="text-[12px] text-slate-500 max-w-sm italic leading-tight">Ce devis est une estimation basée sur les paramètres techniques du projet. Une étude de sol et un levé topographique sont nécessaires pour validation finale.</p></div>
              <div className="text-right"><span className="text-sm text-blue-400 font-bold block mb-1">TOTAL HT</span><span className="text-3xl font-black tabular-nums">{fmtEur(totalHT)}</span></div>
            </div>
          </div>
          <SignatureArea data={data} update={update} />
        </div>
      </div>
    </div>
  );
}

// ─── Tab: BP Sauvegardés ───────────────────────────────────────────────────

function TabBpSaved({ projects, onSelect, activeTab, setActiveTab, isGreenInvest }) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const savedProjects = useMemo(() => {
    return projects
      .filter(p => {
        if (!p.bpAcamaState) return false;
        const pTenant = p.tenantId || p.tenant || p.bpAcamaState?.tenantId || p.bpAcamaState?.tenant;
        const normalizedTenant = (pTenant === 'greeninvest' || pTenant === 'green-invest') ? 'green-invest' : pTenant;
        const pName = (p.name || '').toUpperCase();
        const isKnownAcama = pName.includes('PAPA') || pName.includes('BATIOT') || pName.includes('POUDERAU');
        
        if (isGreenInvest) {
          if (isKnownAcama) return false;
          return normalizedTenant === 'green-invest' || !normalizedTenant;
        } else {
          if (isKnownAcama) return true;
          return normalizedTenant === 'acama';
        }
      })
      .map(p => {
        // Enrichment logic to ensure calculations match the Business Plan tab
        const state = p.bpAcamaState || {};
        const buildings = state.buildings || [];
        
        // Sum building powers 
        const kwcTotal = buildings.reduce((acc, b) => acc + (parseFloat(b.kwc) || 0), 0);
        
        // Sum building costs
        const totalCentrale = buildings.reduce((sum, b) => sum + (parseFloat(b.coutCentrale) || 0), 0);
        const totalCharpente = buildings.reduce((sum, b) => sum + (parseFloat(b.coutCharpente) || 0), 0);
        
        // Global fields from ROOT of state (important: these were missing in previous calc)
        const totalRaccordement = parseFloat(state.raccordement) || 0;
        const totalFrais = parseFloat(state.frais) || 0;
        const totalSoulte = parseFloat(state.soulte) || 0;
        
        // Productible weighted average
        const totalProdKwh = buildings.reduce((sum, b) => sum + (parseFloat(b.kwc) || 0) * (parseFloat(b.productible) || 0), 0);
        const averageProd = kwcTotal > 0 ? totalProdKwh / kwcTotal : 0;
        
        // Total technical construction cost
        const totalConst = totalCentrale + totalCharpente + totalRaccordement + totalFrais;
          
        const collapsedForSaved = {
          ...state,
          kwc: kwcTotal,
          productible: averageProd || 1123.08,
          coutCentrale: totalCentrale,
          coutCharpente: totalCharpente,
          raccordement: totalRaccordement,
          frais: totalFrais,
          soulte: totalSoulte,
          totalInvestissement: totalConst * 1.2
        };

        const rac = computeResteACharge(collapsedForSaved);
        const bp = computeBusinessPlan({ ...collapsedForSaved, apport: rac });
        
        return { ...p, bpResults: bp, totalKwc: kwcTotal };
      })
      .sort((a, b) => {
        const dateA = parseFirestoreDate(a.updatedAt || a.createdAt) || new Date(0);
        const dateB = parseFirestoreDate(b.updatedAt || b.createdAt) || new Date(0);
        return dateB - dateA;
      });
  }, [projects, isGreenInvest]);

  const toggleAll = () => {
    if (selectedIds.size === savedProjects.length && savedProjects.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(savedProjects.map(p => p.id)));
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const exportToExcel = () => {
    const selectedData = savedProjects
      .filter(p => selectedIds.has(p.id))
      .map(p => {
        const state = p.bpAcamaState || {};
        const batTypes = (state.buildings || []).map(b => b.typeBat).filter(Boolean).join(', ');
        const d = parseFirestoreDate(p.updatedAt || p.createdAt);
        
        return {
          'Projet': p.name,
          'Adresse': p.address || '',
          'Commune': p.city || '',
          'Type Bat.': batTypes || '',
          'Puissance (kWc)': (p.totalKwc || 0).toFixed(1),
          'Tarif TB (€)': state.tarifBas || 0,
          'Tarif ACC (€)': state.tarifACC || 0,
          'Part ACC (%)': ((state.partACC || 0) * 100).toFixed(0),
          'DSCR 20a (%)': ((p.bpResults?.dscrMoyen || 0) * 100).toFixed(1),
          'TRI FP (%)': ((p.bpResults?.triFP || 0) * 100).toFixed(1),
          'Retour (ans)': (p.bpResults?.payback || 0).toFixed(1),
          'Dernière Modif': d ? d.toLocaleString('fr-FR') : ''
        };
      });

    if (selectedData.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(selectedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BP Sauvegardés");
    XLSX.writeFile(wb, `Export_BP_Sauvegardes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-slate-800">BP Sauvegardés ({savedProjects.length})</h3>
          {selectedIds.size > 0 && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-[11px] gap-2 border-green-600 text-green-600 hover:bg-green-50"
              onClick={exportToExcel}
            >
              <Download className="w-3.5 h-3.5" />
              Exporter Excel ({selectedIds.size})
            </Button>
          )}
        </div>
        <p className="text-[12px] text-slate-500 italic">Derniers enregistrements en haut</p>
      </div>

      <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-sm no-scrollbar">
        <table className="w-full text-[13px] border-collapse min-w-[1400px]">
          <thead className="sticky top-0 z-10 bg-[#002060] text-white text-center">
            <tr>
              <th className="px-3 py-2 w-10 border-b border-slate-700">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-400 focus:ring-blue-500"
                  checked={savedProjects.length > 0 && selectedIds.size === savedProjects.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider border-b border-slate-700">Projet</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider border-b border-slate-700">Adresse</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider border-b border-slate-700">Commune</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider border-b border-slate-700">Type Bat.</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider border-b border-slate-700">Puissance</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider border-b border-slate-700">Tarifs TB / ACC</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider border-b border-slate-700">Part ACC</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider border-b border-slate-700">DSCR 20a</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider border-b border-slate-700">TRI FP</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider border-b border-slate-700">Retour</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider border-b border-slate-700 w-32">Dernière Modif.</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider border-b border-slate-700 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {savedProjects.map((p) => {
              const state = p.bpAcamaState || {};
              const batTypes = (state.buildings || []).map(b => b.typeBat).filter(Boolean).join(', ');
              
              return (
                <tr key={p.id} className={cn('hover:bg-blue-50/30 transition-colors group', selectedIds.has(p.id) && 'bg-blue-50/50')}>
                  <td className="px-3 py-2 text-center align-middle border-b border-slate-100">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                    />
                  </td>
                  <td className="px-3 py-2 font-bold text-slate-800 uppercase truncate align-middle" title={p.name}>{p.name}</td>
                  <td className="px-3 py-2 text-slate-600 font-medium text-[12px] max-w-[150px] truncate align-middle" title={p.address}>{p.address || '—'}</td>
                  <td className="px-3 py-2 text-slate-500 truncate align-middle" title={`${p.zip || ''} ${p.city || ''}`}>{p.city || '—'}</td>
                  <td className="px-3 py-2 text-slate-500 text-[11px] font-medium italic max-w-[120px] truncate align-middle" title={batTypes}>{batTypes || '—'}</td>
                  <td className="px-3 py-2 text-center font-bold text-blue-700 align-middle">{fmt(p.totalKwc || 0, 1)} kWc</td>
                  <td className="px-3 py-2 text-center text-slate-600 align-middle">
                    <div className="font-bold">{fmt(state.tarifBas, 4)} €</div>
                    <div className="text-[10px] opacity-60">{fmtEur(state.tarifACC)} (ACC)</div>
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-slate-700 align-middle">{fmt(state.partACC * 100, 0)}%</td>
                  <td className="px-3 py-2 text-center align-middle">
                    <div className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black",
                      (p.bpResults.dscrMoyen || 0) >= (state.targetDSCR || 1.17) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {fmtPct(p.bpResults.dscrMoyen)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-green-600 align-middle">{fmtPct(p.bpResults.triFP)}</td>
                  <td className="px-3 py-2 text-center font-bold text-blue-600 align-middle">{fmt(p.bpResults.payback, 1)} ans</td>
                  <td className="px-3 py-2 text-slate-400 text-[12px] align-middle">
                    {(() => {
                      const d = parseFirestoreDate(p.updatedAt || p.createdAt);
                      return d
                        ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : '—';
                    })()}
                  </td>
                  <td className="px-3 py-1 text-right">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        title="Générer PDF"
                        onClick={() => {
                          onSelect(p);
                          setActiveTab('bp_projets');
                          setTimeout(() => {
                            const sections = ['pdf-section-1'];
                            if (p.bpAcamaState?.batteryConfig?.enabled) sections.push('pdf-section-battery');
                            sections.push('pdf-section-2');

                            generateBpAcamaPDF({ 
                              elementId: 'bp-acama-content', 
                              sections,
                              fileName: `BP_Acama_${p.name}_${new Date().toISOString().split('T')[0]}.pdf` 
                            });
                          }, 200);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    <button 
                      title="Modifier"
                      onClick={() => {
                        onSelect(p);
                        setActiveTab('bp_projets');
                      }}
                      className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button 
                      title="Supprimer la sauvegarde"
                      onClick={async () => {
                        if (confirm('Voulez-vous supprimer les données BP de ce projet ?')) {
                          try {
                            await apiService.updateProject(p.id, { bpAcamaState: null });
                            toast({ title: 'Supprimé', description: `Les données BP de ${p.name} ont été effacées.` });
                          } catch (e) {
                             toast({ title: 'Erreur', variant: 'destructive', description: e.message });
                          }
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
            {savedProjects.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-12 text-center text-slate-400 italic">Aucun business plan sauvegardé pour le moment.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: CALCUL ──────────────────────────────────────────────────────────────

function TabCalcul({ projects, isGreenInvest }) {
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
      .filter(p => {
        if (!p.bpAcamaState) return false;
        const pTenant = p.tenantId || p.tenant || p.bpAcamaState?.tenantId || p.bpAcamaState?.tenant;
        const normalizedTenant = (pTenant === 'greeninvest' || pTenant === 'green-invest') ? 'green-invest' : pTenant;
        
        const pName = (p.name || '').toUpperCase();
        const isKnownAcama = pName.includes('PAPA') || pName.includes('BATIOT') || pName.includes('POUDERAU');
        
        if (isGreenInvest) {
          if (isKnownAcama) return false;
          return normalizedTenant === 'green-invest' || !normalizedTenant;
        }
        return normalizedTenant === 'acama' || isKnownAcama;
      })
      .sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
        return dateB - dateA;
      })
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
          etude_pv: '', gestion_admin: bp.gestionAdmin || (bp.kwc ? (parseFloat(bp.kwc) * 1.1).toFixed(2) : ''),
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

  const addRow = () => setLocalRows(r => [{ id: `calc-${Date.now()}`, dev: 'ACAMA', nom: '', spv: 'CH-TTPAGE', capacite: '' }, ...r]);

  const moveRow = (index, direction) => {
    const newRows = [...localRows];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newRows.length) return;
    [newRows[index], newRows[targetIndex]] = [newRows[targetIndex], newRows[index]];
    setLocalRows(newRows);
  };
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
        <Button size="sm" onClick={addRow} className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-7">
          <Plus className="w-3 h-3 mr-1" /> Nouvelle ligne
        </Button>
        <span className="text-sm text-slate-500">{allRows.length} projets calculés</span>
        <div className="ml-auto text-sm text-slate-400 italic">Formules du fichier BP DPGF--TYPE APP G02 appliquées automatiquement</div>
      </div>
      <div {...useDragScroll()} className="flex-1">
        <table className="text-[12px] border-collapse min-w-max w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-600 px-2 py-1.5 w-8">↑↓</th>
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
              const localIndex = localRows.findIndex(r => r.id === row.id);
              return (
                <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-200 p-0 text-center">
                    {localIndex !== -1 && (
                      <div className="flex flex-col items-center">
                        <button onClick={() => moveRow(localIndex, -1)} disabled={localIndex === 0} className="text-slate-400 hover:text-blue-500 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={() => moveRow(localIndex, 1)} disabled={localIndex === localRows.length - 1} className="text-slate-400 hover:text-blue-500 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                      </div>
                    )}
                  </td>
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
      <p className="text-sm mt-1 opacity-60">Disponible prochainement</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BpAcama() {
  const { user, activeTenantId } = useAuth();
  const { projects, loading, refreshProjects } = useProjects();
  const [activeTab, setActiveTab] = useState('bp_projets');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectEdits, setProjectEdits] = useState({});
  const [batEdits, setBatEdits] = useState({});
  const [remoteBatData, setRemoteBatData] = useState(null);
  const [localRows, setLocalRows] = useState([]);
  const [isSavingBat, setIsSavingBat] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const updateProjectEdit = useCallback((id, k, v) => {
    setProjectEdits(p => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));
  }, []);

  const updateBatEdit = useCallback((id, k, v) => {
    setBatEdits(p => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));
  }, []);

  const [params, setParams] = useState({
    buildings: [
      { id: 1, typeBat: '', projectType: 'BAC', surfaceToiture: 0, kwc: 242.88, productible: 1123.08, coutCentrale: 169951.60, coutCharpente: 171381.00, raccordement: 18300.00, frais: 3413.33, soulte: -9048.54, distHta: 100, distPriv: 100 }
    ],
    puissanceUnitaire: 460,
    tarifBas: 0.0846,
    tarifHaut: 0.04,
    seuilKwhKwc: 1100,
    maintenance: 1734.20,
    locationCompteur: 660,
    assurance: 867.10,
    taxesLocales: 0,
    gestionAdmin: 0,
    dureeEmprunt: 20,
    tauxCredit: 4,
    indexationTarif: 0.006,
    indexationOpex: 0.02,
    degradation: 0.004,
    loyerCoeff: 2.6366,
    soulteCoeff: 0,
    raccordement: 18300.00,
    frais: 3413.33,
    soulte: -9048.54,
    targetDSCR: 1.17,
    tarifACC: 0.14,
    partACC: 0,
    vent: '',
    neige: '',
    renteType: 'none',
    batteryConfig: {
      enabled: false,
      isGlobal: false,
      inflationAnnuelle: 2,
      degradationAnnuelle: 2,
      batterieBms: 33625,
      onduleurPcs: 0,
      genieCivil: 6000,
      puissanceDemandee: 125,
      dureeDecharge: 2,
      raccordement: 9000,
      developpement: 5000,
      fraisCommerciaux: 6250,
      arbitrageEnergie: 3750,
      reserveFCR: 18750,
      mecanismeCapacite: 2500,
      effacement: 2500,
      disponibilite: 98,
      rendementRoundTrip: 88,
      maintenanceAn: 750,
      revenuBailleurAn: 2000,
      retributionCommAn: 550,
      assuranceAn: 240,
      commissionAgregateur: 20,
      turpeAn: 5000,
      iferAn: 1250,
      tauxEmprunt: 3.9,
      dureeEmprunt: 12,
      apport: 0,
      tauxIS: 25
    }
  });

  useEffect(() => {
    if (!selectedProject) return;
    
    const features = selectedProject.features || selectedProject.map_state?.features || selectedProject.map_state?.projects || [];
    const buildingFeatures = features.filter(f => f.type === 'rectangle' || (f.type === 'polygon' && f.isPredefinedBuilding));
    
    const defaultBatteryConfig = {
      enabled: false,
      isGlobal: false,
      inflationAnnuelle: 2,
      degradationAnnuelle: 2,
      batteryModelKey: 'solax',
      nbBricks: 1,
      batterieBms: 57583,
      onduleurPcs: 0,
      genieCivil: 6000,
      puissanceDemandee: 125,
      dureeDecharge: 2,
      raccordement: 19900,
      developpement: 6000,
      fraisCommerciaux: 6250,
      arbitrageEnergie: 3750,
      reserveFCR: 18750,
      mecanismeCapacite: 2500,
      effacement: 2500,
      disponibilite: 98,
      rendementRoundTrip: 88,
      maintenanceAn: 750,
      revenuBailleurAn: 2000,
      retributionCommAn: 550,
      assuranceAn: 383, // Updated for 57583 base (95733 total * 0.4%)
      commissionAgregateur: 20,
      turpeAn: 2500,
      iferAn: 625,
      tauxEmprunt: 3.9,
      dureeEmprunt: 12,
      apport: 0,
      tauxIS: 25
    };

    // 1. If saved state exists, we use it but check if building count matches map
    if (selectedProject.bpAcamaState) {
      const saved = { ...selectedProject.bpAcamaState };
      
      // Ensure batteryConfig is initialized if missing in saved state
      if (!saved.batteryConfig) {
        saved.batteryConfig = defaultBatteryConfig;
      } else {
        // Also merge any missing properties just in case
        saved.batteryConfig = { ...defaultBatteryConfig, ...saved.batteryConfig };
        
        // AUTO-MIGRATION: If project has old defaults, update to new standards
        if (saved.batteryConfig.batterieBms === 33625) saved.batteryConfig.batterieBms = 50209;
        if (saved.batteryConfig.raccordement === 9000) saved.batteryConfig.raccordement = 19900;
        if (saved.batteryConfig.developpement === 5000) saved.batteryConfig.developpement = 6000;
        if (saved.batteryConfig.assuranceAn === 240 || saved.batteryConfig.assuranceAn === 390) saved.batteryConfig.assuranceAn = 353;
        if (saved.batteryConfig.turpeAn === 5000) saved.batteryConfig.turpeAn = 2500;
        if (saved.batteryConfig.iferAn === 1250) saved.batteryConfig.iferAn = 625;
      }

      // Enrich saved state with missing building types, products & power from map
      if (saved.buildings && buildingFeatures.length > 0) {
        saved.buildings = saved.buildings.map((b, idx) => {
          const feat = buildingFeatures[idx];
          const newTypeBat = (!b.typeBat || b.typeBat === '') ? (feat?.buildingName || feat?.name || b.typeBat) : b.typeBat;
          
          const defaultProdLocal = parseFloat(selectedProject.solarYieldRoof1 || selectedProject.productible) || 1123.08;
          const specificProd = parseFloat(selectedProject[`solarYieldRoof${idx+1}`]) || defaultProdLocal;
          const newProd = (!b.productible || b.productible === defaultProdLocal) ? specificProd : b.productible;
          
          const featPower = parseFloat(feat?.power || feat?.kwc || feat?.puissance) || 0;
          const newKwc = (b.kwc === 100 && featPower > 0 && featPower !== 100) ? featPower : b.kwc;
          const newCoutCentrale = (newKwc !== b.kwc) ? (newKwc * 490) : b.coutCentrale;
          
          return { ...b, typeBat: newTypeBat, productible: newProd, kwc: newKwc, coutCentrale: newCoutCentrale };
        });
      }

      // If map has more buildings than saved state, we might want to prioritize map
      if (buildingFeatures.length > (saved.buildings?.length || 0)) {
         // Continue to detection logic below to "refresh" from map
      } else {
         setParams(saved);
         return;
      }
    }

    // 2. Otherwise calculate from project features
    const defaultProd = parseFloat(selectedProject.solarYieldRoof1 || selectedProject.productible) || 1123.08;
    const initialBuildings = [];

    if (buildingFeatures.length > 0) {
      buildingFeatures.forEach((f, idx) => {
        const specificProd = parseFloat(selectedProject[`solarYieldRoof${idx+1}`]) || defaultProd;
        const featPower = parseFloat(f.power || f.kwc || f.puissance) || 100;
        initialBuildings.push({
          id: idx + 1,
          typeBat: f.buildingName || f.name || '',
          projectType: f.projectType || 'BAC',
          surfaceToiture: f.surface || 0,
          kwc: featPower,
          productible: specificProd,
          coutCentrale: featPower * 490,
          coutCharpente: (f.projectType === 'BE' || f.name === 'BE') ? 10000 : 0,
          distHta: 100,
          distPriv: 100,
          numPanneaux: Math.round(featPower * 1000 / (params.puissanceUnitaire || 460))
        });
      });
    } else {
      // Fallback to legacy puissance fields or default
      const b1 = parseFloat(selectedProject.puissance) || 0;
      const b2 = parseFloat(selectedProject.puissance2) || 0;
      const b3 = parseFloat(selectedProject.puissance3) || 0;
      const b4 = parseFloat(selectedProject.puissance4) || 0;

      if (b1 > 0 || (!b2 && !b3 && !b4)) {
        initialBuildings.push({ 
          id: 1, 
          typeBat: selectedProject.type_bat || '', 
          projectType: 'BAC',
          surfaceToiture: 0,
          kwc: b1 || 346.84, 
          productible: parseFloat(selectedProject.solarYieldRoof1 || selectedProject.productible) || defaultProd, 
          coutCentrale: (b1 || 346.84) * 490, 
          coutCharpente: 0,
          distHta: 100,
          distPriv: 100,
          numPanneaux: Math.round((b1 || 346.84) * 1000 / (params.puissanceUnitaire || 460))
        });
      }
      if (b2 > 0) initialBuildings.push({ id: 2, typeBat: selectedProject.type_bat2 || '', projectType: 'BAC', surfaceToiture: 0, kwc: b2, productible: parseFloat(selectedProject.solarYieldRoof2 || selectedProject.productible) || defaultProd, coutCentrale: b2 * 490, coutCharpente: 0, distHta: 100, distPriv: 100, numPanneaux: Math.round(b2 * 1000 / (params.puissanceUnitaire || 460)) });
      if (b3 > 0) initialBuildings.push({ id: 3, typeBat: selectedProject.type_bat3 || '', projectType: 'BAC', surfaceToiture: 0, kwc: b3, productible: parseFloat(selectedProject.solarYieldRoof3 || selectedProject.productible) || defaultProd, coutCentrale: b3 * 490, coutCharpente: 0, distHta: 100, distPriv: 100, numPanneaux: Math.round(b3 * 1000 / (params.puissanceUnitaire || 460)) });
      if (b4 > 0) initialBuildings.push({ id: 4, typeBat: selectedProject.type_bat4 || '', projectType: 'BAC', surfaceToiture: 0, kwc: b4, productible: parseFloat(selectedProject.solarYieldRoof4 || selectedProject.productible) || defaultProd, coutCentrale: b4 * 490, coutCharpente: 0, distHta: 100, distPriv: 100, numPanneaux: Math.round(b4 * 1000 / (params.puissanceUnitaire || 460)) });
    }

    setParams(prev => ({
      ...prev,
      buildings: initialBuildings,
      raccordement: parseFloat(selectedProject.raccordement) || 0,
      frais: parseFloat(selectedProject.frais) || 0,
      soulte: parseFloat(selectedProject.soulte) || 0,
      vent: selectedProject.windZone || selectedProject.urbanData?.vents || selectedProject.vent || '',
      neige: selectedProject.snowZone || selectedProject.urbanData?.neige || selectedProject.neige || '',
      targetDSCR: prev.targetDSCR || 1.17,
      tarifACC: prev.tarifACC || 0.14,
      partACC: prev.partACC !== undefined ? prev.partACC : 0,
      renteType: prev.renteType || 'none',
      batteryConfig: prev.batteryConfig || defaultBatteryConfig
    }));
  }, [selectedProject]);
  const isAdmin = user?.role === 'admin';
  const isAlexandru = user?.email === 'a.mihailov@acama-energies.fr';
  const isLaurentGuyon = (user?.firstName?.toLowerCase().includes('laurent') && user?.lastName?.toLowerCase().includes('guyon')) || user?.email?.toLowerCase().includes('guyon');
  const isGreenInvest = activeTenantId === 'green-invest' || user?.activeTenantId === 'green-invest' || user?.tenantId === 'green-invest' || user?.tenant === 'greeninvest';

  const collapsedParams = useMemo(() => {
    const buildings = params.buildings || [];
    const totalKwc = buildings.reduce((sum, b) => sum + (parseFloat(b.kwc) || 0), 0);
    const developpement = isGreenInvest ? 0 : (totalKwc * 40);

    const totalConst = buildings.reduce((sum, b) => sum + (parseFloat(b.coutCentrale) || 0) + (parseFloat(b.coutCharpente) || 0) + (parseFloat(b.raccordement) || 0) + (parseFloat(b.frais) || 0) + (parseFloat(b.soulte) || 0), 0) + developpement;

    return {
      ...params,
      kwc: totalKwc,
      developpement,
      // Average productible weight by kwc for better accuracy? For now simple average
      productible: buildings.length > 0 ? (buildings.reduce((sum, b) => sum + (parseFloat(b.productible) || 0) * (parseFloat(b.kwc) || 0), 0) / buildings.reduce((sum, b) => sum + (parseFloat(b.kwc) || 0), 0) || 1123.08) : 1123.08,
      coutCentrale: buildings.reduce((sum, b) => sum + (parseFloat(b.coutCentrale) || 0), 0),
      coutCharpente: buildings.reduce((sum, b) => sum + (parseFloat(b.coutCharpente) || 0), 0),
      raccordement: buildings.reduce((sum, b) => sum + (parseFloat(b.raccordement) || 0), 0),
      frais: buildings.reduce((sum, b) => sum + (parseFloat(b.frais) || 0), 0),
      soulte: buildings.reduce((sum, b) => sum + (parseFloat(b.soulte) || 0), 0),
      totalInvestissement: totalConst * 1.2
    };
  }, [params, isGreenInvest]);

  const resteACharge = useMemo(() => computeResteACharge(collapsedParams), [collapsedParams]);

  // AUTOMATION: Calculate potential coefficients for rent/soulte to reach target DSCR
  const target = params.targetDSCR || 1.17;
  const autoCoeffs = useMemo(() => {
    try {
      const lCoeff = calculateGoalSeekDSCR({ ...collapsedParams, renteType: 'loyer', apport: resteACharge }, 'loyer', target);
      const sCoeff = calculateGoalSeekDSCR({ ...collapsedParams, renteType: 'soulte', apport: resteACharge }, 'soulte', target);
      return { loyer: lCoeff, soulte: sCoeff, resteACharge };
    } catch (e) {
      console.error("Goal Seek failed", e);
      return { loyer: 0, soulte: 0, resteACharge: 0 };
    }
  }, [collapsedParams, resteACharge, target]);

  const bpBuilding = useMemo(() => {
    const bpParams = { 
        ...collapsedParams, 
        apport: resteACharge,
        loyerCoeff: isGreenInvest ? autoCoeffs.loyer : (params.loyerCoeff || 0),
        soulteCoeff: isGreenInvest ? autoCoeffs.soulte : (params.soulteCoeff || 0)
    };
    return computeBusinessPlan(bpParams);
  }, [collapsedParams, resteACharge, autoCoeffs, params.loyerCoeff, params.soulteCoeff, isGreenInvest]);

  const bpBattery = useMemo(() => {
    if (params.batteryConfig?.enabled) {
      return computeBatteryProfitability(params.batteryConfig);
    }
    return null;
  }, [params.batteryConfig]);

  const bp = useMemo(() => {
    const isGlobalMode = params.batteryConfig?.enabled && params.batteryConfig?.isGlobal && bpBattery;
    if (isGlobalMode) {
      return mergeGlobalBP(bpBuilding, bpBattery, params.batteryConfig);
    }
    return bpBuilding;
  }, [bpBuilding, bpBattery, params.batteryConfig?.enabled, params.batteryConfig?.isGlobal]);
  const { rows, annuite, emprunt, totalConstruction, totalInvestissement, apport10, soulte: calcSoulte } = bp;
  const tva = totalConstruction * 0.20;
  const apportSoulte = apport10 + calcSoulte;

  const handleGoalSeek = () => {
    if (!selectedProject) {
      toast({ title: 'Erreur', variant: 'destructive', description: "Veuillez d'abord sélectionner un projet." });
      return;
    }
    try {
      const target = params.targetDSCR || 1.17;
      const soulteCoeff = calculateGoalSeekDSCR({ ...collapsedParams, apport: resteACharge }, 'soulte', target);
      const loyerCoeff = calculateGoalSeekDSCR({ ...collapsedParams, apport: resteACharge }, 'loyer', target);
      setParams(p => ({ 
        ...p, 
        loyerCoeff,
        soulteCoeff
      }));
      toast({ title: 'Calcul terminé', description: `Loyer et Soulte recalculés pour un DSCR moyen de ${fmtPct(target)}` });
    } catch (e) {
      toast({ title: 'Erreur de calcul', variant: 'destructive', description: e.message });
    }
  };

  const applyCalculatedResteACharge = async () => {
    if (!selectedProject) return;
    try {
      await apiService.updateProject(selectedProject.id, { resteACharge });
      toast({ title: 'Reste à charge appliqué', description: `${fmtEur(resteACharge)} mis à jour dans le projet ${selectedProject.name}` });
    } catch (e) {
      toast({ title: 'Erreur', variant: 'destructive', description: e.message });
    }
  };



  const visibleTabs = useMemo(() => {
    return TABS.filter(tab => {
      // Masquage spécifique pour l'interface Green Invest (DATA, CALCUL, SUIVI)
      if (isGreenInvest && ['data', 'calcul', 'suivi'].includes(tab.id)) {
        return false;
      }
      
      if (!isAdmin && ['data', 'calcul', 'suivi'].includes(tab.id)) {
        return false;
      }
      return true;
    });
  }, [isAdmin, isGreenInvest]);

  useEffect(() => {
    const isRestrictedTab = ['data', 'calcul', 'suivi'].includes(activeTab);
    if ((isGreenInvest || !isAdmin) && isRestrictedTab) {
      setActiveTab('bp_projets');
    }
  }, [isAdmin, activeTab, isGreenInvest]);


  // Access Control: 
  // GREEN INVEST: Admins + Laurent Guyon
  // ACAMA: Admins + Alexandru
  const hasAccess = isGreenInvest ? (isAdmin || isLaurentGuyon) : (isAdmin || isAlexandru);

  if (!hasAccess) {
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

  useEffect(() => {
    const tenant = isGreenInvest ? 'greeninvest' : 'acama';
    let unsubscribe = () => {};
    apiService.subscribeToSuiviBatData(tenant, (data) => {
      setRemoteBatData(data);
    }).then(unsub => { unsubscribe = unsub; });
    return () => unsubscribe();
  }, [isGreenInvest]);

  const activeSuiviBatData = useMemo(() => {
    const baseConstant = isGreenInvest ? SUIVI_BAT_DATA_GREEN_INVEST : SUIVI_BAT_DATA_ACAMA;
    let data = (remoteBatData || baseConstant).map((r, i) => ({ ...r, id: r.id || `base-${i}` }));

    // Apply local edits
    data = data.map((row) => {
      const edit = batEdits[row.id];
      if (!edit) return row;
      const updated = { ...row };
      Object.keys(edit).forEach(k => {
        let val = edit[k];
        if (typeof row[k] === 'number' && typeof val === 'string') {
          const parsed = parseFloat(val);
          if (!isNaN(parsed)) val = parsed;
        }
        updated[k] = val;
      });
      return updated;
    });

    return [...data, ...localRows];
  }, [isGreenInvest, remoteBatData, batEdits, localRows]);

  const saveSuiviBatData = async () => {
    setIsSavingBat(true);
    try {
      const tenant = isGreenInvest ? 'greeninvest' : 'acama';
      // Map rows to remove IDs that are only for UI tracking
      const dataToSave = activeSuiviBatData.map(({ id, ...rest }) => rest);
      await apiService.updateSuiviBatData(tenant, dataToSave);
      setBatEdits({});
      setLocalRows([]);
      toast({ title: "Sauvegardé", description: "Le catalogue des bâtiments a été mis à jour." });
    } catch (e) {
      toast({ title: "Erreur", description: "Échec de la sauvegarde.", variant: "destructive" });
    } finally {
      setIsSavingBat(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'calcul': return <TabCalcul projects={projects || []} isGreenInvest={isGreenInvest} />;
      case 'bp_saved': return <TabBpSaved projects={projects || []} onSelect={setSelectedProject} activeTab={activeTab} setActiveTab={setActiveTab} isGreenInvest={isGreenInvest} />;
      case 'bp_projets': return (
        <TabBpProjets 
          projects={projects || []} 
          selectedProject={selectedProject} 
          setSelectedProject={(val) => {
            const p = typeof val === 'string' ? projects.find(proj => proj.id === val) : val;
            setSelectedProject(p);
          }}
          params={params}
          setParams={(next) => {
            if (typeof next === 'function') {
              setParams(prev => {
                const updated = next(prev);
                // Handle inter-dependencies: nbModules, puissanceUnitaire -> kwc
                if (updated.nbModules !== prev.nbModules || updated.puissanceUnitaire !== prev.puissanceUnitaire) {
                  updated.kwc = (updated.nbModules * updated.puissanceUnitaire) / 1000;
                } else if (updated.kwc !== prev.kwc) {
                  // kwc -> nbModules
                  updated.nbModules = Math.round((updated.kwc * 1000) / updated.puissanceUnitaire);
                }
                return updated;
              });
            } else {
              setParams(next);
            }
          }}
          computeBusinessPlan={computeBusinessPlan}
          computeResteACharge={computeResteACharge}
          calculateGoalSeekDSCR={calculateGoalSeekDSCR}
          bpResults={bp}
          autoCoeffs={autoCoeffs}
          resteACharge={autoCoeffs.resteACharge}
          totalInvestissement={totalInvestissement}
          apport10={apport10}
          totalConstruction={totalConstruction}
          tva={tva}
          apportSoulte={apportSoulte}
          activeSuiviBatData={activeSuiviBatData}
          isGreenInvest={isGreenInvest}
        />
      );
      case 'suivi': return <TabSuivi projects={projects || []} projectEdits={projectEdits} updateProjectEdit={updateProjectEdit} />;
      case 'suivi_bat': return (
        <TabSuiviBatType 
          batEdits={batEdits} 
          updateBatEdit={updateBatEdit} 
          activeSuiviBatData={activeSuiviBatData} 
          localRows={localRows}
          setLocalRows={setLocalRows}
          saveSuiviBatData={saveSuiviBatData}
          isSaving={isSavingBat}
        />
      );
      case 'prop_bac': {
        const resteACharge = computeResteACharge({ ...params, totalInvestissement }, 1.16);
        return <TabPropositionClientBAC projects={projects || []} selectedProject={selectedProject} setSelectedProject={setSelectedProject} params={params} resteACharge={resteACharge} />;
      }
      case 'prop_be': return <TabPropositionBE projects={projects || []} selectedProject={selectedProject} setSelectedProject={setSelectedProject} params={params} bpResults={bp} />;
      case 'data': return <TabData />;
      case 'devis': return <TabDevis projects={projects || []} selectedProject={selectedProject} setSelectedProject={setSelectedProject} params={params} setParams={setParams} activeSuiviBatData={activeSuiviBatData} />;
      default: return <TabPlaceholder label={TABS.find(t => t.id === activeTab)?.label || ''} />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-100 overflow-hidden print:h-auto print:overflow-visible">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out",
        "fixed inset-y-0 left-0 z-30 w-64 md:relative md:translate-x-0 md:flex",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div>
            {isGreenInvest ? (
              <h1 className="text-sm font-bold text-white uppercase">BP</h1>
            ) : (
              <>
                <h1 className="text-sm font-bold text-white uppercase">BP ACAMA</h1>
                <p className="text-[12px] text-slate-400">Business Plan ACAMA</p>
              </>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-white hover:bg-slate-800 h-8 w-8"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsSidebarOpen(false); // Close sidebar on mobile after selection
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
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
        <div className="px-4 py-3 border-t border-slate-700 text-[12px] text-slate-400">
          {isGreenInvest ? 'Interface GREEN INVEST' : 'Interface ACAMA'} • {new Date().getFullYear()}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="border-b border-slate-200 bg-white px-4 py-2 flex items-center gap-3 sticky top-0 z-10 min-h-[44px]">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-slate-600"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className={cn(
            "text-sm font-bold rounded px-2 py-0.5",
            isGreenInvest ? "bg-green-50 text-green-800" : "text-slate-800"
          )}>
            {isGreenInvest ? 'BP' : (activeTab === 'bp_projets' ? 'BUSINESS PLAN PROJETS' : TABS.find(t => t.id === activeTab)?.label)}
          </h2>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
