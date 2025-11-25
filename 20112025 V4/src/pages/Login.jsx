
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Card, CardContent, CardHeader } from '../components/ui/card.jsx';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Identifiants incorrects');
      setLoading(false);
    }
  };

  const logoContainerVariants = {
    rest: { scale: 1 },
    hover: { 
      scale: 1.03,
      transition: {
        type: "tween",
        ease: "easeInOut",
        duration: 0.3
      }
    }
  };
  
  return (
    <div className="login-page">
      <Card className="login-card">
        <CardHeader className="text-center">
            <motion.div
                initial="rest"
                whileHover="hover"
                animate="rest"
                variants={logoContainerVariants}
                className="flex flex-col items-center cursor-pointer"
            >
                <img className="mx-auto h-20 w-auto logo-nelson-clipped mb-[-12px]" alt="Logo NELSON" src="https://horizons-cdn.hostinger.com/350bc103-daf8-48b5-9a02-076489f36a7d/c526f4549f2b349600f6df6ad6eb3193.png" />
                <p className="text-sm text-gray-500">
                    Par ENR COURTAGE
                </p>
            </motion.div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.fr"
                required
                disabled={loading}
                className="placeholder-transparent"
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    disabled={loading}
                    className="pl-9 placeholder-transparent"
                  />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div className="pt-2">
                <Button type="submit" className="w-full login-button text-white" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
