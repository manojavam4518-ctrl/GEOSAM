'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  Phone,
  Mail,
  MapPin,
  Loader2,
} from 'lucide-react';
import Modal from '@/components/Modal';

const LEAD_SOURCE_OPTIONS = [
  'BACKEND SALES LEAD',
  'RETAIL VISIT CUSTOMER',
  'MARKETING',
  'SUGGESTED BY CUSTOMER',
  'JD/IM',
  'ONLINE ENQUIRY',
];

const FURTHER_ACTION_OPTIONS = [
  'FIRST APPROACH PENDING',
  'GOOGLE FORM PENDING',
  'RE-APPROACH PENDING',
  'FOLLOW UP REQUIRED',
  'QUOTATION PENDING',
  'NOT REQUIRED',
  'SIGNED WITH DTDC',
  'MOBILE NOT REACHABLE',
  'NOT PICKED THE CALL',
  'QTN SENT & FOLLOWUP PENDING',
  'RATE CHALLENGE',
];

export default function AdminSalesFollowUpPage() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalLeads: 0,
    quotationsSent: 0,
    followUpRequired: 0,
    pending: 0,
    convertedSigned: 0,
    rateChallenges: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadSource, setSelectedLeadSource] = useState('');
  const [selectedFurtherAction, setSelectedFurtherAction] = useState('');

  // Detail Modal State
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    salesLeadSource: '',
    furtherAction: '',
    remarks: '',
  });

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      if (searchTerm) q.append('search', searchTerm);
      if (selectedLeadSource) q.append('leadSource', selectedLeadSource);
      if (selectedFurtherAction) q.append('furtherAction', selectedFurtherAction);

      const res = await fetch(`/api/sales-follow-up?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to load sales follow-ups.');

      const data = await res.json();
      setFollowUps(data.followUps || []);
      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'An error occurred loading sales follow-ups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedLeadSource, selectedFurtherAction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({
      companyName: item.companyName || '',
      contactPerson: item.contactPerson || '',
      phone: item.phone || '',
      email: item.email || '',
      salesLeadSource: item.salesLeadSource || '',
      furtherAction: item.furtherAction || 'FIRST APPROACH PENDING',
      remarks: item.remarks || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSavingEdit(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/sales-follow-up/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update follow-up record.');

      setMessage('Follow-up record updated successfully.');
      setEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sales follow-up record?')) return;

    try {
      const res = await fetch(`/api/sales-follow-up/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete record.');
      setMessage('Follow-up record removed.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Logistics Sales Follow-up Management</h1>
          <p className="text-xs text-slate-500 mt-1">Platform-wide sales leads, quotation tracking, and client follow-up status</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); loadData(); }}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Data
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Leads</span>
          <strong className="text-xl font-black text-slate-800 mt-1 block">{summary.totalLeads}</strong>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Quotations Sent</span>
          <strong className="text-xl font-black text-blue-600 mt-1 block">{summary.quotationsSent}</strong>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Follow-Up Required</span>
          <strong className="text-xl font-black text-amber-600 mt-1 block">{summary.followUpRequired}</strong>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pending Action</span>
          <strong className="text-xl font-black text-purple-600 mt-1 block">{summary.pending}</strong>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Signed / Converted</span>
          <strong className="text-xl font-black text-emerald-600 mt-1 block">{summary.convertedSigned}</strong>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rate Challenges</span>
          <strong className="text-xl font-black text-rose-600 mt-1 block">{summary.rateChallenges}</strong>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by company name, contact person, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex gap-3 flex-wrap text-xs">
          <select
            value={selectedLeadSource}
            onChange={(e) => setSelectedLeadSource(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="">All Lead Sources</option>
            {LEAD_SOURCE_OPTIONS.map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>

          <select
            value={selectedFurtherAction}
            onChange={(e) => setSelectedFurtherAction(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="">All Follow-up Actions</option>
            {FURTHER_ACTION_OPTIONS.map((act) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {followUps.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No sales follow-up records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Company & Contact</th>
                  <th className="px-4 py-3">Lead Source</th>
                  <th className="px-4 py-3">Follow-up Action</th>
                  <th className="px-4 py-3">Quotation No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {followUps.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <strong className="text-slate-900 font-bold block">{item.companyName}</strong>
                      <span className="text-slate-500 block text-[11px]">{item.contactPerson} • {item.phone}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {item.salesLeadSource || 'DIRECT'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.furtherAction?.includes('SIGNED') ? 'bg-emerald-100 text-emerald-800' :
                        item.furtherAction?.includes('PENDING') ? 'bg-amber-100 text-amber-800' :
                        item.furtherAction?.includes('CHALLENGE') ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.furtherAction}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {item.quotationNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {formatDateIndian(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedFollowUp(item)}
                        className="p-1.5 text-slate-500 hover:text-[#0F4C3A] hover:bg-emerald-50 rounded-lg transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit Record"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details View Modal */}
      {selectedFollowUp && (
        <Modal isOpen={!!selectedFollowUp} onClose={() => setSelectedFollowUp(null)} title="Sales Lead Details">
          <div className="space-y-4 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-sm font-bold text-slate-900">{selectedFollowUp.companyName}</h3>
              <p className="text-slate-500">Contact: <strong>{selectedFollowUp.contactPerson}</strong> ({selectedFollowUp.phone})</p>
              {selectedFollowUp.email && <p className="text-slate-500">Email: {selectedFollowUp.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Lead Source</span>
                <span className="font-semibold text-slate-800">{selectedFollowUp.salesLeadSource}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Action Status</span>
                <span className="font-bold text-[#0F4C3A]">{selectedFollowUp.furtherAction}</span>
              </div>
            </div>

            {selectedFollowUp.remarks && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Remarks & Notes</span>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600">{selectedFollowUp.remarks}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedFollowUp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Sales Lead">
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company Name</label>
              <input
                type="text"
                required
                value={editForm.companyName}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  required
                  value={editForm.contactPerson}
                  onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone</label>
                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Lead Source</label>
                <select
                  value={editForm.salesLeadSource}
                  onChange={(e) => setEditForm({ ...editForm, salesLeadSource: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-semibold"
                >
                  {LEAD_SOURCE_OPTIONS.map((src) => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Action Status</label>
                <select
                  value={editForm.furtherAction}
                  onChange={(e) => setEditForm({ ...editForm, furtherAction: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-semibold"
                >
                  {FURTHER_ACTION_OPTIONS.map((act) => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remarks</label>
              <textarea
                rows={3}
                value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-sans"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 bg-[#0F4C3A] hover:bg-[#1E8262] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Record
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
