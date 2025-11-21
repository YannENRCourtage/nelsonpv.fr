import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { produce } from 'immer';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';

import { Plus, GripVertical, Upload, Download, ChevronDown, ChevronRight, PaintBucket, Trash2, Filter, ArrowRightLeft, MessageSquare, X } from 'lucide-react';
import './Admin.css';

const ItemTypes = { ROW: 'row', COLUMN: 'column' };
const LS_ADMIN_KEY = "nelson:admin:v10";

const hexToRgb = (hex) => { const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||"#ccc"); return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:204,g:204,b:204}; };
const contrastTextColor=(bg)=>{ const {r,g,b}=hexToRgb(bg); const L=0.299*r+0.587*g+0.114*b; return L>150?'#111827':'#fff'; };
function loadData(key, def){ try{const r=localStorage.getItem(key); return r?JSON.parse(r):def;}catch{return def;} }
function saveData(key,val){ try{localStorage.setItem(key, JSON.stringify(val));}catch{} }

const initialAdminData = {
  availablePeople: [
    { id: 'u-yann', name: 'Yann', color: '#60a5fa' },
    { id: 'u-nico', name: 'Nico', color: '#a78bfa' },
    { id: 'u-jack', name: 'Jack', color: '#f472b6' },
  ],
  boards: [
    {
      id: 'board-1',
      name: 'Projets à l’étude',
      groups: [
        { id: 'group-1', name: 'Dossiers en attente', isCollapsed:false, rows:[
          { id:'row-1', data:{selected:false, element:'Dossier A', responsable:'Nico', statut:'En montage', budget:5000, echeance:'2025-10-15'}, comments:[], updates:[], files:[] },
          { id:'row-2', data:{selected:false, element:'Dossier B', responsable:'Yann', statut:'Envoyé à l’investisseur', budget:12000, echeance:'2025-11-20'}, comments:[], updates:[], files:[] },
        ]},
        { id: 'group-2', name: 'Dossiers validés', isCollapsed:false, rows:[
          { id:'row-3', data:{selected:false, element:'Dossier C', responsable:'Jack', statut:'Validé', budget:8500, echeance:'2025-09-30'}, comments:[], updates:[], files:[] },
        ]},
      ],
      columns: [
        { id: 'element',     title: 'Élément',      width: 220, type: 'text' },
        { id: 'responsable', title: 'Responsable',  width: 180, type: 'user' },
        { id: 'statut',      title: 'Statut',       width: 190, type: 'status', options:[
          { value:'En montage', color:'#facc15' },
          { value:'Envoyé à l’investisseur', color:'#fb923c' },
          { value:'Validé', color:'#4ade80' },
          { value:'Abandonné', color:'#ef4444' },
        ]},
        { id: 'budget',      title: 'Budget',       width: 120, type: 'number' },
        { id: 'echeance',    title: 'Échéance',     width: 150, type: 'date' },
      ],
      gutterWidth: 56,
    },
    { id:'board-users', name:'Utilisateurs', groups:[], columns:[{id:'name',title:'Nom',width:240,type:'text'}], gutterWidth:56 }
  ],
};

function EditableCell({ value, onValueChange }) {
  const [edit,setEdit]=useState(false); const [val,setVal]=useState(value??''); useEffect(()=>setVal(value??''),[value]);
  const commit=()=>{ setEdit(false); if(val!==value) onValueChange(val); };
  return <div className="h-10 w-full">{edit?<Input value={val} onChange={e=>setVal(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit(); if(e.key==='Escape'){setVal(value??''); setEdit(false);}}} autoFocus className="p-0 h-10 bg-transparent focus:ring-1 focus:ring-blue-500 rounded-sm"/>:<div onClick={()=>setEdit(true)} className="cursor-pointer truncate h-10 flex items-center">{String(value??'')||null}</div>}</div>;
}
function StatusCell({ value, onChange, options=[], onOptionsChange }) {
  const [open,setOpen]=useState(false); const [manage,setManage]=useState(false);
  const current=options.find(o=>o.value===value)||options[0]||{value:'',color:'#e5e7eb'}; const textColor=contrastTextColor(current.color);
  const [localOpts,setLocalOpts]=useState(options); useEffect(()=>setLocalOpts(options),[options]); const save=()=>{ onOptionsChange?.(localOpts); setManage(false); };
  return (
    <div className="relative h-10 -m-4 px-4" onMouseLeave={()=>setOpen(false)}>
      <button className="w-full h-full rounded-sm flex items-center justify-center gap-2" style={{background:current.color,color:textColor}} onClick={()=>setOpen(v=>!v)} title={current.value}>
        <span className="font-semibold text-sm">{current.value||'—'}</span>
      </button>
      {open && !manage && (
        <div className="absolute z-20 mt-1 bg-white border rounded shadow p-1 min-w-[220px]">
          {options.map(opt=>(
            <button key={opt.value} onClick={()=>{onChange(opt.value); setOpen(false);}} className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{background:opt.color}}/><span>{opt.value}</span>
            </button>
          ))}
          <div className="border-t my-1"/><button className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2" onClick={()=>setManage(true)}><PaintBucket className="w-4 h-4"/> Gérer les statuts…</button>
        </div>
      )}
      {open && manage && (
        <div className="absolute z-30 mt-1 bg-white border rounded shadow p-2 min-w-[260px]">
          <div className="text-xs font-semibold mb-1">Statuts</div>
          <div className="max-h-60 overflow-auto space-y-2">
            {localOpts.map((opt,idx)=>(
              <div key={idx} className="flex items-center gap-2">
                <input className="border rounded px-2 py-1 text-sm flex-1" value={opt.value} onChange={e=>setLocalOpts(p=>produce(p,d=>{d[idx].value=e.target.value;}))}/>
                <input type="color" className="h-8 w-10 p-0 border rounded" value={opt.color} onChange={e=>setLocalOpts(p=>produce(p,d=>{d[idx].color=e.target.value;}))}/>
                <Button size="icon" variant="outline" onClick={()=>setLocalOpts(p=>p.filter((_,i)=>i!==idx))}><Trash2 className="w-4 h-4"/></Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={()=>setLocalOpts(p=>[...p,{value:'Nouveau statut',color:'#cbd5e1'}])}><Plus className="w-4 h-4 mr-1"/>Ajouter</Button>
            <div className="ml-auto flex items-center gap-2"><Button size="sm" variant="outline" onClick={()=>{setManage(false); setOpen(false);}}>Annuler</Button><Button size="sm" onClick={save}>Enregistrer</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
function UserCell({ value, onChange, people=[], onPeopleChange }) {
  const [open,setOpen]=useState(false);
  const [manage,setManage]=useState(false);
  const current=people.find(p=>p.name===value)||{name:value||'',color:'#cbd5e1'}; const textColor=contrastTextColor(current.color);
  const [localPeople,setLocalPeople]=useState(people); useEffect(()=>setLocalPeople(people),[people]); const save=()=>{ onPeopleChange?.(localPeople); setManage(false); };
  const firstName=(current.name||'').split(/\s+/)[0]||'';
  return (
    <div className="relative h-10 -m-4 px-4" onMouseLeave={()=>setOpen(false)}>
      <button className="w-full h-full rounded-sm flex items-center justify-center font-semibold text-sm" style={{background:current.color,color:textColor}} onClick={()=>setOpen(v=>!v)} title={current.name}>
        {firstName || '—'}
      </button>
      {open && !manage && (
        <div className="absolute z-20 mt-1 bg-white border rounded shadow p-1 min-w-[220px]">
          {people.map(p=>(
            <button key={p.id||p.name} onClick={()=>{onChange(p.name); setOpen(false);}} className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{background:p.color}}/><span>{p.name}</span>
            </button>
          ))}
          <div className="border-t my-1"/><button className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-2" onClick={()=>setManage(true)}><PaintBucket className="w-4 h-4"/> Gérer les utilisateurs…</button>
        </div>
      )}
      {open && manage && (
        <div className="absolute z-30 mt-1 bg-white border rounded shadow p-2 min-w-[280px]">
          <div className="text-xs font-semibold mb-1">Utilisateurs</div>
          <div className="max-h-60 overflow-auto space-y-2">
            {localPeople.map((p,idx)=>(
              <div key={p.id||idx} className="flex items-center gap-2">
                <input className="border rounded px-2 py-1 text-sm" value={p.name} onChange={e=>setLocalPeople(prev=>produce(prev,d=>{d[idx].name=e.target.value;}))}/>
                <input type="color" className="h-8 w-10 p-0 border rounded" value={p.color} onChange={e=>setLocalPeople(prev=>produce(prev,d=>{d[idx].color=e.target.value;}))}/>
                <Button size="icon" variant="outline" onClick={()=>setLocalPeople(prev=>prev.filter((_,i)=>i!==idx))}><Trash2 className="w-4 h-4"/></Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={()=>setLocalPeople(prev=>[...prev,{id:`u_${Date.now()}`,name:'Nouvel utilisateur',color:'#94a3b8'}])}><Plus className="w-4 h-4 mr-1"/>Ajouter</Button>
            <div className="ml-auto flex items-center gap-2"><Button size="sm" variant="outline" onClick={()=>{setManage(false); setOpen(false);}}>Annuler</Button><Button size="sm" onClick={save}>Enregistrer</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

const DraggableRow = ({ row, rowIndex, group, moveRow, children }) => {
  const ref=useRef(null);
  const [,drop]=useDrop({ accept:ItemTypes.ROW, hover(item,monitor){ if(!ref.current) return;
    const rect=ref.current.getBoundingClientRect(); 
    const mid=(rect.bottom-rect.top)/2; 
    const y=monitor.getClientOffset().y-rect.top;
    if(item.groupId===group.id){ if(item.index<rowIndex && y<mid) return; if(item.index>rowIndex && y>mid) return; }
    moveRow({id:item.id,index:item.index,groupId:item.groupId},{id:row.id,index:rowIndex,groupId:group.id}); item.index=rowIndex; item.groupId=group.id; }});
  const [{isDragging},drag,preview]=useDrag({ type:ItemTypes.ROW, item:{id:row.id,index:rowIndex,groupId:group.id}, collect:(m)=>({isDragging:m.isDragging()}) });
  preview(drop(ref));
  return <TableRow ref={ref} className={isDragging?"opacity-50":""}>{children((node)=>drag(node))}</TableRow>;
};
const DraggableHeader = ({ column, colIndex, moveColumn, resizeColumn, getWidth, onAddColumn, onTitleChange, style }) => {
  const ref=useRef(null); const [edit,setEdit]=useState(false); const [title,setTitle]=useState(column.title); useEffect(()=>setTitle(column.title),[column.title]);
  const [{isDragging},drag]=useDrag({type:ItemTypes.COLUMN,item:{index:colIndex},collect:(m)=>({isDragging:m.isDragging()})});
  const [,drop]=useDrop({accept:ItemTypes.COLUMN,hover(item,mon){ if(!ref.current||item.index===colIndex) return; const r=ref.current.getBoundingClientRect(); const mid=(r.right-r.left)/2; const x=(mon.getClientOffset()?.x??0)-r.left; if(item.index<colIndex&&x<mid) return; if(item.index>colIndex&&x>mid) return; moveColumn(item.index,colIndex); item.index=colIndex; }});
  drop(ref);
  const startResize=(e)=>{ const sx=e.clientX, sw=getWidth(colIndex); const move=(ev)=>resizeColumn(colIndex, Math.max(80, sw+(ev.clientX-sx))); const up=()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);}; window.addEventListener('mousemove',move); window.addEventListener('mouseup',up); };
  const commit=()=>{ setEdit(false); if(title.trim()!==column.title) onTitleChange(colIndex,title.trim()); };
  return (
    <TableHead ref={ref} style={{...style, width:style.width, minWidth:style.width, maxWidth:style.width}} className={`relative select-none pr-0 ${isDragging?'opacity-50':''}`}>
      <div className="flex items-center gap-2">
        <span className="cursor-move inline-flex" ref={drag} title="Déplacer la colonne"><GripVertical className="w-4 h-4 text-slate-400"/></span>
        {edit ? (
          <input className="border rounded px-2 py-1 text-sm" value={title} autoFocus onChange={e=>setTitle(e.target.value)} onBlur={commit} onKeyDown={e=>{ if(e.key==='Enter')commit(); if(e.key==='Escape'){setTitle(column.title); setEdit(false);} }}/>
        ) : (
          <button className="font-semibold text-left" onClick={()=>setEdit(true)} title="Renommer">{column.title}</button>
        )}
        <div className="ml-auto flex items-center gap-2"><Button size="sm" variant="outline" onClick={()=>onAddColumn(colIndex+1)}>+</Button></div>
      </div>
      <div className="absolute top-0 right-[-1px] w-2 h-full cursor-col-resize z-10" onMouseDown={startResize}/>
    </TableHead>
  );
};

function BoardView({ board, onDataChange, availablePeople, onAvailablePeopleChange }) {
  const [search,setSearch]=useState(''); const [filters,setFilters]=useState({responsable:'',statut:''}); const [local,setLocal]=useState(board);

  useEffect(()=>setLocal(board),[board]); useEffect(()=>{ onDataChange('', local); },[local, onDataChange]);

  const selectedCount = useMemo(()=>local.groups.reduce((n,g)=>n+g.rows.filter(r=>r.data?.selected).length,0),[local]);

  const moveRow=useCallback((from,to)=>{ setLocal(prev=>produce(prev,d=>{ const gf=d.groups.find(g=>g.id===from.groupId); const gt=d.groups.find(g=>g.id===to.groupId); if(!gf||!gt)return; const [m]=gf.rows.splice(from.index,1); gt.rows.splice(to.index,0,m); })); },[]);
  const moveColumn=(from,to)=>setLocal(prev=>produce(prev,d=>{ const [c]=d.columns.splice(from,1); d.columns.splice(to,0,c); }));
  const resizeColumn=(i,w)=>setLocal(prev=>produce(prev,d=>{ d.columns[i].width=w; }));
  const getWidth=(i)=>local.columns[i].width;
  const onAddColumn=(i)=>setLocal(prev=>produce(prev,d=>{ d.columns.splice(i,0,{id:`col_${Date.now()}`,title:'Nouvelle colonne',width:180,type:'text'}); }));
  const onTitleChange=(i,t)=>setLocal(prev=>produce(prev,d=>{ d.columns[i].title=t; }));
  const onUpdateCell=(gid,rid,cid,val)=>setLocal(prev=>produce(prev,d=>{ const g=d.groups.find(gr=>gr.id===gid); const r=g?.rows.find(rr=>rr.id===rid); if(r){ r.data[cid]=val; } }));
  const updateStatusOptions=(cid,opts)=>setLocal(prev=>produce(prev,d=>{ const c=d.columns.find(x=>x.id===cid); if(c)c.options=opts; }));

  const moveSelectedTo=(targetGroupId)=>setLocal(prev=>produce(prev,d=>{
    const all=[]; d.groups.forEach(g=>{ const keep=[]; g.rows.forEach(r=>{ if(r.data?.selected){ all.push(r); } else keep.push(r); }); g.rows=keep; });
    const tgt=d.groups.find(x=>x.id===targetGroupId) || d.groups[0];
    tgt.rows.push(...all.map(r=>produce(r,dr=>{ dr.data.selected=false; })));
  }));
  const deleteSelected=()=>setLocal(prev=>produce(prev,d=>{ d.groups.forEach(g=>{ g.rows=g.rows.filter(r=>!r.data?.selected); }); }));

  const statusOptions=(local.columns.find(c=>c.type==='status')?.options)||[];

  const filtered=useMemo(()=>{
    const q=search.toLowerCase(), resp=filters.responsable, st=filters.statut;
    return produce(local,d=>{
      d.groups.forEach(g=>{
        g.rows=g.rows.filter(r=>{
          const data=r.data||{};
          const okText=!q || Object.values(data).some(v=>String(v||'').toLowerCase().includes(q));
          const okR=!resp || data.responsable===resp;
          const okS=!st || data.statut===st;
          return okText && okR && okS;
        });
      });
    });
  },[local,search,filters]);

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Input placeholder="Rechercher…" className="w-64" value={search} onChange={e=>setSearch(e.target.value)}/>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline"><Filter className="w-4 h-4 mr-2"/> Filtrer</Button></DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[260px]">
            <DropdownMenuLabel>Filtres</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="mb-1 font-medium">Responsable</div>
              <select className="w-full border rounded px-2 py-1" value={filters.responsable} onChange={(e)=>setFilters(f=>({...f,responsable:e.target.value}))}>
                <option value="">Tous</option>
                {availablePeople.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="px-2 py-1.5 text-sm">
              <div className="mb-1 font-medium">Statut</div>
              <select className="w-full border rounded px-2 py-1" value={filters.statut} onChange={(e)=>setFilters(f=>({...f,statut:e.target.value}))}>
                <option value="">Tous</option>
                {statusOptions.map(o=><option key={o.value} value={o.value}>{o.value}</option>)}
              </select>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5"><Button variant="outline" onClick={()=>setFilters({responsable:'',statut:''})}>Réinitialiser</Button></div>
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedCount>0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><ArrowRightLeft className="w-4 h-4 mr-2"/> Actions ({selectedCount})</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Déplacer vers…</DropdownMenuLabel>
              {local.groups.map(g=>(
                <DropdownMenuItem key={g.id} onClick={()=>moveSelectedTo(g.id)}>{g.name}</DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={deleteSelected} className="text-red-600"><Trash2 className="w-4 h-4 mr-2"/> Supprimer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline"><Upload className="w-4 h-4 mr-2"/> Importer</Button>
          <Button variant="outline"><Download className="w-4 h-4 mr-2"/> Exporter</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: board.gutterWidth, minWidth: board.gutterWidth, maxWidth: board.gutterWidth }} className="relative pr-0" />
              {local.columns.map((col,i)=>(
                <DraggableHeader
                  key={col.id}
                  column={col}
                  colIndex={i}
                  moveColumn={(f,t)=>setLocal(prev=>produce(prev,d=>{ const [c]=d.columns.splice(f,1); d.columns.splice(t,0,c); }))}
                  resizeColumn={(index,w)=>setLocal(prev=>produce(prev,d=>{ d.columns[index].width=w; }))}
                  getWidth={(idx)=>local.columns[idx].width}
                  onAddColumn={(index)=>setLocal(prev=>produce(prev,d=>{ d.columns.splice(index,0,{id:`col_${Date.now()}`,title:'Nouvelle colonne',width:180,type:'text'}); }))}
                  onTitleChange={(idx,t)=>setLocal(prev=>produce(prev,d=>{ d.columns[idx].title=t; }))}
                  style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.groups.map(group=>(
              <React.Fragment key={group.id}>
                <TableRow className="bg-slate-50">
                  <TableCell colSpan={1+local.columns.length} className="py-2">
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center text-slate-600" onClick={()=>setLocal(prev=>produce(prev,d=>{ const g=d.groups.find(x=>x.id===group.id); g.isCollapsed=!g.isCollapsed; }))}>
                        {group.isCollapsed?<ChevronRight className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
                        <span className="font-semibold ml-1">{group.name}</span>
                      </button>
                      <Button size="sm" className="ml-2" onClick={()=>setLocal(prev=>produce(prev,d=>{
                        const g=d.groups.find(x=>x.id===group.id); const row={id:`r_${Date.now()}`,data:{selected:false},comments:[],updates:[],files:[]}; d.columns.forEach(c=>row.data[c.id]=''); g.rows.unshift(row);
                      }))}><Plus className="w-4 h-4 mr-2"/>Ajouter</Button>
                    </div>
                  </TableCell>
                </TableRow>

                {!group.isCollapsed && group.rows.map((row,rowIndex)=>(
                  <DraggableRow key={row.id} row={row} rowIndex={rowIndex} group={group} moveRow={moveRow}>
                    {(dragHandle)=>(
                      <>
                        <TableCell style={{ width: board.gutterWidth, minWidth: board.gutterWidth, maxWidth: board.gutterWidth }}>
                          <div className="flex items-center gap-2">
                            <span ref={dragHandle} className="cursor-move inline-flex"><GripVertical className="w-4 h-4 text-slate-400"/></span>
                            <Checkbox checked={!!row.data?.selected} onCheckedChange={(v)=>setLocal(prev=>produce(prev,d=>{ const g=d.groups.find(x=>x.id===group.id); const r=g.rows.find(x=>x.id===row.id); r.data.selected=!!v; }))}/>
                          </div>
                        </TableCell>

                        {local.columns.map((col,colIndex)=>{
                          const val=(row.data||{})[col.id];
                          const startResize=(e)=>{ const sx=e.clientX, sw=local.columns[colIndex].width;
                            const move=(ev)=>setLocal(prev=>produce(prev,d=>{ d.columns[colIndex].width=Math.max(80, sw+(ev.clientX-sx)); }));
                            const up=()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
                            window.addEventListener('mousemove',move); window.addEventListener('mouseup',up); };

                          if(col.type==='status'){
                            return (
                              <TableCell key={col.id} style={{ width: col.width, minWidth: col.width, maxWidth: col.width }} className="relative pr-0">
                                <StatusCell value={val} onChange={(v)=>onUpdateCell(group.id,row.id,col.id,v)} options={col.options||[]} onOptionsChange={(opts)=>setLocal(prev=>produce(prev,d=>{ const c=d.columns.find(x=>x.id===col.id); if(c)c.options=opts; }))}/>
                                <div className="absolute top-0 right-[-1px] w-2 h-full cursor-col-resize z-10" onMouseDown={startResize}/>
                              </TableCell>
                            );
                          }
                          if(col.type==='user'){
                            return (
                              <TableCell key={col.id} style={{ width: col.width, minWidth: col.width, maxWidth: col.width }} className="relative pr-0">
                                <UserCell value={val} onChange={(v)=>onUpdateCell(group.id,row.id,col.id,v)} people={availablePeople} onPeopleChange={onAvailablePeopleChange}/>
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
    </>
  );
}

function AdminUsersButton({ usersInitial = [], availablePeople, onSave }) {
  const [open,setOpen]=useState(false);
  const [users,setUsers]=useState(()=> usersInitial.length?usersInitial:(availablePeople||[]).map(p=>({id:p.id,name:p.name,email:`${p.name?.toLowerCase()||'user'}@example.com`,color:p.color,access:{projects:true,crm:true,admin:false}})) );
  return (
    <>
      <Button variant="outline" onClick={()=>setOpen(true)}>Administration</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Administration — Utilisateurs & Droits</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {users.map((u,idx)=>(
              <div key={u.id||idx} className="border rounded p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={u.name} onChange={e=>setUsers(prev=>produce(prev,d=>{d[idx].name=e.target.value;}))} placeholder="Nom"/>
                  <Input value={u.email} onChange={e=>setUsers(prev=>produce(prev,d=>{d[idx].email=e.target.value;}))} placeholder="Email"/>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-600">Couleur</label>
                  <input type="color" className="h-8 w-10 p-0 border rounded" value={u.color} onChange={e=>setUsers(prev=>produce(prev,d=>{d[idx].color=e.target.value;}))}/>
                  <div className="ml-auto flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2"><Checkbox checked={!!u.access?.projects} onCheckedChange={v=>setUsers(prev=>produce(prev,d=>{d[idx].access.projects=!!v;}))}/> Projets</label>
                    <label className="flex items-center gap-2"><Checkbox checked={!!u.access?.crm} onCheckedChange={v=>setUsers(prev=>produce(prev,d=>{d[idx].access.crm=!!v;}))}/> CRM</label>
                    <label className="flex items-center gap-2"><Checkbox checked={!!u.access?.admin} onCheckedChange={v=>setUsers(prev=>produce(prev,d=>{d[idx].access.admin=!!v;}))}/> Admin</label>
                  </div>
                </div>
                <div className="flex justify-end"><Button variant="outline" onClick={()=>setUsers(prev=>prev.filter((_,i)=>i!==idx))}><Trash2 className="w-4 h-4 mr-2"/>Supprimer</Button></div>
              </div>
            ))}
            <Button variant="outline" onClick={()=>setUsers(prev=>[...prev,{id:`u_${Date.now()}`,name:'Nouvel utilisateur',email:'',color:'#94a3b8',access:{projects:true,crm:false,admin:false}}])}><Plus className="w-4 h-4 mr-1"/>Ajouter un utilisateur</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Fermer</Button>
            <Button onClick={()=>{ onSave?.(users); setOpen(false); }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Admin() {
  const [adminData,setAdminData]=useState(()=>loadData(LS_ADMIN_KEY, initialAdminData));
  const [activeTab,setActiveTab]=useState(adminData.boards[0]?.id||'boards');
  useEffect(()=>{ saveData(LS_ADMIN_KEY, adminData); },[adminData]);

  const handleBoardDataChange=(boardId,path,value)=>{
    setAdminData(produce(draft=>{
      const idx=draft.boards.findIndex(b=>b.id===boardId); if(idx===-1) return;
      if(path===''){ draft.boards[idx]=value; return; }
      let cur=draft.boards[idx]; const arr=Array.isArray(path)?path:[path];
      for(let i=0;i<arr.length-1;i++) cur=cur[arr[i]]; cur[arr[arr.length-1]]=value;
    }));
  };
  const handleGlobalDataChange=(path,value)=>{
    setAdminData(produce(draft=>{ const arr=Array.isArray(path)?path:[path]; let cur=draft; for(let i=0;i<arr.length-1;i++) cur=cur[arr[i]]; cur[arr[arr.length-1]]=value; }));
  };
  const handleAddBoard=()=>{
    const newBoard={ id:`board-${Date.now()}`, name:'Nouvel Espace', groups:[], columns:[{id:'element',title:'Élément',width:200,type:'text'}], gutterWidth:56 };
    setAdminData(produce(d=>{ d.boards.push(newBoard); })); setActiveTab(newBoard.id);
  };

  const activeBoard = adminData.boards.find(b=>b.id===activeTab);

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header"><h2>Espaces de travail</h2></div>
        <Tabs orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="folder-tabs-list">
            {adminData.boards.map(board=>(
              <TabsTrigger key={board.id} value={board.id} className="folder-tab-trigger">
                <span className="font-medium">{board.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button variant="ghost" onClick={handleAddBoard} className="mt-4 w-full justify-start"><Plus size={16} className="mr-2"/>Ajouter un espace</Button>
      </aside>

      <main className="admin-main-content">
        {activeBoard ? (
          <BoardView
            board={activeBoard}
            onDataChange={(path,value)=>handleBoardDataChange(activeBoard.id,path,value)}
            availablePeople={adminData.availablePeople}
            onAvailablePeopleChange={(value)=>handleGlobalDataChange('availablePeople',value)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500"><p>Sélectionnez ou créez un espace de travail.</p></div>
        )}
      </main>
    </div>
  );
}