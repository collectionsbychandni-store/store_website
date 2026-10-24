import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import Container from '../../components/Container';
import Button from '../../components/Button';

/**
 * Admin Login Page (/admin/login)
 * Features:
 * - Brand heading: Collections by Chandni
 * - Subtitle: Admin Portal
 * - Email & Password fields
 * - Show/Hide password toggle
 * - Loading & disabled states
 * - Error message display
 * - Demo credentials hint
 */
export default function AdminLogin() {
  const [email, setEmail] = useState('admin@collectionsbychandni.in');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loginAdmin, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/admin';

  // If already authenticated as admin, redirect to /admin
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await loginAdmin(email.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@collectionsbychandni.in');
    setPassword('Admin@123');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#FAF9F5] selection:bg-amber-100 selection:text-stone-900">
      <Container size="narrow">
        <div className="max-w-md mx-auto w-full">
          {/* Back link */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center text-xs uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              <span>Back to Storefront</span>
            </Link>
          </div>

          {/* Card Container */}
          <div className="bg-white border border-stone-200 p-8 sm:p-10 rounded-sm shadow-xs space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-medium block">
                Atelier Administration
              </span>
              <h1 className="font-serif text-3xl font-semibold text-stone-950 tracking-tight">
                Collections by Chandni
              </h1>
              <p className="font-serif italic text-stone-600 text-lg">
                Admin Portal
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 p-3.5 rounded-sm flex items-start space-x-3 text-red-800 text-sm"
              >
                <ShieldAlert size={18} className="shrink-0 mt-0.5 text-red-600" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-email"
                  className="block text-xs uppercase tracking-wider font-semibold text-stone-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Mail size={16} />
                  </div>
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="admin@collectionsbychandni.in"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-stone-50/50 border border-stone-300 rounded-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 disabled:opacity-60 transition-colors"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs uppercase tracking-wider font-semibold text-stone-700"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock size={16} />
                  </div>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 text-sm bg-stone-50/50 border border-stone-300 rounded-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 disabled:opacity-60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <Button
                  type="submit"
                  size="md"
                  variant="primary"
                  disabled={isSubmitting}
                  className="w-full justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Login</span>
                  )}
                </Button>
              </div>
            </form>

            {/* Demo Credentials Box */}
            <div className="pt-4 border-t border-stone-100 text-xs text-stone-500 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider text-stone-700">
                  Demo Credentials:
                </span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-stone-900 underline hover:text-amber-800 font-medium"
                >
                  Fill credentials
                </button>
              </div>
              <p className="font-mono text-[11px] text-stone-600 bg-stone-50 p-2 rounded-sm border border-stone-200">
                Email: <span className="text-stone-900 font-semibold">admin@collectionsbychandni.in</span>
                <br />
                Password: <span className="text-stone-900 font-semibold">Admin@123</span>
              </p>
              <p className="text-[11px] text-stone-400">
                Note: Passwords are encrypted with bcrypt and verified against PostgreSQL.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
