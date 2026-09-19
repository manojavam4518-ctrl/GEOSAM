'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'workspace' | 'full';
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
  noPadding?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  headerExtra,
  footer,
  contentClassName,
  noPadding = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Sizing definitions
  let maxWidthStyle = '700px';
  let maxHeightStyle = 'calc(100vh - 48px)';
  let modalWidthClass = 'w-[calc(100vw-24px)] sm:w-[calc(100vw-64px)]';

  if (size === 'sm') maxWidthStyle = '450px';
  if (size === 'lg') maxWidthStyle = '750px';
  if (size === 'xl') maxWidthStyle = '900px';
  if (size === '2xl') maxWidthStyle = '1200px';
  if (size === 'workspace' || size === 'full') {
    maxWidthStyle = '1650px';
    modalWidthClass = 'w-[95vw] sm:w-[94vw] max-w-[1650px]';
    maxHeightStyle = '92vh';
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/55 backdrop-blur-[3px] transition-opacity" 
        onClick={onClose}
      />

      {/* Modal container */}
      <div 
        className={`bg-white border border-slate-200/80 rounded-2xl shadow-2xl relative z-[10000] flex flex-col transition-all transform animate-fade-in ${modalWidthClass}`}
        style={{
          maxWidth: maxWidthStyle,
          maxHeight: maxHeightStyle,
          height: (size === 'workspace' || size === 'full') ? '92vh' : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-[#0F4C3A]">
              {title}
            </h3>
            {headerExtra}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable / Flexible Content Container */}
        <div className={`flex-grow min-h-0 flex flex-col text-xs text-slate-600 ${noPadding ? '' : 'p-6 overflow-y-auto'} ${contentClassName || ''}`}>
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 rounded-b-2xl shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
