'use client';

import React from 'react';
import { Package, Clock, CheckCircle2, FileText, CreditCard, PackageCheck } from 'lucide-react';

interface PackagingWorkflowVisualProps {
  currentStatus?: string;
}

export default function PackagingWorkflowVisual({
  currentStatus = 'SUBMITTED',
}: PackagingWorkflowVisualProps) {
  const steps = [
    { key: 'SUBMITTED', title: 'REQUEST RECEIVED', icon: Package, desc: 'Requirement submitted' },
    { key: 'ADMIN_REVIEW', title: 'ADMIN REVIEW', icon: Clock, desc: 'Spec & MOQ valuation' },
    { key: 'QUOTED', title: 'QUOTATION', icon: FileText, desc: 'Pricing offer generated' },
    { key: 'ACCEPTED', title: 'CUSTOMER APPROVAL', icon: CheckCircle2, desc: 'Client accepts quote' },
    { key: 'PAID', title: 'PAYMENT', icon: CreditCard, desc: 'Payment verified' },
    { key: 'CONFIRMED', title: 'ORDER CONFIRMED', icon: PackageCheck, desc: 'Dispatched to production' },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="bg-emerald-50 text-[#0F4C3A] text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200">
            Cargo Packaging Studio
          </span>
          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mt-1">
            Custom Packaging Order Lifecycle
          </h4>
        </div>
        <span className="text-[10px] font-bold text-slate-500">
          6-Stage Procurement Pipeline
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStatus === step.key || (currentStatus === 'SUBMITTED' && idx === 0);

          return (
            <div
              key={step.key}
              className={`p-3 rounded-xl border transition-all ${
                isActive
                  ? 'bg-[#0F4C3A] text-white border-[#0F4C3A] shadow-sm'
                  : 'bg-slate-50/80 border-slate-200/80 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  Stage {idx + 1}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
              </div>

              <strong className={`block text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                {step.title}
              </strong>
              <span className={`block text-[9.5px] font-medium mt-1 ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
