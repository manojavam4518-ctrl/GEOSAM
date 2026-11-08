'use client';

import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Printer,
  Download,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { DeclarationInput, DeclarationRecord } from '@/lib/declarationDb';
import {
  downloadDeclarationPdf,
  printDeclarationDocument,
  generateGoodsDeclarationPrintHtml,
  isValidDeclarationSignature,
  SIGNATURE_REQUIRED_ERROR_MESSAGE,
} from '@/utils/declarationPdfExport';
import DeclarationHoverMagnifier from './DeclarationHoverMagnifier';
import { useDragToPan } from '@/hooks/useDragToPan';

export interface DeclarationLivePreviewCardProps {
  data: Partial<DeclarationInput & DeclarationRecord>;
  organizationName?: string;
  onSave?: () => void;
  isSaving?: boolean;
  className?: string;
  onSignatureClick?: () => void;
  onSignatureRequired?: () => void;
}

export default function DeclarationLivePreviewCard({
  data,
  organizationName = 'GEO TRANSIT',
  onSave,
  isSaving = false,
  className = '',
  onSignatureClick,
  onSignatureRequired,
}: DeclarationLivePreviewCardProps) {
  const [zoom, setZoom] = useState<number>(0.68); // comfortable preview zoom for A4 sheet
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
  const handleFitPreview = () => setZoom(0.68);

  // Generate shared A4 HTML matching DECLARATION_NOTE_NEW.docx exactly
  const documentHtml = generateGoodsDeclarationPrintHtml(data as any, {
    isInteractive: true,
  });

  const handlePrint = async () => {
    if (!isValidDeclarationSignature(data.signatureBase64)) {
      if (onSignatureRequired) {
        onSignatureRequired();
      } else if (onSignatureClick) {
        onSignatureClick();
      } else {
        alert(SIGNATURE_REQUIRED_ERROR_MESSAGE);
      }
      return;
    }
    try {
      await printDeclarationDocument(data as any);
    } catch (err: any) {
      console.error('Print declaration error:', err);
    }
  };

  const handleDownload = async () => {
    if (!isValidDeclarationSignature(data.signatureBase64)) {
      if (onSignatureRequired) {
        onSignatureRequired();
      } else if (onSignatureClick) {
        onSignatureClick();
      } else {
        alert(SIGNATURE_REQUIRED_ERROR_MESSAGE);
      }
      return;
    }
    try {
      await downloadDeclarationPdf(data as any);
    } catch (err: any) {
      console.error('Download declaration error:', err);
    }
  };

  return (
    <div
      className={`w-full flex flex-col rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs ${className}`}
    >
      {/* Header Toolbar */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            LIVE DECLARATION NOTE PREVIEW
          </h3>
          <span className="text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700">
            A4 MASTER
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="inline-flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 select-none">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.4}
            title="Zoom Out (-10%)"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="px-1.5 min-w-[38px] text-center font-mono font-bold text-[10px] text-slate-200">
            {Math.round(zoom * 100)}%
          </span>
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
            title={magnifierEnabled ? 'Auto-Zoom Preview Active (Hover to View)' : 'Auto-Zoom Disabled'}
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

      {/* Viewport Area wrapped with DeclarationHoverMagnifier */}
      <DeclarationHoverMagnifier
        data={data}
        disabled={!magnifierEnabled}
        className="w-full"
        onSignatureRequired={onSignatureRequired || onSignatureClick}
      >
        <div
          ref={cardViewportRef}
          {...panProps}
          className={`w-full p-4 overflow-auto bg-slate-200/90 shadow-inner flex flex-col items-center justify-start min-h-[580px] max-h-[760px] relative ${cursorClass}`}
          style={{
            ...panProps.style,
          }}
        >
          {/* Scaled Footprint */}
          <div
            style={{
              width: `${Math.round(794 * zoom)}px`,
              height: `${Math.round(1123 * zoom)}px`,
              position: 'relative',
              margin: 'auto',
              flexShrink: 0,
              transition: isDragging ? 'none' : 'width 0.15s ease-out, height 0.15s ease-out',
            }}
          >
            {/* Zoom Stage: Clean A4 Sheet */}
            <div
              style={{
                width: '794px',
                height: '1123px',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              className="bg-white rounded-xs shadow-xl select-text overflow-hidden"
            >
              {/* Single Shared Document Container */}
              <div
                id="goods-declaration-note-a4-document"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-signature-trigger]') && onSignatureClick) {
                    onSignatureClick();
                  }
                }}
                dangerouslySetInnerHTML={{ __html: documentHtml }}
              />
            </div>
          </div>
        </div>
      </DeclarationHoverMagnifier>

      {/* Action Footer Buttons */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            Print Note
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
              isValidDeclarationSignature(data.signatureBase64)
                ? 'text-white bg-slate-900 hover:bg-slate-800'
                : 'text-amber-200 bg-slate-900 hover:bg-slate-800 border border-amber-500/50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Download A4 PDF
          </button>
        </div>

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-[#0F4C3A] hover:bg-[#155d47] transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? 'Saving Declaration...' : 'Save & Record Declaration'}
          </button>
        )}
      </div>
    </div>
  );
}
