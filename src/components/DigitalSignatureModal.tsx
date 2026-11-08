'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, CheckCircle2, AlertCircle, PenTool } from 'lucide-react';
import { cropCanvasToBoundingBox } from '@/utils/declarationPdfExport';

export interface DigitalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title?: string;
  initialSignature?: string;
}

export default function DigitalSignatureModal({
  isOpen,
  onClose,
  onSave,
  title = "CUSTOMER'S SIGNATURE",
  initialSignature = '',
}: DigitalSignatureModalProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize canvas with proper DPI scaling
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const effectiveDpr = Math.max(2, dpr); // Ensure at least 2x high resolution
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(220, Math.floor(rect.height));

    canvas.width = width * effectiveDpr;
    canvas.height = height * effectiveDpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(effectiveDpr, effectiveDpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = '#000000'; // Natural deep black signature stroke
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // If initialSignature provided, render it onto the canvas preserving aspect ratio
    if (initialSignature && initialSignature.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        const naturalW = img.naturalWidth || img.width || width;
        const naturalH = img.naturalHeight || img.height || height;
        const imgAspect = naturalW / naturalH;
        const canvasAspect = width / height;

        let drawW = width * 0.92;
        let drawH = height * 0.92;

        if (imgAspect > canvasAspect) {
          drawW = width * 0.92;
          drawH = drawW / imgAspect;
        } else {
          drawH = height * 0.92;
          drawW = drawH * imgAspect;
        }

        const drawX = (width - drawW) / 2;
        const drawY = (height - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    } else {
      ctx.clearRect(0, 0, width, height);
      setHasDrawn(false);
    }
    setErrorMessage(null);
  }, [initialSignature]);

  // When modal opens, initialize canvas after DOM layout
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      initCanvas();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen, initCanvas]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only primary button or touch/pen
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    isDrawingRef.current = true;
    setErrorMessage(null);

    const coords = getCoordinates(e);
    lastPointRef.current = coords;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    // Draw a small dot immediately on click/tap
    ctx.lineTo(coords.x + 0.1, coords.y + 0.1);
    ctx.stroke();

    if (!hasDrawn) {
      setHasDrawn(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent page scrolling on touch devices
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!lastPointRef.current) {
      lastPointRef.current = coords;
    }

    // Midpoint smoothing for continuous natural curves
    const midX = (lastPointRef.current.x + coords.x) / 2;
    const midY = (lastPointRef.current.y + coords.y) / 2;

    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.stroke();

    lastPointRef.current = coords;

    if (!hasDrawn) {
      setHasDrawn(true);
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }

    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Fallback
    }
  };

  // Button 1: CLEAR (Red button)
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    isDrawingRef.current = false;
    lastPointRef.current = null;
    setHasDrawn(false);
    setErrorMessage(null);
  };

  // Button 2: SAVE
  const handleSave = () => {
    if (!hasDrawn) {
      setErrorMessage('Please draw your signature before saving.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas actually has pixels (prevent saving blank canvas)
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let hasPixels = false;
      for (let i = 3; i < imgData.data.length; i += 4) {
        if (imgData.data[i] > 20) {
          hasPixels = true;
          break;
        }
      }
      if (!hasPixels) {
        setErrorMessage('The signature whiteboard is blank. Please draw your signature first.');
        return;
      }
    }

    // Auto-crop to handwritten boundaries and convert to high-res transparent PNG Data URL
    const signatureBase64 = cropCanvasToBoundingBox(canvas);
    onSave(signatureBase64);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
      aria-modal="true"
      role="dialog"
    >
      {/* Modal Dialog Card: Enlarged by ~20% in width and height */}
      <div className="relative w-full max-w-[820px] max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <PenTool className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400">
                Draw your signature using mouse, stylus, touchpad, or touchscreen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Warning Alert */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Whiteboard Body: Enlarged drawing canvas (+20% height & width) */}
        <div className="p-5 sm:p-7 bg-slate-50 flex flex-col items-center justify-center overflow-auto">
          <div className="w-full h-72 sm:h-[390px] md:h-[400px] bg-white rounded-xl border border-slate-300 shadow-xs relative overflow-hidden select-none touch-none">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
              onPointerLeave={handlePointerUpOrCancel}
              className="w-full h-full block cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>

        {/* Footer Toolbar: Two Action Buttons (CLEAR in Red, SAVE in Green/Brand) */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          {/* Button 1: CLEAR (Red button) */}
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all cursor-pointer shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            CLEAR
          </button>

          {/* Button 2: SAVE (Prominent button) */}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all cursor-pointer shadow-xs ring-2 ring-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            SAVE
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

