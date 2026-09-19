'use client';

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Eye,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Modal State for Add / Edit
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModuleKeys, setSelectedModuleKeys] = useState<string[]>([]);
  const [activeInput, setActiveInput] = useState(true);
  const [saving, setSaving] = useState(false);

  // View Modal State
  const [viewRole, setViewRole] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  async function loadRoles() {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);

      const res = await fetch(`/api/admin/roles?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
        setAvailableModules(data.availableModules || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load roles.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load roles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoles();
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadRoles();
  }

  function openAddModal() {
    setEditingRoleId(null);
    setName('');
    setDescription('');
    setSelectedModuleKeys([]);
    setActiveInput(true);
    setError('');
    setMessage('');
    setRoleModalOpen(true);
  }

  function openEditModal(role: any) {
    setEditingRoleId(role.id);
    setName(role.name);
    setDescription(role.description || '');
    setSelectedModuleKeys(role.moduleKeys || []);
    setActiveInput(role.active ?? true);
    setError('');
    setMessage('');
    setRoleModalOpen(true);
  }

  function toggleModuleSelection(key: string) {
    setSelectedModuleKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  // Calculate live monthly rate based on selected modules
  const currentCalculatedRate = availableModules
    .filter((m) => selectedModuleKeys.includes(m.key) && m.active)
    .reduce((sum, m) => sum + (m.monthlyPrice || 0), 0);

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }

    if (selectedModuleKeys.length === 0) {
      setError('Please select at least one module for this role.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRoleId || undefined,
          name: name.trim(),
          description: description.trim(),
          moduleKeys: selectedModuleKeys,
          active: activeInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save role.');
      }

      setMessage(data.message || 'Role saved successfully.');
      setRoleModalOpen(false);
      await loadRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(role: any) {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: role.id,
          active: !role.active,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle status.');
      }

      setMessage(data.message || `Role status updated.`);
      await loadRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle role status.');
    }
  }

  // Group available modules by category for clean modal display
  const modulesByCategory: Record<string, any[]> = {};
  availableModules.forEach((mod) => {
    const cat = mod.category || 'LOGISTICS';
    if (!modulesByCategory[cat]) modulesByCategory[cat] = [];
    modulesByCategory[cat].push(mod);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0F4C3A]" />
            <h1 className="text-xl font-bold text-[#0F4C3A]">Role & Module Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Define predefined roles and assign GEO TRANSIT modules. Customer Organization Admins select from these roles to provision user accounts.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Role
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

      {/* Toolbar / Search */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles by name or description..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-4 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="text-xs text-slate-500 font-medium">
          Total Roles: <strong className="text-slate-800">{roles.length}</strong>
        </div>
      </div>

      {/* Roles Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[220px]">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl text-slate-400 font-medium text-xs shadow-2xs">
          No roles found. Click &quot;Add Role&quot; to create a predefined role.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Role & Description</th>
                  <th className="px-5 py-3.5">Assigned Modules</th>
                  <th className="px-5 py-3.5">Monthly License Rate</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4 max-w-xs">
                      <span className="block font-extrabold text-sm text-slate-900">{role.name}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {role.description || 'No description provided'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {(role.modules || []).map((m: any) => (
                          <span
                            key={m.key}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-[#0F4C3A] border border-emerald-100 shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                            {m.name}
                          </span>
                        ))}
                      </div>
                      <span className="block text-[10px] text-slate-400 font-semibold mt-1">
                        {role.modulesCount} active modules included
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="block text-base font-extrabold text-[#0F4C3A]">
                        ₹{(role.calculatedMonthlyRate || 0).toLocaleString('en-IN')}
                        <span className="text-[10px] font-medium text-slate-400 ml-1">/ month</span>
                      </span>
                      <span className="block text-[9.5px] text-slate-400">
                        ₹{((role.calculatedMonthlyRate || 0) * 3).toLocaleString('en-IN')} (3M) • ₹
                        {((role.calculatedMonthlyRate || 0) * 6).toLocaleString('en-IN')} (6M)
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(role)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          role.active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title={role.active ? 'Click to Deactivate' : 'Click to Activate'}
                      >
                        {role.active ? (
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

                    <td className="px-5 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setViewRole(role);
                          setViewModalOpen(true);
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>

                      <button
                        onClick={() => openEditModal(role)}
                        className="py-1.5 px-3 rounded-lg bg-[#0F4C3A] hover:bg-[#1E8262] text-white text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Role Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRoleId ? `Edit Predefined Role — ${name}` : 'Create Predefined Role'}
        size="lg"
      >
        <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Role Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sales Executive"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#1E8262]"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Responsible for rate calculation & quotations"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
              />
            </div>
          </div>

          {/* Module Selection Checklist */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <span className="block font-extrabold text-sm text-slate-900">
                  Select Modules for this Role
                </span>
                <span className="text-[10px] text-slate-500">
                  Check modules that will be accessible to users assigned this role.
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">
                  Calculated Monthly Rate
                </span>
                <span className="block text-base font-black text-[#0F4C3A]">
                  ₹{currentCalculatedRate.toLocaleString('en-IN')} / mo
                </span>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
              {Object.entries(modulesByCategory).map(([cat, modList]) => (
                <div key={cat} className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                    {cat} MODULES
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {modList.map((m) => {
                      const selected = selectedModuleKeys.includes(m.key);
                      return (
                        <div
                          key={m.key}
                          onClick={() => toggleModuleSelection(m.key)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                            selected
                              ? 'bg-emerald-50/70 border-[#0F4C3A] text-slate-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {selected ? (
                              <CheckSquare className="w-4 h-4 text-[#0F4C3A]" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs truncate text-slate-900">
                                {m.name}
                              </span>
                              <span className="font-extrabold text-[10px] text-[#0F4C3A] shrink-0">
                                ₹{m.monthlyPrice}/mo
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                              {m.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="block font-bold text-slate-800">Role Active Status</span>
              <span className="block text-[10px] text-slate-400">
                Active roles appear in Customer Organization Admin account creation dropdown.
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
              onClick={() => setRoleModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-6 rounded-lg font-bold transition cursor-pointer shadow-sm"
            >
              {saving ? 'Saving Role...' : editingRoleId ? 'Save Role Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Role Modal */}
      {viewRole && viewModalOpen && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`Role Details — ${viewRole.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-[#F4F7F6] p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Role Name:</span>
                <span className="font-extrabold text-slate-900">{viewRole.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Description:</span>
                <span className="font-semibold text-slate-800">{viewRole.description || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Monthly Rate:</span>
                <span className="font-extrabold text-[#0F4C3A]">
                  ₹{(viewRole.calculatedMonthlyRate || 0).toLocaleString('en-IN')} / month
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Active Status:</span>
                <span
                  className={`font-bold ${viewRole.active ? 'text-emerald-700' : 'text-slate-400'}`}
                >
                  {viewRole.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Assigned Modules ({viewRole.modulesCount})
              </span>
              <div className="space-y-2">
                {(viewRole.modules || []).map((m: any) => (
                  <div
                    key={m.key}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <span className="block font-bold text-slate-800 text-xs">{m.name}</span>
                      <span className="block text-[9.5px] text-slate-400">{m.category}</span>
                    </div>
                    <span className="font-extrabold text-xs text-[#0F4C3A]">
                      ₹{m.monthlyPrice}/mo
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewModalOpen(false)}
                className="bg-[#0F4C3A] text-white py-1.5 px-4 rounded-lg font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
