'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  Scale,
  History,
  Navigation,
  MapPin,
  CreditCard,
  FileText,
  Smartphone,
  ShieldCheck,
  Zap,
  Calculator,
  ArrowRight,
  Package,
  UserCheck,
} from 'lucide-react';
import LogisticsEcosystemVisual from '@/components/logistics/LogisticsEcosystemVisual';
import ShipmentIntelligenceVisual from '@/components/logistics/ShipmentIntelligenceVisual';
import CalculationActivityTimeline from '@/components/logistics/CalculationActivityTimeline';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Error fetching dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-[#107c5a] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { user } = data || {};
  const isDemo = user?.isDemo;

  const quickActions = [
    { title: 'Weight Calculator', desc: 'Compute raw and volumetric cargo weights', path: '/dashboard/calculator', icon: Scale },
    { title: 'Rate Calculator', desc: 'Compare contract rates across system and custom slabs', path: '/dashboard/rate-calculator', icon: Calculator },
    { title: 'Calculation History', desc: 'View and export recent cargo weight evaluations', path: '/dashboard/history', icon: History },
    { title: 'Quotations', desc: 'Manage generated client quotes and invoices', path: '/dashboard/quotations', icon: FileText },
    { title: 'Sales Follow-Up', desc: 'Track customer leads, quotes & follow-up actions', path: '/dashboard/sales-follow-up', icon: UserCheck },
    { title: 'Subscriptions', desc: 'Upgrade or renew active portal credentials', path: '/dashboard/subscriptions', icon: CreditCard },
    { title: 'My Devices', desc: 'Track and manage active client sessions', path: '/dashboard/devices', icon: Smartphone },
    { title: 'Tracking Portal', desc: 'Quickly access carrier tracking systems', path: '/dashboard/tracking', icon: Navigation },
    { title: 'Pincode Lookup', desc: 'Verify origin and destination location serviceability', path: '/dashboard/pincode-serviceability', icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-[#0e382c] text-white p-6 rounded-xl shadow-sm relative overflow-hidden">
        <span className="text-[10px] bg-[#107c5a] text-emerald-50 font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
          Enterprise Logistics Workspace
        </span>
        <h1 className="text-xl font-bold mt-3.5 tracking-tight">Welcome back, {user?.name}!</h1>
        <p className="text-xs text-emerald-100/90 mt-1.5 max-w-xl font-medium leading-relaxed">
          Logged in on behalf of <span className="underline decoration-[#107c5a] decoration-2 font-bold">{user?.company}</span>. Monitor volumetric package evaluations, track carrier shipments, and manage client device sessions from this centralized command workspace.
        </p>
      </div>

      {/* Choice Section: Calculate Shipping vs Shop Packaging */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">What do you need today?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/rate-calculator"
            className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:border-[#107c5a] hover:bg-slate-50/50 transition-all hover-lift group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#107c5a] flex items-center justify-center shrink-0 group-hover:bg-[#f0f7f4]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 group-hover:text-[#0e382c]">Calculate Shipping Rates</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Volumetric Weight & Rate Calculator for quick carrier evaluation.</p>
            </div>
          </Link>

          <Link
            href="/dashboard/packaging"
            className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:border-[#107c5a] hover:bg-slate-50/50 transition-all hover-lift group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#107c5a] flex items-center justify-center shrink-0 group-hover:bg-[#f0f7f4]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 group-hover:text-[#0e382c]">Shop Packaging Materials</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Order Boxes, stretch wraps & tapes or submit custom bulk requirement.</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Subscription Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 p-6 rounded-xl shadow-sm">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Subscription Overview</h2>
          
          {isDemo ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="inline-block bg-amber-100/70 border border-amber-200/60 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase">
                  Demo Account
                </span>
                <p className="text-sm text-slate-700 font-bold pt-1.5">
                  You are currently using the limited-access Free Demo.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Calculation limit: 10 calculations maximum. Upgrade to a paid plan to get unlimited calculations, multiple device support, and tax invoice generation.
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl text-center min-w-[160px] shadow-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Calculations Used</span>
                <span className="text-2xl font-black text-[#0e382c] mt-1">{user?.calculationsCount} / 10</span>
                <Link
                  href="/dashboard/subscriptions"
                  className="mt-3 w-full bg-[#107c5a] hover:bg-[#0e382c] text-white text-xs font-bold py-2 px-3 rounded-lg transition text-center shadow-sm"
                >
                  Upgrade Portal &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1 sm:col-span-2">
                <span className="inline-block bg-[#f0f7f4] border border-emerald-200 text-[#107c5a] text-[10px] font-bold px-2.5 py-0.5 rounded uppercase">
                  Active Subscription
                </span>
                <h3 className="text-base font-black text-slate-800 pt-1.5">{user?.activeSubscription?.planName}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Enjoy unlimited calculations, professional PDF report exports, and screenshot capturing. Manage your active logged-in devices in the devices panel.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl sm:col-span-1 shadow-xs">
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Device Slots</span>
                  <span className="text-sm font-extrabold text-[#107c5a] leading-tight">
                    {user?.activeDevicesCount} / {user?.activeSubscription?.deviceLimit}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Custom Rates</span>
                  <span className="text-sm font-extrabold text-[#107c5a] leading-tight">
                    {user?.customRateCardsCount ?? 0} / {user?.activeSubscription?.customRateCardLimit}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">System Rates</span>
                  <span className="text-sm font-extrabold text-[#107c5a] leading-tight">
                    {user?.systemRateCardsCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Expires</span>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight block mt-0.5">
                    {formatDateIndian(user?.activeSubscription?.endDate)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Tips Box */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#0F4C3A] mb-3">
              <Zap className="w-4 h-4 text-[#107c5a]" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Quick Note</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Logistics volumetric divisor default values are pre-set (Surface Mode: 4000, Air Mode: 4500) but can be customized under &quot;Other&quot; divisor options inside the primary weight calculator.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#107c5a]">
            <span>Need Help?</span>
            <a href="mailto:support@geotransit.com" className="hover:underline">Contact Support</a>
          </div>
        </div>
      </div>

      {/* Signature GEO TRANSIT Ecosystem Hub */}
      <LogisticsEcosystemVisual />

      {/* Shipment Intelligence Valuation & Calculation Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ShipmentIntelligenceVisual />
        </div>
        <div className="lg:col-span-1">
          <CalculationActivityTimeline />
        </div>
      </div>

      {/* Quick Navigation */}
      <div>
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.path}
                className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs hover:border-[#107c5a] transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col h-full group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 text-[#107c5a] flex items-center justify-center mb-3.5 shrink-0 transition-colors group-hover:bg-[#f0f7f4]">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-800 group-hover:text-[#0e382c] leading-tight">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed flex-grow">
                  {action.desc}
                </p>
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#107c5a] mt-4 opacity-0 group-hover:opacity-100 transition duration-150 transform group-hover:translate-x-0.5">
                  <span>Open Utility</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
