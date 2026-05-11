import React from 'react';
import { Shield, Scale, MapPin, Mail, Phone, Building2 } from 'lucide-react';

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-white">
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Scale className="w-8 h-8" />
              Mentions Légales
            </h1>
            <p className="mt-2 text-blue-100">
              Informations obligatoires concernant l'éditeur et l'hébergeur du site Nelson.
            </p>
          </div>
          
          <div className="p-8 space-y-10">
            {/* Éditeur */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Édition du site
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-600">
                <div className="space-y-3">
                  <p><span className="font-semibold text-slate-800">Raison sociale :</span> ENR Courtage Énergie</p>
                  <p><span className="font-semibold text-slate-800">Forme juridique :</span> SAS</p>
                  <p><span className="font-semibold text-slate-800">Capital social :</span> 10 000 €</p>
                  <p><span className="font-semibold text-slate-800">SIREN :</span> 882 123 456 (Exemple)</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-500 mt-1" />
                    <p>7 Rue Gutenberg, 33700 Mérignac, France</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <p>contact@enr-courtage.fr</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <p>05 XX XX XX XX</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Responsable de publication */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Responsable de la publication
              </h2>
              <p className="text-slate-600">
                Le responsable de la publication du site est <span className="font-semibold text-slate-800">Yann Barberis</span>, en sa qualité de Président de ENR Courtage Énergie.
              </p>
            </section>

            {/* Hébergement */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Hébergement du site
              </h2>
              <div className="text-slate-600 space-y-2">
                <p><span className="font-semibold text-slate-800">Hébergeur :</span> Vercel Inc.</p>
                <p>440 N Barranca Ave #4133, Covina, CA 91723, USA</p>
                <p><a href="https://vercel.com" className="text-blue-600 hover:underline">https://vercel.com</a></p>
              </div>
            </section>

            {/* Propriété intellectuelle */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">Propriété intellectuelle</h2>
              <p className="text-slate-600 leading-relaxed">
                L'ensemble du contenu de ce site (textes, images, graphismes, logo, icônes, etc.) est la propriété exclusive de ENR Courtage Énergie, sauf mention contraire. Toute reproduction, distribution, modification, adaptation, retransmission ou publication, même partielle, de ces différents éléments est strictement interdite sans l'accord exprès par écrit de ENR Courtage Énergie.
              </p>
            </section>

            {/* Contact */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center">
              <p className="text-slate-600">
                Pour toute question ou demande d'information concernant le site, vous pouvez nous contacter à l'adresse suivante : 
                <br />
                <span className="font-bold text-blue-600">contact@enr-courtage.fr</span>
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50 px-8 py-4 text-xs text-slate-400 text-center border-t border-slate-100">
            Dernière mise à jour : Mai 2026
          </div>
        </div>
      </div>
    </div>
  );
}
