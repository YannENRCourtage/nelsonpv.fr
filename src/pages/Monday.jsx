import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Plus, Trash2, Edit2, GripVertical, Download, Upload, Save, X, MoreVertical,
    Search, Filter, CheckSquare, Square, Trash, Copy, ArrowUp, ArrowDown,
    // Icons for tabs
    Users, Briefcase, Lock, Wallet, CreditCard, Table2, FolderOpen, Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import apiService from '../services/api';

// Helper for Tab Icons
const formatExcelDate = (serial) => {
    // Si c'est déjà une chaîne formatted ou vide
    if (!serial) return '';
    // Si c'est un nombre (Excel serial date)
    // Excel base date is Dec 30 1899 usually (for Windows)
    // 1 = 1900-01-01
    // 45863 -> 2025...
    const num = parseFloat(serial);
    if (!isNaN(num) && num > 10000) { // Simple check to avoid treating normal numbers as dates unless large enough
        const utc_days = Math.floor(num - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);

        // Ajustement timezone si nécessaire, mais Excel serial est souvent local ou UTC sans time
        // Pour être sûr, on utilise les méthodes UTC ou on ajoute un offset manuel
        // Simple approach: new Date((serial - (25567 + 2)) * 86400 * 1000) for standard excel
        // Let's use a robust method

        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        // Add one day maybe because of leap year bug in Excel? 1900 is not leap year but Excel thinks so.
        // Usually for dates after 1900-02-28 we need to substract 1 day logic or standard algo handles it.
        // Actually (num - 25569) gives unix timestamp in days.

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    // Si c'est déjà une string, on essaie de la garder ou de la formater si c'est ISO
    return serial;
};

// Configuration des renommages de colonnes (Key = Nom original en base, Value = Nom affiché)
const COLUMN_RENAMES = {
    'leads': {
        'PDB': 'Type de pro',
        'R1': 'Type de projet',
        'Type de projet': 'Projet',      // Modifié : Adresse -> Projet
        // 'Adresse': 'Adresse',         // Modifié : Téléphone -> Adresse (On supprime le renommage pour garder l'original)
        'CP + Ville': 'Mail',
        'Tel': 'Tél'                     // Modifié : Commentaires -> Tél
    }
};

const getTabIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('lead')) return Users;
    if (n.includes('projet')) return Briefcase;
    if (n.includes('mdp') || n.includes('pass')) return Lock;
    if (n.includes('dette') || n.includes('facture')) return Wallet;
    if (n.includes('charge') || n.includes('depense')) return CreditCard;
    if (n.includes('doc')) return FolderOpen;
    return Table2;
};

// Helper pour obtenir la couleur de l'onglet
const getTabHeaderColor = (tabName) => {
    const name = tabName.toLowerCase();

    // Couleurs spécifiques demandées
    if (name.includes('dette')) return 'bg-red-100';      // Rouge clair pour Dettes
    if (name.includes('charge')) return 'bg-yellow-100';  // Jaune pour Charges
    if (name.includes('lead')) return 'bg-green-100';     // Vert clair pour LEADS (ou défaut)
    if (name.includes('projet')) return 'bg-blue-100';    // Bleu clair pour Projets
    if (name.includes('mdp')) return 'bg-purple-100';     // Violet pour MDP

    // Couleurs par défaut pour les autres (hash)
    const colors = [
        'bg-orange-100',
        'bg-cyan-100',
        'bg-lime-100',
        'bg-pink-100',
        'bg-indigo-100',
        'bg-teal-100'
    ];
    let hash = 0;
    for (let i = 0; i < tabName.length; i++) {
        hash = tabName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const ItemTypes = {
    COLUMN: 'column',
    ROW: 'row',
};

// --- Resizable Header Component ---
const ResizableHeader = ({ col, index, width, onResize, moveColumn, deleteColumn, isResizing, setIsResizing }) => {
    const ref = useRef(null);
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.COLUMN,
        item: { index },
        canDrag: !isResizing, // Disable drag while resizing
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.COLUMN,
        hover(item, monitor) {
            if (!ref.current || isResizing) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            moveColumn(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    drag(drop(ref));

    // Resize Handler
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
            ref={ref}
            style={{ width: width }}
            className={`px-2 py-3 border-b border-r group relative bg-slate-50 ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="flex items-center justify-between h-full pointer-events-none">
                <span className="font-semibold text-slate-700 pointer-events-auto truncate px-1 text-xs">{col}</span>
                <button
                    onClick={(e) => { e.stopPropagation(); deleteColumn(index); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 pointer-events-auto transition-opacity"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
            {/* Resize Handle */}
            <div
                onMouseDown={handleMouseDown}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
            />
        </th>
    );
};

// --- Resizable Header avec couleur personnalisée ---
const ResizableHeaderWithColor = ({ col, index, width, onResize, moveColumn, deleteColumn, isResizing, setIsResizing, headerColor, renameMap, onSort, sortDirection }) => {
    const ref = useRef(null);
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.COLUMN,
        item: { index },
        canDrag: !isResizing,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.COLUMN,
        hover(item, monitor) {
            if (!ref.current || isResizing) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            moveColumn(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    drag(drop(ref));

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

    // Déterminer le nom à afficher
    let displayName = col;
    if (renameMap) {
        if (renameMap[col]) displayName = renameMap[col];
        // else keep original
    }

    return (
        <th
            ref={ref}
            style={{ width: width }}
            className={`px-2 py-3 border-b border-r group relative ${headerColor || 'bg-slate-50'} ${isDragging ? 'opacity-50' : ''}`}
            onClick={() => onSort && onSort(col)}
        >
            <div className="flex items-center justify-between h-full pointer-events-none">
                <div className="flex items-center gap-1 overflow-hidden pointer-events-auto cursor-pointer select-none">
                    <span className="font-semibold text-slate-700 truncate px-1 text-xs" title={col !== displayName ? `${displayName} (${col})` : col}>
                        {displayName}
                    </span>
                    {sortDirection === 'asc' && <ArrowUp className="w-3 h-3 text-slate-500" />}
                    {sortDirection === 'desc' && <ArrowDown className="w-3 h-3 text-slate-500" />}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); deleteColumn(index); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 pointer-events-auto transition-opacity"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
            <div
                onMouseDown={handleMouseDown}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 pointer-events-auto"
            />
        </th>
    );
};

// --- Simple Resizable Header for Fixed Columns (Checkbox, Row Number) ---
const SimpleResizableHeader = ({ label, width, onResize, isResizing, setIsResizing, children, isFixed, headerColor }) => {
    // Resize Handler - seulement si la colonne n'est pas fixe
    const handleMouseDown = (e) => {
        if (isFixed) return; // Ne pas permettre le redimensionnement des colonnes fixes
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        const startX = e.pageX;
        const startWidth = width;

        const handleMouseMove = (moveEvent) => {
            const newWidth = Math.max(30, startWidth + (moveEvent.pageX - startX));
            onResize(newWidth);
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
            className={`px-2 py-3 border-b border-r group relative ${headerColor || 'bg-slate-50'}`}
        >
            <div className="flex items-center justify-center h-full">
                {children || label}
            </div>
            {/* Resize Handle - masqué pour les colonnes fixes */}
            {!isFixed && (
                <div
                    onMouseDown={handleMouseDown}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
                />
            )}
        </th>
    );
};

// --- Draggable Row ---
const DraggableRow = ({ row, index, columns, columnWidths, moveRow, updateCell, isSelected, toggleSelection, deleteRow, onBlur, ttcColumn }) => {
    const ref = useRef(null);
    const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited (col name)
    const inputRefs = useRef({}); // Refs for each input to preserve cursor position
    const [cursorPosition, setCursorPosition] = useState(null); // Store cursor position when switching to edit mode

    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.ROW,
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.ROW,
        hover(item, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            moveRow(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    drag(drop(ref));

    // Helper function to format TTC values with €
    const formatTTCValue = (value) => {
        if (!value) return '';
        const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        if (!isNaN(num)) {
            return `${num.toFixed(2)} €`;
        }
        return value;
    };

    // Helper to display value (with € for TTC columns) - only when NOT editing
    const getDisplayValue = (col, value) => {
        if (ttcColumn && col === ttcColumn) {
            return formatTTCValue(value);
        }
        // Formatage spécifique pour les dates (ex: DATE DU CONTACT, DATE FACTURE, PAIEMENT, ARRÊTÉ)
        if (col) {
            const upperCol = col.toUpperCase();
            if (
                upperCol.includes('DATE') ||
                upperCol.includes('PAIEMENT') ||
                upperCol.includes('PAIMENT') ||
                upperCol.includes('ARRÊTÉ') ||
                upperCol.includes('ARRETE')
            ) {
                // S'assurer que ce n'est pas un montant (éviter "MONTANT FACTURE" mais garder "DATE FACTURE")
                // Si la colonne contient "MONTANT" et n'est pas explicitement une date, on évite
                if (upperCol.includes('MONTANT') && !upperCol.includes('DATE')) {
                    // C'est probablement un montant
                } else {
                    return formatExcelDate(value);
                }
            }
        }
        // Formatage spécifique pour Tél (ajout du 0 devant)
        // La colonne s'appelle 'Tel' en base (renommée Tél en affichage)
        if (col && (col === 'Tel' || col === 'Tél')) {
            if (value && String(value).length === 9 && !String(value).startsWith('0')) {
                return '0' + value;
            }
        }
        return value || '';
    };

    // Get the raw value for editing
    const getRawValue = (col, value) => {
        return value || '';
    };

    // Calculate cursor position when transitioning from formatted to raw value
    const calculateCursorPosition = (formattedValue, rawValue, clickPosition) => {
        if (!formattedValue || !rawValue) return 0;

        // If clicking in a TTC column with € formatting
        if (formattedValue.includes('€')) {
            // Remove spaces and € to get the numeric part
            const numericPart = formattedValue.replace(/\s*€\s*$/g, '');
            // If click is after the numeric part, position at end of raw value
            if (clickPosition >= numericPart.length) {
                return rawValue.length;
            }
            // Otherwise, keep the same position
            return Math.min(clickPosition, rawValue.length);
        }

        // For date formatting (DD/MM/YYYY)
        if (formattedValue.includes('/') && formattedValue.length === 10 && rawValue.includes('-')) {
            // raw: YYYY-MM-DD (10 chars), formatted: DD/MM/YYYY (10 chars)
            // This is a simple 1:1 map for standard dates
            return Math.min(clickPosition, rawValue.length);
        }

        // For other values, keep same position or end
        return Math.min(clickPosition, rawValue.length);
    };

    // Handle cell click - capture cursor position and switch to editing mode
    const handleCellClick = (col, e) => {
        const input = e.target;
        const clickPosition = input.selectionStart || 0;
        const formattedValue = getDisplayValue(col, row.data[col]) || '';
        const rawValue = getRawValue(col, row.data[col]) || '';

        // Calculate where the cursor should be in the raw value
        const calculatedPosition = calculateCursorPosition(formattedValue, rawValue, clickPosition);

        // Always set cursor position on click if not already editing this cell 
        // or if we just started editing (to override browser's default cursor-to-end)
        setCursorPosition({ col, position: calculatedPosition, timestamp: Date.now() });
        setEditingCell(col);
    };

    // Handle cell focus - used when tabbing into cell
    const handleCellFocus = (col) => {
        if (editingCell !== col) {
            setEditingCell(col);
            // Don't set cursor position here, let it default to start/end
        }
    };

    // Handle cell blur - exit editing mode and trigger parent blur
    const handleCellBlur = (col) => {
        setEditingCell(null);
        setCursorPosition(null);
        if (onBlur) {
            onBlur();
        }
    };

    // Effect to restore cursor position after value changes
    useEffect(() => {
        if (cursorPosition && editingCell === cursorPosition.col) {
            const input = inputRefs.current[cursorPosition.col];
            if (input) {
                const pos = cursorPosition.position;
                // Use requestAnimationFrame + setTimeout to ensure the DOM is ready and React render committed
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (input.value.length >= pos) {
                            input.setSelectionRange(pos, pos);
                        } else {
                            input.setSelectionRange(input.value.length, input.value.length);
                        }
                        input.focus();
                    }, 0);
                });
            }
        }
    }, [editingCell, cursorPosition]);

    // Calculate dynamic sticky positions
    const checkboxWidth = 30; // ~8mm
    const rowNumberLeft = checkboxWidth;

    return (
        <tr
            ref={ref}
            className={`bg-white border-b hover:bg-slate-50 group ${isDragging ? 'opacity-50' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
        >
            <td className="px-2 py-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r text-center" style={{ width: checkboxWidth }}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(row.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
            </td>
            <td className="px-2 py-2 text-slate-500 sticky bg-white group-hover:bg-slate-50 border-r text-xs flex items-center justify-center" style={{ width: 46, left: `${rowNumberLeft}px` }}>
                <div className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600">
                    <GripVertical className="w-4 h-4" />
                </div>
                <span>{index + 1}</span>
            </td>

            {columns.map((col, cIdx) => {
                const isEditing = editingCell === col;
                const displayValue = isEditing ? getRawValue(col, row.data[col]) : getDisplayValue(col, row.data[col]);

                return (
                    <td key={`${row.id}-${cIdx}`} className="px-0 py-0 border-r relative group" style={{ minWidth: columnWidths[col] || 150, width: 'auto' }}>
                        <div className="relative flex items-center h-full min-h-[40px]">
                            {/* Span invisible pour forcer la largeur sur mobile en fonction du contenu */}
                            <span className="invisible whitespace-nowrap px-2 py-2 pr-8 text-sm lg:hidden">{displayValue}</span>
                            <input
                                ref={(el) => inputRefs.current[col] = el}
                                className="w-full h-full px-2 py-2 pr-8 bg-transparent focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-500 transition-colors text-sm lg:truncate cursor-text lg:static absolute inset-0"
                                value={displayValue}
                                onChange={(e) => updateCell(row.id, col, e.target.value)}
                                onFocus={() => handleCellFocus(col)}
                                onBlur={() => handleCellBlur(col)}
                                onMouseDown={(e) => {
                                    e.stopPropagation(); // Empêche le drag de démarrer sur l'input
                                }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Empêche toute interférence avec le clic
                                    handleCellClick(col, e); // Capture cursor position when clicking
                                }}
                                title={row.data[col]}
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const valueToCopy = row.data[col] || '';
                                    navigator.clipboard.writeText(valueToCopy).then(() => {
                                        console.log('Copié:', valueToCopy);
                                    }).catch(err => {
                                        console.error('Erreur de copie:', err);
                                    });
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded transition-all duration-200"
                                title="Copier"
                            >
                                <Copy className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                        </div>
                    </td>
                );
            })}
            <td className="px-2 py-2 text-center w-10">
                <button
                    onClick={() => deleteRow(row.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
};


// --- Composant Tableau Editable (Updated) ---
const EditableTable = ({ data, onUpdate, onRowCountChange, tabName }) => {
    // Data State
    const [columns, setColumns] = useState(data.columns || []);
    const [rows, setRows] = useState([]);
    const [rowOrder, setRowOrder] = useState(data.rowOrder || []);

    // Couleur de l'en-tête basée sur le nom de l'onglet
    const headerColor = getTabHeaderColor(tabName || data.name || 'default');

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({}); // { [colName]: "value" }
    const [selectedRowIds, setSelectedRowIds] = useState(new Set());
    const [columnWidths, setColumnWidths] = useState(data.columnWidths || {});
    const [isResizing, setIsResizing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 200;

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Helpers
    const [newColName, setNewColName] = useState('');
    const fileInputRef = useRef(null);
    const tableContainerRef = useRef(null);
    const isDraggingScroll = useRef(false);
    const dragStartX = useRef(0);
    const dragScrollLeft = useRef(0);

    const handleTablePointerDown = useCallback((e) => {
        if (e.button !== 0) return; // Bouton gauche uniquement
        const isInteractive = e.target.closest('button, input, select, [role="button"], a, th');
        if (isInteractive) return;
        isDraggingScroll.current = true;
        dragStartX.current = e.clientX;
        dragScrollLeft.current = tableContainerRef.current.scrollLeft;
        document.body.style.cursor = 'grabbing';
        // Capture du pointer pour recevoir les événements même pendant un drag HTML5 natif
        try { tableContainerRef.current.setPointerCapture(e.pointerId); } catch (_) {}
    }, []);

    const handleTablePointerMove = useCallback((e) => {
        if (!isDraggingScroll.current) return;
        const walk = (e.clientX - dragStartX.current) * 1.5;
        tableContainerRef.current.scrollLeft = dragScrollLeft.current - walk;
    }, []);

    const handleTablePointerUp = useCallback((e) => {
        if (!isDraggingScroll.current) return;
        isDraggingScroll.current = false;
        document.body.style.cursor = 'default';
        try { tableContainerRef.current.releasePointerCapture(e.pointerId); } catch (_) {}
    }, []);

    // Helper function: Calculate total for TTC columns (Mensualités TTC or Montants TTC)
    const calculateTTCTotal = (rows) => {
        // Find column that contains TTC and either MENSUALIT or MONTANT
        const ttcColumn = columns.find(col => {
            const upper = col.toUpperCase();
            return upper.includes('TTC') && (upper.includes('MENSUALIT') || upper.includes('MONTANT'));
        });

        if (!ttcColumn) return { column: null, sum: 0 };

        let sum = 0;
        rows.forEach(row => {
            const value = row.data[ttcColumn];
            if (value) {
                // Remove spaces, €, and other non-numeric characters except . and ,
                const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(',', '.');
                const num = parseFloat(cleaned);
                if (!isNaN(num)) {
                    sum += num;
                }
            }
        });

        return { column: ttcColumn, sum };
    };



    // Nettoyage automatique des colonnes pour l'onglet "Charges", "LEADS" et "Dettes"
    useEffect(() => {
        if (tabName) {
            const lowName = tabName.toLowerCase();
            let colsToRemove = [];

            if (lowName.includes('charge')) {
                colsToRemove = ['date résiliation', 'informé'];
            } else if (lowName.includes('lead')) {
                colsToRemove = ['r1', 'r2', 'pdb', 'infos transmise par', 'connecter les tableaux', 'mail', 'info transmise par', 'réf', 'ref', 'rèf', 'source du contact'];
            } else if (lowName.includes('dette')) {
                colsToRemove = ['sous éléments montants ttc', 'case à cocher', 'texte'];
            } else if (lowName.includes('projet')) { // Nouveau cas pour Projets
                colsToRemove = ['bâtiment ou sol'];
            }

            if (colsToRemove.length > 0) {
                // Pour LEADS, attention : on veut supprimer "Mail" original, pas "CP + Ville" qui devient "Mail".
                // Donc on supprime par nom original.
                // Le filtre se fait sur les colonnes actuelles (qui sont les noms originaux).
                const cleanColumns = columns.filter(c => !colsToRemove.some(rem => rem.toLowerCase() === c.trim().toLowerCase()));

                if (cleanColumns.length !== columns.length) {
                    console.log(`Nettoyage des colonnes ${tabName}:`, colsToRemove);
                    setColumns(cleanColumns);
                    // On sauvegarde immédiatement pour persister la suppression
                    saveMetadata(cleanColumns, rowOrder, columnWidths);
                }
            }
        }
    }, [tabName, columns]); // Attention à la boucle infinie si columns change -> mais on compare length donc ça devrait aller (ça va render une fois de plus)

    // Initial Defaults for Column Widths - Including Reductions for Dettes/Charges
    useEffect(() => {
        setColumnWidths(prev => {
            const newWidths = { ...prev };
            // Initialize fixed columns
            // Checkbox: -2mm (38px -> ~30px)
            // Row #: +2mm (38px -> ~46px)
            if (!newWidths['__checkbox__'] || newWidths['__checkbox__'] === 64) newWidths['__checkbox__'] = 30;
            if (!newWidths['__rowNumber__'] || newWidths['__rowNumber__'] === 64) newWidths['__rowNumber__'] = 46;

            // Largeurs spécifiques (Key = Nom colonne, Value = Largeur en px)
            const specificWidths = {
                // Dettes (Réduction 1/2 -> 75px)
                'Montant TTC': 75,
                'Date butoir': 75,
                'Date Prlvt auto': 75,

                // Charges (Élargis pour mobile)
                'Mensualités TTC': 120,
                'Date paiement': 110,
                'Type Prlvt': 110,
                'Echéance': 110,

                // LEADS
                'Réf': 75,          // Réduction 1/2
                'DPT': 75,          // Réduction 1/2
                'PDB': 100,         // Réduction 1/3 (Type de pro)
                'Type de projet': 100, // Réduction 1/3 (Projet)
                'Tel': 100,         // Réduction 1/3 (Tél)
                'Adresse': 350,     // Augmentation (Anciennement 250)
                'Commentaires': 350 // Augmentation (Anciennement 250)
            };

            // Appliquer les largeurs spécifiques
            Object.entries(specificWidths).forEach(([colName, width]) => {
                // Recherche insensible à la casse
                const matchingCol = columns.find(c => c.toLowerCase() === colName.toLowerCase());
                if (matchingCol) {
                    // Si la largeur n'est pas définie ou est par défaut (150), on force la nouvelle largeur
                    if (!newWidths[matchingCol] || newWidths[matchingCol] === 150) {
                        newWidths[matchingCol] = width;
                    }
                }
            });

            // Initialize data columns
            columns.forEach(col => {
                if (!newWidths[col]) newWidths[col] = 150;
            });
            return newWidths;
        });
    }, [columns]);

    // Save column widths to database with debounce
    useEffect(() => {
        // Skip initial render and if no columns
        if (Object.keys(columnWidths).length === 0) return;

        // Debounce save to avoid too many writes
        const timer = setTimeout(() => {
            saveMetadata(columns, rowOrder, columnWidths);
        }, 500); // Save after 500ms of inactivity

        return () => clearTimeout(timer);
    }, [columnWidths]); // Only watch columnWidths

    // Fetch Rows
    useEffect(() => {
        if (!data.id) return;
        const unsubscribe = apiService.subscribeToMondayRows(data.id, (fetchedRows) => {
            setRows(fetchedRows);
            if (onRowCountChange) onRowCountChange(fetchedRows.length);
        });
        return () => unsubscribe && unsubscribe();
    }, [data.id, onRowCountChange]);

    // Sync Metadata
    useEffect(() => {
        setColumns(data.columns || []);
        setRowOrder(data.rowOrder || []);
        if (data.columnWidths) setColumnWidths(data.columnWidths); // Sync widths if saved
    }, [data.columns, data.rowOrder, data.columnWidths]);

    const saveMetadata = (newCols, newOrder, newWidths) => {
        onUpdate({
            ...data,
            columns: newCols,
            rowOrder: newOrder,
            columnWidths: newWidths || columnWidths,
            rows: []
        });
    };

    // --- Computed Data: Order + Filter + Search ---
    const displayedRows = useMemo(() => {
        // 1. Order
        let ordered = [];
        if (!rows || rows.length === 0) {
            ordered = [];
        } else if (!rowOrder || rowOrder.length === 0) {
            // Newest first by default
            ordered = [...rows].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else {
            const rowMap = new Map(rows.map(r => [r.id, r]));
            ordered = rowOrder.map(id => rowMap.get(id)).filter(r => r !== undefined);
            
            // Any rows not in the explicit order (new ones from others) go to the TOP
            const inOrderIds = new Set(rowOrder);
            const others = rows.filter(r => !inOrderIds.has(r.id)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            ordered = [...others, ...ordered];
        }

        // 2. Search (Global)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            ordered = ordered.filter(row => {
                return Object.values(row.data).some(val =>
                    String(val).toLowerCase().includes(lowerTerm)
                );
            });
        }

        // 3. Filters (Specific Columns)
        Object.keys(filters).forEach(col => {
            const filterVal = filters[col];
            if (filterVal) {
                ordered = ordered.filter(row => row.data[col] === filterVal);
            }
        });

        // 4. Sort (Column Click)
        if (sortConfig.key) {
            ordered.sort((a, b) => {
                const aValue = a.data[sortConfig.key] || '';
                const bValue = b.data[sortConfig.key] || '';

                // Essayer de trier comme des nombres si possible
                const aNum = parseFloat(String(aValue).replace(/[^0-9.-]/g, ''));
                const bNum = parseFloat(String(bValue).replace(/[^0-9.-]/g, ''));

                if (!isNaN(aNum) && !isNaN(bNum) && String(aValue).length === String(bValue).length) { // Simple heuristic to avoid phone numbers vs small integers issues if needed, but let's try basic numeric
                    // More robust check: if both look like numbers
                }

                // Let's use simple logic: if both parse to number, use numeric sort. 
                // Careful with phone numbers starting with 0, might be treated as octal in some old js but parseFloat is decimals.
                // However "06..." -> 6...

                const isANum = !isNaN(aNum) && String(aValue).trim() !== '';
                const isBNum = !isNaN(bNum) && String(bValue).trim() !== '';

                if (isANum && isBNum) {
                    return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
                }

                // String sort
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return ordered;
    }, [rows, rowOrder, searchTerm, filters, sortConfig]);

    // --- Pagination ---
    const totalPages = Math.ceil(displayedRows.length / rowsPerPage);
    const paginatedRows = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return displayedRows.slice(startIndex, endIndex);
    }, [displayedRows, currentPage, rowsPerPage]);

    // Reset to page 1 when filters or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filters]);


    // --- Actions ---

    // Columns
    const addColumn = () => {
        if (!newColName) return;
        const newCols = [...columns, newColName];
        const newWidths = { ...columnWidths, [newColName]: 150 };
        setColumns(newCols);
        setColumnWidths(newWidths);
        setNewColName('');
        saveMetadata(newCols, rowOrder, newWidths);
    };

    const deleteColumn = (colIndex) => {
        const colName = columns[colIndex];
        if (!window.confirm(`Supprimer la colonne "${colName}" ?`)) return;
        const newCols = columns.filter((_, i) => i !== colIndex);
        const newWidths = { ...columnWidths };
        delete newWidths[colName];
        setColumns(newCols);
        setColumnWidths(newWidths);
        saveMetadata(newCols, rowOrder, newWidths);
    };

    const handleResize = (col, width) => {
        setColumnWidths(prev => ({ ...prev, [col]: width }));
        // Debounce save? We'll save on mouse up (logic inside Header is component based,
        // ideally we pass a persistent saver).
        // For simplicity, we saveMetadata here but it might be frequent.
        // Let's rely on final save or use a ref and save periodically?
        // Actually, just update state here. We need to persist somewhere.
        // We added `columnWidths` to `data` via `saveMetadata`.
        // To avoid spamming saves, let's only save when resizing STOPS.
        // But the resizing state is lifted down.
        // We can just rely on user explicit save? No, needs to be auto.
        // We'll update state locally and maybe save onBlur of the header?
        // For now, let's update state locally.
    };

    // Save widths periodically or on unmount?
    // Let's add an effect to save widths when they change with a debounce.
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only if different from data props to avoid loop
            //  saveMetadata(columns, rowOrder, columnWidths);
        }, 1000);
        return () => clearTimeout(timer);
    }, [columnWidths]);

    // Rows
    const addRow = async () => {
        const newRowData = { data: {} };
        columns.forEach(c => newRowData.data[c] = '');
        const createdRow = await apiService.addMondayRow(data.id, newRowData);
        const newOrder = [createdRow.id, ...rowOrder]; // Add to top usually better? Monday adds to bottom.
        // Let's add to bottom to match previous logic
        // const newOrder = [...rowOrder, createdRow.id];
        setRowOrder(newOrder);
        saveMetadata(columns, newOrder, columnWidths);
    };

    const deleteRow = async (rowId) => {
        await apiService.deleteMondayRow(data.id, rowId);
        const newOrder = rowOrder.filter(id => id !== rowId);
        setRowOrder(newOrder);
        saveMetadata(columns, newOrder, columnWidths);
    };

    const persistRow = async (rowId, rowData) => {
        await apiService.updateMondayRow(data.id, rowId, { data: rowData.data });
    };

    const updateCell = (rowId, colName, value) => {
        const newRows = rows.map(r => {
            if (r.id === rowId) {
                return { ...r, data: { ...r.data, [colName]: value } };
            }
            return r;
        });
        setRows(newRows);
    };

    // Selection
    const toggleSelection = (rowId) => {
        const newSet = new Set(selectedRowIds);
        if (newSet.has(rowId)) newSet.delete(rowId);
        else newSet.add(rowId);
        setSelectedRowIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedRowIds.size === displayedRows.length && displayedRows.length > 0) {
            setSelectedRowIds(new Set());
        } else {
            setSelectedRowIds(new Set(displayedRows.map(r => r.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRowIds.size === 0) return;
        if (!window.confirm(`Supprimer ${selectedRowIds.size} lignes ?`)) return;

        await apiService.batchDeleteMondayRows(data.id, Array.from(selectedRowIds));

        const newOrder = rowOrder.filter(id => !selectedRowIds.has(id));
        setRowOrder(newOrder);
        saveMetadata(columns, newOrder, columnWidths);
        setSelectedRowIds(new Set());
    };

    const handleClearTable = async () => {
        if (!window.confirm(" ATTENTION : Cela va supprimer TOUTES les lignes visibles du tableau.\n\nÊtes-vous sûr ?")) return;

        // Use all rows or just displayed? "Supprimer l'intégralité du contenu" implies ALL.
        // But maybe filters are active? Let's safeguard: Delete ALL rows in `rows` state?
        // Or all in `rowOrder`?
        // Let's default to all rows in the subcollection.
        const allIds = rows.map(r => r.id);
        await apiService.batchDeleteMondayRows(data.id, allIds);

        setRowOrder([]);
        saveMetadata(columns, [], columnWidths);
    };

    // Export Selected
    const handleExportSelected = () => {
        const rowsToExport = rows.filter(r => selectedRowIds.has(r.id));
        if (rowsToExport.length === 0) return;

        const tableData = rowsToExport.map(r => {
            const rowObj = {};
            columns.forEach(col => {
                rowObj[col] = r.data[col] || '';
            });
            return rowObj;
        });
        const ws = XLSX.utils.json_to_sheet(tableData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Selection");
        XLSX.writeFile(wb, `${data.name}_selection.xlsx`);
    };

    // Drag & Drop
    const moveColumn = (dragIndex, hoverIndex) => {
        const newCols = [...columns];
        const [draggedCol] = newCols.splice(dragIndex, 1);
        newCols.splice(hoverIndex, 0, draggedCol);
        setColumns(newCols);
        saveMetadata(newCols, rowOrder, columnWidths);
    };

    const moveRow = (dragIndex, hoverIndex) => {
        const newOrder = [...displayedRows.map(r => r.id)]; // Only move within displayed? Or global?
        // Dragging filtered rows is tricky. Disable DnD when filtered/searched?
        if (searchTerm || Object.keys(filters).some(k => filters[k])) {
            // Disable reorder during filter
            return;
        }
        const [draggedId] = newOrder.splice(dragIndex, 1);
        newOrder.splice(hoverIndex, 0, draggedId);
        setRowOrder(newOrder);
        saveMetadata(columns, newOrder, columnWidths);
    };

    // Unique Values for Filters
    const getUniqueValues = (col) => {
        const values = new Set();
        rows.forEach(r => {
            if (r.data[col]) values.add(r.data[col]);
        });
        return Array.from(values).sort();
    };

    // Import Logic (Existing)
    const handleImportClick = () => { fileInputRef.current?.click(); };
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (jsonData.length === 0) return;

                const importedColumns = jsonData[0].map(String);
                const importedRows = jsonData.slice(1).map((rowArray) => {
                    const rowData = {};
                    importedColumns.forEach((col, cIdx) => {
                        rowData[col] = rowArray[cIdx] !== undefined ? String(rowArray[cIdx]) : '';
                    });
                    return { data: rowData };
                });

                if (window.confirm("Remplacer TOUTES les données (Irréversible) ?")) {
                    const newIds = await apiService.batchReplaceMondayRows(data.id, importedRows);
                    const initialWidths = {};
                    importedColumns.forEach(c => initialWidths[c] = 150);

                    setColumns(importedColumns);
                    setRowOrder(newIds);
                    setColumnWidths(initialWidths);
                    saveMetadata(importedColumns, newIds, initialWidths);
                }
            } catch (err) {
                console.error("Import error", err);
                alert("Erreur import Excel: " + err.message);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    // Specific Filters requested
    const specificFilters = ['NOM', 'COURTIER', 'SOURCE DE INFO', 'DPT', 'SOURCE DU CONTACT'];

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar Top */}
            <div className="flex flex-col gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                {/* Row 1: Actions */}
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex gap-2 items-center flex-1">
                        <Button onClick={addRow} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Ligne
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="border-slate-300">
                                    <Filter className="w-4 h-4 mr-2" />
                                    Filtres
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                <DropdownMenuLabel>Filtrer par...</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {specificFilters.map(sf => {
                                    // Find column that matches (case insensitive or partial match)
                                    const matchingCol = columns.find(col =>
                                        col.toUpperCase() === sf.toUpperCase() ||
                                        col.toUpperCase().includes(sf.toUpperCase()) ||
                                        sf.toUpperCase().includes(col.toUpperCase())
                                    );

                                    if (!matchingCol) return null;

                                    return (
                                        <div key={sf} className="px-2 py-1.5 text-sm">
                                            <div className="font-medium text-slate-700 mb-1">{matchingCol}</div>
                                            <select
                                                className="w-full text-xs p-1 border rounded"
                                                value={filters[matchingCol] || ''}
                                                onChange={(e) => setFilters(prev => ({ ...prev, [matchingCol]: e.target.value }))}
                                            >
                                                <option value="">Tous</option>
                                                {getUniqueValues(matchingCol).map(v => (
                                                    <option key={v} value={v}>{v}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setFilters({})} className="text-blue-600">
                                    Réinitialiser les filtres
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Search field moved here, next to Filtres */}
                        <div className="relative w-full max-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Rechercher partout..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Selection Actions moved here, next to Search */}
                        {selectedRowIds.size > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50/50 rounded-lg border border-blue-100/50 animate-in fade-in slide-in-from-left-2 duration-200">
                                <span className="text-[12px] font-bold text-blue-700 whitespace-nowrap">{selectedRowIds.size} sélectionné(s)</span>
                                <div className="h-4 w-px bg-blue-200 mx-1" />
                                <Button size="sm" variant="ghost" onClick={handleExportSelected} title="Exporter la sélection" className="h-7 w-7 p-0 hover:bg-blue-100 text-blue-700">
                                    <Download className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={handleBulkDelete} title="Supprimer la sélection" className="h-7 w-7 p-0 hover:bg-red-50 text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls, .csv" className="hidden" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <MoreVertical className="w-4 h-4 mr-2" />
                                    Actions
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleImportClick}>
                                    <Upload className="w-4 h-4 mr-2" /> Importer (Remplacer)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { /* Reuse handleExport logic using orderedRows */ }}>
                                    <Download className="w-4 h-4 mr-2" /> Exporter tout
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleClearTable} className="text-red-600">
                                    <Trash className="w-4 h-4 mr-2" /> Vider le tableau
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div 
                className="flex-1 overflow-auto border rounded-xl shadow-sm bg-white relative select-none"
                ref={tableContainerRef}
                onPointerDown={handleTablePointerDown}
                onPointerMove={handleTablePointerMove}
                onPointerUp={handleTablePointerUp}
            >
                <table className="w-full text-sm text-left relative border-collapse lg:table-fixed table-auto">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm layer-20">
                        <tr>
                            <SimpleResizableHeader
                                width={30}
                                onResize={(newWidth) => {
                                    // Ne fait rien car la colonne est fixe
                                }}
                                isResizing={isResizing}
                                setIsResizing={setIsResizing}
                                isFixed={true}
                                headerColor={headerColor}
                            >
                                <input
                                    type="checkbox"
                                    checked={displayedRows.length > 0 && selectedRowIds.size === displayedRows.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </SimpleResizableHeader>
                            <SimpleResizableHeader
                                label="#"
                                width={46}
                                onResize={(newWidth) => {
                                    // Ne fait rien car la colonne est fixe
                                }}
                                isResizing={isResizing}
                                setIsResizing={setIsResizing}
                                isFixed={true}
                                headerColor={headerColor}
                            />
                            {columns.map((col, idx) => (
                                <ResizableHeaderWithColor
                                    key={col}
                                    col={col}
                                    index={idx}
                                    width={columnWidths[col] || 150}
                                    onResize={handleResize}
                                    style={{ minWidth: columnWidths[col] || 150 }}
                                    moveColumn={moveColumn}
                                    deleteColumn={deleteColumn}
                                    isResizing={isResizing}
                                    setIsResizing={setIsResizing}
                                    headerColor={headerColor}
                                    renameMap={tabName && tabName.toLowerCase().includes('lead') ? COLUMN_RENAMES['leads'] : null}
                                    onSort={handleSort}
                                    sortDirection={sortConfig.key === col ? sortConfig.direction : null}
                                />
                            ))}
                            {/* Suppression du titre de la colonne de suppression */}
                            <th className="px-2 py-3 w-10 border-b"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            // Calculate ttcColumn once for all rows
                            const { column: ttcColumn } = calculateTTCTotal(displayedRows);

                            return paginatedRows.map((row, index) => {
                                return (
                                    <DraggableRow
                                        key={row.id}
                                        index={index}
                                        row={row}
                                        columns={columns}
                                        columnWidths={columnWidths}
                                        moveRow={moveRow}
                                        updateCell={updateCell}
                                        isSelected={selectedRowIds.has(row.id)}
                                        toggleSelection={toggleSelection}
                                        deleteRow={deleteRow}
                                        onBlur={() => persistRow(row.id, row)}
                                        ttcColumn={ttcColumn}
                                    />
                                );
                            });
                        })()}

                        {/* Ligne TOTAL automatique - Uniquement pour les onglets avec colonne TTC */}
                        {displayedRows.length > 0 && (() => {
                            const { column: ttcColumn, sum: totalValue } = calculateTTCTotal(displayedRows);

                            // N'afficher la ligne TOTAL que si une colonne TTC existe
                            if (!ttcColumn) return null;

                            const checkboxWidth = 30; // 30px
                            const rowNumberLeft = checkboxWidth;

                            return (
                                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                                    <td className="px-2 py-2 sticky left-0 bg-slate-100 border-r text-center" style={{ width: checkboxWidth }}></td>
                                    <td className="px-2 py-2 text-slate-500 sticky bg-slate-100 border-r text-xs text-center" style={{ width: 46, left: `${rowNumberLeft}px` }}>
                                        {paginatedRows.length + 1}
                                    </td>
                                    {columns.map((col, cIdx) => {
                                        let displayValue = '';

                                        if (cIdx === 0) {
                                            // Première colonne : afficher "TOTAL"
                                            displayValue = 'TOTAL';
                                        } else if (ttcColumn && col === ttcColumn) {
                                            // Colonne TTC (Mensualités ou Montants) : afficher la somme
                                            displayValue = `${totalValue.toFixed(2)} €`;
                                        }

                                        return (
                                            <td key={`total-${cIdx}`} className="px-0 py-0 border-r relative" style={{ minWidth: columnWidths[col] || 150, width: 'auto' }}>
                                                <div className="relative flex items-center h-full min-h-[40px]">
                                                    <span className="invisible whitespace-nowrap px-2 py-2 text-sm lg:hidden font-bold">{displayValue}</span>
                                                    <input
                                                        className="w-full h-full px-2 py-2 bg-slate-100 cursor-not-allowed font-bold text-sm lg:truncate lg:static absolute inset-0"
                                                        value={displayValue}
                                                        readOnly
                                                        title={displayValue}
                                                    />
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-2 py-2 text-center w-10 bg-slate-100"></td>
                                </tr>
                            );
                        })()}
                        {paginatedRows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 3} className="px-6 py-10 text-center text-slate-500">
                                    {rows.length === 0
                                        ? "Aucune donnée. Importer ou ajouter une ligne."
                                        : "Aucun résultat pour cette recherche."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 rounded-b-xl">
                    <div className="text-sm text-slate-600">
                        Affichage de {((currentPage - 1) * rowsPerPage) + 1} à {Math.min(currentPage * rowsPerPage, displayedRows.length)} sur {displayedRows.length} résultats
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-8"
                        >
                            Précédent
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        size="sm"
                                        variant={currentPage === pageNum ? "default" : "outline"}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className="h-8 w-8 p-0"
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8"
                        >
                            Suivant
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function Monday() {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [newTabName, setNewTabName] = useState('');
    const [isAddingTab, setIsAddingTab] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = apiService.subscribeToMondayTables((updatedTabs) => {
            setTabs(prev => {
                const sorted = updatedTabs.sort((a, b) => {
                    const getOrder = (name) => {
                        const n = name.toLowerCase();
                        if (n.includes('mdp')) return 1;
                        if (n.includes('projet')) return 2;
                        return 3;
                    };
                    const orderA = getOrder(a.name);
                    const orderB = getOrder(b.name);
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                });
                return sorted;
            });
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    useEffect(() => {
        if (!activeTabId && tabs.length > 0) {
            const mdpTab = tabs.find(t => t.name.toLowerCase().includes('mdp'));
            setActiveTabId(mdpTab ? mdpTab.id : tabs[0].id);
        }
    }, [tabs, activeTabId]);

    const activeTab = tabs.find(t => t.id === activeTabId);

    const handleUpdateTab = async (updatedTabData) => {
        await apiService.updateMondayTable(updatedTabData.id, updatedTabData);
    };

    const addTab = async () => {
        if (!newTabName) return;
        const newTab = { name: newTabName, columns: ['Col 1'], rows: [], rowOrder: [] };
        const created = await apiService.createMondayTable(newTab);
        setActiveTabId(created.id);
        setNewTabName('');
        setIsAddingTab(false);
    };

    const deleteTab = async (id) => {
        if (!window.confirm("Supprimer ce tableau ?")) return;
        await apiService.deleteMondayTable(id);
        if (activeTabId === id) setActiveTabId(null);
    };

    const renameTab = async (id, currentName) => {
        const pName = prompt("Nouveau nom :", currentName);
        if (pName && pName.trim()) await apiService.updateMondayTable(id, { name: pName.trim() });
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="bg-slate-50 min-h-screen flex text-slate-900 font-sans relative">
                {/* Backdrop for mobile */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 z-[29] lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar Navigation - CRM Style */}
                <aside className={cn(
                    "w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white border-r border-slate-700 flex flex-col fixed top-[0] lg:top-[64px] bottom-0 left-0 z-30 transition-transform duration-300 shadow-2xl lg:translate-x-0 h-full lg:h-[calc(100vh-64px)]",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-1">
                                Monday
                            </h2>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tableaux Admin</p>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-700 rounded text-slate-400">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                        {tabs.map(tab => {
                            const Icon = getTabIcon(tab.name);
                            const isActive = activeTabId === tab.id;

                            return (
                                <div key={tab.id} className="group flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setActiveTabId(tab.id);
                                            setIsSidebarOpen(false);
                                        }}
                                        className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/50'
                                            : 'hover:bg-slate-700/50'
                                            }`}
                                    >
                                        <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                            {tab.name}
                                        </span>
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                    </button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400 absolute right-2">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => renameTab(tab.id, tab.name)}>Renommer</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => deleteTab(tab.id)} className="text-red-600 focus:text-red-600">Supprimer</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            );
                        })}

                        {/* ... Nouveau tableau button code ... */}
                        {isAddingTab ? (
                            <div className="flex items-center gap-2 px-2 mt-4 animate-in fade-in slide-in-from-left-2 text-white">
                                <Input
                                    autoFocus
                                    placeholder="Nom..."
                                    className="h-8 text-sm bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                    value={newTabName}
                                    onChange={e => setNewTabName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') addTab();
                                        if (e.key === 'Escape') setIsAddingTab(false);
                                    }}
                                />
                                <Button size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-500" onClick={addTab}><Plus className="w-4 h-4" /></Button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingTab(true)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-700/50 hover:text-blue-400 transition-colors mt-2 border-t border-dashed border-slate-700"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Nouveau tableau</span>
                            </button>
                        )}
                    </nav>
                </aside>

                <main className="flex-1 lg:ml-64 p-4 lg:p-8 w-full max-w-full flex flex-col min-h-screen pt-20 lg:pt-24">
                    {/* Mobile Header Toggle - Dark Style to match CRM Screenshot */}
                    <div className="lg:hidden flex items-center justify-between mb-4 bg-slate-900 p-4 rounded-xl shadow-lg border border-slate-700">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-white"
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-xl font-bold text-white">
                            {activeTab?.name || 'Monday'}
                        </h1>
                        <div className="w-10" />
                    </div>

                    {/* Mobile/Tablet Tab Navigation Bar */}
                    <div className="lg:hidden mb-6 flex overflow-x-auto pb-2 gap-2 no-scrollbar">
                        {tabs.map(tab => {
                            const Icon = getTabIcon(tab.name);
                            const isActive = activeTabId === tab.id;
                            return (
                                <button
                                    key={`mobile-tab-${tab.id}`}
                                    onClick={() => setActiveTabId(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium border",
                                        isActive
                                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.name}
                                </button>
                            );
                        })}
                    </div>

                    {activeTab ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">
                                        {activeTab.name} <span className="text-slate-400 font-normal ml-2 text-lg">({rowCount})</span>
                                    </h1>
                                    <p className="text-slate-500 text-sm">Gérez vos données dans ce tableau.</p>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-2 lg:p-4 flex flex-col overflow-x-auto">
                                <EditableTable key={activeTab.id} data={activeTab} onUpdate={handleUpdateTab} onRowCountChange={setRowCount} tabName={activeTab.name} />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><p className="text-lg">Sélectionnez un tableau</p></div>
                    )}
                </main>
            </div>
        </DndProvider>

    );
}
