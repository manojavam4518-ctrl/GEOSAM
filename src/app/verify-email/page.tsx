'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing.');
      setLoading(false);
      return;
    }

    async function verify() {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Verification failed.');
        }

        setSuccess(true);
      } catch (err: any) {
        setError(err.message || 'An error occurred during verification.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full shadow-lg text-center animate-fade-in">
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-8 rounded bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-lg">G</div>
        <span className="font-bold text-lg text-[#0F4C3A] tracking-tight">GEO TRANSIT</span>
      </div>

      {loading ? (
        <div className="py-6">
          <Loader2 className="w-12 h-12 text-[#1E8262] animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Verifying Email Address</h2>
          <p className="text-slate-500 text-sm mt-1">Please wait while we confirm your activation token...</p>
        </div>
      ) : error ? (
        <div className="py-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-700">Verification Failed</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">{error}</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/register" className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 rounded-lg text-xs font-bold transition">
              Register Again
            </Link>
            <Link href="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
              Back to Login
            </Link>
          </div>
        </div>
      ) : (
        <div className="py-6">
          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#0F4C3A]">Account Activated!</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Your email address has been successfully verified. Your GEO TRANSIT demo account is now unlocked.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-8 w-full bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 rounded-lg text-xs font-bold transition shadow-md"
          >
            Sign In to Portal
          </button>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Suspense fallback={
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg max-w-md w-full">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-sm">Loading verification details...</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
