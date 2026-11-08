'use client';

import React from 'react';
import {
  FileText,
  User,
  MapPin,
  Phone,
  CreditCard,
  Hash,
  Calendar,
  Sparkles,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  PenTool,
  CheckCircle2,
} from 'lucide-react';
import DigitalSignaturePad from '@/components/DigitalSignaturePad';
import IndianDatePicker from '@/components/IndianDatePicker';
import {
  PersonalDeclarationInput,
  PersonalDeclarationItem,
  createDefaultItems,
  getFormattedTodayDate,
} from '@/lib/personalDeclarationDb';
import {
  isValidPersonalDeclarationSignature,
  removeDuplicatePincodeFromAddress,
  convertAmountToWordsPersonalDeclaration,
} from '@/utils/personalDeclarationPdfExport';

export interface PersonalDeclarationEditorProps {
  formData: PersonalDeclarationInput;
  onChange: (updated: PersonalDeclarationInput) => void;
  onReset?: () => void;
  highlightSignature?: boolean;
}

export default function PersonalDeclarationEditor({
  formData,
  onChange,
  onReset,
  highlightSignature = false,
}: PersonalDeclarationEditorProps) {
  // Ensure declarationDate defaults to dynamic today date if missing
  React.useEffect(() => {
    if (!formData.declarationDate) {
      onChange({
        ...formData,
        declarationDate: getFormattedTodayDate(),
      });
    }
  }, [formData.declarationDate]);

  // Update a single field
  const updateField = (field: keyof PersonalDeclarationInput, value: any) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  // Update item in goods table
  const handleItemChange = (index: number, key: keyof PersonalDeclarationItem, value: any) => {
    const current = formData.items || [];
    const updated = [...current];
    if (!updated[index]) {
      updated[index] = { sNo: index + 1, description: '', amount: '' };
    }
    updated[index] = {
      ...updated[index],
      [key]: value,
    };
    onChange({
      ...formData,
      items: updated,
    });
  };

  // Add a new row to the table
  const handleAddRow = () => {
    const current = formData.items || [];
    const nextSNo = current.length + 1;
    const newItem: PersonalDeclarationItem = {
      sNo: nextSNo,
      description: '',
      amount: '',
    };
    onChange({
      ...formData,
      items: [...current, newItem],
    });
  };

  // Remove a row with accidental deletion protection
  const handleRemoveRow = (index: number) => {
    const current = formData.items || [];
    if (current.length <= 1) {
      // Don't remove the sole row; clear it
      const cleared: PersonalDeclarationItem[] = [{ sNo: 1, description: '', amount: '' }];
      onChange({ ...formData, items: cleared });
      return;
    }

    const item = current[index];
    const hasData = Boolean((item?.description || '').trim() || (item?.amount || '').trim());

    if (hasData) {
      const confirmed = window.confirm(
        `Are you sure you want to remove Row ${index + 1} (${item.description || 'Amount: ' + item.amount})?`
      );
      if (!confirmed) return;
    }

    // Filter out index and re-sequence serial numbers cleanly
    const updated = current
      .filter((_, idx) => idx !== index)
      .map((row, idx) => ({
        ...row,
        sNo: idx + 1,
      }));

    onChange({
      ...formData,
      items: updated,
    });
  };

  // Sanitize numeric amount input (prevent negatives, letters, invalid symbols)
  const handleAmountChange = (index: number, rawVal: string) => {
    let sanitized = rawVal.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
    handleItemChange(index, 'amount', sanitized);
  };

  // Auto-generate Docket Number
  const handleGenerateDocket = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    updateField('docketNumber', `GT-DKT-${timestamp}${randomHex}`);
  };

  // Quick Copy helpers
  const handleCopyConsignorToCustomer = () => {
    const rawAddr = [formData.consignorAddressLine1, formData.consignorAddressLine2]
      .filter(Boolean)
      .join(', ');
    const cleanedAddr =
      formData.consignorPincode && formData.consignorPincode.trim().length === 6
        ? removeDuplicatePincodeFromAddress(rawAddr, formData.consignorPincode)
        : rawAddr;
    onChange({
      ...formData,
      customerName: formData.consignorName || formData.customerName,
      residentialAddress: cleanedAddr || formData.residentialAddress,
    });
  };

  const handleCopyConsigneeToDestination = () => {
    const rawAddr = [formData.consigneeAddressLine1, formData.consigneeAddressLine2]
      .filter(Boolean)
      .join(', ');
    const cleanedAddr =
      formData.consigneePincode && formData.consigneePincode.trim().length === 6
        ? removeDuplicatePincodeFromAddress(rawAddr, formData.consigneePincode)
        : rawAddr;
    updateField('destinationAddress', cleanedAddr || `${formData.consigneeName}, Destination`);
  };

  // Handle Consignor PIN Code change & dynamic duplicate PIN detection/removal
  const handleConsignorPincodeChange = (rawPin: string) => {
    const cleanPin = rawPin.replace(/[^0-9]/g, '');
    if (cleanPin.length === 6) {
      const cleanedL1 = removeDuplicatePincodeFromAddress(formData.consignorAddressLine1, cleanPin);
      const cleanedL2 = removeDuplicatePincodeFromAddress(formData.consignorAddressLine2, cleanPin);
      const cleanedRes = removeDuplicatePincodeFromAddress(formData.residentialAddress, cleanPin);
      onChange({
        ...formData,
        consignorPincode: cleanPin,
        consignorAddressLine1: cleanedL1,
        consignorAddressLine2: cleanedL2,
        residentialAddress: cleanedRes,
      });
    } else {
      updateField('consignorPincode', cleanPin);
    }
  };

  const handleConsignorAddressBlur = () => {
    if (formData.consignorPincode && formData.consignorPincode.trim().length === 6) {
      const pin = formData.consignorPincode.trim();
      const cleanedL1 = removeDuplicatePincodeFromAddress(formData.consignorAddressLine1, pin);
      const cleanedL2 = removeDuplicatePincodeFromAddress(formData.consignorAddressLine2, pin);
      const cleanedRes = removeDuplicatePincodeFromAddress(formData.residentialAddress, pin);
      if (
        cleanedL1 !== formData.consignorAddressLine1 ||
        cleanedL2 !== formData.consignorAddressLine2 ||
        cleanedRes !== formData.residentialAddress
      ) {
        onChange({
          ...formData,
          consignorAddressLine1: cleanedL1,
          consignorAddressLine2: cleanedL2,
          residentialAddress: cleanedRes,
        });
      }
    }
  };

  // Handle Consignee PIN Code change & dynamic duplicate PIN detection/removal
  const handleConsigneePincodeChange = (rawPin: string) => {
    const cleanPin = rawPin.replace(/[^0-9]/g, '');
    if (cleanPin.length === 6) {
      const cleanedL1 = removeDuplicatePincodeFromAddress(formData.consigneeAddressLine1, cleanPin);
      const cleanedL2 = removeDuplicatePincodeFromAddress(formData.consigneeAddressLine2, cleanPin);
      const cleanedDest = removeDuplicatePincodeFromAddress(formData.destinationAddress, cleanPin);
      onChange({
        ...formData,
        consigneePincode: cleanPin,
        consigneeAddressLine1: cleanedL1,
        consigneeAddressLine2: cleanedL2,
        destinationAddress: cleanedDest,
      });
    } else {
      updateField('consigneePincode', cleanPin);
    }
  };

  const handleConsigneeAddressBlur = () => {
    if (formData.consigneePincode && formData.consigneePincode.trim().length === 6) {
      const pin = formData.consigneePincode.trim();
      const cleanedL1 = removeDuplicatePincodeFromAddress(formData.consigneeAddressLine1, pin);
      const cleanedL2 = removeDuplicatePincodeFromAddress(formData.consigneeAddressLine2, pin);
      const cleanedDest = removeDuplicatePincodeFromAddress(formData.destinationAddress, pin);
      if (
        cleanedL1 !== formData.consigneeAddressLine1 ||
        cleanedL2 !== formData.consigneeAddressLine2 ||
        cleanedDest !== formData.destinationAddress
      ) {
        onChange({
          ...formData,
          consigneeAddressLine1: cleanedL1,
          consigneeAddressLine2: cleanedL2,
          destinationAddress: cleanedDest,
        });
      }
    }
  };

  // Calculate total amount
  const totalAmount = formData.items.reduce((sum, item) => {
    const num = parseFloat(String(item.amount).replace(/[^0-9.]/g, ''));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <div className="space-y-6">
      {/* SECTION 1: Docket & Declaration Date */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
              1
            </span>
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide">
              Document Header &amp; Docket Information
            </h3>
          </div>
          <button
            type="button"
            onClick={handleGenerateDocket}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Auto-Gen Docket No
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Declaration Date (Top-Right)
            </label>
            <IndianDatePicker
              value={formData.declarationDate || getFormattedTodayDate()}
              onChange={(dateStr) => updateField('declarationDate', dateStr)}
              separator="/"
              placeholder="DD/MM/YYYY"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Docket Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.docketNumber}
                onChange={(e) => updateField('docketNumber', e.target.value)}
                placeholder="e.g. GT-DKT-102948"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Consignor & Consignee Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consignor Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
              2A
            </span>
            <h3 className="font-black text-xs text-slate-800 uppercase tracking-wide">
              CONSIGNOR&apos;S DETAILS
            </h3>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Consignor&apos;s Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.consignorName}
                onChange={(e) => updateField('consignorName', e.target.value)}
                placeholder="e.g. MR. ANKIT"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.consignorAddressLine1}
                onChange={(e) => updateField('consignorAddressLine1', e.target.value)}
                onBlur={handleConsignorAddressBlur}
                placeholder="Building, Flat, Street"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Address Line 2 (Area, City, State)
            </label>
            <input
              type="text"
              value={formData.consignorAddressLine2}
              onChange={(e) => updateField('consignorAddressLine2', e.target.value)}
              onBlur={handleConsignorAddressBlur}
              placeholder="Landmark, City, State"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Pin Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.consignorPincode}
                onChange={(e) => handleConsignorPincodeChange(e.target.value)}
                onBlur={handleConsignorAddressBlur}
                placeholder="6-digit PIN"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  maxLength={10}
                  value={formData.consignorContact}
                  onChange={(e) => updateField('consignorContact', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="10-digit Mobile"
                  className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Consignee Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
              2B
            </span>
            <h3 className="font-black text-xs text-slate-800 uppercase tracking-wide">
              CONSIGNEE&apos;S DETAILS
            </h3>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Consignee&apos;s Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.consigneeName}
                onChange={(e) => updateField('consigneeName', e.target.value)}
                placeholder="e.g. MR. ANKIT"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.consigneeAddressLine1}
                onChange={(e) => updateField('consigneeAddressLine1', e.target.value)}
                onBlur={handleConsigneeAddressBlur}
                placeholder="House, Street, Locality"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Address Line 2 (Area, City, State)
            </label>
            <input
              type="text"
              value={formData.consigneeAddressLine2}
              onChange={(e) => updateField('consigneeAddressLine2', e.target.value)}
              onBlur={handleConsigneeAddressBlur}
              placeholder="Landmark, City, State"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Pin Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.consigneePincode}
                onChange={(e) => handleConsigneePincodeChange(e.target.value)}
                onBlur={handleConsigneeAddressBlur}
                placeholder="6-digit PIN"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  maxLength={10}
                  value={formData.consigneeContact}
                  onChange={(e) => updateField('consigneeContact', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="10-digit Mobile"
                  className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Declaration Introduction Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
              3
            </span>
            <div>
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                Declaration Introduction Statement
              </h3>
              <p className="text-[11px] text-slate-500">
                Populates &quot;Dear Sir/Madam, I [Customer Name] a resident of [Address]...&quot;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyConsignorToCustomer}
            title="Auto-fill Customer Name and Residence from Consignor details above"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            Copy from Consignor
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer Name (I [Customer Name] a resident of...) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              placeholder="e.g. Consignee / Customer Full Name"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold text-slate-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Identification Number (Aadhaar / PAN / Passport) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.identificationNumber}
                onChange={(e) => updateField('identificationNumber', e.target.value)}
                placeholder="e.g. 5482 9102 3847 or ABCDE1234F"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Residential Address of Customer <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.residentialAddress}
              onChange={(e) => updateField('residentialAddress', e.target.value)}
              onBlur={handleConsignorAddressBlur}
              placeholder="e.g. Complete residential address with landmark and PIN Code"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Destination Address (Want to send goods to...) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleCopyConsigneeToDestination}
                className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                Copy Consignee
              </button>
            </div>
            <input
              type="text"
              value={formData.destinationAddress}
              onChange={(e) => updateField('destinationAddress', e.target.value)}
              onBlur={handleConsigneeAddressBlur}
              placeholder="e.g. Destination City, State - PIN Code"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: Dynamic Goods Description Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
              4
            </span>
            <div>
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                Goods Description Table ({formData.items?.length || 0} Rows)
              </h3>
              <p className="text-[11px] text-slate-500">
                Enter item descriptions and corresponding amounts. Preserved in high-res A4 PDF export.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              Total Amount:{' '}
              <span className="text-emerald-700 font-mono font-black">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </span>
            <button
              type="button"
              onClick={() => updateField('items', createDefaultItems())}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 rounded transition-colors cursor-pointer"
              title="Reset to initial 10 empty rows"
            >
              Reset 10 Rows
            </button>
            <button
              type="button"
              onClick={() => updateField('items', [{ sNo: 1, description: '', amount: '' }])}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
              title="Clear all rows except one"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Dynamic Rows Input Table */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500 px-2">
            <div className="col-span-1 text-center">S.No</div>
            <div className="col-span-7 sm:col-span-8">List / Description of Items</div>
            <div className="col-span-3 sm:col-span-2 text-right">Amount (₹)</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          {(formData.items || []).map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 items-center bg-slate-50/70 hover:bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 transition-colors group"
            >
              <div className="col-span-1 text-center font-mono font-bold text-xs text-slate-600">
                {item.sNo || i + 1}
              </div>
              <div className="col-span-7 sm:col-span-8">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleItemChange(i, 'description', e.target.value)}
                  placeholder={
                    i === 0
                      ? 'e.g. Household Clothes & Utensils'
                      : i === 1
                      ? 'e.g. Books & Study Materials'
                      : `Item ${i + 1} description (optional)`
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 bg-white"
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <input
                  type="text"
                  value={item.amount}
                  onChange={(e) => handleAmountChange(i, e.target.value)}
                  placeholder="e.g. 2,500"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-right font-mono font-semibold text-slate-900 bg-white"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleRemoveRow(i)}
                  title={`Remove row ${item.sNo || i + 1}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Clear & Prominent + ADD ROW Button Directly Below Table */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            + ADD ROW
          </button>

          <div className="flex flex-col items-end gap-1 text-right">
            <div className="flex items-center justify-end gap-2 text-right">
              <span className="text-[11px] font-bold text-slate-500">Total Calculated Amount:</span>
              <span className="text-sm font-black font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
            {totalAmount > 0 && (
              <div className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                <span className="font-bold text-slate-700">Amount in Words: </span>
                <span className="italic">{convertAmountToWordsPersonalDeclaration(totalAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5: Customer Signature (Mandatory Digital Sign) */}
      <div
        id="personal-signature-section"
        className={`bg-white rounded-2xl border-2 transition-all duration-300 p-6 shadow-xs space-y-4 ${
          highlightSignature
            ? 'border-amber-500 ring-4 ring-amber-500/40 animate-pulse shadow-amber-200/50'
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
              5
            </span>
            <div>
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center">
                <span>Customer Signature</span>
                <span className="text-red-500 font-black ml-1 text-base" title="Mandatory Signature Field">*</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                A valid digital signature is mandatory before downloading or exporting the Personal Goods Declaration Note PDF.
              </p>
            </div>
          </div>
          {formData.signatureBase64 && isValidPersonalDeclarationSignature(formData.signatureBase64) ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Signature Recorded
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-300">
              <span className="text-red-500 font-black">*</span> Signature Required
            </span>
          )}
        </div>

        <div className="max-w-md">
          <DigitalSignaturePad
            value={formData.signatureBase64 || ''}
            title="CUSTOMER'S SIGNATURE"
            onChange={(base64) => updateField('signatureBase64', base64)}
            isHighlighted={highlightSignature}
            required={true}
          />
        </div>
      </div>

      {/* Reset Form Button */}
      {onReset && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Personal Declaration Form</span>
          </button>
        </div>
      )}
    </div>
  );
}

