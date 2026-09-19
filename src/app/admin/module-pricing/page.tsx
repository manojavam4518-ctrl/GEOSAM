'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Search,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminModulePricingPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [activeInput, setActiveInput] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadModules() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/modules');
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load modules.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load module pricing.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModules();
  }, []);

  function openEditModal(mod: any) {
    setSelectedModule(mod);
    setPriceInput(mod.monthlyPrice !== undefined ? String(mod.monthlyPrice) : '0');
    setActiveInput(mod.active ?? true);
    setError('');
    setMessage('');
    setEditModalOpen(true);
  }

  async function handleSavePrice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedModule) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedModule.id,
          monthlyPrice: parseFloat(priceInput),
          active: activeInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update module price.');
      }

      setMessage(data.message || 'Module pricing updated successfully.');
      setEditModalOpen(false);
      await loadModules();
    } catch (err: any) {
      setError(err.message || 'Failed to update module price.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(mod: any) {
    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: mod.id,
          active: !mod.active,
        }),
      });

      if (res.ok) {
        setMessage(`Status for module '${mod.name}' updated.`);
        await loadModules();
      }
    } catch (err) {
      console.error('Failed to toggle module status:', err);
    }
  }

  // Filter modules
  const filteredModules = modules.filter((m) => {
    const matchesSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.key.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = !categoryFilter || m.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#0F4C3A]" />
            <h1 className="text-xl font-bold text-[#0F4C3A]">Module-Level Pricing</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Define monthly license pricing and enable/disable existing GEO TRANSIT modules. Prices are stored in database and calculate user account licensing automatically.
          </p>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar / Search Filter */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules by name or key..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs p-1.5 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="LOGISTICS">Logistics</option>
            <option value="ORGANIZATION">Organization</option>
            <option value="SHOPPING">Shopping</option>
          </select>
        </div>
      </div>

      {/* Module Pricing Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[220px]">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl text-slate-400 font-medium text-xs shadow-2xs">
          No modules match the filter criteria.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Module Name & Details</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Monthly License Rate</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4 max-w-sm">
                      <span className="block font-extrabold text-sm text-slate-900">{mod.name}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {mod.description || 'Core GEO TRANSIT module'}
                      </span>
                      <span className="inline-block font-mono text-[9px] text-slate-400 mt-1">
                        KEY: {mod.key}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[9.5px] font-bold tracking-wider uppercase border ${
                          mod.category === 'LOGISTICS'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : mod.category === 'ORGANIZATION'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {mod.category}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="block text-base font-extrabold text-[#0F4C3A]">
                        ₹{(mod.monthlyPrice || 0).toLocaleString('en-IN')}
                        <span className="text-[10px] font-medium text-slate-400 ml-1">/ month</span>
                      </span>
                      <span className="block text-[9.5px] text-slate-400">
                        ₹{((mod.monthlyPrice || 0) * 3).toLocaleString('en-IN')} (3M) • ₹
                        {((mod.monthlyPrice || 0) * 6).toLocaleString('en-IN')} (6M) • ₹
                        {((mod.monthlyPrice || 0) * 12).toLocaleString('en-IN')} (12M)
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleStatus(mod)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          mod.active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title={mod.active ? 'Click to Deactivate' : 'Click to Activate'}
                      >
                        {mod.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-3 h-3 text-slate-400" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openEditModal(mod)}
                        className="py-1.5 px-3 rounded-lg bg-[#0F4C3A] hover:bg-[#1E8262] text-white text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit Rate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Module Rate Modal */}
      {selectedModule && editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Configure Module Rate — ${selectedModule.name}`}
          size="md"
        >
          <form onSubmit={handleSavePrice} className="space-y-4 text-xs">
            <div className="bg-[#F4F7F6] p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Module Identification
              </span>
              <span className="block text-sm font-extrabold text-[#0F4C3A]">{selectedModule.name}</span>
              <span className="block text-[11px] text-slate-500">{selectedModule.description}</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Monthly / License Rate (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-900 font-extrabold focus:bg-white focus:outline-none focus:border-[#1E8262]"
                  required
                  min="0"
                  step="1"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Note: Updating module prices updates future license calculations. Existing purchased licenses retain their historical locked price.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="block font-bold text-slate-800">Module Availability</span>
                <span className="block text-[10px] text-slate-400">
                  Allow this module to be included in new role configurations & licenses
                </span>
              </div>
              <input
                type="checkbox"
                checked={activeInput}
                onChange={(e) => setActiveInput(e.target.checked)}
                className="w-4 h-4 text-[#0F4C3A] rounded border-slate-300 focus:ring-[#0F4C3A] cursor-pointer"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-5 rounded-lg font-bold transition cursor-pointer shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Module Rate'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
