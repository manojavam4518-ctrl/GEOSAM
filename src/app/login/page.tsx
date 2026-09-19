'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2 } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setVerificationPending(false);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.notVerified) {
          setVerificationPending(true);
          throw new Error(data.error || 'Email verification pending.');
        }
        throw new Error(data.error || 'Authentication failed.');
      }

      // Check if redirect query parameter exists and use it, otherwise fallback to data.redirectUrl
      router.push(redirectParam || data.redirectUrl);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full shadow-lg animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="w-8 h-8 rounded bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-lg">G</Link>
        <div>
          <h1 className="font-bold text-base text-[#0F4C3A] leading-tight">GEO TRANSIT Portal</h1>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">User Authentication</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold mb-4 leading-relaxed">
          {error}
        </div>
      )}

      {verificationPending && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-lg text-xs font-semibold mb-4 leading-relaxed">
          Please locate the verification email sent to your inbox during sign-up to activate your account.
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">Password</label>
            <Link href="/forgot-password" className="text-[11px] font-semibold text-[#1E8262] hover:underline">
              Forgot Password?
            </Link>
          </div>
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-3 rounded-lg font-bold text-sm transition mt-6 shadow-md"
        >
          {submitting ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div className="text-center mt-6 text-xs text-slate-500">
        New to GEO TRANSIT?{' '}
        <Link href="/register" className="font-semibold text-[#1E8262] hover:underline">
          Register Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Suspense fallback={
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full shadow-lg text-center">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-sm">Loading login portal...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}
