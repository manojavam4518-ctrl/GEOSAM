'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, RefreshCw, AlertCircle, CheckCircle2, Clock, Lock } from 'lucide-react';

export interface ConsigneeOtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: string;
  maskedContact: string;
  expiresAt?: string;
  onSuccess: (verifiedContact: string, verifiedAt: string) => void;
}

export default function ConsigneeOtpVerificationModal({
  isOpen,
  onClose,
  contact,
  maskedContact,
  expiresAt,
  onSuccess,
}: ConsigneeOtpVerificationModalProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Timers
  const [cooldownSec, setCooldownSec] = useState<number>(30);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300); // 5 mins

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset inputs on open
  useEffect(() => {
    if (isOpen) {
      setOtpDigits(['', '', '', '', '', '']);
      setErrorMessage(null);
      setSuccessMessage(null);
      setCooldownSec(30);
      setSecondsRemaining(300);

      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Expiry & Cooldown Countdown
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCooldownSec((prev) => Math.max(0, prev - 1));
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle single digit input and auto-advance
  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }

    // Handle full paste
    if (clean.length > 1) {
      const pasteDigits = clean.slice(0, 6).split('');
      const next = [...otpDigits];
      pasteDigits.forEach((d, i) => {
        if (index + i < 6) next[index + i] = d;
      });
      setOtpDigits(next);
      const focusIndex = Math.min(5, index + pasteDigits.length);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = clean.slice(-1);
    setOtpDigits(next);

    // Auto-advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Submit OTP Verification
  const handleVerify = async () => {
    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMessage(null);

      const res = await fetch('/api/organization/proforma-invoices/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          code: fullCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please check the code.');
      }

      setSuccessMessage(data.message || 'Identity verified successfully!');
      setTimeout(() => {
        onSuccess(data.verifiedContact || contact, data.verifiedAt || new Date().toISOString());
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (cooldownSec > 0 || isResending) return;

    try {
      setIsResending(true);
      setErrorMessage(null);

      const res = await fetch('/api/organization/proforma-invoices/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      setCooldownSec(30);
      setSecondsRemaining(300);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs select-none animate-in fade-in duration-150"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                CONSIGNEE SIGNATURE VERIFICATION
              </h3>
              <p className="text-[11px] text-slate-400">
                Secure OTP authentication for legal sign-off
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 bg-white">
          {/* Destination Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-bold">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verification code sent to</span>
            </div>
            <div className="text-sm font-black font-mono text-slate-900">
              {maskedContact || contact}
            </div>
          </div>

          {/* Error / Success Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 6 Digit Input Boxes */}
          <div className="flex justify-center items-center gap-2 sm:gap-3 py-1">
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isVerifying || Boolean(successMessage)}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-black text-lg sm:text-xl rounded-2xl border-2 transition-all outline-none ${
                  digit
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-300 bg-slate-50 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            ))}
          </div>

          {/* Expiry Timer & Resend Option */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Code expires in:</span>
              <span className={`font-mono font-bold ${secondsRemaining < 60 ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatTimer(secondsRemaining)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldownSec > 0 || isResending}
              className={`inline-flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
                cooldownSec > 0
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-emerald-700 hover:text-emerald-900 hover:underline'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
              <span>{cooldownSec > 0 ? `Resend in ${cooldownSec}s` : 'Resend Code'}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || otpDigits.join('').length !== 6 || Boolean(successMessage)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 ring-2 ring-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'VERIFY OTP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

