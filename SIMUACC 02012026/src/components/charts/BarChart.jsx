import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

const BarChart = ({ results, vertical = false }) => {
  const { totalCostWithoutACC_TTC, totalCostWithACC_TTC } = results;
  
  const maxValue = Math.max(totalCostWithoutACC_TTC, totalCostWithACC_TTC);
  const topRange = Math.ceil(maxValue / 100) * 100;

  const chartData = [
    {
      name: ' ', 
      'Sans ACC': totalCostWithoutACC_TTC,
      'Avec ACC': totalCostWithACC_TTC,
    },
  ];

  const CustomizedLabel = (props) => {
    const { x, y, width, height, value } = props;
    const formattedValue = `${value.toFixed(0)}€`;
    
    if (vertical) {
      if (height < 20) return null;
      return (
        <text x={x + width / 2} y={y + height / 2} fill="white" textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold">
          {formattedValue}
        </text>
      );
    }
    
    if (width < 40) return null;
    return (
       <text x={x + width - 10} y={y + height / 2} fill="white" textAnchor="end" dominantBaseline="middle" fontSize="12" fontWeight="bold">
        {formattedValue}
      </text>
    );
  };

  return (
    <div className="h-full w-full">
        <h3 className="text-base font-bold text-gray-800 mb-2 text-center">Comparaison des coûts annuels (TTC)</h3>
        <ResponsiveContainer width="100%" height="90%">
            <RechartsBarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                layout={vertical ? "horizontal" : "vertical"}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={vertical} horizontal={!vertical} />
                 {vertical ? (
                    <>
                        <XAxis type="category" dataKey="name" tickLine={false} axisLine={false} height={10} />
                        <YAxis type="number" tickFormatter={(value) => `${value.toLocaleString('fr-FR')}€`} tick={{fontSize: 10}} domain={[0, topRange]} allowDataOverflow={false} />
                    </>
                ) : (
                    <>
                        <XAxis type="number" tickFormatter={(value) => `${value.toLocaleString('fr-FR')}€`} tick={{fontSize: 10}} domain={[0, topRange]} allowDataOverflow={false} />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={10} />
                    </>
                )}
                <Tooltip
                    cursor={{ fill: 'rgba(235, 248, 255, 0.5)' }}
                    formatter={(value) => `${value.toFixed(2)} €`}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', position: 'relative', bottom: '5px' }} />
                <Bar dataKey="Sans ACC" fill="#F87171" radius={[4, 4, 0, 0]} barSize={vertical ? 60 : 35}>
                  <LabelList dataKey="Sans ACC" content={<CustomizedLabel />} />
                </Bar>
                <Bar dataKey="Avec ACC" fill="#4ADE80" radius={[4, 4, 0, 0]} barSize={vertical ? 60 : 35}>
                   <LabelList dataKey="Avec ACC" content={<CustomizedLabel />} />
                </Bar>
            </RechartsBarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default BarChart;