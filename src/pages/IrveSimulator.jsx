import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Calculator, ShieldCheck, Lightbulb } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function IrveSimulator() {
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);
  const [projectionMonths, setProjectionMonths] = useState(36);

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

  const currentProduct = products.find(p => p.power === selectedPower) || products[0];
  const hardwareCost = currentProduct.price * quantity;
  const installCostTotal = installFeePerPoint * quantity;
  const totalInvestment = hardwareCost + installCostTotal;
  const [targetTypology, setTargetTypology] = useState('personnalise');

  const typologies = {
    'personnalise': { label: 'Personnalisé', estimate: null },
    'tpe': { label: 'TPE / Bureaux', estimate: 30 },
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
  
  const monthlyRevenue = marginPerRecharge * rechargesPerMonth;
  
  const breakEvenMonths = monthlyRevenue > 0 ? (resteACharge / monthlyRevenue) : 0;
  const breakEvenDisplay = breakEvenMonths > 0 ? breakEvenMonths.toFixed(1) : '-';

  // Génération des données du graphique
  const generateChartData = () => {
    const data = [];
    let currentProfit = -resteACharge;
    
    for (let month = 1; month <= projectionMonths; month++) {
      currentProfit += monthlyRevenue;
      data.push({
        month: month.toString(),
        profit: Math.round(currentProfit),
        isPositive: currentProfit >= 0
      });
    }
    return data;
  };

  const chartData = generateChartData();
  const roiMonth = chartData.find(d => d.profit >= 0)?.month || null;

  // Fonction d'export PDF
  const handleExportPDF = async () => {
    if (!page1Ref.current || !page2Ref.current) return;
    
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

      await addScaledCanvas(page1Ref.current, true);
      await addScaledCanvas(page2Ref.current, false);
      
      pdf.save(`Etude_IRVE_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF :", error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl overflow-y-auto h-full pb-20">
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

          {/* 3. Arguments Commerciaux & LOM (Déplacé sur la page 1) */}
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
        </div>

        {/* --- PAGE 2 DU PDF --- */}
        <div ref={page2Ref} className="space-y-8 bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
          {/* 2. Simulateur de ROI */}
          <Card className="border-t-4 border-t-emerald-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl font-bold text-slate-800">2. Simulateur Interactif de ROI</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              
              <Tabs defaultValue="simulateur" className="w-full">
                <div className="flex justify-center mb-6">
                  <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="simulateur" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Simulateur</TabsTrigger>
                    <TabsTrigger value="tableau" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Tableau</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="simulateur">
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
                          Temps de recharge (0-80% pour 60kWh) : <span className="font-bold text-slate-700">{selectedPower > 0 ? (48 / selectedPower).toFixed(1) : 0} heures</span>
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
                        <div className="flex items-center gap-4">
                          <Slider 
                            value={[marginPerRecharge]} 
                            onValueChange={(val) => setMarginPerRecharge(val[0])} 
                            max={20} 
                            step={0.5}
                            className="flex-1 cursor-pointer"
                          />
                          <Input 
                            type="number" 
                            value={marginPerRecharge} 
                            onChange={(e) => setMarginPerRecharge(Number(e.target.value))}
                            className="w-24 bg-white border-slate-300 focus:ring-emerald-500 font-semibold text-center"
                            style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}
                          />
                        </div>
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
                        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col items-center justify-center">
                          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Point mort (Mois)</p>
                          <p className="text-3xl font-extrabold text-emerald-600">{breakEvenDisplay}</p>
                        </div>
                      </div>

                      {/* Visualisation (Graphique) */}
                      <div className="h-96 w-full bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-slate-800">
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
                      <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Gain financier estimé</h3>
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
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tableau">
                  <div className="flex items-center justify-between mb-6 mt-4">
                    <h3 className="font-bold text-slate-800 text-lg">Évolution des profits détaillés</h3>
                    <div className="flex items-center gap-4">
                      <Label className="font-semibold text-slate-700">Période d'affichage :</Label>
                      <Select value={projectionMonths.toString()} onValueChange={v => setProjectionMonths(Number(v))}>
                        <SelectTrigger className="w-48 bg-white border-slate-300 focus:ring-blue-500" style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 mois (1 an)</SelectItem>
                          <SelectItem value="24">24 mois (2 ans)</SelectItem>
                          <SelectItem value="36">36 mois (3 ans)</SelectItem>
                          <SelectItem value="48">48 mois (4 ans)</SelectItem>
                          <SelectItem value="60">60 mois (5 ans)</SelectItem>
                          <SelectItem value="120">120 mois (10 ans)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-100 sticky top-0 shadow-sm z-10">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700">Mois (Année)</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">Revenus Mensuels</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">Revenus Cumulés</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">Profit Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chartData.map((row) => (
                          <TableRow key={row.month} className={row.profit >= 0 ? "bg-emerald-50/40" : "bg-white"}>
                            <TableCell className="font-medium text-slate-700">
                              Mois {row.month} <span className="text-slate-400 text-xs ml-1">({(row.month / 12).toFixed(1)} ans)</span>
                            </TableCell>
                            <TableCell className="text-slate-600 text-right">{Math.round(monthlyRevenue).toLocaleString('fr-FR')} €</TableCell>
                            <TableCell className="text-slate-600 text-right">{Math.round(row.month * monthlyRevenue).toLocaleString('fr-FR')} €</TableCell>
                            <TableCell className={row.profit >= 0 ? "text-emerald-600 font-bold text-right" : "text-red-500 font-bold text-right"}>
                              {row.profit.toLocaleString('fr-FR')} €
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>

            </CardContent>
          </Card>
          
          {/* Footer PDF */}
          <div className="text-xs text-slate-400 text-center mt-12 pt-6 border-t border-slate-200">
            Document généré par ENR Courtage Énergie<br />
            Ces simulations sont données à titre indicatif et ne constituent pas une offre contractuelle. Les subventions dépendent des enveloppes gouvernementales en vigueur.
          </div>
        </div>
      </div>
    </div>
  );
}
