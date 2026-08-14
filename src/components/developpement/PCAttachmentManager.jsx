import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, Image as ImageIcon, Sparkles, CheckCircle2, RefreshCw, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function PCAttachmentManager({ project, onSaveAttachments }) {
  const [activePcTab, setActivePcTab] = useState('pc3');
  const [modelSelect, setModelSelect] = useState('AS 7.2');
  const [traveesCount, setTraveesCount] = useState(4);
  const [pc4Text, setPc4Text] = useState('Notice descriptive pour la construction d\'un bâtiment agricole avec charpente métallique et panneaux photovoltaïques.');

  // Photos PC6, PC7, PC8
  const [photoBefore, setPhotoBefore] = useState(project?.photos?.[0] || null);
  const [photoAfter, setPhotoAfter] = useState(null);
  const [photoPc7, setPhotoPc7] = useState(project?.photos?.[1] || null);
  const [photoPc8, setPhotoPc8] = useState(project?.photos?.[2] || null);
  const [isSimulating3D, setIsSimulating3D] = useState(false);

  const beforeInputRef = useRef(null);
  const pc7InputRef = useRef(null);
  const pc8InputRef = useRef(null);

  // 3D Canvas Insertion Simulation (PC6)
  const handleSimulate3D = () => {
    if (!photoBefore) {
      toast({ title: "Photo manquante", description: "Veuillez d'abord charger la photo Avant Projet (PC6).", variant: "destructive" });
      return;
    }
    setIsSimulating3D(true);
    setTimeout(() => {
      // Create canvas overlay simulation
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photoBefore;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 800;
        canvas.height = img.height || 600;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Draw simulated 3D solar building overlay
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.45);
        ctx.lineTo(w * 0.8, h * 0.4);
        ctx.lineTo(w * 0.85, h * 0.75);
        ctx.lineTo(w * 0.15, h * 0.8);
        ctx.closePath();
        ctx.fill();

        // Draw solar panel grid
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('SIMULATION 3D BÂTIMENT SOLAIRE NELSON', w * 0.25, h * 0.6);

        setPhotoAfter(canvas.toDataURL('image/jpeg', 0.9));
        setIsSimulating3D(false);
        toast({ title: "Simulation 3D générée !", description: "L'insertion paysagère (Après Projet) a été créée avec succès." });
      };
    }, 1200);
  };

  const handleUploadPhoto = (e, setPhoto) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhoto(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Gestionnaire de Pièces Jointes PC (PC1 à PC8)</h3>
          <p className="text-xs text-slate-500">Extraction de plans de référence, notice agricole & simulation 3D</p>
        </div>
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button onClick={() => setActivePcTab('pc3')} className={`px-3 py-1.5 rounded-lg transition-all ${activePcTab === 'pc3' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>PC3</button>
          <button onClick={() => setActivePcTab('pc4')} className={`px-3 py-1.5 rounded-lg transition-all ${activePcTab === 'pc4' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>PC4</button>
          <button onClick={() => setActivePcTab('pc5')} className={`px-3 py-1.5 rounded-lg transition-all ${activePcTab === 'pc5' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>PC5</button>
          <button onClick={() => setActivePcTab('pc6')} className={`px-3 py-1.5 rounded-lg transition-all ${activePcTab === 'pc6' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>PC6 (3D)</button>
          <button onClick={() => setActivePcTab('pc78')} className={`px-3 py-1.5 rounded-lg transition-all ${activePcTab === 'pc78' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>PC7 / PC8</button>
        </div>
      </div>

      {/* PC3: Plan en coupe */}
      {activePcTab === 'pc3' && (
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-900">
            <span className="font-bold">PC3 - Plan en coupe du terrain et de la construction</span>
            <p className="text-slate-600 mt-1">Extraction automatique du plan de référence d'après le modèle sélectionné.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Modèle de Bâtiment Barconnière</label>
              <select value={modelSelect} onChange={(e) => setModelSelect(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg outline-none font-medium">
                <option value="AS 7.2">AS 7.2 (30x16m + 2 auvents)</option>
                <option value="AS 8.0">AS 8.0 (36x18m)</option>
                <option value="AS 10.0">AS 10.0 (42x20m)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => toast({ title: "PC3 prêt", description: `Plan en coupe du modèle ${modelSelect} extrait (Page 11).` })} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Extraire plan PC3 (Page 11)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PC4: Notice descriptive */}
      {activePcTab === 'pc4' && (
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-900">
            <span className="font-bold">PC4 - Notice descriptive / agricole</span>
            <p className="text-slate-600 mt-1">Complétez le descriptif du projet ou téléchargez un document personnalisé.</p>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Contenu de la notice PC4</label>
            <Textarea rows={4} value={pc4Text} onChange={(e) => setPc4Text(e.target.value)} className="w-full" />
          </div>
        </div>
      )}

      {/* PC5: Plan des façades */}
      {activePcTab === 'pc5' && (
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-900">
            <span className="font-bold">PC5 - Plan des façades et des toitures</span>
            <p className="text-slate-600 mt-1">Calculé à partir du nombre de travées et de la longueur totale du bâtiment.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nombre de travées</label>
              <Input type="number" value={traveesCount} onChange={(e) => setTraveesCount(Number(e.target.value))} min={1} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => toast({ title: "PC5 prêt", description: `Plan des façades pour ${traveesCount} travées généré.` })} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Extraire façades PC5 ({traveesCount * 6}m)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PC6: Simulation 3D Avant/Après */}
      {activePcTab === 'pc6' && (
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-purple-900 flex justify-between items-center">
            <div>
              <span className="font-bold">PC6 - Document graphique d'insertion 3D (Avant / Après)</span>
              <p className="text-slate-600 mt-1">Chargez la photo terrain et lancez le calcul automatique d'insertion 3D.</p>
            </div>
            <Button onClick={handleSimulate3D} disabled={isSimulating3D} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              {isSimulating3D ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              Générer simulation 3D
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center min-h-[180px]">
              <span className="font-bold text-slate-700 mb-2">1. Photo Avant Projet</span>
              {photoBefore ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200">
                  <img src={photoBefore} alt="Avant" className="w-full h-full object-cover" />
                  <button onClick={() => beforeInputRef.current?.click()} className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/60 text-white rounded text-[10px]">Changer</button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => beforeInputRef.current?.click()} size="sm">
                  <Upload className="w-4 h-4 mr-1.5" /> Charger photo terrain
                </Button>
              )}
              <input type="file" ref={beforeInputRef} onChange={(e) => handleUploadPhoto(e, setPhotoBefore)} className="hidden" accept="image/*" />
            </div>

            <div className="p-4 border border-dashed border-purple-200 rounded-xl bg-purple-50/40 flex flex-col items-center justify-center min-h-[180px]">
              <span className="font-bold text-purple-900 mb-2">2. Simulation Après Projet (PC6)</span>
              {photoAfter ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-purple-300">
                  <img src={photoAfter} alt="Après" className="w-full h-full object-cover" />
                </div>
              ) : (
                <p className="text-slate-400 italic text-center">La simulation 3D générée apparaîtra ici</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PC7 & PC8: Environnement proche et lointain */}
      {activePcTab === 'pc78' && (
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-900">
            <span className="font-bold">PC7 (Environnement proche) & PC8 (Environnement lointain)</span>
            <p className="text-slate-600 mt-1">Attribuez les photos prises sur le terrain aux pièces PC7 et PC8.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
              <span className="font-bold text-slate-800">PC7 - Environnement proche</span>
              {photoPc7 ? (
                <div className="h-32 rounded-lg overflow-hidden border border-slate-200">
                  <img src={photoPc7} alt="PC7" className="w-full h-full object-cover" />
                </div>
              ) : (
                <Button variant="outline" onClick={() => pc7InputRef.current?.click()} size="sm" className="w-full">
                  <Upload className="w-4 h-4 mr-1.5" /> Photo PC7 (Proche)
                </Button>
              )}
              <input type="file" ref={pc7InputRef} onChange={(e) => handleUploadPhoto(e, setPhotoPc7)} className="hidden" accept="image/*" />
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
              <span className="font-bold text-slate-800">PC8 - Environnement lointain</span>
              {photoPc8 ? (
                <div className="h-32 rounded-lg overflow-hidden border border-slate-200">
                  <img src={photoPc8} alt="PC8" className="w-full h-full object-cover" />
                </div>
              ) : (
                <Button variant="outline" onClick={() => pc8InputRef.current?.click()} size="sm" className="w-full">
                  <Upload className="w-4 h-4 mr-1.5" /> Photo PC8 (Lointain)
                </Button>
              )}
              <input type="file" ref={pc8InputRef} onChange={(e) => handleUploadPhoto(e, setPhotoPc8)} className="hidden" accept="image/*" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
