'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  Loader2,
  Image,
  Star,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function QuotationTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);

  // Modal actions states
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [footerText, setFooterText] = useState('');
  const [terms, setTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [signatureText, setSignatureText] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  async function loadTemplates() {
    try {
      const res = await fetch('/api/quotations/templates');
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.templates || []);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function openCreate() {
    setError('');
    setSuccess('');
    setName('');
    setLogo('');
    setCompanyName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setGstNumber('');
    setWebsite('');
    setFooterText('');
    setTerms('1. Quotation rates subject to weight/dimension serviceability checks.\n2. Standard terms apply.');
    setPaymentTerms('Net 30');
    setValidityDays('30');
    setSignatureText('');
    setAuthorizedPerson('');
    setIsDefault(false);
    setIsEditing(false);
    setModalOpen(true);
  }

  function startEdit(tmpl: any) {
    setError('');
    setSuccess('');
    setEditId(tmpl.id);
    setName(tmpl.name);
    setLogo(tmpl.logo || '');
    setCompanyName(tmpl.companyName);
    setAddress(tmpl.address);
    setPhone(tmpl.phone);
    setEmail(tmpl.email);
    setGstNumber(tmpl.gstNumber || '');
    setWebsite(tmpl.website || '');
    setFooterText(tmpl.footerText || '');
    setTerms(tmpl.terms || '');
    setPaymentTerms(tmpl.paymentTerms || '');
    setValidityDays((tmpl.validityDays || 30).toString());
    setSignatureText(tmpl.signatureText || '');
    setAuthorizedPerson(tmpl.authorizedPerson || '');
    setIsDefault(tmpl.isDefault);
    setIsEditing(true);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !companyName || !address || !phone || !email) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/quotations/templates/${editId}` : '/api/quotations/templates';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          logo,
          companyName,
          address,
          phone,
          email,
          gstNumber,
          website,
          footerText,
          terms,
          paymentTerms,
          validityDays: parseInt(validityDays) || 30,
          signatureText,
          authorizedPerson,
          isDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(isEditing ? 'Template updated successfully.' : 'New template created.');
      setModalOpen(false);
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(tmplId: string) {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/quotations/templates/${tmplId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        setSuccess('Default template updated.');
        await loadTemplates();
      }
    } catch (err: any) {
      setError('Failed to update default template.');
    }
  }

  async function handleDelete(tmplId: string) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/quotations/templates/${tmplId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccess('Template deleted.');
        await loadTemplates();
      }
    } catch (err: any) {
      setError('Failed to delete template.');
    }
  }

  async function handleDuplicate(tmpl: any) {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/quotations/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tmpl,
          name: `${tmpl.name} - Copy`,
          isDefault: false,
        }),
      });
      if (res.ok) {
        setSuccess('Template duplicated.');
        await loadTemplates();
      }
    } catch (err: any) {
      setError('Failed to duplicate template.');
    }
  }

  // Handle Logo Upload base64 representation
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Quotation Templates</h1>
          <p className="text-xs text-slate-500 mt-1 font-light">
            Design and customize templates for commercial cargo and courier freight quotations.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="bg-[#1E8262] hover:bg-[#0F4C3A] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Template
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Directory Grid */}
      {templates.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No templates configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-normal font-light">
            Customize branding, logos, signature, tax, footer notes and terms of service by adding a template.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-350 transition relative">
              {tmpl.isDefault && (
                <span className="absolute top-4 right-4 bg-emerald-50 text-emerald-700 text-[8px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-100">
                  <Star className="w-2.5 h-2.5 fill-emerald-600" />
                  Default
                </span>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {tmpl.logo ? (
                    <img src={tmpl.logo} alt="Logo" className="w-8 h-8 rounded border object-contain p-0.5" />
                  ) : (
                    <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-slate-400">
                      <Image className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{tmpl.name}</h3>
                    <p className="text-[10px] text-slate-400">{tmpl.companyName}</p>
                  </div>
                </div>

                <div className="mt-3 text-xs space-y-1 text-slate-500 font-medium pt-2 border-t border-slate-50">
                  <div>Email: <strong className="text-slate-700 font-bold">{tmpl.email}</strong></div>
                  <div>Phone: <strong className="text-slate-700 font-bold">{tmpl.phone}</strong></div>
                  <div>Validity: <strong className="text-slate-700 font-bold">{tmpl.validityDays} Days</strong></div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 flex-wrap">
                {!tmpl.isDefault && (
                  <button
                    onClick={() => handleSetDefault(tmpl.id)}
                    className="w-full bg-slate-50 hover:bg-[#E8F5E9] hover:text-[#0F4C3A] text-slate-600 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 hover:border-emerald-200 transition"
                  >
                    Set as Default
                  </button>
                )}
                <div className="flex gap-1.5 w-full">
                  <button
                    onClick={() => startEdit(tmpl)}
                    className="w-full bg-[#E8F5E9] hover:bg-[#1E8262] text-[#0F4C3A] hover:text-white py-1.5 rounded-lg text-[10px] font-bold border border-emerald-100 transition flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(tmpl)}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="p-1.5 border border-slate-200 hover:bg-red-50 rounded-lg text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Modify Quotation Template' : 'Create Quotation Template'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Template Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Business Standard"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Geo Cargo Logistics"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="billing@geotransit.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9999999999"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">GST Number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="29AAAAA1111A1Z1"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Website URL</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.geotransit.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Validity (Days)</label>
              <input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Logistics Park, Bengaluru, India"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
              required
            />
          </div>

          {/* Logo Upload Block */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company Logo</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {logo && <img src={logo} alt="Preview" className="h-8 object-contain" />}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Net 30 days"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Authorized Designee</label>
              <input
                type="text"
                value={authorizedPerson}
                onChange={(e) => setAuthorizedPerson(e.target.value)}
                placeholder="John Doe (Director)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Signature Disclaimer Text</label>
            <input
              type="text"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              placeholder="This is a system generated quotation."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Terms & Conditions</label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium h-24 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Footer Notes</label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Thank you for your business!"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1E8262]"></div>
              <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase leading-none">Set as Default Template</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-5 rounded-lg text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-6 rounded-lg text-xs font-bold transition shadow-md"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
