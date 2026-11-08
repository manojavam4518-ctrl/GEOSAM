'use client';

import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  FileText,
  Printer,
  Download,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { PersonalDeclarationInput, PersonalDeclarationRecord } from '@/lib/personalDeclarationDb';
import {
  downloadPersonalDeclarationPdf,
  printPersonalDeclarationDocument,
  isValidPersonalDeclarationSignature,
  PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE,
  generatePersonalDeclarationHtml,
} from '@/utils/personalDeclarationPdfExport';
import PersonalDeclarationHoverMagnifier from './PersonalDeclarationHoverMagnifier';
import { useDragToPan } from '@/hooks/useDragToPan';

export interface PersonalDeclarationLivePreviewCardProps {
  data: Partial<PersonalDeclarationInput & PersonalDeclarationRecord>;
  onSave?: () => void;
  onSignatureClick?: () => void;
  onSignatureRequired?: () => void;
  isSaving?: boolean;
  className?: string;
}

export default function PersonalDeclarationLivePreviewCard({
  data,
  onSave,
  onSignatureClick,
  onSignatureRequired,
  isSaving = false,
  className = '',
}: PersonalDeclarationLivePreviewCardProps) {
  const [zoom, setZoom] = useState<number>(0.72); // Comfortable preview zoom
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

  // Pagination height calculation
  const rawItems =
    data.items && data.items.length > 0
      ? data.items
      : Array.from({ length: 10 }, (_, i) => ({ sNo: i + 1, description: '', amount: '' }));

  const pageCount = rawItems.length > 15 ? Math.ceil((rawItems.length - 15) / 25) + 1 : 1;
  const sheetHeight = pageCount * 1123 + (pageCount - 1) * 24;

  const handlePrint = async () => {
    if (!isValidPersonalDeclarationSignature(data.signatureBase64)) {
      if (onSignatureRequired) {
        onSignatureRequired();
      } else if (onSignatureClick) {
        onSignatureClick();
      } else {
        alert(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
      }
      return;
    }
    try {
      await printPersonalDeclarationDocument(data as PersonalDeclarationInput);
    } catch (err: any) {
      console.error('Print personal declaration error:', err);
    }
  };

  const handleDownload = async () => {
    if (!isValidPersonalDeclarationSignature(data.signatureBase64)) {
      if (onSignatureRequired) {
        onSignatureRequired();
      } else if (onSignatureClick) {
        onSignatureClick();
      } else {
        alert(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
      }
      return;
    }
    try {
      await downloadPersonalDeclarationPdf(data as PersonalDeclarationInput);
    } catch (err: any) {
      console.error('Download personal declaration error:', err);
    }
  };

  const previewHtml = generatePersonalDeclarationHtml(data as PersonalDeclarationInput, {
    isInteractive: true,
  });

  return (
    <div
      id="personal-declaration-preview-card"
      className={`w-full flex flex-col rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs ${className}`}
    >
      {/* 1. Header Toolbar */}
      <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <h3 className="font-black text-xs uppercase tracking-wider text-white">
            LIVE A4 PREVIEW • PERSONAL GOODS NOTE
          </h3>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {Math.round(zoom * 100)}%
          </span>
          {pageCount > 1 && (
            <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {pageCount} Pages
            </span>
          )}
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
            className="px-2 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
          >
            100%
          </button>
          <button
            type="button"
            onClick={handleFitPreview}
            title="Fit to Preview Box"
            className="px-2 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
          >
            <Maximize2 className="w-2.5 h-2.5 mr-1 text-emerald-400" />
            Fit
          </button>
          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => setMagnifierEnabled(!magnifierEnabled)}
            title="Toggle Hover Inspection Magnifier"
            className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
              magnifierEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>{magnifierEnabled ? 'Auto-Zoom' : 'Zoom Off'}</span>
          </button>
        </div>
      </div>

      {/* 2. Viewport Area wrapped with PersonalDeclarationHoverMagnifier */}
      <PersonalDeclarationHoverMagnifier
        data={data}
        disabled={!magnifierEnabled}
        onSignatureRequired={onSignatureRequired}
        className="w-full"
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
              minHeight: `${Math.round(sheetHeight * zoom)}px`,
              height: `${Math.round(sheetHeight * zoom)}px`,
              position: 'relative',
              margin: 'auto',
              flexShrink: 0,
              transition: isDragging ? 'none' : 'width 0.15s ease-out, height 0.15s ease-out',
            }}
          >
            {/* Zoom Stage: Clean Master A4 Sheet */}
            <div
              id="personal-declaration-note-a4-document"
              style={{
                width: '794px',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              className="select-text shadow-2xl flex flex-col gap-6"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target && target.closest('#personal-signature-click-target')) {
                  if (onSignatureClick) {
                    onSignatureClick();
                  }
                }
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </PersonalDeclarationHoverMagnifier>

      {/* 3. Action Buttons Footer Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Note</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
              isValidPersonalDeclarationSignature(data.signatureBase64)
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-emerald-700 hover:bg-emerald-600'
            }`}
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
            <span>{isSaving ? 'Saving...' : 'Save Record'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
