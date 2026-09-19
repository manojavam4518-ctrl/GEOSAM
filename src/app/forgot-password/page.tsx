'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email address is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed.');
      }

      setSuccess(true);
      if (data.devResetLink) {
        setDevResetLink(data.devResetLink);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full shadow-lg animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/" className="w-8 h-8 rounded bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-lg">G</Link>
          <div>
            <h1 className="font-bold text-base text-[#0F4C3A] leading-tight">GEO TRANSIT Portal</h1>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Password Recovery</span>
          </div>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center rounded-full mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-[#0F4C3A]">Reset Email Dispatched</h2>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              If <strong>{email}</strong> is registered on our platform, you will receive an email instructions link to reset your password shortly.
            </p>

            {devResetLink && (
              <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-left">
                <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-2">
                  🔧 Developer Password Reset Simulation
                </span>
                <p className="text-xs text-emerald-700 leading-normal mb-3">
                  SMTP is not configured yet. Verify your recovery flow immediately using this simulation link:
                </p>
                <Link
                  href={devResetLink}
                  className="inline-block bg-[#0F4C3A] hover:bg-[#1E8262] text-white text-xs font-bold px-4 py-2 rounded transition"
                >
                  Reset Password Instantly &rarr;
                </Link>
              </div>
            )}

            <div className="mt-8">
              <Link href="/login" className="text-xs font-semibold text-[#1E8262] hover:underline">
                Back to Login Page
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-slate-600 text-xs mb-6 leading-relaxed">
              Enter your registered email address below. We will send you a password reset instructions link.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-3 rounded-lg font-bold text-sm transition mt-6 shadow-md"
              >
                {submitting ? 'Sending Request...' : 'Send Recovery Instructions'}
              </button>
            </form>

            <div className="text-center mt-6 text-xs text-slate-500">
              Remember your password?{' '}
              <Link href="/login" className="font-semibold text-[#1E8262] hover:underline">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
