// src/components/monday/SmsCampaignView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Smartphone,
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Copy,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Zap,
  Briefcase,
  CheckSquare,
  Square,
  ExternalLink,
  Phone,
  Sparkles,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import apiService from '@/services/api';
import { sendSms, checkTextBeeGatewayStatus } from '@/services/smsService';
import {
  normalizePhoneNumber,
  buildSmsUri,
  getSmsQrCodeImageUrl,
  getCrmSmsTemplates
} from '@/utils/smsLauncher';

const HISTORY_STORAGE_KEY = 'nelson_monday_sms_campaign_history';

export default function SmsCampaignView({ tabs = [] }) {
  const { user, activeTenantId } = useAuth();
  const { projects = [] } = useProjects();
  const { toast } = useToast();

  const commercialName = useMemo(() => {
    return user?.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : (user?.displayName || 'ENR Courtage');
  }, [user]);

  // ── 1. État passerelle TextBee ──
  const [gatewayStatus, setGatewayStatus] = useState({
    loading: true,
    configured: false,
    hasDevice: false,
    deviceId: null,
    deviceName: null,
    message: ''
  });

  const refreshGatewayStatus = useCallback(async () => {
    setGatewayStatus(prev => ({ ...prev, loading: true }));
    const st = await checkTextBeeGatewayStatus();
    setGatewayStatus({
      loading: false,
      configured: Boolean(st?.configured),
      hasDevice: Boolean(st?.hasDevice),
      deviceId: st?.deviceId || null,
      deviceName: st?.deviceName || null,
      message: st?.message || st?.error || ''
    });
  }, []);

  useEffect(() => {
    refreshGatewayStatus();
  }, [refreshGatewayStatus]);

  // ── 2. Sources de destinataires (Monday LEADS/Tableaux, CRM Contacts, CRM Projets) ──
  const [crmContacts, setCrmContacts] = useState([]);
  const [mondayLeads, setMondayLeads] = useState([]);
  const [sourceTab, setSourceTab] = useState('all'); // 'all' | 'monday' | 'crm_contacts' | 'crm_projects'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    apiService.getContacts(activeTenantId)
      .then(list => {
        if (mounted && Array.isArray(list)) setCrmContacts(list);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [activeTenantId]);

  // Extraire automatiquement les lignes contenant un numéro de téléphone depuis les tableaux Monday (notamment LEADS / Projets)
  useEffect(() => {
    let mounted = true;
    const loadMondayPhoneRows = async () => {
      try {
        const extracted = [];
        for (const tab of tabs) {
          const rows = Array.isArray(tab.rows) ? tab.rows : [];
          rows.forEach(r => {
            const values = r.values || r || {};
            let foundPhone = '';
            let foundName = '';
            let foundCity = '';
            let foundPrm = '';

            Object.entries(values).forEach(([k, val]) => {
              const strVal = String(val || '').trim();
              if (!strVal) return;
              const keyLow = k.toLowerCase();
              if (
                keyLow.includes('tel') ||
                keyLow.includes('tél') ||
                keyLow.includes('phone') ||
                keyLow.includes('mobile') ||
                keyLow.includes('portable')
              ) {
                const norm = normalizePhoneNumber(strVal);
                if (norm.valid) foundPhone = norm.formatted;
              } else if (!foundPhone && /^(?:(?:\+|00)33|0)\s*[67](?:[\s.-]*\d{2}){4}$/.test(strVal)) {
                const norm = normalizePhoneNumber(strVal);
                if (norm.valid) foundPhone = norm.formatted;
              }

              if (keyLow === 'name' || keyLow.includes('nom') || keyLow.includes('client') || keyLow.includes('société')) {
                if (!foundName) foundName = strVal;
              }
              if (keyLow.includes('ville') || keyLow.includes('commune') || keyLow.includes('adresse')) {
                if (!foundCity) foundCity = strVal;
              }
              if (keyLow.includes('prm') || keyLow.includes('pdl')) {
                if (/^\d{14}$/.test(strVal.replace(/\D/g, ''))) {
                  foundPrm = strVal.replace(/\D/g, '');
                }
              }
            });

            if (foundPhone) {
              const norm = normalizePhoneNumber(foundPhone);
              if (norm.valid) {
                extracted.push({
                  id: `monday-${tab.id}-${r.id}`,
                  name: foundName || 'Prospect Monday',
                  phone: norm.formatted,
                  e164: norm.e164,
                  city: foundCity,
                  prm: foundPrm,
                  source: `Monday • ${tab.name}`,
                  sourceType: 'monday'
                });
              }
            }
          });
        }
        if (mounted) setMondayLeads(extracted);
      } catch (_) {}
    };
    loadMondayPhoneRows();
    return () => { mounted = false; };
  }, [tabs]);

  // Liste consolidée et dédoublonnée de tous les contacts/projets/leads avec téléphone valide
  const allRecipientsDirectory = useMemo(() => {
    const map = new Map();

    // 1. Monday Leads
    mondayLeads.forEach(item => {
      if (!map.has(item.e164)) map.set(item.e164, item);
    });

    // 2. CRM Contacts
    (crmContacts || []).forEach(c => {
      if (!c?.phone) return;
      const norm = normalizePhoneNumber(c.phone);
      if (!norm.valid) return;
      if (!map.has(norm.e164)) {
        map.set(norm.e164, {
          id: `contact-${c.id}`,
          name: c.name || c.company || 'Contact CRM',
          phone: norm.formatted,
          e164: norm.e164,
          city: c.city || '',
          prm: c.prm || '',
          projectId: c.projectId || '',
          source: 'CRM • Contact',
          sourceType: 'crm_contacts'
        });
      }
    });

    // 3. CRM Projets
    (projects || []).forEach(p => {
      if (!p?.phone) return;
      const norm = normalizePhoneNumber(p.phone);
      if (!norm.valid) return;
      const clientLabel = `${p.name || ''} ${p.firstName || ''}`.trim() || 'Client Projet';
      if (!map.has(norm.e164)) {
        map.set(norm.e164, {
          id: `project-${p.id}`,
          name: clientLabel,
          phone: norm.formatted,
          e164: norm.e164,
          city: p.city || '',
          prm: p.enedisPrm || p.prm || '',
          projectId: p.id || '',
          source: 'CRM • Projet',
          sourceType: 'crm_projects'
        });
      }
    });

    return Array.from(map.values());
  }, [mondayLeads, crmContacts, projects]);

  const filteredDirectory = useMemo(() => {
    return allRecipientsDirectory.filter(item => {
      if (sourceTab !== 'all' && item.sourceType !== sourceTab) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.phone || '').toLowerCase().includes(q) ||
        (item.e164 || '').toLowerCase().includes(q) ||
        (item.city || '').toLowerCase().includes(q) ||
        (item.prm || '').toLowerCase().includes(q)
      );
    });
  }, [allRecipientsDirectory, sourceTab, searchQuery]);

  // ── 3. État de la campagne / destinataires sélectionnés & saisie manuelle ──
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualPrm, setManualPrm] = useState('');

  // Modèles et composition du message
  const [selectedTemplateId, setSelectedTemplateId] = useState('enedis_consent');
  const [messageText, setMessageText] = useState('');
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState({ sent: 0, total: 0 });

  // Historique local des SMS envoyés
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  });

  const saveHistoryEntry = useCallback((entry) => {
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 50);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // Initialiser le message par défaut
  const activeFirstRecipient = selectedRecipients[0] || {
    name: manualName || '{Nom}',
    prm: manualPrm || '{PRM}',
    city: ''
  };

  const templates = useMemo(() => {
    const base = getCrmSmsTemplates({
      clientName: activeFirstRecipient.name || '{Nom}',
      prm: activeFirstRecipient.prm || '',
      projectId: activeFirstRecipient.projectId || 'admin_test',
      city: activeFirstRecipient.city || '',
      commercialName
    });
    return [
      ...base,
      {
        id: 'prospection_bess',
        label: '🔋 Campagne Stockage Batterie BESS / Écrêtage TURPE',
        description: 'Proposition d’étude gratuite de stockage batterie & optimisation de facture',
        message: `Bonjour ${activeFirstRecipient.name || '{Nom}'}, ${commercialName} (ENR Courtage). Nous réalisons actuellement les études de dimensionnement Stockage Batterie & Solaire pour réduire jusqu'à 35% votre facture d'électricité. Autorisez l'analyse gratuite de votre courbe Enedis ici : ${typeof window !== 'undefined' ? window.location.origin : 'https://www.nelsonpv.fr'}/api/enedis/auth?projectId=admin_test`
      },
      {
        id: 'custom_blank',
        label: '✍️ Message libre personnalisé',
        description: 'Rédigez votre propre message ou campagne SMS (supporte {Nom} et {PRM})',
        message: messageText || `Bonjour {Nom}, `
      }
    ];
  }, [activeFirstRecipient, commercialName]);

  useEffect(() => {
    if (!messageText) {
      const tpl = templates[0];
      if (tpl) setMessageText(tpl.message);
    }
  }, [templates, messageText]);

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    if (tpl.id !== 'custom_blank') {
      setMessageText(tpl.message);
    }
  };

  // Ajouter un destinataire manuellement
  const handleAddManualRecipient = (e) => {
    e?.preventDefault();
    const norm = normalizePhoneNumber(manualPhone);
    if (!norm.valid) {
      toast({
        title: 'Numéro mobile invalide',
        description: norm.error || 'Veuillez saisir un numéro à 10 chiffres (ex: 06 12 34 56 78).',
        variant: 'destructive'
      });
      return;
    }

    if (selectedRecipients.some(r => r.e164 === norm.e164)) {
      toast({
        title: 'Déjà dans la liste',
        description: `Le numéro ${norm.formatted} est déjà sélectionné dans la campagne.`
      });
      return;
    }

    const newRec = {
      id: `manual-${Date.now()}`,
      name: manualName.trim() || 'Client',
      phone: norm.formatted,
      e164: norm.e164,
      prm: manualPrm.replace(/\D/g, '').slice(0, 14),
      source: 'Saisie directe'
    };

    setSelectedRecipients(prev => [...prev, newRec]);
    setManualName('');
    setManualPhone('');
    setManualPrm('');
    toast({
      title: 'Destinataire ajouté ✓',
      description: `${newRec.name} (${newRec.phone})`
    });
  };

  const toggleRecipientFromDirectory = (item) => {
    setSelectedRecipients(prev => {
      const exists = prev.some(r => r.e164 === item.e164);
      if (exists) return prev.filter(r => r.e164 !== item.e164);
      return [...prev, item];
    });
  };

  const handleSelectAllFiltered = () => {
    const allSelected = filteredDirectory.every(d =>
      selectedRecipients.some(r => r.e164 === d.e164)
    );
    if (allSelected) {
      const filteredSet = new Set(filteredDirectory.map(d => d.e164));
      setSelectedRecipients(prev => prev.filter(r => !filteredSet.has(r.e164)));
    } else {
      setSelectedRecipients(prev => {
        const map = new Map(prev.map(r => [r.e164, r]));
        filteredDirectory.slice(0, 50).forEach(d => map.set(d.e164, d));
        return Array.from(map.values());
      });
    }
  };

  // Personnalise le message pour un destinataire ({Nom}, {PRM})
  const personalizeMessage = (rawTemplate, recipient) => {
    let text = rawTemplate || '';
    const cleanName = (recipient?.name && recipient.name !== 'Client' && recipient.name !== 'Prospect Monday')
      ? recipient.name
      : 'Madame, Monsieur';
    text = text.replace(/\{Nom\}/gi, cleanName);
    if (recipient?.prm && recipient.prm.length === 14) {
      text = text.replace(/\{PRM\}/gi, recipient.prm);
      // Si l'URL d'auth Enedis est présente sans prm=, l'ajouter
      if (text.includes('/api/enedis/auth?projectId=admin_test') && !text.includes('&prm=')) {
        text = text.replace(
          '/api/enedis/auth?projectId=admin_test',
          `/api/enedis/auth?projectId=admin_test&prm=${recipient.prm}`
        );
      }
    } else {
      text = text.replace(/\{PRM\}/gi, 'Linky');
    }
    return text;
  };

  // ── 4. Envoi de la campagne SMS (Unitaire ou Groupe via TextBee / repli natif) ──
  const handleLaunchCampaign = async () => {
    // Si l'utilisateur a tapé un numéro dans le champ rapide sans cliquer sur "+", on l'utilise directement
    let targets = [...selectedRecipients];
    if (targets.length === 0 && manualPhone.trim()) {
      const norm = normalizePhoneNumber(manualPhone);
      if (!norm.valid) {
        toast({
          title: 'Numéro mobile invalide',
          description: norm.error || 'Saisissez un numéro valide (ex: 06 12 34 56 78).',
          variant: 'destructive'
        });
        return;
      }
      targets = [{
        id: `direct-${Date.now()}`,
        name: manualName.trim() || 'Client',
        phone: norm.formatted,
        e164: norm.e164,
        prm: manualPrm.replace(/\D/g, '').slice(0, 14),
        source: 'Envoi direct'
      }];
    }

    if (targets.length === 0) {
      toast({
        title: 'Aucun destinataire',
        description: 'Sélectionnez au moins un contact dans la liste ou saisissez un numéro mobile.',
        variant: 'destructive'
      });
      return;
    }

    if (!messageText.trim()) {
      toast({
        title: 'Message vide',
        description: 'Veuillez rédiger ou choisir un modèle de SMS.',
        variant: 'destructive'
      });
      return;
    }

    setIsSendingCampaign(true);
    setCampaignProgress({ sent: 0, total: targets.length });

    let apiSentCount = 0;
    let fallbackCount = 0;

    try {
      for (let i = 0; i < targets.length; i++) {
        const rec = targets[i];
        const finalMsg = personalizeMessage(messageText, rec);
        const allowFallback = targets.length === 1; // Repli automatique vers `sms:` si envoi unitaire

        const res = await sendSms({
          to: rec.e164,
          message: finalMsg,
          allowNativeFallback: allowFallback
        });

        if (res.success && res.mode === 'api') {
          apiSentCount++;
          saveHistoryEntry({
            id: `hist-${Date.now()}-${i}`,
            date: new Date().toISOString(),
            name: rec.name,
            phone: rec.phone,
            e164: rec.e164,
            message: finalMsg,
            mode: 'TextBee Android',
            status: 'SENT'
          });
        } else if (res.success && res.mode === 'fallback_native') {
          fallbackCount++;
          saveHistoryEntry({
            id: `hist-${Date.now()}-${i}`,
            date: new Date().toISOString(),
            name: rec.name,
            phone: rec.phone,
            e164: rec.e164,
            message: finalMsg,
            mode: 'App SMS Native',
            status: 'FALLBACK'
          });
        } else {
          saveHistoryEntry({
            id: `hist-${Date.now()}-${i}`,
            date: new Date().toISOString(),
            name: rec.name,
            phone: rec.phone,
            e164: rec.e164,
            message: finalMsg,
            mode: 'Erreur / En attente',
            status: 'ERROR',
            error: res.error
          });
        }

        setCampaignProgress({ sent: i + 1, total: targets.length });
      }

      if (apiSentCount > 0) {
        toast({
          title: `✅ ${apiSentCount} SMS envoyé(s) via TextBee !`,
          description: `Expédition directe réussie depuis votre passerelle Android TextBee.`
        });
      } else if (fallbackCount > 0) {
        toast({
          title: 'Application SMS ouverte & message copié ✓',
          description: 'Le SMS pré-rempli est prêt à être envoyé depuis votre appareil.'
        });
      } else {
        toast({
          title: 'Passerelle TextBee en attente d’appairage',
          description: 'Appairez votre téléphone Android sur TextBee ou cliquez sur un contact pour envoyer via sms: / QR Code.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const previewRecipient = selectedRecipients[0] || {
    name: manualName || 'Jean Dupont',
    phone: manualPhone || '06 12 34 56 78',
    e164: normalizePhoneNumber(manualPhone).e164 || '+33612345678',
    prm: manualPrm || '50009371514981'
  };

  const previewMessage = personalizeMessage(messageText, previewRecipient);
  const charCount = previewMessage.length;
  const smsSegments = Math.max(1, Math.ceil(charCount / 160));

  return (
    <div className="space-y-6 pb-12">
      {/* ── En-tête Campagne SMS & Statut Passerelle TextBee ── */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="p-3.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300 shrink-0">
            <Smartphone className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-white">
                Campagne SMS &amp; Passerelle TextBee
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold px-2.5 py-0.5">
                TextBee API v1 • Enedis &amp; CRM
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Envoyez vos liens d'autorisation Enedis Data Connect, confirmations d'études et campagnes SMS directement depuis votre téléphone Android connecté (jusqu'à 50 SMS/jour gratuits + mode QR &amp; natif illimité).
            </p>
          </div>
        </div>

        {/* Statut Live de la passerelle Android TextBee */}
        <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-2xl px-4 py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                gatewayStatus.loading
                  ? 'bg-amber-400 animate-pulse'
                  : gatewayStatus.hasDevice
                  ? 'bg-emerald-400 animate-pulse'
                  : gatewayStatus.configured
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <div className="text-left">
              <div className="text-xs font-extrabold text-white">
                {gatewayStatus.loading
                  ? 'Vérification TextBee...'
                  : gatewayStatus.hasDevice
                  ? `Android connecté (${gatewayStatus.deviceName || 'Passerelle active'})`
                  : gatewayStatus.configured
                  ? 'Clé API active • Téléphone Android à appairer'
                  : 'Mode SMS Natif & QR Mobile actif'}
              </div>
              <div className="text-[10px] text-slate-400 max-w-[260px] truncate" title={gatewayStatus.message}>
                {gatewayStatus.deviceId
                  ? `Device ID : ${gatewayStatus.deviceId}`
                  : (gatewayStatus.message || 'Repli automatique sms: + QR Code Mobile')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshGatewayStatus}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Actualiser la connexion TextBee"
          >
            <RefreshCw className={`w-4 h-4 ${gatewayStatus.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Grille principale : Sélection Destinataires (Gauche) + Compositeur & Envoi (Droite) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNE GAUCHE (5/12) : Destinataires (Saisie rapide + Annuaire Monday / CRM) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* 1. Ajout rapide d'un numéro / destinataire */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>1. Destinataire rapide (ou ajout manuel)</span>
              </h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Format 06 / 07 / +33
              </span>
            </div>

            <form onSubmit={handleAddManualRecipient} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="Nom / Société (ex: Jean Dupont)"
                  className="h-9 text-xs rounded-xl"
                />
                <Input
                  type="tel"
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  placeholder="Mobile * (ex: 06 12 34 56 78)"
                  className="h-9 text-xs rounded-xl font-medium border-emerald-200 focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={manualPrm}
                  onChange={e => setManualPrm(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="N° PRM / PDL 14 chiffres (optionnel pour lien Enedis)"
                  className="h-9 text-xs rounded-xl font-mono flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Ajouter
                </Button>
              </div>
            </form>
          </div>

          {/* 2. Annuaire Monday (LEADS) & CRM (Contacts / Projets) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex-1 flex flex-col space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>2. Importer depuis Monday &amp; CRM ({filteredDirectory.length})</span>
              </h2>
              {filteredDirectory.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Tout cocher / décocher
                </button>
              )}
            </div>

            {/* Filtres de source */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: `Tous (${allRecipientsDirectory.length})` },
                { id: 'monday', label: `Tableaux Monday (${mondayLeads.length})` },
                { id: 'crm_contacts', label: 'Contacts CRM' },
                { id: 'crm_projects', label: 'Projets CRM' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSourceTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sourceTab === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Barre de recherche */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, téléphone, ville ou PRM..."
                className="pl-8 h-9 text-xs rounded-xl bg-slate-50"
              />
            </div>

            {/* Liste des contacts */}
            <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
              {filteredDirectory.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Aucun contact avec numéro de téléphone trouvé dans cette vue. Utilisez l'ajout rapide ci-dessus.
                </div>
              ) : (
                filteredDirectory.map(item => {
                  const isChecked = selectedRecipients.some(r => r.e164 === item.e164);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleRecipientFromDirectory(item)}
                      className={`p-3 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-mono font-semibold text-emerald-700">{item.phone}</span>
                            {item.city && <span className="truncate">• {item.city}</span>}
                            {item.prm && <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-1.5 rounded">PRM {item.prm}</span>}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                        {item.source}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (7/12) : Modèles, Message, Aperçu, QR Code & Envoi */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            
            {/* Destinataires sélectionnés */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold uppercase text-slate-600 tracking-wider">
                  Destinataires de la campagne ({selectedRecipients.length || (manualPhone ? 1 : 0)})
                </label>
                {selectedRecipients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedRecipients([])}
                    className="text-[11px] font-bold text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    Vider la sélection
                  </button>
                )}
              </div>

              {selectedRecipients.length === 0 ? (
                <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                  {manualPhone ? (
                    <span>
                      Envoi direct prêt pour <strong className="text-slate-800">{manualName || 'Client'}</strong> ({manualPhone})
                    </span>
                  ) : (
                    <span>
                      Cochez un ou plusieurs destinataires à gauche, ou saisissez directement un numéro mobile dans l'encadré 1.
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {selectedRecipients.map(rec => (
                    <span
                      key={rec.e164}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      <span>{rec.name}</span>
                      <span className="font-mono text-[11px] text-emerald-700">({rec.phone})</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRecipients(prev => prev.filter(r => r.e164 !== rec.e164))}
                        className="text-slate-400 hover:text-red-600 ml-0.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Choix du modèle de SMS */}
            <div>
              <label className="text-xs font-extrabold uppercase text-slate-600 tracking-wider block mb-2">
                3. Modèle de message SMS
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map(tpl => {
                  const isActive = selectedTemplateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-200'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-extrabold text-slate-900">{tpl.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{tpl.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zone de rédaction du message */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-extrabold uppercase text-slate-600 tracking-wider">
                  4. Contenu du SMS (variables dynamiques : <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{Nom}'}</code>, <code className="text-blue-700 bg-blue-50 px-1 rounded">{'{PRM}'}</code>)
                </label>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span>{charCount} caractères • ~{smsSegments} SMS</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(previewMessage);
                        toast({ title: 'Message copié ✓', description: 'Le texte du SMS a été copié dans le presse-papiers.' });
                      } catch (_) {}
                    }}
                    className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    Copier
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Rédigez votre SMS ici..."
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {/* Boutons d'insertion rapide de liens */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400">Insérer en 1 clic :</span>
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.nelsonpv.fr';
                    const prmVal = manualPrm || selectedRecipients[0]?.prm || '';
                    const link = `${origin}/api/enedis/auth?projectId=admin_test${prmVal.length === 14 ? `&prm=${prmVal}` : ''}`;
                    setMessageText(prev => `${prev.trim()} ${link}`.trim());
                  }}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                >
                  + Lien Consentement Enedis
                </button>
                <button
                  type="button"
                  onClick={() => setMessageText(prev => `${prev} {Nom}`)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  + {'{Nom}'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrPreview(v => !v)}
                  className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQrPreview ? 'Masquer QR Code Mobile' : 'QR Code Mobile'}</span>
                </button>
              </div>
            </div>

            {/* QR Code Mobile si activé */}
            {showQrPreview && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2 bg-white rounded-2xl border border-emerald-200 shadow-xs shrink-0">
                  <img
                    src={getSmsQrCodeImageUrl(previewRecipient.phone || '0600000000', previewMessage, 160)}
                    alt="QR Code SMS"
                    className="w-36 h-36 object-contain"
                  />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="text-xs font-extrabold text-emerald-950">
                    📱 Flasher pour envoyer depuis votre téléphone
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Scannez ce QR Code avec l'appareil photo de votre smartphone : il ouvre directement votre application Messages avec le numéro <strong>{previewRecipient.phone}</strong> et le texte complet pré-rempli.
                  </p>
                </div>
              </div>
            )}

            {/* Barre d'actions d'envoi */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={handleLaunchCampaign}
                disabled={isSendingCampaign}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-200 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                {isSendingCampaign ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    <span>Envoi en cours ({campaignProgress.sent}/{campaignProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    <span>
                      Envoyer {selectedRecipients.length > 1 ? `la campagne (${selectedRecipients.length} SMS)` : 'le SMS'} via TextBee
                    </span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const uri = buildSmsUri(previewRecipient.phone, previewMessage);
                  window.location.href = uri;
                }}
                className="h-12 px-5 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                title="Ouvrir directement l'application Messages de votre appareil via le protocole sms:"
              >
                <Smartphone className="w-4 h-4 mr-1.5 text-emerald-600" />
                Ouvrir App SMS (sms:)
              </Button>
            </div>
          </div>

          {/* Historique récent des envois SMS */}
          {history.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Historique récent des envois ({history.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setHistory([]);
                    try { localStorage.removeItem(HISTORY_STORAGE_KEY); } catch (_) {}
                  }}
                  className="text-[11px] text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  Effacer l'historique
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                {history.slice(0, 12).map(h => (
                  <div key={h.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{h.name}</span>
                        <span className="font-mono text-emerald-700">{h.phone}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          h.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : h.status === 'FALLBACK'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {h.mode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5" title={h.message}>
                        {h.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
