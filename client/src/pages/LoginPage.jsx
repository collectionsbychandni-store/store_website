import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Container from '../components/Container';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

/**
 * Customer Login Page (/login) for Collections by Chandni
 *
 * Implements Step 13:
 * - Email & Password authentication
 * - Password visibility toggle
 * - Generic non-revealing credential errors
 * - Link to customer registration (/register)
 * - Seamless redirect to account or return destination
 * - Boutique Indian fashion styling
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loginCustomer, isAuthenticated, isCustomer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || (isCustomer ? '/account' : '/');

  // If already logged in, redirect
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, isCustomer, navigate, redirectPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email address is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await loginCustomer(trimmedEmail, password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAF9F5] min-h-[75vh] py-16 sm:py-20 flex items-center">
      <Container size="narrow">
        <div className="max-w-md mx-auto bg-white border border-stone-200/90 rounded-sm shadow-xs p-8 sm:p-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block">
              Collections by Chandni
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-950">
              Welcome Back
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm font-light">
              Sign in to manage your artisanal bespoke selections and orders.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xs text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="customer-email"
                className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="customer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  autoComplete="email"
                  required
                  className="w-full py-2.5 pl-9 pr-3 text-xs bg-[#FAF9F5] border border-stone-300 rounded-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#781D42] focus:bg-white transition-colors"
                />
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="customer-password"
                className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="customer-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full py-2.5 pl-9 pr-10 text-xs bg-[#FAF9F5] border border-stone-300 rounded-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#781D42] focus:bg-white transition-colors"
                />
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-[#781D42] hover:bg-[#5B1123] text-white text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:bg-stone-300 disabled:cursor-not-allowed group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
              >
                <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </form>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-stone-200/80 text-center space-y-2 text-xs">
            <p className="text-stone-600">
              New to Collections by Chandni?{' '}
              <Link
                to="/register"
                className="text-[#781D42] hover:underline font-semibold"
              >
                Create an account
              </Link>
            </p>
            <div className="pt-2">
              <Link
                to="/shop"
                className="text-[11px] text-stone-400 hover:text-stone-700 uppercase tracking-wider inline-flex items-center gap-1"
              >
                <span>Continue browsing as guest</span>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
