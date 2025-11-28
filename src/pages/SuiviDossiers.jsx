import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { produce } from 'immer';
import ApiService from '../services/api.js';
import { Button } from '@/components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Plus, GripVertical, ChevronDown, ChevronRight, PaintBucket, Trash2, Filter, ArrowRightLeft } from 'lucide-react';
import './Admin.css';

const ItemTypes = { ROW: 'row', COLUMN: 'column' };

const hexToRgb = (hex) => { const m = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex || "#ccc"); return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 204, g: 204, b: 204 }; };
const contrastTextColor = (bg) => { const { r, g, b } = hexToRgb(bg); const L = 0.299 * r + 0.587 * g + 0.114 * b; return L > 150 ? '#111827' : '#fff'; };

// Stockage local temporaire (en attendant l'auth complète)
const CURRENT_USER = { id: 'user-temp', name: 'Utilisateur' };

function EditableCell({ value, onValueChange }) {
    const [edit, setEdit] = useState(false); const [val, setVal] = useState(value ?? ''); useEffect(() => setVal(value ?? ''), [value]);
    const commit = () => { setEdit(false); if (val !== value) onValueChange(val); };
    return <div className="h-10 w-full">{edit ? <Input value={val} onChange={e => setVal(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value ?? ''); setEdit(false); } }} autoFocus className="p-0 h-10 bg-transparent focus:ring-1 focus:ring-blue-500 rounded-sm" /> : <div onClick={() => setEdit(true)} className="cursor-pointer truncate h-10 flex items-center">{String(value ?? '') || null}</div>}</div>;
}

function StatusCell({ value, onChange, options = [], onOptionsChange }) {
    const [open, setOpen] = useState(false); const [manage, setManage] = useState(false);
    const current = options.find(o => o.value === value) || options[0] || { value: '', color: '#e5e7eb' }; const textColor = contrastTextColor(current.color);
    const [localOpts, setLocalOpts] = useState(options); useEffect(() => setLocalOpts(options), [options]); const save = () => { onOptionsChange?.(localOpts); setManage(false); };
    return (
        <div className="relative h-10 -m-4 px-4" onMouseLeave={() => setOpen(false)}>
            <button className="w-full h-full rounded-sm flex items-center justify-center gap-2" style={{ background: current.color, color: textColor }} onClick={() => setOpen(v => !v)} title={current.value}>
                <span className="font-semibold text-sm">{current.value || '—'}</span>
            </button>
            {open && !manage && (
                <div className="absolute z-20 mt-1 bg-white border rounded shadow p-1 min-w-[220px]">
                    {options.map(opt => (
                        <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full" style={{ background: opt.color }} /><span>{opt.value}</span>
                        </button>
                    ))}
                    <div className="border-t my-1" /><button className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2" onClick={() => setManage(true)}><PaintBucket className="w-4 h-4" /> Gérer les statuts…</button>
                </div>
            )}
            {open && manage && (
                <div className="absolute z-30 mt-1 bg-white border rounded shadow p-2 min-w-[260px]">
                    <div className="text-xs font-semibold mb-1">Statuts</div>
                    <div className="max-h-60 overflow-auto space-y-2">
                        {localOpts.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <input className="border rounded px-2 py-1 text-sm flex-1" value={opt.value} onChange={e => setLocalOpts(p => produce(p, d => { d[idx].value = e.target.value; }))} />
                                <input type="color" className="h-8 w-10 p-0 border rounded" value={opt.color} onChange={e => setLocalOpts(p => produce(p, d => { d[idx].color = e.target.value; }))} />
                                <Button size="icon" variant="outline" onClick={() => setLocalOpts(p => p.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setLocalOpts(p => [...p, { value: 'Nouveau statut', color: '#cbd5e1' }])}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
                        <div className="ml-auto flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => { setManage(false); setOpen(false); }}>Annuler</Button><Button size="sm" onClick={save}>Enregistrer</Button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

function UserCell({ value, onChange, people = [] }) {
    const [open, setOpen] = useState(false);
    const current = people.find(p => p.name === value) || { name: value || '', color: '#cbd5e1' }; const textColor = contrastTextColor(current.color);
    const firstName = (current.name || '').split(/\\s+/)[0] || '';
    return (
        <div className="relative h-10 -m-4 px-4" onMouseLeave={() => setOpen(false)}>
            <button className="w-full h-full rounded-sm flex items-center justify-center font-semibold text-sm" style={{ background: current.color, color: textColor }} onClick={() => setOpen(v => !v)} title={current.name}>
                {firstName || '—'}
            </button>
            {open && (
                <div className="absolute z-20 mt-1 bg-white border rounded shadow p-1 min-w-[220px]">
                    {people.map(p => (
                        <button key={p.id || p.name} onClick={() => { onChange(p.name); setOpen(false); }} className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full" style={{ background: p.color }} /><span>{p.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const DraggableRow = ({ row, rowIndex, group, moveRow, children }) => {
    const ref = useRef(null);
    const [, drop] = useDrop({
        accept: ItemTypes.ROW, hover(item, monitor) {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const mid = (rect.bottom - rect.top) / 2;
            const y = monitor.getClientOffset().y - rect.top;
            if (item.groupId === group.id) { if (item.index < rowIndex && y < mid) return; if (item.index > rowIndex && y > mid) return; }
            moveRow({ id: item.id, index: item.index, groupId: item.groupId }, { id: row.id, index: rowIndex, groupId: group.id }); item.index = rowIndex; item.groupId = group.id;
        }
    });
    const [{ isDragging }, drag, preview] = useDrag({ type: ItemTypes.ROW, item: { id: row.id, index: rowIndex, groupId: group.id }, collect: (m) => ({ isDragging: m.isDragging() }) });
    preview(drop(ref));
    return <TableRow ref={ref} className={isDragging ? "opacity-50" : ""}>{children((node) => drag(node))}</TableRow>;
};

function BoardView({ board, onBoardChange, availableUsers }) {
    const [search, setSearch] = useState(''); const [filters, setFilters] = useState({ responsable: '', statut: '' });
    const [local, setLocal] = useState(board);
    const [rows, setRows] = useState([]);

    useEffect(() => setLocal(board), [board]);

    // Load rows from API
    useEffect(() => {
        if (board?.id) {
            ApiService.getBoard(board.id).then(data => {
                if (data.rows) setRows(data.rows);
            }).catch(err => console.error('Error loading rows:', err));
        }
    }, [board?.id]);

    const selectedCount = useMemo(() => rows.filter(r => r.selected).length, [rows]);

    const moveRow = useCallback((from, to) => {
        // TODO: Implement drag & drop with API update
        console.log('Move row', from, to);
    }, []);

    const onUpdateCell = useCallback(async (rowId, columnId, value) => {
        // Update local state optimistically
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: { ...r.data, [columnId]: value } } : r));
        // Update via API
        try {
            const row = rows.find(r => r.id === rowId);
            await ApiService.updateRow(board.id, rowId, { data: { ...row.data, [columnId]: value } });
        } catch (err) {
            console.error('Error updating cell:', err);
        }
    }, [board?.id, rows]);

    const updateColumn = useCallback(async (columnIndex, updates) => {
        const newColumns = [...local.columns];
        newColumns[columnIndex] = { ...newColumns[columnIndex], ...updates };
        setLocal(prev => ({ ...prev, columns: newColumns }));
        try {
            await ApiService.updateBoard(board.id, { columns: newColumns });
        } catch (err) {
            console.error('Error updating column:', err);
        }
    }, [board?.id, local.columns]);

    const updateStatusOptions = useCallback(async (columnId, opts) => {
        const newColumns = local.columns.map(c => c.id === columnId ? { ...c, options: opts } : c);
        setLocal(prev => ({ ...prev, columns: newColumns }));
        try {
            await ApiService.updateBoard(board.id, { columns: newColumns });
        } catch (err) {
            console.error('Error updating status options:', err);
        }
    }, [board?.id, local.columns]);

    const addRow = useCallback(async (groupId) => {
        try {
            const newRow = await ApiService.createRow(board.id, { groupId, data: {} });
            setRows(prev => [newRow, ...prev]);
        } catch (err) {
            console.error('Error creating row:', err);
        }
    }, [board?.id]);

    const deleteSelected = useCallback(async () => {
        const toDelete = rows.filter(r => r.selected);
        if (toDelete.length === 0) return;
        if (!confirm(`Supprimer ${toDelete.length} ligne(s) ?`)) return;
        try {
            await Promise.all(toDelete.map(r => ApiService.deleteRow(board.id, r.id)));
            setRows(prev => prev.filter(r => !r.selected));
        } catch (err) {
            console.error('Error deleting rows:', err);
        }
    }, [board?.id, rows]);

    const statusColumn = local.columns?.find(c => c.type === 'status');
    const statusOptions = statusColumn?.options || [];

    const groupedRows = useMemo(() => {
        if (!local.groups) return [];
        return local.groups.map(g => ({
            ...g,
            rows: rows.filter(r => r.groupId === g.id)
        }));
    }, [local.groups, rows]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase(), resp = filters.responsable, st = filters.statut;
        return groupedRows.map(g => ({
            ...g,
            rows: g.rows.filter(r => {
                const data = r.data || {};
                const okText = !q || Object.values(data).some(v => String(v || '').toLowerCase().includes(q));
                const okR = !resp || data.responsable === resp;
                const okS = !st || data.statut === st;
                return okText && okR && okS;
            })
        }));
    }, [groupedRows, search, filters]);

    return (
        <>
            <div className="flex items-center gap-2 mb-3">
                <Input placeholder="Rechercher…" className="w-64" value={search} onChange={e => setSearch(e.target.value)} />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filtrer</Button></DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[260px]">
                        <DropdownMenuLabel>Filtres</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-sm">
                            <div className="mb-1 font-medium">Responsable</div>
                            <select className="w-full border rounded px-2 py-1" value={filters.responsable} onChange={(e) => setFilters(f => ({ ...f, responsable: e.target.value }))}>
                                <option value="">Tous</option>
                                {availableUsers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="px-2 py-1.5 text-sm">
                            <div className="mb-1 font-medium">Statut</div>
                            <select className="w-full border rounded px-2 py-1" value={filters.statut} onChange={(e) => setFilters(f => ({ ...f, statut: e.target.value }))}>
                                <option value="">Tous</option>
                                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                            </select>
                        </div>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5"><Button variant="outline" onClick={() => setFilters({ responsable: '', statut: '' })}>Réinitialiser</Button></div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {selectedCount > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline"><ArrowRightLeft className="w-4 h-4 mr-2" /> Actions ({selectedCount})</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={deleteSelected} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table className="table-fixed w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead style={{ width: board.gutterWidth, minWidth: board.gutterWidth, maxWidth: board.gutterWidth }} className="relative pr-0" />
                            {local.columns?.map((col, i) => (
                                <TableHead key={col.id} style={{ width: col.width, minWidth: col.width, maxWidth: col.width }} className="relative pr-0">
                                    <div className="flex items-center gap-2">
                                        <span className="cursor-move inline-flex" title="Déplacer la colonne"><GripVertical className="w-4 h-4 text-slate-400" /></span>
                                        <button className="font-semibold text-left" title="Renommer">{col.title}</button>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map(group => (
                            <React.Fragment key={group.id}>
                                <TableRow className="bg-slate-50">
                                    <TableCell colSpan={1 + local.columns.length} className="py-2">
                                        <div className="flex items-center gap-2">
                                            <button className="inline-flex items-center text-slate-600">
                                                {group.isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                <span className="font-semibold ml-1">{group.name}</span>
                                            </button>
                                            <Button size="sm" className="ml-2" onClick={() => addRow(group.id)}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>

                                {!group.isCollapsed && group.rows.map((row, rowIndex) => (
                                    <DraggableRow key={row.id} row={row} rowIndex={rowIndex} group={group} moveRow={moveRow}>
                                        {(dragHandle) => (
                                            <>
                                                <TableCell style={{ width: board.gutterWidth, minWidth: board.gutterWidth, maxWidth: board.gutterWidth }}>
                                                    <div className="flex items-center gap-2">
                                                        <span ref={dragHandle} className="cursor-move inline-flex"><GripVertical className="w-4 h-4 text-slate-400" /></span>
                                                        <Checkbox checked={!!row.selected} onCheckedChange={(v) => setRows(prev => prev.map(r => r.id === row.id ? { ...r, selected: !!v } : r))} />
                                                    </div>
                                                </TableCell>

                                                {local.columns.map((col) => {
                                                    const val = row.data?.[col.id];

                                                    if (col.type === 'status') {
                                                        return (
                                                            <TableCell key={col.id} style={{ width: col.width, minWidth: col.width, maxWidth: col.width }} className="relative pr-0">
                                                                <StatusCell value={val} onChange={(v) => onUpdateCell(row.id, col.id, v)} options={col.options || []} onOptionsChange={(opts) => updateStatusOptions(col.id, opts)} />
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.type === 'user') {
                                                        return (
                                                            <TableCell key={col.id} style={{ width: col.width, minWidth: col.width, maxWidth: col.width }} className="relative pr-0">
                                                                <UserCell value={val} onChange={(v) => onUpdateCell(row.id, col.id, v)} people={availableUsers} />
                                                            </TableCell>
                                                        );
                                                    }
                                                    return (
                                                        <TableCell key={col.id} style={{ width: col.width, minWidth: col.width, maxWidth: col.width }} className="relative">
                                                            <EditableCell value={val} onValueChange={(v) => onUpdateCell(row.id, col.id, v)} />
                                                        </TableCell>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </DraggableRow>
                                ))}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}

export default function SuiviDossiers() {
    const [boards, setBoards] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availableUsers, setAvailableUsers] = useState([
        { id: 'u-yann', name: 'Yann', color: '#60a5fa' },
        { id: 'u-nico', name: 'Nico', color: '#a78bfa' },
    ]);

    useEffect(() => {
        loadBoards();
    }, []);

    const loadBoards = async () => {
        try {
            setLoading(true);
            const data = await ApiService.getBoards();
            setBoards(data || []);
            if (data && data.length > 0 && !activeTab) {
                setActiveTab(data[0].id);
            }
        } catch (error) {
            console.error('Error loading boards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBoard = async () => {
        try {
            const newBoard = await ApiService.createBoard({
                name: 'Nouveau tableau',
                icon: '📊'
            });
            setBoards(prev => [...prev, newBoard]);
            setActiveTab(newBoard.id);
        } catch (error) {
            console.error('Error creating board:', error);
        }
    };

    const activeBoard = boards.find(b => b.id === activeTab);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-slate-600">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header"><h2>Suivi de dossiers</h2></div>
                <Tabs orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="folder-tabs-list">
                        {boards.map(board => (
                            <TabsTrigger key={board.id} value={board.id} className="folder-tab-trigger">
                                <span className="mr-2">{board.icon || '📊'}</span>
                                <span className="font-medium">{board.name}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                <Button variant="ghost" onClick={handleAddBoard} className="mt-4 w-full justify-start"><Plus size={16} className="mr-2" />Ajouter un tableau</Button>
            </aside>

            <main className="admin-main-content">
                {activeBoard ? (
                    <BoardView
                        board={activeBoard}
                        onBoardChange={loadBoards}
                        availableUsers={availableUsers}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500"><p>Sélectionnez ou créez un tableau.</p></div>
                )}
            </main>
        </div>
    );
}
