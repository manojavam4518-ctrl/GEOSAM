'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle2, Scale, Truck, Tags } from 'lucide-react';

interface ProgressProps {
  active: boolean;
  onComplete?: () => void;
  title?: string;
  isDark?: boolean;
}

export default function CalculationStepProgress({
  active,
  onComplete,
  title = 'Processing Logistics Calculation',
  isDark = false
}: ProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const steps = [
    { label: 'Analyzing shipment parameters...', icon: Scale },
    { label: 'Evaluating volumetric divisors...', icon: Tags },
    { label: 'Matching courier contract rate cards...', icon: Truck },
    { label: 'Displaying available options...', icon: CheckCircle2 },
  ];

  useEffect(() => {
    if (!active) {
      setCurrentStep(0);
      return;
    }

    const timer1 = setTimeout(() => setCurrentStep(1), 150);
    const timer2 = setTimeout(() => setCurrentStep(2), 300);
    const timer3 = setTimeout(() => setCurrentStep(3), 450);
    const timer4 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [active, onComplete]);

  if (!active || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in px-4">
      <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl border space-y-5 animate-slide-up ${
        isDark ? 'bg-[#14231E] border-[#264E41] text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] dark:bg-[#1C362B] text-[#107c5a] dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold">{title}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Please wait a moment...</p>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-2.5 pt-1">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isFinished = currentStep > idx;
            const isCurrent = currentStep === idx;

            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 text-xs p-2 rounded-lg transition-all duration-200 ${
                  isFinished
                    ? isDark ? 'bg-emerald-950/40 text-emerald-300 font-bold' : 'bg-emerald-50 text-[#0F4C3A] font-bold'
                    : isCurrent
                      ? isDark ? 'bg-[#182B25] text-slate-200 font-bold' : 'bg-slate-100 text-slate-900 font-bold'
                      : isDark ? 'text-slate-500 font-medium' : 'text-slate-400 font-medium'
                }`}
              >
                {isFinished ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-[#107c5a] dark:text-emerald-400 animate-spin shrink-0" />
                ) : (
                  <Icon className="w-4 h-4 opacity-40 shrink-0" />
                )}
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
