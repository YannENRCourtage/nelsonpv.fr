import React, { useState } from 'react';
    import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";

    const CHART_TYPES = {
        BAR: 'bar',
        PIE: 'pie',
        LINE: 'line',
    };

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#a4de6c', '#d0ed57', '#ffc0cb'];

    export default function DiagramView({ boardData }) {
        const [chartType, setChartType] = useState(CHART_TYPES.BAR);
        const [xAxisKey, setXAxisKey] = useState(boardData.columns[0]?.id || '');
        const [yAxisKey, setYAxisKey] = useState(boardData.columns.find(c => c.type === 'number')?.id || '');

        const allRows = boardData.groups.flatMap(g => g.rows.map(r => r.data));

        const getChartData = () => {
            if (!xAxisKey || (chartType !== CHART_TYPES.PIE && !yAxisKey)) return [];
            
            const dataMap = new Map();
            allRows.forEach(row => {
                const key = row[xAxisKey];
                const value = parseFloat(row[yAxisKey]) || 1; 

                if (dataMap.has(key)) {
                    dataMap.set(key, dataMap.get(key) + value);
                } else {
                    dataMap.set(key, value);
                }
            });

            return Array.from(dataMap, ([name, value]) => ({ name, value }));
        };

        const chartData = getChartData();
        const yAxisColumn = boardData.columns.find(c => c.id === yAxisKey);

        const renderChart = () => {
            switch (chartType) {
                case CHART_TYPES.BAR:
                    return (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" name={yAxisColumn?.title || 'Valeur'}>
                                   {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    );
                case CHART_TYPES.PIE:
                    return (
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} fill="#8884d8" label>
                                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    );
                case CHART_TYPES.LINE:
                     return (
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="value" name={yAxisColumn?.title || 'Valeur'} stroke="#8884d8" activeDot={{ r: 8 }}/>
                            </LineChart>
                        </ResponsiveContainer>
                    );
                default: return <p>Type de diagramme non supporté.</p>;
            }
        };

        return (
            <div className="p-4 bg-white rounded-lg shadow h-full flex flex-col">
                <div className="flex flex-wrap gap-4 mb-6 items-center">
                    <div>
                        <label className="text-sm font-medium mr-2">Type de diagramme:</label>
                        <Select value={chartType} onValueChange={setChartType}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={CHART_TYPES.BAR}>Barres</SelectItem>
                                <SelectItem value={CHART_TYPES.PIE}>Circulaire</SelectItem>
                                <SelectItem value={CHART_TYPES.LINE}>Courbes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-sm font-medium mr-2">{chartType === CHART_TYPES.PIE ? 'Libellés' : 'Axe X (Catégories)'}:</label>
                        <Select value={xAxisKey} onValueChange={setXAxisKey}>
                             <SelectTrigger className="w-[180px]"><SelectValue placeholder="Choisir une colonne..." /></SelectTrigger>
                            <SelectContent>
                                {boardData.columns.map(col => <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {chartType !== CHART_TYPES.PIE && (
                        <div>
                            <label className="text-sm font-medium mr-2">Axe Y (Valeurs):</label>
                            <Select value={yAxisKey} onValueChange={setYAxisKey}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Choisir une colonne..." /></SelectTrigger>
                                <SelectContent>
                                    {boardData.columns.filter(c => c.type === 'number').map(col => <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <div className="flex-grow">
                    {chartData.length > 0 ? renderChart() : <p className="text-center text-gray-500">Veuillez sélectionner des données pour afficher le diagramme.</p>}
                </div>
            </div>
        );
    }