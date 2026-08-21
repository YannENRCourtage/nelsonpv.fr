import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    Clock, 
    Plus, 
    MapPin, 
    User, 
    Bell, 
    CheckCircle2, 
    Filter, 
    Sparkles,
    Eye,
    Layers,
    Tag,
    List,
    LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    APPOINTMENT_TYPES, 
    REMINDER_OPTIONS,
    subscribeToUserAppointments, 
    createAppointment, 
    updateAppointment, 
    deleteAppointment 
} from '@/services/firebase/agenda.service.js';
import AppointmentModal from './AppointmentModal.jsx';

const MONTH_NAMES_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_NAMES_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 to 21:00

// Helper pour formater une date en YYYY-MM-DD
const formatDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Helper pour obtenir le lundi de la semaine d'une date
const getMondayOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // ajustement pour lundi premier jour
    return new Date(date.setDate(diff));
};

export default function AgendaView({ user, activeTenantId = 'green-invest', contacts = [] }) {
    // Vue active : 'day' | 'week' | 'month' | 'year'
    const [viewMode, setViewMode] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    
    // Filtre par catégorie
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Modal état
    const [showModal, setShowModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    // Hover tooltip state
    const [hoveredAppt, setHoveredAppt] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const userId = user?.uid || user?.id || 'demo_user';

    // Synchronisation des rendez-vous de l'utilisateur
    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToUserAppointments(userId, activeTenantId, (list) => {
            setAppointments(list);
        });
        return () => unsubscribe && unsubscribe();
    }, [userId, activeTenantId]);

    // Filtrage des rendez-vous
    const filteredAppointments = useMemo(() => {
        if (selectedCategory === 'all') return appointments;
        return appointments.filter(a => a.type === selectedCategory);
    }, [appointments, selectedCategory]);

    // Indexation des RDVs par date pour accès rapide
    const appointmentsByDate = useMemo(() => {
        const map = {};
        filteredAppointments.forEach(appt => {
            if (!map[appt.date]) map[appt.date] = [];
            map[appt.date].push(appt);
        });
        return map;
    }, [filteredAppointments]);

    // Navigation temporelle
    const handlePrev = () => {
        const d = new Date(currentDate);
        if (viewMode === 'day') d.setDate(d.getDate() - 1);
        else if (viewMode === 'week') d.setDate(d.getDate() - 7);
        else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
        else if (viewMode === 'year') d.setFullYear(d.getFullYear() - 1);
        setCurrentDate(d);
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        if (viewMode === 'day') d.setDate(d.getDate() + 1);
        else if (viewMode === 'week') d.setDate(d.getDate() + 7);
        else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
        else if (viewMode === 'year') d.setFullYear(d.getFullYear() + 1);
        setCurrentDate(d);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // Gestionnaires de changement de vue avec calage sur la date appropriée
    const handleSwitchView = (newView) => {
        setViewMode(newView);
        // Se positionne sur aujourd'hui / semaine / mois / année actuelle
        setCurrentDate(new Date());
    };

    // Création / Édition de RDV
    const handleOpenCreateModal = (dateStr = null, timeStr = '09:00') => {
        const targetDate = dateStr || formatDateKey(currentDate);
        setSelectedAppointment({
            title: '',
            date: targetDate,
            startTime: timeStr,
            endTime: `${String(parseInt(timeStr.split(':')[0], 10) + 1).padStart(2, '0')}:${timeStr.split(':')[1] || '00'}`,
            isAllDay: false,
            type: 'commercial',
            color: '#16a34a',
            contact: '',
            location: '',
            notes: '',
            reminder: '1h',
            completed: false,
        });
        setShowModal(true);
    };

    const handleOpenEditModal = (appt, e) => {
        e?.stopPropagation();
        setSelectedAppointment(appt);
        setShowModal(true);
    };

    const handleSaveAppointment = async (data) => {
        try {
            if (data.id && appointments.some(a => a.id === data.id)) {
                await updateAppointment(data.id, data, userId);
            } else {
                await createAppointment(data, userId, activeTenantId);
            }
        } catch (err) {
            console.error('Erreur sauvegarde RDV:', err);
        }
    };

    const handleDeleteAppointment = async (apptId) => {
        try {
            await deleteAppointment(apptId, userId);
        } catch (err) {
            console.error('Erreur suppression RDV:', err);
        }
    };

    // Hover Tooltip Handlers
    const handleMouseEnterAppt = (appt, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({
            x: Math.min(rect.left + rect.width / 2, window.innerWidth - 280),
            y: rect.top - 10,
        });
        setHoveredAppt(appt);
    };

    const handleMouseLeaveAppt = () => {
        setHoveredAppt(null);
    };

    // Libellé de la période affichée
    const headerTitle = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (viewMode === 'day') {
            const dayOfWeek = DAY_NAMES_FULL[(currentDate.getDay() + 6) % 7];
            return `${dayOfWeek} ${currentDate.getDate()} ${MONTH_NAMES_FR[month]} ${year}`;
        }
        if (viewMode === 'week') {
            const monday = getMondayOfWeek(currentDate);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            if (monday.getMonth() === sunday.getMonth()) {
                return `${monday.getDate()} - ${sunday.getDate()} ${MONTH_NAMES_FR[monday.getMonth()]} ${year}`;
            }
            return `${monday.getDate()} ${MONTH_NAMES_FR[monday.getMonth()]} - ${sunday.getDate()} ${MONTH_NAMES_FR[sunday.getMonth()]} ${year}`;
        }
        if (viewMode === 'month') {
            return `${MONTH_NAMES_FR[month]} ${year}`;
        }
        return `Année ${year}`;
    }, [viewMode, currentDate]);

    // =========================================================================
    // RENDU 1 : VUE MOIS (Lundi à Dimanche)
    // =========================================================================
    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // 0 = Lundi, 6 = Dimanche
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

        // Jours du mois précédent pour combler
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const days = [];

        // Cases mois précédent
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const prevDay = prevMonthLastDay - i;
            const dateStr = formatDateKey(new Date(year, month - 1, prevDay));
            days.push({ day: prevDay, dateStr, isCurrentMonth: false, isWeekend: days.length % 7 >= 5 });
        }

        // Cases mois actuel
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = formatDateKey(new Date(year, month, i));
            const dayOfWeekIndex = (startingDayOfWeek + i - 1) % 7;
            const isWeekend = dayOfWeekIndex >= 5; // 5 = Samedi, 6 = Dimanche
            days.push({ day: i, dateStr, isCurrentMonth: true, isWeekend });
        }

        // Cases mois suivant pour finir la grille (multiple de 7)
        const remaining = (7 - (days.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            const dateStr = formatDateKey(new Date(year, month + 1, i));
            days.push({ day: i, dateStr, isCurrentMonth: false, isWeekend: days.length % 7 >= 5 });
        }

        const todayStr = formatDateKey(new Date());

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* En-tête des jours (Lun -> Dim) */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
                    {DAY_NAMES_SHORT.map((name, idx) => {
                        const isWeekend = idx >= 5;
                        return (
                            <div 
                                key={name} 
                                className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${
                                    isWeekend ? 'text-amber-700 bg-amber-50/40' : 'text-slate-700'
                                }`}
                            >
                                {name}
                            </div>
                        );
                    })}
                </div>

                {/* Grille des jours */}
                <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
                    {days.map((cell, idx) => {
                        const dayAppts = appointmentsByDate[cell.dateStr] || [];
                        const isToday = cell.dateStr === todayStr;

                        return (
                            <div
                                key={idx}
                                onClick={() => handleOpenCreateModal(cell.dateStr)}
                                className={`min-h-[110px] p-2 transition-all cursor-pointer group flex flex-col justify-between ${
                                    !cell.isCurrentMonth 
                                        ? 'bg-slate-50/40 opacity-45' 
                                        : cell.isWeekend 
                                            ? 'bg-slate-50/70 hover:bg-amber-50/30' 
                                            : 'bg-white hover:bg-blue-50/30'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                                        isToday 
                                            ? 'bg-blue-600 text-white font-black shadow-sm' 
                                            : cell.isWeekend 
                                                ? 'text-amber-800' 
                                                : cell.isCurrentMonth 
                                                    ? 'text-slate-800' 
                                                    : 'text-slate-400'
                                    }`}>
                                        {cell.day}
                                    </span>
                                    {dayAppts.length > 0 && (
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {dayAppts.length} {dayAppts.length > 1 ? 'RDVs' : 'RDV'}
                                        </span>
                                    )}
                                </div>

                                {/* Liste des badges de rendez-vous */}
                                <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[75px] scrollbar-none">
                                    {dayAppts.slice(0, 3).map((appt) => (
                                        <div
                                            key={appt.id}
                                            onClick={(e) => handleOpenEditModal(appt, e)}
                                            onMouseEnter={(e) => handleMouseEnterAppt(appt, e)}
                                            onMouseLeave={handleMouseLeaveAppt}
                                            className="px-2 py-1 rounded-md text-[11px] font-semibold truncate flex items-center gap-1.5 shadow-xs transition-transform hover:scale-[1.02] text-white"
                                            style={{ backgroundColor: appt.color || '#2563eb' }}
                                        >
                                            <span className="text-[9px] opacity-90 shrink-0">
                                                {appt.isAllDay ? 'Journée' : appt.startTime}
                                            </span>
                                            <span className="truncate">{appt.title}</span>
                                        </div>
                                    ))}
                                    {dayAppts.length > 3 && (
                                        <div className="text-[10px] text-slate-500 font-semibold px-1">
                                            +{dayAppts.length - 3} de plus...
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // =========================================================================
    // RENDU 2 : VUE SEMAINE (Lundi à Dimanche, Grille 07h-21h)
    // =========================================================================
    const renderWeekView = () => {
        const monday = getMondayOfWeek(currentDate);
        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = formatDateKey(d);
            const isWeekend = i >= 5;
            const isToday = dateStr === formatDateKey(new Date());
            return { date: d, dateStr, isWeekend, isToday, name: DAY_NAMES_SHORT[i], fullName: DAY_NAMES_FULL[i] };
        });

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {/* Header Semaine */}
                <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/90 sticky top-0 z-10">
                    <div className="p-3 text-center text-xs font-bold text-slate-400 border-r border-slate-200">
                        Heure
                    </div>
                    {weekDays.map((col) => (
                        <div
                            key={col.dateStr}
                            className={`p-3 text-center border-r border-slate-200 last:border-r-0 ${
                                col.isToday 
                                    ? 'bg-blue-50/80 border-b-2 border-b-blue-600' 
                                    : col.isWeekend 
                                        ? 'bg-amber-50/40' 
                                        : 'bg-slate-50/50'
                            }`}
                        >
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                {col.name}
                            </div>
                            <div className={`text-sm font-black mt-0.5 inline-flex w-7 h-7 items-center justify-center rounded-full ${
                                col.isToday ? 'bg-blue-600 text-white shadow-sm' : col.isWeekend ? 'text-amber-900' : 'text-slate-900'
                            }`}>
                                {col.date.getDate()}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Corps de la grille horaire */}
                <div className="overflow-y-auto max-h-[620px] divide-y divide-slate-100">
                    {HOURS.map((hour) => {
                        const timeStr = `${String(hour).padStart(2, '0')}:00`;
                        return (
                            <div key={hour} className="grid grid-cols-8 min-h-[52px]">
                                {/* Colonne Horaire */}
                                <div className="p-2 text-right pr-3 text-xs font-bold text-slate-400 border-r border-slate-200 bg-slate-50/30 select-none">
                                    {timeStr}
                                </div>

                                {/* 7 Colonnes Jours */}
                                {weekDays.map((col) => {
                                    const dayAppts = (appointmentsByDate[col.dateStr] || []).filter(appt => {
                                        if (appt.isAllDay) return hour === 7;
                                        const apptHour = parseInt((appt.startTime || '09:00').split(':')[0], 10);
                                        return apptHour === hour;
                                    });

                                    return (
                                        <div
                                            key={col.dateStr}
                                            onClick={() => handleOpenCreateModal(col.dateStr, timeStr)}
                                            className={`p-1 border-r border-slate-100 last:border-r-0 relative transition-colors cursor-pointer group ${
                                                col.isWeekend 
                                                    ? 'bg-slate-50/60 hover:bg-amber-50/40' 
                                                    : 'bg-white hover:bg-blue-50/30'
                                            }`}
                                        >
                                            {dayAppts.map((appt) => (
                                                <div
                                                    key={appt.id}
                                                    onClick={(e) => handleOpenEditModal(appt, e)}
                                                    onMouseEnter={(e) => handleMouseEnterAppt(appt, e)}
                                                    onMouseLeave={handleMouseLeaveAppt}
                                                    className="p-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02] cursor-pointer mb-1"
                                                    style={{ backgroundColor: appt.color || '#2563eb' }}
                                                >
                                                    <div className="text-[10px] font-bold opacity-90 truncate">
                                                        {appt.isAllDay ? 'Journée' : `${appt.startTime} - ${appt.endTime}`}
                                                    </div>
                                                    <div className="font-bold truncate text-[11px]">{appt.title}</div>
                                                    {appt.contact && <div className="text-[9px] opacity-85 truncate">👤 {appt.contact}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // =========================================================================
    // RENDU 3 : VUE JOUR (Détail de la journée)
    // =========================================================================
    const renderDayView = () => {
        const dateStr = formatDateKey(currentDate);
        const dayAppts = appointmentsByDate[dateStr] || [];
        const isToday = dateStr === formatDateKey(new Date());

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className={`p-4 border-b border-slate-200 flex items-center justify-between ${isToday ? 'bg-blue-50/60' : 'bg-slate-50'}`}>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Planning de la journée
                        </span>
                        <h3 className="text-xl font-bold text-slate-900">{headerTitle}</h3>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => handleOpenCreateModal(dateStr)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Ajouter un RDV</span>
                    </Button>
                </div>

                <div className="overflow-y-auto max-h-[620px] divide-y divide-slate-100">
                    {HOURS.map((hour) => {
                        const timeStr = `${String(hour).padStart(2, '0')}:00`;
                        const hourAppts = dayAppts.filter(appt => {
                            if (appt.isAllDay) return hour === 7;
                            const apptHour = parseInt((appt.startTime || '09:00').split(':')[0], 10);
                            return apptHour === hour;
                        });

                        return (
                            <div 
                                key={hour} 
                                onClick={() => handleOpenCreateModal(dateStr, timeStr)}
                                className="grid grid-cols-12 min-h-[60px] hover:bg-blue-50/20 cursor-pointer transition-colors"
                            >
                                <div className="col-span-2 p-3 text-right pr-4 text-xs font-bold text-slate-400 border-r border-slate-200 bg-slate-50/40 select-none">
                                    {timeStr}
                                </div>
                                <div className="col-span-10 p-2 space-y-2">
                                    {hourAppts.map((appt) => (
                                        <div
                                            key={appt.id}
                                            onClick={(e) => handleOpenEditModal(appt, e)}
                                            onMouseEnter={(e) => handleMouseEnterAppt(appt, e)}
                                            onMouseLeave={handleMouseLeaveAppt}
                                            className="p-3 rounded-xl text-white shadow-md flex items-center justify-between transition-all hover:scale-[1.01]"
                                            style={{ backgroundColor: appt.color || '#2563eb' }}
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold bg-black/20 px-2 py-0.5 rounded-md">
                                                        {appt.isAllDay ? 'Journée' : `${appt.startTime} - ${appt.endTime}`}
                                                    </span>
                                                    <span className="font-bold text-sm">{appt.title}</span>
                                                </div>
                                                {appt.contact && (
                                                    <div className="text-xs opacity-90 flex items-center gap-1.5 pt-0.5">
                                                        <User className="w-3.5 h-3.5" />
                                                        <span>{appt.contact}</span>
                                                        {appt.location && <span>• 📍 {appt.location}</span>}
                                                    </div>
                                                )}
                                            </div>

                                            {appt.reminder && appt.reminder !== 'none' && (
                                                <div className="flex items-center gap-1 text-[11px] bg-black/20 px-2 py-1 rounded-lg">
                                                    <Bell className="w-3.5 h-3.5" />
                                                    <span>Rappel {REMINDER_OPTIONS.find(r => r.id === appt.reminder)?.label.split(' ')[0]}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // =========================================================================
    // RENDU 4 : VUE ANNÉE (12 Mois Miniatures)
    // =========================================================================
    const renderYearView = () => {
        const year = currentDate.getFullYear();

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {MONTH_NAMES_FR.map((monthName, mIdx) => {
                    const firstDay = new Date(year, mIdx, 1);
                    const lastDay = new Date(year, mIdx + 1, 0);
                    const daysInMonth = lastDay.getDate();
                    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

                    const days = [];
                    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
                    for (let i = 1; i <= daysInMonth; i++) days.push(i);

                    return (
                        <div 
                            key={monthName} 
                            className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                                    {monthName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">{year}</span>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center">
                                {DAY_NAMES_SHORT.map((d, i) => (
                                    <span key={d} className={`text-[9px] font-bold ${i >= 5 ? 'text-amber-700' : 'text-slate-400'}`}>
                                        {d[0]}
                                    </span>
                                ))}
                                {days.map((dayNum, dIdx) => {
                                    if (!dayNum) return <div key={dIdx} className="h-6" />;
                                    const dateStr = formatDateKey(new Date(year, mIdx, dayNum));
                                    const dayAppts = appointmentsByDate[dateStr] || [];
                                    const hasAppts = dayAppts.length > 0;
                                    const isWeekend = (dIdx % 7) >= 5;

                                    return (
                                        <button
                                            key={dIdx}
                                            type="button"
                                            onClick={() => {
                                                setCurrentDate(new Date(year, mIdx, dayNum));
                                                setViewMode('day');
                                            }}
                                            className={`h-6 text-[10px] font-medium rounded-md flex flex-col items-center justify-center relative transition-all ${
                                                hasAppts 
                                                    ? 'bg-blue-600 text-white font-bold shadow-xs' 
                                                    : isWeekend 
                                                        ? 'bg-slate-50 text-amber-800 hover:bg-amber-100' 
                                                        : 'text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span>{dayNum}</span>
                                            {hasAppts && (
                                                <span className="w-1 h-1 rounded-full bg-white absolute bottom-0.5" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            
            {/* Top Bar : Navigation & Sélecteur de vues */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                
                {/* Navigation Gauche (Précédent, Suivant, Aujourd'hui, Titre) */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrev}
                            className="h-9 w-9 text-slate-700 hover:bg-slate-100 rounded-xl"
                            title="Précédent"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNext}
                            className="h-9 w-9 text-slate-700 hover:bg-slate-100 rounded-xl"
                            title="Suivant"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToday}
                            className="h-9 text-xs font-bold text-slate-700 rounded-xl px-3 hover:bg-slate-100"
                        >
                            Aujourd'hui
                        </Button>
                    </div>

                    <h2 className="text-lg lg:text-xl font-black text-slate-900 capitalize tracking-tight ml-1">
                        {headerTitle}
                    </h2>
                </div>

                {/* Actions Droite : 4 Boutons de Vue (Jour, Semaine, Mois, Année) + Nouveau RDV */}
                <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end flex-wrap">
                    
                    {/* Les 4 boutons de vue demandés */}
                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => handleSwitchView('day')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'day'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Jour
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchView('week')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'week'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Semaine
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchView('month')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'month'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Mois
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchView('year')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'year'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Année
                        </button>
                    </div>

                    {/* Bouton Nouveau Rendez-vous */}
                    <Button
                        onClick={() => handleOpenCreateModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-9 px-3.5 gap-1.5 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouveau RDV</span>
                    </Button>
                </div>
            </div>

            {/* Légende / Filtre rapide par catégorie de couleur */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="text-slate-400 font-semibold text-[11px] shrink-0">Catégories :</span>
                <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all ${
                        selectedCategory === 'all' 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    Tous ({appointments.length})
                </button>
                {APPOINTMENT_TYPES.map(type => {
                    const count = appointments.filter(a => a.type === type.id).length;
                    const isSelected = selectedCategory === type.id;
                    return (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => setSelectedCategory(isSelected ? 'all' : type.id)}
                            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 flex items-center gap-1.5 transition-all border ${
                                isSelected 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                            <span>{type.label.split('/')[0]}</span>
                            {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
                        </button>
                    );
                })}
            </div>

            {/* Rendu dynamique de la vue sélectionnée */}
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'year' && renderYearView()}

            {/* Hover Tooltip Flottant résumant le RDV */}
            {hoveredAppt && (
                <div
                    className="fixed z-[999] pointer-events-none bg-slate-900 text-white rounded-xl p-3.5 shadow-2xl border border-slate-700 max-w-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hoveredAppt.color || '#2563eb' }} />
                        <h4 className="font-bold text-xs text-white leading-tight truncate">{hoveredAppt.title}</h4>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-0.5 pt-0.5">
                        <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span>{hoveredAppt.date} • {hoveredAppt.isAllDay ? 'Journée entière' : `${hoveredAppt.startTime} - ${hoveredAppt.endTime}`}</span>
                        </div>
                        {hoveredAppt.contact && (
                            <div className="flex items-center gap-1 text-slate-300">
                                <User className="w-3 h-3 text-emerald-400" />
                                <span>{hoveredAppt.contact}</span>
                            </div>
                        )}
                        {hoveredAppt.location && (
                            <div className="flex items-center gap-1 text-slate-300 truncate">
                                <MapPin className="w-3 h-3 text-rose-400" />
                                <span>{hoveredAppt.location}</span>
                            </div>
                        )}
                        {hoveredAppt.reminder && hoveredAppt.reminder !== 'none' && (
                            <div className="flex items-center gap-1 text-amber-400 text-[10px] pt-0.5">
                                <Bell className="w-3 h-3" />
                                <span>Rappel : {REMINDER_OPTIONS.find(r => r.id === hoveredAppt.reminder)?.label}</span>
                            </div>
                        )}
                    </div>

                    <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                        Cliquez pour modifier les détails
                    </div>
                </div>
            )}

            {/* Modal de Création / Modification de RDV */}
            <AppointmentModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedAppointment(null);
                }}
                appointment={selectedAppointment}
                onSave={handleSaveAppointment}
                onDelete={handleDeleteAppointment}
                contacts={contacts}
            />
        </div>
    );
}
