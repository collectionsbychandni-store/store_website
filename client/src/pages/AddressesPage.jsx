import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import * as addressService from '../services/addressService';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Check,
  Star,
  Home,
  Briefcase,
  Navigation,
  ArrowLeft,
  AlertCircle,
  X,
  ShieldCheck,
  Truck,
  Sparkles,
} from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi NCR',
  'Jammu and Kashmir',
  'Ladakh',
  'Chandigarh',
];

const INITIAL_FORM_STATE = {
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: 'Maharashtra',
  pincode: '',
  country: 'India',
  addressType: 'HOME',
  isDefault: false,
};

/**
 * Customer Saved Addresses Page (/account/addresses)
 * Implements Step 14:
 * - List, Add, Edit, Delete saved addresses
 * - Set Default Address with single-default enforcement
 * - Categorize as Home, Work, or Other
 * - Indian PIN code and phone validation
 * - Collections by Chandni luxury aesthetic
 */
export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load addresses
  const loadAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await addressService.getAddresses();
      if (res?.data) {
        setAddresses(res.data);
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve your saved delivery addresses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Open modal for new address
  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setFormData({
      ...INITIAL_FORM_STATE,
      isDefault: addresses.length === 0, // auto default if first
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (addr) => {
    setEditingAddressId(addr.id);
    setFormData({
      name: addr.name || '',
      phone: addr.phone || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || 'Maharashtra',
      pincode: addr.pincode || '',
      country: addr.country || 'India',
      addressType: addr.addressType || 'HOME',
      isDefault: Boolean(addr.isDefault),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate form inputs
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/.test(formData.phone.trim())) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (!formData.addressLine1.trim()) {
      errors.addressLine1 = 'House/Flat No. & Street name is required';
    } else if (formData.addressLine1.trim().length < 3) {
      errors.addressLine1 = 'Address line 1 is too short';
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }

    if (!formData.pincode.trim()) {
      errors.pincode = 'PIN code is required';
    } else if (!/^[1-9][0-9]{5}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Please enter a valid 6-digit Indian PIN code';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit address (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editingAddressId) {
        await addressService.updateAddress(editingAddressId, formData);
        setFeedback({
          type: 'success',
          message: 'Delivery address updated successfully.',
        });
      } else {
        await addressService.createAddress(formData);
        setFeedback({
          type: 'success',
          message: 'New delivery address added successfully.',
        });
      }
      setIsModalOpen(false);
      await loadAddresses();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error saving address',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set default address
  const handleSetDefault = async (id) => {
    setFeedback(null);
    try {
      await addressService.setDefaultAddress(id);
      setFeedback({
        type: 'success',
        message: 'Primary delivery address updated.',
      });
      await loadAddresses();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error updating default address',
      });
    }
  };

  // Delete address
  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      await addressService.deleteAddress(deletingId);
      setFeedback({
        type: 'success',
        message: 'Address removed from your account.',
      });
      setDeletingId(null);
      await loadAddresses();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error removing address',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Type badge icon helper
  const renderTypeIcon = (type) => {
    switch (type) {
      case 'HOME':
        return <Home size={12} className="mr-1" />;
      case 'WORK':
        return <Briefcase size={12} className="mr-1" />;
      default:
        return <Navigation size={12} className="mr-1" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 pb-20">
      {/* Editorial Page Header */}
      <section className="bg-stone-100/60 border-b border-stone-200/80 py-10 sm:py-14">
        <Container>
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb & Navigation */}
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-4">
              <Link to="/account" className="hover:text-[#781D42] transition-colors flex items-center gap-1">
                <ArrowLeft size={14} />
                <span>My Account</span>
              </Link>
              <span>/</span>
              <span className="text-stone-800 font-medium">Delivery Addresses</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                  Patron Atelier
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-stone-950">
                  Saved Delivery Addresses
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-lg font-light leading-relaxed">
                  Manage your bespoke delivery locations across India for seamless artisan couture deliveries.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors shrink-0"
              >
                <Plus size={16} />
                <span>Add New Address</span>
              </button>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Content Area */}
      <section className="py-10">
        <Container>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Global Alert Notification */}
            {feedback && (
              <div
                className={`p-4 rounded-xs border text-xs flex items-start justify-between gap-3 animate-fade-in ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {feedback.type === 'success' ? (
                    <Check size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="p-6 bg-white border border-stone-200 rounded-xs shadow-xs animate-pulse space-y-4"
                  >
                    <div className="h-4 bg-stone-200 rounded-xs w-1/3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-stone-100 rounded-xs w-3/4" />
                      <div className="h-3 bg-stone-100 rounded-xs w-1/2" />
                    </div>
                    <div className="h-8 bg-stone-100 rounded-xs w-1/4 pt-2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center bg-white border border-stone-200 rounded-xs space-y-3">
                <AlertCircle size={28} className="text-rose-600 mx-auto" />
                <h3 className="font-serif text-lg font-medium text-stone-900">
                  Unable to Load Addresses
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">{error}</p>
                <button
                  type="button"
                  onClick={loadAddresses}
                  className="px-4 py-2 bg-stone-900 text-white text-xs uppercase tracking-wider rounded-xs"
                >
                  Retry
                </button>
              </div>
            ) : addresses.length === 0 ? (
              /* Empty State */
              <div className="p-12 text-center bg-white border border-dashed border-stone-300 rounded-xs space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center mx-auto">
                  <MapPin size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-medium text-stone-900">
                    No Saved Addresses Yet
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto font-light">
                    Add your home or office address to enjoy swift, one-click checkout for your luxury Indian couture pieces.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors"
                >
                  <Plus size={16} />
                  <span>Add First Address</span>
                </button>
              </div>
            ) : (
              /* Address Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`bg-white border rounded-xs p-6 shadow-xs relative flex flex-col justify-between transition-all ${
                      addr.isDefault
                        ? 'border-[#781D42] ring-1 ring-[#781D42]/30'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                            {renderTypeIcon(addr.addressType)}
                            {addr.addressType}
                          </span>

                          {addr.isDefault && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-semibold bg-[#FAF4EB] text-[#781D42] border border-[#E6D7C3]">
                              <Star size={10} className="fill-[#781D42]" />
                              Default Address
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Recipient Details */}
                      <h3 className="font-serif text-base font-semibold text-stone-950 mb-1">
                        {addr.name}
                      </h3>
                      <p className="text-xs font-mono text-stone-600 mb-3">
                        Phone: {addr.phone}
                      </p>

                      {/* Address Lines */}
                      <div className="text-xs text-stone-600 space-y-0.5 font-light leading-relaxed">
                        <p>{addr.addressLine1}</p>
                        {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                        {addr.landmark && (
                          <p className="text-stone-500 italic">Landmark: {addr.landmark}</p>
                        )}
                        <p className="font-medium text-stone-800 pt-1">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-[11px] text-stone-500 uppercase tracking-wider">
                          {addr.country || 'India'}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-5 mt-5 border-t border-stone-100 flex items-center justify-between gap-2">
                      <div>
                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(addr.id)}
                            className="text-[11px] text-[#781D42] hover:text-[#5B1123] font-medium tracking-wide underline underline-offset-2 transition-colors"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(addr)}
                          className="p-1.5 text-stone-600 hover:text-stone-950 transition-colors"
                          title="Edit Address"
                          aria-label="Edit Address"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(addr.id)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 transition-colors"
                          title="Delete Address"
                          aria-label="Delete Address"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Trust Footer Signals */}
            <div className="mt-12 pt-8 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
              <div className="flex items-start space-x-3">
                <Truck className="text-[#781D42] shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                    Complimentary Shipping
                  </h4>
                  <p className="text-[11px] text-stone-500 font-light mt-0.5">
                    Express insured delivery across all serviceable Indian PIN codes.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <ShieldCheck className="text-[#781D42] shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                    Secure Address Privacy
                  </h4>
                  <p className="text-[11px] text-stone-500 font-light mt-0.5">
                    Strict account isolation ensures your delivery details remain private.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Sparkles className="text-[#781D42] shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                    Atelier Quality Guarantee
                  </h4>
                  <p className="text-[11px] text-stone-500 font-light mt-0.5">
                    Hand-packaged in luxury tamper-proof bespoke heirloom boxes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* ADD / EDIT ADDRESS MODAL                                           */}
      {/* ------------------------------------------------------------------ */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div
            className="bg-white max-w-lg w-full p-6 sm:p-8 rounded-xs shadow-2xl border border-stone-200 my-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#781D42] font-semibold block">
                  Collections by Chandni
                </span>
                <h3 className="font-serif text-xl font-semibold text-stone-950">
                  {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Recipient Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Recipient Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Smt. Ananya Sen"
                    className={`w-full text-xs py-2.5 px-3 bg-[#FAF9F5] border rounded-xs focus:outline-none focus:border-[#781D42] ${
                      formErrors.name ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-[10px] text-rose-600 mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Phone Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className={`w-full text-xs py-2.5 px-3 bg-[#FAF9F5] border rounded-xs focus:outline-none focus:border-[#781D42] ${
                      formErrors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-[10px] text-rose-600 mt-1">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Address Line 1 (Flat, House No., Building, Street) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="e.g. 402 Royal Palms, Koregaon Park"
                  className={`w-full text-xs py-2.5 px-3 bg-[#FAF9F5] border rounded-xs focus:outline-none focus:border-[#781D42] ${
                    formErrors.addressLine1 ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
                {formErrors.addressLine1 && (
                  <p className="text-[10px] text-rose-600 mt-1">{formErrors.addressLine1}</p>
                )}
              </div>

              {/* Address Line 2 & Landmark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Address Line 2 (Area, Colony)
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    placeholder="Optional area details"
                    className="w-full text-xs py-2.5 px-3 bg-[#FAF9F5] border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    placeholder="e.g. Near Osho Garden"
                    className="w-full text-xs py-2.5 px-3 bg-[#FAF9F5] border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                  />
                </div>
              </div>

              {/* City, State & PIN code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    City <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Pune"
                    className={`w-full text-xs py-2.5 px-3 bg-[#FAF9F5] border rounded-xs focus:outline-none focus:border-[#781D42] ${
                      formErrors.city ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                    }`}
                  />
                  {formErrors.city && (
                    <p className="text-[10px] text-rose-600 mt-1">{formErrors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    State <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full text-xs py-2.5 px-3 bg-[#FAF9F5] border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    PIN Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="6 Digits"
                    className={`w-full text-xs py-2.5 px-3 bg-[#FAF9F5] border rounded-xs focus:outline-none focus:border-[#781D42] font-mono ${
                      formErrors.pincode ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                    }`}
                  />
                  {formErrors.pincode && (
                    <p className="text-[10px] text-rose-600 mt-1">{formErrors.pincode}</p>
                  )}
                </div>
              </div>

              {/* Address Type & Default Choice */}
              <div className="pt-2 border-t border-stone-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                    Address Type
                  </label>
                  <div className="flex gap-4">
                    {['HOME', 'WORK', 'OTHER'].map((type) => (
                      <label
                        key={type}
                        className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-xs border cursor-pointer transition-colors ${
                          formData.addressType === type
                            ? 'border-[#781D42] bg-[#FAF4EB] text-[#781D42] font-semibold'
                            : 'border-stone-200 text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="addressType"
                          value={type}
                          checked={formData.addressType === type}
                          onChange={() => setFormData({ ...formData, addressType: type })}
                          className="sr-only"
                        />
                        {renderTypeIcon(type)}
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isDefaultCheckbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-[#781D42] focus:ring-[#781D42] border-stone-300 rounded-xs"
                  />
                  <label htmlFor="isDefaultCheckbox" className="text-xs text-stone-700 select-none cursor-pointer">
                    Set this as my primary default delivery address
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs uppercase tracking-wider rounded-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] text-xs uppercase tracking-widest rounded-xs font-semibold shadow-xs disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving Address...' : editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DELETE CONFIRMATION MODAL                                          */}
      {/* ------------------------------------------------------------------ */}
      {deletingId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isDeleting && setDeletingId(null)}
        >
          <div
            className="bg-white max-w-sm w-full p-6 sm:p-8 rounded-xs shadow-xl border border-stone-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Delete Address?
              </h3>
              <p className="text-xs text-stone-600 font-light leading-relaxed">
                Are you sure you want to remove this delivery address? Historical orders placed to this address will not be affected.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider rounded-xs font-medium hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-700 text-white hover:bg-rose-800 text-xs uppercase tracking-wider rounded-xs font-semibold"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
