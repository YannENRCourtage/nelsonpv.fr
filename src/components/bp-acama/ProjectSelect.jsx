import React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import { resolveProjectPortfolio, getProjectBessPortfolio, normalizePortfolioName } from '../../data/bessPortfolioData.js';
import { getProjectPvPortfolio } from '../../data/pvPortfolioData.js';

const getProjectBadges = (p) => {
  if (!p) return { bess: null, pv: null };
  const bess = resolveProjectPortfolio(p) || normalizePortfolioName(getProjectBessPortfolio(p)) || null;
  const pvRaw = normalizePortfolioName(getProjectPvPortfolio(p));
  const pv = (pvRaw && pvRaw !== 'AUCUN' && pvRaw !== 'NON AFFECTE' && pvRaw !== 'NON') ? pvRaw : null;
  return { bess, pv };
};

const ProjectSelect = ({ projects, activeProjectId, onSelect, className }) => {
  const [search, setSearch] = React.useState('');
  const [portfolioFilter, setPortfolioFilter] = React.useState('ALL');
  const [showSearch, setShowSearch] = React.useState(false);
  const dropdownRef = React.useRef(null);

  const uniqueProjects = React.useMemo(() => {
    const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const seen = new Set();
    const list = [];
    (projects || []).forEach(p => {
      if (!p) return;
      const pName = normalize(p.name || '');
      const pClient = normalize(p.client_name || p.client || `${p.firstName || ''} ${p.name || ''}`);
      const pCity = normalize(p.city || p.commune || '');
      const dedupeKey = `${pName || pClient}__${pCity}`;
      if (p.id && seen.has(p.id)) return;
      if (dedupeKey !== '__' && seen.has(dedupeKey)) return;
      if (p.id) seen.add(p.id);
      if (dedupeKey !== '__') seen.add(dedupeKey);
      list.push(p);
    });
    return list;
  }, [projects]);

  const filteredProjects = React.useMemo(() => {
    return uniqueProjects.filter(p => {
      if (portfolioFilter !== 'ALL') {
        const { bess, pv } = getProjectBadges(p);
        if (bess !== portfolioFilter && pv !== portfolioFilter) return false;
      }
      if (!search) return true;
      const s = search.toLowerCase();
      const { bess, pv } = getProjectBadges(p);
      return (
        (p.name || '').toLowerCase().includes(s) ||
        (p.client || '').toLowerCase().includes(s) ||
        (p.client_name || '').toLowerCase().includes(s) ||
        (p.firstName || '').toLowerCase().includes(s) ||
        (p.address || '').toLowerCase().includes(s) ||
        (p.city || '').toLowerCase().includes(s) ||
        (p.commune || '').toLowerCase().includes(s) ||
        (bess || '').toLowerCase().includes(s) ||
        (pv || '').toLowerCase().includes(s)
      );
    });
  }, [uniqueProjects, search, portfolioFilter]);

  const activeProject = uniqueProjects.find(p => p.id === activeProjectId) || (projects || []).find(p => p.id === activeProjectId);
  const activeBadges = getProjectBadges(activeProject);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Button
            variant="outline"
            className="w-full justify-between bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => setShowSearch(!showSearch)}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Search className="w-4 h-4 mr-1 text-slate-400 shrink-0" />
              <span className="truncate">
                {activeProject ? activeProject.name : "Sélectionner un projet..."}
              </span>
              {activeBadges.bess && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[9px] font-black uppercase shrink-0",
                  activeBadges.bess === 'VOLTA' ? "bg-blue-100 text-blue-800" :
                  activeBadges.bess === 'FARADAY' ? "bg-emerald-100 text-emerald-800" :
                  activeBadges.bess === 'EDISON' ? "bg-indigo-100 text-indigo-800" :
                  "bg-slate-100 text-slate-700"
                )}>
                  {activeBadges.bess}
                </span>
              )}
            </div>
            <Search className="w-4 h-4 ml-2 text-slate-400 opacity-50 shrink-0" />
          </Button>

          {showSearch && (
            <div className="absolute top-full left-0 mt-1 w-[340px] sm:w-[400px] bg-white border border-slate-200 rounded-md shadow-lg z-[100] max-h-[380px] flex flex-col">
              <div className="p-2 border-b border-slate-100 sticky top-0 bg-white space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    autoFocus
                    placeholder="Rechercher un projet, commune, portefeuille..."
                    className="w-full pl-8 pr-8 py-1.5 text-sm border-0 focus:ring-0 rounded-md bg-slate-50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {[
                    { id: 'ALL', label: 'Tous' },
                    { id: 'VOLTA', label: '⚡ VOLTA' },
                    { id: 'FARADAY', label: '🔋 FARADAY' },
                    { id: 'EDISON', label: '💡 EDISON' },
                    { id: 'HELIOS', label: '☀️ HELIOS' },
                    { id: 'CASSIOPEE', label: '✨ CASSIOPEE' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPortfolioFilter(tab.id)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                        portfolioFilter === tab.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto py-1">
                {filteredProjects.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center italic">
                    Aucun projet trouvé
                  </div>
                ) : (
                  filteredProjects.map((project) => {
                    const badges = getProjectBadges(project);
                    return (
                      <button
                        key={project.id}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex flex-col gap-0.5",
                          activeProjectId === project.id && "bg-blue-50 border-l-2 border-blue-500"
                        )}
                        onClick={() => {
                          onSelect(project.id);
                          setShowSearch(false);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900 truncate">{project.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {badges.bess && (
                              <span className={cn(
                                "px-1.5 py-0.2 rounded text-[9px] font-black uppercase",
                                badges.bess === 'VOLTA' ? "bg-blue-100 text-blue-800" :
                                badges.bess === 'FARADAY' ? "bg-emerald-100 text-emerald-800" :
                                badges.bess === 'EDISON' ? "bg-indigo-100 text-indigo-800" :
                                "bg-slate-100 text-slate-700"
                              )}>
                                {badges.bess}
                              </span>
                            )}
                            {badges.pv && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                                {badges.pv}
                              </span>
                            )}
                          </div>
                        </div>
                        {(project.address || project.zip || project.city) && (
                          <span className="text-xs text-slate-500 truncate">
                            {[project.address, project.zip, project.city].filter(Boolean).join(' ')}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelect;
