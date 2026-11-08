'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { ShippingLabelTemplateData, DEFAULT_GEO_TRANSIT_LOGO, formatPackageSequence } from '@/lib/shippingLabel';

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

  const rawTracking = (data.tracking_number || '').trim();
  const trackingNumber = (rawTracking.includes(',') ? rawTracking.split(',')[0].trim() : rawTracking) || 'GT2609000000';

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

  // 2. Generate real machine-readable CODE128 Barcode or 2D QR
  useEffect(() => {
    if (data.barcode_type === 'QR') {
      if (qrUrl) {
        onBarcodeGenerated?.(qrUrl);
      }
      return;
    }

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
  }, [trackingNumber, qrUrl, data.barcode_type, onBarcodeGenerated]);

  const recipientName = data.recipient_name || 'RECIPIENT / CUSTOMER NAME';
  const contactPerson =
    Boolean(data.include_contact_person_on_label) && data.contact_person_name
      ? String(data.contact_person_name).trim()
      : '';
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
  const hideAdditionalDetails = Boolean(data.hide_additional_details || data.hideAdditionalDetails);
  const rawPkg = data.package_count;
  let pkgCount = '01 / 01';
  if (typeof rawPkg === 'string' && rawPkg.includes('/')) {
    pkgCount = rawPkg;
  } else if (rawPkg !== undefined && rawPkg !== null && rawPkg !== '') {
    const num = parseInt(String(rawPkg), 10);
    if (!isNaN(num) && num > 0) {
      pkgCount = formatPackageSequence(1, num);
    }
  }
  const weight = Number(data.weight || 1.0).toFixed(2);
  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');
  const timeStr = data.time || '12:00';
  const mode = data.mode || 'SURFACE';
  const courierName = data.courier_company || template.headerText || 'GEO TRANSIT';
  const displayLogoUrl = template.logoUrl;

  const heightInches = template.heightInches || 6.0;
  const widthInches = template.widthInches || 4.0;
  const targetWidthPx = Math.round(widthInches * 96); // 384px at 96 DPI
  const targetHeightPx = Math.round(heightInches * 96); // 576, 384, 240, 192

  const is4x6 = heightInches >= 5.0;
  const is4x4 = heightInches >= 3.2 && heightInches < 5.0;
  const is4x25 = heightInches >= 2.2 && heightInches < 3.2;
  const is4x2 = heightInches < 2.2;

  const barcodeHeight = is4x2 ? 22 : is4x25 ? 26 : is4x4 ? 34 : 48;

  return (
    <div className="flex flex-col items-center select-none">
      {/* Hidden canvas used to extract high-res barcode image for PDF/PNG exports */}
      <canvas ref={barcodeCanvasRef} className="hidden" />

      {/* Primary Label Canvas - True Physical Dimensions based on selected print size */}
      <div
        id={id}
        style={{
          width: `${targetWidthPx}px`,
          height: `${targetHeightPx}px`,
          maxHeight: `${targetHeightPx}px`,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
        }}
        className="bg-white text-black border-2 border-black rounded-sm shadow-xl flex flex-col justify-between overflow-hidden relative box-border"
      >
        {/* ========================================================================= */}
        {/* LAYOUT 1: STANDARD 4x6 INCH */}
        {/* ========================================================================= */}
        {is4x6 && (
          <>
            {/* TOP SECTION: SHIP TO & LOGO */}
            <div className="p-3 border-b-2 border-black flex items-start justify-between min-h-[145px]">
              <div className="flex-1 pr-3 min-w-0">
                <span className="text-[11px] font-extrabold tracking-wider text-[#4B6B94] block uppercase mb-1">
                  SHIP TO:
                </span>
                <div className="text-[15.5px] font-black leading-tight uppercase tracking-tight break-words text-black">
                  {recipientName}
                </div>
                {contactPerson && (
                  <div className="text-[11.5px] font-bold text-slate-800 uppercase tracking-tight break-words mt-0.5">
                    ATTN: <span className="font-black text-black">{contactPerson}</span>
                  </div>
                )}
                <div className="text-[12px] font-medium text-slate-900 leading-snug mt-1 space-y-0.5">
                  <p className="break-words">{addr1}</p>
                  {addr2 && <p className="break-words text-slate-800">{addr2}</p>}
                  {(city || state) && (
                    <p className="font-bold text-slate-900 uppercase break-words">
                      {[city, state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-x-5 gap-y-1 text-[13px] font-black text-black mt-2">
                  <span>
                    MOB: <span className="font-mono font-bold tracking-tight text-[15px]">{mobile}</span>
                  </span>
                  <span>
                    PIN: <span className="font-mono font-black text-[15px]">{pincode}</span>
                  </span>
                </div>
              </div>

              {/* Master Super Admin Configured Logo / Courier Brand & Package Count */}
              <div className="w-[125px] shrink-0 flex flex-col items-center justify-start text-center">
                <div className="h-[46px] w-full flex items-center justify-center">
                  {displayLogoUrl ? (
                    <img
                      src={displayLogoUrl}
                      alt={courierName || 'Carrier Logo'}
                      className="max-h-[46px] max-w-[125px] object-contain"
                    />
                  ) : (
                    <div className="bg-[#0F4C3A] text-white px-2 py-1.5 rounded text-center w-full max-w-[125px] flex flex-col justify-center items-center shadow-xs overflow-hidden">
                      <span
                        className={`font-black uppercase leading-tight block truncate max-w-full ${
                          courierName.length > 20
                            ? 'text-[8.5px]'
                            : courierName.length > 13
                            ? 'text-[9.5px]'
                            : 'text-[11px]'
                        }`}
                        title={courierName}
                      >
                        {courierName}
                      </span>
                      <span className="text-[7px] font-bold text-emerald-200 uppercase tracking-widest block truncate max-w-full mt-0.5">
                        LOGISTICS
                      </span>
                    </div>
                  )}
                </div>

                {/* Package Count: PKG in normal weight, numerical count bold and significantly larger */}
                <div className="mt-1.5 text-center w-full">
                  <span className="text-[12px] font-normal text-slate-500 uppercase tracking-widest block leading-none">
                    PKG
                  </span>
                  <span className="text-[23px] font-black text-black tracking-tight block leading-tight mt-0.5">
                    {pkgCount}
                  </span>
                </div>
              </div>
            </div>

            {/* MIDDLE SECTION 1: QR CODE & SERVICE MATRIX */}
            <div className="flex border-b-2 border-black min-h-[160px]">
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
                <span className="text-[9.5px] font-black text-[#4B6B94] uppercase tracking-wider mt-1.5">
                  SCAN FOR TRACKING
                </span>
              </div>

              {/* Right: Service Information Matrix */}
              <div className="flex-1 p-2.5 flex flex-col justify-between">
                {!hideAdditionalDetails ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-slate-300">
                      <div>
                        <span className="text-[8.5px] font-black text-[#4B6B94] uppercase tracking-wider block">
                          SERVICE
                        </span>
                        <span className="text-[14.5px] font-black text-black uppercase leading-tight block">
                          {service}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8.5px] font-black text-[#4B6B94] uppercase tracking-wider block">
                          SERVICE TYPE
                        </span>
                        <span className="text-[14.5px] font-black text-black uppercase leading-tight block truncate">
                          {serviceType}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-slate-300">
                      <div>
                        <span className="text-[8.5px] font-black text-[#4B6B94] uppercase tracking-wider block">
                          ORG CODE
                        </span>
                        <span className="text-[17px] font-black text-black tracking-tight block">
                          {originCode}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8.5px] font-black text-[#4B6B94] uppercase tracking-wider block">
                          DST CODE
                        </span>
                        <span className="text-[17px] font-black text-black tracking-tight block">
                          {destinationCode}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <span className="text-[8.5px] font-black text-[#4B6B94] uppercase tracking-wider block">
                        PAYMENT STATUS
                      </span>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[15px] font-black uppercase tracking-tight ${
                            paymentStatus === 'COD' ? 'text-red-700' : 'text-emerald-800'
                          }`}
                        >
                          {paymentStatus}
                        </span>
                        {paymentStatus === 'COD' && (
                          <span className="text-[15px] font-black text-red-700">
                            ₹{amountToCollect.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-300">
                      <span className="text-[8.5px] font-black text-[#4B6B94] uppercase tracking-wider block">
                        TRACKING NO
                      </span>
                      <span className="font-mono font-black text-[14px] text-black tracking-wider block mt-0.5">
                        {trackingNumber}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 p-2 flex flex-col justify-around">
                    <div className="border-b border-slate-300 pb-3">
                      <span className="text-[9px] font-black text-[#4B6B94] uppercase tracking-wider block">
                        PAYMENT STATUS
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className={`text-[18px] font-black uppercase tracking-tight ${
                            paymentStatus === 'COD' ? 'text-red-700' : 'text-emerald-800'
                          }`}
                        >
                          {paymentStatus}
                        </span>
                        {paymentStatus === 'COD' && (
                          <span className="text-[18px] font-black text-red-700">
                            ₹{amountToCollect.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3">
                      <span className="text-[9px] font-black text-[#4B6B94] uppercase tracking-wider block">
                        TRACKING NO
                      </span>
                      <span className="font-mono font-black text-[16px] text-black tracking-wider block mt-1">
                        {trackingNumber}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MIDDLE SECTION 2: FULL-WIDTH CODE128 BARCODE OR 2D QR */}
            <div className="p-3 border-b-2 border-black flex flex-col items-center justify-center bg-white">
              {data.barcode_type === 'QR' ? (
                qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="2D QR Code"
                    className="max-h-[55px] max-w-[55px] object-contain"
                  />
                ) : (
                  <div className="text-[10px] text-slate-400 font-mono">Generating QR...</div>
                )
              ) : (
                <svg
                  ref={barcodeSvgRef}
                  className="w-full max-h-[55px]"
                  id="shipping-label-barcode-svg"
                />
              )}
              <div className="text-[15px] font-mono font-black tracking-widest text-black mt-1">
                {trackingNumber}
              </div>
            </div>

            {/* BOTTOM SECTION: WEIGHT, DATE, MODE */}
            <div className="grid grid-cols-3 divide-x-2 divide-black border-b border-black text-center min-h-[58px]">
              <div className="p-1.5 flex flex-col justify-center">
                <span className="text-[8.5px] font-black text-[#4B6B94] uppercase tracking-wider block">
                  WEIGHT
                </span>
                <span className="text-[14px] font-black text-black font-mono leading-tight mt-0.5">
                  {weight} KG
                </span>
              </div>
              <div className="p-1.5 flex flex-col justify-center">
                <span className="text-[8.5px] font-black text-[#4B6B94] uppercase tracking-wider block">
                  DATE / TIME
                </span>
                <span className="text-[11.5px] font-black text-black leading-tight block mt-0.5">
                  {dateStr}
                </span>
                <span className="text-[9.5px] font-bold text-slate-700 font-mono block">
                  {timeStr}
                </span>
              </div>
              <div className="p-1.5 flex flex-col justify-center">
                <span className="text-[8.5px] font-black text-[#4B6B94] uppercase tracking-wider block">
                  MODE
                </span>
                <span className="text-[13px] font-black text-black uppercase leading-tight mt-0.5">
                  {mode}
                </span>
              </div>
            </div>

            {/* FOOTER */}
            <div className="bg-slate-100/80 px-2 py-1 text-center">
              <p className="text-[8.5px] font-bold text-slate-600 tracking-wider uppercase truncate">
                {template.footerText || 'GEO TRANSIT LOGISTICS NETWORK - SCAN QR OR VERIFY AT WWW.GEOTRANSIT.COM'}
              </p>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* LAYOUT 2: 4x4 INCH (SQUARE COMPACT) */}
        {/* ========================================================================= */}
        {is4x4 && (
          <>
            {/* TOP SECTION: SHIP TO & LOGO */}
            <div className="p-2 border-b-2 border-black flex items-start justify-between min-h-[92px]">
              <div className="flex-1 pr-2 min-w-0">
                <span className="text-[9.5px] font-extrabold tracking-wider text-[#4B6B94] block uppercase mb-0.5">
                  SHIP TO:
                </span>
                <div className="text-[12.5px] font-black leading-tight uppercase tracking-tight break-words text-black">
                  {recipientName}
                </div>
                {contactPerson && (
                  <div className="text-[9.5px] font-bold text-slate-800 uppercase tracking-tight break-words mt-0.5">
                    ATTN: <span className="font-black text-black">{contactPerson}</span>
                  </div>
                )}
                <div className="text-[9.5px] font-medium text-slate-900 leading-snug mt-0.5 space-y-0.5">
                  <p className="break-words">{addr1}</p>
                  {addr2 && <p className="break-words text-slate-800">{addr2}</p>}
                  {(city || state) && (
                    <p className="font-bold text-slate-900 uppercase break-words">
                      {[city, state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-black text-black mt-1.5">
                  <span>
                    MOB: <span className="font-mono font-bold tracking-tight text-[12px]">{mobile}</span>
                  </span>
                  <span>
                    PIN: <span className="font-mono font-black text-[12px]">{pincode}</span>
                  </span>
                </div>
              </div>

              {/* Logo / Courier Brand & Package Count */}
              <div className="w-[100px] shrink-0 flex flex-col items-center justify-start text-center">
                <div className="h-[34px] w-full flex items-center justify-center">
                  {displayLogoUrl ? (
                    <img
                      src={displayLogoUrl}
                      alt={courierName || 'Carrier Logo'}
                      className="max-h-[34px] max-w-[100px] object-contain"
                    />
                  ) : (
                    <div className="bg-[#0F4C3A] text-white px-1.5 py-1 rounded text-center w-full max-w-[100px] flex flex-col justify-center items-center shadow-xs overflow-hidden">
                      <span
                        className={`font-black uppercase leading-tight block truncate max-w-full ${
                          courierName.length > 18
                            ? 'text-[8px]'
                            : courierName.length > 12
                            ? 'text-[9px]'
                            : 'text-[10px]'
                        }`}
                        title={courierName}
                      >
                        {courierName}
                      </span>
                      <span className="text-[6.5px] font-bold text-emerald-200 uppercase tracking-widest block truncate max-w-full mt-0.5">
                        LOGISTICS
                      </span>
                    </div>
                  )}
                </div>

                {/* Package Count: PKG normal weight, numerical count bold */}
                <div className="mt-1 text-center w-full">
                  <span className="text-[10px] font-normal text-slate-500 uppercase tracking-widest block leading-none">
                    PKG
                  </span>
                  <span className="text-[17px] font-black text-black tracking-tight block leading-tight mt-0.5">
                    {pkgCount}
                  </span>
                </div>
              </div>
            </div>

            {/* MIDDLE SECTION 1: QR CODE & SERVICE MATRIX */}
            <div className="flex border-b-2 border-black min-h-[115px]">
              {/* QR Code */}
              <div className="w-[110px] p-1.5 flex flex-col items-center justify-center border-r-2 border-black bg-slate-50/50">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="Shipment QR Code"
                    className="w-[88px] h-[88px] object-contain border border-black/10 rounded-xs"
                  />
                ) : (
                  <div className="w-[88px] h-[88px] border border-dashed border-slate-400 flex items-center justify-center text-[9px] text-slate-400">
                    QR...
                  </div>
                )}
                <span className="text-[8.5px] font-bold text-[#4B6B94] uppercase tracking-wider mt-0.5">
                  TRACKING QR
                </span>
              </div>

              {/* Service Details */}
              <div className="flex-1 p-2 flex flex-col justify-between">
                {!hideAdditionalDetails ? (
                  <>
                    <div className="grid grid-cols-2 gap-1.5 pb-1 border-b border-slate-300">
                      <div>
                        <span className="text-[7.5px] font-black text-[#4B6B94] uppercase block">SVC</span>
                        <span className="text-[11.5px] font-black text-black uppercase leading-tight block truncate">
                          {service}
                        </span>
                      </div>
                      <div>
                        <span className="text-[7.5px] font-black text-[#4B6B94] uppercase block">TYPE</span>
                        <span className="text-[11.5px] font-black text-black uppercase leading-tight block truncate">
                          {serviceType}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 py-1 border-b border-slate-300">
                      <div>
                        <span className="text-[7.5px] font-black text-[#4B6B94] uppercase block">ORG</span>
                        <span className="text-[14px] font-black text-black tracking-tight block">{originCode}</span>
                      </div>
                      <div>
                        <span className="text-[7.5px] font-black text-[#4B6B94] uppercase block">DST</span>
                        <span className="text-[14px] font-black text-black tracking-tight block">{destinationCode}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span
                        className={`text-[11px] font-black uppercase tracking-tight ${
                          paymentStatus === 'COD' ? 'text-red-700' : 'text-emerald-800'
                        }`}
                      >
                        {paymentStatus} {paymentStatus === 'COD' && `₹${amountToCollect}`}
                      </span>
                      <span className="text-[10px] font-mono font-black text-black">{trackingNumber}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 p-1.5 flex flex-col justify-around">
                    <div className="border-b border-slate-300 pb-2">
                      <span className="text-[8px] font-black text-[#4B6B94] uppercase block">PAYMENT STATUS</span>
                      <span
                        className={`text-[15px] font-black uppercase tracking-tight block mt-0.5 ${
                          paymentStatus === 'COD' ? 'text-red-700' : 'text-emerald-800'
                        }`}
                      >
                        {paymentStatus} {paymentStatus === 'COD' && `₹${amountToCollect}`}
                      </span>
                    </div>
                    <div className="pt-2">
                      <span className="text-[8px] font-black text-[#4B6B94] uppercase block">TRACKING NO</span>
                      <span className="text-[13px] font-mono font-black text-black block mt-0.5">{trackingNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MIDDLE SECTION 2: BARCODE OR 2D QR */}
            <div className="p-1.5 border-b-2 border-black flex flex-col items-center justify-center bg-white">
              {data.barcode_type === 'QR' ? (
                qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="2D QR Code"
                    className="max-h-[36px] max-w-[36px] object-contain"
                  />
                ) : (
                  <div className="text-[9px] text-slate-400 font-mono">Generating QR...</div>
                )
              ) : (
                <svg
                  ref={barcodeSvgRef}
                  className="w-full max-h-[36px]"
                  id="shipping-label-barcode-svg"
                />
              )}
              <div className="text-[12px] font-mono font-black tracking-widest text-black mt-0.5">
                {trackingNumber}
              </div>
            </div>

            {/* BOTTOM SECTION: WEIGHT, DATE, MODE */}
            <div className="grid grid-cols-3 divide-x-2 divide-black border-b border-black text-center min-h-[44px]">
              <div className="p-1 flex flex-col justify-center">
                <span className="text-[7.5px] font-black text-[#4B6B94] uppercase block">WEIGHT</span>
                <span className="text-[11px] font-black text-black font-mono mt-0.5">{weight} KG</span>
              </div>
              <div className="p-1 flex flex-col justify-center">
                <span className="text-[7.5px] font-black text-[#4B6B94] uppercase block">DATE</span>
                <span className="text-[10px] font-bold text-black mt-0.5">{dateStr}</span>
              </div>
              <div className="p-1 flex flex-col justify-center">
                <span className="text-[7.5px] font-black text-[#4B6B94] uppercase block">MODE</span>
                <span className="text-[10.5px] font-black text-black uppercase mt-0.5">{mode}</span>
              </div>
            </div>

            {/* FOOTER */}
            <div className="bg-slate-100/80 px-2 py-0.5 text-center">
              <p className="text-[7.5px] font-bold text-slate-600 tracking-wider uppercase truncate">
                {template.footerText || 'GEO TRANSIT LOGISTICS NETWORK - SCAN QR OR VERIFY AT WWW.GEOTRANSIT.COM'}
              </p>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* LAYOUT 3: 4x2.5 INCH (COMPACT HORIZONTAL) */}
        {/* ========================================================================= */}
        {is4x25 && (
          <>
            {/* TOP SECTION: SHIP TO & LOGO */}
            <div className="px-2 py-1.5 border-b-2 border-black flex items-start justify-between min-h-[64px]">
              <div className="flex-1 pr-2 min-w-0">
                <div className="text-[10.5px] font-black uppercase tracking-tight leading-tight truncate">
                  <span className="text-[7.5px] font-extrabold text-slate-500 mr-1">TO:</span>
                  {recipientName}
                </div>
                {contactPerson && (
                  <div className="text-[8px] font-bold text-slate-700 leading-tight truncate">
                    ATTN: <span className="font-black text-black">{contactPerson}</span>
                  </div>
                )}
                <div className="text-[8px] font-semibold text-slate-800 leading-[1.25] mt-0.5 break-words">
                  <div>{addr1}</div>
                  {addr2 && <div>{addr2}</div>}
                  {(city || state) && (
                    <div className="text-slate-600 font-bold uppercase text-[7.5px]">
                      {[city, state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[8.5px] font-black text-black mt-1">
                  <span>
                    MOB: <span className="font-mono font-bold text-[9.5px]">{mobile}</span>
                  </span>
                  <span>
                    PIN: <span className="font-mono font-black text-[10.5px]">{pincode}</span>
                  </span>
                </div>
              </div>

              {/* Logo / Badge */}
              <div className="w-[75px] shrink-0 flex flex-col items-end justify-center pt-0.5">
                {displayLogoUrl ? (
                  <img
                    src={displayLogoUrl}
                    alt={courierName || 'Carrier Logo'}
                    className="max-h-[26px] max-w-[75px] object-contain"
                  />
                ) : (
                  <div className="bg-[#0F4C3A] text-white px-1 py-0.5 rounded text-center w-full max-w-[75px] flex flex-col justify-center items-center shadow-xs overflow-hidden">
                    <span
                      className={`font-black uppercase leading-tight block truncate max-w-full ${
                        courierName.length > 14 ? 'text-[7.5px]' : 'text-[8.5px]'
                      }`}
                      title={courierName}
                    >
                      {courierName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* MIDDLE SECTION: QR CODE + BARCODE & DETAILS */}
            <div className="flex border-b-2 border-black min-h-[96px]">
              {/* QR Code */}
              <div className="w-[74px] p-1 flex flex-col items-center justify-center border-r-2 border-black bg-slate-50/50">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="QR"
                    className="w-[58px] h-[58px] object-contain border border-black/10 rounded-xs"
                  />
                ) : (
                  <div className="w-[58px] h-[58px] border border-dashed border-slate-400 flex items-center justify-center text-[8px] text-slate-400">
                    QR
                  </div>
                )}
                <span className="text-[7px] font-bold text-slate-500 uppercase mt-0.5">TRACK</span>
              </div>

              {/* Right: Barcode + Summary */}
              <div className="flex-1 p-1 flex flex-col justify-between">
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1 flex flex-col items-center justify-center min-w-0 pr-1">
                    {data.barcode_type === 'QR' ? (
                      qrUrl ? (
                        <img
                          src={qrUrl}
                          alt="2D QR Code"
                          className="max-h-[24px] max-w-[24px] object-contain"
                        />
                      ) : null
                    ) : (
                      <svg
                        ref={barcodeSvgRef}
                        className="w-full max-h-[24px]"
                        id="shipping-label-barcode-svg"
                      />
                    )}
                    <div className="text-[8.5px] font-mono font-black tracking-widest text-black text-center">
                      {trackingNumber}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center justify-center pl-1 pr-1.5">
                    <span className="text-[9px] font-bold text-slate-700 uppercase mr-1 whitespace-nowrap">
                      PKG:
                    </span>
                    <span className="text-[11.5px] font-black font-mono tracking-tight text-black whitespace-nowrap">
                      {pkgCount}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-300 pt-0.5 text-[7.5px] space-y-0.5">
                  {!hideAdditionalDetails && (
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>SVC: {service} ({serviceType})</span>
                      <span>{originCode} &gt; {destinationCode}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black">
                    <span className={paymentStatus === 'COD' ? 'text-red-700' : 'text-emerald-800'}>
                      {paymentStatus} {paymentStatus === 'COD' && `₹${amountToCollect}`}
                    </span>
                    <span>{weight} KG</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM STATS */}
            <div className="grid grid-cols-3 divide-x-2 divide-black border-b border-black text-center min-h-[28px]">
              <div className="p-0.5 flex flex-col justify-center">
                <span className="text-[6.5px] font-black text-slate-500 uppercase">WEIGHT</span>
                <span className="text-[8.5px] font-black font-mono">{weight} KG</span>
              </div>
              <div className="p-0.5 flex flex-col justify-center">
                <span className="text-[6.5px] font-black text-slate-500 uppercase">DATE</span>
                <span className="text-[8px] font-bold">{dateStr}</span>
              </div>
              <div className="p-0.5 flex flex-col justify-center">
                <span className="text-[6.5px] font-black text-slate-500 uppercase">MODE</span>
                <span className="text-[8.5px] font-black uppercase">{mode}</span>
              </div>
            </div>

            {/* FOOTER */}
            <div className="bg-slate-100/80 px-1 py-0.5 text-center">
              <p className="text-[6.5px] font-bold text-slate-600 tracking-wider uppercase truncate">
                {template.footerText || 'GEO TRANSIT LOGISTICS • TRACK AT WWW.GEOTRANSIT.COM'}
              </p>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* LAYOUT 4: 4x2 INCH (MICRO THERMAL) */}
        {/* ========================================================================= */}
        {is4x2 && (
          <>
            {/* TOP SECTION: SHIP TO & ORG/DST */}
            <div className="px-2 py-1 border-b-2 border-black flex items-start justify-between min-h-[50px]">
              <div className="flex-1 pr-1.5 min-w-0">
                <div className="text-[9.5px] font-black uppercase tracking-tight leading-tight truncate">
                  <span className="text-[6.5px] font-extrabold text-slate-500 mr-0.5">TO:</span>
                  {recipientName}
                </div>
                {contactPerson && (
                  <div className="text-[7px] font-bold text-slate-700 leading-tight truncate">
                    ATTN: <span className="font-black text-black">{contactPerson}</span>
                  </div>
                )}
                <div className="text-[7.5px] font-semibold text-slate-800 leading-[1.2] mt-0.5 break-words">
                  <div>{addr1}</div>
                  {addr2 && <div>{addr2}</div>}
                  {(city || state) && (
                    <div className="text-slate-600 font-bold uppercase text-[7px]">
                      {[city, state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2.5 text-[7.5px] font-black text-black mt-0.5">
                  <span>
                    MOB: <span className="font-mono font-bold text-[9px]">{mobile}</span>
                  </span>
                  <span>
                    PIN: <span className="font-mono font-black text-[9.5px]">{pincode}</span>
                  </span>
                </div>
              </div>
              {!hideAdditionalDetails && (
                <div className="text-right shrink-0 pl-1">
                  <div className="text-[9.5px] font-black text-black leading-tight">{originCode} &gt; {destinationCode}</div>
                  <div className="text-[7px] font-bold bg-slate-100 px-1 rounded inline-block text-slate-700 mt-0.5">
                    {service}
                  </div>
                </div>
              )}
            </div>

            {/* MIDDLE SECTION: QR & BARCODE */}
            <div className="flex border-b-2 border-black min-h-[72px]">
              {/* Left QR */}
              <div className="w-[56px] p-0.5 flex flex-col items-center justify-center border-r-2 border-black bg-slate-50/50">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="QR"
                    className="w-[46px] h-[46px] object-contain border border-black/10 rounded-xs"
                  />
                ) : (
                  <div className="w-[46px] h-[46px] border border-dashed border-slate-400 flex items-center justify-center text-[7px] text-slate-400">
                    QR
                  </div>
                )}
                <span className="text-[6px] font-bold text-slate-500 uppercase mt-0.5">SCAN</span>
              </div>

              {/* Right Barcode */}
              <div className="flex-1 px-1.5 py-0.5 flex flex-col justify-center items-center">
                {data.barcode_type === 'QR' ? (
                  qrUrl ? (
                    <img
                      src={qrUrl}
                      alt="2D QR Code"
                      className="max-h-[20px] max-w-[20px] object-contain"
                    />
                  ) : null
                ) : (
                  <svg
                    ref={barcodeSvgRef}
                    className="w-full max-h-[20px]"
                    id="shipping-label-barcode-svg"
                  />
                )}
                <div className="text-[8.5px] font-mono font-black tracking-widest text-black mt-0.5 text-center">
                  {trackingNumber}
                </div>
                <div className="text-[7px] font-bold text-slate-700 flex justify-between w-full mt-0.5 border-t border-slate-200 pt-0.5">
                  <span className={paymentStatus === 'COD' ? 'text-red-700' : 'text-emerald-800'}>
                    {paymentStatus}
                  </span>
                  <span>{weight} KG • {mode}</span>
                </div>
              </div>
            </div>

            {/* BOTTOM STATS */}
            <div className="grid grid-cols-2 divide-x-2 divide-black border-b border-black text-center min-h-[22px]">
              <div className="p-0.5 flex flex-col justify-center">
                <span className="text-[5.5px] font-black text-slate-500 uppercase">DATE</span>
                <span className="text-[7px] font-bold">{dateStr}</span>
              </div>
              <div className="p-0.5 flex flex-col justify-center">
                <span className="text-[5.5px] font-black text-slate-500 uppercase">PKG</span>
                <span className="text-[7px] font-bold font-mono">{pkgCount}</span>
              </div>
            </div>

            {/* FOOTER */}
            <div className="bg-slate-100/80 px-1 py-0.5 text-center">
              <p className="text-[5.5px] font-bold text-slate-600 tracking-wider uppercase truncate">
                {template.footerText || 'GEO TRANSIT LOGISTICS NETWORK • WWW.GEOTRANSIT.COM'}
              </p>
            </div>
          </>
        )}

        {/* Barcode renderer hook */}
        <BarcodeRenderer
          svgRef={barcodeSvgRef}
          value={trackingNumber}
          height={barcodeHeight}
          enabled={data.barcode_type !== 'QR'}
        />
      </div>
    </div>
  );
}

function BarcodeRenderer({
  svgRef,
  value,
  height = 48,
  enabled = true,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  value: string;
  height?: number;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          displayValue: false,
          margin: 0,
          height,
          width: height < 25 ? 1.5 : height < 35 ? 1.8 : 2.1,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('Error drawing barcode SVG:', err);
      }
    }
  }, [svgRef, value, height, enabled]);

  return null;
}
