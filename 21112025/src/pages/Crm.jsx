import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { produce } from 'immer';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import { Plus, GripVertical, Upload, Download, ChevronDown, ChevronRight, PaintBucket, Trash2, Filter, ArrowRightLeft, MessageSquare, X } from 'lucide-react';

const ItemTypes = { ROW: 'row', COLUMN: 'column' };
const LS_CRM_KEY = "nelson:crm:v9";

function loadData(key, def) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch { return def; } }
function saveData(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
const hexToRgb = (hex) => { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||"#ccc"); return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:204,g:204,b:204}; };
const contrastTextColor = (bg) => { const {r,g,b}=hexToRgb(bg); const L=0.299*r+0.587*g+0.114*b; return L>150?'#111827':'#fff'; };

const initialCrmData = {
  availablePeople: [
    { id: 'u-yann', name: 'Yann', color: '#60a5fa' },
    { id: 'u-nico', name: 'Nico', color: '#a78bfa' },
    { id: 'u-jack', name: 'Jack', color: '#f472b6' },
  ],
  groups: [
    { id: 'group-prospects', name: 'Prospects', isCollapsed: false, rows: [
      { id: 'row-1', data: { selected:false, entreprise:'Solar Corp', contact:'Jean Solaire', email:'jean@solarcorp.fr', statut:'Prospect', projet:'Toiture 500m²', utilisateur:'Yann' }, comments:[], updates:[], files:[] },
    ]},
    { id: 'group-clients', name: 'Clients', isCollapsed: false, rows: [
      { id: 'row-2', data: { selected:false, entreprise:'Eco Bâtiment', contact:'Marie Vert', email:'marie@ecobat.fr', statut:'Client', projet:'PV 100kWc', utilisateur:'Nico' }, comments:[], updates:[], files:[] },
      { id: 'row-3', data: { selected:false, entreprise:'Futur Energie', contact:'Paul Avenir', email:'paul@futur.fr', statut:'Abandonné', projet:'Étude faisabilité', utilisateur:'Jack' }, comments:[], updates:[], files:[] },
    ]},
  ],
  columns: [
    { id: 'entreprise',  title: 'Entreprise',  width: 220, type: 'text' },
    { id: 'contact',     title: 'Contact',     width: 180, type: 'text' },
    { id: 'email',       title: 'Email',       width: 280, type: 'text' },
    { id: 'statut',      title: 'Statut',      width: 180, type: 'status', options: [
      { value: 'Prospect',  color: '#facc15' },
      { value: 'Client',    color: '#4ade80' },
      { value: 'Abandonné', color: '#ef4444' },
    ]},
    { id: 'projet',      title: 'Projet',      width: 260, type: 'text' },
    { id: 'utilisateur', title: 'Utilisateur', width: 180, type: 'user' },
  ],
  gutterWidth: 56,
};

function EditableCell({ value, onValueChange }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(value ?? "");
  useEffect(()=>setVal(value ?? ""),[value]);
  const commit=()=>{ setEdit(false); if(val!==value) onValueChange(val); };
  return (
    <div className="h-10 w-full">
      {edit ? (
        <Input value={val} onChange={e=>setVal(e.target.value)} onBlur={commit}
               onKeyDown={e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape'){ setVal(value??''); setEdit(false);} }}
               autoFocus className="p-0 h-10 bg-transparent focus:ring-1 focus:ring-blue-500 rounded-sm"/>
      ) : (
        <div onClick={()=>setEdit(true)} className="cursor-pointer truncate h-10 flex items-center">
          {String(value ?? '') || null}
        </div>
      )}
    </div>
  );
}

function StatusCell({ value, onChange, options = [], onOptionsChange }) {
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const current = options.find(o => o.value === value) || options[0] || { value:'', color:'#e5e7eb' };
  const textColor = contrastTextColor(current.color);

  const [localOpts, setLocalOpts] = useState(options);
  useEffect(()=>setLocalOpts(options),[options]);
  const save = ()=>{ onOptionsChange?.(localOpts); setManage(false); };

  return (
    <div className="relative h-10 -m-4 px-4 text-center" onMouseLeave={()=>setOpen(false)}>
      <button className="w-full h-full rounded-sm flex items-center justify-center"
              style={{ background: current.color, color: textColor }}
              onClick={()=>setOpen(v=>!v)} title={current.value}>
        <span className="font-semibold text-sm">{current.value || '—'}</span>
      </button>

      {open && !manage && (
        <div className="absolute z-20 mt-1 bg-white border rounded shadow p-1 min-w-[220px]">
          {options.map(opt=>(
            <button key={opt.value} onClick={()=>{ onChange(opt.value); setOpen(false); }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{background:opt.color}}/>
              <span>{opt.value}</span>
            </button>
          ))}
          <div className="border-t my-1"/>
          <button className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2"
                  onClick={()=>setManage(true)}>
            <PaintBucket className="w-4 h-4"/> Gérer les statuts…
          </button>
        </div>
      )}

      {open && manage && (
        <div className="absolute z-30 mt-1 bg-white border rounded shadow p-2 min-w-[260px]">
          <div className="text-xs font-semibold mb-1">Statuts</div>
          <div className="max-h-60 overflow-auto space-y-2">
            {localOpts.map((opt,idx)=>(
              <div key={idx} className="flex items-center gap-2">
                <input className="border rounded px-2 py-1 text-sm flex-1" value={opt.value}
                       onChange={e=>setLocalOpts(p=>produce(p,d=>{d[idx].value=e.target.value;}))}/>
                <input type="color" className="h-8 w-10 p-0 border rounded" value={opt.color}
                       onChange={e=>setLocalOpts(p=>produce(p,d=>{d[idx].color=e.target.value;}))}/>
                <Button size="icon" variant="outline"
                        onClick={()=>setLocalOpts(p=>p.filter((_,i)=>i!==idx))}><Trash2 className="w-4 h-4"/></Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="outline"
                    onClick={()=>setLocalOpts(p=>[...p,{value:'Nouveau statut',color:'#cbd5e1'}])}>
              <Plus className="w-4 h-4 mr-1"/>Ajouter
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={()=>{setManage(false); setOpen(false);}}>Annuler</Button>
              <Button size="sm" onClick={save}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserCell({ value, onChange, people = [], onPeopleChange }) {
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const current = people.find(p => p.name === value) || { name:value||'', color:'#cbd5e1' };
  const textColor = contrastTextColor(current.color);
  const firstName = (current.name||'').trim().split(/\s+/)[0] || '';

  const [localPeople, setLocalPeople] = useState(people);
  useEffect(()=>setLocalPeople(people),[people]);
  const save = ()=>{ onPeopleChange?.(localPeople); setManage(false); };

  return (
    <div className="relative h-10 -m-4 px-4 text-center" onMouseLeave={()=>setOpen(false)}>
      <button className="w-full h-full rounded-sm flex items-center justify-center font-semibold text-sm"
              style={{ background: current.color, color: textColor }}
              onClick={()=>setOpen(v=>!v)} title={current.name}>
        {firstName || '—'}
      </button>

      {open && !manage && (
        <div className="absolute z-20 mt-1 bg-white border rounded shadow p-1 min-w-[220px]">
          {people.map(p=>(
            <button key={p.id||p.name} onClick={()=>{ onChange(p.name); setOpen(false); }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{background:p.color}}/>
              <span>{p.name}</span>
            </button>
          ))}
          <div className="border-t my-1"/>
          <button className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2" onClick={()=>setManage(true)}>
            <PaintBucket className="w-4 h-4"/> Gérer les utilisateurs…
          </button>
        </div>
      )}

      {open && manage && (
        <div className="absolute z-30 mt-1 bg-white border rounded shadow p-2 min-w-[280px]">
          <div className="text-xs font-semibold mb-1">Utilisateurs</div>
          <div className="max-h-60 overflow-auto space-y-2">
            {localPeople.map((p,idx)=>(
              <div key={p.id||idx} className="flex items-center gap-2">
                <input className="border rounded px-2 py-1 text-sm flex-1" value={p.name}
                       onChange={e=>setLocalPeople(prev=>produce(prev,d=>{d[idx].name=e.target.value;}))}/>
                <input type="color" className="h-8 w-10 p-0 border rounded" value={p.color}
                       onChange={e=>setLocalPeople(prev=>produce(prev,d=>{d[idx].color=e.target.value;}))}/>
                <Button size="icon" variant="outline" onClick={()=>setLocalPeople(prev=>prev.filter((_,i)=>i!==idx))}>
                  <Trash2 className="w-4 h-4"/>
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="outline"
                    onClick={()=>setLocalPeople(prev=>[...prev,{id:`u_${Date.now()}`,name:'Nouvel utilisateur',color:'#94a3b8'}])}>
              <Plus className="w-4 h-4 mr-1"/>Ajouter
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={()=>{setManage(false); setOpen(false);}}>Annuler</Button>
              <Button size="sm" onClick={save}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DraggableRow = ({ row, rowIndex, group, moveRow, children }) => {
  const ref = useRef(null);
  const [, drop] = useDrop({
    accept: ItemTypes.ROW,
    hover(item, monitor) {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const middleY = (rect.bottom - rect.top) / 2;
      const hoverY = (monitor.getClientOffset().y - rect.top);
      if (item.groupId === group.id) {
        if (item.index < rowIndex && hoverY < middleY) return;
        if (item.index > rowIndex && hoverY > middleY) return;
      }
      moveRow({ id:item.id, index:item.index, groupId:item.groupId }, { id:row.id, index:rowIndex, groupId:group.id });
      item.index = rowIndex; item.groupId = group.id;
    },
  });
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.ROW,
    item: { id: row.id, index: rowIndex, groupId: group.id },
    collect: (m)=>({ isDragging: m.isDragging() }),
  });
  preview(drop(ref));
  return <TableRow ref={ref} className={isDragging?"opacity-50":""}>{children((node)=>drag(node))}</TableRow>;
};

const DraggableHeader = ({ column, colIndex, moveColumn, resizeColumn, getWidth, onAddColumn, onTitleChange, style }) => {
  const ref = useRef(null);
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(column.title);
  useEffect(()=>setTitle(column.title),[column.title]);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.COLUMN,
    item: { index: colIndex },
    collect: (m)=>({ isDragging: m.isDragging() }),
  });
  const [, drop] = useDrop({
    accept: ItemTypes.COLUMN,
    hover(item, monitor) {
      if (!ref.current || item.index===colIndex) return;
      const rect = ref.current.getBoundingClientRect();
      const midX = (rect.right-rect.left)/2;
      const clientX = (monitor.getClientOffset()?.x??0) - rect.left;
      if (item.index < colIndex && clientX < midX) return;
      if (item.index > colIndex && clientX > midX) return;
      moveColumn(item.index, colIndex);
      item.index = colIndex;
    },
  });
  drop(ref);

  const startResize=(e)=>{
    const sx=e.clientX, sw=getWidth(colIndex);
    const move=(ev)=>resizeColumn(colIndex, Math.max(80, sw+(ev.clientX-sx)));
    const up=()=>{ window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); };
    window.addEventListener('mousemove',move);
    window.addEventListener('mouseup',up);
  };
  const commit=()=>{ setEdit(false); if(title.trim()!==column.title) onTitleChange(colIndex, title.trim()); };

  return (
    <TableHead
      ref={ref}
      style={{ ...style, width: style.width, minWidth: style.width, maxWidth: style.width }}
      className={`relative select-none pr-0 ${isDragging?'opacity-50':''}`}
    >
      <div className="flex items-center gap-2">
        <span className="cursor-move inline-flex" ref={drag} title="Déplacer la colonne"><GripVertical className="w-4 h-4 text-slate-400"/></span>
        {edit ? (
          <input className="border rounded px-2 py-1 text-sm" value={title} autoFocus
                 onChange={e=>setTitle(e.target.value)} onBlur={commit}
                 onKeyDown={e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape'){ setTitle(column.title); setEdit(false);} }} />
        ) : (
          <button className="font-semibold text-left" onClick={()=>setEdit(true)} title="Renommer">{column.title}</button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={()=>onAddColumn(colIndex+1)}>+</Button>
        </div>
      </div>
      <div className="absolute top-0 right-[-1px] w-2 h-full cursor-col-resize z-10" onMouseDown={startResize}/>
    </TableHead>
  );
};

export default function Crm() {
  const [board, setBoard] = useState(()=>loadData(LS_CRM_KEY, initialCrmData));
  const [expanded, setExpanded] = useState(()=>{ const m={}; (board.groups||[]).forEach(g=>m[g.id]=!g.isCollapsed); return m; });
  const [filterText, setFilterText] = useState("");
  const [filters, setFilters] = useState({ utilisateur:"", statut:"" });

  useEffect(()=>{ saveData(LS_CRM_KEY, board); },[board]);

  const selectedCount = useMemo(()=>board.groups.reduce((n,g)=>n+g.rows.filter(r=>r.data?.selected).length,0),[board]);

  const filtered = useMemo(()=>{
    const q=filterText.trim().toLowerCase();
    const fUser=filters.utilisateur, fStat=filters.statut;
    return produce(board, draft=>{
      draft.groups.forEach(g=>{
        g.rows = g.rows.filter(r=>{
          const d=r.data||{};
          const t=!q || Object.values(d).some(v=>String(v||'').toLowerCase().includes(q));
          const u=!fUser || d.utilisateur===fUser;
          const s=!fStat || d.statut===fStat;
          return t&&u&&s;
        });
      });
    });
  },[board,filterText,filters]);

  const moveSelectedTo = (targetGroupId) => {
    setBoard(prev=>produce(prev,d=>{
      const all = [];
      d.groups.forEach(g=>{
        const keep=[]; g.rows.forEach(r=>{ if(r.data?.selected){ all.push(r); } else keep.push(r); }); g.rows=keep;
      });
      const tgt = d.groups.find(x=>x.id===targetGroupId) || d.groups[0];
      tgt.rows.push(...all.map(r=>produce(r,dr=>{ dr.data.selected=false; })));
    }));
  };
  const deleteSelected = () => {
    setBoard(prev=>produce(prev,d=>{
      d.groups.forEach(g=>{ g.rows = g.rows.filter(r=>!r.data?.selected); });
    }));
  };

  const moveRow = useCallback((from,to)=>{ setBoard(prev=>produce(prev,d=>{ const g=d.groups.find(x=>x.id===from.groupId); if(!g)return; const [m]=g.rows.splice(from.index,1); const g2=d.groups.find(x=>x.id===to.groupId); g2.rows.splice(to.index,0,m); })); },[]);
  const moveColumn=(fromIndex,toIndex)=>setBoard(prev=>produce(prev,d=>{ const [c]=d.columns.splice(fromIndex,1); d.columns.splice(toIndex,0,c); }));
  const resizeColumn=(index,width)=>setBoard(prev=>produce(prev,d=>{ d.columns[index].width=width; }));
  const getWidth=(i)=>board.columns[i].width;
  const onAddColumn=(index)=>setBoard(prev=>produce(prev,d=>{ d.columns.splice(index,0,{id:`col_${Date.now()}`, title:'Nouvelle colonne', width:180, type:'text'}); }));
  const onTitleChange=(i,title)=>setBoard(prev=>produce(prev,d=>{ d.columns[i].title=title; }));
  const onUpdateCell=(gid,rid,cid,val)=>setBoard(prev=>produce(prev,d=>{ const g=d.groups.find(gr=>gr.id===gid); const r=g?.rows.find(rr=>rr.id===rid); if(r){ r.data[cid]=val; } }));
  const updateStatusOptions=(cid,opts)=>setBoard(prev=>produce(prev,d=>{ const c=d.columns.find(x=>x.id===cid); if(c) c.options=opts; }));
  const updatePeople=(list)=>setBoard(prev=>produce(prev,d=>{ d.availablePeople=list; }));

  const handleExport=()=>{ const wb=XLSX.utils.book_new(); board.groups.forEach(group=>{ const rows=group.rows.map(r=>{ const out={}; board.columns.forEach(c=>out[c.title]=(r.data||{})[c.id]||''); return out; }); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), group.name.slice(0,31)); }); XLSX.writeFile(wb,'crm-export.xlsx'); };
  const handleImport=async(file)=>{ const data=await file.arrayBuffer(); const wb=XLSX.read(data); const next=produce(board,d=>{ d.groups.forEach(g=>g.rows=[]); wb.SheetNames.forEach((name,idx)=>{ const ws=wb.Sheets[name]; const rows=XLSX.utils.sheet_to_json(ws); const g=d.groups[idx]||d.groups[0]; rows.forEach((row,i)=>{ const obj={id:`imp_${idx}_${i}`,data:{selected:false},comments:[],updates:[],files:[]}; d.columns.forEach(c=>obj.data[c.id]=row[c.title]||''); g.rows.push(obj); }); }); }); setBoard(next); };
  const onFilePick=()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls'; inp.onchange=()=>{ if(inp.files?.[0]) handleImport(inp.files[0]); }; inp.click(); };

  const statusOptions = (board.columns.find(c=>c.type==='status')?.options)||[];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Rechercher…" className="w-64" value={filterText} onChange={e=>setFilterText(e.target.value)} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline"><Filter className="w-4 h-4 mr-2"/> Filtrer</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[260px]">
            <DropdownMenuLabel>Filtres</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="mb-1 font-medium">Utilisateur</div>
              <select className="w-full border rounded px-2 py-1" value={filters.utilisateur} onChange={(e)=>setFilters(f=>({...f, utilisateur:e.target.value}))}>
                <option value="">Tous</option>
                {board.availablePeople.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="px-2 py-1.5 text-sm">
              <div className="mb-1 font-medium">Statut</div>
              <select className="w-full border rounded px-2 py-1" value={filters.statut} onChange={(e)=>setFilters(f=>({...f, statut:e.target.value}))}>
                <option value="">Tous</option>
                {statusOptions.map(o=><option key={o.value} value={o.value}>{o.value}</option>)}
              </select>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5"><Button variant="outline" onClick={()=>setFilters({utilisateur:'',statut:''})}>Réinitialiser</Button></div>
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedCount>0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><ArrowRightLeft className="w-4 h-4 mr-2"/> Actions ({selectedCount})</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Déplacer vers…</DropdownMenuLabel>
              {board.groups.map(g=>(
                <DropdownMenuItem key={g.id} onClick={()=>moveSelectedTo(g.id)}>{g.name}</DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={deleteSelected} className="text-red-600"><Trash2 className="w-4 h-4 mr-2"/> Supprimer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onFilePick}><Upload className="w-4 h-4 mr-2"/>Importer</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2"/>Exporter</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: board.gutterWidth, minWidth: board.gutterWidth, maxWidth: board.gutterWidth }} className="relative pr-0" />
              {board.columns.map((col,i)=>(
                <DraggableHeader
                  key={col.id}
                  column={col}
                  colIndex={i}
                  moveColumn={(f,t)=>setBoard(prev=>produce(prev,d=>{ const [c]=d.columns.splice(f,1); d.columns.splice(t,0,c); }))}
                  resizeColumn={(index,w)=>setBoard(prev=>produce(prev,d=>{ d.columns[index].width=w; }))}
                  getWidth={(idx)=>board.columns[idx].width}
                  onAddColumn={(index)=>setBoard(prev=>produce(prev,d=>{ d.columns.splice(index,0,{id:`col_${Date.now()}`,title:'Nouvelle colonne',width:180,type:'text'}); }))}
                  onTitleChange={(idx,t)=>setBoard(prev=>produce(prev,d=>{ d.columns[idx].title=t; }))}
                  style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                />
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.groups.map(group=>(
              <React.Fragment key={group.id}>
                <TableRow className="bg-slate-50">
                  <TableCell colSpan={1+board.columns.length} className="py-2">
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center text-slate-600" onClick={()=>setExpanded(p=>({...p,[group.id]:!p[group.id]}))}>
                        {expanded[group.id]?<ChevronDown className="w-4 h-4"/>:<ChevronRight className="w-4 h-4"/>}
                        <span className="font-semibold ml-1">{group.name}</span>
                      </button>
                      <Button size="sm" className="ml-2" onClick={()=>setBoard(prev=>produce(prev,d=>{
                        const g=d.groups.find(x=>x.id===group.id);
                        const row={id:`row_${Date.now()}`, data:{selected:false}, comments:[], updates:[], files:[]};
                        d.columns.forEach(c=>row.data[c.id]='');
                        g.rows.unshift(row);
                      }))}><Plus className="w-4 h-4 mr-2"/>Ajouter</Button>
                    </div>
                  </TableCell>
                </TableRow>

                {expanded[group.id] && group.rows.map((row,rowIndex)=>(
                  <DraggableRow key={row.id} row={row} rowIndex={rowIndex} group={group} moveRow={moveRow}>
                    {(dragHandle)=>(
                      <>
                        <TableCell style={{ width: board.gutterWidth, minWidth: board.gutterWidth, maxWidth: board.gutterWidth }}>
                          <div className="flex items-center gap-2">
                            <span ref={dragHandle} className="cursor-move inline-flex"><GripVertical className="w-4 h-4 text-slate-400"/></span>
                            <Checkbox checked={!!row.data?.selected} onCheckedChange={(v)=>onUpdateCell(group.id,row.id,'selected',!!v)} />
                          </div>
                        </TableCell>
                        
                        {board.columns.map((col,colIndex)=>{
                          const val=(row.data||{})[col.id];
                          const startResize=(e)=>{ const sx=e.clientX, sw=board.columns[colIndex].width;
                            const move=(ev)=>setBoard(prev=>produce(prev,d=>{ d.columns[colIndex].width=Math.max(80, sw+(ev.clientX-sx)); }));
                            const up=()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
                            window.addEventListener('mousemove',move); window.addEventListener('mouseup',up); };

                          if(col.type==='status'){
                            return (
                              <TableCell key={col.id} style={{ width: col.width, minWidth: col.width, maxWidth: col.width }} className="relative pr-0">
                                <StatusCell value={val} onChange={(v)=>onUpdateCell(group.id,row.id,col.id,v)} options={col.options||[]} onOptionsChange={(opts)=>setBoard(prev=>produce(prev,d=>{ const c=d.columns.find(x=>x.id===col.id); if(c) c.options=opts; }))}/>
                                <div className="absolute top-0 right-[-1px] w-2 h-full cursor-col-resize z-10" onMouseDown={startResize}/>
                              </TableCell>
                            );
                          }
                          if(col.type==='user'){
                            return (
                              <TableCell key={col.id} style={{ width: col.width, minWidth: col.width, maxWidth: col.width }} className="relative pr-0">
                                <UserCell value={val} onChange={(v)=>onUpdateCell(group.id,row.id,col.id,v)} people={board.availablePeople||[]} onPeopleChange={updatePeople}/>
                                <div className="absolute top-0 right-[-1px] w-2 h-full cursor-col-resize z-10" onMouseDown={startResize}/>
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={col.id} style={{ width: col.width, minWidth: col.width, maxWidth: col.width }} className="relative">
                              <EditableCell value={val} onValueChange={(v)=>onUpdateCell(group.id,row.id,col.id,v)}/>
                              <div className="absolute top-0 right-[-1px] w-2 h-full cursor-col-resize z-10" onMouseDown={startResize}/>
                            </TableCell>
                          );
                        })}
                      </>
                    )}
                  </DraggableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}