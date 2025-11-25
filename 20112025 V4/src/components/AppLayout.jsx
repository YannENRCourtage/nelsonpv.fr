
import React from 'react';
    import { Link, Outlet, NavLink, useNavigate, useMatch } from 'react-router-dom';
    import Footer from './Footer.jsx';
    import { useAuth } from '../contexts/AuthContext.jsx';
    import { useProject } from '../contexts/ProjectContext.jsx';
    import { Button } from './ui/button.jsx';
    import { LogOut, FileDown, Save, Bell, Users } from 'lucide-react'; // Removed Sun, Moon
    import { toast } from "@/components/ui/use-toast.js";
    import jsPDF from "jspdf";
    import html2canvas from 'html2canvas';
    import PDFGenerator from './PDFGenerator.jsx';
    import ReactDOMServer from 'react-dom/server';
    import useNotifications from '../hooks/useNotifications.jsx';
    import { Popover, PopoverContent, PopoverTrigger } from './ui/popover.jsx';
    // Removed: import { useTheme } from '../contexts/ThemeContext.jsx';
    
    export const generatePdfForProject = async (projectData) => {
        if (!projectData) {
            toast({ title: "Erreur", description: "Aucune donnée de projet fournie."});
            return;
        }
    
        const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
        
        const pdfContainer = document.createElement('div');
        pdfContainer.innerHTML = ReactDOMServer.renderToString(<PDFGenerator project={projectData} />);
        document.body.appendChild(pdfContainer);
    
        const canvas = await html2canvas(pdfContainer.firstChild, { scale: 2, useCORS: true });
        document.body.removeChild(pdfContainer);
    
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
        if (projectData.captures && projectData.captures.length > 0) {
            for (let i = 0; i < projectData.captures.length; i++) {
                const captureDataUrl = projectData.captures[i];
                if (!captureDataUrl) continue;
                doc.addPage('a4', 'l');
                
                const pageNumber = i + 2;
                const totalPages = projectData.captures.filter(c => c).length + 1;
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text(`Page ${pageNumber} / ${totalPages}`, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 10);

                doc.setFontSize(16);
                doc.setTextColor(0);
                doc.text(`Vue d'implantation N°${i + 1}`, 15, 15);
                
                const img = new Image();
                img.src = captureDataUrl;
                
                const imgProps = doc.getImageProperties(img);
                const capturePdfWidth = doc.internal.pageSize.getWidth() - 30;
                const capturePdfHeight = doc.internal.pageSize.getHeight() - 30;
                const ratio = Math.min(capturePdfWidth / imgProps.width, capturePdfHeight / imgProps.height);
                const imgWidth = imgProps.width * ratio;
                const imgHeight = imgProps.height * ratio;
    
                const x = (doc.internal.pageSize.getWidth() - imgWidth) / 2;
                const y = 20;
    
                doc.addImage(captureDataUrl, 'PNG', x, y, imgWidth, imgHeight);
            }
        }
        
        const projectTitle = `Fiche projet - ${projectData.name || ''} ${projectData.zip || ''} ${projectData.city || ''}`.trim();
        doc.save(`${projectTitle}.pdf`);
        toast({
            title: "PDF Généré",
            description: "Le fichier PDF a été téléchargé."
        });
    };
    
    function NotificationBell() {
        const { notifications, hasUnread, markAllAsRead } = useNotifications();
    
        return (
            <Popover onOpenChange={(open) => { if (!open) markAllAsRead(); }}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full">
                        <Bell className="h-5 w-5" />
                        {hasUnread && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="font-bold mb-2">Notifications</div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map(n => (
                             <div key={n.id} className="p-2 border-b text-sm">
                                <p className={!n.read ? 'font-semibold' : ''}>{n.message}</p>
                                <p className="text-xs text-gray-500">{new Date(n.date).toLocaleString('fr-FR')}</p>
                             </div>
                        )) : <p className="text-sm text-gray-500">Aucune notification.</p>}
                    </div>
                </PopoverContent>
            </Popover>
        )
    }

    function Header() {
      const { logout, user } = useAuth();
      const navigate = useNavigate();
      const isProjectPage = useMatch("/project/:projectId/edit");
      const { project, saveProjectToLS } = useProject();
      // Removed: const { theme, toggleTheme } = useTheme();
    
      const handleLogout = () => {
        logout();
        navigate('/login');
      };
      
      const handleGeneratePdf = () => generatePdfForProject(project);
    
      const handleSave = () => {
        saveProjectToLS();
        toast({
          title: "Projet sauvegardé !",
          description: "Vos modifications ont été enregistrées avec succès."
        })
      }
    
      const getProjectTitle = () => {
        if (!project) return "Chargement...";
        const title = `${project.name || 'Projet'} ${project.zip || ''} ${project.city || ''}`.trim();
        return title.toUpperCase();
      }
    
      return (
        <header className="app-header">
          <div className="app-header__container">
            <div className="flex items-center gap-8">
                <Link to="/" className="app-header__logo">
                  <img src="https://horizons-cdn.hostinger.com/350bc103-daf8-48b5-9a02-076489f36a7d/338201d787e373b4c0b156cb07a5b792.png" alt="NELSON par ENR Courtage" />
                </Link>
                <nav className="app-header__nav">
                  <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active projects' : 'nav-link projects'}>Projets</NavLink>
                  <NavLink to="/crm" className={({ isActive }) => isActive ? 'nav-link active crm' : 'nav-link crm'}>CRM</NavLink>
                  {user?.role === 'admin' && (
                    <NavLink to="/monday" className={({ isActive }) => isActive ? 'nav-link active admin' : 'nav-link admin'}>Monday</NavLink>
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
                    <span className="text-sm text-gray-600 dark:text-gray-300">Bonjour, {user?.name || 'Utilisateur'}</span>
                )}
                 {user?.role === 'admin' && !isProjectPage && (
                  <Button variant="ghost" size="icon" onClick={() => navigate('/monday', { state: { openUserManagement: true } })} className="rounded-full">
                    <Users className="h-5 w-5" />
                  </Button>
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
