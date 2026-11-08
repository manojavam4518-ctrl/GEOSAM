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
  FileText,
} from 'lucide-react';
import { PersonalDeclarationInput, PersonalDeclarationRecord } from '@/lib/personalDeclarationDb';
import {
  downloadPersonalDeclarationPdf,
  printPersonalDeclarationDocument,
  isValidPersonalDeclarationSignature,
  PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE,
  generatePersonalDeclarationHtml,
} from '@/utils/personalDeclarationPdfExport';
import { useDragToPan } from '@/hooks/useDragToPan';
import { AUTO_ZOOM_ACTIVATION_DELAY_MS, AUTO_ZOOM_EXIT_DELAY_MS } from '@/lib/autoZoomConfig';

export interface PersonalDeclarationHoverMagnifierProps {
  children: React.ReactNode;
  data: Partial<PersonalDeclarationInput & PersonalDeclarationRecord>;
  disabled?: boolean;
  className?: string;
  onSignatureRequired?: () => void;
}

export default function PersonalDeclarationHoverMagnifier({
  children,
  data,
  disabled = false,
  className = '',
  onSignatureRequired,
}: PersonalDeclarationHoverMagnifierProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Timers and stable hover state tracking
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseInSourceRef = useRef<boolean>(false);
  const cursorRatioYRef = useRef<number>(0);

  const [mounted, setMounted] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [popupZoom, setPopupZoom] = useState<number>(1.0); // 1.0 = 100% physical A4 scale

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
    requestAnimationFrame(() => {
      if (viewportRef.current) {
        const scrollableHeight = viewportRef.current.scrollHeight - viewportRef.current.clientHeight;
        if (scrollableHeight > 0) {
          viewportRef.current.scrollTop = scrollableHeight * cursorRatioYRef.current;
        }
      }
    });
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

  // Coordinate-based pointer detection (Zero Flickering & Persistent Hover)
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
          if (rect.height > 0) {
            cursorRatioYRef.current = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
          }
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

  // Zoom Toolbar handlers
  const handleZoomIn = () => setPopupZoom((prev) => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setPopupZoom((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
  const handleResetZoom = () => setPopupZoom(1.0);
  const handleFitScreen = () => {
    if (typeof window !== 'undefined') {
      const availWidth = window.innerWidth * 0.75;
      const fitZoom = Math.min(1.2, Math.max(0.6, availWidth / 820));
      setPopupZoom(Math.round(fitZoom * 10) / 10);
    }
  };

  const percentage = Math.round(popupZoom * 100);

  // Pagination calculation
  const rawItems =
    data.items && data.items.length > 0
      ? data.items
      : Array.from({ length: 10 }, (_, i) => ({ sNo: i + 1, description: '', amount: '' }));

  const pageCount = rawItems.length > 15 ? Math.ceil((rawItems.length - 15) / 25) + 1 : 1;
  const sheetHeight = pageCount * 1123 + (pageCount - 1) * 24;

  const previewHtml = generatePersonalDeclarationHtml(data as PersonalDeclarationInput, {
    isInteractive: false,
  });

  return (
    <>
      {/* Target Container */}
      <div
        ref={containerRef}
        className={`relative group ${className}`}
      >
        {children}
      </div>

      {/* Floating Inspection Popup via Portal */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 pointer-events-none transition-opacity duration-150 ${
              isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              visibility: isActive ? 'visible' : 'hidden',
            }}
            role="dialog"
            aria-modal="true"
            aria-hidden={!isActive}
            aria-label="Enlarged A4 Inspection Preview"
          >
            {/* Non-interfering visual backdrop: Pointer events set to none so it NEVER steals hover */}
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md pointer-events-none" />

            <div
              ref={cardRef}
              className="relative z-10 w-full max-w-5xl h-[92vh] max-h-[1050px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-150"
            >
              {/* Header Bar */}
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-white shrink-0 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-white tracking-wide truncate">
                      Personal Goods Declaration Note • Master A4 Inspector
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      100% Exact Print &amp; PDF Visual Parity • Standard A4 (210 × 297 mm)
                    </p>
                  </div>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    A4 PHYSICAL FORMAT
                  </span>
                  {pageCount > 1 && (
                    <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                      {pageCount} Pages
                    </span>
                  )}
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={popupZoom <= 0.5}
                    title="Zoom Out (-10%)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <span
                    className="px-1.5 min-w-[42px] text-center font-mono font-bold text-xs text-emerald-400 tabular-nums cursor-default"
                    title={`Current Zoom: ${percentage}%`}
                  >
                    {percentage}%
                  </span>

                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={popupZoom >= 2.0}
                    title="Zoom In (+10%)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Reset Zoom (100%)"
                    className="px-2 h-7 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    100%
                  </button>

                  <button
                    type="button"
                    onClick={handleFitScreen}
                    title="Fit to Screen"
                    className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3 text-emerald-400" />
                    <span>Fit</span>
                  </button>

                  <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={async () => {
                      if (!isValidPersonalDeclarationSignature(data.signatureBase64)) {
                        deactivate();
                        if (onSignatureRequired) {
                          onSignatureRequired();
                        } else {
                          alert(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
                          const sigElem = document.getElementById('personal-signature-section');
                          if (sigElem) {
                            sigElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                        return;
                      }
                      await printPersonalDeclarationDocument(data as PersonalDeclarationInput);
                    }}
                    title="Print Personal Declaration"
                    className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors cursor-pointer border border-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!isValidPersonalDeclarationSignature(data.signatureBase64)) {
                        deactivate();
                        if (onSignatureRequired) {
                          onSignatureRequired();
                        } else {
                          alert(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
                          const sigElem = document.getElementById('personal-signature-section');
                          if (sigElem) {
                            sigElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                        return;
                      }
                      await downloadPersonalDeclarationPdf(data as PersonalDeclarationInput);
                    }}
                    title="Download Official A4 PDF"
                    className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>

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
                    minHeight: `${Math.round(sheetHeight * popupZoom)}px`,
                    height: `${Math.round(sheetHeight * popupZoom)}px`,
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
                      transform: `scale(${popupZoom})`,
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                    }}
                    className="select-text shadow-2xl flex flex-col gap-6"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
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
                  <span>Mouse Wheel: Zoom</span>
                  <span>•</span>
                  <span>Esc: Close</span>
                  <span>•</span>
                  <span>Standard A4 Portrait</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
