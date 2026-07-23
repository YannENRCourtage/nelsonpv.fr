import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { FileDown, Calculator, ShieldCheck, Lightbulb, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function IrveSimulator() {
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);
  const page3Ref = useRef(null);
  const [projectionMonths, setProjectionMonths] = useState(36);
  const [includeFinancing, setIncludeFinancing] = useState(false);
  const [showSunlibFinancing, setShowSunlibFinancing] = useState(true);

  // Gamme de produits par défaut (modifiables par l'utilisateur)
  const [products, setProducts] = useState([
    { id: 1, power: 7.4, price: 2600, target: 'Hôtels, restaurants, TPE', position: 'Entrée de gamme' },
    { id: 2, power: 11, price: 2960, target: 'PME, bureaux, commerces', position: 'Standard triphasé' },
    { id: 3, power: 22, price: 2960, target: 'Hôtels, restaurants, flottes', position: 'Rapide AC' },
    { id: 4, power: 60, price: 21062, target: 'Parkings publics, aires, grands hôtels', position: 'Recharge rapide DC' },
    { id: 5, power: 120, price: 39365, target: 'Autoroutes, grands complexes', position: 'Ultra-rapide DC' },
  ]);

  // Variables du simulateur
  const [quantity, setQuantity] = useState(1);
  const [usageType, setUsageType] = useState('NonEligible');
  const [installFeePerPoint, setInstallFeePerPoint] = useState(1000);
  const [selectedPower, setSelectedPower] = useState(22);
  const [marginPerRecharge, setMarginPerRecharge] = useState(4);
  const [rechargesPerMonth, setRechargesPerMonth] = useState(205);

  // Simulation de financement
  const [customFinanceAmount, setCustomFinanceAmount] = useState('');
  const [financeYears, setFinanceYears] = useState(5);
  const [clientDeposit, setClientDeposit] = useState(0);

  const currentProduct = products.find(p => p.power === selectedPower) || products[0];
  const hardwareCost = currentProduct.price * quantity;
  const installCostTotal = installFeePerPoint * quantity;
  const totalInvestment = hardwareCost + installCostTotal;
  const [targetTypology, setTargetTypology] = useState('personnalise');

  const typologies = {
    'personnalise': { label: 'Personnalisé', estimate: null },
    'tpe': { label: 'TPE / Bureaux', estimate: 30 },
    'copro': { label: 'Copropriété', estimate: 60 },
    'restaurant': { label: 'Restaurant', estimate: 150 },
    'hotel': { label: 'Hôtel', estimate: 300 },
    'parking': { label: 'Parking public', estimate: 500 },
    'flotte': { label: 'Flotte entreprise', estimate: 100 },
  };

  const handleTypologyChange = (value) => {
    setTargetTypology(value);
    if (typologies[value].estimate !== null) {
      setRechargesPerMonth(typologies[value].estimate);
    }
  };

  const handleProductChange = (id, field, value) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: Number(value) || value } : p
    ));
  };

  // Calculs financiers
  const calculateSubvention = () => {
    switch(usageType) {
      case 'Copro': return Math.min(totalInvestment * 0.5, 1660 * quantity);
      case 'PL': return Math.min(totalInvestment * 0.5, 15000 * quantity);
      case 'Voirie': return Math.min(totalInvestment * 0.3, 9000 * quantity);
      case 'Salariés': return Math.min(totalInvestment * 0.2, 600 * quantity);
      case 'NonEligible': 
      default: 
        return 0;
    }
  };

  const subvention = calculateSubvention();
  const resteACharge = totalInvestment - subvention;
  
  const monthlyRevenue = quantity * marginPerRecharge * rechargesPerMonth;
  
  const breakEvenMonths = monthlyRevenue > 0 ? (resteACharge / monthlyRevenue) : 0;
  const breakEvenDisplay = breakEvenMonths > 0 ? breakEvenMonths.toFixed(1) : '-';

  // Calcul Financement SunLib
  const displayFinanceAmount = customFinanceAmount !== '' ? Number(customFinanceAmount) : resteACharge;
  const actualFinanced = Math.max(0, displayFinanceAmount - clientDeposit);
  const financeRate = 0.08 / 12; // 8% annuel approximatif
  const financeMonths = financeYears * 12;
  const monthlyLease = actualFinanced > 0 ? (actualFinanced * financeRate) / (1 - Math.pow(1 + financeRate, -financeMonths)) : 0;

  // Génération des données du graphique
  const generateChartData = () => {
    const data = [];
    let currentProfit = includeFinancing ? -(Number(clientDeposit) || 0) : -resteACharge;
    
    let calculatedBreakEven = breakEvenMonths;
    if (includeFinancing) {
        let tempProfit = -(Number(clientDeposit) || 0);
        let bMonth = 0;
        for (let m = 1; m <= 120; m++) {
            const year = Math.floor((m - 1) / 12);
            const rev = monthlyRevenue * Math.pow(1.02, year);
            const cost = (m <= financeMonths ? monthlyLease : 0) + (200 * quantity) / 12;
            tempProfit += (rev - cost);
            if (tempProfit >= 0) {
                bMonth = m;
                break;
            }
        }
        calculatedBreakEven = bMonth > 0 ? bMonth : 120;
    }

    const dynamicMonths = Math.max(60, Math.ceil((calculatedBreakEven + 12) / 12) * 12);
    
    for (let month = 1; month <= dynamicMonths; month++) {
      let currentMonthlyRevenue = monthlyRevenue;
      let currentMonthlyCost = 0;

      if (includeFinancing) {
        const year = Math.floor((month - 1) / 12);
        currentMonthlyRevenue = monthlyRevenue * Math.pow(1.02, year);
        const maintenanceCost = (200 * quantity) / 12;
        const leaseCost = month <= financeMonths ? monthlyLease : 0;
        currentMonthlyCost = leaseCost + maintenanceCost;
      }
      
      currentProfit += (currentMonthlyRevenue - currentMonthlyCost);
      data.push({
        month: month.toString(),
        profit: Math.round(currentProfit),
        isPositive: currentProfit >= 0
      });
    }
    return data;
  };

  const getPeriodStats = (months) => {
    let totalRev = 0;
    let totalCost = 0;
    for (let m = 1; m <= months; m++) {
      const year = Math.floor((m - 1) / 12);
      totalRev += monthlyRevenue * Math.pow(1.02, year);
      totalCost += (m <= financeMonths ? monthlyLease : 0) + (200 * quantity) / 12;
    }
    return { rev: totalRev, cost: totalCost, net: totalRev - totalCost };
  };

  const stats1yr = getPeriodStats(12);
  const stats3yr = getPeriodStats(36);
  const stats5yr = getPeriodStats(60);

  const chartData = generateChartData();
  const roiMonth = chartData.find(d => d.profit >= 0)?.month || null;

  // Fonction d'export PDF
  const handleExportPDF = async () => {
    if (!page1Ref.current || !page2Ref.current) return;
    
    // Ajout temporaire du titre pour le PDF
    const titleDiv = document.createElement('div');
    titleDiv.className = "text-center mb-4 pb-4 border-b border-slate-200";
    titleDiv.innerHTML = `
      <h2 class="text-3xl font-extrabold text-slate-800 tracking-tight" style="font-family: inherit; margin-top: 0; margin-bottom: 0;">Étude de Rentabilité : Projet IRVE</h2>
      <p class="text-slate-500 mt-2 text-lg" style="font-family: inherit; margin-bottom: 0;">Démontrez l'intérêt d'investir dans une infrastructure de recharge</p>
    `;
    page2Ref.current.insertBefore(titleDiv, page2Ref.current.firstChild);

    try {
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const addScaledCanvas = async (ref, isFirstPage) => {
        if (!isFirstPage) pdf.addPage();
        const canvas = await html2canvas(ref, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        let imgHeight = (canvas.height * pdfWidth) / canvas.width;
        let finalWidth = pdfWidth;
        
        if (imgHeight > pdfHeight - 10) {
          imgHeight = pdfHeight - 10;
          finalWidth = (canvas.width * imgHeight) / canvas.height;
        }
        
        pdf.addImage(imgData, 'PNG', (pdfWidth - finalWidth) / 2, 5, finalWidth, imgHeight);
      };

        await addScaledCanvas(page2Ref.current, true);
        if (page3Ref.current) await addScaledCanvas(page3Ref.current, false);
        
        pdf.save(`Etude_IRVE_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF :", error);
    } finally {
      if (page2Ref.current && titleDiv.parentNode === page2Ref.current) {
        page2Ref.current.removeChild(titleDiv);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-[95rem] overflow-y-auto h-full pb-20">
      <div className="flex justify-between items-center mb-6 mt-4 px-2">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Calculator className="h-8 w-8 text-blue-600" />
          Simulateur IRVE
        </h1>
        <Button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
          <FileDown className="mr-2 h-5 w-5" />
          Exporter l'étude (PDF)
        </Button>
      </div>

      <div className="space-y-8">
        
        {/* --- PAGE 1 DU PDF --- */}
        <div ref={page1Ref} className="space-y-6 bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
          {/* En-tête pour le PDF */}
          <div className="text-center mb-6 pb-6 border-b border-slate-200">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Étude de Rentabilité : Projet IRVE</h2>
            <p className="text-slate-500 mt-3 text-lg">Démontrez l'intérêt d'investir dans une infrastructure de recharge</p>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 rounded-lg text-sm shadow-sm">
            <strong>⚠️ Important - Éligibilité aux aides 2026 :</strong> La prime ADVENIR n'est plus applicable pour la majorité des projets hôteliers et de restauration classiques. Les aides (Régionales, CEE, Amortissement) dépendent de votre situation. Cette simulation vous permet d'estimer votre rentabilité globale.
          </div>

          {/* 1. Gamme de produits */}
          <Card className="border-t-4 border-t-blue-500 shadow-lg border-x-0 border-b-0 rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl font-bold text-slate-800">1. Offre Commerciale : Gamme & Positionnement</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                      <TableHead className="font-semibold text-slate-700 rounded-tl-lg">Puissance (kW)</TableHead>
                      <TableHead className="font-semibold text-slate-700">Prix HT (€)</TableHead>
                      <TableHead className="font-semibold text-slate-700">Usage Cible</TableHead>
                      <TableHead className="font-semibold text-slate-700 rounded-tr-lg">Positionnement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <Input 
                            type="number" 
                            value={product.power} 
                            onChange={(e) => handleProductChange(product.id, 'power', e.target.value)}
                            className="w-24 border-slate-300 focus:ring-blue-500 text-center"
                            style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={product.price} 
                            onChange={(e) => handleProductChange(product.id, 'price', e.target.value)}
                            className="w-32 border-slate-300 focus:ring-blue-500 text-center"
                            style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}
                          />
                        </TableCell>
                        <TableCell className="text-slate-600 font-medium">{product.target}</TableCell>
                        <TableCell className="text-slate-500">{product.position}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- PAGE 2 DU PDF --- */}
        <div ref={page2Ref} className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
          {/* 2. Simulateur de ROI */}
          <Card className="border-t-4 border-t-emerald-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="text-xl font-bold text-slate-800">2. Simulateur Interactif de ROI</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Panneau de Contrôle */}
                    <div className="lg:col-span-4 space-y-7 bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold mb-3 block text-slate-700">Quantité</Label>
                          <Input 
                            type="number" 
                            value={quantity} 
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full bg-white border-slate-300 focus:ring-emerald-500 font-semibold text-center"
                            style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold mb-3 block text-slate-700">Frais install./borne HT</Label>
                          <Input 
                            type="number" 
                            value={installFeePerPoint} 
                            onChange={(e) => setInstallFeePerPoint(Number(e.target.value))}
                            className="w-full bg-white border-slate-300 focus:ring-emerald-500 font-semibold text-center"
                            style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Investissement total estimé : <span className="font-bold">{totalInvestment} € HT</span>
                      </p>
                      
                      <div className="pt-2">
                        <Label className="text-sm font-semibold mb-3 block text-slate-700">Type d'usage (Éligibilité Aides)</Label>
                        <Select value={usageType} onValueChange={setUsageType}>
                          <SelectTrigger className="bg-white border-slate-300 focus:ring-emerald-500" style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}>
                            <SelectValue placeholder="Sélectionnez l'usage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NonEligible">Non éligible (Hôtels, Restaurants...)</SelectItem>
                            <SelectItem value="Copro">Copropriété / Résidence hôtelière</SelectItem>
                            <SelectItem value="PL">Poids lourds / Logistique</SelectItem>
                            <SelectItem value="Voirie">Collectivité / Voirie publique</SelectItem>
                            <SelectItem value="Salariés">Entreprise - Salariés uniquement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-3 block text-slate-700">Puissance de la borne (kW)</Label>
                        <Select value={selectedPower.toString()} onValueChange={(v) => setSelectedPower(Number(v))}>
                          <SelectTrigger className="bg-white border-slate-300 focus:ring-emerald-500 mb-2" style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}>
                            <SelectValue placeholder="Puissance" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.power.toString()}>{p.power} kW</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                          Temps de recharge (0-80% pour Tesla Model 3) : <span className="font-bold text-slate-700">{selectedPower > 0 ? (48 / selectedPower).toFixed(1) : 0} heures</span>
                        </p>
                      </div>

                      <div className="pt-5 border-t border-slate-200">
                        <Label className="text-sm font-semibold mb-3 block text-slate-700">Cible (Typologie d'établissement)</Label>
                        <Select value={targetTypology} onValueChange={handleTypologyChange}>
                          <SelectTrigger className="bg-white border-slate-300 focus:ring-emerald-500 mb-4" style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}>
                            <SelectValue placeholder="Sélectionnez une cible" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(typologies).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label} {config.estimate ? `(~${config.estimate} recharges/mois)` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Label className="text-sm font-semibold mb-3 block text-slate-700">Marge par recharge (€)</Label>
                        <div className="flex items-center gap-4 mb-2">
                          <Slider 
                            value={[marginPerRecharge]} 
                            onValueChange={(val) => setMarginPerRecharge(val[0])} 
                            max={20} 
                            step={0.1}
                            className="flex-1 cursor-pointer"
                          />
                          <Input 
                            type="number" 
                            step="0.1"
                            value={marginPerRecharge} 
                            onChange={(e) => setMarginPerRecharge(Number(e.target.value))}
                            className="w-24 bg-white border-slate-300 focus:ring-emerald-500 font-semibold text-center"
                            style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}
                          />
                        </div>
                        <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 p-2 rounded-md border border-emerald-100">
                          Gains mensuels estimés : {Math.round(monthlyRevenue)} € / mois
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-3 block text-slate-700">Recharges estimées / mois</Label>
                        <div className="flex items-center gap-4">
                          <Slider 
                            value={[rechargesPerMonth]} 
                            onValueChange={(val) => setRechargesPerMonth(val[0])} 
                            max={1000} 
                            step={5}
                            className="flex-1 cursor-pointer"
                          />
                          <Input 
                            type="number" 
                            value={rechargesPerMonth} 
                            onChange={(e) => {
                              setRechargesPerMonth(Number(e.target.value));
                              setTargetTypology('personnalise');
                            }}
                            className="w-24 bg-white border-slate-300 focus:ring-emerald-500 font-semibold text-center"
                            style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Résultats & Graphique */}
                    <div className="lg:col-span-8 flex flex-col justify-between">
                      {/* Métriques Clés */}
                      <div className="grid grid-cols-3 gap-5 mb-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Subvention Advenir</p>
                          <p className="text-3xl font-extrabold text-slate-800">{Math.round(subvention)} €</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Reste à charge HT</p>
                          <p className="text-3xl font-extrabold text-slate-800">{Math.round(resteACharge)} €</p>
                        </div>
                        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col items-center justify-center text-center">
                          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Point mort</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-extrabold text-emerald-600">{breakEvenDisplay}</p>
                            {breakEvenMonths > 0 && <p className="text-sm font-bold text-emerald-600">mois</p>}
                          </div>
                          {breakEvenMonths > 0 && (
                            <p className="text-xs font-semibold text-emerald-700 mt-1">({(breakEvenMonths / 12).toFixed(1)} ans)</p>
                          )}
                        </div>
                      </div>

                      {/* Visualisation (Graphique) */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Évolution de la rentabilité</h3>
                        <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                          <Switch 
                            id="financing-mode" 
                            checked={includeFinancing} 
                            onCheckedChange={setIncludeFinancing} 
                            className="data-[state=checked]:bg-indigo-600"
                          />
                          <Label htmlFor="financing-mode" className="text-sm font-semibold text-indigo-900 cursor-pointer">
                            Mode Avancé (Financement, 2% inflation, maintenance)
                          </Label>
                        </div>
                      </div>
                      <div className="h-80 w-full bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-slate-800">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="month" stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={{stroke: '#475569'}} label={{ value: 'Mois', position: 'insideBottomRight', offset: -5, fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={{stroke: '#475569'}} tickFormatter={(val) => `${val/1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#34d399', fontWeight: 'bold' }} formatter={(value) => [`${value} €`, 'Profit Cumulé']} labelFormatter={(label) => `Mois ${label}`} cursor={{fill: '#334155', opacity: 0.4}} />
                            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                            {roiMonth && <ReferenceLine x={roiMonth} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" label={{ position: 'top', value: 'ROI', fill: '#60a5fa', fontWeight: 'bold', fontSize: 14 }} />}
                            <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={40}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.isPositive ? '#34d399' : '#60a5fa'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Tableau Gain Financier */}
                      <div className="mt-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">{includeFinancing ? "Bilan Financier (Moyenne Mensuelle A1)" : "Gain financier brut estimé"}</h3>
                        {includeFinancing ? (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="col-span-1 md:col-span-4 grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <div className="text-center">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Recettes (Mois)</p>
                                <p className="text-xl font-bold text-emerald-600">+{Math.round(stats1yr.rev / 12).toLocaleString('fr-FR')} €</p>
                              </div>
                              <div className="text-center border-l border-r border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Coûts (Mois)</p>
                                <p className="text-xl font-bold text-red-500">-{Math.round(stats1yr.cost / 12).toLocaleString('fr-FR')} €</p>
                                <p className="text-[10px] text-slate-400 mt-1">Loyer + Maint.</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Net (Mois)</p>
                                <p className="text-xl font-bold text-slate-800">{Math.round((stats1yr.rev - stats1yr.cost) / 12).toLocaleString('fr-FR')} €</p>
                              </div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100 mt-4 md:col-span-2">
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Net sur 3 ans</p>
                              <p className="text-xl font-bold text-emerald-700">{Math.round(stats3yr.net).toLocaleString('fr-FR')} €</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100 mt-4 md:col-span-2">
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Net sur 5 ans</p>
                              <p className="text-xl font-bold text-emerald-800">{Math.round(stats5yr.net).toLocaleString('fr-FR')} €</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Mensuel</p>
                              <p className="text-xl font-bold text-slate-800">{Math.round(monthlyRevenue).toLocaleString('fr-FR')} €</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Annuel</p>
                              <p className="text-xl font-bold text-emerald-600">{Math.round(monthlyRevenue * 12).toLocaleString('fr-FR')} €</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Sur 3 ans</p>
                              <p className="text-xl font-bold text-emerald-700">{Math.round(monthlyRevenue * 36).toLocaleString('fr-FR')} €</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Sur 5 ans</p>
                              <p className="text-xl font-bold text-emerald-800">{Math.round(monthlyRevenue * 60).toLocaleString('fr-FR')} €</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

            </CardContent>
          </Card>
        </div>

        {/* Toggle Financement */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Switch 
              id="toggle-sunlib" 
              checked={showSunlibFinancing} 
              onCheckedChange={setShowSunlibFinancing} 
              className="data-[state=checked]:bg-indigo-600"
            />
            <Label htmlFor="toggle-sunlib" className="text-sm font-semibold text-slate-700 cursor-pointer">
              Afficher l'offre de financement SunLib
            </Label>
          </div>
        </div>

        {/* --- PAGE 3 DU PDF : FINANCEMENT --- */}
        <div ref={page3Ref} className="space-y-8 bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
          {showSunlibFinancing && (
          <Card className="border-t-4 border-t-indigo-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl font-bold text-slate-800">3. Simulation de Financement SunLib</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Paramètres de financement */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-8">
                    <div>
                      <Label className="text-sm font-semibold mb-3 block text-slate-700">Montant de l'installation (€)</Label>
                      <Input 
                        type="number" 
                        value={customFinanceAmount !== '' ? customFinanceAmount : Math.round(resteACharge)} 
                        onChange={(e) => setCustomFinanceAmount(e.target.value)}
                        placeholder={`Par défaut : ${Math.round(resteACharge)}`}
                        className="w-1/2 bg-white border-slate-300 focus:ring-indigo-500 font-semibold"
                        style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}
                      />
                      <p className="text-xs text-slate-500 mt-2">Laissez vide pour utiliser le Reste à Charge calculé ci-dessus.</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <Label className="text-sm font-semibold text-slate-700">Durée de financement</Label>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{financeYears} ans</span>
                      </div>
                      <Slider 
                        value={[financeYears]} 
                        onValueChange={(val) => setFinanceYears(val[0])} 
                        min={1}
                        max={10} 
                        step={1}
                        className="cursor-pointer"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-3 block text-slate-700">Apport du client (en €)</Label>
                      <Input 
                        type="number" 
                        value={clientDeposit} 
                        onChange={(e) => setClientDeposit(Number(e.target.value))}
                        className="w-1/2 bg-white border-slate-300 focus:ring-indigo-500 font-semibold"
                        style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-4">Informations sur la simulation</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Objectif du projet</span>
                        <span className="font-semibold text-slate-700">Infrastructures de Recharge (IRVE)</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Type de financement</span>
                        <span className="font-semibold text-slate-700">Location Longue Durée / Crédit-Bail</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Montant financé</span>
                        <span className="font-semibold text-slate-700">{Math.round(actualFinanced).toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Durée de financement</span>
                        <span className="font-semibold text-slate-700">{financeYears} ans ({financeMonths} mois)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Résultat (Loyer) */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-[#2D3748] rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                    <div className="flex justify-between items-center mb-4 relative z-10">
                      <h4 className="font-bold text-lg">Mensualité</h4>
                      <span className="bg-white/20 text-xs px-2 py-1 rounded text-white font-medium">estimation</span>
                    </div>
                    <div className="relative z-10 mb-4">
                      <div className="text-4xl font-extrabold flex items-baseline gap-1">
                        <span className="text-3xl font-medium opacity-80">~</span>
                        {Math.round(monthlyLease).toLocaleString('fr-FR')}
                        <span className="text-lg font-medium opacity-80">€ / mois</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-600 pt-4 relative z-10">
                      <p className="font-bold text-sm">Soit {Math.round(monthlyLease * 12).toLocaleString('fr-FR')} € par an</p>
                      <p className="text-[10px] text-slate-400 mt-2 leading-tight">Ce loyer est indicatif. Il pourra varier de ±10% selon l'analyse financière de l'entreprise.</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4">Détails de l'offre</h4>
                    
                    <div className="mb-6">
                      <h5 className="text-xs uppercase font-bold text-slate-500 mb-3">Inclus dans votre devis</h5>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> <span>Installation infrastructure de recharge</span></li>
                        <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> <span>Raccordement et conformité</span></li>
                        <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> <span>Mise en service</span></li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="text-xs uppercase font-bold text-slate-500 mb-3">Coût déjà inclus par SunLib</h5>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" /> <span>Frais bancaires et financiers</span></li>
                        <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" /> <span>Accompagnement administratif</span></li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
          )}

          {/* Arguments Commerciaux & LOM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-t-4 border-t-amber-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-500" />
                  Conformité & Loi LOM
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                <p className="text-slate-700 text-sm">
                  <span className="font-bold text-amber-700">Obligation réglementaire :</span> Depuis le 1er janvier 2025, les bâtiments non résidentiels avec un parking de plus de 20 places doivent s'équiper (1 borne par tranche de 20 places).
                </p>
                <p className="text-slate-700 text-sm">
                  Évitez les sanctions et valorisez votre patrimoine immobilier en vous mettant en conformité avec la Loi d'Orientation des Mobilités (LOM).
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-blue-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-500" />
                  Intérêts Commerciaux
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                <ul className="list-disc pl-5 space-y-2 text-slate-700 text-sm">
                  <li><span className="font-semibold text-slate-900">Visibilité accrue :</span> Soyez visible sur <strong>Booking.com</strong>, <strong>Google Maps</strong> et <strong>Chargemap</strong> en tant qu'établissement équipé.</li>
                  <li><span className="font-semibold text-slate-900">Nouveaux revenus :</span> Transformez votre parking en centre de profit.</li>
                  <li><span className="font-semibold text-slate-900">Fidélisation :</span> Attirez une nouvelle clientèle au fort pouvoir d'achat (utilisateurs de véhicules électriques).</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Footer PDF (Déplacé ici) */}
          <div className="text-xs text-slate-400 text-center mt-12 pt-6 border-t border-slate-200">
            Document généré par ENR Courtage Énergie<br />
            Ces simulations sont données à titre indicatif et ne constituent pas une offre contractuelle. Les subventions dépendent des enveloppes gouvernementales en vigueur.
          </div>
        </div>

      </div>
    </div>
  );
}
