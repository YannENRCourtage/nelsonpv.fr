import React, { useState, useRef } from 'react';
import {
  GitFork,
  Plus,
  Trash2,
  Copy,
  ArrowUpRight,
  ExternalLink,
  Check,
  MoreVertical,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function SubItemsTable({
  parentRow,
  columns = [],
  subItems = [],
  onUpdateSubItem,
  onAddSubItem,
  onDeleteSubItem,
  onDuplicateSubItem,
  onPromoteSubItem,
  columnWidths = {}
}) {
  const [newSubItemName, setNewSubItemName] = useState('');
  const [copiedCellKey, setCopiedCellKey] = useState(null);
  const firstCol = columns[0] || 'NAME';
  const parentTitle = parentRow?.data?.[firstCol] || 'Élément';

  const handleCopy = (key, text) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text)).then(() => {
      setCopiedCellKey(key);
      setTimeout(() => setCopiedCellKey(null), 1500);
    }).catch(err => console.error('Erreur copie:', err));
  };

  const handleQuickAdd = (e) => {
    if (e) e.preventDefault();
    const name = newSubItemName.trim();
    if (!name) return;
    onAddSubItem({ [firstCol]: name });
    setNewSubItemName('');
  };

  return (
    <div className="py-2.5 px-4 sm:pl-12 sm:pr-6 bg-slate-50/80 border-b border-slate-200">
      <div className="rounded-xl border border-blue-200/90 bg-white shadow-xs overflow-hidden">
        {/* En-tête du sous-tableau */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-700">
              <GitFork className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-slate-800 tracking-tight">
              Sous-éléments de <span className="text-blue-700 font-black">"{parentTitle}"</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              {subItems.length} {subItems.length > 1 ? 'sous-éléments' : 'sous-élément'}
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => onAddSubItem({})}
            className="h-6 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2.5 shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>Ajouter un sous-élément</span>
          </Button>
        </div>

        {/* Tableau des sous-éléments */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse table-fixed">
            <thead className="text-[11px] text-slate-600 uppercase bg-slate-100/70 border-b border-slate-200">
              <tr>
                <th className="w-8 px-2 py-1.5 text-center text-slate-400 font-bold border-r border-slate-200">
                  #
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={`sub-th-${col}`}
                    style={{ width: columnWidths[col] || 150, minWidth: columnWidths[col] || 150 }}
                    className="px-2.5 py-1.5 font-bold border-r border-slate-200 truncate text-slate-700"
                  >
                    {idx === 0 ? `SOUS-ÉLÉMENT (${col})` : col}
                  </th>
                ))}
                <th className="w-12 px-1 py-1.5 text-center font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subItems.map((sub, sIdx) => {
                return (
                  <tr key={sub.id || sIdx} className="hover:bg-blue-50/40 group transition-colors">
                    <td className="w-8 px-2 py-1.5 text-center text-slate-400 font-mono text-[10px] border-r border-slate-200 bg-slate-50/50">
                      {sIdx + 1}
                    </td>

                    {columns.map((col) => {
                      const val = sub.data?.[col] || '';
                      const cellKey = `${sub.id}-${col}`;
                      const isCopied = copiedCellKey === cellKey;
                      const isPassword = col.toLowerCase().includes('pass') || col.toLowerCase().includes('mdp');
                      const isUrl = String(val).startsWith('http://') || String(val).startsWith('https://');

                      return (
                        <td
                          key={cellKey}
                          style={{ width: columnWidths[col] || 150, minWidth: columnWidths[col] || 150 }}
                          className="p-0 border-r border-slate-200 relative"
                        >
                          <div className="relative flex items-center h-8">
                            <input
                              className={cn(
                                "w-full h-full px-2.5 py-1 text-xs bg-transparent focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-500 transition-colors truncate",
                                isPassword ? "font-mono font-medium text-slate-800" : "text-slate-700"
                              )}
                              value={val}
                              onChange={(e) => onUpdateSubItem(sub.id, col, e.target.value)}
                              placeholder={`—`}
                              title={val}
                            />

                            {/* Actions rapides sur cellule (Copier / Lien externe) */}
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isUrl && (
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                                  title="Ouvrir le lien"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {val && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(cellKey, val);
                                  }}
                                  className={cn(
                                    "p-1 rounded transition-colors",
                                    isCopied ? "bg-emerald-100 text-emerald-700" : "hover:bg-blue-100 text-slate-400 hover:text-blue-600"
                                  )}
                                  title={isCopied ? "Copié !" : "Copier la valeur"}
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-600 font-bold" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    <td className="w-12 px-1 py-1 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                              title="Options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            {onDuplicateSubItem && (
                              <DropdownMenuItem onClick={() => onDuplicateSubItem(sub.id)}>
                                <Copy className="w-3.5 h-3.5 mr-2 text-blue-600" /> Dupliquer ce sous-élément
                              </DropdownMenuItem>
                            )}
                            {onPromoteSubItem && (
                              <DropdownMenuItem onClick={() => onPromoteSubItem(sub.id)}>
                                <ArrowUpRight className="w-3.5 h-3.5 mr-2 text-amber-600" /> Extraire en ligne principale
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onDeleteSubItem(sub.id)} className="text-red-600">
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer ce sous-élément
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Ligne d'ajout rapide inline */}
              <tr className="bg-slate-50/50 hover:bg-blue-50/30">
                <td className="w-8 px-2 py-1.5 text-center text-blue-500 font-bold border-r border-slate-200">
                  <Plus className="w-3.5 h-3.5 mx-auto" />
                </td>
                <td colSpan={columns.length + 1} className="p-1.5">
                  <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubItemName}
                      onChange={(e) => setNewSubItemName(e.target.value)}
                      placeholder={`+ Ajouter un nouveau sous-élément pour ${parentTitle}...`}
                      className="w-full max-w-sm px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {newSubItemName.trim() && (
                      <Button
                        type="submit"
                        size="sm"
                        className="h-6 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Ajouter
                      </Button>
                    )}
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
