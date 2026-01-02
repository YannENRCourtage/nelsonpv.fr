import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import ConsumerPage from '@/pages/ConsumerPage';
import AssociationPage from '@/pages/AssociationPage';
import PasswordPrompt from '@/components/PasswordPrompt';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/espace-producteur' && !isAuthenticated) {
      // Allow PasswordPrompt to handle it
    }
  }, [location, isAuthenticated, navigate]);

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true);
    navigate('/espace-producteur');
  };
  
  const ProtectedProducerPage = () => {
    if (!isAuthenticated) {
      return <PasswordPrompt onPasswordSuccess={handlePasswordSuccess} />;
    }
    return <AssociationPage />;
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ConsumerPage />} />
          <Route path="espace-producteur" element={<ProtectedProducerPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;