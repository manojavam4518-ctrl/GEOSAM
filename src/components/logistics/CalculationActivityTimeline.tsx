'use client';

import React from 'react';
import { History, Scale, Plane, Package, Clock } from 'lucide-react';

export default function CalculationActivityTimeline() {
  const activities = [
    { time: '09:42 AM', title: 'Package Evaluated', weight: '12.5 KG', mode: 'Domestic Surface', icon: Scale },
    { time: '10:18 AM', title: 'International Shipment', weight: '8.2 KG', mode: 'Air Express Priority', icon: Plane },
    { time: '11:04 AM', title: 'Air Cargo Heavy Freight', weight: '25.0 KG', mode: 'Commercial Cargo', icon: Package },
    { time: '01:30 PM', title: 'Quotations Prepared', weight: '15.0 KG', mode: 'Multi-Courier Compare', icon: History },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#1E8262]" />
          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
            Calculation Activity Feed
          </h4>
        </div>
        <span className="text-[10px] font-bold text-slate-500">Live Timeline</span>
      </div>

      <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
        {activities.map((act, idx) => {
          const Icon = act.icon;
          return (
            <div key={idx} className="flex items-start gap-4 relative pl-1">
              <div className="w-7 h-7 rounded-lg bg-[#E8F5E9] text-[#0F4C3A] border border-emerald-200 flex items-center justify-center shrink-0 z-10 font-bold">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 font-mono">{act.time}</span>
                    <strong className="text-xs font-extrabold text-slate-900">{act.title}</strong>
                  </div>
                  <span className="block text-[10.5px] font-medium text-slate-500 mt-0.5">{act.mode}</span>
                </div>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-black text-[#0F4C3A] shrink-0">
                  {act.weight}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
