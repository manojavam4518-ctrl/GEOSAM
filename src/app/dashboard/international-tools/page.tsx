'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Globe,
  Plane,
  Ship,
  Scale,
  FileText,
  ExternalLink,
  Search,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Package,
  MapPin,
  Sparkles,
  Layers,
  FileCheck,
  QrCode,
  Navigation,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import { COUNTRIES } from '@/lib/countryCodes';

export default function InternationalToolsPage() {
  // Volumetric Calculator State
  const [boxCount, setBoxCount] = useState<number>(1);
  const [lengthCm, setLengthCm] = useState<number>(50);
  const [widthCm, setWidthCm] = useState<number>(40);
  const [heightCm, setHeightCm] = useState<number>(30);
  const [actualWeightPerBoxKg, setActualWeightPerBoxKg] = useState<number>(8);
  const [divisorMode, setDivisorMode] = useState<number>(5000); // 5000 (IATA Air), 4500 (Express), or 6000

  // Country Directory Search State
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [selectedContinent, setSelectedContinent] = useState<string>('ALL');

  // Calculations
  const totalActualWeight = useMemo(() => {
    return Math.round(boxCount * actualWeightPerBoxKg * 100) / 100;
  }, [boxCount, actualWeightPerBoxKg]);

  const volumePerBoxCm3 = useMemo(() => {
    return lengthCm * widthCm * heightCm;
  }, [lengthCm, widthCm, heightCm]);

  const volumetricWeightPerBox = useMemo(() => {
    if (divisorMode <= 0) return 0;
    return Math.round((volumePerBoxCm3 / divisorMode) * 100) / 100;
  }, [volumePerBoxCm3, divisorMode]);

  const totalVolumetricWeight = useMemo(() => {
    return Math.round(volumetricWeightPerBox * boxCount * 100) / 100;
  }, [volumetricWeightPerBox, boxCount]);

  const chargeableWeight = useMemo(() => {
    return Math.max(totalActualWeight, totalVolumetricWeight);
  }, [totalActualWeight, totalVolumetricWeight]);

  const totalCbm = useMemo(() => {
    // 1 CBM = 1,000,000 cm3
    const totalVolumeCm3 = volumePerBoxCm3 * boxCount;
    return Math.round((totalVolumeCm3 / 1000000) * 1000) / 1000;
  }, [volumePerBoxCm3, boxCount]);

  const isVolumetricHigher = totalVolumetricWeight > totalActualWeight;

  // Filtered countries
  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    return COUNTRIES.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q)
      );
    });
  }, [countrySearch]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0a3528] to-[#0F4C3A] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-900/40">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-16 w-56 h-56 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <Globe className="w-3.5 h-3.5 animate-spin-slow" />
              <span>GLOBAL LOGISTICS SUITE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              INTERNATIONAL TOOLS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Unified cross-border shipping intelligence for international freight calculation, standard IATA volumetric divisors, global destination country guides, and export customs compliance.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <Link
              href="/dashboard/international-tools/proforma-invoice"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Proforma Invoice</span>
            </Link>
            <Link
              href="/dashboard/rate-calculator"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-emerald-300" />
              <span>Calculate Rates</span>
            </Link>
            <Link
              href="/dashboard/declarations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              <FileCheck className="w-4 h-4 text-emerald-300" />
              <span>Export Declarations</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Interactive International Volumetric & Chargeable Weight Calculator */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                International Volumetric &amp; Chargeable Weight Calculator
              </h2>
              <p className="text-[11px] text-slate-400">
                Official IATA standard formula: (L × W × H in cm) / Divisor
              </p>
            </div>
          </div>

          {/* Divisor Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setDivisorMode(5000)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                divisorMode === 5000
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              IATA Air (5000)
            </button>
            <button
              type="button"
              onClick={() => setDivisorMode(4500)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                divisorMode === 4500
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Express Air (4500)
            </button>
            <button
              type="button"
              onClick={() => setDivisorMode(6000)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                divisorMode === 6000
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Commercial (6000)
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Inputs Section (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Number of Packages / Boxes
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={boxCount}
                    onChange={(e) => setBoxCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Package className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Actual Gross Weight per Box (KG)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={actualWeightPerBoxKg}
                    onChange={(e) => setActualWeightPerBoxKg(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-400 absolute right-3.5 top-3 pointer-events-none font-mono">
                    KG
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Box Dimensions (Centimeters)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Length (L)</div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={lengthCm}
                      onChange={(e) => setLengthCm(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] font-bold text-slate-400 absolute right-2.5 top-2.5 font-mono">cm</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Width (W)</div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={widthCm}
                      onChange={(e) => setWidthCm(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] font-bold text-slate-400 absolute right-2.5 top-2.5 font-mono">cm</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Height (H)</div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={heightCm}
                      onChange={(e) => setHeightCm(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] font-bold text-slate-400 absolute right-2.5 top-2.5 font-mono">cm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Dimension Presets */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Quick Box Sizes:</span>
              <button
                type="button"
                onClick={() => { setLengthCm(30); setWidthCm(25); setHeightCm(20); }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Small (30×25×20)
              </button>
              <button
                type="button"
                onClick={() => { setLengthCm(50); setWidthCm(40); setHeightCm(30); }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Medium (50×40×30)
              </button>
              <button
                type="button"
                onClick={() => { setLengthCm(60); setWidthCm(50); setHeightCm(45); }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Large (60×50×45)
              </button>
            </div>
          </div>

          {/* Results Summary Card (5 Cols) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-50 to-emerald-50/40 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="font-black text-xs uppercase tracking-wide text-slate-900">
                  Weight Calculation Results
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Divisor: {divisorMode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Actual Weight</div>
                <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                  {totalActualWeight} <span className="text-xs font-bold text-slate-500">KG</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ({boxCount} × {actualWeightPerBoxKg} kg)
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Volumetric Weight</div>
                <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                  {totalVolumetricWeight} <span className="text-xs font-bold text-slate-500">KG</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ({volumetricWeightPerBox} kg/box)
                </div>
              </div>
            </div>

            {/* Billable Weight Highlight */}
            <div className="p-4 rounded-xl bg-white border-2 border-emerald-600 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Official Billable Weight
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isVolumetricHigher
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {isVolumetricHigher ? 'Billed on Volumetric' : 'Billed on Actual'}
                </span>
              </div>

              <div className="text-3xl font-black text-[#0F4C3A] font-mono">
                {chargeableWeight} <span className="text-base font-bold text-slate-600">KG</span>
              </div>

              <div className="text-[11px] text-slate-600 leading-tight">
                {isVolumetricHigher ? (
                  <span>
                    Volumetric weight exceeds gross weight by{' '}
                    <strong className="text-amber-700 font-mono">
                      +{Math.round((totalVolumetricWeight - totalActualWeight) * 100) / 100} KG
                    </strong>
                    . Airline will charge on volumetric weight.
                  </span>
                ) : (
                  <span>
                    Gross weight is higher than dimensional volume. Airline will charge on physical gross weight.
                  </span>
                )}
              </div>
            </div>

            {/* Cubic Volume CBM */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs">
              <span className="font-bold text-slate-600">Total Cubic Volume (CBM):</span>
              <span className="font-mono font-bold text-slate-900">{totalCbm} m³</span>
            </div>

            <Link
              href="/dashboard/rate-calculator"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0F4C3A] hover:bg-[#155d47] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              <span>Compare Freight in Rate Calculator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Cross-Border Quick Tools Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
              Cross-Border Logistics Modules
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Direct shortcuts to specialized workflows</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Link
            href="/dashboard/international-tools/proforma-invoice"
            className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                Proforma Invoice
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate official cross-border export proforma invoices with live synchronized A4 preview and digital signature.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700">
              <span>Create Proforma</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/rate-cards"
            className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                International Rate Cards
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Configure international country-wise tariff slabs, Sea/Air freight per-kg contracts, and customs handling charges.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>Manage Slabs</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/declarations"
            className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                Goods Declaration Note
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Create official export declarations with AI-suggested HSN codes, consignor signatures, and live PDF downloads.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Create Declaration</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/tracking"
            className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Navigation className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                Global Shipment Tracker
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Track cross-border consignments across DHL Express, FedEx International, UPS, Aramex, and overseas partners.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
              <span>Track Consignment</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/shipping-labels"
            className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                Shipping Label Generator
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Print international compliant barcode and QR shipping labels with country flags, thermal previews, and auto-zoom.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-700">
              <span>Generate Labels</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* 4. Global Destination Country Directory */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Destination Country Directory &amp; Routing Guide
              </h2>
              <p className="text-[11px] text-slate-500">
                {COUNTRIES.length} major global destinations with dialing codes and international standards
              </p>
            </div>
          </div>

          {/* Country Search Bar */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search country, code (+1, +44)..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-6">Country</th>
                <th className="py-3 px-4">ISO Code</th>
                <th className="py-3 px-4">Dialing Code</th>
                <th className="py-3 px-4">Standard Divisor</th>
                <th className="py-3 px-4">Transit Modes</th>
                <th className="py-3 px-6 text-right">Customs Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredCountries.slice(0, 16).map((country) => (
                <tr key={country.code} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-6 flex items-center gap-2.5 font-bold text-slate-900">
                    <span className="text-xl leading-none">{country.flag}</span>
                    <span>{country.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {country.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                    {country.dialCode}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                    5000 cm³/kg
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200">
                        <Plane className="w-2.5 h-2.5" /> Air
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                        <Ship className="w-2.5 h-2.5" /> Sea
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-right text-[11px] font-medium text-slate-500">
                    Invoice + Packing List
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCountries.length > 16 && (
          <div className="p-3 text-center bg-slate-50 border-t border-slate-100 text-xs text-slate-500 font-medium">
            Showing top 16 of {filteredCountries.length} countries. Use the search box above to find any destination.
          </div>
        )}
      </div>

      {/* 5. Cross-Border Customs & Export Compliance Checklist */}
      <div className="bg-gradient-to-br from-slate-900 to-[#0F4C3A] rounded-3xl p-6 sm:p-8 text-white space-y-5 shadow-lg border border-emerald-900/40">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            Standard International Export Dispatch Checklist
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>1. Commercial Invoice</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              3 original signed copies detailing unit value, total value, currency (USD/EUR/INR), and buyer &amp; seller tax IDs.
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>2. Goods Declaration Note</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Consignor declaration with complete HSN classification, non-commercial / commercial purpose, and consignor signature.
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3. Non-DG &amp; Weight Verification</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Certification that packages contain no prohibited or dangerous goods (DG). Billed on standard IATA chargeable weight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

