'use client';

import React, { useEffect, useState } from 'react';
import { formatDateIndian } from '@/utils/dateUtils';
import { Search, ShieldAlert, Loader2, CheckCircle2, UserCheck, UserX, Mail } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadUsers() {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search,
        status,
        page: page.toString(),
        limit: '10',
      });

      const res = await fetch(`/api/admin/users?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [page, status]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers();
  }

  async function handleResendAdminAccess(userId: string) {
    if (!confirm('Are you sure you want to reset and resend Organization Admin access credentials to this user?')) return;

    setActionLoading(userId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/users/resend-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend access email.');
      }

      setMessage(data.message || 'Admin access email resent successfully.');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleStatus(userId: string, currentStatus: string) {
    const targetStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to ${targetStatus === 'ACTIVE' ? 'enable' : 'disable'} this user account?`)) {
      return;
    }

    setActionLoading(userId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user status.');
      }

      setMessage(data.message || 'User status updated.');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">User Account Management</h1>
        <p className="text-xs text-slate-500 mt-1">Search, filter, view details, and enable/disable portal user accounts</p>
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

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-4 rounded-lg text-xs font-bold transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Filter Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs p-1.5 focus:bg-white focus:outline-none text-slate-700"
          >
            <option value="">All Accounts</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs">
          No users match the search filters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">User & Company</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Calcs Used</th>
                    <th className="px-4 py-3">Current Plan</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className="block font-bold text-slate-900">{u.name}</span>
                        <span className="block text-[10px] text-slate-500">{u.company}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <span className="block">{u.email}</span>
                        <span className="block text-[10px]">{u.mobile}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          u.role === 'ADMIN' ? 'bg-[#0F4C3A] text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">{u.calculationsCount} calcs</td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.hasActiveSubscription ? (
                          <div>
                            <span className="font-bold text-[#0F4C3A] block">{u.activeSubscription.planName}</span>
                            <span className="text-[10px] text-slate-400">
                              Expires: {formatDateIndian(u.activeSubscription.endDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">
                            Demo Sandbox
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {u.role !== 'ADMIN' && (
                          <>
                            <button
                              onClick={() => handleResendAdminAccess(u.id)}
                              disabled={actionLoading !== null}
                              className="py-1.5 px-3 rounded-lg text-[10px] font-bold bg-[#0F4C3A] hover:bg-[#1E8262] text-white transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 inline-flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Resend Access
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u.id, u.status)}
                              disabled={actionLoading !== null}
                              className={`py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 inline-flex items-center gap-1 shadow-xs cursor-pointer ${
                                u.status === 'ACTIVE'
                                  ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {actionLoading === u.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : u.status === 'ACTIVE' ? (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Activate
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 py-1.5 px-3 rounded-lg text-xs font-bold disabled:opacity-50 transition-all duration-180 hover:-translate-y-0.5 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-medium text-slate-500 self-center">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={page === pagination.pages}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-1.5 px-3 rounded-lg text-xs font-bold disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
