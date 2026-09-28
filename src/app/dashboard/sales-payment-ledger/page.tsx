'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Settings,
  Download,
  Printer,
  Share2,
  FileSpreadsheet,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Lock,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Eye,
  CheckSquare,
  CircleDot,
  Calendar,
  Hash,
  Type,
  TableProperties,
  Save,
  CheckCircle,
  Receipt,
  DollarSign,
} from 'lucide-react';
import {
  exportSalesPaymentLedgerToPDF,
  exportSalesPaymentLedgerToCSV,
} from '@/utils/exportUtils';
import {
  SalesPaymentFieldConfig,
  SalesPaymentFieldType,
  REFERENCE_SALES_PAYMENT_FIELDS,
  extractSalesPaymentRowValue,
  getCurrentMonthYearString,
  generateMonthYearOptions,
} from '@/lib/salesPaymentLedger';

interface SalesPaymentEntry {
  id: string;
  date: string;
  invoiceMonth?: string | null;
  customerType?: string | null;
  customerName?: string | null;
  invoiceNumber?: string | null;
  totalInvoiceAmount: number;
  paymentReceivedMode?: string | null;
  chequeClearanceStatus?: string | null;
  remarks?: string | null;
  data: Record<string, any>;
  createdByName?: string | null;
}

interface SummaryData {
  recordCount: number;
  totalInvoiceAmount: number;
  columnTotals: Record<string, number>;
  modeTotals: Record<string, number>;
  modeCounts: Record<string, number>;
}

export default function SalesPaymentCollectionLedgerPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<SalesPaymentEntry[]>([]);
  const [fields, setFields] = useState<SalesPaymentFieldConfig[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    recordCount: 0,
    totalInvoiceAmount: 0,
    columnTotals: {},
    modeTotals: {},
    modeCounts: {},
  });
  const [userRole, setUserRole] = useState<string>('USER');
  const [organizationName, setOrganizationName] = useState<string>('GEO TRANSIT');

  // Filters
  const [preset, setPreset] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Inline Add Row state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [savingNewRow, setSavingNewRow] = useState(false);

  // Inline Edit Row state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<Record<string, any>>({});
  const [savingEditRow, setSavingEditRow] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<SalesPaymentEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Share state
  const [copiedLink, setCopiedLink] = useState(false);

  // Notifications
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const isOrgAdmin = userRole === 'ORG_ADMIN' || userRole === 'OWNER' || userRole === 'ADMIN';

  // Organization Admin Column Customizer state
  const [isCustomizingColumns, setIsCustomizingColumns] = useState(false);
  const [builderFields, setBuilderFields] = useState<SalesPaymentFieldConfig[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  const FIELD_TYPES: { type: SalesPaymentFieldType; label: string; desc: string }[] = [
    { type: 'SHORT_TEXT', label: 'Short Text', desc: 'Single-line text (names, invoice numbers, codes)' },
    { type: 'LONG_TEXT', label: 'Long Text', desc: 'Multi-line notes and descriptions' },
    { type: 'NUMBER', label: 'Number', desc: 'Numeric values and quantities' },
    { type: 'CURRENCY', label: 'Currency (INR ₹)', desc: 'Monetary amounts formatted with INR ₹' },
    { type: 'DATE', label: 'Date', desc: 'Standard calendar date (DD/MM/YYYY)' },
    { type: 'MONTH', label: 'Month', desc: 'Billing/Invoice month selector (e.g. APRIL_2026)' },
    { type: 'DROPDOWN', label: 'Dropdown', desc: 'Select one option from a dropdown list' },
    { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice (Radio)', desc: 'Choose exactly one option with radio buttons' },
    { type: 'CHECKBOX', label: 'Checkbox', desc: 'Select one or more options' },
    { type: 'YES_NO', label: 'Yes / No', desc: 'Binary boolean selection' },
    { type: 'EMAIL', label: 'Email', desc: 'Email address entry' },
    { type: 'PHONE', label: 'Phone Number', desc: 'Mobile or phone number' },
  ];

  // Standard month-year options list
  const monthOptions = useMemo(() => generateMonthYearOptions(), []);

  // Fetch current user and org context
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.user?.role || 'USER');
          if (data.user?.organization?.name || data.user?.company) {
            setOrganizationName(data.user?.organization?.name || data.user?.company);
          }
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    }
    fetchMe();
  }, []);

  // Fetch ledger data and dynamic fields
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

      Object.entries(columnFilters).forEach(([key, val]) => {
        if (val && val !== 'ALL') {
          queryParams.set(key, val);
        }
      });

      const res = await fetch(`/api/organization/sales-payment-ledger?${queryParams.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to load Sales Payment Collection Ledger.');
      }
      const data = await res.json();
      setEntries(data.entries || []);
      const loadedFields: SalesPaymentFieldConfig[] = data.fields || data.columns || REFERENCE_SALES_PAYMENT_FIELDS;
      setFields(loadedFields);
      setSummary(
        data.summary || {
          recordCount: 0,
          totalInvoiceAmount: 0,
          columnTotals: {},
          modeTotals: {},
          modeCounts: {},
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve ledger data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, [preset, startDate, endDate, columnFilters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLedgerData();
  };

  // Active visible columns
  const activeFields = useMemo(() => {
    const list = fields.filter((f) => f.active !== false);
    return list.length > 0 ? list : REFERENCE_SALES_PAYMENT_FIELDS;
  }, [fields]);

  // Detected dropdown fields for toolbar filtering
  const filterableDropdownFields = useMemo(() => {
    return activeFields.filter(
      (f) => (f.type === 'DROPDOWN' || f.type === 'MULTIPLE_CHOICE') && f.options && f.options.length > 0
    );
  }, [activeFields]);

  // Default values for a new row
  const initDefaultRowData = () => {
    const defaults: Record<string, any> = {};
    activeFields.forEach((f) => {
      if (f.defaultValue !== undefined && f.defaultValue !== '') {
        defaults[f.key] = f.defaultValue;
      } else if (f.type === 'MONTH') {
        defaults[f.key] = getCurrentMonthYearString();
      } else if (f.type === 'DROPDOWN' && f.options && f.options.length > 0 && f.required) {
        defaults[f.key] = f.options[0];
      } else if (f.type === 'CURRENCY' || f.type === 'NUMBER') {
        defaults[f.key] = '';
      } else {
        defaults[f.key] = '';
      }
    });
    return defaults;
  };

  const startAddRow = () => {
    setNewRowData(initDefaultRowData());
    setIsAddingRow(true);
    setEditingRowId(null);
  };

  const cancelAddRow = () => {
    setIsAddingRow(false);
    setNewRowData({});
  };

  // Save new row
  const handleSaveNewRow = async () => {
    setSavingNewRow(true);
    setError('');
    try {
      const res = await fetch('/api/organization/sales-payment-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newRowData }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save row.');
      }

      setIsAddingRow(false);
      setNewRowData({});
      setMessage('Transaction row saved successfully.');
      setTimeout(() => setMessage(''), 3000);
      await loadLedgerData();
    } catch (err: any) {
      setError(err.message || 'Error saving new row');
    } finally {
      setSavingNewRow(false);
    }
  };

  // Start inline editing
  const startEditRow = (entry: SalesPaymentEntry) => {
    const editData: Record<string, any> = { ...(entry.data || {}) };
    activeFields.forEach((f) => {
      editData[f.key] = extractSalesPaymentRowValue(entry.data, entry, f.key);
    });
    setEditingRowId(entry.id);
    setEditingRowData(editData);
    setIsAddingRow(false);
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
    setEditingRowData({});
  };

  // Save edited row
  const handleSaveEditRow = async (id: string) => {
    setSavingEditRow(true);
    setError('');
    try {
      const res = await fetch(`/api/organization/sales-payment-ledger/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: editingRowData }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update row.');
      }

      setEditingRowId(null);
      setEditingRowData({});
      setMessage('Transaction row updated successfully.');
      setTimeout(() => setMessage(''), 3000);
      await loadLedgerData();
    } catch (err: any) {
      setError(err.message || 'Error updating row');
    } finally {
      setSavingEditRow(false);
    }
  };

  // Delete row
  const confirmDeleteRow = (entry: SalesPaymentEntry) => {
    setEntryToDelete(entry);
    setDeleteModalOpen(true);
  };

  const handleDeleteRow = async () => {
    if (!entryToDelete) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/organization/sales-payment-ledger/${entryToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete row.');
      }
      setDeleteModalOpen(false);
      setEntryToDelete(null);
      setMessage('Row deleted successfully.');
      setTimeout(() => setMessage(''), 3000);
      await loadLedgerData();
    } catch (err: any) {
      setError(err.message || 'Error deleting row');
    } finally {
      setDeleting(false);
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    await exportSalesPaymentLedgerToPDF({
      entries,
      columns: activeFields,
      summary,
      organizationName,
      filterDescription:
        preset === 'custom'
          ? `${startDate || 'Start'} to ${endDate || 'End'}`
          : preset.replace('_', ' ').toUpperCase(),
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    exportSalesPaymentLedgerToCSV({
      entries,
      columns: activeFields,
      summary,
      organizationName,
    });
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Share Link
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Open Column Customizer for Organization Admin
  const openColumnCustomizer = () => {
    const cloned: SalesPaymentFieldConfig[] = JSON.parse(
      JSON.stringify(fields.length > 0 ? fields : REFERENCE_SALES_PAYMENT_FIELDS)
    );
    setBuilderFields(cloned);
    setIsCustomizingColumns(true);
  };

  // Field Builder Handlers
  const handleAddBuilderField = () => {
    const newId = `spf_${Date.now()}`;
    const newField: SalesPaymentFieldConfig = {
      id: newId,
      key: `col_${Date.now()}`,
      name: `Untitled Column ${builderFields.length + 1}`,
      type: 'SHORT_TEXT',
      required: false,
      defaultValue: '',
      options: ['Option 1', 'Option 2'],
      order: builderFields.length,
      active: true,
      width: 170,
      currencySymbol: '₹',
      decimalPlaces: 2,
      dateFormat: 'DD/MM/YYYY',
      monthFormat: 'MMMM_YYYY',
      includeInTotal: false,
    };
    setBuilderFields((prev) => [...prev, newField]);
  };

  const updateBuilderField = (id: string, updates: Partial<SalesPaymentFieldConfig>) => {
    setBuilderFields((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const updated = { ...f, ...updates };
          if (
            ['DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX'].includes(updated.type) &&
            (!updated.options || updated.options.length === 0)
          ) {
            updated.options = ['Option 1', 'Option 2'];
          }
          return updated;
        }
        return f;
      })
    );
  };

  const handleDeleteBuilderField = (index: number) => {
    if (builderFields.length <= 1) {
      alert('The ledger must contain at least one column.');
      return;
    }
    const target = builderFields[index];
    if (!confirm(`Delete column "${target.name}"?`)) return;
    const updated = builderFields.filter((_, idx) => idx !== index);
    updated.forEach((f, idx) => (f.order = idx));
    setBuilderFields(updated);
  };

  const handleMoveBuilderFieldUp = (index: number) => {
    if (index === 0) return;
    const updated = [...builderFields];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    updated.forEach((f, idx) => (f.order = idx));
    setBuilderFields(updated);
  };

  const handleMoveBuilderFieldDown = (index: number) => {
    if (index === builderFields.length - 1) return;
    const updated = [...builderFields];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    updated.forEach((f, idx) => (f.order = idx));
    setBuilderFields(updated);
  };

  const handleAddOptionToField = (fieldId: string) => {
    const text = (newOptionInputs[fieldId] || '').trim();
    if (!text) return;
    const field = builderFields.find((f) => f.id === fieldId);
    if (!field) return;
    const currentOptions = field.options || [];
    const newOptions = [...currentOptions, text];
    updateBuilderField(fieldId, { options: newOptions });
    setNewOptionInputs((prev) => ({ ...prev, [fieldId]: '' }));
  };

  const handleDeleteOptionFromField = (fieldId: string, optIndex: number) => {
    const field = builderFields.find((f) => f.id === fieldId);
    if (!field) return;
    const currentOptions = field.options || [];
    if (currentOptions.length <= 1) {
      alert('Selection fields must have at least one option.');
      return;
    }
    const newOptions = currentOptions.filter((_, idx) => idx !== optIndex);
    updateBuilderField(fieldId, { options: newOptions });
  };

  const handleMoveOptionInField = (fieldId: string, optIndex: number, direction: 'up' | 'down') => {
    const field = builderFields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    const newOptions = [...field.options];
    const targetIdx = direction === 'up' ? optIndex - 1 : optIndex + 1;
    if (targetIdx < 0 || targetIdx >= newOptions.length) return;
    const temp = newOptions[targetIdx];
    newOptions[targetIdx] = newOptions[optIndex];
    newOptions[optIndex] = temp;
    updateBuilderField(fieldId, { options: newOptions });
  };

  const handleSaveBuilderConfig = async () => {
    setSavingConfig(true);
    setError('');
    try {
      const res = await fetch('/api/organization/sales-payment-ledger/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: builderFields }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save column configuration.');
      }
      const data = await res.json();
      setFields(data.fields || builderFields);
      setIsCustomizingColumns(false);
      setMessage('Sales Payment Collection Ledger columns updated successfully.');
      setTimeout(() => setMessage(''), 4000);
      await loadLedgerData();
    } catch (err: any) {
      setError(err.message || 'Error saving columns');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetBuilderConfig = async () => {
    if (!confirm('Reset columns to standard reference defaults? Your existing transaction records will remain safe.')) {
      return;
    }
    setSavingConfig(true);
    setError('');
    try {
      const res = await fetch('/api/organization/sales-payment-ledger/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reset columns.');
      }
      const data = await res.json();
      const defs = data.fields || REFERENCE_SALES_PAYMENT_FIELDS;
      setFields(defs);
      setBuilderFields(defs);
      setIsCustomizingColumns(false);
      setMessage('Ledger columns reset to reference defaults.');
      setTimeout(() => setMessage(''), 4000);
      await loadLedgerData();
    } catch (err: any) {
      setError(err.message || 'Error resetting columns');
    } finally {
      setSavingConfig(false);
    }
  };

  // Render Cell Input Control based on configured field type
  const renderCellInput = (
    field: SalesPaymentFieldConfig,
    value: any,
    onChange: (val: any) => void
  ) => {
    switch (field.type) {
      case 'MONTH':
        return (
          <select
            value={value ?? getCurrentMonthYearString()}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded px-2 py-1 text-xs text-emerald-900 font-bold outline-none cursor-pointer"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        );

      case 'SHORT_TEXT':
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.name}...`}
            className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded px-2 py-1 text-xs text-slate-800 outline-none"
          />
        );

      case 'LONG_TEXT':
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'Enter notes...'}
            className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded px-2 py-1 text-xs text-slate-800 outline-none"
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded px-2 py-1 text-xs text-slate-800 outline-none text-right font-mono"
          />
        );

      case 'CURRENCY':
        return (
          <div className="relative">
            <span className="absolute left-2 top-1 text-xs font-bold text-slate-400">
              {field.currencySymbol || '₹'}
            </span>
            <input
              type="number"
              step="0.01"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded pl-6 pr-2 py-1 text-xs text-slate-900 font-bold outline-none text-right font-mono"
            />
          </div>
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded px-2 py-1 text-xs text-slate-800 outline-none cursor-pointer"
          />
        );

      case 'DROPDOWN':
        return (
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded px-2 py-1 text-xs text-slate-800 outline-none cursor-pointer"
          >
            <option value="">Select {field.name}...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'MULTIPLE_CHOICE':
        return (
          <div className="flex flex-wrap gap-2 py-0.5">
            {(field.options || []).map((opt) => (
              <label key={opt} className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name={`radio_${field.key}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="text-[#0F4C3A]"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'CHECKBOX':
        const checkedList = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-2 py-0.5">
            {(field.options || []).map((opt) => (
              <label key={opt} className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedList.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...checkedList, opt]);
                    } else {
                      onChange(checkedList.filter((item: string) => item !== opt));
                    }
                  }}
                  className="rounded text-[#0F4C3A]"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'YES_NO':
        return (
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded px-2 py-1 text-xs text-slate-800 outline-none cursor-pointer"
          >
            <option value="">Select...</option>
            <option value="YES">YES</option>
            <option value="NO">NO</option>
          </select>
        );

      case 'EMAIL':
        return (
          <input
            type="email"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="client@domain.com"
            className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded px-2 py-1 text-xs text-slate-800 outline-none"
          />
        );

      case 'PHONE':
        return (
          <input
            type="tel"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded px-2 py-1 text-xs text-slate-800 outline-none"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 outline-none"
          />
        );
    }
  };

  // Render Cell Display (View Mode)
  const renderCellDisplay = (field: SalesPaymentFieldConfig, entry: SalesPaymentEntry) => {
    const val = extractSalesPaymentRowValue(entry.data, entry, field.key);

    if (val === undefined || val === null || val === '') {
      return <span className="text-slate-300 select-none">-</span>;
    }

    if (field.type === 'CURRENCY') {
      const num = Number(val) || 0;
      return (
        <span className="font-bold text-slate-900 text-right block font-mono">
          {field.currencySymbol || '₹'}
          {num.toLocaleString('en-IN', {
            minimumFractionDigits: field.decimalPlaces ?? 2,
            maximumFractionDigits: field.decimalPlaces ?? 2,
          })}
        </span>
      );
    }

    if (field.type === 'NUMBER') {
      const num = Number(val) || 0;
      return <span className="font-mono text-right block text-slate-800">{num.toLocaleString('en-IN')}</span>;
    }

    if (field.type === 'MONTH') {
      return (
        <span className="font-bold text-emerald-950 font-mono text-[11px] block">
          {String(val)}
        </span>
      );
    }

    if (field.type === 'DATE') {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return <span className="font-medium text-slate-700">{d.toLocaleDateString('en-IN')}</span>;
        }
      } catch (_) {}
      return <span>{String(val)}</span>;
    }

    if (field.type === 'DROPDOWN' || field.type === 'MULTIPLE_CHOICE') {
      const upper = String(val).toUpperCase();
      let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      if (['CASH', 'CREDITED', 'PAID', 'APPROVED', 'ACTIVE', 'CASH CUSTOMER'].includes(upper)) {
        badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
      } else if (['CREDIT CUSTOMER'].includes(upper)) {
        badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold';
      } else if (['CHEQUE BOUNCE', 'REJECTED'].includes(upper)) {
        badgeStyle = 'bg-red-50 text-red-800 border-red-200 font-bold';
      } else if (['PENDING'].includes(upper)) {
        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
      } else if (['CHEQUE', 'NEFT/IMPS', 'DIGITAL PAYMENTS'].includes(upper)) {
        badgeStyle = 'bg-blue-50 text-blue-800 border-blue-200 font-bold';
      }
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-[11px] border ${badgeStyle}`}>
          {String(val)}
        </span>
      );
    }

    if (field.type === 'CHECKBOX' && Array.isArray(val)) {
      return (
        <div className="flex flex-wrap gap-1">
          {val.map((item, idx) => (
            <span
              key={idx}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
            >
              {item}
            </span>
          ))}
        </div>
      );
    }

    if (field.type === 'YES_NO') {
      const isYes = String(val).toUpperCase() === 'YES';
      return (
        <span
          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
            isYes ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {String(val)}
        </span>
      );
    }

    return <span className="text-slate-800 text-xs font-normal truncate block">{String(val)}</span>;
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 pb-20">
      {/* 1. SPREADSHEET HEADER BAR */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-[1700px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Title & Organization Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0F4C3A] text-white flex items-center justify-center shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  SALES PAYMENT COLLECTION LEDGER
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Collection Register
                </span>
                <span className="text-xs text-slate-400 font-semibold">• {organizationName}</span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                Spreadsheet Mode • Organization Configured
              </p>
            </div>
          </div>

          {/* Action Ribbon */}
          <div className="flex items-center gap-2">
            {/* Organization Admin Column Builder Button */}
            {isOrgAdmin && (
              <button
                onClick={openColumnCustomizer}
                className="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Organization Admin: Customize Columns"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-700" />
                Customize Columns
              </button>
            )}

            {/* MAIN ACTION: + ADD ROW */}
            <button
              onClick={startAddRow}
              disabled={isAddingRow}
              className="py-2 px-4 rounded-lg bg-[#0F4C3A] hover:bg-[#15674F] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + ADD ROW
            </button>

            {/* Download PDF */}
            <button
              onClick={handleExportPDF}
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Download PDF Ledger"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              PDF
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Export to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              CSV
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Print Ledger"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Share Ledger link"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              {copiedLink ? 'Copied!' : 'Share'}
            </button>

            <button
              onClick={loadLedgerData}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs cursor-pointer"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. SPREADSHEET TOOLBAR & FILTERS */}
      <section className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-2xs">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Quick Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all', label: 'All' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
                  preset === p.id
                    ? 'bg-white text-[#0F4C3A] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 animate-fadeIn">
              <span className="text-[11px] font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 outline-none"
              />
              <span className="text-[11px] font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 outline-none"
              />
            </div>
          )}

          {/* Right: Dropdown Column Filters & Search */}
          <div className="flex items-center gap-2.5 ml-auto">
            {filterableDropdownFields.slice(0, 3).map((field) => (
              <div key={field.key} className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500 font-semibold">{field.name}:</span>
                <select
                  value={columnFilters[field.key] || 'ALL'}
                  onChange={(e) =>
                    setColumnFilters((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">All</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ledger records..."
                className="w-56 pl-7 pr-3 py-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0F4C3A] rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </form>
          </div>
        </div>
      </section>

      {/* Notifications */}
      {message && (
        <div className="max-w-[1700px] mx-auto px-4 mt-3">
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs animate-fadeIn">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {message}
            </span>
            <button onClick={() => setMessage('')} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-[1700px] mx-auto px-4 mt-3">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between shadow-2xs animate-fadeIn">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              {error}
            </span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. SPREADSHEET TABLE GRID */}
      <main className="max-w-[1700px] mx-auto px-4 mt-4">
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
          {/* Scrollable Grid Container */}
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)]">
            <table className="w-full text-left border-collapse text-xs select-text">
              {/* Spreadsheet Column Headers */}
              <thead className="sticky top-0 z-20 bg-[#F8FAFC] border-b border-slate-300 text-slate-700 font-bold select-none shadow-2xs">
                <tr>
                  <th className="w-12 px-2 py-2 text-center text-[10px] font-mono font-bold text-slate-400 border-r border-slate-200 bg-slate-100">
                    #
                  </th>

                  {activeFields.map((field, idx) => {
                    const colLetter = String.fromCharCode(65 + (idx % 26));
                    return (
                      <th
                        key={field.key}
                        style={{ minWidth: `${field.width || 170}px` }}
                        className="px-3 py-2 border-r border-slate-200 text-slate-800 text-xs font-bold whitespace-nowrap bg-[#F8FAFC] hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">{colLetter}</span>
                            <span className="truncate">{field.name}</span>
                            {field.required && <span className="text-red-500 font-bold">*</span>}
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  <th className="w-24 px-3 py-2 text-center text-slate-700 text-xs font-bold whitespace-nowrap bg-[#F8FAFC]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* 4. INLINE ADD ROW (Spreadsheet Style) */}
                {isAddingRow && (
                  <tr className="bg-emerald-50/70 border-b-2 border-emerald-400 animate-fadeIn">
                    <td className="w-12 px-2 py-2 text-center text-xs font-mono font-bold text-emerald-700 border-r border-emerald-200 bg-emerald-100/50">
                      NEW
                    </td>

                    {activeFields.map((field) => (
                      <td
                        key={field.key}
                        style={{ minWidth: `${field.width || 170}px` }}
                        className="p-1.5 border-r border-emerald-200 align-middle"
                      >
                        {renderCellInput(field, newRowData[field.key], (val) =>
                          setNewRowData((prev) => ({ ...prev, [field.key]: val }))
                        )}
                      </td>
                    ))}

                    <td className="w-24 p-1.5 text-center whitespace-nowrap align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveNewRow}
                          disabled={savingNewRow}
                          className="p-1.5 rounded-md bg-[#0F4C3A] hover:bg-[#15674F] text-white transition cursor-pointer shadow-2xs"
                          title="Save Row"
                        >
                          {savingNewRow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={cancelAddRow}
                          disabled={savingNewRow}
                          className="p-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* 5. TABLE ROWS (View & Inline Edit) */}
                {loading && entries.length === 0 ? (
                  <tr>
                    <td colSpan={activeFields.length + 2} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#0F4C3A]" />
                        <span className="text-xs font-semibold">Loading ledger records...</span>
                      </div>
                    </td>
                  </tr>
                ) : entries.length === 0 && !isAddingRow ? (
                  <tr>
                    <td colSpan={activeFields.length + 2} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt className="w-8 h-8 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-600">No collection records found for this period.</p>
                        <button
                          onClick={startAddRow}
                          className="mt-2 py-1.5 px-3 rounded-lg bg-[#0F4C3A] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-[#15674F] transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + ADD FIRST ROW
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry, rIdx) => {
                    const isEditing = editingRowId === entry.id;

                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-slate-200 transition ${
                          isEditing
                            ? 'bg-amber-50/70 border-amber-300'
                            : rIdx % 2 === 1
                            ? 'bg-[#FAFCFF] hover:bg-slate-50'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        {/* Row Index Number */}
                        <td className="w-12 px-2 py-2 text-center text-[11px] font-mono text-slate-400 font-semibold border-r border-slate-200 bg-slate-50/50">
                          {rIdx + 1}
                        </td>

                        {/* Cell Values */}
                        {activeFields.map((field) => (
                          <td
                            key={field.key}
                            style={{ minWidth: `${field.width || 170}px` }}
                            className="px-3 py-2 border-r border-slate-200 align-middle"
                          >
                            {isEditing
                              ? renderCellInput(field, editingRowData[field.key], (val) =>
                                  setEditingRowData((prev) => ({ ...prev, [field.key]: val }))
                                )
                              : renderCellDisplay(field, entry)}
                          </td>
                        ))}

                        {/* Actions */}
                        <td className="w-24 px-3 py-2 text-center whitespace-nowrap align-middle">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveEditRow(entry.id)}
                                disabled={savingEditRow}
                                className="p-1.5 rounded-md bg-[#0F4C3A] hover:bg-[#15674F] text-white transition cursor-pointer shadow-2xs"
                                title="Save Changes"
                              >
                                {savingEditRow ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditRow}
                                disabled={savingEditRow}
                                className="p-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-slate-400">
                              <button
                                type="button"
                                onClick={() => startEditRow(entry)}
                                className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                                title="Edit Row"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDeleteRow(entry)}
                                className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                                title="Delete Row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 6. FORMULA SUMMARY STATUS BAR */}
          <footer className="bg-slate-100/90 border-t border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700 shrink-0">
            {/* Left: Record Count & Formula Summary */}
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Count: <strong className="text-slate-900 font-mono">{summary.recordCount || entries.length}</strong> records
              </span>

              <span className="text-slate-300">|</span>

              <span className="flex items-center gap-1.5 text-emerald-950 font-bold bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs font-mono">
                SUM (TOTAL INVOICE AMOUNT): ₹
                {summary.totalInvoiceAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>

              {/* Any additional columns marked includeInTotal */}
              {Object.entries(summary.columnTotals || {}).map(([key, sum]) => {
                if (key === 'total_invoice_amount') return null;
                const f = activeFields.find((col) => col.key === key);
                return (
                  <span
                    key={key}
                    className="flex items-center gap-1 text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200 font-mono text-[11px]"
                  >
                    SUM ({f?.name || key}): ₹
                    {Number(sum).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                );
              })}
            </div>

            {/* Right: Payment Mode Breakdown */}
            <div className="flex items-center gap-3 text-[11px] overflow-x-auto">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                Modes:
              </span>
              {Object.entries(summary.modeTotals || {}).slice(0, 4).map(([mode, amt]) => (
                <span
                  key={mode}
                  className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 flex items-center gap-1 shadow-2xs font-mono"
                >
                  <span className="font-semibold text-slate-500">{mode}:</span>
                  <strong className="text-slate-900">
                    ₹{Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </strong>
                </span>
              ))}
            </div>
          </footer>
        </div>
      </main>

      {/* 7. DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete this collection entry?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete this row? This action will be recorded in the audit log and
              cannot be undone.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Name:</span>
                <strong className="text-slate-800">
                  {extractSalesPaymentRowValue(entryToDelete.data, entryToDelete, 'customer_name') || '-'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-mono text-slate-700">
                  {extractSalesPaymentRowValue(entryToDelete.data, entryToDelete, 'invoice_number') || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Invoice Amount:</span>
                <strong className="text-emerald-700 font-mono">
                  ₹{Number(extractSalesPaymentRowValue(entryToDelete.data, entryToDelete, 'total_invoice_amount') || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setEntryToDelete(null);
                }}
                disabled={deleting}
                className="py-2 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRow}
                disabled={deleting}
                className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete Row
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ORGANIZATION ADMIN COLUMN BUILDER MODAL (GOOGLE FORMS STYLE) */}
      {isCustomizingColumns && isOrgAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-[#F8FAFC] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0F4C3A] text-white flex items-center justify-center shadow-xs">
                  <TableProperties className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Sales Payment Collection Ledger Field Builder
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Organization Admin
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Configure spreadsheet columns, data types, and options for {organizationName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCustomizingColumns(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Header Toolbar */}
            <div className="bg-white/80 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddBuilderField}
                  className="py-1.5 px-3 rounded-lg bg-[#0F4C3A] hover:bg-[#15674F] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  + ADD FIELD
                </button>
                <button
                  type="button"
                  onClick={handleResetBuilderConfig}
                  disabled={savingConfig}
                  className="py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  title="Restore 7 Reference Columns"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  Reset to Reference Defaults
                </button>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                {builderFields.length} columns configured • Changes apply only to {organizationName}
              </span>
            </div>

            {/* Modal Body: Google Forms-Style Field Cards List */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-100/60">
              {builderFields.map((field, index) => {
                const isSelection = ['DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX'].includes(field.type);
                const isNumeric = field.type === 'CURRENCY' || field.type === 'NUMBER';

                return (
                  <div
                    key={field.id}
                    className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-[#0F4C3A] p-5 shadow-xs transition hover:shadow-md"
                  >
                    {/* Top Row: Index, Name preview, Order, Delete */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-800 text-sm">{field.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          key: {field.key}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveBuilderFieldUp(index)}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition cursor-pointer"
                          title="Move column left/up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveBuilderFieldDown(index)}
                          disabled={index === builderFields.length - 1}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition cursor-pointer"
                          title="Move column right/down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBuilderField(index)}
                          className="p-1 rounded hover:bg-red-50 text-red-600 transition cursor-pointer ml-1"
                          title="Delete column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Field Configuration Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                      {/* Field Name */}
                      <div className="md:col-span-5">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Field Name
                        </label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateBuilderField(field.id, { name: e.target.value })}
                          placeholder="e.g. Total Invoice Amount"
                          className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
                        />
                      </div>

                      {/* Field Type */}
                      <div className="md:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Field Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateBuilderField(field.id, { type: e.target.value as SalesPaymentFieldType })
                          }
                          className="w-full bg-white border border-slate-300 focus:border-[#0F4C3A] rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 outline-none cursor-pointer"
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.type} value={t.type}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Required Toggle */}
                      <div className="md:col-span-3 flex items-center justify-between gap-2 pt-5">
                        <label className="text-xs font-bold text-slate-700 cursor-pointer">
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => updateBuilderField(field.id, { required: !field.required })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            field.required
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {field.required ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>

                    {/* Numeric Setting: Include in Ledger Total */}
                    {isNumeric && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-2.5 rounded text-xs">
                        <div>
                          <strong className="text-slate-800">Include in Ledger Total</strong>
                          <p className="text-[11px] text-slate-500">
                            Calculate SUM total for this column in the formula bar and exports
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateBuilderField(field.id, { includeInTotal: !field.includeInTotal })}
                          className={`px-3 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                            field.includeInTotal
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          {field.includeInTotal ? 'YES' : 'NO'}
                        </button>
                      </div>
                    )}

                    {/* Contextual Options Builder for DROPDOWN, MULTIPLE_CHOICE, CHECKBOX */}
                    {isSelection && (
                      <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 rounded-lg p-3.5 border">
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Options ({(field.options || []).length})
                        </label>

                        <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                          {(field.options || []).map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-[11px] font-mono text-slate-400 font-bold w-4">
                                  {optIdx + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const next = [...(field.options || [])];
                                    next[optIdx] = e.target.value;
                                    updateBuilderField(field.id, { options: next });
                                  }}
                                  className="w-full bg-transparent font-medium text-slate-800 outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveOptionInField(field.id, optIdx, 'up')}
                                  disabled={optIdx === 0}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-20 cursor-pointer"
                                  title="Move option up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveOptionInField(field.id, optIdx, 'down')}
                                  disabled={optIdx === (field.options || []).length - 1}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-20 cursor-pointer"
                                  title="Move option down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOptionFromField(field.id, optIdx)}
                                  className="p-1 rounded hover:bg-red-50 text-red-500 transition cursor-pointer"
                                  title="Delete option"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Option Input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newOptionInputs[field.id] || ''}
                            onChange={(e) =>
                              setNewOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOptionToField(field.id);
                              }
                            }}
                            placeholder="Add option name (e.g. CASH, NEFT)..."
                            className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddOptionToField(field.id)}
                            className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
                          >
                            + Add Option
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Contextual Month Settings */}
                    {field.type === 'MONTH' && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs bg-slate-50 p-2.5 rounded">
                        <span className="text-slate-500 font-semibold block mb-0.5">Display Format</span>
                        <span className="font-bold text-emerald-900 font-mono">MMMM_YYYY (e.g. APRIL_2026)</span>
                      </div>
                    )}

                    {/* Contextual Date Settings */}
                    {field.type === 'DATE' && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs bg-slate-50 p-2.5 rounded">
                        <span className="text-slate-500 font-semibold block mb-0.5">Date Format</span>
                        <span className="font-bold text-slate-800 font-mono">DD/MM/YYYY</span>
                      </div>
                    )}

                    {/* Live Preview Box */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        Live Cell Preview:
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        {field.type === 'MONTH' && (
                          <div className="text-xs font-bold text-emerald-900 font-mono">
                            {getCurrentMonthYearString()} ▼
                          </div>
                        )}
                        {field.type === 'DROPDOWN' && (
                          <div className="text-xs text-slate-700 font-medium">
                            [ Select {field.name} ▼ ]
                          </div>
                        )}
                        {field.type === 'MULTIPLE_CHOICE' && (
                          <div className="flex flex-wrap gap-3">
                            {(field.options || ['Option 1', 'Option 2']).map((opt, idx) => (
                              <label key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                                <input type="radio" name={`prev_${field.id}`} defaultChecked={idx === 0} readOnly />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {field.type === 'CHECKBOX' && (
                          <div className="flex flex-wrap gap-3">
                            {(field.options || ['Option 1', 'Option 2']).map((opt, idx) => (
                              <label key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                                <input type="checkbox" defaultChecked={idx === 0} readOnly />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {field.type === 'CURRENCY' && (
                          <div className="text-xs font-mono font-bold text-slate-900">₹ 0.00</div>
                        )}
                        {field.type === 'DATE' && (
                          <div className="text-xs font-mono text-slate-600">DD/MM/YYYY</div>
                        )}
                        {field.type === 'SHORT_TEXT' && (
                          <div className="text-xs text-slate-400 italic">Enter {field.name}...</div>
                        )}
                        {field.type === 'LONG_TEXT' && (
                          <div className="text-xs text-slate-400 italic">Enter notes...</div>
                        )}
                        {field.type === 'NUMBER' && (
                          <div className="text-xs font-mono text-slate-600 text-right">0</div>
                        )}
                        {field.type === 'YES_NO' && (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
                              YES
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-bold">
                              NO
                            </span>
                          </div>
                        )}
                        {field.type === 'EMAIL' && (
                          <div className="text-xs text-slate-400 italic">name@company.com</div>
                        )}
                        {field.type === 'PHONE' && (
                          <div className="text-xs text-slate-400 italic">+91 98765 43210</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Sticky Footer */}
            <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Changes will be saved immediately to {organizationName}&apos;s Sales Payment Collection Ledger.
              </span>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsCustomizingColumns(false)}
                  disabled={savingConfig}
                  className="py-2 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBuilderConfig}
                  disabled={savingConfig}
                  className="py-2 px-5 rounded-lg bg-[#0F4C3A] hover:bg-[#15674F] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {savingConfig ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Save Column Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
