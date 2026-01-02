import React from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ResultsDisplay = ({ results, formData }) => {
  const handleGeneratePdf = async () => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const pdfContent = document.createElement('div');
    pdfContent.style.width = '1200px';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.padding = '20px';
    pdfContent.innerHTML = document.getElementById('pdf-template').innerHTML;
    document.body.appendChild(pdfContent);
    
    pdfContent.querySelectorAll('.pie-chart-container-pdf').forEach(el => el.style.display = 'none');
    pdfContent.querySelectorAll('.table-container-pdf').forEach(el => el.style.display = 'block');

    const canvas = await html2canvas(pdfContent, { scale: 2 });
    
    document.body.removeChild(pdfContent);
    
    const imgData = canvas.toDataURL('image/png');

    pdf.addImage(imgData, 'PNG', 5, 5, pdfWidth - 10, pdfHeight - 15, undefined, 'FAST');
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text('© ENR COURTAGE ÉNERGIE - 2025', pdfWidth / 2, pdfHeight - 5, { align: 'center' });

    pdf.save(`simulation-acc-${new Date().toLocaleDateString('fr-CA')}.pdf`);
  };

  const formatCurrency = (value) => `${value.toFixed(2).replace('.', ',')} €`;

  const consumptionData = [
    { label: 'Part Fournisseur', value: `${results.providerConsumption.toLocaleString('fr-FR')} kWh (${100 - results.accPercentage}%)` },
    { label: 'Part ACC', value: `${results.accConsumption.toLocaleString('fr-FR')} kWh (${results.accPercentage}%)` },
    { label: 'Total', value: `${results.annualConsumption.toLocaleString('fr-FR')} kWh` },
  ];

  const costData = [
    { label: 'Énergie Fournisseur', value: formatCurrency(results.componentsWithACC.providerEnergy) },
    { label: 'Énergie ACC', value: formatCurrency(results.componentsWithACC.accEnergy) },
    { label: 'TURPE', value: formatCurrency(results.componentsWithACC.turpe) },
    { label: 'TVA', value: formatCurrency(results.componentsWithACC.vat) },
    { label: 'Total', value: formatCurrency(results.totalCostWithACC_TTC) },
  ];

  const renderTable = (title, data) => (
    <div>
        <h3 className="text-lg font-bold text-gray-800 text-center mb-2">{title}</h3>
        <table className="w-full text-sm border-collapse">
            <tbody>
                {data.map((row, index) => (
                    <tr key={index} className="border-b">
                        <td className="p-2 font-semibold">{row.label}</td>
                        <td className="p-2 text-right">{row.value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white rounded-2xl shadow-xl p-8 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800">
          Résultats de la Simulation
        </h3>
        <Button onClick={handleGeneratePdf} size="sm" id="pdf-button" className="bg-blue-600 hover:bg-blue-700">
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>
      </div>
      
      <div className="bg-slate-50 p-3 rounded-lg mb-4">
          <p className="text-sm font-semibold text-gray-700">Vos informations :</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mb-1">
            <span>Fournisseur: <strong>{formData.provider}</strong></span>
            <span>Offre: <strong>{formData.offer}</strong></span>
            <span>Tarif: <strong>{formData.tariffType}</strong></span>
            <span>Puissance: <strong>{formData.power} kVA</strong></span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>Consommation: <strong>{results.annualConsumption.toLocaleString('fr-FR')} kWh/an</strong></span>
              <span>Part ACC: <strong>{results.accPercentage}%</strong></span>
              <span className="flex items-center gap-1">Tarif actuel*: <strong>{parseFloat(results.currentPrice).toFixed(4)} €/kWh</strong></span>
              <span>Tarif ACC: <strong>{parseFloat(results.accPrice).toFixed(4)} €/kWh</strong></span>
          </div>
      </div>

      <Tabs defaultValue="savings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="savings">Économies</TabsTrigger>
              <TabsTrigger value="details">Détails</TabsTrigger>
          </TabsList>
          <TabsContent value="savings">
              <div className="text-center flex items-center justify-center h-16">
                  <div className="inline-block bg-green-100 text-green-800 font-semibold px-4 py-2 rounded-full">
                      Économie annuelle (TTC) : {results.savings.toFixed(2)} € ({results.savingsPercentage.toFixed(1)}%)
                  </div>
              </div>
              <div className="h-64">
                  <BarChart results={results} vertical={false} />
              </div>
          </TabsContent>
          <TabsContent value="details">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <PieChart results={results} type="consumption"/>
                  <PieChart results={results} type="cost" />
              </div>
          </TabsContent>
      </Tabs>
      
      <div id="pdf-template" style={{ position: 'absolute', left: '-9999px' }}>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Votre simulation personnalisée</h2>
          <div className="bg-slate-50 p-2 rounded-lg mb-4">
              <p className="text-xs font-semibold text-gray-700">Vos informations :</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600">
                <span>Fournisseur: <strong>{formData.provider}</strong></span>
                <span>Offre: <strong>{formData.offer}</strong></span>
                <span>Tarif: <strong>{formData.tariffType}</strong></span>
                <span>Puissance: <strong>{formData.power} kVA</strong></span>
                <span>Conso: <strong>{results.annualConsumption.toLocaleString('fr-FR')} kWh</strong></span>
                <span>Part ACC: <strong>{results.accPercentage}%</strong></span>
                <span className="flex items-center gap-1">Tarif actuel: <strong>{parseFloat(results.currentPrice).toFixed(4)} €</strong></span>
                <span>Tarif ACC: <strong>{parseFloat(results.accPrice).toFixed(4)} €</strong></span>
              </div>
          </div>
          <div className="text-center my-4">
              <div className="inline-block bg-green-100 text-green-800 font-semibold px-6 py-3 rounded-full text-lg">
                  Économie annuelle (TTC) : {results.savings.toFixed(2)} € ({results.savingsPercentage.toFixed(1)}%)
              </div>
          </div>
          <div className="grid grid-cols-2 gap-8 items-start">
            <div className="h-[400px]">
                <BarChart results={results} vertical={true} />
            </div>
            <div className="space-y-8 -mt-12">
                <div className="pie-chart-container-pdf">
                    <PieChart results={results} type="consumption"/>
                </div>
                <div className="table-container-pdf" style={{ display: 'none' }}>
                    {renderTable('Répartition de la Consommation', consumptionData)}
                </div>
                <div className="pie-chart-container-pdf">
                    <PieChart results={results} type="cost"/>
                </div>
                <div className="table-container-pdf" style={{ display: 'none' }}>
                    {renderTable('Répartition des Coûts avec ACC', costData)}
                </div>
            </div>
          </div>
      </div>
    </motion.div>
  );
};

export default ResultsDisplay;