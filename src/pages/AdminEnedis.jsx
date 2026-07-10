import React, { useState, useEffect, useCallback } from 'react';
import { Info, CheckCircle2, RotateCw, Search, Activity, Database, Key, History, LayoutDashboard, ExternalLink, Calendar, ChevronDown, ChevronUp, FileText, Copy, Mail, X, Send, User, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import enedisService from '@/services/enedis';
import ConsumptionChart from '@/components/enedis/ConsumptionChart';
import EnedisPrintLayout from '@/components/enedis/EnedisPrintLayout';

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

  // État du modal de consentement (email uniquement)
  const [consentModal, setConsentModal] = useState(false);
  const [consentForm, setConsentForm] = useState({ name: '', email: '' });
  const [consentSent, setConsentSent] = useState(false);

  const { toast } = useToast();

  // Charger les consentements via API Admin (contourne les règles Firestore)
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
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadConsents, 30000);
    return () => clearInterval(interval);
  }, [loadConsents]);

  // Auto-fetch si redirigé avec succès depuis le callback Enedis
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successPrm = params.get('prm');
    const enedisStatus = params.get('enedis');
    const msg = params.get('message');

    if (successPrm) {
      setPrm(successPrm);
      if (enedisStatus === 'success') {
        window.history.replaceState({}, document.title, window.location.pathname);
        // Recharger l'historique puis récupérer les données
        setTimeout(() => { loadConsents(); handleFetch(successPrm); }, 800);
      }
    } else if (enedisStatus === 'error' && msg) {
      toast({ 
        title: "Erreur Enedis", 
        description: decodeURIComponent(msg), 
        variant: "destructive" 
      });
    }
  }, []);

  const handleFetch = async (prmToFetch, projectIdToFetch) => {
    // Si prmToFetch n'est pas fourni (clic depuis l'onglet Interrogation), on utilise l'état 'prm'
    const targetPrm = (prmToFetch && typeof prmToFetch === 'string' ? prmToFetch : prm).trim();
    const targetProjectId = projectIdToFetch || 'admin_test';

    if (!targetPrm || targetPrm.length !== 14) {
      toast({ 
        title: "PRM Invalide", 
        description: "Veuillez saisir un PRM de 14 chiffres.", 
        variant: "destructive" 
      });
      return;
    }

    setFetchingPrm(targetPrm);
    setLoading(true);
    try {
      const result = await enedisService.fetchData({ 
        prm: targetPrm, 
        projectId: targetProjectId 
      });
      
      // On vérifie que les données récupérées ne sont pas toutes en erreur
      const hasValidData = result?.data && (
        !result.data.daily?.error ||
        !result.data.loadCurve?.error ||
        !result.data.maxPower?.error
      );
      
      if (hasValidData) {
        setData(result.data);
        setStatus('connected');
        setPrm(targetPrm);
        setActiveTab('interrogation');
        loadConsents(); // Rafraîchir l'historique après récupération
        toast({ 
          title: "Succès", 
          description: "Données récupérées pour le PRM " + targetPrm 
        });
      } else {
        setStatus('disconnected');
        
        let errorMsg = "Aucun consentement trouvé ou données non disponibles pour ce PRM.";
        if (result?.data?.daily?.error) {
          const status = result.data.daily.status;
          if (status === 500) {
            errorMsg = "Erreur 500 côté Enedis : Ce compteur est probablement inactif, ou ses données de consommation ne sont pas encore accessibles.";
          } else if (status === 403 || status === 404) {
            errorMsg = "Erreur 403/404 côté Enedis : Période non disponible ou consentement invalide.";
          }
        }
        
        toast({ 
          title: "Données indisponibles", 
          description: errorMsg, 
          variant: "destructive" 
        });
      }
    } catch (err) {
      console.error(err);
      setStatus('disconnected');
      toast({ 
        title: "Erreur", 
        description: err.message || "Erreur lors de la récupération", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
      setFetchingPrm(null);
    }
  };

  const handleInitAuth = () => {
    if (!prm || prm.length !== 14) {
      toast({ 
        title: "PRM Invalide", 
        description: "Veuillez saisir un PRM pour initier l'autorisation.", 
        variant: "destructive" 
      });
      return;
    }
    // Redirige vers Enedis
    enedisService.initiateAuth('admin_test', prm);
  };

  // Ouvrir le modal de consentement
  const openConsentModal = (prmOverride) => {
    const targetPrm = prmOverride || prm;
    if (!targetPrm || targetPrm.length !== 14) {
      toast({ 
        title: "PRM Invalide", 
        description: "Veuillez saisir un PRM pour envoyer le consentement.", 
        variant: "destructive" 
      });
      return;
    }
    if (prmOverride) setPrm(prmOverride);
    setConsentSent(false);
    setConsentForm({ name: '', email: '' });
    setConsentModal(true);
  };

  // Générer l'URL de consentement
  const getConsentUrl = (targetPrm) => {
    const params = new URLSearchParams({ projectId: 'admin_test' });
    if (targetPrm) params.append('prm', targetPrm);
    return window.location.origin + `/api/enedis/auth?${params.toString()}`;
  };

  // Copier le lien dans le presse-papiers
  const handleCopyLink = async () => {
    const url = getConsentUrl(prm);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Lien copié !", description: "Envoyez ce lien au client par e-mail ou SMS." });
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de copier le lien.", variant: "destructive" });
    }
  };

  // Envoyer le consentement par email via mailto: (client mail local — Outlook, etc.)
  const handleSendEmail = () => {
    const targetPrm = prm.trim();
    if (!consentForm.email || !consentForm.email.includes('@')) {
      toast({ title: "Email invalide", description: "Veuillez saisir une adresse email valide.", variant: "destructive" });
      return;
    }
    const url = getConsentUrl(targetPrm);
    const clientName = consentForm.name || 'Client';
    const subject = encodeURIComponent(`Autorisation Enedis Data Connect — PRM ${targetPrm}`);
    const body = encodeURIComponent(
      `Bonjour ${clientName},\r\n\r\n` +
      `Dans le cadre de votre projet photovoltaïque, nous souhaitons accéder à vos données de consommation électrique via Enedis Data Connect.\r\n\r\n` +
      `Cliquez sur le lien ci-dessous pour donner votre accord (consentement de 3 ans maximum, révocable à tout moment) :\r\n\r\n` +
      `${url}\r\n\r\n` +
      `✅ Vous pouvez vous identifier avec FranceConnect (Impôts, Ameli, France Identité…) — aucun compte Enedis n'est nécessaire.\r\n\r\n` +
      `Cordialement,\r\nENR Courtage Énergie`
    );
    const mailto = `mailto:${encodeURIComponent(consentForm.email)}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    setConsentSent(true);
    toast({ title: "Client mail ouvert ✓", description: `L'email est pré-rempli pour ${consentForm.email}` });
  };

  const handlePdf = useCallback(() => {
    if (!data) { toast({ title: 'Aucune donnée', description: `Récupérez d'abord les données.`, variant: 'destructive' }); return; }
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrinting(false), 500);
    }, 400);
  }, [data, toast]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return 'Date invalide'; }
  };

  const formatConso = (conso) => {
    if (conso === undefined || conso === null) return 'N/A';
    return new Intl.NumberFormat('fr-FR').format(conso) + ' kWh';
  };

  // Fermer le modal
  const closeConsentModal = () => {
    setConsentModal(false);
    setConsentSent(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="container mx-auto py-8 px-6 max-w-[1600px]">
        {/* Header de la page */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-xl shadow-blue-200">
              <Activity size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <img
                  src="/images/enedis/enedis-logo-couleur.png"
                  alt="Logo Enedis"
                  className="h-7 object-contain"
                />
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Data Connect</h1>
              </div>
              <p className="text-slate-500 text-base mt-1 font-medium">
                Administration & Monitoring des flux Production v5
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status === 'connected' && (
              <div className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-100 border-2 border-green-200 rounded-2xl px-6 py-2.5 shadow-sm animate-in fade-in zoom-in duration-300">
                <CheckCircle2 size={18} />
                PRM ACTIF : {prm}
              </div>
            )}
            {data && (
              <Button
                variant="outline"
                className="rounded-2xl h-12 px-5 border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-100 font-bold"
                onClick={handlePdf}
              >
                <FileText size={18} className="mr-2" />
                PDF
              </Button>
            )}
            <Button
                variant="outline"
                className="rounded-2xl h-12 px-6 border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                onClick={() => { setData(null); setStatus('idle'); setPrm(''); }}
            >
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

          <TabsContent value="interrogation" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" style={{ alignItems: 'stretch' }}>
              {/* Colonne gauche (3/12) — flex pour aligner Détails techniques en bas */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                <Card className="flex-1 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/80 border-b p-6">
                    <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Key size={20} />
                      </div>
                      Accès aux données
                    </CardTitle>
                    <CardDescription>Saisissez un PRM pour interroger les serveurs Enedis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 p-8">
                    {/* Phrases obligatoires Enedis */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Info size={16} className="text-blue-600 shrink-0" />
                        <p className="text-[11px] font-extrabold text-blue-800 uppercase tracking-widest">
                          Service Public de Distribution
                        </p>
                      </div>
                      <p className="text-xs text-blue-900 leading-relaxed italic border-b border-blue-200/50 pb-3">
                        Enedis est le gestionnaire du réseau public de distribution d'électricité sur 95% du territoire français continental.
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-xs text-blue-900 leading-relaxed">
                          <span className="font-bold">Finalité :</span> Ce service permet de visualiser la courbe de charge et la consommation journalière pour dimensionner l'installation photovoltaïque.
                        </p>
                        <p className="text-xs text-blue-900 leading-relaxed">
                          <span className="font-bold">Durée :</span> Consentement de 3 ans maximum, révocable à tout moment.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase text-slate-500 tracking-widest ml-1">Numéro PRM (14 chiffres)</label>
                      <div className="relative">
                        <Input 
                          value={prm}
                          onChange={e => setPrm(e.target.value.replace(/\D/g, '').slice(0, 14))}
                          placeholder="Ex: 16138350177475"
                          className="font-mono text-2xl h-16 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 pl-14 transition-all"
                        />
                        <Database className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-2">
                      <Button 
                        onClick={() => handleFetch()} 
                        disabled={loading || prm.length !== 14}
                        className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {loading ? <RotateCw className="mr-3 h-5 w-5 animate-spin" /> : <Activity className="mr-3 h-5 w-5" />}
                        Récupérer les données
                      </Button>
                      
                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                        <div className="relative flex justify-center text-[11px] uppercase tracking-[0.2em]"><span className="bg-white px-4 text-slate-400 font-bold">Ou obtenir l'accès</span></div>
                      </div>

                      <button 
                        onClick={handleInitAuth}
                        disabled={loading || prm.length !== 14}
                        className="w-full transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="relative overflow-hidden rounded-2xl border-2 border-transparent group-hover:border-blue-400 transition-all">
                          <img 
                            src="/images/enedis/enedis-bouton-bleu.png" 
                            alt="J'accède à mon espace client Enedis"
                            className="h-14 w-full object-contain pointer-events-none"
                          />
                        </div>
                      </button>

                      {/* ===== NOUVEAU BOUTON : Envoyer le consentement ===== */}
                      <button
                        onClick={() => openConsentModal()}
                        disabled={prm.length !== 14}
                        className="w-full disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 group-hover:shadow-emerald-300 group-hover:scale-[1.02] active:scale-[0.98] h-12 flex items-center justify-center gap-3">
                          <Send size={18} className="text-white" />
                          <span className="text-white font-bold text-sm">Envoyer le consentement</span>
                          <div className="flex gap-1 ml-1">
                            <Mail size={13} className="text-emerald-200" />
                            <span className="text-emerald-200 text-xs font-bold">/</span>
                            <MessageCircle size={13} className="text-emerald-200" />
                          </div>
                        </div>
                      </button>

                      {/* Guide d'aide au consentement */}
                      <div className="mt-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Info size={14} className="text-amber-600 shrink-0" />
                          <p className="text-[11px] font-extrabold text-amber-800 uppercase tracking-widest">
                            Simplifiez le consentement client
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-amber-900 leading-relaxed">
                            Utilisez <span className="font-bold">"Envoyer le consentement"</span> pour transmettre le lien directement par <span className="font-bold">email ou WhatsApp</span>.
                          </p>
                          <ul className="list-disc list-inside space-y-1.5 text-xs text-amber-900 leading-relaxed pl-1 mt-2">
                            <li>Le client clique sur le lien depuis son appareil.</li>
                            <li>Il s'identifie avec <span className="font-bold">FranceConnect</span> (pas besoin de créer de compte Enedis).</li>
                            <li>Dès qu'il valide, les données remontent automatiquement ici.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Status Gateway</span>
                        <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            Opérationnel
                        </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Colonne droite (9/12) — flex pour aligner JSON avec Détails techniques */}
              <div className="lg:col-span-9 flex flex-col gap-4">
                {!data ? (
                  <div className="h-full min-h-[600px] border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-muted-foreground p-12 text-center bg-white shadow-inner transition-all">
                    <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100 shadow-sm animate-bounce duration-[3000ms]">
                      <LayoutDashboard size={56} className="text-slate-200" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Prêt à visualiser</h3>
                    <p className="max-w-md text-lg text-slate-500 leading-relaxed">
                      Utilisez le panneau de gauche pour interroger un point de livraison. Les graphiques de consommation et de puissance s'afficheront ici.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700 flex flex-col gap-4">
                    <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all hover:shadow-blue-100/50">
                      <ConsumptionChart data={data} loading={loading} />
                    </div>

                    {/* JSON Panel — collapsible */}
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
                              <div className="flex items-center justify-end gap-2">
                                {/* Bouton Renvoyer le consentement depuis l'historique */}
                                <Button
                                  variant="outline"
                                  onClick={() => openConsentModal(item.prm)}
                                  disabled={loading}
                                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl px-3 font-bold text-xs h-9"
                                  title="Envoyer le lien de consentement"
                                >
                                  <Send size={13} className="mr-1" />
                                  Renvoyer
                                </Button>
                                <Button 
                                  onClick={() => handleFetch(item.prm, item.projectId)}
                                  disabled={loading}
                                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 font-bold shadow-lg shadow-blue-100 transition-all hover:scale-105 active:scale-95 min-w-[100px]"
                                >
                                  {fetchingPrm === item.prm ? <RotateCw className="h-4 w-4 animate-spin" /> : 'Ouvrir'}
                                </Button>
                              </div>
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

      {/* ===== MODAL DE CONSENTEMENT PAR EMAIL ===== */}
      {consentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeConsentModal} />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-7 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-0.5">Enedis Data Connect</p>
                  <h2 className="text-white text-lg font-extrabold">Envoyer le consentement</h2>
                </div>
                <button onClick={closeConsentModal} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5">
                <Database size={13} className="text-blue-200" />
                <span className="text-white font-mono font-bold text-sm tracking-wider">{prm}</span>
              </div>
            </div>

            {/* Corps */}
            {consentSent ? (
              <div className="p-7 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <Check size={30} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">Client mail ouvert !</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">
                  L'email est pré-rempli avec le lien de consentement pour <strong>{consentForm.email}</strong>. Vérifiez et envoyez depuis votre messagerie.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 w-full text-left mb-5">
                  <p className="text-amber-900 text-xs leading-relaxed">
                    📌 Une fois que le client a cliqué sur le lien et validé avec <strong>FranceConnect</strong>, les données apparaîtront automatiquement dans l'onglet <strong>Historique</strong>.
                  </p>
                </div>
                <div className="flex gap-3 w-full">
                  <Button variant="outline" onClick={() => setConsentSent(false)} className="flex-1 rounded-xl h-10 font-bold border-slate-200">Renvoyer</Button>
                  <Button onClick={closeConsentModal} className="flex-1 rounded-xl h-10 font-bold bg-blue-600 hover:bg-blue-700 text-white">Fermer</Button>
                </div>
              </div>
            ) : (
              <div className="p-7 space-y-5">
                {/* Nom (optionnel) */}
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-1.5 block">
                    Nom du client <span className="text-slate-400 normal-case font-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <Input
                      value={consentForm.name}
                      onChange={e => setConsentForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: Jean Dupont"
                      className="pl-9 rounded-xl h-11 border-slate-200"
                    />
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Email (obligatoire) */}
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-1.5 block">
                    Email du client <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={consentForm.email}
                      onChange={e => setConsentForm(f => ({ ...f, email: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && consentForm.email && handleSendEmail()}
                      placeholder="client@exemple.fr"
                      className="pl-9 rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                      autoFocus
                    />
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    ✅ Le client s'identifie via <strong>FranceConnect</strong> (Impôts, Ameli…) — <strong>aucun compte Enedis nécessaire</strong>.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    onClick={handleSendEmail}
                    disabled={!consentForm.email || !consentForm.email.includes('@')}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Ouvrir mon client mail
                  </Button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full h-9 flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold transition-colors rounded-xl hover:bg-slate-50"
                  >
                    <Link2 size={12} />
                    Copier le lien uniquement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
