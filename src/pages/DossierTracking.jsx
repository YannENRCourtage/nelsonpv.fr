import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Plus, Trash2, Search, Download, Save, Grid, 
    ArrowUpDown, Filter, MoreHorizontal, ChevronLeft,
    TrendingUp, FileText, Calendar, Euro, MapPin, Mail, Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLUMNS = [
    { key: "ref_projet", label: "Réf projet", icon: <FileText className="w-3 h-3 mr-1" /> },
    { key: "num_facture", label: "N° facture", icon: <FileText className="w-3 h-3 mr-1" /> },
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

const TABLE_ID = 'tracking_dossiers';

export default function DossierTracking() {
    const { user, activeTenantId } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingCell, setEditingCell] = useState(null); // { rowId, colKey }
    const containerRef = useRef(null);

    // Filtered rows
    const filteredRows = useMemo(() => {
        if (!searchQuery) return rows;
        const q = searchQuery.toLowerCase();
        return rows.filter(row => 
            Object.values(row).some(val => 
                String(val || '').toLowerCase().includes(q)
            )
        );
    }, [rows, searchQuery]);

    useEffect(() => {
        const unsubscribe = apiService.subscribeToMondayRows(TABLE_ID, (fetchedRows) => {
            if (fetchedRows.length === 0 && loading) {
                // Initialize with data from images if empty
                initializeData();
            } else {
                setRows(fetchedRows);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const initializeData = async () => {
        const initialData = [
            {
                ref_projet: "HERIT 33860 VAL DE LIVENNE", num_facture: "FAC000000608", date_facture: "07/11/2025", 
                echeance: "07/12/2025", total_ht: "2000", tva: "400", total_ttc: "2400", 
                conditions_reglement: "30 jours", kwc: "100", jalon1_pdb: "PDB", 
                jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "52", ca_pv: "45", total: "97",
                type_bat: "ECO", cout_enr_c: "", cout_kwc: "",
                adresse: "", cp_ville: "33860 VAL DE LIVENNE", parcelle: "", 
                mail: "", tel: "", type_projet: "", pdb_signee: ""
            },
            {
                ref_projet: "MAJOU 33860 VAL DE LIVENNE", num_facture: "FAC000000609", date_facture: "07/11/2025", 
                echeance: "07/12/2025", total_ht: "2000", tva: "400", total_ttc: "2400", 
                conditions_reglement: "30 jours", kwc: "100", jalon1_pdb: "PDB", 
                jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "52", ca_pv: "45", total: "97",
                type_bat: "ECO", cout_enr_c: "", cout_kwc: "",
                adresse: "", cp_ville: "33860 VAL DE LIVENNE", parcelle: "", 
                mail: "", tel: "", type_projet: "", pdb_signee: ""
            },
            {
                ref_projet: "LAGRA 33860 VAL DE LIVENNE", num_facture: "FAC000000610", date_facture: "07/11/2025", 
                echeance: "07/12/2025", total_ht: "2000", tva: "400", total_ttc: "2400", 
                conditions_reglement: "30 jours", kwc: "100", jalon1_pdb: "PDB", 
                jalon2_pc_dp: "", jalon3_bail: "", nb_bat: "", ca_cm: "52", ca_pv: "45", total: "97",
                type_bat: "ECO", cout_enr_c: "", cout_kwc: "",
                adresse: "", cp_ville: "33860 VAL DE LIVENNE", parcelle: "", 
                mail: "", tel: "", type_projet: "", pdb_signee: ""
            }
        ];

        for (const row of initialData) {
            await apiService.addMondayRow(TABLE_ID, row);
        }
    };

    const handleAddRow = async () => {
        const emptyRow = COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: "" }), {});
        await apiService.addMondayRow(TABLE_ID, emptyRow);
    };

    const handleUpdateCell = async (rowId, colKey, value) => {
        await apiService.updateMondayRow(TABLE_ID, rowId, { [colKey]: value });
    };

    const handleDeleteRow = async (rowId) => {
        if (window.confirm("Supprimer cette ligne ?")) {
            await apiService.deleteMondayRow(TABLE_ID, rowId);
        }
    };

    const handleCellClick = (rowId, colKey) => {
        setEditingCell({ rowId, colKey });
    };

    const handleBlur = () => {
        setEditingCell(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex flex-col gap-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Grid className="w-6 h-6 text-blue-600" />
                            Suivi Dossiers
                        </h1>
                        <p className="text-sm text-slate-500">Gestion et suivi des dossiers Green Invest</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleAddRow} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all">
                            <Plus className="w-4 h-4 mr-2" />
                            Nouvelle ligne
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Rechercher un dossier..." 
                            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto p-6" ref={containerRef}>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <Table className="border-collapse">
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                <TableHead className="w-10 border-r border-slate-200 text-center font-bold text-slate-400">#</TableHead>
                                {COLUMNS.map(col => (
                                    <TableHead key={col.key} className="min-w-[150px] border-r border-slate-200 px-4 py-3">
                                        <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            {col.icon}
                                            {col.label}
                                        </div>
                                    </TableHead>
                                ))}
                                <TableHead className="w-10 text-center text-slate-400">
                                    <MoreHorizontal className="w-4 h-4 mx-auto" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRows.map((row, idx) => (
                                <TableRow key={row.id} className="group hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="text-center border-r border-slate-100 text-xs text-slate-400 font-medium">
                                        {idx + 1}
                                    </TableCell>
                                    {COLUMNS.map(col => {
                                        const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                                        return (
                                            <TableCell 
                                                key={col.key} 
                                                className={cn(
                                                    "border-r border-slate-100 p-0 overflow-hidden relative",
                                                    isEditing && "ring-2 ring-blue-500 ring-inset z-10"
                                                )}
                                                onClick={() => handleCellClick(row.id, col.key)}
                                            >
                                                {isEditing ? (
                                                    <Input 
                                                        autoFocus
                                                        className="h-10 border-none rounded-none focus-visible:ring-0 px-4 text-sm bg-white"
                                                        value={row[col.key] || ""}
                                                        onChange={(e) => handleUpdateCell(row.id, col.key, e.target.value)}
                                                        onBlur={handleBlur}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleBlur();
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="px-4 py-2 text-sm text-slate-700 truncate h-10 flex items-center cursor-text">
                                                        {row[col.key] || <span className="text-slate-200 italic font-light italic">--</span>}
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-center p-0">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem 
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                    onClick={() => handleDeleteRow(row.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
