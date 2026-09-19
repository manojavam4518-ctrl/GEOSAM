'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  CheckSquare,
  TrendingUp,
  Smartphone,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Tags,
  Truck,
  FileText,
  UserCheck,
  ShoppingBag,
  Package,
  ShoppingCart,
  Plus,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  Layers,
} from 'lucide-react';

export default function AdminDashboardHome() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/admin/overview');
        if (res.ok) {
          const json = await res.json();
          setStats(json.stats);
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  const logistics = stats?.logistics || {};
  const shopping = stats?.shopping || {};
  const subscriptions = stats?.subscriptions || {};

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#0F4C3A] tracking-tight">Enterprise Administration Dashboard</h1>
            <span className="bg-emerald-100 text-[#0F4C3A] border border-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
              Live System
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Central command console for GEO TRANSIT Logistics Operations & Packaging Commerce Marketplace
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/rate-cards"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> System Rate Card
          </Link>
          <Link
            href="/admin/packaging/products"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Packaging Product
          </Link>
        </div>
      </div>

      {/* Urgent Notices Banner */}
      {subscriptions?.pendingPayments > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between flex-wrap gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>You have <strong>{subscriptions.pendingPayments} pending subscription payment(s)</strong> awaiting manual UTR code verification.</span>
          </div>
          <Link
            href="/admin/payments"
            className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
          >
            Review Payments &rarr;
          </Link>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: LOGISTICS MANAGEMENT OVERVIEW */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-l-4 border-[#0F4C3A] pl-3 py-0.5">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#0F4C3A]" />
              1. Logistics Operations & Rate Management
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">Rate cards, courier integrations, quotations, and sales follow-ups</p>
          </div>
          <Link href="/admin/rate-cards" className="text-xs font-bold text-[#0F4C3A] hover:underline flex items-center gap-0.5">
            Manage Logistics &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Total Quotations */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Quotations</span>
              <span className="text-2xl font-black text-slate-900 block">{logistics.totalQuotations || 0}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                +{logistics.todaysQuotations || 0} generated today
              </span>
            </div>
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Active Rate Cards */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Rate Cards</span>
              <span className="text-2xl font-black text-slate-900 block">{logistics.activeRateCards || 0}</span>
              <Link href="/admin/rate-cards" className="text-[10px] text-[#0F4C3A] font-semibold hover:underline block">
                Manage system cards &rarr;
              </Link>
            </div>
            <div className="p-3.5 bg-emerald-50 text-[#0F4C3A] rounded-2xl shrink-0">
              <Tags className="w-6 h-6" />
            </div>
          </div>

          {/* Active Courier Companies */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Courier Companies</span>
              <span className="text-2xl font-black text-slate-900 block">{logistics.activeCourierCompanies || 0}</span>
              <Link href="/admin/couriers" className="text-[10px] text-[#0F4C3A] font-semibold hover:underline block">
                View carriers directory &rarr;
              </Link>
            </div>
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          {/* Pending Sales Follow-Ups */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending Sales Follow-Ups</span>
              <span className="text-2xl font-black text-amber-600 block">{logistics.pendingSalesFollowUps || 0}</span>
              <Link href="/admin/sales-follow-up" className="text-[10px] text-amber-600 font-semibold hover:underline block">
                Open follow-up board &rarr;
              </Link>
            </div>
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Active Customers */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between lg:col-span-2">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Customer Accounts</span>
              <span className="text-2xl font-black text-slate-900 block">{logistics.activeCustomers || 0}</span>
              <p className="text-[11px] text-slate-500 font-medium">Logistics clients with enabled account status</p>
            </div>
            <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: SHOPPING MANAGEMENT OVERVIEW */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-l-4 border-emerald-500 pl-3 py-0.5">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              2. Packaging Material Commerce & Orders
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">Packaging shop products, customer orders, fulfillment, and revenue</p>
          </div>
          <Link href="/admin/packaging/orders" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-0.5">
            Manage Packaging &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Packaging Orders */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Packaging Orders</span>
              <span className="text-2xl font-black text-slate-900 block">{shopping.totalPackagingOrders || 0}</span>
              <Link href="/admin/packaging/orders" className="text-[10px] text-[#0F4C3A] font-semibold hover:underline block">
                View order ledger &rarr;
              </Link>
            </div>
            <div className="p-3.5 bg-teal-50 text-teal-600 rounded-2xl shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>

          {/* Pending Payment Orders */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending Payment</span>
              <span className="text-2xl font-black text-amber-600 block">{shopping.pendingOrders || 0}</span>
              <span className="text-[10px] text-slate-500 font-medium block">Awaiting customer proof</span>
            </div>
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Processing / Shipped */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Processing / Shipped</span>
              <span className="text-2xl font-black text-blue-600 block">{shopping.processingOrders || 0}</span>
              <span className="text-[10px] text-slate-500 font-medium block">In dispatch workflow</span>
            </div>
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
              <Package className="w-6 h-6" />
            </div>
          </div>

          {/* Delivered Orders */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Delivered Orders</span>
              <span className="text-2xl font-black text-emerald-600 block">{shopping.deliveredOrders || 0}</span>
              <span className="text-[10px] text-slate-500 font-medium block">Fulfilled successfully</span>
            </div>
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Packaging Sales Summary Bar */}
        <div className="bg-gradient-to-r from-[#0F4C3A] to-[#1E8262] text-white p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black tracking-widest text-emerald-200">Packaging Marketplace Revenue</span>
            <div className="text-2xl font-black text-white">₹{shopping.packagingSalesRevenue?.toLocaleString() || '0.00'}</div>
            <p className="text-xs text-emerald-100 font-light">Gross sales from verified packaging material orders across India</p>
          </div>
          <Link
            href="/admin/packaging/orders"
            className="bg-white text-[#0F4C3A] hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs flex items-center gap-1 shrink-0"
          >
            Manage Packaging Orders &rarr;
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: SUBSCRIPTIONS & PLATFORM MANAGEMENT */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-l-4 border-purple-600 pl-3 py-0.5">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              3. Platform Subscriptions & Accounts
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">SaaS plan accounts, demo user tracking, and manual payment verification</p>
          </div>
          <Link href="/admin/users" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-0.5">
            Manage Users & Plans &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Registered Users */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Users</span>
              <span className="text-2xl font-black text-slate-900 block">{subscriptions.totalUsers || 0}</span>
              <Link href="/admin/users" className="text-[10px] text-purple-600 font-semibold hover:underline block">
                User directory &rarr;
              </Link>
            </div>
            <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Active Paid Subscriptions */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Paid Accounts</span>
              <span className="text-2xl font-black text-emerald-600 block">{subscriptions.activeSubscriptions || 0}</span>
              <Link href="/admin/plans" className="text-[10px] text-emerald-600 font-semibold hover:underline block">
                View SaaS plans &rarr;
              </Link>
            </div>
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          {/* Active Demo Users */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Demo Plan Accounts</span>
              <span className="text-2xl font-black text-amber-600 block">{subscriptions.demoUsers || 0}</span>
              <span className="text-[10px] text-slate-500 font-medium block">10-calc limit enforced</span>
            </div>
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          {/* Portal Subscription Revenue */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SaaS Revenue</span>
              <span className="text-2xl font-black text-[#0F4C3A] block">₹{subscriptions.subscriptionRevenue?.toLocaleString() || '0.00'}</span>
              <Link href="/admin/payments" className="text-[10px] text-[#0F4C3A] font-semibold hover:underline block">
                Payment history &rarr;
              </Link>
            </div>
            <div className="p-3.5 bg-emerald-50 text-[#0F4C3A] rounded-2xl shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: QUICK ACTIONS GRID */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Administrator Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Link
            href="/admin/rate-cards"
            className="bg-white border border-slate-200 hover:border-[#0F4C3A] p-4 rounded-xl shadow-2xs hover:shadow-xs transition text-center group space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <Tags className="w-4 h-4" />
            </div>
            <span className="block text-xs font-extrabold text-slate-800 leading-tight">Rate Cards</span>
          </Link>

          <Link
            href="/admin/couriers"
            className="bg-white border border-slate-200 hover:border-indigo-500 p-4 rounded-xl shadow-2xs hover:shadow-xs transition text-center group space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <Truck className="w-4 h-4" />
            </div>
            <span className="block text-xs font-extrabold text-slate-800 leading-tight">Couriers</span>
          </Link>

          <Link
            href="/dashboard/calculator"
            className="bg-white border border-slate-200 hover:border-blue-500 p-4 rounded-xl shadow-2xs hover:shadow-xs transition text-center group space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
            <span className="block text-xs font-extrabold text-slate-800 leading-tight">Quotation</span>
          </Link>

          <Link
            href="/admin/packaging/products"
            className="bg-white border border-slate-200 hover:border-emerald-500 p-4 rounded-xl shadow-2xs hover:shadow-xs transition text-center group space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <Package className="w-4 h-4" />
            </div>
            <span className="block text-xs font-extrabold text-slate-800 leading-tight">Add Product</span>
          </Link>

          <Link
            href="/admin/packaging/orders"
            className="bg-white border border-slate-200 hover:border-teal-500 p-4 rounded-xl shadow-2xs hover:shadow-xs transition text-center group space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="block text-xs font-extrabold text-slate-800 leading-tight">Orders</span>
          </Link>

          <Link
            href="/admin/payments"
            className="bg-white border border-slate-200 hover:border-rose-500 p-4 rounded-xl shadow-2xs hover:shadow-xs transition text-center group space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="block text-xs font-extrabold text-slate-800 leading-tight">Payments</span>
          </Link>

          <Link
            href="/admin/users"
            className="bg-white border border-slate-200 hover:border-purple-500 p-4 rounded-xl shadow-2xs hover:shadow-xs transition text-center group space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
            <span className="block text-xs font-extrabold text-slate-800 leading-tight">Manage Users</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
