'use client';

import React, { useState } from 'react';
import { Package, Box, Scale, ArrowRight, ShieldCheck, Zap, Info } from 'lucide-react';

interface ShipmentIntelligenceVisualProps {
  length?: number;
  width?: number;
  height?: number;
  actualWeight?: number;
  divisor?: number;
  unit?: 'CM' | 'INCHES';
  weightUnit?: 'KG' | 'GRAMS';
  mode?: 'DOMESTIC' | 'INTERNATIONAL';
  selectedCourier?: string;
  calculatedRate?: number;
}

export default function ShipmentIntelligenceVisual({
  length = 45,
  width = 30,
  height = 20,
  actualWeight = 8,
  divisor = 5000,
  unit = 'CM',
  weightUnit = 'KG',
  mode = 'DOMESTIC',
  selectedCourier = 'DTDC Express',
  calculatedRate = 3300,
}: ShipmentIntelligenceVisualProps) {
  const [activeStage, setActiveStage] = useState<number>(3); // Default to Chargeable Weight stage

  // Calculate volumetric weight
  const volWeight = Number(((length * width * height) / divisor).toFixed(2));
  const chargeableWeight = Math.max(actualWeight, volWeight);
  const isActualHigher = actualWeight >= volWeight;

  const stages = [
    {
      id: 0,
      title: 'PACKAGE',
      icon: Package,
      subtitle: `${mode} Freight Item`,
      value: '1 Package',
      detail: 'Standard Corrugated Box',
      badge: 'Step 1',
    },
    {
      id: 1,
      title: 'DIMENSIONS',
      icon: Box,
      subtitle: `${length} × ${width} × ${height} ${unit}`,
      value: `${(length * width * height).toLocaleString()} ${unit}³`,
      detail: 'Total CBM Volume',
      badge: 'Step 2',
    },
    {
      id: 2,
      title: 'VOLUMETRIC WEIGHT',
      icon: Scale,
      subtitle: `Formula: Vol ÷ ${divisor}`,
      value: `${volWeight} ${weightUnit}`,
      detail: `Divisor ${divisor} applied`,
      badge: 'Step 3',
    },
    {
      id: 3,
      title: 'ACTUAL WEIGHT',
      icon: Scale,
      subtitle: 'Physical Scale Weight',
      value: `${actualWeight} ${weightUnit}`,
      detail: 'Dead weight measured',
      badge: 'Step 4',
    },
    {
      id: 4,
      title: 'CHARGEABLE WEIGHT',
      icon: Zap,
      subtitle: isActualHigher ? 'Actual > Volumetric' : 'Volumetric > Actual',
      value: `${chargeableWeight} ${weightUnit}`,
      detail: `Max(${actualWeight}, ${volWeight})`,
      badge: 'FINAL BASIS',
      highlight: true,
    },
    {
      id: 5,
      title: 'RATE / SHIPPING',
      icon: ShieldCheck,
      subtitle: selectedCourier,
      value: `₹${calculatedRate.toLocaleString('en-IN')}`,
      detail: 'Final Calculated Tariff',
      badge: 'QUOTED',
    },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Visual Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-[#0F4C3A] text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200">
              GEO TRANSIT Intelligence Engine
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Live Evaluation</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            Shipment Valuation Flow
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
          <Info className="w-4 h-4 text-[#1E8262]" />
          <span>Click any stage to inspect logic</span>
        </div>
      </div>

      {/* Interactive Stage Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 relative">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.id;
          const isHighlight = stage.highlight;

          return (
            <div
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative flex flex-col justify-between ${
                isHighlight
                  ? isActive
                    ? 'bg-[#0F4C3A] text-white border-[#0F4C3A] shadow-md scale-102 ring-2 ring-[#1E8262]/30'
                    : 'bg-[#E8F5E9] text-[#0F4C3A] border-emerald-300 shadow-xs'
                  : isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-102'
                    : 'bg-slate-50/80 hover:bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isHighlight
                          ? 'bg-emerald-200/80 text-[#0F4C3A]'
                          : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {stage.badge}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-[#1E8262]'}`} />
                </div>

                <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                  {stage.title}
                </span>

                <strong className={`block text-sm font-black mt-1 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {stage.value}
                </strong>
              </div>

              <div className="mt-3 pt-2 border-t border-current/10 text-[10px] font-semibold opacity-90 truncate">
                {stage.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Inspector Box for Selected Stage */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-sm">
            {activeStage + 1}
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              {stages[activeStage].title} DETAILED METRICS
            </h4>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {stages[activeStage].detail} — <span className="font-bold text-[#0F4C3A]">{stages[activeStage].subtitle}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-extrabold text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-2xs">
          <span>Chargeable Weight Basis:</span>
          <span className="text-[#0F4C3A] font-black">{chargeableWeight} {weightUnit}</span>
          <span className="text-slate-400">({isActualHigher ? 'Actual Weight Prevails' : 'Volumetric Weight Prevails'})</span>
        </div>
      </div>
    </div>
  );
}
