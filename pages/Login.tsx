import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      // Redirect admin users to admin dashboard, others to regular dashboard
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      // Redirect based on user role after successful login
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: Illustration */}
      <div className="hidden lg:flex w-1/2 bg-indigo-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-indigo-800 opacity-90 z-10"></div>
        <img 
          src="https://picsum.photos/seed/library/1200/1600" 
          alt="Library" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 p-12 text-white max-w-lg">
          <h1 className="text-5xl font-bold mb-6 tracking-tight">Expand your knowledge base.</h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Join millions of learners and teachers worldwide using Courseris to master new skills and share knowledge.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Welcome back!</h2>
            <p className="text-slate-500 mt-2">Sign in to your account to continue.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <Button 
              type="submit" 
              fullWidth 
              size="lg"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <p className="text-center mt-8 text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
