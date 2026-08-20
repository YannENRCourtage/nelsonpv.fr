import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Zap, Battery, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONNECTEURS_IRVE_BASE64 } from '@/assets/irveImagesBase64';

const translateVehicleType = (type) => {
  if (!type) return 'Véhicule';
  const mapping = {
    'passenger_car': 'Berline',
    'suv': 'SUV',
    'hatchback': 'Citadine',
    'van': 'Utilitaire',
    'pickup': 'Pick-up',
    'estate': 'Break'
  };
  return mapping[type] || type;
};

const CHARGE_STATIONS = [
  { id: 'murale', name: 'Prise murale', power: 2.3 },
  { id: 'borne7', name: 'Borne', power: 7.4 },
  { id: 'borne11', name: 'Borne', power: 11 },
  { id: 'borne22', name: 'Borne', power: 22 },
];

const formatTime = (hoursFloat) => {
  if (!hoursFloat || !isFinite(hoursFloat)) return '00h00';
  let h = Math.floor(hoursFloat);
  let m = Math.round((hoursFloat - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}`;
};

const ConnectorIcon = ({ type }) => {
  const t = (type || '').toLowerCase();
  
  if (t.includes('ccs')) {
    // CCS2
    return (
      <svg width="34" height="42" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 15,20 Q 50,-5 85,20 A 45,45 0 0,1 85,60 C 85,75 75,85 50,85 C 25,85 15,75 15,60 Z" fill="black" />
        <circle cx="35" cy="30" r="6" fill="white" />
        <circle cx="65" cy="30" r="6" fill="white" />
        <circle cx="20" cy="50" r="6" fill="white" />
        <circle cx="50" cy="50" r="6" fill="white" />
        <circle cx="80" cy="50" r="6" fill="white" />
        <circle cx="35" cy="70" r="6" fill="white" />
        <circle cx="65" cy="70" r="6" fill="white" />
        <path d="M 25,80 A 30,25 0 0,0 75,80 A 30,30 0 0,1 75,115 A 30,25 0 0,1 25,115 A 30,30 0 0,1 25,80 Z" fill="black" />
        <circle cx="35" cy="98" r="10" fill="white" />
        <circle cx="65" cy="98" r="10" fill="white" />
      </svg>
    );
  } else if (t.includes('type1') || t.includes('j1772')) {
    // Type 1
    return (
      <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="black" />
        <circle cx="50" cy="25" r="8" fill="white" />
        <circle cx="25" cy="45" r="8" fill="white" />
        <circle cx="75" cy="45" r="8" fill="white" />
        <circle cx="35" cy="70" r="6" fill="white" />
        <circle cx="65" cy="70" r="6" fill="white" />
      </svg>
    );
  } else if (t.includes('chademo')) {
    // CHAdeMO
    return (
      <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="black" />
        <circle cx="50" cy="25" r="9" fill="white" />
        <circle cx="25" cy="50" r="9" fill="white" />
        <circle cx="75" cy="50" r="9" fill="white" />
        <circle cx="50" cy="75" r="9" fill="white" />
      </svg>
    );
  } else {
    // Type 2 (default)
    return (
      <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 15,20 Q 50,-5 85,20 A 45,45 0 1,1 15,20 Z" fill="black" />
        <circle cx="35" cy="35" r="7" fill="white" />
        <circle cx="65" cy="35" r="7" fill="white" />
        <circle cx="20" cy="55" r="7" fill="white" />
        <circle cx="50" cy="55" r="7" fill="white" />
        <circle cx="80" cy="55" r="7" fill="white" />
        <circle cx="35" cy="75" r="7" fill="white" />
        <circle cx="65" cy="75" r="7" fill="white" />
      </svg>
    );
  }
};

const getConnectorDisplayName = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('ccs')) return 'CCS';
  if (t.includes('type1') || t.includes('j1772')) return 'Type 1';
  if (t.includes('chademo')) return 'CHAdeMO';
  return 'Type 2';
};

// Mapping des noms de marques vers les slugs du CDN car-logos-dataset
const getBrandSlug = (makeName) => {
  const slugOverrides = {
    'mercedes-benz': 'mercedes-benz',
    'mercedes': 'mercedes-benz',
    'bmw': 'bmw',
    'volkswagen': 'volkswagen',
    'rolls-royce': 'rolls-royce',
    'land rover': 'land-rover',
    'alfa romeo': 'alfa-romeo',
    'aston martin': 'aston-martin',
    'general motors': 'general-motors',
    'mg': 'mg',
    'ds': 'ds',
    'byd': 'byd',
    'gmc': 'gmc',
    'nio': 'nio',
    'ora': 'ora',
    'jac': 'jac',
    'gap': 'gap',
  };
  const lower = (makeName || '').toLowerCase().trim();
  if (slugOverrides[lower]) return slugOverrides[lower];
  return lower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Marques avec logos locaux en haute qualité
const LOCAL_LOGO_BRANDS = {
  'peugeot': '/images/brands/peugeot.png',
  'renault': '/images/brands/renault.png',
};

/**
 * Retourne l'URL du logo pour une marque donnée.
 * Priorité : logo local > CDN car-logos-dataset
 */
const getBrandLogoUrl = (makeName) => {
  if (!makeName) return null;
  const lower = makeName.toLowerCase().trim();
  if (LOCAL_LOGO_BRANDS[lower]) return LOCAL_LOGO_BRANDS[lower];
  const slug = getBrandSlug(makeName);
  return `https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/${slug}.png`;
};

export default function EvComparator() {
  const [data, setData] = useState(null);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedVehicleCode, setSelectedVehicleCode] = useState('');
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fetch('/data/open-ev-data.json')
      .then(res => res.json())
      .then(json => {
        setData(json.vehicles || []);
        
        // Sélection par défaut : Peugeot e-2008
        const peugeotVehicles = json.vehicles?.filter(v => v.make?.name?.toLowerCase() === 'peugeot');
        const defaultVehicle = peugeotVehicles?.find(v => v.model?.name?.toLowerCase().includes('2008'));
        
        if (defaultVehicle) {
          setSelectedMake(defaultVehicle.make.name);
          setSelectedVehicleCode(defaultVehicle.unique_code || JSON.stringify(defaultVehicle));
        } else if (json.vehicles?.length > 0) {
          setSelectedMake(json.vehicles[0].make.name);
          setSelectedVehicleCode(json.vehicles[0].unique_code || JSON.stringify(json.vehicles[0]));
        }
      })
      .catch(err => console.error("Erreur chargement EV Data:", err));
  }, []);

  const makes = useMemo(() => {
    if (!data) return [];
    const makeSet = new Set(data.map(v => v.make?.name).filter(Boolean));
    return Array.from(makeSet).sort();
  }, [data]);

  const vehiclesOfMake = useMemo(() => {
    if (!data || !selectedMake) return [];
    return data
      .filter(v => v.make?.name === selectedMake)
      .sort((a, b) => {
        const nameA = `${a.model?.name} ${a.year}`.toLowerCase();
        const nameB = `${b.model?.name} ${b.year}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [data, selectedMake]);

  // Si la marque change, on reset le modèle et l'état d'erreur logo
  const handleMakeChange = (make) => {
    setSelectedMake(make);
    setLogoError(false);
    const newVehicles = data.filter(v => v.make?.name === make);
    if (newVehicles.length > 0) {
      setSelectedVehicleCode(newVehicles[0].unique_code || JSON.stringify(newVehicles[0]));
    } else {
      setSelectedVehicleCode('');
    }
  };

  const selectedVehicle = useMemo(() => {
    if (!vehiclesOfMake || !selectedVehicleCode) return null;
    return vehiclesOfMake.find(v => (v.unique_code || JSON.stringify(v)) === selectedVehicleCode);
  }, [vehiclesOfMake, selectedVehicleCode]);

  const getVehicleName = (v) => {
    if (!v) return '';
    return `${v.model?.name || ''} ${v.variant?.name ? v.variant.name : ''} - ${v.year || ''}`.trim().replace(/^ - | - $/g, '');
  };

  const batteryCapacity = selectedVehicle?.battery?.pack_capacity_kwh_net || selectedVehicle?.battery?.pack_capacity_kwh_gross || 0;
  const acPower = selectedVehicle?.charging?.ac?.max_power_kw || 0;
  const connector = selectedVehicle?.charge_ports?.[0]?.connector || 'Type 2';
  
  const rangeKms = selectedVehicle?.range?.rated?.[0]?.range_km;
  const autonomy = rangeKms ? `${Math.round(rangeKms)} km` : 'NC';
  
  const logoUrl = selectedMake ? getBrandLogoUrl(selectedMake) : null;

  // Calcul des temps de charge
  const calculateChargingStats = () => {
    if (!batteryCapacity || !acPower) return [];
    
    let recommendedFound = false;
    
    return CHARGE_STATIONS.map((station, index) => {
      const actualPower = Math.min(station.power, acPower);
      const timeHours = batteryCapacity / actualPower;
      
      let isRecommended = false;
      if (index > 0 && station.power >= acPower && !recommendedFound) {
        isRecommended = true;
        recommendedFound = true;
      }
      
      return {
        ...station,
        timeHours,
        timeFormatted: formatTime(timeHours),
        isRecommended
      };
    });
  };

  const chargingStats = calculateChargingStats();
  if (chargingStats.length > 0 && !chargingStats.some(s => s.isRecommended)) {
    chargingStats[chargingStats.length - 1].isRecommended = true;
  }
  const baseTime = chargingStats.length > 0 ? chargingStats[0].timeHours : 0;

  return (
    <Card className="mb-6 shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-xl text-slate-800">Votre véhicule électrique</CardTitle>
            <CardDescription>Simulez le temps de recharge de votre véhicule</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Côté gauche : Sélection et Info véhicule */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <label className="text-sm font-medium text-slate-700">Marque</label>
                <Select value={selectedMake} onValueChange={handleMakeChange} disabled={!data}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Sélectionnez une marque" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {makes.map(make => (
                      <SelectItem key={make} value={make}>
                        <div className="flex items-center gap-2">
                          <img 
                            src={getBrandLogoUrl(make)} 
                            className="w-5 h-5 object-contain bg-white rounded-sm" 
                            onError={(e) => e.target.style.display='none'} 
                            alt=""
                          />
                          <span>{make}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col gap-0.5">
                <label className="text-sm font-medium text-slate-700">Modèle</label>
                <Select value={selectedVehicleCode} onValueChange={setSelectedVehicleCode} disabled={!selectedMake || vehiclesOfMake.length === 0}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Sélectionnez un modèle" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {vehiclesOfMake.map(v => (
                      <SelectItem key={v.unique_code || JSON.stringify(v)} value={v.unique_code || JSON.stringify(v)}>
                        {getVehicleName(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedVehicle && (() => {
              const isPhev = selectedVehicle.model?.name?.toLowerCase().includes('phev') || 
                             selectedVehicle.trim?.name?.toLowerCase().includes('phev') || 
                             selectedVehicle.unique_code?.toLowerCase().includes('phev') || 
                             selectedVehicle.model?.name?.toLowerCase().includes('hybrid') || 
                             selectedVehicle.unique_code?.toLowerCase().includes('hybrid') || 
                             selectedVehicle.model?.name?.toLowerCase().includes('ehybrid');
              const energyType = isPhev ? 'Hybride Rechargeable Essence' : 'Électrique';
              
              return (
              <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 shadow-sm mt-2">
                <div className="flex flex-row items-center gap-4">
                  <div className="shrink-0 flex items-center justify-center w-20 h-20">
                    {logoUrl && !logoError ? (
                      <img 
                        src={logoUrl} 
                        alt={`Logo ${selectedMake}`} 
                        className="max-w-full max-h-[60px] object-contain"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <Car className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-0.5">
                    <h3 className="font-bold text-[15px] sm:text-[17px] text-slate-900 leading-tight">
                      {selectedMake} {getVehicleName(selectedVehicle)}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 capitalize">{translateVehicleType(selectedVehicle.vehicle_type)} - {energyType}</p>
                    
                    <div className="flex-col gap-1 pt-1.5 mt-1 hidden sm:flex">
                      <p className="text-xs sm:text-sm text-slate-600">Capacité batterie : <span className="font-semibold text-slate-800">{batteryCapacity} kWh</span></p>
                      <p className="text-xs sm:text-sm text-slate-600">Puissance de charge : <span className="font-semibold text-slate-800">{acPower} kW</span></p>
                      <p className="text-xs sm:text-sm text-slate-600">Autonomie : <span className="font-semibold text-slate-800">{autonomy}</span></p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 mt-1 sm:hidden">
                      <p className="text-xs sm:text-sm text-slate-600">Capacité batterie : <span className="font-semibold text-slate-800">{batteryCapacity} kWh</span></p>
                      <p className="text-xs sm:text-sm text-slate-600">Puissance de charge : <span className="font-semibold text-slate-800">{acPower} kW</span></p>
                      <p className="text-xs sm:text-sm text-slate-600">Autonomie : <span className="font-semibold text-slate-800">{autonomy}</span></p>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-center justify-center border-l border-slate-100 pl-3 ml-2">
                    <img 
                      src={CONNECTEURS_IRVE_BASE64} 
                      alt="Standards de connecteurs IRVE" 
                      className="h-28 max-w-[120px] object-contain"
                    />
                  </div>
                </div>
              </div>
              );
            })()}
            
            <p className="text-xs text-slate-400 leading-relaxed text-justify">
              Les données présentées peuvent varier suivant le modèle ou les options : vérifiez la puissance de charge de votre véhicule pour confirmer les résultats. 
              La puissance de charge acceptée par votre véhicule est plafonnée à {acPower} kW.
            </p>
          </div>

          {/* Côté droit : Graphique des temps de charge */}
          <div className="bg-[#f0f9ff] rounded-xl p-6 border border-[#bae6fd] flex flex-col h-full">
            <h4 className="text-sm font-semibold text-slate-800 mb-6 text-center">Comparatif des temps de recharge de 0 à 100%</h4>
            
            <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 mt-auto">
              {chargingStats.map((stat, index) => {
                const gainHours = baseTime - stat.timeHours;
                const gainFormatted = formatTime(gainHours);
                
                // Pourcentages
                const fillPercent = (stat.timeHours / baseTime) * 100;
                // Ajustement visuel pour que la barre vert fluo soit toujours visible si gain > 0
                const minGreen = 18; 
                const gainPercent = gainHours > 0 ? Math.max((gainHours / baseTime) * 100, minGreen) : 0;
                
                const isWallPlug = index === 0;

                return (
                  <div key={stat.id} className="flex flex-col items-center flex-1 h-56 mt-4">
                    <div className="w-full flex-1 flex flex-col justify-end relative group">
                      
                      {stat.isRecommended && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm z-10">
                          Recommandée
                        </div>
                      )}

                      {!isWallPlug && gainHours > 0 && (
                        <div 
                          className={cn("w-full bg-[#22c55e] flex flex-col items-center justify-center transition-all duration-500 relative", stat.isRecommended ? "ring-2 ring-blue-600 ring-offset-1 rounded-t-md" : "rounded-t-md")}
                          style={{ height: `${gainPercent}%` }}
                        >
                          {gainPercent >= minGreen && (
                            <>
                              <span className="text-[10px] font-bold text-white leading-tight">Gagné</span>
                              <span className="text-xs sm:text-sm font-bold text-white leading-tight">{gainFormatted}</span>
                            </>
                          )}
                        </div>
                      )}

                      <div 
                        className={cn(
                          "w-full bg-slate-800 flex items-center justify-center transition-all duration-500 relative",
                          isWallPlug ? "rounded-t-md" : "",
                          "rounded-b-sm",
                          stat.isRecommended && (!gainHours || gainHours <= 0) ? "ring-2 ring-blue-600 ring-offset-1" : "",
                          stat.isRecommended && gainHours > 0 ? "ring-2 ring-blue-600 ring-offset-1 ring-t-0 border-t-0" : ""
                        )}
                        style={{ height: `${fillPercent}%` }}
                      >
                        <span className={cn(
                          "font-bold text-white",
                          fillPercent < 15 ? "absolute -top-6 text-slate-800" : "text-sm sm:text-lg"
                        )}>
                          {stat.timeFormatted}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <p className={cn("text-[11px] sm:text-xs font-semibold leading-tight", stat.isRecommended ? "text-blue-700" : "text-slate-700")}>{stat.name}</p>
                      <p className={cn("text-[10px] sm:text-xs", stat.isRecommended ? "text-blue-600 font-medium" : "text-slate-500")}>{stat.power} kW</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
