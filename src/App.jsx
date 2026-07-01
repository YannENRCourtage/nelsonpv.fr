import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectEditor from './pages/ProjectEditor.jsx';
import Login from './pages/Login.jsx';
import AppLayout from './components/AppLayout.jsx';
import Crm from './pages/Crm.jsx';
import Admin from './pages/Admin.jsx';
import ProfitabilitySimulator from './pages/ProfitabilitySimulator.jsx';
import Configurateur from './pages/Configurateur.jsx';
import CDP from './pages/CDP.jsx';
import Odoo from './pages/Odoo.jsx';
import Monday from './pages/Monday.jsx';
import Finance from './pages/Finance.jsx';
import DossierTracking from './pages/DossierTracking.jsx';
import BpAcama from './pages/BpAcama.jsx';
import Developpement from './pages/Developpement.jsx';
import AdminEnedis from './pages/AdminEnedis.jsx';
import MentionsLegales from './pages/Legal/MentionsLegales.jsx';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy.jsx';
import { Toaster } from './components/ui/toaster.jsx';
import { ProjectProvider } from './contexts/ProjectContext.jsx';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DevErrorBoundary from './components/DevErrorBoundary.jsx';
import TawkMessenger from './components/TawkMessenger.jsx';
import CrispChat from './components/CrispChat.jsx';
import GoogleAnalytics from './components/GoogleAnalytics.jsx';

function AppContent() {
  const { isAuthenticated, user } = useAuth();

  // FORCE ROLE UPDATE FOR "Contact ENR COURTAGE"
  useEffect(() => {
    const forceDowngrade = async () => {
      if (user && user.email === 'contact@enr-courtage.fr' && user.role === 'admin') {
        console.log("Forcing downgrade for Contact ENR COURTAGE...");
        try {
          const { apiService } = await import('./services/api');
          await apiService.updateUser(user.id, { role: 'user' });
          console.log("Downgrade successful. Please refresh.");
        } catch (err) {
          console.error("Downgrade failed", err);
        }
      }
    };
    forceDowngrade();
  }, [user]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/crm" replace />} />
          <Route
            path="crm"
            element={
              <ProtectedRoute requiredPermission="canAccessCRM">
                <Crm />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
          {/* Route Simulateur masquée
          <Route
            path="simulator"
            element={
              <ProtectedRoute requiredPermission="canAccessSimulator">
                <ProfitabilitySimulator />
              </ProtectedRoute>
            }
          />
          */}
          <Route
            path="configurateur"
            element={
              <ProtectedRoute requiredPermission="canAccessConfigurator">
                <Configurateur />
              </ProtectedRoute>
            }
          />
          <Route
            path="cdp"
            element={
              <ProtectedRoute requiredRole="admin">
                <CDP />
              </ProtectedRoute>
            }
          />
          <Route
            path="project/:projectId/edit"
            element={
              <ProtectedRoute requiredPermission="canAccessEditor">
                <ProjectEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="project/new/edit"
            element={
              <ProtectedRoute requiredPermission="canAccessEditor">
                <ProjectEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="odoo"
            element={
              <ProtectedRoute>
                <Odoo />
              </ProtectedRoute>
            }
          />
          <Route
            path="monday"
            element={
              <ProtectedRoute requiredRole="admin">
                <Monday />
              </ProtectedRoute>
            }
          />
          {/* Route Finance masquée
          <Route
            path="finance"
            element={
              <ProtectedRoute requiredPermission="canAccessFinance">
                <Finance />
              </ProtectedRoute>
            }
          />
          */}
          <Route
            path="tracking"
            element={
              <ProtectedRoute requiredPermission="canAccessTracking">
                <DossierTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="bp"
            element={
              <ProtectedRoute>
                <BpAcama />
              </ProtectedRoute>
            }
          />
          <Route
            path="developpement"
            element={
              <ProtectedRoute requiredPermission="canAccessDeveloppement">
                <Developpement />
              </ProtectedRoute>
            }
          />
          <Route
            path="enedis-admin"
            element={
              <ProtectedRoute requiredPermission="canAccessEnedis">
                <AdminEnedis />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Routes Légales (Accessibles sans login) */}
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/politique-confidentialite" element={<PrivacyPolicy />} />

        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
      <Toaster />
      <CrispChat />
      <GoogleAnalytics />
    </DndProvider>
  );
}

export default function App() {
  useEffect(() => {
    // Statcounter code
    window.sc_project = 13184566;
    window.sc_invisible = 1;
    window.sc_security = "3238a270";
    window.sc_https = 1;

    const script = document.createElement('script');
    script.src = "https://www.statcounter.com/counter/counter.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <AuthProvider>
      <ProjectProvider>
        <DevErrorBoundary>
          <AppContent />
        </DevErrorBoundary>
      </ProjectProvider>
    </AuthProvider>
  );
}