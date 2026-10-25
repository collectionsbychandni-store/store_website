import React, { useState } from 'react';
import * as authService from '../../services/authService';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';

/**
 * Collections by Chandni - Change Password Quick Modal
 * Accessible from the Admin Header across any admin page.
 */
export default function AdminChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const isLengthValid = newPassword.length >= 8;
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const isDifferent = Boolean(newPassword && currentPassword && newPassword !== currentPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentPassword) {
      setFeedback({ type: 'error', message: 'Please enter your current password.' });
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setFeedback({
        type: 'error',
        message: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: 'error',
        message: 'New password and confirmation password do not match.',
      });
      return;
    }

    if (currentPassword === newPassword) {
      setFeedback({
        type: 'error',
        message: 'New password cannot be identical to your current password.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Password changed successfully!',
      });

      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Auto close after 2 seconds on success
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update password.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setFeedback(null);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-stone-200 rounded-xs shadow-xl p-6 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-[#781D42] rounded-xs">
              <Lock size={17} />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Change Admin Password
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block">
                Security Credential Update
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xs transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xs text-xs flex items-start gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 font-light">{feedback.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Current Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full text-xs py-2 pl-3 pr-9 border border-stone-300 rounded-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42] focus:border-[#781D42]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
              New Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min. 8 characters)"
                className="w-full text-xs py-2 pl-3 pr-9 border border-stone-300 rounded-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42] focus:border-[#781D42]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Confirm New Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full text-xs py-2 pl-3 pr-9 border border-stone-300 rounded-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42] focus:border-[#781D42]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Checklist */}
          <div className="p-2.5 bg-stone-50 rounded-xs border border-stone-200/70 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              {isLengthValid ? (
                <Check size={12} className="text-emerald-600 font-bold" />
              ) : (
                <span className="h-1 w-1 rounded-full bg-stone-300 ml-1 mr-0.5" />
              )}
              <span className={isLengthValid ? 'text-emerald-800' : 'text-stone-500'}>
                Minimum 8 characters
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isMatch ? (
                <Check size={12} className="text-emerald-600 font-bold" />
              ) : (
                <span className="h-1 w-1 rounded-full bg-stone-300 ml-1 mr-0.5" />
              )}
              <span className={isMatch ? 'text-emerald-800' : 'text-stone-500'}>
                Passwords match
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xs text-xs uppercase tracking-wider font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isLengthValid || !isMatch}
              className="px-4 py-1.5 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] disabled:opacity-50 disabled:cursor-not-allowed rounded-xs text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Save Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
