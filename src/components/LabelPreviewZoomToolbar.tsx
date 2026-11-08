'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Search, Expand } from 'lucide-react';

export interface LabelPreviewZoomToolbarProps {
  zoom: number; // e.g. 1.0 = 100%
  onZoomChange: (newZoom: number) => void;
  onFitToPreview?: () => void;
  onReset?: () => void;
  onFullScreen?: () => void;
  minZoom?: number; // default 0.5 (50%)
  maxZoom?: number; // default 2.0 (200%)
  step?: number; // default 0.1 (10%)
  className?: string;
  compact?: boolean;
  magnifierActive?: boolean;
  onToggleMagnifier?: () => void;
}

export default function LabelPreviewZoomToolbar({
  zoom,
  onZoomChange,
  onFitToPreview,
  onReset,
  onFullScreen,
  minZoom = 0.5,
  maxZoom = 2.0,
  step = 0.1,
  className = '',
  compact = false,
  magnifierActive = true,
  onToggleMagnifier,
}: LabelPreviewZoomToolbarProps) {
  const percentage = Math.round(zoom * 100);

  const canZoomIn = zoom < maxZoom - 0.001;
  const canZoomOut = zoom > minZoom + 0.001;

  const handleZoomIn = () => {
    if (!canZoomIn) return;
    const next = Math.min(maxZoom, Math.round((zoom + step) * 100) / 100);
    onZoomChange(next);
  };

  const handleZoomOut = () => {
    if (!canZoomOut) return;
    const next = Math.max(minZoom, Math.round((zoom - step) * 100) / 100);
    onZoomChange(next);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onZoomChange(1.0);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl border border-slate-200 shadow-2xs select-none ${className}`}
      role="toolbar"
      aria-label="Label Preview Zoom Controls"
    >
      {/* Zoom Out Button */}
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out (-10%)"
        aria-label="Zoom Out"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      {/* Zoom Percentage Display */}
      <span
        className="px-1.5 min-w-[42px] text-center font-mono font-bold text-[11px] text-slate-800 tabular-nums cursor-default"
        title={`Current Zoom: ${percentage}%`}
      >
        {percentage}%
      </span>

      {/* Zoom In Button */}
      <button
        type="button"
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        title="Zoom In (+10%)"
        aria-label="Zoom In"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      {/* Divider */}
      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

      {/* Reset Zoom Button */}
      <button
        type="button"
        onClick={handleReset}
        disabled={Math.abs(zoom - 1.0) < 0.01}
        title="Reset Zoom to 100%"
        aria-label="Reset Zoom to 100%"
        className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3 h-3 text-slate-500" />
        <span className={compact ? 'hidden sm:inline' : ''}>Reset</span>
      </button>

      {/* Fit to Preview Button */}
      {onFitToPreview && (
        <button
          type="button"
          onClick={onFitToPreview}
          title="Fit Label to Preview Area"
          aria-label="Fit to Preview"
          className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold text-[#0F4C3A] hover:bg-emerald-50 hover:text-[#155d47] transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3 h-3 text-[#1E8262]" />
          <span className={compact ? 'hidden md:inline' : 'hidden sm:inline'}>Fit</span>
          <span className={compact ? 'hidden' : 'hidden md:inline'}> to Preview</span>
        </button>
      )}

      {/* Full-Screen Auto-Zoom Button */}
      {onFullScreen && (
        <button
          type="button"
          onClick={onFullScreen}
          title="Open Full-Screen Preview Window (95% Viewport)"
          aria-label="Full-Screen Preview"
          className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold text-slate-700 hover:text-[#0F4C3A] hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          <Expand className="w-3 h-3 text-[#1E8262]" />
          <span className={compact ? 'hidden lg:inline' : 'hidden sm:inline'}>Full Screen</span>
        </button>
      )}

      {/* Hover Magnifier Toggle Button */}
      {onToggleMagnifier && (
        <button
          type="button"
          onClick={onToggleMagnifier}
          title={
            magnifierActive
              ? 'Hover-to-Zoom Magnifier Active (50% Viewport + Scroll Wheel) - Click to Disable'
              : 'Hover-to-Zoom Magnifier Disabled - Click to Enable'
          }
          aria-label="Toggle Hover Magnifier"
          className={`inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            magnifierActive
              ? 'bg-emerald-100/80 text-[#0F4C3A] hover:bg-emerald-200/90 shadow-2xs'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Search className={`w-3 h-3 ${magnifierActive ? 'text-[#1E8262]' : 'text-slate-400'}`} />
          <span className={compact ? 'hidden lg:inline' : 'hidden sm:inline'}>
            {magnifierActive ? 'Lens' : 'Lens Off'}
          </span>
        </button>
      )}
    </div>
  );
}
