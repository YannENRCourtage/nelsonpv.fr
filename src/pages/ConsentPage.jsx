import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Shield, Zap, Clock, Loader2 } from 'lucide-react';

/**
 * Page publique de consentement ENEDIS
 * Accessible sans authentification via /consent/:token
 * Le client valide son consentement directement sur Nelson
 */
export default function ConsentPage() {
  const { token } = useParams();
  const [consentInfo, setConsentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState('loading'); // loading, pending, accepted, expired, error

  // Charger les infos du consentement
  useEffect(() => {
    if (!token) { setStatus('error'); setLoading(false); return; }

    const loadConsent = async () => {
      try {
        const res = await fetch(`/api/enedis/consent?action=get_info&token=${token}`);
        const data = await res.json();
        if (!res.ok) {
          setStatus(data.status === 'expired' ? 'expired' : 'error');
          setLoading(false);
          return;
        }
        setConsentInfo(data);
        setStatus(data.status === 'accepted' ? 'accepted' : 'pending');
      } catch (e) {
        setStatus('error');
      } finally {
        setLoading(false);
      }
    };
    loadConsent();
  }, [token]);

  // Valider le consentement
  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await fetch('/api/enedis/consent?action=validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('accepted');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src="/logo-nelson.png" alt="Nelson" className="h-8 object-contain" />
          <span className="text-xs text-slate-400 font-medium">×</span>
          <img src="/images/enedis/enedis-logo-couleur.png" alt="Enedis" className="h-5 object-contain" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* ─── État : En attente de validation ─── */}
          {status === 'pending' && consentInfo && (
            <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
              {/* Badge sécurité */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">Autorisation d'accès</h1>
                    <p className="text-blue-100 text-sm">Données de consommation électrique</p>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 space-y-6">
                {/* Infos */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Point de livraison</span>
                    <span className="font-mono text-base font-bold text-slate-800">{consentInfo.prm}</span>
                  </div>
                  {consentInfo.clientName && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titulaire</span>
                      <span className="text-sm font-semibold text-slate-700">{consentInfo.clientName}</span>
                    </div>
                  )}
                </div>

                {/* Explication */}
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-slate-800">En cliquant sur "J'accepte", vous autorisez :</h2>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3 text-sm text-slate-600">
                      <Zap size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <span>L'accès à vos <strong>données de consommation électrique journalière</strong> pour votre point de livraison</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-600">
                      <Shield size={16} className="text-green-500 shrink-0 mt-0.5" />
                      <span>Le traitement de ces données uniquement pour <strong>dimensionner votre installation photovoltaïque</strong></span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-600">
                      <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>Un consentement d'une durée de <strong>3 ans maximum</strong>, révocable à tout moment</span>
                    </li>
                  </ul>
                </div>

                {/* Notice légale */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    <strong>Enedis</strong> est le gestionnaire du réseau public de distribution d'électricité 
                    sur 95% du territoire français continental. Vos données sont récupérées de manière sécurisée 
                    via l'interface Data Connect d'Enedis et sont utilisées uniquement dans le cadre du 
                    dimensionnement de votre projet solaire.
                  </p>
                </div>

                {/* Bouton validation */}
                <button
                  onClick={handleValidate}
                  disabled={validating}
                  className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {validating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Validation en cours…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      J'accepte et j'autorise l'accès
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-400">
                  En validant, vous acceptez les <a href="/mentions-legales" className="underline hover:text-slate-600">mentions légales</a> et 
                  la <a href="/politique-confidentialite" className="underline hover:text-slate-600">politique de confidentialité</a>.
                </p>
              </div>
            </div>
          )}

          {/* ─── État : Consentement accepté ─── */}
          {status === 'accepted' && (
            <div className="bg-white rounded-3xl shadow-2xl shadow-green-100/60 border border-green-100 overflow-hidden text-center px-8 py-12 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                <CheckCircle2 size={40} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">Consentement validé !</h1>
              <p className="text-slate-600 max-w-sm mx-auto leading-relaxed mb-6">
                Merci ! Votre autorisation a bien été enregistrée. Votre installateur peut maintenant 
                accéder à vos données de consommation pour dimensionner votre installation solaire.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-800 font-medium">
                  ✅ Vous pouvez fermer cette page en toute sécurité.
                </p>
              </div>
            </div>
          )}

          {/* ─── État : Expiré ─── */}
          {status === 'expired' && (
            <div className="bg-white rounded-3xl shadow-2xl border border-amber-100 overflow-hidden text-center px-8 py-12 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-200">
                <Clock size={40} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">Demande expirée</h1>
              <p className="text-slate-600 max-w-sm mx-auto leading-relaxed">
                Cette demande de consentement a expiré. Veuillez contacter votre installateur 
                pour qu'il vous envoie un nouveau lien.
              </p>
            </div>
          )}

          {/* ─── État : Erreur ─── */}
          {status === 'error' && (
            <div className="bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden text-center px-8 py-12 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-200">
                <AlertCircle size={40} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">Lien invalide</h1>
              <p className="text-slate-600 max-w-sm mx-auto leading-relaxed">
                Ce lien de consentement n'est pas valide ou a déjà été utilisé. 
                Veuillez contacter votre installateur pour obtenir un nouveau lien.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/60 border-t border-slate-100 py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Nelson PV — ENR Courtage</span>
          <div className="flex gap-4">
            <a href="/mentions-legales" className="hover:text-slate-600 transition-colors">Mentions légales</a>
            <a href="/politique-confidentialite" className="hover:text-slate-600 transition-colors">Confidentialité</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
