'use client';

import React from 'react';
import { Navigation, Globe, MapPin, Plane } from 'lucide-react';

interface ShippingRouteVisualProps {
  mode: 'DOMESTIC' | 'INTERNATIONAL';
  origin?: string;
  destination?: string;
  courierName?: string;
}

export default function ShippingRouteVisual({
  mode = 'DOMESTIC',
  origin = 'Bengaluru',
  destination = 'Delhi',
  courierName = 'DTDC Express',
}: ShippingRouteVisualProps) {
  const isDomestic = mode === 'DOMESTIC';

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E8262_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {isDomestic ? (
              <Navigation className="w-4 h-4 text-emerald-400" />
            ) : (
              <Globe className="w-4 h-4 text-cyan-400" />
            )}
            <span className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
              {isDomestic ? 'Domestic Interstate Corridor' : 'Global International Network'}
            </span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            {courierName}
          </span>
        </div>

        {/* Route Animation Track */}
        <div className="py-4 px-2 flex items-center justify-between relative">
          {/* Origin Node */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                Origin
              </span>
              <strong className="text-sm font-black text-white">{origin}</strong>
            </div>
          </div>

          {/* Animated Connecting Line & Aircraft */}
          <div className="flex-1 mx-6 relative flex items-center justify-center">
            <div className="w-full border-b-2 border-dashed border-slate-700 relative" />
            
            {/* Pulsing Flight Badge */}
            <div className="absolute bg-[#1E8262] text-white p-2 rounded-full shadow-lg border border-emerald-400 animate-pulse">
              <Plane className="w-4 h-4 transform rotate-90" />
            </div>
          </div>

          {/* Destination Node */}
          <div className="flex items-center gap-3 relative z-10 text-right">
            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                Destination
              </span>
              <strong className="text-sm font-black text-white">{destination}</strong>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Route Details */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-800">
          <span>Transit Priority: <strong className="text-slate-200 uppercase">{isDomestic ? 'Express Surface / Air' : 'International Priority Air'}</strong></span>
          <span>Status: <strong className="text-emerald-400 uppercase">Service Available</strong></span>
        </div>
      </div>
    </div>
  );
}
