'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Navigation, Loader2, ExternalLink, Plus, X, Upload, Trash2 } from 'lucide-react';
import { resolveCourierLogo } from '@/utils/courierLogos';

const STORAGE_KEY = 'geo_custom_tracking_couriers';
const DELETED_STORAGE_KEY = 'geo_deleted_tracking_couriers';

export default function TrackingPage() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual courier modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courierName, setCourierName] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation modal state
  const [courierToDelete, setCourierToDelete] = useState<any | null>(null);

  useEffect(() => {
    async function loadCouriers() {
      try {
        const res = await fetch('/api/couriers');
        let baseCouriers: any[] = [];
        if (res.ok) {
          const data = await res.json();
          baseCouriers = data.couriers || [];
        }

        // Load custom tracking couriers from persistence
        let customCouriers: any[] = [];
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            customCouriers = JSON.parse(stored);
          }
        } catch (e) {
          console.error('Failed to read custom tracking couriers from localStorage', e);
        }

        // Load deleted couriers list
        let deletedList: string[] = [];
        try {
          const delStored = localStorage.getItem(DELETED_STORAGE_KEY);
          if (delStored) {
            deletedList = JSON.parse(delStored);
          }
        } catch (e) {
          console.error('Failed to read deleted couriers from localStorage', e);
        }

        // Filter out deleted items from base couriers
        baseCouriers = baseCouriers.filter(
          (c) => !deletedList.includes(c.id) && !deletedList.includes(c.name?.trim().toLowerCase())
        );

        // Filter out deleted items and duplicate items from custom couriers
        const uniqueCustom = customCouriers.filter(
          (custom) =>
            !deletedList.includes(custom.id) &&
            !deletedList.includes(custom.name?.trim().toLowerCase()) &&
            !baseCouriers.some(
              (base) =>
                base.name?.trim().toLowerCase() === custom.name?.trim().toLowerCase() &&
                base.trackingUrl?.trim().toLowerCase() === custom.trackingUrl?.trim().toLowerCase()
            )
        );

        setCouriers([...baseCouriers, ...uniqueCustom]);
      } catch (err) {
        console.error('Failed to load couriers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCouriers();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setFormError('Please select a valid image file (PNG, JPG, JPEG, or WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image size must be less than 2MB.');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onload = () => {
      setIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCourier = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = courierName.trim();
    const trimmedUrl = trackingUrl.trim();

    if (!trimmedName) {
      setFormError('Please enter the courier company name.');
      return;
    }

    if (!trimmedUrl) {
      setFormError('Please enter the tracking portal URL.');
      return;
    }

    // Validate URL format
    let validUrl = trimmedUrl;
    try {
      const parsed = new URL(validUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setFormError('URL must begin with http:// or https://');
        return;
      }
    } catch {
      setFormError('Please enter a valid URL (e.g. https://example.com/track)');
      return;
    }

    // Prevent duplicate entries where the same name AND tracking URL already exist
    const isDuplicate = couriers.some(
      (c) =>
        c.name?.trim().toLowerCase() === trimmedName.toLowerCase() &&
        c.trackingUrl?.trim().toLowerCase() === validUrl.toLowerCase()
    );

    if (isDuplicate) {
      setFormError('A courier with this company name and tracking URL already exists.');
      return;
    }

    const newCourier = {
      id: `custom-track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      trackingUrl: validUrl,
      logoUrl: iconPreview || null,
      active: true,
    };

    // Immediately update state so card appears in list below
    const updatedCouriers = [...couriers, newCourier];
    setCouriers(updatedCouriers);

    // If this courier name was previously in the deleted list, un-delete it
    try {
      const delStored = localStorage.getItem(DELETED_STORAGE_KEY);
      if (delStored) {
        const deletedList: string[] = JSON.parse(delStored);
        const filtered = deletedList.filter(
          (item) => item !== trimmedName.toLowerCase()
        );
        localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (err) {
      console.error('Failed to update deleted list', err);
    }

    // Persist to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const existingCustom = stored ? JSON.parse(stored) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...existingCustom, newCourier]));
    } catch (err) {
      console.error('Failed to persist custom tracking courier to localStorage', err);
    }

    // Reset form and close modal
    setCourierName('');
    setTrackingUrl('');
    setIconPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormError('');
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!courierToDelete) return;

    const idToDelete = courierToDelete.id;
    const nameToDelete = courierToDelete.name?.trim().toLowerCase();

    // Immediately remove from state
    setCouriers((prev) => prev.filter((c) => c.id !== idToDelete));

    // Persist deletion
    try {
      const delStored = localStorage.getItem(DELETED_STORAGE_KEY);
      const deletedList: string[] = delStored ? JSON.parse(delStored) : [];
      if (!deletedList.includes(idToDelete)) {
        deletedList.push(idToDelete);
      }
      if (nameToDelete && !deletedList.includes(nameToDelete)) {
        deletedList.push(nameToDelete);
      }
      localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(deletedList));
    } catch (err) {
      console.error('Failed to persist deletion', err);
    }

    // Remove from custom couriers storage if it was custom
    try {
      const customStored = localStorage.getItem(STORAGE_KEY);
      if (customStored) {
        const customList = JSON.parse(customStored);
        const filtered = customList.filter(
          (c: any) =>
            c.id !== idToDelete && c.name?.trim().toLowerCase() !== nameToDelete
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (err) {
      console.error('Failed to remove custom tracking courier from localStorage', err);
    }

    setCourierToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Top-Right "+ Add Courier" Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Shipment Tracking</h1>
          <p className="text-xs text-slate-500 mt-1">Select a logistics partner to open their official package tracking gateway</p>
        </div>

        {/* Compact manual add option in the top-right highlighted area */}
        <button
          type="button"
          onClick={() => {
            setFormError('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#0F4C3A] hover:bg-[#1E8262] transition shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Courier</span>
        </button>
      </div>

      {couriers.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs flex flex-col justify-center items-center gap-2">
          <Navigation className="w-8 h-8 text-slate-300 animate-pulse" />
          <span>No courier partners have been configured yet.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {couriers.map((courier) => (
            (() => {
              const hasUrl = courier.trackingUrl && courier.trackingUrl.trim() !== '';
              const content = (
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center border border-emerald-200 overflow-hidden bg-white p-1 select-none shrink-0 shadow-2xs">
                      {(() => {
                        const logoUrl = resolveCourierLogo(courier.name, courier.logoUrl);
                        if (logoUrl) {
                          return (
                            <img
                              src={logoUrl}
                              alt={`${courier.name} logo`}
                              className="w-full h-full object-contain"
                            />
                          );
                        }
                        return (
                          <div className="flex flex-col items-center justify-center w-full h-full text-center">
                            <Navigation className="w-3.5 h-3.5 text-[#1E8262] mb-0.5" />
                            <span className="text-[9px] font-black leading-none">{courier.name ? courier.name[0].toUpperCase() : 'C'}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 group-hover:text-[#0F4C3A] text-sm block truncate">
                        {courier.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {hasUrl ? 'Tracking Portal' : 'Tracking not configured'}
                      </span>
                    </div>
                  </div>

                  {/* Action Icons: External Link + Delete Button */}
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    {hasUrl && (
                      <div className="relative group/link flex items-center justify-center">
                        <div className="p-1 rounded-lg hover:bg-blue-50 transition cursor-pointer flex items-center justify-center">
                          <ExternalLink className="w-[18px] h-[18px] text-blue-500 group-hover:text-blue-600 hover:text-blue-700 transition shrink-0" />
                        </div>
                        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-md shadow-md opacity-0 group-hover/link:opacity-100 transition-all duration-150 whitespace-nowrap z-30">
                          Open Portal
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    )}

                    {/* Delete Button with Red Color */}
                    <div className="relative group/del flex items-center justify-center">
                      <button
                        type="button"
                        title="Delete"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCourierToDelete(courier);
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-md shadow-md opacity-0 group-hover/del:opacity-100 transition-all duration-150 whitespace-nowrap z-30">
                        Delete
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                      </div>
                    </div>
                  </div>
                </div>
              );

              return hasUrl ? (
                <a
                  key={courier.id}
                  href={courier.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-[#1E8262] transition flex group cursor-pointer"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={courier.id}
                  className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex opacity-75"
                >
                  {content}
                </div>
              );
            })()
          ))}
        </div>
      )}

      {/* Clean Add Courier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-[#0F4C3A]">Add Courier Tracking Gateway</h2>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError('');
                  setIconPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddCourier} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* 1. Courier Company Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Courier Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. ABC Logistics"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition text-slate-800 placeholder-slate-400"
                  autoFocus
                />
              </div>

              {/* 2. Tracking Portal URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Tracking Portal URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://example.com/track"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* 3. Courier Icon / Logo Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Courier Icon / Logo <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  {iconPreview ? (
                    <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={iconPreview}
                        alt="Icon preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIconPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 hover:bg-red-600 text-white flex items-center justify-center transition shadow-xs cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="tracking-courier-icon-upload"
                      accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="tracking-courier-icon-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{iconPreview ? 'Change Icon' : 'Choose Icon Image'}</span>
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">
                      PNG, JPG, JPEG, or WEBP (Max 2MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Cancel & Add Courier */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError('');
                    setIconPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F4C3A] hover:bg-[#1E8262] rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Courier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {courierToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Courier?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to remove this courier?
                </p>
                {courierToDelete.name && (
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {courierToDelete.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCourierToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
