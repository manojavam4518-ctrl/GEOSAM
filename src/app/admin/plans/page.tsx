'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Edit2,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  Users,
  Smartphone,
  Tags,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Editing dialog state
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [price3, setPrice3] = useState('');
  const [price6, setPrice6] = useState('');
  const [price12, setPrice12] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isRec, setIsRec] = useState(false);
  const [deviceLimit, setDeviceLimit] = useState('');
  const [customRateCardLimit, setCustomRateCardLimit] = useState('');
  const [systemRateCardAccess, setSystemRateCardAccess] = useState(false);
  const [rateComparisonEnabled, setRateComparisonEnabled] = useState(false);
  const [rateCardImportEnabled, setRateCardImportEnabled] = useState(false);
  const [rateCardExportEnabled, setRateCardExportEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadPlans() {
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  function startEdit(plan: any) {
    setEditingPlan(plan);
    setPrice3(plan.price3Months.toString());
    setPrice6(plan.price6Months.toString());
    setPrice12(plan.price12Months.toString());
    setIsActive(plan.active);
    setIsRec(plan.recommended);
    setDeviceLimit(plan.deviceLimit.toString());
    setCustomRateCardLimit(plan.customRateCardLimit ? plan.customRateCardLimit.toString() : '0');
    setSystemRateCardAccess(!!plan.systemRateCardAccess);
    setRateComparisonEnabled(!!plan.rateComparisonEnabled);
    setRateCardImportEnabled(!!plan.rateCardImportEnabled);
    setRateCardExportEnabled(!!plan.rateCardExportEnabled);
    setMessage('');
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlan) return;

    const p3 = parseFloat(price3);
    const p6 = parseFloat(price6);
    const p12 = parseFloat(price12);
    const devLim = parseInt(deviceLimit);
    const rateLim = parseInt(customRateCardLimit);

    if (isNaN(p3) || p3 < 0 || isNaN(p6) || p6 < 0 || isNaN(p12) || p12 < 0) {
      setError('Prices must be positive numbers.');
      return;
    }

    if (isNaN(devLim) || devLim <= 0 || isNaN(rateLim) || rateLim < 0) {
      setError('Limits must be valid non-negative integers.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPlan.id,
          price3Months: p3,
          price6Months: p6,
          price12Months: p12,
          active: isActive,
          recommended: isRec,
          deviceLimit: devLim,
          customRateCardLimit: rateLim,
          systemRateCardAccess,
          rateComparisonEnabled,
          rateCardImportEnabled,
          rateCardExportEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save plan.');
      }

      setMessage(data.message || 'Pricing tiers and entitlements updated.');
      setEditingPlan(null);
      await loadPlans();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
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
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">Configure Subscription Tiers</h1>
        <p className="text-xs text-slate-500 mt-1">Configure pricing rates and feature entitlements for the global plans</p>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Plans List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between ${
              plan.recommended ? 'border-2 border-[#1E8262]' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{plan.name}</span>
                {plan.recommended && (
                  <span className="bg-[#E8F5E9] text-[#0F4C3A] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-100">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-light leading-snug">
                Limit: {plan.deviceLimit} simultaneous client sessions. Custom Rate Cards: {plan.customRateCardLimit ?? 0}. Account visibility: {plan.active ? 'Active' : 'Deactivated'}.
              </p>

              <div className="mt-3 space-y-1 text-[11px] text-slate-500 font-medium">
                <div className="flex justify-between">
                  <span>System Rate Cards Access</span>
                  <span className={plan.systemRateCardAccess ? 'text-emerald-600' : 'text-red-500'}>
                    {plan.systemRateCardAccess ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Comparison Engine</span>
                  <span className={plan.rateComparisonEnabled ? 'text-emerald-600' : 'text-red-500'}>
                    {plan.rateComparisonEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>3 Months Price</span>
                  <span className="font-bold text-slate-800">₹{plan.price3Months}</span>
                </div>
                <div className="flex justify-between">
                  <span>6 Months Price</span>
                  <span className="font-bold text-slate-800">₹{plan.price6Months}</span>
                </div>
                <div className="flex justify-between">
                  <span>12 Months Price</span>
                  <span className="font-bold text-[#0F4C3A] text-sm">₹{plan.price12Months}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => startEdit(plan)}
              className="w-full bg-[#F4F7F6] hover:bg-[#E8F5E9] text-[#0F4C3A] py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-200 hover:border-[#1E8262] shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Adjust Plan & Entitlements
            </button>
          </div>
        ))}
      </div>

      {/* EDITING DIALOG MODAL */}
      <Modal
        isOpen={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        title={editingPlan ? `Edit Subscription: ${editingPlan.name}` : ''}
        size="md"
      >

            <form onSubmit={handleSave} className="space-y-4">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">PRICING TIERS</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">3 Months Price</label>
                  <input
                    type="number"
                    value={price3}
                    onChange={(e) => setPrice3(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">6 Months Price</label>
                  <input
                    type="number"
                    value={price6}
                    onChange={(e) => setPrice6(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">12 Months Price</label>
                  <input
                    type="number"
                    value={price12}
                    onChange={(e) => setPrice12(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-[#0F4C3A] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2">FEATURE ENTITLEMENTS</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Max Active Devices</label>
                  <input
                    type="number"
                    value={deviceLimit}
                    onChange={(e) => setDeviceLimit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Max Custom Rate Cards</label>
                  <input
                    type="number"
                    value={customRateCardLimit}
                    onChange={(e) => setCustomRateCardLimit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">System Rate Cards Access</span>
                    <span className="block text-[9px] text-slate-400 leading-none mt-1">Allows using DTDC / official templates</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemRateCardAccess}
                      onChange={(e) => setSystemRateCardAccess(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Rate Comparison</span>
                    <span className="block text-[9px] text-slate-400 leading-none mt-1">Allows comparing courier slab prices</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rateComparisonEnabled}
                      onChange={(e) => setRateComparisonEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Rate Card Import</span>
                    <span className="block text-[9px] text-slate-400 leading-none mt-1">Allows importing pricing sheets via CSV</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rateCardImportEnabled}
                      onChange={(e) => setRateCardImportEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Rate Card Export</span>
                    <span className="block text-[9px] text-slate-400 leading-none mt-1">Allows exporting pricing sheets</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rateCardExportEnabled}
                      onChange={(e) => setRateCardExportEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
                  </label>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between border-t border-b border-slate-100 py-3 mt-4">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Plan Recommended</span>
                  <span className="block text-[9px] text-slate-400 leading-none mt-1">Highlights plan in UI checkout selection</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRec}
                    onChange={(e) => setIsRec(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Plan Visibility Status</span>
                  <span className="block text-[9px] text-slate-400 leading-none mt-1">Toggles plan checkout accessibility</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-1.5 px-4 rounded-lg text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-1.5 px-5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                >
                  {saving ? 'Saving details...' : 'Save Adjustments'}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
