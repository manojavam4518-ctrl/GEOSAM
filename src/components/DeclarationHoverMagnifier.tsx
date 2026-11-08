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
} from 'lucide-react';
import { DeclarationInput, DeclarationRecord } from '@/lib/declarationDb';
import {
  downloadDeclarationPdf,
  printDeclarationDocument,
  generateGoodsDeclarationPrintHtml,
  isValidDeclarationSignature,
  SIGNATURE_REQUIRED_ERROR_MESSAGE,
} from '@/utils/declarationPdfExport';
import { useDragToPan } from '@/hooks/useDragToPan';
import { AUTO_ZOOM_ACTIVATION_DELAY_MS, AUTO_ZOOM_EXIT_DELAY_MS } from '@/lib/autoZoomConfig';

export interface DeclarationHoverMagnifierProps {
  children: React.ReactNode;
  data: Partial<DeclarationInput & DeclarationRecord>;
  disabled?: boolean;
  className?: string;
  onSignatureRequired?: () => void;
}

export default function DeclarationHoverMagnifier({
  children,
  data,
  disabled = false,
  className = '',
  onSignatureRequired,
}: DeclarationHoverMagnifierProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Timers and stable hover state tracking
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseInSourceRef = useRef<boolean>(false);
  const isMouseInPopupRef = useRef<boolean>(false);

  const [mounted, setMounted] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [popupZoom, setPopupZoom] = useState<number>(1.0); // 1.0 = 100% true physical A4 scale

  // Click-and-drag hand tool hook with mouse-wheel zoom
  const isDraggingRef = useRef<boolean>(false);
  const { panProps, cursorClass, isDragging } = useDragToPan({
    externalRef: viewportRef,
    disabled: !isActive,
    zoom: popupZoom,
    onZoomChange: setPopupZoom,
    minZoom: 0.5,
    maxZoom: 2.0,
    enableWheelZoom: true,
  });

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Keyboard shortcut: Escape closes the enlarged hover preview
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        deactivate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  const activate = useCallback(() => {
    if (disabled) return;
    setIsActive(true);
  }, [disabled]);

  const deactivate = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    isMouseInSourceRef.current = false;
    isMouseInPopupRef.current = false;
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

      const inTargetArea = inSource || inPopup;

      if (inTargetArea) {
        isMouseInSourceRef.current = true;
        if (exitTimerRef.current) {
          clearTimeout(exitTimerRef.current);
          exitTimerRef.current = null;
        }

        if (!isActive && !hoverTimerRef.current) {
          hoverTimerRef.current = setTimeout(() => {
            if (isMouseInSourceRef.current) {
              activate();
            }
            hoverTimerRef.current = null;
          }, AUTO_ZOOM_ACTIVATION_DELAY_MS);
        }
      } else {
        isMouseInSourceRef.current = false;
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }

        if (isActive && !exitTimerRef.current) {
          exitTimerRef.current = setTimeout(() => {
            if (!isMouseInSourceRef.current) {
              deactivate();
            }
            exitTimerRef.current = null;
          }, AUTO_ZOOM_EXIT_DELAY_MS);
        }
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [disabled, isActive, activate, deactivate]);



  const handleZoomIn = () => setPopupZoom((prev) => Math.min(1.8, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setPopupZoom((prev) => Math.max(0.6, Math.round((prev - 0.1) * 10) / 10));
  const handleResetZoom = () => setPopupZoom(1.0);
  const handleFitZoom = () => setPopupZoom(0.85);

  const percentage = Math.round(popupZoom * 100);

  return (
    <>
      {/* 1. Normal Preview Trigger Area */}
      <div
        ref={containerRef}
        className={`relative ${className}`}
        title="Hover to Auto-Zoom A4 Declaration Note • Mouse Scroll to inspect details"
      >
        {children}
      </div>

      {/* 2. ENLARGED A4 AUTO-ZOOM PREVIEW OVERLAY (~750px x 900px on desktop) */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 pointer-events-none transition-opacity duration-200 ${
              isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              visibility: isActive ? 'visible' : 'hidden',
            }}
            aria-hidden={!isActive}
          >
            {/* Non-interfering visual backdrop: Pointer events set to none so it NEVER steals hover */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] pointer-events-none" />

            {/* A4 DECLARATION PREVIEW POPUP CARD (750-800px width, 880-940px height) */}
            <div
              ref={cardRef}
              style={{
                width: 'min(780px, 94vw)',
                height: 'min(920px, 92vh)',
              }}
              className="relative z-10 bg-white rounded-2xl shadow-2xl border-2 border-emerald-600 ring-4 ring-emerald-500/20 overflow-hidden flex flex-col pointer-events-auto animate-in zoom-in-95 duration-150"
            >
              {/* Top Header Toolbar */}
              <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                    GOODS DECLARATION NOTE • AUTO-ZOOM PREVIEW
                  </span>
                  <span className="hidden sm:inline-flex text-[10px] font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                    A4 MASTER • ENLARGED
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={popupZoom <= 0.6}
                    title="Zoom Out (-10%)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <span className="px-1.5 min-w-[42px] text-center font-mono font-bold text-xs text-emerald-400 tabular-nums cursor-default">
                    {percentage}%
                  </span>

                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={popupZoom >= 1.8}
                    title="Zoom In (+10%)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={handleFitZoom}
                    title="Fit to Screen"
                    className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3 text-emerald-400" />
                    <span className="hidden sm:inline">Fit</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Reset Zoom to 100%"
                    className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span className="hidden sm:inline">100%</span>
                  </button>

                  <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                  {/* Print & Download Quick Buttons */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!isValidDeclarationSignature(data.signatureBase64)) {
                        deactivate();
                        if (onSignatureRequired) {
                          onSignatureRequired();
                        } else {
                          alert(SIGNATURE_REQUIRED_ERROR_MESSAGE);
                          const sigElem = document.getElementById('consignor-signature-section');
                          if (sigElem) {
                            sigElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                        return;
                      }
                      await printDeclarationDocument(data as any);
                    }}
                    title="Print Declaration Note"
                    className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!isValidDeclarationSignature(data.signatureBase64)) {
                        deactivate();
                        if (onSignatureRequired) {
                          onSignatureRequired();
                        } else {
                          alert(SIGNATURE_REQUIRED_ERROR_MESSAGE);
                          const sigElem = document.getElementById('consignor-signature-section');
                          if (sigElem) {
                            sigElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                        return;
                      }
                      await downloadDeclarationPdf(data as any);
                    }}
                    title="Download A4 PDF"
                    className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">PDF</span>
                  </button>

                  {/* Close (×) Button */}
                  <button
                    type="button"
                    onClick={deactivate}
                    title="Close Preview Window (Esc)"
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Inspection Viewport with Hand Tool Drag-to-Pan */}
              <div
                ref={viewportRef}
                {...panProps}
                className={`flex-1 overflow-auto p-4 sm:p-8 bg-slate-200 flex flex-col items-center justify-start select-text ${cursorClass}`}
                style={{
                  ...panProps.style,
                  scrollbarGutter: 'stable',
                }}
              >
                {/* Scaled A4 Sheet Footprint */}
                <div
                  style={{
                    width: `${Math.round(794 * popupZoom)}px`,
                    height: `${Math.round(1123 * popupZoom)}px`,
                    position: 'relative',
                    margin: 'auto',
                    flexShrink: 0,
                    transition: isDragging ? 'none' : 'width 0.12s ease-out, height 0.12s ease-out',
                  }}
                >
                  {/* Scaled A4 Sheet Document */}
                  <div
                    style={{
                      width: '794px',
                      height: '1123px',
                      transform: `scale(${popupZoom})`,
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transition: 'transform 0.12s ease-out',
                    }}
                    className="bg-white rounded-xs shadow-2xl select-text border border-slate-300 overflow-hidden"
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateGoodsDeclarationPrintHtml(data as any),
                      }}
                    />
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

                <div className="flex items-center gap-3 text-slate-500 text-[10px] font-mono">
                  <span className="text-emerald-700 font-bold">Stable Hover Active</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

