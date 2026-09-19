'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck, MapPin } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [taxRate, setTaxRate] = useState(18);
  const [taxEnabled, setTaxEnabled] = useState(true);

  const [billingDetails, setBillingDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
  });

  async function loadCheckoutData() {
    setLoading(true);
    try {
      // 1. Fetch Cart
      const cartRes = await fetch('/api/packaging/cart');
      if (!cartRes.ok) throw new Error('Failed to load cart');
      const cartData = await cartRes.json();
      setCart(cartData.cart);

      if (!cartData.cart || !cartData.cart.items || cartData.cart.items.length === 0) {
        router.push('/dashboard/packaging');
        return;
      }

      // 2. Fetch User Me details
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          setBillingDetails((prev) => ({
            ...prev,
            fullName: meData.user.name || '',
            email: meData.user.email || '',
            phone: meData.user.mobile || '',
            companyName: meData.user.company || '',
          }));
        }
      }

      // 3. Fetch tax rate settings
      const setRes = await fetch('/api/admin/settings/payment');
      if (setRes.ok) {
        const setData = await setRes.json();
        const settings = setData.paymentSettings;
        if (settings) {
          setTaxRate(settings.gstRate ?? 18);
          setTaxEnabled(settings.gstEnabled ?? true);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to initialize checkout.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/packaging/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingDetails }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order.');

      // Order created! Redirect to payment checkout screen
      router.push(`/dashboard/packaging/payment/${data.order.id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during checkout processing.');
      setSubmitting(false);
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
  const subtotal = items.reduce((sum: number, item: any) => {
    const price = item.variant ? item.variant.price : (item.product.price || 0);
    return sum + price * item.quantity;
  }, 0);
  const gstAmount = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const shippingAmount = subtotal > 2000 ? 0 : 150.0;
  const totalAmount = subtotal + gstAmount + shippingAmount;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A] flex items-center gap-2">
          <MapPin className="w-6 h-6" /> Shipment Checkout
        </h1>
        <p className="text-xs text-slate-500 mt-1">Provide delivery destination details and confirm order breakdown</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Address Form (2 columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-[#0F4C3A] uppercase tracking-wider border-b border-slate-100 pb-3">Delivery Address & Info</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={billingDetails.fullName}
                onChange={(e) => setBillingDetails({ ...billingDetails, fullName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company / Organization</label>
              <input
                type="text"
                required
                value={billingDetails.companyName}
                onChange={(e) => setBillingDetails({ ...billingDetails, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={billingDetails.email}
                onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mobile / Phone</label>
              <input
                type="text"
                required
                value={billingDetails.phone}
                onChange={(e) => setBillingDetails({ ...billingDetails, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Street Address</label>
            <input
              type="text"
              required
              value={billingDetails.address}
              onChange={(e) => setBillingDetails({ ...billingDetails, address: e.target.value })}
              placeholder="Building name, street, locality details"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">City</label>
              <input
                type="text"
                required
                value={billingDetails.city}
                onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">State</label>
              <input
                type="text"
                required
                value={billingDetails.state}
                onChange={(e) => setBillingDetails({ ...billingDetails, state: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pincode</label>
              <input
                type="text"
                required
                pattern="\d{6}"
                value={billingDetails.pincode}
                onChange={(e) => setBillingDetails({ ...billingDetails, pincode: e.target.value })}
                placeholder="6 digits"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Country</label>
              <input
                type="text"
                required
                disabled
                value={billingDetails.country}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Order Items & Calculations Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Review Items</h3>
            
            <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto pr-1">
              {items.map((item: any) => {
                const price = item.variant ? item.variant.price : (item.product.price || 0);
                return (
                  <div key={item.id} className="py-2.5 flex justify-between text-xs gap-3">
                    <div>
                      <span className="font-bold text-slate-800 block leading-tight">{item.product.name}</span>
                      {item.variant && (
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Size: {item.variant.length}x{item.variant.width}x{item.variant.height}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-extrabold text-slate-700 self-center">₹{(price * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-800">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({taxRate}%):</span>
                <span className="font-bold text-slate-800">₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Fee:</span>
                <span className="font-bold text-slate-800">
                  {shippingAmount === 0 ? <strong className="text-emerald-600 font-bold">FREE</strong> : `₹${shippingAmount.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-800">Payable Total:</span>
                <strong className="text-base font-black text-[#0F4C3A]">₹{totalAmount.toFixed(2)}</strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md mt-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Place Order & Pay <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[11px] font-bold text-slate-800 uppercase">Enterprise Escrow</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">Your payment is stored securely. Orders undergo direct administrator verification before shipment activation.</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/dashboard/packaging/cart"
              className="text-xs font-bold text-[#0F4C3A] hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to shopping cart
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
