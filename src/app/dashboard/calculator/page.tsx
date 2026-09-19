'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { exportWeightCalculationPDF, takeScreenshot } from '@/utils/exportUtils';
import ShareMenuModal from '@/components/ShareMenuModal';
import {
  Calculator,
  Plus,
  Trash2,
  FileDown,
  Camera,
  Share2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';

interface PackageItem {
  length: string;
  width: string;
  height: string;
  actualWeight: string;
  quantity: string;
}

function getUnitReadableName(unit: 'MM' | 'CM' | 'Inch' | 'Feet', value: number): string {
  const isSingular = value === 1;
  switch (unit) {
    case 'MM': return isSingular ? 'Millimeter' : 'Millimeters';
    case 'CM': return isSingular ? 'Centimeter' : 'Centimeters';
    case 'Inch': return isSingular ? 'Inch' : 'Inches';
    case 'Feet': return isSingular ? 'Foot' : 'Feet';
    default: return unit;
  }
}

function CalculatorContent() {
  const [user, setUser] = useState<any>(null);
  const [defaultTemplate, setDefaultTemplate] = useState<any>(null);

  // Light / Dark Theme State (Persisted)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Collapsible Converter State
  const [converterExpanded, setConverterExpanded] = useState(true);

  // Unit Converter State
  const [convFrom, setConvFrom] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('Feet');
  const [convTo, setConvTo] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('Feet');
  const [convValue, setConvValue] = useState('10');
  const [convResult, setConvResult] = useState<number | null>(10);

  // Calculator State
  const [serviceType, setServiceType] = useState<'DOMESTIC' | 'INTERNATIONAL'>('DOMESTIC');
  const [lengthUnit, setLengthUnit] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('CM');
  const [widthUnit, setWidthUnit] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('CM');
  const [heightUnit, setHeightUnit] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('CM');
  const [divisorMode, setDivisorMode] = useState<'4000' | '4500' | '5000' | 'CUSTOM'>('4000');
  const [customDivisor, setCustomDivisor] = useState('5000');
  const [multiPackage, setMultiPackage] = useState(false);
  
  // Package Inputs
  const [singlePkg, setSinglePkg] = useState<PackageItem>({
    length: '0',
    width: '0',
    height: '0',
    actualWeight: '',
    quantity: '1',
  });
  
  const [packages, setPackages] = useState<PackageItem[]>([
    { length: '0', width: '0', height: '0', actualWeight: '', quantity: '1' }
  ]);

  // Results & Sharing State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [demoState, setDemoState] = useState<any>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePdfData, setSharePdfData] = useState<{ blob: Blob | null; filename: string } | null>(null);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('weight_calculator_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    }
  }, []);

  // Load user session & profile branding templates
  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, tmplRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/quotations/templates')
        ]);

        if (meRes.ok) {
          const json = await meRes.json();
          setUser(json.user);
          const isExpired = json.user.accessStatus === 'DEMO_EXPIRED' || json.user.accessStatus === 'SUBSCRIPTION_EXPIRED';
          setDemoState({
            calculationsUsed: json.user.calculationsCount,
            calculationsLimit: 9999,
            demoLimitReached: isExpired,
          });
        }

        if (tmplRes.ok) {
          const tmplJson = await tmplRes.json();
          if (tmplJson.templates && tmplJson.templates.length > 0) {
            const def = tmplJson.templates.find((t: any) => t.isDefault) || tmplJson.templates[0];
            setDefaultTemplate(def);
          }
        }
      } catch (err) {
        console.error('Error loading calculator workspace:', err);
      }
    }

    loadData();
  }, []);

  // Toggle Theme handler
  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('weight_calculator_theme', newTheme);
  };

  // Shared Conversion Utility
  function convertUnits(val: number, from: 'MM' | 'CM' | 'Inch' | 'Feet', to: 'MM' | 'CM' | 'Inch' | 'Feet'): number {
    if (from === to) return val;

    let valInCm = val;
    if (from === 'MM') valInCm = val / 10;
    else if (from === 'Inch') valInCm = val * 2.54;
    else if (from === 'Feet') valInCm = val * 30.48;

    let finalVal = valInCm;
    if (to === 'MM') finalVal = valInCm * 10;
    else if (to === 'Inch') finalVal = valInCm / 2.54;
    else if (to === 'Feet') finalVal = valInCm / 30.48;

    return parseFloat(finalVal.toFixed(2));
  }

  // Run Unit Converter calculation automatically
  useEffect(() => {
    const val = parseFloat(convValue);
    if (isNaN(val) || val < 0) {
      setConvResult(null);
      return;
    }
    const converted = convertUnits(val, convFrom, convTo);
    setConvResult(converted);
  }, [convValue, convFrom, convTo]);

  // Apply converted result to calculator dimensions
  function handleApplyToCalculator(targetField: 'length' | 'width' | 'height') {
    if (convResult === null) return;

    const targetUnit = targetField === 'length' 
      ? lengthUnit 
      : targetField === 'width' 
        ? widthUnit 
        : heightUnit;

    const finalValue = convertUnits(convResult, convTo, targetUnit).toString();

    if (multiPackage) {
      const updated = [...packages];
      if (updated.length > 0) {
        updated[0][targetField] = finalValue;
        setPackages(updated);
      }
    } else {
      setSinglePkg(prev => ({ ...prev, [targetField]: finalValue }));
    }
  }

  // Unit change handlers for Length, Width, and Height
  const handleLengthUnitChange = (newUnit: 'MM' | 'CM' | 'Inch' | 'Feet') => {
    if (multiPackage) {
      setPackages(prev => prev.map(p => {
        const val = parseFloat(p.length);
        return {
          ...p,
          length: !isNaN(val) && val > 0 ? convertUnits(val, lengthUnit, newUnit).toString() : p.length
        };
      }));
    } else {
      const val = parseFloat(singlePkg.length);
      if (!isNaN(val) && val > 0) {
        const converted = convertUnits(val, lengthUnit, newUnit);
        setSinglePkg(prev => ({ ...prev, length: converted.toString() }));
      }
    }
    setLengthUnit(newUnit);
  };

  const handleWidthUnitChange = (newUnit: 'MM' | 'CM' | 'Inch' | 'Feet') => {
    if (multiPackage) {
      setPackages(prev => prev.map(p => {
        const val = parseFloat(p.width);
        return {
          ...p,
          width: !isNaN(val) && val > 0 ? convertUnits(val, widthUnit, newUnit).toString() : p.width
        };
      }));
    } else {
      const val = parseFloat(singlePkg.width);
      if (!isNaN(val) && val > 0) {
        const converted = convertUnits(val, widthUnit, newUnit);
        setSinglePkg(prev => ({ ...prev, width: converted.toString() }));
      }
    }
    setWidthUnit(newUnit);
  };

  const handleHeightUnitChange = (newUnit: 'MM' | 'CM' | 'Inch' | 'Feet') => {
    if (multiPackage) {
      setPackages(prev => prev.map(p => {
        const val = parseFloat(p.height);
        return {
          ...p,
          height: !isNaN(val) && val > 0 ? convertUnits(val, heightUnit, newUnit).toString() : p.height
        };
      }));
    } else {
      const val = parseFloat(singlePkg.height);
      if (!isNaN(val) && val > 0) {
        const converted = convertUnits(val, heightUnit, newUnit);
        setSinglePkg(prev => ({ ...prev, height: converted.toString() }));
      }
    }
    setHeightUnit(newUnit);
  };

  const handleApplyUnitToAll = (targetUnit: 'MM' | 'CM' | 'Inch' | 'Feet') => {
    if (multiPackage) {
      setPackages(prev => prev.map(p => {
        const lenVal = parseFloat(p.length);
        const widVal = parseFloat(p.width);
        const heiVal = parseFloat(p.height);
        return {
          ...p,
          length: !isNaN(lenVal) && lenVal > 0 ? convertUnits(lenVal, lengthUnit, targetUnit).toString() : p.length,
          width: !isNaN(widVal) && widVal > 0 ? convertUnits(widVal, widthUnit, targetUnit).toString() : p.width,
          height: !isNaN(heiVal) && heiVal > 0 ? convertUnits(heiVal, heightUnit, targetUnit).toString() : p.height
        };
      }));
    } else {
      const lenVal = parseFloat(singlePkg.length);
      const widVal = parseFloat(singlePkg.width);
      const heiVal = parseFloat(singlePkg.height);
      setSinglePkg(prev => ({
        ...prev,
        length: !isNaN(lenVal) && lenVal > 0 ? convertUnits(lenVal, lengthUnit, targetUnit).toString() : prev.length,
        width: !isNaN(widVal) && widVal > 0 ? convertUnits(widVal, widthUnit, targetUnit).toString() : prev.width,
        height: !isNaN(heiVal) && heiVal > 0 ? convertUnits(heiVal, heightUnit, targetUnit).toString() : prev.height
      }));
    }
    setLengthUnit(targetUnit);
    setWidthUnit(targetUnit);
    setHeightUnit(targetUnit);
  };

  const handleToggleMultiPackage = (enabled: boolean) => {
    setMultiPackage(enabled);
    if (enabled) {
      if ((!packages[0]?.length || packages[0]?.length === '') && singlePkg.length) {
        setPackages([{
          length: singlePkg.length,
          width: singlePkg.width,
          height: singlePkg.height,
          actualWeight: singlePkg.actualWeight,
          quantity: singlePkg.quantity || '1',
        }]);
      }
    } else {
      if (packages[0]) {
        setSinglePkg({
          length: packages[0].length || singlePkg.length,
          width: packages[0].width || singlePkg.width,
          height: packages[0].height || singlePkg.height,
          actualWeight: packages[0].actualWeight || singlePkg.actualWeight,
          quantity: packages[0].quantity || '1',
        });
      }
    }
  };

  // Multi-package handlers
  function addPackage() {
    setPackages(prev => [...prev, { length: '0', width: '0', height: '0', actualWeight: '', quantity: '1' }]);
  }

  function removePackage(index: number) {
    if (packages.length === 1) return;
    setPackages(prev => prev.filter((_, idx) => idx !== index));
  }

  function updatePackageField(index: number, field: keyof PackageItem, value: string) {
    const updated = [...packages];
    updated[index][field] = value;
    setPackages(updated);
  }

  // Service Type switch handler
  const handleServiceTypeChange = (type: 'DOMESTIC' | 'INTERNATIONAL') => {
    setServiceType(type);
    if (type === 'INTERNATIONAL') {
      setDivisorMode('4500');
    } else {
      setDivisorMode('4000');
    }
  };

  // Direct PDF Export (Immediate generation with company profile branding, NO intermediate configuration forms)
  const handleDirectPDFExport = async () => {
    if (!result) return;
    await exportWeightCalculationPDF(result, user, defaultTemplate);
  };

  // Share action (Generates customer branded PDF and opens Share menu)
  const handleOpenShareModal = async () => {
    if (!result) return;
    const res = await exportWeightCalculationPDF(result, user, defaultTemplate);
    if (res) {
      setSharePdfData({ blob: res.blob, filename: res.filename });
      setShareModalOpen(true);
    }
  };

  // Calculate Request
  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);

    const activeDivisor = divisorMode === 'CUSTOM' ? customDivisor : divisorMode;
    const parsedDivisor = parseFloat(activeDivisor);

    if (isNaN(parsedDivisor) || parsedDivisor <= 0) {
      setError('Please provide a valid custom divisor value.');
      return;
    }

    let finalPackages = [];
    if (multiPackage) {
      for (let i = 0; i < packages.length; i++) {
        const p = packages[i];
        const len = parseFloat(p.length);
        const wid = parseFloat(p.width);
        const hei = parseFloat(p.height);
        const act = parseFloat(p.actualWeight);
        const qty = parseInt(p.quantity);

        if (isNaN(len) || len <= 0 || isNaN(wid) || wid <= 0 || isNaN(hei) || hei <= 0) {
          setError(`Package #${i + 1} has invalid or negative dimensions.`);
          return;
        }
        if (isNaN(act) || act < 0) {
          setError(`Package #${i + 1} has invalid or negative weight.`);
          return;
        }

        const lenCm = convertUnits(len, lengthUnit, 'CM');
        const widCm = convertUnits(wid, widthUnit, 'CM');
        const heiCm = convertUnits(hei, heightUnit, 'CM');

        finalPackages.push({
          length: lenCm,
          width: widCm,
          height: heiCm,
          actualWeight: act,
          quantity: qty || 1,
        });
      }
    } else {
      const len = parseFloat(singlePkg.length);
      const wid = parseFloat(singlePkg.width);
      const hei = parseFloat(singlePkg.height);
      const act = parseFloat(singlePkg.actualWeight);
      const qty = parseInt(singlePkg.quantity);

      if (isNaN(len) || len <= 0 || isNaN(wid) || wid <= 0 || isNaN(hei) || hei <= 0) {
        setError('Please enter valid positive dimensions (Length, Width, Height).');
        return;
      }
      if (isNaN(act) || act < 0) {
        setError('Actual weight must be a positive number.');
        return;
      }

      const lenCm = convertUnits(len, lengthUnit, 'CM');
      const widCm = convertUnits(wid, widthUnit, 'CM');
      const heiCm = convertUnits(hei, heightUnit, 'CM');

      finalPackages.push({
        length: lenCm,
        width: widCm,
        height: heiCm,
        actualWeight: act,
        quantity: qty || 1,
      });
    }

    setLoading(true);
    try {
      const res = await fetch('/api/calculator/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit: 'CM',
          divisor: activeDivisor,
          serviceType: serviceType,
          packages: finalPackages,
          rateCardId: null,
          destination: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Calculation failed.');
      }

      setResult({ ...data.calculation, serviceType });
      if (data.demoState) {
        setDemoState({
          calculationsUsed: data.demoState.calculationsUsed,
          calculationsLimit: 9999,
          demoLimitReached: data.demoState.demoLimitReached,
        });
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  const isDark = theme === 'dark';

  return (
    <div className={`space-y-6 w-full max-w-7xl mx-auto ${isDark ? 'bg-[#0B1310] text-slate-100 p-4 sm:p-6 rounded-2xl transition-colors duration-200' : 'transition-colors duration-200'}`}>
      {/* Page Header with Light/Dark Theme Switcher */}
      <div className={`flex items-center justify-between flex-wrap gap-4 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-[#0F4C3A]'}`}>Weight Calculator</h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SaaS volumetric cargo evaluation workspace</p>
        </div>

        {user?.accessStatus === 'DEMO_ACTIVE' && (
          <div className={`px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm border ${
            isDark ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-xs">
              <span className="block font-bold leading-none">Demo Account Active</span>
              <span className="block mt-1 text-[11px] opacity-80">
                Remaining Demo: <strong>{(() => {
                  const expiry = new Date(user.demoExpiresAt);
                  return Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                })()} Days</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Form: Calculator Inputs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Unit Converter */}
          <div className={`border rounded-2xl shadow-sm overflow-hidden ${
            isDark ? 'bg-[#14231E] border-[#264E41]' : 'bg-white border-slate-200'
          }`}>
            <button
              onClick={() => setConverterExpanded(!converterExpanded)}
              className={`w-full flex items-center justify-between p-5 border-b text-left transition cursor-pointer ${
                isDark ? 'bg-[#182B25] border-[#264E41] hover:bg-[#1C322B]' : 'bg-[#F8FAFC] border-slate-200 hover:bg-slate-50/80'
              }`}
            >
              <span className={`font-extrabold text-xs uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Unit Converter
              </span>
              {converterExpanded ? (
                <ChevronUp className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
              ) : (
                <ChevronDown className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
              )}
            </button>

            {converterExpanded && (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Convert From</label>
                    <select
                      value={convFrom}
                      onChange={(e) => setConvFrom(e.target.value as any)}
                      className={`w-full border rounded-lg text-xs p-2 focus:outline-none h-[34px] ${
                        isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32]' : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'
                      }`}
                    >
                      <option value="MM">MM (Millimeters)</option>
                      <option value="CM">CM (Centimeters)</option>
                      <option value="Inch">Inch (Inches)</option>
                      <option value="Feet">Feet (Feets)</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Value</label>
                    <input
                      type="number"
                      value={convValue}
                      onChange={(e) => setConvValue(e.target.value)}
                      placeholder="10"
                      className={`w-full border rounded-lg text-xs p-2 focus:outline-none h-[34px] ${
                        isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32]' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Convert To</label>
                    <select
                      value={convTo}
                      onChange={(e) => setConvTo(e.target.value as any)}
                      className={`w-full border rounded-lg text-xs p-2 focus:outline-none h-[34px] ${
                        isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32]' : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'
                      }`}
                    >
                      <option value="MM">MM (Millimeters)</option>
                      <option value="CM">CM (Centimeters)</option>
                      <option value="Inch">Inch (Inches)</option>
                      <option value="Feet">Feet (Feets)</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Conversion Result</label>
                    <div className={`w-full border rounded-lg text-xs p-2 font-bold select-all h-[34px] flex items-center justify-start px-3 ${
                      isDark ? 'bg-[#103A2D] border-emerald-700/60 text-emerald-300' : 'bg-[#E8F5E9] border-emerald-200 text-[#0F4C3A]'
                    }`}>
                      {convResult !== null 
                        ? `${convResult} ${getUnitReadableName(convTo, convResult)}` 
                        : `0.00 ${getUnitReadableName(convTo, 0)}`
                      }
                    </div>
                  </div>
                </div>

                {/* Apply Buttons */}
                <div className={`border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <span className={`block text-[10px] font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    USE IN CALCULATOR:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleApplyToCalculator('length')}
                      className={`border py-2 px-3 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                        isDark ? 'bg-[#182B25] border-[#2E5448] text-slate-200 hover:border-emerald-400 hover:text-emerald-300' : 'bg-white border-slate-200 text-slate-700 hover:border-[#1E8262] hover:text-[#0F4C3A]'
                      }`}
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" />
                      Apply to Length
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyToCalculator('width')}
                      className={`border py-2 px-3 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                        isDark ? 'bg-[#182B25] border-[#2E5448] text-slate-200 hover:border-emerald-400 hover:text-emerald-300' : 'bg-white border-slate-200 text-slate-700 hover:border-[#1E8262] hover:text-[#0F4C3A]'
                      }`}
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" />
                      Apply to Width
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyToCalculator('height')}
                      className={`border py-2 px-3 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                        isDark ? 'bg-[#182B25] border-[#2E5448] text-slate-200 hover:border-emerald-400 hover:text-emerald-300' : 'bg-white border-slate-200 text-slate-700 hover:border-[#1E8262] hover:text-[#0F4C3A]'
                      }`}
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" />
                      Apply to Height
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className={`p-4 rounded-xl text-xs font-semibold border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isDark ? 'bg-red-950/50 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <span>{error}</span>
              {error.toLowerCase().includes('subscribe') && (
                <a
                  href="/dashboard/subscriptions"
                  className="shrink-0 bg-[#107c5a] hover:bg-[#0e382c] text-white text-xs font-bold py-1.5 px-3 rounded-lg transition text-center shadow-xs"
                >
                  Subscribe Now &rarr;
                </a>
              )}
            </div>
          )}

          {/* Calculator Inputs Form */}
          <form onSubmit={handleCalculate} className="space-y-6">

            {/* Service Type */}
            <div className={`border p-5 rounded-2xl shadow-sm space-y-3 ${
              isDark ? 'bg-[#14231E] border-[#264E41]' : 'bg-white border-slate-200'
            }`}>
              <span className={`block text-xs font-extrabold uppercase tracking-wider ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                Service Type
              </span>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  type="button"
                  onClick={() => handleServiceTypeChange('DOMESTIC')}
                  className={`py-3 px-4 rounded-xl font-bold text-sm text-center transition border cursor-pointer ${
                    serviceType === 'DOMESTIC'
                      ? isDark
                        ? 'bg-[#103A2D] border-emerald-400 text-emerald-300 shadow-xs font-bold'
                        : 'bg-[#f0f7f4] border-[#107c5a] text-[#0e382c] shadow-xs'
                      : isDark
                        ? 'bg-[#182B25] border-[#264E41] text-slate-400 hover:bg-[#1F362E]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}
                >
                  Domestic
                </button>
                <button
                  type="button"
                  onClick={() => handleServiceTypeChange('INTERNATIONAL')}
                  className={`py-3 px-4 rounded-xl font-bold text-sm text-center transition border cursor-pointer ${
                    serviceType === 'INTERNATIONAL'
                      ? isDark
                        ? 'bg-[#103A2D] border-emerald-400 text-emerald-300 shadow-xs font-bold'
                        : 'bg-[#f0f7f4] border-[#107c5a] text-[#0e382c] shadow-xs'
                      : isDark
                        ? 'bg-[#182B25] border-[#264E41] text-slate-400 hover:bg-[#1F362E]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}
                >
                  International
                </button>
              </div>
            </div>

            {/* Actual Weight (Shown for single package mode) */}
            {!multiPackage && (
              <div className={`border p-5 rounded-2xl shadow-sm space-y-3 ${
                isDark ? 'bg-[#14231E] border-[#264E41]' : 'bg-white border-slate-200'
              }`}>
                <span className={`block text-xs font-extrabold uppercase tracking-wider ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  Actual Weight
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={singlePkg.actualWeight}
                    onChange={(e) => setSinglePkg({ ...singlePkg, actualWeight: e.target.value })}
                    placeholder="Actual Weight (KG)"
                    className={`w-full border rounded-lg pl-3 pr-10 py-3 text-sm focus:outline-none ${
                      isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32]' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white'
                    }`}
                    required
                  />
                  <span className={`absolute right-3.5 top-3.5 text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    KG
                  </span>
                </div>
              </div>
            )}

            {/* Package Dimensions Card with integrated MULTIPLE PACKAGES toggle & Radio-based APPLY TO ALL */}
            <div className={`border p-5 rounded-2xl shadow-sm space-y-4 ${
              isDark ? 'bg-[#14231E] border-[#264E41]' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 flex-wrap gap-2 ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div>
                  <span className={`block text-xs font-extrabold uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    Package Dimensions
                  </span>
                </div>

                <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border ${
                  isDark ? 'bg-[#182B25] border-[#264E41]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Multiple Packages
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={multiPackage}
                      onChange={(e) => handleToggleMultiPackage(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#107c5a]"></div>
                  </label>
                </div>
              </div>

              {/* Radio-based Apply to All */}
              <div className={`flex items-center gap-3.5 pt-1 border-b pb-3.5 flex-wrap ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div className={`px-2.5 py-1 rounded-md border font-extrabold text-xs uppercase tracking-wider shadow-2xs ${
                  isDark 
                    ? 'bg-[#182B25] border-[#264E41] text-emerald-300' 
                    : 'bg-emerald-50/80 border-emerald-200/80 text-[#0F4C3A]'
                }`}>
                  APPLY TO ALL:
                </div>
                <div className="flex items-center gap-3.5">
                  {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                    const isAllMatch = lengthUnit === u && widthUnit === u && heightUnit === u;
                    return (
                      <label key={u} className={`flex items-center gap-1.5 cursor-pointer text-xs transition-colors ${
                        isAllMatch
                          ? isDark
                            ? 'text-emerald-300 font-extrabold'
                            : 'text-[#0F4C3A] font-extrabold'
                          : isDark
                            ? 'text-slate-300 font-semibold hover:text-white'
                            : 'text-slate-700 font-semibold hover:text-slate-900'
                      }`}>
                        <input
                          type="radio"
                          name="applyToAllUnit"
                          value={u}
                          checked={isAllMatch}
                          onChange={() => handleApplyUnitToAll(u)}
                          className="accent-[#107c5a] h-4 w-4 cursor-pointer"
                        />
                        <span className={isAllMatch ? 'underline underline-offset-2' : ''}>{u}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Single Package vs Multiple Packages layout */}
              {!multiPackage ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1">
                  {/* Length */}
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Length ({lengthUnit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={singlePkg.length}
                      onChange={(e) => setSinglePkg({ ...singlePkg, length: e.target.value })}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32] focus:border-emerald-400' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white focus:border-[#107c5a]'
                      }`}
                      required
                    />
                    <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                      {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                        const isSelected = lengthUnit === u;
                        return (
                          <label key={u} className={`flex items-center gap-1.5 cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? isDark ? 'text-emerald-300 font-extrabold' : 'text-[#0F4C3A] font-extrabold'
                              : isDark ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                          }`}>
                            <input
                              type="radio"
                              name="singleLengthUnit"
                              value={u}
                              checked={isSelected}
                              onChange={() => handleLengthUnitChange(u)}
                              className="accent-[#107c5a] h-3.5 w-3.5 cursor-pointer"
                            />
                            <span>{u}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Width */}
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Width ({widthUnit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={singlePkg.width}
                      onChange={(e) => setSinglePkg({ ...singlePkg, width: e.target.value })}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32] focus:border-emerald-400' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white focus:border-[#107c5a]'
                      }`}
                      required
                    />
                    <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                      {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                        const isSelected = widthUnit === u;
                        return (
                          <label key={u} className={`flex items-center gap-1.5 cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? isDark ? 'text-emerald-300 font-extrabold' : 'text-[#0F4C3A] font-extrabold'
                              : isDark ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                          }`}>
                            <input
                              type="radio"
                              name="singleWidthUnit"
                              value={u}
                              checked={isSelected}
                              onChange={() => handleWidthUnitChange(u)}
                              className="accent-[#107c5a] h-3.5 w-3.5 cursor-pointer"
                            />
                            <span>{u}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Height */}
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Height ({heightUnit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={singlePkg.height}
                      onChange={(e) => setSinglePkg({ ...singlePkg, height: e.target.value })}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32] focus:border-emerald-400' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white focus:border-[#107c5a]'
                      }`}
                      required
                    />
                    <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                      {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                        const isSelected = heightUnit === u;
                        return (
                          <label key={u} className={`flex items-center gap-1.5 cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? isDark ? 'text-emerald-300 font-extrabold' : 'text-[#0F4C3A] font-extrabold'
                              : isDark ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                          }`}>
                            <input
                              type="radio"
                              name="singleHeightUnit"
                              value={u}
                              checked={isSelected}
                              onChange={() => handleHeightUnitChange(u)}
                              className="accent-[#107c5a] h-3.5 w-3.5 cursor-pointer"
                            />
                            <span>{u}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Multiple Packages View */
                <div className="space-y-4 pt-1">
                  {/* Dimension Units Selector Bar */}
                  <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 rounded-xl border ${
                    isDark ? 'bg-[#182B25] border-[#264E41]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className={`block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Length Unit</span>
                      <div className="flex items-center gap-2.5 pt-1.5 flex-wrap">
                        {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                          const isSelected = lengthUnit === u;
                          return (
                            <label key={u} className={`flex items-center gap-1.5 cursor-pointer text-xs transition-colors ${
                              isSelected
                                ? isDark ? 'text-emerald-300 font-extrabold' : 'text-[#0F4C3A] font-extrabold'
                                : isDark ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                            }`}>
                              <input
                                type="radio"
                                name="multiLengthUnit"
                                value={u}
                                checked={isSelected}
                                onChange={() => handleLengthUnitChange(u)}
                                className="accent-[#107c5a] h-3.5 w-3.5 cursor-pointer"
                              />
                              <span>{u}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <span className={`block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Width Unit</span>
                      <div className="flex items-center gap-2.5 pt-1.5 flex-wrap">
                        {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                          const isSelected = widthUnit === u;
                          return (
                            <label key={u} className={`flex items-center gap-1.5 cursor-pointer text-xs transition-colors ${
                              isSelected
                                ? isDark ? 'text-emerald-300 font-extrabold' : 'text-[#0F4C3A] font-extrabold'
                                : isDark ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                            }`}>
                              <input
                                type="radio"
                                name="multiWidthUnit"
                                value={u}
                                checked={isSelected}
                                onChange={() => handleWidthUnitChange(u)}
                                className="accent-[#107c5a] h-3.5 w-3.5 cursor-pointer"
                              />
                              <span>{u}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <span className={`block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Height Unit</span>
                      <div className="flex items-center gap-2.5 pt-1.5 flex-wrap">
                        {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                          const isSelected = heightUnit === u;
                          return (
                            <label key={u} className={`flex items-center gap-1.5 cursor-pointer text-xs transition-colors ${
                              isSelected
                                ? isDark ? 'text-emerald-300 font-extrabold' : 'text-[#0F4C3A] font-extrabold'
                                : isDark ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                            }`}>
                              <input
                                type="radio"
                                name="multiHeightUnit"
                                value={u}
                                checked={isSelected}
                                onChange={() => handleHeightUnitChange(u)}
                                className="accent-[#107c5a] h-3.5 w-3.5 cursor-pointer"
                              />
                              <span>{u}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* List of packages */}
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {packages.map((pkg, idx) => (
                      <div key={idx} className={`p-4 border rounded-xl space-y-3 relative ${
                        isDark ? 'bg-[#1A2E27] border-[#2E5448]' : 'bg-slate-50/70 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-extrabold text-xs ${isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'}`}>Package {idx + 1}</span>
                          {packages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePackage(idx)}
                              className="text-red-500 hover:bg-red-50/10 p-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div>
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Length ({lengthUnit})</label>
                            <input
                              type="number"
                              step="any"
                              value={pkg.length}
                              onChange={(e) => updatePackageField(idx, 'length', e.target.value)}
                              placeholder="0.00"
                              className={`w-full border rounded-lg text-xs p-2 focus:outline-none ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                              }`}
                              required
                            />
                          </div>

                          <div>
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Width ({widthUnit})</label>
                            <input
                              type="number"
                              step="any"
                              value={pkg.width}
                              onChange={(e) => updatePackageField(idx, 'width', e.target.value)}
                              placeholder="0.00"
                              className={`w-full border rounded-lg text-xs p-2 focus:outline-none ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                              }`}
                              required
                            />
                          </div>

                          <div>
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Height ({heightUnit})</label>
                            <input
                              type="number"
                              step="any"
                              value={pkg.height}
                              onChange={(e) => updatePackageField(idx, 'height', e.target.value)}
                              placeholder="0.00"
                              className={`w-full border rounded-lg text-xs p-2 focus:outline-none ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                              }`}
                              required
                            />
                          </div>

                          <div>
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Act Wt (KG)</label>
                            <input
                              type="number"
                              step="any"
                              value={pkg.actualWeight}
                              onChange={(e) => updatePackageField(idx, 'actualWeight', e.target.value)}
                              placeholder="0.00"
                              className={`w-full border rounded-lg text-xs p-2 focus:outline-none ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                              }`}
                              required
                            />
                          </div>

                          <div>
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={pkg.quantity}
                              onChange={(e) => updatePackageField(idx, 'quantity', e.target.value)}
                              className={`w-full border rounded-lg text-xs p-2 focus:outline-none ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                              }`}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={addPackage}
                      className={`w-full sm:w-auto border text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                        isDark ? 'bg-[#103A2D] hover:bg-[#164B3A] text-emerald-300 border-emerald-700/50' : 'bg-[#f0f7f4] hover:bg-emerald-100 text-[#0F4C3A] border-[#107c5a]/30'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      + Add Package
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Divisor with Service-Type specific selectable options */}
            <div className={`border p-5 rounded-2xl shadow-sm space-y-4 ${
              isDark ? 'bg-[#14231E] border-[#264E41]' : 'bg-white border-slate-200'
            }`}>
              <span className={`block text-xs font-extrabold uppercase tracking-wider ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                Divisor ({serviceType === 'DOMESTIC' ? 'Domestic' : 'International'})
              </span>

              {serviceType === 'DOMESTIC' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    onClick={() => setDivisorMode('4000')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition duration-150 ${
                      divisorMode === '4000'
                        ? isDark
                          ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                          : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                        : isDark
                          ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                          : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg font-black tracking-tight">4000</span>
                    <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mt-1.5 text-center ${
                      divisorMode === '4000'
                        ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                        : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>SURFACE MODE</span>
                  </div>

                  <div
                    onClick={() => setDivisorMode('4500')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition duration-150 ${
                      divisorMode === '4500'
                        ? isDark
                          ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                          : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                        : isDark
                          ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                          : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg font-black tracking-tight">4500</span>
                    <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mt-1.5 text-center ${
                      divisorMode === '4500'
                        ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                        : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>AIR MODE</span>
                  </div>

                  <div
                    onClick={() => setDivisorMode('5000')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition duration-150 ${
                      divisorMode === '5000'
                        ? isDark
                          ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                          : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                        : isDark
                          ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                          : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg font-black tracking-tight">5000</span>
                    <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mt-1.5 text-center ${
                      divisorMode === '5000'
                        ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                        : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>AIR CARGO</span>
                  </div>

                  <div
                    onClick={() => setDivisorMode('CUSTOM')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition duration-150 ${
                      divisorMode === 'CUSTOM'
                        ? isDark
                          ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                          : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                        : isDark
                          ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                          : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg font-black tracking-tight uppercase">CUSTOM</span>
                    <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mt-1.5 text-center ${
                      divisorMode === 'CUSTOM'
                        ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                        : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>DIVISOR</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setDivisorMode('4500')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition duration-150 ${
                      divisorMode === '4500'
                        ? isDark
                          ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                          : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                        : isDark
                          ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                          : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg font-black tracking-tight">4500</span>
                    <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mt-1.5 text-center ${
                      divisorMode === '4500'
                        ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                        : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>AIR MODE</span>
                  </div>

                  <div
                    onClick={() => setDivisorMode('5000')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition duration-150 ${
                      divisorMode === '5000'
                        ? isDark
                          ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                          : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                        : isDark
                          ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                          : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg font-black tracking-tight">5000</span>
                    <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mt-1.5 text-center ${
                      divisorMode === '5000'
                        ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                        : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>AIR CARGO</span>
                  </div>

                  <div
                    onClick={() => setDivisorMode('CUSTOM')}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition duration-150 ${
                      divisorMode === 'CUSTOM'
                        ? isDark
                          ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                          : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                        : isDark
                          ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                          : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg font-black tracking-tight uppercase">CUSTOM</span>
                    <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mt-1.5 text-center ${
                      divisorMode === 'CUSTOM'
                        ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                        : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>DIVISOR</span>
                  </div>
                </div>
              )}

              {divisorMode === 'CUSTOM' && (
                <div className="animate-fade-in max-w-sm pt-2">
                  <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Custom Divisor</label>
                  <input
                    type="number"
                    value={customDivisor}
                    onChange={(e) => setCustomDivisor(e.target.value)}
                    placeholder="5000"
                    className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none ${
                      isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32]' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white'
                    }`}
                    required
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || demoState?.demoLimitReached}
              className="w-full bg-[#107c5a] hover:bg-[#0e382c] disabled:bg-slate-300 disabled:text-slate-500 text-white py-4 rounded-xl font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Performing calculations...' : 'Compute Volumetric Weight'}
            </button>
          </form>
        </div>

        {/* Right Column: Result Panel */}
        <div className="space-y-6 lg:sticky lg:top-20">
          <div id="calculator-result-panel" className={`border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px] ${
            isDark ? 'bg-[#14231E] border-[#264E41]' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-5 ${isDark ? 'bg-[#0A261D] text-emerald-300' : 'bg-[#0e382c] text-white'}`}>
              <h3 className="font-extrabold text-xs uppercase tracking-wider">Evaluation Result</h3>
              <p className={`text-[10px] font-light mt-0.5 ${isDark ? 'text-emerald-400/80' : 'text-emerald-100'}`}>SaaS volumetric output statistics</p>
            </div>

            {result ? (
              <div className="p-6 space-y-6 flex-grow flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Shipping Cost readout */}
                  {result.shippingCost !== null && result.shippingCost !== undefined && (
                    <div className={`border p-4 rounded-xl text-center ${
                      isDark ? 'bg-[#103A2D] border-emerald-700/80 text-emerald-300' : 'bg-[#E8F5E9] border-emerald-200 text-[#0F4C3A]'
                    }`}>
                      <span className="block text-[10px] font-bold uppercase">Estimated Shipping Cost</span>
                      <span className="text-3xl font-black mt-1 block">₹{result.shippingCost}</span>
                      {result.rateCardName && (
                        <span className={`text-[9px] font-light mt-1 block ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                          Applied: <strong>{result.rateCardName}</strong> ({result.destination})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Weight readouts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 border rounded-xl ${
                      isDark ? 'bg-[#182B25] border-[#264E41] text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <span className={`block text-[9px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Actual Weight</span>
                      <span className="text-base font-black">{result.actualWeight} KG</span>
                    </div>
                    <div className={`p-3 border rounded-xl ${
                      isDark ? 'bg-[#182B25] border-[#264E41] text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <span className={`block text-[9px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Volumetric Weight</span>
                      <span className="text-base font-black">{result.volumetricWeight} KG</span>
                    </div>
                  </div>

                  {/* Chargeable Weight readout */}
                  <div className={`p-4 border rounded-xl text-center shadow-xs ${
                    isDark 
                      ? 'bg-[#103A2D] border-emerald-600/60 text-white' 
                      : 'bg-[#0F4C3A] border-[#0c3c2e] text-white'
                  }`}>
                    <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-emerald-300' : 'text-emerald-200'}`}>Final Chargeable Weight</span>
                    <span className="text-3xl font-black mt-1 block tracking-tight">{result.chargeableWeight} KG</span>
                    <span className={`text-[9px] font-medium mt-1.5 block ${isDark ? 'text-emerald-200/80' : 'text-emerald-100/90'}`}>
                      Calculated as MAX of actual vs volumetric weight
                    </span>
                  </div>

                  {/* Calculation parameters metadata */}
                  <div className={`space-y-2.5 text-xs border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Logistics Divisor</span>
                      <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{result.divisor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Dimensions Unit</span>
                      <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{result.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Package Count</span>
                      <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{result.packageCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Shipping Mode</span>
                      <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-[#0F4C3A]'}`}>
                        {result.serviceType === 'INTERNATIONAL'
                          ? (result.divisor === 4500 ? 'Air' : result.divisor === 5000 ? 'Air Freight' : 'Custom Mode')
                          : (result.divisor === 4000 ? 'Surface Mode' : result.divisor === 4500 ? 'Air Mode' : result.divisor === 5000 ? 'Air Cargo' : 'Custom Mode')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons: Direct PDF Export, Screenshot, Share */}
                <div className={`grid grid-cols-3 gap-2 border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button
                    type="button"
                    onClick={handleDirectPDFExport}
                    className={`flex items-center justify-center gap-1.5 border py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isDark ? 'border-[#2E5448] bg-[#182B25] text-emerald-300 hover:bg-[#1E362F]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                    PDF Export
                  </button>
                  <button
                    type="button"
                    onClick={() => takeScreenshot('calculator-result-panel', 'geotransit-calculation-result')}
                    className={`flex items-center justify-center gap-1.5 border py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isDark ? 'border-[#2E5448] bg-[#182B25] text-slate-200 hover:bg-[#1E362F]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    Screenshot
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenShareModal}
                    className={`flex items-center justify-center gap-1.5 border py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isDark ? 'border-[#2E5448] bg-[#182B25] text-blue-400 hover:bg-[#1E362F]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                    Share
                  </button>
                </div>
              </div>
            ) : (
              <div className={`p-12 text-center font-medium text-xs flex-grow flex flex-col justify-center items-center gap-3 ${
                isDark ? 'text-slate-400' : 'text-slate-400'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-dashed animate-pulse ${
                  isDark ? 'bg-[#182B25] text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-300 border-slate-200'
                }`}>
                  <Calculator className="w-6 h-6" />
                </div>
                <span className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Ready to Evaluate</span>
                <p className={`text-[11px] leading-normal max-w-[200px] mx-auto font-light ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                  Configure package parameters and click compute to evaluate shipping weights.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>


      {shareModalOpen && sharePdfData && (
        <ShareMenuModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          pdfBlob={sharePdfData.blob}
          pdfFilename={sharePdfData.filename}
          customerName={user?.name || 'Customer'}
          weight={result?.chargeableWeight?.toString() || '0'}
          companyName={defaultTemplate?.companyName || user?.company || user?.name || 'Company'}
          authorizedPerson={user?.name || 'Authorized Signatory'}
          quoteNumber={result?.id ? `CALC-${result.id.substring(0, 8)}` : `CALC-${Date.now()}`}
        />
      )}
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    }>
      <CalculatorContent />
    </Suspense>
  );
}
