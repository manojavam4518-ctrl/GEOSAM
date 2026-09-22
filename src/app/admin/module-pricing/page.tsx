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
  Plus,
  Layers,
  Sparkles,
  Info,
  Settings,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminModulePricingPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add Module Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addKey, setAddKey] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addCategory, setAddCategory] = useState<'LOGISTICS' | 'ORGANIZATION' | 'SHOPPING'>('LOGISTICS');
  const [addMonthlyPrice, setAddMonthlyPrice] = useState('500');
  const [addPrice3Months, setAddPrice3Months] = useState('1500');
  const [addPrice6Months, setAddPrice6Months] = useState('3000');
  const [addPrice12Months, setAddPrice12Months] = useState('6000');
  const [addActive, setAddActive] = useState(true);
  const [adding, setAdding] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('LOGISTICS');
  const [price1Month, setPrice1Month] = useState('');
  const [price3Months, setPrice3Months] = useState('');
  const [price6Months, setPrice6Months] = useState('');
  const [price12Months, setPrice12Months] = useState('');
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

  function openAddModal() {
    setAddName('');
    setAddKey('');
    setAddDescription('');
    setAddCategory('LOGISTICS');
    setAddMonthlyPrice('500');
    setAddPrice3Months('1500');
    setAddPrice6Months('3000');
    setAddPrice12Months('6000');
    setAddActive(true);
    setError('');
    setMessage('');
    setAddModalOpen(true);
  }

  function handleAddMonthlyPriceChange(val: string) {
    setAddMonthlyPrice(val);
    const p = parseFloat(val) || 0;
    setAddPrice3Months(String(Math.round(p * 3)));
    setAddPrice6Months(String(Math.round(p * 6)));
    setAddPrice12Months(String(Math.round(p * 12)));
  }

  async function handleCreateModule(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) {
      setError('Module name is required.');
      return;
    }

    setAdding(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          key: addKey.trim() || undefined,
          description: addDescription.trim(),
          category: addCategory,
          monthlyPrice: parseFloat(addMonthlyPrice) || 0,
          price3Months: parseFloat(addPrice3Months) || 0,
          price6Months: parseFloat(addPrice6Months) || 0,
          price12Months: parseFloat(addPrice12Months) || 0,
          active: addActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create module.');
      }

      setMessage(data.message || 'Module created successfully.');
      setAddModalOpen(false);
      await loadModules();
    } catch (err: any) {
      setError(err.message || 'Failed to create module.');
    } finally {
      setAdding(false);
    }
  }

  function openEditModal(mod: any) {
    setSelectedModule(mod);
    setEditName(mod.name || '');
    setEditDescription(mod.description || '');
    setEditCategory(mod.category || 'LOGISTICS');
    setPrice1Month(mod.monthlyPrice !== undefined ? String(mod.monthlyPrice) : '0');
    setPrice3Months(mod.price3Months !== undefined ? String(mod.price3Months) : String((mod.monthlyPrice || 0) * 3));
    setPrice6Months(mod.price6Months !== undefined ? String(mod.price6Months) : String((mod.monthlyPrice || 0) * 6));
    setPrice12Months(mod.price12Months !== undefined ? String(mod.price12Months) : String((mod.monthlyPrice || 0) * 12));
    setActiveInput(mod.active ?? true);
    setError('');
    setMessage('');
    setEditModalOpen(true);
  }

  function handleEdit1MonthChange(val: string) {
    setPrice1Month(val);
    const p = parseFloat(val) || 0;
    // Auto-fill multi-tiers if they matched previous multiples
    setPrice3Months(String(Math.round(p * 3)));
    setPrice6Months(String(Math.round(p * 6)));
    setPrice12Months(String(Math.round(p * 12)));
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
          name: editName.trim(),
          description: editDescription.trim(),
          category: editCategory,
          monthlyPrice: parseFloat(price1Month) || 0,
          price3Months: parseFloat(price3Months) || 0,
          price6Months: parseFloat(price6Months) || 0,
          price12Months: parseFloat(price12Months) || 0,
          active: activeInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update module pricing.');
      }

      setMessage(data.message || 'Module pricing updated successfully.');
      setEditModalOpen(false);
      await loadModules();
    } catch (err: any) {
      setError(err.message || 'Failed to update module pricing.');
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
        setMessage(`Status for module '${mod.name}' updated to ${!mod.active ? 'Active' : 'Inactive'}.`);
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
            <h1 className="text-xl font-bold text-[#0F4C3A]">Platform Module & Pricing Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Super Admin module configuration: define multi-duration license rates (1M, 3M, 6M, 12M) and toggle module availability. Prices are saved to database and power customer employee licensing.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Module</span>
        </button>
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
            placeholder="Search modules by name, key, or description..."
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
            <option value="">All Categories ({modules.length})</option>
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
                  <th className="px-5 py-3.5">Module Name & Key</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">1-Month</th>
                  <th className="px-5 py-3.5">3-Months</th>
                  <th className="px-5 py-3.5">6-Months</th>
                  <th className="px-5 py-3.5">12-Months</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4 max-w-xs">
                      <span className="block font-extrabold text-sm text-slate-900">{mod.name}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
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
                      <span className="block text-sm font-extrabold text-[#0F4C3A]">
                        ₹{(mod.monthlyPrice || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] text-slate-400">1 Month</span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="block text-sm font-extrabold text-slate-800">
                        ₹{(mod.price3Months ?? (mod.monthlyPrice || 0) * 3).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] text-slate-400">3 Months</span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="block text-sm font-extrabold text-slate-800">
                        ₹{(mod.price6Months ?? (mod.monthlyPrice || 0) * 6).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] text-slate-400">6 Months</span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="block text-sm font-extrabold text-slate-800">
                        ₹{(mod.price12Months ?? (mod.monthlyPrice || 0) * 12).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] text-slate-400">12 Months</span>
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
                      <div className="flex items-center justify-end gap-1.5">
                        {mod.key === 'COUNTER_CASH_LEDGER' && (
                          <a
                            href="/dashboard/cash-ledger"
                            className="py-1.5 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                            title="Super Admin: Configure Ledger Columns & Structure"
                          >
                            <Settings className="w-3 h-3 text-amber-700" />
                            Columns & Ledger
                          </a>
                        )}
                        <button
                          onClick={() => openEditModal(mod)}
                          className="py-1.5 px-3 rounded-lg bg-[#0F4C3A] hover:bg-[#1E8262] text-white text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit Rates
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Add New Platform Module"
          size="lg"
        >
          <form onSubmit={handleCreateModule} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Module Name *
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Weight Calculator"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#1E8262]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Module Key (Optional)
                </label>
                <input
                  type="text"
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                  placeholder="e.g. WEIGHT_CALCULATOR"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Description
              </label>
              <textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Brief summary of what this module allows employees to access..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Category
              </label>
              <select
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-[#1E8262]"
              >
                <option value="LOGISTICS">Logistics</option>
                <option value="ORGANIZATION">Organization</option>
                <option value="SHOPPING">Shopping</option>
              </select>
            </div>

            {/* Pricing Tiers Matrix */}
            <div className="bg-[#F4F7F6] p-3.5 rounded-xl border border-slate-200 space-y-3">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Multi-Duration Pricing Matrix (INR)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">1 Month</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={addMonthlyPrice}
                      onChange={(e) => handleAddMonthlyPriceChange(e.target.value)}
                      required
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">3 Months</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={addPrice3Months}
                      onChange={(e) => setAddPrice3Months(e.target.value)}
                      required
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">6 Months</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={addPrice6Months}
                      onChange={(e) => setAddPrice6Months(e.target.value)}
                      required
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">12 Months</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={addPrice12Months}
                      onChange={(e) => setAddPrice12Months(e.target.value)}
                      required
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="block font-bold text-slate-800">Module Availability</span>
                <span className="block text-[10px] text-slate-400">
                  Allow this module to be immediately selectable by Organization Admins
                </span>
              </div>
              <input
                type="checkbox"
                checked={addActive}
                onChange={(e) => setAddActive(e.target.checked)}
                className="w-4 h-4 text-[#0F4C3A] rounded border-slate-300 focus:ring-[#0F4C3A] cursor-pointer"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-5 rounded-lg font-bold transition cursor-pointer shadow-sm"
              >
                {adding ? 'Creating...' : 'Create Module'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Module Rate Modal */}
      {selectedModule && editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Configure Module — ${selectedModule.name}`}
          size="lg"
        >
          <form onSubmit={handleSavePrice} className="space-y-4 text-xs">
            <div className="bg-[#F4F7F6] p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Module Identification
                </span>
                <span className="font-mono text-[9.5px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  KEY: {selectedModule.key}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="LOGISTICS">Logistics</option>
                    <option value="ORGANIZATION">Organization</option>
                    <option value="SHOPPING">Shopping</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded p-2 text-xs text-slate-700"
                />
              </div>
            </div>

            {/* Pricing Tiers Matrix */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider">
                Multi-Duration License Rates (INR)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    1 Month
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={price1Month}
                      onChange={(e) => handleEdit1MonthChange(e.target.value)}
                      required
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#1E8262]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    3 Months
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={price3Months}
                      onChange={(e) => setPrice3Months(e.target.value)}
                      required
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#1E8262]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    6 Months
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={price6Months}
                      onChange={(e) => setPrice6Months(e.target.value)}
                      required
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#1E8262]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    12 Months
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={price12Months}
                      onChange={(e) => setPrice12Months(e.target.value)}
                      required
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#1E8262]"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400">
                Updating prices applies immediately to new user account licenses and additions. Existing active licenses remain unaffected.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="block font-bold text-slate-800">Module Availability</span>
                <span className="block text-[10px] text-slate-400">
                  Allow this module to be included in new customer employee licenses
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
                {saving ? 'Saving...' : 'Save Module Rates'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
