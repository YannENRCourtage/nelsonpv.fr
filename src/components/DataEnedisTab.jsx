
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, Loader2, Info, Lock, CheckCircle, ExternalLink } from 'lucide-react';

export default function DataEnedisTab({ project, activeTab }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (activeTab === 'dataenedis') {
      if (project?.gps) {
        fetchNeighborhoodData();
      } else {
        setLoading(false);
      }
    }
    
    // Check if we have a token in URL (callback)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('enedis_token')) {
      setIsConnected(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [activeTab, project?.gps]);

  const fetchNeighborhoodData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lat, lng] = project.gps.split(',').map(s => s.trim());
      const response = await fetch(`/api/enedis-consumption?lat=${lat}&lng=${lng}`);
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'Erreur lors du chargement des données');
      setData(result);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkyConnect = () => {
    window.location.href = '/api/enedis-auth?action=authorize';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="animate-pulse">Récupération des données Enedis (Maille IRIS)...</p>
      </div>
    );
  }

  const chartData = data?.records?.filter(r => r.sector === 'Résidentiel').map(r => ({
    label: r.year,
    'Conso Totale (MWh)': r.conso_totale,
    'Conso Moyenne (MWh)': r.conso_moyenne
  })).sort((a, b) => a.label - b.label) || [];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            Données Enedis
          </h2>
          <p className="text-slate-500">
            {data?.iris?.name ? `Quartier : ${data.iris.name} (${data.iris.commune})` : 'Statistiques énergétiques locales'}
          </p>
        </div>
        
        {isConnected ? (
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
            <CheckCircle className="h-5 w-5" />
            Compteur Linky connecté
          </div>
        ) : (
          <button
            onClick={handleLinkyConnect}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
          >
            <Lock className="h-4 w-4" />
            Connecter mon Linky
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IRIS Stats Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Consommation Résidentielle (Maille IRIS)</h3>
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg cursor-help group relative">
              <Info className="h-4 w-4" />
              <div className="hidden group-hover:block absolute right-0 top-8 w-64 bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl z-20">
                La maille IRIS représente un micro-quartier d'environ 2000 habitants. Données Open Data Enedis.
              </div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="Conso Moyenne (MWh)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-xl">
                <Info className="h-8 w-8 opacity-20" />
                <p>Aucune donnée résidentielle disponible pour ce secteur</p>
              </div>
            )}
          </div>
        </div>

        {/* Data Connect Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white flex flex-col gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Data Connect
          </h3>
          <p className="text-blue-100 text-sm">
            Récupérez vos données de consommation réelles pour une étude d'autoconsommation ultra-précise.
          </p>
          
          <ul className="space-y-3 mt-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-blue-300" />
              Courbe de charge (pas de 30 min)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-blue-300" />
              Puissance souscrite et pics
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-blue-300" />
              Historique sur 2 ans
            </li>
          </ul>

          <div className="mt-auto pt-4 border-t border-blue-400/30">
            <div className="flex items-center gap-2 text-xs text-blue-200">
              <Lock className="h-3 w-3" />
              Propulsé par l'API sécurisée Enedis API
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <Info className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}
      
      {/* Context info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h4 className="font-semibold text-slate-800 mb-2">Pourquoi ces données ?</h4>
        <p className="text-slate-600 text-sm leading-relaxed">
          Le dimensionnement d'une installation photovoltaïque dépend de votre capacité d'autoconsommation. 
          En analysant la consommation moyenne de votre quartier et vos données Linky réelles, 
          Nelson PV peut simuler avec précision vos économies futures et le temps de retour sur investissement.
        </p>
      </div>
    </div>
  );
}
