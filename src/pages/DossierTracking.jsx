import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
    Plus, Trash2, Search, Download, Save, Grid, 
    ArrowUpDown, Filter, MoreHorizontal, ChevronLeft,
    TrendingUp, FileText, Calendar, Euro, MapPin, Mail, Phone,
    Upload, Copy, CheckSquare, Square, X, GripVertical,
    ArrowUp, ArrowDown, Loader2, CheckCircle2, XCircle, FilterX, Settings2,
    SlidersHorizontal, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

// Version sentinel – bump this to force a data reset on next load
const DATA_VERSION = 'v4-2026-03-18';

const INITIAL_TRACKING_DATA = [
    {
        ref_projet: "HERIT 33860 VAL DE LIVENNE", num_facture: "FAC000000608", date_facture: "07/11/2025",
        echeance: "07/12/2025", total_ht: "2 000", tva: "400", total_ttc: "2 400",
        conditions_reglement: "30 jours à réception de la facture", kwc: "100", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "52", ca_pv: "45", total: "97",
        type_bat: "AS 7,2 30x16m", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "460 ROUTE DE LA FONTAINE", cp_ville: "33860 Val-de-Livenne, France", parcelle: "ZN269",
        mail: "frederic.herit@orange.fr", tel: "06 75 77 18 78", type_projet: "1 Bâtiment 31x16.4m asymétrique, sablière à 4m.", pdb_signee: "02/07/25"
    },
    {
        ref_projet: "HERIT 33860 VAL DE LIVENNE", num_facture: "FAC000000609", date_facture: "07/11/2025",
        echeance: "07/12/2025", total_ht: "2 500", tva: "500", total_ttc: "3 000",
        conditions_reglement: "30 jours à réception de la facture", kwc: "102", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "33", ca_pv: "29", total: "102 (156)",
        type_bat: "55.5 45x18m", cout_enr_c: "", cout_kwc: "",
        adresse: "", cp_ville: "", parcelle: "",
        mail: "", tel: "", type_projet: "", pdb_signee: ""
    },
    {
        ref_projet: "DUHARD 17130 JUSSAS", num_facture: "FAC000000610", date_facture: "10/11/2025",
        echeance: "10/12/2025", total_ht: "3 240", tva: "648", total_ttc: "3 888",
        conditions_reglement: "30 jours à réception de la facture", kwc: "162", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "83", ca_pv: "73", total: "156",
        type_bat: "SS.5 45x18,6m", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "Le veau d'or", cp_ville: "17130 Jussas, France", parcelle: "A885, A1664",
        mail: "duhardlaurent@ozone.net", tel: "06 27 13 40 22", type_projet: "1 Bâtiment 45x19.3m symétrique, sablière à 5.5m.", pdb_signee: "07/11/25"
    },
    {
        ref_projet: "DUHARD 17130 JUSSAS", num_facture: "FAC000000611", date_facture: "10/11/2025",
        echeance: "10/12/2025", total_ht: "4 050", tva: "810", total_ttc: "4 860",
        conditions_reglement: "30 jours à réception de la facture", kwc: "", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "", ca_pv: "", total: "",
        type_bat: "", cout_enr_c: "", cout_kwc: "",
        adresse: "", cp_ville: "", parcelle: "",
        mail: "", tel: "", type_projet: "", pdb_signee: ""
    },
    {
        ref_projet: "MARTIN 33220 SAINT AVIT SAINT NAZAIRE", num_facture: "FAC000000612", date_facture: "13/11/2025",
        echeance: "13/12/2025", total_ht: "6 740", tva: "1 348", total_ttc: "8 088",
        conditions_reglement: "30 jours à réception de la facture", kwc: "337", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "", ca_pv: "", total: "",
        type_bat: "S7,7 52,5x26m+4m auvent Sud", cout_enr_c: "", cout_kwc: "",
        adresse: "La chataignière sud", cp_ville: "33220 Saint-Avit-Saint-Nazaire, France", parcelle: "D610",
        mail: "foussardcindy33@gmail.com", tel: "06 67 31 91 76", type_projet: "bâtiment est symétrique et fait 52.5x26m +4m d'auvent côté Sud. Le bas de pente est à 4.5m.", pdb_signee: "13/11/25"
    },
    {
        ref_projet: "RODIER VARGAS 30128 GARONS", num_facture: "FAC000000613", date_facture: "14/11/2025",
        echeance: "14/12/2025", total_ht: "10 320", tva: "2 064", total_ttc: "12 384",
        conditions_reglement: "30 jours à réception de la facture", kwc: "516", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "", ca_pv: "", total: "",
        type_bat: "S7,7 67,5x26,05m+9,25 appentis Sud", cout_enr_c: "", cout_kwc: "",
        adresse: "Lou Coussoun", cp_ville: "30128 Garons, France", parcelle: "AR 91",
        mail: "ecurielavista@gmail.com", tel: "06 88 05 48 51", type_projet: "67x35,3m (26,05m+9,25m d'appentis Sud) Bas de pente 3,9m.", pdb_signee: "10/11/25"
    },
    {
        ref_projet: "SOLLE 31580 LECUSSAN", num_facture: "FAC000000614", date_facture: "19/11/2025",
        echeance: "19/12/2025", total_ht: "5 800", tva: "1 160", total_ttc: "6 960",
        conditions_reglement: "30 jours à réception de la facture", kwc: "290", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "", ca_pv: "", total: "",
        type_bat: "S6,6 60x22,3m", cout_enr_c: "", cout_kwc: "",
        adresse: "490 chemin de la Cassoulade", cp_ville: "31580 Lécussan, France", parcelle: "A114 A116 A133 A112 A115 A113 A105",
        mail: "sarl.cassoulade@orange.fr", tel: "06 07 30 83 41", type_projet: "60x22.3m symétrique (10 travées de 6m) bas de pente 5.5m", pdb_signee: "31/08/24"
    },
    {
        ref_projet: "SAINT ARAILLES 32100 CONDOM", num_facture: "FAC000000615", date_facture: "01/12/2025",
        echeance: "31/12/2025", total_ht: "5 120", tva: "1 100", total_ttc: "6 220",
        conditions_reglement: "30 jours à réception de la facture", kwc: "256", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "", ca_pv: "", total: "",
        type_bat: "AS9.2 52.5x20m + 4m auvent Sud", cout_enr_c: "", cout_kwc: "",
        adresse: "2910 Chemin de l'Osse", cp_ville: "32100 Condom, France", parcelle: "K 76",
        mail: "earl.starailles@etik.com", tel: "06 85 11 83 00", type_projet: "53.5 X 20M + 4M d'Auvent Sud", pdb_signee: "14/11/25"
    },
    {
        ref_projet: "CONSOLI 2 24130 PRIGONRIEUX", num_facture: "FAC000000620", date_facture: "09/01/2026",
        echeance: "08/02/2026", total_ht: "9 760", tva: "1 952", total_ttc: "11 712",
        conditions_reglement: "30 jours à réception de la facture", kwc: "488", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "251", ca_pv: "220", total: "471",
        type_bat: "S7,7 76x26m +4m d'auvent Sud", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "Sivadol", cp_ville: "24130 Prigonrieux, France", parcelle: "ZN 119",
        mail: "consoli.et.fils@wanadoo.fr", tel: "06 89 27 34 05", type_projet: "S7.7 avec auvent Sud 76x30 (26+4m d'auvent Sud)", pdb_signee: ""
    },
    {
        ref_projet: "MISSAULT 24800 ST MARTIN DE FRESSINGEAS", num_facture: "FAC000000623", date_facture: "20/01/2026",
        echeance: "20/01/2026", total_ht: "7 720", tva: "1 544", total_ttc: "9 264",
        conditions_reglement: "30 jours à réception de la facture", kwc: "386", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "199", ca_pv: "174", total: "373",
        type_bat: "2 X ASP 12.4 30x29m", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "Route de la Baine", cp_ville: "24800 Saint-Martin-de-Fressingeas, France", parcelle: "D513 D514 D515 D516 D517 D518 D519 D535",
        mail: "maple7@hotmail.fr", tel: "06 18 58 36 01", type_projet: "2 X ASP 12.4 30x29m 4 travées de 7.5m", pdb_signee: "05/01/26"
    },
    {
        ref_projet: "CASSAGNE 32220 PUYLAUSIC", num_facture: "FAC000000624", date_facture: "21/01/2026",
        echeance: "21/01/2026", total_ht: "3 925", tva: "785", total_ttc: "4 710",
        conditions_reglement: "30 jours à réception de la facture", kwc: "152", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "81", ca_pv: "71", total: "152",
        type_bat: "AS 7,2 30x16m + 2 auvents Nord et Sud = 30x24m", cout_enr_c: "5,2%", cout_kwc: "0,025 €",
        adresse: "647 Chemin du monge", cp_ville: "32220 Puylausic, France", parcelle: "AL 24 + AL 26",
        mail: "cassagne.arnaud@laposte.net", tel: "06 47 92 54 04", type_projet: "AS 7.2 30x16M + 2 auvents Nord et Sud = 30x24m", pdb_signee: "09/01/26"
    },
    {
        ref_projet: "MISSAULT 24470 SAINT SAUD LACOUSSIERE", num_facture: "FAC000000625", date_facture: "30/01/2026",
        echeance: "30/01/2026", total_ht: "8 000", tva: "1 600", total_ttc: "9 600",
        conditions_reglement: "30 jours à réception de la facture", kwc: "400", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "2", ca_cm: "206", ca_pv: "180", total: "386",
        type_bat: "2 X S4.4 de 42m donc 42x15m + 2 auvents de chaque côté", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "1348 Route des bouleaux", cp_ville: "24470 Saint-Saud-Lacoussière, France", parcelle: "A 1223",
        mail: "maple7@hotmail.fr", tel: "06 19 95 46 71", type_projet: "2 X S4.4 de 42m 42x15m + 2 auvents de chaque côté", pdb_signee: "05/01/26"
    },
    {
        ref_projet: "CHAUCHET 17150 MIRAMBEAU", num_facture: "FAC000000626", date_facture: "06/02/2026",
        echeance: "06/02/2026", total_ht: "6 525", tva: "1 305", total_ttc: "7 830",
        conditions_reglement: "30 jours à réception de la facture", kwc: "145", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "75", ca_pv: "65", total: "140",
        type_bat: "AS9.2 37.5x20+ 4m auvent Sud", cout_enr_c: "5,2%", cout_kwc: "0,045 €",
        adresse: "La Garenne", cp_ville: "Mirambeau, 17150 Mirambeau, France", parcelle: "ZV 130 - ZV 285",
        mail: "fabrice.chauchet@sfr.fr", tel: "06 18 38 16 89", type_projet: "30x16m sans poteaux asymétrique", pdb_signee: "02/06/25"
    },
    {
        ref_projet: "LECONTE 33190 SAINT LAURENT DU PLAN", num_facture: "FAC000000627", date_facture: "09/02/2026",
        echeance: "11/03/2026", total_ht: "8 700", tva: "1 740", total_ttc: "10 440",
        conditions_reglement: "30 jours à réception de la facture", kwc: "435", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "224", ca_pv: "196", total: "420",
        type_bat: "S8.8 60x29.8m +4m auvent Sud", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "1 Jacob", cp_ville: "33190 SAINT LAURENT DU PLAN", parcelle: "B100 B332",
        mail: "chlecont-jacob@club-internet.fr", tel: "06 80 57 12 73", type_projet: "S8.8 60x29.8m + 4m auvent Sud", pdb_signee: "23/01/26"
    },
    {
        ref_projet: "LECONTE 40120 LACQUY", num_facture: "FAC000000633", date_facture: "17/03/2026",
        echeance: "16/04/2026", total_ht: "2 900", tva: "580", total_ttc: "3 480",
        conditions_reglement: "30 jours à réception de la facture", kwc: "145", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "75", ca_pv: "65", total: "140",
        type_bat: "SS.5 30x18,6m +4m auvent Sud", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "Route de Lamourelle, Petit Armanon", cp_ville: "40120 Lacquy, France", parcelle: "A222 A223 A225 A226 A229",
        mail: "chlecont-jacob@club-internet.fr", tel: "06 80 57 12 73", type_projet: "S5.5 30x18.6m +4m auvent Sud", pdb_signee: "23/01/26"
    },
    {
        ref_projet: "PLANTE 40300 PORT DE LANNE", num_facture: "FAC000000628", date_facture: "19/02/2026",
        echeance: "21/03/2026", total_ht: "2 900", tva: "580", total_ttc: "3 480",
        conditions_reglement: "30 jours à réception de la facture", kwc: "145", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "2", ca_cm: "75", ca_pv: "65", total: "140",
        type_bat: "S6.6 30x22.3m", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "666 RD 817", cp_ville: "40300 Port-de-Lanne, France", parcelle: "ZK 0074",
        mail: "jpierreplante@gmail.com", tel: "06 87 83 68 57", type_projet: "S6.6 30x22.3m", pdb_signee: "28/01/26"
    },
    {
        ref_projet: "PLANTE 40300 PORT DE LANNE", num_facture: "FAC000000628", date_facture: "19/02/2026",
        echeance: "21/03/2026", total_ht: "4 180", tva: "836", total_ttc: "5 016",
        conditions_reglement: "30 jours à réception de la facture", kwc: "209", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "108", ca_pv: "94", total: "202",
        type_bat: "SS.5 52.5x18.6m", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "666 RD 817", cp_ville: "40300 Port-de-Lanne, France", parcelle: "ZK 0074",
        mail: "jpierreplante@gmail.com", tel: "06 87 83 68 57", type_projet: "S5.5 52.5x18.6m", pdb_signee: "28/01/26"
    },
    {
        ref_projet: "RECKINGER 32700 LECTOURE", num_facture: "FAC000000630", date_facture: "02/03/2026",
        echeance: "01/04/2026", total_ht: "11 300", tva: "2 260", total_ttc: "13 560",
        conditions_reglement: "30 jours à réception de la facture", kwc: "565", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "291", ca_pv: "254", total: "545",
        type_bat: "S8.8 67.5x29.75m + 2 auvents donc 67.5x33.75m", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "6720 route de Nérac", cp_ville: "32700 LECTOURE", parcelle: "L025",
        mail: "reckinger.michel@me.com", tel: "07 45 29 31 61", type_projet: "S8.8 67.5x29,75m + 2 auvents", pdb_signee: "27/02/26"
    },
    {
        ref_projet: "RECKINGER 32700 LECTOURE", num_facture: "FAC000000630", date_facture: "02/03/2026",
        echeance: "01/04/2026", total_ht: "4 480", tva: "896", total_ttc: "5 376",
        conditions_reglement: "30 jours à réception de la facture", kwc: "224", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "115", ca_pv: "101", total: "216",
        type_bat: "AS9.2 37.5x20m + 2 auvents", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "6720 route de Nérac", cp_ville: "32700 LECTOURE", parcelle: "L025",
        mail: "reckinger.michel@me.com", tel: "07 45 29 31 61", type_projet: "AS9.2 37.5 x 20 m", pdb_signee: "27/02/26"
    },
    {
        ref_projet: "MARTINEZ 34230 AUMELAS", num_facture: "FAC000000632", date_facture: "12/03/2026",
        echeance: "27/03/2026", total_ht: "5 100", tva: "1 020", total_ttc: "6 120",
        conditions_reglement: "30 jours à réception de la facture", kwc: "255", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "131", ca_pv: "115", total: "246",
        type_bat: "S7.7 45x26m (328kWc) + 2 auvents", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "mas du Barral", cp_ville: "34230 AUMELAS", parcelle: "D 98 D 157",
        mail: "paul-martinez@hotmail.fr", tel: "06 66 01 88 87", type_projet: "S7.7 45x26m + 2 auvents", pdb_signee: "05/03/26"
    },
    {
        ref_projet: "MARTINEZ 34230 AUMELAS", num_facture: "FAC000000632", date_facture: "12/03/2026",
        echeance: "27/03/2026", total_ht: "5 800", tva: "1 160", total_ttc: "6 960",
        conditions_reglement: "30 jours à réception de la facture", kwc: "290", jalon1_pdb: "",
        jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "149", ca_pv: "131", total: "280",
        type_bat: "S8.8 45x30m (430kWc) + 1 appentis Sud + 1 auvent Nord", cout_enr_c: "5,2%", cout_kwc: "0,020 €",
        adresse: "mas du Barral", cp_ville: "34230 AUMELAS", parcelle: "D 157",
        mail: "paul-martinez@hotmail.fr", tel: "06 66 01 88 87", type_projet: "S8.8 45x30m + 1 appentis Sud + 1 auvent Nord", pdb_signee: "05/03/26"
    }
];


const TABLE_ID = 'tracking_dossiers';
const DATE_COLUMNS = ['date_facture', 'echeance', 'pdb_signee', 'jalon1_pdb', 'jalon2_pc_dp', 'jalon3_bail'];
const CONDITION_REGLEMENT_OPTIONS = [
    "30 jours à réception de la facture",
    "A réception de la facture",
    "Avoir sur facturation"
];

// Helper to convert DD/MM/YYYY to YYYY-MM-DD
const toInputDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split('/');
    if (parts.length !== 3) return "";
    const [d, m, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

// Helper to convert YYYY-MM-DD to DD/MM/YYYY
const fromInputDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y.slice(-2)}`;
};

// --- Dropdown pour Conditions Règlement ---
const ConditionReglementCell = ({ value, onChange, onClose }) => {
    const [inputVal, setInputVal] = useState(value);
    const ref = useRef(null);

    useEffect(() => {
        // Focus l'input automatiquement
        if (ref.current) ref.current.focus();
    }, []);

    return (
        <div className="relative w-full h-full" style={{ minWidth: 220 }}>
            <input
                ref={ref}
                className="w-full h-full px-3 text-xs border-none outline-none bg-white"
                value={inputVal}
                onChange={(e) => {
                    setInputVal(e.target.value);
                    onChange(e.target.value);
                }}
                onBlur={(e) => {
                    // Delay to allow click on option buttons
                    setTimeout(() => onClose(), 150);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') onClose(); }}
                placeholder="Saisir ou choisir..."
            />
            {/* Options dropdown panel */}
            <div className="absolute left-0 top-full z-50 bg-white border border-slate-200 rounded-md shadow-lg w-full min-w-max"
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
            >
                {CONDITION_REGLEMENT_OPTIONS.map(opt => (
                    <button
                        key={opt}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors truncate ${inputVal === opt ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}
                        onClick={() => { setInputVal(opt); onChange(opt); onClose(); }}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Resizable Header Component ---
const ResizableHeader = ({ col, label, width, onResize, isResizing, setIsResizing, onSort, sortDirection }) => {
    const handleMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        const startX = e.pageX;
        const startWidth = width;

        const handleMouseMove = (moveEvent) => {
            const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
            onResize(col, newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <th
            style={{ width: width }}
            className="px-2 py-3 border-b border-r group relative bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer select-none"
            onClick={() => onSort && onSort(col)}
        >
            <div className="flex items-center justify-between h-full px-2">
                <div className="flex items-center gap-1 overflow-hidden">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider truncate">
                        {label}
                    </span>
                    {sortDirection === 'asc' && <ArrowUp className="w-3 h-3 text-blue-500" />}
                    {sortDirection === 'desc' && <ArrowDown className="w-3 h-3 text-blue-500" />}
                </div>
            </div>
            {/* Resize Handle */}
            <div
                onMouseDown={handleMouseDown}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
            />
        </th>
    );
};

const COLUMNS = [
    { key: "ref_projet", label: "Réf projet", icon: <FileText className="w-3 h-3 mr-1" /> },
    { key: "num_facture", label: "N° facture", icon: <FileText className="w-3 h-3 mr-1" /> },
    { key: "paye", label: "Payé", icon: <CheckSquare className="w-3 h-3 mr-1" /> },
    { key: "date_facture", label: "Date facture", icon: <Calendar className="w-3 h-3 mr-1" /> },
    { key: "echeance", label: "Échéance", icon: <Calendar className="w-3 h-3 mr-1" /> },
    { key: "total_ht", label: "Total HT (€)", icon: <Euro className="w-3 h-3 mr-1" /> },
    { key: "tva", label: "TVA (€)", icon: <Euro className="w-3 h-3 mr-1" /> },
    { key: "total_ttc", label: "Total TTC (€)", icon: <Euro className="w-3 h-3 mr-1" /> },
    { key: "conditions_reglement", label: "Conditions règlement", icon: <FileText className="w-3 h-3 mr-1" /> },
    { key: "kwc", label: "kWc", icon: <TrendingUp className="w-3 h-3 mr-1" /> },
    { key: "jalon1_pdb", label: "Jalon 1 PDB", icon: <Grid className="w-3 h-3 mr-1" /> },
    { key: "jalon2_pc_dp", label: "Jalon 2 PC/DP", icon: <Grid className="w-3 h-3 mr-1" /> },
    { key: "jalon3_bail", label: "Jalon 3 BAIL", icon: <Grid className="w-3 h-3 mr-1" /> },
    { key: "nb_bat", label: "Nb Bât.", icon: <Grid className="w-3 h-3 mr-1" /> },
    { key: "ca_cm", label: "CA CM", icon: <Euro className="w-3 h-3 mr-1" /> },
    { key: "ca_pv", label: "CA PV", icon: <Euro className="w-3 h-3 mr-1" /> },
    { key: "total", label: "Total", icon: <Euro className="w-3 h-3 mr-1" /> },
    { key: "type_bat", label: "Type de bâtiment", icon: <Grid className="w-3 h-3 mr-1" /> },
    { key: "cout_enr_c", label: "Coût ENR C", icon: <Euro className="w-3 h-3 mr-1" /> },
    { key: "cout_kwc", label: "Coût au kWc", icon: <Euro className="w-3 h-3 mr-1" /> },
    { key: "adresse", label: "Adresse du projet", icon: <MapPin className="w-3 h-3 mr-1" /> },
    { key: "cp_ville", label: "CP + Ville", icon: <MapPin className="w-3 h-3 mr-1" /> },
    { key: "parcelle", label: "Parcelle(s)", icon: <MapPin className="w-3 h-3 mr-1" /> },
    { key: "mail", label: "Mail", icon: <Mail className="w-3 h-3 mr-1" /> },
    { key: "tel", label: "Tel", icon: <Phone className="w-3 h-3 mr-1" /> },
    { key: "type_projet", label: "Type de projet", icon: <FileText className="w-3 h-3 mr-1" /> },
    { key: "pdb_signee", label: "PDB signée", icon: <FileText className="w-3 h-3 mr-1" /> }
];

export default function DossierTracking() {
    const { user } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingCell, setEditingCell] = useState(null); // { rowId, colKey }
    const [columnWidths, setColumnWidths] = useState({});
    const [isResizing, setIsResizing] = useState(false);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'unpaid'
    const [advancedFilters, setAdvancedFilters] = useState({
        minKwc: '',
        maxKwc: '',
        dateStart: '',
        dateEnd: '',
        hasJalon1: 'all', // 'all', 'yes', 'no'
        hasJalon2: 'all',
        hasJalon3: 'all'
    });

    const fileInputRef = useRef(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleMouseDown = useCallback((e) => {
        // Only drag if clicking middle button or if user is NOT clicking an interactive element
        const isInteractive = e.target.closest('button, input, [role="button"], a');
        if (isInteractive) return;

        isDragging.current = true;
        startX.current = e.pageX - containerRef.current.offsetLeft;
        scrollLeft.current = containerRef.current.scrollLeft;
        
        // Add cursor style to body
        document.body.style.cursor = 'grabbing';
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5; // Scroll speed multiplier
        containerRef.current.scrollLeft = scrollLeft.current - walk;
    }, []);

    const handleMouseUp = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        document.body.style.cursor = 'default';
    }, []);

    useEffect(() => {
        // Attach on document to catch mouseup even outside the container
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    // Initial columns width
    useEffect(() => {
        const widths = {};
        COLUMNS.forEach(col => {
            widths[col.key] = col.key === 'paye' ? 60 : 160;
        });
        setColumnWidths(widths);
    }, []);

    useEffect(() => {
        let initialized = false;
        const unsubscribe = apiService.subscribeToMondayRows(TABLE_ID, async (fetchedRows) => {
            if (!initialized) {
                initialized = true;
                if (fetchedRows.length === 0) {
                    // Aucune donnée en base : on peuple avec les données initiales
                    try {
                        await apiService.batchReplaceMondayRows(TABLE_ID, INITIAL_TRACKING_DATA);
                        setRows(INITIAL_TRACKING_DATA.map((r, i) => ({ ...r, id: String(i) })));
                    } catch (err) {
                        console.error('Failed to populate initial tracking data:', err);
                    }
                } else {
                    // Trier par createdAt croissant pour que les nouvelles lignes apparaissent en bas
                    const sorted = [...fetchedRows].sort((a, b) => {
                        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
                        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
                        return tA - tB;
                    });
                    setRows(sorted);
                }
            } else {
                // Mises à jour temps réel normales - trier aussi
                const sorted = [...fetchedRows].sort((a, b) => {
                    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
                    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
                    return tA - tB;
                });
                setRows(sorted);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddRow = async () => {
        const emptyRow = COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: "" }), {});
        // Optimistic update: show row immediately before Firebase confirms
        const tempId = `temp_${Date.now()}`;
        setRows(prev => [...prev, { ...emptyRow, id: tempId }]);
        await apiService.addMondayRow(TABLE_ID, emptyRow);
    };

    const handleUpdateCell = async (rowId, colKey, value) => {
        await apiService.updateMondayRow(TABLE_ID, rowId, { [colKey]: value });
    };

    const handleDeleteSelected = async () => {
        if (selectedRows.size === 0) return;
        if (window.confirm(`Supprimer ${selectedRows.size} ligne(s) ?`)) {
            for (const id of selectedRows) {
                await apiService.deleteMondayRow(TABLE_ID, id);
            }
            setSelectedRows(new Set());
        }
    };

    const handleDuplicateSelected = async () => {
        if (selectedRows.size === 0) return;
        const rowsToDuplicate = rows.filter(r => selectedRows.has(r.id));
        for (const row of rowsToDuplicate) {
            const { id, ...rowData } = row;
            await apiService.addMondayRow(TABLE_ID, rowData);
        }
        setSelectedRows(new Set());
    };

    const handleDeleteRow = async (rowId) => {
        // Optimistic: remove immediately from UI
        setRows(prev => prev.filter(r => r.id !== rowId));
        await apiService.deleteMondayRow(TABLE_ID, rowId);
    };

    const handleExport = () => {
        const dataToExport = rows.map(r => {
            const rowData = {};
            COLUMNS.forEach(col => {
                rowData[col.label] = r[col.key] || '';
            });
            return rowData;
        });
        
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Suivi Dossiers");
        XLSX.writeFile(wb, "Suivi_Dossiers.xlsx");
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            for (const row of data) {
                const newRow = {};
                COLUMNS.forEach(col => {
                    newRow[col.key] = row[col.label] || '';
                });
                await apiService.addMondayRow(TABLE_ID, newRow);
            }
        };
        reader.readAsBinaryString(file);
    };

    const toggleRowSelection = (id) => {
        const newSelection = new Set(selectedRows);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedRows(newSelection);
    };

    const toggleAllSelection = () => {
        if (selectedRows.size === rows.length) setSelectedRows(new Set());
        else setSelectedRows(new Set(rows.map(r => r.id)));
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedRows = useMemo(() => {
        let sorted = [...rows];
        
        // Payment filter
        if (paymentFilter === 'paid') {
            sorted = sorted.filter(row => row.paye === true);
        } else if (paymentFilter === 'unpaid') {
            sorted = sorted.filter(row => row.paye !== true);
        }

        // Advanced filters
        if (advancedFilters.minKwc) {
            sorted = sorted.filter(row => {
                const val = parseFloat(String(row.kwc || '').replace(/\s/g, '').replace(',', '.'));
                return !isNaN(val) && val >= parseFloat(advancedFilters.minKwc);
            });
        }
        if (advancedFilters.maxKwc) {
            sorted = sorted.filter(row => {
                const val = parseFloat(String(row.kwc || '').replace(/\s/g, '').replace(',', '.'));
                return !isNaN(val) && val <= parseFloat(advancedFilters.maxKwc);
            });
        }
        if (advancedFilters.dateStart) {
            const start = new Date(advancedFilters.dateStart);
            sorted = sorted.filter(row => {
                const rowDate = toInputDate(row.date_facture);
                return rowDate && new Date(rowDate) >= start;
            });
        }
        if (advancedFilters.dateEnd) {
            const end = new Date(advancedFilters.dateEnd);
            sorted = sorted.filter(row => {
                const rowDate = toInputDate(row.date_facture);
                return rowDate && new Date(rowDate) <= end;
            });
        }
        if (advancedFilters.hasJalon1 !== 'all') {
            sorted = sorted.filter(row => advancedFilters.hasJalon1 === 'yes' ? !!row.jalon1_pdb : !row.jalon1_pdb);
        }
        if (advancedFilters.hasJalon2 !== 'all') {
            sorted = sorted.filter(row => advancedFilters.hasJalon2 === 'yes' ? !!row.jalon2_pc_dp : !row.jalon2_pc_dp);
        }
        if (advancedFilters.hasJalon3 !== 'all') {
            sorted = sorted.filter(row => advancedFilters.hasJalon3 === 'yes' ? !!row.jalon3_bail : !row.jalon3_bail);
        }

        // Sorting
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                const valA = String(a[sortConfig.key] || '').toLowerCase();
                const valB = String(b[sortConfig.key] || '').toLowerCase();
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Search query
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            sorted = sorted.filter(row => 
                Object.values(row).some(val => String(val || '').toLowerCase().includes(q))
            );
        }
        return sorted;
    }, [rows, sortConfig, searchQuery, paymentFilter, advancedFilters]);

    const handleCopy = (value) => {
        navigator.clipboard.writeText(String(value || ''));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-white overflow-hidden">
            {/* Monday-Style Toolbar */}
            <div className="border-b px-4 py-2 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2">
                    <Button 
                        size="sm" 
                        onClick={handleAddRow}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs font-semibold"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Nouvelle ligne
                    </Button>
                    
                    <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                    
                    <div className="relative flex items-center h-8">
                        <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 h-full bg-slate-50 border border-slate-200 rounded-md text-xs w-48 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                        />
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 mx-1" />

                    {/* Advanced Filters Button */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className={cn(
                                    "h-8 px-3 text-xs gap-2 border-slate-200",
                                    (advancedFilters.minKwc || advancedFilters.maxKwc || advancedFilters.dateStart || advancedFilters.dateEnd || advancedFilters.hasJalon1 !== 'all' || advancedFilters.hasJalon2 !== 'all' || advancedFilters.hasJalon3 !== 'all') && "bg-blue-50 border-blue-200 text-blue-600"
                                )}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                Filtrer
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-72 p-4 space-y-4" align="start">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dates facture</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input 
                                        type="date" 
                                        value={advancedFilters.dateStart} 
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateStart: e.target.value }))}
                                        className="h-8 text-[10px]"
                                    />
                                    <Input 
                                        type="date" 
                                        value={advancedFilters.dateEnd} 
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
                                        className="h-8 text-[10px]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Puissance (kWc)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input 
                                        placeholder="Min" 
                                        type="number"
                                        value={advancedFilters.minKwc} 
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minKwc: e.target.value }))}
                                        className="h-8 text-[10px]"
                                    />
                                    <Input 
                                        placeholder="Max" 
                                        type="number"
                                        value={advancedFilters.maxKwc} 
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxKwc: e.target.value }))}
                                        className="h-8 text-[10px]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jalons (PDB / PC / BAIL)</label>
                                <div className="flex flex-col gap-1">
                                    <select 
                                        className="h-8 text-[10px] border rounded-md px-2"
                                        value={advancedFilters.hasJalon1}
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, hasJalon1: e.target.value }))}
                                    >
                                        <option value="all">Jalon 1 (PDB) : Tous</option>
                                        <option value="yes">Rempli</option>
                                        <option value="no">Vide</option>
                                    </select>
                                    <select 
                                        className="h-8 text-[10px] border rounded-md px-2"
                                        value={advancedFilters.hasJalon2}
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, hasJalon2: e.target.value }))}
                                    >
                                        <option value="all">Jalon 2 (PC/DP) : Tous</option>
                                        <option value="yes">Rempli</option>
                                        <option value="no">Vide</option>
                                    </select>
                                    <select 
                                        className="h-8 text-[10px] border rounded-md px-2"
                                        value={advancedFilters.hasJalon3}
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, hasJalon3: e.target.value }))}
                                    >
                                        <option value="all">Jalon 3 (BAIL) : Tous</option>
                                        <option value="yes">Rempli</option>
                                        <option value="no">Vide</option>
                                    </select>
                                </div>
                            </div>

                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full text-[10px] h-7 text-slate-500 hover:text-red-500"
                                onClick={() => setAdvancedFilters({
                                    minKwc: '', maxKwc: '', dateStart: '', dateEnd: '',
                                    hasJalon1: 'all', hasJalon2: 'all', hasJalon3: 'all'
                                })}
                            >
                                <FilterX className="w-3 h-3 mr-2" />
                                Réinitialiser les filtres
                            </Button>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Payment Status Buttons */}
                    <div className="flex items-center gap-1 ml-1">
                        <Button 
                            variant={paymentFilter === 'paid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPaymentFilter(prev => prev === 'paid' ? 'all' : 'paid')}
                            className={cn(
                                "h-8 px-3 text-xs gap-2 border-slate-200",
                                paymentFilter === 'paid' ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : "text-slate-600"
                            )}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Factures réglées
                        </Button>
                        <Button 
                            variant={paymentFilter === 'unpaid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPaymentFilter(prev => prev === 'unpaid' ? 'all' : 'unpaid')}
                            className={cn(
                                "h-8 px-3 text-xs gap-2 border-slate-200",
                                paymentFilter === 'unpaid' ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" : "text-slate-600"
                            )}
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            Factures non réglées
                        </Button>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 mx-1" />

                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => fileInputRef.current.click()}
                        className="h-8 px-2 text-slate-600 hover:bg-slate-100 text-xs"
                    >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Importer
                    </Button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImport} 
                        className="hidden" 
                        accept=".xlsx,.xls"
                    />

                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleExport}
                        className="h-8 px-2 text-slate-600 hover:bg-slate-100 text-xs"
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Exporter
                    </Button>

                    {selectedRows.size > 0 && (
                        <>
                            <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                            <Button 
                                variant="ghost"
                                size="sm" 
                                onClick={handleDuplicateSelected}
                                className="h-8 px-3 text-xs text-blue-600 hover:bg-blue-50"
                            >
                                <Copy className="w-3.5 h-3.5 mr-1.5" />
                                Dupliquer ({selectedRows.size})
                            </Button>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={handleDeleteSelected}
                                className="h-8 px-3 text-xs"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                Supprimer ({selectedRows.size})
                            </Button>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                        {rows.length} Dossiers
                    </div>
                </div>
            </div>

            {/* Table Area - Full Height Scrollable (both axes) */}
            <div 
                className="flex-1 overflow-auto relative select-none" 
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
            >
                <table className="border-collapse" style={{ minWidth: `${COLUMNS.length * 162 + 80}px` }}>
                    <thead className="sticky top-0 z-20">
                        <tr>
                            <th className="w-10 px-0 bg-slate-50 border-b border-r sticky left-0 z-30">
                                <div className="flex items-center justify-center h-10">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedRows.size === rows.length && rows.length > 0}
                                        onChange={toggleAllSelection}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </div>
                            </th>
                            <th className="w-10 bg-slate-50 border-b border-r text-center text-[10px] font-bold text-slate-400 uppercase z-20">
                                #
                            </th>
                            {COLUMNS.map(col => (
                                <ResizableHeader 
                                    key={col.key}
                                    col={col.key}
                                    label={col.label}
                                    width={columnWidths[col.key]}
                                    isResizing={isResizing}
                                    setIsResizing={setIsResizing}
                                    onSort={handleSort}
                                    sortDirection={sortConfig.key === col.key ? sortConfig.direction : null}
                                />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.map((row, idx) => (
                            <tr 
                                key={row.id} 
                                className={cn(
                                    "hover:bg-blue-50/40 transition-colors group",
                                    selectedRows.has(row.id) && "bg-blue-50"
                                )}
                            >
                                <td className="border-b border-r sticky left-0 bg-white group-hover:bg-blue-50/40 z-10">
                                    <div className="flex items-center justify-center gap-1 h-9 px-1">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedRows.has(row.id)}
                                            onChange={() => toggleRowSelection(row.id)}
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteRow(row.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition-all"
                                            title="Supprimer cette ligne"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </td>
                                <td className="border-b border-r text-center text-[10px] text-slate-400 bg-white group-hover:bg-blue-50/40">
                                    {idx + 1}
                                </td>
                                {COLUMNS.map(col => {
                                    const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                                    return (
                                        <td 
                                            key={col.key}
                                            className={cn(
                                                "border-b border-r p-0 relative transition-all truncate",
                                                isEditing && "ring-2 ring-blue-500 ring-inset z-10 bg-white",
                                                !isEditing && col.key !== 'paye' && "cursor-pointer"
                                            )}
                                            onClick={(e) => {
                                                if (!isEditing && col.key !== 'paye') {
                                                    setEditingCell({ rowId: row.id, colKey: col.key });
                                                }
                                            }}
                                        >
                                            <div className="flex items-center h-9 group/cell">
                                                {isEditing ? (
                                                    <div className="w-full h-full flex items-center">
                                                        {DATE_COLUMNS.includes(col.key) ? (
                                                            <input 
                                                                type="date"
                                                                autoFocus
                                                                className="w-full h-full px-2 text-xs border-none outline-none bg-white"
                                                                value={toInputDate(row[col.key])}
                                                                onChange={(e) => {
                                                                    const formatted = fromInputDate(e.target.value);
                                                                    handleUpdateCell(row.id, col.key, formatted);
                                                                }}
                                                                onBlur={() => setEditingCell(null)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') setEditingCell(null);
                                                                }}
                                                            />
                                                        ) : col.key === 'conditions_reglement' ? (
                                                    <ConditionReglementCell
                                                        value={row[col.key] || ""}
                                                        onChange={(val) => handleUpdateCell(row.id, col.key, val)}
                                                        onClose={() => setEditingCell(null)}
                                                    />
                                                        ) : (
                                                            <input 
                                                                autoFocus
                                                                className="w-full h-full px-3 text-xs border-none outline-none bg-transparent"
                                                                value={row[col.key] || ""}
                                                                onChange={(e) => handleUpdateCell(row.id, col.key, e.target.value)}
                                                                onBlur={() => setEditingCell(null)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') setEditingCell(null);
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                ) : col.key === 'paye' ? (
                                                    <div className="w-full flex items-center justify-center">
                                                        <input 
                                                            type="checkbox"
                                                            checked={!!row[col.key]}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateCell(row.id, col.key, e.target.checked);
                                                            }}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-full px-3 text-xs text-slate-700 truncate flex items-center justify-between">
                                                        <span className="truncate">{row[col.key] || <span className="text-slate-200">--</span>}</span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopy(row[col.key]);
                                                            }}
                                                            className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-blue-100 rounded text-blue-500 transition-all flex-shrink-0"
                                                            title="Copier"
                                                        >
                                                            <Copy className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
