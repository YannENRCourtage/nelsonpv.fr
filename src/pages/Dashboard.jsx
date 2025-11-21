import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, Trash2, Eye, ArrowRightCircle } from "lucide-react";
import "./Dashboard.css";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.jsx";
import { toast } from "@/components/ui/use-toast.js";
import { useDrag, useDrop } from 'react-dnd';
import { cn } from "@/lib/utils.js";
import { generatePdfForProject } from "@/components/AppLayout.jsx";
import { useProjects } from "@/contexts/ProjectContext.jsx";

const LS_CRM_KEY = "nelson:crm:v1";
const LS_COLUMNS_KEY = "nelson:projects:columns:v1";

function loadData(key, defaultValue = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultValue)); } catch { return defaultValue; }
}
function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

const DEFAULT_COLUMNS = [
    { id: 'name', title: 'Nom Projet', width: 250 }, { id: 'client', title: 'Client', width: 150 },
    { id: 'user', title: 'Utilisateur', width: 100 }, { id: 'zip', title: 'Code Postal', width: 100 },
    { id: 'city', title: 'Ville', width: 150 }, { id: 'projectType', title: 'Type', width: 150 },
    { id: 'phone', title: 'Tél', width: 120 }, { id: 'email', title: 'Email', width: 200 },
    { id: 'gps', title: 'GPS', width: 150 }, { id: 'actions', title: 'Actions', width: 150, resizable: false, draggable: false },
];

const ItemTypes = { COLUMN: 'column' };

const DraggableHeader = ({ id, children, index, moveColumn, width, onResize, resizable = true, draggable = true }) => {
    const ref = useRef(null);
    const titleRef = useRef(null);

    const [, drop] = useDrop({ accept: ItemTypes.COLUMN, hover(item) { if(item.index !== index && draggable) { moveColumn(item.index, index); item.index = index; }} });
    const [{ isDragging }, drag, preview] = useDrag({ type: ItemTypes.COLUMN, item: { id, index }, canDrag: draggable, collect: (monitor) => ({ isDragging: !!monitor.isDragging() }) });
    
    preview(drop(ref));
    drag(titleRef);

    const onMouseDown = (e) => {
        e.stopPropagation();
        if (!resizable) return;
        const startX = e.clientX; 
        const startWidth = ref.current.offsetWidth;
        const onMouseMove = (moveEvent) => onResize(startWidth + (moveEvent.clientX - startX));
        const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <th ref={ref} style={{width: `${width}px`}} className={cn("relative", isDragging && "opacity-50")}>
            <div ref={titleRef} className={cn(draggable ? "cursor-move" : "cursor-default", "flex justify-center")}>{children}</div>
            {resizable && <div onMouseDown={onMouseDown} className="resize-handle cursor-col-resize absolute top-0 right-0 w-2 h-full z-10" />}
        </th>
    );
};

function Dashboard() {
  const navigate = useNavigate();
  const { projects, setProjects, saveAllProjects } = useProjects();
  const [columns, setColumns] = useState(() => loadData(LS_COLUMNS_KEY, DEFAULT_COLUMNS));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [user, setUser] = useState("all");

  const moveColumn = useCallback((dragIndex, hoverIndex) => { setColumns(prev => { const newCols = [...prev]; [newCols[dragIndex], newCols[hoverIndex]] = [newCols[hoverIndex], newCols[dragIndex]]; return newCols; }); }, []);
  const handleResize = useCallback((key, width) => { setColumns(prev => prev.map(c => c.id === key ? { ...c, width: Math.max(80, width) } : c)); }, []);

  useEffect(() => { saveData(LS_COLUMNS_KEY, columns) }, [columns]);

  const filtered = useMemo(() => {
    return projects.filter(p => {
        const queryMatch = !q || Object.values(p).some(val => String(val).toLowerCase().includes(q.toLowerCase()));
        const statusMatch = status === 'all' || p.status === status;
        const userMatch = user === 'all' || p.user === user;
        return queryMatch && statusMatch && userMatch;
    });
  }, [projects, q, status, user]);
  
  const handleConvertToCrm = (project) => {
    const crmData = loadData(LS_CRM_KEY, []);
    const newCrmEntry = {
        id: `crm_${project.id}`,
        name: project.name,
        contact: `${project.client?.firstName || ''} ${project.client?.lastName || ''}`.trim(),
        email: project.client?.email || '',
        status: 'Prospect',
        project: project.projectType || 'Non spécifié',
        user: project.user,
    };
    const updatedCrmData = [...crmData, newCrmEntry];
    saveData(LS_CRM_KEY, updatedCrmData);
    toast({ title: "Projet transféré au CRM", description: `${project.name} a été ajouté comme prospect.` });
  };

  const handleNewProject = () => navigate(`/project/new/edit`);
  const handleView = (p) => navigate(`/project/${p.id}/edit`);
  const handleDelete = (projectId) => { const next = projects.filter(p => p.id !== projectId); setProjects(next); saveAllProjects(next); toast({ title: "Projet supprimé" }); };
  const handleDownloadPdf = (project) => generatePdfForProject(project);

  const allUsers = useMemo(() => Array.from(new Set((projects || []).map((p) => p.user).filter(Boolean))), [projects]);
  const allStatuses = useMemo(() => Array.from(new Set((projects || []).map((p) => p.status || "En cours"))), [projects]);

  return (
    <div className="db">
      <div className="db__header">
        <div><h1>Projets</h1><p>Gérez les projets de construction et location de toitures</p></div>
        <button className="db__btn" onClick={handleNewProject}><Plus size={18} /> Nouveau Projet</button>
      </div>
      <div className="db__filters">
        <input placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Tous les statuts</option>{allStatuses.map((s) => (<option key={s} value={s}>{s}</option>))}</select>
        <select value={user} onChange={(e) => setUser(e.target.value)}><option value="all">Tous les utilisateurs</option>{allUsers.map((u) => (<option key={u} value={u}>{u}</option>))}</select>
      </div>
      <div className="db__table-container">
        <table className="db__table" style={{ tableLayout: 'fixed' }}>
          <thead className="db__thead">
            <tr>
              {columns.map((col, index) => (
                <DraggableHeader key={col.id} id={col.id} index={index} moveColumn={moveColumn} width={col.width} onResize={(w) => handleResize(col.id, w)} resizable={col.resizable} draggable={col.draggable}>{col.title}</DraggableHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="db__row">
                {columns.map(col => (
                    <td key={col.id} style={{width: `${col.width}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        {col.id === 'actions' ? (
                            <div className="db__actions">
                                <button onClick={() => handleView(p)} title="Voir / Éditer"><Eye size={16} /></button>
                                <button onClick={() => handleDownloadPdf(p)} title="Télécharger PDF"><Download size={16} /></button>
                                <button onClick={() => handleConvertToCrm(p)} title="Passer au CRM"><ArrowRightCircle size={16} /></button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><button title="Supprimer" className="trash-btn"><Trash2 size={16} /></button></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(p.id)}>Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ) : col.id === 'client' ? `${p.client?.lastName || ''} ${p.client?.firstName || ''}`.trim() || "-"
                          : p[col.id] || p.client?.[col.id] || "-"}
                    </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;