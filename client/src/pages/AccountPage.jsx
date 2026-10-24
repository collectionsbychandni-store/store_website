import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  User,
  Mail,
  Phone,
  Calendar,
  LogOut,
  Edit3,
  Check,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X,
  MapPin,
  Package,
} from 'lucide-react';

/**
 * Customer Account Page (/account) for Collections by Chandni
 *
 * Implements Step 13:
 * - Customer identity display (name, email, phone, member since)
 * - In-place profile editing (name, phone)
 * - Server-side validation with success & error notifications
 * - Logout action with redirect to home
 * - Boutique Indian fashion styling
 */
export default function AccountPage() {
  const { user, updateProfile, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const formattedJoinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Valued Patron';

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setFeedback({
        type: 'error',
        message: 'Name must be at least 2 characters long',
      });
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        setFeedback({
          type: 'error',
          message: 'Please enter a valid phone number',
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      await updateProfile({
        name: trimmedName,
        phone: trimmedPhone || null,
      });
      setIsEditing(false);
      setFeedback({
        type: 'success',
        message: 'Your profile has been updated successfully',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error updating profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="bg-[#FAF9F5] min-h-screen pb-20">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="border-b border-stone-200/60 bg-[#FDFCF7]/80 py-3.5">
        <Container>
          <ol className="flex items-center flex-wrap gap-2 text-xs text-stone-500 font-sans tracking-wide">
            <li>
              <Link to="/" className="hover:text-[#781D42] transition-colors font-medium">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-stone-300">
              <ChevronRight size={13} />
            </li>
            <li className="text-stone-800 font-medium">My Account</li>
          </ol>
        </Container>
      </nav>

      {/* Main Account Section */}
      <section className="pt-8 sm:pt-12">
        <Container>
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-stone-200/90 gap-4">
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                  Client Atelier Portal
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-stone-950">
                  Welcome, {user?.name || 'Patron'}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-300 text-stone-700 hover:text-rose-700 hover:border-rose-300 text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors self-start sm:self-auto"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Notification Feedback */}
            {feedback && (
              <div
                className={`p-4 rounded-xs border text-xs flex items-center justify-between ${
                  feedback.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
                  <span>{feedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="p-1 hover:opacity-75"
                  aria-label="Dismiss message"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Account Information Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Profile Details (8 cols) */}
              <div className="md:col-span-8 bg-white border border-stone-200/90 rounded-sm p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-200/80">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-stone-900">
                      Personal Profile
                    </h2>
                    <p className="text-xs text-stone-500 font-light mt-0.5">
                      Your registered details with Collections by Chandni
                    </p>
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setName(user?.name || '');
                        setPhone(user?.phone || '');
                        setIsEditing(true);
                        setFeedback(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#781D42] hover:text-[#5B1123] font-semibold"
                    >
                      <Edit3 size={14} />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="space-y-4 text-xs font-sans">
                    <div className="flex items-start gap-3 p-3 bg-[#FAF9F5] border border-stone-200/70 rounded-xs">
                      <User size={16} className="text-[#781D42] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block">
                          Full Name
                        </span>
                        <span className="text-stone-900 font-medium text-sm">
                          {user?.name || 'Not provided'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#FAF9F5] border border-stone-200/70 rounded-xs">
                      <Mail size={16} className="text-[#781D42] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block">
                          Email Address
                        </span>
                        <span className="text-stone-900 font-medium text-sm">
                          {user?.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#FAF9F5] border border-stone-200/70 rounded-xs">
                      <Phone size={16} className="text-[#781D42] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block">
                          Phone Number
                        </span>
                        <span className="text-stone-900 font-medium text-sm">
                          {user?.phone || 'Not added yet'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#FAF9F5] border border-stone-200/70 rounded-xs">
                      <Calendar size={16} className="text-[#781D42] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block">
                          Patron Since
                        </span>
                        <span className="text-stone-900 font-medium text-sm">
                          {formattedJoinDate}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit Form */
                  <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-sans">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="edit-name"
                        className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
                      >
                        Full Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="edit-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full py-2.5 px-3 text-xs bg-[#FAF9F5] border border-stone-300 rounded-xs text-stone-900 focus:outline-none focus:border-[#781D42] focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="edit-email"
                        className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
                      >
                        Email Address
                      </label>
                      <input
                        id="edit-email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full py-2.5 px-3 text-xs bg-stone-100 border border-stone-200 rounded-xs text-stone-500 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-stone-400 font-light">
                        Email address cannot be modified once registered.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="edit-phone"
                        className="block text-xs font-semibold text-stone-800 uppercase tracking-wider"
                      >
                        Phone Number
                      </label>
                      <input
                        id="edit-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full py-2.5 px-3 text-xs bg-[#FAF9F5] border border-stone-300 rounded-xs text-stone-900 focus:outline-none focus:border-[#781D42] focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="pt-3 flex gap-3">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="py-2.5 px-5 bg-[#781D42] hover:bg-[#5B1123] text-white text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors disabled:bg-stone-300"
                      >
                        {isSaving ? 'Saving Changes...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="py-2.5 px-4 border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Quick Actions & Atelier Highlights (4 cols) */}
              <div className="md:col-span-4 space-y-4">
                {/* Shopping Bag Card */}
                <div className="bg-white border border-stone-200/90 rounded-sm p-6 space-y-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAF4EB] text-[#781D42] flex items-center justify-center">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-semibold text-stone-900">
                        Shopping Bag
                      </h3>
                      <p className="text-xs text-stone-500 font-light">
                        {totalItems} {totalItems === 1 ? 'piece' : 'pieces'} waiting
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/cart"
                    className="w-full py-2.5 px-4 bg-[#781D42] hover:bg-[#5B1123] text-white text-xs uppercase tracking-wider font-semibold rounded-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 group"
                  >
                    <span>View Shopping Bag</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                {/* Delivery Addresses Card (Step 14) */}
                <div className="bg-white border border-stone-200/90 rounded-sm p-6 space-y-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAF4EB] text-[#781D42] flex items-center justify-center">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-semibold text-stone-900">
                        Delivery Addresses
                      </h3>
                      <p className="text-xs text-stone-500 font-light">
                        Saved home & office addresses
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/account/addresses"
                    className="w-full py-2.5 px-4 border border-[#781D42] text-[#781D42] hover:bg-[#FAF4EB] text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors flex items-center justify-center gap-1.5 group"
                  >
                    <span>Manage Addresses</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                {/* Orders Card (Step 15) */}
                <div className="bg-white border border-stone-200/90 rounded-sm p-6 space-y-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAF4EB] text-[#781D42] flex items-center justify-center">
                      <Package size={18} />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-semibold text-stone-900">
                        My Orders
                      </h3>
                      <p className="text-xs text-stone-500 font-light">
                        Track artisan pieces & order history
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/account/orders"
                    className="w-full py-2.5 px-4 border border-[#781D42] text-[#781D42] hover:bg-[#FAF4EB] text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors flex items-center justify-center gap-1.5 group"
                  >
                    <span>View All Orders</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                {/* Continue Shopping */}
                <div className="bg-[#FAF4EB]/60 border border-[#E6D7C3] rounded-sm p-6 space-y-3">
                  <div className="flex items-center gap-2 text-[#781D42]">
                    <Sparkles size={16} />
                    <span className="text-xs uppercase tracking-widest font-semibold">
                      Bespoke Indian Couture
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 font-light leading-relaxed">
                    Explore our latest seasonal arrivals in Chanderi silks, festive lehengas, and hand-embroidered kurtis.
                  </p>
                  <Link
                    to="/shop"
                    className="text-xs font-semibold text-[#781D42] hover:underline uppercase tracking-wider inline-flex items-center gap-1 pt-1"
                  >
                    <span>Browse Collection →</span>
                  </Link>
                </div>

                {/* Atelier Trust Signals */}
                <div className="p-4 bg-white border border-stone-200/80 rounded-sm space-y-2 text-[11px] text-stone-500 font-light">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#781D42] shrink-0" />
                    <span>Personalized Concierge & Order Assistance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#781D42] shrink-0" />
                    <span>Complimentary Express Shipping Across India</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white max-w-sm w-full p-6 sm:p-8 rounded-sm shadow-xl border border-stone-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-stone-100 text-[#781D42] flex items-center justify-center mx-auto">
              <LogOut size={20} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Sign Out of Collections by Chandni?
              </h3>
              <p className="text-xs text-stone-600 font-light leading-relaxed">
                You will be signed out of your patron account. Your shopping bag will remain preserved on this device.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 bg-[#781D42] text-white hover:bg-[#5B1123] text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
