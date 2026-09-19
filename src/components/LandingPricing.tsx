'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  deviceLimit: number;
  recommended: boolean;
  price3Months: number;
  price6Months: number;
  price12Months: number;
}

interface LandingPricingProps {
  initialPlans: Plan[];
}

export default function LandingPricing({ initialPlans }: LandingPricingProps) {
  const [duration, setDuration] = useState<3 | 6 | 12>(12); // Default to 12 Months

  const plans = initialPlans || [];

  return (
    <div>
      {/* Duration Selector Toggle */}
      <div className="flex justify-center mb-12">
        <div className="bg-slate-200 p-1.5 rounded-xl inline-flex items-center gap-1 shadow-inner">
          <button
            onClick={() => setDuration(3)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              duration === 3
                ? 'bg-[#0F4C3A] text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3 Months
          </button>
          <button
            onClick={() => setDuration(6)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              duration === 6
                ? 'bg-[#0F4C3A] text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            6 Months
          </button>
          <button
            onClick={() => setDuration(12)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              duration === 12
                ? 'bg-[#0F4C3A] text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            12 Months
          </button>
        </div>
      </div>

      {/* Plans cards */}
      {plans.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-xl bg-white">
          <p className="text-slate-500 font-medium">No plans have been configured in the database yet.</p>
          <p className="text-xs text-slate-400 mt-1">Please login as Administrator to set up subscription plans.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 items-stretch">
          {plans.map((plan) => {
            let price = plan.price12Months;
            if (duration === 3) price = plan.price3Months;
            else if (duration === 6) price = plan.price6Months;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border flex flex-col p-6 transition-all duration-200 hover:-translate-y-1 ${
                  plan.recommended
                    ? 'border-2 border-[#1E8262] shadow-md ring-4 ring-emerald-50 hover:shadow-xl hover:ring-emerald-100'
                    : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-300'
                }`}
              >
                {/* Recommended Tag */}
                {plan.recommended && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1E8262] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    RECOMMENDED
                  </span>
                )}

                <div className="mb-4">
                  <h3 className="font-bold text-lg text-slate-950">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports up to {plan.deviceLimit} active client {plan.deviceLimit === 1 ? 'device' : 'devices'}.
                  </p>
                </div>

                <div className="my-6">
                  <span className="text-3xl font-extrabold text-[#0F4C3A]">₹{price}</span>
                  <span className="text-slate-500 text-sm font-semibold"> / {duration} Months</span>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                    + 18% GST Applicable
                  </p>
                </div>

                <ul className="text-xs text-slate-600 space-y-3 mb-8 flex-grow">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold font-mono">✓</span>
                    <span>{plan.deviceLimit} Active Session Tunnels</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold font-mono">✓</span>
                    <span>Unlimited Calculations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold font-mono">✓</span>
                    <span>PDF Export & Screenshots</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold font-mono">✓</span>
                    <span>Standard Email Support</span>
                  </li>
                </ul>

                <Link
                  href="/register"
                  className={`w-full py-2.5 rounded-xl font-bold text-center text-xs transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
                    plan.recommended
                      ? 'bg-[#0F4C3A] hover:bg-[#0c3c2e] text-white shadow-md hover:shadow-lg'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                  }`}
                >
                  Choose Plan
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
