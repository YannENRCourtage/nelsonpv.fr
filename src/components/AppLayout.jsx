import React, { useState } from 'react';
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
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/config/firebase.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  // --- PAGES SUIVANTES : CAPTURES D'ÉCRAN (OPTIMISÉ) ---
  const captures = projectData.captures || [];
  const validCaptures = captures.filter(c => c); // Filtrer les captures vides
  const totalPages = validCaptures.length + 1;

  if (validCaptures.length > 0) {
    // 1. Préparation de la légende (Render & Capture unique)
    const legendContainer = document.createElement('div');
    legendContainer.style.width = "1123px";
    legendContainer.style.position = "absolute";
    legendContainer.style.left = "-9999px";
    legendContainer.innerHTML = ReactDOMServer.renderToString(<PDFSymbolLegend isForCapturePage={true} />);
    document.body.appendChild(legendContainer);

    let legendImgData = null;
    let legendPdfWidth, legendPdfHeight, legendX, legendY;

    try {
      const legendCanvas = await html2canvas(legendContainer.firstChild, {
        scale: 2,
        useCORS: true,
        backgroundColor: null
      });
      legendImgData = legendCanvas.toDataURL('image/png');

      // Dimensions pour la légende
      legendPdfWidth = (doc.internal.pageSize.getWidth() - 30) * 0.6;
      const legendImgProps = doc.getImageProperties(legendImgData);
      legendPdfHeight = (legendImgProps.height / legendImgProps.width) * legendPdfWidth;
      legendX = (doc.internal.pageSize.getWidth() - legendPdfWidth) / 2;
      legendY = doc.internal.pageSize.getHeight() - legendPdfHeight - 10;

    } catch (err) {
      console.error("Erreur génération légende PDF", err);
    } finally {
      document.body.removeChild(legendContainer);
    }

    // 2. Téléchargement via PROXY SERVERLESS (Rapide + Fiable + Contourne CORS/Timeout client)
    console.log("Début du téléchargement via Proxy...");

    const fetchImageViaProxy = async (url, index) => {
      if (!url) return { error: "URL vide" };
      if (url.startsWith('data:')) return url;

      if (url.startsWith('http') || url.startsWith('gs://')) {
        try {
          if (!storage) throw new Error("Storage non initialisé");
          const storageRef = ref(storage, url);

          // 1. Obtenir l'URL publique signée (rapide, juste une signature)
          const downloadURL = await getDownloadURL(storageRef);

          // 2. Passer par notre PROXY Vercel pour le téléchargement réel
          // Le client appelle son propre serveur (/api/proxy-image)
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(downloadURL)}`;

          // Timeout Proxy de 60s
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          const response = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`Proxy Error: ${response.status}`);

          const arrayBuffer = await response.arrayBuffer();

          let binary = '';
          const bytes = new Uint8Array(arrayBuffer);
          const len = bytes.byteLength;
          for (let k = 0; k < len; k++) binary += String.fromCharCode(bytes[k]);

          return `data:image/png;base64,${window.btoa(binary)}`;
        } catch (e) {
          console.error(`Erreur image ${index}:`, e);
          return { error: e.message || "Erreur de téléchargement" };
        }
      }
      return { error: "Format URL non supporté" };
    };

    // Retour au chargement parallèle (Batch de 5) car le Proxy est RAPIDE (Backbone network)
    const activeCaptures = validCaptures.map((url, i) => ({ url, index: i }));
    const loadedImages = new Array(activeCaptures.length);
    const BATCH_SIZE = 5;

    for (let i = 0; i < activeCaptures.length; i += BATCH_SIZE) {
      const batch = activeCaptures.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(item => fetchImageViaProxy(item.url, item.index)));
      results.forEach((res, batchIndex) => {
        loadedImages[i + batchIndex] = res;
      });
    }

    console.log("Images téléchargées/traitées (Proxy):", loadedImages);

    // 3. Boucle de génération des pages PDF
    for (let i = 0; i < loadedImages.length; i++) {
      doc.addPage('a4', 'l');
      const pageNumber = i + 2;
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber} / ${totalPages}`, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 10);

      const result = loadedImages[i];

      // Si c'est une string (DataURL), c'est une image valide
      if (typeof result === 'string' && result.startsWith('data:image')) {
        try {
          const img = new Image();
          img.src = result;
          await new Promise((resolve) => {
            if (img.complete) resolve();
            else img.onload = resolve;
            img.onerror = resolve;
          });

          const imgPropsCap = doc.getImageProperties(img);
          const capturePdfWidth = doc.internal.pageSize.getWidth() - 30;
          const maxH = doc.internal.pageSize.getHeight() - 25 - (legendPdfHeight || 0);

          const ratio = Math.min(capturePdfWidth / imgPropsCap.width, maxH / imgPropsCap.height);
          const finalW = imgPropsCap.width * ratio;
          const finalH = imgPropsCap.height * ratio;

          const x = (doc.internal.pageSize.getWidth() - finalW) / 2;
          const y = 15;

          doc.addImage(result, 'PNG', x, y, finalW, finalH);
        } catch (e) {
          console.error("Erreur ajout image au PDF", e);
          doc.setFontSize(12);
          doc.setTextColor(255, 0, 0);
          doc.text(`Erreur rendu image: ${e.message}`, 20, 100);
        }
      } else {
        // C'est un objet erreur ou null
        const msg = result?.error || "Image inaccessible";
        doc.setFontSize(14);
        doc.setTextColor(255, 0, 0);
        doc.text(`Image non disponible`, 105, 90);
        doc.setFontSize(10);
        doc.text(`Raison: ${msg}`, 105, 100); // Affiche la raison exacte (Timeout, 404, etc)
      }

      // Ajout légende si dispo
      if (legendImgData) {
        doc.addImage(legendImgData, 'PNG', legendX, legendY, legendPdfWidth, legendPdfHeight);
      }
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
  const { project, saveProject, setProject } = useProject();
  const [showSaveDialog, setShowSaveDialog] = useState(false);


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const startNewProject = () => {
    const newProject = {
      id: `proj_${Date.now()}`,
      name: '',
      firstName: '',
      email: '',
      phone: '',
      address: '',
      zip: '',
      city: '',
      gps: '',
      type: 'Construction',
      status: 'Nouveau',
      user: project?.user || '',
      projectSize: '',
      comments: '',
      captures: [null, null, null, null],
      photos: [],
      features: null,
      createdAt: new Date().toISOString()
    };

    setProject(newProject);
    // Force reset map and editor state
    window.dispatchEvent(new CustomEvent('project:editor-reset'));
    navigate('/project/new/edit');
  };

  const handleEditorClick = (e) => {
    if (isProjectPage) {
      e.preventDefault();
      setShowSaveDialog(true);
    } else {
      // Even if not on project page, ensure we start fresh if clicking "Editeur de projet"
      // But NavLink default behavior is just navigation.
      // We want to force a RESET.
      // E.g. if we are on CRM and click Editor, we want a BLANK editor, not the last loaded project state (if any persisted).
      // Standard Link to /project/new/edit should trigger the useEffect in ProjectEditor to reset IF the ID changes.
      // If we want to accept the user requirement "A chaque fois que je clique sur Editeur de projet, cela doit me ramener sur une page vierge",
      // it is safer to force the reset manually here too.
      e.preventDefault();
      startNewProject();
    }
  };

  const handleSaveAndContinue = async () => {
    if (saveProject) {
      try {
        await saveProject();
        toast({
          ...toastStyle,
          title: "Projet sauvegardé !",
          description: "Vos modifications ont été enregistrées.",
          variant: "default"
        });
        startNewProject();
      } catch (error) {
        console.error("Erreur sauvegarde projet:", error);
        toast({
          ...toastStyle,
          title: "Erreur de sauvegarde",
          description: "Impossible de sauvegarder le projet.",
          variant: "destructive"
        });
      } finally {
        setShowSaveDialog(false);
      }
    } else {
      startNewProject();
      setShowSaveDialog(false);
    }
  };

  const handleDiscardAndContinue = () => {
    startNewProject();
    setShowSaveDialog(false);
  };


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
            <NavLink
              to="/project/new/edit"
              onClick={handleEditorClick}
              className={({ isActive }) => isActive ? 'nav-link active editeur' : 'nav-link editeur'}
            >
              Editeur de projet
            </NavLink>

            {(user?.role === 'admin' || user?.permissions?.canAccessConfigurator) && (
              <NavLink to="/configurateur" className={({ isActive }) => isActive ? 'nav-link active configurateur' : 'nav-link configurateur'}>Configurateur</NavLink>
            )}

            {/* Show Simulator if explicit permission is granted OR if admin (unless admin explicitly restricted) */}
            {((user?.role === 'admin' && user?.permissions?.canAccessSimulator !== false) || user?.permissions?.canAccessSimulator) && (
              <NavLink to="/simulator" className={({ isActive }) => isActive ? 'nav-link active simulateur' : 'nav-link simulateur'}>Simulateur</NavLink>
            )}

            {/* CDP Link (Admin only) */}
            {user?.role === 'admin' && (
              <NavLink to="/cdp" className={({ isActive }) => isActive ? 'nav-link active cdp' : 'nav-link cdp'}>
                CDP
              </NavLink>
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

      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voulez-vous sauvegarder les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de quitter cette page. Voulez-vous sauvegarder vos modifications avant de créer un nouveau projet ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardAndContinue}>Non</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => {
              e.preventDefault();
              handleSaveAndContinue();
            }}>
              Oui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
