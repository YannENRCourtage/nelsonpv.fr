import React, { useState, useEffect, useMemo } from 'react';
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
    LayoutGrid,
    Flame,
    PhoneCall,
    Briefcase,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    APPOINTMENT_TYPES, 
    REMINDER_OPTIONS,
    subscribeToUserAppointments, 
    createAppointment, 
    updateAppointment, 
    deleteAppointment,
    getLocalAppointments,
    normalizeDateString
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
    return normalizeDateString(date);
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
    
    const userId = user?.uid || user?.id || user?.email || 'default_user';
    const [appointments, setAppointments] = useState(() => getLocalAppointments(userId, activeTenantId));
    
    // Filtre par catégorie
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Modal état
    const [showModal, setShowModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    // Hover tooltip state
    const [hoveredAppt, setHoveredAppt] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Synchronisation temps réel des rendez-vous
    useEffect(() => {
        const unsubscribe = subscribeToUserAppointments(userId, activeTenantId, (list) => {
            if (list) {
                setAppointments(list);
            }
        });
        return () => unsubscribe && unsubscribe();
    }, [userId, activeTenantId]);

    // Filtrage des rendez-vous
    const filteredAppointments = useMemo(() => {
        if (selectedCategory === 'all') return appointments;
        return appointments.filter(a => a.type === selectedCategory);
    }, [appointments, selectedCategory]);

    // Indexation des RDVs par date normalisée (YYYY-MM-DD) pour accès immédiat
    const appointmentsByDate = useMemo(() => {
        const map = {};
        filteredAppointments.forEach(appt => {
            const dateKey = formatDateKey(appt.date);
            if (!dateKey) return;
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(appt);
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

    // Gestionnaires de changement de vue
    const handleSwitchView = (newView) => {
        setViewMode(newView);
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

    // Sauvegarde immédiate et synchrone du RDV pour affichage instantané
    const handleSaveAppointment = async (data) => {
        const normalizedDate = formatDateKey(data.date) || formatDateKey(new Date());
        const cleanedData = {
            ...data,
            date: normalizedDate,
        };

        try {
            if (cleanedData.id && appointments.some(a => a.id === cleanedData.id)) {
                // Mise à jour optimiste immédiate dans le state React
                setAppointments(prev => prev.map(a => a.id === cleanedData.id ? { ...a, ...cleanedData } : a));
                await updateAppointment(cleanedData.id, cleanedData, userId, activeTenantId);
            } else {
                const tempId = cleanedData.id || `rdv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                const newAppt = {
                    ...cleanedData,
                    id: tempId,
                    userId,
                    tenantId: activeTenantId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                
                // Ajout optimiste immédiat dans le state React
                setAppointments(prev => [newAppt, ...prev.filter(a => a.id !== tempId)]);
                await createAppointment(newAppt, userId, activeTenantId);
            }
        } catch (err) {
            console.error('Erreur sauvegarde RDV:', err);
        }
    };

    const handleDeleteAppointment = async (apptId) => {
        try {
            // Suppression optimiste immédiate
            setAppointments(prev => prev.filter(a => a.id !== apptId));
            await deleteAppointment(apptId, userId, activeTenantId);
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
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                {/* En-tête des jours (Lun -> Dim) avec dégradé subtil */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-gradient-to-r from-slate-100 via-blue-50/40 to-amber-50/50">
                    {DAY_NAMES_SHORT.map((name, idx) => {
                        const isWeekend = idx >= 5;
                        return (
                            <div 
                                key={name} 
                                className={`py-2.5 sm:py-3.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                                    isWeekend 
                                        ? 'text-amber-800 bg-amber-100/50 border-l border-amber-200/50' 
                                        : 'text-slate-700'
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
                                className={`min-h-[85px] sm:min-h-[118px] p-1 sm:p-2 transition-all cursor-pointer group flex flex-col justify-between ${
                                    !cell.isCurrentMonth 
                                        ? 'bg-slate-50/40 opacity-40' 
                                        : cell.isWeekend 
                                            ? 'bg-amber-50/30 hover:bg-amber-100/40' 
                                            : 'bg-white hover:bg-blue-50/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-[11px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full transition-all ${
                                        isToday 
                                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black shadow-md shadow-blue-500/30 ring-2 ring-blue-300' 
                                            : cell.isWeekend 
                                                ? 'text-amber-900 font-extrabold' 
                                                : cell.isCurrentMonth 
                                                    ? 'text-slate-800' 
                                                    : 'text-slate-400'
                                    }`}>
                                        {cell.day}
                                    </span>
                                    {dayAppts.length > 0 && (
                                        <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700">
                                            {dayAppts.length}
                                        </span>
                                    )}
                                </div>

                                {/* Liste des badges de rendez-vous avec support mobile */}
                                <div className="space-y-1 sm:space-y-1.5 mt-1 sm:mt-1.5 flex-1 overflow-y-auto max-h-[60px] sm:max-h-[82px] scrollbar-none">
                                    {dayAppts.slice(0, 3).map((appt) => (
                                        <div
                                            key={appt.id}
                                            onClick={(e) => handleOpenEditModal(appt, e)}
                                            onMouseEnter={(e) => handleMouseEnterAppt(appt, e)}
                                            onMouseLeave={handleMouseLeaveAppt}
                                            className="px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold truncate flex items-center gap-1 sm:gap-1.5 shadow-xs transition-all hover:scale-[1.02] text-white border border-white/20"
                                            style={{ 
                                                backgroundColor: appt.color || '#2563eb',
                                                boxShadow: `0 2px 6px ${appt.color ? `${appt.color}40` : 'rgba(37,99,235,0.25)'}`
                                            }}
                                        >
                                            <span className="text-[8px] sm:text-[9px] font-extrabold bg-black/25 px-1 py-0.2 rounded shrink-0">
                                                {appt.isAllDay ? 'Jour' : appt.startTime}
                                            </span>
                                            <span className="truncate">{appt.title}</span>
                                        </div>
                                    ))}
                                    {dayAppts.length > 3 && (
                                        <div className="text-[9px] sm:text-[10px] text-blue-600 font-bold px-1 py-0.2 rounded bg-blue-50 text-center">
                                            +{dayAppts.length - 3} de plus
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
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <div className="min-w-[650px] sm:min-w-0">
                        {/* Header Semaine avec puces colorées */}
                        <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                            <div className="p-3 text-center text-xs font-black text-slate-400 border-r border-slate-200 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-slate-400 mr-1" />
                                <span>Heure</span>
                            </div>
                            {weekDays.map((col) => (
                                <div
                                    key={col.dateStr}
                                    className={`p-2.5 sm:p-3 text-center border-r border-slate-200 last:border-r-0 ${
                                        col.isToday 
                                            ? 'bg-blue-50/90 border-b-2 border-b-blue-600 ring-1 ring-blue-200' 
                                            : col.isWeekend 
                                                ? 'bg-amber-50/60' 
                                                : 'bg-slate-50/60'
                                    }`}
                                >
                                    <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                                        {col.name}
                                    </div>
                                    <div className={`text-sm font-black mt-1 inline-flex w-7 h-7 sm:w-8 sm:h-8 items-center justify-center rounded-full transition-all ${
                                        col.isToday 
                                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-300' 
                                            : col.isWeekend 
                                                ? 'bg-amber-100 text-amber-900 font-extrabold' 
                                                : 'text-slate-900'
                                    }`}>
                                        {col.date.getDate()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Corps de la grille horaire */}
                        <div className="overflow-y-auto max-h-[640px] divide-y divide-slate-100">
                            {HOURS.map((hour) => {
                                const timeStr = `${String(hour).padStart(2, '0')}:00`;
                                return (
                                    <div key={hour} className="grid grid-cols-8 min-h-[58px]">
                                        {/* Colonne Horaire */}
                                        <div className="p-2 text-right pr-3 text-xs font-extrabold text-slate-400 border-r border-slate-200 bg-slate-50/40 select-none flex items-center justify-end">
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
                                                    className={`p-1.5 border-r border-slate-100 last:border-r-0 relative transition-colors cursor-pointer group ${
                                                        col.isWeekend 
                                                            ? 'bg-amber-50/20 hover:bg-amber-100/30' 
                                                            : 'bg-white hover:bg-blue-50/40'
                                                    }`}
                                                >
                                                    {dayAppts.map((appt) => (
                                                        <div
                                                            key={appt.id}
                                                            onClick={(e) => handleOpenEditModal(appt, e)}
                                                            onMouseEnter={(e) => handleMouseEnterAppt(appt, e)}
                                                            onMouseLeave={handleMouseLeaveAppt}
                                                            className="p-1.5 sm:p-2 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-[1.03] cursor-pointer mb-1 border border-white/20"
                                                            style={{ 
                                                                backgroundColor: appt.color || '#2563eb',
                                                                boxShadow: `0 3px 8px ${appt.color ? `${appt.color}45` : 'rgba(37,99,235,0.3)'}`
                                                            }}
                                                        >
                                                            <div className="text-[9px] sm:text-[10px] font-black bg-black/20 px-1 py-0.2 rounded inline-block mb-0.5">
                                                                {appt.isAllDay ? 'Journée' : `${appt.startTime} - ${appt.endTime}`}
                                                            </div>
                                                            <div className="font-extrabold truncate text-[10px] sm:text-[11px] leading-tight">{appt.title}</div>
                                                            {appt.contact && <div className="text-[9px] sm:text-[10px] opacity-90 truncate mt-0.5">👤 {appt.contact}</div>}
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
                </div>
            </div>
        );
    };

    // =========================================================================
    // RENDU 3 : VUE JOUR (Détail de la journée avec bandeau héro coloré)
    // =========================================================================
    const renderDayView = () => {
        const dateStr = formatDateKey(currentDate);
        const dayAppts = appointmentsByDate[dateStr] || [];
        const isToday = dateStr === formatDateKey(new Date());

        return (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                {/* Hero Header coloré */}
                <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-sm">
                                {isToday ? "Aujourd'hui" : 'Planning de la journée'}
                            </span>
                            <span className="text-xs font-bold bg-black/20 px-2 py-1 rounded-full text-white/90">
                                {dayAppts.length} {dayAppts.length > 1 ? 'rendez-vous' : 'rendez-vous'}
                            </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1 capitalize tracking-tight">
                            {headerTitle}
                        </h3>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => handleOpenCreateModal(dateStr)}
                        className="bg-white hover:bg-slate-100 text-blue-700 text-xs font-black gap-1.5 shadow-lg rounded-xl h-9 sm:h-10 px-4"
                    >
                        <Plus className="w-4 h-4 text-blue-600" />
                        <span>Nouveau RDV</span>
                    </Button>
                </div>

                {/* Corps de la journée */}
                <div className="overflow-y-auto max-h-[640px] divide-y divide-slate-100">
                    {HOURS.map((hour) => {
                        const timeStr = `${String(hour).padStart(2, '0')}:00`;
                        const hourAppts = dayAppts.filter(appt => {
                            if (appt.isAllDay) return hour === 7;
                            const startH = parseInt((appt.startTime || '09:00').split(':')[0], 10);
                            return startH === hour;
                        });

                        return (
                            <div 
                                key={hour} 
                                onClick={() => handleOpenCreateModal(dateStr, timeStr)}
                                className="grid grid-cols-12 min-h-[66px] hover:bg-blue-50/30 cursor-pointer transition-colors"
                            >
                                <div className="col-span-3 sm:col-span-2 p-2 sm:p-3 text-right pr-2 sm:pr-4 text-xs font-black text-slate-400 border-r border-slate-200 bg-slate-50/50 select-none flex items-center justify-end">
                                    {timeStr}
                                </div>
                                <div className="col-span-9 sm:col-span-10 p-2 sm:p-2.5 space-y-2">
                                    {hourAppts.map((appt) => (
                                        <div
                                            key={appt.id}
                                            onClick={(e) => handleOpenEditModal(appt, e)}
                                            onMouseEnter={(e) => handleMouseEnterAppt(appt, e)}
                                            onMouseLeave={handleMouseLeaveAppt}
                                            className="p-3 sm:p-3.5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all hover:scale-[1.01] border border-white/20"
                                            style={{ 
                                                backgroundColor: appt.color || '#2563eb',
                                                boxShadow: `0 4px 12px ${appt.color ? `${appt.color}40` : 'rgba(37,99,235,0.3)'}`
                                            }}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                                                    <span className="text-[11px] sm:text-xs font-black bg-black/25 px-2 sm:px-2.5 py-0.5 rounded-lg">
                                                        {appt.isAllDay ? 'Journée' : `${appt.startTime} - ${appt.endTime}`}
                                                    </span>
                                                    <span className="font-black text-sm sm:text-base">{appt.title}</span>
                                                </div>
                                                {appt.contact && (
                                                    <div className="text-xs opacity-95 flex items-center gap-2 pt-0.5 flex-wrap">
                                                        <span className="bg-white/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                            <User className="w-3.5 h-3.5" />
                                                            <span>{appt.contact}</span>
                                                        </span>
                                                        {appt.location && (
                                                            <span className="bg-white/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                <span>{appt.location}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {appt.reminder && appt.reminder !== 'none' && (
                                                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold bg-black/25 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl self-end sm:self-auto">
                                                    <Bell className="w-3.5 h-3.5 text-amber-300" />
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
                            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-md hover:shadow-xl transition-all"
                        >
                            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
                                <span className="font-black text-xs text-blue-950 uppercase tracking-wide">
                                    {monthName}
                                </span>
                                <span className="text-[10px] text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded-full">{year}</span>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center">
                                {DAY_NAMES_SHORT.map((d, i) => (
                                    <span key={d} className={`text-[9px] font-black ${i >= 5 ? 'text-amber-800' : 'text-slate-400'}`}>
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
                                            className={`h-6 text-[10px] font-bold rounded-lg flex flex-col items-center justify-center relative transition-all ${
                                                hasAppts 
                                                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black shadow-sm ring-1 ring-blue-300' 
                                                    : isWeekend 
                                                        ? 'bg-amber-50 text-amber-900 hover:bg-amber-200' 
                                                        : 'text-slate-700 hover:bg-blue-50'
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
        <div className="space-y-4 sm:space-y-6">
            
            {/* Top Bar : Navigation & Sélecteur de vues avec design moderne et coloré */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-3 sm:p-4 flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4">
                
                {/* Navigation Gauche */}
                <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-start">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrev}
                            className="h-8 w-8 sm:h-9 sm:w-9 text-slate-700 hover:bg-slate-100 rounded-xl"
                            title="Précédent"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNext}
                            className="h-8 w-8 sm:h-9 sm:w-9 text-slate-700 hover:bg-slate-100 rounded-xl"
                            title="Suivant"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToday}
                            className="h-8 sm:h-9 text-[11px] sm:text-xs font-black text-blue-700 bg-blue-50 border-blue-200 rounded-xl px-2.5 sm:px-3.5 hover:bg-blue-100"
                        >
                            Aujourd'hui
                        </Button>
                    </div>

                    <h2 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 capitalize tracking-tight ml-1 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        <span>{headerTitle}</span>
                    </h2>
                </div>

                {/* Actions Droite : 4 Boutons de Vue + Nouveau RDV */}
                <div className="flex items-center gap-2 sm:gap-2.5 w-full lg:w-auto justify-between sm:justify-end flex-wrap">
                    
                    {/* Les 4 boutons de vue avec fond et sélecteur coloré */}
                    <div className="bg-slate-100 p-1 rounded-xl flex gap-0.5 sm:gap-1 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => handleSwitchView('day')}
                            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all ${
                                viewMode === 'day'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Jour
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchView('week')}
                            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all ${
                                viewMode === 'week'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Semaine
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchView('month')}
                            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all ${
                                viewMode === 'month'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Mois
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchView('year')}
                            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all ${
                                viewMode === 'year'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Année
                        </button>
                    </div>

                    {/* Bouton Nouveau Rendez-vous avec dégradé vif */}
                    <Button
                        onClick={() => handleOpenCreateModal()}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] sm:text-xs font-black rounded-xl h-8 sm:h-9 px-3 sm:px-4 gap-1.5 shadow-md shadow-blue-500/25"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouveau RDV</span>
                    </Button>
                </div>
            </div>

            {/* Légende / Filtre coloré par catégorie */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="text-slate-400 font-bold text-[11px] shrink-0 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    <span>Catégories :</span>
                </span>
                <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
                        selectedCategory === 'all' 
                            ? 'bg-slate-900 text-white shadow-sm' 
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
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
                            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 flex items-center gap-2 transition-all border shadow-xs ${
                                isSelected 
                                    ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-300' 
                                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span 
                                className="w-2.5 h-2.5 rounded-full shadow-xs" 
                                style={{ backgroundColor: type.color }} 
                            />
                            <span>{type.label.split('/')[0]}</span>
                            {count > 0 && (
                                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                    {count}
                                </span>
                            )}
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
                    className="fixed z-[999] pointer-events-none bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 max-w-xs space-y-2 animate-in fade-in zoom-in-95 duration-100 hidden sm:block"
                    style={{
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: hoveredAppt.color || '#2563eb' }} />
                        <h4 className="font-black text-xs text-white leading-tight truncate">{hoveredAppt.title}</h4>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1 pt-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>{hoveredAppt.date} • {hoveredAppt.isAllDay ? 'Journée entière' : `${hoveredAppt.startTime} - ${hoveredAppt.endTime}`}</span>
                        </div>
                        {hoveredAppt.contact && (
                            <div className="flex items-center gap-1.5 text-slate-200">
                                <User className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{hoveredAppt.contact}</span>
                            </div>
                        )}
                        {hoveredAppt.location && (
                            <div className="flex items-center gap-1.5 text-slate-200 truncate">
                                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                <span>{hoveredAppt.location}</span>
                            </div>
                        )}
                        {hoveredAppt.reminder && hoveredAppt.reminder !== 'none' && (
                            <div className="flex items-center gap-1.5 text-amber-300 text-[10px] font-bold pt-0.5">
                                <Bell className="w-3.5 h-3.5" />
                                <span>Rappel : {REMINDER_OPTIONS.find(r => r.id === hoveredAppt.reminder)?.label}</span>
                            </div>
                        )}
                    </div>

                    <div className="text-[10px] text-blue-300 font-bold pt-1.5 border-t border-slate-800">
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
