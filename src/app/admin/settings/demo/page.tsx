'use client';

import React, { useEffect, useState } from 'react';
import { Settings, CheckCircle2, Loader2 } from 'lucide-react';

export default function AdminDemoSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [demoDurationDays, setDemoDurationDays] = useState('10');
  const [maxCustomRateCards, setMaxCustomRateCards] = useState('50');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings/demo');
        if (res.ok) {
          const data = await res.json();
          setDemoDurationDays(data.demoDurationDays.toString());
          setMaxCustomRateCards(data.maxCustomRateCards.toString());
        }
      } catch (err) {
        console.error('Failed to load demo settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const duration = parseInt(demoDurationDays);
    const limit = parseInt(maxCustomRateCards);

    if (isNaN(duration) || duration <= 0 || isNaN(limit) || limit < 0) {
      setError('Please provide valid numbers.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoDurationDays: duration, maxCustomRateCards: limit }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings.');
      }

      setMessage(data.message || 'Demo settings updated successfully.');
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">Demo settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure global demonstration validity durations and default safety limits</p>
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

      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider border-b pb-2 mb-4">
            Demo Account Configurations
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Demo Duration (Days)</label>
              <input
                type="number"
                value={demoDurationDays}
                onChange={(e) => setDemoDurationDays(e.target.value)}
                placeholder="10"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-[#1c2e24] focus:bg-white focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Custom Rate Cards (Safety Limit)</label>
              <input
                type="number"
                value={maxCustomRateCards}
                onChange={(e) => setMaxCustomRateCards(e.target.value)}
                placeholder="50"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-[#1c2e24] focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2.5 rounded-lg font-bold text-xs transition mt-6 shadow-md"
          >
            {saving ? 'Saving configurations...' : 'Save Demo Configurations'}
          </button>
        </form>
      </div>
    </div>
  );
}
