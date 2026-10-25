import React, { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import {
  KeyRound,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  Building,
  Sparkles,
} from 'lucide-react';

/**
 * Collections by Chandni - Admin Account & Security Settings
 * Allows the administrator to change password, manage profile details,
 * and review security posture.
 */
export default function AdminSettings() {
  const { user, login } = useAuth();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status feedback
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  // Profile update state
  const [name, setName] = useState(user?.name || 'Collections by Chandni Admin');
  const [phone, setPhone] = useState(user?.phone || '+919876543210');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  // Active tab: 'security' | 'profile'
  const [activeTab, setActiveTab] = useState('security');

  // Validation helpers
  const isLengthValid = newPassword.length >= 8;
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const isDifferent = Boolean(newPassword && currentPassword && newPassword !== currentPassword);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please enter your current password.' });
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password and confirmation password do not match.',
      });
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password cannot be identical to your current password.',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordFeedback({
        type: 'success',
        message: res.message || 'Admin password updated successfully! Please keep it secure.',
      });

      // Clear fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to change admin password.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (!name.trim()) {
      setProfileFeedback({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await authService.updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
      });

      setProfileFeedback({
        type: 'success',
        message: res.message || 'Profile details updated successfully.',
      });
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update profile details.',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <AdminLayout pageTitle="Settings & Security">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-white border border-stone-200 rounded-xs p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-stone-400">
                Atelier Administration
              </span>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-stone-900">
              Account Security & Store Settings
            </h2>
            <p className="text-xs text-stone-500">
              Manage your administrator credentials, access permissions, and luxury store defaults.
            </p>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xs border border-stone-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xs font-medium transition-all ${
                activeTab === 'security'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <KeyRound size={14} className={activeTab === 'security' ? 'text-[#781D42]' : ''} />
              <span>Security & Password</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xs font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <User size={14} className={activeTab === 'profile' ? 'text-[#781D42]' : ''} />
              <span>Admin Profile</span>
            </button>
          </div>
        </div>

        {/* Security & Password Tab */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Change Password Form */}
            <div className="lg:col-span-2 bg-white border border-stone-200 rounded-xs p-6 shadow-xs space-y-6">
              <div className="border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2 text-stone-900">
                  <div className="p-2 bg-rose-50 text-[#781D42] rounded-xs">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold">Change Administrator Password</h3>
                    <p className="text-xs text-stone-500">
                      Update your login password to maintain high security for your atelier dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback Alert */}
              {passwordFeedback && (
                <div
                  className={`p-3 rounded-xs text-xs flex items-start gap-2.5 ${
                    passwordFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {passwordFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1 font-light">{passwordFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                    Current Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full text-xs py-2.5 pl-3 pr-10 border border-stone-300 rounded-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42] focus:border-[#781D42] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      tabIndex={-1}
                    >
                      {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                    New Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new secure password (min. 8 characters)"
                      className="w-full text-xs py-2.5 pl-3 pr-10 border border-stone-300 rounded-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42] focus:border-[#781D42] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                    Confirm New Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full text-xs py-2.5 pl-3 pr-10 border border-stone-300 rounded-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42] focus:border-[#781D42] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="p-3 bg-stone-50 rounded-xs border border-stone-200/80 space-y-1.5 text-[11px]">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 block mb-1">
                    Password Security Criteria:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isLengthValid ? (
                      <Check size={13} className="text-emerald-600 font-bold" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-300 ml-1 mr-0.5" />
                    )}
                    <span className={isLengthValid ? 'text-emerald-800' : 'text-stone-600'}>
                      At least 8 characters long
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isMatch ? (
                      <Check size={13} className="text-emerald-600 font-bold" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-300 ml-1 mr-0.5" />
                    )}
                    <span className={isMatch ? 'text-emerald-800' : 'text-stone-600'}>
                      New password and confirmation match
                    </span>
                  </div>
                  {newPassword && currentPassword && (
                    <div className="flex items-center gap-1.5">
                      {isDifferent ? (
                        <Check size={13} className="text-emerald-600 font-bold" />
                      ) : (
                        <AlertCircle size={13} className="text-rose-500" />
                      )}
                      <span className={isDifferent ? 'text-emerald-800' : 'text-rose-600'}>
                        Different from current password
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordFeedback(null);
                    }}
                    className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xs text-xs font-medium uppercase tracking-wider"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword || !isLengthValid || !isMatch}
                    className="px-5 py-2 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] disabled:opacity-50 disabled:cursor-not-allowed rounded-xs text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors"
                  >
                    {isChangingPassword ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={15} />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Col: Security Card & Tips */}
            <div className="space-y-6">
              <div className="bg-white border border-stone-200 rounded-xs p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-stone-900 border-b border-stone-100 pb-3">
                  <ShieldCheck size={18} className="text-[#781D42]" />
                  <h4 className="font-serif text-sm font-semibold">Active Session & Role</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">
                      Account Email
                    </span>
                    <span className="font-mono text-stone-800">{user?.email || 'admin@collectionsbychandni.in'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">
                      Assigned Role
                    </span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-rose-50 text-[#781D42] border border-rose-200 font-semibold text-[10px] rounded-xs uppercase tracking-wider">
                      Administrator (Full Access)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">
                      Security Status
                    </span>
                    <span className="text-emerald-700 font-medium flex items-center gap-1.5 mt-0.5">
                      <CheckCircle2 size={13} />
                      Bcrypt Hash Protection Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Recommendations */}
              <div className="bg-stone-50 border border-stone-200 rounded-xs p-5 space-y-3 text-xs text-stone-600">
                <h4 className="font-serif font-semibold text-stone-800 text-xs uppercase tracking-wider">
                  Luxury Atelier Security Best Practices
                </h4>
                <ul className="space-y-2 list-disc list-inside text-[11px] text-stone-600">
                  <li>Choose a unique passphrase containing mixed-case letters, digits, and special characters.</li>
                  <li>Do not share administrator credentials with non-managerial staff.</li>
                  <li>Rotate passwords every 90 days to safeguard customer orders and payment records.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Profile Details Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-stone-200 rounded-xs p-6 shadow-xs max-w-2xl space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2 text-stone-900">
                <div className="p-2 bg-stone-100 text-stone-700 rounded-xs">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold">Administrator Profile Information</h3>
                  <p className="text-xs text-stone-500">
                    Update your displayed administrative contact name and atelier contact phone.
                  </p>
                </div>
              </div>
            </div>

            {profileFeedback && (
              <div
                className={`p-3 rounded-xs text-xs flex items-start gap-2.5 ${
                  profileFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {profileFeedback.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="flex-1 font-light">{profileFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Admin Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-stone-300 rounded-xs bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42] focus:border-[#781D42]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || 'admin@collectionsbychandni.in'}
                  className="w-full text-xs py-2 px-3 border border-stone-200 rounded-xs bg-stone-100 text-stone-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Primary administrator email is tied to store ownership and cannot be changed here.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full text-xs py-2 px-3 border border-stone-300 rounded-xs bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42] focus:border-[#781D42]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-5 py-2 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] rounded-xs text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors"
                >
                  {isUpdatingProfile ? (
                    <>
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
