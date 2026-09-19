'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, Phone, Briefcase, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Status flags
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [devVerifyLink, setDevVerifyLink] = useState<string | null>(null);

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

    if (!acceptTerms) {
      setError('You must accept the Terms and Conditions.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile, company, password, confirmPassword, acceptTerms }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setSuccess(true);
      if (data.devVerifyLink) {
        setDevVerifyLink(data.devVerifyLink);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-lg w-full shadow-lg animate-fade-in">
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center rounded-full mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F4C3A]">Account Created</h1>
            <p className="text-slate-600 text-sm mt-3 leading-relaxed">
              We have dispatched a verification email to <strong>{email}</strong>. 
              Please click the link inside the email to activate your account.
            </p>

            {devVerifyLink && (
              <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-left">
                <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-2">
                  🔧 Developer Mail Simulation Mode
                </span>
                <p className="text-xs text-emerald-700 leading-normal mb-3">
                  SMTP mailer settings are not configured in database yet. Use this direct simulation link to complete email verification:
                </p>
                <Link
                  href={devVerifyLink}
                  className="inline-block bg-[#0F4C3A] hover:bg-[#1E8262] text-white text-xs font-bold px-4 py-2 rounded transition"
                >
                  Verify Email Instantly &rarr;
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
            <div className="flex items-center gap-2 mb-6">
              <Link href="/" className="w-8 h-8 rounded bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-lg">G</Link>
              <div>
                <h1 className="font-bold text-base text-[#0F4C3A] leading-tight">GEO TRANSIT Portal</h1>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Register Account</span>
              </div>
            </div>

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
                      placeholder="Jane Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                      required
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
                      placeholder="jane@company.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                      required
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
                      required
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
                      placeholder="Fast Logistics"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
                      required
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
                      required
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
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 border-slate-300 rounded text-[#1E8262] focus:ring-[#1E8262]"
                />
                <label htmlFor="acceptTerms" className="text-xs text-slate-600 leading-normal">
                  I accept the Terms and Conditions and agree to use the logistics SaaS tools in accordance with company policies.
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-3 rounded-lg font-bold text-sm transition mt-6 shadow-md"
              >
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="text-center mt-6 text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#1E8262] hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
