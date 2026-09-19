'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileQuestion,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function PackagingShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);
  
  // Selection states for Cotton Box
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  
  // Action notifications
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Bulk Inquiry Modal State
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    customerName: '',
    companyName: '',
    email: '',
    phone: '',
    productMaterial: 'Cotton Box',
    requiredDimension: '',
    requiredQuantity: '',
    deliveryLocation: '',
    requiredDate: '',
    additionalRequirements: '',
    attachmentUrl: '',
  });

  async function loadShopData() {
    setLoading(true);
    try {
      // 1. Fetch products
      const pRes = await fetch('/api/packaging/products');
      if (pRes.ok) {
        const pData = await pRes.json();
        const prodList = pData.products || [];
        setProducts(prodList);
        
        // Auto-select first variant of Cotton Box if available
        const boxProd = prodList.find((p: any) => p.category === 'Cotton Box');
        if (boxProd && boxProd.variants && boxProd.variants.length > 0) {
          const activeVariants = boxProd.variants.filter((v: any) => v.active);
          if (activeVariants.length > 0) {
            setSelectedVariantId(activeVariants[0].id);
          }
        }

        // Initialize quantities with minimums
        const initialQtys: Record<string, number> = {};
        prodList.forEach((p: any) => {
          if (p.category === 'Cotton Box' && p.variants && p.variants.length > 0) {
            p.variants.forEach((v: any) => {
              initialQtys[v.id] = v.minQuantity;
            });
          } else {
            initialQtys[p.id] = p.minQuantity;
          }
        });
        setQuantities(initialQtys);
      }

      // 2. Fetch current user profile to autofill bulk form
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          setInquiryForm(prev => ({
            ...prev,
            customerName: meData.user.name || '',
            companyName: meData.user.company || '',
            email: meData.user.email || '',
            phone: meData.user.mobile || '',
          }));
        }
      }

      // 3. Fetch cart count
      const cRes = await fetch('/api/packaging/cart');
      if (cRes.ok) {
        const cData = await cRes.json();
        if (cData.cart && cData.cart.items) {
          const count = cData.cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          setCartCount(count);
        }
      }
    } catch (err) {
      console.error('Failed to load shop items:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShopData();
  }, []);

  const handleQtyChange = (id: string, delta: number, min: number, max: number) => {
    setQuantities(prev => {
      const current = prev[id] || min;
      const next = Math.max(min, Math.min(max, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const addToCart = async (productId: string, variantId?: string, redirect: boolean = false) => {
    const key = variantId || productId;
    const qty = quantities[key] || 1;
    
    setCartLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/packaging/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity: qty }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update cart.');

      // Update cart count
      const cRes = await fetch('/api/packaging/cart');
      if (cRes.ok) {
        const cData = await cRes.json();
        const count = cData.cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(count);
      }

      setMessage(redirect ? 'Redirecting to checkout...' : 'Product added to cart!');
      setTimeout(() => setMessage(''), 3000);

      if (redirect) {
        router.push('/dashboard/packaging/cart');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setCartLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInquiry(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/packaging/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit requirement.');

      setMessage('Custom requirement submitted successfully! Admin will quote shortly.');
      setInquiryOpen(false);
      
      // Clear specific bulk details
      setInquiryForm(prev => ({
        ...prev,
        requiredDimension: '',
        requiredQuantity: '',
        deliveryLocation: '',
        requiredDate: '',
        additionalRequirements: '',
        attachmentUrl: '',
      }));
      
      router.push('/dashboard/packaging/requirements');
    } catch (err: any) {
      setError(err.message || 'Failed to submit bulk request.');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setInquiryForm(prev => ({ ...prev, attachmentUrl: data.url }));
        alert('File uploaded successfully!');
      } else {
        alert(data.error || 'File upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  // Split products by categories
  const boxProduct = products.find((p) => p.category === 'Cotton Box');
  const standardProducts = products.filter((p) => p.category !== 'Cotton Box');

  return (
    <div className="space-y-6">
      {/* Header bar with Cart indicators */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Packaging Shop</h1>
          <p className="text-xs text-slate-500 mt-1">High-quality industrial materials for cargo scaling, wrapping, and boxing</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => setInquiryOpen(true)}
            className="flex-grow sm:flex-grow-0 bg-white border border-[#0F4C3A] text-[#0F4C3A] hover:bg-emerald-50/50 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Bulk / Custom Requirement
          </button>
          <button
            onClick={() => router.push('/dashboard/packaging/cart')}
            className="relative bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full text-[9px] w-5 h-5 flex items-center justify-center font-black animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cotton Box Variant Card (Spans 2 columns on desktop) */}
        {boxProduct && (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between hover-lift">
            <div>
              <div className="flex justify-between items-start gap-4 mb-3">
                <div>
                  <span className="bg-[#E8F5E9] text-[#0F4C3A] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                    Category: Boxes
                  </span>
                  <h2 className="text-lg font-black text-slate-800 mt-1">{boxProduct.name}</h2>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Price</span>
                  {selectedVariantId ? (
                    <span className="text-xl font-black text-[#0F4C3A]">
                      ₹{boxProduct.variants.find((v: any) => v.id === selectedVariantId)?.price.toFixed(2)}
                      <span className="text-[10px] text-slate-400 font-light"> / pc</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Select dimension</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                {boxProduct.description}
              </p>

              {/* Dimensions Selector */}
              <div className="mb-6">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Select Dimension / Size</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {boxProduct.variants.filter((v: any) => v.active).map((variant: any) => {
                    const isSelected = selectedVariantId === variant.id;
                    return (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                          isSelected
                            ? 'border-[#0F4C3A] bg-[#E8F5E9]/10 ring-2 ring-[#0F4C3A]/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <strong className="text-xs text-slate-800 block">
                          {variant.length} × {variant.width} × {variant.height} {variant.dimensionUnit}
                        </strong>
                        <div className="flex justify-between items-center w-full mt-2">
                          <span className="text-slate-500 text-[10px]">Stock: {variant.stock}</span>
                          <span className="text-[#0F4C3A] text-xs font-extrabold">₹{variant.price}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedVariantId && (() => {
              const variant = boxProduct.variants.find((v: any) => v.id === selectedVariantId);
              if (!variant) return null;
              const qty = quantities[variant.id] || variant.minQuantity;

              return (
                <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6">
                  {/* Quantity selector & info */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Quantity</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-9 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(variant.id, -1, variant.minQuantity, variant.stock)}
                          className="px-3 h-full hover:bg-slate-100 transition text-slate-500 font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-12 text-center text-xs font-bold text-slate-800">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(variant.id, 1, variant.minQuantity, variant.stock)}
                          className="px-3 h-full hover:bg-slate-100 transition text-slate-500 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        <span className="block font-semibold">Min Order: {variant.minQuantity} pcs</span>
                        <span className="block mt-0.5">Subtotal: <strong>₹{(variant.price * qty).toFixed(2)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToCart(boxProduct.id, variant.id, false)}
                      disabled={cartLoading}
                      className="flex-grow sm:flex-grow-0 bg-white border border-slate-200 hover:border-[#0F4C3A] text-slate-700 hover:text-[#0F4C3A] hover:bg-slate-50 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-xs h-11 flex items-center justify-center cursor-pointer"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => addToCart(boxProduct.id, variant.id, true)}
                      disabled={cartLoading}
                      className="flex-grow sm:flex-grow-0 bg-[#0F4C3A] hover:bg-[#0c3c2e] text-white py-2 px-5 rounded-xl text-xs font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-md hover:shadow-lg h-11 flex items-center justify-center cursor-pointer"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Sin Wrap & Tape Cards (Stacked on sidebar side on desktop) */}
        <div className="space-y-6">
          {standardProducts.map((p) => {
            const qty = quantities[p.id] || p.minQuantity;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between h-[280px]">
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="bg-[#E8F5E9] text-[#0F4C3A] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Category: {p.category}
                      </span>
                      <h3 className="font-bold text-sm text-slate-800 mt-1">{p.name}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Price</span>
                      <strong className="text-base font-black text-[#0F4C3A]">₹{p.price?.toFixed(2)}</strong>
                      <span className="text-[9px] text-slate-400 font-light block -mt-0.5">/ {p.unit}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2.5 line-clamp-3">
                    {p.description}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                  {/* Qty selector */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-8 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(p.id, -1, p.minQuantity, p.stock)}
                        className="px-2 h-full hover:bg-slate-100 transition text-slate-500 font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-9 text-center text-xs font-bold text-slate-800">{qty}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(p.id, 1, p.minQuantity, p.stock)}
                        className="px-2 h-full hover:bg-slate-100 transition text-slate-500 font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-medium">
                      <span>Min: {p.minQuantity} {p.unit}s</span>
                      <span className="block mt-0.5">Subtotal: <strong>₹{((p.price || 0) * qty).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToCart(p.id, undefined, false)}
                      disabled={cartLoading}
                      className="flex-1 bg-white border border-slate-200 hover:border-[#0F4C3A] text-slate-700 hover:text-[#0F4C3A] py-1.5 px-3 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => addToCart(p.id, undefined, true)}
                      disabled={cartLoading}
                      className="flex-1 bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-3 rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk Requirement Custom Form Modal */}
      {inquiryOpen && (
        <Modal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} title="Custom / Bulk Requirement Inquiry">
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[11px] text-slate-500 leading-normal mb-2">
              Have specific sizes or larger quantity packaging needs? Submit your project requirements here. Our administrative dispatch managers will review and draft a custom quotation directly in your account.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={inquiryForm.customerName}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, customerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={inquiryForm.companyName}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={inquiryForm.email}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone</label>
                <input
                  type="text"
                  required
                  value={inquiryForm.phone}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product / Material Type</label>
                <select
                  value={inquiryForm.productMaterial}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, productMaterial: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                >
                  <option value="Cotton Box">Cotton Box</option>
                  <option value="Sin Wrap">Sin Wrap</option>
                  <option value="Tape">Tape</option>
                  <option value="Other Packaging">Other / Special Custom Material</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dimensions (e.g., 18x12x10 Inch)</label>
                <input
                  type="text"
                  value={inquiryForm.requiredDimension}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, requiredDimension: e.target.value })}
                  placeholder="Leave blank if not applicable"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Required Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={inquiryForm.requiredQuantity}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, requiredQuantity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expected Delivery Location</label>
                <input
                  type="text"
                  required
                  value={inquiryForm.deliveryLocation}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, deliveryLocation: e.target.value })}
                  placeholder="City, State / Delivery Address"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Required Delivery Date</label>
                <input
                  type="date"
                  required
                  value={inquiryForm.requiredDate}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, requiredDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Requirements Description / Notes</label>
              <textarea
                rows={3}
                required
                value={inquiryForm.additionalRequirements}
                onChange={(e) => setInquiryForm({ ...inquiryForm, additionalRequirements: e.target.value })}
                placeholder="Describe your requirement in detail (e.g., thickness, tape width, specific materials, etc.)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Optional Attachment (Specification Sheet / Photo)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-[#0F4C3A] hover:file:bg-emerald-100 transition"
              />
              {inquiryForm.attachmentUrl && (
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ File uploaded successfully!</span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInquiryOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingInquiry}
                className="px-5 py-2 bg-[#0F4C3A] hover:bg-[#1E8262] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md"
              >
                {submittingInquiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Submit Requirement
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
