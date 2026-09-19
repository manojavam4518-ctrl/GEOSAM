'use client';

import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Trash2,
  CheckCircle,
  Loader2,
  Building,
  Flag,
  Activity,
  Globe,
  Sliders,
  Database,
  ArrowRight,
  Sparkles,
  RefreshCw,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import Modal from '@/components/Modal';

const PRESET_SEED_PINCODES = [
  { pincode: '560001', state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru', postOffice: 'Bengaluru G.P.O.', postalCircle: 'Karnataka Circle', postalRegion: 'Bengaluru HQ Region', postalDivision: 'Bengaluru East Division', officeType: 'HO', deliveryStatus: 'Delivery' },
  { pincode: '560026', state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru', postOffice: 'Chamarajapet', postalCircle: 'Karnataka Circle', postalRegion: 'Bengaluru West Division', officeType: 'SO', deliveryStatus: 'Delivery' },
  { pincode: '400001', state: 'Maharashtra', district: 'Mumbai', city: 'Mumbai', postOffice: 'Mumbai G.P.O.', postalCircle: 'Maharashtra Circle', postalRegion: 'Mumbai HQ Region', postalDivision: 'Mumbai GPO Division', officeType: 'HO', deliveryStatus: 'Delivery' },
  { pincode: '110001', state: 'Delhi', district: 'New Delhi', city: 'New Delhi', postOffice: 'New Delhi G.P.O.', postalCircle: 'Delhi Circle', postalRegion: 'Delhi Region', postalDivision: 'New Delhi Division', officeType: 'HO', deliveryStatus: 'Delivery' },
  { pincode: '600001', state: 'Tamil Nadu', district: 'Chennai', city: 'Chennai', postOffice: 'Chennai G.P.O.', postalCircle: 'Tamil Nadu Circle', postalRegion: 'Chennai Region', postalDivision: 'Chennai City North Division', officeType: 'HO', deliveryStatus: 'Delivery' },
  { pincode: '500001', state: 'Telangana', district: 'Hyderabad', city: 'Hyderabad', postOffice: 'Hyderabad G.P.O.', postalCircle: 'Andhra Pradesh Circle', postalRegion: 'Hyderabad HQ Region', postalDivision: 'Hyderabad City Division', officeType: 'HO', deliveryStatus: 'Delivery' },
  { pincode: '700001', state: 'West Bengal', district: 'Kolkata', city: 'Kolkata', postOffice: 'Kolkata G.P.O.', postalCircle: 'West Bengal Circle', postalRegion: 'South Bengal Region', postalDivision: 'Kolkata GPO Division', officeType: 'HO', deliveryStatus: 'Delivery' },
  { pincode: '411001', state: 'Maharashtra', district: 'Pune', city: 'Pune', postOffice: 'Pune G.P.O.', postalCircle: 'Maharashtra Circle', postalRegion: 'Pune Region', postalDivision: 'Pune City Division', officeType: 'HO', deliveryStatus: 'Delivery' },
  { pincode: '380001', state: 'Gujarat', district: 'Ahmedabad', city: 'Ahmedabad', postOffice: 'Ahmedabad G.P.O.', postalCircle: 'Gujarat Circle', postalRegion: 'Ahmedabad HQ Region', postalDivision: 'Ahmedabad City Division', officeType: 'HO', deliveryStatus: 'Delivery' }
];

export default function AdminPincodesPage() {
  const [activeTab, setActiveTab] = useState<'pincodes' | 'metros' | 'states' | 'import'>('pincodes');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data States
  const [mappings, setMappings] = useState<any[]>([]);
  const [metros, setMetros] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Pincode Modal States
  const [pincodeModalOpen, setPincodeModalOpen] = useState(false);
  const [editingPincode, setEditingPincode] = useState<any | null>(null);
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [geoRegion, setGeoRegion] = useState('METRO');
  const [zone, setZone] = useState('South');
  const [isMetro, setIsMetro] = useState(false);
  const [isServiceable, setIsServiceable] = useState(true);
  const [customOverride, setCustomOverride] = useState(false);

  // Metro Modal States
  const [metroModalOpen, setMetroModalOpen] = useState(false);
  const [metroName, setMetroName] = useState('');
  const [metroActive, setMetroActive] = useState(true);

  // State Mappings Modal States
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [stateName, setStateName] = useState('');
  const [stateRegion, setStateRegion] = useState('SOUTH');
  const [stateZone, setStateZone] = useState('South');

  // Import panel JSON input
  const [importJson, setImportJson] = useState('');
  const [importSummary, setImportSummary] = useState<any | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [pincodesRes, metrosRes, statesRes] = await Promise.all([
        fetch('/api/admin/pincodes'),
        fetch('/api/admin/metro-locations'),
        fetch('/api/admin/state-mappings')
      ]);

      if (pincodesRes.ok) {
        const json = await pincodesRes.json();
        setMappings(json.mappings || []);
      }
      if (metrosRes.ok) {
        const json = await metrosRes.json();
        setMetros(json.locations || []);
      }
      if (statesRes.ok) {
        const json = await statesRes.json();
        setStates(json.mappings || []);
      }
    } catch (err) {
      console.error('Failed to load data maps:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Pincode Mapping submit
  async function handlePincodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/pincodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pincode,
          city,
          state,
          district,
          geoRegion,
          zone,
          isMetro,
          isServiceable,
          hasOverride: customOverride
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('Pincode saved successfully.');
      setPincodeModalOpen(false);
      resetPincodeForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save pincode.');
    } finally {
      setSaving(false);
    }
  }

  function resetPincodeForm() {
    setEditingPincode(null);
    setPincode('');
    setCity('');
    setState('');
    setDistrict('');
    setGeoRegion('METRO');
    setZone('South');
    setIsMetro(false);
    setIsServiceable(true);
    setCustomOverride(false);
  }

  function openEditPincode(m: any) {
    setEditingPincode(m);
    setPincode(m.pincode);
    setCity(m.city);
    setState(m.state);
    setDistrict(m.district || '');
    setGeoRegion(m.geoRegion);
    setZone(m.zone);
    setIsMetro(m.isMetro);
    setIsServiceable(m.isServiceable);
    setCustomOverride(m.hasOverride);
    setPincodeModalOpen(true);
  }

  async function handleDeletePincode(id: string, code: string) {
    if (!confirm(`Delete pincode mapping for ${code}?`)) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/pincodes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setSuccess(`Deleted pincode ${code}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Metro Submit
  async function handleMetroSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/metro-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: metroName, isActive: metroActive })
      });
      if (!res.ok) throw new Error('Save failed.');
      setSuccess('Metro location configuration saved.');
      setMetroModalOpen(false);
      setMetroName('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMetro(id: string, name: string) {
    if (!confirm(`Delete metro city ${name}?`)) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/metro-locations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setSuccess(`Deleted Metro ${name}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // State Map Submit
  async function handleStateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/state-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateName, regionName: stateRegion, zoneName: stateZone })
      });
      if (!res.ok) throw new Error('Save failed.');
      setSuccess('State mapping configuration saved.');
      setStateModalOpen(false);
      setStateName('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteState(id: string, name: string) {
    if (!confirm(`Delete mapping for state ${name}?`)) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/state-mappings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setSuccess(`Deleted state mapping ${name}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Seed / Bulk Import Function
  async function triggerImport(dataset: any[]) {
    setError('');
    setSuccess('');
    setSaving(true);
    setImportSummary(null);
    try {
      const res = await fetch('/api/admin/pincodes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincodes: dataset })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');

      setSuccess('Postal Master directory import completed.');
      setImportSummary(json.summary);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Filter lists
  const filteredMappings = mappings.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.pincode.includes(q) ||
      m.city.toLowerCase().includes(q) ||
      m.state.toLowerCase().includes(q) ||
      (m.district || '').toLowerCase().includes(q) ||
      m.geoRegion.toLowerCase().includes(q) ||
      m.zone.toLowerCase().includes(q)
    );
  });

  const totalCustom = mappings.length;
  const totalMetros = mappings.filter((m) => m.isMetro).length;
  const totalInactives = mappings.filter((m) => !m.isServiceable).length;

  if (loading) {
    return (
      <div className="min-h-[450px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Loading mapping engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Pincode Directory & Mapping</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-light">
            Manage India Post Master database, Metro priorities, State matrices, and commercial regions.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'pincodes' && (
            <button
              onClick={() => {
                resetPincodeForm();
                setPincodeModalOpen(true);
              }}
              className="bg-[#1E8262] hover:bg-[#0F4C3A] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Pincode Map
            </button>
          )}
          {activeTab === 'metros' && (
            <button
              onClick={() => {
                setMetroName('');
                setMetroModalOpen(true);
              }}
              className="bg-[#1E8262] hover:bg-[#0F4C3A] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Metro City
            </button>
          )}
          {activeTab === 'states' && (
            <button
              onClick={() => {
                setStateName('');
                setStateModalOpen(true);
              }}
              className="bg-[#1E8262] hover:bg-[#0F4C3A] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add State Mapping
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-650 border border-red-200 p-3.5 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase leading-none mb-1.5">Master Database</span>
            <span className="text-lg font-bold text-slate-800 leading-none">{totalCustom} Pincodes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase leading-none mb-1.5">Metros Resolved</span>
            <span className="text-lg font-bold text-slate-800 leading-none">{totalMetros} pincodes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase leading-none mb-1.5">State Matrices</span>
            <span className="text-lg font-bold text-slate-800 leading-none">{states.length} Active Mappings</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase leading-none mb-1.5">Unserviceable</span>
            <span className="text-lg font-bold text-slate-800 leading-none">{totalInactives} Codes Blocked</span>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pincodes')}
          className={`py-3 px-6 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
            activeTab === 'pincodes'
              ? 'border-[#1E8262] text-[#0F4C3A]'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Pincodes Directory
        </button>
        <button
          onClick={() => setActiveTab('metros')}
          className={`py-3 px-6 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
            activeTab === 'metros'
              ? 'border-[#1E8262] text-[#0F4C3A]'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          Metro Locations
        </button>
        <button
          onClick={() => setActiveTab('states')}
          className={`py-3 px-6 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
            activeTab === 'states'
              ? 'border-[#1E8262] text-[#0F4C3A]'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          State Regional Mapping
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`py-3 px-6 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
            activeTab === 'import'
              ? 'border-[#1E8262] text-[#0F4C3A]'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Import Database
        </button>
      </div>

      {/* Main Tab views */}
      <div className="space-y-4">
        {activeTab === 'pincodes' && (
          <>
            {/* Search Bar */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search directory by pincode, city, state, zone, circle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-[#1E8262] transition"
                />
              </div>
            </div>

            {/* List */}
            {filteredMappings.length === 0 ? (
              <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 text-sm">No pincodes found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-normal font-light">
                  No records match the active filters. Go to the "Import Database" tab to seed postal master directory records.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold p-3">
                      <th className="p-3.5">Pincode</th>
                      <th className="p-3.5">Location details</th>
                      <th className="p-3.5">Postal Division & Circle</th>
                      <th className="p-3.5">GEO SAM Region</th>
                      <th className="p-3.5">Zone</th>
                      <th className="p-3.5 text-center">Metro</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredMappings.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5">
                          <span className="font-bold text-[#0F4C3A] text-sm block">{m.pincode}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {m.hasOverride ? (
                              <span className="text-amber-600 font-bold bg-amber-50 border border-amber-100 px-1 py-0.2 rounded">OVERRIDE</span>
                            ) : (
                              <span className="text-slate-400">SOURCE DATA</span>
                            )}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="block text-slate-800 font-bold">{m.city}</span>
                          <span className="block text-[10px] text-slate-400 font-light mt-0.5">
                            {m.district && `${m.district}, `}{m.state}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="block text-slate-800 font-bold">{m.postalDivision || 'Default'}</span>
                          <span className="block text-[10px] text-slate-400 font-light mt-0.5">
                            Circle: {m.postalCircle || 'Default'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-black text-[9px] tracking-wider uppercase">
                            {m.geoRegion}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-600">{m.zone}</td>
                        <td className="p-3.5 text-center">
                          {m.isMetro ? (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-150 px-2.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide">
                              METRO
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {m.isServiceable ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[9px]">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold text-[9px]">
                              BLOCKED
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditPincode(m)}
                              className="bg-slate-100 hover:bg-[#E8F5E9] text-[#0F4C3A] py-1 px-2.5 rounded font-bold transition text-[10px] border border-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePincode(m.id, m.pincode)}
                              className="p-1 hover:bg-red-50 rounded text-red-500 transition"
                              title="Delete mapping"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'metros' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Metro Locations Mappings</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Metropolitan city locations that commercial operations classify as Metro.</p>
            </div>
            {metros.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic">No metro locations configured.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold p-3">
                    <th className="p-3">City Name</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {metros.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-850">{m.name}</td>
                      <td className="p-3 text-center">
                        {m.isActive ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded font-bold text-[9px]">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="bg-slate-50 text-slate-400 border border-slate-200 px-2 py-0.5 rounded font-bold text-[9px]">
                            DISABLED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteMetro(m.id, m.name)}
                          className="p-1 hover:bg-red-50 rounded text-red-500 transition mx-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'states' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">State to Commercial Region Matrix</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Maps postal states to Commercial Regions (South, North, East, West) in rate matrix cards.</p>
            </div>
            {states.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic">No state mappings configured. Mappings default to postal circle zones.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold p-3">
                    <th className="p-3">State Name</th>
                    <th className="p-3">Commercial Region</th>
                    <th className="p-3">Zone Mapping</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {states.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800">{s.state}</td>
                      <td className="p-3">
                        <span className="bg-teal-50 text-teal-800 border border-teal-150 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider">
                          {s.regionName}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-650">{s.zoneName}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteState(s.id, s.state)}
                          className="p-1 hover:bg-red-50 rounded text-red-500 transition mx-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'import' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Import seed panel */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#1E8262]" />
                  Seed Master Postal Directory
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal font-light">
                  Instantly seed the database with major test pincodes for Indian Metros and regional centers (Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Pune, Hyderabad, Ahmedabad).
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="block font-bold text-[9px] text-slate-400 uppercase">Preset Seed Codes</span>
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_SEED_PINCODES.map(p => (
                    <span key={p.pincode} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[9px]">
                      {p.pincode}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => triggerImport(PRESET_SEED_PINCODES)}
                disabled={saving}
                className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-200 text-white font-bold py-2 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Seeding Master Directory...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Seed Master Directory (Presets)
                  </>
                )}
              </button>
            </div>

            {/* Custom Import Panel */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#1E8262]" />
                  Upload Custom Master JSON
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal font-light">
                  Paste a JSON array containing India Post pincode records. Duplicates will be consolidated and overrides preserved.
                </p>
              </div>

              <textarea
                placeholder={`[\n  {\n    "pincode": "560001",\n    "state": "Karnataka",\n    "city": "Bengaluru",\n    "postOffice": "Bengaluru GPO"\n  }\n]`}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={5}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[10px] focus:outline-none focus:bg-white focus:border-[#1E8262] transition shadow-inner"
              />

              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(importJson);
                    if (!Array.isArray(parsed)) throw new Error('Root must be an array.');
                    triggerImport(parsed);
                  } catch (e: any) {
                    setError('Invalid JSON input: ' + e.message);
                  }
                }}
                disabled={saving || !importJson.trim()}
                className="w-full bg-[#1E8262] hover:bg-[#0F4C3A] disabled:bg-slate-200 text-white font-bold py-2 px-4 rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing upload...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Import Postal JSON Directory
                  </>
                )}
              </button>
            </div>

            {/* Import Summary Result */}
            {importSummary && (
              <div className="md:col-span-2 bg-[#E8F5E9] border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-3">
                <span className="block font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Import Statistics Summary
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="block text-[8px] text-slate-400 font-bold uppercase mb-1">Total Input</span>
                    <strong className="text-slate-800 text-sm">{importSummary.totalRecords}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="block text-[8px] text-slate-400 font-bold uppercase mb-1">Unique Codes</span>
                    <strong className="text-slate-800 text-sm">{importSummary.uniqueProcessed}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="block text-[8px] text-emerald-700 font-bold uppercase mb-1">Added New</span>
                    <strong className="text-emerald-700 text-sm font-black">+{importSummary.added}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="block text-[8px] text-amber-700 font-bold uppercase mb-1">Updated Metadata</span>
                    <strong className="text-amber-700 text-sm font-black">{importSummary.updated}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="block text-[8px] text-red-600 font-bold uppercase mb-1">Duplicates Skip</span>
                    <strong className="text-red-650 text-sm font-semibold">{importSummary.duplicates}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT PINCODE MODAL */}
      <Modal
        isOpen={pincodeModalOpen}
        onClose={() => setPincodeModalOpen(false)}
        title={editingPincode ? `Edit Pincode Mapping Override: ${pincode}` : 'Add Pincode Master Record'}
        size="md"
      >
        <form onSubmit={handlePincodeSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pincode (6-Digits)</label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="e.g. 560001"
              disabled={!!editingPincode}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">City Name</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bengaluru"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">State Name</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Karnataka"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">District (Optional)</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Bengaluru Urban"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">GEO SAM Commercial Region</label>
              <select
                value={geoRegion}
                onChange={(e) => setGeoRegion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-650 focus:outline-none"
              >
                <option value="METRO">METRO</option>
                <option value="SOUTH">SOUTH</option>
                <option value="WEST">WEST</option>
                <option value="NORTH">NORTH</option>
                <option value="EAST">EAST</option>
                <option value="NORTH EAST">NORTH EAST</option>
                <option value="ROI">ROI</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Geographical Zone</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-650 focus:outline-none"
              >
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="North East">North East</option>
                <option value="ROI">ROI</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-100">
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={isMetro}
                onChange={(e) => setIsMetro(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1E8262]"></div>
              <span className="ml-1.5 text-[9px] font-bold text-slate-500 uppercase leading-none">Metro Area</span>
            </label>

            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={isServiceable}
                onChange={(e) => setIsServiceable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1E8262]"></div>
              <span className="ml-1.5 text-[9px] font-bold text-slate-500 uppercase leading-none">Serviceable</span>
            </label>

            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={customOverride}
                onChange={(e) => setCustomOverride(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1E8262]"></div>
              <span className="ml-1.5 text-[9px] font-bold text-slate-500 uppercase leading-none text-amber-600 font-black">Override Flag</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setPincodeModalOpen(false)}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-5 rounded-lg text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-6 rounded-lg text-xs font-bold transition shadow-md"
            >
              {saving ? 'Saving...' : 'Save Pincode Map'}
            </button>
          </div>
        </form>
      </Modal>

      {/* METRO LOCATION MODAL */}
      <Modal
        isOpen={metroModalOpen}
        onClose={() => setMetroModalOpen(false)}
        title="Add Metro Location mapping"
        size="sm"
      >
        <form onSubmit={handleMetroSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">City Name</label>
            <input
              type="text"
              value={metroName}
              onChange={(e) => setMetroName(e.target.value)}
              placeholder="e.g. Pune"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={metroActive}
                onChange={(e) => setMetroActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1E8262]"></div>
              <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase leading-none">Metro Active Status</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setMetroModalOpen(false)}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-5 rounded-lg text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-6 rounded-lg text-xs font-bold transition shadow-md"
            >
              {saving ? 'Saving...' : 'Save Metro Location'}
            </button>
          </div>
        </form>
      </Modal>

      {/* STATE MAPPING MODAL */}
      <Modal
        isOpen={stateModalOpen}
        onClose={() => setStateModalOpen(false)}
        title="Add State Region Matrix Mapping"
        size="sm"
      >
        <form onSubmit={handleStateSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">State Name</label>
            <input
              type="text"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder="e.g. Maharashtra"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Commercial Region</label>
              <select
                value={stateRegion}
                onChange={(e) => setStateRegion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-650 focus:outline-none"
              >
                <option value="METRO">METRO</option>
                <option value="SOUTH">SOUTH</option>
                <option value="WEST">WEST</option>
                <option value="NORTH">NORTH</option>
                <option value="EAST">EAST</option>
                <option value="NORTH EAST">NORTH EAST</option>
                <option value="ROI">ROI</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Geographical Zone</label>
              <select
                value={stateZone}
                onChange={(e) => setStateZone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-650 focus:outline-none"
              >
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="North East">North East</option>
                <option value="ROI">ROI</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setStateModalOpen(false)}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-5 rounded-lg text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-6 rounded-lg text-xs font-bold transition shadow-md"
            >
              {saving ? 'Saving...' : 'Save State Mapping'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
