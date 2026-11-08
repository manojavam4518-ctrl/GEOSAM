'use client';

import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  Download,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ProformaInvoiceInput,
  ProformaInvoiceRecord,
  formatRelationshipDisplay,
  formatNameWithTitle,
} from '@/lib/proformaInvoiceDb';
import {
  downloadProformaInvoicePdf,
  printProformaInvoiceDocument,
} from '@/utils/proformaInvoicePdfExport';
import ProformaInvoiceHoverMagnifier from './ProformaInvoiceHoverMagnifier';
import { useDragToPan } from '@/hooks/useDragToPan';

export interface ProformaInvoiceLivePreviewCardProps {
  data: Partial<ProformaInvoiceInput & ProformaInvoiceRecord>;
  onSave?: () => void;
  onSignatureClick?: () => void;
  isSaving?: boolean;
  className?: string;
}

export default function ProformaInvoiceLivePreviewCard({
  data,
  onSave,
  onSignatureClick,
  isSaving = false,
  className = '',
}: ProformaInvoiceLivePreviewCardProps) {
  // Enhanced preview dimensions (+10% size) with crisp default zoom
  const [zoom, setZoom] = useState<number>(0.85);
  const [magnifierEnabled, setMagnifierEnabled] = useState<boolean>(true);

  const cardViewportRef = useRef<HTMLDivElement>(null);
  const { panProps, cursorClass, isDragging } = useDragToPan({
    externalRef: cardViewportRef,
    zoom,
    onZoomChange: setZoom,
    minZoom: 0.4,
    maxZoom: 1.8,
    enableWheelZoom: true,
  });

  const handleZoomIn = () => setZoom((prev) => Math.min(1.8, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.4, Math.round((prev - 0.1) * 10) / 10));
  const handleResetZoom = () => setZoom(1.0);
  const handleFitPreview = () => setZoom(0.82);

  // Minimum 6 rows matching the reference template
  const items = Array.from({ length: Math.max(6, data.items?.length || 6) }, (_, i) => {
    return (data.items && data.items[i]) || {
      sNo: i + 1,
      description: '',
      hsnCode: '',
      quantity: '',
      rate: '',
      valueInr: 0,
    };
  });

  return (
    <div
      className={`w-full flex flex-col rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs ${className}`}
    >
      {/* 1. Header Toolbar */}
      <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <h3 className="font-black text-xs uppercase tracking-wider text-white">
            LIVE A4 PREVIEW • PROFORMA INVOICE
          </h3>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.4}
            title="Zoom Out (-10%)"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 1.8}
            title="Zoom In (+10%)"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset Zoom (100%)"
            className="px-1.5 h-6 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            100%
          </button>
          <button
            type="button"
            onClick={handleFitPreview}
            title="Fit to Preview"
            className="inline-flex items-center gap-1 px-1.5 h-6 rounded-lg text-[10px] font-bold text-emerald-400 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-2.5 h-2.5" />
            Fit
          </button>
          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => setMagnifierEnabled((prev) => !prev)}
            title={magnifierEnabled ? 'Auto-Zoom Active (Hover to View)' : 'Auto-Zoom Disabled'}
            className={`inline-flex items-center gap-1 px-1.5 h-6 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
              magnifierEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>{magnifierEnabled ? 'Auto-Zoom' : 'Zoom Off'}</span>
          </button>
        </div>
      </div>

      {/* 2. Viewport Area wrapped with ProformaInvoiceHoverMagnifier */}
      <ProformaInvoiceHoverMagnifier data={data} disabled={!magnifierEnabled} className="w-full">
        <div
          ref={cardViewportRef}
          {...panProps}
          className={`w-full p-2 sm:p-3 overflow-auto bg-slate-200/90 shadow-inner flex flex-col items-center justify-start min-h-[620px] max-h-[880px] relative ${cursorClass}`}
          style={{
            ...panProps.style,
          }}
        >
          {/* Scaled Footprint (+10% dimensions: 704 x 980 px) */}
          <div
            style={{
              width: `${Math.round(704 * zoom)}px`,
              height: `${Math.round(980 * zoom)}px`,
              position: 'relative',
              margin: 'auto',
              flexShrink: 0,
              transition: isDragging ? 'none' : 'width 0.15s ease-out, height 0.15s ease-out',
            }}
          >
            {/* Zoom Stage: Clean A4 Sheet */}
            <div
              style={{
                width: '704px',
                height: '980px',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              className="bg-white rounded-xs shadow-xl p-6 flex flex-col justify-between font-sans text-black select-text"
            >
              {/* The Master Document Container for 300 DPI PDF & Print */}
              <div
                id="proforma-invoice-a4-document"
                className="w-full h-full border-2 border-black flex flex-col justify-between relative bg-white text-black font-sans text-[10.5px] leading-tight"
              >
                {/* 1. TOP HEADER: PROFORMA INVOICE (Full Width Merged) */}
                <div className="border-b-2 border-black py-1.5 text-center bg-slate-50/40">
                  <h1 className="font-sans font-black text-sm tracking-wider uppercase text-black">
                    PROFORMA INVOICE
                  </h1>
                </div>

                {/* 2. BLOCK 1: CONSIGNOR (Left 50%) & DATE / INVOICE / KYC (Right 50%) */}
                {/* Full-width horizontal divider line at bottom of Consignor section */}
                <div className="grid grid-cols-2 border-b-2 border-black">
                  {/* Left Column: CONSIGNOR */}
                  <div className="border-r-2 border-black p-2 min-h-[105px] space-y-0.5">
                    <div className="font-bold underline uppercase tracking-wide text-[12.5px] mb-1">
                      CONSIGNOR
                    </div>
                    <div className="font-bold text-[10px]">
                      {formatNameWithTitle(data.consignorTitle, data.consignorName) || '_____________________________________'}
                    </div>
                    {formatRelationshipDisplay(data.consignorRelationshipType, data.consignorRelationshipName) && (
                      <div className="font-semibold text-[9px] text-slate-900 leading-tight">
                        {formatRelationshipDisplay(data.consignorRelationshipType, data.consignorRelationshipName)}
                      </div>
                    )}
                    <div className="text-[9px] text-slate-800">
                      {[
                        data.consignorAddress,
                        data.consignorCity,
                        data.consignorState,
                        data.consignorPincode,
                        data.consignorCountry,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Address, City, State, PIN, Country'}
                    </div>
                    {(data.consignorContact || data.consignorCountryCode) && (
                      <div className="text-[9px] text-slate-700">
                        <span className="font-bold">Contact:</span>{' '}
                        {data.consignorContact
                          ? `${data.consignorCountryCode && !data.consignorContact.startsWith('+') ? `${data.consignorCountryCode} ` : ''}${data.consignorContact}`
                          : data.consignorCountryCode || ''}
                      </div>
                    )}
                    <div className="text-[9.5px] font-bold pt-0.5">
                      E - Mail ID: <span className="font-normal">{data.consignorEmail || '_________________________'}</span>
                    </div>
                  </div>

                  {/* Right Column: Date, Invoice No, KYC Details */}
                  <div className="flex flex-col justify-between">
                    <div>
                      {/* Date Row */}
                      <div className="grid grid-cols-2 border-b border-black">
                        <div className="p-1.5 border-r border-black font-bold text-[11.5px]">
                          <span>Date : </span>
                          <span className="font-mono font-normal text-black text-[9.5px]">{data.invoiceDate || '29.03.2025'}</span>
                        </div>
                        <div className="p-1.5" />
                      </div>

                      {/* Invoice No Row */}
                      <div className="p-1.5 border-b border-black font-bold text-[11.5px]">
                        <span>invoice no: </span>
                        <span className="font-mono font-normal text-black text-[9.5px]">{data.invoiceNumber || '1516'}</span>
                      </div>

                      {/* Blank spacing box - horizontal line above KYC DETAILS removed */}
                      <div className="min-h-[14px]" />
                    </div>

                    {/* KYC DETAILS */}
                    <div className="p-2 text-center space-y-0.5">
                      <div className="font-bold text-[12.5px] uppercase tracking-wide">
                        KYC DETAILS
                      </div>
                      <div className="font-bold underline uppercase text-[11.5px]">
                        {data.kycType || 'AADHAR NO'}
                      </div>
                      <div className="font-mono font-bold tracking-wider text-[9.8px] pt-0.5">
                        {data.kycMasked && data.kycNumber
                          ? data.kycNumber.replace(/\d(?=\d{4})/g, '•')
                          : data.kycNumber || '6566 1068 9680'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. BLOCK 2: CONSIGNEE (Left 50%) & COUNTRY OF ORIGIN / DESTINATION (Right 50%) */}
                {/* Full-width horizontal divider line at bottom of Consignee section */}
                <div className="grid grid-cols-2 border-b-2 border-black">
                  {/* Left Column: CONSIGNEE */}
                  <div className="border-r-2 border-black p-2 min-h-[105px] space-y-0.5">
                    <div className="font-bold underline uppercase tracking-wide text-[12.5px] mb-1">
                      CONSIGNEE
                    </div>
                    <div className="font-bold text-[10px]">
                      {formatNameWithTitle(data.consigneeTitle, data.consigneeName) || '_____________________________________'}
                    </div>
                    {formatRelationshipDisplay(data.consigneeRelationshipType, data.consigneeRelationshipName) && (
                      <div className="font-semibold text-[9px] text-slate-900 leading-tight">
                        {formatRelationshipDisplay(data.consigneeRelationshipType, data.consigneeRelationshipName)}
                      </div>
                    )}
                    <div className="text-[9px] text-slate-800">
                      {[
                        data.consigneeAddress,
                        data.consigneeCity,
                        data.consigneeState,
                        data.consigneePincode,
                        data.consigneeCountry,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Address, City, State, PIN, Country'}
                    </div>
                    {(data.consigneeContact || data.consigneeCountryCode) && (
                      <div className="text-[9px] text-slate-700">
                        <span className="font-bold">Contact:</span>{' '}
                        {data.consigneeContact
                          ? `${data.consigneeCountryCode && !data.consigneeContact.startsWith('+') ? `${data.consigneeCountryCode} ` : ''}${data.consigneeContact}`
                          : data.consigneeCountryCode || ''}
                      </div>
                    )}
                    {data.consigneeEmail && (
                      <div className="text-[9.5px] font-bold">
                        <span>Email: </span><span className="font-normal">{data.consigneeEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Country of Origin & Country of Final Destination */}
                  <div className="flex flex-col justify-end">
                    {/* Sub-row 1: Labels */}
                    <div className="grid grid-cols-2 border-t border-b border-black text-center">
                      <div className="p-1 border-r border-black font-bold underline text-[11px]">
                        Country of Origin of Goods
                      </div>
                      <div className="p-1 font-bold underline text-[11px]">
                        Country of Final Destination
                      </div>
                    </div>
                    {/* Sub-row 2: Values beneath the horizontal divider line */}
                    <div className="grid grid-cols-2 text-center font-normal text-[9.5px] text-black">
                      <div className="p-1 border-r border-black min-h-[24px] flex items-center justify-center">
                        {data.countryOfOrigin || 'India'}
                      </div>
                      <div className="p-1 min-h-[24px] flex items-center justify-center">
                        {data.countryOfFinalDestination || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. BLOCK 3: SHIPMENT 3x2 MINI-TABLE (Left 50%) & RIGHT REMARKS (Right 50%) */}
                {/* All 6 transport & destination values centered horizontally and vertically */}
                <div className="grid grid-cols-2 border-b-2 border-black text-[9px]">
                  {/* Left Column: 3x2 Table */}
                  <div className="border-r-2 border-black grid grid-cols-2">
                    <div className="p-1 border-b border-r border-black font-semibold text-left">
                      <div className="font-bold underline text-left text-[10.5px]">Pre Carriage by</div>
                      <div className="text-black font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[8.5px]">{data.preCarriageBy || '-'}</div>
                    </div>
                    <div className="p-1 border-b border-black font-semibold text-left">
                      <div className="font-bold underline text-left text-[10.5px]">Place of Receipt by Pre-carrier</div>
                      <div className="text-black font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[8.5px]">{data.placeOfReceiptByPreCarrier || '-'}</div>
                    </div>

                    <div className="p-1 border-b border-r border-black font-semibold text-left">
                      <div className="font-bold underline text-left text-[10.5px]">Vessel/Flight No</div>
                      <div className="text-black font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[8.5px]">{data.vesselFlightNo || '-'}</div>
                    </div>
                    <div className="p-1 border-b border-black font-semibold text-left">
                      <div className="font-bold underline text-left text-[10.5px]">Port of Loading</div>
                      <div className="text-black font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[8.5px]">{data.portOfLoading || '-'}</div>
                    </div>

                    <div className="p-1 border-r border-black font-semibold text-left">
                      <div className="font-bold underline text-left text-[10.5px]">Port of Discharge</div>
                      <div className="text-black font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[8.5px]">{data.portOfDischarge || '-'}</div>
                    </div>
                    <div className="p-1 font-semibold text-left">
                      <div className="font-bold underline text-left text-[10.5px]">Final Destination</div>
                      <div className="text-black font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[8.5px]">{data.finalDestination || '-'}</div>
                    </div>
                  </div>

                  {/* Right Column: Space matching template */}
                  <div className="p-1.5 flex items-center justify-center text-[9px] text-slate-400 italic">
                    <span>(Export shipping terms &amp; package marks)</span>
                  </div>
                </div>

                {/* 5. BLOCK 4: GOODS DESCRIPTION TABLE (Exact Columns, Row Height -20%, Entries -10-15%) */}
                <div className="w-full border-b-2 border-black">
                  <table className="w-full border-collapse text-left text-[7px]">
                    <thead>
                      <tr className="border-b-2 border-black font-bold text-center text-[9.2px] bg-[#F1F5F9]">
                        <th className="w-12 border-r border-black py-1 px-1 text-center">S.NO</th>
                        <th className="border-r border-black py-1 px-2 text-center">
                          DISCRIPTION OF GOODS
                        </th>
                        <th className="w-24 border-r border-black py-1 px-1 text-center">
                          HSN CODE
                        </th>
                        <th className="w-16 border-r border-black py-1 px-1 text-center">QTY</th>
                        <th className="w-18 border-r border-black py-1 px-1 text-center">RATE</th>
                        <th className="w-24 py-1 px-1 text-center">VALUE INR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row, idx) => (
                        <tr key={idx} className="border-b border-black last:border-b-0 h-[14px]">
                          <td className="border-r border-black text-center font-semibold py-0.5">
                            {row.sNo}
                          </td>
                          <td className="border-r border-black px-2 py-0.5 font-medium break-words">
                            {row.description || ''}
                          </td>
                          <td className="border-r border-black px-1 text-center font-mono py-0.5">
                            {row.hsnCode || ''}
                          </td>
                          <td className="border-r border-black px-1 text-center font-mono font-semibold py-0.5">
                            {row.quantity !== '' ? row.quantity : ''}
                          </td>
                          <td className="border-r border-black px-1 text-right font-mono font-semibold py-0.5">
                            {row.rate !== '' ? row.rate : ''}
                          </td>
                          <td className="px-1 text-right font-mono font-bold py-0.5">
                            {row.valueInr ? row.valueInr.toLocaleString('en-IN') : ''}
                          </td>
                        </tr>
                      ))}
                      {/* TOTAL VALUE ROW (Repositioned text towards right, closer to amount column) */}
                      <tr className="border-t-2 border-black font-bold h-5">
                        <td colSpan={5} className="border-r border-black pr-4 pl-2 text-right tracking-wider font-bold text-[10px]">
                          TOTAL VALUE:
                        </td>
                        <td className="px-1.5 text-right font-mono font-black text-[9.5px]">
                          {data.totalValue ? data.totalValue.toLocaleString('en-IN') : '0'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 6. BLOCK 5: VALUE IN WORDS (Full Width Row) */}
                <div className="border-b-2 border-black p-1.5 font-bold text-[10.5px] uppercase tracking-wide">
                  VALUE IN WORDS:{' '}
                  <span className="font-normal text-black text-[9px]">{data.valueInWords || 'ZERO ONLY'}</span>
                </div>

                {/* 7. BLOCK 6: DECLARATION (Left 50%) & SIGNATURE & DATE (Right 50%) */}
                <div className="grid grid-cols-2 min-h-[85px]">
                  {/* Left Column: Declaration Text */}
                  <div className="p-2 border-r-2 border-black space-y-1 text-[9.5px]">
                    <div className="font-bold underline text-[11.5px]">Declaration :</div>
                    <p className="leading-relaxed text-black">
                      {data.declarationText ||
                        'We declare that invoice shows the actual price of goods described and that all particulars are true and correct.'}
                    </p>
                  </div>

                  {/* Right Column: Signature & Date (Centered, +10% Enlarged) */}
                  <div className="p-2 flex flex-col justify-between items-center text-center">
                    <div
                      onClick={onSignatureClick}
                      className={`w-48 h-[54px] flex flex-col items-center justify-center border-b border-black/40 mb-1 mx-auto ${
                        onSignatureClick ? 'cursor-pointer hover:bg-slate-100/60 rounded-xs transition-colors' : ''
                      }`}
                      title={onSignatureClick ? 'Click to open Digital Signature Whiteboard' : undefined}
                    >
                      {data.signatureBase64 && data.signatureBase64.startsWith('data:image') ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={data.signatureBase64}
                            alt="Signature"
                            className="max-h-full max-w-full object-contain pointer-events-none mx-auto"
                          />
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">
                          [Click to Sign]
                        </span>
                      )}
                    </div>
                    <div className="font-bold uppercase text-[11.5px] tracking-wide text-black flex items-center justify-center gap-1.5 text-center w-full">
                      <span>SIGNATURE &amp; DATE</span>
                      {data.signatureDate && (
                        <span className="font-mono text-[9px] text-slate-700">({data.signatureDate})</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProformaInvoiceHoverMagnifier>

      {/* 3. Action Buttons Footer Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => printProformaInvoiceDocument(data as ProformaInvoiceInput)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => downloadProformaInvoicePdf(data as ProformaInvoiceInput)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download A4 PDF</span>
          </button>
        </div>

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#0F4C3A] hover:bg-[#155d47] text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Proforma Invoice'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

