'use client';

import React from 'react';
import { Scale, CheckCircle2, ShieldAlert } from 'lucide-react';

interface WeightComparisonVisualProps {
  actualWeight: number;
  volumetricWeight: number;
  unit?: 'KG' | 'GRAMS';
  className?: string;
}

export default function WeightComparisonVisual({
  actualWeight = 8,
  volumetricWeight = 6.75,
  unit = 'KG',
  className = '',
}: WeightComparisonVisualProps) {
  const maxWeight = Math.max(actualWeight, volumetricWeight, 1);
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);

  const actualPct = Math.min(100, Math.round((actualWeight / maxWeight) * 100));
  const volPct = Math.min(100, Math.round((volumetricWeight / maxWeight) * 100));
  const isActualHigher = actualWeight >= volumetricWeight;

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#1E8262]" />
          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
            Weight Intelligence Comparison
          </h4>
        </div>
        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0F4C3A] border border-emerald-200">
          Winning Basis: {isActualHigher ? 'Actual Weight' : 'Volumetric Weight'}
        </span>
      </div>

      {/* Comparison Progress Bars */}
      <div className="space-y-3">
        {/* Actual Weight Bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold mb-1">
            <span className="text-slate-700 flex items-center gap-1.5">
              <span>Actual Physical Weight</span>
              {isActualHigher && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </span>
            <span className="text-slate-900 font-extrabold">{actualWeight} {unit}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isActualHigher ? 'bg-[#0F4C3A]' : 'bg-slate-400'
              }`}
              style={{ width: `${actualPct}%` }}
            />
          </div>
        </div>

        {/* Volumetric Weight Bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold mb-1">
            <span className="text-slate-700 flex items-center gap-1.5">
              <span>Volumetric (Dimensional) Weight</span>
              {!isActualHigher && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </span>
            <span className="text-slate-900 font-extrabold">{volumetricWeight} {unit}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                !isActualHigher ? 'bg-[#0F4C3A]' : 'bg-slate-400'
              }`}
              style={{ width: `${volPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chargeable Result Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Billable Chargeable Weight
          </span>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Couriers charge the higher value between actual vs dimensional.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-base font-black text-[#0F4C3A]">
            {chargeableWeight} {unit}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase">Selected</span>
        </div>
      </div>
    </div>
  );
}
