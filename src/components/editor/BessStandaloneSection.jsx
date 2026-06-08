import React, { useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ---- Helpers couleur ----
function getStatusMeta(result) {
  if (!result) return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', dot: 'bg-gray-400' };
  const r = result.toUpperCase();
  if (r.startsWith('NO-GO')) return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400', dot: 'bg-red-500' };
  if (r.startsWith('GO')) return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400', dot: 'bg-green-500' };
  if (r.startsWith('ORANGE') || r.startsWith('A RENS')) return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400', dot: 'bg-orange-500' };
  return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', dot: 'bg-gray-400' };
}

function VerdictBadge({ result, size = 'sm' }) {
  const m = getStatusMeta(result);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border ${m.bg} ${m.text} ${m.border} ${size === 'lg' ? 'text-base px-3 py-1' : 'text-sm'}`}>
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {result || '—'}
    </span>
  );
}

// ---- Input sans bug numérique ----
function NumInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded border border-gray-200 px-1.5 py-1 text-sm bg-green-50 focus:outline-none focus:border-blue-400 focus:bg-white w-full"
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded border border-gray-200 px-1.5 py-1 text-sm bg-green-50 focus:outline-none focus:border-blue-400 w-full"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ---- Jauge donut ----
function DonutGauge({ score }) {
  const r = 42;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100);
  const filled = (pct / 100) * circumference;
  const empty = circumference - filled;
  const color = pct >= 90 ? '#22c55e' : pct >= 75 ? '#f97316' : '#ef4444';
  return (
    <svg viewBox="0 0 112 112" className="w-full h-full">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${empty}`}
        strokeDashoffset={circumference / 4}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">{pct}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="#64748b">Score global</text>
    </svg>
  );
}

// ============================================================
//  PANEL RÉSULTATS — Scores en largeur identique
// ============================================================
function ResultsPanel({ indicators, scoreGO, scoreORANGE, scoreNOGO, verdict }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Tableau indicateurs */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-slate-700 text-white text-sm font-bold grid grid-cols-12 px-2 py-1.5">
          <div className="col-span-3">Indicateur</div>
          <div className="col-span-4">Résultat</div>
          <div className="col-span-5">Lecture</div>
        </div>
        {indicators.map((ind, i) => {
          const m = getStatusMeta(ind.result);
          return (
            <div key={i} className={`grid grid-cols-12 text-sm px-2 py-1.5 border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <div className="col-span-3 flex items-center text-gray-700 font-medium leading-tight">{ind.label}</div>
              <div className="col-span-4 flex items-center gap-1">
                {ind.result && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.dot}`} />}
                <span className={`font-bold ${m.text} leading-tight`}>{ind.result || '—'}</span>
              </div>
              <div className="col-span-5 text-gray-400 leading-tight text-xs">{ind.lecture}</div>
            </div>
          );
        })}
      </div>

      {/* Scores identiques + Verdict */}
      <div className="flex items-center gap-1.5">
        {[
          { label: 'GO', val: scoreGO, c: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'ORANGE', val: scoreORANGE, c: 'bg-orange-50 text-orange-700 border-orange-200' },
          { label: 'NO-GO', val: scoreNOGO, c: 'bg-red-50 text-red-700 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`flex items-center justify-center gap-1.5 rounded border py-1 w-20 flex-shrink-0 ${s.c}`}>
            <span className="text-xs font-medium opacity-70">{s.label}</span>
            <span className="text-base font-extrabold">{s.val}</span>
          </div>
        ))}
        <div className="ml-auto flex-shrink-0">
          <VerdictBadge result={verdict} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  CALCULS URBANISME
// ============================================================
function calcUrbanisme(d) {
  const surf = parseFloat(d.surfaceBatie) || 0;
  const haut = parseFloat(d.hauteurBati) || 0;
  const distHab = parseFloat(d.distanceHabitation) || 0;
  const distERP = parseFloat(d.distanceERP) || 0;

  let regimeUrbanisme = '';
  if (!d.zonePLU || !d.surfaceBatie || !d.hauteurBati) {
    regimeUrbanisme = 'A renseigner';
  } else if (['A', 'N', 'F'].includes(d.zonePLU)) {
    if (surf > 20 || haut > 20) regimeUrbanisme = "Permis de construire estimé + justification intérêt collectif";
    else if (surf > 5 && surf < 20) regimeUrbanisme = "Déclaration préalable estimée + justification intérêt collectif";
    else if (haut > 12) regimeUrbanisme = "Permis de construire estimé + consultation ABF/servitudes";
    else regimeUrbanisme = "Aucune formalité estimée";
    if (d.zoneProtegee === 'Oui') regimeUrbanisme = "Permis de construire estimé + consultation ABF/servitudes";
  } else {
    if (surf > 20 || haut > 20) regimeUrbanisme = "Permis de construire estimé";
    else if (surf > 5 && surf < 20) regimeUrbanisme = "Déclaration préalable estimée";
    else regimeUrbanisme = "Aucune formalité estimée";
  }

  let resPLU = '';
  if (d.zonePLU) {
    if (['U', 'UX', 'UY', 'UE'].includes(d.zonePLU)) resPLU = 'GO sous-condition justification';
    else if (d.zonePLU === 'AU') resPLU = 'ORANGE - à confirmer';
    else if (['A', 'N', 'F'].includes(d.zonePLU)) resPLU = 'GO sous-condition justification intérêt collectif';
    else resPLU = 'ORANGE - à confirmer';
  }

  let resRegime = '';
  if (regimeUrbanisme) {
    if (regimeUrbanisme.startsWith('Aucune') || regimeUrbanisme.startsWith('Déclaration')) resRegime = 'GO';
    else if (regimeUrbanisme.startsWith('Permis')) resRegime = 'ORANGE - cycle long';
    else resRegime = 'A renseigner';
  }

  let resDistHab = !d.distanceHabitation ? '' : distHab >= 25 ? 'GO De principe' : distHab >= 12 ? 'ORANGE - sensibilité' : 'NO-GO';
  let resDistERP = !d.distanceERP ? '' : distERP >= 100 ? 'GO' : distERP >= 18 ? 'ORANGE - sensibilité' : 'NO-GO';
  let resPEI = !d.pointEauIncendie ? '' : d.pointEauIncendie === 'Oui' ? 'GO' : d.pointEauIncendie === 'Inconnu' ? 'ORANGE - à vérifier' : 'GO Sous condition';
  let resAcces = !d.accesVoiePompiers ? '' : d.accesVoiePompiers === 'Oui' ? 'GO' : d.accesVoiePompiers === 'A aménager' ? 'ORANGE - travaux' : 'NO-GO';
  let resZone = !d.zoneProtegee ? '' : d.zoneProtegee === 'Non' ? 'GO' : d.zoneProtegee === 'Inconnu' ? 'ORANGE - à qualifier' : 'NO-GO';

  const indicators = [
    { label: 'Zone PLU', result: resPLU, lecture: 'U/UX/UY/UE = favorable ; AU = vérif PLU ; A/N/F = sensibilité forte' },
    { label: 'Régime urbanisme estimé', result: resRegime, lecture: 'DP = chemin court ; PC = cycle long' },
    { label: 'Distance habitation (m)', result: resDistHab, lecture: '< 25m = forte sensibilité acoustique/SDIS' },
    { label: 'Distance ERP / site sensible (m)', result: resDistERP, lecture: '< 100m = exposition sensible' },
    { label: "Point d'eau incendie / PEI", result: resPEI, lecture: 'Pré-requis majeur SDIS' },
    { label: 'Accès voie engins pompiers', result: resAcces, lecture: 'Accessibilité insuffisante = blocage' },
    { label: 'Zone protégée / ABF / servitude', result: resZone, lecture: 'Servitudes = risque délai et prescriptions' },
  ];

  const scoreGO = indicators.filter(r => r.result && r.result.toUpperCase().startsWith('GO')).length;
  const scoreORANGE = indicators.filter(r => r.result && r.result.toUpperCase().startsWith('ORANGE')).length;
  const scoreNOGO = indicators.filter(r => r.result && r.result.toUpperCase().startsWith('NO-GO')).length;

  let verdict = '';
  if (scoreNOGO > 0) verdict = 'NO-GO - blocage urbanisme / SDIS';
  else if (scoreORANGE >= 3) verdict = 'GO sous conditions - plusieurs points à sécuriser';
  else if (scoreGO >= 6) verdict = 'GO';
  else if (scoreGO > 0 || scoreORANGE > 0) verdict = 'GO sous conditions - instruction amont requise';

  return { regimeUrbanisme, indicators, scoreGO, scoreORANGE, scoreNOGO, verdict };
}

// ============================================================
//  CALCULS RACCORDEMENT
// ============================================================
function calcRaccordement(d) {
  const puissRacc = parseFloat(d.puissanceRaccordee) || 0;
  const cosPhi = parseFloat(d.cosPhi) || 1;
  const longueurTranchee = parseFloat(d.longueurTranchee) || 0;

  const capaciteEnergie = puissRacc * 2;
  const nombrePDL = puissRacc <= 250 ? 1 : 2;
  const puissanceRef = cosPhi > 0 ? puissRacc / cosPhi : puissRacc;

  let domaineTension = !d.puissanceRaccordee ? 'A renseigner' : puissanceRef <= 250 ? 'BT triphasé' : 'HTA';
  const posteLivraisonHTA = puissanceRef > 250 ? 'Oui' : 'Non';

  let resPuissanceDomaine = !d.puissanceRaccordee ? '' : puissanceRef <= 120 ? 'GO' : puissanceRef <= 250 ? 'ORANGE - BT lourd' : 'ORANGE - HTA';
  let resDomaineTension = !domaineTension || domaineTension === 'A renseigner' ? '' : domaineTension === 'BT triphasé' ? 'GO' : 'ORANGE - projet alourdi';
  let resDistancePoste = !d.longueurTranchee ? '' : longueurTranchee <= 10 ? 'GO' : longueurTranchee <= 20 ? 'ORANGE - cout / délai' : 'NO-GO';
  let resTraverseeVoirie = !d.traverseeVoirie ? '' : d.traverseeVoirie === 'Oui' ? 'ORANGE - surcout' : 'GO';
  let resRenforcement = !d.renforcementPoste ? '' : d.renforcementPoste === 'Oui' ? 'NO-GO provisoire' : d.renforcementPoste === 'Probable' ? 'ORANGE - à sécuriser' : 'GO';
  let resPosteHTA = !d.puissanceRaccordee ? '' : posteLivraisonHTA === 'Oui' ? 'ORANGE - CAPEX HTA' : 'GO';

  const indicators = [
    { label: 'Puissance de référence / domaine', result: resPuissanceDomaine, lecture: 'Seuil 120 kVA : BT simple vs BT lourd ; >250 kVA = HTA' },
    { label: 'Domaine de tension retenu', result: resDomaineTension, lecture: "HTA alourdit le projet" },
    { label: 'Distance poste source / tranchée (m)', result: resDistancePoste, lecture: 'Longueur élevée = CAPEX et délais accrus' },
    { label: 'Traversée de voirie publique', result: resTraverseeVoirie, lecture: 'Traversée = surcout et délai autorisations' },
    { label: 'Renforcement poste / réseau attendu', result: resRenforcement, lecture: 'Principal risque CAPEX / délai' },
    { label: 'Poste HTA nécessaire', result: resPosteHTA, lecture: 'Poste HTA pénalise le budget' },
  ];

  const scoreGO = indicators.filter(r => r.result && r.result.toUpperCase().startsWith('GO')).length;
  const scoreORANGE = indicators.filter(r => r.result && r.result.toUpperCase().startsWith('ORANGE')).length;
  const scoreNOGO = indicators.filter(r => r.result && r.result.toUpperCase().startsWith('NO-GO')).length;

  let verdict = '';
  if (scoreNOGO > 0) verdict = 'NO-GO - verrou raccordement';
  else if (scoreORANGE >= 3) verdict = 'GO sous conditions - sécuriser raccordement avant GO';
  else if (scoreGO >= 6) verdict = 'GO';
  else if (scoreGO > 0 || scoreORANGE > 0) verdict = 'GO sous conditions - pré-étude Enedis requise';

  return { capaciteEnergie, nombrePDL, puissanceRef: Math.round(puissanceRef), domaineTension, posteLivraisonHTA, indicators, scoreGO, scoreORANGE, scoreNOGO, verdict };
}

// ============================================================
//  CALCULS SYNTHÈSE
// ============================================================
function calcSynthese(urbResult, raccResult) {
  const totalUrb = urbResult.indicators.length;
  const totalRacc = raccResult.indicators.length;

  const scoreUrbanisme = totalUrb > 0 ? Math.round(((urbResult.scoreGO + urbResult.scoreORANGE * 0.5) / totalUrb) * 100) : 0;
  const scoreRaccordement = totalRacc > 0 ? Math.round(((raccResult.scoreGO + raccResult.scoreORANGE * 0.5) / totalRacc) * 100) : 0;
  const scoreGlobal = Math.round(scoreUrbanisme * 0.55 + scoreRaccordement * 0.45);

  let niveauRisque = scoreGlobal >= 95 ? 'Risque faible' : scoreGlobal >= 90 ? 'Risque modéré' : scoreGlobal >= 80 ? 'Risque élevé' : 'Risque très élevé';
  let verdictFinal = scoreGlobal >= 95 ? 'GO IMMÉDIAT' : scoreGlobal >= 90 ? 'GO SOUS CONDITIONS' : scoreGlobal >= 80 ? 'ANALYSE COMPLÉMENTAIRE' : 'NO-GO';
  let signalProjet = scoreGlobal >= 95 ? '🟢 Favorable' : scoreGlobal >= 90 ? '🟡 À sécuriser' : scoreGlobal >= 80 ? '🟠 Risqué' : '🔴 À abandonner';

  const qualifUrb = scoreUrbanisme >= 80 ? 'Bon' : scoreUrbanisme >= 60 ? 'Moyen' : 'Faible';
  const qualifRacc = scoreRaccordement >= 80 ? 'Bon' : scoreRaccordement >= 60 ? 'Moyen' : 'Faible';

  let conclusion = scoreGlobal >= 95
    ? "Le projet présente une faisabilité urbanistique et un raccordement globalement favorable. Engagement foncier possible."
    : scoreGlobal >= 90
    ? "Le projet présente une faisabilité urbanistique acceptable sous conditions mais nécessite une validation complémentaire du raccordement avant engagement foncier."
    : scoreGlobal >= 80
    ? "Le projet présente des sensibilités urbanistiques et/ou de raccordement nécessitant des vérifications complémentaires avant engagement."
    : "Le projet présente des blocages significatifs. Analyse complémentaire indispensable avant tout engagement commercial.";

  return { scoreUrbanisme, scoreRaccordement, scoreGlobal, niveauRisque, verdictFinal, signalProjet, qualifUrb, qualifRacc, conclusion };
}

// ============================================================
//  COMPOSANT PRINCIPAL
// ============================================================
export default function BessStandaloneSection({ project, updateProject }) {

  const [isPrinting, setIsPrinting] = useState(false);

  const [urbData, setUrbData] = useState(() => ({
    surfaceFonciere: project?.bess_surfaceFonciere ?? '40',
    zonePLU: project?.bess_zonePLU ?? 'A',
    terrainArtificialise: project?.bess_terrainArtificialise ?? 'Non',
    surfaceBatie: project?.bess_surfaceBatie ?? '20',
    hauteurBati: project?.bess_hauteurBati ?? '3',
    distanceHabitation: project?.bess_distanceHabitation ?? '100',
    distanceERP: project?.bess_distanceERP ?? '100',
    pointEauIncendie: project?.bess_pointEauIncendie ?? 'Non',
    accesVoiePompiers: project?.bess_accesVoiePompiers ?? 'Oui',
    zoneProtegee: project?.bess_zoneProtegee ?? 'Non',
  }));

  const [raccData, setRaccData] = useState(() => ({
    puissanceRaccordee: project?.bess_puissanceRaccordee ?? '250',
    cosPhi: project?.bess_cosPhi ?? '1',
    distancePoste: project?.bess_distancePoste ?? '10',
    longueurTranchee: project?.bess_longueurTranchee ?? '10',
    zoneGeoEnedis: project?.bess_zoneGeoEnedis ?? 'ZFA',
    traverseeVoirie: project?.bess_traverseeVoirie ?? 'Non',
    renforcementPoste: project?.bess_renforcementPoste ?? 'Non',
    creationPoste: project?.bess_creationPoste ?? 'Non',
  }));

  const handleUrb = (name, value) => {
    setUrbData(prev => ({ ...prev, [name]: value }));
    updateProject({ [`bess_${name}`]: value });
  };
  const handleRacc = (name, value) => {
    setRaccData(prev => ({ ...prev, [name]: value }));
    updateProject({ [`bess_${name}`]: value });
  };

  const urbResult = useMemo(() => calcUrbanisme(urbData), [urbData]);
  const raccResult = useMemo(() => calcRaccordement(raccData), [raccData]);
  const syn = useMemo(() => calcSynthese(urbResult, raccResult), [urbResult, raccResult]);

  const globalMeta = getStatusMeta(syn.verdictFinal);

  // Fonction Export PDF
  const handleGeneratePDF = async () => {
    setIsPrinting(true);
    // Attendre la mise à jour du state dans le DOM avant de générer
    setTimeout(async () => {
      const element = document.getElementById('bess-section-pdf');
      if (element) {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' pour paysage
        const margin = 5; // marges étroites (5mm)
        const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth, pdfHeight);
        pdf.save('Prequalification_BESS.pdf');
      }
      setIsPrinting(false);
    }, 150);
  };

  // Section header
  const SH = ({ children }) => (
    <div className="text-base font-bold text-gray-600 border-b border-gray-200 pb-1 mb-2 uppercase tracking-wide flex items-center gap-1.5">
      {children}
    </div>
  );
  // Field label
  const FL = ({ children }) => <label className="text-sm font-medium text-gray-500 block mb-0.5 leading-tight">{children}</label>;

  return (
    <div id="bess-section-pdf" className="w-full rounded-2xl bg-white shadow-sm border border-gray-100 mb-6 overflow-hidden">

      {/* ——— EN-TÊTE PDF (Nom du Projet, Adresse postale et logo NELSON en haut à droite) - Visible uniquement lors de l'export PDF ——— */}
      {isPrinting && (
        <div className="flex justify-between items-center px-6 lg:px-8 py-8 border-b border-gray-100 bg-white">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Fiche Projet BESS</span>
            <h1 className="text-3xl font-extrabold text-gray-900 truncate">
              {`${project?.name || ''} ${project?.zip || ''} ${project?.city || ''}`.trim() || 'Projet sans nom'}
            </h1>
            <p className="text-base text-gray-500 mt-1 truncate">{project?.address || 'Adresse non renseignée'}</p>
          </div>
          <div className="flex-shrink-0 ml-6">
            <img src="/logo-nelson.png" alt="Logo Nelson" className="h-16 w-auto object-contain" />
          </div>
        </div>
      )}

      {/* ——— EN-TÊTE (titre uniquement, sans sous-titre ni verdicts rapides) ——— */}
      <div className="flex items-center px-4 lg:px-6 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          🔋 Préqualification Batterie Stand-Alone (BESS)
        </h2>
      </div>

      <div className="p-3 lg:p-5 space-y-4">

        {/* ════ URBANISME ════ */}
        <div>
          <SH>🏙️ Urbanisme / SDIS</SH>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-5">

            {/* ---- GAUCHE ---- */}
            <div className="space-y-2">

              {/* Ligne 1 : Zone PLU + Terrain artif + Zone protégée (3 cols) */}
              <div className="grid grid-cols-3 gap-2">
                <div><FL>Zone PLU du terrain</FL>
                  <SelectInput value={urbData.zonePLU} onChange={v => handleUrb('zonePLU', v)} options={['U', 'UX', 'UY', 'UE', 'AU', 'A', 'N', 'F']} />
                </div>
                <div><FL>Terrain artificialisé</FL>
                  <SelectInput value={urbData.terrainArtificialise} onChange={v => handleUrb('terrainArtificialise', v)} options={['Non', 'Oui']} />
                </div>
                <div><FL>Zone protégée / ABF</FL>
                  <SelectInput value={urbData.zoneProtegee} onChange={v => handleUrb('zoneProtegee', v)} options={['Non', 'Inconnu', 'Oui']} />
                </div>
              </div>

              {/* Ligne 2 : Surface bâtie + Surface foncière + Hauteur (3 cols) */}
              <div className="grid grid-cols-3 gap-2">
                <div><FL>Surface bâtie (m²)</FL>
                  <NumInput value={urbData.surfaceBatie} onChange={v => handleUrb('surfaceBatie', v)} placeholder="20" />
                  <span className="text-[10px] text-gray-400">Cumul conteneurs</span>
                </div>
                <div><FL>Surface foncière (m²)</FL>
                  <NumInput value={urbData.surfaceFonciere} onChange={v => handleUrb('surfaceFonciere', v)} placeholder="40" />
                </div>
                <div><FL>Hauteur max bâti (m)</FL>
                  <NumInput value={urbData.hauteurBati} onChange={v => handleUrb('hauteurBati', v)} placeholder="3" />
                </div>
              </div>

              {/* Ligne 3 : Distance hab + Distance ERP + PEI + Accès pompiers (4 cols) */}
              <div className="grid grid-cols-4 gap-2">
                <div><FL>Distance habitation (m)</FL>
                  <NumInput value={urbData.distanceHabitation} onChange={v => handleUrb('distanceHabitation', v)} placeholder="100" />
                </div>
                <div><FL>Distance ERP (m)</FL>
                  <NumInput value={urbData.distanceERP} onChange={v => handleUrb('distanceERP', v)} placeholder="100" />
                </div>
                <div><FL>PEI à 100m</FL>
                  <SelectInput value={urbData.pointEauIncendie} onChange={v => handleUrb('pointEauIncendie', v)} options={['Non', 'Oui']} />
                </div>
                <div><FL>Accès pompiers</FL>
                  <SelectInput value={urbData.accesVoiePompiers} onChange={v => handleUrb('accesVoiePompiers', v)} options={['Oui', 'A aménager', 'Non']} />
                </div>
              </div>

              {/* Régime urbanisme estimé */}
              <div><FL>Régime urbanisme estimé (auto)</FL>
                <div className={`text-sm px-2 py-1 rounded border font-medium ${
                  urbResult.regimeUrbanisme.startsWith('Aucune') ? 'bg-green-50 text-green-800 border-green-200' :
                  urbResult.regimeUrbanisme.startsWith('Déclaration') ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                  urbResult.regimeUrbanisme.startsWith('Permis') ? 'bg-orange-50 text-orange-800 border-orange-200' :
                  'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {urbResult.regimeUrbanisme || '—'}
                </div>
              </div>
            </div>

            {/* ---- DROITE ---- */}
            <ResultsPanel
              indicators={urbResult.indicators}
              scoreGO={urbResult.scoreGO}
              scoreORANGE={urbResult.scoreORANGE}
              scoreNOGO={urbResult.scoreNOGO}
              verdict={urbResult.verdict}
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ════ RACCORDEMENT ════ */}
        <div>
          <SH>⚡ Raccordement ENEDIS / RTE</SH>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-5">

            {/* ---- GAUCHE ---- */}
            <div className="space-y-2">

              {/* Ligne 1 : Puissance raccordée + Cos phi + Capacité énergie + Nombre PDL (4 cols) */}
              <div className="grid grid-cols-4 gap-2">
                <div><FL>Puissance raccordée (kW)</FL>
                  <SelectInput value={raccData.puissanceRaccordee} onChange={v => handleRacc('puissanceRaccordee', v)} options={['250', '500']} />
                </div>
                <div><FL>Cos phi retenu</FL>
                  <SelectInput value={raccData.cosPhi} onChange={v => handleRacc('cosPhi', v)} options={['1', '0.90', '0.95', '0.93', '0.9']} />
                </div>
                <div><FL>Capacité énergie (MWh)</FL>
                  <div className="text-sm px-1.5 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200 font-bold h-[30px] flex items-center">
                    {raccResult.capaciteEnergie} MWh
                  </div>
                  <span className="text-xs text-gray-400">= Puissance raccordée × 2</span>
                </div>
                <div><FL>Nombre PDL</FL>
                  <div className="text-sm px-1.5 py-1 rounded border bg-purple-50 text-purple-700 border-purple-200 font-bold h-[30px] flex items-center">
                    {raccResult.nombrePDL}
                  </div>
                  <span className="text-xs text-gray-400">PDL auto selon puissance</span>
                </div>
              </div>

              {/* Ligne 2 : Distance poste + Longueur tranchée + Zone géo + Traversée voirie (4 cols) */}
              <div className="grid grid-cols-4 gap-2">
                <div><FL>Distance poste (m)</FL>
                  <NumInput value={raccData.distancePoste} onChange={v => handleRacc('distancePoste', v)} placeholder="10" />
                </div>
                <div><FL>Longueur tranchée (m)</FL>
                  <NumInput value={raccData.longueurTranchee} onChange={v => handleRacc('longueurTranchee', v)} placeholder="10" />
                </div>
                <div><FL>Zone géo Enedis</FL>
                  <SelectInput value={raccData.zoneGeoEnedis} onChange={v => handleRacc('zoneGeoEnedis', v)} options={['ZFA', 'ZFB']} />
                </div>
                <div><FL>Traversée voirie</FL>
                  <SelectInput value={raccData.traverseeVoirie} onChange={v => handleRacc('traverseeVoirie', v)} options={['Non', 'Oui']} />
                </div>
              </div>

              {/* Ligne 3 : Renforcement + Création poste */}
              <div className="grid grid-cols-2 gap-2">
                <div><FL>Renforcement poste / réseau attendu</FL>
                  <SelectInput value={raccData.renforcementPoste} onChange={v => handleRacc('renforcementPoste', v)} options={['Non', 'Probable', 'Oui']} />
                </div>
                <div><FL>Création / adaptation poste HTA/BT</FL>
                  <SelectInput value={raccData.creationPoste} onChange={v => handleRacc('creationPoste', v)} options={['Non', 'Oui']} />
                </div>
              </div>

              {/* Calculs auto */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Puissance réf.', value: `${raccResult.puissanceRef} kVA`,
                    c: raccResult.puissanceRef <= 120 ? 'bg-green-50 text-green-700 border-green-200' : raccResult.puissanceRef <= 250 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200' },
                  { label: 'Domaine tension', value: raccResult.domaineTension,
                    c: raccResult.domaineTension === 'BT triphasé' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200' },
                  { label: 'Poste HTA', value: raccResult.posteLivraisonHTA,
                    c: raccResult.posteLivraisonHTA === 'Non' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200' },
                ].map(item => (
                  <div key={item.label} className={`rounded border px-1.5 py-1 text-center ${item.c}`}>
                    <div className="text-xs font-medium opacity-70 mb-0.5">{item.label}</div>
                    <div className="text-sm font-bold leading-tight">{item.value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- DROITE ---- */}
            <ResultsPanel
              indicators={raccResult.indicators}
              scoreGO={raccResult.scoreGO}
              scoreORANGE={raccResult.scoreORANGE}
              scoreNOGO={raccResult.scoreNOGO}
              verdict={raccResult.verdict}
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ════ SYNTHÈSE DÉCISIONNELLE ════ */}
        <div>
          <SH>🎯 Synthèse décisionnelle</SH>
          {/*
            4 colonnes :
            - Col 1 : icônes scores (fixe 280px)
            - Col 2 : filtres + matrice (fixe 280px)
            - Col 3 : conclusion (flexible, réduite)
            - Col 4 : jauge + décision (fixe 280px)
          */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_600px_minmax(0,1fr)_minmax(0,1fr)_380px] gap-3 lg:gap-4 items-stretch">

            {/* ── Col 1 : Icônes scores (tuiles de largeur identique = 200px par la grille) ── */}
            <div className="flex flex-row lg:flex-col gap-2 flex-wrap lg:flex-nowrap h-full">
              {[
                { icon: '🏙️', label: 'Urbanisme', val: `${syn.scoreUrbanisme}%`, c: syn.scoreUrbanisme >= 90 ? 'text-green-600' : syn.scoreUrbanisme >= 75 ? 'text-orange-500' : 'text-red-500' },
                { icon: '⚡', label: 'Raccordement', val: `${syn.scoreRaccordement}%`, c: syn.scoreRaccordement >= 90 ? 'text-green-600' : syn.scoreRaccordement >= 75 ? 'text-orange-500' : 'text-red-500' },
                { icon: '📊', label: 'Score global (55/45)', val: `${syn.scoreGlobal}%`, c: syn.scoreGlobal >= 90 ? 'text-green-600' : syn.scoreGlobal >= 75 ? 'text-orange-500' : 'text-red-500', bold: true },
                { icon: '🎯', label: 'Niveau de risque', val: syn.niveauRisque, c: 'text-gray-700' },
                { icon: '📡', label: 'Signal projet', val: syn.signalProjet, c: 'text-gray-700' },
              ].map(item => (
                <div key={item.label} className={`flex flex-1 items-center gap-2 px-2 py-1.5 rounded-lg border w-full ${item.bold ? 'border-slate-200 bg-slate-50' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400 leading-tight truncate">{item.label}</div>
                    <div className={`text-base font-extrabold leading-tight ${item.c}`}>{item.val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Col 2 : Décision par filtre + Matrice (420px) ── */}
            <div className="flex flex-col gap-2 h-full">
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-slate-700 text-white text-sm font-bold px-2 py-1">Décision par filtre</div>
                <div className="p-2 space-y-1">
                  {[
                    { label: 'Verdict urbanisme', val: urbResult.verdict },
                    { label: 'Verdict raccordement', val: raccResult.verdict },
                    { label: 'Qualification urbanisme', val: syn.qualifUrb },
                    { label: 'Qualification raccordement', val: syn.qualifRacc },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-sm text-gray-500 flex-shrink-0">{item.label}</span>
                      <VerdictBadge result={item.val} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-slate-700 text-white text-sm font-bold px-2 py-1">Matrice décisionnelle</div>
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-gray-600 font-semibold">
                    <th className="px-2 py-1 text-left">Urba</th>
                    <th className="px-2 py-1 text-left">Racc</th>
                    <th className="px-2 py-1 text-left">Décision</th>
                  </tr></thead>
                  <tbody>
                    {[
                      { u: 'Bon', r: 'Bon', d: 'GO', c: 'text-green-700 font-bold' },
                      { u: 'Bon', r: 'Moyen', d: 'GO sous conditions', c: 'text-yellow-700 font-bold' },
                      { u: 'Moyen', r: 'Bon', d: 'GO sous conditions', c: 'text-yellow-700 font-bold' },
                      { u: 'Faible', r: 'Faible', d: 'NO-GO', c: 'text-red-700 font-bold' },
                    ].map((row, i) => {
                      const isActive = syn.qualifUrb === row.u && syn.qualifRacc === row.r;
                      return (
                        <tr key={i} className={`border-t border-gray-100 ${isActive ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-2 py-1">{row.u}</td>
                          <td className="px-2 py-1">{row.r}</td>
                          <td className={`px-2 py-1 ${row.c}`}>{row.d}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Col 3 : Conclusion (réduite d'1/3) ── */}
            <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 h-full">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Conclusion</div>
              <p className="text-sm text-gray-700 leading-relaxed">{syn.conclusion}</p>
            </div>

            {/* ── Col 4 : Offres Soulte / Loyer ── */}
            {(() => {
              const capMWh = raccResult.capaciteEnergie || 0;
              const unites250 = capMWh / 500; // 1 unité = 500 MWh (250kWc)
              const soulte = Math.round(unites250 * 10000);
              const loyer = Math.round(unites250 * 900);
              return (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 h-full flex flex-col gap-2">
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">💰 Offres financières</div>
                  <div className="text-[10px] text-indigo-400 mb-1">Base : 10 000€ / 250 kWc · Loyer : 900€ / 250 kWc</div>
                  <div className="flex flex-col gap-2 flex-1 justify-center">
                    <div className="rounded-lg border border-indigo-300 bg-white p-2">
                      <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-0.5">Option Soulte</div>
                      <div className="text-xl font-extrabold text-indigo-700">{soulte.toLocaleString('fr-FR')} €</div>
                      <div className="text-[10px] text-gray-400">Versement unique</div>
                    </div>
                    <div className="rounded-lg border border-violet-300 bg-white p-2">
                      <div className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-0.5">Option Loyer — 20 ans</div>
                      <div className="text-xl font-extrabold text-violet-700">{loyer.toLocaleString('fr-FR')} €<span className="text-sm font-semibold text-violet-400">/an</span></div>
                      <div className="text-[10px] text-gray-400">Durée : 20 ans</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Col 5 : Jauge + Décision finale ── */}
            <div className="flex flex-col items-center justify-between gap-3 h-full py-1">
              <div className="w-full aspect-square max-w-[220px] flex-grow flex items-center justify-center">
                <DonutGauge score={syn.scoreGlobal} />
              </div>
              <div className={`w-full rounded-xl border-2 py-2 px-3 flex flex-col items-center justify-center gap-1 shadow-sm ${globalMeta.bg} ${globalMeta.border}`}>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest text-center">Décision finale BESS</div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className={`text-base font-extrabold tracking-wide text-center leading-tight ${globalMeta.text}`}>
                    {syn.verdictFinal || '—'}
                  </span>
                  <span className="text-xl leading-none flex-shrink-0">
                    {syn.verdictFinal === 'GO IMMÉDIAT' ? '✅' :
                     syn.verdictFinal === 'GO SOUS CONDITIONS' ? '🟡' :
                     syn.verdictFinal === 'ANALYSE COMPLÉMENTAIRE' ? '🟠' : '🔴'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
