import React, { useState, useEffect } from 'react';
import {
  BatteryCharging, Sparkles, MapPin, Search, CheckCircle2,
  FileText, Euro, ShieldCheck, Download, Mail, Building, Zap
} from 'lucide-react';
import AutomaticBessProspectingModal from './AutomaticBessProspectingModal.jsx';
import { generateBessProspectingPdfBlob } from './BessPDFGenerator.jsx';

export default function BessSimulator({ selectedProject, onStateUpdate, onSaveSimulation, onExportPDF }) {
  const [isAutomateOpen, setIsAutomateOpen] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [addressResults, setAddressResults] = useState([]);
  const [selectedSite, setSelectedSite] = useState({
    name: 'Projet BESS 500 kW',
    address: '1012 Route de Lannel',
    commune: 'La Chapelle-Montmoreau',
    postalCode: '24300',
    departement: '24',
    lat: 45.4514,
    lng: 0.6548,
    parcelId: '241110000B0786',
    section: '0B',
    numero: '0786',
    ownerName: 'Propriétaire Foncier',
    loyerAnnuel: 2000,
    dureeBail: 20,
    surface: 20,
    puissance: 500,
    capacite: 1044
  });

  const [includeBrochure, setIncludeBrochure] = useState(true);

  // Synchronisation avec l'état global du simulateur
  useEffect(() => {
    if (onStateUpdate && selectedSite) {
      onStateUpdate({
        type: 'bess',
        title: `Centrale BESS 500 kW / 1 044 kWh — ${selectedSite.name}`,
        address: selectedSite.address,
        cityName: selectedSite.commune,
        departement: selectedSite.departement,
        power: 500,
        loyerAnnuel: selectedSite.loyerAnnuel,
        dureeBail: selectedSite.dureeBail,
        surfaceEmprise: selectedSite.surface,
        parcelId: selectedSite.parcelId,
        ownerName: selectedSite.ownerName,
        includeBrochure
      });
    }
  }, [selectedSite, includeBrochure, onStateUpdate]);

  const handleDownloadPdf = async () => {
    const { blob, filename } = await generateBessProspectingPdfBlob({
      nom_societe: selectedSite.ownerName,
      nom: '',
      adresse_ligne1: selectedSite.address,
      code_postal: selectedSite.postalCode,
      ville: selectedSite.commune,
      nomCommune: selectedSite.commune,
      parcelId: selectedSite.parcelId,
      section: selectedSite.section,
      numero: selectedSite.numero
    }, { includeBrochure });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-180px)] bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 rounded-3xl overflow-hidden border border-slate-800/60 shadow-2xl p-5 sm:p-8 flex flex-col justify-between">
      <div>
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <BatteryCharging className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Batteries de Soutien Réseau BESS</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  HTA Sol
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 font-medium">
                Sourcing foncier de transformateurs HTA/BT au sol &bull; Qualification des propriétaires &bull; Génération de courriers de bail 20 ans
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAutomateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-sm shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Lancer l'automate de prospection BESS sur le réseau Enedis"
          >
            <Sparkles className="w-4 h-4 fill-black shrink-0" />
            <span>Automate BESS (Transfos Sol)</span>
          </button>
        </div>

        {/* 3 GRANDS BLOCS DE SYNTHÈSE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">

          {/* BLOC 1 : CONDITIONS DU BAIL NOTARIÉ */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Euro className="w-4 h-4" /> Conditions du Bail
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Garanti 20 Ans
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">Loyer Foncier Annuel</span>
                  <span className="text-xl font-black text-emerald-400">2 000 € / an</span>
                </div>
                <span className="text-xs text-slate-400 font-semibold">Net de charges</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">Emprise Foncière Requise</span>
                  <span className="text-xl font-black text-white">20 m²</span>
                </div>
                <span className="text-xs text-slate-400 font-semibold">Dalle béton clôturée</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">Total Loyers Sur 20 Ans</span>
                  <span className="text-xl font-black text-amber-400">40 000 €</span>
                </div>
                <span className="text-xs text-slate-400 font-semibold">Indexation annuelle</span>
              </div>
            </div>
          </div>

          {/* BLOC 2 : SPÉCIFICATIONS TECHNIQUES BESS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Spécifications Techniques
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                500 kW / 1 044 kWh
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400 font-medium">Configuration :</span>
                <span className="font-bold text-white">4 armoires CESC Mercury 261 (125 kW / 261 kWh)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400 font-medium">Technologie :</span>
                <span className="font-bold text-emerald-400">LiFePO4 certifié &bull; HVAC Liquide</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400 font-medium">Sécurité Incendie :</span>
                <span className="font-bold text-white">Aérosol asservi NFPA 855</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400 font-medium">Clôture Périmétrique :</span>
                <span className="font-bold text-white">Grillage rigide thermolaqué H 2.00m</span>
              </div>
            </div>
          </div>

          {/* BLOC 3 : SITE ACTIF SÉLECTIONNÉ & DOCUMENT */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Building className="w-4 h-4" /> Site &amp; Bailleur Actif
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Parcelle {selectedSite.section} {selectedSite.numero}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="font-bold text-white text-sm">{selectedSite.ownerName}</div>
                <div className="text-slate-300">{selectedSite.address}</div>
                <div className="text-slate-400">{selectedSite.postalCode} {selectedSite.commune}</div>
                <div className="text-[11px] text-emerald-400 font-mono mt-1">
                  Parcelle : {selectedSite.parcelId}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBrochure}
                  onChange={(e) => setIncludeBrochure(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <span>Joindre la Brochure ENR Courtage (V3)</span>
              </label>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger le Courrier Personnalisé</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* PIED DE PAGE */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Régime délibéré CRE 2025-227 &bull; Soutien tension &amp; réserve 50 Hz Enedis.</span>
        </div>
        <div className="text-slate-400 font-semibold">
          ENR COURTAGE &bull; M&amp;A Infrastructure &amp; Stockage Stationnaire BESS
        </div>
      </div>

      {/* MODAL DE PROSPECTION AUTOMATISÉE */}
      <AutomaticBessProspectingModal
        isOpen={isAutomateOpen}
        onClose={() => setIsAutomateOpen(false)}
        defaultCommune={selectedSite.commune}
        onSelectProspect={(prospect) => {
          setSelectedSite({
            name: `Centrale BESS — ${prospect.ville || prospect.commune}`,
            address: prospect.adresse_ligne1,
            commune: prospect.ville || prospect.commune,
            postalCode: prospect.code_postal,
            departement: prospect.departement || '24',
            lat: prospect.lat,
            lng: prospect.lng,
            parcelId: prospect.parcelId,
            section: prospect.section,
            numero: prospect.numero,
            ownerName: prospect.nom_societe || 'Propriétaire Foncier',
            loyerAnnuel: 2000,
            dureeBail: 20,
            surface: 20,
            puissance: 500,
            capacite: 1044
          });
        }}
      />
    </div>
  );
}
