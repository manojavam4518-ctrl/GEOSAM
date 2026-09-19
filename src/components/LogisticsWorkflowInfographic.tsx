'use client';

import React, { useState } from 'react';
import {
  Package,
  Box,
  Scale,
  Sliders,
  Zap,
  Navigation,
  Calculator,
  FileText,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface InfographicProps {
  compact?: boolean;
  className?: string;
}

export default function LogisticsWorkflowInfographic({ compact = false, className = '' }: InfographicProps) {
  const [activeStep, setActiveStep] = useState<number>(4); // Default to Chargeable Weight

  const steps = [
    {
      step: '01',
      title: 'PACKAGE',
      desc: 'Raw parcel specifications & Dead weight scale',
      formula: '1 Item • Dead Weight Measured',
      icon: Package,
      accent: 'bg-emerald-50 text-[#0F4C3A] border-emerald-200',
    },
    {
      step: '02',
      title: 'DIMENSIONS',
      desc: 'Length × Width × Height measurement in CM / Inches',
      formula: '45 × 30 × 20 CM = 27,000 CM³',
      icon: Box,
      accent: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      step: '03',
      title: 'DIVISOR',
      desc: 'Shipping density factor (4000, 4500, 5000)',
      formula: 'Surface (4000) • Air (4500) • Air Cargo (5000)',
      icon: Sliders,
      accent: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      step: '04',
      title: 'VOLUMETRIC W',
      desc: 'Dimensional weight calculated via divisor formula',
      formula: 'Vol Weight = 27,000 ÷ 5000 = 5.40 KG',
      icon: Scale,
      accent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      step: '05',
      title: 'CHARGEABLE W',
      desc: 'Determines highest value between Actual vs Volumetric',
      formula: 'MAX(8.00 KG Actual, 5.40 KG Vol) = 8.00 KG',
      icon: Zap,
      accent: 'bg-amber-50 text-amber-700 border-amber-200',
      highlight: true,
    },
    {
      step: '06',
      title: 'COURIER MATRIX',
      desc: 'Contract rate card matching for selected carrier',
      formula: 'DTDC Express • Base 500G + Add 500G',
      icon: Navigation,
      accent: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      step: '07',
      title: 'FINAL RATE',
      desc: 'Tariff calculation with fuel & region surcharge',
      formula: 'Calculated Tariff: ₹3,300',
      icon: Calculator,
      accent: 'bg-[#E8F5E9] text-[#0F4C3A] border-emerald-300',
    },
    {
      step: '08',
      title: 'QUOTATION',
      desc: 'Instant PDF export & shareable client quotation link',
      formula: 'Quotation Ready • PDF & WhatsApp',
      icon: FileText,
      accent: 'bg-emerald-100 text-[#0F4C3A] border-emerald-400',
    },
  ];

  return (
    <div className={`w-full ${className}`}>
      {!compact && (
        <div className="text-center mb-8">
          <span className="inline-block bg-[#E8F5E9] text-[#0F4C3A] text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider mb-2 border border-emerald-200">
            GEO TRANSIT Unique Visualization System
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Package Transformation Pipeline
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto mt-1">
            Experience how GEO TRANSIT evaluates volumetric dimensions, applies mode density divisors, and matches contract rate cards in real time.
          </p>
        </div>
      )}

      {/* Grid of Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 relative">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeStep === idx;

          return (
            <div
              key={item.step}
              onClick={() => setActiveStep(idx)}
              className={`relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-[#0F4C3A] text-white border-[#0F4C3A] shadow-md scale-102 ring-2 ring-emerald-400/30'
                  : 'bg-white dark:bg-[#14231E] text-slate-800 dark:text-slate-100 border-slate-200 dark:border-[#264E41] hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold shadow-2xs ${isActive ? 'bg-white/20 text-white border-white/20' : item.accent}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-[9px] font-black tracking-wider ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
                    0{idx + 1}
                  </span>
                </div>

                <h4 className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                  {item.title}
                </h4>
                <p className={`text-[10px] font-medium mt-1 leading-tight ${isActive ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {item.desc}
                </p>
              </div>

              {/* Connecting arrow indicator */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Step Formula Inspector */}
      <div className="mt-4 bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1E8262] text-white flex items-center justify-center font-bold text-xs">
            0{activeStep + 1}
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
              {steps[activeStep].title} FORMULA & COMPUTATION
            </span>
            <strong className="text-xs text-white font-mono block mt-0.5">
              {steps[activeStep].formula}
            </strong>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
          Click any stage to inspect GEO TRANSIT logic
        </span>
      </div>
    </div>
  );
}
