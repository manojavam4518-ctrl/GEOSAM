'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Package,
  ClipboardList,
  Plus,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
  Boxes,
} from 'lucide-react';

export default function AdminPackagingDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalVariants: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRequirements: 0,
    pendingRequirements: 0,
  });

  useEffect(() => {
    async function loadShopStats() {
      try {
        const [prodRes, orderRes, reqRes] = await Promise.all([
          fetch('/api/admin/packaging/products'),
          fetch('/api/admin/packaging/orders'),
          fetch('/api/admin/packaging/requirements'),
        ]);

        let prods = 0;
        let vars = 0;
        let ords = 0;
        let pendOrds = 0;
        let reqs = 0;
        let pendReqs = 0;

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const productList = prodData.products || [];
          prods = productList.length;
          vars = productList.reduce((acc: number, p: any) => acc + (p.variants?.length || 0), 0);
        }

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const orderList = orderData.orders || [];
          ords = orderList.length;
          pendOrds = orderList.filter((o: any) => o.status === 'PENDING' || o.status === 'PROCESSING').length;
        }

        if (reqRes.ok) {
          const reqData = await reqRes.json();
          const reqList = reqData.requirements || [];
          reqs = reqList.length;
          pendReqs = reqList.filter((r: any) => r.status === 'NEW' || r.status === 'UNDER_REVIEW').length;
        }

        setStats({
          totalProducts: prods,
          totalVariants: vars,
          totalOrders: ords,
          pendingOrders: pendOrds,
          totalRequirements: reqs,
          pendingRequirements: pendReqs,
        });
      } catch (err) {
        console.error('Error loading shop admin stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadShopStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Cargo Packaging Shop Administration</h1>
          <p className="text-xs text-slate-500 mt-1">Manage packaging products, box size variants, bulk custom inquiries, and customer orders</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/packaging/products"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Manage Catalog & Variants
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Catalog Products</span>
            <Boxes className="w-5 h-5 text-[#0F4C3A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.totalProducts}</span>
            <span className="text-xs text-slate-500 font-medium">({stats.totalVariants} variants)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Packaging Orders</span>
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.totalOrders}</span>
            {stats.pendingOrders > 0 && (
              <span className="text-xs text-amber-600 font-bold">({stats.pendingOrders} pending)</span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Bulk / Custom Requests</span>
            <ClipboardList className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.totalRequirements}</span>
            {stats.pendingRequirements > 0 && (
              <span className="text-xs text-purple-600 font-bold">({stats.pendingRequirements} needs review)</span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Shop Status</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-sm font-bold text-emerald-700 mt-1">
            Online & Ready
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/packaging/products"
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:border-[#0F4C3A] transition group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F4C3A] flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-800 group-hover:text-[#0F4C3A]">Products & Box Sizes</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Manage Cotton Boxes, Sin Wraps, Tapes, unit pricing, minimum order quantities, stock levels, and custom dimension variants.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F4C3A] pt-2">
            <span>Manage Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/packaging/requirements"
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:border-[#0F4C3A] transition group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <ClipboardList className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-800 group-hover:text-[#0F4C3A]">Custom / Bulk Requirements</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Review customer inquiries for custom box sizes, quantity requirements, issue formal quotations, and approve custom pricing.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F4C3A] pt-2">
            <span>Review Inquiries</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/packaging/orders"
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:border-[#0F4C3A] transition group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-800 group-hover:text-[#0F4C3A]">Packaging Orders</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Track customer orders, verify payment proofs, update order statuses (Processing, Shipped, Delivered), and manage fulfillment.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F4C3A] pt-2">
            <span>View Orders</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
