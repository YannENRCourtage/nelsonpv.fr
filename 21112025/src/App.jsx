import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectEditor from './pages/ProjectEditor.jsx';
import Login from './pages/Login.jsx';
import AppLayout from './components/AppLayout.jsx';
import Crm from './pages/Crm.jsx';
import Admin from './pages/Admin.jsx';
import { Toaster } from './components/ui/toaster.jsx';
import { ProjectProvider } from './contexts/ProjectContext.jsx';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DevErrorBoundary from './components/DevErrorBoundary.jsx';
// Removed: import { ThemeProvider } from './contexts/ThemeContext.jsx'; // Import ThemeProvider

function PrivateRoute({ children, page }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const accessDenied = page && user?.pageAccess && user.pageAccess[page] === false;
  if (accessDenied) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <DndProvider backend={HTML5Backend}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <PrivateRoute page="projects">
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route
            path="crm"
            element={
              <PrivateRoute page="crm">
                <Crm />
              </PrivateRoute>
            }
          />
          <Route
            path="monday"
            element={
              <PrivateRoute page="admin">
                <Admin />
              </PrivateRoute>
            }
          />
          <Route path="project/:projectId/edit" element={<ProjectEditor />} />
          <Route path="project/new/edit" element={<ProjectEditor />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
      <Toaster />
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
      {/* Removed ThemeProvider */}
        <ProjectProvider>
          <DevErrorBoundary>
            <AppContent />
          </DevErrorBoundary>
        </ProjectProvider>
      {/* Removed ThemeProvider */}
    </AuthProvider>
  );
}