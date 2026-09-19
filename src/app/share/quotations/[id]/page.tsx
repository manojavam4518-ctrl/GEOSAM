'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  FileText,
  Download,
  Share2,
  Calendar,
  User,
  MapPin,
  Scale,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export default function PublicQuotationView() {
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchQuotation() {
      try {
        const res = await fetch(`/api/quotations/${id}`);
        if (!res.ok) {
          throw new Error('Quotation not found or link has expired.');
        }
        const data = await res.json();
        setQuotation(data.quotation);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchQuotation();
  }, [id]);

  const handleDownloadPdf = async () => {
    const element = document.getElementById('quotation-container');
    if (!element) return;

    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${quotation.quotationNumber || 'quotation'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-2">
          <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-semibold">Loading secure quotation details...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center shadow-sm max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="font-bold text-slate-800 text-sm">Access Restricted</h2>
          <p className="text-xs text-slate-400 mt-1 leading-normal font-light">{error || 'This quotation does not exist.'}</p>
        </div>
      </div>
    );
  }

  const tmpl = quotation.templateSnapshot || {};
  const rate = quotation.rateSnapshot || {};
  const isIntl = quotation.serviceType === 'International' || quotation.serviceType === 'INTERNATIONAL';
  const snap = quotation.rateSnapshot || {};
  const otherChargesList: any[] = Array.isArray(snap.otherCharges) ? snap.otherCharges : [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-8 flex flex-col items-center">
      {/* Top Floating Control Bar */}
      <div className="max-w-4xl w-full bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mb-6 flex justify-between items-center flex-wrap gap-4 text-xs font-bold text-slate-700">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#1E8262]" />
          <span>Quotation: {quotation.quotationNumber}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="bg-white border border-slate-200 hover:border-[#1E8262] hover:text-[#0F4C3A] py-2 px-4 rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            {copied ? 'Link Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleDownloadPdf}
            className="bg-[#1E8262] hover:bg-[#0F4C3A] text-white py-2 px-4 rounded-xl flex items-center gap-1.5 transition shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Styled Printable Quote Container */}
      <div
        id="quotation-container"
        className="max-w-4xl w-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-md space-y-8 text-slate-700 relative overflow-hidden"
      >
        {/* GEO TRANSIT Top Watermark Brand Tag */}
        <div className="absolute top-0 right-0 bg-[#0F4C3A] text-white text-[8px] font-black uppercase tracking-widest px-6 py-1.5 rounded-bl-2xl">
          Verified Geo Transit Agent
        </div>

        {/* Company Header Info Block */}
        <div className="flex justify-between items-start flex-wrap gap-6 border-b border-slate-100 pb-8 mt-4">
          <div className="space-y-3">
            {tmpl.logo ? (
              <img src={tmpl.logo} alt="Company Logo" className="max-h-16 object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#1E8262] flex items-center justify-center font-black text-lg border border-emerald-100">
                G
              </div>
            )}
            <div>
              <h2 className="text-base font-extrabold text-slate-800">{tmpl.companyName || 'Logistics Provider'}</h2>
              <p className="text-xs text-slate-400 font-light mt-0.5 leading-normal max-w-sm">{tmpl.address}</p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-2 text-xs font-medium">
            <h1 className="text-lg font-black text-[#0F4C3A] uppercase tracking-wide">QUOTATION</h1>
            <div className="space-y-0.5 text-slate-500">
              <div>Quote Number: <strong className="text-slate-800 font-bold">{quotation.quotationNumber}</strong></div>
              <div>Quote Date: <span className="text-slate-700">{formatDateIndian(quotation.createdAt)}</span></div>
              <div>Valid Until: <span className="text-slate-700">{formatDateIndian(quotation.validUntil)}</span></div>
              {tmpl.gstNumber && <div>GSTIN: <strong className="text-slate-800">{tmpl.gstNumber}</strong></div>}
            </div>
          </div>
        </div>

        {/* Sender / Customer Meta Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 pb-8 text-xs leading-normal">
          <div className="space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#1E8262]" />
              Prepared For
            </h3>
            <div className="text-slate-850">
              <div className="font-extrabold text-sm text-slate-800">{quotation.customerName}</div>
              {quotation.customerCompany && <div className="font-bold text-slate-650">{quotation.customerCompany}</div>}
              {quotation.customerEmail && <div className="text-slate-500 font-light mt-0.5">Email: {quotation.customerEmail}</div>}
              {quotation.customerPhone && <div className="text-slate-500 font-light">Phone: {quotation.customerPhone}</div>}
              {quotation.customerAddress && <div className="text-slate-500 font-light mt-1 max-w-xs">{quotation.customerAddress}</div>}
            </div>
          </div>

          <div className="space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#1E8262]" />
              Provider Contact
            </h3>
            <div className="text-slate-500 space-y-0.5 font-light">
              <div>Phone: <strong className="text-slate-700 font-semibold">{tmpl.phone}</strong></div>
              <div>Email: <span className="text-slate-700">{tmpl.email}</span></div>
              {tmpl.website && <div>Website: <a href={`https://${tmpl.website}`} className="text-[#1E8262] font-semibold">{tmpl.website}</a></div>}
            </div>
          </div>
        </div>

        {/* Shipment Info Highlights */}
        <div className="bg-[#E8F5E9]/40 border border-emerald-100/60 p-5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Route Path</span>
            <span className="text-slate-800 font-bold flex items-center gap-1">
              {quotation.originPincode} <ArrowRight className="w-3 h-3 text-[#1E8262]" /> {quotation.destinationPincode}
            </span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Chargeable Weight</span>
            <span className="text-slate-800 font-bold">{quotation.chargeableWeight} KG</span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Service Provider</span>
            <span className="text-slate-800 font-bold">{quotation.rateCardName}</span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Pricing Mode</span>
            <span className="text-slate-800 font-bold uppercase text-[10px]">{quotation.pricingMode}</span>
          </div>
        </div>

        {/* Rate Calculator Slabs Specifications */}
        <div className="space-y-3">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
            Pricing Breakdown
          </span>

          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="p-3">Calculation Component</th>
                <th className="p-3 text-right">Calculation Rule / Unit Rate</th>
                <th className="p-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {isIntl ? (
                <>
                  <tr>
                    <td className="p-3">
                      <span className="block font-bold">Base Freight ({snap.freightType || 'Air Freight'})</span>
                      <span className="block text-[10px] text-slate-400 font-light mt-0.5">
                        Destination: {snap.destinationCountry || quotation.destinationPincode}
                        {snap.tat && <strong className="text-emerald-800 ml-1">| Estimated Transit Time (TAT): {snap.tat}</strong>}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-600 font-mono">
                      ₹{snap.perKgRate || (quotation.baseRate / quotation.weight).toFixed(2)}/KG × {quotation.chargeableWeight} KG
                    </td>
                    <td className="p-3 text-right text-slate-900 font-bold">₹{snap.baseFreight || quotation.baseRate}</td>
                  </tr>

                  {otherChargesList.map((c: any, i: number) => (
                    <tr key={i}>
                      <td className="p-3">
                        <span className="block font-bold">{c.name}</span>
                        <span className="block text-[10px] text-slate-400 font-light mt-0.5">Other Charge</span>
                      </td>
                      <td className="p-3 text-right text-slate-600 font-mono">
                        {c.percentage ? `${c.percentage}%` : ''}
                        {c.percentage && c.fixedRate ? ' + ' : ''}
                        {c.fixedRate ? `₹${c.fixedRate}` : ''}
                      </td>
                      <td className="p-3 text-right text-slate-900 font-bold">₹{c.amount}</td>
                    </tr>
                  ))}
                </>
              ) : quotation.pricingMode.toUpperCase() === 'CARGO' ? (
                <tr>
                  <td className="p-3">
                    <span className="block font-bold">Cargo Price rate comparison</span>
                    <span className="block text-[10px] text-slate-400 font-light mt-0.5">Per-KG cost pricing mode</span>
                  </td>
                  <td className="p-3 text-right text-slate-600 font-mono">₹{quotation.cargoRate}/KG × {quotation.chargeableWeight} KG</td>
                  <td className="p-3 text-right text-slate-900 font-bold">₹{quotation.baseRate}</td>
                </tr>
              ) : (
                <tr>
                  <td className="p-3">
                    <span className="block font-bold">Courier Slab base & weight slabs</span>
                    <span className="block text-[10px] text-slate-400 font-light mt-0.5">Calculated using weight slab rules</span>
                  </td>
                  <td className="p-3 text-right text-slate-600 font-mono">Chargeable Weight: {quotation.chargeableWeight} KG</td>
                  <td className="p-3 text-right text-slate-900 font-bold">₹{quotation.baseRate}</td>
                </tr>
              )}

              {quotation.additionalCharges > 0 && (
                <tr>
                  <td className="p-3 text-slate-600">Handling, documentation and dispatch fees</td>
                  <td className="p-3 text-right text-slate-400 font-light">Additional Charge</td>
                  <td className="p-3 text-right text-slate-900 font-bold">₹{quotation.additionalCharges}</td>
                </tr>
              )}

              {/* Subtotal & Taxes */}
              <tr className="bg-slate-50/50">
                <td className="p-3 font-normal text-slate-500">Subtotal Amount</td>
                <td></td>
                <td className="p-3 text-right text-slate-800 font-bold">
                  ₹{(quotation.baseRate + quotation.additionalCharges).toFixed(2)}
                </td>
              </tr>
              {quotation.gstAmount > 0 && (
                <tr>
                  <td className="p-3 font-normal text-slate-500">Service Taxes (GST)</td>
                  <td className="p-3 text-right text-slate-400 font-light">Applied Levy</td>
                  <td className="p-3 text-right text-slate-900 font-bold">₹{quotation.gstAmount.toFixed(2)}</td>
                </tr>
              )}

              {/* GRAND TOTAL */}
              <tr className="bg-emerald-50/40 text-[#0F4C3A]">
                <td className="p-4 font-black text-sm">Grand Total (INR)</td>
                <td></td>
                <td className="p-4 text-right text-base font-black">
                  ₹{quotation.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* T&C / Signature details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 text-xs leading-normal">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Terms & Conditions</h4>
            <div className="text-slate-450 font-light whitespace-pre-line text-[11px] leading-relaxed">
              {tmpl.terms || '1. Quotation rates subject to weight/dimension serviceability checks.\n2. Standard terms apply.'}
            </div>
            {tmpl.paymentTerms && (
              <div className="mt-2 text-[11px] leading-relaxed">
                <strong>Payment Terms:</strong> {tmpl.paymentTerms}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end justify-between min-h-[100px] text-right">
            <div></div>
            <div className="space-y-1 mt-4">
              <div className="w-40 border-b border-slate-200 mx-auto md:mr-0 mb-1"></div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Authorized Signatory</span>
              <strong className="block text-slate-850 text-xs font-bold">{tmpl.authorizedPerson || 'Logistics Executive'}</strong>
              {tmpl.signatureText && <span className="block text-[10px] text-slate-400 font-light italic">{tmpl.signatureText}</span>}
            </div>
          </div>
        </div>

        {/* Quotation Footer */}
        <div className="border-t border-slate-100 pt-6 text-center text-[10px] text-slate-400 font-light flex items-center justify-between flex-wrap gap-2">
          <span>{tmpl.footerText || 'Thank you for choosing our shipping comparison services.'}</span>
          <span className="font-semibold text-[#0F4C3A] tracking-wider">Rates calculated using configured Rate Card</span>
        </div>
      </div>
    </div>
  );
}
