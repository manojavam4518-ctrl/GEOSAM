'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  X,
  Expand,
  Move,
} from 'lucide-react';
import { useDragToPan } from '@/hooks/useDragToPan';
import { AUTO_ZOOM_ACTIVATION_DELAY_MS, AUTO_ZOOM_EXIT_DELAY_MS } from '@/lib/autoZoomConfig';

export interface LabelHoverMagnifierProps {
  children: React.ReactNode;
  zoom?: number; // Current manual preview stage zoom level
  activationDelayMs?: number; // Exactly 1000ms (1 second) default
  disabled?: boolean;
  className?: string;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  onOpenFullScreen?: () => void;
}

export default function LabelHoverMagnifier({
  children,
  zoom = 1.0,
  activationDelayMs = AUTO_ZOOM_ACTIVATION_DELAY_MS,
  disabled = false,
  className = '',
  viewportRef,
  onOpenFullScreen,
}: LabelHoverMagnifierProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const inspectionViewportRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Timers and stable hover state tracking
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveredRef = useRef<boolean>(false);
  const activeTargetRef = useRef<HTMLElement | null>(null);

  const [mounted, setMounted] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const [fitScale, setFitScale] = useState<number>(1.0);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 384,
    height: 576,
  });

  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Helper to locate the actual label card under cursor
  const getTargetCard = useCallback((): HTMLElement | null => {
    if (!containerRef.current) return null;
    const card = containerRef.current.querySelector<HTMLElement>(
      '[id^="live-preview"], [id^="address-label"], [id^="user-label"], [id^="history-preview"], .label-card-target'
    );
    if (card) return card;
    return (containerRef.current.firstElementChild as HTMLElement) || containerRef.current;
  }, []);

  // Calculate fit scale and render content into mount
  const renderEnlargedContent = useCallback((targetEl: HTMLElement, currentZoom: number) => {
    if (!mountRef.current || !inspectionViewportRef.current) return;

    const targetW = targetEl.offsetWidth || 384;
    const targetH = targetEl.offsetHeight || 576;
    setNaturalDimensions({ width: targetW, height: targetH });

    const viewportRect = inspectionViewportRef.current.getBoundingClientRect();
    const availW = Math.max(300, viewportRect.width - 32);
    const availH = Math.max(360, viewportRect.height - 32);

    const calculatedFitScale = Math.min(availW / targetW, availH / targetH);
    setFitScale(calculatedFitScale);

    // Deep clone the label element for vector inspection
    const clone = targetEl.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';

    // Outer layout footprint spacer
    const scaledW = Math.round(targetW * currentZoom);
    const scaledH = Math.round(targetH * currentZoom);

    const footprint = document.createElement('div');
    footprint.style.width = `${scaledW}px`;
    footprint.style.height = `${scaledH}px`;
    footprint.style.position = 'relative';
    footprint.style.margin = 'auto';
    footprint.style.flexShrink = '0';
    footprint.style.transition = 'width 0.12s ease-out, height 0.12s ease-out';

    // Scaled element wrapper
    const wrapper = document.createElement('div');
    wrapper.style.width = `${targetW}px`;
    wrapper.style.height = `${targetH}px`;
    wrapper.style.transform = `scale(${currentZoom})`;
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.position = 'absolute';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.transition = 'transform 0.12s ease-out';

    wrapper.appendChild(clone);
    footprint.appendChild(wrapper);

    mountRef.current.replaceChildren(footprint);
  }, []);

  // Update scale dynamically for instant zoom button clicks
  const updateZoomScale = useCallback((newZoom: number) => {
    if (!mountRef.current) return;
    const footprint = mountRef.current.firstElementChild as HTMLElement | null;
    if (!footprint) return;

    const wrapper = footprint.firstElementChild as HTMLElement | null;
    if (!wrapper) return;

    const targetW = naturalDimensions.width;
    const targetH = naturalDimensions.height;
    const scaledW = Math.round(targetW * newZoom);
    const scaledH = Math.round(targetH * newZoom);

    footprint.style.width = `${scaledW}px`;
    footprint.style.height = `${scaledH}px`;
    wrapper.style.transform = `scale(${newZoom})`;
  }, [naturalDimensions]);

  // Handle smooth mouse-wheel zoom changes
  const handleWheelZoomChange = useCallback(
    (nextZoom: number) => {
      setPreviewZoom(nextZoom);
      updateZoomScale(nextZoom);
    },
    [updateZoomScale]
  );

  // Click-and-drag hand tool hook with mouse-wheel zoom
  const { panProps, cursorClass, isDragging } = useDragToPan({
    externalRef: inspectionViewportRef,
    disabled: !isActive,
    zoom: previewZoom,
    onZoomChange: handleWheelZoomChange,
    minZoom: 0.5,
    maxZoom: 3.0,
    enableWheelZoom: true,
  });

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Activate zoom popup
  const activateZoom = useCallback(() => {
    if (disabled || isActive) return;
    const targetEl = getTargetCard();
    if (!targetEl) return;

    activeTargetRef.current = targetEl;
    setIsActive(true);

    requestAnimationFrame(() => {
      if (!inspectionViewportRef.current) return;
      const targetW = targetEl.offsetWidth || 384;
      const targetH = targetEl.offsetHeight || 576;
      const rect = inspectionViewportRef.current.getBoundingClientRect();
      const availW = Math.max(300, rect.width - 32);
      const availH = Math.max(360, rect.height - 32);
      const initialFit = Math.min(availW / targetW, availH / targetH);

      const comfortableFit = Math.min(2.0, Math.max(0.6, Math.round(initialFit * 100) / 100));
      setFitScale(comfortableFit);
      setPreviewZoom(comfortableFit);
      renderEnlargedContent(targetEl, comfortableFit);
    });
  }, [disabled, isActive, getTargetCard, renderEnlargedContent]);

  // Deactivate zoom popup
  const deactivateZoom = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    isHoveredRef.current = false;
    activeTargetRef.current = null;
    setIsActive(false);
  }, []);

  // Re-synchronize content if live children update while active
  useEffect(() => {
    if (isActive && activeTargetRef.current) {
      renderEnlargedContent(activeTargetRef.current, previewZoom);
    }
  }, [children, isActive, renderEnlargedContent, previewZoom]);

  // Keyboard shortcut: Escape closes the enlarged hover preview
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        deactivateZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, deactivateZoom]);

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
        deactivateZoom();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isActive, deactivateZoom]);

  // =========================================================================
  // BULLETPROOF COORDINATE-BASED HOVER DETECTION (ZERO FLICKERING)
  // Uses global pointer tracking to guarantee the popup stays open 100% of the
  // time when stationary, without any backdrop or child elements stealing hover.
  // =========================================================================
  useEffect(() => {
    if (disabled) return;

    const handlePointerMove = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
      const clientX = e.clientX;
      const clientY = e.clientY;

      // 1. Check if pointer is inside source container or parent preview viewport
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

      if (!inSource && viewportRef?.current) {
        const vRect = viewportRef.current.getBoundingClientRect();
        if (
          clientX >= vRect.left &&
          clientX <= vRect.right &&
          clientY >= vRect.top &&
          clientY <= vRect.bottom
        ) {
          inSource = true;
        }
      }

      // 2. Check if pointer is inside the floating popup card
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
        isHoveredRef.current = true;
        // Cancel any pending close timer immediately
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }

        // If not active, trigger activation after strictly activationDelayMs
        if (!isActive && !openTimerRef.current) {
          openTimerRef.current = setTimeout(() => {
            if (isHoveredRef.current) {
              activateZoom();
            }
            openTimerRef.current = null;
          }, activationDelayMs);
        }
      } else {
        // Pointer has moved completely outside both the preview and popup card
        isHoveredRef.current = false;
        if (openTimerRef.current) {
          clearTimeout(openTimerRef.current);
          openTimerRef.current = null;
        }

        // Close after a stable buffer to allow smooth pointer transitions
        if (isActive && !closeTimerRef.current) {
          closeTimerRef.current = setTimeout(() => {
            if (!isHoveredRef.current) {
              deactivateZoom();
            }
            closeTimerRef.current = null;
          }, AUTO_ZOOM_EXIT_DELAY_MS);
        }
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [disabled, isActive, activateZoom, deactivateZoom, activationDelayMs, viewportRef]);

  // Zoom Toolbar Handlers
  const handleZoomIn = () => {
    setPreviewZoom((prev) => {
      const next = Math.min(3.0, Math.round((prev + 0.1) * 100) / 100);
      updateZoomScale(next);
      return next;
    });
  };

  const handleZoomOut = () => {
    setPreviewZoom((prev) => {
      const next = Math.max(0.5, Math.round((prev - 0.1) * 100) / 100);
      updateZoomScale(next);
      return next;
    });
  };

  const handleFitToScreen = () => {
    setPreviewZoom(fitScale);
    updateZoomScale(fitScale);
    if (inspectionViewportRef.current) {
      inspectionViewportRef.current.scrollLeft = 0;
      inspectionViewportRef.current.scrollTop = 0;
    }
  };

  const handleResetZoom = () => {
    setPreviewZoom(1.0);
    updateZoomScale(1.0);
    if (inspectionViewportRef.current) {
      inspectionViewportRef.current.scrollLeft = 0;
      inspectionViewportRef.current.scrollTop = 0;
    }
  };

  const percentage = Math.round(previewZoom * 100);

  return (
    <>
      {/* 1. Source Label Container */}
      <div
        ref={containerRef}
        onClick={() => {
          if (onOpenFullScreen) {
            deactivateZoom();
            onOpenFullScreen();
          }
        }}
        title="Hover to Auto-Zoom • Click for 95% Full Screen"
        className={`relative cursor-zoom-in ${className}`}
      >
        {children}
      </div>

      {/* 2. STABLE AUTO-ZOOM MAGNIFIER OVERLAY (ZERO FLICKERING) */}
      {mounted &&
        createPortal(
          <div
            className={`enlarged-preview-overlay fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 pointer-events-none transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            style={{
              visibility: isActive ? 'visible' : 'hidden',
            }}
            aria-hidden={!isActive}
          >
            {/* Non-interfering visual backdrop: Pointer events set to none so it NEVER steals hover */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] pointer-events-none" />

            {/* 50% VIEWPORT FLOATING PREVIEW CARD - STATIONARY & STABLE */}
            <div
              ref={cardRef}
              style={{
                width: 'min(54vw, 880px)',
                minWidth: 'min(94vw, 480px)',
                height: 'min(80vh, 900px)',
                minHeight: 'min(80vh, 520px)',
              }}
              className="enlarged-preview-card relative z-10 bg-white rounded-2xl shadow-2xl border-2 border-emerald-600 ring-4 ring-emerald-500/20 overflow-hidden flex flex-col pointer-events-auto animate-in zoom-in-95 duration-100"
            >
              {/* Header Toolbar with Controls */}
              <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none">
                {/* Title & Badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                    LIVE LABEL AUTO-ZOOM PREVIEW
                  </span>
                  <span className="hidden sm:inline-flex text-[10px] font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                    STABLE HOVER ACTIVE
                  </span>
                </div>

                {/* Top Interactive Controls Toolbar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Zoom Out Button */}
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={previewZoom <= 0.5}
                    title="Zoom Out (-10%)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  {/* Zoom Percentage */}
                  <span
                    className="px-1.5 min-w-[42px] text-center font-mono font-bold text-xs text-emerald-400 tabular-nums cursor-default"
                    title={`Current Zoom: ${percentage}%`}
                  >
                    {percentage}%
                  </span>

                  {/* Zoom In Button */}
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={previewZoom >= 3.0}
                    title="Zoom In (+10%)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                  {/* Fit to Screen */}
                  <button
                    type="button"
                    onClick={handleFitToScreen}
                    title="Fit Complete Label to Screen"
                    className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3 text-emerald-400" />
                    <span className="hidden sm:inline">Fit</span>
                  </button>

                  {/* Reset (100%) */}
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

                  {/* Full Screen (95%) Button */}
                  {onOpenFullScreen && (
                    <button
                      type="button"
                      onClick={() => {
                        deactivateZoom();
                        onOpenFullScreen();
                      }}
                      title="Open in 95% Full-Screen Window"
                      className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs hover:scale-102 active:scale-98"
                    >
                      <Expand className="w-3 h-3" />
                      <span className="hidden md:inline">Full Screen</span>
                    </button>
                  )}

                  {/* Close (×) Button */}
                  <button
                    type="button"
                    onClick={deactivateZoom}
                    title="Close Preview Window (Esc)"
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inspection Area with Hand Tool Drag-to-Pan */}
              <div
                ref={inspectionViewportRef}
                {...panProps}
                className={`flex-1 overflow-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center justify-start relative select-text ${cursorClass}`}
                style={{
                  ...panProps.style,
                  scrollbarGutter: 'stable',
                }}
              >
                {/* Dynamically Mounted Scaled Vector Content */}
                <div ref={mountRef} className="m-auto flex items-center justify-center" />
              </div>

              {/* Footer Bar */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-slate-600 font-bold shrink-0 gap-2">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <Move className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Hand Tool Active • <strong>Click and drag in all directions to pan label</strong>
                  </span>
                </span>

                <div className="flex items-center gap-3 text-slate-500 text-[10px] font-mono">
                  <span className="text-emerald-700 font-bold">Press Esc or click outside to dismiss</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
