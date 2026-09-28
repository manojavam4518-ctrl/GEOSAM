'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Copy,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Eye,
  Type,
  AlignLeft,
  Hash,
  IndianRupee,
  Calendar,
  CalendarDays,
  ChevronDown,
  CircleDot,
  CheckSquare,
  ToggleLeft,
  Mail,
  Phone,
  TableProperties,
  Loader2,
  ListPlus,
  Edit3,
  ShieldCheck,
  Key,
} from 'lucide-react';
import Link from 'next/link';
import {
  LedgerFieldConfig,
  LedgerFieldType,
  REFERENCE_LEDGER_FIELDS,
  getCurrentMonthYearString,
} from '@/lib/cashLedger';

const FIELD_TYPE_OPTIONS: { type: LedgerFieldType; label: string; icon: any; description: string }[] = [
  { type: 'SHORT_TEXT', label: 'Short Text', icon: Type, description: 'Single-line text (Customer Name, Invoice #)' },
  { type: 'LONG_TEXT', label: 'Long Text', icon: AlignLeft, description: 'Multi-line text notes / remarks' },
  { type: 'NUMBER', label: 'Number', icon: Hash, description: 'Numeric values, counts, quantities' },
  { type: 'CURRENCY', label: 'Currency (₹)', icon: IndianRupee, description: 'Monetary amounts (INR ₹, 2 decimals)' },
  { type: 'DATE', label: 'Date', icon: Calendar, description: 'Standard date picker (DD/MM/YYYY)' },
  { type: 'MONTH', label: 'Month', icon: CalendarDays, description: 'Month selector formatted as MMMM_YYYY (e.g. APRIL_2026)' },
  { type: 'DROPDOWN', label: 'Dropdown', icon: ChevronDown, description: 'Single select from customizable options' },
  { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: CircleDot, description: 'Radio button bullets (single selection)' },
  { type: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare, description: 'Multi-select checkboxes' },
  { type: 'YES_NO', label: 'Yes / No', icon: ToggleLeft, description: 'Binary boolean selection (YES/NO)' },
  { type: 'EMAIL', label: 'Email', icon: Mail, description: 'Email address with format validation' },
  { type: 'PHONE', label: 'Phone Number', icon: Phone, description: 'Contact phone number' },
];

export default function AdminCashLedgerFieldsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<LedgerFieldConfig[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [syncToAll, setSyncToAll] = useState(true);

  // Track which options are currently in inline edit mode
  const [editingOptKey, setEditingOptKey] = useState<string | null>(null);
  const [editOptText, setEditOptText] = useState<string>('');

  // Load current field configuration from server
  const loadFields = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/cash-ledger/fields');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to load ledger field configuration.');
      }
      const data = await res.json();
      const loadedFields: LedgerFieldConfig[] = data.fields || REFERENCE_LEDGER_FIELDS;
      setFields(loadedFields);
      if (loadedFields.length > 0) {
        setActiveFieldId(loadedFields[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  // Save fields configuration
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (fields.length === 0) {
        throw new Error('You must configure at least one field.');
      }

      // Check for empty names
      for (let i = 0; i < fields.length; i++) {
        if (!fields[i].name.trim()) {
          throw new Error(`Field #${i + 1} has an empty name.`);
        }
      }

      const res = await fetch('/api/admin/cash-ledger/fields', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields,
          syncToOrganizations: syncToAll,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save configuration.');
      }

      const resData = await res.json();
      setFields(resData.fields || fields);
      setMessage('Ledger field configuration saved successfully! Companies will see this updated structure.');
      setTimeout(() => setMessage(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error saving fields');
    } finally {
      setSaving(false);
    }
  };

  // Reset to reference structure
  const handleResetToDefaults = async () => {
    if (
      !confirm(
        'Reset all ledger fields to the exact reference "SALES PAYMENT COLLECTION LEDGER" structure (7 exact columns)? Any custom fields will be replaced.'
      )
    ) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/cash-ledger/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_DEFAULTS' }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reset.');
      }
      const data = await res.json();
      setFields(data.fields || REFERENCE_LEDGER_FIELDS);
      if (data.fields?.length > 0) setActiveFieldId(data.fields[0].id);
      setMessage('Successfully restored the 7 reference columns!');
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error resetting fields');
    } finally {
      setSaving(false);
    }
  };

  // Add a new blank field
  const handleAddField = () => {
    const newId = `fld_${Date.now()}`;
    const newField: LedgerFieldConfig = {
      id: newId,
      key: `custom_${Date.now()}`,
      name: `Untitled Field ${fields.length + 1}`,
      type: 'SHORT_TEXT',
      required: false,
      defaultValue: '',
      options: ['Option 1', 'Option 2'],
      order: fields.length,
      active: true,
      width: 170,
      currencySymbol: '₹',
      decimalPlaces: 2,
      dateFormat: 'DD/MM/YYYY',
      monthFormat: 'MMMM_YYYY',
    };
    const updated = [...fields, newField];
    setFields(updated);
    setActiveFieldId(newId);
  };

  // Duplicate an existing field
  const handleDuplicateField = (index: number) => {
    const source = fields[index];
    const newId = `fld_${Date.now()}`;
    const duplicate: LedgerFieldConfig = {
      ...source,
      id: newId,
      key: `${source.key}_copy_${Date.now()}`,
      name: `${source.name} (Copy)`,
      order: index + 1,
    };
    const updated = [...fields];
    updated.splice(index + 1, 0, duplicate);
    updated.forEach((f, idx) => (f.order = idx));
    setFields(updated);
    setActiveFieldId(newId);
  };

  // Delete a field
  const handleDeleteField = (index: number) => {
    if (fields.length <= 1) {
      alert('The ledger must have at least one field.');
      return;
    }
    const target = fields[index];
    if (!confirm(`Delete field "${target.name}"?`)) return;

    const updated = fields.filter((_, idx) => idx !== index);
    updated.forEach((f, idx) => (f.order = idx));
    setFields(updated);
    if (activeFieldId === target.id) {
      setActiveFieldId(updated[0]?.id || null);
    }
  };

  // Move field order up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...fields];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    updated.forEach((f, idx) => (f.order = idx));
    setFields(updated);
  };

  // Move field order down
  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const updated = [...fields];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    updated.forEach((f, idx) => (f.order = idx));
    setFields(updated);
  };

  // Update a property of a field (Note: key stays stable!)
  const updateField = (id: string, updates: Partial<LedgerFieldConfig>) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          return { ...f, ...updates };
        }
        return f;
      })
    );
  };

  // Options management for DROPDOWN, MULTIPLE_CHOICE, CHECKBOX
  const handleAddOption = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const currentOptions = field.options || [];
    const newOptions = [...currentOptions, `New Option ${currentOptions.length + 1}`];
    updateField(fieldId, { options: newOptions });
  };

  const handleUpdateOption = (fieldId: string, optIndex: number, newLabel: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const newOptions = [...(field.options || [])];
    newOptions[optIndex] = newLabel.trim();
    updateField(fieldId, { options: newOptions });
  };

  const handleDeleteOption = (fieldId: string, optIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const currentOptions = field.options || [];
    if (currentOptions.length <= 1) {
      alert('A selection field must have at least one option.');
      return;
    }
    const newOptions = currentOptions.filter((_, idx) => idx !== optIndex);
    updateField(fieldId, { options: newOptions });
  };

  const handleMoveOption = (fieldId: string, optIndex: number, direction: 'up' | 'down') => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    const newOptions = [...field.options];
    const targetIdx = direction === 'up' ? optIndex - 1 : optIndex + 1;
    if (targetIdx < 0 || targetIdx >= newOptions.length) return;
    const temp = newOptions[targetIdx];
    newOptions[targetIdx] = newOptions[optIndex];
    newOptions[optIndex] = temp;
    updateField(fieldId, { options: newOptions });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F4C3A]" />
          <p className="font-semibold text-sm">Loading Ledger Field Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 pb-28">
      {/* 1. TOP HEADER & BAR */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F4C3A] text-white flex items-center justify-center shadow-xs">
              <TableProperties className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Ledger Field Builder</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Google Forms-style builder for Counter Cash Ledger columns, input types, and dropdown options
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetToDefaults}
              disabled={saving}
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Reset to 7 Reference Columns (Invoice Month, Customer Type, Customer Name, Invoice Number, Total Invoice Amount, Payment Mode, Cheque Status)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Reset Reference
            </button>

            <Link
              href="/dashboard/cash-ledger"
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              View Company Ledger
            </Link>

            <button
              onClick={handleSave}
              disabled={saving}
              className="py-2 px-4 rounded-lg bg-[#0F4C3A] hover:bg-[#15674F] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN BUILDER CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* Notifications */}
        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-2xs animate-fadeIn">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">{message}</p>
              <p className="text-emerald-700 mt-0.5">
                All registered organizations will immediately reflect this column order, input controls, and dropdown options.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Configuration Error</p>
              <p className="text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Guidance Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0F4C3A]" />
                <h2 className="text-sm font-bold text-slate-800">Initial Reference Template & Module Architecture</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Ledger columns, fields, and options are controlled directly by each <strong>Organization Admin (ORG_ADMIN / OWNER)</strong> for their respective company ledger.
                Super Admin controls global module availability, pricing, and activation. The template below serves as the initial reference default for new organizations.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <Link
                href="/admin/module-pricing"
                className="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                Module Availability & Pricing &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 3. FIELD CONFIGURATION CARDS (Google Forms Style) */}
        <div className="space-y-4">
          {fields.map((field, index) => {
            const isSelected = activeFieldId === field.id;
            const currentTypeObj = FIELD_TYPE_OPTIONS.find((t) => t.type === field.type) || FIELD_TYPE_OPTIONS[0];

            return (
              <div
                key={field.id}
                onClick={() => setActiveFieldId(field.id)}
                className={`bg-white rounded-2xl transition-all duration-200 shadow-2xs border ${
                  isSelected
                    ? 'border-l-4 border-l-[#0F4C3A] border-t-slate-300 border-r-slate-300 border-b-slate-300 shadow-md ring-1 ring-[#0F4C3A]/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Field Card Header Row */}
                <div className="p-5 pb-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center border border-slate-200">
                        {index + 1}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Column #{index + 1}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                        <Key className="w-2.5 h-2.5" /> key: <strong>{field.key}</strong>
                      </span>
                      {!field.active && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                      {field.required && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          Required
                        </span>
                      )}
                    </div>

                    {/* Order Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveUp(index);
                        }}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDown(index);
                        }}
                        disabled={index === fields.length - 1}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Inputs Row: Field Name & Field Type */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                    {/* Field Name Input (Allows editing label without altering machine key) */}
                    <div className="md:col-span-7">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Field Name (Column Header)
                      </label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                        placeholder="e.g. Customer Type"
                        className="w-full text-base font-semibold text-slate-900 border-b-2 border-slate-200 focus:border-[#0F4C3A] outline-none px-2 py-1.5 transition bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-t-md"
                      />
                    </div>

                    {/* Field Type Selector (12 Types) */}
                    <div className="md:col-span-5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Field Type
                      </label>
                      <div className="relative">
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const newType = e.target.value as LedgerFieldType;
                            const updates: Partial<LedgerFieldConfig> = { type: newType };
                            if (['DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX'].includes(newType)) {
                              if (!field.options || field.options.length === 0) {
                                updates.options = ['Option 1', 'Option 2'];
                              }
                            }
                            if (newType === 'MONTH' && !field.monthFormat) {
                              updates.monthFormat = 'MMMM_YYYY';
                            }
                            if (newType === 'CURRENCY') {
                              updates.currencySymbol = '₹';
                              updates.decimalPlaces = 2;
                            }
                            updateField(field.id, updates);
                          }}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 pr-9 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A] cursor-pointer"
                        >
                          {FIELD_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.type} value={opt.type}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{currentTypeObj.description}</p>
                    </div>
                  </div>
                </div>

                {/* Dynamic Configuration Section based on Field Type */}
                <div className="px-5 pb-4 pt-1 border-t border-slate-100">
                  {/* TYPE = CURRENCY */}
                  {field.type === 'CURRENCY' && (
                    <div className="grid grid-cols-2 gap-4 my-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Currency Symbol
                        </label>
                        <input
                          type="text"
                          value={field.currencySymbol || '₹'}
                          onChange={(e) => updateField(field.id, { currencySymbol: e.target.value })}
                          className="w-full max-w-[120px] bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Decimal Places
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={4}
                          value={field.decimalPlaces ?? 2}
                          onChange={(e) => updateField(field.id, { decimalPlaces: Number(e.target.value) })}
                          className="w-full max-w-[120px] bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* TYPE = MONTH */}
                  {field.type === 'MONTH' && (
                    <div className="my-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-700">Month Format:</span>{' '}
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-emerald-800 font-bold">
                          {field.monthFormat || 'MMMM_YYYY'}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Company users select from standard months (e.g. <strong>APRIL_2026</strong>) instead of typing free text.
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        e.g. {getCurrentMonthYearString()}
                      </span>
                    </div>
                  )}

                  {/* TYPE = DATE */}
                  {field.type === 'DATE' && (
                    <div className="my-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-700">Date Format:</span>{' '}
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                          {field.dateFormat || 'DD/MM/YYYY'}
                        </span>
                      </div>
                      <span className="text-slate-500">Standard calendar date picker</span>
                    </div>
                  )}

                  {/* TYPE = DROPDOWN, MULTIPLE_CHOICE, CHECKBOX Options Builder */}
                  {['DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX'].includes(field.type) && (
                    <div className="space-y-2.5 my-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <ListPlus className="w-4 h-4 text-[#0F4C3A]" />
                          Options ({field.options?.length || 0})
                        </label>
                        <span className="text-[11px] text-slate-500">
                          {field.type === 'CHECKBOX'
                            ? 'Users can select multiple options'
                            : 'Users select exactly one option'}
                        </span>
                      </div>

                      <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                        {(field.options || []).map((opt, optIdx) => {
                          const isOptionEditing = editingOptKey === `${field.id}_${optIdx}`;

                          return (
                            <div key={optIdx} className="flex items-center gap-2 group bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                              {/* Option Number / Bullet */}
                              <span className="text-slate-400 shrink-0 font-mono text-[11px] font-bold w-5 text-center">
                                {optIdx + 1}.
                              </span>

                              {/* Option Text / Edit mode */}
                              {isOptionEditing ? (
                                <div className="flex-1 flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editOptText}
                                    onChange={(e) => setEditOptText(e.target.value)}
                                    autoFocus
                                    className="flex-1 bg-slate-50 border border-[#0F4C3A] rounded px-2 py-1 text-xs text-slate-800 font-semibold outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      handleUpdateOption(field.id, optIdx, editOptText);
                                      setEditingOptKey(null);
                                    }}
                                    className="py-1 px-2 rounded bg-[#0F4C3A] text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Done
                                  </button>
                                </div>
                              ) : (
                                <span className="flex-1 text-xs text-slate-800 font-medium px-1">
                                  {opt}
                                </span>
                              )}

                              {/* Option Actions: Edit, Move Up/Down, Delete */}
                              <div className="flex items-center gap-1 text-slate-500">
                                {!isOptionEditing && (
                                  <button
                                    onClick={() => {
                                      setEditingOptKey(`${field.id}_${optIdx}`);
                                      setEditOptText(opt);
                                    }}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-600 transition cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
                                    title="Edit option label"
                                  >
                                    <Edit3 className="w-3 h-3 text-slate-500" />
                                    <span>Edit</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleMoveOption(field.id, optIdx, 'up')}
                                  disabled={optIdx === 0}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-20 cursor-pointer"
                                  title="Move up"
                                >
                                  <MoveUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleMoveOption(field.id, optIdx, 'down')}
                                  disabled={optIdx === (field.options?.length || 0) - 1}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-20 cursor-pointer"
                                  title="Move down"
                                >
                                  <MoveDown className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOption(field.id, optIdx)}
                                  className="p-1 rounded hover:bg-red-50 text-red-500 transition cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
                                  title="Delete option"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          onClick={() => handleAddOption(field.id)}
                          className="mt-2 text-xs font-bold text-[#0F4C3A] hover:text-[#187A5B] flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Add Option
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TYPE = YES_NO */}
                  {field.type === 'YES_NO' && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                      <span>Configured as binary choice: <strong>YES</strong> or <strong>NO</strong></span>
                      <div className="flex items-center gap-1 font-bold text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">YES</span>
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">NO</span>
                      </div>
                    </div>
                  )}

                  {/* IN-CARD LIVE PREVIEW (Section 10 requirement) */}
                  <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Eye className="w-3 h-3 text-[#0F4C3A]" />
                        Live Field Preview (How Company User Sees It)
                      </span>
                      <span className="text-[10px] text-slate-400">Preview</span>
                    </div>

                    <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {field.name || 'Untitled Field'}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {/* Dropdown Preview */}
                      {field.type === 'DROPDOWN' && (
                        <select
                          disabled
                          className="w-full max-w-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium"
                        >
                          <option>Select {field.name} ▼</option>
                          {(field.options || []).map((opt, i) => (
                            <option key={i}>{opt}</option>
                          ))}
                        </select>
                      )}

                      {/* Multiple Choice / Radio Preview */}
                      {field.type === 'MULTIPLE_CHOICE' && (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
                            <label key={i} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                              <input type="radio" name={`prev_${field.id}`} disabled defaultChecked={i === 0} />
                              {opt}
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Checkbox Preview */}
                      {field.type === 'CHECKBOX' && (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
                            <label key={i} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                              <input type="checkbox" disabled defaultChecked={i === 0} />
                              {opt}
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Currency Preview */}
                      {field.type === 'CURRENCY' && (
                        <div className="relative max-w-xs">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">₹</span>
                          <input
                            type="text"
                            disabled
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-700 font-bold"
                          />
                        </div>
                      )}

                      {/* Month Preview */}
                      {field.type === 'MONTH' && (
                        <select
                          disabled
                          className="w-full max-w-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-emerald-800 font-bold"
                        >
                          <option>{getCurrentMonthYearString()} ▼</option>
                        </select>
                      )}

                      {/* Date Preview */}
                      {field.type === 'DATE' && (
                        <input
                          type="text"
                          disabled
                          placeholder="DD/MM/YYYY"
                          className="max-w-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium"
                        />
                      )}

                      {/* Text Preview */}
                      {(field.type === 'SHORT_TEXT' || field.type === 'LONG_TEXT' || field.type === 'EMAIL' || field.type === 'PHONE' || field.type === 'NUMBER') && (
                        <input
                          type="text"
                          disabled
                          placeholder={field.placeholder || `Enter ${field.name}...`}
                          className="w-full max-w-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-500"
                        />
                      )}

                      {/* Yes/No Preview */}
                      {field.type === 'YES_NO' && (
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-xs text-slate-700 font-semibold">
                            <input type="radio" disabled defaultChecked /> YES
                          </label>
                          <label className="flex items-center gap-1 text-xs text-slate-700 font-semibold">
                            <input type="radio" disabled /> NO
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Field Card Footer Controls */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    {/* Required Switch [ON / OFF] */}
                    <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="rounded text-[#0F4C3A] focus:ring-[#0F4C3A]"
                      />
                      <span>Required [ {field.required ? 'ON' : 'OFF'} ]</span>
                    </label>

                    {/* Active Switch [ON / OFF] */}
                    <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={field.active}
                        onChange={(e) => updateField(field.id, { active: e.target.checked })}
                        className="rounded text-[#0F4C3A] focus:ring-[#0F4C3A]"
                      />
                      <span>Active in Ledger [ {field.active ? 'ON' : 'OFF'} ]</span>
                    </label>

                    {/* Column Width */}
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>Width:</span>
                      <input
                        type="number"
                        value={field.width || 170}
                        onChange={(e) => updateField(field.id, { width: Number(e.target.value) || 170 })}
                        className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 text-center font-mono"
                      />
                      <span>px</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateField(index);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition flex items-center gap-1 cursor-pointer"
                      title="Duplicate Field"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicate</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteField(index);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition flex items-center gap-1 cursor-pointer"
                      title="Delete Field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. MAIN ACTION BUTTON: + ADD FIELD */}
        <div className="pt-2">
          <button
            onClick={handleAddField}
            className="py-3 px-5 rounded-2xl bg-white border-2 border-dashed border-[#0F4C3A]/40 hover:border-[#0F4C3A] text-[#0F4C3A] font-bold text-sm flex items-center justify-center gap-2 w-full transition shadow-2xs hover:shadow-xs cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-50 group-hover:bg-[#0F4C3A] group-hover:text-white flex items-center justify-center transition">
              <Plus className="w-4 h-4" />
            </div>
            + ADD FIELD
          </button>
        </div>

        {/* 5. SUMMARY OF CONFIGURED COLUMNS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Configured Columns ({fields.filter((f) => f.active).length} Active Columns)
          </h3>
          <div className="flex flex-wrap gap-2">
            {fields.map((f, i) => (
              <span
                key={f.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                  f.active
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                }`}
              >
                <span className="font-mono text-[10px] text-slate-500">{i + 1}.</span>
                {f.name}
                <span className="text-[10px] uppercase font-bold text-slate-500">({f.type})</span>
                {f.required && <span className="text-red-500">*</span>}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
