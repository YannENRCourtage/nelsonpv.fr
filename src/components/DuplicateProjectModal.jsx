import React, { useState } from 'react';
import { Copy, X } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';

const DuplicateProjectModal = ({ show, onClose, project, onDuplicate }) => {
    const [targetTenant, setTargetTenant] = useState('');
    const [loading, setLoading] = useState(false);
    const [transferLinkedData, setTransferLinkedData] = useState(true);

    if (!show || !project) return null;

    const handleDuplicate = async () => {
        if (!targetTenant) {
            toast({ title: "Erreur", description: "Veuillez sélectionner une entreprise de destination." });
            return;
        }
        setLoading(true);
        try {
            await onDuplicate(project.id, targetTenant, { transferLinkedData });
            onClose();
        } catch (error) {
            console.error("Duplication failed:", error);
            toast({ title: "Erreur", description: "La duplication a échoué : " + error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const currentTenantLabel = project.tenantId === 'acama' ? 'ACAMA' : 'GREEN INVEST';
    const targetTenantLabel = targetTenant === 'acama' ? 'ACAMA' : targetTenant === 'green-invest' ? 'GREEN INVEST' : 'Sélectionner...';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 text-left">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Copy className="w-5 h-5 text-blue-600" />
                        Dupliquer le projet
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                        <p className="text-sm text-blue-800">
                            Vous allez dupliquer le projet <strong>{project.name}</strong> (actuellement dans <strong>{currentTenantLabel}</strong>) vers l'interface :
                        </p>
                        <select
                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900"
                            value={targetTenant}
                            onChange={(e) => setTargetTenant(e.target.value)}
                        >
                            <option value="">Choisir la destination...</option>
                            <option value="green-invest">GREEN INVEST</option>
                            <option value="acama">ACAMA</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <input
                            type="checkbox"
                            id="duplicateLinked"
                            checked={transferLinkedData}
                            onChange={(e) => setTransferLinkedData(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="duplicateLinked" className="text-sm font-medium text-slate-700 cursor-pointer">
                            Dupliquer aussi le contact et les tâches liés
                        </label>
                    </div>

                    <p className="text-xs text-slate-500 italic">
                        Note : Le projet original sera conservé dans {currentTenantLabel}. Une copie exacte sera créée dans {targetTenantLabel}.
                    </p>
                </div>

                <div className="p-6 border-t border-slate-200 flex gap-3 justify-end bg-slate-50">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleDuplicate}
                        disabled={loading || !targetTenant}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                    >
                        {loading ? 'Duplication...' : 'Confirmer la duplication'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateProjectModal;
