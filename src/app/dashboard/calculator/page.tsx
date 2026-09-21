'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
  Package,
  ChevronRight,
  RotateCcw,
  Info,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';

interface CustomDivisorMode {
  id: string;
  name: string;
  divisor: number;
}

interface PackageItem {
  length: string;
  width: string;
  height: string;
  actualWeight: string;
  quantity: string;
  multiplier?: string;
  lengthUnit?: 'MM' | 'CM' | 'Inch' | 'Feet';
  widthUnit?: 'MM' | 'CM' | 'Inch' | 'Feet';
  heightUnit?: 'MM' | 'CM' | 'Inch' | 'Feet';
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
  const [convFrom, setConvFrom] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('CM');
  const [convTo, setConvTo] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('CM');
  const [convValue, setConvValue] = useState('10');
  const [convResult, setConvResult] = useState<number | null>(10);

  // Calculator State
  const [serviceType, setServiceType] = useState<'DOMESTIC' | 'INTERNATIONAL'>('DOMESTIC');
  const [lengthUnit, setLengthUnit] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('CM');
  const [widthUnit, setWidthUnit] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('CM');
  const [heightUnit, setHeightUnit] = useState<'MM' | 'CM' | 'Inch' | 'Feet'>('CM');
  const [divisorMode, setDivisorMode] = useState<string>('4000');
  const [customDivisor, setCustomDivisor] = useState('5000');
  const [multiPackage, setMultiPackage] = useState(true);

  // User-defined Custom Divisor Modes State
  const [divisorTab, setDivisorTab] = useState<'DEFAULT' | 'CUSTOM'>('DEFAULT');
  const [selectedCustomModeId, setSelectedCustomModeId] = useState<string | null>(null);
  const [userModes, setUserModes] = useState<CustomDivisorMode[]>([]);
  const [newModeName, setNewModeName] = useState('');
  const [newModeDivisor, setNewModeDivisor] = useState('');
  const [customModeError, setCustomModeError] = useState('');
  
  // Package Inputs
  const [singlePkg, setSinglePkg] = useState<PackageItem>({
    length: '0',
    width: '0',
    height: '0',
    actualWeight: '',
    quantity: '1',
    lengthUnit: 'CM',
    widthUnit: 'CM',
    heightUnit: 'CM',
  });
  
  const [packages, setPackages] = useState<PackageItem[]>([
    { length: '0', width: '0', height: '0', actualWeight: '', quantity: '1', multiplier: '1', lengthUnit: 'CM', widthUnit: 'CM', heightUnit: 'CM' }
  ]);

  // Package list container & auto-scroll refs
  const packageListContainerRef = useRef<HTMLDivElement>(null);
  const lastAddedPackageRef = useRef<HTMLDivElement>(null);
  const prevPackageCountRef = useRef<number>(packages.length);

  // Auto-scroll newly added package into full view within internal scroll container
  useEffect(() => {
    if (packages.length > prevPackageCountRef.current) {
      requestAnimationFrame(() => {
        if (packageListContainerRef.current && lastAddedPackageRef.current) {
          const container = packageListContainerRef.current;
          const target = lastAddedPackageRef.current;
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();

          const offsetDiff = targetRect.bottom - containerRect.bottom;
          if (offsetDiff > 0) {
            container.scrollBy({
              top: offsetDiff + 20,
              behavior: 'smooth',
            });
          }
        }
      });
    }
    prevPackageCountRef.current = packages.length;
  }, [packages.length]);

  // Results & Sharing State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [demoState, setDemoState] = useState<any>(null);

  // Package Breakdown Collapse State
  const [breakdownExpanded, setBreakdownExpanded] = useState(true);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePdfData, setSharePdfData] = useState<{ blob: Blob | null; filename: string } | null>(null);

  // Load saved custom divisor modes from localStorage
  useEffect(() => {
    try {
      const savedModes = localStorage.getItem('geo_user_divisor_modes');
      if (savedModes) {
        const parsed = JSON.parse(savedModes);
        if (Array.isArray(parsed)) {
          setUserModes(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load custom divisor modes from localStorage', err);
    }
  }, []);

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

  // Active Divisor Value Resolution
  const activeDivisor = useMemo(() => {
    if (divisorMode === '4000') return 4000;
    if (divisorMode === '4500') return 4500;
    if (divisorMode === '5000') return 5000;
    if (divisorMode === 'CUSTOM') return parseFloat(customDivisor) || 5000;
    const userMode = userModes.find(m => m.id === divisorMode);
    if (userMode) return userMode.divisor;
    return 4000;
  }, [divisorMode, customDivisor, userModes]);

  // Dynamic Real-time Package Breakdown Evaluation
  const packageBreakdown = useMemo(() => {
    const currentDivisor = activeDivisor;
    const sourcePackages = multiPackage ? packages : [singlePkg];

    return sourcePackages.map((p, idx) => {
      const len = parseFloat(p.length) || 0;
      const wid = parseFloat(p.width) || 0;
      const hei = parseFloat(p.height) || 0;
      const act = parseFloat(p.actualWeight) || 0;
      const qty = parseInt(p.quantity) || 1;
      const mult = parseInt(p.multiplier || '1') || 1;
      const effectiveQty = Math.max(1, qty) * Math.max(1, mult);

      const pLenUnit = p.lengthUnit || lengthUnit || 'CM';
      const pWidUnit = p.widthUnit || widthUnit || 'CM';
      const pHeiUnit = p.heightUnit || heightUnit || 'CM';

      const lenCm = convertUnits(len, pLenUnit, 'CM');
      const widCm = convertUnits(wid, pWidUnit, 'CM');
      const heiCm = convertUnits(hei, pHeiUnit, 'CM');

      const volumetricWeight = currentDivisor > 0 ? ((lenCm * widCm * heiCm) / currentDivisor) * effectiveQty : 0;
      const actualWeightTotal = act * effectiveQty;
      const chargeableWeight = Math.max(actualWeightTotal, volumetricWeight);

      const isActualHigher = actualWeightTotal > volumetricWeight;
      const isVolumetricHigher = volumetricWeight > actualWeightTotal;
      const isTie = Math.abs(actualWeightTotal - volumetricWeight) < 0.0001;

      return {
        index: idx + 1,
        actualWeight: actualWeightTotal,
        volumetricWeight: volumetricWeight,
        chargeableWeight: chargeableWeight,
        isActualHigher,
        isVolumetricHigher,
        isTie,
      };
    });
  }, [multiPackage, packages, singlePkg, lengthUnit, widthUnit, heightUnit, activeDivisor]);

  // Dynamic Real-time Auto-sums across all packages
  const totalActualWeight = useMemo(() => {
    return packageBreakdown.reduce((sum, item) => sum + item.actualWeight, 0);
  }, [packageBreakdown]);

  const totalVolumetricWeight = useMemo(() => {
    return packageBreakdown.reduce((sum, item) => sum + item.volumetricWeight, 0);
  }, [packageBreakdown]);

  // Final Chargeable Weight = SUM(Package Chargeable Weight for every package)
  // where each Package Chargeable Weight = MAX(Package Actual Weight, Package Volumetric Weight)
  const totalChargeableWeight = useMemo(() => {
    return packageBreakdown.reduce((sum, item) => sum + item.chargeableWeight, 0);
  }, [packageBreakdown]);

  // Active calculation report values that dynamically reflect package-level sum of chargeable weights
  const currentCalculationResult = useMemo(() => {
    if (!result) return null;
    const finalActual = parseFloat(totalActualWeight.toFixed(3));
    const finalVolumetric = parseFloat(totalVolumetricWeight.toFixed(3));
    const finalChargeable = parseFloat(totalChargeableWeight.toFixed(3));
    return {
      ...result,
      actualWeight: finalActual,
      volumetricWeight: finalVolumetric,
      chargeableWeight: finalChargeable,
      packages: packageBreakdown.map((pkg, idx) => {
        const src = multiPackage ? packages[idx] : singlePkg;
        const pLen = parseFloat(src?.length || '0') || 0;
        const pWid = parseFloat(src?.width || '0') || 0;
        const pHei = parseFloat(src?.height || '0') || 0;
        const pQty = parseInt(src?.quantity || '1') || 1;
        const pMult = parseInt(src?.multiplier || '1') || 1;
        const effQty = Math.max(1, pQty) * Math.max(1, pMult);
        return {
          length: pLen,
          width: pWid,
          height: pHei,
          actualWeight: pkg.actualWeight,
          volumetricWeight: parseFloat(pkg.volumetricWeight.toFixed(3)),
          volumetricWeightPerUnit: parseFloat((pkg.volumetricWeight / effQty).toFixed(3)),
          totalChargeableWeight: parseFloat(pkg.chargeableWeight.toFixed(3)),
          quantity: effQty,
        };
      }),
    };
  }, [result, totalActualWeight, totalVolumetricWeight, totalChargeableWeight, packageBreakdown, multiPackage, packages, singlePkg]);

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

  // Reset Unit Converter to default initial state
  const handleResetUnitConverter = () => {
    setConvFrom('CM');
    setConvTo('CM');
    setConvValue('10');
    setConvResult(10);
  };

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

  // Unit change handlers for Length, Width, and Height (Single Package)
  const handleLengthUnitChange = (newUnit: 'MM' | 'CM' | 'Inch' | 'Feet') => {
    const val = parseFloat(singlePkg.length);
    const oldUnit = singlePkg.lengthUnit || lengthUnit || 'CM';
    const converted = !isNaN(val) && val > 0 ? convertUnits(val, oldUnit, newUnit).toString() : singlePkg.length;
    setSinglePkg(prev => ({ ...prev, length: converted, lengthUnit: newUnit }));
    setLengthUnit(newUnit);
  };

  const handleWidthUnitChange = (newUnit: 'MM' | 'CM' | 'Inch' | 'Feet') => {
    const val = parseFloat(singlePkg.width);
    const oldUnit = singlePkg.widthUnit || widthUnit || 'CM';
    const converted = !isNaN(val) && val > 0 ? convertUnits(val, oldUnit, newUnit).toString() : singlePkg.width;
    setSinglePkg(prev => ({ ...prev, width: converted, widthUnit: newUnit }));
    setWidthUnit(newUnit);
  };

  const handleHeightUnitChange = (newUnit: 'MM' | 'CM' | 'Inch' | 'Feet') => {
    const val = parseFloat(singlePkg.height);
    const oldUnit = singlePkg.heightUnit || heightUnit || 'CM';
    const converted = !isNaN(val) && val > 0 ? convertUnits(val, oldUnit, newUnit).toString() : singlePkg.height;
    setSinglePkg(prev => ({ ...prev, height: converted, heightUnit: newUnit }));
    setHeightUnit(newUnit);
  };

  // Individual package dimension unit change handler
  const handlePackageUnitChange = (pkgIdx: number, dim: 'length' | 'width' | 'height', newUnit: 'MM' | 'CM' | 'Inch' | 'Feet') => {
    setPackages(prev => prev.map((p, idx) => {
      if (idx !== pkgIdx) return p;
      const unitKey = `${dim}Unit` as 'lengthUnit' | 'widthUnit' | 'heightUnit';
      const oldUnit = p[unitKey] || 'CM';
      if (oldUnit === newUnit) return p;
      const val = parseFloat(p[dim]);
      const convertedVal = (!isNaN(val) && val > 0)
        ? convertUnits(val, oldUnit, newUnit).toString()
        : p[dim];
      return {
        ...p,
        [dim]: convertedVal,
        [unitKey]: newUnit,
      };
    }));
  };

  const handleApplyUnitToAll = (targetUnit: 'MM' | 'CM' | 'Inch' | 'Feet') => {
    setPackages(prev => prev.map(p => {
      const lenUnit = p.lengthUnit || 'CM';
      const widUnit = p.widthUnit || 'CM';
      const heiUnit = p.heightUnit || 'CM';

      const lenVal = parseFloat(p.length);
      const widVal = parseFloat(p.width);
      const heiVal = parseFloat(p.height);

      return {
        ...p,
        length: !isNaN(lenVal) && lenVal > 0 ? convertUnits(lenVal, lenUnit, targetUnit).toString() : p.length,
        width: !isNaN(widVal) && widVal > 0 ? convertUnits(widVal, widUnit, targetUnit).toString() : p.width,
        height: !isNaN(heiVal) && heiVal > 0 ? convertUnits(heiVal, heiUnit, targetUnit).toString() : p.height,
        lengthUnit: targetUnit,
        widthUnit: targetUnit,
        heightUnit: targetUnit,
      };
    }));

    const singleLenUnit = singlePkg.lengthUnit || 'CM';
    const singleWidUnit = singlePkg.widthUnit || 'CM';
    const singleHeiUnit = singlePkg.heightUnit || 'CM';
    const sLen = parseFloat(singlePkg.length);
    const sWid = parseFloat(singlePkg.width);
    const sHei = parseFloat(singlePkg.height);

    setSinglePkg(prev => ({
      ...prev,
      length: !isNaN(sLen) && sLen > 0 ? convertUnits(sLen, singleLenUnit, targetUnit).toString() : prev.length,
      width: !isNaN(sWid) && sWid > 0 ? convertUnits(sWid, singleWidUnit, targetUnit).toString() : prev.width,
      height: !isNaN(sHei) && sHei > 0 ? convertUnits(sHei, singleHeiUnit, targetUnit).toString() : prev.height,
      lengthUnit: targetUnit,
      widthUnit: targetUnit,
      heightUnit: targetUnit,
    }));

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
          multiplier: '1',
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
    setPackages(prev => [
      ...prev,
      {
        length: '0',
        width: '0',
        height: '0',
        actualWeight: '',
        quantity: '1',
        multiplier: '1',
        lengthUnit: 'CM',
        widthUnit: 'CM',
        heightUnit: 'CM',
      }
    ]);
  }

  function removePackage(index: number) {
    if (packages.length === 1) return;
    setPackages(prev => prev.filter((_, idx) => idx !== index));
  }

  function resetPackage(index: number) {
    setPackages(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          length: '0',
          width: '0',
          height: '0',
          actualWeight: '',
          quantity: '1',
          multiplier: '1',
          lengthUnit: 'CM',
          widthUnit: 'CM',
          heightUnit: 'CM',
        };
      }
      return updated;
    });
  }

  function updatePackageField(index: number, field: keyof PackageItem, value: string) {
    const updated = [...packages];
    (updated[index] as any)[field] = value;
    setPackages(updated);
  }

  const handleSingleDimensionFocus = (field: 'length' | 'width' | 'height') => {
    setSinglePkg(prev => {
      if (prev[field] === '0' || prev[field] === '0.0' || prev[field] === '0.00') {
        return { ...prev, [field]: '' };
      }
      return prev;
    });
  };

  const handlePackageDimensionFocus = (index: number, field: 'length' | 'width' | 'height') => {
    setPackages(prev => {
      const val = prev[index]?.[field];
      if (val === '0' || val === '0.0' || val === '0.00') {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: '' };
        return updated;
      }
      return prev;
    });
  };

  // Reset Package Entries Handler
  const handleResetPackages = () => {
    setSinglePkg({
      length: '0',
      width: '0',
      height: '0',
      actualWeight: '',
      quantity: '1',
      lengthUnit: 'CM',
      widthUnit: 'CM',
      heightUnit: 'CM',
    });
    setPackages([
      {
        length: '0',
        width: '0',
        height: '0',
        actualWeight: '',
        quantity: '1',
        multiplier: '1',
        lengthUnit: 'CM',
        widthUnit: 'CM',
        heightUnit: 'CM',
      }
    ]);
    setLengthUnit('CM');
    setWidthUnit('CM');
    setHeightUnit('CM');
    setDivisorTab('DEFAULT');
    setDivisorMode(serviceType === 'INTERNATIONAL' ? '4500' : '4000');
    setResult(null);
    setError('');
  };

  // Add Custom Divisor Mode Handler
  const handleAddCustomMode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCustomModeError('');
    const trimmedName = newModeName.trim();
    const parsedVal = parseFloat(newModeDivisor);

    if (!trimmedName) {
      setCustomModeError('Mode Name cannot be empty.');
      return;
    }
    if (isNaN(parsedVal) || parsedVal <= 0) {
      setCustomModeError('Please enter a valid divisor value greater than zero.');
      return;
    }

    const nameExists = userModes.some(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    if (nameExists) {
      setCustomModeError(`A custom mode named "${trimmedName}" already exists.`);
      return;
    }

    const predefinedNames = ['surface mode', 'air mode', 'air cargo', 'custom divisor'];
    if (predefinedNames.includes(trimmedName.toLowerCase())) {
      setCustomModeError(`"${trimmedName}" is a reserved system mode name.`);
      return;
    }

    const newMode: CustomDivisorMode = {
      id: `custom-mode-${Date.now()}`,
      name: trimmedName,
      divisor: parsedVal,
    };

    const updated = [...userModes, newMode];
    setUserModes(updated);
    try {
      localStorage.setItem('geo_user_divisor_modes', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save custom divisor modes to localStorage', err);
    }

    // Auto-select newly created mode
    setDivisorMode(newMode.id);
    setSelectedCustomModeId(newMode.id);
    setNewModeName('');
    setNewModeDivisor('');
  };

  // Remove User-Defined Mode Handler
  const handleDeleteUserMode = (modeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = userModes.filter(m => m.id !== modeId);
    setUserModes(updated);
    try {
      localStorage.setItem('geo_user_divisor_modes', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save updated divisor modes', err);
    }
    if (divisorMode === modeId) {
      if (updated.length > 0) {
        setDivisorMode(updated[0].id);
        setSelectedCustomModeId(updated[0].id);
      } else {
        setSelectedCustomModeId(null);
        setDivisorMode(serviceType === 'INTERNATIONAL' ? '4500' : '4000');
      }
    }
  };

  // Service Type switch handler
  const handleServiceTypeChange = (type: 'DOMESTIC' | 'INTERNATIONAL') => {
    setServiceType(type);
    if (type === 'INTERNATIONAL') {
      setDivisorMode('4500');
    } else {
      setDivisorMode('4000');
    }
  };

  // Package Data-Entry Keyboard Navigation Helper
  const focusField = (id: string) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLButtonElement | null;
    if (el) {
      el.focus();
      if ('select' in el && typeof el.select === 'function') {
        el.select();
      }
    }
  };

  // Multiple Packages Data-Entry TAB Sequence: Multiplier -> Actual Weight -> Length -> Width -> Height -> Qty -> Next Package
  const handlePackageKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    pkgIndex: number,
    field: 'multiplier' | 'actualWeight' | 'length' | 'width' | 'height' | 'quantity'
  ) => {
    if (e.key === 'Tab') {
      if (!e.shiftKey) {
        // Forward TAB navigation
        e.preventDefault();
        switch (field) {
          case 'multiplier':
            focusField(`pkg-${pkgIndex}-actualWeight`);
            break;
          case 'actualWeight':
            focusField(`pkg-${pkgIndex}-length`);
            break;
          case 'length':
            focusField(`pkg-${pkgIndex}-width`);
            break;
          case 'width':
            focusField(`pkg-${pkgIndex}-height`);
            break;
          case 'height':
            focusField(`pkg-${pkgIndex}-quantity`);
            break;
          case 'quantity':
            if (pkgIndex + 1 < packages.length) {
              focusField(`pkg-${pkgIndex + 1}-multiplier`);
            } else {
              focusField('bottom-add-package-btn');
            }
            break;
        }
      } else {
        // Reverse TAB navigation (Shift + Tab)
        switch (field) {
          case 'quantity':
            e.preventDefault();
            focusField(`pkg-${pkgIndex}-height`);
            break;
          case 'height':
            e.preventDefault();
            focusField(`pkg-${pkgIndex}-width`);
            break;
          case 'width':
            e.preventDefault();
            focusField(`pkg-${pkgIndex}-length`);
            break;
          case 'length':
            e.preventDefault();
            focusField(`pkg-${pkgIndex}-actualWeight`);
            break;
          case 'actualWeight':
            e.preventDefault();
            focusField(`pkg-${pkgIndex}-multiplier`);
            break;
          case 'multiplier':
            if (pkgIndex > 0) {
              e.preventDefault();
              focusField(`pkg-${pkgIndex - 1}-quantity`);
            }
            // If pkgIndex === 0, allow natural browser shift+tab to exit packages section upwards
            break;
        }
      }
    } else if (e.key === 'ArrowDown') {
      // Allow keyboard user to dive down into the unit selector for Length, Width, or Height
      if (field === 'length' || field === 'width' || field === 'height') {
        const selectedRadio = document.querySelector<HTMLInputElement>(
          `input[name="pkg-${pkgIndex}-${field}Unit"]:checked`
        ) || document.querySelector<HTMLInputElement>(
          `input[name="pkg-${pkgIndex}-${field}Unit"]`
        );
        if (selectedRadio) {
          e.preventDefault();
          selectedRadio.focus();
        }
      }
    }
  };

  // Keyboard navigation when focused on a package unit selector radio button
  const handleUnitRadioKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    pkgIndex: number,
    dimension: 'length' | 'width' | 'height'
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!e.shiftKey) {
        // Forward Tab from unit radio proceeds immediately to the next dimension input
        if (dimension === 'length') focusField(`pkg-${pkgIndex}-width`);
        else if (dimension === 'width') focusField(`pkg-${pkgIndex}-height`);
        else if (dimension === 'height') focusField(`pkg-${pkgIndex}-quantity`);
      } else {
        // Shift+Tab returns focus to its parent dimension input
        focusField(`pkg-${pkgIndex}-${dimension}`);
      }
    } else if (e.key === 'Escape' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusField(`pkg-${pkgIndex}-${dimension}`);
    }
  };

  // Single Package Data-Entry TAB Sequence: Actual Weight -> Length -> Width -> Height -> Compute
  const handleSinglePackageKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'actualWeight' | 'length' | 'width' | 'height'
  ) => {
    if (e.key === 'Tab') {
      if (!e.shiftKey) {
        e.preventDefault();
        switch (field) {
          case 'actualWeight':
            focusField('single-length');
            break;
          case 'length':
            focusField('single-width');
            break;
          case 'width':
            focusField('single-height');
            break;
          case 'height':
            focusField('compute-volumetric-weight-btn');
            break;
        }
      } else {
        switch (field) {
          case 'height':
            e.preventDefault();
            focusField('single-width');
            break;
          case 'width':
            e.preventDefault();
            focusField('single-length');
            break;
          case 'length':
            e.preventDefault();
            focusField('single-actualWeight');
            break;
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (field === 'length' || field === 'width' || field === 'height') {
        const selectedRadio = document.querySelector<HTMLInputElement>(
          `input[name="single${field.charAt(0).toUpperCase() + field.slice(1)}Unit"]:checked`
        );
        if (selectedRadio) {
          e.preventDefault();
          selectedRadio.focus();
        }
      }
    }
  };

  const handleSingleUnitRadioKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    dimension: 'length' | 'width' | 'height'
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!e.shiftKey) {
        if (dimension === 'length') focusField('single-width');
        else if (dimension === 'width') focusField('single-height');
        else if (dimension === 'height') focusField('compute-volumetric-weight-btn');
      } else {
        focusField(`single-${dimension}`);
      }
    } else if (e.key === 'Escape' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusField(`single-${dimension}`);
    }
  };

  // Direct PDF Export (Immediate generation with company profile branding, NO intermediate configuration forms)
  const handleDirectPDFExport = async () => {
    const activeRes = currentCalculationResult || result;
    if (!activeRes) return;
    await exportWeightCalculationPDF(activeRes, user, defaultTemplate);
  };

  // Share action (Generates customer branded PDF and opens Share menu)
  const handleOpenShareModal = async () => {
    const activeRes = currentCalculationResult || result;
    if (!activeRes) return;
    const res = await exportWeightCalculationPDF(activeRes, user, defaultTemplate);
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

    const parsedDivisor = activeDivisor;

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
        const qty = parseInt(p.quantity) || 1;
        const mult = parseInt(p.multiplier || '1') || 1;
        const effectiveQty = Math.max(1, qty) * Math.max(1, mult);

        if (isNaN(len) || len < 0 || isNaN(wid) || wid < 0 || isNaN(hei) || hei < 0) {
          setError(`Package #${i + 1} has invalid or negative dimensions.`);
          return;
        }
        if (isNaN(act) || act < 0) {
          setError(`Package #${i + 1} has invalid or negative weight.`);
          return;
        }
        if (len === 0 && wid === 0 && hei === 0 && act === 0) {
          setError(`Package #${i + 1} must have either positive weight or positive dimensions.`);
          return;
        }

        const pLenUnit = p.lengthUnit || 'CM';
        const pWidUnit = p.widthUnit || 'CM';
        const pHeiUnit = p.heightUnit || 'CM';

        const lenCm = convertUnits(len, pLenUnit, 'CM');
        const widCm = convertUnits(wid, pWidUnit, 'CM');
        const heiCm = convertUnits(hei, pHeiUnit, 'CM');

        finalPackages.push({
          length: lenCm,
          width: widCm,
          height: heiCm,
          actualWeight: act,
          quantity: effectiveQty,
        });
      }
    } else {
      const len = parseFloat(singlePkg.length);
      const wid = parseFloat(singlePkg.width);
      const hei = parseFloat(singlePkg.height);
      const act = parseFloat(singlePkg.actualWeight);
      const qty = parseInt(singlePkg.quantity);

      if (isNaN(len) || len < 0 || isNaN(wid) || wid < 0 || isNaN(hei) || hei < 0) {
        setError('Please enter valid non-negative dimensions (Length, Width, Height).');
        return;
      }
      if (isNaN(act) || act < 0) {
        setError('Actual weight must be a non-negative number.');
        return;
      }
      if (len === 0 && wid === 0 && hei === 0 && act === 0) {
        setError('Please enter either positive weight or positive dimensions.');
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
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Volumetric cargo evaluation workspace</p>
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
            {/* Header with Title and Collapse Button */}
            <div
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 border-b text-left ${
                isDark ? 'bg-[#182B25] border-[#264E41]' : 'bg-[#F8FAFC] border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setConverterExpanded(!converterExpanded)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition"
              >
                <span className={`font-extrabold text-xs uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Unit Converter
                </span>
              </button>

              <button
                type="button"
                onClick={() => setConverterExpanded(!converterExpanded)}
                className={`cursor-pointer p-1 rounded transition hover:opacity-75 ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
                }`}
                aria-label={converterExpanded ? 'Collapse Unit Converter' : 'Expand Unit Converter'}
              >
                {converterExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {converterExpanded && (
              <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
                {/* Top-Right Action Row: Reset Button */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    id="unit-converter-reset-btn"
                    onClick={handleResetUnitConverter}
                    title="Reset unit converter"
                    aria-label="Reset unit converter"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
                      isDark
                        ? 'bg-[#182B25] border-[#264E41] text-red-400 hover:bg-red-950/40 hover:border-red-700/60 active:scale-[0.98]'
                        : 'bg-white border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-[0.98]'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
                  {/* Left Column: Convert From (Input Side) */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Convert From</label>
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
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Value</label>
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
                    </div>

                    {/* Input Unit Selector Radio Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" role="radiogroup" aria-label="Convert From Unit Selection">
                      {[
                        { id: 'MM' as const, label: 'MM' },
                        { id: 'CM' as const, label: 'CM' },
                        { id: 'Inch' as const, label: 'IN' },
                        { id: 'Feet' as const, label: 'FT' },
                      ].map((u) => {
                        const isSelected = convFrom === u.id;
                        return (
                          <label
                            key={u.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConvFrom(u.id);
                            }}
                            className={`cursor-pointer select-none py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-lg border text-xs flex items-center gap-1.5 sm:gap-2 transition-all ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#103A2D] border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-xs font-semibold'
                                  : 'bg-[#E8F5E9] border-[#1E8262] text-[#0F4C3A] ring-1 ring-[#1E8262]/30 shadow-xs font-semibold'
                                : isDark
                                  ? 'bg-[#14231E] border-[#2E5448] text-slate-300 hover:bg-[#1C322B] hover:border-slate-500'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="unitConverterFromRadio"
                              value={u.id}
                              checked={isSelected}
                              onChange={() => setConvFrom(u.id)}
                              className="sr-only"
                            />
                            <span
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                              ? isDark
                                ? 'border-emerald-400 bg-[#103A2D]'
                                : 'border-[#1E8262] bg-[#E8F5E9]'
                              : isDark
                                ? 'border-slate-500 bg-[#14231E]'
                                : 'border-slate-300 bg-white'
                              }`}
                              aria-hidden="true"
                            >
                              {isSelected && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isDark ? 'bg-emerald-400' : 'bg-[#0F4C3A]'
                                  }`}
                                />
                              )}
                            </span>
                            <span className="font-bold tracking-tight text-[11px] sm:text-xs">{u.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Convert To (Output Side) */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Convert To</label>
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
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Conversion Result</label>
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

                    {/* Output Unit Selector Radio Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" role="radiogroup" aria-label="Convert To Unit Selection">
                      {[
                        { id: 'MM' as const, label: 'MM' },
                        { id: 'CM' as const, label: 'CM' },
                        { id: 'Inch' as const, label: 'IN' },
                        { id: 'Feet' as const, label: 'FT' },
                      ].map((u) => {
                        const isSelected = convTo === u.id;
                        return (
                          <label
                            key={u.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConvTo(u.id);
                            }}
                            className={`cursor-pointer select-none py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-lg border text-xs flex items-center gap-1.5 sm:gap-2 transition-all ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#103A2D] border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-xs font-semibold'
                                  : 'bg-[#E8F5E9] border-[#1E8262] text-[#0F4C3A] ring-1 ring-[#1E8262]/30 shadow-xs font-semibold'
                                : isDark
                                  ? 'bg-[#14231E] border-[#2E5448] text-slate-300 hover:bg-[#1C322B] hover:border-slate-500'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="unitConverterToRadio"
                              value={u.id}
                              checked={isSelected}
                              onChange={() => setConvTo(u.id)}
                              className="sr-only"
                            />
                            <span
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                              ? isDark
                                ? 'border-emerald-400 bg-[#103A2D]'
                                : 'border-[#1E8262] bg-[#E8F5E9]'
                              : isDark
                                ? 'border-slate-500 bg-[#14231E]'
                                : 'border-slate-300 bg-white'
                              }`}
                              aria-hidden="true"
                            >
                              {isSelected && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isDark ? 'bg-emerald-400' : 'bg-[#0F4C3A]'
                                  }`}
                                />
                              )}
                            </span>
                            <span className="font-bold tracking-tight text-[11px] sm:text-xs">{u.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Apply Buttons */}
                <div className={`border-t pt-3.5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
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

            {/* Package Dimensions Card with integrated MULTIPLE PACKAGES toggle & Radio-based APPLY TO ALL */}
            <div className={`border p-5 rounded-2xl shadow-sm space-y-4 ${
              isDark ? 'bg-[#14231E] border-[#264E41]' : 'bg-white border-slate-200'
            }`}>
              {/* Header Row: PACKAGE DIMENSIONS (Left) + DIVISOR (Right) on the same line */}
              <div className={`flex flex-col xl:flex-row xl:items-start gap-3.5 xl:gap-4 border-b pb-4 w-full ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                {/* LEFT SIDE: Package Dimensions Title & Subtitle with Icon (Compact to maximize space for Divisor) */}
                <div className="flex items-center gap-2.5 pr-3 xl:pr-3.5 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 shrink-0 pb-3 xl:pb-0">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${
                    isDark ? 'bg-[#103A2D] text-emerald-300 border border-emerald-500/40' : 'bg-[#0e2c22] text-white'
                  }`}>
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="shrink-0">
                    <h2 className={`text-xs sm:text-sm font-black tracking-tight uppercase ${
                      isDark ? 'text-white' : 'text-[#0e2c22]'
                    }`}>
                      Package Dimensions
                    </h2>
                    <p className={`text-[10px] sm:text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                      Enter the details of your package(s)
                    </p>
                  </div>
                </div>

                {/* RIGHT SIDE: Divisor Section (Expands to utilize available horizontal space) */}
                <div className="flex-1 min-w-0 w-full space-y-3">
                  {/* Divisor Section Header */}
                  <div className="flex items-center gap-2">
                    <Calculator className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-400' : 'text-blue-600'}`} />
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      DIVISOR
                    </span>
                    <span
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help"
                      title="Volumetric weight divisor: (L × W × H) ÷ Divisor"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </span>
                    <span className={`text-[10px] sm:text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} ml-1 hidden sm:inline`}>
                      Select from existing modes or add a custom mode
                    </span>
                  </div>

                  {/* Mode Selection UI: GO WITH EXISTING (DEFAULT) vs ADD CUSTOM MODE */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Option 1: GO WITH EXISTING (DEFAULT) */}
                    <button
                      type="button"
                      onClick={() => {
                        setDivisorTab('DEFAULT');
                        if (userModes.some(m => m.id === divisorMode)) {
                          setDivisorMode(serviceType === 'INTERNATIONAL' ? '4500' : '4000');
                        }
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider transition cursor-pointer shadow-2xs border ${
                        divisorTab === 'DEFAULT'
                          ? isDark
                            ? 'bg-[#103A2D] text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/30'
                            : 'bg-[#E8F5E9] text-[#0F4C3A] border-[#1E8262]/40 ring-1 ring-[#1E8262]/20'
                          : isDark
                            ? 'bg-[#182B25] text-slate-400 border-[#264E41] hover:text-slate-200 hover:bg-[#1E362E]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        divisorTab === 'DEFAULT'
                          ? isDark ? 'border-emerald-400 bg-emerald-400/20' : 'border-[#0F4C3A] bg-emerald-100'
                          : isDark ? 'border-slate-500' : 'border-slate-300'
                      }`}>
                        {divisorTab === 'DEFAULT' && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-[#0F4C3A]'}`} />
                        )}
                      </span>
                      <span>GO WITH EXISTING (DEFAULT)</span>
                    </button>

                    {/* Option 2: ADD CUSTOM MODE */}
                    <button
                      type="button"
                      onClick={() => {
                        setDivisorTab('CUSTOM');
                        if (userModes.length > 0 && !userModes.some(m => m.id === divisorMode)) {
                          const targetId = (selectedCustomModeId && userModes.some(m => m.id === selectedCustomModeId))
                            ? selectedCustomModeId
                            : userModes[0].id;
                          setDivisorMode(targetId);
                          setSelectedCustomModeId(targetId);
                        }
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider transition cursor-pointer shadow-2xs border ${
                        divisorTab === 'CUSTOM'
                          ? isDark
                            ? 'bg-[#132838] text-blue-300 border-blue-500/50 ring-1 ring-blue-500/30'
                            : 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/30'
                          : isDark
                            ? 'bg-[#182B25] text-slate-400 border-[#264E41] hover:text-slate-200 hover:bg-[#1E362E]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        divisorTab === 'CUSTOM'
                          ? isDark ? 'border-blue-400 bg-blue-400/20' : 'border-blue-700 bg-blue-100'
                          : isDark ? 'border-slate-500' : 'border-slate-300'
                      }`}>
                        {divisorTab === 'CUSTOM' && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-700'}`} />
                        )}
                      </span>
                      <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>ADD CUSTOM MODE</span>
                    </button>
                  </div>

                  {/* VIEW 1: WHEN "GO WITH EXISTING (DEFAULT)" IS SELECTED */}
                  {divisorTab === 'DEFAULT' && (
                    <div className="w-full space-y-2.5 animate-fade-in">
                      {serviceType === 'DOMESTIC' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 w-full">
                          {/* 4000 SURFACE MODE */}
                          <div
                            onClick={() => setDivisorMode('4000')}
                            className={`p-2.5 sm:p-3 md:p-3.5 border rounded-xl cursor-pointer transition flex flex-col items-center justify-between text-center w-full min-w-0 box-border ${
                              divisorMode === '4000'
                                ? isDark
                                  ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                                  : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                                : isDark
                                  ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                                  : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className="text-base sm:text-lg font-black tracking-tight leading-none">4000</span>
                            <div className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight mt-1 text-center w-full leading-tight flex flex-col items-center justify-center ${
                              divisorMode === '4000'
                                ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                                : isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              <span>SURFACE</span>
                              <span>MODE</span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-center shrink-0">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                divisorMode === '4000'
                                  ? isDark ? 'border-emerald-400 bg-[#103A2D]' : 'border-[#107c5a] bg-[#f0f7f4]'
                                  : isDark ? 'border-slate-500' : 'border-slate-300'
                              }`}>
                                {divisorMode === '4000' && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    isDark ? 'bg-emerald-400' : 'bg-[#107c5a]'
                                  }`} />
                                )}
                              </span>
                            </div>
                          </div>

                          {/* 4500 AIR MODE */}
                          <div
                            onClick={() => setDivisorMode('4500')}
                            className={`p-2.5 sm:p-3 md:p-3.5 border rounded-xl cursor-pointer transition flex flex-col items-center justify-between text-center w-full min-w-0 box-border ${
                              divisorMode === '4500'
                                ? isDark
                                  ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                                  : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                                : isDark
                                  ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                                  : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className="text-base sm:text-lg font-black tracking-tight leading-none">4500</span>
                            <div className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight mt-1 text-center w-full leading-tight flex flex-col items-center justify-center ${
                              divisorMode === '4500'
                                ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                                : isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              <span>AIR</span>
                              <span>MODE</span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-center shrink-0">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                divisorMode === '4500'
                                  ? isDark ? 'border-emerald-400 bg-[#103A2D]' : 'border-[#107c5a] bg-[#f0f7f4]'
                                  : isDark ? 'border-slate-500' : 'border-slate-300'
                              }`}>
                                {divisorMode === '4500' && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    isDark ? 'bg-emerald-400' : 'bg-[#107c5a]'
                                  }`} />
                                )}
                              </span>
                            </div>
                          </div>

                          {/* 5000 AIR CARGO */}
                          <div
                            onClick={() => setDivisorMode('5000')}
                            className={`p-2.5 sm:p-3 md:p-3.5 border rounded-xl cursor-pointer transition flex flex-col items-center justify-between text-center w-full min-w-0 box-border ${
                              divisorMode === '5000'
                                ? isDark
                                  ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                                  : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                                : isDark
                                  ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                                  : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className="text-base sm:text-lg font-black tracking-tight leading-none">5000</span>
                            <div className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight mt-1 text-center w-full leading-tight flex flex-col items-center justify-center ${
                              divisorMode === '5000'
                                ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                                : isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              <span>AIR</span>
                              <span>CARGO</span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-center shrink-0">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                divisorMode === '5000'
                                  ? isDark ? 'border-emerald-400 bg-[#103A2D]' : 'border-[#107c5a] bg-[#f0f7f4]'
                                  : isDark ? 'border-slate-500' : 'border-slate-300'
                              }`}>
                                {divisorMode === '5000' && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    isDark ? 'bg-emerald-400' : 'bg-[#107c5a]'
                                  }`} />
                                )}
                              </span>
                            </div>
                          </div>

                          {/* CUSTOM DIVISOR */}
                          <div
                            onClick={() => setDivisorMode('CUSTOM')}
                            className={`p-2.5 sm:p-3 md:p-3.5 border rounded-xl cursor-pointer transition flex flex-col items-center justify-between text-center w-full min-w-0 box-border ${
                              divisorMode === 'CUSTOM'
                                ? isDark
                                  ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                                  : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                                : isDark
                                  ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                                  : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className="text-base sm:text-lg font-black tracking-tight uppercase leading-none">CUSTOM</span>
                            <div className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight mt-1 text-center w-full leading-tight flex flex-col items-center justify-center ${
                              divisorMode === 'CUSTOM'
                                ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                                : isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              <span>DIVISOR</span>
                              <span className="opacity-0 select-none text-[8px] leading-none hidden sm:inline">&nbsp;</span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-center shrink-0">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                divisorMode === 'CUSTOM'
                                  ? isDark ? 'border-emerald-400 bg-[#103A2D]' : 'border-[#107c5a] bg-[#f0f7f4]'
                                  : isDark ? 'border-slate-500' : 'border-slate-300'
                              }`}>
                                {divisorMode === 'CUSTOM' && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    isDark ? 'bg-emerald-400' : 'bg-[#107c5a]'
                                  }`} />
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4 w-full">
                          {/* 4500 AIR MODE */}
                          <div
                            onClick={() => setDivisorMode('4500')}
                            className={`p-2.5 sm:p-3 md:p-3.5 border rounded-xl cursor-pointer transition flex flex-col items-center justify-between text-center w-full min-w-0 box-border ${
                              divisorMode === '4500'
                                ? isDark
                                  ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                                  : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                                : isDark
                                  ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                                  : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className="text-base sm:text-lg font-black tracking-tight leading-none">4500</span>
                            <div className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight mt-1 text-center w-full leading-tight flex flex-col items-center justify-center ${
                              divisorMode === '4500'
                                ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                                : isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              <span>AIR</span>
                              <span>MODE</span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-center shrink-0">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                divisorMode === '4500'
                                  ? isDark ? 'border-emerald-400 bg-[#103A2D]' : 'border-[#107c5a] bg-[#f0f7f4]'
                                  : isDark ? 'border-slate-500' : 'border-slate-300'
                              }`}>
                                {divisorMode === '4500' && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    isDark ? 'bg-emerald-400' : 'bg-[#107c5a]'
                                  }`} />
                                )}
                              </span>
                            </div>
                          </div>

                          {/* 5000 AIR CARGO */}
                          <div
                            onClick={() => setDivisorMode('5000')}
                            className={`p-2.5 sm:p-3 md:p-3.5 border rounded-xl cursor-pointer transition flex flex-col items-center justify-between text-center w-full min-w-0 box-border ${
                              divisorMode === '5000'
                                ? isDark
                                  ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                                  : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                                : isDark
                                  ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                                  : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className="text-base sm:text-lg font-black tracking-tight leading-none">5000</span>
                            <div className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight mt-1 text-center w-full leading-tight flex flex-col items-center justify-center ${
                              divisorMode === '5000'
                                ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                                : isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              <span>AIR</span>
                              <span>CARGO</span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-center shrink-0">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                divisorMode === '5000'
                                  ? isDark ? 'border-emerald-400 bg-[#103A2D]' : 'border-[#107c5a] bg-[#f0f7f4]'
                                  : isDark ? 'border-slate-500' : 'border-slate-300'
                              }`}>
                                {divisorMode === '5000' && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    isDark ? 'bg-emerald-400' : 'bg-[#107c5a]'
                                  }`} />
                                )}
                              </span>
                            </div>
                          </div>

                          {/* CUSTOM DIVISOR */}
                          <div
                            onClick={() => setDivisorMode('CUSTOM')}
                            className={`p-2.5 sm:p-3 md:p-3.5 border rounded-xl cursor-pointer transition flex flex-col items-center justify-between text-center w-full min-w-0 box-border ${
                              divisorMode === 'CUSTOM'
                                ? isDark
                                  ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                                  : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                                : isDark
                                  ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                                  : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className="text-base sm:text-lg font-black tracking-tight uppercase leading-none">CUSTOM</span>
                            <div className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight mt-1 text-center w-full leading-tight flex flex-col items-center justify-center ${
                              divisorMode === 'CUSTOM'
                                ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                                : isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              <span>DIVISOR</span>
                              <span className="opacity-0 select-none text-[8px] leading-none hidden sm:inline">&nbsp;</span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-center shrink-0">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                divisorMode === 'CUSTOM'
                                  ? isDark ? 'border-emerald-400 bg-[#103A2D]' : 'border-[#107c5a] bg-[#f0f7f4]'
                                  : isDark ? 'border-slate-500' : 'border-slate-300'
                              }`}>
                                {divisorMode === 'CUSTOM' && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    isDark ? 'bg-emerald-400' : 'bg-[#107c5a]'
                                  }`} />
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Custom Divisor Input if CUSTOM is active in Default view */}
                      {divisorMode === 'CUSTOM' && (
                        <div className="animate-fade-in max-w-xs mt-2.5">
                          <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Custom Divisor
                          </label>
                          <input
                            type="number"
                            value={customDivisor}
                            onChange={(e) => setCustomDivisor(e.target.value)}
                            placeholder="5000"
                            className={`w-full border rounded-lg p-2 text-xs focus:outline-none ${
                              isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32]' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white'
                            }`}
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* VIEW 2: WHEN "ADD CUSTOM MODE" IS SELECTED */}
                  {divisorTab === 'CUSTOM' && (
                    <div className="w-full space-y-3.5 animate-fade-in">
                      {/* Add Custom Mode Input Form */}
                      <div className={`p-3.5 sm:p-4 rounded-xl border ${
                        isDark ? 'bg-[#182B25]/60 border-[#264E41]' : 'bg-slate-50/80 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs mb-2.5">
                          <PlusCircle className="w-4 h-4 shrink-0" />
                          <span>ADD CUSTOM MODE</span>
                        </div>

                        <div
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddCustomMode();
                            }
                          }}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                        >
                          <div className="sm:col-span-6 md:col-span-5">
                            <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              Mode Name
                            </label>
                            <input
                              type="text"
                              value={newModeName}
                              onChange={(e) => {
                                setNewModeName(e.target.value);
                                if (customModeError) setCustomModeError('');
                              }}
                              placeholder="Enter mode name (e.g. Express Cargo)"
                              className={`w-full border rounded-lg text-xs px-3 py-2 focus:outline-none transition ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-slate-800 focus:border-[#107c5a]'
                              }`}
                            />
                          </div>

                          <div className="sm:col-span-4 md:col-span-4">
                            <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              Divisor Value
                            </label>
                            <input
                              type="number"
                              value={newModeDivisor}
                              onChange={(e) => {
                                setNewModeDivisor(e.target.value);
                                if (customModeError) setCustomModeError('');
                              }}
                              placeholder="Enter divisor value (e.g. 5500)"
                              className={`w-full border rounded-lg text-xs px-3 py-2 focus:outline-none transition ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-slate-800 focus:border-[#107c5a]'
                              }`}
                            />
                          </div>

                          <div className="sm:col-span-2 md:col-span-3">
                            <button
                              type="button"
                              onClick={() => handleAddCustomMode()}
                              className="w-full py-2 px-3 rounded-lg bg-[#107c5a] hover:bg-[#0e382c] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>

                        {customModeError && (
                          <p className="text-[11px] text-red-500 font-semibold mt-2">{customModeError}</p>
                        )}
                      </div>

                      {/* Custom Modes List */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                            isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}>
                            CUSTOM MODES {userModes.length > 0 && `(${userModes.length})`}
                          </span>
                          {userModes.length > 0 && (
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Click a mode to select it as the active divisor
                            </span>
                          )}
                        </div>

                        {userModes.length === 0 ? (
                          <div className={`p-4 rounded-xl border border-dashed text-center text-xs ${
                            isDark ? 'border-slate-800 text-slate-400 bg-[#13241F]/40' : 'border-slate-200 text-slate-500 bg-slate-50/50'
                          }`}>
                            No custom modes added yet. Use the form above to add a custom mode (e.g. Express Cargo — 5500).
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
                            {userModes.map((mode) => {
                              const isSelected = divisorMode === mode.id;
                              return (
                                <div
                                  key={mode.id}
                                  onClick={() => {
                                    setDivisorMode(mode.id);
                                    setSelectedCustomModeId(mode.id);
                                  }}
                                  className={`relative p-2.5 sm:p-3 border rounded-xl cursor-pointer transition flex flex-col items-center justify-between text-center min-w-0 box-border ${
                                    isSelected
                                      ? isDark
                                        ? 'border-2 border-emerald-400 bg-[#103A2D] text-emerald-300 shadow-xs font-bold'
                                        : 'border-2 border-[#107c5a] bg-[#f0f7f4] text-[#0e382c] shadow-xs font-bold'
                                      : isDark
                                        ? 'border-[#264E41] bg-[#182B25] text-slate-400 hover:bg-[#1F362E]'
                                        : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50/50'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteUserMode(mode.id, e)}
                                    title={`Remove ${mode.name}`}
                                    aria-label={`Remove ${mode.name}`}
                                    className="absolute -top-1.5 -right-1.5 bg-white dark:bg-[#1A2E27] border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 rounded-full p-1 transition shadow-xs cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  <span className="text-sm sm:text-base font-black tracking-tight leading-none">{mode.divisor}</span>
                                  <div className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight mt-1 text-center w-full leading-tight truncate px-1 ${
                                    isSelected
                                      ? isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'
                                      : isDark ? 'text-slate-300' : 'text-slate-700'
                                  }`}>
                                    {mode.name}
                                  </div>
                                  <div className="mt-2 flex items-center justify-center shrink-0">
                                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                      isSelected
                                        ? isDark ? 'border-emerald-400 bg-[#103A2D]' : 'border-[#107c5a] bg-[#f0f7f4]'
                                        : isDark ? 'border-slate-500' : 'border-slate-300'
                                    }`}>
                                      {isSelected && (
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                          isDark ? 'bg-emerald-400' : 'bg-[#107c5a]'
                                        }`} />
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Radio-based Apply to All & Reset Button */}
              <div className={`flex items-center justify-between gap-3.5 pt-1 border-b pb-3.5 flex-wrap ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-3.5 flex-wrap">
                  <div className={`px-2.5 py-1 rounded-md border font-extrabold text-xs uppercase tracking-wider shadow-2xs ${
                    isDark 
                      ? 'bg-[#182B25] border-[#264E41] text-emerald-300' 
                      : 'bg-emerald-50/80 border-emerald-200/80 text-[#0F4C3A]'
                  }`}>
                    APPLY TO ALL:
                  </div>
                  <div className="flex items-center gap-3.5">
                    {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                      const isAllMatch = multiPackage
                        ? packages.length > 0 && packages.every(p =>
                            (p.lengthUnit || 'CM') === u &&
                            (p.widthUnit || 'CM') === u &&
                            (p.heightUnit || 'CM') === u
                          )
                        : (singlePkg.lengthUnit || lengthUnit) === u &&
                          (singlePkg.widthUnit || widthUnit) === u &&
                          (singlePkg.heightUnit || heightUnit) === u;
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

                {/* Top-Right Action Buttons: [ ↻ Reset ] [ + Add Package ] */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="package-dimensions-reset-btn"
                    onClick={handleResetPackages}
                    title="Reset all package entries"
                    aria-label="Reset all package entries"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
                      isDark
                        ? 'bg-[#182B25] border-[#264E41] text-red-400 hover:bg-red-950/40 hover:border-red-700/60 active:scale-[0.98]'
                        : 'bg-white border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-[0.98]'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>

                  <button
                    type="button"
                    id="top-add-package-btn"
                    onClick={() => {
                      if (!multiPackage) {
                        handleToggleMultiPackage(true);
                        setPackages(prev => {
                          const base = prev.length > 0 ? prev : [{
                            length: singlePkg.length || '0',
                            width: singlePkg.width || '0',
                            height: singlePkg.height || '0',
                            actualWeight: singlePkg.actualWeight || '',
                            quantity: singlePkg.quantity || '1',
                            multiplier: '1',
                          }];
                          return [...base, { length: '0', width: '0', height: '0', actualWeight: '', quantity: '1', multiplier: '1' }];
                        });
                      } else {
                        addPackage();
                      }
                    }}
                    title="Add another package"
                    aria-label="Add another package"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                      isDark
                        ? 'bg-[#103A2D] hover:bg-[#164B3A] text-emerald-300 border-emerald-700/50 active:scale-[0.98]'
                        : 'bg-[#f0f7f4] hover:bg-emerald-100 text-[#0F4C3A] border-[#107c5a]/30 active:scale-[0.98]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Package</span>
                  </button>
                </div>
              </div>

              {/* Single Package vs Multiple Packages layout */}
              {!multiPackage ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-1">
                  {/* Actual Weight */}
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      Actual Weight (KG)
                    </label>
                    <div className="relative">
                      <input
                        id="single-actualWeight"
                        type="number"
                        step="any"
                        value={singlePkg.actualWeight}
                        onChange={(e) => setSinglePkg({ ...singlePkg, actualWeight: e.target.value })}
                        onKeyDown={(e) => handleSinglePackageKeyDown(e, 'actualWeight')}
                        placeholder="Actual Weight (KG)"
                        className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none ${
                          isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32] focus:border-emerald-400' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white focus:border-[#107c5a]'
                        }`}
                        required
                      />
                      <span className={`absolute right-3 top-2.5 text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        KG
                      </span>
                    </div>
                  </div>

                  {/* Length */}
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Length ({lengthUnit})
                    </label>
                    <input
                      id="single-length"
                      type="number"
                      step="any"
                      value={singlePkg.length}
                      onChange={(e) => setSinglePkg({ ...singlePkg, length: e.target.value })}
                      onFocus={() => handleSingleDimensionFocus('length')}
                      onClick={() => handleSingleDimensionFocus('length')}
                      onKeyDown={(e) => handleSinglePackageKeyDown(e, 'length')}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32] focus:border-emerald-400' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white focus:border-[#107c5a]'
                      }`}
                      required
                    />
                    <div className="flex items-center justify-between pt-1 flex-nowrap gap-1 sm:gap-2">
                      {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                        const isSelected = lengthUnit === u;
                        return (
                          <label key={u} className={`flex items-center gap-1 shrink-0 cursor-pointer text-xs transition-colors ${
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
                              tabIndex={-1}
                              onKeyDown={(e) => handleSingleUnitRadioKeyDown(e, 'length')}
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
                      id="single-width"
                      type="number"
                      step="any"
                      value={singlePkg.width}
                      onChange={(e) => setSinglePkg({ ...singlePkg, width: e.target.value })}
                      onFocus={() => handleSingleDimensionFocus('width')}
                      onClick={() => handleSingleDimensionFocus('width')}
                      onKeyDown={(e) => handleSinglePackageKeyDown(e, 'width')}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32] focus:border-emerald-400' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white focus:border-[#107c5a]'
                      }`}
                      required
                    />
                    <div className="flex items-center justify-between pt-1 flex-nowrap gap-1 sm:gap-2">
                      {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                        const isSelected = widthUnit === u;
                        return (
                          <label key={u} className={`flex items-center gap-1 shrink-0 cursor-pointer text-xs transition-colors ${
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
                              tabIndex={-1}
                              onKeyDown={(e) => handleSingleUnitRadioKeyDown(e, 'width')}
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
                      id="single-height"
                      type="number"
                      step="any"
                      value={singlePkg.height}
                      onChange={(e) => setSinglePkg({ ...singlePkg, height: e.target.value })}
                      onFocus={() => handleSingleDimensionFocus('height')}
                      onClick={() => handleSingleDimensionFocus('height')}
                      onKeyDown={(e) => handleSinglePackageKeyDown(e, 'height')}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-[#1D332B] border-[#2E5448] text-white focus:bg-[#223C32] focus:border-emerald-400' : 'bg-slate-50 border-slate-200 text-[#1c2e24] focus:bg-white focus:border-[#107c5a]'
                      }`}
                      required
                    />
                    <div className="flex items-center justify-between pt-1 flex-nowrap gap-1 sm:gap-2">
                      {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                        const isSelected = heightUnit === u;
                        return (
                          <label key={u} className={`flex items-center gap-1 shrink-0 cursor-pointer text-xs transition-colors ${
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
                              tabIndex={-1}
                              onKeyDown={(e) => handleSingleUnitRadioKeyDown(e, 'height')}
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
                  {/* List of packages */}
                  <div ref={packageListContainerRef} className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {packages.map((pkg, idx) => (
                      <div
                        key={idx}
                        ref={idx === packages.length - 1 ? lastAddedPackageRef : null}
                        id={`package-panel-${idx}`}
                        className={`p-4 border rounded-xl space-y-3 relative ${
                          isDark ? 'bg-[#1A2E27] border-[#2E5448]' : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className={`font-extrabold text-xs ${isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'}`}>
                              Package {idx + 1}
                            </span>

                            {/* Package Multiplier */}
                            <div className="flex items-center gap-1.5">
                              <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                Package Multiplier:
                              </label>
                              <input
                                id={`pkg-${idx}-multiplier`}
                                type="number"
                                min="1"
                                value={pkg.multiplier ?? '1'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || parseInt(val) > 0) {
                                    updatePackageField(idx, 'multiplier', val);
                                  }
                                }}
                                onKeyDown={(e) => handlePackageKeyDown(e, idx, 'multiplier')}
                                className={`w-16 border rounded-lg text-xs p-1 px-2 text-center focus:outline-none ${
                                  isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                                }`}
                                placeholder="1"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => resetPackage(idx)}
                              title={`Reset Package ${idx + 1}`}
                              aria-label={`Reset Package ${idx + 1}`}
                              className={`p-1 px-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                                isDark
                                  ? 'border-[#2E5448] bg-[#13241F] text-slate-300 hover:text-red-400 hover:border-red-800'
                                  : 'border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50'
                              }`}
                            >
                              <RotateCcw className="w-3 h-3 text-red-500" />
                              <span>Reset</span>
                            </button>

                            {packages.length > 1 && (
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => removePackage(idx)}
                                className="text-red-500 hover:bg-red-50/10 p-1 px-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1.3fr_1.3fr_1.3fr_60px] gap-x-4 sm:gap-x-6 lg:gap-x-7 gap-y-3.5 items-start">
                          <div>
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Act Wt (KG)</label>
                            <input
                              id={`pkg-${idx}-actualWeight`}
                              type="number"
                              step="any"
                              value={pkg.actualWeight}
                              onChange={(e) => updatePackageField(idx, 'actualWeight', e.target.value)}
                              onKeyDown={(e) => handlePackageKeyDown(e, idx, 'actualWeight')}
                              placeholder="0.00"
                              className={`w-full border rounded-lg text-xs p-2 focus:outline-none ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                              }`}
                              required
                            />
                          </div>

                          {/* Length with independent unit selector underneath */}
                          <div>
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Length ({pkg.lengthUnit || 'CM'})
                            </label>
                            <input
                              id={`pkg-${idx}-length`}
                              type="number"
                              step="any"
                              value={pkg.length}
                              onChange={(e) => updatePackageField(idx, 'length', e.target.value)}
                              onFocus={() => handlePackageDimensionFocus(idx, 'length')}
                              onClick={() => handlePackageDimensionFocus(idx, 'length')}
                              onKeyDown={(e) => handlePackageKeyDown(e, idx, 'length')}
                              placeholder="0.00"
                              className={`w-full border rounded-lg text-xs p-2 focus:outline-none ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                              }`}
                              required
                            />
                            <div className="flex items-center justify-between pt-1.5 flex-nowrap gap-1 sm:gap-2">
                              {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                                const isSelected = (pkg.lengthUnit || 'CM') === u;
                                return (
                                  <label key={u} className={`flex items-center gap-1 shrink-0 cursor-pointer text-[10px] sm:text-[11px] transition-colors ${
                                    isSelected
                                      ? isDark ? 'text-emerald-300 font-extrabold' : 'text-[#0F4C3A] font-extrabold'
                                      : isDark ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                                  }`}>
                                    <input
                                      type="radio"
                                      name={`pkg-${idx}-lengthUnit`}
                                      value={u}
                                      checked={isSelected}
                                      onChange={() => handlePackageUnitChange(idx, 'length', u)}
                                      tabIndex={-1}
                                      onKeyDown={(e) => handleUnitRadioKeyDown(e, idx, 'length')}
                                      className="accent-[#107c5a] h-3 w-3 cursor-pointer"
                                    />
                                    <span className={isSelected ? 'underline underline-offset-2' : ''}>{u}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Width with independent unit selector underneath */}
                          <div>
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Width ({pkg.widthUnit || 'CM'})
                            </label>
                            <input
                              id={`pkg-${idx}-width`}
                              type="number"
                              step="any"
                              value={pkg.width}
                              onChange={(e) => updatePackageField(idx, 'width', e.target.value)}
                              onFocus={() => handlePackageDimensionFocus(idx, 'width')}
                              onClick={() => handlePackageDimensionFocus(idx, 'width')}
                              onKeyDown={(e) => handlePackageKeyDown(e, idx, 'width')}
                              placeholder="0.00"
                              className={`w-full border rounded-lg text-xs p-2 focus:outline-none ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                              }`}
                              required
                            />
                            <div className="flex items-center justify-between pt-1.5 flex-nowrap gap-1 sm:gap-2">
                              {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                                const isSelected = (pkg.widthUnit || 'CM') === u;
                                return (
                                  <label key={u} className={`flex items-center gap-1 shrink-0 cursor-pointer text-[10px] sm:text-[11px] transition-colors ${
                                    isSelected
                                      ? isDark ? 'text-emerald-300 font-extrabold' : 'text-[#0F4C3A] font-extrabold'
                                      : isDark ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                                  }`}>
                                    <input
                                      type="radio"
                                      name={`pkg-${idx}-widthUnit`}
                                      value={u}
                                      checked={isSelected}
                                      onChange={() => handlePackageUnitChange(idx, 'width', u)}
                                      tabIndex={-1}
                                      onKeyDown={(e) => handleUnitRadioKeyDown(e, idx, 'width')}
                                      className="accent-[#107c5a] h-3 w-3 cursor-pointer"
                                    />
                                    <span className={isSelected ? 'underline underline-offset-2' : ''}>{u}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Height with independent unit selector underneath */}
                          <div>
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Height ({pkg.heightUnit || 'CM'})
                            </label>
                            <input
                              id={`pkg-${idx}-height`}
                              type="number"
                              step="any"
                              value={pkg.height}
                              onChange={(e) => updatePackageField(idx, 'height', e.target.value)}
                              onFocus={() => handlePackageDimensionFocus(idx, 'height')}
                              onClick={() => handlePackageDimensionFocus(idx, 'height')}
                              onKeyDown={(e) => handlePackageKeyDown(e, idx, 'height')}
                              placeholder="0.00"
                              className={`w-full border rounded-lg text-xs p-2 focus:outline-none ${
                                isDark ? 'bg-[#13241F] border-[#2E5448] text-white focus:border-emerald-400' : 'bg-white border-slate-200 text-[#1c2e24] focus:border-[#107c5a]'
                              }`}
                              required
                            />
                            <div className="flex items-center justify-between pt-1.5 flex-nowrap gap-1 sm:gap-2">
                              {(['MM', 'CM', 'Inch', 'Feet'] as const).map((u) => {
                                const isSelected = (pkg.heightUnit || 'CM') === u;
                                return (
                                  <label key={u} className={`flex items-center gap-1 shrink-0 cursor-pointer text-[10px] sm:text-[11px] transition-colors ${
                                    isSelected
                                      ? isDark ? 'text-emerald-300 font-extrabold' : 'text-[#0F4C3A] font-extrabold'
                                      : isDark ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                                  }`}>
                                    <input
                                      type="radio"
                                      name={`pkg-${idx}-heightUnit`}
                                      value={u}
                                      checked={isSelected}
                                      onChange={() => handlePackageUnitChange(idx, 'height', u)}
                                      tabIndex={-1}
                                      onKeyDown={(e) => handleUnitRadioKeyDown(e, idx, 'height')}
                                      className="accent-[#107c5a] h-3 w-3 cursor-pointer"
                                    />
                                    <span className={isSelected ? 'underline underline-offset-2' : ''}>{u}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Quantity */}
                          <div className="w-full max-w-[60px]">
                            <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Qty</label>
                            <input
                              id={`pkg-${idx}-quantity`}
                              type="number"
                              min="1"
                              value={pkg.quantity}
                              onChange={(e) => updatePackageField(idx, 'quantity', e.target.value)}
                              onKeyDown={(e) => handlePackageKeyDown(e, idx, 'quantity')}
                              className={`w-full max-w-[60px] border rounded-lg text-xs p-2 focus:outline-none ${
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
                      id="bottom-add-package-btn"
                      onClick={addPackage}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          focusField(`pkg-${packages.length - 1}-quantity`);
                        }
                      }}
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

            <button
              type="submit"
              id="compute-volumetric-weight-btn"
              disabled={loading || demoState?.demoLimitReached}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && e.shiftKey) {
                  e.preventDefault();
                  if (multiPackage) {
                    focusField('bottom-add-package-btn');
                  } else {
                    focusField('single-height');
                  }
                }
              }}
              className="w-full bg-[#107c5a] hover:bg-[#0e382c] disabled:bg-slate-300 disabled:text-slate-500 text-white py-4 rounded-xl font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Performing calculations...' : 'Compute Volumetric Weight'}
            </button>
          </form>
        </div>

        {/* Right Column: Result Panel */}
        <div className="space-y-6 lg:sticky lg:top-3">
          <div id="calculator-result-panel" className={`border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px] ${
            isDark ? 'bg-[#14231E] border-[#264E41]' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-5 ${isDark ? 'bg-[#0A261D] text-emerald-300' : 'bg-[#0e382c] text-white'}`}>
              <h3 className="font-extrabold text-xs uppercase tracking-wider">Evaluation Result</h3>
              <p className={`text-[10px] font-light mt-0.5 ${isDark ? 'text-emerald-400/80' : 'text-emerald-100'}`}>Volumetric output statistics</p>
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
                      <span className="text-base font-black">
                        {(currentCalculationResult ? currentCalculationResult.actualWeight.toFixed(3) : result.actualWeight)} KG
                      </span>
                    </div>
                    <div className={`p-3 border rounded-xl ${
                      isDark ? 'bg-[#182B25] border-[#264E41] text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <span className={`block text-[9px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Volumetric Weight</span>
                      <span className="text-base font-black">
                        {(currentCalculationResult ? currentCalculationResult.volumetricWeight.toFixed(3) : result.volumetricWeight)} KG
                      </span>
                    </div>
                  </div>

                  {/* Chargeable Weight readout */}
                  <div className={`w-[80%] mx-auto py-3 px-3 border rounded-xl text-center shadow-xs ${
                    isDark 
                      ? 'bg-[#103A2D] border-emerald-600/60 text-white' 
                      : 'bg-[#0F4C3A] border-[#0c3c2e] text-white'
                  }`}>
                    <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-emerald-300' : 'text-emerald-200'}`}>Final Chargeable Weight</span>
                    <span className="text-3xl font-black mt-1 block tracking-tight">
                      {(currentCalculationResult ? currentCalculationResult.chargeableWeight.toFixed(3) : result.chargeableWeight)} KG
                    </span>
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

          {/* Package Breakdown / Individual Evaluation Section */}
          <div
            id="calculator-package-breakdown-panel"
            className={`border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${
              isDark ? 'bg-[#14231E] border-[#264E41]' : 'bg-white border-slate-200'
            }`}
          >
            {/* Header Top Row: Package Breakdown Title & Collapse Toggle (Bold Contrast Background) */}
            <button
              type="button"
              onClick={() => setBreakdownExpanded(!breakdownExpanded)}
              aria-expanded={breakdownExpanded}
              aria-controls="package-breakdown-content"
              className={`w-full flex items-center justify-between p-3.5 sm:p-4 text-left transition cursor-pointer border-b focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                isDark
                  ? 'bg-[#1E382E] hover:bg-[#234237] border-[#2A5243]'
                  : 'bg-[#DCECE2] hover:bg-[#D4E7DC] border-[#C7DFD2]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl flex items-center justify-center shadow-xs ${
                    isDark ? 'bg-[#14231E] text-emerald-400' : 'bg-white text-[#0F4C3A]'
                  }`}
                >
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-100' : 'text-[#0F4C3A]'}`}>
                    Package Breakdown
                  </h4>
                  <p className={`text-[10px] font-medium mt-0.5 ${isDark ? 'text-emerald-400/90' : 'text-[#1B5E4A]'}`}>
                    View individual package calculations
                  </p>
                </div>
              </div>

              <div
                className={`p-1.5 rounded-lg transition shrink-0 ${
                  isDark
                    ? 'text-emerald-400 hover:text-emerald-200 hover:bg-[#14231E]/60'
                    : 'text-[#0F4C3A] hover:bg-white/60'
                }`}
              >
                {breakdownExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {/* Total Summary Section: Soft Blue Tinted Background Aligned with Package Rows */}
            <div
              onClick={() => setBreakdownExpanded(!breakdownExpanded)}
              className={`w-full p-3.5 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-colors ${
                isDark
                  ? 'bg-[#13222E] hover:bg-[#182C3B] border-[#1E374B]'
                  : 'bg-[#EEF4FB] hover:bg-[#E3EDF8] border-[#D8E6F5]'
              }`}
            >
              {/* Column 1: Package / Total Summary Label */}
              <div className="flex items-center gap-1.5 min-w-[95px] shrink-0">
                <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider ${
                  isDark ? 'text-sky-400' : 'text-slate-800'
                }`}>
                  Total Summary
                </span>
              </div>

              {/* Columns 2, 3, 4: Total Actual Weight, Total Volumetric Weight, Total Chargeable Weight */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-grow items-center text-left">
                {/* Total Actual Weight auto-sum display */}
                <div>
                  <span className={`block text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Total Actual Weight
                  </span>
                  <span className={`text-[11px] sm:text-xs block mt-0.5 font-black ${
                    isDark ? 'text-slate-100' : 'text-slate-950'
                  }`}>
                    {totalActualWeight.toFixed(3)} KG
                  </span>
                </div>

                {/* Total Volumetric Weight auto-sum display */}
                <div>
                  <span className={`block text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Total Volumetric Weight
                  </span>
                  <span className={`text-[11px] sm:text-xs block mt-0.5 font-black ${
                    isDark ? 'text-slate-100' : 'text-slate-950'
                  }`}>
                    {totalVolumetricWeight.toFixed(3)} KG
                  </span>
                </div>

                {/* Total Chargeable Weight auto-sum display */}
                <div className="text-right sm:text-right">
                  <span className={`block text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Total Chargeable Weight
                  </span>
                  <div className="mt-0.5 inline-block">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-black shadow-xs border ${
                        isDark
                          ? 'bg-amber-950/80 text-amber-200 border-amber-700/60'
                          : 'bg-[#FDE68A] text-[#78350F] border-[#F59E0B]/40'
                      }`}
                    >
                      {totalChargeableWeight.toFixed(3)} KG
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Package Calculations Content */}
            {breakdownExpanded && (
              <div
                id="package-breakdown-content"
                className={`border-t divide-y text-xs transition-all ${
                  isDark
                    ? 'border-[#264E41] divide-slate-800/80 bg-[#14231E]'
                    : 'border-slate-100 divide-slate-100 bg-white'
                }`}
              >
                {packageBreakdown.length === 0 ? (
                  <div
                    className={`p-6 text-center text-xs font-medium ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    No package calculations available.
                  </div>
                ) : (
                  packageBreakdown.map((pkg) => (
                    <div
                      key={pkg.index}
                      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors ${
                        isDark ? 'hover:bg-[#182B25]/50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Package Label */}
                      <div className="flex items-center gap-1.5 min-w-[95px] shrink-0">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          Package {pkg.index}
                        </span>
                      </div>

                      {/* Package Metrics: Actual Weight, Volumetric Weight, Chargeable Weight */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-grow items-center text-left">
                        {/* Actual Weight */}
                        <div>
                          <span
                            className={`block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${
                              pkg.isActualHigher
                                ? isDark
                                  ? 'text-amber-400'
                                  : 'text-amber-700'
                                : isDark
                                ? 'text-slate-400'
                                : 'text-slate-400'
                            }`}
                          >
                            Actual Weight
                          </span>
                          <span
                            className={`text-xs block mt-0.5 ${
                              pkg.isActualHigher
                                ? isDark
                                  ? 'text-amber-300 font-extrabold'
                                  : 'text-amber-900 font-extrabold'
                                : isDark
                                ? 'text-slate-200 font-medium'
                                : 'text-slate-700 font-medium'
                            }`}
                          >
                            {pkg.actualWeight.toFixed(3)} KG
                          </span>
                        </div>

                        {/* Volumetric Weight */}
                        <div>
                          <span
                            className={`block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${
                              pkg.isVolumetricHigher
                                ? isDark
                                  ? 'text-amber-400'
                                  : 'text-amber-700'
                                : isDark
                                ? 'text-slate-400'
                                : 'text-slate-400'
                            }`}
                          >
                            Volumetric Weight
                          </span>
                          <span
                            className={`text-xs block mt-0.5 ${
                              pkg.isVolumetricHigher
                                ? isDark
                                  ? 'text-amber-300 font-extrabold'
                                  : 'text-amber-900 font-extrabold'
                                : isDark
                                ? 'text-slate-200 font-medium'
                                : 'text-slate-700 font-medium'
                            }`}
                          >
                            {pkg.volumetricWeight.toFixed(3)} KG
                          </span>
                        </div>

                        {/* Chargeable Weight with Gold Highlight Badge */}
                        <div className="text-right sm:text-right">
                          <span
                            className={`block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${
                              isDark ? 'text-slate-400' : 'text-slate-400'
                            }`}
                          >
                            Chargeable Weight
                          </span>
                          <div className="mt-0.5 inline-block">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-black shadow-2xs border ${
                                isDark
                                  ? 'bg-amber-950/80 text-amber-200 border-amber-700/60'
                                  : 'bg-[#FDE68A] text-[#78350F] border-[#F59E0B]/30'
                              }`}
                            >
                              {pkg.chargeableWeight.toFixed(3)} KG
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
          weight={(currentCalculationResult?.chargeableWeight ?? result?.chargeableWeight)?.toString() || '0'}
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
