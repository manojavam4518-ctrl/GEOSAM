'use client';

import React, { useState } from 'react';
import { PenTool, CheckCircle2, Edit3, Trash2 } from 'lucide-react';
import DigitalSignatureModal from './DigitalSignatureModal';

export interface DigitalSignaturePadProps {
  value?: string; // Existing base64 PNG data URL if already signed
  onChange: (signatureDataUrl: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  titleClassName?: string;
  isHighlighted?: boolean;
  required?: boolean;
}

export default function DigitalSignaturePad({
  value = '',
  onChange,
  disabled = false,
  className = '',
  title = 'SIGNATURE OF THE CONSIGNOR',
  titleClassName,
  isHighlighted = false,
  required = true,
}: DigitalSignaturePadProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <>
      <div
        className={`w-full bg-white rounded-2xl border-2 transition-all duration-300 shadow-xs overflow-hidden ${
          isHighlighted
            ? 'border-amber-500 ring-4 ring-amber-500/40 animate-pulse shadow-amber-200/50'
            : 'border-slate-200'
        } ${className}`}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-emerald-400" />
            <h4 className={titleClassName || "text-xs font-black uppercase tracking-wider text-white flex items-center"}>
              {title}
              {required && (
                <span className="text-red-400 font-black ml-1 text-sm" title="Mandatory Signature Field">
                  *
                </span>
              )}
            </h4>
          </div>
          {value ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Signature Recorded
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
              <span className="text-red-400 font-black">*</span> Signature Required
            </span>
          )}
        </div>

        {/* Clickable Signature Area */}
        <div className="p-4 bg-slate-50/50">
          {value ? (
            <div
              onClick={() => !disabled && setIsModalOpen(true)}
              className="group relative flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-emerald-200 hover:border-emerald-500 transition-all cursor-pointer shadow-inner"
              title="Click to Replace or Re-draw Signature"
            >
              <div className="w-full max-w-sm h-32 flex items-center justify-center border-b-2 border-slate-800 pb-2 mb-2">
                <img
                  src={value}
                  alt="Recorded Digital Signature"
                  className="max-h-full max-w-full object-contain pointer-events-none"
                />
              </div>

              <div className="w-full flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Signature Recorded
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={disabled}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      !disabled && setIsModalOpen(true);
                    }}
                    disabled={disabled}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-emerald-600" />
                    Re-draw
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !disabled && setIsModalOpen(true)}
              className="group relative w-full h-36 bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-all flex flex-col items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer shadow-inner select-none p-4"
              title="Click to open digital signature whiteboard popup"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 group-hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-2 transition-transform group-hover:scale-110">
                <PenTool className="w-5 h-5" />
              </div>
              <p className="font-black text-xs uppercase tracking-wider text-slate-800 group-hover:text-emerald-700 transition-colors">
                Click to Open Signature Whiteboard
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Draw signature using mouse, touchscreen or stylus in large whiteboard
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Digital Signature Whiteboard Modal Popup */}
      <DigitalSignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(sigData) => {
          onChange(sigData);
          setIsModalOpen(false);
        }}
        initialSignature={value}
        title={title}
      />
    </>
  );
}
