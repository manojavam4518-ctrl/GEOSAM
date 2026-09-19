'use client';

import React, { useEffect, useState } from 'react';
import { User, Phone, Briefcase, Lock, CheckCircle2, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [company, setCompany] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          const { name, email, mobile, company } = json.user;
          setName(name);
          setEmail(email);
          setMobile(mobile);
          setCompany(company);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name || !mobile || !company) {
      setError('Name, mobile number, and company are required.');
      return;
    }

    if (newPassword || confirmNewPassword || currentPassword) {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        setError('To update your password, fill in current, new, and confirm password fields.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError('New passwords do not match.');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          mobile,
          company,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      setMessage(data.message || 'Profile saved successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-2xl font-bold text-[#0F4C3A] tracking-tight">Company & Account Settings</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">Manage your administrator contact info, company details, and update account security</p>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-xl text-xs font-semibold shadow-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left / Primary Column (2 Cols): Profile & Company Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="bg-slate-50/80 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Profile Information</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Primary contact and company identification</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0F4C3A] flex items-center justify-center border border-emerald-200/60">
                  <User className="w-4 h-4" />
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#107c5a] text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address (Locked)</label>
                    <div className="relative opacity-70">
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold cursor-not-allowed text-slate-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mobile Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#107c5a] text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Company Name</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#107c5a] text-slate-900"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Update Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="bg-slate-50/80 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Security & Password</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Update your account authentication credentials</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0F4C3A] flex items-center justify-center border border-emerald-200/60">
                  <Lock className="w-4 h-4" />
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#107c5a] text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#107c5a] text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#107c5a] text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Account Overview & Submit Action */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center font-black text-xl border border-emerald-200 shrink-0">
                  {name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-slate-900 truncate">{name || 'User Name'}</h3>
                  <span className="block text-xs text-slate-500 font-medium truncate">{company || 'Company'}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Account ID</span>
                  <span className="font-bold text-slate-800 font-mono">CLIENT-{email ? email.substring(0, 5).toUpperCase() : 'USER'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Verified Email</span>
                  <span className="font-bold text-emerald-700">Verified</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#0F4C3A] hover:bg-[#0c3c2e] disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-bold text-xs transition shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Saving Changes...' : 'Save Profile Settings'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
