import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Shuffle, X, Layers } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';

const TransferProjectModal = ({ show, onClose, project, projects = [], onTransfer }) => {
    const [targetTenant, setTargetTenant] = useState('');
    const [loading, setLoading] = useState(false);
    const [transferLinkedData, setTransferLinkedData] = useState(true);

    // Normalize projects list
    const projectList = Array.isArray(projects) && projects.length > 0
        ? projects
        : (Array.isArray(project) ? project : (project ? [project] : []));

    if (!show || projectList.length === 0) return null;

    const isMultiple = projectList.length > 1;
    const firstProject = projectList[0];

    const handleTransfer = async () => {
        if (!targetTenant) {
            toast({ title: "Erreur", description: "Veuillez sélectionner une entreprise de destination." });
            return;
        }
        setLoading(true);
        try {
            let successCount = 0;
            for (const p of projectList) {
                await onTransfer(p.id, targetTenant, { transferLinkedData });
                successCount++;
            }
            toast({
                title: isMultiple ? `${successCount} projets transférés` : "Transfert réussi",
                description: isMultiple
                    ? `${successCount} projets ont été déplacés avec succès.`
                    : "Le projet a été déplacé avec succès.",
            });
            onClose();
        } catch (error) {
            console.error("Transfer failed:", error);
            toast({ title: "Erreur", description: "Le transfert a échoué : " + error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const currentTenantLabel = firstProject.tenantId === 'acama' ? 'ACAMA' : (firstProject.tenantId === 'enr-courtage-energie' ? 'ENR COURTAGE ENERGIE' : 'GREEN INVEST');
    const targetTenantLabel = targetTenant === 'acama' ? 'ACAMA' : (targetTenant === 'enr-courtage-energie' ? 'ENR COURTAGE ENERGIE' : (targetTenant === 'green-invest' ? 'GREEN INVEST' : 'Sélectionner...'));

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4 text-left">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Shuffle className="w-5 h-5 text-indigo-600" />
                        {isMultiple ? `Transférer les projets (${projectList.length})` : 'Transférer le projet'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2.5">
                        {isMultiple ? (
                            <div>
                                <p className="text-sm font-semibold text-indigo-950 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-600" />
                                    Vous allez transférer <span className="bg-indigo-200/80 px-2 py-0.5 rounded font-black text-indigo-900">{projectList.length} projets</span> :
                                </p>
                                <div className="mt-2 max-h-24 overflow-y-auto text-xs text-indigo-900 bg-white/70 rounded-lg p-2 border border-indigo-200/60 space-y-1">
                                    {projectList.map((p, idx) => (
                                        <div key={p.id || idx} className="truncate font-medium">
                                            • {[p.name, p.zip, p.city].filter(Boolean).join(' ') || p.name || 'Projet sans nom'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-indigo-900">
                                Vous allez transférer le projet <strong>{firstProject.name}</strong> de l'interface <strong>{currentTenantLabel}</strong> vers :
                            </p>
                        )}

                        <div className="pt-1">
                            <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                                Entreprise de destination :
                            </label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-950"
                                value={targetTenant}
                                onChange={(e) => setTargetTenant(e.target.value)}
                            >
                                <option value="">Choisir la destination...</option>
                                {firstProject.tenantId !== 'green-invest' && <option value="green-invest">GREEN INVEST</option>}
                                {firstProject.tenantId !== 'enr-courtage-energie' && <option value="enr-courtage-energie">ENR COURTAGE ENERGIE</option>}
                                {firstProject.tenantId !== 'acama' && <option value="acama">ACAMA</option>}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <input
                            type="checkbox"
                            id="transferLinked"
                            checked={transferLinkedData}
                            onChange={(e) => setTransferLinkedData(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <label htmlFor="transferLinked" className="text-sm font-medium text-slate-700 cursor-pointer">
                            Transférer aussi les contacts et tâches liés
                        </label>
                    </div>

                    <p className="text-xs text-slate-500 italic">
                        Note : Une fois transférés, ces projets ne seront plus visibles dans cette interface par les utilisateurs qui n'ont pas accès à {targetTenantLabel}.
                    </p>
                </div>

                <div className="p-6 border-t border-slate-200 flex gap-3 justify-end bg-slate-50">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleTransfer}
                        disabled={loading || !targetTenant}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                    >
                        {loading ? 'Transfert en cours...' : isMultiple ? `Transférer (${projectList.length})` : 'Confirmer le transfert'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TransferProjectModal;
