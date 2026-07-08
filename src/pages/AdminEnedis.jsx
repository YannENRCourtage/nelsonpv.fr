import React, { useState, useEffect, useCallback } from 'react';
import {
  Info, CheckCircle2, RotateCw, Search, Activity, Database, Key,
  History, LayoutDashboard, ExternalLink, Calendar, ChevronDown,
  ChevronUp, FileText, Copy, Smartphone, Mail, QrCode, Clock,
  X, Zap, Share2, MessageCircle, Send, Phone, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import enedisService from '@/services/enedis';
import ConsumptionChart from '@/components/enedis/ConsumptionChart';
import EnedisPrintLayout from '@/components/enedis/EnedisPrintLayout';
import { useEnedisPolling } from '@/hooks/useEnedisPolling';

export default function AdminEnedis() {
  const [prm, setPrm] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPrm, setFetchingPrm] = useState(null);
  const [status, setStatus] = useState('idle');
  const [consents, setConsents] = useState([]);
  const [activeTab, setActiveTab] = useState('interrogation');
  const [jsonOpen, setJsonOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Partage / consentement
  const [shareMode, setShareMode] = useState('present'); // 'present' | 'absent'
  const [isPolling, setIsPolling] = useState(false);
  const [pollingSeconds, setPollingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Formulaire consentement direct (SMS/WhatsApp/Email)
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [sendingConsent, setSendingConsent] = useState(false);
  const [consentSent, setConsentSent] = useState(false);
  const [consentToken, setConsentToken] = useState(null);
  const [nelsonQrUrl, setNelsonQrUrl] = useState(null);

  const { toast } = useToast();

  const consentUrl = prm?.length === 14
    ? `${window.location.origin}${enedisService.getAuthorizeUrl('admin_test', prm)}`
    : null;

  const qrUrl = consentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(consentUrl)}`
    : null;

  // ─── Charger les consentements ───
  const loadConsents = useCallback(async () => {
    try {
      const res = await fetch('/api/enedis/fetch?action=list_consents');
      if (res.ok) {
        const json = await res.json();
        setConsents(json.consents || []);
      }
    } catch (e) {
      console.warn('Could not load consents:', e.message);
    }
  }, []);

  useEffect(() => {
    loadConsents();
    const interval = setInterval(loadConsents, 30000);
    return () => clearInterval(interval);
  }, [loadConsents]);

  // ─── Auto-fetch si redirigé depuis callback Enedis ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successPrm = params.get('prm');
    const enedisStatus = params.get('enedis');
    const msg = params.get('message');
    if (successPrm) {
      setPrm(successPrm);
      if (enedisStatus === 'success') {
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => { loadConsents(); handleFetch(successPrm); }, 800);
      }
    } else if (enedisStatus === 'error' && msg) {
      toast({ title: 'Erreur Enedis', description: decodeURIComponent(msg), variant: 'destructive' });
    }
  }, []);

  // ─── Compteur polling ───
  useEffect(() => {
    if (!isPolling) { setPollingSeconds(0); return; }
    const t = setInterval(() => setPollingSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isPolling]);

  // ─── Polling auto-détection consentement ───
  const handleConsentDetected = useCallback(async (consentInfo) => {
    setIsPolling(false);
    setShowQR(false);
    toast({
      title: '🎉 Consentement reçu !',
      description: `Le client a validé pour le PRM ${consentInfo.prm}. Récupération des données…`
    });
    await loadConsents();
    handleFetch(consentInfo.prm);
  }, [loadConsents]);

  const { resetPolling } = useEnedisPolling({
    prm,
    active: isPolling,
    onConsentDetected: handleConsentDetected,
    intervalMs: 8000,
  });

  // ─── Récupérer les données ───
  const handleFetch = async (prmToFetch, projectIdToFetch) => {
    const targetPrm = (prmToFetch && typeof prmToFetch === 'string' ? prmToFetch : prm).trim();
    const targetProjectId = projectIdToFetch || 'admin_test';
    if (!targetPrm || targetPrm.length !== 14) {
      toast({ title: 'PRM Invalide', description: 'Veuillez saisir un PRM de 14 chiffres.', variant: 'destructive' });
      return;
    }
    setFetchingPrm(targetPrm);
    setLoading(true);
    try {
      const result = await enedisService.fetchData({ prm: targetPrm, projectId: targetProjectId });
      if (result?.data) {
        setData(result.data);
        setStatus('connected');
        setPrm(targetPrm);
        setActiveTab('interrogation');
        loadConsents();
        toast({ title: 'Succès', description: `Données récupérées pour le PRM ${targetPrm}` });
      } else {
        setStatus('disconnected');
        toast({ title: 'Données introuvables', description: 'Aucun consentement trouvé pour ce PRM.', variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      setStatus('disconnected');
      toast({ title: 'Erreur', description: err.message || 'Erreur lors de la récupération', variant: 'destructive' });
    } finally {
      setLoading(false);
      setFetchingPrm(null);
    }
  };

  const handleCopyLink = async () => {
    if (!consentUrl) return;
    try {
      await navigator.clipboard.writeText(consentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      // Démarrer le polling après copie
      if (!isPolling) { resetPolling(prm); setIsPolling(true); }
      toast({ title: 'Lien copié !', description: 'Envoyez ce lien au client. Vous serez averti automatiquement dès son consentement.' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier le lien.', variant: 'destructive' });
    }
  };

  const handleShowQR = async () => {
    // Créer une demande de consentement pour le QR code Nelson
    try {
      const res = await fetch('/api/enedis/consent-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prm,
          clientName: clientName.trim() || 'Client (QR Code)',
          clientContact: 'qr-code',
          contactMethod: 'sms',
          projectId: 'admin_test'
        })
      });
      const data = await res.json();
      if (data.success) {
        const fullUrl = `${window.location.origin}/consent/${data.token}`;
        setNelsonQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(fullUrl)}`);
        setConsentToken(data.token);
      }
    } catch (e) {
      console.warn('Fallback to ENEDIS QR code:', e.message);
    }
    resetPolling(prm);
    setIsPolling(true);
    setShowQR(true);
  };

  const handleStopPolling = () => {
    setIsPolling(false);
    setShowQR(false);
    setPollingSeconds(0);
  };

  // ─── Envoi de demande de consentement par SMS/WhatsApp/Email ───
  const handleSendConsent = async (method) => {
    if (!isPrmValid || !clientContact.trim()) {
      toast({ title: 'Informations manquantes', description: 'Veuillez saisir le PRM et les coordonnées du client.', variant: 'destructive' });
      return;
    }
    setSendingConsent(true);
    try {
      // Créer la demande de consentement côté serveur
      const res = await fetch('/api/enedis/consent-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prm,
          clientName: clientName.trim() || 'Client',
          clientContact: clientContact.trim(),
          contactMethod: method,
          projectId: 'admin_test'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création de la demande');
      }

      const fullConsentUrl = `${window.location.origin}/consent/${data.token}`;
      setConsentToken(data.token);
      setConsentSent(true);

      // Ouvrir l'app native selon la méthode
      const message = `Bonjour ${clientName.trim() || ''},\n\nVotre installateur vous invite à autoriser l'accès à vos données de consommation électrique pour dimensionner votre installation solaire.\n\nCliquez ici pour donner votre accord :\n${fullConsentUrl}\n\n— Nelson PV`;

      if (method === 'sms') {
        const smsBody = encodeURIComponent(message);
        const phone = clientContact.trim().replace(/\s/g, '');
        window.open(`sms:${phone}?body=${smsBody}`, '_blank');
        toast({ title: '📱 SMS préparé', description: 'L\'app SMS s\'est ouverte avec le message pré-rempli. Envoyez-le au client.' });
      } else if (method === 'whatsapp') {
        const waText = encodeURIComponent(message);
        const phone = clientContact.trim().replace(/\s/g, '').replace(/^0/, '33');
        window.open(`https://wa.me/${phone}?text=${waText}`, '_blank');
        toast({ title: '💬 WhatsApp ouvert', description: 'Envoyez le message au client via WhatsApp.' });
      } else if (method === 'email') {
        const subject = encodeURIComponent('Autorisation d\'accès à vos données Enedis — Nelson PV');
        const body = encodeURIComponent(message);
        window.open(`mailto:${clientContact.trim()}?subject=${subject}&body=${body}`, '_blank');
        toast({ title: '✉️ Email préparé', description: 'Votre client de messagerie s\'est ouvert avec le message pré-rempli.' });
      }

      // Démarrer le polling pour détecter le consentement
      resetPolling(prm);
      setIsPolling(true);

    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSendingConsent(false);
    }
  };

  const handlePdf = useCallback(() => {
    if (!data) { toast({ title: 'Aucune donnée', description: `Récupérez d'abord les données.`, variant: 'destructive' }); return; }
    setIsPrinting(true);
    setTimeout(() => { window.print(); setTimeout(() => setIsPrinting(false), 500); }, 400);
  }, [data, toast]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Date invalide'; }
  };

  const formatConso = (conso) => {
    if (conso === undefined || conso === null) return 'N/A';
    return new Intl.NumberFormat('fr-FR').format(conso) + ' kWh';
  };

  const isPrmValid = prm.length === 14;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="container mx-auto py-8 px-6 max-w-[1600px]">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-xl shadow-blue-200">
              <Activity size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <img src="/images/enedis/enedis-logo-couleur.png" alt="Logo Enedis" className="h-7 object-contain" />
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Data Connect</h1>
              </div>
              <p className="text-slate-500 text-base mt-1 font-medium">Administration & Monitoring des flux Production v5</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status === 'connected' && (
              <div className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-100 border-2 border-green-200 rounded-2xl px-6 py-2.5 shadow-sm animate-in fade-in zoom-in duration-300">
                <CheckCircle2 size={18} />
                PRM ACTIF : {prm}
              </div>
            )}
            {isPolling && (
              <div className="flex items-center gap-2 text-sm font-bold text-amber-700 bg-amber-100 border-2 border-amber-200 rounded-2xl px-6 py-2.5 shadow-sm animate-pulse">
                <Clock size={18} />
                En attente du consentement… {pollingSeconds}s
              </div>
            )}
            {data && (
              <Button variant="outline" className="rounded-2xl h-12 px-5 border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-100 font-bold" onClick={handlePdf}>
                <FileText size={18} className="mr-2" />
                PDF
              </Button>
            )}
            <Button variant="outline" className="rounded-2xl h-12 px-6 border-slate-200 bg-white shadow-sm hover:bg-slate-50"
              onClick={() => { setData(null); setStatus('idle'); setPrm(''); handleStopPolling(); }}>
              <RotateCw size={18} className="mr-2 text-slate-400" />
              Réinitialiser
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white p-1.5 rounded-2xl border shadow-sm w-fit h-auto gap-1">
            <TabsTrigger value="interrogation" className="rounded-xl px-6 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold transition-all">
              <Search size={18} className="mr-2" />
              Interrogation
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl px-6 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold transition-all">
              <History size={18} className="mr-2" />
              Historique des autorisations
              {consents.length > 0 && (
                <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] group-data-[state=active]:bg-blue-500 group-data-[state=active]:text-white">
                  {consents.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Onglet Interrogation ── */}
          <TabsContent value="interrogation" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" style={{ alignItems: 'stretch' }}>

              {/* ─── Colonne gauche ─── */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <Card className="flex-1 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/80 border-b p-6">
                    <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Key size={20} /></div>
                      Accès aux données
                    </CardTitle>
                    <CardDescription>Saisissez le PRM pour interroger ou demander le consentement</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">

                    {/* Notice légale */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Info size={14} className="text-blue-600 shrink-0" />
                        <p className="text-[11px] font-extrabold text-blue-800 uppercase tracking-widest">Service Public de Distribution</p>
                      </div>
                      <p className="text-xs text-blue-900 leading-relaxed italic border-b border-blue-200/50 pb-2">
                        Enedis est le gestionnaire du réseau public de distribution d'électricité sur 95% du territoire français continental.
                      </p>
                      <p className="text-xs text-blue-900 leading-relaxed">
                        <span className="font-bold">Finalité :</span> Visualiser la consommation pour dimensionner l'installation PV.
                      </p>
                      <p className="text-xs text-blue-900 leading-relaxed">
                        <span className="font-bold">Durée :</span> Consentement 3 ans max, révocable à tout moment.
                      </p>
                    </div>

                    {/* Saisie PRM */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-500 tracking-widest ml-1">Numéro PRM (14 chiffres)</label>
                      <div className="relative">
                        <Input
                          value={prm}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 14);
                            setPrm(v);
                            if (v !== prm) { setData(null); setStatus('idle'); handleStopPolling(); }
                          }}
                          placeholder="Ex: 16138350177475"
                          className="font-mono text-2xl h-16 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 pl-14 transition-all"
                        />
                        <Database className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                      </div>
                    </div>

                    {/* ── Bouton : Récupérer si consentement existe ── */}
                    <Button
                      onClick={() => handleFetch()}
                      disabled={loading || !isPrmValid}
                      className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading ? <RotateCw className="mr-3 h-5 w-5 animate-spin" /> : <Zap className="mr-3 h-5 w-5" />}
                      Récupérer les données
                    </Button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
                      <div className="relative flex justify-center text-[11px] uppercase tracking-[0.2em]">
                        <span className="bg-white px-4 text-slate-400 font-bold">ou demander le consentement</span>
                      </div>
                    </div>

                    {/* ── Choix du mode de partage ── */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShareMode('present')}
                        className={cn(
                          "p-3 rounded-xl border-2 text-left transition-all",
                          shareMode === 'present'
                            ? "border-blue-500 bg-blue-50 text-blue-800"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300"
                        )}
                      >
                        <Smartphone size={16} className="mb-1" />
                        <p className="text-xs font-bold">Client présent</p>
                        <p className="text-[10px] opacity-70">QR code à scanner</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareMode('absent')}
                        className={cn(
                          "p-3 rounded-xl border-2 text-left transition-all",
                          shareMode === 'absent'
                            ? "border-blue-500 bg-blue-50 text-blue-800"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300"
                        )}
                      >
                        <Mail size={16} className="mb-1" />
                        <p className="text-xs font-bold">Client absent</p>
                        <p className="text-[10px] opacity-70">Lien à envoyer</p>
                      </button>
                    </div>

                    {/* ── Mode Client Présent : SMS / WhatsApp / Email ── */}
                    {shareMode === 'present' && (
                      <div className="space-y-3">
                        {!consentSent ? (
                          <>
                            {/* Nom du client */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Nom du client (optionnel)</label>
                              <div className="relative">
                                <Input
                                  value={clientName}
                                  onChange={e => setClientName(e.target.value)}
                                  placeholder="Ex: Jean Dupont"
                                  className="h-11 border-slate-200 rounded-xl pl-10 text-sm"
                                />
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                              </div>
                            </div>

                            {/* Contact du client */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Téléphone ou email du client</label>
                              <div className="relative">
                                <Input
                                  value={clientContact}
                                  onChange={e => setClientContact(e.target.value)}
                                  placeholder="06 XX XX XX XX ou email@client.fr"
                                  className="h-11 border-slate-200 rounded-xl pl-10 text-sm"
                                />
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                              </div>
                            </div>

                            {/* Boutons d'envoi */}
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => handleSendConsent('sms')}
                                disabled={!isPrmValid || !clientContact.trim() || sendingConsent}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Smartphone size={20} />
                                <span className="text-[11px] font-bold">SMS</span>
                              </button>
                              <button
                                onClick={() => handleSendConsent('whatsapp')}
                                disabled={!isPrmValid || !clientContact.trim() || sendingConsent}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-700 transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <MessageCircle size={20} />
                                <span className="text-[11px] font-bold">WhatsApp</span>
                              </button>
                              <button
                                onClick={() => handleSendConsent('email')}
                                disabled={!isPrmValid || !clientContact.trim() || sendingConsent}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Mail size={20} />
                                <span className="text-[11px] font-bold">Email</span>
                              </button>
                            </div>

                            {sendingConsent && (
                              <div className="flex items-center justify-center gap-2 py-2">
                                <RotateCw size={14} className="animate-spin text-blue-500" />
                                <span className="text-xs text-slate-500">Préparation de l'envoi…</span>
                              </div>
                            )}

                            {/* QR Code option */}
                            <div className="relative py-1">
                              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
                              <div className="relative flex justify-center text-[9px] uppercase tracking-[0.2em]">
                                <span className="bg-white px-3 text-slate-400 font-bold">ou scanner un QR code</span>
                              </div>
                            </div>

                            {!showQR ? (
                              <button
                                onClick={handleShowQR}
                                disabled={!isPrmValid}
                                className="w-full transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                              >
                                <div className="relative overflow-hidden rounded-2xl border-2 border-transparent group-hover:border-blue-400 transition-all">
                                  <div className="flex items-center justify-center gap-3 h-12 bg-[#008ECE] text-white font-bold text-sm rounded-2xl">
                                    <QrCode size={18} />
                                    Afficher le QR Code
                                  </div>
                                </div>
                              </button>
                            ) : (
                              <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 text-center space-y-3 shadow-lg">
                                <p className="text-sm font-bold text-slate-700">📱 Faites scanner par le client</p>
                                <p className="text-xs text-slate-500">
                                  Le client donnera son accord directement sur <span className="font-bold text-blue-600">Nelsonpv.fr</span>
                                </p>
                                {(nelsonQrUrl || qrUrl) && (
                                  <div className="flex justify-center">
                                    <img src={nelsonQrUrl || qrUrl} alt="QR code consentement Nelson" className="w-48 h-48 rounded-xl shadow-md border border-slate-100" />
                                  </div>
                                )}
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                  <Clock size={14} className="text-amber-600 shrink-0 animate-pulse" />
                                  <p className="text-[11px] text-amber-800">
                                    Détection automatique active ({pollingSeconds}s)
                                  </p>
                                </div>
                                <button onClick={handleStopPolling} className="text-[10px] text-slate-400 hover:text-slate-600 underline">
                                  Annuler
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Après envoi : confirmation + polling */
                          <div className="bg-green-50 rounded-2xl border-2 border-green-200 p-5 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-xl">
                                <Send size={18} className="text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-green-800">Demande envoyée !</p>
                                <p className="text-xs text-green-600">Le lien de consentement a été préparé pour {clientContact}</p>
                              </div>
                            </div>

                            {isPolling && (
                              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                <Clock size={14} className="text-amber-600 shrink-0 animate-pulse" />
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-amber-800">Détection automatique active</p>
                                  <p className="text-[10px] text-amber-700">Vous serez averti dès la validation ({pollingSeconds}s)</p>
                                </div>
                                <button onClick={handleStopPolling} className="text-amber-600 hover:text-amber-800 p-1">
                                  <X size={14} />
                                </button>
                              </div>
                            )}

                            <button
                              onClick={() => { setConsentSent(false); setConsentToken(null); }}
                              className="w-full text-xs text-slate-500 hover:text-slate-700 underline py-1"
                            >
                              Envoyer une nouvelle demande
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Mode Client Absent ── */}
                    {shareMode === 'absent' && (
                      <div className="space-y-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                          <p className="text-xs font-bold text-slate-700 mb-2">Comment ça marche :</p>
                          <ol className="space-y-1.5 text-xs text-slate-600">
                            <li className="flex gap-2 items-start">
                              <span className="font-bold text-blue-600 shrink-0">1.</span>
                              Copiez le lien ci-dessous
                            </li>
                            <li className="flex gap-2 items-start">
                              <span className="font-bold text-blue-600 shrink-0">2.</span>
                              Envoyez-le par email ou SMS au client
                            </li>
                            <li className="flex gap-2 items-start">
                              <span className="font-bold text-blue-600 shrink-0">3.</span>
                              Le client clique et s'identifie avec <span className="font-bold text-blue-600 ml-1">FranceConnect</span>
                              <em className="text-slate-500 ml-1">(sans créer de compte Enedis)</em>
                            </li>
                            <li className="flex gap-2 items-start">
                              <span className="font-bold text-blue-600 shrink-0">4.</span>
                              Les données apparaissent ici automatiquement
                            </li>
                          </ol>
                        </div>

                        <Button
                          onClick={handleCopyLink}
                          disabled={!isPrmValid}
                          className={cn(
                            "w-full h-14 rounded-2xl font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98]",
                            copied
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          )}
                        >
                          {copied ? <CheckCircle2 className="mr-2 h-5 w-5" /> : <Copy className="mr-2 h-5 w-5" />}
                          {copied ? 'Lien copié !' : 'Copier le lien de consentement'}
                        </Button>

                        {isPolling && (
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <Clock size={16} className="text-amber-600 shrink-0 animate-pulse" />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-amber-800">Détection automatique active</p>
                              <p className="text-[10px] text-amber-700">
                                Vous serez averti dès que le client aura consenti ({pollingSeconds}s)
                              </p>
                            </div>
                            <button onClick={handleStopPolling} className="text-amber-600 hover:text-amber-800 p-1">
                              <X size={16} />
                            </button>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <a
                            href={consentUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 h-10 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium text-xs rounded-xl transition-colors",
                              !isPrmValid && "pointer-events-none opacity-50"
                            )}
                          >
                            <ExternalLink size={14} />
                            Ouvrir le lien
                          </a>
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>

                {/* Détails techniques */}
                <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none rounded-3xl overflow-hidden shadow-xl">
                  <CardHeader className="py-4 px-6 border-b border-white/10">
                    <CardTitle className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Détails techniques</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4 p-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-slate-400">Endpoint API</span>
                      <span className="font-bold">Production v5.0</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-slate-400">Authentification</span>
                      <span className="font-bold">OAuth 2.0 (m2m)</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-slate-400">Identité client</span>
                      <span className="font-bold text-green-400">FranceConnect</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Status Gateway</span>
                      <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Opérationnel
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ─── Colonne droite ─── */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {!data ? (
                  <div className="h-full min-h-[600px] border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-muted-foreground p-12 text-center bg-white shadow-inner transition-all">
                    <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100 shadow-sm animate-bounce duration-[3000ms]">
                      <LayoutDashboard size={56} className="text-slate-200" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Prêt à visualiser</h3>
                    <p className="max-w-md text-lg text-slate-500 leading-relaxed">
                      Utilisez le panneau de gauche pour interroger un point de livraison ou demander le consentement au client.
                    </p>
                    {isPolling && (
                      <div className="mt-8 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 animate-pulse">
                        <Clock size={20} className="text-amber-600" />
                        <div className="text-left">
                          <p className="text-sm font-bold text-amber-800">En attente du consentement client…</p>
                          <p className="text-xs text-amber-700">Les données apparaîtront automatiquement ici ({pollingSeconds}s)</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700 flex flex-col gap-4">
                    <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all hover:shadow-blue-100/50">
                      <ConsumptionChart data={data} loading={loading} />
                    </div>

                    {/* JSON Panel */}
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950">
                      <button
                        onClick={() => setJsonOpen(o => !o)}
                        className="w-full flex items-center justify-between px-6 py-4 text-xs uppercase tracking-[0.2em] text-slate-400 font-bold hover:bg-white/5 transition-colors"
                      >
                        <span>Flux de données brut (JSON)</span>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(JSON.stringify(data, null, 2)); toast({ title: 'Copié !' }); }}
                          >
                            Copier
                          </span>
                          {jsonOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>
                      {jsonOpen && (
                        <pre className="text-[11px] text-blue-200/60 px-8 pb-8 overflow-auto max-h-[500px] font-mono leading-relaxed custom-scrollbar">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Onglet Historique ── */}
          <TabsContent value="history" className="m-0 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-8 border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Autorisations enregistrées</CardTitle>
                    <CardDescription className="text-base">Liste des consentements actifs récupérés dans le système</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm">
                    <CheckCircle2 size={16} />
                    {consents.length} PRM autorisés
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-widest font-bold">
                        <th className="px-8 py-5 border-b">PRM / Point de Livraison</th>
                        <th className="px-8 py-5 border-b">Date du Consentement</th>
                        <th className="px-8 py-5 border-b">Conso Annuelle</th>
                        <th className="px-8 py-5 border-b">Dernière mise à jour</th>
                        <th className="px-8 py-5 border-b">Expiration (Token)</th>
                        <th className="px-8 py-5 border-b text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {consents.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-8 py-20 text-center text-slate-400">
                            <Database size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="text-lg font-medium">Aucun consentement enregistré pour le moment</p>
                          </td>
                        </tr>
                      ) : (
                        consents.map((item) => (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                    <Database size={18} />
                                  </div>
                                  <span className="font-mono text-lg font-bold text-slate-700">{item.prm}</span>
                                </div>
                                {item.projectId && item.projectId !== 'admin_test' && (
                                  <a
                                    href={`/project/${item.projectId}/edit`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-11 inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-700 text-[10px] font-bold transition-colors"
                                  >
                                    LIÉ AU PROJET #{item.projectId.slice(-6)}
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                {item.titulaire && item.titulaire !== 'Inconnu' ? (
                                  <>
                                    <span className="font-bold text-slate-900">{item.titulaire}</span>
                                    <span className="text-xs text-slate-500">{item.adresse || 'Adresse non renseignée'}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Consentement accordé le</span>
                                    <span className="font-bold text-slate-700">{formatDate(item.updatedAt)}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <Activity size={14} className="text-blue-400" />
                                <span className="font-bold text-slate-700">{formatConso(item.annualConsumption)}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <RotateCw size={14} className="text-slate-300" />
                                {formatDate(item.updatedAt)}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar size={14} className="text-slate-300" />
                                {formatDate(item.expiresAt)}
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <Button
                                onClick={() => handleFetch(item.prm, item.projectId)}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 font-bold shadow-lg shadow-blue-100 transition-all hover:scale-105 active:scale-95 min-w-[100px]"
                              >
                                {fetchingPrm === item.prm ? <RotateCw className="h-4 w-4 animate-spin" /> : 'Ouvrir'}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EnedisPrintLayout
        visible={isPrinting}
        prm={prm}
        data={data}
        consent={consents.find(c => c.prm === prm) || {}}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
