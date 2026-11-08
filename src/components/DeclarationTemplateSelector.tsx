'use client';

import React from 'react';
import { Layers } from 'lucide-react';

export type DeclarationTemplateId = 'goods' | 'personal';

export interface DeclarationTemplateSelectorProps {
  selectedTemplate: DeclarationTemplateId;
  onSelectTemplate: (templateId: DeclarationTemplateId) => void;
}

export default function DeclarationTemplateSelector({
  selectedTemplate,
  onSelectTemplate,
}: DeclarationTemplateSelectorProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-emerald-100 text-[#0F4C3A]">
          <Layers className="w-4 h-4" />
        </span>
        <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
          SELECT DECLARATION NOTE TEMPLATE
        </h2>
      </div>

      {/* Compact Content-Based Radio-Button Selection Options */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Template 1: GOODS DECLARATION NOTE */}
        <div
          onClick={() => onSelectTemplate('goods')}
          className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer select-none w-fit whitespace-nowrap ${
            selectedTemplate === 'goods'
              ? 'border-emerald-600 bg-emerald-50/40 text-slate-900 shadow-2xs ring-1 ring-emerald-500/30'
              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
          }`}
        >
          {/* Radio Button Indicator */}
          <div className="relative flex items-center justify-center shrink-0">
            <input
              type="radio"
              name="declaration-template"
              value="goods"
              checked={selectedTemplate === 'goods'}
              onChange={() => onSelectTemplate('goods')}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedTemplate === 'goods'
                  ? 'border-emerald-600 bg-white'
                  : 'border-slate-400 bg-white'
              }`}
            >
              {selectedTemplate === 'goods' && (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              )}
            </div>
          </div>

          {/* Title ONLY */}
          <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
            GOODS DECLARATION NOTE
          </span>
        </div>

        {/* Template 2: PERSONAL GOODS DECLARATION NOTE */}
        <div
          onClick={() => onSelectTemplate('personal')}
          className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer select-none w-fit whitespace-nowrap ${
            selectedTemplate === 'personal'
              ? 'border-emerald-600 bg-emerald-50/40 text-slate-900 shadow-2xs ring-1 ring-emerald-500/30'
              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
          }`}
        >
          {/* Radio Button Indicator */}
          <div className="relative flex items-center justify-center shrink-0">
            <input
              type="radio"
              name="declaration-template"
              value="personal"
              checked={selectedTemplate === 'personal'}
              onChange={() => onSelectTemplate('personal')}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedTemplate === 'personal'
                  ? 'border-emerald-600 bg-white'
                  : 'border-slate-400 bg-white'
              }`}
            >
              {selectedTemplate === 'personal' && (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              )}
            </div>
          </div>

          {/* Title ONLY */}
          <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
            PERSONAL GOODS DECLARATION NOTE
          </span>
        </div>
      </div>
    </div>
  );
}
