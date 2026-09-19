'use client';

import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Modals management
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [targetProductId, setTargetProductId] = useState('');

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    unit: '',
    stock: '',
    minQuantity: '',
    image: '',
    active: true,
  });

  const [variantForm, setVariantForm] = useState({
    length: '',
    width: '',
    height: '',
    dimensionUnit: 'Inch',
    price: '',
    minQuantity: '',
    stock: '',
    active: true,
  });

  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/packaging/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      } else {
        throw new Error('Failed to load products.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading shop items.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // Product CRUD
  const handleOpenProductModal = (prod: any = null) => {
    setSelectedProduct(prod);
    if (prod) {
      setProductForm({
        name: prod.name,
        description: prod.description,
        category: prod.category,
        price: prod.price !== null ? prod.price.toString() : '',
        unit: prod.unit || '',
        stock: prod.stock.toString(),
        minQuantity: prod.minQuantity.toString(),
        image: prod.image || '',
        active: prod.active,
      });
    } else {
      setProductForm({
        name: '',
        description: '',
        category: 'Sin Wrap',
        price: '',
        unit: 'roll',
        stock: '100',
        minQuantity: '5',
        image: '',
        active: true,
      });
    }
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const isEdit = !!selectedProduct;
      const url = '/api/admin/packaging/products';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...productForm, id: selectedProduct.id } : productForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product details.');

      setMessage(isEdit ? 'Product updated successfully!' : 'Product added successfully!');
      setProductModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Variant CRUD (Dimensions)
  const handleOpenVariantModal = (productId: string, variant: any = null) => {
    setTargetProductId(productId);
    setSelectedVariant(variant);
    if (variant) {
      setVariantForm({
        length: variant.length.toString(),
        width: variant.width.toString(),
        height: variant.height.toString(),
        dimensionUnit: variant.dimensionUnit,
        price: variant.price.toString(),
        minQuantity: variant.minQuantity.toString(),
        stock: variant.stock.toString(),
        active: variant.active,
      });
    } else {
      setVariantForm({
        length: '',
        width: '',
        height: '',
        dimensionUnit: 'Inch',
        price: '',
        minQuantity: '50',
        stock: '1000',
        active: true,
      });
    }
    setVariantModalOpen(true);
  };

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const isEdit = !!selectedVariant;
      const url = '/api/admin/packaging/products/variants';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit 
        ? { ...variantForm, id: selectedVariant.id } 
        : { ...variantForm, productId: targetProductId };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save variant.');

      setMessage(isEdit ? 'Size dimension edited successfully!' : 'Size dimension added successfully!');
      setVariantModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to REMOVE this size dimension variant?')) return;

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/packaging/products/variants?id=${variantId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete variant.');

      setMessage('Variant removed.');
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Packaging Shop Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">Configure standard packaging materials, box sizes, price brackets, and stock levels</p>
        </div>
        <button
          onClick={() => handleOpenProductModal(null)}
          className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
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

      {/* Products list grid */}
      <div className="space-y-6">
        {products.map((product) => {
          const isBox = product.category === 'Cotton Box';

          return (
            <div key={product.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Product Info Row */}
              <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-[#E8F5E9] text-[#0F4C3A] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                      {product.category}
                    </span>
                    {product.active ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 py-0.5 px-2 rounded-full font-bold text-[8px] uppercase tracking-wider">Active</span>
                    ) : (
                      <span className="bg-red-50 text-red-700 border border-red-150 py-0.5 px-2 rounded-full font-bold text-[8px] uppercase tracking-wider">Inactive</span>
                    )}
                  </div>
                  <h2 className="text-base font-black text-slate-800 mt-1">{product.name}</h2>
                  <p className="text-xs text-slate-500 font-medium max-w-2xl">{product.description}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <button
                    onClick={() => handleOpenProductModal(product)}
                    className="p-1.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-lg text-slate-600 transition text-[10px] font-bold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Product
                  </button>
                  {isBox && (
                    <button
                      onClick={() => handleOpenVariantModal(product.id, null)}
                      className="p-1.5 bg-[#0F4C3A] hover:bg-[#1E8262] text-white rounded-lg transition text-[10px] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Size Variant
                    </button>
                  )}
                </div>
              </div>

              {/* Variant and Pricing details */}
              {isBox ? (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dimension Options (Variants)</h4>
                  {product.variants.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic">No dimensions configured yet. Click 'Add Size Variant' to add box sizes.</p>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left text-slate-700">
                        <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2">Dimensions (L × W × H)</th>
                            <th className="px-4 py-2">Unit</th>
                            <th className="px-4 py-2">UnitPrice</th>
                            <th className="px-4 py-2">Min Qty</th>
                            <th className="px-4 py-2">Stock</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {product.variants.map((v: any) => (
                            <tr key={v.id} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-2.5 font-bold text-slate-900">
                                {v.length} × {v.width} × {v.height} {v.dimensionUnit}
                              </td>
                              <td className="px-4 py-2.5 text-slate-500">{product.unit || 'piece'}</td>
                              <td className="px-4 py-2.5 font-black text-slate-800">₹{v.price.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-slate-500 font-semibold">{v.minQuantity}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-800">{v.stock}</td>
                              <td className="px-4 py-2.5">
                                {v.active ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]"><Check className="w-3.5 h-3.5" /> Active</span>
                                ) : (
                                  <span className="text-red-500 font-bold flex items-center gap-1 text-[10px]"><X className="w-3.5 h-3.5" /> Inactive</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenVariantModal(product.id, v)}
                                  className="p-1 text-slate-400 hover:text-[#0F4C3A] rounded hover:bg-slate-100 transition"
                                  title="Edit size"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteVariant(v.id)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition"
                                  title="Delete size"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Unit Price</span>
                    <strong className="text-slate-800 text-sm font-black mt-1 block">₹{product.price?.toFixed(2)}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Unit Type</span>
                    <strong className="text-slate-800 text-sm font-bold mt-1 block">{product.unit || 'roll'}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Min Order Qty</span>
                    <strong className="text-slate-800 text-sm font-bold mt-1 block">{product.minQuantity}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Current Stock</span>
                    <strong className="text-slate-800 text-sm font-bold mt-1 block">{product.stock}</strong>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Product Modal */}
      {productModalOpen && (
        <Modal isOpen={productModalOpen} onClose={() => setProductModalOpen(false)} title={selectedProduct ? "Edit Product" : "Add New Product"}>
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                >
                  <option value="Cotton Box">Cotton Box</option>
                  <option value="Sin Wrap">Sin Wrap</option>
                  <option value="Tape">Tape</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
              <textarea
                rows={3}
                required
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-sans"
              />
            </div>

            {productForm.category !== 'Cotton Box' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit Type (e.g. roll, piece)</label>
                  <input
                    type="text"
                    required
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Current Stock</label>
                <input
                  type="number"
                  required
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Minimum Order Quantity</label>
                <input
                  type="number"
                  required
                  value={productForm.minQuantity}
                  onChange={(e) => setProductForm({ ...productForm, minQuantity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="prodActive"
                checked={productForm.active}
                onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                className="w-4 h-4 accent-[#0F4C3A]"
              />
              <label htmlFor="prodActive" className="text-xs text-slate-600 font-semibold select-none">Active (Listed in catalog)</label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-[#0F4C3A] hover:bg-[#1E8262] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Product
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add / Edit Size Variant Modal */}
      {variantModalOpen && (
        <Modal isOpen={variantModalOpen} onClose={() => setVariantModalOpen(false)} title={selectedVariant ? "Edit Size Variant" : "Add Size Variant"}>
          <form onSubmit={handleVariantSubmit} className="space-y-4">
            <span className="block text-[10px] font-bold text-slate-400 uppercase -mb-1">Dimensions</span>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Length</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={variantForm.length}
                  onChange={(e) => setVariantForm({ ...variantForm, length: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Width</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={variantForm.width}
                  onChange={(e) => setVariantForm({ ...variantForm, width: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Height</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={variantForm.height}
                  onChange={(e) => setVariantForm({ ...variantForm, height: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Unit</label>
                <select
                  value={variantForm.dimensionUnit}
                  onChange={(e) => setVariantForm({ ...variantForm, dimensionUnit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                >
                  <option value="Inch">Inch</option>
                  <option value="MM">MM</option>
                  <option value="CM">CM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={variantForm.price}
                  onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Initial Stock</label>
                <input
                  type="number"
                  required
                  value={variantForm.stock}
                  onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Min Order Qty</label>
                <input
                  type="number"
                  required
                  value={variantForm.minQuantity}
                  onChange={(e) => setVariantForm({ ...variantForm, minQuantity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="varActive"
                checked={variantForm.active}
                onChange={(e) => setVariantForm({ ...variantForm, active: e.target.checked })}
                className="w-4 h-4 accent-[#0F4C3A]"
              />
              <label htmlFor="varActive" className="text-xs text-slate-600 font-semibold select-none">Active Size Option</label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVariantModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-[#0F4C3A] hover:bg-[#1E8262] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Variant
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
