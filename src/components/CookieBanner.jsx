import React, { useState, useEffect } from 'react';
import { Cookie, X, Check, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { safeLocalStorage } from '../lib/storage.js';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = safeLocalStorage.getItem('nelson:cookieConsent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    safeLocalStorage.setItem('nelson:cookieConsent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    safeLocalStorage.setItem('nelson:cookieConsent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[100] animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 overflow-hidden relative">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shrink-0">
            <Cookie className="w-6 h-6" />
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Cookies & Confidentialité
              <ShieldCheck className="w-4 h-4 text-green-500" />
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et assurer le bon fonctionnement de nos outils photovoltaïques. 
              En cliquant sur "Accepter", vous consentez à notre <a href="/politique-confidentialite" className="text-blue-600 font-semibold hover:underline">politique de confidentialité</a>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                onClick={handleAccept}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 font-bold"
              >
                <Check className="w-4 h-4 mr-2" />
                Tout accepter
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleDecline}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl px-4"
              >
                Refuser
              </Button>
            </div>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
