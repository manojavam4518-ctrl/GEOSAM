'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle2, Lock, Mail, User, Phone, Briefcase } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/setup');
        const data = await res.json();
        setSetupAvailable(data.setupAvailable);
      } catch (err) {
        setError('Failed to connect to the database. Make sure MongoDB is running.');
      } finally {
        setLoading(false);
      }
    }
    checkSetup();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name || !email || !mobile || !company || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile, company, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Setup failed.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1E8262] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Checking database status...</p>
        </div>
      </div>
    );
  }

  if (!setupAvailable && !success) {
    return (
      <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full text-center shadow-lg animate-fade-in">
          <div className="w-16 h-16 bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center rounded-full mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F4C3A]">Setup Completed</h1>
          <p className="text-slate-600 text-sm mt-3 leading-relaxed">
            The GEO TRANSIT administrator account has already been bootstrapped. 
            The initialization route is now locked for security.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-8 w-full bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 rounded-lg font-bold text-sm transition"
          >
            Log In to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-lg w-full shadow-lg animate-fade-in">
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center rounded-full mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F4C3A]">Initialization Complete!</h1>
            <p className="text-slate-600 text-sm mt-3 leading-relaxed">
              The database has been seeded with standard device plans, settings, and templates. 
              Admin credentials created successfully. Redirecting you to login...
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-lg">G</div>
              <div>
                <h1 className="font-bold text-base text-[#0F4C3A] leading-tight">GEO TRANSIT Setup</h1>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">First-Time Bootstrapper</span>
              </div>
            </div>

            <p className="text-slate-600 text-xs mb-6">
              Create the master administrator account. This will also seed default plans, SMTP templates, and portal settings.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold mb-4 leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@geotransit.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Company Name</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Geo Transit Solutions"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-3 rounded-lg font-bold text-sm transition mt-6 shadow-md"
              >
                {submitting ? 'Initializing Seeding Pipeline...' : 'Complete Master Setup & Seed Database'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
