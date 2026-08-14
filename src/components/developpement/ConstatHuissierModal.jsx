import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock, Calendar, Upload, FileCheck, ShieldCheck, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function ConstatHuissierModal({ project, isOpen, onClose }) {
  const [panelDate, setPanelDate] = useState(new Date().toISOString().split('T')[0]);
  const [constat1Date, setConstat1Date] = useState(new Date().toISOString().split('T')[0]);
  const [constat2Date, setConstat2Date] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d.toISOString().split('T')[0];
  });
  const [constat3Date, setConstat3Date] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return d.toISOString().split('T')[0];
  });

  const [step1Done, setStep1Done] = useState(true);
  const [step2Done, setStep2Done] = useState(true);
  const [step3Done, setStep3Done] = useState(false);
  const [step4Done, setStep4Done] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    toast({ title: "Suivi Huissier mis à jour !", description: "Les dates et constatations d'huissier ont été enregistrées." });
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Constats d'Huissier (Purge du Recours)</h3>
              <p className="text-xs text-slate-500">Installation du panneau et 3 passages d'huissier espacés de 2 mois</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Step 1 */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${step1Done ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${step1Done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>1</div>
              <div>
                <span className="font-bold text-slate-800">Installation du panneau de chantier</span>
                <p className="text-slate-500 text-[11px]">Affichage visible sur le terrain</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={panelDate} onChange={(e) => setPanelDate(e.target.value)} className="w-36 h-8 text-xs" />
              <Button size="sm" variant={step1Done ? "default" : "outline"} onClick={() => setStep1Done(!step1Done)} className={step1Done ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                {step1Done ? "Fait" : "Valider"}
              </Button>
            </div>
          </div>

          {/* Step 2 */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${step2Done ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${step2Done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>2</div>
              <div>
                <span className="font-bold text-slate-800">1ère Constatation d'huissier (J0)</span>
                <p className="text-slate-500 text-[11px]">Procès-verbal de dépôt d'affichage</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={constat1Date} onChange={(e) => setConstat1Date(e.target.value)} className="w-36 h-8 text-xs" />
              <Button size="sm" variant={step2Done ? "default" : "outline"} onClick={() => setStep2Done(!step2Done)} className={step2Done ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                {step2Done ? "Fait" : "Valider"}
              </Button>
            </div>
          </div>

          {/* Step 3 */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${step3Done ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${step3Done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>3</div>
              <div>
                <span className="font-bold text-slate-800">2ème Constatation (+2 mois)</span>
                <p className="text-slate-500 text-[11px]">Vérification de la continuité d'affichage</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={constat2Date} onChange={(e) => setConstat2Date(e.target.value)} className="w-36 h-8 text-xs" />
              <Button size="sm" variant={step3Done ? "default" : "outline"} onClick={() => setStep3Done(!step3Done)} className={step3Done ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                {step3Done ? "Fait" : "Valider"}
              </Button>
            </div>
          </div>

          {/* Step 4 */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${step4Done ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${step4Done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>4</div>
              <div>
                <span className="font-bold text-slate-800">3ème Constatation (+4 mois - Purge)</span>
                <p className="text-slate-500 text-[11px]">Constat final et certificat de non-recours</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={constat3Date} onChange={(e) => setConstat3Date(e.target.value)} className="w-36 h-8 text-xs" />
              <Button size="sm" variant={step4Done ? "default" : "outline"} onClick={() => setStep4Done(!step4Done)} className={step4Done ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                {step4Done ? "Fait" : "Valider"}
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} size="sm">Annuler</Button>
          <Button onClick={handleSave} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">Enregistrer le suivi huissier</Button>
        </div>
      </div>
    </div>
  );
}
