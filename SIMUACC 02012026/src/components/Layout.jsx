import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin, Mail, ExternalLink, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Layout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinkClasses = "font-medium text-white hover:text-yellow-300 transition";
  const activeNavLinkClasses = "text-yellow-400 font-bold";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex flex-col">
      <header className="bg-header-bg sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0">
              <NavLink to="/">
                <img className="h-16 w-auto" alt="Logo SimuACC" src="https://horizons-cdn.hostinger.com/ae774389-bc88-41cf-bdb3-1c293c254e9d/bae4d4b073fdb9357083e47ac151540d.png" />
              </NavLink>
            </div>
            <div className="hidden md:block">
              <nav className="flex items-center space-x-8">
                <NavLink to="/" className={({ isActive }) => cn(navLinkClasses, isActive && activeNavLinkClasses)}>Accueil</NavLink>
                <a href="https://enr-courtage-energie.fr" target="_blank" rel="noopener noreferrer" className={navLinkClasses}>Projets</a>
                <Button as={NavLink} to="/espace-producteur" variant={location.pathname === '/espace-producteur' ? 'default' : 'secondary'} className={location.pathname === '/espace-producteur' ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-600' : 'bg-white text-header-bg hover:bg-gray-200'}>
                  Espace Producteur
                </Button>
              </nav>
            </div>
            <div className="md:hidden">
              <Button onClick={() => setIsMenuOpen(!isMenuOpen)} variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-header-bg pb-4"
          >
            <nav className="flex flex-col items-center space-y-4">
              <NavLink to="/" className={({ isActive }) => cn(navLinkClasses, isActive && activeNavLinkClasses)} onClick={() => setIsMenuOpen(false)}>Accueil</NavLink>
              <a href="https://enr-courtage-energie.fr" target="_blank" rel="noopener noreferrer" className={navLinkClasses} onClick={() => setIsMenuOpen(false)}>Projets</a>
              <Button as={NavLink} to="/espace-producteur" variant="secondary" className="bg-white text-header-bg hover:bg-gray-200" onClick={() => setIsMenuOpen(false)}>
                Espace Producteur
              </Button>
            </nav>
          </motion.div>
        )}
      </header>
      
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      
      <footer className="bg-[#0A192F] text-gray-300 py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          <div className="md:col-span-1 lg:col-span-2 space-y-4">
             <img className="h-12" alt="Logo ENR Courtage Energie" src="https://horizons-cdn.hostinger.com/ae774389-bc88-41cf-bdb3-1c293c254e9d/f7e3dab192adf861ad78e70dad64bd3a.png" />
            <p className="text-sm max-w-sm">Spécialiste de l'autoconsommation collective dans le solaire photovoltaïque. Nous connectons producteurs et consommateurs pour une énergie plus verte et moins chère.</p>
            <p className="text-sm text-gray-400">Membre du groupe <a href="https://enr-courtage-energie.fr" target="_blank" rel="noopener noreferrer" className="font-semibold text-yellow-400 hover:text-yellow-300">ENR COURTAGE <ExternalLink className="inline h-4 w-4" /></a></p>
          </div>
          
          <div>
            <p className="font-bold text-white mb-4">Navigation</p>
            <ul className="space-y-2">
              <li><NavLink to="/" className="hover:text-yellow-400 transition">Accueil</NavLink></li>
              <li><a href="https://enr-courtage-energie.fr" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">Projets</a></li>
              <li><NavLink to="/espace-producteur" className="px-4 py-2 bg-yellow-500 text-slate-900 font-bold rounded-md inline-block hover:bg-yellow-400 transition">Espace Producteur</NavLink></li>
            </ul>
          </div>
          
          <div>
            <p className="font-bold text-white mb-4">Contact</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 mr-3 mt-1 text-yellow-400 flex-shrink-0" />
                <span>7 rue Gutenberg<br />33700 MÉRIGNAC</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-3 text-yellow-400 flex-shrink-0" />
                <a href="mailto:contact@enr-courtage.fr" className="hover:text-yellow-400 break-all">contact@enr-courtage.fr</a>
              </li>
            </ul>
            <Button as="a" href="https://enr-courtage-energie.fr/contact/" target="_blank" rel="noopener noreferrer" className="mt-4 bg-blue-100 text-blue-800 hover:bg-blue-200 w-full">Nous contacter</Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} ENR COURTAGE ENERGIE. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;