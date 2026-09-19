'use client';

import React, { useEffect, useState } from 'react';
import { Tags, Edit2, CheckCircle2, AlertCircle, Loader2, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminUserLicensePricingPage() {
  const [pricings, setPricings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(3);
  const [priceInput, setPriceInput] = useState('');
  const [activeInput, setActiveInput] = useState(true);

  async function loadPricing() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/user-license-pricing');
      if (res.ok) {
        const data = await res.json();
        setPricings(data.pricings || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load user license pricing.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user license pricing.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPricing();
  }, []);

  function openEditModal(pricingItem: any) {
    setSelectedDuration(pricingItem.duration);
    setPriceInput(pricingItem.price ? pricingItem.price.toString() : '0');
    setActiveInput(pricingItem.active ?? true);
    setEditModalOpen(true);
  }

  async function handleSavePrice(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/admin/user-license-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: selectedDuration,
          price: parseFloat(priceInput),
          active: activeInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save price configuration.');
      }

      setMessage(data.message || 'Pricing saved successfully.');
      setEditModalOpen(false);
      await loadPricing();
    } catch (err: any) {
      setError(err.message || 'Failed to update pricing.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: any) {
    try {
      const res = await fetch('/api/admin/user-license-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: item.duration,
          price: item.price,
          active: !item.active,
        }),
      });
      if (res.ok) {
        setMessage(`${item.duration}-Month pricing status updated.`);
        await loadPricing();
      }
    } catch (err) {
      console.error('Failed to toggle pricing status:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-[#0F4C3A]" />
            <h1 className="text-xl font-bold text-[#0F4C3A]">Additional User License Pricing</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure standalone individual user license prices for 3, 6, and 12-month durations.
          </p>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Pricing Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F4C3A]">
            Configured User License Durations & Rates
          </h2>
          <span className="text-[10px] text-slate-400 font-semibold">
            Prices are automatically synced to Customer Organization Admin UI
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">Loading pricing configurations...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Price (INR)</th>
                  <th className="px-6 py-4">Monthly Breakup</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[3, 6, 12].map((dur) => {
                  const item = pricings.find((p) => p.duration === dur) || {
                    duration: dur,
                    price: 0,
                    active: true,
                  };
                  const monthlyRate = item.price ? Math.round(item.price / dur) : 0;

                  return (
                    <tr key={dur} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0F4C3A] font-extrabold flex items-center justify-center text-xs border border-emerald-100">
                            {dur}M
                          </span>
                          <div>
                            <span className="block font-bold text-sm text-slate-900">{dur} Months</span>
                            <span className="block text-[10px] text-slate-400 font-medium">Individual User License</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-base font-extrabold text-[#0F4C3A]">
                          ₹{item.price ? item.price.toLocaleString('en-IN') : '0'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 font-medium">
                        ₹{monthlyRate.toLocaleString('en-IN')} / month
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            item.active
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {item.active ? (
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

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditModal(item)}
                          className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-3.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Price
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Price Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Configure ${selectedDuration}-Month Additional User License Price`}
        size="md"
      >
        <form onSubmit={handleSavePrice} className="space-y-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">License Duration</span>
            <span className="block text-base font-extrabold text-[#0F4C3A]">{selectedDuration} Months Individual User License</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Configured Price (INR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="e.g. 1499"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-900 font-extrabold focus:bg-white focus:outline-none focus:border-[#1E8262]"
                required
                min="0"
                step="1"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Note: Changing this price updates future purchase options. Existing purchased licenses retain their historical price.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="block font-bold text-slate-800">Active Status</span>
              <span className="block text-[10px] text-slate-400">Enable or disable this duration option in customer UI</span>
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
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-5 rounded-lg font-bold transition cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
