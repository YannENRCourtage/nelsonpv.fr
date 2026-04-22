import React from 'react';
import { Info, CheckCircle2, AlertCircle, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ConsumptionChart from './ConsumptionChart';

/**
 * Composant conforme au contrat Data Connect Enedis (§3.2.4 et §3.2.5)
 * - Informations obligatoires avant partage (Linky, ≤ 36 kVA, finalité)
 * - Bouton Data Connect avec visuels officiels Enedis
 * - Durée de consentement : 3 ans max
 * - Messages de succès/d'échec
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

  const handleInterrogate = async () => {
    if (!enedisPrm || enedisPrm.length !== 14) {
      toast({ title: "PRM Invalide", description: "Veuillez saisir un PRM de 14 chiffres.", variant: "destructive" });
      return;
    }

    setIsEnedisLoading(true);
    try {
      const result = await enedisService.fetchData({ projectId, prm: enedisPrm });
      if (result && result.data && !result.data.daily?.error) {
        setEnedisData(result.data);
        setEnedisStatus('connected');
        toast({ title: "✅ Données récupérées", description: "Les données de consommation ont été récupérées avec succès." });
      } else {
        // Données partielles ou erreur sur un endpoint — on les affiche quand même
        setEnedisData(result?.data || null);
        setEnedisStatus('connected');
        toast({ title: "⚠️ Données partielles", description: "Certaines données n'ont pas pu être récupérées.", variant: "default" });
      }
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('expirée') || msg.includes('401')) {
        // Session expirée : re-déclencher le consentement avec le PRM
        toast({ title: "Session expirée", description: "Votre autorisation Enedis a expiré. Vous allez être redirigé.", variant: "destructive" });
      }
      // Pas de consentement ou session expirée : démarrer le flux OAuth avec le PRM
      // Le PRM est transmis pour que la page de consentement Enedis s'affiche correctement
      enedisService.initiateAuth(projectId, enedisPrm);
    } finally {
      setIsEnedisLoading(false);
    }
  };

  const handleReset = () => {
    setEnedisData(null);
    setEnedisPrm('');
    setEnedisStatus('idle');
  };

  return (
    <div className="mt-6 border-t pt-5">
      {/* En-tête avec logo Enedis officiel */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <img
            src="/images/enedis/enedis-logo-couleur.png"
            alt="Logo Enedis"
            className="h-6 object-contain"
          />
          <span className="text-sm font-semibold text-gray-700">Data Connect</span>
        </div>
        {enedisStatus === 'connected' && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <CheckCircle2 size={12} />
            Connecté
          </span>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">

        {/* ─── BLOC INFORMATIONS OBLIGATOIRES (§3.2.5) ─── */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <div className="flex items-start gap-2 mb-2">
            <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide">
              Informations sur le service
            </p>
          </div>
          <ul className="space-y-1.5 pl-5">
            <li className="text-[11px] text-blue-900 leading-snug">
              <span className="font-medium">Finalité :</span> Ce service vous permet de visualiser et d'analyser la courbe de charge et la consommation journalière du client pour dimensionner votre installation photovoltaïque.
            </li>
            <li className="text-[11px] text-blue-900 leading-snug">
              <span className="font-medium">Réservé aux Compteurs Communicants (Linky).</span> Le client doit disposer d'un tel compteur.
            </li>
            <li className="text-[11px] text-blue-900 leading-snug">
              <span className="font-medium">Puissance souscrite ≤ 36 kVA</span> avec un contrat de fourniture d'électricité actif.
            </li>
            <li className="text-[11px] text-blue-900 leading-snug">
              <span className="font-medium">Durée du consentement :</span> 3 ans maximum. Le client peut révoquer son accès à tout moment depuis son espace client Enedis.
            </li>
          </ul>
        </div>

        {/* ─── SAISIE PRM ─── */}
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
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

          {/* ─── BOUTON DATA CONNECT OFFICIEL (§3.2.4) ─── */}
          <div className="flex gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleInterrogate}
              disabled={isEnedisLoading || !projectId || projectId === 'new'}
              className={cn(
                "flex-1 md:flex-none h-10 rounded-lg overflow-hidden transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#008ECE] focus:ring-offset-1",
                isEnedisLoading && "animate-pulse"
              )}
              title="J'accède à mon espace client Enedis"
            >
              {isEnedisLoading ? (
                <div className="flex items-center gap-2 px-4 h-10 bg-[#008ECE] text-white text-sm font-medium">
                  <RotateCw className="h-4 w-4 animate-spin" />
                  Chargement…
                </div>
              ) : enedisStatus === 'connected' ? (
                <div className="flex items-center gap-2 px-4 h-10 bg-green-600 text-white text-sm font-medium">
                  <RotateCw className="h-4 w-4" />
                  Actualiser
                </div>
              ) : (
                <img
                  src="/images/enedis/enedis-bouton-bleu.png"
                  alt="J'accède à mon espace client Enedis"
                  className="h-10 object-contain"
                />
              )}
            </button>

            {enedisStatus === 'connected' && (
              <button
                type="button"
                onClick={handleReset}
                className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:text-red-500 hover:border-red-300 transition-colors"
                title="Déconnecter"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ─── Message projet non sauvegardé ─── */}
        {(!projectId || projectId === 'new') && (
          <p className="text-[10px] text-amber-600 italic">
            Veuillez d'abord sauvegarder le projet pour activer l'intégration Enedis.
          </p>
        )}

        {/* ─── Message d'info (PRM saisi, pas encore de consentement) ─── */}
        {enedisStatus === 'disconnected' && !isEnedisLoading && !enedisData && enedisPrm.length === 14 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Consentement requis</p>
              <p className="text-[11px] text-amber-700 leading-snug">
                Aucun accès autorisé pour ce PRM. Cliquez sur le bouton ci-dessus pour rediriger le client vers son espace Enedis afin qu'il donne son consentement. Il sera ensuite redirigé automatiquement vers ce service.
              </p>
            </div>
          </div>
        )}

        {/* ─── Message de SUCCÈS ─── */}
        {enedisStatus === 'connected' && enedisData && (
          <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg flex gap-2 items-center animate-in fade-in">
            <CheckCircle2 size={14} className="text-green-600 shrink-0" />
            <p className="text-[11px] text-green-800 leading-snug">
              Consentement actif. Les données de consommation sont disponibles pour ce PRM.
            </p>
          </div>
        )}

        {/* ─── Graphiques de consommation ─── */}
        {enedisData && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className={cn("rounded-lg overflow-hidden bg-white border border-slate-200", isEnedisLoading && "opacity-60")}>
              <ConsumptionChart data={enedisData} loading={isEnedisLoading} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnedisDataConnect;
