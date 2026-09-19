'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Search,
  Users,
  CreditCard,
  Smartphone,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
} from 'lucide-react';

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function loadOrganizations() {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);

      const res = await fetch(`/api/admin/organizations?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load organizations.');
      }
    } catch (err: any) {
      setError(err.message || 'Server error loading organizations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadOrganizations();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Customer Organizations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise customer organizations, owners, provisioned administrators, subscriptions, and staff licensing
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by organization name..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1E8262]"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-4 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Organizations Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 text-xs">
          No customer organizations found.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Customer Owner</th>
                  <th className="py-3 px-4">Organization Admin</th>
                  <th className="py-3 px-4">Subscription</th>
                  <th className="py-3 px-4">Device Usage</th>
                  <th className="py-3 px-4">Staff Licenses</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center font-bold text-sm shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block">{org.name}</span>
                          <span className="text-[10px] text-slate-400">
                            Created {new Date(org.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {org.owner ? (
                        <div>
                          <span className="font-bold text-slate-800 block">{org.owner.name}</span>
                          <span className="text-[11px] text-slate-500 block">{org.owner.email}</span>
                          <span className="text-[10px] text-slate-400">{org.owner.mobile}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No Owner Linked</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {org.adminUser ? (
                        <div>
                          <span className="font-bold text-[#0F4C3A] block">{org.adminUser.name}</span>
                          <span className="text-[11px] text-slate-600 block">{org.adminUser.email}</span>
                          {org.adminUser.mustChangePassword && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                              Setup Pending
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-600 text-[11px] font-semibold italic">Awaiting Provisioning</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {org.activeSubscription ? (
                        <div>
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            {org.activeSubscription.planName}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1">
                            Expires {new Date(org.activeSubscription.endDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[11px] font-bold">
                          No Active Plan
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">
                          {org.activeDevicesCount} / {org.deviceLimit}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span className="font-bold">{org.activeLicensesCount} Active</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">Total ordered: {org.licensesCount}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          org.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
