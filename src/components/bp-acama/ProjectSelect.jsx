import React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';

const ProjectSelect = ({ projects, activeProjectId, onSelect, className }) => {
  const [search, setSearch] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);
  const dropdownRef = React.useRef(null);

  const filteredProjects = React.useMemo(() => {
    if (!search) return projects;
    return projects.filter(p => 
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [projects, search]);

  const activeProject = projects.find(p => p.id === activeProjectId);

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
            <div className="flex items-center truncate">
              <Search className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
              <span className="truncate">
                {activeProject ? activeProject.name : "Sélectionner un projet..."}
              </span>
            </div>
            <Search className="w-4 h-4 ml-2 text-slate-400 opacity-50 shrink-0" />
          </Button>

          {showSearch && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-[100] max-h-[300px] flex flex-col">
              <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    autoFocus
                    placeholder="Rechercher un projet..."
                    className="w-full pl-8 pr-8 py-2 text-sm border-0 focus:ring-0 rounded-md bg-slate-50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-y-auto py-1">
                {filteredProjects.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center italic">
                    Aucun projet trouvé
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors flex flex-col gap-0.5",
                        activeProjectId === project.id && "bg-blue-50 border-l-2 border-blue-500"
                      )}
                      onClick={() => {
                        onSelect(project.id);
                        setShowSearch(false);
                      }}
                    >
                      <span className="font-medium text-slate-900 truncate">{project.name}</span>
                      {project.address && (
                        <span className="text-xs text-slate-500 truncate">{project.address}</span>
                      )}
                    </button>
                  ))
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
