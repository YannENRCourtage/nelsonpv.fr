import React from 'react';
import { Link, Outlet, NavLink, useNavigate, useMatch } from 'react-router-dom';
import Footer from './Footer.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useProject } from '../contexts/ProjectContext.jsx';
import { Button } from './ui/button.jsx';
import { LogOut, FileDown, Save, Bell, Users, Shield } from 'lucide-react';
import { toast } from "@/components/ui/use-toast.js";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas';
// CHEMIN CORRIGÉ et IMPORT DE LA LÉGENDE
import PDFGenerator, { PDFSymbolLegend } from './PDFGenerator.jsx';
import ReactDOMServer from 'react-dom/server';
import useNotifications from '../hooks/useNotifications.jsx';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover.jsx';
import NotificationBell from './NotificationBell.jsx';

const toastStyle = { className: "bg-white text-gray-900 p-4 border border-gray-300 rounded-lg shadow-lg" };

export const generatePdfForProject = async (projectData) => {
  if (!projectData) {
    toast({ title: "Erreur", description: "Aucune donnée de projet fournie." });
    return;
  }

  // Orientation PAYSAGE pour la Page 1 (Fiche Projet)
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });

  // --- PAGE 1 : FICHE PROJET ---
  const pdfContainer = document.createElement('div');
  // Style pour forcer la taille A4 PAYSAGE
  pdfContainer.style.width = '297mm';
  pdfContainer.style.height = '210mm';
  pdfContainer.style.position = 'absolute';
  pdfContainer.style.left = '-9999px'; // Cacher hors de l'écran
  pdfContainer.innerHTML = ReactDOMServer.renderToString(<PDFGenerator project={projectData} />);
  document.body.appendChild(pdfContainer);

  const canvas = await html2canvas(pdfContainer.firstChild, {
    scale: 2,
    useCORS: true,
    width: pdfContainer.firstChild.offsetWidth,
    height: pdfContainer.firstChild.offsetHeight
  });
  document.body.removeChild(pdfContainer);

  const imgData = canvas.toDataURL('image/png');
  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = doc.internal.pageSize.getHeight();
  doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  // --- PAGES SUIVANTES : CAPTURES D'ÉCRAN ---
  // On lit les captures depuis l'objet projet (mis à jour par ProjectMap.jsx)
  const captures = projectData.captures || [];
  const validCaptures = captures.filter(c => c); // Filtrer les captures vides
  const totalPages = validCaptures.length + 1;

  if (validCaptures.length > 0) {
    // Création du canvas pour la légende (une seule fois)
    const legendContainer = document.createElement('div');
    // La largeur de base est A4 Paysage en pixels (pour la capture)
    legendContainer.style.width = "1123px";
    legendContainer.style.position = "absolute";
    legendContainer.style.left = "-9999px";
    // On utilise le composant de légende exporté
    legendContainer.innerHTML = ReactDOMServer.renderToString(<PDFSymbolLegend isForCapturePage={true} />);
    document.body.appendChild(legendContainer);

    // On capture le conteneur de légende (qui contient le wrapper de 60%)
    const legendCanvas = await html2canvas(legendContainer.firstChild, {
      scale: 2,
      useCORS: true,
      backgroundColor: null // Fond transparent
    });
    document.body.removeChild(legendContainer);
    const legendImgData = legendCanvas.toDataURL('image/png');

    // Dimensions pour la légende en bas de page (A4 Paysage)
    const legendPdfWidth = (doc.internal.pageSize.getWidth() - 30) * 0.6; // 60% de la largeur avec marges
    const legendImgProps = doc.getImageProperties(legendImgData);
    const legendPdfHeight = (legendImgProps.height / legendImgProps.width) * legendPdfWidth;
    // Position X centrée (correspond au 60% width + 20% marge)
    const legendX = (doc.internal.pageSize.getWidth() - legendPdfWidth) / 2;
    const legendY = doc.internal.pageSize.getHeight() - legendPdfHeight - 10; // 10mm du bas

    // Boucle sur les captures valides
    for (let i = 0; i < validCaptures.length; i++) {
      const captureDataUrl = validCaptures[i];

      // Ajout de la page en mode PAYSAGE
      doc.addPage('a4', 'l');

      const pageNumber = i + 2;
      doc.setFontSize(10);
      doc.setTextColor(150);
      // Positionnement des numéros de page pour A4 Paysage
      doc.text(`Page ${pageNumber} / ${totalPages}`, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 10);

      // doc.setFontSize(16); // Titre "Vue d'implantation" retiré
      // doc.setTextColor(0);
      // doc.text(`Vue d'implantation N°${i + 1}`, 15, 15); // Titre retiré

      // --- AJOUT DE L'IMAGE DE CAPTURE ---
      const img = new Image();
      img.src = captureDataUrl;
      await new Promise(resolve => { img.onload = resolve; }); // Attendre que l'image soit chargée

      const imgPropsCap = doc.getImageProperties(img);
      // Réduction de la hauteur max pour laisser place à la légende
      const capturePdfWidth = doc.internal.pageSize.getWidth() - 30; // 15mm marge G/D
      // Hauteur max de l'image = hauteur page - marge haut (15) - marge bas (10) - hauteur légende
      const capturePdfHeight = doc.internal.pageSize.getHeight() - 25 - legendPdfHeight;

      const ratio = Math.min(capturePdfWidth / imgPropsCap.width, capturePdfHeight / imgPropsCap.height);
      const imgWidth = imgPropsCap.width * ratio;
      const imgHeight = imgPropsCap.height * ratio;

      const x = (doc.internal.pageSize.getWidth() - imgWidth) / 2;
      const y = 15; // 15mm du haut (au lieu de 20)

      doc.addImage(captureDataUrl, 'PNG', x, y, imgWidth, imgHeight);

      // --- AJOUT DE LA LÉGENDE SOUS L'IMAGE ---
      doc.addImage(legendImgData, 'PNG', legendX, legendY, legendPdfWidth, legendPdfHeight);
    }
  }

  // Utilise la logique de formatage du nom de projet
  const p = projectData || {};
  const formatProjectName = () => {
    // CORRIGÉ : Utilise p.name (Nom*), p.zip, p.city
    const title = `${p.name || ''} ${p.zip || ''} ${p.city || ''}`.trim();
    if (!p.name) {
      return 'Projet';
    }
    return title.toUpperCase() || 'Projet';
  };
  const projectTitle = `Fiche projet - ${formatProjectName()}`;
  doc.save(`${projectTitle}.pdf`);

  toast({
    ...toastStyle, // Ajout du style
    title: "PDF Généré",
    description: "Le fichier PDF a été téléchargé."
  });
};

function Header() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isProjectPage = useMatch("/project/:projectId/edit");
  const { project, saveProject } = useProject();


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // ...

  const handleSave = async () => {
    if (saveProject) {
      try {
        await saveProject();
        toast({
          ...toastStyle,
          title: "Projet sauvegardé !",
          description: "Vos modifications ont été enregistrées avec succès.",
          variant: "default"
        });
      } catch (error) {
        console.error("Erreur sauvegarde projet:", error);
        toast({
          ...toastStyle,
          title: "Erreur de sauvegarde",
          description: "Impossible de sauvegarder le projet. Vérifiez votre connexion.",
          variant: "destructive"
        });
      }
    }
  };

  const handleGeneratePdf = () => {
    // Sauvegarde d'abord pour s'assurer que les dernières captures sont incluses
    saveProject();
    generatePdfForProject(project);
  }



  const getProjectTitle = () => {
    // Debug logging
    // console.log("getProjectTitle check:", { project, isProjectPage, params: isProjectPage?.params });
    if (!project) {
      // Check both standard params and potentially nested match object
      if (isProjectPage?.params?.projectId === 'new' || location.pathname.includes('/new/')) return "Nouveau projet";
      return "Chargement...";
    }
    // CORRIGÉ : Utilise la même logique que le PDF
    const p = project || {};
    // Utilise p.name (Nom du projet)
    const title = `${p.name || ''} ${p.zip || ''} ${p.city || ''}`.trim();
    if (!p.name) {
      // Fallback si p.name ("Nom*") est vide
      return 'PROJET SANS NOM';
    }
    return title.toUpperCase() || 'PROJET SANS NOM';
  }

  return (
    <header className="app-header">
      <div className="app-header__container">
        <div className="flex items-center gap-8">
          <Link to="/" className="app-header__logo">
            <img src="https://horizons-cdn.hostinger.com/350bc103-daf8-48b5-9a02-076489f36a7d/338201d787e373b4c0b156cb07a5b792.png" alt="NELSON par ENR Courtage" />
          </Link>
          <nav className="app-header__nav">
            <NavLink to="/crm" className={({ isActive }) => isActive ? 'nav-link active crm' : 'nav-link crm'}>CRM</NavLink>
            <NavLink to="/project/new/edit" className={({ isActive }) => isActive ? 'nav-link active editeur' : 'nav-link editeur'}>Editeur de projet</NavLink>
            {(user?.role === 'admin' || user?.permissions?.canAccessSimulator) && (
              <NavLink to="/simulator" className={({ isActive }) => isActive ? 'nav-link active simulateur' : 'nav-link simulateur'}>Simulateur</NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active admin' : 'nav-link admin'}>
                <Shield className="w-4 h-4 mr-1 inline-block" />
                Admin
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isProjectPage ? (
            <>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{getProjectTitle()}</span>
              <Button onClick={handleGeneratePdf} className="rounded-full bg-orange-500 hover:bg-orange-600 text-white">
                <FileDown className="h-5 w-5 mr-2" />
                Générer le PDF
              </Button>
              <Button onClick={handleSave} className="rounded-full text-white" style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}>
                <Save className="h-5 w-5 mr-2" />
                Sauvegarder
              </Button>
            </>
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {/* Fix: Display firstName if available, fallback to displayName, then generic */}
              Bonjour, {user?.firstName ? user.firstName : (user?.displayName || 'Utilisateur')}
            </span>
          )}
          <NotificationBell />
          {/* Removed Dark Mode Toggle Button */}
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full bg-red-500 hover:bg-red-600 text-white">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-layout__content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
