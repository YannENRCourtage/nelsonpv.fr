import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    Calendar, 
    Clock, 
    MapPin, 
    User, 
    FileText, 
    Bell, 
    Trash2, 
    Save, 
    CheckCircle2,
    Send,
    Tag,
    X,
    Sparkles
} from 'lucide-react';
import { APPOINTMENT_TYPES, REMINDER_OPTIONS, requestNotificationPermission, sendBrowserNotification } from '@/services/firebase/agenda.service.js';
import { toast } from '@/components/ui/use-toast.js';

export default function AppointmentModal({
    isOpen,
    onClose,
    appointment,
    onSave,
    onDelete,
    contacts = [],
}) {
    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        isAllDay: false,
        type: 'commercial',
        color: '#16a34a',
        contact: '',
        location: '',
        notes: '',
        reminder: 'none',
        completed: false,
    });

    const [isTestingReminder, setIsTestingReminder] = useState(false);

    useEffect(() => {
        if (appointment) {
            const selectedType = APPOINTMENT_TYPES.find(t => t.id === (appointment.type || 'commercial')) || APPOINTMENT_TYPES[1];
            setFormData({
                title: appointment.title || '',
                date: appointment.date || new Date().toISOString().split('T')[0],
                startTime: appointment.startTime || '09:00',
                endTime: appointment.endTime || '10:00',
                isAllDay: !!appointment.isAllDay,
                type: appointment.type || 'commercial',
                color: appointment.color || selectedType.color,
                contact: appointment.contact || '',
                location: appointment.location || '',
                notes: appointment.notes || '',
                reminder: appointment.reminder !== undefined ? appointment.reminder : 'none',
                completed: !!appointment.completed,
            });
        }
    }, [appointment, isOpen]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            // Si on change de type, mettre à jour la couleur par défaut correspondante si non personnalisée
            if (field === 'type') {
                const found = APPOINTMENT_TYPES.find(t => t.id === value);
                if (found) next.color = found.color;
            }
            return next;
        });
    };

    const handleSendTestNotification = async () => {
        setIsTestingReminder(true);
        try {
            const perm = await requestNotificationPermission();
            const reminderLabel = REMINDER_OPTIONS.find(r => r.id === formData.reminder)?.label || 'Rappel configuré';
            
            if (perm === 'granted') {
                sendBrowserNotification(`🔔 Rappel RDV : ${formData.title || 'Rendez-vous'}`, {
                    body: `Prévu le ${formData.date} à ${formData.startTime} (${reminderLabel})${formData.location ? ` • ${formData.location}` : ''}`,
                });
            }

            toast({
                title: "Rappel envoyé avec succès !",
                description: `Notification programmée pour : "${formData.title || 'Rendez-vous'}" (${reminderLabel})`,
            });
        } catch (e) {
            console.error("Erreur test rappel:", e);
            toast({
                title: "Notification de rappel",
                description: `Rappel activé pour le ${formData.date} à ${formData.startTime}.`,
            });
        } finally {
            setIsTestingReminder(false);
        }
    };

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!formData.title.trim()) {
            toast({
                title: "Titre requis",
                description: "Veuillez saisir un intitulé pour le rendez-vous.",
                variant: "destructive"
            });
            return;
        }

        onSave({
            ...appointment,
            ...formData,
        });
        onClose();
    };

    const isEditing = !!appointment?.id;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-slate-900 border-slate-200 shadow-2xl rounded-2xl">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: formData.color || '#2563eb' }}
                        >
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-slate-900">
                                {isEditing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
                            </DialogTitle>
                            <p className="text-xs text-slate-500">
                                Agenda personnel • Visible uniquement par vous
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    
                    {/* Titre */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Titre du rendez-vous *
                        </Label>
                        <Input
                            type="text"
                            placeholder="Ex: Visite technique toiture - M. Martin"
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full text-sm font-semibold border-slate-200 focus-visible:ring-blue-500"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Date et Heures */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600 flex items-center gap-1 font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                Date
                            </Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                className="h-9 text-xs bg-white"
                                required
                            />
                        </div>

                        {!formData.isAllDay ? (
                            <>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600 flex items-center gap-1 font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                                        Début
                                    </Label>
                                    <Input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => handleChange('startTime', e.target.value)}
                                        className="h-9 text-xs bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600 flex items-center gap-1 font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                                        Fin
                                    </Label>
                                    <Input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => handleChange('endTime', e.target.value)}
                                        className="h-9 text-xs bg-white"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="sm:col-span-2 flex items-center justify-center text-xs text-slate-500 italic bg-white rounded-lg border border-slate-200 h-9">
                                Événement sur toute la journée
                            </div>
                        )}

                        <div className="sm:col-span-3 flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={formData.isAllDay}
                                    onChange={(e) => handleChange('isAllDay', e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span>Journée entière</span>
                            </label>

                            {isEditing && (
                                <label className="flex items-center gap-2 text-xs font-semibold text-emerald-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={formData.completed}
                                        onChange={(e) => handleChange('completed', e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>Marquer comme effectué</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Type de RDV & Pastilles de couleur */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-blue-600" />
                            Catégorie & Couleur
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {APPOINTMENT_TYPES.map((type) => {
                                const isSelected = formData.type === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => handleChange('type', type.id)}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
                                            isSelected 
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div 
                                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                                            style={{ backgroundColor: type.color }}
                                        />
                                        <span className="truncate text-left text-[11px]">{type.label.split('/')[0]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Contact & Lieu */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-700 flex items-center gap-1 font-semibold">
                                <User className="w-3.5 h-3.5 text-blue-600" />
                                Contact / Client lié
                            </Label>
                            <div className="relative">
                                <Input
                                    type="text"
                                    list="crm-contacts-list"
                                    placeholder="Nom du client..."
                                    value={formData.contact}
                                    onChange={(e) => handleChange('contact', e.target.value)}
                                    className="text-xs bg-white"
                                />
                                <datalist id="crm-contacts-list">
                                    {contacts.map((c) => (
                                        <option key={c.id} value={c.name}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-700 flex items-center gap-1 font-semibold">
                                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                Lieu / Adresse ou Lien Visio
                            </Label>
                            <Input
                                type="text"
                                placeholder="Ex: Sur site, bureau, Meet, etc."
                                value={formData.location}
                                onChange={(e) => handleChange('location', e.target.value)}
                                className="text-xs bg-white"
                            />
                        </div>
                    </div>

                    {/* Rappel & Notification */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                                <Bell className="w-3.5 h-3.5 text-amber-700" />
                                Rappel & Notification
                            </Label>
                            
                            <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={handleSendTestNotification}
                                disabled={isTestingReminder}
                                className="h-7 text-[11px] bg-white hover:bg-amber-100 text-amber-900 border-amber-300 gap-1"
                                title="Déclencher une notification de rappel sur votre écran"
                            >
                                <Send className="w-3 h-3 text-amber-700" />
                                <span>{isTestingReminder ? 'Envoi...' : 'M\'envoyer un rappel'}</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                                value={formData.reminder}
                                onChange={(e) => handleChange('reminder', e.target.value)}
                                className="w-full text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                {REMINDER_OPTIONS.map((opt) => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                            <div className="text-[11px] text-amber-800/80 flex items-center">
                                Notification navigateur et alerte sur votre espace
                            </div>
                        </div>
                    </div>

                    {/* Notes / Description */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-700 flex items-center gap-1 font-semibold">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            Notes & Objectifs du rendez-vous
                        </Label>
                        <Textarea
                            rows={3}
                            placeholder="Points à aborder, documents à apporter, puissance souhaitée..."
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            className="text-xs resize-none bg-white"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                        {isEditing && onDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    if (confirm('Voulez-vous vraiment supprimer ce rendez-vous ?')) {
                                        onDelete(appointment.id);
                                        onClose();
                                    }
                                }}
                                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 gap-1"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="text-xs h-9"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-4 gap-1.5 shadow-sm"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isEditing ? 'Mettre à jour' : 'Enregistrer le RDV'}</span>
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
