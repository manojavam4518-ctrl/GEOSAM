'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
  Printer,
  Download,
  Move,
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
import { useDragToPan } from '@/hooks/useDragToPan';
import { AUTO_ZOOM_ACTIVATION_DELAY_MS, AUTO_ZOOM_EXIT_DELAY_MS } from '@/lib/autoZoomConfig';

export interface ProformaInvoiceHoverMagnifierProps {
  children: React.ReactNode;
  data: Partial<ProformaInvoiceInput & ProformaInvoiceRecord>;
  disabled?: boolean;
  className?: string;
}

export default function ProformaInvoiceHoverMagnifier({
  children,
  data,
  disabled = false,
  className = '',
}: ProformaInvoiceHoverMagnifierProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Timers and stable hover state tracking
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Zoom factor: default comfortable magnified view (1.15x)
  const [zoom, setZoom] = useState<number>(1.15);

  const { panProps, cursorClass, isDragging } = useDragToPan({
    externalRef: viewportRef,
    zoom,
    onZoomChange: setZoom,
    minZoom: 0.6,
    maxZoom: 2.2,
    enableWheelZoom: true,
  });

  const isDraggingRef = useRef<boolean>(false);
  isDraggingRef.current = isDragging;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleZoomIn = () => setZoom((prev) => Math.min(2.2, Math.round((prev + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.6, Math.round((prev - 0.15) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1.15);
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  };
  const handleFitPreview = () => {
    setZoom(0.85);
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  };

  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const deactivate = useCallback(() => {
    clearTimers();
    setIsActive(false);
  }, []);

  // Click outside listener to dismiss
  useEffect(() => {
    if (!isActive) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
      const targetNode = e.target as Node;
      if (
        cardRef.current &&
        !cardRef.current.contains(targetNode) &&
        containerRef.current &&
        !containerRef.current.contains(targetNode)
      ) {
        deactivate();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isActive, deactivate]);

  // Coordinate-based pointer detection (Zero Flickering)
  useEffect(() => {
    if (disabled) return;

    const handlePointerMove = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
      const clientX = e.clientX;
      const clientY = e.clientY;

      let inSource = false;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          inSource = true;
        }
      }

      let inPopup = false;
      if (cardRef.current && isActive) {
        const pRect = cardRef.current.getBoundingClientRect();
        if (
          clientX >= pRect.left &&
          clientX <= pRect.right &&
          clientY >= pRect.top &&
          clientY <= pRect.bottom
        ) {
          inPopup = true;
        }
      }

      if (inSource || inPopup) {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        if (!isActive && !openTimerRef.current) {
          // Exactly 1 second (1000 milliseconds) delay before auto-zoom magnifier activates
          openTimerRef.current = setTimeout(() => {
            setIsActive(true);
            openTimerRef.current = null;
          }, AUTO_ZOOM_ACTIVATION_DELAY_MS);
        }
      } else {
        if (openTimerRef.current) {
          clearTimeout(openTimerRef.current);
          openTimerRef.current = null;
        }
        if (isActive && !closeTimerRef.current) {
          closeTimerRef.current = setTimeout(() => {
            setIsActive(false);
            closeTimerRef.current = null;
          }, AUTO_ZOOM_EXIT_DELAY_MS);
        }
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      clearTimers();
    };
  }, [disabled, isActive]);

  // 6 rows minimum
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
    <>
      <div ref={containerRef} className={`relative inline-block ${className}`}>
        {children}
      </div>

      {mounted &&
        isActive &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-200"
            style={{ pointerEvents: 'auto' }}
          >
            <div
              ref={cardRef}
              className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Header Toolbar */}
              <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="font-black text-xs uppercase tracking-wider text-white">
                    Auto-Zoom Preview • Proforma Invoice
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.6}
                    title="Zoom Out (-15%)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 2.2}
                    title="Zoom In (+15%)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Reset Zoom (115%)"
                    className="px-2 h-7 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    115%
                  </button>
                  <button
                    type="button"
                    onClick={handleFitPreview}
                    title="Fit to Screen"
                    className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-xs font-bold text-emerald-400 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Fit
                  </button>
                  <div className="w-[1px] h-4 bg-slate-700 mx-1" />
                  <button
                    type="button"
                    onClick={() => printProformaInvoiceDocument(data as ProformaInvoiceInput)}
                    className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Print Document"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadProformaInvoicePdf(data as ProformaInvoiceInput)}
                    className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs"
                    title="Download A4 PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  <div className="w-[1px] h-4 bg-slate-700 mx-1" />
                  <button
                    type="button"
                    onClick={deactivate}
                    title="Close Preview (Esc)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewport with Draggable Panning */}
              <div
                ref={viewportRef}
                {...panProps}
                className={`w-full flex-grow p-4 sm:p-6 overflow-auto bg-slate-200/90 shadow-inner flex flex-col items-center justify-start select-text relative ${cursorClass}`}
                style={{
                  ...panProps.style,
                  maxHeight: 'calc(92vh - 90px)',
                }}
              >
                <div
                  style={{
                    width: `${Math.round(680 * zoom)}px`,
                    height: `${Math.round(920 * zoom)}px`,
                    position: 'relative',
                    margin: 'auto',
                    flexShrink: 0,
                    transition: isDragging ? 'none' : 'width 0.15s ease-out, height 0.15s ease-out',
                  }}
                >
                  <div
                    style={{
                      width: '680px',
                      height: '920px',
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                    className="bg-white rounded-xs shadow-xl p-5 flex flex-col justify-between font-sans text-black"
                  >
                    {/* Exact Recreated Reference Template */}
                    <div className="w-full h-full border-2 border-black flex flex-col text-[11px] leading-tight text-black">
                      {/* 1. Header: PROFORMA INVOICE */}
                      <div className="border-b-2 border-black py-1.5 text-center bg-slate-50/50">
                        <h1 className="font-sans font-black text-base tracking-wider uppercase">
                          PROFORMA INVOICE
                        </h1>
                      </div>

                      {/* 2. Block 1: Consignor (Left 50%) & Date/KYC (Right 50%) */}
                      {/* Full-width horizontal divider line at bottom of Consignor section */}
                      <div className="grid grid-cols-2 border-b-2 border-black">
                        {/* Left Half: Consignor */}
                        <div className="border-r-2 border-black p-2 min-h-[110px] space-y-0.5">
                          <div className="font-bold underline uppercase tracking-wide text-[12.5px] mb-1">
                            CONSIGNOR
                          </div>
                          <div className="font-bold text-[10.5px]">
                            {formatNameWithTitle(data.consignorTitle, data.consignorName) || '_____________________________________'}
                          </div>
                          {formatRelationshipDisplay(data.consignorRelationshipType, data.consignorRelationshipName) && (
                            <div className="font-semibold text-[9.5px] text-slate-900 leading-tight">
                              {formatRelationshipDisplay(data.consignorRelationshipType, data.consignorRelationshipName)}
                            </div>
                          )}
                          <div className="text-[9.5px] text-slate-800">
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
                          {data.consignorContact && (
                            <div className="text-[9.5px] text-slate-700">
                              <span className="font-bold">Contact:</span> {data.consignorContact}
                            </div>
                          )}
                          <div className="text-[10px] font-bold pt-1">
                            E - Mail ID: <span className="font-normal">{data.consignorEmail || '_________________________'}</span>
                          </div>
                        </div>

                        {/* Right Half: Date, Invoice No, KYC Details */}
                        <div className="flex flex-col justify-between">
                          <div>
                            {/* Date & Invoice No */}
                            <div className="grid grid-cols-2 border-b border-black">
                              <div className="p-1.5 border-r border-black font-bold text-[12px]">
                                <span>Date : </span>
                                <span className="font-mono font-normal text-[10px]">{data.invoiceDate || '29.03.2025'}</span>
                              </div>
                              <div className="p-1.5" />
                            </div>

                            <div className="p-1.5 border-b border-black font-bold text-[12px]">
                              <span>invoice no: </span>
                              <span className="font-mono font-normal text-slate-900 text-[10px]">{data.invoiceNumber || '1516'}</span>
                            </div>

                            {/* Blank spacing - horizontal line above KYC DETAILS removed */}
                            <div className="min-h-[16px]" />
                          </div>

                          {/* KYC DETAILS */}
                          <div className="p-2 text-center space-y-0.5">
                            <div className="font-bold text-[13.5px] uppercase tracking-wide">
                              KYC DETAILS
                            </div>
                            <div className="font-bold underline uppercase text-[12px]">
                              {data.kycType || 'AADHAR NO'}
                            </div>
                            <div className="font-mono font-bold tracking-wider text-[10px] pt-0.5">
                              {data.kycMasked && data.kycNumber
                                ? data.kycNumber.replace(/\d(?=\d{4})/g, '•')
                                : data.kycNumber || '6566 1068 9680'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Block 2: Consignee (Left 50%) & Country (Right 50%) */}
                      {/* Full-width horizontal divider line at bottom of Consignee section */}
                      <div className="grid grid-cols-2 border-b-2 border-black">
                        {/* Left Half: Consignee */}
                        <div className="border-r-2 border-black p-2 min-h-[110px] space-y-0.5">
                          <div className="font-bold underline uppercase tracking-wide text-[12.5px] mb-1">
                            CONSIGNEE
                          </div>
                          <div className="font-bold text-[10.5px]">
                            {formatNameWithTitle(data.consigneeTitle, data.consigneeName) || '_____________________________________'}
                          </div>
                          {formatRelationshipDisplay(data.consigneeRelationshipType, data.consigneeRelationshipName) && (
                            <div className="font-semibold text-[9.5px] text-slate-900 leading-tight">
                              {formatRelationshipDisplay(data.consigneeRelationshipType, data.consigneeRelationshipName)}
                            </div>
                          )}
                          <div className="text-[9.5px] text-slate-800">
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
                            <div className="text-[9.5px] text-slate-700">
                              <span className="font-bold">Contact:</span>{' '}
                              {data.consigneeContact
                                ? `${data.consigneeCountryCode && !data.consigneeContact.startsWith('+') ? `${data.consigneeCountryCode} ` : ''}${data.consigneeContact}`
                                : data.consigneeCountryCode || ''}
                            </div>
                          )}
                          {data.consigneeEmail && (
                            <div className="text-[10px] font-bold">
                              <span>Email: </span><span className="font-normal">{data.consigneeEmail}</span>
                            </div>
                          )}
                        </div>

                        {/* Right Half: Country of Origin of Goods & Country of Final Destination */}
                        <div className="flex flex-col justify-end">
                          <div className="grid grid-cols-2 border-t border-b border-black text-center">
                            <div className="p-1 border-r border-black font-bold underline text-[11.5px]">
                              Country of Origin of Goods
                            </div>
                            <div className="p-1 font-bold underline text-[11.5px]">
                              Country of Final Destination
                            </div>
                          </div>
                          <div className="grid grid-cols-2 text-center font-normal text-[10px] text-slate-900">
                            <div className="p-1 border-r border-black min-h-[26px] flex items-center justify-center">
                              {data.countryOfOrigin || 'India'}
                            </div>
                            <div className="p-1 min-h-[26px] flex items-center justify-center">
                              {data.countryOfFinalDestination || '-'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. Block 3: Shipment 3x2 Grid (Left 50%) & Right Space */}
                      {/* All 6 transport & destination values centered horizontally and vertically */}
                      <div className="grid grid-cols-2 border-b-2 border-black">
                        {/* 3x2 Grid */}
                        <div className="border-r-2 border-black grid grid-cols-2 text-[9.5px]">
                          <div className="p-1.5 border-b border-r border-black font-semibold text-left">
                            <div className="font-bold underline text-left text-[11px]">Pre Carriage by</div>
                            <div className="text-slate-800 font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[9px]">{data.preCarriageBy || '-'}</div>
                          </div>
                          <div className="p-1.5 border-b border-black font-semibold text-left">
                            <div className="font-bold underline text-left text-[11px]">Place of Receipt by Pre-carrier</div>
                            <div className="text-slate-800 font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[9px]">{data.placeOfReceiptByPreCarrier || '-'}</div>
                          </div>

                          <div className="p-1.5 border-b border-r border-black font-semibold text-left">
                            <div className="font-bold underline text-left text-[11px]">Vessel/Flight No</div>
                            <div className="text-slate-800 font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[9px]">{data.vesselFlightNo || '-'}</div>
                          </div>
                          <div className="p-1.5 border-b border-black font-semibold text-left">
                            <div className="font-bold underline text-left text-[11px]">Port of Loading</div>
                            <div className="text-slate-800 font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[9px]">{data.portOfLoading || '-'}</div>
                          </div>

                          <div className="p-1.5 border-r border-black font-semibold text-left">
                            <div className="font-bold underline text-left text-[11px]">Port of Discharge</div>
                            <div className="text-slate-800 font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[9px]">{data.portOfDischarge || '-'}</div>
                          </div>
                          <div className="p-1.5 font-semibold text-left">
                            <div className="font-bold underline text-left text-[11px]">Final Destination</div>
                            <div className="text-slate-800 font-normal pt-0.5 text-center flex items-center justify-center min-h-[16px] text-[9px]">{data.finalDestination || '-'}</div>
                          </div>
                        </div>

                        {/* Right Space */}
                        <div className="p-2 flex items-center justify-center text-[9.5px] text-slate-400 italic">
                          <span>(Export shipping marks &amp; container details)</span>
                        </div>
                      </div>

                      {/* 5. Block 4: Goods Description Table (Exact Columns, Row Height -20%, Entries -10-15%) */}
                      <div className="w-full border-b-2 border-black">
                        <table className="w-full border-collapse text-left text-[7.5px]">
                          <thead>
                            <tr className="border-b-2 border-black font-bold text-center text-[10px] bg-[#F1F5F9]">
                              <th className="w-14 border-r border-black py-1 px-1 text-center">S.NO</th>
                              <th className="border-r border-black py-1 px-2 text-center">
                                DISCRIPTION OF GOODS
                              </th>
                              <th className="w-24 border-r border-black py-1 px-1.5 text-center">
                                HSN CODE
                              </th>
                              <th className="w-16 border-r border-black py-1 px-1 text-center">QTY</th>
                              <th className="w-16 border-r border-black py-1 px-1 text-center">RATE</th>
                              <th className="w-24 py-1 px-1.5 text-center">VALUE INR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((row, idx) => (
                              <tr key={idx} className="border-b border-black last:border-b-0 h-[16px]">
                                <td className="border-r border-black text-center font-semibold py-0.5">
                                  {row.sNo}
                                </td>
                                <td className="border-r border-black px-2 py-0.5 font-medium break-words">
                                  {row.description || ''}
                                </td>
                                <td className="border-r border-black px-1.5 text-center font-mono py-0.5">
                                  {row.hsnCode || ''}
                                </td>
                                <td className="border-r border-black px-1 text-center font-mono font-semibold py-0.5">
                                  {row.quantity !== '' ? row.quantity : ''}
                                </td>
                                <td className="border-r border-black px-1 text-right font-mono font-semibold py-0.5">
                                  {row.rate !== '' ? row.rate : ''}
                                </td>
                                <td className="px-1.5 text-right font-mono font-bold py-0.5">
                                  {row.valueInr ? row.valueInr.toLocaleString('en-IN') : ''}
                                </td>
                              </tr>
                            ))}
                            {/* TOTAL VALUE ROW (Repositioned text towards right, closer to amount column) */}
                            <tr className="border-t-2 border-black font-bold h-6">
                              <td colSpan={5} className="border-r border-black pr-4 pl-2 text-right tracking-wider font-bold text-[10.5px]">
                                TOTAL VALUE:
                              </td>
                              <td className="px-1.5 text-right font-mono font-black text-[10px]">
                                {data.totalValue ? data.totalValue.toLocaleString('en-IN') : '0'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 6. Block 5: Value in Words */}
                      <div className="border-b-2 border-black p-1.5 font-bold text-[11px] uppercase tracking-wide">
                        VALUE IN WORDS:{' '}
                        <span className="font-normal text-[9.5px]">{data.valueInWords || 'ZERO ONLY'}</span>
                      </div>

                      {/* 7. Block 6: Declaration (Left) & Signature (Right) */}
                      <div className="grid grid-cols-2 flex-grow min-h-[90px]">
                        {/* Declaration */}
                        <div className="p-2 border-r-2 border-black space-y-1 text-[10px]">
                          <div className="font-bold underline text-[12px]">Declaration :</div>
                          <p className="leading-relaxed">
                            {data.declarationText ||
                              'We declare that invoice shows the actual price of goods described and that all particulars are true and correct.'}
                          </p>
                        </div>

                        {/* Signature & Date (Centered, +10% Enlarged) */}
                        <div className="p-2 flex flex-col justify-between items-center text-center">
                          <div className="w-48 h-[54px] flex items-center justify-center relative mx-auto">
                            {data.signatureBase64 && data.signatureBase64.startsWith('data:image') ? (
                              <img
                                src={data.signatureBase64}
                                alt="Signature"
                                className="max-h-full max-w-full object-contain pointer-events-none mx-auto"
                              />
                            ) : null}
                          </div>
                          <div className="font-bold uppercase text-[12px] tracking-wide pt-1 flex items-center justify-center gap-1.5 text-center w-full">
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

              {/* Bottom Footer Bar */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-slate-600 font-bold shrink-0 gap-2">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <Move className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Hand Tool Active • <strong>Click and drag in all directions to pan document</strong>
                  </span>
                </span>
                <span className="text-emerald-700 font-bold font-mono text-[10px]">Stable Hover Active</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
