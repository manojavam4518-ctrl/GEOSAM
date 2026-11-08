'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  X,
  CheckCircle2,
  Sparkles,
  Eye,
  Move,
} from 'lucide-react';
import { useDragToPan } from '@/hooks/useDragToPan';

export interface FullScreenLabelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetElement?: HTMLElement | null;
  children?: React.ReactNode;
  title?: string;
  badge?: React.ReactNode;
  targetWidthPx?: number;
  targetHeightPx?: number;
}

export default function FullScreenLabelPreviewModal({
  isOpen,
  onClose,
  targetElement,
  children,
  title = 'FULL-SCREEN SHIPPING LABEL PREVIEW',
  badge,
  targetWidthPx = 384,
  targetHeightPx = 576,
}: FullScreenLabelPreviewModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1.0);
  const [fitScale, setFitScale] = useState<number>(1.0);
  const [labelDimensions, setLabelDimensions] = useState<{ width: number; height: number }>({
    width: targetWidthPx,
    height: targetHeightPx,
  });

  // Click-and-drag hand tool hook with mouse-wheel zoom
  const { panProps, cursorClass, isDragging } = useDragToPan({
    externalRef: canvasRef,
    disabled: !isOpen,
    zoom: scale,
    onZoomChange: setScale,
    minZoom: 0.3,
    maxZoom: 3.0,
    enableWheelZoom: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Compute optimal Fit-to-Screen scale and mount cloned DOM content
  const calculateAndMount = useCallback(() => {
    if (!canvasRef.current || !mountRef.current) return;

    // Resolve source element: targetElement prop or querySelector from DOM
    let sourceEl = targetElement;
    if (!sourceEl && typeof document !== 'undefined') {
      sourceEl = document.querySelector<HTMLElement>(
        '[id^="live-preview"], [id^="address-label"], [id^="user-label"], [id^="history-preview"], .label-card-target'
      );
    }

    const actualW = sourceEl?.offsetWidth || targetWidthPx || 384;
    const actualH = sourceEl?.offsetHeight || targetHeightPx || 576;
    setLabelDimensions({ width: actualW, height: actualH });

    // Available canvas space inside the modal (90-95% viewport minus header and padding)
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const padX = 48; // 24px each side
    const padY = 48; // 24px top & bottom
    const availW = Math.max(240, canvasRect.width - padX);
    const availH = Math.max(300, canvasRect.height - padY);

    const scaleX = availW / actualW;
    const scaleY = availH / actualH;
    const computedFit = Math.min(scaleX, scaleY);
    const roundedFit = Math.round(computedFit * 100) / 100;

    setFitScale(roundedFit);
    setScale(roundedFit); // Default opening mode: Fit to Screen!

    if (sourceEl) {
      // Deep clone node with all IDs stripped to prevent collisions
      const clone = sourceEl.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      clone.style.margin = '0';
      clone.style.pointerEvents = 'none';

      mountRef.current.replaceChildren(clone);
    }
  }, [targetElement, targetWidthPx, targetHeightPx]);

  // Re-run measurement when modal opens
  useEffect(() => {
    if (!isOpen) return;
    // Brief delay to ensure modal DOM is laid out
    const timer = setTimeout(() => {
      calculateAndMount();
    }, 20);
    return () => clearTimeout(timer);
  }, [isOpen, calculateAndMount]);

  // ResizeObserver on canvas to keep fit scale updated
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const ro = new ResizeObserver(() => {
      if (canvasRef.current && labelDimensions.width > 0 && labelDimensions.height > 0) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const availW = Math.max(240, canvasRect.width - 48);
        const availH = Math.max(300, canvasRect.height - 48);
        const computedFit = Math.min(availW / labelDimensions.width, availH / labelDimensions.height);
        const roundedFit = Math.round(computedFit * 100) / 100;
        setFitScale(roundedFit);
      }
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [isOpen, labelDimensions]);

  // Zoom control handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(3.0, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.3, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleFitToScreen = () => {
    setScale(fitScale);
  };

  const handleActualSize = () => {
    setScale(1.0);
  };

  const percentage = Math.round(scale * 100);
  const scaledWidth = Math.round(labelDimensions.width * scale);
  const scaledHeight = Math.round(labelDimensions.height * scale);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150"
      aria-modal="true"
      role="dialog"
    >
      {/* 90-95% Viewport Full-Screen Modal Card */}
      <div className="w-[94vw] h-[92vh] max-w-[1560px] max-h-[960px] bg-white rounded-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* 1. Modal Header with Title & Zoom Controls */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Title and Badges */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <h3 className="font-black text-sm text-white uppercase tracking-wider truncate">
              {title}
            </h3>
            {badge && <div className="shrink-0">{badge}</div>}
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 hidden sm:inline shrink-0">
              {labelDimensions.width} × {labelDimensions.height} px
            </span>
          </div>

          {/* Controls Bar: Zoom In, Zoom Out, Fit to Screen, Actual Size, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls Pill */}
            <div className="inline-flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-2xs">
              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.3}
                title="Zoom Out (−15%)"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {/* Zoom Percentage Display */}
              <span
                className="px-2 min-w-[50px] text-center font-mono font-bold text-xs text-emerald-400 tabular-nums cursor-default"
                title={`Current Zoom: ${percentage}%`}
              >
                {percentage}%
              </span>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
                title="Zoom In (+15%)"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fit to Screen Button (Default Mode) */}
            <button
              type="button"
              onClick={handleFitToScreen}
              title="Fit to Screen (Display complete label)"
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                Math.abs(scale - fitScale) < 0.03
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fit to Screen</span>
            </button>

            {/* Actual Size (100%) Button */}
            <button
              type="button"
              onClick={handleActualSize}
              title="Actual Size (100% 1:1 true scale)"
              className={`inline-flex items-center gap-1 px-2.5 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                Math.abs(scale - 1.0) < 0.02
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>100%</span>
            </button>

            {/* Divider */}
            <div className="w-[1px] h-5 bg-slate-700 mx-0.5" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Full-Screen Preview (Esc)"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white border border-slate-700 hover:border-red-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Central Full-Screen Viewing Canvas with Hand Tool Drag-to-Pan */}
        <div
          ref={canvasRef}
          {...panProps}
          className={`flex-1 w-full h-full overflow-auto bg-slate-200/90 shadow-inner flex items-center justify-center p-4 sm:p-6 relative ${cursorClass}`}
          style={{
            ...panProps.style,
            scrollbarGutter: 'stable',
          }}
        >
          {/* Scaled Footprint Layout Spacer: Gives the browser layout engine the true visual bounding box */}
          <div
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              minWidth: `${scaledWidth}px`,
              minHeight: `${scaledHeight}px`,
              position: 'relative',
              margin: 'auto',
              flexShrink: 0,
              transition: isDragging ? 'none' : 'width 0.15s cubic-bezier(0.16, 1, 0.3, 1), height 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Scaled Content Wrapper */}
            <div
              style={{
                width: `${labelDimensions.width}px`,
                height: `${labelDimensions.height}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
                transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="flex flex-col items-center justify-center shadow-2xl rounded-2xl overflow-hidden bg-white border border-slate-300"
            >
              <div ref={mountRef} className="w-full h-full flex flex-col items-center">
                {/* Fallback to children if targetElement is not yet cloned */}
                {!targetElement && children}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Modal Footer Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-slate-600 font-bold shrink-0">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Complete Shipping Label Visible • All TO &amp; FROM Details, Barcodes &amp; QR Codes Rendered</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
            <span className="hidden md:inline-flex items-center gap-1 text-slate-600 font-sans font-bold">
              <Move className="w-3 h-3 text-emerald-600" />
              <span>Click &amp; Drag Hand Tool Active</span>
            </span>
            <span className="hidden md:inline">•</span>
            <span>Mode: {Math.abs(scale - fitScale) < 0.03 ? 'Fit to Screen' : `${percentage}%`}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Press Esc to exit</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

