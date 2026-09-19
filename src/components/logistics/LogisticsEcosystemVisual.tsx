'use client';

import React from 'react';
import { Scale, Tags, Calculator, Navigation, FileText, ShoppingCart, PackageCheck, UserCheck } from 'lucide-react';

export default function LogisticsEcosystemVisual() {
  const nodes = [
    { title: 'WEIGHT', icon: Scale, subtitle: 'Calculator Engine' },
    { title: 'COURIERS', icon: Navigation, subtitle: 'Operator Directories' },
    { title: 'RATES', icon: Tags, subtitle: 'Slab & Per-KG Matrix' },
    { title: 'QUOTATIONS', icon: FileText, subtitle: 'Client Quotations' },
    { title: 'FOLLOW-UP', icon: UserCheck, subtitle: 'Sales CRM & Leads' },
    { title: 'PACKAGING', icon: ShoppingCart, subtitle: 'Cargo Materials' },
    { title: 'ORDERS', icon: PackageCheck, subtitle: 'Requirements & Orders' },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 via-[#0a261d] to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,130,98,0.15),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div className="text-center max-w-md mx-auto space-y-1">
          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-emerald-500/30">
            GEO TRANSIT Integrated Platform
          </span>
          <h3 className="text-lg font-black text-white tracking-tight">
            Logistics Operational Ecosystem
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Seamlessly connecting calculation, rate card management, quotation generation & cargo packaging in one hub.
          </p>
        </div>

        {/* Central Core & Satellite Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          {nodes.map((node, i) => {
            const Icon = node.icon;
            return (
              <div
                key={node.title}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 p-3 rounded-xl text-center space-y-1.5 transition-all duration-200 hover:-translate-y-1 group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#0F4C3A] text-emerald-400 flex items-center justify-center mx-auto shadow-sm group-hover:bg-[#1E8262] group-hover:text-white transition">
                  <Icon className="w-4 h-4" />
                </div>
                <strong className="block text-xs font-extrabold text-white tracking-wider">
                  {node.title}
                </strong>
                <span className="block text-[9px] text-slate-400 font-medium truncate">
                  {node.subtitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
