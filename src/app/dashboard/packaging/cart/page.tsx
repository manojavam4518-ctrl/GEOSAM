'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [taxRate, setTaxRate] = useState(18);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function loadCartData() {
    setLoading(true);
    try {
      // 1. Fetch Cart
      const res = await fetch('/api/packaging/cart');
      if (res.ok) {
        const data = await res.json();
        setCart(data.cart);
      }

      // 2. Fetch Payment/Tax Settings
      const setRes = await fetch('/api/admin/settings/payment');
      if (setRes.ok) {
        const setData = await setRes.json();
        const settings = setData.paymentSettings;
        if (settings) {
          setTaxRate(settings.gstRate ?? 18);
          setTaxEnabled(settings.gstEnabled ?? true);
        }
      }
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCartData();
  }, []);

  const updateQuantity = async (productId: string, variantId: string | null, currentQty: number, delta: number, min: number, max: number) => {
    const nextQty = currentQty + delta;
    if (nextQty < min || nextQty > max) return;

    setActionLoading(productId + (variantId || ''));
    setError('');

    try {
      const res = await fetch('/api/packaging/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity: nextQty }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update quantity.');

      // Reload cart
      const reloadRes = await fetch('/api/packaging/cart');
      if (reloadRes.ok) {
        const reloadData = await reloadRes.json();
        setCart(reloadData.cart);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update quantity.');
    } finally {
      setActionLoading(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setActionLoading(itemId);
    setError('');

    try {
      const res = await fetch(`/api/packaging/cart?itemId=${itemId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove item.');

      // Reload cart
      const reloadRes = await fetch('/api/packaging/cart');
      if (reloadRes.ok) {
        const reloadData = await reloadRes.json();
        setCart(reloadData.cart);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove item.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  const items = cart?.items || [];
  
  // Calculations
  const subtotal = items.reduce((sum: number, item: any) => {
    const price = item.variant ? item.variant.price : (item.product.price || 0);
    return sum + (price * item.quantity);
  }, 0);

  const gstAmount = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const shippingAmount = items.length === 0 ? 0 : (subtotal > 2000 ? 0 : 150.0);
  const totalAmount = subtotal + gstAmount + shippingAmount;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A] flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" /> Shopping Cart
        </h1>
        <p className="text-xs text-slate-500 mt-1">Review standard items, adjust quantities, and proceed to shipping checkout</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-4">
          <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto" />
          <h2 className="text-sm font-bold text-slate-700">Your cart is currently empty</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">Add some Cotton Boxes, stretch wraps, or adhesive tapes to your cart from the store catalogue.</p>
          <Link
            href="/dashboard/packaging"
            className="inline-flex items-center gap-1.5 bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Packaging Shop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item: any) => {
              const price = item.variant ? item.variant.price : (item.product.price || 0);
              const minQty = item.variant ? item.variant.minQuantity : item.product.minQuantity;
              const stock = item.variant ? item.variant.stock : item.product.stock;
              const isItemLoading = actionLoading === (item.product.id + (item.variant?.id || '')) || actionLoading === item.id;

              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 transition hover:border-slate-300">
                  <div className="space-y-1">
                    <span className="bg-slate-50 border border-slate-200/60 text-slate-600 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                      {item.product.category}
                    </span>
                    <h3 className="font-bold text-xs text-slate-800 mt-1">{item.product.name}</h3>
                    {item.variant && (
                      <span className="block text-[10px] text-slate-400 font-bold">
                        Size: {item.variant.length} × {item.variant.width} × {item.variant.height} {item.variant.dimensionUnit}
                      </span>
                    )}
                    <span className="block text-[10px] text-[#0F4C3A] font-extrabold">
                      ₹{price.toFixed(2)} <span className="text-[9px] text-slate-400 font-light">each</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Quantity controls */}
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-8 bg-slate-50">
                      <button
                        type="button"
                        disabled={isItemLoading}
                        onClick={() => updateQuantity(item.product.id, item.variant?.id || null, item.quantity, -1, minQty, stock)}
                        className="px-2 h-full hover:bg-slate-100 transition text-slate-500 font-bold disabled:opacity-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-9 text-center text-xs font-bold text-slate-800">
                        {isItemLoading ? '...' : item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isItemLoading}
                        onClick={() => updateQuantity(item.product.id, item.variant?.id || null, item.quantity, 1, minQty, stock)}
                        className="px-2 h-full hover:bg-slate-100 transition text-slate-500 font-bold disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-[70px] hidden sm:block">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Total</span>
                      <span className="text-xs font-extrabold text-slate-800">₹{(price * item.quantity).toFixed(2)}</span>
                    </div>

                    {/* Delete */}
                    <button
                      disabled={isItemLoading}
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="pt-2">
              <Link
                href="/dashboard/packaging"
                className="text-xs font-bold text-[#0F4C3A] hover:underline flex items-center gap-1"
              >
                &larr; Add more packaging items
              </Link>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Order Summary</h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-700">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST ({taxRate}%):</span>
                <span className="font-semibold text-slate-700">₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Shipping Delivery:</span>
                <span className="font-semibold text-slate-700">
                  {shippingAmount === 0 ? <strong className="text-emerald-600 font-bold">FREE</strong> : `₹${shippingAmount.toFixed(2)}`}
                </span>
              </div>
              {shippingAmount > 0 && (
                <div className="text-[10px] text-amber-600 bg-amber-50/50 p-2 rounded-lg leading-normal">
                  Add ₹{Math.max(0, 2000 - subtotal).toFixed(2)} more of packaging products to qualify for free shipping!
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-xs font-black text-slate-800 uppercase">Gross Payable</span>
              <strong className="text-lg font-black text-[#0F4C3A]">₹{totalAmount.toFixed(2)}</strong>
            </div>

            <button
              onClick={() => router.push('/dashboard/packaging/checkout')}
              className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md mt-2"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
