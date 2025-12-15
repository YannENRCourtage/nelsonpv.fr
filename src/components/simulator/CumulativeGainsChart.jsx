import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BarChart3 } from 'lucide-react';

export default function CumulativeGainsChart({ data, totalCost }) {
    const costInK = totalCost / 1000;

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-800">Gains Cumulés (sur 20 ans)</h2>
            </div>

            <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                            dataKey="annee"
                            label={{ value: 'Années', position: 'insideBottom', offset: -5 }}
                            stroke="#666"
                        />
                        <YAxis
                            label={{ value: 'k€', angle: -90, position: 'insideLeft' }}
                            stroke="#666"
                        />
                        <Tooltip
                            formatter={(value) => `${value.toFixed(2)} k€`}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="line"
                        />

                        {/* Ligne horizontale pour le coût du projet */}
                        <ReferenceLine
                            y={costInK}
                            stroke="#ff6b6b"
                            strokeDasharray="5 5"
                            label={{ value: 'Coût Projet', position: 'right', fill: '#ff6b6b' }}
                        />

                        {/* Courbe Gain TH Seul */}
                        <Line
                            type="monotone"
                            dataKey="gainTH"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="Gain TH Seul"
                            dot={false}
                            activeDot={{ r: 6 }}
                        />

                        {/* Courbe Gain TH + ACC */}
                        <Line
                            type="monotone"
                            dataKey="gainACC"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Gain TH + ACC"
                            dot={false}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
