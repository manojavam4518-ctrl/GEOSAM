'use client';

import React from 'react';
import { Sliders, Check, Layers } from 'lucide-react';

interface DivisorSelectionVisualProps {
  selectedDivisor: number;
  onSelectDivisor?: (divisor: number) => void;
  mode?: 'DOMESTIC' | 'INTERNATIONAL';
}

export default function DivisorSelectionVisual({
  selectedDivisor = 5000,
  onSelectDivisor,
  mode = 'DOMESTIC',
}: DivisorSelectionVisualProps) {
  const domesticOptions = [
    { divisor: 4000, label: '4000', service: 'SURFACE EXPRESS', desc: 'Standard Surface / Road Freight' },
    { divisor: 4500, label: '4500', service: 'AIR EXPRESS', desc: 'Fast Air Courier Shipping' },
    { divisor: 5000, label: '5000', service: 'AIR CARGO', desc: 'Heavy Air Cargo & Commercial' },
  ];

  const intlOptions = [
    { divisor: 4500, label: '4500', service: 'AIR EXPRESS', desc: 'International Express Priority' },
    { divisor: 5000, label: '5000', service: 'AIR FREIGHT', desc: 'Global Heavy Cargo Standard' },
  ];

  const options = mode === 'INTERNATIONAL' ? intlOptions : domesticOptions;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#1E8262]" />
          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
            Shipping Density Divisor Standard ({mode})
          </h4>
        </div>
        <span className="text-[10px] font-bold text-slate-500">
          Volumetric Formula: <strong className="text-slate-800">(L × W × H) ÷ Divisor</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map((opt) => {
          const isSelected = selectedDivisor === opt.divisor;

          return (
            <div
              key={opt.divisor}
              onClick={() => onSelectDivisor && onSelectDivisor(opt.divisor)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-[#0F4C3A] to-[#1E8262] text-white border-[#0F4C3A] shadow-md scale-101'
                  : 'bg-slate-50/80 hover:bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                    {opt.service}
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-white text-[#0F4C3A] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {opt.label}
                  </span>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                    DIVISOR
                  </span>
                </div>
              </div>

              <p className={`text-[11px] font-medium mt-3 ${isSelected ? 'text-emerald-50' : 'text-slate-600'}`}>
                {opt.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
