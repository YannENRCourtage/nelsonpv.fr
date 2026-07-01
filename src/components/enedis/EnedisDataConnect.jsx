import React, { useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2, AlertCircle, RotateCw, X, Copy, ExternalLink,
  Smartphone, Mail, Users, Zap, Clock, QrCode, Info, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ConsumptionChart from './ConsumptionChart';
import { useEnedisPolling } from '@/hooks/useEnedisPolling';

/**
 * Composant Data Connect Enedis — version simplifiée
 * Deux modes d'UX : client présent (QR code) / client absent (lien à envoyer)
 * Auto-détection du consentement par polling
 */
const EnedisDataConnect = ({
  projectId,
  enedisPrm,
  setEnedisPrm,
  enedisData,
  setEnedisData,
  enedisStatus,
  setEnedisStatus,
  isEnedisLoading,
  setIsEnedisLoading,
  enedisService,
  toast,
}) => {
  // Mode : 'present' (client là) ou 'absent' (envoyer lien)
  const [shareMode, setShareMode] = useState('present');
  const [isPolling, setIsPolling] = useState(false);
  const [pollingSeconds, setPollingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const consentUrl = projectId && projectId !== 'new' && enedisPrm?.length === 14
    ? `${window.location.origin}${enedisService.getAuthorizeUrl(projectId, enedisPrm)}`
    : null;

  // QR code via API Google Charts (sans dépendance npm)
  const qrUrl = consentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(consentUrl)}`
    : null;

  // Auto-détection : polling toutes les 8s quand le partage est actif
  const handleConsentDetected = useCallback(async (consentInfo) => {
    setIsPolling(false);
    setIsEnedisLoading(true);
    try {
      const result = await enedisService.fetchData({ projectId, prm: consentInfo.prm });
      if (result?.data) {
        setEnedisData(result.data);
        setEnedisStatus('connected');
        toast({
          title: '✅ Consentement reçu !',
          description: `Les données de consommation du PRM ${consentInfo.prm} sont disponibles.`
        });
      }
    } catch (e) {
      setEnedisStatus('disconnected');
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setIsEnedisLoading(false);
    }
  }, [projectId, enedisService, setEnedisData, setEnedisStatus, setIsEnedisLoading, toast]);

  const { resetPolling } = useEnedisPolling({
    prm: enedisPrm,
    active: isPolling,
    onConsentDetected: handleConsentDetected,
    intervalMs: 8000,
  });

  // Compteur de secondes pendant le polling
  useEffect(() => {
    if (!isPolling) { setPollingSeconds(0); return; }
    const t = setInterval(() => setPollingSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isPolling]);

  const handleStartSharing = () => {
    if (!consentUrl) return;
    resetPolling(enedisPrm);
    setIsPolling(true);
    setShowQR(true);
    if (shareMode === 'present') {
      // Mode client présent : juste montrer le QR code
    }
    // Dans les deux cas le polling tourne en arrière-plan
  };

  const handleCopyLink = async () => {
    if (!consentUrl) return;
    try {
      await navigator.clipboard.writeText(consentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast({ title: 'Lien copié !', description: 'Partagez ce lien au client pour qu\'il donne son consentement.' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier le lien.', variant: 'destructive' });
    }
  };

  const handleStopPolling = () => {
    setIsPolling(false);
    setShowQR(false);
    setPollingSeconds(0);
  };

  const handleInterrogate = async () => {
    if (!enedisPrm || enedisPrm.length !== 14) {
      toast({ title: 'PRM Invalide', description: 'Veuillez saisir un PRM de 14 chiffres.', variant: 'destructive' });
      return;
    }
    setIsEnedisLoading(true);
    try {
      const result = await enedisService.fetchData({ projectId, prm: enedisPrm });
      if (result?.data) {
        setEnedisData(result.data);
        setEnedisStatus('connected');
        toast({ title: '✅ Données récupérées', description: 'Les données de consommation sont disponibles.' });
      }
    } catch (e) {
      // Si pas de consentement, proposer de partager
      if (e.message?.includes('consentement')) {
        setEnedisStatus('disconnected');
        toast({ title: 'Consentement requis', description: 'Partagez le lien ci-dessous avec votre client.', variant: 'destructive' });
      } else {
        toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      }
    } finally {
      setIsEnedisLoading(false);
    }
  };

  const handleReset = () => {
    handleStopPolling();
    setEnedisData(null);
    setEnedisPrm('');
    setEnedisStatus('idle');
  };

  const isReady = !!projectId && projectId !== 'new' && enedisPrm?.length === 14;

  return (
    <div className="mt-6 border-t pt-5">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <img src="/images/enedis/enedis-logo-couleur.png" alt="Logo Enedis" className="h-6 object-contain" />
          <span className="text-sm font-semibold text-gray-700">Data Connect</span>
        </div>
        {enedisStatus === 'connected' && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <CheckCircle2 size={12} />
            Connecté
          </span>
        )}
        {isPolling && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 animate-pulse">
            <Clock size={12} />
            En attente… {pollingSeconds}s
          </span>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">

        {/* Notice Enedis obligatoire */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <div className="flex items-start gap-2 mb-2">
            <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide">Informations sur le service</p>
          </div>
          <ul className="space-y-1.5 pl-5">
            <li className="text-[11px] text-blue-900 leading-snug italic mb-1 border-b border-blue-100 pb-1">
              Enedis est le gestionnaire du réseau public de distribution d'électricité sur 95% du territoire français continental.
            </li>
            <li className="text-[11px] text-blue-900 leading-snug">
              <span className="font-medium">Finalité :</span> Visualiser la consommation journalière pour dimensionner votre installation photovoltaïque.
            </li>
            <li className="text-[11px] text-blue-900 leading-snug">
              <span className="font-medium">Durée :</span> Consentement 3 ans max, révocable à tout moment.
            </li>
          </ul>
        </div>

        {/* Saisie PRM */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
            Numéro PRM (14 chiffres)
          </label>
          <div className="relative">
            <Input
              value={enedisPrm}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 14);
                setEnedisPrm(val);
                if (val !== enedisPrm) {
                  setEnedisData(null);
                  setEnedisStatus('idle');
                  handleStopPolling();
                }
              }}
              placeholder="Ex: 12345678901234"
              className="bg-white border-slate-300 h-10 pr-10 font-mono text-sm"
            />
            {enedisData && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            )}
          </div>
        </div>

        {/* Si données disponibles : bouton actualiser + reset */}
        {enedisStatus === 'connected' && enedisData && (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleInterrogate}
              disabled={isEnedisLoading || !isReady}
              className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
            >
              {isEnedisLoading ? <RotateCw className="h-4 w-4 animate-spin mr-2" /> : <RotateCw className="h-4 w-4 mr-2" />}
              Actualiser
            </Button>
            <button
              type="button"
              onClick={handleReset}
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:text-red-500 hover:border-red-300 transition-colors"
              title="Déconnecter"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Si pas encore de consentement : interface de partage */}
        {enedisStatus !== 'connected' && isReady && (
          <div className="space-y-3">
            {/* Vérifier d'abord si un consentement existe déjà */}
            <Button
              type="button"
              onClick={handleInterrogate}
              disabled={isEnedisLoading}
              variant="outline"
              className="w-full h-10 border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium"
            >
              {isEnedisLoading
                ? <><RotateCw className="h-4 w-4 animate-spin mr-2" />Vérification…</>
                : <><Zap className="h-4 w-4 mr-2 text-blue-500" />Vérifier si le consentement existe déjà</>
              }
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-slate-50 px-3 text-slate-400 font-bold">ou demander le consentement</span>
              </div>
            </div>

            {/* Choix du mode */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShareMode('present')}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  shareMode === 'present'
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <Smartphone size={18} className="mb-1.5" />
                <p className="text-xs font-bold">Client présent</p>
                <p className="text-[10px] opacity-70">Scannez le QR code sur son téléphone</p>
              </button>
              <button
                type="button"
                onClick={() => setShareMode('absent')}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  shareMode === 'absent'
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <Mail size={18} className="mb-1.5" />
                <p className="text-xs font-bold">Client absent</p>
                <p className="text-[10px] opacity-70">Copiez le lien à lui envoyer</p>
              </button>
            </div>

            {/* Action selon le mode */}
            {shareMode === 'present' ? (
              <div className="space-y-2">
                {!showQR ? (
                  <button
                    type="button"
                    onClick={handleStartSharing}
                    disabled={!isReady}
                    className="w-full transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="relative overflow-hidden rounded-xl border-2 border-transparent group-hover:border-blue-400 transition-all">
                      <div className="flex items-center justify-center gap-3 h-12 bg-[#008ECE] text-white font-bold text-sm rounded-xl">
                        <QrCode size={18} />
                        Afficher le QR code de consentement
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center space-y-3">
                    <p className="text-xs font-bold text-slate-700">📱 Faites scanner ce QR code par le client</p>
                    <p className="text-[10px] text-slate-500">Il peut utiliser <span className="font-bold text-blue-600">FranceConnect</span> — pas besoin de créer un compte Enedis</p>
                    {qrUrl && (
                      <div className="flex justify-center">
                        <img src={qrUrl} alt="QR code consentement Enedis" className="w-40 h-40 rounded-lg shadow-md" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <Clock size={14} className="text-amber-600 shrink-0 animate-pulse" />
                      <p className="text-[11px] text-amber-800">
                        {isPolling
                          ? `Détection automatique en cours… (${pollingSeconds}s)`
                          : 'Démarrage de la détection automatique…'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStopPolling}
                      className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700">Comment ça marche :</p>
                  <ol className="space-y-1 text-[11px] text-slate-600 pl-3">
                    <li className="flex gap-2"><span className="font-bold text-blue-600">1.</span> Copiez le lien ci-dessous</li>
                    <li className="flex gap-2"><span className="font-bold text-blue-600">2.</span> Envoyez-le par email ou SMS au client</li>
                    <li className="flex gap-2"><span className="font-bold text-blue-600">3.</span> Il clique et s'identifie avec <span className="font-bold">FranceConnect</span> <em>(sans créer de compte Enedis)</em></li>
                    <li className="flex gap-2"><span className="font-bold text-blue-600">4.</span> Ses données apparaissent ici automatiquement</li>
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={() => { handleCopyLink(); if (!isPolling) { resetPolling(enedisPrm); setIsPolling(true); } }}
                  className="w-full flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copied ? 'Lien copié !' : 'Copier le lien de consentement'}
                </button>

                {isPolling && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <Clock size={14} className="text-amber-600 shrink-0 animate-pulse" />
                    <p className="text-[11px] text-amber-800 flex-1">
                      Détection automatique active — vous serez averti dès que le client aura consenti ({pollingSeconds}s)
                    </p>
                    <button type="button" onClick={handleStopPolling} className="text-amber-600 hover:text-amber-800">
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <a
                    href={consentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 h-9 border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-medium text-xs rounded-lg transition-colors"
                  >
                    <ExternalLink size={14} />
                    Ouvrir le lien
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message projet non sauvegardé */}
        {(!projectId || projectId === 'new') && (
          <p className="text-[10px] text-amber-600 italic">
            Veuillez d'abord sauvegarder le projet pour activer l'intégration Enedis.
          </p>
        )}

        {/* Succès — graphiques */}
        {enedisStatus === 'connected' && enedisData && (
          <>
            <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg flex gap-2 items-center animate-in fade-in">
              <CheckCircle2 size={14} className="text-green-600 shrink-0" />
              <p className="text-[11px] text-green-800 leading-snug">
                Consentement actif. Les données de consommation sont disponibles pour ce PRM.
              </p>
            </div>
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className={cn("rounded-lg overflow-hidden bg-white border border-slate-200", isEnedisLoading && "opacity-60")}>
                <ConsumptionChart data={enedisData} loading={isEnedisLoading} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnedisDataConnect;
