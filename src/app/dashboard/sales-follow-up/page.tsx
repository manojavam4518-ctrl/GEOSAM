'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Download,
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
  Scale,
  ShieldAlert,
  Loader2,
  ChevronRight,
  Send,
  Sparkles,
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

export default function SalesFollowUpPage() {
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

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadSource, setSelectedLeadSource] = useState('');
  const [selectedFurtherAction, setSelectedFurtherAction] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('');

  // Detail Drawer State
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Manual Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    salesLeadSource: '',
    furtherAction: 'FIRST APPROACH PENDING',
    businessArea: '',
    quotationNumber: '',
    remarks: '',
  });

  // Quick Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    salesLeadSource: '',
    furtherAction: '',
    businessArea: '',
    remarks: '',
  });

  async function loadData() {
    try {
      setRefreshing(true);
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.set('search', searchTerm);
      if (selectedLeadSource) queryParams.set('leadSource', selectedLeadSource);
      if (selectedFurtherAction) queryParams.set('furtherAction', selectedFurtherAction);
      if (selectedServiceType) queryParams.set('serviceType', selectedServiceType);

      const res = await fetch(`/api/sales-follow-up?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data.followUps || []);
        if (data.summary) setSummary(data.summary);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load follow-up records.');
      }
    } catch (err: any) {
      console.error('Error fetching sales follow-ups:', err);
      setError('Failed to fetch sales follow-ups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedLeadSource, selectedFurtherAction, selectedServiceType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedLeadSource('');
    setSelectedFurtherAction('');
    setSelectedServiceType('');
    setTimeout(() => {
      loadData();
    }, 50);
  };

  const openDrawer = (item: any) => {
    setSelectedFollowUp(item);
    setDrawerOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditForm({
      companyName: item.companyName || '',
      contactPerson: item.contactPerson || '',
      phone: item.phone || '',
      email: item.email || '',
      salesLeadSource: item.salesLeadSource || '',
      furtherAction: item.furtherAction || 'QTN SENT & FOLLOWUP PENDING',
      businessArea: item.businessArea || '',
      remarks: item.remarks || '',
    });
    setEditModalOpen(true);
  };

  const handleQuickStatusChange = async (id: string, newAction: string) => {
    try {
      const res = await fetch(`/api/sales-follow-up/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ furtherAction: newAction }),
      });
      if (res.ok) {
        loadData();
        if (selectedFollowUp && selectedFollowUp.id === id) {
          const updatedRes = await fetch(`/api/sales-follow-up/${id}`);
          if (updatedRes.ok) {
            const data = await updatedRes.json();
            setSelectedFollowUp(data.followUp);
          }
        }
      }
    } catch (err) {
      console.error('Failed to update action:', err);
    }
  };

  const handleQuickLeadSourceChange = async (id: string, newSource: string) => {
    try {
      const res = await fetch(`/api/sales-follow-up/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesLeadSource: newSource }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to update lead source:', err);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSavingManual(true);
      const res = await fetch(`/api/sales-follow-up/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditModalOpen(false);
        loadData();
        if (selectedFollowUp && selectedFollowUp.id === editingItem.id) {
          const updatedRes = await fetch(`/api/sales-follow-up/${editingItem.id}`);
          if (updatedRes.ok) {
            const data = await updatedRes.json();
            setSelectedFollowUp(data.followUp);
          }
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update record.');
      }
    } catch (err) {
      console.error('Failed to save edit:', err);
    } finally {
      setSavingManual(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingManual(true);
      const res = await fetch('/api/sales-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setManualForm({
          companyName: '',
          contactPerson: '',
          phone: '',
          email: '',
          salesLeadSource: '',
          furtherAction: 'FIRST APPROACH PENDING',
          businessArea: '',
          quotationNumber: '',
          remarks: '',
        });
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create follow-up record.');
      }
    } catch (err) {
      console.error('Failed to create follow-up:', err);
    } finally {
      setSavingManual(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete follow-up record for "${name}"?`)) return;

    try {
      const res = await fetch(`/api/sales-follow-up/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedFollowUp?.id === id) setDrawerOpen(false);
        loadData();
      }
    } catch (err) {
      console.error('Failed to delete follow-up:', err);
    }
  };

  const handleExportCSV = () => {
    if (followUps.length === 0) return;

    const headers = [
      'Date',
      'Company Name',
      'Contact Person',
      'Phone Number',
      'Email ID',
      'Sales Lead Source',
      'Further Action',
      'Remarks',
      'Business Area',
      'Quotation Number',
      'Courier Company',
      'Service Type',
      'Actual Weight (KG)',
      'Volumetric Weight (KG)',
      'Chargeable Weight (KG)',
      'Calculated Rate (INR)',
    ];

    const rows = followUps.map((item) => [
      formatDateIndian(item.date),
      `"${item.companyName || ''}"`,
      `"${item.contactPerson || ''}"`,
      `"${item.phone || ''}"`,
      `"${item.email || ''}"`,
      `"${item.salesLeadSource || ''}"`,
      `"${item.furtherAction || ''}"`,
      `"${(item.remarks || '').replace(/"/g, '""')}"`,
      `"${item.businessArea || ''}"`,
      `"${item.quotationNumber || ''}"`,
      `"${item.courierCompany || ''}"`,
      `"${item.serviceType || ''}"`,
      item.actualWeight ?? '',
      item.volumetricWeight ?? '',
      item.chargeableWeight ?? '',
      item.calculatedRate ?? '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GEO_TRANSIT_Sales_FollowUp_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Styling Helper
  const getFurtherActionBadge = (action: string) => {
    switch (action) {
      case 'SIGNED WITH DTDC':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            Signed With Carrier
          </span>
        );
      case 'QTN SENT & FOLLOWUP PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200">
            <FileText className="w-3 h-3 text-blue-700" />
            Quote Sent & Pending
          </span>
        );
      case 'FOLLOW UP REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700" />
            Follow Up Required
          </span>
        );
      case 'RATE CHALLENGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-900 border border-red-300">
            <ShieldAlert className="w-3 h-3 text-red-700" />
            Rate Challenge
          </span>
        );
      case 'FIRST APPROACH PENDING':
      case 'RE-APPROACH PENDING':
      case 'GOOGLE FORM PENDING':
      case 'QUOTATION PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-900 border border-purple-200">
            <AlertCircle className="w-3 h-3 text-purple-700" />
            {action}
          </span>
        );
      case 'NOT REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
            Not Required
          </span>
        );
      case 'MOBILE NOT REACHABLE':
      case 'NOT PICKED THE CALL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-900 border border-orange-200">
            <Phone className="w-3 h-3 text-orange-700" />
            {action}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#0F4C3A]" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">SALES FOLLOW-UP</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track quotations, customer leads, and follow-up activities in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAddModalOpen(true)}
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-xs hover:shadow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Follow-up</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={followUps.length === 0}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-2.5 rounded-xl text-xs font-bold transition shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#1E8262]' : 'text-slate-500'}`} />
          </button>
        </div>
      </div>

      {/* Real Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Leads</span>
          <strong className="block text-2xl font-black text-slate-900">{summary.totalLeads}</strong>
          <span className="block text-[9.5px] font-semibold text-slate-500">Recorded records</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="block text-[10px] font-black text-blue-600 uppercase tracking-wider">Quotations Sent</span>
          <strong className="block text-2xl font-black text-blue-900">{summary.quotationsSent}</strong>
          <span className="block text-[9.5px] font-semibold text-slate-500">Auto-linked quotes</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="block text-[10px] font-black text-amber-600 uppercase tracking-wider">Follow-Up Required</span>
          <strong className="block text-2xl font-black text-amber-900">{summary.followUpRequired}</strong>
          <span className="block text-[9.5px] font-semibold text-slate-500">Requires contact</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="block text-[10px] font-black text-purple-600 uppercase tracking-wider">Pending Action</span>
          <strong className="block text-2xl font-black text-purple-900">{summary.pending}</strong>
          <span className="block text-[9.5px] font-semibold text-slate-500">Approach & quote pending</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider">Converted / Signed</span>
          <strong className="block text-2xl font-black text-emerald-900">{summary.convertedSigned}</strong>
          <span className="block text-[9.5px] font-semibold text-slate-500">Signed with carrier</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="block text-[10px] font-black text-red-600 uppercase tracking-wider">Rate Challenges</span>
          <strong className="block text-2xl font-black text-red-900">{summary.rateChallenges}</strong>
          <span className="block text-[9.5px] font-semibold text-slate-500">Disputed pricing</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, contact person, phone, email, quotation #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20"
            />
          </div>

          <button
            type="submit"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition shadow-2xs shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-slate-100">
          <span className="font-bold text-slate-500 text-[11px] uppercase flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </span>

          {/* Lead Source Filter */}
          <select
            value={selectedLeadSource}
            onChange={(e) => setSelectedLeadSource(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="">All Lead Sources</option>
            {LEAD_SOURCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {/* Further Action Filter */}
          <select
            value={selectedFurtherAction}
            onChange={(e) => setSelectedFurtherAction(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="">All Further Actions</option>
            {FURTHER_ACTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {/* Service Type Filter */}
          <select
            value={selectedServiceType}
            onChange={(e) => setSelectedServiceType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="">All Service Types</option>
            <option value="Domestic">Domestic</option>
            <option value="International">International</option>
          </select>

          {(selectedLeadSource || selectedFurtherAction || selectedServiceType || searchTerm) && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main CRM Sales Follow-Up Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : followUps.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs space-y-3">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-800">No Sales Follow-Up Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Follow-up leads automatically generate when customer quotations are saved, or click &quot;+ Add Follow-up&quot; to insert a manual record.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-800">
              <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200/80 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Company Name</th>
                  <th className="px-4 py-3.5">Contact Person</th>
                  <th className="px-4 py-3.5">Number</th>
                  <th className="px-4 py-3.5">Mail ID</th>
                  <th className="px-4 py-3.5">Sales Lead Source</th>
                  <th className="px-4 py-3.5">Further Action</th>
                  <th className="px-4 py-3.5">Remarks</th>
                  <th className="px-4 py-3.5">Business Area</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/90 transition group cursor-pointer"
                    onClick={() => openDrawer(item)}
                  >
                    {/* 1. Date */}
                    <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-600 whitespace-nowrap">
                      {formatDateIndian(item.date)}
                    </td>

                    {/* 2. Company Name */}
                    <td className="px-4 py-3.5 font-black text-slate-900 max-w-[160px] truncate" title={item.companyName}>
                      <div className="flex items-center gap-1.5">
                        <span>{item.companyName}</span>
                        {item.quotationNumber && (
                          <span className="bg-emerald-50 text-[#0F4C3A] text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                            QUOTE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Contact Person */}
                    <td className="px-4 py-3.5 font-bold text-slate-700 max-w-[130px] truncate" title={item.contactPerson}>
                      {item.contactPerson}
                    </td>

                    {/* 4. Phone Number */}
                    <td className="px-4 py-3.5 font-mono text-slate-800 font-bold whitespace-nowrap">
                      {item.phone || '—'}
                    </td>

                    {/* 5. Email */}
                    <td className="px-4 py-3.5 font-mono text-[10.5px] text-slate-600 max-w-[150px] truncate" title={item.email || ''}>
                      {item.email || '—'}
                    </td>

                    {/* 6. Lead Source (Interactive Dropdown) */}
                    <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={item.salesLeadSource || ''}
                        onChange={(e) => handleQuickLeadSourceChange(item.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-800 py-1 px-2 focus:outline-none focus:border-[#1E8262]"
                      >
                        <option value="">Select Lead Source</option>
                        {LEAD_SOURCE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>

                    {/* 7. Further Action (Interactive Status Badge Dropdown) */}
                    <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={item.furtherAction}
                        onChange={(e) => handleQuickStatusChange(item.id, e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg text-[10.5px] font-extrabold text-slate-900 py-1 px-2 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20"
                      >
                        {FURTHER_ACTION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>

                    {/* 8. Remarks */}
                    <td className="px-4 py-3.5 text-slate-600 max-w-[180px] truncate font-medium text-[11px]" title={item.remarks || ''}>
                      {item.remarks || '—'}
                    </td>

                    {/* 9. Business Area */}
                    <td className="px-4 py-3.5 font-bold text-slate-700 max-w-[130px] truncate" title={item.businessArea || ''}>
                      {item.businessArea || '—'}
                    </td>

                    {/* Table Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDrawer(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="View Lead Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-[#1E8262] hover:bg-emerald-50 rounded-lg transition"
                          title="Edit Follow-up"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.companyName)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Follow-up"
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

      {/* LEAD DETAIL DRAWER / EXPANDED SIDE PANEL */}
      {drawerOpen && selectedFollowUp && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-up border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="bg-emerald-50 text-[#0F4C3A] text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200">
                  GEO TRANSIT Lead Intelligence
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {selectedFollowUp.companyName}
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Contact: {selectedFollowUp.contactPerson} • {selectedFollowUp.phone}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Section 1: Customer Information */}
              <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1E8262]" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-slate-700 pt-1">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Company Name</span>
                    <strong className="text-slate-900 font-extrabold text-sm">{selectedFollowUp.companyName}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Contact Person</span>
                    <strong className="text-slate-900 font-bold">{selectedFollowUp.contactPerson}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Phone Number</span>
                    <strong className="text-slate-900 font-bold font-mono">{selectedFollowUp.phone}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Email Address</span>
                    <strong className="text-slate-900 font-bold font-mono">{selectedFollowUp.email || 'N/A'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Business Area / Location</span>
                    <strong className="text-slate-900 font-bold">{selectedFollowUp.businessArea || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Lead Information */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#1E8262]" />
                  Lead Status & Actions
                </h3>
                <div className="space-y-3 pt-1">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sales Lead Source</span>
                    <select
                      value={selectedFollowUp.salesLeadSource || ''}
                      onChange={(e) => handleQuickLeadSourceChange(selectedFollowUp.id, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      <option value="">Select Lead Source</option>
                      {LEAD_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Further Action Status</span>
                    <select
                      value={selectedFollowUp.furtherAction}
                      onChange={(e) => handleQuickStatusChange(selectedFollowUp.id, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-extrabold text-slate-900 focus:outline-none"
                    >
                      {FURTHER_ACTION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Remarks & Notes</span>
                    <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 font-medium leading-relaxed">
                      {selectedFollowUp.remarks || 'No remarks recorded.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Linked Quotation & Shipment Information */}
              <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1E8262]" />
                  Quotation & Shipment Metrics
                </h3>
                {selectedFollowUp.quotationNumber ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase">Quotation Number</span>
                        <strong className="text-sm font-black text-[#0F4C3A] font-mono">{selectedFollowUp.quotationNumber}</strong>
                      </div>
                      <Link
                        href={`/dashboard/quotations`}
                        className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>View Quotations</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-slate-700">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Courier Carrier</span>
                        <strong className="text-slate-900 font-bold">{selectedFollowUp.courierCompany || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Service Type</span>
                        <strong className="text-slate-900 font-bold">{selectedFollowUp.serviceType || 'Domestic'}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Actual Weight</span>
                        <strong className="text-slate-900 font-bold">{selectedFollowUp.actualWeight ? `${selectedFollowUp.actualWeight} KG` : 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Chargeable Weight</span>
                        <strong className="text-slate-900 font-bold text-emerald-700">{selectedFollowUp.chargeableWeight ? `${selectedFollowUp.chargeableWeight} KG` : 'N/A'}</strong>
                      </div>
                      <div className="col-span-2 bg-[#E8F5E9] p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <span className="text-xs font-black text-[#0F4C3A] uppercase">Calculated Shipping Rate:</span>
                        <strong className="text-lg font-black text-[#0F4C3A]">
                          ₹{selectedFollowUp.calculatedRate ? selectedFollowUp.calculatedRate.toLocaleString('en-IN') : '0'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-medium italic">
                    This follow-up record was manually created and is not linked to a system quotation.
                  </p>
                )}
              </div>

              {/* Section 4: Follow-up Activity History Timeline */}
              {selectedFollowUp.history && selectedFollowUp.history.length > 0 && (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#1E8262]" />
                    Activity History Audit Log
                  </h3>
                  <div className="space-y-2 pt-1 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {selectedFollowUp.history.map((h: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 pl-1">
                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-[#0F4C3A] border border-emerald-200 flex items-center justify-center shrink-0 z-10 font-bold text-[9px]">
                          {idx + 1}
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-slate-700 flex-1">
                          <span className="block text-[9.5px] font-bold text-slate-400 font-mono">
                            {formatDateIndian(h.timestamp)}
                          </span>
                          <p className="text-[11px] font-bold text-slate-900 mt-0.5">{h.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0 z-10">
              <button
                onClick={() => openEditModal(selectedFollowUp)}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Follow-Up</span>
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="border border-slate-200 hover:bg-slate-100 text-slate-700 py-2 px-4 rounded-xl text-xs font-bold transition"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ADD FOLLOW-UP MODAL */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="ADD SALES FOLLOW-UP"
        size="md"
      >
        <form onSubmit={handleCreateManual} className="space-y-4 text-xs p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={manualForm.companyName}
                onChange={(e) => setManualForm({ ...manualForm, companyName: e.target.value })}
                placeholder="e.g. Acme Corp"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                value={manualForm.contactPerson}
                onChange={(e) => setManualForm({ ...manualForm, contactPerson: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                value={manualForm.phone}
                onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={manualForm.email}
                onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                placeholder="rajesh@acme.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sales Lead Source
              </label>
              <select
                value={manualForm.salesLeadSource}
                onChange={(e) => setManualForm({ ...manualForm, salesLeadSource: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="">Select Lead Source</option>
                {LEAD_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Further Action Status *
              </label>
              <select
                value={manualForm.furtherAction}
                onChange={(e) => setManualForm({ ...manualForm, furtherAction: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-extrabold text-slate-900 focus:bg-white focus:outline-none"
                required
              >
                {FURTHER_ACTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Business Area / Location
              </label>
              <input
                type="text"
                value={manualForm.businessArea}
                onChange={(e) => setManualForm({ ...manualForm, businessArea: e.target.value })}
                placeholder="e.g. Bengaluru, Karnataka"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quotation Number (Optional)
              </label>
              <input
                type="text"
                value={manualForm.quotationNumber}
                onChange={(e) => setManualForm({ ...manualForm, quotationNumber: e.target.value })}
                placeholder="e.g. QT-20260901-3820"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Remarks & Follow-up Notes
            </label>
            <textarea
              rows={3}
              value={manualForm.remarks}
              onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })}
              placeholder="e.g. Customer requested follow-up call next week..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="border border-slate-200 hover:bg-slate-100 text-slate-700 py-2.5 px-5 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingManual}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2.5 px-6 rounded-xl text-xs font-bold transition shadow-md hover:shadow flex items-center gap-2"
            >
              {savingManual ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Follow-up Lead</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK EDIT MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="EDIT SALES FOLLOW-UP"
        size="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Company Name</label>
              <input
                type="text"
                value={editForm.companyName}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Contact Person</label>
              <input
                type="text"
                value={editForm.contactPerson}
                onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sales Lead Source</label>
              <select
                value={editForm.salesLeadSource}
                onChange={(e) => setEditForm({ ...editForm, salesLeadSource: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="">Select Lead Source</option>
                {LEAD_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Further Action Status</label>
              <select
                value={editForm.furtherAction}
                onChange={(e) => setEditForm({ ...editForm, furtherAction: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-extrabold text-slate-900 focus:bg-white focus:outline-none"
                required
              >
                {FURTHER_ACTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Business Area / Location</label>
            <input
              type="text"
              value={editForm.businessArea}
              onChange={(e) => setEditForm({ ...editForm, businessArea: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Remarks</label>
            <textarea
              rows={3}
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="border border-slate-200 hover:bg-slate-100 text-slate-700 py-2.5 px-5 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingManual}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2.5 px-6 rounded-xl text-xs font-bold transition shadow-md hover:shadow flex items-center gap-2"
            >
              {savingManual ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Record</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
