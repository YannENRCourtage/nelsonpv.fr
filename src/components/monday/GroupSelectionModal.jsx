import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GitFork, Layers, CheckCircle2, Sparkles, FolderPlus } from 'lucide-react';

export default function GroupSelectionModal({
  open,
  onClose,
  selectedRows = [],
  firstColumnName = 'NAME',
  onConfirmGroup
}) {
  const [parentName, setParentName] = useState('');
  const [cleanPrefix, setCleanPrefix] = useState(true);
  const [mode, setMode] = useState('new'); // 'new' | 'existing'
  const [existingParentId, setExistingParentId] = useState('');

  // Détection automatique du préfixe commun parmi les lignes sélectionnées
  useEffect(() => {
    if (!open || selectedRows.length === 0) return;

    const names = selectedRows.map(r => String(r.data?.[firstColumnName] || '').trim()).filter(Boolean);
    if (names.length === 0) return;

    // Détecter le premier mot commun le plus fréquent
    const firstWords = names.map(n => n.split(/[\s_-]+/)[0].toUpperCase());
    const counts = {};
    firstWords.forEach(w => { counts[w] = (counts[w] || 0) + 1; });

    let bestPrefix = '';
    let maxCount = 0;
    Object.entries(counts).forEach(([w, cnt]) => {
      if (cnt > maxCount && w.length >= 2) {
        maxCount = cnt;
        bestPrefix = w;
      }
    });

    if (bestPrefix && maxCount >= Math.min(2, names.length)) {
      setParentName(bestPrefix);
    } else {
      setParentName(firstWords[0] || 'GROUPE');
    }
    setCleanPrefix(true);
  }, [open, selectedRows, firstColumnName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!parentName.trim()) return;
    onConfirmGroup(parentName.trim(), cleanPrefix);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg z-[99999] bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900">
                Regrouper en Sous-éléments
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Fusionner les {selectedRows.length} lignes sélectionnées sous un élément parent (style Monday).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Nom de l'élément parent *
            </label>
            <Input
              value={parentName}
              onChange={(e) => setParentName(e.target.value.toUpperCase())}
              placeholder="ex: GOOGLE ou NELSON"
              className="h-10 text-sm font-black uppercase tracking-wide"
              autoFocus
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Un élément principal nommé <strong className="text-blue-700">"{parentName || '...'}"</strong> contiendra tous les sous-éléments.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cleanPrefix}
                onChange={(e) => setCleanPrefix(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-700">
                Nettoyer le préfixe dans les sous-éléments
              </span>
            </label>
            <p className="text-[10.5px] text-slate-500 pl-6">
              Exemple : <span className="line-through text-slate-400">"{parentName || 'GOOGLE'} RH"</span> deviendra <strong className="text-slate-800">"RH"</strong> à l'intérieur du groupe.
            </p>
          </div>

          {/* Aperçu des lignes qui seront regroupées */}
          <div>
            <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
              Aperçu des sous-éléments ({selectedRows.length}) :
            </span>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 p-2 space-y-1">
              {selectedRows.slice(0, 8).map((r, i) => {
                const orig = r.data?.[firstColumnName] || 'Ligne';
                let preview = orig;
                if (cleanPrefix && parentName) {
                  const reg = new RegExp(`^${parentName}\\s*[-_:]?\\s*`, 'i');
                  preview = orig.replace(reg, '').trim() || orig;
                }
                return (
                  <div key={r.id || i} className="flex items-center justify-between text-xs text-slate-700 px-2 py-1 bg-white rounded border border-slate-100">
                    <span className="font-semibold truncate max-w-[200px]">{orig}</span>
                    <span className="text-[11px] text-blue-600 font-bold truncate">↳ {preview}</span>
                  </div>
                );
              })}
              {selectedRows.length > 8 && (
                <div className="text-[10.5px] text-center text-slate-400 font-medium pt-1">
                  ... et {selectedRows.length - 8} autre(s) ligne(s)
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9">
              Annuler
            </Button>
            <Button type="submit" size="sm" className="h-9 font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Valider le regroupement</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
