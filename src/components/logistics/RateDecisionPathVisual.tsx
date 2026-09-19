'use client';

import React from 'react';
import { ArrowRight, CheckCircle, Calculator } from 'lucide-react';

interface RateDecisionPathVisualProps {
  chargeableWeight?: number;
  weightSlab?: string;
  region?: string;
  serviceType?: string;
  courier?: string;
  finalRate?: number;
}

export default function RateDecisionPathVisual({
  chargeableWeight = 8,
  weightSlab = 'Base 500G + Add 500G x15',
  region = 'Metro',
  serviceType = 'Express Air',
  courier = 'DTDC Express',
  finalRate = 3300,
}: RateDecisionPathVisualProps) {
  const steps = [
    { title: 'CHARGEABLE WEIGHT', val: `${chargeableWeight} KG` },
    { title: 'WEIGHT SLAB', val: weightSlab },
    { title: 'DESTINATION REGION', val: region },
    { title: 'SERVICE TYPE', val: serviceType },
    { title: 'COURIER OPERATOR', val: courier },
    { title: 'FINAL RATE', val: `₹${finalRate.toLocaleString('en-IN')}`, highlight: true },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#1E8262]" />
          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
            Rate Intelligence Decision Path
          </h4>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-[#0F4C3A] border border-emerald-200">
          Deterministic Tariff Engine
        </span>
      </div>

      {/* Decision Path Chain */}
      <div className="flex items-center justify-between flex-wrap lg:flex-nowrap gap-2 overflow-x-auto pb-2">
        {steps.map((step, idx) => (
          <React.Fragment key={step.title}>
            <div
              className={`p-3 rounded-xl border flex-1 min-w-[130px] transition ${
                step.highlight
                  ? 'bg-[#0F4C3A] text-white border-[#0F4C3A] shadow-sm'
                  : 'bg-slate-50 border-slate-200/80 text-slate-800'
              }`}
            >
              <span className={`block text-[9px] font-black uppercase tracking-wider ${step.highlight ? 'text-emerald-200' : 'text-slate-500'}`}>
                {step.title}
              </span>
              <strong className={`block text-xs font-black mt-1 ${step.highlight ? 'text-white text-sm' : 'text-slate-900'}`}>
                {step.val}
              </strong>
            </div>

            {idx < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden lg:block" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
