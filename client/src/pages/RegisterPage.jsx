import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Container from '../components/Container';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, User, Phone, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Customer Registration Page (/register) for Collections by Chandni
 *
 * Implements Step 13:
 * - Full name, email, optional phone, password, and confirm password fields
 * - Client-side validation: format, minimum 8 characters, password matching
 * - Password visibility toggle
 * - Prevents multiple submissions while in progress
 * - Seamless automatic login upon successful registration
 * - Link to login page (/login)
 */
export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field errors
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { registerCustomer, isAuthenticated, isCustomer, isAdmin } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/account', { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, isCustomer, navigate]);

  const validate = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (phone.trim()) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/;
      if (!phoneRegex.test(phone.trim())) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await registerCustomer({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
      navigate('/account', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Error creating account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAF9F5] min-h-[80vh] py-16 sm:py-20 flex items-center">
      <Container size="narrow">
        <div className="max-w-md mx-auto bg-white border border-stone-200/90 rounded-sm shadow-xs p-8 sm:p-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block">
              Collections by Chandni
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-950">
              Create an Account
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm font-light">
              Join our atelier for bespoke Indian ethnic wear, order updates, and tailored concierge support.
            </p>
          </div>

          {/* Server Error Banner */}
          {serverError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xs text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-name"
                className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
              >
                Full Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                  }}
                  placeholder="Chandni Sharma"
                  autoComplete="name"
                  required
                  className={`w-full py-2.5 pl-9 pr-3 text-xs bg-[#FAF9F5] border rounded-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white transition-colors ${
                    fieldErrors.name ? 'border-rose-400 focus:border-rose-600' : 'border-stone-300 focus:border-[#781D42]'
                  }`}
                />
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
              >
                Email Address <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  placeholder="chandni@example.com"
                  autoComplete="email"
                  required
                  className={`w-full py-2.5 pl-9 pr-3 text-xs bg-[#FAF9F5] border rounded-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white transition-colors ${
                    fieldErrors.email ? 'border-rose-400 focus:border-rose-600' : 'border-stone-300 focus:border-[#781D42]'
                  }`}
                />
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Phone Number (Optional) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="register-phone"
                  className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
                >
                  Phone Number
                </label>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-light">
                  Optional
                </span>
              </div>
              <div className="relative">
                <input
                  id="register-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
                  }}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  className={`w-full py-2.5 pl-9 pr-3 text-xs bg-[#FAF9F5] border rounded-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white transition-colors ${
                    fieldErrors.phone ? 'border-rose-400 focus:border-rose-600' : 'border-stone-300 focus:border-[#781D42]'
                  }`}
                />
                <Phone
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
              >
                Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  required
                  className={`w-full py-2.5 pl-9 pr-10 text-xs bg-[#FAF9F5] border rounded-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white transition-colors ${
                    fieldErrors.password ? 'border-rose-400 focus:border-rose-600' : 'border-stone-300 focus:border-[#781D42]'
                  }`}
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
              {fieldErrors.password ? (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.password}</p>
              ) : (
                <p className="text-[10px] text-stone-400 font-light">At least 8 characters long</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-confirm-password"
                className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
              >
                Confirm Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                  }}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  className={`w-full py-2.5 pl-9 pr-3 text-xs bg-[#FAF9F5] border rounded-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white transition-colors ${
                    fieldErrors.confirmPassword ? 'border-rose-400 focus:border-rose-600' : 'border-stone-300 focus:border-[#781D42]'
                  }`}
                />
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] text-rose-600 font-medium">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-[#781D42] hover:bg-[#5B1123] text-white text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:bg-stone-300 disabled:cursor-not-allowed group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
              >
                <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
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
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#781D42] hover:underline font-semibold"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
