import React from 'react';
import { ShieldCheck, Eye, Database, Clock, UserCheck, Lock } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-8 py-10 text-white">
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <ShieldCheck className="w-8 h-8" />
              Politique de Confidentialité
            </h1>
            <p className="mt-2 text-indigo-100 text-lg">
              Votre vie privée est notre priorité. Découvrez comment nous protégeons vos données.
            </p>
          </div>
          
          <div className="p-8 space-y-12">
            {/* Introduction */}
            <section className="space-y-4">
              <p className="text-slate-600 leading-relaxed text-lg italic">
                "Dans le cadre de l'utilisation du site Nelson, nous sommes amenés à collecter et traiter certaines de vos données personnelles. Cette politique a pour but de vous informer en toute transparence sur nos pratiques."
              </p>
            </section>

            {/* Collecte des données */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Eye className="w-6 h-6" />
                </div>
                Données collectées
              </h2>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <p className="text-slate-700 mb-4 font-semibold">Nous collectons uniquement les données nécessaires à nos services :</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    Identité (Nom, Prénom)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    Contact (Email, Téléphone)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    Adresse postale (pour les projets)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    Données de consommation (via Enedis)
                  </li>
                </ul>
              </div>
            </section>

            {/* Finalités */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Database className="w-6 h-6" />
                </div>
                Utilisation des données
              </h2>
              <div className="space-y-4 text-slate-600">
                <p>Vos données sont traitées pour les finalités suivantes :</p>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="font-bold text-indigo-600 mt-0.5">01.</div>
                    <p>Gestion et suivi de vos projets photovoltaïques.</p>
                  </div>
                  <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="font-bold text-indigo-600 mt-0.5">02.</div>
                    <p>Études techniques et dimensionnement de vos installations.</p>
                  </div>
                  <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="font-bold text-indigo-600 mt-0.5">03.</div>
                    <p>Réalisation de démarches administratives (DP, PC, Enedis).</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Durée de conservation */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Clock className="w-6 h-6" />
                </div>
                Durée de conservation
              </h2>
              <p className="text-slate-600">
                Les données sont conservées pendant toute la durée de la relation commerciale et pendant une durée de <span className="font-bold text-slate-900">3 ans</span> après le dernier contact pour les prospects, ou selon les obligations légales de conservation des documents contractuels.
              </p>
            </section>

            {/* Droits des utilisateurs */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <UserCheck className="w-6 h-6" />
                </div>
                Vos droits (RGPD)
              </h2>
              <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 text-slate-600">
                <p className="mb-4">Conformément au RGPD, vous disposez des droits suivants :</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Droit d'accès et de rectification</li>
                  <li>Droit à l'effacement (droit à l'oubli)</li>
                  <li>Droit à la limitation du traitement</li>
                  <li>Droit à la portabilité de vos données</li>
                  <li>Droit d'opposition</li>
                </ul>
                <p className="mt-6 text-sm">
                  Pour exercer ces droits, contactez-nous à : <span className="font-bold text-indigo-600">contact@enr-courtage.fr</span>
                </p>
              </div>
            </section>

            {/* Sécurité */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Lock className="w-6 h-6" />
                </div>
                Sécurité
              </h2>
              <p className="text-slate-600">
                Nous mettons en œuvre toutes les mesures techniques et organisationnelles nécessaires pour garantir la sécurité et la confidentialité de vos données personnelles (chiffrement SSL, serveurs sécurisés, contrôle des accès).
              </p>
            </section>
          </div>
          
          <div className="bg-slate-50 px-8 py-6 text-xs text-slate-400 text-center border-t border-slate-100">
            Cette politique de confidentialité est susceptible d'évoluer en fonction du cadre légal.
            <br />
            Dernière mise à jour : Mai 2026
          </div>
        </div>
      </div>
    </div>
  );
}
