import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle, RefreshCw, Send, Download, Smartphone, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignerMandat() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const isTabletMode = searchParams.get('mode') === 'tablet';

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Étape de signature
  const [step, setStep] = useState('review'); // 'review' | 'otp' | 'completed'
  const [hasDrawn, setHasDrawn] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [demoCode, setDemoCode] = useState(null);

  // Finalisation
  const [submitting, setSubmitting] = useState(false);
  const [signedResult, setSignedResult] = useState(null);

  // Canvas de signature tactile
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // 1. Charger la session
  useEffect(() => {
    if (!sessionId) {
      setError('Lien de signature invalide ou manquant.');
      setLoading(false);
      return;
    }

    fetch(`/api/signature/session?sessionId=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          setSession(data.session);
          if (data.session.status === 'COMPLETED') {
            setStep('completed');
          }
        } else {
          setError(data.error || 'Session introuvable.');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // 2. Gestion du tracé tactile / souris sur Canvas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f2b48';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // 3. Envoi du code OTP SMS
  const handleSendOtp = async () => {
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/signature/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'envoi du code');
      setOtpSent(true);
      if (data.demoCode) setDemoCode(data.demoCode);
      setStep('otp');
    } catch (e) {
      setOtpError(e.message);
    } finally {
      setOtpLoading(false);
    }
  };

  // 4. Validation finale et signature
  const handleFinalSign = async () => {
    if (!hasDrawn) {
      alert('Veuillez apposer votre signature dans le cadre prévu à cet effet.');
      return;
    }
    if (!agreedTerms) {
      alert('Veuillez accepter les termes du mandat.');
      return;
    }

    const canvas = canvasRef.current;
    const signatureImageBase64 = canvas ? canvas.toDataURL('image/png') : null;

    setSubmitting(true);
    try {
      const res = await fetch('/api/signature/verify-and-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          otpCode: isTabletMode ? undefined : otpCode,
          signatureImageBase64,
          isTabletInPerson: isTabletMode
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la validation de signature');

      setSignedResult(data);
      setStep('completed');
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Téléchargement du PDF
  const handleDownloadPdf = () => {
    if (!signedResult?.pdfBase64) return;
    const linkSource = `data:application/pdf;base64,${signedResult.pdfBase64}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = linkSource;
    downloadLink.download = `Mandat_Enedis_${session?.prm || 'Signe'}.pdf`;
    downloadLink.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm text-slate-300 font-semibold">Chargement de votre document sécurisé...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold mb-2">Lien introuvable ou expiré</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error}</p>
        <p className="text-xs text-slate-500">Contactez votre conseiller ENR Courtage Énergie à contact@enr-courtage.fr</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Sécurisé */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              ⚡
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                ENR Courtage Énergie • Nelson
              </div>
              <h1 className="text-base font-extrabold text-white">
                Mandat de Collecte Enedis
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>eIDAS Conforme</span>
          </div>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="p-5 sm:p-6 space-y-5">

          {/* ÉTAPE 1 & 2 : RECAPITULATIF & SIGNATURE */}
          {step !== 'completed' && (
            <>
              {/* Carte Récapitulative du Mandat */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Titulaire du Compteur :</span>
                  <span className="font-bold text-white text-right">
                    {session?.clientCompany || session?.clientName || 'Client Titulaire'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Numéro PRM (14 chiffres) :</span>
                  <span className="font-mono font-black text-amber-400 tracking-wider text-sm">
                    {session?.prm}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Mandataire habilité :</span>
                  <span className="font-bold text-slate-300">
                    ENR COURTAGE ÉNERGIE (SGE Tiers)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Objet de l'autorisation :</span>
                  <span className="text-emerald-400 font-semibold">
                    Consommation & Courbe de charge (3 ans)
                  </span>
                </div>
              </div>

              {/* Information de conformité */}
              <div className="text-[11px] text-slate-400 bg-blue-950/30 border border-blue-900/40 p-3 rounded-xl flex items-start gap-2">
                <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Ce mandat autorise expressément ENR Courtage Énergie à interroger les données du réseau Enedis pour optimiser votre installation solaire. Vous pouvez révoquer ce mandat sans frais à tout moment.
                </span>
              </div>

              {/* Cadre de Signature Tactile */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>Apposez votre signature ci-dessous</span>
                    <span className="text-[10px] text-amber-400 font-normal">
                      ({isTabletMode ? 'avec le doigt ou stylet' : 'au doigt sur mobile ou à la souris'})
                    </span>
                  </label>
                  {hasDrawn && (
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[11px] text-slate-400 hover:text-red-400 transition-colors font-medium cursor-pointer"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-1 border-2 border-dashed border-slate-700 shadow-inner overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[140px] bg-white cursor-crosshair touch-none"
                  />
                </div>
              </div>

              {/* Engagement & Conditions */}
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                />
                <span>
                  Je confirme être le titulaire du compteur désigné ou son représentant légal, et j'appose ma signature électronique avec valeur juridique conforme au règlement eIDAS.
                </span>
              </label>

              {/* SI MODE À DISTANCE : VÉRIFICATION OTP SMS */}
              {!isTabletMode && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                      Sécurisation par SMS (OTP)
                    </span>
                    {session?.clientPhone && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {session.clientPhone.slice(0, 3)} ••• •• {session.clientPhone.slice(-2)}
                      </span>
                    )}
                  </div>

                  {!otpSent ? (
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading || !hasDrawn}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                    >
                      {otpLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                      Recevoir mon code SMS de validation
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="Code à 6 chiffres"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="font-mono text-center text-base tracking-widest bg-slate-900 border-slate-700 text-white"
                        />
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpLoading}
                          className="text-[11px] text-slate-400 hover:text-amber-400 underline whitespace-nowrap p-2"
                        >
                          Renvoyer
                        </button>
                      </div>

                      {demoCode && (
                        <div className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 p-2 rounded border border-amber-500/20">
                          Code de démonstration : <strong>{demoCode}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {otpError && (
                    <p className="text-xs text-red-400">{otpError}</p>
                  )}
                </div>
              )}

              {/* BOUTON D'ACTION DE SIGNATURE */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleFinalSign}
                  disabled={submitting || !hasDrawn || !agreedTerms || (!isTabletMode && (!otpSent || otpCode.length < 6))}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm py-4 rounded-2xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scellement eIDAS & Ingestion Enedis en cours...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>{isTabletMode ? 'Signer Immédiatement sur Tablette' : 'Confirmer et Signer le Mandat'}</span>
                    </div>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* ÉTAPE 3 : ÉCRAN DE SUCCÈS & TÉLÉCHARGEMENT */}
          {step === 'completed' && (
            <div className="py-8 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h2 className="text-xl font-extrabold text-white">
                Mandat Enedis Signé avec Succès !
              </h2>

              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Votre mandat a été horodaté et scellé électroniquement conformément aux normes eIDAS.
                Vos données de consommation et puissances ont été automatiquement rattachées à votre étude solaire.
              </p>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 max-w-sm mx-auto text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">PRM :</span>
                  <span className="font-mono text-white">{session?.prm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Statut Réseau :</span>
                  <span className="text-emerald-400 font-bold">Actif sous Mandat Tiers</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Empreinte SHA-256 :</span>
                  <span className="font-mono text-slate-400 text-[10px] truncate max-w-[160px]">
                    {signedResult?.auditTrail?.sha256 || 'Certifié eIDAS'}
                  </span>
                </div>
              </div>

              {signedResult?.pdfBase64 && (
                <Button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3 px-6 rounded-xl shadow inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  Télécharger mon Mandat Signé (.pdf)
                </Button>
              )}
            </div>
          )}

        </div>

        {/* Pied de page */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 text-center text-[10px] text-slate-500">
          ENR COURTAGE ÉNERGIE — Opérateur Nelson • Mandataire Agréé Enedis SGE Tiers • Sécurité eIDAS & RGPD
        </div>

      </div>
    </div>
  );
}
