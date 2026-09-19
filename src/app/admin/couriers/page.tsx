'use client';

import React, { useEffect, useState } from 'react';
import { Navigation, Plus, Edit2, Trash2, CheckCircle2, Loader2, X } from 'lucide-react';
import Modal from '@/components/Modal';
import OperatorAvatar from '@/components/OperatorAvatar';
import { COURIER_LOGOS, resolveCourierLogo } from '@/utils/courierLogos';

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Editing/Adding Dialog States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [pincodeServiceabilityUrl, setPincodeServiceabilityUrl] = useState('');
  const [active, setActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadCouriers() {
    try {
      const res = await fetch('/api/admin/couriers');
      if (res.ok) {
        const data = await res.json();
        setCouriers(data.couriers || []);
      }
    } catch (err) {
      console.error('Failed to load couriers:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCouriers();
  }, []);

  function startAdd() {
    setEditingId(null);
    setName('');
    setTrackingUrl('');
    setPincodeServiceabilityUrl('');
    setActive(true);
    setDisplayOrder('0');
    setLogoUrl('');
    setMessage('');
    setError('');
    setModalOpen(true);
  }

  function startEdit(courier: any) {
    setEditingId(courier.id);
    setName(courier.name);
    setTrackingUrl(courier.trackingUrl);
    setPincodeServiceabilityUrl(courier.pincodeServiceabilityUrl);
    setActive(courier.active);
    setDisplayOrder(courier.displayOrder.toString());
    setLogoUrl(courier.logoUrl || '');
    setMessage('');
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/couriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          name,
          trackingUrl: trackingUrl || null,
          pincodeServiceabilityUrl: pincodeServiceabilityUrl || null,
          active,
          displayOrder: parseInt(displayOrder) || 0,
          logoUrl: logoUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save courier.');
      }

      setMessage(data.message || 'Courier saved.');
      setModalOpen(false);
      await loadCouriers();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to DELETE this courier partner? This action cannot be undone.')) {
      return;
    }

    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/couriers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete courier.');
      }

      setMessage(data.message || 'Courier deleted.');
      await loadCouriers();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Courier Partners settings</h1>
          <p className="text-xs text-slate-500 mt-1">Configure logistics hyperlinked tracking and pincode service portals</p>
        </div>
        
        <button
          onClick={startAdd}
          className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Courier Partner
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Couriers list */}
      {couriers.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs">
          No courier partners configured. Click Add to insert a new company.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Display Order</th>
                  <th className="px-6 py-4">Courier Name</th>
                  <th className="px-6 py-4">Tracking URL</th>
                  <th className="px-6 py-4">Pincode Check URL</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {couriers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-500">{c.displayOrder}</td>
                     <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <OperatorAvatar name={c.name} size="sm" />
                        <span className="font-bold text-slate-900">{c.name}</span>
                      </div>
                     </td>
                    <td className="px-6 py-4 truncate max-w-xs text-slate-500 font-mono text-[10px]" title={c.trackingUrl || ''}>
                      {c.trackingUrl || '—'}
                    </td>
                    <td className="px-6 py-4 truncate max-w-xs text-slate-500 font-mono text-[10px]" title={c.pincodeServiceabilityUrl || ''}>
                      {c.pincodeServiceabilityUrl || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.active ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(c)}
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-1.5 rounded-lg transition shadow-sm"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="bg-white border border-red-100 hover:bg-red-50 text-red-600 p-1.5 rounded-lg transition shadow-sm"
                          title="Delete"
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
        </div>
      )}

      {/* Add / Edit Partner Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Courier Partner' : 'Add Courier Partner'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Courier Company Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Delhivery, FedEx"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Display Order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none font-bold"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <span className="block text-xs font-bold text-slate-800">Status Active</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">Enable or disable operator visibility</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-4 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Partner'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
