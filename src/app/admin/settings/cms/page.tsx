'use client';

import React, { useEffect, useState } from 'react';
import { Layout, CheckCircle2, Loader2 } from 'lucide-react';

export default function AdminCmsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [footerText, setFooterText] = useState('');

  useEffect(() => {
    async function loadCms() {
      try {
        const res = await fetch('/api/admin/settings/cms');
        if (res.ok) {
          const data = await res.json();
          const c = data.cms;
          setHeroHeadline(c.heroHeadline || '');
          setHeroSubtitle(c.heroSubtitle || '');
          setSupportEmail(c.supportEmail || '');
          setFooterText(c.footerText || '');
        }
      } catch (err) {
        console.error('Failed to load CMS settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCms();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!heroHeadline || !heroSubtitle || !supportEmail || !footerText) {
      setError('All CMS settings fields are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroHeadline, heroSubtitle, supportEmail, footerText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings.');
      }

      setMessage(data.message || 'CMS settings updated successfully.');
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
        <h1 className="text-xl font-bold text-[#0F4C3A]">Website CMS Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage public landing page details including hero headers and footer tags</p>
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
            Landing Page Content
          </span>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hero Main Headline</label>
            <input
              type="text"
              value={heroHeadline}
              onChange={(e) => setHeroHeadline(e.target.value)}
              placeholder="Calculate. Track. Manage. Ship Smarter."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-[#1c2e24] focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hero Subtitle Description</label>
            <textarea
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="GEO TRANSIT is an enterprise logistics utility platform..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 min-h-[80px] focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Support Contact Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@geotransit.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Footer Copyright Text</label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="© 2026 GEO TRANSIT. All rights reserved."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:bg-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2.5 rounded-lg font-bold text-xs transition mt-6 shadow-md"
          >
            {saving ? 'Saving modifications...' : 'Save CMS Configurations'}
          </button>
        </form>
      </div>
    </div>
  );
}
