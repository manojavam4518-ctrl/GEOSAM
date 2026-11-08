'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

export interface UseDragToPanOptions<T extends HTMLElement = HTMLElement> {
  disabled?: boolean;
  externalRef?: React.RefObject<T | null>;
  onPanStart?: () => void;
  onPanEnd?: () => void;
  // Wheel Zoom configuration
  zoom?: number;
  onZoomChange?: (newZoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  enableWheelZoom?: boolean;
}

export function useDragToPan<T extends HTMLElement = HTMLDivElement>(
  options: UseDragToPanOptions<T> = {}
) {
  const {
    disabled = false,
    externalRef,
    onPanStart,
    onPanEnd,
    zoom,
    onZoomChange,
    minZoom = 0.3,
    maxZoom = 3.0,
    zoomStep,
    enableWheelZoom = true,
  } = options;

  const internalRef = useRef<T | null>(null);
  const containerRef = externalRef || internalRef;

  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Position and state tracking for panning
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const startScrollLeftRef = useRef<number>(0);
  const startScrollTopRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);

  // Synchronized zoom tracking references
  const currentZoomRef = useRef<number>(zoom || 1.0);
  useEffect(() => {
    if (zoom !== undefined) {
      currentZoomRef.current = zoom;
    }
  }, [zoom]);

  const onZoomChangeRef = useRef(onZoomChange);
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  // Pointer Down: Start Dragging
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<T>) => {
      if (disabled) return;
      // Only trigger on primary (left) mouse button or single touch/pen
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      // Never initiate drag when clicking interactive form controls, buttons, links, or marked elements
      if (
        target &&
        target.closest(
          'button, input, select, textarea, a, [role="button"], [data-no-pan="true"]'
        )
      ) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      // Prevent native browser image drag ghost and text selection
      e.preventDefault();

      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startScrollLeftRef.current = container.scrollLeft;
      startScrollTopRef.current = container.scrollTop;
      hasDraggedRef.current = false;
      activePointerIdRef.current = e.pointerId;

      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback in environments without full pointer-capture support
      }

      setIsDragging(true);
      onPanStart?.();
    },
    [disabled, containerRef, onPanStart]
  );

  // Pointer Move: 2D Dragging (Left, Right, Up, Down)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!isDragging) return;
      const container = containerRef.current;
      if (!container) return;

      const deltaX = e.clientX - startXRef.current;
      const deltaY = e.clientY - startYRef.current;

      // Mark as drag if moved more than 2px
      if (!hasDraggedRef.current && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        hasDraggedRef.current = true;
      }

      if (hasDraggedRef.current) {
        // Direct manipulation: dragging right moves content right (scrollLeft decreases)
        container.scrollLeft = startScrollLeftRef.current - deltaX;
        container.scrollTop = startScrollTopRef.current - deltaY;
      }
    },
    [isDragging, containerRef]
  );

  // Pointer Up/Cancel: End Dragging
  const handlePointerUpOrCancel = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!isDragging) return;
      const container = containerRef.current;
      if (container && activePointerIdRef.current !== null) {
        try {
          if (container.hasPointerCapture(activePointerIdRef.current)) {
            container.releasePointerCapture(activePointerIdRef.current);
          }
        } catch {
          // Safe fallback
        }
      }

      activePointerIdRef.current = null;
      setIsDragging(false);
      onPanEnd?.();
    },
    [isDragging, containerRef, onPanEnd]
  );

  const handleClickCapture = useCallback((e: React.MouseEvent<T>) => {
    // Suppress accidental click events triggered immediately after dragging
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  }, []);

  // Global userSelect and body cursor lock during active pan
  useEffect(() => {
    if (!isDragging || typeof document === 'undefined') return;
    const origUserSelect = document.body.style.userSelect;
    const origCursor = document.body.style.cursor;

    document.body.style.userSelect = 'none';
    document.body.style.cursor =
      'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'28\' height=\'28\' viewBox=\'0 0 24 24\' fill=\'%23000000\' stroke=\'%23ffffff\' stroke-width=\'1.25\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M9 9.5a1.5 1.5 0 0 1 3 0V11\'/%3E%3Cpath d=\'M12 9a1.5 1.5 0 0 1 3 0v2\'/%3E%3Cpath d=\'M15 9.5a1.5 1.5 0 0 1 3 0v2\'/%3E%3Cpath d=\'M6 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2c0 4.4-3.6 7.5-8 7.5h-1c-4.4 0-7-3.1-7-7.5v-2z\'/%3E%3Cpath d=\'M6 13.5l-2.2 1.8a1.5 1.5 0 0 0 1.9 2.3L8 16.5\'/%3E%3C/svg%3E") 10 10, grabbing';

    // Remove any accidental text selection ranges
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      // Ignored
    }

    return () => {
      document.body.style.userSelect = origUserSelect;
      document.body.style.cursor = origCursor;
    };
  }, [isDragging]);

  // Mouse-Wheel Zoom In / Out Handler Centered Around Cursor
  useEffect(() => {
    if (disabled || !enableWheelZoom || !onZoomChangeRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent browser page from scrolling while inside preview
      e.preventDefault();
      e.stopPropagation();

      const currentZoom = currentZoomRef.current;
      if (!currentZoom || currentZoom <= 0) return;

      const direction = e.deltaY < 0 ? 1 : -1;
      const absDelta = Math.abs(e.deltaY);
      const isDiscrete = absDelta >= 40;
      const baseStep = zoomStep !== undefined ? zoomStep : (isDiscrete ? 0.08 : Math.max(0.02, absDelta * 0.001));
      const step = baseStep * direction;

      const nextZoom = Math.min(
        maxZoom,
        Math.max(minZoom, Math.round((currentZoom + step) * 100) / 100)
      );

      if (Math.abs(nextZoom - currentZoom) < 0.001) {
        return; // At zoom boundary
      }

      // Cursor-centered zoom offset calculations
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const contentX = container.scrollLeft + cursorX;
      const contentY = container.scrollTop + cursorY;

      const ratio = nextZoom / currentZoom;
      const targetScrollLeft = Math.max(0, contentX * ratio - cursorX);
      const targetScrollTop = Math.max(0, contentY * ratio - cursorY);

      currentZoomRef.current = nextZoom;
      onZoomChangeRef.current?.(nextZoom);

      // Adjust scroll position to keep point under cursor
      container.scrollLeft = targetScrollLeft;
      container.scrollTop = targetScrollTop;

      requestAnimationFrame(() => {
        if (container) {
          container.scrollLeft = targetScrollLeft;
          container.scrollTop = targetScrollTop;
        }
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [disabled, enableWheelZoom, minZoom, maxZoom, zoomStep, containerRef]);

  // Unified Black Hand Grab and Grabbing Cursor classes
  const cursorClass = isDragging
    ? 'cursor-black-grabbing select-none'
    : 'cursor-black-grab';

  const panProps: React.HTMLAttributes<T> = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUpOrCancel,
    onPointerCancel: handlePointerUpOrCancel,
    onClickCapture: handleClickCapture,
    style: {
      touchAction: 'none' as const,
    },
  };

  if (!externalRef) {
    (panProps as any).ref = internalRef;
  }

  return {
    containerRef,
    isDragging,
    panProps,
    cursorClass,
  };
}
