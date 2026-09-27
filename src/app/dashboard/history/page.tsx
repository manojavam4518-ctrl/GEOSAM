'use client';

import React from 'react';
import Link from 'next/link';
import CalculationHistorySection from '@/components/CalculationHistorySection';
import { Scale, ArrowRight } from 'lucide-react';

export default function HistoryPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Informative redirection banner */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0F4C3A] text-white flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0F4C3A]">
              Calculation History is now integrated into Weight Calculator
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              You can now view calculation history directly at the bottom of the Weight Calculator page.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/calculator#calculation-history"
          className="inline-flex items-center justify-center gap-1.5 bg-[#0F4C3A] hover:bg-[#1E8262] text-white text-xs font-bold py-2 px-4 rounded-xl transition shadow-xs shrink-0"
        >
          <span>Open Weight Calculator</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Embedded Calculation History Section */}
      <CalculationHistorySection />
    </div>
  );
}
