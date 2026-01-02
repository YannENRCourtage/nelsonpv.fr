import React from 'react';
import { motion } from 'framer-motion';

const PieChartSVG = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="w-full h-full bg-gray-200 rounded-full"></div>;
  let accumulatedAngle = 0;

  return (
    <div className="relative w-full h-full mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="50" fill="transparent" />
        {data.map((item, index) => {
          const angle = (item.value / total) * 360;
          const largeArcFlag = angle > 180 ? 1 : 0;
          const x = 50 + 50 * Math.cos((accumulatedAngle + angle) * Math.PI / 180);
          const y = 50 + 50 * Math.sin((accumulatedAngle + angle) * Math.PI / 180);
          const startX = 50 + 50 * Math.cos(accumulatedAngle * Math.PI / 180);
          const startY = 50 + 50 * Math.sin(accumulatedAngle * Math.PI / 180);
          
          const pathData = `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArcFlag} 1 ${x} ${y} Z`;
          
          const segment = (
            <motion.path
              key={index}
              d={pathData}
              fill={item.color}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
            />
          );
          accumulatedAngle += angle;
          return segment;
        })}
      </svg>
    </div>
  );
};

const PieChart = ({ results, type }) => {
  const { 
    providerConsumption, 
    accConsumption, 
    annualConsumption,
    componentsWithACC,
    totalCostWithACC_TTC
  } = results;
  
  const consumptionData = [
    { name: results.providerName, value: providerConsumption, color: '#3B82F6' },
    { name: 'ACC', value: accConsumption, color: '#10B981' },
  ];

  const costData = [
    { name: 'Fournisseur HT', value: componentsWithACC.providerEnergy, color: '#3B82F6' },
    { name: 'ACC HT', value: componentsWithACC.accEnergy, color: '#10B981' },
    { name: 'TURPE HT', value: componentsWithACC.turpe, color: '#F59E0B' },
    { name: 'TVA (20%)', value: componentsWithACC.vat, color: '#8B5CF6' },
  ];

  const LegendItem = ({ color, name, value, unit, percentage }) => (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></div>
      <div className="flex-1">
        <p className="font-semibold text-gray-800 text-xs">{name}</p>
        <p className="text-xs text-gray-600">
          {value.toFixed(0)} {unit} ({percentage.toFixed(1)}%)
        </p>
      </div>
    </div>
  );

  const ChartBox = ({ title, data, totalValue, totalUnit, pieData }) => (
    <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-4 border-2 border-gray-200 w-full flex flex-col">
      <h3 className="text-base font-bold text-gray-800 mb-4 text-center">{title}</h3>
      <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 mx-auto mb-4">
         <PieChartSVG data={pieData} />
      </div>
      <div className="w-full space-y-2">
        {data.map(item => (
            <LegendItem key={item.name} color={item.color} name={item.name} value={item.value} unit={totalUnit} percentage={(item.value / totalValue) * 100} />
        ))}
        <div className="pt-2 border-t-2 border-gray-200">
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-base font-bold text-gray-800">{totalValue.toLocaleString('fr-FR', {minimumFractionDigits: totalUnit === '€' ? 2 : 0, maximumFractionDigits: 2})} {totalUnit}</p>
        </div>
      </div>
    </div>
  );
  
  if (type === 'consumption') {
    return <ChartBox title="Répartition de la consommation" data={consumptionData} totalValue={annualConsumption} totalUnit="kWh" pieData={consumptionData} />;
  }

  if (type === 'cost') {
    return <ChartBox title="Répartition des coûts avec ACC" data={costData} totalValue={totalCostWithACC_TTC} totalUnit="€" pieData={costData} />;
  }

  return null;
};

export default PieChart;