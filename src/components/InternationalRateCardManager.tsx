'use client';

import React, { useState, useEffect } from 'react';
import {
  Ship,
  Plane,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Search,
  Globe,
  Loader2,
  X,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import Modal from '@/components/Modal';
import { InternationalCountryRate, InternationalOtherCharge, COUNTRIES_LIST } from '@/types/internationalRate';

interface InternationalRateCardManagerProps {
  courierCompanyId: string;
  courierCompanyName: string;
  rateCards: any[];
  onRefresh: () => void;
  isAdmin?: boolean;
  companies?: any[];
  onSelectCompany?: (company: any) => void;
}

export default function InternationalRateCardManager({
  courierCompanyId,
  courierCompanyName,
  rateCards,
  onRefresh,
  isAdmin = false,
  companies = [],
  onSelectCompany,
}: InternationalRateCardManagerProps) {
  const [selectedCompId, setSelectedCompId] = useState<string>(courierCompanyId);

  useEffect(() => {
    if (courierCompanyId) {
      setSelectedCompId(courierCompanyId);
    }
  }, [courierCompanyId]);

  const activeCompany = (companies || []).find((c) => c.id === selectedCompId) || {
    id: courierCompanyId,
    name: courierCompanyName,
  };

  const currentCompanyId = activeCompany.id;
  const currentCompanyName = activeCompany.name;

  const [seaSearchCountry, setSeaSearchCountry] = useState('');
  const [airSearchCountry, setAirSearchCountry] = useState('');

  // Find active RateCard for current company with serviceType === 'International'
  const internationalRateCard = rateCards.find(
    (card) => card.courierCompanyId === currentCompanyId && card.serviceType === 'International'
  );

  const [countryRates, setCountryRates] = useState<InternationalCountryRate[]>([]);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Country Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetFreightType, setTargetFreightType] = useState<'Sea Freight' | 'Air Freight'>('Sea Freight');
  const [editingRate, setEditingRate] = useState<InternationalCountryRate | null>(null);

  // Form State
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countrySearchInput, setCountrySearchInput] = useState('');
  const [perKgRateInput, setPerKgRateInput] = useState('');
  const [tatInput, setTatInput] = useState('');
  const [otherCharges, setOtherCharges] = useState<InternationalOtherCharge[]>([]);

  useEffect(() => {
    if (internationalRateCard && internationalRateCard.internationalRates) {
      let rates: InternationalCountryRate[] = [];
      if (Array.isArray(internationalRateCard.internationalRates)) {
        rates = internationalRateCard.internationalRates;
      }
      setCountryRates(rates);
    } else {
      setCountryRates([]);
    }
  }, [internationalRateCard, currentCompanyId]);

  // Filter country rates for Sea Freight & Air Freight separately
  const seaFreightRates = countryRates.filter(
    (r) =>
      r.freightType === 'Sea Freight' &&
      r.country.toLowerCase().includes(seaSearchCountry.toLowerCase())
  );

  const airFreightRates = countryRates.filter(
    (r) =>
      r.freightType === 'Air Freight' &&
      r.country.toLowerCase().includes(airSearchCountry.toLowerCase())
  );

  const openAddModal = (freightType: 'Sea Freight' | 'Air Freight') => {
    setTargetFreightType(freightType);
    setEditingRate(null);
    setSelectedCountry('');
    setCountrySearchInput('');
    setPerKgRateInput('');
    setTatInput('');
    setOtherCharges([]);
    setValidationError('');
    setModalOpen(true);
  };

  const openEditModal = (rate: InternationalCountryRate) => {
    setTargetFreightType(rate.freightType);
    setEditingRate(rate);
    setSelectedCountry(rate.country);
    setCountrySearchInput(rate.country);
    setPerKgRateInput(String(rate.perKgRate));
    setTatInput(rate.tat || '');
    setOtherCharges(
      (rate.otherCharges || []).map((c) => ({
        id: c.id,
        name: c.name,
        percentage: c.percentage !== undefined && c.percentage !== null ? c.percentage : ('' as any),
        fixedRate: c.fixedRate !== undefined && c.fixedRate !== null ? c.fixedRate : ('' as any),
      }))
    );
    setValidationError('');
    setModalOpen(true);
  };

  const handleAddOtherCharge = () => {
    const newCharge: any = {
      id: 'charge_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name: '',
      percentage: '',
      fixedRate: '',
    };
    setOtherCharges([...otherCharges, newCharge]);
  };

  const handleUpdateOtherCharge = (id: string, field: keyof InternationalOtherCharge, value: any) => {
    setOtherCharges(
      otherCharges.map((charge) => {
        if (charge.id === id) {
          return {
            ...charge,
            [field]: value,
          };
        }
        return charge;
      })
    );
  };

  const handleRemoveOtherCharge = (id: string) => {
    setOtherCharges(otherCharges.filter((c) => c.id !== id));
  };

  const handleSaveCountryRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedCountry) {
      setValidationError('Please select a destination country.');
      return;
    }

    const numericRate = parseFloat(perKgRateInput);
    if (isNaN(numericRate) || numericRate < 0) {
      setValidationError('Please enter a valid Per KG rate (0 or greater).');
      return;
    }

    // DUPLICATE COUNTRY VALIDATION: Check if country already exists for this exact Operator + Freight Type
    const isDuplicate = countryRates.some(
      (r) =>
        r.country.toLowerCase() === selectedCountry.toLowerCase() &&
        r.freightType === targetFreightType &&
        (!editingRate || r.id !== editingRate.id)
    );

    if (isDuplicate) {
      setValidationError(
        `${selectedCountry} is already configured for ${targetFreightType} under ${currentCompanyName}.`
      );
      return;
    }

    // Validate charges
    for (const c of otherCharges) {
      if (!c.name.trim()) {
        setValidationError('All Other Charge rows must have a Charge Name.');
        return;
      }
      const rawPct = c.percentage;
      const rawFix = c.fixedRate;

      const hasPct = (rawPct as any) !== '' && rawPct !== null && rawPct !== undefined && !isNaN(Number(rawPct));
      const hasFix = (rawFix as any) !== '' && rawFix !== null && rawFix !== undefined && !isNaN(Number(rawFix));

      const pctVal = hasPct ? Number(rawPct) : null;
      const fixVal = hasFix ? Number(rawFix) : null;

      if ((pctVal === null || pctVal <= 0) && (fixVal === null || fixVal <= 0)) {
        setValidationError('Enter either a percentage or fixed rate for charge: ' + c.name);
        return;
      }
      if (pctVal !== null && (isNaN(pctVal) || pctVal < 0)) {
        setValidationError('Percentage must be 0 or greater.');
        return;
      }
      if (fixVal !== null && (isNaN(fixVal) || fixVal < 0)) {
        setValidationError('Fixed rate must be 0 or greater.');
        return;
      }
    }

    const newRateEntry: InternationalCountryRate = {
      id: editingRate ? editingRate.id : 'rate_' + Date.now(),
      country: selectedCountry,
      freightType: targetFreightType,
      perKgRate: numericRate,
      tat: tatInput.trim() || undefined,
      otherCharges: otherCharges.map((c) => {
        const rawPct = c.percentage;
        const rawFix = c.fixedRate;
        const hasPct = (rawPct as any) !== '' && rawPct !== null && rawPct !== undefined && !isNaN(Number(rawPct));
        const hasFix = (rawFix as any) !== '' && rawFix !== null && rawFix !== undefined && !isNaN(Number(rawFix));

        return {
          id: c.id,
          name: c.name.trim(),
          percentage: hasPct ? Number(rawPct) : null,
          fixedRate: hasFix ? Number(rawFix) : null,
        };
      }),
      active: editingRate ? (editingRate.active !== undefined ? editingRate.active : true) : true,
    };

    let updatedRatesList: InternationalCountryRate[];
    if (editingRate) {
      updatedRatesList = countryRates.map((r) => (r.id === editingRate.id ? newRateEntry : r));
    } else {
      updatedRatesList = [...countryRates, newRateEntry];
    }

    await saveRatesToBackend(updatedRatesList);
  };

  const handleDeleteCountryRate = async (id: string, countryName: string, freightType: string) => {
    if (!confirm(`Are you sure you want to delete International ${freightType} rate for ${countryName}?`)) {
      return;
    }
    const updatedRatesList = countryRates.filter((r) => r.id !== id);
    await saveRatesToBackend(updatedRatesList);
  };

  const handleToggleCountryActive = async (rate: InternationalCountryRate) => {
    const updatedRatesList = countryRates.map((r) => {
      if (r.id === rate.id) {
        return { ...r, active: !r.active };
      }
      return r;
    });
    await saveRatesToBackend(updatedRatesList);
  };

  const saveRatesToBackend = async (newRatesList: InternationalCountryRate[]) => {
    try {
      setSaving(true);
      const payload = {
        courierCompanyId: currentCompanyId,
        serviceType: 'International',
        rateCardName: `${currentCompanyName} International Contract`,
        serviceName: `International Freight (${currentCompanyName})`,
        rateCardType: 'Courier',
        pricingModel: 'PER_KG',
        minimumWeight: 0,
        cargoThreshold: 0,
        active: true,
        useForComparison: true,
        slabs: [],
        internationalRates: newRatesList,
      };

      let res;
      if (internationalRateCard) {
        const endpoint = isAdmin
          ? `/api/admin/rate-cards/${internationalRateCard.id}`
          : `/api/rate-cards/${internationalRateCard.id}`;
        res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rateCardName: internationalRateCard.rateCardName || `${currentCompanyName} International Contract`,
            serviceName: internationalRateCard.serviceName || `International Freight (${currentCompanyName})`,
            serviceType: 'International',
            rateCardType: 'Courier',
            pricingModel: 'PER_KG',
            minimumWeight: 0,
            cargoThreshold: 0,
            active: true,
            useForComparison: true,
            internationalRates: newRatesList,
          }),
        });
      } else {
        const endpoint = isAdmin ? '/api/admin/rate-cards' : '/api/rate-cards';
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setCountryRates(newRatesList);
        setModalOpen(false);
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save International Rate Card.');
      }
    } catch (err: any) {
      console.error('Failed to save international rates:', err);
      alert('Failed to save International Rate Card.');
    } finally {
      setSaving(false);
    }
  };

  // Search filtered countries list for modal dropdown
  const filteredCountriesList = COUNTRIES_LIST.filter((c) =>
    c.toLowerCase().includes(countrySearchInput.toLowerCase())
  );

  const getModalTitle = () => {
    if (editingRate) {
      return `EDIT ${targetFreightType.toUpperCase()} — ${currentCompanyName.toUpperCase()}`;
    }
    return `ADD ${targetFreightType.toUpperCase()} — ${currentCompanyName.toUpperCase()}`;
  };

  return (
    <div className="space-y-8">
      {/* COMPANY SELECTION TABS BAR */}
      {companies && companies.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              INTERNATIONAL RATE CARDS BY COURIER COMPANY
            </h3>
            <span className="text-[11px] font-bold text-slate-500">
              Active Company: <strong className="text-[#0F4C3A] font-extrabold">{currentCompanyName}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {companies.map((comp) => {
              const isSelected = comp.id === currentCompanyId;
              const cardForComp = rateCards.find(
                (c) => c.courierCompanyId === comp.id && c.serviceType === 'International'
              );
              const ratesCount = Array.isArray(cardForComp?.internationalRates)
                ? cardForComp.internationalRates.length
                : 0;

              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    setSelectedCompId(comp.id);
                    if (onSelectCompany) onSelectCompany(comp);
                  }}
                  className={`py-2 px-4 rounded-xl text-xs font-extrabold transition shadow-2xs flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#0F4C3A] text-white shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{comp.name}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {ratesCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 1: SEA FREIGHT */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#0F4C3A] flex items-center justify-center font-bold border border-teal-100">
              <Ship className="w-6 h-6 text-[#1E8262]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">SEA FREIGHT</h2>
                <span className="bg-teal-100 text-[#0F4C3A] text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                  {countryRates.filter((r) => r.freightType === 'Sea Freight').length} Configured ({currentCompanyName})
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                International Sea Freight Rates for <strong>{currentCompanyName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Sea Freight country..."
                value={seaSearchCountry}
                onChange={(e) => setSeaSearchCountry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none transition"
              />
            </div>

            <button
              type="button"
              onClick={() => openAddModal('Sea Freight')}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition shadow-xs hover:shadow flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Country</span>
            </button>
          </div>
        </div>

        {/* Sea Freight Countries List */}
        {seaFreightRates.length === 0 ? (
          <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
            <Globe className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-extrabold text-slate-700">No Sea Freight Countries Configured</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Click &quot;+ Add Country&quot; above to add Sea Freight rates for {currentCompanyName}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seaFreightRates.map((rate) => {
              const isActive = rate.active !== false;
              const activeCharges = (rate.otherCharges || []).filter(
                (c) => (c.percentage !== null && c.percentage !== undefined && c.percentage > 0) ||
                       (c.fixedRate !== null && c.fixedRate !== undefined && c.fixedRate > 0)
              );
              return (
                <div
                  key={rate.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-[#1E8262]/40 transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="w-4 h-4 text-[#1E8262] shrink-0" />
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">{rate.country}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCountryActive(rate)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border transition shrink-0 ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </button>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per KG Rate</span>
                      <strong className="font-mono text-sm font-black text-[#0F4C3A]">₹{rate.perKgRate} / KG</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        TAT (Delivery Time)
                      </span>
                      <strong className="font-bold text-xs text-slate-800">{rate.tat || 'Not specified'}</strong>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Other Charges ({activeCharges.length})
                      </span>
                      {activeCharges.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {activeCharges.map((c) => (
                            <span
                              key={c.id}
                              className="bg-slate-100 border border-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <span>{c.name}:</span>
                              <span className="text-[#0F4C3A] font-mono">
                                {c.percentage !== null && c.percentage !== undefined && c.percentage > 0 && `${c.percentage}%`}
                                {c.percentage !== null && c.percentage !== undefined && c.percentage > 0 && c.fixedRate !== null && c.fixedRate !== undefined && c.fixedRate > 0 && ' + '}
                                {c.fixedRate !== null && c.fixedRate !== undefined && c.fixedRate > 0 && `₹${c.fixedRate}`}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No extra charges</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5 mt-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(rate)}
                      className="p-1.5 text-slate-500 hover:text-[#1E8262] hover:bg-emerald-50 rounded-lg transition text-xs font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>EDIT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCountryRate(rate.id, rate.country, rate.freightType)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>DELETE</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: AIR FREIGHT */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#0F4C3A] flex items-center justify-center font-bold border border-emerald-100">
              <Plane className="w-6 h-6 text-[#1E8262]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">AIR FREIGHT</h2>
                <span className="bg-emerald-100 text-[#0F4C3A] text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                  {countryRates.filter((r) => r.freightType === 'Air Freight').length} Configured ({currentCompanyName})
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                International Air Freight Rates for <strong>{currentCompanyName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Air Freight country..."
                value={airSearchCountry}
                onChange={(e) => setAirSearchCountry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none transition"
              />
            </div>

            <button
              type="button"
              onClick={() => openAddModal('Air Freight')}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition shadow-xs hover:shadow flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Country</span>
            </button>
          </div>
        </div>

        {/* Air Freight Countries List */}
        {airFreightRates.length === 0 ? (
          <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
            <Globe className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-extrabold text-slate-700">No Air Freight Countries Configured</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Click &quot;+ Add Country&quot; above to add Air Freight rates for {currentCompanyName}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {airFreightRates.map((rate) => {
              const isActive = rate.active !== false;
              const activeCharges = (rate.otherCharges || []).filter(
                (c) => (c.percentage !== null && c.percentage !== undefined && c.percentage > 0) ||
                       (c.fixedRate !== null && c.fixedRate !== undefined && c.fixedRate > 0)
              );
              return (
                <div
                  key={rate.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-[#1E8262]/40 transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="w-4 h-4 text-[#1E8262] shrink-0" />
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">{rate.country}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCountryActive(rate)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border transition shrink-0 ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </button>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per KG Rate</span>
                      <strong className="font-mono text-sm font-black text-[#0F4C3A]">₹{rate.perKgRate} / KG</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        TAT (Delivery Time)
                      </span>
                      <strong className="font-bold text-xs text-slate-800">{rate.tat || 'Not specified'}</strong>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Other Charges ({activeCharges.length})
                      </span>
                      {activeCharges.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {activeCharges.map((c) => (
                            <span
                              key={c.id}
                              className="bg-slate-100 border border-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <span>{c.name}:</span>
                              <span className="text-[#0F4C3A] font-mono">
                                {c.percentage !== null && c.percentage !== undefined && c.percentage > 0 && `${c.percentage}%`}
                                {c.percentage !== null && c.percentage !== undefined && c.percentage > 0 && c.fixedRate !== null && c.fixedRate !== undefined && c.fixedRate > 0 && ' + '}
                                {c.fixedRate !== null && c.fixedRate !== undefined && c.fixedRate > 0 && `₹${c.fixedRate}`}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No extra charges</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5 mt-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(rate)}
                      className="p-1.5 text-slate-500 hover:text-[#1E8262] hover:bg-emerald-50 rounded-lg transition text-xs font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>EDIT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCountryRate(rate.id, rate.country, rate.freightType)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>DELETE</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT COUNTRY RATE MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={getModalTitle()}
        size="md"
      >
        <form onSubmit={handleSaveCountryRate} className="space-y-5 text-xs p-1">
          {validationError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-red-800 font-bold flex items-start gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 1. Country Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
              SELECT COUNTRY *
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type to filter country list..."
                  value={countrySearchInput}
                  onChange={(e) => {
                    setCountrySearchInput(e.target.value);
                    if (!selectedCountry || !e.target.value.toLowerCase().includes(selectedCountry.toLowerCase())) {
                      setSelectedCountry('');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                size={5}
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setCountrySearchInput(e.target.value);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none overflow-y-auto"
                required
              >
                {filteredCountriesList.map((c) => (
                  <option key={c} value={c} className="p-1.5 hover:bg-emerald-50 rounded font-bold">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {selectedCountry && (
              <p className="text-[11px] font-bold text-[#0F4C3A] mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Selected: <strong>{selectedCountry}</strong>
              </p>
            )}
          </div>

          {/* 2. Per KG Rate */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
              PER KG RATE (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 850"
                value={perKgRateInput}
                onChange={(e) => setPerKgRateInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          {/* 3. TAT (Transit / Delivery Time) */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#1E8262]" />
              <span>TAT / TRANSIT TIME</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 10–15 Days, 3–5 Days"
              value={tatInput}
              onChange={(e) => setTatInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-bold self-center mr-1">Quick Select:</span>
              {['1–2 Days', '2–4 Days', '3–5 Days', '5–7 Days', '7–10 Days', '10–15 Days'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTatInput(preset)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                    tatInput === preset
                      ? 'bg-emerald-100 text-[#0F4C3A] border-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Configure Other Charges */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  OTHER CHARGES CONFIGURATION
                </strong>
                <p className="text-[11px] text-slate-500 font-medium">
                  Add custom surcharges (percentage %, fixed rate ₹, or both).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddOtherCharge}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
              >
                <Plus className="w-3.5 h-3.5 text-[#1E8262]" />
                <span>+ Add Other Charge</span>
              </button>
            </div>

            {otherCharges.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                No additional charges added for this country. Click &quot;+ Add Other Charge&quot; to configure Fuel Surcharges, Handling, or Documentation.
              </p>
            ) : (
              <div className="space-y-2.5">
                {otherCharges.map((charge, idx) => (
                  <div key={charge.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Charge #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOtherCharge(charge.id)}
                        className="text-red-500 hover:text-red-700 p-1 transition"
                        title="Remove Charge"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Charge Name */}
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-600 uppercase mb-0.5">Charge Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Fuel Surcharge"
                          value={charge.name}
                          onChange={(e) => handleUpdateOtherCharge(charge.id, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs focus:outline-none"
                          required
                        />
                      </div>

                      {/* Percentage (%) */}
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-600 uppercase mb-0.5">Percentage (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Optional"
                            value={charge.percentage !== null && charge.percentage !== undefined ? charge.percentage : ''}
                            onChange={(e) => handleUpdateOtherCharge(charge.id, 'percentage', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 pr-6 font-mono font-bold text-slate-900 text-xs focus:outline-none"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                        </div>
                      </div>

                      {/* Fixed Rate (₹) */}
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-600 uppercase mb-0.5">Fixed Rate (₹)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="Optional"
                            value={charge.fixedRate !== null && charge.fixedRate !== undefined ? charge.fixedRate : ''}
                            onChange={(e) => handleUpdateOtherCharge(charge.id, 'fixedRate', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 pl-6 font-mono font-bold text-slate-900 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
                <span>Save Country Configuration</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
