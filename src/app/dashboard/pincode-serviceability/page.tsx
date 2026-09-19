'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Loader2, ExternalLink } from 'lucide-react';

export default function PincodePage() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCouriers() {
      try {
        const res = await fetch('/api/couriers');
        if (res.ok) {
          const data = await res.json();
          setCouriers(data.couriers || []);
        }
      } catch (err) {
        console.error('Failed to load couriers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCouriers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">Pincode Serviceability</h1>
        <p className="text-xs text-slate-500 mt-1">Select a logistics partner to check their official zip/pincode service coverage portals</p>
      </div>

      {couriers.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs flex flex-col justify-center items-center gap-2">
          <MapPin className="w-8 h-8 text-slate-300 animate-pulse" />
          <span>No courier partners have been configured yet.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {couriers.map((courier) => (
            <a
              key={courier.id}
              href={courier.pincodeServiceabilityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-[#1E8262] transition flex justify-between items-center group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center font-bold text-sm border border-emerald-200">
                  {courier.name[0].toUpperCase()}
                </div>
                <div>
                  <span className="font-bold text-slate-800 group-hover:text-[#0F4C3A] text-sm block">
                    {courier.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Serviceability Portal</span>
                </div>
              </div>

              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#1E8262] transition" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
