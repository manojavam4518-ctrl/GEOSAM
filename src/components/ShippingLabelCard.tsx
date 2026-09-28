'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { ShippingLabelTemplateData, DEFAULT_GEO_TRANSIT_LOGO } from '@/lib/shippingLabel';

export interface ShippingLabelCardProps {
  template: ShippingLabelTemplateData;
  data: Record<string, any>;
  id?: string;
  onQrGenerated?: (dataUrl: string) => void;
  onBarcodeGenerated?: (dataUrl: string) => void;
  scale?: number;
}

export default function ShippingLabelCard({
  template,
  data,
  id = 'shipping-label-preview',
  onQrGenerated,
  onBarcodeGenerated,
  scale = 1,
}: ShippingLabelCardProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  const trackingNumber = (data.tracking_number || '').trim() || 'GT2609000000';

  // 1. Generate real scannable QR Code
  useEffect(() => {
    let isMounted = true;
    async function makeQr() {
      try {
        const url = await QRCode.toDataURL(trackingNumber, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        if (isMounted) {
          setQrUrl(url);
          onQrGenerated?.(url);
        }
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      }
    }
    makeQr();
    return () => {
      isMounted = false;
    };
  }, [trackingNumber]);

  // 2. Generate real machine-readable CODE128 Barcode
  useEffect(() => {
    if (barcodeCanvasRef.current && trackingNumber) {
      try {
        JsBarcode(barcodeCanvasRef.current, trackingNumber, {
          format: 'CODE128',
          displayValue: false, // We render the text separately for perfect typography
          margin: 0,
          height: 48,
          width: 2.2,
          background: '#ffffff',
          lineColor: '#000000',
        });
        const dataUrl = barcodeCanvasRef.current.toDataURL('image/png');
        onBarcodeGenerated?.(dataUrl);
      } catch (err) {
        console.error('Failed to generate Barcode:', err);
      }
    }
  }, [trackingNumber]);

  const recipientName = data.recipient_name || 'RECIPIENT / CUSTOMER NAME';
  const addr1 = data.address_line_1 || 'Address Line 1';
  const addr2 = data.address_line_2 || '';
  const city = data.city || 'City';
  const state = data.state || 'State';
  const pincode = data.pincode || '400001';
  const mobile = data.mobile || '+91 00000 00000';

  const service = data.service || 'LITE';
  const serviceType = data.service_type || 'STD EXP-A';
  const originCode = data.origin_code || 'BOM';
  const destinationCode = data.destination_code || 'DEL';
  const paymentStatus = (data.payment_status || 'PREPAID').toUpperCase();
  const amountToCollect = Number(data.amount_to_collect || 0);
  const pkgCount = data.package_count || '001 / 001';
  const routeLocation = data.route_location || 'NORTH HUB';
  const weight = Number(data.weight || 1.0).toFixed(2);
  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');
  const timeStr = data.time || '12:00';
  const mode = data.mode || 'SURFACE';

  return (
    <div className="flex flex-col items-center select-none">
      {/* Hidden canvas used to extract high-res barcode image for PDF/PNG exports */}
      <canvas ref={barcodeCanvasRef} className="hidden" />

      {/* Primary Label Canvas - Standard 4x6 Ratio (384px x 576px at 96 DPI, or scaled) */}
      <div
        id={id}
        style={{
          width: '384px',
          minHeight: '576px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
        }}
        className="bg-white text-black border-2 border-black rounded-sm shadow-xl flex flex-col justify-between overflow-hidden relative"
      >
        {/* TOP SECTION: SHIP TO & LOGO */}
        <div className="p-3 border-b-2 border-black flex items-start justify-between min-h-[145px]">
          <div className="flex-1 pr-2">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-600 block uppercase mb-0.5">
              SHIP TO:
            </span>
            <div className="text-[13px] font-black leading-snug uppercase tracking-tight line-clamp-1">
              {recipientName}
            </div>
            <div className="text-[11px] font-semibold text-slate-800 leading-tight mt-1 space-y-0.5">
              <p className="line-clamp-1">{addr1}</p>
              {addr2 && <p className="line-clamp-1 text-slate-700">{addr2}</p>}
              <p className="font-bold text-slate-900 uppercase">
                {city}, {state} - <span className="font-black text-black">{pincode}</span>
              </p>
            </div>
            <div className="text-[11px] font-black text-black mt-2">
              MOBILE NO: <span className="font-mono tracking-tight">{mobile}</span>
            </div>
          </div>

          {/* Master Super Admin Configured Logo */}
          <div className="w-[110px] shrink-0 flex flex-col items-end">
            {template.logoUrl ? (
              <img
                src={template.logoUrl}
                alt="Carrier Logo"
                className="max-h-[46px] max-w-[110px] object-contain"
              />
            ) : (
              <div className="bg-[#0F4C3A] text-white px-2 py-1.5 rounded text-center">
                <span className="font-black text-xs block leading-tight">GEO TRANSIT</span>
                <span className="text-[8px] font-bold text-emerald-200 uppercase tracking-widest">LOGISTICS</span>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE SECTION 1: QR CODE & SERVICE MATRIX */}
        <div className="flex border-b-2 border-black min-h-[155px]">
          {/* Left: Scannable 2D QR Code */}
          <div className="w-[145px] p-2 flex flex-col items-center justify-center border-r-2 border-black bg-slate-50/50">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Shipment QR Code"
                className="w-[125px] h-[125px] object-contain border border-black/10 rounded-xs"
              />
            ) : (
              <div className="w-[120px] h-[120px] border border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-400">
                Generating QR...
              </div>
            )}
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">
              SCAN FOR TRACKING
            </span>
          </div>

          {/* Right: Service Information Matrix */}
          <div className="flex-1 p-2.5 flex flex-col justify-between">
            {/* Service & Service Type */}
            <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-slate-300">
              <div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
                  SERVICE
                </span>
                <span className="text-[12px] font-black text-black uppercase leading-tight block">
                  {service}
                </span>
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
                  SERVICE TYPE
                </span>
                <span className="text-[12px] font-black text-black uppercase leading-tight block truncate">
                  {serviceType}
                </span>
              </div>
            </div>

            {/* Origin & Destination Code */}
            <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-slate-300">
              <div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
                  ORG CODE
                </span>
                <span className="text-[14px] font-black text-black tracking-tight block">
                  {originCode}
                </span>
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
                  DST CODE
                </span>
                <span className="text-[14px] font-black text-black tracking-tight block">
                  {destinationCode}
                </span>
              </div>
            </div>

            {/* Payment Status & Amount */}
            <div className="py-1">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
                PAYMENT STATUS
              </span>
              <div className="flex items-center justify-between">
                <span
                  className={`text-[12px] font-black uppercase tracking-tight ${
                    paymentStatus === 'COD' ? 'text-red-700' : 'text-emerald-800'
                  }`}
                >
                  {paymentStatus}
                </span>
                {paymentStatus === 'COD' && (
                  <span className="text-[12px] font-black text-red-700">
                    ₹{amountToCollect.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            {/* Tracking Number & Package Count */}
            <div className="pt-1 border-t border-slate-300 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-[8px] font-black text-slate-500 uppercase block">TRACKING NO</span>
                <span className="font-mono font-black text-black">{trackingNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-black text-slate-500 uppercase block">PKG</span>
                <span className="font-mono font-bold text-black">{pkgCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION 2: FULL-WIDTH CODE128 BARCODE */}
        <div className="p-3 border-b-2 border-black flex flex-col items-center justify-center bg-white">
          <svg
            ref={barcodeSvgRef}
            className="w-full max-h-[55px]"
            id="shipping-label-barcode-svg"
          />
          <div className="text-[13px] font-mono font-black tracking-widest text-black mt-1">
            {trackingNumber}
          </div>
        </div>

        {/* EFFECT TO RENDER SVG BARCODE */}
        <BarcodeRenderer svgRef={barcodeSvgRef} value={trackingNumber} />

        {/* BOTTOM SECTION: ROUTE, WEIGHT, DATE, MODE */}
        <div className="grid grid-cols-4 divide-x-2 divide-black border-b border-black text-center min-h-[56px]">
          {/* ROUTE */}
          <div className="p-1.5 flex flex-col justify-center">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
              ROUTE / HUB
            </span>
            <span className="text-[10px] font-black text-black uppercase leading-tight truncate mt-0.5">
              {routeLocation}
            </span>
          </div>

          {/* WEIGHT */}
          <div className="p-1.5 flex flex-col justify-center">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
              WEIGHT
            </span>
            <span className="text-[11px] font-black text-black font-mono leading-tight mt-0.5">
              {weight} KG
            </span>
          </div>

          {/* DATE / TIME */}
          <div className="p-1.5 flex flex-col justify-center">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
              DATE / TIME
            </span>
            <span className="text-[9px] font-bold text-black leading-tight block mt-0.5">
              {dateStr}
            </span>
            <span className="text-[8px] font-semibold text-slate-600 font-mono">
              {timeStr}
            </span>
          </div>

          {/* MODE */}
          <div className="p-1.5 flex flex-col justify-center">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
              MODE
            </span>
            <span className="text-[11px] font-black text-black uppercase leading-tight mt-0.5">
              {mode}
            </span>
          </div>
        </div>

        {/* FOOTER TEXT */}
        <div className="bg-slate-100/80 px-2 py-1 text-center">
          <p className="text-[8px] font-bold text-slate-600 tracking-wider uppercase truncate">
            {template.footerText || 'GEO TRANSIT LOGISTICS NETWORK • TRACK AT WWW.GEOTRANSIT.COM'}
          </p>
        </div>
      </div>
    </div>
  );
}

function BarcodeRenderer({
  svgRef,
  value,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  value: string;
}) {
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          displayValue: false,
          margin: 0,
          height: 48,
          width: 2.1,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('Error drawing barcode SVG:', err);
      }
    }
  }, [svgRef, value]);

  return null;
}
