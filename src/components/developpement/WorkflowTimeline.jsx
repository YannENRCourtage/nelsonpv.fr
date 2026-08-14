import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, FileText, Building, Scale, Eye, Briefcase, TrendingUp, Zap, 
  Plug, FileSignature, Hammer, Sun, Plus, Trash2, Play, Circle, 
  CheckCircle, Clock, Calendar, Check, AlertCircle, X, ChevronRight,
  MessageSquare, Paperclip, Upload, Download, Send, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ICON_MAP = {
  'MapPin': MapPin, 'FileText': FileText, 'Building': Building, 'Scale': Scale,
  'Eye': Eye, 'Briefcase': Briefcase, 'TrendingUp': TrendingUp, 'Zap': Zap,
  'Plug': Plug, 'FileSignature': FileSignature, 'Hammer': Hammer, 'Sun': Sun,
};

const formatDate = (date) => {
  if (!date) return '—';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getStatusConfig = (status) => {
  switch (status) {
    case 'completed':
      return {
        badge: 'bg-emerald-100 text-emerald-700',
        label: 'Terminée',
        border: 'border-l-emerald-500',
        icon: <CheckCircle className="w-5 h-5 text-white" />,
        connector: 'bg-emerald-500 border-emerald-500',
      };
    case 'in_progress':
      return {
        badge: 'bg-amber-100 text-amber-700',
        label: 'En cours',
        border: 'border-l-amber-500',
        icon: <Play className="w-4 h-4 text-white fill-current" />,
        connector: 'bg-amber-500 border-amber-500 ring-4 ring-amber-500/20 animate-pulse',
      };
    case 'pending':
    default:
      return {
        badge: 'bg-gray-100 text-gray-600',
        label: 'En attente',
        border: 'border-l-gray-200',
        icon: <Circle className="w-4 h-4 text-gray-400" />,
        connector: 'bg-white border-gray-300 border-2',
      };
  }
};

const getActionConfig = (stepType, stepLabel) => {
  const type = (stepType || '').toLowerCase();
  const label = (stepLabel || '').toLowerCase();

  if (type.includes('urbanisme') || label.includes('urbanisme') || label.includes('cu') || label.includes('dp') || label.includes('pc')) {
    return { label: 'Générer dossier', style: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0', actionType: 'generate_urbanisme' };
  }
  if (type.includes('mandat') || label.includes('mandat') || label.includes('géomètre') || label.includes('notaire') || label.includes('huissier')) {
    return { label: 'Mandater', style: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0', actionType: 'mandater' };
  }
  if (type.includes('t0') || label.includes('t0') || label.includes('tarif')) {
    return { label: 'Calculer tarif', style: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0', actionType: 'calculate_t0' };
  }
  if (type.includes('raccordement') || label.includes('raccordement') || label.includes('enedis')) {
    return { label: 'Demande raccordement', style: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0', actionType: 'raccordement_request' };
  }
  if (type.includes('travaux') || label.includes('travaux')) {
    return { label: 'Suivi travaux', style: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0', actionType: 'track_travaux' };
  }
  return null;
};

/**
 * Sub-component to manage per-step comments and file attachments
 */
function StepSidePanel({ step, onUpdateStep }) {
  const [newComment, setNewComment] = useState('');
  const fileInputRef = useRef(null);

  const comments = step.comments || [];
  const attachments = step.attachments || [];

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const commentObj = {
      id: `c_${Date.now()}`,
      text: newComment,
      date: new Date().toISOString(),
      author: 'Utilisateur'
    };
    const updatedComments = [...comments, commentObj];
    onUpdateStep({ ...step, comments: updatedComments });
    setNewComment('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileObj = {
        id: `f_${Date.now()}`,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        dataUrl: event.target.result,
        date: new Date().toLocaleDateString('fr-FR')
      };
      const updatedAttachments = [...attachments, fileObj];
      onUpdateStep({ ...step, attachments: updatedAttachments });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (fileId) => {
    const updated = attachments.filter(f => f.id !== fileId);
    onUpdateStep({ ...step, attachments: updated });
  };

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col gap-4 text-xs h-full">
      {/* Attachments Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
            <Paperclip className="w-3.5 h-3.5 text-blue-600" />
            Documents & Pièces ({attachments.length})
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all text-[11px] shadow-sm"
          >
            <Upload className="w-3 h-3" />
            Charger
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
          />
        </div>

        {attachments.length === 0 ? (
          <div className="text-slate-400 italic text-[11px] py-2 text-center bg-white/50 rounded-lg border border-dashed border-slate-200">
            Aucune pièce jointe pour cette étape
          </div>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {attachments.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-slate-700 group hover:border-blue-300">
                <div className="flex items-center gap-2 truncate mr-2">
                  <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">({file.size})</span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={file.dataUrl}
                    download={file.name}
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Télécharger"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    title="Supprimer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step Comments Section */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[11px] tracking-wide mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            Commentaires de l'étape ({comments.length})
          </span>

          {comments.length === 0 ? (
            <p className="text-slate-400 italic text-[11px] py-2 text-center bg-white/50 rounded-lg border border-dashed border-slate-200">
              Aucun commentaire pour cette étape
            </p>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto mb-3">
              {comments.map((c) => (
                <div key={c.id} className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-slate-700">{c.author}</span>
                    <span>{new Date(c.date).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input New Comment */}
        <div className="flex gap-1.5 mt-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Ajouter une note..."
            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <button
            onClick={handleAddComment}
            className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title="Envoyer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowTimeline({
  steps = [],
  onStepStatusChange,
  onStepAction,
  onAddStep,
  onRemoveStep,
  onReorderSteps,
  onOpenAddDemarche,
  workflowName = 'Développement Projet',
  projectType = 'Bâtiment Solaire'
}) {
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepType, setNewStepType] = useState('Autre');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [localSteps, setLocalSteps] = useState(steps);

  // Sync with prop
  React.useEffect(() => {
    setLocalSteps(steps);
  }, [steps]);

  // Progress calculation: CU is optional and does not penalize overall progress when uncompleted
  const countableSteps = localSteps.filter(s => (s.id !== 'cu' && !s.optional) || s.status === 'completed');
  const totalSteps = countableSteps.length;
  const completedSteps = countableSteps.filter(s => s.status === 'completed').length;
  const inProgressSteps = countableSteps.filter(s => s.status === 'in_progress').length;
  const pendingSteps = countableSteps.filter(s => s.status === 'pending').length;
  const progressPercentage = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

  const handleUpdateStepLocal = (updatedStep) => {
    setLocalSteps(prev => prev.map(s => s.id === updatedStep.id ? updatedStep : s));
  };

  const handleAddStep = () => {
    if (!newStepName.trim()) return;
    if (onAddStep) {
      onAddStep({
        label: newStepName,
        type: newStepType,
        icon: 'Briefcase',
        status: 'pending'
      });
    }
    setNewStepName('');
    setIsAddingStep(false);
  };

  // Drag and Drop step reordering
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData('text/plain'));
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;

    const newSteps = [...localSteps];
    const [draggedItem] = newSteps.splice(dragIndex, 1);
    newSteps.splice(dropIndex, 0, draggedItem);

    const reordered = newSteps.map((item, idx) => ({ ...item, order: idx + 1 }));
    setLocalSteps(reordered);
    if (onReorderSteps) onReorderSteps(reordered);
  };

  return (
    <div className="w-full mx-auto py-6 space-y-6">
      {/* Header & Progress Summary */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">{workflowName}</h2>
            <p className="text-sm text-slate-500 mt-1">Type de projet: <strong className="text-slate-700">{projectType}</strong></p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-blue-600">{progressPercentage}%</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avancement Global</div>
          </div>
        </div>

        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 text-sm font-semibold">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 text-xs">
              <CheckCircle className="w-4 h-4" /> {completedSteps} terminées
            </span>
            <span className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 text-xs">
              <Play className="w-4 h-4" /> {inProgressSteps} en cours
            </span>
            <span className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-xs">
              <Circle className="w-4 h-4" /> {pendingSteps} en attente
            </span>
          </div>

          <button
            onClick={() => onOpenAddDemarche ? onOpenAddDemarche() : setIsAddingStep(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all text-xs cursor-pointer hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Ajouter une démarche
          </button>
        </div>
      </div>

      {/* Timeline with 2-column layout per step */}
      <div className="relative pl-6 md:pl-10 space-y-6">
        {/* Main vertical line */}
        <div className="absolute top-0 bottom-0 left-[22px] md:left-[38px] w-[3px] bg-gradient-to-b from-emerald-400 via-blue-400 to-slate-200 rounded-full z-0 opacity-60" />

        <div className="relative z-10 space-y-6">
          <AnimatePresence>
            {localSteps.map((step, index) => {
              const statusConfig = getStatusConfig(step.status);
              const StepIcon = ICON_MAP[step.icon] || Briefcase;
              const actionConfig = getActionConfig(step.type, step.label);
              const isOptional = step.id === 'cu' || step.optional === true;

              return (
                <motion.div 
                  key={step.id || index}
                  layout
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative flex items-start group cursor-grab active:cursor-grabbing"
                >
                  {/* Connector Badge */}
                  <div className={`absolute -left-6 md:-left-10 mt-5 w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 z-20 shadow-sm ${statusConfig.connector}`}>
                    {statusConfig.icon}
                  </div>

                  {/* 2-Column Grid Layout: Left Workflow Step, Right Side Panel */}
                  <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all p-5 border-l-4 ${statusConfig.border}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* LEFT COLUMN (7 Cols): Step details & status actions */}
                      <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                        <div>
                          {/* Title & Status */}
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="flex items-center gap-1 text-slate-300 hover:text-slate-500 cursor-grab">
                              <span className="text-xs font-bold font-mono">⋮⋮</span>
                            </div>
                            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-700">
                              <StepIcon className="w-4 h-4" />
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                              <span className="text-slate-400 text-sm font-normal">#{index + 1}</span>
                              {step.label}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusConfig.badge}`}>
                              {statusConfig.label}
                            </span>
                            {isOptional && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                Optionnel
                              </span>
                            )}
                          </div>

                          {step.description && (
                            <p className="text-sm text-slate-600 mb-3">
                              {step.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mb-3">
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Début: {formatDate(step.startDate)}</span>
                            </div>
                            {step.endDate && (
                              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-100">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Fin: {formatDate(step.endDate)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step Action Controls */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                          {/* Status cycle icons */}
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            <button 
                              onClick={() => onStepStatusChange && onStepStatusChange(step.id, 'pending')}
                              title="Mettre en attente"
                              className={`p-1.5 rounded-lg transition-all ${step.status === 'pending' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                              <Circle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onStepStatusChange && onStepStatusChange(step.id, 'in_progress')}
                              title="Mettre en cours"
                              className={`p-1.5 rounded-lg transition-all ${step.status === 'in_progress' ? 'bg-white shadow text-amber-600 font-bold' : 'text-slate-400 hover:text-amber-600'}`}
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onStepStatusChange && onStepStatusChange(step.id, 'completed')}
                              title="Marquer comme terminée"
                              className={`p-1.5 rounded-lg transition-all ${step.status === 'completed' ? 'bg-white shadow text-emerald-600 font-bold' : 'text-slate-400 hover:text-emerald-600'}`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {actionConfig && onStepAction && (
                              <Button 
                                size="sm" 
                                className={`shadow-sm font-semibold rounded-xl text-xs ${actionConfig.style}`}
                                onClick={() => onStepAction(step.id, actionConfig.actionType)}
                              >
                                {actionConfig.label}
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            )}
                            
                            {/* Delete */}
                            {deleteConfirm === step.id ? (
                              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                                <button 
                                  onClick={() => {
                                    if (onRemoveStep) onRemoveStep(step.id);
                                    setDeleteConfirm(null);
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Confirmer la suppression"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirm(null)}
                                  className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                                  title="Annuler"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setDeleteConfirm(step.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Supprimer l'étape"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT COLUMN (5 Cols): Step Side Panel (Documents & Step Comments) */}
                      <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-5">
                        <StepSidePanel step={step} onUpdateStep={handleUpdateStepLocal} />
                      </div>

                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add Step Card */}
          <motion.div layout>
            {isAddingStep ? (
              <div className="bg-white rounded-2xl shadow-sm border border-blue-200 p-5">
                <h4 className="font-bold text-slate-800 mb-4">Nouvelle étape de workflow</h4>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input 
                      placeholder="Intitulé de l'étape..." 
                      value={newStepName}
                      onChange={(e) => setNewStepName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <select 
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      value={newStepType}
                      onChange={(e) => setNewStepType(e.target.value)}
                    >
                      <option value="Autre">Autre</option>
                      <option value="Urbanisme">Urbanisme</option>
                      <option value="Mandatement">Mandatement</option>
                      <option value="Technique">Technique</option>
                      <option value="Raccordement">Raccordement</option>
                      <option value="Travaux">Travaux</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddStep} className="bg-blue-600 hover:bg-blue-700">
                      Ajouter
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingStep(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingStep(true)}
                className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-5 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-600"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm">Ajouter une étape personnalisée</span>
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
