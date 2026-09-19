'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Settings,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Sliders,
  Layers,
  Grid,
  Lock,
  Check,
} from 'lucide-react';
import Modal from '@/components/Modal';
import OperatorAvatar from '@/components/OperatorAvatar';
import InternationalRateCardManager from '@/components/InternationalRateCardManager';
import { COURIER_LOGOS, resolveCourierLogo } from '@/utils/courierLogos';

interface WeightSlab {
  id: string;
  type: 'BASE' | 'ADDITIONAL';
  weight: number;
  unit: 'GRAMS' | 'KG';
  label: string;
}

interface LtlPtlRange {
  id: string;
  fromWeight: number;
  toWeight: number;
  unit: 'KG' | 'GRAMS';
  rate: number;
}

interface RegionRow {
  id: string;
  name: string;
  cargoRate: number;
  airRatePerKg?: number;
  surfaceRatePerKg?: number;
  prices: { slabId: string; amount: number }[];
  weightRanges?: LtlPtlRange[];
}

export default function AdminRateCardsPage() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [systemCards, setSystemCards] = useState<any[]>([]);

  // Navigation state: null represents the list of system courier companies
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [subTab, setSubTab] = useState<'Domestic' | 'International'>('Domestic');

  // Modals state
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyEditing, setCompanyEditing] = useState(false);
  const [companyEditId, setCompanyEditId] = useState<string | null>(null);

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardEditing, setCardEditing] = useState(false);
  const [cardEditId, setCardEditId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Courier Company Form State
  const [companyName, setCompanyName] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [companyTrackingUrl, setCompanyTrackingUrl] = useState('');
  const [companyPincodeUrl, setCompanyPincodeUrl] = useState('');
  const [companyActive, setCompanyActive] = useState(true);

  // Rate Card Form State
  const [rateCardName, setRateCardName] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [minimumWeight, setMinimumWeight] = useState('0.001');
  const [cargoThreshold, setCargoThreshold] = useState('5.0');
  const [pricingModel, setPricingModel] = useState<'SLAB' | 'PER_KG' | 'LTL_PTL'>('SLAB');
  const [cardActive, setCardActive] = useState(true);
  const [useForComparison, setUseForComparison] = useState(true);

  // Dynamic slabs & regions state
  const [weightSlabs, setWeightSlabs] = useState<WeightSlab[]>([]);
  const [regionsMatrix, setRegionsMatrix] = useState<RegionRow[]>([]);

  async function loadAllData() {
    try {
      const [compRes, cardsRes] = await Promise.all([
        fetch('/api/courier-companies'),
        fetch('/api/admin/rate-cards')
      ]);

      if (compRes.ok) {
        const cJson = await compRes.json();
        const systemCompanies = (cJson.companies || []).filter((c: any) => c.userId === null);
        setCompanies(systemCompanies);
      }

      if (cardsRes.ok) {
        const cardJson = await cardsRes.json();
        setSystemCards(cardJson.rateCards || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  // Courier Company CRUD handlers
  const openAddCompany = () => {
    setError('');
    setSuccess('');
    setCompanyName('');
    setCompanyLogoUrl('');
    setCompanyTrackingUrl('');
    setCompanyPincodeUrl('');
    setCompanyActive(true);
    setCompanyEditing(false);
    setCompanyModalOpen(true);
  };

  const openEditCompany = (comp: any) => {
    setError('');
    setSuccess('');
    setCompanyEditId(comp.id);
    setCompanyName(comp.name);
    setCompanyLogoUrl(comp.logoUrl || '');
    setCompanyTrackingUrl(comp.trackingUrl || '');
    setCompanyPincodeUrl(comp.pincodeServiceabilityUrl || '');
    setCompanyActive(comp.active);
    setCompanyEditing(true);
    setCompanyModalOpen(true);
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    if (!companyName) {
      setError('Name is required.');
      setSaving(false);
      return;
    }

    try {
      const url = companyEditing ? `/api/courier-companies/${companyEditId}` : '/api/courier-companies';
      const method = companyEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          logoUrl: companyLogoUrl || null,
          trackingUrl: companyTrackingUrl || null,
          pincodeServiceabilityUrl: companyPincodeUrl || null,
          active: companyActive,
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save courier company.');

      setSuccess(companyEditing ? 'Company updated.' : 'Company created successfully.');
      setCompanyModalOpen(false);
      await loadAllData();

      if (selectedCompany && selectedCompany.id === companyEditId) {
        setSelectedCompany(json.company);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompanyDelete = async (compId: string, name: string) => {
    if (!confirm(`Warning: Deleting system company "${name}" will remove all associated system template rate cards. Continue?`)) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/courier-companies/${compId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('System Courier company removed.');
        setSelectedCompany(null);
        await loadAllData();
      } else {
        const json = await res.json();
        throw new Error(json.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete company.');
    }
  };

  // Default initial configuration
  const getDefaultSlabs = (): WeightSlab[] => [
    { id: 'slab250', type: 'BASE', weight: 250, unit: 'GRAMS', label: 'Base 250G' },
    { id: 'slab500', type: 'BASE', weight: 500, unit: 'GRAMS', label: 'Base 500G' },
    { id: 'slabadd', type: 'ADDITIONAL', weight: 500, unit: 'GRAMS', label: 'Add 500G' }
  ];

  const getDefaultRegions = (): RegionRow[] => [
    { id: 'reg1', name: 'Within City', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 0 }, { slabId: 'slab500', amount: 0 }, { slabId: 'slabadd', amount: 0 }] },
    { id: 'reg2', name: 'Within State', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 0 }, { slabId: 'slab500', amount: 0 }, { slabId: 'slabadd', amount: 0 }] },
    { id: 'reg3', name: 'Within Zone', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 0 }, { slabId: 'slab500', amount: 0 }, { slabId: 'slabadd', amount: 0 }] },
    { id: 'reg4', name: 'Metro', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 0 }, { slabId: 'slab500', amount: 0 }, { slabId: 'slabadd', amount: 0 }] },
    { id: 'reg5', name: 'ROI', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 0 }, { slabId: 'slab500', amount: 0 }, { slabId: 'slabadd', amount: 0 }] },
    { id: 'reg6', name: 'Special Destination', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 0 }, { slabId: 'slab500', amount: 0 }, { slabId: 'slabadd', amount: 0 }] }
  ];

  const openAddCard = () => {
    setError('');
    setSuccess('');
    setRateCardName('');
    setServiceName('');
    setMinimumWeight('0.001');
    setCargoThreshold('5.0');
    setPricingModel('SLAB');
    setCardActive(true);
    setUseForComparison(true);
    setWeightSlabs(getDefaultSlabs());
    setRegionsMatrix(getDefaultRegions());
    setCardEditing(false);
    setCardModalOpen(true);
  };

  const openEditCard = (card: any) => {
    setError('');
    setSuccess('');
    setCardEditId(card.id);
    setRateCardName(card.rateCardName);
    setServiceName(card.serviceName);
    setMinimumWeight(card.minimumWeight.toString());
    setCargoThreshold(card.cargoThreshold.toString());
    setPricingModel(card.pricingModel as 'SLAB' | 'PER_KG' | 'LTL_PTL');
    setCardActive(card.active);
    setUseForComparison(card.useForComparison);
    setWeightSlabs(card.slabs || getDefaultSlabs());
    setRegionsMatrix(card.regions || getDefaultRegions());
    setCardEditing(true);
    setCardModalOpen(true);
  };

  const addWeightRange = (regionId: string) => {
    setRegionsMatrix(prev => prev.map(row => {
      if (row.id !== regionId) return row;
      const ranges = row.weightRanges || [];
      let nextFrom = 0;
      if (ranges.length > 0) {
        const last = ranges[ranges.length - 1];
        nextFrom = last.toWeight + 1;
      }
      return {
        ...row,
        weightRanges: [
          ...ranges,
          {
            id: `range-${Date.now()}-${Math.random()}`,
            fromWeight: nextFrom,
            toWeight: nextFrom + 50,
            unit: 'KG',
            rate: 0
          }
        ]
      };
    }));
  };

  const updateWeightRangeField = (regionId: string, rangeId: string, field: keyof LtlPtlRange, value: any) => {
    setRegionsMatrix(prev => prev.map(row => {
      if (row.id !== regionId) return row;
      const ranges = row.weightRanges || [];
      return {
        ...row,
        weightRanges: ranges.map(r => {
          if (r.id !== rangeId) return r;
          return {
            ...r,
            [field]: value
          };
        })
      };
    }));
  };

  const deleteWeightRange = (regionId: string, rangeId: string) => {
    setRegionsMatrix(prev => prev.map(row => {
      if (row.id !== regionId) return row;
      const ranges = row.weightRanges || [];
      return {
        ...row,
        weightRanges: ranges.filter(r => r.id !== rangeId)
      };
    }));
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    if (!rateCardName || !serviceName) {
      setError('Please fill in all required name fields.');
      setSaving(false);
      return;
    }

    if (pricingModel === 'LTL_PTL') {
      for (const row of regionsMatrix) {
        const ranges = row.weightRanges || [];
        if (ranges.length === 0) {
          setError(`Please add at least one weight range for region: ${row.name}`);
          setSaving(false);
          return;
        }

        for (const range of ranges) {
          if (range.fromWeight < 0 || range.toWeight < 0 || range.rate < 0) {
            setError(`Negative weights or rates are not allowed in region: ${row.name}`);
            setSaving(false);
            return;
          }
          if (range.fromWeight > range.toWeight) {
            setError(`From Weight (${range.fromWeight}) cannot be greater than To Weight (${range.toWeight}) in region: ${row.name}`);
            setSaving(false);
            return;
          }
        }

        const sorted = [...ranges].sort((a, b) => a.fromWeight - b.fromWeight);
        for (let i = 0; i < sorted.length; i++) {
          const current = sorted[i];
          if (i > 0) {
            const prev = sorted[i - 1];
            if (current.fromWeight <= prev.toWeight) {
              setError(`Overlapping weight ranges detected in region "${row.name}": [${prev.fromWeight}-${prev.toWeight}] overlaps with [${current.fromWeight}-${current.toWeight}]`);
              setSaving(false);
              return;
            }
            if (current.fromWeight > prev.toWeight + 1) {
              setError(`Gaps are not allowed. There is a gap between [${prev.fromWeight}-${prev.toWeight}] and [${current.fromWeight}-${current.toWeight}] in region "${row.name}"`);
              setSaving(false);
              return;
            }
          }
        }
      }
    }

    try {
      const url = cardEditing ? `/api/admin/rate-cards/${cardEditId}` : '/api/admin/rate-cards';
      const method = cardEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierCompanyId: selectedCompany.id,
          serviceType: subTab,
          rateCardName,
          serviceName,
          rateCardType: pricingModel === 'SLAB' ? 'Courier' : (pricingModel === 'LTL_PTL' ? 'LTL' : 'Cargo'),
          pricingModel,
          minimumWeight: parseFloat(minimumWeight) || 0.0,
          cargoThreshold: parseFloat(cargoThreshold) || 5.0,
          active: cardActive,
          useForComparison,
          slabs: weightSlabs,
          regions: regionsMatrix,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save system template.');

      setSuccess(cardEditing ? 'System template updated.' : 'System template added.');
      setCardModalOpen(false);
      await loadAllData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCardDelete = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this system template?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/rate-cards/${cardId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('System template deleted.');
        await loadAllData();
      } else {
        const json = await res.json();
        throw new Error(json.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Dynamic Slabs modifiers
  const addWeightSlab = () => {
    const newId = 'slab_' + Date.now();
    const newSlab: WeightSlab = {
      id: newId,
      type: 'BASE',
      weight: 500,
      unit: 'GRAMS',
      label: 'Base 500G'
    };
    setWeightSlabs([...weightSlabs, newSlab]);

    const updatedMatrix = regionsMatrix.map(row => ({
      ...row,
      prices: [...row.prices, { slabId: newId, amount: 0 }]
    }));
    setRegionsMatrix(updatedMatrix);
  };

  const updateWeightSlabField = (index: number, field: keyof WeightSlab, val: any) => {
    const updated = [...weightSlabs];
    updated[index] = {
      ...updated[index],
      [field]: val
    };

    if (field === 'weight' || field === 'unit' || field === 'type') {
      const weightVal = field === 'weight' ? parseFloat(val) || 0 : updated[index].weight;
      const unitVal = field === 'unit' ? val : updated[index].unit;
      const typeVal = field === 'type' ? val : updated[index].type;
      
      const symbol = unitVal === 'GRAMS' ? 'G' : 'KG';
      const typeLabel = typeVal === 'BASE' ? 'Base' : 'Add';
      updated[index].label = `${typeLabel} ${weightVal}${symbol}`;
    }

    setWeightSlabs(updated);
  };

  const deleteWeightSlab = (slabId: string) => {
    if (['slab250', 'slab500', 'slabadd'].includes(slabId)) return;
    setWeightSlabs(weightSlabs.filter(s => s.id !== slabId));
    const updatedMatrix = regionsMatrix.map(row => ({
      ...row,
      prices: row.prices.filter(p => p.slabId !== slabId)
    }));
    setRegionsMatrix(updatedMatrix);
  };

  // Matrix Modifiers
  const updateRegionRowName = (regId: string, val: string) => {
    setRegionsMatrix(regionsMatrix.map(r => r.id === regId ? { ...r, name: val } : r));
  };

  const updateRegionPriceField = (regId: string, slabId: string, val: string) => {
    setRegionsMatrix(regionsMatrix.map(r => {
      if (r.id !== regId) return r;
      const updatedPrices = r.prices.map(p => p.slabId === slabId ? { ...p, amount: parseFloat(val) || 0 } : p);
      if (!updatedPrices.some(p => p.slabId === slabId)) {
        updatedPrices.push({ slabId, amount: parseFloat(val) || 0 });
      }
      return { ...r, prices: updatedPrices };
    }));
  };

  const updateRegionGeneralField = (regId: string, field: 'cargoRate' | 'airRatePerKg' | 'surfaceRatePerKg', val: string) => {
    setRegionsMatrix(regionsMatrix.map(r => r.id === regId ? { ...r, [field]: parseFloat(val) || 0 } : r));
  };

  const addCustomRegionRow = () => {
    const newId = 'reg_' + Date.now();
    const newRow: RegionRow = {
      id: newId,
      name: 'Custom Destination',
      cargoRate: 0,
      airRatePerKg: 0,
      surfaceRatePerKg: 0,
      prices: weightSlabs.map(s => ({ slabId: s.id, amount: 0 }))
    };
    setRegionsMatrix([...regionsMatrix, newRow]);
  };

  const deleteRegionRow = (regId: string) => {
    setRegionsMatrix(regionsMatrix.filter(r => r.id !== regId));
  };

  const replicateRegionRow = (regId: string) => {
    setRegionsMatrix((prev) => {
      const targetIdx = prev.findIndex((r) => r.id === regId);
      if (targetIdx === -1) return prev;

      const targetRegion = prev[targetIdx];
      const existingNames = prev.map((r) => r.name);

      const rootName = targetRegion.name.replace(/\s*\(Copy(?:\s+\d+)?\)$/, '').trim();
      let candidate = `${rootName} (Copy)`;
      if (existingNames.includes(candidate)) {
        let counter = 2;
        while (existingNames.includes(`${rootName} (Copy ${counter})`)) {
          counter++;
        }
        candidate = `${rootName} (Copy ${counter})`;
      }

      const deepCopiedRanges = (targetRegion.weightRanges || []).map((r) => ({
        id: `range_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fromWeight: r.fromWeight,
        toWeight: r.toWeight,
        unit: r.unit,
        rate: r.rate,
      }));

      const deepCopiedPrices = (targetRegion.prices || []).map((p) => ({
        slabId: p.slabId,
        amount: p.amount,
      }));

      const newId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const replicatedRow: RegionRow = {
        ...targetRegion,
        id: newId,
        name: candidate,
        prices: deepCopiedPrices,
        weightRanges: deepCopiedRanges,
      };

      const updated = [...prev];
      updated.splice(targetIdx + 1, 0, replicatedRow);
      return updated;
    });
  };

  const getNestedCardsCount = (compId: string, type: 'Domestic' | 'International') => {
    return systemCards.filter(c => c.courierCompanyId === compId && c.serviceType === type).length;
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Loading system templates...</p>
        </div>
      </div>
    );
  }

  // RENDER LEVEL 1: SYSTEM COMPANIES VIEW
  if (selectedCompany === null) {
    return (
      <div className="space-y-6 w-full max-w-7xl mx-auto font-sans">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F4C3A]">System Operator Templates</h1>
            <p className="text-xs text-slate-500 mt-1 font-light">
              Manage default System Operators and default rate template cards.
            </p>
          </div>

          <button
            onClick={openAddCompany}
            className="bg-[#1E8262] hover:bg-[#0F4C3A] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Add System Operator
          </button>
        </div>

        {success && (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-655 border border-red-255 p-3 rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        {companies.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-xs max-w-lg mx-auto">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-800 text-sm">No System Operators Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-normal">
              Add system courier operators to configure global pricing templates under them.
            </p>
          </div>
        ) : (
          <div className={
            companies.length === 1
              ? 'max-w-md mx-auto'
              : companies.length === 2
                ? 'grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-6'
                : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl gap-6'
          }>
            {companies.map((comp) => {
              const domCount = getNestedCardsCount(comp.id, 'Domestic');
              const intCount = getNestedCardsCount(comp.id, 'International');

              return (
                <div
                  key={comp.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-[#1E8262]/40 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header: Operator Avatar Mark & Name */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <OperatorAvatar name={comp.name} size="md" />
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-base tracking-tight truncate">
                            {comp.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-500 block -mt-0.5">
                            {comp.active ? 'Active Operator' : 'Inactive Operator'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => openEditCompany(comp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
                        title="Edit company properties"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Secondary Information: Domestic & International Template Counts */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Domestic</span>
                        <strong className="text-slate-900 text-sm font-black mt-0.5 block">{domCount} {domCount === 1 ? 'Template' : 'Templates'}</strong>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">International</span>
                        <strong className="text-slate-900 text-sm font-black mt-0.5 block">{intCount} {intCount === 1 ? 'Template' : 'Templates'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-4 mt-5">
                    <button
                      onClick={() => {
                        setSelectedCompany(comp);
                        setSubTab('Domestic');
                      }}
                      className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 px-4 rounded-xl text-xs font-extrabold transition shadow-xs hover:shadow flex items-center justify-center gap-1.5"
                    >
                      <span>Open Operator</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCompanyDelete(comp.id, comp.name)}
                      className="p-2.5 border border-slate-200 hover:bg-red-50 hover:border-red-200 rounded-xl text-red-500 transition shrink-0"
                      title="Delete Operator"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Courier Company MODAL */}
        <Modal
          isOpen={companyModalOpen}
          onClose={() => setCompanyModalOpen(false)}
          title={companyEditing ? 'EDIT SYSTEM OPERATOR' : 'ADD SYSTEM OPERATOR'}
          size="sm"
        >
          <form onSubmit={handleCompanySubmit} className="space-y-5 text-xs p-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Operator Name
              </label>
              <input
                type="text"
                placeholder="e.g. FedEx, DTDC, Blue Dart"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] focus:bg-white transition shadow-xs"
                required
              />
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-800">Courier Active Status</span>
                <span className="text-[10px] text-slate-500 font-medium">Enable or disable operator visibility</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={companyActive}
                  onChange={(e) => setCompanyActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setCompanyModalOpen(false)}
                className="border border-slate-200 hover:bg-slate-100 text-slate-700 py-2.5 px-5 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2.5 px-6 rounded-xl text-xs font-bold transition shadow-md hover:shadow flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Operator</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // RENDER LEVEL 2: DETAILED TEMPLATES TABS VIEW
  const filteredSystemTemplates = systemCards.filter(c => c.courierCompanyId === selectedCompany.id && c.serviceType === subTab);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedCompany(null);
              setError('');
              setSuccess('');
            }}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#0F4C3A]">{selectedCompany.name} (System Templates)</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-light">Configure rate cards prefilled for users.</p>
          </div>
        </div>

        <button
          onClick={openAddCard}
          className="bg-[#1E8262] hover:bg-[#0F4C3A] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          Add {subTab} Template
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-655 border border-red-255 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Domestic / International tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('Domestic')}
          className={`py-2.5 px-6 font-bold text-xs border-b-2 transition ${
            subTab === 'Domestic'
              ? 'border-[#1E8262] text-[#0F4C3A]'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Domestic Slabs
        </button>
        <button
          onClick={() => setSubTab('International')}
          className={`py-2.5 px-6 font-bold text-xs border-b-2 transition ${
            subTab === 'International'
              ? 'border-[#1E8262] text-[#0F4C3A]'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          International Slabs
        </button>
      </div>

      {subTab === 'International' ? (
        <InternationalRateCardManager
          courierCompanyId={selectedCompany.id}
          courierCompanyName={selectedCompany.name}
          rateCards={systemCards}
          companies={companies}
          onSelectCompany={(comp) => setSelectedCompany(comp)}
          onRefresh={loadAllData}
          isAdmin={true}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto text-xs">
          {filteredSystemTemplates.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No system templates configured for this operator.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-505 font-bold p-3">
                  <th className="p-3">Service Name</th>
                  <th className="p-3">Template Name</th>
                  <th className="p-3">Model</th>
                  <th className="p-3 text-center">Min Wt</th>
                  <th className="p-3 text-center">Threshold</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSystemTemplates.map((card) => (
                  <tr key={card.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">{card.serviceName}</td>
                    <td className="p-3 text-[#0F4C3A] font-semibold">{card.rateCardName}</td>
                    <td className="p-3 text-slate-550 uppercase">{card.pricingModel === 'SLAB' ? 'Weight Slab' : (card.pricingModel === 'LTL_PTL' ? 'LTL/PTL' : 'Per KG')}</td>
                    <td className="p-3 text-center font-mono">{card.minimumWeight} KG</td>
                    <td className="p-3 text-center font-mono">{card.cargoThreshold} KG</td>
                    <td className="p-3 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditCard(card)}
                        className="p-1 hover:bg-slate-100 rounded text-[#1E8262]"
                        title="Edit Template"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCardDelete(card.id)}
                        className="p-1 hover:bg-slate-100 rounded text-red-500"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE / EDIT RATE CARD MODAL */}
      <Modal
        isOpen={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        title={cardEditing ? `EDIT TEMPLATE: ${rateCardName || 'UNTITLED'}` : `ADD SYSTEM ${subTab.toUpperCase()} TEMPLATE`}
        size="workspace"
        noPadding
        headerExtra={
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0F4C3A] border border-emerald-200">
            <Sparkles className="w-3 h-3 text-[#1E8262]" /> Template Workspace
          </span>
        }
        footer={
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <span>
                Pricing Model: <strong className="text-slate-800 uppercase">{pricingModel.replace('_', '/')}</strong>
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="hidden sm:inline">
                Scope: <strong className="text-[#0F4C3A] uppercase">{subTab}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="border border-slate-200 hover:bg-slate-100 text-slate-650 py-2.5 px-6 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCardSubmit}
                disabled={saving}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2.5 px-7 rounded-xl text-xs font-bold transition shadow-md hover:shadow-lg flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{cardEditing ? 'Save Template Changes' : 'Save Template'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCardSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* SECTION 1: RATE CARD GENERAL PARAMETERS */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-xs text-[#0F4C3A] uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#1E8262]" />
                  Template Basic Parameters
                </h4>
                <div className="flex items-center gap-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cardActive}
                      onChange={(e) => setCardActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1E8262]"></div>
                    <span className="ml-2 text-[10px] font-bold text-slate-700 uppercase">Active Status</span>
                  </label>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useForComparison}
                      onChange={(e) => setUseForComparison(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600"></div>
                    <span className="ml-2 text-[10px] font-bold text-slate-700 uppercase">Use for Compare All</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <div className="xl:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Template Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Premium Surface Express"
                    value={rateCardName}
                    onChange={(e) => setRateCardName(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] focus:bg-white transition shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Service Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Express, Cargo"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] focus:bg-white transition shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pricing Model</label>
                  <select
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value as 'SLAB' | 'PER_KG' | 'LTL_PTL')}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] focus:bg-white transition shadow-sm"
                  >
                    <option value="SLAB">Weight Slab Pricing</option>
                    <option value="PER_KG">Per KG Pricing</option>
                    <option value="LTL_PTL">LTL/PTL Pricing</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Min Wt (KG)</label>
                    <input
                      type="number"
                      step="any"
                      value={minimumWeight}
                      onChange={(e) => setMinimumWeight(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] focus:bg-white transition text-center shadow-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cargo Threshold</label>
                    <input
                      type="number"
                      step="any"
                      value={cargoThreshold}
                      onChange={(e) => setCargoThreshold(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] focus:bg-white transition text-center shadow-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: WEIGHT SLABS DEFINITION (Only visible for Weight Slab Pricing) */}
            {pricingModel === 'SLAB' && (
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-xs text-[#0F4C3A] uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#1E8262]" />
                      Weight Slabs Definition
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      System default slabs (Base 250G, Base 500G, Add 500G) are locked. Click "+ Add Weight Slab" to append custom slabs.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addWeightSlab}
                    className="bg-emerald-50 hover:bg-emerald-100 text-[#0F4C3A] border border-emerald-200 py-1.5 px-3 rounded-lg font-bold transition text-[11px] flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Weight Slab</span>
                  </button>
                </div>

                {weightSlabs.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No weight slabs defined. Click "+ Add Weight Slab" to create one.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {weightSlabs.map((slab, sIdx) => {
                      const isDefault = slab.id === 'slab250' || slab.id === 'slab500' || slab.id === 'slabadd' || (sIdx < 3 && (slab.weight === 250 || slab.weight === 500));

                      return (
                        <div 
                          key={slab.id} 
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition shadow-sm ${
                            isDefault 
                              ? 'bg-slate-50/90 border-slate-200/90' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isDefault ? (
                            <span className="bg-slate-200/80 text-slate-600 px-2 py-1 rounded text-[9.5px] font-extrabold uppercase shrink-0 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-slate-500" /> {slab.type}
                            </span>
                          ) : (
                            <select
                              value={slab.type}
                              onChange={(e) => updateWeightSlabField(sIdx, 'type', e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none text-xs"
                            >
                              <option value="BASE">Base</option>
                              <option value="ADDITIONAL">Additional</option>
                            </select>
                          )}

                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <input
                              type="number"
                              value={slab.weight}
                              disabled={isDefault}
                              onChange={(e) => updateWeightSlabField(sIdx, 'weight', parseFloat(e.target.value) || 0)}
                              className="w-16 border border-slate-200 rounded-lg p-1 font-bold text-right focus:outline-none disabled:bg-slate-100 disabled:text-slate-600 text-xs"
                              placeholder="Weight"
                            />

                            {isDefault ? (
                              <span className="text-[10px] font-bold text-slate-500 px-1">{slab.unit}</span>
                            ) : (
                              <select
                                value={slab.unit}
                                onChange={(e) => updateWeightSlabField(sIdx, 'unit', e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 font-bold text-slate-700 focus:outline-none text-xs"
                              >
                                <option value="GRAMS">Grams</option>
                                <option value="KG">KG</option>
                              </select>
                            )}

                            <input
                              type="text"
                              value={slab.label}
                              onChange={(e) => updateWeightSlabField(sIdx, 'label', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-1 font-bold text-xs focus:outline-none"
                              placeholder="Display Label"
                            />
                          </div>

                          {isDefault ? (
                            <span title="System Default Slab (Locked)" className="p-1 text-slate-300">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => deleteWeightSlab(slab.id)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition shrink-0"
                              title="Delete Slab Column"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: PRICING MATRIX CONFIGURATION */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-extrabold text-xs text-[#0F4C3A] uppercase tracking-wider flex items-center gap-2">
                    <Grid className="w-4 h-4 text-[#1E8262]" />
                    Pricing Matrix Configuration
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Configure pricing per region. Table headers remain sticky while scrolling region rows.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addCustomRegionRow}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg border border-slate-200 font-bold transition text-[11px] flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Custom Region</span>
                </button>
              </div>

              {/* STICKY MATRIX TABLE WRAPPER */}
              {pricingModel === 'LTL_PTL' ? (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  {regionsMatrix.map((row) => {
                    const ranges = row.weightRanges || [];
                    return (
                      <div key={row.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-[10px] uppercase">Destination Region:</span>
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateRegionRowName(row.id, e.target.value)}
                              className="border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none bg-white text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => replicateRegionRow(row.id)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 py-1 px-2.5 rounded-lg font-bold transition text-[10px] flex items-center gap-1 shadow-2xs"
                              title="Replicate Region"
                            >
                              <Copy className="w-3 h-3 text-slate-600" />
                              <span>Replicate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRegionRow(row.id)}
                              className="text-red-500 hover:bg-red-50 hover:text-red-700 rounded p-1 transition"
                              title="Delete Region"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {ranges.length === 0 ? (
                          <div className="border border-slate-200 rounded-lg p-3 bg-white text-center space-y-2">
                            <p className="text-[10px] text-slate-400 italic">No weight ranges defined for this region.</p>
                            <button
                              type="button"
                              onClick={() => addWeightRange(row.id)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-[#0F4C3A] border border-emerald-200 py-1 px-2.5 rounded-lg font-bold transition text-[10px] inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3 text-[#1E8262]" />
                              <span>+ Add Weight Range</span>
                            </button>
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <div className="max-h-56 overflow-y-auto">
                              <table className="w-full text-left border-collapse text-[10px]">
                                <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[9px]">
                                  <tr>
                                    <th className="p-2 w-28 text-center">From Weight</th>
                                    <th className="p-2 w-28 text-center">To Weight</th>
                                    <th className="p-2 w-20 text-center">Unit</th>
                                    <th className="p-2 w-28 text-center">Rate (₹)</th>
                                    <th className="p-2 w-16 text-center">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {ranges.map((range) => (
                                    <tr key={range.id}>
                                      <td className="p-1">
                                        <input
                                          type="number"
                                          value={range.fromWeight}
                                          onChange={(e) => updateWeightRangeField(row.id, range.id, 'fromWeight', parseFloat(e.target.value) || 0)}
                                          className="w-full border border-slate-200 rounded p-1 text-center font-bold text-slate-700 focus:outline-none"
                                        />
                                      </td>
                                      <td className="p-1">
                                        <input
                                          type="number"
                                          value={range.toWeight}
                                          onChange={(e) => updateWeightRangeField(row.id, range.id, 'toWeight', parseFloat(e.target.value) || 0)}
                                          className="w-full border border-slate-200 rounded p-1 text-center font-bold text-slate-700 focus:outline-none"
                                        />
                                      </td>
                                      <td className="p-1">
                                        <select
                                          value={range.unit}
                                          onChange={(e) => updateWeightRangeField(row.id, range.id, 'unit', e.target.value as 'KG' | 'GRAMS')}
                                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center font-bold text-slate-650 focus:outline-none"
                                        >
                                          <option value="KG">KG</option>
                                          <option value="GRAMS">Grams</option>
                                        </select>
                                      </td>
                                      <td className="p-1">
                                        <input
                                          type="number"
                                          value={range.rate}
                                          onChange={(e) => updateWeightRangeField(row.id, range.id, 'rate', parseFloat(e.target.value) || 0)}
                                          className="w-full border border-slate-200 rounded p-1 text-center font-bold text-slate-700 focus:outline-none"
                                        />
                                      </td>
                                      <td className="p-1 text-center">
                                        <button
                                          type="button"
                                          onClick={() => deleteWeightRange(row.id, range.id)}
                                          className="text-red-500 hover:bg-red-50 rounded p-1 transition"
                                          title="Delete Weight Range"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="bg-slate-50 border-t border-slate-200 p-2 flex justify-center sticky bottom-0 z-10">
                              <button
                                type="button"
                                onClick={() => addWeightRange(row.id)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-[#0F4C3A] border border-emerald-200 py-1 px-3.5 rounded-lg font-bold transition text-[10px] flex items-center gap-1.5 shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5 text-[#1E8262]" />
                                <span>+ Add Weight Range</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[420px] overflow-y-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider shadow-sm">
                      <tr>
                        <th className="p-3 w-48 bg-slate-100">Region Name</th>
                        {pricingModel === 'PER_KG' ? (
                          <>
                            <th className="p-3 text-right w-36 bg-slate-100">Air Mode (₹/KG)</th>
                            <th className="p-3 text-right w-36 bg-slate-100">Surface Mode (₹/KG)</th>
                          </>
                        ) : (
                          <>
                            {weightSlabs.map(s => (
                              <th key={s.id} className="p-3 text-right font-black uppercase text-[#0F4C3A] min-w-[110px] bg-slate-100">
                                {s.label.toUpperCase()} (₹)
                              </th>
                            ))}
                            <th className="p-3 text-right w-40 bg-slate-100">Cargo Rate (₹/KG)</th>
                          </>
                        )}
                        <th className="p-3 text-center w-20 bg-slate-100">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {regionsMatrix.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/70 transition">
                          {/* Region Name Input */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateRegionRowName(row.id, e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20"
                            />
                          </td>

                          {pricingModel === 'PER_KG' ? (
                            <>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={row.airRatePerKg ?? 0}
                                  onChange={(e) => updateRegionGeneralField(row.id, 'airRatePerKg', e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg p-1.5 text-right font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={row.surfaceRatePerKg ?? 0}
                                  onChange={(e) => updateRegionGeneralField(row.id, 'surfaceRatePerKg', e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg p-1.5 text-right font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20"
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              {weightSlabs.map(s => {
                                const priceObj = row.prices.find(p => p.slabId === s.id) || { amount: 0 };
                                return (
                                  <td key={s.id} className="p-2">
                                    <input
                                      type="number"
                                      value={priceObj.amount}
                                      onChange={(e) => updateRegionPriceField(row.id, s.id, e.target.value)}
                                      className="w-full border border-slate-200 rounded-lg p-1.5 text-right font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20"
                                    />
                                  </td>
                                );
                              })}
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={row.cargoRate ?? 0}
                                  onChange={(e) => updateRegionGeneralField(row.id, 'cargoRate', e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg p-1.5 text-right font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20"
                                />
                              </td>
                            </>
                          )}

                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => deleteRegionRow(row.id)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition"
                              title="Delete Region Row"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
