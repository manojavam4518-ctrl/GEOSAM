'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  WalletCards,
  Plus,
  Settings,
  Download,
  Printer,
  Share2,
  FileSpreadsheet,
  Search,
  Calendar,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Landmark,
  Wallet,
  Check,
  X,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  Info,
} from 'lucide-react';
import { exportCashLedgerToPDF, exportCashLedgerToCSV } from '@/utils/exportUtils';

interface LedgerColumn {
  id: string;
  key: string;
  name: string;
  type: 'TEXT' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'SELECT';
  isSystem: boolean;
  isCalculation: boolean;
  calcRole: string;
  enabled: boolean;
  order: number;
  required?: boolean;
}

interface LedgerEntry {
  id: string;
  date: string;
  cashReceived: number;
  receivedFrom: string | null;
  purpose: string | null;
  paidTo: string | null;
  paidAmount: number;
  bankDeposit: number;
  cashInHand: number;
  remarks: string | null;
  customFields?: Record<string, any> | null;
  createdByName?: string | null;
}

interface SummaryData {
  initialCashInHand?: number;
  totalCashReceived: number;
  totalPaidAmount: number;
  totalBankDeposit: number;
  currentCashInHand: number;
  netChange?: number;
  entryCount?: number;
}

export default function CounterCashLedgerPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [columns, setColumns] = useState<LedgerColumn[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalCashReceived: 0,
    totalPaidAmount: 0,
    totalBankDeposit: 0,
    currentCashInHand: 0,
  });
  const [userRole, setUserRole] = useState<string>('USER');
  const [organizationName, setOrganizationName] = useState<string>('GEO TRANSIT');

  // Filters
  const [preset, setPreset] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Row Modal (Add / Edit)
  const [rowModalOpen, setRowModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [rowFormData, setRowFormData] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    cashReceived: '',
    receivedFrom: '',
    purpose: '',
    paidTo: '',
    paidAmount: '',
    bankDeposit: '',
    remarks: '',
    customFields: {},
  });
  const [submittingRow, setSubmittingRow] = useState(false);

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Column Customization Modal
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingColumns, setEditingColumns] = useState<LedgerColumn[]>([]);
  const [initialCashInput, setInitialCashInput] = useState<string>('0');
  const [newColName, setNewColName] = useState<string>('');
  const [newColType, setNewColType] = useState<string>('TEXT');
  const [savingConfig, setSavingConfig] = useState(false);

  // Toast / Messages
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Super Admin check - Only platform Super Admin (ADMIN) has configuration access.
  // Company users and Organization Admins have DATA ENTRY and REPORTING access only.
  const isSuperAdmin = userRole === 'ADMIN';

  // Fetch current user and org context
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.user?.role || 'USER');
          if (data.user?.company || data.user?.organization?.name) {
            setOrganizationName(data.user?.organization?.name || data.user?.company);
          }
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    }
    fetchMe();
  }, []);

  // Fetch ledger data
  const loadLedgerData = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('preset', preset);
      if (preset === 'custom') {
        if (startDate) queryParams.set('startDate', startDate);
        if (endDate) queryParams.set('endDate', endDate);
      }
      if (search) queryParams.set('search', search);

      const res = await fetch(`/api/organization/cash-ledger?${queryParams.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to load cash ledger.');
      }
      const data = await res.json();
      setEntries(data.entries || []);
      setColumns(data.columns || []);
      setSummary(data.summary || {
        totalCashReceived: 0,
        totalPaidAmount: 0,
        totalBankDeposit: 0,
        currentCashInHand: 0,
      });
      if (data.config?.initialCashInHand !== undefined) {
        setInitialCashInput(String(data.config.initialCashInHand));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve ledger data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, [preset, startDate, endDate]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLedgerData();
  };

  // Open Add Row Modal
  const openAddRowModal = () => {
    setEditingEntryId(null);
    setRowFormData({
      date: new Date().toISOString().split('T')[0],
      cashReceived: '',
      receivedFrom: '',
      purpose: '',
      paidTo: '',
      paidAmount: '',
      bankDeposit: '',
      remarks: '',
      customFields: {},
    });
    setRowModalOpen(true);
  };

  // Open Edit Row Modal
  const openEditRowModal = (entry: LedgerEntry) => {
    setEditingEntryId(entry.id);
    const dateFormatted = entry.date ? new Date(entry.date).toISOString().split('T')[0] : '';
    setRowFormData({
      date: dateFormatted,
      cashReceived: entry.cashReceived ? String(entry.cashReceived) : '',
      receivedFrom: entry.receivedFrom || '',
      purpose: entry.purpose || '',
      paidTo: entry.paidTo || '',
      paidAmount: entry.paidAmount ? String(entry.paidAmount) : '',
      bankDeposit: entry.bankDeposit ? String(entry.bankDeposit) : '',
      remarks: entry.remarks || '',
      customFields: entry.customFields || {},
    });
    setRowModalOpen(true);
  };

  // Save Row (Create or Update)
  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRow(true);
    setError('');
    try {
      const payload = {
        date: rowFormData.date,
        cashReceived: rowFormData.cashReceived ? Number(rowFormData.cashReceived) : 0,
        receivedFrom: rowFormData.receivedFrom,
        purpose: rowFormData.purpose,
        paidTo: rowFormData.paidTo,
        paidAmount: rowFormData.paidAmount ? Number(rowFormData.paidAmount) : 0,
        bankDeposit: rowFormData.bankDeposit ? Number(rowFormData.bankDeposit) : 0,
        remarks: rowFormData.remarks,
        customFields: rowFormData.customFields,
      };

      const url = editingEntryId
        ? `/api/organization/cash-ledger/${editingEntryId}`
        : '/api/organization/cash-ledger';
      const method = editingEntryId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save ledger entry.');
      }

      setRowModalOpen(false);
      setMessage(editingEntryId ? 'Ledger entry updated successfully.' : 'New ledger row added successfully.');
      setTimeout(() => setMessage(''), 4000);
      loadLedgerData();
    } catch (err: any) {
      setError(err.message || 'Failed to save ledger entry.');
    } finally {
      setSubmittingRow(false);
    }
  };

  // Confirm Delete Entry
  const handleDeleteRow = async () => {
    if (!entryToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/organization/cash-ledger/${entryToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete entry.');
      }
      setDeleteModalOpen(false);
      setEntryToDelete(null);
      setMessage('Ledger entry deleted.');
      setTimeout(() => setMessage(''), 4000);
      loadLedgerData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete ledger entry.');
    } finally {
      setDeleting(false);
    }
  };

  // Open Column Config Modal
  const openColumnConfigModal = () => {
    setEditingColumns(JSON.parse(JSON.stringify(columns)));
    setConfigModalOpen(true);
  };

  // Add Custom Column
  const handleAddCustomColumn = () => {
    if (!newColName.trim()) return;
    const colKey = `custom_${newColName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const newCol: LedgerColumn = {
      id: `col_${Date.now()}`,
      key: colKey,
      name: newColName.trim(),
      type: newColType as any,
      isSystem: false,
      isCalculation: false,
      calcRole: 'NONE',
      enabled: true,
      order: editingColumns.length,
    };
    setEditingColumns([...editingColumns, newCol]);
    setNewColName('');
  };

  // Reorder Column
  const handleMoveColumn = (index: number, direction: 'UP' | 'DOWN') => {
    const updated = [...editingColumns];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    updated.forEach((c, idx) => (c.order = idx));
    setEditingColumns(updated);
  };

  // Toggle Column Visibility
  const handleToggleColumn = (index: number) => {
    const updated = [...editingColumns];
    updated[index].enabled = !updated[index].enabled;
    setEditingColumns(updated);
  };

  // Delete Custom Column
  const handleDeleteColumn = (index: number) => {
    const col = editingColumns[index];
    if (col.isSystem) return;
    const updated = editingColumns.filter((_, idx) => idx !== index);
    updated.forEach((c, idx) => (c.order = idx));
    setEditingColumns(updated);
  };

  // Save Column Configurations
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setError('');
    try {
      const res = await fetch('/api/organization/cash-ledger/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: editingColumns,
          initialCashInHand: Number(initialCashInput) || 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save ledger settings.');
      }

      setConfigModalOpen(false);
      setMessage('Ledger column configurations updated successfully.');
      setTimeout(() => setMessage(''), 4000);
      loadLedgerData();
    } catch (err: any) {
      setError(err.message || 'Failed to update ledger configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    const filterDesc =
      preset === 'today'
        ? 'Today'
        : preset === 'this_week'
        ? 'This Week'
        : preset === 'this_month'
        ? 'This Month'
        : preset === 'custom'
        ? `${startDate || 'Start'} to ${endDate || 'End'}`
        : 'All Records';

    await exportCashLedgerToPDF({
      entries,
      columns,
      summary,
      organizationName,
      filterDescription: filterDesc,
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    exportCashLedgerToCSV({
      entries,
      columns,
      summary,
      organizationName,
    });
  };

  // Share
  const handleShare = async () => {
    const shareText = `Counter Cash Ledger (${organizationName}):\n• Total Received: ₹${summary.totalCashReceived.toLocaleString('en-IN')}\n• Total Paid: ₹${summary.totalPaidAmount.toLocaleString('en-IN')}\n• Bank Deposit: ₹${summary.totalBankDeposit.toLocaleString('en-IN')}\n• Closing Cash in Hand: ₹${summary.currentCashInHand.toLocaleString('en-IN')}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Counter Cash Ledger - ${organizationName}`,
          text: shareText,
        });
      } catch (err) {
        // User cancelled or unsupported
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setMessage('Summary copied to clipboard!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Visible table columns
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => col.enabled !== false).sort((a, b) => a.order - b.order);
  }, [columns]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Print-Only Header Banner */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-bold text-[#0F4C3A] uppercase">{organizationName}</h1>
        <p className="text-sm font-semibold text-slate-700">Counter Cash Ledger — Daily Office Cash Register</p>
        <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F4C3A]/10 text-[#0F4C3A] flex items-center justify-center shadow-sm">
              <WalletCards className="w-5 h-5 text-[#0F4C3A]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Counter Cash Ledger</h1>
              <p className="text-xs text-slate-500">
                Daily office & counter cash register, receipts, disbursements, and bank deposits
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Row Button */}
          <button
            onClick={openAddRowModal}
            className="flex items-center gap-1.5 bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Row</span>
          </button>

          {/* Super Admin Only: Customize Columns */}
          {isSuperAdmin && (
            <button
              onClick={openColumnConfigModal}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm"
              title="Super Admin Only: Configure Standard Ledger Columns"
            >
              <Settings className="w-4 h-4 text-amber-700" />
              <span>Configure Columns (Super Admin)</span>
            </button>
          )}

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm"
            title="Download PDF Ledger"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm"
            title="Print Ledger"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm"
            title="Share Ledger Summary"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in print:hidden">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash Received */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Cash Received
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 tracking-tight">
              ₹ {summary.totalCashReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total cash-in for period</p>
          </div>
          <div className="h-1 bg-emerald-500 rounded-full mt-3 opacity-60" />
        </div>

        {/* Total Cash Paid */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Cash Paid
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-red-600 tracking-tight">
              ₹ {summary.totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total expenses & disbursements</p>
          </div>
          <div className="h-1 bg-red-500 rounded-full mt-3 opacity-60" />
        </div>

        {/* Total Bank Deposit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Bank Deposit
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-600 tracking-tight">
              ₹ {summary.totalBankDeposit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Deposited into bank accounts</p>
          </div>
          <div className="h-1 bg-blue-500 rounded-full mt-3 opacity-60" />
        </div>

        {/* Current Cash in Hand */}
        <div className="bg-gradient-to-br from-[#0F4C3A] to-[#165B47] text-white rounded-2xl p-5 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
              Current Cash in Hand
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              ₹ {summary.currentCashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-200 mt-1">
              Opening: ₹{(Number(summary.initialCashInHand) || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="h-1 bg-emerald-400 rounded-full mt-3 opacity-80" />
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all', label: 'All Records' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  preset === p.id
                    ? 'bg-[#0F4C3A] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search party, purpose, remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A] w-full md:w-64 transition"
            />
          </form>
        </div>

        {/* Custom Range Date Pickers */}
        {preset === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F4C3A]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F4C3A]"
              />
            </div>
            <button
              onClick={loadLedgerData}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1 rounded-lg font-bold text-xs transition"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet-Style Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#0F4C3A] animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading Counter Cash Ledger...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <WalletCards className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Ledger Entries Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No cash transactions recorded for the selected period. Click the button below to add your first transaction row.
            </p>
            <button
              onClick={openAddRowModal}
              className="mt-4 inline-flex items-center gap-1.5 bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                  <th className="py-3.5 px-4 w-12 text-center text-slate-400">#</th>
                  {visibleColumns.map((col) => {
                    const isCurrency = ['cashReceived', 'paidAmount', 'bankDeposit', 'cashInHand'].includes(col.key);
                    return (
                      <th
                        key={col.id}
                        className={`py-3.5 px-4 whitespace-nowrap ${isCurrency ? 'text-right' : ''}`}
                      >
                        {col.name}
                      </th>
                    );
                  })}
                  <th className="py-3.5 px-4 text-center w-20 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                      {idx + 1}
                    </td>

                    {visibleColumns.map((col) => {
                      if (col.key === 'date') {
                        return (
                          <td key={col.id} className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                            {entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                          </td>
                        );
                      }

                      if (col.key === 'cashReceived') {
                        const val = Number(entry.cashReceived) || 0;
                        return (
                          <td key={col.id} className="py-3 px-4 text-right font-bold whitespace-nowrap text-emerald-600">
                            {val > 0 ? `₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                        );
                      }

                      if (col.key === 'receivedFrom') {
                        return (
                          <td key={col.id} className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                            {entry.receivedFrom || '-'}
                          </td>
                        );
                      }

                      if (col.key === 'purpose') {
                        return (
                          <td key={col.id} className="py-3 px-4 text-slate-600 max-w-xs truncate" title={entry.purpose || ''}>
                            {entry.purpose || '-'}
                          </td>
                        );
                      }

                      if (col.key === 'paidTo') {
                        return (
                          <td key={col.id} className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                            {entry.paidTo || '-'}
                          </td>
                        );
                      }

                      if (col.key === 'paidAmount') {
                        const val = Number(entry.paidAmount) || 0;
                        return (
                          <td key={col.id} className="py-3 px-4 text-right font-bold whitespace-nowrap text-red-600">
                            {val > 0 ? `₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                        );
                      }

                      if (col.key === 'bankDeposit') {
                        const val = Number(entry.bankDeposit) || 0;
                        return (
                          <td key={col.id} className="py-3 px-4 text-right font-bold whitespace-nowrap text-blue-600">
                            {val > 0 ? `₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                        );
                      }

                      if (col.key === 'cashInHand') {
                        const val = Number(entry.cashInHand) || 0;
                        return (
                          <td key={col.id} className="py-3 px-4 text-right font-extrabold whitespace-nowrap text-[#0F4C3A]">
                            ₹ {val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        );
                      }

                      if (col.key === 'remarks') {
                        return (
                          <td key={col.id} className="py-3 px-4 text-slate-500 max-w-xs truncate" title={entry.remarks || ''}>
                            {entry.remarks || '-'}
                          </td>
                        );
                      }

                      // Custom column values
                      const customVal = entry.customFields?.[col.key];
                      return (
                        <td key={col.id} className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {customVal !== undefined && customVal !== null && String(customVal) !== ''
                            ? String(customVal)
                            : '-'}
                        </td>
                      );
                    })}

                    {/* Row Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap print:hidden">
                      <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition">
                        <button
                          onClick={() => openEditRowModal(entry)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Row"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEntryToDelete(entry);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          title="Delete Row"
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
        )}

        {/* Footer Summary Strip */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Total Entries:</span>
            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
              {entries.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-semibold">
            <div>
              <span className="text-slate-400 mr-1.5">Total In:</span>
              <span className="font-bold text-emerald-700">
                ₹ {summary.totalCashReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-1.5">Total Out:</span>
              <span className="font-bold text-red-700">
                ₹ {summary.totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-1.5">Bank Deposit:</span>
              <span className="font-bold text-blue-700">
                ₹ {summary.totalBankDeposit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-[#0F4C3A]/10 text-[#0F4C3A] px-3 py-1 rounded-lg">
              <span className="mr-1.5 font-bold">Closing Balance:</span>
              <span className="font-extrabold font-mono">
                ₹ {summary.currentCashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ADD / EDIT ROW MODAL                                          */}
      {/* ============================================================== */}
      {rowModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0F4C3A]/10 text-[#0F4C3A] flex items-center justify-center font-bold">
                  {editingEntryId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingEntryId ? 'Edit Ledger Row' : 'Add Ledger Row'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enter transaction details and financial values
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRow} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={rowFormData.date}
                    onChange={(e) => setRowFormData({ ...rowFormData, date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                  />
                </div>

                {/* Purpose / Info */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Purpose / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Freight advance, Office tea, Delivery"
                    value={rowFormData.purpose}
                    onChange={(e) => setRowFormData({ ...rowFormData, purpose: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                  />
                </div>

                {/* Received From */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Received From (Party / Client)
                  </label>
                  <input
                    type="text"
                    placeholder="Payer name or company"
                    value={rowFormData.receivedFrom}
                    onChange={(e) => setRowFormData({ ...rowFormData, receivedFrom: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                  />
                </div>

                {/* Cash Received (₹) */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                    Cash Received (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={rowFormData.cashReceived}
                    onChange={(e) => setRowFormData({ ...rowFormData, cashReceived: e.target.value })}
                    className="w-full border border-emerald-200 bg-emerald-50/30 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {/* Paid To */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Paid To (Vendor / Staff / Payee)
                  </label>
                  <input
                    type="text"
                    placeholder="Recipient or vendor name"
                    value={rowFormData.paidTo}
                    onChange={(e) => setRowFormData({ ...rowFormData, paidTo: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                  />
                </div>

                {/* Paid Amount (₹) */}
                <div>
                  <label className="block text-[11px] font-bold text-red-700 mb-1">
                    Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={rowFormData.paidAmount}
                    onChange={(e) => setRowFormData({ ...rowFormData, paidAmount: e.target.value })}
                    className="w-full border border-red-200 bg-red-50/30 rounded-xl px-3 py-2 text-xs font-bold text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                  />
                </div>

                {/* Bank Deposit (₹) */}
                <div>
                  <label className="block text-[11px] font-bold text-blue-700 mb-1">
                    Bank Deposit (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={rowFormData.bankDeposit}
                    onChange={(e) => setRowFormData({ ...rowFormData, bankDeposit: e.target.value })}
                    className="w-full border border-blue-200 bg-blue-50/30 rounded-xl px-3 py-2 text-xs font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Remarks / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Receipt #123, Bill ref"
                    value={rowFormData.remarks}
                    onChange={(e) => setRowFormData({ ...rowFormData, remarks: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                  />
                </div>
              </div>

              {/* Dynamic Custom Fields if defined by Org Admin */}
              {columns.filter((c) => !c.isSystem && c.enabled).length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase mb-2">
                    Custom Fields
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {columns
                      .filter((c) => !c.isSystem && c.enabled)
                      .map((col) => (
                        <div key={col.id}>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            {col.name}
                          </label>
                          <input
                            type={col.type === 'NUMBER' || col.type === 'CURRENCY' ? 'number' : col.type === 'DATE' ? 'date' : 'text'}
                            value={rowFormData.customFields?.[col.key] || ''}
                            onChange={(e) =>
                              setRowFormData({
                                ...rowFormData,
                                customFields: {
                                  ...rowFormData.customFields,
                                  [col.key]: e.target.value,
                                },
                              })
                            }
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRowModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRow}
                  className="flex items-center gap-1.5 bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-5 py-2 rounded-xl font-bold transition shadow-sm disabled:opacity-60"
                >
                  {submittingRow && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingEntryId ? 'Update Row' : 'Save Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE CONFIRMATION MODAL                                     */}
      {/* ============================================================== */}
      {deleteModalOpen && entryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Ledger Entry</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to permanently delete this transaction row? Running cash balances will be automatically recalculated.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setEntryToDelete(null);
                }}
                className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteRow}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CUSTOMIZE COLUMNS MODAL (SUPER ADMIN ONLY)                     */}
      {/* ============================================================== */}
      {isSuperAdmin && configModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0F4C3A]/10 text-[#0F4C3A] flex items-center justify-center font-bold">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Customize Ledger Columns</h3>
                  <p className="text-[11px] text-slate-500">
                    Reorder columns, toggle visibility, edit titles, and create custom fields
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Initial Cash in Hand Setting */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-emerald-900">Opening Cash in Hand (Starting Balance)</span>
                <p className="text-[11px] text-emerald-700">Initial balance used when calculating closing cash</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  className="w-32 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-800 text-right focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Add New Custom Column Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
              <span className="font-bold text-slate-700 uppercase text-[10px]">Add Custom Column</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="New Column Name (e.g. Voucher No, Verified By)"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0F4C3A]"
                />
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0F4C3A]"
                >
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="CURRENCY">Currency (₹)</option>
                  <option value="DATE">Date</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomColumn}
                  className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Column List */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {editingColumns.map((col, idx) => (
                <div
                  key={col.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                    col.enabled
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveColumn(idx, 'UP')}
                        className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-20 text-slate-500"
                        title="Move Up"
                      >
                        <MoveUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === editingColumns.length - 1}
                        onClick={() => handleMoveColumn(idx, 'DOWN')}
                        className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-20 text-slate-500"
                        title="Move Down"
                      >
                        <MoveDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Column Name Input */}
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) => {
                        const updated = [...editingColumns];
                        updated[idx].name = e.target.value;
                        setEditingColumns(updated);
                      }}
                      className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 flex-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#0F4C3A]"
                    />

                    {/* Tags */}
                    {col.isCalculation && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        Calculation
                      </span>
                    )}
                    {col.isSystem ? (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                        Standard
                      </span>
                    ) : (
                      <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                        Custom ({col.type})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleColumn(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        col.enabled
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {col.enabled ? 'Enabled' : 'Hidden'}
                    </button>

                    {/* Delete Custom Column Button */}
                    {!col.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(idx)}
                        className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        title="Delete Column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Note on system calculations */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5" />
              <span>Standard financial calculation columns are protected to ensure accounting accuracy.</span>
            </div>

            {/* Save Config Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveConfig}
                className="flex items-center gap-1.5 bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-5 py-2 rounded-xl font-bold transition shadow-sm text-xs disabled:opacity-60"
              >
                {savingConfig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
