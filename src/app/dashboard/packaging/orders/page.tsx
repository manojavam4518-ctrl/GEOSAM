'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  Package,
  Calendar,
  CreditCard,
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch('/api/packaging/order');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load packaging orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <span className="bg-amber-50 text-amber-800 border border-amber-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Pending Payment</span>;
      case 'PAID':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Paid / Confirmed</span>;
      case 'PROCESSING':
        return <span className="bg-blue-50 text-blue-800 border border-blue-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Processing</span>;
      case 'PACKED':
        return <span className="bg-purple-50 text-purple-800 border border-purple-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Packed</span>;
      case 'SHIPPED':
        return <span className="bg-indigo-50 text-indigo-800 border border-indigo-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Shipped</span>;
      case 'DELIVERED':
        return <span className="bg-green-50 text-green-800 border border-green-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Delivered</span>;
      case 'CANCELLED':
        return <span className="bg-red-50 text-red-800 border border-red-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Cancelled</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">My Packaging Orders</h1>
        <p className="text-xs text-slate-500 mt-1">Monitor billing confirmations and shipping fulfillment schedules for your purchases</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm text-slate-400 font-medium text-xs">
          No packaging orders found. Buy boxes, wraps, or tape from the shop catalog.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const hasPendingPayment = order.status === 'PENDING_PAYMENT';
            const submittedPayment = order.payments && order.payments.some((p: any) => p.status === 'PENDING');

            return (
              <div key={order.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-slate-350 transition">
                {/* Header Row */}
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Order Number</span>
                      <strong className="text-slate-800">#{order.orderNumber}</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Order Date</span>
                      <span className="text-slate-600 font-medium">{formatDateIndian(order.createdAt)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Total Payable</span>
                      <strong className="text-[#0F4C3A] font-extrabold">₹{order.totalAmount.toFixed(2)}</strong>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Body Row */}
                <div className="p-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
                  {/* Items list */}
                  <div className="space-y-2.5 flex-grow">
                    {order.items && order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1.5 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <strong className="text-slate-800">{item.productName}</strong>
                            {item.variantInfo && (
                              <span className="text-[10px] text-slate-400 ml-2 font-medium">({item.variantInfo})</span>
                            )}
                          </div>
                        </div>
                        <span className="text-slate-500 font-medium">Qty: {item.quantity} × ₹{item.price}</span>
                      </div>
                    ))}
                  </div>

                  {/* Payment/Dispatch Details */}
                  <div className="shrink-0 md:border-l md:border-slate-100 md:pl-6 flex flex-col justify-center min-w-[200px] text-xs">
                    {hasPendingPayment && !submittedPayment ? (
                      <div className="space-y-3">
                        <div className="bg-amber-50 text-amber-800 text-[10px] p-2.5 rounded-lg border border-amber-100 leading-normal">
                          Payment verification submission is pending for this order. Enter transaction UTR to dispatch.
                        </div>
                        <button
                          onClick={() => router.push(`/dashboard/packaging/payment/${order.id}`)}
                          className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-3 rounded-lg font-bold transition text-center shadow-sm block text-xs"
                        >
                          Complete Payment
                        </button>
                      </div>
                    ) : hasPendingPayment && submittedPayment ? (
                      <div className="bg-blue-50 text-blue-800 text-[10px] p-2.5 rounded-lg border border-blue-150 leading-normal">
                        UTR transaction reference submitted. Pending billing administrator approval.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">Shipping Destination</span>
                        <p className="text-slate-600 truncate max-w-[220px] font-medium">
                          {order.billingDetails?.fullName} - {order.billingDetails?.address}, {order.billingDetails?.city}
                        </p>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase mt-1">Payment Method</span>
                        <span className="text-slate-600 font-semibold uppercase">{order.payments?.[0]?.paymentMethod || 'Verified'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
