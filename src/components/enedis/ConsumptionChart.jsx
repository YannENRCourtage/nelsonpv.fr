import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

const ConsumptionChart = ({ data, loading }) => {
  const dailyData = useMemo(() => {
    if (!data?.daily?.metering_data?.intervals) return [];
    return data.daily.metering_data.intervals.map(item => ({
      date: new Date(item.date).toLocaleDateString('fr-FR'),
      value: (parseFloat(item.value) / 1000).toFixed(2), // Wh to kWh
    }));
  }, [data]);

  const loadCurveData = useMemo(() => {
    if (!data?.loadCurve?.metering_data?.intervals) return [];
    // Only show last 24h worth of 30min intervals for clarity
    const lastDay = data.loadCurve.metering_data.intervals.slice(-48);
    return lastDay.map(item => ({
      time: new Date(item.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      value: (parseFloat(item.value) / 1000).toFixed(2),
    }));
  }, [data]);

  if (loading) return <div className="h-64 flex items-center justify-center">Chargement des données Enedis...</div>;
  if (!data) return <div className="text-muted-foreground p-4">Aucune donnée disponible.</div>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Données de Consommation Enedis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily">
          <TabsList className="mb-4">
            <TabsTrigger value="daily">Quotidien (kWh)</TabsTrigger>
            <TabsTrigger value="load_curve">Courbe de charge (30min)</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} unit=" kWh" />
                  <Tooltip />
                  <Bar dataKey="value" name="Consommation" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="load_curve">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loadCurveData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" fontSize={10} tickMargin={10} />
                  <YAxis fontSize={12} unit=" kWh" />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="Puissance" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ConsumptionChart;
