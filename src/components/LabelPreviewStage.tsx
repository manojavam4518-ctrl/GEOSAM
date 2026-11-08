'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import LabelPreviewZoomToolbar from './LabelPreviewZoomToolbar';
import LabelHoverMagnifier from './LabelHoverMagnifier';
import FullScreenLabelPreviewModal from './FullScreenLabelPreviewModal';
import { useDragToPan } from '@/hooks/useDragToPan';

export interface LabelPreviewStageProps {
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  targetWidthPx?: number; // e.g. 384 for 4x6, 794 for A4
  targetHeightPx?: number; // e.g. 576 for 4x6, 1123 for A4
  title?: string;
  badge?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
  compactHeader?: boolean;
  darkHeader?: boolean;
  magnifierEnabled?: boolean;
  onToggleMagnifier?: () => void;
}

export default function LabelPreviewStage({
  zoom,
  onZoomChange,
  targetWidthPx = 384,
  targetHeightPx,
  title = 'LIVE LABEL PREVIEW',
  badge,
  headerExtra,
  children,
  minHeight = 'min-h-[420px]',
  maxHeight = 'max-h-[720px]',
  className = '',
  compactHeader = false,
  darkHeader = false,
  magnifierEnabled,
  onToggleMagnifier,
}: LabelPreviewStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(targetHeightPx || 576);
  const [internalMagnifierActive, setInternalMagnifierActive] = useState<boolean>(true);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

  // Click-and-drag hand tool hook with mouse-wheel zoom
  const { panProps, cursorClass, isDragging } = useDragToPan({
    externalRef: viewportRef,
    zoom,
    onZoomChange,
    minZoom: 0.4,
    maxZoom: 2.5,
    enableWheelZoom: true,
  });

  const isMagnifierActive = magnifierEnabled !== undefined ? magnifierEnabled : internalMagnifierActive;
  const handleToggleMagnifier = onToggleMagnifier || (() => setInternalMagnifierActive((prev) => !prev));

  // Monitor natural content height changes to guarantee proper scroll boundaries when scaled
  useEffect(() => {
    if (!contentRef.current) return;

    const measureHeight = () => {
      if (contentRef.current) {
        const height = contentRef.current.offsetHeight;
        if (height > 0) {
          setContentHeight(height);
        }
      }
    };

    measureHeight();
    const ro = new ResizeObserver(measureHeight);
    ro.observe(contentRef.current);

    return () => {
      ro.disconnect();
    };
  }, [children, targetWidthPx]);

  // Fit to Preview: calculates optimal zoom to fit available viewport width and height
  const handleFitToPreview = useCallback(() => {
    if (!viewportRef.current) return;
    const paddingX = 40; // 20px padding each side
    const paddingY = 40; // 20px padding top/bottom
    const availW = Math.max(160, viewportRef.current.clientWidth - paddingX);
    const availH = Math.max(200, viewportRef.current.clientHeight - paddingY);

    const natW = targetWidthPx || 384;
    const natH = contentHeight || targetHeightPx || 576;

    if (natW > 0 && natH > 0) {
      const scaleW = availW / natW;
      const scaleH = availH / natH;
      const fit = Math.min(scaleW, scaleH);
      // Clamp between 50% (0.50) and 200% (2.00) in steps of 0.05
      const clamped = Math.max(0.5, Math.min(2.0, Math.floor(fit * 20) / 20));
      onZoomChange(clamped);
    }
  }, [targetWidthPx, contentHeight, targetHeightPx, onZoomChange]);

  const handleResetZoom = useCallback(() => {
    onZoomChange(1.0);
  }, [onZoomChange]);

  // Visual scaled footprint dimensions for proper scrolling
  const scaledWidth = Math.round(targetWidthPx * zoom);
  const scaledHeight = Math.round(contentHeight * zoom);

  return (
    <div className={`w-full flex flex-col rounded-2xl border border-slate-300 overflow-hidden shadow-xs bg-white ${className}`}>
      {/* 1. Header with Title, Zoom Controls, Full-Screen Button, and Magnifier Toggle */}
      <div
        className={`px-3.5 sm:px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 ${
          darkHeader
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h3 className={`font-black text-xs uppercase tracking-wider truncate ${darkHeader ? 'text-white' : 'text-slate-800'}`}>
              {title}
            </h3>
          </div>
          {badge}
          {headerExtra}
        </div>

        {/* Zoom Controls Toolbar with Full-Screen and Lens Toggle */}
        <div className="shrink-0">
          <LabelPreviewZoomToolbar
            zoom={zoom}
            onZoomChange={onZoomChange}
            onFitToPreview={handleFitToPreview}
            onReset={handleResetZoom}
            onFullScreen={() => setIsFullScreenOpen(true)}
            compact={compactHeader}
            magnifierActive={isMagnifierActive}
            onToggleMagnifier={handleToggleMagnifier}
          />
        </div>
      </div>

      {/* 2. Scrollable Viewport Container with Hand Tool Drag-to-Pan */}
      <div
        ref={viewportRef}
        {...panProps}
        className={`w-full p-4 overflow-auto bg-slate-200/80 shadow-inner flex flex-col items-center justify-start ${minHeight} ${maxHeight} relative preview-viewport ${cursorClass}`}
        style={{
          ...panProps.style,
          scrollbarGutter: 'stable',
        }}
      >
        {/* Scaled Footprint Layout Wrapper:
            Provides the browser layout engine with the true visual bounding box of the scaled label,
            ensuring smooth centered alignment and full scrollability without clipping. */}
        <div
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            minWidth: `${scaledWidth}px`,
            minHeight: `${scaledHeight}px`,
            position: 'relative',
            margin: 'auto',
            flexShrink: 0,
            transition: isDragging ? 'none' : 'width 0.18s cubic-bezier(0.16, 1, 0.3, 1), height 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Zoom Stage:
              Applies CSS transform scale to the preview wrapper ONLY,
              leaving the actual label-generation DOM node strictly at 100% true physical size. */}
          <div
            style={{
              width: `${targetWidthPx}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
              transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div ref={contentRef} className="w-full flex flex-col items-center">
              <LabelHoverMagnifier
                zoom={zoom}
                disabled={!isMagnifierActive}
                viewportRef={viewportRef}
                onOpenFullScreen={() => setIsFullScreenOpen(true)}
                className="w-full flex flex-col items-center"
              >
                {children}
              </LabelHoverMagnifier>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Full-Screen Auto-Zoom Modal (Occupies 90-95% Viewport) */}
      <FullScreenLabelPreviewModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={title}
        badge={badge}
        targetWidthPx={targetWidthPx}
        targetHeightPx={contentHeight || targetHeightPx}
      >
        {children}
      </FullScreenLabelPreviewModal>
    </div>
  );
}
