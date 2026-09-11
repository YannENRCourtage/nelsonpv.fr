import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Search,
  Zap,
  Mail,
  Tablet,
  Phone,
  Building2,
  User,
  Link as LinkIcon,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import enedisService from '@/services/enedis';
import PrmSelectionModal from './PrmSelectionModal';

export default function MandatSignatureModal({
  isOpen,
  onClose,
  initialPrm = '',
  initialClientName = '',
  initialEmail = '',
  initialPhone = '',
  initialCompany = '',
  initialAddress = '',
  initialZip = '',
  initialCity = '',
  projectId = 'admin_test',
  onSignatureSuccess = null
}) {
  const [mounted, setMounted] = useState(false);

  const [prm, setPrm] = useState(initialPrm || '');
  const [clientName, setClientName] = useState(initialClientName || '');
  const [clientCompany, setClientCompany] = useState(initialCompany || '');
  const [clientEmail, setClientEmail] = useState(initialEmail || '');
  const [clientPhone, setClientPhone] = useState(initialPhone || '');
  const [clientAddress, setClientAddress] = useState(initialAddress || '');
  const [clientZip, setClientZip] = useState(initialZip || '');
  const [clientCity, setClientCity] = useState(initialCity || '');
  const [subscribedPower, setSubscribedPower] = useState(null);

  const [searchingPrm, setSearchingPrm] = useState(false);
  const [prmCandidates, setPrmCandidates] = useState([]);
  const [ambiguityModalOpen, setAmbiguityModalOpen] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronisation automatique des champs à chaque ouverture ou mise à jour du projet
  useEffect(() => {
    if (isOpen) {
      setPrm(initialPrm || '');
      setClientName(initialClientName || '');
      setClientCompany(initialCompany || '');
      setClientEmail(initialEmail || '');
      setClientPhone(initialPhone || '');
      setClientAddress(initialAddress || '');
      setClientZip(initialZip || '');
      setClientCity(initialCity || '');
      setResult(null);
      setCopied(false);
      setSearchFeedback(null);
    }
  }, [
    isOpen,
    initialPrm,
    initialClientName,
    initialCompany,
    initialEmail,
    initialPhone,
    initialAddress,
    initialZip,
    initialCity
  ]);

  useEffect(() => {
    if (isOpen && initialPrm && initialPrm !== prm) {
      setPrm(initialPrm);
    }
  }, [initialPrm, isOpen]);

  const handleAutoSearchPrm = async () => {
    if (!clientAddress && !clientZip && !clientCity) {
      alert('Veuillez renseigner au moins une adresse, un code postal ou une ville pour lancer la recherche.');
      return;
    }
    setSearchingPrm(true);
    setSearchFeedback(null);
    try {
      const res = await enedisService.searchPrm({
        address: clientAddress,
        zip: clientZip,
        city: clientCity,
        companyName: clientCompany,
        clientName,
        projectId
      });

      if (res.status === 'HIGH_CONFIDENCE' && res.selectedPrm?.prm) {
        setPrm(res.selectedPrm.prm);
        setSubscribedPower(res.selectedPrm.puissance_souscrite_kva || null);
        setSearchFeedback({
          type: 'success',
          text: `PRM identifié avec succès : ${res.selectedPrm.prm} (${res.selectedPrm.puissance_souscrite_kva ? res.selectedPrm.puissance_souscrite_kva + ' kVA • ' : ''}${res.selectedPrm.titulaire || clientCompany})`
        });
      } else if (res.status === 'AMBIGUOUS' || res.isAmbiguous) {
        setPrmCandidates(res.candidates || []);
        setAmbiguityModalOpen(true);
      } else {
        setSearchFeedback({
          type: 'warn',
          text: 'Aucun compteur Enedis trouvé automatiquement. Saisie manuelle possible.'
        });
      }
    } catch (err) {
      setSearchFeedback({
        type: 'error',
        text: err.message || 'Erreur lors de la recherche Enedis'
      });
    } finally {
      setSearchingPrm(false);
    }
  };

  if (!isOpen) return null;
  if (!mounted || typeof document === 'undefined') return null;

  // Génération du lien de signature (aucun envoi d'email depuis le serveur, lien direct à copier)
  const handleGenerateLink = async (isDirectTablet = false) => {
    const cleanPrm = (prm || '').toString().trim().replace(/\D/g, '');
    if (!cleanPrm || cleanPrm.length !== 14) {
      alert('Veuillez renseigner un numéro PRM de 14 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/signature/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prm: cleanPrm,
          clientName: (clientName || '').trim(),
          clientCompany: (clientCompany || '').trim(),
          clientEmail: (clientEmail || '').trim(),
          clientPhone: (clientPhone || '').trim(),
          clientAddress: (clientAddress || '').trim(),
          clientZip: (clientZip || '').trim(),
          clientCity: (clientCity || '').trim(),
          channel: isDirectTablet ? 'tablet' : 'link',
          projectId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la génération du lien de signature');

      setResult(data);

      if (isDirectTablet && data.signingUrl) {
        window.open(data.signingUrl, '_blank', 'noopener,noreferrer');
      }

      if (onSignatureSuccess) onSignatureSuccess(data);
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!result?.signingUrl) return;
    navigator.clipboard.writeText(result.signingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ isolation: 'isolate' }}
    >
      <div className="relative z-[99999] bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col text-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black shrink-0 text-lg">
              ✍️
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Faire Signer le Mandat Enedis
              </h2>
              <p className="text-xs text-slate-400">
                Génération de lien de signature électronique conforme eIDAS / RGPD
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[78vh]">

          {/* Formulaire Client & PRM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* PRM */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Numéro PRM Enedis (14 chiffres) *</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoSearchPrm}
                  disabled={searchingPrm}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Recherche automatique du PRM via l'adresse"
                >
                  {searchingPrm ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  <span>Rechercher par adresse</span>
                </button>
              </div>

              <div className="relative">
                <Input
                  type="text"
                  maxLength={14}
                  value={prm}
                  onChange={(e) => {
                    setPrm(e.target.value.replace(/\D/g, ''));
                    setSubscribedPower(null);
                    setSearchFeedback(null);
                  }}
                  placeholder="Ex: 16138350177475"
                  className="bg-slate-950 border-slate-700 text-white font-mono font-bold tracking-wider pr-20 h-10 text-sm"
                />
                {subscribedPower && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold">
                    <Zap className="w-3 h-3" />
                    {subscribedPower} kVA
                  </div>
                )}
              </div>

              {searchFeedback && (
                <div className={`text-[11px] mt-1.5 font-medium flex items-center gap-1.5 ${
                  searchFeedback.type === 'success' ? 'text-emerald-400' :
                  searchFeedback.type === 'warn' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {searchFeedback.type === 'success' && <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
                  <span>{searchFeedback.text}</span>
                </div>
              )}
            </div>

            {/* Nom / Prénom */}
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Nom &amp; Prénom du signataire</span>
              </label>
              <Input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>

            {/* Raison Sociale */}
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Raison Sociale (si Société / Exploitation)</span>
              </label>
              <Input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Ex: EARL des Terres Jaunes"
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>

            {/* Téléphone Mobile */}
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Numéro de mobile (validation OTP SMS)</span>
              </label>
              <Input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Adresse Email du client</span>
              </label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@domaine.fr"
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>
          </div>

          {/* RÉSULTAT DU LIEN GÉNÉRÉ */}
          {result?.signingUrl ? (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 shadow-lg animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Lien de signature Enedis eIDAS prêt !</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Validité 7 jours</span>
              </div>

              {/* Champ avec URL et bouton Copier */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.signingUrl}
                  onClick={(e) => e.target.select()}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 select-all tracking-tight focus:outline-none focus:border-emerald-500"
                />
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  className={`shrink-0 font-bold text-xs gap-1.5 transition-all shadow-md ${
                    copied
                      ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lien copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copier le lien</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Explication d'utilisation */}
              <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">À coller dans votre email :</span> Collez ce lien dans votre logiciel de messagerie habituel (Outlook, Gmail...) pour l'envoyer au client. Le client signera en ligne de façon certifiée eIDAS.
                </div>
              </div>

              {/* Actions complémentaires : Mailto & Présentiel */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <a
                  href={`mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(
                    `Signature de votre Mandat Enedis — PRM ${prm}`
                  )}&body=${encodeURIComponent(
                    `Bonjour ${clientName || ''},\n\nDans le cadre de l'étude photovoltaïque de votre site (PRM : ${prm}), veuillez trouver ci-dessous votre lien sécurisé pour signer électroniquement votre mandat de collecte Enedis :\n\n${result.signingUrl}\n\nCe processus est 100% dématérialisé et conforme à la réglementation eIDAS.\n\nBien cordialement,\nENR Courtage Énergie`
                  )}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ouvrir dans mon logiciel de messagerie</span>
                </a>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(result.signingUrl, '_blank', 'noopener,noreferrer')}
                  className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-xs text-amber-300 hover:text-amber-200 flex items-center justify-center gap-1.5"
                  title="Ouvrir immédiatement l'écran de signature si le client est présent"
                >
                  <Tablet className="w-3.5 h-3.5 text-amber-400" />
                  <span>Signer sur cet écran (Présentiel)</span>
                </Button>
              </div>
            </div>
          ) : null}

          {/* BOUTON D'ACTION PRINCIPALE : GÉNÉRER LE LIEN */}
          <Button
            type="button"
            onClick={() => handleGenerateLink(false)}
            disabled={loading || !prm || prm.length !== 14}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <LinkIcon className="w-4 h-4 mr-2" />
            )}
            <span>
              {result?.signingUrl
                ? 'Regénérer un nouveau lien de signature'
                : 'Générer le lien de signature Enedis eIDAS'}
            </span>
          </Button>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Conforme eIDAS • Archivage horodaté • Sans compte client Enedis</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold"
          >
            Fermer
          </button>
        </div>

      </div>

      {/* Modale de sélection de PRM en cas d'ambiguïté */}
      <PrmSelectionModal
        isOpen={ambiguityModalOpen}
        onClose={() => setAmbiguityModalOpen(false)}
        candidates={prmCandidates}
        address={`${clientAddress} ${clientZip} ${clientCity}`.trim()}
        companyName={clientCompany}
        clientName={clientName}
        onSelectPrm={(selected) => {
          setPrm(selected.prm);
          setSubscribedPower(selected.puissance_souscrite_kva || null);
          if (selected.titulaire) {
            if (!clientName) setClientName(selected.titulaire);
            if (!clientCompany) setClientCompany(selected.titulaire);
          }
          if (selected.phone && !clientPhone) setClientPhone(selected.phone);
          if (selected.email && !clientEmail) setClientEmail(selected.email);
          setSearchFeedback({
            type: 'success',
            text: `Compteur sélectionné : ${selected.prm} ${selected.puissance_souscrite_kva ? '(' + selected.puissance_souscrite_kva + ' kVA)' : ''} — ${selected.titulaire || clientCompany}`
          });
        }}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}
