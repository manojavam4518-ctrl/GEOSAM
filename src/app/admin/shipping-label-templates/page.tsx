'use client';

import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Plus,
  Save,
  Trash2,
  Edit,
  CheckCircle,
  Eye,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Settings2,
  FileText,
  Sliders,
  Sparkles,
  Check,
  X,
  Upload,
} from 'lucide-react';
import ShippingLabelCard from '@/components/ShippingLabelCard';
import {
  ShippingLabelTemplateData,
  ShippingLabelFieldConfig,
  DEFAULT_MASTER_TEMPLATE,
  DEFAULT_GEO_TRANSIT_LOGO,
} from '@/lib/shippingLabel';

export default function AdminShippingLabelTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShippingLabelTemplateData | null>(null);
  const [isEditingNew, setIsEditingNew] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sample data for live preview canvas in admin editor
  const [previewSampleData, setPreviewSampleData] = useState<Record<string, any>>({
    recipient_name: 'ALPHA LOGISTICS PVT LTD',
    address_line_1: 'Plot 42, Western Express Industrial Corridor',
    address_line_2: 'Near Cargo Terminal Gate 3',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400099',
    mobile: '+91 98200 12345',
    service: 'LITE',
    service_type: 'STD EXP-A',
    origin_code: 'BOM',
    destination_code: 'DEL',
    payment_status: 'PREPAID',
    amount_to_collect: 0,
    tracking_number: 'GT2609001421',
    package_count: '001 / 001',
    route_location: 'NORTH HUB / BAY-2',
    weight: 2.5,
    date: new Date().toISOString().split('T')[0],
    time: '14:30',
    mode: 'AIR',
  });

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shipping-label-templates');
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load templates.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to template server.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  function handleCreateNew() {
    setEditingTemplate({
      ...DEFAULT_MASTER_TEMPLATE,
      name: 'New Custom Label Template',
      description: 'Customized thermal label layout',
      isDefault: false,
      isActive: true,
      version: 1,
    });
    setIsEditingNew(true);
  }

  function handleEdit(tmpl: any) {
    setEditingTemplate({
      ...tmpl,
      fields: tmpl.fields || DEFAULT_MASTER_TEMPLATE.fields,
      qrConfig: tmpl.qrConfig || DEFAULT_MASTER_TEMPLATE.qrConfig,
      barcodeConfig: tmpl.barcodeConfig || DEFAULT_MASTER_TEMPLATE.barcodeConfig,
    });
    setIsEditingNew(false);
  }

  async function handleSaveTemplate() {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) {
      setMessage({ type: 'error', text: 'Template name cannot be empty.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const url = isEditingNew
        ? '/api/admin/shipping-label-templates'
        : `/api/admin/shipping-label-templates/${editingTemplate.id}`;
      const method = isEditingNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Template saved successfully.' });
        setEditingTemplate(null);
        setIsEditingNew(false);
        fetchTemplates();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save template.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete or deactivate this template?')) return;
    try {
      const res = await fetch(`/api/admin/shipping-label-templates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchTemplates();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete template.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Server error while deleting template.' });
    }
  }

  // Handle Logo Upload (base64)
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo image should be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        if (editingTemplate) {
          setEditingTemplate({ ...editingTemplate, logoUrl: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Field Builder Actions
  function handleAddField() {
    if (!editingTemplate) return;
    const newFieldId = `f_${Date.now()}`;
    const newField: ShippingLabelFieldConfig = {
      id: newFieldId,
      name: 'Custom Field',
      key: `custom_${Date.now().toString().slice(-4)}`,
      type: 'SHORT_TEXT',
      required: false,
      visible: true,
      section: 'ROUTING',
      order: editingTemplate.fields.length + 1,
      placeholder: 'Enter details...',
    };
    setEditingTemplate({
      ...editingTemplate,
      fields: [...editingTemplate.fields, newField],
    });
  }

  function handleUpdateField(idx: number, updates: Partial<ShippingLabelFieldConfig>) {
    if (!editingTemplate) return;
    const updated = [...editingTemplate.fields];
    updated[idx] = { ...updated[idx], ...updates };
    setEditingTemplate({ ...editingTemplate, fields: updated });
  }

  function handleDeleteField(idx: number) {
    if (!editingTemplate) return;
    const field = editingTemplate.fields[idx];
    if (field.isProtected) {
      alert('This core shipping field is protected and cannot be deleted.');
      return;
    }
    const updated = editingTemplate.fields.filter((_, i) => i !== idx);
    setEditingTemplate({ ...editingTemplate, fields: updated });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-[#0F4C3A] text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
              SUPER ADMIN MASTER CONTROL
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <QrCode className="w-7 h-7 text-[#1E8262]" />
            Shipping Label Templates
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure master label dimensions (4×6, A6), barcode/QR positioning, platform branding, and company field schemas.
          </p>
        </div>

        {!editingTemplate && (
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 bg-[#0F4C3A] hover:bg-[#155d47] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + New Template
          </button>
        )}
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TEMPLATE LIST VIEW */}
      {!editingTemplate && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-[#1E8262] mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-600">Loading master label templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-sm font-bold text-slate-700">No label templates found.</p>
              <button
                onClick={handleCreateNew}
                className="mt-3 bg-[#0F4C3A] text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                Create First Master Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                    tmpl.isDefault ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {tmpl.sizePreset || '4x6'} Preset • v{tmpl.version || 1}
                      </span>
                      {tmpl.isDefault && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Active Default
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-base text-slate-900 leading-snug">{tmpl.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {tmpl.description || 'Master thermal shipping label template.'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Dimensions</span>
                        <span>{tmpl.widthInches}&quot; × {tmpl.heightInches}&quot; ({tmpl.widthMm} × {tmpl.heightMm} mm)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Fields</span>
                        <span>{Array.isArray(tmpl.fields) ? tmpl.fields.length : 20} Configured</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Barcode</span>
                        <span className="font-mono">{tmpl.barcodeConfig?.type || 'CODE128'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">QR Code</span>
                        <span>{tmpl.qrConfig?.enabled ? 'Active (2D)' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleEdit(tmpl)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#0F4C3A] hover:bg-[#155d47] text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Configure & Fields
                    </button>
                    <button
                      onClick={() => handleDelete(tmpl.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Deactivate / Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TEMPLATE BUILDER & LIVE CANVAS VIEW */}
      {editingTemplate && (
        <div className="space-y-6">
          {/* Back & Actions Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => {
                setEditingTemplate(null);
                setIsEditingNew(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Templates
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-bold">
                Version: <span className="text-emerald-700 font-black">v{(editingTemplate.version || 1) + (isEditingNew ? 0 : 1)} (On Save)</span>
              </span>

              <button
                onClick={handleSaveTemplate}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-[#0F4C3A] hover:bg-[#155d47] text-white px-5 py-2 rounded-xl font-bold text-xs shadow-sm transition-all hover:shadow-md cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEditingNew ? 'Create Master Template' : 'Save & Publish Template'}
              </button>
            </div>
          </div>

          {/* Dual Panel: Left Settings + Right Live Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT PANEL: CONFIGURATION TABS (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Core Template Info & Dimensions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-[#0F4C3A] border-b border-slate-100 pb-3">
                  <Sliders className="w-4 h-4 text-[#1E8262]" />
                  <h3 className="font-black text-sm uppercase tracking-wider">Template Specifications</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1E8262]"
                      placeholder="e.g. Standard 4x6 Logistics Label"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.description || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1E8262]"
                      placeholder="Usage notes or courier compliance..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Size Preset
                    </label>
                    <select
                      value={editingTemplate.sizePreset}
                      onChange={(e) => {
                        const val = e.target.value as '4x6' | 'A6' | 'CUSTOM';
                        let w = 4.0;
                        let h = 6.0;
                        let wm = 101.6;
                        let hm = 152.4;
                        if (val === 'A6') {
                          w = 4.13;
                          h = 5.83;
                          wm = 105.0;
                          hm = 148.0;
                        }
                        setEditingTemplate({
                          ...editingTemplate,
                          sizePreset: val,
                          widthInches: w,
                          heightInches: h,
                          widthMm: wm,
                          heightMm: hm,
                        });
                      }}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1E8262] bg-white"
                    >
                      <option value="4x6">4 × 6 Inch (Standard Thermal)</option>
                      <option value="A6">A6 Sheet (105 × 148 mm)</option>
                      <option value="CUSTOM">Custom Dimensions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Orientation
                    </label>
                    <select
                      value={editingTemplate.orientation}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          orientation: e.target.value as 'PORTRAIT' | 'LANDSCAPE',
                        })
                      }
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1E8262] bg-white"
                    >
                      <option value="PORTRAIT">Portrait</option>
                      <option value="LANDSCAPE">Landscape</option>
                    </select>
                  </div>

                  {editingTemplate.sizePreset === 'CUSTOM' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Width (mm)
                        </label>
                        <input
                          type="number"
                          value={editingTemplate.widthMm}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              widthMm: Number(e.target.value),
                              widthInches: Number((Number(e.target.value) / 25.4).toFixed(2)),
                            })
                          }
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Height (mm)
                        </label>
                        <input
                          type="number"
                          value={editingTemplate.heightMm}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              heightMm: Number(e.target.value),
                              heightInches: Number((Number(e.target.value) / 25.4).toFixed(2)),
                            })
                          }
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-4 sm:col-span-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={editingTemplate.isDefault}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })
                        }
                        className="rounded text-[#0F4C3A] focus:ring-[#1E8262]"
                      />
                      Set as Default Active Template
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={editingTemplate.isActive}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })
                        }
                        className="rounded text-[#0F4C3A] focus:ring-[#1E8262]"
                      />
                      Active for Organizations
                    </label>
                  </div>
                </div>
              </div>

              {/* Card 2: Branding & Master Logo Configuration */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-[#0F4C3A] border-b border-slate-100 pb-3">
                  <Sparkles className="w-4 h-4 text-[#1E8262]" />
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    Super Admin Logo & Protected Branding
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Master Carrier / Platform Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-36 h-14 bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-center overflow-hidden">
                        {editingTemplate.logoUrl ? (
                          <img
                            src={editingTemplate.logoUrl}
                            alt="Master Logo"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400">No Logo</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          Upload Logo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingTemplate({ ...editingTemplate, logoUrl: DEFAULT_GEO_TRANSIT_LOGO })
                          }
                          className="block text-[10px] text-[#1E8262] hover:underline font-bold"
                        >
                          Reset to GEO TRANSIT Official Logo
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Header Title
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.headerText || ''}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, headerText: e.target.value })
                      }
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="e.g. GEO TRANSIT EXPRESS CARGO"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.footerText || ''}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, footerText: e.target.value })
                      }
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="e.g. GEO TRANSIT LOGISTICS NETWORK"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: QR Code & Barcode Engine Settings */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-[#0F4C3A] border-b border-slate-100 pb-3">
                  <QrCode className="w-4 h-4 text-[#1E8262]" />
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    QR Code & Barcode Generation Engine
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Barcode Config */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase">Barcode Settings</span>
                      <label className="text-[10px] font-bold text-[#0F4C3A] flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingTemplate.barcodeConfig?.enabled ?? true}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              barcodeConfig: {
                                ...editingTemplate.barcodeConfig,
                                enabled: e.target.checked,
                              },
                            })
                          }
                          className="rounded text-[#0F4C3A]"
                        />
                        Active
                      </label>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Format
                      </label>
                      <select
                        value={editingTemplate.barcodeConfig?.type || 'CODE128'}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            barcodeConfig: {
                              ...editingTemplate.barcodeConfig,
                              type: e.target.value as any,
                            },
                          })
                        }
                        className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded bg-white"
                      >
                        <option value="CODE128">CODE128 (Universal Logistics)</option>
                        <option value="CODE39">CODE39</option>
                        <option value="EAN13">EAN13</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={editingTemplate.barcodeConfig?.showValue ?? true}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            barcodeConfig: {
                              ...editingTemplate.barcodeConfig,
                              showValue: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-[#0F4C3A]"
                      />
                      Display tracking number text below barcode
                    </label>
                  </div>

                  {/* QR Code Config */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase">QR Code Settings</span>
                      <label className="text-[10px] font-bold text-[#0F4C3A] flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingTemplate.qrConfig?.enabled ?? true}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              qrConfig: {
                                ...editingTemplate.qrConfig,
                                enabled: e.target.checked,
                              },
                            })
                          }
                          className="rounded text-[#0F4C3A]"
                        />
                        Active
                      </label>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        QR Data Source
                      </label>
                      <select
                        value={editingTemplate.qrConfig?.sourceField || 'tracking_number'}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            qrConfig: {
                              ...editingTemplate.qrConfig,
                              sourceField: e.target.value as any,
                            },
                          })
                        }
                        className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded bg-white"
                      >
                        <option value="tracking_number">Tracking / Consignment Number</option>
                        <option value="shipment_id">Internal Shipment ID</option>
                        <option value="combined">Combined Consignment Details</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Error Correction Level
                      </label>
                      <select
                        value={editingTemplate.qrConfig?.errorCorrectionLevel || 'M'}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            qrConfig: {
                              ...editingTemplate.qrConfig,
                              errorCorrectionLevel: e.target.value as any,
                            },
                          })
                        }
                        className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded bg-white"
                      >
                        <option value="L">L - Low (7%)</option>
                        <option value="M">M - Medium (15% - Recommended)</option>
                        <option value="Q">Q - Quartile (25%)</option>
                        <option value="H">H - High (30% Industrial)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Google Forms-Style Label Field Builder */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-[#0F4C3A]">
                    <Settings2 className="w-4 h-4 text-[#1E8262]" />
                    <h3 className="font-black text-sm uppercase tracking-wider">
                      Label Field Schema ({editingTemplate.fields.length} Fields)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddField}
                    className="inline-flex items-center gap-1.5 bg-[#0F4C3A] hover:bg-[#155d47] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Label Field
                  </button>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {editingTemplate.fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[10px] font-black font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => handleUpdateField(idx, { name: e.target.value })}
                            className="text-xs font-black text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-[#1E8262] px-1 py-0.5 flex-1"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-200 rounded text-slate-700">
                            {field.section}
                          </span>
                          {!field.isProtected && (
                            <button
                              type="button"
                              onClick={() => handleDeleteField(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded"
                              title="Delete Field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">
                            Field Key
                          </label>
                          <input
                            type="text"
                            disabled={field.isProtected}
                            value={field.key}
                            onChange={(e) => handleUpdateField(idx, { key: e.target.value })}
                            className="w-full text-[11px] font-mono px-2 py-1 border border-slate-200 rounded bg-white disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">
                            Field Type
                          </label>
                          <select
                            disabled={field.isProtected}
                            value={field.type}
                            onChange={(e) => handleUpdateField(idx, { type: e.target.value as any })}
                            className="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 rounded bg-white disabled:bg-slate-100"
                          >
                            <option value="SHORT_TEXT">Short Text</option>
                            <option value="LONG_TEXT">Long Text</option>
                            <option value="NUMBER">Number</option>
                            <option value="CURRENCY">Currency</option>
                            <option value="DATE">Date</option>
                            <option value="TIME">Time</option>
                            <option value="DROPDOWN">Dropdown</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">
                            Section
                          </label>
                          <select
                            value={field.section}
                            onChange={(e) => handleUpdateField(idx, { section: e.target.value as any })}
                            className="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 rounded bg-white"
                          >
                            <option value="SHIP_TO">SHIP TO</option>
                            <option value="SERVICE">SERVICE</option>
                            <option value="PAYMENT">PAYMENT</option>
                            <option value="BARCODE_TRACKING">BARCODE / TRACKING</option>
                            <option value="ROUTING">ROUTING & WEIGHT</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3 pt-4">
                          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                              className="rounded text-[#0F4C3A]"
                            />
                            Required
                          </label>
                          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.visible}
                              onChange={(e) => handleUpdateField(idx, { visible: e.target.checked })}
                              className="rounded text-[#0F4C3A]"
                            />
                            Visible
                          </label>
                        </div>
                      </div>

                      {/* Dropdown Options Editor */}
                      {field.type === 'DROPDOWN' && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                            Dropdown Options (Comma separated)
                          </span>
                          <input
                            type="text"
                            value={(field.options || []).join(', ')}
                            onChange={(e) =>
                              handleUpdateField(idx, {
                                options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              })
                            }
                            className="w-full text-[11px] font-medium px-2 py-1 border border-slate-200 rounded bg-white"
                            placeholder="e.g. LITE, CARGO, EXPRESS"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: LIVE LABEL PREVIEW CANVAS (5 Cols) */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                    LIVE CANVAS
                  </span>
                  <h3 className="font-black text-sm text-white">Super Admin Live Label Preview</h3>
                </div>
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-1 rounded">
                  {editingTemplate.widthInches}&quot; × {editingTemplate.heightInches}&quot;
                </span>
              </div>

              {/* Centered Label Card */}
              <div className="bg-slate-200/70 p-6 rounded-2xl border border-slate-300 flex justify-center shadow-inner overflow-hidden">
                <ShippingLabelCard
                  template={editingTemplate}
                  data={previewSampleData}
                  id="admin-label-live-preview"
                />
              </div>

              {/* Sample Preview Data Helper */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700 block">Preview Sample Data Controls</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400 block text-[9px] uppercase font-bold">Consignment No</label>
                    <input
                      type="text"
                      value={previewSampleData.tracking_number}
                      onChange={(e) =>
                        setPreviewSampleData({ ...previewSampleData, tracking_number: e.target.value })
                      }
                      className="w-full border rounded px-2 py-1 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[9px] uppercase font-bold">Payment Mode</label>
                    <select
                      value={previewSampleData.payment_status}
                      onChange={(e) =>
                        setPreviewSampleData({ ...previewSampleData, payment_status: e.target.value })
                      }
                      className="w-full border rounded px-2 py-1 font-bold"
                    >
                      <option value="PREPAID">PREPAID</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                      <option value="TO PAY">TO PAY</option>
                      <option value="PARTIAL">PARTIAL</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
