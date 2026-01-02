import React from 'react';
import { motion } from 'framer-motion';

const ResultsTable = ({ results }) => {
  const { 
    totalCostWithoutACC_TTC, 
    totalCostWithACC_TTC, 
    savings, 
    componentsWithoutACC, 
    componentsWithACC 
  } = results;

  const rows = [
    { label: "SITUATION ACTUELLE (Sans ACC)", isHeader: true },
    { label: "Coût Énergie HT", value: `${componentsWithoutACC.energy.toFixed(2)} €` },
    { label: "Coût TURPE HT", value: `${componentsWithoutACC.turpe.toFixed(2)} €` },
    { label: "Coût TVA (20%)", value: `${componentsWithoutACC.vat.toFixed(2)} €` },
    { label: "Coût total TTC", value: `${totalCostWithoutACC_TTC.toFixed(2)} €`, highlight: 'total' },

    { label: "SITUATION FUTURE (Avec ACC)", isHeader: true, mt: true },
    { label: "Coût Énergie Fournisseur HT", value: `${componentsWithACC.providerEnergy.toFixed(2)} €` },
    { label: "Coût Énergie ACC HT", value: `${componentsWithACC.accEnergy.toFixed(2)} €`, highlight: 'acc' },
    { label: "Coût TURPE HT", value: `${componentsWithACC.turpe.toFixed(2)} €` },
    { label: "Coût TVA (20%)", value: `${componentsWithACC.vat.toFixed(2)} €` },
    { label: "Coût total TTC", value: `${totalCostWithACC_TTC.toFixed(2)} €`, highlight: 'total' },

    { label: "VOS ÉCONOMIES", isHeader: true, mt: true },
    { label: "Économies annuelles TTC", value: `${savings.toFixed(2)} €`, highlight: 'savings' },
  ];

  return (
    <div className="overflow-hidden rounded-xl border-2 border-gray-200">
      <table className="w-full">
        <thead className="hidden">
            <tr><th>Description</th><th>Valeur</th></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`
                border-b border-gray-100 last:border-b-0
                ${row.isHeader ? 'bg-gradient-to-r from-blue-50 to-green-50' : ''}
                ${row.mt ? 'border-t-4 border-white' : ''}
                ${row.highlight === 'acc' ? 'bg-green-50' : ''}
                ${row.highlight === 'savings' ? 'bg-yellow-50' : ''}
              `}
            >
              <td className={`px-4 py-3 text-sm 
                ${row.isHeader || row.highlight ? 'font-bold' : 'text-gray-700'}
                ${row.isHeader ? 'text-blue-800' : ''}
              `}>
                {row.label}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-semibold
                ${row.highlight === 'savings' ? 'text-green-700' : 'text-gray-800'}
              `}>
                {row.value}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;