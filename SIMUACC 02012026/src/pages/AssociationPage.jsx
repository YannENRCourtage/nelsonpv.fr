import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Sun, TrendingUp, BarChart2, DollarSign, Activity, Download, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper to get/set from localStorage
const usePersistentState = (key, defaultValue) => {
  const [state, setState] = useState(() => {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
};


const FinancialDataTable = ({ data, showPrimeRow }) => {
  const renderRow = (label, values, isBold = false, isSub = false, isHeader = false) => (
    <>
      {isHeader && <tr className="h-4"></tr>}
      <tr className={`${isBold ? 'font-bold bg-gray-50' : ''} ${isSub ? 'text-sm' : ''} ${isHeader ? 'bg-blue-50 text-blue-800 font-semibold' : ''} h-8`}>
        <td className={`sticky left-0 bg-white p-1 min-w-[180px] text-left ${isSub ? 'pl-6' : ''}`}>{label}</td>
        {(values || []).map((val, i) => (
          <td key={i} className="p-1 text-center min-w-[72px]">{typeof val === 'number' ? val.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : val}</td>
        ))}
      </tr>
    </>
  );

  if (!data) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse financial-pdf-table" id="financial-table">
        <thead>
           <tr id="pdf-header-row" className="hidden">
            <th className="sticky left-0 bg-white p-1 text-left pdf-header-text">#</th>
            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => <th key={num} className="p-1 font-semibold pdf-header-text">{num}</th>)}
          </tr>
          <tr>
            <th className="sticky left-0 bg-white p-1 text-left pdf-header-text">Année</th>
            {(data.years || []).map(year => <th key={year} className="p-1 font-semibold pdf-header-text">{year}</th>)}
          </tr>
        </thead>
        <tbody>
          {renderRow('Chiffre d\'affaires', undefined, true, false, true)}
          {renderRow('Vente ACC', data.venteAcc, false, true)}
          {renderRow('Vente Surplus (Tb)', data.venteSurplus, false, true)}
          {showPrimeRow && renderRow('Prime à l\'autoconsommation', data.primeAutoconsommation, false, true)}
          {renderRow('Total CA', data.totalCa, true, true)}

          {renderRow('Charges d\'exploitation', undefined, true, false, true)}
          {renderRow('Maintenance', data.maintenance, false, true)}
          {renderRow('Rente Bailleur', data.rente, false, true)}
          {renderRow('Assurance', data.assurance, false, true)}
          {renderRow('IFER', data.ifer, false, true)}
          {renderRow('Divers', data.divers, false, true)}
          {renderRow('Total Charges', data.totalCharges, true, true)}
          
          {renderRow('Excédent Brut d\'Exploitation (EBE)', data.ebe, true, false, true)}
          
          {renderRow('Amortissement & Provisions', undefined, true, false, true)}
          {renderRow('Amortissement', data.amort, false, true)}
          
          {renderRow('Résultat d\'exploitation (EBIT)', data.ebit, true, false, true)}

          {renderRow('Financement', undefined, true, false, true)}
          {renderRow('Intérêts', data.interets, false, true)}
          
          {renderRow('Résultat avant impôt (EBT)', data.ebt, true, false, true)}
          
          {renderRow('Impôt sur les sociétés', data.is, true, false, true)}
          
          {renderRow('Résultat Net', data.resultatNet, true, false, true)}

          {renderRow('Couverture de la dette', undefined, true, false, true)}
          {renderRow('DSCR', data.dscr_annuel, true, true)}
        </tbody>
        <tfoot>
           <tr className="hidden" id="pdf-footer-row">
             <td colSpan="21" className="text-left p-2 text-base">
                Hypothèses : Inflation maintenance: 1%/an. Inflation CA Tb: 1%/an. Inflation CA ACC: 2%/an. Inflation Assurance: 2%/an. Inflation Divers: 2%/an. Inflation IFER: 1%/an.
             </td>
           </tr>
        </tfoot>
      </table>
    </div>
  );
};

const CostsDefaultsPopup = ({ trigger, defaults, onSave }) => {
    const [currentDefaults, setCurrentDefaults] = useState(defaults);

    useEffect(() => {
        setCurrentDefaults(defaults);
    }, [defaults]);

    const handleSave = () => {
        onSave(currentDefaults);
    };
    
    const handleChange = (key, value, isPerWc = false) => {
        const parsedValue = parseFloat(value);
        if (!isNaN(parsedValue)) {
            setCurrentDefaults(prev => ({ ...prev, [key]: { value: parsedValue, isPerWc } }));
        }
    };
    
    const renderInput = (key, label) => (
         <div key={key}>
            <Label htmlFor={`default-${key}`} className="capitalize text-xs font-medium">{label}</Label>
            <Input
                id={`default-${key}`}
                type="number"
                value={currentDefaults[key].value}
                onChange={(e) => handleChange(key, e.target.value, currentDefaults[key].isPerWc)}
                className="h-8 text-xs p-1 text-black"
                step={currentDefaults[key].isPerWc ? 0.01 : 1}
            />
        </div>
    );

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Paramètres des Coûts par Défaut</DialogTitle>
                    <DialogDescription>
                        Ajustez les valeurs par défaut utilisées dans le simulateur. Ces valeurs seront sauvegardées pour vos prochaines visites.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    {renderInput("installation", "Installation (€/Wc)")}
                    {renderInput("maintenance", "Maintenance (€/kWc/an)")}
                    {renderInput("charpente", "Charpente (€)")}
                    {renderInput("couverture", "Couverture (€)")}
                    {renderInput("fondations", "Fondations (€)")}
                    {renderInput("raccordement", "Raccordement (€)")}
                    {renderInput("developpement", "Développement (€)")}
                    {renderInput("soulte", "Soulte (€)")}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                      <Button onClick={handleSave}>Enregistrer et Fermer</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const AssociationPage = () => {
  const [installedPower, setInstalledPower] = useState(100);
  const [productivity, setProductivity] = useState(1200);
  const [basePurchasePrice, setBasePurchasePrice] = useState(0.0912);
  const [accPrice, setAccPrice] = useState(0.12);
  const [accPercentage, setAccPercentage] = useState(40);
  const [interestRate, setInterestRate] = useState(3.9);
  const [includePrime, setIncludePrime] = useState(true);

  const [costDefaults, setCostDefaults] = usePersistentState('costDefaults', {
    installation: { value: 0.50, isPerWc: true },
    charpente: { value: 20000, isPerWc: false },
    couverture: { value: 15000, isPerWc: false },
    fondations: { value: 15000, isPerWc: false },
    raccordement: { value: 15000, isPerWc: false },
    developpement: { value: 5000, isPerWc: false },
    soulte: { value: 0, isPerWc: false },
    maintenance: { value: 10, isPerWc: true },
  });

  const [costs, setCosts] = useState({
    installation: 0,
    charpente: 0,
    couverture: 0,
    fondations: 0,
    raccordement: 0,
    developpement: 0,
    fraisCommerciaux: 0,
    soulte: 0,
    bardage: 0,
    cheneauxEtDescente: 0,
  });

  const [maintenanceCost, setMaintenanceCost] = useState(costDefaults.maintenance.value);
  
  const pdfRef = useRef();

  useEffect(() => {
    setCosts(prev => ({
        ...prev,
        installation: costDefaults.installation.value * installedPower * 1000,
        charpente: costDefaults.charpente.value,
        couverture: costDefaults.couverture.value,
        fondations: costDefaults.fondations.value,
        raccordement: costDefaults.raccordement.value,
        developpement: costDefaults.developpement.value,
        soulte: costDefaults.soulte.value,
    }));
    setMaintenanceCost(costDefaults.maintenance.value);
  }, [costDefaults, installedPower]);
  
  useEffect(() => {
    let newInstallationCost = costDefaults.installation.value * installedPower * 1000;
    
    if (installedPower > 100) {
        setBasePurchasePrice(0.0950);
    } else if (installedPower < 36.01) {
      setBasePurchasePrice(0.1049);
    } else {
      setBasePurchasePrice(0.0912);
    }
    
    setCosts(prev => ({
      ...prev,
      installation: newInstallationCost,
      fraisCommerciaux: installedPower * 50
    }));

  }, [installedPower, costDefaults.installation.value]);


  const handleCostChange = (key, value) => {
    setCosts(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const totalProjectCost = useMemo(() => Object.entries(costs)
    .filter(([key]) => key !== 'soulte')
    .reduce((sum, [, cost]) => sum + cost, 0) + costs.soulte, 
  [costs]);

  const loyerAnnuel = useMemo(() => costs.soulte / 16, [costs.soulte]);
  const renteAnnuelle = useMemo(() => costs.soulte / 15, [costs.soulte]);

  const annualProduction = useMemo(() => installedPower * productivity, [installedPower, productivity]);

  const shouldShowPrime = useMemo(() => installedPower <= 100 && includePrime, [installedPower, includePrime]);

  const financialData = useMemo(() => {
    const years = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + i);
    const data = { years, venteAcc: [], venteSurplus: [], primeAutoconsommation: [], totalCa: [], maintenance: [], rente: [], assurance: [], ifer: [], divers: [], totalCharges: [], ebe: [], amort: [], ebit: [], interets: [], ebt: [], is: [], resultatNet: [], dscr_annuel: [] };

    let capitalRestant = totalProjectCost;

    let prime = 0;
    if (shouldShowPrime) {
        if (installedPower <= 9) {
          prime = installedPower * 80;
        } else if (installedPower > 9 && installedPower <= 36) {
          prime = installedPower * 160;
        } else if (installedPower > 36 && installedPower <= 100) {
          prime = installedPower * 80;
        }
    }


    for (let i = 0; i < 20; i++) {
      const accProduction = annualProduction * (accPercentage / 100);
      const tbProduction = annualProduction - accProduction;

      const currentAccPrice = accPrice * Math.pow(1.02, i);
      const currentTbPrice = basePurchasePrice * Math.pow(1.01, i);
      
      const venteAcc = accProduction * currentAccPrice;
      const venteSurplus = tbProduction * currentTbPrice;
      const primeAutoconsommation = i === 0 ? prime : 0;
      const totalCa = venteAcc + venteSurplus + primeAutoconsommation;
      
      const currentMaintenance = (maintenanceCost * installedPower) * Math.pow(1.01, i);
      const currentRente = i < 20 ? renteAnnuelle : 0;
      const currentAssurance = (installedPower * 11.5) * Math.pow(1.02, i);
      
      let currentIfer = 0;
      if (installedPower > 100) {
        const baseIfer = installedPower * 8.36;
        currentIfer = baseIfer * Math.pow(1.01, i);
      }

      const currentDivers = (installedPower * 12) * Math.pow(1.02, i);
      
      const totalCharges = currentMaintenance + currentRente + currentAssurance + currentIfer + currentDivers;
      const ebe = totalCa - totalCharges;

      const amortissementAnnuel = totalProjectCost / 20;
      const ebit = ebe - amortissementAnnuel;
      const interets = capitalRestant * (interestRate / 100);
      const ebt = ebit - interets;
      const currentIs = ebt > 0 ? ebt * 0.25 : 0;
      const resultatNet = ebt - currentIs;

      const remboursementCapital = (totalProjectCost / 20);
      const serviceDeDette = remboursementCapital + interets;
      const dscrAnnuel = serviceDeDette > 0 ? (ebe / serviceDeDette).toFixed(2) : "N/A";
      
      data.venteAcc.push(venteAcc);
      data.venteSurplus.push(venteSurplus);
      data.primeAutoconsommation.push(primeAutoconsommation);
      data.totalCa.push(totalCa);
      data.maintenance.push(currentMaintenance);
      data.rente.push(currentRente);
      data.assurance.push(currentAssurance);
      data.ifer.push(currentIfer);
      data.divers.push(currentDivers);
      data.totalCharges.push(totalCharges);
      data.ebe.push(ebe);
      data.amort.push(amortissementAnnuel);
      data.ebit.push(ebit);
      data.interets.push(interets);
      data.ebt.push(ebt);
      data.is.push(currentIs);
      data.resultatNet.push(resultatNet);
      data.dscr_annuel.push(dscrAnnuel);
      
      capitalRestant -= remboursementCapital;
    }
    return data;
  }, [annualProduction, accPercentage, accPrice, basePurchasePrice, maintenanceCost, installedPower, totalProjectCost, renteAnnuelle, interestRate, shouldShowPrime]);

  const { tri, dscr, paybackPeriod, paybackPeriodWithACC } = useMemo(() => {
    const cashFlows = [-totalProjectCost, ...financialData.ebe];
    
    let calculatedTri = NaN;
    let low = -0.99, high = 1.0;
    for(let i=0; i < 100; i++) { 
        let mid = (low + high) / 2;
        if(mid === low || mid === high) break;
        let npv = cashFlows.reduce((acc, val, j) => acc + val / Math.pow(1 + mid, j), 0);
        if (npv > 0) low = mid; else high = mid;
    }
    if (Math.abs(low-high) < 1e-5) calculatedTri = low;
    
    const dscrValues = financialData.dscr_annuel.map(v => parseFloat(v)).filter(v => !isNaN(v) && v !== Infinity);
    const calculatedDscr = dscrValues.length > 0 ? dscrValues.reduce((a, b) => a + b, 0) / dscrValues.length : NaN;

    const calculatePayback = (useAcc) => {
        let cumulativeCashFlow = -totalProjectCost;
        let period = 0;
        for(let i=0; i<20; i++) {
            const accProduction = annualProduction * (accPercentage / 100);
            const tbProduction = annualProduction - accProduction;
            const currentAccPrice = accPrice * Math.pow(1.02, i);
            const currentTbPrice = basePurchasePrice * Math.pow(1.01, i);
            
            const annualGain = useAcc ? (tbProduction * currentTbPrice) + (accProduction * currentAccPrice) : (annualProduction * currentTbPrice);
            
            cumulativeCashFlow += annualGain;
            if (cumulativeCashFlow >= 0) {
                period = i + 1 - (cumulativeCashFlow / annualGain);
                break;
            }
        }
        return period > 0 ? period.toFixed(1) + " ans" : "N/A";
    }

    return { tri: calculatedTri, dscr: calculatedDscr, paybackPeriod: calculatePayback(false), paybackPeriodWithACC: calculatePayback(true) };
  }, [totalProjectCost, financialData, annualProduction, basePurchasePrice, accPrice, accPercentage]);

  const projectionData = useMemo(() => {
    const data = [];
    let cumulativeGainTbOnly = 0;
    let cumulativeGainWithAcc = 0;
    for (let year = 1; year <= 20; year++) {
      const accProduction = annualProduction * (accPercentage / 100);
      const tbProduction = annualProduction - accProduction;
      const currentAccPrice = accPrice * Math.pow(1.02, year - 1);
      const currentTbPrice = basePurchasePrice * Math.pow(1.01, year - 1);

      cumulativeGainTbOnly += (annualProduction * currentTbPrice);
      cumulativeGainWithAcc += (tbProduction * currentTbPrice) + (accProduction * currentAccPrice);
      
      data.push({ year, "Gain Tb Seul": parseFloat(cumulativeGainTbOnly.toFixed(2)), "Gain Tb + ACC": parseFloat(cumulativeGainWithAcc.toFixed(2)) });
    }
    return data;
  }, [annualProduction, basePurchasePrice, accPrice, accPercentage]);

  const handleGeneratePdf = async () => {
    const input = pdfRef.current;
    const financialTable = document.getElementById('financial-table');
    const headerRow = document.getElementById('pdf-header-row');
    const footerRow = document.getElementById('pdf-footer-row');

    headerRow.style.display = 'table-row';
    footerRow.style.display = 'table-row';
    
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const style = document.createElement('style');
    style.innerHTML = `
      .pdf-container { font-size: 14px !important; padding: 0 !important; }
      .pdf-container [data-section="params-renta-pdf"] { width: 120% !important; }
      .pdf-container .p-3 { padding: 0.25rem !important; display: flex; flex-direction: column; justify-content: center; }
      .pdf-container .h-full { height: auto !important; }
      .pdf-container .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem !important; }
      .pdf-container .gap-x-2 { gap: 0.25rem !important; }
      .pdf-container .gap-x-4 { gap: 0.5rem !important; }
      .pdf-container h2 { font-size: 16px !important; margin-bottom: 0.25rem !important; }
      .pdf-container label, .pdf-container p, .pdf-container div { font-size: 12px !important; line-height: 1.1 !important; }
      .pdf-container .text-lg { font-size: 1rem !important; }
      .pdf-container .pdf-chart-container { height: 230px !important; }
      .pdf-container .shadow-lg { box-shadow: none !important; }
    `;
    document.head.appendChild(style);
    
    const canvas = await html2canvas(input, { scale: 2, windowWidth: 1400 });
    document.head.removeChild(style);

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 5, 5, pdfWidth - 10, pdfHeight - 10);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text('© ENR COURTAGE ÉNERGIE - 2025', pdfWidth / 2, pdfHeight - 2, { align: 'center' });


    if (financialTable) {
        const tableStyle = document.createElement('style');
        tableStyle.innerHTML = `
          .financial-pdf-table { font-size: 15px !important; table-layout: fixed; width: 100%; }
          .financial-pdf-table td, .financial-pdf-table th { line-height: 1.4 !important; }
          .financial-pdf-table th:first-child, .financial-pdf-table td:first-child { width: 180px !important; }
          .financial-pdf-table th:not(:first-child), .financial-pdf-table td:not(:first-child) { width: 65px !important; }
          .pdf-header-text { font-size: 16px !important; font-weight: bold; }
        `;
        document.head.appendChild(tableStyle);
        const tableCanvas = await html2canvas(financialTable, { scale: 2 });
        document.head.removeChild(tableStyle);
        const tableImgData = tableCanvas.toDataURL('image/png');

        const tableRatio = tableCanvas.width / tableCanvas.height;
        let newTableImgWidth = pdfWidth - 20;
        let newTableImgHeight = newTableImgWidth / tableRatio;

        pdf.addPage();
        pdf.addImage(tableImgData, 'PNG', 10, 10, newTableImgWidth, newTableImgHeight);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text('© ENR COURTAGE ÉNERGIE - 2025', pdfWidth / 2, pdfHeight - 5, { align: 'center' });
    }
    
    headerRow.style.display = 'none';
    footerRow.style.display = 'none';

    pdf.save(`analyse-rentabilite-${new Date().toLocaleDateString('fr-CA')}.pdf`);
  };

  const renderCostInput = (key, label) => (
    <div key={key}>
      <Label htmlFor={key} className="capitalize text-xs font-medium">{label}</Label>
      <Input id={key} type="number" value={costs[key]} onChange={(e) => handleCostChange(key, e.target.value)} className="h-8 text-xs p-1 text-black"/>
      {key === 'soulte' && <div className="mt-1 text-xs text-gray-500">ou loyer: {loyerAnnuel.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR'})}/an</div>}
    </div>
  );

  return (
    <>
      <Helmet><title>Simulateur Espace Producteur - ENR Courtage Energie</title></Helmet>
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 bg-clip-text text-transparent mb-4">Simulateur de Gain Producteur</h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">Projetez les gains et la rentabilité de votre projet solaire.</p>
            </div>
            <Button onClick={handleGeneratePdf} className="bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" />
              Générer PDF
            </Button>
          </div>
        </motion.div>
        
        <Dialog>
          <div ref={pdfRef} className="p-2 bg-white pdf-container w-[90%] mx-auto">
              <div className="grid lg:grid-cols-12 gap-x-2 items-start">
                <div className="lg:col-span-3" data-section="params-renta-pdf">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-lg p-3 space-y-2">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 pdf-title-text"><Sun className="w-5 h-5 text-sky-600"/>Paramètres</h2>
                     <div className="grid grid-cols-2 gap-x-2">
                        <div><Label htmlFor="installedPower" className="text-xs">Puissance (kWc)</Label><Input id="installedPower" type="number" value={installedPower} onChange={(e) => setInstalledPower(parseFloat(e.target.value) || 0)} className="h-8 text-xs p-1" /></div>
                        <div><Label htmlFor="productivity" className="text-xs">Productible (kWh/kWc)</Label><Input id="productivity" type="number" value={productivity} onChange={(e) => setProductivity(parseFloat(e.target.value) || 0)} step="100" className="h-8 text-xs p-1"/></div>
                     </div>
                    <div className="flex justify-between items-center"><p className="text-xs font-semibold">Production annuelle</p><p className="text-sm font-bold text-sky-700">{annualProduction.toLocaleString('fr-FR')} kWh</p></div>
                    <hr/>
                     <div className="grid grid-cols-2 gap-x-2">
                      <div>
                        <Label htmlFor="basePurchasePrice" className="text-xs">Tarif TB (€/kWh)*</Label>
                        <Input id="basePurchasePrice" type="number" value={basePurchasePrice} onChange={(e) => setBasePurchasePrice(parseFloat(e.target.value) || 0)} step="0.001" className="h-8 text-xs p-1"/>
                      </div>
                       <div>
                        <Label htmlFor="accPrice" className="text-xs">Tarif ACC (€/kWh)</Label>
                        <Input id="accPrice" type="number" value={accPrice} onChange={(e) => setAccPrice(parseFloat(e.target.value) || 0)} step="0.01" className="h-8 text-xs p-1"/>
                      </div>
                     </div>
                    <div><Label className="text-xs">Part d'ACC: {accPercentage}%</Label><Slider value={[accPercentage]} onValueChange={(v) => setAccPercentage(v[0])} step={5} /></div>
                  </motion.div>
                  <DialogTrigger asChild>
                    <button className="text-xs text-blue-600 hover:underline mt-2 cursor-pointer">*détails tarifs Tb</button>
                  </DialogTrigger>
                </div>
                
                <div className="lg:col-span-9">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 pdf-title-text"><DollarSign className="w-5 h-5 text-emerald-600"/>Coûts du Projet</h2>
                          <CostsDefaultsPopup
                              defaults={costDefaults}
                              onSave={setCostDefaults}
                              trigger={
                                <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:underline p-0 h-auto">
                                  <Settings className="w-4 h-4 mr-1"/>
                                  *détails coûts du projet
                                </Button>
                              }
                           />
                      </div>
                       <div className="grid grid-cols-5 gap-x-2 gap-y-1">
                            {renderCostInput("installation", "Installation")}
                            {renderCostInput("charpente", "Charpente")}
                            {renderCostInput("couverture", "Couverture")}
                            {renderCostInput("fondations", "Fondations")}
                            <div className="row-start-1 col-start-5 space-y-1 pl-2 border-l border-gray-300">
                              <p className="text-xs font-bold text-gray-600">Options</p>
                                {renderCostInput("bardage", "Bardage")}
                            </div>
                            
                            {renderCostInput("raccordement", "Raccordement")}
                            {renderCostInput("developpement", "Développement")}
                            {renderCostInput("fraisCommerciaux", "Frais commerciaux")}
                            {renderCostInput("soulte", "Soulte")}
                             <div className="row-start-2 col-start-5 space-y-1 pl-2 border-l border-gray-300">
                                {renderCostInput("cheneauxEtDescente", "Chéneaux et descente")}
                            </div>

                           <div className="col-start-1">
                            <Label htmlFor="maintenanceCost" className="text-xs font-medium">Maintenance (€/kWc/an)</Label>
                            <Input id="maintenanceCost" type="number" value={maintenanceCost} onChange={e => setMaintenanceCost(parseFloat(e.target.value) || 0)} className="h-8 text-xs p-1 text-black"/>
                          </div>
                          {installedPower <= 100 && (
                            <div className="flex flex-col justify-center items-start pt-2 col-start-2">
                              <Label htmlFor="include-prime" className="text-xs font-medium mb-1">
                                Intégrer la prime ?
                              </Label>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="include-prime"
                                  checked={includePrime}
                                  onCheckedChange={setIncludePrime}
                                />
                                <Label htmlFor="include-prime" className="text-xs">{includePrime ? 'Oui' : 'Non'}</Label>
                              </div>
                            </div>
                          )}
                      </div>
                      <div className="mt-2 pt-2 border-t flex justify-between items-center"><p className="text-base font-bold">Coût Total du Projet</p><p className="text-lg font-extrabold text-emerald-700">{totalProjectCost.toLocaleString('fr-FR')} €</p></div>
                  </motion.div>
                </div>

                 <div className="lg:col-span-12 grid lg:grid-cols-12 gap-x-2 items-end mt-2">
                  <div className="lg:col-span-3" data-section="params-renta-pdf">
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-3 h-full">
                           <div className="flex justify-between items-center mb-2">
                             <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 pdf-title-text"><Activity className="w-5 h-5 text-orange-600"/>Rentabilité</h2>
                             <div><Label htmlFor="interestRate" className="text-xs">Taux d'intérêt (%)</Label><Input id="interestRate" type="number" value={interestRate} onChange={e => setInterestRate(parseFloat(e.target.value) || 0)} step="0.1" className="h-8 text-xs p-1" /></div>
                          </div>
                          <div className="space-y-2 mt-2">
                             <div className={`border p-2 rounded-lg text-center ${!isNaN(tri) && tri > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}><p className="text-xs font-semibold">TRI Projet</p><p className={`text-lg font-bold ${!isNaN(tri) && tri > 0 ? 'text-green-600' : 'text-red-600'}`}>{!isNaN(tri) ? (tri*100).toFixed(2) + "%" : "N/A"}</p></div>
                             <div className={`border p-2 rounded-lg text-center ${!isNaN(dscr) && dscr > 1.1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}><p className="text-xs font-semibold">DSCR Moyen</p><p className={`text-lg font-bold ${!isNaN(dscr) && dscr > 1.1 ? 'text-green-600' : 'text-red-600'}`}>{!isNaN(dscr) ? dscr.toFixed(2) : "N/A"}</p></div>
                             <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg text-center"><p className="text-xs font-semibold text-blue-800">Retour sur investissement (sans ACC)</p><p className="text-lg font-bold text-blue-600">{paybackPeriod}</p></div>
                             <div className="bg-cyan-50 border border-cyan-200 p-2 rounded-lg text-center"><p className="text-xs font-semibold text-cyan-800">Retour sur investissement (avec ACC)</p><p className="text-lg font-bold text-cyan-600">{paybackPeriodWithACC}</p></div>
                          </div>
                      </motion.div>
                  </div>
                   <div className="lg:col-span-9 bg-white rounded-xl shadow-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 pdf-title-text"><BarChart2 className="w-5 h-5 text-indigo-600"/>Gains Cumulés (sur 20 ans)</h2>
                        <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>Gain Tb Seul</div>
                            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>Gain Tb + ACC</div>
                        </div>
                    </div>
                    <div style={{height: '280px'}} className="w-full pdf-chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={projectionData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" label={{ value: 'Années', position: 'insideBottom', offset: -5 }} /><YAxis tickFormatter={(value) => `${(value / 1000).toLocaleString('fr-FR')} k€`} /><Tooltip formatter={(value) => `${value.toLocaleString('fr-FR')} €`} />
                          <Line type="monotone" dataKey="Gain Tb Seul" stroke="#ef4444" strokeWidth={2} dot={false} name="Gain Tb Seul"/><Line type="monotone" dataKey="Gain Tb + ACC" stroke="#22c55e" strokeWidth={2} dot={false} name="Gain Tb + ACC"/>
                          <ReferenceLine y={totalProjectCost} label={{ value: "Coût Projet", position: "insideTopRight" }} stroke="orange" strokeDasharray="3 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                 </div>
              </div>
          </div>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détails des tarifs d'achat</DialogTitle>
              <DialogDescription as="div">
                <ul className="list-disc pl-5 mt-4 space-y-2">
                    <li><span className="font-semibold">9kWc à 36 kWc :</span> 10.49 c€/kWh</li>
                    <li><span className="font-semibold">36kWc à 100kWc :</span> 9.12 c€/kWh</li>
                    <li><span className="font-semibold">100kWc à 500kWc :</span> Appel d'offre simplifié</li>
                    <li><span className="font-semibold">&gt;500kWc :</span> Appel d'offre CRE</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-white rounded-xl shadow-lg p-4 w-[90%] mx-auto">
            <FinancialDataTable data={financialData} showPrimeRow={shouldShowPrime} />
            <p className="text-center text-base text-gray-500 mt-2">
                Hypothèses : Inflation maintenance: 1%/an. Inflation CA Tb: 1%/an. Inflation CA ACC: 2%/an. Inflation Assurance: 2%/an. Inflation Divers: 2%/an. Inflation IFER: 1%/an.
            </p>
        </motion.div>
      </div>
    </>
  );
};

export default AssociationPage;