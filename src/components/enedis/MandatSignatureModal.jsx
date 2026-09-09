import React, { useState } from 'react';
import { X, Mail, MessageSquare, Smartphone, Tablet, Copy, Check, ExternalLink, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MandatSignatureModal({
  isOpen,
  onClose,
  initialPrm = '',
  initialClientName = '',
  initialEmail = '',
  initialPhone = '',
  initialCompany = '',
  projectId = 'admin_test',
  onSignatureSuccess = null
}) {
  const [prm, setPrm] = useState(initialPrm);
  const [clientName, setClientName] = useState(initialClientName);
  const [clientCompany, setClientCompany] = useState(initialCompany);
  const [clientEmail, setClientEmail] = useState(initialEmail);
  const [clientPhone, setClientPhone] = useState(initialPhone);

  const [selectedChannel, setSelectedChannel] = useState('email'); // 'email' | 'sms' | 'whatsapp' | 'tablet'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleInitiate = async (channelOverride) => {
    const channelToUse = channelOverride || selectedChannel;
    if (!prm || prm.length !== 14) {
      alert('Veuillez saisir un numéro PRM de 14 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/signature/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prm,
          clientName,
          clientCompany,
          clientEmail,
          clientPhone,
          channel: channelToUse,
          projectId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'initiation de la signature');

      setResult(data);

      if (channelToUse === 'whatsapp' && data.delivery?.whatsAppUrl) {
        window.open(data.delivery.whatsAppUrl, '_blank', 'noopener,noreferrer');
      } else if (channelToUse === 'tablet') {
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
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              ✍️
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Faire Signer le Mandat Enedis
              </h2>
              <p className="text-xs text-slate-400">
                Signature électronique omnicanale conforme eIDAS / RGPD
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* Formulaire Client & PRM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Numéro PRM Enedis (14 chiffres) *
              </label>
              <Input
                type="text"
                maxLength={14}
                value={prm}
                onChange={(e) => setPrm(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 16138350177475"
                className="bg-slate-950 border-slate-700 text-white font-mono font-bold tracking-wider"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Nom / Prénom du signataire
              </label>
              <Input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="bg-slate-950 border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Raison Sociale (si Entreprise/Agri)
              </label>
              <Input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Ex: EARL des Terres Jaunes"
                className="bg-slate-950 border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Adresse Email (pour envoi Email)
              </label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@domaine.fr"
                className="bg-slate-950 border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Téléphone Mobile (pour SMS / WhatsApp / OTP)
              </label>
              <Input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="bg-slate-950 border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          {/* SÉLECTEUR DES 4 CANAUX DE DIFFUSION */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-300 block">
              Sélectionnez le canal de recueil :
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'email', label: 'Email', icon: Mail, desc: 'Lien sécurisé + OTP' },
                { id: 'sms', label: 'SMS', icon: Smartphone, desc: 'Lien court direct' },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, desc: 'Message direct' },
                { id: 'tablet', label: 'Présentiel', icon: Tablet, desc: 'Signature Tablette' }
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = selectedChannel === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChannel(c.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold">{c.label}</div>
                      <div className="text-[9px] text-slate-500">{c.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RÉSULTAT OU LIEN GÉNÉRÉ */}
          {result?.signingUrl && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Demande de signature initiée avec succès !</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.signingUrl}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 select-all"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyLink}
                  className="bg-slate-800 hover:bg-slate-700 text-white shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {selectedChannel === 'tablet' && (
                <Button
                  type="button"
                  onClick={() => window.open(result.signingUrl, '_blank')}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2 rounded-xl mt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Ouvrir l'écran de signature sur cette tablette
                </Button>
              )}
            </div>
          )}

          {/* BOUTON D'ACTION PRINCIPALE */}
          <Button
            type="button"
            onClick={() => handleInitiate()}
            disabled={loading || !prm || prm.length !== 14}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            <span>
              {selectedChannel === 'email' && 'Envoyer le Mandat par Email'}
              {selectedChannel === 'sms' && 'Envoyer le Mandat par SMS'}
              {selectedChannel === 'whatsapp' && 'Générer le message WhatsApp'}
              {selectedChannel === 'tablet' && 'Lancer la Signature Immédiate (Tablette)'}
            </span>
          </Button>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Conforme eIDAS • Archivage horodaté • Déclenchement Enedis automatique</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
